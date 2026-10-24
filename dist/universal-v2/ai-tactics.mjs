// Trusted reducer bridge. Never export cloned match states to the heuristic.
// We execute ONLY native legal V2 actions. Unknown/hidden outcomes terminate the
// exact branch; a subsequent attack is estimated, never pre-resolved as LIFE.
// The private physical state stays inside this adapter, not in ai-strategy.
import {dispatchUniversalAction,legalUniversalActions} from './engine.mjs';
import {createUniversalAiObservation} from './ai-observation.mjs';
import {rankUniversalAiActions,evaluateUniversalAiPosition} from './ai-strategy.mjs';
import {stableUniversalAiActionKey} from './ai-planner.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fingerprint=zone=>JSON.stringify(zone.map(c=>[c.uid,c.cardId]));
const secretPending=/life|top|search|deck|inspect|mill|hand-rest|outside-name/i;
// A high-scoring card can appear several times for different destination
// slots. Preserve strategic action-family diversity before filling remaining
// nodes; otherwise 10 copies of ENERGY can hide every FRONT continuation.
const selected=(ranked,n,packs=null,o=null)=>{
 const legal=ranked.filter(x=>x.action.type!=='extraDraw');
 const family=a=>{
  if(a.type==='play'&&a.line==='front'&&packs&&o){
   const owned=o.players[o.actor].hand.find(c=>c.uid===a.uid);
   const printed=packs[o.actor].cards[owned?.cardId];
   // Prefer at least one effect-free native FRONT continuation alongside
   // higher-value effectful plays. This is not a legality approximation.
   if(printed&&!(printed.effects?.onPlay||[]).length&&
    !(printed.effects?.onRaid||[]).length)return 'play:front:quiet';
  }
  return a.type==='play'?'play:'+a.line:
   a.type==='activate'?'activate:'+a.mode:a.type;
 };
 const out=[],seen=new Set();
 for(const x of legal){
  const f=family(x.action);if(seen.has(f))continue;
  seen.add(f);out.push(x);if(out.length>=n)return out;
 }
 for(const x of legal){
  if(out.includes(x))continue;
  out.push(x);if(out.length>=n)return out;
 }
 return out;
};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function stableTransitionRejection(before,after,action,owner){
 if(before.rng!==after.rng)return 'rng-changed';
 if(after.active!==owner&&after.pending?.player!==owner)return 'actor-changed';
 if(before.status!=='playing'||before.players.length!==2)return 'initial-match-invalid';
 if(after.pending&&secretPending.test(after.pending.kind))return 'secret-pending';
 if(after.effectQueue?.length||after.lifeRevealBatch||after.retirementBatch)return 'unresolved-effect-queue';
 if(!same(before.publicReveals,after.publicReveals))return 'public-reveal-changed';
 for(let p=0;p<2;p++){
  if(fingerprint(before.players[p].deck)!==fingerprint(after.players[p].deck)||
   fingerprint(before.players[p].life)!==fingerprint(after.players[p].life)||
   fingerprint(before.players[p].lifeRevealed)!==fingerprint(after.players[p].lifeRevealed))
   return 'unknown-deck-or-life-change';
  if(p!==owner&&fingerprint(before.players[p].hand)!==
   fingerprint(after.players[p].hand))return 'opponent-hand-changed';
 }
 // Own hand consumption must be attributable to an actual selected physical
 // card, not an unknown draw, automatic search, or unrevealed consequence.
 const old=before.players[owner].hand.map(c=>c.uid),now=after.players[owner].hand.map(c=>c.uid);
 // A new physical UID is exact only when it moved from an observable
 // OWN public zone. A draw/search from an unknown deck is never a free hand
 // addition. The deck/LIFE fingerprint checks above guard those sources.
 const arrivals=after.players[owner].hand.filter(c=>!old.includes(c.uid));
 for(const card of arrivals){
  const beforePublic=[...before.players[owner].front,...before.players[owner].energy,
   ...before.players[owner].outside].filter(Boolean);
  const afterPublic=[...after.players[owner].front,...after.players[owner].energy,
   ...after.players[owner].outside].filter(Boolean);
  if(!beforePublic.some(c=>c.uid===card.uid&&c.cardId===card.cardId)||
   afterPublic.some(c=>c.uid===card.uid))return 'own-hand-unattributed-arrival';
 }
 const gone=old.filter(uid=>!now.includes(uid));
 if(gone.length){
  if(gone.length!==1||gone[0]!==action.uid||
   !['play','raid','event','chooseDiscard','chooseHandLimit','chooseCostDiscard','chooseHandPayment'].includes(action.type))
   return 'own-hand-unattributed';
 }
 return null;
}
function nativeChild(packs,s,a,owner,record=()=>{}){
 const reject=reason=>{
  record({at:'native',phase:s.phase,action:a.type,line:a.line??null,uid:a.uid??null,slot:a.slot??null,reason});
  return null;
 };
 if(!['play','raid','event','activate','next','move','step'].includes(a.type)&&
  !s.pending)return reject('not-natively-expandable');
 // Attack dispatch would inspect unknown LIFE or require an opponent BLOCK.
 // Rank it at the observed frontier but never pretend the result is known.
 if(a.type==='attack'||a.type==='extraDraw')return reject('unknown-attack-or-draw');
 try{
  const legal=legalUniversalActions(packs,s);
  const real=legal.find(x=>same(x,a));if(!real)return reject('not-in-native-legal-list');
  const child=dispatchUniversalAction(packs,s,real,{actor:owner});
  const refusal=stableTransitionRejection(s,child,real,owner);
  if(refusal)return reject(refusal);
  if(child.status!=='playing'||(child.pending?.player??child.active)!==owner)
   return reject('noncontinuing-turn');
  // Adversarial observation equivalence: secret deck/LIFE permutations and a
  // concealed enemy hand/deck exchange cannot affect an accepted exact path.
  // This uses the same native engine twice; no shadow card rules or reveal.
  const probe=structuredClone(s);
  for(const pl of probe.players){pl.deck.reverse();pl.life.reverse();}
  const enemy=probe.players[1-owner];
  if(enemy.hand.length&&enemy.deck.length)
   [enemy.hand[0],enemy.deck[0]]=[enemy.deck[0],enemy.hand[0]];
  if(!legalUniversalActions(packs,probe).some(x=>same(x,real)))
   return reject('adversarial-legal-set-changed');
  const other=dispatchUniversalAction(packs,probe,real,{actor:owner});
  const adversarialRefusal=stableTransitionRejection(probe,other,real,owner);
  if(adversarialRefusal)return reject('adversarial-'+adversarialRefusal);
  const nextVisible=createUniversalAiObservation(packs,child,legalUniversalActions(packs,child));
  const probeVisible=createUniversalAiObservation(packs,other,legalUniversalActions(packs,other));
  if(!same(nextVisible,probeVisible))return reject('adversarial-observation-differs');
  record({at:'native',phase:s.phase,action:a.type,line:a.line??null,uid:a.uid??null,slot:a.slot??null,accepted:true});
  return child;
 }catch(error){return reject('exception-'+(error?.name||'unknown'));}
}
export function evaluateTrustedUniversalAiTactics(packs,state,rootObservation,ranked,options={}){
 const limits={
  roots:clamp(options.roots??3,0,10),children:clamp(options.children??2,0,10),
  depth:clamp(options.depth??3,1,3),nodes:clamp(options.nodes??24,0,200),
  timeMs:clamp(options.timeMs??100,0,100)
 };
 const baseline=ranked[0]?.action||null,actor=rootObservation.actor;
 const record=Array.isArray(options.trace)?entry=>{
  if(options.trace.length<120)options.trace.push(entry);
 }:()=>{};
 const fallback=(reason,nodes=0)=>({action:baseline,nodes,fallback:reason,
  exactSteps:0,heuristicFrontiers:0,estimated:true,used:false});
 if(!baseline||state.pending||rootObservation.phase!=='main'||limits.nodes===0||
  limits.roots===0||limits.timeMs===0)return fallback('not-eligible');
 const now=typeof performance==='undefined'?null:performance,start=now?.now()??0;
 const timeout=()=>now&&now.now()-start>limits.timeMs;
 let nodes=0,exactSteps=0,frontiers=0,abortReason=null;
 const rootChoices=selected(ranked,limits.roots);
 record({at:'roots',selected:rootChoices.map(x=>x.action),skipped:ranked.filter(x=>!rootChoices.includes(x)).length,limits});
 // Exclude a root that cannot produce a native deterministic child, rather
 // than inferring the existence of a future card from printed text.
 // All native edges use the same metric: marginal observed position.
 // The action heuristic is only a small root prior (not rewarded at every
 // exact edge). Unknown transitions abort the whole comparison rather than
 // being silently compared with fully evaluated branches.
 const position=o=>evaluateUniversalAiPosition(packs,o);
 const zero=()=>({value:0,path:[]});
 function follow(current,depth,path){
  if(depth<=0){
   if(current.pending){abortReason='mandatory-pending-depth';return null;}
   return zero();
  }
  // Combat is a heuristic frontier, not a native exact LIFE rollout.
  if(!current.pending&&current.phase!=='main')return zero();
  const legal=legalUniversalActions(packs,current);
  const o=createUniversalAiObservation(packs,current,legal);
  // The native child already supplies exact resources/position deltas.
  // Do not re-add the speculative energy continuation estimate at every
  // descendant (and do not let its wall-clock guard perturb replay).
  const rankedNext=rankUniversalAiActions(packs,o,
   {...options.ablation,energyContinuation:false});
  const next=selected(rankedNext,limits.children,packs,o);
  record({at:'follow',path,phase:current.phase,pending:current.pending?.kind??null,
   legal:legal.length,selected:next.map(x=>x.action),
   skipped:rankedNext.filter(x=>!next.includes(x)).length,depth,nodes});
  // Skipping further MAIN actions is allowed: the reducer exposes 'next'.
  // Pending payments/selections are NOT optional merely because a zero-score
  // branch would be convenient; a legal 'skip' action is expanded normally.
  let best=current.pending?null:zero();
  for(const candidate of next){
   if(++nodes>limits.nodes){abortReason='node-budget';return null;}
   if(timeout()){abortReason='emergency-clock';return null;}
   const candidatePath=[...path,stableUniversalAiActionKey(candidate.action)];
   if(candidate.action.type==='attack'){
    frontiers++;
    const value=clamp(candidate.score,-12,12)*0.65;
    if(!best||value>best.value)best={value,path:[candidate.action]};
    continue;
   }
   const child=nativeChild(packs,current,candidate.action,actor,
    entry=>record({...entry,path:candidatePath}));
   if(!child)continue;
   exactSteps++;
   const childObs=createUniversalAiObservation(packs,child,legalUniversalActions(packs,child));
   const material=clamp((position(childObs)-position(o))*0.85,-12,12);
   const tail=follow(child,depth-1,candidatePath);
   // An unresolvable compulsory pending branch cannot be scored as a
   // free stop. Optional MAIN branches may simply be declined.
   if(tail===null){if(current.pending)return null;continue;}
   const value=material+tail.value*0.7;
   if(!best||value>best.value+1e-9)best={value,path:[candidate.action,...tail.path]};
  }
  return best;
 }
 let bestChoice=null,bestValue=-Infinity,bestPath=[],searchedRoots=0;
 for(const root of rootChoices){
  if(++nodes>limits.nodes)return fallback('node-budget',nodes);
  if(timeout())return fallback('emergency-clock',nodes);
  const path=[stableUniversalAiActionKey(root.action)];
  const child=nativeChild(packs,state,root.action,actor,
   entry=>record({...entry,path}));
  // Do not compare an unsearched prior against evaluated native outcomes.
  if(!child)return fallback('untrusted-root-transition',nodes);
  exactSteps++;searchedRoots++;
  const childObs=createUniversalAiObservation(packs,child,legalUniversalActions(packs,child));
  const material=clamp((position(childObs)-position(rootObservation))*0.85,-12,12);
  const continuation=follow(child,limits.depth-1,path);
  if(continuation===null)return fallback(abortReason||'unresolved-branch',nodes);
  const value=root.score*0.15+material+continuation.value*0.75;
  record({at:'root-score',path,prior:root.score,material,
   continuation:continuation.value,value});
  if(value>bestValue+1e-9||
   Math.abs(value-bestValue)<1e-9&&(!bestChoice||
    stableUniversalAiActionKey(root.action)<stableUniversalAiActionKey(bestChoice.action))){
   bestChoice=root;bestValue=value;
   bestPath=[root.action,...continuation.path];
  }
 }
 if(timeout())return fallback('emergency-clock',nodes);
 return {action:bestChoice.action,nodes,fallback:null,exactSteps,
  heuristicFrontiers:frontiers,estimated:true,used:!!exactSteps,
  searchedRoots,omittedRoots:ranked.length-rootChoices.length,
  principalVariation:bestPath,
  // No hidden-state or random futures are ever returned to the policy.
  scope:'native deterministic MAIN transitions; no hidden combat resolution'};
}
