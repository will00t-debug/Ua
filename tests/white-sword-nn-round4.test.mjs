import assert from 'node:assert/strict';
import test from 'node:test';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {planRound4,round4Opponent} from '../training/white-sword-nn/budget.mjs';
import {pairedDelta} from '../training/white-sword-nn/cluster.mjs';
import {
 CRITIC_INIT_SEED,PPO_ACTOR_LR,PPO_BATCH_GAMES,PPO_CLIP,PPO_CRITIC_LR,PPO_ENTROPY,PPO_EPOCHS,
 PPO_KL_LIMIT,PPO_MAX_BATCHES
} from '../training/white-sword-nn/constants.mjs';
import {ACTION_DIM,STATE_DIM,encodeState,joinFeatures,sameVector} from '../training/white-sword-nn/encode.mjs';
import {assignReturns} from '../training/white-sword-nn/learn.mjs';
import {cloneNet,createNet,createOptimizer,forwardTrain,loadNet,sameWeights,scoreActions} from '../training/white-sword-nn/net.mjs';
import {playMatch} from '../training/white-sword-nn/play.mjs';
import {
 actorPpoStep,actorScores,assertModelInput,assertOnPolicy,behaviorKl,buildPpoSample,categorical,
 createCritic,criticStep,currentRatio,fixedAdvantages,greedyFromActor,normalizeAdvantages,policyLossGrad,
 ppoUpdate,sampleCategorical,splitOutcomes
} from '../training/white-sword-nn/ppo.mjs';
import {
 ROUND3_CONFIRM_SEEDS,ROUND4_CONFIRM_SEEDS,ROUND4_DEV_SEEDS,ROUND4_SELF_SEEDS,allExperimentSeeds,
 assertExperimentSeed
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerConfirmation,answerRegression,answerSeparation,judgePpoRegression,judgeSurpass,renderRound4
} from '../training/white-sword-nn/report.mjs';

