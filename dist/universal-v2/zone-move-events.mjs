// V2 private event journal, attached to the existing reducer (not a second engine).
// Never expose this ledger via the public view: historical hand/deck IDs are private.
export const V2_MOVE_REASONS=Object.freeze([
 'payment','own-effect','opponent-effect','rule','life-trigger','retirement','raid-strip'
]);
export const V2_MOVE_ZONES=Object.freeze(['hand','deck','life','outside','front','energy','removed','raid-under']);
export function appendCompletedMove(s,move){
 const {uid,cardId,owner,controller,from,to,reason,sourceUid=null,
  sourceCardId=null,sourceName=null,sourceColor=null,sourceOnField=false}=move;
 if(![0,1].includes(owner)||![0,1].includes(controller)||
  typeof uid!=='string'||!uid.startsWith(owner+'-')||
  typeof cardId!=='string'||!cardId||
  !V2_MOVE_ZONES.includes(from)||!V2_MOVE_ZONES.includes(to)||from===to||
  !V2_MOVE_REASONS.includes(reason)||
  (sourceUid!==null&&typeof sourceUid!=='string')||
  (sourceCardId!==null&&typeof sourceCardId!=='string')||
  (sourceName!==null&&typeof sourceName!=='string')||
  (sourceColor!==null&&typeof sourceColor!=='string')||
  typeof sourceOnField!=='boolean'||
  !Array.isArray(s.zoneMoveEvents)||!Number.isInteger(s.nextZoneMoveOrder))
  throw Error('Invalid V2 zone move provenance');
 const pile=s.players[owner][to];
 const scan=c=>c?.uid===uid||(c?.stack||[]).some(scan)||(c?.under||[]).some(scan);
 if(!Array.isArray(pile)||!pile.some(scan))
  throw Error('Zone provenance must follow an actual completed destination');
 const e={order:s.nextZoneMoveOrder++,turn:s.turn,uid,cardId,owner,controller,
  from,to,reason,sourceUid,sourceCardId,sourceName,sourceColor,sourceOnField};
 s.zoneMoveEvents.push(e);
 return e;
}
// Narrow predicate family for future declared printed triggers; does not
// authorize a real card effect or automatically enqueue one.
export function matchesCompletedMove(e,condition){
 if(!e||!condition||typeof condition!=='object'||Array.isArray(condition)||
  Object.keys(condition).length===0||
  Object.keys(condition).some(k=>!['owner','controller','from','to','reason',
   'sourceUid','sourceCardId','sourceName','sourceColor','sourceOnField','cardId'].includes(k)))
  throw Error('Invalid zone move condition');
 return Object.entries(condition).every(([k,v])=>e[k]===v);
}
