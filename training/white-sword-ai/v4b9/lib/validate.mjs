// Validation slots are filled by role. An empty role is not backfilled.
export function selectValidation(flips,{cap=6,exclude=[]}={}){
 const skip=new Set(exclude||[]);
 const pool=(flips||[]).filter(row=>row?.changed&&row.id&&!skip.has(row.id));
 const chosen=[];
 const seen=new Set();
 const add=row=>{
  if(!row||seen.has(row.id)||chosen.length>=cap)return false;
  chosen.push(row);
  seen.add(row.id);
  return true;
 };
 const take=(role,max)=>{
  const rows=pool.filter(row=>row.role===role).sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0);
  let count=0;
  for(const row of rows){
   if(count>=max||chosen.length>=cap)break;
   if(add(row))count++;
  }
 };
 take('raid',1);
 take('other-energy',2);
 take('fresh',2);
 take('keep-front',1);
 return chosen;
}
export function repeatedIds(flips,plans,positions){
 const byId=new Map((positions||[]).map(position=>[position.id,position]));
 const ids=[];
 for(const plan of plans||[]){
  const flip=(flips||[]).find(row=>row.id===plan.id);
  const position=byId.get(plan.id);
  if(!flip?.changed||!position)continue;
  if(flip.afterKey===position.actionA?.key||flip.afterKey===position.actionB?.key)ids.push(plan.id);
 }
 return ids;
}
