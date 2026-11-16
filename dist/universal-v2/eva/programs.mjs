// EVA programs are shared Universal V2 DSL chosen from the full Japanese
// print. A sentence that is not an existing common profile stays out of the pack.
const norm=text=>String(text??'').replace(/\s+/g,'');
const EMPTY=new Set(['','-']);
const INK={yellow:'黄',purple:'紫',red:'赤',blue:'青',green:'緑'};
const STANDARD=Object.freeze({
 '':null,
 '【ドロー】カードを1枚引く。':'draw',
 '【ゲット】このカードを手札に加える。':'get',
 '【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。':'active',
 '【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。':'final'
});
const DISCOUNT=Object.freeze({
 yellow:Object.freeze({
  text:'相手の場に紫か赤のカードがある場合、手札にあるこのカードの必要エナジーを【黄×1】減らす。',
  colors:Object.freeze(['purple','red'])
 }),
 purple:Object.freeze({
  text:'相手の場に黄か赤のカードがある場合、手札にあるこのカードの必要エナジーを【紫×1】減らす。',
  colors:Object.freeze(['yellow','red'])
 }),
 red:Object.freeze({
  text:'相手の場に黄か紫のカードがある場合、手札にあるこのカードの必要エナジーを【赤×1】減らす。',
  colors:Object.freeze(['yellow','purple'])
 })
});
export const EVA_SHARED_BLOCKER='完整印刷效果尚未對上既有共通 DSL，不進入對戰包。';

function pending(){
 return {ready:false,blocker:EVA_SHARED_BLOCKER};
}
function dsl(extra){
 return {ready:true,implementation:'dsl',effects:{},...extra};
}
function onPlay(op){
 return dsl({effects:{onPlay:[op]}});
}

export function evaSharedProgram(card){
 if(!card||card.title!=='eva'||card.deckLegal!==true||card.type==='action-point')return pending();
 const triggerText=norm(card.triggerTextJa);
 if(!Object.prototype.hasOwnProperty.call(STANDARD,triggerText)||STANDARD[triggerText]!==card.trigger)
  return pending();
 const effect=norm(card.effectJa);
 const ink=INK[card.color];
 if(!ink)return pending();
 if(EMPTY.has(effect)){
  if(card.type!=='character')return pending();
  return {ready:true,implementation:'vanilla',effects:{}};
 }
 if(card.type==='character'&&effect===norm(
  `【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+【${ink}】と「メインフェイズ終了時、このキャラを退場させる。」を得る。`))
  return dsl({mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}});
 if(card.type==='character'&&effect===norm(`このキャラがアクティブの場合、このキャラの発生エナジー+【${ink}】。`))
  return dsl({activeExtraEnergy:1});
 if(card.type==='character'&&effect==='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。')
  return onPlay({op:'drawDiscard',count:1});
 if(card.type==='character'&&effect==='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。')
  return onPlay({op:'bounceOwnOtherUnderEnergy',energy:1});
 if(card.type==='character'&&effect==='【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。')
  return onPlay({op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true});
 if(card.type==='character'&&effect==='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）')
  return dsl({step:true});
 if(card.type==='character'&&effect==='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）')
  return dsl({impactNull:true});
 const discount=DISCOUNT[card.color];
 if(card.type==='character'&&discount&&effect===norm(discount.text))
  return dsl({opponentFieldColorsHandEnergyDiscount:{colors:[...discount.colors],amount:1}});
 if(card.type==='event'&&effect==='自分のAPカードを2枚まで選び、アクティブにする。')
  return onPlay({op:'recoverAp',count:2});
 if(card.type==='character'&&effect==='【退場時】カードを1枚引く。')
  return dsl({effects:{onRetire:[{op:'draw',count:1}]}});
 if(card.type==='character'&&effect==='【自分のターン中】このキャラはBP+1000。【登場時】カードを1枚引く。')
  return dsl({ownTurnBp:1000,effects:{onPlay:[{op:'draw',count:1}]}});
 return pending();
}
