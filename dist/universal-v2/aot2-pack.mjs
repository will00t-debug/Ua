// EX10BT 進撃の巨人 Vol.2. Shared sentences stay on the validator's ops.
// Anything else is the closed aot2 op, resolved by aot2-runtime.mjs.
// The engine matches effectJa. Registration is not an official FAQ certification.
import {AOT2_CARDS} from '../aot-vol2-cards.mjs';
import {aot2EngineKind} from './aot2-kinds.mjs';
import {aot2Implements} from './aot2-runtime.mjs';

const job=(id,slot)=>({op:'aot2',id,slot});
const main=id=>({op:'aot2Main',id});
const CORPS='104期兵';
const PURE='無垢の巨人';
const HEIR='巨人継承者';
const WARRIOR='マーレの戦士';
const ARMIN='アルミン・アルレルト';
const FALCO='ファルコ・グライス';
const REINER='ライナー・ブラウン';
const EREN='エレン・イェーガー';
const ZIKE='ジーク・イェーガー';
const LEVI='リヴァイ';
const PIECK='ピーク・フィンガー';
const PORCO='ポルコ・ガリアード';
const MIKASA='ミカサ・アッカーマン';

const BY_ID={
 'AOT-2-002':{effects:{onPlay:[job('AOT-2-002','onPlay')]}},
 'AOT-2-003':{effects:{onPlay:[job('AOT-2-003','onPlay')]}},
 'AOT-2-005':{aotHook:true,effects:{}},
 'AOT-2-006':{aotHook:true,effects:{}},
 'AOT-2-007':{enterAlwaysActive:true,phaseEffects:[{phase:'attack',edge:'end',turn:'opponent',
  then:[{op:'retireSourceOnPhaseEnd'}]}],effects:{onPlay:[job('AOT-2-007','onPlay')]}},
 'AOT-2-008':{blockBpRestriction:{relation:'atLeast',bp:5000,condition:null},
  effects:{onPlay:[job('AOT-2-008','onPlay')]}},
 'AOT-2-009':{ownTurnBp:1000,mainAbility:main('AOT-2-009'),effects:{}},
 'AOT-2-010':{mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1},effects:{}},
 'AOT-2-012':{effects:{onPlay:[job('AOT-2-012','onPlay')]}},
 'AOT-2-013':{raidName:ARMIN,raidImpact:1,effects:{onPlay:[job('AOT-2-013','onPlay')]}},
 'AOT-2-014':{mainAbility:{op:'restSelfBuffOther',bp:1000},effects:{onPlay:[job('AOT-2-014','onPlay')]}},
 'AOT-2-016':{effects:{onPlay:[job('AOT-2-016','onPlay')]}},
 'AOT-2-017':{raidName:FALCO,step:true,mainAbility:main('AOT-2-017'),effects:{onPlay:[job('AOT-2-017','onPlay')]}},
 'AOT-2-019':{raidName:REINER,raidImpactNull:true,effects:{onPlay:[job('AOT-2-019','onPlay')]}},
 'AOT-2-021':{aotHook:true,effects:{}},
 'AOT-2-022':{raidName:EREN,raidImpact:1,mainAbility:main('AOT-2-022'),effects:{onPlay:[job('AOT-2-022','onPlay')]}},
 'AOT-2-024':{effects:{onPlay:[job('AOT-2-024','onPlay')]}},
 'AOT-2-025':{raidName:ZIKE,effects:{onPlay:[job('AOT-2-025','onPlay')]}},
 'AOT-2-026':{aotHook:true,effects:{}},
 'AOT-2-027':{step:true,aotHook:true,effects:{}},
 'AOT-2-028':{aotHook:true,effects:{}},
 'AOT-2-029':{energyLineForbidden:true,printedAttackDamage:2,aotHook:true,effects:{}},
 'AOT-2-030':{effects:{onPlay:[job('AOT-2-030','onPlay')],onRetire:[job('AOT-2-030','onRetire')]}},
 'AOT-2-031':{mainAbility:main('AOT-2-031'),effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:4,
  filter:{field:'trait',value:HEIR}}]}},
 'AOT-2-032':{effects:{onPlay:[job('AOT-2-032','onPlay')]}},
 'AOT-2-034':{effects:{onPlay:[job('AOT-2-034','onPlay')]}},
 'AOT-2-036':{effects:{onPlay:[job('AOT-2-036','onPlay')]}},
 'AOT-2-037':{effects:{onPlay:[job('AOT-2-037','onPlay')]}},
 'AOT-2-039':{effects:{onPlay:[{op:'enemyBpDown',bp:2000,optional:true,minBp:2500}]}},
 'AOT-2-040':{mainAbility:main('AOT-2-040'),effects:{}},
 'AOT-2-041':{impactNull:true,effects:{onAttack:[job('AOT-2-041','onAttack')]}},
 'AOT-2-042':{raidName:LEVI,effects:{onPlay:[job('AOT-2-042','onPlay')],onAttack:[job('AOT-2-042','onAttack')]}},
 'AOT-2-044':{mainAbility:main('AOT-2-044'),effects:{}},
 'AOT-2-045':{effects:{onPlay:[job('AOT-2-045','onPlay')]}},
 'AOT-2-046':{passiveBonuses:[
  {condition:{kind:'ownOutsideEventCountAtLeast',turn:'any',min:2},bp:1000},
  {condition:{kind:'ownOutsideEventCountAtLeast',turn:'any',min:4},impactNull:true}
 ],effects:{}},
 'AOT-2-047':{effects:{onPlay:[job('AOT-2-047','onPlay')]}},
 'AOT-2-048':{effects:{onPlay:[
  {op:'searchTopOneBottomDiscard',count:4,filter:{field:'type',value:'character'},discard:false},
  job('AOT-2-048','onPlay')]}},
 'AOT-2-049':{effects:{onPlay:[job('AOT-2-049','onPlay')]}},
 'AOT-2-050':{effects:{onAttack:[job('AOT-2-050','onAttack')]}},
 'AOT-2-051':{mainAbility:main('AOT-2-051'),effects:{onPlay:[job('AOT-2-051','onPlay')]}},
 'AOT-2-052':{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:5,
  filter:{field:'trait',value:PURE},noHandDiscard:true}]}},
 'AOT-2-053':{raidName:ZIKE,effects:{onPlay:[job('AOT-2-053','onPlay')]}},
 'AOT-2-055':{effects:{onPlay:[job('AOT-2-055','onPlay')]}},
 'AOT-2-056':{raidName:PIECK,effects:{onPlay:[job('AOT-2-056','onPlay')],onRetire:[job('AOT-2-056','onRetire')]}},
 'AOT-2-058':{raidName:PORCO,effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:4,
  filter:{field:'trait',value:WARRIOR},noHandDiscard:true}],onAttack:[job('AOT-2-058','onAttack')]}},
 'AOT-2-059':{nameAliases:['ライナー・ブラウン','ベルトルト・フーバー','アニ・レオンハート'],effects:{}},
 'AOT-2-060':{raidName:REINER,raidImpactNull:true,effects:{onPlay:[job('AOT-2-060','onPlay')],
  onAttack:[job('AOT-2-060','onAttack')]}},
 'AOT-2-061':{effects:{onPlay:[job('AOT-2-061','onPlay')]}},
 'AOT-2-062':{effects:{onPlay:[job('AOT-2-062','onPlay')]}},
 'AOT-2-064':{effects:{onAttack:[{op:'inspectTopArrange',count:3,toOutside:false,rest:'top'}]}},
 'AOT-2-065':{effects:{onPlay:[job('AOT-2-065','onPlay')]}},
 'AOT-2-066':{aotHook:true,effects:{}},
 'AOT-2-067':{raidName:MIKASA,effects:{onPlay:[job('AOT-2-067','onPlay')]}},
 'AOT-2-068':{aotHook:true,effects:{}},
 'AOT-2-069':{raidName:ARMIN,raidImpact:1,effects:{onPlay:[job('AOT-2-069','onPlay')]}},
 'AOT-2-070':{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:CORPS}}]}},
 'AOT-2-071':{impactNull:true,mainAbility:main('AOT-2-071'),effects:{onAttack:[job('AOT-2-071','onAttack')]}},
 'AOT-2-072':{raidName:EREN,effects:{onPlay:[job('AOT-2-072','onPlay')]}},
 'AOT-2-073':{effects:{onPlay:[job('AOT-2-073','onPlay')]}}
};

