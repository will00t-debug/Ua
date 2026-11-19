// Whole-print classifier for 美食獵人 / UA17 Toriko.
// A card is registered only when the entire Japanese effect is one tested
// shared program and the life trigger is one of the standard printed texts.
// Color and special triggers stay in the catalogue until that whole print,
// trigger included, is a shared program. This file does not import the engine.
const PIP={yellow:'黄',blue:'青',purple:'紫',green:'緑',red:'赤'};
const COLOR={黄:'yellow',青:'blue',紫:'purple',緑:'green',赤:'red'};
const STANDARD={
 active:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
 draw:'【ドロー】カードを1枚引く。',
 get:'【ゲット】このカードを手札に加える。',
 final:'【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。',
 raid:'【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。'
};
const IMPACT='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）';
const DRAW_DISCARD='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。';
const BUFF_OTHER='【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。';
const RECOVER='自分のAPカードを2枚まで選び、アクティブにする。';
const STEP='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）';
const BOUNCE='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。';
const DOUBLE='【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）';
const TOP_KEEP='【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを場外に置く。';
const DOWN_FRONT='【登場時】相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。';
const DOWN_FRONT_1500='【登場時】BP1500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。';
const DOWN_FIELD_1500='【登場時】BP1500以上の相手の場のキャラを1枚まで選び、このターン中、BP-1000。';
const IMPACT_ONE='【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）';
const HAND=/^相手の場に([黄青紫緑赤])か([黄青紫緑赤])のカードがある場合、手札にあるこのカードの必要エナジーを【([黄青紫緑赤])×1】減らす。$/;
const COLOR_REST='【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。';
const COLOR_DEPLOY='【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。';
const SPECIAL_RETIRE='【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。';
const COLOR_BOUNCE='【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。';
const RAID=name=>`【レイド】〈${name}〉アクティブにし、フロントLに移動できる`;
const ATTACK_BUFF='【アタック時】自分の場の他のキャラを1枚まで選び、このターン中、BP+500。';
const DRAW_FOUR='カードを4枚引き、自分の手札を1枚場外に置く。';
const MAIN_DISCARD='【起動メイン】【手札を1枚場外に置く】【ターン1】このキャラはこのターン中、BP+1000。';
const OUTSIDE_FOOD='【登場時】自分の場外から青の［特徴：食材］を1枚まで手札に加える。';
const GATED_REST='【登場時】自分の場に〈トリコ〉がある場合、BP3000以下の相手のフロントLのキャラを1枚まで選び、レストにする。';
const REVEAL_TRAIT='【登場時】自分の山札の上から1枚を公開する。公開したカードが［特徴：美食四天王］の場合、そのカードを手札に加える。公開したカードが［特徴：美食四天王］以外の場合、自分の山札の上に置く。';
const PARASITE_OUTSIDE='【登場時】自分の山札の上から5枚見る。その中から［特徴：寄生昆虫］を1枚まで場外に置く。残りを望む順で自分の山札の下に置く。';
const LOCK_MOVE='【登場時】相手の場のキャラを1枚まで選び、次の自分のターン開始時まで、「このキャラは移動できない。」を与える。';
const PEEK_ONE='【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。';
const REST_RETURN='【起動メイン】【レストにする】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。このカードを手札に戻す。';
const OPTIONAL_DISCARD='【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、相手は自身の手札を1枚場外に置く。';
const ATTACK_DRAW='【アタック時】自分の手札の［特徴：美食四天王］を1枚場外に置いてもよい。そうした場合、カードを1枚引く。';
const NAMED_AP='自分の場のキャラを1枚まで選び、このターン中、BP+2000。自分の場に〈トリコ〉か〈テリークロス〉がある場合、自分のAPカードを1枚まで選び、アクティブにする。';

function standardTrigger(card){
 if(card.trigger==null)return card.triggerTextJa==='-'||card.triggerTextJa==='';
 return STANDARD[card.trigger]===card.triggerTextJa;
}

