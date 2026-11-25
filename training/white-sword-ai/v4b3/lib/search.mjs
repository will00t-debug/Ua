// Minimum-impact step inside the existing box.
// The ray along one feature difference is only a comparison, not the search.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {blendScore,chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {HASH_INDEX} from '../../v4b1/lib/feasibility.mjs';
import {SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {minimize} from './lp.mjs';

const EPS=1e-6;

export function stepBounds(parent,{freezeHash=true}={}){
 const frozen=new Set(freezeHash?HASH_INDEX:[]);
 return parent.map((weight,index)=>{
  if(frozen.has(index))return {lo:0,hi:0};
  const down=Math.min(STEP_CAP,weight+WEIGHT_CLIP);
  const up=Math.min(STEP_CAP,WEIGHT_CLIP-weight);
  return {lo:-Math.max(0,down),hi:Math.max(0,up)};
 });
}
export function keepRows(parent,band,keepKey,scale=SCALE){
 const keep=band.find(row=>row.key===keepKey);
 if(!keep)return null;
 const rows=[];
 for(const alt of band){
  if(alt.key===keepKey)continue;
  let margin=keep.hard-alt.hard;
  const coeff=Array(parent.length).fill(0);
  for(let index=0;index<parent.length;index++){
   const diff=(keep.features[index]||0)-(alt.features[index]||0);
   margin+=parent[index]*scale*diff;
   coeff[index]=scale*diff;
  }
  rows.push({coeff,rhs:EPS-margin});
 }
 return rows;
}
function add(parent,delta){
 return parent.map((weight,index)=>weight+(delta[index]||0));
}
function nonzero(delta){
 const rows=[];
 for(let index=0;index<delta.length;index++){
  if(Math.abs(delta[index])>1e-4)rows.push({name:POLICY_NAMES[index],delta:delta[index]});
 }
 rows.sort((left,right)=>Math.abs(right.delta)-Math.abs(left.delta));
 return rows;
}
function tighten(bounds,rows){
 const used=Array(bounds.length).fill(false);
 for(const row of rows){
  for(let index=0;index<bounds.length;index++){
   if(Math.abs(row.coeff[index]||0)>1e-12)used[index]=true;
  }
 }
 return bounds.map((bound,index)=>used[index]?bound:{lo:0,hi:0});
}
function solvedChoice(parent,band,keepKey,rows,bounds){
 const solved=minimize(rows,tighten(bounds,rows));
 if(!solved.ok)return {ok:false,status:solved.status};
 const policy=add(parent,solved.x);
 if(chooseKey(band,policy,SCALE)!==keepKey)return {ok:false,status:'choice',delta:solved.x,policy};
 return {ok:true,status:'kept',delta:solved.x,policy,objective:solved.objective};
}
export function selectionAudit(policy,band,preferredKey,otherKey){
 const chosen=chooseKey(band,policy,SCALE);
 const preferred=band.find(row=>row.key===preferredKey);
 const other=band.find(row=>row.key===otherKey);
 const left=preferred?blendScore(preferred.hard,policy,preferred.features,SCALE):-Infinity;
 const right=other?blendScore(other.hard,policy,other.features,SCALE):Infinity;
 const pair=left>right+1e-9;
 return {chosen,pair,third:pair&&chosen!==preferredKey};
}
export function fitTarget(parent,band,keepKey,{freezeHash=true}={}){
 const rows=keepRows(parent,band,keepKey);
 if(!rows)return {ok:false,status:'missing'};
 return solvedChoice(parent,band,keepKey,rows,stepBounds(parent,{freezeHash}));
}
export function keepsAll(parent,target,extras,{freezeHash=true}={}){
 const rows=keepRows(parent,target.band,target.keepKey);
 if(!rows)return {ok:false,status:'missing'};
 const bounds=stepBounds(parent,{freezeHash});
 let combined=rows;
 for(const position of extras||[]){
  const extra=keepRows(parent,position.band,position.keepKey);
  if(!extra)return {ok:false,status:'missing'};
  combined=combined.concat(extra);
 }
 return solvedChoice(parent,target.band,target.keepKey,combined,bounds);
}
function holds(parent,policy,position){
 return chooseKey(position.band,policy,SCALE)===position.keepKey;
}
export function minimumImpact(parent,target,positions,{freezeHash=true}={}){
 const bounds=stepBounds(parent,{freezeHash});
 const targetRows=keepRows(parent,target.band,target.keepKey);
 if(!targetRows)return {ok:false,status:'missing'};
 const alone=solvedChoice(parent,target.band,target.keepKey,targetRows,bounds);
 if(!alone.ok)return {ok:false,status:alone.status==='choice'?'target-choice':'target-infeasible'};
 const hard=(positions||[]).filter(position=>position.hard);
 const soft=(positions||[]).filter(position=>!position.hard);
 let rows=targetRows.slice();
 for(const position of hard){
  const extra=keepRows(parent,position.band,position.keepKey);
  if(!extra)return {ok:false,status:'anchor-missing'};
  rows=rows.concat(extra);
 }
 let solved=solvedChoice(parent,target.band,target.keepKey,rows,bounds);
 if(!solved.ok)return {ok:false,status:'anchor-infeasible',alone};
 const locked=[];
 const released=[];
 let guard=0;
 while(guard++<soft.length+2){
  const pending=soft.filter(position=>!locked.includes(position)&&!released.includes(position));
  const violated=pending.filter(position=>!holds(parent,solved.policy,position));
  if(!violated.length)break;
  let progress=false;
  for(const position of violated){
   const extra=keepRows(parent,position.band,position.keepKey);
   if(!extra){released.push(position);continue;}
   const trial=solvedChoice(parent,target.band,target.keepKey,rows.concat(extra),bounds);
   if(!trial.ok){released.push(position);continue;}
   const intact=hard.every(item=>holds(parent,trial.policy,item))
    &&locked.every(item=>holds(parent,trial.policy,item))
    &&holds(parent,trial.policy,position);
   if(!intact){released.push(position);continue;}
   rows=rows.concat(extra);
   solved=trial;
   locked.push(position);
   progress=true;
  }
  if(!progress)break;
 }
 const retry=[];
 for(const position of released){
  const extra=keepRows(parent,position.band,position.keepKey);
  if(!extra)continue;
  const trial=solvedChoice(parent,target.band,target.keepKey,rows.concat(extra),bounds);
  if(!trial.ok)continue;
  const intact=hard.every(item=>holds(parent,trial.policy,item))
   &&locked.every(item=>holds(parent,trial.policy,item))
   &&holds(parent,trial.policy,position);
  if(!intact)continue;
  rows=rows.concat(extra);
  solved=trial;
  locked.push(position);
  retry.push(position);
 }
 const still=new Set(retry);
 const remaining=released.filter(position=>!still.has(position));
 const necessary=[];
 const conditional=[];
 for(const position of remaining){
  const extra=keepRows(parent,position.band,position.keepKey)||[];
  const trial=solvedChoice(parent,target.band,target.keepKey,targetRows.concat(hard.flatMap(item=>keepRows(parent,item.band,item.keepKey)||[]),extra),bounds);
  const kept=trial.ok&&holds(parent,trial.policy,position)&&hard.every(item=>holds(parent,trial.policy,item));
  if(kept)conditional.push(position.id);
  else necessary.push(position.id);
 }
 const changed=soft.filter(position=>!holds(parent,solved.policy,position)).map(position=>position.id);
 return {
  ok:true,
  status:changed.length?'impact':'zero-impact',
  delta:solved.delta,
  policy:solved.policy,
  objective:solved.objective,
  weights:nonzero(solved.delta),
  necessary,conditional,changed
 };
}
