// Diagnostic-only amplification of the *learned policy delta*.
// Never modifies model weights, Hard Search safety cap, or actual action selection.
// The incumbent and candidate share the same policy feature basis.
import {dot} from './browser-model.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const GAINS=Object.freeze([1,2,4,8,16,32]);
export const PROBE_GAINS=GAINS;
function pick(rows){
 if(!rows.length)throw Error('Counterfactual probes need candidate rows');
 let best=rows[0];
 for(const row of rows.slice(1)){
  if(row.score>best.score+1e-12)best=row;
  else if(Math.abs(row.score-best.score)<=1e-12&&JSON.stringify(row.action)<JSON.stringify(best.action))best=row;
 }
 return best;
}
export function gainProbe(rows,incumbentPolicy,trainedPolicy,scale,hardAction,{gains=GAINS}={}){
 if(!Array.isArray(rows)||!rows.length)throw Error('No eligible candidates');
 if(!Array.isArray(incumbentPolicy)||!Array.isArray(trainedPolicy)||
  incumbentPolicy.length!==trainedPolicy.length)throw Error('Policy width mismatch');
 if(!Number.isFinite(scale)||scale<=0)throw Error('Scale must be positive');
 if(rows.some(row=>!Array.isArray(row.features)||row.features.length!==trainedPolicy.length||
  !Number.isFinite(row.hardScore)))throw Error('Invalid eligible row');
 const baseline=rows.map(row=>({
  action:row.action,score:row.hardScore+scale*dot(incumbentPolicy,row.features),
  hardScore:row.hardScore
 }));
 const reference=pick(baseline);
 const baseScore=reference.hardScore;
 const result={reference:reference.action,gains:{}};
 for(const gain of gains){
  if(!Number.isFinite(gain)||gain<0||gain>32)throw Error('Probe gain outside [0,32]');
  const scored=rows.map((row,i)=>{
   const policyDelta=dot(trainedPolicy,row.features)-dot(incumbentPolicy,row.features);
   return {...baseline[i],score:baseline[i].score+scale*gain*policyDelta};
  });
  const picked=pick(scored);
  const switched=!same(picked.action,reference.action);
  result.gains[String(gain)]={
   switched,action:picked.action,
   hardLoss:baseScore-picked.hardScore,
   hardAnchorLoss:rows.find(row=>same(row.action,hardAction))?.hardScore-picked.hardScore,
   margin:scored.length>1?picked.score-Math.max(...scored.filter(row=>row!==picked).map(row=>row.score)):null
  };
 }
 return result;
}
