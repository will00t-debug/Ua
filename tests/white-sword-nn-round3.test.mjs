import assert from 'node:assert/strict';
import test from 'node:test';
import {planRound3,round3Checks} from '../training/white-sword-nn/budget.mjs';
import {AGREEMENT_DROP,REPLAY_FRACTION,SURPASS_SEEDS} from '../training/white-sword-nn/constants.mjs';
import {copiesMatch,evaluationSymmetry,fixedUpdatePasses,summarizeValues} from '../training/white-sword-nn/diagnose.mjs';
import {ACTION_DIM,STATE_DIM,joinFeatures} from '../training/white-sword-nn/encode.mjs';
import {
 assertReplayPool,boundedMonteCarloPass,boundedReturnSignal,drawReplay,monteCarloPass,replaySteps,retainPass
} from '../training/white-sword-nn/learn.mjs';
import {cloneNet,createNet,createOptimizer,forwardTrain} from '../training/white-sword-nn/net.mjs';
import {playMatch} from '../training/white-sword-nn/play.mjs';
import {
 ROUND3_CONFIRM_SEEDS,ROUND3_DEV_SEEDS,ROUND3_DIAG_SEEDS,TEST_SEEDS,
 allExperimentSeeds,assertExperimentSeed
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerConnection,answerStability,judgeEarlyRegression,judgeMitigation,judgeScaleGap,judgeSurpass,renderRound3
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
function probe(){
 const state=Array(STATE_DIM).fill(0);
 state[0]=1;
 return [0,1,2].map(index=>{
  const action=Array(ACTION_DIM).fill(0);
  action[index]=1;
  return joinFeatures(state,action);
 });
}
function rowsOf(mean,seeds=8){
 return Array.from({length:seeds},(_,index)=>({seed:index+1,p:mean}));
}

test('round-3 seeds stay out of the round-2 test role and out of each other',()=>{
 const all=allExperimentSeeds();
 assert.equal(new Set(all).size,all.length);
 for(const seed of ROUND3_DIAG_SEEDS)assertExperimentSeed(seed,'round3-diag');
 for(const seed of ROUND3_CONFIRM_SEEDS)assertExperimentSeed(seed,'round3-confirm');
 for(const seed of ROUND3_DEV_SEEDS){
  assertExperimentSeed(seed,'round3-dev');
  assert.equal(TEST_SEEDS.includes(seed),true);
  assert.throws(()=>assertExperimentSeed(seed,'round3-confirm'));
 }
 assert.throws(()=>assertExperimentSeed(ROUND3_CONFIRM_SEEDS[0],'test'));
 assert.throws(()=>assertExperimentSeed(ROUND3_CONFIRM_SEEDS[0],'round3-dev'));
 assert.throws(()=>assertExperimentSeed(ROUND3_DIAG_SEEDS[0],'train'));
 const blocked=new Set([...ROUND3_DEV_SEEDS,...ROUND3_DIAG_SEEDS,...ROUND3_CONFIRM_SEEDS]);
 assert.equal(blocked.size,ROUND3_DEV_SEEDS.length+ROUND3_DIAG_SEEDS.length+ROUND3_CONFIRM_SEEDS.length);
});

test('the round-3 budget is fixed from time and keeps both arms on one schedule',()=>{
 const open=planRound3({wallMs:1e15,nnMs:1000,v2Ms:1000,v2Finished:true,workers:2});
 assert.equal(open.fits,true);
 assert.equal(open.imitate,32);
 assert.equal(open.self,32);
 assert.equal(open.devSeeds,12);
 assert.equal(open.confirmSeeds,12);
 assert.equal(open.diagGames,4);
 assert.equal(open.scaleSeeds,4);
 assert.equal(open.arms,2);
 assert.equal(open.replayFraction,REPLAY_FRACTION);
 assert.equal(REPLAY_FRACTION,0.5);
 assert.deepEqual(open.checks,[0,1,4,8,16,24,32]);
 assert.ok(open.estimatedMs<open.wallMs);
 const blocked=planRound3({wallMs:1000,nnMs:5000,v2Ms:5000,v2Finished:true,workers:1});
 assert.equal(blocked.fits,false);
 assert.equal(blocked.self,0);
 assert.equal(blocked.imitate,0);
 assert.equal(blocked.confirmSeeds,0);
 const noV2=planRound3({wallMs:1e15,nnMs:1000,v2Ms:1000,v2Finished:false,workers:2});
 assert.equal(noV2.imitate,0);
 assert.equal(noV2.fits,false);
 assert.deepEqual(round3Checks(0),[0]);
});

test('a copy matches scores and the chosen action until a weight changes',()=>{
 const net=createNet(9);
 const copy=cloneNet(net);
 const group=probe();
 assert.equal(copiesMatch(net,copy,[group]),true);
 copy.theta[copy.theta.length-1]+=1;
 assert.equal(copiesMatch(net,copy,[group]),false);
});

test('swapped seat labels are complementary only when the game is the same',()=>{
 const same=evaluationSymmetry([
  {seed:1,first:0,learnerSeat:0,winner:1,actions:['a']},
  {seed:1,first:0,learnerSeat:1,winner:1,actions:['a']}
 ]);
 assert.equal(same.ok,true);
 assert.equal(same.learnerHalf,1);
 const drifted=evaluationSymmetry([
  {seed:1,first:0,learnerSeat:0,winner:1,actions:['a']},
  {seed:1,first:0,learnerSeat:1,winner:0,actions:['b']}
 ]);
 assert.equal(drifted.ok,false);
});

test('replay stays on training demonstrations and matches the locked fraction',()=>{
 assert.equal(replaySteps(12),12);
 assert.throws(()=>assertReplayPool([{seed:8}],[8]));
 assertReplayPool([{seed:3,rows:[1,2],chosen:0}],[8]);
 const drawn=drawReplay([{seed:3},{seed:4}],4,rngOf(5));
 assert.equal(drawn.length,4);
 assert.equal(drawn.every(sample=>sample.seed===3||sample.seed===4),true);
 const passes=fixedUpdatePasses([[{id:1}],[{id:2}],[{id:3}]],rngOf(1));
 assert.deepEqual(passes.map(pass=>pass.length),[1,2,3]);
 const net=createNet(3,{sizes:[3,2,1],stateDim:2,version:'toy'});
 const opt=createOptimizer(0.01,0);
 const monte=[{x:Float64Array.from([1,0,0]),target:0.2}];
 const imitate=[{seed:3,rows:[Float64Array.from([1,0,0]),Float64Array.from([0,1,0])],chosen:0,actions:[{},{}]}];
 const before=net.updates;
 const step=retainPass(net,opt,monte,imitate);
 assert.equal(step.steps,2);
 assert.equal(net.updates,before+2);
 assert.throws(()=>retainPass(net,opt,monte,[]));
});

test('a unit return does not drag a large logit in the bounded update',()=>{
 const signal=boundedReturnSignal(0.2,-0.4);
 const loss=value=>{
  const squashed=Math.tanh(value);
  return 0.5*(squashed+0.4)**2;
 };
 const epsilon=1e-6;
 const numeric=(loss(0.2+epsilon)-loss(0.2-epsilon))/(2*epsilon);
 assert.ok(Math.abs(numeric-signal.signal)<1e-7);
 assert.ok(Math.abs(boundedReturnSignal(20,-1).signal)<1e-8);
 assert.ok(Math.abs(20-(-1))>1);
 const net=createNet(8,{sizes:[1,1,1],stateDim:1,version:'toy'});
 net.theta.fill(0);
 net.theta[net.layers.at(-1).bias]=20;
 const input=Float64Array.from([0]);
 assert.equal(forwardTrain(net,input).q,20);
 const raw=cloneNet(net);
 const bounded=cloneNet(net);
 const sample={x:input,target:-1};
 const rawOpt=createOptimizer(0.05,0);
 const boundedOpt=createOptimizer(0.05,0);
 for(let step=0;step<40;step++){
  monteCarloPass(raw,rawOpt,[sample]);
  boundedMonteCarloPass(bounded,boundedOpt,[sample]);
 }
 const rawGap=Math.abs(forwardTrain(raw,input).q-20);
 const boundedGap=Math.abs(forwardTrain(bounded,input).q-20);
 assert.ok(rawGap>1);
 assert.ok(boundedGap<rawGap);
 const profile={q:summarizeValues([20]),target:summarizeValues([-1]),absGap:summarizeValues([21])};
 assert.equal(judgeScaleGap(profile).error,true);
 assert.equal(judgeScaleGap({q:summarizeValues([0.2]),target:summarizeValues([0.1]),absGap:summarizeValues([0.1])}).error,false);
});

test('about 50 percent is mitigation, and only a stable gain over A opens confirmation',()=>{
 const zero=rowsOf(0.5);
 const original={summary:{seeds:8,mean:0.1,rows:rowsOf(0.1)}};
 const retain={summary:{seeds:8,mean:0.45,rows:rowsOf(0.45)}};
 const mitigation=judgeMitigation(original.summary,retain.summary);
 assert.equal(mitigation.mitigated,true);
 assert.equal(judgeSurpass(retain,zero).ok,false);
 const strong={summary:{seeds:8,mean:0.8,rows:rowsOf(0.8)}};
 assert.equal(judgeSurpass(strong,zero).ok,true);
 assert.equal(judgeSurpass({summary:{seeds:SURPASS_SEEDS-1,mean:0.9,rows:rowsOf(0.9,SURPASS_SEEDS-1)}},rowsOf(0.5,SURPASS_SEEDS-1)).ok,false);
 const early=judgeEarlyRegression({agreementDrop:AGREEMENT_DROP,deltaHigh:0.2});
 assert.equal(early.regressed,true);
 assert.equal(judgeEarlyRegression({agreementDrop:0.01,deltaHigh:0.1}).regressed,false);
 const base={
  scale:{separated:true,judgment:{reason:'網路輸出和 [-1,1] 的終局回報不在同一尺度，絕對差中位數大於 1'},before:{output:{q:{}}}},
  early:{checked:true,regressed:true,reasons:['1 場：保留示範的完全一致率下降至少 10 個百分點']}
 };
 assert.match(answerConnection(base),/最早的更新就出現事先登記的退步/);
 assert.match(answerConnection(base),/沒有放進 B-original/);
 assert.match(answerConnection({}),/沒有固定診斷樣本/);
 const arms={
  original:{endpoint:{summary:original.summary},surpass:{ok:false}},
  retain:{endpoint:{summary:retain.summary},surpass:{ok:false},mitigation}
 };
 assert.match(answerStability({arms}),/減輕了退步/);
 assert.match(answerStability({arms}),/不能稱為自主變強/);
 assert.match(answerStability({arms:{original:{},retain:{}}}),/沒有同時跑到事先登記的終點/);
 const text=renderRound3({
  createdAt:'2026-11-25T08:00:00.000Z',gamma:0.995,monteLr:0.0005,smooth:0.05,explore:0.12,replayFraction:0.5,
  bench:{},plan:{fits:true,checks:[0,1,4]},arms,scale:base.scale,early:base.early,confirm:{ran:false,reason:'兩個版本的開發終點都沒有超越凍結 A。'}
 });
 assert.match(text,/不能稱為自主變強/);
 assert.match(text,/189400–189411 只出現在開發評估/);
 assert.match(text,/均方誤差下降沒有拿來判定更新有效/);
 assert.match(text,/晉級門檻沒有放寬/);
});

test('a copied network plays the same capped game under swapped seats',{timeout:60000},()=>{
 const net=createNet(11);
 const play=learnerSeat=>playMatch({
  seed:189650,first:0,mode:'eval',learnerSeat,maxSteps:8,keepActions:true,progress:false,
  seats:[
   {deckId:'white-sword',kind:'nn',explore:0},
   {deckId:'white-sword',kind:'nn',explore:0}
  ],
  nets:[cloneNet(net),cloneNet(net)],recordSeats:[],teacherSeats:[]
 });
 const symmetry=evaluationSymmetry([play(0),play(1)]);
 assert.equal(symmetry.ok,true,JSON.stringify(symmetry.problems));
});
