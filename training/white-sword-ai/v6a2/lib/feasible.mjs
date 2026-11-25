// Exact clip and the official tie break. Shared weights are checked by a linear program.
import {spawnSync} from 'node:child_process';
import {blendScore} from '../../v4a2/lib/sensitivity.mjs';
import {singleFeatures} from '../../v6a/lib/model.mjs';
import {SCALE} from '../../v6a/lib/protocol.mjs';
import {numericalRank} from './rank.mjs';

export const CLIP=18;
const EPS=1e-4;
const SOLVER='scripts/white-sword-v6a2-numerics.py';

export function winner(actions){
 let best=actions[0];
 for(const action of actions.slice(1)){
  const diff=action.total-best.total;
  const left=action.sort||action.key;
  const right=best.sort||best.key;
  if(diff>1e-12||(Math.abs(diff)<=1e-12&&left<right))best=action;
 }
 return best;
}
export function withResidual(actions,assign){
 return actions.map(action=>({...action,total:action.blend+assign(action)}));
}
export function looseCanChange(actions){
 const base=winner(actions.map(action=>({...action,total:action.blend})));
 for(const rival of actions){
  if(rival.key===base.key)continue;
  const scored=withResidual(actions,action=>action.key===rival.key?CLIP:-CLIP);
  if(winner(scored).key===rival.key)return {possible:true,key:rival.key};
 }
 return {possible:false,key:null};
}
export function callNumerics(request){
 const result=spawnSync('python3',[SOLVER],{input:JSON.stringify(request),encoding:'utf8',maxBuffer:64*1024*1024});
 if(result.status!==0)throw Error(result.stderr||'數值程式失敗');
 return JSON.parse(result.stdout);
}
function inequalities(actions,winnerKey,dimension,eps){
 const rows=[];
 const bounds=[];
 const winner=actions.find(action=>action.key===winnerKey);
 for(const action of actions){
  rows.push([...action.phi]);
  bounds.push(CLIP);
  rows.push(action.phi.map(value=>-value));
  bounds.push(CLIP);
 }
 for(const action of actions){
  if(action.key===winnerKey)continue;
  const gap=action.blend-winner.blend+eps;
  const diff=winner.phi.map((value,index)=>-(value-action.phi[index]));
  rows.push(diff);
  bounds.push(-gap);
 }
 return {A:rows,b:bounds,variables:dimension};
}
export function actionView(position,weights,interactions){
 return (position.band||[]).filter(row=>row?.key&&row.features).map(row=>({
  key:row.key,
  sort:row.sort||row.key,
  blend:blendScore(row.hard,weights,row.features,SCALE),
  phi:singleFeatures(row.features,interactions)
 }));
}
export function proveTargets(groups,{seconds=10,name='joint'}={}){
 const dimension=groups[0]?.actions[0]?.phi.length||0;
 const A=[];
 const b=[];
 for(const group of groups){
  const block=inequalities(group.actions,group.winnerKey,dimension,group.eps??0);
  A.push(...block.A);
  b.push(...block.b);
 }
 if(!A.length)return {status:'undecided',beta:null};
 const answer=callNumerics({lps:[{name,seconds,A,b,variables:dimension}]});
 return answer.lps[0];
}
export function matrixRank(matrix){
 const qr=numericalRank(matrix);
 let svd=null;
 try{svd=callNumerics({svd:matrix}).svd;}catch{svd=null;}
 return {qr,svd};
}
