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
 'IMC-1-007':vanilla('効果欄は「-」。アクティブトリガーはカード表の trigger。'),
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
 'IMC-1-018':{ready:true,implementation:'dsl',
  effects:{onPlay:[lookTrait('ポジティブパッション')]},
  notes:'上から3枚、ポジティブパッションを1枚まで。アクティブトリガーはカード表。'},
 'IMC-1-019':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'draw',count:1}]},
  triggerEffect:{op:'restOppFrontSkipNextActive'},
  notes:'登場時に1枚引く。カラートリガーは014と同じ。'},
 'IMC-1-021':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'drawDiscard',count:1}]},
  notes:'登場時、1枚引き、手札を1枚場外。ドロートリガーはカード表。'},
 'IMC-1-022':{ready:true,implementation:'dsl',
  mainAbility:{op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1},
  notes:'レスト、ターン1。他のアクティブなフロントを1枚レストした場合、このターン発生エナジー+黄。'},
 'IMC-1-025':vanilla('効果欄は「-」。ドロートリガーはカード表の trigger。'),
 'IMC-1-030':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,scaleTrait:'ポジティブパッション',
   scaleMin:3,scaleBp:5000}]},
  triggerEffect:{op:'retireOppFront'},
  notes:'相手フロントを BP3000以下で退場。場にポジティブパッションが3枚以上なら BP5000以下。スペシャルは相手フロント1枚退場。'},
 'IMC-1-031':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'recoverAp',count:2}]},
  notes:'APを2枚までアクティブ。ファイナルトリガーはカード表。'},
 'IMC-1-034':{ready:true,implementation:'dsl',mainAbility:energyRetire,
  notes:'001と同じ起動。発生エナジーの色はこのカードの青。'},
 'IMC-1-035':vanilla('効果欄は「-」。ドロートリガーはカード表の trigger。'),
 'IMC-1-038':{ready:true,implementation:'dsl',
  effects:{onRetire:[{op:'draw',count:1}]},
  notes:'退場時に1枚引く。手札へ戻す、リムーブは退場ではない。アクティブトリガーはカード表。'},
 'IMC-1-040':vanilla('効果欄は「-」。ゲットトリガーはカード表の trigger。'),
 'IMC-1-041':{ready:true,implementation:'dsl',
  effects:{onPlay:[lookTrait('ガールズ・イン・ザ・フロンティア')]},
  notes:'上から3枚、ガールズ・イン・ザ・フロンティアを1枚まで。アクティブトリガーはカード表。'},
 'IMC-1-044':{ready:true,implementation:'dsl',impactNull:true,
  notes:'印刷のインパクト無効。アクティブトリガーはカード表。'},
 'IMC-1-047':{ready:true,implementation:'dsl',
  effects:{onPlay:[{op:'inspectTopTraitOutside',count:2,trait:'LiPPS',rest:'top'}]},
  notes:'上から2枚見て、LiPPS を1枚まで場外。残りは上へ望む順。'}
});
