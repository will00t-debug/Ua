import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,expireContinuousStates,pruneContinuousStates,validateContinuousStates}
 from '../dist/universal-v2/continuous-states.mjs';
const cards=Array.from({length:13},(_,i)=>({
 id:'Z'+i,name:'Z'+i,type:'character',color:'blue',energy:0,ap:1,bp:2000,gen:1,implementation:'vanilla'
}));
const pack=createUniversalPack({id:'status-two-controllers',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function setup(){
 const s=newUniversalMatch(packs,{decks:[deck,deck],seed:2502,first:0});
 const pl=s.players[1],physical=pl.deck.splice(0,2);
 for(let i=0;i<2;i++){
  physical[i].fieldEntryStamp=s.nextFieldEntryStamp++;
  pl.front[i]=physical[i];
 }
 return {s,target:physical[0],source:physical[1]};
}
const program=[{op:'draw',count:1}];
test('grant from defending player during attacker turn expires on CURRENT turn, not next owner turn',()=>{
 const {s,target,source}=setup();
 grantContinuousState(s,{kind:'grantedOnAttack',controller:1,sourceUid:source.uid,
  targetUid:target.uid,sourceLinked:false,optional:true,program,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(validateContinuousStates(s),true);assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(universalPublicView(packs,s,0).continuousStates,undefined);
 expireContinuousStates(s,{player:0,phase:'attack',edge:'end'});
 assert.equal(s.continuousStates.length,0);
});
test('two independent grants survive grantor departure, but not target leaving and re-entering',()=>{
 const {s,target,source}=setup();
 for(let i=0;i<2;i++)grantContinuousState(s,{kind:'grantedOnAttack',controller:1,
  sourceUid:source.uid,targetUid:target.uid,sourceLinked:false,optional:true,program,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(new Set(s.continuousStates.map(x=>x.id)).size,2);
 s.players[1].front[1]=null;s.players[1].outside.push(source);
 pruneContinuousStates(s);
 assert.equal(s.continuousStates.length,2);
 target.fieldEntryStamp=s.nextFieldEntryStamp++;
 pruneContinuousStates(s);
 assert.equal(s.continuousStates.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
