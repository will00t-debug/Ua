// Printed UNION ARENA standard life triggers for the green TTG subset.
// The triggered physical card stays in owner's OUTSIDE pending resolution,
// so it is never counted twice or lost when the player selects a target.
// Supports DRAW, ACTIVE, GET, SPECIAL, FINAL, green COLOR, and the
// verified 028/029 Raid Life trigger. Other higher Raid triggers remain gated.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {greenTtgNeedsEnergy} from './ttg-green-passives.mjs';
import {canDeployTtgCard} from './ttg-actions.mjs';
import {TTG_GREEN_ENTRY_IDS} from './ttg-green-entry.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
import {legalGreenHighLifeRaids,resolveGreenHighLifeRaid} from './ttg-green-high-raid.mjs';
import {legalRedLifeRaids,resolveRedLifeRaid} from './ttg-red-life-raids.mjs';
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
  if(['TTG-1-045','TTG-1-062'].includes(card.cardId)){
   for(const enemy of state.players[1-q.player].front.filter(Boolean))
    if(candidate(enemy)&&(enemy.currentBp??TTG_BY_ID[enemy.cardId]?.bp??Infinity)<=2500)
     choices.push({...base,mode:'colorRed',targetUid:enemy.uid});
  }else for(const h of pl.hand){
   const printed=TTG_BY_ID[h.cardId];
   if(!printed||printed.type!=='character'||printed.color!=='green'||printed.ap!==1||
      greenTtgNeedsEnergy(state,q.player,h)>2||!canDeployTtgCard(pl,h))continue;
   for(const line of ['energy','front'])for(let slot=0;slot<4;slot++)
    if(!pl[line][slot])choices.push({...base,mode:'color',handUid:h.uid,line,slot});
  }
 }else if(trigger==='raid'){
  // Official RAID Trigger: add revealed card to hand OR, with enough GREEN
  // energy and a legal Raid base, Raid it without consuming AP.
  // Other Raid cards intentionally remain unimplemented.
  if(['TTG-1-071','TTG-1-072','TTG-1-073','TTG-1-074','TTG-1-076'].includes(card.cardId)){
   choices.push({...base,mode:'raidHand'});
   for(const choice of legalRedLifeRaids(state,{player:q.player,cardUid:q.cardUid}))
    choices.push({...base,mode:'raid',...choice});
   return choices;
  }
  if(!['TTG-1-027','TTG-1-028','TTG-1-029','TTG-1-031'].includes(card.cardId))return [];
  choices.push({...base,mode:'raidHand'});
  if(['TTG-1-027','TTG-1-031'].includes(card.cardId)){
   for(const choice of legalGreenHighLifeRaids(state,{player:q.player,cardUid:q.cardUid}))
    choices.push({...base,mode:'raid',...choice});
   return choices;
  }
  const printed=TTG_BY_ID[card.cardId],energy=calculateTtgEnergyByColor(state,q.player);
  if(energy.green>=printed.energy&&!pl.front.some(c=>c?.cardId==='TTG-1-004')){
   for(const target of field(pl)){
    const name=idName(target.card),valid=['シモン','ヴィラル'].includes(name)&&
     !(target.card.stack||[]).length&&!(target.card.under||[]).length;
    if(!valid)continue;
    const positions=[{line:target.line,slot:target.slot}];
    if(target.line==='energy')for(let slot=0;slot<pl.front.length;slot++)
     if(!pl.front[slot])positions.push({line:'front',slot});
    for(const position of positions)choices.push({...base,mode:'raid',baseUid:target.card.uid,...position});
   }
  }
  return choices;
 }
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
 if(state.pendingTtgLife||state.pending)return state;
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
  x.handUid===action.handUid&&x.baseUid===action.baseUid&&x.sourceUid===action.sourceUid&&
  x.raidKind===action.raidKind&&x.line===action.line&&x.slot===action.slot);
 if(!valid)throw new Error('Illegal life trigger action or target');
 let result=structuredClone(state);let owner=result.players[q.player];
 const ownerIndex=owner.outside.findIndex(x=>x.uid===q.cardUid);
 if(action.mode==='raidHand'){
  owner.hand.push(owner.outside.splice(ownerIndex,1)[0]);
 }else if(action.mode==='raid'&&action.raidKind==='red'){
  result=resolveRedLifeRaid(result,{player:q.player,cardUid:q.cardUid,sourceUid:action.sourceUid,
   line:action.line,slot:action.slot});
  owner=result.players[q.player];
  if(!owner.life.length&&result.pending)result.pendingLifeOutcome={player:q.player};
 }else if(action.mode==='raid'&&['TTG-1-027','TTG-1-031'].includes(card.cardId)){
  result=resolveGreenHighLifeRaid(result,{player:q.player,cardUid:q.cardUid,sourceUid:action.sourceUid,
   raidKind:action.raidKind,line:action.line,slot:action.slot});
  owner=result.players[q.player];
 }else if(action.mode==='raid'){
  const source=field(owner).find(x=>x.card.uid===action.baseUid);
  if(!source||owner[action.line][action.slot]&&
    !(source.line===action.line&&source.slot===action.slot))throw new Error('Raid life destination changed');
  const original=source.card,top=owner.outside.splice(ownerIndex,1)[0];
  owner[source.line][source.slot]=null;
  owner[action.line][action.slot]={...top,stack:[original],under:[],ready:true,
   raidedTurn:state.turn,enteredTurn:state.turn};
  // Raid front Entry effects are offered even if it is the final life card.
  if(action.line==='front')result.pending={kind:top.cardId==='TTG-1-028'?'ttgGreen028Entry':'ttgGreen029Entry',
   player:q.player,uid:top.uid};
  if(!owner.life.length)result.pendingLifeOutcome={player:q.player};
 }else if(action.mode==='colorRed'){
  const opp=result.players[1-q.player],idx=opp.front.findIndex(x=>x?.uid===action.targetUid);
  if(idx<0)throw new Error('RED COLOR target left enemy front');
  const flatten=x=>[{uid:x.uid,cardId:x.cardId},...(x.stack||[]).flatMap(flatten),...(x.under||[]).flatMap(flatten)];
  opp.outside.push(...flatten(opp.front[idx]));opp.front[idx]=null;
 }else if(action.mode==='get'){
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
