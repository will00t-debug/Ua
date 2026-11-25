// The acceptance rule is JOINT_RULE. This file only applies that order.
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {withZeros} from '../../v4b6/lib/expand.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {jointImpact} from './joint.mjs';
import {attachMeasured,uncovered} from './measure.mjs';
import {
 CARD_LINE_INTERACTIONS,JOINT_RULE,POSITION_INTERACTIONS,assertJointRule
} from './protocol.mjs';

const ANCHOR_ID='525ea92d';
const RAID_ID='1fbdc61d55fa7f09';

function guardsOf(parent,targets,guards){
 const skip=new Set(targets.map(target=>target.id));
 return (guards||[]).filter(position=>position?.band?.length>=2&&!skip.has(position.id)).map(position=>({
  id:position.id,
  hard:String(position.id).startsWith(ANCHOR_ID),
  keepKey:chooseKey(position.band,parent,SCALE),
  band:position.band
 }));
}
function targetsOf(targets){
 return targets.map(position=>({id:position.id,keepKey:position.actionB.key,band:position.band}));
}
function publicResult(result,names){
 if(!result)return null;
 return {
  ok:result.ok===true,status:result.status,adopted:false,recommended:false,promoted:false,
  objective:result.objective??null,
  weights:result.weights||[],
  changed:result.changed||[],
  necessary:result.necessary||[],
  releasedRaid:(result.changed||[]).some(id=>String(id).startsWith(RAID_ID)),
  names
 };
}
function widen(parent,targets,guards,contexts,names){
 const missing=[];
 const extendedTargets=[];
 for(const position of targets){
  const context=contexts.get(position.id);
  const holes=uncovered(position,context);
  if(holes.length){
   missing.push({id:position.id,role:'target',count:holes.length});
   continue;
  }
  const attached=attachMeasured(position.band,context.actions,names);
  if(!attached.ok)missing.push({id:position.id,role:'target',count:attached.missing.length});
  else extendedTargets.push({id:position.id,keepKey:position.actionB.key,band:attached.band});
 }
 const extendedGuards=[];
 for(const position of guards){
  if(targets.some(target=>target.id===position.id))continue;
  const context=contexts.get(position.id);
  const holes=uncovered(position,context);
  if(holes.length){
   missing.push({id:position.id,role:'guard',count:holes.length});
   continue;
  }
  const attached=attachMeasured(position.band,context.actions,names);
  if(!attached.ok)missing.push({id:position.id,role:'guard',count:attached.missing.length});
  else extendedGuards.push({
   id:position.id,
   hard:String(position.id).startsWith(ANCHOR_ID),
   keepKey:chooseKey(position.band,parent,SCALE),
   band:attached.band
  });
 }
 if(missing.length){
  return {public:{ok:false,status:'unmeasured',adopted:false,missing,names},result:null};
 }
 const wide=withZeros(parent,names);
 for(const position of extendedGuards){
  if(chooseKey(position.band,wide,SCALE)!==position.keepKey){
   return {public:{ok:false,status:'zero-shifted',adopted:false,id:position.id,names},result:null};
  }
 }
 const result=jointImpact(wide,extendedTargets,extendedGuards,{extraNames:names});
 return {public:publicResult(result,names),result};
}
export function evaluateJoint(parent,targets,guards,contexts=new Map()){
 assertJointRule();
 if(targets?.length!==2||targets.some(position=>!position?.actionB?.key)){
  return {rule:JOINT_RULE.id,candidate:null,stages:{existing:publicResult({ok:false,status:'missing'},[])}};
 }
 const existing=jointImpact(parent,targetsOf(targets),guardsOf(parent,targets,guards));
 const stages={existing:publicResult(existing,[])};
 if(existing.ok){
  return {rule:JOINT_RULE.id,representation:'existing',candidate:stages.existing,stages};
 }
 const position=widen(parent,targets,guards,contexts,POSITION_INTERACTIONS);
 stages.position=position.public;
 if(position.result?.ok){
  return {rule:JOINT_RULE.id,representation:'position-action',candidate:stages.position,stages};
 }
 if(position.public?.status==='unmeasured'||position.public?.status==='zero-shifted'){
  return {rule:JOINT_RULE.id,representation:'blocked',candidate:null,stages};
 }
 const full=widen(parent,targets,guards,contexts,[...POSITION_INTERACTIONS,...CARD_LINE_INTERACTIONS]);
 stages.full=full.public;
 return {
  rule:JOINT_RULE.id,
  representation:full.result?.ok?'registered-interactions':'none',
  candidate:full.result?.ok?stages.full:null,
  stages
 };
}
