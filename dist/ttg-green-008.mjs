// UA56BT/TTG-1-008 Grapearl (official English/Japanese card list).
// Raid on any unpiled Team Dai-Gurren character, pay GREEN4 AP1,
// top ACTIVE. Draw 1 unconditionally. Gimmy base: IMPACT1 this turn.
// Darry base: draw 1 when its attack is not blocked this turn.
// GET life trigger already handled in green-life.mjs.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
const field=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const name=c=>c?.nameJa||TTG_BY_ID[c?.cardId]?.nameJa;
const isBase=c=>c&&TTG_BY_ID[c.cardId]?.type==='character'&&
 TTG_BY_ID[c.cardId]?.traits?.some(t=>String(t).includes('大グレン団'))&&
 !(c.stack||[]).length&&!(c.under||[]).length;
const ids=p=>{
 const expand=c=>[c.uid,...(c.stack||[]).flatMap(expand),...(c.under||[]).flatMap(expand)];
 return [...p.hand,...p.deck,...p.life,...p.outside,...(p.removed||[]),...field(p).map(x=>x.card)].flatMap(expand).sort();
};
export function legalGreen008Raids(state,player){
 if(![0,1].includes(player)||state?.active!==player||state?.phase!=='main'||
  state.pending||state.pendingTtgLife||state.pendingTtgTrigger)return [];
 const p=state.players?.[player];
 if(!p?.hand||!p.apCards||!p.front||!p.energy||p.apCards.every(x=>!x.ready)||
  calculateTtgEnergyByColor(state,player).green<4)return [];
 const options=[];
 for(const h of p.hand.filter(c=>c.cardId==='TTG-1-008')){
  for(const source of field(p).filter(x=>isBase(x.card))){
   const places=[{line:source.line,slot:source.slot}];
   if(source.line==='energy')for(let slot=0;slot<4;slot++)
    if(!p.front[slot])places.push({line:'front',slot});
   for(const {line,slot} of places)options.push({
    type:'green008Raid',player,handUid:h.uid,baseUid:source.card.uid,line,slot,requiredAp:1
   });
  }
 }
 return options;
}
export function resolveGreen008Raid(state,{player,handUid,baseUid,line,slot,payApUids=[]}={}){
 const match=legalGreen008Raids(state,player).find(x=>
  x.handUid===handUid&&x.baseUid===baseUid&&x.line===line&&x.slot===slot);
 if(!match||!Array.isArray(payApUids)||payApUids.length!==1||new Set(payApUids).size!==1)
  throw new Error('008 requires legal Dai-Gurren base, active physical AP and free Raid position');
 const before=ids(state.players[player]);if(new Set(before).size!==before.length)throw new Error('008 duplicated UID before Raid');
 const result=spendTtgApCards(state,{player,apUids:payApUids,count:1}),pl=result.players[player];
 const i=pl.hand.findIndex(c=>c.uid===handUid),source=field(pl).find(x=>x.card.uid===baseUid);
 if(i<0||!source)throw new Error('008 source disappeared');
 const top=pl.hand.splice(i,1)[0],base=source.card;
 pl[source.line][source.slot]=null;
 if(pl[line][slot])throw new Error('008 Raid destination occupied');
 const raider={...top,ready:true,stack:[base],under:[],raidedTurn:state.turn,enteredTurn:state.turn};
 if(name(base)==='ギミー'){raider.green008Impact=1;raider.green008UntilTurn=state.turn;}
 if(name(base)==='ダリー'){raider.green008UnblockedDraw=true;raider.green008UntilTurn=state.turn;}
 pl[line][slot]=raider;
 if(pl.deck.length)pl.hand.push(pl.deck.shift());
 else{result.status='finished';result.winner=1-player;result.endReason='requiredDrawEmpty';}
 if(JSON.stringify(ids(pl))!==JSON.stringify(before))throw new Error('008 Raid/draw physical UID conservation failed');
 result.log??=[];result.log.push({type:'green008Raid',player,uid:handUid,baseUid,line,slot,
  gimmyImpact:!!raider.green008Impact,darryDraw:!!raider.green008UnblockedDraw});
 return withTtgDerivedEnergy(result,player);
}
export function applyGreen008UnblockedDraw(state,attackerPlayer,attackerUid){
 const result=structuredClone(state),pl=result.players[attackerPlayer];
 const attacker=pl.front.find(c=>c?.uid===attackerUid);
 if(!attacker||!attacker.green008UnblockedDraw||attacker.green008UntilTurn!==state.turn)return result;
 if(!pl.deck.length){result.status='finished';result.winner=1-attackerPlayer;result.endReason='requiredDrawEmpty';return result;}
 pl.hand.push(pl.deck.shift());
 result.log??=[];result.log.push({type:'green008UnblockedDraw',player:attackerPlayer,uid:attackerUid});
 return result;
}
export function resolveGreen008TurnEnd(state){
 const result=structuredClone(state);
 for(const pl of result.players)for(const {card} of field(pl))
  if(card.green008UntilTurn===state.turn){
   delete card.green008Impact;delete card.green008UnblockedDraw;delete card.green008UntilTurn;
  }
 return result;
}
