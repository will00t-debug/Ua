// D group owns this file. UA55ST IMC-1-101 through IMC-1-113.
// Booster reprints stay in C's program file. AP cards are not programs.
// A ready entry needs implementation 'dsl' or 'vanilla'. A printed effect cannot be vanilla.
// Only a card whose whole printed sentence is an existing shared op is ready.
// IMC-1-102's printed-BP ceiling is not one of those ops; see requests-starter.mjs.
export const IMC_PROGRAMS_STARTER=Object.freeze({
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
 }
});
