// Re:Zero first wave. The catalogue holds every UA40BT and UA40ST playable
// identity. This pack registers only prints whose entire Japanese text is an
// existing tested program. Partial prints stay in the catalogue.
import {createUniversalPack} from './pack.mjs';
import {REZERO_CARDS} from '../rezero-cards.mjs';

const PLAIN=new Set(['-','']);
export function rezeroEngineKind(effectJa){
 const e=String(effectJa||'');
 if(PLAIN.has(e))return 'plain';
 if(e==='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）')return 'step';
 if(e==='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）')return 'impactNull';
 if(e==='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。')return 'drawDiscard';
 if(e==='【登場時】カードを1枚引く。')return 'draw';
 if(e==='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。')return 'bounce';
 if(e==='このキャラがアクティブの場合、このキャラの発生エナジー+【黄】。'||
  e==='このキャラがアクティブの場合、このキャラの発生エナジー+【青】。'||
  e==='このキャラがアクティブの場合、このキャラの発生エナジー+【紫】。')return 'activeEnergy';
 if(e==='自分のAPカードを2枚まで選び、アクティブにする。')return 'recoverAp2';
 if(/^相手の場に.+か.+のカードがある場合、手札にあるこのカードの必要エナジーを【.+×1】減らす。$/.test(e))
  return 'handDiscount';
 return null;
}
function effectsFor(kind){
 if(kind==='drawDiscard')return {onPlay:[{op:'drawDiscard',count:1}]};
 if(kind==='draw')return {onPlay:[{op:'draw',count:1}]};
 if(kind==='bounce')return {onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]};
 if(kind==='recoverAp2')return {onPlay:[{op:'recoverAp',count:2}]};
 return {};
}
export function rezeroPackCard(card){
 const kind=rezeroEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 if(!kind)throw Error(card.id+' is catalogue-only');
 if(kind==='handDiscount'&&(
  !card.handDiscount||card.handDiscount.amount!==1||card.handDiscount.colors?.length!==2))
  throw Error(card.id+' hand discount is not two opposing colors');
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'||kind==='step'?'vanilla':'dsl',
  effects:effectsFor(kind),
  ...(kind==='step'?{step:true}:{}),
  ...(kind==='impactNull'?{impactNull:true}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='handDiscount'?{opponentFieldColorsHandEnergyDiscount:card.handDiscount}:{})
 };
}
export const REZERO_ENGINE_IDS=Object.freeze(
 REZERO_CARDS.filter(c=>c.engineKind).map(c=>c.id));
export function createRezeroV2Pack(){
 return createUniversalPack({
  id:'rezero',version:'rezero-ua40-set1-20261025',
  cards:REZERO_CARDS.filter(c=>c.engineKind).map(rezeroPackCard)
 });
}
