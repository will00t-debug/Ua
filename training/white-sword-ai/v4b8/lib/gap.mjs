// Why one confirmed line choice fits in the step box and the other does not.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {blendScore,chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {HASH_INDEX,pairwiseSwing} from '../../v4b1/lib/feasibility.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {fitTarget} from '../../v4b3/lib/search.mjs';

export function featureDiffs(preferred,other){
 const rows=[];
 const width=Math.max(preferred?.features?.length||0,other?.features?.length||0);
 for(let index=0;index<width;index++){
  const diff=(preferred?.features?.[index]||0)-(other?.features?.[index]||0);
  if(Math.abs(diff)<=1e-8)continue;
  rows.push({name:POLICY_NAMES[index]||String(index),index,diff,hash:HASH_INDEX.includes(index)});
 }
 return rows;
}
export function explainPair(parent,position,keepKey){
 const preferred=position.band.find(row=>row.key===keepKey);
 const currentKey=chooseKey(position.band,parent,SCALE);
 const current=position.band.find(row=>row.key===currentKey);
 if(!preferred||!current)return {ok:false,status:'missing'};
 const hard=current.hard-preferred.hard;
 const blend=blendScore(current.hard,parent,current.features,SCALE)-blendScore(preferred.hard,parent,preferred.features,SCALE);
 const swing=pairwiseSwing(parent,preferred,current,{frozen:HASH_INDEX});
 const fit=fitTarget(parent,position.band,keepKey,{freezeHash:true});
 let policy=0;
 const parts=[];
 for(let index=0;index<parent.length;index++){
  const diff=(current.features[index]||0)-(preferred.features[index]||0);
  if(!diff||!parent[index])continue;
  const part=SCALE*parent[index]*diff;
  policy+=part;
  parts.push({name:POLICY_NAMES[index],weight:parent[index],diff,part});
 }
 return {
  ok:true,id:position.id,keepKey,currentKey,sameChoice:currentKey===keepKey,
  hard,policy,blend,swing:swing.swing,gap:swing.gap,coords:swing.coords,clears:swing.clears,
  shortfall:swing.clears?0:swing.gap-swing.swing,
  fit:fit.ok===true,fitStatus:fit.ok?fit.status:fit.status||'infeasible',
  bandSize:position.band.length,
  diffs:featureDiffs(preferred,current),parts
 };
}
