// EVA programs are shared Universal V2 DSL chosen from the full Japanese
// print. A sentence stays out until its shared ability exists.
const norm=text=>String(text??'').replace(/\s+/g,'');
const EMPTY=new Set(['','-']);
const INK={yellow:'黄',purple:'紫',red:'赤',blue:'青',green:'緑'};
const STANDARD=Object.freeze({
 '':null,
 '【ドロー】カードを1枚引く。':'draw',
 '【ゲット】このカードを手札に加える。':'get',
 '【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。':'active',
 '【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。':'final'
});
const SPECIAL_TRIGGER=norm('【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。');
const SPECIAL_EFFECT={op:'retireOppFront'};
const COLOR_REST=norm('【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。');
const COLOR_RETIRE=norm('【カラー】BP2500以下の相手のフロントLのキャラを1枚選び、退場させる。');
const DISCOUNT=Object.freeze({
 yellow:Object.freeze({
  text:'相手の場に紫か赤のカードがある場合、手札にあるこのカードの必要エナジーを【黄×1】減らす。',
  colors:Object.freeze(['purple','red'])
 }),
 purple:Object.freeze({
  text:'相手の場に黄か赤のカードがある場合、手札にあるこのカードの必要エナジーを【紫×1】減らす。',
  colors:Object.freeze(['yellow','red'])
 }),
 red:Object.freeze({
  text:'相手の場に黄か紫のカードがある場合、手札にあるこのカードの必要エナジーを【赤×1】減らす。',
  colors:Object.freeze(['yellow','purple'])
 })
});
export const EVA_SHARED_BLOCKER='完整印刷效果尚未對上既有共通 DSL，不進入對戰包。';

function pending(){
 return {ready:false,blocker:EVA_SHARED_BLOCKER};
}
function dsl(extra){
 return {ready:true,implementation:'dsl',effects:{},...extra};
}
function onPlay(op){
 return dsl({effects:{onPlay:[op]}});
}
function plays(ops){
 return dsl({effects:{onPlay:ops}});
}
function triggerAllowed(card){
 const triggerText=norm(card.triggerTextJa);
 if(card.trigger==='special')return triggerText===SPECIAL_TRIGGER;
 if(card.trigger==='color')return triggerText===COLOR_REST||triggerText===COLOR_RETIRE;
 return Object.prototype.hasOwnProperty.call(STANDARD,triggerText)&&
  STANDARD[triggerText]===card.trigger;
}

