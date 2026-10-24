// V2 private event journal, attached to the existing reducer (not a second engine).
// Never expose this ledger via the public view: historical hand/deck IDs are private.
export const V2_MOVE_REASONS=Object.freeze([
 'payment','own-effect','opponent-effect','rule','life-trigger','retirement','raid-strip','protection'
]);
export const V2_MOVE_ZONES=Object.freeze(['hand','deck','life','lifeRevealed','outside','front','energy','removed','raid-under']);
export function appendCompletedMove(s,move){
 const {uid,cardId,owner,controller,from,to,reason,sourceUid=null,
  sourceCardId=null,sourceName=null,sourceColor=null,sourceOnField=false,
  attachedToUid=null,wasFaceDown=false}=move;
 if(![0,1].includes(owner)||![0,1].includes(controller)||
  typeof uid!=='string'||!uid.startsWith(owner+'-')||
  typeof cardId!=='string'||!cardId||
  !V2_MOVE_ZONES.includes(from)||!V2_MOVE_ZONES.includes(to)||from===to||
  !V2_MOVE_REASONS.includes(reason)||
  (sourceUid!==null&&typeof sourceUid!=='string')||
  (sourceCardId!==null&&typeof sourceCardId!=='string')||
  (sourceName!==null&&typeof sourceName!=='string')||
  (sourceColor!==null&&typeof sourceColor!=='string')||
  typeof sourceOnField!=='boolean'||typeof wasFaceDown!=='boolean'||
  (attachedToUid!==null&&(typeof attachedToUid!=='string'||
   !attachedToUid.startsWith(owner+'-')||attachedToUid===uid||from!=='raid-under'))||
  !Array.isArray(s.zoneMoveEvents)||!Number.isInteger(s.nextZoneMoveOrder))
  throw Error('Invalid V2 zone move provenance');
 const pl=s.players[owner];
 const scan=c=>c?.uid===uid||(c?.stack||[]).some(scan)||(c?.under||[]).some(scan);
 // A buried Raid card has no top-level zone array: verify that the UID is
 // inside a field root's stack/under, not the visible field top or another owner.
 const buried=()=>[...pl.front,...pl.energy].some(c=>c&&(
  (c.stack||[]).some(scan)||(c.under||[]).some(scan)));
 const pile=to==='raid-under'?null:pl[to];
 if(!(to==='raid-under'?buried():Array.isArray(pile)&&pile.some(scan)))
  throw Error('Zone provenance must follow an actual completed destination');
 const e={order:s.nextZoneMoveOrder++,turn:s.turn,uid,cardId,owner,controller,
  from,to,reason,sourceUid,sourceCardId,sourceName,sourceColor,sourceOnField,
  ...(attachedToUid!==null?{attachedToUid,wasFaceDown,
   identityViewersBefore:wasFaceDown?[owner]:[0,1]}:{})};
 s.zoneMoveEvents.push(e);
 return e;
}
// Narrow predicate family for future declared printed triggers; does not
// authorize a real card effect or automatically enqueue one.
// Data-driven source filter, not permission to enqueue unreviewed official
// triggers. Source card identity refers to the cause's FIELD top at move time.
const FILTER_KEYS=Object.freeze(['owner','controller','from','to','reason','reasons',
 'sourceUid','sourceCardId','sourceName','sourceColor','sourceOnField','cardId']);
export function validateCompletedMoveCondition(condition){
 if(!condition||typeof condition!=='object'||Array.isArray(condition)||
  Object.keys(condition).length===0||
  Object.keys(condition).some(k=>!FILTER_KEYS.includes(k))||
  ('reason' in condition&&'reasons' in condition))
  throw Error('Invalid zone move condition');
 for(const [key,value] of Object.entries(condition)){
  if(key==='owner'||key==='controller'){
   if(![0,1].includes(value))throw Error('Invalid zone move controller');
  }else if(key==='from'||key==='to'){
   if(!V2_MOVE_ZONES.includes(value))throw Error('Invalid zone move zone');
  }else if(key==='reason'){
   if(!V2_MOVE_REASONS.includes(value))throw Error('Invalid zone move reason');
  }else if(key==='reasons'){
   if(!Array.isArray(value)||!value.length||value.length>3||
    new Set(value).size!==value.length||
    value.some(r=>!V2_MOVE_REASONS.includes(r)))
    throw Error('Invalid zone move reasons');
  }else if(key==='sourceOnField'){
   if(typeof value!=='boolean')throw Error('Invalid source residency condition');
  }else if(typeof value!=='string'||!value.trim()){
   throw Error('Invalid zone move identity filter');
  }
 }
 if(condition.from!==undefined&&condition.to!==undefined&&condition.from===condition.to)
  throw Error('Invalid no-op zone move condition');
 return Object.freeze({...condition,...(condition.reasons?{reasons:Object.freeze([...condition.reasons])}:{})});
}
export function matchesCompletedMove(e,condition){
 const q=validateCompletedMoveCondition(condition);
 if(!e||typeof e!=='object'||!Number.isInteger(e.order))return false;
 return Object.entries(q).every(([k,v])=>k==='reasons'
  ?v.includes(e.reason):e[k]===v);
}
// The caller decides when the causing source operation has completely
// finished. Never call effects or enqueue during the physical move itself:
// e.g. official BLEACH Q1033 explicitly defers the resulting draw until after
// its Ichigo source ability finishes.
export function completedMovesMatching(s,condition,{afterOrder=0}={}){
 const q=validateCompletedMoveCondition(condition);
 if(!Number.isInteger(afterOrder)||afterOrder<0||
  !Array.isArray(s?.zoneMoveEvents))throw Error('Invalid move trigger scan');
 return s.zoneMoveEvents.filter(e=>e.order>afterOrder&&
  Object.entries(q).every(([k,v])=>k==='reasons'?v.includes(e.reason):e[k]===v));
}
