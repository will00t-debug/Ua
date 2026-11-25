// Small feed-forward Q network. Float64, AdamW, no native dependency.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {ACTION_DIM,INPUT_DIM,STATE_DIM} from './encode.mjs';
import {FORMAT,GRAD_CLIP,HIDDEN,WEIGHT_DECAY} from './constants.mjs';

function mulberry32(seed){
 let state=seed>>>0;
 return ()=>{
  state=state+0x6D2B79F5|0;
  let t=Math.imul(state^state>>>15,1|state);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
function gaussian(rng){
 let u=0,v=0;
 while(u===0)u=rng();
 while(v===0)v=rng();
 return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function layerOffsets(sizes){
 const layers=[];
 let cursor=0;
 for(let i=0;i<sizes.length-1;i++){
  const weight=sizes[i]*sizes[i+1];
  layers.push({input:sizes[i],output:sizes[i+1],weight:cursor,bias:cursor+weight});
  cursor+=weight+sizes[i+1];
 }
 return {layers,count:cursor};
}
export function createNet(seed,{sizes=[INPUT_DIM,HIDDEN[0],HIDDEN[1],1],stateDim=STATE_DIM,version='nn-init'}={}){
 const layout=layerOffsets(sizes);
 const theta=new Float64Array(layout.count);
 const rng=mulberry32(seed>>>0);
 layout.layers.forEach((layer,index)=>{
  const scale=index===layout.layers.length-1?0.01:Math.sqrt(2/layer.input);
  for(let i=0;i<layer.input*layer.output;i++)theta[layer.weight+i]=gaussian(rng)*scale;
 });
 return {
  format:FORMAT,version,seed,sizes,stateDim,actionDim:sizes[0]-stateDim,
  theta,layers:layout.layers,updates:0
 };
}
export function cloneNet(net){
 const copy=createNet(net.seed,{sizes:net.sizes,stateDim:net.stateDim,version:net.version});
 copy.theta.set(net.theta);
 copy.updates=net.updates;
 return copy;
}
export function parameterCount(net){
 return net.theta.length;
}
export function sameWeights(left,right){
 if(!left||!right||left.theta.length!==right.theta.length)return false;
 for(let i=0;i<left.theta.length;i++)if(!Object.is(left.theta[i],right.theta[i]))return false;
 return true;
}
export function netDistance(left,right){
 let sum=0;
 for(let i=0;i<left.theta.length;i++){
  const delta=left.theta[i]-right.theta[i];
  sum+=delta*delta;
 }
 return Math.sqrt(sum);
}
export function createOptimizer(lr,decay=WEIGHT_DECAY){
 return {lr,decay,beta1:0.9,beta2:0.999,eps:1e-8,step:0,moment:null,velocity:null};
}
function ensureMoments(opt,width){
 if(!opt.moment||opt.moment.length!==width){
  opt.moment=new Float64Array(width);
  opt.velocity=new Float64Array(width);
  opt.step=0;
 }
}
export function zeroGrad(net){
 return new Float64Array(net.theta.length);
}
export function forwardTrain(net,input){
 if(input.length!==net.sizes[0])throw Error('Network input width mismatch');
 const hidden=[];
 let current=input;
 for(let layerIndex=0;layerIndex<net.layers.length;layerIndex++){
  const layer=net.layers[layerIndex];
  const pre=new Float64Array(layer.output);
  const activated=new Float64Array(layer.output);
  for(let out=0;out<layer.output;out++){
   let sum=net.theta[layer.bias+out];
   const row=layer.weight+out*layer.input;
   for(let inn=0;inn<layer.input;inn++)sum+=net.theta[row+inn]*current[inn];
   pre[out]=sum;
   activated[out]=layerIndex===net.layers.length-1?sum:(sum>0?sum:0);
  }
  hidden.push({pre,activated,input:current});
  current=activated;
 }
 return {q:current[0],hidden};
}
export function backward(net,cache,dQ,grad){
 let upstream=Float64Array.from([dQ]);
 for(let layerIndex=net.layers.length-1;layerIndex>=0;layerIndex--){
  const layer=net.layers[layerIndex];
  const saved=cache.hidden[layerIndex];
  const local=new Float64Array(layer.output);
  for(let out=0;out<layer.output;out++){
   const gate=layerIndex===net.layers.length-1?1:(saved.pre[out]>0?1:0);
   local[out]=upstream[out]*gate;
   grad[layer.bias+out]+=local[out];
   const row=layer.weight+out*layer.input;
   for(let inn=0;inn<layer.input;inn++)grad[row+inn]+=local[out]*saved.input[inn];
  }
  if(!layerIndex)break;
  const next=new Float64Array(layer.input);
  for(let out=0;out<layer.output;out++){
   const row=layer.weight+out*layer.input;
   for(let inn=0;inn<layer.input;inn++)next[inn]+=net.theta[row+inn]*local[out];
  }
  upstream=next;
 }
}
export function clipGrad(grad,limit=GRAD_CLIP){
 let sum=0;
 for(let i=0;i<grad.length;i++)sum+=grad[i]*grad[i];
 const norm=Math.sqrt(sum);
 if(norm>limit&&norm>0){
  const scale=limit/norm;
  for(let i=0;i<grad.length;i++)grad[i]*=scale;
 }
 return norm;
}
export function adamStep(net,opt,grad){
 ensureMoments(opt,net.theta.length);
 opt.step++;
 const correct1=1-opt.beta1**opt.step;
 const correct2=1-opt.beta2**opt.step;
 for(let i=0;i<net.theta.length;i++){
  opt.moment[i]=opt.beta1*opt.moment[i]+(1-opt.beta1)*grad[i];
  opt.velocity[i]=opt.beta2*opt.velocity[i]+(1-opt.beta2)*grad[i]*grad[i];
  const direction=(opt.moment[i]/correct1)/(Math.sqrt(opt.velocity[i]/correct2)+opt.eps);
  net.theta[i]-=opt.lr*(direction+opt.decay*net.theta[i]);
 }
 net.updates++;
}
export function scoreActions(net,state,actions){
 if(state.length!==net.stateDim)throw Error('State width mismatch');
 const first=net.layers[0];
 const base=new Float64Array(first.output);
 for(let out=0;out<first.output;out++){
  let sum=net.theta[first.bias+out];
  const row=first.weight+out*first.input;
  for(let i=0;i<state.length;i++)sum+=net.theta[row+i]*state[i];
  base[out]=sum;
 }
 const scores=new Float64Array(actions.length);
 for(let actionIndex=0;actionIndex<actions.length;actionIndex++){
  const action=actions[actionIndex];
  if(action.length!==net.actionDim)throw Error('Action width mismatch');
  const h1=new Float64Array(first.output);
  for(let out=0;out<first.output;out++){
   let sum=base[out];
   const row=first.weight+out*first.input+state.length;
   for(let i=0;i<action.length;i++)sum+=net.theta[row+i]*action[i];
   h1[out]=sum>0?sum:0;
  }
  let current=h1;
  for(let layerIndex=1;layerIndex<net.layers.length;layerIndex++){
   const layer=net.layers[layerIndex];
   const next=new Float64Array(layer.output);
   const last=layerIndex===net.layers.length-1;
   for(let out=0;out<layer.output;out++){
    let sum=net.theta[layer.bias+out];
    const row=layer.weight+out*layer.input;
    for(let inn=0;inn<layer.input;inn++)sum+=net.theta[row+inn]*current[inn];
    next[out]=last?sum:(sum>0?sum:0);
   }
   current=next;
  }
  scores[actionIndex]=current[0];
 }
 return scores;
}
export function greedyIndex(scores,legal){
 let best=0;
 for(let i=1;i<scores.length;i++){
  const delta=scores[i]-scores[best];
  if(delta>1e-9)best=i;
  else if(Math.abs(delta)<=1e-9&&JSON.stringify(legal[i])<JSON.stringify(legal[best]))best=i;
 }
 return best;
}
export function packNet(net){
 return {
  format:net.format,version:net.version,seed:net.seed,sizes:net.sizes,
  stateDim:net.stateDim,actionDim:net.actionDim,updates:net.updates,
  theta:Array.from(net.theta)
 };
}
export function unpackNet(packed){
 if(packed?.format!==FORMAT)throw Error('Unexpected network format');
 const net=createNet(packed.seed,{sizes:packed.sizes,stateDim:packed.stateDim,version:packed.version});
 if(packed.theta.length!==net.theta.length)throw Error('Network width mismatch');
 net.theta.set(packed.theta);
 net.updates=packed.updates||0;
 return net;
}
export function saveNet(net,file){
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,JSON.stringify(packNet(net)));
}
export function loadNet(file){
 return unpackNet(JSON.parse(readFileSync(file,'utf8')));
}
export {ACTION_DIM,INPUT_DIM,STATE_DIM};
