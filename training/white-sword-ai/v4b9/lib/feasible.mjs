// Whether one frozen step can keep every required choice.
// Releasing a guard in some other solution is not proof that every solution must release it.
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {minimize} from '../../v4b3/lib/lp.mjs';
import {keepRows,stepBounds} from '../../v4b3/lib/search.mjs';

function tighten(bounds,rows){
 const used=Array(bounds.length).fill(false);
 for(const row of rows){
  for(let index=0;index<bounds.length;index++){
   if(Math.abs(row.coeff[index]||0)>1e-12)used[index]=true;
  }
 }
 return bounds.map((bound,index)=>used[index]?bound:{lo:0,hi:0});
}
export function hardFeasible(parent,targets,hards){
 if(!targets?.length||targets.some(target=>!target?.keepKey||!target.band?.length))return {ok:false,status:'missing'};
 let rows=[];
 const required=[...targets,...(hards||[])];
 for(const item of required){
  const part=keepRows(parent,item.band,item.keepKey);
  if(!part)return {ok:false,status:'missing'};
  rows=rows.concat(part);
 }
 const bounds=stepBounds(parent,{freezeHash:true});
 const answer=minimize(rows,tighten(bounds,rows));
 if(!answer.ok)return {ok:false,status:answer.status};
 const policy=parent.map((weight,index)=>weight+(answer.x[index]||0));
 for(const item of required){
  if(chooseKey(item.band,policy,SCALE)!==item.keepKey)return {ok:false,status:'choice',policy};
 }
 return {ok:true,status:'kept',policy,delta:answer.x,objective:answer.objective};
}
