// v9 profiles: only cards whose full printed ability is implemented should be added.
// Automatic status is deliberately withheld for unresolved cards.
export const V9_RULES={
 'BLC-2-061':{event:[{op:'zeroBanishDestroy',base:3000,drawEach:true}]},
 'BLC-3-003':{entry:[{op:'chooseMode',modes:[
   {label:'其他己方角色 BP +1000',rules:[{op:'buff',target:'own',other:true,amount:1000,optional:true}]},
   {label:'其他己方角色 BP +3000，攻擊結束後退場',rules:[{op:'buff',target:'own',other:true,amount:3000,optional:true,then:[{op:'keyword',target:'chosen',key:'attackRetire'}]}]}
 ]}]},
 'BLC-3-010':{entry:[{op:'splitTop',count:2,selectDest:'bottom',title:'選擇放至牌庫底的卡，其餘依順序放回頂部'}]},
 'BLC-3-011':{underEnergy:1,entry:[{op:'putUnder'}],ability:{rest:true,effects:[{op:'useUnder',amount:2}]}},
 'BLC-4-017':{entry:[{op:'drawDiscard',draw:1,discard:1}],ability:{rest:true,sacrifice:true,groupOnce:'giselle-double',effects:[{op:'keyword',target:'own',trait:'殭屍',key:'doubleAttack',optional:false}]}},
 'BLC-4-039':{entryReady:{line:'energy',ownFrontAp2:true},ability:{rest:true,effects:[{op:'restToBuff'}]}},
 'BLC-4-049':{passive:{bpIfPurpleApPaid:2000},ability:{front:true,once:true,ap:1,when:{ownName:'朽木露琪亞'},effects:[{op:'chooseMode',modes:[
   {label:'抽 1 張',rules:[{op:'draw',count:1}]},
   {label:'將此角色改為 ACTIVE，敵方角色 BP -1000',rules:[{op:'activate',target:'self'},{op:'buff',target:'oppFront',amount:-1000,optional:true}]}
 ]}]}},
 'BLC-4-058':{playWhen:{ownName:'阿散井戀次'},event:[{op:'destroy',target:'oppFront',bpMax:5000},{op:'conditionalPaidDrawDiscard'}]},
 'BLC-4-065':{step:true,passive:{bpIfOwnEnergyName:{name:'京樂春水',amount:1500}},ability:{groupOnce:'nanaoReady',once:true,when:{playedEventName:'神劍・八鏡劍'},effects:[{op:'activate',target:'self'}]},color:{zone:'hand',color:'green'}},
 'BLC-4-078':{event:[{op:'destroy',target:'oppFront',bpMax:4000}]},
 'BLC-4-079':{event:[{op:'chooseMode',modes:[
   {label:'抽 1 張牌',rules:[{op:'draw',count:1}]},
   {label:'伊勢七緒 BP +3000、Impact 1',rules:[{op:'buff',target:'own',name:'伊勢七緒',amount:3000,optional:true,then:[{op:'addImpact',target:'chosen',count:1}]}]}
 ]},{op:'restToRecoverAp'}]},
 'BLC-4-057':{event:[{op:'silence'},{op:'draw',count:2,when:{ownNameOrRemoved:'兵主部一兵衛'}},{op:'discardHand',count:1,remove:true,when:{ownNameOrRemoved:'兵主部一兵衛'}}]},
 'BLC-2-064':{ability:{rest:true,sacrifice:true,effects:[{op:'sacrificeBuff',name:'更木劍八'}]}},
 'BLC-4-024':{entry:[{op:'moveAcross',other:true,noTraits:true,optional:true}]},
 'BLC-4-027':{impactNull:true,ability:{once:true,discardFilter:{nameContains:['斬月','月牙']},effects:[{op:'draw',count:1},{op:'buff',target:'self',amount:1500},{op:'keyword',key:'frontOnAttack'},{op:'keyword',key:'immuneTrigger'}]}},
 'BLC-2-030':{entry:[{op:'chooseMode',modes:[
   {label:'若本回合露琪亞登場，回復最多 1 AP',when:{ownNameEnteredThisTurn:'朽木露琪亞'},rules:[{op:'recoverAp',count:1}]},
   {label:'本回合下一張露琪亞 AP -1',rules:[{op:'nextApDiscount',names:['朽木露琪亞'],amount:1}]}
 ]}],attack:[{op:'draw',count:1}],color:{op:'bounce',target:'oppFront',bpMax:3500}},
 'BLC-4-032':{passive:{bpIfOwnNames:{names:['黑崎一護','浦原喜助'],amount:1000}},attackAfterOwn:{op:'swapYoruichi'},color:{op:'bounce',target:'oppFront',bpMax:3500}},
 'BLC-4-060':{energyOnly:true,entry:[{op:'moveAcross',other:true,optional:true}],ability:{energy:true,requiresTwoActiveFront:true,effects:[{op:'aizenMoveFront'}]},attack:[{op:'draw',count:1}]},
 'BLC-4-082':{entry:[{op:'splitTop',count:2,selectDest:'outside',drawIfOutsideEnergy3:true}]},
 'BLC-4-083':{discount:{whenOwnEmpty:true,amount:2},entry:[{op:'peekTop',count:1,destinations:['top','outside']}],onRaided:[{op:'onRaidedRukia'}]},
 'BLC-4-055':{entry:[{op:'sacrificeOther',destination:'removed',then:[{op:'chooseMode',modes:[
   {label:'下一張零番隊或靈王宮 AP -1',rules:[{op:'nextApDiscount',trait:'零番隊',names:['靈王宮'],amount:1}]},
   {label:'最多 2 個零番隊角色 BP +2000',rules:[{op:'buff',target:'own',trait:'零番隊',amount:2000,optional:true,maxTargets:2}]}
 ]}]}]},
 'BLC-4-042':{entry:[{op:'chooseMode',modes:[
   {label:'查看牌庫頂 2 張，可放回牌庫頂或場外',rules:[{op:'splitTop',count:2,selectDest:'outside'}]},
   {label:'將 2 張手牌送場外，回收涅繭利或涅音夢',rules:[{op:'discardHand',count:2,then:[{op:'recoverOutside',filter:{names:['涅繭利','涅音夢']},optional:true}]}]},
   {label:'退場另一個己方角色，從手牌派遣涅骸部隊',rules:[{op:'sacrificeOther',then:[{op:'deployFrom',zone:'hand',filter:{color:'blue',names:['涅骸部隊']},line:'energy',active:true,optional:true}]}]}
 ]}]},

 'BLC-1-060':{entry:[{op:'guessEnergy',count:2}]},
 'BLC-1-063':{event:[{op:'look',count:5,takeMin:1,takeMax:1,thenOutsideCount:1,rest:'bottom'}]},
 'BLC-2-009':{entry:[{op:'drawDiscard',draw:2,discard:2,when:{ownOtherTraitsAnyCount:{traits:['邦比愛塔親衛隊','殭屍'],names:['邦比愛塔'],count:3}}}],ability:{front:true,once:true,effects:[{op:'sacrificeOther',notTrait:'殭屍',then:[{op:'deployFrom',zone:'outside',filter:{trait:'殭屍',color:'yellow',type:'character'},active:true,optional:true}]}]}},
 'BLC-2-013':{onBlueIchigoDiscard:'protect'},
 'BLC-2-021':{onBlueIchigoDiscard:'blockLow'},
 'BLC-2-037':{entry:[{op:'sacrificeOther',trait:'涅骸部隊',optional:true,then:[{op:'destroy',target:'oppFront',bpMaxSacrifice:true,optional:true},{op:'draw',count:1}]}]},
 'BLC-2-043':{entry:[{op:'optionalPayAp',amount:1,groupOnce:'kensei-joint',then:[{op:'deployFrom',zone:'outside',filter:{names:['六車拳西＆鳳橋樓十郎']},active:false,optional:true}]}],color:{op:'bounce',target:'oppFront',bpMax:3500}},
 'BLC-2-070':{entry:[{op:'chooseMode',modes:[{label:'使 BP 相同且 ≤2000 的兩個敵方前線角色退場',rules:[{op:'twoEqualDestroy',bpMax:2000}]},{label:'使 BP ≥3000 的敵方前線角色 REST，自己變 ACTIVE',rules:[{op:'rest',target:'oppFront',bpMin:3000,optional:true,then:[{op:'activate',target:'self'}]}]}]}]},
 'BLC-4-005':{retire:[{op:'reviveGerard'}]},
 'BLC-4-008':{entry:[{op:'sacrificeOther',name:'巴茲比',optional:true,then:[{op:'destroy',target:'oppFront',bpMaxEnergyMultiply:1000,optional:true},{op:'activate',target:'self'}],impactSourceIfSacrificeEnergyMin:5,when:{noOutsideName:'友哈巴赫'}}]},
 'BLC-4-015':{toDeckBottomOnOutside:true,ability:{front:true,once:true,effects:[{op:'sacrificeOther',then:[{op:'activate',target:'self'},{op:'look',count:3,takeMin:1,takeMax:1,rest:'bottom'}],buffSourceIfSacrificeEnergyMin:4}]}},
 'BLC-4-016':{ability:{once:true,when:{enteredThisTurn:true},effects:[{op:'sacrificeOther',then:[{op:'energyBoost',amount:1,duration:'nextTurn'},{op:'chooseMode',modes:[{label:'抽 1 張',rules:[{op:'draw',count:1}]},{label:'最多 1 個 BP ≥1500 敵方角色 BP -1000',rules:[{op:'buff',target:'oppFront',bpMin:1500,amount:-1000,optional:true}]}]}]}]}},
 'BLC-4-041':{retireAtOwnStart:true,retireToRemoved:true,entry:[{op:'sacrificeOther',optional:true,when:{ownNameFront:'涅繭利'},then:[{op:'activate',target:'self'},{op:'keyword',key:'impact'},{op:'keyword',key:'forcedBlock'}]}],color:{op:'bounce',target:'oppFront',bpMax:3500}},
 'BLC-4-022':{entryReady:true,entry:[{op:'discardHand',count:1,optional:true,then:[{op:'chooseMode',modes:[{label:'回收場外能源需求 1 以下藍色角色',rules:[{op:'recoverOutside',filter:{color:'blue',type:'character',maxEnergy:1},optional:true}]},{label:'從場外 REST 登場能源需求 1 以下藍色角色',rules:[{op:'deployFrom',zone:'outside',filter:{color:'blue',type:'character',maxEnergy:1},active:false,optional:true}]}]}]}],ability:{once:true,when:{enteredThisTurn:true},effects:[{op:'retireGuard',optional:true}]}},
 'BLC-4-018':{retire:[{op:'chooseMode',when:{ownTurn:true},modes:[{label:'使己方邦比小隊／邦比愛塔轉為 ACTIVE',rules:[{op:'activate',target:'own',other:true,nameOrTrait:{name:'邦比愛塔',trait:'邦比小隊'},optional:true}]},{label:'保護己方邦比小隊／邦比愛塔，敵方前線 BP -500',rules:[{op:'retireGuard',optional:true,nameOrTrait:{name:'邦比愛塔',trait:'邦比小隊'}},{op:'buff',target:'oppFront',bpMin:1000,amount:-500,all:true}]}]}]},

 'BLC-2-045':{event:[{op:'sacrificeOther',trait:'涅骸部隊',then:[{op:'draw',count:1},{op:'deployFrom',zone:'outside',filter:{type:'character',color:'blue',ap:1,trait:'涅骸部隊',names:['涅音夢']},active:true,requireEnergy:true,optional:true},{op:'deployFrom',zone:'outside',filter:{type:'character',color:'blue',ap:1,trait:'涅骸部隊',names:['涅音夢']},active:true,requireEnergy:true,optional:true}]}]},
 'BLC-2-060':{entry:[{op:'look',count:4,rest:'top'}],attack:[{op:'guessEnergySingle'}],color:{zone:'outside',color:'purple'}},
 'BLC-4-054':{entry:[{op:'optionalPayAp',amount:1,groupOnce:null,when:{ownName:'阿散井戀次'},then:[{op:'draw',count:1},{op:'deployOrRaidHand'}]}],color:{zone:'outside',color:'purple'}},
 'BLC-4-056':{entry:[{op:'draw',count:1},{op:'discardHand',count:1,filter:{trait:'零番隊'},remove:true,optional:true,then:[{op:'activate',target:'self'}]}],retireToRemoved:true,retire:[{op:'deployRemovalIchibe'}]},
 
 'BLC-2-002':{ability:{once:true,discard:1,effects:[{op:'chooseMode',modes:[{label:'交換一組己方前線和能源線角色',rules:[{op:'swapFrontEnergy'}]},{label:'此角色本回合 BP +1000',rules:[{op:'buff',target:'self',amount:1000}]},{label:'交換角色位置且 BP +1000（己方有友哈巴赫）',when:{ownName:'友哈巴赫'},rules:[{op:'swapFrontEnergy'},{op:'buff',target:'self',amount:1000}]}]}]}},
 'BLC-2-044':{abilities:[{once:true,effects:[{op:'sacrificeOther',trait:'涅骸部隊',other:false}]},{rest:true,once:true,when:{ownRetiredThisTurn:true},effects:[{op:'buff',target:'ownField',nameOrTrait:{name:'涅音夢',trait:'涅骸部隊'},type:'character',amount:1000,all:true}]}]},
 'BLC-4-007':{ability:{once:true,groupOnce:'bazz-activate',when:{noOutsideName:'友哈巴赫',selfEnergyMin:5},effects:[{op:'activate',target:'self'}]}},

 'BLC-1-055':{ability:{front:true,once:true,ap:1,effects:[{op:'delaySoiFon'}]}},
 'BLC-4-004':{impactNull:true,handAbility:'uryu'},
 'BLC-4-034':{entryReady:{line:'energy'},ability:{rest:true,effects:[{op:'lilukaSacrificeRecover'}]},color:{op:'bounce',target:'oppFront',bpMax:3500}},
 'BLC-4-036':{onBlueDiscard:'deploy',groupOnce:'grimDiscard'},
 'BLC-4-044':{event:[{op:'sniperYoruichi'}]},
};
