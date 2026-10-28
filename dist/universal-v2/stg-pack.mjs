// Steins;Gate UA57BT. The catalogue holds every playable identity.
// This pack registers only prints whose entire Japanese text is a tested
// program. Partial prints stay in the catalogue. Five-title census counts
// are not changed here.
import {createUniversalPack} from './pack.mjs';
import {STEINS_GATE_CARDS} from '../steins-gate-cards.mjs';

const LAB=['阿万音 鈴羽','岡部 倫太郎','椎名 まゆり','橋田 至','牧瀬 紅莉栖'];
const PLAIN=new Set(['-','']);
const IMPACT='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）';
const DOUBLE='【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）';
const IMMUNE='このキャラはBPをマイナスする効果を受けない。【自分のターン中】このキャラはBP+500。';
const DRAW_DISCARD='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。';
const EMPTY_DRAW='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【青×2】減らす。'+DRAW_DISCARD;
const DRAW2='カードを2枚引く。';
const RECOVER='自分のAPカードを2枚まで選び、アクティブにする。';
const BOUNCE='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。';
const ACTIVE_BLUE='このキャラがアクティブの場合、このキャラの発生エナジー+【青】。';
const ACTIVE_GREEN='このキャラがアクティブの場合、このキャラの発生エナジー+【緑】。';
const REST_BLUE='【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【青】と「メインフェイズ終了時、このキャラを退場させる。」を得る。';
const REST_GREEN='【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【緑】と「メインフェイズ終了時、このキャラを退場させる。」を得る。';
const PEEK='【登場時】自分の山札の上から1枚見て、山札の上か場外に置く。';
const DRAW_MAYURI='【登場時】自分の場に〈椎名 まゆり〉がある場合、カードを1枚引く。';
const RETIRE_OKABE='【退場時】自分の場に〈岡部 倫太郎〉がある場合、カードを1枚引く。';
const EVENT_BP='【自分のターン中】このターン中に自分がイベントカードを使用している場合、このキャラはBP+1500。';
const SEARCH3='【登場時】自分の山札の上から4枚見て、〈岡部 倫太郎〉か〈椎名 まゆり〉か〈橋田 至〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。';
const INSPECT3='【登場時】自分の山札の上から3枚見て、1枚まで場外に置き、残りを望む順で山札の上に置く。';
const REST_BUFF='【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。';
const OTHER_DRAW='【登場時】自分の場の他のキャラを1枚退場させてもよい。そうした場合、カードを2枚引く。';
const SEARCH5='【登場時】自分の山札の上から3枚見て、〈阿万音 鈴羽〉か〈岡部 倫太郎〉か〈椎名 まゆり〉か〈橋田 至〉か〈牧瀬 紅莉栖〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。';
const SEARCH_CHAR='【登場時】自分の山札の上から3枚見て、キャラカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。';
const FIELD_RETIRE='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。【退場時】カードを1枚引く。';
const CHOOSE_NAMES='【登場時】以下から1つ選ぶ。・カードを1枚引き、自分の手札を1枚場外に置く。・自分の場の〈阿万音 鈴羽〉か〈橋田 至〉を1枚まで選び、このターン中、BP+2000。';
const COLOR_CHOOSE='【登場時】以下から1つ選ぶ。・カードを1枚引き、自分の手札を1枚場外に置く。・自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。';
const COLOR_TRIGGER='【カラー】自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚自分の場にアクティブで登場させる。';
const REST_KURISU='自分のフロントLのアクティブの〈牧瀬 紅莉栖〉を1枚レストにする。そうした場合、カードを3枚引く。';
const ATTACK_DRAW='【アタック時】このターン中に自分がイベントカードを使用している場合、カードを1枚引いてもよい。そうした場合、自分の手札を1枚場外に置く。';
const EVENT_MAIN='【起動メイン】【ターン1】このターン中に自分がイベントカードを使用している場合のみ発動できる。このキャラは次の自分のターン開始時まで、BP+1000。';
const DISCARD_IBN='【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から〈IBN5100〉を1枚まで手札に加える。';
const DMAIL_BUFF='【登場時】自分の場外から〈Dメール〉を1枚まで手札に加える。自分のターン中の場合、自分の場のキャラを1枚まで選び、このターン中、BP+1000。';
const OPEN_FRONT='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【緑×2】減らす。自分のアタックフェイズ開始時、自分のフロントLに空きがある場合、このキャラはこのターン中、BP+1000。';
const KURISU_RETIRE='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈牧瀬 紅莉栖〉がある場合、『BP5000以下』に代わる。';
const ANY_READY='自分の山札の上から5枚見て、1枚まで公開し手札に加える。残りを望む順で山札の下に置く。公開したカードが〈フェイリス・ニャンニャン〉かフィールドカードの場合、自分のAPカードを1枚アクティブにする。';
const WIN_MOVED='このキャラがバトルに勝利した時、このキャラがこのターン中に移動している場合、カードを1枚引く。';
const ATTACK_END_FRONT='【エナジーLにある場合】自分のアタックフェイズ終了時、自分のフロントLに空きがある場合、このキャラを自分のフロントLに移動させてもよい。';
const MAD='自分の場のキャラ全ては、このターン中、BP+1000。自分の場の消費APが1のキャラを1枚まで選び、このターン中、【インパクト（1）】（アタックしてバトルに勝利した時、相手に1ダメージ）を与える。自分の場に〈岡部 倫太郎〉がある場合、カードを1枚引く。';
const SUZUHA_DRAW='カードを1枚引く。自分の場の〈阿万音 鈴羽〉を1枚まで選び、このターン中、BP+1000と「【アタック時】カードを1枚引く。」を与える。';
const DMAIL_SEARCH='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【緑×2】減らす。【登場時】自分の山札の上から4枚見て、フィールドカードか〈Dメール〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。';
const DIFFERENT_FIELD='【登場時】自分の場のフィールドを1枚退場させてもよい。そうした場合、自分の場外からこの効果で退場させたフィールドと異なるカード名の緑のフィールドカードを1枚まで自分のエナジーLにレストで登場させる。';
const FRONT_ENERGY='【起動メイン】【ターン1】このターン中に自分がイベントカードを使用している場合のみ発動できる。このキャラは次の自分のターン開始時まで、「このキャラはフロントLでもエナジーを発生させる。」を得る。';
const GRANT_STEP='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）【自分のターン中】自分の場の他のキャラ全ては、【ステップ】を得る。';
const SPECIAL='【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。';
const COLOR_BOUNCE='【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。';
const RAID_TRIGGER='【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。';
const INSPECT_ENTRY='【登場時】自分の山札の上から『2枚』見て、望む枚数を望む順で山札の上に置き、残りを場外に置く。このキャラがキャラの効果で登場していた場合、『3枚』に代わる。';
const LAB_REST='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）【登場時】自分の手札から必要エナジーが2以下で消費APが1の緑の〔〈阿万音 鈴羽〉か〈岡部 倫太郎〉か〈椎名 まゆり〉か〈橋田 至〉か〈牧瀬 紅莉栖〉〕を1枚まで自分の場にレストで登場させる。';
const TRIGGER_SEARCH='【登場時】自分の山札の上から『3枚』見て、必要エナジーが3以下で【ファイナルトリガー】を持たないイベントカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。自分の場外に必要エナジーが3以下の青のイベントカードの【トリガー】が3種類以上ある場合、『5枚』に代わる。';
const TRIGGER_BRANCH='【自分のターン中】このターン中に自分がイベントカードを使用している場合、このキャラはBP+1000。【登場時】自分の場外にある、必要エナジーが3以下の青のイベントカードの【トリガー】が3種類以下の場合、カードを1枚引き、自分の手札を1枚場外に置く。4種類以上の場合、カードを1枚引く。';
const RAIDED_DRAW='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【青×2】減らす。このキャラがレイドされた時、自分の場外に必要エナジーが3以下の青のイベントカードの【トリガー】が3種類以上ある場合、カードを1枚引く。（レイドしたキャラの【登場時】とこの効果は望む順で処理する）';
const KURISU_BLOCK='自分の場の〈牧瀬 紅莉栖〉を1枚選び、このターン中、BP+1500と「このキャラはBP4000以上のキャラにブロックされない。」を与える。自分の場外に必要エナジーが3以下の他の青のイベントカードの【トリガー】が3種類以上ある場合、カードを1枚引く。';
const OKABE_WALL='このカードは自分の場に〈岡部 倫太郎〉がある場合のみ使用できる。BP5000以下の相手のフロントLのキャラを1枚選び、退場させる。自分の場外に青の〈椎名 まゆり〉が7枚以上ある場合、自分の場か場外の〈岡部 倫太郎〉を1枚までリムーブエリアに置く。';
const IBN_GATE='【登場時】自分の手札のイベントカードかフィールドカードを1枚場外に置いてもよい。そうした場合、山札の上から2枚見て、1枚手札に加え、残りを場外に置く。【退場時】以下から1つ選ぶ。・自分の場の〈桐生 萌郁〉を1枚まで選び、アクティブにする。・カードを1枚引く。';
const IMPACT_MOVE='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）【登場時】自分の場の他のカードを1枚退場させてもよい。そうした場合、相手のフロントLのキャラを1枚まで選び、エナジーLに移動させる。このターン中に自分がイベントカードを使用している場合、選んだキャラに次の自分のターン開始時まで、「このキャラは移動できない。」を与える。';
const TRIGGER_RETIRE='【レイド】〈牧瀬 紅莉栖〉アクティブにし、フロントLに移動できる【登場時】自分の場外の必要エナジーが3以下の青のイベントカードの【トリガー】の種類数×1000以下のBPの相手のフロントLのキャラを1枚まで選び、退場させる。自分の場外に必要エナジーが3以下の青のイベントカードの【トリガー】が5種類以上ある場合、このキャラはこのターン中、【インパクト（1）】を得る。';
const FARIS='【レイド】〈フェイリス・ニャンニャン〉アクティブにし、フロントLに移動できる【登場時】カードを1枚まで引く。自分の場のキャラを1枚まで選び、このターン中、BP+1000。【アタック時】このターン中に自分がイベントカードを使用していて、自分の場にフィールドがある場合、このキャラの【登場時】を発動する。';
const KURISU_PROTECT='【レイド】〈牧瀬 紅莉栖〉アクティブにし、フロントLに移動できる【登場時】自分の場の他のキャラを1枚まで選び、次の自分のターン開始時まで、「このキャラは相手の効果で選ばれない。」を与える。【アタック時】以下から1つ選ぶ。・このキャラはこのターン中、【インパクト（1）】を得る。・自分のフロントLに空きがある場合、カードを2枚引き、自分の手札を1枚場外に置く。';
const MAYURI_SHIFT='【レイド】〈椎名 まゆり〉アクティブにし、フロントLに移動できる【アタック時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。自分のフロントLに空きがあり、選んだキャラがエナジーLにある場合、そのキャラをフロントLに移動させる。【退場時】自分のエナジーLのキャラを1枚まで選び、このターン中、BP+2000し、フロントLに移動させる。';
const SUZUHA_ACTIVE='このキャラはアクティブで登場させる。【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが3以下で【ファイナルトリガー】を持たないイベントカードを1枚まで手札に加える。【起動メイン】【ターン1】このターン中に自分の効果でアクティブからレストになったことがある自分の場の他のキャラを1枚選び、アクティブにする。';
const OKABE_CHOOSE='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）【登場時】自分の山札の上から1枚見て、山札の上か場外に置く。【起動メイン】【ターン1】自分のフロントLのアクティブの〈牧瀬 紅莉栖〉を1枚レストにする。そうした場合、以下から1つ選ぶ。・このキャラはこのターン中、【インパクト（1）】を得る。・BP1500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。';
const MAYURI_DELAY='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）【登場時】このキャラがキャラの効果で登場していない場合、このキャラは次の自分のターン開始時まで、「相手のアタックフェイズ終了時、このキャラを退場させる。」を得る。【アタック時】自分の山札の上から3枚見て、〈岡部 倫太郎〉か〈椎名 まゆり〉か〈橋田 至〉か〈まゆしぃのカイちゅ～止まっちゃってる……〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。【起動メイン】このキャラをアクティブにする。〈椎名 まゆり〉のこの効果は1ターンに1回のみ発動できる。';
const KURISU_DUAL='【レイド】〈牧瀬 紅莉栖〉アクティブにし、フロントLに移動できる【起動メイン】【フロントLにある場合】このターン中、次に手札から使用する必要エナジーが3以下で【ファイナルトリガー】を持たないイベントカードの消費APを-1する。〈牧瀬 紅莉栖〉のこの効果は1ターンに1回のみ発動できる。【起動メイン】【フロントLにある場合】 【ターン1】このキャラがレストの場合のみ発動できる。自分の場の他のキャラを1枚選び、このターン中、BP+2000。';
const DMAIL_FIELD='自分の場のアクティブのフィールドを1枚レストにする。そうした場合、カードを1枚引き、自分の手札を1枚場外に置く。自分の手札から必要エナジーが4以下で消費APが1の【レイド】を持たない緑のキャラカードを1枚まで自分の場にアクティブで登場させる。このカードの【カラートリガー】を発動する場合、効果に記載されている「必要エナジーが2以下で消費APが1の緑のキャラカード」を「緑のフィールドカード」に代えてもよい。';
const MAYURI_SLAP='以下から2つまで選ぶ。自分の場外に必要エナジーが3以下の他の青のイベントカードの【トリガー】が3種類以上ある場合、自分のAPカードを1枚アクティブにする。・自分の場のキャラを1枚選び、アクティブにする。・自分の場のキャラを1枚選び、このターン中、BP+2000。・相手のフロントLのキャラを1枚選び、レストにする。〈まゆしぃのビンタ〉のこの効果は1ターンに1回のみ選べる。';
const RUKA_GRANT='【起動メイン】【フロントLにある場合】 【ターン1】消費APが1で【レイド】を持たない自分の場の他のキャラを1枚選び、このターン中、以下から1つを与える。このターン中に〈漆原 るか〉が既に選んだ効果は選べない。・このキャラはBP4000以上のキャラにブロックされない。・BP+1000と「このターン中に自分がイベントカードを使用している場合、このキャラは【インパクト（1）】を得る。」';
const KURISU_ATTACK={op:'chooseOne',optional:false,options:[
 {id:'impact',label:'這個回合獲得衝擊1',turn:'any',then:[{op:'grantSelfImpactThisTurn',amount:1}]},
 {id:'draw',label:'前線有空位就抽2棄1',turn:'any',then:[{op:'drawDiscardIfFrontOpen',count:2}]}
]};
const SLAP={op:'chooseUpToDistinctOrdered',max:2,options:[
 {id:'active',label:'自己角色活動',then:[{op:'activeOwnOne',optional:false}]},
 {id:'buff',label:'自己角色這個回合BP+2000',then:[{op:'buffOwnField',
  filter:{field:'type',value:'character'},bp:2000,optional:false,excludeSelf:false}]},
 {id:'rest',label:'對手前線休息',then:[{op:'restOppFrontOne',optional:false}]}
]};
const MAYURI_NAMES=['岡部 倫太郎','椎名 まゆり','橋田 至','まゆしぃのカイちゅ～止まっちゃってる……'];
const IBN_RETIRE={op:'chooseOne',optional:false,options:[
 {id:'active',label:'使桐生萌郁活動',turn:'any',then:[
  {op:'activeOwnNamed',name:'桐生 萌郁',max:1,optional:true}]},
 {id:'draw',label:'抽1張',turn:'any',then:[{op:'draw',count:1}]}
]};
const DRAW_OR_NAMES={op:'chooseOne',optional:false,options:[
 {id:'draw',label:'抽1張並放1張手牌到場外',turn:'any',then:[{op:'drawDiscard',count:1}]},
 {id:'names',label:'鈴羽或橋田這個回合BP+2000',turn:'any',then:[
  {op:'buffOwnNames',names:['阿万音 鈴羽','橋田 至'],bp:2000,optional:true}]}
]};
const DRAW_OR_OTHER={op:'chooseOne',optional:false,options:[
 {id:'draw',label:'抽1張並放1張手牌到場外',turn:'any',then:[{op:'drawDiscard',count:1}]},
 {id:'other',label:'其他角色這個回合BP+1000',turn:'any',then:[{op:'buffOwnOthersFixed',bp:1000,count:1}]}
]};

