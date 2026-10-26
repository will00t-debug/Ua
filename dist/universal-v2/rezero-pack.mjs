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
 if(e==='【自分のターン中】自分のフロントLに必要エナジーが0の青の〈ナツキ・スバル〉がある場合、このキャラはBP+1000。')return 'subaruZeroBlueBp';
 if(e==='【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。')return 'buffOther';
 if(e==='【登場時】自分か相手の場の他のキャラを1枚まで選び、このターン中、BP+1000。')return 'buffEither';
 if(e==='【登場時】BP2500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-2000。')return 'frontDown2500';
 if(TOP_OUTSIDE.has(e))return 'topOutside';
 if(e===TOP_KEEP)return 'topKeep';
 if(e===ALIAS_PREFIX+TOP_KEEP)return 'aliasTopKeep';
 if(SEARCHES.some(s=>s.ja===e))return 'searchNames';
 if(e==='【登場時】自分の場に〈レム〉か〈ロズワール・L・メイザース〉がある場合、カードを1枚引く。')return 'drawIfRemOrRoswaal';
 if(e==='【登場時】このターン中に自分がイベントカードを使用している場合、カードを1枚引く。')return 'drawIfEvent';
 if(e==='【登場時】このキャラが自分の効果で登場していた場合、カードを1枚引く。')return 'drawIfOwnEffect';
 if(e==='【登場時】カードを1枚引く。このターン中に自分がイベントカードを使用している場合、自分のAPカードを1枚まで選び、アクティブにする。')return 'drawThenEventAp';
 if(e===SEARCH_SEVEN)return 'searchName7';
 if(e==='【起動メイン】【フロントLにある場合】 【ターン1】自分の場に〈ラム〉と〈レム〉がある場合のみ発動できる。カードを1枚引き、自分の手札を1枚場外に置く。')return 'namesDrawDiscard';
 if(e==='【起動メイン】【レストにする】 【ターン1】自分の山札の上から1枚見る。そのカードを山札の上か下に置く。')return 'fieldPeek';
 if(e==='【起動メイン】【ターン1】自分の手札を1枚公開し、自分の山札の下に置く。公開したカードがBP4000以上のキャラカードの場合、このキャラはこのターン中、BP+2500。')return 'revealBottom2500';
 if(e==='【登場時】自分の場の必要エナジーが0の青の〈ナツキ・スバル〉を1枚手札に戻してもよい。そうした場合、このキャラをアクティブにし、このターン中、BP+1000。')return 'returnPrintedActive';
 if(e==='【自分のターン中】このキャラはBP+1000。【登場時】自分の場外の〈'+TRIAL_NAME+'〉を1枚リムーブエリアに置いてもよい。そうした場合、このキャラをアクティブにする。')return 'trialRemoveActive';
 if(e==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈レム〉がある場合、『BP5000以下』に代わる。')return 'remRetire';
 if(e==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈エミリア〉がある場合、『BP5000以下』に代わる。')return 'emiliaRetire';
 if(e==='このキャラはアクティブで場に登場させる。【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）【登場時】相手のフロントLのキャラを1枚まで選び、このターン中、BP-2500。【起動メイン】【フロントLにある場合】 【ターン1】このキャラをアクティブにする。')return 'garfielEntry';
 if(e==='【登場時】自分の手札を1枚場外に置くか、自分のフロントLのアクティブのキャラを1枚レストにしてもよい。そうした場合、自分の場外から〈'+TRIAL_NAME+'〉を1枚手札に加える。')return 'sanctuaryRecover';
 if(e==='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）【起動メイン】【フロントLにある場合】 【ターン1】自分の手札を1枚自分の山札の上に置く。そうした場合、このキャラはこのターン中、BP+1000。')return 'beatriceHandTop';
 if(e==='カードを2枚引き、自分の手札を1枚場外に置く。その後、自分のフロントLのアクティブのキャラを1枚レストにしてもよい。そうした場合、自分のAPカードを1枚まで選び、アクティブにする。')return 'trialRestAp';
 if(e==='【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、このフィールドをアクティブにする。【起動メイン】【レストにする】 【ターン1】カードを1枚引き、自分の手札を1枚自分の山札の上に置く。')return 'libraryField';
 if(e==='【起動メイン】【フロントLにある場合】 【ターン1】このターン中にこのキャラが自分の効果でアクティブからレストになったことがある場合のみ発動できる。このキャラをアクティブにし、このキャラは次の自分のターン開始時まで、BP+1000。')return 'emiliaRestActive';
 if(e==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈ベアトリス〉がある場合、『BP4000以下』に代わる。自分の場に〈ベアトリス〉と〈ナツキ・スバル〉がある場合、『BP5000以下』に代わる。')return 'minaRetire';
 if(e==='自分の場の〈レム〉を1枚選び、このターン中、BP+1000と【インパクト（+1）】（インパクトの与えるダメージが+1され、インパクトを持たない場合、【インパクト（1）】を得る）を与え、カードを1枚引く。')return 'remImpactDraw';
 if(e==='自分の山札の上から5枚見る。その中から［特徴：王選候補者］かイベントカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。公開したカードが［特徴：王選候補者］の場合、自分のAPカードを1枚まで選び、アクティブにする。')return 'candidateApSearch';
 if(e==='【起動メイン】【フロントLにある場合】 【ターン1】このターン中にこのキャラが自分の効果でアクティブからレストになったことがある場合のみ発動できる。このターン中、次に手札から使用する〈エミリア〉の必要エナジーを【紫×1】減らす。')return 'emiliaHandEnergy';
 if(e==='自分の効果で自分の手札から公開しているこのカードは元々のBPが4000のキャラカードとしても扱う。BP4500以上の相手のフロントLのキャラを1枚選び、退場させる。')return 'handRevealRetire';
 if(e==='このキャラはアクティブで場に登場させる。【登場時】BP1500以上の相手のフロントLのキャラを2枚まで選び、このターン中、BP-1000。【アタック時】相手のフロントLに元々のBPよりBPが低いキャラがある場合、カードを1枚引く。')return 'activeFrontDownDraw';
 if(e==='このカードは自分の場に〈クルシュ・カルステン〉がある場合のみ使用できる。BP5000以下の相手のフロントLのキャラを1枚選び、退場させる。このターン中、自分の効果で自分の手札のキャラカードのBPを参照する場合、BP+1000されたものとして扱ってもよい。')return 'cruschRetireHandBp';
 if(e==='【登場時】自分のターン中の場合、APを1支払ってもよい。そうした場合、BP4500以上の相手のフロントLのキャラを1枚まで選び、退場させる。【起動メイン】【ターン1】自分の手札を1枚公開し、自分の山札の下に置く。公開したカードがBP4000以上のキャラカードの場合、このキャラはこのターン中、【インパクト（1）】を得る。')return 'wilhelmPayImpact';
 if(e==='【起動メイン】【APを1支払う】このカードが自分の手札にあり、必要エナジーを満たす場合のみ発動できる。このカードを公開し、BPが4000以上の場合、自分の場にこのカードをレストで登場させ、自分の場の他のキャラを1枚まで選び、アクティブにする。')return 'handPayRevealDeploy';
 if(e==='【レイド】〈エキドナ〉アクティブにし、フロントLに移動できる【登場時】カードを1枚引く。【起動メイン】【フロントLにある場合】 【ターン1】自分のフロントLのアクティブのキャラを1枚レストにする。そうした場合、カードを1枚引く。')return 'raidFrontRestDraw';
 if(e==='【レイド】〈ナツキ・スバル〉アクティブにし、フロントLに移動できる【登場時】カードを1枚引く。【退場時】このキャラのレイド元のカードを1枚まで自分の場にレストで登場させる。')return 'raidRetireBase';
 if(e==='BP5000以下の相手のフロントLのキャラを1枚選び、『レストにする』。自分の場に〈エミリア〉がある場合、『退場させる』に代わる。その後、自分の場に〈エミリア〉と〈パック〉がある場合、自分の山札の上から1枚見る。そのカードを山札の上か場外に置く。')return 'spiritRestPeek';
 if(e==='【レイド】〈エミリア〉アクティブにし、フロントLに移動できる自分の場外にイベントカードが6枚以上ある場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。【アタック時】自分の山札の上から1枚見る。そのカードを山札の上か場外に置く。このターン中に自分がイベントカードを使用している場合、カードを1枚引く。')return 'raidEventImpactPeek';
 if(e==='【レイド】〈ベアトリス〉アクティブにし、フロントLに移動できる自分の場に〈ナツキ・スバル〉がある場合、このキャラは【インパクト（1）】を得る。【登場時】自分の場の〈ナツキ・スバル〉を1枚まで選び、アクティブにする。このキャラが自分の効果で登場していた場合、カードを1枚引く。')return 'raidSubaruImpactActive';
 if(e==='【レイド】〈レム〉アクティブにし、フロントLに移動できる【登場時】『BP1000』以下の相手のフロントLのキャラを1枚まで選び、退場させる。自分の場の必要エナジーが0の青の〈ナツキ・スバル〉1枚につき、この効果で選べるキャラのBPの範囲+1000。')return 'raidRemScaledRetire';
 if(e==='【レイド】〈エミリア〉アクティブにし、フロントLに移動できる【登場時】このターン中、次に手札から使用する必要エナジーが3以下のイベントカードの消費APを-1する。自分の場外にイベントカードが4枚以上ある場合、相手のフロントLのキャラを1枚まで選び、レストにする。自分の場外にイベントカードが8枚以上あるなら、選んだキャラは次の1回アクティブにならない。')return 'raidEmiliaDiscountRest';
 if(e==='【レイド】〈レム〉アクティブにし、フロントLに移動できる【自分のターン中】このキャラはBP+500。【登場時】カードを1枚引き、自分の手札を1枚場外に置く。【起動メイン】【フロントLにある場合】 【ターン1】BP1500以上の相手のフロントLのキャラを1枚選び、このターン中、BP-1000。【アタック時】自分の場にあるキャラが全て〈レム〉の場合、カードを1枚引き、自分の手札を1枚場外に置く。')return 'raidRemTurnBpDraw';
 if(e==='【レイド】〈エミリア〉アクティブにし、フロントLに移動できる【登場時】相手のフロントLのキャラを1枚まで選び、このターン中、BP-3500。【起動メイン】【フロントLにある場合】 【ターン1】このキャラがレストの場合のみ発動できる。BP1500以下の相手のフロントLのキャラを1枚まで選び、退場させる。このキャラをアクティブにし、このターン中、【インパクト（1）】を得る。')return 'raidEmiliaDownRestedRetire';
 if(e==='【レイド】〈レム〉アクティブにし、フロントLに移動できる【登場時】自分の手札から必要エナジーが3以下で消費APが1の黄の〔〈ラム〉か〈レム〉〕を1枚まで自分の場にレストで登場させる。【起動メイン】【フロントLにある場合】 【ターン1】自分の場の〈ラム〉か他の〈レム〉を1枚まで選び、このターン中、【インパクト（1）】を与える。')return 'raidRemHandImpact';
 if(e==='【レイド】〈レム〉アクティブにし、フロントLに移動できる【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）【登場時】自分の場外から必要エナジーが0の青の〈ナツキ・スバル〉を1枚まで自分の場にレストで登場させる。【アタック時】自分の場の必要エナジーが0の青の〈ナツキ・スバル〉を1枚まで選び、このターン中、「このキャラはBP4000以上のキャラにブロックされない。」を与える。')return 'raidRemImpactSubaruBlock';
 if(e==='【レイド】〈ベアトリス〉アクティブにし、フロントLに移動できる【自分のターン中】自分の場に〈ナツキ・スバル〉がある場合、このキャラはBP+500。【登場時】相手のフロントLのキャラを1枚まで選び、エナジーLに移動させる。このキャラが自分の効果で登場していた場合、選んだキャラに次の自分のターン開始時まで、「このキャラは移動できない。」を与える。')return 'raidBeatriceMoveLock';
 if(e==='【レイド】〈エミリア〉アクティブにし、フロントLに移動できる【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）このキャラはBP2000以下のキャラにブロックされない。このキャラがアタックしてブロックされなかった時、相手のフロントLのキャラを1枚まで選び、レストにする。【起動メイン】【エナジーLにある場合】 【ターン1】自分のフロントLのキャラを1枚選び、このキャラと位置を入れ替える。')return 'raidEmiliaBlockRestSwap';
 if(e===TOP_KEEP_NAMED)return 'topKeepNamedReveal';
 if(e===DRAW_OR_BEATRICE)return 'drawOrBeatriceReveal';
 if(e===RAID_PEEK_BEATRICE)return 'raidPeekBeatriceReveal';
 if(e===DECK_ENTRY_ACTIVE)return 'deckCharacterEntryActive';
 if(e===ALSO_EVENT)return 'alsoEvent';
 if(e===ALSO_EMILIA_ACTIVE)return 'alsoEmiliaActive';
 if(e===PUCK_IMPACT_DURATION)return 'puckImpactDuration';
 if(e===CRUSCH_HAND_BP)return 'cruschHandBp';
 if(e===FERRIS_BOTTOM_OUTSIDE)return 'ferrisBottomOutside';
 if(e===FLUGEL_REVEAL_RETIRE)return 'flugelRevealRetire';
 if(e===FELT_PAY_BLOCK)return 'feltPayBlock';
 if(e===RAM_SUBSTITUTE_DOWN)return 'ramSubstituteDown';
 if(e===REM_TRAITLESS_SNIPER)return 'remTraitlessSniper';
 if(e===REM_SUBARU_ENTRY)return 'remSubaruEntryChoice';
 if(e===BEATRICE_BOUNCE_INSTEAD)return 'beatriceBounceInstead';
 if(e===SUBARU_FACEDOWN_RETURN)return 'subaruFacedownReturn';
 return null;
}
const TOP_OUTSIDE=new Map([
 ['【登場時】自分の山札の上から3枚見る。その中から1枚まで場外に置き、残りを望む順で山札の上に置く。',3],
 ['【登場時】自分の山札の上から2枚見る。その中から1枚まで場外に置き、残りを望む順で山札の上に置く。',2]
]);
const TOP_KEEP='【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で山札の上に置き、残りを場外に置く。';
const NAMED_REVEAL='自分の山札の上から1枚公開し、『手札に加える』。公開したカードが必要エナジーを満たす';
const REST_OR_RAID='の場合、『自分の場にレストで登場させるかレイドさせる』に代えてもよい。';
const TOP_KEEP_NAMED='自分の山札の上から3枚見る。その中から望む枚数を望む順で山札の上に置き、残りを場外に置く。その後、'+NAMED_REVEAL+'〔〈ナツキ・スバル〉か〈ベアトリス〉〕'+REST_OR_RAID;
const DRAW_OR_BEATRICE='【登場時】以下から1つ選ぶ。・カードを1枚引き、自分の手札を1枚自分の山札の上か場外に置く。・APを1支払ってもよい。そうした場合、'+NAMED_REVEAL+'〈ベアトリス〉'+REST_OR_RAID;
const RAID_PEEK_BEATRICE='【レイド】〈ナツキ・スバル〉アクティブにし、フロントLに移動できる【登場時】自分の山札の上から2枚見る。その中から1枚まで場外に置く。残りを望む順で山札の上に置く。カードを1枚引く。【アタック時】【ターン1】APを1支払ってもよい。そうした場合、'+NAMED_REVEAL+'〈ベアトリス〉'+REST_OR_RAID;
const DECK_ENTRY_ACTIVE='【自分のターン中】このターン中に自分が山札からキャラカードを登場させるかレイドさせている場合、このキャラはBP+500。【登場時】このキャラが自分の効果で登場していた場合、このキャラをアクティブにする。';
const ALSO_EVENT='このカードは全ての場所でイベントカードとしても扱う。【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）';
const ALSO_EMILIA_ACTIVE='このカードは全ての場所でイベントカードとしても扱う。【自分のターン中】自分の場に〈エミリア〉があり、自分の場外にイベントカードが4枚以上ある場合、このキャラはBP+1000。【登場時】自分の場に〈エミリア〉があり、自分の場外にイベントカードが6枚以上ある場合、自分の手札を1枚場外に置いてもよい。そうした場合、このキャラをアクティブにする。';
const PUCK_IMPACT_DURATION='自分の場の〈パック〉を1枚まで選び、『このターン中』、BP+2000と【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を与える。自分の場外に他のイベントカードが6枚以上ある場合、『次の自分のターン開始時まで』に代わる。';
const FERRIS_BOTTOM_OUTSIDE='【レイド】〈フェリス〉アクティブにし、フロントLに移動できる【登場時】自分の手札を1枚まで公開し、自分の山札の下に置く。公開したカードがキャラカードの場合、自分の場外から、〈フェリス〉以外の消費APが1で公開したカードのBP以下の青のキャラカードを1枚手札に加えるか自分の場にレストで登場させる。';
const CRUSCH_HAND_BP='【レイド】〈クルシュ・カルステン〉アクティブにし、フロントLに移動できる【フロントLにある場合】自分の効果で自分の手札のキャラカードのBPを参照する場合、BP+1000されたものとして扱ってもよい。【登場時】自分の山札の上から2枚見る。その中からカードを1枚手札に加え、残りを場外に置く。【起動メイン】【フロントLにある場合】 【ターン1】自分か相手の場のキャラを1枚まで選び、このターン中、BP+1000。';
const FLUGEL_REVEAL_RETIRE='【起動メイン】【レストにする】 【このカードを退場させる】自分の手札を1枚公開し、自分の山札の下に置く。公開したカードがキャラカードの場合、公開したカードのBP以下の相手のフロントLのキャラを1枚まで選び、退場させる。〈フリューゲルの大樹〉のこの効果は1ターンに1回のみ発動できる。';
const FELT_PAY_BLOCK='【登場時】APを1支払ってもよい。そうした場合、以下から1つ選ぶ。・相手は自身の手札を1枚場外に置き、自分はカードを1枚引く。・このキャラをアクティブにし、自分の場外から〈徽章〉を1枚まで手札に加える。【起動メイン】【手札を1枚場外に置く】 【ターン1】このキャラはこのターン中、「このキャラはBP4000以上のキャラにブロックされない。」を得る。';
const RAM_SUBSTITUTE_DOWN='【レイド】〈ラム〉アクティブにし、フロントLに移動できる【相手のターン中】【フロントLにある場合】自分の場の〈レム〉が相手の効果で退場する場合、代わりにこのキャラを退場させてもよい。【登場時】以下から1つ選ぶ。・BP1500以上の相手のフロントLのキャラ全ては、このターン中、BP-1000。・BP2500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-2000。';
const REM_TRAITLESS_SNIPER='【レイド】〈レム〉アクティブにし、フロントLに移動できる【登場時】自分の場にあるキャラが全て特徴を持たない場合、このキャラはこのターン中、【インパクト（1）】を得る。【起動メイン】【ターン1】このキャラはこのターン中、【狙い撃ち】（相手のフロントLのキャラを指定してアタックでき、指定した場合、相手はブロックできない）と「このキャラはBP4000以上のキャラを【狙い撃ち】で指定できない。」を得る。このキャラのレイド元のカードを1枚場外に置く。';
const REM_SUBARU_ENTRY='【登場時】以下から1つ選ぶ。・自分の場外から必要エナジーが0の青の〈ナツキ・スバル〉を1枚まで自分の場にアクティブで登場させる。・自分の場のキャラを1枚手札に戻してもよい。そうした場合、このキャラをアクティブにし、自分の場外から必要エナジーを満たし消費APが1の青の〈ナツキ・スバル〉を1枚まで自分の場にレストで登場させるかレイドさせる。';
const BEATRICE_BOUNCE_INSTEAD='【登場時】自分の場の〈ナツキ・スバル〉を1枚まで選び、次の自分のターン開始時まで、「このキャラが手札に戻す効果以外の相手の効果で場を離れる場合、代わりに手札に戻す。」を与える。';
const SUBARU_FACEDOWN_RETURN='【自分のターン中】このキャラの下に裏向きのカードがある場合、このキャラはBP+1000。【退場時】自分の場に〈エミリア〉があり、このキャラの下に裏向きのカードがない場合、自分の手札を1枚場外に置いてもよい。そうした場合、このキャラを自分のフロントLにレストで登場させ、この効果で場外に置いたカードを裏向きでこのキャラの下に置く。';
const TRIAL_NAME=REZERO_CARDS.find(c=>c.id==='REZ-1-098').nameJa;
const SEARCH_SEVEN='【登場時】自分の山札の上から7枚見る。その中から〈'+TRIAL_NAME+'〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。';
const ALIAS_PREFIX='このカードは〈クルシュ・カルステン〉としても〈フェリス〉としても扱う。';
const REST_SKIP='【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。';
const BOUNCE_3500='【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。';
const SPECIAL_RETIRE='【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。';
const COLOR_DEPLOY='【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。';
const SEARCHES=Object.freeze([
 {ja:'【登場時】自分の山札の上から3枚見る。その中から〈ラム〉か〈レム〉か〈ロズワール・L・メイザース〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。',
  count:3,names:['ラム','レム','ロズワール・L・メイザース']},
 {ja:'【登場時】自分の山札の上から3枚見る。その中から〈ナツキ・スバル〉か〈レム〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。',
  count:3,names:['ナツキ・スバル','レム']},
 {ja:'【登場時】自分の山札の上から3枚見る。その中から〈ナツキ・スバル〉か〈ベアトリス〉か〈禁書庫〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。',
  count:3,names:['ナツキ・スバル','ベアトリス','禁書庫']},
 {ja:'【登場時】自分の山札の上から4枚見る。その中から〈クルシュ・カルステン〉か〈フェリス〉か〈ヴィルヘルム・ヴァン・アストレア〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。',
  count:4,names:['クルシュ・カルステン','フェリス','ヴィルヘルム・ヴァン・アストレア']}
]);
function colorTrigger(card){
 if(card.trigger==='color'&&card.triggerTextJa===REST_SKIP)return {op:'restOppFrontSkipNextActive'};
 if(card.trigger==='color'&&card.triggerTextJa===BOUNCE_3500)return {op:'bounceOppFrontUnderBp',bp:3500};
 if(card.trigger==='special'&&card.triggerTextJa===SPECIAL_RETIRE)return {op:'retireOppFront'};
 if(card.trigger==='color'&&card.triggerTextJa===COLOR_DEPLOY)
  return {op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true};
 if(card.trigger==='color'||card.trigger==='special')
  throw Error(card.id+' trigger is not part of the registered whole print');
 return null;
}
function onPlay(card,kind){
 if(kind==='drawDiscard')return [{op:'drawDiscard',count:1}];
 if(kind==='draw')return [{op:'draw',count:1}];
 if(kind==='bounce')return [{op:'bounceOwnOtherUnderEnergy',energy:1}];
 if(kind==='recoverAp2')return [{op:'recoverAp',count:2}];
 if(kind==='buffOther')return [{op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}];
 if(kind==='buffEither')return [{op:'buffEitherOther',bp:1000,optional:true}];
 if(kind==='returnPrintedActive')return [{op:'returnPrintedActiveBuff',
  name:'ナツキ・スバル',color:'blue',energy:0,bp:1000}];
 if(kind==='trialRemoveActive')return [{op:'removeNamedOutsideActive',name:TRIAL_NAME}];
 if(kind==='remRetire')return [{op:'retireOppFrontUnderBp',bp:3000,bonusName:'レム',bonusBp:5000}];
 if(kind==='emiliaRetire')return [{op:'retireOppFrontUnderBp',bp:3000,bonusName:'エミリア',bonusBp:5000}];
 if(kind==='minaRetire')return [{op:'retireOppFrontTiered',bp:3000,tiers:[
  {names:['ベアトリス'],bp:4000},
  {names:['ベアトリス','ナツキ・スバル'],bp:5000}]}];
 if(kind==='remImpactDraw')return [{op:'buffNamedImpactDraw',name:'レム',bp:1000,impactPlus:1,draw:1}];
 if(kind==='candidateApSearch')return [{op:'searchTopTraitOrEventAp',count:5,trait:'王選候補者'}];
 if(kind==='handRevealRetire')return [{op:'retireOppFrontAtLeastBp',bp:4500}];
 if(kind==='cruschRetireHandBp')return [
  {op:'retireOppFrontAtMostBp',bp:5000},
  {op:'grantHandCharacterBpMay',amount:1000}];
 if(kind==='wilhelmPayImpact')return [{op:'optionalPayApThen',ap:1,optional:true,ownTurn:true,
  then:[{op:'retireOppFrontAtLeastBp',bp:4500,optional:true}]}];
 if(kind==='raidFrontRestDraw')return [{op:'draw',count:1}];
 if(kind==='spiritRestPeek')return [
  {op:'restOrRetireFrontAtMost',bp:5000,retireIfName:'エミリア'},
  {op:'peekTopOneIfFieldNames',names:['エミリア','パック']}];
 if(kind==='raidSubaruImpactActive')return [
  {op:'activeOwnNamed',name:'ナツキ・スバル',max:1,optional:true},
  {op:'draw',count:1,entry:'ownEffect'}];
 if(kind==='raidRemScaledRetire')return [{op:'retireOppFrontScaledBp',base:1000,step:1000,
  name:'ナツキ・スバル',color:'blue',energy:0,optional:true}];
 if(kind==='raidEmiliaDiscountRest')return [
  {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'event',printedRequiredEnergyAtMost:3}},
  {op:'restOppFrontByOutsideEvents',min:4,skipMin:8,optional:true}];
 if(kind==='raidRemTurnBpDraw')return [{op:'drawDiscard',count:1}];
 if(kind==='raidEmiliaDownRestedRetire')return [
  {op:'enemyBpDown',bp:3500,optional:true,zone:'front'}];
 if(kind==='raidRemHandImpact')return [{op:'deployOwnHandNamedRest',color:'yellow',
  maxEnergy:3,ap:1,names:['ラム','レム'],max:1,optional:true}];
 if(kind==='raidRemImpactSubaruBlock')return [{op:'deployOutsidePrintedRest',
  name:'ナツキ・スバル',color:'blue',energy:0,optional:true}];
 if(kind==='raidBeatriceMoveLock')return [{op:'moveOppFrontToEnergy',optional:true,lockIfEntry:'ownEffect'}];
 if(kind==='garfielEntry')return [{op:'enemyBpDown',bp:2500,optional:true,zone:'front'}];
 if(kind==='sanctuaryRecover')return [{op:'payHandOrRestForNamed',name:TRIAL_NAME}];
 if(kind==='frontDown2500')return [{op:'enemyBpDown',bp:2000,optional:true,minBp:2500,zone:'front'}];
 if(kind==='topOutside')return [{op:'inspectTopArrange',count:TOP_OUTSIDE.get(card.effectJa),toOutside:true,rest:'top'}];
 if(kind==='topKeep'||kind==='aliasTopKeep')return [{op:'inspectTopAnyOutside',count:2,rest:'top'}];
 if(kind==='searchNames'){
  const spec=SEARCHES.find(s=>s.ja===card.effectJa);
  return [{op:'searchTopOneBottomDiscard',count:spec.count,logic:'any',
   filters:spec.names.map(value=>({field:'name',value}))}];
 }
 if(kind==='drawIfRemOrRoswaal')return [{op:'drawIfOwnName',count:1,
  names:['レム','ロズワール・L・メイザース']}];
 if(kind==='drawIfEvent')return [{op:'drawIfOwnEventUsed',count:1}];
 if(kind==='drawIfOwnEffect')return [{op:'draw',count:1,entry:'ownEffect'}];
 if(kind==='drawThenEventAp')return [{op:'draw',count:1},{op:'recoverAp',count:1,require:'ownEventUsed'}];
 if(kind==='searchName7')return [{op:'searchTopOneBottomDiscard',count:7,
  filter:{field:'name',value:TRIAL_NAME}}];
 if(kind==='trialRestAp')return [{op:'drawDiscard',count:2,discardCount:1},
  {op:'optionalRestFrontRecoverAp'}];
 if(kind==='libraryField')return [{op:'optionalDiscardActiveSelf'}];
 if(kind==='alsoEmiliaActive')return [{op:'optionalHandOutsideActiveIf',name:'エミリア',minEvents:6}];
 if(kind==='puckImpactDuration')return [{op:'buffNamedImpactDuration',name:'パック',bp:2000,impact:1,optional:true,otherOutsideEvents:6}];
 if(kind==='cruschHandBp')return [{op:'takeTopHandRestOutside',count:2}];
 if(kind==='ferrisBottomOutside')return [{op:'revealHandBottomOutsideCharacter',optional:true,excludeName:'フェリス',color:'blue',ap:1}];
 if(kind==='feltPayBlock')return [{op:'optionalPayApThen',ap:1,optional:true,then:[{op:'chooseOne',optional:false,options:[
  {id:'oppDiscardDraw',label:'對手將1張手牌放到場外，自己抽1張',turn:'any',
   then:[{op:'discardOppHand',count:1},{op:'draw',count:1}]},
  {id:'activeBadge',label:'使這張角色活動，並將場外徽章加入手牌',turn:'any',
   then:[{op:'activeSelf'},{op:'recoverOutsideOne',filter:{field:'name',value:'徽章'},optional:true}]}
 ]}]}];
 if(kind==='ramSubstituteDown')return [{op:'chooseOne',optional:false,options:[
  {id:'allDown',label:'所有對手前線BP1500以上本回合BP-1000',turn:'any',
   then:[{op:'enemyFrontAllBpDown',bp:1000,minBp:1500}]},
  {id:'oneDown',label:'最多1張對手前線BP2500以上本回合BP-2000',turn:'any',
   then:[{op:'enemyBpDown',bp:2000,optional:true,minBp:2500,zone:'front'}]}
 ]}];
 if(kind==='remTraitlessSniper')return [{op:'impactIfEveryOwnTraitless'}];
 if(kind==='remSubaruEntryChoice')return [{op:'chooseOne',optional:false,options:[
  {id:'activeZero',label:'使場外能源0的藍色菜月昴以活動狀態登場',turn:'any',
   then:[{op:'deployOutsidePrintedActive',name:'ナツキ・スバル',color:'blue',energy:0,optional:true}]},
  {id:'bounceRaid',label:'可將1張場上角色放回手牌，再休息登場或突襲菜月昴',turn:'any',
   then:[{op:'bounceThenAffordableSubaru',name:'ナツキ・スバル',color:'blue',ap:1}]}
 ]}];
 if(kind==='beatriceBounceInstead')return [{op:'grantBounceInstead',name:'ナツキ・スバル',optional:true}];
 return null;
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
 const ops=onPlay(card,kind);
 const triggerEffect=colorTrigger(card);
 const bouncePrint=kind==='topKeep'||(kind==='searchNames'&&card.effectJa.includes('ヴィルヘルム'));
 const restPrint=kind==='frontDown2500'||kind==='drawIfEvent';
 if(restPrint&&triggerEffect?.op!=='restOppFrontSkipNextActive')
  throw Error(card.id+' color trigger is not the printed rest');
 if(bouncePrint&&triggerEffect?.op!=='bounceOppFrontUnderBp')
  throw Error(card.id+' color trigger is not the printed return');
 if(triggerEffect?.op==='restOppFrontSkipNextActive'&&!restPrint)
  throw Error(card.id+' rest trigger is not this print');
 if(triggerEffect?.op==='bounceOppFrontUnderBp'&&!bouncePrint)
  throw Error(card.id+' return trigger is not this print');
 const specialPrint=kind==='remRetire'||kind==='emiliaRetire'||kind==='minaRetire'||kind==='cruschRetireHandBp'||kind==='spiritRestPeek';
 if(specialPrint&&triggerEffect?.op!=='retireOppFront')
  throw Error(card.id+' special trigger is not the printed retirement');
 if(triggerEffect?.op==='retireOppFront'&&!specialPrint)
  throw Error(card.id+' retirement trigger is not this print');
 const colorDeploy=kind==='beatriceHandTop'||kind==='trialRestAp';
 if(colorDeploy&&!(triggerEffect?.op==='deployOutsideCharacter'&&triggerEffect.color==='purple'&&
  triggerEffect.maxEnergy===2&&triggerEffect.ap===1&&triggerEffect.frontOnly===true))
  throw Error(card.id+' color trigger is not the printed outside deployment');
 if(triggerEffect?.op==='deployOutsideCharacter'&&!colorDeploy)
  throw Error(card.id+' outside deployment trigger is not this print');
 if(kind==='aliasTopKeep'&&(card.trigger!=null||triggerEffect))
  throw Error(card.id+' alias print has no trigger');
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'||kind==='step'?'vanilla':'dsl',
  effects:kind==='activeFrontDownDraw'?{
   onPlay:[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,maxTargets:2,zone:'front'}],
   onAttack:[{op:'drawIfOppFrontBelowPrinted',count:1}]}:
   kind==='raidRetireBase'?{
    onPlay:[{op:'draw',count:1}],
    onRetire:[{op:'deployOwnRaidBaseRest',optional:true}]}:
   kind==='raidEventImpactPeek'?{onAttack:[
    {op:'peekTopOne'},{op:'drawIfOwnEventUsed',count:1}]}:
   kind==='raidRemTurnBpDraw'?{
    onPlay:[{op:'drawDiscard',count:1}],
    onAttack:[{op:'drawDiscardIfEveryOwnCharacterNamed',count:1,name:'レム'}]}:
   kind==='raidRemImpactSubaruBlock'?{
    onPlay:[{op:'deployOutsidePrintedRest',name:'ナツキ・スバル',color:'blue',energy:0,optional:true}],
    onAttack:[{op:'grantPrintedBlockAtLeast',name:'ナツキ・スバル',color:'blue',energy:0,bp:4000,optional:true}]}:
   kind==='topKeepNamedReveal'?{onPlay:[
    {op:'inspectTopAnyOutside',count:3,rest:'top'},
    {op:'revealTopHandOrAffordableNamed',names:['ナツキ・スバル','ベアトリス']}]}:
   kind==='drawOrBeatriceReveal'?{onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'drawPlace',label:'抽1張，再將1張手牌放到牌頂或場外',turn:'any',
     then:[{op:'drawThenPlaceHand'}]},
    {id:'revealBeatrice',label:'可支付1AP，公開牌頂的碧翠絲',turn:'any',then:[
     {op:'optionalPayApThen',ap:1,optional:true,then:[
      {op:'revealTopHandOrAffordableNamed',names:['ベアトリス']}]}]}
   ]}]}:
   kind==='raidPeekBeatriceReveal'?{
    onPlay:[
     {op:'inspectTopArrange',count:2,toOutside:true,rest:'top'},
     {op:'draw',count:1}],
    onAttack:[{op:'optionalPayApThen',ap:1,optional:true,oncePerAttackTurn:true,then:[
     {op:'revealTopHandOrAffordableNamed',names:['ベアトリス']}]}]}:
   kind==='deckCharacterEntryActive'?{onPlay:[{op:'activeSelfIf',entry:'ownEffect'}]}:
   kind==='subaruFacedownReturn'?{onRetire:[{op:'handOutsideReenterFaceDown',name:'エミリア'}]}:
   ops?{onPlay:ops}:{},
  ...(kind==='step'||kind==='emptyFieldStep'?{step:true}:{}),
  ...(kind==='impactNull'||kind==='alsoEvent'?{impactNull:true}:{}),
  ...(kind==='alsoEvent'?{alsoEvent:true}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='handDiscount'?{opponentFieldColorsHandEnergyDiscount:card.handDiscount}:{}),
  ...(kind==='emptyFieldStep'?{emptyOwnFieldHandEnergyDiscount:2}:{}),
  ...(kind==='restEnergyRetire'?{mainAbility:{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}}:{}),
  ...(kind==='namesDrawDiscard'?{mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireAllNames:['ラム','レム'],
   then:[{op:'drawDiscard',count:1}]}}:{}),
  ...(kind==='fieldPeek'?{mainAbility:{
   op:'restSelfThen',frontOnly:false,oncePerTurn:true,then:[{op:'peekTopOrBottom'}]}}:{}),
  ...(kind==='revealBottom2500'?{mainAbility:{
   op:'revealHandBottomBuff',oncePerTurn:true,minPrintedBp:4000,bp:2500}}:{}),
  ...(kind==='activeFrontDownDraw'?{enterAlwaysActive:true}:{}),
  ...(kind==='garfielEntry'?{enterAlwaysActive:true,impactNull:true,mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[{op:'activeSelf'}]}}:{}),
  ...(kind==='beatriceHandTop'?{impactNull:true,mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'handTopBuffSelf',bp:1000}]}}:{}),
  ...(kind==='libraryField'?{mainAbility:{
   op:'restSelfThen',frontOnly:false,oncePerTurn:true,then:[{op:'drawHandTop'}]}}:{}),
  ...(kind==='emiliaRestActive'?{mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireOwnEffectRest:true,
   then:[{op:'activeSelf'},{op:'buffSelfUntilNextOwnStart',bp:1000}]}}:{}),
  ...(kind==='emiliaHandEnergy'?{mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireOwnEffectRest:true,
   then:[{op:'discountNextNamedHandEnergy',name:'エミリア',color:'purple',amount:1}]}}:{}),
  ...(kind==='handRevealRetire'?{handRevealCharacterBp:4000}:{}),
  ...(kind==='cruschRetireHandBp'?{playRequiresOwnName:'クルシュ・カルステン'}:{}),
  ...(kind==='wilhelmPayImpact'?{mainAbility:{
   op:'revealHandBottomImpact',oncePerTurn:true,minPrintedBp:4000,impact:1}}:{}),
  ...(kind==='handPayRevealDeploy'?{mainAbility:{
   op:'handPayRevealDeploy',payAp:1,minReferencedBp:4000}}:{}),
  ...(kind==='raidRetireBase'?{raidName:'ナツキ・スバル'}:{}),
  ...(kind==='raidEventImpactPeek'?{raidName:'エミリア',passiveBonuses:[{
   impact:1,condition:{kind:'ownOutsideEventCountAtLeast',turn:'any',min:6}}]}:{}),
  ...(kind==='raidSubaruImpactActive'?{raidName:'ベアトリス',passiveBonuses:[{
   impact:1,condition:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,
    name:'ナツキ・スバル'}}]}:{}),
  ...(kind==='raidRemScaledRetire'?{raidName:'レム'}:{}),
  ...(kind==='raidEmiliaDiscountRest'?{raidName:'エミリア'}:{}),
  ...(kind==='raidRemTurnBpDraw'?{raidName:'レム',ownTurnBp:500,mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'enemyBpDown',bp:1000,minBp:1500,zone:'front'}]}}:{}),
  ...(kind==='raidEmiliaDownRestedRetire'?{raidName:'エミリア',mainAbility:{
   op:'restedFrontRetireReadyImpact',frontOnly:true,oncePerTurn:true,bp:1500}}:{}),
  ...(kind==='raidRemHandImpact'?{raidName:'レム',mainAbility:{
   op:'frontOnceGrantImpactNamed',frontOnly:true,oncePerTurn:true,excludeSelf:true,
   names:['ラム','レム']}}:{}),
  ...(kind==='raidRemImpactSubaruBlock'?{raidName:'レム',printedImpact:1}:{}),
  ...(kind==='raidBeatriceMoveLock'?{raidName:'ベアトリス',passiveBonuses:[{
   bp:500,condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,
    name:'ナツキ・スバル'}}]}:{}),
  ...(kind==='raidPeekBeatriceReveal'?{raidName:'ナツキ・スバル'}:{}),
  ...(kind==='deckCharacterEntryActive'?{passiveBonuses:[{
   bp:500,condition:{kind:'ownDeckCharacterEntryThisTurn',turn:'own'}}]}:{}),
  ...(kind==='raidEmiliaBlockRestSwap'?{raidName:'エミリア',impactNull:true,
   unblockedRestFront:true,
   blockBpRestriction:{relation:'atMost',bp:2000,condition:null},
   mainAbility:{op:'energySwapOwnFront',line:'energy',oncePerTurn:true}}:{}),
  ...(kind==='raidFrontRestDraw'?{raidName:'エキドナ',mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'restOwnActiveFrontDraw'}]}}:{}),
  ...(kind==='feltTurnBp'?{passiveBonuses:[{
   condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'フェルト'},
   bp:1000}]}:{}),
  ...(kind==='eventTurnBp'?{passiveBonuses:[{
   condition:{kind:'ownEventUsedThisTurn',turn:'own'},bp:1000}]}:{}),
  ...(kind==='subaruFrontEnergy'?{passiveBonuses:[{
   condition:{kind:'ownNameExists',turn:'any',zone:'front',excludeSelf:false,name:'ナツキ・スバル'},
   extraEnergy:1}]}:{}),
  ...(kind==='trialRemoveActive'?{ownTurnBp:1000}:{}),
  ...(kind==='subaruZeroBlueBp'?{passiveBonuses:[{
   condition:{kind:'ownPrintedCharacter',turn:'own',zone:'front',excludeSelf:false,
    name:'ナツキ・スバル',color:'blue',energy:0},bp:1000}]}:{}),
  ...(kind==='aliasTopKeep'?{nameAliases:['クルシュ・カルステン','フェリス']}:{}),
  ...(kind==='alsoEmiliaActive'?{alsoEvent:true,passiveBonuses:[{
   bp:1000,condition:{kind:'ownNameAndOutsideEvents',turn:'own',name:'エミリア',min:4}}]}:{}),
  ...(kind==='cruschHandBp'?{raidName:'クルシュ・カルステン',handBpMayWhileFront:1000,mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'buffEitherField',bp:1000,optional:true}]}}:{}),
  ...(kind==='ferrisBottomOutside'?{raidName:'フェリス'}:{}),
  ...(kind==='flugelRevealRetire'?{mainAbility:{op:'restLeaveRevealRetire',oncePerName:true}}:{}),
  ...(kind==='feltPayBlock'?{mainAbility:{op:'handOutsideBlockAtLeast',oncePerTurn:true,bp:4000}}:{}),
  ...(kind==='ramSubstituteDown'?{raidName:'ラム',substituteOppRetire:{name:'レム'}}:{}),
  ...(kind==='remTraitlessSniper'?{raidName:'レム',mainAbility:{
   op:'sniperThenRaidBaseOutside',oncePerTurn:true,maxBp:4000}}:{}),
  ...(kind==='subaruFacedownReturn'?{passiveBonuses:[{
   bp:1000,condition:{kind:'ownTurnFacedownUnder',turn:'own'}}]}:{}),
  ...(triggerEffect?{triggerEffect}:{})
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
