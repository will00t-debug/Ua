// Turn measured game times into one fixed round-2 trial.
// The maxima are not the round-1 8/24/16/8 caps. Nothing here reads a win rate.
import {
 CHECKPOINTS,DIAG_GAMES,EARLY_GAMES,PLAN_SAFETY,PPO_BATCH_GAMES,PPO_MAX_BATCHES,
 REPLAY_FRACTION,ROUND3_CONFIRM_CAP,ROUND3_DEV_CAP,ROUND3_SELF_CAP,ROUND4_CONFIRM_CAP,
 ROUND4_DEV_CAP,ROUND6_DEV_COUNT,ROUND6_LINES,ROUND7_CONFIRM_COUNT,ROUND8_SEED_CAP,
 SCALE_EVAL_SEEDS,TRAIN_RESERVE_MS
} from './constants.mjs';

const CELLS=4;
const CAPS={imitate:32,self:80,devSeeds:16,testSeeds:12};

export function planBudget({
 wallMs,nnMs,v2Ms,v2Finished,workers,
 checkpoints=CHECKPOINTS,trainReserve=TRAIN_RESERVE_MS,safety=PLAN_SAFETY
}={}){
 const nn=Math.max(1,Number(nnMs)||1);
 const v2=Math.max(1,Number(v2Ms)||1);
 const pool=Math.max(1,workers|0);
 const mirror=0.55*v2+0.45*nn;
 const selfRaw=v2Finished?0.75*nn+0.25*mirror:nn;
 const selfCost=selfRaw*safety;
 const imitateWave=v2*safety;
 const evalWave=nn*safety;
 let imitate=0,self=0,devSeeds=0,testSeeds=0;
 const estimate=state=>{
  const devGames=state.devSeeds*CELLS;
  const testGames=state.testSeeds*CELLS;
  return Math.ceil(state.imitate/pool)*imitateWave+
   state.self*selfCost+
   checkpoints*Math.ceil(devGames/pool)*evalWave+
   Math.ceil(testGames/pool)*evalWave+
   trainReserve;
 };
 const add=(key,count)=>{
  const current={imitate,self,devSeeds,testSeeds};
  const next={...current,[key]:current[key]+count};
  if(next[key]>CAPS[key])return false;
  if(key==='imitate'&&!v2Finished)return false;
  if(estimate(next)>wallMs)return false;
  imitate=next.imitate;
  self=next.self;
  devSeeds=next.devSeeds;
  testSeeds=next.testSeeds;
  return true;
 };
 const steps=[
  ['imitate',8],
  ['self',16],
  ['devSeeds',8],
  ['testSeeds',8],
  ['imitate',8],
  ['self',16],
  ['devSeeds',4],
  ['self',16],
  ['imitate',8],
  ['devSeeds',4],
  ['self',32],
  ['imitate',8],
  ['testSeeds',4]
 ];
 for(const [key,count] of steps)add(key,count);
 return {
  imitate,self,devSeeds,testSeeds,checkpoints,workers:pool,wallMs,
  devGames:devSeeds*CELLS,testGames:testSeeds*CELLS,
  estimatedMs:estimate({imitate,self,devSeeds,testSeeds}),
  nnMs:nn,v2Ms:v2,v2Finished:!!v2Finished,
  selfCost,safety,trainReserve,
  raw:{nn,v2,self:selfRaw}
 };
}

const ROUND3_CELLS=4;
const ROUND3_ARMS=2;
const ROUND3_CONFIRM_ARMS=2;
const ROUND3_IMITATE_CAP=32;

export function round3Checks(self){
 const points=new Set([0]);
 const count=self|0;
 for(const early of EARLY_GAMES)if(early>0&&early<=count)points.add(early);
 if(count>0){
  for(let step=1;step<=4;step++){
   const at=Math.ceil(step*count/4);
   if(at>=1)points.add(at);
  }
 }
 return [...points].sort((left,right)=>left-right);
}

