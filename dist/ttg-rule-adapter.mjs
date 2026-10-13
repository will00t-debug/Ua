import {TTG_BY_ID} from './ttg-builder.mjs';
// UA56BT single rule-action interface for standalone TTG match states.
// No BLEACH engine or browser changes. Unimplemented cards remain blocked.
// This adapter joins tested hand events, life triggers and a subset of
// character actions; it is NOT a complete match dispatcher.
import {legalTtgHandEvents,dispatchTtgHandEvent} from './ttg-event-resolver.mjs';
import {withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
import {legalGreenEventActions,resolveGreenEvent,legalGreen040RemovedActions,resolveGreen040Removed,resolveGreenEventTurnEnd} from './ttg-green-events.mjs';
import {legalTtgRaidEntries,dispatchTtgRaidEntry} from './ttg-raid-entry.mjs';
import {legalGreen025Actions,resolveGreen025,resolveGreen025TurnEnd} from './ttg-green-025.mjs';
import {legalTtgGreen028Raids,dispatchTtgGreen028Raid,legalTtgGreen028EntryChoices,resolveTtgGreen028Entry} from './ttg-green-028.mjs';
import {legalGreen021Step,resolveGreen021Step,beginGreen021AttackPhase,legalGreen021AttackStartChoices,resolveGreen021AttackStart} from './ttg-green-021.mjs';
import {legalTtgGreen029Raids,dispatchTtgGreen029Raid,legalTtgGreen029EntryChoices,resolveTtgGreen029Entry} from './ttg-green-029.mjs';
import {legalGreen008Raids,resolveGreen008Raid,resolveGreen008TurnEnd} from './ttg-green-008.mjs';
import {legalGreen030Raids,resolveGreen030Raid,legalGreen030SidelinedChoices,resolveGreen030Sidelined} from './ttg-green-030.mjs';
import {legalGreen012Plays,resolveGreen012Play,legalGreen012Search,resolveGreen012Search,legalGreen012Discards,resolveGreen012Discard,legalGreen012Double,resolveGreen012Double,resolveGreen012TurnEnd} from './ttg-green-012.mjs';
import {legalGreenHighRaids,resolveGreenHighRaid,legalGreenHighRaidChoices,resolveGreenHighRaidChoice} from './ttg-green-high-raid.mjs';
import {legalGreenRetirementChoices,resolveGreenRetirementChoice} from './ttg-green-retirement.mjs';
import {legalGreenSitePlays,resolveGreenSitePlay,legalGreen033AfterRaid,resolveGreen033AfterRaid,legalGreen034SidelinedChoices,resolveGreen034Sidelined,legalGreen034AfterRaid,resolveGreen034AfterRaid} from './ttg-green-fields.mjs';
import {legalGreen003,resolveGreen003,legalGreen011,resolveGreen011,legalGreen015,resolveGreen015,legalGreen018,resolveGreen018,legalGreen022,resolveGreen022,resolveGreenMainEnd,resolveGreenTurnEnd,legalGreen020Step,resolveGreen020Step,legalGreen016,resolveGreen016,legalGreen017,resolveGreen017} from './ttg-green-main.mjs';
import {legalTtgEventTriggerChoices,resolveTtgEventLifeTrigger,TTG_IMPLEMENTED_EVENT_TRIGGERS} from './ttg-triggers.mjs';
import {resolveTtgNia059,resolveTtgButa063,resolveTtgYoko065Step,resolveTtgMainEndRetire,resolveTtgPendingEndTurn,eligibleTtg071AttackBuffTargets,resolveTtg071FirstAttack,eligibleTtgViral002Targets,resolveTtgViral002,resolveTtgTemporaryEnergyEndTurn} from './ttg-pending-rules.mjs';

import {legalTtgRed046Main,resolveTtgRed046Main} from './ttg-red-second-three.mjs';
import {legalTtgRed050Main,resolveTtgRed050Main,expireTtgRed050Energy} from './ttg-red-third-three.mjs';
import {legalTtgRed053Main,resolveTtgRed053Main} from './ttg-red-fourth-three.mjs';
import {legalRed062Main,resolveRed062Main} from './ttg-red-seventh-three.mjs';
import {legalRed068Main,resolveRed068Main,expireRed068AtTurnEnd} from './ttg-red-ninth-three.mjs';
import {legalRed069Main,resolveRed069Main} from './ttg-red-tenth-three.mjs';
import {legalRedHighRaids,resolveRedHighRaid,legalRedRaidQueue,resolveRedRaidQueue} from './ttg-red-eleventh-three.mjs';
import {legalRed075,resolveRed075,legalRed076Raids,resolveRed076Raid,legalRed076Look,resolveRed076Look,legalRed076Main,resolveRed076Main,legalRed076Discard,resolveRed076Discard,legalRed077Fields,resolveRed077Field,legalRed077Recover,resolveRed077Recover} from './ttg-red-twelfth-three.mjs';
import {legalRed080Events,resolveRed080Event,expireRed080AtOwnTurnEnd} from './ttg-red-thirteenth-three.mjs';
import {legalRed061Choices,resolveRed061Choice,legalRed062Retrigger,resolveRed062Retrigger} from './ttg-red-seventh-three.mjs';
import {legalRed056End,resolveRed056End} from './ttg-red-056-after-attack.mjs';
import {legalRed073Leaving,resolveRed073Leaving} from './ttg-red-073-leaving.mjs';

const owned=(s,p)=>[...(s.players?.[p]?.front||[]),...(s.players?.[p]?.energy||[])].filter(Boolean);
const simon=c=>!!c&&(c.nameJa==='シモン'||c.name==='シモン'||(c.stack||[]).some(simon));
const playerOk=p=>Number.isInteger(p)&&(p===0||p===1);
export function legalTtgRuleActions(state,player){
 if(!playerOk(player)||!state?.players?.[player])return [];
 if(state.pending?.kind==='ttgRed073Leaving')return state.pending.player===player?legalRed073Leaving(state):[];
 if(state.pending?.kind==='ttgRed056AfterAttack')return state.pending.player===player?legalRed056End(state):[];
 if(state.pending?.kind==='ttgRedRaidQueue')return state.pending.player===player?legalRedRaidQueue(state):[];
 if(state.pending?.kind==='ttgRed076Look')return state.pending.player===player?legalRed076Look(state):[];
 if(state.pending?.kind==='ttgRed076Discard')return state.pending.player===player?legalRed076Discard(state):[];
 if(state.pending?.kind==='ttgRed077Recover')return state.pending.player===player?legalRed077Recover(state):[];
 if(state.pending?.kind==='ttgRed061')return state.pending.player===player?legalRed061Choices(state):[];
 if(state.pending?.kind==='ttgRed062Retrigger')return state.pending.player===player?legalRed062Retrigger(state):[];
 if(state.pending?.kind==='ttgGreen028Entry')return state.pending.player===player?legalTtgGreen028EntryChoices(state):[];
 if(state.pending?.kind==='ttgGreen029Entry')return state.pending.player===player?legalTtgGreen029EntryChoices(state):[];
 if(state.pending?.kind==='ttgGreen021PhaseStart')return state.pending.player===player?legalGreen021AttackStartChoices(state):[];
 if(state.pending?.kind==='green030Sidelined')return state.pending.player===player?legalGreen030SidelinedChoices(state):[];
 if(state.pending?.kind==='green034Sidelined')return state.pending.player===player?legalGreen034SidelinedChoices(state):[];
 if(state.pending?.kind==='greenHighRaidQueue')return state.pending.player===player?legalGreenHighRaidChoices(state):[];
 if(state.pending?.kind==='greenRetireOrder')return state.pending.player===player?legalGreenRetirementChoices(state):[];
 if(state.pending?.kind==='green012Search')return state.pending.player===player?legalGreen012Search(state):[];
 if(state.pending?.kind==='green012Discard')return state.pending.player===player?legalGreen012Discards(state):[];
 const pending=state.pendingTtgTrigger;
 if(pending){
  if(pending.player!==player||!TTG_IMPLEMENTED_EVENT_TRIGGERS.includes(pending.card?.cardId))return [];
  const offered=legalTtgEventTriggerChoices(state);
  // A life trigger is optional; a player can decline even when targets exist.
  return [...offered.map(x=>({...x,player})),{type:'resolveTtgTrigger',player,decline:true}];
 }
 if(state.active!==player||state.pending)return [];
 if(state.phase==='main'){
  const current=withTtgDerivedEnergy(state,player);
  const list=[...legalTtgHandEvents(current,player).map(a=>({...a,player})),...legalTtgRaidEntries(current,player),...legalGreenEventActions(current,player),...legalGreen040RemovedActions(current,player),...legalGreen025Actions(current,player),...legalTtgGreen028Raids(current,player),...legalTtgGreen029Raids(current,player),...legalGreen008Raids(current,player),...legalGreen030Raids(current,player),...legalGreenSitePlays(current,player),...legalGreen012Plays(current,player),...legalGreen012Double(current,player),...legalGreenHighRaids(current,player),...legalTtgRed046Main(current,player),...legalTtgRed050Main(current,player),...legalTtgRed053Main(current,player),...legalRed062Main(current,player),...legalRed068Main(current,player),...legalRed069Main(current,player),...legalRedHighRaids(current,player),...legalRed075(current,player),...legalRed076Raids(current,player),...legalRed076Main(current,player),...legalRed077Fields(current,player),...legalRed080Events(current,player)];
  const pl=state.players[player];
  for(const c of owned(state,player)){
   if(c.cardId==='TTG-1-003')list.push(...legalGreen003(current,{player,uid:c.uid}));
   if(c.cardId==='TTG-1-011')list.push(...legalGreen011(current,{player,uid:c.uid}));
   if(c.cardId==='TTG-1-015')list.push(...legalGreen015(current,{player,uid:c.uid}));
   if(c.cardId==='TTG-1-016')list.push(...legalGreen016(current,{player,uid:c.uid}));
   if(c.cardId==='TTG-1-017')list.push(...legalGreen017(current,{player,uid:c.uid}));
   if(c.cardId==='TTG-1-018')list.push(...legalGreen018(current,{player,uid:c.uid}));
   if(c.cardId==='TTG-1-022')list.push(...legalGreen022(current,{player,uid:c.uid}));
   if(!c.ready)continue;
   if(c.cardId==='TTG-1-002'){
    for(const targetUid of eligibleTtgViral002Targets(state,{player,uid:c.uid}))
     list.push({type:'activateViral002',player,uid:c.uid,targetUid});
   }
   if(c.cardId==='TTG-1-059'){
    for(const target of owned(state,player).filter(simon))
     list.push({type:'activateNia059',player,uid:c.uid,targetUid:target.uid});
   }
   if(c.cardId==='TTG-1-063'&&c.ttg063ActivatedTurn!==state.turn)
    list.push({type:'activateButa063',player,uid:c.uid});
  }
  return list;
 }
 if(state.phase==='attack'&&state.attackingUid){
  const options=eligibleTtg071AttackBuffTargets(state,{player,uid:state.attackingUid});
  if(options.length)return [...options.map(targetUid=>({type:'kittan071AttackBuff',player,uid:state.attackingUid,targetUid})),{type:'kittan071AttackBuff',player,uid:state.attackingUid,targetUid:null}];
  if(state.players[player].front?.some(x=>x?.uid===state.attackingUid&&x.cardId==='TTG-1-071')&&
    state.characterAttacksThisTurn===1&&!state.usedTtgAttackTriggers?.[state.turn+':'+state.attackingUid])
    return [{type:'kittan071AttackBuff',player,uid:state.attackingUid,targetUid:null}];
 }
 if(state.phase==='move'){
  const pl=state.players[player],list=[];
  for(const c of pl.front||[])if(c?.cardId==='TTG-1-020')list.push(...legalGreen020Step(state,{player,uid:c.uid}));
  for(const c of pl.front||[])if(c?.cardId==='TTG-1-021')list.push(...legalGreen021Step(state,{player,uid:c.uid}));
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
 (a.apUid===undefined||a.apUid===action.apUid)&&
 (a.mode===undefined||a.mode===action.mode)&&
 (a.targetUid===undefined||a.targetUid===action.targetUid)&&
 (a.toSlot===undefined||a.toSlot===action.toSlot)&&
 (a.handUid===undefined||a.handUid===action.handUid)&&
 (a.baseUid===undefined||a.baseUid===action.baseUid)&&
 (a.line===undefined||a.line===action.line)&&
 (a.slot===undefined||a.slot===action.slot)&&
 (a.replaceUid===undefined||a.replaceUid===action.replaceUid)&&
 (a.outsideUid===undefined||a.outsideUid===action.outsideUid)&&
 (a.recoverUid===undefined||a.recoverUid===action.recoverUid)&&
 (a.handUid===undefined||a.handUid===action.handUid)&&
 (a.raidUid===undefined||a.raidUid===action.raidUid)&&
 (a.step===undefined||a.step===action.step)&&
 (a.takeUid===undefined||a.takeUid===action.takeUid)&&
 (a.discardUid===undefined||a.discardUid===action.discardUid)&&
 (a.effects===undefined||JSON.stringify(a.effects)===JSON.stringify(action.effects))&&
 (a.retirementEffect===undefined||a.retirementEffect===action.retirementEffect)&&
 (a.targetUids===undefined||
    (Array.isArray(action.targetUids)&&JSON.stringify(a.targetUids)===JSON.stringify(action.targetUids))||
    a.targetUids.includes(action.targetUid)||
    (a.maxReadyAp!==undefined&&action.targetUid==null))&&
 (a.decline===undefined||a.decline===action.decline)
);
export function dispatchTtgRuleAction(state,action){
 if(!playerOk(action?.player)||!actionMatches(legalTtgRuleActions(state,action.player),action))
  throw new Error('Illegal or unavailable TTG rule action');
 if(action.type==='resolveTtgTrigger')return resolveTtgEventLifeTrigger(state,action);
 if(action.type==='playTtgEvent')return withTtgDerivedEnergy(dispatchTtgHandEvent(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='playGreenEvent')return withTtgDerivedEnergy(resolveGreenEvent(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='green040Double')return withTtgDerivedEnergy(resolveGreen040Removed(state,action),action.player);
 if(action.type==='green025Lordgenome')return withTtgDerivedEnergy(resolveGreen025(state,action),action.player);
 if(action.type==='ttgGreen028Raid')return withTtgDerivedEnergy(dispatchTtgGreen028Raid(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='ttgGreen028Entry')return withTtgDerivedEnergy(resolveTtgGreen028Entry(state,action),action.player);
 if(action.type==='ttgGreen029Raid')return withTtgDerivedEnergy(dispatchTtgGreen029Raid(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='ttgGreen029Entry')return withTtgDerivedEnergy(resolveTtgGreen029Entry(state,action),action.player);
 if(action.type==='green008Raid')return withTtgDerivedEnergy(resolveGreen008Raid(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='green030Raid')return withTtgDerivedEnergy(resolveGreen030Raid(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='green030Recover')return withTtgDerivedEnergy(resolveGreen030Sidelined(state,action),action.player);
 if(action.type==='green012Play')return withTtgDerivedEnergy(resolveGreen012Play(state,action),action.player);
 if(action.type==='green012Double')return withTtgDerivedEnergy(resolveGreen012Double(state,action),action.player);
 if(action.type==='green012Search')return withTtgDerivedEnergy(resolveGreen012Search(state,action),action.player);
 if(action.type==='green012Discard')return withTtgDerivedEnergy(resolveGreen012Discard(state,action),action.player);
 if(action.type==='ttgRed062Main')return withTtgDerivedEnergy(resolveRed062Main(state,action),action.player);
 if(action.type==='ttgRed073Leaving')return withTtgDerivedEnergy(resolveRed073Leaving(state,action),action.player);
 if(action.type==='ttgRed056End')return withTtgDerivedEnergy(resolveRed056End(state,action),action.player);
 if(action.type==='ttgRed061Choice')return withTtgDerivedEnergy(resolveRed061Choice(state,action),action.player);
 if(action.type==='ttgRed062Retrigger')return withTtgDerivedEnergy(resolveRed062Retrigger(state,action),action.player);
 if(action.type==='ttgRedHighRaid')return withTtgDerivedEnergy(resolveRedHighRaid(state,action),action.player);
 if(action.type==='ttgRedRaidEffect')return withTtgDerivedEnergy(resolveRedRaidQueue(state,action),action.player);
 if(action.type==='ttgRed075Main')return withTtgDerivedEnergy(resolveRed075(state,action),action.player);
 if(action.type==='ttgRed076Raid')return withTtgDerivedEnergy(resolveRed076Raid(state,action),action.player);
 if(action.type==='ttgRed076Look')return withTtgDerivedEnergy(resolveRed076Look(state,action),action.player);
 if(action.type==='ttgRed076Main')return withTtgDerivedEnergy(resolveRed076Main(state,action),action.player);
 if(action.type==='ttgRed076Discard')return withTtgDerivedEnergy(resolveRed076Discard(state,action),action.player);
 if(action.type==='ttgRed077Play')return withTtgDerivedEnergy(resolveRed077Field(state,action),action.player);
 if(action.type==='ttgRed077Recover')return withTtgDerivedEnergy(resolveRed077Recover(state,action),action.player);
 if(action.type==='ttgRed080Event')return withTtgDerivedEnergy(resolveRed080Event(state,action),action.player);
 if(action.type==='ttgRed069Main')return withTtgDerivedEnergy(resolveRed069Main(state,action),action.player);
 if(action.type==='ttgRed068Main')return withTtgDerivedEnergy(resolveRed068Main(state,action),action.player);
 if(action.type==='ttgRed053Main')return withTtgDerivedEnergy(resolveTtgRed053Main(state,action),action.player);
 if(action.type==='ttgRed050Main')return withTtgDerivedEnergy(resolveTtgRed050Main(state,action),action.player);
 if(action.type==='ttgRed046Main')return withTtgDerivedEnergy(resolveTtgRed046Main(state,action),action.player);
 if(action.type==='greenHighRaid')return withTtgDerivedEnergy(resolveGreenHighRaid(state,action),action.player);
 if(action.type==='greenHighEffect')return withTtgDerivedEnergy(resolveGreenHighRaidChoice(state,action),action.player);
 if(action.type==='green030Recover'||action.type==='green034Capture'){
  if(state.pending?.kind==='greenRetireOrder')return withTtgDerivedEnergy(resolveGreenRetirementChoice(state,action),action.player);
 }
 if(action.type==='ttgGreenSitePlay')return withTtgDerivedEnergy(resolveGreenSitePlay(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='green034Capture')return withTtgDerivedEnergy(resolveGreen034Sidelined(state,action),action.player);
 if(action.type==='green021Step')return withTtgDerivedEnergy(resolveGreen021Step(state,action),action.player);
 if(action.type==='green021PhaseStart')return withTtgDerivedEnergy(resolveGreen021AttackStart(state,action),action.player);
 if(action.type==='raidTtg')return withTtgDerivedEnergy(dispatchTtgRaidEntry(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type.startsWith('ttgGreen003'))return withTtgDerivedEnergy(resolveGreen003(withTtgDerivedEnergy(state,action.player),action),action.player);
 if(action.type==='ttgGreen011')return withTtgDerivedEnergy(resolveGreen011(state,action),action.player);
 if(action.type==='ttgGreen015')return withTtgDerivedEnergy(resolveGreen015(state,action),action.player);
 if(action.type==='ttgGreen016')return withTtgDerivedEnergy(resolveGreen016(state,action),action.player);
 if(action.type==='ttgGreen017')return withTtgDerivedEnergy(resolveGreen017(state,action),action.player);
 if(action.type==='ttgGreen018')return withTtgDerivedEnergy(resolveGreen018(state,action),action.player);
 if(action.type==='ttgGreen022')return withTtgDerivedEnergy(resolveGreen022(state,action),action.player);
 if(action.type==='ttgGreen020Step')return withTtgDerivedEnergy(resolveGreen020Step(state,action),action.player);
 if(action.type==='activateNia059')return withTtgDerivedEnergy(resolveTtgNia059(state,action),action.player);
 if(action.type==='activateViral002')return withTtgDerivedEnergy(resolveTtgViral002(state,action),action.player);
 if(action.type==='activateButa063')return withTtgDerivedEnergy(resolveTtgButa063(state,action),action.player);
 if(action.type==='stepYoko065')return withTtgDerivedEnergy(resolveTtgYoko065Step(state,action),action.player);
 if(action.type==='kittan071AttackBuff')return withTtgDerivedEnergy(resolveTtg071FirstAttack(state,action),action.player);
 throw new Error('Unsupported TTG action');
}
// Phase hooks must run at their exact transition; they are exported for the
// eventual match dispatcher and may not be skipped for scheduled retirement.
export const beginTtgGreenAttackPhase=state=>withTtgDerivedEnergy(beginGreen021AttackPhase(state,state.active),state.active);
export const resolveTtgMainPhaseEnd=state=>withTtgDerivedEnergy(resolveGreenMainEnd(resolveTtgMainEndRetire(state)),state.active);
export const resolveTtgTurnEnd=state=>{
 const s1=resolveTtgPendingEndTurn(state);
 const s2=resolveTtgTemporaryEnergyEndTurn(s1);
 const s3=resolveGreenTurnEnd(s2);
 const s4=resolveGreenEventTurnEnd(s3);
 const s5=resolveGreen025TurnEnd(s4);
 const s6=resolveGreen008TurnEnd(s5);
 const s7=resolveGreen012TurnEnd(s6);
 return withTtgDerivedEnergy(expireRed080AtOwnTurnEnd(expireTtgRed050Energy(s7),state.active),state.active);
}

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
 if(['ttgRed073Leaving','ttgRed056AfterAttack','ttgRedRaidQueue','ttgRed076Look','ttgRed076Discard','ttgRed077Recover','ttgRed061','ttgRed062Retrigger'].includes(state.pending?.kind))
  return options.find(x=>x.targetUid||x.recoverUid||x.takeUid||x.handUid)||options[0];
 if(state.pending?.kind==='ttgGreen028Entry')return options.find(x=>x.targetUid)||options[0];
 if(state.pending?.kind==='ttgGreen029Entry')return options.find(x=>x.mode==='restPlay'&&x.line==='front')||options.find(x=>x.mode==='hand')||options[0];
 if(state.pending?.kind==='green030Sidelined')return options.find(x=>x.mode==='recover'&&x.line==='front')||options.find(x=>x.mode==='recover')||options[0];
 if(state.pending?.kind==='green034Sidelined')return options.find(x=>x.siteUid)||options[0];
 if(state.pending?.kind==='greenRetireOrder')return options.find(x=>x.retirementEffect==='034'&&x.siteUid)||options.find(x=>x.retirementEffect==='030'&&x.mode==='recover')||options[0];
 if(state.pending?.kind==='greenHighRaidQueue')return options.find(x=>x.step==='viral004'&&x.mode==='attach')||options.find(x=>x.step==='site033'&&x.siteUid)||options.find(x=>x.step==='site034'&&x.siteUid)||options[0];
 if(state.pending?.kind==='green012Search'){
  const x=options[0],takeUid=x.candidates[0]||null;
  return {...x,takeUid,bottomOrderUids:x.revealed.filter(uid=>uid!==takeUid)};
 }
 if(state.pending?.kind==='green012Discard'){
  const x=options[0],pl=state.players[player];
  const hand=pl.hand.slice().sort((a,b)=>(TTG_BY_ID[b.cardId].energy||0)-(TTG_BY_ID[a.cardId].energy||0));
  const used=[];let total=0;for(const c of hand){used.push(c.uid);total+=TTG_BY_ID[c.cardId].energy||0;if(total>=15)break;}
  if(total>=15&&state.players[1-player].front.some(Boolean))return {...x,discardUids:used,mode:'retire',apUid:null,targetUid:state.players[1-player].front.find(Boolean).uid};
  return {...x,discardUids:hand.length?[hand[0].uid]:[],mode:'readyAP',apUid:pl.apCards[0].uid,targetUid:null};
 }
 if(state.pending?.kind==='ttgGreen021PhaseStart')return options.find(x=>x.mode==='move'&&x.replaceUid==null)||options.find(x=>x.mode==='move')||options[0];
 const green012=options.find(x=>x.type==='green012Play');
 if(green012)return {...green012,payApUids:state.players[player].apCards.filter(x=>x.ready).slice(0,2).map(x=>x.uid)};
 const green012Double=options.find(x=>x.type==='green012Double');if(green012Double)return green012Double;
 const high=options.find(x=>x.type==='greenHighRaid'&&x.line==='front')||options.find(x=>x.type==='greenHighRaid');
 if(high)return {...high,payApUids:state.players[player].apCards.filter(x=>x.ready).slice(0,high.requiredAp).map(x=>x.uid)};
 const green030=options.find(x=>x.type==='green030Raid'&&x.line==='front')||options.find(x=>x.type==='green030Raid');
 if(green030)return {...green030,payApUids:state.players[player].apCards.filter(x=>x.ready).slice(0,green030.requiredAp).map(x=>x.uid)};
 const site=options.find(x=>x.type==='ttgGreenSitePlay');
 if(site)return {...site,payApUids:state.players[player].apCards.filter(x=>x.ready).slice(0,site.requiredAp).map(x=>x.uid)};
 const green008=options.find(x=>x.type==='green008Raid'&&x.line==='front')||options.find(x=>x.type==='green008Raid');
 if(green008)return {...green008,payApUids:state.players[player].apCards.filter(x=>x.ready).slice(0,1).map(x=>x.uid)};
 const green029=options.find(x=>x.type==='ttgGreen029Raid'&&x.line==='front')||options.find(x=>x.type==='ttgGreen029Raid');
 if(green029)return {...green029,payApUids:state.players[player].apCards.filter(x=>x.ready).slice(0,green029.requiredAp).map(x=>x.uid)};
 const green028=options.find(x=>x.type==='ttgGreen028Raid'&&x.line==='front')||options.find(x=>x.type==='ttgGreen028Raid');
 if(green028){
  return {...green028,payApUids:state.players[player].apCards.filter(x=>x.ready).slice(0,green028.requiredAp).map(x=>x.uid)};
 }
 const raid=options.find(x=>x.type==='raidTtg'&&x.line==='front')||options.find(x=>x.type==='raidTtg');
 if(raid){
  const payApUids=state.players[player].apCards.filter(x=>x.ready).slice(0,raid.requiredAp).map(x=>x.uid);
  return {type:raid.type,player,handUid:raid.handUid,baseUid:raid.baseUid,line:raid.line,slot:raid.slot,payApUids};
 }
 const eventGreen=options.filter(x=>x.type==='playGreenEvent').sort((a,b)=>(b.targetUids?.length||0)-(a.targetUids?.length||0))[0];
 if(eventGreen){const payApUids=state.players[player].apCards.filter(x=>x.ready).slice(0,eventGreen.requiredAp).map(x=>x.uid);
  return {type:'playGreenEvent',player,handUid:eventGreen.handUid,cardId:eventGreen.cardId,targetUid:eventGreen.targetUid,targetUids:eventGreen.targetUids,payApUids};}
 const lordgenome=options.find(x=>x.type==='green025Lordgenome'&&!state.players[player].apCards.find(c=>c.uid===x.apUid)?.ready)||options.find(x=>x.type==='green025Lordgenome');
 if(lordgenome)return lordgenome;
 const double=options.find(x=>x.type==='green040Double');if(double)return double;
 const attackingBuff=options.filter(x=>x.type==='kittan071AttackBuff'&&x.targetUid)
  .sort((a,b)=>{const c=owned(state,player);const bp=uid=>c.find(x=>x.uid===uid)?.currentBp??c.find(x=>x.uid===uid)?.bp??0;
   return bp(b.targetUid)-bp(a.targetUid);})[0]||options.find(x=>x.type==='kittan071AttackBuff');
 if(attackingBuff)return attackingBuff;
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
 return buff||options.find(x=>x.type==='ttgGreen003Front')||options.find(x=>x.type==='ttgGreen003Ready')||
    options.find(x=>x.type==='ttgGreen015')||options.find(x=>x.type==='ttgGreen016')||
    options.find(x=>x.type==='ttgGreen017')||options.find(x=>x.type==='ttgGreen011')||
    options.find(x=>x.type==='ttgGreen018')||options.find(x=>x.type==='ttgGreen022')||
    options.find(x=>x.type==='activateViral002')||options.find(x=>x.type==='activateButa063')||
    options.find(x=>x.type==='ttgGreen020Step')||options.find(x=>x.type==='stepYoko065')||null;
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
