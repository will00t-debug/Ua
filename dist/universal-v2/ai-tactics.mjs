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
const selected=(r,n)=>r.filter(x=>x.action.type!=='extraDraw').slice(0,n);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function publiclyStableTransition(before,after,action,owner){
 if(before.rng!==after.rng||after.active!==owner&&after.pending?.player!==owner)return false;
 if(before.status!=='playing'||before.players.length!==2)return false;
 if(after.pending&&secretPending.test(after.pending.kind))return false;
 if(after.effectQueue?.length||after.lifeRevealBatch||after.retirementBatch)return false;
 if(!same(before.publicReveals,after.publicReveals))return false;
 for(let p=0;p<2;p++){
  if(fingerprint(before.players[p].deck)!==fingerprint(after.players[p].deck)||
   fingerprint(before.players[p].life)!==fingerprint(after.players[p].life)||
   fingerprint(before.players[p].lifeRevealed)!==fingerprint(after.players[p].lifeRevealed))
   return false;
  if(p!==owner&&fingerprint(before.players[p].hand)!==
   fingerprint(after.players[p].hand))return false;
 }
 // Own hand consumption must be attributable to an actual selected physical
 // card, not an unknown draw, automatic search, or unrevealed consequence.
 const old=before.players[owner].hand.map(c=>c.uid),now=after.players[owner].hand.map(c=>c.uid);
 if(now.some(uid=>!old.includes(uid)))return false;
 const gone=old.filter(uid=>!now.includes(uid));
 if(gone.length){
  if(gone.length!==1||gone[0]!==action.uid||
   !['play','raid','event','chooseDiscard','chooseHandLimit','chooseCostDiscard','chooseHandPayment'].includes(action.type))
   return false;
 }
 return true;
}
function nativeChild(packs,s,a,owner){
 if(!['play','raid','event','activate','next','move','step'].includes(a.type)&&
  !s.pending)return null;
 // Attack dispatch would inspect unknown LIFE or require an opponent BLOCK.
 // Rank it at the observed frontier but never pretend the result is known.
 if(a.type==='attack'||a.type==='extraDraw')return null;
 try{
  const legal=legalUniversalActions(packs,s);
  const real=legal.find(x=>same(x,a));if(!real)return null;
  const child=dispatchUniversalAction(packs,s,real,{actor:owner});
  if(!publiclyStableTransition(s,child,real,owner))return null;
  if(child.status!=='playing'||(child.pending?.player??child.active)!==owner)return null;
  // Adversarial observation equivalence: secret deck/LIFE permutations and a
  // concealed enemy hand/deck exchange cannot affect an accepted exact path.
  // This uses the same native engine twice; no shadow card rules or reveal.
  const probe=structuredClone(s);
  for(const pl of probe.players){pl.deck.reverse();pl.life.reverse();}
  const enemy=probe.players[1-owner];
  if(enemy.hand.length&&enemy.deck.length)
   [enemy.hand[0],enemy.deck[0]]=[enemy.deck[0],enemy.hand[0]];
  if(!legalUniversalActions(packs,probe).some(x=>same(x,real)))return null;
  const other=dispatchUniversalAction(packs,probe,real,{actor:owner});
  if(!publiclyStableTransition(probe,other,real,owner))return null;
  const nextVisible=createUniversalAiObservation(packs,child,legalUniversalActions(packs,child));
  const probeVisible=createUniversalAiObservation(packs,other,legalUniversalActions(packs,other));
  if(!same(nextVisible,probeVisible))return null;
  return child;
 }catch{return null;}
}
export function evaluateTrustedUniversalAiTactics(packs,state,rootObservation,ranked,options={}){
 const limits={
  roots:clamp(options.roots??3,0,10),children:clamp(options.children??2,0,10),
  depth:clamp(options.depth??3,1,3),nodes:clamp(options.nodes??24,0,200),
  timeMs:clamp(options.timeMs??90,0,100)
 };
 const baseline=ranked[0]?.action||null,actor=rootObservation.actor;
 const fallback=(reason,nodes=0)=>({action:baseline,nodes,fallback:reason,
  exactSteps:0,heuristicFrontiers:0,estimated:true,used:false});
 if(!baseline||state.pending||rootObservation.phase!=='main'||limits.nodes===0||
  limits.roots===0||limits.timeMs===0)return fallback('not-eligible');
 const now=typeof performance==='undefined'?null:performance,start=now?.now()??0;
 const timeout=()=>now&&now.now()-start>limits.timeMs;
 let nodes=0,exactSteps=0,frontiers=0;
 const rootChoices=selected(ranked,limits.roots);
 // Exclude a root that cannot produce a native deterministic child, rather
 // than inferring the existence of a future card from printed text.
 function follow(current,depth){
  if(depth<=0||current.phase==='start'||current.phase==='move')return 0;
  const legal=legalUniversalActions(packs,current);
  const o=createUniversalAiObservation(packs,current,legal);
  const next=selected(rankUniversalAiActions(packs,o,options.ablation),limits.children);
  let best=0;
  for(const candidate of next){
   if(++nodes>limits.nodes||timeout())return null;
   if(candidate.action.type==='attack'){
    // Attack legality is exact, but BLOCK/LIFE outcome is NOT simulated.
    frontiers++;
    best=Math.max(best,clamp(candidate.score,0,12)*0.65);
    continue;
   }
   const child=nativeChild(packs,current,candidate.action,actor);
   if(!child)continue;
   exactSteps++;
   const childObs=createUniversalAiObservation(packs,child,legalUniversalActions(packs,child));
   const before=evaluateUniversalAiPosition(packs,o),after=evaluateUniversalAiPosition(packs,childObs);
   const material=clamp((after-before)*0.26,-5,5);
   const tail=depth>1?follow(child,depth-1):0;
   if(tail===null)return null;
   best=Math.max(best,candidate.score*0.25+material+tail*0.58);
  }
  return best;
 }
 let bestChoice=ranked[0],bestValue=-Infinity;
 for(const root of rootChoices){
  if(++nodes>limits.nodes||timeout())return fallback('budget-or-emergency-clock',nodes);
  const child=nativeChild(packs,state,root.action,actor);
  let value=root.score;
  if(child){
   exactSteps++;
   const childObs=createUniversalAiObservation(packs,child,legalUniversalActions(packs,child));
   const material=clamp((evaluateUniversalAiPosition(packs,childObs)-
    evaluateUniversalAiPosition(packs,rootObservation))*0.26,-5,5);
   const continuation=follow(child,limits.depth-1);
   if(continuation===null)return fallback('budget-or-emergency-clock',nodes);
   // Native path changes are exact, but the terminal value is heuristic.
   value+=clamp(material+continuation*0.52,-4,5);
  }
  if(value>bestValue+1e-9||
   Math.abs(value-bestValue)<1e-9&&stableUniversalAiActionKey(root.action)<
    stableUniversalAiActionKey(bestChoice.action)){
   bestChoice=root;bestValue=value;
  }
 }
 if(timeout())return fallback('emergency-clock',nodes);
 // Unsearched legal roots retain their fully assessed heuristic rankings.
 // A candidate can only displace the full-set heuristic best if its
 // conservative tactical score exceeds that best score.
 if(bestValue<ranked[0].score)bestChoice=ranked[0];
 return {action:bestChoice.action,nodes,fallback:null,exactSteps,
  heuristicFrontiers:frontiers,estimated:true,used:!!exactSteps,
  // No hidden-state or random futures are ever returned to the policy.
  scope:'native deterministic transitions; heuristic terminal attacks'};
}
