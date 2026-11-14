// D group owns this file. MHA-1-051 through MHA-1-100.
// ready:true only when every printed sentence is an existing V2 op.
// A partial sentence stays out of this object and in the request list.
const play=effects=>({ready:true,implementation:'dsl',effects:{onPlay:effects}});

export const MHA_PROGRAMS_051_100=Object.freeze({
 'MHA-1-051':Object.freeze({
  ready:true,implementation:'dsl',raidName:'通形 ミリオ',
  blockBpRestriction:{relation:'atMost',bp:3000,condition:null},
  unblockedAttack:{oncePerTurn:true,optional:false,then:[{op:'draw',count:1}]},
  effects:{onRetire:[{op:'deployRaidBottomActive',optional:true,when:{
   kind:'ownOtherRequiredEnergyAtLeast',turn:'any',zone:'field',
   excludeSelf:true,minEnergy:4,min:3
  }}]}
 }),
 'MHA-1-052':Object.freeze({
  ready:true,implementation:'dsl',
  effects:{onAttack:[{op:'enemyBpDown',bp:500,optional:true,minBp:1000,zone:'field'}]}
 }),
 'MHA-1-053':Object.freeze({
  ready:true,implementation:'dsl',
  effects:{onAttack:[{
   op:'chooseOne',optional:false,
   options:[
    {id:'bp',label:'このターンBP+1000',turn:'any',then:[{op:'buffSelf',bp:1000}]},
    {id:'impact',label:'このターンインパクト1',turn:'any',
     then:[{op:'grantSelfImpactThisTurn',amount:1}]}
   ]
  }]}
 }),
 'MHA-1-054':play([{
  op:'searchTopOneBottomDiscard',count:7,discard:false,logic:'all',filters:[
   {field:'type',value:'field'},
   {field:'color',value:'green'},
   {field:'printedRequiredEnergyAtMost',value:2}
  ]
 }]),
 'MHA-1-057':Object.freeze({ready:true,implementation:'vanilla'}),
 'MHA-1-058':play([{op:'drawDiscard',count:1}]),
 'MHA-1-061':play([{op:'draw',count:1}]),
 'MHA-1-064':Object.freeze({
  ready:true,implementation:'dsl',
  triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'通形 ミリオ',bonusBp:5000}]}
 }),
 'MHA-1-065':Object.freeze({
  ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'recoverAp',count:2}]}
 }),
 'MHA-1-067':Object.freeze({ready:true,implementation:'dsl',impactNull:true}),
 'MHA-1-068':Object.freeze({
  ready:true,implementation:'dsl',
  mainAbility:{op:'restSelfBuffOther',bp:1000}
 }),
 'MHA-1-069':Object.freeze({
  ready:true,implementation:'dsl',
  opponentFieldColorsHandEnergyDiscount:{colors:['purple','green'],amount:1}
 }),
 'MHA-1-073':Object.freeze({
  ready:true,implementation:'dsl',
  mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',
   oncePerTurn:true,extraEnergy:1}
 }),
 'MHA-1-075':play([{op:'peekTopOrBottom'}]),
 'MHA-1-077':play([{op:'bounceOwnOtherUnderEnergy',energy:1}]),
 'MHA-1-078':Object.freeze({ready:true,implementation:'vanilla'}),
 'MHA-1-079':Object.freeze({
  ready:true,implementation:'dsl',
  effects:{onAttack:[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:500,optional:true,excludeSelf:true}]}
 }),
 'MHA-1-080':Object.freeze({
  ready:true,implementation:'dsl',enterAlwaysActive:true,
  effects:{onPlay:[{op:'drawDiscard',count:2,discardCount:1}]}
 }),
 'MHA-1-082':Object.freeze({ready:true,implementation:'vanilla'}),
 'MHA-1-083':Object.freeze({ready:true,implementation:'dsl',step:true}),
 'MHA-1-086':Object.freeze({ready:true,implementation:'dsl',activeExtraEnergy:1}),
 'MHA-1-088':Object.freeze({ready:true,implementation:'vanilla'}),
 'MHA-1-092':play([{op:'buffOwnField',filter:{field:'type',value:'character'},
  bp:1000,optional:true,excludeSelf:true}]),
 'MHA-1-094':Object.freeze({ready:true,implementation:'dsl',step:true}),
 'MHA-1-097':Object.freeze({
  ready:true,implementation:'dsl',
  triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'爆豪 勝己',bonusBp:5000}]}
 }),
 'MHA-1-098':Object.freeze({
  ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'recoverAp',count:2}]}
 })
});
