#!/usr/bin/env node
// White Sword v4-B.3. Constrained search on saved positions, then a small
// fresh-seed check of any update the box can express. Does not edit v2.
import {mkdirSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {join} from 'node:path';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {readJson,readJsonl,v2Hash,writeJson,writeText,appendJsonl} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {assertFreshSeed} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b3/lib/report.mjs';
import {loadStudy} from '../training/white-sword-ai/v4b3/lib/study.mjs';
import {VERIFY_PAIRS,VERIFY_SALT,checksFor,materialize,summarizeVerification} from '../training/white-sword-ai/v4b3/lib/verify.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT=process.env.WS_V4B3_ROOT||'training/white-sword-ai/v4b3';

function runPool(items,workerUrl,take){
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
    let row;
    try{row=take?take(message):message.row;}
    catch(error){return fail(error);}
    results[index]=row;
    finished++;
    if(finished%20===0||finished===items.length)console.log('完成',finished+'/'+items.length);
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
   const worker=new Worker(new URL(workerUrl,import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
function positions(){
 const pool=readJson('training/white-sword-ai/v4b2/pool.json',{positions:[]}).positions;
 const prior=readJson('training/white-sword-ai/v4b/selected.json',{positions:[]}).positions;
 const seen=new Set();
 const rows=[];
 for(const position of [...pool,...prior]){
  if(seen.has(position.id))continue;
  seen.add(position.id);
  rows.push(position);
 }
 return rows;
}
function publish(study,verification){
 const report=renderReport(study,verification);
 writeJson(join(ROOT,'study.json'),study);
 writeText(join(ROOT,'report.md'),report);
 writeText('docs/white-sword-ai/v4b3/report.md',report);
 if(verification)writeJson(join(ROOT,'verification.json'),verification);
 return report;
}
async function main(){
 const mode=process.argv[2]||'all';
 if(mode!=='all'&&mode!=='search'){
  console.error('用法：node scripts/white-sword-v4b3.mjs search|all');
  process.exitCode=1;
  return;
 }
 mkdirSync(ROOT,{recursive:true});
 const before=v2Hash();
 console.log('搜尋');
 const study=loadStudy();
 if(study.official!==before)throw Error('v2 雜湊在搜尋中改變');
 const checks=checksFor(study);
 console.log('待重抽',checks.length);
 if(mode==='search'){
  publish(study,null);
  console.log('只寫搜尋');
  return;
 }
 const built=materialize(checks,positions());
 for(const job of built.jobs)assertFreshSeed(job.seed,'v4b3');
 const file=join(ROOT,'rollouts.jsonl');
 let records=readJsonl(file);
 const have=new Set(records.map(row=>row.id));
 const pending=built.jobs.filter(job=>!have.has(job.id));
 console.log('分支',pending.length,'沿用',built.jobs.length-pending.length,'跳過',built.skipped.length);
 const started=Date.now();
 if(pending.length){
  await runPool(pending,'./white-sword-v4b-rollout-worker.mjs',message=>{
   appendJsonl(file,message.row);
   return message.row;
  });
  records=readJsonl(file);
 }
 const rows=summarizeVerification(built.ready,records);
 const attempted=rows.reduce((sum,row)=>sum+row.n+row.unfinished,0);
 const verification={
  salt:VERIFY_SALT,pairs:VERIFY_PAIRS,games:records.length,skipped:built.skipped,rows,
  finishedRate:attempted?rows.reduce((sum,row)=>sum+row.n,0)/attempted:0
 };
 writeJson(join(ROOT,'seed-ledger.json'),{
  salt:VERIFY_SALT,pairs:VERIFY_PAIRS,
  seeds:built.ready.map(row=>({checkId:row.checkId,positionSeed:row.seed,first:row.seed+VERIFY_SALT}))
 });
 if(v2Hash()!==before)throw Error('v2 雜湊在驗證後改變');
 publish(study,verification);
 console.log('重抽',rows.length,'場',records.length,'牆鐘秒',((Date.now()-started)/1000).toFixed(1));
 for(const row of rows)console.log(row.kind,row.positionId.slice(0,8),'mean',row.mean?.toFixed(3),'n',row.n,'adjusted',row.adjusted);
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
