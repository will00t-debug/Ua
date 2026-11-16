// Four Japanese-checked RNK prints. Shared Universal V2 ops only.
const names=Object.freeze(['緋村 剣心','斎藤 一','相楽 左之助']);
export const RNK_PROGRAMS_SHARED_NEXT=Object.freeze({
 'RNK-1-037':Object.freeze({
  ready:true,implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({
   op:'mayShiftOwnCharacter',optional:true,names
  })])})
 }),
 'RNK-1-095':Object.freeze({
  ready:true,implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([
   Object.freeze({op:'buffNamedImpact',name:'相楽 左之助',bp:1500,impact:1,duration:'turn',upTo:1}),
   Object.freeze({op:'draw',count:1})
  ])})
 }),
 'RNK-1-112':Object.freeze({
  ready:true,implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([Object.freeze({op:'placeHandOnDeckTop'})])})
 }),
 'RNK-1-113':Object.freeze({
  ready:true,implementation:'dsl',
  effects:Object.freeze({onAttack:Object.freeze([Object.freeze({op:'optionalDrawSkipNextActive'})])})
 })
});
