import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {splitForSeed} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {pairedDelta,tCritical} from '../training/white-sword-nn/cluster.mjs';
import {
 KL_QUANTILES,PPO_EPOCHS,PPO_KL_LIMIT,ROUND5_CANDIDATE_GAMES,ROUND5_DEV_COUNT,ROUND5_DEV_START
} from '../training/white-sword-nn/constants.mjs';
import {ACTION_DIM,STATE_DIM} from '../training/white-sword-nn/encode.mjs';
import {cloneNet,createNet,createOptimizer,sameWeights,scoreActions} from '../training/white-sword-nn/net.mjs';
import {categorical,createCritic,fixedBatchKl,klQuantile,ppoUpdate} from '../training/white-sword-nn/ppo.mjs';
import {
 ROUND4_CONFIRM_SEEDS,ROUND4_DEV_SEEDS,ROUND4_SELF_SEEDS,ROUND5_DEV_SEEDS,TEST_SEEDS,
 allExperimentSeeds,assertExperimentSeed,reservedHit
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerKlFix,answerRound5Confirm,answerRound5Strength,judgeRound5
} from '../training/white-sword-nn/report.mjs';

const FROZEN='training/white-sword-nn/weights/round2/a-frozen.json';
const CANDIDATE='training/white-sword-nn/weights/round4/actor-after-80.json';

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
function halfRows(rate){
 return ROUND5_DEV_SEEDS.map(seed=>({seed,p:rate}));
}
function judgment(delta,{finished=256,unfinished=0,seeds=64,completeSeeds=64}={}){
 return judgeRound5({
  plannedGames:256,finishedGames:finished,unfinished,seeds,completeSeeds,delta
 });
}

test('round-5 dev seeds are a new unused block of 64',()=>{
 assert.equal(ROUND5_DEV_COUNT,64);
 assert.equal(ROUND5_CANDIDATE_GAMES,80);
 assert.equal(ROUND5_DEV_SEEDS.length,64);
 assert.equal(ROUND5_DEV_SEEDS[0],ROUND5_DEV_START);
 assert.equal(ROUND5_DEV_SEEDS[63],191663);
 assert.equal(tCritical(ROUND5_DEV_SEEDS.length),1.96);
 assert.deepEqual(KL_QUANTILES,[0.5,0.9,0.95]);
 const all=allExperimentSeeds();
 assert.equal(new Set(all).size,all.length);
 const blocked=new Set([
  ...ROUND4_DEV_SEEDS,...ROUND4_SELF_SEEDS,...ROUND4_CONFIRM_SEEDS,...TEST_SEEDS
 ]);
 for(const seed of ROUND5_DEV_SEEDS){
  assertExperimentSeed(seed,'round5-dev');
  assert.equal(splitForSeed(seed),'unassigned');
  assert.equal(reservedHit(seed),null);
  assert.equal(blocked.has(seed),false);
  assert.equal(seed>=191400&&seed<=191411,false);
 }
 assert.throws(()=>assertExperimentSeed(191400,'round5-dev'));
 assert.throws(()=>assertExperimentSeed(189400,'round5-dev'));
 assert.throws(()=>assertExperimentSeed(191200,'round5-dev'));
 assert.throws(()=>assertExperimentSeed(ROUND5_DEV_SEEDS[0],'round4-confirm'));
});

test('fixed-actor KL uses one snapshot and reports the locked quantiles',()=>{
 const sorted=[0,1,2,3];
 assert.equal(klQuantile(sorted,0.5),1.5);
 assert.ok(Math.abs(klQuantile(sorted,0.9)-2.7)<1e-12);
 assert.equal(klQuantile([4],0.95),4);
 const actor=responsiveActor('snap');
 const before=cloneNet(actor);
 const sample=sampleFrom(actor,0,1);
 const same=fixedBatchKl(actor,[sample,sample]);
 assert.ok(Math.abs(same.mean)<1e-12);
 assert.ok(Math.abs(same.max)<1e-12);
 assert.deepEqual(same.quantiles.map(item=>item.p),[0.5,0.9,0.95]);
 assert.equal(sameWeights(actor,before),true);
 actor.theta[actor.layers[2].weight]+=0.5;
 const moved=fixedBatchKl(actor,[sample]);
 assert.ok(moved.mean>same.mean);
 assert.equal(actor.updates,before.updates);
 const broken={...sample,oldLogProbs:sample.oldLogProbs.map(value=>value-1)};
 assert.throws(()=>fixedBatchKl(actor,[broken]));
});

