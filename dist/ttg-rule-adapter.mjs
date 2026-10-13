// UA56BT single rule-action interface for standalone TTG match states.
// No BLEACH engine or browser changes. Unimplemented cards remain blocked.
// This adapter joins tested hand events, life triggers and a subset of
// character actions; it is NOT a complete match dispatcher.
import {legalTtgHandEvents,dispatchTtgHandEvent} from './ttg-event-resolver.mjs';
import {withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
import {legalTtgEventTriggerChoices,resolveTtgEventLifeTrigger,TTG_IMPLEMENTED_EVENT_TRIGGERS} from './ttg-triggers.mjs';
import {resolveTtgNia059,resolveTtgButa063,resolveTtgYoko065Step,resolveTtgMainEndRetire,resolveTtgPendingEndTurn,eligibleTtgViral002Targets,resolveTtgViral002,resolveTtgTemporaryEnergyEndTurn} from './ttg-pending-rules.mjs';

const owned=(s,p)=>[...(s.players?.[p]?.front||[]),...(s.players?.[p]?.energy||[])].filter(Boolean);
const simon=c=>!!c&&(c.nameJa==='シモン'||c.name==='シモン'||(c.stack||[]).some(simon));
const playerOk=p=>Number.isInteger(p)&&(p===0||p===1);
export function legalTtgRuleActions(state,player){
 if(!playerOk(player)||!state?.players?.[player])return [];
 const pending=state.pendingTtgTrigger;
 if(pending){
  if(pending.player!==player||!TTG_IMPLEMENTED_EVENT_TRIGGERS.includes(pending.card?.cardId))return [];
  const offered=legalTtgEventTriggerChoices(state);
  // A life trigger is optional; a player can decline even when targets exist.
  return [...offered.map(x=>({...x,player})),{type:'resolveTtgTrigger',player,decline:true}];
 }
 if(state.active!==player||state.pending)return [];
 if(state.phase==='main'){
  const list=legalTtgHandEvents(withTtgDerivedEnergy(state,player),player).map(a=>({...a,player}));
  const pl=state.players[player];
  for(const c of owned(state,player)){
   if(!c.ready)continue;
   if(c.cardId==='TTG-1-002'){
    for(const targetUid of eligibleTtgViral002Targets(state,{player,uid:c.uid}))
     list.push({type:'activateViral002',player,uid:c.uid,targetUid});
   }
   if(c.cardId==='TTG-1-059'){
    for(const target of owned(state,player).filter(simon))
     list.push({type:'activateNia059',player,uid:c.uid,targetUid:target.uid});
   }
   if(c.cardId==='TTG-1-063')
    list.push({type:'activateButa063',player,uid:c.uid});
  }
  return list;
 }
 if(state.phase==='move'){
  const pl=state.players[player],list=[];
  for(const c of pl.front||[]){
   if(c?.cardId!=='TTG-1-065')continue;
   for(let slot=0;slot<(pl.energy||[]).length;slot++)
    if(!pl.energy[slot])list.push({type:'stepYoko065',player,uid:c.uid,toSlot:slot});
  }
  return list;
 }
 return [];
}
const actionMatches=(legal,action)=>legal.some(a=>a.type===action.type&&
 (a.uid===undefined||a.uid===action.uid)&&
 (a.targetUid===undefined||a.targetUid===action.targetUid)&&
 (a.toSlot===undefined||a.toSlot===action.toSlot)&&
 (a.handUid===undefined||a.handUid===action.handUid)&&
 (a.targetUids===undefined||a.targetUids.includes(action.targetUid)||
    (a.maxReadyAp!==undefined&&action.targetUid==null))&&
 (a.decline===undefined||a.decline===action.decline)
);
export function dispatchTtgRuleAction(state,action){
 if(!playerOk(action?.player)||!actionMatches(legalTtgRuleActions(state,action.player),action))
  throw new Error('Illegal or unavailable TTG rule action');
 if(action.type==='resolveTtgTrigger')return resolveTtgEventLifeTrigger(state,action);
 if(action.type==='playTtgEvent')return withTtgDerivedEnergy(dispatchTtgHandEvent(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='activateNia059')return withTtgDerivedEnergy(resolveTtgNia059(state,action),action.player);
 if(action.type==='activateViral002')return withTtgDerivedEnergy(resolveTtgViral002(state,action),action.player);
 if(action.type==='activateButa063')return withTtgDerivedEnergy(resolveTtgButa063(state,action),action.player);
 if(action.type==='stepYoko065')return withTtgDerivedEnergy(resolveTtgYoko065Step(state,action),action.player);
 throw new Error('Unsupported TTG action');
}
// Phase hooks must run at their exact transition; they are exported for the
// eventual match dispatcher and may not be skipped for scheduled retirement.
export const resolveTtgMainPhaseEnd=state=>withTtgDerivedEnergy(resolveTtgMainEndRetire(state),state.active);
export const resolveTtgTurnEnd=state=>withTtgDerivedEnergy(resolveTtgTemporaryEnergyEndTurn(resolveTtgPendingEndTurn(state)),state.active);

// Deterministic AI for this implemented subset. It only chooses actions
// offered by the same legal action generator that a human client must use.
export function chooseTtgRuleAiAction(state,player){
 const options=legalTtgRuleActions(state,player);
 if(!options.length)return null;
 const triggers=options.filter(a=>a.type==='resolveTtgTrigger'&&!a.decline);
 if(triggers.length){
  const target=triggers.find(a=>a.targetUid);
  if(!target)return triggers[0];
  return triggers.filter(a=>a.targetUid)
   .sort((a,b)=>(state.players[1-player].front.find(c=>c?.uid===b.targetUid)?.currentBp||
       state.players[1-player].front.find(c=>c?.uid===b.targetUid)?.bp||0)-
      (state.players[1-player].front.find(c=>c?.uid===a.targetUid)?.currentBp||
       state.players[1-player].front.find(c=>c?.uid===a.targetUid)?.bp||0))[0];
 }
 const event=options.find(x=>x.type==='playTtgEvent'&&x.targetUids?.length)||
    options.find(x=>x.type==='playTtgEvent');
 if(event){
  const pl=state.players[player];
  const payable=pl.apCards.filter(x=>x.ready).slice(0,event.requiredAp).map(x=>x.uid);
  if(event.targetUids){
   const target=state.players[1-player].front.filter(x=>x&&event.targetUids.includes(x.uid))
    .sort((a,b)=>(b.currentBp??b.bp)-(a.currentBp??a.bp))[0];
   return {type:'playTtgEvent',player,handUid:event.handUid,payApUids:payable,targetUid:target.uid};
  }
  // AP cards used for payment become REST; readying them may be selected.
  const restAfterPayment=pl.apCards.filter(x=>!x.ready||payable.includes(x.uid));
  return {type:'playTtgEvent',player,handUid:event.handUid,payApUids:payable,
    readyApUids:restAfterPayment.slice(0,2).map(x=>x.uid)};
 }
 const buff=options.filter(a=>a.type==='activateNia059').sort((a,b)=>{
  const all=owned(state,player);
  const bp=uid=>all.find(x=>x.uid===uid)?.currentBp??all.find(x=>x.uid===uid)?.bp??0;
  return bp(b.targetUid)-bp(a.targetUid);
 })[0];
 return buff||options.find(x=>x.type==='activateViral002')||options.find(x=>x.type==='activateButa063')||
    options.find(x=>x.type==='stepYoko065')||null;
}
export function simulateTtgRuleAi(state,player,{maxActions=64}={}){
 if(!Number.isInteger(maxActions)||maxActions<0||maxActions>1000)throw new Error('Invalid simulation bound');
 let current=structuredClone(state);
 const executed=[];
 for(let i=0;i<maxActions;i++){
  const action=chooseTtgRuleAiAction(current,player);
  if(!action)break;
  current=dispatchTtgRuleAction(current,action);
  executed.push(action);
 }
 return {state:current,actions:executed,truncated:executed.length===maxActions&&!!chooseTtgRuleAiAction(current,player)};
}