export function stgEngineKind(effectJa){
 const e=String(effectJa||'');
 if(PLAIN.has(e))return 'plain';
 if(e===IMPACT)return 'impactNull';
 if(e===DOUBLE)return 'doubleBlock';
 if(e===IMMUNE)return 'bpImmuneTurn';
 if(e===DRAW_DISCARD)return 'drawDiscard';
 if(e===EMPTY_DRAW)return 'emptyDrawDiscard';
 if(e===DRAW2)return 'draw2';
 if(e===RECOVER)return 'recoverAp2';
 if(e===BOUNCE)return 'bounce';
 if(e===ACTIVE_BLUE||e===ACTIVE_GREEN)return 'activeEnergy';
 if(e===REST_BLUE||e===REST_GREEN)return 'restEnergyRetire';
 if(e===PEEK)return 'peek';
 if(e===DRAW_MAYURI)return 'drawIfMayuri';
 if(e===RETIRE_OKABE)return 'retireDrawOkabe';
 if(e===EVENT_BP)return 'eventTurnBp1500';
 if(e===SEARCH3)return 'searchThree';
 if(e===INSPECT3)return 'inspectThree';
 if(e===REST_BUFF)return 'restBuff';
 if(e===OTHER_DRAW)return 'otherRetireDraw2';
 if(e===SEARCH5)return 'searchFive';
 if(e===SEARCH_CHAR)return 'searchCharacter';
 if(e===FIELD_RETIRE)return 'fieldDrawRetire';
 if(e===CHOOSE_NAMES)return 'chooseNames';
 if(e===COLOR_CHOOSE)return 'colorOtherBuff';
 if(e===REST_KURISU)return 'restKurisuDraw';
 if(e===ATTACK_DRAW)return 'attackMayDraw';
 if(e===EVENT_MAIN)return 'eventUntilBuff';
 if(e===DISCARD_IBN)return 'discardIbn';
 if(e===DMAIL_BUFF)return 'dmailTurnBuff';
 if(e===OPEN_FRONT)return 'openFrontBuff';
 if(e===KURISU_RETIRE)return 'kurisuRetire';
 if(e===ANY_READY)return 'anyReadyAp';
 if(e===WIN_MOVED)return 'winDrawMoved';
 if(e===ATTACK_END_FRONT)return 'attackEndFront';
 if(e===MAD)return 'madScientist';
 if(e===SUZUHA_DRAW)return 'suzuhaAttackDraw';
 if(e===DMAIL_SEARCH)return 'dmailSearch';
 if(e===DIFFERENT_FIELD)return 'differentField';
 if(e===FRONT_ENERGY)return 'eventFrontEnergy';
 if(e===GRANT_STEP)return 'grantStep';
 if(e===INSPECT_ENTRY)return 'inspectCharacterEntry';
 if(e===LAB_REST)return 'labHandRest';
 if(e===TRIGGER_SEARCH)return 'triggerSearch';
 if(e===TRIGGER_BRANCH)return 'triggerDrawBranch';
 if(e===RAIDED_DRAW)return 'raidedTriggerDraw';
 if(e===KURISU_BLOCK)return 'kurisuBlockDraw';
 if(e===OKABE_WALL)return 'okabeWall';
 if(e===IBN_GATE)return 'ibnGate';
 if(e===IMPACT_MOVE)return 'impactMove';
 if(e===TRIGGER_RETIRE)return 'triggerKindRetire';
 if(e===FARIS)return 'farisReplay';
 if(e===KURISU_PROTECT)return 'kurisuProtect';
 if(e===MAYURI_SHIFT)return 'mayuriShift';
 if(e===SUZUHA_ACTIVE)return 'suzuhaActive';
 if(e===OKABE_CHOOSE)return 'okabeChoose';
 if(e===MAYURI_DELAY)return 'mayuriDelay';
 if(e===KURISU_DUAL)return 'kurisuDual';
 if(e===DMAIL_FIELD)return 'dmailField';
 if(e===MAYURI_SLAP)return 'mayuriSlap';
 if(e===RUKA_GRANT)return 'rukaGrant';
 return null;
}

