#!/usr/bin/env node
// Round-3 stability comparison. Does not train v2 and does not deploy.
import {mkdirSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {planRound3} from '../training/white-sword-nn/budget.mjs';
import {pairedDelta,seedSummary} from '../training/white-sword-nn/cluster.mjs';
import {
 BENCH_V2_MS,EXPLORE,GAMMA,INIT_SEED,LABEL_SMOOTH,MEMORY_WORKER_RSS,MONTE_LR,
 REPLAY_FRACTION,ROUND3_WALL_MS,WORKER_CAP
} from '../training/white-sword-nn/constants.mjs';
import {copiesMatch,evaluationSymmetry,fixedUpdatePasses,outputProfile,rankingProfile} from '../training/white-sword-nn/diagnose.mjs';
import {ACTION_DIM,INPUT_DIM,STATE_DIM,joinFeatures} from '../training/white-sword-nn/encode.mjs';
import {
 assertReplayPool,boundedMonteCarloPass,drawReplay,monteCarloPass,replaySteps,retainPass,shuffle
} from '../training/white-sword-nn/learn.mjs';
import {
 cloneNet,createNet,createOptimizer,forwardTrain,loadNet,netDistance,packNet,parameterCount,
 saveNet,scoreActions,unpackNet,zeroGrad,adamStep,backward
} from '../training/white-sword-nn/net.mjs';
import {compactGame,playMatch} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {
 BENCH_NN_SEED,BENCH_V2_SEED,EVAL_CELLS,IMITATE_SEEDS,ROUND3_CONFIRM_SEEDS,ROUND3_DEV_SEEDS,
 ROUND3_DIAG_SEEDS,SELF_SEEDS,assertExperimentSeed,holdoutSplit
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerConnection,answerStability,judgeEarlyRegression,judgeMitigation,judgeScaleGap,
 judgeSurpass,renderRound3
} from '../training/white-sword-nn/report.mjs';
import {addAnomalies,timingOf} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const WEIGHT_DIR='training/white-sword-nn/weights/round3';
const FROZEN_FILE='training/white-sword-nn/weights/round2/a-frozen.json';
const REPORT_JSON='docs/white-sword-ai/nn-round3.json';
const REPORT_MD='docs/white-sword-ai/NN-ROUND3.md';

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
function throughput(){
 const net=createNet(INIT_SEED+1,{version:'nn-bench'});
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
function syntheticGroup(){
 const state=Array(STATE_DIM).fill(0);
 state[0]=1;
 return [0,1,2].map(index=>{
  const action=Array(ACTION_DIM).fill(0);
  action[index]=1;
  return joinFeatures(state,action);
 });
}
function opponentKind(index,snapshots,v2Finished){
 const wantV2=v2Finished&&index%4===2;
 if(!wantV2&&index%4===1&&snapshots.length)return 'snapshot';
 return wantV2?'v2':'self';
}
function selfSpec(index,kind){
 const learnerSeat=index%2;
 const first=Math.floor(index/2)%2;
 const seats=[seat('nn',EXPLORE),seat('nn',EXPLORE)];
 if(kind==='v2'){
  seats[learnerSeat]=seat('nn',EXPLORE);
  seats[1-learnerSeat]=seat('v2');
 }
 if(kind==='snapshot'){
  seats[learnerSeat]=seat('nn',EXPLORE);
  seats[1-learnerSeat]=seat('nn',0);
 }
 return {
  seed:assertExperimentSeed(SELF_SEEDS[index],'train'),first,mode:'train',
  learnerSeat:kind==='self'?null:learnerSeat,
  recordSeats:kind==='self'?[0,1]:[learnerSeat],
  teacherSeats:[],exploreSeed:(SELF_SEEDS[index]*17+index)>>>0,progress:false,
  seats,opponentKind:kind
 };
}
function netsFor(arm,spec,kind){
 const nets=[arm.net,arm.net];
 if(kind==='snapshot')nets[spec.learnerSeat===0?1:0]=arm.snapshots.at(-1);
 if(kind==='v2')nets[1-spec.learnerSeat]=null;
 return nets;
}
function fillEval(spec,learner,opponent){
 const seats=[
  {deckId:'white-sword',kind:'nn',explore:0},
  {deckId:'white-sword',kind:'nn',explore:0}
 ];
 const nets=[opponent,opponent];
 seats[spec.learnerSeat]={deckId:'white-sword',kind:'nn',explore:0};
 nets[spec.learnerSeat]=learner;
 return {spec:{...spec,seats},nets};
}
function learnerWins(game){
 return game.learnerSeat;
}
function sideSummary(games,first){
 return seedSummary((games||[]).filter(game=>(game.learnerSeat===game.first)===first),learnerWins);
}
function makeArm(name,frozen){
 const net=cloneNet(frozen);
 net.version='nn-b-r3-'+name;
 return {name,net,opt:createOptimizer(MONTE_LR),recent:[],samples:0,replaySteps:0,rng:mulberry32(INIT_SEED),snapshots:[],curve:[],selfGames:[]};
}
function updateArm(arm,monte,replayPool,holdout){
 if(!monte.length)return {mse:null,used:0,imitateUsed:0};
 const shuffled=shuffle(arm.recent.flat().concat(monte),arm.rng);
 let result;
 if(arm.name==='retain'){
  const drawn=drawReplay(replayPool,replaySteps(shuffled.length),arm.rng);
  assertReplayPool(drawn,holdout);
  result=retainPass(arm.net,arm.opt,shuffled,drawn);
  arm.replaySteps+=result.imitateUsed;
 }else result=monteCarloPass(arm.net,arm.opt,shuffled);
 arm.samples+=monte.length;
 arm.recent.push(monte);
 if(arm.recent.length>4)arm.recent.shift();
 return result;
}
function earlyOf(arm){
 const zero=arm.curve.find(point=>point.gamesPlayed===0);
 const first=arm.curve.find(point=>point.gamesPlayed===1);
 const fourth=arm.curve.find(point=>point.gamesPlayed===4);
 if(!zero||!first||!fourth)return {checked:false,regressed:false,reasons:['第 1 場或第 4 場檢查點沒有齊']};
 const reasons=[];
 for(const point of [first,fourth]){
  const drop=(zero.ranking?.agreement?.exactRate??0)-(point.ranking?.agreement?.exactRate??0);
  const delta=pairedDelta(zero.summary.rows,point.summary.rows);
  const judged=judgeEarlyRegression({agreementDrop:drop,deltaHigh:delta.high});
  if(judged.regressed)reasons.push(point.gamesPlayed+' 場：'+judged.reasons.join('、'));
 }
 return {checked:true,regressed:reasons.length>0,reasons};
}
function runOffline(pass,passes,fixed,holdSamples,frozen){
 const net=cloneNet(frozen);
 const opt=createOptimizer(MONTE_LR);
 const marks=[];
 for(let index=0;index<passes.length;index++){
  if(passes[index].length)pass(net,opt,passes[index]);
  const games=index+1;
  if(games===1||games===passes.length){
   marks.push({
    games,updates:net.updates-frozen.updates,distance:netDistance(frozen,net),
    output:outputProfile(net,fixed),
    ranking:holdSamples.length?rankingProfile(net,holdSamples):null
   });
  }
 }
 return {net,marks};
}

async function main(){
 const command=process.argv[2]||'trial';
 if(command!=='bench'&&command!=='trial')throw Error('Use bench or trial');
 const started=performance.now();
 const timings=[];
 const compacts=[];
 const release=game=>{
  timings.push(...(game.decisionMs||[]));
  const compact=compactGame(game);
  const monte=game.monte;
  const imitate=game.imitate;
  game.monte=[];
  game.imitate=[];
  game.actions=[];
  game.decisionMs=[];
  game.publicHistory=[];
  compacts.push(compact);
  return {compact,monte,imitate};
 };
 console.log('measuring network throughput');
 const speed=throughput();
 const init=createNet(INIT_SEED,{version:'nn-random-r3'});
 console.log('measuring one network game');
 const nnGame=playMatch({
  seed:BENCH_NN_SEED,first:0,mode:'eval',budgetMs:BENCH_V2_MS,progress:true,
  seats:[seat('nn'),seat('nn')],nets:[init,init],recordSeats:[],teacherSeats:[]
 });
 release(nnGame);
 console.log('network game',nnGame.status,nnGame.steps,Math.round(nnGame.ms));
 console.log('measuring one official v2 mirror');
 const v2Game=playMatch({
  seed:BENCH_V2_SEED,first:0,mode:'eval',budgetMs:BENCH_V2_MS,progress:true,
  teacherSeats:[0,1],seats:[seat('v2'),seat('v2')],nets:[null,null]
 });
 release(v2Game);
 console.log('v2 game',v2Game.status,v2Game.steps,Math.round(v2Game.ms));
 const rss=memoryUsage().rss;
 const workers=rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
 const v2Finished=v2Game.status==='finished'&&!v2Game.anomalies.unfinished;
 const bench={
  nnGame:compacts[0],v2Game:compacts[1],v2Finished,
  forward:speed.forward,train:speed.train,rssMb:Math.round(rss/1024/1024),workers
 };
 const nnMs=Math.max(1,nnGame.ms);
 const v2Ms=v2Finished?Math.max(1,v2Game.ms):Math.max(BENCH_V2_MS,v2Game.ms);
 const plan=planRound3({wallMs:ROUND3_WALL_MS,nnMs,v2Ms,v2Finished,workers});
 console.log('plan',plan);
 if(command==='bench'){
  console.log(JSON.stringify({bench,plan},null,2));
  return;
 }
 const trialStart=performance.now();
 const remain=()=>plan.wallMs-(performance.now()-trialStart);
 const gaps=[];
 if(!v2Finished)gaps.push('正式 v2 的測速對局沒有在期限內打完，所以這次沒有模仿示範，也沒有把 v2 放進訓練對手。');
 if(bench.nnGame.status!=='finished')gaps.push('神經網路測速對局沒有打完，後面的時間是用截斷後的耗時估算。');
 if(!plan.fits)gaps.push('測速後的牆鐘排不進兩個版本的完整比較。沒有因為這個結果改超參數。');
 const frozen=loadNet(FROZEN_FILE);
 frozen.version='nn-a-r2';
 const groups=[syntheticGroup()];
 const probe=cloneNet(frozen);
 if(!copiesMatch(frozen,probe,groups))throw Error('Cloned weights, scores, or actions diverged before any update');
 const devSeeds=ROUND3_DEV_SEEDS.slice(0,plan.devSeeds).map(seed=>assertExperimentSeed(seed,'round3-dev'));
 const confirmSeeds=ROUND3_CONFIRM_SEEDS.slice(0,plan.confirmSeeds).map(seed=>assertExperimentSeed(seed,'round3-confirm'));
 const diagSeeds=ROUND3_DIAG_SEEDS.slice(0,plan.diagGames).map(seed=>assertExperimentSeed(seed,'round3-diag'));
 if(confirmSeeds.some(seed=>devSeeds.includes(seed)||diagSeeds.includes(seed)))throw Error('Confirmation seeds overlap development or diagnostic seeds');
 const imitateSeeds=IMITATE_SEEDS.slice(0,plan.imitate);
 const split=holdoutSplit(imitateSeeds);
 const trainSet=new Set(split.train);
 const holdSet=new Set(split.holdout);
 const evaluate=async(net,seeds,trace)=>{
  const jobs=[];
  for(const seed of seeds)for(const cell of EVAL_CELLS){
   const spec={
    seed,first:cell.first,mode:'dev',learnerSeat:cell.learnerSeat,
    recordSeats:[],teacherSeats:[],progress:false,keepActions:trace
   };
   const built=fillEval(spec,net,frozen);
   jobs.push(job(built.spec,built.nets));
  }
  if(!jobs.length)return [];
  return playMany(jobs,workers);
 };
 let trainSamples=[];
 let holdSamples=[];
 let imitateFinished={train:0,holdout:0};
 if(imitateSeeds.length){
  console.log('replaying demonstrations',imitateSeeds.length);
  const games=await playMany(imitateSeeds.map((seed,index)=>({
   spec:{
    seed:assertExperimentSeed(seed,'train'),first:index%2,mode:'imitate',
    teacherSeats:[0,1],progress:false,seats:[seat('v2'),seat('v2')]
   },
   seatNets:[null,null]
  })),workers);
  for(const game of games){
   const packed=release(game);
   if(trainSet.has(game.seed)){
    trainSamples=trainSamples.concat(packed.imitate);
    if(game.status==='finished')imitateFinished.train++;
   }else if(holdSet.has(game.seed)){
    holdSamples=holdSamples.concat(packed.imitate);
    if(game.status==='finished')imitateFinished.holdout++;
   }else throw Error('Demonstration seed '+game.seed+' is outside the planned split');
  }
  assertReplayPool(trainSamples,split.holdout);
  if(trainSamples.some(sample=>holdSet.has(sample.seed)))throw Error('Holdout sample entered the replay pool');
  console.log('demonstrations',imitateFinished.train,imitateFinished.holdout,'samples',trainSamples.length,holdSamples.length);
 }
 if(holdSamples.length){
  groups.push(...holdSamples.slice(0,4).map(sample=>sample.rows));
  if(!copiesMatch(frozen,probe,groups))throw Error('Frozen scores changed while replaying demonstrations');
 }
 const beforeRanking=holdSamples.length?rankingProfile(frozen,holdSamples):null;
 let diagBatches=[];
 if(diagSeeds.length){
  console.log('diagnostic games',diagSeeds.length);
  const games=await playMany(diagSeeds.map((seed,index)=>job({
   seed,first:index%2,mode:'train',learnerSeat:null,recordSeats:[0,1],teacherSeats:[],
   exploreSeed:(seed*17+index)>>>0,progress:false,
   seats:[seat('nn',EXPLORE),seat('nn',EXPLORE)]
  },[frozen,frozen])),workers);
  diagBatches=games.map(game=>release(game).monte);
 }
 const fixed=diagBatches.flat();
 const beforeOutput=outputProfile(frozen,fixed);
 const passes=fixedUpdatePasses(diagBatches,mulberry32(INIT_SEED+7));
 const offlineOriginal=passes.length?runOffline(monteCarloPass,passes,fixed,holdSamples,frozen):{marks:[]};
 const offlineBounded=passes.length?runOffline(boundedMonteCarloPass,passes,fixed,holdSamples,frozen):{marks:[],net:null};
 if(offlineBounded.net)saveNet(offlineBounded.net,WEIGHT_DIR+'/scale-diagnostic.json');
 let boundedEval=null;
 const scaleSeeds=devSeeds.slice(0,plan.scaleSeeds);
 if(offlineBounded.net&&scaleSeeds.length){
  console.log('scale diagnostic versus A');
  const games=await evaluate(offlineBounded.net,scaleSeeds,false);
  for(const game of games)release(game);
  boundedEval=seedSummary(games,learnerWins);
 }
 let zeroGames=[];
 let symmetry={ok:false,pairs:0,winnerMatch:0,actionMatch:0,actionCompared:0,missing:0,decisive:0,learnerHalf:0,problems:[]};
 let zeroSummary={seeds:0,finished:0,mean:null,low:null,high:null,rows:[]};
 if(devSeeds.length){
  console.log('zero-update evaluation');
  const zeroFull=await evaluate(frozen,devSeeds,true);
  symmetry=evaluationSymmetry(zeroFull);
  zeroSummary=seedSummary(zeroFull,learnerWins);
  zeroGames=zeroFull.map(game=>release(game).compact);
  console.log('symmetry',symmetry.ok,'zero',zeroSummary.mean,symmetry.problems.slice(0,4));
 }
 const copyOk=copiesMatch(frozen,probe,groups);
 if(!copyOk)gaps.push('複本的權重、分數或動作和凍結 A 不一致。兩個訓練版本沒有開跑。');
 if(devSeeds.length&&!symmetry.ok)gaps.push('同一模型在座位交換下沒有給出對稱的對局。兩個訓練版本沒有開跑。');
 if(!imitateFinished.holdout)gaps.push('沒有整場保留示範，模仿一致率沒有被測量。');
 const original=makeArm('original',frozen);
 const retain=makeArm('retain',frozen);
 if(!copiesMatch(frozen,original.net,groups)||!copiesMatch(frozen,retain.net,groups))throw Error('Arm copies diverged at zero updates');
 const zeroPoint=()=>({
  gamesPlayed:0,samples:0,updates:frozen.updates,monteUpdates:0,replaySteps:0,
  summary:zeroSummary,ranking:beforeRanking,games:zeroGames
 });
 if(devSeeds.length){
  original.curve.push(zeroPoint());
  retain.curve.push(zeroPoint());
  saveNet(original.net,WEIGHT_DIR+'/original-after-0.json');
  saveNet(retain.net,WEIGHT_DIR+'/retain-after-0.json');
 }
 const canTrain=plan.fits&&copyOk&&symmetry.ok&&trainSamples.length>0&&devSeeds.length>0;
 const devWave=Math.ceil((devSeeds.length*EVAL_CELLS.length)/Math.max(1,workers))*nnMs*1.2;
 const confirmWave=plan.confirmSeeds?2*Math.ceil((confirmSeeds.length*EVAL_CELLS.length)/Math.max(1,workers))*nnMs*1.2:0;
 if(canTrain){
  for(let index=0;index<plan.self;index++){
   const future=plan.checks.filter(at=>at>index).length;
   if(remain()<future*2*devWave+confirmWave+2*nnMs*1.2+3000){
    console.log('both arms stopped to keep the remaining evaluations',index);
    gaps.push('牆鐘剩下的時間不夠把兩個版本都打到計畫終點。兩個版本停在同一場，沒有補場。');
    break;
   }
   const pair=[];
   for(const arm of [original,retain]){
    const kind=opponentKind(index,arm.snapshots,v2Finished);
    const spec=selfSpec(index,kind);
    console.log(arm.name,index,kind,'seed',spec.seed);
    pair.push(job(spec,netsFor(arm,spec,kind)));
   }
   const games=await playMany(pair,workers);
   for(let side=0;side<2;side++){
    const arm=[original,retain][side];
    const packed=release(games[side]);
    const result=updateArm(arm,packed.monte,trainSamples,split.holdout);
    arm.selfGames.push(packed.compact);
    console.log(arm.name,'update',result.mse,result.used,result.imitateUsed||0);
    if((index+1)%4===0)arm.snapshots.push(cloneNet(arm.net));
   }
   if(!plan.checks.includes(index+1))continue;
   for(const arm of [original,retain]){
    const snap=cloneNet(arm.net);
    saveNet(snap,WEIGHT_DIR+'/'+arm.name+'-after-'+(index+1)+'.json');
    console.log('checkpoint',arm.name,index+1);
    const played=await evaluate(snap,devSeeds,false);
    const packed=played.map(game=>release(game).compact);
    arm.curve.push({
     gamesPlayed:index+1,samples:arm.samples,updates:arm.net.updates,
     monteUpdates:arm.net.updates-frozen.updates,replaySteps:arm.replaySteps,
     summary:seedSummary(packed,learnerWins),
     ranking:holdSamples.length?rankingProfile(arm.net,holdSamples):beforeRanking,
     games:packed
    });
    console.log(arm.name,arm.curve.at(-1).summary.mean);
   }
  }
 }else if(plan.self>0)gaps.push('比較沒有開跑，所以沒有把自我對戰的場數拿去加給另一個版本。');
 const publish=point=>point?(({games,...rest})=>rest)(point):null;
 for(const arm of [original,retain]){
  const found=plan.self>0?arm.curve.find(point=>point.gamesPlayed===plan.self)||null:null;
  arm.endpoint=publish(found);
  arm.first=sideSummary(found?.games,true);
  arm.second=sideSummary(found?.games,false);
  arm.surpass=found&&symmetry.ok?judgeSurpass(found,zeroSummary.rows):{ok:false,reason:found?'0 次更新的對稱檢查沒有成立':'沒有跑到計畫終點'};
  arm.latest=found?cloneNet(arm.net):null;
 }
 retain.mitigation=judgeMitigation(original.endpoint?.summary,retain.endpoint?.summary);
 const confirm={ran:false,reason:'',retain:null,original:null};
 if(!canTrain)confirm.reason='訓練比較沒有開跑，所以沒有確認種子對局。';
 else if(!plan.confirmSeeds)confirm.reason='牆鐘沒有留下確認對局的額度。';
 else if(!original.surpass.ok&&!retain.surpass.ok)confirm.reason='兩個版本的開發終點都沒有超越凍結 A。';
 else{
  confirm.ran=true;
  if(retain.surpass.ok){
   const games=await evaluate(retain.net,confirmSeeds,false);
   for(const game of games)release(game);
   confirm.retain=seedSummary(games,learnerWins);
  }
  if(original.surpass.ok){
   const games=await evaluate(original.net,confirmSeeds,false);
   for(const game of games)release(game);
   confirm.original=seedSummary(games,learnerWins);
  }
 }
 const early=earlyOf(original);
 const earlyRetain=earlyOf(retain);
 if(original.selfGames.length!==retain.selfGames.length)gaps.push('兩個版本的自我對戰場數不一致。');
 if(original.selfGames.length<plan.self)gaps.push('實際自我對戰少於測速後固定的場數。沒有因為勝率補場。');
 const anomalies=addAnomalies(compacts);
 const summary={
  createdAt:new Date().toISOString(),round:3,
  gamma:GAMMA,monteLr:MONTE_LR,smooth:LABEL_SMOOTH,explore:EXPLORE,replayFraction:REPLAY_FRACTION,
  parameters:parameterCount(frozen),
  bench,plan,elapsedMs:performance.now()-trialStart,
  resourceGap:gaps.join(' '),
  copy:{match:copyOk,updates:frozen.updates},
  symmetry,zero:zeroSummary,
  initialization:{
   trainGames:imitateFinished.train,holdoutGames:imitateFinished.holdout,
   trainSeeds:split.train,holdoutSeeds:split.holdout,
   trainDecisions:trainSamples.length,holdoutDecisions:holdSamples.length
  },
  scale:{
   separated:diagBatches.length>0,
   judgment:judgeScaleGap(beforeOutput),
   before:{output:beforeOutput,ranking:beforeRanking},
   original:{marks:offlineOriginal.marks},
   bounded:{marks:offlineBounded.marks},
   boundedEval
  },
  early,earlyRetain,
  arms:{
   original:{
    curve:original.curve,endpoint:original.endpoint,surpass:original.surpass,
    first:original.first,second:original.second,selfGames:original.selfGames.length
   },
   retain:{
    curve:retain.curve,endpoint:retain.endpoint,surpass:retain.surpass,
    mitigation:retain.mitigation,first:retain.first,second:retain.second,
    selfGames:retain.selfGames.length
   }
  },
  confirm,anomalies,
  explored:compacts.reduce((sum,game)=>sum+(game.explored||0),0),
  decisionTiming:timingOf(timings),
  distance:{
   aToOriginal:original.endpoint?netDistance(frozen,original.net):null,
   aToRetain:retain.endpoint?netDistance(frozen,retain.net):null
  }
 };
 summary.connection=answerConnection(summary);
 summary.stability=answerStability(summary);
 const markdown=renderRound3(summary);
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
