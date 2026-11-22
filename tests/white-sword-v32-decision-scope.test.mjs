import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {stageGuardModel,isVoluntaryDecision} from '../dist/universal-v2/white-sword-ai/stage-guard.mjs';
import {
 V32_TRAIN_SEEDS,V32_PILOT_SEEDS,V32_EVAL_SEEDS,
 v32TrainCases,v32EvaluationCases,v32MirrorCases,assertV32Disjoint
} from '../dist/universal-v2/white-sword-ai/v32-protocol.mjs';
const voluntaryTypes=new Set(['play','raid','attack','event','activate','next','extraDraw','move']);
test('v3.2 train, pilot, and 840-game final comparison are disjoint',()=>{
 assert.equal(assertV32Disjoint(),true);
 assert.equal(V32_TRAIN_SEEDS.length,24);
 assert.equal(V32_PILOT_SEEDS.length,4);
 assert.equal(V32_EVAL_SEEDS.length,30);
 assert.equal(v32TrainCases().length,96);
 assert.equal(v32EvaluationCases(V32_PILOT_SEEDS).length,48);
 assert.equal(v32MirrorCases(V32_PILOT_SEEDS).length,16);
 assert.equal(v32EvaluationCases().length,360);
 assert.equal(v32MirrorCases().length,120);
});
test('new policy only controls voluntary main and attack, never pending effect resolution',()=>{
 const old={version:'v2'},candidate={version:'v3.2'};
 const seat={model:candidate,baselineModel:old,stageGuard:true,stageGuardScope:'voluntary'};
 const state=(phase,pending=null)=>({status:'playing',phase,pending});
 for(const p of ['main','attack']){
  assert.equal(isVoluntaryDecision(state(p)),true);
  assert.equal(stageGuardModel(seat,state(p)),candidate);
 }
 for(const p of ['block','start','end']){
  assert.equal(stageGuardModel(seat,state(p)),old);
 }
 for(const pending of [{kind:'effect-retire-bp'},{kind:'choose-hand-limit'},{kind:'life-trigger'},{kind:'attack-life-target'}]){
  assert.equal(stageGuardModel(seat,state('attack',pending)),old);
 }
 assert.equal(stageGuardModel({model:old},state('attack')),old);
});
test('actual headless Q samples never contain effect, discard or target prompts',()=>{
 const row=v32TrainCases({smoke:true})[0],model=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const seats=[];
 seats[row.specialistSeat]={deckId:'white-sword',policy:'white-sword',model,
  mode:'blend',scale:6,hardCap:7,explore:0};
 seats[1-row.specialistSeat]={deckId:row.opponentDeck,policy:'hard-search-2'};
 const game=playGame({...row,seats,label:'v32-scope-test',
  keepSamples:true,recordQPreferences:true,recordQScope:'voluntary',
  recordSeat:row.specialistSeat,recordBlendOutcome:false,trackLife:true});
 assert.equal(game.status,'finished',JSON.stringify({error:game.error,anomalies:game.anomalies}));
 assert.ok(game.samples.every(s=>s.kind==='q-preference'&&voluntaryTypes.has(s.actionType)));
 assert.ok(game.samples.every(s=>s.negativeType&&voluntaryTypes.has(s.negativeType)));
 assert.ok(game.lifeStats.lifeReveals.every(Number.isInteger));
});
