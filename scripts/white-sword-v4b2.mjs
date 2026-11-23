#!/usr/bin/env node
// White Sword v4-B.2. Fresh balanced mining and at most one trusted step.
// Does not deploy and does not edit v2.
import {Worker} from 'node:worker_threads';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {rewriteSaved,runV4B2} from '../training/white-sword-ai/v4b2/lib/run.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT=process.env.WS_V4B2_ROOT||'training/white-sword-ai/v4b2';

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
    if(finished%5===0||finished===items.length)console.log('完成',finished+'/'+items.length);
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
async function main(){
 if(process.argv[2]==='report'){
  const report=rewriteSaved(ROOT);
  console.log('停止點',report.stopped);
  console.log('採用',report.adopted?.id||'沒有');
  return;
 }
 if(process.argv[2]!=='all'){
  console.error('用法：node scripts/white-sword-v4b2.mjs all');
  process.exitCode=1;
  return;
 }
 const started=Date.now();
 console.log('v4-B.2 workers',WORKERS);
 const report=await runV4B2({
  root:ROOT,
  mineMany:specs=>runPool(specs,'./white-sword-v4b2-mine-worker.mjs',message=>message.row),
  rolloutMany:(jobs,{onGame}={})=>runPool(jobs,'./white-sword-v4b-rollout-worker.mjs',message=>{
   onGame?.(message.row);
   return message.row;
  }),
  log:console.log
 });
 console.log('停止點',report.stopped);
 console.log('收錄',report.mined?.stored??0,'有效偏好',report.rollouts?.usable??0);
 console.log('採用',report.adopted?.id||'沒有');
 console.log('牆鐘秒',((Date.now()-started)/1000).toFixed(1));
 if(report.stopped==='rollouts'||report.stopped==='replay'||report.stopped==='positions')process.exitCode=2;
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