function kindProgram(kind){
 if(kind==='plain')return {implementation:'vanilla',effects:{}};
 if(kind==='impactNull')return {impactNull:true,effects:{}};
 if(kind==='drawDiscard')return {effects:{onPlay:[{op:'drawDiscard',count:1}]}};
 if(kind==='activeEnergy')return {activeExtraEnergy:1,effects:{}};
 if(kind==='bounce')return {effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]}};
 if(kind==='recoverAp2')return {effects:{onPlay:[{op:'recoverAp',count:2}]}};
 if(kind==='buffOther')return {effects:{onPlay:[{op:'buffOwnField',
  filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]}};
 return null;
}
function triggerProfile(card){
 if(card.trigger==='special')return {op:'retireOppFront'};
 if(card.trigger!=='color')return null;
 if(card.id==='AOT-2-008'||card.id==='AOT-2-031')return {op:'restOppFrontSkipNextActive'};
 if(card.id==='AOT-2-050')return {op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1};
 return null;
}
function walkJobs(extra,visit){
 for(const program of Object.values(extra.effects||{}))
  for(const step of program)if(step?.op==='aot2')visit(step);
 if(extra.mainAbility?.op==='aot2Main')visit({id:extra.mainAbility.id,slot:'main'});
}
export function aot2PackCard(card){
 const kind=aot2EngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 const shared=kindProgram(kind);
 const extra=shared||BY_ID[card.id];
 if(!extra)throw Error(card.id+' has no Attack on Titan vol.2 program');
 walkJobs(extra,step=>{
  if(!aot2Implements(step.id,step.slot))throw Error(card.id+' '+step.slot+' is not implemented');
 });
 const marked=extra.implementation||(Object.keys(extra.effects||{}).length||extra.phaseEffects||
  extra.mainAbility||extra.passiveBonuses||extra.impactNull||extra.enterAlwaysActive||
  extra.activeExtraEnergy||extra.raidName||extra.raidImpact||extra.raidImpactNull||
  extra.step||extra.energyLineForbidden||extra.printedAttackDamage||extra.ownTurnBp||
  extra.nameAliases||extra.blockBpRestriction||extra.aotHook?'dsl':'vanilla');
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
export function aot2PackCards(){
 const cards=AOT2_CARDS.map(aot2PackCard);
 if(cards.length!==73)throw Error('Attack on Titan vol.2 registered count drifted');
 return cards;
}
