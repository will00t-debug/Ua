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
 const raidText=effect.replaceAll('レイド元','');
 if(raidText.includes('レイド')&&!RAID_ONLY.test(effect)){
  if(framedBody(card))return null;
 }
 if(framedBody(card))return null;
 const open={allowTrigger:true};
 if(effect==='-'||effect==='')return accept(card,{kind:'plain',...open});
 if(raidText.includes('レイド')){
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
 const later=laterProfile(card,effect,pip);
 if(later)return accept(card,later);
 const hand=effect.match(HAND);
 if(!hand)return null;
 const colors=[COLOR[hand[1]],COLOR[hand[2]]];
 const reduced=COLOR[hand[3]];
 if(reduced!==card.color||colors.includes(card.color)||new Set(colors).size!==2)return null;
 return accept(card,{kind:'handDiscount',handDiscount:{colors,amount:1},...open});
}

const KISS='キスショット・アセロラオリオン・ハートアンダーブレード';
const name=(value)=>({field:'name',value});
const recover=(anyOf,discard=false)=>({op:'recoverOutsideClause',optional:true,max:1,anyOf,
 ...(discard?{discardIfAdded:true}:{})});
function program(body){return {kind:body.kind,allowTrigger:true,program:body.program};}
function laterProfile(card,effect,pip){
 const outside=`自分の場外にあるカードが9枚以下の場合、自分の場とレイド元のこのカードの必要エナジーを【${pip}×`;
 const atMost=(energy,bp)=>({max:9,energy,...(Number.isInteger(bp)?{bp}:{})});
 if(effect===outside+'1】減らす。'+'【登場時】自分の山札の上から1枚見る。そのカードを山札の上か場外に置く。')
  return program({kind:'outsidePeek',program:{effects:{onPlay:[{op:'peekTopOrOutside'}]},outsideAtMost:atMost(1)}});
 if(effect===outside+'3】減らす。自分の場外にあるカードが9枚以下の場合、このキャラはBP-1000。')
  return program({kind:'outsideBp',program:{effects:{},outsideAtMost:atMost(3,-1000)}});
 if(effect===outside+'2】減らす。【登場時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。【起動メイン】【レストにする】このキャラの必要エナジーが1以上の場合のみ発動できる。このキャラの【登場時】を発動する。')
  return program({kind:'outsideReplay',program:{effects:{onPlay:[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:false}]},
   mainAbility:{op:'restReplayOnPlay'},outsideAtMost:atMost(2)}});
 if(effect===outside+'4】減らす。自分の場外にあるカードが9枚以下の場合、このキャラはBP-500。【起動メイン】【ターン1】このキャラはこのターン中、BP-500と【インパクト（1）】を得る。')
  return program({kind:'outsideImpact',program:{effects:{},mainAbility:{op:'onceSelfBpImpact',bp:-500,impact:1,oncePerTurn:true},
   outsideAtMost:atMost(4,-500)}});
 if(effect==='【アタック時】カードを1枚まで引く。')
  return program({kind:'attackDraw',program:{effects:{onAttack:[{op:'mayDrawUpTo',count:1}]}}});
 if(effect==='このキャラがアタックしてブロックされた時、カードを1枚引く。')
  return program({kind:'blockedDraw',program:{effects:{onAttackBlocked:[{op:'draw',count:1}]}}});
 if(effect==='【登場時】BP4500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-4000。')
  return program({kind:'highDown',program:{effects:{onPlay:[{op:'enemyBpDown',bp:4000,minBp:4500,optional:true,zone:'front'}]}}});
 if(effect==='【登場時】自分の山札の上から3枚見る。その中からキャラカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。〈忍野忍〉以外を手札に加えた場合、自分の手札を1枚場外に置く。')
  return program({kind:'unlessDiscard',program:{effects:{onPlay:[{op:'searchTopConditionalDiscard',count:3,
   filter:{field:'type',value:'character'},discardUnlessName:'忍野忍'}]}}});
 if(effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈戦場ヶ原ひたぎ〉がある場合、『BP5000以下』に代わる。')
  return program({kind:'raisedRetire',program:{effects:{onPlay:[{op:'retireOppFrontOneUnderBp',bp:3000,optional:false,
   fieldRaise:{zone:'field',name:'戦場ヶ原ひたぎ',bp:5000}}]}}});
 if(effect==='『BP3000』以下の相手のフロントLのキャラを1枚選び、退場させる。自分の場の〈羽川翼〉1枚につき、この効果で選べるキャラのBPの範囲+1000。')
  return program({kind:'perNameRetire',program:{effects:{onPlay:[{op:'retireOppFrontPerName',base:3000,step:1000,
   name:'羽川翼',optional:false}]}}});
 if(effect==='【登場時】自分の山札の上から3枚場外に置く。')
  return program({kind:'millThree',program:{effects:{onPlay:[{op:'millShown',count:3}]}}});
 if(effect==='自分の山札の上から2枚場外に置く。その後、自分の場外から〈戦場ヶ原ひたぎ〉を1枚まで手札に加える。')
  return program({kind:'millRecover',program:{effects:{onPlay:[{op:'millShownThenRecover',count:2,name:'戦場ヶ原ひたぎ'}]}}});
 if(effect==='【登場時】自分の場の他のキャラを1枚退場させてもよい。そうした場合、カードを2枚引く。')
  return program({kind:'retireDraw',program:{effects:{onPlay:[{op:'optionalRetireOtherDraw',draw:2}]}}});
 if(effect==='【起動メイン】【レストにする】カードを1枚引き、自分の手札を1枚場外に置く。')
  return program({kind:'restDraw',program:{effects:{},mainAbility:{op:'restDrawDiscard'}}});
 if(effect==='【起動メイン】【レストにする】【ターン1】自分の場の他のキャラを1枚選び、このターン中、BP+1000。')
  return program({kind:'restOnce',program:{effects:{},mainAbility:{op:'restSelfBuffOther',bp:1000,oncePerTurn:true}}});
 if(effect==='【起動メイン】【ターン1】自分の手札を1枚自分の山札の上に置く。そうした場合、このキャラはこのターン中、BP+1000。')
  return program({kind:'topBuff',program:{effects:{},mainAbility:{op:'placeHandTopBuff',bp:1000,oncePerTurn:true}}});
 if(effect==='このフィールドはアクティブで場に登場させる。【起動メイン】【レストにする】自分の場のキャラ全ては、このターン中、BP+500。')
  return program({kind:'activeField',program:{effects:{},enterAlwaysActive:true,mainAbility:{op:'restBuffAll',bp:500}}});
 if(effect==='【自分のターン中】このキャラはBP+1000。【起動メイン】【フロントLにある場合】【ターン1】自分の山札の上から1枚見る。そのカードを山札の上か下に置く。')
  return program({kind:'ownPeek',program:{effects:{},ownTurnBp:1000,mainAbility:{op:'frontPeekOnce',oncePerTurn:true,frontOnly:true}}});
 if(effect==='【登場時】自分の場外から〈解呪の儀式〉か必要エナジーが1以下の〈千石撫子〉を1枚まで手札に加える。')
  return program({kind:'recoverOr',program:{effects:{onPlay:[recover([{name:'解呪の儀式'},{name:'千石撫子',maxEnergy:1}])]}}});
 if(effect==='【登場時】自分の場外から必要エナジーが2以下の〔〈阿良々木暦〉か〈羽川翼〉〕を1枚まで手札に加える。')
  return program({kind:'recoverEnergy',program:{effects:{onPlay:[recover([{names:['阿良々木暦','羽川翼'],maxEnergy:2}])]}}});
 if(effect==='【起動メイン】【レストにする】自分の山札の上から1枚を場外に置く。【退場時】自分の場外から〈神原駿河〉を1枚まで手札に加える。')
  return program({kind:'millRecoverMain',program:{effects:{onRetire:[recover([{name:'神原駿河'}])]},
   mainAbility:{op:'restMillShown',count:1}}});
 if(effect==='【退場時】自分の山札の上から3枚見る。その中から〈阿良々木暦〉か〈忍野忍〉か〈'+KISS+'〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。')
  return program({kind:'retireSearch',program:{effects:{onRetire:[{op:'searchTopOneBottomDiscard',count:3,logic:'any',discard:false,
   filters:[name('阿良々木暦'),name('忍野忍'),name(KISS)]}]}}});
 if(effect==='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【紫×2】減らす。【登場時】自分の山札の上から5枚見る。その中からBPが5000の〈'+KISS+'〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'&&card.energy>=2)
  return program({kind:'emptySearch',program:{effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:5,logic:'all',
   filters:[{field:'printedBp',value:5000},name(KISS)]}]},emptyOwnFieldHandEnergyDiscount:2}});
 if(effect===IMPACT+'【退場時】自分の場外から〈阿良々木暦〉を1枚まで手札に加える。手札に加えた場合、自分の手札を1枚場外に置く。')
  return program({kind:'impactRecover',program:{effects:{onRetire:[recover([{name:'阿良々木暦'}],true)]},impactNull:true}});
 if(effect==='【自分のターン中】自分の場に〈'+KISS+'〉か〈羽川翼〉がある場合、このキャラはBP+1000。【退場時】自分の場外から〈'+KISS+'〉を1枚まで手札に加える。手札に加えた場合、自分の手札を1枚場外に置く。')
  return program({kind:'eitherBp',program:{effects:{onRetire:[recover([{name:KISS}],true)]},passiveBonuses:[{
   condition:{kind:'ownAnyNameExists',turn:'own',zone:'field',excludeSelf:false,names:[KISS,'羽川翼']},bp:1000}]}});
 if(effect==='【登場時】自分の手札から必要エナジーが2以下の黄のキャラカードを1枚まで自分の場にレストで登場させる。')
  return program({kind:'restEntry',program:{effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'yellow',energy:2,ap:null,max:1}]}}});
 if(effect==='自分の手札から必要エナジーが3以下で消費APが1の［特徴：ファイヤーシスターズ］を1枚まで自分の場にアクティブで登場させる。')
  return program({kind:'activeEntry',program:{effects:{onPlay:[{op:'deployHandActive',type:'character',color:'yellow',energy:3,ap:1,trait:'ファイヤーシスターズ',max:1}]}}});
 if(effect==='【登場時】自分の場の［特徴：ファイヤーシスターズ］を1枚まで選び、別のラインに移動させる。')
  return program({kind:'moveTrait',program:{effects:{onPlay:[{op:'moveOwnTraitLine',trait:'ファイヤーシスターズ'}]}}});
 if(effect==='自分のフロントLのアクティブの〈阿良々木火憐〉を1枚レストにする。そうした場合、カードを3枚引く。')
  return program({kind:'restDrawThree',program:{effects:{onPlay:[{op:'restNamedActiveFrontThenDraw',name:'阿良々木火憐',draw:3}]}}});
 if(effect==='【登場時】自分の手札の〈千石撫子〉を1枚場外に置いてもよい。そうした場合、カードを1枚まで引く。【退場時】BP5000以下の相手のフロントLのキャラを1枚まで選び、退場させる。')
  return program({kind:'handThenRetire',program:{effects:{onPlay:[{op:'handNameOutsideMayDraw',name:'千石撫子'}],
   onRetire:[{op:'retireOppFrontOneUnderBp',bp:5000,optional:true}]}}});
 if(effect==='【登場時】以下から1つ選ぶ。・カードを1枚引き、自分の手札を1枚場外に置く。・自分の場のフィールドを1枚退場させてもよい。そうした場合、カードを1枚引く。')
  return program({kind:'printedFork',program:{effects:{onPlay:[{op:'chooseDrawOrField'}]}}});
 if(effect==='このカードが自分の効果でリムーブエリアに置かれた時、自分の山札の上から1枚までリムーブエリアに置く。')
  return program({kind:'removedMill',program:{effects:{},removedByOwnEffect:[{op:'millRemovedUpTo',count:1}]}});
 if(effect==='このカードが自分の効果でリムーブエリアに置かれた時、自分の場のキャラを1枚まで選び、このターン中、BP+1000。')
  return program({kind:'removedBuff',program:{effects:{},removedByOwnEffect:[{op:'buffAnyUpTo',bp:1000}]}});
 if(effect==='カードを2枚引く。このカードが自分の効果でリムーブエリアに置かれた時、カードを1枚まで引く。')
  return program({kind:'removedDraw',program:{effects:{onPlay:[{op:'draw',count:2}]},removedByOwnEffect:[{op:'mayDrawUpTo',count:1}]}});
 if(effect==='【登場時】自分の山札の上から4枚見る。その中から必要エナジーが3以下の赤のキャラカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚リムーブエリアに置く。')
  return program({kind:'energyRemove',program:{effects:{onPlay:[{op:'searchEnergyHandRemove',count:4,maxEnergy:3,color:'red',type:'character'}]}}});
 if(effect==='自分のフロントLにある〈羽川翼〉1枚につき、手札にあるこのカードの必要エナジーを【紫×1】減らす。自分の山札の上から7枚見る。その中から〈羽川翼〉を3枚まで公開し手札に加える。残りを望む順で山札の下に置く。')
  return program({kind:'frontSearch',program:{effects:{onPlay:[{op:'searchTakeNamed',count:7,take:3,name:'羽川翼'}]},
   handEnergyPerFrontName:{name:'羽川翼',amount:1}}});
 if(effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈'+KISS+'〉か〈忍野忍〉がある場合、『BP5000以下』に代わる。')
  return program({kind:'orRetire',program:{effects:{onPlay:[{op:'retireOrRaise',bp:3000,raised:5000,names:[KISS,'忍野忍']}]}}});
 if(effect==='『BP2000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈阿良々木火憐〉か〈阿良々木月火〉がある場合、『BP4000以下』に代わる。自分の場に〈阿良々木火憐〉と〈阿良々木月火〉がある場合、『BP5000以下』に代わる。')
  return program({kind:'ladderRetire',program:{effects:{onPlay:[{op:'retireLadder',bp:2000,one:4000,both:5000,
   names:['阿良々木火憐','阿良々木月火']}]}}});
 if(effect==='【自分のターン中】自分の場に〈神原駿河〉がある場合、このキャラはBP+1000。【相手のターン中】自分の場に〈八九寺真宵〉がある場合、このキャラは【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）を得る。【登場時】自分の場に〈戦場ヶ原ひたぎ〉がある場合、カードを1枚引き、自分の手札を1枚場外に置く。')
  return program({kind:'turnKit',program:{effects:{onPlay:[{op:'ifLiveThen',when:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'戦場ヶ原ひたぎ'},
   then:[{op:'drawDiscard',count:1}]}]},passiveBonuses:[
   {condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'神原駿河'},bp:1000},
   {condition:{kind:'ownNameExists',turn:'opponent',zone:'field',excludeSelf:false,name:'八九寺真宵'},impactNull:true}]}});
 if(effect==='自分の場のキャラを1枚選び、このターン中、「【アタック時】【ターン1】カードを3枚まで引く。」を与える。')
  return program({kind:'grantDraw',program:{effects:{onPlay:[{op:'grantAttackDrawUpTo',count:3}]}}});
 return null;
}

export function mgsEngineKind(card){
 return mgsProfile(card)?.kind||null;
}
