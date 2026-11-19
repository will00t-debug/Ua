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
 return null;
}

function accept(card,profile){
 const gate=knownTrigger(card);
 if(!gate||!profile)return null;
 if(profile.colorTrigger==='rest'&&gate.triggerEffect?.op!=='restOppFrontSkipNextActive')return null;
 if(profile.colorTrigger==='deploy'&&gate.triggerEffect?.op!=='deployOutsideCharacter')return null;
 if(!profile.colorTrigger&&gate.triggerEffect)return null;
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
