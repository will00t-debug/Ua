// Exact paired sign test for differences in {-1, 0, +1}.
// Ties stay in the mean and drop out of the binomial test.
const ALPHA=0.05;

function logChoose(n,k){
 if(k<0||k>n)return -Infinity;
 let sum=0;
 const m=Math.min(k,n-k);
 for(let index=1;index<=m;index++)sum+=Math.log(n-m+index)-Math.log(index);
 return sum;
}
function logBinom(k,n,p){
 if(n===0)return k===0?0:-Infinity;
 if(p<=0)return k===0?0:-Infinity;
 if(p>=1)return k===n?0:-Infinity;
 return logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log(1-p);
}
function logSumExp(values){
 const finite=values.filter(value=>value>-Infinity);
 if(!finite.length)return -Infinity;
 const top=Math.max(...finite);
 return top+Math.log(finite.reduce((sum,value)=>sum+Math.exp(value-top),0));
}
export function binomialUpper(successes,trials,p=0.5){
 if(trials<=0)return 1;
 if(successes<=0)return 1;
 if(successes>trials)return 0;
 const logs=[];
 for(let index=successes;index<=trials;index++)logs.push(logBinom(index,trials,p));
 return Math.exp(logSumExp(logs));
}
export function binomialLower(successes,trials,p=0.5){
 if(trials<=0)return 1;
 if(successes<0)return 0;
 if(successes>=trials)return 1;
 const logs=[];
 for(let index=0;index<=successes;index++)logs.push(logBinom(index,trials,p));
 return Math.exp(logSumExp(logs));
}
export function countDiffs(diffs){
 let plus=0;
 let minus=0;
 let tie=0;
 for(const value of diffs||[]){
  if(value>0)plus++;
  else if(value<0)minus++;
  else if(value===0)tie++;
 }
 return {plus,minus,tie,n:plus+minus+tie,decisive:plus+minus};
}
function twoSided(successes,trials){
 if(trials<=0)return 1;
 const center=trials/2;
 const distance=Math.abs(successes-center);
 let total=0;
 for(let index=0;index<=trials;index++){
  if(Math.abs(index-center)+1e-12<distance)continue;
  total+=Math.exp(logBinom(index,trials,0.5));
 }
 return Math.min(1,total);
}
export function signTest(diffs){
 const counts=countDiffs(diffs);
 const mean=counts.n?(counts.plus-counts.minus)/counts.n:0;
 if(!counts.decisive){
  return {...counts,mean,pOne:1,pTwo:1};
 }
 return {
  ...counts,mean,
  pOne:binomialUpper(counts.minus,counts.decisive,0.5),
  pTwo:twoSided(counts.minus,counts.decisive)
 };
}
function smallestWhere(predicate){
 let low=0;
 let high=1;
 for(let step=0;step<60;step++){
  const mid=(low+high)/2;
  if(predicate(mid))high=mid;
  else low=mid;
 }
 return high;
}
export function clopperPearson(successes,trials,alpha=ALPHA){
 if(trials<=0)return {low:0,high:1};
 const tail=alpha/2;
 const low=successes<=0?0:smallestWhere(value=>binomialUpper(successes,trials,value)>tail);
 const high=successes>=trials?1:smallestWhere(value=>binomialLower(successes,trials,value)<tail);
 return {low,high};
}
export function conditionalMeanInterval(diffs,alpha=ALPHA){
 const counts=countDiffs(diffs);
 const mean=counts.n?(counts.plus-counts.minus)/counts.n:0;
 if(!counts.decisive)return {...counts,mean,low:0,high:0};
 const pi=clopperPearson(counts.plus,counts.decisive,alpha);
 const scale=counts.decisive/counts.n;
 return {...counts,mean,low:scale*(2*pi.low-1),high:scale*(2*pi.high-1)};
}
export function holm(pValues,alpha=ALPHA){
 const order=pValues.map((p,index)=>({p,index})).sort((left,right)=>left.p-right.p||left.index-right.index);
 const kept=new Set();
 for(let rank=0;rank<order.length;rank++){
  if(!(order[rank].p<=alpha/(order.length-rank)))break;
  kept.add(order[rank].index);
 }
 return kept;
}
