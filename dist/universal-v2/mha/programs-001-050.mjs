// C group programs for UA10BT MHA-1-001 through 050.
// ready is true only when the whole printed sentence is an existing V2
// operation. A matching clause is not enough.
const play=effects=>Object.freeze({
 ready:true, implementation:'dsl', effects:Object.freeze({onPlay:effects})
});
const vanilla=Object.freeze({ready:true, implementation:'vanilla'});

export const MHA_PROGRAMS_001_050=Object.freeze({
 'MHA-1-001':Object.freeze({
  ready:true, implementation:'dsl', impactNull:true,
  effects:Object.freeze({onRetire:Object.freeze([{op:'drawDiscard', count:1}])})
 }),
 'MHA-1-002':Object.freeze({
  ready:true, implementation:'dsl',
  triggerEffect:Object.freeze({
   op:'deployOutsideCharacter', color:'purple', maxEnergy:2, ap:1, frontOnly:true
  }),
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'millUpToThenRecover', count:3, optional:true
  }])}),
  mainAbility:Object.freeze({
   op:'restRetireSequence',
   then:Object.freeze([{
    op:'recoverOutsideAny', zone:'outside', max:1, optional:true,
    anyOf:Object.freeze([
     Object.freeze({field:'trait', value:'死穢八斎會'}),
     Object.freeze({field:'name', value:'“個性”消失弾'})
    ])
   }])
  })
 }),
 'MHA-1-003':Object.freeze({
  ready:true, implementation:'dsl',
  passiveBonuses:Object.freeze([Object.freeze({
   bp:1000,
   condition:Object.freeze({
    kind:'ownActivateMainAtLeast', turn:'any', zone:'field', min:3
   })
  })])
 }),
 'MHA-1-004':Object.freeze({
  ready:true, implementation:'dsl', printedImpact:1,
  handEnergyWhileActivateMain:Object.freeze({min:3, amount:3}),
  mainAbility:Object.freeze({
   op:'gainSameLineMains', oncePerTurn:true,
   excludeNames:Object.freeze(['オール・フォー・ワン'])
  })
 }),
 'MHA-1-005':Object.freeze({
  ready:true, implementation:'dsl', ownTurnBp:2000,
  battleRequiresAnyName:Object.freeze(['オール・フォー・ワン','死柄木 弔']),
  mainAbility:Object.freeze({
   op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
   then:Object.freeze([Object.freeze({op:'grantSelfAttackDamageThisTurn', amount:2})])
  })
 }),
 'MHA-1-006':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({op:'payHandMoveOrSwap', oncePerTurn:true, pay:1})
 }),
 'MHA-1-007':Object.freeze({
  ready:true, implementation:'dsl', printedImpact:1, battleLoseToHand:'ownTurn'
 }),
 'MHA-1-009':Object.freeze({
  ready:true, implementation:'dsl', battleRemoveInstead:true,
  mainAbility:Object.freeze({op:'payHandGrantImpact', oncePerTurn:true, pay:1, amount:1}),
  triggerEffect:Object.freeze({
   op:'deployOutsideCharacter', color:'purple', maxEnergy:2, ap:1, frontOnly:true
  })
 }),
 'MHA-1-010':Object.freeze({
  ready:true, implementation:'dsl', raidName:'死柄木 弔', battleRemoveInstead:true,
  mainAbility:Object.freeze({
   op:'frontOnceProgram', frontOnly:true, oncePerTurn:true,
   then:Object.freeze([{op:'removeOppFrontUnderBp', bp:2000}])
  })
 }),
 'MHA-1-011':Object.freeze({
  ready:true, implementation:'dsl', blockSkipsNextActive:true,
  mainAbility:Object.freeze({
   op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
   then:Object.freeze([Object.freeze({op:'grantSelfMustBlockThisTurn'})])
  })
 }),
 'MHA-1-008':vanilla,
 'MHA-1-012':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({
   op:'restSelfGainEnergyRetireEndMain', lines:'field', oncePerTurn:true, extraEnergy:1
  })
 }),
 'MHA-1-013':play(Object.freeze([{
  op:'optionalOwnLifeToHandThenDraw',
  then:Object.freeze([{op:'activeOwnOther', optional:true, line:'front'}])
 }])),
 'MHA-1-014':Object.freeze({
  ready:true, implementation:'dsl', raidName:'荼毘',
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'optionalOwnLifeToHandThenDraw',
   then:Object.freeze([{op:'retireOppFrontUnderBp', bp:3500, optional:true}])
  }])})
 }),
 'MHA-1-015':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onRetire:Object.freeze([{op:'draw', count:1}])})
 }),
 'MHA-1-016':Object.freeze({ready:true, implementation:'dsl', activeExtraEnergy:1}),
 'MHA-1-017':Object.freeze({
  ready:true, implementation:'dsl', raidName:'トゥワイス',
  effects:Object.freeze({onPlay:Object.freeze([{op:'deployRaidBottomActive', optional:true}])})
 }),
 'MHA-1-018':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({
   op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
   then:Object.freeze([{op:'grantSelfAttackWinDrawThisTurn'}])
  })
 }),
 'MHA-1-019':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({
   op:'frontOnceProgram', frontOnly:true, oncePerTurn:true,
   then:Object.freeze([{
    op:'enemyBpDown', bp:1000, optional:false, minBp:1500, zone:'front'
   }])
  })
 }),
 'MHA-1-020':Object.freeze({
  ready:true, implementation:'dsl', raidHostAny:true,
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'revealTopHandOutsideUnlessRaid'
  }])})
 }),
 'MHA-1-021':Object.freeze({
  ready:true, implementation:'dsl',
  opponentFieldColorsHandEnergyDiscount:Object.freeze({colors:Object.freeze(['green','red']), amount:1})
 }),
 'MHA-1-022':play(Object.freeze([{op:'bounceOwnOtherUnderEnergy', energy:1}])),
 'MHA-1-023':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({
   op:'frontOnceNameBuff', frontOnly:true, oncePerTurn:true,
   name:'ジェントル・クリミナル', bp:1000, namedBp:2000, sniper:true
  })
 }),
 'MHA-1-024':vanilla,
 'MHA-1-025':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'searchTopOneBottomDiscard', count:4,
   groups:Object.freeze([
    Object.freeze({logic:'all', filters:Object.freeze([
     Object.freeze({field:'trait', value:'死穢八斎會'}),
     Object.freeze({field:'type', value:'character'})
    ])}),
    Object.freeze({logic:'all', filters:Object.freeze([
     Object.freeze({field:'name', value:'エリ'})
    ])})
   ])
  }])})
 }),
 'MHA-1-026':Object.freeze({
  ready:true, implementation:'dsl', raidName:'オーバーホール', printedImpact:1,
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({
   op:'millUpToThenRecover', count:3, optional:true,
   recover:Object.freeze({
    zone:'outside', max:1, optional:true, excludeName:'オーバーホール',
    anyOf:Object.freeze([
     Object.freeze({field:'trait', value:'死穢八斎會'}),
     Object.freeze({field:'name', value:'エリ'})
    ])
   })
  })])})
 }),
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
 'MHA-1-029':Object.freeze({
  ready:true, implementation:'dsl',
  playRequiresOwnName:'オーバーホール',
  triggerEffect:Object.freeze({op:'retireOppFront'}),
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'restOppFrontStripLock', optional:true
  }])})
 }),
 'MHA-1-032':play(Object.freeze([{op:'recoverAp', count:2}])),
 'MHA-1-034':Object.freeze({ready:true, implementation:'dsl', activeExtraEnergy:1}),
 'MHA-1-036':Object.freeze({ready:true, implementation:'dsl', step:true}),
 'MHA-1-037':Object.freeze({
  ready:true, implementation:'dsl',
  opponentFieldColorsHandEnergyDiscount:Object.freeze({colors:Object.freeze(['purple','red']), amount:1})
 }),
 'MHA-1-038':Object.freeze({
  ready:true, implementation:'dsl',
  facedownKeywordThresholds:Object.freeze([
   Object.freeze({atLeast:2, keyword:'doubleBlock'}),
   Object.freeze({atLeast:4, keyword:'doubleAttack'})
  ]),
  mainAbility:Object.freeze({
   op:'onceTuckFacedown', oncePerTurn:true, from:'deckTop', host:'self', count:1
  })
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
 'MHA-1-048':Object.freeze({
  ready:true, implementation:'dsl',
  oppEffectLeave:Object.freeze({
   turn:'opponent', oncePerTurn:true, instead:'stay',
   cause:'characterOrEvent', subject:'self', line:'any'
  }),
  effects:Object.freeze({onPlay:Object.freeze([{op:'reorderOwnLife', optional:true}])})
 }),
 'MHA-1-049':vanilla,
 'MHA-1-050':Object.freeze({
  ready:true, implementation:'dsl', printedHandEnergyDiscount:1,
  blockBpRestriction:Object.freeze({relation:'atMost', bp:3000, condition:null}),
  triggerEffect:Object.freeze({op:'deployHandCharacter', color:'green', maxEnergy:2, ap:1})
 })
});
