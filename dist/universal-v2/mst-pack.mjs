// V2-D MST: curated official-text-locked pilots; no implicit engine compatibility.
// Source copies are isolated under ./sources, not merged into Production records.
import {MST_V2_OFFICIAL_CATALOGUE} from './sources/mst-inventory.mjs';
import {createUniversalPack} from './pack.mjs';

const PRINTED_PINS=Object.freeze({
  "MST-1-001": {
    "kind": "vanilla",
    "nameJa": "エリス",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "get",
    "effectJa": "-"
  },
  "MST-1-002": {
    "kind": "vanilla",
    "nameJa": "エリス",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "active",
    "effectJa": "-"
  },
  "MST-1-020": {
    "kind": "vanilla",
    "nameJa": "ルイジェルド",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "draw",
    "effectJa": "-"
  },
  "MST-1-027": {
    "kind": "vanilla",
    "nameJa": "ロキシー",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "get",
    "effectJa": "-"
  },
  "MST-1-050": {
    "kind": "vanilla",
    "nameJa": "ロキシー",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "get",
    "effectJa": "-"
  },
  "MST-1-070": {
    "kind": "vanilla",
    "nameJa": "リニアーナ",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [
      "ラノア魔法大学"
    ],
    "trigger": "draw",
    "effectJa": "-"
  },
  "MST-1-017": {
    "kind": "onPlayDraw",
    "nameJa": "ノルン＆アイシャ",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖登場時〗 カードを1枚引く。"
  },
  "MST-1-022": {
    "kind": "onPlayDrawDiscard",
    "nameJa": "ルーデウス",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "active",
    "effectJa": "〖登場時〗 カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "MST-1-012": {
    "kind": "onAttackDrawDiscard",
    "nameJa": "シルフィエット",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "draw",
    "effectJa": "〖アタック時〗 カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "MST-1-018": {
    "kind": "onAttackDrawDiscard",
    "nameJa": "パウロ",
    "color": "blue",
    "energy": 5,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "active",
    "effectJa": "〖アタック時〗 カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "MST-1-015": {
    "kind": "impactNull",
    "nameJa": "聖獣",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "active",
    "effectJa": "〖インパクト無効〗 （このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）"
  },
  "MST-1-071": {
    "kind": "impactNull",
    "nameJa": "ルーデウス",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [
      "ラノア魔法大学"
    ],
    "trigger": null,
    "effectJa": "〖インパクト無効〗 （このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）"
  },
  "MST-1-029": {
    "kind": "activeExtraEnergy",
    "nameJa": "ロキシー",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+ 〖青〗 。"
  },
  "MST-1-072": {
    "kind": "activeExtraEnergy",
    "nameJa": "ルーデウス",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "traits": [
      "ラノア魔法大学"
    ],
    "trigger": null,
    "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+ 〖緑〗 。"
  },
  "MST-1-047": {
    "kind": "step",
    "nameJa": "パウロ",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "draw",
    "effectJa": "〖ステップ〗 （自分の移動フェイズにフロントLからエナジーLへ移動できる）"
  },
  "MST-1-069": {
    "kind": "peekTopOne",
    "nameJa": "プルセナ",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [
      "ラノア魔法大学"
    ],
    "trigger": null,
    "effectJa": "〖登場時〗 自分の山札の上から1枚見て、山札の上か場外に置く。"
  },
  "MST-1-019": {
    "kind": "bounceOtherEnergyOne",
    "nameJa": "リーリャ",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 2,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖登場時〗 必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。"
  },
  "MST-1-044": {
    "kind": "bounceOtherEnergyOne",
    "nameJa": "サラ",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 2,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖登場時〗 必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。"
  },
  "MST-1-034": {
    "kind": "recoverApTwo",
    "nameJa": "エリスに魔術を教えてくださいニャン☆",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "traits": [],
    "trigger": "final",
    "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。"
  },
  "MST-1-037": {
    "kind": "recoverApTwo",
    "nameJa": "ご神体",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "traits": [],
    "trigger": "final",
    "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。"
  },
  "MST-1-077": {
    "kind": "recoverApTwo",
    "nameJa": "今までありがとう",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "traits": [],
    "trigger": "final",
    "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。"
  },
  "MST-1-079": {
    "kind": "recoverApTwo",
    "nameJa": "ゼニス救出作戦",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "traits": [],
    "trigger": "final",
    "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。"
  },
  "MST-1-061": {
    "kind": "onPlayBuffOwnOther1000",
    "nameJa": "ナナホシ",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [
      "ラノア魔法大学"
    ],
    "trigger": null,
    "effectJa": "〖登場時〗 自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。"
  }
});
export const MST_V2_PILOT_IDS=Object.freeze(Object.keys(PRINTED_PINS).sort());
export function verifiedMstV2Cards(){
 const printed=new Map(MST_V2_OFFICIAL_CATALOGUE.map(c=>[c.id,c]));
 return MST_V2_PILOT_IDS.map(id=>{
  const pin=PRINTED_PINS[id],source=printed.get(id);
  if(!source||source.verified!==true||!source.effectJa||
   Object.keys(pin).some(k=>k!=='kind'&&JSON.stringify(source[k])!==JSON.stringify(pin[k])))
   throw Error(id+' official source mismatch (V2 fail closed)');
  const card={id,name:pin.nameJa,color:pin.color,type:pin.type,
   energy:pin.energy,ap:pin.ap,bp:pin.bp,gen:pin.gen,
   traits:[...pin.traits],trigger:pin.trigger,
   implementation:['vanilla','step'].includes(pin.kind)?'vanilla':'dsl'};
  if(card.implementation==='vanilla')card.effects={};
  if(pin.kind==='step')card.step=true;
  if(pin.kind==='onPlayDraw')card.templateEffects={onPlay:[{template:'draw',count:1}]};
  if(pin.kind==='onPlayDrawDiscard')card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
  if(pin.kind==='onAttackDrawDiscard')card.templateEffects={onAttack:[{template:'drawDiscardOne'}]};
  if(pin.kind==='impactNull')card.impactNull=true;
  if(pin.kind==='activeExtraEnergy')card.activeExtraEnergy=1;
  if(pin.kind==='peekTopOne')card.templateEffects={onPlay:[{template:'peekTopOne'}]};
  if(pin.kind==='bounceOtherEnergyOne')
   card.templateEffects={onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]};
  if(pin.kind==='recoverApTwo')
   card.templateEffects={onPlay:[{template:'recoverAp',count:2}]};
  if(pin.kind==='onPlayBuffOwnOther1000')
   card.templateEffects={onPlay:[{template:'buffOwnField',
    filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]};
  return card;
 });
}
export function mstV2Pack(){
 return createUniversalPack({id:'mushoku-tensei',version:'v2-d-mst-pilot-2',
  cards:verifiedMstV2Cards()});
}

