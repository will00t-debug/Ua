import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const source=CARDS.find(c=>c.identity==='BLC-2-019'),event=CARDS.find(c=>c.identity==='BLC-2-047');
assert.ok(source&&event,'official ID source data');
const sourceName=source.nameJa;
const payment={zone:'hand',field:'name',match:'containsAny',values:['斬月','月牙']};
const defs=Array.from({length:13},(_,i)=>({
 id:i===0?'BLC-2-019':i===1?'BLC-2-047':i===2?'BASE':'F'+i,
 name:i===0?sourceName:i===1?event.nameJa:i===2?sourceName:'Utility '+i,
 type:i===1?'event':'character',color:'blue',energy:i===0?source.energy:i===1?event.energy:0,
 ap:1,bp:i===0?source.bp:i===1?0:3000,gen:i===1?0:1,
 implementation:i<2?'dsl':'vanilla',
 ...(i===0?{trigger:'raid',raidName:sourceName,
  effects:{onPlay:[{op:'enemyBpDown',bp:1500,minBp:2000,maxTargets:2,optional:true}]},
  mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,payment,then:[
    {op:'draw',count:1},{op:'buffSelf',bp:1000},
    {op:'grantOnAttack',target:'self',optional:true,until:'endOfTurn',then:[{op:'draw',count:1}]}
   ]}]}}:{}),
 ...(i===1?{effects:{onPlay:[{op:'draw',count:2}]},
  moveTriggers:[{when:{from:'hand',to:'outside',sourceName,sourceColor:'blue',
   sourceOnField:true,reasons:['payment','own-effect']},then:[{op:'draw',count:1}]}]}:{})
}));
const pack=createUniversalPack({id:'blc-019-047-source-pilot-unregistered',cards:defs}),packs=[pack,pack];
const deck=Object.fromEntries(defs.map((d,i)=>[d.id,i===12?2:4]));
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('missing '+id);
}
function prepared(withRaid){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:25047});
 const raid=pull(s,0,'BLC-2-019'),base=pull(s,0,'BASE');
 s.players[0].hand.push(raid);base.ready=false;s.players[0].front[0]=base;
 for(const [i,id] of ['F3','F4','F5','F6'].entries()){
  const e=pull(s,0,id);e.ready=true;s.players[0].energy[i]=e;
 }
 for(const [i,id] of ['F7','F8'].entries()){
  const e=pull(s,1,id);e.ready=true;s.players[1].front[i]=e;
 }
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return {s,raid,base};
}
test('official 019/047 source signatures stay locked after whole-print registration',()=>{
 assert.deepEqual([source.nameJa,source.color,source.energy,source.ap,source.bp,source.gen,source.type,source.trigger],
  ['黒崎 一護','blue',4,1,4000,1,'character','raid']);
 assert.deepEqual([event.nameJa,event.color,event.energy,event.ap,event.type,event.trigger],
  ['その名は斬月','blue',2,1,'event',null]);
 assert.ok(source.effect.includes('斬月')&&source.effect.includes('月牙')&&source.effect.includes('1500'));
 assert.ok(event.effect.includes('抽 2 張')&&event.effect.includes('抽 1 張'));
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 const registered=registeredV2TitlePack('bleach').cards;
 assert.equal(registered['BLC-2-019'].raidName,'黒崎 一護');
 assert.equal(registered['BLC-2-047'].moveTriggers[0].then[0].op,'draw');
});
test('official-anchored pilot: 4 blue energy and 1 AP legal Raid plus two exact eligible BP targets',()=>{
 let {s,raid,base}=prepared(true);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===raid.uid&&a.baseUid===base.uid);
 assert.ok(action,'Raid requires the printed energy and an actual compatible base');
 const ap=s.players[0].apCards.filter(x=>x.ready).length;
 s=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap-1);
 assert.equal(s.players[0].front[0].uid,raid.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(s.pending.kind,'effect-target-many');
 const uids=s.players[1].front.slice(0,2).map(c=>c.uid);
 for(const uid of uids)s=dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid},{actor:0});
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[1].front.slice(0,2).map(c=>universalBp(packs,s,c)),[1500,1500]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('official-anchored pilot: ordinary AP-paid 047 event draws two, not movement bonus',()=>{
 let {s}=prepared();
 const eventCard=pull(s,0,'BLC-2-047');s.players[0].hand.push(eventCard);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===eventCard.uid);
 assert.ok(action);
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(s.players[0].deck.length,before-2);
 const moves=s.zoneMoveEvents.filter(x=>x.sourceUid===eventCard.uid&&x.from==='deck'&&x.to==='hand');
 assert.equal(moves.length,2);
 assert.equal(s.players[0].outside.some(x=>x.uid===eventCard.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('official 019-anchored RAID LIFE: reveal, legal color energy, optional FREE Raid and full onPlay target',()=>{
 let {s,raid,base}=prepared(true);
 const handIndex=s.players[0].hand.findIndex(c=>c.uid===raid.uid);
 assert.ok(handIndex>=0);
 s.players[0].hand.splice(handIndex,1);
 s.players[0].deck.push(s.players[0].life.shift());
 s.players[0].life.unshift(raid);
 for(let i=0;i<5;i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,'must reach actual opponent attack turn');
  s=dispatchUniversalAction(packs,s,next,{actor:s.pending?.player??s.active});
 }
 assert.equal(s.active,1);assert.equal(s.phase,'attack');
 const attacker=s.players[1].front[0];
 assert.ok(attacker?.ready);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 assert.equal(s.pending.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'raid');
 assert.equal(s.publicReveals.at(-1).uid,raid.uid);
 const actions=legalUniversalActions(packs,s);
 assert.ok(actions.some(a=>a.mode==='get'));
 assert.ok(actions.some(a=>a.mode==='skip'));
 const choice=actions.find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&
  a.baseUid===base.uid&&a.slot===0);
 assert.ok(choice,'RAID LIFE may Raid at generated blue4');
 const before=s.players[0].apCards.filter(a=>a.ready).length;
 const game=dispatchUniversalAction(packs,s,choice,{actor:0});
 assert.equal(game.players[0].apCards.filter(a=>a.ready).length,before,
  'RAID LIFE consumes no AP');
 assert.equal(game.players[0].front[0].uid,raid.uid);
 assert.equal(game.players[0].front[0].ready,true);
 assert.equal(game.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(game.pending.kind,'effect-target-many');
 assert.equal(assertUniversalMatch(packs,game),true);
 const declined=dispatchUniversalAction(packs,game,{type:'chooseTargetMany',uid:null},{actor:0});
 assert.equal(declined.pending,null);
 assert.equal(assertUniversalMatch(packs,declined),true);
 const added=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'get'},{actor:0});
 assert.equal(added.players[0].hand.some(c=>c.uid===raid.uid),true);
 assert.equal(added.players[0].front[0].uid,base.uid);
});
test('official Q1046: 047 effect-earned draw ignores its energy2 printed event cost',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:261046});
 const raid=pull(s,0,'BLC-2-019'),eventCard=pull(s,0,'BLC-2-047');
 // Field source has no FRONT energy generation; this is NOT a free event use.
 raid.fieldEntryStamp=s.nextFieldEntryStamp++;raid.ready=false;
 s.players[0].front[0]=raid;s.players[0].hand.push(eventCard);
 s.phase='main';
 assert.equal(s.players[0].energy.filter(Boolean).length,0);
 assert.equal(pack.cards['BLC-2-047'].energy,2);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===eventCard.uid));
 const action=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===raid.uid);
 assert.ok(action,'printed MAIN name payment is separate from event AP/energy');
 s=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(s.pending.kind,'effect-discard-gate');
 const ap=s.players[0].apCards.filter(x=>x.ready).length,before=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:eventCard.uid},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-2,'MAIN draws1, earned 047 draws1');
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap);
 assert.equal(s.zoneMoveEvents.filter(e=>e.from==='hand'&&e.to==='outside'&&
  e.uid===eventCard.uid&&e.sourceUid===raid.uid).length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});


