import test from 'node:test';
import assert from 'node:assert/strict';
import {V2_ABILITY_TEMPLATE_IDS,expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {
 newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,
 universalPublicView,universalActor
} from '../dist/universal-v2/engine.mjs';
import {REAL_V2_PILOT_IDS,portVerifiedPilotCard,verifiedPilotPack} from '../dist/universal-v2/real-card-pilots.mjs';

const character=(overrides={})=>({
 id:'T00',name:'Template fixture',type:'character',color:'green',
 energy:0,ap:1,bp:2000,gen:1,implementation:'vanilla',...overrides
});
const checked=card=>createUniversalPack({id:'template-validation-fixture',cards:[card]});

test('template registry is finite, audited and rejects unknown behaviors instead of guessing from prose',()=>{
 assert.deepEqual(V2_ABILITY_TEMPLATE_IDS,[
  'draw','drawIfOwnEnergyAtLeast','drawIfOwnTraitCount','drawIfOwnName','drawIfOwnNameMinSelfBp','drawIfNameOrDistinctColorNames','millTop','drawDiscardOne','drawDiscardMany','peekTopOne','peekTopOrBottom','recoverAp','buffSelf',
  'enemyBpDown','retireEnemyUnderBp','restEnemyUnderBp','restEnemyFrontBpAtLeast','restEnemyFrontOne',
   'restEnemyFrontSkipNextActive','restEnemyUnderBpSkipNextActive','skipNextActiveOppRest',
   'restSilenceOppFrontIfOwnOutsideField',
   'restOrRetireEnemyFrontByOwnLife',
  'retireEnemyIfFacedown','buffOwnTrait','drawIfRaidUnderFacedown',
  'searchDeckOne','recoverOutsideOne','recoverOutsidePrintedBp','discardToDraw',
  'searchDeckMany','enemyFrontAllBpDown','enemyFrontBpDownInRange','retireEnemyFrontAllUnderBp',
  'buffOwnTraitAllTurn','buffOwnField','buffOwnPrintedBp','buffSelfIfFirstAttack','bounceOwnOtherUnderEnergy',
  'recoverOutsideColorUnderEnergy','oncePerTurnThen','searchDeckWhere','inspectTopArrange','inspectTopNamesOutside','inspectTopAnyOutside','searchTopOneBottomDiscard','searchTopOneBottomDiscardWhere','searchTopUpToTwoBottom','deployOwnHandRest','searchTopUpToOneBottom','payDiscardThen'
 ]);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onPlay:[{template:'drawEnemyDeck',count:1}]}
 })),/unknown\/invalid ability template/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{whenDefeated:[{template:'draw',count:1}]}
 })),/unknown timing/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onPlay:[{template:'draw',count:1,secretExtra:1}]}
 })),/invalid template arguments/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onPlay:[]}
 })),/1–30 templates/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onPlay:[{template:'peekTopOne',count:2}]}
 })),/invalid template arguments/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onPlay:[{template:'draw',count:0}]}
 })),/invalid count/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onPlay:[{template:'draw',count:11}]}
 })),/invalid count/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:4}]}
 })),/invalid count/);
});

test('template parameters encode printed optionality, trait, threshold and name explicitly',()=>{
 const invalid=[
  {template:'enemyBpDown',bp:3000},
  {template:'enemyBpDown',bp:3000,optional:'yes'},
  {template:'restEnemyUnderBp',bp:3000},
  {template:'restEnemyUnderBp',bp:3000,optional:'false'},
  {template:'retireEnemyIfFacedown',bp:5000,optional:false},
  {template:'buffOwnTrait',trait:'',bp:1000,optional:true},
  {template:'buffOwnTrait',trait:'Trait',bp:6000,optional:true},
  {template:'retireEnemyUnderBp',bp:3000,bonusName:'',bonusBp:5000},
  {template:'retireEnemyUnderBp',bp:5000,bonusName:'Hero',bonusBp:3000}
 ];
 for(const [i,e] of invalid.entries())assert.throws(
  ()=>expandAbilityTemplates({onPlay:[e]}),/invalid|incompatible/,
  'reject invalid effect params #'+i
 );
 const valid=expandAbilityTemplates({
  onPlay:[{template:'draw',count:1},{template:'enemyBpDown',bp:1000,optional:false}],
  onAttack:[{template:'buffSelf',bp:1000}]
 });
 assert.deepEqual(valid,{
  onPlay:[{op:'draw',count:1},{op:'enemyBpDown',bp:1000,optional:false}],
  onAttack:[{op:'buffSelf',bp:1000}]
 });
 assert.deepEqual(expandAbilityTemplates({onPlay:[
  {template:'restEnemyUnderBp',bp:3000,optional:false},
  {template:'restEnemyUnderBp',bp:3000,optional:true}
 ]}).onPlay,[
  {op:'restOppFrontUnderBp',bp:3000,optional:false},
  {op:'restOppFrontUnderBp',bp:3000,optional:true}
 ],'explicit mandatory versus optional REST profiles remain distinct');
});

