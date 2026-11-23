// Analytical sensitivity of the linear blend.
// score = hard + scale * weights · features. Hard scores are a constraint,
// not a label of the correct action. Holdout rows are refused.
import {POLICY_DIM,POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {cloneModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {applyStep,gaussian,mulberry32,policyHash} from '../../v4a/lib/evolve.mjs';
import {
 CANDIDATE_COUNT,ENERGY_FEATURES,HARD_CAP,MOVE_FEATURES,SCALE,STAGE_A_GATE,STEP_CAP,WEIGHT_CLIP
} from './protocol.mjs';

export function blendScore(hard,weights,features,scale=SCALE){
 let extra=0;
 for(let i=0;i<weights.length;i++)extra+=weights[i]*(features[i]||0);
 return hard+scale*extra;
}
export function finiteDifference(weights,features,index,scale=SCALE,epsilon=1e-4){
 const plus=weights.slice();
 const minus=weights.slice();
 plus[index]+=epsilon;
 minus[index]-=epsilon;
 return (blendScore(0,plus,features,scale)-blendScore(0,minus,features,scale))/(2*epsilon);
}
export function analyticPartial(features,index,scale=SCALE){
 return scale*(features[index]||0);
}
export function chooseKey(band,weights,scale=SCALE){
 if(!band?.length)return null;
 let best=band[0];
 let bestScore=blendScore(best.hard,weights,best.features,scale);
 for(const row of band.slice(1)){
  const score=blendScore(row.hard,weights,row.features,scale);
   const left=row.sort||row.key;
   const right=best.sort||best.key;
   if(score>bestScore+1e-12||(Math.abs(score-bestScore)<=1e-12&&left<right)){
   best=row;
   bestScore=score;
  }
 }
 return best.key;
}
function clipRoom(parent,index,delta){
 const roomHi=WEIGHT_CLIP-parent[index];
 const roomLo=-WEIGHT_CLIP-parent[index];
 return Math.max(roomLo,Math.min(roomHi,Math.max(-STEP_CAP,Math.min(STEP_CAP,delta))));
}
export function flipStep(parent,best,alt,scale=SCALE){
 if(!best||!alt||best.key===alt.key)return null;
 if(parent.length!==best.features.length||best.features.length!==alt.features.length)return null;
 const gap=blendScore(best.hard,parent,best.features,scale)-blendScore(alt.hard,parent,alt.features,scale);
 if(!(gap>1e-9))return null;
 const direction=best.features.map((value,index)=>alt.features[index]-value);
 let norm=0;
 for(const value of direction)norm+=value*value;
 if(norm<1e-12)return null;
 const need=(gap+1e-6)/scale;
 const raw=direction.map(value=>value*need/norm);
 const step=raw.map((value,index)=>clipRoom(parent,index,value));
 const next=parent.map((weight,index)=>weight+step[index]);
 const after=blendScore(best.hard,next,best.features,scale)-blendScore(alt.hard,next,alt.features,scale);
 if(!(after<0))return null;
 return {step,gap,direction};
}
function indexesOf(names){
 return names.map(name=>{
  const index=POLICY_INDEX[name];
  if(!Number.isInteger(index))throw Error('缺少特徵 '+name);
  return index;
 });
}
function trainingRows(positions){
 const rows=(positions||[]).filter(row=>row&&row.holdout!==true&&(row.band||[]).length>=2);
 if((positions||[]).some(row=>row?.holdout===true&&rows.includes(row)))throw Error('holdout entered training');
 return rows;
}
function collectFlips(parent,positions,scale){
 const flips=[];
 for(const position of trainingRows(positions)){
  const current=chooseKey(position.band,parent,scale);
  const best=position.band.find(row=>row.key===current);
  if(!best)continue;
  for(const alt of position.band){
   const found=flipStep(parent,best,alt,scale);
   if(found)flips.push({...found,id:position.id,bucket:position.bucket});
  }
 }
 return flips;
}
function voteOf(flips,allowed){
 const vote=Array(POLICY_DIM).fill(0);
 const allow=allowed?new Set(allowed):null;
 for(const flip of flips){
  for(let index=0;index<POLICY_DIM;index++){
   if(allow&&!allow.has(index))continue;
   if(flip.step[index]>1e-6)vote[index]+=1;
   else if(flip.step[index]<-1e-6)vote[index]-=1;
  }
 }
 return vote;
}
function changedCount(parent,policy,positions,scale){
 let changed=0;
 for(const position of trainingRows(positions)){
  if(chooseKey(position.band,policy,scale)!==chooseKey(position.band,parent,scale))changed++;
 }
 return changed;
}
export function greedyPolicy(parent,positions,allowed,scale=SCALE){
 const flips=collectFlips(parent,positions,scale);
 const vote=voteOf(flips,allowed);
 const order=vote.map((value,index)=>({index,value:Math.abs(value)}))
  .filter(row=>row.value>0)
  .sort((a,b)=>b.value-a.value||a.index-b.index);
 let proposed=parent.slice();
 let current=0;
 for(const row of order){
  if(allowed&&!allowed.includes(row.index))continue;
  const trial=proposed.slice();
  trial[row.index]=parent[row.index]+Math.sign(vote[row.index])*STEP_CAP;
  const stepped=applyStep(parent,trial);
  const count=changedCount(parent,stepped.policy,positions,scale);
  if(count>current){
   proposed=stepped.policy;
   current=count;
  }
 }
 return {policy:applyStep(parent,proposed).policy,changed:current,flips:flips.length};
}
function topLeverage(flips,count){
 const score=Array(POLICY_DIM).fill(0);
 for(const flip of flips){
  for(let index=0;index<POLICY_DIM;index++)score[index]+=Math.abs(flip.direction[index])/flip.gap;
 }
 return score.map((value,index)=>({index,value}))
  .filter(row=>row.value>0)
  .sort((a,b)=>b.value-a.value||a.index-b.index)
  .slice(0,count)
  .map(row=>row.index);
}
function materialize(parent,round,index,method,family,policy,salt){
 const stepped=applyStep(parent.policy,policy);
 const model=cloneModel(parent);
 model.policy=stepped.policy;
 model.promoted=false;
 model.promotion=null;
 model.version='v4a2-r'+String(round).padStart(4,'0')+'-c'+index;
 model.updates=(parent.updates||0)+1;
 return {
  id:'v4a2-r'+String(round).padStart(4,'0')+'-c'+index+'-'+policyHash(stepped.policy),
  method,family,index,salt,round,
  maxAbs:stepped.maxAbs,changed:stepped.changed,l2:stepped.l2,
  model
 };
}
function gaussianPolicy(parent,sigma,rng){
 const proposed=parent.slice();
 for(let index=0;index<proposed.length;index++)proposed[index]+=gaussian(rng)*sigma;
 return applyStep(parent,proposed).policy;
}
export function proposeSensitive({parent,positions,elites,round=1,salt=160000,scale=SCALE}={}){
 if(!parent?.policy||parent.policy.length!==POLICY_DIM)throw Error('parent policy is missing');
 if((positions||[]).some(row=>row?.holdout===true)){
  const error=Error('候選生成拒絕保留局面');
  error.code='V4A2_HOLDOUT';
  throw error;
 }
 const flips=collectFlips(parent.policy,positions,scale);
 const energy=indexesOf(ENERGY_FEATURES);
 const combat=indexesOf(MOVE_FEATURES);
 const specs=[
  {method:'sensitive-flip',family:'sensitive',allowed:null},
  {method:'margin-leverage',family:'sensitive',allowed:topLeverage(flips,8)},
  {method:'energy-ap',family:'sensitive',allowed:energy},
  {method:'move-raid-attack',family:'sensitive',allowed:combat}
 ];
 const candidates=[];
 for(const spec of specs){
  const greedy=greedyPolicy(parent.policy,positions,spec.allowed,scale);
  candidates.push(materialize(parent,round,candidates.length,spec.method,spec.family,greedy.policy,salt));
 }
 const pool=(elites||[]).filter(row=>Array.isArray(row?.policy)&&row.policy.length===parent.policy.length);
 const other=pool[0]?.policy||parent.policy;
 const rng=mulberry32((salt+4)>>>0);
 const crossed=parent.policy.map((weight,index)=>0.55*weight+0.45*other[index]+gaussian(rng)*0.2);
 candidates.push(materialize(parent,round,candidates.length,'cross-elite','cross',applyStep(parent.policy,crossed).policy,salt));
 for(const sigma of [0.12,0.35,0.70]){
  const index=candidates.length;
  const noise=gaussianPolicy(parent.policy,sigma,mulberry32((salt+100+index)>>>0));
  candidates.push(materialize(parent,round,index,'gaussian-'+sigma,'gaussian',noise,salt));
 }
 if(candidates.length!==CANDIDATE_COUNT)throw Error('candidate count drifted');
 for(const candidate of candidates){
  for(let index=0;index<candidate.model.policy.length;index++){
   const delta=candidate.model.policy[index]-parent.policy[index];
   if(Math.abs(delta)>STEP_CAP+1e-8)throw Error('candidate step exceeded the cap');
   if(Math.abs(candidate.model.policy[index])>WEIGHT_CLIP+1e-8)throw Error('candidate left the clip');
  }
 }
 return {candidates,flips:flips.length,scale,hardCap:HARD_CAP};
}
export function measurePolicies(positions,champion,candidates,scale=SCALE){
 const band=(positions||[]).filter(row=>(row.band||[]).length>=2);
 const families=['sensitive','gaussian','cross'];
 const blank=()=>({positions:band.length,disagreed:0,pairs:0,pairDisagreed:0,buckets:{}});
 const byFamily=Object.fromEntries(families.map(name=>[name,blank()]));
 const byMethod={};
 let illegal=0;
 let comparisons=0;
 for(const candidate of candidates)byMethod[candidate.id]={method:candidate.method,family:candidate.family,disagreed:0,positions:band.length};
 for(const position of band){
  const championKey=chooseKey(position.band,champion,scale);
  const keys={champion:championKey};
  const legal=new Set(position.band.map(row=>row.key));
  if(!legal.has(championKey))illegal++;
  for(const candidate of candidates){
   const key=chooseKey(position.band,candidate.model.policy,scale);
   keys[candidate.id]=key;
   if(!legal.has(key))illegal++;
   if(key!==championKey)byMethod[candidate.id].disagreed++;
  }
  position.choices=keys;
  position.divergent=new Set(Object.values(keys)).size>1;
  for(const family of families){
    const group=candidates.filter(candidate=>candidate.family===family);
    const chosen=group.map(candidate=>keys[candidate.id]);
    const row=byFamily[family];
    if(chosen.some(key=>key!==championKey)){
     row.disagreed++;
     row.buckets[position.bucket]=(row.buckets[position.bucket]||0)+1;
    }
    for(let left=0;left<chosen.length;left++){
     for(let right=left+1;right<chosen.length;right++){
      row.pairs++;
      if(chosen[left]!==chosen[right])row.pairDisagreed++;
     }
    }
  }
  comparisons++;
 }
 const finish=row=>{
  row.bandRate=row.positions?row.disagreed/row.positions:0;
  row.pairwise=row.pairs?row.pairDisagreed/row.pairs:0;
  row.bucketsWithDisagreement=Object.values(row.buckets).filter(count=>count>0).length;
  return row;
 };
 for(const row of Object.values(byFamily))finish(row);
 for(const row of Object.values(byMethod))row.rate=row.positions?row.disagreed/row.positions:0;
 return {positions:band.length,comparisons,illegal,byFamily,byMethod};
}
export function bucketCoverage(positions){
 const band=(positions||[]).filter(row=>(row.band||[]).length>=2&&row.holdout!==true);
 const counts={};
 for(const position of band)counts[position.bucket]=(counts[position.bucket]||0)+1;
 const ready=Object.values(counts).filter(count=>count>=STAGE_A_GATE.minPerBucket).length;
 return {counts,ready,band:band.length};
}
export function stageADecision(train,holdout){
 const reasons=[];
 const gate=STAGE_A_GATE;
 const coverage=bucketCoverage(Array.isArray(train)?train:train.rows);
 if(coverage.band<gate.minBandPositions)reasons.push('訓練帶內局面只有 '+coverage.band+'，少於 '+gate.minBandPositions);
 if(holdout.positions<gate.minHoldoutBand)reasons.push('保留帶內局面只有 '+holdout.positions+'，少於 '+gate.minHoldoutBand);
 if(coverage.ready<gate.minBuckets)reasons.push('達到最少樣本的局面類型只有 '+coverage.ready+' 類');
 const sensitive=train.byFamily.sensitive;
 const gaussian=train.byFamily.gaussian;
 if(!(sensitive.bandRate>=gate.minBandRate))reasons.push('敏感型帶內分歧率未達 '+gate.minBandRate);
 if(!(gaussian.bandRate>=0))reasons.push('對照組沒有測量');
 if(!(sensitive.bandRate>=gaussian.bandRate*gate.minLift))reasons.push('敏感型分歧率未達到高斯對照的 '+gate.minLift+' 倍');
 if(sensitive.bucketsWithDisagreement<gate.minBucketsWithDisagreement)reasons.push('有分歧的局面類型少於 '+gate.minBucketsWithDisagreement);
 if(!(sensitive.pairwise>=gate.minPairwise))reasons.push('敏感型候選彼此分歧率未達 '+gate.minPairwise);
 if(train.illegal||holdout.illegal)reasons.push('出現帶外或非法選擇');
 if(!(holdout.byFamily.sensitive.bandRate>=gate.minHoldoutRate))reasons.push('保留局面的敏感型分歧率未達 '+gate.minHoldoutRate);
 if(!(holdout.byFamily.sensitive.bandRate>=holdout.byFamily.gaussian.bandRate))reasons.push('保留局面沒有勝過高斯對照');
 return {
  passed:reasons.length===0,reasons,coverage,
  trainSensitive:sensitive.bandRate,trainGaussian:gaussian.bandRate,
  holdoutSensitive:holdout.byFamily.sensitive.bandRate,
  holdoutGaussian:holdout.byFamily.gaussian.bandRate
 };
}
