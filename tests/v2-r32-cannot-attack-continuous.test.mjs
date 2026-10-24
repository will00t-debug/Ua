import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,validateContinuousStates} from '../dist/universal-v2/continuous-states.mjs';
const pack=registeredV2TitlePack('sword-art-online');
const ids=['SAO-1-001','SAO-1-005','SAO-1-010','SAO-1-011','SAO-1-004','SAO-1-019','SAO-1-020',
 'SAO-1-051','SAO-1-057','SAO-1-073','SAO-1-077','SAO-2-016','SAO-2-003'];
const deck=Object.fromEntries(ids.map(id=>[id,4]));deck['SAO-1-020']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }throw Error(id);
}
function setup(){
 let s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:32001});
 const source=take(s,0,'SAO-1-001'),target=take(s,1,'SAO-1-001'),other=take(s,1,'SAO-1-005');
 for(const [p,c,slot] of [[0,source,0],[1,target,0],[1,other,1]]){
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[p].front[slot]=c;
 }
 s.phase='attack';assert.equal(assertUniversalMatch(pack,s),true);
 return {s,source,target,other};
}
const attacks=s=>legalUniversalActions(pack,s).filter(a=>a.type==='attack').map(a=>a.uid);
test('R32 shared cannotAttack honors target UID, survives source departure, and expires at controller next own START',()=>{
 let {s,source,target,other}=setup();
 grantContinuousState(s,{kind:'cannotAttack',controller:0,sourceUid:source.uid,
  targetUid:target.uid,sourceLinked:false,until:{player:0,phase:'start',edge:'start'}});
 assert.equal(validateContinuousStates(s),true);
 assert.equal(universalPublicView(pack,s,1).players[1].front[0].restrictions[0].kind,'cannotAttack');
 s.players[0].front[0]=null;s.players[0].outside.push(source);
 s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.active,1);assert.equal(s.phase,'start');
 assert.ok(s.continuousStates.some(x=>x.kind==='cannotAttack'));
 for(let i=0;i<4&&s.phase!=='attack';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.ok(!attacks(s).includes(target.uid));
 assert.ok(attacks(s).includes(other.uid));
 const snap=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'attack',uid:target.uid}),/not currently legal/);
 assert.deepEqual(s,snap);
 s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.active,0);assert.equal(s.continuousStates.some(x=>x.kind==='cannotAttack'),false);
 const allowed=structuredClone(s);allowed.active=1;allowed.phase='attack';allowed.players[1].front[0].ready=true;
 assert.ok(attacks(allowed).includes(target.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('R32 status validation rejects unknown expirations and source link; JSON and new stamped incarnation remain legal',()=>{
 const {s,source,target}=setup();
 const grant={kind:'cannotAttack',controller:0,sourceUid:source.uid,
  targetUid:target.uid,sourceLinked:false,until:{player:0,phase:'start',edge:'start'}};
 for(const bad of [{until:{player:1,phase:'start',edge:'start'}},
  {until:{player:0,phase:'attack',edge:'end'}},{sourceLinked:true},
  {targetUid:'0-forged'}])
  assert.throws(()=>grantContinuousState(structuredClone(s),{...grant,...bad}),/Attack ban|live field target/);
 grantContinuousState(s,grant);
 const saved=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(pack,saved),true);
 for(const bad of [{sourceLinked:true},{until:{player:1,phase:'start',edge:'start'}},
  {until:{player:0,phase:'end',edge:'start'}}]){
  const forged=structuredClone(saved);Object.assign(forged.continuousStates[0],bad);
  assert.throws(()=>assertUniversalMatch(pack,forged),/Invalid continuous-state/);
 }
 saved.players[1].front[0].fieldEntryStamp=saved.nextFieldEntryStamp++;
 saved.continuousStates=[];
 assert.equal(assertUniversalMatch(pack,saved),true);
 const newTurn={...saved,active:1,phase:'attack'};
 assert.ok(attacks(newTurn).includes(target.uid));
});
