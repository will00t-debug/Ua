// UA56BT/TTG-1-028 Gurren Lagann normal RAID (official 2026 printed text).
// Raid trigger from life is deliberately a separate, unimplemented pathway.
// Q2260: a front-line 004 Viral can add a simultaneous Raid response; until
// ordered-effect handling exists, block that unimplemented crossing instead
// of silently losing a player-triggered optional ability.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from './ttg-energy-snapshot.mjs';

const plField=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const nameOf=c=>c?.nameJa??TTG_BY_ID[c?.cardId]?.nameJa;
const validBase=c=>!!c&&['シモン','ヴィラル'].includes(nameOf(c))&&!(c.stack||[]).length&&!(c.under||[]).length;
const physicalIds=c=>[c.uid,...(c.stack||[]).flatMap(physicalIds),...(c.under||[]).flatMap(physicalIds)];
const allIds=pl=>[...pl.hand,...pl.deck,...pl.life,...pl.outside,...(pl.removed||[]),...plField(pl).map(x=>x.card)].flatMap(physicalIds).sort();

export function legalTtgGreen028Raids(state,player){
 if(![0,1].includes(player)||state?.active!==player||state.phase!=='main'||
   state.pending||state.pendingTtgLife||state.pendingTtgTrigger)return [];
 const pl=state.players?.[player],printed=TTG_BY_ID['TTG-1-028'];
 if(!pl?.hand||!Array.isArray(pl.apCards)||!pl.front||!pl.energy||
   calculateTtgEnergyByColor(state,player).green<printed.energy||pl.apCards.filter(a=>a.ready).length<printed.ap)return [];
 // Without the simultaneous ability resolver a front-line 004 may not be skipped.
 if(pl.front.some(x=>x?.cardId==='TTG-1-004'))return [];
 const actions=[];
 for(const hand of pl.hand.filter(x=>x.cardId==='TTG-1-028')){
  for(const source of plField(pl).filter(x=>validBase(x.card))){
   const places=[{line:source.line,slot:source.slot}];
   if(source.line==='energy')for(let slot=0;slot<pl.front.length;slot++)
    if(!pl.front[slot])places.push({line:'front',slot});
   for(const {line,slot} of places)actions.push({
    type:'ttgGreen028Raid',player,handUid:hand.uid,baseUid:source.card.uid,
    line,slot,requiredAp:printed.ap
   });
  }
 }
 return actions;
}
export function dispatchTtgGreen028Raid(state,action){
 const {player,handUid,baseUid,line,slot,payApUids=[]}=action||{};
 const legal=legalTtgGreen028Raids(state,player).find(x=>
  x.handUid===handUid&&x.baseUid===baseUid&&x.line===line&&x.slot===slot);
 if(!legal||!Array.isArray(payApUids)||payApUids.length!==legal.requiredAp||
   new Set(payApUids).size!==payApUids.length)throw new Error('Illegal TTG 028 RAID / AP or base');
 const before=allIds(state.players[player]);
 if(before.length!==new Set(before).size)throw new Error('Duplicate physical cards before Raid');
 const result=spendTtgApCards(state,{player,apUids:payApUids,count:legal.requiredAp});
 const pl=result.players[player],i=pl.hand.findIndex(x=>x.uid===handUid);
 const old=plField(pl).find(x=>x.card.uid===baseUid);
 if(i<0||!old)throw new Error('RAID hand/base disappeared');
 const hand=pl.hand.splice(i,1)[0],base=old.card;
 pl[old.line][old.slot]=null;
 if(pl[line][slot])throw new Error('RAID destination already occupied');
 pl[line][slot]={...hand,ready:true,stack:[base],under:[],raidedTurn:state.turn,enteredTurn:state.turn};
 const after=allIds(pl);
 if(JSON.stringify(after)!==JSON.stringify(before))throw new Error('RAID 028 physical card conservation failed');
 result.pending={kind:'ttgGreen028Entry',player,uid:hand.uid,raidBaseUid:baseUid};
 result.log??=[];
 result.log.push({type:'ttgGreen028Raid',player,cardUid:hand.uid,baseUid,line,slot});
 return withTtgDerivedEnergy(result,player);
}
export function legalTtgGreen028EntryChoices(state){
 const q=state?.pending;
 if(q?.kind!=='ttgGreen028Entry'||![0,1].includes(q.player))return [];
 const pl=state.players[q.player];
 if(!plField(pl).some(x=>x.card.uid===q.uid&&x.card.cardId==='TTG-1-028'))return [];
 // Optional target. DRAW 1 is mandatory, but resolved after this choice.
 const base={type:'ttgGreen028Entry',player:q.player,uid:q.uid};
 const opp=state.players[1-q.player];
 const targets=opp.front.filter(x=>x&&!x.cannotBeChosen&&!x.protectedFromEffects);
 return [...targets.map(x=>({...base,targetUid:x.uid})),{...base,targetUid:null}];
}
export function resolveTtgGreen028Entry(state,{player,uid,targetUid=null}={}){
 const q=state?.pending,options=legalTtgGreen028EntryChoices(state);
 if(q?.player!==player||q.uid!==uid||!options.some(x=>x.targetUid===targetUid))
  throw new Error('028 pending optional enemy front target required');
 const result=structuredClone(state),pl=result.players[player];
 if(targetUid){
  const target=result.players[1-player].front.find(x=>x?.uid===targetUid);
  if(!target)throw new Error('RAID target lost');
  target.ttg028AttackLocks??=[];
  target.ttg028AttackLocks.push({byPlayer:player,expiresOnOwnTurnCount:pl.turnCount+1,sourceUid:uid});
 }
 result.pending=null;
 if(pl.deck.length)pl.hand.push(pl.deck.shift());
 else{result.status='finished';result.winner=1-player;result.endReason='requiredDrawEmpty';}
 result.log??=[];
 result.log.push({type:'ttgGreen028EntryResolved',player,uid,targetUid,drawn:result.endReason!=='requiredDrawEmpty'});
 return withTtgDerivedEnergy(result,player);
}
export function canTtgGreen028Attack(state,player,card){
 if(![0,1].includes(player)||!card)throw new Error('Invalid 028 attack legality query');
 return !(card.ttg028AttackLocks||[]).some(lock=>
  state.players?.[lock.byPlayer]?.turnCount<lock.expiresOnOwnTurnCount);
}
export function resolveTtgGreen028Start(state,player){
 if(![0,1].includes(player))throw new Error('Invalid 028 expiration owner');
 const result=structuredClone(state);
 for(const pl of result.players)for(const {card} of plField(pl)){
  if(!card.ttg028AttackLocks)continue;
  card.ttg028AttackLocks=card.ttg028AttackLocks.filter(lock=>
   !(lock.byPlayer===player&&result.players[player].turnCount>=lock.expiresOnOwnTurnCount));
  if(!card.ttg028AttackLocks.length)delete card.ttg028AttackLocks;
 }
 return result;
}
