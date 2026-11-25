#!/usr/bin/env node
// Save one experimental step from the confirmed energy-line preference.
// Mining seeds and branch-check seeds stay separate. v2 is not written.
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {assertFreshPlan} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {seedsFor} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {
 CHECK_PAIRS,CHECK_SALT,MINE_SEEDS,assertMineSeeds,mineSeedList
} from '../training/white-sword-ai/v4b5/lib/protocol.mjs';
import {
 describeFresh,harmed,nextCheckJobs,prepareCheck,selectChecks,summarizeChecks
} from '../training/white-sword-ai/v4b5/lib/checks.mjs';
import {renderReport} from '../training/white-sword-ai/v4b5/lib/report.mjs';
import {loadUpdate,savedPositions} from '../training/white-sword-ai/v4b5/lib/update.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v4b5';
const MINE_FILE=ROOT+'/mine.json';
const CHECK_FILE=ROOT+'/checks.json';
const ROLLOUT_FILE=ROOT+'/check-rollouts.jsonl';

function runPool(file,items){
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
   const worker=new Worker(new URL(file,import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
function slim(position){
 const copy={...position};
 delete copy.actionA;
 delete copy.actionB;
 return copy;
}
async function mine(){
 assertMineSeeds();
 const saved=readJson(MINE_FILE,null);
 const seeds=mineSeedList();
 if(saved&&JSON.stringify(saved.seeds)===JSON.stringify(seeds))return saved;
 const jobs=[];
 let index=0;
 for(const [opponent,list] of Object.entries(MINE_SEEDS)){
  for(const seed of list)jobs.push({opponent,seed,maxSteps:200,index:index++});
 }
 console.log('挖掘',jobs.length,'場');
 const games=await runPool('./white-sword-v4b2-mine-worker.mjs',jobs);
 const positions=games.flatMap(game=>(game.positions||[]).map(slim));
 const result={seeds,games:games.length,decisions:games.reduce((sum,game)=>sum+game.decisions,0),positions};
 writeJson(MINE_FILE,result);
 return result;
}
async function drain(ready){
 let records=readJsonl(ROLLOUT_FILE);
 for(;;){
  const jobs=nextCheckJobs(ready,new Set(records.map(row=>row.id)),64);
  if(!jobs.length)return records;
  console.log('驗證開抽',jobs.length,'場，已有',records.length);
  const rows=await runPool('./white-sword-v4b-rollout-worker.mjs',jobs);
  for(const row of rows)appendJsonl(ROLLOUT_FILE,row);
  records=records.concat(rows);
 }
}
function publicUpdate(update){
 const copy={...update};
 delete copy.policy;
 delete copy.delta;
 delete copy.rows;
 return copy;
}
async function main(){
 const official=v2Hash();
 const parent=loadModel(V2_FILE).policy;
 const update=loadUpdate();
 if(!update.ok)throw Error('方盒沒有找到合法更新：'+update.status);
 if(v2Hash()!==official)throw Error('搜尋改到了 v2');
 const mined=await mine();
 const rows=describeFresh(parent,update.policy,mined.positions);
 const checks=selectChecks(update,rows);
 const signature=checks.map(check=>check.id+':'+check.keyA+':'+check.keyB).join('|');
 const existing=readJson(CHECK_FILE,null);
 if(existing&&existing.signature!==signature)throw Error('驗證名單和已保存的不一致');
 const pool=new Map();
 for(const position of [...savedPositions(),...mined.positions])pool.set(position.id,position);
 const ready=[];
 for(const check of checks){
  const prepared=prepareCheck(check,pool.get(check.id));
  if(!prepared)throw Error('驗證動作不在合法清單：'+check.id);
  ready.push(prepared);
 }
 if(!existing)writeJson(CHECK_FILE,{signature,checks,mineSeeds:mineSeedList()});
 const checkSeeds=seedsFor(ready.map(row=>row.position),CHECK_SALT,CHECK_PAIRS);
 assertFreshPlan(checkSeeds,'v4b5-check');
 const mineSeeds=new Set(mineSeedList());
 if(checkSeeds.some(seed=>mineSeeds.has(seed)))throw Error('驗證種子和挖掘種子重疊');
 const records=await drain(ready);
 const summary=summarizeChecks(checks,records);
 const promise=harmed(summary)?'harmed':'open';
 const groups=new Map();
 for(const row of rows.filter(row=>row.changed)){
  const label=row.beforeLabel+' → '+row.afterLabel+'（'+row.bucket+' / '+row.opponent+'）';
  groups.set(label,(groups.get(label)||0)+1);
 }
 const study={
  official,adopted:false,promoted:false,weightsWritten:false,
  update:publicUpdate(update),
  mine:{
   seeds:mined.seeds,positions:rows.length,
   linePairs:rows.filter(row=>row.line).length,
   changed:rows.filter(row=>row.changed).length,
   flippedLine:rows.filter(row=>row.changed&&row.line?.currentLine==='front'&&row.afterKey===row.line.energyKey).length,
   keptFront:rows.filter(row=>!row.changed&&row.line?.currentLine==='front').length,
   groups:[...groups.entries()].map(([label,count])=>({label,count}))
  },
  checks:summary,
  promise,
  candidateText:promise==='harmed'
   ?'實驗候選已保存。這批 16 組裡，有一個被改掉的原選擇在校正後較好。這個檔案不進入 v2。'
   :'實驗候選已保存。目標局面改成能量線。這批 16 組沒有證明連帶改動是錯的，也還沒有證明新局面支持同一邊。這個檔案不進入 v2。'
 };
 if(v2Hash()!==official)throw Error('驗證改到了 v2');
 writeJson(ROOT+'/candidate.json',{
  codeVersion:update.codeVersion,official,adopted:false,promoted:false,recommended:false,
  promise,target:update.target,weights:update.weights,policy:update.policy,delta:update.delta
 });
 writeJson(ROOT+'/update.json',study);
 const text=renderReport(study);
 writeText(ROOT+'/report.md',text);
 writeText('docs/white-sword-ai/v4b5/report.md',text);
 console.log(promise,summary.length,'個驗證',rows.length,'個新局面');
}

main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
