import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID,STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {steinsGatePracticeDeck,v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,playMain,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const LAB=['阿万音 鈴羽','岡部 倫太郎','椎名 まゆり','橋田 至','牧瀬 紅莉栖'];

function order(s,uids){
 for(const uid of uids)s=dispatchUniversalAction(stgPacks,s,{type:'chooseTopOrder',uid},{actor:0});
 return s;
}

test('batch 10 adds other-character retirement draw and a five-name window',()=>{
 assert.ok(!V2_TITLE_IDS.includes('steins-gate'));
 assert.equal(STEINS_GATE_CARDS.filter(c=>c.engineKind).length,54);
 assert.equal(STEINS_GATE_CARDS.filter(c=>!c.engineKind).length,26);
 assert.equal(STEINS_GATE_BY_ID['STG-1-013'].effectJa,
  '【登場時】自分の場の他のキャラを1枚退場させてもよい。そうした場合、カードを2枚引く。');
 assert.deepEqual(stg.cards['STG-1-013'].effects.onPlay,[{
  op:'retireOwnCharacterOne',optional:true,excludeSelf:true,after:[{op:'draw',count:2}]
 }]);
 assert.equal(STEINS_GATE_BY_ID['STG-1-068'].effectJa,
  '【登場時】自分の山札の上から3枚見て、〈阿万音 鈴羽〉か〈岡部 倫太郎〉か〈椎名 まゆり〉か〈橋田 至〉か〈牧瀬 紅莉栖〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。');
 assert.deepEqual(stg.cards['STG-1-068'].effects.onPlay[0].filters.map(f=>f.value),LAB);
 assert.equal(stg.cards['STG-1-003'],undefined);
 assert.equal(stg.cards['STG-1-011'],undefined);
 assert.equal(STEINS_GATE_BY_ID['STG-1-003'].engineKind,null);
 const practice=steinsGatePracticeDeck();
 assert.equal(v2DeckReport('steins-gate',practice.counts).ok,true);
 const blocked=v2DeckReport('steins-gate',{...practice.counts,'STG-1-003':1,'STG-1-001':3});
 assert.equal(blocked.ok,false);
 assert.ok(blocked.issues.some(issue=>issue.includes('STG-1-003')));
 const editor=editorV2Status('steins-gate',practice.counts);
 assert.equal(editor.ready,true,editor.issues.join('；'));
 assert.equal(editor.registered,54);
});

test('six name filters stay rejected and a self-including draw follow-up stays the old profile',()=>{
 const base={id:'X',name:'X',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'six-names',cards:[{...base,effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',
  filters:['a','b','c','d','e','f'].map(value=>({field:'name',value}))
 }]}}]}),/invalid top-N filtered bottom\/discard profile/);
 assert.throws(()=>createUniversalPack({id:'bad-retire',cards:[{...base,effects:{onPlay:[{
  op:'retireOwnCharacterOne',optional:false,after:[{op:'draw',count:2}]
 }]}}]}),/invalid own character retirement and follow-up/);
});

test('STG-1-013 cannot retire itself, draws 2 only after another character leaves',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-013']),9013),'main');
 put(s,0,'STG-1-001','energy',0);
 put(s,0,'STG-1-007','energy',1);
 put(s,0,'STG-1-020','energy',2);
 const mayuri=put(s,0,'STG-1-014','front',0);
 const source=take(s,0,'STG-1-013');
 s.players[0].hand.push(source);
 readyAp(s);
 const deck=s.players[0].deck.length;
 s=playMain(stgPacks,s,source.uid);
 assert.equal(s.pending.kind,'effect-retire-own-character');
 const legal=legalUniversalActions(stgPacks,s);
 assert.ok(legal.some(a=>a.type==='chooseOwnCharacterRetire'&&a.uid===null));
 assert.ok(legal.some(a=>a.type==='chooseOwnCharacterRetire'&&a.uid===mayuri.uid));
 assert.equal(legal.some(a=>a.uid===source.uid),false);
 assert.throws(()=>dispatchUniversalAction(stgPacks,s,{type:'chooseOwnCharacterRetire',uid:source.uid},{actor:0}),
  /not currently legal/);
 const declined=dispatchUniversalAction(stgPacks,s,{type:'chooseOwnCharacterRetire',uid:null},{actor:0});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].deck.length,deck);
 assert.equal(declined.players[0].front[0].uid,mayuri.uid);
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseOwnCharacterRetire',uid:mayuri.uid},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===mayuri.uid));
 assert.equal(s.players[0].deck.length,deck-3);
 assert.equal(s.players[0].front.some(c=>c?.uid===source.uid),true);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-068 takes one of five names from the top three and discards only then',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-068']),9068),'main');
 put(s,0,'STG-1-057','energy',0);
 const window=['STG-1-001','STG-1-012','STG-1-053'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 const source=take(s,0,'STG-1-068');
 s.players[0].hand.push(source);
 readyAp(s);
 s=playMain(stgPacks,s,source.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(stgPacks,s,1)).includes(window[0].uid),false);
 assert.deepEqual(legalUniversalActions(stgPacks,s).filter(a=>a.uid).map(a=>a.uid),[window[0].uid]);
 const spare=s.players[0].hand.find(c=>c.uid!==source.uid);
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseTopFiltered',uid:window[0].uid},{actor:0});
 s=order(s,[window[1].uid,window[2].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseDiscard',uid:spare.uid},{actor:0});
 assert.ok(s.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[window[1].uid,window[2].uid]);

 let quiet=toPhase(stgPacks,fresh(deckWith(['STG-1-068']),9069),'main');
 put(quiet,0,'STG-1-057','energy',0);
 const miss=['STG-1-012','STG-1-032','STG-1-047'].map(id=>take(quiet,0,id));
 quiet.players[0].deck.unshift(...miss);
 const again=take(quiet,0,'STG-1-068');
 quiet.players[0].hand.push(again);
 readyAp(quiet);
 const hand=quiet.players[0].hand.length;
 quiet=playMain(stgPacks,quiet,again.uid);
 assert.equal(quiet.pending.kind,'effect-top-order');
 quiet=order(quiet,miss.map(c=>c.uid));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].hand.length,hand-1);
 assert.deepEqual(quiet.players[0].deck.slice(-3).map(c=>c.uid),miss.map(c=>c.uid));
 assert.equal(assertUniversalMatch(stgPacks,quiet),true);
});
