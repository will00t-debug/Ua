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
const SPECIAL=norm('【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。');
const RAID=norm('【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。');
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
 if(card.trigger==='special')return text===SPECIAL;
 if(card.trigger==='raid')return text===RAID;
 return Object.prototype.hasOwnProperty.call(STANDARD,text)&&STANDARD[text]===card.trigger;
}
function colorTrigger(card){
 if(card.trigger!=='color')return {};
 return {triggerEffect:card.color==='blue'
  ?{op:'bounceOppFrontUnderBp',bp:3500}
  :{op:'retireOppFrontUnderBp',bp:2500}};
}
function specialTrigger(card){
 return card.trigger==='special'?{triggerEffect:{op:'retireOppFront'}}:{};
}
function raidOnto(card,extra){
 return dsl({raidName:card.nameJa,raidFromRaid:[card.nameJa],...extra});
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
 if(card.type==='character'&&effect==='【ブロック時】このキャラはこのターン中、『BP-1000』。アタックしている相手のキャラがレイド状態の場合、『BP+1000』に代わる。')
  return dsl({blockRaidBp:{plain:-1000,raid:1000}});
 if(card.type==='character'&&effect==='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）【アタック時】このキャラのBPが4000以上の場合、カードを1枚まで引く。')
  return dsl({...colorTrigger(card),impactNull:true,effects:{onAttack:[{op:'ifLiveThen',
   when:{kind:'selfCurrentBpAtLeast',turn:'any',minBp:4000},then:[{op:'optionalDrawOne'}]}]}});
 if(card.type==='character'&&effect==='【レイド】〈倉本千奈〉アクティブにし、フロントLに移動できる【登場時】元々のBPが2500以下の自分の場の他のキャラを1枚まで選び、アクティブにし、選んだキャラとこのキャラはこのターン中、BP+1500。【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】このキャラの【登場時】を発動させる。')
  return raidOnto(card,{effects:{onPlay:[{op:'gimActiveBuffBoth',optional:true,maxPrintedBp:2500,bp:1500}]},
   mainAbility:{op:'gimPayReplay',oncePerTurn:true,frontOnly:true,discard:1}});
 if(card.type==='character'&&effect==='【自分のターン中】自分のフロントLに元々のBPが2500以下の他のキャラがある場合、このキャラはBP+1000。')
  return dsl({passiveBonuses:[{bp:1000,condition:{kind:'ownOtherFrontPrintedBpAtMost',turn:'own',maxPrintedBp:2500}}]});
 if(card.type==='character'&&effect==='【登場時】元々のBPが2500以下の自分の場の他のキャラを1枚まで選び、このターン中、BP+1500。')
  return onPlay({op:'buffOwnField',optional:true,bp:1500,excludeSelf:true,
   filter:{field:'printedBpAtMost',value:2500}});
 if(card.type==='character'&&effect==='【登場時】このターン中、次に手札から使用するBP2500以下のキャラカードの消費APを-1する。〈篠澤広〉のこの効果は1ターンに1回のみ発動する。')
  return onPlay({op:'oncePerTurnGate',scope:'name',optional:false,then:[
   {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'character',printedBpAtMost:2500}}]});
 if(card.type==='character'&&effect==='【レイド】〈篠澤広〉アクティブにし、フロントLに移動できる【フロントLにある場合】元々のBPが2500以下の自分のフロントLのキャラは、相手の効果で選ばれない。【自分のターン中】自分のフロントLに元々のBPが2500以下のキャラがある場合、このキャラはBP+1000。【登場時】自分の場外からBP2500以下のキャラカードを1枚まで手札に加える。')
  return raidOnto(card,{frontLowBpShield:{maxPrintedBp:2500},
   passiveBonuses:[{bp:1000,condition:{kind:'ownFrontPrintedBpAtMost',turn:'own',maxPrintedBp:2500}}],
   effects:{onPlay:[{op:'recoverOutsidePrintedBp',bp:2500,optional:true}]}});
 if(card.type==='character'&&effect==='【登場時】自分の場外から必要エナジーが3以下で消費APが1の青のキャラカードを1枚まで自分の場にレストで登場させるかレイドさせる。')
  return onPlay({op:'gimOutsideEntry',optional:true,color:'blue',ap:1,maxEnergy:3});
 if(card.type==='character'&&effect==='【自分のターン中】このキャラはBP+1000。【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】BP5000以上の自分の場の〔〈花海佑芽〉か〈秦谷美鈴〉か〈十王星南〉〕を1枚選び、このターン中、【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）を与える。')
  return dsl({ownTurnBp:1000,mainAbility:{op:'gimNamedDamage',oncePerTurn:true,frontOnly:true,
   discard:1,minBp:5000,names:[HANAMAI,MISUZU,SENA]}});
 if(card.type==='character'&&effect==='【レイド】〈十王星南〉アクティブにし、フロントLに移動できる【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）【登場時】相手のフロントLのキャラを1枚まで選び、手札に戻す。【起動メイン】【フロントLにある場合】【ターン1】自分の場の【起動メイン】を持つキャラを1枚選び、アクティブにする。')
  return raidOnto(card,{printedImpact:1,effects:{onPlay:[{op:'gimBounceFront',optional:true}]},
   mainAbility:{op:'gimActiveMain',oncePerTurn:true,frontOnly:true}});
 if(card.type==='character'&&effect==='【レイド】〈秦谷美鈴〉アクティブにし、フロントLに移動できる【自分のターン中】このキャラはBP+1000。【登場時】カードを1枚引く。【起動メイン】【フロントLにある場合】【レストにする】【ターン1】このキャラはこのターン中、「このキャラはフロントLにある場合もエナジーを発生させる。」を得る。【起動メイン】【手札を1枚場外に置く】【ターン1】このキャラをアクティブにする。')
  return raidOnto(card,{ownTurnBp:1000,effects:{onPlay:[{op:'draw',count:1}]},printedMains:[
   {op:'restFrontEnergyOnce',id:'frontEnergy',oncePerTurn:true,frontOnly:true},
   {op:'handOnceActive',id:'handActive',discard:1,oncePerTurn:true}]});
 if(card.type==='character'&&effect==='自分のフロントLにBP4000以上のキャラがある場合、このキャラの発生エナジー+【青】。')
  return dsl({passiveBonuses:[{extraEnergy:1,condition:{kind:'ownFrontLiveBpAtLeast',turn:'any',minBp:4000}}]});
 if(card.type==='character'&&effect==='【自分のターン中】自分のフロントLに〈花海佑芽〉以外のBP5000以上のキャラがある場合、このキャラはBP+1000。【起動メイン】【フロントLにある場合】【ターン1】自分の山札の上から1枚見る。そのカードを自分の山札の上か場外に置く。')
  return dsl({passiveBonuses:[{bp:1000,condition:{kind:'ownFrontLiveExceptName',turn:'own',name:HANAMAI,minBp:5000}}],
   mainAbility:{op:'gimFrontPeek',oncePerTurn:true,frontOnly:true}});
 if(card.type==='character'&&effect==='【自分のターン中】自分のフロントLに〈花海佑芽〉以外のBP5000以上のキャラがある場合、このキャラはBP+1000。【起動メイン】【ターン1】このキャラのBPが5000以上の場合のみ発動できる。以下から1つ選ぶ。・このキャラはこのターン中、「【アタック時】カードを1枚まで引く。」を得る。・このキャラはこのターン中、「このキャラはBP3000以下のキャラにブロックされない。」を得る。')
  return dsl({passiveBonuses:[{bp:1000,condition:{kind:'ownFrontLiveExceptName',turn:'own',name:HANAMAI,minBp:5000}}],
   mainAbility:{op:'gimBpFork',oncePerTurn:true,minBp:5000}});
 if(card.type==='field'&&effect==='【起動メイン】【レストにする】【ターン1】自分のフロントLにBP5000以上のキャラがある場合のみ発動できる。カードを1枚引き、自分の手札を1枚場外に置く。')
  return dsl({mainAbility:{op:'gimFieldDraw',oncePerTurn:true,minBp:5000}});
 if(card.type==='event'&&effect==='自分の場外から必要エナジーが3以下で消費APが1の青のキャラカードを1枚自分の場にレストで登場させるかレイドさせる。')
  return onPlay({op:'gimOutsideEntry',optional:false,color:'blue',ap:1,maxEnergy:3});
 if(card.type==='event'&&effect==='元々のBPが2500以下の自分の場のキャラ全ては、このターン中、BP+1500。自分のフロントLのキャラを1枚選び、このターン中、【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を与える。')
  return onPlay({op:'gimBuffAllImpact',maxPrintedBp:2500,bp:1500});
 if(card.type==='event'&&effect==='自分の場のキャラを1枚選び、このターン中、BP+2500。選んだキャラが〈花海佑芽〉の場合、さらにこのターン中、【ダメージ（+1）】（このキャラがアタックで直接ダメージを与える時、追加で1ダメージ）を与える。')
  return onPlay({op:'gimBuffDamageName',bp:2500,plus:1,name:HANAMAI});
 if(card.type==='event'&&effect==='自分の場の元々のBPが2500以下のキャラの合計枚数×1000以下のBPの相手のフロントLのキャラを1枚選び、退場させる。')
  return dsl({...specialTrigger(card),effects:{onPlay:[{op:'gimRetireScale',optional:false,per:1000,maxPrintedBp:2500}]}});
 if(card.type==='event'&&effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈花海佑芽〉と〈秦谷美鈴〉と〈十王星南〉が合計3枚以上ある場合、『BP5000以下』に代わる。')
  return dsl({...specialTrigger(card),effects:{onPlay:[{op:'gimRetireNames',optional:false,base:3000,raised:5000,min:3,names:[HANAMAI,MISUZU,SENA]}]}});
 if(card.type==='character'&&effect==='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【赤×2】減らす。【登場時】カードを1枚引き、自分の手札を1枚場外に置く。【起動メイン】【レストにする】【このカードを退場させる】自分の場外から必要エナジーが3以下のキャラカードを1枚手札に加える。')
  return dsl({emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[{op:'drawDiscard',count:1}]},
   mainAbility:{op:'restRetireThen',then:[{op:'recoverOutsideCharacterUnderEnergy',energy:3,optional:false}]}});
 if(card.type==='character'&&effect==='【レイド】〈葛城リーリヤ〉アクティブにし、フロントLに移動できる【登場時】自分の場外から必要エナジーが2以下のイベントカードを1枚まで手札に加える。【アタック時】このターン中に自分がイベントカードを使用している場合、自分の手札を1枚場外に置いてもよい。そうした場合、自分の場の〈紫雲清夏〉を1枚まで選び、アクティブにする。')
  return raidOnto(card,{effects:{
   onPlay:[{op:'recoverOutsideFiltered',optional:true,max:1,type:'event',energyAtMost:2}],
   onAttack:[{op:'discardGate',optional:true,when:{kind:'ownEventUsedThisTurn',turn:'any'},
    then:[{op:'activeOwnName',name:'紫雲 清夏',optional:true}]}]}});
 if(card.type==='character'&&effect==='【自分のターン中】このターン中に自分がイベントカードを使用している場合、このキャラは「このキャラはBP3000以下のキャラにブロックされない。」を得る。')
  return dsl({...colorTrigger(card),eventTurnBlockAtMost:3000});
 if(card.type==='character'&&effect==='【レイド】〈紫雲清夏〉アクティブにし、フロントLに移動できる【登場時】『BP3000』以下の相手のフロントLのキャラを1枚まで選び、退場させる。自分の場に〈葛城リーリヤ〉がある場合、このターン中に自分が使用したイベントカード1枚につき、この効果で選べるキャラのBPの範囲+500。')
  return raidOnto(card,{effects:{onPlay:[{op:'gimRetireEvents',optional:true,base:3000,step:500,name:'葛城 リーリヤ'}]}});
 if(card.type==='character'&&effect==='【登場時】自分の山札の上から3枚見る。その中から1枚を自分の山札の上に置き、残りを望む順で下に置く。')
  return onPlay({op:'gimLookTop',count:3});
 if(card.type==='character'&&effect==='このキャラはBPをマイナスする効果を受けない。このキャラは相手の効果でレストにならず、手札に戻らない。【自分のターン中】このキャラはBP+1000。')
  return dsl({ownTurnBp:1000,bpDownImmune:true,opponentRestImmune:true,opponentBounceImmune:true});
 if(card.type==='character'&&effect==='【レイド】〈月村手毬〉アクティブにし、フロントLに移動できる【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）【アタック時】自分の場に〈花海咲季〉と〈藤田ことね〉がどちらもある場合、カードを1枚まで引く。')
  return raidOnto(card,{printedImpact:1,effects:{onAttack:[{op:'ifLiveThen',
   when:bothOn([SAKI,KOTONE],'field','any'),then:[{op:'optionalDrawOne'}]}]}});
 if(card.type==='character'&&effect==='このキャラはBP4000以上のキャラにブロックされない。【登場時】自分のフロントLに〈月村手毬〉と〈藤田ことね〉がどちらもある場合、このキャラをアクティブにする。〈花海咲季〉のこの効果は1ターンに1回のみ発動する。')
  return dsl({blockBpRestriction:{relation:'atLeast',bp:4000,condition:null},effects:{onPlay:[
   {op:'oncePerTurnGate',scope:'name',optional:false,when:bothOn([TEMARI,KOTONE],'front','any'),
    then:[{op:'activeSelf'}]}]}});
 if(card.type==='character'&&effect==='【登場時】【エナジーLにある場合】自分の場に〈花海咲季〉と〈月村手毬〉がどちらもある場合、このキャラをアクティブにする。【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。')
  return dsl({effects:{onPlay:[{op:'ifLiveThen',when:{logic:'all',turn:'any',checks:[
   {kind:'selfOnEnergy',turn:'any'},bothOn([SAKI,TEMARI],'field','any')]},then:[{op:'activeSelf'}]}]},
   mainAbility:{op:'gimRestBuff'}});
 if(card.type==='character'&&effect==='【レイド】〈藤田ことね〉アクティブにし、フロントLに移動できる【登場時】自分の手札から必要エナジーが3以下で消費APが1の赤の〔〈花海咲季〉か〈月村手毬〉〕を1枚まで自分の場にレストで登場させる。自分の場に〈花海咲季〉と〈月村手毬〉がどちらもある場合、カードを1枚引く。')
  return raidOnto(card,{effects:{onPlay:[
   {op:'deployOwnHandRest',type:'character',color:'red',energy:3,ap:1,max:1,names:[SAKI,TEMARI]},
   {op:'ifLiveThen',when:bothOn([SAKI,TEMARI],'field','any'),then:[{op:'draw',count:1}]}]}});
 if(card.type==='event'&&effect==='自分の山札の上から6枚見る。その中から〈花海咲季〉と〈月村手毬〉と〈藤田ことね〉をそれぞれ1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。')
  return onPlay({op:'gimLookNames',count:6,names:[SAKI,TEMARI,KOTONE]});
 if(card.type==='event'&&effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈葛城リーリヤ〉か〈紫雲清夏〉がどちらかのみある場合、『BP4000以下』に代わる。自分の場に〈葛城リーリヤ〉と〈紫雲清夏〉がどちらもある場合、『BP5000以下』に代わる。')
  return dsl({...specialTrigger(card),effects:{onPlay:[{op:'gimRetireXor',optional:false,base:3000,one:4000,both:5000,names:['葛城 リーリヤ','紫雲 清夏']}]}});
 if(card.type==='event'&&effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈花海咲季〉と〈月村手毬〉と〈藤田ことね〉が合計3枚以上ある場合、『BP5000以下』に代わる。')
  return dsl({...specialTrigger(card),effects:{onPlay:[{op:'gimRetireNames',optional:false,base:3000,raised:5000,min:3,names:[SAKI,TEMARI,KOTONE]}]}});
 if(card.type==='event'&&effect==='自分の山札の上から3枚見る。その中からカードを2枚手札に加える。残りを自分の山札の下に置く。')
  return onPlay({op:'gimLookTake',count:3,take:2});
 if(card.type==='event'&&effect==='自分の場のキャラを1枚選び、『このターン中』、BP+2000。自分の場に〈葛城リーリヤ〉と〈紫雲清夏〉がどちらもある場合、『次の自分のターン開始時まで』に代わる。')
  return onPlay({op:'gimBuffDuration',bp:2000,names:['葛城 リーリヤ','紫雲 清夏']});
 return pending();
}
