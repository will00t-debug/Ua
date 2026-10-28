import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,effectiveHandRequiredEnergy,
 legalUniversalActions,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,playMain,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const DRAW='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。';

test('batch 4 pins the discard print and the empty-field blue discount',()=>{
 assert.equal(STEINS_GATE_BY_ID['STG-1-067'].effectJa,DRAW);
 assert.deepEqual(stg.cards['STG-1-067'].effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.equal(STEINS_GATE_BY_ID['STG-1-008'].effectJa,
  '自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【青×2】減らす。'+DRAW);
 assert.equal(stg.cards['STG-1-008'].emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(stg.cards['STG-1-008'].color,'blue');
 assert.equal(stg.cards['STG-1-008'].energy,2);
});

test('STG-1-008 costs 0 from an empty field and 2 once any own card is out',()=>{
 let open=toPhase(stgPacks,fresh(deckWith(['STG-1-008']),4008),'main');
 const printed=stg.cards['STG-1-008'];
 assert.equal(effectiveHandRequiredEnergy(stg,open,0,printed),0);
 const card=take(open,0,'STG-1-008');
 open.players[0].hand.push(card);
 readyAp(open);
 const top=open.players[0].deck[0].uid;
 open=playMain(stgPacks,open,card.uid);
 assert.equal(open.pending.kind,'effect-discard');
 assert.equal(universalPublicView(stgPacks,open,1).players[0].hand,null);
 open=dispatchUniversalAction(stgPacks,open,{type:'chooseDiscard',uid:top},{actor:0});
 assert.ok(open.players[0].outside.some(c=>c.uid===top));
 assert.equal(assertUniversalMatch(stgPacks,open),true);

 let busy=toPhase(stgPacks,fresh(deckWith(['STG-1-008']),4009),'main');
 put(busy,0,'STG-1-001','front',0);
 assert.equal(effectiveHandRequiredEnergy(stg,busy,0,printed),2);
 const held=take(busy,0,'STG-1-008');
 busy.players[0].hand.push(held);
 readyAp(busy);
 assert.equal(legalUniversalActions(stgPacks,busy).some(a=>a.uid===held.uid&&a.type==='play'),false);
 put(busy,0,'STG-1-007','energy',0);
 put(busy,0,'STG-1-020','energy',1);
 assert.ok(legalUniversalActions(stgPacks,busy).some(a=>a.uid===held.uid&&a.type==='play'));
});

test('STG-1-067 must discard after drawing',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-067']),4067),'main');
 put(s,0,'STG-1-042','energy',0);
 put(s,0,'STG-1-047','energy',1);
 put(s,0,'STG-1-053','energy',2);
 const card=take(s,0,'STG-1-067');
 s.players[0].hand.push(card);
 readyAp(s);
 const top=s.players[0].deck[0].uid;
 const before=s.players[0].hand.length;
 s=playMain(stgPacks,s,card.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].hand.length,before);
 assert.throws(()=>dispatchUniversalAction(stgPacks,s,{type:'chooseDiscard',uid:null},{actor:0}),
  /not currently legal/);
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseDiscard',uid:top},{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===top));
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});
