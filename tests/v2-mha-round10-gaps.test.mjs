// Round 10 C. 001, 013, 014 and 018 are ready. 006, 007, 009, 010 and 017
// have a shared shape and stay out of the pack. The other sentences stay
// rejected.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_REQUESTS_001_050} from '../dist/universal-v2/mha/requests-001-050.mjs';
import {createMhaV2Pack, MHA_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {officialV2Pack, v2DeckReport} from '../dist/universal-v2/official-entry.mjs';

const PRIORITY=[
 'MHA-1-003','MHA-1-004','MHA-1-005','MHA-1-011'
];
const ALREADY=[
 'MHA-1-001','MHA-1-006','MHA-1-007','MHA-1-009','MHA-1-010','MHA-1-012',
 'MHA-1-013','MHA-1-014','MHA-1-017','MHA-1-018','MHA-1-019','MHA-1-027','MHA-1-048'
];

function face(extra){
 const effects=extra.effects||{};
 const rest={...extra};
 delete rest.effects;
 return {
  id:rest.id, name:rest.name||rest.id, color:'purple', type:'character',
  energy:1, ap:1, bp:2000, gen:1, traits:[], trigger:null,
  ...rest, implementation:rest.implementation||'dsl', effects
 };
}
function deck(card){
 const fillers=Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'), implementation:'vanilla', bp:1000
 }));
 return {id:'mha-round10-gap', version:'gap', cards:[card,...fillers]};
}
function reject(card, pattern){
 assert.throws(()=>createUniversalPack(deck(card)), pattern);
}
function accept(card){
 assert.doesNotThrow(()=>createUniversalPack(deck(card)));
}

test('round 10 priority cards stay pending and earlier ready cards stay ready',()=>{
 const pack=createMhaV2Pack();
 for(const id of PRIORITY){
  const request=MHA_REQUESTS_001_050[id];
  assert.equal(request.needs,'A');
  assert.ok(request.whyNotEnough.length>20);
  assert.equal(pack.cards[id],undefined);
 }
 for(const id of ALREADY)assert.equal(pack.cards[id].id,id);
 const official=officialV2Pack('mha');
 for(const id of PRIORITY)assert.equal(official.cards[id],undefined);
 const closed=v2DeckReport('mha',{'MHA-1-012':4});
 assert.equal(closed.ok,false);
 assert.match(closed.issues.join('\n'),/尚未開放正式對戰/);
 assert.match(MHA_OFFICIAL_MATCH_CLOSED,/尚未開放正式對戰/);
});

test('001 accepts one retirement draw and one hand discard, and rejects a larger profile',()=>{
 accept(face({
  id:'GAP-001', impactNull:true,
  effects:{onRetire:[{op:'drawDiscard',count:1}]}
 }));
 reject(face({
  id:'GAP-001B', impactNull:true,
  effects:{onRetire:[{op:'drawDiscard',count:2,discardCount:1}]}
 }),/retirement draw-discard is one draw and one hand card/);
});

test('002 cannot mill three and then recover a trait or a named card',()=>{
 reject(face({
  id:'GAP-002',
  effects:{onPlay:[{
   op:'millTop', count:3, optional:true,
   then:[{op:'recoverOutsideOne', optional:true, logic:'any',
    filters:[{field:'trait',value:'死穢八斎會'}]}]
  }]}
 }),/optional mill follow-up must recover one purple character/);
});

test('003 cannot count characters that have an activate-main keyword',()=>{
 reject(face({
  id:'GAP-003',
  passiveBonuses:[{bp:1000,condition:{
   kind:'ownActivateMainAtLeast', turn:'any', min:3
  }}]
 }),/invalid passive condition/);
});

test('005 can grant damage 2 from a main-phase once, and a different amount stays illegal',()=>{
 accept(face({
  id:'GAP-005', ownTurnBp:2000,
  battleRequiresAnyName:['オール・フォー・ワン','死柄木 弔'],
  mainAbility:{
   op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
   then:[{op:'grantSelfAttackDamageThisTurn',amount:2}]
  }
 }));
 reject(face({
  id:'GAP-005B', ownTurnBp:2000,
  mainAbility:{
   op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
   then:[{op:'grantSelfAttackDamageThisTurn',amount:1}]
  }
 }),/unsupported main action ability/);
});