// Fill one shared schedule from measured times. Nothing here reads a win rate.
export function planRound3({
 wallMs,nnMs,v2Ms,v2Finished,workers,safety=PLAN_SAFETY,trainReserve=TRAIN_RESERVE_MS
}={}){
 const nn=Math.max(1,Number(nnMs)||1);
 const v2=Math.max(1,Number(v2Ms)||1);
 const pool=Math.max(1,workers|0);
 const mirror=0.55*v2+0.45*nn;
 const selfRaw=v2Finished?0.75*nn+0.25*mirror:nn;
 const selfCost=selfRaw*safety;
 const imitateWave=v2*safety;
 const evalWave=nn*safety;
 const caps={
  imitate:ROUND3_IMITATE_CAP,self:ROUND3_SELF_CAP,devSeeds:ROUND3_DEV_CAP,
  confirmSeeds:ROUND3_CONFIRM_CAP,diagGames:DIAG_GAMES,scaleSeeds:SCALE_EVAL_SEEDS
 };
 let imitate=0,self=0,devSeeds=0,confirmSeeds=0,diagGames=0,scaleSeeds=0;
 const snapshot=()=>({imitate,self,devSeeds,confirmSeeds,diagGames,scaleSeeds});
 const estimate=state=>{
  const devGames=state.devSeeds*ROUND3_CELLS;
  const online=round3Checks(state.self).filter(at=>at>0).length;
  return Math.ceil(state.imitate/pool)*imitateWave+
   state.diagGames*selfCost+
   ROUND3_ARMS*state.self*selfCost+
   Math.ceil(devGames/pool)*evalWave+
   ROUND3_ARMS*online*Math.ceil(devGames/pool)*evalWave+
   Math.ceil(state.scaleSeeds*ROUND3_CELLS/pool)*evalWave+
   Math.ceil(state.confirmSeeds*ROUND3_CELLS*ROUND3_CONFIRM_ARMS/pool)*evalWave+
   trainReserve;
 };
 const assign=next=>{
  for(const key of Object.keys(caps))if(next[key]>caps[key])return false;
  if(next.imitate>0&&!v2Finished)return false;
  if(estimate(next)>wallMs)return false;
  imitate=next.imitate;
  self=next.self;
  devSeeds=next.devSeeds;
  confirmSeeds=next.confirmSeeds;
  diagGames=next.diagGames;
  scaleSeeds=next.scaleSeeds;
  return true;
 };
 const steps=[
  ['diagGames',DIAG_GAMES],
  ['imitate',8],
  ['self',8],
  ['devSeeds',4],
  ['scaleSeeds',SCALE_EVAL_SEEDS],
  ['imitate',8],
  ['self',8],
  ['devSeeds',4],
  ['imitate',8],
  ['self',8],
  ['devSeeds',4],
  ['imitate',8],
  ['self',8],
  ['confirmSeeds',ROUND3_CONFIRM_CAP]
 ];
 for(const [key,count] of steps)assign({...snapshot(),[key]:snapshot()[key]+count});
 const state=snapshot();
 return {
  ...state,arms:ROUND3_ARMS,confirmArms:ROUND3_CONFIRM_ARMS,
  checks:round3Checks(self),workers:pool,wallMs,safety,trainReserve,
  devGames:devSeeds*ROUND3_CELLS,estimatedMs:estimate(state),
  nnMs:nn,v2Ms:v2,v2Finished:!!v2Finished,selfCost,replayFraction:REPLAY_FRACTION,
  fits:self>0&&devSeeds>0&&imitate>0&&estimate(state)<=wallMs
 };
}

// A lagged snapshot exists only after two completed batches. The planner and
// the trial both use this rule. Nothing here reads a win rate.
export function round4Opponent(batchIndex,{v2Finished=false,snapshots=[]}={}){
 const cycle=['self','snapshot','v2'];
 let kind=cycle[batchIndex%3];
 const lagged=Array.isArray(snapshots)&&snapshots.length>=2;
 if(kind==='v2'&&!v2Finished)kind='self';
 if(kind==='snapshot'&&!lagged)kind='self';
 return kind;
}

// Fill batches from measured rollout, eval, and update times. The old 32-game
// cap is not reused. Confirmation time is reserved and is not spent as extra training.
export function planRound4({
 wallMs,rolloutMs,evalMs,v2Ms,updateMs,v2Finished,workers,
 safety=PLAN_SAFETY,trainReserve=TRAIN_RESERVE_MS,
 devCap=ROUND4_DEV_CAP,confirmCap=ROUND4_CONFIRM_CAP
}={}){
 const rollout=Math.max(1,Number(rolloutMs)||1);
 const evalCost=Math.max(1,Number(evalMs)||1);
 const v2=Math.max(1,Number(v2Ms)||1);
 const update=Math.max(0,Number(updateMs)||0);
 const pool=Math.max(1,workers|0);
 const batch=PPO_BATCH_GAMES;
 const devSeeds=devCap;
 const confirmSeeds=confirmCap;
 const cells=4;
 const evalGames=devSeeds*cells;
 const confirmGames=confirmSeeds*cells;
 const wave=games=>Math.ceil(games/pool);
 const kindOf=batchIndex=>round4Opponent(batchIndex,{
  v2Finished,snapshots:Array.from({length:batchIndex})
 });
 const estimate=batches=>{
  let roll=0;
  for(let index=0;index<batches;index++){
   const ms=kindOf(index)==='v2'?v2:rollout;
   roll+=wave(batch)*ms*safety;
  }
  const checks=batches+1;
  return roll+
   checks*wave(evalGames)*evalCost*safety+
   batches*update*safety+
   wave(confirmGames)*evalCost*safety+
   trainReserve;
 };
 let batches=0;
 while(batches<PPO_MAX_BATCHES&&estimate(batches+1)<=wallMs)batches++;
 const checks=[0];
 for(let index=1;index<=batches;index++)checks.push(index*batch);
 const kinds=[];
 for(let index=0;index<batches;index++)kinds.push(kindOf(index));
 return {
  batches,batchGames:batch,games:batches*batch,devSeeds,confirmSeeds,
  devGames:evalGames,confirmGames,checks,kinds,workers:pool,wallMs,safety,trainReserve,
  estimatedMs:estimate(batches),
  rolloutMs:rollout,evalMs:evalCost,v2Ms:v2,updateMs:update,v2Finished:!!v2Finished,
  fits:batches>0&&devSeeds>0&&estimate(batches)<=wallMs
 };
}

