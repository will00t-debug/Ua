// Compare the registered representations. The raid check is a hard constraint, not one returned vertex.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {jointImpact} from '../../v4b8/lib/joint.mjs';
import {hardFeasible} from './feasible.mjs';

function mark(item){
 return item?{...item,hard:true}:null;
}
function holds(policy,item){
 return !item||chooseKey(item.band,policy,SCALE)===item.keepKey;
}
function named(parent,delta,extraNames){
 const rows=[];
 for(let index=0;index<(delta||[]).length;index++){
  if(Math.abs(delta[index])<=1e-4)continue;
  const name=index<POLICY_NAMES.length?POLICY_NAMES[index]:extraNames[index-POLICY_NAMES.length];
  rows.push({name,before:parent[index]||0,after:(parent[index]||0)+delta[index],delta:delta[index]});
 }
 rows.sort((left,right)=>Math.abs(right.delta)-Math.abs(left.delta));
 return rows;
}
function hardOnly(parent,source,names){
 return {
  ok:true,status:'hard-only',adopted:false,recommended:false,promoted:false,
  policy:source.policy,delta:source.delta,objective:source.objective,
  weights:named(parent,source.delta,names),changed:[],necessary:[]
 };
}
export function runRepresentation(parent,{targets,anchor,raid,front,soft,names=[]}){
 const hardAnchor=mark(anchor);
 const hardRaid=mark(raid);
 const hardFront=mark(front);
 const required=[hardAnchor,...(hardFront?[hardFront]:[])];
 const targetsOnly=hardFeasible(parent,targets,[hardAnchor]);
 const withFront=hardFront?hardFeasible(parent,targets,required):targetsOnly;
 const withRaid=withFront.ok?hardFeasible(parent,targets,[...required,hardRaid]):{ok:false,status:'skipped'};
 const raidRequired=targetsOnly.ok===true&&withFront.ok===true&&withRaid.ok!==true;
 let fit;
 if(withRaid.ok)fit=jointImpact(parent,targets,[hardRaid,...required,...(soft||[])],{extraNames:names});
 else if(withFront.ok)fit=jointImpact(parent,targets,[...required,...(soft||[])],{extraNames:names});
 else fit={ok:false,status:targetsOnly.ok?'front-infeasible':'target-infeasible',adopted:false,recommended:false,promoted:false};
 const intact=fit?.ok&&holds(fit.policy,hardAnchor)&&holds(fit.policy,hardFront)&&holds(fit.policy,withRaid.ok?hardRaid:null)&&targets.every(target=>holds(fit.policy,target));
 if(fit?.ok&&!intact){
  const source=withRaid.ok?withRaid:withFront;
  fit=source.ok?hardOnly(parent,source,names):{ok:false,status:'choice',adopted:false,recommended:false,promoted:false};
 }
 if(withRaid.ok&&!fit.ok&&withRaid.policy)fit=hardOnly(parent,withRaid,names);
 const keepsRaid=!!(fit?.ok&&holds(fit.policy,hardRaid));
 return {
  targetsOk:targetsOnly.ok===true,
  frontOk:withFront.ok===true,
  raidOk:withRaid.ok===true,
  raidRequired,keepsRaid,
  fit
 };
}
export function scoreFixed(policy,checks){
 return (checks||[]).map(check=>({
  id:check.id,label:check.label,
  kept:chooseKey(check.band,policy,SCALE)===check.keepKey
 }));
}
export function pickCandidate(existing,position,previous){
 const ranked=[];
 const add=(kind,run,keepsRaid)=>{
  if(run?.frontOk&&run?.fit?.ok)ranked.push({kind,keepsRaid,raidRequired:run.raidRequired===true,fit:run.fit});
 };
 if(position?.raidOk&&position.keepsRaid)add('position-action',position,true);
 if(existing?.raidOk&&existing.keepsRaid)add('existing',existing,true);
 if(previous?.ok&&previous.keepsTargets&&previous.keepsFront&&previous.keepsRaid){
  ranked.push({kind:'v4b8',keepsRaid:true,raidRequired:false,fit:previous.fit,policy:previous.policy,names:previous.names});
 }
 if(!ranked.length){
  if(position?.frontOk&&!position.raidOk)add('position-action',position,false);
  else if(existing?.frontOk&&!existing.raidOk)add('existing',existing,false);
 }
 return ranked[0]||null;
}
