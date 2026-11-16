// Third official-JP RNK batch. New printed sentences are shared Universal V2 ops.
const kenshin='緋村 剣心',saito='斎藤 一',sano='相楽 左之助',aoshi='四乃森 蒼紫',hiko='比古 清十郎';
const freeze=v=>Array.isArray(v)?Object.freeze(v.map(freeze)):
 v&&typeof v==='object'?Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,freeze(x)]))):v;
const card=(fields)=>freeze({ready:true,implementation:'dsl',...fields});
const battle=true;
const atMost2000=Object.freeze({relation:'atMost',bp:2000,condition:null});
const color2500=Object.freeze({op:'retireOppFrontUnderBp',bp:2500});
const energyActive=Object.freeze({op:'optionalDiscardThenActive',optional:true,line:'energy'});
export const RNK_PROGRAMS_SHARED_THIRD=freeze({
 'RNK-1-008':card({raidName:hiko,printedAttackDamage:2,blockBpRestriction:atMost2000,
  ownTurnBp:3000,
  effects:{onPlay:[{op:'recoverOutsideType',type:'event',optional:true,max:1}]},
  mainAbility:{op:'fieldOnceBuffOther',lines:'field',oncePerTurn:true,bp:1000}}),
 'RNK-1-013':card({substituteOppRetire:{name:aoshi,turn:'own',line:'front',active:true}}),
 'RNK-1-019':card({
  mainAbility:{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1000},
  effects:{onRetire:[{op:'optionalHandOutsideThenRestDeploy',name:aoshi,color:'blue',maxEnergy:2}]}}),
 'RNK-1-024':card({
  effects:{onPlay:[{op:'chooseOne',optional:false,options:[
   {id:'energy',label:'このターン発生エナジー+青',turn:'any',then:[
    {op:'grantSelfColorEnergyThisTurn',color:'blue',amount:1}]},
   {id:'bp',label:'他のキャラを1枚までBP+1000',turn:'any',then:[
    {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]}
  ]}]},
  mainAbility:{op:'restBuffOtherReturnHand',bp:1000}}),
 'RNK-1-029':card({triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'grantNamedAttackEndReactive',name:aoshi,bp:-1000}]}}),
 'RNK-1-039':card({raidName:saito,impactNull:true,blockBpRestriction:atMost2000,
  effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:5,discard:false,logic:'any',filters:[
   {field:'name',value:kenshin},{field:'name',value:saito},{field:'name',value:sano}
  ]}]}}),
 'RNK-1-043':card({conditionalImpactBpAtLeast:5000,
  mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[
   {op:'frontMillScaleBp',step:500}]}}),
 'RNK-1-070':card({effects:{onPlay:[energyActive]},
  mainAbility:{op:'restSelfBuffOther',bp:1000}}),
 'RNK-1-085':card({step:true,battleEnergyInstead:battle}),
 'RNK-1-086':card({battleEnergyInstead:battle,effects:{onPlay:[
  {op:'searchTopOneBottomDiscard',count:3,filter:{field:'name',value:kenshin}}]}}),
 'RNK-1-087':card({battleEnergyInstead:battle}),
 'RNK-1-088':card({impactNull:true,battleEnergyInstead:battle,triggerEffect:color2500,
  effects:{onPlay:[{op:'optionalDiscardThenActive',optional:true}]}}),
 'RNK-1-090':card({battleEnergyInstead:battle,raidName:kenshin,
  effects:{onAttack:[{op:'optionalDiscardThenActive',optional:true,oncePerTurn:true}],
   onPlay:[{op:'draw',count:1}]}}),
 'RNK-1-093':card({triggerEffect:color2500,
  mainAbility:{op:'payApDrawBuff',oncePerTurn:true,draw:1,bp:1000,ap:1},
  effects:{onAttack:[{op:'optionalDiscardActiveUnattacked',optional:true}]}}),
 'RNK-1-098':card({
  effects:{onPlay:[{op:'restOppFrontOne',optional:false}]},
  moveTriggers:[{when:{from:'hand',to:'outside',sourceOnField:true,sourceName:kenshin,
   sourceColor:'red',reasons:['own-effect']},then:[{op:'draw',count:1}]}]}),
 'RNK-1-101':card({
  phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[
   {op:'optionalRestDrawIfNoOppRetired',once:'name'}]}],
  effects:{onPlay:[energyActive]}}),
 'RNK-1-102':card({effects:{onAttack:[{op:'optionalRestOwnFrontThenImpact',optional:true}]}}),
 'RNK-1-105':card({ownTurnBp:-1000,battleEnergyInstead:battle}),
 'RNK-1-106':card({battleEnergyInstead:battle,raidName:kenshin,printedImpact:1,
  effects:{onPlay:[{op:'moveOppFrontEnergyVacate',optional:true}]}}),
 'RNK-1-110':card({raidName:aoshi,impactNull:true,effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,discard:false,groups:[
   {logic:'all',filters:[{field:'trait',value:'御庭番衆'}]},
   {logic:'all',filters:[{field:'type',value:'event'},{field:'nameIncludes',value:'回天剣舞'}]}]
 }]}})
});
