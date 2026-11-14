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
 })
});
