// UA53BT チェンソーマン / 鏈鋸人. Every playable identity has a real program.
// Sentences the shared validator already accepts stay on those ops.
// Anything else is the closed csm op, resolved by csm-runtime.mjs.
// Registration is not an official FAQ certification.
import {CSM_CARDS} from '../csm-cards.mjs';
import {csmEngineKind} from './csm-kinds.mjs';
import {createUniversalPack} from './pack.mjs';

const DENJI='デンジ';
const MAKIMA='マキマ';
const REZE='レゼ';
const POWER='パワー';
// Official name line uses a space; Raid / effect angle brackets do not.
const AKI='早川アキ';
const AKI_NAME='早川 アキ';
const HIMENO='姫野';
const job=(id,slot)=>({op:'csm',id,slot});
const main=id=>({op:'csmMain',id});

const IMPLEMENTED=new Set();
export function csmImplements(id,slot){
 return IMPLEMENTED.has(id+'::'+slot)||IMPLEMENTED.has(id+'::*');
}
function mark(id,...slots){
 for(const slot of slots)IMPLEMENTED.add(id+'::'+slot);
}

// Closed programs. Continuous helpers use csmHook (engine/runtime).
const BY_ID={
 'CSM-1-002':{csmHook:true,effects:{}},
 'CSM-1-004':{emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[{op:'drawDiscard',count:1}]}},
 'CSM-1-006':{effects:{onRetire:[job('CSM-1-006','onRetire')]}},
 'CSM-1-007':{impactNull:true,mainAbility:main('CSM-1-007'),effects:{}},
 'CSM-1-008':{effects:{onPlay:[job('CSM-1-008','onPlay')]}},
 'CSM-1-010':{csmHook:true,effects:{}},
 'CSM-1-012':{csmHook:true,effects:{}},
 'CSM-1-013':{effects:{onAttack:[job('CSM-1-013','onAttack')]}},
 'CSM-1-014':{mainAbility:main('CSM-1-014'),effects:{}},
 'CSM-1-015':{csmHook:true,effects:{}},
 'CSM-1-016':{nameAliases:[REZE],csmHook:true,effects:{onPlay:[job('CSM-1-016','onPlay')]}},
 'CSM-1-017':{nameAliases:[REZE],raidName:REZE,effects:{onPlay:[job('CSM-1-017','onPlay')]},
  mainAbility:main('CSM-1-017')},
 'CSM-1-019':{mainAbility:{op:'restSelfBuffOther',bp:1000},effects:{}},
 'CSM-1-021':{effects:{onPlay:[{
  op:'inspectTopAnyOutside',count:3,rest:'top',maxOutside:1}]}},
 'CSM-1-022':{csmHook:true,mainAbility:main('CSM-1-022'),effects:{}},
 'CSM-1-023':{raidName:MAKIMA,mainAbility:main('CSM-1-023'),effects:{}},
 'CSM-1-024':{raidName:MAKIMA,csmHook:true,effects:{onPlay:[
  {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'event',noSpecialFinal:true}},
  job('CSM-1-024','onPlay')]}},
 'CSM-1-027':{csmHook:true,effects:{}},
 'CSM-1-028':{effects:{onPlay:[job('CSM-1-028','onPlay')]}},
 'CSM-1-029':{csmHook:true,effects:{}},
 'CSM-1-030':{effects:{onPlay:[job('CSM-1-030','onPlay')]}},
 'CSM-1-031':{raidName:REZE,effects:{onPlay:[{op:'draw',count:1},job('CSM-1-031','onPlay')]}},
 'CSM-1-032':{effects:{onPlay:[job('CSM-1-032','onPlay')]}},
 'CSM-1-033':{effects:{onPlay:[job('CSM-1-033','onPlay')]}},
 'CSM-1-035':{effects:{onPlay:[job('CSM-1-035','onPlay')]}},
 'CSM-1-037':{effects:{onPlay:[job('CSM-1-037','onPlay')]}},
 'CSM-1-038':{playRequiresOwnName:REZE,effects:{onPlay:[job('CSM-1-038','onPlay')]}},
 'CSM-1-039':{effects:{onPlay:[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:REZE,bonusBp:5000}]}},
 'CSM-1-040':{playRequiresOwnName:MAKIMA,effects:{onPlay:[job('CSM-1-040','onPlay')]}},
 'CSM-1-042':{enterAlwaysActive:true,mainAbility:main('CSM-1-042'),effects:{}},
 'CSM-1-046':{step:true,csmHook:true,effects:{}},
 // 衝擊無效在突襲框內：一般登場不要帶 impactNull 旗標（用 raidImpactNull）。
 'CSM-1-047':{nameAliases:[DENJI],raidName:DENJI,raidImpactNull:true,
  effects:{onRetire:[job('CSM-1-047','onRetire')]}},
 'CSM-1-048':{nameAliases:[DENJI],raidName:DENJI,csmHook:true,effects:{}},
 'CSM-1-051':{effects:{onPlay:[job('CSM-1-051','onPlay')]}},
 'CSM-1-053':{effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'name',value:AKI},{field:'name',value:AKI_NAME},
   {field:'name',value:HIMENO},{field:'name',value:MAKIMA}]}]}},
 'CSM-1-054':{effects:{onPlay:[job('CSM-1-054','onPlay')],
  onAttack:[job('CSM-1-054','onAttack')]}},
 'CSM-1-055':{mainAbility:main('CSM-1-055'),effects:{}},
 'CSM-1-056':{raidName:AKI,csmHook:true,effects:{onPlay:[job('CSM-1-056','onPlay')]}},
 'CSM-1-057':{effects:{onPlay:[{
  op:'inspectTopAnyOutside',count:2,rest:'top',maxOutside:1}]}},
 'CSM-1-059':{mainAbility:main('CSM-1-059'),effects:{}},
 'CSM-1-060':{effects:{onPlay:[{op:'drawIfOwnName',name:DENJI,count:1}]}},
 'CSM-1-061':{raidName:POWER,csmHook:true,effects:{onPlay:[job('CSM-1-061','onPlay')]}},
 'CSM-1-062':{mainAbility:main('CSM-1-062'),effects:{}},
 'CSM-1-064':{emptyOwnFieldHandEnergyDiscount:2,impactNull:true,effects:{}},
 'CSM-1-065':{mainAbility:main('CSM-1-065'),effects:{}},
 'CSM-1-066':{raidName:HIMENO,csmHook:true,effects:{
  onPlay:[{op:'draw',count:1}],onRetire:[job('CSM-1-066','onRetire')]}},
 'CSM-1-067':{frontForbidden:true,effects:{onPlay:[{op:'peekTopOne'}]},
  mainAbility:main('CSM-1-067')},
 'CSM-1-068':{effects:{onRetire:[job('CSM-1-068','onRetire')]}},
 'CSM-1-070':{mainAbility:main('CSM-1-070'),effects:{onAttack:[job('CSM-1-070','onAttack')]}},
 'CSM-1-071':{mainAbility:main('CSM-1-071'),effects:{}},
 'CSM-1-072':{csmHook:true,effects:{onAttack:[job('CSM-1-072','onAttack')]}},
 'CSM-1-073':{effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:4,logic:'any',discard:false,filters:[
   {field:'name',value:AKI},{field:'name',value:AKI_NAME},
   {field:'name',value:DENJI},{field:'name',value:POWER}]}]}},
 'CSM-1-075':{effects:{onPlay:[job('CSM-1-075','onPlay')]}},
 'CSM-1-076':{effects:{onPlay:[job('CSM-1-076','onPlay')]}},
 'CSM-1-077':{playRequiresOwnName:AKI,effects:{onPlay:[job('CSM-1-077','onPlay')]}},
 'CSM-1-078':{effects:{onPlay:[job('CSM-1-078','onPlay')]}},
 'CSM-1-080':{effects:{onPlay:[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:DENJI,bonusBp:5000}]}}
};

