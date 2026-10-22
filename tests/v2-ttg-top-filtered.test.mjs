import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

// Independent exact official oracles: UA56BT/TTG-1-010 and -023.
// 010: green1/AP1, TOP 3, 大グレン団, DRAW Life.
// 023: green2/AP1, TOP 5, ガンメン, no Life.
// Both: choose 0..1 matching UID into hand, order ALL remaining on BOTTOM;
// only after taking a card do they force exactly one OWN hand discard.
const pack=createTtgV2Pack(),packs=[pack,pack];
const counts=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
counts['TTG-1-001']=0;counts['TTG-1-014']=0;counts['TTG-1-009']=0;
counts['TTG-1-010']=4;counts['TTG-1-023']=4;counts['TTG-1-077']=4;
counts['TTG-1-036']=2;
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const i=s.players[p][z].findIndex(c=>c.cardId===id);
  if(i>=0)return s.players[p][z].splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function setup(id,topIds){
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:10235});
 const source=take(s,0,id);s.players[0].hand.push(source);
 for(let i=0;i<2;i++){const g=take(s,0,'TTG-1-005');g.ready=true;s.players[0].energy[i]=g;}
 const window=topIds.map(cardId=>take(s,0,cardId));
 s.players[0].deck.unshift(...window);
 for(let n=0;n<4&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,id+' must require its PRINTED green energy and one AP');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,source,window,play};
}
function order(s,uids){
 for(const uid of uids){
  assert.ok(legalUniversalActions(packs,s).some(x=>x.type==='chooseTopOrder'&&x.uid===uid));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
test('independent official cards and restricted top filter profiles compile, never shuffled entire deck',()=>{
 for(const [id,energy,n,trait,trigger] of [
  ['TTG-1-010',1,3,'大グレン団','draw'],
  ['TTG-1-023',2,5,'ガンメン',null]
 ]){
  const printed=TTG_BY_ID[id],v2=pack.cards[id];
  assert.equal(printed.number,'UA56BT/'+id);
  assert.equal(printed.energy,energy);assert.equal(printed.ap,1);
  assert.equal(printed.trigger,trigger);
  assert.ok(printed.source.includes('unionarena-tcg.com/jp/cardlist/'));
  assert.deepEqual(v2.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:n,filter:{field:'trait',value:trait}}]);
  assert.equal(v2.trigger,trigger);
  assert.equal(v2.type,'character');
 }
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS['gurren-lagann']);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
});
test('023 filters exact TOP5 for ガンメン, then orders other four to BOTTOM before conditional discard',()=>{
 let {s,play,source,window}=setup('TTG-1-023',['TTG-1-005','TTG-1-077','TTG-1-042','TTG-1-019','TTG-1-049']);
 const oldDeck=s.players[0].deck.map(c=>c.uid);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.equal(s.players[0].deck.length,oldDeck.length);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),oldDeck);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseTopFiltered',uid:null},
  {type:'chooseTopFiltered',uid:window[1].uid}
 ]);
 const own=universalPrivateChoices(packs,s,0),enemy=universalPublicView(packs,s,1);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(own.options.length,2);
 assert.equal(own.options[1].card.cardId,'TTG-1-077');
 assert.equal(enemy.players[0].hand,null);
 for(const uid of window.map(c=>c.uid))assert.ok(!JSON.stringify(enemy).includes(JSON.stringify(uid)));
 const snapshot=structuredClone(s);
 for(const bad of [window[0].uid,window[2].uid,'1-99999']){
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:bad}),/not currently legal/);
  assert.deepEqual(s,snapshot);
 }
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid},{actor:1}),/Wrong player/);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid},{actor:0});
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.equal(s.pending?.discardAfter,true);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[1].uid));
 const rest=[window[0].uid,window[2].uid,window[3].uid,window[4].uid];
 const ordered=[rest[3],rest[1],rest[0],rest[2]];
 const untouched=oldDeck.slice(5);
 s=order(s,ordered);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...untouched,...ordered],
  'NO shuffle: untouched deck order preserved, inspected leftovers bottom in chosen order');
 assert.equal(s.pending?.kind,'effect-discard','mandatory discard only AFTER ordering');
 const discardOptions=legalUniversalActions(packs,s);
 assert.ok(discardOptions.length>0&&discardOptions.every(a=>a.type==='chooseDiscard'&&a.uid!==null));
 assert.ok(discardOptions.some(a=>a.uid===window[1].uid),'may discard newly added hand card');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:null}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:window[1].uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===window[1].uid));
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('010 TOP3 optional skip still orders ALL to bottom without DISCARD',()=>{
 let {s,play,window}=setup('TTG-1-010',['TTG-1-005','TTG-1-019','TTG-1-049']);
 const initialDeck=s.players[0].deck.map(c=>c.uid),initialHand=s.players[0].hand.length;
 const outside=s.players[0].outside.length;
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.equal(s.pending?.choices.length,3,'all three printed 大グレン団 match');
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.equal(s.pending?.discardAfter,undefined);
 const orderUids=[window[2].uid,window[0].uid,window[1].uid];
 s=order(s,orderUids);
 assert.equal(s.pending,null,'declined addition must not ask for a discard');
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...initialDeck.slice(3),...orderUids]);
 assert.equal(s.players[0].hand.length,initialHand-1,'only the played 010 left hand');
 assert.equal(s.players[0].outside.length,outside);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('023 with NO Gunmen in inspected TOP5 still orders bottom, never inspects sixth card or discards',()=>{
 let {s,play,window}=setup('TTG-1-023',['TTG-1-005','TTG-1-010','TTG-1-019','TTG-1-042','TTG-1-049']);
 const sixth=take(s,0,'TTG-1-077');
 s.players[0].deck.splice(5,0,sixth);
 const oldDeck=s.players[0].deck.map(c=>c.uid),oldHand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.deepEqual(s.pending?.uids,window.map(c=>c.uid),'only TOP5, not eligible sixth UID');
 const orderUids=window.map(c=>c.uid).reverse();
 s=order(s,orderUids);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...oldDeck.slice(5),...orderUids]);
 assert.equal(s.players[0].deck[0].uid,sixth.uid);
 assert.equal(s.players[0].hand.length,oldHand-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('010 successful selection can choose another hand card for mandatory discard',()=>{
 let {s,play,window}=setup('TTG-1-010',['TTG-1-005','TTG-1-019','TTG-1-049']);
 const hand=s.players[0].hand.find(c=>c.uid!==play.uid);
 assert.ok(hand);
 s=dispatchUniversalAction(packs,s,play);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[2].uid});
 s=order(s,[window[1].uid,window[0].uid]);
 assert.equal(s.pending?.kind,'effect-discard');
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:'0-9999'}),/not currently legal/);
 assert.deepEqual(s,before);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:hand.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===hand.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===window[2].uid),'selected match stays in hand');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('top-N filtered program rejects invented fields, invalid filters and unported variants',()=>{
 const base={id:'TEST',name:'Tester',color:'green',energy:0,ap:1,bp:1500,gen:1,type:'character',
  implementation:'dsl',templateEffects:{onPlay:[{template:'searchTopOneBottomDiscard',count:3,
   filter:{field:'trait',value:'大グレン団'}}]}};
 assert.ok(createUniversalPack({id:'test',cards:[base]}).cards.TEST);
 for(const program of [
  {template:'searchTopOneBottomDiscard',count:6,filter:{field:'trait',value:'大グレン団'}},
  {template:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:'大グレン団'},shuffle:true},
  {template:'searchTopOneBottomDiscard',count:3,filter:{field:'unknown',value:'大グレン団'}},
  {template:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:''}}
 ])assert.throws(()=>createUniversalPack({id:'invalid',cards:[{...base,
   templateEffects:{onPlay:[program]}}]}),/invalid/);
});
