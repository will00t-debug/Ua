// Whole-print classifier for 驅魔少年 / UA58BT D.Gray-man.
// A card is registered only when the entire Japanese effect is one tested
// shared program and the life trigger is one of the standard printed texts.
// Raid-frame text is not registered from this file. A print whose Japanese
// body is longer than the raid permission stays in the catalogue until the
// Rugia HK span.raidBorder split is implemented as shared behavior.
// This file does not import the engine.
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
const IMPACT_PLAIN='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）';
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
const MAIN_DISCARD='【起動メイン】【手札を1枚場外に置く】【ターン1】このキャラはこのターン中、BP+1000。';
const PEEK_ONE='【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。';
const PEEK_SEE='【登場時】自分の山札の上から1枚見て、山札の上か下に置く。';
const COLOR_DEPLOY='【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。';
const SEARCH_SEE=/^【登場時】自分の山札の上から(\d+)枚見て、(.+)を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。$/;
const REST_RETURN='【起動メイン】【レストにする】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。このカードを手札に戻す。';
const OPTIONAL_DISCARD='【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、相手は自身の手札を1枚場外に置く。';
const LOCK_MOVE='【登場時】相手の場のキャラを1枚まで選び、次の自分のターン開始時まで、「このキャラは移動できない。」を与える。';
const DRAW_FOUR='カードを4枚引き、自分の手札を1枚場外に置く。';
const HAND=/^相手の場に([黄青紫緑赤])か([黄青紫緑赤])のカードがある場合、手札にあるこのカードの必要エナジーを【([黄青紫緑赤])×1】減らす。$/;
const RAID_ONLY=/^【レイド】(?:〈([^〉]+)〉|［特徴：([^］]+)］)アクティブにし、フロントLに移動できる$/;
const SEARCH=/^【登場時】自分の山札の上から(\d+)枚見る。その中から(.+)を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。$/;

function standardTrigger(card){
 if(card.trigger==null)return card.triggerTextJa==='-'||card.triggerTextJa==='';
 return STANDARD[card.trigger]===card.triggerTextJa;
}

function knownTrigger(card){
 // A standard life trigger is not part of the effect body. The purple
 // color deploy is one existing shared trigger and is attached only when
 // the body opts in. Other color and special triggers stay in the catalogue.
 if(standardTrigger(card))return {};
 if(card.trigger==='color'&&card.triggerTextJa===COLOR_DEPLOY)
  return {triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true}};
 return null;
}

function accept(card,profile){
 const gate=knownTrigger(card);
 if(!gate||!profile)return null;
 if(gate.triggerEffect&&profile.allowColor!=='deploy')return null;
 const {allowColor,...body}=profile;
 return gate.triggerEffect?{...body,triggerEffect:gate.triggerEffect}:body;
}

function searchProfile(middle){
 const trait=middle.match(/^［特徴：([^］]+)］$/);
 if(trait)return {filter:{field:'trait',value:trait[1]}};
 const name=middle.match(/^〈([^〉]+)〉$/);
 if(name)return {filter:{field:'name',value:name[1]}};
 if(middle==='フィールドカード')return {filter:{field:'type',value:'field'}};
 if(middle==='イベントカード')return {filter:{field:'type',value:'event'}};
 const names=[...middle.matchAll(/〈([^〉]+)〉/g)].map(item=>item[1]);
 if(names.length>=2&&middle===names.map(item=>'〈'+item+'〉').join('か'))
  return {logic:'any',filters:names.map(item=>({field:'name',value:item}))};
 const mixed=middle.match(/^〈([^〉]+)〉かフィールドカード$/);
 if(mixed)return {logic:'any',filters:[{field:'name',value:mixed[1]},{field:'type',value:'field'}]};
 const excluded=middle.match(/^〈([^〉]+)〉以外の［特徴：([^］]+)］$/);
 if(excluded)return {filter:{field:'trait',value:excluded[2]},excludeName:excluded[1]};
 const traitOrName=middle.match(/^［特徴：([^］]+)］か〈([^〉]+)〉$/);
 if(traitOrName)return {logic:'any',filters:[
  {field:'trait',value:traitOrName[1]},{field:'name',value:traitOrName[2]}]};
 return null;
}

