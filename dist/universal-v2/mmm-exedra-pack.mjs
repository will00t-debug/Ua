// EX16BT Magia Exedra. Every playable identity has a real program.
// Sentences the shared validator already accepts stay on those ops.
// Anything else is the closed mmm2 op, resolved by mmm-exedra-runtime.mjs.
import {exedraEngineKind} from './mmm-exedra-kinds.mjs';

const GIRL='魔法少女';
const VILLA='チームみかづき荘';
const MAGIUS='マギウス';
const WING='マギウスの翼';
const job=(id,slot)=>({op:'mmm2',id,slot});
const main=id=>({op:'mmm2Main',id});
const buff=(filter,bp,optional,excludeSelf)=>({
 op:'buffOwnField',filter,bp,optional,excludeSelf
});
const anyBuff=(bp,optional,excludeSelf)=>buff({field:'type',value:'character'},bp,optional,excludeSelf);
const entries=(trait,min)=>({kind:'ownDistinctTraitEntriesThisTurn',turn:'any',min,trait});

const BY_ID={
 'MMM-2-001':{raidName:'鹿目 まどか',effects:{
  onPlay:[job('MMM-2-001','onPlay')],onRetire:[job('MMM-2-001','onRetire')]}},
 'MMM-2-003':{effects:{onPlay:[job('MMM-2-003','onPlay')]}},
 'MMM-2-004':{emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[{op:'peekTopOne'}]}},
 'MMM-2-005':{step:true,opponentTurnBp:1000,effects:{}},
 'MMM-2-006':{passiveBonuses:[{
  condition:{kind:'ownOutsideEventCountAtLeast',turn:'any',min:4},bp:1000}],effects:{}},
 'MMM-2-007':{effects:{onPlay:[anyBuff(1000,true,false)]},mainAbility:main('MMM-2-007')},
 'MMM-2-008':{mainAbility:main('MMM-2-008'),effects:{}},
 'MMM-2-009':{effects:{onPlay:[job('MMM-2-009','onPlay')]}},
 'MMM-2-010':{effects:{onPlay:[job('MMM-2-010','onPlay')]}},
 'MMM-2-011':{nameAliases:['鹿目 まどか'],triggerEffect:{
  op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true},effects:{}},
 'MMM-2-012':{nameAliases:['暁美 ほむら'],mainAbility:main('MMM-2-012'),effects:{}},
 'MMM-2-013':{passiveBonuses:[{
  condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'鹿目 まどか'},
  bp:1000}],effects:{}},
 'MMM-2-014':{effects:{onPlay:[job('MMM-2-014','onPlay')]}},
 'MMM-2-016':{mainAbility:main('MMM-2-016'),effects:{}},
 'MMM-2-017':{mainAbility:main('MMM-2-017'),effects:{}},
 'MMM-2-018':{effects:{onPlay:[job('MMM-2-018','onPlay')]}},
 'MMM-2-019':{mainAbility:main('MMM-2-019'),effects:{}},
 'MMM-2-020':{passiveBonuses:[{
  condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'美国 織莉子'},
  bp:1000}],effects:{onRetire:[buff({field:'name',value:'美国 織莉子'},1000,true,false)]}},
 'MMM-2-023':{enterAlwaysActive:true,effects:{onPlay:[job('MMM-2-023','onPlay')]}},
 'MMM-2-025':{mainAbility:main('MMM-2-025'),effects:{}},
 'MMM-2-026':{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'name',value:'環 うい'},{field:'trait',value:VILLA}]}]}},
 'MMM-2-027':{effects:{onPlay:[{op:'ifLiveThen',when:entries(VILLA,3),then:[{op:'draw',count:1}]}]}},
 'MMM-2-028':{raidName:'環 いろは',effects:{onPlay:[anyBuff(1000,true,false)]},
  mainAbility:main('MMM-2-028')},
 'MMM-2-031':{triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1},
  effects:{onPlay:[job('MMM-2-031','onPlay')]}},
 'MMM-2-032':{raidName:'七海 やちよ',impactNull:true,passiveBonuses:[{
  condition:entries(VILLA,3),impact:1}],effects:{onPlay:[job('MMM-2-032','onPlay')]}},
 'MMM-2-033':{effects:{onPlay:[job('MMM-2-033','onPlay')]}},
 'MMM-2-034':{passiveBonuses:[{
  condition:{kind:'ownDistinctTraitNames',turn:'any',min:2,zone:'front',excludeSelf:false,trait:VILLA},
  extraEnergy:1}],effects:{}},
 'MMM-2-035':{impactNull:true,phaseEffects:[{
  phase:'attack',edge:'end',turn:'own',then:[job('MMM-2-035','attackEnd')]}],effects:{}},
 'MMM-2-036':{ownTurnBp:500,effects:{}},
 'MMM-2-037':{passiveBonuses:[{condition:entries(VILLA,3),bp:1500}],effects:{}},
 'MMM-2-038':{passiveBonuses:[{condition:entries(VILLA,3),bp:1000}],
  effects:{onAttack:[job('MMM-2-038','onAttack')]}},
 'MMM-2-039':{effects:{onPlay:[buff({field:'trait',value:VILLA},1000,true,true)]}},
 'MMM-2-040':{mainAbility:main('MMM-2-040'),effects:{}},
 'MMM-2-041':{enterAlwaysActive:true,effects:{
  onPlay:[job('MMM-2-041','onPlay')],onAttack:[job('MMM-2-041','onAttack')]}},
 'MMM-2-043':{emptyOwnFieldHandEnergyDiscount:2,mainAbility:main('MMM-2-043'),effects:{}},
 'MMM-2-044':{impactNull:true,mainAbility:main('MMM-2-044'),effects:{}},
 'MMM-2-045':{raidName:'アリナ・グレイ',effects:{onPlay:[job('MMM-2-045','onPlay')]}},
 'MMM-2-046':{effects:{onPlay:[job('MMM-2-046','onPlay')]}},
 'MMM-2-047':{triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1},
  mainAbility:main('MMM-2-047'),effects:{}},
 'MMM-2-048':{effects:{onPlay:[{op:'inspectTopArrange',count:3,toOutside:false,rest:'top'}]}},
 'MMM-2-049':{raidName:'里見 灯花',frontGeneratesEnergy:true,effects:{
  onPlay:[job('MMM-2-049','onPlay')]},mainAbility:main('MMM-2-049')},
 'MMM-2-050':{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'trait',value:MAGIUS},{field:'trait',value:WING}]}]}},
 'MMM-2-051':{effects:{onPlay:[job('MMM-2-051','onPlay')]},mainAbility:main('MMM-2-051')},
 'MMM-2-055':{printedHandEnergyDiscount:2,passiveBonuses:[{
  condition:{kind:'ownDistinctTraitNames',turn:'own',min:3,zone:'field',excludeSelf:false,trait:MAGIUS},
  bp:1000}],effects:{}},
 'MMM-2-056':{effects:{onPlay:[job('MMM-2-056','onPlay')]}},
 'MMM-2-057':{mainAbility:main('MMM-2-057'),effects:{}},
 'MMM-2-058':{effects:{onPlay:[{op:'searchTopUpToTwoBottom',count:5,max:3,rest:'bottom',
  logic:'all',filters:[{field:'trait',value:VILLA}],distinctNames:true}]}},
 'MMM-2-059':{triggerEffect:{op:'retireOppFront'},effects:{onPlay:[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:'環 いろは',bonusBp:5000}]}},
 'MMM-2-060':{printedHandEnergyDiscount:2,effects:{onPlay:[job('MMM-2-060','onPlay')]}},
 'MMM-2-061':{triggerEffect:{op:'retireOppFront'},effects:{onPlay:[job('MMM-2-061','onPlay')]}},
 'MMM-2-063':{effects:{onPlay:[job('MMM-2-063','onPlay')]}},
 'MMM-2-065':{readyOnBlockCount:1,effects:{onPlay:[{op:'ifLiveThen',when:{
  kind:'ownLifeToHandThisTurn',turn:'own'},then:[{op:'draw',count:1}]}]}},
 'MMM-2-066':{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:4,logic:'any',filters:[
  {field:'name',value:'佐倉 杏子'},{field:'name',value:'美樹 さやか'}]}]}},
 'MMM-2-067':{emptyOwnFieldHandEnergyDiscount:2,passiveBonuses:[{
  condition:{logic:'any',turn:'own',checks:[
   {kind:'ownDistinctTraitNames',turn:'own',min:4,zone:'field',excludeSelf:true,trait:GIRL},
   {kind:'ownLifeToHandThisTurn',turn:'own'}]},bp:1000}],
  effects:{onRaided:[job('MMM-2-067','onRaided')]}},
 'MMM-2-069':{raidName:'巴 マミ',effects:{
  onPlay:[{op:'searchTopOneBottomDiscard',count:4,filter:{field:'trait',value:GIRL},noHandDiscard:true}],
  onRetire:[job('MMM-2-069','onRetire')]}},
 'MMM-2-070':{mainAbility:main('MMM-2-070'),effects:{}},
 'MMM-2-071':{mainAbility:main('MMM-2-071'),effects:{}},
 'MMM-2-072':{mainAbility:main('MMM-2-072'),effects:{}},
 'MMM-2-073':{handUseOncePerName:true,effects:{onPlay:[job('MMM-2-073','onPlay')]}}
};

