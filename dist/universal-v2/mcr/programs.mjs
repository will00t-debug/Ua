// Macross programs are shared Universal V2 DSL chosen from the full Japanese
// print. A sentence stays out until its shared ability exists. A raid print
// stays out until every framed keyword is listed in the raid box.
const norm=text=>String(text??'').replace(/\s+/g,'');
const EMPTY=new Set(['','-']);
const INK={yellow:'黄',blue:'青',red:'赤'};
const STANDARD=Object.freeze({
 '':null,
 '-':null,
 '【ドロー】カードを1枚引く。':'draw',
 '【ゲット】このカードを手札に加える。':'get',
 '【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。':'active',
 '【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。':'final'
});
const RAID_TRIGGER=norm('【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。');
const SPECIAL_TRIGGER=norm('【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。');
const SPECIAL_EFFECT={op:'retireOppFront'};
const COLOR_RETIRE=norm('【カラー】BP2500以下の相手のフロントLのキャラを1枚選び、退場させる。');
const COLOR_BOUNCE=norm('【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。');
const COLOR_REST=norm('【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。');
const IMPACT='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）';
const DISCOUNT=Object.freeze({
 yellow:Object.freeze({
  text:'相手の場に青か赤のカードがある場合、手札にあるこのカードの必要エナジーを【黄×1】減らす。',
  colors:Object.freeze(['blue','red'])
 }),
 blue:Object.freeze({
  text:'相手の場に黄か赤のカードがある場合、手札にあるこのカードの必要エナジーを【青×1】減らす。',
  colors:Object.freeze(['yellow','red'])
 }),
 red:Object.freeze({
  text:'相手の場に黄か青のカードがある場合、手札にあるこのカードの必要エナジーを【赤×1】減らす。',
  colors:Object.freeze(['yellow','blue'])
 })
});
const BATTLE_WIN=norm('このキャラがアタックしてバトルに勝利した時、カードを1枚引き、このバトルで敗北した相手のキャラは退場する代わりに、手札に戻る。');
export const MCR_SHARED_BLOCKER='完整印刷效果尚未對上既有共通 DSL，不進入對戰包。';

function pending(){
 return {ready:false,blocker:MCR_SHARED_BLOCKER};
}
function dsl(extra){
 return {ready:true,implementation:'dsl',effects:{},...extra};
}
function onPlay(op){
 return dsl({effects:{onPlay:[op]}});
}
function triggerAllowed(card){
 const triggerText=norm(card.triggerTextJa);
 if(card.trigger==='raid')return triggerText===RAID_TRIGGER;
 if(card.trigger==='special')return triggerText===SPECIAL_TRIGGER;
 if(card.trigger==='color')return triggerText===COLOR_RETIRE||triggerText===COLOR_BOUNCE||triggerText===COLOR_REST;
 return Object.prototype.hasOwnProperty.call(STANDARD,triggerText)&&
  STANDARD[triggerText]===card.trigger;
}
function nameSearch(count,name){
 return {op:'searchTopOneBottomDiscard',count,filter:{field:'name',value:name}};
}
function groups(count,items){
 return {op:'searchTopOneBottomDiscard',count,groups:items};
}
function songNames(turn='any',min=3){
 return {kind:'ownOutsideDistinctColorTraitNames',turn,color:'yellow',trait:'歌（ランカ）',min};
}
function nameHas(zone,names,turn='any'){
 return {kind:'ownNameIncludes',turn,zone,names};
}
function exactField(name,zone='field'){
 return {kind:'ownNameExists',turn:'any',name,zone,excludeSelf:false};
}
function bothIncludes(zone,names){
 return {kind:'ownNameIncludesAll',turn:'any',zone,names};
}
function outsideRaidSheryl(min){
 return {kind:'ownOutsideRaidNameAtLeast',turn:'own',name:'シェリル・ノーム',min};
}
function raid(name,extra){
 return dsl({raidName:name,...extra});
}

