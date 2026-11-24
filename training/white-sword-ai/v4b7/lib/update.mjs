// A confirmed, learnable preference may be searched once inside the old box.
// The result is an experiment. It is not written onto v2.
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {minimumImpact} from '../../v4b3/lib/search.mjs';

const ANCHOR_ID='525ea92d';

export function searchPreference(parent,target,guards){
 if(!target?.actionB?.key||!target.band?.length)return {ok:false,status:'missing'};
 const positions=(guards||[]).filter(position=>position?.id!==target.id&&position.band?.length>=2).map(position=>({
  id:position.id,
  hard:String(position.id).startsWith(ANCHOR_ID),
  keepKey:chooseKey(position.band,parent,SCALE),
  band:position.band
 }));
 const found=minimumImpact(parent,{band:target.band,keepKey:target.actionB.key},positions,{freezeHash:true});
 if(!found.ok)return {ok:false,status:found.status,necessary:found.necessary||[],changed:found.changed||[]};
 const necessary=found.necessary||[];
 const changed=found.changed||[];
 return {
  ok:true,
  status:necessary.length||changed.length?'collateral':'safe',
  objective:found.objective,
  weights:found.weights,
  delta:found.delta,
  policy:found.policy,
  necessary,changed,
  conditional:found.conditional||[]
 };
}
export function pickCandidate(results){
 const ready=(results||[]).filter(row=>row.ok);
 ready.sort((left,right)=>{
  const leftSafe=left.status==='safe'?0:1;
  const rightSafe=right.status==='safe'?0:1;
  return leftSafe-rightSafe||left.objective-right.objective||(left.id<right.id?-1:1);
 });
 return ready[0]||null;
}
