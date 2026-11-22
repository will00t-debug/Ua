// Offline candidate ONLY; never imported by the live hybrid route.
// If a third/fourth turn energy choice leaves a payable RAID locked,
// consider a different legal energy play that actually unlocks it.
// We require no net energy/AP loss and preserve raids + RAID base cards in hand.
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor} from '../engine.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const squash=v=>String(v||'').replace(/\s+/g,'');
const colors=(pack,state,actor)=>{try{return universalEnergyByColor(pack,state,actor)||{};}catch{return {}};};
const countRaids=(legal)=>new Set(legal.filter(a=>a.type==='raid').map(a=>a.uid)).size;
function afterEnergy(pack,state,actor,action){
 try{
  const s=dispatchUniversalAction(pack,structuredClone(state),action,{actor});
  if(s.status!=='playing'||s.pending||s.phase!=='main')return null;
  const legal=legalUniversalActions(pack,s);
  return {raids:countRaids(legal),ap:s.players[actor].apCards.filter(c=>c?.ready).length,
   colors:colors(pack,s,actor)};
 }catch{return null;}
}
function raidBaseNeeded(cards,catalog){
 const names=new Set();
 for(const card of cards){
  const printed=catalog[card.cardId];
  if(!printed?.raidName)continue;
  for(const name of [printed.raidName,...(printed.raidBaseNames||[])])names.add(squash(name));
 }
 return names;
}
export function preferRaidEnablingEnergy(pack,state,actor,choice,legal,ownTurn){
 const no=reason=>({action:choice,changed:false,reason});
 if(ownTurn!==3&&ownTurn!==4)return no('not-turn3or4');
 if(state?.status!=='playing'||state.pending||state.phase!=='main'||state.active!==actor)
  return no('not-idle-main');
 if(choice?.type!=='play'||choice.line!=='energy')return no('not-energy-play');
 if(countRaids(legal)>0)return no('already-raid-ready');
 const mine=state.players[actor],catalog=pack[actor].cards,hand=mine.hand||[];
 const raids=hand.filter(c=>catalog[c.cardId]?.raidName);
 if(!raids.length)return no('no-raid-hand');
 const bases=raidBaseNeeded(hand,catalog);
 const board=[...(mine.front||[]),...(mine.energy||[])].filter(Boolean);
 if(!board.some(c=>bases.has(squash(catalog[c.cardId]?.name))))
  return no('no-matching-base');
 const asChosen=afterEnergy(pack,state,actor,choice);
 if(!asChosen||asChosen.raids>0)return no('chosen-works');
 const alternatives=(legal||[]).filter(a=>a.type==='play'&&a.line==='energy'
  &&!same(a,choice));
 const seen=new Set(),feasible=[];
 for(const alternative of alternatives){
  const handCard=hand.find(c=>c.uid===alternative.uid);
  if(!handCard||seen.has(alternative.uid))continue;
  seen.add(alternative.uid);
  const d=catalog[handCard.cardId];
  if(!d||d.raidName||bases.has(squash(d.name)))continue;
  // Do not sacrifice a 4000+ future beater just to unlock a RAID.
  if((Number(d.bp)||0)>=4000)continue;
  const after=afterEnergy(pack,state,actor,alternative);
  if(!after||after.raids<=asChosen.raids||after.ap<asChosen.ap)continue;
  const everyColor=new Set([...Object.keys(asChosen.colors),...Object.keys(after.colors)]);
  if([...everyColor].some(color=>(after.colors[color]||0)<(asChosen.colors[color]||0)))continue;
  feasible.push({action:alternative,after,card:d});
 }
 if(!feasible.length)return no('no-safe-alternative');
 feasible.sort((a,b)=>b.after.raids-a.after.raids
  ||(Number(a.card.bp)||0)-(Number(b.card.bp)||0)
  ||(Number(b.card.gen)||0)-(Number(a.card.gen)||0)
  ||String(a.card.id).localeCompare(String(b.card.id)));
 const selected=feasible[0];
 return {action:selected.action,changed:true,reason:'energy-unlocks-raid-without-ap-or-color-loss',
  unlocked:selected.after.raids,cardId:selected.card.id,chosenUid:choice.uid};
}
