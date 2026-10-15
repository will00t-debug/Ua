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
  },
  "SAO-1-004": {
    "kind": "onPlayBuffOwnOther1000",
    "nameJa": "ユージオ",
    "color": "yellow",
    "energy": 0,
    "ap": 1,
    "bp": 500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [],
    "effectJa": "【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。"
  },
  "SAO-1-047": {
    "kind": "onPlayBuffOwnOther1000",
    "nameJa": "リズベット",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。"
  },
  "SAO-1-094": {
    "kind": "onPlayBuffOwnOther1000",
    "nameJa": "銃士X",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "GGO"
    ],
    "effectJa": "【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。"
  },
  "SAO-2-015": {
    "kind": "onPlayBuffOwnOther1000",
    "nameJa": "キリト",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。"
  },
  "SAO-2-027": {
    "kind": "onPlayBuffOwnOther1000",
    "nameJa": "ユイ",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 500,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": [],
    "effectJa": "【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。"
  },
  "SAO-2-067": {
    "kind": "onPlayBuffOwnOther500",
    "nameJa": "フレイヤ",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "ALO"
    ],
    "effectJa": "【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+500。"
  },
  "SAO-1-107": {
    "kind": "onPlayDrawThreeDiscardOne",
    "nameJa": "リズベット",
    "color": "blue",
    "energy": 3,
    "ap": 2,
    "bp": 2000,
    "gen": 3,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "【登場時】カードを3枚引き、自分の手札を1枚場外に置く。"
  },
  "SAO-2-072": {
    "kind": "onPlayPeekTopOrBottom",
    "nameJa": "シノン",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": [
      "GGO"
    ],
    "effectJa": "【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。"
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
  if(card.implementation==='vanilla')card.effects={};
  if(pin.kind==='step')card.step=true;
  if(pin.kind==='onPlayDraw')
   card.templateEffects={onPlay:[{template:'draw',count:1}]};
  if(pin.kind==='onPlayDrawDiscard')
   card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
  if(pin.kind==='onPlayDrawThreeDiscardOne')
   card.effects={onPlay:[{op:'drawDiscard',count:3}]};
  if(pin.kind==='onPlayPeekTopOrBottom')
   card.templateEffects={onPlay:[{template:'peekTopOrBottom'}]};
  if(pin.kind==='impactNull')card.impactNull=true;
  if(pin.kind==='onPlayBounce')
   card.templateEffects={onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]};
  if(pin.kind==='onPlayPeekTop')
   card.templateEffects={onPlay:[{template:'peekTopOne'}]};
  if(pin.kind==='onPlayRestEnemy3000')
   card.templateEffects={onPlay:[{template:'restEnemyUnderBp',bp:3000,optional:true}]};
  if(pin.kind==='onPlayBuffOwnOther1000'||pin.kind==='onPlayBuffOwnOther500')
   card.templateEffects={onPlay:[{template:'buffOwnField',
    filter:{field:'type',value:'character'},
    bp:pin.kind==='onPlayBuffOwnOther500'?500:1000,
    optional:true,excludeSelf:true}]};
  return card;
 });
}
export function saoV2Pack(){
 return createUniversalPack({id:'sword-art-online',version:'v2-d-sao-pilot-4',
  cards:verifiedSaoV2Cards()});
}

/**
 * Shared AUTHORITATIVE definition/evidence per allowlisted ID.
 * Both the standalone pack and the formal title contribution originate in
 * verifiedSaoV2Cards; there is no second list of independently ported cards.
 */
export function verifiedSaoV2Entries(){
 const originals=sourceCards();
 const definitions=verifiedSaoV2Cards();
 return definitions.map(def=>{
  const source=originals.get(def.id);
  const pin=PRINTED_PINS[def.id];
  if(!source||!pin||!source.effectJa)throw Error(def.id+' missing Japanese evidence');
  if(def.implementation==='vanilla'&&
    !(pin.effectJa==='-'||
      (pin.kind==='step'&&
       pin.effectJa==='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）')))
   throw Error(def.id+' cannot claim vanilla with unhandled printed effects');
  return Object.freeze({
   id:def.id,
   sourceRecord:Object.freeze({...source,effect:source.effectJa}),
   definition:Object.freeze(def),
   evidence:Object.freeze({
    printedTextFragments:Object.freeze([source.effectJa]),
    reviewNote:'BANDAI JP original '+source.number+
     '; reviewed strict V2-D profile '+pin.kind+
     '; pilot logic and generic Trigger only, not complete official FAQ acceptance. '+
     source.source,
    testFiles:Object.freeze([
     'tests/universal-v2-sao-port.test.mjs',
     'tests/universal-v2-sao-mst-cross-title.test.mjs'
    ]),
    ...(def.implementation==='vanilla'?{verifiedNoExtraEffects:true}:{})
   })
  });
 });
}