test('018 accepts a main-phase battle-win draw, and 011 accepts a main-phase block grant',()=>{
 accept(face({
  id:'GAP-018',
  mainAbility:{
   op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
   then:[{op:'grantSelfAttackWinDrawThisTurn'}]
  }
 }));
 reject(face({
  id:'GAP-018B',
  mainAbility:{
   op:'frontOnceProgram', frontOnly:true, oncePerTurn:true,
   then:[{op:'grantSelfAttackWinDrawThisTurn'}]
  }
 }),/unsupported main action ability/);
 accept(face({
  id:'GAP-011', blockSkipsNextActive:true,
  mainAbility:{
   op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
   then:[{op:'grantSelfMustBlockThisTurn'}]
  }
 }));
 reject(face({
  id:'GAP-011B',
  mainAbility:{
   op:'frontOnceProgram', frontOnly:true, oncePerTurn:true,
   then:[{op:'grantSelfMustBlockThisTurn'}]
  }
 }),/unsupported main action ability/);
});

test('013 and 014 accept the life follow-up and reject a follow-up that is not that sentence',()=>{
 accept(face({
  id:'GAP-013',
  effects:{onPlay:[{
   op:'optionalOwnLifeToHandThenDraw',
   then:[{op:'activeOwnOther',optional:true,line:'front'}]
  }]}
 }));
 accept(face({
  id:'GAP-014', raidName:'荼毘',
  effects:{onPlay:[{
   op:'optionalOwnLifeToHandThenDraw',
   then:[{op:'retireOppFrontUnderBp',bp:3500,optional:true}]
  }]}
 }));
 reject(face({
  id:'GAP-013B',
  effects:{onPlay:[{
   op:'optionalOwnLifeToHandThenDraw',
   then:[{op:'activeOwnOther',count:1}]
  }]}
 }),/invalid optional life-to-hand draw/);
 reject(face({
  id:'GAP-014B', raidName:'荼毘',
  effects:{onPlay:[{
   op:'optionalOwnLifeToHandThenDraw',
   then:[{op:'retireOppFrontUnderBp',bp:3500}]
  }]}
 }),/invalid optional life-to-hand draw/);
});

test('006 and 007 accept the shared shape and still reject a different parameter',()=>{
 accept(face({
  id:'GAP-006',
  mainAbility:{op:'payHandMoveOrSwap',oncePerTurn:true,pay:1}
 }));
 reject(face({
  id:'GAP-006B',
  mainAbility:{op:'payHandMoveOrSwap',oncePerTurn:true,pay:2}
 }),/unsupported main action ability/);
 accept(face({
  id:'GAP-007', printedImpact:1, battleLoseToHand:'ownTurn'
 }));
 reject(face({
  id:'GAP-007B', printedImpact:1, battleLoseToHand:'both'
 }),/invalid battle-loss hand replacement/);
});

test('009, 010 and 017 accept the shared sentence and reject a different parameter',()=>{
 accept(face({
  id:'GAP-009',
  mainAbility:{op:'payHandGrantImpact',oncePerTurn:true,pay:1,amount:1}
 }));
 reject(face({
  id:'GAP-009B',
  mainAbility:{op:'payHandGrantImpact',oncePerTurn:true,pay:2,amount:1}
 }),/unsupported main action ability/);
 accept(face({
  id:'GAP-010', raidName:'死柄木 弔',
  mainAbility:{
   op:'frontOnceProgram', frontOnly:true, oncePerTurn:true,
   then:[{op:'removeOppFrontUnderBp',bp:2000}]
  }
 }));
 reject(face({
  id:'GAP-010B', raidName:'死柄木 弔',
  mainAbility:{
   op:'frontOnceProgram', frontOnly:true, oncePerTurn:true,
   then:[{op:'removeOppFrontUnderBp',bp:2000,optional:false}]
  }
 }),/unsupported main action ability/);
 accept(face({
  id:'GAP-017', raidName:'トゥワイス',
  effects:{onPlay:[{op:'deployRaidBottomActive',optional:true}]}
 }));
 reject(face({
  id:'GAP-017B', raidName:'トゥワイス',
  effects:{onRetire:[{op:'deployRaidBottomActive',optional:true}]}
 }),/raid-bottom active entry without a gate/);
 assert.equal(createMhaV2Pack().cards['MHA-1-009'].battleRemoveInstead,true);
 assert.equal(createMhaV2Pack().cards['MHA-1-010'].raidName,'死柄木 弔');
 assert.equal(createMhaV2Pack().cards['MHA-1-017'].raidName,'トゥワイス');
});
