// B group owns this file. IMC-1-001 through IMC-1-050.
// A ready entry needs implementation 'dsl' or 'vanilla' and is included in
// the battle pack. Leave a card out until its printed sentences are a tested
// program. Do not set battleReady in the catalog. A printed effect cannot be vanilla.
// Life triggers of draw, active, get, final, and raid come from the catalog
// trigger field. Color and special triggers need triggerEffect.

const energyRetire={op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1};

function lookTrait(trait){
 return {op:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:trait}};
}

function vanilla(note){
 return {ready:true,implementation:'vanilla',notes:note};
}

export const IMC_PROGRAMS_001_050=Object.freeze({
 'IMC-1-001':{ready:true,implementation:'dsl',mainAbility:energyRetire,
  notes:'起動：レスト、ターン1。このターン発生エナジー+黄。メイン終了時退場。フロントとエナジーの両方。'},
 'IMC-1-002':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:1}]},
  notes:'登場時、必要エナジー1以下の他の自分のキャラを1枚手札へ。無ければ自分を戻す。'},
 'IMC-1-005':{ready:true,implementation:'dsl',activeExtraEnergy:1,
  notes:'活動時，這張卡的發生能量 +1（黃）。休息時不加。前線不產生能量。沒有生命觸發。'},
 'IMC-1-006':{ready:true,implementation:'dsl',emptyOwnFieldHandEnergyDiscount:2,
  mainAbility:{op:'onceBuffSelfWhen',oncePerTurn:true,bp:1000,
   when:{kind:'otherOwnCharacterBpAtLeast',turn:'any',zone:'field',excludeSelf:true,minBp:5000}},
  effects:{onAttack:[{op:'ifLiveThen',
   when:{kind:'selfCurrentBpAtLeast',turn:'any',minBp:5000},
   then:[{op:'revealTopTraitOptionalHand',trait:'BEYOND THE STARLIGHT'}]}]},
  notes:'空場時手牌必要能量 -黃2。其他自己角色目前 BP≥5000 時，每回合一次自己 BP+1000。攻擊時自己目前 BP≥5000 才公開牌頂；特徵相符可入手，否則只能放回頂或底。沒有生命觸發。'},
 'IMC-1-007':vanilla('効果欄は「-」。アクティブトリガーはカード表の trigger。'),
 'IMC-1-008':{ready:true,implementation:'dsl',
  mainAbility:{op:'restSelfBuffOther',bp:1000,trait:'BEYOND THE STARLIGHT'},
  notes:'休息自己，強制選另一張 BEYOND THE STARLIGHT，本回合 BP+1000。來源與對象分開。沒有每回合一次。抽牌觸發是卡表。'},
 'IMC-1-010':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:7,
   filter:{field:'colorAndType',value:'yellow:field'}}]},
  notes:'上から7枚見て黄のフィールドを1枚まで公開し手札。残りは下。加えたら手札を1枚場外。'},
 'IMC-1-013':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'buffOwnField',filter:{field:'trait',value:'BEYOND THE STARLIGHT'},
   bp:1000,optional:true,excludeSelf:true}]},
  notes:'登場時、他の BEYOND THE STARLIGHT を1枚まで、このターン BP+1000。'},
 'IMC-1-014':{ready:true,implementation:'dsl',
  effects:{onPlay:[lookTrait('BEYOND THE STARLIGHT')]},
  triggerEffect:{op:'restOppFrontSkipNextActive'},
  notes:'上から3枚、BEYOND THE STARLIGHT を1枚まで。カラートリガーは相手フロントをレストし次の1回アクティブにしない。'},
 'IMC-1-015':{ready:true,implementation:'dsl',
  effects:{onAttack:[{op:'ifLiveThen',
   when:{kind:'otherOwnCharacterBpAtLeast',turn:'any',zone:'field',excludeSelf:true,minBp:5000},
   then:[{op:'drawDiscard',count:1}]}]},
  notes:'攻擊時，其他自己角色的目前 BP≥5000 才抽 1 並強制棄 1。印刷 BP 不算。自己與對方的角色不算。活動觸發是卡表。'},
 'IMC-1-016':{ready:true,implementation:'dsl',raidName:'北条 加蓮',
  effects:{onPlay:[
   {op:'drawDiscard',count:1},
   {op:'recoverOutsideFiltered',optional:true,max:1,trait:'BEYOND THE STARLIGHT',energyAtMost:3}
  ]},
  mainAbility:{op:'frontPeekThenBuffOthers',frontOnly:true,oncePerTurn:true,
   minSelfBp:5000,highBp:7000,bp:1000},
  notes:'突襲框是北条 加蓮。登場抽 1 並強制棄 1，然後最多回收 1 張場外費用 3 以下的 BEYOND THE STARLIGHT。Q2229：剛棄掉的那張可以回收。前線、每回合 1 次、目前 BP≥5000 才看牌庫頂 1 張，放回頂部或場外。之後其他角色本回合 BP+1000；自己目前 BP≥7000 則改為全部。'},
 'IMC-1-017':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'peekTopOne'}]},
  notes:'登場時，私下看自己牌庫頂 1 張，放回頂部或放到場外。不是公開。'},
 'IMC-1-018':{ready:true,implementation:'dsl',
  effects:{onPlay:[lookTrait('ポジティブパッション')]},
  notes:'上から3枚、ポジティブパッションを1枚まで。アクティブトリガーはカード表。'},
 'IMC-1-019':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'draw',count:1}]},
  triggerEffect:{op:'restOppFrontSkipNextActive'},
  notes:'登場時に1枚引く。カラートリガーは014と同じ。'},
 'IMC-1-020':{ready:true,implementation:'dsl',raidName:'高森 藍子',
  mainAbility:{op:'restSelfThen',frontOnly:true,oncePerTurn:true,then:[
   {op:'raidOwnHandNamed',optional:true,max:1,requireAffordableEnergy:true,
    names:['本田 未央','日野 茜']}]},
  effects:{onPlay:[{op:'restOppFrontOne',optional:true,
   skipWhen:{kind:'selfOwnEffectRaid',turn:'any'}}]},
  notes:'突襲框是高森 藍子，登場後活動，能量區的底板可以移到前線。登場時最多休息 1 張對方前線；只有自己的效果突襲（Q2230，含對方回合的生命突襲）才讓選中的那張跳過下一次活動。付費突襲與普通登場不跳過。起動只在前線、休息自己、每回合一次，只突襲手牌中滿足能源的本田 未央或日野 茜，不提供休息登場。'},
 'IMC-1-021':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'drawDiscard',count:1}]},
  notes:'登場時、1枚引き、手札を1枚場外。ドロートリガーはカード表。'},
 'IMC-1-022':{ready:true,implementation:'dsl',
  mainAbility:{op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1},
  notes:'レスト、ターン1。他のアクティブなフロントを1枚レストした場合、このターン発生エナジー+黄。'},
 'IMC-1-023':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'yellow',energy:2,ap:null,
   max:1,trait:'ポジティブパッション',sourceLine:'front'}]},
  notes:'登場時，只有這張卡在前線才讓手牌中黃、費用 2 以下的積極熱情休息登場。sourceLine 是來源，不是登場目的地。アクティブトリガー是卡表。'},
 'IMC-1-024':{ready:true,implementation:'dsl',raidName:'日野 茜',impactNull:true,
  effects:{
   onPlay:[
    {op:'buffSelf',bp:1000},
    {op:'ifLiveThen',when:{kind:'selfOwnEffectRaid',turn:'any'},
     then:[{op:'grantSelfAttackDamageThisTurn',amount:2}]}
   ],
   onAttack:[
    {op:'draw',count:1},
    {op:'optionalPayApThen',ap:1,optional:true,firstOwnAttack:true,then:[
     {op:'raidOwnHandNamed',optional:true,max:1,requireAffordableEnergy:true,
      names:['本田 未央','高森 藍子']}]}
   ]
  },
  notes:'突襲框是日野 茜。衝擊無效。登場 BP+1000；只有自己的效果突襲才再獲得本回合傷害（2）（Q2233）。攻擊先抽 1。本回合自己角色第一次攻擊才可支付 1 AP，然後只突襲手牌中滿足能源的本田 未央或高森 藍子。'},
 'IMC-1-025':vanilla('効果欄は「-」。ドロートリガーはカード表の trigger。'),
 'IMC-1-026':{ready:true,implementation:'dsl',ownTurnBp:1000,
  notes:'自己回合 BP+1000。對方回合不加。前線與能量區都算。沒有生命觸發。'},
 'IMC-1-027':{ready:true,implementation:'dsl',
  passiveBonuses:[{extraEnergy:1,condition:{kind:'ownCardTraitCount',turn:'any',min:4,
   zone:'field',excludeSelf:false,trait:'ポジティブパッション'}}],
  notes:'場上ポジティブパッション達 4 張（含自己與場地）時，發生能量 +黃。休息也加。未滿 4、對方的角色、前線本身不產生能量。'},
 'IMC-1-028':{ready:true,implementation:'dsl',raidName:'本田 未央',printedImpact:1,
  effects:{onPlay:[{op:'choosePrintedOptions',max:2,optional:true,options:[
   {id:'bounce',label:'回手後休息登場或突襲',then:[{
    op:'bounceOwnOtherUnderEnergy',optional:true,energy:3,trait:'ポジティブパッション',
    then:[{op:'deployOwnHandRestOrRaid',type:'character',color:'yellow',ap:1,
     maxEnergy:30,max:1,optional:true,requireAffordableEnergy:true,
     names:['日野 茜','高森 藍子']}]}]},
   {id:'active',label:'活動積極熱情',when:{kind:'selfOwnEffectRaid',turn:'any'},
    then:[{op:'activeOwnTrait',optional:true,max:1,trait:'ポジティブパッション'}]}
  ]}]},
  notes:'突襲框是本田 未央。衝擊 1。登場最多選 2 個不同選項，依印刷順序結算。可回手能源 3 以下的積極熱情，成功才從手牌休息登場或突襲日野 茜或高森 藍子。只有自己的效果突襲才活動最多 1 張積極熱情。'},
 'IMC-1-029':{ready:true,implementation:'dsl',enterAlwaysActive:true,
  triggerEffect:{op:'retireOppFront'},
  mainAbility:{op:'fieldDiscardOrRestImpact',bp:1000,triggerBp:3000,trigger:'special',
   trait:'BEYOND THE STARLIGHT',minBp:7000,impact:1},
  notes:'場域以活動登場。棄 1 張手牌後，最多 1 張自己角色本回合 BP+1000；棄掉的是特殊觸發則改為 +3000。另一段休息自己，自己場上角色全部是 BEYOND THE STARLIGHT 時，給 1 張目前 BP≥7000 的角色本回合衝擊 1。特殊觸發是對方前線 1 張退場。'},
 'IMC-1-030':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,scaleTrait:'ポジティブパッション',
   scaleMin:3,scaleBp:5000}]},
  triggerEffect:{op:'retireOppFront'},
  notes:'相手フロントを BP3000以下で退場。場にポジティブパッションが3枚以上なら BP5000以下。スペシャルは相手フロント1枚退場。'},
 'IMC-1-031':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'recoverAp',count:2}]},
  notes:'APを2枚までアクティブ。ファイナルトリガーはカード表。'},
 'IMC-1-033':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'lookTopScript',count:6,rest:'bottom',takes:[{
   to:'hand',eachName:true,publish:true,names:['本田 未央','日野 茜','高森 藍子']}]}]},
  notes:'查看牌庫頂 6 張。本田 未央、日野 茜、高森 藍子各最多 1 張公開入手。其餘依選擇順序放回牌底。不能選的留在窗裡。'},
 'IMC-1-034':{ready:true,implementation:'dsl',mainAbility:energyRetire,
  notes:'001と同じ起動。発生エナジーの色はこのカードの青。'},
 'IMC-1-035':vanilla('効果欄は「-」。ドロートリガーはカード表の trigger。'),
 'IMC-1-036':{ready:true,implementation:'dsl',
  passiveBonuses:[{condition:{kind:'ownEffectCharacterEntryOrRaidThisTurn',turn:'own'},bp:1000}],
  notes:'自己回合，本回合自己的效果讓角色登場或效果突襲時 BP+1000。引擎把登場含突襲。付費登場、付費突襲與生命觸發不是 own-effect。對方回合不加。印刷是「自分の効果」，事件或場地效果讓角色登場也算。'},
 'IMC-1-038':{ready:true,implementation:'dsl',
  effects:{onRetire:[{op:'draw',count:1}]},
  notes:'退場時に1枚引く。手札へ戻す、リムーブは退場ではない。アクティブトリガーはカード表。'},
 'IMC-1-040':vanilla('効果欄は「-」。ゲットトリガーはカード表の trigger。'),
 'IMC-1-041':{ready:true,implementation:'dsl',
  effects:{onPlay:[lookTrait('ガールズ・イン・ザ・フロンティア')]},
  notes:'上から3枚、ガールズ・イン・ザ・フロンティアを1枚まで。アクティブトリガーはカード表。'},
 'IMC-1-042':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'blue',energy:2,ap:null,
   max:1,trait:'ガールズ・イン・ザ・フロンティア'}]},
  notes:'登場時，手牌中藍、費用 2 以下、ガールズ・イン・ザ・フロンティア，最多 1 張休息登場。不限 AP、前線或能量區、可跳過。不是突襲。'},
 'IMC-1-043':{ready:true,implementation:'dsl',raidName:'渋谷 凛',
  effects:{
   onRetire:[{op:'returnOwnRaidBase',optional:true,max:1}],
   onAttack:[{op:'bottomOwnCharacterThen',optional:true,max:1,type:'character',then:[{
    op:'lookTopScript',count:3,rest:'bottom',afterEntered:'discardActive',takes:[{
     to:'rest',type:'character',max:1,color:'blue',trait:'ガールズ・イン・ザ・フロンティア'}]}]}]
  },
  notes:'突襲框是渋谷 凛。退場時最多把直接突襲元 1 張放回手牌，不要求場上另有名字。攻擊可把 1 張自己角色置底；做到才看頂 3，藍色ガールズ・イン・ザ・フロンティア最多 1 張只休息登場，其餘依序放底。之後可棄 1 張手牌，才把剛登場的那張改為活動。每一步跳過就停止。'},
 'IMC-1-044':{ready:true,implementation:'dsl',impactNull:true,
  notes:'印刷のインパクト無効。アクティブトリガーはカード表。'},
 'IMC-1-045':{ready:true,implementation:'dsl',activeExtraEnergy:1,
  notes:'活動時，這張卡的發生能量 +1（青）。休息時不加。前線不產生能量。沒有生命觸發。'},
 'IMC-1-046':{ready:true,implementation:'dsl',emptyOwnFieldHandEnergyDiscount:2,
  effects:{onPlay:[{op:'grantOwnTraitBlockAtLeast',trait:'ガールズ・イン・ザ・フロンティア',bp:4000,optional:true}]},
  notes:'空場時手牌必要能量 -青2。登場時最多選 1 張該特徵，本回合目前 BP≥4000 的角色不能阻擋它。抽牌觸發是卡表。'},
 'IMC-1-047':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'inspectTopTraitOutside',count:2,trait:'LiPPS',rest:'top'}]},
  notes:'上から2枚見て、LiPPS を1枚まで場外。残りは上へ望む順。'},
 'IMC-1-048':{ready:true,implementation:'dsl',emptyOwnFieldHandEnergyDiscount:2,
  effects:{onPlay:[{op:'drawDiscard',count:1}]},
  notes:'自己場上沒有卡時，手牌必要能量 -2。有卡時不減。登場抽 1，並強制把手牌 1 張放到場外。'},
 'IMC-1-049':{ready:true,implementation:'dsl',raidName:'一ノ瀬 志希',
  effects:{
   onPlay:[{op:'bounceOppFrontOneUnderBp',bp:2500,orAtLeast:4500,optional:true}],
   onAttack:[{op:'drawDiscard',count:1}]
  },
  notes:'突襲框是一ノ瀬 志希，登場後活動，能量區的底板可以移到前線。登場時最多回手 1 張對方前線，目前 BP≤2500 或 ≥4500。攻擊抽 1 並強制棄 1。突襲生命觸發是卡表。'},
 'IMC-1-050':{ready:true,implementation:'dsl',readyOnBlockCount:1,
  notes:'本回合第一次阻擋後回到活動。第二次阻擋不再活動。アクティブトリガー是卡表。'}
});
