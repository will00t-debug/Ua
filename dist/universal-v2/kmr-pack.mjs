// UA29BT booster and UA29ST starter, 假面騎士.
// Sentences the shared validator already accepts stay on those ops.
// Anything else is the closed kmr op, resolved by kmr-runtime.mjs.
// Official Traditional Chinese card pages do not exist for these products.
// The engine matches effectJa. Registration is not an official FAQ certification.
import {KMR_CARDS} from '../kmr-cards.mjs';
import {kmrEngineKind} from './kmr-kinds.mjs';
import {kmrImplements} from './kmr-runtime.mjs';
import {createUniversalPack} from './pack.mjs';

const job=(id,slot)=>({op:'kmr',id,slot});
const main=id=>({op:'kmrMain',id});
const INTEL='飛電インテリジェンス';
const GEAR='ファイズギア';
const ZIO='ジオウ';
const VULCAN='バルカン';
const ZERO='ゼロワン';
const OOO='オーズ';
const GENM='ゲンム';
const EX='エグゼイド';
const FAIZ='ファイズ';
const DEN='電王';

const BY_ID={
 'KMR-1-001':{printedImpact:1,kmrHook:true,effects:{onPlay:[job('KMR-1-001','onPlay')]}},
 'KMR-1-003':{mainAbility:main('KMR-1-003'),effects:{}},
 'KMR-1-004':{enterAlwaysActive:true,phaseEffects:[{phase:'attack',edge:'end',turn:'own',
  then:[job('KMR-1-004','phase')]}],effects:{onPlay:[job('KMR-1-004','onPlay')]}},
 'KMR-1-005':{raidName:'ジオウ',raidNameIncludes:true,effects:{onPlay:[job('KMR-1-005','onPlay')]},
  mainAbility:main('KMR-1-005')},
 'KMR-1-008':{impactNull:true,opponentBounceImmune:true,phaseEffects:[{phase:'attack',edge:'end',turn:'own',
  then:[job('KMR-1-008','phase')]}],effects:{}},
 'KMR-1-009':{bpDownImmune:true,ownTurnBp:1000,phaseEffects:[{phase:'attack',edge:'end',turn:'own',
  then:[job('KMR-1-009','phase')]}],effects:{}},
 'KMR-1-011':{effects:{onPlay:[job('KMR-1-011','onPlay')]}},
 'KMR-1-012':{effects:{onPlay:[job('KMR-1-012','onPlay')]}},
 'KMR-1-013':{raidName:ZIO,raidNameIncludes:true,effects:{onPlay:[job('KMR-1-013','onPlay')]}},
 'KMR-1-014':{effects:{onPlay:[job('KMR-1-014','onPlay')]}},
 'KMR-1-019':{raidName:VULCAN,raidNameIncludes:true,mainAbility:main('KMR-1-019'),effects:{}},
 'KMR-1-021':{effects:{onPlay:[job('KMR-1-021','onPlay')]}},
 'KMR-1-022':{raidName:ZERO,raidNameIncludes:true,raidImpactNull:true,
  effects:{onPlay:[job('KMR-1-022','onPlay')]}},
 'KMR-1-024':{effects:{onPlay:[job('KMR-1-024','onPlay')]}},
 'KMR-1-025':{effects:{onRetire:[job('KMR-1-025','onRetire')]}},
 'KMR-1-027':{mainAbility:main('KMR-1-027'),effects:{}},
 'KMR-1-028':{effects:{onPlay:[job('KMR-1-028','onPlay')]},mainAbility:main('KMR-1-028')},
 'KMR-1-029':{mainAbility:main('KMR-1-029'),effects:{}},
 'KMR-1-030':{effects:{onPlay:[job('KMR-1-030','onPlay')]}},
 'KMR-1-031':{effects:{onPlay:[job('KMR-1-031','onPlay')]}},
 'KMR-1-033':{effects:{onPlay:[job('KMR-1-033','onPlay')]}},
 'KMR-1-034':{mainAbility:main('KMR-1-034'),effects:{}},
 'KMR-1-035':{mainAbility:main('KMR-1-035'),effects:{}},
 'KMR-1-036':{mainAbility:main('KMR-1-036'),effects:{}},
 'KMR-1-037':{effects:{onPlay:[job('KMR-1-037','onPlay')]}},
 'KMR-1-039':{raidName:OOO,raidNameIncludes:true,kmrHook:true,
  effects:{onPlay:[job('KMR-1-039','onPlay')]},mainAbility:main('KMR-1-039')},
 'KMR-1-040':{effects:{onPlay:[job('KMR-1-040','onPlay')]}},
 'KMR-1-041':{raidName:OOO,raidNameIncludes:true,effects:{onPlay:[job('KMR-1-041','onPlay')]}},
 'KMR-1-042':{ownTurnBp:1500,mainAbility:main('KMR-1-042'),effects:{}},
 'KMR-1-044':{raidName:GENM,raidNameIncludes:true,effects:{
  onPlay:[job('KMR-1-044','onPlay')],onRetire:[job('KMR-1-044','onRetire')]},
  mainAbility:main('KMR-1-044')},
 'KMR-1-045':{mainAbility:main('KMR-1-045'),effects:{}},
 'KMR-1-047':{mainAbility:main('KMR-1-047'),effects:{}},
 'KMR-1-048':{kmrHook:true,effects:{onPlay:[job('KMR-1-048','onPlay')]}},
 'KMR-1-050':{effects:{onPlay:[job('KMR-1-050','onPlay')]}},
 'KMR-1-051':{effects:{onPlay:[job('KMR-1-051','onPlay')]}},
 'KMR-1-052':{raidName:EX,raidNameIncludes:true,raidBp:1000,kmrHook:true,
  effects:{onPlay:[job('KMR-1-052','onPlay')]}},
 'KMR-1-053':{effects:{onPlay:[job('KMR-1-053','onPlay')]},mainAbility:main('KMR-1-053')},
 'KMR-1-058':{effects:{onPlay:[job('KMR-1-058','onPlay')]}},
 'KMR-1-059':{effects:{onPlay:[job('KMR-1-059','onPlay')]}},
 'KMR-1-060':{effects:{onPlay:[job('KMR-1-060','onPlay')]},mainAbility:main('KMR-1-060')},
 'KMR-1-062':{mainAbility:main('KMR-1-062'),effects:{}},
 'KMR-1-063':{effects:{onPlay:[job('KMR-1-063','onPlay')]}},
 'KMR-1-064':{effects:{onPlay:[job('KMR-1-064','onPlay')]}},
 'KMR-1-065':{effects:{onPlay:[job('KMR-1-065','onPlay')]}},
 'KMR-1-067':{effects:{onPlay:[job('KMR-1-067','onPlay')]}},
 'KMR-1-068':{mainAbility:main('KMR-1-068'),effects:{}},
 'KMR-1-070':{kmrHook:true,effects:{onAttack:[job('KMR-1-070','onAttack')]}},
 'KMR-1-071':{effects:{onPlay:[job('KMR-1-071','onPlay')]},mainAbility:main('KMR-1-071')},
 'KMR-1-074':{nameAliases:['キンタロス'],raidName:'キンタロス',
  effects:{onPlay:[job('KMR-1-074','onPlay')],onRetire:[job('KMR-1-074','onRetire')]}},
 'KMR-1-075':{nameAliases:['リュウタロス'],raidName:'リュウタロス',
  effects:{onPlay:[job('KMR-1-075','onPlay')],onRetire:[job('KMR-1-075','onRetire')]}},
 'KMR-1-076':{kmrHook:true,effects:{onPlay:[job('KMR-1-076','onPlay')],onAttack:[job('KMR-1-076','onAttack')]}},
 'KMR-1-077':{nameAliases:['モモタロス'],raidName:'モモタロス',
  effects:{onPlay:[job('KMR-1-077','onPlay')],onRetire:[job('KMR-1-077','onRetire')]}},
 'KMR-1-078':{raidHostNameIncludes:DEN,effects:{onPlay:[{op:'drawDiscard',count:1}]}},
 'KMR-1-079':{raidName:'仮面ライダー電王 プラットフォーム',
  effects:{onPlay:[job('KMR-1-079','onPlay')],onAttack:[job('KMR-1-079','onAttack')],
   onRetire:[job('KMR-1-079','onRetire')]}},
 'KMR-1-080':{nameAliases:['ウラタロス'],raidName:'ウラタロス',
  effects:{onPlay:[job('KMR-1-080','onPlay')],onRetire:[job('KMR-1-080','onRetire')]}},
 'KMR-1-081':{kmrHook:true,mainAbility:main('KMR-1-081'),
  effects:{onAttack:[job('KMR-1-081','onAttack')]}},
 'KMR-1-084':{kmrHook:true,effects:{onPlay:[job('KMR-1-084','onPlay')]}},
 'KMR-1-085':{raidOnlyEntry:true,raidName:FAIZ,raidNameIncludes:true,
  phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[job('KMR-1-085','phase')]}],
  effects:{onAttack:[job('KMR-1-085','onAttack')]}},
 'KMR-1-086':{raidName:FAIZ,raidNameIncludes:true,raidAttackDamage:2,effects:{}},
 'KMR-1-088':{effects:{onPlay:[job('KMR-1-088','onPlay')]}},
 'KMR-1-092':{effects:{onPlay:[job('KMR-1-092','onPlay')]}},
 'KMR-1-094':{enterAlwaysActive:true,mainAbility:main('KMR-1-094'),effects:{}},
 'KMR-1-095':{effects:{onPlay:[job('KMR-1-095','onPlay')]}},
 'KMR-1-096':{effects:{onPlay:[job('KMR-1-096','onPlay')]}},
 'KMR-1-098':{effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000}]}},
 'KMR-1-099':{kmrHook:true,effects:{onPlay:[job('KMR-1-099','onPlay')]}},
 'KMR-1-100':{effects:{onPlay:[job('KMR-1-100','onPlay')]}},
 'KMR-1-104':{effects:{onAttack:[job('KMR-1-104','onAttack')],onRetire:[job('KMR-1-104','onRetire')]}},
 'KMR-1-105':{step:true,kmrHook:true,effects:{}},
 'KMR-1-107':{raidName:ZERO,raidNameIncludes:true,kmrHook:true,
  effects:{onPlay:[job('KMR-1-107','onPlay')]}},
 'KMR-1-108':{effects:{onPlay:[job('KMR-1-108','onPlay')]},mainAbility:main('KMR-1-108')},
 'KMR-1-109':{effects:{onPlay:[job('KMR-1-109','onPlay')]}},
 'KMR-1-110':{kmrHook:true,effects:{onPlay:[job('KMR-1-110','onPlay')]}},
 'KMR-1-111':{mainAbility:main('KMR-1-111'),effects:{onRetire:[job('KMR-1-111','onRetire')]}},
 'KMR-1-112':{printedAttackDamage:2,effects:{onPlay:[job('KMR-1-112','onPlay')],
  onAttack:[job('KMR-1-112','onAttack')]}},
 'KMR-1-113':{effects:{onPlay:[job('KMR-1-113','onPlay')],onRetire:[job('KMR-1-113','onRetire')]}}
};

