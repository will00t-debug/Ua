// UA56BT TTG-1-078/079/080 and 081 final remaining red events.
// 078/079: existing shared AP-ready/FI NAL reducer. 080: official Q2300,
// discount retained until the NEXT qualifying hand RAID, not unrelated cards.
// 081 normal + SPECIAL are separate in ttg-event-resolver/ttg-triggers.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor} from './ttg-energy-snapshot.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
const rows=p=>[...(p.front||[]),...(p.energy||[])].filter(Boolean);
const name=c=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa;
const has=(c,n)=>name(c)===n||(c.stack||[]).some(x=>has(x,n));
const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
const inventory=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...rows(p)].flatMap(deep).sort();
const wanted=new Set(['ラガン','グレン','グレンラガン']);
export function legalRed080Events(s,p){
 if(![0,1].includes(p)||s.active!==p||s.phase!=='main'||s.pending||s.pendingTtgLife)return [];
 const pl=s.players[p];
 if(!rows(pl).some(c=>has(c,'カミナ'))||calculateTtgEnergyByColor(s,p).red<3||
  pl.apCards.filter(c=>c.ready).length<1)return [];
 const recoverable=pl.outside.filter(c=>wanted.has(name(c)));
 return pl.hand.filter(c=>c.cardId==='TTG-1-080').flatMap(event=>
  [null,...recoverable.map(x=>x.uid)].map(recoverUid=>({type:'ttgRed080Event',player:p,handUid:event.uid,
   recoverUid,requiredAp:1})));
}
export function resolveRed080Event(s,a={}){
 const offered=legalRed080Events(s,a.player);
 if(!offered.some(x=>x.type===a.type&&x.handUid===a.handUid&&x.recoverUid===a.recoverUid)||
  !Array.isArray(a.payApUids)||a.payApUids.length!==1)
  throw new Error('080 Kamina precondition / outside Gurren target / AP invalid');
 const before=inventory(s.players[a.player]),r=spendTtgApCards(s,{player:a.player,apUids:a.payApUids,count:1});
 const pl=r.players[a.player],i=pl.hand.findIndex(x=>x.uid===a.handUid);
 pl.outside.push(pl.hand.splice(i,1)[0]);
 if(a.recoverUid){
  const j=pl.outside.findIndex(x=>x.uid===a.recoverUid);
  pl.hand.push(pl.outside.splice(j,1)[0]);
 }
 pl.red080DiscountUntilTurn=s.turn;
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('080 physical event conservation failure');
 r.log??=[];r.log.push({type:'ttgRed080Event',player:a.player,uid:a.handUid,recovered:a.recoverUid});
 return r;
}
export function expireRed080AtOwnTurnEnd(s,p){
 const r=structuredClone(s),pl=r.players[p];
 delete pl.red080DiscountUntilTurn;
 return r;
}
export function red080DiscountFor(s,p,c){
 return s.players?.[p]?.red080DiscountUntilTurn===s.turn&&wanted.has(name(c))?1:0;
}
