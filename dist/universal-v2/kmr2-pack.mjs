// EX12BT booster, 假面騎士第二彈. No starter product.
// Sentences the shared validator already accepts stay on those ops.
// Anything else is the closed kmr2 op, resolved by kmr2-runtime.mjs.
// Display text is the official Traditional Chinese printing.
// The engine matches effectJa. Registration is not an official FAQ certification.
import {KMR2_CARDS} from '../kmr-vol2-cards.mjs';
import {kmr2EngineKind} from './kmr2-kinds.mjs';
import {kmr2Implements} from './kmr2-runtime.mjs';
import {createUniversalPack} from './pack.mjs';

const job=(id,slot)=>({op:'kmr2',id,slot});
const main=id=>({op:'kmr2Main',id});
const W='Ｗ';
const FOUR='フォーゼ';
const GAV='ガヴ';
const ZIO='ジオウ';
const DECADE='仮面ライダーディケイド';

const BY_ID={
 'KMR-2-001':{effects:{onPlay:[job('KMR-2-001','onPlay')]}},
 'KMR-2-002':{mainAbility:main('KMR-2-002'),effects:{}},
 'KMR-2-003':{impactNull:true,mainAbility:main('KMR-2-003'),effects:{}},
 'KMR-2-004':{effects:{onPlay:[job('KMR-2-004','onPlay')]}},
 'KMR-2-005':{raidName:GAV,raidNameIncludes:true,kmr2Hook:true,
  effects:{onPlay:[job('KMR-2-005','onPlay')],onAttack:[job('KMR-2-005','onAttack')]}},
 'KMR-2-006':{mainAbility:main('KMR-2-006'),effects:{}},
 'KMR-2-007':{mainAbility:main('KMR-2-007'),effects:{}},
 'KMR-2-008':{kmr2Hook:true,effects:{}},
 'KMR-2-009':{impactNull:true,kmr2Hook:true,effects:{}},
 'KMR-2-011':{effects:{onPlay:[job('KMR-2-011','onPlay')]}},
 'KMR-2-012':{raidName:GAV,raidNameIncludes:true,kmr2Hook:true,
  effects:{onPlay:[job('KMR-2-012','onPlay')],onAttack:[job('KMR-2-012','onAttack')]}},
 'KMR-2-013':{maxCopies:10,effects:{onPlay:[job('KMR-2-013','onPlay')],
  onRetire:[job('KMR-2-013','onRetire')]}},
 'KMR-2-014':{enterAlwaysActive:true,mainAbility:main('KMR-2-014'),effects:{}},
 'KMR-2-015':{effects:{onPlay:[job('KMR-2-015','onPlay')]}},
 'KMR-2-017':{mainAbility:main('KMR-2-017'),effects:{}},
 'KMR-2-018':{effects:{onPlay:[job('KMR-2-018','onPlay')]}},
 'KMR-2-019':{raidName:ZIO,raidNameIncludes:true,raidImpact:1,kmr2Hook:true,
  mainAbility:main('KMR-2-019'),effects:{onPlay:[job('KMR-2-019','onPlay')]}},
 'KMR-2-020':{emptyOwnFieldHandEnergyDiscount:2,impactNull:true,effects:{}},
 'KMR-2-021':{ownTurnBp:1000,effects:{onPlay:[job('KMR-2-021','onPlay')]}},
 'KMR-2-022':{mainAbility:main('KMR-2-022'),effects:{}},
 'KMR-2-023':{kmr2Hook:true,effects:{onPlay:[job('KMR-2-023','onPlay')]}},
 'KMR-2-024':{nameAliases:['アンク'],enterAlwaysActive:true,impactNull:true,
  effects:{onPlay:[job('KMR-2-024','onPlay')],onRetire:[job('KMR-2-024','onRetire')]}},
 'KMR-2-025':{mainAbility:main('KMR-2-025'),effects:{onPlay:[job('KMR-2-025','onPlay')]}},
 'KMR-2-026':{nameAliases:['アンク','コアメダル'],kmr2Hook:true,
  effects:{onPlay:[job('KMR-2-026','onPlay')]}},
 'KMR-2-028':{kmr2Hook:true,effects:{}},
 'KMR-2-030':{raidName:FOUR,raidNameIncludes:true,kmr2Hook:true,
  effects:{onAttack:[job('KMR-2-030','onAttack')]}},
 'KMR-2-031':{kmr2Hook:true,effects:{}},
 'KMR-2-032':{kmr2Hook:true,effects:{}},
 'KMR-2-033':{kmr2Hook:true,effects:{}},
 'KMR-2-034':{raidName:FOUR,raidNameIncludes:true,
  effects:{onPlay:[job('KMR-2-034','onPlay')]}},
 'KMR-2-035':{kmr2Hook:true,effects:{}},
 'KMR-2-038':{impactNull:true,kmr2Hook:true,effects:{}},
 'KMR-2-039':{raidName:'仮面ライダーメテオ',kmr2Hook:true,effects:{}},
 'KMR-2-040':{phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[job('KMR-2-040','phase')]}],
  mainAbility:main('KMR-2-040'),effects:{}},
 'KMR-2-041':{effects:{onPlay:[job('KMR-2-041','onPlay')]}},
 'KMR-2-042':{effects:{onPlay:[job('KMR-2-042','onPlay')]}},
 'KMR-2-044':{effects:{onPlay:[job('KMR-2-044','onPlay')]}},
 'KMR-2-046':{ownTurnBp:1000,effects:{onPlay:[job('KMR-2-046','onPlay')]}},
 'KMR-2-047':{mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1},effects:{}},
 'KMR-2-048':{effects:{onPlay:[job('KMR-2-048','onPlay')]}},
 'KMR-2-049':{raidName:W,raidNameIncludes:true,raidNameAlsoIncludes:'ジョーカー',raidImpact:1,
  effects:{onPlay:[job('KMR-2-049','onPlay')]}},
 'KMR-2-051':{opponentTurnBp:-1500,effects:{}},
 'KMR-2-052':{effects:{onPlay:[job('KMR-2-052','onPlay')]}},
 'KMR-2-054':{kmr2Hook:true,effects:{}},
 'KMR-2-055':{raidOnlyEntry:true,raidName:W,raidNameIncludes:true,raidNameAlsoIncludes:'ジョーカー',
  effects:{onPlay:[job('KMR-2-055','onPlay')],onAttack:[job('KMR-2-055','onAttack')]}},
 'KMR-2-056':{effects:{onPlay:[job('KMR-2-056','onPlay')]}},
 'KMR-2-057':{effects:{onPlay:[job('KMR-2-057','onPlay')]}},
 'KMR-2-058':{effects:{onPlay:[job('KMR-2-058','onPlay')]}},
 'KMR-2-059':{enterAlwaysActive:true,mainAbility:main('KMR-2-059'),effects:{}},
 'KMR-2-060':{effects:{onPlay:[job('KMR-2-060','onPlay')]}},
 'KMR-2-061':{effects:{onPlay:[job('KMR-2-061','onPlay')]}},
 'KMR-2-063':{effects:{onPlay:[job('KMR-2-063','onPlay')]}},
 'KMR-2-065':{effects:{onPlay:[job('KMR-2-065','onPlay')]}},
 'KMR-2-067':{mainAbility:main('KMR-2-067'),effects:{}},
 'KMR-2-068':{raidName:DECADE,effects:{onPlay:[job('KMR-2-068','onPlay')]}},
 'KMR-2-069':{raidName:DECADE,effects:{onPlay:[job('KMR-2-069','onPlay')],
  onAttack:[job('KMR-2-069','onAttack')]}},
 'KMR-2-070':{kmr2Hook:true,effects:{}},
 'KMR-2-071':{kmr2Hook:true,effects:{}},
 'KMR-2-072':{kmr2Hook:true,effects:{}},
 'KMR-2-073':{kmr2Hook:true,effects:{}},
 'KMR-2-074':{emptyOwnFieldHandEnergyDiscount:2,kmr2Hook:true,effects:{}},
 'KMR-2-075':{kmr2Hook:true,effects:{}},
 'KMR-2-076':{effects:{onPlay:[job('KMR-2-076','onPlay')]}},
 'KMR-2-077':{effects:{onPlay:[job('KMR-2-077','onPlay')]}},
 'KMR-2-079':{nameAliases:['ジーク'],raidName:'ジーク',kmr2Hook:true,
  effects:{onRetire:[job('KMR-2-079','onRetire')]}},
 'KMR-2-080':{phaseEffects:[{phase:'main',edge:'start',turn:'own',then:[job('KMR-2-080','phase')]}],
  effects:{onPlay:[job('KMR-2-080','onPlay')]}},
 'KMR-2-082':{kmr2Hook:true,effects:{onPlay:[job('KMR-2-082','onPlay')]}},
 'KMR-2-083':{kmr2Hook:true,effects:{}},
 'KMR-2-084':{effects:{onPlay:[job('KMR-2-084','onPlay')]}},
 'KMR-2-085':{mainAbility:main('KMR-2-085'),effects:{}},
 'KMR-2-086':{effects:{onPlay:[job('KMR-2-086','onPlay')]}},
 'KMR-2-087':{effects:{onPlay:[job('KMR-2-087','onPlay')]}},
 'KMR-2-088':{emptyOwnFieldHandEnergyDiscount:2,effects:{onAttack:[job('KMR-2-088','onAttack')]}},
 'KMR-2-089':{raidName:'仮面ライダーナイト',mainAbility:main('KMR-2-089'),
  effects:{onPlay:[job('KMR-2-089','onPlay')]}},
 'KMR-2-091':{kmr2Hook:true,effects:{}},
 'KMR-2-093':{effects:{onPlay:[job('KMR-2-093','onPlay')]}},
 'KMR-2-094':{raidName:'仮面ライダー龍騎',effects:{onPlay:[job('KMR-2-094','onPlay')],
  onRetire:[job('KMR-2-094','onRetire')]}},
 'KMR-2-095':{kmr2Hook:true,effects:{onPlay:[job('KMR-2-095','onPlay')]}},
 'KMR-2-096':{kmr2Hook:true,effects:{onPlay:[job('KMR-2-096','onPlay')]}},
 'KMR-2-097':{enterAlwaysActive:true,mainAbility:main('KMR-2-097'),effects:{}},
 'KMR-2-099':{effects:{onPlay:[job('KMR-2-099','onPlay')]}},
 'KMR-2-100':{effects:{onPlay:[job('KMR-2-100','onPlay')]}}
};

