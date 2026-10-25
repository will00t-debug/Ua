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
 if(e==='【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。')return 'buffOther';
 if(e==='【登場時】BP2500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-2000。')return 'frontDown2500';
 if(TOP_OUTSIDE.has(e))return 'topOutside';
 if(e===TOP_KEEP)return 'topKeep';
 if(e===ALIAS_PREFIX+TOP_KEEP)return 'aliasTopKeep';
 if(SEARCHES.some(s=>s.ja===e))return 'searchNames';
 return null;
}
const TOP_OUTSIDE=new Map([
 ['【登場時】自分の山札の上から3枚見る。その中から1枚まで場外に置き、残りを望む順で山札の上に置く。',3],
 ['【登場時】自分の山札の上から2枚見る。その中から1枚まで場外に置き、残りを望む順で山札の上に置く。',2]
]);
const TOP_KEEP='【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で山札の上に置き、残りを場外に置く。';
const ALIAS_PREFIX='このカードは〈クルシュ・カルステン〉としても〈フェリス〉としても扱う。';
const REST_SKIP='【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。';
const BOUNCE_3500='【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。';
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
 if(kind==='frontDown2500')return [{op:'enemyBpDown',bp:2000,optional:true,minBp:2500,zone:'front'}];
 if(kind==='topOutside')return [{op:'inspectTopArrange',count:TOP_OUTSIDE.get(card.effectJa),toOutside:true,rest:'top'}];
 if(kind==='topKeep'||kind==='aliasTopKeep')return [{op:'inspectTopAnyOutside',count:2,rest:'top'}];
 if(kind==='searchNames'){
  const spec=SEARCHES.find(s=>s.ja===card.effectJa);
  return [{op:'searchTopOneBottomDiscard',count:spec.count,logic:'any',
   filters:spec.names.map(value=>({field:'name',value}))}];
 }
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
 if(kind==='frontDown2500'&&triggerEffect?.op!=='restOppFrontSkipNextActive')
  throw Error(card.id+' color trigger is not the printed rest');
 if(bouncePrint&&triggerEffect?.op!=='bounceOppFrontUnderBp')
  throw Error(card.id+' color trigger is not the printed return');
 if(triggerEffect?.op==='restOppFrontSkipNextActive'&&kind!=='frontDown2500')
  throw Error(card.id+' rest trigger is not this print');
 if(triggerEffect?.op==='bounceOppFrontUnderBp'&&!bouncePrint)
  throw Error(card.id+' return trigger is not this print');
 if(kind==='aliasTopKeep'&&(card.trigger!=null||triggerEffect))
  throw Error(card.id+' alias print has no trigger');
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'||kind==='step'?'vanilla':'dsl',
  effects:ops?{onPlay:ops}:{},
  ...(kind==='step'||kind==='emptyFieldStep'?{step:true}:{}),
  ...(kind==='impactNull'?{impactNull:true}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='handDiscount'?{opponentFieldColorsHandEnergyDiscount:card.handDiscount}:{}),
  ...(kind==='emptyFieldStep'?{emptyOwnFieldHandEnergyDiscount:2}:{}),
  ...(kind==='restEnergyRetire'?{mainAbility:{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}}:{}),
  ...(kind==='feltTurnBp'?{passiveBonuses:[{
   condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'フェルト'},
   bp:1000}]}:{}),
  ...(kind==='eventTurnBp'?{passiveBonuses:[{
   condition:{kind:'ownEventUsedThisTurn',turn:'own'},bp:1000}]}:{}),
  ...(kind==='subaruFrontEnergy'?{passiveBonuses:[{
   condition:{kind:'ownNameExists',turn:'any',zone:'front',excludeSelf:false,name:'ナツキ・スバル'},
   extraEnergy:1}]}:{}),
  ...(kind==='aliasTopKeep'?{nameAliases:['クルシュ・カルステン','フェリス']}:{}),
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
