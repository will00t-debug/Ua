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
const COLOR_OUTSIDE=norm('【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。');
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
 if(card.trigger==='color')return triggerText===COLOR_REST||triggerText===COLOR_RETIRE||
  triggerText===COLOR_OUTSIDE;
 if(card.trigger==='raid')return triggerText===norm(
  '【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。');
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
 const MISATO='葛\u{E0100}城 ミサト';
 if(card.type==='event'&&effect===norm(
  '自分の場のキャラを1枚選び、アクティブにする。選んだキャラが〈綾波 レイ〉の場合、自分のAPカードを1枚まで選び、アクティブにする。自分の場に黄以外の〈碇 シンジ〉がある場合、カードを1枚引く。'))
  return onPlay({op:'activeOwnThenFollow',ifName:'綾波 レイ',thenAp:1,
   drawIf:{name:'碇 シンジ',colorExcept:'yellow'}});
 if(card.type==='character'&&effect===norm(
  '【登場時】自分の手札か場外から必要エナジーが2以下の紫の〔〈アヤナミレイ（仮称）〉か〈渚 カヲル〉かフィールドカード〕を1枚まで自分の場にレストで登場させる。場外から登場させた場合、自分の手札を1枚場外に置く。'))
  return onPlay({op:'deployOrFilterRest',color:'purple',maxEnergy:2,optional:true,
   names:['アヤナミレイ（仮称）','渚 カヲル'],orType:'field',
   zones:['hand','outside'],outsideDiscard:true});
 if(card.type==='character'&&card.trigger==='get'&&effect===norm(
  '【レイド】〈渚 カヲル〉アクティブにし、フロントLに移動できる\n【登場時】カードを1枚引く。自分か相手の場のカードを1枚まで選び、そのカードの下にあるカードを全て場外に置く。'))
  return dsl({raidName:'渚 カヲル',effects:{onPlay:[
   {op:'draw',count:1},{op:'stripAllUnder',optional:true}
  ]}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈アヤナミレイ（仮称）〉アクティブにし、フロントLに移動できる\n【自分のターン中】このキャラはBP+500。\n【登場時】カードを2枚引き、自分の手札を2枚場外に置く。\n【退場時】自分の手札を1枚場外に置いてもよい。そうした場合、このカードを自分の場にレストで登場させる。'))
  return dsl({raidName:'アヤナミレイ（仮称）',ownTurnBp:500,effects:{
   onPlay:[{op:'drawDiscard',count:2,discardCount:2}],
   onRetire:[{op:'optionalDiscardReenterRest'}]
  }});
 if(card.type==='character'&&effect===norm(
  '【起動メイン】【レストにする】 【このカードを退場させる】自分の場の必要エナジーが5以上の紫のキャラを1枚まで選び、このターン中、【インパクト（1）】か【ダメージ（2）】を与える。'))
  return dsl({mainAbility:{op:'restRetireThen',then:[{
   op:'grantImpactOrDamage',optional:true,color:'purple',minEnergy:5,impact:1,damage:2
  }]}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈葛城 ミサト〉アクティブにし、フロントLに移動できる\n【登場時】このキャラはこのターン中、「相手はこのキャラのアタックを可能ならブロックしなければならない。」を得る。\n【退場時】自分の山札の上から5枚見る。その中から必要エナジーが5以上のカードを2枚まで公開し手札に加える。残りを望む順で山札の下に置く。'))
  return dsl({raidName:MISATO,effects:{
   onPlay:[{op:'grantSelfMustBlockThisTurn'}],
   onRetire:[{op:'searchTopUpToTwoBottom',count:5,max:2,rest:'bottom',logic:'all',filters:[
    {field:'printedRequiredEnergyAtLeast',value:5}
   ]}]
  }});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【アタック時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが3以下で消費APが1の紫の〈碇 シンジ〉を1枚まで自分の場にレストで登場させる。'))
  return dsl({effects:{onAttack:[{op:'discardGate',optional:true,then:[{
   op:'deployOutsideNameRest',name:'碇 シンジ',color:'purple',maxEnergy:3,ap:1,
   includeRaid:true,optional:true
  }]}]}});
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  '『BP3000以下』の相手のフロントLのキャラを1枚選び、退場させる。カードを1枚引き、自分の手札を1枚場外に置く。自分の場に〈碇 シンジ〉か〈エヴァンゲリオン初号機（ガイウスの槍）〉がある場合、『BP5000以下』に代わる。'))
  return dsl({triggerEffect:SPECIAL_EFFECT,effects:{onPlay:[
   {op:'retireOppFrontUnderBp',bp:3000,bonusBp:5000,
    bonusNames:['碇 シンジ','エヴァンゲリオン初号機（ガイウスの槍）']},
   {op:'drawDiscard',count:1}
  ]}});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n【起動メイン】【ターン1】自分の場外に必要エナジーが異なる赤の〈綾波 レイ〉が2種類以上ある場合のみ発動できる。このキャラは次の自分のターン開始時まで、発生エナジー+【赤】。'))
  return dsl({impactNull:true,mainAbility:{
   op:'distinctNameEnergyPlus',oncePerTurn:true,name:'綾波 レイ',color:'red',minKinds:2,amount:1
  }});
 if(card.type==='character'&&norm(card.triggerTextJa)===COLOR_RETIRE&&effect===norm(
  '【起動メイン】【場外にある場合】 【手札を2枚場外に置く】 【APを1支払う】このカードの必要エナジーを満たしている場合のみ発動できる。場外のこのカードを自分の場にレストで登場させる。\n【登場時】このキャラと別のラインにある自分のキャラを1枚選び、このキャラと位置を入れ替えてもよい。'))
  return dsl({
   triggerEffect:{op:'retireOppFrontUnderBp',bp:2500},
   outsideActivate:{hand:2,ap:1,ready:false},
   effects:{onPlay:[{op:'maySwapOwnFrontEnergy',optional:true,withSelf:true}]}
  });
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【レイド】〈真希波・マリ・イラストリアス〉アクティブにし、フロントLに移動できる\n【登場時】自分の場に【トリガー】を持たないカードが4枚以上ある場合、カードを1枚引く。\n【退場時】相手のフロントLのキャラを1枚まで選び、レストにする。'))
  return dsl({raidName:'真希波・マリ・イラストリアス',effects:{
   onPlay:[{op:'drawIfOwnTriggerlessAtLeast',min:4,count:1}],
   onRetire:[{op:'restOppFrontOne',optional:true}]
  }});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈式波・アスカ・ラングレー〉アクティブにし、フロントLに移動できる\n【登場時】自分の手札から必要エナジーが『0』以下の【トリガー】を持たない赤のキャラカードを1枚まで自分の場にレストで登場させる。自分の場の【トリガー】を持たないカード1枚につき、この効果で登場させるキャラの必要エナジーの範囲+1。自分の場に【トリガー】を持たないカードが4枚以上ある場合、カードを2枚引き、自分の手札を1枚場外に置く。'))
  return dsl({raidName:'式波・アスカ・ラングレー',effects:{onPlay:[
   {op:'deployHandRestScaled',color:'red',type:'character',noTrigger:true,
    baseEnergy:0,perTriggerless:1,optional:true},
   {op:'drawDiscard',count:2,discardCount:1,when:{
    kind:'ownTriggerlessAtLeast',turn:'any',min:4,zone:'field'}}
  ]}});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【相手のターン中】自分のライフエリアから【トリガー】を持たないカードが場外に置かれた時、このキャラをこのターン中、BP+2000してもよい。〈式波・アスカ・ラングレー〉のこの効果は1ターンに1回のみ発動できる。'))
  return dsl({lifeLeave:{turn:'opponent',noTrigger:true,once:'name',mayBp:2000}});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【相手のターン中】自分のライフエリアから【トリガー】を持たないカードが場外に置かれた時、自分の場に【トリガー】を持たないカードが4枚以上ある場合、アクティブのこのキャラをレストにしてもよい。そうした場合、場外に置かれたそのカードを1枚まで手札に加える。〈真希波・マリ・イラストリアス〉のこの効果は1ターンに1回のみ発動できる。\n【登場時】カードを1枚引き、自分の手札を1枚場外に置く。'))
  return dsl({
   lifeLeave:{turn:'opponent',noTrigger:true,once:'name',minTriggerless:4,
    restSelf:true,recoverLeft:true},
   effects:{onPlay:[{op:'drawDiscard',count:1}]}
  });
 if(card.type==='event'&&effect===norm(
  '自分の場の【レイド】を持ち、レイド状態でないキャラを1枚選び、アクティブにし、このターン中、BP+1000と【狙い撃ち】（相手のフロントLのキャラを指定してアタックでき、指定した場合、相手はブロックできない）を与える。'))
  return onPlay({op:'activeUnraidedRaidGrant',bp:1000,sniper:true});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈碇 シンジ〉アクティブにし、フロントLに移動できる\n【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）\n【アタック時】自分のエナジーLのアクティブのカードを望む枚数レストにする。この効果でレストにしたカードの必要エナジーの合計により、このキャラはこのターン中、以下の効果を全て得る。\n・4以上：BP+3000。\n・8以上：【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）'))
  return dsl({raidName:'碇 シンジ',printedImpact:1,effects:{onAttack:[{
   op:'restEnergySumGrant',thresholds:[
    {min:4,bp:3000},{min:8,damage:2}
   ]
  }]}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈綾波 レイ〉アクティブにし、フロントLに移動できる\n【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）\n【退場時】カードを2枚引く。その後、自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが1以下で赤の〈綾波 レイ〉を1枚まで自分の場にレストで登場させる。'))
  return dsl({raidName:'綾波 レイ',readyOnBlockCount:1,effects:{onRetire:[
   {op:'draw',count:2},
   {op:'discardGate',optional:true,then:[{
    op:'deployOutsideNameRest',name:'綾波 レイ',color:'red',maxEnergy:1,
    includeRaid:true,optional:true
   }]}
  ]}});
 if(card.type==='event'&&effect===norm(
  '自分の場の〈碇 シンジ〉かカード名に「初号機」を含むキャラを1枚まで選び、次の自分のターン開始時まで、BP+3000。自分の場のアクティブの〈綾波 レイ〉を1枚レストにしてもよい。そうした場合、カードを1枚引く。'))
  return plays([
   {op:'buffNameOrIncludesUntilNext',optional:true,name:'碇 シンジ',includes:'初号機',bp:3000},
   {op:'optionalRestNamedActiveDraw',name:'綾波 レイ'}
  ]);
 if(card.type==='character'&&effect===norm(
  '自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを【紫×2】減らす。\n【起動メイン】【レストにする】このカードを裏向きで自分の場の〈エヴァンゲリオン第13号機〉の下に置く。そうした場合、カードを2枚引き、自分の手札を1枚場外に置く。'))
  return dsl({emptyOwnFieldHandEnergyDiscount:2,mainAbility:{
   op:'restTuckUnderName',name:'エヴァンゲリオン第13号機',
   then:[{op:'drawDiscard',count:2,discardCount:1}]
  }});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  'このキャラがレイドされた時、以下から1つ選ぶ。（レイドしたキャラの【登場時】とこの効果は望む順で処理する）\n・カードを1枚引く。\n・相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。'))
  return dsl({effects:{onRaided:[{op:'chooseOne',optional:false,options:[
   {id:'draw',label:'カードを1枚引く',turn:'any',then:[{op:'draw',count:1}]},
   {id:'down',label:'相手の前排BP-1000',turn:'any',then:[
    {op:'enemyBpDown',bp:1000,optional:true}
   ]}
  ]}]}});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n【相手のターン中】このキャラは移動せず、手札に戻らず、BPをマイナスする効果を受けない。'))
  return dsl({impactNull:true,oppTurnWard:true});
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '自分のターン開始時、このキャラの下に裏向きのカードが3枚以上ある場合、このキャラを退場させる。\n【自分のターン中】このキャラの下の裏向きのカード1枚につき、このキャラはBP+500。\n【アタック時】自分の山札の上から1枚を裏向きでこのキャラの下に置く。'))
  return dsl({
   bpPerDirectFacedown:{amount:500,turn:'own'},
   phaseEffects:[{phase:'start',edge:'start',turn:'own',then:[
    {op:'retireSelfIfFacedownAtLeast',min:3}
   ]}],
   effects:{onAttack:[{op:'tuckFacedownUnder',from:'deckTop',host:'self',count:1,optional:false}]}
  });
 if(card.type==='character'&&card.trigger==null&&effect===norm(
  '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n【登場時】自分の場のカードの下の裏向きのカードを1枚まで場外に置く。\n【起動メイン】【エナジーLにある場合】このキャラをフロントLに移動させる。'))
  return dsl({impactNull:true,effects:{onPlay:[{op:'stripAnyOwnFacedown',optional:true}]},
   mainAbility:{op:'moveSelfEnergyToFront'}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈碇 シンジ〉/〈渚 カヲル〉アクティブにし、フロントLに移動できる\n【自分のターン中】自分の場外にあるカードの枚数により、このキャラは以下の効果を全て得る。\n・13枚以上：BP+1000と【ダメージ（2）】\n・26枚以上：BP+1000と【インパクト（4）】\n【起動メイン】【フロントLにある場合】 【ターン1】自分の場のカードの下の裏向きのカードを1枚場外に置く。そうした場合、カードを1枚引く。'))
  return dsl({raidName:'碇 シンジ',raidBaseNames:['碇 シンジ','渚 カヲル'],
   outsideCountGrants:[
    {min:13,turn:'own',bp:1000,attackDamage:2},
    {min:26,turn:'own',bp:1000,impact:4}
   ],
   mainAbility:{op:'stripFacedownThenDraw',oncePerTurn:true,frontOnly:true}});
 if(card.type==='character'&&card.trigger==='color'&&norm(card.triggerTextJa)===COLOR_OUTSIDE&&effect===norm(
  '【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+500。\n【起動メイン】【エナジーLにある場合】自分のエナジーLのレストの〈碇 シンジ〉を1枚選び、アクティブにする。そうした場合、このキャラをアクティブにする。〈渚 カヲル〉のこの効果は1ターンに1回のみ発動できる。'))
  return dsl({triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true},
   mainAbility:{op:'restSelfBuffOther',bp:500},
   energyWakeNamed:{name:'碇 シンジ',once:'name'}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈真希波・マリ・イラストリアス〉アクティブにし、フロントLに移動できる\nこのキャラの下の裏向きのカード1枚につき、このキャラはBP+500。\n【登場時】カードを2枚引き、自分の手札を1枚場外に置く。\n【起動メイン】【フロントLにある場合】 【ターン1】相手のフロントLのキャラを1枚選び、このターン中、BP-1000。この効果で相手のキャラのBPが0以下になった場合、自分の山札の上から1枚まで裏向きでこのキャラの下に置く。'))
  return dsl({raidName:'真希波・マリ・イラストリアス',
   bpPerDirectFacedown:{amount:500,turn:'any'},
   effects:{onPlay:[{op:'drawDiscard',count:2,discardCount:1}]},
   mainAbility:{op:'frontBpDownThenTuck',bp:1000,oncePerTurn:true,frontOnly:true}});
 if(card.type==='character'&&card.trigger==='color'&&norm(card.triggerTextJa)===COLOR_OUTSIDE&&effect===norm(
  '【起動メイン】【ターン1】このキャラが登場したターン中のみ発動できる。自分の場の［特徴：WILLE］を1枚選び、このターン中、「このキャラがアタックしてブロックされなかった時、カードを1枚まで引く。」を与える。'))
  return dsl({triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true},
   mainAbility:{op:'entryTurnGrantUnblockedDraw',trait:'WILLE',oncePerTurn:true}});
 if(card.type==='field'&&card.trigger==='get'&&effect===norm(
  '【登場時】自分の山札の上から2枚を裏向きでこのフィールドの下に置く。\n【起動メイン】【レストにする】このフィールドの下に裏向きのカードがない場合のみ発動できる。このフィールドを退場させる。\n【退場時】自分の場外からキャラカードを1枚まで手札に加える。自分のターン中の場合、自分の手札を1枚場外に置いてもよい。そうした場合、自分のAPカードを1枚まで選び、アクティブにする。'))
  return dsl({effects:{
   onPlay:[{op:'tuckFacedownUnder',from:'deckTop',host:'self',count:2,optional:false}],
   onRetire:[
    {op:'recoverOutsideAny',zone:'outside',max:1,optional:true,anyOf:[{field:'type',value:'character'}]},
    {op:'ownTurnHandOutsideActiveAp'}
   ]
  },mainAbility:{op:'restRetireIfClearUnder'}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈綾波 レイ〉アクティブにし、フロントLに移動できる\n【起動メイン】【フロントLにある場合】 【このカードを退場させる】相手のフロントLのキャラを1枚まで選び、退場させる。このターン中、次に手札から使用する〈碇 シンジ〉かカード名に「初号機」を含むキャラカードの必要エナジーを【赤×1】減らし、消費APを-1する。\n【退場時】カードを2枚引く。'))
  return dsl({raidName:'綾波 レイ',
   mainAbility:{op:'retireSelfGrantNextPlay',frontOnly:true,name:'碇 シンジ',includes:'初号機',
    color:'red',energy:1,ap:1},
   effects:{onRetire:[{op:'draw',count:2}]}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm(
  '【レイド】〈真希波・マリ・イラストリアス〉アクティブにし、フロントLに移動できる\n【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）\n【ターン1】このキャラのアタック終了時、相手のフロントLにキャラがある場合、自分の手札の【トリガー】を持たないカードを2枚場外に置いてもよい。そうした場合、このキャラをアクティブにし、このターン中、BP+3000。'))
  return dsl({raidName:'真希波・マリ・イラストリアス',printedAttackDamage:2,
   phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[
    {op:'optionalTriggerlessHandActive',count:2,bp:3000}
   ]}]});
 if(card.type==='event'&&card.trigger==='special'&&effect===norm(
  'このカードは自分の場に〈碇 シンジ〉かカード名に「初号機」を含むキャラがある場合のみ使用できる。\nBP5000以下の相手のフロントLのキャラを1枚選び、退場させる。自分の場外の〈綾波 レイ〉を1枚まで、裏向きのカードが下にない自分の場の〈碇 シンジ〉の下に裏向きで置く。'))
  return dsl({triggerEffect:SPECIAL_EFFECT,
   playRequiresNameOrIncludes:{name:'碇 シンジ',includes:'初号機'},
   effects:{onPlay:[
    {op:'retireOppFrontUnderBp',bp:5000},
    {op:'tuckOutsideUnderNamedHost',name:'綾波 レイ',host:'碇 シンジ',optional:true,
     hostNeedsEmptyUnder:true}
   ]}});
 if(card.type==='character'&&card.trigger==='get'&&effect===norm("自分か相手の効果やバトルによってこのキャラが場を離れた時、自分の手札を1枚場外に置いてもよい。そうした場合、自分の場外から必要エナジーが2以下の黄の〈綾波 レイ〉を1枚まで自分の場にアクティブで登場させる。"))
  return dsl({fieldLeaveThenDeploy:{color:'yellow',name:'綾波 レイ',maxEnergy:2,ready:true}});
 if(card.type==='character'&&card.trigger==='get'&&effect===norm("【相手のターン中】自分が必要エナジーを満たしているキャラカードの【ゲット】を発動する場合、代わりにそのカードを自分の場にレストで登場させてもよい。そうした場合、自分の手札を1枚場外に置く。〈葛󠄀城 ミサト〉のこの効果は1ターンに1回のみ発動できる。"))
  return dsl({getInsteadRestDeploy:{once:'name'}});
 if(card.type==='character'&&card.trigger==='get'&&effect===norm("【登場時】このキャラをアクティブにし、以下から1つ選ぶ。\n・相手のフロントLのキャラを1枚まで選び、レストにする。\n・自分のターン中の場合、自分の場のキャラを1枚退場させてもよい。そうした場合、BP5000以下の相手のフロントLのキャラを1枚まで選び、退場させ、このターン中、次に手札から使用する必要エナジーが2以下の黄のキャラカードの消費APを-1する。\n【起動メイン】【手札を2枚場外に置く】 【ターン1】このキャラはこのターン中、BP+1000と【インパクト（1）】を得る。"))
  return dsl({effects:{onPlay:[
   {op:'activeSelf'},
   {op:'chooseOne',optional:false,options:[
    {id:'rest',label:'使對方前線最多 1 張角色休息',turn:'any',then:[{op:'restOppFrontOne',optional:true}]},
    {id:'retire',label:'退場自己 1 張，再退場對方並減少下次費用',turn:'own',then:[{op:'optionalOwnRetireFrontDiscount',then:[
     {op:'retireOppFrontOneUnderBp',bp:5000,optional:true},
     {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'character',color:'yellow',printedRequiredEnergyAtMost:2}}
    ]}]}
   ]}
  ]},mainAbility:{op:'payHandSelfKit',hand:2,oncePerTurn:true,bp:1000,impact:1}});
 if(card.type==='character'&&card.trigger==='get'&&effect===norm("【相手のターン中】【フロントLにある場合】自分の【ドロートリガー】か【アクティブ】を発動する場合、代わりに【ゲット】にしてもよい。\n【アタック時】APを1支払ってもよい。そうした場合、カードを1枚引き、〈真希波・マリ・イラストリアス〉以外の自分の場のキャラを1枚まで選び、アクティブにする。"))
  return dsl({triggerSwapToGet:{turn:'opp',line:'front',from:['draw','active']},
   effects:{onAttack:[{op:'optionalPayApThen',ap:1,optional:true,then:[
    {op:'draw',count:1},
    {op:'activeOwnExceptName',name:'真希波・マリ・イラストリアス',optional:true,max:1}
   ]}]}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm("【レイド】〈碇 シンジ〉アクティブにし、フロントLに移動できる\n【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）\n【登場時】カードを1枚引き、自分の手札から消費APが1で【レイド】を持たない紫のキャラカードを1枚まで自分の場にアクティブで登場させる。\n【起動メイン】【フロントLにある場合】 【ターン1】自分のフロントLの他のキャラを1枚退場させる。そうした場合、このキャラの【登場時】を発動する。"))
  return dsl({raidName:'碇 シンジ',printedImpact:1,effects:{onPlay:[
   {op:'draw',count:1},
   {op:'deployOwnHandActiveNoRaid',type:'character',color:'purple',ap:1,optional:true}
  ]},mainAbility:{op:'retireOtherFrontReplay',oncePerTurn:true,frontOnly:true}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm("【レイド】〈式波・アスカ・ラングレー〉アクティブにし、フロントLに移動できる\nこのキャラが退場する場合、代わりにレイド状態の上のこのカードを場外に置いてもよい。\n【登場時】相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。"))
  return dsl({raidName:'式波・アスカ・ラングレー',raidTopRetireInstead:true,
   effects:{onPlay:[{op:'enemyBpDown',bp:1000,optional:true}]}});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm("【レイド】〈式波・アスカ・ラングレー〉アクティブにし、フロントLに移動できる\nこのキャラのアタック終了時、自分の場外の［特徴：WILLE］を4枚リムーブエリアに置いてもよい。そうした場合、このキャラをアクティブにし、このキャラはこのターン中、BP+3000と「このキャラはBP3000以下のキャラにブロックされない。」を得て、このキャラのレイド元のカードを場外に置く。\n【登場時】相手のフロントLに元々のBPよりBPが低いキャラが2枚以上ある場合、このキャラはこのターン中、【2回アタック】を得る。"))
  return dsl({raidName:'式波・アスカ・ラングレー',effects:{onPlay:[
   {op:'grantDoubleAttackIfOppBelowPrinted',min:2}
  ]},phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[
   {op:'optionalRemoveTraitKit',trait:'WILLE',count:4,bp:3000,blockAtMost:3000,sendBase:true}
  ]}]});
 if(card.type==='character'&&card.trigger==='raid'&&effect===norm("【レイド】〈碇 シンジ〉アクティブにし、フロントLに移動できる\nこのキャラの下の裏向きのカードの枚数により、このキャラは以下の効果を得る。\n・0枚：【自分のターン中】このキャラはBP+5000と【インパクト（3）】\n・4枚以上：このキャラは、相手のトリガーの効果で選ばれない。\nこのキャラのアタック終了時、このキャラの下の裏向きのカードを見て、2枚まで公開し手札に加える。2枚手札に加えた場合、このキャラをアクティブにする。\n【登場時】自分の場外から赤の〈綾波 レイ〉を各必要エナジーにつき1枚までこのキャラの下に裏向きで置く。"))
  return dsl({raidName:'碇 シンジ',facedownCountGrants:[{count:0,turn:'own',bp:5000,impact:3}],
   facedownTriggerImmuneAt:4,phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[
    {op:'revealFacedownUpTo',count:2,activateIf:2}
   ]}],effects:{onPlay:[{op:'tuckOutsideNamedPerEnergy',color:'red',name:'綾波 レイ'}]}});
 return pending();
}
