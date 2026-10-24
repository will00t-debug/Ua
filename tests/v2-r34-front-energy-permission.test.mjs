import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,universalEnergyByColor,universalCardEnergy,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,pruneContinuousStates,expireContinuousStates,
 hasFrontEnergyPermission} from '../dist/universal-v2/continuous-states.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const slg=registeredV2TitlePack('solo-leveling'),packs=[mst,slg];
const mstDeck=Object.fromEntries(['001','002','010','012','013','016','017','019','050','055','063','070'].map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-057']=2;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-041']=2;
assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error(id);
}
function setup(){
 const s=newUniversalMatch(packs,{decks:[mstDeck,slgDeck],first:0,seed:34001});
 const source=take(s,0,'MST-1-001'),target=take(s,0,'MST-1-055');
 const printed=take(s,0,'MST-1-057');
 for(const [c,i] of [[source,0],[target,1],[printed,2]]){
  c.fieldEntryStamp=s.nextFieldEntryStamp++;c.ready=false;s.players[0].front[i]=c;
 }
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,source,target,printed};
}
function grant(s,source,target){
 return grantContinuousState(s,{kind:'frontEnergyPermission',controller:0,
  sourceUid:source.uid,targetUid:target.uid,sourceLinked:false,
  until:{player:s.active,phase:'attack',edge:'end'}});
}
test('R34 Batch B: one live physical producer, printed color/gen, REST and sealed ORIGINAL rules',()=>{
 const {s,source,target,printed}=setup();
 const baseline=universalEnergyByColor(packs,s,0).green;
 assert.equal(universalCardEnergy(packs,s,0,target),0);
 assert.equal(universalCardEnergy(packs,s,0,printed),1);
 grant(s,source,target);
 assert.equal(hasFrontEnergyPermission(s,0,target),true);
 assert.equal(universalCardEnergy(packs,s,0,target),mst.cards[target.cardId].gen);
 assert.equal(universalEnergyByColor(packs,s,0).green,baseline+1);
 target.ready=true;
 assert.equal(universalEnergyByColor(packs,s,0).green,baseline+1);
 // Even repeated same permission does not create another base-energy unit.
 grant(s,source,target);
 assert.equal(universalEnergyByColor(packs,s,0).green,baseline+1);
 grant(s,source,printed);
 assert.equal(universalEnergyByColor(packs,s,0).green,baseline+1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:'1-1',
  targetUid:target.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalEnergyByColor(packs,s,0).green,baseline+1);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 expireContinuousStates(s,{player:0,phase:'attack',edge:'end'});
 assert.equal(universalEnergyByColor(packs,s,0).green,baseline);
 assert.equal(hasFrontEnergyPermission(s,0,target),false);
});
test('R34 permission outlives grantor but cannot follow old field incarnation / other owner',()=>{
 const {s,source,target}=setup();
 grant(s,source,target);const originally=target.fieldEntryStamp;
 s.players[0].front[0]=null;s.players[0].outside.push(source);
 assert.equal(universalCardEnergy(packs,s,0,target),1);
 // Moving to ENERGY never adds the same physical card twice.
 s.players[0].front[1]=null;s.players[0].energy[1]=target;
 assert.equal(universalCardEnergy(packs,s,0,target),1);
 assert.equal(s.players[0].front.filter(Boolean).some(x=>x.uid===target.uid),false);
 s.players[0].energy[1]=null;s.players[0].front[1]=target;
 assert.equal(target.fieldEntryStamp,originally);
 assert.equal(universalCardEnergy(packs,s,0,target),1);
 // Leaving the field and re-entering establishes a fresh physical incarnation.
 s.players[0].front[1]=null;s.players[0].outside.push(target);
 pruneContinuousStates(s);
 s.players[0].outside.splice(s.players[0].outside.findIndex(x=>x.uid===target.uid),1);
 target.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[1]=target;
 assert.equal(hasFrontEnergyPermission(s,0,target),false);
 assert.equal(universalCardEnergy(packs,s,0,target),0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R34 schema rejects wrong owner, source-linked permission, false expiry, forged saved fields',()=>{
 const {s,source,target}=setup();
 for(const bad of [
  {sourceLinked:true},{controller:1},
  {until:{player:1,phase:'attack',edge:'end'}},
  {until:{player:0,phase:'start',edge:'end'}},
  {targetUid:'0-unknown'}
 ])assert.throws(()=>grantContinuousState(structuredClone(s),{
  kind:'frontEnergyPermission',controller:0,sourceUid:source.uid,targetUid:target.uid,
  sourceLinked:false,until:{player:0,phase:'attack',edge:'end'},...bad
 }),/FRONT energy permission|live field target/);
 grant(s,source,target);
 for(const mutate of [
  e=>e.targetOwner=1,e=>e.sourceLinked=true,
  e=>e.until.phase='start',e=>e.until.spoof=1,e=>e.bonusEnergy=1
 ]){
  const fake=structuredClone(s);mutate(fake.continuousStates[0]);
  assert.throws(()=>assertUniversalMatch(packs,fake),/Invalid continuous-state/);
 }
});
test('R34 nested common mode DSL requires strictly optional current-turn trait target',()=>{
 const base={id:'QA',name:'QA',color:'green',energy:0,ap:1,bp:1000,gen:1,
  type:'character',implementation:'dsl',effects:{onPlay:[{op:'chooseOne',
   optional:false,options:[
    {id:'draw',label:'Draw',turn:'any',then:[{op:'drawDiscard',count:1}]},
    {id:'energy',label:'Energy',turn:'any',then:[
     {op:'grantFrontEnergyOwnOtherFrontTrait',trait:'ラノア魔法大学',optional:true,until:'thisTurn'}]}
   ]}]}};
 const make=x=>createUniversalPack({id:'r34-qa',cards:[x]});
 assert.equal(make(base).cards.QA.effects.onPlay[0].op,'chooseOne');
 for(const bad of [
  {optional:false},{until:'nextOwnTurn'},{trait:''},{energy:1}
 ]){
  const x=structuredClone(base);
  Object.assign(x.effects.onPlay[0].options[1].then[0],bad);
  assert.throws(()=>make(x),/invalid temporary FRONT generation grant/);
 }
});


test('R34 off-turn granted permission expires on that active opponent turn, not next owner turn',()=>{
 const {s,source,target}=setup();
 s.active=1;s.players[1].ownTurns++;
 grantContinuousState(s,{kind:'frontEnergyPermission',controller:0,
  sourceUid:source.uid,targetUid:target.uid,sourceLinked:false,
  until:{player:1,phase:'attack',edge:'end'}});
 assert.equal(hasFrontEnergyPermission(s,0,target),true);
 assert.equal(universalCardEnergy(packs,s,0,target),1);
 expireContinuousStates(s,{player:0,phase:'attack',edge:'end'});
 assert.equal(hasFrontEnergyPermission(s,0,target),true);
 expireContinuousStates(s,{player:1,phase:'attack',edge:'end'});
 assert.equal(hasFrontEnergyPermission(s,0,target),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
