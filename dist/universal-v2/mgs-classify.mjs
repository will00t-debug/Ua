// Whole-print classifier for 〈物語〉系列 / UA42BT and UA42ST.
// A card is registered only when the entire Japanese effect is one tested
// shared program and the life trigger is one of the standard printed texts.
// Raid-frame text is not registered from this file until the Rugia HK
// span.raidBorder split is listed in raid-box.mjs. This file does not
// import the engine. There is no monogatari opcode.
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
const PEEK_ONE='【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。';
const PEEK_SEE='【登場時】自分の山札の上から1枚見て、山札の上か下に置く。';
const COLOR_DEPLOY='【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。';
const COLOR_RETIRE='【カラー】BP2500以下の相手のフロントLのキャラを1枚選び、退場させる。';
const COLOR_REST='【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。';
const SEARCH=/^【登場時】自分の山札の上から(\d+)枚見る。その中から(.+)を1枚まで公開し手札に加える。残りを望む順で(?:自分の)?山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。$/;
const SEARCH_SEE=/^【登場時】自分の山札の上から(\d+)枚見て、(.+)を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。$/;
const PEEK_PLAIN='【登場時】自分の山札の上から1枚見る。そのカードを山札の上か下に置く。';
const HAND=/^相手の場に([黄青紫緑赤])か([黄青紫緑赤])のカードがある場合、手札にあるこのカードの必要エナジーを【([黄青紫緑赤])×1】減らす。$/;
const RAID_ONLY=/^【レイド】(?:〈([^〉]+)〉|［特徴：([^］]+)］)アクティブにし、フロントLに移動できる$/;

function standardTrigger(card){
 if(card.trigger==null)return card.triggerTextJa==='-'||card.triggerTextJa==='';
 return STANDARD[card.trigger]===card.triggerTextJa;
}

function knownTrigger(card){
 if(standardTrigger(card))return {};
 if(card.trigger==='color'&&card.triggerTextJa===COLOR_DEPLOY)
  return {triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true},kind:'deploy'};
 if(card.trigger==='color'&&card.triggerTextJa===COLOR_RETIRE)
  return {triggerEffect:{op:'retireOppFrontUnderBp',bp:2500},kind:'retireColor'};
 if(card.trigger==='color'&&card.triggerTextJa===COLOR_REST)
  return {triggerEffect:{op:'restOppFrontSkipNextActive'},kind:'rest'};
 if(card.trigger==='special'&&card.triggerTextJa==='【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。')
  return {triggerEffect:{op:'retireOppFront'},special:'retireFront',kind:'retire'};
 return null;
}

function accept(card,profile){
 const gate=knownTrigger(card);
 if(!gate||!profile)return null;
 if(gate.triggerEffect&&profile.allowTrigger!==true)return null;
 const {allowColor,allowSpecial,allowTrigger,...body}=profile;
 return gate.triggerEffect?{...body,triggerEffect:gate.triggerEffect}:body;
}

function searchProfile(middle){
 const trait=middle.match(/^［特徴：([^］]+)］$/);
 if(trait)return {filter:{field:'trait',value:trait[1]}};
 const name=middle.match(/^〈([^〉]+)〉$/);
 if(name)return {filter:{field:'name',value:name[1]}};
 const coloredField=middle.match(/^([黄青紫緑赤])のフィールドカード$/);
 if(coloredField)return {filter:{field:'colorAndType',value:COLOR[coloredField[1]]+':field'}};
 const coloredEvent=middle.match(/^([黄青紫緑赤])のイベントカード$/);
 if(coloredEvent)return {filter:{field:'colorAndType',value:COLOR[coloredEvent[1]]+':event'}};
 if(middle==='フィールドカード')return {filter:{field:'type',value:'field'}};
 if(middle==='イベントカード')return {filter:{field:'type',value:'event'}};
 if(middle==='イベントカードかフィールドカード'||middle==='フィールドカードかイベントカード')
  return {logic:'any',filters:[{field:'type',value:'event'},{field:'type',value:'field'}]};
 if(middle==='キャラカード')return {filter:{field:'type',value:'character'}};
 const printedName=middle.match(/^BPが(\d+)の〈([^〉]+)〉$/);
 if(printedName)return {logic:'all',filters:[
  {field:'printedBp',value:Number(printedName[1])},{field:'name',value:printedName[2]}]};
 const names=[...middle.matchAll(/〈([^〉]+)〉/g)].map(item=>item[1]);
 if(names.length>=2&&middle===names.map(item=>'〈'+item+'〉').join('か'))
  return {logic:'any',filters:names.map(item=>({field:'name',value:item}))};
 return null;
}

