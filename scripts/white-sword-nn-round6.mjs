#!/usr/bin/env node
// Round-6 PPO retrain. Three lines, one locked batch count, endpoint eval only.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {planRound6,round4Opponent} from '../training/white-sword-nn/budget.mjs';
import {pairedDelta,seedSummary} from '../training/white-sword-nn/cluster.mjs';
import {
 BENCH_V2_MS,GAMMA,MEMORY_WORKER_RSS,PPO_ACTOR_LR,PPO_BATCH_GAMES,PPO_CLIP,PPO_CRITIC_LR,
 PPO_ENTROPY,PPO_EPOCHS,PPO_KL_LIMIT,ROUND6_BENCH_SHUFFLE,ROUND6_CRITIC_SEEDS,ROUND6_LINES,
 ROUND6_SHUFFLE_SEEDS,ROUND6_WALL_MS,WORKER_CAP
} from '../training/white-sword-nn/constants.mjs';
import {copiesMatch} from '../training/white-sword-nn/diagnose.mjs';
import {ACTION_DIM,STATE_DIM,joinFeatures} from '../training/white-sword-nn/encode.mjs';
import {sampleFingerprint,thetaHash} from '../training/white-sword-nn/fingerprint.mjs';
import {addAnomalies} from '../dist/universal-v2/white-sword-ai/stats.mjs';
import {
 cloneNet,createOptimizer,loadNet,netDistance,packNet,parameterCount,sameWeights,saveNet,unpackNet
} from '../training/white-sword-nn/net.mjs';
import {compactGame,playMatch} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {
 actorScores,assertOnPolicy,classifyMonitor,createCritic,criticStep,fixedAdvantages,greedyFromActor,
 normalizeAdvantages,ppoUpdate,splitOutcomes,summarizeMonitor
} from '../training/white-sword-nn/ppo.mjs';
import {
 BENCH_NN_SEED,BENCH_V2_SEED,EVAL_CELLS,ROUND6_DEV_SEEDS,ROUND6_TRAIN_SEEDS,assertExperimentSeed
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerRound6Confirm,answerRound6Lines,answerRound6Monitor,judgeRound6,judgeRound6Line,renderRound6
} from '../training/white-sword-nn/report.mjs';

const WEIGHT_ROOT='training/white-sword-nn/weights/round6';
const FROZEN_FILE='training/white-sword-nn/weights/round2/a-frozen.json';
const PLAN_JSON='docs/white-sword-ai/nn-round6-plan.json';
const REPORT_JSON='docs/white-sword-ai/nn-round6.json';
const REPORT_MD='docs/white-sword-ai/NN-ROUND6.md';
const PROTECTED=[
 'training/white-sword-nn/weights/round2','training/white-sword-nn/weights/round4',
 'docs/white-sword-ai/nn-round4.json','docs/white-sword-ai/nn-round5.json',
 'docs/white-sword-ai/NN-ROUND4.md','docs/white-sword-ai/NN-ROUND5.md'
];

