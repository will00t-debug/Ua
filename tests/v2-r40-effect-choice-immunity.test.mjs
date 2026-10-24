import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,effectChoiceProtected,expireContinuousStates,
 pruneContinuousStates,selectionApSurcharge} from '../dist/universal-v2/continuous-states.mjs';

const pack=registeredV2TitlePack('sword-art-online');
// Both full 50-card decks; event is an actual registered SAO card.
const ids=['SAO-1-001','SAO-1-005','SAO-1-010','SAO-1-011','SAO-1-004',
 'SAO-1-019','SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-031',
 'SAO-1-077','SAO-2-016','SAO-2-003'];
const deck=Object.fromEntries(ids.map(id=>[id,4]));deck['SAO-1-020']=2;
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error(id);
}
function scene(){
 const s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:40058});
 const grantor=take(s,0,'SAO-1-001'),target=take(s,0,'SAO-1-005'),
  alternate=take(s,0,'SAO-1-010'),enemyChar=take(s,1,'SAO-1-001'),
  enemyEvent=take(s,1,'SAO-1-031');
 for(const [p,c,slot] of [[0,grantor,0],[0,target,1],[0,alternate,2],
  [1,enemyChar,0]]){
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[p].front[slot]=c;
 }
 s.players[1].outside.push(enemyEvent);
 s.active=1;s.phase='main';s.players[1].ownTurns++;
 for(const ap of s.players[1].apCards){ap.inPlay=true;ap.ready=true;}
 assert.equal(assertUniversalMatch(pack,s),true);
 return {s,grantor,target,alternate,enemyChar,enemyEvent};
}
function immune(s,src,target,scope='any'){
 return grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',
  controller:0,sourceUid:src.uid,targetUid:target.uid,sourceLinked:false,
  selectionScope:scope,until:{player:0,phase:'start',edge:'start'}});
}
function choice(s,source,targets,kind='effect-retire-bp'){
 s.pending={kind,player:1,sourceUid:source.uid,
  choices:targets.map(x=>x.uid),optional:true,limit:5000};
}
test('R40 Q1206 all-opponent explicit effect selections are illegal for character and EVENT; another UID remains legal',()=>{
 const {s,grantor,target,alternate,enemyChar,enemyEvent}=scene();
 immune(s,grantor,target);
 for(const source of [enemyChar,enemyEvent]){
  choice(s,source,[target,alternate]);
  const actions=legalUniversalActions(pack,s);
  assert.ok(!actions.some(a=>a.uid===target.uid));
  assert.ok(actions.some(a=>a.uid===alternate.uid));
  assert.ok(actions.some(a=>a.uid===null));
  const before=structuredClone(s);
  assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:target.uid}),
   /not currently legal/);
  assert.deepEqual(s,before);
 }
 assert.equal(effectChoiceProtected(s,1,target.uid,'trigger'),true);
 assert.equal(effectChoiceProtected(s,0,target.uid,'event'),false);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R40 Q1207 character-only and Q2313 trigger-only scopes remain distinct from all sources',()=>{
 const {s,grantor,target,alternate,enemyChar,enemyEvent}=scene();
 immune(s,grantor,target,'character');
 choice(s,enemyChar,[target,alternate]);
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.uid===target.uid));
 choice(s,enemyEvent,[target,alternate]);
 assert.ok(legalUniversalActions(pack,s).some(a=>a.uid===target.uid));
 assert.equal(effectChoiceProtected(s,1,target.uid,'trigger'),false);
 assert.equal(effectChoiceProtected(s,1,target.uid,'unknown'),true);
 const {s:other,grantor:src2,target:t2}=scene();
 immune(other,src2,t2,'trigger');
 assert.equal(effectChoiceProtected(other,1,t2.uid,'character'),false);
 assert.equal(effectChoiceProtected(other,1,t2.uid,'event'),false);
 assert.equal(effectChoiceProtected(other,1,t2.uid,'trigger'),true);
});
test('R40 immunity and Q2062 AP surcharge stack without converting surcharge to immunity; block unaffected',()=>{
 const {s,grantor,target,alternate,enemyChar}=scene();
 grantContinuousState(s,{kind:'selectionApTax',controller:0,
  sourceUid:grantor.uid,targetUid:target.uid,
  until:{player:1,phase:'attack',edge:'end',ownTurn:s.players[1].ownTurns+1}});
 immune(s,grantor,target);
 choice(s,enemyChar,[target,alternate]);
 assert.equal(selectionApSurcharge(s,1,target.uid),0); // ownTurn below tax's future window
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.uid===target.uid));
 s.pending={kind:'block',player:0,attackerUid:enemyChar.uid};
 assert.ok(legalUniversalActions(pack,s).some(a=>a.type==='chooseBlock'&&a.uid===target.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('R40 invalid ownership, duration, forged UID and serialization fail closed',()=>{
 const {s,grantor,target,enemyChar}=scene();
 const g={kind:'cannotBeChosenByOppEffect',controller:0,sourceUid:grantor.uid,
  targetUid:target.uid,sourceLinked:false,selectionScope:'any',
  until:{player:0,phase:'start',edge:'start'}};
 for(const patch of [{sourceUid:enemyChar.uid},{targetUid:enemyChar.uid},
  {targetUid:'0-forged'},{selectionScope:'all'},{sourceLinked:true},
  {until:{player:1,phase:'start',edge:'start'}},
  {until:{player:0,phase:'attack',edge:'end'}}])
  assert.throws(()=>grantContinuousState(structuredClone(s),{...g,...patch}));
 grantContinuousState(s,g);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 for(const mutation of [
  e=>e.selectionScope='untrusted',e=>e.targetOwner=1,e=>e.sourceUid='1-forged',
  e=>e.until.player=1,e=>e.extra=true
 ]){
  const fake=structuredClone(s);mutation(fake.continuousStates[0]);
  assert.throws(()=>assertUniversalMatch(pack,fake),/Invalid continuous-state/);
 }
});
test('R40 independent resolved grant survives source leave but not target incarnation or next own START',()=>{
 const {s,grantor,target}=scene();
 immune(s,grantor,target,'any');
 immune(s,grantor,target,'character');
 s.players[0].front[0]=null;s.players[0].outside.push(grantor);
 assert.equal(effectChoiceProtected(s,1,target.uid,'event'),true);
 expireContinuousStates(s,{player:1,phase:'start',edge:'start'});
 assert.equal(s.continuousStates.length,2);
 s.players[0].front[1].fieldEntryStamp=s.nextFieldEntryStamp++;
 pruneContinuousStates(s);
 assert.equal(effectChoiceProtected(s,1,target.uid,'event'),false);
 assert.equal(s.continuousStates.length,0);
 immune(s,grantor,target,'any');
 expireContinuousStates(s,{player:0,phase:'start',edge:'start'});
 assert.equal(s.continuousStates.length,0);
 assert.equal(assertUniversalMatch(pack,s),true);
});