function framedBody(card){
 const frame=card?.raidFrame;
 if(!frame)return false;
 return /登場|起動|攻擊|攻撃|退場|阻擋|ブロック|BP|抽/.test(frame.inside||'');
}

export function mgsProfile(card){
 const effect=String(card?.effectJa||'');
 const pip=PIP[card?.color];
 if(!pip||!knownTrigger(card))return null;
 if(effect.includes('レイド')&&!RAID_ONLY.test(effect)){
  if(framedBody(card))return null;
 }
 if(framedBody(card))return null;
 const open={allowTrigger:true};
 if(effect==='-'||effect==='')return accept(card,{kind:'plain',...open});
 if(effect.includes('レイド')){
  const raid=effect.match(RAID_ONLY);
  if(!raid||raid[0]!==effect)return null;
  if(raid[1])return accept(card,{kind:'raidOnly',raidName:raid[1],...open});
  return accept(card,{kind:'raidOnly',raidTrait:raid[2],...open});
 }
 const looked=effect.match(SEARCH)||effect.match(SEARCH_SEE);
 if(looked){
  const count=Number(looked[1]);
  const profile=searchProfile(looked[2]);
  if(!profile||count<1||count>7)return null;
  return accept(card,{kind:'search',count,...profile,...open});
 }
 const namedBp=effect.match(/^【自分のターン中】自分の場に〈([^〉]+)〉がある場合、このキャラはBP\+(\d+)。$/);
 if(namedBp){
  const bp=Number(namedBp[2]);
  if(bp%500!==0||bp<500||bp>5000)return null;
  return accept(card,{kind:'nameBp',...open,program:{effects:{},passiveBonuses:[{
   condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:namedBp[1]},bp}]}});
 }
 if(effect===STEP+DRAW_DISCARD)
  return accept(card,{kind:'stepDrawDiscard',...open,program:{effects:{onPlay:[{op:'drawDiscard',count:1}]},step:true}});
 if(effect==='【退場時】カードを1枚引く。')
  return accept(card,{kind:'retireDraw',...open,program:{effects:{onRetire:[{op:'draw',count:1}]}}});
 const emptyImpact=`自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【${pip}×2】減らす。`+IMPACT;
 if(effect===emptyImpact&&card.energy>=2)
  return accept(card,{kind:'emptyImpact',...open,program:{effects:{},emptyOwnFieldHandEnergyDiscount:2,impactNull:true}});
 const traitBuff=effect.match(/^【登場時】自分の場の他の［特徴：([^］]+)］を1枚まで選び、このターン中、BP\+1000。$/);
 if(traitBuff&&traitBuff[1]&&!/[\/／]/.test(traitBuff[1]))
  return accept(card,{kind:'traitBuff',trait:traitBuff[1],...open});
 if(effect===`【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+【${pip}】と「メインフェイズ終了時、このキャラを退場させる。」を得る。`)
  return accept(card,{kind:'printedEnergyRetire',...open});
 if(effect===IMPACT||effect===IMPACT_PLAIN)return accept(card,{kind:'impactNull',...open});
 if(effect===PEEK_SEE||effect===PEEK_ONE||effect===PEEK_PLAIN)return accept(card,{kind:'peekOne',...open});
 if(effect===DRAW_DISCARD)return accept(card,{kind:'drawDiscard',...open});
 if(effect===BUFF_OTHER)return accept(card,{kind:'buffOther',...open});
 if(effect===RECOVER)return accept(card,{kind:'recoverAp2',...open});
 if(effect===STEP)return accept(card,{kind:'step',...open});
 if(effect===BOUNCE)return accept(card,{kind:'bounce',...open});
 if(effect===DOUBLE)return accept(card,{kind:'doubleBlock',...open});
 if(effect===`このキャラがアクティブの場合、このキャラの発生エナジー+【${pip}】。`)
  return accept(card,{kind:'activeEnergy',...open});
 if(effect===TOP_KEEP)return accept(card,{kind:'topKeep',...open});
 if(effect===DOWN_FRONT)return accept(card,{kind:'enemyDown',...open});
 const hand=effect.match(HAND);
 if(!hand)return null;
 const colors=[COLOR[hand[1]],COLOR[hand[2]]];
 const reduced=COLOR[hand[3]];
 if(reduced!==card.color||colors.includes(card.color)||new Set(colors).size!==2)return null;
 return accept(card,{kind:'handDiscount',handDiscount:{colors,amount:1},...open});
}

export function mgsEngineKind(card){
 return mgsProfile(card)?.kind||null;
}
