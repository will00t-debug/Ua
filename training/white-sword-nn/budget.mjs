// Turn measured game times into one fixed round-2 trial.
// The maxima are not the round-1 8/24/16/8 caps. Nothing here reads a win rate.
import {
 CHECKPOINTS,DIAG_GAMES,EARLY_GAMES,PLAN_SAFETY,REPLAY_FRACTION,ROUND3_CONFIRM_CAP,
 ROUND3_DEV_CAP,ROUND3_SELF_CAP,SCALE_EVAL_SEEDS,TRAIN_RESERVE_MS
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
