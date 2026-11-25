// Decision feasibility for the saved v4-B preferences. Reads frozen artifacts
// only. It does not play matches or change weights on disk.
import {readJson} from '../../v4a/lib/store.mjs';
import {
 HASH_INDEX,auditPair,countChanges,maxOneStep,policyAfter,preferredKeyOf,selection
} from './feasibility.mjs';
import {interactionAlone,logisticPolicy,restTwoMove060Flag} from './updates.mjs';

function extend(row){
 return {...row,features:row.features.concat([restTwoMove060Flag(row)])};
}
function methodResult(name,policy,parent,position,preferredKey,others,pool,meta={}){
 const choice=selection(position.band,policy);
 const selected=countChanges(others,parent,policy);
 const untouched=countChanges(pool,parent,policy);
 return {
  name,policy,
  targetChanged:choice===preferredKey,
  targetChoice:choice,
  collateralSelected:selected.changed,
  collateralSelectedN:selected.n,
  collateralPool:untouched.changed,
  collateralPoolN:untouched.n,
  hashMoved:meta.hashMoved||0,
  largestHash:meta.largestHash||0,
  collateralSelectedRows:selected.rows,
  collateralPoolRows:untouched.rows,
  changedWeights:meta.changed||0,
  l2:meta.l2||0,
  need:meta.need
 };
}
function interactionResult(parent,position,preferredKey){
 const band=position.band.map(extend);
 const extended=parent.concat([0]);
 const preferred=band.find(row=>row.key===preferredKey);
 const alts=band.filter(row=>row.key!==preferredKey);
 const aloneDelta=extended.map(()=>0);
 const flagGap=(preferred?restTwoMove060Flag(preferred):0)-Math.max(...alts.map(restTwoMove060Flag),0);
 aloneDelta[aloneDelta.length-1]=flagGap>=0?1.5:-1.5;
 const alonePolicy=policyAfter(extended,aloneDelta);
 const namedFrozen=[...HASH_INDEX];
 const joint=maxOneStep(extended,preferred,alts,{frozen:namedFrozen});
 const jointPolicy=policyAfter(extended,joint.delta);
 const open=maxOneStep(extended,preferred,alts);
 const openPolicy=policyAfter(extended,open.delta);
 let openHash=0;
 for(const index of HASH_INDEX)openHash=Math.max(openHash,Math.abs((openPolicy[index]||0)-(parent[index]||0)));
 return {
  aloneChoice:selection(band,alonePolicy),
  jointChoice:selection(band,jointPolicy),
  jointMargin:joint.minMargin,
  hashStays:HASH_INDEX.every(index=>jointPolicy[index]===parent[index]),
  openChoice:selection(band,openPolicy),
  openHash
 };
}
export function analyzePreference(parent,position,row,others,pool){
 const preferredKey=preferredKeyOf(row);
 const verdict=auditPair(parent,position,preferredKey);
 const original=logisticPolicy(parent,row,{freezeHash:false});
 const named=logisticPolicy(parent,row,{freezeHash:true});
 const methods=[
  methodResult('原本的單筆 logistic',original.policy,parent,position,preferredKey,others,pool,original),
  methodResult('凍結 h0–h7 的 logistic',named.policy,parent,position,preferredKey,others,pool,named)
 ];
 const interaction=interactionResult(parent,position,preferredKey);
 const alone=interactionAlone(parent,row);
 return {id:row.id,bucket:row.bucket,opponent:row.opponent,n:row.n,mean:row.mean,preferredKey,verdict,methods,alone,interaction};
}
export function loadAuditInputs(root='training/white-sword-ai/v4b'){
 const judged=readJson(root+'/judgments.json',[]);
 const selected=readJson(root+'/selected.json',{positions:[]}).positions;
 const pool=readJson(root+'/pool.json',{positions:[]}).positions;
 const before=readJson(root+'/model-before.json').policy;
 const byId=new Map(selected.map(position=>[position.id,position]));
 const usable=judged.filter(row=>row.usable&&byId.has(row.id));
 return {judged,selected,pool,before,usable,byId};
}
export function analyzeSaved(root='training/white-sword-ai/v4b'){
 const data=loadAuditInputs(root);
 const selectedIds=new Set(data.selected.map(item=>item.id));
 const rows=data.usable.map(row=>{
  const position=data.byId.get(row.id);
  const others=data.selected.filter(item=>item.id!==row.id);
  const pool=data.pool.filter(item=>!selectedIds.has(item.id)&&(item.band||[]).length>=2);
  return analyzePreference(data.before,position,row,others,pool);
 });
 return {rows,selected:data.selected.length,pool:data.pool.length,before:data.before,byId:data.byId,usable:data.usable};
}
