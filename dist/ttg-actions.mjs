// Self-contained effect state transitions for UA56BT. Not yet connected to the full TTG match UI.
// A battleBoard is {front: Card|null[4], energy: Card|null[4]}.
const niaRedIds=new Set(['TTG-1-058','TTG-1-059','TTG-1-060','TTG-1-061','TTG-1-062']);
const kaminaIds=new Set(['TTG-1-042','TTG-1-043','TTG-1-044','TTG-1-045','TTG-1-046']);
const lanes=board=>[...(board?.front||[]),...(board?.energy||[])].filter(Boolean);
import {TTG_BY_ID} from './ttg-builder.mjs';
import {beginRed073Leaving} from './ttg-red-073-leaving.mjs';
function publicRaidStack(card){
 if(!card)return [];
 return [card,...(card.stack||[]).flatMap(publicRaidStack)];
}
function publicCharacters(board){return lanes(board).flatMap(publicRaidStack);}
function cardName(card){return card?.nameJa||card?.name;}
const isNiaRed=card=>niaRedIds.has(card?.cardId||card?.id);
const isKamina=card=>kaminaIds.has(card?.cardId||card?.id)||cardName(card)==='カミナ';

export function canDeployTtgCard(board,card){
 if(!card||!board)return false;
 const field=publicCharacters(board);
 if(isNiaRed(card))return !field.some(isKamina);
 if(isKamina(card))return !field.some(isNiaRed);
 return true;
}
export function gigaDrillEnergyThreshold(board){
 return publicCharacters(board).some(c=>['シモン','カミナ'].includes(cardName(c)))?5000:3000;
}
export function eligibleGigaDrillTargets(state,player){
 const our=state.players[player],enemy=state.players[1-player],maxBp=gigaDrillEnergyThreshold(our);
 return enemy.front.filter(c=>c&&!c.cannotBeChosen&&!c.protectedFromEffects&&Number.isFinite(c.currentBp??c.bp??TTG_BY_ID[c.cardId]?.bp)&&(c.currentBp??c.bp??TTG_BY_ID[c.cardId]?.bp)<=maxBp);
}
function flattenedCards(card){
 const result=[];
 function collect(c){
  if(!c)return;
  const {stack=[],under=[],...own}=c;
  result.push({uid:own.uid,cardId:own.cardId});
  for(const x of stack)collect(x);
  for(const x of under)collect(x);
 }
 collect(card);
 if(result.some(c=>!c.uid||!c.cardId)||new Set(result.map(c=>c.uid)).size!==result.length)throw new Error('Invalid card UID layout');
 return result;
}
// Printed SPECIAL trigger TTG-1-081: select ANY opponent FRONT character;
// unlike its normal event text, the trigger has no BP threshold.
export function eligibleTtgSpecialTargets(state,player){
 if(![0,1].includes(player))return [];
 return (state.players?.[1-player]?.front||[]).filter(c=>c&&!c.cannotBeChosen&&!c.protectedFromEffects);
}
export function resolveTtgSpecialRetire(state,{player,targetUid}={}){
 if(![0,1].includes(player)||!targetUid)throw new Error('Invalid trigger choice');
 const chosen=eligibleTtgSpecialTargets(state,player).find(c=>c.uid===targetUid);
 if(!chosen)throw new Error('SPECIAL trigger needs a legal enemy front character');
 const result=structuredClone(state),opp=result.players[1-player],index=opp.front.findIndex(c=>c?.uid===targetUid);
 if(opp.front[index].cardId==='TTG-1-073'&&(opp.front[index].under||[]).some(c=>c.faceDown)&&
  (opp.front[index].currentBp??TTG_BY_ID['TTG-1-073'].bp)>=500)
  return beginRed073Leaving({...result,pending:null},{player:1-player,uid:targetUid});
 const pile=flattenedCards(opp.front[index]),previous=new Set((opp.outside||[]).map(c=>c.uid));
 if(pile.some(c=>previous.has(c.uid)))throw new Error('Duplicate card identity');
 opp.front[index]=null;
 opp.outside.push(...pile);
 return result;
}
// TTG-1-081 corrected Q2301: only retire a legal enemy front character, including its entire card pile.
export function resolveGigaDrillRetire(state,{player,targetUid}){
 if(![0,1].includes(player)||!targetUid)throw new Error('Invalid choice');
 const legal=eligibleGigaDrillTargets(state,player);
 const chosen=legal.find(c=>c.uid===targetUid);
 if(!chosen)throw new Error('Not a legal front-line retirement target');
 const result=structuredClone(state),opp=result.players[1-player];
 const index=opp.front.findIndex(c=>c?.uid===targetUid);
 if(opp.front[index].cardId==='TTG-1-073'&&(opp.front[index].under||[]).some(c=>c.faceDown)&&
  (opp.front[index].currentBp??TTG_BY_ID['TTG-1-073'].bp)>=500)
  return beginRed073Leaving({...result,pending:null},{player:1-player,uid:targetUid});
 const pile=flattenedCards(opp.front[index]);
 const currentUids=new Set((opp.outside||[]).map(x=>x.uid));
 if(pile.some(x=>currentUids.has(x.uid)))throw new Error('Duplicate card identity');
 opp.front[index]=null;
 opp.outside.push(...pile);
 return result;
}
// Events TTG-1-036/037/038 and 078/079: choose up to 2 physical AP cards to turn ACTIVE.
export function readyTtgApCards(state,{player,apUids=[]}){
 if(![0,1].includes(player)||!Array.isArray(apUids)||apUids.length>2||new Set(apUids).size!==apUids.length)throw new Error('Invalid AP selection');
 const tokens=state.players[player].apCards;
 if(!Array.isArray(tokens)||apUids.some(uid=>!tokens.some(c=>c.uid===uid)))throw new Error('Not an owned AP card');
 const result=structuredClone(state);
 for(const token of result.players[player].apCards)if(apUids.includes(token.uid))token.ready=true;
 return result;
}
export function spendTtgApCards(state,{player,apUids=[],count}){
 if(![0,1].includes(player)||!Number.isInteger(count)||count<0||apUids.length!==count||new Set(apUids).size!==apUids.length)throw new Error('Invalid AP payment');
 const tokens=state.players[player].apCards;
 if(!Array.isArray(tokens)||apUids.some(uid=>!tokens.some(c=>c.uid===uid&&c.ready)))throw new Error('AP already REST or not owned');
 const result=structuredClone(state);
 for(const token of result.players[player].apCards)if(apUids.includes(token.uid))token.ready=false;
 return result;
}
// Per-name, per-turn limit shared across several physical copies; never leave local-only UI flags.
export function markTtgOncePerName(state,{player,turn,name,ability}){
 if(![0,1].includes(player)||!Number.isInteger(turn)||turn<0||!name||!ability)throw new Error('Invalid once-per-name key');
 const key=[turn,name,ability].join(':');
 if(state.players[player].usedTtgEffects?.[key])throw new Error('Same-name effect has already activated this turn');
 const result=structuredClone(state);
 result.players[player].usedTtgEffects??={};
 result.players[player].usedTtgEffects[key]=true;
 return result;
}
