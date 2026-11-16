// Remaining official-JP RNK identities, including the promo.
// New printed sentences are shared Universal V2 ops.
const kenshin='緋村 剣心',saito='斎藤 一',sano='相楽 左之助',aoshi='四乃森 蒼紫';
const seta='瀬田 宗次郎',shishio='志々雄 真実',yumi='駒形 由美';
const will='生きようとする意志',oath='不殺の誓い',ten='十本刀';
const freeze=v=>Array.isArray(v)?Object.freeze(v.map(freeze)):
 v&&typeof v==='object'?Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,freeze(x)]))):v;
const card=fields=>freeze({ready:true,implementation:'dsl',...fields});
const union={names:[shishio,yumi],trait:ten};
const lockText=true;
export const RNK_PROGRAMS_SHARED_REST=freeze({
 'RNK-1-010':card({
  triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500},
  mainAbility:{op:'energyBottomNamedFront',oncePerTurn:true,energyOnly:true,name:will,bp:1000}}),
 'RNK-1-011':card({
  raidName:kenshin,doubleAttackBpAtLeast:6000,
  mainAbility:{op:'namedUseBuffSelf',oncePerTurn:true,bp:1000,
   when:{kind:'ownNamedCardsUsedThisTurn',turn:'own',names:[will]}},
  effects:{onAttack:[{op:'drawUpToIfHandAtMost',maxHand:3,count:1}]}}),
 'RNK-1-018':card({
  raidName:aoshi,
  effects:{onPlay:[{op:'buffSelf',bp:1000}]},
  mainAbility:{op:'deployRaidSourceLocked'}}),
 'RNK-1-033':card({effects:{onPlay:[{op:'deployNamedLocked',name:aoshi,maxEnergy:2,ap:1}]}}),
 'RNK-1-038':card({
  emptyOwnFieldHandEnergyDiscount:2,
  triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true},
  effects:{onAttack:[{op:'optionalBounceUnionBuff',names:[kenshin,saito,sano],
   excludeSelfName:saito,bp:1500}]}}),
 'RNK-1-040':card({
  raidName:saito,printedImpact:1,
  effects:{onPlay:[{op:'traitlessFieldAttackKit',bp:1000}]}}),
 'RNK-1-044':card({effects:{onPlay:[
  {op:'optionalUnionDiscardEnterActive',...union},
  {op:'millRetireScale',step:1000}]}}),
 'RNK-1-050':card({effects:{
  onAttack:[{op:'lookFacedownToHand',count:1}],
  onBlock:[{op:'optionalRetireFrontTuck',bp:500}]}}),
 'RNK-1-054':card({
  raidName:'沢下条 張',
  effects:{onPlay:[{op:'optionalRevealUnionTopMoveGen',...union,maxGen:1}]}}),
 'RNK-1-056':card({moveTriggers:[{
  when:{from:'deck',to:'outside',reasons:['own-effect']},
  then:[{op:'optionalHandThenRestSelf',once:'name'}]}]}),
 'RNK-1-059':card({
  raidName:seta,
  moveTriggers:[{
   when:{from:'deck',to:'outside',reasons:['own-effect']},
   then:[{op:'optionalEnergyRaidSelf'}]}],
  effects:{onPlay:[{op:'nonHandEntryDrawImpact',draw:1,impact:1}]},
  mainAbility:{op:'raidTopToOwnDeck',frontOnly:true,scope:'name'}}),
 'RNK-1-071':card({
  passiveBonuses:[{extraEnergy:1,condition:{kind:'ownNameExists',turn:'any',zone:'front',
   excludeSelf:false,name:kenshin}}],
  mainAbility:{op:'entryTurnSelectTax',oncePerTurn:true,entryTurnOnly:true,name:kenshin,count:1}}),
 'RNK-1-076':card({ownTurnBp:1000,energyAttackEndDiscardSwap:lockText}),
 'RNK-1-077':card({
  raidName:sano,printedAttackDamage:2,impactNull:true,
  effects:{onAttackBlocked:[{op:'optionalRestNamedThenBattle',name:sano,bp:1000,impact:1}],
   onPlay:[{op:'draw',count:1}]}}),
 'RNK-1-089':card({
  enterAlwaysActive:true,
  effects:{onPlay:[{op:'drawDiscard',count:1}]},
  mainAbility:{op:'removeOutsideNamedAura',frontOnly:true,oncePerTurn:true,name:oath,loseName:kenshin}}),
 'RNK-1-099':card({
  playRequiresOwnName:sano,triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'retireOrRemoveFront',maxBp:5000,restName:sano}]}}),
 'RNK-1-103':card({
  enterAlwaysActive:true,effectRestWake:{line:'front',oncePerTurn:true},
  effects:{onPlay:[{op:'grantSelfMustBlockThisTurn'}]}}),
 'RNK-1-111':card({
  frontForbidden:true,ownEffectMoveOnly:true,
  effects:{onPlay:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]},
  mainAbility:{op:'discardMoveOtherLine',oncePerTurn:true,pay:2,name:kenshin}}),
 'RNK-P-001':card({allColors:true,effects:{onPlay:[{op:'recoverAp',count:2}]}})
});