function framedBody(card){
 const frame=card?.raidFrame;
 if(!frame)return false;
 return /登場|起動|攻擊|攻撃|退場|阻擋|ブロック|BP|抽/.test(frame.inside||'');
}

export function dgmProfile(card){
 const effect=String(card?.effectJa||'');
 const pip=PIP[card?.color];
 if(!pip||!knownTrigger(card))return null;
 if(effect.includes('レイド')){
  const raid=effect.match(RAID_ONLY);
  if(!raid||raid[0]!==effect||framedBody(card))return null;
  if(raid[1])return accept(card,{kind:'raidOnly',raidName:raid[1]});
  return accept(card,{kind:'raidOnly',raidTrait:raid[2]});
 }
 if(framedBody(card))return null;
 if(effect==='-'||effect==='')return accept(card,{kind:'plain'});
 const also=`このカードは全ての場所で必要エナジーを【${pip}×5】としても扱う。`;
 if(effect.startsWith(also)){
  const rest=effect.slice(also.length);
  if(rest===PEEK_ONE)return accept(card,{kind:'alsoPeek'});
  if(rest===TOP_KEEP)return accept(card,{kind:'alsoTopKeep'});
  if(rest===IMPACT+'【自分のターン中】自分の場のキャラの必要エナジーの合計が15以上ある場合、このキャラはBP+1000。')
   return accept(card,{kind:'alsoEnergySumBp'});
  if(rest==='【アタック時】自分の場のキャラの必要エナジーの合計が20以上ある場合、カードを1枚引く。')
   return accept(card,{kind:'alsoEnergySumDraw'});
  if(rest==='【登場時】自分の場のキャラの必要エナジーの合計が20以上ある場合、自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが5以上のキャラカードを1枚まで手札に加える。')
   return accept(card,{kind:'yosaku'});
  return null;
 }
 const looked=effect.match(SEARCH)||effect.match(SEARCH_SEE);
 if(looked){
  const count=Number(looked[1]);
  const profile=searchProfile(looked[2]);
  if(!profile||count<1||count>10)return null;
  return accept(card,{kind:'search',count,...profile,allowColor:'deploy'});
 }
 if(effect===`【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+【${pip}】と「メインフェイズ終了時、このキャラを退場させる。」を得る。`)
  return accept(card,{kind:'printedEnergyRetire'});
 if(effect===IMPACT||effect===IMPACT_PLAIN)return accept(card,{kind:'impactNull'});
 if(effect===PEEK_SEE)return accept(card,{kind:'peekOne'});
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
 if(effect===MAIN_DISCARD)return accept(card,{kind:'mainDiscardBuff'});
 if(effect===PEEK_ONE)return accept(card,{kind:'peekOne'});
 if(effect===REST_RETURN)return accept(card,{kind:'restReturn'});
 if(effect===OPTIONAL_DISCARD)return accept(card,{kind:'optionalOppDiscard'});
 if(effect===LOCK_MOVE)return accept(card,{kind:'lockMove'});
 if(effect===DRAW_FOUR)return accept(card,{kind:'draw4'});
 const hand=effect.match(HAND);
 if(!hand)return null;
 const colors=[COLOR[hand[1]],COLOR[hand[2]]];
 const reduced=COLOR[hand[3]];
 if(reduced!==card.color||colors.includes(card.color)||new Set(colors).size!==2)return null;
 return accept(card,{kind:'handDiscount',handDiscount:{colors,amount:1}});
}

export function dgmEngineKind(card){
 return dgmProfile(card)?.kind||null;
}
