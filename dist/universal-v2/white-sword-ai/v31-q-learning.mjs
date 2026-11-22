// v3.1: use only Hard Search 2's already-computed, actor-visible,
// hypothetical future-state Q scores. Never use the actual unknown next LIFE,
// opponents' hidden hand, or winner as a single-step teacher signal.
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const Q_MIN_GAP=1.5;
export const Q_MAX_GAP=7;
export function qPairsFromRoot(pool,{minGap=Q_MIN_GAP,maxGap=Q_MAX_GAP,maxPairs=2}={}){
 if(!Array.isArray(pool)||pool.length<2)return [];
 if(!(minGap>0&&maxGap>=minGap&&maxPairs>=1))throw Error('invalid Q pair configuration');
 const scored=pool.filter(row=>row.measured===true&&Number.isFinite(row.hardScore)&&
  Array.isArray(row.features)&&row.features.length);
 scored.sort((a,b)=>b.hardScore-a.hardScore||
  (JSON.stringify(a.action)<JSON.stringify(b.action)?-1:1));
 if(scored.length<2)return [];
 const best=scored[0],out=[];
 for(const other of scored.slice(1)){
  const gap=best.hardScore-other.hardScore;
  if(gap+1e-9<minGap||gap>maxGap+1e-9||same(best.action,other.action))continue;
  out.push({
   kind:'q-preference',chosen:best.features,negative:other.features,
   gap,weight:Math.min(1,Math.max(0.2,(gap-minGap+1)/(maxGap-minGap+1))),
   actionType:best.action?.type||null,negativeType:other.action?.type||null
  });
  if(out.length>=maxPairs)break;
 }
 return out;
}
// We optimize *measured* Q differences, not final match outcome. Never
// mutate the source incumbent weights, and clamp every component to a fixed
// trust region to avoid turning noisy Q signals into extreme policy overrides.
export function learnFromQPreferences(model,samples,anchor,{
 lr=0.1,epochs=4,trustDelta=0.8,margin=0.15,prior=0.015
}={}){
 if(!Array.isArray(model?.policy)||!Array.isArray(anchor?.policy)||
  model.policy.length!==anchor.policy.length)throw Error('model width mismatch');
 if(!Array.isArray(samples))throw Error('Q samples missing');
 if(!(lr>0&&epochs>=1&&trustDelta>0&&margin>=0&&prior>=0))throw Error('invalid Q training options');
 let updates=0,correctBefore=0,correctAfter=0;
 const positive=(w,s)=>s.chosen.reduce((v,x,i)=>v+(x-s.negative[i])*w[i],0);
 const valid=samples.filter(s=>s.kind==='q-preference');
 for(const s of valid){
  if(s.chosen?.length!==model.policy.length||s.negative?.length!==model.policy.length||
   !(s.gap>=Q_MIN_GAP&&s.gap<=Q_MAX_GAP)||!(s.weight>0&&s.weight<=1))
   throw Error('invalid measured Q preference');
  if(positive(model.policy,s)>0)correctBefore++;
 }
 const limit=v=>Math.max(-6,Math.min(6,v));
 for(let epoch=0;epoch<epochs;epoch++){
  for(const sample of valid){
   const difference=sample.chosen.map((v,i)=>v-sample.negative[i]);
   let predicted=0,norm2=0;
   for(let i=0;i<difference.length;i++){
    predicted+=model.policy[i]*difference[i];
    norm2+=difference[i]*difference[i];
   }
   if(norm2<=1e-10||predicted>=margin)continue;
   // Normalize by feature magnitude so long feature vectors do not explode.
   const step=lr*sample.weight*Math.min(3,margin-predicted)/(1+norm2*0.03);
   for(let i=0;i<difference.length;i++){
    const delta=difference[i];
    if(!delta)continue;
    const low=anchor.policy[i]-trustDelta,high=anchor.policy[i]+trustDelta;
    model.policy[i]=Math.max(low,Math.min(high,limit(model.policy[i]+step*delta)));
   }
   updates++;
  }
  for(let i=0;i<model.policy.length;i++){
   const low=anchor.policy[i]-trustDelta,high=anchor.policy[i]+trustDelta;
   model.policy[i]=Math.max(low,Math.min(high,limit(
    model.policy[i]*(1-prior)+anchor.policy[i]*prior
   )));
  }
 }
 for(const s of valid)if(positive(model.policy,s)>0)correctAfter++;
 return {samples:valid.length,updates,correctBefore,correctAfter,
  policyL2:Math.sqrt(model.policy.reduce((sum,w,i)=>sum+(w-anchor.policy[i])**2,0))};
}