/** Same official records and V2 definitions supply standalone pack and registry. */
export function verifiedMstV2Entries(){
 const printed=new Map(MST_V2_OFFICIAL_CATALOGUE.map(c=>[c.id,c]));
 return verifiedMstV2Cards().map(def=>{
  const source=printed.get(def.id),pin=PRINTED_PINS[def.id];
  if(!source||!pin||!source.effectJa)
   throw Error(def.id+' missing Japanese official evidence');
  if(def.implementation==='vanilla'&&
   !(pin.effectJa==='-'||
     (pin.kind==='step'&&pin.effectJa===
      '〖ステップ〗 （自分の移動フェイズにフロントLからエナジーLへ移動できる）')))
   throw Error(def.id+' cannot claim vanilla with unhandled printed effects');
  return Object.freeze({
   id:def.id,
   // MST source has official Ja effect plus older Chinese/legacy effect;
   // adapter normalizes "effect" to full audited JP print for contract QA.
   sourceRecord:source,
   definition:Object.freeze(def),
   evidence:Object.freeze({
    printedTextFragments:Object.freeze([source.effectJa]),
    reviewNote:'BANDAI JP UA54BT '+source.number+
     '; audited V2-D profile '+pin.kind+
     '; pilot behavior and generic Trigger only, NOT complete FAQ acceptance. '+
     source.source,
    testFiles:Object.freeze([
     'tests/universal-v2-mst-port.test.mjs',
     'tests/universal-v2-sao-mst-cross-title.test.mjs'
    ]),
    ...(def.implementation==='vanilla'?{verifiedNoExtraEffects:true}:{})
   })
  });
 });
}
