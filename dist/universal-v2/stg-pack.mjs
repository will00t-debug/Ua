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
  if(kind!=='colorOtherBuff'||card.triggerTextJa!==COLOR_TRIGGER||card.color!=='green')
   throw Error(card.id+' color trigger is not the printed green hand character');
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
  null;
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'?'vanilla':'dsl',
  effects:kind==='retireDrawOkabe'?{onRetire:[{op:'drawIfOwnName',name:'岡部 倫太郎',count:1}]}:
   kind==='fieldDrawRetire'?{onPlay,onRetire:[{op:'draw',count:1}]}:
   kind==='attackMayDraw'?{onAttack:[{op:'mayDrawDiscardIfOwnEvent'}]}:
   onPlay?{onPlay}:{},
  ...(kind==='impactNull'?{impactNull:true}:{}),
  ...(kind==='doubleBlock'?{readyOnBlockCount:1}:{}),
  ...(kind==='bpImmuneTurn'?{bpDownImmune:true,ownTurnBp:500}:{}),
  ...(kind==='emptyDrawDiscard'?{emptyOwnFieldHandEnergyDiscount:2}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='restEnergyRetire'?{mainAbility:{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}}:{}),
  ...(kind==='eventTurnBp1500'?{passiveBonuses:[{
   condition:{kind:'ownEventUsedThisTurn',turn:'own'},bp:1500}]}:{}),
  ...(kind==='restBuff'?{mainAbility:{op:'restSelfBuffOther',bp:1000}}:{}),
  ...(kind==='colorOtherBuff'?{triggerEffect:{
   op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}}:{}),
  ...(kind==='eventUntilBuff'?{mainAbility:{
   op:'frontOnceProgram',frontOnly:false,oncePerTurn:true,requireOwnEventUsed:true,
   then:[{op:'buffSelfUntilNextOwnStart',bp:1000}]}}:{}),
  ...(kind==='openFrontBuff'?{emptyOwnFieldHandEnergyDiscount:2,phaseEffects:[{
   phase:'attack',edge:'start',turn:'own',then:[{op:'buffSelfIfFrontOpen',bp:1000}]}]}:{})
 };
}

export const STEINS_GATE_ENGINE_IDS=Object.freeze(
 STEINS_GATE_CARDS.filter(c=>c.engineKind).map(c=>c.id));

export function createStgV2Pack(){
 const cards=STEINS_GATE_CARDS.filter(c=>c.engineKind).map(stgPackCard);
 if(cards.length!==44)throw Error('Steins;Gate registered count drifted');
 return createUniversalPack({
  id:'steins-gate',version:'stg-ua57-batches-11-20-20261027',cards
 });
}
