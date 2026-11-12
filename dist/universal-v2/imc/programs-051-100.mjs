// C group owns this file. IMC-1-051 through IMC-1-100.
// ready:true only when every printed sentence is an existing V2 op and
// has a behavior test. Partial programs stay out of the battle pack.
const play=effects=>({ready:true,implementation:'dsl',effects:{onPlay:effects}});

export const IMC_PROGRAMS_051_100=Object.freeze({
 'IMC-1-053':play([{op:'bounceOwnOtherUnderEnergy',energy:1}]),
 'IMC-1-056':play([{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'trait',value:'LiPPS'}}]),
 'IMC-1-058':play([{op:'drawDiscard',count:1}]),
 'IMC-1-059':play([{op:'drawDiscard',count:1}]),
 'IMC-1-063':play([{op:'recoverAp',count:2}]),
 'IMC-1-066':play([
  {op:'draw',count:2},
  {op:'ifLiveThen',when:{kind:'oppCharacterBpAtLeast',turn:'any',zone:'field',minBp:4500},
   then:[{op:'draw',count:1}]}
 ]),
 'IMC-1-067':Object.freeze({
  ready:true,implementation:'dsl',
  mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',
   oncePerTurn:true,extraEnergy:1}
 }),
 'IMC-1-070':Object.freeze({
  ready:true,implementation:'dsl',
  passiveBonuses:[{bp:1000,condition:{
   kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',excludeSelf:false,
   trait:'お願い！シンデレラ',min:6}}]
 }),
 'IMC-1-071':Object.freeze({
  ready:true,implementation:'dsl',
  passiveBonuses:[{bp:1500,condition:{
   kind:'ownDistinctTraitNames',turn:'own',zone:'fieldOutside',excludeSelf:false,
   trait:'お願い！シンデレラ',min:6}}]
 }),
 'IMC-1-076':play([{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'trait',value:'Starry-Go-Round'}}]),
 'IMC-1-077':Object.freeze({
  ready:true,implementation:'dsl',emptyOwnFieldHandEnergyDiscount:2,
  effects:{onPlay:[{op:'drawDiscard',count:1}]}
 }),
 'IMC-1-079':play([{op:'deployOwnHandRest',type:'character',color:'red',
  energy:2,ap:null,max:1,trait:'Starry-Go-Round'}]),
 'IMC-1-081':Object.freeze({
  ready:true,implementation:'dsl',
  passiveBonuses:[{bp:1500,condition:{
   kind:'ownPrintedTraitCount',turn:'any',zone:'field',excludeSelf:false,
   trait:'Starry-Go-Round',min:3,printedEnergy:2}}]
 }),
 'IMC-1-082':Object.freeze({
  ready:true,implementation:'dsl',
  triggerEffect:{op:'retireOppFrontUnderBp',bp:2500},
  passiveBonuses:[{extraEnergy:1,condition:{
   kind:'ownPrintedTraitCount',turn:'any',zone:'field',excludeSelf:false,
   trait:'Starry-Go-Round',min:3,printedEnergy:2}}]
 }),
 'IMC-1-085':play([{op:'inspectTopTraitOutside',count:2,
  trait:'Starry-Go-Round',rest:'top'}]),
 'IMC-1-086':Object.freeze({ready:true,implementation:'dsl',printedImpact:1}),
 'IMC-1-088':Object.freeze({ready:true,implementation:'vanilla'}),
 'IMC-1-089':Object.freeze({ready:true,implementation:'dsl',step:true,
  effects:{onPlay:[{op:'peekTopOne'}]}}),
 'IMC-1-090':Object.freeze({ready:true,implementation:'dsl',activeExtraEnergy:1}),
 'IMC-1-091':play([{op:'drawDiscard',count:1}]),
 'IMC-1-092':play([{op:'peekTopOne'}]),
 'IMC-1-095':play([{op:'inspectTopAnyOutside',count:2,rest:'top',maxOutside:1}]),
 'IMC-1-096':play([{op:'bounceOwnOtherUnderEnergy',energy:1}]),
 'IMC-1-100':play([{op:'recoverAp',count:2}]),
 // Draw and the special trigger are done. fieldOutside and the event
 // discount exist, but one ifLiveThen cannot switch 6 kinds into the next
 // play and 9 kinds into every play.
 'IMC-1-098':Object.freeze({
  implementation:'dsl',
  triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'draw',count:1}]},
  notes:'AP-1、場加場外的不同卡名，以及下一張或全部活動登場，見 requests。'
 })
});
