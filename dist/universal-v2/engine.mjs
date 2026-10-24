import {DISCOUNT_KIND,grantHandDiscount,handPlayApPlan,definitionGrantsDiscount} from './ap-discounts.mjs';
// UNIVERSAL RULES V2 EXPERIMENT. No production title uses this reducer yet.
// Pure physical-card reducer: common UA zones/AP/phases/limited effects/Raid
// and official Q99 optional GET/DRAW/FINAL. Unsupported keywords FAIL CLOSED.
import {validateUniversalDeck} from './pack.mjs';
import {appendCompletedMove,matchesCompletedMove,V2_MOVE_REASONS} from './zone-move-events.mjs';
import {planSimultaneousLifeReveal} from './life-reveal-batch.mjs';
import {selectionHandDiscardTaxPlan} from './selection-hand-tax.mjs';
import {matchesPrintedRequiredEnergyAtMost} from './ap-discounts.mjs';
import {cardHasName,cardHasTrait,matchesOwnDistinctTraits,matchesV2LiveCondition,
 ownRestPrintedBpCount,retiredThisTurn,countOwnOutsideDistinctPrintedNames,
 countOwnOutsidePhysicalGroups} from './field-conditions.mjs';
import {refreshFieldActive,expireContinuousStates,pruneContinuousStates,
 fieldRestrictions,validateContinuousStates,grantContinuousState,
 attemptFieldActive,originalEffectsDisabled,selectionApSurcharge,hasFrontEnergyPermission,
 effectChoiceProtected} from './continuous-states.mjs';
