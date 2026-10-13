// Printed UA56BT green events 035/039/040/041, resolved with real physical
// AP, color energy, legal target choices, exact card movement and turn expiry.
// Keep the two distinct action/trigger texts of 035 separate.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
import {greenTtgCurrentBp} from './ttg-green-passives.mjs';
const events=new Set(['TTG-1-035','TTG-1-039','TTG-1-040','TTG-1-041']);
export const TTG_GREEN_EVENT_IDS=Object.freeze([...events]);
const own=pl=>[...(pl.front||[]),...(pl.energy||[])].filter(Boolean);
const name=c=>c.nameJa||TTG_BY_ID[c.cardId]?.nameJa||'';
const traits=c=>TTG_BY_ID[c.cardId]?.traits||[];
const great=c=>traits(c).some(t=>String(t).includes('大グレン団'));
const simon=c=>name(c)==='シモン'||(c.stack||[]).some(simon);
const isCharacter=c=>TTG_BY_ID[c.cardId]?.type==='character';
const maxBp=(s,p)=>Math.max(0,...own(s.players[p]).filter(isCharacter).map(c=>greenTtgCurrentBp(s,p,c)));
const isValidTarget=c=>!!c&&!c.cannotBeChosen&&!c.protectedFromEffects;
const flatten=c=>[{uid:c.uid,cardId:c.cardId},...(c.stack||[]).flatMap(flatten),...(c.under||[]).flatMap(flatten)];
function combinations(cards){
 let ret=[[]];for(const card of cards){
  ret.push(...ret.filter(group=>group.every(x=>name(x)!==name(card))).map(group=>[...group,card]));
 }
 return ret.map(group=>group.map(c=>c.uid));
}
export function legalGreenEventActions(state,player){
 if(![0,1].includes(player)||state?.active!==player||state.phase!=='main'||state.pending||state.pendingTtgTrigger||state.pendingTtgLife)return [];
 const pl=state.players[player];
 if(!pl?.hand||!pl.apCards?.some(x=>x.ready))return [];
 const actions=[];
 for(const card of pl.hand){
  const printed=TTG_BY_ID[card.cardId];
  if(!events.has(card.cardId)||!printed)continue;
  if((pl.energyProduced?.[printed.color]??0)<printed.energy)continue;
  if(pl.apCards.filter(x=>x.ready).length<printed.ap)continue;
  const base={type:'playGreenEvent',player,handUid:card.uid,cardId:card.cardId,requiredAp:printed.ap};
  if(card.cardId==='TTG-1-035'){
   const cap=own(pl).some(simon)?5000:3000;
   for(const opponent of (state.players[1-player].front||[]).filter(isValidTarget))
    if(greenTtgCurrentBp(state,1-player,opponent)<=cap)
     actions.push({...base,targetUid:opponent.uid});
  }else if(card.cardId==='TTG-1-039'){
   for(const target of own(pl).filter(c=>isCharacter(c)&&(name(c).includes('ラガン')||name(c)==='シモン')))
    actions.push({...base,targetUid:target.uid});
  }else if(card.cardId==='TTG-1-041'){
   for(const targets of combinations(own(pl).filter(c=>isCharacter(c)&&great(c))))
    actions.push({...base,targetUids:targets});
  }else if(card.cardId==='TTG-1-040'){
   if(!pl.usedGreenEvents?.[state.turn+':040']&&pl.deck.length>=2)actions.push(base);
  }
 }
 return actions;
}
function same(a,b){
 return a.handUid===b.handUid&&a.cardId===b.cardId&&a.targetUid===b.targetUid&&
  JSON.stringify(a.targetUids||[])===JSON.stringify(b.targetUids||[]);
}
export function resolveGreenEvent(state,{player,handUid,cardId,targetUid,targetUids,payApUids=[]}={}){
 if(!Array.isArray(payApUids))throw new Error('Physical AP selection required');
 const legal=legalGreenEventActions(state,player).find(x=>same(x,{handUid,cardId,targetUid,targetUids}));
 if(!legal)throw new Error('Illegal green event color/energy/target/AP');
 if(payApUids.length!==legal.requiredAp||new Set(payApUids).size!==payApUids.length)
  throw new Error('Invalid AP amount');
 const result=spendTtgApCards(state,{player,apUids:payApUids,count:legal.requiredAp});
 const pl=result.players[player],handIndex=pl.hand.findIndex(c=>c.uid===handUid);
 if(handIndex<0)throw new Error('Green event not in hand');
 const printedEvent=pl.hand.splice(handIndex,1)[0];
 if(cardId==='TTG-1-035'){
  const opp=result.players[1-player],i=opp.front.findIndex(c=>c?.uid===targetUid);
  const pile=flatten(opp.front[i]);
  opp.front[i]=null;
  opp.removed??=[];
  if(pile.some(c=>opp.removed.some(x=>x.uid===c.uid)))throw new Error('Removal would duplicate physical UID');
  opp.removed.push(...pile);
 }else if(cardId==='TTG-1-039'){
  const target=own(pl).find(c=>c.uid===targetUid),amount=maxBp(result,player);
  target.currentBp=(target.currentBp??TTG_BY_ID[target.cardId].bp)+amount;
  target.buffs??=[];target.buffs.push({sourceUid:handUid,bp:amount,turn:state.turn,until:'endTurn'});
  target.greenEventImpact=(target.greenEventImpact||0)+1;
  target.greenImpactBuffs??=[];
  target.greenImpactBuffs.push({uid:handUid,turn:state.turn});
 }else if(cardId==='TTG-1-041'){
  const amount=targetUids.length*1000;
  for(const uid of targetUids){
   const target=own(pl).find(c=>c.uid===uid);
   target.currentBp=(target.currentBp??TTG_BY_ID[target.cardId].bp)+amount;
   target.buffs??=[];target.buffs.push({sourceUid:handUid,bp:amount,turn:state.turn,until:'endTurn'});
  }
 }else if(cardId==='TTG-1-040'){
  pl.hand.push(...pl.deck.splice(0,2));
  pl.frontGeneratesAll=true;
  pl.frontGenerationExpiresTurn=state.turn;
  pl.usedGreenEvents??={};pl.usedGreenEvents[state.turn+':040']=true;
 }
 if(cardId==='TTG-1-040'){
  pl.removed??=[];pl.removed.push(printedEvent);
 }else pl.outside.push(printedEvent);
 result.log??=[];result.log.push({type:'greenEvent',cardId,player,uid:handUid,targetUid,targetUids});
 return result;
}
export function legalGreen040RemovedActions(state,player){
 if(![0,1].includes(player)||state?.active!==player||state.phase!=='main'||state.pending)return [];
 const pl=state.players[player],energy=pl.energyProduced?.green??0;
 if(energy<8||pl.usedGreen040RemovedTurn===state.turn)return [];
 return (pl.removed||[]).filter(x=>x.cardId==='TTG-1-040').map(x=>({type:'green040Double',player,uid:x.uid}));
}
export function resolveGreen040Removed(state,{player,uid}={}){
 if(!legalGreen040RemovedActions(state,player).some(x=>x.uid===uid))throw new Error('Illegal removed event double');
 const result=structuredClone(state),pl=result.players[player];
 pl.energyDoublings=(pl.energyDoublings||0)+1;
 pl.green040DoublingCount=(pl.green040DoublingCount||0)+1;
 pl.greenDoublingsExpireTurn=state.turn;
 pl.usedGreen040RemovedTurn=state.turn;
 return result;
}
export function resolveGreenEventTurnEnd(state){
 const result=structuredClone(state);
 for(const pl of result.players){
  for(const c of own(pl)){
   if(c.greenImpactBuffs){
    const expired=c.greenImpactBuffs.filter(b=>b.turn===state.turn).length;
    c.greenEventImpact=Math.max(0,(c.greenEventImpact||0)-expired);
    c.greenImpactBuffs=c.greenImpactBuffs.filter(b=>b.turn!==state.turn);
   }
  }
  if(pl.greenDoublingsExpireTurn===state.turn){
   pl.energyDoublings=Math.max(0,(pl.energyDoublings||0)-(pl.green040DoublingCount||0));
   delete pl.green040DoublingCount;delete pl.greenDoublingsExpireTurn;
  }
 }
 return result;
}
