// Minimal fully-connected ReLU neural network with online pairwise SGD.
// Architecture: fixed public/own-observation features -> 24 ReLU -> action score.
// No external API, Python dependency, or TF.js runtime required.
import {FEATURE_DIM,FEATURE_VERSION} from './ai-v3-features.mjs';

const sigmoid=x=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
function generator(seed){
 let n=(seed>>>0)||1;
 return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};
}
export function initModel({seed=12345,hidden=24}={}){
 if(!Number.isInteger(hidden)||hidden<2||hidden>96)throw Error('Invalid hidden size');
 const rng=generator(seed),w1=Array.from({length:hidden*FEATURE_DIM},()=>((rng()+rng()+rng()+rng())-2)*0.13);
 const w2=Array.from({length:hidden},()=>((rng()+rng()+rng()+rng())-2)*0.13);
 return {version:1,featureVersion:FEATURE_VERSION,features:FEATURE_DIM,hidden,
  w1,b1:Array(hidden).fill(0),w2,b2:0};
}
export function validateModel(m){
 if(!m||m.version!==1||m.featureVersion!==FEATURE_VERSION||m.features!==FEATURE_DIM
   ||!Number.isInteger(m.hidden)||m.hidden<2||m.hidden>96)throw Error('Incompatible neural checkpoint');
 for(const [key,size] of [['w1',m.hidden*FEATURE_DIM],['b1',m.hidden],['w2',m.hidden]]){
  if(!Array.isArray(m[key])||m[key].length!==size||m[key].some(x=>!Number.isFinite(x)))
   throw Error('Invalid '+key+' in neural checkpoint');
 }
 if(!Number.isFinite(m.b2))throw Error('Invalid neural output bias');
 return m;
}
function forward(m,x){
 if(x.length!==FEATURE_DIM)throw Error('Incompatible neural features');
 const h=Array(m.hidden),mask=Array(m.hidden);
 for(let j=0;j<m.hidden;j++){
  let v=m.b1[j],off=j*FEATURE_DIM;
  for(let i=0;i<FEATURE_DIM;i++)v+=m.w1[off+i]*x[i];
  mask[j]=v>0;h[j]=v>0?v:0;
 }
 let value=m.b2;
 for(let j=0;j<m.hidden;j++)value+=m.w2[j]*h[j];
 return {h,mask,value};
}
export function scoreFeatures(m,x){return forward(m,x).value;}
// Pairwise logistic ranking: preferred action should outrank rejected action.
// Training pairs are generated from self-play outcomes and from v2 teacher
// actions; no claim that every positive pair is objectively optimal.
export function trainPair(m,preferred,rejected,{rate=0.005,weight=1,decay=0.00001}={}){
 const pos=forward(m,preferred),neg=forward(m,rejected);
 const diff=Math.max(-35,Math.min(35,pos.value-neg.value));
 const loss=Math.log1p(Math.exp(-diff));
 const g=-Math.min(3,weight)*(1-sigmoid(diff));
 const previousW2=m.w2.slice();
 const gradientLimit=5;
 for(let j=0;j<m.hidden;j++){
  const dw2=g*(pos.h[j]-neg.h[j])+decay*m.w2[j];
  m.w2[j]-=rate*Math.max(-gradientLimit,Math.min(gradientLimit,dw2));
  const dp=g*previousW2[j]*(pos.mask[j]?1:0);
  const dn=g*previousW2[j]*(neg.mask[j]?1:0);
  m.b1[j]-=rate*Math.max(-gradientLimit,Math.min(gradientLimit,dp-dn));
  const off=j*FEATURE_DIM;
  for(let i=0;i<FEATURE_DIM;i++){
   const idx=off+i,grad=dp*preferred[i]-dn*rejected[i]+decay*m.w1[idx];
   m.w1[idx]-=rate*Math.max(-gradientLimit,Math.min(gradientLimit,grad));
  }
 }
 return loss;
}
