import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {splitForSeed} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {planRound6,round4Opponent} from '../training/white-sword-nn/budget.mjs';
import {
 PPO_BATCH_GAMES,PPO_KL_LIMIT,PPO_MAX_BATCHES,ROUND4_SHUFFLE_SEED,ROUND5_DEV_COUNT,ROUND6_BENCH_SHUFFLE,
 ROUND6_CRITIC_SEEDS,ROUND6_DEV_COUNT,ROUND6_DEV_START,ROUND6_LINES,ROUND6_SHUFFLE_SEEDS,ROUND6_TRAIN_STARTS
} from '../training/white-sword-nn/constants.mjs';
import {createNet} from '../training/white-sword-nn/net.mjs';
import {sampleFingerprint,thetaHash} from '../training/white-sword-nn/fingerprint.mjs';
import {classifyMonitor,summarizeMonitor} from '../training/white-sword-nn/ppo.mjs';
import {
 ROUND4_CONFIRM_SEEDS,ROUND4_DEV_SEEDS,ROUND4_SELF_SEEDS,ROUND5_DEV_SEEDS,ROUND6_BLOCKED_SEEDS,
 ROUND6_DEV_SEEDS,ROUND6_RULE,ROUND6_TRAIN_SEEDS,TEST_SEEDS,allExperimentSeeds,assertExperimentSeed,reservedHit
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerRound6Confirm,answerRound6Lines,answerRound6Monitor,judgeRound6,judgeRound6Line,renderRound6
} from '../training/white-sword-nn/report.mjs';

function judged(kind,{finished=256,unfinished=0,ran=12,planned=12}={}){
 const low=kind==='supports-better'?0.02:kind==='supports-weaker'?-0.2:-0.04;
 const high=kind==='supports-better'?0.12:kind==='supports-weaker'?-0.02:0.08;
 const delta={seeds:64,mean:0.04,low,high};
 return judgeRound6Line({
  plannedGames:256,finishedGames:finished,unfinished,seeds:64,completeSeeds:unfinished?63:64,
  delta,plannedBatches:planned,ranBatches:ran
 });
}
function lineOf(kind,index){
 const judgment=judged(kind);
 return {
  line:index,judgment,
  summary:{seeds:64,finished:256,mean:kind==='supports-weaker'?0.42:0.58,low:0.4,high:0.7},
  versusHalf:judgment.delta,
  first:{seeds:64,finished:128,mean:0.55,low:0.4,high:0.7},
  second:{seeds:64,finished:128,mean:0.52,low:0.4,high:0.7},
  seat0:{seeds:64,finished:128,mean:0.5,low:0.4,high:0.6},
  seat1:{seeds:64,finished:128,mean:0.55,low:0.4,high:0.7}
 };
}

test('round-6 seeds are new, blocked, and shared by the three lines',()=>{
 assert.equal(ROUND6_LINES,3);
 assert.equal(ROUND6_DEV_COUNT,64);
 assert.equal(ROUND6_TRAIN_SEEDS.length,3);
 assert.deepEqual(ROUND6_TRAIN_STARTS,[192200,192400,192600]);
 assert.deepEqual(ROUND6_CRITIC_SEEDS,[188530,188531,188532]);
 assert.deepEqual(ROUND6_SHUFFLE_SEEDS,[188540,188541,188542]);
 const blocked=new Set([
  ...ROUND4_DEV_SEEDS,...ROUND4_SELF_SEEDS,...ROUND4_CONFIRM_SEEDS,...ROUND5_DEV_SEEDS,...TEST_SEEDS,
  ...ROUND6_BLOCKED_SEEDS
 ]);
 const seen=new Set();
 for(const block of ROUND6_TRAIN_SEEDS){
  assert.equal(block.length,PPO_MAX_BATCHES*PPO_BATCH_GAMES);
  for(const seed of block){
   assert.equal(seen.has(seed),false);
   seen.add(seed);
   assertExperimentSeed(seed,'round6-train');
   assert.equal(splitForSeed(seed),'unassigned');
   assert.equal(reservedHit(seed),null);
   assert.equal(blocked.has(seed),false);
   assert.throws(()=>assertExperimentSeed(seed,'round6-dev'));
  }
 }
 for(const seed of ROUND6_DEV_SEEDS){
  assert.equal(seen.has(seed),false);
  seen.add(seed);
  assertExperimentSeed(seed,'round6-dev');
  assert.equal(splitForSeed(seed),'unassigned');
  assert.equal(seed>=191600&&seed<=191663,false);
  assert.equal(seed>=191400&&seed<=191411,false);
  assert.throws(()=>assertExperimentSeed(seed,'round6-train'));
  assert.throws(()=>assertExperimentSeed(seed,'round5-dev'));
 }
 assert.equal(ROUND6_DEV_SEEDS[0],ROUND6_DEV_START);
 assert.equal(ROUND6_DEV_SEEDS.at(-1),192863);
 assert.equal(new Set(allExperimentSeeds()).size,allExperimentSeeds().length);
 for(const seed of [...ROUND6_CRITIC_SEEDS,...ROUND6_SHUFFLE_SEEDS,ROUND6_BENCH_SHUFFLE,ROUND4_SHUFFLE_SEED]){
  assert.throws(()=>assertExperimentSeed(seed));
 }
 assert.throws(()=>assertExperimentSeed(191600,'round6-dev'));
 assert.throws(()=>assertExperimentSeed(191400,'round6-dev'));
 assert.throws(()=>assertExperimentSeed(189400,'round6-dev'));
 assert.match(ROUND6_RULE,/不能把棋力變化完全歸因於 KL 修正/);
 assert.match(ROUND6_RULE,/尚無法分辨/);
});

