// Linear policy and value. Updates are ordinary gradient steps on the weights.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {FORMAT,MODEL_VERSION} from './constants.mjs';
import {POLICY_DIM,POLICY_NAMES,VALUE_DIM} from './features.mjs';

export function createModel(version=MODEL_VERSION){
 return {
  format:FORMAT,
  version,
  policy:Array(POLICY_DIM).fill(0),
  value:Array(VALUE_DIM).fill(0),
  updates:0,
  samples:0,
  curve:[],
  config:null,
  sourceCommit:null,
  promoted:false,
  promotion:null
 };
}
export function cloneModel(model){
 return JSON.parse(JSON.stringify(model));
}
export function l2(vector){
 return Math.sqrt(vector.reduce((sum,value)=>sum+value*value,0));
}
export function modelL2(model){
 return {policy:l2(model.policy),value:l2(model.value)};
}
export function dot(weights,features){
 let score=0;
 for(let i=0;i<weights.length;i++)score+=weights[i]*(features[i]||0);
 return score;
}
function sigmoid(value){
 const x=Math.max(-20,Math.min(20,value));
 return 1/(1+Math.exp(-x));
}
function clamp(value){
 return Math.max(-6,Math.min(6,value));
}
function targetOf(reward){
 if(reward==='win')return 1;
 if(reward==='loss')return 0;
 if(reward==='draw')return 0.5;
 throw Error('Reward must be the match result');
}
function validateSample(sample){
 if(!sample||(sample.kind!=='teacher'&&sample.kind!=='outcome'))throw Error('Sample kind must be teacher or outcome');
 if(!Array.isArray(sample.chosen)||sample.chosen.length!==POLICY_DIM)throw Error('Policy feature width mismatch');
 if(!Array.isArray(sample.negatives)||!sample.negatives.length)throw Error('Sample needs contrasting actions');
 for(const row of sample.negatives)if(!Array.isArray(row)||row.length!==POLICY_DIM)throw Error('Policy feature width mismatch');
 if(!Array.isArray(sample.value)||sample.value.length!==VALUE_DIM)throw Error('Value feature width mismatch');
 if(sample.kind==='outcome')targetOf(sample.reward);
 if(sample.kind==='teacher'&&sample.reward!=null)throw Error('Teacher samples do not take a match reward');
}
function teacherStep(weights,positive,negative,lr){
 let margin=0;
 for(let i=0;i<weights.length;i++)margin+=weights[i]*((positive[i]||0)-(negative[i]||0));
 const scale=lr*(1-sigmoid(margin));
 if(!scale)return;
 for(let i=0;i<weights.length;i++){
  const delta=(positive[i]||0)-(negative[i]||0);
  if(delta)weights[i]=clamp(weights[i]+scale*delta);
 }
}
function outcomeStep(weights,positive,negative,step){
 for(let i=0;i<weights.length;i++){
  const delta=(positive[i]||0)-(negative[i]||0);
  if(delta)weights[i]=clamp(weights[i]+step*delta);
 }
}
function valueStep(weights,features,target,lr){
 const prediction=sigmoid(dot(weights,features));
 const error=target-prediction;
 for(let i=0;i<weights.length;i++)if(features[i])weights[i]=clamp(weights[i]+lr*error*features[i]);
 return prediction;
}
function decay(weights,rate){
 for(let i=0;i<weights.length;i++)weights[i]*=1-rate;
}
export function updateModel(model,samples,{lr=0.05,valueLr=0.05,epochs=1,decayRate=1e-4}={}){
 if(model?.format!==FORMAT)throw Error('Unexpected model format');
 if(model.policy.length!==POLICY_DIM||model.value.length!==VALUE_DIM)throw Error('Unexpected model width');
 const rows=Array.isArray(samples)?samples:[];
 for(const sample of rows)validateSample(sample);
 const before=modelL2(model);
 if(!rows.length)return {before,after:before,delta:0,samples:0};
 for(let epoch=0;epoch<epochs;epoch++){
  for(const sample of rows){
   if(sample.kind==='teacher'){
    for(const negative of sample.negatives)teacherStep(model.policy,sample.chosen,negative,lr);
   }else{
    const prediction=valueStep(model.value,sample.value,targetOf(sample.reward),valueLr);
    const advantage=targetOf(sample.reward)-prediction;
    const step=lr*advantage/sample.negatives.length;
    for(const negative of sample.negatives)outcomeStep(model.policy,sample.chosen,negative,step);
   }
  }
  decay(model.policy,decayRate);
  decay(model.value,decayRate);
 }
 model.updates+=1;
 model.samples+=rows.length;
 const after=modelL2(model);
 return {before,after,delta:after.policy-before.policy,samples:rows.length};
}
export function topWeights(model,limit=12){
 return model.policy.map((weight,index)=>({name:POLICY_NAMES[index],weight}))
  .filter(row=>row.weight)
  .sort((a,b)=>Math.abs(b.weight)-Math.abs(a.weight))
  .slice(0,limit);
}
export function saveModel(model,file){
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,JSON.stringify(model,null,2));
}
export function loadModel(file){
 const model=JSON.parse(readFileSync(file,'utf8'));
 if(model.format!==FORMAT)throw Error('Unexpected model format');
 if(!Array.isArray(model.policy)||model.policy.length!==POLICY_DIM)throw Error('Unexpected policy width');
 if(!Array.isArray(model.value)||model.value.length!==VALUE_DIM)throw Error('Unexpected value width');
 return model;
}