// R28 true 50/50 physical decks, using the complete *isolated* 019/047 pilot
// and the same user/AI legal action grammar (never enabling production registry).
test('R28 BLEACH pilot: paid Raid -> two enemy BP -> named 047 MAIN -> earned bonus -> actual attack grant',async()=>{
 const {chooseUniversalAiAction}=await import('../dist/universal-v2/ai.mjs');
 let {s,raid,base}=prepared(true);
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 assert.equal(s.players[0].front[0].uid,base.uid);
 const eventCard=pull(s,0,'BLC-2-047');
 s.players[0].hand.push(eventCard);
 // Ready base models an actually playable Raid attack; do not add fictitious AP.
 s.players[0].front[0].ready=true;
 const raidAction=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
  a.uid===raid.uid&&a.baseUid===base.uid);
 assert.ok(raidAction);
 s=dispatchUniversalAction(packs,s,raidAction,{actor:0});
 assert.equal(s.players[0].front[0].uid,raid.uid);
 assert.equal(s.pending?.kind,'effect-target-many');
 const two=s.players[1].front.slice(0,2).map(c=>c.uid);
 for(const uid of two){
  const legal=legalUniversalActions(packs,s);
  assert.ok(legal.some(a=>a.type==='chooseTargetMany'&&a.uid===uid));
  for(const difficulty of ['normal','hard'])
   assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(
    chooseUniversalAiAction(packs,s,{difficulty}))));
  s=dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid},{actor:0});
 }
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[1].front.slice(0,2).map(c=>universalBp(packs,s,c)),[1500,1500]);
 const activation=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===raid.uid);
 assert.ok(activation,'onPlay must complete before MAIN activation');
 s=dispatchUniversalAction(packs,s,activation,{actor:0});
 assert.equal(s.pending?.kind,'effect-discard-gate');
 const before=s.players[0].deck.length;
 const paid=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscardGate'&&a.uid===eventCard.uid);
 assert.ok(paid);
 s=dispatchUniversalAction(packs,s,paid,{actor:0});
 assert.equal(s.pending,null,'entire source MAIN and earned Q1033 bonus completed');
 assert.equal(s.players[0].deck.length,before-2,'MAIN draw1 then 047 earned draw1');
 assert.equal(universalBp(packs,s,s.players[0].front[0]),5000);
 assert.equal(s.continuousStates.filter(c=>c.kind==='grantedOnAttack'&&c.targetUid===raid.uid).length,1);
 assert.equal(s.players[0].outside.some(c=>c.uid===eventCard.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===raid.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'next'},{actor:0});
 assert.equal(s.phase,'attack');
 const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===raid.uid);
 assert.ok(attack,'the granted attack ability must be used only on a real legal attack');
 const deckBeforeAttack=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,attack,{actor:0});
 assert.equal(s.pending?.kind,'granted-attack-draw');
 assert.equal(s.players[0].deck.length,deckBeforeAttack,'optional grant is not immediate MAIN draw');
 s=JSON.parse(JSON.stringify(s));
 assert.equal(assertUniversalMatch(packs,s),true);
 const offered=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard'])
  assert.ok(offered.some(a=>JSON.stringify(a)===JSON.stringify(
   chooseUniversalAiAction(packs,s,{difficulty}))));
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'draw'},{actor:0});
 assert.equal(s.players[0].deck.length,deckBeforeAttack-1);
 assert.equal(s.pending?.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);
});


