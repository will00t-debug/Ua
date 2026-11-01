// UA23BT booster and UA23ST starter, 進撃の巨人.
// Sentences the shared validator already accepts stay on those ops.
// Anything else is the closed aot op, resolved by aot-runtime.mjs.
// Official Traditional Chinese card pages do not exist for these products.
// The engine matches effectJa. Registration is not an official FAQ certification.
import {AOT_CARDS} from '../aot-cards.mjs';
import {aotEngineKind} from './aot-kinds.mjs';
import {aotImplements} from './aot-runtime.mjs';
import {createUniversalPack} from './pack.mjs';

const job=(id,slot)=>({op:'aot',id,slot});
const main=id=>({op:'aotMain',id});
const CORPS='104期兵';
const PURE='無垢の巨人';
const HEIR='巨人継承者';
const WARRIOR='マーレの戦士';
const FOOD='食材';
const HISTORIA='ヒストリア・レイス';

const BY_ID={
 'AOT-1-002':{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'name',value:'リヴァイ'}}]},mainAbility:main('AOT-1-002')},
 'AOT-1-003':{effects:{onPlay:[job('AOT-1-003','onPlay')]}},
 'AOT-1-004':{aotHook:true,effects:{}},
 'AOT-1-006':{effects:{onPlay:[job('AOT-1-006','onPlay')]}},
 'AOT-1-008':{effects:{onAttack:[job('AOT-1-008','onAttack')]}},
 'AOT-1-009':{effects:{onAttack:[job('AOT-1-009','onAttack')]}},
 'AOT-1-010':{phaseEffects:[{phase:'attack',edge:'start',turn:'own',
  then:[job('AOT-1-010','attackStart')]}],
  effects:{onAttack:[job('AOT-1-010','onAttack')]}},
 'AOT-1-011':{raidName:'リヴァイ',effects:{onPlay:[
  {op:'buffSelf',bp:1000},{op:'grantSelfDoubleAttackThisTurn'},
  job('AOT-1-011','onPlay')]}},
 'AOT-1-014':{raidName:'ユミル',effects:{onAttack:[job('AOT-1-014','onAttack')]}},
 'AOT-1-020':{effects:{onPlay:[job('AOT-1-020','onPlay')]}},
 'AOT-1-021':{effects:{onPlay:[job('AOT-1-021','onPlay')]}},
 'AOT-1-022':{raidName:HISTORIA,effects:{onAttack:[job('AOT-1-022','onAttack')]},
  mainAbility:main('AOT-1-022')},
 'AOT-1-024':{aotHook:true,effects:{}},
 'AOT-1-025':{effects:{onPlay:[{op:'bounceOppFrontOneUnderBp',bp:4000,optional:true}]}},
 'AOT-1-027':{impactNull:true,effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:5,
  filter:{field:'colorAndType',value:'blue:event'}}]}},
 'AOT-1-028':{mainAbility:main('AOT-1-028'),effects:{}},
 'AOT-1-029':{effects:{onPlay:[{op:'drawDiscard',count:1},{op:'recoverAp',count:1}]}},
 'AOT-1-031':{effects:{onPlay:[job('AOT-1-031','onPlay')]}},
 'AOT-1-033':{effects:{onPlay:[job('AOT-1-033','onPlay')]}},
 'AOT-1-034':{effects:{onPlay:[job('AOT-1-034','onPlay')]}},
 'AOT-1-036':{mainAbility:main('AOT-1-036'),effects:{}},
 'AOT-1-038':{raidName:'ロッド・レイス',raidOwnTurnBp:2000,effects:{onRetire:[{op:'draw',count:1}]}},
 'AOT-1-046':{mainAbility:main('AOT-1-046'),effects:{}},
 'AOT-1-047':{passiveBonuses:[{condition:{kind:'ownTraitCount',turn:'own',min:3,
  zone:'field',excludeSelf:true,trait:PURE},bp:1500}],
  effects:{onPlay:[job('AOT-1-047','onPlay')]}},
 'AOT-1-048':{raidName:'ジーク・イェーガー',effects:{onPlay:[job('AOT-1-048','onPlay')]},
  mainAbility:main('AOT-1-048')},
 'AOT-1-049':{effects:{onRetire:[job('AOT-1-049','onRetire')]}},
 'AOT-1-051':{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'trait',value:WARRIOR},{field:'trait',value:PURE}]}]}},
 'AOT-1-053':{raidName:'アニ・レオンハート',effects:{onPlay:[job('AOT-1-053','onPlay')],
  onRetire:[job('AOT-1-053','onRetire')]}},
 'AOT-1-057':{raidName:'ベルトルト・フーバー',raidImpact:1,raidAttackDamage:3,
  effects:{onPlay:[job('AOT-1-057','onPlay')]}},
 'AOT-1-061':{raidName:'ライナー・ブラウン',raidImpact:1,raidImpactNull:true,effects:{}},
 'AOT-1-062':{mainAbility:main('AOT-1-062'),effects:{}},
 'AOT-1-063':{effects:{onPlay:[job('AOT-1-063','onPlay')]}},
 'AOT-1-064':{effects:{onPlay:[job('AOT-1-064','onPlay')]}},
 'AOT-1-066':{effects:{onPlay:[job('AOT-1-066','onPlay')]}},
 'AOT-1-067':{handUseOncePerName:true,effects:{onPlay:[job('AOT-1-067','onPlay')]}},
 'AOT-1-071':{mainAbility:main('AOT-1-071'),effects:{}},
 'AOT-1-072':{effects:{onPlay:[job('AOT-1-072','onPlay')]}},
 'AOT-1-076':{aotHook:true,effects:{}},
 'AOT-1-077':{effects:{onPlay:[job('AOT-1-077','onPlay')]},mainAbility:main('AOT-1-077')},
 'AOT-1-080':{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:7,
  filter:{field:'trait',value:FOOD}}]}},
 'AOT-1-082':{effects:{onPlay:[
  {op:'buffOwnField',filter:{field:'trait',value:CORPS},bp:1000,optional:true,excludeSelf:false},
  job('AOT-1-082','onPlay')]}},
 'AOT-1-088':{passiveBonuses:[{condition:{kind:'ownTraitCount',turn:'own',min:5,
  zone:'field',excludeSelf:true,trait:CORPS},bp:500}],effects:{}},
 'AOT-1-089':{raidName:'ミカサ・アッカーマン',effects:{onPlay:[job('AOT-1-089','onPlay')]}},
 'AOT-1-091':{step:true,mainAbility:main('AOT-1-091'),effects:{}},
 'AOT-1-092':{raidName:'エレン・イェーガー',raidImpact:1,effects:{onAttack:[job('AOT-1-092','onAttack')]}},
 'AOT-1-093':{raidName:'エレン・イェーガー',raidAttackDamage:2,raidOwnTurnBp:1000,
  effects:{onAttack:[job('AOT-1-093','onAttack')]}},
 'AOT-1-094':{raidName:'エレン・イェーガー',raidAttackDamage:2,
  mainAbility:main('AOT-1-094'),effects:{onAttack:[job('AOT-1-094','onAttack')]}},
 'AOT-1-095':{effects:{onPlay:[{op:'drawDiscard',count:1}]}},
 'AOT-1-096':{effects:{onPlay:[job('AOT-1-096','onPlay')]}},
 'AOT-1-098':{effects:{onPlay:[job('AOT-1-098','onPlay')]}},
 'AOT-1-099':{effects:{onPlay:[job('AOT-1-099','onPlay')]}},
 'AOT-1-100':{effects:{onPlay:[job('AOT-1-100','onPlay')]}},
 'AOT-1-104':{effects:{onPlay:[job('AOT-1-104','onPlay')]}},
 'AOT-1-105':{printedImpact:1,effects:{}},
 'AOT-1-107':{raidName:'エレン・イェーガー',effects:{onPlay:[{op:'draw',count:1}]},
  mainAbility:main('AOT-1-107')},
 'AOT-1-108':{mainAbility:main('AOT-1-108'),effects:{}},
 'AOT-1-109':{effects:{onPlay:[{op:'retireOppFrontUnderBp',mandatory:true,
  traitPerBp:{trait:CORPS,per:1000}}]}},
 'AOT-1-110':{raidName:'リヴァイ',effects:{onPlay:[{op:'enemyBpDown',bp:2000,optional:true,minBp:2500}],
  onAttack:[job('AOT-1-110','onAttack')]}},
 'AOT-1-111':{phaseEffects:[{phase:'attack',edge:'start',turn:'own',
  then:[job('AOT-1-111','attackStart')]}],
  effects:{onAttack:[job('AOT-1-111','onAttack')]}},
 'AOT-1-112':{effects:{onPlay:[job('AOT-1-112','onPlay')]}},
 'AOT-1-113':{energyLineForbidden:true,effects:{onPlay:[job('AOT-1-113','onPlay')]}}
};