export function mcrSharedProgram(card){
 if(!card||card.title!=='mcr'||card.deckLegal!==true||card.type==='action-point')return pending();
 if(!triggerAllowed(card))return pending();
 const effect=norm(card.effectJa);
 const ink=INK[card.color];
 if(!ink&&card.type!=='action-point')return pending();
 if(card.type==='event'&&effect===norm(
  '自分の場外から【レイド】を持つキャラカードを1枚手札に加える。自分のフロントLのアクティブの〈シェリル・ノーム〉を1枚レストにしてもよい。そうした場合、自分のAPカードを1枚まで選び、アクティブにする。'))
  return dsl({effects:{onPlay:[
   {op:'recoverOutsideFiltered',optional:false,max:1,type:'character',raidKeyword:true},
   {op:'optionalRestNamedFrontThen',name:'シェリル・ノーム',then:[{op:'recoverAp',count:1}]}
  ]}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈シェリル・ノーム〉アクティブにし、フロントLに移動できる\n【登場時】自分の山札の上から3枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを場外に置く。\n【起動メイン】【フロントLにある場合】 【レストにする】カードを1枚引く。'))
  return raid('シェリル・ノーム',{effects:{onPlay:[{op:'inspectTopAnyOutside',count:3,rest:'top'}]},
   mainAbility:{op:'restSelfThen',frontOnly:true,then:[{op:'draw',count:1}]}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈シェリル・ノーム〉アクティブにし、フロントLに移動できる\n【登場時】カードを1枚引き、相手のフロントLのキャラを1枚まで選び、レストにする。\n【起動メイン】【フロントLにある場合】 【レストにする】相手のフロントLのレストのキャラを1枚選び、「このキャラは次の1回アクティブにならない。」を与える。'))
  return raid('シェリル・ノーム',{effects:{onPlay:[
   {op:'draw',count:1},{op:'restOppFrontOne',optional:true}]},
   mainAbility:{op:'restSelfThen',frontOnly:true,then:[{
    op:'skipNextActiveOppRest',optional:false,frontOnly:true}]}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈シェリル・ノーム〉アクティブにし、フロントLに移動できる\n【自分のターン中】自分の場外に【レイド】を持つ〈シェリル・ノーム〉が3枚以上ある場合、このキャラはBP+1000と【インパクト（1）】を得る。\n【登場時】自分の場外から必要エナジーが4以下の〈シェリル・ノーム〉を1枚まで手札に加える。'))
  return raid('シェリル・ノーム',{
   passiveBonuses:[{bp:1000,impact:1,condition:outsideRaidSheryl(3)}],
   effects:{onPlay:[{op:'recoverOutsideNamedEnergy',name:'シェリル・ノーム',maxEnergy:4,optional:true}]}
  });
 if(card.type==='character'&&effect===norm(
  '【レイド】〈シェリル・ノーム〉アクティブにし、フロントLに移動できる\n【自分のターン中】自分の場外に【レイド】を持つ〈シェリル・ノーム〉が5枚以上ある場合、このキャラはBP+500と【ダメージ（2）】を得る。\n【登場時】『BP3000以下』の相手のフロントLのキャラを1枚まで選び、退場させる。自分の場外に【レイド】を持つ〈シェリル・ノーム〉が3枚以上ある場合、『BP4000以下』に代わる。'))
  return raid('シェリル・ノーム',{
   passiveBonuses:[{bp:500,extraDamage:2,condition:outsideRaidSheryl(5)}],
   effects:{onPlay:[{op:'retireOppFrontUnderBp',optional:true,bp:3000,bonusBp:4000,
    bonusOutsideRaidName:{name:'シェリル・ノーム',min:3}}]}
  });
 if(card.type==='character'&&effect===norm(
  '【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）\n【レイド】〈ランカ・リー〉アクティブにし、フロントLに移動できる\n【自分のターン中】このキャラはBP+500。\n【起動メイン】【フロントLにある場合】このターン中、次に手札から使用する黄の［特徴：歌（ランカ）］の消費APを-1する。〈ランカ・リー〉のこの効果は1ターンに1回のみ発動できる。'))
  return raid('ランカ・リー',{step:true,ownTurnBp:500,mainAbility:{
   op:'frontNameOnceApDiscount',frontOnly:true,once:'name',name:'ランカ・リー',amount:1,
   filter:{color:'yellow',trait:'歌（ランカ）'}}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈ランカ・リー〉アクティブにし、フロントLに移動できる\n自分の場外の黄の［特徴：歌（ランカ）］のカード名の種類数により、このキャラは以下の効果を全て得る。\n・1種類以上：【登場時】カードを1枚引く。\n・3種類以上：【自分のターン中】このキャラはBP+1000と【インパクト（1）】\n・4種類以上：このキャラがアタックしてブロックされなかった時、このキャラをアクティブにする。〈ランカ・リー〉のこの効果は1ターンに1回のみ発動する。'))
  return raid('ランカ・リー',{
   passiveBonuses:[{bp:1000,impact:1,condition:songNames('own',3)}],
   unblockedAttack:{oncePerTurn:true,optional:false,once:'name',when:songNames('any',4),
    then:[{op:'activeSelf'}]},
   effects:{onPlay:[{op:'ifLiveThen',when:songNames('any',1),then:[{op:'draw',count:1}]}]}
  });
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  'BP5000以下の相手のフロントLのキャラを1枚選び、『レストにする。それは次の1回アクティブにならない』。自分の場に〈ランカ・リー〉がある場合、『退場させる』に代わる。'))
  return dsl({triggerEffect:SPECIAL_EFFECT,effects:{onPlay:[{
   op:'oppFrontRestBranch',optional:false,base:'restSkip',instead:'retire',bp:5000,name:'ランカ・リー'
  }]}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈ガルド・ゴア・ボーマン〉アクティブにし、フロントLに移動できる\n【登場時】カードを2枚引き、自分の手札を1枚場外に置く。\n【アタック時】自分のフロントLにカード名に「イサム」を含むキャラがある場合、カードを1枚引き、自分の手札を1枚場外に置く。'))
  return raid('ガルド・ゴア・ボーマン',{effects:{
   onPlay:[{op:'drawDiscard',count:2,discardCount:1}],
   onAttack:[{op:'ifLiveThen',when:nameHas('front',['イサム']),then:[{op:'drawDiscard',count:1}]}]
  }});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈イサム・ダイソン〉アクティブにし、フロントLに移動できる\n【登場時】BP2500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-2000。\n【アタック時】自分のフロントLにカード名に「ガルド」を含むキャラがある場合、このキャラの【登場時】を発動する。'))
  return raid('イサム・ダイソン',{effects:{
   onPlay:[{op:'enemyBpDown',optional:true,bp:2000,minBp:2500,zone:'front'}],
   onAttack:[{op:'ifLiveThen',when:nameHas('front',['ガルド']),then:[{
    op:'enemyBpDown',optional:true,bp:2000,minBp:2500,zone:'front'}]}]
  }});
 if(card.type==='event'&&effect===norm(
  '自分の山札の上から7枚見る。その中から【レイド】を持ちカード名に「イサム」か「ガルド」を含むキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。自分の場にカード名に「イサム」を含むキャラとカード名に「ガルド」を含むキャラがある場合、自分のAPカードを1枚まで選び、アクティブにする。'))
  return dsl({effects:{onPlay:[
   {op:'searchTopOneBottomDiscard',count:7,discard:false,groups:[
    {logic:'all',filters:[{field:'hasRaidKeyword',value:true},{field:'nameIncludes',value:'イサム'},{field:'type',value:'character'}]},
    {logic:'all',filters:[{field:'hasRaidKeyword',value:true},{field:'nameIncludes',value:'ガルド'},{field:'type',value:'character'}]}
   ]},
   {op:'ifLiveThen',when:bothIncludes('field',['イサム','ガルド']),then:[{op:'recoverAp',count:1}]}
  ]}});
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  'このカードは自分の場にカード名に「イサム」か「ガルド」を含むキャラがある場合のみ使用できる。\nBP5000以下の相手のフロントLのキャラを1枚選び、退場させる。自分のフロントLにカード名に「イサム」を含むキャラとカード名に「ガルド」を含むキャラがある場合、APを1支払ってもよい。そうした場合、自分の場外からカード名に「イサム」か「ガルド」を含むキャラカードを1枚まで手札に加える。'))
  return dsl({triggerEffect:SPECIAL_EFFECT,playRequiresNameIncludes:{zone:'field',names:['イサム','ガルド']},
   effects:{onPlay:[
    {op:'retireOppFrontUnderBp',bp:5000,mandatory:true},
    {op:'ifLiveThen',when:bothIncludes('front',['イサム','ガルド']),then:[{
     op:'optionalPayApThen',ap:1,optional:true,then:[{
      op:'recoverOutsideFiltered',optional:true,max:1,type:'character',
      namesIncludeAny:['イサム','ガルド']}]}]}
   ]}});
 if(card.type==='character'&&effect===norm(
  '【登場時】APを1支払ってもよい。そうした場合、自分の場外から〈リン・ミンメイ〉か〈早瀬 未沙〉を1枚まで手札に加える。\n【起動メイン】このキャラのBPが5000以上の場合、このキャラをアクティブにする。〈一条 輝〉のこの効果は1ターンに1回のみ発動できる。'))
  return dsl({
   effects:{onPlay:[{op:'optionalPayApThen',ap:1,optional:true,then:[{
    op:'recoverOutsideFiltered',optional:true,max:1,type:'character',
    namesAny:['リン・ミンメイ','早瀬 未沙']}]}]},
   mainAbility:{op:'nameOnceActive',scope:'name',when:{kind:'selfCurrentBpAtLeast',turn:'any',minBp:5000}}
  });
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の場にカード名に「マクシミリアン・ジーナス」を含むキャラがある場合、以下から1つ選ぶ。\n・自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを場外に置く。\n・自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。'))
  return dsl({effects:{onPlay:[{op:'ifLiveThen',when:nameHas('field',['マクシミリアン・ジーナス']),then:[{
   op:'chooseOne',optional:false,options:[
    {id:'arrange',label:'查看牌庫上方2張，任意張數依序放回牌庫頂，其餘放場外',turn:'any',
     then:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]},
    {id:'buff',label:'選擇自己場上其他1張角色，本回合BP+1000',turn:'any',
     then:[{op:'buffOwnField',optional:true,bp:1000,excludeSelf:true,filter:{field:'type',value:'character'}}]}
   ]}]}]}});
 if(card.type==='character'&&effect===norm(
  'このキャラがアタックしてバトルに勝利した時、カードを1枚引き、このバトルで敗北した相手のキャラは退場する代わりに、手札に戻る。\n【登場時】自分と相手はカードを1枚引く。\n【起動メイン】このターン中に自分がカードを4枚以上引いている場合のみ発動できる。このキャラをアクティブにする。〈熱気 バサラ〉のこの効果は1ターンに1回のみ発動できる。'))
  return dsl({attackWinDraw:{count:1},battleLoseToHand:true,
   effects:{onPlay:[{op:'drawEach',count:1}]},
   mainAbility:{op:'nameOnceActive',scope:'name',when:{kind:'drawnThisTurnAtLeast',turn:'any',min:4}}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈マクシミリアン・ジーナス〉アクティブにし、フロントLに移動できる\nこのキャラのBPが5000以上の場合、このキャラは【インパクト（1）】を得る。\n【登場時】自分の場にカード名に「ミリア・ファリーナ・ジーナス」を含むキャラがある場合、このキャラはこのターン中、BP+1000と【狙い撃ち】（相手のフロントLのキャラを指定してアタックでき、指定した場合、相手はブロックできない）を得る。'))
  return raid('マクシミリアン・ジーナス',{
   passiveBonuses:[{impact:1,condition:{kind:'selfCurrentBpAtLeast',turn:'any',minBp:5000}}],
   effects:{onPlay:[{op:'ifLiveThen',when:nameHas('field',['ミリア・ファリーナ・ジーナス']),
    then:[{op:'grantSelfBpSniper',bp:1000}]}]}
  });
 if(card.type==='character'&&effect===norm(
  '【レイド】〈ミレーヌ・フレア・ジーナス〉アクティブにし、フロントLに移動できる\n【登場時】カードを1枚引く。\n【起動メイン】【フロントLにある場合】 【レストにする】 【ターン1】このターン中、自分の手札にあるカード名に「バサラ」を含む全てのキャラカードの必要エナジーを【赤×2】減らす。\n【アタック時】自分の手札が5枚以上の場合、このキャラはこのターン中、BP+1000。'))
  return raid('ミレーヌ・フレア・ジーナス',{effects:{
   onPlay:[{op:'draw',count:1}],
   onAttack:[{op:'ifLiveThen',when:{kind:'ownHandCountAtLeast',turn:'any',min:5},
    then:[{op:'buffSelf',bp:1000}]}]
  },mainAbility:{op:'restSelfThen',frontOnly:true,oncePerTurn:true,then:[{
   op:'grantHandEnergyNameIncludes',color:'red',includes:'バサラ',amount:2}]}});
 if(card.type==='event'&&effect===norm(
  'カードを2枚引く。自分のフロントLのカード名に「バサラ」を含むキャラを1枚まで選び、アクティブにし、このターン中、【インパクト（+1）】（インパクトの与えるダメージが+1され、インパクトを持たない場合、【インパクト（1）】を得る）を与える。自分のフロントLの〈シビル〉を1枚まで選び、アクティブにする。'))
  return dsl({effects:{onPlay:[
   {op:'draw',count:2},
   {op:'activeOwnNamed',nameIncludes:'バサラ',line:'front',impactPlus:1,optional:true,max:1},
   {op:'activeOwnNamed',name:'シビル',line:'front',optional:true,max:1}
  ]}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈早乙女 アルト〉アクティブにし、フロントLに移動できる\n【自分のターン中】自分の場に〈シェリル・ノーム〉か〈ランカ・リー〉がある場合、このキャラはBP+1000。自分の場に〈シェリル・ノーム〉と〈ランカ・リー〉があるなら、さらに【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。\n【登場時】カードを1枚引く。'))
  return raid('早乙女 アルト',{
   passiveBonuses:[
    {bp:1000,condition:{kind:'ownAnyNameExists',turn:'own',zone:'field',excludeSelf:false,
     names:['シェリル・ノーム','ランカ・リー']}},
    {impact:1,condition:{logic:'all',turn:'own',checks:[
     {kind:'ownNameExists',turn:'own',name:'シェリル・ノーム',zone:'field',excludeSelf:false},
     {kind:'ownNameExists',turn:'own',name:'ランカ・リー',zone:'field',excludeSelf:false}
    ]}}
   ],
   effects:{onPlay:[{op:'draw',count:1}]}
  });
 if(card.type==='character'&&effect===norm(
  'このキャラはアクティブで場に登場させる。\n【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、このキャラはこのターン中、「このキャラはエナジーLからアタックできる。」と【狙い撃ち】（相手のフロントLのキャラを指定してアタックでき、指定した場合、相手はブロックできない）を得る。'))
  return dsl({enterAlwaysActive:true,effects:{onPlay:[{
   op:'discardGate',optional:true,then:[
    {op:'grantSelfEnergyAttackThisTurn'},{op:'grantSelfSniperThisTurn'}]
  }]}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈クラン・クラン〉アクティブにし、フロントLに移動できる\n【自分のターン中】このキャラはBP+500。\nこのキャラがアタックしてブロックされなかった時、自分の場にカード名に「ミハエル」を含むキャラがある場合、カードを1枚引く。\n【登場時】自分の手札から必要エナジーが2以下の青の〔キャラカードかフィールドカード〕を1枚まで自分の場にレストで登場させる。'))
  return raid('クラン・クラン',{ownTurnBp:500,
   unblockedAttack:{optional:false,when:nameHas('field',['ミハエル']),then:[{op:'draw',count:1}]},
   effects:{onPlay:[{op:'deployOwnHandRest',types:['character','field'],color:'blue',energy:2,max:1,optional:true}]}});
 if(card.type==='character'&&effect===norm(
  '【レイド】〈ガムリン木崎〉アクティブにし、フロントLに移動できる\n【登場時】自分の場にカード名に「ミレーヌ・フレア・ジーナス」を含むキャラがある場合、カードを2枚引き、自分の手札を1枚場外に置く。\n【アタック時】自分の場のカード名に「バサラ」を含むキャラを1枚まで選び、このターン中、「このキャラはBP3000以下のキャラにブロックされない。」を与える。'))
  return raid('ガムリン木崎',{effects:{
   onPlay:[{op:'ifLiveThen',when:nameHas('field',['ミレーヌ・フレア・ジーナス']),
    then:[{op:'drawDiscard',count:2,discardCount:1}]}],
   onAttack:[{op:'grantOwnBlockAtMost',optional:true,bp:3000,nameIncludes:'バサラ'}]
  }});
 if(effect.includes('【レイド】')||effect.includes('レイド以外'))return pending();
 if(EMPTY.has(effect)){
  if(card.type!=='character')return pending();
  return {ready:true,implementation:'vanilla',effects:{}};
 }
 if(card.type==='character'&&effect===norm(
  `【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+【${ink}】と「メインフェイズ終了時、このキャラを退場させる。」を得る。`))
  return dsl({mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}});
 if(card.type==='character'&&effect===norm(`このキャラがアクティブの場合、このキャラの発生エナジー+【${ink}】。`))
  return dsl({activeExtraEnergy:1});
 if(card.type==='character'&&effect==='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。')
  return onPlay({op:'drawDiscard',count:1});
 if(card.type==='character'&&effect==='【登場時】カードを1枚引く。')
  return onPlay({op:'draw',count:1});
 if(card.type==='character'&&effect==='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。')
  return onPlay({op:'bounceOwnOtherUnderEnergy',energy:1});
 if(card.type==='character'&&effect==='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）')
  return dsl({impactNull:true});
 const discount=DISCOUNT[card.color];
 if(card.type==='character'&&discount&&effect===norm(discount.text))
  return dsl({opponentFieldColorsHandEnergyDiscount:{colors:[...discount.colors],amount:1}});
 if(card.type==='event'&&effect==='自分のAPカードを2枚まで選び、アクティブにする。')
  return onPlay({op:'recoverAp',count:2});
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  '『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈シェリル・ノーム〉がある場合、『BP5000以下』に代わる。'))
  return dsl({triggerEffect:SPECIAL_EFFECT,effects:{onPlay:[{
   op:'retireOppFrontUnderBp',bp:3000,bonusName:'シェリル・ノーム',bonusBp:5000,mandatory:true
  }]}});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から3枚見る。その中から〈シェリル・ノーム〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay(nameSearch(3,'シェリル・ノーム'));
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から3枚見る。その中からカード名に「イサム」か「ガルド」を含むキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay(groups(3,[
   {logic:'all',filters:[{field:'nameIncludes',value:'イサム'},{field:'type',value:'character'}]},
   {logic:'all',filters:[{field:'nameIncludes',value:'ガルド'},{field:'type',value:'character'}]}
  ]));
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から3枚見る。その中から〈シェリル・ノーム〉か〈ランカ・リー〉か［特徴：S.M.S］を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return dsl({triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500},effects:{onPlay:[groups(3,[
   {logic:'all',filters:[{field:'name',value:'シェリル・ノーム'}]},
   {logic:'all',filters:[{field:'name',value:'ランカ・リー'}]},
   {logic:'all',filters:[{field:'trait',value:'S.M.S'}]}
  ])]}});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から4枚見る。その中からカード名に「バサラ」を含むキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay({op:'searchTopOneBottomDiscard',count:4,logic:'all',filters:[
   {field:'nameIncludes',value:'バサラ'},{field:'type',value:'character'}
  ]});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から4枚見る。その中から［特徴：Fire Bomber］かカード名に「ガムリン木崎」を含むキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay(groups(4,[
   {logic:'all',filters:[{field:'trait',value:'Fire Bomber'}]},
   {logic:'all',filters:[{field:'nameIncludes',value:'ガムリン木崎'},{field:'type',value:'character'}]}
  ]));
 if(card.type==='character'&&effect===norm(
  '【起動メイン】【レストにする】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。'))
  return dsl({mainAbility:{op:'restSelfThen',frontOnly:false,then:[{op:'peekTopOrBottom'}]}});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。'))
  return onPlay({op:'peekTopOrBottom'});
 if(card.type==='character'&&effect===norm(
  `【起動メイン】【レストにする】【ターン1】自分のフロントLのアクティブのキャラを1枚レストにする。そうした場合、このキャラはこのターン中、発生エナジー+【${ink}】。`))
  return dsl({mainAbility:{op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1}});
 if(card.type==='character'&&effect===BATTLE_WIN)
  return dsl({attackWinDraw:{count:1},battleLoseToHand:true});
 if(card.type==='character'&&norm(card.triggerTextJa)===COLOR_RETIRE&&
  effect===norm('【自分のターン中】このキャラはBP+1000。\n'+ 
   'このキャラがアタックしてバトルに勝利した時、カードを1枚引き、このバトルで敗北した相手のキャラは退場する代わりに、手札に戻る。'))
  return dsl({
   ownTurnBp:1000,attackWinDraw:{count:1},battleLoseToHand:true,
   triggerEffect:{op:'retireOppFrontUnderBp',bp:2500}
  });
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から2枚見る。その中から〈シェリル・ノーム〉を望む枚数場外に置く。残りを望む順で自分の山札の上に置く。'))
  return onPlay({op:'inspectTopAnyOutside',count:2,rest:'top',filter:{field:'name',value:'シェリル・ノーム'}});
 if(card.type==='character'&&effect===norm(
  '自分の場外に黄の［特徴：歌（ランカ）］のカード名が3種類以上ある場合、このキャラはBP+1500。'))
  return dsl({passiveBonuses:[{condition:songNames(),bp:1500}]});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の山札の上から2枚見る。その中からイベントカードを1枚まで場外に置く。残りを望む順で自分の山札の上に置く。'))
  return onPlay({op:'inspectTopAnyOutside',count:2,rest:'top',maxOutside:1,filter:{field:'type',value:'event'}});
 if(card.type==='character'&&norm(card.triggerTextJa)===COLOR_REST&&effect===norm(
  '【登場時】自分の山札の上から4枚見る。その中から黄の〔［特徴：歌（ランカ）］かフィールドカード〕を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return dsl({triggerEffect:{op:'restOppFrontSkipNextActive'},effects:{onPlay:[groups(4,[
   {logic:'all',filters:[{field:'color',value:'yellow'},{field:'trait',value:'歌（ランカ）'}]},
   {logic:'all',filters:[{field:'color',value:'yellow'},{field:'type',value:'field'}]}
  ])]}});
 if(card.type==='character'&&effect===norm(
  `${IMPACT}\n【自分のターン中】自分の場外に黄の［特徴：歌（ランカ）］のカード名が3種類以上ある場合、このキャラはBP+500。`))
  return dsl({impactNull:true,passiveBonuses:[{condition:songNames('own'),bp:500}]});
 if(card.type==='character'&&effect===norm(
  'このキャラはアクティブで場に登場させる。\n【登場時】以下から1つ選ぶ。\n・カードを2枚引き、自分の手札を2枚場外に置く。\n・自分の場外の黄の［特徴：歌（ランカ）］のカード名の種類数×1000以下のBPの相手のフロントLのキャラを1枚まで選び、手札に戻す。'))
  return dsl({enterAlwaysActive:true,effects:{onPlay:[{op:'chooseOne',optional:false,options:[
   {id:'draw',turn:'any',label:'抽兩張並將兩張手牌放到場外',then:[{op:'drawDiscard',count:2,discardCount:2}]},
   {id:'bounce',turn:'any',label:'可以將符合種類數上限的對手前線角色返回手牌',then:[{
    op:'bounceOppFrontOneUnderBp',optional:true,scale:{color:'yellow',trait:'歌（ランカ）',per:1000}
   }]}
  ]}]}});
 if(card.type==='field'&&effect===norm(
  '【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、カードを2枚引く。\n【起動メイン】【レストにする】【このカードを退場させる】自分の場のキャラを1枚選び、このターン中、BP+500。'))
  return dsl({
   effects:{onPlay:[{op:'discardToDraw',count:2,optional:true}]},
   mainAbility:{op:'restRetireThen',then:[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:500,optional:false,excludeSelf:true}]}
  });
 if(card.type==='event'&&effect===norm(
  'このカードは自分のフロントLに〈ランカ・リー〉がある場合のみ使用できる。\n以下から1つ選ぶ。\n・相手のフロントLのキャラを1枚まで選び、レストにする。それは次の1回アクティブにならない。\n・自分の山札の上から5枚見る。その中からキャラカードを2枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。'))
  return dsl({playRequiresFrontName:'ランカ・リー',effects:{onPlay:[{op:'chooseOne',optional:false,options:[
   {id:'rest',turn:'any',label:'可以讓對手前線角色休息且下次不能活動',then:[{op:'restOppFrontOne',optional:true,skipNextActive:true}]},
   {id:'look',turn:'any',label:'查看牌庫頂五張並最多將兩張角色加入手牌',then:[{
    op:'searchTopUpToTwoBottom',count:5,max:2,rest:'bottom',logic:'all',filters:[{field:'type',value:'character'}]
   }]}
  ]}]}});
 if(card.type==='event'&&effect===norm(
  '自分の場のキャラを1枚まで選び、このターン中、BP+1000。カードを1枚引く。自分の場外に黄の［特徴：歌（ランカ）］のカード名が3種類以上ある場合、自分のAPカードを1枚まで選び、アクティブにする。'))
  return dsl({effects:{onPlay:[
   {op:'buffOwnField',optional:true,excludeSelf:false,filter:{field:'type',value:'character'},bp:1000},
   {op:'draw',count:1},
   {op:'ifLiveThen',when:songNames(),then:[{op:'recoverAp',count:1}]}
  ]}});
 if(card.type==='event'&&effect===norm(
  'カードを1枚引き、自分の手札を1枚場外に置く。その後、自分の場外から必要エナジーが2以下の黄のキャラカードを1枚まで自分の場にレストで登場させる。'))
  return dsl({effects:{onPlay:[
   {op:'drawDiscard',count:1},
   {op:'deployOutsideColorTraitRest',color:'yellow',maxEnergy:2,ready:false,optional:true}
  ]}});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の場にカード名に「イサム」を含むキャラがある場合、自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを望む順で下に置く。'))
  return onPlay({op:'ifLiveThen',when:nameHas('field',['イサム']),then:[{op:'inspectTopArrange',count:2,split:true}]});
 if(card.type==='character'&&effect===norm(
  '【エナジーLにある場合】自分のフロントLにカード名に「イサム」を含むキャラがある場合、このキャラの発生エナジー+【青】。'))
  return dsl({passiveBonuses:[{extraEnergy:1,condition:{logic:'all',turn:'any',checks:[
   {kind:'selfOnEnergy',turn:'any'},
   nameHas('front',['イサム'])
  ]}}]});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の場にカード名に「ガルド」を含むキャラがある場合、BP1500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。'))
  return onPlay({op:'ifLiveThen',when:nameHas('field',['ガルド']),then:[{
   op:'enemyBpDown',optional:true,bp:1000,minBp:1500,zone:'front'
  }]});
 if(card.type==='character'&&effect===norm(
  'このキャラはアクティブで場に登場させる。\n【登場時】自分の場に〈ランカ・リー〉がある場合、自分の手札を1枚場外に置いてもよい。そうした場合、BP3500以下の相手のフロントLのキャラを1枚まで選び、手札に戻す。'))
  return dsl({enterAlwaysActive:true,effects:{onPlay:[{
   op:'discardGate',optional:true,when:exactField('ランカ・リー'),
   then:[{op:'bounceOppFrontOneUnderBp',bp:3500,optional:true}]
  }]}});
 if(card.type==='character'&&effect===norm(
  '【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）\n【起動メイン】【フロントLにある場合】【ターン1】自分の場の他のキャラ全ては、このターン中、BP+1000。'))
  return dsl({step:true,mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[{
   op:'buffOwnField',all:true,optional:false,excludeSelf:true,bp:1000,filter:{field:'type',value:'character'}
  }]}});
 if(card.type==='character'&&effect===norm(
  '【起動メイン】【レストにする】【ターン1】以下から1つ選ぶ。\n・BP4000以上の自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。\n・手札を1枚場外に置く。そうした場合、自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。'))
  return dsl({mainAbility:{op:'restSelfChoose',oncePerTurn:true,then:[{op:'chooseOne',optional:false,options:[
   {id:'high',turn:'any',label:'可以選擇其他目前 BP 4000 以上的角色並提高 BP',then:[{
    op:'buffOwnCurrentBp',minBp:4000,bp:1000,optional:true,excludeSelf:true
   }]},
   {id:'discard',turn:'any',label:'將一張手牌放到場外後可以提高其他角色 BP',then:[{
    op:'discardGate',optional:true,then:[{
     op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true
    }]
   }]}
  ]}]}});
 if(card.type==='character'&&effect===norm(
  `${IMPACT}\n【自分のターン中】自分の場にカード名に「マクシミリアン・ジーナス」か「ミレーヌ・フレア・ジーナス」を含むキャラがある場合、このキャラはBP+1000。`))
  return dsl({impactNull:true,passiveBonuses:[{bp:1000,condition:nameHas('field',['マクシミリアン・ジーナス','ミレーヌ・フレア・ジーナス'],'own')}]});
 if(card.type==='character'&&norm(card.triggerTextJa)===COLOR_RETIRE&&effect===norm(
  '【自分のターン中】自分の場にカード名に「ミリア・ファリーナ・ジーナス」か「ミレーヌ・フレア・ジーナス」を含むキャラがある場合、このキャラはBP+1000。'))
  return dsl({triggerEffect:{op:'retireOppFrontUnderBp',bp:2500},passiveBonuses:[{
   bp:1000,condition:nameHas('field',['ミリア・ファリーナ・ジーナス','ミレーヌ・フレア・ジーナス'],'own')
  }]});
 if(card.type==='character'&&effect===norm('自分の手札が5枚以上の場合、このキャラはBP+1500。'))
  return dsl({passiveBonuses:[{condition:{kind:'ownHandCountAtLeast',turn:'any',min:5},bp:1500}]});
 if(card.type==='character'&&effect===norm(
  '【登場時】このターン中に相手がカードを引いている場合、自分はカードを1枚まで引く。'))
  return onPlay({op:'ifLiveThen',when:{kind:'opponentDrewThisTurn',turn:'any'},then:[{op:'optionalDrawOne'}]});
 if(card.type==='character'&&effect===norm(
  '【起動メイン】【レストにする】自分の手札が5枚以上の場合のみ発動できる。自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。'))
  return dsl({mainAbility:{op:'restSelfThen',frontOnly:false,when:{kind:'ownHandCountAtLeast',turn:'any',min:5},then:[{op:'peekTopOrBottom'}]}});
 if(card.type==='character'&&effect===norm(
  `【相手のターン中】自分の場にカード名に「ミレーヌ・フレア・ジーナス」を含むキャラがある場合、このキャラはBP+1000と${IMPACT}を得る。`))
  return dsl({passiveBonuses:[{bp:1000,impactNull:true,condition:nameHas('field',['ミレーヌ・フレア・ジーナス'],'opponent')}]});
 if(card.type==='field'&&effect===norm(
  '【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを望む順で下に置く。\n【起動メイン】【レストにする】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。'))
  return dsl({
   effects:{onPlay:[{op:'inspectTopArrange',count:2,split:true}]},
   mainAbility:{op:'restSelfThen',frontOnly:false,then:[{op:'peekTopOrBottom'}]}
  });
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  '『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場にカード名に「マクシミリアン・ジーナス」を含むキャラがある場合、『BP5000以下』に代わる。'))
  return dsl({triggerEffect:SPECIAL_EFFECT,effects:{onPlay:[{
   op:'retireOppFrontUnderBp',bp:3000,bonusBp:5000,bonusNameIncludes:'マクシミリアン・ジーナス',mandatory:true
  }]}});
 if(card.type==='character'&&effect===norm(
  '自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【青×2】減らす。\n【登場時】自分のフロントLにカード名に「アルト」を含むキャラがある場合、自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを望む順で下に置く。'))
  return dsl({emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[{
   op:'ifLiveThen',when:nameHas('front',['アルト']),then:[{op:'inspectTopArrange',count:2,split:true}]
  }]}});
 if(card.type==='character'&&effect===norm(
  '自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【青×2】減らす。\n【登場時】自分のフロントLにカード名に「アルト」を含むキャラがある場合、BP2500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-2000。'))
  return dsl({emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[{
   op:'ifLiveThen',when:nameHas('front',['アルト']),then:[{
    op:'enemyBpDown',optional:true,bp:2000,minBp:2500,zone:'front'
   }]
  }]}});
 if(card.type==='character'&&effect===norm(
  `自分の場に〈シェリル・ノーム〉がある場合、このキャラは${IMPACT}を得る。\n【登場時】自分の場に〈ランカ・リー〉がある場合、カードを1枚引き、自分の手札を1枚場外に置く。`))
  return dsl({
   passiveBonuses:[{impactNull:true,condition:exactField('シェリル・ノーム')}],
   effects:{onPlay:[{op:'ifLiveThen',when:exactField('ランカ・リー'),then:[{op:'drawDiscard',count:1}]}]}
  });
 if(card.type==='character'&&effect===norm(
  '自分の場外に黄の［特徴：歌（ランカ）］のカード名が3種類以上ある場合、このキャラはBP+1000。'))
  return dsl({passiveBonuses:[{condition:songNames(),bp:1000}]});
 if(card.type==='character'&&effect===norm(
  `自分の手札が5枚以上の場合、このキャラはBP+500と${IMPACT}を得る。\n${'このキャラがアタックしてバトルに勝利した時、カードを1枚引き、このバトルで敗北した相手のキャラは退場する代わりに、手札に戻る。'}`))
  return dsl({
   passiveBonuses:[{bp:500,impactNull:true,condition:{kind:'ownHandCountAtLeast',turn:'any',min:5}}],
   attackWinDraw:{count:1},battleLoseToHand:true
  });
 return pending();
}