function kindProgram(kind,card){
 if(kind==='plain')return {implementation:'vanilla',effects:{}};
 if(kind==='impactNull')return {impactNull:true,effects:{}};
 if(kind==='drawDiscard')return {effects:{onPlay:[{op:'drawDiscard',count:1}]}};
 if(kind==='bounce1')return {effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]}};
 if(kind==='recover2')return {effects:{onPlay:[{op:'recoverAp',count:2}]}};
 if(kind==='KMR-1-010'||kind==='KMR-1-049'||kind==='KMR-1-093')
  return {mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1},effects:{}};
 if(kind==='KMR-1-016'||kind==='KMR-1-056'||kind==='KMR-1-073')
  return {activeExtraEnergy:1,effects:{}};
 if(kind==='KMR-1-017')return {step:true,effects:{}};
 if(kind==='KMR-1-015')return {opponentFieldColorsHandEnergyDiscount:{colors:['blue','red'],amount:1},effects:{}};
 if(kind==='KMR-1-061')return {opponentFieldColorsHandEnergyDiscount:{colors:['yellow','red'],amount:1},effects:{}};
 if(kind==='KMR-1-087')return {opponentFieldColorsHandEnergyDiscount:{colors:['yellow','blue'],amount:1},effects:{}};
 if(kind==='KMR-1-038')return {ownTurnBp:1000,effects:{}};
 if(kind==='KMR-1-043')return {emptyOwnFieldHandEnergyDiscount:2,effects:{}};
 if(kind==='KMR-1-083')return {effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:5,
  filter:{field:'trait',value:GEAR}}]}};
 if(kind==='KMR-1-106')return {effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'trait',value:INTEL}}]}};
 if(kind==='KMR-1-089')return {blockBpRestriction:{relation:'atMost',bp:2000,condition:null},effects:{}};
 if(kind==='KMR-1-002'||kind==='KMR-1-020')return {kmrHook:true,effects:{}};
 return null;
}

