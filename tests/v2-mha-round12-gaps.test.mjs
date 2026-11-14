// Round 12 gaps, kept on round 14. 056, 059, 071, 074, 087, 089 and 093
// are now programs. 076's empty-front move exists, and a full front still
// does not remove a card first.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_PROGRAMS_051_100} from '../dist/universal-v2/mha/programs-051-100.mjs';
import {MHA_REQUESTS_051_100} from '../dist/universal-v2/mha/requests-051-100.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';

const STILL=[
 'MHA-1-055','MHA-1-060','MHA-1-062','MHA-1-066',
 'MHA-1-072','MHA-1-076','MHA-1-081','MHA-1-084'
];
const KEPT=['MHA-1-051','MHA-1-054','MHA-1-056','MHA-1-059','MHA-1-070','MHA-1-071','MHA-1-074'];

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

test('056 uses the named tuck and the attack strip',()=>{
 reject(face({
  id:'GAP-056',
  effects:{
   onPlay:[{op:'optionalTuckHandUnderNames',names:['ファットガム','天喰 環'],
    then:[{op:'draw',count:1}]}],
   onAttack:[{op:'maySpendFacedown',count:1,then:[{op:'buffSelf',bp:2000}]}]
  }
 }),/effect op unsupported/);
 accept(face({
  id:'GAP-056-OK',
  effects:{
   onPlay:[{op:'tuckFacedownUnder',from:'hand',host:{names:['ファットガム','天喰 環']},
    count:1,optional:true,then:[{op:'draw',count:1}]}],
   onAttack:[{op:'stripFacedownToOutside',optional:true,max:1,host:'self',to:'outside',
    then:[{op:'buffSelf',bp:2000}]}]
  }
 }));
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-056'].effects.onPlay[0].op,'tuckFacedownUnder');
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-056'].effects.onAttack[0].then[0].bp,2000);
});

test('059 plays one cheap green character active or by raid',()=>{
 reject(face({
  id:'GAP-059',trigger:'color',
  triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1},
  effects:{onPlay:[{op:'deployOwnHandActiveOrRaid',type:'character',color:'green',
   trait:null,maxEnergy:3,ap:1,max:1,optional:true}]}
 }),/invalid active or raid hand entry/);
 accept(face({
  id:'GAP-059-OK',trigger:'color',
  triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1},
  effects:{onPlay:[{op:'deployOwnHandActiveOrRaid',type:'character',color:'green',
   trait:null,maxEnergy:3,ap:1,max:1,optional:true,requireAffordableEnergy:true}]}
 }));
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-059'].triggerEffect.maxEnergy,2);
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-059'].effects.onPlay[0].maxEnergy,3);
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

test('071 puts one hand card outside and does not draw',()=>{
 accept(face({
  id:'GAP-071',
  effects:{onPlay:[{op:'placeHandOutside',count:1,optional:false}]}
 }));
 reject(face({
  id:'GAP-071B',
  effects:{onPlay:[{op:'placeHandOutside',count:1,optional:true}]}
 }),/invalid hand outside placement/);
 reject(face({
  id:'GAP-071C',
  effects:{onPlay:[{op:'optionalRemoveHandThen',zone:'outside',then:[{op:'draw',count:0}]}]}
 }),/invalid optional hand removal/);
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-071'].effects.onPlay[0].optional,false);
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

test('074 stays on its own turn when an opponent effect would move it',()=>{
 reject(face({
  id:'GAP-074',ownTurnLeaveReplace:{oncePerTurn:true,cause:'opponentEffect'},
  effects:{}
 }),/declares dsl without effects/);
 accept(face({
  id:'GAP-074-OK',
  oppEffectLeave:{turn:'own',oncePerTurn:true,instead:'stay',cause:'effect',
   subject:'self',line:'any'},
  effects:{}
 }));
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-074'].oppEffectLeave.turn,'own');
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-074'].oppEffectLeave.instead,'stay');
});

test('076 can move while the front has room, and a full front still cannot remove first',()=>{
 accept(face({
  id:'GAP-076',
  effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:null,max:1,
   whenSelf:'front',optional:true}]}
 }));
 reject(face({
  id:'GAP-076B',
  effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:null,max:1,whenSelf:'front'}]}
 }),/invalid energy-line trait move/);
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-076'],undefined);
 const mover=face({
  id:'GAP-076-LIVE',energy:0,
  effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:null,max:1,
   whenSelf:'front',optional:true}]}
 });
 const fuel=face({id:'GAP-076-FUEL',name:'能源',implementation:'vanilla',bp:1000,effects:{}});
 const bodies=[mover,fuel];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(face({id:'GAP-076-FILL-'+n,implementation:'vanilla',bp:1000,effects:{}}));
  n++;
 }
 const livePack=createUniversalPack({id:'gap-076',version:'full-front',cards:bodies});
 const counts={};
 let remain=50;
 for(const card of bodies){
  if(remain<=0)break;
  const take=Math.min(4,remain);
  counts[card.id]=take;
  remain-=take;
 }
 let s=newUniversalMatch(livePack,{decks:[counts,counts],seed:7601,first:0,openingMulligan:false});
 for(let i=0;i<8&&s.phase!=='main';i++)s=dispatchUniversalAction(livePack,s,{type:'next'});
 const take=id=>{
  const pl=s.players[0];
  for(const zone of ['hand','deck','life']){
   const at=pl[zone].findIndex(c=>c.cardId===id);
   if(at>=0)return pl[zone].splice(at,1)[0];
  }
  throw Error('missing '+id);
 };
 for(let slot=1;slot<s.players[0].front.length;slot++){
  const body=take('GAP-076-FUEL');
  body.ready=true;
  body.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[slot]=body;
 }
 const back=take('GAP-076-FUEL');
 back.ready=false;
 back.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=back;
 const hand=s.players[0].hand.find(c=>c.cardId==='GAP-076-LIVE')||take('GAP-076-LIVE');
 if(!s.players[0].hand.includes(hand))s.players[0].hand.push(hand);
 const opened=dispatchUniversalAction(livePack,s,legalUniversalActions(livePack,s).find(a=>
  a.type==='play'&&a.uid===hand.uid&&a.line==='front'&&a.slot===0));
 assert.equal(opened.players[0].front.every(Boolean),true);
 assert.equal(opened.pending,null);
 assert.equal(opened.players[0].energy[0].uid,back.uid);
 assert.equal(opened.players[0].removed.length,0);
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
