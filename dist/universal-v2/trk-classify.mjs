// Whole-print classifier for 美食獵人 / UA17 Toriko.
// A card is registered only when the entire Japanese effect is one tested
// shared program and the life trigger is one of the standard printed texts.
// Color and special triggers stay in the catalogue until that whole print,
// trigger included, is a shared program. This file does not import the engine.
const PIP={yellow:'黄',blue:'青',purple:'紫',green:'緑',red:'赤'};
const COLOR={黄:'yellow',青:'blue',紫:'purple',緑:'green',赤:'red'};
const STANDARD={
 active:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
 draw:'【ドロー】カードを1枚引く。',
 get:'【ゲット】このカードを手札に加える。',
 final:'【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。',
 raid:'【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。'
};
const IMPACT='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）';
const DRAW_DISCARD='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。';
const BUFF_OTHER='【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。';
const RECOVER='自分のAPカードを2枚まで選び、アクティブにする。';
const STEP='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）';
const BOUNCE='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。';
const DOUBLE='【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）';
const TOP_KEEP='【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを場外に置く。';
const DOWN_FRONT='【登場時】相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。';
const DOWN_FRONT_1500='【登場時】BP1500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。';
const DOWN_FIELD_1500='【登場時】BP1500以上の相手の場のキャラを1枚まで選び、このターン中、BP-1000。';
const IMPACT_ONE='【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）';
const HAND=/^相手の場に([黄青紫緑赤])か([黄青紫緑赤])のカードがある場合、手札にあるこのカードの必要エナジーを【([黄青紫緑赤])×1】減らす。$/;

function standardTrigger(card){
 if(card.trigger==null)return card.triggerTextJa==='-'||card.triggerTextJa==='';
 return STANDARD[card.trigger]===card.triggerTextJa;
}

export function trkProfile(card){
 const effect=String(card?.effectJa||'');
 const pip=PIP[card?.color];
 if(!pip||!standardTrigger(card))return null;
 if(effect==='-'||effect==='')return {kind:'plain'};
 if(effect===IMPACT)return {kind:'impactNull'};
 if(effect===DRAW_DISCARD)return {kind:'drawDiscard'};
 if(effect===BUFF_OTHER)return {kind:'buffOther'};
 if(effect===RECOVER)return {kind:'recoverAp2'};
 if(effect===STEP)return {kind:'step'};
 if(effect===BOUNCE)return {kind:'bounce'};
 if(effect===DOUBLE)return {kind:'doubleBlock'};
 if(effect===`このキャラがアクティブの場合、このキャラの発生エナジー+【${pip}】。`)
  return {kind:'activeEnergy'};
 if(effect===TOP_KEEP)return {kind:'topKeep'};
 if(effect===DOWN_FRONT)return {kind:'enemyDown'};
 if(effect===DOWN_FRONT_1500)return {kind:'enemyDownFront1500'};
 if(effect===DOWN_FIELD_1500)return {kind:'enemyDownField1500'};
 if(effect===IMPACT_ONE)return {kind:'printedImpact'};
 const hand=effect.match(HAND);
 if(!hand)return null;
 const colors=[COLOR[hand[1]],COLOR[hand[2]]];
 const reduced=COLOR[hand[3]];
 if(reduced!==card.color||colors.includes(card.color)||new Set(colors).size!==2)return null;
 return {kind:'handDiscount',handDiscount:{colors,amount:1}};
}

export function trkEngineKind(card){
 return trkProfile(card)?.kind||null;
}
