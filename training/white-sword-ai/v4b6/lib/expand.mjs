// An experimental column starts at weight 0, so the untrained model
// picks the same action as v2. The production file is never written.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {minimumImpact} from '../../v4b3/lib/search.mjs';
import {TARGET_ID} from './protocol.mjs';

const ANCHOR_ID='525ea92d';

export function extendFeatures(features,values,names){
 const next=(features||[]).slice();
 for(const name of names)next.push(Number(values?.[name])||0);
 return next;
}
export function extendBand(band,byKey,names){
 return (band||[]).map(row=>({
  ...row,
  features:extendFeatures(row.features,byKey?.get(row.key),names)
 }));
}
export function withZeros(parent,names){
 return parent.concat(names.map(()=>0));
}
export function sameChoices(parent,positions,names){
 const policy=withZeros(parent,names);
 const shifted=[];
 for(const position of positions){
  const extended=extendBand(position.band,position.extra,names);
  const before=chooseKey(position.band,parent,SCALE);
  const after=chooseKey(extended,policy,SCALE);
  if(before!==after)shifted.push(position.id);
 }
 return {ok:shifted.length===0,shifted};
}
function named(delta,names){
 const rows=[];
 for(let index=0;index<delta.length;index++){
  if(Math.abs(delta[index])<=1e-4)continue;
  const name=index<POLICY_NAMES.length?POLICY_NAMES[index]:names[index-POLICY_NAMES.length];
  rows.push({name,delta:delta[index]});
 }
 rows.sort((left,right)=>Math.abs(right.delta)-Math.abs(left.delta));
 return rows;
}
export function searchExpanded(parent,positions,names){
 if(!names?.length)return {ok:false,status:'no-feature',adopted:false};
 const match=sameChoices(parent,positions,names);
 if(!match.ok)return {ok:false,status:'zero-shifted',shifted:match.shifted,adopted:false};
 const policy=withZeros(parent,names);
 const extended=positions.map(position=>({
  ...position,
  band:extendBand(position.band,position.extra,names)
 }));
 const target=extended.find(position=>position.id===TARGET_ID);
 if(!target?.keepKey)return {ok:false,status:'missing-target',adopted:false};
 const guards=extended.filter(position=>position.id!==target.id).map(position=>({
  id:position.id,
  hard:position.id.startsWith(ANCHOR_ID),
  keepKey:chooseKey(position.band,policy,SCALE),
  band:position.band
 }));
 const impact=minimumImpact(policy,{band:target.band,keepKey:target.keepKey},guards,{freezeHash:true});
 if(!impact.ok)return {ok:false,status:impact.status,adopted:false,names};
 const chosen=chooseKey(target.band,impact.policy,SCALE);
 return {
  ok:true,
  status:impact.status,
  adopted:false,
  recommended:false,
  keptTarget:chosen===target.keepKey,
  objective:impact.objective,
  weights:named(impact.delta,names),
  necessary:impact.necessary||[],
  conditional:impact.conditional||[],
  changed:impact.changed||[],
  names,
  delta:impact.delta,
  policy:impact.policy
 };
}
