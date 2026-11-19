// UA17 Toriko on the shared V2 engine. The catalogue holds every playable
// identity. This pack registers only prints whose entire Japanese text is a
// tested shared program. There is no Toriko opcode and no private runtime.
import {createUniversalPack} from './pack.mjs';
import {TORIKO_CARDS} from '../toriko-cards.mjs';
import {trkEngineKind,trkProfile} from './trk-classify.mjs';

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
 const onPlay=kind==='drawDiscard'?[{op:'drawDiscard',count:1}]:
  kind==='buffOther'?[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:true}]:
  kind==='recoverAp2'?[{op:'recoverAp',count:2}]:
  kind==='bounce'?[{op:'bounceOwnOtherUnderEnergy',energy:1}]:
  kind==='topKeep'?[{op:'inspectTopAnyOutside',count:2,rest:'top'}]:
  kind==='enemyDown'?[{op:'enemyBpDown',bp:1000,optional:true,zone:'front'}]:
  kind==='enemyDownFront1500'?[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,zone:'front'}]:
  kind==='enemyDownField1500'?[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,zone:'field'}]:
  null;
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'?'vanilla':'dsl',
  effects:onPlay?{onPlay}:{},
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
 return createUniversalPack({id:'toriko',version:'trk-ua17-shared-20261119',cards});
}
