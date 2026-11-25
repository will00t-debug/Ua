#!/usr/bin/env node
// Fit one shared residual on historical pairs, freeze it, then test new games.
import {Worker} from 'node:worker_threads';
import {mulberry32} from '../training/white-sword-ai/v4a/lib/evolve.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {interleaveSpecs} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {BUCKETS} from '../training/white-sword-ai/v4b2/lib/protocol.mjs';
import {conditionalMeanInterval,signTest} from '../training/white-sword-ai/v4b4/lib/exact.mjs';
import {diffsOf,nextJobs,preparePositions,seedsFor} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {assertFreshPlan} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {seedInterval} from '../training/white-sword-ai/v5b1/lib/protocol.mjs';
import {summarizeFair} from '../training/white-sword-ai/v5b1/lib/fair.mjs';
import {assertSchedule,fairSpecs,kindTotals} from '../training/white-sword-ai/v5d/lib/schedule.mjs';
import {buildHistorical,loadPositions} from '../training/white-sword-ai/v6a/lib/dataset.mjs';
import {fitRidge,lossOf,pairPredict,permutationTest,safetyOf,selectModel,zeroLoss} from '../training/white-sword-ai/v6a/lib/model.mjs';
import {differenceFeatures} from '../training/white-sword-ai/v6a/lib/model.mjs';
import {
 BRANCH_BUDGET,CODE_VERSION,CONFIRM_SALT,DEPTHS,DEV_GAIN,FROZEN_WEIGHT,MATCH_SEEDS,MINE_SEEDS,
 OPPONENTS,PAIRS,PERMUTATIONS,TARGET_POSITIONS,earlierSeeds
} from '../training/white-sword-ai/v6a/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v6a/lib/report.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v6a';
const CONTROL='training/white-sword-ai/v5b/candidate.json';

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
function designed(rows,interactions){
 return rows.map(row=>({...row,x:differenceFeatures(row.featuresA,row.featuresB,interactions)}));
}
function prefix(row,count){
 const diffs=row.diffs.slice(0,count);
 if(diffs.length<count)return null;
 const plus=diffs.filter(value=>value>0).length;
 const minus=diffs.filter(value=>value<0).length;
 return {...row,y:(plus-minus)/diffs.length,weight:diffs.length};
}
function median(values){
 const sorted=[...values].sort((left,right)=>left-right);
 return sorted.length?sorted[Math.floor((sorted.length-1)/2)]:0;
}
function gamesNeeded(correlation,current){
 if(!(correlation>0.02))return null;
 return Math.ceil(4*(1-correlation*correlation)/(correlation*correlation)+2);
}
function selectPositions(positions){
 const cells=new Map();
 const seenGames=new Set();
 for(const row of positions||[]){
  if(!row?.id||row.band?.length<2||row.actionA?.features?.length!==115)continue;
  const game=(row.opponent||'')+'|'+(row.seed??'');
  const key=(row.bucket||'')+'|'+(row.opponent||'');
  const list=cells.get(key)||[];
  if(list.some(item=>(item.opponent+'|'+item.seed)===game))continue;
  list.push(row);
  cells.set(key,list);
  seenGames.add(game);
 }
 for(const list of cells.values())list.sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0);
 const picked=[];
 const used=new Set();
 let pass=0;
 while(picked.length<TARGET_POSITIONS){
  let added=false;
  for(const bucket of BUCKETS){
   for(const opponent of OPPONENTS){
    const row=(cells.get(bucket+'|'+opponent)||[]).find(item=>!used.has(item.opponent+'|'+item.seed));
    if(!row)continue;
    picked.push(row);
    used.add(row.opponent+'|'+row.seed);
    added=true;
    if(picked.length>=TARGET_POSITIONS)break;
   }
   if(picked.length>=TARGET_POSITIONS)break;
  }
  if(!added||++pass>TARGET_POSITIONS)break;
 }
 return picked;
}
async function drain(ready,file){
 let records=readJsonl(file);
 for(;;){
  const jobs=nextJobs(ready,CONFIRM_SALT,PAIRS,new Set(records.map(row=>row.id)),64);
  if(!jobs.length)return records;
  console.log('開抽 '+jobs.length+' 場，已有 '+records.length);
  const rows=await runPool('./white-sword-v4b-rollout-worker.mjs',jobs);
  for(const row of rows)appendJsonl(file,row);
  records=records.concat(rows);
 }
}
function publish(study,control){
 const report=renderReport(study);
 writeJson(ROOT+'/study.json',study);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v6a/report.md',report);
 if(v2Hash()!==study.official)throw Error('這一輪改到了 v2');
 if(JSON.stringify(readJson(CONTROL))!==JSON.stringify(control))throw Error('這一輪改到了凍結的 070');
}

