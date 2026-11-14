// Candidate ONLY. Deliberately not wired into the live battle page.
// Does not call reducer on hidden LIFE/deck/hand; uses public BP and impact.
import {universalBp,universalImpact,universalImpactNull} from '../engine.mjs';
const num=(fn,fallback=0)=>{try{const n=fn();return Number.isFinite(n)?n:fallback;}catch{return fallback;}};
export function lastLifeGuard(pack,state,actor,action,legal){
 if(state?.pending?.kind!=='block'||action?.type!=='chooseBlock'
   ||action.uid!=null||(state.players?.[actor]?.life?.length??99)>1)
  return {action,overrode:false,reason:null};
 const attackUid=state.pending.attackerUid;
 const attacker=state.players[1-actor]?.front?.find(c=>c?.uid===attackUid);
 if(!attacker)return {action,overrode:false,reason:'attacker-missing'};
 const attackerBp=num(()=>universalBp(pack,state,attacker));
 const impact=num(()=>universalImpact(pack,state,attacker));
 const options=(legal||[]).filter(a=>a.type==='chooseBlock'&&a.uid!=null).map(candidate=>{
  const blocker=state.players[actor].front.find(c=>c?.uid===candidate.uid);
  const bp=blocker?num(()=>universalBp(pack,state,blocker)):0;
  const cancels=blocker?!!universalImpactNull(pack,state,blocker):false;
  const winsBattle=bp>attackerBp;
  // A losing blocker may still avoid normal LIFE damage, but not Impact.
  const stopsDamage=winsBattle||impact<=0||cancels;
  return {candidate,bp,cancels,winsBattle,stopsDamage};
 }).filter(row=>row.stopsDamage);
 if(!options.length)return {action,overrode:false,reason:'no-saving-block'};
 options.sort((a,b)=>(b.winsBattle?1:0)-(a.winsBattle?1:0)
  ||(a.winsBattle?a.bp-b.bp:a.bp-b.bp)
  ||String(a.candidate.uid).localeCompare(String(b.candidate.uid)));
 return {action:options[0].candidate,overrode:true,reason:'last-life-damage-prevention',
  attackerBp,impact,blockerBp:options[0].bp};
}
