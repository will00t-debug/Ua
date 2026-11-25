#!/usr/bin/env node
// Independent white-sword network trial. Does not train v2 and does not deploy.
import {mkdirSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {
 BENCH_V2_MS,EXPLORE,GAMMA,IMITATE_EPOCHS,IMITATE_LR,INIT_SEED,LABEL_SMOOTH,
 MEMORY_WORKER_RSS,MONTE_LR,WALL_MS,WORKER_CAP
} from '../training/white-sword-nn/constants.mjs';
import {planBudget} from '../training/white-sword-nn/budget.mjs';
import {ACTION_DIM,INPUT_DIM,STATE_DIM} from '../training/white-sword-nn/encode.mjs';
import {imitationPass,monteCarloPass,shuffle} from '../training/white-sword-nn/learn.mjs';
import {
 adamStep,backward,cloneNet,createNet,createOptimizer,forwardTrain,netDistance,
 packNet,parameterCount,saveNet,scoreActions,unpackNet,zeroGrad
} from '../training/white-sword-nn/net.mjs';
import {compactGame,playMatch} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {
 BENCH_NN_SEED,BENCH_V2_SEED,DEV_SEEDS,EVAL_CELLS,IMITATE_SEEDS,SELF_SEEDS,TEST_SEEDS
} from '../training/white-sword-nn/protocol.mjs';
import {judgeLearning,judgePrototype,renderReport} from '../training/white-sword-nn/report.mjs';
import {addAnomalies,judgeChampion,rateBy,timingOf} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const WEIGHT_DIR='training/white-sword-nn/weights';
const REPORT_JSON='docs/white-sword-ai/nn-prototype.json';
const REPORT_MD='docs/white-sword-ai/NN-PROTOTYPE.md';

function seat(kind,explore=0){
 return {deckId:'white-sword',kind,explore};
}
function mulberry32(seed){
 let state=seed>>>0;
 return ()=>{
  state=state+0x6D2B79F5|0;
  let t=Math.imul(state^state>>>15,1|state);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
function rated(game,learnerSeat){
 return {
  status:game.status,winner:game.winner,anomalies:game.anomalies,
  specialistSeat:learnerSeat,specialistIsFirst:learnerSeat===game.first,
  opponentDeck:'white-sword'
 };
}
function section(games,learnerOf){
 const rows=games.map(game=>rated(game,learnerOf(game)));
 return {
  overall:rateBy(rows,()=>true),
  first:rateBy(rows,game=>game.specialistIsFirst),
  second:rateBy(rows,game=>!game.specialistIsFirst),
  anomalies:addAnomalies(rows)
 };
}
function job(spec,nets){
 return {spec,seatNets:(nets||[null,null]).map(net=>net?packNet(net):null)};
}
function playJob(item){
 const nets=(item.seatNets||[]).map(packed=>packed?unpackNet(packed):null);
 return playMatch({...item.spec,nets,progress:true});
}
async function playMany(items,workers){
 if(items.length<=1||workers<=1)return items.map(playJob);
 try{
  return await runPool(items,workers);
 }catch(error){
  console.log('parallel games failed, continuing in this process:',error.message);
  return items.map(playJob);
 }
}
function fitCount(planned,oneMs,parallel,remain){
 let count=0;
 for(let n=1;n<=planned;n++){
  if(Math.ceil(n/parallel)*oneMs*1.15+2000<remain())count=n;
 }
 return count;
}
function throughput(init){
 const net=createNet(init+1,{version:'nn-bench'});
 const state=Array(STATE_DIM).fill(0);
 state[0]=1;
 const actions=Array.from({length:16},(_,index)=>{
  const action=Array(ACTION_DIM).fill(0);
  action[0]=1;
  action[1+(index%12)]=1;
  return action;
 });
 const scoreStarted=performance.now();
 const batches=200;
 for(let i=0;i<batches;i++)scoreActions(net,state,actions);
 const scoreMs=performance.now()-scoreStarted;
 const scored=batches*actions.length;
 const x=new Float64Array(INPUT_DIM);
 x[0]=1;
 const opt=createOptimizer(MONTE_LR);
 const trainStarted=performance.now();
 const updates=200;
 for(let i=0;i<updates;i++){
  const cache=forwardTrain(net,x);
  const grad=zeroGrad(net);
  backward(net,cache,cache.q-0.2,grad);
  adamStep(net,opt,grad);
 }
 const trainMs=performance.now()-trainStarted;
 return {
  forward:{calls:scored,ms:scoreMs,perSecond:Math.round(scored/(scoreMs/1000))},
  train:{calls:updates,ms:trainMs,perSecond:Math.round(updates/(trainMs/1000))}
 };
}
function imitateSpec(index){
 return {
  seed:IMITATE_SEEDS[index],first:index%2,mode:'imitate',
  teacherSeats:[0,1],progress:false,
  seats:[seat('v2'),seat('v2')]
 };
}
function selfSpec(index,opponentKind){
 const learnerSeat=index%2;
 const first=(Math.floor(index/2))%2;
 const seats=[seat('nn',EXPLORE),seat('nn',EXPLORE)];
 if(opponentKind==='v2'){
  seats[1-learnerSeat]=seat('v2');
  seats[learnerSeat]=seat('nn',EXPLORE);
 }
 if(opponentKind==='snapshot'){
  seats[learnerSeat]=seat('nn',EXPLORE);
  seats[1-learnerSeat]=seat('nn',0);
 }
 return {
  seed:SELF_SEEDS[index],first,mode:'train',learnerSeat:opponentKind==='self'?null:learnerSeat,
  recordSeats:opponentKind==='self'?[0,1]:[learnerSeat],
  teacherSeats:[],exploreSeed:(SELF_SEEDS[index]*17+index)>>>0,progress:false,
  seats,opponentKind
 };
}
function evalSpec(cell,mode){
 return {
  seed:cell.seed,first:cell.first,mode,learnerSeat:cell.learnerSeat,
  recordSeats:[],teacherSeats:[],progress:false,
  seats:[null,null]
 };
}
function fillEval(spec,learner,opponent,opponentKind){
 const seats=[null,null];
 seats[spec.learnerSeat]={deckId:'white-sword',kind:'nn',explore:0};
 seats[1-spec.learnerSeat]={deckId:'white-sword',kind:opponentKind,explore:0};
 const nets=[null,null];
 nets[spec.learnerSeat]=learner;
 nets[1-spec.learnerSeat]=opponentKind==='nn'?opponent:null;
 return {spec:{...spec,seats},nets};
}
function cells(seeds,limit){
 const rows=[];
 for(const seed of seeds)for(const cell of EVAL_CELLS){
  if(rows.length>=limit)return rows;
  rows.push({seed,...cell});
 }
 return rows;
}
async function main(){
 const command=process.argv[2]||'trial';
 if(command!=='bench'&&command!=='trial')throw Error('Use bench or trial');
 const started=performance.now();
 console.log('measuring network throughput');
 const speed=throughput(INIT_SEED);
 const init=createNet(INIT_SEED,{version:'nn-random'});
 console.log('measuring one network game');
 const nnGame=playMatch({
  seed:BENCH_NN_SEED,first:0,mode:'eval',budgetMs:BENCH_V2_MS,progress:true,
  seats:[seat('nn'),seat('nn')],nets:[init,init],recordSeats:[],teacherSeats:[]
 });
 console.log('network game',nnGame.status,nnGame.steps,Math.round(nnGame.ms));
 console.log('measuring one official v2 mirror');
 const v2Game=playMatch({
  seed:BENCH_V2_SEED,first:0,mode:'eval',budgetMs:BENCH_V2_MS,progress:true,
  teacherSeats:[0,1],seats:[seat('v2'),seat('v2')],nets:[null,null]
 });
 console.log('v2 game',v2Game.status,v2Game.steps,Math.round(v2Game.ms));
 const rss=memoryUsage().rss;
 const workers=rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
 const v2Finished=v2Game.status==='finished'&&!v2Game.anomalies.unfinished;
 const bench={
  nnGame:compactGame(nnGame),v2Game:compactGame(v2Game),v2Finished,
  forward:speed.forward,train:speed.train,rssMb:Math.round(rss/1024/1024),workers
 };
 if(command==='bench'){
  console.log(JSON.stringify(bench,null,2));
  return;
 }
 const nnMs=Math.max(1,nnGame.ms);
 const v2Ms=v2Finished?Math.max(1,v2Game.ms):Math.max(BENCH_V2_MS,v2Game.ms);
 const plan=planBudget({wallMs:WALL_MS,nnMs,v2Ms,v2Finished,workers});
 console.log('plan',plan);
 const trialStart=performance.now();
 const remain=()=>WALL_MS-(performance.now()-trialStart);
 const rng=mulberry32(INIT_SEED);
 let working=cloneNet(init);
 working.version='nn-working';
 const protectedDev=Math.min(plan.dev,4);
 const protectedSelf=Math.min(plan.self,4);
 const protectedMs=Math.ceil(protectedDev/workers)*nnMs*1.2+protectedSelf*nnMs;
 const imitateCount=v2Finished?fitCount(plan.imitate,v2Ms,workers,()=>remain()-protectedMs):0;
 console.log('imitation games',imitateCount);
 const imitateGames=await playMany(
  Array.from({length:imitateCount},(_,index)=>job(imitateSpec(index),[null,null])),
  workers
 );
 const imitationSamples=imitateGames.flatMap(game=>game.imitate);
 const imitationCurve=[];
 if(imitationSamples.length){
  const opt=createOptimizer(IMITATE_LR);
  for(let epoch=0;epoch<IMITATE_EPOCHS;epoch++){
   const result=imitationPass(working,opt,shuffle(imitationSamples,rng));
   imitationCurve.push({epoch,...result});
   console.log('imitation',epoch,result);
  }
 }
 const frozen=cloneNet(working);
 frozen.version='nn-a-frozen';
 const live=cloneNet(frozen);
 live.version='nn-b-trial';
 mkdirSync(WEIGHT_DIR,{recursive:true});
 saveNet(frozen,WEIGHT_DIR+'/a-frozen.json');
 const snapshots=[];
 const recent=[];
 const selfGames=[];
 const monteCurve=[];
 const monteOpt=createOptimizer(MONTE_LR);
 let monteSamples=0;
 const devReserve=Math.ceil(Math.max(plan.dev,0)/workers)*nnMs*1.25+5000;
 for(let index=0;index<plan.self;index++){
  const wantV2=v2Finished&&index%4===2;
  const opponentKind=!wantV2&&index%4===1&&snapshots.length?'snapshot':(wantV2?'v2':'self');
  const cost=opponentKind==='v2'?plan.testCost:nnMs;
  if(remain()<devReserve+cost){
   console.log('self-play stopped to keep the dev reserve',index);
   break;
  }
  const spec=selfSpec(index,opponentKind);
  const nets=[live,live];
  if(opponentKind==='snapshot'){
   const snap=snapshots[snapshots.length-1];
   nets[spec.learnerSeat===0?1:0]=snap;
  }
  if(opponentKind==='v2')nets[1-spec.learnerSeat]=null;
  console.log('self',index,opponentKind,'seed',spec.seed);
  const game=playMatch({...spec,nets,progress:true});
  selfGames.push(game);
  if(game.monte.length){
   const bag=recent.flat().concat(game.monte);
   const result=monteCarloPass(live,monteOpt,shuffle(bag,rng));
   monteCurve.push({index,opponentKind,games:recent.length+1,...result});
   monteSamples+=game.monte.length;
   recent.push(game.monte);
   if(recent.length>4)recent.shift();
   console.log('monte',result);
  }else{
   console.log('self game not used',game.endReason,game.error,game.anomalies);
  }
  if((index+1)%4===0)snapshots.push(cloneNet(live));
 }
 saveNet(live,WEIGHT_DIR+'/b-trial.json');
 const devCount=fitCount(plan.dev,nnMs,workers,remain);
 const devGames=await playMany(cells(DEV_SEEDS,devCount).map(cell=>{
  const spec=evalSpec(cell,'dev');
  return job(fillEval(spec,live,frozen,'nn').spec,fillEval(spec,live,frozen,'nn').nets);
 }),workers);
 const testCount=fitCount(plan.test,plan.testCost,workers,remain);
 const pairs=cells(TEST_SEEDS,Math.max(testCount,0));
 const bCount=Math.ceil(testCount/2);
 const aCount=Math.max(0,testCount-bCount);
 const testB=await playMany(pairs.slice(0,bCount).map(cell=>{
  const spec=evalSpec(cell,'test');
  const built=fillEval(spec,live,null,'v2');
  return job(built.spec,built.nets);
 }),workers);
 const testA=await playMany(pairs.slice(0,aCount).map(cell=>{
  const spec=evalSpec(cell,'test');
  const built=fillEval(spec,frozen,null,'v2');
  return job(built.spec,built.nets);
 }),workers);
 const played=[...imitateGames,...selfGames,...devGames,...testB,...testA];
 const anomalies=addAnomalies(played.map(compactGame));
 const dev=section(devGames,game=>game.learnerSeat);
 const testBSection=section(testB,game=>game.learnerSeat);
 const testASection=section(testA,game=>game.learnerSeat);
 const learning=judgeLearning(dev.overall);
 const promotion=judgeChampion({
  ...testBSection,
  nonMirror:rateBy(testB.map(game=>rated(game,game.learnerSeat)),()=>false),
  opponentDecks:['white-sword'],
  selectedMode:'nn'
 });
 const decisionTiming=timingOf(played.flatMap(game=>game.decisionMs||[]));
 const summary={
  createdAt:new Date().toISOString(),
  gamma:GAMMA,imitateLr:IMITATE_LR,monteLr:MONTE_LR,smooth:LABEL_SMOOTH,explore:EXPLORE,
  parameters:parameterCount(init),
  bench,plan,elapsedMs:performance.now()-trialStart,
  actual:{imitate:imitateGames.length,self:selfGames.length,dev:devGames.length,test:testB.length+testA.length},
  initialization:imitationSamples.length?'v2-imitation':'random-because-no-v2-demonstration',
  imitationSamples:imitationSamples.length,monteSamples,imitationCurve,monteCurve,
  distance:{initToA:netDistance(init,frozen),aToB:netDistance(frozen,live)},
  resourceGap:[
   !v2Finished?'正式 v2 的測速對局沒有在期限內打完，所以這次沒有把 v2 放進模仿或訓練對手。':'',
   bench.nnGame.status!=='finished'?'神經網路測速對局沒有打完，後面的時間是用截斷後的耗時估算。':'',
   dev.overall.finished<16?'開發集完成場數少於事先登記的 16 場，這次牆鐘預算不夠做學習判定。':''
  ].filter(Boolean).join(' '),
  dev,testB:testBSection,testA:testASection,learning,promotion,anomalies,
  collisions:played.reduce((sum,game)=>sum+(game.collisions||0),0),
  explored:played.reduce((sum,game)=>sum+(game.explored||0),0),
  decisionTiming,
  frozen:true,
  played:played.length>0,
  games:{
   imitate:imitateGames.map(compactGame),
   self:selfGames.map(compactGame),
   dev:devGames.map(compactGame),
   testB:testB.map(compactGame),
   testA:testA.map(compactGame)
  }
 };
 summary.prototype=judgePrototype(summary);
 const markdown=renderReport(summary);
 mkdirSync('docs/white-sword-ai',{recursive:true});
 writeFileSync(REPORT_JSON,JSON.stringify(summary,null,2));
 writeFileSync(REPORT_MD,markdown);
 console.log(markdown);
 console.log('wrote',REPORT_MD);
 console.log('total',Math.round(performance.now()-started),'ms');
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