function rngOf(seed){
 let state=seed>>>0;
 return ()=>{
  state=state+0x6D2B79F5|0;
  let t=Math.imul(state^state>>>15,1|state);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
function blankState(){
 const state=Array(STATE_DIM).fill(0);
 state[0]=1;
 return state;
}
function twoActions(){
 const state=blankState();
 const actions=[0,1].map(index=>{
  const action=Array(ACTION_DIM).fill(0);
  action[0]=1;
  action[1+index]=1;
  return action;
 });
 return {state,actions};
}
function responsiveActor(version='dir'){
 const actor=createNet(4,{version});
 actor.theta.fill(0);
 actor.updates=3;
 const first=actor.layers[0];
 actor.theta[first.weight+(STATE_DIM+1)]=1;
 actor.theta[first.weight+first.input+(STATE_DIM+2)]=1;
 const second=actor.layers[1];
 actor.theta[second.weight]=1;
 actor.theta[second.weight+second.input+1]=1;
 return actor;
}
function sampleFrom(actor,chosen,advantage){
 const {state,actions}=twoActions();
 const dist=categorical(Array.from(scoreActions(actor,state,actions)));
 return {
  source:'ppo',index:0,seat:0,state,actions,chosen,
  oldLogProb:dist.logProbs[chosen],oldLogProbs:dist.logProbs.slice(),
  value:0,target:advantage>=0?1:-1,advantage,
  behaviorVersion:actor.version,behaviorUpdates:actor.updates
 };
}
function probability(actor,chosen){
 const {state,actions}=twoActions();
 return categorical(Array.from(scoreActions(actor,state,actions))).probs[chosen];
}
function rowsOf(mean,seeds=8){
 return Array.from({length:seeds},(_,index)=>({seed:index+1,p:mean}));
}

test('round-4 seeds stay off the dev block and off earlier confirmation',()=>{
 const all=allExperimentSeeds();
 assert.equal(new Set(all).size,all.length);
 assert.equal(ROUND4_SELF_SEEDS.length,PPO_MAX_BATCHES*PPO_BATCH_GAMES);
 assert.equal(ROUND4_CONFIRM_SEEDS.length,12);
 for(const seed of ROUND4_SELF_SEEDS)assertExperimentSeed(seed,'round4-train');
 for(const seed of ROUND4_DEV_SEEDS){
  assertExperimentSeed(seed,'round4-dev');
  assert.throws(()=>assertExperimentSeed(seed,'round4-confirm'));
  assert.throws(()=>assertExperimentSeed(seed,'round4-train'));
 }
 for(const seed of ROUND4_CONFIRM_SEEDS){
  assertExperimentSeed(seed,'round4-confirm');
  assert.throws(()=>assertExperimentSeed(seed,'round4-dev'));
  assert.throws(()=>assertExperimentSeed(seed,'round4-train'));
 }
 assert.throws(()=>assertExperimentSeed(CRITIC_INIT_SEED));
 assert.throws(()=>assertExperimentSeed(ROUND3_CONFIRM_SEEDS[0],'round4-confirm'));
 assert.equal(ROUND4_SELF_SEEDS.some(seed=>ROUND4_DEV_SEEDS.includes(seed)||ROUND4_CONFIRM_SEEDS.includes(seed)),false);
});

test('the round-4 budget is locked from time and is not the old 32-game cap',()=>{
 const open=planRound4({
  wallMs:1e15,rolloutMs:1000,evalMs:1000,v2Ms:1000,updateMs:1000,v2Finished:true,workers:2
 });
 assert.equal(open.fits,true);
 assert.equal(open.batches,PPO_MAX_BATCHES);
 assert.equal(open.games,PPO_MAX_BATCHES*PPO_BATCH_GAMES);
 assert.notEqual(open.games,32);
 assert.equal(open.batchGames,PPO_BATCH_GAMES);
 assert.equal(open.devSeeds,12);
 assert.equal(open.confirmSeeds,12);
 assert.equal(open.checks[0],0);
 assert.equal(open.checks.at(-1),open.games);
 assert.equal(open.kinds[0],'self');
 assert.equal(open.kinds[1],'self');
 assert.equal(open.kinds[2],'v2');
 assert.ok(open.estimatedMs<open.wallMs);
 const blocked=planRound4({
  wallMs:1000,rolloutMs:5000,evalMs:5000,v2Ms:5000,updateMs:1000,v2Finished:true,workers:1
 });
 assert.equal(blocked.fits,false);
 assert.equal(blocked.games,0);
 assert.equal(blocked.batches,0);
 assert.equal(round4Opponent(1,{snapshots:[]}),'self');
 assert.equal(round4Opponent(1,{snapshots:[1,1]}),'snapshot');
 assert.equal(round4Opponent(2,{v2Finished:false,snapshots:[1,1]}),'self');
 assert.equal(round4Opponent(2,{v2Finished:true,snapshots:[1,1]}),'v2');
 const noV2=planRound4({
  wallMs:1e15,rolloutMs:1000,evalMs:1000,v2Ms:8000,updateMs:10,v2Finished:false,workers:2
 });
 assert.equal(noV2.kinds.includes('v2'),false);
});

test('legal probabilities sum to 1 and an illegal index is never drawn',()=>{
 const dist=categorical([1,3,0,-2]);
 const mass=dist.probs.reduce((sum,prob)=>sum+prob,0);
 assert.ok(Math.abs(mass-1)<1e-12);
 const rng=rngOf(11);
 for(let draw=0;draw<300;draw++){
  const index=sampleCategorical(dist.probs,rng);
  assert.equal(index>=0&&index<dist.probs.length,true);
 }
 assert.throws(()=>categorical([]));
});

test('the policy ratio is 1 before an update, and clip blocks a saturated step',()=>{
 const actor=responsiveActor();
 const sample=sampleFrom(actor,0,1);
 assert.ok(Math.abs(currentRatio(actor,sample)-1)<1e-12);
 assert.ok(Math.abs(probability(actor,0)-0.5)<1e-12);
 const before=cloneNet(actor);
 const step=actorPpoStep(actor,createOptimizer(0.05,0),sample,{clip:PPO_CLIP,entropy:0});
 assert.equal(step.clipped,false);
 assert.ok(probability(actor,0)>probability(before,0));
 const negative=responsiveActor('neg');
 const down=sampleFrom(negative,0,-1);
 const prior=probability(negative,0);
 actorPpoStep(negative,createOptimizer(0.05,0),down,{clip:PPO_CLIP,entropy:0});
 assert.ok(probability(negative,0)<prior);
 const peaked=responsiveActor('peak');
 peaked.theta[peaked.layers[2].weight]=1;
 const peakedSample=sampleFrom(peaked,0,0);
 const peakedBefore=probability(peaked,0);
 actorPpoStep(peaked,createOptimizer(0.2,0),peakedSample,{clip:0.2,entropy:0.05});
 assert.ok(probability(peaked,0)<peakedBefore);
 const clipActor=responsiveActor('clip');
 const clipSample=sampleFrom(clipActor,0,1);
 clipSample.oldLogProb-=5;
 const frozen=cloneNet(clipActor);
 const blocked=actorPpoStep(clipActor,createOptimizer(0.05,0),clipSample,{clip:0.2,entropy:0});
 assert.equal(blocked.clipped,true);
 assert.equal(sameWeights(clipActor,frozen),true);
});

test('a positive logit gradient agrees with the unclipped objective',()=>{
 const probs=categorical([0.2,-0.4]).probs;
 const advantage=0.7;
 const ratio=1;
 const epsilon=0.2;
 const grad=policyLossGrad(probs,0,advantage,ratio,epsilon,0);
 const objective=(z0,z1)=>{
  const dist=categorical([z0,z1]);
  const next=Math.exp(dist.logProbs[0]-Math.log(probs[0]));
  const clipped=Math.min(1+epsilon,Math.max(1-epsilon,next));
  return Math.min(next*advantage,clipped*advantage);
 };
 const epsilonStep=1e-5;
 const numeric=(objective(0.2+epsilonStep,-0.4)-objective(0.2-epsilonStep,-0.4))/(2*epsilonStep);
 assert.ok(Math.abs(numeric+grad[0])<1e-4);
 const entropy=policyLossGrad([0.9,0.1],0,0,1,0.2,0.1);
 assert.ok(entropy[0]>0&&entropy[1]<0);
});

test('critic updates do not change actor weights, scores, or the greedy action',()=>{
 const actor=createNet(6,{version:'actor'});
 const critic=createCritic(CRITIC_INIT_SEED);
 assert.notEqual(actor.theta,critic.theta);
 assert.notEqual(actor.sizes[0],critic.sizes[0]);
 const before=cloneNet(actor);
 const actorOpt=createOptimizer(PPO_ACTOR_LR);
 const criticOpt=createOptimizer(PPO_CRITIC_LR,0);
 const {state,actions}=twoActions();
 const prior=actorOpt.step;
 for(let step=0;step<6;step++)criticStep(critic,criticOpt,state,step%2?1:-1);
 assert.equal(sameWeights(actor,before),true);
 assert.equal(actor.updates,before.updates);
 assert.equal(actorOpt.step,prior);
 const left=greedyFromActor(actor,state,actions,actions);
 const right=greedyFromActor(before,state,actions,actions);
 assert.equal(left.index,right.index);
 for(let index=0;index<left.scores.length;index++)assert.equal(Object.is(left.scores[index],right.scores[index]),true);
 const raw=actorScores(actor,state,actions);
 for(let index=0;index<raw.length;index++)assert.equal(Object.is(raw[index],scoreActions(actor,state,actions)[index]),true);
 critic.theta.fill(4);
 const after=actorScores(actor,state,actions);
 for(let index=0;index<raw.length;index++)assert.equal(Object.is(raw[index],after[index]),true);
});

test('advantages are normalized inside the batch and zero variance stays zero',()=>{
 const flat=normalizeAdvantages([0.25,0.25,0.25]);
 assert.equal(flat.zeroVariance,true);
 assert.deepEqual(flat.advantages,[0,0,0]);
 assert.equal(normalizeAdvantages([0.4]).zeroVariance,true);
 const spread=normalizeAdvantages([1,3]);
 assert.equal(spread.zeroVariance,false);
 assert.ok(Math.abs(spread.advantages[0]+1/Math.sqrt(2))<1e-12);
 assert.ok(Math.abs(spread.advantages[1]-1/Math.sqrt(2))<1e-12);
 const returns=assignReturns([
  {seat:0,index:0,oldLogProb:-0.2,value:0.1,source:'ppo'}
 ],0,3,0.995);
 assert.equal(returns[0].oldLogProb,-0.2);
 assert.equal(returns[0].value,0.1);
 assert.ok(Math.abs(returns[0].target-0.995**2)<1e-12);
 const advantages=fixedAdvantages([{target:0.5,value:0.2},{target:-1,value:0.25}]);
 assert.deepEqual(advantages,[0.3,-1.25]);
});

test('stored behavior probabilities reject a later policy and a replay sample',()=>{
 const actor=responsiveActor('behavior');
 const behavior=cloneNet(actor);
 const sample=sampleFrom(behavior,0,1);
 assertOnPolicy([sample],behavior);
 assert.ok(Math.abs(behaviorKl(sample.oldLogProbs,sample.oldLogProbs))<1e-12);
 behavior.theta[behavior.layers[2].weight]+=0.5;
 assert.throws(()=>assertOnPolicy([sample],behavior));
 assert.throws(()=>assertOnPolicy([{...sample,source:'replay'}],actor));
 assert.throws(()=>assertModelInput({...sample,seed:191200}));
 const other=cloneNet(actor);
 other.version='other-batch';
 assert.throws(()=>assertOnPolicy([sample],other));
});

test('an on-policy update moves the actor and stops when KL exceeds the limit',()=>{
 const actor=responsiveActor('batch');
 const behavior=cloneNet(actor);
 const critic=createCritic(8);
 critic.theta.fill(0);
 const first=sampleFrom(behavior,0,1);
 const second=sampleFrom(behavior,1,-1);
 second.index=1;
 second.seat=1;
 for(const sample of [first,second])sample.target=sample.advantage;
 const actorBefore=cloneNet(actor);
 const result=ppoUpdate({
  actor,actorOpt:createOptimizer(0.05,0),critic,criticOpt:createOptimizer(0.05,0),behavior,
  samples:[first,second],
  config:{rng:rngOf(3),epochs:PPO_EPOCHS,clip:PPO_CLIP,entropy:0,klLimit:0}
 });
 assert.equal(result.stopped,true);
 assert.equal(result.epochs,1);
 assert.equal(sameWeights(actor,actorBefore),false);
 assert.equal(sameWeights(behavior,actorBefore),true);
 assert.equal(first.advantage,1);
 assert.equal(second.oldLogProb,sampleFrom(actorBefore,1,-1).oldLogProb);
 assert.ok(critic.updates>0);
});

test('model input excludes the opponent hand, hidden zones, seed, and uid text',()=>{
 const deck=getDeck('white-sword');
 const packs=[deck.pack,deck.pack];
 const state=newComparedMatch(packs,[deck.counts,deck.counts],191200,0,matchRules('official'));
 const view=observeActor(packs,state,0);
 const before=encodeState(view,0,[]);
 state.players[0].deck.reverse();
 state.players[1].life.reverse();
 const after=encodeState(observeActor(packs,state,0),0,[]);
 assert.equal(sameVector(before,after),true);
 const poisoned=observeActor(packs,state,0);
 poisoned.visible.players[1].hand=[{uid:'1-1',cardId:'BLC-2-067'}];
 assert.throws(()=>encodeState(poisoned,0,[]));
 const actor=responsiveActor('input');
 const sample=sampleFrom(actor,0,1);
 const inputs=assertModelInput(sample);
 assert.deepEqual(Object.keys(inputs),['state','actions']);
 assert.equal(inputs.state.length,STATE_DIM);
 assert.equal(inputs.actions[0].length,ACTION_DIM);
 assert.equal(JSON.stringify(inputs).includes('191200'),false);
 const scores=scoreActions(actor,sample.state,sample.actions);
 for(let index=0;index<scores.length;index++){
  const joined=forwardTrain(actor,joinFeatures(sample.state,sample.actions[index])).q;
  assert.ok(Math.abs(scores[index]-joined)<1e-8);
 }
});

test('an unfinished softmax game is not a result and does not keep samples',()=>{
 const actor=createNet(15,{version:'short'});
 const critic=createCritic(16);
 const spec={
  seed:191200,first:0,mode:'train',maxSteps:4,progress:false,
  behaviorVersion:'short@0',behaviorUpdates:actor.updates,
  seats:[
   {deckId:'white-sword',kind:'nn',explore:0,policy:'softmax'},
   {deckId:'white-sword',kind:'nn',explore:0,policy:'softmax'}
  ],
  nets:[actor,cloneNet(actor)],critics:[critic,cloneNet(critic)],
  recordSeats:[0,1],teacherSeats:[]
 };
 const game=playMatch(spec);
 assert.equal(game.anomalies.unfinished,1);
 assert.equal(game.anomalies.illegal,0);
 assert.equal(game.anomalies.leak,0);
 assert.equal(game.explored,0);
 assert.equal(game.ppo.length,0);
 const split=splitOutcomes([game,{status:'finished',winner:0,learnerSeat:1,anomalies:{illegal:0,unfinished:0}}]);
 assert.equal(split.unfinished.length,1);
 assert.equal(split.done.length,1);
 const mixed=playMatch({...spec,seats:[
  {deckId:'white-sword',kind:'nn',explore:0.12,policy:'softmax'},
  {deckId:'white-sword',kind:'nn',explore:0,policy:'softmax'}
 ]});
 assert.equal(mixed.endReason,'choice-error');
 assert.equal(mixed.ppo.length,0);
});

test('a copied frozen actor samples an on-policy softmax without touching its weights',{timeout:60000},async()=>{
 const frozen=loadNet('training/white-sword-nn/weights/round2/a-frozen.json');
 const behavior=cloneNet(frozen);
 behavior.version='ppo-integration';
 const critic=createCritic(CRITIC_INIT_SEED);
 const before=cloneNet(behavior);
 const game=playMatch({
  seed:191201,first:0,mode:'train',progress:false,
  behaviorVersion:behavior.version,behaviorUpdates:behavior.updates,
  seats:[
   {deckId:'white-sword',kind:'nn',explore:0,policy:'softmax'},
   {deckId:'white-sword',kind:'nn',explore:0,policy:'softmax'}
  ],
  nets:[behavior,cloneNet(behavior)],critics:[critic,critic],
  recordSeats:[0,1],teacherSeats:[]
 });
 assert.equal(game.status,'finished');
 assert.equal(game.winner===0||game.winner===1,true);
 assert.equal(game.explored,0);
 assert.ok(game.ppo.length>1);
 assertOnPolicy(game.ppo,behavior);
 for(const sample of game.ppo){
  assertModelInput(sample);
  assert.equal(sample.chosen>=0&&sample.chosen<sample.actions.length,true);
  assert.ok(Math.abs(currentRatio(behavior,sample)-1)<1e-6);
  const mass=sample.oldLogProbs.reduce((sum,logProb)=>sum+Math.exp(logProb),0);
  assert.ok(Math.abs(mass-1)<1e-6);
 }
 const opt=createOptimizer(PPO_CRITIC_LR,0);
 for(let step=0;step<2;step++)criticStep(critic,opt,game.ppo[0].state,game.ppo[0].target);
 assert.equal(sameWeights(behavior,before),true);
 const scores=scoreActions(behavior,game.ppo[0].state,game.ppo[0].actions);
 const again=scoreActions(before,game.ppo[0].state,game.ppo[0].actions);
 for(let index=0;index<scores.length;index++)assert.equal(Object.is(scores[index],again[index]),true);
});

test('about 50 percent is not improvement, and only a stable gain opens confirmation',()=>{
 const zero=rowsOf(0.5);
 const spread=Array.from({length:8},(_,index)=>({seed:index+1,p:index%2?0.25:0.75}));
 const endpoint={summary:{seeds:8,mean:0.5,rows:spread}};
 const regression=judgePpoRegression(endpoint,zero);
 assert.equal(regression.kind,'no-obvious-regression');
 const dropped={summary:{seeds:8,mean:0.2,rows:rowsOf(0.2)}};
 assert.equal(judgePpoRegression(dropped,zero).kind,'regressed');
 assert.equal(judgePpoRegression({summary:{seeds:8,mean:0.46,rows:rowsOf(0.46)}},zero).kind,'regressed');
 const strong={summary:{seeds:8,mean:0.8,rows:rowsOf(0.8)},gamesPlayed:16};
 assert.equal(judgePpoRegression(strong,zero).kind,'improved');
 assert.equal(judgeSurpass(strong,zero).ok,true);
 assert.equal(judgeSurpass(endpoint,zero).ok,false);
 const separation=answerSeparation({copy:true,criticIsolated:true,valueNotInScores:true,symmetry:{ok:true,pairs:24}});
 assert.match(separation,/兩組參數/);
 assert.match(answerSeparation({copy:true,criticIsolated:false,valueNotInScores:true,symmetry:{ok:true}}),/沒有全部成立/);
 const quiet={
  plan:{fits:true},regression,
  selected:{gamesPlayed:16,summary:endpoint.summary,surpass:judgeSurpass(endpoint,zero)},
  confirm:{ran:false,reason:'沒有超越凍結 A。'}
 };
 assert.match(answerRegression(quiet),/未觀察到明顯退步/);
 assert.match(answerConfirmation(quiet),/沒有/);
 const shaky={
  plan:{fits:true},
  selected:{surpass:{ok:false,mean:0.604,seeds:12,delta:{low:-0.052,high:0.261}}},
  confirm:{ran:false}
 };
 assert.match(answerConfirmation(shaky),/配對差下限沒有高於 0/);
 assert.match(answerConfirmation(shaky),/不能稱為自主變強/);
 const won={
  plan:{fits:true},
  regression:judgePpoRegression(strong,zero),
  selected:{gamesPlayed:16,summary:strong.summary,surpass:judgeSurpass(strong,zero)},
  confirm:{ran:true,summary:{low:0.62,mean:0.75,seeds:12}}
 };
 assert.match(answerConfirmation(won),/不是正式晉級/);
 const text=renderRound4({
  createdAt:'2026-11-25T10:00:00.000Z',checks:{copy:true,criticIsolated:true,valueNotInScores:true,ratioAtOne:true,symmetry:{ok:true,pairs:24}},
  plan:{fits:true,games:16},curve:[{gamesPlayed:0,summary:{mean:0.5,seeds:12},actorObjective:null,criticMse:null,kl:null,entropy:null}],
  selected:quiet.selected,endpoint,regression,confirm:quiet.confirm,
  train:{steps:10,decisions:10,games:8,finished:8,unfinished:[],actorUpdates:4,criticUpdates:4}
 });
 assert.match(text,/不能稱為自主變強/);
 assert.match(text,/191400–191411/);
 assert.match(text,/沒有部署/);
 assert.equal(PPO_CLIP,0.2);
 assert.equal(PPO_EPOCHS,4);
 assert.equal(PPO_ENTROPY,0.01);
 assert.equal(PPO_KL_LIMIT,0.02);
 assert.equal(PPO_ACTOR_LR,3e-4);
 assert.equal(PPO_CRITIC_LR,1e-3);
 assert.equal(pairedDelta(zero,rowsOf(0.5)).mean,0);
});
