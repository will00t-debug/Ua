// UA56BT standalone hand-event integration. These actions are executable against a TTG
// match state but are not yet connected to the browser match dispatcher or AI.
// Official texts: UA56BT/TTG-1-036/037/038/078/079, Q2301 errata for 081.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {eligibleGigaDrillTargets,resolveGigaDrillRetire,spendTtgApCards,readyTtgApCards} from './ttg-actions.mjs';

const recoverApEvents=new Set(['TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-078','TTG-1-079']);
const gigaDrillId='TTG-1-081';
export const TTG_IMPLEMENTED_HAND_EVENTS=Object.freeze([...recoverApEvents,gigaDrillId]);
const matchPlayer=p=>Number.isInteger(p)&&p>=0&&p<=1;
function basicLegal(s,player,handUid){
 if(!matchPlayer(player)||s?.phase!=='main'||s.active!==player||s.pending)return null;
 const pl=s.players?.[player],card=pl?.hand?.find(x=>x.uid===handUid);
 if(!card||!TTG_IMPLEMENTED_HAND_EVENTS.includes(card.cardId))return null;
 const printed=TTG_BY_ID[card.cardId];
 // The upstream match must calculate energy from all printed and continuing abilities.
 // Do not approximate it here, or incorrectly authorize cross-color card payments.
 const produced=pl.energyProduced?.[printed.color];
 if(!Number.isFinite(produced)||produced<printed.energy)return null;
 if(!Array.isArray(pl.apCards)||pl.apCards.filter(x=>x.ready).length<printed.ap)return null;
 return {card,printed};
}
export function legalTtgHandEvents(state,player){
 if(!matchPlayer(player))return [];
 const result=[];
 for(const card of state.players?.[player]?.hand||[]){
  const allowed=basicLegal(state,player,card.uid);
  if(!allowed)continue;
  if(card.cardId===gigaDrillId){
   const targets=eligibleGigaDrillTargets(state,player);
   if(!targets.length)continue;
   result.push({type:'playTtgEvent',handUid:card.uid,cardId:card.cardId,
    targetUids:targets.map(c=>c.uid),requiredAp:allowed.printed.ap});
  }else result.push({type:'playTtgEvent',handUid:card.uid,cardId:card.cardId,
    maxReadyAp:2,requiredAp:allowed.printed.ap});
 }
 return result;
}
// Explicit physical AP cards and target IDs are player choices, not random engine defaults.
// Illegal actions throw WITHOUT modifying source state or spending AP.
export function dispatchTtgHandEvent(state,{player,handUid,payApUids=[],targetUid=null,readyApUids=[]}={}){
 const allowed=basicLegal(state,player,handUid);
 if(!allowed)throw new Error('Card cannot be played at this time or lacks printed energy/AP');
 if(!Array.isArray(payApUids)||payApUids.length!==allowed.printed.ap)throw new Error('Invalid AP payment');
 if(allowed.card.cardId===gigaDrillId){
  if(!targetUid||readyApUids.length)throw new Error('Giga Drill requires one legal enemy front target');
  if(!eligibleGigaDrillTargets(state,player).some(c=>c.uid===targetUid))
   throw new Error('Target is not legal under Q2301');
 }else{
  if(targetUid||!Array.isArray(readyApUids))throw new Error('AP recovery requires own AP selection');
  if(readyApUids.length>2||new Set(readyApUids).size!==readyApUids.length)throw new Error('Choose at most two AP cards');
  if(readyApUids.some(uid=>!state.players[player].apCards.some(c=>c.uid===uid)))
   throw new Error('Cannot ready an AP card you do not control');
 }
 // Validate all choices above before the first mutation. Every helper clones its input.
 let result=spendTtgApCards(state,{player,apUids:payApUids,count:allowed.printed.ap});
 if(allowed.card.cardId===gigaDrillId)
  result=resolveGigaDrillRetire(result,{player,targetUid});
 else result=readyTtgApCards(result,{player,apUids:readyApUids});
 const pl=result.players[player],i=pl.hand.findIndex(c=>c.uid===handUid);
 if(i<0)throw new Error('Card disappeared from hand during effect');
 pl.outside??=[];
 pl.outside.push(pl.hand.splice(i,1)[0]);
 result.log??=[];
 result.log.push({type:'ttgEventResolved',player,cardId:allowed.card.cardId,uid:handUid});
 return result;
}
