// Round 12 D. A group's round 12 integration branch is not on the remote.
// These cases are the printed sentences the current shared DSL still rejects.
// MHA-1-051 and MHA-1-054 stay ready. MHA-1-070 uses the existing
// discardHandThenActive payment and is not in this list.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_PROGRAMS_051_100} from '../dist/universal-v2/mha/programs-051-100.mjs';
import {MHA_REQUESTS_051_100} from '../dist/universal-v2/mha/requests-051-100.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';

const STILL=[
 'MHA-1-055','MHA-1-056','MHA-1-059','MHA-1-060','MHA-1-062','MHA-1-066',
 'MHA-1-071','MHA-1-072','MHA-1-074','MHA-1-076','MHA-1-081','MHA-1-084'
];
const KEPT=['MHA-1-051','MHA-1-054','MHA-1-070'];

function face(extra){
 const effects=extra.effects||{};
 const rest={...extra};
 delete rest.effects;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'green',
  type:rest.type||'character',energy:rest.energy??1,ap:rest.ap??1,
  bp:rest.bp??2000,gen:1,traits:[],trigger:rest.trigger??null,
  ...rest,implementation:rest.implementation||'dsl',effects
 };
}
function deck(card){
 const fillers=Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),implementation:'vanilla',bp:1000,effects:{}
 }));
 return {id:'mha-round12-gap',version:'gap',cards:[card,...fillers]};
}
function reject(card,pattern){
 assert.throws(()=>createUniversalPack(deck(card)),pattern);
}
function accept(card){
 assert.doesNotThrow(()=>createUniversalPack(deck(card)));
}

test('round 12 priority cards stay pending except the completed payment',()=>{
 const pack=createMhaV2Pack();
 const open=new Set(MHA_REQUESTS_051_100.map(row=>row.cardId));
 for(const id of STILL){
  assert.equal(pack.cards[id],undefined,id);
  assert.equal(MHA_PROGRAMS_051_100[id],undefined,id);
  assert.equal(open.has(id),true,id);
 }
 for(const id of KEPT){
  assert.equal(pack.cards[id].id,id);
  assert.equal(MHA_PROGRAMS_051_100[id].ready,true);
  assert.equal(open.has(id),false,id);
 }
 assert.equal(pack.cards['MHA-1-063'].effects.onPlay[0].op,'grantOwnFieldAttackKit');
 assert.deepEqual(pack.cards['MHA-1-070'].printedMains,[
  {id:'outside',op:'discardHandThenActive',discard:1}
 ]);
});

test('055 cannot retire a front character from the energy-count gate',()=>{
 reject(face({
  id:'GAP-055',step:true,
  effects:{onPlay:[{
   op:'ifLiveThen',
   when:{kind:'ownOtherRequiredEnergyAtLeast',turn:'any',zone:'field',
    excludeSelf:true,minEnergy:4,min:3},
   then:[{op:'retireOppFrontUnderBp',bp:5000}]
  }]}
 }),/invalid live-condition follow-up/);
});

test('056 cannot tuck a hand card under a named character',()=>{
 reject(face({
  id:'GAP-056',
  effects:{
   onPlay:[{op:'optionalTuckHandUnderNames',names:['ファットガム','天喰 環'],
    then:[{op:'draw',count:1}]}],
   onAttack:[{op:'maySpendFacedown',count:1,then:[{op:'buffSelf',bp:2000}]}]
  }
 }),/effect op unsupported/);
 reject(face({
  id:'GAP-056B',
  effects:{onRetire:[{op:'handOutsideReenterFaceDown',name:'ファットガム'}]}
 }),/invalid facedown reenter/);
 accept(face({
  id:'GAP-056C',
  effects:{onPlay:[{op:'optionalTuckDeckTopUnder'}]}
 }));
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-056'],undefined);
});

