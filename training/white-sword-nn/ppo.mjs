// Actor–Critic PPO-Clip for the white-sword experiment.
// The actor is a copied preference. The critic is a separate value fit.
// Nothing here reads a win rate or mixes in an old replay buffer.
import {GRAD_CLIP,HIDDEN} from './constants.mjs';
import {ACTION_DIM,STATE_DIM,joinFeatures} from './encode.mjs';
import {shuffle} from './learn.mjs';
import {
 adamStep,backward,clipGrad,createNet,forwardTrain,greedyIndex,sameWeights,scoreActions,zeroGrad
} from './net.mjs';

export function createCritic(seed){
 return createNet(seed,{
  sizes:[STATE_DIM,HIDDEN[0],HIDDEN[1],1],
  stateDim:STATE_DIM,
  version:'nn-critic-r4'
 });
}

export function categorical(scores){
 const width=scores.length;
 if(!width)throw Error('policy has no legal action');
 let max=-Infinity;
 for(let index=0;index<width;index++){
  const score=scores[index];
  if(!Number.isFinite(score))throw Error('logit is not finite');
  if(score>max)max=score;
 }
 const probs=new Array(width);
 let sum=0;
 for(let index=0;index<width;index++){
  const prob=Math.exp(scores[index]-max);
  probs[index]=prob;
  sum+=prob;
 }
 if(!(sum>0)||!Number.isFinite(sum))throw Error('policy mass is empty');
 const logSum=Math.log(sum);
 const logProbs=new Array(width);
 for(let index=0;index<width;index++){
  probs[index]/=sum;
  logProbs[index]=scores[index]-max-logSum;
 }
 return {probs,logProbs};
}
export function sampleCategorical(probs,rng){
 if(!probs.length)throw Error('policy has no legal action');
 let cursor=rng();
 if(!Number.isFinite(cursor)||cursor<0||cursor>=1)throw Error('sampler draw is outside [0,1)');
 for(let index=0;index<probs.length;index++){
  const prob=probs[index];
  if(!Number.isFinite(prob)||prob<0)throw Error('policy probability is not usable');
  cursor-=prob;
  if(cursor<=0)return index;
 }
 return probs.length-1;
}
export function policyRatio(newLogProb,oldLogProb){
 if(!Number.isFinite(newLogProb)||!Number.isFinite(oldLogProb))throw Error('log probability is not finite');
 const ratio=Math.exp(newLogProb-oldLogProb);
 if(!Number.isFinite(ratio)||!(ratio>0))throw Error('policy ratio is not finite');
 return ratio;
}
export function surrogateFlows(advantage,ratio,epsilon){
 if(!(epsilon>0&&epsilon<1))throw Error('clip epsilon is outside (0,1)');
 if(!Number.isFinite(advantage)||!Number.isFinite(ratio))throw Error('surrogate inputs are not finite');
 if(advantage>0)return ratio<=1+epsilon;
 if(advantage<0)return ratio>=1-epsilon;
 return false;
}
export function policyLossGrad(probs,chosen,advantage,ratio,epsilon,entropyCoef){
 const width=probs.length;
 const grad=new Array(width).fill(0);
 if(!Number.isInteger(chosen)||chosen<0||chosen>=width)throw Error('chosen action is outside the legal set');
 if(surrogateFlows(advantage,ratio,epsilon)){
  for(let index=0;index<width;index++){
   const indicator=index===chosen?1:0;
   grad[index]-=advantage*ratio*(indicator-probs[index]);
  }
 }
 if(entropyCoef){
  if(!(entropyCoef>0))throw Error('entropy coefficient is not positive');
  let expected=0;
  for(let index=0;index<width;index++)expected+=probs[index]*Math.log(Math.max(probs[index],1e-300));
  for(let index=0;index<width;index++){
   const logProb=Math.log(Math.max(probs[index],1e-300));
   const entropyGrad=-probs[index]*(logProb-expected);
   grad[index]-=entropyCoef*entropyGrad;
  }
 }
 return grad;
}
export function behaviorKl(oldLogProbs,newLogProbs){
 if(oldLogProbs.length!==newLogProbs.length)throw Error('behavior distributions differ in width');
 let kl=0;
 for(let index=0;index<oldLogProbs.length;index++){
  const prob=Math.exp(oldLogProbs[index]);
  kl+=prob*(oldLogProbs[index]-newLogProbs[index]);
 }
 return kl;
}
export function clippedObjective(ratio,advantage,epsilon){
 const clipped=Math.min(1+epsilon,Math.max(1-epsilon,ratio));
 return Math.min(ratio*advantage,clipped*advantage);
}
export function actorScores(actor,state,actions){
 return scoreActions(actor,state,actions);
}
export function greedyFromActor(actor,state,actions,legal){
 const scores=actorScores(actor,state,actions);
 return {scores,index:greedyIndex(scores,legal||actions)};
}
export function criticValue(critic,state){
 if(!state||state.length!==critic.sizes[0])throw Error('Critic input width mismatch');
 return forwardTrain(critic,state).q;
}
export function buildPpoSample({
 state,actions,chosen,logProbs,value,behaviorVersion,behaviorUpdates,seat,index
}){
 if(!Array.isArray(state)||state.length!==STATE_DIM)throw Error('PPO state width mismatch');
 if(!Array.isArray(actions)||actions.length<2)throw Error('PPO sample needs a real choice');
 if(!Number.isInteger(chosen)||chosen<0||chosen>=actions.length)throw Error('PPO choice is outside the legal set');
 if(!logProbs||logProbs.length!==actions.length)throw Error('PPO log probabilities do not match the legal set');
 if(!Number.isFinite(value))throw Error('PPO sample needs a frozen value');
 if(typeof behaviorVersion!=='string'||!behaviorVersion)throw Error('PPO sample needs a behavior version');
 if(!Number.isInteger(behaviorUpdates)||behaviorUpdates<0)throw Error('PPO sample needs a behavior update count');
 if(!Number.isInteger(seat)||(seat!==0&&seat!==1))throw Error('PPO sample needs an actor seat');
 if(!Number.isInteger(index)||index<0)throw Error('PPO sample needs a decision index');
 let mass=0;
 for(let actionIndex=0;actionIndex<actions.length;actionIndex++){
  const action=actions[actionIndex];
  if(!action||action.length!==ACTION_DIM)throw Error('PPO action width mismatch');
  for(let feature=0;feature<action.length;feature++)if(!Number.isFinite(action[feature]))throw Error('PPO action feature is not finite');
  if(!Number.isFinite(logProbs[actionIndex]))throw Error('PPO log probability is not finite');
  mass+=Math.exp(logProbs[actionIndex]);
 }
 for(let feature=0;feature<state.length;feature++)if(!Number.isFinite(state[feature]))throw Error('PPO state feature is not finite');
 if(Math.abs(mass-1)>1e-6)throw Error('legal action probabilities do not sum to 1');
 return {
  source:'ppo',index,seat,
  state:state.slice(),
  actions:actions.map(action=>action.slice()),
  chosen,
  oldLogProb:logProbs[chosen],
  oldLogProbs:logProbs.slice(),
  value,
  behaviorVersion,
  behaviorUpdates
 };
}
export function assertModelInput(sample){
 if(sample?.source!=='ppo')throw Error('not a PPO sample');
 if('seed' in sample||'uid' in sample||'deck' in sample||'life' in sample||'hand' in sample){
  throw Error('hidden bookkeeping entered the PPO sample');
 }
 const text=JSON.stringify({state:sample.state,actions:sample.actions});
 if(/"(seed|uid|deck|life|hand)"/.test(text))throw Error('model input named a hidden field');
 if(/[01]-\d+/.test(text))throw Error('uid text entered the model input');
 if(sample.state.length!==STATE_DIM)throw Error('state width mismatch');
 return {state:sample.state,actions:sample.actions};
}
export function assertOnPolicy(samples,behavior){
 if(!samples?.length)throw Error('on-policy batch is empty');
 for(const sample of samples){
  assertModelInput(sample);
  if(sample.behaviorVersion!==behavior.version)throw Error('sample is not from the frozen behavior');
  if(sample.behaviorUpdates!==behavior.updates)throw Error('sample does not match the frozen update count');
  const scores=scoreActions(behavior,sample.state,sample.actions);
  const dist=categorical(Array.from(scores));
  if(Math.abs(dist.logProbs[sample.chosen]-sample.oldLogProb)>1e-9){
   throw Error('stored log probability does not match the frozen behavior');
  }
  for(let index=0;index<dist.logProbs.length;index++){
   if(Math.abs(dist.logProbs[index]-sample.oldLogProbs[index])>1e-9){
    throw Error('stored behavior distribution changed');
   }
  }
 }
}
export function currentRatio(actor,sample){
 const scores=sample.actions.map(action=>forwardTrain(actor,joinFeatures(sample.state,action)).q);
 const dist=categorical(scores);
 return policyRatio(dist.logProbs[sample.chosen],sample.oldLogProb);
}
export function fixedAdvantages(samples){
 return samples.map(sample=>{
  if(!Number.isFinite(sample.target)||!Number.isFinite(sample.value))throw Error('advantage needs a frozen value and a return');
  return sample.target-sample.value;
 });
}
export function normalizeAdvantages(values){
 const width=values?.length||0;
 if(width<2)return {advantages:Array.from({length:width},()=>0),mean:width?values[0]:null,std:0,zeroVariance:true};
 let mean=0;
 for(const value of values){
  if(!Number.isFinite(value))throw Error('advantage is not finite');
  mean+=value;
 }
 mean/=width;
 let variance=0;
 for(const value of values)variance+=(value-mean)**2;
 variance/=width-1;
 if(!(variance>1e-12))return {advantages:values.map(()=>0),mean,std:0,zeroVariance:true};
 const std=Math.sqrt(variance);
 return {advantages:values.map(value=>(value-mean)/std),mean,std,zeroVariance:false};
}
export function actorPpoStep(actor,opt,sample,{clip,entropy}={}){
 if(sample?.source!=='ppo')throw Error('off-policy sample entered the actor update');
 if(!Number.isFinite(sample.advantage))throw Error('advantage was not fixed');
 const caches=sample.actions.map(action=>forwardTrain(actor,joinFeatures(sample.state,action)));
 const scores=caches.map(cache=>cache.q);
 const dist=categorical(scores);
 const newLogProb=dist.logProbs[sample.chosen];
 const ratio=policyRatio(newLogProb,sample.oldLogProb);
 const flows=surrogateFlows(sample.advantage,ratio,clip);
 const logitGrad=policyLossGrad(dist.probs,sample.chosen,sample.advantage,ratio,clip,entropy||0);
 const grad=zeroGrad(actor);
 logitGrad.forEach((signal,index)=>{
  if(signal)backward(actor,caches[index],signal,grad);
 });
 clipGrad(grad,GRAD_CLIP);
 adamStep(actor,opt,grad);
 let entropyValue=0;
 for(let index=0;index<dist.probs.length;index++)entropyValue-=dist.probs[index]*dist.logProbs[index];
 return {
  ratio,newLogProb,entropy:entropyValue,kl:behaviorKl(sample.oldLogProbs,dist.logProbs),
  clipped:!flows,objective:clippedObjective(ratio,sample.advantage,clip)
 };
}
export function criticStep(critic,opt,state,target){
 if(!Number.isFinite(target))throw Error('return target is not finite');
 const cache=forwardTrain(critic,state);
 const error=cache.q-target;
 const grad=zeroGrad(critic);
 backward(critic,cache,error,grad);
 clipGrad(grad,GRAD_CLIP);
 adamStep(critic,opt,grad);
 return error*error;
}
export function ppoUpdate({actor,actorOpt,critic,criticOpt,behavior,samples,config}){
 if(!config?.rng)throw Error('PPO update needs the locked random stream');
 if(!(config.epochs>0)||!Number.isInteger(config.epochs))throw Error('PPO epochs were not fixed');
 assertOnPolicy(samples,behavior);
 if(sameWeights(actor,behavior)){
  for(const sample of samples){
   const ratio=currentRatio(actor,sample);
   if(Math.abs(ratio-1)>1e-6)throw Error('new and old policy ratio is not 1 before the update');
  }
 }
 const frozenAdvantage=samples.map(sample=>sample.advantage);
 const epochs=[];
 let stopped=false;
 let ran=0;
 for(let epoch=0;epoch<config.epochs;epoch++){
  const order=shuffle(samples,config.rng);
  let objective=0,criticLoss=0,entropy=0,kl=0,clipped=0,used=0;
  for(const sample of order){
   const step=actorPpoStep(actor,actorOpt,sample,config);
   const squared=criticStep(critic,criticOpt,sample.state,sample.target);
   objective+=step.objective;
   criticLoss+=squared;
   entropy+=step.entropy;
   kl+=step.kl;
   clipped+=step.clipped?1:0;
   used++;
  }
  ran++;
  const row={
   samples:used,
   actorObjective:used?objective/used:null,
   criticMse:used?criticLoss/used:null,
   entropy:used?entropy/used:null,
   kl:used?kl/used:null,
   clippedRate:used?clipped/used:null
  };
  epochs.push(row);
  if(row.kl>config.klLimit){
   stopped=true;
   break;
  }
 }
 for(let index=0;index<samples.length;index++){
  if(samples[index].advantage!==frozenAdvantage[index])throw Error('advantage changed during the PPO update');
  if(samples[index].oldLogProb==null)throw Error('old log probability was dropped');
 }
 return {epochs:ran,stopped,rows:epochs};
}
export function splitOutcomes(games){
 const done=[];
 const unfinished=[];
 const flags=['illegal','timeout','fallback','deadLoop','engineError','leak','opponentFallback','unfinished'];
 for(const game of games||[]){
  const anomalies=game?.anomalies||{};
  const bad=flags.some(key=>anomalies[key]);
  const complete=game?.status==='finished'&&(game.winner===0||game.winner===1)&&!bad;
  if(complete)done.push(game);
  else unfinished.push({
   seed:game?.seed??null,first:game?.first??null,learnerSeat:game?.learnerSeat??null,
   status:game?.status||'missing',endReason:game?.endReason||null,steps:game?.steps||0,
   anomalies:{...anomalies}
  });
 }
 return {done,unfinished};
}
