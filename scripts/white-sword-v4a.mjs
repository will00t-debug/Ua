#!/usr/bin/env node
// Run one White Sword v4-A evolution round. Does not deploy and does not edit v2.
import {availableParallelism} from 'node:os';
import {Worker} from 'node:worker_threads';
import {nextRoundNumber,runRound} from '../training/white-sword-ai/v4a/lib/round.mjs';
import {DEFAULT_DOCS,DEFAULT_ROOT} from '../training/white-sword-ai/v4a/lib/store.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||availableParallelism()-1||1),3));

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
  if(!specs.length){
   resolve([]);
   return;
  }
  for(let i=0;i<Math.min(WORKERS,specs.length);i++){
   const worker=new Worker(new URL('./white-sword-v4a-worker.mjs',import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
function printReport(report){
 console.log('狀態',report.status);
 console.log('對戰',report.games);
 console.log('候選',report.candidateCount,'通過初選',report.screenKept,'挑戰者',report.challengerId);
 console.log('分歧率',report.probe?.rate);
 console.log('相對勝率差',report.paired?.delta,'區間',report.paired?.ci?.low,report.paired?.ci?.high);
 console.log('晉級',report.promoted);
 console.log('下一輪',report.nextDirection);
}
async function main(){
 const command=process.argv[2];
 if(command!=='smoke'&&command!=='round'){
  console.error('用法：node scripts/white-sword-v4a.mjs smoke|round');
  process.exitCode=1;
  return;
 }
 const started=Date.now();
 try{
  const round=command==='round'?nextRoundNumber(DEFAULT_ROOT):{round:0,resume:false};
  if(command==='round')console.log(round.resume?'恢復第 '+round.round+' 輪':'開始第 '+round.round+' 輪','workers',WORKERS);
  const report=await runRound({
   profile:command,round:round.round,playMany,root:DEFAULT_ROOT,docsRoot:DEFAULT_DOCS,log:console.log
  });
  printReport(report);
  console.log('牆鐘秒',((Date.now()-started)/1000).toFixed(1));
  if(report.status==='stopped')process.exitCode=2;
 }catch(error){
  console.error(error?.stack||error);
  process.exitCode=error?.code==='V4A_STOPPED'?2:1;
 }
}
await main();
