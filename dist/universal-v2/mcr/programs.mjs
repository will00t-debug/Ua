// Macross programs are shared Universal V2 DSL chosen from the full Japanese
// print. A sentence stays out until its shared ability exists. Raid-frame
// cards stay out until every framed keyword is gated.
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
const SPECIAL_TRIGGER=norm('【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。');
const SPECIAL_EFFECT={op:'retireOppFront'};
const COLOR_RETIRE=norm('【カラー】BP2500以下の相手のフロントLのキャラを1枚選び、退場させる。');
const COLOR_BOUNCE=norm('【カラー】BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。');
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
 if(card.trigger==='raid')return false;
 if(card.trigger==='special')return triggerText===SPECIAL_TRIGGER;
 if(card.trigger==='color')return triggerText===COLOR_RETIRE||triggerText===COLOR_BOUNCE;
 return Object.prototype.hasOwnProperty.call(STANDARD,triggerText)&&
  STANDARD[triggerText]===card.trigger;
}
function nameSearch(count,name){
 return {op:'searchTopOneBottomDiscard',count,filter:{field:'name',value:name}};
}
function groups(count,items){
 return {op:'searchTopOneBottomDiscard',count,groups:items};
}

export function mcrSharedProgram(card){
 if(!card||card.title!=='mcr'||card.deckLegal!==true||card.type==='action-point')return pending();
 if(card.raidFrame)return pending();
 if(!triggerAllowed(card))return pending();
 const effect=norm(card.effectJa);
 const ink=INK[card.color];
 if(!ink&&card.type!=='action-point')return pending();
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
 return pending();
}
