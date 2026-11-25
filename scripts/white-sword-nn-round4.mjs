#!/usr/bin/env node
// Round-4 Actor–Critic PPO trial. Does not train v2 and does not deploy.
import {mkdirSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {planRound4,round4Opponent} from '../training/white-sword-nn/budget.mjs';
import {seedSummary,selectCheckpoint} from '../training/white-sword-nn/cluster.mjs';
import {
 BENCH_V2_MS,CRITIC_INIT_SEED,GAMMA,MEMORY_WORKER_RSS,PPO_ACTOR_LR,PPO_BATCH_GAMES,PPO_CLIP,
 PPO_CRITIC_LR,PPO_ENTROPY,PPO_EPOCHS,PPO_KL_LIMIT,ROUND4_WALL_MS,WORKER_CAP
} from '../training/white-sword-nn/constants.mjs';
import {copiesMatch,evaluationSymmetry} from '../training/white-sword-nn/diagnose.mjs';
import {ACTION_DIM,STATE_DIM,joinFeatures} from '../training/white-sword-nn/encode.mjs';
import {addAnomalies,timingOf} from '../dist/universal-v2/white-sword-ai/stats.mjs';
import {
 cloneNet,createOptimizer,loadNet,netDistance,packNet,parameterCount,sameWeights,saveNet,scoreActions,unpackNet
} from '../training/white-sword-nn/net.mjs';
import {compactGame,playMatch} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {
 actorScores,assertOnPolicy,buildPpoSample,categorical,createCritic,criticStep,currentRatio,
 fixedAdvantages,greedyFromActor,normalizeAdvantages,ppoUpdate,splitOutcomes
} from '../training/white-sword-nn/ppo.mjs';
import {
 BENCH_NN_SEED,BENCH_V2_SEED,EVAL_CELLS,ROUND4_CONFIRM_SEEDS,ROUND4_DEV_SEEDS,ROUND4_SELF_SEEDS,
 assertExperimentSeed
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerConfirmation,answerRegression,answerSeparation,judgePpoRegression,judgeSurpass,renderRound4
} from '../training/white-sword-nn/report.mjs';

const WEIGHT_DIR='training/white-sword-nn/weights/round4';
const FROZEN_FILE='training/white-sword-nn/weights/round2/a-frozen.json';
const REPORT_JSON='docs/white-sword-ai/nn-round4.json';
const REPORT_MD='docs/white-sword-ai/NN-ROUND4.md';

function saveRound4(net,name){
 const file=WEIGHT_DIR+'/'+name;
 if(!file.includes('/round4/'))throw Error('refusing to write outside round 4');
 saveNet(net,file);
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
function learnerWins(game){
 return game.learnerSeat;
}
function sideSummary(games,learnerFirst){
 return seedSummary((games||[]).filter(game=>(game.learnerSeat===game.first)===learnerFirst),learnerWins);
}
function release(game,timings,compacts){
 timings.push(...(game.decisionMs||[]));
 const compact=compactGame(game);
 game.decisionMs=[];
 game.publicHistory=[];
 compacts.push(compact);
 return compact;
}
function scoredPoint(gamesPlayed,games,extra){
 const split=splitOutcomes(games);
 return {
  gamesPlayed,
  summary:seedSummary(split.done,learnerWins),
  first:sideSummary(split.done,true),
  second:sideSummary(split.done,false),
  unfinished:split.unfinished,
  ...extra
 };
}
function meanOf(rows,key){
 const values=(rows||[]).map(row=>row[key]).filter(Number.isFinite);
 if(!values.length)return null;
 return values.reduce((sum,value)=>sum+value,0)/values.length;
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

async function main(){
 const command=process.argv[2]||'trial';
 if(command!=='trial')throw Error('Use trial');
 const started=performance.now();
 const timings=[];
 const compacts=[];
 const gaps=[];
 const frozen=loadNet(FROZEN_FILE);
 const frozenGuard=cloneNet(frozen);
 const actor=cloneNet(frozen);
 actor.version='nn-ppo-actor-r4';
 const critic=createCritic(CRITIC_INIT_SEED);
 const {state,actions}=probeActions();
 const copy=copiesMatch(frozen,actor,[actions.map(action=>joinFeatures(state,action))])&&sameWeights(frozen,actor);
 const greedySame=greedyFromActor(frozen,state,actions,actions).index===greedyFromActor(actor,state,actions,actions).index;
 const isolated=cloneNet(actor);
 const isolatedBefore=cloneNet(isolated);
 const throwaway=createCritic(CRITIC_INIT_SEED);
 const throwawayOpt=createOptimizer(PPO_CRITIC_LR);
 for(let step=0;step<4;step++)criticStep(throwaway,throwawayOpt,state,step%2?1:-1);
 const criticIsolated=sameWeights(isolated,isolatedBefore)&&isolated.updates===isolatedBefore.updates;
 const scoreLeft=actorScores(actor,state,actions);
 const scoreRight=scoreActions(actor,state,actions);
 let valueNotInScores=scoreLeft.length===scoreRight.length;
 for(let index=0;index<scoreLeft.length;index++)if(!Object.is(scoreLeft[index],scoreRight[index]))valueNotInScores=false;
 const huge=createCritic(CRITIC_INIT_SEED);
 huge.theta.fill(5);
 const untouched=actorScores(actor,state,actions);
 for(let index=0;index<untouched.length;index++)if(!Object.is(untouched[index],scoreLeft[index]))valueNotInScores=false;
 const ratioSample=buildPpoSample({
  state,actions:actions.slice(0,2),chosen:0,
  logProbs:categorical(Array.from(scoreActions(actor,state,actions.slice(0,2)))).logProbs,
  value:0,behaviorVersion:actor.version,behaviorUpdates:actor.updates,seat:0,index:0
 });
 const ratioAtOne=Math.abs(currentRatio(actor,ratioSample)-1)<1e-6;
 console.log('separation',{copy,greedySame,criticIsolated,valueNotInScores,ratioAtOne});

 console.log('measuring one softmax rollout');
 const benchActor=cloneNet(actor);
 benchActor.version='bench@'+benchActor.updates;
 const benchCritic=cloneNet(critic);
 const rollout=playMatch({
  seed:assertExperimentSeed(BENCH_NN_SEED,'bench'),first:0,mode:'train',budgetMs:BENCH_V2_MS,progress:true,
  behaviorVersion:benchActor.version,behaviorUpdates:benchActor.updates,
  seats:[nnSeat('softmax'),nnSeat('softmax')],
  nets:[benchActor,cloneNet(benchActor)],critics:[benchCritic,benchCritic],
  recordSeats:[0,1],teacherSeats:[]
 });
 release(rollout,timings,compacts);
 console.log('rollout',rollout.status,rollout.steps,Math.round(rollout.ms));
 console.log('measuring one greedy evaluation');
 const evalGame=playMatch({
  seed:assertExperimentSeed(BENCH_NN_SEED,'bench'),first:1,mode:'eval',budgetMs:BENCH_V2_MS,progress:true,
  seats:[nnSeat('greedy'),nnSeat('greedy')],
  nets:[benchActor,cloneNet(benchActor)],recordSeats:[],teacherSeats:[]
 });
 release(evalGame,timings,compacts);
 console.log('eval',evalGame.status,evalGame.steps,Math.round(evalGame.ms));
 console.log('measuring one network game against official v2');
 const v2Game=playMatch({
  seed:assertExperimentSeed(BENCH_V2_SEED,'bench'),first:0,mode:'train',budgetMs:BENCH_V2_MS,progress:true,
  behaviorVersion:benchActor.version,behaviorUpdates:benchActor.updates,learnerSeat:0,
  seats:[nnSeat('softmax'),{deckId:'white-sword',kind:'v2',explore:0}],
  nets:[benchActor,null],critics:[benchCritic,null],recordSeats:[0],teacherSeats:[]
 });
 release(v2Game,timings,compacts);
 console.log('v2',v2Game.status,v2Game.steps,Math.round(v2Game.ms));
 const updateSamples=(rollout.ppo||[]).slice();
 for(const sample of updateSamples)sample.advantage=0;
 let updateMs=0;
 if(updateSamples.length){
  const timerActor=cloneNet(benchActor);
  const timerCritic=cloneNet(benchCritic);
  const updateStarted=performance.now();
  ppoUpdate({
   actor:timerActor,actorOpt:createOptimizer(PPO_ACTOR_LR),
   critic:timerCritic,criticOpt:createOptimizer(PPO_CRITIC_LR),
   behavior:benchActor,samples:updateSamples,
   config:{rng:mulberry32(CRITIC_INIT_SEED),epochs:PPO_EPOCHS,clip:PPO_CLIP,entropy:PPO_ENTROPY,klLimit:Infinity}
  });
  updateMs=(performance.now()-updateStarted)*PPO_BATCH_GAMES;
 }
 if(!sameWeights(actor,frozenGuard))throw Error('timing updated the training actor');
 const rss=memoryUsage().rss;
 const workers=rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
 const v2Finished=v2Game.status==='finished'&&!v2Game.anomalies.unfinished&&!v2Game.anomalies.engineError;
 const rolloutFinished=rollout.status==='finished'&&rollout.ppo.length>0;
 const elapsed=performance.now()-started;
 const plan=planRound4({
  wallMs:Math.max(0,ROUND4_WALL_MS-elapsed),
  rolloutMs:rollout.ms,evalMs:evalGame.ms,v2Ms:v2Game.ms,updateMs,
  v2Finished,workers
 });
 console.log('plan',plan.batches,'batches',plan.games,'games',Math.round(plan.estimatedMs),'ms',plan.kinds.join(','));
 const bench={
  rollout:compacts[0],eval:compacts[1],v2:compacts[2],v2Finished,rolloutFinished,
  updateMs,rssMb:Math.round(rss/1024/1024),workers
 };
 const checks={
  copy:copy&&greedySame,criticIsolated,valueNotInScores,ratioAtOne,symmetry:null
 };
 const summary={
  createdAt:new Date().toISOString(),round:4,
  gamma:GAMMA,actorLr:PPO_ACTOR_LR,criticLr:PPO_CRITIC_LR,clip:PPO_CLIP,epochs:PPO_EPOCHS,
  entropy:PPO_ENTROPY,klLimit:PPO_KL_LIMIT,batchGames:PPO_BATCH_GAMES,
  parameters:{actor:parameterCount(actor),critic:parameterCount(critic)},
  bench,plan,checks,curve:[],train:{
   steps:0,decisions:0,games:0,finished:0,unfinished:[],actorUpdates:0,criticUpdates:0,batches:[]
  },
  evalUnfinished:[],selected:null,endpoint:null,regression:null,confirm:{ran:false,reason:''},
  anomalies:null,resourceGap:''
 };
 const overWall=()=>performance.now()-started>=ROUND4_WALL_MS;
 const devSeeds=ROUND4_DEV_SEEDS.slice(0,plan.devSeeds);
 const confirmSeeds=ROUND4_CONFIRM_SEEDS.slice(0,plan.confirmSeeds);
 async function evaluate(learner,seeds,role,keepActions){
  const items=[];
  for(const seed of seeds){
   for(const cell of EVAL_CELLS){
    const seats=[nnSeat('greedy'),nnSeat('greedy')];
    const nets=[frozen,frozen];
    nets[cell.learnerSeat]=learner;
    items.push(job({
     seed:assertExperimentSeed(seed,role),first:cell.first,mode:'eval',learnerSeat:cell.learnerSeat,
     keepActions:!!keepActions,recordSeats:[],teacherSeats:[],progress:false,seats
    },nets,[null,null]));
   }
  }
  const games=await playMany(items,workers);
  for(const game of games)release(game,timings,compacts);
  return games;
 }
 let actorOpt=null;
 let criticOpt=null;
 const stream=mulberry32(CRITIC_INIT_SEED+17);
 const snapshots=[];
 try{
  if(!checks.copy||!checks.criticIsolated||!checks.valueNotInScores||!checks.ratioAtOne){
   gaps.push('分離檢查沒有成立，沒有開始試訓。');
  }else if(!rolloutFinished){
   gaps.push('softmax rollout 沒有正常結束，沒有用它的勝率，也沒有開始試訓。');
  }else if(!plan.fits){
   gaps.push('測速之後的牆鐘裝不下事先登記的檢查，沒有開始試訓。');
  }else if(overWall()){
   gaps.push('測速已經用完牆鐘，沒有開始試訓。');
  }else{
   console.log('checkpoint 0');
   const zeroGames=await evaluate(actor,devSeeds,'round4-dev',true);
   const symmetryGames=zeroGames.map(game=>({
    seed:game.seed,first:game.first,learnerSeat:game.learnerSeat,winner:game.winner,actions:game.actions
   }));
   checks.symmetry=evaluationSymmetry(symmetryGames);
   for(const game of zeroGames)game.actions=[];
   const zeroPoint=scoredPoint(0,zeroGames,{
    actorObjective:null,criticMse:null,kl:null,entropy:null,clippedRate:null,klStopped:false,
    actorUpdates:0,criticUpdates:0,distance:netDistance(frozen,actor)
   });
   summary.curve.push(zeroPoint);
   summary.evalUnfinished.push(...zeroPoint.unfinished);
   saveRound4(actor,'actor-after-0.json');
   saveRound4(critic,'critic-after-0.json');
   console.log('symmetry',checks.symmetry.ok,'mean',zeroPoint.summary.mean);
   if(!checks.symmetry.ok){
    gaps.push('0 次更新的對稱檢查沒有成立，沒有開始試訓。');
   }else{
    actorOpt=createOptimizer(PPO_ACTOR_LR);
    criticOpt=createOptimizer(PPO_CRITIC_LR);
    for(let batchIndex=0;batchIndex<plan.batches;batchIndex++){
     if(overWall()){
      gaps.push('牆鐘到了，沒有開下一批，也沒有因為勝率加場。');
      break;
     }
     const kind=round4Opponent(batchIndex,{v2Finished,snapshots});
     if(plan.kinds[batchIndex]!==kind)throw Error('batch opponent left the locked schedule');
     const behavior=cloneNet(actor);
     behavior.version='ppo-b'+batchIndex+'@'+actor.updates;
     const behaviorCritic=cloneNet(critic);
     const lagged=snapshots.length>=2?snapshots[snapshots.length-2]:null;
     const items=[];
     for(let gameIndex=0;gameIndex<PPO_BATCH_GAMES;gameIndex++){
      const global=batchIndex*PPO_BATCH_GAMES+gameIndex;
      const seed=assertExperimentSeed(ROUND4_SELF_SEEDS[global],'round4-train');
      const learnerSeat=Math.floor(gameIndex/2)%2;
      const layout=batchLayout(kind,learnerSeat,behavior,lagged);
      items.push(job({
       seed,first:gameIndex%2,mode:'train',learnerSeat:layout.learnerSeat,
       recordSeats:layout.recordSeats,teacherSeats:[],progress:false,
       behaviorVersion:behavior.version,behaviorUpdates:behavior.updates,
       exploreSeed:(seed*17+global)>>>0,opponentKind:kind,seats:layout.seats
      },layout.nets,[behaviorCritic,behaviorCritic]));
     }
     console.log('batch',batchIndex,kind);
     const games=await playMany(items,workers);
     const split=splitOutcomes(games);
     summary.train.games+=games.length;
     summary.train.finished+=split.done.length;
     summary.train.unfinished.push(...split.unfinished);
     for(const game of games){
      summary.train.steps+=game.steps||0;
      summary.train.decisions+=game.decisions||0;
      release(game,timings,compacts);
     }
     const samples=split.done.flatMap(game=>game.ppo||[]);
     for(const game of games)game.ppo=[];
     let stats={actorObjective:null,criticMse:null,kl:null,entropy:null,clippedRate:null,klStopped:false,epochs:0};
     if(samples.length){
      const raw=fixedAdvantages(samples);
      const normalized=normalizeAdvantages(raw);
      samples.forEach((sample,index)=>{
       sample.rawAdvantage=raw[index];
       sample.advantage=normalized.advantages[index];
      });
      assertOnPolicy(samples,behavior);
      const updated=ppoUpdate({
       actor,actorOpt,critic,criticOpt,behavior,samples,
       config:{rng:stream,epochs:PPO_EPOCHS,clip:PPO_CLIP,entropy:PPO_ENTROPY,klLimit:PPO_KL_LIMIT}
      });
      stats={
       actorObjective:meanOf(updated.rows,'actorObjective'),
       criticMse:meanOf(updated.rows,'criticMse'),
       kl:meanOf(updated.rows,'kl'),
       entropy:meanOf(updated.rows,'entropy'),
       clippedRate:meanOf(updated.rows,'clippedRate'),
       klStopped:updated.stopped,epochs:updated.epochs,
       zeroVariance:normalized.zeroVariance
      };
     }
     snapshots.push(cloneNet(actor));
     summary.train.batches.push({batch:batchIndex,kind,samples:samples.length,...stats});
     summary.train.actorUpdates=actor.updates-frozen.updates;
     summary.train.criticUpdates=critic.updates;
     const gamesPlayed=(batchIndex+1)*PPO_BATCH_GAMES;
     if(overWall()){
      gaps.push('第 '+gamesPlayed+' 場更新後牆鐘已到，沒有再打開發對局。');
      break;
     }
     console.log('checkpoint',gamesPlayed);
     const played=await evaluate(actor,devSeeds,'round4-dev',false);
     const point=scoredPoint(gamesPlayed,played,{
      ...stats,actorUpdates:summary.train.actorUpdates,criticUpdates:summary.train.criticUpdates,
      distance:netDistance(frozen,actor)
     });
     summary.curve.push(point);
     summary.evalUnfinished.push(...point.unfinished);
     saveRound4(actor,'actor-after-'+gamesPlayed+'.json');
     saveRound4(critic,'critic-after-'+gamesPlayed+'.json');
     console.log('mean',point.summary.mean,'kl',stats.kl);
    }
   }
  }
  const zero=summary.curve.find(point=>point.gamesPlayed===0)||null;
  const endpoint=summary.curve.length?summary.curve[summary.curve.length-1]:null;
  const selected=selectCheckpoint(summary.curve.map(point=>({...point,gamesPlayed:point.gamesPlayed})));
  summary.endpoint=endpoint;
  summary.endpointFirst=endpoint?.first||null;
  summary.endpointSecond=endpoint?.second||null;
  summary.regression=endpoint&&zero?judgePpoRegression(endpoint,zero.summary.rows):{kind:'incomplete',reason:'沒有終點'};
  if(selected){
   summary.selected={
    gamesPlayed:selected.gamesPlayed,summary:selected.summary,
    surpass:zero?judgeSurpass(selected,zero.summary.rows):{ok:false,reason:'沒有 0 次更新的對照'}
   };
  }
  if(!plan.fits)summary.confirm.reason='牆鐘沒有留下試訓額度。';
  else if(!checks.symmetry?.ok)summary.confirm.reason='對稱檢查沒有成立。';
  else if(!summary.selected?.surpass?.ok)summary.confirm.reason='被選中的檢查點沒有達到確認門檻。';
  else if(overWall())summary.confirm.reason='確認對局會超過牆鐘，沒有加時。';
  else{
   const chosen=summary.curve.find(point=>point.gamesPlayed===summary.selected.gamesPlayed);
   const chosenActor=chosen?.gamesPlayed===0?cloneNet(frozen):loadNet(WEIGHT_DIR+'/actor-after-'+chosen.gamesPlayed+'.json');
   summary.confirm.ran=true;
   summary.confirm.gamesPlayed=chosen.gamesPlayed;
   const games=await evaluate(chosenActor,confirmSeeds,'round4-confirm',false);
   const point=scoredPoint(chosen.gamesPlayed,games,{});
   summary.confirm.summary=point.summary;
   summary.confirm.unfinished=point.unfinished;
   summary.evalUnfinished.push(...point.unfinished);
  }
 }catch(error){
  gaps.push(String(error?.message||error));
  console.error(error);
  process.exitCode=1;
 }
 if(!sameWeights(frozen,frozenGuard)||!sameWeights(loadNet(FROZEN_FILE),frozenGuard)){
  gaps.push('凍結 A 被改動。');
 }
 summary.anomalies=addAnomalies(compacts);
 summary.anomalies.unfinished=summary.train.unfinished.length+summary.evalUnfinished.length;
 summary.decisionTiming=timingOf(timings);
 summary.elapsedMs=performance.now()-started;
 summary.resourceGap=gaps.join(' ');
 summary.separation=answerSeparation(summary.checks);
 summary.regressionAnswer=answerRegression(summary);
 summary.confirmationAnswer=answerConfirmation(summary);
 mkdirSync('docs/white-sword-ai',{recursive:true});
 mkdirSync(WEIGHT_DIR,{recursive:true});
 const markdown=renderRound4(summary);
 writeFileSync(REPORT_JSON,JSON.stringify(summary,null,2));
 writeFileSync(REPORT_MD,markdown);
 console.log(markdown);
 console.log('wrote',REPORT_MD);
 console.log('total',Math.round(summary.elapsedMs),'ms');
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
