// TTG-1-012 Simon (UA56BT, official Q2264-Q2267).
// Three separate mandatory stages: look top6 + choose Nia/energy>=8,
// sideline ONE OR MORE hand cards (unless hand is empty) and choose AP ready
// or optional <=one opponent front retirement if total printed costs >=15.
// Action sequence is atomic per step; no hidden draw or auto target.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
const field=p=>[...(p.front||[]),...(p.energy||[])].filter(Boolean);
const owns=(s,p)=>[0,1].includes(p)&&!!s?.players?.[p];
const cost=c=>TTG_BY_ID[c.cardId]?.energy;
const name=c=>c.nameJa||TTG_BY_ID[c.cardId]?.nameJa;
const eligible=c=>name(c)==='ニア'||cost(c)>=8;
const physical=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...field(p)]
 .flatMap(function flatten(c){return [c.uid,...(c.stack||[]).flatMap(flatten),...(c.under||[]).flatMap(flatten)]}).sort();
const validOrder=(a,b)=>a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
const energy=(s,p)=>Object.values(calculateTtgEnergyByColor(s,p)).reduce((a,b)=>a+b,0);
export function legalGreen012Plays(s,p){
 if(!owns(s,p)||s.active!==p||s.phase!=='main'||s.pending||s.pendingTtgLife)return [];
 const pl=s.players[p];
 if(energy(s,p)<6||pl.apCards.filter(x=>x.ready).length<2)return [];
 return pl.hand.filter(c=>c.cardId==='TTG-1-012').flatMap(c=>pl.front.flatMap((x,slot)=>x?[]:[
  {type:'green012Play',player:p,handUid:c.uid,slot,requiredAp:2}
 ]));
}
export function resolveGreen012Play(s,{player,handUid,slot,payApUids=[]}={}){
 const can=legalGreen012Plays(s,player).some(x=>x.handUid===handUid&&x.slot===slot);
 if(!can||!Array.isArray(payApUids)||payApUids.length!==2||new Set(payApUids).size!==2)
  throw new Error('012 requires GREEN6, two ACTIVE AP and empty Front position');
 const before=physical(s.players[player]);
 const r=spendTtgApCards(s,{player,apUids:payApUids,count:2}),pl=r.players[player],i=pl.hand.findIndex(c=>c.uid===handUid);
 if(i<0||pl.front[slot])throw new Error('012 invalid hand/slot after paying');
 pl.front[slot]={...pl.hand.splice(i,1)[0],ready:true,enteredTurn:s.turn};
 r.pending={kind:'green012Search',player,uid:handUid};
 if(JSON.stringify(physical(pl))!==JSON.stringify(before))throw new Error('012 cards vanished at entry');
 return withTtgDerivedEnergy(r,player);
}
export function legalGreen012Search(s){
 const q=s?.pending;
 if(q?.kind!=='green012Search')return [];
 const pl=s.players[q.player],top=pl.deck.slice(0,6);
 if(!pl.front.some(x=>x?.uid===q.uid&&x.cardId==='TTG-1-012'))return [];
 return [{type:'green012Search',player:q.player,uid:q.uid,
  revealed:top.map(c=>c.uid),candidates:top.filter(eligible).map(c=>c.uid)}];
}
export function resolveGreen012Search(s,{player,uid,takeUid=null,bottomOrderUids=[]}={}){
 const [choice]=legalGreen012Search(s);
 if(!choice||choice.player!==player||choice.uid!==uid||
    takeUid!==null&&!choice.candidates.includes(takeUid))
  throw new Error('012 top six allows only Nia or printed cost >=8');
 const expected=choice.revealed.filter(x=>x!==takeUid);
 if(!validOrder(expected,bottomOrderUids))throw new Error('012 bottom order must contain exactly remaining six cards');
 const r=structuredClone(s),pl=r.players[player],before=physical(pl),top=pl.deck.splice(0,choice.revealed.length);
 if(takeUid){
  const i=top.findIndex(x=>x.uid===takeUid);pl.hand.push(top.splice(i,1)[0]);
 }
 pl.deck.push(...bottomOrderUids.map(uid=>top.find(c=>c.uid===uid)));
 r.pending={kind:'green012Discard',player,uid};
 if(JSON.stringify(physical(pl))!==JSON.stringify(before))throw new Error('012 search physical card violation');
 return r;
}
export function legalGreen012Discards(s){
 const q=s?.pending;
 if(q?.kind!=='green012Discard')return [];
 const pl=s.players[q.player];
 return [{type:'green012Discard',player:q.player,uid:q.uid,handUids:pl.hand.map(c=>c.uid)}];
}
export function resolveGreen012Discard(s,{player,uid,discardUids=[],mode='readyAP',apUid=null,targetUid=null}={}){
 const [choice]=legalGreen012Discards(s);
 if(!choice||choice.uid!==uid||choice.player!==player||!Array.isArray(discardUids)||
    new Set(discardUids).size!==discardUids.length||!discardUids.every(x=>choice.handUids.includes(x))||
    (choice.handUids.length&&discardUids.length===0))throw new Error('Q2266: one or more hand cards must be sidelined if possible');
 const r=structuredClone(s),pl=r.players[player],before=physical(pl),sum=discardUids.reduce((n,id)=>n+cost(pl.hand.find(c=>c.uid===id)),0);
 if(!Number.isFinite(sum))throw new Error('Unknown discarded printed cost');
 if(mode==='readyAP'){
  if(targetUid!==null||!pl.apCards.some(c=>c.uid===apUid))throw new Error('012 ready one OWN AP');
 }else if(mode==='retire'){
  if(sum<15)throw new Error('012 needs 15 total printed cost for retirement option');
  if(apUid!==null)throw new Error('Cannot ready AP and retire in one choice');
  if(targetUid!==null&&!s.players[1-player].front.some(c=>c?.uid===targetUid&&!c.cannotBeChosen&&!c.protectedFromEffects))
   throw new Error('012 retirement target must be opponent Front');
 }else throw new Error('012 select AP or 15+ cost alternate');
 for(const id of discardUids){
  const i=pl.hand.findIndex(c=>c.uid===id);pl.outside.push(pl.hand.splice(i,1)[0]);
 }
 if(mode==='readyAP')pl.apCards.find(c=>c.uid===apUid).ready=true;
 else if(targetUid!==null){
  const opp=r.players[1-player],i=opp.front.findIndex(c=>c?.uid===targetUid);
  if(i<0)throw new Error('012 opponent left before retirement');
  const c=opp.front[i];opp.front[i]=null;opp.outside.push(c);
 }
 r.pending=null;
 if(JSON.stringify(physical(pl))!==JSON.stringify(before))throw new Error('012 discard conservation');
 r.log??=[];r.log.push({type:'green012Entry',player,uid,discardUids,mode,apUid,targetUid});
 return withTtgDerivedEnergy(r,player);
}
export function legalGreen012Double(s,p){
 if(!owns(s,p)||s.active!==p||s.phase!=='main'||s.pending||s.pendingTtgLife||energy(s,p)<8||
   s.players[p].green012UsedTurn===s.turn)return [];
 return s.players[p].front.filter(x=>x?.cardId==='TTG-1-012'&&x.enteredTurn!==s.turn)
  .map(c=>({type:'green012Double',player:p,uid:c.uid}));
}
export function resolveGreen012Double(s,{player,uid}={}){
 if(!legalGreen012Double(s,player).some(x=>x.uid===uid))throw new Error('Q2267: 012 cannot double entering turn or twice per NAME');
 const r=structuredClone(s),pl=r.players[player];
 pl.energyDoublings=(pl.energyDoublings||0)+1;
 pl.green012UsedTurn=s.turn;pl.green012DoublingExpire=s.turn;
 return withTtgDerivedEnergy(r,player);
}
export function resolveGreen012TurnEnd(s){
 const r=structuredClone(s);
 for(const pl of r.players)if(pl.green012DoublingExpire===s.turn){
  pl.energyDoublings=Math.max(0,(pl.energyDoublings||0)-1);
  delete pl.green012DoublingExpire;
 }
 return r;
}