test('the round-6 budget is one batch count for every line',()=>{
 const open=planRound6({
  wallMs:1e15,rolloutMs:1000,evalMs:1000,v2Ms:1000,updateMs:100,v2Finished:true,workers:2
 });
 assert.equal(open.fits,true);
 assert.equal(open.lines,3);
 assert.equal(open.batches,PPO_MAX_BATCHES);
 assert.equal(open.gamesPerLine,96);
 assert.equal(open.trainGames,288);
 assert.equal(open.evalGames,768);
 assert.equal(open.evalGamesPerLine,256);
 assert.equal(open.endpointOnly,true);
 assert.equal(open.checks[0],0);
 assert.equal(open.checks.at(-1),96);
 assert.equal(open.checks.length,13);
 assert.deepEqual(open.kinds,[
  'self','self','v2','self','snapshot','v2','self','snapshot','v2','self','snapshot','v2'
 ]);
 const tight=planRound6({
  wallMs:80000,rolloutMs:1000,evalMs:100,v2Ms:1000,updateMs:100,v2Finished:true,workers:2
 });
 assert.equal(tight.fits,true);
 assert.equal(tight.batches,1);
 assert.equal(tight.lines,3);
 assert.equal(tight.trainGames,tight.batches*PPO_BATCH_GAMES*3);
 const none=planRound6({
  wallMs:1000,rolloutMs:5000,evalMs:5000,v2Ms:5000,updateMs:1000,v2Finished:true,workers:1
 });
 assert.equal(none.fits,false);
 assert.equal(none.batches,0);
 assert.equal(none.lines,3);
 const noV2=planRound6({
  wallMs:1e15,rolloutMs:1000,evalMs:1000,v2Ms:1000,updateMs:10,v2Finished:false,workers:2
 });
 assert.equal(noV2.kinds.includes('v2'),false);
 assert.equal(noV2.kinds[0],round4Opponent(0,{v2Finished:false,snapshots:[]}));
 const body=readFileSync('training/white-sword-nn/budget.mjs','utf8');
 const fn=body.slice(body.indexOf('export function planRound6'));
 assert.equal(fn.includes('勝'),false);
});

test('fixed-actor and mixed KL are classified only on epochs that ran',()=>{
 const limit=PPO_KL_LIMIT;
 assert.equal(classifyMonitor([{mixedKl:0.02,fixedKl:0.02}],limit,1,false).relation,'neither');
 assert.equal(classifyMonitor([{mixedKl:0.01,fixedKl:0.03}],limit,1,true).relation,'fixed-only');
 assert.equal(classifyMonitor([{mixedKl:0.03,fixedKl:0.01},{mixedKl:0.04,fixedKl:0.011}],limit,2,false).relation,'mixed-only');
 assert.equal(classifyMonitor([{mixedKl:0.03,fixedKl:0.04}],limit,1,true).relation,'same-epoch');
 const earlier=classifyMonitor([
  {mixedKl:0.03,fixedKl:0.01},{mixedKl:0.04,fixedKl:0.05}
 ],limit,2,true);
 assert.equal(earlier.relation,'mixed-earlier');
 assert.equal(earlier.mixedEpoch,1);
 assert.equal(earlier.fixedEpoch,2);
 const summary=summarizeMonitor([
  {relation:'fixed-only',epochsRan:1,stopped:true,limit,rows:[{fixedMax:0.2}]},
  {relation:'mixed-only',epochsRan:4,stopped:false,limit,rows:[{fixedMax:0.01}]},
  {relation:'same-epoch',epochsRan:2,stopped:true,limit,rows:[{fixedMax:0.03}]}
 ]);
 assert.equal(summary.batches,3);
 assert.equal(summary.epochs,7);
 assert.equal(summary.stopped,2);
 assert.equal(summary.maxOver,2);
 assert.equal(summary.counts['fixed-only'],1);
});

