import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,validateTtgCoreDeck,runTtgCoreAiMatch,assertTtgCoreState,TTG_CORE_SMOKE_IDS} from '../dist/ttg-core-match.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const ordinary=['001','002','005','006','007','009','010','011','014','015','017'];
function deck(cardId){
 const core=[...ordinary,cardId];
 return Object.fromEntries([...core.map(n=>['TTG-1-'+n,4]),['TTG-1-019',2]]);
}
test('green 028, 029, 030 all belong only to the restricted core and each pass 50-card deck validation',()=>{
 for(const num of ['028','029','030']){
  const id='TTG-1-'+num,counts=deck(num);
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);
  assert.ok(TTG_CORE_SMOKE_IDS.includes(id));
  assert.equal(TTG_BY_ID[id].auto,false);
  assert.deepEqual(validateTtgCoreDeck(counts),[]);
 }
});
test('new five-card batch: each 028,029,030 normal RAID completes seeded full AI matches with card conservation',()=>{
 for(const num of ['028','029','030'])for(const seed of [11,37]){
  const counts=deck(num),match=newTtgCoreMatch({decks:[counts,counts],seed});
  const r=runTtgCoreAiMatch(match,{maxSteps:12000});
  assert.equal(r.truncated,false,JSON.stringify({num,seed,steps:r.actions,turn:r.state.turn}));
  assert.equal(r.state.status,'finished',num+'/'+seed);
  assert.ok([0,1].includes(r.state.winner));
  assert.ok(assertTtgCoreState(r.state),num+'/'+seed);
  assert.equal(match.players[0].life.length,7,'original game unaffected');
 }
});
