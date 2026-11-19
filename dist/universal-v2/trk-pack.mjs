// UA17 Toriko on the shared V2 engine. The catalogue holds every playable
// identity. This pack registers only prints whose entire Japanese text is a
// tested shared program. There is no Toriko opcode and no private runtime.
import {createUniversalPack} from './pack.mjs?v=20261119trk2';
import {TORIKO_CARDS} from '../toriko-cards.mjs?v=20261119trk2';
import {trkEngineKind,trkProfile} from './trk-classify.mjs?v=20261119trk2';

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
  null;
 const onAttack=kind==='attackBuff500'?[{op:'buffOwnField',filter:{field:'type',value:'character'},
  bp:500,optional:true,excludeSelf:true}]:
  kind==='attackFourKingsDraw'?[{op:'discardGate',optional:true,
   payment:{zone:'hand',field:'trait',value:'美食四天王'},
   then:[{op:'draw',count:1}]}]:
  null;
 const mainAbility=kind==='mainDiscardBuff'?{op:'discardHandBuffSelf',oncePerTurn:true,
  discardCount:1,bp:1000}:
  kind==='restReturn'?{op:'restBuffOtherReturnHand',bp:1000,optional:true}:
  null;
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'?'vanilla':'dsl',
  effects:{...(onPlay?{onPlay}:{}),...(onAttack?{onAttack}:{})},
  ...(mainAbility?{mainAbility}:{}),
  ...(profile.triggerEffect?{triggerEffect:profile.triggerEffect}:{}),
  ...(kind==='alsoPeek'||kind==='alsoTopKeep'?{alsoRequiredEnergy:5}:{}),
  ...(kind==='impactNull'?{impactNull:true}:{}),
  ...(kind==='step'?{step:true}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='doubleBlock'?{readyOnBlockCount:1}:{}),
  ...(kind==='printedImpact'?{printedImpact:1}:{}),
  ...(kind==='handDiscount'?{opponentFieldColorsHandEnergyDiscount:card.handDiscount}:{})
 };
}

export const TORIKO_ENGINE_IDS=Object.freeze(
 TORIKO_CARDS.filter(card=>trkEngineKind(card)).map(card=>card.id));

export function createTrkV2Pack(){
 const cards=TORIKO_CARDS.filter(card=>card.engineKind).map(trkPackCard);
 if(cards.length!==TORIKO_ENGINE_IDS.length)
  throw Error('Toriko registered count drifted');
 return createUniversalPack({id:'toriko',version:'trk-ua17-shared-20261119b',cards});
}
