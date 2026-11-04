// UA53BT continuous numbers and Makima also-event identity.
// The engine calls these while measuring BP, Impact null, block ceilings,
// and event-use history. This file does not import the engine.
// Q2079: use-time identity, not a retroactive rewrite.
import {cardHasName,cardCountsAsEvent} from './field-conditions.mjs';
import {originalEffectsDisabled} from './continuous-states.mjs';

const DENJI='デンジ';
const REZE='レゼ';
const MAKIMA='マキマ';

function named(d,name,silenced){return cardHasName(d,name,silenced===true);}
function facedowns(c){return (c?.under||[]).filter(x=>x&&x.faceDown===true);}

export function csmDenjiRetiredThisTurn(s,owner,card){
 return (s.zoneMoveEvents||[]).some(e=>{
  if(e.turn!==s.turn||e.owner!==owner||e.reason!=='retirement')return false;
  return named(card({uid:e.uid,cardId:e.cardId}),DENJI,false);
 });
}

export function csmEventUseCount(s,owner,card,exceptUid=null){
 let n=0;
 for(const e of s.zoneMoveEvents||[]){
  if(e.turn!==s.turn||e.owner!==owner||e.controller!==owner||
   e.from!=='hand'||e.reason!=='rule'||e.uid===exceptUid)continue;
  const d=card({uid:e.uid,cardId:e.cardId});
  if(!d)continue;
  if(d.type==='event'||d.alsoEvent===true){n++;continue;}
  // Live Makima also-event: only uses that happened while the aura / grant
  // was already active count (Q2079).
  if(d.type==='character'&&d.color==='purple'&&!named(d,MAKIMA,false)&&
   csmAlsoEventAuraAt(s,owner,e.order,card))n++;
 }
 return n;
}

export function csmAlsoEventAuraLive(s,owner,card){
 if(s.csmAlsoEventGrant?.[owner]===s.turn)return true;
 for(const c of s.players[owner]?.front||[]){
  if(!c||originalEffectsDisabled(s,c))continue;
  const id=card(c)?.id;
  if(id==='CSM-1-022'||id==='CSM-1-024')return true;
 }
 return false;
}

function csmAlsoEventAuraAt(s,owner,order,card){
 if(Number.isInteger(s.csmAlsoEventGrantOrder?.[owner])&&
  s.csmAlsoEventGrant?.[owner]===s.turn&&
  s.csmAlsoEventGrantOrder[owner]<order)return true;
 // Q2079: determine whether Makima was on the front line WHEN the card was
 // used, not merely whether she appeared there earlier in the turn. Rewind
 // only front-line moves after this hand use, starting from the current board.
 const makimaIds=new Set(['CSM-1-022','CSM-1-024']);
 const frontAtUse=new Set((s.players[owner]?.front||[]).filter(c=>
  c&&makimaIds.has(card(c)?.id)&&!originalEffectsDisabled(s,c)).map(c=>c.uid));
 const moves=s.zoneMoveEvents||[];
 for(let i=moves.length-1;i>=0;i--){
  const e=moves[i];
  if(e.turn!==s.turn||e.owner!==owner||e.order<order||
   (e.from!=='front'&&e.to!=='front')||
   !makimaIds.has(card({uid:e.uid,cardId:e.cardId})?.id))continue;
  // Undo the move. front->outside restores Makima's earlier aura; a later
  // hand->front must not make an earlier character play count as an event.
  if(e.to==='front')frontAtUse.delete(e.uid);
  if(e.from==='front')frontAtUse.add(e.uid);
 }
 return frontAtUse.size>0;
}

export function csmCardCountsAsEvent(s,owner,definition,card){
 if(cardCountsAsEvent(definition))return true;
 if(!definition||definition.type!=='character'||definition.color!=='purple')
  return false;
 if(named(definition,MAKIMA,false))return false;
 return csmAlsoEventAuraLive(s,owner,card);
}

export function csmBp(pack,s,c,printed,suppressed,owner,card){
 if(suppressed||!printed?.csmHook)return 0;
 let n=0;
 const events=csmEventUseCount(s,owner,x=>card(pack,x));
 if(printed.id==='CSM-1-002'){
  const pl=s.players[owner];
  for(const line of ['front','energy']){
   const slot=pl[line].findIndex(x=>x?.uid===c.uid);
   if(slot<0)continue;
   const mate=pl[line==='front'?'energy':'front'][slot];
   if(mate&&named(card(pack,mate),REZE,originalEffectsDisabled(s,mate)))n+=1000;
  }
 }
 if(printed.id==='CSM-1-010'&&s.active===owner&&
  s.players[owner].front.concat(s.players[owner].energy).some(x=>x&&
   named(card(pack,x),MAKIMA,originalEffectsDisabled(s,x)))&&events>=1)n+=1000;
 if(printed.id==='CSM-1-015'&&s.active===owner)n+=500*events;
 if(printed.id==='CSM-1-027'&&s.active===owner&&csmDenjiRetiredThisTurn(s,owner,x=>card(pack,x)))
  n+=1000;
 return n;
}

export function csmImpactNull(pack,s,c,printed,suppressed,owner,card){
 if(suppressed||!printed?.csmHook)return false;
 if(printed.id==='CSM-1-002'){
  const pl=s.players[owner];
  for(const line of ['front','energy']){
   const slot=pl[line].findIndex(x=>x?.uid===c.uid);
   if(slot<0)continue;
   const mate=pl[line==='front'?'energy':'front'][slot];
   if(mate&&named(card(pack,mate),REZE,originalEffectsDisabled(s,mate)))return true;
  }
 }
 return false;
}

export function csmBlockAtLeast(pack,s,c,printed,suppressed,owner,card){
 if(suppressed||!printed?.csmHook)return null;
 if(printed.id==='CSM-1-010'&&s.active===owner&&
  s.players[owner].front.concat(s.players[owner].energy).some(x=>x&&
   named(card(pack,x),MAKIMA,originalEffectsDisabled(s,x)))&&
  csmEventUseCount(s,owner,x=>card(pack,x))>=2)return 4000;
 return null;
}

export function csmAttackDamage(pack,s,c,printed,suppressed,owner,card){
 if(suppressed||!printed?.csmHook)return 0;
 if(printed.id==='CSM-1-016'&&s.active===owner&&
  csmDenjiRetiredThisTurn(s,owner,x=>card(pack,x)))return 2;
 return 0;
}

export function csmOnlyRezeHighBp(pack,s,owner,card,bpOf){
 const pool=[];
 for(const zone of ['front','energy'])for(const c of s.players[owner][zone]||[])
  if(c)pool.push(c);
 for(const c of s.players[owner].outside||[])pool.push(c);
 const high=pool.filter(c=>{
  const d=card(pack,c);
  const value=typeof bpOf==='function'?bpOf(c):(d?.bp||0);
  return Number.isInteger(value)&&value>=4000;
 });
 return high.length>0&&high.every(c=>named(card(pack,c),REZE,
  originalEffectsDisabled(s,c)));
}

export function csmFacedowns(c){return facedowns(c);}
