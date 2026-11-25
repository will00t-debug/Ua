// A feature earns a representation trial only when the confirmed position
// is not just another copy of the same line contrast.
import {INTERACTION_KIND,INTERACTION_NAMES} from './protocol.mjs';

export function quantile(values,p){
 const rows=(values||[]).filter(value=>Number.isFinite(value)).slice().sort((left,right)=>left-right);
 if(!rows.length)return null;
 const index=(rows.length-1)*p;
 const lo=Math.floor(index);
 const hi=Math.ceil(index);
 if(lo===hi)return rows[lo];
 return rows[lo]*(hi-index)+rows[hi]*(index-lo);
}
export function summarize(values){
 const rows=(values||[]).filter(value=>Number.isFinite(value));
 if(!rows.length)return {n:0,min:null,p25:null,median:null,p75:null,max:null,mean:null};
 const mean=rows.reduce((sum,value)=>sum+value,0)/rows.length;
 return {
  n:rows.length,min:quantile(rows,0),p25:quantile(rows,0.25),median:quantile(rows,0.5),
  p75:quantile(rows,0.75),max:quantile(rows,1),mean
 };
}
function spread(values){
 const stats=summarize(values);
 if(stats.n<2)return 0;
 const mean=stats.mean;
 const variance=values.reduce((sum,value)=>sum+(value-mean)**2,0)/(values.length-1);
 return Math.sqrt(variance);
}
export function judgeFeature(name,pairs){
 const kind=INTERACTION_KIND[name];
 const target=(pairs||[]).find(pair=>pair.role==='target');
 const protect=(pairs||[]).filter(pair=>pair.role==='protect-front');
 const targetDiff=target?target.diff:null;
 const protectDiffs=protect.map(pair=>pair.diff);
 const median=quantile(protectDiffs,0.5);
 const upper=quantile(protectDiffs,0.75);
 const varies=spread((pairs||[]).map(pair=>pair.diff))>0.02;
 const material=targetDiff!=null&&targetDiff>0.05;
 const apart=material&&median!=null&&median<=targetDiff/2&&targetDiff>=2*Math.max(upper||0,0);
 const pass=kind==='position-action'&&varies&&apart;
 let reason='數值把目標和現有前線選擇分開';
 if(kind!=='position-action')reason='這是卡牌自己的數值乘上路線，不是局面交互';
 else if(!material)reason='目標上的能量線減前線沒有明顯差距';
 else if(!varies)reason='同一張卡的路線差幾乎是常數';
 else if(!apart)reason='留在前線的局面有相近的差值，分不開這一筆偏好';
 return {
  name,kind,pass,reason,targetDiff,median,p75:upper,varies,
  protect:protect.length,spread:spread((pairs||[]).map(pair=>pair.diff))
 };
}
export function judgeAll(pairsByName){
 return INTERACTION_NAMES.map(name=>judgeFeature(name,pairsByName[name]||[]));
}
export function passingNames(judgments){
 return (judgments||[]).filter(row=>row.pass).map(row=>row.name);
}
