// C group programs for EX06BT MHA-2-037 through MHA-2-073.
// A card is ready only when the whole printed sentence is an existing
// shared operation. MHA-2-001 through 036 are not in this file.
// Pending cards stay in requests-2-037-073.mjs and out of this object.

export const MHA2_PROGRAMS_037_073=Object.freeze({
 'MHA-2-052':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'searchTopOneBottomDiscard', count:4, logic:'all',
   filters:Object.freeze([
    Object.freeze({field:'type', value:'character'}),
    Object.freeze({field:'printedRequiredEnergyAtMost', value:3})
   ])
  }])}),
  notes:'看牌頂 4 張。公開最多 1 張必要能源 3 以下的角色到手牌，其餘放牌底。有拿才棄 1 張手牌到場外。不能拿的牌留在畫面上。'
 }),
 'MHA-2-055':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'searchTopOneBottomDiscard', count:4, logic:'all',
   filters:Object.freeze([
    Object.freeze({field:'type', value:'character'}),
    Object.freeze({field:'printedRequiredEnergyAtLeast', value:4})
   ])
  }])}),
  notes:'看牌頂 4 張。公開最多 1 張必要能源 4 以上的角色到手牌，其餘放牌底。有拿才棄 1 張手牌到場外。不能拿的牌留在畫面上。'
 }),
 'MHA-2-063':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'searchTopOneBottomDiscard', count:4, logic:'all',
   filters:Object.freeze([
    Object.freeze({field:'type', value:'character'}),
    Object.freeze({field:'printedBpAtMost', value:3500})
   ])
  }])}),
  notes:'看牌頂 4 張。公開最多 1 張印刷 BP 3500 以下的角色到手牌，其餘放牌底。有拿才棄 1 張手牌到場外。Q1010：看卡面印刷 BP，不看當下 BP。不能拿的牌留在畫面上。'
 }),
 'MHA-2-041':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'optionalPayApThen', ap:1, optional:true,
   then:Object.freeze([{
    op:'chooseOne', optional:false,
    options:Object.freeze([
     Object.freeze({id:'retire', label:'退場', turn:'any', then:Object.freeze([
      Object.freeze({op:'retireOppFrontOneUnderBp', bp:2500, optional:true})
     ])}),
     Object.freeze({id:'draw', label:'抽2', turn:'any', then:Object.freeze([
      Object.freeze({op:'draw', count:2})
     ])})
    ])
   }])
  }])}),
  notes:'登場時可付 1 AP。付了才二選一：退場最多 1 張 BP 2500 以下的對手前排，或抽 2。不付就沒有後續。'
 }),
 'MHA-2-039':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onAttack:Object.freeze([{op:'drawDiscard', count:1}])}),
  notes:'攻擊時抽 1，再把自己的 1 張手牌放到場外。沒有其他句子。'
 }),
 'MHA-2-045':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({
   op:'oncePayProgram', oncePerTurn:true, frontOnly:false, raidOnly:false,
   payAp:0, requiresOwnName:null,
   then:Object.freeze([{
    op:'discardGate', optional:false, count:2,
    then:Object.freeze([Object.freeze({op:'grantSelfSniperThisTurn', maxBp:3000})])
   }])
  }),
  notes:'每回合一次，付 2 張手牌後本回合獲得狙擊，而且不能指定 BP 3000 以上。前排與能量列都能發動。'
 }),
 'MHA-2-047':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onRetire:Object.freeze([{op:'draw', count:1}])}),
  notes:'退場時抽 1。特徵死穢八斎會是卡表，沒有寫進效果。'
 }),
 'MHA-2-049':Object.freeze({
  ready:true, implementation:'dsl',
  triggerEffect:Object.freeze({op:'retireOppFront'}),
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'retireOppFrontUnderBp', bp:3000, bonusName:'レディ・ナガン', bonusBp:5000
  }])}),
  notes:'必須退場 1 張目前 BP 3000 以下的對手前排。自己場上有〈レディ・ナガン〉時上限改成 5000。特殊觸發仍是退場對手前排 1 張。'
 }),
 'MHA-2-058':Object.freeze({
  ready:true, implementation:'dsl', ownTurnBp:1000,
  notes:'自己回合這張卡 BP+1000。對手回合不加。'
 }),
 'MHA-2-059':Object.freeze({
  ready:true, implementation:'dsl', emptyOwnFieldHandEnergyDiscount:2,
  notes:'自己場上沒有卡時，手牌必要能源 -2 綠。場上有卡、或從生命打出，都不減。'
 }),
 'MHA-2-060':Object.freeze({
  ready:true, implementation:'dsl',
  printedHandEnergyDiscount:2,
  passiveBonuses:Object.freeze([Object.freeze({
   extraEnergy:1,
   condition:Object.freeze({
    kind:'ownOtherRequiredEnergyAtLeast',turn:'any',zone:'field',
    excludeSelf:true,minEnergy:4,min:1
   })
  })]),
  notes:'手牌必要能源 -2 綠。生命區不減。自己場上另有必要能源 4 以上的角色時，發生能源 +1 綠。自己不算。'
 }),
 'MHA-2-061':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'buffOwnField', filter:Object.freeze({field:'type', value:'character'}),
   bp:1000, optional:true, excludeSelf:false
  }])}),
  notes:'登場時最多選自己場上 1 張角色，本回合 BP+1000。可以選自己，也可以不選。'
 }),
 'MHA-2-064':Object.freeze({
  ready:true, implementation:'vanilla',
  notes:'効果欄は「-」。ドロートリガーはカード表の trigger。'
 }),
 'MHA-2-065':Object.freeze({
  ready:true, implementation:'dsl', impactNull:true,
  notes:'只有衝擊無效。與這張卡戰鬥的角色在這場戰鬥中失去衝擊。'
 }),
 'MHA-2-071':Object.freeze({
  ready:true, implementation:'dsl', step:true,
  notes:'只有移步：自己的移動階段可從前排移到能量列。'
 }),
 'MHA-2-073':Object.freeze({
  ready:true, implementation:'dsl', emptyOwnFieldHandEnergyDiscount:2,
  notes:'自己場上沒有卡時，手牌必要能源 -2 紅。場上有卡、或從生命打出，都不減。'
 }),
 'MHA-2-037':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([
   Object.freeze({
    op:'searchTopOneBottomDiscard', count:4, logic:'any', discard:false,
    filters:Object.freeze([
     Object.freeze({field:'name', value:'緑谷 出久'}),
     Object.freeze({field:'trait', value:'ワン・フォー・オール'})
    ])
   }),
   Object.freeze({op:'recoverAp', count:1})
  ])}),
  notes:'看牌頂 4 張。公開最多 1 張綠谷或ワン・フォー・オール到手牌，其餘放牌底。不棄手牌。之後最多活動 1 張 AP。沒拿到也問 AP。不能拿的牌留在畫面上。'
 }),
 'MHA-2-043':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({
   op:'searchTopOneBottomDiscard', count:4, logic:'any',
   filters:Object.freeze([
    Object.freeze({field:'name', value:'オール・フォー・ワン'}),
    Object.freeze({field:'name', value:'死柄木 弔'})
   ])
  })])}),
  mainAbility:Object.freeze({
   op:'restRetireThen',
   then:Object.freeze([Object.freeze({op:'drawDiscard', count:1})])
  }),
  notes:'看牌頂 4 張。公開最多 1 張〈オール・フォー・ワン〉或〈死柄木 弔〉到手牌，其餘放牌底。有拿才棄 1 張手牌到場外。起動：休息並退場自己，然後抽 1，再把 1 張手牌放到場外。'
 }),
 'MHA-2-044':Object.freeze({
  ready:true, implementation:'dsl',
  mainAbility:Object.freeze({op:'payApDraw', oncePerTurn:true, draw:1}),
  notes:'付 1 AP、每回合一次、只抽 1。不休息，也不加發生能源。'
 }),
 'MHA-2-048':Object.freeze({
  ready:true, implementation:'dsl',
  passiveBonuses:Object.freeze([Object.freeze({
   attackDamage:2,
   condition:Object.freeze({
    kind:'ownOutsideTraitCountAtLeast', turn:'any',
    trait:'死穢八斎會', min:6
   })
  })]),
  notes:'自己場外的死穢八斎會有 6 張以上時，這張角色獲得傷害 2。場上的自己不算。少於 6 張時沒有傷害 2。'
 }),
 'MHA-2-046':Object.freeze({
  ready:true, implementation:'dsl',
  raidName:'レディ・ナガン',
  effects:Object.freeze({onPlay:Object.freeze([
   Object.freeze({op:'grantSelfSniperThisTurn'})
  ])}),
  printedMains:Object.freeze([
   Object.freeze({op:'restSelfBpImpact', id:'restBp', bp:1000, impact:1, oncePerTurn:true}),
   Object.freeze({op:'restSelfAttackDraw', id:'restDraw', count:1, oncePerTurn:true}),
   Object.freeze({op:'handOutsideActive', id:'payActive', discard:1, repeat:true})
  ]),
  notes:'突襲〈レディ・ナガン〉並以活動狀態移到前排。登場時本回合獲得狙擊。三個起動：休息且每回合一次，BP+1000 與衝擊 1；休息且每回合一次，本回合攻擊時抽 1；付 1 張手牌到場外把這張卡活動，這一個沒有每回合一次。'
 }),
 'MHA-2-051':Object.freeze({
  ready:true, implementation:'dsl',
  step:true,
  frontEnergyWhen:Object.freeze({logic:'all', checks:Object.freeze([
   Object.freeze({kind:'ownFrontCountAtLeast', turn:'any', min:2})
  ])}),
  mainAbility:Object.freeze({op:'restBuffOtherReturnHand', bp:1000}),
  notes:'有移步。自己前排有其他角色時，這張卡在前排也產生能源。休息後選場上其他角色 BP+1000，再把自己回手。沒有每回合一次。只有自己在前排時，前排不產生能源。'
 }),
 'MHA-2-054':Object.freeze({
  ready:true, implementation:'dsl',
  oppFrontHandEnergy:Object.freeze({min:3, amount:4}),
  energyLineForbidden:true,
  conditionalImpactBpAtLeast:6000,
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({
   op:'ifLiveThen',
   when:Object.freeze({kind:'selfEnteredByOwnEffect', turn:'any'}),
   then:Object.freeze([Object.freeze({op:'buffSelf', bp:1000})])
  })])}),
  notes:'對手前排有 3 張以上角色時，手牌必要能源減 4，不減 AP，生命區不減。不能進能量列。當下 BP 6000 以上才有衝擊 1。自己的效果讓它登場時，本回合 BP+1000。付費登場不加。'
 }),
 'MHA-2-056':Object.freeze({
  ready:true, implementation:'dsl',
  passiveBonuses:Object.freeze([Object.freeze({
   attackDamage:2,
   condition:Object.freeze({kind:'selfCurrentBpAtLeast', turn:'any', minBp:5000})
  })]),
  effects:Object.freeze({onAttack:Object.freeze([Object.freeze({
   op:'ifLiveThen',
   when:Object.freeze({kind:'selfCurrentBpAtLeast', turn:'any', minBp:5000}),
   then:Object.freeze([Object.freeze({op:'grantSelfSkipNextActive'})])
  })])}),
  mainAbility:Object.freeze({op:'repeatHandOutsideBuff', discard:1, bp:1000}),
  notes:'當下 BP 5000 以上時傷害 2，而且攻擊時獲得下一次不活動。Q1009：那一次包含結束階段、開始階段，以及被活動效果指定。付 1 張手牌到場外則本回合 BP+1000，沒有每回合一次。'
 }),
 'MHA-2-057':Object.freeze({
  ready:true, implementation:'dsl',
  raidName:'通形 ミリオ',
  blockBpRestriction:Object.freeze({relation:'atMost', bp:3000, condition:null}),
  mainAbility:Object.freeze({
   op:'frontOnceEnergyChoice', frontOnly:true, oncePerTurn:true,
   minEnergy:4, bp:1000, impact:1
  }),
  effects:Object.freeze({onRetire:Object.freeze([
   Object.freeze({op:'returnOwnRaidBase', optional:true, max:1})
  ])}),
  notes:'突襲〈通形 ミリオ〉並以活動狀態移到前排。BP 3000 以下不能阻擋。前排每回合一次，給必要能源 4 以上的其他自己角色 BP+1000 或衝擊 1。退場時最多把 1 張突襲底板回手。'
 }),
 'MHA-2-050':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({
   op:'mayHandRestThenOppFrontRest', type:'character', color:'green',
   energy:3, ap:1, oppAp:1, skipOnPlay:true
  })])}),
  notes:'對手前排有空位時，可從手牌把必要能源 3 以下、AP 1 的綠角色橫置登場到自己場上。做到之後，對手可從手牌把 AP 1 角色橫置放到自己前排，也可以不放。兩邊這次登場的登場時都不發動。Q1007：對手手牌有合法角色時仍可拒絕。'
 }),
 'MHA-2-053':Object.freeze({
  ready:true, implementation:'dsl',
  raidName:'麗日 お茶子',
  effects:Object.freeze({onAttack:Object.freeze([Object.freeze({
   op:'chooseOne', optional:false, cardLock:true,
   options:Object.freeze([
    Object.freeze({id:'block', label:'對手前排 4000 到 5000 本回合不能阻擋', turn:'any',
     then:Object.freeze([Object.freeze({op:'grantOppFrontCannotBlockThisTurn',
      minBp:4000, maxBp:5000, max:1, optional:true})])}),
    Object.freeze({id:'bp', label:'自己本回合 BP+500', turn:'any',
     then:Object.freeze([Object.freeze({op:'buffSelf', bp:500})])})
   ])
  })])}),
  notes:'可突襲〈麗日 お茶子〉並活動移到前排。攻擊時二選一，這張實體卡這個回合選過的選項不能再選。另一張同名卡可以選同一個選項。選項是給當下 BP 4000 到 5000 的對手前排最多 1 張這個回合不能阻擋，或自己 BP+500。Q1008。'
 })
});
