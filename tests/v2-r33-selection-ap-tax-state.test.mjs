import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,expireContinuousStates,pruneContinuousStates,
 selectionApSurcharge} from '../dist/universal-v2/continuous-states.mjs';
const pack=registeredV2TitlePack('sword-art-online');
const ids=['SAO-1-001','SAO-1-005','SAO-1-010','SAO-1-011','SAO-1-004','SAO-1-019',
 'SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-073','SAO-1-077','SAO-2-016','SAO-2-003'];
const deck=Object.fromEntries(ids.map(id=>[id,4]));deck['SAO-1-020']=2;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
function setup(){
 const s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:33070});
 const source=take(s,0,'SAO-1-001'),target=take(s,0,'SAO-1-005'),other=take(s,1,'SAO-1-001');
 for(const [p,c,i] of [[0,source,0],[0,target,1],[1,other,0]]){c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[p].front[i]=c;}
 assert.equal(assertUniversalMatch(pack,s),true);return {s,source,target,other};
}
function grant(s,source,target){
 return {kind:'selectionApTax',controller:0,sourceUid:source.uid,targetUid:target.uid,
  sourceLinked:false,until:{player:1,phase:'attack',edge:'end',ownTurn:s.players[1].ownTurns+1}};
}
test('R33 Q2062 next-opponent-turn window only, Q2062 extra AP tax and end expiry',()=>{
 const {s,source,target,other}=setup();grantContinuousState(s,grant(s,source,target));
 assert.equal(assertUniversalMatch(pack,s),true);
 assert.equal(selectionApSurcharge(s,0,target.uid),0);
 s.active=1;assert.equal(selectionApSurcharge(s,1,target.uid),0);
 expireContinuousStates(s,{player:1,phase:'attack',edge:'end'});
 assert.equal(s.continuousStates.length,1);
 s.players[1].ownTurns++;
 assert.equal(selectionApSurcharge(s,1,target.uid),1);
 assert.equal(selectionApSurcharge(s,1,other.uid),0);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 expireContinuousStates(s,{player:1,phase:'attack',edge:'end'});
 assert.equal(selectionApSurcharge(s,1,target.uid),0);
});
test('R33 target must be OWN stamped physical, imported duration must be exact, source may leave',()=>{
 const {s,source,target,other}=setup();const g=grant(s,source,target);
 for(const patch of [{targetUid:other.uid},{sourceLinked:true},
  {until:{...g.until,ownTurn:99}},{until:{...g.until,player:0}}])
  assert.throws(()=>grantContinuousState(structuredClone(s),{...g,...patch}),/Selection AP tax/);
 grantContinuousState(s,g);
 for(const mutate of [
  e=>e.sourceLinked=true,e=>e.targetOwner=1,e=>e.until.player=0,
  e=>e.until.ownTurn=0,e=>e.until.hidden=1
 ]){
  const fake=structuredClone(s);mutate(fake.continuousStates[0]);
  assert.throws(()=>assertUniversalMatch(pack,fake),/Invalid continuous-state/);
 }
 s.active=1;s.players[1].ownTurns++;
 s.players[0].front[0]=null;s.players[0].outside.push(source);
 assert.equal(selectionApSurcharge(s,1,target.uid),1);
 s.players[0].front[1].fieldEntryStamp=s.nextFieldEntryStamp++;pruneContinuousStates(s);
 assert.equal(selectionApSurcharge(s,1,target.uid),0);
 assert.equal(assertUniversalMatch(pack,s),true);
});
