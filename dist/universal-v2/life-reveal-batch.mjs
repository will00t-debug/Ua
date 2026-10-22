// Internal, side-effect-free Q73 reveal planner for the existing V2 effectQueue.
// Deliberately does NOT change damage(), pending, LIFE/publicReveals or winner.
// Future integration must atomically move the reserved UIDs and let the defender
// choose live trigger order, including effects newly created by trigger entries.
export function planSimultaneousLifeReveal(life,damageCount){
 if(!Array.isArray(life)||!Number.isInteger(damageCount)||damageCount<1||
  life.some(c=>!c||typeof c.uid!=='string'||!c.uid||
   typeof c.cardId!=='string'||!c.cardId)||
  new Set(life.map(c=>c.uid)).size!==life.length)
  throw Error('Invalid private LIFE reveal input');
 // Q72: remaining LIFE bounds reveal count; FINAL can change state only AFTER
 // reveal, never allow this helper to draw another hidden card mid-batch.
 const count=Math.min(life.length,damageCount);
 return Object.freeze({
  count, // 0 when the caller has zero LIFE; engine decides game termination.
  revealed:Object.freeze(life.slice(0,count)),
  unrevealed:Object.freeze(life.slice(count))
 });
}
