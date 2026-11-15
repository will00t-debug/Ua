// Shared V2 DSL only; original Japanese source checked for each card.
export const RNK_PROGRAMS_SIMPLE_NEXT=Object.freeze({
 'RNK-1-046':Object.freeze({
  ready:true,implementation:'dsl',
  mainAbility:Object.freeze({op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1000}),
  effects:Object.freeze({})
 }),
 'RNK-1-064':Object.freeze({
  ready:true,implementation:'dsl',
  triggerEffect:Object.freeze({op:'retireOppFront'}),
  effects:Object.freeze({onPlay:Object.freeze([
    Object.freeze({op:'retireOppFrontUnderBp',bp:3000,bonusName:'斎藤 一',bonusBp:5000})
  ])})
 }),
 'RNK-1-092':Object.freeze({
  ready:true,implementation:'dsl',step:true,emptyOwnFieldHandEnergyDiscount:2,
  effects:Object.freeze({})
 }),
 'RNK-1-104':Object.freeze({
  ready:true,implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({op:'peekTopOrBottom'})])})
 })
});