export const UNIVERSAL_V2_VERSION='ua-v2.0';
const playerIndex=n=>n===0||n===1;
const field=p=>[...p.front,...p.energy].filter(Boolean);
// A match accepts one legacy pack or a pair of independently registered packs.
// Card ownership is determined by the physical UID, never by card ID alone:
// different titles may print identical local card identifiers.
function playerPacks(pack){
 const result=Array.isArray(pack)?pack:[pack,pack];
 if(result.length!==2||result.some(p=>p?.kind!=='ua-v2-pack'))
  throw Error('Expected one valid pack or a pair of registered title packs');
 return result;
}
const card=(pack,c)=>{
 const n=/^([01])-\d+$/.exec(c?.uid||'');
 if(!n)throw Error('Card owner cannot be determined from physical UID');
 const printed=playerPacks(pack)[Number(n[1])].cards[c.cardId];
 if(!printed)throw Error('Card not registered in physical owner title');
 return printed;
};
const titleOf=(pack,owner)=>playerPacks(pack)[owner].id;
function defaultEntryReady(pack,s,owner,physical){
 return card(pack,physical).enterAlwaysActive===true||
  card(pack,physical).enterActiveIfOpponentRest===true&&
  field(s.players[1-owner]).some(c=>card(pack,c).type==='character'&&!c.ready);
}
const random=s=>{let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;};
function shuffle(s,list){
 for(let i=list.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[list[i],list[j]]=[list[j],list[i]];}
 return list;
}
const clone=source=>structuredClone(source);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// 「自分の効果で登場」 is an effect that puts this physical card onto the
// field. Paying AP to play or Raid from hand is a play. A life trigger also
// puts a card into play, but no MST-1-004 FAQ was found that counts it, so
// lifeColor / lifeRaid stay outside this set and the condition fails closed.
const OWN_EFFECT_ENTRY=new Set(['outsideEffect','outsideEffectRaid','recoveredEffect']);
// Set only for the synchronous caller that just queued one retirement.
// Not match state: AI simulations must not leak it into a later action.
let retirementJobsInserted=0;
function actor(s){return s.pending?.player??s.active;}
export const universalActor=actor;
function maySubstituteColorTriggerField(pack,s,owner,profile){
 return s.active!==owner&&profile?.op==='deployHandCharacter'&&
  field(s.players[owner]).some(c=>!originalEffectsDisabled(s,c)&&
   card(pack,c).colorTriggerFieldSubstitution===profile.color);
}
function draw(pack,s,p,count=1,{reason='rule',sourceUid=null}={}){
 // Every card drawn receives an exact completed deck→hand journal entry.
 // No source attribution is invented for rule draws or unpaid previews.
 for(let i=0;i<count&&s.players[p].deck.length;i++)
  moveOwnedLinear(pack,s,{owner:p,from:'deck',to:'hand',index:0,reason,sourceUid});
}
// Each card requires its OWN printed energy color. A mixed-color deck may be
// legal, but three green icons do not pay a purple energy-3 requirement.
function hasFacedownUnder(c){
 const inspect=x=>(x.under||[]).some(v=>v.faceDown===true||inspect(v))||
  (x.stack||[]).some(v=>v.faceDown===true||inspect(v));
 return !!c&&inspect(c);
}
function raidNamePresent(pack,s,owner,name){
 // The visible field card may use a printed alias. A buried Raid layer keeps
 // only its original printed name: Q50 stops the layer's effects, and Q55
 // treats the stack as the top card.
 const buried=c=>card(pack,c).name===name||(c.stack||[]).some(buried);
 const inspect=c=>cardHasName(card(pack,c),name,originalEffectsDisabled(s,c))||
  (c.stack||[]).some(buried);
 return field(s.players[owner]).some(inspect);
}
// Normally only own ENERGY-line cards produce energy. Source-pinned
// frontGeneratesEnergy characters also produce from their own FRONT line.
// Use physical live zones, not a cached production or hand-card flag.
export function universalCardEnergy(pack,s,p,c){
 const energyCard=s.players[p].energy.find(x=>x&&x.uid===c?.uid);
 const live=energyCard||s.players[p].front.find(x=>x&&x.uid===c?.uid);
 if(!live)return 0;
 const inEnergy=!!energyCard;
 // Callers may retain a physical-card reference across immutable dispatches.
 // Resolve READY, printed identity and buffs from the current state's UID.
 c=live;
 const d=card(pack,c),profile=d.conditionalTraitEnergy;
 const suppressed=originalEffectsDisabled(s,c);
 if(!inEnergy&&!((d.frontGeneratesEnergy&&!suppressed)||hasFrontEnergyPermission(s,p,c)))return 0;
 const pIndex=p;
 const activeBonus=!suppressed&&c.ready?(d.activeExtraEnergy||0):0;
 const timedBonus=(c.buffs||[]).filter(b=>b.untilTurn===s.turn)
  .reduce((n,b)=>n+(b.energy||0),0);
 const passiveBonus=(suppressed?[]:d.passiveBonuses).reduce((n,p)=>n+(p.extraEnergy&&
  matchesV2LiveCondition(s,pIndex,c.uid,p.condition,x=>card(pack,x),()=>0)?
  p.extraEnergy:0),0);
 const distinctBonus=!suppressed&&profile&&(!profile.requiresActive||c.ready)&&
  matchesOwnDistinctTraits(s,p,c.uid,profile,x=>card(pack,x))?
  profile.extraEnergy:0;
 return d.gen+activeBonus+distinctBonus+passiveBonus+timedBonus;
}
export function universalEnergyByColor(pack,s,p){
 const counts=Object.create(null);
 const producers=[...s.players[p].energy,
  ...s.players[p].front.filter(c=>c&&((card(pack,c).frontGeneratesEnergy&&!originalEffectsDisabled(s,c))||
   hasFrontEnergyPermission(s,p,c)))];
 for(const c of producers){
  if(!c)continue;
  const d=card(pack,c);
  counts[d.color]=(counts[d.color]||0)+universalCardEnergy(pack,s,p,c);
 }
 return counts;
}
function calcEnergy(pack,s,p){
 return Object.values(universalEnergyByColor(pack,s,p)).reduce((n,c)=>n+c,0);
}
export const universalEnergy=calcEnergy;
const bpVisit=new Set();
function bp(pack,s,c){
 const printed=card(pack,c),suppressed=originalEffectsDisabled(s,c);
 const owner=Number(String(c.uid).split('-')[0]);
 const turnBp=suppressed?0:s.active===owner?(printed.ownTurnBp||0):(printed.opponentTurnBp||0);
 const facedown=!suppressed&&hasFacedownUnder(c)?(printed.conditionalUnderFaceDown?.bp||0):0;
 const buffs=(c.buffs||[]).filter(b=>b.untilTurn===s.turn||
  Number.isInteger(b.untilOwnTurnStart)&&
  s.players[owner].ownTurns<b.untilOwnTurnStart).reduce((n,b)=>n+(b.bp||0),0);
 // A current-BP condition may look back at this card. Stop there instead of
 // walking the same passive again. Printed BP, turn BP, and this-turn buffs
 // stay visible. Q749 still sees an effect bonus on the card being measured.
 if(bpVisit.has(c.uid))return (printed?.bp||0)+turnBp+facedown+buffs;
 bpVisit.add(c.uid);
 try{
  return (printed?.bp||0)+turnBp+facedown+buffs+
   (suppressed?0:printed.passiveBonuses.reduce((n,p)=>{
    if(p.bpEach)return n+p.bpEach*ownRestPrintedBpCount(s,owner,c.uid,p.condition,x=>card(pack,x));
    return n+(p.bp&&matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
     ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x))?p.bp:0);
   },0));
 }finally{bpVisit.delete(c.uid);}
}
export const universalBp=bp;
export function universalAttackDamage(pack,s,c){
 const d=card(pack,c),owner=Number(String(c.uid).split('-')[0]);
 if(d.type!=='character'||originalEffectsDisabled(s,c))return 1;
 // A resolved BLOCK battle win by ANOTHER own physical character is a
 // temporary replacement keyword. It does not invent Impact or extra LIFE.
 const gained=c.otherOwnBattleWinDamage2;
 // 【ダメージ（2）】 replaces the 1 direct-attack damage. It is not Impact.
 const base=Math.max(d.printedAttackDamage||1,
  gained&&gained.turn===s.turn&&
   gained.stamp===c.fieldEntryStamp?2:1);
 return base+d.passiveBonuses.reduce((n,p)=>n+(p.extraDamage&&
  matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
   ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x))?p.extraDamage:0),0);
}
// A self-granted attack permission is attached to the physical incarnation
// only, and ends with the actual turn, not an assumed next player phase.
// Printed own-effect-granted attack-end swap survives loss of original effects
// (official Q2228). The earned UID and incarnation must still be current.
function hasEarnedAttackEndSwap(s,c){
 const g=c?.attackEndSwapGranted;
 return !!g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp;
}
function attackEndSwapAvailable(pack,s,c){
 return !!c&&((!!card(pack,c).attackEndSwap&&!originalEffectsDisabled(s,c))||
  hasEarnedAttackEndSwap(s,c));
}
function hasCurrentBattleGrant(s,c,property){
 const g=c?.[property];
 return !!g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp&&
  !originalEffectsDisabled(s,c);
}
// Invoked only at an actual BLOCK battle outcome, never at LIFE damage.
// Attacker wins equality; blocker must be strictly greater to win. This
// shared live grant applies to both sides without a title-specific reducer.
function grantBattleWinToOtherOwn(pack,s,owner,winner,role){
 // Keep legacy battles without printed observers exactly unchanged.
 // Physical stamp validation applies when an actual ability is listening.
 const watchers=field(s.players[owner]).filter(c=>c.uid!==winner?.uid&&
  card(pack,c).otherOwnBattleWonDamageTwo&&!originalEffectsDisabled(s,c));
 if(!watchers.length)return;
 if(!['attacker','blocker'].includes(role)||
  !winner||typeof winner.uid!=='string'||
  !Number.isInteger(winner.fieldEntryStamp)||winner.fieldEntryStamp<1)
  throw Error('Invalid physical combat victory');
 for(const watcher of watchers){
  watcher.otherOwnBattleWinDamage2={
   turn:s.turn,stamp:watcher.fieldEntryStamp,
   winnerUid:winner.uid,winnerStamp:winner.fieldEntryStamp,role
  };
 }
}
// Earned only at a real attacking CHARACTER-vs-CHARACTER victory, not LIFE.
function queueAttackWinRecovery(pack,s,owner,attacker){
 const rule=card(pack,attacker).attackWinRecover;
 if(!rule||originalEffectsDisabled(s,attacker))return;
 if(s.active!==owner||s.phase!=='attack'||!(s.attacksByUid[attacker.uid]>=1)||
  !Number.isInteger(attacker.fieldEntryStamp)||attacker.fieldEntryStamp<1)
  throw Error('No genuine attacking victory recovery provenance');
 s.effectQueue.splice(retirementJobsInserted,0,{
  op:'resolveAttackWinRecovery',owner,sourceUid:attacker.uid,
  sourceStamp:attacker.fieldEntryStamp,sourceCardId:attacker.cardId});
}
function impactOnBattleWin(pack,s,c){
 const d=card(pack,c);
 if(originalEffectsDisabled(s,c))return 0;
 // Printed impact and the facedown-under profile stay separate from each
 // other and from a live passive impact. Pack validation refuses stacking.
 if(d.printedImpact)return d.printedImpact;
 if(d.conditionalImpactBpAtLeast!==null&&
  bp(pack,s,c)>=d.conditionalImpactBpAtLeast)return 1;
 const under=hasFacedownUnder(c)?(d.conditionalUnderFaceDown?.impact||0):0;
 if(under)return under;
 const owner=Number(String(c.uid).split('-')[0]);
 return d.passiveBonuses.reduce((n,p)=>n+(p.impact&&
  matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
   ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x))?p.impact:0),0);
}
export function universalImpact(pack,s,c){return impactOnBattleWin(pack,s,c);}
function protectedLeave(pack,s,c){
 const profile=card(pack,c).conditionalUnderFaceDown;
 return !originalEffectsDisabled(s,c)&&!!profile&&hasFacedownUnder(c)&&bp(pack,s,c)>=profile.leaveReplacementMinBp;
}
// Facedown cards can survive several Raid generations. If more than one is
// beneath a character, the owner selects the physical UID to sacrifice.
function facedownChoices(top){
 const found=[];
 const walk=c=>{
  for(const x of c.under||[]){
   if(x.faceDown===true)found.push(x.uid);
   walk(x);
  }
  for(const x of c.stack||[])walk(x);
 };
 walk(top);
 return found;
}
function detachFacedown(top,uid){
 const walk=c=>{
  for(let i=0;i<(c.under||[]).length;i++){
   const x=c.under[i];
   if(x.uid===uid&&x.faceDown===true)return c.under.splice(i,1)[0];
   const nested=walk(x);if(nested)return nested;
  }
  for(const x of c.stack||[]){
   const nested=walk(x);if(nested)return nested;
  }
  return null;
 };
 return walk(top);
}
// Shared named/trait/color/type selector, always resolved with the physical
// card owner's own title pack. Never use the other player's printed ID table.
function matchesFilter(pack,s,physical,filter){
 const printed=card(pack,physical);
 if(filter.field==='trait')return cardHasTrait(printed,filter.value);
 if(filter.field==='traitlessCharacterOrField')return filter.value===true&&
  ['character','field'].includes(printed.type)&&!(printed.traits||[]).length;
 if(filter.field==='printedRequiredEnergyAtMost')return matchesPrintedRequiredEnergyAtMost(printed,filter.value);
 // Name filters see the alias everywhere this predicate is asked, except a
 // live field card whose original text is negated. Callers pass deck,
 // outside, or visible field cards. They do not pass buried Raid layers.
 if(filter.field==='name')return cardHasName(printed,filter.value,originalEffectsDisabled(s,physical));
 if(filter.field==='printedNameAny')return filter.values.includes(printed.name);
 return printed[filter.field]===filter.value;
}
function filteredChoices(pack,s,cards,filter){
 return cards.filter(c=>matchesFilter(pack,s,c,filter)).map(c=>c.uid);
}
function matchesSearch(pack,s,physical,query){
 if(!query.filters)return matchesFilter(pack,s,physical,query.filter);
 const result=query.filters.map(f=>matchesFilter(pack,s,physical,f));
 return query.logic==='all'?result.every(Boolean):result.some(Boolean);
}
function searchChoices(pack,s,cards,query){
 return cards.filter(c=>matchesSearch(pack,s,c,query)).map(c=>c.uid);
}
function matchesOutsideRecovery(pack,s,c,q){
 if(q.filter)return matchesFilter(pack,s,c,q.filter);
 const d=card(pack,c);
 if(q.excludeName&&cardHasName(d,q.excludeName))return false;
 if(q.printedBpLimit!==undefined)
  return d.type==='character'&&d.bp<=q.printedBpLimit;
 if(q.traitlessEnergyLimit!==undefined)
  return d.type==='character'&&d.traits.length===0&&d.energy<=q.traitlessEnergyLimit;
 return d.color===q.color&&d.energy<=q.energy;
}
// Stamped only AFTER the actual card reaches its new zone. The source
// descriptor is snapshotted from the field at move time (not from replay text).
function recordCompletedMove(pack,s,{physical,owner,controller=owner,from,to,reason,sourceUid=null,attachedToUid=null,wasFaceDown=false}){
 const activeSource=sourceUid?[...s.players[0].front,...s.players[0].energy,
  ...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===sourceUid):null;
 // When the source bounces itself, it just left the field. The completed
 // move still carries the exact physical source object, not a guessed alias.
 const source=activeSource||(sourceUid===physical.uid&&
  ['front','energy'].includes(from)?physical:null);
 const definition=source?card(pack,source):null;
 const event=appendCompletedMove(s,{uid:physical.uid,cardId:physical.cardId,owner,controller,
  from,to,reason,sourceUid,sourceCardId:source?.cardId??null,
  sourceName:definition?.name??null,sourceColor:definition?.color??null,
  sourceOnField:!!source,attachedToUid,wasFaceDown});
 // Snapshot READY field listeners at the exact move, not when the source
 // program later finishes. Earned triggers survive later source changes.
 // This is provenance within the existing ledger, never a second queue.
 if(owner===controller&&from==='hand'&&to==='outside'&&
  ['payment','own-effect'].includes(reason)&&event.sourceOnField){
  const earned=field(s.players[owner]).filter(w=>{
   const observer=card(pack,w).moveObserver;
   return !!observer&&w.ready&&!originalEffectsDisabled(s,w)&&
    !(w.under||[]).some(x=>x.faceDown===true)&&
    matchesCompletedMove(event,observer.when);
  }).map(w=>({sourceUid:w.uid,sourceStamp:w.fieldEntryStamp}));
  if(earned.length)event.earnedFieldObservers=earned;
 }
 // Keep the prior turnEffectZoneMoves boolean contract unchanged, including
 // historical forced opponent discards. It is NOT source-sensitive and must
 // NOT be used for new specific-source triggers; zoneMoveEvents is authoritative.
 if(owner===controller&&['own-effect','payment'].includes(reason)||
   reason==='opponent-effect'&&from==='hand'&&to==='outside'){
  if(from==='hand'&&to==='outside'||from==='outside'&&to==='hand')
   markOwnEffectZoneMove(s,owner,from,to);
 }
 return event;
}
function moveOwnedLinear(pack,s,{owner,controller=owner,from,to,index,reason,sourceUid=null}){
 const pl=s.players[owner];
 if(!['hand','deck','life','lifeRevealed','outside','removed'].includes(from)||
  !['hand','deck','lifeRevealed','outside','removed'].includes(to)||from===to||
  !Number.isInteger(index)||index<0||index>=pl[from].length)
  throw Error('Invalid V2 linear zone move');
 const physical=pl[from].splice(index,1)[0];
 pl[to].push(physical);
 recordCompletedMove(pack,s,{physical,owner,controller,from,to,reason,sourceUid});
 return physical;
}
// Track only actual own-effect zone changes, NEVER ordinary drawn cards,
// outside mill, opponent effects, GET life, or simulated unpaid choices.
function markOwnEffectZoneMove(s,owner,from,to){
 if(!playerIndex(owner))throw Error('Invalid effect-zone owner');
 const entry=s.turnEffectZoneMoves[owner];
 if(from==='hand'&&to==='outside')entry.handToOutside=true;
 else if(from==='outside'&&to==='hand')entry.outsideToHand=true;
 else throw Error('Unsupported effect-zone movement');
}
// Snapshot explicit phase programs and serialize them on the existing queue.
function queuePhaseBoundary(pack,s,phase,edge,turnPlayer){
 for(const owner of [turnPlayer,1-turnPlayer]){
  const entries=[],units=[...s.players[owner].front,...s.players[owner].energy].filter(Boolean);
  for(const c of units)for(const [i,q] of (originalEffectsDisabled(s,c)?[]:card(pack,c).phaseEffects).entries()){
   if(q.phase!==phase||q.edge!==edge||(q.turn==='own')!==(owner===turnPlayer))continue;
   entries.push({key:c.uid+':'+i,sourceUid:c.uid,
    jobs:[...q.then.map(op=>({...op,owner,sourceUid:c.uid,
     sourceName:card(pack,c).name,
     ...(op.op==='retireSourceOnPhaseEnd'?{sourceStamp:c.fieldEntryStamp}:{})})),
     ...sourceMoveBoundary(pack,s,owner,c.uid)]});
  }
  if(entries.length)s.effectQueue.push({op:'phaseOrder',owner,entries});
 }
}
function startTurn(pack,s){
 const p=s.active,pl=s.players[p];
 pl.ownTurns++;s.turn++;s.phase='start';s.extraDrawn=false;s.moved=false;s.movedUids=[];s.pending=null;s.attacksThisTurn=0;
 s.attacksByUid={};s.blocksByUid={};
 s.endRefreshed=false;
 expireContinuousStates(s,{player:p,phase:'start',edge:'start'});
 s.raidedThisTurn=[false,false];s.mainAbilityUsedUids=[];s.mainReadyOnceByName=[[],[]];
 s.onceEffectUses=[[],[]];
 // A NEW turn resets both players' previous turn-scoped movement history.
 s.turnEffectZoneMoves=[{handToOutside:false,outsideToHand:false},
  {handToOutside:false,outsideToHand:false}];
 s.turnRetireEvents=[]; // Turn boundary clears history for both controllers.
 s.zoneMoveEvents=[]; // Per-turn internal provenance; ordinal monotonic across turns.
 const max=pl.ownTurns>=3?3:(pl.ownTurns===1&&p===s.first?1:2);
 for(let i=0;i<pl.apCards.length;i++){pl.apCards[i].inPlay=i<max;pl.apCards[i].ready=i<max;}
 refreshFieldActive(s,p);
 for(const c of field(pl))c.buffs=(c.buffs||[]).filter(b=>
  b.untilTurn>=s.turn||(Number.isInteger(b.untilOwnTurnStart)&&
   b.untilOwnTurnStart>pl.ownTurns));
 if(!(pl.ownTurns===1&&p===s.first)){
  if(!pl.deck.length){s.status='finished';s.winner=1-p;s.endReason='required-draw-empty';return;}
  draw(pack,s,p);
 }
 queuePhaseBoundary(pack,s,'start','start',p);
 continueEffectQueue(pack,s);
}
// A source boundary has no gameplay effect unless a registered moved card
// actually has an explicit source-qualified trigger profile.
function legalNamedPayment(pack,physical,payment){
 if(!payment)return true;
 const name=card(pack,physical).name;
 return payment.match==='exactAny'?payment.values.includes(name):
  payment.match==='containsAny'&&payment.values.some(piece=>name.includes(piece));
}
function payableHand(pack,s,owner,payment){
 return s.players[owner].hand.filter(c=>legalNamedPayment(pack,c,payment));
}
function sourceMoveBoundary(pack,s,owner,sourceUid){
 const any=playerPacks(pack).some(p=>
  Object.values(p.cards).some(c=>c.moveTriggers?.length||c.moveObserver));
 return any?[{op:'sourceResolutionBoundary',owner,sourceUid,
  afterOrder:s.nextZoneMoveOrder-1}]:[];
}
// Queue printed effects so each pending cross-title target is chosen before
// remaining steps resolve. Native card packs remain responsible for their own text.
function continueEffectQueue(pack,s){
 while(!s.pending&&s.status==='playing'&&s.effectQueue.length){
  const job=s.effectQueue.shift(),owner=job.owner,pl=s.players[owner];
  if(job.op==='sourceResolutionBoundary'){
   // Cost/choice/target side effects have finished. Only completed moves
   // made by THIS source since the boundary opened can release triggers.
   const toResolve=[],fieldReactions=[];
   for(const event of s.zoneMoveEvents){
    if(event.order<=job.afterOrder||event.sourceUid!==job.sourceUid||
     event.controller!==owner||event.owner!==owner)continue;
    const moved=card(pack,{uid:event.uid,cardId:event.cardId});
    // The moved card's earned trigger binds to its completed event,
    // not its current location. Q2315 permits later face-down undercards.
    for(const profile of moved.moveTriggers||[])
     if(matchesCompletedMove(event,profile.when))
      toResolve.push(...profile.then.map(op=>({...op,owner:event.owner,
       sourceUid:event.uid,sourceName:moved.name})));
    for(const earned of event.earnedFieldObservers||[]){
     fieldReactions.push({op:'restSelfTuckMovedFaceDown',owner,
      sourceUid:earned.sourceUid,sourceStamp:earned.sourceStamp,
      movedUid:event.uid,moveOrder:event.order});
    }
   }
   if(fieldReactions.length&&toResolve.length){
    const entries=[
     ...fieldReactions.map((reaction,i)=>({
      key:'observer-'+reaction.sourceUid+'-'+reaction.moveOrder+'-'+i,
      jobs:[reaction]})),
     {key:'moved-'+job.sourceUid+'-'+job.afterOrder,jobs:toResolve}
    ];
    s.pending={kind:'effect-move-order',player:owner,entries};
   }else s.effectQueue.unshift(...fieldReactions,...toResolve);
  }else if(job.op==='effectMoveOrder'){
   if(!Array.isArray(job.entries)||!job.entries.length)
    throw Error('Missing earned move effect order');
   if(job.entries.length===1)s.effectQueue.unshift(...job.entries[0].jobs);
   else s.pending={kind:'effect-move-order',player:owner,entries:job.entries};
  }else if(job.op==='restSelfTuckMovedFaceDown'){
   const watcher=location(s,owner,job.sourceUid);
   if(watcher&&watcher.c.fieldEntryStamp===job.sourceStamp&&watcher.c.ready&&
    !(watcher.c.under||[]).some(x=>x.faceDown===true))
    s.pending={kind:'effect-rest-tuck',player:owner,sourceUid:job.sourceUid,
     sourceStamp:job.sourceStamp,movedUid:job.movedUid,moveOrder:job.moveOrder};
  }else if(job.op==='lifeBatchStep'){
   const b=s.lifeRevealBatch;
   if(!b||b.owner!==owner)throw Error('Absent LIFE batch');
   const entries=job.entries||[];
   if(!b.remaining.length&&!entries.length){
    if(pl.lifeRevealed.length)throw Error('LIFE check has unresolved physical cards');
    s.lifeRevealBatch=null;finishPending(s);
   }else if(b.remaining.length+entries.length>1)
    s.pending={kind:'life-batch-order',player:owner,choices:[...b.remaining],entries};
   else{
    s.effectQueue.unshift({op:'lifeBatchStep',owner});
    if(entries.length)s.effectQueue.unshift(...entries[0].jobs);
    else selectLifeBatchItem(pack,s,b.remaining[0]);
   }
  }else if(job.op==='lifeRelease'){
   const i=pl.lifeRevealed.findIndex(c=>c.uid===job.uid);
   if(i>=0)moveOwnedLinear(pack,s,{owner,from:'lifeRevealed',to:'outside',
    index:i,reason:'life-trigger',sourceUid:job.uid});
  }else if(job.op==='phaseOrder'){
   if(job.entries.length===1)s.effectQueue.unshift(...job.entries[0].jobs);
   else if(job.entries.length>1)s.pending={kind:'phase-order',player:owner,entries:job.entries};
  }else if(job.op==='completeResolvingEvent'){
   const idx=pl.resolvingEvents.findIndex(c=>c.uid===job.sourceUid);
   if(idx<0||card(pack,pl.resolvingEvents[idx]).type!=='event')
    throw Error('Unproven pending EVENT completion');
   const completed=pl.resolvingEvents.splice(idx,1)[0];
   pl.outside.push(completed);
   recordCompletedMove(pack,s,{physical:completed,owner,
    from:'hand',to:'outside',reason:'rule'});
  }else if(job.op==='openRetirementBatch'){
   if(s.retirementBatch!==null)throw Error('Retirement batch already open');
   s.retirementBatch=[];
  }else if(job.op==='closeRetirementBatch'){
   if(!Array.isArray(s.retirementBatch))throw Error('Retirement batch is not open');
   const entries=s.retirementBatch;
   s.retirementBatch=null;
   unshiftRetirementEntries(s,entries);
  }else if(job.op==='retirementOrder'){
   if(!Array.isArray(job.entries)||!job.entries.length)
    throw Error('Retirement order needs triggers');
   if(job.entries.length===1)s.effectQueue.unshift(...job.entries[0].jobs);
   else s.pending={kind:'retirement-order',player:owner,entries:job.entries};
  }else if(job.op==='battleImpactDamage')damage(pack,s,job.defender);
  else if(job.op==='advanceAfterAttack')advanceAfterEnd(pack,s,owner);
   else if(job.op==='additionalBattleDamage'){
    // The previous life trigger (if any) has already fully resolved.
    // Never collapse separate LIFE cards into one draw or bypass triggers.
    if(job.remaining>1)s.effectQueue.unshift({...job,remaining:job.remaining-1});
    damage(pack,s,job.defender);
   }
  else if(job.op==='chooseOne'){
   // A mandatory printed choose-one may be conditional on HOW the physical
   // card entered, never solely on title or matching a translated keyword.
   if(job.entry==='ownEffect'&&!OWN_EFFECT_ENTRY.has(job.entryCause))continue;
   // Select before executing any branch; zero-target optional modes remain selectable.
   const available=job.options.filter(o=>(
    o.turn==='any'||o.turn==='own'&&s.active===owner||
    o.turn==='opponent'&&s.active!==owner
   )&&o.then.every(child=>{
    if(child.op==='buffOwnField'&&!child.optional)
     return field(pl).some(c=>card(pack,c).type==='character'&&
      (!child.excludeSelf||c.uid!==job.sourceUid)&&matchesFilter(pack,s,c,child.filter));
    if(child.op==='recoverOutsideOne'&&!child.optional)
     return pl.outside.some(c=>matchesFilter(pack,s,c,child.filter));
    if(child.op==='recoverOutsideTraitlessUnderEnergy'&&!child.optional)
     return pl.outside.some(c=>matchesOutsideRecovery(pack,s,c,
      {traitlessEnergyLimit:child.energy}));
    return true;
   }));
   if(available.length||job.optional)
    s.pending={kind:'effect-choice-mode',player:owner,sourceUid:job.sourceUid,
     sourceName:job.sourceName,options:available,optional:job.optional};
   else throw Error('No legally selectable mandatory printed mode');
  }
  else if(job.op==='draw'){
   // A printed 「自分の効果で登場」gate uses the entry cause already stamped
   // on this on-play job. Paid play, paid Raid, and life triggers do not draw.
   // An absent gate keeps every existing draw unchanged.
   const gated=job.entry==='ownEffect';
   if(job.entry!==undefined&&!gated)throw Error('Invalid draw entry gate');
   if(!gated||OWN_EFFECT_ENTRY.has(job.entryCause))draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOwnEnergyAtLeast'){
   // Printed generated-energy threshold is checked at resolution, after the
   // source actually enters the field, including own explicit FRONT producers.
   if(calcEnergy(pack,s,owner)>=job.energy)draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOwnFieldExists'){
   // FIELD condition is evaluated at resolution of a genuinely queued onRetire.
   // Do not count outside/removal/hand or Raid undercards.
   if(field(pl).some(c=>card(pack,c).type==='field'))draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOwnOutsideNamedCountAtLeast'){
   // R53 shares R51's exact physical name-union predicate. It is evaluated
   // only on real onPlay resolution; no cached count, second counter, or
   // credit for hand/removed/RAID underlayers/opponent cards.
   const q={kind:'ownOutsideNamedCountAtLeast',turn:'any',
    min:job.min,names:job.names};
   if(matchesV2LiveCondition(s,owner,job.sourceUid,q,x=>card(pack,x))){
    if(job.optional===true){
     const source=location(s,owner,job.sourceUid);
     if(job.count!==1||!source||source.line!=='front'||
      !Number.isInteger(source.c.fieldEntryStamp)||
      !(s.attacksByUid[job.sourceUid]>=1)||s.active!==owner||s.phase!=='attack')
      throw Error('Unproven optional onAttack draw source');
     if(pl.deck.length)s.pending={kind:'effect-optional-draw',player:owner,
      sourceUid:job.sourceUid,sourceStamp:source.c.fieldEntryStamp};
    }else draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
   }
  }
  else if(job.op==='drawIfOwnTraitCount'){
   // The source has already entered the field when onPlay resolves. Count
   // audited component traits using OWN current front + energy physical cards.
   // Never include hand, outside, opponent or buried Raid cards.
   const q={kind:'ownTraitCount',turn:'any',zone:job.zone,
    excludeSelf:job.excludeSelf,trait:job.trait,min:job.min};
   if(matchesV2LiveCondition(s,owner,job.sourceUid,q,x=>card(pack,x)))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOwnName'){
   // Evaluate after the character actually entered OWN front/energy field.
   // Never count hand, deck, opponent field, or hidden Raid under-cards.
   if(field(pl).some(c=>cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='millTop'){
   // Optional is exactly one blind choice. The top card stays hidden until
   // the controller accepts. Mandatory mills keep the previous loop.
   if(job.optional===true){
    if(job.count!==1)throw Error('Optional mill is exactly one card');
    if(pl.deck.length)s.pending={kind:'effect-optional-mill',player:owner,
     sourceUid:job.sourceUid};
   }else for(let i=0;i<job.count&&pl.deck.length;i++)moveOwnedLinear(pack,s,{
    owner,from:'deck',to:'outside',index:0,reason:'own-effect',sourceUid:job.sourceUid});
  }else if(job.op==='grantSelfSniperThisTurn'||job.op==='grantSelfAttackWinDrawThisTurn'||
   job.op==='grantSelfMustBlockThisTurn'){
   const loc=location(s,owner,job.sourceUid);
   if(!loc||card(pack,loc.c).type!=='character'||
    !Number.isInteger(loc.c.fieldEntryStamp)||loc.c.fieldEntryStamp<1||
    originalEffectsDisabled(s,loc.c))
    throw Error('Timed battle grant requires own live character entry');
   const key=job.op==='grantSelfSniperThisTurn'?'sniperGranted':
    job.op==='grantSelfMustBlockThisTurn'?'mustBlockGranted':'attackWinDrawGranted';
   loc.c[key]={turn:s.turn,stamp:loc.c.fieldEntryStamp};
  }else if(job.op==='grantOnAttack'){
   const source=location(s,owner,job.sourceUid);
   if(!source||originalEffectsDisabled(s,source.c))
    throw Error('Grant source left or is silenced before resolution');
   const grantTo=target=>grantContinuousState(s,{
    kind:'grantedOnAttack',controller:owner,sourceUid:job.sourceUid,
    targetUid:target.uid,sourceLinked:false,optional:job.optional,
    program:job.then,until:{player:s.active,phase:'attack',edge:'end'}
   });
   if(job.target==='self')grantTo(source.c);
   else{
    const choices=field(pl).filter(c=>card(pack,c).type==='character').map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-grant-attack',player:owner,
     sourceUid:job.sourceUid,choices,program:job.then,optional:job.optional};
   }
  }else if(job.op==='buffSelfPerOwnOutsideGroups'){
   // R54: snapshot the physical OUTSIDE divisor at actual attack resolution.
   // It is not a second counter and cannot count another owner, removed, hand
   // or a buried RAID source. The earned BP buff lasts this turn only.
   const src=location(s,owner,job.sourceUid);
   if(!src||src.line!=='front'||src.c.fieldEntryStamp<1||
    s.active!==owner||s.phase!=='attack'||!(s.attacksByUid[job.sourceUid]>=1))
    throw Error('Unproven onAttack outside-group buff source');
   const groups=countOwnOutsidePhysicalGroups(s,owner,job.unit);
   if(groups){
    src.c.buffs??=[];
    src.c.buffs.push({bp:groups*job.bpPerGroup,untilTurn:s.turn});
   }
  }else if(job.op==='grantedAttackDraw'){
   s.pending={kind:'granted-attack-draw',player:owner,sourceUid:job.sourceUid,
    grantId:job.grantId};
  }else if(job.op==='buffSelfUntilNextOwnStart'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   if(!source||!Number.isInteger(source.fieldEntryStamp))
    throw Error('Next-own-start BP source has left its physical field entry');
   source.buffs??=[];
   source.buffs.push({bp:job.bp,untilOwnTurnStart:pl.ownTurns+1});
  }else if(job.op==='grantSelfAttackEndSwapThisTurn'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   if(!source||!Number.isInteger(source.fieldEntryStamp))
    throw Error('Attack-end swap source must exist on own field');
   source.attackEndSwapGranted={turn:s.turn,stamp:source.fieldEntryStamp};
  }else if(job.op==='buffSelf'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   if(!source)throw Error('buffSelf source must be on field');
   source.buffs.push({bp:job.bp,untilTurn:s.turn});
  }else if(job.op==='peekTopOne'){
   // Only the effect controller can inspect this private top card. Do not
   // include its UID/cardId in pending UI or public snapshots.
   if(pl.deck.length)s.pending={kind:'private-top-choice',player:owner,sourceUid:job.sourceUid};
  }else if(job.op==='peekTopOrBottom'){
    if(pl.deck.length)s.pending={kind:'private-top-place',player:owner,sourceUid:job.sourceUid};
   }else if(job.op==='recoverAp'){
   if(pl.apCards.some(c=>c.inPlay&&!c.ready))
    s.pending={kind:'effect-recover-ap',player:owner,sourceUid:job.sourceUid,remaining:job.count};
  }else if(job.op==='searchDeckOne'){
   const matches=filteredChoices(pack,s,pl.deck,job.filter);
   if(matches.length)s.pending={kind:'effect-search-deck',player:owner,
    sourceUid:job.sourceUid,filter:job.filter,choices:matches,optional:job.optional};
   else shuffle(s,pl.deck); // mandatory shuffle even when nothing matches
  }else if(job.op==='searchDeckMany'){
   const choices=filteredChoices(pack,s,pl.deck,job.filter);
   if(choices.length)s.pending={kind:'effect-search-deck-multi',player:owner,
    sourceUid:job.sourceUid,filter:job.filter,choices,
    remaining:job.count,optional:job.optional};
   else shuffle(s,pl.deck);
  }else if(job.op==='searchDeckWhere'){
   const choices=searchChoices(pack,s,pl.deck,job);
   if(choices.length)s.pending={kind:'effect-search-deck-multi',player:owner,
    sourceUid:job.sourceUid,filters:job.filters,logic:job.logic,choices,
    remaining:job.count,optional:job.optional};
   else shuffle(s,pl.deck);
  }else if(job.op==='inspectTopArrange'){
   const uids=pl.deck.slice(0,job.count).map(c=>c.uid);
   if(uids.length)s.pending={kind:job.toOutside?'effect-top-inspect':'effect-top-order',
    player:owner,sourceUid:job.sourceUid,uids,rest:job.rest,
    ...(job.toOutside?{}:{order:[]})};
  }else if(job.op==='inspectTopAnyOutside'){
    const uids=pl.deck.slice(0,job.count).map(c=>c.uid);
    if(uids.length)s.pending={kind:'effect-top-inspect-many',player:owner,
     sourceUid:job.sourceUid,uids,selected:[],rest:job.rest};
   }else if(job.op==='searchTopOneBottomDiscard'){
    const inspected=pl.deck.slice(0,job.count),uids=inspected.map(c=>c.uid);
    if(uids.length){
     // One shared ordered TOP-N window, with either a single printed filter
     // or a strict composite ANY/ALL filter. No full-deck search or shuffle.
     const choices=searchChoices(pack,s,inspected,job);
     const predicate=job.filters?{filters:job.filters.map(f=>({...f})),logic:job.logic}:
      {filter:{...job.filter}};
     // With no valid match, ALL inspected cards must still be ordered below.
     s.pending=choices.length?{kind:'effect-top-filter-choice',player:owner,
      sourceUid:job.sourceUid,uids,choices,...predicate}:
      {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,
       uids,order:[],rest:'bottom'};
    }
   }else if(job.op==='deployOwnHandRest'||job.op==='deployOwnHandSpecial'){
    // Current hand is recomputed AFTER earlier optional outside recovery.
    const special=job.op==='deployOwnHandSpecial';
    const choices=pl.hand.filter(c=>{
     const d=card(pack,c);
     return d.type===job.type&&d.color===job.color&&d.ap===job.ap&&
      (special?(job.maxEnergy===null||d.energy<=job.maxEnergy)&&
       (job.trait===null||cardHasTrait(d,job.trait)):d.energy<=job.energy);
    }).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-hand-rest',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,
     type:job.type,color:job.color,ap:job.ap,max:job.max,
     ...(special?{special:true,trait:job.trait,maxEnergy:job.maxEnergy,
      ready:job.ready,protectionScope:job.protectionScope}:{energy:job.energy})};
   }else if(job.op==='searchTopUpToTwoBottom'){
    const inspected=pl.deck.slice(0,job.count),uids=inspected.map(c=>c.uid);
    if(uids.length){
     const choices=searchChoices(pack,s,inspected,job);
     s.pending=choices.length?{kind:'effect-top-filter-many-choice',player:owner,
      sourceUid:job.sourceUid,uids,choices,selected:[],
      filters:job.filters.map(f=>({...f})),logic:job.logic,max:job.max}:
      {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,
       uids,order:[],rest:'bottom'};
    }
   }else if(job.op==='recoverOutsideOne'){
   const matches=filteredChoices(pack,s,pl.outside,job.filter);
   if(matches.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,filter:job.filter,choices:matches,optional:job.optional};
  }else if(job.op==='deployOutsideTraitlessRestOrRaid'){
    const extra=pl.outside.filter(c=>c.uid!==job.sourceUid&&card(pack,c).type==='field').length;
    const energyLimit=Math.min(30,job.energy+extra*job.perOtherOutsideField);
    const choices=pl.outside.filter(c=>{
     const d=card(pack,c);
     return d.type==='character'&&d.traits.length===0&&d.color===job.color&&
      d.energy<=energyLimit&&d.ap===job.ap;
    }).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-outside-traitless-rest',
     player:owner,sourceUid:job.sourceUid,choices,color:job.color,
     baseEnergy:job.energy,energyLimit,ap:job.ap,optional:true};
   }else if(job.op==='deployNamedFromZones'){
     const printedName=c=>{const d=card(pack,c);return d.type===(job.cardType||'character')&&
      cardHasName(d,job.name,originalEffectsDisabled(s,c))&&
      (job.color===undefined||(d.color===job.color&&d.ap===job.ap&&
       d.energy<=job.maxEnergy));};
     const handChoices=job.zones.includes('hand')?pl.hand.filter(printedName).map(c=>c.uid):[];
     const outsideChoices=job.zones.includes('outside')?pl.outside.filter(printedName).map(c=>c.uid):[];
     if(handChoices.length||outsideChoices.length)
      s.pending={kind:'effect-named-zone-entry',player:owner,sourceUid:job.sourceUid,
       sourceName:job.sourceName,name:job.name,ready:job.ready,line:job.line,
       handChoices,outsideChoices,
       ...(job.cardType?{cardType:job.cardType}:{}),
       ...(job.color===undefined?{}:{color:job.color,ap:job.ap,
        maxEnergy:job.maxEnergy,
        ...(job.grantBp===undefined?{}:{grantBp:job.grantBp})})};
   }else if(job.op==='deployOutsideNameRest'){
    const choices=pl.outside.filter(c=>{
     const d=card(pack,c);
     return d.type==='character'&&!d.raidName&&
      cardHasName(d,job.name,originalEffectsDisabled(s,c));
    }).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-outside-name-rest',player:owner,
     sourceUid:job.sourceUid,choices,name:job.name};
   }else if(job.op==='payApDeployNamedRest'){
    // 手札から登場 is a paid play or a paid Raid from hand. Life triggers and
    // effect entries do not open the AP payment. No ready AP means the
    // optional payment cannot be made, so the deploy does not start.
    if(job.entry!=='hand')throw Error('Named REST deploy payment is hand entry only');
    if((job.entryCause==='paidPlay'||job.entryCause==='paidRaid')&&
     pl.apCards.some(c=>c.ready))
     s.pending={kind:'effect-pay-ap-deploy',player:owner,
      sourceUid:job.sourceUid,name:job.name};
   }else if(job.op==='inspectTopTraitOutside'){
    // A "different own" prerequisite excludes the physical source UID.
    const active=!job.requiresOtherOwnTrait||field(pl).some(c=>
     c.uid!==job.sourceUid&&cardHasTrait(card(pack,c),job.requiresOtherOwnTrait));
    const uids=active?pl.deck.slice(0,job.count).map(c=>c.uid):[];
    if(uids.length){
     const window=pl.deck.slice(0,uids.length);
     const choices=window.filter(c=>cardHasTrait(card(pack,c),job.trait)||
      (job.orName&&cardHasName(card(pack,c),job.orName))).map(c=>c.uid);
     s.pending=choices.length?{kind:'effect-top-trait-outside',player:owner,
      sourceUid:job.sourceUid,uids,choices,trait:job.trait,
      ...(job.orName?{orName:job.orName}:{})}:
      {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,
       uids,order:[],rest:'top'};
    }
   }else if(job.op==='deployOutsideRest'){
    const choices=pl.outside.filter(c=>{
     const d=card(pack,c);
     return d.type==='character'&&!d.raidName&&cardHasName(d,job.name)&&
      d.color===job.color&&d.energy<=job.energy&&d.ap===job.ap;
    }).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-outside-rest',player:owner,
     sourceUid:job.sourceUid,choices,name:job.name,color:job.color,
     energy:job.energy,ap:job.ap,optional:true};
   }else if(job.op==='resolveAttackWinRecovery'){
   const printed=card(pack,{uid:job.sourceUid,cardId:job.sourceCardId});
   const profile=printed.attackWinRecover;
   if(!profile)throw Error('Attacking victory has no printed recovery source');
   // Re-evaluate live own OUTSIDE at effect resolution; no second cache,
   // opponent OUTSIDE, buried Raid card or removed card may be counted.
   const limit=profile.basePrintedBp+
    countOwnOutsidePhysicalGroups(s,owner,profile.unit)*profile.bpPerGroup;
   const q={printedBpLimit:limit,excludeName:profile.excludeName};
   const choices=pl.outside.filter(c=>matchesOutsideRecovery(pack,s,c,q))
    .map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,...q,choices,optional:true};
  }else if(job.op==='recoverOutsidePrintedBp'){
   const choices=pl.outside.filter(c=>matchesOutsideRecovery(pack,s,c,
    {printedBpLimit:job.bp})).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,printedBpLimit:job.bp,
    choices,optional:job.optional};
  }else if(job.op==='recoverOutsideTraitlessUnderEnergy'){
   const choices=pl.outside.filter(c=>matchesOutsideRecovery(pack,s,c,
    {traitlessEnergyLimit:job.energy})).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,traitlessEnergyLimit:job.energy,
    choices,optional:job.optional};
  }else if(job.op==='discardToDraw'){
   if(pl.hand.length)s.pending={kind:'effect-discard-cost',player:owner,
    sourceUid:job.sourceUid,count:job.count,optional:job.optional};
  }else if(job.op==='oncePerTurnGate'){
   const key=job.scope==='name'?'name:'+job.sourceName:'uid:'+job.sourceUid;
   if(!s.onceEffectUses[owner].includes(key)){
    if(job.optional)s.pending={kind:'effect-once-choice',player:owner,
     key,sourceUid:job.sourceUid,sourceName:job.sourceName,then:job.then};
    else{
     s.onceEffectUses[owner].push(key);
     s.effectQueue.unshift(...job.then.map(e=>({...e,owner,
      sourceUid:job.sourceUid,sourceName:job.sourceName})));
    }
   }
  }else if(job.op==='discardGate'){
   if(payableHand(pack,s,owner,job.payment).length>=(job.count??1))
     s.pending={kind:'effect-discard-gate',player:owner,
      sourceUid:job.sourceUid,optional:job.optional,then:job.then,
      ...(job.payment?{payment:job.payment}:{}),
      ...(job.count===2?{count:2}:{})};
  }else if(job.op==='recoverOutsideColorUnderEnergy'){
   const choices=pl.outside.filter(c=>matchesOutsideRecovery(pack,s,c,job)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,color:job.color,energy:job.energy,
    choices,optional:job.optional};
  }else if(job.op==='buffSelfIfFirstAttack'){
   if(s.attacksThisTurn===1){
    const source=field(pl).find(c=>c.uid===job.sourceUid);
    if(source){source.buffs??=[];source.buffs.push({bp:job.bp,untilTurn:s.turn});}
   }
  }else if(job.op==='bounceOwnOtherUnderEnergy'){
   const choices=field(pl).filter(c=>c.uid!==job.sourceUid&&
    card(pack,c).type==='character'&&(job.optional===true?
     !cardHasName(card(pack,c),job.excludeName):card(pack,c).energy<=job.energy)).map(c=>c.uid);
   if(choices.length||job.optional===true)s.pending={kind:'effect-bounce-own',player:owner,
    sourceUid:job.sourceUid,choices,...(job.optional===true?
     {optional:true,excludeName:job.excludeName,after:job.after}:{energy:job.energy})};
   else bounceToHand(pack,s,owner,job.sourceUid,job.sourceUid);
  }else if(job.op==='discardOppHand'){
   // The opponent chooses one of their own hand cards. Empty hand does nothing.
   const foe=1-owner;
   if(s.players[foe].hand.length)
    s.pending={kind:'effect-discard',player:foe,sourceUid:job.sourceUid};
  }else if(job.op==='drawDiscard'){
   draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
   if(pl.hand.length)s.pending={kind:'effect-discard',player:owner,sourceUid:job.sourceUid,
     ...(job.discardCount>1?{remaining:Math.min(job.discardCount,pl.hand.length)}:{})};
  }else if(job.op==='retireOppFrontUnderBp'){
   const ownName=job.bonusName.replace(/\s+/g,'');
   const hasBonus=field(pl).some(c=>{
    const d=card(pack,c),silenced=originalEffectsDisabled(s,c);
    return [d.name,...(silenced?[]:d.nameAliases||[])]
     .some(n=>n.replace(/\s+/g,'')===ownName);
   });
   const limit=hasBonus?job.bonusBp:job.bp;
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=limit).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,sourceUid:job.sourceUid,choices,limit};
  }else if(job.op==='conditionalBounceOrRetireByOwnOutsideNames'){
   const choices=s.players[1-owner].front.filter(c=>c&&
    card(pack,c).type==='character'&&bp(pack,s,c)<=job.bp&&
    !effectChoiceProtected(s,owner,c.uid,sourceTypeFromUid(pack,s,job.sourceUid))&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-named-outside-bounce-retire',
    player:owner,sourceUid:job.sourceUid,choices,bp:job.bp,
    min:job.min,names:[...job.names]};
  }else if(job.op==='retireOppFrontOneUnderBp'){
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:job.bp,optional:true};
  }else if(job.op==='stripOppRaidTop'){
   const choices=s.players[1-owner].front.filter(c=>c&&
    strippableRaidTop(pack,c)&&cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-strip-raid-top',player:owner,
    sourceUid:job.sourceUid,choices,optional:true};
  }else if(job.op==='retireOppFrontIfFacedown'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   if(source&&hasFacedownUnder(source)){
    const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,
     sourceUid:job.sourceUid,choices,limit:job.bp,optional:true};
   }
  }else if(job.op==='restOrRetireOppFrontByLife'){
   // One target set and one choice. The controller's LIFE determines the
   // branch when the effect is actually resolved, not from the original hand.
   const targets=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid));
   if(targets.length){
    const retireNow=pl.life.length<=job.lifeAtMost;
    s.pending={kind:retireNow?'effect-retire-bp':'effect-rest-bp',
     player:owner,sourceUid:job.sourceUid,limit:job.bp,
     choices:targets.map(c=>c.uid),optional:job.optional,
     ...(!retireNow?{skipNextActive:true}:{})};
   }
  }else if(job.op==='restSilenceOppFrontIfOwnOutsideField'){
   if(pl.outside.some(c=>card(pack,c).type==='field')){
    const choices=s.players[1-owner].front.filter(c=>c&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
     sourceUid:job.sourceUid,choices,limit:null,optional:true,
     silenceUntil:{player:1-owner,phase:'attack',edge:'end'}};
   }
  }else if(job.op==='skipNextActiveOppRest'){
   const choices=field(s.players[1-owner]).filter(c=>!c.ready&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:null,optional:job.optional,
    skipNextActive:true,onlyRest:true,anyLine:true,restTarget:false};
  }else if(job.op==='grantOwnFrontChoiceProtection'){
   const choices=pl.front.filter(c=>c&&card(pack,c).type==='character')
    .map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
   if(choices.length)s.pending={kind:'effect-own-front-protect',player:owner,
    sourceUid:job.sourceUid,choices,scope:job.scope,
    apRecoveryOnName:job.apRecoveryOnName};
  }else if(job.op==='grantSelectionApTaxOwnOtherTrait'){
   const choices=field(pl).filter(c=>c.uid!==job.sourceUid&&
    card(pack,c).type==='character'&&
    cardHasTrait(card(pack,c),job.trait)).map(c=>({
     uid:c.uid,stamp:c.fieldEntryStamp}));
   if(choices.length)s.pending={kind:'effect-grant-ap-tax',player:owner,
    sourceUid:job.sourceUid,trait:job.trait,choices,optional:true};
  }else if(job.op==='nextEligibleHandPlayApDiscount'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   if(!source||!definitionGrantsDiscount(card(pack,source),job.filter))throw Error('Unproven hand discount source');
   grantHandDiscount(s,owner,source,job.filter);
  }else if(job.op==='grantFrontEnergyOwnOtherFrontTrait'){
   const choices=pl.front.filter(c=>c&&c.uid!==job.sourceUid&&
    card(pack,c).type==='character'&&cardHasTrait(card(pack,c),job.trait))
    .map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
   if(choices.length)s.pending={kind:'effect-grant-front-energy',player:owner,
    sourceUid:job.sourceUid,trait:job.trait,choices,optional:true};
  }else if(job.op==='forbidAttackOppFrontOne'){
   if(s.active===owner){
    const choices=s.players[1-owner].front.filter(Boolean).map(c=>({
     uid:c.uid,stamp:c.fieldEntryStamp}));
    if(choices.length)s.pending={kind:'effect-attack-ban',player:owner,
     sourceUid:job.sourceUid,choices,optional:true};
   }
  }else if(job.op==='restOppFrontOne'){
   const choices=s.players[1-owner].front.filter(c=>c&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:null,optional:job.optional,
    skipNextActive:job.skipNextActive===true};
  }else if(job.op==='restOppFrontUnderBp'){
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:job.bp,optional:job.optional,
    skipNextActive:job.skipNextActive===true};
  }else if(job.op==='buffOwnField'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    (!job.excludeSelf||c.uid!==job.sourceUid)&&
    matchesFilter(pack,s,c,job.filter)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-buff-own',player:owner,
    sourceUid:job.sourceUid,choices,filter:job.filter,
    bp:job.bp,optional:job.optional,excludeSelf:job.excludeSelf};
  }else if(job.op==='buffOwnTrait'){
   const choices=field(pl).filter(c=>cardHasTrait(card(pack,c),job.trait)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-buff-trait',player:owner,sourceUid:job.sourceUid,
    choices,trait:job.trait,bp:job.bp};
  }else if(job.op==='enemyFrontAllBpDown'){
   const foe=1-owner;
   // Official timing is this resolution. Current BP is read once, then the
   // matching physical cards are the only recipients. Later reductions must
   // not drop a card out of the set or pull a new one in.
   const targets=s.players[foe].front.filter(c=>c&&
    (job.minBp===undefined||bp(pack,s,c)>=job.minBp)&&
    (job.maxBp===undefined||bp(pack,s,c)<=job.maxBp));
   // All modifiers land in the SAME effect step, before any of the
   // simultaneous state-based 0-BP retirements or replacement choices.
   for(const c of targets){
    c.buffs??=[];c.buffs.push({bp:-job.bp,untilTurn:s.turn});
   }
   const lethal=targets.filter(c=>bp(pack,s,c)<=0);
   // Internal jobs retain the original snapshot of physical UIDs; they do
   // NOT pick a fresh target between protected leave decisions.
   queueSimultaneousRetires(s,owner,lethal.map(c=>({
    op:'retireBatchOne',owner,targetPlayer:foe,uid:c.uid
   })));
  }else if(job.op==='optionalRetireThenProgram'){
    const candidates=job.cardType==='character'?
     [...pl.front,...pl.energy].filter(c=>c&&card(pack,c).type==='character'):
     pl.energy.filter(c=>c&&card(pack,c).type==='field');
    const choices=candidates.map(c=>c.uid);
    if(choices.length)s.pending={kind:job.cardType==='character'?
     'effect-retire-own-character':'effect-retire-own-field',player:owner,
     sourceUid:job.sourceUid,choices,optional:true,
     after:job.after.map(x=>({...x,owner,sourceUid:job.sourceUid,
      sourceName:job.sourceName}))};
  }else if(job.op==='retireOwnCharacterOne'){
    const choices=[...pl.front,...pl.energy].filter(c=>c&&
     card(pack,c).type==='character'&&
     (job.excludeSelf!==true||c.uid!==job.sourceUid)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-retire-own-character',
     player:owner,sourceUid:job.sourceUid,choices,optional:true,
     ...(job.excludeSelf===true?{excludeSelf:true}:{}),
     after:job.after.map(x=>({...x,owner,sourceUid:job.sourceUid,
      sourceName:job.sourceName}))};
  }else if(job.op==='retireOwnFieldOne'){
    // Real, existing FIELD objects in OWN ENERGY only. This is true
    // retirement, distinct from placing a new card in a full line (removal).
    const choices=pl.energy.filter(c=>c&&card(pack,c).type==='field').map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-retire-own-field',player:owner,
     sourceUid:job.sourceUid,choices,optional:job.optional!==false,
     after:(job.after||[]).map(x=>({...x,owner,sourceUid:job.sourceUid,sourceName:job.sourceName}))};
   }else if(job.op==='retireOppFrontAllUnderBp'){
   // The target set is evaluated ONCE, at the original effect resolution.
   // Protected Raid replacement choices cannot introduce fresh victims.
   const foe=1-owner;
   const targets=s.players[foe].front.filter(c=>c&&bp(pack,s,c)<=job.bp);
   queueSimultaneousRetires(s,owner,targets.map(c=>({
    op:'retireBatchOne',owner,targetPlayer:foe,uid:c.uid,mode:'threshold'
   })));
   }else if(job.op==='retireSourceOnPhaseEnd'){
    const pos=location(s,owner,job.sourceUid);
    if(pos&&pos.c.fieldEntryStamp===job.sourceStamp&&!originalEffectsDisabled(s,pos.c)){
     if(!card(pack,pos.c).phaseEffects.some(q=>q.phase==='attack'&&q.edge==='end'&&
      q.turn===(owner===s.active?'own':'opponent')&&q.then.length===1&&
      q.then[0].op==='retireSourceOnPhaseEnd'))
      throw Error('Unproven phase-end true retirement');
     retire(pack,s,owner,pos.line,pos.slot);
    }
  }else if(job.op==='retireAtMainEnd'){
    // Only this physical field incarnation may satisfy a delayed retirement.
    const pos=location(s,owner,job.sourceUid);
    if(pos&&pos.c.fieldEntryStamp===job.fieldEntryStamp)
     retire(pack,s,owner,pos.line,pos.slot);
   }else if(job.op==='moveAtMainEnd'){
    // A delayed zone move is not retirement: no onRetire and no retire count.
    // The visible field UID must still be this stamped incarnation. A buried
    // Raid layer, a missing card, or a newer entry does nothing.
    const pos=location(s,owner,job.sourceUid);
    if(job.destination==='hand'&&pos&&pos.c.fieldEntryStamp===job.fieldEntryStamp)
     bounceToHand(pack,s,owner,job.sourceUid,job.sourceUid);
   }else if(job.op==='retireBatchOne'){
   // Internal state-based consequence, never a user-authored card DSL op.
   const slot=s.players[job.targetPlayer].front.findIndex(c=>c?.uid===job.uid);
   if(slot>=0&&(job.mode==='threshold'||
    bp(pack,s,s.players[job.targetPlayer].front[slot])<=0))
    retire(pack,s,job.targetPlayer,'front',slot);
  }else if(job.op==='buffOwnTraitAllTurn'){
   // A snapshot of current qualifying field units. Later entrants do not
   // inherit this temporary, printed action effect.
   for(const c of field(pl))if(cardHasTrait(card(pack,c),job.trait)){
    c.buffs??=[];c.buffs.push({bp:job.bp,untilTurn:s.turn});
   }
  }else if(job.op==='drawIfRaidUnderFacedown'){
   const raid=field(pl).find(c=>c.uid===job.raidUid);
   if(!raid)throw Error('Raid-base follow-up missing the Raid target');
   const under=c=>(c.under||[]).some(x=>x.faceDown===true||under(x))||
    (c.stack||[]).some(x=>x.faceDown===true||under(x));
   if(under(raid))draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  }else if(job.op==='resolveAttackEndSwap'){
   const src=pl.front.find(c=>c?.uid===job.sourceUid);
   if(src&&src.fieldEntryStamp===job.sourceStamp&&attackEndSwapAvailable(pack,s,src)){
    const rule=card(pack,src).attackEndSwap;
    const permitted=hasEarnedAttackEndSwap(s,src)||!!rule&&
     countOwnOutsideDistinctPrintedNames(s,owner,c=>card(pack,c),rule)>=
      rule.minDistinctNames;
    if(permitted){
     const choices=pl.energy.filter(c=>c&&card(pack,c).type==='character')
      .map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
     if(choices.length)s.pending={kind:'attack-end-swap',player:owner,
      sourceUid:src.uid,sourceStamp:src.fieldEntryStamp,choices};
    }
   }
  }else if(job.op==='resolveSniperBattle'){
   // Q65-Q70: a designated enemy FRONT character battles without ever
   // blocking. No chooseBlock, REST, block count or onBlock keyword is earned.
   const attacker=pl.front.find(c=>c?.uid===job.sourceUid);
   const defender= s.players[1-owner].front.find(c=>c?.uid===job.targetUid);
   if(s.active!==owner||s.phase!=='attack'||!attacker||!defender||
    attacker.fieldEntryStamp!==job.sourceStamp||
    defender.fieldEntryStamp!==job.targetStamp||
    !(s.attacksByUid[job.sourceUid]>=1)||
    !hasCurrentBattleGrant(s,attacker,'sniperGranted'))
    throw Error('Unproven physical SNIPER battle');
   if(bp(pack,s,attacker)>=bp(pack,s,defender)){
    grantBattleWinToOtherOwn(pack,s,owner,attacker,'attacker');
    const hasDraw=hasCurrentBattleGrant(s,attacker,'attackWinDrawGranted');
    const defenderSlot=s.players[1-owner].front.findIndex(c=>c?.uid===job.targetUid);
    const impact=impactOnBattleWin(pack,s,attacker)>0&&
     !card(pack,defender).impactNull;
    const replacement=retire(pack,s,1-owner,'front',defenderSlot,{postImpact:impact});
    // An earned draw belongs to the real attacking victor, never direct
    // LIFE. Preserve the existing onRetire-before-followup effect ordering.
    if(hasDraw)s.effectQueue.splice(retirementJobsInserted,0,
     {op:'draw',owner,count:1,sourceUid:attacker.uid});
    queueAttackWinRecovery(pack,s,owner,attacker);
    if(impact&&!replacement)queueImpactAfterRetirement(pack,s,1-owner);
   }else grantBattleWinToOtherOwn(pack,s,1-owner,defender,'blocker');
   // The target remains ACTIVE/REST if it survives. No fake block action.
  }else if(job.op==='openBlock'){
   // Internal attack-window continuation, never a user-authored card DSL op.
   // Blocking begins only AFTER all attack-time choices and queued effects.
   const attacking=pl.front.find(c=>c?.uid===job.sourceUid);
   if(!attacking)throw Error('Attack source left the front line before blocking');
   s.pending={kind:'block',player:1-owner,attackerUid:job.sourceUid};
  }else if(job.op==='activeSelfIf'){
   // The card is already in its entry slot. A miss means it left, was
   // replaced, or was never a visible field character. Silence removes the
   // printed on-play text even if the job was queued before the status.
   const pos=location(s,owner,job.sourceUid);
   const live=pos&&card(pack,pos.c).type==='character'?pos.c:null;
   const boardOk=!job.when||(!!live&&matchesV2LiveCondition(s,owner,live.uid,job.when,
    c=>card(pack,c),()=>0));
   const lineOk=job.line===undefined||pos?.line===job.line;
   const causeOk=job.entry!=='ownEffect'||OWN_EFFECT_ENTRY.has(job.entryCause);
   if(live&&lineOk&&!originalEffectsDisabled(s,live)&&boardOk&&causeOk)
    attemptFieldActive(s,owner,live);
  }else if(job.op==='enemyBpDown'){
   const foe=1-owner;
   // The printed BP window is read once, when the choice opens. Applying the
   // reduction must not rebuild the set, or a card that falls under the floor
   // would illegally disappear from a choice it already qualified for.
   const zones=job.zone==='field'
    ?[...s.players[foe].front,...s.players[foe].energy]
    :s.players[foe].front;
   const targetUids=zones.filter(c=>c&&
    (job.zone!=='field'||card(pack,c).type==='character')&&
    (job.minBp===undefined||bp(pack,s,c)>=job.minBp)&&
    (job.maxBp===undefined||bp(pack,s,c)<=job.maxBp)&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(targetUids.length){
    if(job.maxTargets===2)s.pending={kind:'effect-target-many',player:owner,
     sourceUid:job.sourceUid,bp:job.bp,choices:targetUids,selected:[],
     maxTargets:2,zone:'front'};
    else s.pending={kind:'effect-target',player:owner,sourceUid:job.sourceUid,
     bp:job.bp,optional:job.optional===true,choices:targetUids,zone:job.zone||'front'};
   }
  }else throw Error('Unimplemented effect op');
 }
}
function programJobs(pack,s,physical,timing,owner,raidUid,entryCause){
 // Q2220: printed leave triggers are lost before true retirement.
 return (originalEffectsDisabled(s,physical)?[]:card(pack,physical).effects[timing]||[])
  .map(e=>({...e,owner,sourceUid:physical.uid,
   sourceName:card(pack,physical).name,...(raidUid?{raidUid}:{}),
   ...(timing==='onPlay'&&entryCause?{entryCause}:{})}));
}
// Q38: enqueue a complete earned entry program on the EXISTING batch step.
// Never split a printed program at a draw/cost/target pending boundary.
function deferLifeEntry(s,owner,sourceUid,jobs){
 if(!jobs.length||s.lifeRevealBatch?.owner!==owner)return false;
 const step=s.effectQueue.find(j=>j.op==='lifeBatchStep'&&j.owner===owner);
 if(!step)throw Error('Missing LIFE entry continuation');
 step.entries??=[];
 const key=sourceUid+':entry:'+s.nextFieldEntryStamp;
 if(step.entries.some(e=>e.key===key))throw Error('Duplicate LIFE entry');
 step.entries.push({key,sourceUid,jobs});
 return true;
}
function applyEffects(pack,s,cardOnField,timing,owner,entryCause){
 // Entry/trigger effects interrupt the suspended continuation (e.g. DAMAGE2).
 const jobs=programJobs(pack,s,cardOnField,timing,owner,undefined,entryCause);
 const complete=jobs.length?[...jobs,...sourceMoveBoundary(pack,s,owner,cardOnField.uid)]:[];
 if(!(timing==='onPlay'&&deferLifeEntry(s,owner,cardOnField.uid,complete)))
  s.effectQueue.unshift(...complete);
 continueEffectQueue(pack,s);
}
function validRaidBase(pack,s,owner,base,top){
 if(!base||!top.raidName||
  !top.raidRequiresNames.every(n=>raidNamePresent(pack,s,owner,n)))return false;
 const b=card(pack,base),names=top.raidBaseNames;
 const accepts=list=>list.some(n=>cardHasName(b,n,originalEffectsDisabled(s,base)));
 if(base.stack?.length){
  const bottom=base.stack[0];
  // The buried layer is not the visible card. Q50 keeps its alias inactive.
  return accepts(top.raidFromRaid)&&names.includes(card(pack,bottom).name)&&
   !card(pack,bottom).raidName;
 }
 return accepts(names)&&!b.raidName;
}
// Only the Q542-Q546 audited two-face-up-card geometry is selectable.
// Chain-Raid/facedown attachment placement needs a separate official ruling.
function strippableRaidTop(pack,top){
 const base=top?.stack?.[0];
 return !!(top&&card(pack,top).raidName&&top.stack.length===1&&
  !top.faceDown&&!(top.under||[]).length&&base&&!base.faceDown&&
  card(pack,base).type==='character'&&!card(pack,base).raidName&&
  !(base.stack||[]).length&&!(base.under||[]).length);
}
function performRaid(pack,s,p,cardOnTop,baseUid,line,slot,replaceUid,{entryReady=true,entryCause='paidRaid',entryFrom='hand',effectSourceUid=null}={}){
 const pl=s.players[p],base=location(s,p,baseUid),top=card(pack,cardOnTop);
 const baseOriginalSilenced=base?originalEffectsDisabled(s,base.c):false;
 if(!base||!validRaidBase(pack,s,p,base.c,top))throw Error('Illegal Raid base');
 if(line!=='front'&&line!=='energy')throw Error('Illegal Raid destination');
 if(line==='front'&&(top.frontForbidden||card(pack,base.c).frontForbidden))
  throw Error('Printed front-line restriction forbids Raid movement');
 if(base.line==='front'&&(line!=='front'||slot!==base.slot))
  throw Error('Cannot move a front-line Raid base');
 if(line==='energy'&&(base.line!=='energy'||slot!==base.slot))
  throw Error('Raid can only stay in base energy slot');
 commitDestination(pack,s,p,line,slot,replaceUid,base);
 pl[base.line][base.slot]=null;
 let effectiveBase=base.c;
 if(base.c.stack?.length){
  // Move the existing Raid top facedown BELOW the same original base,
  // without copying any physical card or exposing its identity.
  effectiveBase=base.c.stack[0];
  base.c.stack=[];
  base.c.faceDown=true;
  effectiveBase.under??=[];
  effectiveBase.under.push(base.c);
 }
 cardOnTop.stack=[effectiveBase];cardOnTop.ready=entryReady;
 cardOnTop.fieldEntryStamp=s.nextFieldEntryStamp++;
 pl[line][slot]=cardOnTop;
 // Both physical movements are real and complete. A Raid base remains
 // nested under the new top; do not count its UID twice or expose hidden layers.
 recordCompletedMove(pack,s,{physical:base.c,owner:p,from:base.line,
  to:'raid-under',reason:'rule',sourceUid:cardOnTop.uid});
 recordCompletedMove(pack,s,{physical:cardOnTop,owner:p,from:entryFrom,to:line,
  reason:entryCause==='lifeRaid'?'life-trigger':
   entryCause==='paidRaid'?'rule':'own-effect',sourceUid:effectSourceUid});
 s.raidedThisTurn[p]=true;
 const baseJobs=s.active===p&&!baseOriginalSilenced?programJobs(pack,s,effectiveBase,'onRaided',p,cardOnTop.uid):[];
 const entryJobs=programJobs(pack,s,cardOnTop,'onPlay',p,undefined,entryCause);
 const raidJobs=programJobs(pack,s,cardOnTop,'onRaid',p);
 // Keep the legal base/entry ordering choice. onPlay and onRaid share the
 // new Raid-top source UID, and use ONE completed-move trigger boundary.
 const baseWithBoundary=baseJobs.length?[...baseJobs,
  ...sourceMoveBoundary(pack,s,p,effectiveBase.uid)]:[];
 const raidWithBoundary=entryJobs.length||raidJobs.length?[...raidJobs,
  ...sourceMoveBoundary(pack,s,p,cardOnTop.uid)]:raidJobs;
 if(entryCause==='lifeRaid'&&deferLifeEntry(s,p,cardOnTop.uid,
   [...baseWithBoundary,...entryJobs,...raidWithBoundary])){
  continueEffectQueue(pack,s);
 }else if(baseJobs.length&&entryJobs.length)
  s.pending={kind:'raid-effect-order',player:p,baseUid:effectiveBase.uid,
   raidUid:cardOnTop.uid,baseJobs:baseWithBoundary,entryJobs,
   raidJobs:raidWithBoundary};
 else{
  s.effectQueue.unshift(...baseWithBoundary,...entryJobs,...raidWithBoundary);
  continueEffectQueue(pack,s);
 }
}
function location(s,p,uid){
 for(const line of ['front','energy']){
  const slot=s.players[p][line].findIndex(c=>c?.uid===uid);
  if(slot!==-1)return {line,slot,c:s.players[p][line][slot]};
 }
 return null;
}
function bounceToHand(pack,s,p,uid,sourceUid=uid,{reason='own-effect',controller=p}={}){
 const found=location(s,p,uid);if(!found)throw Error('Bounce source not on own field');
 const top=found.c,pl=s.players[p];pl[found.line][found.slot]=null;
 // Official Japanese Q62: only the top Raid card returns to hand.
 // All bases and facedown undercards move to OWN outside (not hand/remove).
 const below=c=>[...(c.stack||[]).flatMap(x=>[x,...below(x)]),
  ...(c.under||[]).flatMap(x=>[x,...below(x)])];
 const reset=c=>({...c,stack:[],under:[],buffs:[],ready:false,faceDown:false,fieldEntryStamp:null});
 for(const layer of below(top)){
  const physical=reset(layer);pl.outside.push(physical);
  recordCompletedMove(pack,s,{physical,owner:p,from:'raid-under',to:'outside',
   reason:'rule',sourceUid});
 }
 const bounced=reset(top);pl.hand.push(bounced);
 recordCompletedMove(pack,s,{physical:bounced,owner:p,controller,from:found.line,to:'hand',
  reason,sourceUid});
}
function buriedMoves(top){
 return [...(top.stack||[]),...(top.under||[])].flatMap(c=>[
  {physical:c,attachedToUid:top.uid,wasFaceDown:c.faceDown===true},...buriedMoves(c)]);
}
function vacate(pack,s,p,line,slot,destination='outside'){
 const top=s.players[p][line][slot];if(!top)throw Error('Empty field slot');
 if(!['outside','removed'].includes(destination))throw Error('Invalid destination');
 s.players[p][line][slot]=null;
 const reset=c=>({...c,stack:[],under:[],buffs:[],ready:false,faceDown:false,fieldEntryStamp:null});
 // Q60/Q61/Q62: subordinate cards go OUTSIDE even if the top is removed.
 // Only the visible field object qualifies for onRetire, never its layers.
 const buried=buriedMoves(top);
 s.players[p][destination].push(reset(top));
 for(const entry of buried){
  const physical=reset(entry.physical);s.players[p].outside.push(physical);
  recordCompletedMove(pack,s,{...entry,physical,owner:p,from:'raid-under',to:'outside',reason:'rule'});
 }
}
function recordTrueRetirement(pack,s,controller,physical,line){
 // One completed field object, not the hidden layers of a Raid stack.
 const cardType=card(pack,physical).type;
 if(cardType!=='character'&&cardType!=='field')throw Error('Only field objects retire');
 s.turnRetireEvents.push({turn:s.turn,controller,cardType,uid:physical.uid,
  line,fieldEntryStamp:physical.fieldEntryStamp??null});
}
function queueSimultaneousRetires(s,owner,jobs){
 if(!jobs.length)return;
 // Physical departures finish, including leave-replacement pauses, before
 // any of their onRetire programs are ordered or resolved.
 s.effectQueue.unshift({op:'openRetirementBatch',owner},...jobs,
  {op:'closeRetirementBatch',owner});
}
function unshiftRetirementEntries(s,entries){
 const blocks=[];
 // Turn player resolves every trigger they control, then the opponent.
 // One card keeps its printed instruction order; several cards are chosen.
 for(const owner of [s.active,1-s.active]){
  const mine=entries.filter(e=>e.owner===owner);
  if(mine.length===1)blocks.push(...mine[0].jobs);
  else if(mine.length>1)blocks.push({op:'retirementOrder',owner,entries:mine});
 }
 if(blocks.length)s.effectQueue.unshift(...blocks);
 return blocks.length;
}
function queueRetirement(pack,s,p,c,line){
 // Capture the source before moving to outside. Only GENUINE retirement
 // queues onRetire; bounce, removed area and stripping a Raid top do not.
 const jobs=programJobs(pack,s,c,'onRetire',p).map(job=>({
  ...job,retiredSource:{uid:c.uid,cardId:c.cardId,line,ready:c.ready,
   bp:bp(pack,s,c),fieldEntryStamp:c.fieldEntryStamp??null}
 }));
 if(!jobs.length){retirementJobsInserted=0;return 0;}
 const entry={key:c.uid+':onRetire:'+(c.fieldEntryStamp??'0'),owner:p,
  sourceUid:c.uid,jobs};
 if(Array.isArray(s.retirementBatch)){
  if(s.retirementBatch.some(x=>x.sourceUid===c.uid))
   throw Error('Retirement trigger already queued for this physical card');
  s.retirementBatch.push(entry);
  retirementJobsInserted=0;
  return 0;
 }
 // A lone retirement interrupts the suspended continuation (next LIFE,
 // Impact damage, or the causing effect's follow-up). Q74: 退場時 before Impact.
 retirementJobsInserted=unshiftRetirementEntries(s,[entry]);
 return retirementJobsInserted;
}
function retire(pack,s,p,line,slot,{postImpact=false}={}){
 const c=s.players[p][line][slot];
 if(!c)throw Error('Cannot retire empty field');
 retirementJobsInserted=0;
 if(protectedLeave(pack,s,c)){
  s.pending={kind:'leave-replacement',player:p,uid:c.uid,line,slot,
   postImpact,destination:'outside'};
  return true;
 }
 queueRetirement(pack,s,p,c,line);
 vacate(pack,s,p,line,slot,'outside');
 recordCompletedMove(pack,s,{physical:c,owner:p,from:line,to:'outside',reason:'retirement'});
 recordTrueRetirement(pack,s,p,c,line);
 return false;
}
function queueImpactAfterRetirement(pack,s,defender){
 // Q74: printed 退場時 finishes before Impact's life check.
 if(retirementJobsInserted>0)s.effectQueue.splice(retirementJobsInserted,0,
  {op:'battleImpactDamage',owner:defender,defender});
 else damage(pack,s,defender);
}
// Full lines are allowed, but replacement is a mandatory explicit choice.
// The displaced card (and any Raid layers) goes to REMOVAL, not sideline.
function legalDestinations(pl,line,source=null){
 const out=[],slots=pl[line],full=slots.every(Boolean);
 for(let slot=0;slot<slots.length;slot++){
  const occupied=slots[slot];
  if(source&&source.line===line&&source.slot===slot){
   out.push({slot});continue;
  }
  if(!occupied)out.push({slot});
  else if(full)out.push({slot,replaceUid:occupied.uid});
 }
 return out;
}
function commitDestination(pack,s,p,line,slot,replaceUid,source=null){
 const occupant=s.players[p][line][slot];
 if(source&&source.line===line&&source.slot===slot)return;
 if(!occupant){
  if(replaceUid!==undefined)throw Error('No card needs replacement');
  return;
 }
 if(replaceUid!==occupant.uid||!s.players[p][line].every(Boolean))
  throw Error('Full line replacement must designate exact existing card');
 // Full-line replacement is a real removal (not a retirement).
 // Q61 subordinate Raid layers go outside, not removed.
 vacate(pack,s,p,line,slot,'removed');
 recordCompletedMove(pack,s,{physical:occupant,owner:p,
  from:line,to:'removed',reason:'rule'});
}