function knownTrigger(card){
 if(standardTrigger(card))return {};
 if(card.trigger==='color'&&card.triggerTextJa===COLOR_REST)
  return {triggerEffect:{op:'restOppFrontSkipNextActive'}};
 if(card.trigger==='color'&&card.triggerTextJa===COLOR_DEPLOY)
  return {triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true}};
 if(card.trigger==='special'&&card.triggerTextJa===SPECIAL_RETIRE)
  return {triggerEffect:{op:'retireOppFront'}};
 if(card.trigger==='color'&&card.triggerTextJa===COLOR_BOUNCE)
  return {triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500}};
 return null;
}

function accept(card,profile){
 const gate=knownTrigger(card);
 if(!gate||!profile)return null;
 if(profile.colorTrigger==='rest'&&gate.triggerEffect?.op!=='restOppFrontSkipNextActive')return null;
 if(profile.colorTrigger==='deploy'&&gate.triggerEffect?.op!=='deployOutsideCharacter')return null;
 if(profile.colorTrigger==='bounce'&&gate.triggerEffect?.op!=='bounceOppFrontUnderBp')return null;
 const special=gate.triggerEffect?.op==='retireOppFront';
 if(!profile.colorTrigger&&gate.triggerEffect&&!special)return null;
 if(profile.colorTrigger&&special)return null;
 const {colorTrigger,...body}=profile;
 return gate.triggerEffect?{...body,triggerEffect:gate.triggerEffect}:body;
}

function searchText(count,middle){
 return `【登場時】自分の山札の上から${count}枚見る。その中から${middle}を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。`;
}

