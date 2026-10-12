import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_MATCH_SUPPORTED,SOLO_TRAINING_PRESET,soloTrainingDeckIssues,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloTrainingBotAction,assertSoloTrainingMatch,simulateSoloTraining,soloEnergy} from '../dist/solo-match.mjs';
const advance=(s,target)=>{for(let i=0;i<5&&s.phase!==target;i++)s=soloTrainingDispatch(s,{type:'next'});return s;};
test('training deck uses exactly 50 legitimate green cards, and rejects every unsupported SLG effect',()=>{
 assert.deepEqual(soloTrainingDeckIssues(SOLO_TRAINING_PRESET),[]);
 const size=Object.values(SOLO_TRAINING_PRESET).reduce((a,b)=>a+b,0);assert.equal(size,50);
 assert.equal(SOLO_MATCH_SUPPORTED.length,14);
 assert.match(soloTrainingDeckIssues({'SLG-1-030':12,'SLG-1-047':4}).join(';'),/50/);
 assert.match(soloTrainingDeckIssues({...SOLO_TRAINING_PRESET,'SLG-1-030':1}).join(';'),/未接入/);
});
test('opening both players has 7 hand, 7 life, no duplicate UIDs, first-turn AP 1, source-phase transitions',()=>{
 let s=newSoloTrainingMatch({seed:74});
 assert.equal(s.players[0].hand.length,7);assert.equal(s.players[1].life.length,7);
 assert.equal(s.players[0].ap,1);assert.equal(s.phase,'start');assert.equal(soloEnergy(s),0);
 assertSoloTrainingMatch(s);
 s=advance(s,'main');assert.equal(s.phase,'main');
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='play'),s.players[0].hand.some(c=>c.cardId));
 assertSoloTrainingMatch(s);
});
test('illegal match actions cannot mutate input or fabricate a card',()=>{
 let s=newSoloTrainingMatch({seed:21}),copy=structuredClone(s);
 assert.throws(()=>soloTrainingDispatch(s,{type:'play',uid:'forgery',line:'front',slot:0}),/illegal/);
 assert.deepEqual(s,copy);
});
test('every active/supported start-to-end match survives card conservation and legal action enumeration',()=>{
 for(const seed of [1,2,3,4,5,6,7,8]){
  let s=newSoloTrainingMatch({seed,first:seed%2});let steps=0;
  while(s.status==='playing'&&steps<3000){
   const a=soloTrainingBotAction(s);
   assert.ok(soloTrainingLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
   s=soloTrainingDispatch(s,a);steps++;
  }
  assert.equal(s.status,'finished','seed '+seed+' incomplete after '+steps+' actions');
  assert.ok([0,1].includes(s.winner));assertSoloTrainingMatch(s);
 }
});
test('simulation helper runs independently from BLEACH game engine',()=>{
 const sim=simulateSoloTraining(40,3000);
 assert.equal(sim.finished,true);assert.equal(sim.state.title,'solo-leveling');
});
