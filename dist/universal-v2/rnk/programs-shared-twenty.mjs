// Twenty official-JP RNK prints. New clauses are shared Universal V2 ops.
const shishio='志々雄 真実',yumi='駒形 由美',kenshin='緋村 剣心',sano='相楽 左之助';
const ten='十本刀',oni='御庭番衆';
const union=Object.freeze([shishio,yumi]);
const freeze=v=>Array.isArray(v)?Object.freeze(v.map(freeze)):
 v&&typeof v==='object'?Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,freeze(x)]))):v;
const play=(...onPlay)=>freeze({ready:true,implementation:'dsl',effects:{onPlay}});
const choose=(options)=>play({op:'chooseOne',optional:false,options});
export const RNK_PROGRAMS_SHARED_TWENTY=freeze({
 'RNK-1-005':choose([
  {id:'low',label:'BP2000以下を1枚まで退場',turn:'any',then:[
   {op:'retireOppFrontOneUnderBp',bp:2000,optional:true}]},
  {id:'oni',label:'御庭番衆を退場させ、引いてBP4000',turn:'any',then:[
   {op:'optionalRetireOwnTraitThen',trait:oni,then:[
    {op:'draw',count:1},
    {op:'retireOppFrontOneUnderBp',bp:4000,optional:true}
   ]}]}
 ]),
 'RNK-1-007':{ready:true,implementation:'dsl',passiveBonuses:[{
  impact:1,condition:{kind:'ownNamedCardsUsedThisTurn',turn:'own',
   names:['九頭龍閃','生きようとする意志']}}]},
 'RNK-1-017':play({op:'optionalRestOtherFrontTraitThenActive',trait:oni}),
 'RNK-1-026':play({op:'searchTopConditionalDiscard',count:3,logic:'any',filters:[
  {field:'name',value:'比古 清十郎'},{field:'name',value:kenshin}
 ],discardIfEnergyAtLeast:4}),
 'RNK-1-028':freeze({ready:true,implementation:'dsl',triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'retireOppFrontPerName',base:3000,step:1000,name:'四乃森 蒼紫',optional:false}]}}),
 'RNK-1-034':freeze({ready:true,implementation:'dsl',effects:{
  onPlay:[{op:'drawDiscard',count:1}],
  onRetire:[{op:'optionalRestOppFrontIfFrontName',name:shishio}]
 }}),
 'RNK-1-042':play({op:'optionalPayApThen',ap:1,optional:true,then:[{op:'retireOppFieldUpTo'}]}),
 'RNK-1-045':play({op:'inspectTopTraitOutside',count:2,traitlessColor:'purple',rest:'top'}),
 'RNK-1-052':{ready:true,implementation:'dsl',unionEnergy:{
  names:union,trait:ten,other:true,min:3,extra:1}},
 'RNK-1-058':freeze({ready:true,implementation:'dsl',
  mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[{op:'peekTopOrOutside'}]},
  triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true}}),
 'RNK-1-060':play({op:'buffOwnUnion',names:union,trait:ten,other:true,bp:1000,optional:true}),
 'RNK-1-062':freeze({ready:true,implementation:'dsl',mainAbility:{op:'fieldRestRetire'},
  effects:{onPlay:[{op:'grantNamedUnblockedOptionalDraw',name:shishio}],
   onRetire:[{op:'draw',count:2}]}}),
 'RNK-1-066':freeze({ready:true,implementation:'dsl',triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'retireOppFrontCategoryScale',base:0,step:1000,names:union,trait:ten,optional:false}]}}),
 'RNK-1-067':play({op:'outsideUnionToDeckTopThenActiveAp',names:union,trait:ten}),
 'RNK-1-072':play({op:'loseOwnTurnText',name:kenshin,optional:true}),
 'RNK-1-075':{ready:true,implementation:'dsl',unblockedAttack:{optional:false,then:[{op:'draw',count:1}]}},
 'RNK-1-082':choose([
  {id:'hand',label:'場外の必要エナジー1以下を手札へ',turn:'any',then:[
   {op:'recoverOutsideCharacterUnderEnergy',energy:1,optional:true}]},
  {id:'bp',label:'他のキャラを1枚までBP+1500',turn:'any',then:[
   {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1500,optional:true,excludeSelf:true}]}
 ]),
 'RNK-1-084':choose([
  {id:'wake',label:'レストの相楽左之助をアクティブ',turn:'any',then:[
   {op:'activeNamedRestingFront',name:sano,optional:true}]},
  {id:'rest',label:'アクティブの相楽左之助をレストして相手をレスト',turn:'any',then:[
   {op:'optionalRestNamedFrontThen',name:sano,then:[{op:'restOppFrontOne',optional:true}]}]}
 ]),
 'RNK-1-094':play({op:'searchTopConditionalDiscard',count:3,
  filter:{field:'type',value:'character'},discardUnlessName:sano}),
 'RNK-1-100':freeze({ready:true,implementation:'dsl',triggerEffect:{op:'retireOppFront'},
  effects:{onPlay:[{op:'moveOppFrontBpOrBottom',bp:5000,name:kenshin,optional:true}]}})
});