async function main(){
 const official=v2Hash();
 const control=readJson(CONTROL);
 if(control.weight!==FROZEN_WEIGHT||control.adopted!==false)throw Error('070 對照不是凍結狀態');
 const parent=loadModel(V2_FILE).policy;
 const historical=buildHistorical();
 const train=historical.filter(row=>row.split==='train');
 const dev=historical.filter(row=>row.split==='dev');
 let frozen=readJson(ROOT+'/model.json',null);
 if(!frozen){
  const selected=selectModel(train,dev);
  const zero=zeroLoss(designed(dev,selected.model.interactions));
  const devPass=selected.dev.mse<zero.mse*(1-DEV_GAIN)&&selected.dev.correlation>0;
  frozen={
   codeVersion:CODE_VERSION,adopted:false,promoted:false,class:selected.id,lambda:selected.lambda,
   beta:selected.model.beta,scale:selected.model.scale,interactions:selected.model.interactions,
   clip:selected.model.clip,dev:selected.dev,zero,devPass,alternatives:selected.alternatives
  };
  writeJson(ROOT+'/model.json',frozen);
  console.log('凍結',frozen.class,'懲罰',frozen.lambda,'開發通過',frozen.devPass);
 }
 const model={beta:frozen.beta,scale:frozen.scale,interactions:frozen.interactions,clip:frozen.clip};
 const depthRows=[];
 const deepTrain=train.filter(row=>row.diffs.length>=32);
 const deepDev=dev.filter(row=>row.diffs.length>=32);
 for(const pairs of DEPTHS){
  const fitRows=designed(deepTrain.map(row=>prefix(row,pairs)).filter(Boolean),model.interactions);
  const held=designed(deepDev,model.interactions);
  if(fitRows.length<8||held.length<4)continue;
  depthRows.push({pairs,positions:held.length,...lossOf(held,fitRidge(fitRows,frozen.lambda))});
 }
 const deep=train.filter(row=>row.diffs.length>=32);
 const broad=[];
 let usedPairs=0;
 for(const row of [...train].sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0)){
  if(row.diffs.length<8||usedPairs>=deep.length*32)break;
  broad.push(prefix(row,8));
  usedPairs+=8;
 }
 const breadth=deep.length&&broad.length?{
  deep:lossOf(designed(dev,model.interactions),fitRidge(designed(deep.map(row=>prefix(row,32)).filter(Boolean),model.interactions),frozen.lambda)).correlation,
  broad:lossOf(designed(dev,model.interactions),fitRidge(designed(broad,model.interactions),frozen.lambda)).correlation
 }:null;
 const counts=historical.map(row=>row.n).sort((left,right)=>left-right);
 const summary={
  positions:historical.length,
  games:new Set(historical.map(row=>row.game)).size,
  pairs:historical.reduce((sum,row)=>sum+row.n,0),
  trainGames:new Set(train.map(row=>row.game)).size,
  devGames:new Set(dev.map(row=>row.game)).size,
  medianPairs:median(counts),
  deep:historical.filter(row=>row.n>=32).length
 };
 if(!readJson(ROOT+'/sample-plan.json',null)){
  const jobs=interleaveSpecs(MINE_SEEDS).map(job=>({...job,maxSteps:200}));
  console.log('挖掘',jobs.length,'場');
  const games=await runPool('./white-sword-v4b2-mine-worker.mjs',jobs);
  const positions=games.flatMap(game=>game.positions||[]);
  writeJson(ROOT+'/mine.json',{seeds:jobs.map(job=>job.seed),games:games.length,decisions:games.reduce((sum,game)=>sum+(game.decisions||0),0),positions});
  const picked=selectPositions(positions);
  writeJson(ROOT+'/sample-plan.json',{codeVersion:CODE_VERSION,ids:picked.map(row=>row.id),stopped:picked.length>=12?'ready':'short'});
 }
 const mine=readJson(ROOT+'/mine.json');
 const plan=readJson(ROOT+'/sample-plan.json');
 const byId=new Map((mine.positions||[]).map(row=>[row.id,row]));
 const picked=plan.ids.map(id=>byId.get(id)).filter(Boolean);
 if(picked.length!==plan.ids.length)throw Error('名單裡的局面不在挖掘結果');
 const base={
  codeVersion:CODE_VERSION,official,frozenWeight:FROZEN_WEIGHT,adopted:false,promoted:false,
  historical:summary,fit:{class:frozen.class,lambda:frozen.lambda,dev:frozen.dev,zero:frozen.zero,devPass:frozen.devPass,alternatives:frozen.alternatives},
  depths:depthRows,breadth,mined:{games:mine.games,selected:picked.length},games:0,candidate:false,matches:null
 };
 if(plan.stopped!=='ready'){
  publish({...base,reason:'新的原始對局不足，沒有做 1152 場'},control);
  console.log(JSON.stringify({selected:picked.length,candidate:false}));
  return;
 }
 const {ready,dropped}=preparePositions(picked);
 if(dropped.length)throw Error('有新局面不能重現：'+dropped.join(','));
 const blocked=new Set([...earlierSeeds(),...Object.values(MINE_SEEDS).flat(),...MATCH_SEEDS]);
 for(const seed of seedsFor(picked,CONFIRM_SALT,PAIRS))if(blocked.has(seed))throw Error('分支種子 '+seed+' 撞上已用範圍');
 assertFreshPlan(seedsFor(picked,CONFIRM_SALT,PAIRS),'v6a-branch');
 const records=await drain(ready,ROOT+'/rollouts.jsonl');
 if(records.length!==picked.length*PAIRS*2)throw Error('分支紀錄和 1152 不一致');
 const positions=picked.map(position=>{
  const means={};
  for(const depth of DEPTHS){
   const subset=records.filter(row=>row.positionId===position.id&&row.attempt<depth);
   const packed=diffsOf(subset,position.id,position.actor);
   const exact=signTest(packed.diffs);
   const interval=conditionalMeanInterval(packed.diffs);
   means[depth]={mean:exact.mean,low:interval.low,high:interval.high,n:exact.n};
  }
  return {position,means};
 });
 const signOf=value=>value>0?1:value<0?-1:0;
 let agree8=0;
 let agree16=0;
 let compared8=0;
 let compared16=0;
 let width8=0;
 let width32=0;
 for(const row of positions){
  width32+=row.means[32].high-row.means[32].low;
  width8+=row.means[8].high-row.means[8].low;
  if(signOf(row.means[32].mean)&&signOf(row.means[8].mean)){
   compared8++;
   if(signOf(row.means[32].mean)===signOf(row.means[8].mean))agree8++;
  }
  if(signOf(row.means[32].mean)&&signOf(row.means[16].mean)){
   compared16++;
   if(signOf(row.means[32].mean)===signOf(row.means[16].mean))agree16++;
  }
 }
 const testRows=positions.map(row=>({
  id:row.position.id,game:(row.position.opponent||'')+'|'+row.position.seed,weight:row.means[32].n,y:row.means[32].mean,
  featuresA:row.position.actionA.features,featuresB:row.position.actionB.features,fold:0,split:'test'
 }));
 const tested=designed(testRows,model.interactions);
 const independent=permutationTest(tested,model,mulberry32(CONFIRM_SALT),PERMUTATIONS);
 const zero=zeroLoss(tested);
 const independentPass=frozen.devPass&&independent.correlation>0&&independent.p<0.05&&independent.mse<zero.mse;
 const safety=safetyOf(model,parent,loadPositions());
 const candidate=!!(frozen.devPass&&independentPass&&safety.ok);
 let matches=null;
 let done=[];
 if(candidate){
  writeJson(ROOT+'/candidate.json',{...frozen,candidate:true,adopted:false,promoted:false});
  const specs=fairSpecs({seeds:MATCH_SEEDS});
  assertSchedule(specs);
  done=readJsonl(ROOT+'/matches.jsonl');
  const have=new Set(done.map(row=>[row.seed,row.opponent,row.specialistSeat,row.first,row.arm].join(':')));
  const pending=specs.filter(spec=>!have.has([spec.seed,spec.opponent,spec.specialistSeat,spec.first,spec.arm].join(':')));
  for(let index=0;index<pending.length;index+=16){
   const played=await runPool('./white-sword-v6a-worker.mjs',pending.slice(index,index+16));
   for(const row of played)appendJsonl(ROOT+'/matches.jsonl',row);
   done=done.concat(played);
  }
  if(done.length!==specs.length)throw Error('診斷場數不是 192');
  matches=summarizeFair(done);
 }
 const study={
  ...base,games:records.length,candidate,independentPass,independent:{...independent,zero:zero.mse,games:tested.length},
  gap:{gamesNeeded:gamesNeeded(independent.correlation,tested.length)},
  stability:{agree8,agree16,compared8,compared16,width8:width8/positions.length,width32:width32/positions.length},
  positions:positions.map(row=>({
   id:row.position.id,opponent:row.position.opponent,bucket:row.position.bucket,seed:row.position.seed,
   mean8:row.means[8].mean,mean16:row.means[16].mean,mean32:row.means[32].mean
  })),
  safety:safety.results,matches,kinds:matches?kindTotals(done):{},
  interval:seedInterval(positions.map(row=>[row.means[32].mean]))
 };
 if(study.games!==BRANCH_BUDGET)throw Error('分支場數不是 1152');
 publish(study,control);
 console.log(JSON.stringify({class:frozen.class,devPass:frozen.devPass,independentPass,candidate,games:study.games}));
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
