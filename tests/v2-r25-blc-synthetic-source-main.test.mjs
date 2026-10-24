import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,universalBp,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Source-text fixture based on EX07BT/BLC-2-019 and 047, NOT registered cards.
// Q1033: finish MAIN draw, BP, grant before 047's earned movement draw.
const payment={zone:'hand',field:'name',match:'containsAny',values:['斬月','月牙']};
const sourceName='黒崎 一護';
const cards=Array.from({length:13},(_,i)=>({
 id:'BC'+i,name:i===0?sourceName:i===1?'その名は斬月':i===2?'月牙十字衝':'Other '+i,
 type:i===1?'event':'character',color:'blue',energy:0,ap:1,
 bp:i===1?0:3000,gen:i===1?0:1,implementation:i<=1?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[{op:'enemyBpDown',bp:1500,minBp:2000,optional:true,maxTargets:2}]},
   mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
    then:[{op:'discardGate',optional:false,payment,then:[
     {op:'draw',count:1},{op:'buffSelf',bp:1000},
     {op:'grantOnAttack',target:'self',optional:true,until:'endOfTurn',then:[{op:'draw',count:1}]}
    ]}]}}:{ }),
 ...(i===1?{effects:{onPlay:[{op:'draw',count:2}]},moveTriggers:[{
  when:{from:'hand',to:'outside',reasons:['payment','own-effect'],
   sourceOnField:true,sourceName,sourceColor:'blue'},
  then:[{op:'draw',count:1}]
 }] }:{})
}));
const decks=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const packs=[createUniversalPack({id:'full-text-pilot-a',cards}),createUniversalPack({id:'full-text-pilot-b',cards})];
function pull(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const arr=s.players[p][z],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }throw Error(id);
}
function start(owner){
 let s=newUniversalMatch(packs,{decks:[decks,decks],first:owner,seed:251903});
 const source=pull(s,owner,'BC0'),event=pull(s,owner,'BC1');
 // Move unrelated matching starting-hand copies aside; only the intended
 // physical event is eligible for this exact name-payment scenario.
 const hand=s.players[owner].hand;
 for(let i=hand.length-1;i>=0;i--)if(['BC1','BC2'].includes(hand[i].cardId))
  s.players[owner].outside.push(hand.splice(i,1)[0]);
 s.players[owner].hand.push(source,event);
 // Genuine enemy front-line characters make the onPlay dual-target window legal.
 for(const [slot,id] of ['BC5','BC6'].entries()){
  const victim=pull(s,1-owner,id);victim.ready=true;
  s.players[1-owner].front[slot]=victim;
 }
 s.phase='main';
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front');
 assert.ok(play);s=dispatchUniversalAction(packs,s,play,{actor:owner});
 assert.equal(s.pending?.kind,'effect-target-many');
 s=dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid:null},{actor:owner});
 assert.equal(s.pending,null);
 return {s,source,event};
}
for(const owner of [0,1])test('Q1033 synthetic complete MAIN before event move-trigger, owner '+owner,()=>{
 let {s,source,event}=start(owner);
 const choice=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='frontOnce');
 assert.ok(choice);
 s=dispatchUniversalAction(packs,s,choice,{actor:owner});
 assert.equal(s.pending.kind,'effect-discard-gate');
 const legal=legalUniversalActions(packs,s);
 assert.deepEqual(legal,[{type:'chooseDiscardGate',uid:event.uid}]);
 for(const difficulty of ['normal','hard'])
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 const old=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:'1-999'},{actor:owner}),/not currently legal/);
 assert.deepEqual(s,old);
 const from=s.zoneMoveEvents.length,ap=s.players[owner].apCards.filter(x=>x.ready).length;
 s=JSON.parse(JSON.stringify(s));
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:event.uid},{actor:owner});
 const after=s.zoneMoveEvents.slice(from);
 assert.deepEqual(after.filter(e=>e.to==='hand'&&e.from==='deck').map(e=>e.sourceUid),
  [source.uid,event.uid]);
 assert.ok(after.some(e=>e.uid===event.uid&&e.reason==='payment'&&e.sourceUid===source.uid));
 assert.equal(universalBp(packs,s,s.players[owner].front[0]),4000);
 assert.equal(s.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&e.targetUid===source.uid).length,1);
 assert.equal(s.mainAbilityUsedUids.includes(source.uid),true);
 assert.equal(s.players[owner].apCards.filter(x=>x.ready).length,ap,'no additional AP/energy for triggered draw');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('named MAIN cannot activate without matching hand, even with unrelated cards',()=>{
 let {s,event,source}=start(0);
 const i=s.players[0].hand.findIndex(c=>c.uid===event.uid);
 s.players[0].outside.push(s.players[0].hand.splice(i,1)[0]);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
});
