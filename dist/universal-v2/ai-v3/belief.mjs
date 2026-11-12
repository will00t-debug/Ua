// Sampled worlds. Own remaining multiset is the actor's registered list
// minus cards that actor can already see. Opponent hidden cards come from
// a printed archetype minus public cards, never from the true hand, deck
// order, LIFE or match RNG.
import {visibleUidSet,hiddenSlots,visibleBodies,ownRemainderIds,applyHiddenIds} from './observation.mjs';
import {archetypeIds} from './archetype.mjs';

export function mulberry32(seed){
 let a=seed>>>0;
 return ()=>{
  a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return (t^t>>>14)>>>0;
 };
}
function shuffle(ids,rng){
 const next=ids.slice();
 for(let i=next.length-1;i>0;i--){
  const j=rng()%(i+1);
  const swap=next[i];
  next[i]=next[j];
  next[j]=swap;
 }
 return next;
}
function seenCounts(player,visible){
 const counts={};
 for(const card of visibleBodies(player,visible))
  counts[card.cardId]=(counts[card.cardId]||0)+1;
 return counts;
}
function packOf(pack,owner){return (Array.isArray(pack)?pack:[pack,pack])[owner];}
export function beliefWorld(pack,state,actor,seed,archetypeIndex=0){
 const visible=visibleUidSet(pack,state,actor);
 const copy=structuredClone(state);
 const rng=mulberry32((seed>>>0)^(archetypeIndex*0x9e3779b1));
 copy.rng=(rng()||1)>>>0;
 const assignments=[null,null];
 for(let p=0;p<2;p++){
  const slots=hiddenSlots(copy.players[p],visible);
  let ids;
  if(p===actor){
   const remainder=ownRemainderIds(pack,copy,actor,visible);
   ids=remainder.length===slots.length?shuffle(remainder,rng):null;
   if(!ids){
    const fallback=archetypeIds(packOf(pack,p),archetypeIndex,seenCounts(copy.players[p],visible),slots.length);
    ids=fallback?shuffle(fallback.ids,rng):null;
   }
  }else{
   const hypothesis=archetypeIds(packOf(pack,p),archetypeIndex,seenCounts(copy.players[p],visible),slots.length);
   ids=hypothesis?shuffle(hypothesis.ids,rng):null;
   if(ids){
    const counts={};
    const mark=card=>{
     if(!card?.uid||!card.cardId)return;
     counts[card.cardId]=(counts[card.cardId]||0)+1;
    };
    // Counts are filled after assignment.
    copy.initialCounts[p]=counts;
    assignments[p]={ids,recount:true};
    continue;
   }
  }
  if(!ids)return null;
  assignments[p]={ids,recount:p!==actor};
 }
 const lists=assignments.map(row=>row.ids);
 if(!applyHiddenIds(copy,visible,lists))return null;
 for(let p=0;p<2;p++)if(assignments[p].recount){
  const counts={};
  const visit=card=>{
   if(!card?.cardId)return;
   counts[card.cardId]=(counts[card.cardId]||0)+1;
   for(const layer of [...(card.stack||[]),...(card.under||[])])visit(layer);
  };
  const player=copy.players[p];
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
   for(const card of player[zone]||[])visit(card);
  for(const line of ['front','energy'])for(const card of player[line]||[])visit(card);
  copy.initialCounts[p]=counts;
 }
 return {state:copy,visible,archetype:archetypeIndex%3};
}
export function beliefWorlds(pack,state,actor,seed,count){
 const worlds=[];
 for(let i=0;i<count;i++){
  const world=beliefWorld(pack,state,actor,(seed>>>0)+i*9973,i);
  if(world)worlds.push(world);
 }
 return worlds;
}