test('the early stop reads the fixed actor, not the mixed path average',()=>{
 const run=limit=>{
  const actor=responsiveActor('stop-'+limit);
  const behavior=cloneNet(actor);
  const critic=createCritic(8);
  critic.theta.fill(0);
  const first=sampleFrom(behavior,0,1);
  const second=sampleFrom(behavior,0,1);
  second.index=1;
  return ppoUpdate({
   actor,actorOpt:createOptimizer(0.05,0),critic,criticOpt:createOptimizer(0.05,0),behavior,
   samples:[first,second],
   config:{rng:rngOf(9),epochs:1,clip:0.2,entropy:0,klLimit:limit}
  });
 };
 const open=run(1e9);
 const row=open.rows[0];
 assert.equal(row.kl,row.mixedKl);
 assert.ok(Math.abs(row.fixedKl-row.mixedKl)>1e-8);
 assert.equal(open.stopped,false);
 assert.equal(open.epochs,1);
 const limit=(row.mixedKl+row.fixedKl)/2;
 const closed=run(limit);
 assert.equal(closed.stopped,row.fixedKl>limit);
 assert.notEqual(closed.stopped,row.mixedKl>limit);
 assert.equal(PPO_KL_LIMIT,0.02);
 assert.equal(PPO_EPOCHS,4);
});

test('the round-5 reading is fixed before the games',()=>{
 const better=pairedDelta(halfRows(0.5),halfRows(0.75));
 const judged=judgment(better);
 assert.equal(judged.kind,'supports-better');
 assert.ok(better.low>0);
 assert.match(answerRound5Strength(judged),/支持凍結的 80 場候選優於 A/);
 assert.match(answerRound5Confirm(judged),/建議另行安排獨立確認/);
 assert.match(answerRound5Confirm(judged),/沒有啟動 191400–191411/);
 const worse=judgment(pairedDelta(halfRows(0.5),halfRows(0.25)));
 assert.equal(worse.kind,'supports-weaker');
 assert.match(answerRound5Strength(worse),/停止推進這個候選/);
 assert.match(answerRound5Strength(worse),/不把整個 PPO 方法說成不可行/);
 assert.match(answerRound5Confirm(worse),/^沒有/);
 const spread=ROUND5_DEV_SEEDS.map((seed,index)=>({seed,p:index%2?0.25:0.75}));
 const open=judgment(pairedDelta(halfRows(0.5),spread));
 assert.equal(open.kind,'not-confirmed');
 assert.ok(open.delta.low<0&&open.delta.high>0);
 assert.match(answerRound5Strength(open),/不能確認/);
 assert.match(answerRound5Strength(open),/不用第四輪的開發高點/);
 const incomplete=judgment(better,{unfinished:1,finished:255,completeSeeds:63,seeds:63});
 assert.equal(incomplete.kind,'incomplete');
 assert.match(answerRound5Strength(incomplete),/評估未完成/);
 assert.match(answerRound5Confirm(incomplete),/^沒有/);
 assert.match(answerKlFix(null),/不同 Actor 版本/);
 assert.match(answerKlFix({accepted:false}),/不能還原/);
 assert.match(answerKlFix({accepted:true}),/不是當時寫進紀錄的監控數字/);
});

test('the frozen files named for this round are unchanged',()=>{
 const frozen=readFileSync(FROZEN);
 const candidate=readFileSync(CANDIDATE);
 assert.equal(createHash('sha256').update(frozen).digest('hex'),
  '542a774f6c42775e20ce1aa1a59235eb9cfe1909b6c8f92dde16a5b5fe90718e');
 assert.equal(createHash('sha256').update(candidate).digest('hex'),
  '2b26fb67ed7ef72df450bb984165082b697e957ce4ec42bfbdaf6b601ed3512b');
 assert.equal(JSON.parse(frozen).version,'nn-a-r2');
 assert.equal(JSON.parse(candidate).version,'nn-ppo-actor-r4');
 assert.equal(JSON.parse(candidate).updates,25494);
});