function git(args){
 return execFileSync('git',args,{encoding:'utf8'}).trim();
}
function identity(file){
 const raw=readFileSync(file);
 const net=JSON.parse(raw.toString('utf8'));
 return {
  file,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),
  version:net.version,updates:net.updates,seed:net.seed,format:net.format,
  commit:git(['log','-1','--format=%H','--',file])
 };
}
function fileHash(file){
 return createHash('sha256').update(readFileSync(file)).digest('hex');
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
function nnSeat(policy){
 return {deckId:'white-sword',kind:'nn',explore:0,policy};
}
function job(spec,nets,critics){
 return {
  spec,
  seatNets:(nets||[null,null]).map(net=>net?packNet(net):null),
  seatCritics:(critics||[null,null]).map(net=>net?packNet(net):null)
 };
}
function playJob(item){
 const nets=(item.seatNets||[]).map(packed=>packed?unpackNet(packed):null);
 const critics=(item.seatCritics||[]).map(packed=>packed?unpackNet(packed):null);
 return playMatch({...item.spec,nets,critics,progress:true});
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
function blankState(){
 const state=Array(STATE_DIM).fill(0);
 state[0]=1;
 return state;
}
function probeActions(){
 const state=blankState();
 const actions=[0,1,2].map(index=>{
  const action=Array(ACTION_DIM).fill(0);
  action[0]=1;
  action[1+index]=1;
  return action;
 });
 return {state,actions};
}
function saveRound6(net,line,name){
 const file=WEIGHT_ROOT+'/line-'+line+'/'+name;
 if(!file.includes('/weights/round6/line-'+line+'/'))throw Error('refusing to write outside round 6');
 saveNet(net,file);
 return file;
}
function batchLayout(kind,learnerSeat,behavior,lagged){
 if(kind==='self'){
  return {
   seats:[nnSeat('softmax'),nnSeat('softmax')],
   nets:[behavior,behavior],learnerSeat:null,recordSeats:[0,1]
  };
 }
 const seats=[nnSeat('greedy'),nnSeat('greedy')];
 const nets=[null,null];
 seats[learnerSeat]=nnSeat('softmax');
 nets[learnerSeat]=behavior;
 if(kind==='v2')seats[1-learnerSeat]={deckId:'white-sword',kind:'v2',explore:0};
 else nets[1-learnerSeat]=lagged;
 return {seats,nets,learnerSeat,recordSeats:[learnerSeat]};
}
function separationProbe(frozen,criticSeed){
 const actor=cloneNet(frozen);
 const {state,actions}=probeActions();
 const features=actions.map(action=>joinFeatures(state,action));
 const weights=copiesMatch(frozen,actor,[features])&&sameWeights(frozen,actor);
 const left=greedyFromActor(frozen,state,actions,actions);
 const right=greedyFromActor(actor,state,actions,actions);
 const greedySame=left.index===right.index;
 let scoresSame=left.scores.length===right.scores.length;
 for(let index=0;index<left.scores.length;index++)if(!Object.is(left.scores[index],right.scores[index]))scoresSame=false;
 const scoreApi=actorScores(actor,state,actions);
 let apiSame=scoreApi.length===left.scores.length;
 for(let index=0;index<scoreApi.length;index++)if(!Object.is(scoreApi[index],left.scores[index]))apiSame=false;
 const held=cloneNet(actor);
 const before=cloneNet(held);
 const throwaway=createCritic(criticSeed);
 const opt=createOptimizer(PPO_CRITIC_LR);
 for(let step=0;step<4;step++)criticStep(throwaway,opt,state,step%2?1:-1);
 const criticIsolated=sameWeights(held,before)&&held.updates===before.updates;
 return {copy:weights&&greedySame&&scoresSame&&apiSame,criticIsolated,greedySame,scoresSame};
}
function historicalEpochs(){
 try{
  const round4=JSON.parse(readFileSync('docs/white-sword-ai/nn-round4.json','utf8'));
  return {
   note:'第四輪另一組種子的混合 KL 停止紀錄，不是本輪的對照組。',
   batches:(round4.train?.batches||[]).map(batch=>({
    batch:batch.batch,epochs:batch.epochs,stopped:batch.klStopped,kl:batch.kl
   }))
  };
 }catch{
  return null;
 }
}
function learnerWins(game){
 return game.learnerSeat;
}
function slimRow(row){
 return {
  samples:row.samples,mixedKl:row.mixedKl,fixedKl:row.fixedKl,fixedMax:row.fixedMax,
  fixedQuantiles:row.fixedQuantiles,entropy:row.entropy,actorObjective:row.actorObjective,
  criticMse:row.criticMse,clippedRate:row.clippedRate
 };
}

async function main(){
 if((process.argv[2]||'trial')!=='trial')throw Error('Use trial');
 const started=performance.now();
 const codeCommit=git(['rev-parse','HEAD']);
 const protectedBefore=git(['status','--porcelain','--',...PROTECTED]);
 const baseline=identity(FROZEN_FILE);
 if(baseline.version!=='nn-a-r2'||baseline.updates!==9030)throw Error('baseline is not frozen A');
 const frozen=loadNet(FROZEN_FILE);
 const frozenGuard=cloneNet(frozen);
 const probes=ROUND6_CRITIC_SEEDS.map(seed=>separationProbe(frozenGuard,seed));
 const separated=probes.every(item=>item.copy&&item.criticIsolated);
 console.log('separation',probes.map(item=>item.copy&&item.criticIsolated));

 console.log('measuring one softmax rollout');
 const benchActor=cloneNet(frozenGuard);
 benchActor.version='bench@'+benchActor.updates;
 const benchCritic=createCritic(ROUND6_CRITIC_SEEDS[0]);
 const rollout=playMatch({
  seed:assertExperimentSeed(BENCH_NN_SEED,'bench'),first:0,mode:'train',budgetMs:BENCH_V2_MS,progress:true,
  behaviorVersion:benchActor.version,behaviorUpdates:benchActor.updates,
  seats:[nnSeat('softmax'),nnSeat('softmax')],
  nets:[benchActor,cloneNet(benchActor)],critics:[benchCritic,benchCritic],
  recordSeats:[0,1],teacherSeats:[]
 });
 console.log('rollout',rollout.status,rollout.steps,Math.round(rollout.ms));
 console.log('measuring one greedy evaluation');
 const evalGame=playMatch({
  seed:assertExperimentSeed(BENCH_NN_SEED,'bench'),first:1,mode:'eval',budgetMs:BENCH_V2_MS,progress:true,
  seats:[nnSeat('greedy'),nnSeat('greedy')],
  nets:[benchActor,cloneNet(benchActor)],recordSeats:[],teacherSeats:[]
 });
 console.log('eval',evalGame.status,evalGame.steps,Math.round(evalGame.ms));
 console.log('measuring one network game against official v2');
 const v2Game=playMatch({
  seed:assertExperimentSeed(BENCH_V2_SEED,'bench'),first:0,mode:'train',budgetMs:BENCH_V2_MS,progress:true,
  behaviorVersion:benchActor.version,behaviorUpdates:benchActor.updates,learnerSeat:0,
  seats:[nnSeat('softmax'),{deckId:'white-sword',kind:'v2',explore:0}],
  nets:[benchActor,null],critics:[benchCritic,null],recordSeats:[0],teacherSeats:[]
 });
 console.log('v2',v2Game.status,v2Game.steps,Math.round(v2Game.ms));
 const updateSamples=(rollout.ppo||[]).slice();
 for(const sample of updateSamples)sample.advantage=0;
 let updateMs=0;
 if(updateSamples.length){
  const timerActor=cloneNet(benchActor);
  const updateStarted=performance.now();
  ppoUpdate({
   actor:timerActor,actorOpt:createOptimizer(PPO_ACTOR_LR),
   critic:cloneNet(benchCritic),criticOpt:createOptimizer(PPO_CRITIC_LR),
   behavior:benchActor,samples:updateSamples,
   config:{
    rng:mulberry32(ROUND6_BENCH_SHUFFLE),epochs:PPO_EPOCHS,clip:PPO_CLIP,
    entropy:PPO_ENTROPY,klLimit:Infinity
   }
  });
  updateMs=(performance.now()-updateStarted)*PPO_BATCH_GAMES;
 }
 if(!sameWeights(frozen,frozenGuard)||!sameWeights(benchActor,frozenGuard))throw Error('timing updated frozen A');
 const rss=memoryUsage().rss;
 const workers=rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
 const v2Finished=v2Game.status==='finished'&&!v2Game.anomalies.unfinished&&!v2Game.anomalies.engineError;
 const rolloutFinished=rollout.status==='finished'&&rollout.ppo.length>0;
 const elapsed=performance.now()-started;
 const plan=planRound6({
  wallMs:Math.max(0,ROUND6_WALL_MS-elapsed),
  rolloutMs:rollout.ms,evalMs:evalGame.ms,v2Ms:v2Game.ms,updateMs,
  v2Finished,workers
 });
 console.log('plan',plan.batches,'batches',plan.lines,'lines',Math.round(plan.estimatedMs),'ms',plan.kinds.join(','));
 const overWall=()=>performance.now()-started>=ROUND6_WALL_MS;
 const planRecord={
  createdAt:new Date().toISOString(),codeCommit,baseline,probes,separated,
  bench:{
   rolloutMs:rollout.ms,rolloutSteps:rollout.steps,rolloutStatus:rollout.status,
   evalMs:evalGame.ms,v2Ms:v2Game.ms,v2Status:v2Game.status,v2Finished,rolloutFinished,
   updateMs,rssMb:Math.round(rss/1024/1024),workers
  },
  plan,seeds:{
   critic:[...ROUND6_CRITIC_SEEDS],shuffle:[...ROUND6_SHUFFLE_SEEDS],
   train:ROUND6_TRAIN_SEEDS.map(block=>[block[0],block[block.length-1]]),
   dev:[ROUND6_DEV_SEEDS[0],ROUND6_DEV_SEEDS[ROUND6_DEV_SEEDS.length-1]],
   devCount:ROUND6_DEV_SEEDS.length
  },
  hyperparameters:{
   gamma:GAMMA,clip:PPO_CLIP,actorLr:PPO_ACTOR_LR,criticLr:PPO_CRITIC_LR,
   epochs:PPO_EPOCHS,entropy:PPO_ENTROPY,klLimit:PPO_KL_LIMIT,batchGames:PPO_BATCH_GAMES
  },
  note:'這份計畫在任何訓練對局之前寫下。終點評估還沒有開始。'
 };
 mkdirSync('docs/white-sword-ai',{recursive:true});
 writeFileSync(PLAN_JSON,JSON.stringify(planRecord,null,2));
 console.log('wrote',PLAN_JSON);

 const gaps=[];
 const lines=[];
 const compacts=[];
 try{
  if(!separated)gaps.push('0 次更新的權重、分數或貪心動作沒有和 A 一致，或只更新 Critic 時 Actor 變了。沒有開始訓練。');
  else if(!rolloutFinished)gaps.push('softmax rollout 沒有正常結束，沒有開始訓練。');
  else if(!plan.fits)gaps.push('測速之後，三條線連同終點評估放不進牆鐘。沒有開始訓練，也沒有只留其中一條。');
  else if(overWall())gaps.push('測速已經用完牆鐘，沒有開始訓練。');
  else{
   for(let line=0;line<ROUND6_LINES;line++){
    if(overWall()){
     gaps.push('牆鐘到了，沒有開下一條線。');
     break;
    }
    const trained=await trainLine({line,frozen:frozenGuard,plan,workers,v2Finished,started});
    compacts.push(...trained.compacts);
    delete trained.compacts;
    lines.push(trained.record);
    trained.record.actor=trained.actor;
    if(!trained.record.completed){
     gaps.push('線 '+line+' 沒有跑完鎖定的批次。其餘線不再開，也不做終點評估。');
     break;
    }
   }
  }
  const trainingComplete=lines.length===ROUND6_LINES&&lines.every(line=>line.completed)&&!overWall();
  if(lines.length===ROUND6_LINES&&lines.every(line=>line.completed)&&overWall()){
   gaps.push('訓練批次跑完時牆鐘已到，沒有開始終點評估。');
  }
  if(trainingComplete){
   for(const line of lines){
    console.log('endpoint eval line',line.line);
    const evaluated=await evaluate(line.actor,frozenGuard,workers);
    compacts.push(...evaluated.compacts);
    const evalAnomalies=evaluated.anomalies;
    delete evaluated.compacts;
    delete evaluated.anomalies;
    Object.assign(line,evaluated);
    line.evalAnomalies=evalAnomalies;
    line.judgment=judgeRound6Line({
     plannedGames:plan.evalGamesPerLine,finishedGames:line.finishedGames,
     unfinished:line.evalUnfinished.length,seeds:line.summary.seeds,
     completeSeeds:line.completeSeeds,delta:line.versusHalf,
     plannedBatches:plan.batches,ranBatches:line.ranBatches
    });
   }
  }else{
   for(const line of lines){
    line.judgment={kind:'incomplete',delta:null,reason:'終點評估沒有開始。'};
   }
  }
 }catch(error){
  gaps.push(String(error?.message||error));
  console.error(error);
  process.exitCode=1;
 }
 const baselineAfter=identity(FROZEN_FILE);
 const intact=baselineAfter.sha256===baseline.sha256&&sameWeights(loadNet(FROZEN_FILE),frozenGuard);
 const protectedAfter=git(['status','--porcelain','--',...PROTECTED]);
 const protectedSame=protectedAfter===protectedBefore;
 if(!intact)gaps.push('凍結 A 的檔案或權重變了。');
 if(!protectedSame)gaps.push('先前輪次的權重或報告被改動。');
 let judgment=judgeRound6(lines.map(line=>line.judgment||{kind:'incomplete'}));
 if(!intact||!protectedSame){
  judgment={...judgment,complete:false,candidates:[],reason:'基準或先前輪次的檔案變了，這份結果不作數。'};
 }
 const trainingComplete=lines.length===ROUND6_LINES&&lines.every(line=>line.completed)&&intact&&protectedSame;
 const monitor=trainingComplete?summarizeMonitor(lines.flatMap(line=>line.batches)):null;
 for(const line of lines)delete line.actor;
 const summary={
  createdAt:new Date().toISOString(),round:6,codeCommit,baseline,baselineAfter,intact,
  frozenTheta:thetaHash(frozenGuard),
  probes,plan,trainingComplete,monitor,historicalEpochs:historicalEpochs(),
  lines,judgment,
  monitorAnswer:answerRound6Monitor({trainingComplete,monitor}),
  linesAnswer:answerRound6Lines({judgment,lines}),
  confirmAnswer:answerRound6Confirm({judgment}),
  resourceGap:gaps.join(' '),
  elapsedMs:performance.now()-started,
  anomalies:addAnomalies(compacts)
 };
 summary.anomalies.unfinished=lines.reduce((sum,line)=>sum+(line.unfinished?.length||0)+(line.evalUnfinished?.length||0),0);
 if(!REPORT_JSON.endsWith('nn-round6.json')||!REPORT_MD.endsWith('NN-ROUND6.md'))throw Error('refusing to write outside round 6');
 const markdown=renderRound6(summary);
 writeFileSync(REPORT_JSON,JSON.stringify(summary,null,2));
 writeFileSync(REPORT_MD,markdown);
 console.log(markdown);
 console.log('wrote',REPORT_MD);
 console.log('total',Math.round(summary.elapsedMs),'ms');
 if(!intact||!protectedSame||!separated)process.exitCode=1;
}

async function trainLine({line,frozen,plan,workers,v2Finished,started}){
 const lineStarted=performance.now();
 const actor=cloneNet(frozen);
 actor.version='nn-ppo-actor-r6-l'+line;
 const critic=createCritic(ROUND6_CRITIC_SEEDS[line]);
 critic.version='nn-critic-r6-l'+line;
 const {state,actions}=probeActions();
 const fresh=greedyFromActor(frozen,state,actions,actions);
 const copy=greedyFromActor(actor,state,actions,actions);
 if(!sameWeights(actor,frozen)||fresh.index!==copy.index)throw Error('line '+line+' left frozen A before any update');
 for(let index=0;index<fresh.scores.length;index++){
  if(!Object.is(fresh.scores[index],copy.scores[index]))throw Error('line '+line+' scores left frozen A');
 }
 const zeroTheta=thetaHash(actor);
 if(zeroTheta!==thetaHash(frozen))throw Error('line '+line+' theta hash left frozen A');
 const zeroFile=saveRound6(actor,line,'actor-after-0.json');
 saveRound6(critic,line,'critic-after-0.json');
 const actorOpt=createOptimizer(PPO_ACTOR_LR);
 const criticOpt=createOptimizer(PPO_CRITIC_LR);
 const stream=mulberry32(ROUND6_SHUFFLE_SEEDS[line]);
 const snapshots=[];
 const batches=[];
 const unfinished=[];
 const compacts=[];
 let steps=0,decisions=0,games=0,finished=0;
 const seeds=ROUND6_TRAIN_SEEDS[line];
 let stoppedEarly=false;
 for(let batchIndex=0;batchIndex<plan.batches;batchIndex++){
  if(performance.now()-started>=ROUND6_WALL_MS){
   stoppedEarly=true;
   break;
  }
  const kind=round4Opponent(batchIndex,{v2Finished,snapshots});
  if(plan.kinds[batchIndex]!==kind)throw Error('batch opponent left the locked schedule');
  const behavior=cloneNet(actor);
  behavior.version='r6-l'+line+'-b'+batchIndex+'@'+actor.updates;
  const behaviorCritic=cloneNet(critic);
  const lagged=snapshots.length>=2?snapshots[snapshots.length-2]:null;
  const items=[];
  for(let gameIndex=0;gameIndex<PPO_BATCH_GAMES;gameIndex++){
   const global=batchIndex*PPO_BATCH_GAMES+gameIndex;
   const seed=assertExperimentSeed(seeds[global],'round6-train');
   const learnerSeat=Math.floor(gameIndex/2)%2;
   const layout=batchLayout(kind,learnerSeat,behavior,lagged);
   items.push(job({
    seed,first:gameIndex%2,mode:'train',learnerSeat:layout.learnerSeat,
    recordSeats:layout.recordSeats,teacherSeats:[],progress:false,
    behaviorVersion:behavior.version,behaviorUpdates:behavior.updates,
    exploreSeed:(seed*17+global)>>>0,opponentKind:kind,seats:layout.seats
   },layout.nets,[behaviorCritic,behaviorCritic]));
  }
  console.log('line',line,'batch',batchIndex,kind);
  const played=await playMany(items,workers);
  const fingerprint=sampleFingerprint(played);
  const split=splitOutcomes(played);
  games+=played.length;
  finished+=split.done.length;
  unfinished.push(...split.unfinished);
  for(const game of played){
   steps+=game.steps||0;
   decisions+=game.decisions||0;
   compacts.push(compactGame(game));
  }
  const samples=split.done.flatMap(game=>game.ppo||[]);
  for(const game of played)game.ppo=[];
  let updated=null;
  let normalized={zeroVariance:null};
  if(samples.length){
   const raw=fixedAdvantages(samples);
   normalized=normalizeAdvantages(raw);
   samples.forEach((sample,index)=>{
    sample.rawAdvantage=raw[index];
    sample.advantage=normalized.advantages[index];
   });
   assertOnPolicy(samples,behavior);
   updated=ppoUpdate({
    actor,actorOpt,critic,criticOpt,behavior,samples,
    config:{rng:stream,epochs:PPO_EPOCHS,clip:PPO_CLIP,entropy:PPO_ENTROPY,klLimit:PPO_KL_LIMIT}
   });
  }
  const classified=classifyMonitor(updated?.rows||[],PPO_KL_LIMIT,updated?.epochs||0,updated?.stopped||false);
  if(updated?.stopped&&classified.fixedEpoch!==updated.epochs)throw Error('stop epoch left the fixed-actor KL');
  if(updated&&!updated.stopped&&classified.fixedEpoch!=null)throw Error('fixed KL exceeded without stopping');
  snapshots.push(cloneNet(actor));
  const gamesPlayed=(batchIndex+1)*PPO_BATCH_GAMES;
  const actorFile=saveRound6(actor,line,'actor-after-'+gamesPlayed+'.json');
  const criticFile=saveRound6(critic,line,'critic-after-'+gamesPlayed+'.json');
  batches.push({
   batch:batchIndex,gamesPlayed,kind,samples:samples.length,
   steps:played.reduce((sum,game)=>sum+(game.steps||0),0),
   decisions:played.reduce((sum,game)=>sum+(game.decisions||0),0),
   finished:split.done.length,unfinished:split.unfinished.length,
   fingerprint,zeroVariance:normalized.zeroVariance,
   behavior:{version:behavior.version,updates:behavior.updates,hash:thetaHash(behavior)},
   criticHash:thetaHash(behaviorCritic),
   opponent:{
    kind,laggedHash:lagged?thetaHash(lagged):null,
    laggedGames:lagged?(batchIndex-1)*PPO_BATCH_GAMES:null
   },
   epochsRan:classified.epochsRan,stopped:classified.stopped,
   reason:samples.length?(classified.stopped?'fixed-kl':'epoch-cap'):'no-samples',
   relation:classified.relation,mixedEpoch:classified.mixedEpoch,fixedEpoch:classified.fixedEpoch,
   limit:PPO_KL_LIMIT,rows:(updated?.rows||[]).map(slimRow),
   distance:netDistance(frozen,actor),
   actorUpdates:actor.updates-frozen.updates,criticUpdates:critic.updates,
   actorFile,criticFile
  });
  console.log('line',line,'games',gamesPlayed,'epochs',classified.epochsRan,classified.relation);
 }
 const endpointFile=WEIGHT_ROOT+'/line-'+line+'/actor-after-'+plan.gamesPerLine+'.json';
 const record={
  line,zeroTheta,criticSeed:ROUND6_CRITIC_SEEDS[line],shuffleSeed:ROUND6_SHUFFLE_SEEDS[line],
  trainStart:seeds[0],trainEnd:seeds[plan.gamesPerLine-1],
  plannedBatches:plan.batches,ranBatches:batches.length,completed:batches.length===plan.batches&&!stoppedEarly,
  games,finished,steps,decisions,unfinished,batches,
  actorUpdates:actor.updates-frozen.updates,criticUpdates:critic.updates,
  distance:netDistance(frozen,actor),
  zeroFile,endpoint:{
   version:actor.version,updates:actor.updates,thetaHash:thetaHash(actor),
   fileHash:recordFile(endpointFile),distance:netDistance(frozen,actor)
  },
  elapsedMs:performance.now()-lineStarted,
  anomalies:addAnomalies(compacts)
 };
 record.anomalies.unfinished=unfinished.length;
 return {record,actor,compacts};
}
function recordFile(file){
 try{
  return fileHash(file);
 }catch{
  return null;
 }
}
async function evaluate(actor,frozen,workers){
 const items=[];
 for(const seed of ROUND6_DEV_SEEDS){
  for(const cell of EVAL_CELLS){
   const seats=[nnSeat('greedy'),nnSeat('greedy')];
   const nets=[frozen,frozen];
   nets[cell.learnerSeat]=actor;
   items.push(job({
    seed:assertExperimentSeed(seed,'round6-dev'),first:cell.first,mode:'eval',
    learnerSeat:cell.learnerSeat,keepActions:false,recordSeats:[],teacherSeats:[],
    progress:false,seats
   },nets,[null,null]));
  }
 }
 const played=await playMany(items,workers);
 const fingerprint=sampleFingerprint(played);
 const split=splitOutcomes(played);
 const compacts=played.map(compactGame);
 const summary=seedSummary(split.done,learnerWins);
 const versusHalf=pairedDelta(summary.rows.map(row=>({seed:row.seed,p:0.5})),summary.rows);
 const done=new Set(split.done);
 const byKey=new Map(played.map(game=>[game.seed+':'+game.learnerSeat+':'+game.first,game]));
 const perSeed=ROUND6_DEV_SEEDS.map(seed=>{
  const cells=EVAL_CELLS.map(cell=>{
   const game=byKey.get(seed+':'+cell.learnerSeat+':'+cell.first)||null;
   const ok=game&&done.has(game);
   return {
    learnerSeat:cell.learnerSeat,first:cell.first,
    mark:ok?(game.winner===game.learnerSeat?'勝':'敗'):'未完成',
    status:game?.status||'missing',winner:game?.winner??null
   };
  });
  const row=summary.rows.find(item=>item.seed===seed)||null;
  return {seed,p:row?.p??null,n:row?.n??0,unfinished:row?.unfinished??cells.filter(cell=>cell.mark==='未完成').length,cells};
 });
 const games=played.map(game=>({
  seed:game.seed,first:game.first,learnerSeat:game.learnerSeat,status:game.status,
  winner:game.winner,steps:game.steps,decisions:game.decisions
 }));
 const anomalies=addAnomalies(compacts);
 anomalies.unfinished=split.unfinished.length;
 return {
  summary,versusHalf,perSeed,evalGames:games,evalFingerprint:fingerprint,anomalies,
  unfinishedEvalNote:null,evalUnfinished:split.unfinished,finishedGames:split.done.length,
  first:seedSummary(split.done.filter(game=>(game.learnerSeat===game.first)===true),learnerWins),
  second:seedSummary(split.done.filter(game=>(game.learnerSeat===game.first)===false),learnerWins),
  seat0:seedSummary(split.done.filter(game=>game.learnerSeat===0),learnerWins),
  seat1:seedSummary(split.done.filter(game=>game.learnerSeat===1),learnerWins),
  completeSeeds:summary.rows.filter(row=>row.n===EVAL_CELLS.length&&row.unfinished===0).length,
  compacts
 };
}

main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
