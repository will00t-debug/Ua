import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// R31: registered official-card source and independent manifest.
// Engine and DSL are existing cross-title primitives: no SAO reducer branch.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-005
const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-005');
const exact='【登場時】自分の山札の上から4枚見る。その中から〈キリト〉か〈アリス〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。';
assert.equal(source.effectJa,exact);
const pack=registeredV2TitlePack('sword-art-online');
const packs=[pack,pack];
const ids=['SAO-1-005','SAO-1-001','SAO-1-010','SAO-1-011','SAO-1-004',
 'SAO-1-019','SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-073',
 'SAO-1-077','SAO-2-016','SAO-2-003'];
const deck=Object.fromEntries(ids.map(id=>[id,4]));
deck['SAO-1-020']=2;
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const q=s.players[p][zone],i=q.findIndex(c=>c.cardId===id);
  if(i>=0)return q.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function setup(top,withEnergy=true){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:31005});
 const source=take(s,0,'SAO-1-005');
 s.players[0].hand.push(source);
 if(withEnergy)for(let i=0;i<2;i++){
  const generator=take(s,0,'SAO-1-001');
  generator.ready=true;s.players[0].energy[i]=generator;
 }
 const window=top.map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 for(let i=0;i<4&&s.phase!=='main';i++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,source,window};
}
function play(s,source){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'correct printed AP/energy legal play');
 return dispatchUniversalAction(packs,s,action);
}
function arrange(s,order){
 for(const uid of order){
  assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseTopOrder'&&a.uid===uid));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
test('R31 SAO 005 printed 2 energy / 1 AP / 3000 BP; exact OR names, not trait',()=>{
 assert.equal(source.color,'yellow');assert.equal(source.energy,2);
 assert.equal(source.ap,1);assert.equal(source.bp,3000);
 assert.equal(source.gen,1);assert.equal(source.trigger,null);
 assert.deepEqual(pack.cards['SAO-1-005'].effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:4,
  filters:[{field:'name',value:'キリト'},{field:'name',value:'アリス'}],logic:'any'}]);
 assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-005'),true,
  'this official printed ability must be included in independent manifest');
});
test('R31 two printed names and Alice alias; return at most one; bottom order then contingent discard',()=>{
 let {s,source,window}=setup(['SAO-1-001','SAO-1-010','SAO-1-004','SAO-1-019']);
 const before=s.players[0].deck.map(c=>c.uid);
 s=play(s,source);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.uid),
  [null,window[0].uid,window[1].uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 for(const difficulty of ['normal','hard'])
  assert.ok(legalUniversalActions(packs,s).some(a=>
   JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 const untouched=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[2].uid}),/not currently legal/);
 assert.deepEqual(s,untouched);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid});
 assert.deepEqual(universalPublicView(packs,s,1).publicReveals,[{
  kind:'searched-to-hand',owner:0,title:'sword-art-online',
  cardId:'SAO-1-010',uid:window[1].uid,trigger:null,turn:s.turn
 }],'only chosen alias UID publicly revealed; other inspected cards stay private');
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(s.pending.kind,'effect-top-order');
 s=JSON.parse(JSON.stringify(s));
 assert.equal(assertUniversalMatch(packs,s),true);
 s=arrange(s,[window[3].uid,window[0].uid,window[2].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),
  [...before.slice(4),window[3].uid,window[0].uid,window[2].uid]);
 const discard=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard'&&a.uid===window[1].uid);
 assert.ok(discard);
 s=dispatchUniversalAction(packs,s,discard);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===window[1].uid));
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R31 optional zero take keeps four bottom cards, no discard; no accidental name broadening',()=>{
 let {s,source,window}=setup(['SAO-1-004','SAO-1-019','SAO-1-073','SAO-2-016']);
 const deckBefore=s.players[0].deck.map(c=>c.uid);
 s=play(s,source);
 assert.deepEqual(universalPublicView(packs,s,1).publicReveals,[],
  'no-match may not reveal any inspected deck card');
 // No valid printed name; all four are ordered even without a selection.
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.pending.discardAfter,undefined);
 const handAfterPlay=s.players[0].hand.length, outsideAfterPlay=s.players[0].outside.length;
 s=arrange(s,[window[2].uid,window[0].uid,window[3].uid,window[1].uid]);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handAfterPlay);
 assert.equal(s.players[0].outside.length,outsideAfterPlay);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),
  [...deckBefore.slice(4),window[2].uid,window[0].uid,window[3].uid,window[1].uid]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R31 cannot play without two yellow energy; no fabricated UID or cross-owner top selection',()=>{
 const absent=setup(['SAO-1-001','SAO-1-010','SAO-1-004','SAO-1-019'],false);
 assert.equal(legalUniversalActions(packs,absent.s).some(a=>a.type==='play'&&a.uid===absent.source.uid),false);
 let {s,source,window}=setup(['SAO-1-001','SAO-1-010','SAO-1-004','SAO-1-019']);
 s=play(s,source);
 const before=structuredClone(s);
 for(const uid of ['0-forged',s.players[1].hand[0].uid,window[2].uid]){
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid}),/not currently legal/);
  assert.deepEqual(s,before);
 }
 assert.equal(assertUniversalMatch(packs,s),true);
});


test('R31 optional zero take with qualifying Kirito AND Alice still orders all four bottom and discloses neither',()=>{
 let {s,source,window}=setup(['SAO-1-001','SAO-1-010','SAO-1-004','SAO-1-019']);
 const before=s.players[0].deck.map(c=>c.uid);
 s=play(s,source);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.uid),
  [null,window[0].uid,window[1].uid]);
 const hand=s.players[0].hand.length,outside=s.players[0].outside.length;
 const optionalSkip={type:'chooseTopFiltered',uid:null};
 s=dispatchUniversalAction(packs,s,optionalSkip);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.pending.discardAfter,undefined);
 assert.deepEqual(universalPublicView(packs,s,1).publicReveals,[]);
 s=arrange(s,[window[3].uid,window[2].uid,window[0].uid,window[1].uid]);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),
  [...before.slice(4),window[3].uid,window[2].uid,window[0].uid,window[1].uid]);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].outside.length,outside);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R31 selecting Kirito and another physical UID proves OR predicate and one-only public reveal',()=>{
 let {s,source,window}=setup(['SAO-1-001','SAO-1-010','SAO-1-004','SAO-1-019']);
 s=play(s,source);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[0].uid});
 const reveals=universalPublicView(packs,s,1).publicReveals;
 assert.equal(reveals.length,1);
 assert.equal(reveals[0].uid,window[0].uid);
 assert.equal(reveals[0].cardId,'SAO-1-001');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 s=arrange(s,[window[1].uid,window[3].uid,window[2].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 const paid=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard'&&a.uid===window[0].uid);
 assert.ok(paid);
 s=dispatchUniversalAction(packs,s,paid);
 assert.ok(s.players[0].outside.some(c=>c.uid===window[0].uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