test('templates cannot silently override raw ops, authorize vanilla effects or bypass legality restrictions',()=>{
 assert.throws(()=>checked(character({
  implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]},
  templateEffects:{onPlay:[{template:'draw',count:1}]}
 })),/cannot mix raw and templated effects/);
 assert.throws(()=>checked(character({
  templateEffects:{onPlay:[{template:'draw',count:1}]}
 })),/claims vanilla/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onRaid:[{template:'draw',count:1}]}
 })),/Raid-only effects but no Raid target/);
 assert.throws(()=>checked(character({
  implementation:'dsl',templateEffects:{onPlay:[{template:'buffOwnTrait',trait:'A',bp:1000,optional:true}]}
 })),/require onRaided timing/);
 assert.throws(()=>checked(character({
  type:'event',gen:0,bp:0,energy:1,implementation:'dsl',
  templateEffects:{onPlay:[{template:'buffSelf',bp:1000}]}
 })),/event cannot buff itself/);
 const oldRaw=checked(character({
  implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}
 }));
 assert.deepEqual(oldRaw.cards.T00.effects.onPlay,[{op:'draw',count:1}],
  'legacy directly authored DSL continues to work unchanged');
});

test('all twenty-eight supported templates compile to the established and extended V2 runtime DSL ops in deterministic order',()=>{
 const examples=[
  [{template:'searchDeckWhere',filters:[
   {field:'name',value:'Scout'},{field:'trait',value:'Scout'}],
   logic:'any',count:3,optional:true,shuffle:true},
   {op:'searchDeckWhere',filters:[
    {field:'name',value:'Scout'},{field:'trait',value:'Scout'}],
    logic:'any',count:3,optional:true,shuffle:true}],
  [{template:'inspectTopArrange',count:3,toOutside:true,rest:'bottom'},
   {op:'inspectTopArrange',count:3,toOutside:true,rest:'bottom'}],
  [{template:'enemyFrontAllBpDown',bp:2500},{op:'enemyFrontAllBpDown',bp:2500}],
  [{template:'retireEnemyFrontAllUnderBp',bp:3500},{op:'retireOppFrontAllUnderBp',bp:3500}],
  [{template:'buffOwnTraitAllTurn',trait:'Scout',bp:1000},
   {op:'buffOwnTraitAllTurn',trait:'Scout',bp:1000}],
  [{template:'buffOwnField',filter:{field:'trait',value:'Scout'},
    bp:1000,optional:true,excludeSelf:true},
    {op:'buffOwnField',filter:{field:'trait',value:'Scout'},
     bp:1000,optional:true,excludeSelf:true}],
  [{template:'buffSelfIfFirstAttack',bp:1500},{op:'buffSelfIfFirstAttack',bp:1500}],
  [{template:'bounceOwnOtherUnderEnergy',energy:1},{op:'bounceOwnOtherUnderEnergy',energy:1}],
  [{template:'recoverOutsideColorUnderEnergy',color:'red',energy:2,optional:true},
   {op:'recoverOutsideColorUnderEnergy',color:'red',energy:2,optional:true}],
  [{template:'oncePerTurnThen',scope:'name',optional:true,
    then:[{template:'draw',count:1}]},
   {op:'oncePerTurnGate',scope:'name',optional:true,then:[{op:'draw',count:1}]}],
  [{template:'draw',count:2},{op:'draw',count:2}],
  [{template:'millTop',count:3},{op:'millTop',count:3}],
  [{template:'drawDiscardOne'},{op:'drawDiscard',count:1}],
  [{template:'peekTopOne'},{op:'peekTopOne'}],
  [{template:'recoverAp',count:2},{op:'recoverAp',count:2}],
  [{template:'buffSelf',bp:1000},{op:'buffSelf',bp:1000}],
  [{template:'enemyBpDown',bp:3000,optional:true},{op:'enemyBpDown',bp:3000,optional:true}],
  [{template:'retireEnemyUnderBp',bp:3000,bonusName:'黒崎一護',bonusBp:5000},
   {op:'retireOppFrontUnderBp',bp:3000,bonusName:'黒崎一護',bonusBp:5000}],
  [{template:'restEnemyUnderBp',bp:3000,optional:true},{op:'restOppFrontUnderBp',bp:3000,optional:true}],
  [{template:'restEnemyFrontOne',optional:false},{op:'restOppFrontOne',optional:false}],
  [{template:'retireEnemyIfFacedown',bp:5000,optional:true},{op:'retireOppFrontIfFacedown',bp:5000,optional:true}],
  [{template:'buffOwnTrait',trait:'大グレン団',bp:1000,optional:true},
   {op:'buffOwnTrait',trait:'大グレン団',bp:1000,optional:true}],
  [{template:'drawIfRaidUnderFacedown'},{op:'drawIfRaidUnderFacedown'}],
  [{template:'searchDeckOne',filter:{field:'trait',value:'Scout'},optional:true,shuffle:true},
   {op:'searchDeckOne',filter:{field:'trait',value:'Scout'},optional:true,shuffle:true}],
  [{template:'recoverOutsideOne',filter:{field:'name',value:'Scout'},optional:false},
   {op:'recoverOutsideOne',filter:{field:'name',value:'Scout'},optional:false}],
  [{template:'discardToDraw',count:2,optional:true},{op:'discardToDraw',count:2,optional:true}],
  [{template:'searchDeckMany',filter:{field:'trait',value:'Scout'},
    count:3,optional:true,shuffle:true},
   {op:'searchDeckMany',filter:{field:'trait',value:'Scout'},
    count:3,optional:true,shuffle:true}],
  [{template:'payDiscardThen',optional:true,then:[
   {template:'draw',count:1},
   {template:'enemyBpDown',bp:2000,optional:true}
  ]},{op:'discardGate',optional:true,then:[
   {op:'draw',count:1},{op:'enemyBpDown',bp:2000,optional:true}
  ]}]
 ];
 for(const [input,expected] of examples)
  assert.deepEqual(expandAbilityTemplates({onPlay:[input]}).onPlay,[expected]);
 const list=expandAbilityTemplates({onPlay:[
  {template:'draw',count:1},{template:'restEnemyUnderBp',bp:3000,optional:true}
 ]}).onPlay;
 assert.deepEqual(list,[{op:'draw',count:1},{op:'restOppFrontUnderBp',bp:3000,optional:true}]);
});