function kindProgram(kind,card){
 if(kind==='plain')return {implementation:'vanilla',effects:{}};
 if(kind==='impactNull')return {impactNull:true,effects:{}};
 if(kind==='restEnergy')return {mainAbility:{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1},effects:{}};
 if(kind==='drawDiscard')return {effects:{onPlay:[{op:'drawDiscard',count:1}]}};
 if(kind==='activeEnergy')return {activeExtraEnergy:1,effects:{}};
 if(kind==='bounce')return {effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]}};
 if(kind==='recoverAp2')return {effects:{onPlay:[{op:'recoverAp',count:2}]}};
 if(kind==='bounce3500')return {effects:{onPlay:[{op:'bounceOppFrontOneUnderBp',bp:3500,optional:true}]}};
 if(kind==='buffOther')return {effects:{onPlay:[{op:'buffOwnField',
  filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]}};
 if(kind==='draw')return {effects:{onPlay:[{op:'draw',count:1}]}};
 if(kind==='draw2')return {effects:{onPlay:[{op:'drawDiscard',count:2,discardCount:1}]}};
 if(kind==='drawEnergy6')return {effects:{onPlay:[{op:'drawIfOwnEnergyAtLeast',energy:6,count:1}]}};
 if(kind==='drawTitan')return {effects:{onPlay:[{op:'drawIfOwnTraitCount',trait:HEIR,
  zone:'field',excludeSelf:false,min:1,count:1}]}};
 if(kind==='energy6bp')return {passiveBonuses:[{
  condition:{kind:'ownEnergyAtLeast',turn:'any',min:6},bp:1000}],effects:{}};
 if(kind==='enterDouble')return {enterAlwaysActive:true,readyOnAttackCount:1,effects:{}};
 if(kind==='foodUsed')return {passiveBonuses:[{
  condition:{kind:'ownTraitUsedThisTurn',turn:'own',trait:FOOD},bp:500,impact:1}],effects:{}};
 if(kind==='frontEnergy')return {frontGeneratesEnergy:true,effects:{}};
 if(kind==='historiaField')return {passiveBonuses:[{
  condition:{kind:'ownNameExists',turn:'opponent',zone:'field',excludeSelf:false,name:HISTORIA},
  bp:1000}],effects:{}};
 if(kind==='life3bp')return {passiveBonuses:[{
  condition:{kind:'ownLifeAtMost',turn:'any',max:3},bp:1000}],effects:{}};
 if(kind==='opponentColors'){
  const colors=card.color==='blue'?['green','red']:card.color==='green'?['blue','red']:['blue','green'];
  return {opponentFieldColorsHandEnergyDiscount:{colors,amount:1},effects:{}};
 }
 if(kind==='readyOnBlock')return {readyOnBlockCount:1,effects:{}};
 if(kind==='restBuff')return {mainAbility:{op:'restSelfBuffOther',bp:1000},effects:{}};
 if(kind==='step')return {step:true,effects:{}};
 if(kind==='trait5bp')return {passiveBonuses:[{
  condition:{kind:'ownTraitCount',turn:'own',min:5,zone:'field',excludeSelf:true,trait:CORPS},
  bp:1000}],effects:{}};
 return null;
}

