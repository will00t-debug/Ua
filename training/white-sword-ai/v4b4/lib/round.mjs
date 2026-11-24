// Screen on one salt. Confirm on another. Candidate count is frozen first.
import {createHash} from 'node:crypto';
import {legalUniversalActions} from '../../../../dist/universal-v2/engine.mjs';
import {choiceKey} from '../../v4a/lib/diverge.mjs';
import {foldPair,jobsFor} from '../../v4b/lib/evaluate.mjs';
import {replayState} from '../../v4b/lib/play.mjs';
import {assertFreshPlan,assertFreshSeed} from '../../v4b/lib/protocol.mjs';
import {fitTarget} from '../../v4b3/lib/search.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {
 CONFIRM_PAIRS,PLAN_CORRECTION,PLAN_MODE,PLAN_SIDE,SCREEN_FLOOR,
 judgeConfirmation,pairsForCandidates,screenSummary,selectCandidates
} from './confirm.mjs';
import {holm} from './exact.mjs';
import {SCREEN_PAIRS} from './sampling.mjs';

export const CODE_VERSION='v4b4-exact-1';
export const SCREEN_SALT=210000;
export const CONFIRM_SALT=480000;
const PRIOR_ROLLOUTS=Object.freeze([
 {salt:88000,attempts:24},
 {salt:120000,attempts:16}
]);

