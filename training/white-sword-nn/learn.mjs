// Imitation initializes a preference. Monte-Carlo then fits noisy returns
// of the actions that were actually played. Alternatives are not labeled.
import {GAMMA,GRAD_CLIP,LABEL_SMOOTH} from './constants.mjs';
import {adamStep,backward,clipGrad,forwardTrain,zeroGrad} from './net.mjs';

function softmax(scores){
 const max=Math.max(...scores);
 const exps=scores.map(score=>Math.exp(Math.max(-20,Math.min(20,score-max))));
 const sum=exps.reduce((total,value)=>total+value,0);
 return exps.map(value=>value/sum);
}
export function imitationPass(net,opt,samples,{smooth=LABEL_SMOOTH}={}){
 let loss=0,used=0;
 for(const sample of samples){
  const width=sample.rows.length;
  if(width<2||!Number.isInteger(sample.chosen)||sample.chosen<0||sample.chosen>=width)continue;
  const caches=sample.rows.map(row=>forwardTrain(net,row));
  const probs=softmax(caches.map(cache=>cache.q));
  const share=smooth/width;
  let cross=0;
  const grad=zeroGrad(net);
  for(let i=0;i<width;i++){
   const target=(i===sample.chosen?1-smooth:0)+share;
   cross-=target*Math.log(Math.max(1e-8,probs[i]));
   const signal=probs[i]-target;
   if(signal)backward(net,caches[i],signal,grad);
  }
  clipGrad(grad,GRAD_CLIP);
  adamStep(net,opt,grad);
  loss+=cross;
  used++;
 }
 return {loss:used?loss/used:null,used};
}
export function monteCarloPass(net,opt,samples){
 let loss=0,used=0;
 for(const sample of samples){
  if(!Number.isFinite(sample.target))continue;
  const cache=forwardTrain(net,sample.x);
  const error=cache.q-sample.target;
  const grad=zeroGrad(net);
  backward(net,cache,error,grad);
  clipGrad(grad,GRAD_CLIP);
  adamStep(net,opt,grad);
  loss+=error*error;
  used++;
 }
 return {mse:used?loss/used:null,used};
}
export function assignReturns(samples,winner,decisions,gamma=GAMMA){
 if(winner!==0&&winner!==1)throw Error('Return needs a winner');
 return samples.map(sample=>{
  const outcome=winner===sample.seat?1:-1;
  const remaining=decisions-1-sample.index;
  if(remaining<0)throw Error('Decision index is outside the game');
  return {...sample,target:outcome*gamma**remaining};
 });
}
export function shuffle(items,rng){
 const out=items.slice();
 for(let i=out.length-1;i>0;i--){
  const j=Math.floor(rng()*(i+1));
  const swap=out[i];
  out[i]=out[j];
  out[j]=swap;
 }
 return out;
}
