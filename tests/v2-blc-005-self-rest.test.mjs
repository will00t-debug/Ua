import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// Independently authored exact source: UA08BT/BLC-1-005, キルゲ・オピー.
// Official printed main ability: front-only, pay this READY card's REST;
// then choose exactly ONE opposing front-line character and REST it.
const bleach=createBleachV2Pack(),ttg=createTtgV2Pack();
const decks={
 'BLC-1-005':4,'BLC-1-002':4,'BLC-1-012':4,'BLC-1-018':4,
 'BLC-1-021':4,'BLC-1-071':4,'BLC-1-083':4,'BLC-1-086':4,
 'BLC-1-089':4,'BLC-1-017':4,'BLC-1-102':4,'BLC-1-039':4,
 'BLC-1-075':2
};
const ttgDeck=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
ttgDeck['TTG-1-036']=2;
const grab=(s,p,id)=>{
 for(const zone of ['hand','deck','life','outside']){
  const index=s.players[p][zone].findIndex(c=>c.cardId===id);
  if(index>=0)return s.players[p][zone].splice(index,1)[0];
 }
 throw Error('Missing physical '+id);
};
const main=(packs,s)=>{
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
};
function fixture({cross=false}={}){
 const packs=cross?[bleach,ttg]:[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[decks,cross?ttgDeck:decks],first:0,seed:5005});
 const source=grab(s,0,'BLC-1-005'),enemy=grab(s,1,cross?'TTG-1-042':'BLC-1-002');
 source.ready=true;enemy.ready=true;
 s.players[0].front[0]=source;s.players[1].front[0]=enemy;
 s=main(packs,s);
 return {packs,s,source,enemy};
}
const option=(packs,s,uid)=>legalUniversalActions(packs,s).find(a=>
 a.type==='activate'&&a.mode==='selfRestEnemy'&&a.uid===uid);

test('BLC-1-005 official printed ID, stats, evidence, unmodified no-life trigger, and strict main profile',()=>{
 const old=CARDS.find(c=>c.identity==='BLC-1-005'),printed=bleach.cards['BLC-1-005'];
 assert.ok(old.source.includes('UA08BT%2FBLC-1-005'));
 assert.equal(old.nameJa,'キルゲ・オピー');
 assert.equal(old.effect,'主要階段・位於前線：REST 自己，選 1 個敵方前線角色，將其轉為 REST。');
 assert.equal(old.energy,2);assert.equal(old.ap,1);assert.equal(old.bp,3000);
 assert.equal(old.gen,1);assert.equal(old.color,'yellow');assert.equal(old.trigger,null);
 assert.ok(printed);
 assert.equal(printed.implementation,'dsl');
 assert.deepEqual(printed.effects,{});
 assert.deepEqual(printed.mainAbility,{op:'restSelfThenRestOppFrontOne',frontOnly:true});
 assert.equal(printed.trigger,null);
 assert.equal(Object.keys(bleach.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.deepEqual(validateUniversalDeck(bleach,decks),[]);
});

test('BLC-1-005 self REST is paid BEFORE mandatory one-target choice; AP unchanged; UID conserved',()=>{
 let {packs,s,source,enemy}=fixture();
 const activate=option(packs,s,source.uid);
 assert.ok(activate);
 const priorAp=s.players[0].apCards.filter(c=>c.ready).length,original=structuredClone(s);
 let paid=dispatchUniversalAction(packs,s,activate,{actor:0});
 assert.deepEqual(s,original);
 assert.equal(paid.players[0].front[0].ready,false,'paid its own REST immediately');
 assert.equal(paid.players[1].front[0].ready,true,'target not rested until chosen');
 assert.equal(paid.players[0].apCards.filter(c=>c.ready).length,priorAp,'activation is not a second AP cost');
 assert.deepEqual(paid.mainAbilityUsedUids,[],'no printed per-turn limit, do not impose one');
 assert.equal(paid.pending?.kind,'effect-rest-bp');
 assert.equal(paid.pending?.player,0);
 assert.equal(paid.pending?.sourceUid,source.uid);
 assert.equal(paid.pending?.optional,false);
 assert.deepEqual(legalUniversalActions(packs,paid),[{type:'chooseRestBp',uid:enemy.uid}]);
 const previous=structuredClone(paid);
 for(const bad of [
  {type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:source.uid},
  {type:'chooseRestBp',uid:'1-999999'}
 ]){
  assert.throws(()=>dispatchUniversalAction(packs,paid,bad,{actor:0}),/not currently legal/);
  assert.deepEqual(paid,previous);
 }
 assert.throws(()=>dispatchUniversalAction(packs,paid,{type:'chooseRestBp',uid:enemy.uid},{actor:1}),/Wrong player/);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseRestBp',uid:enemy.uid},{actor:0});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[1].front[0].ready,false);
 assert.equal(paid.players[0].front[0].uid,source.uid);
 assert.equal(paid.players[1].front[0].uid,enemy.uid);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.ok(!option(packs,paid,source.uid),'spent source cannot pay REST again while REST');
});

test('source must be READY, on OWN front, during MAIN, with existing opponent front-line target',()=>{
 const {packs,s,source,enemy}=fixture();
 const cases={
  ownRest:q=>{q.players[0].front[0].ready=false;},
  energyLine:q=>{q.players[0].energy[0]=q.players[0].front[0];q.players[0].front[0]=null;},
  emptyOpponentFront:q=>{q.players[1].hand.push(q.players[1].front[0]);q.players[1].front[0]=null;},
  wrongPhase:q=>{q.phase='attack';}
 };
 for(const [name,change] of Object.entries(cases)){
  const q=structuredClone(s);change(q);
  assert.equal(assertUniversalMatch(packs,q),true,name+' must preserve actual physical UIDs');
  assert.equal(option(packs,q,source.uid),undefined,name);
  assert.throws(()=>dispatchUniversalAction(packs,q,{type:'activate',uid:source.uid,mode:'selfRestEnemy'},{actor:0}),/not currently legal/,name);
 }
 // Opponent ENERGY characters or our own front cannot substitute for a foe FRONT target.
 const q=structuredClone(s);
 q.players[1].energy[0]=q.players[1].front[0];q.players[1].front[0]=null;
 assert.equal(assertUniversalMatch(packs,q),true);
 assert.equal(option(packs,q,source.uid),undefined);
 assert.ok(enemy.uid);
});

test('opponent front UID choice is exact; never targets own field or enemy energy or offers skip',()=>{
 let {packs,s,source,enemy}=fixture();
 const second=grab(s,1,'BLC-1-012');second.ready=true;s.players[1].front[1]=second;
 const energy=grab(s,1,'BLC-1-018');energy.ready=true;s.players[1].energy[0]=energy;
 const own=grab(s,0,'BLC-1-012');own.ready=true;s.players[0].front[1]=own;
 const action=option(packs,s,source.uid);
 const pending=dispatchUniversalAction(packs,s,action);
 assert.deepEqual(legalUniversalActions(packs,pending),[
  {type:'chooseRestBp',uid:enemy.uid},{type:'chooseRestBp',uid:second.uid}
 ]);
 for(const uid of [energy.uid,own.uid,source.uid,null]){
  assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid},{actor:0}),/not currently legal/);
 }
 const resolved=dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:second.uid},{actor:0});
 assert.equal(resolved.players[1].front[0].ready,true);
 assert.equal(resolved.players[1].front[1].ready,false);
 assert.equal(resolved.players[1].energy[0].ready,true);
 assert.equal(assertUniversalMatch(packs,resolved),true);
});

