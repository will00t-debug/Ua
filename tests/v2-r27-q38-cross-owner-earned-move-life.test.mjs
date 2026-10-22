import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Official general Q38: a LIFE COLOR deployment's onPlay can interleave
// with the unreconciled FINAL LIFE trigger. Q2315: a previously earned
// hand-to-outside draw survives the physical event being tucked facedown.
const sourceName='LIFE登場役';
const when={from:'hand',to:'outside',sourceOnField:true,
 sourceName,sourceColor:'blue',reasons:['payment','own-effect']};
const cards=Array.from({length:13},(_,i)=>({
 id:'C'+i,name:i===3?sourceName:i===4?'その名は斬月':'Other '+i,
 type:i===4?'event':'character',color:'blue',
 energy:0,ap:1,bp:i===4?0:3000,gen:i===4?0:1,
 implementation:[0,3,4,5].includes(i)?'dsl':'vanilla',
 ...(i===0?{printedAttackDamage:2}:{}),
 ...(i===1?{trigger:'color',triggerEffect:{
  op:'deployHandCharacter',color:'blue',maxEnergy:2,ap:1}}:{}),
 ...(i===2?{trigger:'final'}:{}),
 ...(i===3?{effects:{onPlay:[
  {op:'drawDiscard',count:1,discardCount:1},{op:'draw',count:1}
 ]}}:{}),
 ...(i===4?{moveTriggers:[{when,then:[{op:'draw',count:1}]}]}:{}),
 ...(i===5?{moveObserver:{op:'restSelfTuckMovedFaceDown',when}}:{})
}));
const packs=[createUniversalPack({id:'q38-attack-a',cards}),
 createUniversalPack({id:'q38-defender-b',cards})];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const xs=s.players[p][zone],idx=xs.findIndex(c=>c.cardId===id);
  if(idx>=0)return xs.splice(idx,1)[0];
 }throw Error('missing '+id);
}
function begin(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:2738});
 const attacker=take(s,0,'C0');attacker.ready=true;s.players[0].front[0]=attacker;
 const defender=s.players[1];defender.deck.push(...defender.life.splice(0));
 const lifeColor=take(s,1,'C1'),lifeFinal=take(s,1,'C2');
 const entrant=take(s,1,'C3'),event=take(s,1,'C4'),observer=take(s,1,'C5');
 defender.life.push(lifeColor,lifeFinal);
 defender.hand.push(entrant,event);
 // Two owner-specific witnesses: the defending player has an eligible
 // non-RAID observer while the attacker has none.
 observer.ready=true;observer.fieldEntryStamp=s.nextFieldEntryStamp++;
 defender.energy[0]=observer;
 s.phase='attack';
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-batch-order');
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:lifeColor.uid},{actor:1});
 const color=legalUniversalActions(packs,s).find(a=>
  a.mode==='color'&&a.uid===entrant.uid&&a.line==='front');
 assert.ok(color);s=dispatchUniversalAction(packs,s,color,{actor:1});
 assert.equal(s.pending?.kind,'life-batch-order');
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(a=>a.type==='chooseLifeEffect'));
 assert.ok(choices.some(a=>a.uid===lifeFinal.uid));
 return {s,event,lifeFinal,entrant,observer};
}
for(const lifeFirst of [false,true])test('Q38 CROSS-owner COLOR onPlay → Q2315 move order → unresolved FINAL '+(lifeFirst?'FINAL first':'entrant first'),()=>{
 let {s,event,lifeFinal,observer}=begin();
 const choices=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard'])
  assert.ok(choices.some(a=>JSON.stringify(a)===JSON.stringify(
   chooseUniversalAiAction(packs,s,{difficulty}))));
 if(lifeFirst){
  s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:lifeFinal.uid},{actor:1});
  assert.equal(s.pending.kind,'life-trigger');
  s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
  assert.equal(s.pending.kind,'effect-discard');
 }else{
  s=dispatchUniversalAction(packs,s,choices.find(a=>a.type==='chooseLifeEffect'),{actor:1});
  assert.equal(s.pending.kind,'effect-discard');
 }
 let before=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:event.uid},{actor:1});
 assert.equal(s.pending?.kind,'effect-move-order');
 assert.equal(s.players[1].deck.length,before-1,'second onPlay draw completed before earned event');
 const order=legalUniversalActions(packs,s);
 assert.equal(order.length,2);
 assert.ok(order.some(a=>a.key.startsWith('observer-')));
 const first=order.find(a=>a.key.startsWith('observer-'));
 s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,first,{actor:0}),/Wrong player turn/);
 s=dispatchUniversalAction(packs,s,first,{actor:1});
 assert.equal(s.pending.kind,'effect-rest-tuck');
 s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseTuckMoved',uid:event.uid},{actor:1});
 assert.equal(s.players[1].deck.length,before-2,'earned draw still occurs after event hidden');
 assert.equal(s.players[1].energy[0].under[0].uid,event.uid);
 assert.equal(s.players[1].energy[0].under[0].faceDown,true);
 if(!lifeFirst){
  assert.equal(s.pending?.kind,'life-trigger');
  assert.equal(s.pending.uid,lifeFinal.uid);
  s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
 }
 assert.equal(s.pending,null);
 assert.equal(s.lifeRevealBatch,null);
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.players[1].energy[0].uid,observer.uid);
 const foe=universalPublicView(packs,s,0),own=universalPublicView(packs,s,1);
 assert.deepEqual(foe.players[1].energy[0].underLayers,[{faceDown:true}]);
 assert.equal(own.players[1].energy[0].underLayers[0].uid,event.uid);
 assert.equal(foe.effectQueue,undefined);
 assert.equal(assertUniversalMatch(packs,s),true);
});

