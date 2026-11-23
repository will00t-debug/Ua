#!/usr/bin/env node
// White Sword v4-B round 1. Does not deploy and does not edit v2.
import {Worker} from 'node:worker_threads';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {runV4B} from '../training/white-sword-ai/v4b/lib/run.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||3),MAX_WORKERS));
const ROOT=process.env.WS_V4B_ROOT||'training/white-sword-ai/v4b';

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
    try{row=take(message);}
    catch(error){return fail(error);}
    results[index]=row;
    finished++;
    if(finished%10===0||finished===items.length)console.log('完成',finished+'/'+items.length);
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
function playMany(specs,{onGame}={}){
 return runPool(specs,'./white-sword-v4a-worker.mjs',message=>{
  onGame?.(message.game);
  return message.game;
 });
}
function rolloutMany(jobs,{onGame}={}){
 return runPool(jobs,'./white-sword-v4b-rollout-worker.mjs',message=>{
  onGame?.(message.row);
  return message.row;
 });
}
async function main(){
 if(process.argv[2]!=='all'){
  console.error('用法：node scripts/white-sword-v4b.mjs all');
  process.exitCode=1;
  return;
 }
 const started=Date.now();
 console.log('v4-B workers',WORKERS);
 const report=await runV4B({root:ROOT,playMany,rolloutMany,log:console.log});
 console.log('停止點',report.stopped);
 console.log('有效偏好',report.rollouts?.usable??0,'rollout',report.rollouts?.games??0);
 console.log('出牌改變',report.learning?.selectedChoices?.changed??0);
 console.log('初步證據',report.preliminaryStrength===true,'晉級',report.promoted===true);
 console.log('牆鐘秒',((Date.now()-started)/1000).toFixed(1));
 if(report.stopped==='pilot'||report.stopped==='rollouts'||report.stopped==='replay')process.exitCode=2;
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