test('normal and hard AI preserve self when all targets REST, then prefer a READY target',()=>{
 for(const difficulty of ['normal','hard']){
  const allRest=fixture();
  allRest.s.players[1].front[0].ready=false;
  assert.ok(option(allRest.packs,allRest.s,allRest.source.uid),
   'Q91 keeps an already-RESTed opposing front character rules-legal');
  const action=chooseUniversalAiAction(allRest.packs,allRest.s,{difficulty});
  assert.notEqual(action?.mode,'selfRestEnemy',difficulty+' must not waste its source REST');

  const mixed=fixture();
  mixed.s.players[1].front[0].ready=false;
  const ready=grab(mixed.s,1,'BLC-1-012');
  ready.ready=true;mixed.s.players[1].front[1]=ready;
  const paid=dispatchUniversalAction(mixed.packs,mixed.s,
   option(mixed.packs,mixed.s,mixed.source.uid));
  assert.deepEqual(legalUniversalActions(mixed.packs,paid),[
   {type:'chooseRestBp',uid:mixed.enemy.uid},{type:'chooseRestBp',uid:ready.uid}
  ]);
  assert.deepEqual(chooseUniversalAiAction(mixed.packs,paid,{difficulty}),
   {type:'chooseRestBp',uid:ready.uid},difficulty+' must prefer a READY target');
 }
});

test('no AP needed to activate main self-REST; does not consume hidden hand or public UID',()=>{
 const {packs,s,source,enemy}=fixture();
 for(const ap of s.players[0].apCards)ap.ready=false;
 assert.ok(option(packs,s,source.uid),'main activated by REST, not spending AP');
 const beforeHand=s.players[0].hand.map(c=>c.uid),beforeDeck=s.players[0].deck.map(c=>c.uid);
 const paid=dispatchUniversalAction(packs,s,option(packs,s,source.uid));
 assert.deepEqual(paid.players[0].hand.map(c=>c.uid),beforeHand);
 assert.deepEqual(paid.players[0].deck.map(c=>c.uid),beforeDeck);
 assert.equal(universalPublicView(packs,paid,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.ok(enemy.uid);
});

test('BLC-005 opponent-target selection uses physical OWNER title in cross-title match',()=>{
 let {packs,s,source,enemy}=fixture({cross:true});
 const paid=dispatchUniversalAction(packs,s,option(packs,s,source.uid));
 assert.deepEqual(legalUniversalActions(packs,paid),[{type:'chooseRestBp',uid:enemy.uid}]);
 const done=dispatchUniversalAction(packs,paid,{type:'chooseRestBp',uid:enemy.uid});
 assert.equal(done.players[1].front[0].cardId,'TTG-1-042');
 assert.equal(done.players[1].front[0].ready,false);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('strict verifier rejects invented main costs, event source, missing front gate, and other ops',()=>{
 const base={id:'TEST',name:'Test',type:'character',color:'yellow',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',mainAbility:{op:'restSelfThenRestOppFrontOne',frontOnly:true}};
 assert.ok(createUniversalPack({id:'test-ability',cards:[base]}).cards.TEST);
 for(const bad of [
  {...base,type:'event',bp:0},
  {...base,mainAbility:{op:'restSelfThenRestOppFrontOne',frontOnly:false}},
  {...base,mainAbility:{op:'restSelfThenRestOppFrontOne',frontOnly:true,apCost:1}},
  {...base,mainAbility:{op:'restSelfThenRestOppFrontOne',frontOnly:true,oncePerTurn:true}},
  {...base,mainAbility:{op:'restSelfThenRestOppEnergy',frontOnly:true}}
 ])assert.throws(()=>createUniversalPack({id:'negative-main',cards:[bad]}),/unsupported main action ability/);
});
