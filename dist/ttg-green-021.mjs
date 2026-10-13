// UA56BT/TTG-1-021 Yoko official Q2269-Q2271.
// STEP: move Front -> Energy in own movement phase.
// At own attack-phase START, with a facedown under any Gurren Lagann-name
// character, may move one Yoko Energy -> Front, +1000 BP that turn, once
// per the shared card NAME. When full, chosen displaced Front goes REMOVED.
import {TTG_BY_ID} from './ttg-builder.mjs';
const onField=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const isYoko=c=>c?.cardId==='TTG-1-021';
const cardName=c=>c?.nameJa||TTG_BY_ID[c?.cardId]?.nameJa||'';
const hasFacedown=c=>(c?.under||[]).some(x=>x?.faceDown===true);
const gurrenWithFacedown=pl=>onField(pl).some(x=>cardName(x.card).includes('グレンラガン')&&hasFacedown(x.card));
const physicalIds=c=>[c.uid,...(c.stack||[]).flatMap(physicalIds),...(c.under||[]).flatMap(physicalIds)];
const allIds=pl=>[...pl.hand,...pl.deck,...pl.life,...pl.outside,...(pl.removed||[]),...onField(pl).map(x=>x.card)].flatMap(physicalIds).sort();
const exists=(s,p)=>[0,1].includes(p)&&!!s?.players?.[p];

export function legalGreen021Step(state,{player,uid}={}){
 if(!exists(state,player)||state.active!==player||state.phase!=='move'||
  state.pending||state.pendingTtgLife)return [];
 const pl=state.players[player];
 if(!pl.front.some(c=>c?.uid===uid&&isYoko(c)))return [];
 return pl.energy.flatMap((card,slot)=>card?[]:[{type:'green021Step',player,uid,slot}]);
}
export function resolveGreen021Step(state,action){
 if(!legalGreen021Step(state,action).some(x=>x.slot===action.slot))throw new Error('Illegal printed 021 STEP move');
 const result=structuredClone(state),pl=result.players[action.player],i=pl.front.findIndex(c=>c?.uid===action.uid);
 pl.energy[action.slot]=pl.front[i];pl.front[i]=null;
 return result;
}
function phaseChoices(state,player){
 if(!exists(state,player)||state.active!==player||state.phase!=='attack')return [];
 const pl=state.players[player];
 if(!gurrenWithFacedown(pl)||pl.green021UsedAtTurn===state.turn)return [];
 const bases=pl.energy.filter(isYoko);
 const options=[];
 for(const card of bases){
  const free=pl.front.flatMap((other,slot)=>other?[]:[slot]);
  if(free.length)for(const slot of free)
   options.push({type:'green021PhaseStart',player,mode:'move',uid:card.uid,slot,replaceUid:null});
  else for(let slot=0;slot<pl.front.length;slot++)
   options.push({type:'green021PhaseStart',player,mode:'move',uid:card.uid,slot,replaceUid:pl.front[slot].uid});
 }
 return options;
}
export function beginGreen021AttackPhase(state,player){
 if(!exists(state,player)||state.phase!=='attack'||state.active!==player||state.pending||
  state.pendingTtgLife)throw new Error('021 check must be at own attack-phase boundary');
 if(state.green021PhaseCheckedTurn===state.turn)throw new Error('Attack-phase start effects already checked');
 const result=structuredClone(state);
 result.green021PhaseCheckedTurn=state.turn;
 if(phaseChoices(result,player).length)
  result.pending={kind:'ttgGreen021PhaseStart',player};
 return result;
}
export function legalGreen021AttackStartChoices(state){
 const q=state?.pending;
 if(q?.kind!=='ttgGreen021PhaseStart'||!exists(state,q.player))return [];
 return [...phaseChoices(state,q.player),{type:'green021PhaseStart',player:q.player,mode:'decline'}];
}
export function resolveGreen021AttackStart(state,action){
 const q=state?.pending,choices=legalGreen021AttackStartChoices(state);
 if(q?.player!==action?.player||!choices.some(x=>x.mode===action.mode&&
   x.uid===action.uid&&x.slot===action.slot&&x.replaceUid===action.replaceUid))
  throw new Error('Illegal 021 phase-start selection or replacement');
 const result=structuredClone(state),pl=result.players[action.player],before=allIds(pl);
 if(action.mode==='move'){
  const i=pl.energy.findIndex(c=>c?.uid===action.uid&&isYoko(c));
  if(i<0)throw new Error('021 no longer in Energy');
  if(pl.front[action.slot]){
   if(pl.front[action.slot].uid!==action.replaceUid)throw new Error('Replacement character changed');
   pl.removed??=[];
   pl.removed.push(pl.front[action.slot]); // full stack in REMOVED; NOT sidelined
  }else if(action.replaceUid!==null)throw new Error('May not replace an empty Front slot');
  const c=pl.energy[i];
  pl.energy[i]=null;
  c.currentBp=(c.currentBp??TTG_BY_ID['TTG-1-021'].bp)+1000;
  c.buffs??=[];c.buffs.push({bp:1000,turn:state.turn,until:'endTurn',source:'TTG-1-021'});
  pl.front[action.slot]=c;
  pl.green021UsedAtTurn=state.turn;
 }
 result.pending=null;
 if(JSON.stringify(allIds(pl))!==JSON.stringify(before))throw new Error('021 card conservation violated');
 result.log??=[];result.log.push({type:'green021AttackStart',player:action.player,uid:action.uid||null,mode:action.mode,replaced:action.replaceUid||null});
 return result;
}
