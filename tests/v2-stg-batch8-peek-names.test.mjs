import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalBp,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,playMain,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

test('batch 8 pins peek, named draws and the event BP print',()=>{
 const peek='【登場時】自分の山札の上から1枚見て、山札の上か場外に置く。';
 for(const id of ['STG-1-024','STG-1-047']){
  assert.equal(STEINS_GATE_BY_ID[id].effectJa,peek);
  assert.deepEqual(stg.cards[id].effects.onPlay,[{op:'peekTopOne'}]);
 }
 assert.equal(STEINS_GATE_BY_ID['STG-1-009'].effectJa,'【登場時】自分の場に〈椎名 まゆり〉がある場合、カードを1枚引く。');
 assert.deepEqual(stg.cards['STG-1-009'].effects.onPlay,[{op:'drawIfOwnName',name:'椎名 まゆり',count:1}]);
 assert.equal(STEINS_GATE_BY_ID['STG-1-014'].effectJa,'【退場時】自分の場に〈岡部 倫太郎〉がある場合、カードを1枚引く。');
 assert.deepEqual(stg.cards['STG-1-014'].effects.onRetire,[{op:'drawIfOwnName',name:'岡部 倫太郎',count:1}]);
 assert.equal(STEINS_GATE_BY_ID['STG-1-020'].effectJa,
  '【自分のターン中】このターン中に自分がイベントカードを使用している場合、このキャラはBP+1500。');
 assert.equal(stg.cards['STG-1-020'].bp,1500);
 assert.equal(stg.cards['STG-1-020'].passiveBonuses[0].bp,1500);
});

test('peek shows the top card only to its controller',()=>{
 let s=toPhase(stgPacks,fresh(undefined,8024),'main');
 const card=take(s,0,'STG-1-024');
 s.players[0].hand.push(card);
 readyAp(s);
 const top=s.players[0].deck[0];
 s=playMain(stgPacks,s,card.uid);
 assert.equal(s.pending.kind,'private-top-choice');
 assert.equal(universalPrivateChoices(stgPacks,s,0).options[0].card.cardId,top.cardId);
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(stgPacks,s,1)).includes(top.uid),false);
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseTopCard',mode:'outside'},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===top.uid));
 let kept=toPhase(stgPacks,fresh(deckWith(['STG-1-047']),8047),'main');
 const green=take(kept,0,'STG-1-047');
 kept.players[0].hand.push(green);
 readyAp(kept);
 const stays=kept.players[0].deck[0].uid;
 kept=playMain(stgPacks,kept,green.uid);
 kept=dispatchUniversalAction(stgPacks,kept,{type:'chooseTopCard',mode:'top'},{actor:0});
 assert.equal(kept.players[0].deck[0].uid,stays);
 assert.equal(assertUniversalMatch(stgPacks,kept),true);
});

test('STG-1-009 draws only while Mayuri is on the field',()=>{
 function enter(seed,withMayuri){
  let s=toPhase(stgPacks,fresh(deckWith(['STG-1-009']),seed),'main');
  put(s,0,'STG-1-001','energy',0);
  put(s,0,'STG-1-007','energy',1);
  put(s,0,'STG-1-020','energy',2);
  if(withMayuri)put(s,0,'STG-1-014','front',0);
  const card=take(s,0,'STG-1-009');
  s.players[0].hand.push(card);
  readyAp(s);
  const deck=s.players[0].deck.length;
  s=playMain(stgPacks,s,card.uid);
  return {s,deck};
 }
 const hit=enter(8009,true);
 assert.equal(hit.s.pending,null);
 assert.equal(hit.s.players[0].deck.length,hit.deck-1);
 const miss=enter(8010,false);
 assert.equal(miss.s.players[0].deck.length,miss.deck);
 assert.equal(assertUniversalMatch(stgPacks,miss.s),true);
});

test('STG-1-014 draws on battle loss only while Okabe remains',()=>{
 function lose(seed,withOkabe){
  let s=fresh(undefined,seed);
  const attacker=put(s,0,'STG-1-001','front',0);
  if(withOkabe)put(s,1,'STG-1-007','energy',0);
  const mayuri=put(s,1,'STG-1-014','front',0);
  s=toPhase(stgPacks,s,'attack');
  const before=s.players[1].deck.length;
  s=dispatchUniversalAction(stgPacks,s,{type:'attack',uid:attacker.uid});
  s=dispatchUniversalAction(stgPacks,s,{type:'chooseBlock',uid:mayuri.uid},{actor:1});
  return {s,before,mayuri};
 }
 const hit=lose(8014,true);
 assert.ok(hit.s.players[1].outside.some(c=>c.uid===hit.mayuri.uid));
 assert.equal(hit.s.players[1].deck.length,hit.before-1);
 const miss=lose(8015,false);
 assert.equal(miss.s.players[1].deck.length,miss.before);
 assert.equal(assertUniversalMatch(stgPacks,miss.s),true);
});

test('STG-1-020 is 1500 until an own event is used this turn',()=>{
 let s=toPhase(stgPacks,fresh(undefined,8020),'main');
 const card=put(s,0,'STG-1-020','front',0);
 assert.equal(universalBp(stg,s,card),1500);
 const event=take(s,0,'STG-1-032');
 s.players[0].hand.push(event);
 readyAp(s);
 const play=legalUniversalActions(stgPacks,s).find(a=>a.type==='event'&&a.uid===event.uid);
 s=dispatchUniversalAction(stgPacks,s,play,{actor:0});
 const live=s.players[0].front.find(c=>c?.uid===card.uid);
 assert.equal(universalBp(stg,s,live),3000);
 assert.equal(universalPublicView(stgPacks,s,1).players[0].front[0].bp,3000);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});
