import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const grant={op:'grantOnAttack',target:'self',until:'endOfTurn',optional:true,then:[{op:'draw',count:1}]};
const cards=Array.from({length:13},(_,i)=>({
 id:'G'+i,name:'G'+i,type:'character',color:'green',energy:0,ap:1,bp:2000,gen:1,
 implementation:[0,1].includes(i)?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[grant],onAttack:[{op:'draw',count:1}]}}:{}),
 ...(i===1?{effects:{onPlay:[{...grant,target:'ownCharacter'}]}}:{})
}));
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const packs=[createUniversalPack({id:'grant-a',cards}),createUniversalPack({id:'grant-b',cards})];
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('missing physical');
}
function game(owner,extra){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:owner,seed:2501});
 const target=take(s,owner,'G0');s.players[owner].hand.push(target);
 if(extra){
  // Two actual AP become available on the second own turn; do not fake AP.
  for(let i=0;i<12&&!(s.players[owner].ownTurns===2&&s.active===owner&&s.phase==='main');i++){
   const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(next,'legal round advance');
   s=dispatchUniversalAction(packs,s,next,{actor:s.pending?.player??s.active});
  }
  assert.equal(s.players[owner].ownTurns,2);
  assert.equal(s.phase,'main');
 }else s.phase='main';
 let action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===target.uid&&a.line==='front');
 s=dispatchUniversalAction(packs,s,action,{actor:owner});
 if(extra){
  const source=take(s,owner,'G1');s.players[owner].hand.push(source);
  action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
  s=dispatchUniversalAction(packs,s,action,{actor:owner});
  assert.equal(s.pending?.kind,'effect-grant-attack');
  const legal=legalUniversalActions(packs,s);
  assert.ok(legal.some(a=>a.uid===target.uid));
  for(const difficulty of ['normal','hard'])
   assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
  s=dispatchUniversalAction(packs,s,{type:'chooseGrantAttack',uid:target.uid},{actor:owner});
 }
 s.players[owner].front[0].ready=true;s.phase='attack';
 return {s,target};
}
for(const owner of [0,1])for(const extra of [false,true])test('printed + physical granted onAttack and independent stacking owner '+owner+' extra '+extra,()=>{
 let {s,target}=game(owner,extra);
 assert.equal(s.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&e.targetUid===target.uid).length,extra?2:1);
 const deckStart=s.players[owner].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:target.uid},{actor:owner});
 assert.equal(s.pending?.kind,'granted-attack-draw');
 assert.equal(s.players[owner].deck.length,deckStart-1);
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard'])assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 const original=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'invalid'},{actor:owner}),/not currently legal/);
 assert.deepEqual(s,original);
 s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'draw'},{actor:owner});
 if(extra){
  assert.equal(s.pending?.kind,'granted-attack-draw');
  s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'skip'},{actor:owner});
 }
 assert.equal(s.pending?.kind,'block');
 assert.equal(s.players[owner].deck.length,deckStart-2);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('grant expires at attack end, and new field incarnation does not inherit granted abilities',()=>{
 let {s}=game(0,false);
 assert.equal(s.continuousStates.filter(e=>e.kind==='grantedOnAttack').length,1);
 s=dispatchUniversalAction(packs,s,{type:'next'},{actor:0});
 assert.equal(s.continuousStates.some(e=>e.kind==='grantedOnAttack'),false);
 ({s}=game(0,false));
 const physical=s.players[0].front[0];physical.fieldEntryStamp=s.nextFieldEntryStamp++;
 s=dispatchUniversalAction(packs,s,{type:'next'},{actor:0});
 assert.equal(s.continuousStates.some(e=>e.kind==='grantedOnAttack'),false);
});
test('unknown or permanent grants fail closed rather than becoming real cards',()=>{
 for(const invalid of [{...grant,until:'forever'},{...grant,target:'opponent'},
  {...grant,optional:false},{...grant,then:[{op:'draw',count:2}]},
  {...grant,then:[{op:'draw',count:1},{op:'draw',count:1}]}]){
  const changed=cards.map(c=>c.id==='G0'?{...c,effects:{onPlay:[invalid]}}:c);
  assert.throws(()=>createUniversalPack({id:'invalid-grant',cards:changed}),/invalid granted attack/i);
 }
});


