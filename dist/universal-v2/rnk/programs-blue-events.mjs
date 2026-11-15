// Full JP-verified blue events, composed exclusively from Universal V2 operations.
// Separate the mandatory one-character choice from the optional AP recovery.
const namedBuff=(bp,optional)=>Object.freeze({
 op:'buffOwnField',filter:Object.freeze({field:'name',value:'緋村 剣心'}),
 bp,optional,excludeSelf:false
});
export const RNK_PROGRAMS_BLUE_EVENTS=Object.freeze({
 'RNK-1-030':Object.freeze({
  ready:true,implementation:'dsl',triggerEffect:Object.freeze({op:'retireOppFront'}),
  effects:Object.freeze({onPlay:Object.freeze([
   Object.freeze({op:'retireOppFrontUnderBp',bp:3000,bonusName:'比古 清十郎',bonusBp:5000}),
   Object.freeze({op:'ifLiveThen',when:Object.freeze({
    kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'比古 清十郎'
   }),then:Object.freeze([namedBuff(1000,true)])})
  ])})
 }),
 'RNK-1-032':Object.freeze({
  ready:true,implementation:'dsl',
  effects:Object.freeze({onPlay:Object.freeze([
   namedBuff(2000,false),
   Object.freeze({op:'recoverAp',count:1})
  ])})
 })
});
