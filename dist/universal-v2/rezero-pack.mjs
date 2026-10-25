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
 return null;
}
const TOP_OUTSIDE=new Map([
 ['【登場時】自分の山札の上から3枚見る。その中から1枚まで場外に置き、残りを望む順で山札の上に置く。',3],
 ['【登場時】自分の山札の上から2枚見る。その中から1枚まで場外に置き、残りを望む順で山札の上に置く。',2]
]);
const TOP_KEEP='【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で山札の上に置き、残りを場外に置く。';
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
 const specialPrint=kind==='remRetire'||kind==='emiliaRetire'||kind==='minaRetire';
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
   onAttack:[{op:'drawIfOppFrontBelowPrinted',count:1}]}:ops?{onPlay:ops}:{},
  ...(kind==='step'||kind==='emptyFieldStep'?{step:true}:{}),
  ...(kind==='impactNull'?{impactNull:true}:{}),
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
