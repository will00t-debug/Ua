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
 'IMC-1-067':Object.freeze({
  ready:true,implementation:'dsl',
  mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',
   oncePerTurn:true,extraEnergy:1}
 }),
 'IMC-1-076':play([{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'trait',value:'Starry-Go-Round'}}]),
 'IMC-1-085':play([{op:'inspectTopTraitOutside',count:2,
  trait:'Starry-Go-Round',rest:'top'}]),
 'IMC-1-086':Object.freeze({ready:true,implementation:'dsl',printedImpact:1}),
 'IMC-1-088':Object.freeze({ready:true,implementation:'vanilla'}),
 'IMC-1-089':Object.freeze({ready:true,implementation:'dsl',step:true,
  effects:{onPlay:[{op:'peekTopOne'}]}}),
 'IMC-1-091':play([{op:'drawDiscard',count:1}]),
 'IMC-1-092':play([{op:'peekTopOne'}]),
 'IMC-1-095':play([{op:'inspectTopAnyOutside',count:2,rest:'top',maxOutside:1}]),
 'IMC-1-096':play([{op:'bounceOwnOtherUnderEnergy',energy:1}]),
 'IMC-1-100':play([{op:'recoverAp',count:2}]),
 // Draw is the only sentence that resolves. The AP discount looks for a
 // source still on the field, and this event has already moved outside.
 // The 6-kind and 9-kind entry grants are not ownDistinctTraitNames.
 'IMC-1-098':Object.freeze({
  implementation:'dsl',
  triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'draw',count:1}]},
  notes:'AP-1、場加場外的不同卡名，以及下一張或全部活動登場，見 requests。'
 })
});
