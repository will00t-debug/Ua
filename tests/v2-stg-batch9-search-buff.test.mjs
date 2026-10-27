import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalBp,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,playMain,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

function order(s,uids){
 for(const uid of uids)s=dispatchUniversalAction(stgPacks,s,{type:'chooseTopOrder',uid},{actor:0});
 return s;
}

test('batch 9 pins the three-name search, the top-3 inspect and the rest buff',()=>{
 assert.equal(STEINS_GATE_BY_ID['STG-1-015'].effectJa,
  '【登場時】自分の山札の上から4枚見て、〈岡部 倫太郎〉か〈椎名 まゆり〉か〈橋田 至〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。');
 assert.equal(stg.cards['STG-1-015'].effects.onPlay[0].count,4);
 assert.deepEqual(stg.cards['STG-1-015'].effects.onPlay[0].filters.map(f=>f.value),
  ['岡部 倫太郎','椎名 まゆり','橋田 至']);
 assert.equal(STEINS_GATE_BY_ID['STG-1-065'].effectJa,
  '【登場時】自分の山札の上から3枚見て、1枚まで場外に置き、残りを望む順で山札の上に置く。');
 assert.deepEqual(stg.cards['STG-1-065'].effects.onPlay,[{op:'inspectTopArrange',count:3,toOutside:true,rest:'top'}]);
 const rest='【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。';
 for(const id of ['STG-1-006','STG-1-062']){
  assert.equal(STEINS_GATE_BY_ID[id].effectJa,rest);
  assert.equal(stg.cards[id].mainAbility.op,'restSelfBuffOther');
  assert.equal(stg.cards[id].mainAbility.bp,1000);
 }
});

test('STG-1-015 adds one named card, hides the window, then discards',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-015']),9015),'main');
 put(s,0,'STG-1-001','energy',0);
 const window=['STG-1-007','STG-1-014','STG-1-020','STG-1-042'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 const source=take(s,0,'STG-1-015');
 s.players[0].hand.push(source);
 readyAp(s);
 s=playMain(stgPacks,s,source.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(stgPacks,s,1)).includes(window[0].uid),false);
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.type==='chooseTopFiltered'&&a.uid===null));
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid));
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===window[3].uid),false);
 const spare=s.players[0].hand.find(c=>c.uid!==source.uid);
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseTopFiltered',uid:window[0].uid},{actor:0});
 assert.equal(s.publicReveals.at(-1).cardId,'STG-1-007');
 s=order(s,[window[1].uid,window[2].uid,window[3].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseDiscard',uid:spare.uid},{actor:0});
 assert.ok(s.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[window[1].uid,window[2].uid,window[3].uid]);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-065 may send one inspected card outside and returns the rest to the top',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-065']),9065),'main');
 put(s,0,'STG-1-042','energy',0);
 const window=['STG-1-001','STG-1-007','STG-1-012'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 const source=take(s,0,'STG-1-065');
 s.players[0].hand.push(source);
 readyAp(s);
 s=playMain(stgPacks,s,source.uid);
 assert.equal(s.pending.kind,'effect-top-inspect');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseInspectedOutside',uid:window[0].uid},{actor:0});
 s=order(s,[window[2].uid,window[1].uid]);
 assert.ok(s.players[0].outside.some(c=>c.uid===window[0].uid));
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[window[2].uid,window[1].uid]);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('rest buffs another character and cannot select itself',()=>{
 for(const [id,seed] of [['STG-1-006',9006],['STG-1-062',9062]]){
  let s=toPhase(stgPacks,fresh(deckWith([id]),seed),'main');
  const source=put(s,0,id,'front',0);
  const ally=put(s,0,'STG-1-001','front',1);
  const action=legalUniversalActions(stgPacks,s).find(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='selfRestBuff');
  assert.ok(action);
  s=dispatchUniversalAction(stgPacks,s,action,{actor:0});
  assert.equal(s.players[0].front[0].ready,false);
  assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='chooseOwnBuff'&&a.uid===source.uid),false);
  assert.throws(()=>dispatchUniversalAction(stgPacks,s,{type:'chooseOwnBuff',uid:source.uid},{actor:0}),
   /not currently legal/);
  s=dispatchUniversalAction(stgPacks,s,{type:'chooseOwnBuff',uid:ally.uid},{actor:0});
  assert.equal(universalBp(stg,s,s.players[0].front[1]),3000);
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(stgPacks,s),true);
 }
});
