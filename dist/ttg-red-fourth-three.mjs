// UA56BT/TTG-1-051/052/053 printed red Simon effects.
// 051: mandatory on-entry draw then mandatory one-card hand sideline.
// 052: optional one hand sideline, then optional <=2 red recovery (may
//      recover the very card just discarded); if no sideline, no recovery.
// 053: main REST -> top deck card outside, may be used again after readying.
// Source: official cards 051/052/053; print trigger handled by shared Life API.
import {TTG_BY_ID} from './ttg-builder.mjs';
const locations=pl=>[...(pl.front||[]),...(pl.energy||[])].filter(Boolean);
const actual=(s,p,uid)=>locations(s.players[p]).find(c=>c.uid===uid);
const flatten=c=>[c.uid,...(c.stack||[]).flatMap(flatten),...(c.under||[]).flatMap(flatten)];
const inventory=pl=>[...(pl.deck||[]),...(pl.hand||[]),...(pl.life||[]),
 ...(pl.outside||[]),...(pl.removed||[]),...locations(pl)].flatMap(flatten).sort();
const ownMain=(s,p)=>[0,1].includes(p)&&s?.active===p&&s.phase==='main'&&!s.pending&&!s.pendingTtgLife;
const same=(s,a,q,t)=>a?.type===t&&a.player===q.player&&a.uid===q.uid;
const noDup= (before,pl)=>{if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('Red Simon card conservation failed');};
function entry(s,p,uid,id){
 if(!ownMain(s,p)||actual(s,p,uid)?.cardId!==id||
  actual(s,p,uid).enteredTurn!==s.turn)
  throw new Error(id+' entry timing or source invalid');
}
export function beginTtgRed051Entry(s,{player,uid}={}){
 entry(s,player,uid,'TTG-1-051');
 const before=inventory(s.players[player]),r=structuredClone(s),pl=r.players[player];
 if(!pl.deck.length){
  r.status='finished';r.winner=1-player;r.endReason='requiredDrawEmpty';return r;
 }
 pl.hand.push(pl.deck.shift());
 r.pending={kind:'ttgRed051Discard',player,uid};
 noDup(before,pl);
 return r;
}
export function legalTtgRed051Discards(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed051Discard')return [];
 return s.players[q.player].hand.map(c=>({type:'ttgRed051Discard',player:q.player,uid:q.uid,discardUid:c.uid}));
}
export function resolveTtgRed051Discard(s,a={}){
 const q=s?.pending;
 if(!same(s,a,q,'ttgRed051Discard')||
  !legalTtgRed051Discards(s).some(x=>x.discardUid===a.discardUid))
  throw new Error('051 must discard exactly one real hand card');
 const before=inventory(s.players[q.player]),r=structuredClone(s),pl=r.players[q.player];
 pl.outside.push(pl.hand.splice(pl.hand.findIndex(x=>x.uid===a.discardUid),1)[0]);
 r.pending=null;noDup(before,pl);return r;
}
export function beginTtgRed052Entry(s,{player,uid}={}){
 entry(s,player,uid,'TTG-1-052');
 const r=structuredClone(s);
 r.pending={kind:'ttgRed052Discard',player,uid};return r;
}
export function legalTtgRed052Discards(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed052Discard')return [];
 const base={type:'ttgRed052Discard',player:q.player,uid:q.uid};
 return [{...base,discardUid:null},...s.players[q.player].hand.map(c=>({...base,discardUid:c.uid}))];
}
export function resolveTtgRed052Discard(s,a={}){
 const q=s?.pending;
 if(!same(s,a,q,'ttgRed052Discard')||
  !legalTtgRed052Discards(s).some(x=>x.discardUid===a.discardUid))
  throw new Error('052 discard optional but requires legal hand choice');
 const before=inventory(s.players[q.player]),r=structuredClone(s),pl=r.players[q.player];
 if(a.discardUid==null){r.pending=null;return r;}
 const index=pl.hand.findIndex(c=>c.uid===a.discardUid);
 pl.outside.push(pl.hand.splice(index,1)[0]);
 r.pending={kind:'ttgRed052Recover',player:q.player,uid:q.uid,discardUid:a.discardUid};
 noDup(before,pl);return r;
}
export function legalTtgRed052Recovers(s){
 const q=s?.pending;if(q?.kind!=='ttgRed052Recover')return [];
 const base={type:'ttgRed052Recover',player:q.player,uid:q.uid};
 const legal=s.players[q.player].outside.filter(c=>TTG_BY_ID[c.cardId]?.color==='red'&&
  TTG_BY_ID[c.cardId]?.energy<=2);
 return [{...base,recoverUid:null},...legal.map(c=>({...base,recoverUid:c.uid}))];
}
export function resolveTtgRed052Recover(s,a={}){
 const q=s?.pending;
 if(!same(s,a,q,'ttgRed052Recover')||
  !legalTtgRed052Recovers(s).some(x=>x.recoverUid===a.recoverUid))
  throw new Error('052 recovered card must be red with energy <=2 in own outside');
 const before=inventory(s.players[q.player]),r=structuredClone(s),pl=r.players[q.player];
 if(a.recoverUid!=null){
  const index=pl.outside.findIndex(c=>c.uid===a.recoverUid);
  pl.hand.push(pl.outside.splice(index,1)[0]);
 }
 r.pending=null;noDup(before,pl);return r;
}
export function legalTtgRed053Main(s,p){
 if(!ownMain(s,p))return [];
 return locations(s.players[p]).filter(c=>c.cardId==='TTG-1-053'&&c.ready)
  .map(c=>({type:'ttgRed053Main',player:p,uid:c.uid}));
}
export function resolveTtgRed053Main(s,a={}){
 if(!legalTtgRed053Main(s,a.player).some(x=>x.uid===a.uid&&x.type===a.type))
  throw new Error('053 main effect must REST this own ACTIVE Simon');
 const before=inventory(s.players[a.player]),r=structuredClone(s),pl=r.players[a.player];
 const c=actual(r,a.player,a.uid);c.ready=false;
 if(pl.deck.length)pl.outside.push(pl.deck.shift());
 r.log??=[];r.log.push({type:'ttgRed053Mill',player:a.player,uid:a.uid,milled:!!s.players[a.player].deck.length});
 noDup(before,pl);return r;
}
