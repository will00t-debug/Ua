// Diagnostic only: estimate which legal Hard-capped actions could change
// under *hypothetical* tempo amplification. Does not mutate score or behavior.
// Inputs are already actor-visible feature scores from the chooser.
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function pick(rows,score){
 let best=rows[0];
 for(const row of rows.slice(1)){
  const value=score(row),now=score(best);
  if(value>now+1e-12||Math.abs(value-now)<=1e-12&&
   JSON.stringify(row.action)<JSON.stringify(best.action))best=row;
 }
 return best;
}
function bonus(row){return Number(row.tempo?.bonus)||0;}
const base=row=>row.score-bonus(row);
function slim(row){
 return {action:row.action,baseScore:base(row),hardScore:row.hardScore,
  bonus:bonus(row),reasons:row.tempo?.reasons||[]};
}
export function inspectTempoMargins(rows){
 if(!Array.isArray(rows)||!rows.length)return null;
 const original=pick(rows,base),current=pick(rows,row=>row.score);
 const scoreGap=rows.length>1?
  Math.min(...rows.filter(row=>row!==original).map(row=>base(original)-base(row))):null;
 let challenger=null;
 const thresholds=[];
 for(const row of rows){
  if(row===original)continue;
  const delta=bonus(row)-bonus(original);
  if(delta<=1e-12)continue;
  const gap=base(original)-base(row);
  const required=Math.max(0,(gap+1e-9)/delta);
  const record={...slim(row),gap,bonusAdvantage:delta,
   requiredMultiplier:required};
  thresholds.push(record);
  if(!challenger||required<challenger.requiredMultiplier)challenger=record;
 }
 thresholds.sort((a,b)=>a.requiredMultiplier-b.requiredMultiplier);
 const probe={};
 for(const multiplier of [1,2,4,8]){
  const selected=pick(rows,row=>base(row)+multiplier*bonus(row));
  probe[String(multiplier)]={switched:!same(original.action,selected.action),
   action:selected.action};
 }
 return {
  eligible:rows.length,baseTop:slim(original),currentTop:slim(current),
  topScoreGap:scoreGap,
  anyNonzeroTempo:rows.some(row=>Math.abs(bonus(row))>1e-12),
  hasBonusDifference:rows.some(row=>Math.abs(bonus(row)-bonus(original))>1e-12),
  mostReachable:challenger,
  alternate:thresholds.slice(0,4),
  probe
 };
}
