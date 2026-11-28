// Imitation initializes a preference. Monte-Carlo then fits noisy returns
// of the actions that were actually played. Alternatives are not labeled.
import {GAMMA,GRAD_CLIP,LABEL_SMOOTH,REPLAY_FRACTION} from './constants.mjs';
import {adamStep,backward,clipGrad,forwardTrain,zeroGrad} from './net.mjs';

function lossParts(scores,chosen,smooth){
 const width=scores.length;
 const max=Math.max(...scores);
 const shifted=scores.map(score=>score-max);
 const clamped=shifted.some(value=>value<-20);
 const exps=shifted.map(value=>Math.exp(Math.max(-20,value)));
 const sum=exps.reduce((total,value)=>total+value,0);
 const probs=exps.map(value=>value/sum);
 const share=smooth/width;
 let loss=0;
 let floored=false;
 const signals=[];
 for(let index=0;index<width;index++){
  const target=(index===chosen?1-smooth:0)+share;
  const prob=probs[index];
  if(prob<1e-8)floored=true;
  loss-=target*Math.log(Math.max(1e-8,prob));
  signals.push(prob-target);
 }
 return {loss,signals,probs,clamped,floored};
}
function crossEntropy(scores,chosen,smooth){
 const parts=lossParts(scores,chosen,smooth);
 return {loss:parts.loss,signals:parts.signals};
}
export function inspectLoss(scores,chosen,smooth=LABEL_SMOOTH){
 return lossParts(scores,chosen,smooth);
}
export function imitationGradient(net,sample,{smooth=LABEL_SMOOTH}={}){
 if(!usable(sample))return null;
 const caches=sample.rows.map(row=>forwardTrain(net,row));
 const scored=crossEntropy(caches.map(cache=>cache.q),sample.chosen,smooth);
 const grad=zeroGrad(net);
 scored.signals.forEach((signal,index)=>{
  if(signal)backward(net,caches[index],signal,grad);
 });
 return {loss:scored.loss,grad,signals:scored.signals,scores:caches.map(cache=>cache.q)};
}
function usable(sample){
 const width=sample?.rows?.length||0;
 return width>=2&&Number.isInteger(sample.chosen)&&sample.chosen>=0&&sample.chosen<width;
}
export function imitationLoss(net,samples,{smooth=LABEL_SMOOTH}={}){
 let loss=0,used=0;
 for(const sample of samples){
  if(!usable(sample))continue;
  const scores=sample.rows.map(row=>forwardTrain(net,row).q);
  loss+=crossEntropy(scores,sample.chosen,smooth).loss;
  used++;
 }
 return {loss:used?loss/used:null,used};
}
export function imitationPass(net,opt,samples,{smooth=LABEL_SMOOTH}={}){
 let loss=0,used=0;
 for(const sample of samples){
  const step=imitationGradient(net,sample,{smooth});
  if(!step)continue;
  clipGrad(step.grad,GRAD_CLIP);
  adamStep(net,opt,step.grad);
  loss+=step.loss;
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
export function boundedReturnSignal(q,target){
 const squashed=Math.tanh(q);
 const residual=squashed-target;
 const slope=1-squashed*squashed;
 return {squashed,residual,slope,signal:residual*slope};
}
export function boundedMonteCarloPass(net,opt,samples){
 let bounded=0,raw=0,used=0;
 for(const sample of samples){
  if(!Number.isFinite(sample.target))continue;
  const cache=forwardTrain(net,sample.x);
  const scored=boundedReturnSignal(cache.q,sample.target);
  const grad=zeroGrad(net);
  backward(net,cache,scored.signal,grad);
  clipGrad(grad,GRAD_CLIP);
  adamStep(net,opt,grad);
  bounded+=scored.residual*scored.residual;
  const gap=cache.q-sample.target;
  raw+=gap*gap;
  used++;
 }
 return {
  boundedMse:used?bounded/used:null,
  rawMse:used?raw/used:null,
  used
 };
}
export function replaySteps(monteCount,fraction=REPLAY_FRACTION){
 if(!(fraction>0&&fraction<1))throw Error('Replay fraction is outside (0,1)');
 if(!Number.isInteger(monteCount)||monteCount<0)throw Error('Monte-Carlo count is not a count');
 return Math.round(monteCount*fraction/(1-fraction));
}
export function assertReplayPool(samples,holdoutSeeds){
 const held=new Set(holdoutSeeds||[]);
 for(const sample of samples||[]){
  if(!Number.isInteger(sample?.seed))throw Error('Replay sample has no game seed');
  if(held.has(sample.seed))throw Error('Holdout demonstration entered replay');
 }
}
export function drawReplay(pool,count,rng){
 if(!Number.isInteger(count)||count<0)throw Error('Replay draw is not a count');
 if(!count)return [];
 if(!pool?.length)throw Error('Replay pool is empty');
 const out=[];
 let bag=[];
 while(out.length<count){
  if(!bag.length)bag=shuffle(pool,rng);
  out.push(bag.pop());
 }
 return out;
}
export function retainPass(net,opt,monteSamples,replaySamples){
 if(replaySamples.length!==monteSamples.length)throw Error('Replay count does not match the locked fraction');
 let squared=0,used=0,imitate=0,imitateUsed=0;
 for(let index=0;index<monteSamples.length;index++){
  const mc=monteCarloPass(net,opt,[monteSamples[index]]);
  if(mc.used){
   squared+=mc.mse*mc.used;
   used+=mc.used;
  }
  const step=imitationPass(net,opt,[replaySamples[index]]);
  if(step.used){
   imitate+=step.loss*step.used;
   imitateUsed+=step.used;
  }
 }
 return {
  mse:used?squared/used:null,used,
  imitateLoss:imitateUsed?imitate/imitateUsed:null,imitateUsed,
  steps:used+imitateUsed
 };
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