export function evaSharedProgram(card){
 if(!card||card.title!=='eva'||card.deckLegal!==true||card.type==='action-point')return pending();
 if(!triggerAllowed(card))return pending();
 const effect=norm(card.effectJa);
 const ink=INK[card.color];
 if(!ink)return pending();
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
 if(card.type==='character'&&effect==='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。')
  return onPlay({op:'bounceOwnOtherUnderEnergy',energy:1});
 if(card.type==='character'&&effect==='【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。')
  return onPlay({op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true});
 if(card.type==='character'&&effect==='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）')
  return dsl({step:true});
 if(card.type==='character'&&effect==='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）')
  return dsl({impactNull:true});
 const discount=DISCOUNT[card.color];
 if(card.type==='character'&&discount&&effect===norm(discount.text))
  return dsl({opponentFieldColorsHandEnergyDiscount:{colors:[...discount.colors],amount:1}});
 if(card.type==='event'&&effect==='自分のAPカードを2枚まで選び、アクティブにする。')
  return onPlay({op:'recoverAp',count:2});
 if(card.type==='character'&&effect==='【退場時】カードを1枚引く。')
  return dsl({effects:{onRetire:[{op:'draw',count:1}]}});
 if(card.type==='character'&&effect==='【自分のターン中】このキャラはBP+1000。【登場時】カードを1枚引く。')
  return dsl({ownTurnBp:1000,effects:{onPlay:[{op:'draw',count:1}]}});
 if(card.type==='character'&&effect===norm(
  '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n【登場時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。'))
  return dsl({impactNull:true,effects:{onPlay:[{
   op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,
   optional:true,excludeSelf:false
  }]}});
 if(card.type==='character'&&effect==='【登場時】自分の場のキャラを1枚まで選び、このターン中、【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を与える。')
  return onPlay({
   op:'grantOtherImpactThisTurn',anyOther:true,includeSelf:true,amount:1,optional:true
  });
 if(card.type==='event'&&card.trigger==='special'&&effect==='『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈式波・アスカ・ラングレー〉がある場合、『BP5000以下』に代わる。')
  return dsl({triggerEffect:SPECIAL_EFFECT,effects:{onPlay:[{
   op:'retireOppFrontUnderBp',bp:3000,bonusName:'式波・アスカ・ラングレー',bonusBp:5000
  }]}});
 if(card.type==='character'&&effect===norm('【登場時】自分の山札の上から4枚見る。その中から〈碇 シンジ〉か〈エヴァンゲリオン第13号機〉か〈リリス〉を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay({
   op:'searchTopOneBottomDiscard',count:4,logic:'any',filters:[
    {field:'name',value:'碇 シンジ'},
    {field:'name',value:'エヴァンゲリオン第13号機'},
    {field:'name',value:'リリス'}
   ]
  });
 if(card.type==='character'&&effect==='【起動メイン】【レストにする】自分の手札の［特徴：WILLE］を1枚場外に置く。そうした場合、カードを1枚引く。')
  return dsl({mainAbility:{op:'restTraitHandOutsideDraw',trait:'WILLE',draw:1}});
 if(card.type==='character'&&effect===norm(
  '【起動メイン】【フロントLにある場合】 【ターン1】自分の手札の［特徴：WILLE］を1枚場外に置く。そうした場合、相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。'))
  return dsl({mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{
    op:'discardGate',optional:false,
    payment:{zone:'hand',field:'trait',value:'WILLE'},
    then:[{op:'enemyBpDown',bp:1000,optional:true}]
   }]
  }});
 if(card.type==='character'&&effect==='【登場時】自分の山札の上から3枚見る。その中から［特徴：WILLE］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。')
  return onPlay({op:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:'WILLE'}});
 if(card.type==='event'&&effect==='自分のフロントLのアクティブのキャラを1枚レストにする。そうした場合、カードを3枚引く。')
  return onPlay({op:'restNamedActiveFrontThenDraw',draw:3});
 if(card.type==='event'&&card.trigger==='special'&&effect==='相手のフロントLのキャラを1枚まで選び、このターン中、BP-3000。相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。')
  return dsl({triggerEffect:SPECIAL_EFFECT,effects:{onPlay:[
   {op:'enemyBpDown',bp:3000,optional:true},
   {op:'enemyBpDown',bp:1000,optional:true}
  ]}});
 if(card.type==='event'&&effect==='相手のフロントLのキャラを1枚選び、このターン中、BP-1000。自分のAPカードを1枚まで選び、アクティブにする。')
  return plays([
   {op:'enemyBpDown',bp:1000},
   {op:'recoverAp',count:1}
  ]);
 if(card.type==='character'&&effect==='【登場時】自分の山札の上から3枚見る。その中から1枚まで場外に置き、残りを望む順で山札の上に置く。')
  return onPlay({op:'inspectTopAnyOutside',count:3,rest:'top',maxOutside:1});
 if(card.type==='character'&&effect==='【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で山札の上に置き、残りを場外に置く。')
  return onPlay({op:'inspectTopAnyOutside',count:2,rest:'top'});
 if(card.type==='character'&&effect==='【登場時】自分の山札の上から1枚見る。そのカードを山札の上か場外に置く。')
  return onPlay({op:'peekTopOrOutside'});
 if(card.type==='character'&&effect==='【起動メイン】【レストにする】自分の山札の上から1枚を場外に置く。')
  return dsl({mainAbility:{op:'restSelfThen',frontOnly:false,then:[{op:'millTop',count:1}]}});
 if(card.type==='character'&&effect==='【起動メイン】【レストにする】カードを1枚引き、自分の手札を1枚場外に置く。')
  return dsl({mainAbility:{op:'restSelfThen',frontOnly:false,then:[{op:'drawDiscard',count:1}]}});
 if(card.type==='character'&&card.color==='red'&&effect===norm(
  '自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【赤×2】減らす。\n【登場時】自分の山札の上から1枚見る。そのカードを山札の上か場外に置く。'))
  return dsl({emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[{op:'peekTopOrOutside'}]}});
 if(card.type==='character'&&effect===norm(
  '【登場時】以下から1つ選ぶ。\n・自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。\n・自分の場のキャラを1枚まで選び、別のラインに移動させる。'))
  return onPlay({
   op:'chooseOne',optional:false,options:[
    {id:'buff',label:'他のキャラをBP+1000',turn:'any',then:[{
     op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,
     optional:true,excludeSelf:true
    }]},
    {id:'shift',label:'キャラを別のラインへ',turn:'any',then:[{op:'mayShiftOwnCharacter'}]}
   ]
  });
 if(card.type==='character'&&effect===norm(
  '【登場時】カードを1枚引き、自分の手札を1枚場外に置く。\n【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。'))
  return dsl({
   effects:{onPlay:[{op:'drawDiscard',count:1}]},
   mainAbility:{op:'restSelfBuffOther',bp:1000}
  });
 if(card.type==='character'&&norm(card.triggerTextJa)===COLOR_REST&&effect===norm(
  '【登場時】自分の山札の上から4枚見る。その中から【ゲット】を持つキャラカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return dsl({triggerEffect:{op:'restOppFrontSkipNextActive'},effects:{onPlay:[{
   op:'searchTopOneBottomDiscard',count:4,logic:'all',filters:[
    {field:'trigger',value:'get'},{field:'type',value:'character'}
   ]
  }]}});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【登場時】自分の山札の上から3枚見る。その中からカード名に「2号機」を含むキャラカードか【トリガー】を持たないキャラカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'))
  return onPlay({op:'searchTopOneBottomDiscard',count:3,groups:[
   {logic:'all',filters:[{field:'nameIncludes',value:'2号機'},{field:'type',value:'character'}]},
   {logic:'all',filters:[{field:'noTrigger',value:true},{field:'type',value:'character'}]}
  ]});
 if(card.type==='character'&&effect===norm(
  '【自分のターン中】このターン中に自分の場に【ゲット】を持つキャラが登場している場合、このキャラはBP+1000。'))
  return dsl({passiveBonuses:[{condition:{
   kind:'ownTriggerEnteredThisTurn',turn:'own',trigger:'get'
  },bp:1000}]});
 if(card.type==='character'&&norm(card.triggerTextJa)===COLOR_RETIRE&&effect===norm(
  '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n自分の場に【トリガー】を持たないカードが4枚以上ある場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。'))
  return dsl({
   triggerEffect:{op:'retireOppFrontUnderBp',bp:2500},impactNull:true,
   passiveBonuses:[{condition:{kind:'ownTriggerlessAtLeast',turn:'any',min:4,zone:'field'},impact:1}]
  });
 if(card.type==='event'&&effect===norm(
  'カードを2枚引く。自分の場に【トリガー】を持たないカードが4枚以上ある場合、さらにカードを1枚引く。'))
  return onPlay({op:'drawThenIfTriggerless',count:2,min:4,extra:1});
 if(card.type==='event'&&effect===norm('自分の場外から紫の〈碇 シンジ〉を1枚自分の場にレストで登場させる。'))
  return onPlay({
   op:'deployOutsideNameRest',name:'碇 シンジ',color:'purple',includeRaid:true,optional:false
  });
 if(card.type==='character'&&effect===norm(
  '【起動メイン】【レストにする】 【このカードを退場させる】自分の場の黄のキャラを1枚選び、アクティブにする。'))
  return dsl({mainAbility:{op:'restRetireThen',then:[{op:'activeOwnColor',color:'yellow'}]}});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【起動メイン】【レストにする】 【このカードを退場させる】自分の場外から〈碇 シンジ〉か［特徴：WILLE］を1枚手札に加える。'))
  return dsl({mainAbility:{op:'restRetireThen',then:[{
   op:'recoverOutsideOne',optional:false,logic:'any',filters:[
    {field:'name',value:'碇 シンジ'},{field:'trait',value:'WILLE'}
   ]
  }]}});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【登場時】自分の場の〈式波・アスカ・ラングレー〉を1枚退場させてもよい。そうした場合、このキャラをアクティブにし、カードを1枚引く。'))
  return onPlay({op:'optionalRetireOwnOtherThen',name:'式波・アスカ・ラングレー',then:[
   {op:'activeSelf'},{op:'draw',count:1}
  ]});
 if(card.type==='event'&&effect===norm(
  '相手のフロントLのキャラを1枚選び、レストにする。選んだキャラが【レイド】を持たない場合、カードを1枚引く。'))
  return onPlay({op:'restOppFrontOne',optional:false,drawIfNoRaid:true});
 if(card.type==='field'&&effect===norm(
  '【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが3以下の黄のキャラカードを1枚まで手札に加える。'))
  return onPlay({op:'discardGate',optional:true,then:[{
   op:'recoverOutsideFiltered',color:'yellow',type:'character',energyAtMost:3,optional:true,max:1
  }]});
 if(card.type==='field'&&card.trigger==null&&effect===norm(
  '【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、カードを2枚引く。\n【起動メイン】【レストにする】 【このカードを退場させる】カードを1枚引く。'))
  return dsl({
   effects:{onPlay:[{op:'discardGate',optional:true,then:[{op:'draw',count:2}]}]},
   mainAbility:{op:'restRetireThen',then:[{op:'draw',count:1}]}
  });
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【登場時】自分の山札の上から2枚見る。その中から【トリガー】を持たない赤のカードを1枚まで場外に置く。残りを望む順で山札の上に置く。'))
  return onPlay({op:'inspectTopTraitOutside',count:2,noTriggerColor:'red',rest:'top'});
 if(card.type==='character'&&card.color==='red'&&card.trigger==null&&effect===norm(
  '自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【赤×2】減らす。\n【登場時】自分の山札の上から1枚見て、見たカードが【トリガー】を持たないカードの場合、公開し手札に加えてもよい。手札に加えない場合、そのカードを山札の上に置く。'))
  return dsl({
   emptyOwnFieldHandEnergyDiscount:2,
   effects:{onPlay:[{op:'peekTopTriggerlessMayHand'}]}
  });
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  '『BP2000』以下の相手のフロントLのキャラを1枚選び、退場させる。自分の場の【トリガー】を持たないカード1枚につき、この効果で選べるキャラのBPの範囲+1000。'))
  return dsl({triggerEffect:SPECIAL_EFFECT,effects:{onPlay:[{
   op:'retireOppFrontUnderBp',bp:2000,triggerlessPer:1000
  }]}});
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  '『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈碇 シンジ〉かカード名に「初号機」を含むキャラがある場合、『BP5000以下』に代わる。'))
  return dsl({triggerEffect:SPECIAL_EFFECT,effects:{onPlay:[{
   op:'retireOppFrontUnderBp',bp:3000,bonusBp:5000,
   bonusNameOrIncludes:{name:'碇 シンジ',includes:'初号機'}
  }]}});
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  '自分の場に〈碇 シンジ〉か〈エヴァンゲリオン第13号機〉がある場合、手札にあるこのカードの消費APを-1する。\nBP5000以下の相手のフロントLのキャラを1枚選び、退場させる。'))
  return dsl({
   handApDiscountWhileAnyNames:{names:['碇 シンジ','エヴァンゲリオン第13号機'],amount:1},
   triggerEffect:SPECIAL_EFFECT,
   effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:5000}]}
  });
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の場の他のキャラを1枚退場させてもよい。そうした場合、以下から1つ選ぶ。\n・カードを2枚引く。\n・カードを1枚引き、自分の場のキャラを1枚まで選び、アクティブにする。'))
  return onPlay({op:'optionalRetireOwnOtherThen',then:[{
   op:'chooseOne',optional:false,options:[
    {id:'draw2',label:'カードを2枚引く',turn:'any',then:[{op:'draw',count:2}]},
    {id:'drawActive',label:'1枚引いてアクティブ',turn:'any',then:[
     {op:'draw',count:1},{op:'activeOwnOne',optional:true}
    ]}
   ]
  }]});
 if(card.type==='field'&&effect===norm(
  '【登場時】自分の山札の上から5枚見る。その中からカード名に「零号機」か「初号機」を含むキャラカードを1枚まで公開し手札に加える。残りを望む順で山札の下に置く。\n【起動メイン】【ターン1】自分のエナジーLのカードを1枚選び、アクティブにする。'))
  return dsl({
   effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:5,discard:false,groups:[
    {logic:'all',filters:[{field:'nameIncludes',value:'零号機'},{field:'type',value:'character'}]},
    {logic:'all',filters:[{field:'nameIncludes',value:'初号機'},{field:'type',value:'character'}]}
   ]}]},
   mainAbility:{op:'activeEnergyOnce',oncePerTurn:true}
  });
 if(card.type==='character'&&effect===norm(
  '手札と場外にあるこのカードの必要エナジーを【紫×2】減らす。\n【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n【自分のターン中】自分の場に必要エナジーが5以上の他のカードがある場合、このキャラはBP+1000。'))
  return dsl({
   handOutsideEnergyDiscount:2,impactNull:true,
   passiveBonuses:[{condition:{
    kind:'ownOtherCardEnergyAtLeast',turn:'own',minEnergy:5,min:1,zone:'field',excludeSelf:true
   },bp:1000}]
  });
 return pending();
}
