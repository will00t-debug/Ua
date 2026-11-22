import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';

const model=loadModel('training/white-sword-ai/weights/v2-capped.json');
const base={
 seed:45000,first:1,specialistSeat:0,opponentDeck:'reject-blue',
 label:'v3-diagnostic-invariance',keepActions:true,keepSamples:false,
 seats:[
  {deckId:'white-sword',policy:'white-sword',model,mode:'blend',hardCap:7,scale:6,explore:0},
  {deckId:'reject-blue',policy:'hard-search-2',model:null}
 ]
};
test('diagnostics do not change policy action or game result',()=>{
 const plain=playGame(base);
 const diagnostic=playGame({...base,diagnose:true});
 assert.equal(plain.status,'finished',JSON.stringify({error:plain.error,anomalies:plain.anomalies}));
 assert.equal(diagnostic.status,'finished',JSON.stringify({error:diagnostic.error,anomalies:diagnostic.anomalies}));
 assert.equal(diagnostic.winner,plain.winner);
 assert.equal(diagnostic.steps,plain.steps);
 const clean=diagnostic.actions.map(({fullAction,...row})=>row);
 assert.deepEqual(clean,plain.actions);
 const counts=diagnostic.diagnostics;
 assert.ok(counts.blendDecisions>0);
 assert.equal(counts.blendDecisions,counts.singleEligible+counts.multiEligible);
 assert.ok(counts.eligibleSum>=counts.blendDecisions);
 assert.ok(counts.candidatesSum>=counts.eligibleSum);
 assert.ok(counts.hardOverrides<=counts.multiEligible);
});
