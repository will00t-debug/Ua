// Whole-print classifier for 〈物語〉系列 Vol.2 / EX18BT.
// A card is registered only when the entire Japanese effect is one tested
// shared program and the life trigger is one of the standard printed texts.
// Raid-frame text is not registered until the Rugia HK span.raidBorder split
// is listed in raid-box.mjs. This file does not import the engine. There is
// no monogatari opcode.
import {mgsKnownTrigger,mgsProfile} from './mgs-classify.mjs';
import {raidBoxListed} from './raid-box.mjs';

const KISS='キスショット・アセロラオリオン・ハートアンダーブレード';
const IMPACT_PLAIN='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）';
const open={allowTrigger:true};

function extra(card,effect){
 if(effect==='【登場時】自分の場に〈千石撫子〉がある場合、カードを1枚引く。')
  return {kind:'drawIfNadeko',...open,program:{effects:{onPlay:[{op:'drawIfOwnName',name:'千石撫子',count:1}]}}};
 if(effect===IMPACT_PLAIN+'【登場時】自分の場に〈'+KISS+'〉がある場合、カードを1枚引く。')
  return {kind:'impactDrawKiss',...open,program:{effects:{onPlay:[{op:'drawIfOwnName',name:KISS,count:1}]},impactNull:true}};
 if(effect==='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【緑×2】減らす。'&&
  card.color==='green'&&card.energy>=2)
  return {kind:'emptyGreen',...open,program:{effects:{},emptyOwnFieldHandEnergyDiscount:2}};
 if(effect===IMPACT_PLAIN+'【退場時】カードを1枚引き、自分の手札を1枚場外に置く。')
  return {kind:'impactRetireDraw',...open,program:{effects:{onRetire:[{op:'drawDiscard',count:1}]},impactNull:true}};
 if(effect==='【退場時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。')
  return {kind:'retireBuff',...open,program:{effects:{onRetire:[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:false}]}}};
 if(effect==='【登場時】自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚まで自分の場にレストで登場させる。')
  return {kind:'greenRest',...open,program:{effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'green',energy:2,ap:1,max:1}]}}};
 const hit=program(card,effect);
 return hit;
}

const STEP='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）';
const YOTSUGI='斧乃木余接';
const pair=(energies,turn='any')=>({kind:'ownFrontPrintedEnergies',turn,energies});
const energyBuff=(max,bp)=>({op:'buffOwnField',filter:{field:'printedRequiredEnergyAtMost',value:max},
 bp,optional:true,excludeSelf:false,max});
