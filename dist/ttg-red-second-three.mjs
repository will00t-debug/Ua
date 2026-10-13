// UA56BT/TTG-1-045, -046, -047. 045/046 official Q2286-Q2290.
// 047 uses the existing combat hook in ttg-core-match.mjs (+1500 on first own attack).
// No website flags are turned on until the red RAID + UI lifecycle is finished.
import {TTG_BY_ID} from './ttg-builder.mjs';
const field=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).filter(Boolean));
const printed=c=>TTG_BY_ID[c?.cardId];
const uidList=c=>[c.uid,...(c.stack||[]).flatMap(uidList),...(c.under||[]).flatMap(uidList)];
const inventory=p=>[...p.hand,...p.deck,...p.life,...p.outside,...(p.removed||[]),...field(p)].flatMap(uidList).sort();
const frontline=(s,p,uid)=>s.players?.[p]?.front?.find(c=>c?.uid===uid);
const ally=(c)=>printed(c)?.traits?.includes('大グレン団');
const containsBase=(c,uid)=>!!c&&((c.uid===uid&&c.cardId==='TTG-1-045')||(c.stack||[]).some(x=>containsBase(x,uid)));
const canMain=(s,p)=>[0,1].includes(p)&&s?.active===p&&s.phase==='main'&&!s.pending&&!s.pendingTtgLife;
const onceTag=(s,p,raidUid)=>s.turn+':'+p+':'+raidUid;
// Red 045 is a triggered effect that must be queued after the physical Raid.
// Q2286: even if an intermediate Gurren Raid top moved facedown in a chain,
// Kamina 045 as the underlying base still triggers.
export function beginTtgRed045Raided(s,{player,raidUid,baseUid}={}){
 if(!canMain(s,player)||s.red045ResolvedRaids?.[onceTag(s,player,raidUid)])
  throw new Error('045 cannot enter trigger queue');
 const raid=field(s.players[player]).find(x=>x.uid===raidUid);
 if(!raid||raid.raidedTurn!==s.turn||!containsBase(raid,baseUid)||raid.uid===baseUid)
  throw new Error('045 must be the underlying base of a Raid this turn');
 const r=structuredClone(s);
 r.pending={kind:'ttgRed045Raided',player,raidUid,baseUid};
 return r;
}
export function legalTtgRed045Choices(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed045Raided')return [];
 const b={type:'ttgRed045Choice',player:q.player,raidUid:q.raidUid,baseUid:q.baseUid};
 const targets=field(s.players[q.player]).filter(ally).map(x=>x.uid);
 return [{...b,targetUid:null},...targets.map(targetUid=>({...b,targetUid}))];
}
export function resolveTtgRed045Choice(s,action={}){
 const q=s?.pending,choices=legalTtgRed045Choices(s);
 if(!choices.some(x=>x.type===action.type&&x.player===action.player&&
  x.raidUid===action.raidUid&&x.baseUid===action.baseUid&&x.targetUid===action.targetUid))
  throw new Error('Illegal 045 Raid target');
 const before=inventory(s.players[q.player]),r=structuredClone(s),pl=r.players[q.player];
 const raid=field(pl).find(c=>c.uid===q.raidUid);
 if(!raid||!containsBase(raid,q.baseUid))throw new Error('045 Raid no longer has original base');
 if(action.targetUid){
  const target=field(pl).find(c=>c.uid===action.targetUid);
  if(!target||!ally(target))throw new Error('045 requires own Team Dai-Gurren');
  target.currentBp=(target.currentBp??printed(target).bp)+1000;
  target.buffs??=[];target.buffs.push({bp:1000,turn:r.turn,until:'endTurn'});
 }
 if((raid.under||[]).some(c=>c.faceDown)){
  if(pl.deck.length)pl.hand.push(pl.deck.shift());
  else{r.status='finished';r.winner=1-q.player;r.endReason='requiredDrawEmpty';}
 }
 r.pending=null;r.red045ResolvedRaids??={};
 r.red045ResolvedRaids[onceTag(s,q.player,q.raidUid)]=true;
 r.log??=[];r.log.push({type:'ttgRed045RaidTriggered',player:q.player,raidUid:q.raidUid,
  buffedUid:action.targetUid??null});
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('045 changed physical card inventory');
 return r;
}
// Q2288: modes are distinct, Q2289: printed top-to-bottom order (ready then buff),
// Q2290: "ready" branch limited once across ALL Kamina 046 cards, buff may be
// chosen again by a different physical copy, but each card's turn-1 limits use.
function hadOwnRaidThisTurn(s,p){
 return s.ttgRaidOccurredTurn?.[p]===s.turn||
  field(s.players[p]).some(c=>c.raidedTurn===s.turn);
}
export function legalTtgRed046Main(s,p){
 if(!canMain(s,p)||!hadOwnRaidThisTurn(s,p))return [];
 const pl=s.players[p],readyAvailable=pl.red046ReadyUsedTurn!==s.turn,actions=[];
 for(const c of (pl.front||[]).filter(x=>x?.cardId==='TTG-1-046'&&x.red046ActivatedTurn!==s.turn)){
  const base={type:'ttgRed046Main',player:p,uid:c.uid};
  if(readyAvailable)actions.push({...base,mode:'ready',targetUid:null});
  for(const target of field(pl).filter(ally)){
   actions.push({...base,mode:'buff',targetUid:target.uid});
   if(readyAvailable)actions.push({...base,mode:'both',targetUid:target.uid});
  }
 }
 return actions;
}
export function resolveTtgRed046Main(s,action={}){
 const {player,uid,mode,targetUid}=action;
 if(!legalTtgRed046Main(s,player).some(o=>o.uid===uid&&o.mode===mode&&o.targetUid===targetUid))
  throw new Error('Illegal 046 mode, Q2288-Q2290 limit, source or target');
 const r=structuredClone(s),pl=r.players[player],self=frontline(r,player,uid);
 if(mode==='ready'||mode==='both'){
  self.ready=true;
  pl.red046ReadyUsedTurn=s.turn;
 }
 if(mode==='buff'||mode==='both'){
  const target=field(pl).find(x=>x.uid===targetUid);
  target.currentBp=(target.currentBp??printed(target).bp)+1000;
  target.buffs??=[];target.buffs.push({bp:1000,turn:s.turn,until:'endTurn'});
 }
 self.red046ActivatedTurn=s.turn;
 r.log??=[];r.log.push({type:'ttgRed046Main',player,uid,mode,targetUid});
 return r;
}
