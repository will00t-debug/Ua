// Evolutionary candidates. Mutations stay inside a fixed step and the existing clip.
// Full-game results choose among candidates. A win is not a label for each move.
import {createHash} from 'node:crypto';
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {cloneModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {
 CANDIDATE_COUNT,CODE_VERSION,EXPLORE,HARD_CAP,METHOD_LABEL,SCALE,SIGMA_BUMP,SIGMA_SCALE_MAX,STEP_CAP,WEIGHT_CLIP
} from './protocol.mjs';

const METHODS=Object.freeze([
 {method:'gaussian-small',sigma:0.12,kind:'gaussian'},
 {method:'gaussian-mid',sigma:0.35,kind:'gaussian'},
 {method:'gaussian-wide',sigma:0.70,kind:'gaussian'},
 {method:'sparse',sigma:0.90,kind:'sparse',fraction:0.25},
 {method:'top-magnitude',sigma:0.50,kind:'top',count:16},
 {method:'mix-v1',kind:'mix',other:'v1',keep:0.8,sigma:0.05},
 {method:'cross-elite',kind:'cross',keep:0.55,sigma:0.2},
 {method:'group',sigma:0.80,kind:'group'}
]);
const GROUP_NAMES=Object.freeze([
 'type_raid','type_attack','type_move','type_next','line_energy','line_front',
 'spends_ap','my_ap','k067_raid','h085_raid','u070_raid','u070_ap_enable',
 'bankai_event','bankai_enable','nos_event','attack_open','pass_despite_attack'
]);

export function mulberry32(seed){
 let state=seed>>>0;
 return ()=>{
  state=state+0x6D2B79F5|0;
  let t=Math.imul(state^state>>>15,1|state);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
export function gaussian(rng){
 let u=0;
 let v=0;
 while(u===0)u=rng();
 while(v===0)v=rng();
 return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
export function policyHash(policy){
 return createHash('sha256').update(JSON.stringify(policy)).digest('hex').slice(0,12);
}
function clip(value){
 return Math.max(-WEIGHT_CLIP,Math.min(WEIGHT_CLIP,value));
}
export function applyStep(parent,proposed){
 const out=parent.slice();
 let maxAbs=0;
 let changed=0;
 let square=0;
 for(let i=0;i<parent.length;i++){
  let delta=proposed[i]-parent[i];
  if(delta>STEP_CAP)delta=STEP_CAP;
  if(delta<-STEP_CAP)delta=-STEP_CAP;
  const next=clip(parent[i]+delta);
  const applied=next-parent[i];
  if(Math.abs(applied)>STEP_CAP+1e-8)throw Error('Weight step exceeded '+STEP_CAP);
  out[i]=next;
  square+=applied*applied;
  maxAbs=Math.max(maxAbs,Math.min(STEP_CAP,Math.abs(delta)));
  if(applied)changed++;
 }
 return {policy:out,maxAbs,changed,l2:Math.sqrt(square)};
}
function proposePolicy(parent,method,historical,rng,sigmaScale,elites){
 const sigma=Math.min(STEP_CAP,(method.sigma||0)*sigmaScale);
 const proposed=parent.slice();
 if(method.kind==='gaussian'){
  for(let i=0;i<proposed.length;i++)proposed[i]+=gaussian(rng)*sigma;
 }else if(method.kind==='sparse'){
  for(let i=0;i<proposed.length;i++)if(rng()<method.fraction)proposed[i]+=gaussian(rng)*sigma;
 }else if(method.kind==='top'){
  const order=parent.map((weight,index)=>({index,weight:Math.abs(weight)}))
   .sort((a,b)=>b.weight-a.weight||a.index-b.index)
   .slice(0,method.count);
  for(const row of order)proposed[row.index]+=gaussian(rng)*sigma;
 }else if(method.kind==='mix'){
  const other=historical[method.other]?.policy;
  if(!other||other.length!==parent.length)throw Error('Historical policy '+method.other+' is missing');
  for(let i=0;i<proposed.length;i++){
   proposed[i]=method.keep*parent[i]+(1-method.keep)*other[i]+gaussian(rng)*sigma;
  }
 }else if(method.kind==='cross'){
  const pool=(elites||[]).filter(row=>Array.isArray(row?.policy)&&row.policy.length===parent.length);
  const other=pool.length?pool[Math.floor(rng()*pool.length)].policy:historical.v0?.policy;
  if(!other||other.length!==parent.length)throw Error('Cross source policy is missing');
  for(let i=0;i<proposed.length;i++){
   proposed[i]=method.keep*parent[i]+(1-method.keep)*other[i]+gaussian(rng)*sigma;
  }
 }else if(method.kind==='group'){
  for(const name of GROUP_NAMES){
   const index=POLICY_INDEX[name];
   if(!Number.isInteger(index))throw Error('Missing policy feature '+name);
   proposed[index]+=gaussian(rng)*sigma;
  }
 }else throw Error('Unknown mutation '+method.kind);
 return applyStep(parent,proposed);
}
function policyL2(left,right){
 let square=0;
 for(let i=0;i<left.length;i++){
  const delta=left[i]-right[i];
  square+=delta*delta;
 }
 return Math.sqrt(square);
}
export function nextSigma(scale,probe,promoted){
 const current=Number(scale)||1;
 if(!(current>0)||current>SIGMA_SCALE_MAX)throw Error('Sigma scale is outside the fixed bound');
 if(promoted)return current;
 const band=Number.isInteger(probe?.bandPositions)?probe.bandPositions:null;
 const bandRate=Number.isFinite(probe?.bandRate)?probe.bandRate:(Number.isFinite(probe?.rate)?probe.rate:0);
 if(band===0||bandRate<0.02)return Math.min(SIGMA_SCALE_MAX,current*SIGMA_BUMP);
 return current;
}
function materialize(parent,round,index,method,step,scale,salt){
 const model=cloneModel(parent);
 model.policy=step.policy;
 model.curve=[];
 model.updates=0;
 model.samples=0;
 model.promoted=false;
 model.promotion=null;
 model.deployed=false;
 model.liveDefault='hard-search-2';
 model.selectedMode='blend';
 model.blendScale=SCALE;
 model.hardCap=HARD_CAP;
 model.retrained=false;
 const hash=policyHash(model.policy);
 const id='v4a-r'+String(round).padStart(4,'0')+'-c'+index+'-'+hash;
 model.version=id;
 model.v4a={
  kind:'candidate',production:false,deployed:false,id,method:method.method,round,
  parentId:parent.v4a?.candidateId||parent.version||'v2'
 };
 model.config={
  evolution:true,codeVersion:CODE_VERSION,method:method.method,round,index,
  sigma:method.sigma??null,sigmaScale:scale,salt,hardCap:HARD_CAP,scale:SCALE,explore:EXPLORE
 };
 model.note='Experimental v4-A candidate. Not a production weight file.';
 return {
  id,round,index,method:method.method,label:METHOD_LABEL[method.method],
  source:'evolution',parentId:parent.v4a?.candidateId||parent.version||'v2',
  sigma:method.sigma??null,sigmaScale:scale,salt,
  hardCap:HARD_CAP,scale:SCALE,explore:EXPLORE,
  policyHash:hash,maxAbsDelta:step.maxAbs,changedWeights:step.changed,deltaL2:step.l2,
  valueUntouched:JSON.stringify(model.value)===JSON.stringify(parent.value),
  model
 };
}
export function proposeEvolution({
 round,parent,historical,sigmaScale=1,salt=0,count=CANDIDATE_COUNT,elites=[]
}={}){
 if(!parent?.policy?.length)throw Error('Evolution needs the current champion policy');
 if(!(sigmaScale>0)||sigmaScale>SIGMA_SCALE_MAX)throw Error('Sigma scale is outside the fixed bound');
 if(count!==CANDIDATE_COUNT)throw Error('v4-A first version generates exactly 8 candidates');
 const before=parent.policy.slice();
 const scale=Math.min(SIGMA_SCALE_MAX,sigmaScale);
 const rngFor=(index,extra)=>mulberry32((100000+(round*997)+(index*10007)+((salt+extra)*17)+Math.round(scale*1000))>>>0);
 const candidates=[];
 for(let index=0;index<METHODS.length;index++){
  const method=METHODS[index];
  const step=proposePolicy(parent.policy,method,historical,rngFor(index,0),scale,elites);
  if(!step.changed)throw Error('Candidate '+index+' did not change any weight');
  candidates.push(materialize(parent,round,index,method,step,scale,salt));
 }
 for(let guard=0;guard<8;guard++){
  let closest=null;
  for(let i=0;i<candidates.length;i++){
   for(let j=i+1;j<candidates.length;j++){
    const distance=policyL2(candidates[i].model.policy,candidates[j].model.policy);
    if(!closest||distance<closest.distance)closest={i,j,distance};
   }
  }
  if(!closest||closest.distance>=0.2)break;
  const index=Math.max(closest.i,closest.j);
  const method=METHODS[index];
  const step=proposePolicy(parent.policy,method,historical,rngFor(index,101+guard),scale,elites);
  if(!step.changed)continue;
  candidates[index]=materialize(parent,round,index,method,step,scale,salt+101+guard);
 }
 const hashes=new Set(candidates.map(row=>row.policyHash));
 if(hashes.size!==candidates.length)throw Error('Candidate policies collided');
 if(parent.policy.some((weight,index)=>weight!==before[index]))throw Error('Champion policy was mutated in place');
 return {candidates,sigmaScale:scale,salt,methods:METHODS.map(row=>row.method),elitesUsed:(elites||[]).length};
}
