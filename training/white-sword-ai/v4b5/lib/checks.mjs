// Fixed fresh samples for the positions a candidate step actually touches.
// These pairs do not change the candidate and do not extend.
import {legalUniversalActions} from '../../../../dist/universal-v2/engine.mjs';
import {choiceKey} from '../../v4a/lib/diverge.mjs';
import {jobsFor} from '../../v4b/lib/evaluate.mjs';
import {replayState} from '../../v4b/lib/play.mjs';
import {diffsOf,jobSalt} from '../../v4b4/lib/round.mjs';
import {judgeConfirmation} from '../../v4b4/lib/confirm.mjs';
import {binomialUpper,holm} from '../../v4b4/lib/exact.mjs';
import {CHECK_CAP,CHECK_PAIRS,CHECK_SALT,TARGET_ID} from './protocol.mjs';
import {describePosition} from './update.mjs';

function question(kind){
 if(kind==='front-kept')return '能量線是否比留下的前線更好';
 return '更新後的選擇是否比更新前更好';
}
function add(list,row,kind,keyA,keyB,labelA,labelB){
 if(!row||list.length>=CHECK_CAP||list.some(item=>item.id===row.id))return;
 if(!keyA||!keyB||keyA===keyB)return;
 list.push({
  id:row.id,kind,keyA,keyB,labelA,labelB,question:question(kind),
  actor:row.actor,bucket:row.bucket,opponent:row.opponent,source:row.source,
  beforeLabel:row.beforeLabel,afterLabel:row.afterLabel,
  pairs:CHECK_PAIRS,salt:CHECK_SALT
 });
}
function prefer(rows){
 const rank=row=>(row.opponent==='white-sword'?0:2)+(row.bucket==='mid-entry'?0:1);
 return rows.slice().sort((left,right)=>rank(left)-rank(right));
}
function mix(rows,limit,key){
 const ranked=prefer(rows);
 const picked=[];
 const seen=new Set();
 for(const row of ranked){
  if(picked.length>=limit)break;
  const name=key(row);
  if(seen.has(name))continue;
  picked.push(row);
  seen.add(name);
 }
 for(const row of ranked){
  if(picked.length>=limit)break;
  if(!picked.includes(row))picked.push(row);
 }
 return picked;
}
function take(checks,rows,limit,fill){
 let added=0;
 for(const row of rows){
  if(added>=limit||checks.length>=CHECK_CAP)break;
  const before=checks.length;
  fill(row);
  if(checks.length>before)added++;
 }
 return added;
}
export function selectChecks(update,fresh=[]){
 const checks=[];
 for(const row of update.changes||[]){
  if(row.id===TARGET_ID)continue;
  add(checks,row,'collateral',row.beforeKey,row.afterKey,row.beforeLabel,row.afterLabel);
 }
 const sameCard=(fresh||[]).filter(row=>row.changed&&row.line&&row.line.currentLine==='front'&&row.afterKey===row.line.energyKey);
 take(checks,mix(sameCard,2,row=>row.line?.card||row.id),2,row=>add(checks,row,'flipped',row.beforeKey,row.afterKey,row.beforeLabel,row.afterLabel));
 const cross=(fresh||[]).filter(row=>row.changed&&!sameCard.some(item=>item.id===row.id));
 take(checks,mix(cross,1,row=>row.beforeLabel+'→'+row.afterLabel),1,row=>add(checks,row,'flipped',row.beforeKey,row.afterKey,row.beforeLabel,row.afterLabel));
 const kept=(fresh||[]).filter(row=>!row.changed&&row.line?.currentLine==='front');
 const keptAdded=take(checks,mix(kept,2,row=>row.opponent||row.id),2,row=>add(checks,row,'front-kept',row.line.frontKey,row.line.energyKey,row.line.frontLabel,row.line.energyLabel));
 if(keptAdded<2){
  const saved=(update.rows||[]).filter(row=>!row.changed&&row.line?.card==='BLC-4-070'&&row.line.currentLine==='front');
  take(checks,saved,2-keptAdded,row=>add(checks,row,'front-kept',row.line.frontKey,row.line.energyKey,row.line.frontLabel,row.line.energyLabel));
 }
 return checks;
}
export function describeFresh(parent,policy,positions){
 return (positions||[]).filter(position=>position?.band?.length>=2)
  .map(position=>describePosition(parent,policy,position,'v4b5'));
}
export function prepareCheck(check,position){
 const replay=replayState(position);
 const legal=legalUniversalActions(replay.packs,replay.state);
 const actionOf=key=>legal.find(action=>choiceKey(action)===key)||null;
 const actionA=actionOf(check.keyA);
 const actionB=actionOf(check.keyB);
 if(!actionA||!actionB)return null;
 return {check,position,state:replay.state,actionA,actionB};
}
export function nextCheckJobs(ready,haveIds,limit=64){
 const jobs=[];
 for(const row of ready){
  const wrapped={...row.position,actionA:{action:row.actionA},actionB:{action:row.actionB}};
  for(let attempt=0;attempt<CHECK_PAIRS;attempt++){
   const prefix=row.position.id+':'+attempt+':';
   if(haveIds.has(prefix+'A')&&haveIds.has(prefix+'B'))continue;
   const planned=jobSalt(row.position,CHECK_SALT,attempt);
   for(const job of jobsFor(wrapped,row.state,attempt,planned.salt)){
    if(job.seed!==planned.desired)throw Error('驗證種子和計劃不一致');
    if(!haveIds.has(job.id))jobs.push(job);
   }
   if(jobs.length>=limit)return jobs;
  }
 }
 return jobs;
}
export function summarizeChecks(checks,records){
 const rows=(checks||[]).map(check=>{
  const packed=diffsOf(records,check.id,check.actor);
  const judged=judgeConfirmation(packed.diffs);
  return {
   ...check,
   attempts:packed.attempts,unfinished:packed.unfinished,n:judged.n,mean:judged.mean,
   plus:judged.exact.plus,minus:judged.exact.minus,tie:judged.exact.tie,
   pNew:judged.exact.pOne,
   pOld:binomialUpper(judged.exact.plus,judged.exact.decisive),
   low:judged.interval.low,high:judged.interval.high
  };
 });
 const family=rows.map((row,index)=>row.kind==='front-kept'?null:{index,p:row.pOld}).filter(row=>row);
 const helped=holm(rows.map(row=>row.pNew));
 const hurt=holm(family.map(row=>row.p));
 const hurtAt=new Set([...hurt].map(index=>family[index].index));
 return rows.map((row,index)=>({
  ...row,
  newSideHolm:helped.has(index),
  oldSideHolm:hurtAt.has(index)&&row.mean>0
 }));
}
export function harmed(rows){
 return (rows||[]).some(row=>row.oldSideHolm&&row.mean>0);
}
