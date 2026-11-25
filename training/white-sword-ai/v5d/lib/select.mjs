// The sampling focus is activate BLC-4-060 against ending the action.
// The comparison layer itself does not name that card.
import {BUCKETS,OPPONENTS} from '../../v4b2/lib/protocol.mjs';
import {sameSignature,signatureOf} from './compare.mjs';

const ACTIVATE={type:'activate',card:'BLC-4-060',line:null};
const END={type:'next',card:null,line:null};

export function isActivate060Pair(position){
 const left=signatureOf(position?.actionA);
 const right=signatureOf(position?.actionB);
 if(!left||!right)return false;
 const opposed=(first,second)=>sameSignature(first,ACTIVATE)&&sameSignature(second,END);
 return opposed(left,right)||opposed(right,left);
}
export function selectFamily(pool,cap=8){
 const byId=new Map();
 for(const row of pool||[]){
  if(!row?.id||(row.band||[]).length<2||!isActivate060Pair(row)||byId.has(row.id))continue;
  byId.set(row.id,row);
 }
 const eligible=[...byId.values()];
 const cells=new Map();
 for(const row of eligible){
  const key=(row.opponent||'')+'|'+(row.bucket||'');
  const list=cells.get(key)||[];
  list.push(row);
  cells.set(key,list);
 }
 for(const list of cells.values())list.sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0);
 const picked=[];
 const seen=new Set();
 for(let pass=0;pass<2&&picked.length<cap;pass++){
  for(const opponent of OPPONENTS){
   for(const bucket of BUCKETS){
    const row=(cells.get(opponent+'|'+bucket)||[])[pass];
    if(!row||seen.has(row.id))continue;
    picked.push(row);
    seen.add(row.id);
    if(picked.length>=cap)break;
   }
   if(picked.length>=cap)break;
  }
 }
 if(picked.length<4){
  const rest=eligible.filter(row=>!seen.has(row.id)).sort((left,right)=>left.id<right.id?-1:1);
  for(const row of rest){
   if(picked.length>=cap)break;
   picked.push(row);
   seen.add(row.id);
  }
 }
 return picked;
}
export function splitRoles(rows){
 return [...(rows||[])].sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0)
  .map((row,index)=>({...row,role:index%2===0?'train':'validation'}));
}