const EXTRA={
 'KMR-2-005':['attackEnd'],'KMR-2-008':['allyAttackEnd'],'KMR-2-012':['attackEnd'],
 'KMR-2-019':['win'],'KMR-2-021':['attackEnd'],'KMR-2-028':['entered'],
 'KMR-2-030':['removed'],'KMR-2-032':['removed'],'KMR-2-033':['blocked'],
 'KMR-2-035':['removed','lost'],'KMR-2-039':['blocked','unblocked'],
 'KMR-2-048':['blocked'],'KMR-2-054':['blocked'],'KMR-2-067':['removed'],
 'KMR-2-068':['removed'],'KMR-2-079':['blocked'],'KMR-2-083':['attackEnd']
};

function kindProgram(kind){
 if(kind==='plain')return {implementation:'vanilla',effects:{}};
 if(kind==='drawDiscard')return {effects:{onPlay:[{op:'drawDiscard',count:1}]}};
 if(kind==='bounce1')return {effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]}};
 if(kind==='recover2')return {effects:{onPlay:[{op:'recoverAp',count:2}]}};
 if(kind==='ownTurn')return {ownTurnBp:1000,effects:{}};
 if(kind==='activeEnergy')return {activeExtraEnergy:1,effects:{}};
 return null;
}

function triggerProfile(card){
 if(card.trigger==='special')return {op:'retireOppFront'};
 if(card.trigger!=='color')return null;
 if(card.id==='KMR-2-011')return {op:'restOppFrontSkipNextActive'};
 if(card.id==='KMR-2-035')return {op:'bounceOppFrontUnderBp',bp:3500};
 if(card.id==='KMR-2-048'||card.id==='KMR-2-067')
  return {op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1};
 if(card.id==='KMR-2-099')return {op:'retireOppFrontUnderBp',bp:2500};
 return null;
}

