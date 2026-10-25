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
 if(e==='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【黄×2】減らす。【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）')
  return 'emptyFieldStep';
 if(e==='【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【黄】と「メインフェイズ終了時、このキャラを退場させる。」を得る。'||
  e==='【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【青】と「メインフェイズ終了時、このキャラを退場させる。」を得る。'||
  e==='【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【紫】と「メインフェイズ終了時、このキャラを退場させる。」を得る。')
  return 'restEnergyRetire';
 if(e==='【自分のターン中】自分の場に〈フェルト〉がある場合、このキャラはBP+1000。')return 'feltTurnBp';
 if(e==='【自分のターン中】このターン中に自分がイベントカードを使用している場合、このキャラはBP+1000。')return 'eventTurnBp';
 if(e==='自分のフロントLに〈ナツキ・スバル〉がある場合、このキャラの発生エナジー+【青】。')return 'subaruFrontEnergy';
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
 const pip={yellow:'黄',blue:'青',purple:'紫'}[card.color];
 if(kind==='restEnergyRetire'&&!card.effectJa.includes('発生エナジー+【'+pip+'】'))
  throw Error(card.id+' generated color does not match the printed pip');
 if(kind==='emptyFieldStep'&&(card.energy<2||card.color!=='yellow'))
  throw Error(card.id+' empty-field discount is not yellow 2');
 if(kind==='subaruFrontEnergy'&&card.color!=='blue')
  throw Error(card.id+' Subaru energy is not blue');
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'||kind==='step'?'vanilla':'dsl',
  effects:effectsFor(kind),
  ...(kind==='step'||kind==='emptyFieldStep'?{step:true}:{}),
  ...(kind==='impactNull'?{impactNull:true}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='handDiscount'?{opponentFieldColorsHandEnergyDiscount:card.handDiscount}:{}),
  ...(kind==='emptyFieldStep'?{emptyOwnFieldHandEnergyDiscount:2}:{}),
  ...(kind==='restEnergyRetire'?{mainAbility:{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}}:{}),
  ...(kind==='feltTurnBp'?{passiveBonuses:[{
   condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'フェルト'},
   bp:1000}]}:{}),
  ...(kind==='eventTurnBp'?{passiveBonuses:[{
   condition:{kind:'ownEventUsedThisTurn',turn:'own'},bp:1000}]}:{}),
  ...(kind==='subaruFrontEnergy'?{passiveBonuses:[{
   condition:{kind:'ownNameExists',turn:'any',zone:'front',excludeSelf:false,name:'ナツキ・スバル'},
   extraEnergy:1}]}:{})
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
