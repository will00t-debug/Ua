// One pre-registered direction per position. A miss is inconclusive.
import {binomialUpper,holm,signTest} from '../../v4b4/lib/exact.mjs';

export function directedP(diffs,direction){
 const exact=signTest(diffs);
 if(direction!=='negative'&&direction!=='positive')throw Error('確認方向沒有事先登記');
 const p=!exact.decisive?1:direction==='negative'?exact.pOne:binomialUpper(exact.plus,exact.decisive,0.5);
 const aligned=direction==='negative'?exact.mean<0:exact.mean>0;
 return {mean:exact.mean,plus:exact.plus,minus:exact.minus,tie:exact.tie,decisive:exact.decisive,p,aligned};
}
export function judgeDirected(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('沒有要確認的局面');
 const judged=rows.map(row=>({id:row.id,direction:row.direction,...directedP(row.diffs,row.direction)}));
 const kept=holm(judged.map(row=>row.p));
 return judged.map((row,index)=>{
  const confirmed=kept.has(index)&&row.aligned;
  return {...row,holm:kept.has(index),confirmed,status:confirmed?'confirmed':'inconclusive'};
 });
}
