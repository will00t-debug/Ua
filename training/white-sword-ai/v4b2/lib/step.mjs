// Smallest step along the named-feature difference that changes the choice.
// Hash bins stay put. The step never exceeds the existing 1.5 cap.
import {POLICY_DIM} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {applyStep} from '../../v4a/lib/evolve.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {HASH_INDEX} from '../../v4b1/lib/feasibility.mjs';
import {SCALE,STEP_CAP,WEIGHT_CLIP} from './protocol.mjs';

const HASH=new Set(HASH_INDEX);

function directionOf(preferred,other){
 const direction=Array(preferred.features.length).fill(0);
 for(let index=0;index<direction.length;index++){
  if(HASH.has(index))continue;
  direction[index]=(preferred.features[index]||0)-(other.features[index]||0);
 }
 return direction;
}
function room(parent,index,sign){
 if(sign>0)return Math.min(STEP_CAP,WEIGHT_CLIP-parent[index]);
 if(sign<0)return Math.min(STEP_CAP,parent[index]+WEIGHT_CLIP);
 return 0;
}
export function fullNamedDelta(parent,preferred,other){
 if(!parent||parent.length!==POLICY_DIM)throw Error('policy width drifted');
 const direction=directionOf(preferred,other);
 let scale=Infinity;
 let coords=0;
 for(let index=0;index<direction.length;index++){
  if(!direction[index])continue;
  coords++;
  const span=room(parent,index,direction[index]);
  if(span<=1e-12)return {delta:parent.map(()=>0),coords,blocked:true};
  scale=Math.min(scale,span/Math.abs(direction[index]));
 }
 if(!coords||!Number.isFinite(scale))return {delta:parent.map(()=>0),coords,blocked:coords>0};
 return {delta:direction.map(value=>value*scale),coords,blocked:false};
}
function policyAt(parent,delta,alpha){
 const proposed=parent.map((weight,index)=>weight+alpha*(delta[index]||0));
 return applyStep(parent,proposed).policy;
}
export function minimumStep(parent,band,preferredKey,otherKey){
 const preferred=band.find(row=>row.key===preferredKey);
 const other=band.find(row=>row.key===otherKey);
 if(!preferred||!other)return {status:'missing',flipped:false,alpha:null,policy:parent.slice()};
 if(chooseKey(band,parent,SCALE)===preferredKey){
  return {status:'already',flipped:true,alpha:0,policy:parent.slice(),hashMoved:0,maxAbs:0};
 }
 const full=fullNamedDelta(parent,preferred,other);
 if(!full.coords)return {status:'identical',flipped:false,alpha:null,policy:parent.slice(),hashMoved:0,maxAbs:0};
 if(full.blocked)return {status:'clipped',flipped:false,alpha:null,policy:parent.slice(),hashMoved:0,maxAbs:0};
 const flipped=policy=>chooseKey(band,policy,SCALE)===preferredKey;
 if(!flipped(policyAt(parent,full.delta,1))){
  return {status:'short',flipped:false,alpha:1,policy:policyAt(parent,full.delta,1),hashMoved:0,maxAbs:maxAbs(full.delta)};
 }
 let low=0;
 let high=1;
 for(let step=0;step<40;step++){
  const mid=(low+high)/2;
  if(flipped(policyAt(parent,full.delta,mid)))high=mid;
  else low=mid;
 }
 const policy=policyAt(parent,full.delta,high);
 const delta=policy.map((weight,index)=>weight-parent[index]);
 const hashMoved=HASH_INDEX.filter(index=>delta[index]).length;
 return {status:'flipped',flipped:true,alpha:high,policy,delta,hashMoved,maxAbs:maxAbs(delta),coords:full.coords};
}
function maxAbs(delta){
 let peak=0;
 for(const value of delta||[])peak=Math.max(peak,Math.abs(value));
 return peak;
}
