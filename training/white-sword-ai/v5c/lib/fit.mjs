// Each new column is fit alone. The sum is checked again and is not assumed to add.
import {blendScore,chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {HARD_CAP,SCALE,WEIGHT_CLIP,signedSteps} from './protocol.mjs';

function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
export function indicatesRow(row,column){
 const body=parsed(row?.key);
 if(!column||body.type!==column.type||(body.line||null)!==(column.line||null))return 0;
 return cardsOf(row.features).includes(column.card)?1:0;
}
export function choiceColumns(band,weights,columns){
 if(!band?.length)return null;
 const score=row=>{
  let bonus=0;
  for(const column of columns||[])bonus+=(column.weight||0)*indicatesRow(row,column);
  return blendScore(row.hard,weights,row.features,SCALE)+SCALE*bonus;
 };
 let best=band[0];
 let bestScore=score(best);
 for(const row of band.slice(1)){
  const value=score(row);
  const left=row.sort||row.key;
  const right=best.sort||best.key;
  if(value>bestScore+1e-12||(Math.abs(value-bestScore)<=1e-12&&left<right)){
   best=row;
   bestScore=value;
  }
 }
 return best.key;
}
export function evaluate(positions,weights,columns,wants,holds){
 const byId=new Map((positions||[]).map(position=>[position.id,position]));
 const wantIds=new Set((wants||[]).map(want=>want.id));
 const wantRows=(wants||[]).map(want=>{
  const position=byId.get(want.id);
  const chosen=position?choiceColumns(position.band,weights,columns):null;
  const row=position?.band?.find(item=>item.key===want.key);
  const top=position?.band?.length?Math.max(...position.band.map(item=>item.hard)):null;
  const gap=row&&top!=null?top-row.hard:null;
  return {id:want.id,key:want.key,ok:chosen===want.key,missing:!position||!row,gap};
 });
 const holdRows=(holds||[]).map(id=>{
  const position=byId.get(id);
  if(!position?.band)return {id,same:false,missing:true};
  const before=chooseKey(position.band,weights,SCALE);
  const after=choiceColumns(position.band,weights,columns);
  return {id,same:before===after,missing:false};
 });
 let collateral=0;
 for(const position of positions||[]){
  if(!position?.band||position.band.length<2)continue;
  const before=chooseKey(position.band,weights,SCALE);
  const after=choiceColumns(position.band,weights,columns);
  if(before!==after&&!wantIds.has(position.id))collateral++;
 }
 const ok=wantRows.length>0&&wantRows.every(row=>row.ok&&row.gap!=null&&row.gap<=HARD_CAP+1e-6)&&holdRows.every(row=>row.same);
 return {ok,wants:wantRows,holds:holdRows,collateral};
}
export function minimumMagnitude(positions,weights,column,wants,holds){
 const at=magnitude=>evaluate(positions,weights,[{...column,weight:column.sign*magnitude}],wants,holds).ok;
 if(at(0))return null;
 if(!at(WEIGHT_CLIP))return null;
 let low=0;
 let high=WEIGHT_CLIP;
 for(let step=0;step<60;step++){
  const mid=(low+high)/2;
  if(at(mid))high=mid;
  else low=mid;
 }
 const weight=column.sign*high;
 const result=evaluate(positions,weights,[{...column,weight}],wants,holds);
 return {...result,weight,steps:signedSteps(weight)};
}
function scoreLead(position,weights,key){
 const chosen=chooseKey(position?.band,weights,SCALE);
 const want=position?.band?.find(row=>row.key===key);
 const have=position?.band?.find(row=>row.key===chosen);
 if(!want||!have)return null;
 return blendScore(have.hard,weights,have.features||[],SCALE)-blendScore(want.hard,weights,want.features||[],SCALE);
}
function reasonFor(positions,weights,result){
 if(result.wants.some(row=>row.missing))return '偏好動作不在儲存的候選裡';
 if(result.wants.some(row=>row.gap==null||row.gap>HARD_CAP+1e-6))return '偏好動作的硬分差距超過 7';
 if(result.wants.every(row=>row.ok)&&result.holds.some(row=>!row.same))return '會改動已經要保護的選擇';
 const failed=result.wants.find(row=>!row.ok);
 const position=(positions||[]).find(item=>item.id===failed?.id);
 const lead=position?scoreLead(position,weights,failed.key):null;
 if(lead!=null)return 'v2 原評分領先 '+lead.toFixed(1)+' 分，單欄最多加減 '+(SCALE*WEIGHT_CLIP)+' 分，到邊界仍選不到';
 return '權重到邊界仍無法讓偏好成為首選';
}
export function fitColumns(positions,weights,columns,holdIds){
 const accepted=[];
 const rejected=[];
 for(const column of columns||[]){
  const wants=(column.targets||[]).map(target=>({id:target.id,key:target.key}));
  const found=minimumMagnitude(positions,weights,column,wants,holdIds);
  if(!found?.ok){
   const full=evaluate(positions,weights,[{...column,weight:column.sign*WEIGHT_CLIP}],wants,holdIds);
   rejected.push({signature:column.signature,reason:reasonFor(positions,weights,full)});
  }else accepted.push({...column,weight:found.weight,steps:found.steps,collateral:found.collateral});
 }
 return {accepted,rejected};
}
export function combine(positions,weights,accepted,control){
  const columns=[
   {...control.column,weight:control.weight},
   ...(accepted||[]).map(column=>({...column}))
  ];
  const wants=[...(control.wants||[]),...(accepted||[]).flatMap(column=>(column.targets||[]).map(target=>({id:target.id,key:target.key})))];
  const result=evaluate(positions,weights,columns,wants,control.holds||[]);
  return {ok:!!accepted?.length&&result.ok,columns,wants:result.wants,holds:result.holds,collateral:result.collateral};
}
export function diagnosticModel(accepted,combination){
 if(!accepted?.length)return null;
 if(combination?.ok)return {id:'combination',includes070:true,columns:combination.columns};
 if(accepted.length===1)return {id:accepted[0].signature,includes070:false,columns:[accepted[0]]};
 return null;
}