const STANDARD={
 active:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
 draw:'【ドロー】カードを1枚引く。',
 get:'【ゲット】このカードを手札に加える。',
 final:'【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。'
};

export function stgPackCard(card){
 const kind=stgEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 if(!kind)throw Error(card.id+' is catalogue-only');
 if(card.trigger==null){
  if(card.triggerTextJa!=='-')throw Error(card.id+' missing trigger text');
 }else if(card.trigger==='color'){
  const green=(kind==='colorOtherBuff'||kind==='dmailField')&&card.triggerTextJa===COLOR_TRIGGER&&card.color==='green';
  const bounce=kind==='raidedTriggerDraw'&&card.triggerTextJa===COLOR_BOUNCE&&card.color==='blue';
  if(!green&&!bounce)throw Error(card.id+' color trigger is not a registered printed profile');
 }else if(card.trigger==='special'){
  if(!['kurisuRetire','okabeWall','impactMove'].includes(kind)||card.triggerTextJa!==SPECIAL)
   throw Error(card.id+' special trigger is not the printed front retirement');
 }else if(card.trigger==='raid'){
  if(!['triggerKindRetire','farisReplay','kurisuProtect','mayuriShift','kurisuDual'].includes(kind)||
   card.triggerTextJa!==RAID_TRIGGER)
   throw Error(card.id+' raid trigger is not the standard printed text');
 }else if(STANDARD[card.trigger]!==card.triggerTextJa)
  throw Error(card.id+' trigger is not the standard printed text');
 const pip={blue:'青',green:'緑'}[card.color];
 if(!pip)throw Error(card.id+' is not a blue or green Steins;Gate card');
 if(kind==='activeEnergy'&&!card.effectJa.includes('【'+pip+'】'))
  throw Error(card.id+' active energy color drifted');
 if(kind==='restEnergyRetire'&&!card.effectJa.includes('【'+pip+'】'))
  throw Error(card.id+' rest energy color drifted');
 if(kind==='emptyDrawDiscard'&&(card.color!=='blue'||card.energy<2))
  throw Error(card.id+' empty-field discount is not blue 2');
 if(kind==='openFrontBuff'&&(card.color!=='green'||card.type!=='character'||card.energy<2))
  throw Error(card.id+' open-front discount is not a green character');
 if(kind==='dmailSearch'&&(card.color!=='green'||card.type!=='character'||card.energy<2))
  throw Error(card.id+' D-mail search discount is not a green character');
 if(kind==='kurisuRetire'&&card.type!=='event')
  throw Error(card.id+' Kurisu retirement is an event');
 if(kind==='differentField'&&(card.type!=='character'||card.color!=='green'))
  throw Error(card.id+' different field entry is a green character');
 if(['winDrawMoved','attackEndFront','eventFrontEnergy','grantStep'].includes(kind)&&
  card.type!=='character')
  throw Error(card.id+' this print is a character');
 if(kind==='restKurisuDraw'&&card.type!=='event')
  throw Error(card.id+' named rest draw is an event');
 if((kind==='activeEnergy'||kind==='restEnergyRetire')&&card.gen!==0)
  throw Error(card.id+' plus generation is a design mark, not a printed number');
 const onPlay=kind==='drawDiscard'||kind==='emptyDrawDiscard'?[{op:'drawDiscard',count:1}]:
  kind==='draw2'?[{op:'draw',count:2}]:
  kind==='recoverAp2'?[{op:'recoverAp',count:2}]:
  kind==='bounce'?[{op:'bounceOwnOtherUnderEnergy',energy:1}]:
  kind==='peek'?[{op:'peekTopOne'}]:
  kind==='drawIfMayuri'?[{op:'drawIfOwnName',name:'椎名 まゆり',count:1}]:
  kind==='searchThree'?[{op:'searchTopOneBottomDiscard',count:4,logic:'any',
   filters:['岡部 倫太郎','椎名 まゆり','橋田 至'].map(value=>({field:'name',value}))}]:
  kind==='inspectThree'?[{op:'inspectTopArrange',count:3,toOutside:true,rest:'top'}]:
  kind==='otherRetireDraw2'?[{op:'retireOwnCharacterOne',optional:true,excludeSelf:true,
   after:[{op:'draw',count:2}]}]:
  kind==='searchFive'?[{op:'searchTopOneBottomDiscard',count:3,logic:'any',
   filters:LAB.map(value=>({field:'name',value}))}]:
  kind==='searchCharacter'?[{op:'searchTopOneBottomDiscard',count:3,
   filter:{field:'type',value:'character'},discard:false}]:
  kind==='chooseNames'?[DRAW_OR_NAMES]:
  kind==='colorOtherBuff'?[DRAW_OR_OTHER]:
  kind==='restKurisuDraw'?[{op:'restNamedActiveFrontThenDraw',name:'牧瀬 紅莉栖',draw:3}]:
  kind==='discardIbn'?[{op:'discardGate',optional:true,then:[{op:'recoverOutsideOne',
   filter:{field:'name',value:'IBN5100'},optional:true}]}]:
  kind==='dmailTurnBuff'?[
   {op:'recoverOutsideOne',filter:{field:'name',value:'Dメール'},optional:true},
   {op:'ifLiveThen',when:{kind:'controllerTurn',turn:'own'},then:[{op:'buffOwnField',
    filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:false}]}
  ]:
  kind==='fieldDrawRetire'?[{op:'drawDiscard',count:1}]:
  kind==='kurisuRetire'?[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'牧瀬 紅莉栖',
   bonusBp:5000,mandatory:true}]:
  kind==='anyReadyAp'?[{op:'searchTopAnyReadyAp',count:5,name:'フェイリス・ニャンニャン',type:'field'}]:
  kind==='madScientist'?[
   {op:'buffOwnCharactersAll',bp:1000},
   {op:'grantPrintedApImpact',ap:1,amount:1,optional:true},
   {op:'drawIfOwnName',name:'岡部 倫太郎',count:1}]:
  kind==='suzuhaAttackDraw'?[
   {op:'draw',count:1},
   {op:'grantNamedBuffAttackDraw',name:'阿万音 鈴羽',bp:1000,optional:true}]:
  kind==='dmailSearch'?[{op:'searchTopOneBottomDiscard',count:4,logic:'any',filters:[
   {field:'type',value:'field'},{field:'name',value:'Dメール'}]}]:
  kind==='differentField'?[{op:'retireOwnFieldThenDifferent',color:'green'}]:
  kind==='inspectCharacterEntry'?[{op:'inspectTopAnyOutside',count:2,rest:'top',
   whenEnteredByCharacter:{count:3}}]:
  kind==='labHandRest'?[{op:'deployOwnHandRest',type:'character',color:'green',
   energy:2,ap:1,max:1,names:LAB}]:
  kind==='triggerSearch'?[{op:'searchTopOneBottomDiscard',count:3,logic:'all',filters:[
   {field:'type',value:'event'},
   {field:'printedRequiredEnergyAtMost',value:3},
   {field:'triggerNot',value:'final'}
  ],whenTriggers:{color:'blue',maxEnergy:3,min:3,count:5}}]:
  kind==='triggerDrawBranch'?[{op:'outsideTriggerDrawBranch',color:'blue',maxEnergy:3,atMost:3}]:
  kind==='kurisuBlockDraw'?[
   {op:'grantOwnNameBlockAtLeast',name:'牧瀬 紅莉栖',bp:4000,optional:false,alsoBp:1500},
   {op:'drawIfOutsideEventTriggers',color:'blue',maxEnergy:3,min:3,count:1,excludeSource:true}
  ]:
  kind==='okabeWall'?[
   {op:'retireOppFrontAtMostBp',bp:5000},
   {op:'mayRemoveNamedZones',name:'岡部 倫太郎',
    minOutside:{name:'椎名 まゆり',color:'blue',min:7}}
  ]:
  kind==='ibnGate'?[{op:'discardGate',optional:true,payment:{zone:'hand',field:'typeAny',
   values:['event','field']},then:[{op:'searchTopAddOneMillRest',count:2}]}]:
  kind==='impactMove'?[{op:'retireOwnOtherCardThen',optional:true,
   then:[{op:'moveOppFrontIfEvent',optional:true}]}]:
  kind==='triggerKindRetire'?[
   {op:'retireOppFrontByOutsideTriggers',optional:true,color:'blue',maxEnergy:3,per:1000},
   {op:'grantSelfImpactIfOutsideTriggers',color:'blue',maxEnergy:3,min:5,amount:1}
  ]:
  kind==='farisReplay'?[
   {op:'mayDrawOne'},
   {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:false}
  ]:
  kind==='kurisuProtect'?[{op:'grantOtherUntargetable',optional:true}]:
  kind==='suzuhaActive'?[{op:'discardGate',optional:true,then:[
   {op:'recoverOutsideEventNoFinal',maxEnergy:3,optional:true}]}]:
  kind==='okabeChoose'?[{op:'peekTopOne'}]:
  kind==='mayuriDelay'?[{op:'gainRetireUnlessCharacterEntry'}]:
  kind==='dmailField'?[
   {op:'restActiveFieldThenDrawDiscard'},
   {op:'deployOwnHandActiveNoRaid',type:'character',color:'green',maxEnergy:4,ap:1,optional:true}
  ]:
  kind==='mayuriSlap'?[SLAP,{op:'readyApIfOutsideTriggerKinds',color:'blue',maxEnergy:3,min:3,excludeSource:true}]:
  null;
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'?'vanilla':'dsl',
  effects:kind==='retireDrawOkabe'?{onRetire:[{op:'drawIfOwnName',name:'岡部 倫太郎',count:1}]}:
   kind==='fieldDrawRetire'?{onPlay,onRetire:[{op:'draw',count:1}]}:
   kind==='ibnGate'?{onPlay,onRetire:[IBN_RETIRE]}:
   kind==='raidedTriggerDraw'?{onRaided:[{op:'drawIfOutsideEventTriggers',
    color:'blue',maxEnergy:3,min:3,count:1}]}:
   kind==='attackMayDraw'?{onAttack:[{op:'mayDrawDiscardIfOwnEvent'}]}:
   kind==='farisReplay'?{onPlay,onAttack:[{op:'replayOnPlayIf',when:'eventAndOwnField'}]}:
   kind==='kurisuProtect'?{onPlay,onAttack:[KURISU_ATTACK]}:
   kind==='mayuriShift'?{onAttack:[{op:'buffOwnField',filter:{field:'type',value:'character'},
    bp:1000,optional:true,excludeSelf:false,moveIfEnergy:true}],
    onRetire:[{op:'buffEnergyMoveFront',bp:2000,optional:true}]}:
   kind==='mayuriDelay'?{onPlay,onAttack:[{op:'searchTopOneBottomDiscard',count:3,logic:'any',
    filters:MAYURI_NAMES.map(value=>({field:'name',value}))}]}:
   onPlay?{onPlay}:{},
  ...(kind==='impactNull'||kind==='labHandRest'||kind==='impactMove'||
   kind==='okabeChoose'||kind==='mayuriDelay'?{impactNull:true}:{}),
  ...(kind==='doubleBlock'?{readyOnBlockCount:1}:{}),
  ...(kind==='bpImmuneTurn'?{bpDownImmune:true,ownTurnBp:500}:{}),
  ...(kind==='emptyDrawDiscard'?{emptyOwnFieldHandEnergyDiscount:2}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='restEnergyRetire'?{mainAbility:{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}}:{}),
  ...(kind==='eventTurnBp1500'?{passiveBonuses:[{
   condition:{kind:'ownEventUsedThisTurn',turn:'own'},bp:1500}]}:{}),
  ...(kind==='triggerDrawBranch'?{passiveBonuses:[{
   condition:{kind:'ownEventUsedThisTurn',turn:'own'},bp:1000}]}:{}),
  ...(kind==='restBuff'?{mainAbility:{op:'restSelfBuffOther',bp:1000}}:{}),
  ...(kind==='colorOtherBuff'?{triggerEffect:{
   op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}}:{}),
  ...(kind==='eventUntilBuff'?{mainAbility:{
   op:'frontOnceProgram',frontOnly:false,oncePerTurn:true,requireOwnEventUsed:true,
   then:[{op:'buffSelfUntilNextOwnStart',bp:1000}]}}:{}),
  ...(kind==='openFrontBuff'?{emptyOwnFieldHandEnergyDiscount:2,phaseEffects:[{
   phase:'attack',edge:'start',turn:'own',then:[{op:'buffSelfIfFrontOpen',bp:1000}]}]}:{}),
  ...(kind==='kurisuRetire'||kind==='okabeWall'||kind==='impactMove'?
   {triggerEffect:{op:'retireOppFront'}}:{}),
  ...(kind==='raidedTriggerDraw'?{emptyOwnFieldHandEnergyDiscount:2,
   triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500}}:{}),
  ...(kind==='okabeWall'?{playRequiresOwnName:'岡部 倫太郎'}:{}),
  ...(kind==='triggerKindRetire'||kind==='kurisuProtect'||kind==='kurisuDual'?{raidName:'牧瀬 紅莉栖'}:{}),
  ...(kind==='farisReplay'?{raidName:'フェイリス・ニャンニャン'}:{}),
  ...(kind==='mayuriShift'?{raidName:'椎名 まゆり'}:{}),
  ...(kind==='suzuhaActive'?{enterAlwaysActive:true,mainAbility:{
   op:'readyOtherRestedOnce',oncePerTurn:true}}:{}),
  ...(kind==='okabeChoose'?{mainAbility:{
   op:'restNamedFrontThenChoose',oncePerTurn:true,name:'牧瀬 紅莉栖',
   impact:1,downBp:1000,minBp:1500}}:{}),
  ...(kind==='mayuriDelay'?{mainAbility:{
   op:'activeSelfOnceByKey',onceKey:'椎名 まゆり|STG-1-018'}}:{}),
  ...(kind==='kurisuDual'?{mainAbility:{
   op:'kurisuFrontDual',discountOnceKey:'牧瀬 紅莉栖|STG-1-028-discount',buffBp:2000,
   filter:{cardType:'event',printedRequiredEnergyAtMost:3,triggerNot:'final'}}}:{}),
  ...(kind==='dmailField'?{colorTriggerMayField:true,triggerEffect:{
   op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}}:{}),
  ...(kind==='mayuriSlap'?{handUseOncePerName:true}:{}),
  ...(kind==='rukaGrant'?{mainAbility:{
   op:'rukaFrontGrant',oncePerTurn:true,frontOnly:true,nameLock:'漆原 るか'}}:{}),
  ...(kind==='winDrawMoved'?{attackWinDraw:{count:1,sides:'either',
   condition:{kind:'selfMovedThisTurn',turn:'any'}}}:{}),
  ...(kind==='attackEndFront'?{phaseEffects:[{phase:'attack',edge:'end',turn:'own',
   then:[{op:'mayMoveSelfToFront'}]}]}:{}),
  ...(kind==='dmailSearch'?{emptyOwnFieldHandEnergyDiscount:2}:{}),
  ...(kind==='eventFrontEnergy'?{mainAbility:{
   op:'frontOnceProgram',frontOnly:false,oncePerTurn:true,requireOwnEventUsed:true,
   then:[{op:'grantSelfFrontEnergyUntilNextOwnStart'}]}}:{}),
  ...(kind==='grantStep'?{step:true,grantStepToOtherOwn:true}:{})
 };
}

export const STEINS_GATE_ENGINE_IDS=Object.freeze(
 STEINS_GATE_CARDS.filter(c=>c.engineKind).map(c=>c.id));

export function createStgV2Pack(){
 const cards=STEINS_GATE_CARDS.filter(c=>c.engineKind).map(stgPackCard);
 if(cards.length!==74)throw Error('Steins;Gate registered count drifted');
 return createUniversalPack({
  id:'steins-gate',version:'stg-ua57-batches-41-50-20261028',cards
 });
}
