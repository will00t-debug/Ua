// UA52BT 陰の実力者になりたくて！. Every playable identity has a real program.
// Sentences the shared validator already accepts stay on those ops.
// Anything else is the closed kjn op, resolved by kjn-runtime.mjs.
// Registration is not an official FAQ certification.
import {KJN_CARDS} from '../kjn-cards.mjs';
import {kjnEngineKind} from './kjn-kinds.mjs';
import {createUniversalPack} from './pack.mjs';

const SEVEN='七陰';
const SID='シド・カゲノー';
const CLAIRE='クレア・カゲノー';
const job=(id,slot)=>({op:'kjn',id,slot});
const main=id=>({op:'kjnMain',id});
const outside10={kind:'outsideCount',turn:'any',min:10};
const sidField={kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:SID};
const sevenNames=(min,turn)=>({
 kind:'ownDistinctTraitNames',turn,min,zone:'field',excludeSelf:false,trait:SEVEN
});

const BY_ID={
 'KJN-1-004':{mayOutsideToDeckTop:true,effects:{onPlay:[{op:'drawDiscard',count:1}]},
  mainAbility:main('KJN-1-004')},
 'KJN-1-006':{mainAbility:main('KJN-1-006'),effects:{}},
 'KJN-1-008':{mainAbility:main('KJN-1-008'),effects:{}},
 'KJN-1-009':{raidName:'アレクシア・ミドガル',effects:{onPlay:[job('KJN-1-009','onPlay')]},
  mainAbility:main('KJN-1-009')},
 'KJN-1-011':{frontForbidden:true,facedownMoveBanned:true,printedAttackDamage:2,
  effects:{onPlay:[job('KJN-1-011','onPlay')]},mainAbility:main('KJN-1-011')},
 'KJN-1-013':{effects:{onPlay:[job('KJN-1-013','onPlay')]}},
 'KJN-1-014':{effects:{onPlay:[job('KJN-1-014','onPlay')]}},
 'KJN-1-015':{raidName:CLAIRE,raidImpactNull:true,passiveBonuses:[{
  condition:{kind:'selfFacedownUnder',turn:'own'},bp:1000,impact:1}],
  effects:{onPlay:[job('KJN-1-015','onPlay')]}},
 'KJN-1-016':{raidName:CLAIRE,facedownDoubleAttack:true,passiveBonuses:[{
  condition:{kind:'selfFacedownUnder',turn:'any'},bp:1000}],
  effects:{onPlay:[job('KJN-1-016','onPlay')],onRetire:[job('KJN-1-016','onRetire')]}},
 'KJN-1-023':{effects:{onPlay:[job('KJN-1-023','onPlay')]}},
 'KJN-1-025':{effects:{},mainAbility:main('KJN-1-025')},
 'KJN-1-027':{mainAbility:main('KJN-1-027'),effects:{}},
 'KJN-1-028':{ownTurnBp:1000,effects:{onPlay:[job('KJN-1-028','onPlay')]}},
 'KJN-1-029':{mainAbility:main('KJN-1-029'),effects:{}},
 'KJN-1-030':{effects:{onPlay:[job('KJN-1-030','onPlay')]}},
 'KJN-1-031':{effects:{onPlay:[job('KJN-1-031','onPlay')]}},
 'KJN-1-032':{mainAbility:main('KJN-1-032'),effects:{}},
 'KJN-1-033':{mainAbility:main('KJN-1-033'),effects:{}},
 'KJN-1-034':{raidName:'ローズ・オリアナ',effects:{onPlay:[job('KJN-1-034','onPlay')]},
  mainAbility:main('KJN-1-034')},
 'KJN-1-035':{enterAlwaysActive:true,mainAbility:main('KJN-1-035'),effects:{}},
 'KJN-1-037':{effects:{onPlay:[job('KJN-1-037','onPlay')]}},
 'KJN-1-038':{effects:{onPlay:[job('KJN-1-038','onPlay')]}},
 'KJN-1-040':{enterAlwaysActive:true,effects:{onPlay:[job('KJN-1-040','onPlay')],
  onAttack:[job('KJN-1-040','onAttack')]}},
 'KJN-1-046':{effects:{onRaided:[job('KJN-1-046','onRaided')]}},
 'KJN-1-047':{passiveBonuses:[{condition:outside10,impactNull:true}],
  effects:{onPlay:[job('KJN-1-047','onPlay')]}},
 'KJN-1-048':{raidName:SID,frontGeneratesEnergy:true,
  effects:{onPlay:[job('KJN-1-048','onPlay')],onRetire:[job('KJN-1-048','onRetire')]}},
 'KJN-1-049':{raidName:SID,raidImpact:1,effects:{onPlay:[
  {op:'nextEligibleHandPlayApDiscount',filter:{noRaid:true}},
  job('KJN-1-049','onPlay')]}},
 'KJN-1-055':{effects:{onPlay:[job('KJN-1-055','onPlay')]}},
 'KJN-1-056':{raidName:'アルファ',effects:{onPlay:[job('KJN-1-056','onPlay')]},
  mainAbility:main('KJN-1-056')},
 'KJN-1-058':{mainAbility:main('KJN-1-058'),effects:{}},
 'KJN-1-061':{mainAbility:main('KJN-1-061'),effects:{}},
 'KJN-1-062':{mainAbility:main('KJN-1-062'),effects:{}},
 'KJN-1-063':{mainAbility:main('KJN-1-063'),effects:{}},
 'KJN-1-064':{effects:{onPlay:[{op:'draw',count:1}]},mainAbility:main('KJN-1-064')},
 'KJN-1-066':{blockBpRestriction:{relation:'atLeast',bp:4000,condition:sevenNames(7,'any')},
  effects:{onPlay:[job('KJN-1-066','onPlay')]}},
 'KJN-1-068':{mainAbility:main('KJN-1-068'),effects:{}},
 'KJN-1-069':{effects:{onPlay:[job('KJN-1-069','onPlay')]}},
 'KJN-1-070':{mainAbility:main('KJN-1-070'),effects:{}},
 'KJN-1-074':{raidName:'ベータ',raidImpactNull:true,effects:{onPlay:[job('KJN-1-074','onPlay')]},
  mainAbility:main('KJN-1-074')},
 'KJN-1-075':{enterAlwaysActive:true,mainAbility:main('KJN-1-075'),effects:{}},
 'KJN-1-077':{effects:{onPlay:[job('KJN-1-077','onPlay')]}},
 'KJN-1-080':{effects:{onPlay:[{op:'drawDiscard',count:3,discardCount:2},job('KJN-1-080','onPlay')]}}
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
 if(kind==='peekTopOrBottom')return {effects:{onPlay:[{op:'peekTopOrBottom'}]}};
 if(kind==='peekTopOne')return {effects:{onPlay:[{op:'peekTopOne'}]}};
 if(kind==='auroraTuck')return {mainAbility:main(card.id),effects:{}};
 if(kind==='KJN-1-001')return {enterAlwaysActive:true,printedAttackDamage:2,
  forceHigherBpBlock:true,attackLoseReadyTurn:{bp:1000},effects:{}};
 if(kind==='KJN-1-007')return {effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'name',value:'アレクシア・ミドガル'},
   {field:'name',value:'ローズ・オリアナ'},
   {field:'name',value:'ナツメ・カフカ'}]}]}};
 if(kind==='KJN-1-017')return {effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'colorAndType',value:'yellow:event'},
   {field:'colorAndType',value:'yellow:field'}]}]}};
 if(kind==='KJN-1-022')return {effects:{onPlay:[{
  op:'ifEnteredFromRemoved',then:[{op:'activeOwnOther',optional:true}]}]}};
 if(kind==='KJN-1-024')return {passiveBonuses:[{
  condition:{kind:'ownRemovedUseThisTurn',turn:'own'},bp:1500}],effects:{}};
 if(kind==='KJN-1-043')return {effects:{onRetire:[{op:'millTop',optional:true,count:2}]}};
 if(kind==='KJN-1-050')return {passiveBonuses:[{condition:outside10,bp:1500}],effects:{}};
 if(kind==='KJN-1-051')return {outsideGroupEnergy:{unit:10,per:1},
  effects:{onPlay:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]}};
 if(kind==='KJN-1-053')return {frontEnergyWhen:{logic:'all',checks:[outside10,sidField]},effects:{}};
 if(kind==='KJN-1-054')return {effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:SEVEN}}]}};
 if(kind==='KJN-1-059')return {effects:{onPlay:[{
  op:'inspectTopArrange',count:3,toOutside:false,rest:'top'}]}};
 if(kind==='KJN-1-071')return {effects:{onPlay:[{
  op:'deployOwnHandRest',type:'character',color:'purple',energy:2,ap:1,max:1,trait:SEVEN}]}};
 if(kind==='KJN-1-072')return {passiveBonuses:[{condition:sevenNames(5,'own'),bp:1500}],effects:{}};
 if(kind==='KJN-1-073')return {passiveBonuses:[{
  condition:{kind:'ownNameExists',turn:'any',zone:'front',excludeSelf:false,name:SID},
  extraEnergy:1}],effects:{onPlay:[{op:'millTop',optional:true,count:2}]}};
 if(kind==='KJN-1-076')return {handEnergyWhileName:{name:SID,amount:2},
  effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:5000}]}};
 if(kind==='KJN-1-078')return {effects:{onPlay:[{
  op:'retireOppFrontUnderBp',mandatory:true,traitPerBp:{trait:SEVEN,per:1000}}]}};
 return null;
}

