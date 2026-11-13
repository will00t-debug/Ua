// C group programs for UA10BT MHA-1-001 through 050.
// ready is true only when the whole printed sentence is an existing V2
// operation. A matching clause is not enough.
const play=effects=>Object.freeze({
 ready:true, implementation:'dsl', effects:Object.freeze({onPlay:effects})
});
const vanilla=Object.freeze({ready:true, implementation:'vanilla'});

export const MHA_PROGRAMS_001_050=Object.freeze({
 'MHA-1-008':vanilla,
 'MHA-1-012':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({
   op:'restSelfGainEnergyRetireEndMain', lines:'field', oncePerTurn:true, extraEnergy:1
  })
 }),
 'MHA-1-015':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onRetire:Object.freeze([{op:'draw', count:1}])})
 }),
 'MHA-1-016':Object.freeze({ready:true, implementation:'dsl', activeExtraEnergy:1}),
 'MHA-1-019':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({
   op:'frontOnceProgram', frontOnly:true, oncePerTurn:true,
   then:Object.freeze([{
    op:'enemyBpDown', bp:1000, optional:false, minBp:1500, zone:'front'
   }])
  })
 }),
 'MHA-1-021':Object.freeze({
  ready:true, implementation:'dsl',
  opponentFieldColorsHandEnergyDiscount:Object.freeze({colors:Object.freeze(['green','red']), amount:1})
 }),
 'MHA-1-022':play(Object.freeze([{op:'bounceOwnOtherUnderEnergy', energy:1}])),
 'MHA-1-024':vanilla,
 'MHA-1-027':Object.freeze({
  ready:true, implementation:'dsl',
  passiveBonuses:Object.freeze([Object.freeze({
   condition:Object.freeze({
    kind:'ownNameOrRaidBase', turn:'any', zone:'front', excludeSelf:false,
    name:'オーバーホール'
   }),
   bp:1000
  })])
 }),
 'MHA-1-028':play(Object.freeze([{op:'drawDiscard', count:1}])),
 'MHA-1-032':play(Object.freeze([{op:'recoverAp', count:2}])),
 'MHA-1-034':Object.freeze({ready:true, implementation:'dsl', activeExtraEnergy:1}),
 'MHA-1-036':Object.freeze({ready:true, implementation:'dsl', step:true}),
 'MHA-1-037':Object.freeze({
  ready:true, implementation:'dsl',
  opponentFieldColorsHandEnergyDiscount:Object.freeze({colors:Object.freeze(['purple','red']), amount:1})
 }),
 'MHA-1-039':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onAttack:Object.freeze([{op:'buffSelf', bp:1000}])})
 }),
 'MHA-1-040':vanilla,
 'MHA-1-041':play(Object.freeze([{op:'bounceOwnOtherUnderEnergy', energy:1}])),
 'MHA-1-043':play(Object.freeze([{
  op:'buffOwnField', filter:Object.freeze({field:'type', value:'character'}),
  bp:1000, optional:true, excludeSelf:true
 }])),
 'MHA-1-046':Object.freeze({ready:true, implementation:'dsl', impactNull:true}),
 'MHA-1-047':Object.freeze({ready:true, implementation:'dsl', step:true}),
 'MHA-1-049':vanilla,
 'MHA-1-050':Object.freeze({
  ready:true, implementation:'dsl', printedHandEnergyDiscount:1,
  blockBpRestriction:Object.freeze({relation:'atMost', bp:3000, condition:null}),
  triggerEffect:Object.freeze({op:'deployHandCharacter', color:'green', maxEnergy:2, ap:1})
 })
});
