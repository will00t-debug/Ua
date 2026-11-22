import test from 'node:test';
import assert from 'node:assert/strict';
import {isVoluntaryMainDecision,stageGuardModel} from '../dist/universal-v2/white-sword-ai/stage-guard.mjs';
import {
 V3_GUARD_VALIDATION_SEEDS,V3_FINAL_SEEDS,assertV3Seed,assertV3Disjoint
} from '../dist/universal-v2/white-sword-ai/v3-protocol.mjs';

const baseline={version:'v2'},learned={version:'v3'};
const seat={stageGuard:true,baselineModel:baseline,model:learned};
const s=(phase,pending=null)=>({status:'playing',phase,pending});
test('learned policy applies only to voluntary non-pending main-phase plan',()=>{
 assert.equal(isVoluntaryMainDecision(s('main')),true);
 assert.equal(stageGuardModel(seat,s('main')),learned);
 for(const state of [
  s('main',{kind:'effect-rest-two'}),
  s('main',{kind:'end-hand-limit'}),
  s('main',{kind:'effect-retire-bp'}),
  s('main',{kind:'effect-rest-lock'}),
  s('move'),s('attack'),s('block'),s('start'),
  {status:'finished',phase:'main',pending:null}
 ]){
  assert.equal(stageGuardModel(seat,state),baseline,JSON.stringify(state));
 }
 assert.equal(stageGuardModel({model:learned},s('move')),learned,
  'ungated model behavior must be unchanged');
 assert.throws(()=>stageGuardModel({stageGuard:true,model:learned},s('main')),/requires both/);
});
test('guard secondary validation seeds have no training or final overlap',()=>{
 assert.deepEqual(V3_GUARD_VALIDATION_SEEDS,[45009,45010,45011,45012]);
 assert.equal(assertV3Disjoint(),true);
 for(const seed of V3_GUARD_VALIDATION_SEEDS){
  assertV3Seed(seed,'validation');
  assert.ok(!V3_FINAL_SEEDS.includes(seed));
  assert.throws(()=>assertV3Seed(seed,'train'));
 }
});
