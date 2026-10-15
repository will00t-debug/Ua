// V2-C TTG adapter. Only shared V2 engine, no TTG-specific match reducer.
import {TTG_BY_ID} from '../ttg-builder.mjs';
import {verifiedPilotCards} from './real-card-pilots.mjs';
import {createUniversalPack} from './pack.mjs';
const additions=[
 {id:'TTG-1-005',name:'キタン',energy:0,ap:1,bp:1500,gen:1,color:'green',type:'character',trigger:'draw',impactNull:true,implementation:'dsl',effects:{},match:'IMPACT 無效'},
 {id:'TTG-1-014',name:'ニア',energy:1,ap:1,bp:1500,gen:2,color:'green',type:'character',trigger:null,implementation:'dsl',templateEffects:{onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]},match:'需求能源1以下'},
 {id:'TTG-1-019',name:'ヨーコ',energy:2,ap:1,bp:2500,gen:1,color:'green',type:'character',trigger:null,activeExtraEnergy:1,implementation:'dsl',effects:{},match:'ACTIVE'}
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
  return {...spec,traits:c.traits||[]};
 });
}
export function createTtgV2Pack(){return createUniversalPack({id:'gurren-lagann',version:'v2-c-20261015',cards:[...verifiedPilotCards('gurren-lagann'),...verifiedTtgV2Additions()]});}
