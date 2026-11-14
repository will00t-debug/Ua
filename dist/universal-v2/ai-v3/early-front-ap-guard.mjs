// Offline-only exploratory candidate. Not connected to the live AI.
// At START, protect the final usable AP when a 4000+ BP front character
// is already legal after ordinary phase advance. Never read opposing hidden zones.
import {legalUniversalActions,dispatchUniversalAction,universalBp} from '../engine.mjs';

const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const liveBp=(packs,state,card)=>{try{return universalBp(packs,state,card)||0;}catch{return 0;}};
export function guardEarlyApForFront(packs,state,actor,choice,legal,ownTurn){
 const nope=(reason)=>({action:choice,changed:false,reason});
 if(state?.status!=='playing'||state.pending||state.phase!=='start'||ownTurn>4)
  return nope('not-early-start');
 if(choice?.type!=='extraDraw')return nope('not-extra-draw');
 const next=(legal||[]).find(a=>a.type==='next');
 if(!next)return nope('no-next');
 const mine=state.players?.[actor];
 if(!mine||mine.apCards.filter(c=>c?.ready).length!==1)return nope('not-last-ap');
 if(mine.front.some(c=>c&&liveBp(packs,state,c)>=4000))return nope('already-beater');
 let after=state,advanced=0;
 try{
  while(after.phase!=='main'&&!after.pending&&advanced<3&&after.status==='playing'&&after.active===actor){
   const choices=legalUniversalActions(packs,after);
   const forward=advanced===0?choices.find(a=>exact(a,next)):choices.find(a=>a.type==='next');
   if(!forward)return nope('cannot-advance');
   after=dispatchUniversalAction(packs,after,forward,{actor});
   advanced++;
  }
  if(after.status!=='playing'||after.phase!=='main'||after.pending)return nope('no-main');
  const playable=legalUniversalActions(packs,after).filter(a=>
   (a.type==='play'&&a.line==='front')||(a.type==='raid'&&a.line==='front'));
  const bodies=playable.map(a=>({
   action:a,
   card:after.players[actor].hand.find(c=>c.uid===a.uid)
  })).filter(x=>x.card&&liveBp(packs,after,x.card)>=4000);
  if(!bodies.length)return nope('no-payable-4000');
  // Main-phase play is already legal after start/move NEXT, so we don't
  // override when it would demand an impossible energy/AP payment.
  return {action:next,changed:true,reason:'protect-last-ap-for-payable-4000',
   playable:bodies.length,maxBp:Math.max(...bodies.map(x=>liveBp(packs,after,x.card)))};
 }catch(e){return nope('probe-error');}
}
