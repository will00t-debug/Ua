// UA56BT/TTG-1-075/076/077 printed red rules.
// 075 unique effects by count of on-field GUNMEN; 076 RAID look-two and
// REST draw/discard; 077 field on-entry recover GUNMEN.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor} from './ttg-energy-snapshot.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
const rows=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).map((c,slot)=>({c,line,slot})).filter(x=>x.c));
const name=c=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa;
const gunmen=c=>(TTG_BY_ID[c?.cardId]?.traits||[]).some(x=>x.includes('ガンメン'));
const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
const ids=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...rows(p).map(x=>x.c)].flatMap(deep).sort();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const choicesFor=['bp','impactNull','doubleBlock'];
const ownMain=(s,p)=>[0,1].includes(p)&&s.active===p&&s.phase==='main'&&!s.pending&&!s.pendingTtgLife;
export function legalRed075(s,p){
 if(!ownMain(s,p))return [];
 const pl=s.players[p];
 if(!rows(pl).some(x=>name(x.c)==='ニア'))return [];
 const count=rows(pl).filter(x=>gunmen(x.c)).length;
 if(count===0)return [];
 const available=[];
 for(const a of choicesFor)for(const b of choicesFor)for(const c of choicesFor){
  const set=[a,b,c];for(let n=1;n<=Math.min(count,3);n++){
   const selected=set.slice(0,n);
   if(new Set(selected).size===n&&!available.some(x=>same(x,selected)))available.push(selected);
  }
 }
 return rows(pl).filter(x=>x.c.cardId==='TTG-1-075'&&x.c.red075UsedTurn!==s.turn)
  .flatMap(x=>[{type:'ttgRed075Main',player:p,uid:x.c.uid,effects:[]},
   ...available.map(effects=>({type:'ttgRed075Main',player:p,uid:x.c.uid,effects}))]);
}
export function resolveRed075(s,a={}){
 if(!legalRed075(s,a.player).some(x=>x.type===a.type&&x.uid===a.uid&&same(x.effects,a.effects)))
  throw new Error('075 one per on-field Gunmen, no repeated chosen effect');
 const r=structuredClone(s),p=r.players[a.player],card=rows(p).find(x=>x.c.uid===a.uid).c;
 const before=ids(s.players[a.player]);
 card.red075UsedTurn=s.turn;
 for(const effect of a.effects){
  if(effect==='bp'){
   card.currentBp=(card.currentBp??TTG_BY_ID[card.cardId].bp)+1000;
   card.buffs??=[];card.buffs.push({bp:1000,turn:s.turn,until:'endTurn'});
  }else if(effect==='impactNull')card.red075NullUntilOwnTurnCount=(p.turnCount||0)+1;
  else if(effect==='doubleBlock'){
   card.doubleBlockUntilOwnStartTurnCount=(p.turnCount||0)+1;
   card.doubleBlockUsedTurn=null;
  }
 }
 if(!same(ids(p),before))throw new Error('075 card conservation');
 return r;
}
export function red075ImpactNull(s,p,c){
 return c?.cardId==='TTG-1-075'&&c.red075NullUntilOwnTurnCount!=null&&
  (s.players[p].turnCount||0)<c.red075NullUntilOwnTurnCount;
}
export function expireRed075OwnStart(s,p){
 const r=structuredClone(s),pl=r.players[p];
 for(const x of rows(pl))if(x.c.red075NullUntilOwnTurnCount!=null&&
  (pl.turnCount||0)>=x.c.red075NullUntilOwnTurnCount)delete x.c.red075NullUntilOwnTurnCount;
 return r;
}
export function legalRed076Raids(s,p){
 if(!ownMain(s,p))return [];
 const pl=s.players[p],ap=pl.apCards.filter(c=>c.ready);
 const needed=pl.red080DiscountUntilTurn===s.turn?0:1;
 if(calculateTtgEnergyByColor(s,p).red<2||ap.length<needed)return [];
 return pl.hand.filter(c=>c.cardId==='TTG-1-076').flatMap(h=>
  rows(pl).filter(x=>name(x.c)==='シモン'&&!x.c.stack?.length&&!x.c.under?.length).flatMap(x=>{
   const pos=[{line:x.line,slot:x.slot}];
   if(x.line==='energy')for(let slot=0;slot<4;slot++)if(!pl.front[slot])pos.push({line:'front',slot});
   return pos.map(a=>({type:'ttgRed076Raid',player:p,handUid:h.uid,baseUid:x.c.uid,
    line:a.line,slot:a.slot,requiredAp:needed}));
  }));
}
export function resolveRed076Raid(s,a={}){
 const choice=legalRed076Raids(s,a.player).find(x=>x.type===a.type&&x.handUid===a.handUid&&x.baseUid===a.baseUid&&
  x.line===a.line&&x.slot===a.slot);
 if(!choice||!Array.isArray(a.payApUids)||a.payApUids.length!==choice.requiredAp)
  throw new Error('076 requires proper Simon Raid and 1 paid AP');
 const before=ids(s.players[a.player]);
 const r=spendTtgApCards(s,{player:a.player,apUids:a.payApUids,count:choice.requiredAp}),pl=r.players[a.player];
 const loc=rows(pl).find(x=>x.c.uid===a.baseUid),idx=pl.hand.findIndex(c=>c.uid===a.handUid);
 if(!loc||idx<0)throw new Error('076 raid source left field');
 const top=pl.hand.splice(idx,1)[0];pl[loc.line][loc.slot]=null;
 if(pl[a.line][a.slot])throw new Error('076 destination occupied');
 pl[a.line][a.slot]={...top,ready:true,stack:[loc.c],under:[],enteredTurn:s.turn,raidedTurn:s.turn};
 if(pl.red080DiscountUntilTurn===s.turn)delete pl.red080DiscountUntilTurn;
 r.raidNamesThisTurn=[...(r.raidNamesThisTurn||[]),TTG_BY_ID[top.cardId].nameJa];
 r.ttgRaidOccurredTurn??={};r.ttgRaidOccurredTurn[a.player]=s.turn;
 r.raidCountThisTurn=(r.raidCountThisTurn||0)+1;
 r.raidCountByPlayerTurn??={};
 const count=r.raidCountByPlayerTurn[a.player];r.raidCountByPlayerTurn[a.player]={turn:s.turn,count:count?.turn===s.turn?count.count+1:1};
 r.pending={kind:'ttgRed076Look',player:a.player,uid:top.uid,
  revealed:pl.deck.slice(0,2).map(c=>c.uid)};
 if(!same(ids(pl),before))throw new Error('076 Raid UID mismatch');
 return r;
}
export function legalRed076Look(s){
 const q=s?.pending;if(q?.kind!=='ttgRed076Look')return [];
 const b={type:'ttgRed076Look',player:q.player,uid:q.uid};
 return q.revealed.length? q.revealed.map(takeUid=>({...b,takeUid})):[{...b,takeUid:null}];
}
export function resolveRed076Look(s,a={}){
 const q=s?.pending;
 if(!legalRed076Look(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&x.takeUid===a.takeUid))
  throw new Error('076 must choose exactly one card from the real top two');
 const r=structuredClone(s),pl=r.players[q.player],before=ids(s.players[q.player]);
 if(!same(pl.deck.slice(0,q.revealed.length).map(c=>c.uid),q.revealed))
  throw new Error('076 deck changed during private look');
 const reveal=pl.deck.splice(0,q.revealed.length);
 for(const c of reveal)(c.uid===a.takeUid?pl.hand:pl.outside).push(c);
 r.pending=null;if(!same(ids(pl),before))throw new Error('076 look UID mismatch');return r;
}
export function legalRed076Main(s,p){
 if(!ownMain(s,p))return [];
 const pl=s.players[p];
 return rows(pl).filter(x=>x.c.cardId==='TTG-1-076'&&x.c.ready&&pl.deck.length).map(x=>({type:'ttgRed076Main',player:p,uid:x.c.uid}));
}
export function resolveRed076Main(s,a={}){
 if(!legalRed076Main(s,a.player).some(x=>x.type===a.type&&x.uid===a.uid))
  throw new Error('076 REST draw1/discard1 main requires deck and ACTIVE source');
 const r=structuredClone(s),pl=r.players[a.player],before=ids(s.players[a.player]);
 rows(pl).find(x=>x.c.uid===a.uid).c.ready=false;
 pl.hand.push(pl.deck.shift());r.pending={kind:'ttgRed076Discard',player:a.player,uid:a.uid};
 if(!same(ids(pl),before))throw new Error('076 main drawn UID loss');
 return r;
}
export function legalRed076Discard(s){
 const q=s?.pending;if(q?.kind!=='ttgRed076Discard')return [];
 return s.players[q.player].hand.map(c=>({type:'ttgRed076Discard',player:q.player,uid:q.uid,discardUid:c.uid}));
}
export function resolveRed076Discard(s,a={}){
 const q=s?.pending;if(!legalRed076Discard(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&x.discardUid===a.discardUid))
  throw new Error('076 must discard exactly one hand card after drawing');
 const r=structuredClone(s),pl=r.players[q.player],before=ids(s.players[q.player]);
 pl.outside.push(pl.hand.splice(pl.hand.findIndex(c=>c.uid===a.discardUid),1)[0]);r.pending=null;
 if(!same(ids(pl),before))throw new Error('076 discard UID loss');return r;
}
export function legalRed077Fields(s,p){
 if(!ownMain(s,p)||calculateTtgEnergyByColor(s,p).red<4)return [];
 const pl=s.players[p];if(!pl.apCards.some(x=>x.ready))return [];
 return pl.hand.filter(c=>c.cardId==='TTG-1-077').flatMap(c=>
  pl.energy.flatMap((occupant,slot)=>occupant?[]:[{type:'ttgRed077Play',player:p,handUid:c.uid,slot,requiredAp:1}]));
}
export function resolveRed077Field(s,a={}){
 if(!legalRed077Fields(s,a.player).some(x=>x.type===a.type&&x.handUid===a.handUid&&x.slot===a.slot)||
  !Array.isArray(a.payApUids)||a.payApUids.length!==1)
  throw new Error('077 needs empty energy field slot and 1 paid AP');
 const before=ids(s.players[a.player]);
 const r=spendTtgApCards(s,{player:a.player,apUids:a.payApUids,count:1}),pl=r.players[a.player];
 const i=pl.hand.findIndex(c=>c.uid===a.handUid);
 pl.energy[a.slot]={...pl.hand.splice(i,1)[0],ready:false,enteredTurn:s.turn};
 r.pending={kind:'ttgRed077Recover',player:a.player,uid:a.handUid};
 if(!same(ids(pl),before))throw new Error('077 physical field UID mismatch');
 return r;
}
export function legalRed077Recover(s){
 const q=s?.pending;if(q?.kind!=='ttgRed077Recover')return [];
 const b={type:'ttgRed077Recover',player:q.player,uid:q.uid};
 return [{...b,recoverUid:null},...s.players[q.player].outside.filter(gunmen).map(c=>({...b,recoverUid:c.uid}))];
}
export function resolveRed077Recover(s,a={}){
 const q=s?.pending;if(!legalRed077Recover(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&x.recoverUid===a.recoverUid))
  throw new Error('077 optional Gunmen recovery target not in outside');
 const r=structuredClone(s),pl=r.players[q.player],before=ids(s.players[q.player]);
 if(a.recoverUid!=null){
  const i=pl.outside.findIndex(c=>c.uid===a.recoverUid);pl.hand.push(pl.outside.splice(i,1)[0]);
 }
 r.pending=null;if(!same(ids(pl),before))throw new Error('077 UID loss');return r;
}
