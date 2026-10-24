import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';

const names=['ユウキ','マザーズ・ロザリオ'];
const basic=(id,name,bp=1500)=>({id,name,color:'green',type:'character',
 energy:0,ap:1,bp,gen:1,traits:[],effects:{},implementation:'vanilla'});
const rosario={id:'evt',name:names[1],color:'green',type:'event',energy:4,
 ap:1,bp:0,gen:0,traits:[],trigger:'special',triggerEffect:{op:'retireOppFront'},
 effects:{onPlay:[{op:'conditionalBounceOrRetireByOwnOutsideNames',
  bp:5000,min:3,names}]},implementation:'dsl'};
const cards=[rosario,basic('yuuki',names[0]),basic('other','other',3000),
 ...Array.from({length:10},(_,i)=>basic('f'+i,'f'+i))];
const pack=createUniversalPack({id:'r52-conditional-bounce-retire',cards});
const deck=Object.fromEntries(Object.keys(pack.cards).map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const packs=[pack,pack];
const use=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,p,id){
 for(const z of ['hand','deck','life']){
  const pool=s.players[p][z],i=pool.findIndex(x=>x.cardId===id);
  if(i>=0)return pool.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function scene(n,{hasTarget=true,highBp=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:52100+n});
 // Registered physical effects are synthetic in this SHARED-ATOM test only.
 // Full true-card registration uses separate official source-pinned testing.
 const physical=take(s,0,'evt');s.players[0].hand.push(physical);
 for(let i=0;i<n;i++)s.players[0].outside.push(take(s,0,'yuuki'));
 const fill=['f0','f1','f2','f3'];
 for(let i=0;i<4;i++){
  const c=take(s,0,fill[i]);c.ready=true;
  c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=c;
 }
 let enemy=null;
 if(hasTarget){
  enemy=take(s,1,'other');enemy.ready=true;
  enemy.fieldEntryStamp=s.nextFieldEntryStamp++;
  if(highBp)enemy.buffs=[{bp:4000,untilTurn:s.turn}];
  s.players[1].front[0]=enemy;
 }
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,physical,enemy};
}
test('R52 Q767 0,2,3,4 sources: Q767 returns then retires, source moves LAST',()=>{
 for(const n of [0,2,3,4]){
  let {s,physical,enemy}=scene(n);
  const available=legalUniversalActions(packs,s);
  const play=available.find(a=>a.type==='event'&&a.uid===physical.uid);
  assert.ok(play,'printed EVENT must be legal with target and 4 energy');
  const ap=s.players[0].apCards.filter(a=>a.ready).length;
  s=use(s,play);
  assert.equal(ap-s.players[0].apCards.filter(a=>a.ready).length,1);
  assert.equal(s.pending?.kind,'effect-named-outside-bounce-retire');
  assert.ok(s.players[0].resolvingEvents.some(c=>c.uid===physical.uid));
  assert.ok(!s.players[0].outside.some(c=>c.uid===physical.uid),'Q767 not yet outside');
  assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
  const publicView=universalPublicView(packs,s,1);
  assert.equal(publicView.players[0].hand,null,'no opponent hidden hand');
  const chosen=legalUniversalActions(packs,s).find(a=>
   a.type==='chooseNamedOutsideBounceRetire'&&a.uid===enemy.uid);
  assert.ok(chosen);
  s=use(s,chosen);
  assert.equal(s.pending,null);
  assert.ok(s.players[0].outside.some(c=>c.uid===physical.uid));
  assert.equal(s.players[0].resolvingEvents.length,0);
  const targetOutside=s.players[1].outside.some(c=>c.uid===enemy.uid);
  const targetHand=s.players[1].hand.some(c=>c.uid===enemy.uid);
  assert.equal(targetOutside,n>=3,'3+ true retirement');
  assert.equal(targetHand,n<3,'0/2 bounce goes to owner hand');
  const sourceMove=s.zoneMoveEvents.find(x=>x.uid===physical.uid&&x.to==='outside');
  const targetMove=s.zoneMoveEvents.find(x=>x.uid===enemy.uid&&
   (x.to==='outside'||x.to==='hand'));
  assert.ok(sourceMove&&targetMove);
  assert.ok(sourceMove.order>targetMove.order,'Q767 EVENT completed AFTER effect');
  assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 }
});
test('R52 Q1119 mandatory target and printed BP precheck before EVENT payment',()=>{
 for(const opts of [{hasTarget:false},{highBp:true}]){
  const {s,physical}=scene(2,opts);
  assert.ok(!legalUniversalActions(packs,s).some(a=>
   a.type==='event'&&a.uid===physical.uid));
  const ap=s.players[0].apCards.filter(x=>x.ready).length;
  assert.throws(()=>use(s,{type:'event',uid:physical.uid}));
  assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap);
  assert.ok(s.players[0].hand.some(x=>x.uid===physical.uid));
 }
});
test('R52 forged saved pending and in-flight EVENT are rejected',()=>{
 let {s,physical}=scene(2);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===physical.uid));
 const clean=JSON.parse(JSON.stringify(s));
 assert.equal(assertUniversalMatch(packs,clean),true);
 for(const tamper of [
  v=>{v.pending.sourceUid='0-forged';},
  v=>{v.pending.min=2;},
  v=>{v.pending.names=['unrelated'];},
  v=>{v.effectQueue=v.effectQueue.filter(x=>x.op!=='completeResolvingEvent');},
  v=>{v.players[0].outside.push(v.players[0].resolvingEvents[0]);}
 ]){
  const forged=JSON.parse(JSON.stringify(clean));tamper(forged);
  assert.throws(()=>assertUniversalMatch(packs,forged));
 }
});
test('R52 invalid source DSL and duplicate name rejects fail closed',()=>{
 for(const op of [
  {...rosario.effects.onPlay[0],min:0},
  {...rosario.effects.onPlay[0],names:[]},
  {...rosario.effects.onPlay[0],names:[names[0],names[0]]},
  {...rosario.effects.onPlay[0],optional:true},
  {...rosario.effects.onPlay[0],bp:0}
 ]){
  assert.throws(()=>createUniversalPack({id:'bad-r52',cards:[
   {...rosario,effects:{onPlay:[op]}},...cards.slice(1)
  ]}));
 }
});
