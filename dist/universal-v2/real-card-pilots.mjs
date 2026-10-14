// First real-card V2 pilots. Every ID is manually allowed and tied to actual
// Japanese printed characteristics; legacy "auto" flags cannot grant V2 support.
// Incomplete sets intentionally cannot form legal 50-card all-real decks yet.
import {CARDS} from '../cards.mjs?v=9.1.0';
import {TTG_BY_ID} from '../ttg-builder.mjs';
import {createUniversalPack} from './pack.mjs';

const printed=Object.freeze({
 bleach:Object.freeze([
  {id:'BLC-1-034',energy:0,ap:1,bp:1500,gen:1,color:'purple',trigger:'draw',type:'character',implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]},matchText:'抽 1 張'},
  {id:'BLC-1-036',energy:2,ap:1,bp:3000,gen:1,color:'purple',trigger:'active',type:'character',implementation:'dsl',
   templateEffects:{onPlay:[{template:'millTop',count:2}]},matchText:'己方牌堆頂 2 張',
   officialFAQ:'Q556: 2 cards are mandatory; if only 1 remains mill that one'},
  {id:'BLC-1-037',energy:2,ap:1,bp:2500,gen:1,color:'purple',trigger:null,type:'character',
   implementation:'dsl',activeExtraEnergy:1,effects:{},matchText:'額外產生 1 紫能源'},
  {id:'BLC-1-039',energy:0,ap:1,bp:1500,gen:1,color:'purple',trigger:'get',type:'character',implementation:'vanilla',effects:{}},
  {id:'BLC-1-040',energy:1,ap:1,bp:2500,gen:1,color:'purple',trigger:'color',type:'character',implementation:'dsl',
   templateEffects:{onPlay:[{template:'peekTopOne'}]},
   triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true},
   matchText:'查看己方牌堆頂 1 張',
   officialFAQ:'Printed COLOR deploys an eligible PURPLE character from OWN OUTSIDE to ACTIVE FRONT, not from hand'},
  {id:'BLC-1-064',energy:4,ap:1,bp:0,gen:0,color:'purple',trigger:'special',type:'event',implementation:'dsl',triggerEffect:{op:'retireOppFront'},templateEffects:{onPlay:[{template:'retireEnemyUnderBp',bp:3000,bonusName:'黒崎一護',bonusBp:5000}]},matchText:'BP 3000'},
  {id:'BLC-1-066',energy:3,ap:1,bp:0,gen:0,color:'purple',trigger:'final',type:'event',implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]},matchText:'回復最多 2 AP'},
  {id:'BLC-1-045',energy:0,ap:1,bp:2000,gen:1,color:'purple',trigger:'active',type:'character',
   implementation:'vanilla',effects:{},matchText:'無固有效果。'},
  {id:'BLC-1-048',energy:0,ap:1,bp:1500,gen:1,color:'purple',trigger:'get',type:'character',
   implementation:'vanilla',effects:{},matchText:'無固有效果。'},
  {id:'BLC-1-052',energy:3,ap:1,bp:3500,gen:1,color:'purple',trigger:'draw',type:'character',
   implementation:'dsl',templateEffects:{onAttack:[{template:'drawDiscardOne'}]},matchText:'攻擊時：抽 1 張'},
  {id:'BLC-1-057',energy:1,ap:1,bp:2500,gen:1,color:'purple',trigger:'active',type:'character',
   implementation:'vanilla',effects:{},matchText:'無固有效果。'},
  {id:'BLC-1-102',energy:3,ap:1,bp:3000,gen:2,color:'purple',trigger:'active',type:'character',implementation:'vanilla',effects:{},matchText:'產生 2 紫能源'},
  {id:'BLC-1-103',energy:3,ap:1,bp:3000,gen:2,color:'purple',trigger:null,type:'character',implementation:'dsl',templateEffects:{onAttack:[{template:'buffSelf',bp:1000}]},matchText:'攻擊時'},
  {id:'BLC-1-105',energy:5,ap:2,bp:4000,gen:1,color:'purple',trigger:'active',type:'character',implementation:'dsl',templateEffects:{onPlay:[{template:'enemyBpDown',bp:3000,optional:true}]},matchText:'BP −3000'},
  {id:'BLC-1-107',energy:0,ap:1,bp:2000,gen:1,color:'purple',trigger:null,type:'character',implementation:'vanilla',effects:{}},
 ]),
 'gurren-lagann':Object.freeze([
  {id:'TTG-1-001',energy:0,ap:1,bp:2000,gen:1,color:'green',trigger:null,type:'character',implementation:'dsl',templateEffects:{onPlay:[{template:'peekTopOne'}]},matchText:'山札の上から1枚見て'},
  {id:'TTG-1-009',energy:0,ap:1,bp:1500,gen:1,color:'green',trigger:'draw',type:'character',implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]},matchText:'抽1張'},
  {id:'TTG-1-036',energy:3,ap:1,bp:0,gen:0,color:'green',trigger:'final',type:'event',implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'},
  {id:'TTG-1-037',energy:3,ap:1,bp:0,gen:0,color:'green',trigger:'final',type:'event',implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'},
  {id:'TTG-1-038',energy:3,ap:1,bp:0,gen:0,color:'green',trigger:'final',type:'event',implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'},
  {id:'TTG-1-045',energy:1,ap:1,bp:2000,gen:1,color:'red',trigger:'color',
   type:'character',implementation:'dsl',
   triggerEffect:{op:'retireOppFrontUnderBp',bp:2500},
   templateEffects:{onRaided:[
    {template:'buffOwnTrait',trait:'大グレン団',bp:1000,optional:true},
    {template:'drawIfRaidUnderFacedown'}
   ]},matchText:'己方回合本卡成為 Raid 底板時',
   matchTexts:['大紅蓮團角色至多1張 BP+1000','裏向卡','可自選與 Raid 登場效果的結算順序']},
  {id:'TTG-1-046',energy:4,ap:1,bp:4000,gen:1,color:'red',trigger:'get',
   type:'character',implementation:'dsl',
   mainAbility:{op:'chooseTwoAfterOwnRaid',frontOnly:true,readyOncePerName:true,
    trait:'大グレン団',bp:1000},
   effects:{},matchText:'本回合己方有過突襲時',
   matchTexts:['最多選兩種能力','使自身 ACTIVE','BP+1000','同名 ACTIVE 選項每回合一次']},
  {id:'TTG-1-047',energy:0,ap:1,bp:1500,gen:1,color:'red',trigger:'draw',
   type:'character',implementation:'dsl',templateEffects:{onAttack:[
    {template:'buffSelfIfFirstAttack',bp:1500}
   ]},matchText:'第一次角色攻擊'},
  {id:'TTG-1-049',energy:1,ap:1,bp:1500,gen:2,color:'red',trigger:null,
   type:'character',implementation:'dsl',templateEffects:{onPlay:[
    {template:'bounceOwnOtherUnderEnergy',energy:1}
   ]},matchText:'需求能源 1 以下的其他角色'},
  {id:'TTG-1-052',energy:2,ap:1,bp:3000,gen:1,color:'red',trigger:'active',
   type:'character',implementation:'dsl',templateEffects:{onPlay:[
    {template:'payDiscardThen',optional:true,then:[
     {template:'recoverOutsideColorUnderEnergy',color:'red',energy:2,optional:true}
    ]}
   ]},matchText:'場外需求能源2以下紅色卡'},
  {id:'TTG-1-051',energy:0,ap:1,bp:1500,gen:1,color:'red',trigger:'draw',type:'character',implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]},matchText:'抽1張'},
  {id:'TTG-1-042',energy:0,ap:1,bp:2000,gen:1,color:'red',trigger:'active',type:'character',implementation:'vanilla',effects:{},matchText:'沒有額外印刷角色效果'},
  {id:'TTG-1-043',energy:2,ap:1,bp:3000,gen:1,color:'red',trigger:'draw',type:'character',
   implementation:'dsl',impactNull:true,effects:{},matchText:'IMPACT 無效'},
  {id:'TTG-1-066',energy:2,ap:1,bp:2500,gen:1,color:'red',trigger:null,type:'character',
   implementation:'dsl',activeExtraEnergy:1,effects:{},matchText:'ACTIVE 時額外產能+1'},
  {id:'TTG-1-064',energy:0,ap:1,bp:2000,gen:1,color:'red',trigger:'draw',type:'character',implementation:'vanilla',effects:{},matchText:'無額外印刷角色效果'},
  {id:'TTG-1-065',energy:1,ap:1,bp:2500,gen:1,color:'red',trigger:null,type:'character',implementation:'vanilla',effects:{},step:true,matchText:'STEP'},
  {id:'TTG-1-072',energy:3,ap:1,bp:3500,gen:1,color:'red',trigger:'raid',type:'character',
   implementation:'dsl',raidName:'カミナ',ownTurnBp:500,
   templateEffects:{onPlay:[{template:'draw',count:1},{template:'restEnemyUnderBp',bp:3000,optional:true}]},
   matchText:'BP+500',matchTexts:['Raid 卡米那','登場抽1張','BP3000 以下']},
  {id:'TTG-1-073',energy:4,ap:1,bp:4000,gen:1,color:'red',trigger:'raid',
   type:'character',implementation:'dsl',raidName:'シモン',
   raidBaseNames:['シモン','カミナ'],raidRequiresNames:['シモン','カミナ'],
   raidFromRaid:['ラガン','グレン'],
   conditionalUnderFaceDown:{bp:1000,impact:1,leaveReplacementMinBp:500},
   templateEffects:{onPlay:[{template:'retireEnemyIfFacedown',bp:5000,optional:true}]},
   matchText:'己方場上或 Raid 底板需同時有西蒙與卡米那才可 Raid',
   matchTexts:['已 Raid 的螺巖／紅蓮頂卡','裏向','BP+1000','IMPACT 1','BP5000','BP500 以上']},
  {id:'TTG-1-078',energy:3,ap:1,bp:0,gen:0,color:'red',trigger:'final',type:'event',implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'},
  {id:'TTG-1-079',energy:3,ap:1,bp:0,gen:0,color:'red',trigger:'final',type:'event',implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'}
 ])
});
function source(title,id){
 if(title==='bleach')return CARDS.find(c=>c.identity===id);
 if(title==='gurren-lagann')return TTG_BY_ID[id];
 throw Error('Unknown pilot title');
}
export const REAL_V2_PILOT_IDS=Object.freeze(Object.fromEntries(
 Object.entries(printed).map(([k,arr])=>[k,Object.freeze(arr.map(c=>c.id))])
));
export function portVerifiedPilotCard(title,id){
 const spec=printed[title]?.find(c=>c.id===id);
 if(!spec)throw Error('Card not explicitly verified for universal V2: '+title+'/'+id);
 const c=source(title,id);
 if(!c||!c.source?.includes('/cardlist/')||c.identity!==id||
  !c.nameJa&&!c.name)throw Error('Missing official-source card record '+id);
 for(const key of ['energy','ap','bp','gen','color','trigger','type'])
  if((c[key]??null)!==(spec[key]??null))
   throw Error('Official printed '+key+' changed for '+id+'; reverify migration');
 if(spec.matchText&&!String(c.effect||'').includes(spec.matchText))
  throw Error('Printed ability changed for '+id+'; reverify migration');
 for(const part of spec.matchTexts||[])if(!String(c.effect||'').includes(part))
  throw Error('Printed ability detail changed for '+id+': '+part);
 return {
  id, name:c.nameJa||c.name,color:spec.color,type:spec.type,
  energy:spec.energy,ap:spec.ap,bp:spec.bp,gen:spec.gen,
  trigger:spec.trigger,implementation:spec.implementation,traits:Array.isArray(c.traits)?c.traits:typeof c.traits==='string'&&c.traits.trim()?[c.traits]:[],
  step:spec.step===true,raidName:spec.raidName,ownTurnBp:spec.ownTurnBp,
  activeExtraEnergy:spec.activeExtraEnergy,impactNull:spec.impactNull,
  raidBaseNames:spec.raidBaseNames,raidRequiresNames:spec.raidRequiresNames,
  raidFromRaid:spec.raidFromRaid,conditionalUnderFaceDown:spec.conditionalUnderFaceDown,
  triggerEffect:spec.triggerEffect,mainAbility:spec.mainAbility,
  effects:spec.effects,templateEffects:spec.templateEffects
 };
}
export function verifiedPilotCards(title){
 if(!printed[title])throw Error('Unknown pilot title: '+title);
 return REAL_V2_PILOT_IDS[title].map(id=>portVerifiedPilotCard(title,id));
}
export function verifiedPilotPack(title){
 return createUniversalPack({id:title,version:'v2-pilot-20261014',cards:verifiedPilotCards(title)});
}
