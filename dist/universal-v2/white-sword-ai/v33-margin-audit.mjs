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
// Difference attribution for deterministic linear v2 residual only.
export function inspectTempoMargins(rows,{weights=[],featureNames=[],scale=6,observation=null,seat=null}={}){
 const ownCardId=(action)=>{
  if(!action?.uid||!observation||!Number.isInteger(seat))return null;
  const own=observation.visible?.players?.[seat];
  for(const zone of ['hand','front','energy','outside','removed'])
   for(const card of own?.[zone]||[])
    if(card?.uid===action.uid)return card.cardId||null;
  return null;
 };
 const explain=(chosen,alternate)=>{
  const hardGap=chosen.hardScore-alternate.hardScore;
  const contributions=[];
  let policyGap=0;
  const width=Math.min(weights.length,chosen.features?.length||0,alternate.features?.length||0);
  for(let i=0;i<width;i++){
   const delta=scale*weights[i]*(chosen.features[i]-alternate.features[i]);
   if(!Number.isFinite(delta))throw Error('Nonfinite model contribution');
   policyGap+=delta;
   if(Math.abs(delta)>1e-8)contributions.push({name:featureNames[i]||String(i),delta});
  }
  contributions.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  const gap=base(chosen)-base(alternate);
  if(width>0&&Math.abs(gap-(hardGap+policyGap))>1e-5)
   throw Error('Policy attribution not equal to blended score');
  return {hardGap,policyGap,totalGap:gap,featureDrivers:contributions.slice(0,10)};
 };
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
   requiredMultiplier:required,cardId:ownCardId(row.action),
   attribution:explain(original,row)};
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
 const hardTop=pick(rows,row=>row.hardScore);
 const others=[...rows].filter(row=>row!==original);
 const nearestBase=others.length?pick(others,base):null;
 return {
  eligible:rows.length,
  baseTop:{...slim(original),cardId:ownCardId(original.action)},
  currentTop:{...slim(current),cardId:ownCardId(current.action)},
  hardBest:{...slim(hardTop),cardId:ownCardId(hardTop.action)},
  hardDisagrees:!same(original.action,hardTop.action)&&hardTop.hardScore>original.hardScore+1e-8,
  nearestBase:nearestBase?{
   ...slim(nearestBase),cardId:ownCardId(nearestBase.action),
   attribution:explain(original,nearestBase)
  }:null,
  topScoreGap:scoreGap,
  anyNonzeroTempo:rows.some(row=>Math.abs(bonus(row))>1e-12),
  hasBonusDifference:rows.some(row=>Math.abs(bonus(row)-bonus(original))>1e-12),
  mostReachable:challenger,
  alternate:thresholds.slice(0,4),
  probe
 };
}
