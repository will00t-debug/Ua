// Trusted adapter: policy code receives no match state, RNG, queues, deck order,
// opponent hand, unrevealed LIFE, or opponent registered deck composition.
import {universalPublicView,universalPrivateChoices,universalImpact,
 universalAttackDamage,universalBp} from './engine.mjs';
export function createUniversalAiObservation(pack,s,legal){
 const packs=Array.isArray(pack)?pack:[pack,pack],actor=s.pending?.player??s.active;
 const v=universalPublicView(packs,s,actor);
 const players=v.players.map((p,i)=>({
  life:p.lifeCount,deckCount:p.deckCount,handCount:p.handCount,
  hand:p.hand||[],outside:p.outside,ap:p.apReady,
  energyTotal:p.energyTotal,energyByColor:p.energyByColor,
  front:p.front.map((c,j)=>c?{
   uid:c.uid,cardId:c.cardId,ready:c.ready,bp:c.bp,
   impact:universalImpact(packs,s,s.players[i].front[j]),
   damage:universalAttackDamage(packs,s,s.players[i].front[j]),
   restrictions:c.restrictions,raidDepth:c.raidDepth
  }:null),
  energy:p.energy.map((c,j)=>c?{
   uid:c.uid,cardId:c.cardId,ready:c.ready,produces:c.produces,
   bp:universalBp(packs,s,s.players[i].energy[j])
  }:null)
 }));
 const privateChoices=universalPrivateChoices(packs,s,actor)?.options||[];
 // A search reveals eligible identities, not their prior deck order. Stable
 // UID ordering also prevents equal-score search ties from using deck order.
 const choices=privateChoices.map(x=>({action:x.action,card:x.card,cards:x.cards}));
 const q=s.pending;
 const pending=q?{kind:q.kind,player:q.player}:null;
 if(q){
  // Only public resolution parameters, never copy the complete pending queue.
  for(const k of ['sourceUid','attackerUid','uid','bp'])
   if(q[k]!==undefined)pending[k]=q[k];
  // Carry only printed program parameters visible to the resolving player,
  // never internal queues, deck order, RNG or undisclosed identities.
  const printed=(program,depth=0)=>depth>4?[]:(program||[]).map(e=>({
   ...Object.fromEntries(['op','bp','count','energy','optional'].filter(k=>e[k]!==undefined).map(k=>[k,e[k]])),
   ...(e.then?{then:printed(e.then,depth+1)}:{}),
   ...(e.options?{options:e.options.map(x=>({id:x.id,then:printed(x.then,depth+1)}))}: {})
  }));
  if(['effect-retire-own-field','effect-retire-own-character','main-field-trait-retire','effect-bounce-own'].includes(q.kind))
   pending.after=printed(q.after);
  if(['effect-discard-gate','effect-once-choice'].includes(q.kind))
   pending.continuation=printed(q.then);
  if(q.kind==='effect-choice-mode')pending.options=structuredClone(q.options);
 }
 return {actor,active:s.active,first:s.first,turn:s.turn,phase:s.phase,
  status:s.status,winner:s.winner,players,pending,choices,
  ownDeckCounts:{...s.initialCounts?.[actor]},
  legal:structuredClone(legal)};
}