const SPECIAL=new Set(['KMR-1-031','KMR-1-033','KMR-1-064','KMR-1-067','KMR-1-096','KMR-1-099']);

function triggerProfile(card){
 if(SPECIAL.has(card.id))return {op:'kmr',id:card.id,slot:'trigger'};
 if(card.trigger==='special')return {op:'retireOppFront'};
 if(card.trigger!=='color')return null;
 if(card.id==='KMR-1-001'||card.id==='KMR-1-012'||card.id==='KMR-1-104')
  return {op:'restOppFrontSkipNextActive'};
 if(card.id==='KMR-1-037'||card.id==='KMR-1-050')return {op:'bounceOppFrontUnderBp',bp:3500};
 if(card.id==='KMR-1-084'||card.id==='KMR-1-092')return {op:'retireOppFrontUnderBp',bp:2500};
 return null;
}

function walkJobs(extra,visit){
 for(const program of Object.values(extra.effects||{}))
  for(const step of program)if(step?.op==='kmr')visit(step);
 for(const phase of extra.phaseEffects||[])
  for(const step of phase.then||[])if(step?.op==='kmr')visit(step);
 if(extra.mainAbility?.op==='kmrMain')visit({id:extra.mainAbility.id,slot:'main'});
}

export function kmrPackCard(card){
 const kind=kmrEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 const shared=kindProgram(kind,card);
 const extra=shared||BY_ID[card.id];
 if(!extra)throw Error(card.id+' has no Kamen Rider program');
 walkJobs(extra,step=>{
  if(!kmrImplements(step.id,step.slot))
   throw Error(card.id+' '+step.slot+' is not implemented');
 });
 const marked=extra.implementation||(Object.keys(extra.effects||{}).length||
  extra.phaseEffects||extra.mainAbility||extra.impactNull||extra.enterAlwaysActive||
  extra.activeExtraEnergy||extra.printedImpact||extra.raidName||extra.raidImpactNull||
  extra.raidAttackDamage||extra.raidBp||extra.ownTurnBp||extra.step||
  extra.opponentFieldColorsHandEnergyDiscount||extra.emptyOwnFieldHandEnergyDiscount||
  extra.blockBpRestriction||extra.bpDownImmune||extra.opponentBounceImmune||
  extra.nameAliases||extra.kmrHook||extra.raidOnlyEntry||extra.raidHostNameIncludes||
  extra.printedAttackDamage?'dsl':'vanilla');
 const trig=triggerProfile(card);
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,implementation:marked,...extra,
  ...(trig?{triggerEffect:trig}:{}),
  effects:extra.effects||{}
 };
}

export function createKmrV2Pack(){
 const cards=KMR_CARDS.map(kmrPackCard);
 if(cards.length!==113)throw Error('Kamen Rider registered count drifted');
 return createUniversalPack({id:'kmr',version:'kmr-ua29-20261101',cards});
}

export const KMR_STARTER_IDS=Object.freeze([
 'KMR-1-016','KMR-1-017','KMR-1-018','KMR-1-023','KMR-1-025','KMR-1-026',
 'KMR-1-027','KMR-1-032','KMR-1-033','KMR-1-101','KMR-1-102','KMR-1-103',
 'KMR-1-104','KMR-1-105','KMR-1-106','KMR-1-107','KMR-1-108','KMR-1-109'
]);
