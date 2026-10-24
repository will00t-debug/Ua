// V2-C TTG adapter. Only shared V2 engine, no TTG-specific match reducer.
import {TTG_BY_ID} from '../ttg-builder.mjs';
import {verifiedPilotCards} from './real-card-pilots.mjs';
import {createUniversalPack} from './pack.mjs';
const additions=[
 {id:'TTG-1-020',name:'ヨーコ',energy:2,ap:1,bp:2500,gen:1,color:'green',
  type:'character',traits:['大グレン団'],trigger:'active',step:true,
  implementation:'dsl',effects:{},emptyOwnFieldHandEnergyDiscount:2,
  match:'手牌本卡需求能源減2'},
 {id:'TTG-1-067',name:'ヨーコ',energy:4,ap:2,bp:3500,gen:1,color:'red',
  type:'character',traits:['大グレン団'],trigger:'active',implementation:'dsl',
  enterAlwaysActive:true,
  blockBpRestriction:{relation:'atLeast',bp:4000,condition:null},
  effects:{onPlay:[{op:'grantSelfSniperThisTurn'},
   {op:'grantSelfAttackWinDrawThisTurn'}]},
  match:'狙擊'},
 {id:'TTG-1-028',name:'グレンラガン',energy:4,ap:1,bp:4000,gen:1,color:'green',
  type:'character',traits:['大グレン団','ガンメン'],trigger:'raid',
  raidName:'シモン',raidBaseNames:['シモン','ヴィラル'],implementation:'dsl',
  effects:{onPlay:[{op:'draw',count:1},
   {op:'forbidAttackOppFrontOne',optional:true,ownTurnOnly:true,
    until:'nextOwnTurnStart'}]},
  match:'下次己方回合開始不能攻擊'},
 {id:'TTG-1-006',name:'キタン',energy:2,ap:1,bp:3000,gen:1,color:'green',
  type:'character',trigger:null,implementation:'dsl',effects:{},
  passiveBonuses:[{condition:{kind:'ownEnergyAtLeast',turn:'own',min:6},bp:1000}],
  match:'自己的能源達 6 以上時'},
 {id:'TTG-1-005',name:'キタン',energy:0,ap:1,bp:1500,gen:1,color:'green',type:'character',trigger:'draw',impactNull:true,implementation:'dsl',effects:{},match:'IMPACT 無效'},
 {id:'TTG-1-014',name:'ニア',energy:1,ap:1,bp:1500,gen:2,color:'green',type:'character',trigger:null,implementation:'dsl',templateEffects:{onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]},match:'需求能源1以下'},
 {id:'TTG-1-019',name:'ヨーコ',energy:2,ap:1,bp:2500,gen:1,color:'green',type:'character',trigger:null,activeExtraEnergy:1,implementation:'dsl',effects:{},match:'ACTIVE'},
 {id:'TTG-1-010',name:'シモン',energy:1,ap:1,bp:1500,gen:1,color:'green',type:'character',trigger:'draw',
  implementation:'dsl',templateEffects:{onPlay:[{template:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:'大グレン団'}}]},match:'牌庫頂查看3張'},
 {id:'TTG-1-023',name:'リーロン',energy:2,ap:1,bp:3000,gen:1,color:'green',type:'character',trigger:null,
  implementation:'dsl',templateEffects:{onPlay:[{template:'searchTopOneBottomDiscard',count:5,filter:{field:'trait',value:'ガンメン'}}]},match:'牌庫頂5張'},
 {id:'TTG-1-018',name:'ブータ',energy:0,ap:1,bp:1000,gen:1,color:'green',
  type:'character',trigger:null,implementation:'dsl',effects:{},
  mainAbility:{op:'restSelfGainEnergyRetireEndMain',
    energyOnly:true,oncePerTurn:true,extraEnergy:1},
  match:'主要階段結束時退場。'},
 {id:'TTG-1-063',name:'ブータ',energy:0,ap:1,bp:1000,gen:1,color:'red',
  type:'character',trigger:null,implementation:'dsl',effects:{},
  mainAbility:{op:'restSelfGainEnergyRetireEndMain',
    energyOnly:true,oncePerTurn:true,extraEnergy:1},
  match:'主要階段結束時讓此角色退場'},
 {id:'TTG-1-053',name:'シモン',energy:0,ap:1,bp:1500,gen:1,color:'red',type:'character',trigger:'active',
  implementation:'dsl',mainAbility:{op:'restSelfThen',frontOnly:true,then:[{op:'millTop',count:1}]},
  effects:{},match:'主要階段：REST自己，牌庫頂1張送場外。'},
 {id:'TTG-1-077',name:'ダイグレン',energy:4,ap:1,bp:0,gen:2,color:'red',type:'field',trigger:null,implementation:'dsl',templateEffects:{onPlay:[{template:'recoverOutsideOne',filter:{field:'trait',value:'ガンメン'},optional:true}]},match:'ガンメン特徵'},
 {id:'TTG-1-022',name:'ヨマコ先生',energy:1,ap:1,bp:1500,gen:1,color:'green',type:'character',trigger:'draw',
  implementation:'dsl',effects:{},nameAliases:['ヨーコ'],
  mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,
   extraEnergy:1,end:'hand'},
  match:'返回手牌'},
 {id:'TTG-1-015',name:'ニア',energy:0,ap:1,bp:500,gen:1,color:'green',type:'character',trigger:'draw',
  implementation:'dsl',effects:{},
  mainAbility:{op:'payApDrawGainEnergy',oncePerTurn:true,draw:1,extraEnergy:1},
  match:'主要階段每回合一次，支付1 AP：抽1張；本回合產生能源+1。'},
 {id:'TTG-1-002',name:'ヴィラル',energy:1,ap:1,bp:1500,gen:1,color:'green',type:'character',trigger:'active',
  implementation:'dsl',effects:{},
  mainAbility:{op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1},
  match:'產生的綠色能源+1'},
 {id:'TTG-1-007',name:'ギミー',energy:0,ap:1,bp:1500,gen:1,color:'green',type:'character',trigger:'active',
  implementation:'dsl',effects:{onPlay:[{op:'payApDeployNamedRest',entry:'hand',name:'ダリー'}]},
  passiveBonuses:[{condition:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'ダリー'},bp:1000}],
  match:'場上有達莉時 BP+1000'},
 // Official Japanese has no まで: the ガンメン recovery is mandatory, so the
 // ability is offered only when a match is already outside. The Chinese
 // catalogue says 可 and is not the printed cost.
 {id:'TTG-1-069',name:'リーロン',energy:0,ap:1,bp:1000,gen:1,color:'red',
  type:'character',trigger:null,implementation:'dsl',effects:{},
  mainAbility:{op:'restRetireRecoverOutside',optional:false,
   filter:{field:'trait',value:'ガンメン'}},
  match:'主要階段 REST 並退場自己'},
 {id:'TTG-1-013',name:'ダリー',energy:0,ap:1,bp:1500,gen:1,color:'green',type:'character',trigger:'draw',
  implementation:'dsl',effects:{onPlay:[{op:'payApDeployNamedRest',entry:'hand',name:'ギミー'}]},
  passiveBonuses:[{condition:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'ギミー'},bp:1000}],
  match:'場上有吉米時 BP+1000'}
];
export const TTG_V2_ADDITION_IDS=Object.freeze(additions.map(x=>x.id));
export function verifiedTtgV2Additions(){
 return additions.map(({match,...spec})=>{
  const c=TTG_BY_ID[spec.id];
  if(!c||c.identity!==spec.id||!c.source?.includes('/cardlist/')||!c.effect?.includes(match))throw Error('TTG re-verification required: '+spec.id);
  for(const key of ['name','energy','ap','bp','gen','color','type','trigger']){
   const observed=key==='name'?(c.nameJa||c.name):(c[key]??null);
   if(observed!==(spec[key]??null))throw Error('TTG printed '+key+' changed: '+spec.id);
  }
  // Older UA56BT entries print traits as separate tokens; TTG-077 uses
  // one official slash-composite field. Normalize ONLY this proved card
  // to the same V2 trait keys; sourceRecord remains untouched.
  if(spec.id==='TTG-1-077'&&JSON.stringify(c.traits)!=='["大グレン団／ガンメン"]')
   throw Error('TTG-077 official Gunmen traits changed; re-review required');
  return {...spec,traits:spec.id==='TTG-1-077'?['大グレン団','ガンメン']:(c.traits||[])};
 });
}
export function createTtgV2Pack(){return createUniversalPack({id:'gurren-lagann',version:'v2-c-20261015',cards:[...verifiedPilotCards('gurren-lagann'),...verifiedTtgV2Additions()]});}
