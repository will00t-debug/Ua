import test from 'node:test';
import assert from 'node:assert/strict';
import {qPairsFromRoot,learnFromQPreferences} from '../dist/universal-v2/white-sword-ai/v31-q-learning.mjs';
import {POLICY_DIM} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {loadModel,cloneModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {
 assertV31Splits,V31_TRAIN_SEEDS,V31_EVAL_SEEDS,V31_DECKS,
 trainingCases,evaluationCases,mirrorCases
} from '../dist/universal-v2/white-sword-ai/v31-protocol.mjs';
const f=(i)=>Array.from({length:POLICY_DIM},(_,k)=>k===i?1:0);
test('locked train/evaluation seeds and exact 720 + 120 fixture arithmetic',()=>{
 assert.equal(assertV31Splits(),true);
 assert.equal(V31_EVAL_SEEDS.length,30);
 assert.equal(trainingCases().length,96);
 assert.equal(trainingCases({smoke:true}).length,4);
 assert.equal(evaluationCases().length,360);
 assert.equal(mirrorCases().length,120);
 assert.equal(V31_DECKS.length,3);
 assert.equal(new Set([...V31_TRAIN_SEEDS,...V31_EVAL_SEEDS]).size,
  V31_TRAIN_SEEDS.length+V31_EVAL_SEEDS.length);
});
test('Q labels use measured candidates only and exclude fake Hard anchors',()=>{
 const pool=[
  {action:{type:'play',uid:'a'},measured:true,hardScore:101,features:f(0)},
  {action:{type:'raid',uid:'b'},measured:true,hardScore:98,features:f(1)},
  {action:{type:'next'},measured:false,hardScore:101,features:f(2)},
  {action:{type:'play',uid:'c'},measured:true,hardScore:99,features:f(3)}
 ];
 const rows=qPairsFromRoot(pool);
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(r=>r.negativeType),['play','raid']);
 assert.ok(rows.every(r=>r.kind==='q-preference'&&r.gap>=1.5&&r.gap<=7));
 assert.ok(rows.every(r=>r.chosen[0]===1&&r.negative[2]===0));
});
test('flat or low confidence root scores produce no learning labels',()=>{
 assert.deepEqual(qPairsFromRoot([
  {action:{type:'a'},measured:true,hardScore:10,features:f(0)},
  {action:{type:'b'},measured:true,hardScore:9.8,features:f(1)}
 ]),[]);
 assert.deepEqual(qPairsFromRoot([
  {action:{type:'a'},measured:false,hardScore:10,features:f(0)},
  {action:{type:'b'},measured:false,hardScore:2,features:f(1)}
 ]),[]);
});
test('Q trainer improves measured preference while preserving the anchor and trust region',()=>{
 const anchor={policy:Array(POLICY_DIM).fill(0)};
 anchor.policy[0]=-0.5;anchor.policy[1]=0.5;
 const model={policy:[...anchor.policy]};
 const s={kind:'q-preference',chosen:f(0),negative:f(1),gap:4,weight:1};
 const before=model.policy[0]-model.policy[1];
 const r=learnFromQPreferences(model,Array(20).fill(s),anchor,{lr:.15,epochs:4,trustDelta:.8});
 const after=model.policy[0]-model.policy[1];
 assert.ok(r.updates>0&&r.policyL2>0);
 assert.ok(after>before);
 assert.ok(model.policy.every((w,i)=>Math.abs(w-anchor.policy[i])<=.80001));
 assert.equal(anchor.policy[0],-.5);
 assert.equal(anchor.policy[1],.5);
});
test('smoke game creates actual root-Q preferences without winner labels and exposes only post-move trigger counts',()=>{
 const base=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const cases=trainingCases({smoke:true});
 const row=cases[0],seats=[];
 seats[row.specialistSeat]={deckId:'white-sword',policy:'white-sword',model:cloneModel(base),
  mode:'blend',scale:6,hardCap:7,explore:0};
 seats[1-row.specialistSeat]={deckId:row.opponentDeck,policy:'hard-search-2'};
 const game=playGame({seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,
  opponentDeck:row.opponentDeck,seats,keepSamples:true,recordQPreferences:true,
  recordSeat:row.specialistSeat,trackLife:true});
 assert.equal(game.status,'finished',JSON.stringify({error:game.error,anomalies:game.anomalies}));
 assert.ok(game.samples.some(x=>x.kind==='q-preference'),'No measured counterfactual preferences');
 assert.ok(game.samples.every(x=>x.kind==='q-preference'&&!('reward' in x)));
 assert.ok(game.lifeStats.lifeReveals.every(Number.isInteger));
 assert.ok(game.lifeStats.triggerBearing.every((count,i)=>count<=game.lifeStats.lifeReveals[i]));
});
