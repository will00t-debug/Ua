#!/usr/bin/env node
// Run White Sword v4-A.1 evolution. Does not deploy and does not edit v2.
import {Worker} from 'node:worker_threads';
import {loadPublishedState,publishState} from '../training/white-sword-ai/v4a/lib/persist.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {nextRoundNumber,runRound,runSequence,safetyFault} from '../training/white-sword-ai/v4a/lib/round.mjs';
import {DEFAULT_DOCS,DEFAULT_ROOT} from '../training/white-sword-ai/v4a/lib/store.mjs';

const STATE_BRANCH=process.env.WS_STATE_BRANCH||'cursor/white-sword-v4a-state-c159';
const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||3),MAX_WORKERS));

let checkpointGames=0;
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
    try{
     onGame?.(message.game);
     checkpointGames++;
     if(checkpointGames%24===0)saveState();
    }
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
 console.log('完整配對',report.paired?.n,'不完整',report.paired?.incomplete||0);
 console.log('候選',report.candidateCount,'通過初選',report.screenKept,'挑戰者',report.challengerId);
 console.log('分歧率',report.probe?.rate,'帶內',report.probe?.bandRate,'局面',report.probe?.positions);
 console.log('相對勝率差',report.paired?.delta,'區間',report.paired?.ci?.low,report.paired?.ci?.high);
 console.log('晉級',report.promoted);
 console.log('下一輪',report.nextDirection);
}
function loadState(){
 if(process.env.WS_STATE_LOAD==='0')return;
 const loaded=loadPublishedState({
  repo:process.cwd(),root:DEFAULT_ROOT,branch:STATE_BRANCH
 });
 console.log(loaded.loaded?'已讀取上一輪實驗狀態 '+loaded.files+' 個檔案':'沒有可接續的實驗狀態，從目前檔案開始');
}
function saveState(){
 if(process.env.WS_STATE_PUBLISH==='0')return;
 const published=publishState({
  repo:process.cwd(),root:DEFAULT_ROOT,branch:STATE_BRANCH
 });
 console.log(published.pushed?'已保存實驗狀態':'實驗狀態沒有新的變更');
}
async function main(){
 const command=process.argv[2];
 const count=Number(process.argv[3]||1);
 if(command!=='smoke'&&command!=='round'&&command!=='rounds'){
  console.error('用法：node scripts/white-sword-v4a.mjs smoke|round|rounds <1|3|5>');
  process.exitCode=1;
  return;
 }
 const started=Date.now();
 try{
  loadState();
  if(command==='smoke'){
   const report=await runRound({
    profile:'smoke',round:0,playMany,root:DEFAULT_ROOT,docsRoot:DEFAULT_DOCS,log:console.log
   });
   printReport(report);
   if(report.status==='stopped')process.exitCode=2;
  }else if(command==='round'||count===1){
   const round=nextRoundNumber(DEFAULT_ROOT);
   console.log(round.resume?'恢復第 '+round.round+' 輪':'開始第 '+round.round+' 輪','workers',WORKERS);
   const report=await runRound({
    profile:'round',round:round.round,playMany,root:DEFAULT_ROOT,docsRoot:DEFAULT_DOCS,log:console.log
   });
   printReport(report);
   if(report.status==='stopped'||safetyFault(report))process.exitCode=2;
  }else{
   console.log('連續',count,'輪','workers',WORKERS);
   const sequence=await runSequence({
    count,playMany,root:DEFAULT_ROOT,docsRoot:DEFAULT_DOCS,log:console.log,startedAt:started
   });
   for(const report of sequence.reports)printReport(report);
   const last=sequence.reports.at(-1);
   if(!last||last.status==='stopped'||safetyFault(last))process.exitCode=2;
  }
  console.log('牆鐘秒',((Date.now()-started)/1000).toFixed(1));
  saveState();
 }catch(error){
  console.error(error?.stack||error);
  process.exitCode=error?.code==='V4A_STOPPED'||error?.code==='V4A_HALT'||error?.code==='V4A_STATE'?2:1;
 }
}
await main();
