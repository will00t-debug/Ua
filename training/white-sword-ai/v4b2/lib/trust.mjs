// Collateral is not one number.
// A confirmed reversal is a contradiction. A different action family is unrelated.
// The same action-type contrast, or the same card pair, is similar and may stand.
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {agrees} from '../../v4b/lib/learn.mjs';
import {SCALE} from './protocol.mjs';

export function cardsOf(features){
 const cards=[];
 if(!features)return cards;
 for(const [name,index] of Object.entries(POLICY_INDEX)){
  if(name.startsWith('card_BLC')&&(features[index]||0)>0.5)cards.push(name.slice(5));
 }
 cards.sort();
 return cards;
}
export function typeOf(key){
 try{return JSON.parse(key).type||'';}
 catch{return '';}
}
export function contrastOf(judgment){
 const preferred=judgment.mean>0?judgment.actionA:judgment.actionB;
 const other=judgment.mean>0?judgment.actionB:judgment.actionA;
 const types=[typeOf(preferred.key),typeOf(other.key)].sort();
 const cards=[...new Set([...cardsOf(preferred.features),...cardsOf(other.features)])].sort();
 return {
  types,cards,sameType:types[0]===types[1],
  pair:types.join('|')+'#'+cards.join(','),
  side:typeOf(preferred.key)+'#'+cardsOf(preferred.features).join(',')
 };
}
export function relationOf(contrast,beforeKey,beforeFeatures,afterKey,afterFeatures){
 const types=[typeOf(beforeKey),typeOf(afterKey)].sort();
 if(types[0]!==contrast.types[0]||types[1]!==contrast.types[1])return 'unrelated';
 if(!contrast.sameType)return 'similar';
 const cards=[...new Set([...cardsOf(beforeFeatures),...cardsOf(afterFeatures)])].sort();
 return cards.join(',')===contrast.cards.join(',')?'similar':'unrelated';
}
function bandRow(position,key){
 return (position.band||[]).find(row=>row.key===key)||null;
}
export function classifyUpdate(parent,next,targetId,contrast,positions,judgments){
 const byId=new Map((judgments||[]).map(row=>[row.id,row]));
 const changes=[];
 let contradiction=0;
 let unrelated=0;
 let similar=0;
 for(const position of positions||[]){
  if(!position?.band||position.band.length<2)continue;
  if(position.id===targetId)continue;
  const before=chooseKey(position.band,parent,SCALE);
  const after=chooseKey(position.band,next,SCALE);
  const judgment=byId.get(position.id);
  let relation=null;
  if(judgment?.usable===true&&agrees(parent,judgment)&&!agrees(next,judgment))relation='contradiction';
  if(before===after&&!relation)continue;
  if(!relation){
   const beforeRow=bandRow(position,before);
   const afterRow=bandRow(position,after);
   relation=relationOf(contrast,before,beforeRow?.features,after,afterRow?.features);
  }
  if(relation==='contradiction')contradiction++;
  else if(relation==='unrelated')unrelated++;
  else similar++;
  const evidence=judgment?.usable===true?(relation==='contradiction'?'reversed':'confirmed'):'unchecked';
  changes.push({
   id:position.id,bucket:position.bucket,opponent:position.opponent,source:position.source||'round',
   before,after,relation,evidence,changed:before!==after
  });
 }
 return {contradiction,unrelated,similar,changes};
}
export function legacyBaseline(changes,selectedIds,holdoutIds){
 const selected=new Set(selectedIds||[]);
 const holdout=new Set(holdoutIds||[]);
 let selectedChanges=0;
 let holdoutChanges=0;
 for(const change of changes||[]){
  if(!change.changed)continue;
  if(selected.has(change.id))selectedChanges++;
  if(holdout.has(change.id))holdoutChanges++;
 }
 return {
  selectedChanges,holdoutChanges,
  pass:selectedChanges<=1&&holdoutChanges===0
 };
}
export function trustDecision(counts,flipped){
 const ok=flipped===true&&counts.contradiction===0&&counts.unrelated===0;
 const reasons=[];
 if(!flipped)reasons.push('這一步沒有把目標改成偏好');
 if(counts.contradiction)reasons.push('有 '+counts.contradiction+' 個已確認偏好被改反');
 if(counts.unrelated)reasons.push('有 '+counts.unrelated+' 個不相關局面改變');
 return {ok,reasons};
}
