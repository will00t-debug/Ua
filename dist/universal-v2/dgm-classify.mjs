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
 if(card.trigger==='special'&&card.triggerTextJa==='【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。')
  return {triggerEffect:{op:'retireOppFront'},special:'retireFront'};
 return null;
}

function accept(card,profile){
 const gate=knownTrigger(card);
 if(!gate||!profile)return null;
 if(gate.triggerEffect&&profile.allowColor!=='deploy'&&profile.allowSpecial!==gate.special)return null;
 if(gate.special&&profile.allowSpecial!==gate.special)return null;
 const {allowColor,allowSpecial,...body}=profile;
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
 if(effect.includes('レイド')&&!effect.includes('『レイドさせる』に代えてもよい')){
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
 const kanda='神田 ユウ';
 const union={kind:'ownDistinctUnionNames',turn:'any',zone:'field',excludeSelf:false,
  trait:'ノアの一族',name:'ノアの方舟',min:4};
 const order=effect==='【自分のターン中】自分の場に〈神田ユウ〉がある場合、このキャラはBP+1000。'?
  {kind:'kandaBp',program:{effects:{},passiveBonuses:[{condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:kanda},bp:1000}]}}:
  effect==='自分の場に［特徴：黒の教団］のカード名が4種類以上ある場合、このキャラはBP+1000。'?
  {kind:'traitNamesBp',program:{effects:{},passiveBonuses:[{condition:{kind:'ownDistinctTraitNames',turn:'any',min:4,zone:'field',excludeSelf:false,trait:'黒の教団'},bp:1000}]}}:
  effect==='【登場時】自分の山札の上から2枚見て、カードを1枚まで公開し手札に加える。残りを場外に置く。手札に加えた場合、自分の手札を1枚場外に置く。'?
  {kind:'lookTopAddOneOutside',program:{effects:{onPlay:[{op:'lookTopAddOneOutside',count:2}]}}}:
  effect===DRAW_DISCARD+'【起動メイン】【ターン1】自分のフロントLの〈リナリー・リー〉を1枚選び、エナジーLに移動させる。'?
  {kind:'moveNamedFront',program:{effects:{onPlay:[{op:'drawDiscard',count:1}]},
   mainAbility:{op:'moveNamedFrontToEnergy',frontOnly:true,oncePerTurn:true,name:'リナリー・リー'}}}:
  effect==='【登場時】自分の場に〈神田ユウ〉と〈フロワ・ティエドール〉が合計2枚以上ある場合、カードを1枚引く。'?
  {kind:'drawNamesMin',program:{effects:{onPlay:[{op:'drawIfOwnName',names:[kanda,'フロワ・ティエドール'],count:1,min:2}]}}}:
  effect==='【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、以下から1つ選ぶ。・自分の場外から〈フォー〉を1枚まで手札に加える。・自分の場外から必要エナジーが0の〈リナリー・リー〉を2枚まで手札に加える。'?
  {kind:'optionalDiscardRecoverMode',program:{effects:{onPlay:[{op:'optionalDiscardRecoverMode',modes:[
   {name:'フォー',max:1},{name:'リナリー・リー',max:2,energy:0}]}]}}}:
  effect==='自分の場に〈バク・チャン〉がある場合、このキャラは【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）を得る。【自分のターン中】自分の場に〈バク・チャン〉がある場合、このキャラはBP+1000。'?
  {kind:'nameDoubleBp',program:{effects:{},passiveBonuses:[
   {condition:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'バク・チャン'},doubleBlock:true},
   {condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'バク・チャン'},bp:1000}]}}:
  effect==='【起動メイン】【フロントLにある場合】【ターン1】自分の山札の上から1枚見て、山札の上に置く。【自分のターン中】自分の場に［特徴：黒の教団］のカード名が4種類以上ある場合、このキャラはBP+1000。'?
  {kind:'lookTopReturn',program:{effects:{},mainAbility:{op:'lookTopReturn',frontOnly:true,oncePerTurn:true,count:1},
   passiveBonuses:[{condition:{kind:'ownDistinctTraitNames',turn:'own',min:4,zone:'field',excludeSelf:false,trait:'黒の教団'},bp:1000}]}}:
  effect==='【登場時】自分の場に［特徴：黒の教団］のカード名が4種類以上ある場合、以下から1つまで選ぶ。・BP4000以上の相手のフロントLのキャラを1枚選び、このターン中、BP-500。・APを1支払う。そうした場合、BP2500以下の相手のフロントLのキャラを1枚まで選び、退場させる。【アタック時】自分の山札の上から1枚見て、山札の上か下に置く。'?
  {kind:'distinctFrontChoice',program:{effects:{onPlay:[{op:'distinctFrontChoice',trait:'黒の教団',min:4,
   down:{minBp:4000,bp:500},retire:{ap:1,maxBp:2500}}],onAttack:[{op:'peekTopOrBottom'}]}}}:
  effect==='【登場時】自分の手札から必要エナジーが2以下で消費APが1の青の［特徴：黒の教団］を1枚まで自分の場にアクティブで登場させる。登場させなかった場合、このキャラをアクティブにする。【アタック時】自分の場に［特徴：黒の教団］のカード名が4種類以上ある場合、このキャラはこのターン中、BP+500され、自分の山札の上から1枚を公開する。そのカードが［特徴：黒の教団］の場合、手札に加えてもよい。手札に加えない場合、山札の上か下に置く。'?
  {kind:'handDeployOrActiveSelf',program:{effects:{onPlay:[{op:'handDeployOrActiveSelf',color:'blue',trait:'黒の教団',maxEnergy:2,ap:1}],
   onAttack:[{op:'ifLiveThen',when:{kind:'ownDistinctTraitNames',turn:'any',min:4,zone:'field',excludeSelf:false,trait:'黒の教団'},then:[{op:'buffSelf',bp:500}]},
    {op:'ifLiveThen',when:{kind:'ownDistinctTraitNames',turn:'any',min:4,zone:'field',excludeSelf:false,trait:'黒の教団'},then:[{op:'revealTopTraitOptionalHand',trait:'黒の教団'}]}]}}}:
  effect==='このフィールドはアクティブで登場させる。【起動メイン】【レストにする】自分の場のキャラを1枚選び、このターン中、BP+1000。'?
  {kind:'activeFieldBuff',program:{effects:{},enterAlwaysActive:true,mainAbility:{op:'restSelfThen',frontOnly:false,
   then:[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:false,excludeSelf:false}]}}}:
  effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈リナリー・リー〉がある場合、『BP5000以下』に代わる。'?
  {kind:'retireRaise',allowSpecial:'retireFront',program:{effects:{onPlay:[{op:'retireOppFrontOneUnderBp',bp:3000,optional:false,
   fieldRaise:{zone:'field',name:'リナリー・リー',bp:5000}}]}}}:
  effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈アレン・ウォーカー〉がある場合、『BP5000以下』に代わる。'?
  {kind:'retireRaiseAllen',allowSpecial:'retireFront',program:{effects:{onPlay:[{op:'retireOppFrontOneUnderBp',bp:3000,optional:false,
   fieldRaise:{zone:'field',name:'アレン・ウォーカー',bp:5000}}]}}}:
  effect==='このカードは自分の場に〈神田ユウ〉がある場合のみ使用できる。BP3000以下の自分か相手のフロントLのキャラを1枚まで選び、手札に戻す。自分のキャラを戻した場合、カードを1枚まで引く。'?
  {kind:'bounceFrontCapDrawIfOwn',program:{effects:{onPlay:[{op:'bounceFrontCapDrawIfOwn',bp:3000}]},playRequiresOwnName:kanda}}:
  effect==='【起動メイン】【エナジーLにある場合】【レストにする】【このカードを退場させる】自分の場外から必要エナジーが0の紫の〈アレン・ウォーカー〉を1枚まで自分のエナジーLにレストで登場させる。'?
  {kind:'restRetireDeploy',program:{effects:{},mainAbility:{op:'restRetireDeploy',line:'energy',ready:false,optional:true,
   color:'purple',energy:0,name:'アレン・ウォーカー',to:'energy'}}}:
  effect==='【登場時】自分の山札の上から3枚見て、1枚まで場外に置く。残りを望む順で山札の上に置く。'?
  {kind:'inspectThree',program:{effects:{onPlay:[{op:'inspectTopAnyOutside',count:3,rest:'top',maxOutside:1}]}}}:
  effect===IMPACT_PLAIN+'【自分のターン中】自分の場外に〈アレン・ウォーカー〉が6枚以上ある場合、このキャラはBP+1000。'?
  {kind:'outsideNamedBp',program:{effects:{},impactNull:true,passiveBonuses:[{condition:{kind:'ownOutsideNamedCountAtLeast',turn:'own',min:6,names:['アレン・ウォーカー']},bp:1000}]}}:
  effect==='【登場時】自分の手札を1枚場外に置く。その後、自分の場の〈アレン・ウォーカー〉を1枚退場させてもよい。そうした場合、カードを2枚引く。'?
  {kind:'discardMayRetireNamedDraw',program:{effects:{onPlay:[{op:'discardMayRetireNamedDraw',name:'アレン・ウォーカー',draw:2}]}}}:
  effect==='【登場時】自分の山札の上から1枚見て、山札の上か場外に置く。【起動メイン】【手札を1枚場外に置く】【ターン1】BP1500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。'?
  {kind:'discardThenEnemyDown',program:{effects:{onPlay:[{op:'peekTopOrOutside'}]},
   mainAbility:{op:'discardThenEnemyDown',oncePerTurn:true,minBp:1500,bp:1000}}}:
  effect==='【登場時】自分の場に〈アレン・ウォーカー〉がある場合、自分の山札の上から2枚見て、望む枚数を望む順で山札の上に置き、残りを場外に置く。'?
  {kind:'namedWindow',program:{effects:{onPlay:[{op:'inspectTopAnyOutside',count:2,rest:'top',whenName:'アレン・ウォーカー'}]}}}:
  effect==='自分の場に〔［特徴：ノアの一族］と〈ノアの方舟〉〕のカード名が4種類以上ある場合、このキャラの発生エナジー+【紫】。'?
  {kind:'unionEnergy',program:{effects:{},passiveBonuses:[{condition:union,extraEnergy:1}]}}:
  effect===IMPACT_PLAIN+'【登場時】自分の場の他のキャラを1枚退場させる。【退場時】自分の手札から紫の〔〈ジャスデロ〉か〈デビット〉〕を1枚まで自分の場にレストで登場させる。この効果で登場したキャラは次の1回アクティブにならない。'?
  {kind:'deployHandNamesRestSkip',program:{effects:{onPlay:[{op:'retireOwnOther'}],onRetire:[{op:'deployHandNamesRestSkip',color:'purple',names:['ジャスデロ','デビット']}]},impactNull:true}}:
  effect==='【登場時】自分の山札の上から7枚見て、〈ジャスデビ〉か〈デビット〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札の〈ジャスデビ〉か〈デビット〉か必要エナジーが1以下のカードを1枚場外に置く。'?
  {kind:'lookTopNamesFilteredDiscard',program:{effects:{onPlay:[{op:'lookTopNamesFilteredDiscard',count:7,names:['ジャスデビ','デビット'],energyAtMost:1}]}}}:
  effect==='【登場時】自分の手札を1枚場外に置く。【アタック時】自分の場に〔［特徴：ノアの一族］と〈ノアの方舟〉〕のカード名が4種類以上ある場合、このキャラはこのターン中、BP+500。6種類以上ある場合、カードを1枚引き、自分の手札を1枚場外に置く。'?
  {kind:'unionAttackScale',program:{effects:{onPlay:[{op:'discardOwnHand'}],onAttack:[{op:'unionAttackScale',trait:'ノアの一族',name:'ノアの方舟',at:4,bp:500,high:6}]}}}:
  effect==='【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の山札の上から1枚見て、山札の上か下に置き、カードを1枚引く。'?
  {kind:'optionalPeekDraw',program:{effects:{onPlay:[{op:'discardGate',optional:true,then:[{op:'peekTopOrBottom'},{op:'draw',count:1}]}]}}}:
  effect==='【起動メイン】【レストにする】【このカードを退場させる】自分の場に〔［特徴：ノアの一族］と〈ノアの方舟〉〕のカード名が4種類以上ある場合のみ発動できる。自分の場外から〈ルル・ベル〉以外の必要エナジーが0の紫のキャラカードを1枚まで自分の場にレストで登場させる。'?
  {kind:'restRetireUnion',program:{effects:{},mainAbility:{op:'restRetireDeploy',line:'field',ready:false,optional:true,
   color:'purple',energy:0,exceptName:'ルル・ベル',to:'field',when:union}}}:
  effect==='【起動メイン】【レストにする】自分の場に〔［特徴：ノアの一族］と〈ノアの方舟〉〕のカード名が4種類以上ある場合のみ発動できる。自分の山札の上から1枚見て、山札の上か場外に置く。'?
  {kind:'restUnionPeek',program:{effects:{},mainAbility:{op:'restUnionPeek',when:union}}}:
  effect==='自分の場外から〈ネア・D・キャンベル〉を1枚『手札に加える』。自分の場外に〈アレン・ウォーカー〉が6枚以上ある場合、『レイドさせる』に代えてもよい。'?
  {kind:'outsideNamedHandOrRaid',program:{effects:{onPlay:[{op:'outsideNamedHandOrRaid',name:'ネア・D・キャンベル',raidName:'アレン・ウォーカー',raidMin:6}]}}}:
  effect==='カードを1枚引く。自分の場の〈ティキ・ミック〉を1枚まで選び、このターン中、BP+2500と「相手はこのキャラのアタックを可能ならブロックしなければならない。」を与える。'?
  {kind:'grantNamedMustBlock',program:{effects:{onPlay:[{op:'draw',count:1},{op:'grantNamedMustBlock',name:'ティキ・ミック',bp:2500}]}}}:
  null;
 if(order)return accept(card,order);
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
