import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,fieldRestrictions,pruneContinuousStates,
 stampFieldInstance,attemptFieldActive} from '../dist/universal-v2/continuous-states.mjs';
const cards=Array.from({length:13},(_,i)=>({id:'C'+String(i).padStart(2,'0'),name:'Character '+i,
 type:'character',color:'yellow',energy:0,ap:1,bp:2000,gen:1,implementation:'vanilla'}));
const packs=['continuity-A','continuity-B'].map(id=>createUniversalPack({id,cards}));
const deck=Object.fromEntries(cards.slice(0,12).map(c=>[c.id,4]));deck.C12=2;
const fresh=()=>newUniversalMatch(packs,{decks:[deck,deck],seed:730,first:0});
function enter(s,p,id,line='front',slot=0){
 let c;
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(x=>x.cardId===id);
  if(i>=0){c=arr.splice(i,1)[0];break;}
 }
 assert.ok(c);c.ready=false;stampFieldInstance(s,c);s.players[p][line][slot]=c;return c;
}
const next=s=>dispatchUniversalAction(packs,s,{type:'next'});
test('Batch A: one-time ACTIVE skip consumes exactly one refresh and retains physical UID',()=>{
 let s=fresh(),src=enter(s,0,'C00','energy',0),target=enter(s,0,'C01');
 grantContinuousState(s,{kind:'skipNextActive',controller:0,sourceUid:src.uid,targetUid:target.uid});
 s.phase='attack';s=next(s);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.continuousStates.length,0);
 assert.equal(s.players[0].front[0].uid,target.uid);
 while(s.active!==0)s=next(s);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch A: prohibition persists until exact opponent attack phase end',()=>{
 let s=fresh(),src=enter(s,0,'C00','energy',0),target=enter(s,0,'C01');
 grantContinuousState(s,{kind:'cannotActive',controller:0,sourceUid:src.uid,targetUid:target.uid,
  until:{player:1,phase:'attack',edge:'end'}});
 s.phase='attack';s=next(s);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.continuousStates.length,1);
 while(s.active!==0)s=next(s);
 assert.equal(s.continuousStates.length,0);
 assert.equal(s.players[0].front[0].ready,true);
});
test('Batch A: leaving and reentering by SAME physical UID does not inherit a status',()=>{
 let s=fresh(),src=enter(s,0,'C00','energy',0),target=enter(s,1,'C01');
 grantContinuousState(s,{kind:'skipNextActive',controller:0,sourceUid:src.uid,targetUid:target.uid});
 const old=target.fieldEntryStamp;
 s.players[1].front[0]=null;target.fieldEntryStamp=null;s.players[1].hand.push(target);
 pruneContinuousStates(s);assert.equal(s.continuousStates.length,0);
 s.players[1].hand.pop();stampFieldInstance(s,target);s.players[1].front[0]=target;
 assert.notEqual(target.fieldEntryStamp,old);assert.deepEqual(fieldRestrictions(s,1,target),[]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch A: source-linked cancellation, public status and single active attempt',()=>{
 let s=fresh(),src=enter(s,0,'C00','energy',0),target=enter(s,1,'C01');
 grantContinuousState(s,{kind:'skipNextActive',controller:0,sourceUid:src.uid,
  targetUid:target.uid,sourceLinked:true});
 grantContinuousState(s,{kind:'skipNextActive',controller:0,sourceUid:src.uid,targetUid:target.uid});
 s.players[0].energy[0]=null;s.players[0].outside.push(src);
 pruneContinuousStates(s);assert.equal(s.continuousStates.length,1);
 assert.equal(universalPublicView(packs,s,0).players[1].front[0].restrictions[0].kind,'skipNextActive');
 assert.equal(attemptFieldActive(s,1,target),false);assert.equal(target.ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
