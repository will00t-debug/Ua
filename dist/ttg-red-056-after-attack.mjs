// Official TTG-1-056 Q2291/Q2292: attack END trigger after all battle,
// and after the last life trigger is checked in direct damage case.
// No fabricated AP is charged for a Raid performed by a card effect.
import {TTG_BY_ID} from './ttg-builder.mjs';
const rows=p=>[...(p.front||[]),...(p.energy||[])].filter(Boolean);
const physical=c=>[c.uid,...(c.stack||[]).flatMap(physical),...(c.under||[]).flatMap(physical)];
const inventory=p=>[...p.hand,...p.deck,...p.life,...p.outside,...(p.removed||[]),...rows(p)].flatMap(physical).sort();
const nm=c=>TTG_BY_ID[c?.cardId]?.nameJa;
const nia=p=>rows(p).some(c=>nm(c)==='ニア');
const kamina=p=>rows(p).some(c=>nm(c)==='カミナ'||(c.stack||[]).some(x=>nm(x)==='カミナ'));
const simon=p=>rows(p).some(c=>nm(c)==='シモン'||(c.stack||[]).some(x=>nm(x)==='シモン'));
export function legalRed056End(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed056AfterAttack')return [];
 const p=q.player,pl=s.players[p],source=pl.front.find(c=>c?.uid===q.uid);
 const base={type:'ttgRed056End',player:p,uid:q.uid};
 const actions=[{...base,mode:'decline'}];
 if(!source||source.cardId!=='TTG-1-056'||s.active!==p)return actions;
 const raided=new Set(s.raidNamesThisTurn||[]);
 for(const card of pl.hand){
  const d=TTG_BY_ID[card.cardId];
  if(d?.color!=='red'||!['ラガン','グレンラガン'].includes(d.nameJa)||raided.has(d.nameJa))continue;
  if(d.nameJa==='グレンラガン'&&card.cardId==='TTG-1-073'&&!(simon(pl)&&kamina(pl)))continue;
  if(card.cardId==='TTG-1-074'&&!nia(pl))continue;
  if(!['TTG-1-073','TTG-1-074','TTG-1-076'].includes(card.cardId))continue;
  actions.push({...base,mode:'raid',handUid:card.uid});
 }
 return actions;
}
export function resolveRed056End(s,a={}){
 if(!legalRed056End(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&
  x.mode===a.mode&&x.handUid===a.handUid))throw new Error('056 after attack RAID illegal (Q2291)');
 const r=structuredClone(s),q=r.pending,p=r.players[q.player],before=inventory(s.players[q.player]);
 r.pending=null;
 if(a.mode==='decline')return r;
 const i=p.front.findIndex(x=>x?.uid===q.uid),handIndex=p.hand.findIndex(x=>x.uid===a.handUid);
 if(i<0||handIndex<0)throw new Error('056 Raid target departed before end of attack');
 const source=p.front[i],top=p.hand.splice(handIndex,1)[0];
 p.front[i]={...top,stack:[source],under:[],enteredTurn:s.turn,raidedTurn:s.turn,ready:true};
 const raid=p.front[i];
 raid.currentBp=(raid.currentBp??TTG_BY_ID[raid.cardId].bp)+1000;
 raid.buffs??=[];raid.buffs.push({bp:1000,turn:s.turn,until:'endTurn'});
 r.raidNamesThisTurn=[...(r.raidNamesThisTurn||[]),nm(top)];
 r.raidCountThisTurn=(r.raidCountThisTurn||0)+1;
 r.raidCountByPlayerTurn??={};
 const seen=r.raidCountByPlayerTurn[q.player];
 r.raidCountByPlayerTurn[q.player]={turn:s.turn,count:seen?.turn===s.turn?seen.count+1:1};
 r.ttgRaidOccurredTurn??={};r.ttgRaidOccurredTurn[q.player]=s.turn;
 const step=top.cardId==='TTG-1-076'?'entry076':'entry074';
 r.pending={kind:'ttgRedRaidQueue',player:q.player,raidUid:top.uid,steps:[step]};
 if(JSON.stringify(inventory(p))!==JSON.stringify(before))throw new Error('056 RAID lost physical cards');
 return r;
}