test('both real pilot titles compile expanded explicitly verified template effects into engine DSL',()=>{
 const expected={
  'BLC-1-034':{onPlay:[{op:'drawDiscard',count:1}]},
  'BLC-1-036':{onPlay:[{op:'millTop',count:2}]},
  'BLC-1-040':{onPlay:[{op:'peekTopOne'}]},
  'BLC-1-052':{onAttack:[{op:'drawDiscard',count:1}]},
  'BLC-1-064':{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'黒崎一護',bonusBp:5000}]},
  'BLC-1-066':{onPlay:[{op:'recoverAp',count:2}]},
  'BLC-1-103':{onAttack:[{op:'buffSelf',bp:1000}]},
  'BLC-1-105':{onPlay:[{op:'enemyBpDown',bp:3000,optional:true}]},
  'TTG-1-001':{onPlay:[{op:'peekTopOne'}]},
  'TTG-1-009':{onPlay:[{op:'drawDiscard',count:1}]},
  'TTG-1-036':{onPlay:[{op:'recoverAp',count:2}]},
  'TTG-1-037':{onPlay:[{op:'recoverAp',count:2}]},
  'TTG-1-038':{onPlay:[{op:'recoverAp',count:2}]},
  'TTG-1-045':{onRaided:[
   {op:'buffOwnTrait',trait:'大グレン団',bp:1000,optional:true},
   {op:'drawIfRaidUnderFacedown'}
  ]},
  'TTG-1-047':{onAttack:[{op:'buffSelfIfFirstAttack',bp:1500}]},
  'TTG-1-049':{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]},
  'TTG-1-052':{onPlay:[{op:'discardGate',optional:true,then:[
   {op:'recoverOutsideColorUnderEnergy',color:'red',energy:2,optional:true}
  ]}]},
  'TTG-1-051':{onPlay:[{op:'drawDiscard',count:1}]},
  'TTG-1-072':{onPlay:[{op:'draw',count:1},{op:'restOppFrontUnderBp',bp:3000,optional:true}]},
  'TTG-1-073':{onPlay:[{op:'retireOppFrontIfFacedown',bp:5000,optional:true}]},
  'TTG-1-078':{onPlay:[{op:'recoverAp',count:2}]},
  'TTG-1-079':{onPlay:[{op:'recoverAp',count:2}]}
 };
 for(const title of ['bleach','gurren-lagann']){
  const pack=verifiedPilotPack(title);
  for(const id of REAL_V2_PILOT_IDS[title]){
   const raw=portVerifiedPilotCard(title,id),entry=pack.cards[id];
   assert.deepEqual(entry.effects,expected[id]||{},id+' must preserve previous effects exactly');
   if(expected[id]){
    assert.ok(raw.templateEffects,id+' must be declared with reusable templates');
    assert.deepEqual(expandAbilityTemplates(raw.templateEffects),expected[id]);
   }
   assert.ok(Object.isFrozen(entry.effects),id+' compiled effects are frozen');
  }
 }
 assert.equal(Object.keys(expected).length,22);
});

