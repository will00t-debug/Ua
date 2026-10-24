// Bounded *observation-space* affordability estimate. This is not reducer
// search and NEVER certifies future legal actions, hidden draws, LIFE or effects.
// All current actions are already provided by the authoritative V2 engine.
const definition=(packs,i,c)=>packs[i].cards[c?.cardId]||{};
export const stableUniversalAiActionKey=a=>JSON.stringify(canonical(a));
function canonical(x){
 if(Array.isArray(x))return x.map(canonical);
 if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort()
  .map(k=>[k,canonical(x[k])]));
 return x;
}
const bounded=(n,min,max)=>Math.max(min,Math.min(max,n));
export function boundedUniversalAiContinuationDetailed(packs,o,limits={}){
 const empty=(fallback,nodes=0,examined=0)=>({
  bonuses:new Map(),nodes,examined,fallback,estimated:true,
  guarantee:'fixed-budget unless the wall-clock emergency guard fires'
 });
 if(o.pending||o.phase!=='main')return empty('not-main');
 const depthLimit=bounded(limits.depth??2,0,2);
 const candidateLimit=bounded(limits.candidates??12,0,256);
 const nodeLimit=bounded(limits.nodes??64,0,4096);
 const timeLimit=bounded(limits.timeMs??12,0,100);
 if(!depthLimit||!candidateLimit||!nodeLimit||!timeLimit)return empty('disabled');
 const now=typeof performance==='undefined'?null:performance;
 const started=now?.now()??0;
 const timedOut=()=>now&&now.now()-started>timeLimit;
 const own=o.players[o.actor],hand=own.hand;
 const ready=hand.map(c=>({c,d:definition(packs,o.actor,c)}));
 let nodes=0;
 // Entire root action set has already been heuristically ranked by the caller.
 // Never truncate the raw reducer action order. Stable key is the second key.
 const priorities=limits.priorities instanceof Map?limits.priorities:new Map();
 const candidates=o.legal.filter(a=>a.type==='play'&&a.line==='energy')
  .map(a=>({a,key:stableUniversalAiActionKey(a),
   priority:priorities.get(stableUniversalAiActionKey(a))??0}))
  .sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key))
  .slice(0,candidateLimit);
 const bonuses=new Map();
 function potential(energy,ap,excluded,depth){
  if(depth<=0||ap<=0)return 0;
  let best=0;
  for(const {c,d} of ready){
   if(++nodes>nodeLimit)return null;
   if(excluded.has(c.uid)||!d||['event','field'].includes(d.type))continue;
   const cost=Math.max(1,d.ap||1);
   if(cost>ap||(d.energy||0)>(energy[d.color]||0))continue;
   const base=Math.min(7,1.5+Math.max(0,d.bp||0)/1800+
    (d.printedImpact||0)*1.1);
   const branch=new Set(excluded);branch.add(c.uid);
   const extra=depth>1?potential(energy,ap-cost,branch,depth-1):0;
   if(extra===null)return null;
   best=Math.max(best,base*0.42+(extra||0)*0.56);
  }
  return best;
 }
 for(const {a,key} of candidates){
  // A partially scored set is NEVER used: budget failure discards every bonus.
  if(nodes>=nodeLimit)return empty('node-budget',nodes,bonuses.size);
  if(timedOut())return empty('emergency-clock',nodes,bonuses.size);
  const c=hand.find(x=>x.uid===a.uid),d=definition(packs,o.actor,c);
  if(!c||!d.gen)continue;
  const cost=Math.max(1,d.ap||1);
  if(cost>=own.ap)continue;
  const before={...own.energyByColor};
  const after={...before,[d.color]:(before[d.color]||0)+(d.gen||0)};
  const excluded=new Set([c.uid]);
  const prev=potential(before,own.ap-cost,excluded,depthLimit);
  const next=potential(after,own.ap-cost,excluded,depthLimit);
  if(prev===null||next===null)return empty('node-budget',nodes,bonuses.size);
  const delta=Math.max(0,next-prev);
  if(delta>0)bonuses.set(JSON.stringify(a),Math.min(3.8,delta));
 }
 if(timedOut())return empty('emergency-clock',nodes,bonuses.size);
 return {bonuses,nodes,examined:candidates.length,fallback:null,estimated:true,
  guarantee:'fixed-budget unless the wall-clock emergency guard fires'};
}
export function boundedUniversalAiContinuation(packs,o,limits={}){
 return boundedUniversalAiContinuationDetailed(packs,o,limits).bonuses;
}
