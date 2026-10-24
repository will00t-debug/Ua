// V2-D SAO: manually enumerated, official-text-gated first batch.
// Importing data never grants unsupported card IDs playability.
import {SAO_OFFICIAL_CARDS} from '../sao-official-import.mjs';
import {createUniversalPack} from './pack.mjs';
import {SAO_Q1208_ASUNA_AURA,SAO_Q978_SELF_EVENT_TAX} from './selection-hand-tax.mjs';

const PRINTED_PINS=Object.freeze({
 "SAO-2-063":{"kind":"stepNamedOutsideOnPlayDraw",
  "nameJa":"アスナ","color":"green","energy":3,"ap":1,"bp":3000,"gen":3,
  "type":"character","trigger":null,"traits":["ALO"],
  "effectJa":"【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）\n【登場時】自分の場外に〈ユウキ〉と〈マザーズ・ロザリオ〉が合計2枚以上ある場合、カードを1枚引く。"},
 "SAO-1-100":{"kind":"conditionalNamedOutsideBounceRetireEvent",
  "nameJa":"マザーズ・ロザリオ","color":"green","energy":4,"ap":1,"bp":0,"gen":0,
  "type":"event","trigger":"special","traits":[],
  "effectJa":"BP5000以下の相手のフロントLのキャラを1枚選び、『手札に戻す』。自分の場外に〈ユウキ〉と〈マザーズ・ロザリオ〉が合計3枚以上ある場合、『退場させる』に代わる。"},
 "SAO-1-071":{"kind":"ownOutsideNamedFourSixEightRaidAsuna",
  "nameJa":"アスナ","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,
  "type":"character","trigger":"raid","traits":["ALO"],
  "effectJa":"【レイド】〈アスナ〉アクティブにし、フロントLに移動できる\n自分の場外にある〈ユウキ〉と〈マザーズ・ロザリオ〉の合計枚数により、このキャラは以下の効果を全て得る。\n・4枚以上：【アタック時】カードを1枚まで引く。\n・6枚以上：【自分のターン中】このキャラはBP+1000と【ダメージ（2）】\n・8枚以上：このキャラはBP3000以下のキャラにブロックされない。"},
 "SAO-1-070":{"kind":"ownOutsideNamedFourSixAsuna",
  "nameJa":"アスナ","color":"green","energy":3,"ap":1,"bp":3500,"gen":1,
  "type":"character","trigger":null,"traits":["ALO"],
  "effectJa":"自分の場外にある〈ユウキ〉と〈マザーズ・ロザリオ〉の合計枚数により、このキャラは以下の効果を全て得る。\n・4枚以上：【自分のターン中】このキャラはBP+500。\n・6枚以上：【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）"},

 "SAO-1-087":{"kind":"raidOtherOwnWinDamageMainSelectionTax",
  "nameJa":"キリト","color":"green","energy":7,"ap":1,"bp":5000,"gen":1,
  "type":"character","trigger":"raid","traits":["GGO"],"effectJa":"【レイド】〈キリト〉アクティブにし、フロントLに移動できる\n【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）\n自分の場の他のキャラがバトルに勝利した時、このキャラはこのターン中、【ダメージ（2）】を得る。\n【相手のターン中】相手はイベントカードの効果でこのキャラを選ぶ際に、追加で自身の手札を1枚場外に置かないと選べない。\n【起動メイン】【ターン1】自分の場の他のキャラを1枚選び、このターン中、BP+1000。"},
 "SAO-2-064":{"kind":"frontNamedSelectionHandTax",
  "nameJa":"キリト","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,
  "type":"character","trigger":"draw","traits":["ALO"],"effectJa":"【フロントLにある場合】自分の場の〈アスナ〉は「【相手のターン中】相手はキャラの効果やイベントカードの効果でこのキャラを選ぶ際に、追加で自身の手札を1枚場外に置かないと選べない。」を得る。〈キリト〉のこの効果は重複しない。"},
  // R44 exact printed full text, no inference from a partial keyword hit.
  "SAO-2-069":{"kind":"raidBothAttackEndRetireFreeRestAsuna",
   "nameJa":"ユウキ","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,
   "type":"character","trigger":"raid","traits":["ALO"],"effectJa":"【レイド】〈ユウキ〉アクティブにし、フロントLに移動できる\n自分と相手のアタックフェイズ終了時、このキャラを退場させる。\n【登場時】BP4000以下の相手のフロントLのキャラを1枚まで選び、退場させる。\n【退場時】自分の手札から必要エナジーが3以下で消費APが1の緑の〈アスナ〉を1枚まで自分の場にレストで登場させる。"},
 "SAO-2-068":{"kind":"mainRestDiscardRetireFreeActiveAsuna",
  "nameJa":"ユウキ","color":"green","energy":2,"ap":1,"bp":2000,"gen":1,
  "type":"character","trigger":"active","traits":["ALO"],
  "effectJa":"【起動メイン】【レストにする】 【手札を1枚場外に置く】 【このカードを退場させる】自分の手札から必要エナジーが3以下で消費APが1の緑の〈アスナ〉を1枚まで自分の場にアクティブで登場させ、そのキャラはこのターン中、BP+1000。"},
  // Q1207: scoped grant to actually free-ACTIVE-entered character; SPECIAL independently retires.
  "SAO-2-060":{"kind":"outsideRecoverActiveProtected","nameJa":"smile for you",
   "color":"purple","energy":4,"ap":1,"bp":0,"gen":0,"type":"event",
   "trigger":"special","traits":["歌"],
   "effectJa":"自分の場外からキャラカードを1枚まで手札に加える。自分の手札から消費APが1の紫の［特徴：SAOサバイバー］を1枚まで自分の場にアクティブで登場させる。そのキャラに次の自分のターン開始時まで、「このキャラは、相手のキャラの効果で選ばれない。」を与える。"},
  // Q1206: protection prohibits explicit choice by ALL opponent effects;
  // whole EVENT includes Asuna-only optional AP ACTIVE and ACTIVE LIFE.
  "SAO-2-058":{"kind":"grantOwnFrontChoiceProtection",
   "nameJa":"ペンダント・オブ・アニオライト",
   "color":"purple","energy":2,"ap":1,"bp":0,"gen":0,"type":"event",
   "trigger":"active","traits":[],
   "effectJa":"自分のフロントLのキャラを1枚選び、次の自分のターン開始時まで、「このキャラは、相手の効果で選ばれない。」を与える。選んだキャラが〈アスナ〉の場合、自分のAPカードを1枚まで選び、アクティブにする。"},

  "SAO-2-056":{"kind":"retireCharacterTopProgressive","nameJa":"茅場 晶彦",
   "color":"purple","energy":2,"ap":1,"bp":0,"gen":1,"type":"field",
   "traits":["プログレッシブ"],"trigger":"get",
   "effectJa":"【登場時】自分の場のキャラを1枚退場させてもよい。そうした場合、自分の山札の上から5枚見る。その中から［特徴：プログレッシブ］を2枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。"},
  "SAO-1-056":{"kind":"onPlayChoiceTopOrHandRest","nameJa":"ユイ","color":"blue","energy":3,
   "ap":1,"bp":2000,"gen":1,"type":"character","trigger":"draw","traits":["ALO"],
   "effectJa":"【登場時】以下から1つを選ぶ。\n・自分の山札の上から2枚見る。その中からキャラカードかフィールドカードを1枚まで公開し手札に加え、残りを望む順で自分の山札の下に置く。\n・自分の手札から必要エナジーが2以下で消費APが1の青のキャラカードを1枚まで自分の場にレストで登場させる。"},
 "SAO-2-074":{"kind":"nextHandApDiscount","nameJa":"トンキー","color":"green","energy":3,"ap":1,"bp":0,"gen":1,"type":"field","trigger":"active","traits":["ALO"],"effectJa":"【登場時】このターン中、次に手札から使用する元々のBPが3500の［特徴：ALO］の消費APを-1する。"},
 "SAO-1-031":{"kind":"onPlayTopTwoBottom","nameJa":"三人の思い出",
  "color":"yellow","energy":3,"ap":1,"bp":0,"gen":0,"type":"event",
  "trigger":"draw","traits":[],
  "effectJa":"自分の山札の上から5枚見る。その中から〈キリト〉か〈アリス〉か〈ユージオ〉を2枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。"},
 "SAO-1-066":{"kind":"onPlayTopTwoBottom","nameJa":"妖精たちの国",
  "color":"blue","energy":2,"ap":1,"bp":0,"gen":0,"type":"event",
  "trigger":"draw","traits":[],
  "effectJa":"自分の山札の上から4枚見る。その中から［特徴：ALO］を2枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。"},
 "SAO-1-005":{"kind":"onPlayTopFilterBottomDiscard","nameJa":"ユージオ",
  "color":"yellow","energy":2,"ap":1,"bp":3000,"gen":1,"type":"character",
  "trigger":null,"traits":[],"effectJa":"【登場時】自分の山札の上から4枚見る。その中から〈キリト〉か〈アリス〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。"},
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
  "SAO-1-007": {
    "kind": "restSelfBuffOther",
    "nameJa": "シリカ",
    "color": "yellow",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["ALO"],
    "effectJa": "【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。"
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
  "SAO-1-079": {
    "kind": "onRetireBuffOne",
    "nameJa": "ユウキ",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "traits": ["ALO"],
    "effectJa": "【退場時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。"
  },
  "SAO-1-017": {
    "kind": "oppBpImpact",
    "nameJa": "ベルクーリ・シンセシス・ワン",
    "color": "yellow",
    "energy": 5,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": ["整合騎士"],
    "effectJa": "相手の場にBP4000以上のキャラがある場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。"
  },
  "SAO-2-065": {
    "kind": "nameAbsentBp",
    "nameJa": "クライン",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 3500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": ["ALO"],
    "effectJa": "自分の場に〈フレイヤ〉がない場合、このキャラはBP-500。"
  },
  "SAO-1-043": {
    "kind": "onPlayOutsideNameRest",
    "nameJa": "シリカ",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "traits": ["アインクラッド"],
    "effectJa": "【登場時】自分の場外から〈ピナ〉を1枚まで自分の場にレストで登場させる。"
  },
  "SAO-2-034": {
    "kind": "onAttackOptionalMill",
    "nameJa": "エイジ",
    "color": "purple",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "traits": ["SAOサバイバー"],
    "effectJa": "【アタック時】自分の山札の上から1枚まで場外に置く。"
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
  },
  "SAO-1-015": {
    "kind": "opponentFieldHandEnergy",
    "nameJa": "デュソルバート・シンセシス・セブン",
    "color": "yellow",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": null,
    "traits": ["整合騎士"],
    "effectJa": "相手の場に青か緑のカードがある場合、手札にあるこのカードの必要エナジーを【黄×1】減らす。"
  },
  "SAO-1-050": {
    "kind": "opponentFieldHandEnergy",
    "nameJa": "アリシャ・ルー",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": null,
    "traits": ["ALO"],
    "effectJa": "相手の場に黄か緑のカードがある場合、手札にあるこのカードの必要エナジーを【青×1】減らす。"
  },
  "SAO-1-092": {
    "kind": "opponentFieldHandEnergy",
    "nameJa": "シュピーゲル",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": null,
    "traits": ["GGO"],
    "effectJa": "相手の場に黄か青のカードがある場合、手札にあるこのカードの必要エナジーを【緑×1】減らす。"
  },
  "SAO-1-090": {
    "kind": "conditionalSelfBpImpact",
    "nameJa": "シノン",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": "color",
    "traits": ["GGO"],
    "effectJa": "このキャラのBPが4000以上の場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。"
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
  if(pin.kind==='raidOtherOwnWinDamageMainSelectionTax'){
   card.raidName='キリト';
   card.printedImpact=1;
   card.otherOwnBattleWonDamageTwo=true;
   card.selectionHandDiscardTax={...SAO_Q978_SELF_EVENT_TAX,
    sourceTypes:[...SAO_Q978_SELF_EVENT_TAX.sourceTypes]};
   card.mainAbility={op:'fieldOnceBuffOther',lines:'field',
    oncePerTurn:true,bp:1000};
   card.effects={};
  }
  if(pin.kind==='frontNamedSelectionHandTax'){
   card.selectionHandDiscardTax={...SAO_Q1208_ASUNA_AURA,
    sourceTypes:[...SAO_Q1208_ASUNA_AURA.sourceTypes]};
   card.effects={};
  }
  if(pin.kind==='stepNamedOutsideOnPlayDraw'){
   card.step=true;
   card.effects={onPlay:[{op:'drawIfOwnOutsideNamedCountAtLeast',min:2,
    names:['ユウキ','マザーズ・ロザリオ'],count:1}]};
  }
  if(pin.kind==='conditionalNamedOutsideBounceRetireEvent'){
   card.effects={onPlay:[{op:'conditionalBounceOrRetireByOwnOutsideNames',
    bp:5000,min:3,names:['ユウキ','マザーズ・ロザリオ']}]};
   card.triggerEffect={op:'retireOppFront'};
  }
  if(pin.kind==='ownOutsideNamedFourSixEightRaidAsuna'){
   const names=['ユウキ','マザーズ・ロザリオ'];
   card.raidName='アスナ';
   card.effects={onAttack:[{op:'drawIfOwnOutsideNamedCountAtLeast',
    min:4,count:1,names,optional:true}]};
   card.passiveBonuses=[{condition:{
    kind:'ownOutsideNamedCountAtLeast',turn:'own',min:6,names},
    bp:1000,extraDamage:1}];
   card.blockBpRestriction={relation:'atMost',bp:3000,
    condition:{kind:'ownOutsideNamedCountAtLeast',turn:'any',min:8,names}};
  }
  if(pin.kind==='ownOutsideNamedFourSixAsuna'){
   card.effects={};
   const names=['ユウキ','マザーズ・ロザリオ'];
   card.passiveBonuses=[
    {condition:{kind:'ownOutsideNamedCountAtLeast',turn:'own',min:4,names},bp:500},
    {condition:{kind:'ownOutsideNamedCountAtLeast',turn:'any',min:6,names},impact:1}
   ];
  }
  if(pin.kind==='nextHandApDiscount')card.effects={onPlay:[{op:'nextEligibleHandPlayApDiscount',filter:{printedBp:3500,trait:'ALO'}}]};
  if(pin.kind==='grantOwnFrontChoiceProtection')
   card.effects={onPlay:[{op:'grantOwnFrontChoiceProtection',optional:false,
    scope:'any',until:'nextOwnStart',apRecoveryOnName:'アスナ'}]};
  if(pin.kind==='raidBothAttackEndRetireFreeRestAsuna'){
   // Core Raid placement/LIFE uses the universal Raid entry/trigger engine.
   card.raidName='ユウキ';
   card.phaseEffects=['own','opponent'].map(turn=>({
    phase:'attack',edge:'end',turn,then:[{op:'retireSourceOnPhaseEnd'}]}));
   card.effects={
    onPlay:[{op:'retireOppFrontOneUnderBp',bp:4000,optional:true}],
    onRetire:[{op:'deployNamedFromZones',name:'アスナ',zones:['hand'],line:'any',
     ready:false,optional:true,color:'green',ap:1,maxEnergy:3}]
   };
  }
  if(pin.kind==='mainRestDiscardRetireFreeActiveAsuna'){
   card.effects={};
   card.mainAbility={op:'restDiscardRetireThen',lines:'field',discardCount:1,
    then:[{op:'deployNamedFromZones',name:'アスナ',zones:['hand'],
     line:'any',ready:true,optional:true,color:'green',ap:1,maxEnergy:3,grantBp:1000}]};
  }
  if(pin.kind==='outsideRecoverActiveProtected'){
   card.effects={onPlay:[
    {op:'recoverOutsideOne',filter:{field:'type',value:'character'},optional:true},
    {op:'deployOwnHandSpecial',type:'character',color:'purple',ap:1,
     trait:'SAOサバイバー',maxEnergy:null,ready:true,max:1,
     protectionScope:'character'}]};
   card.triggerEffect={op:'retireOppFront'};
  }
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
  // 1枚まで is optional. The card has already left, so it is not a target.
  // Front and energy characters both count as 自分の場.
  if(pin.kind==='onRetireBuffOne')
   card.effects={onRetire:[{op:'buffOwnField',filter:{field:'type',value:'character'},
    bp:1000,optional:true,excludeSelf:true}]};
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
  // SAO-2-065 printed BP is 3500-. The penalty is live while 〈フレイヤ〉 is
  // absent from this card's own field. No 自分のターン中. A later silence
  // removes the penalty because it is printed text, not a gained buff.
  // Q749: current BP, including a bonus from an effect, not only the printed
  // number. 相手の場 is the opponent's front and energy lines. No turn limit.
  if(pin.kind==='oppBpImpact'){
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'oppCharacterBpAtLeast',turn:'any',
    zone:'field',minBp:4000},impact:1}];
  }
  if(pin.kind==='nameAbsentBp'){
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'ownNameAbsent',turn:'any',
    zone:'field',excludeSelf:false,name:'フレイヤ'},bp:-500}];
  }
  // SAO-1-043 names 〈ピナ〉 only. Energy, color, and AP are not printed filters.
  if(pin.kind==='onPlayOutsideNameRest')
   card.effects={onPlay:[{op:'deployOutsideNameRest',name:'ピナ',optional:true}]};
  // SAO-2-034 is up to one card. The existing mill stays mandatory without optional.
  if(pin.kind==='onAttackOptionalMill')
   card.effects={onAttack:[{op:'millTop',count:1,optional:true}]};
  // No ターン1. REST this card, then one other own character on either line.
  if(pin.kind==='restSelfBuffOther'){
   card.effects={};
   card.mainAbility={op:'restSelfBuffOther',bp:1000};
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
  if(pin.kind==='retireCharacterTopProgressive'){
   card.effects={onPlay:[{op:'optionalRetireThenProgram',optional:true,
    cardType:'character',after:[{op:'searchTopUpToTwoBottom',count:5,
     max:2,rest:'bottom',filters:[{field:'trait',value:'プログレッシブ'}],
     logic:'any'}]}]};
  }
  if(pin.kind==='onPlayChoiceTopOrHandRest'){
   card.effects={onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'topTwo',label:'查看牌庫頂 2 張並最多取得一張角色或 FIELD',
     turn:'any',then:[{op:'searchTopUpToTwoBottom',count:2,max:1,
      rest:'bottom',filters:[{field:'type',value:'character'},
       {field:'type',value:'field'}],logic:'any'}]},
    {id:'freeRest',label:'從手牌免費 REST 登場最多一張藍色角色',
     turn:'any',then:[{op:'deployOwnHandRest',type:'character',
      color:'blue',energy:2,ap:1,max:1}]}
   ]}]};
  }
  if(pin.kind==='onPlayTopTwoBottom'){
   const spec=id==='SAO-1-031'?
    {count:5,filters:[{field:'name',value:'キリト'},
     {field:'name',value:'アリス'},{field:'name',value:'ユージオ'}]}:
    id==='SAO-1-066'?{count:4,filters:[{field:'trait',value:'ALO'}]}:null;
   if(!spec)throw Error(id+' missing audited printed TOP-N double-pick');
   card.templateEffects={onPlay:[{template:'searchTopUpToTwoBottom',...spec,logic:'any'}]};
  }
  if(pin.kind==='onPlayTopFilterBottomDiscard'){
   const spec={
    'SAO-1-005':{count:4,filters:[{field:'name',value:'キリト'},
     {field:'name',value:'アリス'}],logic:'any'},
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
  // Official generated energy is the double pip (黄黄 / 青青 / 緑緑 = 2).
  // Required energy stays 3. Discount colors are the two other printed colors.
  if(pin.kind==='opponentFieldHandEnergy'){
   const colors={
    'SAO-1-015':['blue','green'],
    'SAO-1-050':['yellow','green'],
    'SAO-1-092':['yellow','blue']
   }[id];
   if(!colors)throw Error(id+' missing official opponent field colors');
   card.effects={};
   card.opponentFieldColorsHandEnergyDiscount={colors,amount:1};
  }
  // UA15BT/SAO-1-090 card text is only the current-BP Impact sentence.
  // COLOR life is the standard green hand deploy: energy at most 2, AP 1, ACTIVE.
  // Printed BP 3000 does not meet 4000 until a live bonus raises current BP.
  if(pin.kind==='conditionalSelfBpImpact'){
   if(id!=='SAO-1-090')throw Error(id+' missing official self-BP impact profile');
   card.effects={};
   card.conditionalImpactBpAtLeast=4000;
   card.triggerEffect={op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1};
  }
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
     ...(pin.kind==='stepNamedOutsideOnPlayDraw'?['tests/v2-r53-sao063-real-print.test.mjs']:[]),
     ...(pin.kind==='conditionalNamedOutsideBounceRetireEvent'?['tests/v2-r52-sao100-real-event.test.mjs']:[]),
     ...(pin.kind==='ownOutsideNamedFourSixAsuna'?['tests/v2-r52-sao070-real-passives.test.mjs']:[]),
     ...(pin.kind==='ownOutsideNamedFourSixEightRaidAsuna'?['tests/v2-r54-sao071-real-multithreshold.test.mjs']:[]),
     ...(pin.kind==='nextHandApDiscount'?['tests/v2-r36-real-discount-cards.test.mjs']:[]),
     ...(pin.kind==='frontNamedSelectionHandTax'?['tests/v2-r46-sao064-full-print.test.mjs']:[]),
     ...(pin.kind==='raidOtherOwnWinDamageMainSelectionTax'?
      ['tests/v2-r47-sao087-official-candidate.test.mjs']:[]),
     ...(pin.kind==='grantOwnFrontChoiceProtection'?['tests/v2-r40-sao058-full-print-probe.test.mjs']:[]),
     ...(pin.kind==='outsideRecoverActiveProtected'?['tests/v2-r41-sao060-full-print.test.mjs']:[]),
     ...(pin.kind==='mainRestDiscardRetireFreeActiveAsuna'?['tests/v2-r43-sao068-full-print.test.mjs']:[]),
     ...(pin.kind==='raidBothAttackEndRetireFreeRestAsuna'?['tests/v2-r44-sao069-full-print.test.mjs']:[]),
     'tests/universal-v2-sao-port.test.mjs',
      ...(def.id==='SAO-1-034'?['tests/v2-sao-034-official.test.mjs']:[]),
     ...(def.id==='SAO-2-021'?['tests/v2-sao-021-shared-main-cost.test.mjs']:[]),
     ...(pin.kind==='onRetireDrawOne'?['tests/v2-sao-retire-draw-shared.test.mjs']:[]),
     ...(pin.kind==='opponentTurnBp1000'?['tests/v2-sao-014-opponent-bp.test.mjs']:[]),
     ...(pin.kind==='ownTurnHandFiveBp'?['tests/v2-sao-057-hand-count-bp.test.mjs']:[]),
     ...(pin.kind==='ownLifeAtMostFourBp500'?['tests/v2-sao-020-life-threshold-bp.test.mjs']:[]),
     ...(pin.kind==='impactNullOwnTurnHandFiveBp1000'?['tests/v2-sao-051-hand-impact-null.test.mjs']:[]),
     ...(pin.kind==='ownTurnSilicaFieldBp'?['tests/v2-sao-019-own-silica-bp.test.mjs']:[]),
     ...(pin.kind==='onPlayTopTwoBottom'?['tests/v2-r37-sao-two-events.test.mjs']:[]),
      ...(pin.kind==='onPlayChoiceTopOrHandRest'?['tests/v2-r39-sao056-official.test.mjs']:[]),
      ...(pin.kind==='retireCharacterTopProgressive'?['tests/v2-r39-retire-search-real.test.mjs']:[]),
     ...(pin.kind==='onPlayTopFilterBottomDiscard'?
        [def.id==='SAO-1-005'?'tests/v2-r31-sao005-official-registry.test.mjs':
        'tests/v2-cross-title-top-filter-round13.test.mjs']:[]),
     ...(pin.kind==='readyOnFirstBlock'?['tests/v2-ready-on-block-round14.test.mjs']:[]),
     ...(pin.kind==='frontOnceBpDown'||pin.kind==='frontOnceDiscardBpDown'?['tests/v2-single-bp-target-round14.test.mjs']:[]),
     ...(pin.kind==='nameAliasDrawDiscard'||pin.kind==='nameAliasOnly'||pin.kind==='nameAliasStep'?['tests/v2-name-alias-round14.test.mjs']:[]),
     ...(pin.kind==='nameAliasActiveIfTrait'?['tests/v2-conditional-entry-active-round15.test.mjs']:[]),
     ...(pin.kind==='nameAliasStepBothNamesColorRest'?['tests/v2-sao-012-color-rest.test.mjs']:[]),
     ...(pin.kind==='fieldRestEnergyRetireEndMain'?['tests/v2-field-energy-retire-round15.test.mjs']:[]),
     ...(pin.kind==='ownTraitEnergy'||pin.kind==='ownTurnTraitBp'?['tests/v2-zero-engine-round15.test.mjs']:[]),
     ...(pin.kind==='ownTraitImpact'?['tests/v2-conditional-impact-round16.test.mjs']:[]),
     ...(pin.kind==='restSelfBuffOther'?['tests/v2-rest-buff-other-round16.test.mjs']:[]),
     ...(pin.kind==='nameAliasOnly'||pin.kind==='nameAliasStep'?['tests/v2-zero-engine-round14.test.mjs']:[]),
     ...(pin.kind==='opponentFieldHandEnergy'||pin.kind==='conditionalSelfBpImpact'?
      ['tests/v2-c2-hand-energy-register.test.mjs']:[]),
     'tests/universal-v2-sao-mst-cross-title.test.mjs'
    ]),
    ...(def.implementation==='vanilla'?{verifiedNoExtraEffects:true}:{})
   })
  });
 });
}