test('a fingerprint changes when the stored behavior changes',()=>{
 const game={
  seed:1,first:0,learnerSeat:0,status:'finished',winner:0,steps:4,decisions:3,
  ppo:[{seat:0,index:1,chosen:0,value:0.2,target:1,oldLogProb:-0.3,oldLogProbs:[-0.3,-1.2],state:[1,0]}]
 };
 assert.equal(sampleFingerprint([game]),sampleFingerprint([game]));
 assert.notEqual(sampleFingerprint([game]),sampleFingerprint([{...game,winner:1}]));
 const moved={...game,ppo:[{...game.ppo[0],oldLogProbs:[-0.2,-1.4]}]};
 assert.notEqual(sampleFingerprint([game]),sampleFingerprint([moved]));
 const net=createNet(7,{sizes:[2,1],stateDim:1,version:'fp'});
 const copy=createNet(7,{sizes:[2,1],stateDim:1,version:'fp'});
 copy.theta.set(net.theta);
 assert.equal(thetaHash(net),thetaHash(copy));
 copy.theta[0]+=1;
 assert.notEqual(thetaHash(net),thetaHash(copy));
});

test('each line is judged on its own endpoint, and one success is not a stable method',()=>{
 assert.equal(judged('supports-better').kind,'supports-better');
 assert.equal(judged('supports-weaker').kind,'supports-weaker');
 assert.equal(judged('not-confirmed').kind,'not-confirmed');
 assert.equal(judged('supports-better',{finished:255}).kind,'incomplete');
 assert.equal(judged('supports-better',{unfinished:1}).kind,'incomplete');
 assert.equal(judged('supports-better',{ran:11}).kind,'incomplete');
 const open=lineOf('not-confirmed',0);
 assert.ok(open.summary.mean>0.5);
 assert.equal(open.judgment.kind,'not-confirmed');
 const mixed=judgeRound6([
  judged('supports-better'),judged('not-confirmed'),judged('supports-weaker')
 ]);
 assert.equal(mixed.complete,true);
 assert.equal(mixed.consistent,false);
 assert.deepEqual(mixed.candidates,[0]);
 const one=answerRound6Confirm({judgment:mixed});
 assert.match(one,/有。線 0/);
 assert.match(one,/不表示訓練方法已能穩定成長/);
 assert.match(one,/沒有啟動 191400–191411/);
 const lines=[lineOf('supports-better',0),lineOf('not-confirmed',1),lineOf('supports-weaker',2)];
 const text=answerRound6Lines({judgment:mixed,lines});
 assert.match(text,/線 0 有正向證據/);
 assert.match(text,/線 1 尚無法分辨/);
 assert.match(text,/線 2 有退步證據/);
 assert.match(text,/不是 192 個獨立評估種子/);
 const allBetter=judgeRound6([judged('supports-better'),judged('supports-better'),judged('supports-better')]);
 assert.equal(allBetter.consistent,true);
 assert.match(answerRound6Confirm({judgment:allBetter}),/不稱為訓練方法已經穩定到可以晉級/);
 const allWeaker=judgeRound6([judged('supports-weaker'),judged('supports-weaker'),judged('supports-weaker')]);
 assert.match(answerRound6Confirm({judgment:allWeaker}),/不表示整個 PPO 方法不可行/);
 assert.match(answerRound6Confirm({judgment:{complete:false,candidates:[],kinds:['incomplete']}}),/^沒有/);
 const monitor=answerRound6Monitor({
  trainingComplete:true,
  monitor:{
   batches:36,epochs:70,stopped:20,maxOver:20,
   counts:{neither:4,'fixed-only':10,'mixed-only':6,'same-epoch':16,'fixed-earlier':0,'mixed-earlier':0}
  }
 });
 assert.match(monitor,/36 批/);
 assert.match(monitor,/對照組/);
 assert.match(monitor,/沒有實測/);
 assert.match(monitor,/不是硬上界/);
 assert.match(answerRound6Monitor({trainingComplete:false}),/沒有跑完/);
 const report=renderRound6({
  createdAt:'2026-11-25T12:00:00.000Z',trainingComplete:false,
  judgment:{complete:false,kinds:[],candidates:[]},lines:[],plan:{batches:0},
  resourceGap:'測速之後，三條線連同終點評估放不進牆鐘。'
 });
 assert.match(report,/白劍神經網路第六輪/);
 assert.match(report,/沒有跑完/);
 assert.match(report,/沒有勝率高點/);
});

test('the round-6 trial does not pick a checkpoint or reload the old candidate',()=>{
 const source=readFileSync('scripts/white-sword-nn-round6.mjs','utf8');
 assert.equal(source.includes('selectCheckpoint'),false);
 assert.equal(source.includes('actor-after-80'),false);
 assert.equal(source.includes('191400'),false);
 assert.match(source,/klLimit:PPO_KL_LIMIT/);
 assert.match(source,/klLimit:Infinity/);
 assert.match(source,/exploreSeed:\(seed\*17\+global\)>>>0/);
 assert.equal(source.includes('ROUND5_DEV'),false);
 assert.ok(ROUND5_DEV_COUNT===64);
});