function walkJobs(extra,visit){
 for(const program of Object.values(extra.effects||{}))
  for(const step of program)if(step?.op==='kmr2')visit(step);
 for(const phase of extra.phaseEffects||[])
  for(const step of phase.then||[])if(step?.op==='kmr2')visit(step);
 if(extra.mainAbility?.op==='kmr2Main')visit({id:extra.mainAbility.id,slot:'main'});
}

export function kmr2PackCard(card){
 const kind=kmr2EngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 const shared=kindProgram(kind);
 const extra=shared||BY_ID[card.id];
 if(!extra)throw Error(card.id+' has no Kamen Rider vol.2 program');
 walkJobs(extra,step=>{
  if(!kmr2Implements(step.id,step.slot))
   throw Error(card.id+' '+step.slot+' is not implemented');
 });
 for(const slot of EXTRA[card.id]||[])
  if(!kmr2Implements(card.id,slot))throw Error(card.id+' '+slot+' is not implemented');
 const marked=extra.implementation||(Object.keys(extra.effects||{}).length||
  extra.phaseEffects||extra.mainAbility||extra.impactNull||extra.enterAlwaysActive||
  extra.activeExtraEnergy||extra.printedImpact||extra.raidName||extra.ownTurnBp||
  extra.opponentTurnBp||extra.emptyOwnFieldHandEnergyDiscount||extra.nameAliases||
  extra.kmr2Hook||extra.raidOnlyEntry||extra.raidNameAlsoIncludes||extra.maxCopies?'dsl':'vanilla');
 const trig=triggerProfile(card);
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,...(card.traitComponents?{traitComponents:card.traitComponents}:{}),
  ...(card.maxCopies?{maxCopies:card.maxCopies}:{}),
  implementation:marked,...extra,
  ...(trig?{triggerEffect:trig}:{}),
  effects:extra.effects||{}
 };
}

export function kmr2PackCards(){
 const cards=KMR2_CARDS.map(kmr2PackCard);
 if(cards.length!==100)throw Error('Kamen Rider vol.2 registered count drifted');
 return cards;
}

export function createKmr2V2Pack(){
 return createUniversalPack({id:'kmr',version:'kmr-ex12-20261102',cards:kmr2PackCards()});
}
