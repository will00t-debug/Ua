// Offline teacher. Larger node budget, no clock, same visible-information search.
// A deeper tree is not a correct label. Incomplete or unstable output is not one.
import {chooseStrengthenedHardAction,lastHardAiTrace} from '../../../../dist/universal-v2/hard-ai.mjs';
import {HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {choiceKey} from '../../v4a/lib/diverge.mjs';
import {HARD_CAP,OFFICIAL_NODES,TEACHER_NODES} from './protocol.mjs';

const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

export function teacherOptions(seed,nodes=TEACHER_NODES){
 if(nodes===OFFICIAL_NODES&&HARD_OPTIONS.ms!=null)throw Error('official search clock changed');
 const options={nodes,seed};
 if(Object.hasOwn(options,'ms'))throw Error('teacher must stay clock-free');
 return options;
}
export function consultTeacher(pack,state,seed,nodes=TEACHER_NODES){
 const started=performance.now();
 let action=null;
 let trace=null;
 let error=null;
 try{
  action=chooseStrengthenedHardAction(pack,state,teacherOptions(seed,nodes));
  trace=lastHardAiTrace();
 }catch(caught){
  error=String(caught?.message||caught);
 }
 return {action,trace,error,ms:performance.now()-started,nodes,seed};
}
export function assessTeacher({sample,hardAction,hardTrace,cap=HARD_CAP}){
 const trace=sample?.trace;
 const complete=!!trace&&trace.reason==='search'&&trace.rootCut!==true&&!sample.error;
 const hardRows=hardTrace?.candidates||[];
 const anchor=hardRows.find(row=>same(row.action,hardAction));
 const teacherRow=hardRows.find(row=>same(row.action,sample?.action));
 let relation='incomplete';
 if(complete&&anchor&&teacherRow){
  relation=teacherRow.score>=anchor.score-cap-1e-9?'inside-cap':'excluded-by-cap';
 }else if(complete&&!teacherRow)relation='not-compared';
 else if(complete)relation='unscored';
 return {
  complete,relation,confidence:complete?'single':'incomplete',
  actionKey:sample?.action?choiceKey(sample.action):null,
  agreesWithHard:complete&&same(sample?.action,hardAction),
  nodesBudget:trace?.nodesBudget??null,
  nodesUsed:trace?.nodesUsed??null,
  rootCut:trace?.rootCut??null,
  reason:sample?.error||trace?.reason||null,
  ms:sample?.ms??null
 };
}
export function combineSamples(samples,hardAction,hardTrace,cap=HARD_CAP){
 const assessed=(samples||[]).map(sample=>assessTeacher({sample,hardAction,hardTrace,cap}));
 const keys=assessed.map(row=>row.actionKey);
 const complete=assessed.every(row=>row.complete);
 const stable=complete&&new Set(keys).size===1;
 let confidence='incomplete';
 if(complete)confidence=stable?'stable':'unstable';
 return {
  usable:stable,
  confidence,
  relation:stable?assessed[0].relation:'incomplete',
  agreesWithHard:stable?assessed[0].agreesWithHard:false,
  actionKey:stable?assessed[0].actionKey:null,
  samples:assessed
 };
}
export function teacherSummary(records){
 const labeled=(records||[]).map(row=>row.teacher).filter(Boolean);
 const stable=labeled.filter(row=>row.usable);
 const rate=list=>{
  if(!stable.length)return null;
  return list.length/stable.length;
 };
 const byBucket={};
 for(const record of records||[]){
  if(!record.teacher?.usable)continue;
  const bucket=byBucket[record.bucket]||(byBucket[record.bucket]={stable:0,excluded:0,inside:0,notCompared:0,agree:0});
  bucket.stable++;
  if(record.teacher.relation==='excluded-by-cap')bucket.excluded++;
  if(record.teacher.relation==='inside-cap')bucket.inside++;
  if(record.teacher.relation==='not-compared')bucket.notCompared++;
  if(record.teacher.agreesWithHard)bucket.agree++;
 }
 return {
  asked:labeled.length,
  complete:labeled.filter(row=>row.confidence!=='incomplete').length,
  stable:stable.length,
  unstable:labeled.filter(row=>row.confidence==='unstable').length,
  incomplete:labeled.filter(row=>row.confidence==='incomplete').length,
  completionRate:labeled.length?labeled.filter(row=>row.confidence!=='incomplete').length/labeled.length:null,
  stableRate:labeled.length?stable.length/labeled.length:null,
  agreement:rate(stable.filter(row=>row.agreesWithHard)),
  insideCap:rate(stable.filter(row=>row.relation==='inside-cap')),
  excludedByCap:rate(stable.filter(row=>row.relation==='excluded-by-cap')),
  notCompared:rate(stable.filter(row=>row.relation==='not-compared')),
  byBucket
 };
}
