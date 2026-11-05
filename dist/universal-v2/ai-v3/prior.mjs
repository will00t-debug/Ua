// Learning is a candidate prior. It can reorder lines whose search values
// already sit inside SEARCH_PRIOR_GAP. It cannot rescue a line the search
// scored worse than that gap. PR #294 sets LEARN_RAW_GAP to 0 on an
// unmerged branch; that setting is not used here and is not a strength claim.
import {V4_DIM,V4_FORMAT,dotV4} from './v4-features.mjs';

export const SEARCH_PRIOR_GAP=8;

export function learnBonus(policy,observation,action,seat){
 if(!policy||policy.format!==V4_FORMAT||!Array.isArray(policy.weights)||policy.weights.length!==V4_DIM)
  return 0;
 if(!observation)return 0;
 return dotV4(policy.weights,observation,action,seat);
}
export function blendRoot(candidates,bonusOf){
 const finite=candidates.filter(row=>Number.isFinite(row.search));
 if(!finite.length)return null;
 let bestSearch=-Infinity;
 for(const row of finite)if(row.search>bestSearch)bestSearch=row.search;
 const idle=action=>action?.type==='next'||action?.mode==='skip'||action?.mode==='decline';
 let best=null;
 for(const row of finite){
  if(row.search<bestSearch-SEARCH_PRIOR_GAP)continue;
  const raw=Number(bonusOf(row.action))||0;
  const bonus=Math.max(-SEARCH_PRIOR_GAP,Math.min(SEARCH_PRIOR_GAP,raw));
  const adjusted=row.search+bonus;
  const identity=JSON.stringify(row.action);
  const better=!!best&&adjusted>best.adjusted+1e-9;
  const tied=best&&Math.abs(adjusted-best.adjusted)<=1e-9;
  // A line that changes nothing ties with passing. Keep the pass.
  const preferIdle=tied&&idle(row.action)&&!idle(best.action);
  const preferIdentity=tied&&idle(row.action)===idle(best.action)&&identity<best.identity;
  if(!best||better||preferIdle||preferIdentity)best={...row,bonus,adjusted,identity};
 }
 return best;
}