for(const [id,extra] of Object.entries(BY_ID)){
 for(const program of Object.values(extra.effects||{}))
  for(const step of program||[])
   if(step?.op==='csm')mark(id,step.slot);
 if(extra.mainAbility?.op==='csmMain')mark(id,'main');
 if(extra.csmHook)mark(id,'*');
}

function kindProgram(kind){
 if(kind==='plain')return {implementation:'vanilla',effects:{}};
 if(kind==='impactNull')return {impactNull:true,effects:{}};
 if(kind==='restEnergy')return {mainAbility:{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1},effects:{}};
 if(kind==='drawDiscard')return {effects:{onPlay:[{op:'drawDiscard',count:1}]}};
 if(kind==='draw')return {effects:{onPlay:[{op:'draw',count:1}]}};
 if(kind==='buffOther')return {effects:{onPlay:[{
  op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]}};
 if(kind==='bounce')return {effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]}};
 if(kind==='recoverAp2')return {effects:{onPlay:[{op:'recoverAp',count:2}]}};
 if(kind==='step')return {step:true,effects:{}};
 if(kind==='activeEnergy')return {activeExtraEnergy:1,effects:{}};
 if(kind==='retireDraw')return {effects:{onRetire:[{op:'draw',count:1}]}};
 if(kind==='retire3000')return {effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000}]}};
 return null;
}

function triggerProfile(card){
 if(card.trigger==='special')return {op:'retireOppFront'};
 if(card.trigger==='color'&&card.color==='purple')
  return {op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true};
 if(card.trigger==='color'&&card.color==='red')
  return {op:'retireOppFrontUnderBp',bp:2500};
 return null;
}

function walkJobs(extra,visit){
 for(const program of Object.values(extra.effects||{}))
  for(const step of program||[])if(step?.op==='csm')visit(step);
 if(extra.mainAbility?.op==='csmMain')visit({id:extra.mainAbility.id,slot:'main'});
}

export function csmPackCard(card){
 const kind=csmEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 const shared=kindProgram(kind);
 let extra=shared||BY_ID[card.id];
 if(!extra)throw Error(card.id+' has no Chainsaw Man program');
 // Shared kinds still need the no-space Aki alias when the print is 早川 アキ.
 if(card.nameJa===AKI_NAME&&!(extra.nameAliases||[]).includes(AKI)){
  extra={...extra,nameAliases:[...(extra.nameAliases||[]),AKI]};
  if(extra.implementation==='vanilla')delete extra.implementation;
 }
 walkJobs(extra,step=>{
  if(!csmImplements(step.id,step.slot))
   throw Error(card.id+' '+step.slot+' is not implemented');
 });
 const marked=extra.implementation||(Object.keys(extra.effects||{}).length||
  extra.mainAbility||extra.passiveBonuses||extra.impactNull||extra.step||
  extra.enterAlwaysActive||extra.activeExtraEnergy||extra.nameAliases||
  extra.emptyOwnFieldHandEnergyDiscount||extra.raidName||extra.raidImpactNull||
  extra.frontForbidden||extra.playRequiresOwnName||extra.csmHook?'dsl':'vanilla');
 const trig=triggerProfile(card);
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits||[],
  implementation:marked,
  ...extra,
  ...(trig?{triggerEffect:trig}:{}),
  effects:extra.effects||{}
 };
}

export function createCsmV2Pack(){
 const cards=CSM_CARDS.map(csmPackCard);
 if(cards.length!==80)throw Error('Chainsaw Man registered count drifted');
 return createUniversalPack({id:'csm',version:'csm-ua53-full-20261104',cards});
}
