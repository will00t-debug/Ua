// First real-card V2 pilots. Every ID is manually allowed and tied to actual
// Japanese printed characteristics; legacy "auto" flags cannot grant V2 support.
// Incomplete sets intentionally cannot form legal 50-card all-real decks yet.
import {CARDS} from '../cards.mjs?v=9.1.0';
import {TTG_BY_ID} from '../ttg-builder.mjs';
import {createUniversalPack} from './pack.mjs';

const printed=Object.freeze({
 bleach:Object.freeze([
  {id:'BLC-1-034',energy:0,ap:1,bp:1500,gen:1,color:'purple',trigger:'draw',type:'character',implementation:'dsl',effects:{onPlay:[{op:'drawDiscard',count:1}]},matchText:'抽 1 張'},
  {id:'BLC-1-039',energy:0,ap:1,bp:1500,gen:1,color:'purple',trigger:'get',type:'character',implementation:'vanilla',effects:{}},
  {id:'BLC-1-066',energy:3,ap:1,bp:0,gen:0,color:'purple',trigger:'final',type:'event',implementation:'dsl',effects:{onPlay:[{op:'recoverAp',count:2}]},matchText:'回復最多 2 AP'},
  {id:'BLC-1-102',energy:3,ap:1,bp:3000,gen:2,color:'purple',trigger:'active',type:'character',implementation:'vanilla',effects:{},matchText:'產生 2 紫能源'},
  {id:'BLC-1-103',energy:3,ap:1,bp:3000,gen:2,color:'purple',trigger:null,type:'character',implementation:'dsl',effects:{onAttack:[{op:'buffSelf',bp:1000}]},matchText:'攻擊時'},
  {id:'BLC-1-107',energy:0,ap:1,bp:2000,gen:1,color:'purple',trigger:null,type:'character',implementation:'vanilla',effects:{}},
 ]),
 'gurren-lagann':Object.freeze([
  {id:'TTG-1-009',energy:0,ap:1,bp:1500,gen:1,color:'green',trigger:'draw',type:'character',implementation:'dsl',effects:{onPlay:[{op:'drawDiscard',count:1}]},matchText:'抽1張'},
  {id:'TTG-1-036',energy:3,ap:1,bp:0,gen:0,color:'green',trigger:'final',type:'event',implementation:'dsl',effects:{onPlay:[{op:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'},
  {id:'TTG-1-037',energy:3,ap:1,bp:0,gen:0,color:'green',trigger:'final',type:'event',implementation:'dsl',effects:{onPlay:[{op:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'},
  {id:'TTG-1-038',energy:3,ap:1,bp:0,gen:0,color:'green',trigger:'final',type:'event',implementation:'dsl',effects:{onPlay:[{op:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'},
  {id:'TTG-1-051',energy:0,ap:1,bp:1500,gen:1,color:'red',trigger:'draw',type:'character',implementation:'dsl',effects:{onPlay:[{op:'drawDiscard',count:1}]},matchText:'抽1張'},
  {id:'TTG-1-042',energy:0,ap:1,bp:2000,gen:1,color:'red',trigger:'active',type:'character',implementation:'vanilla',effects:{},matchText:'沒有額外印刷角色效果'},
  {id:'TTG-1-064',energy:0,ap:1,bp:2000,gen:1,color:'red',trigger:'draw',type:'character',implementation:'vanilla',effects:{},matchText:'無額外印刷角色效果'},
  {id:'TTG-1-065',energy:1,ap:1,bp:2500,gen:1,color:'red',trigger:null,type:'character',implementation:'vanilla',effects:{},step:true,matchText:'STEP'},
  {id:'TTG-1-078',energy:3,ap:1,bp:0,gen:0,color:'red',trigger:'final',type:'event',implementation:'dsl',effects:{onPlay:[{op:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'},
  {id:'TTG-1-079',energy:3,ap:1,bp:0,gen:0,color:'red',trigger:'final',type:'event',implementation:'dsl',effects:{onPlay:[{op:'recoverAp',count:2}]},matchText:'選擇最多2張自己的 AP 卡'}
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
 return {
  id, name:c.nameJa||c.name,color:spec.color,type:spec.type,
  energy:spec.energy,ap:spec.ap,bp:spec.bp,gen:spec.gen,
  trigger:spec.trigger,implementation:spec.implementation,
  step:spec.step===true,effects:spec.effects
 };
}
export function verifiedPilotCards(title){
 if(!printed[title])throw Error('Unknown pilot title: '+title);
 return REAL_V2_PILOT_IDS[title].map(id=>portVerifiedPilotCard(title,id));
}
export function verifiedPilotPack(title){
 return createUniversalPack({id:title,version:'v2-pilot-20261014',cards:verifiedPilotCards(title)});
}
