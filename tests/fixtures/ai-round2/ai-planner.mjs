// Bounded *observation-space* continuation estimate, not a match simulator.
// It cannot create legal actions, resolve effects, discover hidden draws,
// choose opponents' replies, or promise a future play will be legal.
// Every real move must still be obtained from the authoritative reducer.
const packCard=(packs,i,c)=>packs[i].cards[c?.cardId]||{};
export function boundedUniversalAiContinuation(packs,o,limits={}){
 const bonuses=new Map();
 if(o.pending||o.phase!=='main')return bonuses;
 const depthLimit=Math.max(0,Math.min(2,limits.depth??2));
 const candidateLimit=Math.max(0,Math.min(12,limits.candidates??12));
 const nodeLimit=Math.max(0,Math.min(80,limits.nodes??64));
 const timeLimit=Math.max(0,Math.min(12,limits.timeMs??4));
 const clock=typeof performance==='undefined'?null:performance;
 const start=clock?.now()??0;
 const expired=()=>clock&&clock.now()-start>timeLimit;
 const own=o.players[o.actor],hand=own.hand;
 let nodes=0;
 const ready=hand.map(c=>({c,d:packCard(packs,o.actor,c)}));
 // Public/own-hand affordability only. Other costs and zone replacement rules
 // are not projected; limited weights deliberately discount uncertainty.
 function potential(energy,ap,excluded,depth){
  if(depth<=0||ap<=0)return 0;
  let best=0;
  for(const {c,d} of ready){
   if(++nodes>nodeLimit||expired())return null;
   if(excluded.has(c.uid)||!d||d.type==='event'||d.type==='field')continue;
   const cost=Math.max(1,d.ap||1);
   if(cost>ap||Math.max(0,d.energy||0)>(energy[d.color]||0))continue;
   const base=Math.min(7,1.5+Math.max(0,d.bp||0)/1800+
    (d.printedImpact||0)*1.1);
   // FRONT availability/other legality has not been simulated.
   const branch=new Set(excluded);branch.add(c.uid);
   const extra=depth>1?potential(energy,ap-cost,branch,depth-1):0;
   if(extra===null)return null;
   best=Math.max(best,base*0.42+(extra||0)*0.56);
  }
  return best;
 }
 for(const a of o.legal.slice(0,candidateLimit)){
  if(expired()||nodes>=nodeLimit)return new Map(); // safe heuristic fallback
  if(a.type!=='play'||a.line!=='energy')continue;
  const c=hand.find(x=>x.uid===a.uid);
  if(!c)continue;
  const d=packCard(packs,o.actor,c),cost=Math.max(1,d.ap||1);
  if(cost>=own.ap||!d.gen)continue;
  const before={...own.energyByColor};
  const after={...before,[d.color]:(before[d.color]||0)+(d.gen||0)};
  const excluded=new Set([c.uid]);
  const prev=potential(before,own.ap-cost,excluded,depthLimit);
  const next=potential(after,own.ap-cost,excluded,depthLimit);
  if(prev===null||next===null)return new Map();
  // Marginal improvement ONLY, never award the same future play to all actions.
  const delta=Math.max(0,next-prev);
  if(delta>0)bonuses.set(JSON.stringify(a),Math.min(3.8,delta));
 }
 return bonuses;
}