// One batch count for every round-6 line. The eval is the shared endpoint
// block, counted once per line. Confirmation is not reserved: this round does
// not play it. Nothing here reads a win rate.
export function planRound6({
 wallMs,rolloutMs,evalMs,v2Ms,updateMs,v2Finished,workers,
 safety=PLAN_SAFETY,lines=ROUND6_LINES,devCount=ROUND6_DEV_COUNT,
 maxBatches=PPO_MAX_BATCHES
}={}){
 const rollout=Math.max(1,Number(rolloutMs)||1);
 const evalCost=Math.max(1,Number(evalMs)||1);
 const v2=Math.max(1,Number(v2Ms)||1);
 const update=Math.max(0,Number(updateMs)||0);
 const pool=Math.max(1,workers|0);
 const lineCount=Math.max(1,lines|0);
 const batch=PPO_BATCH_GAMES;
 const devSeeds=devCount;
 const cells=4;
 const evalGames=devSeeds*cells;
 const wave=games=>Math.ceil(games/pool);
 const kindOf=batchIndex=>round4Opponent(batchIndex,{
  v2Finished,snapshots:Array.from({length:batchIndex})
 });
 const estimate=batches=>{
  let roll=0;
  for(let index=0;index<batches;index++){
   const ms=kindOf(index)==='v2'?v2:rollout;
   roll+=wave(batch)*ms*safety;
  }
  return lineCount*(roll+batches*update*safety+wave(evalGames)*evalCost*safety);
 };
 let batches=0;
 const cap=Math.max(0,maxBatches|0);
 while(batches<cap&&estimate(batches+1)<=wallMs)batches++;
 const checks=[0];
 for(let index=1;index<=batches;index++)checks.push(index*batch);
 const kinds=[];
 for(let index=0;index<batches;index++)kinds.push(kindOf(index));
 const gamesPerLine=batches*batch;
 return {
  lines:lineCount,batches,batchGames:batch,gamesPerLine,
  trainGames:gamesPerLine*lineCount,devSeeds,evalGamesPerLine:evalGames,
  evalGames:evalGames*lineCount,checks,kinds,workers:pool,wallMs,safety,
  estimatedMs:estimate(batches),
  rolloutMs:rollout,evalMs:evalCost,v2Ms:v2,updateMs:update,v2Finished:!!v2Finished,
  fits:batches>0&&devSeeds>0&&estimate(batches)<=wallMs,endpointOnly:true
 };
}

// One confirmation sample. The seed cap is the registered draft. A shorter
// prefix is chosen from the wall clock only. Nothing here reads a win rate.
export function planRound7({
 wallMs,evalMs,workers,safety=PLAN_SAFETY,seedCap=ROUND7_CONFIRM_COUNT
}={}){
 const evalCost=Math.max(1,Number(evalMs)||1);
 const pool=Math.max(1,workers|0);
 const cap=Math.max(0,seedCap|0);
 const cells=4;
 const wave=games=>Math.ceil(games/pool);
 const estimate=seeds=>wave(seeds*cells)*evalCost*safety;
 let seeds=0;
 while(seeds<cap&&estimate(seeds+1)<=wallMs)seeds++;
 return {
  seeds,games:seeds*cells,cells,workers:pool,wallMs,safety,seedCap:cap,
  estimatedMs:estimate(seeds),evalMs:evalCost,
  fits:seeds>0&&estimate(seeds)<=wallMs
 };
}

// One measured game time, then one seed count. Nothing here reads a win rate.
export function planRound8({
 wallMs,gameMs,workers,safety=PLAN_SAFETY,seedCap=ROUND8_SEED_CAP,gamesPerSeed=28
}={}){
 const gameCost=Math.max(1,Number(gameMs)||1);
 const pool=Math.max(1,workers|0);
 const cap=Math.max(0,seedCap|0);
 const perSeed=Math.max(1,gamesPerSeed|0);
 const wave=games=>Math.ceil(games/pool);
 const estimate=seeds=>wave(seeds*perSeed)*gameCost*safety;
 let seeds=0;
 while(seeds<cap&&estimate(seeds+1)<=wallMs)seeds++;
 return {
  seeds,games:seeds*perSeed,gamesPerSeed:perSeed,workers:pool,wallMs,safety,seedCap:cap,
  estimatedMs:estimate(seeds),gameMs:gameCost,
  fits:seeds>0&&estimate(seeds)<=wallMs
 };
}