function program(card,effect){
 if(effect===IMPACT_PLAIN+'【自分のターン中】自分の場か場外に〈ご神体〉がある場合、このキャラはBP+1000。')
  return {kind:'goshintaiBp',...open,program:{effects:{},impactNull:true,passiveBonuses:[{bp:1000,
   condition:{kind:'ownNameInFieldOrOutside',turn:'own',name:'ご神体'}}]}};
 if(effect===STEP+'【自分のターン中】このターン中に自分の〈蛇切縄〉が退場している場合、このキャラはBP+1000。')
  return {kind:'snakeLeftBp',...open,program:{effects:{},step:true,passiveBonuses:[{bp:1000,
   condition:{kind:'ownNameLeftThisTurn',turn:'own',name:'蛇切縄'}}]}};
 if(effect==='自分のキャラがアタックしてバトルに敗北したアタック終了時、アクティブのこのキャラをレストにしてもよい。そうした場合、自分の場の他の［特徴：ファイヤーシスターズ］を1枚まで選び、このターン中、BP+1000。')
  return {kind:'battleLossRest',...open,program:{effects:{},battleLossRestBuff:{trait:'ファイヤーシスターズ',bp:1000}}};
 if(effect==='【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の山札の上から1枚見て、山札の上か下に置き、カードを1枚引く。')
  return {kind:'handPeekDraw',...open,program:{effects:{onPlay:[{op:'optionalHandOutsideThen',then:[
   {op:'peekTopOrBottom'},{op:'draw',count:1}]}]}}};
 if(effect==='【アタック時】自分の場の他の［特徴：ファイヤーシスターズ］を1枚まで選び、このターン中、BP+1000。このターン中に自分の場の他のキャラがバトルに敗北している場合、このキャラはこのターン中、BP+1000。')
  return {kind:'sisterAttack',...open,program:{effects:{onAttack:[
   {op:'buffOwnField',filter:{field:'trait',value:'ファイヤーシスターズ'},bp:1000,optional:true,excludeSelf:true},
   {op:'ifLiveThen',when:{kind:'ownOtherLostBattleThisTurn',turn:'own'},then:[{op:'buffSelf',bp:1000}]}]}}};
 if(effect===IMPACT_PLAIN+'【エナジーLにある場合】自分のアタックフェイズ終了時、このキャラをフロントLに移動させてもよい。')
  return {kind:'energyFront',...open,program:{effects:{},impactNull:true,phaseEffects:[{phase:'attack',edge:'end',turn:'own',
   then:[{op:'mayMoveSelfToFront',fullLine:true}]}]}};
 if(effect==='【退場時】カードを1枚引き、自分の手札を1枚場外に置く。自分のターン中の場合、自分の手札から必要エナジーが0の紫の〈阿良々木暦〉を1枚まで自分のフロントLにレストで登場させる。')
  return {kind:'retireKoyomi',...open,program:{effects:{onRetire:[
   {op:'drawDiscard',count:1},
   {op:'deployOwnHandRest',type:'character',color:'purple',energy:0,ap:null,max:1,line:'front',name:'阿良々木暦',
    when:{kind:'controllerTurn',turn:'own'}}]}}};
 if(effect==='【登場時】【エナジーLにある場合】このキャラをアクティブにする。【起動メイン】【レストにする】BP5000以上の相手のフロントLのキャラを1枚選び、このターン中、BP-1000。')
  return {kind:'energyDown',...open,program:{effects:{onPlay:[{op:'activeSelfIf',line:'energy'}]},
   mainAbility:{op:'restSelfThen',frontOnly:false,then:[{op:'enemyBpDown',bp:1000,minBp:5000,zone:'front',optional:false}]}}};
 if(effect==='【登場時】自分の場に〈'+KISS+'〉か〈忍野忍〉がある場合、このキャラをアクティブにする。【退場時】自分の場外から〈妖刀心渡〉を1枚まで手札に加える。')
  return {kind:'kissActive',...open,program:{effects:{
   onPlay:[{op:'activeSelfIf',when:{kind:'ownAnyNameExists',turn:'any',zone:'field',excludeSelf:false,names:[KISS,'忍野忍']}}],
   onRetire:[{op:'recoverOutsideNamedEnergy',name:'妖刀心渡',maxEnergy:30,optional:true,anyType:true}]}}};
 if(effect==='【登場時】『カードを1枚引き、自分の手札を1枚場外に置く』。このターン中に自分の〈羽川翼〉の効果で自分の山札のカードを手札に加えている場合、『カードを1枚引く』に代わる。')
  return {kind:'tsubasaDraw',...open,program:{effects:{onPlay:[{op:'ifLiveThen',
   when:{kind:'ownEffectDeckToHandByName',turn:'own',name:'羽川翼'},
   then:[{op:'draw',count:1}],else:[{op:'drawDiscard',count:1}]}]}}};
 if(effect==='【登場時】自分の山札の上から『1枚』見て、1枚まで山札の上に置き、残りを望む順で下に置く。自分の場の〈羽川翼〉2枚につき、この効果で見る山札の枚数+1。')
  return {kind:'tsubasaLook',...open,program:{effects:{onPlay:[{op:'inspectTopArrange',count:1,split:true,maxTop:1,
   perNames:{name:'羽川翼',each:2,plus:1}}]}}};
 if(effect==='【自分のターン中】自分の場に【レイド】を持ちレイド状態でないキャラがある場合、このキャラはBP+500と【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）を得る。')
  return {kind:'unraidedStep',...open,program:{effects:{},passiveBonuses:[{bp:500,step:true,
   condition:{kind:'ownUnraidedRaidCharacter',turn:'own'}}]}};
 if(effect==='【登場時】自分の山札の上から2枚見て、1枚までリムーブエリアに置く。残りを望む順で山札の上に置く。')
  return {kind:'lookRemove',...open,program:{effects:{onPlay:[{op:'inspectTopArrange',count:2,split:true,maxRemoved:1}]}}};
 if(effect==='自分のフロントLに必要エナジーが2のキャラと3のキャラがある場合、このキャラはBP+1000。')
  return {kind:'frontPairBp',...open,program:{effects:{},passiveBonuses:[{bp:1000,condition:pair([2,3])}]}};
 if(effect==='自分のフロントLに必要エナジーが2のキャラと3のキャラがある場合、このキャラはBP4000以上のキャラにブロックされない。【アタック時】カードを1枚引き、自分の手札を1枚場外に置く。')
  return {kind:'frontPairBlock',...open,program:{effects:{onAttack:[{op:'drawDiscard',count:1}]},
   blockBpRestriction:{relation:'atLeast',bp:4000,condition:pair([2,3])}}};
 if(effect==='【登場時】自分の場の必要エナジーが3以下のキャラを3枚まで選び、このターン中、BP+500。自分のフロントLに必要エナジーが1のキャラと3のキャラがある場合、自分の場の必要エナジーが3以下のキャラを1枚まで選び、このターン中、【インパクト（1）】（アタックしてバトルに勝利した時、相手に1ダメージ）を与える。')
  return {kind:'energyBuffImpact',...open,program:{effects:{onPlay:[energyBuff(3,500),
   {op:'ifLiveThen',when:pair([1,3]),then:[{op:'grantChosenImpact',maxEnergy:3}]}]}}};
 if(effect==='【自分のターン中】自分のフロントLに必要エナジーが1のキャラと3のキャラがある場合、このキャラはBP+1000。【登場時】このキャラが自分の効果で登場していた場合、カードを1枚引く。')
  return {kind:'enteredDraw',...open,program:{effects:{onPlay:[{op:'ifLiveThen',
   when:{kind:'selfEnteredByOwnEffect',turn:'any'},then:[{op:'draw',count:1}]}]},
   passiveBonuses:[{bp:1000,condition:pair([1,3],'own')}]}};
 if(effect==='このカードは〈'+YOTSUGI+'〉があるラインにのみ登場できる。このキャラは移動できない。【登場時】自分の手札から必要エナジーが2以下の緑の〈'+YOTSUGI+'〉を1枚まで自分の場にレストで登場させる。自分の場に〈'+YOTSUGI+'〉がある場合、このキャラをアクティブにし、このキャラはこのターン中、BP+3000。'&&card.color==='green')
  return {kind:'yotsugiLine',...open,program:{effects:{onPlay:[
   {op:'deployOwnHandRest',type:'character',color:'green',energy:2,ap:null,max:1,name:YOTSUGI},
   {op:'ifLiveThen',when:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:true,name:YOTSUGI},then:[{op:'activeSelf'}]},
   {op:'ifLiveThen',when:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:true,name:YOTSUGI},then:[{op:'buffSelf',bp:3000}]}]},
   cannotMove:true,playOnNamedLine:{name:YOTSUGI}}};
 if(effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈老倉育〉がある場合、『BP5000以下』に代わる。')
  return {kind:'oguraRetire',...open,program:{effects:{onPlay:[{op:'retireOppFrontOneUnderBp',bp:3000,optional:false,
   fieldRaise:{zone:'field',name:'老倉育',bp:5000}}]}}};
 if(effect==='『BP2000』以下の相手のフロントLのキャラを1枚まで選び、退場させる。自分のフロントLの必要エナジーが1～3のキャラ1枚につき、この効果で選べるキャラのBPの範囲+1000。自分のフロントLに必要エナジーが1のキャラと2のキャラと3のキャラがある場合、自分の場の必要エナジーが3以下のキャラを3枚まで選び、このターン中、BP+500。')
  return {kind:'energyScaleRetire',...open,program:{effects:{onPlay:[
   {op:'retireOppFrontOneUnderBp',bp:2000,optional:true,frontEnergyRaise:1000},
   {op:'ifLiveThen',when:pair([1,2,3]),then:[energyBuff(3,500)]}]}}};
 if(effect==='自分の場外にあるカードが9枚以下の場合、自分の場とレイド元のこのカードの必要エナジーを【赤×1】減らす。自分の場外にあるカードが9枚以下の場合、このキャラはBP-1000。このキャラの必要エナジーが1以上の場合、このキャラは【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）を得る。'&&
  card.color==='red'&&card.energy>=1)
  return {kind:'redCutNull',...open,program:{effects:{},outsideAtMost:{max:9,energy:1,bp:-1000},
   passiveBonuses:[{impactNull:true,condition:{kind:'selfLiveEnergyAtLeast',turn:'any',min:1}}]}};
 if(effect==='自分の場外にあるカードが9枚以下の場合、自分の場とレイド元のこのカードの必要エナジーを【赤×3】減らす。自分の場外にあるカードが9枚以下の場合、このキャラはBP-500。【登場時】このキャラの必要エナジーが1以上の場合、自分の場外から〈阿良々木暦〉を1枚まで手札に加える。'&&
  card.color==='red'&&card.energy>=3)
  return {kind:'redCutRecover',...open,program:{effects:{onPlay:[{op:'ifLiveThen',
   when:{kind:'selfLiveEnergyAtLeast',turn:'any',min:1},
   then:[{op:'recoverOutsideNamedEnergy',name:'阿良々木暦',maxEnergy:30,optional:true}]}]},
   outsideAtMost:{max:9,energy:3,bp:-500}}};
 if(effect==='自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【赤×2】減らす。【登場時】自分の山札の上から1枚見て、山札の上かリムーブエリアに置く。'&&
  card.color==='red'&&card.energy>=2)
  return {kind:'emptyRedPeek',...open,program:{effects:{onPlay:[{op:'peekTopOrRemoved'}]},
   emptyOwnFieldHandEnergyDiscount:2}};
 if(effect==='このカードが自分の効果でリムーブエリアに置かれた時、自分の場外から必要エナジーが2以下の〈八九寺真宵〉を1枚まで手札に加える。')
  return {kind:'removedMayoi',...open,program:{effects:{},removedByOwnEffect:[
   {op:'recoverOutsideNamedEnergy',name:'八九寺真宵',maxEnergy:2,optional:true}]}};
 if(effect==='自分の山札の上から5枚見て、必要エナジーが2以下の〔〈神原駿河〉か〈沼地蠟花〉かイベントカード〕を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。自分の手札から必要エナジーが1以下の赤の〈神原駿河〉を1枚まで自分の場にレストで登場させる。')
  return {kind:'surugaSearch',...open,program:{effects:{onPlay:[
   {op:'searchTopOneBottomDiscard',count:5,discard:false,groups:[
    {logic:'all',filters:[{field:'printedRequiredEnergyAtMost',value:2},{field:'name',value:'神原駿河'}]},
    {logic:'all',filters:[{field:'printedRequiredEnergyAtMost',value:2},{field:'name',value:'沼地蠟花'}]},
    {logic:'all',filters:[{field:'printedRequiredEnergyAtMost',value:2},{field:'type',value:'event'}]}]},
   {op:'deployOwnHandRest',type:'character',color:'red',energy:1,ap:null,max:1,name:'神原駿河'}]}}};
 if(effect==='【起動メイン】【エナジーLにある場合】【レストにする】このキャラを自分の山札の上に置き、自分の場外から必要エナジーが0の紫の〈羽川翼〉を1枚まで自分の場にレストで登場させる。')
  return {kind:'deckTsubasa',...open,program:{effects:{},mainAbility:{op:'energyRestDeckDeploy',name:'羽川翼',color:'purple',energy:0}}};
 if(effect==='【登場時】自分の山札の上から1枚見て、山札の上かリムーブエリアに置く。【起動メイン】【レストにする】自分の場外の【ファイナルトリガー】を持つカードを1枚リムーブエリアに置く。そうした場合、自分の山札の上から1枚見て、山札の上か下に置き、相手は自身の山札の上から1枚見て、山札の上か下に置く。')
  return {kind:'finalPeek',...open,program:{effects:{onPlay:[{op:'peekTopOrRemoved'}]},mainAbility:{op:'restFinalPeek'}}};
 if(effect==='【登場時】【エナジーLにある場合】このキャラをアクティブにする。【起動メイン】【レストにする】自分の場外の【ファイナルトリガー】を持つカードを1枚リムーブエリアに置く。そうした場合、自分の山札の上から1枚見て、山札の上か下に置き、相手は自身の山札の上から1枚見て、山札の上か下に置き、このキャラが登場したターンの場合、自分はカードを1枚引く。')
  return {kind:'finalPeekDraw',...open,program:{effects:{onPlay:[{op:'activeSelfIf',line:'energy'}]},
   mainAbility:{op:'restFinalPeek',drawIfEntry:true}}};
 if(effect===STEP+IMPACT_PLAIN+'【起動メイン】【エナジーLにある場合】【ターン1】自分のフロントLに必要エナジーが1のキャラと3のキャラがある場合のみ発動できる。このキャラをフロントLに移動させ、このキャラはこのターン中、BP+1000。')
  return {kind:'pairMove',...open,program:{effects:{},step:true,impactNull:true,mainAbility:{op:'energyPairMoveFront',oncePerTurn:true,energies:[1,3],bp:1000}}};
 if(effect==='【レイド】〈八九寺真宵〉アクティブにし、フロントLに移動できる【自分のターン中】自分のフロントLに必要エナジーが1のキャラと2のキャラがある場合、このキャラはBP+500。【登場時】自分の手札から必要エナジーが3以下で消費APが1の緑のキャラカードを1枚まで自分の場にレストで登場させる。')
  return {kind:'mayoiRaid',...open,program:{effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'green',energy:3,ap:1,max:1}]},
   passiveBonuses:[{bp:500,condition:pair([1,2],'own')}],raidName:'八九寺真宵',raidFeatures:['passive','onPlay']}};
 if(effect==='【登場時】自分のフロントLに必要エナジーが1のキャラと2のキャラがある場合、このキャラをアクティブにする。〈八九寺真宵〉のこの効果は1ターンに1回のみ発動する。【アタック時】必要エナジーが3以下の自分の場のキャラを『1枚』まで選び、このターン中、BP+500。自分のフロントLに必要エナジーが1のキャラと2のキャラがある場合、自分の手札を1枚場外に置いてもよい。そうした場合、『3枚』に代わる。')
  return {kind:'mayoiOnce',...open,program:{effects:{
   onPlay:[{op:'activeSelfIf',when:pair([1,2]),onceName:'八九寺真宵'}],
   onAttack:[{op:'pairHandBuff',bp:500,max:1,paidMax:3,energy:3,when:pair([1,2])}]}}};
 if(effect==='【起動メイン】【レストにする】【このカードを退場させる】自分の場外から必要エナジーが2の緑の〈斧乃木余接〉を1枚まで自分のエナジーLにアクティブで登場させる。')
  return {kind:'craneDeploy',...open,program:{effects:{},mainAbility:{op:'fieldRestRetireDeploy',name:YOTSUGI,color:'green',energy:2,line:'energy',ready:true}}};
 if(effect==='【登場時】自分の場のレイド状態の〈千石撫子〉の一番上のカードを場外に置いてもよい。そうした場合、カードを1枚引き、相手のフロントLのキャラを1枚まで選び、レストにし、自分の場の【レイド】を持たない〈千石撫子〉を1枚まで選び、そのキャラの【登場時】を発動する。')
  return {kind:'raidTopNadeko',...open,program:{effects:{onPlay:[{op:'raidTopOutsideThen'}]}}};
 if(effect==='【レイド】〈千石撫子〉アクティブにし、フロントLに移動できるこのキャラが場を離れた時、自分の場外から必要エナジーが2以下の黄の〈千石撫子〉を1枚まで自分の場にレストで登場させる。【登場時】カードを1枚引く。自分の場外から黄のフィールドカードを1枚まで自分のエナジーLにレストで登場させる。【起動メイン】【フロントLにある場合】【ターン1】自分の場のフィールドを1枚退場させる。そうした場合、このキャラはこのターン中、【インパクト（1）】を得る。')
  return {kind:'nadekoRaid',...open,program:{effects:{onPlay:[{op:'drawYellowField'}]},
   mainAbility:{op:'frontFieldImpact',frontOnly:true,oncePerTurn:true},
   fieldLeaveRestNamed:{color:'yellow',name:'千石撫子',maxEnergy:2},raidName:'千石撫子',
   raidFeatures:['fieldLeave','onPlay','main']}};
 if(effect==='このキャラのアタックがブロックされた時、カードを1枚引く。【レイド】〈阿良々木月火〉アクティブにし、フロントLに移動できるこのキャラのアタックがブロックされなかった時、相手のフロントLのキャラを1枚まで選び、レストにする。【退場時】このカードを自分の場にレストで登場させる。')
  return {kind:'tsukihiRaid',...open,program:{effects:{onAttackBlocked:[{op:'draw',count:1}],onRetire:[{op:'reenterSelfRest'}]},
   unblockedAttack:{optional:true,then:[{op:'restOppFrontOne',optional:true}]},raidName:'阿良々木月火',
   raidFeatures:['unblockedAttack','onRetire']}};
 if(effect==='【登場時】カードを1枚引き、自分の手札を1枚場外に置く。【退場時】自分のターン中の場合、以下から1つ選ぶ。・このターン中、次に手札から使用する元々の必要エナジーが8以上の〈千石撫子〉の必要エナジーを【黄×3】減らす。・必要エナジーが8以上の〈千石撫子〉を1枚まで選び、このターン中、【狙い撃ち】（相手のフロントLのキャラを指定してアタックでき、その場合ブロックされない）を与える。')
  return {kind:'highNadeko',...open,program:{effects:{onPlay:[{op:'drawDiscard',count:1}],onRetire:[{op:'retireHighNadekoChoice'}]}}};
 if(effect==='【起動メイン】【ターン1】自分のフロントLに〔〈キスショット・アセロラオリオン・ハートアンダーブレード〉、〈忍野忍〉、〈阿良々木暦〉〕以外のキャラがなく、このキャラが登場したターン中のみ発動できる。以下から『1つ』まで選ぶ。自分の手札を1枚場外に置いてもよい。そうした場合、『2つ』に代わる。・自分の場外から〈阿良々木暦〉を1枚手札に加え、自分の手札を2枚場外に置く。・自分の場の〈阿良々木暦〉を1枚選び、このターン中、「このキャラはBP3000以下のキャラにブロックされない。」を与える。・BP1500以上の相手のフロントLのキャラを1枚選び、このターン中、BP-1000。')
  return {kind:'kissMenu',...open,program:{effects:{},mainAbility:{op:'entryFrontMenu',oncePerTurn:true}}};
 if(effect==='このキャラがブロックしてバトルに勝利した時、このキャラを退場させ、自分の場外から必要エナジーが1以下の〈忍野忍〉を1枚まで手札に加える。【起動メイン】【場外にある場合】BP4000以上の自分の場の〈阿良々木暦〉を1枚退場させる。そうした場合、このカードを自分の場にレストで登場させる。')
  return {kind:'blockWinShinobu',...open,program:{effects:{},blockWinRetireRecover:{name:'忍野忍',maxEnergy:1},
   outsideMain:{op:'outsideRetireEnter',name:'阿良々木暦',minBp:4000}}};
 if(effect==='このキャラがレイドされた時、必要エナジーの数を1つ指定する。自分の山札の上から1枚を公開する。公開したカードの必要エナジーの数がこの効果で指定した数と同じだった場合、そのカードを手札に加える。手札に加えなかった場合、公開したカードを山札の上に置く。（レイドしたキャラの【登場時】とこの効果は望む順で処理する）')
  return {kind:'raidedEnergy',...open,program:{effects:{onRaided:[{op:'raidedEnergyReveal'}]}}};
 if(effect==='このカードは〈羽川翼〉としても扱う。【レイド】〈羽川翼〉アクティブにし、フロントLに移動できるこのキャラのアタック終了時、自分の手札を1枚場外に置いてもよい。そうした場合、このターン中にアタックしておらず、【レイド】を持たない自分のフロントLの〈羽川翼〉1枚に、このキャラの一番上のカードをレイドさせてもよい。〈ブラック羽川〉のこの効果は1ターンに1回のみ発動できる。【登場時】相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。')
  return {kind:'blackRaid',...open,program:{effects:{onPlay:[{op:'enemyBpDown',bp:1000,optional:true,zone:'front'}]},
   phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[{op:'mayHandRaidTop'}]}],
   raidName:'羽川翼',raidFeatures:['phase','onPlay']}};
 if(effect==='カードを3枚引く。このターン中、自分のAPカードは効果によってアクティブにならない。【起動メイン】【場外にある場合】自分のフロントLに〈羽川翼〉以外のキャラがなく、自分のリムーブエリアに〈ブラック羽川〉がない場合のみ発動できる。自分の場外の〈ブラック羽川〉を1枚リムーブエリアに置く。そうした場合、このカードを手札に加える。')
  return {kind:'lockAp',...open,program:{effects:{onPlay:[{op:'drawLockApReady'}]},outsideMain:{op:'outsideBlackHand'}}};
 if(effect==='【起動メイン】【手札を1枚場外に置く】【ターン1】このキャラがレイド状態でない場合のみ発動できる。自分の場外の【レイド】を持たない緑の〈阿良々木暦〉を1枚、このキャラの下に表向きで置く。このキャラが登場したターン中でレイド状態の場合、カードを1枚引く。【レイド】〈阿良々木暦〉アクティブにし、フロントLに移動できる【起動メイン】【レストにする】このキャラはこのターン中、発生エナジー+【緑】。')
  return {kind:'koyomiRaid',...open,program:{effects:{onPlay:[{op:'raidEntryDraw'}]},
   mainAbility:{op:'raidRestGen'},unraidedMain:{op:'unraidedFaceUpUnder',oncePerTurn:true,name:'阿良々木暦'},
   raidName:'阿良々木暦',raidFeatures:['main']}};
 if(effect==='【起動メイン】【ターン1】自分のリムーブエリアのキャラカードを1～2枚望む順で自分の山札の下に置く。山札の下に置いたカードのカード名により、このキャラは次の自分のターン開始時まで以下の効果を全て得る。・老倉育：【インパクト無効】・忍野扇：【起動メイン】このキャラをアクティブにする。〈阿良々木暦〉のこの効果は1ターンに1回のみ発動できる。')
  return {kind:'bottomNames',...open,program:{effects:{},mainAbility:{op:'bottomNameGrant',oncePerTurn:true}}};
 if(effect==='【登場時】自分の山札の上から2枚見て、望む枚数を望む順で山札の上に置き、残りを場外に置く。自分の場のレイド状態のキャラのレイド元を1枚リムーブエリアに置いてもよい。そうした場合、カードを1枚引き、自分の手札を1枚場外に置く。')
  return {kind:'lookOrigin',...open,program:{effects:{onPlay:[{op:'lookTwoOutsideOrigin'}]}}};
 if(effect==='【レイド】〈老倉育〉アクティブにし、フロントLに移動できる自分の場に【レイド】を持ちレイド状態でないキャラがある場合、このキャラは【インパクト（1）】を得る。【登場時】「自分の手札を1枚場外に置く。自分の場の他のレイド状態のキャラのレイド元を1枚リムーブエリアに置く。」をしてもよい。そうした場合、置いたレイド元のカードの元々の発生エナジーの数+1枚カードを引く。置いたレイド元のカードの元々の発生エナジーが0の場合、このキャラはこのターン中、BP+1000と【狙い撃ち】を得る。')
  return {kind:'oguraRaid',...open,program:{effects:{onPlay:[{op:'optionalOriginDraw'}]},
   passiveBonuses:[{impact:1,condition:{kind:'ownUnraidedRaidCharacter',turn:'own'}}],
   raidName:'老倉育',raidFeatures:['passive','onPlay']}};
 if(effect==='【登場時】自分の山札の上から2枚見て、2枚まで手札に加え、残りをリムーブエリアに置く。1枚以上リムーブエリアに置いた場合、自分のAPカードを1枚アクティブにする。2枚以上リムーブエリアに置いた場合、自分のリムーブエリアから【ファイナルトリガー】を持つカードを1枚まで手札に加える。')
  return {kind:'lookHandAp',...open,program:{effects:{onPlay:[{op:'lookTwoHandRemovedAp'}]}}};
 if(effect==='【レイド】〈忍野扇〉アクティブにし、フロントLに移動できる【登場時】カードを1枚引く。自分の手札を1枚リムーブエリアに置いてもよい。そうした場合、自分のリムーブエリアから【ファイナルトリガー】を持つカードを1枚まで手札に加える。リムーブエリアに置いたカードが〈忍野扇〉なら〈阿良々木暦〉、〈阿良々木暦〉なら〈忍野扇〉を自分のリムーブエリアからさらに1枚まで手札に加える。')
  return {kind:'ougiRaid',...open,program:{effects:{onPlay:[{op:'drawHandFinalPair'}]},
   raidName:'忍野扇',raidFeatures:['onPlay']}};
 if(effect==='【登場時】自分の場の〈阿良々木暦〉を1枚退場させてもよい。そうした場合、そのカードを自分の場にアクティブで登場させる。この効果でレイド状態の〈阿良々木暦〉を退場させた場合、そのキャラのレイド元を1枚まで手札に加える。')
  return {kind:'koyomiReenter',...open,program:{effects:{onPlay:[{op:'optionalKoyomiReenter'}]}}};
 if(effect==='以下から1つ選ぶ。・自分の場の〈斧乃木余接〉を1枚選び、このターン中、BP+2000と【インパクト（1）】を与える。・自分の場の〈斧乃木余接〉1枚とそれと同じラインのキャラを1枚まで選び、それぞれ別のラインに移動させるか別のラインのキャラ1枚と位置を入れ替える。自分のAPカードを1枚アクティブにする。（移動は同時に行われる）')
  return {kind:'yotsugiEvent',...open,program:{effects:{onPlay:[{op:'yotsugiOrMove'}]}}};
 if(effect==='自分の場の必要エナジーが3の〈八九寺真宵〉を1枚退場させる。そうした場合、自分の場外から消費APが1で必要エナジーが1と2の緑のキャラカードをそれぞれ1枚まで自分の場にレストで登場させる。この効果で〈阿良々木暦〉を登場させた場合、この効果で退場させた〈八九寺真宵〉を自分の場にレストで登場させる。')
  return {kind:'mayoiEvent',...open,program:{effects:{onPlay:[{op:'retireMayoiPair'}]}}};
 if(effect==='このキャラがレイドされた時、自分の山札の上から1枚を裏向きでレイドしたキャラの下に置いてもよい。そうした場合、カードを1枚引き、自分の手札を1枚場外に置く。（レイドしたキャラの【登場時】とこの効果は望む順で処理する）【登場時】自分の山札の上から2枚見て、〈神原駿河〉を1枚まで場外に置く。残りを望む順で山札の上に置く。')
  return {kind:'raidedSuruga',...open,program:{effects:{onRaided:[{op:'raidedFacedownDraw'}],onPlay:[{op:'lookSurugaOutside'}]}}};
 if(effect==='【登場時】カードを1枚引き、自分の手札を1枚場外か、裏向きで自分の場の〈沼地蠟花〉1枚の下に置く。【アタック時】【ターン1】自分の場のカードの下にある裏向きのカードの合計枚数を満たすものを、以下から1つまで選ぶ。このターン中に〈神原駿河〉が既に選んだ効果は選べない。・1枚以上：カードを1枚引く。・3枚以上：自分のフロントLのキャラの下の裏向きのカードを1枚このキャラの下に移動させてもよい。そうした場合、このキャラをアクティブにする。')
  return {kind:'flowerUnder',...open,program:{effects:{onPlay:[{op:'drawHandOrFlower'}],onAttack:[{op:'facedownAttackChoice'}]}}};
 if(effect==='自分の場外にあるカードが9枚以下の場合、自分の場とレイド元のこのカードの必要エナジーを【赤×3】減らす。【登場時】自分の山札の上から3枚見て、キャラカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。このキャラの必要エナジーが1以上の場合、以下から1つまで選ぶ。・自分の場のキャラを1枚選び、このターン中、BP+1000。・〈戦場ヶ原ひたぎ〉以外の自分の場のキャラを1枚選び、次の自分のターン開始時まで、「このキャラは相手の効果で選ばれない。」を与える。')
  return {kind:'hitagiLook',...open,program:{effects:{onPlay:[{op:'lookThreeCharacter'}]},
   outsideAtMost:{max:9,energy:3}}};
 if(effect==='【自分のターン中】このキャラの下の裏向きのカード1枚につき、このキャラはBP+500。自分のアタックフェイズ終了時、自分の場のレイド状態の〈神原駿河〉を1枚まで選ぶ。選んだキャラの下の裏向きのカード全てをこのキャラの下に裏向きで置き、選んだキャラのレイド元を場外に置く。')
  return {kind:'flowerEnd',...open,program:{effects:{},bpPerDirectFacedown:{amount:500,turn:'own'},
   phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[{op:'attackEndTakeFacedowns'}]}]}};
 if(effect==='【起動メイン】【フロントLにある場合】【ターン1】このキャラがアクティブの場合のみ発動できる。自分の手札を1枚リムーブエリアに置く。そうした場合、以下から1つ選ぶ。・カードを1枚引く。・このキャラはこのターン中、BP+1000。・このターン中、次に自分が「BPの範囲に指定がある効果」で相手の場のキャラを選ぶ際、指定できるBPの範囲+1000。')
  return {kind:'windowMain',...open,program:{effects:{},mainAbility:{op:'activeHandWindow',frontOnly:true,oncePerTurn:true}}};
 return null;
}

export function mgs2Profile(card){
 const shared=mgsProfile(card);
 if(shared)return shared;
 const gate=mgsKnownTrigger(card);
 if(!gate)return null;
 const found=extra(card,String(card?.effectJa||''));
 if(!found)return null;
 if(card?.raidFrame){
  const features=found.program?.raidFeatures;
  if(!Array.isArray(features)||!features.length||features.some(feature=>!raidBoxListed(card.id,feature)))
   return null;
 }
 if(gate.triggerEffect&&found.allowTrigger!==true)return null;
 const {allowTrigger,...body}=found;
 return gate.triggerEffect?{...body,triggerEffect:gate.triggerEffect}:body;
}

export function mgs2EngineKind(card){
 return mgs2Profile(card)?.kind||null;
}
