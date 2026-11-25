// The prediction is a win-rate advantage over v2. It is never added to the blend.
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {cappedPool} from '../../v5d/lib/compare.mjs';
import {fitRidge,pairPredict} from '../../v6a/lib/model.mjs';
import {unchangedChoice} from '../../v6a/lib/model.mjs';
import {
 ALWAYS,GENERIC_FEATURES,INTERACTIONS,POSITION_CONTEXT,SCALE,gameInterval,shrink
} from './protocol.mjs';

function component(features,name){
 const index=POLICY_INDEX[name];
 return index==null?0:(features?.[index]||0);
}
export function contrastFeatures(candidate,baseline){
 const position=POSITION_CONTEXT.map(name=>component(baseline,name));
 const diff=GENERIC_FEATURES.map(name=>component(candidate,name)-component(baseline,name));
 const interactions=INTERACTIONS.map(([left,right])=>component(candidate,left)*component(candidate,right)-component(baseline,left)*component(baseline,right));
 return [...position,...diff,...interactions];
}
export function exampleFrom(row,weights){
 if(!row?.band?.length||!row.keyA||!row.keyB)return null;
 const baseKey=unchangedChoice(row.band,weights);
 let candidateKey=null;
 let advantage=null;
 if(baseKey===row.keyA){candidateKey=row.keyB;advantage=-row.y;}
 else if(baseKey===row.keyB){candidateKey=row.keyA;advantage=row.y;}
 else return null;
 const base=row.band.find(item=>item.key===baseKey);
 const candidate=row.band.find(item=>item.key===candidateKey);
 if(!base?.features||!candidate?.features)return null;
 const pool=cappedPool(row.band);
 return {
  ...row,
  y:advantage,
  x:contrastFeatures(candidate.features,base.features),
  baseKey,
  candidateKey,
  candidateInCap:!pool.length||pool.some(item=>item.key===candidateKey)
 };
}
export function predict(row,model){
 return pairPredict(row,model);
}
export function decide(band,weights,model,threshold){
 const pool=cappedPool(band);
 const source=pool.length?pool:(band||[]);
 const baseKey=chooseKey(source,weights,SCALE);
 if(!source.length||!(threshold<ALWAYS)||!model?.beta?.length)return baseKey;
 const base=source.find(row=>row.key===baseKey);
 if(!base?.features)return baseKey;
 let best=null;
 let bestPred=threshold;
 for(const row of source){
  if(row.key===baseKey||!row.features)continue;
  const pred=predict({x:contrastFeatures(row.features,base.features)},model);
  const left=row.sort||row.key;
  const right=best?.sort||best?.key;
  if(pred>bestPred+1e-12||(best&&pred>threshold&&Math.abs(pred-bestPred)<=1e-12&&left<right)){
   best=row;
   bestPred=pred;
  }
 }
 return best?best.key:baseKey;
}
export function judge(example,weights,model,threshold){
 const choice=decide(example.band,weights,model,threshold);
 if(choice===example.baseKey)return {kind:'stay',gain:null,choice};
 if(choice===example.candidateKey)return {kind:'verified',gain:shrink(example.y,example.n),choice};
 return {kind:'unknown',gain:null,choice};
}
export function summarize(rows){
 let stay=0;
 let verified=0;
 let unknown=0;
 let effective=0;
 let reverse=0;
 const games=new Map();
 for(const row of rows){
  if(row.kind==='stay')stay++;
  else if(row.kind==='verified'){
   verified++;
   if(row.gain>0)effective++;
   else if(row.gain<0)reverse++;
  }else unknown++;
  const list=games.get(row.game)||[];
  list.push(row);
  games.set(row.game,list);
 }
 const identified=[];
 let unknownGames=0;
 for(const list of games.values()){
  if(list.some(row=>row.kind==='unknown')){unknownGames++;continue;}
  const gains=list.map(row=>row.kind==='verified'?row.gain:0);
  identified.push(gains.reduce((sum,value)=>sum+value,0)/gains.length);
 }
 return {
  stay,verified,unknown,effective,reverse,
  positions:rows.length,
  coverage:rows.length?(verified+unknown)/rows.length:0,
  verifiedCoverage:rows.length?verified/rows.length:0,
  unknownGames,
  identifiedGames:identified.length,
  gain:gameInterval(identified)
 };
}
export function chooseThreshold(evaluations){
 let best=null;
 for(const item of evaluations){
  if(!item.eligible)continue;
  const better=!best
   ||item.utility>best.utility+1e-12
   ||(Math.abs(item.utility-best.utility)<=1e-12&&item.threshold>best.threshold);
  if(better)best=item;
 }
 return best;
}
export function foldUtility(examples,weights,model,threshold,allowed){
 const judged=examples.map(example=>({...judge(example,weights,model,threshold),game:example.game}));
 const summary=summarize(judged);
 const illegal=allowed?examples.some(example=>!allowed(example,decide(example.band,weights,model,threshold))):false;
 return {
  threshold,
  eligible:summary.unknown===0&&!illegal,
  utility:summary.unknown===0&&summary.gain.mean!=null?summary.gain.mean:0,
  summary
 };
}
export function fitExamples(examples,lambda){
 return fitRidge(examples,lambda);
}