for(const op of ['battleImpactDamage','additionalBattleDamage'])
 test('R27 cross-owner Q38 deferred COLOR refuses nested '+op+' without moving hidden card',()=>{
  let {s,event}=begin();
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='chooseLifeEffect'),{actor:1});
  assert.equal(s.pending.kind,'effect-discard');
  const foreignJob={op,owner:0,defender:0,...(op==='additionalBattleDamage'?{remaining:1}:{})};
  s.effectQueue.unshift(foreignJob);
  const previous=structuredClone(s),foe=universalPublicView(packs,s,0);
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:event.uid},{actor:1}),
   /Nested LIFE reveal unresolved/);
  assert.deepEqual(s,previous,'failed secondary LIFE cannot partially discard a physical card');
  assert.deepEqual(universalPublicView(packs,s,0),foe,'cannot leak private LIFE or moved card');
  assert.equal(s.players[1].hand.some(c=>c.uid===event.uid),true);
  assert.equal(s.players[0].lifeRevealed.length,0);
  assert.equal(s.status,'playing');
  assert.equal(assertUniversalMatch(packs,s),true);
 });
test('Q2220 original-effect silence before the movement prevents a printed field watcher being earned, not 047 drawn',async()=>{
 const {grantContinuousState}=await import('../dist/universal-v2/continuous-states.mjs');
 let {s,event,observer,lifeFinal}=begin();
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:s.players[0].front[0].uid,targetUid:observer.uid,
  until:{player:0,phase:'attack',edge:'end'}});
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='chooseLifeEffect'),{actor:1});
 const before=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:event.uid},{actor:1});
 assert.ok(!['effect-move-order','effect-rest-tuck'].includes(s.pending?.kind));
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.uid,lifeFinal.uid);
 assert.equal(s.players[1].deck.length,before-2,'onPlay draw and the earned 047 draw both finish');
 assert.equal(s.players[1].energy[0].ready,true);
 assert.deepEqual(s.players[1].energy[0].under,[]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.pending,null);assert.equal(assertUniversalMatch(packs,s),true);
});
