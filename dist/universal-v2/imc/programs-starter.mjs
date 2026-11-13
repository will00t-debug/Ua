// D group owns this file. UA55ST IMC-1-101 through IMC-1-113.
// Booster reprints stay in C's program file. AP cards are not programs.
// A ready entry needs implementation 'dsl' or 'vanilla'. A printed effect cannot be vanilla.
// Only a card whose whole printed sentence is an existing shared op is ready.
export const IMC_PROGRAMS_STARTER=Object.freeze({
 'IMC-1-101':{
  ready:true,
  implementation:'dsl',
  // 【インパクト無効】は登場句之外。
  impactNull:true,
  // 自分の場。元々のBP 4000 的 new generations 含自己，達 3 張才抽 1。
  effects:{onPlay:[{
   op:'ifLiveThen',
   when:{kind:'ownPrintedTraitCount',turn:'any',min:3,zone:'field',excludeSelf:false,
    trait:'new generations',printedBp:4000},
   then:[{op:'draw',count:1}]
  }]}
 },
 'IMC-1-102':{
  ready:true,
  implementation:'dsl',
  // 突襲框只有〈渋谷 凛〉。登場時在框外，普通登場與突襲登場都結算。
  raidName:'渋谷 凛',
  effects:{onPlay:[
   {op:'grantSelfImpactThisTurn',amount:1},
   {op:'retireOppFrontUnderBp',optional:true,printedBpTraitCount:{
    trait:'new generations',printedBp:4000,per:1000,excludeSelf:true
   }}
  ]}
 },
 'IMC-1-103':{
  ready:true,
  implementation:'dsl',
  // 【アタック時】只數自己前線。印刷 BP 4000 的 new generations 達 3 張才抽 1 棄 1。
  effects:{onAttack:[{
   op:'ifLiveThen',
   when:{kind:'ownPrintedTraitCount',turn:'any',min:3,zone:'front',excludeSelf:false,
    trait:'new generations',printedBp:4000},
   then:[{op:'drawDiscard',count:1}]
  }]}
 },
 'IMC-1-104':{
  ready:true,
  implementation:'dsl',
  // 自分の場に〈渋谷 凛〉と〈本田 未央〉が同時にあるときだけ、手札のこのカードの消費 AP-1。
  // 一名離場就重算。支付下限是 0。【カラー】BP2500以下是生命觸發，不是這段降費。
  handApDiscountWhileAllNames:{names:['渋谷 凛','本田 未央'],amount:1},
  triggerEffect:{op:'retireOppFrontUnderBp',bp:2500}
 },
 'IMC-1-105':{
  ready:true,
  implementation:'dsl',
  // 【登場時】見て、［特徴：new generations］を1枚まで公開し手札に加える。
  // 残りは山札の下。加えたときだけ手札を1枚場外。見る窓は非公開。
  effects:{onPlay:[{
   op:'searchTopOneBottomDiscard',
   count:3,
   filter:{field:'trait',value:'new generations'}
  }]}
 },
 'IMC-1-106':{
  ready:true,
  implementation:'dsl',
  // 突襲框只有〈本田 未央〉。看 3 張不棄手牌。活動段等印刷 BP 4000 達 4 張。
  raidName:'本田 未央',
  effects:{onPlay:[
   {op:'searchTopOneBottomDiscard',count:3,noHandDiscard:true,
    filter:{field:'trait',value:'new generations'}},
   {op:'ifLiveThen',
    when:{kind:'ownPrintedTraitCount',turn:'any',min:4,zone:'field',excludeSelf:false,
     trait:'new generations',printedBp:4000},
    then:[{op:'activeOwnTrait',optional:true,max:1,trait:'new generations'}]}
  ]}
 },
 'IMC-1-108':{
  ready:true,
  implementation:'dsl',
  // 只加自己前線。能源線不加。然後抽 1。
  effects:{onPlay:[
   {op:'buffOwnCharactersAll',bp:1000,zone:'front'},
   {op:'draw',count:1}
  ]}
 },
 'IMC-1-109':{
  ready:true,
  implementation:'dsl',
  // 【スペシャル】は生命觸發，不沿用登場效果的張數上限。
  triggerEffect:{op:'retireOppFront'},
  // 自分の場の［特徴：new generations］の枚数×1000以下。を1枚選び，不可放棄。
  effects:{onPlay:[{
   op:'retireOppFrontUnderBp',
   mandatory:true,
   traitPerBp:{trait:'new generations',per:1000}
   }]}
 },
 'IMC-1-110':{
  ready:true,
  implementation:'dsl',
  // 【起動メイン】【フロントL】【ターン1】このキャラのBPが4000以上。
  // 二選一：任意自己角色這個回合 +1000，或目前 BP 3000 以上的自己角色這個回合 +2000。
  mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,minSelfBp:4000,
   then:[{op:'chooseOne',optional:false,options:[
    {id:'plus1000',label:'選擇1張自己場上的角色卡，在這個回合中，BP+1000。',turn:'any',then:[
     {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:false,excludeSelf:false}]},
    {id:'plus2000',label:'選擇1張自己場上BP3000以上的角色卡，在這個回合中，BP+2000。',turn:'any',then:[
     {op:'buffOwnCurrentBp',minBp:3000,bp:2000,optional:false,excludeSelf:false}]}
   ]}]
  }
 }
});
