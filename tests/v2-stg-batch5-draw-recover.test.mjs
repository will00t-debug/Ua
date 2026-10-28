import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

test('batch 5 pins draw 2 and the four recover-up-to-2 events',()=>{
 assert.equal(STEINS_GATE_BY_ID['STG-1-032'].effectJa,'カードを2枚引く。');
 assert.deepEqual(stg.cards['STG-1-032'].effects.onPlay,[{op:'draw',count:2}]);
 assert.equal(stg.cards['STG-1-032'].type,'event');
 for(const id of ['STG-1-034','STG-1-036','STG-1-075','STG-1-078']){
  assert.equal(STEINS_GATE_BY_ID[id].effectJa,'自分のAPカードを2枚まで選び、アクティブにする。');
  assert.equal(STEINS_GATE_BY_ID[id].trigger,'final');
  assert.deepEqual(stg.cards[id].effects.onPlay,[{op:'recoverAp',count:2}]);
 }
});

test('STG-1-032 draws two and leaves the event outside',()=>{
 let s=toPhase(stgPacks,fresh(undefined,5032),'main');
 const event=take(s,0,'STG-1-032');
 s.players[0].hand.push(event);
 readyAp(s);
 const before=s.players[0].hand.length,deck=s.players[0].deck.length;
 const play=legalUniversalActions(stgPacks,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 s=dispatchUniversalAction(stgPacks,s,play,{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('each recover event readies up to two rested AP cards and may decline',()=>{
 const rows=[
  ['STG-1-034','blue',5034],
  ['STG-1-036','blue',5036],
  ['STG-1-075','green',5075],
  ['STG-1-078','green',5078]
 ];
 for(const [id,color,seed] of rows){
  let s=toPhase(stgPacks,fresh(deckWith([id]),seed),'main');
  const gens=color==='blue'?['STG-1-001','STG-1-007','STG-1-020']:['STG-1-042','STG-1-047','STG-1-053'];
  gens.forEach((gen,slot)=>put(s,0,gen,'energy',slot));
  readyAp(s,0,3);
  s.players[0].apCards[1].ready=false;
  s.players[0].apCards[2].ready=false;
  const event=take(s,0,id);
  s.players[0].hand.push(event);
  const play=legalUniversalActions(stgPacks,s).find(a=>a.type==='event'&&a.uid===event.uid);
  assert.ok(play,id);
  s=dispatchUniversalAction(stgPacks,s,play,{actor:0});
  assert.equal(s.pending?.kind,'effect-recover-ap',id);
  const rested=s.players[0].apCards.filter(c=>c.inPlay&&!c.ready).map(c=>c.uid);
  assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.type==='chooseApRecovery'&&a.uid===null));
  const declined=dispatchUniversalAction(stgPacks,s,{type:'chooseApRecovery',uid:null},{actor:0});
  assert.equal(declined.pending,null);
  assert.equal(declined.players[0].apCards.filter(c=>c.ready).length,0);
  s=dispatchUniversalAction(stgPacks,s,{type:'chooseApRecovery',uid:rested[0]},{actor:0});
  s=dispatchUniversalAction(stgPacks,s,{type:'chooseApRecovery',uid:rested[1]},{actor:0});
  assert.equal(s.pending,null);
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
  assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
  assert.equal(assertUniversalMatch(stgPacks,s),true);
 }
});