function triggerProfile(card){
 if(card.trigger==='special')return {op:'retireOppFront'};
 if(card.trigger!=='color')return null;
 if(card.id==='AOT-1-009'||card.id==='AOT-1-021')return {op:'bounceOppFrontUnderBp',bp:3500};
 if(card.id==='AOT-1-056'||card.id==='AOT-1-063')
  return {op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1};
 if(card.id==='AOT-1-088'||card.id==='AOT-1-098')return {op:'retireOppFrontUnderBp',bp:2500};
 return null;
}

function walkJobs(extra,visit){
 for(const program of Object.values(extra.effects||{}))
  for(const step of program)if(step?.op==='aot')visit(step);
 for(const phase of extra.phaseEffects||[])
  for(const step of phase.then||[])if(step?.op==='aot')visit(step);
 if(extra.mainAbility?.op==='aotMain')visit({id:extra.mainAbility.id,slot:'main'});
}

export function aotPackCard(card){
 const kind=aotEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 const shared=kindProgram(kind,card);
 const extra=shared||BY_ID[card.id];
 if(!extra)throw Error(card.id+' has no Attack on Titan program');
 walkJobs(extra,step=>{
  if(!aotImplements(step.id,step.slot))
   throw Error(card.id+' '+step.slot+' is not implemented');
 });
 const marked=extra.implementation||(Object.keys(extra.effects||{}).length||
  extra.phaseEffects||extra.mainAbility||extra.passiveBonuses||extra.impactNull||
  extra.enterAlwaysActive||extra.activeExtraEnergy||extra.printedImpact||extra.raidName||
  extra.raidImpact||extra.raidImpactNull||extra.raidAttackDamage||extra.raidOwnTurnBp||
  extra.frontGeneratesEnergy||extra.readyOnAttackCount||extra.readyOnBlockCount||
  extra.step||extra.handUseOncePerName||extra.opponentFieldColorsHandEnergyDiscount||
  extra.energyLineForbidden||extra.aotHook?'dsl':'vanilla');
 const trig=triggerProfile(card);
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  ...(card.traitComponents?{traitComponents:card.traitComponents}:{}),
  implementation:marked,
  ...extra,
  ...(trig?{triggerEffect:trig}:{}),
  effects:extra.effects||{}
 };
}

export function createAotV2Pack(){
 const cards=AOT_CARDS.map(aotPackCard);
 if(cards.length!==113)throw Error('Attack on Titan registered count drifted');
 return createUniversalPack({id:'aot',version:'aot-ua23-set1-20261101',cards});
}