export function trkProfile(card){
 const effect=String(card?.effectJa||'');
 const pip=PIP[card?.color];
 if(!pip||!knownTrigger(card))return null;
 if(effect==='-'||effect==='')return accept(card,{kind:'plain'});
 const also=`このカードは全ての場所で必要エナジーを【${pip}×5】としても扱う。`;
 if(effect.startsWith(also)){
  const rest=effect.slice(also.length);
  if(rest===PEEK_ONE)return accept(card,{kind:'alsoPeek'});
  if(rest===TOP_KEEP)return accept(card,{kind:'alsoTopKeep'});
  if(rest==='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）【自分のターン中】自分の場のキャラの必要エナジーの合計が15以上ある場合、このキャラはBP+1000。')
   return accept(card,{kind:'alsoEnergySumBp'});
  if(rest==='【アタック時】自分の場のキャラの必要エナジーの合計が20以上ある場合、カードを1枚引く。')
   return accept(card,{kind:'alsoEnergySumDraw'});
  if(rest==='【登場時】自分の場のキャラの必要エナジーの合計が20以上ある場合、自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが5以上のキャラカードを1枚まで手札に加える。')
   return accept(card,{kind:'yosaku'});
  return null;
 }
 if(effect===searchText(4,'［特徴：美食四天王］'))
  return accept(card,{kind:'search',count:4,filter:{field:'trait',value:'美食四天王'}});
 if(effect===searchText(5,'［特徴：食材］'))
  return accept(card,{kind:'search',count:5,filter:{field:'trait',value:'食材'}});
 if(effect===searchText(5,'〈トリコ〉かフィールドカード'))
  return accept(card,{kind:'search',count:5,logic:'any',filters:[
   {field:'name',value:'トリコ'},{field:'type',value:'field'}]});
 if(effect===searchText(5,'〈トリコ〉'))
  return accept(card,{kind:'search',count:5,filter:{field:'name',value:'トリコ'},colorTrigger:'deploy'});
 if(effect===searchText(3,'［特徴：美食會］'))
  return accept(card,{kind:'search',count:3,filter:{field:'trait',value:'美食會'},colorTrigger:'deploy'});
 if(effect===searchText(4,'〈トリコ〉以外の［特徴：美食四天王］'))
  return accept(card,{kind:'search',count:4,filter:{field:'trait',value:'美食四天王'},
   excludeName:'トリコ',colorTrigger:'rest'});
 if(effect===ATTACK_BUFF)return accept(card,{kind:'attackBuff500'});
 if(effect===DRAW_FOUR)return accept(card,{kind:'draw4'});
 if(effect===MAIN_DISCARD)return accept(card,{kind:'mainDiscardBuff'});
 if(effect===OUTSIDE_FOOD)return accept(card,{kind:'outsideBlueIngredient'});
 if(effect===GATED_REST)return accept(card,{kind:'gatedRestToriko'});
 if(effect===REVEAL_TRAIT)return accept(card,{kind:'revealFourKings'});
 if(effect===PARASITE_OUTSIDE)return accept(card,{kind:'parasiteOutside'});
 if(effect===LOCK_MOVE)return accept(card,{kind:'lockMove'});
 if(effect===REST_RETURN)return accept(card,{kind:'restReturn'});
 if(effect===OPTIONAL_DISCARD)return accept(card,{kind:'optionalOppDiscard'});
 if(effect===ATTACK_DRAW)return accept(card,{kind:'attackFourKingsDraw'});
 if(effect===NAMED_AP)return accept(card,{kind:'namedBuffAp'});
 if(effect==='自分のフロントLに〈トリコ〉がある場合、手札にあるこのカードの消費APを-1する。【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）')
  return accept(card,{kind:'frontApImpact'});
 if(effect==='自分の場に〈トリコ〉と〈ココ〉と〈ゼブラ〉がある場合、このキャラはBP+500。自分のフロントLに〈トリコ〉と〈ココ〉と〈ゼブラ〉があるなら、さらにこのキャラは【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）を得る。')
  return accept(card,{kind:'threeNamesBlock'});
 if(effect==='【自分のターン中】自分の場に〈トリコ〉と〈ココ〉と〈サニー〉がある場合、このキャラはBP+1000。自分のフロントLに〈トリコ〉と〈ココ〉と〈サニー〉があるなら、さらにこのキャラは【ダメージ（2）】を得る。')
  return accept(card,{kind:'threeNamesDamage'});
 if(effect==='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）自分のフロントLに〈テリークロス〉がある場合、このキャラはBP+1000。')
  return accept(card,{kind:'stepNamedBp'});
 if(effect==='相手のフロントLのキャラを1枚選び、『レストにする』。自分の場に〈サニー〉がある場合、『レストにする。それは次の1回アクティブにならない。カードを1枚引く』に代わる。')
  return accept(card,{kind:'sunnyRest'});
 if(effect==='BP3000以下の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈ココ〉がある場合、自分のAPカードを1枚まで選び、アクティブにする。')
  return accept(card,{kind:'cocoRetireAp'});
 if(effect==='自分の場のキャラを1枚選び、『このターン中』、BP+1000。カードを1枚引く。選んだキャラが〈サニー〉の場合、『次の自分のターン開始時まで』に代わる。')
  return accept(card,{kind:'sunnyDuration'});
 if(effect==='自分の場のキャラを1枚選び、このターン中、BP+2000。カードを1枚引く。選んだキャラが〈ココ〉の場合、さらにこのターン中、【ダメージ（+1）】（このキャラがアタックで直接ダメージを与える時、追加で1ダメージ）を与える。')
  return accept(card,{kind:'cocoDamage'});
 if(effect==='自分の場のキャラを1枚選び、このターン中、BP+2000。カードを1枚引く。選んだキャラが〈ゼブラ〉の場合、さらにカードを1枚引く。')
  return accept(card,{kind:'zebraDraw'});
 if(effect==='カードを1枚引く。自分の場のキャラ全ては、次の自分のターン開始時まで、「このキャラはBPをマイナスする効果を受けない。」を得る。')
  return accept(card,{kind:'immuneAura'});
 if(effect==='【登場時】自分の場の他のキャラを1枚まで選び、このターン中、『BP+1000』。自分の場に〈小松〉がある場合、『BP+2000』に代わる。')
  return accept(card,{kind:'komatsuBuff'});
 if(effect==='【自分のターン中】このターン中に自分が手札から［特徴：食材］を使用している場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。')
  return accept(card,{kind:'ingredientImpact'});
 if(effect==='BP5000以下の相手のフロントLのキャラを1枚選び、『手札に戻す』。自分の場に〈トリコ〉がある場合、『退場させる』に代わる。')
  return accept(card,{kind:'torikoBounce'});
 if(effect==='自分のフロントLのキャラを1枚まで選び、このターン中、BP+1000と【インパクト（+1）】（インパクトの与えるダメージが+1され、インパクトを持たない場合、【インパクト（1）】を得る）を与える。自分の場に〈小松〉がある場合、カードを1枚引く。')
  return accept(card,{kind:'rainbowFruit'});
 if(effect==='【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】相手のフロントLのキャラを1枚選び、このターン中、BP-1000。')
  return accept(card,{kind:'frontDiscardDown'});
 if(effect==='【登場時】自分の場の［特徴：寄生昆虫］か〈トミーロッド〉を1枚まで選び、このターン中、【インパクト（+1）】（インパクトの与えるダメージが+1され、インパクトを持たない場合、【インパクト（1）】を得る）を与える。')
  return accept(card,{kind:'parasiteImpact'});
 if(effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈スタージュン〉がある場合、『BP5000以下』に代わる。')
  return accept(card,{kind:'starjunRetire'});
 if(effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の他の手札が3枚以下の場合、『BP5000以下』に代わる。')
  return accept(card,{kind:'handRetire'});
 if(effect==='自分のフロントLに〈ココ〉がある場合、手札にあるこのカードの消費APを-1する。このキャラはBP2000以下のキャラにブロックされない。【起動メイン】【フロントLにある場合】【ターン1】BP1500以上の相手のフロントLのキャラを1枚選び、このターン中、BP-1000。')
  return accept(card,{kind:'kissFront'});
 if(effect==='自分のフロントLに〈サニー〉がある場合、手札にあるこのカードの消費APを-1する。【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）【登場時】自分の場の〈サニー〉を1枚まで選び、次の自分のターン開始時まで、「相手はキャラの効果やイベントカードの効果でこのキャラを選ぶ際に、追加で自身の手札を1枚場外に置かないと選べない。」を与える。')
  return accept(card,{kind:'queenTax'});
 if(effect===`【起動メイン】【レストにする】【ターン1】このターン中、このキャラの発生エナジー+【${pip}】。メインフェイズ終了時、このキャラを退場させる。`)
  return accept(card,{kind:'printedEnergyRetire'});
 if(effect==='このキャラはBPをマイナスする効果を受けない。'+RAID('ココ')+'このキャラはBP+500。【登場時】BP4000以下の相手のフロントLのキャラを1枚まで選び、レストにする。それは次の1回アクティブにならない。【ブロック時】自分のフロントLに〈キッス〉がある場合、BP1000以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-500。')
  return accept(card,{kind:'cocoRaid'});
 if(effect==='自分のフロントLに〈ココ〉と〈サニー〉と〈ゼブラ〉がある場合、このキャラは【インパクト（1）】を得る。【登場時】自分の場外から〈トリコ〉以外の必要エナジーが3以下で消費APが1の黄の［特徴：美食四天王］を1枚まで自分の場にレストで登場させる。')
  return accept(card,{kind:'kingsDeploy'});
 if(effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈トリコ〉と〈ココ〉と〈サニー〉と〈ゼブラ〉がある場合、『BP5000以下』に代わる。自分のフロントLに〈トリコ〉と〈ココ〉と〈サニー〉と〈ゼブラ〉があるなら、自分の手札を2枚場外に置いてもよい。そうした場合、自分のフロントLのキャラ全てを、アクティブにし、さらにこのターン中、BP+1000。')
  return accept(card,{kind:'feast'});
 if(effect==='自分の場のキャラを1枚選び、このターン中、BP+2000し、カードを1枚引く。選んだキャラが〈ゼブラ〉の場合、相手のフロントLのキャラを1枚まで選び、このターン中、「このキャラは、相手のアタックを可能ならブロックしなければならない。」を与える。')
  return accept(card,{kind:'beatPunch'});
 if(effect==='【登場時】自分のフロントLの他のキャラを1枚まで選び、次の相手のターン中、「相手はキャラの効果やイベントカードの効果でこのキャラを選ぶ際に、追加でAPを1支払わないと選べない。」を与える。')
  return accept(card,{kind:'aimaruTax'});
 if(effect==='自分の場のキャラの必要エナジーの合計が25以上ある場合、手札にあるこのカードの必要エナジーを【青×7】減らす。このキャラはアクティブで場に登場させる。【アタック時】【ブロック時】【ターン1】自分のフロントLのアクティブのキャラの数が相手のフロントLのアクティブのキャラの数より少ない場合、このキャラをアクティブにする。')
  return accept(card,{kind:'ichiryu'});
 if(effect==='自分の場のキャラの必要エナジーの合計が25以上ある場合、手札にあるこのカードの必要エナジーを【青×7】減らす。【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、相手のフロントLのキャラを1枚まで選び、次の相手のアタックフェイズ終了時まで、「このキャラはアタックもブロックもできない。」を与える。【アタック時】このキャラはこのターン中、BP+1000。')
  return accept(card,{kind:'jiro'});
 if(effect===DRAW_DISCARD+'【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。【起動メイン】【エナジーLにある場合】【ターン1】このターン中に自分が手札から［特徴：食材］を使用している場合、このキャラをアクティブにする。')
  return accept(card,{kind:'komatsuAct',colorTrigger:'bounce'});
 if(effect==='自分の場に〈一龍〉か〈次郎〉がある場合、手札にあるこのカードの必要エナジーを【青×1】減らす。【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の場の〈次郎〉を1枚まで選び、アクティブにする。【相手のターン中】相手はキャラの効果やイベントカードの効果でこのキャラを選ぶ際に、追加でAPを1支払わないと選べない。')
  return accept(card,{kind:'setsuno',colorTrigger:'bounce'});
 if(effect==='このフィールドはアクティブで場に登場させる。【起動メイン】【レストにする】【手札を1枚場外に置く】このターン中、次に手札から使用する［特徴：食材］の消費APを-1する。〈グルメスパイザー〉のこの効果は1ターンに1回のみ発動できる。')
  return accept(card,{kind:'spices'});
 if(effect==='相手のフロントLのキャラを1枚まで選び、次の相手のアタックフェイズ終了時まで、「このキャラはアタックもブロックもできない。」を与える。自分の場に〈次郎〉か〈鉄平〉がある場合、カードを1枚引く。')
  return accept(card,{kind:'knocking'});
 if(effect==='カードを2枚引く。自分の手札から必要エナジーを満たし消費APが1の〔〈トリコ〉と〈小松〉〕をそれぞれ1枚までレストで登場させるかレイドさせる。')
  return accept(card,{kind:'ozone'});
 if(effect==='このキャラが退場する場合、代わりにリムーブエリアに置かれる。【登場時】このキャラが自分の場外から登場していた場合、自分の山札の上から2枚まで場外に置く。')
  return accept(card,{kind:'mite'});
 if(effect==='このキャラが退場する場合、代わりにリムーブエリアに置かれる。自分の場外とリムーブエリアに［特徴：寄生昆虫］が合計3枚以上ある場合、このキャラはBP+500。')
  return accept(card,{kind:'giantParasite'});
 if(effect==='このキャラが退場する場合、代わりにリムーブエリアに置かれる。【登場時】このキャラが自分の場外から登場していた場合、自分の場外とリムーブエリアに［特徴：寄生昆虫］が合計3枚以上あるなら、相手のフロントLのキャラを1枚まで選び、このターン中、BP-2000。')
  return accept(card,{kind:'emperor'});
 if(effect==='【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）【退場時】自分の場外から必要エナジーが3以下で消費APが1の紫の〔〈スタージュン〉か〈ココ〉か〈サニー〉か〈ゼブラ〉〕を1枚まで自分のフロントLにアクティブで登場させる。')
  return accept(card,{kind:'purpleToriko'});
 if(effect===RAID('トリコ')+'【登場時】自分の場の他のキャラを1枚まで選び、アクティブにする。【アタック時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。選んだキャラが〈スタージュン〉か〈ココ〉か〈サニー〉か〈ゼブラ〉の場合、さらにこのターン中、【インパクト（+1）】（インパクトの与えるダメージが+1され、インパクトを持たない場合、【インパクト（1）】を得る）を与える。')
  return accept(card,{kind:'raidToriko'});
 if(effect==='このキャラはBPをマイナスする効果を受けない。【登場時】相手のフロントLに空きがある場合、自分の手札を1枚場外に置いてもよい。そうした場合、発生エナジーが1以下の相手のエナジーLのキャラを1枚まで選び、フロントLに移動させる。〈グリンパーチ〉のこの効果は1ターンに1回のみ発動できる。')
  return accept(card,{kind:'grin'});
 if(effect===RAID('スタージュン')+'このキャラがアタックしてブロックされなかった時、カードを1枚引く。【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、BP3000以下の相手のフロントLのキャラを1枚まで選び、退場させる。')
  return accept(card,{kind:'starjunRaid'});
 if(effect==='自分の手札がこのカード1枚のみの場合、手札にあるこのカードの必要エナジーを【紫×7】減らす。【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）【登場時】BP5000以下の相手のフロントLのキャラを1枚まで選び、退場させる。')
  return accept(card,{kind:'mitora'});
 if(effect==='このフィールドはアクティブで場に登場させる。【起動メイン】【レストにする】【手札を1枚場外に置く】自分の場の［特徴：美食會］を1枚選び、このターン中、「【アタック時】カードを1枚引く。」を与える。')
  return accept(card,{kind:'hq'});
 if(effect===RAID('トリコ')+'【自分のターン中】このターン中に自分が手札から［特徴：食材］を使用している場合、このキャラは【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）を得る。【登場時】自分の山札の上から7枚見る。その中から［特徴：食材］を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。')
  return accept(card,{kind:'starterToriko'});
 if(effect==='【登場時】自分の場に〈トリコ〉がある場合、このターン中、次に手札から使用する［特徴：食材］の消費APを-1する。【起動メイン】【レストにする】このターン中に自分が手札から［特徴：食材］を使用している場合のみ発動できる。カードを1枚引き、自分の手札を1枚場外に置く。')
  return accept(card,{kind:'starterKomatsu'});
 if(effect==='【登場時】自分の山札の上から7枚見る。その中から〈センチュリースープ〉を1枚まで場外に置く。残りを望む順で自分の山札の下に置く。【起動メイン】【レストにする】【このカードを退場させる】自分の場外から〈センチュリースープ〉を1枚まで手札に加える。')
  return accept(card,{kind:'showcase'});
 if(effect===RAID('サニー')+'【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）このキャラがバトルに勝利した時、カードを1枚引く。【フロントLにある場合】自分のフロントLに〈クイン〉がある場合、相手の場のキャラは可能ならアタックしなければならない。')
  return accept(card,{kind:'sunnyMust'});
 if(effect===RAID('ゼブラ')+'【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）このキャラがアタックしてバトルに勝利した時、このキャラのBPが5000以上の場合、自分の手札を1枚場外に置いてもよい。そうした場合、BP3000以下の相手のフロントLのキャラを1枚まで選び、レストにする。【起動メイン】【ターン1】自分の場のキャラを1枚選び、このターン中、BP+1000。')
  return accept(card,{kind:'zebraWin'});
 if(effect===RAID('トリコ')+'【自分のターン中】このターン中に自分が手札から［特徴：食材］を使用していて、このキャラのBPが8000以上の場合、このキャラは【ダメージ（2）】を得る。【アタック時】BPがこのキャラのBPの半分以下の相手のフロントLのキャラを1枚まで選び、手札に戻す。')
  return accept(card,{kind:'halfBounce'});
 if(effect==='【レイド】［特徴：美食會］アクティブにし、フロントLに移動できる【自分のターン中】このキャラの下に元々のBPが3000以上のカードがある場合、このキャラはBP+500。【登場時】このターン中に自分の効果で自分の手札を場外に置いている場合、カードを1枚引く。【退場時】レイド状態のこのキャラの一番下のカードを手札に戻す。')
  return accept(card,{kind:'gtRobot'});
 if(effect===RAID('トミーロッド')+'【相手のターン中】【ターン1】このキャラが相手の効果で退場する場合、代わりに自分のフロントLの［特徴：寄生昆虫］を1枚退場させてもよい。【起動メイン】【手札を1枚場外に置く】【ターン1】自分の場外から［特徴：寄生昆虫］を1枚まで自分の場にレストで登場させる。')
  return accept(card,{kind:'tommyrod'});
 if(effect==='【登場時】自分の場の［特徴：美食四天王］を1枚まで選び、このターン中、BP+1000。自分のフロントLに〈トリコ〉と〈サニー〉と〈ゼブラ〉がある場合、さらに選んだキャラをアクティブにする。')
  return accept(card,{kind:'cocoKings'});
 if(effect==='【登場時】APを1支払ってもよい。そうした場合、自分の山札の上から7枚見る。その中から異なるカード名の青の［特徴：食材］をそれぞれ1枚までと〈小松〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。【アタック時】このターン中に自分が手札から［特徴：食材］を使用している場合、自分の場のキャラを1枚まで選び、このターン中、BP+2000。')
  return accept(card,{kind:'promoLook'});
 if(effect==='自分の手札が0枚の場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。【登場時】自分の山札の上から1枚を裏向きでこのキャラの下に置く。【起動メイン】【ターン1】自分の手札を望む枚数裏向きでこのキャラの下に置く。【退場時】このキャラの下の裏向きカードの枚数分までカードを引く。')
  return accept(card,{kind:'midoraPile'});
 if(effect===IMPACT)return accept(card,{kind:'impactNull'});
 if(effect===DRAW_DISCARD)return accept(card,{kind:'drawDiscard'});
 if(effect===BUFF_OTHER)return accept(card,{kind:'buffOther'});
 if(effect===RECOVER)return accept(card,{kind:'recoverAp2'});
 if(effect===STEP)return accept(card,{kind:'step'});
 if(effect===BOUNCE)return accept(card,{kind:'bounce'});
 if(effect===DOUBLE)return accept(card,{kind:'doubleBlock'});
 if(effect===`このキャラがアクティブの場合、このキャラの発生エナジー+【${pip}】。`)
  return accept(card,{kind:'activeEnergy'});
 if(effect===TOP_KEEP)return accept(card,{kind:'topKeep'});
 if(effect===DOWN_FRONT)return accept(card,{kind:'enemyDown'});
 if(effect===DOWN_FRONT_1500)return accept(card,{kind:'enemyDownFront1500'});
 if(effect===DOWN_FIELD_1500)return accept(card,{kind:'enemyDownField1500'});
 if(effect===IMPACT_ONE)return accept(card,{kind:'printedImpact'});
 const hand=effect.match(HAND);
 if(!hand)return null;
 const colors=[COLOR[hand[1]],COLOR[hand[2]]];
 const reduced=COLOR[hand[3]];
 if(reduced!==card.color||colors.includes(card.color)||new Set(colors).size!==2)return null;
 return accept(card,{kind:'handDiscount',handDiscount:{colors,amount:1}});
}

export function trkEngineKind(card){
 return trkProfile(card)?.kind||null;
}
