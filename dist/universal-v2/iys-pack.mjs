// UA50BT Inuyasha. Every playable identity has a real program.
// Sentences the shared validator already accepts stay on those ops.
// Anything else is the closed iys op, resolved by iys-runtime.mjs.
import {INUYASHA_CARDS} from '../inuyasha-cards.mjs';
import {iysEngineKind} from './iys-kinds.mjs';
import {createUniversalPack} from './pack.mjs';

const TRAIT='奈落一派';
const job=(id,slot)=>({op:'iys',id,slot});
const main=id=>({op:'iysMain',id});
const fromOutside={kind:'ownCharacterFromOutsideThisTurn',turn:'own'};
const anyBuff=(bp,optional,excludeSelf)=>({
 op:'buffOwnField',filter:{field:'type',value:'character'},bp,optional,excludeSelf
});
const names=(count,list,discard)=>({
 op:'searchTopOneBottomDiscard',count,logic:'any',
 ...(discard===false?{discard:false}:{}),
 filters:list.map(value=>({field:'name',value}))
});

const BY_ID={
 'IYS-1-005':{emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[job('IYS-1-005','onPlay')]}},
 'IYS-1-006':{impactNull:true,passiveBonuses:[{condition:fromOutside,bp:1000}],effects:{}},
 'IYS-1-007':{effects:{onAttack:[job('IYS-1-007','onAttack')]}},
 'IYS-1-008':{passiveBonuses:[{condition:fromOutside,attackDamage:2}],
  effects:{onPlay:[job('IYS-1-008','onPlay')]}},
 'IYS-1-009':{raidName:'殺生丸',passiveBonuses:[{condition:fromOutside,bp:500,impact:1}],
  effects:{onPlay:[job('IYS-1-009','onPlay')]}},
 'IYS-1-010':{effects:{onPlay:[job('IYS-1-010','onPlay')]}},
 'IYS-1-013':{passiveBonuses:[{
  condition:{kind:'ownNameExists',turn:'any',zone:'front',excludeSelf:false,name:'殺生丸'},
  extraEnergy:1}],effects:{onPlay:[job('IYS-1-013','onPlay')]}},
 'IYS-1-014':{effects:{onRetire:[job('IYS-1-014','onRetire')]}},
 'IYS-1-018':{effects:{onPlay:[{op:'peekTopOne'}]},mainAbility:main('IYS-1-018')},
 'IYS-1-019':{effects:{onPlay:[job('IYS-1-019','onPlay')]}},
 'IYS-1-022':{effects:{onPlay:[job('IYS-1-022','onPlay')]},mainAbility:main('IYS-1-022')},
 'IYS-1-026':{passiveBonuses:[
  {condition:{kind:'selfFacedownUnder',turn:'any'},impactNull:true},
  {condition:{kind:'selfFacedownUnder',turn:'own'},bp:1000}],effects:{}},
 'IYS-1-027':{mainAbility:main('IYS-1-027'),effects:{}},
 'IYS-1-028':{raidName:'奈落',mainAbility:main('IYS-1-028'),effects:{}},
 'IYS-1-030':{nameAliases:['奈落'],effects:{onPlay:[job('IYS-1-030','onPlay')]}},
 'IYS-1-032':{mainAbility:main('IYS-1-032'),effects:{}},
 'IYS-1-033':{effects:{onPlay:[job('IYS-1-033','onPlay')]}},
 'IYS-1-035':{effects:{onPlay:[job('IYS-1-035','onPlay')]}},
 'IYS-1-036':{effects:{onPlay:[{op:'drawDiscard',count:1},job('IYS-1-036','after')]}},
 'IYS-1-039':{effects:{onPlay:[job('IYS-1-039','onPlay')]}},
 'IYS-1-043':{emptyOwnFieldHandEnergyDiscount:2,mainAbility:main('IYS-1-043'),effects:{}},
 'IYS-1-044':{enterAlwaysActive:true,printedAttackDamage:2,mainAbility:main('IYS-1-044'),effects:{}},
 'IYS-1-045':{mainAbility:main('IYS-1-045'),effects:{
  onAttack:[{op:'drawIfSelfBpAtLeast',bp:4000,count:1}]}},
 'IYS-1-046':{raidName:'犬夜叉',mainAbility:main('IYS-1-046'),effects:{}},
 'IYS-1-049':{impactNull:true,mainAbility:main('IYS-1-049'),effects:{}},
 'IYS-1-051':{passiveBonuses:[{
  condition:{kind:'ownNamedAttackedThisTurn',turn:'own',name:'珊瑚'},bp:1000}],effects:{}},
 'IYS-1-054':{effects:{onPlay:[job('IYS-1-054','onPlay')]}},
 'IYS-1-056':{effects:{onPlay:[job('IYS-1-056','onPlay')]}},
 'IYS-1-058':{passiveBonuses:[{
  condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'弥勒'},bp:1000}],
  effects:{onPlay:[job('IYS-1-058','onPlay')]}},
 'IYS-1-059':{raidName:'珊瑚',printedImpact:1,effects:{onPlay:[job('IYS-1-059','onPlay')]}},
 'IYS-1-061':{emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[{op:'peekTopOne'}]},
  mainAbility:main('IYS-1-061')},
 'IYS-1-066':{raidName:'日暮 かごめ',effects:{onPlay:[{
  op:'deployOwnHandRest',type:'character',color:'red',energy:3,ap:1,max:1,
  names:['犬夜叉','日暮 かごめ']}]},mainAbility:main('IYS-1-066')},
 'IYS-1-070':{mainAbility:main('IYS-1-070'),effects:{}},
 'IYS-1-071':{raidName:'弥勒',effects:{onPlay:[job('IYS-1-071','onPlay')]}},
 'IYS-1-074':{playRequiresOwnName:'日暮 かごめ',effects:{onPlay:[job('IYS-1-074','onPlay')]}},
 'IYS-1-075':{effects:{onPlay:[job('IYS-1-075','onPlay')]}},
 'IYS-1-077':{handApDiscountWhileName:{name:'弥勒',amount:1},
  effects:{onPlay:[job('IYS-1-077','onPlay')]}},
 'IYS-1-078':{effects:{onPlay:[{op:'drawDiscard',count:2,discardCount:2},job('IYS-1-078','after')]}},
 'IYS-1-080':{effects:{onPlay:[job('IYS-1-080','onPlay')]}}
};