// R29: two independently stamped blue Ichigo physical sources may earn one
// Q1033/Q1046 draw for two DIFFERENT physical 047 hand cards. This is a
// bounded already-on-field second source fixture; its entry/Raid is not
// claimed as an additional officially certified card play.
test('R29 source-qualified 019s pay two distinct physical 047 UIDs in order, once per source',async()=>{
 const {chooseUniversalAiAction}=await import('../dist/universal-v2/ai.mjs');
 let {s,raid,base}=prepared(true);
 const firstEvent=pull(s,0,'BLC-2-047'),secondEvent=pull(s,0,'BLC-2-047');
 s.players[0].hand.push(firstEvent,secondEvent);
 const firstPlay=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===raid.uid&&a.baseUid===base.uid);
 assert.ok(firstPlay);
 s=dispatchUniversalAction(packs,s,firstPlay,{actor:0});
 assert.equal(s.pending?.kind,'effect-target-many');
 s=dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid:null},{actor:0});
 const other=pull(s,0,'BLC-2-019');
 other.ready=true;other.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[1]=other;
 assert.equal(assertUniversalMatch(packs,s),true);
 const start=s.players[0].deck.length;
 for(const [who,moved,index] of [[raid,firstEvent,0],[other,secondEvent,1]]){
  const actions=legalUniversalActions(packs,s);
  const activate=actions.find(a=>a.type==='activate'&&a.uid===who.uid);
  assert.ok(activate,'an independent printed source still has its own once gate');
  s=dispatchUniversalAction(packs,s,activate,{actor:0});
  assert.equal(s.pending?.kind,'effect-discard-gate');
  const eligible=legalUniversalActions(packs,s);
  assert.ok(eligible.some(a=>a.uid===moved.uid));
  for(const difficulty of ['normal','hard'])
   assert.ok(eligible.some(a=>JSON.stringify(a)===JSON.stringify(
    chooseUniversalAiAction(packs,s,{difficulty}))));
  assert.throws(()=>dispatchUniversalAction(packs,s,
   {type:'chooseDiscardGate',uid:'forged-047'}, {actor:0}),/not currently legal/);
  const hand=s.players[0].hand.length;
  const snap=structuredClone(s);
  assert.throws(()=>dispatchUniversalAction(packs,s,
   {type:'chooseDiscardGate',uid:moved.uid},{actor:1}),/Wrong player/);
  assert.deepEqual(s,snap);
  s=JSON.parse(JSON.stringify(s));
  assert.equal(assertUniversalMatch(packs,s),true);
  s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:0});
  assert.equal(s.pending,null);
  assert.equal(s.players[0].hand.length,hand-1+2);
  assert.equal(s.players[0].deck.length,start-(index+1)*2);
  assert.equal(s.players[0].outside.filter(c=>c.uid===moved.uid).length,1);
  assert.equal(s.zoneMoveEvents.filter(e=>e.uid===moved.uid&&e.from==='hand'&&
   e.to==='outside'&&e.sourceUid===who.uid).length,1);
  assert.equal(s.zoneMoveEvents.filter(e=>e.sourceUid===moved.uid&&
   e.from==='deck'&&e.to==='hand').length,1,'each earned 047 physically draws once');
  assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===who.uid));
 }
 assert.equal(new Set([raid.uid,other.uid]).size,2);
 assert.equal(new Set([firstEvent.uid,secondEvent.uid]).size,2);
 assert.equal(s.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&
  [raid.uid,other.uid].includes(e.targetUid)).length,2);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(registeredV2TitlePack('bleach').cards['BLC-2-019'].raidName,'黒崎 一護');
 assert.equal(registeredV2TitlePack('bleach').cards['BLC-2-047'].effects.onPlay[0].count,2);
});
