import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch,legalActions,controller,assertState} from '../dist/engine.mjs';
import {TRAINING_DECKS} from '../dist/training-decks.mjs';
import {FEATURE_DIM,FEATURE_VERSION,encodeAction} from '../dist/ai-v3-features.mjs';
import {initModel,validateModel,scoreFeatures,trainPair} from '../dist/ai-v3-network.mjs';
import {chooseNeuralAction,hasTrainedChampion} from '../dist/ai-v3-policy.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';

function setup(seed=88){
 let s=newGame({seed,decks:[TRAINING_DECKS[0].counts,TRAINING_DECKS[2].counts]});
 s=dispatch(s,{type:'keep'});return dispatch(s,{type:'keep'});
}
test('new random network fits feature shape but cannot ship as champion',()=>{
 const model=initModel({seed:25});
 assert.equal(model.features,FEATURE_DIM);
 assert.equal(model.featureVersion,FEATURE_VERSION);
 assert.equal(validateModel(model),model);
 assert.equal(hasTrainedChampion(),false);
 for(const s of [setup(89),setup(90)]){
  assert.deepEqual(chooseNeuralAction(s),chooseAiAction(s,{difficulty:'hard'}));
 }
});
test('encoder excludes secret opponent hand, decks, life identities and ordering',()=>{
 let s=setup(144);
 s=dispatch(s,{type:'next'});s=dispatch(s,{type:'next'});
 const base=legalActions(s)[0],actual=encodeAction(s,base);
 assert.equal(actual.length,FEATURE_DIM);
 const changed=structuredClone(s);
 changed.players[0].deck.reverse();changed.players[1].deck.reverse();
 changed.players[0].life.reverse();changed.players[1].life.reverse();
 for(const c of changed.players[1].hand)c.cardId='BLC-1-080';
 const altered=encodeAction(changed,base);
 assert.deepEqual(actual,altered);
});
test('one training update actually increases the preferred action rank',()=>{
 const m=initModel({seed:123});
 const s=setup(99),moves=legalActions(s);
 const yes=encodeAction(s,moves[0]),no=encodeAction(s,moves[moves.length-1]);
 const before=scoreFeatures(m,yes)-scoreFeatures(m,no);
 for(let i=0;i<100;i++)trainPair(m,yes,no,{rate:0.02});
 const after=scoreFeatures(m,yes)-scoreFeatures(m,no);
 assert.ok(after>before,'pairwise gradient must improve preferred-action score');
});
test('learning AI with an untrained model returns legal moves without mutating state',()=>{
 const m=initModel({seed:45});
 for(const seed of [57,127]){
  let s=setup(seed);
  for(let i=0;i<15&&s.status==='playing';i++){
   const before=JSON.stringify(s);
   const action=chooseNeuralAction(s,{model:m,minMargin:0.18});
   assert.ok(legalActions(s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
   assert.equal(JSON.stringify(s),before);
   s=dispatch(s,action,controller(s));
   assertState(s);
  }
 }
});
test('invalid, stale or non-finite checkpoints cannot load',()=>{
 const m=initModel({seed:4});m.featureVersion='other';
 assert.throws(()=>validateModel(m),/checkpoint/);
 const next=initModel({seed:4});next.w1[0]=Infinity;
 assert.throws(()=>validateModel(next),/w1/);
});
