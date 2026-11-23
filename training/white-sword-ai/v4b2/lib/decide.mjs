// One confirmed preference at a time. Evidence that still covers 0 stays out.
// A preference the trust check rejects is saved, not deleted and not forced.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {minimumStep} from './step.mjs';
import {cardsOf,classifyUpdate,contrastOf,legacyBaseline,trustDecision} from './trust.mjs';
import {SCALE} from './protocol.mjs';

function preferredSide(row){
 return row.mean>0?row.actionA:row.actionB;
}
function otherSide(row){
 return row.mean>0?row.actionB:row.actionA;
}
function groupRows(rows){
 const groups=new Map();
 for(const row of rows||[]){
  if(row.usable!==true)continue;
  const contrast=contrastOf(row);
  const group=groups.get(contrast.pair)||{pair:contrast.pair,contrast,rows:[]};
  group.rows.push(row);
  groups.set(contrast.pair,group);
 }
 return [...groups.values()];
}
function strength(row){
 return Math.abs(row.mean);
}
export function planGroups(judgments){
 const planned=[];
 for(const group of groupRows(judgments)){
  const sides=new Set(group.rows.map(row=>contrastOf(row).side));
  group.rows.sort((left,right)=>strength(right)-strength(left)||right.n-left.n||(left.id<right.id?-1:1));
  if(sides.size>1){
   planned.push({...group,role:'conflict',representative:null});
   continue;
  }
  planned.push({...group,role:'candidate',representative:group.rows[0]});
 }
 planned.sort((left,right)=>strength(right.representative||right.rows[0])-strength(left.representative||left.rows[0]));
 return planned;
}
function deltasOf(parent,policy){
 const deltas=[];
 for(let index=0;index<parent.length;index++){
  const delta=policy[index]-parent[index];
  if(delta)deltas.push({name:POLICY_NAMES[index],index,before:parent[index],after:policy[index],delta});
 }
 deltas.sort((left,right)=>Math.abs(right.delta)-Math.abs(left.delta));
 return deltas;
}
export function evaluateGroup(parent,group,context){
 const positions=context.positions||[];
 const judgments=context.judgments||[];
 if(group.role==='conflict'){
  return {
   pair:group.pair,role:'conflict',adopt:false,status:'conflict',
   ids:group.rows.map(row=>row.id),
   reasons:['同一種對比在這批樣本裡方向相反，先保留']
  };
 }
 const row=group.representative;
 const position=positions.find(item=>item.id===row.id);
 const preferred=preferredSide(row);
 const other=otherSide(row);
 if(!position?.band){
  return {pair:group.pair,role:'candidate',id:row.id,adopt:false,status:'missing',reasons:['偏好局面沒有帶內候選']};
 }
 const step=minimumStep(parent,position.band,preferred.key,other.key);
 const base={
  pair:group.pair,role:'candidate',id:row.id,bucket:row.bucket,opponent:row.opponent,
  n:row.n,mean:row.mean,low:row.low,high:row.high,
  preferred:preferred.key,other:other.key,
  preferredCard:cardsOf(preferred.features).join(',')||null,
  otherCard:cardsOf(other.features).join(',')||null,
  confirmations:group.rows.slice(1).map(item=>item.id),
  alpha:step.alpha,stepStatus:step.status,maxAbs:step.maxAbs||0,hashMoved:step.hashMoved||0
 };
 if(step.status==='already'){
  return {...base,adopt:false,status:'already',reasons:['更新前的選牌已經是這個偏好，這一輪不改權重']};
 }
 if(!step.flipped||step.status!=='flipped'){
  return {...base,adopt:false,status:step.status,reasons:['沿具名特徵的單步沒有改選，本輪保留']};
 }
 const counts=classifyUpdate(parent,step.policy,row.id,group.contrast,positions,judgments);
 const selectedIds=(context.selectedIds||[]).filter(id=>id!==row.id);
 const legacy=legacyBaseline(counts.changes,selectedIds,context.holdoutIds||[]);
 const decision=trustDecision(counts,true);
 const chosen=chooseKey(position.band,step.policy,SCALE);
 return {
  ...base,adopt:decision.ok,status:decision.ok?'pass':'trust',
  reasons:decision.reasons,chosen,
  contradiction:counts.contradiction,unrelated:counts.unrelated,similar:counts.similar,
  changes:counts.changes,legacy,
  policy:decision.ok?step.policy:null,
  deltas:deltasOf(parent,step.policy)
 };
}
export function chooseUpdate(parent,judgments,context){
 const groups=planGroups(judgments);
 const evaluated=groups.map(group=>evaluateGroup(parent,group,context));
 const passing=evaluated.filter(row=>row.adopt);
 const adopted=passing[0]||null;
 for(const row of evaluated){
  if(adopted&&row.id&&row.id!==adopted.id&&row.adopt){
   row.adopt=false;
   row.status='queued';
   row.reasons=['信任域可以通過，本輪只採用較強的一筆'];
   row.policy=null;
  }
 }
 return {groups:groups.length,evaluated,adopted};
}