// R28: official MST Q2220/Q2228 distinguish lost ORIGINAL text from
// independently earned grants. These tests use actual 50-card deck actions.
test('R28 original-effects silence after earning suppresses printed onAttack but keeps earned draw',async()=>{
 const {grantContinuousState,originalEffectsDisabled}=await import('../dist/universal-v2/continuous-states.mjs');
 let {s,target}=game(0,false);
 const count=s.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&e.targetUid===target.uid).length;
 assert.equal(count,1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:target.uid,targetUid:target.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(originalEffectsDisabled(s,s.players[0].front[0]),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:target.uid},{actor:0});
 assert.equal(s.pending?.kind,'granted-attack-draw','earned grant must still offer legal choice');
 assert.equal(s.players[0].deck.length,before,'silenced printed draw did not fire');
 const offered=legalUniversalActions(packs,s);
 assert.ok(offered.some(a=>a.type==='chooseGrantedDraw'&&a.mode==='draw'));
 for(const difficulty of ['normal','hard'])
  assert.ok(offered.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'draw'},{actor:0});
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending?.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('R28 giver may depart after a completed grant; two physical grants still resolve separately',async()=>{
 const {pruneContinuousStates}=await import('../dist/universal-v2/continuous-states.mjs');
 let {s,target}=game(0,true);
 const giverIndex=s.players[0].front.findIndex(c=>c?.cardId==='G1');
 assert.ok(giverIndex>=0);
 const giver=s.players[0].front[giverIndex];
 s.players[0].front[giverIndex]=null;s.players[0].outside.push(giver);
 pruneContinuousStates(s);
 assert.equal(s.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&e.targetUid===target.uid).length,2);
 const before=s.players[0].deck.length;
 assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:target.uid},{actor:0});
 assert.equal(s.pending?.kind,'granted-attack-draw');
 assert.equal(s.players[0].deck.length,before-1,'printed draw');
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'draw'},{actor:0});
 assert.equal(s.pending?.kind,'granted-attack-draw');
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'skip'},{actor:0});
 assert.equal(s.players[0].deck.length,before-2);
 assert.equal(s.pending?.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('R28 serialized earned grant cannot upgrade its bounded printed-free program',()=>{
 const {s}=game(0,false);
 const pristine=JSON.parse(JSON.stringify(s));
 assert.equal(assertUniversalMatch(packs,pristine),true);
 for(const breakGrant of [
  g=>{g.program[0].count=2;},
  g=>{g.optional=false;},
  g=>{g.until.edge='forever';},
  g=>{g.sourceLinked=true;g.sourceStamp=999999;}
 ]){
  const bad=structuredClone(pristine);
  breakGrant(bad.continuousStates.find(g=>g.kind==='grantedOnAttack'));
  assert.throws(()=>assertUniversalMatch(packs,bad),/Invalid|invalid/i);
 }
 assert.equal(assertUniversalMatch(packs,s),true);
});


// R29: combined physical source departure, original-text silence, and
// independently earned status grants; all operations are verified in the
// already existing universal continuousStates/action pipeline.
for(const owner of [0,1])
 test('R29 granted two independent attacks survive giver departure AND recipient printed silence, owner '+owner,async()=>{
  const {grantContinuousState,pruneContinuousStates,originalEffectsDisabled}=
   await import('../dist/universal-v2/continuous-states.mjs');
  let {s,target}=game(owner,true);
  const giverIndex=s.players[owner].front.findIndex(c=>c?.cardId==='G1');
  const giver=s.players[owner].front[giverIndex];
  assert.ok(giver&&giver.uid!==target.uid);
  const ids=s.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&e.targetUid===target.uid).map(e=>e.id);
  assert.equal(new Set(ids).size,2);
  grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1-owner,
   sourceUid:target.uid,targetUid:target.uid,sourceLinked:false,
   until:{player:owner,phase:'attack',edge:'end'}});
  s.players[owner].front[giverIndex]=null;s.players[owner].outside.push(giver);
  pruneContinuousStates(s);
  assert.equal(originalEffectsDisabled(s,s.players[owner].front[0]),true);
  assert.deepEqual(s.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&
   e.targetUid===target.uid).map(e=>e.id),ids);
  assert.equal(assertUniversalMatch(packs,s),true);
  const start=s.players[owner].deck.length;
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:target.uid},{actor:owner});
  assert.equal(s.players[owner].deck.length,start,'original printed onAttack is silenced');
  for(const mode of ['draw','skip']){
   assert.equal(s.pending?.kind,'granted-attack-draw');
   const actions=legalUniversalActions(packs,s);
   for(const difficulty of ['normal','hard'])
    assert.ok(actions.some(a=>JSON.stringify(a)===JSON.stringify(
     chooseUniversalAiAction(packs,s,{difficulty}))));
   const before=structuredClone(s);
   assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',
    mode:'fake'},{actor:owner}),/not currently legal/);
   assert.deepEqual(s,before);
   s=JSON.parse(JSON.stringify(s));
   assert.equal(assertUniversalMatch(packs,s),true);
   s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode},{actor:owner});
  }
  assert.equal(s.pending?.kind,'block');
  assert.equal(s.players[owner].deck.length,start-1,'only one of two earned draws was chosen');
  assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 });

test('R29 earned grants cannot follow reused physical UID into a new field incarnation',async()=>{
 const {pruneContinuousStates}=await import('../dist/universal-v2/continuous-states.mjs');
 let {s,target}=game(0,true);
 const oldStamp=s.players[0].front[0].fieldEntryStamp;
 assert.equal(s.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&e.targetUid===target.uid).length,2);
 const slot=s.players[0].front.findIndex(c=>c?.uid===target.uid);
 assert.ok(slot>=0);
 const samePhysical=s.players[0].front[slot];s.players[0].front[slot]=null;
 s.players[0].outside.push(samePhysical);
 pruneContinuousStates(s);
 assert.equal(s.continuousStates.some(e=>e.kind==='grantedOnAttack'&&e.targetUid===target.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 s.players[0].outside.splice(s.players[0].outside.findIndex(c=>c.uid===target.uid),1);
 samePhysical.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[slot]=samePhysical;
 assert.notEqual(samePhysical.fieldEntryStamp,oldStamp);
 assert.equal(s.continuousStates.some(e=>e.kind==='grantedOnAttack'&&e.targetUid===target.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
