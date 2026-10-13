// UA56BT/TTG-1-054/055/056 effects (official TTG card fronts, Q2291-2292).
// 056 attack-after-Raid remains gated in the primary core until 073/074/076
// physical Raid entry effects and target choices are fully implemented.
import {TTG_BY_ID} from './ttg-builder.mjs';
const own=p=>[...(p.front||[]),...(p.energy||[])].filter(Boolean);
const physical=x=>[x.uid,...(x.stack||[]).flatMap(physical),...(x.under||[]).flatMap(physical)];
const inventory=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...own(p)].flatMap(physical).sort();
const found=(s,p,uid)=>own(s.players[p]).find(x=>x.uid===uid);
const validEntry=(s,p,uid,id)=>[0,1].includes(p)&&s.active===p&&s.phase==='main'&&!s.pending&&
  !s.pendingTtgLife&&found(s,p,uid)?.cardId===id&&found(s,p,uid)?.enteredTurn===s.turn;
const assertCount=(before,pl)=>{if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('Red Simon physical card loss');};
export function redSimonNiaOnField(s,p){
 return [0,1].includes(p)&&own(s.players[p]).some(c=>TTG_BY_ID[c.cardId]?.nameJa==='ニア');
}
export function red054Conditions(s,p,c){
 return c?.cardId==='TTG-1-054'&&redSimonNiaOnField(s,p)&&s.players[p].deck.length<=20;
}
export function red054BpBonus(s,p,c){
 return red054Conditions(s,p,c)&&s.active===p?1500:0;
}
export function red054ImpactNull(s,p,c){return !!red054Conditions(s,p,c);}
export function red056CanAttack(s,p,c){
 return c?.cardId!=='TTG-1-056'||(redSimonNiaOnField(s,p)&&s.players[p].deck.length<=20);
}
export function beginTtgRed054Entry(s,{player,uid}={}){
 if(!validEntry(s,player,uid,'TTG-1-054'))throw new Error('054 entry timing invalid');
 const r=structuredClone(s);r.pending={kind:'ttgRed054Mill',player,uid};
 return r;
}
export function legalTtgRed054Choices(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed054Mill')return [];
 const base={type:'ttgRed054Mill',player:q.player,uid:q.uid};
 return [{...base,mill:false},...(s.players[q.player].deck.length?[{...base,mill:true}]:[])];
}
export function resolveTtgRed054Mill(s,action={}){
 const q=s?.pending;
 if(!legalTtgRed054Choices(s).some(x=>x.type===action.type&&x.player===action.player&&
  x.uid===action.uid&&x.mill===action.mill))throw new Error('054 optional top mill illegal');
 const before=inventory(s.players[q.player]),r=structuredClone(s),pl=r.players[q.player];
 if(action.mill)pl.outside.push(pl.deck.shift());
 r.pending=null;assertCount(before,pl);
 return r;
}
export function beginTtgRed055Entry(s,{player,uid}={}){
 if(!validEntry(s,player,uid,'TTG-1-055'))throw new Error('055 entry timing invalid');
 const r=structuredClone(s);r.pending={kind:'ttgRed055Mill',player,uid};return r;
}
export function legalTtgRed055Mills(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed055Mill')return [];
 return Array.from({length:Math.min(2,s.players[q.player].deck.length)+1},(_,count)=>({
  type:'ttgRed055Mill',player:q.player,uid:q.uid,count
 }));
}
export function resolveTtgRed055Mill(s,a={}){
 const q=s?.pending;
 if(!legalTtgRed055Mills(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&x.count===a.count))
  throw new Error('055 may mill at most two real top cards');
 const before=inventory(s.players[q.player]),r=structuredClone(s),pl=r.players[q.player];
 const milled=pl.deck.splice(0,a.count);
 pl.outside.push(...milled);
 r.pending={kind:'ttgRed055Discard',player:q.player,uid:q.uid,milledUids:milled.map(c=>c.uid)};
 assertCount(before,pl);return r;
}
export function legalTtgRed055Discards(s){
 const q=s?.pending;if(q?.kind!=='ttgRed055Discard')return [];
 const b={type:'ttgRed055Discard',player:q.player,uid:q.uid};
 return [{...b,discardUid:null},...s.players[q.player].hand.map(c=>({...b,discardUid:c.uid}))];
}
export function resolveTtgRed055Discard(s,a={}){
 const q=s?.pending;
 if(!legalTtgRed055Discards(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&x.discardUid===a.discardUid))
  throw new Error('055 discard optional but selection must be from own hand');
 const before=inventory(s.players[q.player]),r=structuredClone(s),pl=r.players[q.player];
 if(a.discardUid==null){r.pending=null;return r;}
 pl.outside.push(pl.hand.splice(pl.hand.findIndex(c=>c.uid===a.discardUid),1)[0]);
 r.pending={kind:'ttgRed055Recover',player:q.player,uid:q.uid,milledUids:q.milledUids};
 assertCount(before,pl);return r;
}
export function legalTtgRed055Recovers(s){
 const q=s?.pending;if(q?.kind!=='ttgRed055Recover')return [];
 const b={type:'ttgRed055Recover',player:q.player,uid:q.uid};
 const eligible=s.players[q.player].outside.filter(c=>q.milledUids.includes(c.uid));
 return [{...b,recoverUid:null},...eligible.map(c=>({...b,recoverUid:c.uid}))];
}
export function resolveTtgRed055Recover(s,a={}){
 const q=s?.pending;
 if(!legalTtgRed055Recovers(s).some(x=>x.type===a.type&&x.player===a.player&&
  x.uid===a.uid&&x.recoverUid===a.recoverUid))
  throw new Error('055 must recover from this entry effect’s milled cards only');
 const before=inventory(s.players[q.player]),r=structuredClone(s),pl=r.players[q.player];
 if(a.recoverUid!=null){
  const i=pl.outside.findIndex(c=>c.uid===a.recoverUid);
  pl.hand.push(pl.outside.splice(i,1)[0]);
 }
 r.pending=null;assertCount(before,pl);return r;
}
// This queue intentionally does not auto-raid unresolved 073/074/076 cards;
// no complete Raid entry => no auto approval (Q2291-2292).
export function legalRed056AfterAttackRaids(s,p,uid){
 const c=s.players?.[p]?.front?.find(x=>x?.uid===uid);
 if(c?.cardId!=='TTG-1-056'||s.phase!=='attack'||s.active!==p)return [];
 const history=new Set(s.raidNamesThisTurn||[]);
 return s.players[p].hand.filter(x=>{
  const d=TTG_BY_ID[x.cardId];
  return d?.color==='red'&&['ラガン','グレンラガン'].includes(d.nameJa)&&!history.has(d.nameJa);
 }).map(x=>({type:'ttgRed056AfterAttackRaid',player:p,uid,handUid:x.uid,
   cardId:x.cardId,requiresFullRaidResolver:true}));
}
