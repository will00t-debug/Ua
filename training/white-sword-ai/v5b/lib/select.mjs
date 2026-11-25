// Pick at most eight collateral positions before any validation pair.
// The sort uses only public position fields, never rollout results.
import {VALIDATE_CAP} from './protocol.mjs';

const QUOTAS=Object.freeze([['keep-front',2],['fresh',2],['other',2]]);

function tags(row){
 return [row.role,row.opponent,row.stage,row.bucket,row.energyBand,row.frontBand];
}
function gain(row,picked){
 const have=new Set(picked.flatMap(tags));
 return tags(row).filter(tag=>tag&&!have.has(tag)).length;
}
function take(pool,picked,used,count){
 const waiting=pool.filter(row=>!used.has(row.id));
 let left=count;
 while(left>0&&waiting.length&&picked.length<VALIDATE_CAP){
  waiting.sort((leftRow,rightRow)=>gain(rightRow,picked)-gain(leftRow,picked)||(leftRow.id<rightRow.id?-1:1));
  const next=waiting.shift();
  picked.push(next);
  used.add(next.id);
  left--;
 }
}
export function selectCollateral(rows,{cap=VALIDATE_CAP}={}){
 const picked=[];
 const used=new Set();
 for(const [role,count] of QUOTAS)take(rows.filter(row=>row.role===role),picked,used,count);
 take(rows,picked,used,Math.max(0,cap-picked.length));
 return picked.slice(0,cap);
}
