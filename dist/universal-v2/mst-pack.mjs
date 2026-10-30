// V2-D MST: curated official-text-locked pilots; no implicit engine compatibility.
// Source copies are isolated under ./sources, not merged into Production records.
import {MST_V2_OFFICIAL_CATALOGUE} from './sources/mst-inventory.mjs';
import {createUniversalPack} from './pack.mjs';
import {parseNamedFieldRetireBonus} from './ability-templates.mjs';

const PRINTED_PINS=Object.freeze({
 "MST-1-005":{kind:"emptyFieldImpactOwnEffectBp",
  nameJa:"エリス",color:"blue",energy:2,ap:1,bp:2500,gen:1,
  type:"character",traits:[],trigger:null,
  effectJa:"自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを 〖青×2〗 減らす。\n 〖インパクト無効〗 （このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）\n 〖自分のターン中〗 このターン中に自分の効果でキャラカードを〔登場させるかレイドさせている〕場合、このキャラはBP+500。"},
 "MST-1-014":{kind:"emptyFieldSameLineEventTop",
  nameJa:"シルフィエット",color:"blue",energy:2,ap:1,bp:1500,gen:1,
  type:"character",traits:[],trigger:"draw",
  effectJa:"自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを 〖青×2〗 減らす。\n 〖自分のターン中〗 このターン中に自分がイベントカードを使用していて、同じラインに〈ルーデウス〉がある場合、このキャラはBP+1500。\n 〖登場時〗 自分の山札の上から2枚見て、1枚まで場外に置き、残りを望む順で山札の上に置く。"},
 "MST-1-021":{kind:"namedHandRestOrRaidThenNamesActive",
  nameJa:"ルイジェルド",color:"blue",energy:4,ap:2,bp:4000,gen:1,
  type:"character",traits:[],trigger:"draw",
  effectJa:"〖登場時〗 自分の手札から必要エナジーが3以下で消費APが1の青の〔〈ルーデウス〉か〈エリス〉か〈ルイジェルド〉〕を1枚まで自分の場にレストで登場させるかレイドさせる。\n 〖起動メイン〗 〖ターン1〗 自分の場に〈ルーデウス〉と〈エリス〉がある場合のみ発動できる。このキャラをアクティブにする。"},
 "MST-1-035":{kind:"optionalDrawPerOwnNames",
  nameJa:"お前は戦士だ",color:"blue",energy:4,ap:1,bp:0,gen:0,
  type:"event",traits:[],trigger:"draw",
  effectJa:"以下から3つまで選ぶ。\n・自分の場に〈ルーデウス〉がある場合、カードを1枚引く。\n・自分の場に〈エリス〉がある場合、カードを1枚引く。\n・自分の場に〈ルイジェルド〉がある場合、カードを1枚引く。"},
 "MST-1-036":{kind:"namedPlayOutsideEventPairRetire",
  nameJa:"豪雷積層雲",color:"blue",energy:5,ap:1,bp:0,gen:0,
  type:"event",traits:[],trigger:"special",
  effectJa:"このカードは自分の場に〈ロキシー〉がある場合のみ使用できる。\n自分の場外にあるイベントカード2枚につき、全ての場所でこのカードの必要エナジーを 〖青×1〗 減らす。\nBP5000以下の相手のフロントLのキャラを1枚選び、退場させる。"},
 "MST-1-058":{kind:"impactNullAllTraitEnergyBuff",
  nameJa:"ザノバ＆ジュリエット",color:"green",energy:5,ap:1,bp:4000,gen:0,
  type:"character",traits:["ラノア魔法大学"],trigger:"active",
  effectJa:"〖インパクト無効〗 （このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）\n 〖起動メイン〗 〖ターン1〗 自分の発生エナジーが7以上あり、自分の場のキャラが全て［特徴：ラノア魔法大学］の場合のみ発動できる。このキャラは次の自分のターン開始時まで、BP+500。"},
 "MST-1-028":{kind:"lookTopTwoNameOrLowEventOutside",
  nameJa:"ロキシー",color:"blue",energy:1,ap:1,bp:1500,gen:1,
  type:"character",traits:[],trigger:"active",
  effectJa:"〖登場時〗 自分の山札の上から2枚見て、〈ルーデウス〉か〈ロキシー〉か必要エナジーが2以下のイベントカードを1枚まで公開し手札に加える。残りを場外に置く。手札に加えた場合、自分の手札を1枚場外に置く。"},
 "MST-1-030":{kind:"restChooseIfEventUsed",
  nameJa:"ロキシー",color:"blue",energy:3,ap:1,bp:3000,gen:2,
  type:"character",traits:[],trigger:null,
  effectJa:"〖起動メイン〗 〖レストにする〗 このターン中に自分がイベントカードを使用している場合のみ発動できる。以下から1つ選ぶ。\n・自分の場のキャラを1枚選び、このターン中、BP+1000。\n・カードを1枚引き、自分の手札を1枚場外に置く。"},
 "MST-1-040":{kind:"roxyHandRestOrRaidDrawMove",
  nameJa:"私がついていますから",color:"blue",energy:2,ap:1,bp:0,gen:0,
  type:"event",traits:[],trigger:"color",
  effectJa:"このカードは自分の場に〈ロキシー〉がある場合のみ使用できる。\n自分の手札から必要エナジーを満たし消費APが1の青の〔〈ルーデウス〉か〈ロキシー〉〕を1枚まで自分の場にレストで登場させるかレイドさせる。カードを1枚引く。自分の場の〈ルーデウス〉を1枚まで選び、別のラインに移動させる。"},
 "MST-1-048":{kind:"optionalFieldRetireActiveOutsideDiscard",
  nameJa:"パウロ",color:"green",energy:5,ap:1,bp:4000,gen:1,
  type:"character",traits:[],trigger:"active",
  effectJa:"〖登場時〗 自分の場のフィールドを1枚退場させてもよい。そうした場合、このキャラをアクティブにする。\n 〖アタック時〗 自分の場外にフィールドカードが6枚以上ある場合、自分の手札を1枚場外に置いてもよい。そうした場合、このキャラをアクティブにする。〈パウロ〉のこの効果は1ターンに1回のみ発動できる。"},
 "MST-1-008":{"kind":"unblockedDrawLoseReady","nameJa":"エリス","color":"blue","energy":3,"ap":1,"bp":3000,"gen":1,"type":"character","traits":[],"trigger":"raid","effectJa":"〖レイド〗 〈エリス〉アクティブにし、フロントLに移動できる\nこのキャラのアタックがブロックされなかった時、カードを1枚まで引く。\n 〖ターン1〗 このキャラがアタックしてバトルに敗北した時、このキャラをアクティブにし、このキャラはこのターン中、BP+2000。"},
 "MST-1-025":{"kind":"raidReplayOrSniperStrip","nameJa":"ルーデウス","color":"blue","energy":4,"ap":1,"bp":4000,"gen":1,"type":"character","traits":[],"trigger":"raid","effectJa":"〖レイド〗 〈ルーデウス〉アクティブにし、フロントLに移動できる\n 〖登場時〗 自分の場のキャラを1枚まで選び、このターン中、BP+1000。\n 〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 以下から1つ選ぶ。\n・このキャラの 〖登場時〗 を発動する。\n・自分の場のレイド状態の〈エリス〉を1枚選び、このターン中、 〖狙い撃ち〗 を与え、このキャラの一番上のカードを場外に置く。"},
 "MST-1-026":{"kind":"frontLockAttackChoice","nameJa":"ルーデウス","color":"blue","energy":3,"ap":1,"bp":4000,"gen":2,"type":"character","traits":[],"trigger":"get","effectJa":"このカードはフロントLに登場できず、自分の効果以外で移動できない。\n 〖アタック時〗 以下から1つ選ぶ。\n・自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。\n・カードを1枚引く。\n・このターン中に自分が〈豪雷積層雲〉を使用している場合、このキャラはこのターン中、 〖インパクト（1）〗 を得る。"},
 "MST-1-032":{"kind":"outsideEnergyDualFront","nameJa":"ロキシー","color":"blue","energy":4,"ap":1,"bp":4000,"gen":1,"type":"character","traits":[],"trigger":"raid","effectJa":"〖レイド〗 〈ロキシー〉アクティブにし、フロントLに移動できる\n 〖登場時〗 自分の場外から必要エナジーが2以下のカードを1枚まで手札に加える。\n 〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 このターン中に自分がイベントカードを使用している場合のみ発動できる。自分の場の必要エナジーが3以下のキャラを1枚選び、アクティブにする。\n 〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 自分の場の〈ルーデウス〉を1枚選び、別のラインに移動させる。"},
 "MST-1-033":{"kind":"fieldSearchRestDeploy","nameJa":"デッドエンド","color":"blue","energy":2,"ap":1,"bp":0,"gen":1,"type":"field","traits":[],"trigger":"draw","effectJa":"〖登場時〗 自分の山札の上から3枚見て、〈ルーデウス〉か〈エリス〉か〈ルイジェルド〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。\n 〖起動メイン〗 〖レストにする〗 〖このカードを退場させる〗 自分の手札から必要エナジーが3以下で消費APが1の青のキャラカードを1枚自分の場にレストで登場させるかレイドさせる。"},
 "MST-1-038":{"kind":"buffApOutsideReturn","nameJa":"師匠からのおくりもの","color":"blue","energy":2,"ap":1,"bp":0,"gen":0,"type":"event","traits":[],"trigger":"draw","effectJa":"自分の場のキャラを1枚選び、このターン中、BP+1000。自分の場に〈ロキシー〉がある場合、自分のAPカードを1枚アクティブにする。\n 〖起動メイン〗 〖場外にある場合〗 このターン中に自分の〈ルーデウス〉か〈ロキシー〉がレイドしていた場合のみ発動できる。自分の手札を1枚場外に置く。そうした場合、場外のこのカードを手札に加える。〈師匠からのおくりもの〉のこの効果は1ターンに1回のみ発動できる。"},
 "MST-1-039":{"kind":"erisSniperOrOutsideRudeus","nameJa":"ルーデウスはすごいのよ！","color":"blue","energy":3,"ap":1,"bp":0,"gen":0,"type":"event","traits":[],"trigger":"special","effectJa":"以下から1つ選ぶ。\n・自分の場の〈エリス〉を1枚選び、このターン中、BP+500と 〖狙い撃ち〗 （相手のフロントLのキャラを指定してアタックでき、その場合ブロックされない）を与える。\n・自分の場に〈エリス〉がある場合、自分の場外から消費APが1の青の〈ルーデウス〉を1枚まで自分の場にレストで登場させるかレイドさせる。"},
 "MST-1-067":{"kind":"aliasProtectRaidBase","nameJa":"フィッツ","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,"type":"character","traits":["ラノア魔法大学"],"trigger":"raid","effectJa":"このカードは〈シルフィエット〉としても扱う。\n 〖レイド〗 〈シルフィエット〉アクティブにし、フロントLに移動できる\n 〖登場時〗 自分の場の元々の発生エナジーが1以上の［特徴：ラノア魔法大学］を1枚まで選び、次の自分のターン開始時まで、「このキャラは相手の効果で選ばれない。」を与える。\n 〖退場時〗 このキャラのレイド元のカードを1枚まで自分の場にレストで登場させるか手札に加える。"},
 "MST-1-068":{"kind":"aliasEnergyImpactChoice","nameJa":"フィッツ","color":"green","energy":5,"ap":1,"bp":4000,"gen":2,"type":"character","traits":["ラノア魔法大学"],"trigger":"raid","effectJa":"このカードは〈シルフィエット〉としても扱う。\n 〖レイド〗 〈シルフィエット〉アクティブにし、フロントLに移動できる\n自分の発生エナジーが7以上ある場合、このキャラは 〖インパクト（1）〗 を得る。\n 〖登場時〗 以下から1つ選ぶ。\n・自分の山札の上から5枚見て、［特徴：ラノア魔法大学］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。\n・相手のフロントLのキャラを1枚まで選び、エナジーLに移動させる。"},
 "MST-1-073":{"kind":"energyLockNamedActive","nameJa":"ルーデウス","color":"green","energy":4,"ap":1,"bp":4000,"gen":3,"type":"character","traits":["ラノア魔法大学"],"trigger":"get","effectJa":"このカードはエナジーLに〔登場・移動〕できず、自分の効果以外でアクティブにならない。\n 〖起動メイン〗 自分の発生エナジーが7以上ある場合のみ発動できる。このキャラをアクティブにする。カードを1枚引く。自分の場のキャラを1枚まで選び、このターン中、BP+2000。このキャラはこのターン中、「自分のアタックフェイズ終了時、このキャラをアクティブにする。」を得る。〈ルーデウス〉のこの効果は1ターンに1回のみ発動できる。"},
 "MST-1-009":{kind:"onOwnEffectEntryChooseTimedSelf",
  nameJa:"エリス",color:"blue",energy:3,ap:1,bp:3500,gen:1,
  type:"character",traits:[],trigger:"raid",
  effectJa:"〖レイド〗 〈エリス〉アクティブにし、フロントLに移動できる\n 〖インパクト（1）〗 （アタックしてバトルに勝利した時、相手に1ダメージ）\n 〖自分のターン中〗 このキャラはBP+500。\n 〖登場時〗 このキャラが自分の効果で登場していた場合、以下から1つ選ぶ。\n・このキャラは次の自分のターン開始時まで、BP+1000。\n・このキャラはこのターン中、「このキャラのアタック終了時、自分のエナジーLのキャラを1枚選び、このキャラと位置を入れ替えてもよい。」を得る。"},
 "MST-1-049":{"kind":"retireFieldActivateTopTraitless",
  "nameJa":"ルーデウス","color":"green","energy":4,"ap":1,"bp":4000,
  "gen":1,"type":"character","traits":[],"trigger":"get",
  "effectJa":"〖登場時〗 自分の場のフィールドを1枚退場させてもよい。そうした場合、このキャラをアクティブにし、自分の山札の上から4枚見て、特徴を持たない〔キャラカードかフィールドカード〕を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。"},
 "MST-1-031":{"kind":"ownTurnEventImpactDiscount","nameJa":"ロキシー","color":"blue","energy":4,"ap":1,"bp":4000,"gen":1,"type":"character","traits":[],"trigger":"raid","effectJa":"〖レイド〗 〈ロキシー〉アクティブにし、フロントLに移動できる\n 〖インパクト無効〗 （このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）\n 〖自分のターン中〗 このターン中に自分がイベントカードを使用している場合、このキャラは 〖インパクト（1）〗 を得る。\n 〖登場時〗 このターン中、次に手札から使用する必要エナジーが3以下のイベントカードの消費APを-1する。"},
 "MST-1-060":{
  "kind":"stepFrontMainDrawDiscardFrontEnergy","nameJa":"シルフィエット",
  "color":"green","energy":3,"ap":1,"bp":2500,"gen":2,"type":"character",
  "traits":["ラノア魔法大学"],"trigger":"get",
  "effectJa":"〖ステップ〗 （自分の移動フェイズにフロントLからエナジーLへ移動できる）\n 〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 カードを1枚引き、自分の手札を1枚場外に置く。自分のフロントLの他の［特徴：ラノア魔法大学］を1枚まで選び、このターン中、「このキャラはフロントLでもエナジーを発生させる。」を与える。"
 },
 "MST-1-080":{
  "kind":"eventDrawTwoFrontEnergy","nameJa":"そう、ボクはシルフィエット",
  "color":"green","energy":3,"ap":1,"bp":0,"gen":0,"type":"event",
  "traits":[],"trigger":"draw",
  "effectJa":"カードを2枚引く。自分のフロントLの［特徴：ラノア魔法大学］を1枚まで選び、このターン中、「このキャラはフロントLでもエナジーを発生させる。」を与える。"
 },
 "MST-1-062":{"kind":"nextHandApDiscount","nameJa":"ナナホシ","color":"green","energy":3,"ap":1,"bp":2000,"gen":2,"type":"character","trigger":"color","traits":["ラノア魔法大学"],"effectJa":"〖登場時〗 以下から1つ選ぶ。\n・〈ナナホシ〉以外の自分の場のキャラを1枚手札に戻してもよい。そうした場合、このターン中、次に手札から使用する元々の発生エナジーが2以上のキャラカードの消費APを-1する。\n・カードを1枚引く。"},
 "MST-1-059":{
  kind:"onPlayChooseTemporaryFrontEnergy",
  nameJa:"シルフィエット",color:"green",energy:2,ap:1,bp:3000,gen:1,
  type:"character",traits:["ラノア魔法大学"],trigger:null,
  effectJa:"〖登場時〗 以下から1つ選ぶ。\n・カードを1枚引き、自分の手札を1枚場外に置く。\n・自分のフロントLの他の［特徴：ラノア魔法大学］を1枚まで選び、このターン中、「このキャラはフロントLでもエナジーを発生させる。」を与える。"
 },

 "MST-1-011":{"kind":"frontOnceNamedBuff","nameJa":"ギレーヌ",
  "color":"blue","energy":4,"ap":1,"bp":4000,"gen":1,"type":"character",
  "traits":[],"trigger":null,
  "effectJa":"〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 自分の場の〈エリス〉を1枚選び、このターン中、BP+1000。"},
 "MST-1-064":{"kind":"enterActiveOptionalReturn","nameJa":"バーディガーディ",
  "color":"green","energy":5,"ap":2,"bp":4000,"gen":2,"type":"character",
  "traits":["ラノア魔法大学"],"trigger":"active",
  "effectJa":"このキャラはアクティブで登場させる。\n 〖退場時〗 このカードを手札に加えてもよい。"},
 "MST-1-078":{"kind":"namedFieldRetireBonus","nameJa":"守護術師フィッツ",
  "color":"green","energy":4,"ap":1,"bp":0,"gen":0,"type":"event",
  "traits":[],"trigger":"special",
  "effectJa":"『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈シルフィエット〉がある場合、『BP5000以下』に代わる。"},
 "MST-1-076":{
  kind:"fieldRetireOutsideTraitlessRestOrRaid",
  nameJa:"迷宮の守護者 マナタイトヒュドラ",
  color:"green",energy:3,ap:1,bp:0,gen:2,type:"field",traits:[],trigger:"special",
  effectJa:"〖退場時〗 自分の場外から必要エナジーが『1』以下で消費APが1の特徴を持たない緑のキャラカードを1枚まで自分の場にレストで登場させるかレイドさせる。自分の場外にある他のフィールドカード1枚につき、この効果で登場させるキャラの必要エナジーの範囲+1。",
  triggerEffectJa:"〖スペシャル〗 相手のフロントLのキャラを1枚選び、退場させる。"
 },

 "MST-1-074":{
  kind:"fieldCharacterRetireDrawAndRetireModes",nameJa:"転移の迷宮",
  color:"green",energy:2,ap:1,bp:0,gen:1,type:"field",traits:[],trigger:"get",
  effectJa:"〖登場時〗 自分の場のキャラを1枚退場させてもよい。そうした場合、カードを2枚引く。\n 〖退場時〗 以下から1つ選ぶ。\n・自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが1以下の緑の〈ロキシー〉を1枚まで自分の場にレストで登場させる。\n・自分の場外から〈迷宮の守護者 マナタイトヒュドラ〉を1枚まで手札に加える。"
 },
 "MST-1-053":{
  kind:"colorSiteMainRetireDraw",nameJa:"ロキシー",color:"green",
  energy:1,ap:1,bp:2500,gen:1,type:"character",traits:[],trigger:"color",
  effectJa:"〖相手のターン中〗 自分の緑の 〖カラートリガー〗 の効果に記載されている「キャラカード」を「フィールドカード」に代えてもよい。\n 〖登場時〗 カードを1枚引き、自分の手札を1枚場外に置く。\n 〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 自分の場のフィールドを1枚退場させてもよい。そうした場合、カードを1枚引く。",
  triggerEffectJa:"〖カラー〗 自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚自分の場にアクティブで登場させる。"
 },
 "MST-1-052":{
  kind:"onRetireDrawIfOwnField",nameJa:"ロキシー",color:"green",
  energy:0,ap:1,bp:2000,gen:1,type:"character",traits:[],trigger:null,
  effectJa:"〖退場時〗 自分の場にフィールドがある場合、カードを1枚引く。"
 },
 "MST-1-043":{
  kind:"onPlayTop5GreenFieldBottomDiscard",nameJa:"ギース",color:"green",
  energy:0,ap:1,bp:1500,gen:1,type:"character",traits:[],trigger:null,
  effectJa:"〖登場時〗 自分の山札の上から5枚見て、緑のフィールドカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。"
 },
 "MST-1-042":{
  kind:"retiredFieldReady",nameJa:"エリナリーゼ",color:"green",energy:4,ap:1,
  bp:4000,gen:1,type:"character",traits:[],trigger:"active",
  effectJa:"〖インパクト無効〗 （このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）\n 〖起動メイン〗 このターン中に自分の場のフィールドが退場している場合のみ発動できる。このキャラをアクティブにする。〈エリナリーゼ〉のこの効果は1ターンに1回のみ発動できる。"
 },
 "MST-1-046":{
  kind:"retiredFieldEnergyAndCostBuff",nameJa:"タルハンド",color:"green",energy:3,ap:1,
  bp:3000,gen:2,type:"character",traits:[],trigger:null,
  effectJa:"このターン中に自分の場のフィールドが退場している場合、このキャラの発生エナジー+ 〖緑〗 。\n 〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 自分の場のフィールドを1枚退場させる。そうした場合、このキャラはこのターン中、BP+1000。"
 },
  "MST-1-054": {
    "kind":"onPlayRestSilenceOpponentIfFieldOutside",
    "nameJa":"ロキシー","color":"green","energy":4,"ap":1,
    "bp":4000,"gen":1,"type":"character","traits":[],"trigger":"raid",
    "effectJa":"〖レイド〗 〈ロキシー〉アクティブにし、フロントLに移動できる\n 〖登場時〗 自分の場外にフィールドカードがある場合、相手のフロントLのキャラを1枚まで選び、レストにする。それは次の相手のアタックフェイズ終了時まで、元々の効果を全て失い、アクティブにならない。"
  },
  "MST-1-075": {
    "kind":"fieldOnPlayDrawDiscardOnRetireDraw",
    "nameJa":"迷宮都市ラパン","color":"green","energy":0,"ap":1,
    "bp":0,"gen":1,"type":"field","traits":[],"trigger":"get",
    "effectJa":"〖登場時〗 カードを1枚引き、自分の手札を1枚場外に置く。\n 〖退場時〗 カードを1枚引く。"
  },
  "MST-1-051": {
    "kind": "onPlayDrawDiscardLimited",
    "nameJa": "ロキシー",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "traits": [],
    "trigger": "draw",
    "deckLimit": 1,
    "effectJa": "〖登場時〗 カードを1枚引き、自分の手札を1枚場外に置く。"
  },
  "MST-1-004": {
    "kind": "activeIfOwnEffectEntry",
    "nameJa": "エリス",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖登場時〗 このキャラが自分の効果で登場していた場合、このキャラをアクティブにする。"
  },
  "MST-1-006": {
    "kind": "optionalApDrawNamedHandRestOrRaid",
    "nameJa": "エリス",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 2500,
    "gen": 2,
    "type": "character",
    "traits": [],
    "trigger": "color",
    "effectJa": "〖登場時〗 APを1支払ってもよい。そうした場合、カードを1枚引き、自分の手札から必要エナジーが3以下で消費APが1の青の〔〈ルーデウス〉か〈エリス〉か〈ルイジェルド〉〕を1枚まで自分の場にレストで登場させるかレイドさせる。"
  },
  "MST-1-007": {
    "kind": "onPlayChooseDrawOrOwnEffectNamedHand",
    "nameJa": "エリス",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖登場時〗 以下から1つ選ぶ。\n・カードを1枚引き、自分の手札を1枚場外に置く。\n・このキャラが自分の効果で登場していた場合、自分の手札から必要エナジーが3以下で消費APが1の青の〔〈ルーデウス〉か〈エリス〉か〈ルイジェルド〉〕を1枚まで自分の場にレストで登場させるかレイドさせる。〈エリス〉のこの効果は1ターンに1回のみ選べる。"
  },
  "MST-1-056": {
    "kind": "restSelfRestFrontGainEnergy",
    "nameJa": "エリナリーゼ",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": ["ラノア魔法大学"],
    "trigger": null,
    "effectJa": "〖起動メイン〗 〖レストにする〗 〖ターン1〗 自分のフロントLのアクティブのキャラを1枚レストにする。そうした場合、このキャラはこのターン中、発生エナジー+ 〖緑〗 。"
  },
  "MST-1-041": {
    "kind": "restSelfBuffOther",
    "nameJa": "アイシャ",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "draw",
    "effectJa": "〖起動メイン〗 〖レストにする〗 自分の場の他のキャラを1枚選び、このターン中、BP+1000。"
  },
  "MST-1-023": {
    "kind": "drawIfOwnEffectEntry",
    "nameJa": "ルーデウス",
    "color": "blue",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖登場時〗 このキャラが自分の効果で登場していた場合、カードを1枚引く。"
  },
  "MST-1-065": {
    "kind": "nameAliasTopTraitOutside",
    "nameJa": "フィッツ",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "traits": ["ラノア魔法大学"],
    "trigger": "active",
    "effectJa": "このカードは〈シルフィエット〉としても扱う。\n 〖登場時〗 自分の山札の上から2枚見て、［特徴：ラノア魔法大学］を1枚まで場外に置く。残りを望む順で山札の上に置く。"
  },
  "MST-1-066": {
    "kind": "nameAliasOwnEnergyBp",
    "nameJa": "フィッツ",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "traits": ["ラノア魔法大学"],
    "trigger": "draw",
    "effectJa": "このカードは〈シルフィエット〉としても扱う。\n 〖自分のターン中〗 自分の発生エナジーが7以上ある場合、このキャラはBP+1000。"
  },
  "MST-1-003": {
    "kind": "ownFieldAllNamesBp",
    "nameJa": "エリス",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "draw",
    "effectJa": "自分の場に〈ルーデウス〉と〈ルイジェルド〉がある場合、このキャラはBP+1000。"
  },
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
  "MST-1-016": {
    "kind": "restSelfEnergyRetireEndMain",
    "nameJa": "ゼニス",
    "color": "blue",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖起動メイン〗 〖レストにする〗 〖ターン1〗 このキャラはこのターン中、発生エナジー+ 〖青〗 と「メインフェイズ終了時、このキャラを退場させる。」を得る。"
  },
  "MST-1-055": {
    "kind": "onPlayTop3OwnTraitBottomDiscard",
    "nameJa": "アリエル",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": ["ラノア魔法大学"],
    "trigger": "draw",
    "effectJa": "〖登場時〗 自分の山札の上から3枚見て、［特徴：ラノア魔法大学］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。"
  },
  "MST-1-057": {
    "kind": "frontGeneratesEnergy",
    "nameJa": "クリフ",
    "color": "green",
    "energy": 4,
    "ap": 1,
    "bp": 3500,
    "gen": 1,
    "type": "character",
    "traits": ["ラノア魔法大学"],
    "trigger": "draw",
    "effectJa": "このキャラはフロントLでもエナジーを発生させる。"
  },
  "MST-1-063": {
    "kind": "onPlayDrawIfOwnEnergyAtLeast",
    "nameJa": "ノルン",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": ["ラノア魔法大学"],
    "trigger": "draw",
    "effectJa": "〖登場時〗 自分の発生エナジーが7以上ある場合、カードを1枚引く。"
  },
  "MST-1-045": {
    "kind": "restSelfEnergyRetireEndMain",
    "nameJa": "ゼニス",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖起動メイン〗 〖レストにする〗 〖ターン1〗 このキャラはこのターン中、発生エナジー+ 〖緑〗 と「メインフェイズ終了時、このキャラを退場させる。」を得る。"
  },
  "MST-1-024": {
    "kind": "ownTurnRoxyFieldBp",
    "nameJa": "ルーデウス",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": "draw",
    "effectJa": "〖自分のターン中〗 自分の場に〈ロキシー〉がある場合、このキャラはBP+1000。"
  },
  "MST-1-013": {
    "kind": "onRetireDrawOne",
    "nameJa": "シルフィエット",
    "color": "blue",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "traits": [],
    "trigger": null,
    "effectJa": "〖退場時〗 カードを1枚引く。"
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
  },
  "MST-1-010": {
    "kind": "onPlayOrderTopThree",
    "nameJa": "キシリカ・キシリス",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "traits": [],
    "trigger": "draw",
    "effectJa": "〖登場時〗 自分の山札の上から3枚見て、望む順で山札の上に置く。"
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
   implementation:pin.kind==='vanilla'?'vanilla':'dsl'};
  if(card.implementation==='vanilla'||pin.kind==='step')card.effects={};
  if(pin.kind==='onOwnEffectEntryChooseTimedSelf'){
   card.raidName='エリス';card.raidImpact=1;card.raidOwnTurnBp=500;
   card.effects={onPlay:[{op:'chooseOne',entry:'ownEffect',optional:false,
    options:[
     {id:'bp',label:'BP +1000 until next own turn start',turn:'any',
      then:[{op:'buffSelfUntilNextOwnStart',bp:1000}]},
     {id:'swap',label:'May swap own ENERGY character at attack end this turn',turn:'any',
      then:[{op:'grantSelfAttackEndSwapThisTurn'}]}
    ]}]};
  }
  if(pin.kind==='step')card.step=true;
  if(pin.kind==='retireFieldActivateTopTraitless'){
   card.effects={onPlay:[{op:'optionalRetireThenProgram',optional:true,
    cardType:'field',after:[
     {op:'activeSelfIf',when:{kind:'ownRetiredThisTurn',turn:'any',cardType:'field'}},
     {op:'searchTopUpToTwoBottom',count:4,max:1,rest:'bottom',
      filters:[{field:'traitlessCharacterOrField',value:true}],logic:'any'}
    ]}]};
  }
  if(pin.kind==='ownTurnEventImpactDiscount'){
   card.raidName='ロキシー';
   card.raidImpactNull=true;
   card.passiveBonuses=[{condition:{kind:'ownEventUsedThisTurn',turn:'own'},impact:1}];
   card.effects={onPlay:[{op:'nextEligibleHandPlayApDiscount',
    filter:{cardType:'event',printedRequiredEnergyAtMost:3}}]};
  }
  if(pin.kind==='nextHandApDiscount'){
   card.effects={onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'bounce',label:'可選回手非七星角色，下一張原產能2以上角色減1AP',turn:'any',then:[
     {op:'bounceOwnOtherUnderEnergy',optional:true,excludeName:'ナナホシ',after:[
      {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'character',printedGenAtLeast:2}}]}]},
    {id:'draw',label:'抽一張牌',turn:'any',then:[{op:'draw',count:1}]}
   ]}]};
   card.triggerEffect={op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1};
  }
  if(pin.kind==='onPlayRestSilenceOpponentIfFieldOutside'){
   card.raidName=pin.nameJa;
   card.templateEffects={onPlay:[{template:'restSilenceOppFrontIfOwnOutsideField',
    optional:true}]};
  }
  if(pin.kind==='fieldRetireOutsideTraitlessRestOrRaid'){
    // Official SPECIAL LIFE: choose one opposing FRONT character to retire.
    card.triggerEffect={op:'retireOppFront'};
    card.effects={onRetire:[{op:'deployOutsideTraitlessRestOrRaid',
     color:'green',energy:1,ap:1,optional:true,perOtherOutsideField:1}]};
   }
   if(pin.kind==='fieldCharacterRetireDrawAndRetireModes'){
    card.effects={
     onPlay:[{op:'retireOwnCharacterOne',optional:true,after:[{op:'draw',count:2}]}],
     onRetire:[{op:'chooseOne',optional:false,options:[
      {id:'deploy',label:'Discard then REST Roxy',turn:'any',
       then:[{op:'discardGate',optional:true,then:[{op:'deployOutsideRest',
        name:'ロキシー',color:'green',energy:1,ap:1,optional:true}]}]},
      {id:'recover',label:'Recover Manatite Hydra',turn:'any',
       then:[{op:'recoverOutsideOne',
        filter:{field:'name',value:'迷宮の守護者 マナタイトヒュドラ'},optional:true}]}
     ]}]
    };
   }
   if(pin.kind==='colorSiteMainRetireDraw'){
   card.colorTriggerFieldSubstitution='green';
   card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
   card.triggerEffect={op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1};
   card.mainAbility={op:'retireOwnFieldThen',frontOnly:true,oncePerTurn:true,
    optional:true,after:[{op:'draw',count:1}]};
  }
  if(pin.kind==='retiredFieldReady'){
   card.impactNull=true;
   card.mainAbility={op:'readySelfIfOwnRetiredThisTurn',cardType:'field',readyOncePerName:true};
  }
  if(pin.kind==='retiredFieldEnergyAndCostBuff'){
   card.passiveBonuses=[{condition:{kind:'ownRetiredThisTurn',turn:'any',cardType:'field'},
    extraEnergy:1}];
   card.mainAbility={op:'retireOwnFieldThen',frontOnly:true,oncePerTurn:true,
    after:[{op:'buffSelf',bp:1000}]};
  }
  if(pin.kind==='fieldOnPlayDrawDiscardOnRetireDraw'){
   card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
   card.effects={onRetire:[{op:'draw',count:1}]};
  }
  if(pin.kind==='restSelfEnergyRetireEndMain'){
   card.effects={};
   card.mainAbility={op:'restSelfGainEnergyRetireEndMain',
    energyOnly:true,oncePerTurn:true,extraEnergy:1};
  }
  if(pin.kind==='ownTurnRoxyFieldBp')
   card.passiveBonuses=[{condition:{kind:'ownNameExists',turn:'own',
    zone:'field',excludeSelf:true,name:'ロキシー'},bp:1000}];
  if(pin.kind==='onRetireDrawIfOwnField')
   card.effects={onRetire:[{op:'drawIfOwnFieldExists',count:1}]};
  if(pin.kind==='onRetireDrawOne')
   card.effects={onRetire:[{op:'draw',count:1}]};
  if(pin.kind==='activeIfOwnEffectEntry')
   card.effects={onPlay:[{op:'activeSelfIf',entry:'ownEffect'}]};
  if(pin.kind==='onPlayChooseDrawOrOwnEffectNamedHand')
   card.effects={onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'draw',label:'Draw one and put one own hand card outside',turn:'any',
     then:[{op:'drawDiscard',count:1}]},
    {id:'deploy',label:'Own-effect entry: named blue hand REST or Raid',turn:'any',
     entry:'ownEffect',then:[{op:'oncePerTurnGate',scope:'name',optional:false,then:[
      {op:'deployOwnHandRestOrRaid',type:'character',color:'blue',maxEnergy:3,
       ap:1,max:1,optional:true,names:['ルーデウス','エリス','ルイジェルド']}]}]}
   ]}]};
  if(pin.kind==='optionalApDrawNamedHandRestOrRaid'){
   card.triggerEffect={op:'bounceOppFrontUnderBp',bp:3500};
   card.effects={onPlay:[{op:'optionalPayApThen',ap:1,optional:true,then:[
    {op:'draw',count:1},
    {op:'deployOwnHandRestOrRaid',type:'character',color:'blue',maxEnergy:3,
     ap:1,max:1,optional:true,names:['ルーデウス','エリス','ルイジェルド']}
   ]}]};
  }
  if(pin.kind==='restSelfRestFrontGainEnergy'){
   card.effects={};
   card.mainAbility={op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1};
  }
  if(pin.kind==='restSelfBuffOther'){
   card.effects={};
   card.mainAbility={op:'restSelfBuffOther',bp:1000};
  }
  if(pin.kind==='drawIfOwnEffectEntry')
   card.effects={onPlay:[{op:'draw',count:1,entry:'ownEffect'}]};
  if(pin.kind==='nameAliasTopTraitOutside'){
   card.nameAliases=['シルフィエット'];
   card.effects={onPlay:[{op:'inspectTopTraitOutside',count:2,
    trait:'ラノア魔法大学',rest:'top'}]};
  }
  if(pin.kind==='nameAliasOwnEnergyBp'){
   card.nameAliases=['シルフィエット'];
   card.effects={};
   card.passiveBonuses=[{condition:{kind:'ownEnergyAtLeast',turn:'own',min:7},bp:1000}];
  }
  if(pin.kind==='ownFieldAllNamesBp')
   card.passiveBonuses=[{condition:{kind:'ownFieldHasAllNames',turn:'any',
    zone:'field',excludeSelf:false,names:['ルーデウス','ルイジェルド']},bp:1000}];
  if(pin.kind==='onPlayTop3OwnTraitBottomDiscard')
   card.templateEffects={onPlay:[{template:'searchTopOneBottomDiscard',count:3,
    filter:{field:'trait',value:'ラノア魔法大学'}}]};
  if(pin.kind==='onPlayTop5GreenFieldBottomDiscard')
   card.templateEffects={onPlay:[{template:'searchTopOneBottomDiscardWhere',count:5,
    filters:[{field:'color',value:'green'},{field:'type',value:'field'}],logic:'all'}]};
  if(pin.kind==='onPlayDrawIfOwnEnergyAtLeast')
   card.templateEffects={onPlay:[{template:'drawIfOwnEnergyAtLeast',energy:7,count:1}]};
  if(pin.kind==='stepFrontMainDrawDiscardFrontEnergy'){
   card.step=true;
   card.mainAbility={op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
    then:[{op:'drawDiscard',count:1},
     {op:'grantFrontEnergyOwnOtherFrontTrait',trait:'ラノア魔法大学',
      optional:true,until:'thisTurn'}]};
  }
  if(pin.kind==='eventDrawTwoFrontEnergy')
   card.effects={onPlay:[{op:'draw',count:2},
    {op:'grantFrontEnergyOwnOtherFrontTrait',trait:'ラノア魔法大学',
     optional:true,until:'thisTurn'}]};
  if(pin.kind==='onPlayDraw')card.templateEffects={onPlay:[{template:'draw',count:1}]};
  if(pin.kind==='onPlayDrawDiscard')card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
  if(pin.kind==='onPlayChooseTemporaryFrontEnergy')
   card.effects={onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'draw',label:'Draw one, put one own hand card outside',turn:'any',
     then:[{op:'drawDiscard',count:1}]},
    {id:'energy',label:'One other own Ranoa FRONT produces energy this turn',turn:'any',
     then:[{op:'grantFrontEnergyOwnOtherFrontTrait',trait:'ラノア魔法大学',
      optional:true,until:'thisTurn'}]}
   ]}]};

  if(pin.kind==='onPlayDrawDiscardLimited'){
   card.templateEffects={onPlay:[{template:'drawDiscardOne'}]};
   card.maxCopies=pin.deckLimit;
  }
  if(pin.kind==='onAttackDrawDiscard')card.templateEffects={onAttack:[{template:'drawDiscardOne'}]};
  if(pin.kind==='impactNull')card.impactNull=true;
  if(pin.kind==='activeExtraEnergy')card.activeExtraEnergy=1;
  if(pin.kind==='frontGeneratesEnergy')card.frontGeneratesEnergy=true;
  if(pin.kind==='peekTopOne')card.templateEffects={onPlay:[{template:'peekTopOne'}]};
  if(pin.kind==='bounceOtherEnergyOne')
   card.templateEffects={onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]};
  if(pin.kind==='recoverApTwo')
   card.templateEffects={onPlay:[{template:'recoverAp',count:2}]};
  if(pin.kind==='onPlayOrderTopThree')
   card.templateEffects={onPlay:[{template:'inspectTopArrange',count:3,toOutside:false,rest:'top'}]};
  if(pin.kind==='frontOnceNamedBuff'){
   const m=/^〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 自分の場の〈([^〉]{1,40})〉を1枚選び、このターン中、BP\+(\d{3,4})。$/.exec(pin.effectJa);
   if(!m)throw Error(id+' is not the printed front once named buff');
   card.mainAbility={op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
    then:[{op:'buffOwnField',filter:{field:'name',value:m[1]},bp:Number(m[2]),
     optional:false,excludeSelf:false}]};
  }
  if(pin.kind==='enterActiveOptionalReturn'){
   if(pin.effectJa!=='このキャラはアクティブで登場させる。\n 〖退場時〗 このカードを手札に加えてもよい。')
    throw Error(id+' is not the printed active entry plus optional hand return');
   card.enterAlwaysActive=true;
   card.effects={onRetire:[{op:'returnRetiredToHand',optional:true}]};
  }
  if(pin.kind==='namedFieldRetireBonus'){
   const bonus=parseNamedFieldRetireBonus(pin.effectJa);
   if(!bonus)throw Error(id+' is not the printed field-name retire bonus');
   card.effects={onPlay:[{op:'retireOppFrontUnderBp',...bonus}]};
   card.triggerEffect={op:'retireOppFront'};
  }
  if(pin.kind==='onPlayBuffOwnOther1000')
   card.templateEffects={onPlay:[{template:'buffOwnField',
    filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]};
  if(pin.kind==='emptyFieldImpactOwnEffectBp'){
   card.emptyOwnFieldHandEnergyDiscount=2;
   card.impactNull=true;
   card.passiveBonuses=[{condition:{kind:'ownEffectCharacterEntryOrRaidThisTurn',turn:'own'},bp:500}];
  }
  if(pin.kind==='emptyFieldSameLineEventTop'){
   card.emptyOwnFieldHandEnergyDiscount=2;
   card.passiveBonuses=[{condition:{logic:'all',turn:'own',checks:[
    {kind:'ownEventUsedThisTurn',turn:'own'},
    {kind:'sameLineName',turn:'own',name:'ルーデウス'}
   ]},bp:1500}];
   card.effects={onPlay:[{op:'inspectTopAnyOutside',count:2,rest:'top',maxOutside:1}]};
  }
  if(pin.kind==='namedHandRestOrRaidThenNamesActive'){
   card.effects={onPlay:[{op:'deployOwnHandRestOrRaid',type:'character',color:'blue',
    maxEnergy:3,ap:1,max:1,optional:true,
    names:['ルーデウス','エリス','ルイジェルド']}]};
   card.mainAbility={op:'onceActiveIfAllNames',oncePerTurn:true,
    names:['ルーデウス','エリス']};
  }
  if(pin.kind==='optionalDrawPerOwnNames')
   card.effects={onPlay:[
    {op:'optionalDrawIfOwnName',name:'ルーデウス'},
    {op:'optionalDrawIfOwnName',name:'エリス'},
    {op:'optionalDrawIfOwnName',name:'ルイジェルド'}
   ]};
  if(pin.kind==='namedPlayOutsideEventPairRetire'){
   card.playRequiresOwnName='ロキシー';
   card.outsideEventPairEnergyDiscount={per:2,amount:1};
   card.effects={onPlay:[{op:'retireOppFrontUnderBp',bp:5000}]};
   card.triggerEffect={op:'retireOppFront'};
  }
  if(pin.kind==='impactNullAllTraitEnergyBuff'){
   card.impactNull=true;
   card.mainAbility={op:'onceBuffUntilNextIfEnergyAllTrait',oncePerTurn:true,
    minEnergy:7,trait:'ラノア魔法大学',bp:500};
  }
  if(pin.kind==='lookTopTwoNameOrLowEventOutside')
   card.effects={onPlay:[{op:'searchTopOneBottomDiscard',count:2,rest:'outside',
    privateLook:true,groups:[
     {logic:'all',filters:[{field:'name',value:'ルーデウス'}]},
     {logic:'all',filters:[{field:'name',value:'ロキシー'}]},
     {logic:'all',filters:[{field:'type',value:'event'},
      {field:'printedRequiredEnergyAtMost',value:2}]}
    ]}]};
  if(pin.kind==='restChooseIfEventUsed'){
   card.effects={};
   card.mainAbility={op:'restChooseIfEventUsed',bp:1000};
  }
  if(pin.kind==='roxyHandRestOrRaidDrawMove'){
   card.playRequiresOwnName='ロキシー';
   card.triggerEffect={op:'bounceOppFrontUnderBp',bp:3500};
   card.effects={onPlay:[
    {op:'deployOwnHandRestOrRaid',type:'character',color:'blue',maxEnergy:30,ap:1,
     max:1,optional:true,names:['ルーデウス','ロキシー'],requireAffordableEnergy:true},
    {op:'draw',count:1},
    {op:'moveOtherAcrossOrRemove',optional:true,name:'ルーデウス'}
   ]};
  }
  if(pin.kind==='optionalFieldRetireActiveOutsideDiscard')
   card.effects={
    onPlay:[{op:'optionalRetireThenProgram',optional:true,cardType:'field',
     after:[{op:'activeSelf'}]}],
    onAttack:[{op:'mayDiscardActiveIfOutsideFields',min:6,once:'name'}]
   };
  if(pin.kind==='unblockedDrawLoseReady'){
   card.raidName='エリス';
   card.unblockedAttack={optional:true,then:[{op:'draw',count:1}]};
   card.attackLoseStay={bp:2000};
  }
  if(pin.kind==='raidReplayOrSniperStrip'){
   card.raidName='ルーデウス';
   card.effects={onPlay:[{op:'buffOwnField',filter:{field:'type',value:'character'},
    bp:1000,optional:true,excludeSelf:false}]};
   card.mainAbility={op:'onceFrontChoose',oncePerTurn:true,frontOnly:true,then:[{
    op:'chooseOne',optional:false,options:[
     {id:'replay',label:'Replay this character on play',turn:'own',
      then:[{op:'replayOnPlay'}]},
     {id:'strip',label:'Sniper a raided Eris and strip this top',turn:'own',
      then:[{op:'sniperRaidedStripSelf',name:'エリス'}]}
    ]}]};
  }
  if(pin.kind==='frontLockAttackChoice'){
   card.frontForbidden=true;
   card.ownEffectMoveOnly=true;
   card.effects={onAttack:[{op:'chooseOne',optional:false,options:[
    {id:'buff',label:'Up to one other character BP +1000',turn:'own',then:[
     {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,
      optional:true,excludeSelf:true}]},
    {id:'draw',label:'Draw one card',turn:'own',then:[{op:'draw',count:1}]},
    {id:'impact',label:'Impact if Goraisekijun was used',turn:'own',then:[
     {op:'grantSelfImpactIfNamedEvent',name:'豪雷積層雲',amount:1}]}
   ]}]};
  }
  if(pin.kind==='outsideEnergyDualFront'){
   card.raidName='ロキシー';
   card.effects={onPlay:[{op:'recoverOutsideUnderEnergy',energy:2,optional:true}]};
   card.printedMains=[
    {id:'active',op:'frontActiveIfEvent',maxEnergy:3,oncePerTurn:true,frontOnly:true},
    {id:'move',op:'frontMoveNamed',name:'ルーデウス',oncePerTurn:true,frontOnly:true}
   ];
  }
  if(pin.kind==='fieldSearchRestDeploy'){
   card.effects={onPlay:[{op:'searchTopOneBottomDiscard',count:3,groups:[
    {logic:'all',filters:[{field:'name',value:'ルーデウス'}]},
    {logic:'all',filters:[{field:'name',value:'エリス'}]},
    {logic:'all',filters:[{field:'name',value:'ルイジェルド'}]}
   ]}]};
   card.mainAbility={op:'fieldRestRetireThen',then:[{
    op:'deployOwnHandRestOrRaid',type:'character',color:'blue',maxEnergy:3,
    ap:1,max:1,optional:false,names:null}]};
  }
  if(pin.kind==='buffApOutsideReturn'){
   card.effects={onPlay:[
    {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,
     optional:false,excludeSelf:false},
    {op:'activeOwnApIfName',name:'ロキシー',count:1}
   ]};
   card.outsideRaidReturn={names:['ルーデウス','ロキシー'],once:'name'};
  }
  if(pin.kind==='erisSniperOrOutsideRudeus'){
   card.effects={onPlay:[{op:'chooseOne',optional:false,emptyOk:true,options:[
    {id:'sniper',label:'Grant Eris BP and sniper',turn:'any',then:[
     {op:'grantNamedBuffSniper',name:'エリス',bp:500}]},
    {id:'deploy',label:'Rest or raid a blue AP1 Rudeus from outside',turn:'any',then:[
     {op:'deployOutsideNameApRestOrRaid',name:'ルーデウス',color:'blue',ap:1,
      requiresName:'エリス',optional:true}]}
   ]}]};
   card.triggerEffect={op:'retireOppFront'};
  }
  if(pin.kind==='aliasProtectRaidBase'){
   // Printed 「相手の効果」. Q2162's question quotes 「相手のキャラの効果」
   // and no erratum was found. Scope stays the printed sentence. Not FAQ certified.
   card.nameAliases=['シルフィエット'];
   card.raidName='シルフィエット';
   card.effects={
    onPlay:[{op:'protectMinGenTrait',trait:'ラノア魔法大学',minGen:1,optional:true}],
    onRetire:[{op:'raidBaseRestOrHand',optional:true}]
   };
  }
  if(pin.kind==='aliasEnergyImpactChoice'){
   card.nameAliases=['シルフィエット'];
   card.raidName='シルフィエット';
   card.passiveBonuses=[{condition:{kind:'ownEnergyAtLeast',turn:'any',min:7},impact:1}];
   card.effects={onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'search',label:'Look at five for one Ranoa',turn:'any',then:[
     {op:'searchTopOneBottomDiscard',count:5,noHandDiscard:true,
      filter:{field:'trait',value:'ラノア魔法大学'}}]},
    {id:'move',label:'Move up to one opposing front to energy',turn:'any',then:[
     {op:'moveOppFrontToEnergy',optional:true}]}
   ]}]};
  }
  if(pin.kind==='energyLockNamedActive'){
   card.energyLineForbidden=true;
   card.ownEffectActiveOnly=true;
   card.mainAbility={op:'energyNamedSuite',once:'name',minEnergy:7,bp:2000};
  }
  return card;
 });
}
export function mstV2Pack(){
 return createUniversalPack({id:'mushoku-tensei',version:'v2-d-mst-pilot-5',
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
     ...(pin.kind==='namedFieldRetireBonus'||pin.kind==='frontOnceNamedBuff'||
      pin.kind==='enterActiveOptionalReturn'?['tests/v2-c26-five-title-batch.test.mjs']:[]),
     ...(pin.kind==='nextHandApDiscount'?['tests/v2-r36-real-discount-cards.test.mjs']:[]),
      ...(pin.kind==='ownTurnEventImpactDiscount'?['tests/v2-r38-mst031-real.test.mjs']:[]),
     ...(pin.kind==='eventDrawTwoFrontEnergy'?['tests/v2-r37-mst080-event-front.test.mjs',
      'tests/v2-r37-mst-front-life.test.mjs']:[]),
     ...(pin.kind==='stepFrontMainDrawDiscardFrontEnergy'?['tests/v2-r37-mst060-main-step.test.mjs',
      'tests/v2-r37-mst-front-life.test.mjs']:[]),
     ...(pin.kind==='retireFieldActivateTopTraitless'?['tests/v2-r39-retire-search-real.test.mjs']:[]),
     'tests/universal-v2-mst-port.test.mjs',
     'tests/universal-v2-sao-mst-cross-title.test.mjs',
     ...(pin.kind==='ownFieldAllNamesBp'?['tests/v2-mst-003-own-names.test.mjs']:[]),
     ...(pin.kind==='activeIfOwnEffectEntry'?['tests/v2-conditional-entry-active-round15.test.mjs']:[]),
     ...(pin.kind==='optionalApDrawNamedHandRestOrRaid'?['tests/v2-c15-hand-rest-or-raid.test.mjs']:[]),
     ...(pin.kind==='onPlayChooseDrawOrOwnEffectNamedHand'?['tests/v2-c21-mst007-own-effect-choice.test.mjs']:[]),
     ...(pin.kind==='onOwnEffectEntryChooseTimedSelf'?['tests/v2-r57-mst009-official.test.mjs']:[]),
     ...(pin.kind==='drawIfOwnEffectEntry'?['tests/v2-mst-023-own-effect-draw.test.mjs']:[]),
     ...(pin.kind==='restSelfBuffOther'?['tests/v2-rest-buff-other-round16.test.mjs']:[]),
     ...(pin.kind==='restSelfRestFrontGainEnergy'?['tests/v2-mst-056-rest-front-energy.test.mjs']:[]),
     ...(pin.kind==='nameAliasOwnEnergyBp'?['tests/v2-zero-engine-round15.test.mjs']:[]),
     ...(pin.kind==='nameAliasTopTraitOutside'?['tests/v2-mst-065-top-trait-outside.test.mjs']:[]),
      ...(pin.kind==='onRetireDrawOne'?['tests/v2-mst-013-on-retire.test.mjs']:[]),
      ...(pin.kind==='onRetireDrawIfOwnField'?['tests/v2-mst-052-official-retire.test.mjs']:[]),
       ...(pin.kind==='colorSiteMainRetireDraw'?['tests/v2-mst-053-official-full.test.mjs']:[]),
     ...(pin.kind==='onPlayDrawIfOwnEnergyAtLeast'?['tests/v2-mst-063-energy-draw.test.mjs']:[]),
     ...(pin.kind==='onPlayTop3OwnTraitBottomDiscard'?['tests/v2-mst-055-cross-title-top.test.mjs']:[]),
     ...(pin.kind==='onPlayTop5GreenFieldBottomDiscard'?['tests/v2-cross-title-top-filter-round13.test.mjs']:[]),
     ...(pin.kind==='frontGeneratesEnergy'?['tests/v2-mst-057-front-energy.test.mjs']:[]),
      ...(pin.kind==='onPlayChooseTemporaryFrontEnergy'?['tests/v2-r34-mst059-official.test.mjs','tests/v2-r34-front-energy-permission.test.mjs']:[]),
      ...(['onPlayRestSilenceOpponentIfFieldOutside','fieldOnPlayDrawDiscardOnRetireDraw'].includes(pin.kind)?
       ['tests/v2-mst-054-075-real-deck.test.mjs']:[]),
      ...(pin.kind==='fieldOnPlayDrawDiscardOnRetireDraw'?
       ['tests/v2-mst-075-retire-trigger.test.mjs']:[]),
      ...(['retiredFieldReady','retiredFieldEnergyAndCostBuff'].includes(pin.kind)?
       ['tests/v2-mst-042-046-retirement-official.test.mjs']:[]),
     ...(pin.kind==='onPlayDrawDiscardLimited'?['tests/v2-mst-051-limited-draw-discard.test.mjs']:[]),
     ...(['lookTopTwoNameOrLowEventOutside','restChooseIfEventUsed',
      'roxyHandRestOrRaidDrawMove','optionalFieldRetireActiveOutsideDiscard'].includes(pin.kind)?
      ['tests/v2-mst-shared-full-print.test.mjs']:[]),
     ...(['unblockedDrawLoseReady','raidReplayOrSniperStrip','frontLockAttackChoice',
      'outsideEnergyDualFront','fieldSearchRestDeploy','buffApOutsideReturn',
      'erisSniperOrOutsideRudeus','aliasProtectRaidBase','aliasEnergyImpactChoice',
      'energyLockNamedActive'].includes(pin.kind)?
      ['tests/v2-mst-catalog-finish.test.mjs']:[]),
     ...(['restSelfEnergyRetireEndMain','ownTurnRoxyFieldBp'].includes(pin.kind)?['tests/v2-mst-016-024-shared.test.mjs']:[])
    ]),
    ...(def.implementation==='vanilla'?{verifiedNoExtraEffects:true}:{})
   })
  });
 });
}
