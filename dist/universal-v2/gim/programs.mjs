// Exact Japanese print → shared V2 DSL for 学園アイドルマスター.
// A sentence stays out until it matches a shared program. Raid-frame cards stay
// out until raid-box.mjs lists every framed keyword. Nothing here is a title opcode.
const norm=text=>String(text??'').replace(/\s+/g,'');
const INK={blue:'青',red:'赤'};
const STANDARD=Object.freeze({
 '':null,
 '-':null,
 '【ドロー】カードを1枚引く。':'draw',
 '【ゲット】このカードを手札に加える。':'get',
 '【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。':'active',
 '【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。':'final'
});
const COLOR_BOUNCE=norm('【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。');
const COLOR_RETIRE=norm('【カラー】BP2500以下の相手のフロントLのキャラを1枚選び、退場させる。');
const HANAMAI='花海 佑芽';
const MISUZU='秦谷 美鈴';
const SENA='十王 星南';
const SAKI='花海 咲季';
const TEMARI='月村 手毬';
const KOTONE='藤田 ことね';

function pending(){return {ready:false,reason:'pending-shared-program'};}
function dsl(extra){return {ready:true,implementation:'dsl',effects:{},...extra};}
function onPlay(op){return dsl({effects:{onPlay:[op]}});}
function triggerAllowed(card){
 const text=norm(card.triggerTextJa);
 if(card.trigger==='color'){
  return (card.color==='blue'&&text===COLOR_BOUNCE)||
   (card.color==='red'&&text===COLOR_RETIRE);
 }
 return Object.prototype.hasOwnProperty.call(STANDARD,text)&&STANDARD[text]===card.trigger;
}
function colorTrigger(card){
 if(card.trigger!=='color')return {};
 return {triggerEffect:card.color==='blue'
  ?{op:'bounceOppFrontUnderBp',bp:3500}
  :{op:'retireOppFrontUnderBp',bp:2500}};
}
function nameOn(name,zone,turn){
 return {kind:'ownNameExists',turn,zone,excludeSelf:false,name};
}
function bothOn(names,zone,turn){
 return {kind:'ownFieldHasAllNames',turn,zone,excludeSelf:false,names};
}
function searchNames(count,names){
 return {op:'searchTopOneBottomDiscard',count,logic:'any',
  filters:names.map(value=>({field:'name',value}))};
}

