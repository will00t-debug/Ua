// One confirmed preference at a time. Hash bins can be left unchanged.
// The step cap and the hard cap stay at their v4-B values.
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {applyStep} from '../../v4a/lib/evolve.mjs';
import {SCALE,STEP_CAP,UPDATE_GAIN} from '../../v4b/lib/protocol.mjs';
import {HASH_INDEX,blend} from './feasibility.mjs';

export function sidesOf(row){
 const preferA=row.mean>0;
 return {
  preferred:preferA?row.actionA:row.actionB,
  other:preferA?row.actionB:row.actionA,
  weight:Math.abs(row.mean)
 };
}
export function restTwoMove060Flag(row){
 const card=(row.features?.[POLICY_INDEX['card_BLC-4-060']])||0;
 let parsed=row;
 if(row.key){
  try{parsed=JSON.parse(row.key);}catch{parsed=row;}
 }
 const action=row.action||parsed;
 return action?.type==='activate'&&action?.mode==='restTwoMove'&&card>0.5?1:0;
}
export function logisticPolicy(parent,row,{freezeHash=false,scale=SCALE,gain=UPDATE_GAIN}={}){
 const pair=sidesOf(row);
 const grad=Array(parent.length).fill(0);
 let dot=0;
 for(let index=0;index<parent.length;index++){
  const diff=(pair.preferred.features[index]||0)-(pair.other.features[index]||0);
  dot+=parent[index]*diff;
  grad[index]=diff;
 }
 const margin=(pair.preferred.hard-pair.other.hard)+scale*dot;
 const need=1/(1+Math.exp(Math.max(-20,Math.min(20,margin))));
 for(let index=0;index<grad.length;index++)grad[index]=pair.weight*need*scale*grad[index];
 if(freezeHash)for(const index of HASH_INDEX)grad[index]=0;
 let peak=0;
 for(const value of grad)peak=Math.max(peak,Math.abs(value));
 const proposed=parent.slice();
 let scaleStep=0;
 if(peak>1e-8){
  scaleStep=Math.min(gain,STEP_CAP/peak);
  for(let index=0;index<proposed.length;index++)proposed[index]=parent[index]+grad[index]*scaleStep;
 }
 const applied=applyStep(parent,proposed);
 const hashMoved=HASH_INDEX.filter(index=>applied.policy[index]!==parent[index]).length;
 let largestHash=0;
 for(const index of HASH_INDEX)largestHash=Math.max(largestHash,Math.abs(applied.policy[index]-parent[index]));
 return {...applied,hashMoved,largestHash,scaleStep,peak,need,margin};
}
export function interactionAlone(parent,row){
 const pair=sidesOf(row);
 const gap=blend(pair.other,parent)-blend(pair.preferred,parent);
 const diff=restTwoMove060Flag(pair.other)-restTwoMove060Flag(pair.preferred);
 const swing=SCALE*STEP_CAP*Math.abs(diff);
 return {gap,swing,diff,clears:gap>1e-8&&swing>gap+1e-8};
}
