// UA56BT/TTG-1-057/058/059 official red effects.
// 059 REST->Simon BP is implemented in ttg-pending-rules/ttg-rule-adapter.
// Kamina/Nia mutual deployment exclusion is a shared printed permanent rule.
import {TTG_BY_ID} from './ttg-builder.mjs';
const face=p=>[...(p?.front||[]),...(p?.energy||[])].filter(Boolean);
const name=c=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa||'';
const contains=(c,n)=>name(c)===n||(c.stack||[]).some(x=>contains(x,n));
const real=c=>[c.uid,...(c.stack||[]).flatMap(real),...(c.under||[]).flatMap(real)];
const inventory=p=>[...p.hand,...p.deck,...p.life,...p.outside,...(p.removed||[]),...face(p)].flatMap(real).sort();
export function legalTtgRedNiaKaminaPlay(s,p,card){
 if(![0,1].includes(p)||!s.players?.[p]||!card)return false;
 const n=name(card),pl=s.players[p];
 if(n==='ニア'&&face(pl).some(x=>contains(x,'カミナ')))return false;
 if(n==='カミナ'&&face(pl).some(x=>name(x)==='ニア'))return false;
 return true;
}
const entry=(s,p,uid,id)=>[0,1].includes(p)&&s.active===p&&s.phase==='main'&&!s.pending&&
  !s.pendingTtgLife&&face(s.players[p]).some(x=>x.uid===uid&&x.cardId===id&&x.enteredTurn===s.turn);
export function beginTtgRed057Or058Entry(s,{player,uid}={}){
 const card=face(s.players?.[player]).find(x=>x.uid===uid);
 if(!['TTG-1-057','TTG-1-058'].includes(card?.cardId)||!entry(s,player,uid,card.cardId))
  throw new Error('057/058 entry source invalid');
 const r=structuredClone(s);r.pending={kind:'ttgRed057058Entry',player,uid,id:card.cardId};return r;
}
export function legalTtgRed057058Choices(s){
 const q=s?.pending;if(q?.kind!=='ttgRed057058Entry')return [];
 const b={type:'ttgRed057058Entry',player:q.player,uid:q.uid};
 const candidates=face(s.players[q.player]).filter(c=>c.uid!==q.uid&&TTG_BY_ID[c.cardId]?.type==='character');
 return [{...b,targetUid:null},...candidates.map(c=>({...b,targetUid:c.uid}))];
}
export function resolveTtgRed057058Choice(s,a={}){
 const q=s?.pending;
 if(!legalTtgRed057058Choices(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&x.targetUid===a.targetUid))
  throw new Error('057/058 target must be another own character or declined');
 const r=structuredClone(s),pl=r.players[q.player],before=inventory(s.players[q.player]);
 if(a.targetUid){
  const target=face(pl).find(c=>c.uid===a.targetUid);
  if(q.id==='TTG-1-057'){
   target.extraImpactNullUntilOwnStartTurnCount=Math.max(
    target.extraImpactNullUntilOwnStartTurnCount||0,(pl.turnCount||0)+1);
  }else{
   const b=contains(target,'シモン')?1500:1000;
   target.currentBp=(target.currentBp??TTG_BY_ID[target.cardId].bp)+b;
   target.buffs??=[];target.buffs.push({bp:b,turn:s.turn,until:'endTurn'});
  }
 }
 r.pending=null;r.log??=[];
 r.log.push({type:'ttgRed057058Entry',player:q.player,uid:q.uid,targetUid:a.targetUid});
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('057/058 UID conservation');
 return r;
}
export function ttgRed057ImpactNull(s,p,c){
 return c?.cardId==='TTG-1-057'||(
 c?.extraImpactNullUntilOwnStartTurnCount!=null&&
 (s.players[p].turnCount||0)<c.extraImpactNullUntilOwnStartTurnCount);
}
export function expireTtgRed057GrantedNullAtOwnStart(s,p){
 const r=structuredClone(s),pl=r.players[p];
 for(const c of face(pl))if(c.extraImpactNullUntilOwnStartTurnCount!=null&&
   (pl.turnCount||0)>=c.extraImpactNullUntilOwnStartTurnCount)delete c.extraImpactNullUntilOwnStartTurnCount;
 return r;
}
