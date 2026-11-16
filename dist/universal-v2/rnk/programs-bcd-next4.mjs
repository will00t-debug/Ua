// Four B/C/D cards implemented entirely in existing Universal V2 DSL.
// For 049/083, lines:'field' permits front or energy as in other V2 titles.
const temporaryEnergy=Object.freeze({
 ready:true,implementation:'dsl',
 mainAbility:Object.freeze({
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1
 }),effects:Object.freeze({})
});
export const RNK_PROGRAMS_BCD_NEXT4=Object.freeze({
 'RNK-1-049':temporaryEnergy,
 'RNK-1-057':Object.freeze({
  ready:true,implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({
   op:'searchTopOneBottomDiscard',count:3,logic:'any',
   filters:Object.freeze([
    Object.freeze({field:'name',value:'志々雄 真実'}),
    Object.freeze({field:'name',value:'駒形 由美'}),
    Object.freeze({field:'trait',value:'十本刀'})
   ])
  })])})
 }),
 'RNK-1-083':temporaryEnergy,
 'RNK-1-108':Object.freeze({
  ready:true,implementation:'dsl',
  mainAbility:Object.freeze({op:'fieldRestDiscardDraw'}),
  effects:Object.freeze({})
 })
});
