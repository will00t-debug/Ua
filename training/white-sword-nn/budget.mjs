// Turn measured game times into a fixed trial. The order is the priority:
// one v2 demonstration, a little self-play, a dev comparison, then more of
// each. Nothing here reads a win rate.
export function planBudget({wallMs,nnMs,v2Ms,v2Finished,workers}){
 const nn=Math.max(1,Number(nnMs)||1);
 const v2=Math.max(1,Number(v2Ms)||1);
 const pool=Math.max(1,workers|0);
 const mirror=0.55*v2+0.45*nn;
 const selfCost=v2Finished?0.75*nn+0.25*mirror:nn;
 const testCost=v2Finished?mirror:v2;
 let imitate=0,self=0,dev=0,test=0;
 const estimate=state=>
  Math.ceil(state.imitate/pool)*v2+
  state.self*selfCost+
  Math.ceil(state.dev/pool)*nn+
  Math.ceil(state.test/pool)*testCost;
 const add=(key,count,cap)=>{
  const next={imitate,self,dev,test,[key]:{imitate,self,dev,test}[key]+count};
  if(next[key]>cap)return false;
  if((key==='imitate'||key==='test')&&!v2Finished)return false;
  if(estimate(next)>wallMs)return false;
  imitate=next.imitate;
  self=next.self;
  dev=next.dev;
  test=next.test;
  return true;
 };
 const steps=[
  ['imitate',1,8],
  ['self',4,24],
  ['dev',4,16],
  ['imitate',1,8],
  ['self',4,24],
  ['dev',4,16],
  ['test',2,8],
  ['self',4,24],
  ['imitate',2,8],
  ['dev',8,16],
  ['self',8,24],
  ['test',2,8],
  ['test',4,8],
  ['imitate',4,8],
  ['self',4,24]
 ];
 for(const [key,count,cap] of steps)add(key,count,cap);
 return {
  imitate,self,dev,test,workers:pool,wallMs,
  estimatedMs:estimate({imitate,self,dev,test}),
  nnMs:nn,v2Ms:v2,v2Finished:!!v2Finished,selfCost,testCost
 };
}
