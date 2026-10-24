import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

// Independent JP printed oracle UA51BT/SLG-1-018. The V2 source catalogue
// localizes the Japanese trait 影の軍団 to the explicit string 影之軍團.
// OnPlay: TOP 3, name 水篠 旬 OR trait 影の軍団, 0..1 chosen, bottom
// order unselected, then one forced own-hand discard ONLY on adding a card.
// COLOR life: eligible OWN outside PURPLE CHARACTER energy<=2/AP1 => ACTIVE FRONT.
const slg=createSlgV2Pack(),packs=[slg,slg];
const counts=Object.fromEntries(['005','006','015','016','018','032','041','043','045','052','066','068'].map(id=>['SLG-1-'+id,4]));
counts['SLG-1-038']=2;
const take=(s,p,id)=>{
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],index=arr.findIndex(c=>c.cardId===id);
  if(index>=0)return arr.splice(index,1)[0];
 }
 throw Error('Missing physical fixture '+id);
};
function phase(s,name){
 for(let n=0;n<4&&s.phase!==name;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,name);return s;
}
function ready(top){
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:18018});
 const source=take(s,0,'SLG-1-018');s.players[0].hand.push(source);
 for(let i=0;i<3;i++){const g=take(s,0,'SLG-1-015');g.ready=true;s.players[0].energy[i]=g;}
 const window=top.map(id=>take(s,0,id));s.players[0].deck.unshift(...window);
 s=phase(s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,'SLG-018 needs printed PURPLE3 and AP1');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,play,source,window};
}
function chooseOrder(s,uids){
 for(const uid of uids){
  const a={type:'chooseTopOrder',uid};
  assert.ok(legalUniversalActions(packs,s).some(x=>x.type===a.type&&x.uid===uid));
  s=dispatchUniversalAction(packs,s,a,{actor:0});
 }
 return s;
}
test('018 literal official source and exact V2 OR search and separately declared COLOR Life',()=>{
 const c=SOLO_LEVELING_CARDS.find(x=>x.id==='SLG-1-018');
 assert.equal(c.number,'UA51BT/SLG-1-018');
 assert.equal(c.nameJa,'水篠 旬');assert.equal(c.energy,3);assert.equal(c.ap,1);
 assert.equal(c.bp,2500);assert.equal(c.gen,2);assert.equal(c.trigger,'color');
 assert.match(c.effect,/牌庫頂3張/);
 assert.match(c.effect,/水篠旬或影之軍團/);
 assert.deepEqual(slg.cards['SLG-1-018'].effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:3,
  filters:[{field:'name',value:'水篠 旬'},{field:'trait',value:'影之軍團'}],
  logic:'any'
 }]);
 assert.deepEqual(slg.cards['SLG-1-018'].triggerEffect,{
  op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true
 });
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.deepEqual(validateUniversalDeck(slg,counts),[]);
});
test('018 OR lets controller select a NAME or a TRAIT, never unrelated inspected card',()=>{
 let {s,play,window,source}=ready(['SLG-1-045','SLG-1-032','SLG-1-005']);
 const before=s.players[0].deck.map(c=>c.uid),hand=s.players[0].hand.length;
 const ap=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 s=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.equal(s.pending?.logic,'any');
 assert.deepEqual(s.pending?.filters,[{field:'name',value:'水篠 旬'},{field:'trait',value:'影之軍團'}]);
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseTopFiltered',uid:null},{type:'chooseTopFiltered',uid:window[0].uid},
  {type:'chooseTopFiltered',uid:window[1].uid}
 ]);
 assert.equal(s.players[0].deck.length,before.length,'LOOK at top3 does not move deck yet');
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,ap-1);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const mine=universalPrivateChoices(packs,s,0);
 assert.equal(mine.options.length,3);
 assert.equal(mine.options[1].card.cardId,'SLG-1-045');
 assert.equal(mine.options[2].card.cardId,'SLG-1-032');
 const enemy=universalPublicView(packs,s,1);
 assert.equal(enemy.players[0].hand,null);
 for(const card of window)assert.ok(!JSON.stringify(enemy).includes(JSON.stringify(card.uid)));
 for(const bad of [window[2].uid,source.uid,'1-999999']){
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:bad},{actor:0}),/not currently legal/);
 }
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid},{actor:1}),/Wrong player/);
 const original=structuredClone(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid},{actor:0});
 assert.deepEqual(original.players[0].deck.map(c=>c.uid),before,'input not mutated');
 assert.equal(s.pending?.kind,'effect-top-order');assert.equal(s.pending?.discardAfter,true);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[1].uid));
 const untouched=before.slice(3);
 s=chooseOrder(s,[window[2].uid,window[0].uid]);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...untouched,window[2].uid,window[0].uid]);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===window[1].uid),'newly obtained card may be discarded');
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:window[1].uid},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand-1,'play -1, pick +1, forced discard -1');
 assert.ok(s.players[0].outside.some(c=>c.uid===window[1].uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('018 OPTIONAL skip still puts three examined cards on BOTTOM in chosen order, no discard',()=>{
 let {s,play,window}=ready(['SLG-1-045','SLG-1-032','SLG-1-005']);
 const deck=s.players[0].deck.map(c=>c.uid),hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,play);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.equal(s.pending?.discardAfter,undefined);
 const order=[window[1].uid,window[0].uid,window[2].uid];
 s=chooseOrder(s,order);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...deck.slice(3),...order]);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('018 with no match among TOP3 must not search matching fourth card or discard',()=>{
 let {s,play,window}=ready(['SLG-1-005','SLG-1-006','SLG-1-041']);
 const fourth=take(s,0,'SLG-1-032');s.players[0].deck.splice(3,0,fourth);
 const deck=s.players[0].deck.map(c=>c.uid),hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-top-order','no eligible inspected cards');
 assert.deepEqual(s.pending?.uids,window.map(c=>c.uid));
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.uid===fourth.uid));
 const order=window.map(c=>c.uid).reverse();
 s=chooseOrder(s,order);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...deck.slice(3),...order]);
 assert.equal(s.players[0].deck[0].uid,fourth.uid);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('018 COLOR Life from OWN OUTSIDE: only purple AP1 <=2 to ACTIVE front at ZERO AP',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:1,seed:18019});
 const revealed=take(s,0,'SLG-1-018'),eligible=take(s,0,'SLG-1-005'),
  tooExpensive=take(s,0,'SLG-1-016'),foe=take(s,1,'SLG-1-005'),
  attacker=take(s,1,'SLG-1-015');
 s.players[0].deck.push(s.players[0].life.shift());s.players[0].life.unshift(revealed);
 s.players[0].outside.push(eligible,tooExpensive);s.players[1].outside.push(foe);
 attacker.ready=true;s.players[1].front[0]=attacker;
 s=phase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');assert.equal(s.pending?.trigger,'color');
 const opts=legalUniversalActions(packs,s);
 const action=opts.find(x=>x.type==='chooseTrigger'&&x.mode==='colorOutside'&&
   x.uid===eligible.uid&&x.line==='front'&&x.slot===0);
 assert.ok(action);
 assert.ok(opts.some(x=>x.type==='chooseTrigger'&&x.mode==='skip'));
 assert.ok(!opts.some(x=>x.uid===foe.uid||x.uid===tooExpensive.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{...action,uid:foe.uid},{actor:0}),/not currently legal/);
 const ap=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,original=structuredClone(s);
 const done=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.deepEqual(s,original);
 assert.equal(done.players[0].front[0].uid,eligible.uid);
 assert.equal(done.players[0].front[0].ready,true);
 assert.equal(done.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,ap);
 assert.ok(done.players[0].outside.some(c=>c.uid===revealed.uid));
 assert.ok(!done.players[0].outside.some(c=>c.uid===eligible.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
 const skip=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skip.players[0].front[0],null);
 assert.equal(assertUniversalMatch(packs,skip),true);
});
test('strict shared OR filter rejects malformed OR, duplicates, fake extra args, unbounded TOP N',()=>{
 const basic={id:'TEST',name:'Test',type:'character',color:'purple',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl'};
 const make=(action)=>createUniversalPack({id:'strict-case',cards:[{...basic,templateEffects:{onPlay:[action]}}]});
 const good={template:'searchTopOneBottomDiscardWhere',count:3,
  filters:[{field:'name',value:'A'},{field:'trait',value:'B'}],logic:'any'};
 assert.deepEqual(make(good).cards.TEST.effects.onPlay,[{op:'searchTopOneBottomDiscard',
  count:3,filters:good.filters,logic:'any'}]);
 for(const bad of [
  {...good,count:6},{...good,logic:'xor'},{...good,shuffle:true},
  {...good,filters:[good.filters[0]]},
  {...good,filters:[good.filters[0],good.filters[0]]},
  {...good,filters:[{field:'name',value:'A'},{field:'wrong',value:'B'}]},
  {...good,filters:[{field:'name',value:'A'},{field:'trait',value:''}]}
 ])assert.throws(()=>make(bad),/invalid|incompatible/);
 assert.throws(()=>createUniversalPack({id:'raw-bypass',cards:[{
  ...basic,effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,
   filters:good.filters,logic:'any',shuffle:true}]}
 }]}),/invalid/);
});
