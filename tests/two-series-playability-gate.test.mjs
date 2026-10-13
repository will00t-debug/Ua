import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET,soloTrainingDeckIssues,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingBotAction,soloTrainingDispatch,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
import {TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET,ttgBetaDeckIssues} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,ttgCoreAiChoice,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
// Gate only for playable official 50-card Beta presets; no all-FAQ claims.
// Each full game must finish and preserve the 50 physical cards per player.
function soloAiFullGame(preset,seed){
 assert.deepEqual(soloTrainingDeckIssues(preset),[]);
 let s=newSoloTrainingMatch({decks:[preset,preset],first:0,seed});
 assert.ok(assertSoloTrainingMatch(s));let steps=0,lastAction=null;
 while(s.status==='playing'&&steps<4500){
  const legal=soloTrainingLegalActions(s);
  assert.ok(legal.length,'Solo '+seed+' no legal actions at step '+steps);
  const a=soloTrainingBotAction(s);
  assert.ok(a,'Solo '+seed+' bot returned nothing at '+steps);
  assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(a)),'Solo illegal bot action '+JSON.stringify(a));
  lastAction=a;s=soloTrainingDispatch(s,a);steps++;
  assert.ok(assertSoloTrainingMatch(s),'Solo card conservation at '+steps);
 }
 assert.equal(s.status,'finished','Solo '+seed+' stuck '+steps+' last='+JSON.stringify(lastAction)+' phase='+s.phase+' pending='+JSON.stringify(s.pending));
 assert.ok([0,1].includes(s.winner),'Solo missing winner '+seed);
 return steps;
}
function ttgAiFullGame(preset,seed){
 assert.deepEqual(ttgBetaDeckIssues(preset),[]);
 let s=newTtgCoreMatch({decks:[preset,preset],first:0,seed});
 assert.ok(assertTtgCoreState(s));let steps=0,lastAction=null;
 while(s.status==='playing'&&steps<8500){
  const legal=legalTtgCoreActions(s);
  assert.ok(legal.length,'TTG '+seed+' no legal actions at step '+steps);
  const a=ttgCoreAiChoice(s);
  assert.ok(a,'TTG '+seed+' bot returned nothing at '+steps);
  lastAction=a;s=dispatchTtgCoreAction(s,a);steps++;
  assert.ok(assertTtgCoreState(s),'TTG card conservation at '+steps);
 }
 assert.equal(s.status,'finished','TTG '+seed+' stuck '+steps+' last='+JSON.stringify(lastAction)+' phase='+s.phase+' pending='+JSON.stringify(s.pending));
 assert.ok([0,1].includes(s.winner),'TTG missing winner '+seed);
 return steps;
}
test('Playability: Solo green 50-card Beta AI games do not stall',()=>{
 for(const seed of [17,71])assert.ok(soloAiFullGame(SOLO_TRAINING_PRESET,seed)>0);
});
test('Playability: Solo purple 50-card Beta AI games do not stall',()=>{
 for(const seed of [19,73])assert.ok(soloAiFullGame(SOLO_SHADOW_TRAINING_PRESET,seed)>0);
});
test('Playability: TTG green 50-card Beta AI games do not stall',()=>{
 for(const seed of [23,37])assert.ok(ttgAiFullGame(TTG_GREEN_BETA_PRESET,seed)>0);
});
test('Playability: TTG red 50-card Beta AI games do not stall',()=>{
 for(const seed of [29,41])assert.ok(ttgAiFullGame(TTG_RED_BETA_PRESET,seed)>0);
});
