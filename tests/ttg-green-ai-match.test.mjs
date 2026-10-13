import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTtgCoreDeck,newTtgCoreMatch,runTtgCoreAiMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const allGreen=Object.fromEntries([...[
 '003','005','006','009','010','011','014','015','016','017','018','019'
].map(n=>['TTG-1-'+n,4]),['TTG-1-035',2]]);
test('two 50-card green-only decks with real COLOR and SPECIAL play through AI match',()=>{
 assert.deepEqual(validateTtgCoreDeck(allGreen),[]);
 assert.equal(Object.values(allGreen).reduce((x,y)=>x+y,0),50);
 assert.ok(Object.keys(allGreen).every(id=>TTG_BY_ID[id].color==='green'));
 for(const seed of [23,51,79]){
  const s=newTtgCoreMatch({decks:[allGreen,allGreen],seed});
  const result=runTtgCoreAiMatch(s,{maxSteps:10000});
  assert.equal(result.truncated,false,JSON.stringify({seed,steps:result.actions,turns:result.state.turn}));
  assert.equal(result.state.status,'finished');
  assert.ok([0,1].includes(result.state.winner));
  assert.ok(result.state.turn>=3);
  assert.ok(assertTtgCoreState(result.state));
  assert.equal(s.players[0].life.length,7,'source match stays unchanged');
 }
});
