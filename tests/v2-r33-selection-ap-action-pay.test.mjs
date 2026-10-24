import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
const pack=registeredV2TitlePack('sword-art-online');
const ids=['SAO-1-001','SAO-1-005','SAO-1-010','SAO-1-011','SAO-1-004','SAO-1-019',
 'SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-073','SAO-1-077','SAO-2-016','SAO-2-003'];
const deck=Object.fromEntries(ids.map(id=>[id,4]));deck['SAO-1-020']=2;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];
}throw Error(id);}
function setup(readyAp=1){
 const s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:33071});
 const source=take(s,0,'SAO-1-001'),protectedCard=take(s,0,'SAO-1-005'),
 free=take(s,0,'SAO-1-010'),enemy=take(s,1,'SAO-1-001');
 for(const [p,c,i] of [[0,source,0],[0,protectedCard,1],[0,free,2],[1,enemy,0]]){
  c.fieldEntryStamp=s.nextFieldEntryStamp++;c.ready=true;s.players[p].front[i]=c;
 }
 grantContinuousState(s,{kind:'selectionApTax',controller:0,
  sourceUid:source.uid,targetUid:protectedCard.uid,sourceLinked:false,
  until:{player:1,phase:'attack',edge:'end',ownTurn:s.players[1].ownTurns+1}});
 s.active=1;s.players[1].ownTurns++;s.phase='main';
 for(const [i,ap] of s.players[1].apCards.entries()){ap.inPlay=i<2;ap.ready=i<readyAp;}
 assert.equal(assertUniversalMatch(pack,s),true);
 return {s,source,protectedCard,free,enemy};
}
function pending(s,protectedCard,free,enemy,kind='effect-retire-bp'){
 s.pending={kind,player:1,sourceUid:enemy.uid,choices:[protectedCard.uid,free.uid],
  limit:5000,optional:true};
 return s;
}
test('R33 Q2062 zero READY AP: cannot choose taxed target, can choose different card or zero; invalid action atomic',()=>{
 let {s,protectedCard,free,enemy}=setup(0);s=pending(s,protectedCard,free,enemy);
 const legal=legalUniversalActions(pack,s);
 assert.deepEqual(legal,[{type:'chooseRetireBp',uid:null},{type:'chooseRetireBp',uid:free.uid}]);
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:protectedCard.uid}),/not currently legal/);
 assert.deepEqual(s,before);
 s=dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:free.uid});
 assert.equal(s.players[0].front[2],null);
 assert.equal(s.players[0].front[1].uid,protectedCard.uid);
 assert.equal(s.players[1].apCards.filter(x=>x.ready).length,0);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('R33 Q2062 paid 1 AP at actual effect target resolution, not event AP or opponent AP',()=>{
 let {s,protectedCard,free,enemy}=setup(1);s=pending(s,protectedCard,free,enemy,'effect-rest-bp');
 const options=legalUniversalActions(pack,s);
 assert.ok(options.some(a=>a.uid===protectedCard.uid));
 const ap0=s.players[0].apCards.map(x=>x.ready);
 s=dispatchUniversalAction(pack,s,{type:'chooseRestBp',uid:protectedCard.uid});
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.players[1].apCards.filter(x=>x.ready).length,0);
 assert.deepEqual(s.players[0].apCards.map(x=>x.ready),ap0);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('R33 Q2062 choosing 0, other unprotected target, and ordinary combat block never pay AP tax',()=>{
 for(const kind of ['effect-retire-bp','effect-rest-bp']){
  let {s,protectedCard,free,enemy}=setup(1);s=pending(s,protectedCard,free,enemy,kind);
  const before=s.players[1].apCards.filter(x=>x.ready).length;
  const action=kind==='effect-retire-bp'?'chooseRetireBp':'chooseRestBp';
  s=dispatchUniversalAction(pack,s,{type:action,uid:null});
  assert.equal(s.players[1].apCards.filter(x=>x.ready).length,before);
  assert.equal(assertUniversalMatch(pack,s),true);
 }
 let {s,protectedCard,free,enemy}=setup(0);
 // Battle 'chooseBlock' uses combat designation, not printed effect '選び'.
 s.players[0].front[1].ready=true;
 s.pending={kind:'block',player:0,attackerUid:enemy.uid};
 const options=legalUniversalActions(pack,s);
 assert.ok(options.some(a=>a.type==='chooseBlock'&&a.uid===protectedCard.uid));
});
test('R33 Q2062 multi-target pays separately; 0 AP remains legal termination',()=>{
 let {s,protectedCard,free,enemy}=setup(1);
 s.pending={kind:'effect-target-many',player:1,sourceUid:enemy.uid,
  choices:[protectedCard.uid,free.uid],selected:[],maxTargets:2,bp:1000};
 assert.ok(legalUniversalActions(pack,s).some(a=>a.uid===protectedCard.uid));
 s=dispatchUniversalAction(pack,s,{type:'chooseTargetMany',uid:protectedCard.uid});
 assert.equal(s.players[1].apCards.filter(x=>x.ready).length,0);
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.uid===protectedCard.uid));
 assert.ok(legalUniversalActions(pack,s).some(a=>a.uid===free.uid));
 s=dispatchUniversalAction(pack,s,{type:'chooseTargetMany',uid:free.uid});
 assert.equal(s.pending,null);assert.equal(assertUniversalMatch(pack,s),true);
});
