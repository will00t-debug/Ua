// Printed UNION ARENA standard life triggers for the green TTG subset.
// The triggered physical card stays in owner's OUTSIDE pending resolution,
// so it is never counted twice or lost when the player selects a target.
// Supports DRAW, ACTIVE, GET, SPECIAL, FINAL and green COLOR, NOT Raid triggers.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {greenTtgNeedsEnergy} from './ttg-green-passives.mjs';
import {canDeployTtgCard} from './ttg-actions.mjs';
import {TTG_GREEN_ENTRY_IDS} from './ttg-green-entry.mjs';
const field=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const flatten=c=>[{uid:c.uid,cardId:c.cardId},...(c.stack||[]).flatMap(flatten),...(c.under||[]).flatMap(flatten)];
const idName=c=>TTG_BY_ID[c.cardId]?.nameJa||c.nameJa;
const pValid=p=>p===0||p===1;
function pending(s){
 const q=s?.pendingTtgLife;
 if(!q||!pValid(q.player)||!q.cardUid||!q.trigger)throw new Error('No life trigger to resolve');
 const pl=s.players[q.player],card=pl.outside.find(c=>c.uid===q.cardUid);
 if(!card||TTG_BY_ID[card.cardId]?.trigger!==q.trigger)throw new Error('Trigger card missing or has wrong printed kind');
 return {q,pl,card};
}
export function legalTtgLifeChoices(state){
 if(!state?.pendingTtgLife)return [];
 const {q,pl,card}=pending(state);
 const trigger=q.trigger,base={type:'ttgLifeChoice',player:q.player,cardUid:q.cardUid};
 const choices=[];
 const candidate=c=>!c.cannotBeChosen&&!c.protectedFromEffects;
 if(trigger==='active'){
  for(const loc of field(pl).filter(x=>TTG_BY_ID[x.card.cardId]?.type==='character'))
   choices.push({...base,mode:'active',targetUid:loc.card.uid});
 }else if(trigger==='special'){
  for(const c of (state.players[1-q.player].front||[]).filter(c=>c&&candidate(c)))
   choices.push({...base,mode:'special',targetUid:c.uid});
 }else if(trigger==='get')choices.push({...base,mode:'get'});
 else if(trigger==='color'){
  for(const h of pl.hand){
   const printed=TTG_BY_ID[h.cardId];
   if(!printed||printed.type!=='character'||printed.color!=='green'||printed.ap!==1||
      greenTtgNeedsEnergy(state,q.player,h)>2||!canDeployTtgCard(pl,h))continue;
   for(const line of ['energy','front'])for(let slot=0;slot<4;slot++)
    if(!pl[line][slot])choices.push({...base,mode:'color',handUid:h.uid,line,slot});
  }
 }else if(trigger==='raid')return [];
 else if(!['draw','final'].includes(trigger))throw new Error('Unknown printed life trigger: '+trigger);
 // The trigger is optional (official Q99), including GET, ACTIVE and COLOR.
 return [...choices,{...base,mode:'decline'}];
}
export function beginTtgLifeTrigger(state,{player,lifeUid}={}){
 if(!pValid(player)||state.pending||state.pendingTtgLife)throw new Error('Another effect is pending');
 const pl=state.players?.[player],first=pl?.life?.[0];
 if(!first||first.uid!==lifeUid)throw new Error('Trigger check must reveal the next life card');
 const result=structuredClone(state),owner=result.players[player],revealed=owner.life.shift(),
  trigger=TTG_BY_ID[revealed.cardId]?.trigger;
 owner.outside.push(revealed);
 if(!trigger)return finalizeTtgLifeOutcome(result,player);
 if(trigger==='draw'){
  if(owner.deck.length)owner.hand.push(owner.deck.shift());
  return finalizeTtgLifeOutcome(result,player);
 }
 if(trigger==='final'){
  if(!owner.life.length&&owner.deck.length)owner.life.push(owner.deck.shift());
  return finalizeTtgLifeOutcome(result,player);
 }
 if(!['active','special','get','color','raid'].includes(trigger))throw new Error('Unsupported printed trigger');
 result.pendingTtgLife={player,cardUid:revealed.uid,trigger};
 return result;
}
export function finalizeTtgLifeOutcome(state,defender){
 if(state.pendingTtgLife)return state;
 const result=state;
 if(!result.players[defender].life.length&&result.status!=='finished'){
  result.status='finished';result.winner=1-defender;result.endReason='lifeDepleted';
 }
 return result;
}
export function resolveTtgLifeChoice(state,action){
 const {q,pl,card}=pending(state);
 if(action?.player!==q.player||action?.cardUid!==q.cardUid)throw new Error('Only defender can resolve their life trigger');
 const choices=legalTtgLifeChoices(state);
 const valid=choices.find(x=>x.mode===action.mode&&x.targetUid===action.targetUid&&
  x.handUid===action.handUid&&x.line===action.line&&x.slot===action.slot);
 if(!valid)throw new Error('Illegal life trigger action or target');
 const result=structuredClone(state),owner=result.players[q.player];
 const ownerIndex=owner.outside.findIndex(x=>x.uid===q.cardUid);
 if(action.mode==='get'){
  owner.hand.push(owner.outside.splice(ownerIndex,1)[0]);
 }else if(action.mode==='active'){
  const loc=field(owner).find(x=>x.card.uid===action.targetUid);
  if(!loc)throw new Error('ACTIVE target left play');
  const c=loc.card,printed=TTG_BY_ID[c.cardId];
  c.ready=true;c.currentBp=(c.currentBp??printed.bp)+3000;
  c.buffs??=[];c.buffs.push({bp:3000,turn:state.turn,until:'endTurn'});
 }else if(action.mode==='special'){
  const opp=result.players[1-q.player],i=opp.front.findIndex(c=>c?.uid===action.targetUid);
  if(i<0)throw new Error('SPECIAL front target left play');
  const pile=flatten(opp.front[i]);opp.front[i]=null;
  const previous=new Set(opp.outside.map(x=>x.uid));
  if(pile.some(x=>previous.has(x.uid)))throw new Error('SPECIAL would duplicate a physical card');
  opp.outside.push(...pile);
 }else if(action.mode==='color'){
  const i=owner.hand.findIndex(x=>x.uid===action.handUid);
  if(i<0||owner[action.line][action.slot])throw new Error('COLOR source or destination changed');
  const c=owner.hand.splice(i,1)[0];
  owner[action.line][action.slot]={...c,ready:true,enteredTurn:state.turn};
 }
 result.pendingTtgLife=null;
 // Mandatory On Entry from a green character summoned by COLOR is NOT skipped.
 if(action.mode==='color'&&TTG_GREEN_ENTRY_IDS.includes(owner[action.line][action.slot].cardId)){
  result.pending={kind:'ttgGreenEntry',player:q.player,sourceUid:action.handUid};
 }
 result.log??=[];result.log.push({type:'ttgLifeResolved',player:q.player,trigger:q.trigger,mode:action.mode});
 return finalizeTtgLifeOutcome(result,q.player);
}