function triggerProfile(card){
 if(card.trigger==='color'&&card.color==='yellow')return {op:'restOppFrontSkipNextActive'};
 if(card.trigger==='color'&&card.color==='purple')
  return {op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true};
 if(card.trigger==='special')return {op:'retireOppFront'};
 return null;
}

export function kjnPackCard(card){
 const kind=kjnEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 const shared=kindProgram(kind,card);
 const extra=shared||BY_ID[card.id];
 if(!extra)throw Error(card.id+' has no Eminence in Shadow program');
 const implementation=extra.implementation||(Object.keys(extra.effects||{}).length||
  extra.mainAbility||extra.passiveBonuses||extra.impactNull||extra.enterAlwaysActive||
  extra.activeExtraEnergy||extra.printedImpact||extra.printedAttackDamage||extra.raidName||
  extra.frontGeneratesEnergy||extra.frontForbidden||extra.ownTurnBp||extra.forceHigherBpBlock||
  extra.attackLoseReadyTurn||extra.facedownDoubleAttack||extra.facedownMoveBanned||
  extra.mayOutsideToDeckTop||extra.outsideGroupEnergy||extra.frontEnergyWhen||
  extra.handEnergyWhileName||extra.blockBpRestriction?'dsl':'vanilla');
 const trig=triggerProfile(card);
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  ...(card.traitComponents?{traitComponents:card.traitComponents}:{}),
  ...(card.nameAliases?{nameAliases:card.nameAliases}:{}),
  implementation,
  ...extra,
  ...(trig?{triggerEffect:trig}:{}),
  effects:extra.effects||{}
 };
}

export function createKjnV2Pack(){
 const cards=KJN_CARDS.map(kjnPackCard);
 if(cards.length!==80)throw Error('Eminence in Shadow registered count drifted');
 return createUniversalPack({id:'kjn',version:'kjn-ua52-full-20261029',cards});
}
