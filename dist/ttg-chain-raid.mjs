// UA56BT Q2393-Q2395: physical multi-Raid upgrade operation.
// Exposed as a strictly scoped LAB action until each arrival effect has a
// complete resolver (entries are intentionally suspended, not auto-approved).
// The live game/app should not call this without a pending-effect UI.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';

const chain=new Map([
 ['TTG-1-027',{tops:['グレンラガン'],bases:['シモン','ヴィラル'],noSameTurn:false}],
 ['TTG-1-031',{tops:['アークグレンラガン'],bases:['シモン','ヴィラル'],noSameTurn:false}],
 ['TTG-1-032',{tops:['超銀河グレンラガン'],bases:['シモン','ヴィラル'],noSameTurn:true,unique:true}]
]);
const field=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const nameOf=c=>c?.nameJa||c?.name||TTG_BY_ID[c?.cardId]?.nameJa||null;
const uids=c=>c?[c.uid,...(c.stack||[]).flatMap(uids),...(c.under||[]).flatMap(uids)]:[];
export function legalTtgChainRaids(state,player){
 if(![0,1].includes(player)||state?.active!==player||state?.phase!=='main'||state.pending||state.pendingTtgTrigger)return [];
 const pl=state.players?.[player];if(!pl?.hand||!pl?.apCards)return [];
 const options=[];
 for(const card of pl.hand){
  const rule=chain.get(card.cardId);
  if(!rule)continue;
  const printed=TTG_BY_ID[card.cardId];
  if(pl.energyProduced?.[printed.color]<printed.energy||
     pl.apCards.filter(c=>c.ready).length<printed.ap)continue;
  if(rule.unique&&field(pl).some(x=>x.card.cardId===card.cardId))continue;
  for(const source of field(pl)){
   const prior=source.card;
   if(!rule.tops.includes(nameOf(prior))||prior.stack?.length!==1)continue;
   const base=prior.stack[0];
   if(!rule.bases.includes(nameOf(base))||base.stack?.length||base.under?.length)continue;
   if(rule.noSameTurn&&prior.raidedTurn===state.turn)continue;
   // Existing under cards must be physically distinct and facedown.
   if((prior.under||[]).some(x=>!x.faceDown))continue;
   const positions=[{line:source.line,slot:source.slot}];
   if(source.line==='energy')for(let slot=0;slot<pl.front.length;slot++)
    if(!pl.front[slot])positions.push({line:'front',slot});
   for(const pos of positions)options.push({
    type:'chainTtgRaid',player,handUid:card.uid,cardId:card.cardId,
    sourceUid:prior.uid,line:pos.line,slot:pos.slot,requiredAp:printed.ap
   });
  }
 }
 return options;
}
export function dispatchTtgChainRaid(state,{player,handUid,sourceUid,line,slot,payApUids=[]}={}){
 const option=legalTtgChainRaids(state,player).find(x=>
  x.handUid===handUid&&x.sourceUid===sourceUid&&x.line===line&&x.slot===slot);
 if(!option)throw new Error('Illegal special RAID / wrong existing top or turn');
 if(!Array.isArray(payApUids)||payApUids.length!==option.requiredAp||
    new Set(payApUids).size!==payApUids.length)throw new Error('Invalid RAID AP choice');
 const paid=spendTtgApCards(state,{player,apUids:payApUids,count:option.requiredAp});
 const pl=paid.players[player];
 const previous=field(pl).find(x=>x.card.uid===sourceUid);
 const i=pl.hand.findIndex(c=>c.uid===handUid);
 if(!previous||i<0)throw new Error('Physical source lost');
 const old=previous.card,newCard=pl.hand[i];
 const before=[...pl.hand.flatMap(uids),...field(pl).flatMap(x=>uids(x.card))];
 const extra=old.under||[];
 const oldTop={uid:old.uid,cardId:old.cardId,faceDown:true};
 const upgraded={
  ...newCard,ready:true,stack:[old.stack[0]],
  under:[...extra,oldTop],raidedTurn:state.turn,enteredTurn:state.turn
 };
 // Preserve the order of older facedown cards, append the just-converted top.
 pl.hand.splice(i,1);
 pl[previous.line][previous.slot]=null;
 if(pl[line][slot])throw new Error('New RAID destination cannot displace another card');
 pl[line][slot]=upgraded;
 const after=[...pl.hand.flatMap(uids),...field(pl).flatMap(x=>uids(x.card))];
 if(before.length!==after.length||new Set(before).size!==before.length||
    new Set(after).size!==after.length||
    before.some(uid=>!after.includes(uid)))throw new Error('RAID physical card conservation failed');
 paid.raidCountThisTurn=(paid.raidCountThisTurn||0)+1;
 paid.log??=[];
 paid.log.push({type:'ttgChainRaid',player,sourceUid,uid:upgraded.uid,
  faceDownAdded:oldTop.uid,faceDownCount:upgraded.under.length});
 // Critical: no card may resume play until the new card's mandatory/optional
 // on-entry text and other triggered abilities are actually resolved.
 paid.pending={kind:'ttgUnimplementedRaidEntry',player,cardId:newCard.cardId,
  uid:upgraded.uid,reason:'Arrival effects and ordering need the TTG effect resolver'};
 return paid;
}
