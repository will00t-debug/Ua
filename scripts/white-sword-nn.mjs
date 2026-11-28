#!/usr/bin/env node
// Round-2 white-sword network trial. Does not train v2 and does not deploy.
import {mkdirSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {imitationAgreement} from '../training/white-sword-nn/agree.mjs';
import {planBudget} from '../training/white-sword-nn/budget.mjs';
import {pairedDelta,seedSummary,selectCheckpoint} from '../training/white-sword-nn/cluster.mjs';
import {
 BENCH_V2_MS,EXPLORE,GAMMA,IMITATE_EPOCHS,IMITATE_LR,INIT_SEED,LABEL_SMOOTH,
 MEMORY_WORKER_RSS,MONTE_LR,WALL_MS,WORKER_CAP
} from '../training/white-sword-nn/constants.mjs';
import {ACTION_DIM,INPUT_DIM,STATE_DIM} from '../training/white-sword-nn/encode.mjs';
import {imitationLoss,imitationPass,monteCarloPass,shuffle} from '../training/white-sword-nn/learn.mjs';
import {
 adamStep,backward,cloneNet,createNet,createOptimizer,forwardTrain,netDistance,
 packNet,parameterCount,saveNet,scoreActions,unpackNet,zeroGrad
} from '../training/white-sword-nn/net.mjs';
import {compactGame,playMatch} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {
 BENCH_NN_SEED,BENCH_V2_SEED,DEV_SEEDS,EVAL_CELLS,IMITATE_SEEDS,PRIOR_TEST_SEEDS,
 SELF_SEEDS,TEST_SEEDS,checkpointEnds,holdoutSplit
} from '../training/white-sword-nn/protocol.mjs';
import {judgeFollowUp,judgePrototype,judgeTrend,renderRound2} from '../training/white-sword-nn/report.mjs';
import {addAnomalies,timingOf} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const WEIGHT_DIR='training/white-sword-nn/weights/round2';
const REPORT_JSON='docs/white-sword-ai/nn-round2.json';
const REPORT_MD='docs/white-sword-ai/NN-ROUND2.md';

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
function fillEval(spec,learner,opponent){
 const seats=[null,null];
 const nets=[null,null];
 seats[spec.learnerSeat]={deckId:'white-sword',kind:'nn',explore:0};
 seats[1-spec.learnerSeat]={deckId:'white-sword',kind:'nn',explore:0};
 nets[spec.learnerSeat]=learner;
 nets[1-spec.learnerSeat]=opponent;
 return {spec:{...spec,seats},nets};
}
function cellCounts(games){
 const counts={};
 for(const game of games){
  if(game.status!=='finished')continue;
  const key=game.learnerSeat+':'+game.first;
  counts[key]=(counts[key]||0)+1;
 }
 return counts;
}
function learnerWins(game){
 return game.learnerSeat;
}
async function main(){
 const command=process.argv[2]||'trial';
 if(command!=='bench'&&command!=='trial')throw Error('Use bench or trial');
 const started=performance.now();
 console.log('measuring network throughput');
 const speed=throughput(INIT_SEED);
 const init=createNet(INIT_SEED,{version:'nn-random-r2'});
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
 const devSeeds=DEV_SEEDS.slice(0,plan.devSeeds);
 const testSeeds=TEST_SEEDS.slice(0,plan.testSeeds);
 if(testSeeds.some(seed=>devSeeds.includes(seed)))throw Error('Dev and test seeds overlap');
 if(testSeeds.some(seed=>PRIOR_TEST_SEEDS.includes(seed)))throw Error('A round-1 test seed entered the new test');
 const trialStart=performance.now();
 const remain=()=>WALL_MS-(performance.now()-trialStart);
 const rng=mulberry32(INIT_SEED);
 const imitateGames=await playMany(
  Array.from({length:plan.imitate},(_,index)=>job(imitateSpec(index),[null,null])),
  workers
 );
 const split=holdoutSplit(imitateGames.map(game=>game.seed));
 const trainSet=new Set(split.train);
 const holdSet=new Set(split.holdout);
 const trainSamples=imitateGames.filter(game=>trainSet.has(game.seed)).flatMap(game=>game.imitate);
 const holdSamples=imitateGames.filter(game=>holdSet.has(game.seed)).flatMap(game=>game.imitate);
 if(trainSamples.some(sample=>holdSet.has(sample.seed)))throw Error('Holdout sample entered training');
 console.log('imitation split',split.train.length,split.holdout.length,'samples',trainSamples.length,holdSamples.length);
 let working=cloneNet(init);
 working.version='nn-working-r2';
 const trainCurve=[];
 if(trainSamples.length){
  const opt=createOptimizer(IMITATE_LR);
  for(let epoch=0;epoch<IMITATE_EPOCHS;epoch++){
   const result=imitationPass(working,opt,shuffle(trainSamples,rng));
   trainCurve.push({epoch,...result});
   console.log('imitation',epoch,result);
  }
 }
 const frozen=cloneNet(working);
 frozen.version='nn-a-r2';
 const holdoutLoss=holdSamples.length?imitationLoss(frozen,holdSamples).loss:null;
 const agreement=holdSamples.length?imitationAgreement(frozen,holdSamples):{used:0,exact:0,uidEquivalent:0,disagree:0,unprovenCollision:0,exactRate:null,uidRate:null,disagreeRate:null};
 console.log('holdout',holdoutLoss,agreement);
 const trainDecisions=trainSamples.length;
 const holdoutFinished=imitateGames.filter(game=>holdSet.has(game.seed)&&game.status==='finished').length;
 const trainFinished=imitateGames.filter(game=>trainSet.has(game.seed)&&game.status==='finished').length;
 trainSamples.length=0;
 holdSamples.length=0;
 for(const game of imitateGames)game.imitate=[];
 mkdirSync(WEIGHT_DIR,{recursive:true});
 saveNet(frozen,WEIGHT_DIR+'/a-frozen.json');
 const live=cloneNet(frozen);
 live.version='nn-b-r2';
 const snapshots=[];
 const recent=[];
 const selfGames=[];
 const monteCurve=[];
 const curve=[];
 const monteOpt=createOptimizer(MONTE_LR);
 let monteSamples=0;
 const plannedEnds=checkpointEnds(plan.self);
 const devPassMs=Math.ceil((devSeeds.length*EVAL_CELLS.length)/workers)*nnMs*1.2;
 const finalPassMs=Math.ceil((testSeeds.length*EVAL_CELLS.length)/workers)*nnMs*1.2;
 const evaluate=async(net,seeds,mode)=>{
  const jobs=[];
  for(const seed of seeds)for(const cell of EVAL_CELLS){
   const built=fillEval(evalSpec({seed,...cell},mode),net,frozen);
   jobs.push(job(built.spec,built.nets));
  }
  if(!jobs.length)return [];
  return playMany(jobs,workers);
 };
 for(let index=0;index<plan.self;index++){
  const checksLeft=plannedEnds.filter(at=>at>index).length;
  const reserve=checksLeft*devPassMs+finalPassMs+3000;
  if(remain()<reserve+plan.raw.self){
   console.log('self-play stopped to keep the remaining evaluations',index);
   break;
  }
  const wantV2=v2Finished&&index%4===2;
  const opponentKind=!wantV2&&index%4===1&&snapshots.length?'snapshot':(wantV2?'v2':'self');
  const spec=selfSpec(index,opponentKind);
  const nets=[live,live];
  if(opponentKind==='snapshot')nets[spec.learnerSeat===0?1:0]=snapshots[snapshots.length-1];
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
   console.log('monte',result.mse,result.used);
  }else{
   console.log('self game not used',game.endReason,game.error);
  }
  if((index+1)%4===0)snapshots.push(cloneNet(live));
  if(!plannedEnds.includes(index+1))continue;
  const snap=cloneNet(live);
  snap.version='nn-b-r2-'+String(index+1);
  saveNet(snap,WEIGHT_DIR+'/b-after-'+String(index+1)+'.json');
  console.log('checkpoint',index+1);
  const games=await evaluate(snap,devSeeds,'dev');
  curve.push({
   gamesPlayed:index+1,samples:monteSamples,updates:live.updates,
   monteUpdates:live.updates-frozen.updates,net:snap,games,
   summary:seedSummary(games,learnerWins)
  });
  console.log('checkpoint result',curve[curve.length-1].summary.mean,curve[curve.length-1].summary.seeds);
 }
 const selected=selectCheckpoint(curve);
 if(selected)saveNet(selected.net,WEIGHT_DIR+'/b-selected.json');
 const finalGames=selected?await evaluate(selected.net,testSeeds,'test'):[];
 const played=[
  ...imitateGames,...selfGames,
  ...curve.flatMap(point=>point.games),
  ...finalGames
 ];
 const anomalies=addAnomalies(played.map(compactGame));
 const selectedSummary=selected?.summary||{seeds:0,mean:null,low:null,high:null,rows:[]};
 const selectedFirst=selected?seedSummary(selected.games.filter(game=>game.learnerSeat===game.first),learnerWins):null;
 const selectedSecond=selected?seedSummary(selected.games.filter(game=>game.learnerSeat!==game.first),learnerWins):null;
 const finalSummary=seedSummary(finalGames,learnerWins);
 const delta=curve.length>=2?pairedDelta(curve[0].summary.rows,curve[curve.length-1].summary.rows):{seeds:0,mean:null,low:null,high:null};
 const trend=judgeTrend(delta);
 const followUp=judgeFollowUp({
  devSeeds:selectedSummary.seeds,pairedSeeds:delta.seeds,deltaLow:delta.low,
  selectedMean:selectedSummary.mean,finalLow:finalSummary.low
 });
 const gaps=[];
 if(!v2Finished)gaps.push('正式 v2 的測速對局沒有在期限內打完，所以這次沒有模仿，也沒有把 v2 放進訓練對手。');
 if(bench.nnGame.status!=='finished')gaps.push('神經網路測速對局沒有打完，後面的時間是用截斷後的耗時估算。');
 if(imitateGames.length<plan.imitate||selfGames.length<plan.self||curve.length<plannedEnds.length)
  gaps.push('實際場數少於測速後固定的計畫。沒有因為勝率補場。');
 if(!holdoutFinished)gaps.push('沒有整場保留示範，初始化品質沒有被測量。');
 if(selectedSummary.seeds<8)gaps.push('開發種子少於 8 個，種子區間很寬。完成預算不代表檢定力足夠。');
 const summary={
  createdAt:new Date().toISOString(),round:2,
  gamma:GAMMA,imitateLr:IMITATE_LR,monteLr:MONTE_LR,smooth:LABEL_SMOOTH,explore:EXPLORE,
  parameters:parameterCount(init),
  bench,plan,elapsedMs:performance.now()-trialStart,
  actual:{
   imitate:imitateGames.length,self:selfGames.length,
   devSeeds:selectedSummary.seeds,testSeeds:finalSummary.seeds,checkpoints:curve.length
  },
  initialization:{
   source:trainDecisions?'v2-imitation':'random-because-no-v2-demonstration',
   trainGames:trainFinished,holdoutGames:holdoutFinished,
   trainSeeds:split.train,holdoutSeeds:split.holdout,
   trainDecisions,trainLoss:trainCurve.at(-1)?.loss??null,
   trainCurve,holdoutLoss,agreement
  },
  distance:{
   initToA:netDistance(init,frozen),
   aToSelected:selected?netDistance(frozen,selected.net):null
  },
  resourceGap:gaps.join(' '),
  curve:curve.map(point=>({
   gamesPlayed:point.gamesPlayed,samples:point.samples,updates:point.updates,
   monteUpdates:point.monteUpdates,summary:point.summary
  })),
  selected:selected?{
   gamesPlayed:selected.gamesPlayed,summary:selected.summary,
   first:selectedFirst,second:selectedSecond,cells:cellCounts(selected.games)
  }:null,
  delta,trend,followUp,
  finalTest:finalSummary,
  finalTestFirst:seedSummary(finalGames.filter(game=>game.learnerSeat===game.first),learnerWins),
  finalTestSecond:seedSummary(finalGames.filter(game=>game.learnerSeat!==game.first),learnerWins),
  anomalies,
  explored:played.reduce((sum,game)=>sum+(game.explored||0),0),
  decisionTiming:timingOf(played.flatMap(game=>game.decisionMs||[])),
  monteCurve,frozen:true,played:played.length>0,
  games:{
   imitate:imitateGames.map(compactGame),
   self:selfGames.map(compactGame),
   checkpoints:curve.map(point=>({gamesPlayed:point.gamesPlayed,games:point.games.map(compactGame)})),
   test:finalGames.map(compactGame)
  }
 };
 summary.prototype=judgePrototype(summary);
 const markdown=renderRound2(summary);
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
