import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTtgCoreDeck,newTtgCoreMatch,runTtgCoreAiMatch,assertTtgCoreState,legalTtgCoreActions,dispatchTtgCoreAction} from '../dist/ttg-core-match.mjs';
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

const greenYoko=Object.fromEntries([
 ...['003','005','006','009','010','011','014','015','016','017','018','019']
  .map(n=>['TTG-1-'+n,4]),['TTG-1-021',2]
]);
test('Yoko 021 runs in restricted 50-card all-green matches without broken AP/turn state',()=>{
 assert.deepEqual(validateTtgCoreDeck(greenYoko),[]);
 for(const seed of [9,26]){
  const s=newTtgCoreMatch({decks:[greenYoko,greenYoko],seed});
  const result=runTtgCoreAiMatch(s,{maxSteps:9000});
  assert.equal(result.truncated,false,'Full AI should reach win/loss, seed '+seed);
  assert.equal(result.state.status,'finished');
  assert.ok(assertTtgCoreState(result.state));
 }
});
test('Yoko 021 STEP goes through the same experimental match legal actions as human',()=>{
 const s=newTtgCoreMatch({decks:[greenYoko,greenYoko],seed:29});
 const p=s.players[0],from=['hand','deck','life'].find(zone=>p[zone].some(x=>x.cardId==='TTG-1-021'));
 const idx=p[from].findIndex(x=>x.cardId==='TTG-1-021'),yoko=p[from].splice(idx,1)[0];
 p.front[1]=yoko;s.phase='move';
 const legal=legalTtgCoreActions(s).filter(a=>a.type==='green021Step');
 assert.deepEqual(legal.map(x=>x.slot),[0,1,2,3]);
 const r=dispatchTtgCoreAction(s,legal.find(x=>x.slot===2));
 assert.equal(r.players[0].front[1],null);
 assert.equal(r.players[0].energy[2].uid,yoko.uid);
 assert.equal(r.players[0].energy[2].ready,yoko.ready);
 assert.ok(assertTtgCoreState(r));
});
