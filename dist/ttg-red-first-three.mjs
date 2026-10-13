// UA56BT TTG-1-042/043/044 red starter batch.
// 042 ACTIVE and 043 DRAW use the generic physical Life Trigger reducer.
// 043 IMPACT null and 044 Kamina's continuous +500 BP/unblocked search are
// available here to the restricted TTG core, never the main BLEACH engine.
// Sources: official TTG-1-042/043/044 card fronts; official FAQ Q2285.
import {TTG_BY_ID} from './ttg-builder.mjs';
const physical=(c)=>[c.uid,...(c.stack||[]).flatMap(physical),...(c.under||[]).flatMap(physical)];
const field=(pl)=>[...(pl?.front||[]),...(pl?.energy||[])].filter(Boolean);
const inventory=(pl)=>[...(pl.deck||[]),...(pl.hand||[]),...(pl.life||[]),...(pl.outside||[]),
 ...(pl.removed||[]),...field(pl)].flatMap(physical).sort();
const printedName=(c)=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa||'';
const containsSimon=(c)=>printedName(c)==='シモン'||(c.stack||[]).some(containsSimon);
export function ttgRedStarterBpBonus(state,player,card){
 if(card?.cardId!=='TTG-1-044'||state?.active!==player||![0,1].includes(player))return 0;
 return field(state.players[player]).some(containsSimon)?500:0;
}
export function ttgRedStarterImpactNull(card){
 return card?.cardId==='TTG-1-043'||
  (card?.cardId==='TTG-1-048'&&card.doubleBlockUntilOwnStartTurnCount!=null);
}
// Q2285: opens only AFTER blocker choice was declined, BEFORE life damage.
// All seven searched cards remain physically in the deck while a decision is pending.
export function beginTtgRed044Unblocked(state,{player,attackerUid}={}){
 if(![0,1].includes(player)||state?.active!==player||state.phase!=='attack'||
   state.pending||state.pendingTtgLife)throw new Error('Cannot open 044 unblocked search');
 const attacker=state.players[player]?.front?.find(c=>c?.uid===attackerUid);
 if(attacker?.cardId!=='TTG-1-044'||attacker.attackTurn!==state.turn)
   throw new Error('044 search requires this attacker to have attacked');
 const r=structuredClone(state);
 r.pending={kind:'ttgRed044Search',player,attackerUid,
  revealed:r.players[player].deck.slice(0,7).map(c=>c.uid)};
 return r;
}
export function legalTtgRed044Search(state){
 const q=state?.pending;
 if(q?.kind!=='ttgRed044Search')return [];
 const pl=state.players[q.player],revealed=pl.deck.slice(0,q.revealed.length);
 if(revealed.map(c=>c.uid).join('|')!==q.revealed.join('|'))
   throw new Error('044 private deck order changed while decision pending');
 const b={type:'ttgRed044Search',player:q.player,attackerUid:q.attackerUid};
 const remain=q.revealed.slice();
 const choices=[{...b,mode:'skip',takeUid:null,discardUid:null,bottomOrderUids:[]},
  {...b,mode:'search',takeUid:null,discardUid:null,bottomOrderUids:remain}];
 for(const target of revealed.filter(c=>printedName(c)==='グレン')){
  const order=remain.filter(uid=>uid!==target.uid);
  for(const discard of [...pl.hand,target])choices.push({...b,mode:'search',takeUid:target.uid,
   discardUid:discard.uid,bottomOrderUids:order});
 }
 return choices;
}
export function resolveTtgRed044Search(state,action={}){
 const q=state?.pending,possibilities=legalTtgRed044Search(state);
 if(q?.kind!=='ttgRed044Search'||action.player!==q.player||
  action.attackerUid!==q.attackerUid||
  !possibilities.some(o=>o.mode===action.mode&&o.takeUid===action.takeUid&&o.discardUid===action.discardUid))
   throw new Error('Illegal 044 revealed-card choice or mandatory hand discard');
 if(action.mode==='skip'){
  const r=structuredClone(state);
  r.pending=null;
  r.log??=[];r.log.push({type:'ttgRed044Search',player:q.player,attackerUid:q.attackerUid,skipped:true});
  return r;
 }
 const seen=q.revealed,remaining=seen.filter(uid=>uid!==action.takeUid);
 const order=action.bottomOrderUids;
 if(!Array.isArray(order)||order.length!==remaining.length||
   new Set(order).size!==remaining.length||order.some(uid=>!remaining.includes(uid)))
  throw new Error('044 deck-bottom order must be a permutation of unselected cards');
 const before=inventory(state.players[q.player]);
 const r=structuredClone(state),pl=r.players[q.player],top=pl.deck.splice(0,seen.length);
 if(action.takeUid!=null){
  const picked=top.find(c=>c.uid===action.takeUid);
  if(!picked||printedName(picked)!=='グレン')throw new Error('044 only searches printed Gurren');
  pl.hand.push(picked);
  const discarded=pl.hand.findIndex(c=>c.uid===action.discardUid);
  if(discarded<0)throw new Error('044 taking a card requires one hand discard');
  pl.outside.push(pl.hand.splice(discarded,1)[0]);
 }
 for(const uid of order)pl.deck.push(top.find(c=>c.uid===uid));
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))
  throw new Error('044 search changed physical card identity conservation');
 r.pending=null;
 r.log??=[];
 r.log.push({type:'ttgRed044Search',player:q.player,attackerUid:q.attackerUid,
  took:action.takeUid!=null});
 return r;
}
