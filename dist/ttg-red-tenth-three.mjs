// UA56BT TTG-1-069/070/071.
// 069 Leeron self REST & retire to recover one GUNMEN from outside.
// 070 Rossiu alternate RAID base if no own Kamina remains on field.
// 071 King Kittan DX has its own tested physical RAID resolver and Q2301-like
// impact null; this module exposes matching/guard data, not a fake auto pass.
import {TTG_BY_ID} from './ttg-builder.mjs';
const field=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).map((c,slot)=>({c,line,slot})).filter(x=>x.c));
const name=c=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa||'';
const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
const total=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...field(p).map(x=>x.c)].flatMap(deep).sort();
const gunmen=c=>(TTG_BY_ID[c?.cardId]?.traits||[]).some(t=>t.includes('ガンメン'));
export function legalRed069Main(s,p){
 if(![0,1].includes(p)||s?.active!==p||s.phase!=='main'||s.pending||s.pendingTtgLife)return [];
 const pl=s.players[p],targets=pl.outside.filter(gunmen);
 return field(pl).filter(x=>x.c.cardId==='TTG-1-069'&&x.c.ready&&!x.c.stack?.length&&!x.c.under?.length)
  .flatMap(x=>targets.map(target=>({type:'ttgRed069Main',player:p,uid:x.c.uid,recoverUid:target.uid})));
}
export function resolveRed069Main(s,a={}){
 if(!legalRed069Main(s,a.player).some(x=>x.type===a.type&&x.uid===a.uid&&x.recoverUid===a.recoverUid))
  throw new Error('069 REST and retire require GUNMEN outside recovery target');
 const p=a.player,before=total(s.players[p]),r=structuredClone(s),pl=r.players[p];
 const own=field(pl).find(x=>x.c.uid===a.uid);
 own.c.ready=false;
 pl[own.line][own.slot]=null;
 pl.outside.push(own.c);
 const i=pl.outside.findIndex(x=>x.uid===a.recoverUid);
 pl.hand.push(pl.outside.splice(i,1)[0]);
 if(JSON.stringify(total(pl))!==JSON.stringify(before))throw new Error('069 UID loss');
 return r;
}
export function canRed070ServeAsRaidBase(s,p,base,raid){
 if(![0,1].includes(p)||base?.cardId!=='TTG-1-070'||!raid)return false;
 if(!['グレン','グレンラガン'].includes(name(raid))||!TTG_BY_ID[raid.cardId]?.trigger||TTG_BY_ID[raid.cardId]?.trigger!=='raid')
  return false;
 return !field(s.players[p]).some(x=>name(x.c)==='カミナ'||(x.c.stack||[]).some(b=>name(b)==='カミナ'));
}
export function red071ImpactNull(c){
 return c?.cardId==='TTG-1-071';
}
