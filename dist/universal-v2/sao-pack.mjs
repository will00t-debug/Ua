// V2-D SAO: manually enumerated, official-text-gated first batch.
// Importing data never grants unsupported card IDs playability.
import {SAO_OFFICIAL_CARDS} from '../sao-official-import.mjs';
import {createUniversalPack} from './pack.mjs';

const PRINTED_PINS=Object.freeze({
  "SAO-1-019": {
    "kind": "vanilla",
    "nameJa": "アスナ（創世神ステイシア）",
    "color": "yellow",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "traits": [
      "女神"
    ],
    "effectJa": "-"
  },
  "SAO-1-023": {
    "kind": "vanilla",
    "nameJa": "シノン（太陽神ソルス）",
    "color": "yellow",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "女神"
    ],
    "effectJa": "-"
  },
  "SAO-1-035": {
    "kind": "vanilla",
    "nameJa": "アスナ",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "-"
  },
  "SAO-1-039": {
    "kind": "vanilla",
    "nameJa": "キリト",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "-"
  },
  "SAO-1-054": {
    "kind": "vanilla",
    "nameJa": "サクヤ",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "ALO"
    ],
    "effectJa": "-"
  },
  "SAO-1-058": {
    "kind": "vanilla",
    "nameJa": "リーファ",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "traits": [
      "ALO"
    ],
    "effectJa": "-"
  },
  "SAO-1-068": {
    "kind": "vanilla",
    "nameJa": "アスナ",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "traits": [
      "ALO"
    ],
    "effectJa": "-"
  },
  "SAO-1-069": {
    "kind": "vanilla",
    "nameJa": "アスナ",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "ALO"
    ],
    "effectJa": "-"
  },
  "SAO-1-084": {
    "kind": "vanilla",
    "nameJa": "キリト",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "GGO"
    ],
    "effectJa": "-"
  },
  "SAO-1-088": {
    "kind": "vanilla",
    "nameJa": "シノン",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "traits": [
      "GGO"
    ],
    "effectJa": "-"
  },
  "SAO-1-102": {
    "kind": "vanilla",
    "nameJa": "エギル",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 3,
    "type": "character",
    "trigger": "active",
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "-"
  },
  "SAO-1-106": {
    "kind": "vanilla",
    "nameJa": "シリカ",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "-"
  },
  "SAO-2-028": {
    "kind": "vanilla",
    "nameJa": "ユナ",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "traits": [],
    "effectJa": "-"
  },
  "SAO-2-035": {
    "kind": "vanilla",
    "nameJa": "エギル",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "SAOサバイバー"
    ],
    "effectJa": "-"
  },
  "SAO-2-047": {
    "kind": "vanilla",
    "nameJa": "キリト",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "プログレッシブ"
    ],
    "effectJa": "-"
  },
  "SAO-1-001": {
    "kind": "step",
    "nameJa": "キリト",
    "color": "yellow",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [],
    "effectJa": "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）"
  },
  "SAO-1-082": {
    "kind": "step",
    "nameJa": "リーファ",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [
      "ALO"
    ],
    "effectJa": "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）"
  },
  "SAO-1-061": {
    "kind": "onPlayDraw",
    "nameJa": "リズベット",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [
      "ALO"
    ],
    "effectJa": "【登場時】カードを1枚引く。"
  },
  "SAO-2-041": {
    "kind": "onPlayDraw",
    "nameJa": "アスナ",
    "color": "purple",
    "energy": 2,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [
      "プログレッシブ"
    ],
    "effectJa": "【登場時】カードを1枚引く。"
  },
  "SAO-1-016": {
    "kind": "onPlayDrawDiscard",
    "nameJa": "ファナティオ・シンセシス・ツー",
    "color": "yellow",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 3,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "整合騎士"
    ],
    "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "SAO-1-055": {
    "kind": "onPlayDrawDiscard",
    "nameJa": "ユイ",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "ALO"
    ],
    "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "SAO-1-078": {
    "kind": "onPlayDrawDiscard",
    "nameJa": "ユウキ",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "ALO"
    ],
    "effectJa": "【登場時】カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "SAO-1-026": {
    "kind": "impactNull",
    "nameJa": "リーファ（地神テラリア）",
    "color": "yellow",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [
      "女神"
    ],
    "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）"
  },
  "SAO-1-027": {
    "kind": "impactNull",
    "nameJa": "リーファ（地神テラリア）",
    "color": "yellow",
    "energy": 3,
    "ap": 1,
    "bp": 3500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "女神"
    ],
    "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）"
  },
  "SAO-1-074": {
    "kind": "impactNull",
    "nameJa": "シノン",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [
      "ALO"
    ],
    "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）"
  },
  "SAO-2-026": {
    "kind": "impactNull",
    "nameJa": "シノン",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [],
    "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）"
  },
  "SAO-2-045": {
    "kind": "impactNull",
    "nameJa": "エギル",
    "color": "purple",
    "energy": 4,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "プログレッシブ"
    ],
    "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）"
  },
  "SAO-1-006": {
    "kind": "onPlayBounce",
    "nameJa": "ロニエ・アラベル",
    "color": "yellow",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 3,
    "type": "character",
    "trigger": null,
    "traits": [],
    "effectJa": "【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。"
  },
  "SAO-1-046": {
    "kind": "onPlayBounce",
    "nameJa": "ユイ",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 3,
    "type": "character",
    "trigger": null,
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。"
  },
  "SAO-1-095": {
    "kind": "onPlayBounce",
    "nameJa": "闇風",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 3,
    "type": "character",
    "trigger": null,
    "traits": [
      "GGO"
    ],
    "effectJa": "【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。"
  },
  "SAO-2-046": {
    "kind": "onPlayBounce",
    "nameJa": "キバオウ",
    "color": "purple",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 3,
    "type": "character",
    "trigger": null,
    "traits": [
      "プログレッシブ"
    ],
    "effectJa": "【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。"
  },
  "SAO-2-040": {
    "kind": "onPlayPeekTop",
    "nameJa": "アスナ",
    "color": "purple",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "プログレッシブ"
    ],
    "effectJa": "【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か場外に置く。"
  },
  "SAO-1-042": {
    "kind": "onPlayRestEnemy3000",
    "nameJa": "クライン",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "【登場時】BP3000以下の相手のフロントLのキャラを1枚まで選び、レストにする。"
  }
});
export const SAO_V2_PILOT_IDS=Object.freeze(Object.keys(PRINTED_PINS).sort());
function sourceCards(){
 const selected=new Map();
 for(const source of SAO_OFFICIAL_CARDS){
  if(!Object.prototype.hasOwnProperty.call(PRINTED_PINS,source.id))continue;
  const old=selected.get(source.id);
  if(old&&['nameJa','color','energy','ap','bp','gen','type','trigger','traits','effectJa']
      .some(k=>JSON.stringify(old[k])!==JSON.stringify(source[k])))
   throw Error(source.id+' reprint has conflicting official characteristics');
  if(!old)selected.set(source.id,source);
 }
 return selected;
}
export function verifiedSaoV2Cards(){
 const printed=sourceCards();
 return SAO_V2_PILOT_IDS.map(id=>{
  const pin=PRINTED_PINS[id],source=printed.get(id);
  if(!source||Object.keys(pin).some(k=>k!=='kind'&&
    JSON.stringify(source[k])!==JSON.stringify(pin[k])))
   throw Error(id+' official source mismatch (V2 fail closed)');
  const card={id,name:pin.nameJa,color:pin.color,type:pin.type,
   energy:pin.energy,ap:pin.ap,bp:pin.bp,gen:pin.gen,
   traits:[...pin.traits],trigger:pin.trigger,
   implementation:pin.kind==='vanilla'||pin.kind==='step'?'vanilla':'dsl'};
  if(pin.kind==='step')card.step=true;
  if(pin.kind==='onPlayDraw')
   card.templateEffects={onPlay:[{template:'draw',count:1}]};
  if(pin.kind==='onPlayDrawDiscard')
   card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
  if(pin.kind==='impactNull')card.impactNull=true;
  if(pin.kind==='onPlayBounce')
   card.templateEffects={onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]};
  if(pin.kind==='onPlayPeekTop')
   card.templateEffects={onPlay:[{template:'peekTopOne'}]};
  if(pin.kind==='onPlayRestEnemy3000')
   card.templateEffects={onPlay:[{template:'restEnemyUnderBp',bp:3000,optional:true}]};
  return card;
 });
}
export function saoV2Pack(){
 return createUniversalPack({id:'sword-art-online',version:'v2-d-sao-pilot-2',
  cards:verifiedSaoV2Cards()});
}
