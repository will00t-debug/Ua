// UA17 Toriko on the shared V2 engine. The catalogue holds every playable
// identity. This pack registers only prints whose entire Japanese text is a
// tested shared program. There is no Toriko opcode and no private runtime.
import {createUniversalPack} from './pack.mjs?v=20261119trk5';
import {TORIKO_CARDS} from '../toriko-cards.mjs?v=20261119trk5';
import {trkEngineKind,trkProfile} from './trk-classify.mjs?v=20261119trk5';

export function trkPackCard(card){
 const profile=trkProfile(card);
 const kind=profile?.kind||null;
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 if(!kind)throw Error(card.id+' is catalogue-only');
 if(kind==='handDiscount'){
  const printed=profile.handDiscount;
  if(JSON.stringify(printed)!==JSON.stringify(card.handDiscount))
   throw Error(card.id+' hand discount drifted from the Japanese print');
 }
 const search=kind==='search'?[{op:'searchTopOneBottomDiscard',count:profile.count,
  ...(profile.filter?{filter:profile.filter}:{}),
  ...(profile.filters?{filters:profile.filters,logic:profile.logic}:{}),
  ...(profile.excludeName?{excludeName:profile.excludeName}:{})}]:null;
 const onPlay=kind==='drawDiscard'?[{op:'drawDiscard',count:1}]:
  kind==='buffOther'?[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:true}]:
  kind==='recoverAp2'?[{op:'recoverAp',count:2}]:
  kind==='bounce'?[{op:'bounceOwnOtherUnderEnergy',energy:1}]:
  kind==='topKeep'||kind==='alsoTopKeep'?[{op:'inspectTopAnyOutside',count:2,rest:'top'}]:
  kind==='enemyDown'?[{op:'enemyBpDown',bp:1000,optional:true,zone:'front'}]:
  kind==='enemyDownFront1500'?[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,zone:'front'}]:
  kind==='enemyDownField1500'?[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,zone:'field'}]:
  search?search:
  kind==='draw4'?[{op:'drawDiscard',count:4,discardCount:1}]:
  kind==='outsideBlueIngredient'?[{op:'recoverOutsideFiltered',optional:true,max:1,
   color:'blue',trait:'食材'}]:
  kind==='gatedRestToriko'?[{op:'ifLiveThen',when:{kind:'ownNameExists',turn:'any',
   zone:'field',excludeSelf:false,name:'トリコ'},
   then:[{op:'restOppFrontUnderBp',bp:3000,optional:true}]}]:
  kind==='revealFourKings'?[{op:'revealTopTraitHandElseTop',trait:'美食四天王'}]:
  kind==='parasiteOutside'?[{op:'inspectTopTraitOutside',count:5,trait:'寄生昆虫',rest:'bottom'}]:
  kind==='lockMove'?[{op:'grantOppCannotMove',optional:true,zone:'field'}]:
  kind==='alsoPeek'?[{op:'peekTopOrBottom'}]:
  kind==='optionalOppDiscard'?[{op:'discardGate',optional:true,
   then:[{op:'discardOppHand',count:1}]}]:
  kind==='namedBuffAp'?[
   {op:'buffOwnField',filter:{field:'type',value:'character'},bp:2000,optional:true,excludeSelf:false},
   {op:'ifLiveThen',when:{kind:'ownAnyNameExists',turn:'any',zone:'field',excludeSelf:false,
    names:['トリコ','テリークロス']},then:[{op:'recoverAp',count:1}]}]:
  kind==='sunnyRest'?[{op:'oppFrontRestBranch',optional:false,name:'サニー',base:'rest',instead:'restSkipDraw'}]:
  kind==='cocoRetireAp'?[
   {op:'retireOppFrontUnderBp',bp:3000},
   {op:'ifLiveThen',when:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'ココ'},
    then:[{op:'recoverAp',count:1}]}]:
  kind==='sunnyDuration'?[
   {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:false,excludeSelf:false,untilName:'サニー'},
   {op:'draw',count:1}]:
  kind==='cocoDamage'?[
   {op:'buffOwnField',filter:{field:'type',value:'character'},bp:2000,optional:false,excludeSelf:false,damagePlusIfName:'ココ'},
   {op:'draw',count:1}]:
  kind==='zebraDraw'?[
   {op:'buffOwnField',filter:{field:'type',value:'character'},bp:2000,optional:false,excludeSelf:false,drawIfName:'ゼブラ'},
   {op:'draw',count:1}]:
  kind==='immuneAura'?[{op:'draw',count:1},{op:'grantOwnFieldBpDownImmuneUntilNextOwnStart'}]:
  kind==='komatsuBuff'?[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,
   optional:true,excludeSelf:true,fieldBonusName:'小松',fieldBonusBp:2000}]:
  kind==='torikoBounce'?[{op:'bounceOrRetireFrontByName',bp:5000,name:'トリコ'}]:
  kind==='rainbowFruit'?[
   {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:false,
    zone:'front',impactPlus:1},
   {op:'ifLiveThen',when:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'小松'},
    then:[{op:'draw',count:1}]}]:
  kind==='parasiteImpact'?[{op:'grantOtherImpactThisTurn',trait:'寄生昆虫',orName:'トミーロッド',
   amount:1,optional:true,plus:true,includeSelf:true}]:
  kind==='starjunRetire'?[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'スタージュン',bonusBp:5000}]:
  kind==='handRetire'?[{op:'retireOppFrontUnderBp',bp:3000,handAtMost:{atMost:3,bp:5000,other:true}}]:
  kind==='queenTax'?[{op:'grantNamedSelectHandTax',name:'サニー',optional:true,zone:'field',count:1}]:
  kind==='cocoRaid'?[{op:'restOppFrontUnderBp',bp:4000,optional:true,skipNextActive:true}]:
  kind==='kingsDeploy'?[{op:'deployOutsideFiltered',trait:'美食四天王',count:1,ready:false,
   optional:true,maxEnergy:3,color:'yellow',ap:1,excludeName:'トリコ'}]:
  kind==='feast'?[
   {op:'retireOppFrontUnderBp',bp:3000,bonusNames:['トリコ','ココ','サニー','ゼブラ'],bonusBp:5000,bonusAll:true},
   {op:'ifLiveThen',when:{kind:'ownFieldHasAllNames',turn:'any',zone:'front',excludeSelf:false,
    names:['トリコ','ココ','サニー','ゼブラ']},
    then:[{op:'mayDiscardActiveFrontBuff',count:2,bp:1000}]}]:
  kind==='beatPunch'?[
   {op:'buffOwnField',filter:{field:'type',value:'character'},bp:2000,optional:false,excludeSelf:false,
    oppMustBlockIfName:'ゼブラ'},
   {op:'draw',count:1}]:
  kind==='aimaruTax'?[{op:'grantOtherSelectionApTax',optional:true,line:'front',excludeSelf:true}]:
  kind==='jiro'?[{op:'discardGate',optional:true,then:[{op:'grantFrontAttackBlockBan',optional:true,
   until:'nextOppAttackEnd'}]}]:
  kind==='yosaku'?[{op:'sumDiscardRecoverMinEnergy',min:20,minEnergy:5}]:
  kind==='komatsuAct'?[{op:'drawDiscard',count:1}]:
  kind==='setsuno'?[{op:'discardGate',optional:true,then:[{op:'activeOwnName',name:'次郎',optional:true}]}]:
  kind==='knocking'?[
   {op:'grantFrontAttackBlockBan',optional:true,until:'nextOppAttackEnd'},
   {op:'ifLiveThen',when:{kind:'ownAnyNameExists',turn:'any',zone:'field',excludeSelf:false,
    names:['次郎','鉄平']},then:[{op:'draw',count:1}]}]:
  kind==='ozone'?[
   {op:'draw',count:2},
   {op:'deployOwnHandRestOrRaid',type:'character',color:null,maxEnergy:null,ap:1,max:1,
    optional:true,names:['トリコ'],requireAffordableEnergy:true},
   {op:'deployOwnHandRestOrRaid',type:'character',color:null,maxEnergy:null,ap:1,max:1,
    optional:true,names:['小松'],requireAffordableEnergy:true}]:
  kind==='mite'?[{op:'millIfEnteredFromOutside',count:2}]:
  kind==='emperor'?[{op:'outsideEntryTraitDown',trait:'寄生昆虫',min:3,bp:2000}]:
  kind==='starterKomatsu'?[{op:'ifLiveThen',when:{kind:'ownNameExists',turn:'any',zone:'field',
   excludeSelf:false,name:'トリコ'},
   then:[{op:'nextEligibleHandPlayApDiscount',filter:{trait:'食材'}}]}]:
  kind==='starterToriko'?[{op:'inspectTopTraitOutside',count:7,trait:'食材',rest:'bottom',to:'hand'}]:
  kind==='showcase'?[{op:'inspectTopTraitOutside',count:7,name:'センチュリースープ',rest:'bottom'}]:
  kind==='starjunRaid'?[{op:'discardGate',optional:true,then:[{op:'retireOppFrontUnderBp',bp:3000,optional:true}]}]:
  kind==='mitora'?[{op:'retireOppFrontUnderBp',bp:5000,optional:true}]:
  kind==='grin'?[{op:'mayMoveOppLowGenToFront',maxGen:1,optional:true,once:'name',discard:1}]:
  kind==='raidToriko'?[{op:'activeOwnOne',optional:true,excludeSelf:true}]:
  kind==='gtRobot'?[{op:'ifLiveThen',when:{kind:'ownEffectHandToOutside',turn:'any'},
   then:[{op:'draw',count:1}]}]:
  null;
 const onRetire=kind==='purpleToriko'?[{op:'deployOutsideActiveFront',color:'purple',maxEnergy:3,ap:1,
  names:['スタージュン','ココ','サニー','ゼブラ'],optional:true}]:
  kind==='gtRobot'?[{op:'returnRaidBottomToHand'}]:null;
 const onBlock=kind==='cocoRaid'?[{op:'ifLiveThen',when:{kind:'ownNameExists',turn:'any',zone:'front',
  excludeSelf:false,name:'キッス'},then:[{op:'enemyBpDown',bp:500,minBp:1000,optional:true,zone:'front'}]}]:null;
 const onAttack=kind==='attackBuff500'?[{op:'buffOwnField',filter:{field:'type',value:'character'},
  bp:500,optional:true,excludeSelf:true}]:
  kind==='attackFourKingsDraw'?[{op:'discardGate',optional:true,
   payment:{zone:'hand',field:'trait',value:'美食四天王'},
   then:[{op:'draw',count:1}]}]:
  kind==='alsoEnergySumDraw'?[{op:'ifLiveThen',when:{kind:'ownRequiredEnergySumAtLeast',turn:'any',min:20},
   then:[{op:'draw',count:1}]}]:
  kind==='jiro'?[{op:'buffSelf',bp:1000}]:
  kind==='raidToriko'?[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,
   optional:true,excludeSelf:false,impactPlusIfNames:['スタージュン','ココ','サニー','ゼブラ']}]:
  kind==='halfBounce'?[{op:'bounceOppFrontHalfSelfBp'}]:
  null;
 const namesOn=(zone,names)=>({kind:'ownFieldHasAllNames',turn:'any',zone,excludeSelf:false,names});
 const passive=kind==='threeNamesBlock'?[
  {condition:namesOn('field',['トリコ','ココ','ゼブラ']),bp:500},
  {condition:namesOn('front',['トリコ','ココ','ゼブラ']),doubleBlock:true}]:
  kind==='threeNamesDamage'?[
   {condition:{...namesOn('field',['トリコ','ココ','サニー']),turn:'own'},bp:1000},
   {condition:{...namesOn('front',['トリコ','ココ','サニー']),turn:'own'},attackDamage:2}]:
  kind==='stepNamedBp'?[{condition:{kind:'ownNameExists',turn:'any',zone:'front',excludeSelf:false,
   name:'テリークロス'},bp:1000}]:
  kind==='ingredientImpact'?[{condition:{kind:'ownTraitUsedThisTurn',turn:'own',trait:'食材'},impact:1}]:
  kind==='alsoEnergySumBp'?[{condition:{kind:'ownRequiredEnergySumAtLeast',turn:'own',min:15},bp:1000}]:
  kind==='kingsDeploy'?[{condition:{kind:'ownFieldHasAllNames',turn:'any',zone:'front',excludeSelf:false,
   names:['ココ','サニー','ゼブラ']},impact:1}]:
  kind==='giantParasite'?[{condition:{kind:'ownTraitOutsideRemovedAtLeast',turn:'any',trait:'寄生昆虫',min:3},bp:500}]:
  kind==='starterToriko'?[{condition:{kind:'ownTraitUsedThisTurn',turn:'own',trait:'食材'},attackDamage:2}]:
  kind==='halfBounce'?[{condition:{logic:'all',turn:'own',checks:[
   {kind:'ownTraitUsedThisTurn',turn:'own',trait:'食材'},
   {kind:'selfCurrentBpAtLeast',turn:'any',minBp:8000}]},attackDamage:2}]:
  kind==='gtRobot'?[{condition:{kind:'raidUnderPrintedBpAtLeast',turn:'own',minBp:3000},bp:500}]:
  null;
 const mainAbility=kind==='mainDiscardBuff'?{op:'discardHandBuffSelf',oncePerTurn:true,
  discardCount:1,bp:1000}:
  kind==='restReturn'?{op:'restBuffOtherReturnHand',bp:1000,optional:true}:
  kind==='frontDiscardDown'?{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,then:[{op:'enemyBpDown',bp:1000,optional:false,zone:'front'}]}]}:
  kind==='kissFront'?{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'enemyBpDown',bp:1000,minBp:1500,optional:false,zone:'front'}]}:
  kind==='printedEnergyRetire'?{op:'restSelfGeneratedEnergyRetireEndMain',lines:'field',
   oncePerTurn:true,extraEnergy:1}:
  kind==='komatsuAct'?{op:'restSelfBuffOther',bp:1000}:
  kind==='spices'?{op:'restDiscardNextTraitAp',trait:'食材',amount:1,once:'name'}:
  kind==='hq'?{op:'restDiscardGrantAttackDraw',trait:'美食會'}:
  kind==='starterKomatsu'?{op:'restIfTraitUsedDrawDiscard',trait:'食材'}:
  kind==='showcase'?{op:'restRetireRecoverOutside',optional:true,filter:{field:'name',value:'センチュリースープ'}}:
  kind==='zebraWin'?{op:'onceBuffFieldCharacter',bp:1000,oncePerTurn:true}:
  kind==='tommyrod'?{op:'discardDeployOutsideRest',trait:'寄生昆虫',oncePerTurn:true,max:1}:
  null;
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'?'vanilla':'dsl',
  effects:{...(onPlay?{onPlay}:{}),...(onAttack?{onAttack}:{}),
   ...(onBlock?{onBlock}:{}),...(onRetire?{onRetire}:{})},
  ...(mainAbility?{mainAbility}:{}),
  ...(profile.triggerEffect?{triggerEffect:profile.triggerEffect}:{}),
  ...(passive?{passiveBonuses:passive}:{}),
  ...(kind==='alsoPeek'||kind==='alsoTopKeep'||kind==='alsoEnergySumBp'||kind==='alsoEnergySumDraw'||kind==='yosaku'?{alsoRequiredEnergy:5}:{}),
  ...(kind==='impactNull'||kind==='alsoEnergySumBp'||kind==='queenTax'?{impactNull:true}:{}),
  ...(kind==='step'||kind==='stepNamedBp'?{step:true}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='doubleBlock'?{readyOnBlockCount:1}:{}),
  ...(kind==='printedImpact'||kind==='frontApImpact'?{printedImpact:1}:{}),
  ...(kind==='frontApImpact'?{handApDiscountWhileFrontName:{name:'トリコ',amount:1}}:{}),
  ...(kind==='kissFront'?{handApDiscountWhileFrontName:{name:'ココ',amount:1},
   blockBpRestriction:{relation:'atMost',bp:2000,condition:null}}:{}),
  ...(kind==='queenTax'?{handApDiscountWhileFrontName:{name:'サニー',amount:1}}:{}),
  ...(kind==='cocoRaid'?{raidName:'ココ',bpDownImmune:true,staticBp:500}:{}),
  ...(kind==='ichiryu'||kind==='jiro'?{handEnergyWhileRequiredSum:{min:25,amount:7}}:{}),
  ...(kind==='ichiryu'?{enterAlwaysActive:true,fewerReadyFrontWake:true}:{}),
  ...(kind==='setsuno'?{handEnergyWhileAnyNames:{names:['一龍','次郎'],amount:1},
   selectionApTax:{amount:1,turn:'opponent'}}:{}),
  ...(kind==='spices'||kind==='hq'?{enterAlwaysActive:true}:{}),
  ...(kind==='mite'||kind==='giantParasite'||kind==='emperor'?{retireToRemoved:true}:{}),
  ...(kind==='purpleToriko'||kind==='mitora'||kind==='zebraWin'?{printedAttackDamage:2}:{}),
  ...(kind==='sunnyMust'?{raidName:'サニー',readyOnBlockCount:1,
   attackWinDraw:{count:1},frontMustAttackIfName:{name:'クイン'}}:{}),
  ...(kind==='zebraWin'?{raidName:'ゼブラ',attackWinHandRest:{minBp:5000,restBp:3000}}:{}),
  ...(kind==='halfBounce'?{raidName:'トリコ'}:{}),
  ...(kind==='gtRobot'?{raidTrait:'美食會'}:{}),
  ...(kind==='tommyrod'?{raidName:'トミーロッド',oppEffectRetireInstead:{
   trait:'寄生昆虫',line:'front',turn:'opponent',oncePerTurn:true}}:{}),
  ...(kind==='mitora'?{handEnergyWhileSoleCard:{amount:7}}:{}),
  ...(kind==='raidToriko'?{raidName:'トリコ'}:{}),
  ...(kind==='grin'?{bpDownImmune:true}:{}),
  ...(kind==='starjunRaid'?{raidName:'スタージュン',unblockedAttack:{optional:false,then:[{op:'draw',count:1}]}}:{}),
  ...(kind==='starterToriko'?{raidName:'トリコ'}:{}),
  ...(kind==='komatsuAct'?{energyWakeIfTrait:{trait:'食材',line:'energy',oncePerTurn:true}}:{}),
  ...(kind==='handDiscount'?{opponentFieldColorsHandEnergyDiscount:card.handDiscount}:{})
 };
}

export const TORIKO_ENGINE_IDS=Object.freeze(
 TORIKO_CARDS.filter(card=>trkEngineKind(card)).map(card=>card.id));

export function createTrkV2Pack(){
 const cards=TORIKO_CARDS.filter(card=>card.engineKind).map(trkPackCard);
 if(cards.length!==TORIKO_ENGINE_IDS.length)
  throw Error('Toriko registered count drifted');
 return createUniversalPack({id:'toriko',version:'trk-ua17-shared-20261119e',cards});
}
