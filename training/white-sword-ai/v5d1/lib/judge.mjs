// One two-sided exact test per position. Holm stays inside the split that is being judged.
import {holm,signTest,conditionalMeanInterval} from '../../v4b4/lib/exact.mjs';
import {diffsOf} from '../../v4b4/lib/round.mjs';

export function judgeTwoSided(candidates,records,actorOf){
 const rows=(candidates||[]).map(candidate=>{
  const packed=diffsOf(records,candidate.id,actorOf(candidate.id));
  const exact=signTest(packed.diffs);
  const interval=conditionalMeanInterval(packed.diffs);
  return {
   id:candidate.id,role:candidate.role,seed:candidate.seed,opponent:candidate.opponent,bucket:candidate.bucket,
   labelA:candidate.labelA,labelB:candidate.labelB,
   attempts:packed.attempts,unfinished:packed.unfinished,
   n:exact.n,mean:exact.mean,plus:exact.plus,minus:exact.minus,tie:exact.tie,decisive:exact.decisive,
   pTwo:exact.pTwo,low:interval.low,high:interval.high
  };
 });
 const kept=holm(rows.map(row=>row.pTwo));
 return rows.map((row,index)=>({
  ...row,
  holm:kept.has(index),
  confirmed:kept.has(index)&&row.mean!==0,
  favor:row.mean<0?'B':row.mean>0?'A':'tie'
 }));
}
