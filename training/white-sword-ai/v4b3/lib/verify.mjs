// Fresh paired continuations for the few updates the box can express.
// Sample size stays fixed. These games do not change v2.
import {cloneMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {legalUniversalActions} from '../../../../dist/universal-v2/engine.mjs';
import {choiceKey} from '../../v4a/lib/diverge.mjs';
import {foldPair} from '../../v4b/lib/evaluate.mjs';
import {sampleHidden} from '../../v4b/lib/hidden.mjs';
import {replayState} from '../../v4b/lib/play.mjs';
import {judgeSamples} from '../../v4b/lib/protocol.mjs';
import {comparisonP,benjaminiHochberg} from './labels.mjs';

export const VERIFY_PAIRS=16;
export const VERIFY_SALT=120000;

export function checksFor(study){
 const checks=[];
 for(const target of study.targets||[]){
  if(!target.search?.ok)continue;
  const releases=[...(target.search.necessary||[]),...(target.search.conditional||[])];
  if(releases.length>3)continue;
  checks.push({
   checkId:'target:'+target.id,
   kind:'target',
   targetId:target.id,
   positionId:target.id,
   bucket:target.bucket,
   opponent:target.opponent,
   preferredCard:target.preferredCard,
   otherCard:target.otherCard,
   originalMean:target.mean,
   originalN:target.n
  });
  for(const positionId of releases){
   const change=(target.changes||[]).find(row=>row.id===positionId);
   if(!change)continue;
   checks.push({
    checkId:'release:'+target.id+':'+positionId,
    kind:'release',
    targetId:target.id,
    positionId,
    before:change.before,
    after:change.after,
    beforeCard:change.beforeCard,
    afterCard:change.afterCard,
    bucket:change.bucket,
    opponent:change.opponent
   });
  }
 }
 return checks;
}
export function materialize(checks,positions,{pairs=VERIFY_PAIRS,salt=VERIFY_SALT}={}){
 const byId=new Map((positions||[]).map(position=>[position.id,position]));
 const ready=[];
 const skipped=[];
 const jobs=[];
 function storedAction(position,key){
  if(position.actionA?.key===key)return position.actionA.action||null;
  if(position.actionB?.key===key)return position.actionB.action||null;
  return position.band.find(row=>row.key===key)?.action||null;
 }
 for(const check of checks){
  const position=byId.get(check.positionId);
  if(!position){skipped.push({...check,reason:'missing'});continue;}
  const replay=replayState(position);
  const legal=legalUniversalActions(replay.packs,replay.state);
  const wantedA=check.kind==='target'?position.actionA.key:check.after;
  const wantedB=check.kind==='target'?position.actionB.key:check.before;
  const actionA=storedAction(position,wantedA)||legal.find(action=>choiceKey(action)===wantedA)||null;
  const actionB=storedAction(position,wantedB)||legal.find(action=>choiceKey(action)===wantedB)||null;
  if(!actionA||!actionB){skipped.push({...check,reason:'action'});continue;}
  const keys=new Set(legal.map(choiceKey));
  if(!keys.has(choiceKey(actionA))||!keys.has(choiceKey(actionB))){
   skipped.push({...check,reason:'illegal'});
   continue;
  }
  const spec={...check,actor:position.actor,seed:position.seed,pairs,salt};
  ready.push(spec);
  for(let attempt=0;attempt<pairs;attempt++){
   const seed=(position.seed+salt+attempt*997)>>>0;
   const hidden=sampleHidden(replay.state,position.actor,seed);
   for(const side of ['A','B']){
    jobs.push({
     id:check.checkId+':'+attempt+':'+side,
     positionId:position.id,attempt,side,
     decks:position.decks,actor:position.actor,seed,
     state:cloneMatch(hidden),
     action:side==='A'?actionA:actionB
    });
   }
  }
 }
 return {ready,skipped,jobs};
}
export function directedInterval(row){
 if(!row||row.kind==='release'||!(row.originalMean<0)){
  return {mean:row?.mean??0,low:row?.low??0,high:row?.high??0};
 }
 return {mean:-row.mean,low:-row.high,high:-row.low};
}
export function summarizeVerification(checks,records){
 const rows=(checks||[]).map(check=>{
  const mine=(records||[]).filter(row=>row.id.startsWith(check.checkId+':'));
  const byAttempt=new Map();
  for(const row of mine){
   const pair=byAttempt.get(row.attempt)||{};
   pair[row.side]=row;
   byAttempt.set(row.attempt,pair);
  }
  const diffs=[];
  let unfinished=0;
  for(const pair of byAttempt.values()){
   const diff=foldPair(pair.A,pair.B,check.actor);
   if(diff===null)unfinished++;
   else diffs.push(diff);
  }
  const judgment=judgeSamples(diffs);
  return {...check,...judgment,unfinished,games:mine.length,p:comparisonP({...judgment,n:judgment.n})};
 });
 const kept=benjaminiHochberg(rows.map(row=>row.p));
 return rows.map((row,index)=>({...row,adjusted:kept.has(index)&&row.usable===true}));
}
