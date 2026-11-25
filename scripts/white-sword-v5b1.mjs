#!/usr/bin/env node
// Re-score the frozen residual with a fair match schedule. The weight is not refit.
import {readFileSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {readJson,readJsonl,appendJsonl,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {assertSchedule,auditJobs,fairSpecs,summarizeAudit,summarizeFair} from '../training/white-sword-ai/v5b1/lib/fair.mjs';
import {
 AUDIT_GAMES,AUDIT_SEEDS,CODE_VERSION,FAIR_RULE,FAIR_SEEDS,FEATURE,FROZEN_WEIGHT,OFFICIAL_V2,
 assertDiagnosticSeeds,assertFrozenCandidate,installColumn,reservedSeeds
} from '../training/white-sword-ai/v5b1/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5b1/lib/report.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v5b1';
const CANDIDATE='training/white-sword-ai/v5b/candidate.json';

function runPool(items){
 return new Promise((resolve,reject)=>{
  if(!items.length){resolve([]);return;}
  const results=new Array(items.length);
  let cursor=0;
  let finished=0;
  const pool=[];
  let failed=false;
  const fail=error=>{
   if(failed)return;
   failed=true;
   for(const worker of pool)worker.terminate();
   reject(error instanceof Error?error:Error(String(error)));
  };
  const assign=(worker,index)=>{
   const onMessage=message=>{
    worker.off('message',onMessage);
    if(!message?.ok)return fail(message?.error||'worker failed');
    results[index]=message.row;
    finished++;
    if(cursor<items.length)assign(worker,cursor++);
    else if(finished===items.length){
     for(const item of pool)item.terminate();
     resolve(results);
    }
   };
   worker.on('message',onMessage);
   worker.postMessage(items[index]);
  };
  for(let index=0;index<Math.min(WORKERS,items.length);index++){
   const worker=new Worker(new URL('./white-sword-v5b1-worker.mjs',import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
function publish(study){
 const identity={...study.identity};
 delete identity.rows;
 const published={...study,identity};
 const report=renderReport(published);
 writeJson(ROOT+'/study.json',published);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v5b1/report.md',report);
 const candidate=readJson(CANDIDATE);
 assertFrozenCandidate(candidate);
 if(v2Hash()!==study.official)throw Error('這一輪改到了 v2');
}
async function main(){
 const official=v2Hash();
 if(official!==OFFICIAL_V2)throw Error('正式 v2 雜湊和登記不一致');
 const candidate=readJson(CANDIDATE);
 const weight=assertFrozenCandidate(candidate);
 const installed=installColumn();
 if(!installed.ok||installed.text!==FEATURE)throw Error(installed.reason||'欄位不一致');
 const reserved=reservedSeeds();
 for(const file of ['training/white-sword-ai/v5b/matches.jsonl','training/white-sword-ai/v5b/mine.json']){
  const text=readFileSync(file,'utf8');
  for(const seed of text.matchAll(/"seed":\s*(\d+)/g))reserved.add(Number(seed[1]));
 }
 assertDiagnosticSeeds(FAIR_SEEDS,[...reserved,...Object.values(AUDIT_SEEDS)]);
 assertDiagnosticSeeds(Object.values(AUDIT_SEEDS),reserved);
 const specs=fairSpecs({weight,feature:installed.feature});
 assertSchedule(specs);
 let identity=readJson(ROOT+'/identity.json',null);
 if(!identity){
  console.log('比較權重 0 的實際對局',AUDIT_GAMES,'場');
  const rows=await runPool(auditJobs());
  identity=summarizeAudit(rows);
  writeJson(ROOT+'/identity.json',{...identity,rows});
 }
 if(!identity.ok)throw Error('權重 0 的實際對局和 v2 不一致');
 let done=readJsonl(ROOT+'/matches.jsonl');
 const have=new Set(done.map(row=>[row.seed,row.opponent,row.specialistSeat,row.first,row.arm].join(':')));
 const pending=specs.filter(spec=>!have.has([spec.seed,spec.opponent,spec.specialistSeat,spec.first,spec.arm].join(':')));
 console.log('公平診斷還有',pending.length,'場');
 for(let index=0;index<pending.length;index+=16){
  const batch=pending.slice(index,index+16);
  const played=await runPool(batch);
  for(const row of played)appendJsonl(ROOT+'/matches.jsonl',row);
  done=done.concat(played);
  console.log('已完成',done.length,'場');
 }
 if(done.length!==specs.length)throw Error('診斷場數不是 192');
 const matches=summarizeFair(done);
 if(matches.v2Changes!==0)throw Error('v2 場次出現殘差改選');
 const study={
  codeVersion:CODE_VERSION,official,weight,feature:FEATURE,rule:FAIR_RULE,
  identity,matches,adopted:false,promoted:false,refit:false
 };
 publish(study);
 console.log(JSON.stringify({
  games:matches.finished,illegal:matches.illegal,
  mirror:matches.decks['white-sword'].delta,
  reject:matches.decks['reject-blue'].delta,
  renruki:matches.decks.renruki.delta
 }));
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