export function gimSharedProgram(card){
 if(!card||card.title!=='gim'||card.deckLegal!==true||card.type==='action-point')return pending();
 if(card.raidFrame)return pending();
 if(!triggerAllowed(card))return pending();
 const effect=norm(card.effectJa);
 const ink=INK[card.color];
 if(effect===''||effect==='-'){
  if(card.type!=='character'||card.trigger==='color')return pending();
  return {ready:true,implementation:'vanilla',effects:{}};
 }
 if(!ink)return pending();
 if(card.type==='character'&&effect===norm(
  `【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+【${ink}】と「メインフェイズ終了時、このキャラを退場させる。」を得る。`))
  return dsl({mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}});
 if(card.type==='character'&&effect===norm(`このキャラがアクティブの場合、このキャラの発生エナジー+【${ink}】。`))
  return dsl({activeExtraEnergy:1});
 if(card.type==='character'&&effect==='【登場時】カードを2枚引き、自分の手札を2枚場外に置く。')
  return onPlay({op:'drawDiscard',count:2,discardCount:2});
 if(card.type==='character'&&effect==='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。')
  return onPlay({op:'drawDiscard',count:1});
 if(card.type==='character'&&effect==='【登場時】カードを1枚引く。')
  return dsl({...colorTrigger(card),effects:{onPlay:[{op:'draw',count:1}]}});
 if(card.type==='character'&&effect==='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。')
  return onPlay({op:'bounceOwnOtherUnderEnergy',energy:1});
 if(card.type==='character'&&effect==='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）')
  return dsl({impactNull:true});
 if(card.type==='character'&&effect==='【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）')
  return dsl({readyOnBlockCount:1});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から4枚見る。その中からBP2500以下のキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay({op:'searchTopOneBottomDiscard',count:4,logic:'all',filters:[
   {field:'type',value:'character'},{field:'printedBpAtMost',value:2500}]});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から3枚見る。その中から〈花海佑芽〉か〈秦谷美鈴〉か〈十王星南〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay(searchNames(3,[HANAMAI,MISUZU,SENA]));
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から3枚見る。その中から〈月村手毬〉か〈花海咲季〉か〈藤田ことね〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay(searchNames(3,[TEMARI,SAKI,KOTONE]));
 if(card.type==='character'&&effect==='【退場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。')
  return dsl({effects:{onRetire:[{op:'buffOwnField',optional:true,bp:1000,excludeSelf:true,
   filter:{field:'type',value:'character'}}]}});
 if(card.type==='character'&&effect===norm(
  'このキャラのBPが4000以上の場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。'))
  return dsl({passiveBonuses:[{impact:1,condition:{kind:'selfCurrentBpAtLeast',turn:'any',minBp:4000}}]});
 if(card.type==='character'&&effect==='【登場時】自分の場の〈秦谷美鈴〉を1枚まで選び、アクティブにする。')
  return onPlay({op:'activeOwnNamed',name:MISUZU,optional:true,max:1});
 if(card.type==='character'&&effect==='【登場時】自分の場の〈月村手毬〉を1枚まで選び、アクティブにする。')
  return onPlay({op:'activeOwnNamed',name:TEMARI,optional:true,max:1});
 if(card.type==='character'&&effect==='【起動メイン】【レストにする】カードを1枚引き、自分の手札を1枚場外に置く。')
  return dsl({mainAbility:{op:'restSelfThen',frontOnly:false,then:[{op:'drawDiscard',count:1}]}});
 if(card.type==='event'&&effect==='カードを3枚引き、自分の手札を2枚場外に置く。')
  return onPlay({op:'drawDiscard',count:3,discardCount:2});
 if(card.type==='event'&&effect==='自分のAPカードを2枚まで選び、アクティブにする。')
  return onPlay({op:'recoverAp',count:2});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを望む順で下に置く。'))
  return onPlay({op:'inspectTopArrange',count:2,split:true});
 if(card.type==='character'&&effect==='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）')
  return dsl({step:true});
 if(card.type==='character'&&effect==='【登場時】このターン中に自分がイベントカードを使用している場合、カードを1枚引く。')
  return onPlay({op:'ifLiveThen',when:{kind:'ownEventUsedThisTurn',turn:'own'},then:[{op:'draw',count:1}]});
 if(card.type==='character'&&effect===norm(
  '【自分のターン中】自分のフロントLに〈花海咲季〉がある場合、このキャラはBP+1000。'))
  return dsl({passiveBonuses:[{bp:1000,condition:nameOn(SAKI,'front','own')}]});
 if(card.type==='character'&&effect===norm(
  '自分の場に〈花海咲季〉と〈藤田ことね〉がどちらもある場合、このキャラはBP+1000。'))
  return dsl({passiveBonuses:[{bp:1000,condition:bothOn([SAKI,KOTONE],'field','any')}]});
 if(card.type==='character'&&effect===norm(
  '自分の場に〈花海咲季〉と〈藤田ことね〉がどちらもある場合、手札にあるこのカードの消費APを-1する。【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）'))
  return dsl({...colorTrigger(card),impactNull:true,
   handApDiscountWhileAllNames:{amount:1,names:[SAKI,KOTONE]}});
 if(card.type==='character'&&effect==='【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。')
  return onPlay({op:'peekTopOrBottom'});
 if(card.type==='character'&&effect===norm(
  '【アタック時】自分のフロントLに〈花海佑芽〉がある場合、カードを1枚引き、自分の手札を1枚場外に置く。'))
  return dsl({effects:{onAttack:[{op:'ifLiveThen',when:nameOn(HANAMAI,'front','any'),
   then:[{op:'drawDiscard',count:1}]}]}});
 if(card.type==='character'&&effect===norm(
  '【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）【登場時】自分の場に〈月村手毬〉と〈藤田ことね〉がどちらもある場合、カードを1枚引く。'))
  return dsl({step:true,effects:{onPlay:[{op:'ifLiveThen',
   when:bothOn([TEMARI,KOTONE],'field','any'),then:[{op:'draw',count:1}]}]}});
 if(card.type==='field'&&effect===norm(
  '【登場時】自分の山札の上から6枚見る。その中から必要エナジーが3以下のキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。'))
  return onPlay({op:'searchTopOneBottomDiscard',count:6,logic:'all',discard:false,filters:[
   {field:'type',value:'character'},{field:'printedRequiredEnergyAtMost',value:3}]});
 if(card.type==='event'&&effect===norm(
  'カードを1枚引く。このターン中、次に手札から使用する〈葛城リーリヤ〉か〈紫雲清夏〉の消費APを-1する。'))
  return dsl({effects:{onPlay:[
   {op:'draw',count:1},
   {op:'nextEligibleHandPlayApDiscount',fromUsedEvent:true,
    filter:{namesAny:['葛城 リーリヤ','紫雲 清夏']}}
  ]}});
 return pending();
}
