// V2-D SAO: manually enumerated, official-text-gated first batch.
// Importing data never grants unsupported card IDs playability.
import {SAO_OFFICIAL_CARDS} from '../sao-official-import.mjs';
import {createUniversalPack} from './pack.mjs';

const PRINTED_PINS=Object.freeze({
 "SAO-1-034":{"kind":"lifeGatedRestRetire","nameJa":"ラディアント・ライト",
  "color":"yellow","energy":3,"ap":1,"bp":0,"gen":0,"type":"event",
  "trigger":"special","traits":[],
  "effectJa":"BP5000以下の相手のフロントLのキャラを1枚選び、『レストにする。それは次の1回アクティブにならない』。自分のライフが4以下の場合、『退場させる』に代わる。"
 },
  "SAO-1-051": {
    "kind": "impactNullOwnTurnHandFiveBp1000",
    "nameJa": "キリト",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["ALO"],
    "effectJa": "【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n【自分のターン中】自分の手札が5枚以上の場合、このキャラはBP+1000。"
  },

  "SAO-1-020": {
    "kind": "ownLifeAtMostFourBp500",
    "nameJa": "アスナ（創世神ステイシア）",
    "color": "yellow",
    "energy": 1,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["女神"],
    "effectJa": "自分のライフが4以下の場合、このキャラはBP+500。"
  },

  "SAO-1-057": {
    "kind": "ownTurnHandFiveBp",
    "nameJa": "ユージーン",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 3500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": ["ALO"],
    "effectJa": "【自分のターン中】自分の手札が5枚以上の場合、このキャラはBP+500。"
  },

  "SAO-1-014": {
    "kind": "opponentTurnBp1000",
    "nameJa": "エルドリエ・シンセシス・サーティワン",
    "color": "yellow",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": ["整合騎士"],
    "effectJa": "【相手のターン中】このキャラはBP+1000。"
  },

  "SAO-2-019": {
    "kind": "ownTurnSilicaFieldBp",
    "nameJa": "ピナ",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": ["アインクラッド"],
    "effectJa": "【自分のターン中】自分の場に〈シリカ〉がある場合、このキャラはBP+2000。"
  },

  "SAO-2-016": {
    "kind": "onRetireDrawOne",
    "nameJa": "クラディール",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["アインクラッド"],
    "effectJa": "【退場時】カードを1枚引く。"
  },
  "SAO-1-105": {
    "kind": "onRetireDrawOne",
    "nameJa": "サチ",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["アインクラッド"],
    "effectJa": "【退場時】カードを1枚引く。"
  },
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
  "SAO-2-021": {
    "kind": "mainDiscardSelfBuff",
    "nameJa": "キリト",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": ["ALO"],
    "effectJa": "【起動メイン】【手札を1枚場外に置く】 【ターン1】このキャラはこのターン中、BP+1500。"
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
  },
  "SAO-2-017": {
    "kind": "onPlayInspectTwoAnyOutside",
    "nameJa": "シリカ",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": [
      "アインクラッド"
    ],
    "effectJa": "【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを場外に置く。"
  },
  "SAO-2-030": {
    "kind": "onPlayInspectTwoAnyOutside",
    "nameJa": "ユナ",
    "color": "purple",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [],
    "effectJa": "【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを場外に置く。"
  },
  "SAO-1-032": {
    "kind": "recoverApTwo",
    "nameJa": "手作りのパイ",
    "color": "yellow",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "final",
    "traits": [],
    "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。"
  },
  "SAO-1-063": {
    "kind": "recoverApTwo",
    "nameJa": "アスナのサンドイッチ",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "final",
    "traits": [],
    "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。"
  },
  "SAO-1-098": {
    "kind": "recoverApTwo",
    "nameJa": "バーベキュー",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "final",
    "traits": [],
    "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。"
  },
  "SAO-2-057": {
    "kind": "recoverApTwo",
    "nameJa": "お風呂",
    "color": "purple",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "final",
    "traits": [],
    "effectJa": "自分のAPカードを2枚まで選び、アクティブにする。"
  },
  "SAO-1-075": {
    "kind": "stepInspectTwoAnyOutside",
    "nameJa": "シリカ",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 3,
    "type": "character",
    "trigger": null,
    "traits": [
      "ALO"
    ],
    "effectJa": "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）\n【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを場外に置く。"
  },
  "SAO-1-089": {
    "kind": "stepPeekTopOrBottom",
    "nameJa": "シノン",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": [
      "GGO"
    ],
    "effectJa": "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）\n【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。"
  },
  "SAO-1-003": {
    "kind": "activeExtraEnergy",
    "nameJa": "ティーゼ・シュトリーネン",
    "color": "yellow",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 2,
    "type": "character",
    "trigger": null,
    "traits": [],
    "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+【黄】。"
  },
  "SAO-1-052": {
    "kind": "activeExtraEnergy",
    "nameJa": "キリト",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 2,
    "type": "character",
    "trigger": null,
    "traits": [
      "ALO"
    ],
    "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+【青】。"
  },
  "SAO-1-073": {
    "kind": "activeExtraEnergy",
    "nameJa": "シウネー",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 2,
    "type": "character",
    "trigger": null,
    "traits": [
      "ALO"
    ],
    "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+【緑】。"
  },
  "SAO-2-048": {
    "kind": "activeExtraEnergy",
    "nameJa": "キリト",
    "color": "purple",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 2,
    "type": "character",
    "trigger": null,
    "traits": [
      "プログレッシブ"
    ],
    "effectJa": "このキャラがアクティブの場合、このキャラの発生エナジー+【紫】。"
  },
  "SAO-1-009": {
    "kind": "onPlayTopFilterBottomDiscard",
    "nameJa": "リズベット",
    "color": "yellow",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": "draw",
    "traits": ["ALO"],
    "effectJa": "【登場時】自分の山札の上から3枚見る。その中から［特徴：女神］を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。"
  },
  "SAO-1-040": {
    "kind": "onPlayTopFilterBottomDiscard",
    "nameJa": "キリト",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["アインクラッド"],
    "effectJa": "【登場時】自分の山札の上から3枚見る。その中から［特徴：アインクラッド］を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。"
  },
  "SAO-2-023": {
    "kind": "onPlayTopFilterBottomDiscard",
    "nameJa": "リーファ",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["ALO"],
    "effectJa": "【登場時】自分の山札の上から3枚見る。その中から［特徴：ALO］を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。"
  },
  "SAO-1-077": {
    "kind": "onPlayTopFilterBottomDiscard",
    "nameJa": "ユイ",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": ["ALO"],
    "effectJa": "【登場時】自分の山札の上から3枚見る。その中から緑の［特徴：ALO］を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。"
  },
  "SAO-1-038": {
    "kind": "readyOnFirstBlock",
    "nameJa": "エギル",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["アインクラッド"],
    "effectJa": "【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）"
  },
  "SAO-2-052": {
    "kind": "frontOnceBpDown",
    "nameJa": "ミト",
    "color": "purple",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["プログレッシブ"],
    "effectJa": "【起動メイン】【フロントLにある場合】 【ターン1】BP1500以上の相手のフロントLのキャラを1枚選び、このターン中、BP-1000。"
  },
  "SAO-2-043": {
    "kind": "frontOnceDiscardBpDown",
    "nameJa": "アルゴ",
    "color": "purple",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": ["プログレッシブ"],
    "effectJa": "【起動メイン】【フロントLにある場合】 【手札を1枚場外に置く】 【ターン1】BP1500以上の相手の場のキャラを1枚選び、このターン中、BP-1000。"
  },
  "SAO-1-072": {
    "kind": "readyOnFirstBlock",
    "nameJa": "クライン",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 3500,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": ["ALO"],
    "effectJa": "【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）"
  },
  "SAO-2-007": {
    "kind": "nameAliasDrawDiscard",
    "nameJa": "ユージオ・シンセシス・サーティツー",
    "color": "yellow",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": ["整合騎士"],
    "effectJa": "このカードは〈ユージオ〉としても扱う。\n【登場時】カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "SAO-1-010": {
    "kind": "nameAliasOnly",
    "nameJa": "アリス・シンセシス・サーティ",
    "color": "yellow",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "traits": ["整合騎士"],
    "effectJa": "このカードは〈アリス〉としても扱う。"
  },
  "SAO-1-011": {
    "kind": "nameAliasStep",
    "nameJa": "アリス・シンセシス・サーティ",
    "color": "yellow",
    "energy": 1,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["整合騎士"],
    "effectJa": "このカードは〈アリス〉としても扱う。\n【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）"
  },
  "SAO-1-012": {
    "kind": "nameAliasStepBothNamesColorRest",
    "nameJa": "アリス・シンセシス・サーティ",
    "color": "yellow",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": "color",
    "traits": ["整合騎士"],
    "effectJa": "このカードは〈アリス〉としても扱う。\n【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）\n【自分のターン中】自分の場に〈キリト〉と〈ユージオ〉がある場合、このキャラはBP+1000。"
  },
  "SAO-2-004": {
    "kind": "nameAliasActiveIfTrait",
    "nameJa": "アリス・シンセシス・サーティ",
    "color": "yellow",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": ["整合騎士"],
    "effectJa": "このカードは〈アリス〉としても扱う。\n【登場時】自分の場に他の［特徴：整合騎士］が4枚以上ある場合、このキャラをアクティブにする。"
  },
  "SAO-2-003": {
    "kind": "nameAliasOnly",
    "nameJa": "キリト＆ユージオ",
    "color": "yellow",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": "draw",
    "traits": [],
    "effectJa": "このカードは〈キリト〉としても〈ユージオ〉としても扱う。"
  },
  "SAO-2-051": {
    "kind": "nameAliasOnly",
    "nameJa": "兎沢 深澄",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "traits": ["プログレッシブ"],
    "effectJa": "このカードは〈ミト〉としても扱う。"
  },
  "SAO-2-055": {
    "kind": "nameAliasDrawDiscard",
    "nameJa": "結城 明日奈",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": ["プログレッシブ"],
    "effectJa": "このカードは〈アスナ〉としても扱う。\n【登場時】カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "SAO-1-008": {
    "kind": "fieldRestEnergyRetireEndMain",
    "nameJa": "ユイ",
    "color": "yellow",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["ALO"],
    "effectJa": "【起動メイン】【レストにする】 【ターン1】このターン中、このキャラの発生エナジー+【黄】。メインフェイズ終了時、このキャラを退場させる。"
  },
  "SAO-1-045": {
    "kind": "fieldRestEnergyRetireEndMain",
    "nameJa": "ピナ",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["アインクラッド"],
    "effectJa": "【起動メイン】【レストにする】 【ターン1】このターン中、このキャラの発生エナジー+【青】。メインフェイズ終了時、このキャラを退場させる。"
  },
  "SAO-1-093": {
    "kind": "fieldRestEnergyRetireEndMain",
    "nameJa": "ゼクシード",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["GGO"],
    "effectJa": "【起動メイン】【レストにする】 【ターン1】このターン中、このキャラの発生エナジー+【緑】。メインフェイズ終了時、このキャラを退場させる。"
  },
  "SAO-2-050": {
    "kind": "fieldRestEnergyRetireEndMain",
    "nameJa": "ディアベル",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["プログレッシブ"],
    "effectJa": "【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【紫】と「メインフェイズ終了時、このキャラを退場させる。」を得る。"
  },
  "SAO-2-006": {
    "kind": "ownTraitEnergy",
    "nameJa": "ベルクーリ・シンセシス・ワン",
    "color": "yellow",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["整合騎士"],
    "effectJa": "自分の場に他の［特徴：整合騎士］が3枚以上ある場合、このキャラの発生エナジー+【黄】。"
  },
  "SAO-2-005": {
    "kind": "ownTraitImpact",
    "nameJa": "シェータ・シンセシス・トゥエルブ",
    "color": "yellow",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["整合騎士"],
    "effectJa": "自分の場に他の［特徴：整合騎士］が4枚以上ある場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。"
  },
  "SAO-2-008": {
    "kind": "ownTurnTraitBp",
    "nameJa": "レンリ・シンセシス・トゥエニセブン",
    "color": "yellow",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": ["整合騎士"],
    "effectJa": "【自分のターン中】自分の場に他の［特徴：整合騎士］が4枚以上ある場合、このキャラはBP+1500。"
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
  if(pin.kind==='opponentTurnBp1000'){
   card.opponentTurnBp=1000;
   card.effects={}; // Explicit DSL profile: persistent native modifier, no onPlay job
  }
  if(pin.kind==='impactNullOwnTurnHandFiveBp1000'){
   card.effects={};
   card.impactNull=true;
   card.passiveBonuses=[{condition:{kind:'ownHandCountAtLeast',turn:'own',min:5},bp:1000}];
  }
  if(pin.kind==='ownLifeAtMostFourBp500'){
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'ownLifeAtMost',turn:'any',max:4},bp:500}];
  }
  if(pin.kind==='ownTurnHandFiveBp'){
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'ownHandCountAtLeast',turn:'own',min:5},bp:500}];
  }
  if(pin.kind==='ownTurnSilicaFieldBp')
   card.passiveBonuses=[{condition:{kind:'ownNameExists',turn:'own',
    zone:'field',excludeSelf:true,name:'シリカ'},bp:2000}];
  if(pin.kind==='onRetireDrawOne')
   card.effects={onRetire:[{op:'draw',count:1}]};
  if(pin.kind==='readyOnFirstBlock'){
   card.readyOnBlockCount=1;
   card.effects={};
  }
  if(pin.kind==='nameAliasStepBothNamesColorRest'){
   card.nameAliases=['アリス'];
   card.step=true;
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'ownFieldHasAllNames',turn:'own',zone:'field',
    excludeSelf:true,names:['キリト','ユージオ']},bp:1000}];
   card.triggerEffect={op:'restOppFrontSkipNextActive'};
  }
  if(pin.kind==='nameAliasActiveIfTrait'){
   card.nameAliases=['アリス'];
   card.effects={onPlay:[{op:'activeSelfIf',when:{
    kind:'ownTraitCount',turn:'any',min:4,zone:'field',excludeSelf:true,trait:'整合騎士'
   }}]};
  }
  // Printed 【レストにする】 has no エナジーL / フロントL restriction.
  // The header 色+ icon is one color pip plus a plus mark (gen 1). The extra
  // pip is this activate ability, not a continuous ACTIVE bonus. SAO-2-050
  // gains the same resolved state with 「を得る」; a later silence does not
  // erase that gained energy or the already scheduled retirement.
  if(pin.kind==='fieldRestEnergyRetireEndMain'){
   card.effects={};
   card.mainAbility={op:'restSelfGainEnergyRetireEndMain',lines:'field',
    oncePerTurn:true,extraEnergy:1};
  }
  // SAO-2-006 header is 黄+ : one yellow pip plus the printed conditional
  // sentence, so resting generation is 1. There is no 「アクティブの場合」.
  // The extra pip exists only while three other 整合騎士 are on the own field,
  // and only the energy line actually produces it.
  if(pin.kind==='ownTraitEnergy'){
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'ownTraitCount',turn:'any',min:3,
    zone:'field',excludeSelf:true,trait:'整合騎士'},extraEnergy:1}];
  }
  if(pin.kind==='ownTurnTraitBp'){
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'ownTraitCount',turn:'own',min:4,
    zone:'field',excludeSelf:true,trait:'整合騎士'},bp:1500}];
  }
  // SAO-2-005 has no 自分のターン中 and no unconditional 【インパクト（1）】.
  // Four other 整合騎士 must be on the own field. This card does not count.
  if(pin.kind==='ownTraitImpact'){
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'ownTraitCount',turn:'any',min:4,
    zone:'field',excludeSelf:true,trait:'整合騎士'},impact:1}];
  }
  if(pin.kind==='nameAliasDrawDiscard'||pin.kind==='nameAliasOnly'||pin.kind==='nameAliasStep'){
   card.nameAliases={
    'SAO-2-007':['ユージオ'],'SAO-2-055':['アスナ'],
    'SAO-1-010':['アリス'],'SAO-1-011':['アリス'],
    'SAO-2-003':['キリト','ユージオ'],'SAO-2-051':['ミト']
   }[id];
   if(!card.nameAliases)throw Error(id+' missing printed name alias');
   if(pin.kind==='nameAliasStep')card.step=true;
   if(pin.kind==='nameAliasDrawDiscard')
    card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
   else card.effects={};
  }
  if(pin.kind==='frontOnceBpDown'||pin.kind==='frontOnceDiscardBpDown'){
   const debuff={op:'enemyBpDown',bp:1000,optional:false,minBp:1500,
    zone:pin.kind==='frontOnceDiscardBpDown'?'field':'front'};
   card.effects={};
   card.mainAbility={op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
    then:pin.kind==='frontOnceDiscardBpDown'
     ?[{op:'discardGate',optional:false,then:[debuff]}]
     :[debuff]};
  }
  if(pin.kind==='onPlayDraw')
   card.templateEffects={onPlay:[{template:'draw',count:1}]};
  if(pin.kind==='onPlayDrawDiscard')
   card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
  if(pin.kind==='onPlayDrawThreeDiscardOne')
   card.templateEffects={onPlay:[{template:'draw',count:2},{template:'drawDiscardOne'}]};
  if(pin.kind==='onPlayPeekTopOrBottom')
   card.templateEffects={onPlay:[{template:'peekTopOrBottom'}]};
  if(pin.kind==='onPlayInspectTwoAnyOutside')
   card.templateEffects={onPlay:[{template:'inspectTopAnyOutside',count:2,rest:'top'}]};
  if(pin.kind==='recoverApTwo')
   card.templateEffects={onPlay:[{template:'recoverAp',count:2}]};
  if(pin.kind==='stepInspectTwoAnyOutside'){
   card.step=true;
   card.templateEffects={onPlay:[{template:'inspectTopAnyOutside',count:2,rest:'top'}]};
  }
  if(pin.kind==='stepPeekTopOrBottom'){
   card.step=true;
   card.templateEffects={onPlay:[{template:'peekTopOrBottom'}]};
  }
  if(pin.kind==='mainDiscardSelfBuff')
   card.mainAbility={op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1500};
  if(pin.kind==='activeExtraEnergy')card.activeExtraEnergy=1;
  if(pin.kind==='impactNull')card.impactNull=true;
  if(pin.kind==='onPlayBounce')
   card.templateEffects={onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]};
  if(pin.kind==='onPlayPeekTop')
   card.templateEffects={onPlay:[{template:'peekTopOne'}]};
  if(pin.kind==='onPlayTopFilterBottomDiscard'){
   const spec={
    'SAO-1-009':{count:3,filter:{field:'trait',value:'女神'}},
    'SAO-1-040':{count:3,filter:{field:'trait',value:'アインクラッド'}},
    'SAO-2-023':{count:3,filter:{field:'trait',value:'ALO'}},
    'SAO-1-077':{count:3,filters:[{field:'color',value:'green'},{field:'trait',value:'ALO'}],logic:'all'}
   }[id];
   if(!spec)throw Error(id+' missing audited top-filter');
   card.templateEffects={onPlay:[spec.filters
    ?{template:'searchTopOneBottomDiscardWhere',count:spec.count,filters:spec.filters,logic:spec.logic}
    :{template:'searchTopOneBottomDiscard',count:spec.count,filter:spec.filter}]};
  }
  if(pin.kind==='lifeGatedRestRetire'){
    card.templateEffects={onPlay:[{template:'restOrRetireEnemyFrontByOwnLife',
     bp:5000,lifeAtMost:4,optional:false}]};
    card.triggerEffect={op:'retireOppFront'};
   }
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
 return createUniversalPack({id:'sword-art-online',version:'v2-d-sao-pilot-8',
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
      ...(def.id==='SAO-1-034'?['tests/v2-sao-034-official.test.mjs']:[]),
     ...(def.id==='SAO-2-021'?['tests/v2-sao-021-shared-main-cost.test.mjs']:[]),
     ...(pin.kind==='onRetireDrawOne'?['tests/v2-sao-retire-draw-shared.test.mjs']:[]),
     ...(pin.kind==='opponentTurnBp1000'?['tests/v2-sao-014-opponent-bp.test.mjs']:[]),
     ...(pin.kind==='ownTurnHandFiveBp'?['tests/v2-sao-057-hand-count-bp.test.mjs']:[]),
     ...(pin.kind==='ownLifeAtMostFourBp500'?['tests/v2-sao-020-life-threshold-bp.test.mjs']:[]),
     ...(pin.kind==='impactNullOwnTurnHandFiveBp1000'?['tests/v2-sao-051-hand-impact-null.test.mjs']:[]),
     ...(pin.kind==='ownTurnSilicaFieldBp'?['tests/v2-sao-019-own-silica-bp.test.mjs']:[]),
     ...(pin.kind==='onPlayTopFilterBottomDiscard'?['tests/v2-cross-title-top-filter-round13.test.mjs']:[]),
     ...(pin.kind==='readyOnFirstBlock'?['tests/v2-ready-on-block-round14.test.mjs']:[]),
     ...(pin.kind==='frontOnceBpDown'||pin.kind==='frontOnceDiscardBpDown'?['tests/v2-single-bp-target-round14.test.mjs']:[]),
     ...(pin.kind==='nameAliasDrawDiscard'||pin.kind==='nameAliasOnly'||pin.kind==='nameAliasStep'?['tests/v2-name-alias-round14.test.mjs']:[]),
     ...(pin.kind==='nameAliasActiveIfTrait'?['tests/v2-conditional-entry-active-round15.test.mjs']:[]),
     ...(pin.kind==='nameAliasStepBothNamesColorRest'?['tests/v2-sao-012-color-rest.test.mjs']:[]),
     ...(pin.kind==='fieldRestEnergyRetireEndMain'?['tests/v2-field-energy-retire-round15.test.mjs']:[]),
     ...(pin.kind==='ownTraitEnergy'||pin.kind==='ownTurnTraitBp'?['tests/v2-zero-engine-round15.test.mjs']:[]),
     ...(pin.kind==='ownTraitImpact'?['tests/v2-conditional-impact-round16.test.mjs']:[]),
     ...(pin.kind==='nameAliasOnly'||pin.kind==='nameAliasStep'?['tests/v2-zero-engine-round14.test.mjs']:[]),
     'tests/universal-v2-sao-mst-cross-title.test.mjs'
    ]),
    ...(def.implementation==='vanilla'?{verifiedNoExtraEffects:true}:{})
   })
  });
 });
}
