// Offline decision feasibility. No new games. Hard cap, weight clip and the
// one-step limit stay exactly as they were in v4-B.
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {blendScore,chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b/lib/protocol.mjs';

export const HASH_NAMES=Object.freeze(['h0','h1','h2','h3','h4','h5','h6','h7']);
export const HASH_INDEX=Object.freeze(HASH_NAMES.map(name=>POLICY_INDEX[name]));

const LIMITS={scale:SCALE,stepCap:STEP_CAP,clip:WEIGHT_CLIP,hardCap:HARD_CAP};

function featureAt(row,index){
 return row.features[index]||0;
}
export function blend(action,weights,scale=SCALE){
 return blendScore(action.hard,weights,action.features,scale);
}
function box(parent,index,{stepCap,clip,frozen}){
 if(frozen.has(index))return [0,0];
 const down=Math.min(stepCap,parent[index]+clip);
 const up=Math.min(stepCap,clip-parent[index]);
 return [-Math.max(0,down),Math.max(0,up)];
}
export function pairwiseSwing(parent,preferred,other,options={}){
 const limits={...LIMITS,...options};
 const frozen=new Set(options.frozen||[]);
 let swing=0;
 let coords=0;
 for(let index=0;index<parent.length;index++){
  const diff=featureAt(preferred,index)-featureAt(other,index);
  if(!diff)continue;
  coords++;
  const [lo,hi]=box(parent,index,{...limits,frozen});
  const delta=diff>0?hi:lo;
  swing+=limits.scale*diff*delta;
 }
 const gap=blend(other,parent,limits.scale)-blend(preferred,parent,limits.scale);
 return {swing,gap,coords,clears:swing>gap+1e-8};
}
function directionOf(preferred,other,width){
 return Array.from({length:width},(_,index)=>featureAt(preferred,index)-featureAt(other,index));
}
function marginOf(parent,delta,preferred,alt,scale){
 let margin=blend(preferred,parent,scale)-blend(alt,parent,scale);
 const width=parent.length;
 for(let index=0;index<width;index++){
  margin+=scale*(featureAt(preferred,index)-featureAt(alt,index))*(delta[index]||0);
 }
 return margin;
}
export function maxOneStep(parent,preferred,alts,options={}){
 const limits={...LIMITS,...options};
 const frozen=new Set(options.frozen||[]);
 const bounds=parent.map((_,index)=>box(parent,index,{...limits,frozen}));
 const vertex=dir=>dir.map((value,index)=>{
  if(value>1e-12)return bounds[index][1];
  if(value<-1e-12)return bounds[index][0];
  return 0;
 });
 const minMargin=delta=>{
  if(!alts.length)return Infinity;
  return Math.min(...alts.map(alt=>marginOf(parent,delta,preferred,alt,limits.scale)));
 };
 let best=parent.map(()=>0);
 let bestMargin=minMargin(best);
 const consider=delta=>{
  const margin=minMargin(delta);
  if(margin>bestMargin){bestMargin=margin;best=delta.slice();}
 };
 for(const alt of alts)consider(vertex(directionOf(preferred,alt,parent.length)));
 let delta=best.slice();
 let rate=0.25;
 for(let step=0;step<4000;step++){
  let worst=alts[0];
  let worstMargin=Infinity;
  for(const alt of alts){
   const margin=marginOf(parent,delta,preferred,alt,limits.scale);
   if(margin<worstMargin){worstMargin=margin;worst=alt;}
  }
  consider(delta);
  if(bestMargin>1e-8)break;
  const dir=directionOf(preferred,worst,parent.length);
  let norm=0;
  for(const value of dir)norm+=value*value;
  norm=Math.sqrt(norm)||1;
  delta=delta.map((value,index)=>Math.max(bounds[index][0],Math.min(bounds[index][1],value+rate*dir[index]/norm)));
  if(step===1200||step===2400)rate*=0.5;
 }
 consider(delta);
 return {delta:best,minMargin:bestMargin};
}
export function policyAfter(parent,delta){
 return parent.map((weight,index)=>{
  const next=weight+(delta[index]||0);
  return Math.max(-WEIGHT_CLIP,Math.min(WEIGHT_CLIP,next));
 });
}
export function selection(band,weights){
 return chooseKey(band,weights,SCALE);
}
function hardDistance(preferred,band){
 const top=Math.max(...band.map(row=>row.hard));
 return top-preferred.hard;
}
export function auditPair(parent,position,preferredKey,options={}){
 const limits={...LIMITS,...options};
 const band=position.band;
 const preferred=band.find(row=>row.key===preferredKey);
 if(!preferred){
  return {class:3,label:'無法學會',reason:'偏好動作不在 Hard cap 內的候選裡',inHardCap:false};
 }
 const alts=band.filter(row=>row.key!==preferredKey);
 const current=selection(band,parent);
 const featureL2=Math.sqrt(alts.reduce((sum,alt)=>{
  const dir=directionOf(preferred,alt,parent.length);
  return sum+dir.reduce((inner,value)=>inner+value*value,0);
 },0));
 const inHardCap=hardDistance(preferred,band)<=limits.hardCap+1e-9;
 const rival=alts.slice().sort((left,right)=>blend(right,parent)-blend(left,parent))[0]||alts[0];
 const pair=rival?pairwiseSwing(parent,preferred,rival):{swing:0,gap:0,coords:0,clears:false};
 const one=maxOneStep(parent,preferred,alts,limits);
 const wide=maxOneStep(parent,preferred,alts,{...limits,stepCap:limits.clip*2});
 const onePolicy=policyAfter(parent,one.delta);
 const widePolicy=policyAfter(parent,wide.delta);
 const oneChoice=selection(band,onePolicy);
 const wideChoice=selection(band,widePolicy);
 const oneFlips=oneChoice===preferredKey;
 const wideFlips=wideChoice===preferredKey;
 let klass=1;
 let reason='現有特徵在單步上限內可以把選牌改成這個偏好';
 if(!inHardCap){
  klass=3;
  reason='偏好動作比 Hard Search 最高分低超過 7，混合評分不能選它';
 }else if(featureL2<1e-8){
  klass=2;
  reason='候選動作的特徵沒有差別，調整權重無法分開它們';
 }else if(!wideFlips){
  klass=3;
  reason='即使權重在 [-6, 6] 內任意調整，正式選牌仍不會改成這個偏好';
 }else if(!oneFlips){
  klass=3;
  reason='單步 1.5 的可調整幅度小於目前分差，這一步無法改選';
 }
 if(current===preferredKey){
  return {
   class:1,label:'已符合',reason:'更新前的選牌已經是這個偏好',
   inHardCap,featureL2,pair,oneFlips:true,wideFlips,current,oneChoice,wideChoice,
   gapToRival:pair.gap,swingToRival:pair.swing,hardGap:hardDistance(preferred,band)
  };
 }
 const label=klass===1?'可以學會':klass===2?'特徵不足':'限制無法學會';
 return {
  class:klass,label,reason,inHardCap,featureL2,pair,oneFlips,wideFlips,
  current,oneChoice,wideChoice,oneDelta:one.delta,wideDelta:wide.delta,oneMargin:one.minMargin,
  gapToRival:pair.gap,swingToRival:pair.swing,hardGap:hardDistance(preferred,band),
  differing:pair.coords
 };
}
export function countChanges(positions,before,after){
 let changed=0;
 const rows=[];
 for(const position of positions){
  if((position.band||[]).length<2)continue;
  const left=selection(position.band,before);
  const right=selection(position.band,after);
  if(left===right)continue;
  changed++;
  rows.push({id:position.id,bucket:position.bucket,opponent:position.opponent,before:left,after:right});
 }
 return {changed,rows,n:positions.filter(position=>(position.band||[]).length>=2).length};
}
export function preferredKeyOf(row){
 return row.mean>0?row.actionA.key:row.actionB.key;
}
export function restTwoMove060(row){
 let parsed;
 try{parsed=JSON.parse(row.key);}
 catch{return 0;}
 const card=featureAt(row,POLICY_INDEX['card_BLC-4-060']);
 return parsed.type==='activate'&&parsed.mode==='restTwoMove'&&card>0.5?1:0;
}
