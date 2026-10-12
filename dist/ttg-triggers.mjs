// Executable isolated UA56BT life-trigger resolution for the FINAL and SPECIAL events.
// Official text: 036/037/038/078/079 FINAL; 081 SPECIAL; Q2301 corrects NORMAL text only.
// Pending trigger card is held separately in state.pendingTtgTrigger until resolution.
// Still requires integration with the browser game and AI before playable.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {eligibleTtgSpecialTargets,resolveTtgSpecialRetire} from './ttg-actions.mjs';

const finalEvents=new Set(['TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-078','TTG-1-079']);
export const TTG_IMPLEMENTED_EVENT_TRIGGERS=Object.freeze([...finalEvents,'TTG-1-081']);
const validPlayer=p=>Number.isInteger(p)&&(p===0||p===1);
export function legalTtgEventTriggerChoices(state){
 const pending=state?.pendingTtgTrigger;
 if(!pending||!validPlayer(pending.player))return [];
 const id=pending.card?.cardId;
 if(!TTG_IMPLEMENTED_EVENT_TRIGGERS.includes(id))return [];
 if(TTG_BY_ID[id]?.trigger==='special'){
  return eligibleTtgSpecialTargets(state,pending.player).map(c=>({type:'resolveTtgTrigger',targetUid:c.uid}));
 }
 if(TTG_BY_ID[id]?.trigger==='final')return [{type:'resolveTtgTrigger'}];
 return [];
}
export function resolveTtgEventLifeTrigger(state,{player,targetUid=null,decline=false}={}){
 const pending=state?.pendingTtgTrigger;
 if(!pending||!validPlayer(player)||pending.player!==player)throw new Error('No trigger for this player');
 const card=pending.card,id=card?.cardId;
 if(!TTG_IMPLEMENTED_EVENT_TRIGGERS.includes(id))throw new Error('Unsupported event trigger');
 if(typeof decline!=='boolean')throw new Error('Invalid decline choice');
 if(decline&&targetUid)throw new Error('Cannot both decline and select a target');
 const isFinal=finalEvents.has(id);
 if(isFinal&&targetUid)throw new Error('FINAL event has no target');
 if(!isFinal&&!decline){
  const targets=eligibleTtgSpecialTargets(state,player);
  if(targets.length&&!targets.some(c=>c.uid===targetUid))throw new Error('Illegal SPECIAL trigger target');
  if(!targets.length&&targetUid)throw new Error('No SPECIAL targets available');
 }
 let result=structuredClone(state);
 if(!decline){
  if(isFinal){
   const pl=result.players[player];
   if(pl.life.length===0&&pl.deck.length>0)pl.life.push(pl.deck.shift());
  }else if(targetUid){
   result=resolveTtgSpecialRetire(result,{player,targetUid});
  }
 }
 const pl=result.players[player];
 pl.outside??=[];
 if(pl.outside.some(c=>c.uid===card.uid))throw new Error('Trigger card duplicated');
 pl.outside.push(structuredClone(card));
 result.pendingTtgTrigger=null;
 result.log??=[];
 result.log.push({type:'ttgEventTriggerResolved',player,cardId:id,uid:card.uid,decline});
 return result;
}
