import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';

// Regression for failed paired 408-game run #44979452981.
// Previously v1 stopped after 12 distinct chooseRemoveOutside selections
// because the position key omitted the staged pending selections.
test('seed 92002 v1 against renruki completes after staged outside picks',()=>{
 const model=loadModel('training/white-sword-ai/weights/candidate.json');
 const game=playGame({
  seed:92002,first:1,specialistSeat:0,opponentDeck:'renruki',label:'paired-replay',
  seats:[
   {deckId:'white-sword',policy:'white-sword',model,mode:'blend',scale:6,hardCap:null,explore:0},
   {deckId:'renruki',policy:'hard-search-2',model:null,mode:'policy',explore:0,scale:0}
  ],
  keepActions:true,keepSamples:false
 });
 assert.equal(game.status,'finished',JSON.stringify({
  error:game.error,endReason:game.endReason,steps:game.steps,
  anomalies:game.anomalies,recentActions:game.recentActions
 }));
 assert.ok(game.steps>151,'previous false loop occurred at step 151');
 assert.deepEqual(game.anomalies,{
  illegal:0,timeout:0,fallback:0,deadLoop:0,engineError:0,leak:0,opponentFallback:0
 });
 console.log('92002 replay:',JSON.stringify({
  status:game.status,winner:game.winner,steps:game.steps,endReason:game.endReason
 }));
});