function dualFixture(){
 const makeCards=()=>Array.from({length:13},(_,i)=>character({
  id:'Z'+String(i).padStart(2,'0'),name:'Unit '+i,
  energy:i===0?0:2,gen:i===0?4:1
 }));
 const titleA=makeCards(),titleB=makeCards();
 titleA[2]={...titleA[2],implementation:'dsl',templateEffects:{onPlay:[
  {template:'draw',count:1},{template:'enemyBpDown',bp:2500,optional:true}
 ]}};
 titleB[2]={...titleB[2],implementation:'dsl',templateEffects:{onPlay:[
  {template:'drawDiscardOne'}
 ]}};
 const packs=[
  createUniversalPack({id:'templates-title-a',cards:titleA}),
  createUniversalPack({id:'templates-title-b',cards:titleB})
 ];
 const counts=Object.fromEntries(titleA.slice(0,12).map(c=>[c.id,4]));
 counts.Z12=2;
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:803,first:0});
 return {packs,s};
}
function extract(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const collection=s.players[p][zone],i=collection.findIndex(c=>c.cardId===id);
  if(i>=0)return collection.splice(i,1)[0];
 }
 throw Error('Missing fixture card');
}

test('reused template effects really execute in opposite title packs, with legal pending choices and physical conservation',()=>{
 const {packs,s:original}=dualFixture();
 let s=original;
 const source=extract(s,0,'Z00'),effect=extract(s,0,'Z02');
 const defender=extract(s,1,'Z04');
 s.players[0].energy[0]=source;
 s.players[0].hand.push(effect);
 s.players[1].front[0]=defender;
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const beforeDeck=s.players[0].deck.length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===effect.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(universalActor(s),0);
 assert.equal(s.players[0].deck.length,beforeDeck-1);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:'bad'}, {actor:0}),/not currently legal/);
 const finished=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:defender.uid},{actor:0});
 assert.equal(finished.players[1].front[0],null,'target with BP<=0 must retire');
 assert.equal(finished.pending,null);
 assert.equal(assertUniversalMatch(packs,finished),true);
 const view=universalPublicView(packs,finished,1);
 assert.equal(view.players[0].hand,null,'opposite-title opponent still cannot inspect hidden hand');
 // For the other title, start the match with that player's natural first turn.
 const counts=Object.fromEntries(Array.from({length:12},(_,i)=>[
  'Z'+String(i).padStart(2,'0'),4
 ]));
 counts.Z12=2;
 const mirror=newUniversalMatch(packs,{decks:[counts,counts],seed:803,first:1});
 const power=extract(mirror,1,'Z00'),onPlay=extract(mirror,1,'Z02');
 mirror.players[1].energy[0]=power;mirror.players[1].hand.push(onPlay);
 let state=dispatchUniversalAction(packs,mirror,{type:'next'});
 state=dispatchUniversalAction(packs,state,{type:'next'});
 const option=legalUniversalActions(packs,state).find(a=>a.type==='play'&&a.uid===onPlay.uid&&a.line==='front');
 assert.ok(option);
 state=dispatchUniversalAction(packs,state,option,{actor:1});
 assert.equal(state.pending.kind,'effect-discard');
 assert.equal(state.pending.player,1);
 const chosen=legalUniversalActions(packs,state).find(a=>a.type==='chooseDiscard');
 const resolved=dispatchUniversalAction(packs,state,chosen,{actor:1});
 assert.ok(resolved.players[1].outside.some(c=>c.uid===chosen.uid));
 assert.equal(assertUniversalMatch(packs,resolved),true);
});

test('top/bottom and arbitrary outside abilities remain valid nested after a real discard cost',()=>{
 const actions=expandAbilityTemplates({onPlay:[{template:'payDiscardThen',optional:true,then:[
  {template:'peekTopOrBottom'},
  {template:'inspectTopAnyOutside',count:2,rest:'top'}
 ]}]});
 assert.deepEqual(actions.onPlay,[{op:'discardGate',optional:true,then:[
  {op:'peekTopOrBottom'},{op:'inspectTopAnyOutside',count:2,rest:'top'}
 ]}]);
 const p=checked(character({implementation:'dsl',templateEffects:{onPlay:[
  {template:'payDiscardThen',optional:true,then:[
   {template:'peekTopOrBottom'},{template:'inspectTopAnyOutside',count:2,rest:'top'}
  ]}
 ]}}));
 assert.deepEqual(p.cards.T00.effects.onPlay,actions.onPlay);
});
