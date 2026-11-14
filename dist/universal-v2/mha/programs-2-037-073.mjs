// C group programs for EX06BT MHA-2-037 through MHA-2-073.
// A card is ready only when the whole printed sentence is an existing
// shared operation. MHA-2-001 through 036 are not in this file.
// Pending cards stay in requests-2-037-073.mjs and out of this object.

export const MHA2_PROGRAMS_037_073=Object.freeze({
 'MHA-2-039':Object.freeze({
  ready:true, implementation:'dsl',
  effects:Object.freeze({onAttack:Object.freeze([{op:'drawDiscard', count:1}])}),
  notes:'攻擊時抽 1，再把自己的 1 張手牌放到場外。沒有其他句子。'
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
