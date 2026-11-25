// Repeated one-step updates, still capped at 1.5 and [-6, 6] each step.
// This is a feasibility probe. It does not write a model and it is not a
// license to accumulate steps in training.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {applyStep} from '../../v4a/lib/evolve.mjs';
import {SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b/lib/protocol.mjs';
import {HASH_INDEX,blend,countChanges,policyAfter,selection} from './feasibility.mjs';
import {groupOf} from './decompose.mjs';
import {logisticPolicy,sidesOf} from './updates.mjs';

function gapOf(policy,preferred,other){
 return blend(other,policy)-blend(preferred,policy);
}
function distance(before,after){
 let square=0;
 let maxAbs=0;
 let clip=0;
 for(let index=0;index<before.length;index++){
  const delta=after[index]-before[index];
  square+=delta*delta;
  maxAbs=Math.max(maxAbs,Math.abs(delta));
  if(Math.abs(Math.abs(after[index])-WEIGHT_CLIP)<1e-8)clip++;
 }
 return {l2:Math.sqrt(square),maxAbs,clip};
}
function largestHash(before,after){
 let value=0;
 for(const index of HASH_INDEX)value=Math.max(value,Math.abs(after[index]-before[index]));
 return value;
}
function involve060(position,beforeKey,afterKey){
 if(!position)return false;
 const band=position.band||[];
 const rows=[beforeKey,afterKey].map(key=>band.find(row=>row.key===key)).filter(Boolean);
 return rows.some(row=>{
  const card=row.features?.[POLICY_NAMES.indexOf('card_BLC-4-060')]||0;
  let type='';
  try{type=JSON.parse(row.key).type;}catch{type='';}
  return card>0.5||type==='activate'||type==='next';
 });
}
function snapshot(origin,policy,position,preferredKey,preferred,other,others,pool){
 const selected=countChanges(others,origin,policy);
 const untouched=countChanges(pool,origin,policy);
 const relation=row=>involve060(findPosition(others,pool,row.id),row.before,row.after)?'similar':'unrelated';
 const selectedRows=selected.rows.map(row=>({...row,relation:relation(row)}));
 const poolRows=untouched.rows.map(row=>({...row,relation:relation(row)}));
 const moved=distance(origin,policy);
 return {
  choice:selection(position.band,policy),
  flipped:selection(position.band,policy)===preferredKey,
  gap:gapOf(policy,preferred,other),
  collateralSelected:selected.changed,
  collateralPool:untouched.changed,
  similar:selectedRows.filter(row=>row.relation==='similar').length+poolRows.filter(row=>row.relation==='similar').length,
  unrelated:selectedRows.filter(row=>row.relation==='unrelated').length+poolRows.filter(row=>row.relation==='unrelated').length,
  selectedRows,poolRows,
  ...moved,
  largestHash:largestHash(origin,policy)
 };
}
function findPosition(others,pool,id){
 return others.find(position=>position.id===id)||pool.find(position=>position.id===id);
}
function stepToward(policy,preferred,other,{frozen=new Set(),indexes=null,magnitude=STEP_CAP}={}){
 const proposed=policy.slice();
 const allow=indexes?new Set(indexes):null;
 for(let index=0;index<policy.length;index++){
  if(frozen.has(index))continue;
  if(allow&&!allow.has(index))continue;
  const diff=(preferred.features[index]||0)-(other.features[index]||0);
  if(!diff)continue;
  const room=diff>0?Math.min(magnitude,WEIGHT_CLIP-policy[index]):-Math.min(magnitude,policy[index]+WEIGHT_CLIP);
  proposed[index]=policy[index]+room;
 }
 return applyStep(policy,proposed).policy;
}
export function repeatToward(origin,position,row,others,pool,{kind='logistic',freezeHash=false,steps=12,indexes=null}={}){
 const pair=sidesOf(row);
 const preferredKey=pair.preferred.key;
 const frozen=new Set(freezeHash?HASH_INDEX:[]);
 let policy=origin.slice();
 const trace=[];
 if(gapOf(policy,pair.preferred,pair.other)<=1e-8){
  return {kind,freezeHash,trace,flipped:true,already:true,policy,groups:groupShift(origin,policy)};
 }
 for(let step=1;step<=steps;step++){
  const next=kind==='logistic'
   ?logisticPolicy(policy,row,{freezeHash}).policy
   :stepToward(policy,pair.preferred,pair.other,{frozen,indexes});
  if(next.every((weight,index)=>weight===policy[index]))break;
  policy=next;
  const frame=snapshot(origin,policy,position,preferredKey,pair.preferred,pair.other,others,pool);
  frame.step=step;
  trace.push(frame);
  if(frame.flipped)break;
 }
 return {kind,freezeHash,trace,flipped:trace.at(-1)?.flipped||false,policy,groups:groupShift(origin,policy)};
}
function cached(positions,policy){
 return positions.filter(position=>(position.band||[]).length>=2).map(position=>({
  position,
  origin:selection(position.band,policy),
  rows:position.band.map(row=>({key:row.key,features:row.features,score:blend(row,policy)}))
 }));
}
function shiftedChoice(entry,index,delta){
 let best=null;
 let bestScore=-Infinity;
 for(const row of entry.rows){
  const score=row.score+SCALE*delta*(row.features[index]||0);
  const mark=row.sort||row.key;
 if(!best||score>bestScore+1e-12||(Math.abs(score-bestScore)<=1e-12&&mark<(best.sort||best.key))){
   best=row;
   bestScore=score;
  }
 }
 return best.key;
}
function collateralOf(cache,index,delta){
 let changed=0;
 let similar=0;
 let unrelated=0;
 for(const entry of cache){
  const key=shiftedChoice(entry,index,delta);
  if(key===entry.origin)continue;
  changed++;
  if(involve060(entry.position,entry.origin,key))similar++;
  else unrelated++;
 }
 return {changed,similar,unrelated};
}
export function safeWalk(origin,position,row,others,pool,{capSelected=1,capPool=0,freezeHash=true,steps=24,grain=0.25}={}){
 const pair=sidesOf(row);
 const preferredKey=pair.preferred.key;
 const frozen=new Set(freezeHash?HASH_INDEX:[]);
 let policy=origin.slice();
 const selectedCache=cached(others,origin);
 const poolCache=cached(pool,origin);
 const trace=[];
 let blocked=0;
 if(selection(position.band,policy)===preferredKey){
  return {flipped:true,already:true,stalled:false,blocked,trace,capSelected,capPool};
 }
 const commit=(index,delta)=>{
  for(const entry of [...selectedCache,...poolCache]){
   for(const item of entry.rows)item.score+=SCALE*delta*(item.features[index]||0);
  }
 };
 for(let step=1;step<=steps;step++){
  if(selection(position.band,policy)===preferredKey)break;
  let best=null;
  for(let index=0;index<policy.length;index++){
   if(frozen.has(index))continue;
   const diff=(pair.preferred.features[index]||0)-(pair.other.features[index]||0);
   if(!diff)continue;
   const sign=Math.sign(diff);
   for(const magnitude of [grain,0.5,1,STEP_CAP]){
    const room=sign>0?Math.min(magnitude,WEIGHT_CLIP-policy[index]):-Math.min(magnitude,policy[index]+WEIGHT_CLIP);
    if(Math.abs(room)<1e-8)continue;
    const selectedHit=collateralOf(selectedCache,index,room);
    const poolHit=collateralOf(poolCache,index,room);
    if(selectedHit.changed>capSelected||poolHit.changed>capPool){blocked++;continue;}
    const closed=SCALE*room*diff;
    if(closed<=1e-6)continue;
    if(!best||closed>best.closed+1e-9||(Math.abs(closed-best.closed)<=1e-9&&Math.abs(room)<Math.abs(best.room))){
     best={index,room,closed,name:POLICY_NAMES[index],selectedHit,poolHit};
    }
   }
  }
  if(!best)return {flipped:false,stalled:true,blocked,trace,capSelected,capPool};
  const previous=policy[best.index];
  const proposed=policy.slice();
  proposed[best.index]=previous+best.room;
  policy=applyStep(policy,proposed).policy;
  commit(best.index,policy[best.index]-previous);
  const frame=snapshot(origin,policy,position,preferredKey,pair.preferred,pair.other,others,pool);
  trace.push({step,...frame,moved:best.name,closed:best.closed});
  if(frame.flipped)return {flipped:true,stalled:false,blocked,trace,capSelected,capPool};
 }
 return {flipped:false,stalled:false,blocked,trace,capSelected,capPool};
}
export function groupShift(origin,policy){
 const out={};
 for(let index=0;index<origin.length;index++){
  const delta=policy[index]-origin[index];
  if(!delta)continue;
  const group=groupOf(POLICY_NAMES[index]);
  out[group]=out[group]||{coords:0,maxAbs:0,l2:0};
  out[group].coords++;
  out[group].maxAbs=Math.max(out[group].maxAbs,Math.abs(delta));
  out[group].l2+=delta*delta;
 }
 for(const group of Object.values(out))group.l2=Math.sqrt(group.l2);
 return out;
}
export {policyAfter,SCALE};
