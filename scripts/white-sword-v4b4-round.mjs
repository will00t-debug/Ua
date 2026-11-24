#!/usr/bin/env node
// Two-stage confirmation on the balanced 42 positions. Does not edit v2.
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {SCREEN_PAIRS} from '../training/white-sword-ai/v4b4/lib/sampling.mjs';
import {renderRound} from '../training/white-sword-ai/v4b4/lib/round-report.mjs';
import {
 CONFIRM_SALT,SCREEN_SALT,assertPlanSeeds,decideConfirmation,diffsOf,freezeCandidates,
 learnable,nextJobs,preparePositions,sameFreeze
} from '../training/white-sword-ai/v4b4/lib/round.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v4b4';
const SELECTED='training/white-sword-ai/v4b2/selected.json';
const EARLIER='training/white-sword-ai/v4b/selected.json';

function idsOf(records){
 return new Set(records.map(row=>row.id));
}
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
   const worker=new Worker(new URL('./white-sword-v4b-rollout-worker.mjs',import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
async function drain(ready,salt,pairs,file){
 let records=readJsonl(file);
 for(;;){
  const jobs=nextJobs(ready,salt,pairs,idsOf(records),64);
  if(!jobs.length)return records;
  console.log('開抽',jobs.length,'場，已有',records.length);
  const rows=await runPool(jobs);
  for(const row of rows)appendJsonl(file,row);
  records=records.concat(rows);
 }
}
function screenDiffs(positions,records){
 return positions.map(position=>diffsOf(records,position.id,position.actor));
}
function publish(frozen,positions,screenRecords,confirmRecords,official){
 const actors=new Map(positions.map(position=>[position.id,position.actor]));
 const rows=decideConfirmation(frozen.candidates,confirmRecords,id=>actors.get(id));
 const screen=screenDiffs(positions,screenRecords);
 const confirmed=rows.filter(row=>row.confirmed);
 const skipped=frozen.rows.filter(row=>row.qualified&&!frozen.candidates.some(candidate=>candidate.id===row.id));
 const study={
  official,adopted:false,promoted:false,weightsWritten:false,
  frozen,rows,confirmed,skipped,
  qualified:frozen.rows.filter(row=>row.qualified).length,
  unlearnable:skipped.filter(row=>!row.learnable).length,
  capped:skipped.filter(row=>row.learnable).length,
  screenGames:screenRecords.length,
  confirmGames:confirmRecords.length,
  games:screenRecords.length+confirmRecords.length,
  screenFinished:screen.reduce((sum,row)=>sum+row.diffs.length,0),
  screenUnfinished:screen.reduce((sum,row)=>sum+row.unfinished,0),
  confirmFinished:rows.reduce((sum,row)=>sum+row.n,0),
  confirmUnfinished:rows.reduce((sum,row)=>sum+row.unfinished,0)
 };
 writeJson(ROOT+'/round.json',study);
 const text=renderRound(study);
 writeText(ROOT+'/round.md',text);
 writeText('docs/white-sword-ai/v4b4/round.md',text);
 return study;
}
async function main(){
 console.log('v4-B.4 確認，workers',WORKERS);
 const official=v2Hash();
 const positions=readJson(SELECTED).positions;
 const earlier=readJson(EARLIER,{positions:[]}).positions;
 assertPlanSeeds(positions,earlier);
 console.log('重現',positions.length,'個局面');
 const {ready,dropped}=preparePositions(positions);
 if(dropped.length)throw Error('有局面不能重現，這一輪不改樣本數：'+dropped.join(','));
 if(ready.length!==positions.length)throw Error('重現後的局面數和篩選清單不一致');
 console.log('可重現',ready.length);
 const parent=loadModel('training/white-sword-ai/weights/v2-capped.json').policy;
 const screenFile=ROOT+'/screen-rollouts.jsonl';
 const confirmFile=ROOT+'/confirm-rollouts.jsonl';
 const screenRecords=await drain(ready,SCREEN_SALT,SCREEN_PAIRS,screenFile);
 const diffs=screenDiffs(positions,screenRecords);
 if(diffs.some(row=>row.attempts!==SCREEN_PAIRS))throw Error('篩選組數還沒到固定的 8');
 const flags=positions.map(position=>learnable(parent,position));
 const frozen=freezeCandidates(positions,diffs.map(row=>row.diffs),flags);
 const existing=readJson(ROOT+'/screen.json');
 if(existing&&!sameFreeze(existing,frozen))throw Error('篩選檔和這次計算不一致，不改候選');
 if(!existing)writeJson(ROOT+'/screen.json',frozen);
 const locked=existing||frozen;
 const chosen=new Set(locked.candidates.map(row=>row.id));
 const confirmReady=ready.filter(row=>chosen.has(row.position.id));
 if(confirmReady.length!==locked.candidates.length)throw Error('確認清單裡有不能重現的局面');
 const confirmRecords=locked.each
  ?await drain(confirmReady,CONFIRM_SALT,locked.each,confirmFile)
  :[];
 const study=publish(locked,positions,screenRecords,confirmRecords,official);
 console.log('確認留下',study.confirmed.length,'場數',study.games,'權重寫入',study.weightsWritten);
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