test('059 cannot active-play or raid a cheap green character',()=>{
 reject(face({
  id:'GAP-059',trigger:'color',
  triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1},
  effects:{onPlay:[{op:'deployOwnHandActiveOrRaid',type:'character',color:'green',
   maxEnergy:3,ap:1,max:1,optional:true}]}
 }),/effect op unsupported/);
 reject(face({
  id:'GAP-059B',
  effects:{onPlay:[{op:'deployOwnHandActiveNoRaid',type:'character',color:'green',
   maxEnergy:3,ap:1,optional:true}]}
 }),/active entry are event onPlay/);
});

test('060 cannot pay one hand card to outside and then active another character',()=>{
 reject(face({
  id:'GAP-060',raidName:'緑谷 出久',ownTurnBp:500,
  effects:{onAttack:[{
   op:'oncePerTurnGate',scope:'card',optional:true,
   then:[{op:'optionalRemoveHandThen',zone:'outside',
    then:[{op:'activeOwnOne',optional:true,maxEnergy:3,excludeName:'緑谷 出久'}]}]
  }]}
 }),/invalid once-per-turn gate/);
});

test('062 cannot enter active only while Mei is present, then buff everyone',()=>{
 reject(face({
  id:'GAP-062',type:'field',bp:0,energy:2,enterActiveIfName:'発目 明',
  effects:{onPlay:[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:true}]},
  mainAbility:{op:'fieldRestRetireThen',then:[{op:'buffOwnField',
   filter:{field:'type',value:'character'},bp:500,optional:false}]}
 }),/unsupported main action ability/);
});

test('066 cannot rest-play a traitless green character after the look',()=>{
 reject(face({
  id:'GAP-066',type:'event',bp:0,energy:4,ap:2,
  effects:{onPlay:[
   {op:'lookTopScript',count:3,rest:'bottom',takes:[
    {to:'hand',max:1,publish:true,type:'character'}]},
   {op:'deployOwnHandRest',type:'character',color:'green',energy:null,
    ap:null,max:1,trait:null}
  ]}
 }),/invalid hand REST entry/);
});

test('071 cannot put one hand card outside without drawing',()=>{
 reject(face({
  id:'GAP-071',
  effects:{onPlay:[{op:'placeHandOutside',count:1,optional:false}]}
 }),/effect op unsupported/);
 reject(face({
  id:'GAP-071B',
  effects:{onPlay:[{op:'optionalRemoveHandThen',zone:'outside',then:[{op:'draw',count:0}]}]}
 }),/invalid optional hand removal/);
});

test('072 cannot draw until three cards or retire by the paid count',()=>{
 reject(face({
  id:'GAP-072',printedAttackDamage:2,
  effects:{
   onPlay:[{op:'discardToDraw',untilHand:3,optional:true}],
   onAttack:[{op:'retireOppFrontUnderBp',handScale:1000,optional:true}]
  }
 }),/invalid discard cost\/draw/);
});

test('074 has no once-per-turn replacement for an opponent effect',()=>{
 reject(face({
  id:'GAP-074',ownTurnLeaveReplace:{oncePerTurn:true,cause:'opponentEffect'},
  effects:{}
 }),/declares dsl without effects/);
});

test('076 cannot move an energy character to the front without a trait',()=>{
 reject(face({
  id:'GAP-076',
  effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:null,max:1,whenSelf:'front'}]}
 }),/invalid energy-line trait move/);
});

test('081 cannot choose life damage or a rest that skips the next active',()=>{
 reject(face({
  id:'GAP-081',raidName:'轟 焦凍',
  effects:{onPlay:[{
   op:'chooseOne',optional:false,ownTurnOnly:true,
   options:[
    {id:'dmg',label:'1ダメージ',turn:'any',then:[{op:'damagePlayer',count:1}]},
    {id:'rest',label:'レスト',turn:'any',
     then:[{op:'restOppFrontOne',optional:true,skipNextActive:true}]}
   ]
  }]}
 }),/invalid choose-one option/);
});

test('084 cannot widen the next BP selection from a front activate',()=>{
 reject(face({
  id:'GAP-084',trigger:'color',
  triggerEffect:{op:'retireOppFrontUnderBp',bp:2500},
  mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'grantNextBpWindow',amount:1000}]}
 }),/unsupported main action ability/);
});