function kindProgram(kind){
 if(kind==='plain')return {implementation:'vanilla',effects:{}};
 if(kind==='drawDiscard')return {effects:{onPlay:[{op:'drawDiscard',count:1}]}};
 if(kind==='step')return {step:true,effects:{}};
 if(kind==='buffOther')return {effects:{onPlay:[anyBuff(1000,true,true)]}};
 if(kind==='bounce')return {effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]}};
 if(kind==='recoverAp2')return {effects:{onPlay:[{op:'recoverAp',count:2}]}};
 if(kind==='impactNull')return {impactNull:true,effects:{}};
 if(kind==='restEnergyRetire')return {mainAbility:{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1},effects:{}};
 if(kind==='activeEnergy')return {activeExtraEnergy:1,effects:{}};
 return null;
}

export function exedraPackCard(card){
 const kind=exedraEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 if(!kind)throw Error(card.id+' is catalogue-only');
 const parts=(card.traits||[]).length===1?card.traits[0].split('／'):[];
 const shared=kindProgram(kind);
 const extra=shared||BY_ID[card.id];
 if(!extra)throw Error(card.id+' has no EX16 program');
 if(kind==='restEnergyRetire'&&card.gen!==0)
  throw Error(card.id+' plus generation is a design mark, not a printed number');
 if(kind==='activeEnergy'&&card.gen!==0)
  throw Error(card.id+' plus generation is a design mark, not a printed number');
 const implementation=extra.implementation||(Object.keys(extra.effects||{}).length||
  extra.mainAbility||extra.phaseEffects||extra.impactNull||extra.step||
  extra.passiveBonuses||extra.enterAlwaysActive||extra.activeExtraEnergy||
  extra.ownTurnBp||extra.opponentTurnBp||extra.nameAliases||
  extra.emptyOwnFieldHandEnergyDiscount||extra.printedHandEnergyDiscount||
  extra.readyOnBlockCount||extra.frontGeneratesEnergy||extra.handUseOncePerName
  ?'dsl':'vanilla');
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  ...(parts.length>1?{traitComponents:parts}:{}),
  implementation,
  ...extra,
  effects:extra.effects||{}
 };
}
