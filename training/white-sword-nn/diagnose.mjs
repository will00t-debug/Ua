// Fixed-sample measurements for the imitation-to-return transition.
// These functions do not play games and do not read a win rate.
import {imitationAgreement} from './agree.mjs';
import {shuffle} from './learn.mjs';
import {forwardTrain,greedyIndex,sameWeights} from './net.mjs';

export function summarizeValues(values){
 const sorted=(values||[]).filter(Number.isFinite).slice().sort((left,right)=>left-right);
 if(!sorted.length)return {n:0,min:null,p10:null,p50:null,p90:null,max:null,mean:null};
 const at=p=>sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1))];
 const mean=sorted.reduce((sum,value)=>sum+value,0)/sorted.length;
 return {n:sorted.length,min:sorted[0],p10:at(0.1),p50:at(0.5),p90:at(0.9),max:sorted.at(-1),mean};
}
function usable(sample){
 const width=sample?.rows?.length||0;
 return width>=2&&sample.actions?.length===width&&Number.isInteger(sample.chosen)&&sample.chosen>=0&&sample.chosen<width;
}
function beats(scores,legal,index,other){
 const delta=scores[other]-scores[index];
 if(delta>1e-9)return true;
 return Math.abs(delta)<=1e-9&&JSON.stringify(legal[other])<JSON.stringify(legal[index]);
}
export function outputProfile(net,samples){
 const q=[];
 const target=[];
 for(const sample of samples||[]){
  if(!sample?.x||!Number.isFinite(sample.target))continue;
  q.push(forwardTrain(net,sample.x).q);
  target.push(sample.target);
 }
 return {
  q:summarizeValues(q),
  target:summarizeValues(target),
  absGap:summarizeValues(q.map((value,index)=>Math.abs(value-target[index])))
 };
}
export function rankingProfile(net,samples){
 const margins=[];
 const ranks=[];
 const chosen=[];
 for(const sample of samples||[]){
  if(!usable(sample))continue;
  const scores=sample.rows.map(row=>forwardTrain(net,row).q);
  const others=scores.filter((_,index)=>index!==sample.chosen);
  margins.push(scores[sample.chosen]-Math.max(...others));
  let better=0;
  for(let index=0;index<scores.length;index++){
   if(index!==sample.chosen&&beats(scores,sample.actions,sample.chosen,index))better++;
  }
  ranks.push(better);
  chosen.push(scores[sample.chosen]);
 }
 return {
  agreement:imitationAgreement(net,samples||[]),
  margin:summarizeValues(margins),
  rank:summarizeValues(ranks),
  chosen:summarizeValues(chosen),
  top:ranks.filter(rank=>rank===0).length
 };
}
export function copiesMatch(left,right,groups){
 if(!sameWeights(left,right)||left.updates!==right.updates)return false;
 for(const group of groups||[]){
  const a=group.map(row=>forwardTrain(left,row).q);
  const b=group.map(row=>forwardTrain(right,row).q);
  for(let index=0;index<a.length;index++)if(!Object.is(a[index],b[index]))return false;
  if(greedyIndex(Float64Array.from(a),group)!==greedyIndex(Float64Array.from(b),group))return false;
 }
 return true;
}
export function evaluationSymmetry(games){
 const groups=new Map();
 for(const game of games||[]){
  const key=game.seed+':'+game.first;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(game);
 }
 let pairs=0,winnerMatch=0,actionMatch=0,actionCompared=0,missing=0,decisive=0,learnerHalf=0;
 const problems=[];
 for(const [key,list] of groups){
  const left=list.find(game=>game.learnerSeat===0);
  const right=list.find(game=>game.learnerSeat===1);
  if(!left||!right){
   missing++;
   problems.push(key);
   continue;
  }
  pairs++;
  if(Object.is(left.winner,right.winner))winnerMatch++;
  else problems.push(key+':winner');
  if(left.actions&&right.actions){
   actionCompared++;
   if(JSON.stringify(left.actions)===JSON.stringify(right.actions))actionMatch++;
   else problems.push(key+':actions');
  }
  if(left.winner===0||left.winner===1){
   decisive++;
   const wins=(left.winner===0?1:0)+(right.winner===1?1:0);
   if(wins===1)learnerHalf++;
  }
 }
 const ok=pairs>0&&missing===0&&winnerMatch===pairs&&
  (actionCompared===0||actionMatch===actionCompared)&&learnerHalf===decisive;
 return {pairs,winnerMatch,actionMatch,actionCompared,missing,decisive,learnerHalf,ok,problems};
}
export function fixedUpdatePasses(games,rng){
 const recent=[];
 const passes=[];
 for(const samples of games||[]){
  const bag=recent.flat().concat(samples||[]);
  passes.push(shuffle(bag,rng));
  recent.push(samples||[]);
  if(recent.length>4)recent.shift();
 }
 return passes;
}
