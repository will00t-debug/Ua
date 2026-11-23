#!/usr/bin/env node
// White Sword v4-A.2 exploration. Does not deploy and does not edit v2.
import {Worker} from 'node:worker_threads';
import {runAll,runStageA} from '../training/white-sword-ai/v4a2/lib/stage.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||3),4));
const ROOT=process.env.WS_V4A2_ROOT||'training/white-sword-ai/v4a2';
const DOCS=process.env.WS_V4A2_DOCS||'docs/white-sword-ai/v4a2';

function playMany(specs,{onGame}={}){
 return new Promise((resolve,reject)=>{
  const results=new Array(specs.length);
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
    results[index]=message.game;
    try{onGame?.(message.game);}
    catch(error){return fail(error);}
    finished++;
    if(finished%12===0||finished===specs.length)console.log('對局',finished+'/'+specs.length);
    if(cursor<specs.length)assign(worker,cursor++);
    else if(finished===specs.length){
     for(const item of pool)item.terminate();
     resolve(results);
    }
   };
   worker.on('message',onMessage);
   worker.postMessage(specs[index]);
  };
  if(!specs.length)return resolve([]);
  for(let index=0;index<Math.min(WORKERS,specs.length);index++){
   const worker=new Worker(new URL('./white-sword-v4a-worker.mjs',import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
const command=process.argv[2]||'all';
if(command==='stage-a'){
 const result=runStageA({root:ROOT,log:console.log});
 console.log('Stage A',result.decision.passed);
 console.log(result.decision.reasons.join('\n'));
}else if(command==='all'){
 const report=await runAll({root:ROOT,docsRoot:DOCS,playMany,log:console.log});
 console.log('探索',report.exploration);
 console.log('棋力',report.strength);
 console.log('實驗冠軍',report.experimentalChampion);
}else{
 console.error('用法：stage-a 或 all');
 process.exit(1);
}
