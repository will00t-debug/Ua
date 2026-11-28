// Turn measured game times into one fixed round-2 trial.
// The maxima are not the round-1 8/24/16/8 caps. Nothing here reads a win rate.
import {CHECKPOINTS,PLAN_SAFETY,TRAIN_RESERVE_MS} from './constants.mjs';

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
