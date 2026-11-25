// One bounded update from paired action values.
// The step follows the labeled preference. A matched-length gaussian step is
// only a control, and it is never saved as the model.
import {POLICY_DIM,POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {cloneModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {applyStep,gaussian,mulberry32} from '../../v4a/lib/evolve.mjs';
import {blendScore} from '../../v4a2/lib/sensitivity.mjs';
import {SCALE,STEP_CAP,UPDATE_GAIN} from './protocol.mjs';

function dot(weights,features){
 let score=0;
 for(let index=0;index<weights.length;index++)score+=weights[index]*(features[index]||0);
 return score;
}
function preferenceOf(row){
 if(row.usable!==true){
  const error=Error('證據不足的分支不能進入更新');
  error.code='V4B_EVIDENCE';
  throw error;
 }
 const preferA=row.mean>0;
 return {
  preferred:preferA?row.actionA:row.actionB,
  other:preferA?row.actionB:row.actionA,
  weight:Math.abs(row.mean)
 };
}
export function agrees(policy,pair,scale=SCALE){
 const item=pair.preferred?pair:preferenceOf(pair);
 const left=blendScore(item.preferred.hard,policy,item.preferred.features,scale);
 const right=blendScore(item.other.hard,policy,item.other.features,scale);
 return left>right+1e-9;
}
export function agreementRate(policy,rows,scale=SCALE){
 const usable=(rows||[]).filter(row=>row.usable===true);
 if(!usable.length)return {n:0,rate:null};
 const hits=usable.filter(row=>agrees(policy,row,scale)).length;
 return {n:usable.length,hits,rate:hits/usable.length};
}
export function updateFromPreferences(parent,rows,{scale=SCALE,gain=UPDATE_GAIN}={}){
 if(!parent||parent.length!==POLICY_DIM)throw Error('policy width drifted');
 const usable=(rows||[]).filter(row=>row.usable===true);
 if(!usable.length)return {policy:parent.slice(),changed:0,l2:0,usable:0,deltas:[]};
 const grad=Array(POLICY_DIM).fill(0);
 for(const row of usable){
  const pair=preferenceOf(row);
  const direction=pair.preferred.features.map((value,index)=>value-(pair.other.features[index]||0));
  const margin=(pair.preferred.hard-pair.other.hard)+scale*dot(parent,direction);
  const need=1/(1+Math.exp(Math.max(-20,Math.min(20,margin))));
  for(let index=0;index<POLICY_DIM;index++)grad[index]+=pair.weight*need*scale*direction[index];
 }
 let peak=0;
 for(const value of grad)peak=Math.max(peak,Math.abs(value));
 const proposed=parent.slice();
 if(peak>1e-8){
  const scaleStep=Math.min(gain,STEP_CAP/peak);
  for(let index=0;index<proposed.length;index++)proposed[index]=parent[index]+grad[index]*scaleStep;
 }
 const stepped=applyStep(parent,proposed);
 const deltas=[];
 for(let index=0;index<parent.length;index++){
  const delta=stepped.policy[index]-parent[index];
  if(delta)deltas.push({name:POLICY_NAMES[index],index,before:parent[index],after:stepped.policy[index],delta});
 }
 deltas.sort((left,right)=>Math.abs(right.delta)-Math.abs(left.delta));
 return {...stepped,usable:usable.length,deltas};
}
export function controlBeats(learnedRate,controlRates){
 const rates=(controlRates||[]).filter(Number.isFinite).sort((left,right)=>left-right);
 if(!rates.length||!Number.isFinite(learnedRate))return {ok:false,median:null,rates};
 const median=rates[Math.floor((rates.length-1)/2)];
 return {ok:learnedRate>median,median,rates};
}
export function matchedGaussian(parent,targetL2,salt){
 const rng=mulberry32(salt>>>0);
 const noise=parent.map(()=>gaussian(rng));
 let norm=0;
 for(const value of noise)norm+=value*value;
 norm=Math.sqrt(norm);
 const proposed=parent.slice();
 if(norm>1e-8&&targetL2>0){
  for(let index=0;index<proposed.length;index++)proposed[index]=parent[index]+noise[index]*(targetL2/norm);
 }
 return applyStep(parent,proposed).policy;
}
export function modelFromPolicy(parent,policy,version){
 const model=cloneModel(parent);
 model.policy=policy.slice();
 model.promoted=false;
 model.promotion=null;
 model.version=version;
 model.updates=(parent.updates||0)+1;
 model.v4b={kind:'action-value',production:false,deployed:false,learned:true};
 return model;
}
