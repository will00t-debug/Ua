// UA56BT safe incremental RAID actions. Card-specific entry effects must be
// implemented before adding more IDs to this allowlist. This module intentionally
// does not claim all official Raid chains are supported.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
import {canDeployTtgCard} from './ttg-actions.mjs';

export const TTG_RAID_ENTRY_CARD_IDS=Object.freeze(['TTG-1-071']);
// "Entry" means only physical RAID transition; life trigger and all combat effects
// still require separate official-ruling verification.
const allowed=new Set(TTG_RAID_ENTRY_CARD_IDS);
const isPlayer=p=>p===0||p===1;
const ownField=(pl)=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const printedName=c=>c?.nameJa??c?.name??TTG_BY_ID[c?.cardId]?.nameJa;
const physicalIds=c=>[c.uid,...(c.stack||[]).flatMap(physicalIds),...(c.under||[]).flatMap(physicalIds)];
const hasUniqueUids=cards=>cards.every(Boolean)&&new Set(cards).size===cards.length;
const canRaidBase=(raidId,base)=>{
 if(!base)return false;
 if(raidId==='TTG-1-071')return printedName(base)==='キタン'&&!base.stack?.length;
 return false;
};
// Enumerate legal source / base / destination tuples, not just a yes/no.
// No occupied destination is ever silently displaced by a RAID.
export function legalTtgRaidEntries(state,player){
 if(!isPlayer(player)||state?.phase!=='main'||state.active!==player||state.pending||state.pendingTtgTrigger)return [];
 const pl=state.players?.[player];
 if(!pl||!Array.isArray(pl.hand)||!Array.isArray(pl.apCards))return [];
 const actions=[];
 for(const hand of pl.hand){
  if(!allowed.has(hand.cardId))continue;
  const printed=TTG_BY_ID[hand.cardId];
  const total=pl.energyProduced?.[printed.color];
  if(!Number.isFinite(total)||total<printed.energy)continue;
  if(pl.apCards.filter(c=>c.ready).length<printed.ap)continue;
  if(!canDeployTtgCard(pl,hand))continue;
  for(const base of ownField(pl).filter(x=>canRaidBase(hand.cardId,x.card))){
   const places=[{line:base.line,slot:base.slot}];
   if(base.line==='energy')for(let slot=0;slot<pl.front.length;slot++){
    if(!pl.front[slot])places.push({line:'front',slot});
   }
   for(const pos of places)actions.push({
    type:'raidTtg',player,handUid:hand.uid,cardId:hand.cardId,
    baseUid:base.card.uid,line:pos.line,slot:pos.slot,
    requiredAp:printed.ap
   });
  }
 }
 return actions;
}
export function dispatchTtgRaidEntry(state,{player,handUid,baseUid,line,slot,payApUids=[]}={}){
 if(!isPlayer(player)||!Array.isArray(payApUids))throw new Error('Invalid RAID action');
 const match=legalTtgRaidEntries(state,player).find(a=>
  a.handUid===handUid&&a.baseUid===baseUid&&a.line===line&&a.slot===slot);
 if(!match)throw new Error('Not a legal RAID base, destination, energy or timing');
 if(payApUids.length!==match.requiredAp||new Set(payApUids).size!==payApUids.length)
  throw new Error('Invalid physical AP payment');
 // Validation runs before the first mutation, including AP active checks.
 const paid=spendTtgApCards(state,{player,apUids:payApUids,count:match.requiredAp});
 const pl=paid.players[player];
 const original=ownField(pl).find(x=>x.card.uid===baseUid);
 const h=pl.hand.findIndex(c=>c.uid===handUid);
 if(!original||h<0)throw new Error('RAID source vanished');
 const handCard=pl.hand[h],base=original.card;
 const before=[...ownField(pl).flatMap(x=>physicalIds(x.card)),...pl.hand.flatMap(physicalIds)];
 if(!hasUniqueUids(before)||base.under?.length)throw new Error('Unrecognized RAID pile or duplicated UID');
 const raid={
  ...handCard,ready:true,stack:[base],under:[],raidedTurn:state.turn,
  enteredTurn:state.turn
 };
 pl.hand.splice(h,1);
 pl[original.line][original.slot]=null;
 if(pl[line][slot])throw new Error('RAID destination occupied');
 pl[line][slot]=raid;
 const after=[...ownField(pl).flatMap(x=>physicalIds(x.card)),...pl.hand.flatMap(physicalIds)];
 if(before.length!==after.length||new Set(before).size!==new Set(after).size||
    before.some(uid=>!after.includes(uid)))throw new Error('Physical card conservation failure');
 paid.raidNamesThisTurn=[...(paid.raidNamesThisTurn||[]),TTG_BY_ID[handCard.cardId].nameJa];
 paid.ttgRaidOccurredTurn??={};paid.ttgRaidOccurredTurn[player]=state.turn;
 paid.raidCountThisTurn=(paid.raidCountThisTurn||0)+1;
 paid.log??=[];
 paid.log.push({type:'ttgRaidEntered',player,uid:raid.uid,cardId:raid.cardId,
  baseUid,line,slot,ready:true,apPaid:match.requiredAp});
 return paid;
}