// Official Q73: one physical, public reveal snapshot before any check is resolved.
// The existing effectQueue serializes choices, nested effects and late releases.
function revealLifeBatch(pack,s,owner,count){
 const pl=s.players[owner];
 if(s.lifeRevealBatch||s.players.some(p=>p.lifeRevealed.length))
  throw Error('Nested LIFE reveal unresolved');
 const {revealed}=planSimultaneousLifeReveal(pl.life,count);
 if(!revealed.length){s.status='finished';s.winner=1-owner;s.endReason='unblocked-attack';return;}
 const remaining=[];
 for(const physical of revealed){
  if(pl.life[0]?.uid!==physical.uid)throw Error('Physical LIFE order changed');
  pl.life.shift();pl.lifeRevealed.push(physical);
  recordCompletedMove(pack,s,{physical,owner,from:'life',to:'lifeRevealed',reason:'rule'});
  const trig=card(pack,physical).trigger;
  s.publicReveals.push({owner,title:titleOf(pack,owner),cardId:physical.cardId,
   uid:physical.uid,trigger:trig||null,turn:s.turn});
  remaining.push(physical.uid);
 }
 if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
 s.lifeRevealBatch={owner,remaining};
 s.effectQueue.unshift({op:'lifeBatchStep',owner});
}
function selectLifeBatchItem(pack,s,uid){
 const batch=s.lifeRevealBatch,pl=s.players[batch.owner];
 if(!batch.remaining.includes(uid))throw Error('Not an available LIFE UID');
 const at=pl.lifeRevealed.findIndex(c=>c.uid===uid);
 if(at<0)throw Error('Revealed physical LIFE card missing');
 batch.remaining.splice(batch.remaining.indexOf(uid),1);
 const trigger=card(pack,pl.lifeRevealed[at]).trigger;
 if(['draw','get','active','special','color','raid'].includes(trigger)||
  trigger==='final'&&!pl.life.length)
  s.pending={kind:'life-trigger',player:batch.owner,uid,trigger,batch:true};
 else moveOwnedLinear(pack,s,{owner:batch.owner,from:'lifeRevealed',
  to:'outside',index:at,reason:'rule'});
}
function damage(pack,s,defender){
 // Reentrant single damage must not bypass the atomic-batch guard.
 if(s.lifeRevealBatch||s.players.some(p=>p.lifeRevealed.length))
  throw Error('Nested LIFE reveal unresolved');
 const pl=s.players[defender];
 if(!pl.life.length){s.status='finished';s.winner=1-defender;s.endReason='unblocked-attack';return;}
 const c=moveOwnedLinear(pack,s,{owner:defender,from:'life',to:'outside',
  index:0,reason:'rule'});
 const trig=card(pack,c).trigger;
 s.publicReveals.push({owner:defender,title:titleOf(pack,defender),cardId:c.cardId,uid:c.uid,trigger:trig||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.shift();
 if(['get','draw','active','special','color','raid'].includes(trig)||(trig==='final'&&!pl.life.length)){
  s.pending={kind:'life-trigger',player:defender,uid:c.uid,trigger:trig};
 }else if(!pl.life.length&&!s.effectQueue.length){
  // Q12: an already-earned continuation must complete before declaring LIFE-zero.
  s.status='finished';s.winner=1-defender;s.endReason='life-zero';
 }
}
function finishPending(s){
 if(s.status==='playing'&&!s.pending&&!s.lifeRevealBatch&&!s.effectQueue.length&&
  s.players.some(p=>p.life.length===0)){
  const defeated=s.players.findIndex(p=>p.life.length===0);
  s.status='finished';s.winner=1-defeated;s.endReason='life-zero';
 }
}
function advanceAfterEnd(pack,s,owner){
 const pl=s.players[owner];
 // End phase: REST cards return ACTIVE before opponent's turn.
 if(!s.endRefreshed){
  // The attack-end ACTIVE refresh still falls inside the printed prohibition.
  refreshFieldActive(s,owner);
  expireContinuousStates(s,{player:owner,phase:'attack',edge:'end'});
  s.endRefreshed=true;
 }
 if(pl.hand.length>8){s.pending={kind:'end-hand-limit',player:owner};return;}
 s.active=1-owner;
 startTurn(pack,s);
}
function resolveChoice(s,a,pack){
 const q=s.pending,p=s.players[q.player];
 if(q.kind==='life-batch-order'){
  if(!s.lifeRevealBatch)throw Error('Invalid LIFE order');
  const entries=q.entries||[];
  const selected=a.type==='chooseLifeEffect'?entries.find(e=>e.key===a.key):null;
  if(a.type==='chooseLifeEffect'?!selected:!q.choices.includes(a.uid))
   throw Error('Invalid LIFE UID or effect order');
  s.pending=null;
  s.effectQueue.unshift({op:'lifeBatchStep',owner:q.player,
   entries:entries.filter(e=>e!==selected)});
  if(selected)s.effectQueue.unshift(...selected.jobs);
  else selectLifeBatchItem(pack,s,a.uid);
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-move-order'){
  const selected=q.entries.find(x=>x.key===a.key);
  if(!selected)throw Error('Illegal earned move ordering');
  const rest=q.entries.filter(x=>x!==selected);
  s.pending=null;s.effectQueue.unshift(...selected.jobs,
   ...(rest.length?[{op:'effectMoveOrder',owner:q.player,entries:rest}]:[]));
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-rest-tuck'){
  if(a.mode==='rest'){
   const watcher=location(s,q.player,q.sourceUid);
   if(!watcher||watcher.c.fieldEntryStamp!==q.sourceStamp||
    !watcher.c.ready||(watcher.c.under||[]).some(x=>x.faceDown===true))
    throw Error('Invalid earned REST field watcher');
   watcher.c.ready=false;
   s.pending={kind:'effect-tuck-moved',player:q.player,
    sourceUid:q.sourceUid,sourceStamp:q.sourceStamp,movedUid:q.movedUid};
  }else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-tuck-moved'){
  if(a.uid!==null){
   if(a.uid!==q.movedUid)throw Error('Illegal moving physical UID');
   const watcher=location(s,q.player,q.sourceUid);
   if(!watcher||watcher.c.fieldEntryStamp!==q.sourceStamp||
    (watcher.c.under||[]).some(x=>x.faceDown===true))
    throw Error('Under target has left or changed');
   const index=p.outside.findIndex(c=>c.uid===q.movedUid);
   if(index<0)throw Error('Earned moved card no longer outside');
   const physical=p.outside.splice(index,1)[0];
   physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
   watcher.c.under??=[];watcher.c.under.push(physical);
   recordCompletedMove(pack,s,{physical,owner:q.player,
    from:'outside',to:'raid-under',reason:'own-effect',sourceUid:watcher.c.uid});
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='phase-order'||q.kind==='retirement-order'){
  const selected=q.entries.find(x=>x.key===a.key);
  if(!selected)throw Error('Invalid simultaneous-effect order');
  const rest=q.entries.filter(x=>x.key!==a.key);
  const orderOp=q.kind==='phase-order'?'phaseOrder':'retirementOrder';
  s.pending=null;s.effectQueue.unshift(...selected.jobs,
   ...(rest.length?[{op:orderOp,owner:q.player,entries:rest}]:[]));
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='attack-end-swap'){
  if(a.uid!==null){
   const src=location(s,q.player,q.sourceUid),dest=location(s,q.player,a.uid);
   if(!src||src.line!=='front'||src.c.fieldEntryStamp!==q.sourceStamp||
    !dest||dest.line!=='energy'||!q.choices.some(c=>c.uid===a.uid&&
     c.stamp===dest.c.fieldEntryStamp))
    throw Error('Invalid physical attack-end swap');
   p.front[src.slot]=dest.c;p.energy[dest.slot]=src.c;
   recordCompletedMove(pack,s,{physical:src.c,owner:q.player,
    from:'front',to:'energy',reason:'own-effect',sourceUid:src.c.uid});
   recordCompletedMove(pack,s,{physical:dest.c,owner:q.player,
    from:'energy',to:'front',reason:'own-effect',sourceUid:src.c.uid});
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='block'){
  const attacker=s.players[s.active].front.find(c=>c?.uid===q.attackerUid);
  if(!attacker)throw Error('Attacker no longer exists');
  s.pending=null;
  if(attackEndSwapAvailable(pack,s,attacker)){
   if(!Number.isInteger(attacker.fieldEntryStamp)||attacker.fieldEntryStamp<1||
    s.phase!=='attack'||!(s.attacksByUid[attacker.uid]>=1))
    throw Error('Unproven physical Q2337 attack');
   s.effectQueue.push({op:'resolveAttackEndSwap',owner:s.active,
    sourceUid:attacker.uid,sourceStamp:attacker.fieldEntryStamp});
  }
  if(a.uid===null){
    const count=universalAttackDamage(pack,s,attacker);
    if(count>1)revealLifeBatch(pack,s,q.player,count);
    else damage(pack,s,q.player);
    if(!s.pending)continueEffectQueue(pack,s);
    return;
   }
  const slot=p.front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!p.front[slot].ready)throw Error('Illegal blocker');
  const blocker=p.front[slot];blocker.ready=false;
  // Official Q79/Q80 (2023-03-17): 【2回ブロック】 designates the blocker,
  // rests it, then sets it ACTIVE before battle. A loss therefore leaves
  // while ACTIVE. This count is per physical UID and is not the attack count.
  const blocked=(s.blocksByUid[blocker.uid]||0)+1;
  s.blocksByUid[blocker.uid]=blocked;
  const blockKeyword=card(pack,blocker).readyOnBlockCount;
  if(blockKeyword&&blocked===blockKeyword&&!originalEffectsDisabled(s,blocker))
   attemptFieldActive(s,q.player,blocker);
  if(bp(pack,s,attacker)>=bp(pack,s,blocker)){
   grantBattleWinToOtherOwn(pack,s,s.active,attacker,'attacker');
   const impact=impactOnBattleWin(pack,s,attacker)>0&&
    !card(pack,blocker).impactNull;
   const earnedSelfDraw=hasCurrentBattleGrant(s,attacker,'attackWinDrawGranted');
   const replacement=retire(pack,s,q.player,'front',slot,{postImpact:impact});
   if(earnedSelfDraw)s.effectQueue.splice(retirementJobsInserted,0,
    {op:'draw',owner:s.active,count:1,sourceUid:attacker.uid});
   queueAttackWinRecovery(pack,s,s.active,attacker);
   if(impact&&!replacement)queueImpactAfterRetirement(pack,s,q.player);
  }else{
   // Only strict defender BP > attacker BP earns the defender's victory.
   grantBattleWinToOtherOwn(pack,s,q.player,blocker,'blocker');
  }
  if(!s.pending)continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='leave-replacement'){
  const loc=location(s,q.player,q.uid);
  if(!loc||loc.line!==q.line||loc.slot!==q.slot)throw Error('Leaving character moved');
  retirementJobsInserted=0;
  if(a.mode==='protect'){
   const choices=facedownChoices(loc.c);
   if(!choices.length||!protectedLeave(pack,s,loc.c))throw Error('No eligible facedown replacement');
   const selection=choices.length===1?choices[0]:a.uid;
   if(!choices.includes(selection))throw Error('Must select an owned facedown replacement');
   const entry=buriedMoves(loc.c).find(e=>e.physical.uid===selection);
   if(!entry)throw Error('Missing attachment provenance');
   const consumed=detachFacedown(loc.c,selection);
   if(!consumed)throw Error('Facedown card no longer available');
   for(const moved of [entry,...buriedMoves(consumed)]){
    const physical={...moved.physical,faceDown:false,ready:false,stack:[],under:[],buffs:[],fieldEntryStamp:null};
    p.outside.push(physical);
    recordCompletedMove(pack,s,{...moved,physical,owner:q.player,from:'raid-under',
     to:'outside',reason:moved===entry?'protection':'rule',sourceUid:loc.c.uid});
   }
  }else if(a.mode==='leave'){
    if(q.destination==='outside')queueRetirement(pack,s,q.player,loc.c,q.line);
    vacate(pack,s,q.player,q.line,q.slot,q.destination);
    recordCompletedMove(pack,s,{physical:loc.c,owner:q.player,
     from:q.line,to:q.destination,reason:q.destination==='outside'?'retirement':'rule'});
    if(q.destination==='outside')recordTrueRetirement(pack,s,q.player,loc.c,q.line);
   }
  else throw Error('Invalid leave replacement option');
  s.pending=null;
  if(q.retirementAfter)
   s.effectQueue.push(...(a.mode==='leave'?q.retirementAfter:[]),...q.retirementTail);
  if(q.originalAction&&a.mode==='leave'){
   // The mandatory full-line removal happens BEFORE the original action.
   // Resume the same paid play/movement/life Raid, now with a free slot.
   // Nested life triggers retain their original pending owner and card UID.
   s.pending=q.previousPending||null;
   const resumed={...q.originalAction};delete resumed.replaceUid;
   Object.assign(s,dispatchUniversalAction(pack,s,resumed,{actor:q.player}));
   return;
  }
  // Choosing protection prevents the original line vacancy; the pending
  // deployment is cancelled WITHOUT paying AP and can be attempted anew.
  // A conditional +BP may itself come from the sacrificed facedown card.
  // After removing the final layer, re-evaluate state-based BP immediately:
  // a character at 0 or below must still retire before queued effects or
  // blocking can resume. This is NOT a second paid play or replacement.
  if(a.mode==='protect'){
   const survivor=location(s,q.player,q.uid);
   if(survivor&&bp(pack,s,survivor.c)<=0)
    retire(pack,s,q.player,survivor.line,survivor.slot);
  }
  if(q.postImpact)queueImpactAfterRetirement(pack,s,q.player);
  continueEffectQueue(pack,s);finishPending(s);return;
 }
 if(q.kind==='private-top-choice'){
  if(a.mode==='outside'&&p.deck.length)moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
    reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='private-top-place'){
  if(a.mode==='bottom'&&p.deck.length)p.deck.push(p.deck.shift());
  else if(a.mode!=='top'&&a.mode!=='bottom')throw Error('Illegal deck destination');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-recover-ap'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const ap=p.apCards.find(c=>c.uid===a.uid&&c.inPlay&&!c.ready);
  if(!ap)throw Error('AP recovery must target a REST AP card owned by controller');
  ap.ready=true;q.remaining--;
  if(q.remaining<=0||!p.apCards.some(c=>c.inPlay&&!c.ready)){
   s.pending=null;continueEffectQueue(pack,s);
  }
  return;
 }
 if(q.kind==='end-hand-limit'){
  const i=p.hand.findIndex(c=>c.uid===a.uid);
  if(i<0)throw Error('End phase must remove an owned hand card');
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'removed',index:i,reason:'rule'});
  s.pending=null;
  advanceAfterEnd(pack,s,q.player);
  return;
 }
 if(q.kind==='effect-search-deck'){
  if(a.uid!==null){
   const index=p.deck.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid)||!matchesFilter(pack,s,p.deck[index],q.filter))
    throw Error('Deck search needs an eligible owned physical card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
  }else if(!q.optional)throw Error('Mandatory deck search cannot be declined');
  shuffle(s,p.deck);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-search-deck-multi'){
  if(a.uid!==null){
   const index=p.deck.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid)||!matchesSearch(pack,s,p.deck[index],q))
    throw Error('Multi search needs a matching owned physical card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   q.remaining--;
  }else if(!q.optional)throw Error('Mandatory multi-search cannot be declined');
  const choices=searchChoices(pack,s,p.deck,q);
  if(a.uid===null||q.remaining<=0||!choices.length){
   shuffle(s,p.deck);s.pending=null;continueEffectQueue(pack,s);
  }else q.choices=choices;
  return;
 }
 if(q.kind==='effect-top-filter-choice'){
  const window=p.deck.slice(0,q.uids.length);
  if(window.length!==q.uids.length||window.some((c,i)=>c.uid!==q.uids[i]))
   throw Error('Filtered top deck window changed during private selection');
  if(a.uid!==null){
   const chosen=window.find(c=>c.uid===a.uid);
   if(!chosen||!q.choices.includes(a.uid)||!matchesSearch(pack,s,chosen,q))
    throw Error('Filtered top search needs a legal inspected physical card');
   const i=p.deck.findIndex(c=>c.uid===a.uid);
   if(i<0||i>=q.uids.length)throw Error('Selected physical UID outside top window');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index:i,
    reason:'own-effect',sourceUid:q.sourceUid});
   // Printed 「公開し手札に加える」: expose ONLY the physical selected card
   // through the existing bounded publicReveals. Never expose the full
   // privately inspected window or leak private zoneMoveEvents.
   s.publicReveals.push({kind:'searched-to-hand',owner:q.player,
    title:titleOf(pack,q.player),cardId:chosen.cardId,uid:chosen.uid,
    trigger:null,turn:s.turn});
   if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
  }
  const remaining=q.uids.filter(uid=>uid!==a.uid);
  if(remaining.length)s.pending={kind:'effect-top-order',player:q.player,
   sourceUid:q.sourceUid,uids:remaining,order:[],rest:'bottom',
   ...(a.uid!==null?{discardAfter:true}:{})};
  else if(a.uid!==null)s.pending={kind:'effect-discard',player:q.player,
   sourceUid:q.sourceUid};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-top-filter-many-choice'){
  const rest=q.uids.filter(uid=>!q.selected.includes(uid));
  const window=p.deck.slice(0,rest.length);
  if(window.length!==rest.length||window.some((c,i)=>c.uid!==rest[i]))
   throw Error('Inspected TOP-N cards changed');
  if(a.uid!==null){
   const picked=window.find(c=>c.uid===a.uid);
   if(!picked||q.selected.includes(a.uid)||!q.choices.includes(a.uid)||
    !matchesSearch(pack,s,picked,q))throw Error('Invalid inspected physical UID');
   const index=p.deck.findIndex(c=>c.uid===a.uid);
   if(index<0||index>=rest.length)throw Error('TOP-N UID outside inspected window');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.publicReveals.push({kind:'searched-to-hand',owner:q.player,
    title:titleOf(pack,q.player),cardId:picked.cardId,uid:picked.uid,
    trigger:null,turn:s.turn});
   if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
   q.selected.push(a.uid);
  }
  const leftover=q.uids.filter(uid=>!q.selected.includes(uid));
  const candidates=p.deck.slice(0,leftover.length).filter(c=>q.choices.includes(c.uid));
  if(a.uid===null||q.selected.length===q.max||!candidates.length){
   if(leftover.length)s.pending={kind:'effect-top-order',player:q.player,
    sourceUid:q.sourceUid,uids:leftover,order:[],rest:'bottom'};
   else{s.pending=null;continueEffectQueue(pack,s);}
  }
  return;
 }
 if(q.kind==='effect-top-inspect-many'){
  if(a.uid!==null){
   if(!q.uids.includes(a.uid)||q.selected.includes(a.uid))
    throw Error('Invalid inspected card selection');
   q.selected.push(a.uid);
   if(q.selected.length<q.uids.length)return;
  }
  const window=p.deck.slice(0,q.uids.length);
  if(window.length!==q.uids.length||window.some((c,i)=>c.uid!==q.uids[i]))
   throw Error('Inspected deck window has changed');
  const chosen=new Set(q.selected),remaining=window.filter(c=>!chosen.has(c.uid));
  p.deck.splice(0,q.uids.length);
  const moved=window.filter(c=>chosen.has(c.uid));
  p.outside.push(...moved);
  for(const physical of moved)recordCompletedMove(pack,s,{physical,owner:q.player,
   from:'deck',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
  p.deck.unshift(...remaining);
  if(remaining.length)s.pending={kind:'effect-top-order',player:q.player,
   sourceUid:q.sourceUid,uids:remaining.map(c=>c.uid),order:[],rest:q.rest};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-top-trait-outside'){
  const window=p.deck.slice(0,q.uids.length);
  if(window.length!==q.uids.length||window.some((c,i)=>c.uid!==q.uids[i]))
   throw Error('Trait top window changed during private selection');
  if(a.uid!==null){
   const chosen=window.find(c=>c.uid===a.uid);
   if(!chosen||!q.choices.includes(a.uid)||!(cardHasTrait(card(pack,chosen),q.trait)||
     (q.orName&&cardHasName(card(pack,chosen),q.orName))))
    throw Error('Trait top choice is not an inspected exact-token match');
   const index=p.deck.findIndex(c=>c.uid===a.uid);
   if(index<0||index>=q.uids.length)throw Error('Selected card left the top window');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index,
    reason:'own-effect',sourceUid:q.sourceUid});
  }
  const remaining=q.uids.filter(uid=>uid!==a.uid);
  if(remaining.length)s.pending={kind:'effect-top-order',player:q.player,
   sourceUid:q.sourceUid,uids:remaining,order:[],rest:'top'};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-optional-draw'){
  if(a.mode==='draw'){
   if(!p.deck.length)throw Error('Optional draw has no deck card');
   draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  }else if(a.mode!=='skip')throw Error('Invalid optional draw');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-optional-mill'){
  if(a.mode==='mill'){
   if(!p.deck.length)throw Error('Optional mill has no deck card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
    reason:'own-effect',sourceUid:q.sourceUid});
  }else if(a.mode!=='skip')throw Error('Invalid optional mill');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-pay-ap-deploy'){
  if(a.mode==='skip'){s.pending=null;continueEffectQueue(pack,s);return;}
  if(a.mode!=='pay')throw Error('Invalid AP deployment choice');
  spendAp(p,1);
  const produced=universalEnergyByColor(pack,s,q.player);
  const choices=p.outside.filter(c=>{
   const d=card(pack,c);
   return d.type==='character'&&!d.raidName&&
    cardHasName(d,q.name,originalEffectsDisabled(s,c))&&
    d.energy<=(produced[d.color]||0);
  }).map(c=>c.uid);
  if(choices.length)s.pending={kind:'effect-outside-name-rest',player:q.player,
   sourceUid:q.sourceUid,choices,name:q.name,energyLimited:true};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-top-inspect'){
  if(a.uid!==null){
   if(!q.uids.includes(a.uid))throw Error('Cannot send uninspected card outside');
   const index=p.deck.findIndex(c=>c.uid===a.uid);
   if(index<0||index>=q.uids.length)throw Error('Inspected card left deck window');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index,
    reason:'own-effect',sourceUid:q.sourceUid});
  }
  const remaining=q.uids.filter(uid=>uid!==a.uid);
  if(remaining.length)s.pending={kind:'effect-top-order',player:q.player,
   sourceUid:q.sourceUid,uids:remaining,order:[],rest:q.rest};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-top-order'){
  if(!q.uids.includes(a.uid)||q.order.includes(a.uid))
   throw Error('Top arrangement must pick one remaining inspected card');
  q.order.push(a.uid);
  if(q.order.length===q.uids.length){
   // The inspected cards have not moved while decisions were pending.
   // Reorder exactly this top window, keeping every uninspected deck card
   // untouched and without exposing the identities to the opponent.
   const window=p.deck.splice(0,q.uids.length);
   if(new Set(window.map(c=>c.uid)).size!==q.uids.length||
    window.some(c=>!q.uids.includes(c.uid)))
    throw Error('Inspected deck window was changed');
   const byUid=new Map(window.map(c=>[c.uid,c]));
   const ordered=q.order.map(uid=>byUid.get(uid));
   if(q.rest==='top')p.deck.unshift(...ordered);
   else p.deck.push(...ordered);
   if(q.discardAfter){
    if(!p.hand.length)throw Error('Mandatory contingent discard has no hand card');
    s.pending={kind:'effect-discard',player:q.player,sourceUid:q.sourceUid};
   }else{s.pending=null;continueEffectQueue(pack,s);}
  }
  return;
 }
 if(q.kind==='effect-bounce-own'){
  if(a.uid===null&&q.optional===true){s.pending=null;continueEffectQueue(pack,s);return;}
  if(!q.choices.includes(a.uid))throw Error('Illegal own bounce target');
  const found=location(s,q.player,a.uid);
  if(!found||!['front','energy'].includes(found.line)||found.c.uid===q.sourceUid||
   card(pack,found.c).type!=='character'||(q.optional===true?
    cardHasName(card(pack,found.c),q.excludeName):card(pack,found.c).energy>q.energy))
   throw Error('Invalid own bounce target');
  bounceToHand(pack,s,q.player,a.uid,q.sourceUid);
  if(q.optional===true&&s.players[q.player].hand.some(c=>c.uid===a.uid))
   s.effectQueue.unshift(...q.after.map(e=>({...e,owner:q.player,sourceUid:q.sourceUid})));
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-outside-traitless-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.outside.findIndex(c=>c.uid===a.uid),physical=p.outside[i];
   if(!physical||!q.choices.includes(a.uid))throw Error('Invalid OWN outside UID');
   const d=card(pack,physical),threshold=Math.min(30,q.baseEnergy+
    p.outside.filter(c=>c.uid!==q.sourceUid&&card(pack,c).type==='field').length);
   if(d.type!=='character'||d.traits.length!==0||
    d.color!==q.color||d.energy>q.energyLimit||d.energy>threshold||
    d.ap!==q.ap)throw Error('Changed printed outside traitless energy condition');
   if(a.mode==='raid'){
    const base=location(s,q.player,a.baseUid);
    if(!base||!d.raidName||!validRaidBase(pack,s,q.player,base.c,d)||
     !['front','energy'].includes(a.line))throw Error('Invalid named base for outside Raid');
    p.outside.splice(i,1);
    s.pending=null;
    performRaid(pack,s,q.player,physical,a.baseUid,a.line,a.slot,a.replaceUid,
     {entryReady:false,entryCause:'outsideEffectRaid',entryFrom:'outside',effectSourceUid:q.sourceUid});
    continueEffectQueue(pack,s);return;
   }
   if(a.mode!=='enter'||!['front','energy'].includes(a.line)||
    (a.line==='front'&&d.frontForbidden))throw Error('Invalid outside REST entry line');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.outside.splice(i,1);physical.ready=false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});s.pending=null;
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect'));
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-outside-name-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.outside.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Name REST deployment needs an eligible own UID and line');
   const physical=p.outside[i],d=card(pack,physical);
   const produced=q.energyLimited?universalEnergyByColor(pack,s,q.player):null;
   if(d.type!=='character'||d.raidName||
    !cardHasName(d,q.name,originalEffectsDisabled(s,physical))||
    (a.line==='front'&&d.frontForbidden)||
    (produced&&d.energy>(produced[d.color]||0)))
    throw Error('Name REST printed filters changed');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.outside.splice(i,1);physical.ready=false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect'));
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-named-zone-entry'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   if(!['hand','outside'].includes(a.zone)||!['front','energy'].includes(a.line)||
    (q.line!=='any'&&a.line!==q.line))throw Error('Invalid named-zone destination');
   const choices=a.zone==='hand'?q.handChoices:q.outsideChoices;
   const i=p[a.zone].findIndex(c=>c.uid===a.uid);
   if(i<0||!choices.includes(a.uid))throw Error('Invalid named-zone own UID');
   const physical=p[a.zone][i],d=card(pack,physical);
   if(d.type!==(q.cardType||'character')||!cardHasName(d,q.name,originalEffectsDisabled(s,physical))||
    (q.color!==undefined&&(d.color!==q.color||d.ap!==q.ap||d.energy>q.maxEnergy))||
    (a.line==='front'&&d.frontForbidden))throw Error('Name/entry restriction changed');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p[a.zone].splice(i,1);physical.ready=q.ready;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   if(q.grantBp!==undefined){physical.buffs??=[];
    physical.buffs.push({bp:q.grantBp,untilTurn:s.turn});}
   recordCompletedMove(pack,s,{physical,owner:q.player,from:a.zone,to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   applyEffects(pack,s,physical,'onPlay',q.player,a.zone==='outside'?'outsideEffect':'ownEffect');
   return;
  }
  if(q.kind==='effect-hand-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.hand.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Hand effect entry requires eligible own UID');
   const physical=p.hand[i],d=card(pack,physical);
   if(d.type!==q.type||d.color!==q.color||d.ap!==q.ap||
    (q.special?(q.maxEnergy!==null&&d.energy>q.maxEnergy)||
      (q.trait!==null&&!cardHasTrait(d,q.trait)):d.energy>q.energy)||
    (a.line==='front'&&(d.type!=='character'||d.frontForbidden)))
    throw Error('Hand effect entry printed condition changed');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.hand.splice(i,1);physical.ready=q.special?q.ready:false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'hand',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   // Grant only to the card that has actually entered this legal slot.
   if(q.special&&q.protectionScope!==null)
    grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',controller:q.player,
     sourceUid:q.sourceUid,targetUid:physical.uid,sourceLinked:false,
     selectionScope:q.protectionScope,
     until:{player:q.player,phase:'start',edge:'start'}});
   if(q.max>1)s.effectQueue.unshift({op:q.special?'deployOwnHandSpecial':'deployOwnHandRest',
    owner:q.player,sourceUid:q.sourceUid,sourceName:q.sourceName,
    type:q.type,color:q.color,ap:q.ap,max:q.max-1,
    ...(q.special?{trait:q.trait,maxEnergy:q.maxEnergy,ready:q.ready,
     protectionScope:q.protectionScope}:{energy:q.energy})});
   applyEffects(pack,s,physical,'onPlay',q.player,'ownEffect');
   return;
  }
  if(q.kind==='effect-outside-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.outside.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Outside REST deployment needs eligible own UID and line');
   const physical=p.outside[i],d=card(pack,physical);
   if(d.type!=='character'||d.raidName||!cardHasName(d,q.name)||
    d.color!==q.color||d.energy>q.energy||d.ap!==q.ap)
    throw Error('Outside REST printed filters changed');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.outside.splice(i,1);physical.ready=false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect'));
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-recover-outside'){
  if(a.uid!==null){
   const index=p.outside.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid)||!matchesOutsideRecovery(pack,s,p.outside[index],q))
    throw Error('Outside recovery needs an eligible owned physical card');
   const recovered=p.outside.splice(index,1)[0];
   p.hand.push(recovered);
   recordCompletedMove(pack,s,{physical:recovered,owner:q.player,from:'outside',to:'hand',
   reason:'own-effect',sourceUid:q.sourceUid});
   // Recovered card's OWN mandatory print resolves before the recovering
   // source's remaining jobs. UID ownership and the source zone were
   // checked above. No trigger on GET Life, searchDeck, draw or bounce.
   const onRecover=programJobs(pack,s,recovered,'onOutsideRecover',q.player);
   if(onRecover.length)s.effectQueue.unshift(...onRecover,
   ...sourceMoveBoundary(pack,s,q.player,recovered.uid));
   // Only an OWN outside card recovered to its OWN hand via a printed
   // own effect is eligible. This interrupts the existing ordered queue.
   if(card(pack,recovered).ownOutsideRecovery?.op==='restSelfToEnergy'){
    s.pending={kind:'recovered-self-entry',player:q.player,uid:recovered.uid};
    return;
   }
  }else if(!q.optional)throw Error('Mandatory outside recovery cannot be declined');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='recovered-self-entry'){
  const index=p.hand.findIndex(c=>c.uid===q.uid);
  if(index<0||card(pack,p.hand[index]).ownOutsideRecovery?.op!=='restSelfToEnergy')
   throw Error('Recovered source no longer in its own hand');
  if(a.mode==='skip'){s.pending=null;continueEffectQueue(pack,s);return;}
  if(a.mode!=='enter'||a.line!=='energy')
   throw Error('Recovered character may enter ENERGY line only');
  commitDestination(pack,s,q.player,'energy',a.slot,a.replaceUid);
  const entrant=p.hand.splice(index,1)[0];
  entrant.ready=false;entrant.fieldEntryStamp=s.nextFieldEntryStamp++;
  p.energy[a.slot]=entrant;
  recordCompletedMove(pack,s,{physical:entrant,owner:q.player,from:'hand',
   to:'energy',reason:'own-effect',sourceUid:entrant.uid});
  s.pending=null;
  // This is entry via an effect, so onPlay executes with no additional AP.
  s.effectQueue.unshift(...programJobs(pack,s,entrant,'onPlay',q.player,undefined,'recoveredEffect'));
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-selection-hand-payment'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  if(index<0)throw Error('Tax payment needs physical OWN hand UID');
  const original=q.originPending,chosen=q.targetAction;
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   reason:'payment',sourceUid:q.sourceUid});
  s.pending=original;resolveChoice(s,chosen,pack);return;
 }
 if(q.kind==='effect-discard-cost'){
  if(a.uid!==null){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('Discard payment needs an owned hand card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   controller:q.kind==='effect-discard'&&/^[01]-/.test(q.sourceUid||'')
    ?Number(q.sourceUid[0]):q.player,
   reason:q.kind==='effect-discard'
    ?(q.sourceUid?.startsWith(q.player+'-')?'own-effect':'opponent-effect')
    :'payment',sourceUid:q.sourceUid});
   draw(pack,s,q.player,q.count,{reason:'own-effect',sourceUid:q.sourceUid});
  }else if(!q.optional)throw Error('Mandatory cost cannot be declined');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-discard-gate'){
  if(q.count===2){
   if(Array.isArray(a.uids)){
    if(a.uids.length!==2||a.uids[0]===a.uids[1]||
     a.uids.some(uid=>!p.hand.some(c=>c.uid===uid&&legalNamedPayment(pack,c,q.payment))))
     throw Error('Two hand payment requires two distinct owned physical UIDs');
    // Both UIDs validate before moving any card; dispatch works on a clone.
    for(const uid of a.uids){
     const index=p.hand.findIndex(c=>c.uid===uid);
     moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',
      index,reason:'payment',sourceUid:q.sourceUid});
    }
    s.effectQueue.unshift(...q.then.map(e=>({...e,owner:q.player,sourceUid:q.sourceUid})));
   }else if(a.uid!==null||!q.optional)throw Error('Atomic hand pair cannot partially pay');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(a.uid!==null){
   const index=p.hand.findIndex(c=>c.uid===a.uid&&legalNamedPayment(pack,c,q.payment));
   if(index<0)throw Error('Gate payment must discard a matching owned hand card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   controller:q.kind==='effect-discard'&&/^[01]-/.test(q.sourceUid||'')
    ?Number(q.sourceUid[0]):q.player,
   reason:q.kind==='effect-discard'
    ?(q.sourceUid?.startsWith(q.player+'-')?'own-effect':'opponent-effect')
    :'payment',sourceUid:q.sourceUid});
   // Place paid effects immediately in front of later unrelated effects.
   // Pending nested choices suspend this queue without losing the remaining
   // effects. Declining payment never schedules any of the gated effects.
   s.effectQueue.unshift(...q.then.map(e=>({...e,owner:q.player,
    sourceUid:q.sourceUid})));
  }else if(!q.optional)throw Error('Required gated cost cannot be declined');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-discard'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  if(index<0)throw Error('Discard requires an owned hand card');
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   controller:q.kind==='effect-discard'&&/^[01]-/.test(q.sourceUid||'')
    ?Number(q.sourceUid[0]):q.player,
   reason:q.kind==='effect-discard'
    ?(q.sourceUid?.startsWith(q.player+'-')?'own-effect':'opponent-effect')
    :'payment',sourceUid:q.sourceUid});
  const remaining=(q.remaining??1)-1;
  if(remaining>0&&p.hand.length)q.remaining=remaining;
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='raid-effect-order'){
  const ordered=a.mode==='baseFirst'?
   [...q.baseJobs,...q.entryJobs,...q.raidJobs]:
   [...q.entryJobs,...q.baseJobs,...q.raidJobs];
  s.pending=null;s.effectQueue.unshift(...ordered);
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='main-discard-self-retire'){
  const pos=location(s,q.player,q.sourceUid),src=pos?.c;
  const ability=src&&card(pack,src).mainAbility;
  const idx=p.hand.findIndex(c=>c.uid===a.uid);
  if(!pos||!src||!['front','energy'].includes(pos.line)||
   src.fieldEntryStamp!==q.sourceStamp||src.ready!==false||
   ability?.op!=='restDiscardRetireThen'||idx<0||!q.choices.includes(a.uid))
   throw Error('MAIN cost requires exact REST source and OWN hand UID');
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index:idx,
   reason:'payment',sourceUid:q.sourceUid});
  s.pending=null;
  // Earn a continuation first; true retirement inserts any onRetire jobs
  // before that continuation in the ORIGINAL queue.
  s.effectQueue.unshift(...ability.then.map(x=>({...x,owner:q.player,
   sourceUid:q.sourceUid,sourceName:card(pack,src).name})),
   ...sourceMoveBoundary(pack,s,q.player,q.sourceUid));
  const paused=retire(pack,s,q.player,pos.line,pos.slot);
  if(!paused)continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='main-discard-buff'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  const source=field(p).find(c=>c.uid===q.sourceUid);
  if(index<0||!source||card(pack,source).mainAbility?.op!=='discardHandBuffSelf'||
   s.mainAbilityUsedUids.includes(source.uid)||!q.choices.includes(a.uid))
   throw Error('Main discard BP must pay one OWN hand card for a current OWN source');
  // Payment precedes the temporary BP. No AP, REST or once-use consumed
  // until an exact physical own-hand discard has actually been submitted.
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   controller:q.kind==='effect-discard'&&/^[01]-/.test(q.sourceUid||'')
    ?Number(q.sourceUid[0]):q.player,
   reason:q.kind==='effect-discard'
    ?(q.sourceUid?.startsWith(q.player+'-')?'own-effect':'opponent-effect')
    :'payment',sourceUid:q.sourceUid});
  source.buffs??=[];source.buffs.push({bp:q.bp,untilTurn:s.turn});
  s.mainAbilityUsedUids.push(source.uid);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='main-two-buff'){
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!cardHasTrait(card(pack,target),q.trait))
   throw Error('Invalid main-phase trait BP target');
  target.buffs??=[];
  target.buffs.push({bp:q.bp,untilTurn:s.turn});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-choice-mode'){
  const selected=q.options.find(o=>o.id===a.mode);
  if(!selected){
   if(!(a.mode==='skip'&&q.optional))throw Error('Invalid printed effect mode');
  }else{
   s.effectQueue.unshift(...selected.then.map(e=>({...e,owner:q.player,
    sourceUid:q.sourceUid,sourceName:q.sourceName})));
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-once-choice'){
  if(a.mode==='activate'){
   if(s.onceEffectUses[q.player].includes(q.key))
    throw Error('Once-per-turn gate already used');
   s.onceEffectUses[q.player].push(q.key);
   s.effectQueue.unshift(...q.then.map(e=>({...e,owner:q.player,
    sourceUid:q.sourceUid,sourceName:q.sourceName})));
  }else if(a.mode!=='skip')throw Error('Unknown once-per-turn decision');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-buff-own'){
  if(a.uid===null){
   if(!q.optional)throw Error('Mandatory buff cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||
   (target.uid===q.sourceUid&&q.excludeSelf)||
   card(pack,target).type!=='character'||!matchesFilter(pack,s,target,q.filter))
   throw Error('Illegal own field BP target');
  target.buffs??=[];target.buffs.push({bp:q.bp,untilTurn:s.turn});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-buff-trait'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||!cardHasTrait(card(pack,target),q.trait))
   throw Error('Illegal own-trait buff target');
  target.buffs.push({bp:q.bp,untilTurn:s.turn});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='main-rest-front-energy'){
  const source=field(p).find(c=>c.uid===q.sourceUid);
  const target=p.front.find(c=>c?.uid===a.uid);
  if(!source||!target||!target.ready||!q.choices.includes(a.uid)||
   card(pack,target).type!=='character')
   throw Error('Front REST energy needs the chosen ACTIVE front character');
  target.ready=false;
  source.buffs??=[];
  source.buffs.push({energy:q.extraEnergy,untilTurn:s.turn});
  s.pending=null;
  return;
 }
 if(q.kind==='effect-own-front-protect'){
   const choice=q.choices.find(c=>c.uid===a.uid),
    selected=p.front.find(c=>c?.uid===a.uid);
   if(!choice||!selected||selected.fieldEntryStamp!==choice.stamp||
    card(pack,selected).type!=='character')
    throw Error('Illegal or stale own FRONT selection protection target');
   grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',controller:q.player,
    sourceUid:q.sourceUid,targetUid:selected.uid,sourceLinked:false,
    selectionScope:q.scope,until:{player:q.player,phase:'start',edge:'start'}});
   const recover=!!q.apRecoveryOnName&&
    cardHasName(card(pack,selected),q.apRecoveryOnName,
      originalEffectsDisabled(s,selected));
   s.pending=null;
   if(recover)s.effectQueue.unshift({op:'recoverAp',owner:q.player,
    sourceUid:q.sourceUid,count:1});
   continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-grant-ap-tax'){
   if(a.uid!==null){
    const selected=q.choices.find(c=>c.uid===a.uid);
    const target=field(p).find(c=>c.uid===a.uid);
    if(!selected||!target||target.fieldEntryStamp!==selected.stamp||
     target.uid===q.sourceUid||card(pack,target).type!=='character'||
     !cardHasTrait(card(pack,target),q.trait))
     throw Error('Invalid printed AP-tax grant target or old field incarnation');
    grantContinuousState(s,{kind:'selectionApTax',controller:q.player,
     sourceUid:q.sourceUid,targetUid:target.uid,sourceLinked:false,
     until:{player:1-q.player,phase:'attack',edge:'end',
      ownTurn:s.players[1-q.player].ownTurns+1}});
   }
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-grant-front-energy'){
   if(a.uid!==null){
    const choice=q.choices.find(c=>c.uid===a.uid);
    const target=p.front.find(c=>c?.uid===a.uid);
    if(!choice||!target||target.fieldEntryStamp!==choice.stamp||
     target.uid===q.sourceUid||card(pack,target).type!=='character'||
     !cardHasTrait(card(pack,target),q.trait))
     throw Error('Stale or illegal FRONT energy grant target');
    grantContinuousState(s,{kind:'frontEnergyPermission',controller:q.player,
     sourceUid:q.sourceUid,targetUid:target.uid,sourceLinked:false,
     until:{player:s.active,phase:'attack',edge:'end'}});
   }
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-attack-ban'){
   if(a.uid!==null){
    const choice=q.choices.find(c=>c.uid===a.uid);
    const target=s.players[1-q.player].front.find(c=>c?.uid===a.uid);
    if(!choice||!target||target.fieldEntryStamp!==choice.stamp)
     throw Error('Stale or illegal attack prohibition target');
    grantContinuousState(s,{kind:'cannotAttack',controller:q.player,
     sourceUid:q.sourceUid,targetUid:target.uid,sourceLinked:false,
     until:{player:q.player,phase:'start',edge:'start'}});
   }
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-rest-bp'){
  if(a.uid===null){
   if(!q.optional)throw Error('Mandatory opponent REST cannot be declined');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const foe=1-q.player,target=(q.anyLine?field(s.players[foe]):s.players[foe].front)
   .find(c=>c?.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||
   (q.limit!==null&&bp(pack,s,target)>q.limit)||(q.onlyRest&&target.ready))
   throw Error('Illegal opponent REST target');
  if(q.restTarget!==false)target.ready=false;
  if(q.silenceUntil){
   for(const kind of ['cannotActive','originalEffectsDisabled'])
    grantContinuousState(s,{kind,controller:q.player,sourceUid:q.sourceUid,
     targetUid:target.uid,until:q.silenceUntil});
  }
  if(q.skipNextActive)grantContinuousState(s,{kind:'skipNextActive',
   controller:q.player,sourceUid:q.sourceUid,targetUid:target.uid});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='main-field-trait-retire'){
   const src=field(p).find(c=>c.uid===q.sourceUid);
   const ability=src&&card(pack,src).mainAbility,loc=location(s,q.player,a.uid);
   if(!src||card(pack,src).type!=='field'||ability?.op!=='fieldDualMain'||
    !loc||!['front','energy'].includes(loc.line)||
    !q.choices.includes(a.uid)||card(pack,loc.c).type!=='character'||
    !cardHasTrait(card(pack,loc.c),ability.retireTrait))
    throw Error('FIELD MAIN must retire an owned matching trait character');
   s.pending=null;retire(pack,s,q.player,loc.line,loc.slot);
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-retire-own-character'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const loc=location(s,q.player,a.uid);
   if(!loc||!q.choices.includes(a.uid)||card(pack,loc.c).type!=='character')
    throw Error('Illegal OWN character retirement');
   s.pending=null;
   const tail=s.effectQueue.splice(0);
   const protectedDeparture=retire(pack,s,q.player,loc.line,loc.slot);
   if(protectedDeparture){
    s.pending.retirementAfter=q.after;s.pending.retirementTail=tail;
   }else s.effectQueue.push(...q.after,...tail);
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-retire-own-field'){
   if(a.uid===null){
    if(!q.optional)throw Error('Mandatory FIELD cost cannot be skipped');
    s.pending=null;continueEffectQueue(pack,s);return;
   }
   const slot=p.energy.findIndex(c=>c?.uid===a.uid&&card(pack,c).type==='field');
   if(slot<0||!q.choices.includes(a.uid))
    throw Error('Illegal OWN FIELD retirement target');
   s.pending=null;
   if(q.after?.length){
    const tail=s.effectQueue.splice(0);
    const protectedDeparture=retire(pack,s,q.player,'energy',slot);
    if(protectedDeparture){
     s.pending.retirementAfter=q.after;s.pending.retirementTail=tail;
    }else s.effectQueue.push(...q.after,...tail);
   }else retire(pack,s,q.player,'energy',slot);
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-strip-raid-top'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
   if(slot<0||!q.choices.includes(a.uid))throw Error('Illegal opponent RAID top target');
   const top=s.players[foe].front[slot],base=top.stack?.[0];
   if(!strippableRaidTop(pack,top))
    throw Error('RAID top no longer eligible');
   // Q548-Q551: base stays, inherits readiness but not top modifiers;
   // neither retirement nor entry, so no onRetire/onPlay jobs.
   top.stack=[];base.ready=top.ready;
   // Q49 + Q546: pre-Raid base modifiers must not revive after stripping.
   base.buffs=[];
   base.fieldEntryStamp=s.nextFieldEntryStamp++;
   s.players[foe].front[slot]=base;
   s.players[foe].outside.push({...top,ready:false,stack:[],under:[],
    buffs:[],faceDown:false,fieldEntryStamp:null});
   recordCompletedMove(pack,s,{physical:top,owner:foe,controller:q.player,
    from:'front',to:'outside',reason:'raid-strip',sourceUid:q.sourceUid});
   recordCompletedMove(pack,s,{physical:base,owner:foe,controller:q.player,
    from:'raid-under',to:'front',reason:'raid-strip',sourceUid:q.sourceUid});
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-named-outside-bounce-retire'){
  const source=p.resolvingEvents.find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(x=>
   x.op==='conditionalBounceOrRetireByOwnOutsideNames');
  if(!effect||effect.bp!==q.bp||effect.min!==q.min||
   JSON.stringify(effect.names)!==JSON.stringify(q.names))
   throw Error('Unproven saved named-OUTSIDE selection source');
  const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
  const target=slot>=0?s.players[foe].front[slot]:null;
  if(!target||!q.choices.includes(a.uid)||card(pack,target).type!=='character'||
   bp(pack,s,target)>q.bp||effectChoiceProtected(s,q.player,a.uid,'event')||
   !cardEffectTargetPayable(pack,s,q.player,a.uid,0,q.sourceUid))
   throw Error('Illegal physical named-OUTSIDE target');
  const retireNow=matchesV2LiveCondition(s,q.player,q.sourceUid,{
   kind:'ownOutsideNamedCountAtLeast',turn:'any',min:q.min,names:q.names
  },c=>card(pack,c),()=>calcEnergy(pack,s,q.player),c=>bp(pack,s,c));
  s.pending=null;
  if(retireNow)retire(pack,s,foe,'front',slot);
  else bounceToHand(pack,s,foe,a.uid,q.sourceUid,{
   controller:q.player,reason:'opponent-effect'});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-retire-bp'){
  if(a.uid===null&&q.optional){s.pending=null;continueEffectQueue(pack,s);return;}
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid)||bp(pack,s,s.players[opponent].front[slot])>q.limit)
   throw Error('Illegal BP-threshold retirement target');
  s.pending=null;
  retire(pack,s,opponent,'front',slot);
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-grant-attack'){
  const target=field(p).find(c=>c.uid===a.uid),source=location(s,q.player,q.sourceUid);
  if(!target||card(pack,target).type!=='character'||!q.choices.includes(a.uid)||
   !source||originalEffectsDisabled(s,source.c))throw Error('Illegal granted attack target');
  grantContinuousState(s,{kind:'grantedOnAttack',controller:q.player,
   sourceUid:q.sourceUid,targetUid:target.uid,sourceLinked:false,
   until:{player:s.active,phase:'attack',edge:'end'},program:q.program,optional:q.optional});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='granted-attack-draw'){
  s.pending=null;
  if(a.mode==='draw')draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-target-many'){
  if(a.uid!==null&&(!q.choices.includes(a.uid)||q.selected.includes(a.uid)))
   throw Error('Illegal or duplicate multi-target UID');
  if(a.uid!==null)q.selected.push(a.uid);
  if(a.uid===null||q.selected.length===q.maxTargets){
   // The targets are chosen before any modifier is applied.
   const foe=1-q.player,targets=q.selected.map(uid=>{
    const found=s.players[foe].front.find(c=>c?.uid===uid);
    if(!found)throw Error('Selected multi-target left the front line');
    return found;
   });
   for(const c of targets){c.buffs??=[];c.buffs.push({bp:-q.bp,untilTurn:s.turn});}
   const lethal=targets.filter(c=>bp(pack,s,c)<=0);
   s.pending=null;
   queueSimultaneousRetires(s,q.player,lethal.map(c=>({
    op:'retireBatchOne',owner:q.player,targetPlayer:foe,uid:c.uid
   })));
   continueEffectQueue(pack,s);
  }
  return;
 }
 if(q.kind==='effect-target'){
  if(a.uid===null&&q.optional===true){
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const foe=1-q.player;
  const lines=q.zone==='field'?['front','energy']:['front'];
  let found=null;
  for(const line of lines){
   const slot=s.players[foe][line].findIndex(c=>c?.uid===a.uid);
   if(slot>=0){found={line,slot,target:s.players[foe][line][slot]};break;}
  }
  if(!found||!q.choices.includes(a.uid))throw Error('Illegal cross-title effect target');
  const target=found.target;
  target.buffs??=[];
  target.buffs.push({bp:-q.bp,untilTurn:s.turn});
  // Official state-based rule: characters at 0 BP or below are sidelined.
  // The choice list stays the snapshot taken when the effect resolved.
  s.pending=null;
  if(bp(pack,s,target)<=0)retire(pack,s,foe,found.line,found.slot);
  continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='life-trigger'){
  // Clear only the original life choice. A COLOR/RAID onPlay can create a NEW
  // pending decision; never wipe that nested decision after resolving it.
  s.pending=null;
  const sourceZone=q.batch?'lifeRevealed':'outside';
  const i=p[sourceZone].findIndex(c=>c.uid===q.uid);
  if(q.batch)s.effectQueue.unshift({op:'lifeRelease',owner:q.player,uid:q.uid});
  if(i<0)throw Error('Revealed life card not found');
  if(a.mode==='get'&&q.trigger==='get')moveOwnedLinear(pack,s,{
   owner:q.player,from:sourceZone,to:'hand',index:i,reason:'life-trigger',sourceUid:q.uid});
  else if(a.mode==='draw'&&q.trigger==='draw')draw(pack,s,q.player,1,{reason:'life-trigger',sourceUid:q.uid});
  else if(a.mode==='active'&&q.trigger==='active'){
   const target=field(p).find(c=>c.uid===a.uid);
   if(!target||card(pack,target).type!=='character')throw Error('Illegal ACTIVE trigger target');
   // Official FAQ Q101 permits targeting a character already ACTIVE.
   attemptFieldActive(s,q.player,target);
   target.buffs??=[];
   target.buffs.push({bp:3000,untilTurn:s.turn});
  }
  else if(a.mode==='special'&&q.trigger==='special'){
   const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
   if(slot<0)throw Error('SPECIAL target no longer on enemy front line');
   retire(pack,s,foe,'front',slot);
  }
  else if(a.mode==='colorRetire'&&q.trigger==='color'){
   const slot=s.players[1-q.player].front.findIndex(c=>c?.uid===a.uid);
   const profile=card(pack,p[sourceZone][i]).triggerEffect;
   if(profile.op!=='retireOppFrontUnderBp'||slot<0||
    bp(pack,s,s.players[1-q.player].front[slot])>profile.bp)
    throw Error('Illegal COLOR retirement target');
   retire(pack,s,1-q.player,'front',slot);
  }
  else if(a.mode==='colorBounce'&&q.trigger==='color'){
   const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
   const profile=card(pack,p[sourceZone][i]).triggerEffect;
   if(profile.op!=='bounceOppFrontUnderBp'||slot<0||
     bp(pack,s,s.players[foe].front[slot])>profile.bp)
    throw Error('Illegal COLOR BP-limited return target');
   // Q62: only a visible Raid top returns to hand; underlying physical
   // layers go to OUTSIDE. Returning never emits an onRetire event.
   bounceToHand(pack,s,foe,a.uid,q.uid,{reason:'opponent-effect',controller:q.player});
  }
  else if(a.mode==='colorRestSkip'&&q.trigger==='color'){
   const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
   const profile=card(pack,p[sourceZone][i]).triggerEffect;
   if(profile.op!=='restOppFrontSkipNextActive'||slot<0)
    throw Error('Illegal COLOR rest target');
   const target=s.players[foe].front[slot];
   target.ready=false;
   grantContinuousState(s,{kind:'skipNextActive',controller:q.player,
    sourceUid:q.uid,targetUid:target.uid});
  }
  else if(a.mode==='colorOutside'&&q.trigger==='color'){
   const profile=card(pack,p[sourceZone][i]).triggerEffect;
   if(profile.op!=='deployOutsideCharacter'||a.line!=='front'||profile.frontOnly!==true)
    throw Error('COLOR source must explicitly allow outside-to-front play');
   const index=p.outside.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('COLOR outside target is not in own outside');
   const chosen=p.outside[index],d=card(pack,chosen);
   if(d.type!=='character'||d.frontForbidden||d.color!==profile.color||
     d.energy>profile.maxEnergy||d.ap!==profile.ap)
    throw Error('Outside COLOR target does not meet printed requirements');
   commitDestination(pack,s,q.player,'front',a.slot,a.replaceUid);
   p.outside.splice(index,1);chosen.ready=true;
   chosen.fieldEntryStamp=s.nextFieldEntryStamp++;p.front[a.slot]=chosen;
   recordCompletedMove(pack,s,{physical:chosen,owner:q.player,from:'outside',to:'front',
    reason:'life-trigger',sourceUid:q.uid});
   // COLOR life deployment spends no AP but does trigger onPlay.
   applyEffects(pack,s,chosen,'onPlay',q.player,'lifeColorOutside');
  }
  else if(a.mode==='colorField'&&q.trigger==='color'){
   const profile=card(pack,p[sourceZone][i]).triggerEffect;
   if(!maySubstituteColorTriggerField(pack,s,q.player,profile)||a.line!=='energy')
    throw Error('COLOR FIELD substitution no longer active');
   const handIndex=p.hand.findIndex(c=>c.uid===a.uid);
   if(handIndex<0)throw Error('COLOR FIELD must come from OWN hand');
   const picked=p.hand[handIndex],d=card(pack,picked);
   if(d.type!=='field'||d.color!==profile.color||d.energy>profile.maxEnergy||
    d.ap!==profile.ap)throw Error('Invalid substituted COLOR FIELD');
   commitDestination(pack,s,q.player,'energy',a.slot,a.replaceUid);
   p.hand.splice(handIndex,1);picked.ready=true;
   picked.fieldEntryStamp=s.nextFieldEntryStamp++;p.energy[a.slot]=picked;
   recordCompletedMove(pack,s,{physical:picked,owner:q.player,
    from:'hand',to:'energy',reason:'life-trigger',sourceUid:q.uid});
   applyEffects(pack,s,picked,'onPlay',q.player,'lifeColorField');
  }
  else if(a.mode==='color'&&q.trigger==='color'){
   const profile=card(pack,p[sourceZone][i]).triggerEffect;
   const handIndex=p.hand.findIndex(c=>c.uid===a.uid);
   if(handIndex<0)throw Error('COLOR requires a hand character');
   const picked=p.hand[handIndex],d=card(pack,picked);
   if(d.type!=='character'||(a.line==='front'&&d.frontForbidden)||
    d.color!==profile.color||d.energy>profile.maxEnergy||d.ap!==profile.ap||
    !['front','energy'].includes(a.line))throw Error('Illegal COLOR deployment');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.hand.splice(handIndex,1);picked.ready=true;
   picked.fieldEntryStamp=s.nextFieldEntryStamp++;p[a.line][a.slot]=picked;
   recordCompletedMove(pack,s,{physical:picked,owner:q.player,
    from:'hand',to:a.line,reason:'life-trigger',sourceUid:q.uid});
   // This is ordinary playing through a trigger, NOT a Raid: no AP is spent.
   applyEffects(pack,s,picked,'onPlay',q.player,'lifeColor');
  }
  else if(a.mode==='raid'&&q.trigger==='raid'){
   const revealed=p[sourceZone].splice(i,1)[0];
   performRaid(pack,s,q.player,revealed,a.baseUid,a.line,a.slot,a.replaceUid,
    {entryCause:'lifeRaid',entryFrom:sourceZone,effectSourceUid:q.uid});
  }
  else if(a.mode==='get'&&q.trigger==='raid')moveOwnedLinear(pack,s,{
   owner:q.player,from:sourceZone,to:'hand',index:i,
   reason:'life-trigger',sourceUid:q.uid});
  else if(a.mode==='final'&&q.trigger==='final'&&!p.life.length&&p.deck.length){
   const returned=p.deck.shift();p.life.unshift(returned);
   recordCompletedMove(pack,s,{physical:returned,owner:q.player,from:'deck',
    to:'life',reason:'life-trigger',sourceUid:q.uid});
  }
  else if(a.mode!=='skip')throw Error('Illegal trigger option');
  continueEffectQueue(pack,s);
  finishPending(s);
  return;
 }
 throw Error('Unsupported pending decision');
}
export function newUniversalMatch(pack,{decks,seed=1,first=0}={}){
 const packs=playerPacks(pack);
 if(!Array.isArray(decks)||decks.length!==2||!playerIndex(first))
  throw Error('Universal v2 requires one or two title packs and two decks');
 for(const [i,d] of decks.entries()){
  const issues=validateUniversalDeck(packs[i],d);
  if(issues.length)throw Error('Player '+i+': '+issues.join('; '));
 }
 const isSame=packs[0].id===packs[1].id&&packs[0].version===packs[1].version;
 const s={version:UNIVERSAL_V2_VERSION,title:isSame?packs[0].id:'cross-title',packVersion:isSame?packs[0].version:null,
  packIds:packs.map(p=>p.id),packVersions:packs.map(p=>p.version),
  rng:(seed>>>0)||1,first,active:first,turn:0,phase:'start',status:'playing',
  winner:null,endReason:null,pending:null,extraDrawn:false,moved:false,movedUids:[],attacksThisTurn:0,attacksByUid:{},blocksByUid:{},
  publicReveals:[],effectQueue:[],delayedEffects:[],retirementBatch:null,lifeRevealBatch:null,nextFieldEntryStamp:1,
  continuousStates:[],nextContinuousStateId:1,endRefreshed:false,players:[],
  raidedThisTurn:[false,false],mainAbilityUsedUids:[],mainReadyOnceByName:[[],[]],
  onceEffectUses:[[],[]],
  turnEffectZoneMoves:[{handToOutside:false,outsideToHand:false},
   {handToOutside:false,outsideToHand:false}],turnRetireEvents:[],zoneMoveEvents:[],nextZoneMoveOrder:1,
  initialCounts:decks.map(d=>Object.fromEntries(Object.entries(d).filter(([,n])=>n>0)))
 };
 for(let p=0;p<2;p++){
  const ids=Object.entries(decks[p]).flatMap(([id,count])=>Array(count).fill(id));
  const pile=shuffle(s,ids.map((id,i)=>({uid:p+'-'+i,cardId:id,ready:false,stack:[],under:[],buffs:[]})));
  s.players.push({
   deck:pile,hand:pile.splice(0,7),life:pile.splice(0,7),lifeRevealed:[],
   front:[null,null,null,null],energy:[null,null,null,null],
   outside:[],resolvingEvents:[],removed:[],apCards:[0,1,2].map(i=>({uid:'AP'+p+'-'+i,ready:false,inPlay:false})),ownTurns:0
  });
 }
 startTurn(pack,s);
 assertUniversalMatch(pack,s);
 return s;
}
function legalPending(pack,s){
 const q=s.pending,p=s.players[q.player];
 if(q.kind==='life-batch-order')return [
  ...q.choices.map(uid=>({type:'chooseLifeOrder',uid})),
  ...(q.entries||[]).map(e=>({type:'chooseLifeEffect',key:e.key}))];
 if(q.kind==='phase-order')return q.entries.map(x=>({type:'choosePhaseOrder',key:x.key}));
 if(q.kind==='retirement-order')return q.entries.map(x=>({type:'chooseRetirementOrder',key:x.key}));
 if(q.kind==='effect-move-order')return q.entries.map(x=>({type:'chooseMoveEffectOrder',key:x.key}));
 if(q.kind==='effect-rest-tuck'){
  const watcher=location(s,q.player,q.sourceUid)?.c;
  const canRest=!!watcher&&watcher.fieldEntryStamp===q.sourceStamp&&
   watcher.ready&&!(watcher.under||[]).some(x=>x.faceDown===true);
  return [{type:'chooseRestTuck',mode:'skip'},
   ...(canRest?[{type:'chooseRestTuck',mode:'rest'}]:[])];
 }
 if(q.kind==='effect-tuck-moved'){
  const watcher=location(s,q.player,q.sourceUid)?.c;
  const canTuck=!!watcher&&watcher.fieldEntryStamp===q.sourceStamp&&
   !(watcher.under||[]).some(x=>x.faceDown===true)&&
   p.outside.some(c=>c.uid===q.movedUid);
  return [{type:'chooseTuckMoved',uid:null},
   ...(canTuck?[{type:'chooseTuckMoved',uid:q.movedUid}]:[])];
 }
 if(q.kind==='attack-end-swap')return [
  {type:'chooseAttackEndSwap',uid:null},
  ...q.choices.map(c=>({type:'chooseAttackEndSwap',uid:c.uid}))
 ];
 if(q.kind==='block'){
  const attacker=s.players[s.active].front.find(c=>c?.uid===q.attackerUid);
  if(!attacker)throw Error('Missing printed attacker for block legality');
  const rule=originalEffectsDisabled(s,attacker)?null:card(pack,attacker).blockBpRestriction;
  const applies=!!rule&&(!rule.condition||
   matchesV2LiveCondition(s,s.active,attacker.uid,rule.condition,
    x=>card(pack,x)));
  const canBlock=c=>!applies||!(rule.relation==='atLeast'
   ?bp(pack,s,c)>=rule.bp:bp(pack,s,c)<=rule.bp);
  const candidates=p.front.filter(c=>c?.ready&&canBlock(c));
  // Official mandatory BLOCK: only after a valid own-effect-entry grant,
  // and only if an otherwise legal ACTIVE blocker exists. SNIPER bypasses
  // this entire pending BLOCK window, as required by Q65-Q70.
  const forced=hasCurrentBattleGrant(s,attacker,'mustBlockGranted');
  return [
   ...(!forced||!candidates.length?[{type:'chooseBlock',uid:null}]:[]),
   ...candidates.map(c=>({type:'chooseBlock',uid:c.uid}))
  ];
 }
 if(q.kind==='leave-replacement'){
   const loc=location(s,q.player,q.uid);
   const choices=loc?facedownChoices(loc.c):[];
   return [
    ...(choices.length===1?[{type:'chooseLeaveReplacement',mode:'protect'}]:
     choices.map(uid=>({type:'chooseLeaveReplacement',mode:'protect',uid}))),
    {type:'chooseLeaveReplacement',mode:'leave'}
   ];
  }
 if(q.kind==='private-top-choice')return [
   {type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'outside'}
  ];
 if(q.kind==='private-top-place')return [
  {type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'bottom'}
 ];
 if(q.kind==='effect-recover-ap')return [
   {type:'chooseApRecovery',uid:null},
   ...p.apCards.filter(c=>c.inPlay&&!c.ready).map(c=>({type:'chooseApRecovery',uid:c.uid}))
  ];
 if(q.kind==='end-hand-limit')return p.hand.map(c=>({type:'chooseHandLimit',uid:c.uid}));
 if(q.kind==='effect-discard')return p.hand.map(c=>({type:'chooseDiscard',uid:c.uid}));
 if(q.kind==='effect-search-deck')return [
  ...(q.optional?[{type:'chooseDeckSearch',uid:null}]:[]),
  ...p.deck.filter(c=>q.choices.includes(c.uid)&&matchesFilter(pack,s,c,q.filter))
   .map(c=>({type:'chooseDeckSearch',uid:c.uid}))
 ];
 if(q.kind==='effect-search-deck-multi')return [
  ...(q.optional?[{type:'chooseDeckSearchMulti',uid:null}]:[]),
  ...p.deck.filter(c=>q.choices.includes(c.uid)&&matchesSearch(pack,s,c,q))
   .map(c=>({type:'chooseDeckSearchMulti',uid:c.uid}))
 ];
 if(q.kind==='effect-top-filter-choice')return [
  {type:'chooseTopFiltered',uid:null},
  ...q.choices.map(uid=>({type:'chooseTopFiltered',uid}))
 ];
 if(q.kind==='effect-top-filter-many-choice')return [
  {type:'chooseTopFilteredMany',uid:null},
  ...q.choices.filter(uid=>!q.selected.includes(uid)&&
   p.deck.slice(0,q.uids.length-q.selected.length).some(c=>c.uid===uid))
   .map(uid=>({type:'chooseTopFilteredMany',uid}))
 ];
 if(q.kind==='effect-top-inspect-many')return [
  {type:'chooseInspectedOutside',uid:null},
  ...q.uids.filter(uid=>!q.selected.includes(uid))
   .map(uid=>({type:'chooseInspectedOutside',uid}))
 ];
 if(q.kind==='effect-top-inspect')return [
  {type:'chooseInspectedOutside',uid:null},
  ...q.uids.map(uid=>({type:'chooseInspectedOutside',uid}))
 ];
 if(q.kind==='effect-top-trait-outside')return [
  {type:'chooseTopTraitOutside',uid:null},
  ...q.choices.map(uid=>({type:'chooseTopTraitOutside',uid}))
 ];
 if(q.kind==='effect-optional-draw')return [
  {type:'chooseOptionalDraw',mode:'skip'},
  ...(p.deck.length?[{type:'chooseOptionalDraw',mode:'draw'}]:[])
 ];
 if(q.kind==='effect-optional-mill')return [
  {type:'chooseOptionalMill',mode:'skip'},
  {type:'chooseOptionalMill',mode:'mill'}
 ];
 if(q.kind==='effect-pay-ap-deploy')return [
  {type:'choosePayApDeploy',mode:'skip'},
  {type:'choosePayApDeploy',mode:'pay'}
 ];
 if(q.kind==='effect-top-order')return q.uids
  .filter(uid=>!q.order.includes(uid)).map(uid=>({type:'chooseTopOrder',uid}));
 if(q.kind==='effect-bounce-own')return [...(q.optional===true?[null]:[]),...q.choices].map(uid=>({type:'chooseOwnBounce',uid}));
 if(q.kind==='recovered-self-entry')return [
  {type:'chooseRecoveredEntry',mode:'skip'},
  ...legalDestinations(p,'energy').map(c=>({
   type:'chooseRecoveredEntry',mode:'enter',line:'energy',...c
  }))
 ];
 if(q.kind==='effect-outside-traitless-rest'){
   const out=[{type:'chooseOutsideTraitlessRest',uid:null}];
   for(const c of p.outside.filter(c=>q.choices.includes(c.uid))){
    const d=card(pack,c);
    for(const line of ['front','energy']){
     if(line==='front'&&d.frontForbidden)continue;
     for(const dest of legalDestinations(p,line))
      out.push({type:'chooseOutsideTraitlessRest',mode:'enter',
       uid:c.uid,line,...dest});
    }
    if(d.raidName&&!d.frontForbidden)
     for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
      const base=p[line][slot];if(!base||!validRaidBase(pack,s,q.player,base,d)||
       card(pack,base).frontForbidden)continue;
      const dests=line==='front'?[{slot}]:legalDestinations(p,'front');
      for(const dest of dests)out.push({type:'chooseOutsideTraitlessRest',
       mode:'raid',uid:c.uid,baseUid:base.uid,line:'front',...dest});
      if(line==='energy')out.push({type:'chooseOutsideTraitlessRest',
       mode:'raid',uid:c.uid,baseUid:base.uid,line:'energy',slot});
     }
   }
   return out;
  }
  if(q.kind==='effect-outside-name-rest')return [
   {type:'chooseOutsideNameRest',uid:null},
   ...p.outside.filter(c=>q.choices.includes(c.uid)).flatMap(c=>{
    const d=card(pack,c);
    return ['front','energy'].filter(line=>!(line==='front'&&d.frontForbidden))
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseOutsideNameRest',uid:c.uid,line,...dest
     })));
   })
  ];
  if(q.kind==='effect-named-zone-entry')return [
    {type:'chooseNamedZoneDeploy',uid:null},
    ...['hand','outside'].flatMap(zone=>
     p[zone].filter(c=>(zone==='hand'?q.handChoices:q.outsideChoices).includes(c.uid)).flatMap(c=>
      ['front','energy'].filter(line=>(q.line==='any'||q.line===line)&&
       (line!=='front'||!card(pack,c).frontForbidden)).flatMap(line=>
        legalDestinations(p,line).map(dest=>({type:'chooseNamedZoneDeploy',
         zone,uid:c.uid,line,...dest}))))
   )
  ];
  if(q.kind==='effect-hand-rest')return [
   {type:'chooseHandRest',uid:null},
   ...p.hand.filter(c=>q.choices.includes(c.uid)).flatMap(c=>{
    const d=card(pack,c);
    return ['front','energy'].filter(line=>line!=='front'||
     (d.type==='character'&&!d.frontForbidden))
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseHandRest',uid:c.uid,line,...dest})));
   })
  ];
  if(q.kind==='effect-outside-rest')return [
   {type:'chooseOutsideRest',uid:null},
   ...p.outside.filter(c=>q.choices.includes(c.uid)).flatMap(c=>
    ['front','energy'].flatMap(line=>legalDestinations(p,line)
     .map(dest=>({type:'chooseOutsideRest',uid:c.uid,line,...dest}))))
  ];
  if(q.kind==='effect-recover-outside')return [
  ...(q.optional?[{type:'chooseOutsideRecovery',uid:null}]:[]),
  ...p.outside.filter(c=>q.choices.includes(c.uid)&&matchesOutsideRecovery(pack,s,c,q))
   .map(c=>({type:'chooseOutsideRecovery',uid:c.uid}))
 ];
 if(q.kind==='effect-selection-hand-payment')return p.hand.map(c=>({
  type:'chooseSelectionTaxDiscard',uid:c.uid
 }));
 if(q.kind==='effect-discard-cost')return [
  ...(q.optional?[{type:'chooseDiscardCost',uid:null}]:[]),
  ...p.hand.map(c=>({type:'chooseDiscardCost',uid:c.uid}))
 ];
 if(q.kind==='effect-discard-gate'){
  const choices=payableHand(pack,s,q.player,q.payment);
  if(q.count===2){
   const pairs=[];
   for(let i=0;i<choices.length;i++)for(let j=i+1;j<choices.length;j++)
    pairs.push({type:'chooseDiscardGate',uids:[choices[i].uid,choices[j].uid]});
   return [...(q.optional?[{type:'chooseDiscardGate',uid:null}]:[]),...pairs];
  }
  return [...(q.optional?[{type:'chooseDiscardGate',uid:null}]:[]),
   ...choices.map(c=>({type:'chooseDiscardGate',uid:c.uid}))];
 }
 if(q.kind==='raid-effect-order')return [
   {type:'chooseRaidOrder',mode:'baseFirst'},{type:'chooseRaidOrder',mode:'entryFirst'}
  ];
 if(q.kind==='main-discard-self-retire')
  return p.hand.filter(c=>q.choices.includes(c.uid)).map(c=>({
   type:'chooseMainDiscardRetire',uid:c.uid
  }));
 if(q.kind==='main-discard-buff')
  return p.hand.filter(c=>q.choices.includes(c.uid)).map(c=>({
   type:'chooseMainDiscard',uid:c.uid
  }));
 if(q.kind==='main-two-buff')
  return field(p).filter(c=>cardHasTrait(card(pack,c),q.trait))
   .map(c=>({type:'chooseMainBuff',uid:c.uid}));
 if(q.kind==='effect-choice-mode')return [
  ...(q.optional?[{type:'chooseEffectMode',mode:'skip'}]:[]),
  ...q.options.map(o=>({type:'chooseEffectMode',mode:o.id}))
 ];
 if(q.kind==='effect-once-choice')return [
  {type:'chooseOnceEffect',mode:'skip'},{type:'chooseOnceEffect',mode:'activate'}
 ];
 if(q.kind==='effect-buff-own')return [
  ...(q.optional?[{type:'chooseOwnBuff',uid:null}]:[]),
  ...q.choices.map(uid=>({type:'chooseOwnBuff',uid}))
 ];
 if(q.kind==='effect-buff-trait')return [
   {type:'chooseTraitBuff',uid:null},...q.choices.map(uid=>({type:'chooseTraitBuff',uid}))
  ];
 if(q.kind==='main-rest-front-energy')
  return q.choices.filter(uid=>p.front.some(c=>c?.uid===uid&&c.ready))
   .map(uid=>({type:'chooseRestFrontEnergy',uid}));
 if(q.kind==='effect-own-front-protect')return q.choices
  .filter(c=>p.front.some(x=>x?.uid===c.uid&&x.fieldEntryStamp===c.stamp))
  .map(c=>({type:'chooseOwnFrontProtect',uid:c.uid}));
 if(q.kind==='effect-grant-ap-tax')return [
   {type:'chooseApTaxGrant',uid:null},
   ...q.choices.map(c=>({type:'chooseApTaxGrant',uid:c.uid}))
  ];
  if(q.kind==='effect-grant-front-energy')return [
   {type:'chooseFrontEnergyGrant',uid:null},
   ...q.choices.map(c=>({type:'chooseFrontEnergyGrant',uid:c.uid}))
  ];
  if(q.kind==='effect-attack-ban')return [
   {type:'chooseAttackBan',uid:null},
   ...q.choices.map(c=>({type:'chooseAttackBan',uid:c.uid}))
  ];
  if(q.kind==='effect-rest-bp')return [
   ...(q.optional?[{type:'chooseRestBp',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseRestBp',uid}))
  ];
 if(q.kind==='main-field-trait-retire')return q.choices.map(uid=>({type:'chooseFieldTraitRetire',uid}));
 if(q.kind==='effect-retire-own-character')return [
   {type:'chooseOwnCharacterRetire',uid:null},
   ...q.choices.map(uid=>({type:'chooseOwnCharacterRetire',uid}))
  ];
  if(q.kind==='effect-retire-own-field')return [
    ...(q.optional?[{type:'chooseOwnFieldRetire',uid:null}]:[]),
    ...q.choices.map(uid=>({type:'chooseOwnFieldRetire',uid}))
   ];
  if(q.kind==='effect-strip-raid-top')return [
   {type:'chooseRaidTopStrip',uid:null},
   ...q.choices.map(uid=>({type:'chooseRaidTopStrip',uid}))
  ];
  if(q.kind==='effect-named-outside-bounce-retire')
   return q.choices.map(uid=>({type:'chooseNamedOutsideBounceRetire',uid}));
  if(q.kind==='effect-retire-bp')return [
   ...(q.optional?[{type:'chooseRetireBp',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseRetireBp',uid}))
  ];
 if(q.kind==='effect-grant-attack')return q.choices.map(uid=>({type:'chooseGrantAttack',uid}));
 if(q.kind==='granted-attack-draw')return [
  {type:'chooseGrantedDraw',mode:'skip'},{type:'chooseGrantedDraw',mode:'draw'}
 ];
 if(q.kind==='effect-target-many')return [
  {type:'chooseTargetMany',uid:null},
  ...q.choices.filter(uid=>!q.selected.includes(uid))
   .map(uid=>({type:'chooseTargetMany',uid}))
 ];
 if(q.kind==='effect-target')return [
   ...(q.optional?[{type:'chooseTarget',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseTarget',uid}))
  ];
 if(q.kind==='life-trigger'){
  const triggerPile=q.batch?p.lifeRevealed:p.outside;
  const out=[{type:'chooseTrigger',mode:'skip'}];
  if(q.trigger==='active')out.push(...field(p).filter(c=>card(pack,c).type==='character')
   .map(c=>({type:'chooseTrigger',mode:'active',uid:c.uid})));
  if(q.trigger==='special')
   out.push(...s.players[1-q.player].front.filter(Boolean)
    .map(c=>({type:'chooseTrigger',mode:'special',uid:c.uid})));
  if(q.trigger==='color'){
   const profile=card(pack,triggerPile.find(c=>c.uid===q.uid)).triggerEffect;
   if(profile.op==='retireOppFrontUnderBp')
    out.push(...s.players[1-q.player].front.filter(c=>c&&bp(pack,s,c)<=profile.bp)
     .map(c=>({type:'chooseTrigger',mode:'colorRetire',uid:c.uid})));
   else if(profile.op==='restOppFrontSkipNextActive')
    out.push(...s.players[1-q.player].front.filter(Boolean)
     .map(c=>({type:'chooseTrigger',mode:'colorRestSkip',uid:c.uid})));
   else if(profile.op==='bounceOppFrontUnderBp')
    out.push(...s.players[1-q.player].front.filter(c=>c&&bp(pack,s,c)<=profile.bp)
     .map(c=>({type:'chooseTrigger',mode:'colorBounce',uid:c.uid})));
   else if(profile.op==='deployOutsideCharacter'){
    for(const c of p.outside){
     const d=card(pack,c);
     if(d.type!=='character'||d.frontForbidden||d.color!==profile.color||d.energy>profile.maxEnergy||d.ap!==profile.ap)continue;
     for(const choice of legalDestinations(p,'front'))
      out.push({type:'chooseTrigger',mode:'colorOutside',uid:c.uid,line:'front',...choice});
    }
   }else{
    if(maySubstituteColorTriggerField(pack,s,q.player,profile))
     for(const c of p.hand){
      const d=card(pack,c);
      if(d.type!=='field'||d.color!==profile.color||d.energy>profile.maxEnergy||
       d.ap!==profile.ap)continue;
      for(const choice of legalDestinations(p,'energy'))
       out.push({type:'chooseTrigger',mode:'colorField',uid:c.uid,line:'energy',...choice});
     }
    for(const c of p.hand){
    const d=card(pack,c);
    if(d.type!=='character'||d.color!==profile.color||d.energy>profile.maxEnergy||d.ap!==profile.ap)continue;
    for(const line of ['front','energy']){
     if(line==='front'&&d.frontForbidden)continue;
     for(const choice of legalDestinations(p,line))
      out.push({type:'chooseTrigger',mode:'color',uid:c.uid,line,...choice});
    }
   }
  }
  }
  if(q.trigger==='raid'){
   const revealed=triggerPile.find(c=>c.uid===q.uid),d=card(pack,revealed);
   out.push({type:'chooseTrigger',mode:'get'});
   if(d.energy<=(universalEnergyByColor(pack,s,q.player)[d.color]||0)){
    for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
     const base=p[line][slot];
     if(!validRaidBase(pack,s,q.player,base,d))continue;
     if(line==='front')out.push({type:'chooseTrigger',mode:'raid',baseUid:base.uid,line:'front',slot});
     else{
      out.push({type:'chooseTrigger',mode:'raid',baseUid:base.uid,line:'energy',slot});
      for(const choice of legalDestinations(p,'front'))
       out.push({type:'chooseTrigger',mode:'raid',baseUid:base.uid,line:'front',...choice});
     }
    }
   }
  }
  if(q.trigger==='get')out.push({type:'chooseTrigger',mode:'get'});
  if(q.trigger==='draw'&&p.deck.length)out.push({type:'chooseTrigger',mode:'draw'});
  if(q.trigger==='final'&&!p.life.length&&p.deck.length)out.push({type:'chooseTrigger',mode:'final'});
  return out;
 }
 throw Error('No handler for pending decision '+q.kind);
}
// UNION ARENA official Q1119 (2024-09-06): an event requiring "choose
// one" cannot be played at all unless ALL mandatory choices exist.
// This check is performed BEFORE spending AP or moving the event outside.
// Optional "up to one" choices remain playable with zero targets.
function eventMandatoryTargetsAvailable(pack,s,owner,d,reservedAp=d.ap,reservedHandUid=null){
 const enemy=s.players[1-owner];
 return (d.effects?.onPlay||[]).every(job=>{
  if(job.op==='grantOwnFrontChoiceProtection')
   return s.players[owner].front.some(c=>c&&card(pack,c).type==='character');
  if(job.op==='conditionalBounceOrRetireByOwnOutsideNames')
   return enemy.front.some(c=>c&&card(pack,c).type==='character'&&
    bp(pack,s,c)<=job.bp&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  if(job.optional!==false)return true;
  if(job.op==='restOppFrontOne')
   return enemy.front.some(c=>c&&!effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  if(job.op==='restOppFrontUnderBp'||job.op==='restOrRetireOppFrontByLife')
   return enemy.front.some(c=>c&&bp(pack,s,c)<=job.bp&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  return true;
 });
}
// Q2062 is a cost of SELECTING a protected character by a CARD EFFECT,
// not a cost of playing a card, attacking or blocking.
// The existing pending action is the exact resolution boundary; no new queue.
const TARGETING_CARD_EFFECT_CHOICES=new Set([
 'chooseRetireBp','chooseRestBp','chooseTarget','chooseTargetMany','chooseNamedOutsideBounceRetire',
 'chooseRaidTopStrip','chooseAttackBan'
]);
const TARGETING_LIFE_MODES=new Set([
 'special','colorRetire','colorBounce','colorRestSkip'
]);
// Human and both AI levels receive this same authoritative action list.
// Resolve provenance from the actual source UID, never from action payload.
// LIFE choice is a Trigger effect even when the LIFE card is an EVENT.
function effectChoiceProvenance(pack,s){
 const q=s.pending;
 if(q?.kind==='life-trigger')return 'trigger';
 const player=q&&s.players[q.player];
 // A paid EVENT resolves from the owner's OUTSIDE, not from FIELD.
 // Resolved revealed LIFE effects are handled above as Trigger provenance.
 const physical=q&&typeof q.sourceUid==='string'
  ?(location(s,q.player,q.sourceUid)?.c||
    player?.outside.find(c=>c.uid===q.sourceUid)||
    player?.resolvingEvents.find(c=>c.uid===q.sourceUid)||
    player?.removed.find(c=>c.uid===q.sourceUid)||
    player?.lifeRevealed?.find(c=>c.uid===q.sourceUid)):null;
 return physical?card(pack,physical).type:'unknown';
}
function effectSelectionProhibited(pack,s,a){
 const q=s.pending;
 if(!q||typeof a?.uid!=='string')return false;
 if(!TARGETING_CARD_EFFECT_CHOICES.has(a.type)&&
  !(q.kind==='life-trigger'&&a.type==='chooseTrigger'&&
   TARGETING_LIFE_MODES.has(a.mode)))return false;
 return effectChoiceProtected(s,q.player,a.uid,effectChoiceProvenance(pack,s));
}
function effectSelectionApTax(s,a){
 const q=s.pending;
 if(!q||typeof a?.uid!=='string')return 0;
 if(!TARGETING_CARD_EFFECT_CHOICES.has(a.type)&&
  !(q.kind==='life-trigger'&&a.type==='chooseTrigger'&&
    TARGETING_LIFE_MODES.has(a.mode)))return 0;
 return selectionApSurcharge(s,q.player,a.uid);
}
function sourceTypeFromUid(pack,s,uid){
 if(typeof uid!=='string'||!/^([01])-\d+$/.test(uid))return 'unknown';
 const owner=Number(uid[0]),pl=s.players[owner];
 const physical=[...field(pl),...pl.outside,...pl.resolvingEvents,...pl.lifeRevealed,...pl.removed,
  ...pl.hand].find(c=>c.uid===uid);
 return physical?card(pack,physical).type:'unknown';
}
function selectionHandTax(pack,s,selector,uid,sourceType){
 const evalType=type=>selectionHandDiscardTaxPlan(pack,s,selector,uid,type,{
  isSuppressed:(state,src)=>originalEffectsDisabled(state,src)});
 if(sourceType==='unknown'){
  const ev=evalType('event'),ch=evalType('character');
  if(ev.cost||ch.cost||ev.blocked||ch.blocked)
   return {cost:0,payable:false,blocked:true};
  return {cost:0,payable:true,blocked:false};
 }
 return evalType(sourceType);
}
function effectSelectionHandTax(pack,s,a){
 const q=s.pending;
 if(!q||typeof a?.uid!=='string'||
  !TARGETING_CARD_EFFECT_CHOICES.has(a.type)&&
  !(q.kind==='life-trigger'&&a.type==='chooseTrigger'&&
    TARGETING_LIFE_MODES.has(a.mode)))
  return {cost:0,payable:true,blocked:false};
 return selectionHandTax(pack,s,q.player,a.uid,effectChoiceProvenance(pack,s));
}
function availableAp(s,p){return s.players[p].apCards.filter(c=>c.ready).length;}
function cardEffectTargetPayable(pack,s,selector,uid,reservedAp=0,
 sourceUid=null,sourceType=null,reservedHandUid=null){
 const apTax=selectionApSurcharge(s,selector,uid);
 const tax=selectionHandTax(pack,s,selector,uid,
  sourceType||sourceTypeFromUid(pack,s,sourceUid));
 if(tax.blocked||!tax.payable||tax.cost&&apTax>0)return false;
 if(tax.cost&&reservedHandUid!==null&&
  s.players[selector].hand.filter(c=>c.uid!==reservedHandUid).length<tax.cost)
  return false;
 return apTax<=availableAp(s,selector)-reservedAp;
}
export function legalUniversalActions(pack,s){
 assertUniversalMatch(pack,s);
 if(s.status!=='playing')return [];
 if(s.pending)return legalPending(pack,s).filter(a=>{
  if(effectSelectionProhibited(pack,s,a))return false;
  const apTax=effectSelectionApTax(s,a),handTax=effectSelectionHandTax(pack,s,a);
  // No official ordering for selecting multiple targets or combined AP+hand costs.
  return !handTax.blocked&&handTax.payable&&
   !(handTax.cost&&(s.pending.kind==='effect-target-many'||apTax>0))&&
   apTax<=availableAp(s,s.pending.player);
 });
 const p=s.active,pl=s.players[p],out=[{type:'next'}];
 if(s.phase==='start'){
  if(!s.extraDrawn&&pl.apCards.some(c=>c.ready)&&pl.deck.length)out.push({type:'extraDraw'});
 }
 if(s.phase==='move'){
  for(const c of pl.energy.filter(c=>c&&!s.movedUids.includes(c.uid)&&
  card(pack,c).type==='character'&&!card(pack,c).frontForbidden))
   for(const choice of legalDestinations(pl,'front'))out.push({type:'move',uid:c.uid,...choice});
  for(const c of pl.front.filter(c=>c&&!s.movedUids.includes(c.uid)&&card(pack,c).step&&!originalEffectsDisabled(s,c)))
   for(const choice of legalDestinations(pl,'energy'))out.push({type:'step',uid:c.uid,...choice});
 }
 if(s.phase==='main'){
   for(const c of pl.energy.filter(Boolean)){
    const d=originalEffectsDisabled(s,c)?null:card(pack,c),ab=d?.mainAbility;
    if(ab?.op==='fieldRestRetireThen'&&d.type==='field'&&c.ready)
     out.push({type:'activate',uid:c.uid,mode:'fieldRestTrueRetireDeploy'});
    if(ab?.op!=='fieldDualMain'||d.type!=='field')continue;
    // Official Q770: [ターン1] applies to each physical card, not all copies of a name.
    const retiredKey=c.uid+'|fieldDualRetire',buffKey=c.uid+'|fieldDualBuff';
    if(!s.mainReadyOnceByName[p].includes(retiredKey)&&
     field(pl).some(v=>v.uid!==c.uid&&card(pack,v).type==='character'&&
      cardHasTrait(card(pack,v),ab.retireTrait)))
     out.push({type:'activate',uid:c.uid,mode:'fieldRetireTrait'});
    if(c.ready&&!s.mainReadyOnceByName[p].includes(buffKey)&&
     retiredThisTurn(s,p,'character'))
     out.push({type:'activate',uid:c.uid,mode:'fieldRestBuffGroup'});
   }
  // A discard-cost MAIN ability can be activated from either field line,
  // regardless of source REST state; it does NOT require spending AP.
  for(const c of field(pl)){
   const d=card(pack,c),ability=originalEffectsDisabled(s,c)?null:d.mainAbility;
   if(ability?.op==='readySelfIfOwnRetiredThisTurn'&&
    retiredThisTurn(s,p,ability.cardType)&&
    !s.mainReadyOnceByName[p].includes(d.name+'|readySelfIfOwnRetiredThisTurn'))
    out.push({type:'activate',uid:c.uid,mode:'retireReady'});
   if(ability?.op==='restDiscardRetireThen'&&c.ready&&pl.hand.length)
    out.push({type:'activate',uid:c.uid,mode:'restDiscardRetire'});
   if(ability?.op==='fieldOnceBuffOther'&&!s.mainAbilityUsedUids.includes(c.uid)&&
    field(pl).some(x=>x.uid!==c.uid&&card(pack,x).type==='character'))
    out.push({type:'activate',uid:c.uid,mode:'fieldOnceBuffOther'});
   if(ability?.op==='discardHandBuffSelf'&&pl.hand.length>0&&
    !s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'discardSelfBuff'});
  }
  for(const c of pl.energy.filter(Boolean)){
   const ability=originalEffectsDisabled(s,c)?null:card(pack,c).mainAbility;
   if(ability?.op==='restSelfGainEnergyRetireEndMain'&&
    (ability.energyOnly===true||ability.lines==='energy'||ability.lines==='field')&&
    c.ready&&!s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'selfRestEnergyRetire'});
   if(ability?.op==='restSelfBuffOther'&&c.ready&&
    field(pl).some(x=>x.uid!==c.uid&&card(pack,x).type==='character'))
    out.push({type:'activate',uid:c.uid,mode:'selfRestBuff'});
   if(ability?.op==='payApDrawGainEnergy'&&
    !s.mainAbilityUsedUids.includes(c.uid)&&pl.apCards.some(x=>x.ready))
    out.push({type:'activate',uid:c.uid,mode:'payApDrawEnergy'});
   if(ability?.op==='restSelfRestFrontGainEnergy'&&c.ready&&
    !s.mainAbilityUsedUids.includes(c.uid)&&
    pl.front.some(x=>x&&x.ready&&x.uid!==c.uid&&card(pack,x).type==='character'))
    out.push({type:'activate',uid:c.uid,mode:'restFrontGainEnergy'});
  }
  for(const c of pl.front.filter(Boolean)){
   const d=card(pack,c),ability=originalEffectsDisabled(s,c)?null:d.mainAbility;
   if(!ability)continue;
   if(ability.op==='restSelfGainEnergyRetireEndMain'){
    if((ability.lines==='front'||ability.lines==='field')&&
     c.ready&&!s.mainAbilityUsedUids.includes(c.uid))
     out.push({type:'activate',uid:c.uid,mode:'selfRestEnergyRetire'});
    continue;
   }
   if(ability.op==='retireOwnFieldThen'){
    if(!s.mainAbilityUsedUids.includes(c.uid)&&pl.energy.some(x=>x&&card(pack,x).type==='field'))
     out.push({type:'activate',uid:c.uid,mode:'retireFieldThen'});
    continue;
   }
   if(ability.op==='restSelfThen'){
    // A READY own FRONT source pays its actual REST cost before any effect.
    if(c.ready)out.push({type:'activate',uid:c.uid,mode:'selfRestThen'});
    continue;
   }
   if(ability.op==='restSelfBuffOther'){
    // 【レストにする】 rests this card. The choice is another own character
    // on either line. No ターン1 is printed, so a later ACTIVE can pay again.
    if(c.ready&&field(pl).some(x=>x.uid!==c.uid&&card(pack,x).type==='character'))
     out.push({type:'activate',uid:c.uid,mode:'selfRestBuff'});
    continue;
   }
   if(ability.op==='payApDrawGainEnergy'){
    // 【APを1支払う】 does not rest this card. A REST character can still pay.
    if(!s.mainAbilityUsedUids.includes(c.uid)&&pl.apCards.some(x=>x.ready))
     out.push({type:'activate',uid:c.uid,mode:'payApDrawEnergy'});
    continue;
   }
   if(ability.op==='restSelfRestFrontGainEnergy'){
    // Pay REST on this card first. The effect then needs a different
    // ACTIVE front character, so this card cannot be its own target.
    if(c.ready&&!s.mainAbilityUsedUids.includes(c.uid)&&
     pl.front.some(x=>x&&x.ready&&x.uid!==c.uid&&card(pack,x).type==='character'))
     out.push({type:'activate',uid:c.uid,mode:'restFrontGainEnergy'});
    continue;
   }
   if(ability.op==='restSelfThenRestOppFrontOne'){
    // This ability has a self-REST cost, NOT AP or per-turn flag. A READY
    // front-line character and at least one opponent front character are
    // required before the controller can pay the activation cost.
    if(c.ready&&s.players[1-p].front.some(Boolean))
     out.push({type:'activate',uid:c.uid,mode:'selfRestEnemy'});
    continue;
   }
   if(ability.op==='frontOnceProgram'){
    if(s.mainAbilityUsedUids.includes(c.uid))continue;
    // Non-attack FRONT ability never requires an opponent target to activate.
    if(ability.then.length===2&&ability.then[0].op==='drawDiscard'&&
     ability.then[1].op==='grantFrontEnergyOwnOtherFrontTrait'){
     out.push({type:'activate',uid:c.uid,mode:'frontOnce'});continue;
    }
    const step=ability.then[0];
    if(step.op==='discardGate'&&!payableHand(pack,s,p,step.payment).length)continue;
    const debuff=step.op==='discardGate'
     ?step.then.find(e=>e.op==='enemyBpDown'):step;
    // A named-payment MAIN may draw/buff/grant without an enemy target.
    // Retain the existing target prerequisite only for a printed debuff.
    const zones=debuff?.zone==='field'
     ?[...s.players[1-p].front,...s.players[1-p].energy]:s.players[1-p].front;
    const any=!debuff||zones.some(x=>x&&
     (debuff.zone!=='field'||card(pack,x).type==='character')&&
     (debuff.minBp===undefined||bp(pack,s,x)>=debuff.minBp)&&
     (debuff.maxBp===undefined||bp(pack,s,x)<=debuff.maxBp));
    if(any)out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
    continue;
   }
   if(ability.op!=='chooseTwoAfterOwnRaid'||
    !s.raidedThisTurn[p]||s.mainAbilityUsedUids.includes(c.uid))continue;
   const readyAvailable=!s.mainReadyOnceByName[p].includes(d.name);
   const buffAvailable=field(pl).some(x=>cardHasTrait(card(pack,x),ability.trait));
   if(readyAvailable){
    out.push({type:'activate',uid:c.uid,mode:'ready'});
    if(buffAvailable)out.push({type:'activate',uid:c.uid,mode:'readyAndBuff'});
   }
   if(buffAvailable)out.push({type:'activate',uid:c.uid,mode:'buff'});
  }
  const ap=pl.apCards.filter(c=>c.ready).length;
  const produced=universalEnergyByColor(pack,s,p);
  for(const c of pl.hand){
   const d=card(pack,c);
   const payment=handPlayApPlan(s,p,d);
   const requiredEnergy=effectiveHandRequiredEnergy(pack,s,p,d);
   if(requiredEnergy>(produced[d.color]||0)||payment.cost>ap)continue;
   if(d.type==='event'){
    if(eventMandatoryTargetsAvailable(pack,s,p,d,payment.cost,c.uid))
     out.push({type:'event',uid:c.uid});
   }
   else for(const line of ['energy','front']){
    if(line==='front'&&(d.type!=='character'||d.frontForbidden))continue;
    for(const choice of legalDestinations(pl,line))
     out.push({type:'play',uid:c.uid,line,...choice});
   }
   if(d.raidName){
    for(const line of ['energy','front'])for(let slot=0;slot<4;slot++){
     const base=pl[line][slot];
     if(!validRaidBase(pack,s,p,base,d)||d.frontForbidden||
       card(pack,base).frontForbidden)continue;
     // A front-line base is already in its destination and cannot be
     // teleported to another occupied slot as a side effect of Raid.
     const dests=line==='front'?[{slot}]:legalDestinations(pl,'front');
     for(const choice of dests)
      out.push({type:'raid',uid:c.uid,baseUid:base.uid,...choice});
    }
   }
  }
 }
 if(s.phase==='attack')for(const c of pl.front.filter(c=>c?.ready&&
  card(pack,c).type==='character'&&
  !fieldRestrictions(s,p,c).some(r=>r.kind==='cannotAttack'))){
  out.push({type:'attack',uid:c.uid});
  if(hasCurrentBattleGrant(s,c,'sniperGranted'))for(const target of
   s.players[1-p].front.filter(t=>t&&card(pack,t).type==='character'&&
    Number.isInteger(t.fieldEntryStamp)&&t.fieldEntryStamp>0))
   out.push({type:'attack',uid:c.uid,targetUid:target.uid,
    targetStamp:target.fieldEntryStamp});
 }
 return out;
}
// Calculate the *current* required energy for a card being legally played
// from its owner's hand. No private opponent zone is read or exposed.
// AP, printed required energy and source definition stay untouched.
export function effectiveHandRequiredEnergy(pack,s,p,d){
 const ownEmpty=!!d.emptyOwnFieldHandEnergyDiscount&&field(s.players[p]).length===0;
 const profile=d.opponentFieldColorsHandEnergyDiscount;
 const matchingOpponent=!!profile&&field(s.players[1-p]).some(c=>
  profile.colors.includes(card(pack,c).color));
 return Math.max(0,d.energy-
  (ownEmpty?d.emptyOwnFieldHandEnergyDiscount:0)-
  (matchingOpponent?profile.amount:0));
}
function spendAp(pl,n){
 let remaining=n;for(const c of pl.apCards)if(c.ready&&remaining){c.ready=false;remaining--;}
 if(remaining)throw Error('Insufficient AP');
}
export function dispatchUniversalAction(pack,source,action,{actor:requested}={}){
 const options=legalUniversalActions(pack,source);
 if(requested!==undefined&&requested!==actor(source))throw Error('Wrong player turn');
 if(!options.some(a=>same(a,action)))throw Error('Action not currently legal');
 const s=clone(source),p=actor(s),pl=s.players[p];
 if(action.replaceUid){
  const candidate=s.players[p][action.line]?.[action.slot];
  if(candidate?.uid===action.replaceUid&&protectedLeave(pack,s,candidate)){
   s.pending={kind:'leave-replacement',player:p,uid:candidate.uid,
    line:action.line,slot:action.slot,destination:'removed',
    postImpact:false,originalAction:{...action},previousPending:s.pending||null};
   assertUniversalMatch(pack,s);
   return s;
  }
 }
 if(s.pending){
  // Pass the entire pre-validated action: some life triggers choose both a
  // mode and an owned field UID (e.g. ACTIVE); stripping the UID corrupts it.
  const surcharge=effectSelectionApTax(s,action);
  const tax=effectSelectionHandTax(pack,s,action);
  if(tax.blocked||!tax.payable||
   tax.cost&&(s.pending.kind==='effect-target-many'||surcharge))
   throw Error('Unsupported compound selection cost');
  if(tax.cost){
   const q=s.pending,target=field(s.players[1-p]).find(c=>c.uid===action.uid);
   if(!target||!Number.isInteger(target.fieldEntryStamp)||target.fieldEntryStamp<1||
    !q.sourceUid||!TARGETING_CARD_EFFECT_CHOICES.has(action.type))
    throw Error('Invalid selection payment source');
   const sourceType=effectChoiceProvenance(pack,s);
   s.pending={kind:'effect-selection-hand-payment',player:p,
    sourceUid:q.sourceUid,originPending:q,targetAction:{...action},
    targetUid:target.uid,targetStamp:target.fieldEntryStamp,sourceType};
  }else{
   if(surcharge)spendAp(s.players[p],surcharge);
   resolveChoice(s,action,pack);
  }
 }else switch(action.type){
  case 'extraDraw':
   spendAp(pl,1);draw(pack,s,p);s.extraDrawn=true;break;
  case 'next':
   if(s.phase==='start'){
    expireContinuousStates(s,{player:p,phase:'start',edge:'end'});
    queuePhaseBoundary(pack,s,'start','end',p);
    s.phase='move';queuePhaseBoundary(pack,s,'move','start',p);
   }
   else if(s.phase==='move'){
    expireContinuousStates(s,{player:p,phase:'move',edge:'end'});
    queuePhaseBoundary(pack,s,'move','end',p);
    s.phase='main';queuePhaseBoundary(pack,s,'main','start',p);
   }
   else if(s.phase==='main'){
     expireContinuousStates(s,{player:p,phase:'main',edge:'end'});
     queuePhaseBoundary(pack,s,'main','end',p);
     s.phase='attack';
     const due=s.delayedEffects.filter(x=>x.turn===s.turn&&x.owner===p);
     s.delayedEffects=s.delayedEffects.filter(x=>!(x.turn===s.turn&&x.owner===p));
     const retires=due.filter(x=>x.op==='retireAtMainEnd');
     const moves=due.filter(x=>x.op==='moveAtMainEnd');
     if(retires.length+moves.length!==due.length)throw Error('Unknown delayed effect');
     // True retirements stay in the existing retirement batch. A hand return
     // is queued after that batch so it cannot be counted as onRetire.
     // Simultaneous order between the two kinds has no card FAQ here.
     if(retires.length)s.effectQueue.push({op:'openRetirementBatch',owner:p},
      ...retires.map(x=>({
       op:'retireAtMainEnd',owner:x.owner,sourceUid:x.sourceUid,
       fieldEntryStamp:x.fieldEntryStamp
      })),{op:'closeRetirementBatch',owner:p});
     if(moves.length)s.effectQueue.push(...moves.map(x=>({
      op:'moveAtMainEnd',owner:x.owner,sourceUid:x.sourceUid,
      fieldEntryStamp:x.fieldEntryStamp,destination:x.destination
     })));
     queuePhaseBoundary(pack,s,'attack','start',p);
    }
   else if(s.phase==='attack'){
    // Keep timed prohibitions alive for this boundary's ACTIVE attempt.
    queuePhaseBoundary(pack,s,'attack','end',p);
    s.effectQueue.push({op:'advanceAfterAttack',owner:p});
   }
   continueEffectQueue(pack,s);
   break;
  case 'activate':{
   const selected=field(pl).find(c=>c.uid===action.uid);
   if(!selected||originalEffectsDisabled(s,selected)||!card(pack,selected).mainAbility)throw Error('Main ability source missing');
   const d=card(pack,selected),ability=d.mainAbility;
   if(ability.op==='fieldRestRetireThen'){
    if(action.mode!=='fieldRestTrueRetireDeploy'||!selected.ready||
     !pl.energy.some(c=>c?.uid===selected.uid)||d.type!=='field')
     throw Error('FIELD REST+true-retire MAIN requires ACTIVE own ENERGY FIELD');
    selected.ready=false;
    // True retirement resolves first; only then does the named outside entry
    // reach the existing queue, retaining original source UID/name provenance.
    s.effectQueue.unshift(...ability.then.map(x=>({...x,owner:p,
     sourceUid:selected.uid,sourceName:d.name})));
    const pos=location(s,p,selected.uid);
    const paused=retire(pack,s,p,pos.line,pos.slot);
    if(!paused)continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='fieldDualMain'){
    if(!pl.energy.some(c=>c?.uid===selected.uid)||d.type!=='field')
     throw Error('Dual MAIN requires own energy FIELD');
    const retireKey=selected.uid+'|fieldDualRetire',buffKey=selected.uid+'|fieldDualBuff';
    if(action.mode==='fieldRetireTrait'){
     const choices=field(pl).filter(c=>c.uid!==selected.uid&&
      card(pack,c).type==='character'&&cardHasTrait(card(pack,c),ability.retireTrait))
      .map(c=>c.uid);
     if(!choices.length||s.mainReadyOnceByName[p].includes(retireKey))
      throw Error('Dual MAIN retirement already used or no valid own character');
     s.mainReadyOnceByName[p].push(retireKey);
     s.pending={kind:'main-field-trait-retire',player:p,sourceUid:selected.uid,
      sourceStamp:selected.fieldEntryStamp,choices};
    }else if(action.mode==='fieldRestBuffGroup'){
     if(!selected.ready||s.mainReadyOnceByName[p].includes(buffKey)||
      !retiredThisTurn(s,p,'character'))
      throw Error('Dual MAIN buff requires true own retirement and ACTIVE FIELD');
     selected.ready=false;s.mainReadyOnceByName[p].push(buffKey);
     for(const target of field(pl).filter(c=>card(pack,c).type==='character'&&
      (card(pack,c).name===ability.buffName||
       cardHasTrait(card(pack,c),ability.buffTrait)))){
      target.buffs??=[];target.buffs.push({bp:ability.bp,untilTurn:s.turn});
     }
    }else throw Error('Unknown dual FIELD MAIN mode');
    break;
   }
   if(ability.op==='retireOwnFieldThen'){
    if(action.mode!=='retireFieldThen'||!pl.front.some(c=>c?.uid===selected.uid)||
     s.mainAbilityUsedUids.includes(selected.uid)||
     !pl.energy.some(c=>c&&card(pack,c).type==='field'))
     throw Error('No legal own FIELD retirement cost');
    s.mainAbilityUsedUids.push(selected.uid);
    s.effectQueue.push({op:'retireOwnFieldOne',owner:p,sourceUid:selected.uid,
     sourceName:d.name,optional:ability.optional===true,after:ability.after});
    continueEffectQueue(pack,s);break;
   }
   if(ability.op==='restDiscardRetireThen'){
    if(action.mode!=='restDiscardRetire'||!selected.ready||!pl.hand.length||
     !Number.isInteger(selected.fieldEntryStamp))
     throw Error('Printed REST+hand+retire MAIN prerequisites missing');
    selected.ready=false;
    s.pending={kind:'main-discard-self-retire',player:p,
     sourceUid:selected.uid,sourceStamp:selected.fieldEntryStamp,
     choices:pl.hand.map(c=>c.uid)};
    break;
   }
   if(ability.op==='fieldOnceBuffOther'){
    if(action.mode!=='fieldOnceBuffOther'||ability.lines!=='field'||
     s.mainAbilityUsedUids.includes(selected.uid))
     throw Error('Unproven field MAIN once-per-turn buff');
    const choices=field(pl).filter(c=>c.uid!==selected.uid&&
     card(pack,c).type==='character').map(c=>c.uid);
    if(!choices.length)throw Error('Other own CHARACTER required');
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'effect-buff-own',player:p,sourceUid:selected.uid,
     choices,filter:{field:'type',value:'character'},
     bp:ability.bp,optional:false,excludeSelf:true};
    break;
   }
   if(ability.op==='readySelfIfOwnRetiredThisTurn'){
    const key=d.name+'|readySelfIfOwnRetiredThisTurn';
    if(action.mode!=='retireReady'||!retiredThisTurn(s,p,ability.cardType)||
     s.mainReadyOnceByName[p].includes(key))
     throw Error('No completed own retirement or same-name MAIN already used');
    s.mainReadyOnceByName[p].push(key);
    attemptFieldActive(s,p,selected);
    break;
   }
   if(ability.op==='discardHandBuffSelf'){
    if(action.mode!=='discardSelfBuff'||!pl.hand.length||
     s.mainAbilityUsedUids.includes(selected.uid))
     throw Error('Discard MAIN requires one owned hand payment and unused source');
    // The once-per-turn paid source program must finish its BP update
    // before source-qualified moved cards may release their own draw.
    s.effectQueue.unshift(...sourceMoveBoundary(pack,s,p,selected.uid));
    s.pending={kind:'main-discard-buff',player:p,sourceUid:selected.uid,
     bp:ability.bp,choices:pl.hand.map(c=>c.uid)};
    break;
   }
   if(ability.op==='restSelfGainEnergyRetireEndMain'){
    const line=pl.energy.some(c=>c?.uid===selected.uid)?'energy':
     pl.front.some(c=>c?.uid===selected.uid)?'front':null;
    const lineAllowed=ability.energyOnly===true?line==='energy':
     ability.lines==='field'||ability.lines===line;
    if(action.mode!=='selfRestEnergyRetire'||!lineAllowed||!selected.ready||
     s.mainAbilityUsedUids.includes(selected.uid))
     throw Error('Delayed energy requires a READY source on a printed line, once per turn');
    if(!Number.isInteger(selected.fieldEntryStamp)||selected.fieldEntryStamp<1)
     selected.fieldEntryStamp=s.nextFieldEntryStamp++;
    selected.ready=false;
    s.mainAbilityUsedUids.push(selected.uid);
    selected.buffs??=[];
    selected.buffs.push({energy:ability.extraEnergy,untilTurn:s.turn});
    const delayed={owner:p,sourceUid:selected.uid,
     fieldEntryStamp:selected.fieldEntryStamp,turn:s.turn};
    if(ability.end==='hand')s.delayedEffects.push({...delayed,op:'moveAtMainEnd',destination:'hand'});
    else s.delayedEffects.push({...delayed,op:'retireAtMainEnd'});
    break;
   }
   if(ability.op==='restSelfRestFrontGainEnergy'){
    const choices=pl.front.filter(c=>c&&c.ready&&c.uid!==selected.uid&&
     card(pack,c).type==='character').map(c=>c.uid);
    if(action.mode!=='restFrontGainEnergy'||!selected.ready||
     s.mainAbilityUsedUids.includes(selected.uid)||!choices.length)
     throw Error('Front REST energy requires a READY unused source and another ACTIVE front');
    selected.ready=false;
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'main-rest-front-energy',player:p,sourceUid:selected.uid,
     choices,extraEnergy:ability.extraEnergy};
    break;
   }
   if(ability.op==='payApDrawGainEnergy'){
    if(action.mode!=='payApDrawEnergy'||s.mainAbilityUsedUids.includes(selected.uid)||
     !pl.apCards.some(c=>c.ready))
     throw Error('AP energy requires one ready AP and an unused source');
    spendAp(pl,1);
    s.mainAbilityUsedUids.push(selected.uid);
    draw(pack,s,p,ability.draw,{reason:'own-effect',sourceUid:selected.uid});
    selected.buffs??=[];
    selected.buffs.push({energy:ability.extraEnergy,untilTurn:s.turn});
    break;
   }
   if(ability.op==='restSelfBuffOther'){
    const choices=field(pl).filter(c=>c.uid!==selected.uid&&card(pack,c).type==='character')
     .map(c=>c.uid);
    if(action.mode!=='selfRestBuff'||!selected.ready||!choices.length)
     throw Error('REST buff requires a READY source and another own character');
    selected.ready=false;
    s.pending={kind:'effect-buff-own',player:p,sourceUid:selected.uid,choices,
     filter:{field:'type',value:'character'},bp:ability.bp,optional:false,excludeSelf:true};
    break;
   }
   if(ability.op==='restSelfThen'){
    if(action.mode!=='selfRestThen'||!selected.ready)
     throw Error('REST main action requires READY front character');
    selected.ready=false;
    // Use only the existing common queue; title adapters never execute effects.
    s.effectQueue.push(...ability.then.map(e=>({...e,owner:p,
     sourceUid:selected.uid,sourceName:d.name})),
     ...sourceMoveBoundary(pack,s,p,selected.uid));
    continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='frontOnceProgram'){
    if(action.mode!=='frontOnce'||!pl.front.some(c=>c?.uid===selected.uid)||
     s.mainAbilityUsedUids.includes(selected.uid))
     throw Error('Front once-per-turn program is not legal');
    const step=ability.then[0];
    if(step.op==='discardGate'&&!payableHand(pack,s,p,step.payment).length)
     throw Error('Front once-per-turn program requires a matching hand payment');
    s.mainAbilityUsedUids.push(selected.uid);
    s.effectQueue.push(...ability.then.map(e=>({...e,owner:p,
     sourceUid:selected.uid,sourceName:d.name})),
     ...sourceMoveBoundary(pack,s,p,selected.uid));
    continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='restSelfThenRestOppFrontOne'){
    const targets=s.players[1-p].front.filter(Boolean).map(c=>c.uid);
    if(action.mode!=='selfRestEnemy'||!selected.ready||!targets.length)
     throw Error('Main self-REST requires READY front source and legal opposing front target');
    // Pay precisely the source's REST cost, before entering the mandatory
    // shared opponent-target choice. No AP and no invented once-per-turn flag.
    selected.ready=false;
    s.pending={kind:'effect-rest-bp',player:p,sourceUid:selected.uid,
     choices:targets,limit:null,optional:false};
    break;
   }
   if(ability.op!=='chooseTwoAfterOwnRaid'||
    !s.raidedThisTurn[p]||s.mainAbilityUsedUids.includes(selected.uid))
    throw Error('Main ability already used or missing own Raid');
   s.mainAbilityUsedUids.push(selected.uid);
   if(action.mode==='ready'||action.mode==='readyAndBuff'){
    if(s.mainReadyOnceByName[p].includes(d.name))
     throw Error('Per-name ready already used this turn');
    s.mainReadyOnceByName[p].push(d.name);
    attemptFieldActive(s,p,selected); // Q2289: READY attempt before BP target selection.
   }
   if(action.mode==='buff'||action.mode==='readyAndBuff')
    s.pending={kind:'main-two-buff',player:p,sourceUid:selected.uid,
     trait:ability.trait,bp:ability.bp};
   break;
  }
  case 'move':{
   const l=location(s,p,action.uid);
   if(!l||l.line!=='energy'||card(pack,l.c).frontForbidden)throw Error('Invalid move');
   commitDestination(pack,s,p,'front',action.slot,action.replaceUid);
   pl.energy[l.slot]=null;pl.front[action.slot]=l.c;
   recordCompletedMove(pack,s,{physical:l.c,owner:p,from:'energy',to:'front',reason:'rule'});
   s.moved=true;s.movedUids.push(l.c.uid);break;
  }
  case 'step':{
   const l=location(s,p,action.uid);
   if(!l||l.line!=='front')throw Error('Invalid STEP');
   commitDestination(pack,s,p,'energy',action.slot,action.replaceUid);
   pl.front[l.slot]=null;pl.energy[action.slot]=l.c;
   recordCompletedMove(pack,s,{physical:l.c,owner:p,from:'front',to:'energy',reason:'rule'});
   s.moved=true;s.movedUids.push(l.c.uid);break;
  }
  case 'play':case 'event':case 'raid':{
   const index=pl.hand.findIndex(c=>c.uid===action.uid);
   if(index<0)throw Error('Card not in hand');
   const current=pl.hand[index],d=card(pack,current);
   const payment=handPlayApPlan(s,p,d);
   spendAp(pl,payment.cost);
   s.continuousStates=s.continuousStates.filter(e=>!payment.ids.includes(e.id));
   pl.hand.splice(index,1);
   if(action.type==='event'){
    const deferred=(d.effects?.onPlay||[]).some(e=>
     e.op==='conditionalBounceOrRetireByOwnOutsideNames');
    if(deferred){
     // Generic pending-source lifecycle. Q767 excludes this EVENT until its
     // complete printed effect ends; no title-specific reducer or timer.
     pl.resolvingEvents.push(current);
     s.effectQueue.unshift(...programJobs(pack,s,current,'onPlay',p,undefined,'event'),
      ...sourceMoveBoundary(pack,s,p,current.uid),
      {op:'completeResolvingEvent',owner:p,sourceUid:current.uid});
     continueEffectQueue(pack,s);
    }else{
     // Legacy EVENT paths retained until independently timing-audited.
     pl.outside.push(current);
     recordCompletedMove(pack,s,{physical:current,owner:p,from:'hand',to:'outside',reason:'rule'});
     applyEffects(pack,s,current,'onPlay',p,'event');
    }
   }
   else if(action.type==='raid'){
    performRaid(pack,s,p,current,action.baseUid,'front',action.slot,action.replaceUid,
     {entryCause:'paidRaid'});
   }else{
    commitDestination(pack,s,p,action.line,action.slot,action.replaceUid);
    current.ready=defaultEntryReady(pack,s,p,current);
    current.fieldEntryStamp=s.nextFieldEntryStamp++;
    pl[action.line][action.slot]=current;
    recordCompletedMove(pack,s,{physical:current,owner:p,from:'hand',
     to:action.line,reason:'rule'});
    applyEffects(pack,s,current,'onPlay',p,'paidPlay');
   }
   break;
  }
  case 'attack':{
   const attacker=pl.front.find(c=>c?.uid===action.uid);
   if(!attacker)throw Error('Attacker missing');
   attacker.ready=false;s.attacksThisTurn++;
   // One physical card keeps its own count for this turn, including after
   // it leaves and re-enters. A new UID, such as a Raid top, starts at zero.
   // The turn-wide attacksThisTurn counter is a different rule and stays.
   const declared=(s.attacksByUid[attacker.uid]||0)+1;
   s.attacksByUid[attacker.uid]=declared;
   // Official Q79 (2023-03-17): 【2回アタック】 designates the attacker,
   // rests it, then sets that character ACTIVE before battle. The printed
   // keyword is an original effect, so silence suppresses it. attemptFieldActive
   // still consumes 「次の1回アクティブにならない」 instead of forcing ACTIVE.
   const keyword=card(pack,attacker).readyOnAttackCount;
   if(keyword&&declared===keyword&&!originalEffectsDisabled(s,attacker))
    attemptFieldActive(s,p,attacker);
   // Queue the blocker decision after the attack triggers. A targeted
   // onAttack effect may suspend resolution for its controller's choice;
   // assigning block here would overwrite that pending choice.
   const attackJobs=programJobs(pack,s,attacker,'onAttack',p);
   const gained=s.continuousStates.filter(x=>x.kind==='grantedOnAttack'&&
    !x.consumed&&x.targetOwner===p&&x.targetUid===attacker.uid&&
    x.targetStamp===attacker.fieldEntryStamp);
   const grantJobs=gained.map(x=>({op:'grantedAttackDraw',owner:p,
    sourceUid:attacker.uid,grantId:x.id}));
   const targeted=typeof action.targetUid==='string';
   s.effectQueue.push(...attackJobs,...grantJobs,
    ...((attackJobs.length||grantJobs.length)?sourceMoveBoundary(pack,s,p,attacker.uid):[]),
    ...(targeted?[{op:'resolveSniperBattle',owner:p,sourceUid:attacker.uid,
     sourceStamp:attacker.fieldEntryStamp,targetUid:action.targetUid,
     targetStamp:action.targetStamp}]:
     [{op:'openBlock',owner:p,sourceUid:attacker.uid}]));
   continueEffectQueue(pack,s);
   break;
  }
  default:throw Error('Unsupported universal action');
 }
 pruneContinuousStates(s);
 finishPending(s);
 assertUniversalMatch(pack,s);
 return s;
}
export function assertUniversalMatch(pack,s){
 const packs=playerPacks(pack),isSame=packs[0].id===packs[1].id&&packs[0].version===packs[1].version;
 if(s?.version!==UNIVERSAL_V2_VERSION||
   s.title!==(isSame?packs[0].id:'cross-title')||
   s.packVersion!==(isSame?packs[0].version:null)||
   !Array.isArray(s.packIds)||!Array.isArray(s.packVersions)||
   packs.some((p,i)=>s.packIds[i]!==p.id||s.packVersions[i]!==p.version)||
   s.packIds.length!==2||s.packVersions.length!==2||
   !Array.isArray(s.initialCounts)||s.initialCounts.length!==2||
   s.players?.length!==2||!playerIndex(s.active)||
   !['playing','finished'].includes(s.status))throw Error('Incorrect pack/version or match state');
 if(s.pending&&(!playerIndex(s.pending.player)||!['phase-order','retirement-order','effect-move-order','effect-rest-tuck','effect-tuck-moved','block','life-batch-order','life-trigger','effect-target','effect-target-many','effect-grant-attack','granted-attack-draw','effect-discard','end-hand-limit','effect-recover-ap','private-top-choice','private-top-place','effect-retire-bp','effect-named-outside-bounce-retire','effect-optional-draw','effect-strip-raid-top','effect-retire-own-field','effect-retire-own-character','main-field-trait-retire','effect-rest-bp','effect-attack-ban','effect-own-front-protect','effect-grant-ap-tax','effect-grant-front-energy','raid-effect-order','effect-buff-trait','effect-buff-own','effect-once-choice','main-two-buff','main-discard-buff','main-discard-self-retire','main-rest-front-energy','leave-replacement','effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-order','effect-recover-outside','effect-outside-rest','effect-outside-name-rest','effect-outside-traitless-rest','effect-named-zone-entry','effect-hand-rest','effect-bounce-own','effect-discard-cost','effect-discard-gate','effect-selection-hand-payment','attack-end-swap','effect-choice-mode','recovered-self-entry','effect-optional-mill','effect-pay-ap-deploy','effect-top-trait-outside'].includes(s.pending.kind)))
  throw Error('Invalid pending controller');
 if(!Array.isArray(s.raidedThisTurn)||s.raidedThisTurn.length!==2||
   s.raidedThisTurn.some(x=>typeof x!=='boolean')||
   !Array.isArray(s.mainAbilityUsedUids)||
   new Set(s.mainAbilityUsedUids).size!==s.mainAbilityUsedUids.length||
   !Array.isArray(s.mainReadyOnceByName)||s.mainReadyOnceByName.length!==2||
   s.mainReadyOnceByName.some(x=>!Array.isArray(x)||new Set(x).size!==x.length))
  throw Error('Invalid once-per-turn ability accounting');
 if(!Array.isArray(s.turnEffectZoneMoves)||s.turnEffectZoneMoves.length!==2||
  s.turnEffectZoneMoves.some(x=>!x||typeof x!=='object'||
   Object.keys(x).length!==2||typeof x.handToOutside!=='boolean'||
   typeof x.outsideToHand!=='boolean'))
  throw Error('Invalid own-effect movement ledger');
 if(!Array.isArray(s.zoneMoveEvents)||!Number.isInteger(s.nextZoneMoveOrder)||
  s.nextZoneMoveOrder<1||s.zoneMoveEvents.some((e,i,a)=>
   !e||!Number.isInteger(e.order)||e.order<1||
   (i>0&&a[i-1].order>=e.order)||e.order>=s.nextZoneMoveOrder||
   (!Number.isInteger(e.turn)||e.turn<0||e.turn>s.turn)||
   ![0,1].includes(e.owner)||![0,1].includes(e.controller)||
   typeof e.uid!=='string'||!e.uid.startsWith(e.owner+'-')||
   typeof e.cardId!=='string'||!e.cardId||
   !['hand','deck','life','lifeRevealed','outside','front','energy','removed','raid-under'].includes(e.from)||
   !['hand','deck','life','lifeRevealed','outside','front','energy','removed','raid-under'].includes(e.to)||
   !V2_MOVE_REASONS.includes(e.reason)||
   (e.sourceUid!==null&&typeof e.sourceUid!=='string')||
   (e.sourceCardId!==null&&typeof e.sourceCardId!=='string')||
   (e.sourceName!==null&&typeof e.sourceName!=='string')||
   (e.sourceColor!==null&&typeof e.sourceColor!=='string')||
   typeof e.sourceOnField!=='boolean'||
   (e.earnedFieldObservers!==undefined&&(
    e.from!=='hand'||e.to!=='outside'||e.owner!==e.controller||
    !['payment','own-effect'].includes(e.reason)||!e.sourceOnField||
    !Array.isArray(e.earnedFieldObservers)||!e.earnedFieldObservers.length||
    e.earnedFieldObservers.length>8||
    new Set(e.earnedFieldObservers.map(x=>x.sourceUid)).size!==e.earnedFieldObservers.length||
    e.earnedFieldObservers.some(x=>!x||typeof x.sourceUid!=='string'||
     !x.sourceUid.startsWith(e.owner+'-')||!Number.isInteger(x.sourceStamp)||
     x.sourceStamp<1||Object.keys(x).some(k=>!['sourceUid','sourceStamp'].includes(k)))))||
   (e.attachedToUid!==undefined&&(typeof e.attachedToUid!=='string'||
    !e.attachedToUid.startsWith(e.owner+'-')||e.attachedToUid===e.uid||
    e.from!=='raid-under'||typeof e.wasFaceDown!=='boolean'||
    JSON.stringify(e.identityViewersBefore)!==JSON.stringify(e.wasFaceDown?[e.owner]:[0,1])))))
  throw Error('Invalid private movement history');
 if(!Array.isArray(s.turnRetireEvents)||s.turnRetireEvents.some(e=>
  !e||e.turn!==s.turn||!playerIndex(e.controller)||
  !['character','field'].includes(e.cardType)||
  !['front','energy'].includes(e.line)||
  typeof e.uid!=='string'||!e.uid.startsWith(e.controller+'-')||
  !(e.fieldEntryStamp===null||Number.isInteger(e.fieldEntryStamp)&&e.fieldEntryStamp>0)||
  Object.keys(e).some(k=>!['turn','controller','cardType','uid','line','fieldEntryStamp'].includes(k))))
  throw Error('Invalid true-retirement history');
 if(!Array.isArray(s.onceEffectUses)||s.onceEffectUses.length!==2||
  s.onceEffectUses.some(x=>!Array.isArray(x)||
   x.some(v=>typeof v!=='string')||new Set(x).size!==x.length))
  throw Error('Invalid generic once-per-turn accounting');
 if(!Array.isArray(s.movedUids)||new Set(s.movedUids).size!==s.movedUids.length)
  throw Error('Invalid movement accounting');
 if(!Number.isInteger(s.attacksThisTurn)||s.attacksThisTurn<0||s.attacksThisTurn>50)
  throw Error('Invalid attack count');
 if(!s.attacksByUid||typeof s.attacksByUid!=='object'||Array.isArray(s.attacksByUid))
  throw Error('Invalid per-card attack count');
 for(const [uid,n] of Object.entries(s.attacksByUid))
  if(typeof uid!=='string'||!uid.includes('-')||!Number.isInteger(n)||n<1||n>50)
   throw Error('Invalid per-card attack count');
 if(!s.blocksByUid||typeof s.blocksByUid!=='object'||Array.isArray(s.blocksByUid))
  throw Error('Invalid per-card block count');
 for(const [uid,n] of Object.entries(s.blocksByUid))
  if(typeof uid!=='string'||!uid.includes('-')||!Number.isInteger(n)||n<1||n>50)
   throw Error('Invalid per-card block count');
 for(let owner=0;owner<2;owner++)for(const physical of field(s.players[owner]))
  for(const [key,op] of [['sniperGranted','grantSelfSniperThisTurn'],
   ['attackWinDrawGranted','grantSelfAttackWinDrawThisTurn'],
   ['mustBlockGranted','grantSelfMustBlockThisTurn']]){
   const g=physical[key];
   if(g===undefined)continue;
   if(!g||typeof g!=='object'||Array.isArray(g)||
    !Number.isInteger(g.turn)||g.turn<0||g.turn>s.turn||
    !Number.isInteger(g.stamp)||g.stamp<1||g.stamp>=s.nextFieldEntryStamp||
    Object.keys(g).length!==2||Object.keys(g).some(k=>!['turn','stamp'].includes(k))||
    !card(pack,physical).effects.onPlay?.some(x=>x.op===op))
    throw Error('Forged temporary physical battle grant');
  }
 for(let owner=0;owner<2;owner++)for(const physical of field(s.players[owner])){
  const grant=physical.attackEndSwapGranted;
  if(grant!==undefined&&(!grant||typeof grant!=='object'||Array.isArray(grant)||
   !Number.isInteger(grant.turn)||grant.turn<1||grant.turn>s.turn||
   !Number.isInteger(grant.stamp)||grant.stamp!==physical.fieldEntryStamp||
   Object.keys(grant).length!==2||
   Object.keys(grant).some(k=>!['turn','stamp'].includes(k))||
   !card(pack,physical).effects.onPlay?.some(e=>e.op==='chooseOne'&&
    e.entry==='ownEffect'&&e.options.some(o=>o.then.some(t=>
     t.op==='grantSelfAttackEndSwapThisTurn')))))
   throw Error('Forged physical attack-end grant');
  for(const buff of physical.buffs||[])if(buff.untilOwnTurnStart!==undefined&&(
   !Number.isInteger(buff.untilOwnTurnStart)||
   buff.untilOwnTurnStart!==s.players[owner].ownTurns+1||
   !Number.isInteger(buff.bp)||buff.bp<1||buff.bp>5000||
   Object.keys(buff).length!==2||
   Object.keys(buff).some(k=>!['bp','untilOwnTurnStart'].includes(k))||
   !card(pack,physical).effects.onPlay?.some(e=>e.op==='chooseOne'&&e.entry==='ownEffect'&&
    e.options.some(o=>o.then.some(t=>t.op==='buffSelfUntilNextOwnStart'&&t.bp===buff.bp)))))
   throw Error('Forged next-own-start physical BP modifier');
 }
 if(s.pending?.kind==='effect-optional-draw'){
  const q=s.pending,src=s.players[q.player].front.find(c=>c?.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  if(q.player!==s.active||s.phase!=='attack'||!src||
   !Number.isInteger(q.sourceStamp)||q.sourceStamp<1||
   src.fieldEntryStamp!==q.sourceStamp||
   !Number.isInteger(s.attacksByUid[q.sourceUid])||
   s.attacksByUid[q.sourceUid]<1||
   !printed.effects.onAttack?.some(x=>
    x.op==='drawIfOwnOutsideNamedCountAtLeast'&&x.count===1&&x.optional===true)||
   Object.keys(q).length!==4||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp'].includes(k)))
   throw Error('Invalid saved optional-draw source');
 }
 if(s.pending?.kind==='attack-end-swap'){
  const q=s.pending,pl=s.players[q.player],src=pl.front.find(c=>c?.uid===q.sourceUid);
  const d=src&&card(pack,src),choices=pl.energy.filter(c=>c&&
   card(pack,c).type==='character').map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
  if(q.player!==s.active||s.phase!=='attack'||!attackEndSwapAvailable(pack,s,src)||
   !src||src.fieldEntryStamp!==q.sourceStamp||
   !(s.attacksByUid[q.sourceUid]>=1)||!Number.isInteger(q.sourceStamp)||
   q.sourceStamp<1||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||
   (!hasEarnedAttackEndSwap(s,src)&&(!d.attackEndSwap||
    countOwnOutsideDistinctPrintedNames(s,q.player,c=>card(pack,c),
     d.attackEndSwap)<d.attackEndSwap.minDistinctNames))||
   Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices'].includes(k)))
   throw Error('Invalid saved attack-end swap pending');
 }
 if(s.pending?.kind==='effect-selection-hand-payment'){
  const q=s.pending,orig=q.originPending;
  const target=field(s.players[1-q.player]).find(c=>c.uid===q.targetUid);
  const inner={...s,pending:orig};
  const plan=selectionHandTax(pack,inner,q.player,q.targetUid,q.sourceType);
  if(!orig||typeof orig!=='object'||orig.player!==q.player||
   orig.sourceUid!==q.sourceUid||q.player!==s.active||
   q.targetAction?.uid!==q.targetUid||
   !TARGETING_CARD_EFFECT_CHOICES.has(q.targetAction?.type)||
   orig.kind==='effect-target-many'||
   q.sourceType!==sourceTypeFromUid(pack,s,q.sourceUid)||
   !target||target.fieldEntryStamp!==q.targetStamp||
   !Number.isInteger(q.targetStamp)||q.targetStamp<1||
   plan.blocked||!plan.payable||plan.cost!==1||
   selectionApSurcharge(s,q.player,q.targetUid)!==0||
   !legalPending(pack,inner).some(a=>same(a,q.targetAction))||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','originPending',
    'targetAction','targetUid','targetStamp','sourceType'].includes(k)))
   throw Error('Invalid resumed selection hand-payment');
 }
 if(s.pending?.kind==='effect-discard-gate'&&s.pending.count===2){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.hand,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const find=x=>{
   if(!x||typeof x!=='object')return false;
   if(Array.isArray(x))return x.some(find);
   if(x.op==='discardGate'&&x.count===2&&x.optional===q.optional&&
    same(x.payment,q.payment)&&same(x.then,q.then))return true;
   return Object.values(x).some(find);
  };
  if(!printed||!find({effects:printed.effects,mainAbility:printed.mainAbility})||
   payableHand(pack,s,q.player,q.payment).length<2||
   !q.sourceUid.startsWith(q.player+'-')||
   Object.keys(q).length!==(q.payment?7:6)||
   Object.keys(q).some(k=>!['kind','player','sourceUid','optional','then','payment','count'].includes(k)))
   throw Error('Invalid saved atomic two-hand payment provenance');
 }
 if(s.pending?.kind==='main-field-trait-retire'){
   const q=s.pending,src=s.players[q.player].energy.find(c=>c?.uid===q.sourceUid);
   const d=src&&card(pack,src),ab=d?.mainAbility;
   const choices=field(s.players[q.player]).filter(c=>c.uid!==q.sourceUid&&
    card(pack,c).type==='character'&&cardHasTrait(card(pack,c),ab?.retireTrait)).map(c=>c.uid);
   if(!src||ab?.op!=='fieldDualMain'||!Number.isInteger(q.sourceStamp)||
    q.sourceStamp!==src.fieldEntryStamp||
    !s.mainReadyOnceByName[q.player].includes(q.sourceUid+'|fieldDualRetire')||
    !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
    Object.keys(q).length!==5||
    Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices'].includes(k)))
    throw Error('Invalid saved dual FIELD trait-retirement pending');
  }
  if(s.pending?.kind==='effect-retire-own-character'&&s.pending.excludeSelf===true){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid),printed=src&&card(pack,src);
  const branches=printed?.effects?.onPlay?.flatMap(e=>e.op==='chooseOne'?
   e.options.flatMap(o=>o.then):[e])||[];
  const earned=branches.find(e=>e.op==='retireOwnCharacterOne'&&
   e.excludeSelf===true&&e.optional===true);
  const candidates=field(pl).filter(c=>c.uid!==q.sourceUid&&
   card(pack,c).type==='character').map(c=>c.uid);
  const after=q.after?.map(({owner,sourceUid,sourceName,...x})=>x);
  if(!earned||!Array.isArray(q.after)||q.after.length!==1||
   !same(earned.after,after)||
   q.after.some(e=>e.owner!==q.player||e.sourceUid!==q.sourceUid||
    e.sourceName!==printed.name)||
   !Array.isArray(q.choices)||!same(q.choices,candidates)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','optional','after','excludeSelf'].includes(k)))
   throw Error('Invalid saved other-character retirement continuation');
 }
 if(s.pending?.kind==='effect-top-filter-many-choice'){
  const q=s.pending,pl=s.players[q.player];
  const rest=q.uids?.filter(uid=>!q.selected?.includes(uid));
  const source=[...pl.outside,...field(pl)].find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source).effects?.onPlay
   ?.flatMap(e=>e.op==='chooseOne'?e.options.flatMap(o=>o.then):
    e.op==='optionalRetireThenProgram'?e.after:[e])
   .some(e=>e.op==='searchTopUpToTwoBottom'&&e.max===q.max&&
    e.rest==='bottom'&&e.count>=q.uids?.length&&
    same(e.filters,q.filters)&&e.logic===q.logic);
  if(!printed||![1,2].includes(q.max)||!Array.isArray(q.uids)||q.uids.length<1||q.uids.length>5||
   new Set(q.uids).size!==q.uids.length||!Array.isArray(q.choices)||
   !Array.isArray(q.selected)||q.selected.length>=q.max||
   new Set(q.selected).size!==q.selected.length||
   q.selected.some(uid=>!q.uids.includes(uid)||!q.choices.includes(uid)||
    !pl.hand.some(c=>c.uid===uid))||
   !same(pl.deck.slice(0,rest.length).map(c=>c.uid),rest)||
   !same(q.choices,q.uids.filter(uid=>{
    const physical=pl.deck.find(c=>c.uid===uid)||pl.hand.find(c=>c.uid===uid);
    return physical&&matchesSearch(pack,s,physical,q);
   }))||Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','uids','choices','selected','filters','logic','max'].includes(k)))
   throw Error('Invalid resumed TOP-N multi choice');
 }
 if(s.pending?.kind==='effect-bounce-own'&&s.pending.optional===true){
  const q=s.pending,src=field(s.players[q.player]).find(c=>c.uid===q.sourceUid);
  const expected=src&&card(pack,src).effects?.onPlay?.flatMap(e=>e.op==='chooseOne'?e.options.flatMap(o=>o.then):[e])
   .find(e=>e.op==='bounceOwnOtherUnderEnergy'&&e.optional===true&&e.excludeName===q.excludeName);
  const choices=field(s.players[q.player]).filter(c=>c.uid!==q.sourceUid&&card(pack,c).type==='character'&&!cardHasName(card(pack,c),q.excludeName)).map(c=>c.uid);
  if(!expected||!same(expected.after,q.after)||!same(choices,q.choices)||Object.keys(q).length!==7)
   throw Error('Invalid optional bounce continuation');
 }
 // R41 serialized pending: free entry and its grant must be earned by
 // the exact printed source program, not forged via hidden pending JSON.
 if(s.pending?.kind==='effect-hand-rest'&&s.pending.special===true){
  const q=s.pending,pl=s.players[q.player];
  const physical=[...pl.hand,...pl.outside,...pl.deck,...pl.life,...pl.lifeRevealed,
   ...(pl.removed||[]),...field(pl)].find(c=>c.uid===q.sourceUid);
  const printed=physical&&card(pack,physical);
  const findOp=x=>{
   if(!x||typeof x!=='object')return false;
   if(Array.isArray(x))return x.some(findOp);
   return (x.op==='deployOwnHandSpecial'&&x.type===q.type&&x.color===q.color&&
    x.ap===q.ap&&x.trait===q.trait&&x.maxEnergy===q.maxEnergy&&
    x.ready===q.ready&&x.protectionScope===q.protectionScope&&
    Number.isInteger(q.max)&&q.max>=1&&q.max<=x.max)||
    Object.values(x).some(findOp);
  };
  const expected=pl.hand.filter(c=>{
   const d=card(pack,c);
   return d.type===q.type&&d.color===q.color&&d.ap===q.ap&&
    (q.maxEnergy===null||d.energy<=q.maxEnergy)&&
    (q.trait===null||cardHasTrait(d,q.trait));
  }).map(c=>c.uid);
  if(!printed||q.sourceName!==printed.name||!findOp(printed.effects)||
   !Array.isArray(q.choices)||!same(q.choices,expected)||
   Object.keys(q).length!==14||Object.keys(q).some(k=>![
    'kind','player','sourceUid','sourceName','choices','type','color','ap',
    'max','special','trait','maxEnergy','ready','protectionScope'].includes(k)))
   throw Error('Invalid special hand entry pending provenance');
 }
 // R42: saved cross-zone free-entry selection must be earned by an actual
 // owned printed source, with exact READY/REST mode and legal physical UIDs.
 // Never accept forged serialized pending state as an unearned free play.
 if(s.pending?.kind==='effect-named-zone-entry'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.hand,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...(pl.removed||[])];
  const src=owned.find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const find=x=>{
   if(!x||typeof x!=='object')return null;
   if(Array.isArray(x)){for(const part of x){const matched=find(part);if(matched)return matched;}return null;}
   if(x.op==='deployNamedFromZones'&&x.name===q.name&&x.ready===q.ready&&
    x.line===q.line&&x.optional===true&&x.cardType===q.cardType&&x.color===q.color&&
    x.ap===q.ap&&x.maxEnergy===q.maxEnergy&&x.grantBp===q.grantBp)return x;
   for(const value of Object.values(x)){const matched=find(value);if(matched)return matched;}
   return null;
  };
  // Paid MAIN continuation can still be pending after its true retirement,
  // so match against both whole printed onPlay and MAIN payloads.
  const earned=printed&&find({effects:printed.effects,mainAbility:printed.mainAbility});
  const legalZone=zone=>earned?.zones.includes(zone)?
   pl[zone].filter(c=>{const d=card(pack,c);return d.type===(q.cardType||'character')&&
    cardHasName(d,q.name,originalEffectsDisabled(s,c))&&
    (q.color===undefined||(d.color===q.color&&d.ap===q.ap&&d.energy<=q.maxEnergy));
   }).map(c=>c.uid):[];
  if(!earned||q.sourceName!==printed.name||
   !Array.isArray(q.handChoices)||!Array.isArray(q.outsideChoices)||
   !same(q.handChoices,legalZone('hand'))||
   !same(q.outsideChoices,legalZone('outside'))||
   Object.keys(q).length!==((earned&&earned.color===undefined?9:
    earned&&earned.grantBp===undefined?12:13)+Number(q.cardType==='field'))||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name',
    'ready','line','handChoices','outsideChoices','color','ap',
    'maxEnergy','grantBp','cardType'].includes(k)))
   throw Error('Invalid named free zone entry provenance');
 }
 if(s.pending?.kind==='main-discard-self-retire'){
  const q=s.pending,pos=location(s,q.player,q.sourceUid),src=pos?.c,pl=s.players[q.player];
  if(!src||src.ready!==false||src.fieldEntryStamp!==q.sourceStamp||
   !['front','energy'].includes(pos.line)||
   card(pack,src).mainAbility?.op!=='restDiscardRetireThen'||
   !Array.isArray(q.choices)||!same(q.choices,pl.hand.map(c=>c.uid))||
   Object.keys(q).length!==5||Object.keys(q).some(k=>
    !['kind','player','sourceUid','sourceStamp','choices'].includes(k)))
   throw Error('Invalid paid MAIN retire pending provenance');
 }
 validateContinuousStates(s);
 if(typeof s.endRefreshed!=='boolean')throw Error('Invalid end refresh flag');
 if(!Number.isInteger(s.nextFieldEntryStamp)||s.nextFieldEntryStamp<1||
   !Array.isArray(s.delayedEffects)||s.delayedEffects.some(x=>{
    const retire=x?.op==='retireAtMainEnd'&&x.destination===undefined;
    const hand=x?.op==='moveAtMainEnd'&&x.destination==='hand';
    const keys=x&&typeof x==='object'?Object.keys(x):[];
    return !(retire||hand)||!playerIndex(x.owner)||
     typeof x.sourceUid!=='string'||!Number.isInteger(x.turn)||
     !Number.isInteger(x.fieldEntryStamp)||x.fieldEntryStamp<1||
     keys.some(k=>!['op','owner','sourceUid','fieldEntryStamp','turn','destination'].includes(k))||
     (retire&&keys.includes('destination'));
   }))
  throw Error('Invalid delayed effect instances');
 if(s.retirementBatch!==null){
  const batch=s.retirementBatch;
  if(!Array.isArray(batch)||batch.some(e=>!e||!playerIndex(e.owner)||
   typeof e.key!=='string'||typeof e.sourceUid!=='string'||!Array.isArray(e.jobs)||
   e.jobs.some(j=>!j||!playerIndex(j.owner)||typeof j.op!=='string'))||
   !s.effectQueue.some(e=>e.op==='closeRetirementBatch'))
   throw Error('Invalid open retirement batch');
 }
 if(s.lifeRevealBatch!==null){
  const b=s.lifeRevealBatch;
  if(!b||!playerIndex(b.owner)||!Array.isArray(b.remaining)||
   new Set(b.remaining).size!==b.remaining.length||
   b.remaining.some(uid=>typeof uid!=='string'||
    !s.players[b.owner].lifeRevealed.some(c=>c.uid===uid))||
   s.players[1-b.owner].lifeRevealed.length)
   throw Error('Invalid LIFE reveal batch');
 }else if(s.players.some(p=>p.lifeRevealed.length))
  throw Error('Revealed LIFE cards without live batch');
 // Deferred entry blocks are private earned programs, never new LIFE cards.
 const lifeEntries=[...(s.pending?.kind==='life-batch-order'?(s.pending.entries||[]):[]),
  ...s.effectQueue.filter(j=>j.op==='lifeBatchStep').flatMap(j=>j.entries||[])];
 if(lifeEntries.length&&(!s.lifeRevealBatch||
  new Set(lifeEntries.map(e=>e.key)).size!==lifeEntries.length||
  lifeEntries.some(e=>!e||typeof e.key!=='string'||typeof e.sourceUid!=='string'||
   !e.sourceUid.startsWith(s.lifeRevealBatch.owner+'-')||!Array.isArray(e.jobs)||!e.jobs.length||
   e.jobs.some(j=>!j||j.owner!==s.lifeRevealBatch.owner||j.sourceUid!==e.sourceUid||
    ['lifeBatchStep','lifeRelease','openBlock','additionalBattleDamage'].includes(j.op)))))
  throw Error('Invalid deferred LIFE entry');
 if(s.pending?.kind==='life-batch-order'&&(!s.lifeRevealBatch||
  s.pending.player!==s.lifeRevealBatch.owner||
  !Array.isArray(s.pending.choices)||
  s.pending.choices.length+(s.pending.entries||[]).length<2||
  s.pending.choices.some(uid=>!s.lifeRevealBatch.remaining.includes(uid))))
  throw Error('Invalid LIFE order snapshot');
 if(s.pending?.kind==='effect-grant-attack'&&(
  !Array.isArray(s.pending.choices)||new Set(s.pending.choices).size!==s.pending.choices.length||
  s.pending.choices.some(x=>typeof x!=='string'||!x.startsWith(s.pending.player+'-'))||
  !Array.isArray(s.pending.program)||s.pending.program.length!==1||
  s.pending.program[0]?.op!=='draw'||s.pending.program[0]?.count!==1||
  s.pending.optional!==true))throw Error('Invalid grant target snapshot');
 if(s.pending?.kind==='effect-grant-ap-tax'){
   const q=s.pending;
   if(q.optional!==true||typeof q.sourceUid!=='string'||
    !q.sourceUid.startsWith(q.player+'-')||
    typeof q.trait!=='string'||!q.trait.trim()||
    !Array.isArray(q.choices)||!q.choices.length||q.choices.length>8||
    new Set(q.choices.map(c=>c?.uid)).size!==q.choices.length||
    q.choices.some(c=>!c||typeof c.uid!=='string'||
     !c.uid.startsWith(q.player+'-')||c.uid===q.sourceUid||
     !Number.isInteger(c.stamp)||c.stamp<1||
     Object.keys(c).length!==2||Object.keys(c).some(k=>!['uid','stamp'].includes(k))||
     !field(s.players[q.player]).some(t=>t.uid===c.uid&&
      t.fieldEntryStamp===c.stamp&&card(pack,t).type==='character'&&
      cardHasTrait(card(pack,t),q.trait)))||
    Object.keys(q).some(k=>!['kind','player','sourceUid','trait','choices','optional'].includes(k)))
    throw Error('Invalid AP-tax grant pending snapshot');
  }
  if(s.pending?.kind==='effect-grant-front-energy'){
   const q=s.pending;
   if(q.optional!==true||typeof q.sourceUid!=='string'||
    !q.sourceUid.startsWith(q.player+'-')||
    typeof q.trait!=='string'||!q.trait.trim()||
    !Array.isArray(q.choices)||!q.choices.length||q.choices.length>4||
    new Set(q.choices.map(c=>c?.uid)).size!==q.choices.length||
    q.choices.some(c=>!c||typeof c.uid!=='string'||!c.uid.startsWith(q.player+'-')||
     c.uid===q.sourceUid||!Number.isInteger(c.stamp)||c.stamp<1||
     Object.keys(c).length!==2||Object.keys(c).some(k=>!['uid','stamp'].includes(k))||
     !s.players[q.player].front.some(t=>t?.uid===c.uid&&
      t.fieldEntryStamp===c.stamp&&card(pack,t).type==='character'&&
      cardHasTrait(card(pack,t),q.trait)))||
    Object.keys(q).some(k=>!['kind','player','sourceUid','trait','choices','optional'].includes(k)))
    throw Error('Invalid FRONT energy grant pending snapshot');
  }
  if(s.pending?.kind==='effect-attack-ban'){
  const q=s.pending,foe=1-q.player;
  if(q.optional!==true||typeof q.sourceUid!=='string'||
   !q.sourceUid.startsWith(q.player+'-')||
   !Array.isArray(q.choices)||!q.choices.length||q.choices.length>4||
   new Set(q.choices.map(c=>c?.uid)).size!==q.choices.length||
   q.choices.some(c=>!c||typeof c.uid!=='string'||!c.uid.startsWith(foe+'-')||
    !Number.isInteger(c.stamp)||c.stamp<1||
    Object.keys(c).length!==2||Object.keys(c).some(k=>!['uid','stamp'].includes(k))||
    !s.players[foe].front.some(t=>t?.uid===c.uid&&t.fieldEntryStamp===c.stamp))||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','optional'].includes(k)))
   throw Error('Invalid attack-prohibition pending snapshot');
 }
 if(s.pending?.kind==='effect-target-many'&&(
  s.pending.maxTargets!==2||!Array.isArray(s.pending.choices)||!Array.isArray(s.pending.selected)||
  new Set(s.pending.choices).size!==s.pending.choices.length||
  new Set(s.pending.selected).size!==s.pending.selected.length||
  s.pending.selected.length>2||s.pending.selected.some(uid=>!s.pending.choices.includes(uid))||
  s.pending.choices.some(uid=>typeof uid!=='string'||!uid.startsWith((1-s.pending.player)+'-'))))
  throw Error('Invalid multi-target snapshot');
 // Every paused move effect is a historically earned physical UID job.
 // Validate pending AND deferred queue entries; otherwise an imported save
 // could smuggle arbitrary draw/retire jobs through a legal choice key.
 const moveWindows=[
  ...(s.pending?.kind==='effect-move-order'?
   [{owner:s.pending.player,entries:s.pending.entries}]:[]),
  ...(Array.isArray(s.effectQueue)?s.effectQueue.filter(j=>j.op==='effectMoveOrder'):[])
 ];
 for(const win of moveWindows){
  const entries=win.entries;
  if(!playerIndex(win.owner)||!Array.isArray(entries)||entries.length<1||
   entries.length>9||new Set(entries.map(x=>x?.key)).size!==entries.length)
   throw Error('Invalid simultaneous earned move ordering');
  for(const entry of entries){
   if(!entry||typeof entry.key!=='string'||!Array.isArray(entry.jobs)||
    entry.jobs.length<1||entry.jobs.length>6)
    throw Error('Invalid earned move entry');
   const watch=entry.key.match(/^observer-([01]-\d+)-(\d+)-(\d+)$/);
   const moved=entry.key.match(/^moved-([01]-\d+)-(\d+)$/);
   if(!watch&&!moved)throw Error('Unknown earned move entry');
   if(watch){
    if(entry.jobs.length!==1)throw Error('Duplicate earned REST reaction');
    const j=entry.jobs[0];
    if(j?.op!=='restSelfTuckMovedFaceDown'||j.owner!==win.owner||
     j.sourceUid!==watch[1]||j.moveOrder!==Number(watch[2])||
     !Number.isInteger(j.sourceStamp)||j.sourceStamp<1||
     Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp','movedUid','moveOrder'].includes(k))||
     !s.zoneMoveEvents.some(ev=>ev.order===j.moveOrder&&ev.owner===win.owner&&
      ev.uid===j.movedUid&&ev.earnedFieldObservers?.some(x=>
       x.sourceUid===j.sourceUid&&x.sourceStamp===j.sourceStamp)))
     throw Error('Forged physical REST reaction');
   }else{
    if(moved[1][0]!==String(win.owner))throw Error('Foreign earned card effect');
    const after=Number(moved[2]);
    if(!Number.isSafeInteger(after)||after<0||after>=s.nextZoneMoveOrder)
     throw Error('Invalid moved trigger boundary');
    for(const j of entry.jobs){
     if(j?.op!=='draw'||j.owner!==win.owner||
      !Number.isInteger(j.count)||j.count<1||j.count>10||
      Object.keys(j).some(k=>!['op','count','owner','sourceUid','sourceName'].includes(k))||
      !s.zoneMoveEvents.some(ev=>ev.order>after&&ev.owner===win.owner&&
       ev.controller===win.owner&&ev.sourceUid===moved[1]&&
       ev.uid===j.sourceUid&&ev.from==='hand'&&ev.to==='outside'))
      throw Error('Forged moved-card earned draw');
    }
   }
  }
 }
 // REST/tuck decisions can lose their target while paused; their provenance
 // remains necessary even if only the safe skip action survives.
 if(['effect-rest-tuck','effect-tuck-moved'].includes(s.pending?.kind)&&(
  !s.zoneMoveEvents.some(ev=>ev.owner===s.pending.player&&
   ev.uid===s.pending.movedUid&&ev.earnedFieldObservers?.some(x=>
    x.sourceUid===s.pending.sourceUid&&x.sourceStamp===s.pending.sourceStamp))))
  throw Error('Missing earned undercard provenance');
 if(['effect-rest-tuck','effect-tuck-moved'].includes(s.pending?.kind)&&(
  typeof s.pending.sourceUid!=='string'||typeof s.pending.movedUid!=='string'||
  !s.pending.movedUid.startsWith(s.pending.player+'-')||
  !s.pending.sourceUid.startsWith(s.pending.player+'-')||
  !Number.isInteger(s.pending.sourceStamp)||s.pending.sourceStamp<1))
  throw Error('Invalid undercard reaction');
 if(s.pending?.kind==='retirement-order'&&(!Array.isArray(s.pending.entries)||
  s.pending.entries.length<2||s.pending.entries.some(e=>e.owner!==s.pending.player||
   typeof e.key!=='string'||!Array.isArray(e.jobs))))
  throw Error('Invalid retirement order');
 if(!Array.isArray(s.effectQueue)||[...s.effectQueue,...lifeEntries.flatMap(e=>e.jobs)].some(e=>!playerIndex(e.owner)||
   !['grantedAttackDraw','grantOnAttack','grantSelfSniperThisTurn','grantSelfAttackWinDrawThisTurn','grantSelfMustBlockThisTurn','buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn','resolveAttackWinRecovery','draw','drawIfOwnName','drawIfOwnOutsideNamedCountAtLeast','drawIfOwnFieldExists','drawIfOwnEnergyAtLeast','millTop','buffSelf','buffSelfPerOwnOutsideGroups','enemyBpDown','drawDiscard','recoverAp','peekTopOne','peekTopOrBottom','retireOppFrontUnderBp','retireOppFrontOneUnderBp','conditionalBounceOrRetireByOwnOutsideNames','completeResolvingEvent','stripOppRaidTop','restOppFrontUnderBp','restOppFrontOne','forbidAttackOppFrontOne','retireOppFrontIfFacedown','buffOwnTrait','drawIfRaidUnderFacedown','searchDeckOne','searchDeckMany','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside','searchTopOneBottomDiscard','searchTopUpToTwoBottom','deployOwnHandRest','deployOwnHandSpecial','optionalRetireThenProgram','recoverOutsideOne','recoverOutsidePrintedBp','discardToDraw',
    'discardGate','enemyFrontAllBpDown','retireOppFrontAllUnderBp',
    'nextEligibleHandPlayApDiscount','grantFrontEnergyOwnOtherFrontTrait','buffOwnTraitAllTurn','buffSelfIfFirstAttack','bounceOwnOtherUnderEnergy',
    'recoverOutsideColorUnderEnergy','deployOutsideRest','deployOutsideNameRest','deployNamedFromZones','payApDeployNamedRest','inspectTopTraitOutside','deployOutsideTraitlessRestOrRaid','buffOwnField','oncePerTurnGate','retireBatchOne','retireAtMainEnd','retireSourceOnPhaseEnd','moveAtMainEnd','retireOwnFieldOne','retireOwnCharacterOne','openBlock','resolveSniperBattle','skipNextActiveOppRest','restOrRetireOppFrontByLife','restSilenceOppFrontIfOwnOutsideField','resolveAttackEndSwap','phaseOrder','effectMoveOrder','restSelfTuckMovedFaceDown','sourceResolutionBoundary','lifeBatchStep','lifeRelease','advanceAfterAttack','additionalBattleDamage','openRetirementBatch','closeRetirementBatch','retirementOrder','battleImpactDamage','discardOppHand','activeSelfIf'].includes(e.op)))
  throw Error('Invalid queued effects');
 for(const j of s.effectQueue.filter(e=>e.op==='resolveSniperBattle')){
  const source=s.players[j.owner]?.front.find(c=>c?.uid===j.sourceUid);
  const target=s.players[1-j.owner]?.front.find(c=>c?.uid===j.targetUid);
  if(j.owner!==s.active||s.phase!=='attack'||!source||!target||
   !hasCurrentBattleGrant(s,source,'sniperGranted')||
   source.fieldEntryStamp!==j.sourceStamp||target.fieldEntryStamp!==j.targetStamp||
   !(s.attacksByUid[j.sourceUid]>=1)||Object.keys(j).length!==6||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp','targetUid','targetStamp'].includes(k)))
   throw Error('Forged queued sniper battle');
 }
 for(const j of s.effectQueue.filter(e=>e.op==='resolveAttackEndSwap')){
  const pl=s.players[j.owner];
  const src=[...field(pl),...pl.hand,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...pl.outside,...pl.removed].find(c=>c.uid===j.sourceUid);
  if(j.owner!==s.active||s.phase!=='attack'||!src||
   !(card(pack,src).attackEndSwap||
    card(pack,src).effects.onPlay?.some(e=>e.op==='chooseOne'&&e.entry==='ownEffect'&&
     e.options.some(o=>o.then.some(t=>t.op==='grantSelfAttackEndSwapThisTurn'))))||
   !Number.isInteger(j.sourceStamp)||
   j.sourceStamp<1||!(s.attacksByUid[j.sourceUid]>=1)||
   Object.keys(j).length!==4||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp'].includes(k)))
   throw Error('Invalid earned attack-end swap continuation');
 }
 for(const j of s.effectQueue.filter(e=>e.op==='resolveAttackWinRecovery')){
  if(j.owner!==s.active||s.phase!=='attack'||!Number.isInteger(j.sourceStamp)||
   j.sourceStamp<1||!(s.attacksByUid[j.sourceUid]>=1)||
   !card(pack,{uid:j.sourceUid,cardId:j.sourceCardId}).attackWinRecover||
   Object.keys(j).length!==5||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp','sourceCardId'].includes(k)))
   throw Error('Forged queued attacking-win outside recovery');
 }
 // A saved phase-end retirement can only come from a printed source
 // during its real original attack-end window (never normal MAIN/ATTACK).
 const queuedRetires=[
  ...s.effectQueue.flatMap(x=>x.op==='phaseOrder'?
   x.entries.flatMap(y=>y.jobs):[x]),
  ...(s.pending?.kind==='phase-order'?
   s.pending.entries.flatMap(y=>y.jobs):[])
 ].filter(x=>x.op==='retireSourceOnPhaseEnd');
 if(queuedRetires.length&&(s.phase!=='attack'||
  !s.effectQueue.some(x=>x.op==='advanceAfterAttack'&&x.owner===s.active)))
  throw Error('Unproven queued attack-end retirement window');
 for(const j of queuedRetires){
  if(!playerIndex(j.owner)||!Number.isInteger(j.sourceStamp)||j.sourceStamp<1||
   typeof j.sourceUid!=='string'||!j.sourceUid.startsWith(j.owner+'-')||
   typeof j.sourceName!=='string'||Object.keys(j).length!==5||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceName','sourceStamp'].includes(k)))
   throw Error('Invalid stamped phase-end retirement job');
  const pl=s.players[j.owner];
  const todo=[...field(pl),...pl.hand,...pl.deck,...pl.life,...pl.lifeRevealed,
   ...pl.outside,...pl.removed];
  let physical=null;
  while(todo.length){
   const c=todo.pop();if(!c)continue;
   if(c.uid===j.sourceUid){physical=c;break;}
   todo.push(...(c.stack||[]),...(c.under||[]));
  }
  const def=physical&&card(pack,physical);
  if(!def||def.name!==j.sourceName||!def.phaseEffects.some(q=>
   q.phase==='attack'&&q.edge==='end'&&q.turn===(j.owner===s.active?'own':'opponent')&&
   q.then.length===1&&q.then[0].op==='retireSourceOnPhaseEnd'))
   throw Error('Unproven printed phase-end retirement source');
  const live=field(pl).find(c=>c.uid===j.sourceUid);
  if(live&&live.fieldEntryStamp!==j.sourceStamp)
   throw Error('Stale phase-end retirement incarnation');
 }
 // Suspended MAIN can hold an earned FRONT grant *after* its mandatory
 // draw/discard decision. Its source/printed operation must still be exact;
 // a forged serialized queue must not become a free permission generator.
 for(const e of s.effectQueue.filter(x=>x.op==='grantFrontEnergyOwnOtherFrontTrait')){
  const pl=s.players[e.owner],physical=pl&&[
   ...field(pl),...pl.outside,...pl.hand,...pl.deck,...pl.life,...pl.lifeRevealed
  ].find(c=>c&&c.uid===e.sourceUid);
  const printed=physical&&card(pack,physical);
  const declared=[
   ...(printed?.effects?.onPlay||[]),...(printed?.mainAbility?.then||[])
  ].some(x=>x.op==='grantFrontEnergyOwnOtherFrontTrait'&&
   x.trait===e.trait&&x.optional===e.optional&&x.until===e.until);
  if(!declared||e.sourceName!==printed.name||
   Object.keys(e).some(k=>!['op','owner','sourceUid','sourceName','trait',
    'optional','until','entryCause'].includes(k)))
   throw Error('Unproven queued FRONT energy grant');
 }
 // The internal boundary is not user-authored DSL. Reject forged or
 // out-of-range snapshots before replay or an AI simulation can resolve it.
 if(s.effectQueue.some(e=>e.op==='completeResolvingEvent'&&(
  ![0,1].includes(e.owner)||typeof e.sourceUid!=='string'||
  !e.sourceUid.startsWith(e.owner+'-')||
  !s.players[e.owner].resolvingEvents.some(c=>c.uid===e.sourceUid)||
  Object.keys(e).some(k=>!['op','owner','sourceUid'].includes(k)))))
  throw Error('Invalid queued EVENT completion');
 if(s.pending?.kind==='effect-named-outside-bounce-retire'){
  const q=s.pending,src=s.players[q.player].resolvingEvents.find(c=>c.uid===q.sourceUid);
  const declared=src&&card(pack,src).effects?.onPlay?.find(e=>
   e.op==='conditionalBounceOrRetireByOwnOutsideNames');
  if(!declared||declared.bp!==q.bp||declared.min!==q.min||
   JSON.stringify(declared.names)!==JSON.stringify(q.names)||
   !Array.isArray(q.choices)||!q.choices.length||
   new Set(q.choices).size!==q.choices.length||
   q.choices.some(uid=>!s.players[1-q.player].front.some(c=>c?.uid===uid&&
     bp(pack,s,c)<=q.bp))||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','bp','min','names'].includes(k)))
   throw Error('Invalid restored conditional EVENT pending');
 }
 if(s.effectQueue.some(e=>e.op==='sourceResolutionBoundary'&&(
  !Number.isInteger(e.afterOrder)||e.afterOrder<0||
  e.afterOrder>=s.nextZoneMoveOrder||
  typeof e.sourceUid!=='string'||!e.sourceUid.startsWith(e.owner+'-')||
  Object.keys(e).some(k=>!['op','owner','sourceUid','afterOrder'].includes(k)))))
  throw Error('Invalid source-resolution boundary');
 for(let p=0;p<2;p++){
  const pl=s.players[p],uids=new Set(),items=[];
  if(pl.front?.length!==4||pl.energy?.length!==4||!Array.isArray(pl.resolvingEvents)||!Array.isArray(pl.lifeRevealed)||pl.apCards?.length!==3||
    pl.apCards.some(c=>typeof c.ready!=='boolean'||typeof c.inPlay!=='boolean'||(c.ready&&!c.inPlay)))throw Error('Invalid zones or AP cards');
  function visit(c){
   if(!c)return;
   if(typeof c.uid!=='string'||uids.has(c.uid)||!c.uid.startsWith(p+'-')||
     !packs[p].cards[c.cardId])throw Error('Card conservation / wrong title / duplicated UID');
   uids.add(c.uid);items.push(c);
   for(const q of c.stack||[])visit(q);
   for(const q of c.under||[])visit(q);
  }
  for(const zone of ['deck','hand','life','lifeRevealed','outside','resolvingEvents','removed'])
   for(const c of pl[zone]||[])visit(c);
  for(const c of pl.resolvingEvents){
   if(card(pack,c).type!=='event'||!card(pack,c).effects?.onPlay?.some(e=>
    e.op==='conditionalBounceOrRetireByOwnOutsideNames')||
    s.effectQueue.filter(e=>e.op==='completeResolvingEvent'&&e.owner===p&&
     e.sourceUid===c.uid).length!==1)
    throw Error('Forged or orphaned in-flight EVENT');
  }
  for(const c of field(pl))visit(c);
  // Printed source provenance is checked even after JSON restoration.
  // A departed grantor may still have earned a valid temporary keyword;
  // the target's exact field entry incarnation remains mandatory.
  for(const c of items)if(c.otherOwnBattleWinDamage2!==undefined){
   const g=c.otherOwnBattleWinDamage2;
   const winner=items.find(x=>x.uid===g?.winnerUid);
   if(!card(pack,c).otherOwnBattleWonDamageTwo||
    !g||typeof g!=='object'||Array.isArray(g)||
    !Number.isInteger(g.turn)||g.turn<1||g.turn>s.turn||
    !Number.isInteger(g.stamp)||g.stamp<1||
    !Number.isInteger(g.winnerStamp)||g.winnerStamp<1||
    !['attacker','blocker'].includes(g.role)||
    typeof g.winnerUid!=='string'||!g.winnerUid.startsWith(p+'-')||
    !winner||winner.uid===c.uid||
    Object.keys(g).sort().join(',')!=='role,stamp,turn,winnerStamp,winnerUid')
    throw Error('Invalid saved other-own battle-win DAMAGE2 grant');
  }
  for(const e of s.continuousStates.filter(e=>e.kind===DISCOUNT_KIND&&e.controller===p)){
   const source=items.find(c=>c.uid===e.sourceUid);
   if(!source||source.cardId!==e.sourceCardId||!definitionGrantsDiscount(packs[p].cards[source.cardId],e.filter))
    throw Error('Unproven hand discount source');
  }
  if(items.length!==50)throw Error('Card conservation violated ('+items.length+'/50)');
  const counts=Object.create(null);
  for(const c of items)counts[c.cardId]=(counts[c.cardId]||0)+1;
  const expected=s.initialCounts[p];
  if(validateUniversalDeck(packs[p],expected).length)
   throw Error('Invalid original deck signature for player '+p);
  for(const id of new Set([...Object.keys(counts),...Object.keys(expected)]))
   if((counts[id]||0)!==(expected[id]||0))
    throw Error('Printed card ID conservation violated for player '+p+' ('+id+')');
  if(pl.front.some(c=>c&&(card(pack,c).type!=='character'||card(pack,c).frontForbidden)))
   throw Error('Front line must contain only characters');
  if(pl.energy.some(c=>c&&card(pack,c).type==='event'))
   throw Error('Event cannot remain in energy line');
 }
 return true;
}
// Trusted local UI accessor. Only the CURRENT decision owner can inspect
// candidate identities in private deck-search/discard choices. Its action
// payload must be submitted unchanged (do not add display metadata to it).
// This does not replace network authorization in a future multiplayer server.
export function universalPrivateChoices(pack,s,viewer){
 assertUniversalMatch(pack,s);
 if(!playerIndex(viewer))throw Error('Invalid private choice viewer');
 const q=s.pending;
 if((q?.kind==='private-top-place'||q?.kind==='private-top-choice')&&q.player===viewer){
  const top=s.players[viewer].deck[0];
  return {kind:q.kind,player:viewer,options:legalPending(pack,s).map(action=>({
   action:{...action},card:top?
    {cardId:top.cardId,name:card(pack,top).name,color:card(pack,top).color}:null
  }))};
 }
 if(q?.kind==='effect-named-zone-entry'&&q.player===viewer)return {
   kind:q.kind,player:viewer,options:legalPending(pack,s).map(action=>{
    const c=action.uid===null?null:s.players[viewer][action.zone].find(x=>x.uid===action.uid);
    return {action:{...action},card:c?{cardId:c.cardId,name:card(pack,c).name,
     color:card(pack,c).color}:null};
   })};
  if(!q||q.player!==viewer||
  !['effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-order','effect-top-trait-outside','effect-recover-outside','effect-outside-rest','effect-outside-name-rest','effect-outside-traitless-rest','effect-named-zone-entry','effect-hand-rest','effect-bounce-own','effect-discard-cost','effect-discard-gate','effect-selection-hand-payment'].includes(q.kind))
  return null;
 const zone=['effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-order','effect-top-trait-outside'].includes(q.kind)?'deck':
  q.kind==='effect-recover-outside'||q.kind==='effect-outside-rest'||q.kind==='effect-outside-name-rest'||q.kind==='effect-outside-traitless-rest'?'outside':
  q.kind==='effect-bounce-own'?'field':'hand';
 return {kind:q.kind,player:viewer,options:legalPending(pack,s).map(action=>{
  const physical=action.uid===null?null:
   (zone==='field'?field(s.players[viewer]):s.players[viewer][zone])
    .find(c=>c.uid===action.uid);
  const cards=Array.isArray(action.uids)?action.uids.map(uid=>{
   const c=s.players[viewer].hand.find(x=>x.uid===uid);
   return {cardId:c.cardId,name:card(pack,c).name,color:card(pack,c).color};
  }):null;
  return {action:{...action},card:physical?
   {cardId:physical.cardId,name:card(pack,physical).name,color:card(pack,physical).color}:null,
   ...(cards?{cards}:{})};
 })};
}
// Safe, title-agnostic view model for common UI: no opponent hand IDs, hidden
// life identities or private deck order are ever exported to the viewer.
// Q2298: a player can inspect their own facedown under-cards, but an
// opponent receives only a facedown marker, never card IDs or physical UID.
function layerView(cardOnBase,owner,viewer){
 if(cardOnBase.faceDown===true&&owner!==viewer)return {faceDown:true};
 return {
  uid:cardOnBase.uid,cardId:cardOnBase.cardId,faceDown:cardOnBase.faceDown===true,
  stack:(cardOnBase.stack||[]).map(x=>layerView(x,owner,viewer)),
  under:(cardOnBase.under||[]).map(x=>layerView(x,owner,viewer))
 };
}
export function universalPublicView(pack,s,viewer=0){
 assertUniversalMatch(pack,s);
 if(!playerIndex(viewer))throw Error('Invalid viewer');
 return {title:s.title,playerTitles:[...s.packIds],status:s.status,winner:s.winner,phase:s.phase,turn:s.turn,
  active:s.active,actor:actor(s),
  pending:s.pending?{kind:s.pending.kind,player:s.pending.player}:null,
  publicReveals:s.publicReveals.map(x=>({...x})),
  players:s.players.map((pl,p)=>({
   title:s.packIds[p],lifeCount:pl.life.length,deckCount:pl.deck.length,handCount:pl.hand.length,
   hand:p===viewer?pl.hand.map(c=>({uid:c.uid,cardId:c.cardId})):null,
   front:pl.front.map(c=>c?{uid:c.uid,cardId:c.cardId,ready:c.ready,bp:bp(pack,s,c),
    // Front-line energy is public only for a source-verified printed producer.
    // Read the current physical UID; never expose private hand/deck identities.
    ...(card(pack,c).frontGeneratesEnergy&&!originalEffectsDisabled(s,c)?{produces:universalCardEnergy(pack,s,p,c)}:{}),
    restrictions:fieldRestrictions(s,p,c),raidDepth:c.stack?.length||0,raidLayers:(c.stack||[]).map(layer=>layerView(layer,p,viewer)),
    underLayers:(c.under||[]).map(layer=>layerView(layer,p,viewer))}:null),
   energy:pl.energy.map(c=>c?{uid:c.uid,cardId:c.cardId,ready:c.ready,
    baseProduces:card(pack,c).gen,produces:universalCardEnergy(pack,s,p,c),
    restrictions:fieldRestrictions(s,p,c),raidLayers:(c.stack||[]).map(layer=>layerView(layer,p,viewer)),
    underLayers:(c.under||[]).map(layer=>layerView(layer,p,viewer))}:null),
   apReady:pl.apCards.filter(c=>c.ready).length,apTotal:pl.apCards.filter(c=>c.inPlay).length,energyTotal:calcEnergy(pack,s,p),energyByColor:{...universalEnergyByColor(pack,s,p)},
   outside:pl.outside.map(c=>({uid:c.uid,cardId:c.cardId}))
  }))
 };
}
