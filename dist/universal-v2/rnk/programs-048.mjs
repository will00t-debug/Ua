// Pure Universal V2 AP discount, shared across titles. No RNK-specific runtime.
// The first next ELIGIBLE hand use consumes the grant; nonmatching hand use does not.
export const RNK_PROGRAMS_048=Object.freeze({
 'RNK-1-048':Object.freeze({
  ready:true,implementation:'dsl',enterAlwaysActive:true,
  effects:Object.freeze({onPlay:Object.freeze([
   Object.freeze({op:'nextEligibleHandPlayApDiscount',filter:Object.freeze({
    cardType:'character',name:'斎藤 一',printedRequiredEnergyAtMost:3
   })})
  ])})
 })
});
