import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView,universalBp} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Official 2026-09-04 Q2315/2316, 2024-07-19 Q1033/Q1046.
// Synthetic physical deck: all rules are declared, NOT officially registered.
const name='黒崎 一護',eventName='その名は斬月';
const when={from:'hand',to:'outside',sourceOnField:true,
 sourceName:name,sourceColor:'blue',reasons:['payment','own-effect']};
const cards=Array.from({length:13},(_,i)=>({
 id:'RQ'+i,name:i===0?name:i===1?eventName:i===2?'毒ヶ峰 リルカ':'Other '+i,
 color:'blue',type:i===1?'event':'character',energy:0,ap:1,bp:i===1?0:4000,gen:i===1?0:1,
 implementation:i<=2?'dsl':'vanilla',
 ...(i===0?{mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,payment:{zone:'hand',field:'name',
    match:'containsAny',values:['斬月','月牙']},then:[
    {op:'draw',count:1},{op:'buffSelf',bp:1000},
    {op:'grantOnAttack',target:'self',optional:true,until:'endOfTurn',
     then:[{op:'draw',count:1}]}
   ]}]}}:{}),
 ...(i===1?{moveTriggers:[{when,then:[{op:'draw',count:1}]}]}:{}),
 ...(i===2?{moveObserver:{op:'restSelfTuckMovedFaceDown',when}}:{})
}));
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const packs=[createUniversalPack({id:'q2315-test-title-a',cards}),
 createUniversalPack({id:'q2315-test-title-b',cards})];
function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing '+id);
}
function game(owner){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:owner,seed:2615});
 const source=take(s,owner,'RQ0'),moved=take(s,owner,'RQ1'),observer=take(s,owner,'RQ2');
 source.ready=true;source.fieldEntryStamp=s.nextFieldEntryStamp++;
 observer.ready=true;observer.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner].front[0]=source;s.players[owner].energy[0]=observer;
 s.players[owner].hand.push(moved);
 s.phase='main';
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,source,moved,observer};
}
for(const owner of [0,1])for(const first of ['observer','moved'])
 test('Q2315 physical 047 earned draw survives optional facedown under after complete Ichigo MAIN '+owner+'/'+first,()=>{
  let {s,source,moved,observer}=game(owner);
  const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='frontOnce');
  assert.ok(activate);
  s=dispatchUniversalAction(packs,s,activate,{actor:owner});
  assert.equal(s.pending.kind,'effect-discard-gate');
  const before=s.players[owner].deck.length;
  s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:owner});
  assert.equal(s.pending.kind,'effect-move-order');
  assert.equal(s.players[owner].deck.length,before-1,'MAIN draw must complete before earned order');
  assert.equal(universalBp(packs,s,source),5000);
  assert.equal(s.continuousStates.some(x=>x.kind==='grantedOnAttack'&&x.targetUid===source.uid),true);
  assert.equal(s.players[owner].outside.some(x=>x.uid===moved.uid),true);
  const actions=legalUniversalActions(packs,s);
  assert.equal(actions.length,2);
  for(const difficulty of ['normal','hard']){
   const choice=chooseUniversalAiAction(packs,s,{difficulty});
   assert.ok(actions.some(a=>JSON.stringify(a)===JSON.stringify(choice)));
  }
  const firstChoice=actions.find(a=>a.key.startsWith(first==='observer'?'observer-':'moved-'));
  assert.ok(firstChoice);
  const beforeInvalid=structuredClone(s);
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseMoveEffectOrder',key:'invalid'},{actor:owner}),/not currently legal/);
  assert.deepEqual(s,beforeInvalid);
  s=dispatchUniversalAction(packs,s,firstChoice,{actor:owner});
  if(first==='moved')assert.equal(s.players[owner].deck.length,before-2);
  else assert.equal(s.pending.kind,'effect-rest-tuck');
  if(first==='moved'){
   assert.equal(s.pending.kind,'effect-rest-tuck');
  }
  s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
  s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:owner});
  assert.equal(s.pending.kind,'effect-tuck-moved');
  assert.equal(s.players[owner].energy[0].ready,false,'actual READY to REST paid');
  s=dispatchUniversalAction(packs,s,{type:'chooseTuckMoved',uid:moved.uid},{actor:owner});
  assert.equal(s.pending,null);
  assert.equal(s.players[owner].deck.length,before-2,'Q2315 earned draw exactly once after full MAIN');
  assert.equal(s.players[owner].outside.some(x=>x.uid===moved.uid),false);
  assert.equal(s.players[owner].energy[0].under.length,1);
  assert.equal(s.players[owner].energy[0].under[0].uid,moved.uid);
  assert.equal(s.players[owner].energy[0].under[0].faceDown,true);
  const own=universalPublicView(packs,s,owner),foe=universalPublicView(packs,s,1-owner);
  assert.equal(own.players[owner].energy[0].underLayers[0].uid,moved.uid);
  assert.deepEqual(foe.players[owner].energy[0].underLayers,[{faceDown:true}]);
  assert.equal(JSON.stringify(foe.players[owner].energy[0].underLayers).includes(moved.cardId),false);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
for(const owner of [0,1])test('Q2315 optional REST decline still releases already-earned move draw '+owner,()=>{
 let {s,source,moved}=game(owner);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:owner});
 const start=s.players[owner].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:owner});
 const a=legalUniversalActions(packs,s).find(a=>a.key.startsWith('observer-'));
 s=dispatchUniversalAction(packs,s,a,{actor:owner});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'skip'},{actor:owner});
 assert.equal(s.pending,null);
 assert.equal(s.players[owner].deck.length,start-2);
 assert.equal(s.players[owner].outside.some(x=>x.uid===moved.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Q2315 generic watcher fails closed without printed source identity or correct origin',()=>{
 for(const broken of [{...when,sourceName:'別人'}, {...when,sourceOnField:false},
  {...when,from:'deck'}, {...when,reasons:['rule']}]){
  const changed=cards.map(c=>c.id==='RQ2'?{...c,moveObserver:{op:'restSelfTuckMovedFaceDown',when:broken}}:c);
  if(broken.sourceName==='別人'){
   const registered=createUniversalPack({id:'missing-source-match',cards:changed});
   assert.ok(registered.cards.RQ2.moveObserver);
  }else assert.throws(()=>createUniversalPack({id:'invalid-watcher',cards:changed}),/invalid moved-card watcher provenance/);
 }
});