function kindProgram(kind){
 if(kind==='plain')return {implementation:'vanilla',effects:{}};
 if(kind==='impactNull')return {impactNull:true,effects:{}};
 if(kind==='move')return {effects:{onPlay:[{op:'moveOtherAcrossOrRemove',optional:true,traitless:true}]}};
 if(kind==='searchTraitless')return {effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:4,filter:{field:'traitlessCharacter',value:true}}]}};
 if(kind==='restEnergy')return {mainAbility:{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1},effects:{}};
 if(kind==='drawName')return {effects:{onPlay:[{op:'drawIfOwnName',name:'殺生丸',count:1}]}};
 if(kind==='retireDraw')return {effects:{onRetire:[{op:'draw',count:1}]}};
 if(kind==='drawDiscard')return {effects:{onPlay:[{op:'drawDiscard',count:1}]}};
 if(kind==='activeEnergy')return {activeExtraEnergy:1,effects:{}};
 if(kind==='bounce')return {effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]}};
 if(kind==='searchMirror')return {effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'trait',value:TRAIT},{field:'name',value:'神無の鏡'}]}]}};
 if(kind==='retiredBp')return {passiveBonuses:[{
  condition:{kind:'ownRetiredThisTurn',turn:'own',cardType:'character'},bp:1000}],effects:{}};
 if(kind==='returnSelf')return {effects:{onRetire:[{op:'returnRetiredToHand',optional:false}]}};
 if(kind==='enemyDown')return {effects:{onPlay:[{op:'enemyBpDown',bp:1000,optional:true,zone:'front'}]}};
 if(kind==='mill2')return {effects:{onRetire:[{op:'millTop',optional:true,count:2}]}};
 if(kind==='recoverAp2')return {effects:{onPlay:[{op:'recoverAp',count:2}]}};
 if(kind==='retireSesshomaru')return {effects:{onPlay:[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:'殺生丸',bonusBp:5000}]}};
 if(kind==='retire3000')return {effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000}]}};
 if(kind==='searchRedEvent')return {effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:4,filter:{field:'colorAndType',value:'red:event'}}]}};
 if(kind==='buffOther')return {effects:{onPlay:[anyBuff(1000,true,true)]}};
 if(kind==='step')return {step:true,effects:{}};
 if(kind==='searchCoral')return {effects:{onPlay:[names(3,['珊瑚','弥勒','雲母'])]}};
 if(kind==='recoverRedEvent')return {effects:{onPlay:[{
  op:'recoverOutsideOne',optional:true,logic:'all',filters:[
   {field:'color',value:'red'},{field:'type',value:'event'}]}]}};
 if(kind==='searchInuKagome')return {effects:{onPlay:[names(4,['犬夜叉','日暮 かごめ'])]}};
 if(kind==='searchNoDiscard')return {effects:{onPlay:[names(4,['犬夜叉','日暮 かごめ'],false)]}};
 if(kind==='retireInuyasha')return {effects:{onPlay:[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:'犬夜叉',bonusBp:5000}]}};
 return null;
}

function triggerProfile(card){
 if(card.trigger==='color'&&card.color==='purple')
  return {op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true};
 if(card.trigger==='color'&&card.color==='red')
  return {op:'retireOppFrontUnderBp',bp:2500};
 if(card.trigger==='special')return {op:'retireOppFront'};
 return null;
}

export function iysPackCard(card){
 const kind=iysEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 const shared=kindProgram(kind);
 const extra=shared||BY_ID[card.id];
 if(!extra)throw Error(card.id+' has no Inuyasha program');
 const implementation=extra.implementation||(Object.keys(extra.effects||{}).length||
  extra.mainAbility||extra.passiveBonuses||extra.impactNull||extra.step||
  extra.enterAlwaysActive||extra.activeExtraEnergy||extra.nameAliases||
  extra.emptyOwnFieldHandEnergyDiscount||extra.handApDiscountWhileName||
  extra.playRequiresOwnName||extra.printedImpact||extra.printedAttackDamage||
  extra.raidName?'dsl':'vanilla');
 const trig=triggerProfile(card);
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,implementation,
  ...extra,
  ...(trig?{triggerEffect:trig}:{}),
  effects:extra.effects||{}
 };
}

export function createIysV2Pack(){
 const cards=INUYASHA_CARDS.map(iysPackCard);
 if(cards.length!==80)throw Error('Inuyasha registered count drifted');
 return createUniversalPack({id:'inuyasha',version:'iys-ua50-full-20261029',cards});
}
