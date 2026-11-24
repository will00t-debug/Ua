// One step that has to satisfy every confirmed preference at once.
// A feasible step is an experiment. It is not written onto v2.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {minimize} from '../../v4b3/lib/lp.mjs';
import {keepRows,stepBounds} from '../../v4b3/lib/search.mjs';

const ANCHOR_ID='525ea92d';

function tighten(bounds,rows){
 const used=Array(bounds.length).fill(false);
 for(const row of rows){
  for(let index=0;index<bounds.length;index++){
   if(Math.abs(row.coeff[index]||0)>1e-12)used[index]=true;
  }
 }
 return bounds.map((bound,index)=>used[index]?bound:{lo:0,hi:0});
}
function holds(policy,position){
 return chooseKey(position.band,policy,SCALE)===position.keepKey;
}
function solved(parent,targets,rows,bounds){
 const answer=minimize(rows,tighten(bounds,rows));
 if(!answer.ok)return {ok:false,status:answer.status};
 const policy=parent.map((weight,index)=>weight+(answer.x[index]||0));
 for(const target of targets){
  if(!holds(policy,target))return {ok:false,status:'choice',policy,delta:answer.x};
 }
 return {ok:true,status:'kept',policy,delta:answer.x,objective:answer.objective};
}
function named(parent,delta,extraNames){
 const rows=[];
 for(let index=0;index<delta.length;index++){
  if(Math.abs(delta[index])<=1e-4)continue;
  const name=index<POLICY_NAMES.length?POLICY_NAMES[index]:extraNames[index-POLICY_NAMES.length];
  rows.push({name,before:parent[index],after:parent[index]+delta[index],delta:delta[index]});
 }
 rows.sort((left,right)=>Math.abs(right.delta)-Math.abs(left.delta));
 return rows;
}
export function jointImpact(parent,targets,guards,{extraNames=[]}={}){
 if(!targets?.length||targets.some(target=>!target?.keepKey||!target.band?.length)){
  return {ok:false,status:'missing',adopted:false,recommended:false,promoted:false};
 }
 const bounds=stepBounds(parent,{freezeHash:true});
 let targetRows=[];
 for(const target of targets){
  const rows=keepRows(parent,target.band,target.keepKey);
  if(!rows)return {ok:false,status:'missing',adopted:false,recommended:false,promoted:false};
  targetRows=targetRows.concat(rows);
 }
 const alone=solved(parent,targets,targetRows,bounds);
 if(!alone.ok){
  return {ok:false,status:alone.status==='choice'?'target-choice':'target-infeasible',adopted:false,recommended:false,promoted:false};
 }
 const list=(guards||[]).filter(position=>!targets.some(target=>target.id===position.id));
 const hard=list.filter(position=>String(position.id).startsWith(ANCHOR_ID)||position.hard);
 const soft=list.filter(position=>!hard.includes(position));
 let rows=targetRows.slice();
 for(const position of hard){
  const extra=keepRows(parent,position.band,position.keepKey);
  if(!extra)return {ok:false,status:'anchor-missing',adopted:false,recommended:false,promoted:false};
  rows=rows.concat(extra);
 }
 let current=solved(parent,targets,rows,bounds);
 if(!current.ok)return {ok:false,status:'anchor-infeasible',adopted:false,recommended:false,promoted:false};
 const locked=[];
 const released=[];
 let guard=0;
 while(guard++<soft.length+2){
  const pending=soft.filter(position=>!locked.includes(position)&&!released.includes(position));
  const violated=pending.filter(position=>!holds(current.policy,position));
  if(!violated.length)break;
  let progress=false;
  for(const position of violated){
   const extra=keepRows(parent,position.band,position.keepKey);
   if(!extra){released.push(position);continue;}
   const trial=solved(parent,targets,rows.concat(extra),bounds);
   if(!trial.ok){released.push(position);continue;}
   const intact=hard.every(item=>holds(trial.policy,item))
    &&locked.every(item=>holds(trial.policy,item))
    &&targets.every(item=>holds(trial.policy,item))
    &&holds(trial.policy,position);
   if(!intact){released.push(position);continue;}
   rows=rows.concat(extra);
   current=trial;
   locked.push(position);
   progress=true;
  }
  if(!progress)break;
 }
 const retry=[];
 for(const position of released){
  const extra=keepRows(parent,position.band,position.keepKey);
  if(!extra)continue;
  const trial=solved(parent,targets,rows.concat(extra),bounds);
  if(!trial.ok)continue;
  const intact=hard.every(item=>holds(trial.policy,item))
   &&locked.every(item=>holds(trial.policy,item))
   &&targets.every(item=>holds(trial.policy,item))
   &&holds(trial.policy,position);
  if(!intact)continue;
  rows=rows.concat(extra);
  current=trial;
  locked.push(position);
  retry.push(position);
 }
 const recovered=new Set(retry);
 const changed=soft.filter(position=>!holds(current.policy,position)&&!recovered.has(position)).map(position=>position.id);
 return {
  ok:true,adopted:false,recommended:false,promoted:false,
  status:changed.length?'collateral':'safe',
  objective:current.objective,delta:current.delta,policy:current.policy,
  weights:named(parent,current.delta,extraNames),
  necessary:changed,changed
 };
}