export function rolloutSeed(position,salt,attempt){
 for(let bump=0;bump<8;bump++){
  const hex=createHash('sha256').update('v4b4:'+position.id+':'+salt+':'+attempt+':'+bump).digest();
  const seed=(hex.readUInt32BE(0)&0x7fffffff)||1;
  try{
   assertFreshSeed(seed,'v4b4');
   return seed;
  }catch(error){
   if(error?.code!=='V4B_SEED')throw error;
  }
 }
 throw Error('找不到沒有用過的種子');
}
export function jobSalt(position,salt,attempt){
 const desired=rolloutSeed(position,salt,attempt);
 return {desired,salt:(desired-attempt*997)>>>0};
}
export function seedsFor(positions,salt,pairs){
 const seeds=[];
 for(const position of positions){
  for(let attempt=0;attempt<pairs;attempt++)seeds.push(rolloutSeed(position,salt,attempt));
 }
 return seeds;
}
function earlierRolloutSeed(positionSeed,salt,attempt){
 return (positionSeed+salt+attempt*997)>>>0;
}
export function priorRolloutSeeds(positions){
 const seeds=[];
 for(const position of positions){
  for(const prior of PRIOR_ROLLOUTS){
   for(let attempt=0;attempt<prior.attempts;attempt++){
    seeds.push(earlierRolloutSeed(position.seed,prior.salt,attempt));
   }
  }
 }
 return seeds;
}
export function assertPlanSeeds(positions,earlier=[]){
 const screen=seedsFor(positions,SCREEN_SALT,SCREEN_PAIRS);
 const confirm=seedsFor(positions,CONFIRM_SALT,CONFIRM_PAIRS);
 assertFreshPlan(screen,'v4b4-screen');
 assertFreshPlan(confirm,'v4b4-confirm');
 const used=new Set([...priorRolloutSeeds(positions),...priorRolloutSeeds(earlier)]);
 const screenSet=new Set(screen);
 if(screenSet.size!==screen.length)throw Error('篩選種子在這一批局面裡重複');
 for(const seed of screen){
  if(used.has(seed))throw Error('篩選種子撞上先前的分支');
 }
 for(const seed of confirm){
  if(used.has(seed)||screenSet.has(seed))throw Error('確認種子撞上篩選或先前的分支');
 }
 if(new Set(confirm).size!==confirm.length)throw Error('確認種子在這一批局面裡重複');
 return {screen:screen.length,confirm:confirm.length};
}
export function learnable(parent,position){
 if(!position?.band?.length||!position.actionB?.key)return false;
 return fitTarget(parent,position.band,position.actionB.key,{freezeHash:true}).ok===true;
}
export function preparePositions(positions){
 const ready=[];
 const dropped=[];
 for(const position of positions){
  const replay=replayState(position);
  const legal=legalUniversalActions(replay.packs,replay.state);
  const keys=new Set(legal.map(action=>choiceKey(action)));
  if(!keys.has(position.actionA?.key)||!keys.has(position.actionB?.key)||!position.actionA?.action||!position.actionB?.action){
   dropped.push(position.id);
   continue;
  }
  ready.push({position,state:replay.state});
 }
 return {ready,dropped};
}
export function nextJobs(ready,salt,pairs,haveIds,limit=64){
 const jobs=[];
 for(const row of ready){
  for(let attempt=0;attempt<pairs;attempt++){
   const prefix=row.position.id+':'+attempt+':';
   if(haveIds.has(prefix+'A')&&haveIds.has(prefix+'B'))continue;
   const planned=jobSalt(row.position,salt,attempt);
   for(const job of jobsFor(row.position,row.state,attempt,planned.salt)){
    if(job.seed!==planned.desired)throw Error('分支種子和計劃不一致');
    if(!haveIds.has(job.id))jobs.push(job);
   }
   if(jobs.length>=limit)return jobs;
  }
 }
 return jobs;
}
export function freezeCandidates(positions,screenDiffs,learnableFlags){
 if(screenDiffs.length!==positions.length||learnableFlags.length!==positions.length){
  throw Error('篩選列數和局面數不一致');
 }
 const summaries=screenDiffs.map(diffs=>screenSummary(diffs));
 const chosen=selectCandidates(summaries,learnableFlags);
 const each=pairsForCandidates(chosen.length,PLAN_MODE);
 return {
  codeVersion:CODE_VERSION,
  mode:PLAN_MODE,
  correction:PLAN_CORRECTION,
  side:PLAN_SIDE,
  floor:SCREEN_FLOOR,
  each,
  screenPairs:SCREEN_PAIRS,
  screenSalt:SCREEN_SALT,
  confirmSalt:CONFIRM_SALT,
  rows:positions.map((position,index)=>({
   index,id:position.id,bucket:position.bucket,opponent:position.opponent,
   mean:summaries[index].mean,n:summaries[index].n,
   learnable:learnableFlags[index]===true,
   qualified:summaries[index].mean<=SCREEN_FLOOR,
   cardA:cardsOf(position.actionA?.features).join(',')||null,
   cardB:cardsOf(position.actionB?.features).join(',')||null
  })),
  candidates:chosen.map(row=>({
   index:row.index,
   id:positions[row.index].id,
   screenMean:row.mean,
   bucket:positions[row.index].bucket,
   opponent:positions[row.index].opponent,
   cardA:cardsOf(positions[row.index].actionA?.features).join(',')||null,
   cardB:cardsOf(positions[row.index].actionB?.features).join(',')||null
  }))
 };
}
export function diffsOf(records,positionId,actor){
 const byAttempt=new Map();
 for(const row of records||[]){
  if(row.positionId!==positionId)continue;
  const pair=byAttempt.get(row.attempt)||{};
  pair[row.side]=row;
  byAttempt.set(row.attempt,pair);
 }
 const diffs=[];
 let unfinished=0;
 for(const pair of byAttempt.values()){
  const diff=foldPair(pair.A,pair.B,actor);
  if(diff===null)unfinished++;
  else diffs.push(diff);
 }
 return {diffs,unfinished,attempts:byAttempt.size};
}
export function decideConfirmation(candidates,records,actorOf){
 const rows=(candidates||[]).map(candidate=>{
  const packed=diffsOf(records,candidate.id,actorOf(candidate.id));
  const judged=judgeConfirmation(packed.diffs);
  return {
   id:candidate.id,index:candidate.index,screenMean:candidate.screenMean,
   bucket:candidate.bucket,opponent:candidate.opponent,cardA:candidate.cardA,cardB:candidate.cardB,
   attempts:packed.attempts,unfinished:packed.unfinished,
   n:judged.n,mean:judged.mean,
   plus:judged.exact.plus,minus:judged.exact.minus,tie:judged.exact.tie,decisive:judged.exact.decisive,
   pOne:judged.exact.pOne,pTwo:judged.exact.pTwo,
   normalLow:judged.normal.low,normalHigh:judged.normal.high,normalUsable:judged.normal.usable,
   low:judged.interval.low,high:judged.interval.high
  };
 });
 const kept=holm(rows.map(row=>row.pOne));
 return rows.map((row,index)=>({
  ...row,
  holm:kept.has(index),
  confirmed:kept.has(index)&&row.mean<0
 }));
}
export function sameFreeze(left,right){
 if(!left||!right)return false;
 return left.codeVersion===right.codeVersion
  &&left.each===right.each
  &&left.screenSalt===right.screenSalt
  &&left.confirmSalt===right.confirmSalt
  &&JSON.stringify(left.candidates)===JSON.stringify(right.candidates);
}
