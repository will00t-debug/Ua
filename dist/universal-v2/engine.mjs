import {DISCOUNT_KIND,grantHandDiscount,handPlayApPlan,definitionGrantsDiscount} from './ap-discounts.mjs';
// UNIVERSAL RULES V2 EXPERIMENT. No production title uses this reducer yet.
// Pure physical-card reducer: common UA zones/AP/phases/limited effects/Raid
// and official Q99 optional GET/DRAW/FINAL. Unsupported keywords FAIL CLOSED.
import {validateUniversalDeck} from './pack.mjs';
import {appendCompletedMove,matchesCompletedMove,V2_MOVE_REASONS} from './zone-move-events.mjs';
import {planSimultaneousLifeReveal} from './life-reveal-batch.mjs';
import {selectionHandDiscardTaxPlan} from './selection-hand-tax.mjs';
import {matchesPrintedRequiredEnergyAtMost} from './ap-discounts.mjs';
import {cardHasName,cardHasTrait,cardCountsAsEvent,matchesOwnDistinctTraits,matchesV2LiveCondition,
 ownRestPrintedBpCount,countOppRestCharacters,retiredThisTurn,countOwnOutsideDistinctPrintedNames,
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
// handEffect / handEffectRaid are effect entries from the controller's hand
// (REST or a legal Raid). They are not the older deployOwnHandRest cause,
// which remains the literal string 'ownEffect' and stays outside this set.
const OWN_EFFECT_ENTRY=new Set(['outsideEffect','outsideEffectRaid','recoveredEffect','handEffect','handEffectRaid','deckEffect','deckEffectRaid']);
// 「自分のキャラの効果で登場」 is narrower than 自分の効果. The latest completed
// move of this physical card onto a field line must be an own effect, and the
// source snapshotted on that move must be one of this player's characters.
// A missing source, a field, an event, a paid play, or a life trigger fails closed.
function enteredByOwnCharacter(pack,s,owner,uid){
 const events=(s.zoneMoveEvents||[]).filter(e=>e.uid===uid&&e.owner===owner&&
  e.controller===owner&&e.reason==='own-effect'&&(e.to==='front'||e.to==='energy'));
 const latest=events.length?events[events.length-1]:null;
 if(!latest||typeof latest.sourceUid!=='string'||typeof latest.sourceCardId!=='string')return false;
 if(Number(String(latest.sourceUid).split('-')[0])!==owner)return false;
 return playerPacks(pack)[owner].cards[latest.sourceCardId]?.type==='character';
}
function matchesBuffTarget(pack,s,physical,spec){
 if(spec.color&&card(pack,physical).color!==spec.color)return false;
 return matchesFilter(pack,s,physical,spec.filter);
}
function matchesHandRestOrRaid(pack,s,physical,spec){
 const d=card(pack,physical);
 if(!(d.type===spec.type&&d.color===spec.color&&d.ap===spec.ap&&
  d.energy<=spec.maxEnergy&&
  (spec.names===null||spec.names.some(n=>
   cardHasName(d,n,originalEffectsDisabled(s,physical))))))return false;
 if(spec.requireAffordableEnergy===true){
  const owner=Number(String(physical.uid).split('-')[0]);
  const need=effectiveHandRequiredEnergy(pack,s,owner,d);
  if(need>(universalEnergyByColor(pack,s,owner)[d.color]||0))return false;
 }
 return true;
}
// 「必要エナジーを満たす」 reads generated color energy against the printed
// cost. Hand-only discounts do not apply to a card that is still in the deck.
// Energy 0 always qualifies. The check spends neither energy nor AP.
function revealedDeckPlayable(pack,s,owner,physical,names){
 const d=card(pack,physical);
 if(d.type!=='character')return false;
 if(!names.some(n=>cardHasName(d,n,originalEffectsDisabled(s,physical))))return false;
 return d.energy<=(universalEnergyByColor(pack,s,owner)[d.color]||0);
}
function publishDeckTop(pack,s,owner,physical){
 s.publicReveals.push({kind:'deck-top',owner,title:titleOf(pack,owner),
  cardId:physical.cardId,uid:physical.uid,trigger:card(pack,physical).trigger||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
}
function handRestOrRaidContinuation(q){
 return {op:'deployOwnHandRestOrRaid',owner:q.player,sourceUid:q.sourceUid,
  sourceName:q.sourceName,type:q.type,color:q.color,ap:q.ap,
  maxEnergy:q.maxEnergy,names:q.names===null?null:[...q.names],
  max:q.max-1,optional:true,
  ...(q.requireAffordableEnergy===true?{requireAffordableEnergy:true}:{})};
}
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
// Printed energy and color, not current BP. Silence drops aliases and keeps
// the original name. Front and energy are the field; a buried Raid layer is not.
function scaledFrontCeiling(pack,s,owner,profile){
 const count=field(s.players[owner]).filter(c=>{
  const d=card(pack,c);
  return d.type==='character'&&d.color===profile.color&&d.energy===profile.energy&&
   cardHasName(d,profile.name,originalEffectsDisabled(s,c));
 }).length;
 return profile.base+profile.step*count;
}
export const universalEnergy=calcEnergy;
const bpVisit=new Set();
function bp(pack,s,c){
 const printed=card(pack,c),suppressed=originalEffectsDisabled(s,c);
 const owner=Number(String(c.uid).split('-')[0]);
 const turnBp=suppressed?0:s.active===owner?(printed.ownTurnBp||0):(printed.opponentTurnBp||0);
 const facedown=!suppressed&&hasFacedownUnder(c)?(printed.conditionalUnderFaceDown?.bp||0):0;
 const immune=!suppressed&&printed.bpDownImmune===true;
 const buffs=(c.buffs||[]).filter(b=>b.untilTurn===s.turn||
  Number.isInteger(b.untilOwnTurnStart)&&
  s.players[owner].ownTurns<b.untilOwnTurnStart).reduce((n,b)=>{
  const delta=b.bp||0;
  return immune&&delta<0?n:n+delta;
 },0);
 // A current-BP condition may look back at this card. Stop there instead of
 // walking the same passive again. Printed BP, turn BP, and this-turn buffs
 // stay visible. Q749 still sees an effect bonus on the card being measured.
 if(bpVisit.has(c.uid))return (printed?.bp||0)+turnBp+facedown+buffs;
 bpVisit.add(c.uid);
 try{
  return (printed?.bp||0)+turnBp+facedown+buffs+
   (suppressed?0:printed.passiveBonuses.reduce((n,p)=>{
    const delta=p.bpEach?p.bpEach*(p.condition.kind==='oppRestCharacterCount'?
    countOppRestCharacters(s,owner,p.condition,x=>card(pack,x)):
    ownRestPrintedBpCount(s,owner,c.uid,p.condition,x=>card(pack,x))):
    (p.bp&&matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
     ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x))?p.bp:0);
    return immune&&delta<0?n:n+delta;
   },0));
 }finally{bpVisit.delete(c.uid);}
}
export const universalBp=bp;
function earnedAttackDamage(s,c){
 const g=c?.attackDamageGranted;
 return g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp&&g.amount===2?2:1;
}
export function universalAttackDamage(pack,s,c){
 const d=card(pack,c),owner=Number(String(c.uid).split('-')[0]);
 if(d.type!=='character')return 1;
 // An already-resolved this-turn grant survives later loss of original text.
 const earned=earnedAttackDamage(s,c);
 if(originalEffectsDisabled(s,c))return earned;
 // A resolved BLOCK battle win by ANOTHER own physical character is a
 // temporary replacement keyword. It does not invent Impact or extra LIFE.
 const gained=c.otherOwnBattleWinDamage2;
 // 【ダメージ（2）】 replaces the 1 direct-attack damage. It is not Impact.
 const base=Math.max(d.printedAttackDamage||1,earned,
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
export function handRevealIdentity(printed){
 if(printed?.handRevealCharacterBp===4000)return {type:'character',bp:4000};
 return {type:printed?.type,bp:printed?.bp};
}
// Event flag and each front character that prints the optional +1000 stack
// as one total. Energy-line copies and silenced copies do not contribute.
export function handCharacterBpMayAmount(pack,s,player){
 const pl=s.players[player];
 const flag=pl.handCharacterBpMay;
 const fromEvent=flag&&flag.turn===s.turn&&flag.amount===1000&&
  typeof flag.sourceUid==='string'&&Object.keys(flag).length===3?1000:0;
 const fronts=pl.front.filter(c=>c&&!originalEffectsDisabled(s,c)&&
  card(pack,c).handBpMayWhileFront===1000).length;
 return fromEvent+fronts*1000;
}
function ownFieldNamedCharacter(pack,s,owner,name){
 return field(s.players[owner]).some(c=>card(pack,c).type==='character'&&
  cardHasName(card(pack,c),name,originalEffectsDisabled(s,c)));
}
function outsideEventCount(pack,s,owner,exceptUid=null){
 return s.players[owner].outside.filter(c=>c.uid!==exceptUid&&
  cardCountsAsEvent(card(pack,c))).length;
}
function publishHandToBottom(pack,s,owner,physical){
 const printed=card(pack,physical);
 s.publicReveals.push({kind:'hand-to-bottom',owner,title:titleOf(pack,owner),
  cardId:physical.cardId,uid:physical.uid,trigger:printed.trigger||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
}
function outsideReferencedMatches(pack,s,owner,spec,ceiling){
 return s.players[owner].outside.filter(c=>{
  const d=card(pack,c);
  return d.type==='character'&&d.color===spec.color&&d.ap===spec.ap&&
   !cardHasName(d,spec.excludeName,originalEffectsDisabled(s,c))&&
   Number.isInteger(d.bp)&&d.bp<=ceiling;
 }).map(c=>c.uid);
}
function frontReferencedRetire(pack,s,owner,ceiling,sourceUid){
 return s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=ceiling&&
  cardEffectTargetPayable(pack,s,owner,c.uid,0,sourceUid)).map(c=>c.uid);
}
function idSetsDiffer(a,b){return !same([...a].sort(),[...b].sort());}
function impactPlusAmount(s,c){
 const p=c?.impactPlus;
 return p&&p.turn===s.turn&&p.stamp===c.fieldEntryStamp&&p.amount===1?1:0;
}
function impactGrantAmount(s,c){
 const g=c?.impactGranted;
 if(!g||g.amount!==1||g.stamp!==c.fieldEntryStamp)return 0;
 if(g.turn===s.turn&&Object.keys(g).length===3)return 1;
 const owner=Number(String(c.uid).split('-')[0]);
 if(g.turn===undefined&&Number.isInteger(g.untilOwnTurnStart)&&
  g.untilOwnTurnStart>s.players[owner].ownTurns&&typeof g.sourceUid==='string'&&
  Object.keys(g).length===4)return 1;
 return 0;
}
function impactOnBattleWin(pack,s,c){
 const d=card(pack,c);
 const earned=impactGrantAmount(s,c);
 if(originalEffectsDisabled(s,c))return earned;
 // 【インパクト（+1）】 adds one hit. Silence drops the plus and keeps only
 // an already-earned grant. It does not replace a printed impact of 1.
 const plus=impactPlusAmount(s,c);
 if(d.printedImpact)return Math.max(d.printedImpact,earned)+plus;
 if(d.conditionalImpactBpAtLeast!==null&&
  bp(pack,s,c)>=d.conditionalImpactBpAtLeast)return Math.max(1,earned)+plus;
 const under=hasFacedownUnder(c)?(d.conditionalUnderFaceDown?.impact||0):0;
 if(under)return Math.max(under,earned)+plus;
 const owner=Number(String(c.uid).split('-')[0]);
 return Math.max(earned,d.passiveBonuses.reduce((n,p)=>n+(p.impact&&
  matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
   ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x))?p.impact:0),0))+plus;
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
 if(filter.field==='traitlessCharacter')return filter.value===true&&
  printed.type==='character'&&!(printed.traits||[]).length;
 if(filter.field==='printedRequiredEnergyAtMost')return matchesPrintedRequiredEnergyAtMost(printed,filter.value);
 if(filter.field==='printedApAtLeast')return printed.ap>=filter.value;
 if(filter.field==='colorAndType'){
  const [color,type]=String(filter.value).split(':');
  return printed.color===color&&printed.type===type;
 }
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
// 「自分の効果でアクティブからレスト」. Attack, block, and a rested entry
// are rules, not this ledger. The note is the physical field incarnation.
function noteOwnEffectRest(s,owner,card){
 if(!card||card.ready!==true||!Number.isInteger(card.fieldEntryStamp)||card.fieldEntryStamp<1)return;
 s.ownEffectRests[owner].push({uid:card.uid,stamp:card.fieldEntryStamp,turn:s.turn});
}
function restedByOwnEffectThisTurn(s,owner,card){
 return !!card&&s.ownEffectRests[owner].some(n=>
  n.uid===card.uid&&n.stamp===card.fieldEntryStamp&&n.turn===s.turn);
}
function startTurn(pack,s){
 const p=s.active,pl=s.players[p];
 pl.ownTurns++;s.turn++;s.phase='start';s.extraDrawn=false;s.moved=false;s.movedUids=[];s.pending=null;s.attacksThisTurn=0;
 s.attacksByUid={};s.blocksByUid={};
 s.endRefreshed=false;
 expireContinuousStates(s,{player:p,phase:'start',edge:'start'});
 s.raidedThisTurn=[false,false];s.mainAbilityUsedUids=[];s.mainReadyOnceByName=[[],[]];
 s.onceEffectUses=[[],[]];
 s.effectApPaidColors=[[],[]];s.handZeroApUses=[];
 // A NEW turn resets both players' previous turn-scoped movement history.
 s.turnEffectZoneMoves=[{handToOutside:false,outsideToHand:false},
  {handToOutside:false,outsideToHand:false}];
 s.ownEffectRests=[[],[]];
 for(const side of s.players){
  side.nextNamedHandEnergy=[];
  side.handCharacterBpMay=null;
 }
 s.turnRetireEvents=[]; // Turn boundary clears history for both controllers.
 s.zoneMoveEvents=[]; // Per-turn internal provenance; ordinal monotonic across turns.
 for(const side of s.players)for(const unit of field(side)){
  delete unit.blockFloorGranted;delete unit.blockAtLeastGranted;delete unit.readyOnAttackGranted;
  const lastingImpact=unit.impactGranted&&Number.isInteger(unit.impactGranted.untilOwnTurnStart)&&
   unit.impactGranted.untilOwnTurnStart>side.ownTurns;
  if(!lastingImpact)delete unit.impactGranted;
  const lastingBounce=unit.bounceInsteadGranted&&
   Number.isInteger(unit.bounceInsteadGranted.untilOwnTurnStart)&&
   unit.bounceInsteadGranted.untilOwnTurnStart>side.ownTurns;
  if(!lastingBounce)delete unit.bounceInsteadGranted;
  delete unit.impactPlus;
  delete unit.energyMoveOnAttackGranted;delete unit.triggerUnchosenGranted;
  if(unit.attackDamageGranted&&unit.attackDamageGranted.turn!==s.turn)
   delete unit.attackDamageGranted;
 }
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
       sourceUid:event.uid,sourceName:moved.name,
       ...(['grantCauseBlockAtMost','handBottomGrantDoubleAttack','payApDeployMovedActive'].includes(op.op)
        ?{causeUid:event.sourceUid}:{})})));
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
  }else if(job.op==='battleImpactDamage')
   applyImpactHits(pack,s,job.defender,job.amount);
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
    o.entry!=='ownEffect'||OWN_EFFECT_ENTRY.has(job.entryCause)
   )&&(
    o.turn==='any'||o.turn==='own'&&s.active===owner||
    o.turn==='opponent'&&s.active!==owner
   )&&o.then.every(child=>{
    if(child.op==='oncePerTurnGate'){
     const key=child.scope==='name'?'name:'+job.sourceName:'uid:'+job.sourceUid;
     if(s.onceEffectUses[owner].includes(key))return false;
    }
    if(child.op==='buffOwnField'&&!child.optional)
     return field(pl).some(c=>card(pack,c).type==='character'&&
      (!child.excludeSelf||c.uid!==job.sourceUid)&&matchesBuffTarget(pack,s,c,child));
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
   if(job.entry!==undefined&&job.entry!=='ownEffect'&&job.entry!=='ownCharacter')
    throw Error('Invalid draw entry gate');
   const characterEntry=job.entry==='ownCharacter'&&
    enteredByOwnCharacter(pack,s,owner,job.sourceUid);
   const gated=job.entry==='ownEffect';
   if(characterEntry||!job.entry||gated&&OWN_EFFECT_ENTRY.has(job.entryCause))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
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
   // A printed 〈A〉か〈B〉 is one union. Never count hand, deck, opponent
   // field, or hidden Raid under-cards.
   const names=job.names||[job.name];
   if(field(pl).some(c=>names.some(n=>cardHasName(card(pack,c),n,originalEffectsDisabled(s,c)))))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOwnEventUsed'){
   // 「このターン中に自分がイベントカードを使用している」 has no 自分のターン
   // icon. The ledger is the same successful event play used by turn bonuses.
   const q={kind:'ownEventUsedThisTurn',turn:'any'};
   if(matchesV2LiveCondition(s,owner,job.sourceUid,q,c=>card(pack,c)))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOppRestCharacter'){
   const q={kind:'oppRestCharacter',turn:'any',zone:'field'};
   if(matchesV2LiveCondition(s,owner,job.sourceUid,q,x=>card(pack,x)))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOppCharacterBpAtLeast'){
   // Q749: the threshold reads current BP, including a bonus already on
   // the opposing character. Printed BP alone does not open the draw.
   const q={kind:'oppCharacterBpAtLeast',turn:'any',zone:'field',minBp:job.minBp};
   if(matchesV2LiveCondition(s,owner,job.sourceUid,q,x=>card(pack,x),
    ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x)))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOppFrontBelowPrinted'){
   // 元々のBP is the printed number. Energy-line cards are not the front.
   const q={kind:'oppFrontCurrentBpBelowPrinted',turn:'any'};
   if(matchesV2LiveCondition(s,owner,job.sourceUid,q,x=>card(pack,x),
    ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x)))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOwnNameAndHandFewer'){
   // Compare hand sizes after this character has left the hand. Count every
   // physical hand card. The name check is an own field character.
   const named={kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:job.name};
   const fewer=pl.hand.length<s.players[1-owner].hand.length;
   if(fewer&&matchesV2LiveCondition(s,owner,job.sourceUid,named,x=>card(pack,x)))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='activeOwnNamed'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-active-own-named',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,name:job.name,
    choices,optional:true,max:job.max};
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
   // Missing `require` is the existing unconditional recovery, including the
   // internal count-1 unshift. The event gate uses the same ledger as the
   // event-used draw and is not locked to 自分のターン. The key is not `when`:
   // pack freeze spreads that key as a live-condition object.
   const open=job.require!=='ownEventUsed'||matchesV2LiveCondition(s,owner,job.sourceUid,
    {kind:'ownEventUsedThisTurn',turn:'any'},c=>card(pack,c));
   if(open&&pl.apCards.some(c=>c.inPlay&&!c.ready))
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
     sourceUid:job.sourceUid,uids,selected:[],rest:job.rest,
     ...(job.drawIfOutsideEnergyAtLeast?{drawIfOutsideEnergyAtLeast:job.drawIfOutsideEnergyAtLeast}:{})};
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
   }else if(job.op==='searchTopTraitOrEventAp'){
    const inspected=pl.deck.slice(0,job.count),uids=inspected.map(c=>c.uid);
    if(uids.length){
     const choices=inspected.filter(c=>{
      const d=card(pack,c);
      return cardHasTrait(d,job.trait)||cardCountsAsEvent(d);
     }).map(c=>c.uid);
     s.pending=choices.length?{kind:'effect-top-trait-event',player:owner,
      sourceUid:job.sourceUid,uids,choices,trait:job.trait}:
      {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,
       uids,order:[],rest:'bottom'};
    }
   }else if(job.op==='deployOwnHandRest'||job.op==='deployOwnHandSpecial'){
    // Current hand is recomputed AFTER earlier optional outside recovery.
    // A printed name gate is read now. A miss does not open an empty choice.
    if(job.when&&!matchesV2LiveCondition(s,owner,job.sourceUid,job.when,
     c=>card(pack,c),()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c)))continue;
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
   }else if(job.op==='deployOwnHandNamedRest'){
    const choices=pl.hand.filter(c=>{
     const d=card(pack,c);
     return d.type==='character'&&d.color===job.color&&d.energy<=job.maxEnergy&&d.ap===job.ap&&
      job.names.some(n=>cardHasName(d,n,originalEffectsDisabled(s,c)));
    }).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-hand-named-rest',player:owner,
     sourceUid:job.sourceUid,choices,color:job.color,maxEnergy:job.maxEnergy,
     ap:job.ap,names:[...job.names],optional:true};
   }else if(job.op==='deployOwnHandRestOrRaid'){
    const choices=pl.hand.filter(c=>matchesHandRestOrRaid(pack,s,c,job)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-hand-rest-or-raid',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,
     type:job.type,color:job.color,ap:job.ap,maxEnergy:job.maxEnergy,
     names:job.names===null?null:[...job.names],max:job.max,optional:true,
     ...(job.requireAffordableEnergy===true?{requireAffordableEnergy:true}:{})};
   }else if(job.op==='optionalPayApThen'){
    // 【ターン1】 is spent when the attack trigger is reached, including a
    // decline and a turn with no ready AP. The second attack does not offer it.
    if(job.oncePerAttackTurn===true){
     const key='attack-ap:'+job.sourceUid;
     if(s.onceEffectUses[owner].includes(key))continue;
     s.onceEffectUses[owner].push(key);
    }
    // No ready AP means the printed payment cannot be made. Do not open a
    // choice and do not run the gated program. A printed field condition
    // that misses does not offer the payment. ownTurn is 自分のターン中.
    const ownOk=job.ownTurn!==true||s.active===owner;
    const gate=ownOk&&(!job.when||matchesV2LiveCondition(s,owner,job.sourceUid,job.when,
     c=>card(pack,c),()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c)));
    if(gate&&pl.apCards.some(c=>c.ready))s.pending={kind:'effect-optional-pay-ap',
     player:owner,sourceUid:job.sourceUid,sourceName:job.sourceName,
     ap:job.ap,then:job.then.map(e=>({...e}))};
   }else if(job.op==='revealTopHandOrAffordableNamed'){
    const top=pl.deck[0];
    if(!top)continue;
    publishDeckTop(pack,s,owner,top);
    if(revealedDeckPlayable(pack,s,owner,top,job.names))
     s.pending={kind:'effect-deck-named-play',player:owner,
      sourceUid:job.sourceUid,sourceName:job.sourceName,
      uid:top.uid,names:[...job.names]};
    else moveOwnedLinear(pack,s,{owner,from:'deck',to:'hand',index:0,
     reason:'own-effect',sourceUid:job.sourceUid});
   }else if(job.op==='drawThenPlaceHand'){
    draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
    if(pl.hand.length)s.pending={kind:'effect-place-hand',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName};
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
   }else if(job.op==='deployOutsidePrintedRest'){
    const choices=pl.outside.filter(c=>{
     const d=card(pack,c);
     return d.type==='character'&&d.color===job.color&&d.energy===job.energy&&
      cardHasName(d,job.name,originalEffectsDisabled(s,c));
    }).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-outside-printed-rest',player:owner,
     sourceUid:job.sourceUid,choices,name:job.name,color:job.color,
     energy:job.energy,optional:true};
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
   // ownTurnOnly is the printed 「自分のターン」 condition. A miss does not
   // start the effect, so the shared name or card use stays unspent.
   if(!(job.ownTurnOnly===true&&s.active!==owner)){
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
   }
  }else if(job.op==='discardGate'){
   const gateOpen=!job.when||matchesV2LiveCondition(s,owner,job.sourceUid,job.when,
    c=>card(pack,c),()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c));
   if(gateOpen&&payableHand(pack,s,owner,job.payment).length>=(job.count??1))
     s.pending={kind:'effect-discard-gate',player:owner,
      sourceUid:job.sourceUid,optional:job.optional,then:job.then,
      ...(job.payment?{payment:job.payment}:{}),
      ...(job.count===2?{count:2}:{})};
  }else if(job.op==='removeOutsideThen'){
   const choices=pl.outside.filter(c=>job.cardType==='any'||card(pack,c).type===job.cardType)
    .map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-remove-outside',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,choices,selected:[],
    count:job.count,short:choices.length<job.count,optional:true,
    cardType:job.cardType,then:job.then.map(e=>({...e}))};
  }else if(job.op==='removeAnyOutsideScale'){
   const choices=pl.outside.map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-remove-outside',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,choices,selected:[],
    count:choices.length,short:false,optional:true,cardType:'any',any:true,
    scalePer:job.per,then:[]};
  }else if(job.op==='inspectTopColoredNamesOutside'){
   const uids=pl.deck.slice(0,job.count).map(c=>c.uid);
   if(uids.length){
    const window=pl.deck.slice(0,uids.length);
    const choices=window.filter(c=>{
     const d=card(pack,c);
     return d.type==='character'&&d.color===job.color&&
      job.names.some(n=>cardHasName(d,n));
    }).map(c=>c.uid);
    s.pending=choices.length?{kind:'effect-top-trait-outside',player:owner,
     sourceUid:job.sourceUid,uids,choices,names:[...job.names],color:job.color}:
     {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,
      uids,order:[],rest:'top'};
   }
  }else if(job.op==='drawDiscardIfEffectApPaid'){
   if((s.effectApPaidColors?.[owner]||[]).includes(job.color)&&pl.deck.length)
    s.pending={kind:'effect-may-draw-discard',player:owner,
     sourceUid:job.sourceUid,discardCount:job.discardCount};
  }else if(job.op==='activeSelf'){
   const loc=location(s,owner,job.sourceUid);
   if(loc)attemptFieldActive(s,owner,loc.c);
  }else if(job.op==='restOwnActiveFrontDraw'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const step=printed?.mainAbility?.then?.[0];
   if(!source||printed.mainAbility?.op!=='frontOnceProgram'||
    printed.mainAbility.frontOnly!==true||printed.mainAbility.oncePerTurn!==true||
    step?.op!=='restOwnActiveFrontDraw'||!s.mainAbilityUsedUids.includes(job.sourceUid))
    throw Error('Unproven active front rest draw');
   const choices=pl.front.filter(c=>c?.ready&&card(pack,c).type==='character').map(c=>c.uid);
   if(!choices.length)throw Error('Active front rest lost its mandatory target');
   s.pending={kind:'effect-rest-own-front-draw',player:owner,sourceUid:job.sourceUid,
    sourceStamp:source.fieldEntryStamp,choices};
  }else if(job.op==='deployOwnRaidBaseRest'){
   if(!job.raidBaseUid)continue;
   const source=pl.outside.find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const effect=printed?.effects?.onRetire;
   const retired=(s.turnRetireEvents||[]).some(e=>e.turn===s.turn&&
    e.controller===owner&&e.uid===job.sourceUid&&e.cardType==='character');
   const buried=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&
    e.uid===job.raidBaseUid&&e.from==='raid-under'&&e.to==='outside'&&
    e.reason==='rule'&&e.attachedToUid===job.sourceUid);
   if(!source||printed.type!=='character'||!printed.raidName||!retired||!buried||
    effect?.length!==1||effect[0]?.op!=='deployOwnRaidBaseRest'||effect[0]?.optional!==true)
    throw Error('Unproven raid base rest entry');
   const base=pl.outside.find(c=>c.uid===job.raidBaseUid);
   const definition=base&&card(pack,base);
   if(!base||definition.type!=='character'||definition.raidName)continue;
   s.pending={kind:'effect-raid-base-rest',player:owner,sourceUid:job.sourceUid,
    baseUid:base.uid};
  }else if(job.op==='restOrRetireFrontAtMost'){
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(!choices.length)throw Error('Rest-or-retire front lost its mandatory target');
   const mode=ownFieldHasPrintedName(pack,s,owner,job.retireIfName)?'retire':'rest';
   s.pending={kind:'effect-rest-or-retire',player:owner,sourceUid:job.sourceUid,
    choices,ceiling:job.bp,mode,name:job.retireIfName};
  }else if(job.op==='peekTopOneIfFieldNames'){
   const named=job.names.every(name=>ownFieldHasPrintedName(pack,s,owner,name));
   if(named&&pl.deck.length)s.pending={kind:'private-top-choice',player:owner,
    sourceUid:job.sourceUid};
  }else if(job.op==='grantSelfImpactThisTurn'){
   const loc=location(s,owner,job.sourceUid);
   if(loc&&Number.isInteger(loc.c.fieldEntryStamp))
    loc.c.impactGranted={turn:s.turn,stamp:loc.c.fieldEntryStamp,amount:job.amount};
  }else if(job.op==='grantOwnNameBlockAtLeast'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-grant-block-at-least',player:owner,
    sourceUid:job.sourceUid,choices,name:job.name,bp:job.bp,optional:true};
  }else if(job.op==='grantPrintedBlockAtLeast'){
   const choices=field(pl).filter(c=>{
    const d=card(pack,c);
    return d.type==='character'&&d.color===job.color&&d.energy===job.energy&&
     cardHasName(d,job.name,originalEffectsDisabled(s,c));
   }).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-grant-printed-block',player:owner,
    sourceUid:job.sourceUid,choices,name:job.name,color:job.color,
    energy:job.energy,bp:job.bp,optional:true};
  }else if(job.op==='moveOppFrontToEnergy'){
   const choices=oppFrontMoveChoices(pack,s,owner,job.sourceUid);
   if(choices.length)s.pending={kind:'effect-move-opp-front',player:owner,
    sourceUid:job.sourceUid,choices,optional:true,
    lock:OWN_EFFECT_ENTRY.has(job.entryCause)};
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
  }else if(job.op==='drawDiscardIfEveryOwnCharacterNamed'){
   const named=field(pl).filter(c=>card(pack,c).type==='character');
   const all=named.length>0&&named.every(c=>
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c)));
   if(all){
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
    if(pl.hand.length)s.pending={kind:'effect-discard',player:owner,sourceUid:job.sourceUid};
   }
  }else if(job.op==='retireOppFrontAtLeastBp'){
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)>=job.bp&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(!choices.length){
    if(job.optional===true){/* 1枚まで: paying AP does not invent a target. */}
    else throw Error('At-least front retirement lost its mandatory target');
   }else s.pending={kind:'effect-retire-at-least',player:owner,sourceUid:job.sourceUid,
    choices,floor:job.bp,...(job.optional===true?{optional:true}:{})};
  }else if(job.op==='retireOppFrontAtMostBp'){
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(!choices.length)throw Error('At-most front retirement lost its mandatory target');
   s.pending={kind:'effect-retire-at-most',player:owner,sourceUid:job.sourceUid,
    choices,ceiling:job.bp};
  }else if(job.op==='retireOppFrontScaledBp'){
   const ceiling=scaledFrontCeiling(pack,s,owner,job);
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=ceiling&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-scaled',player:owner,
    sourceUid:job.sourceUid,choices,ceiling,optional:true};
  }else if(job.op==='restOppFrontByOutsideEvents'){
   const events=pl.outside.filter(c=>cardCountsAsEvent(card(pack,c))).length;
   const choices=events<job.min?[]:s.players[1-owner].front.filter(c=>c&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-outside-events',player:owner,
    sourceUid:job.sourceUid,choices,min:job.min,skipMin:job.skipMin,optional:true};
  }else if(job.op==='grantHandCharacterBpMay'){
   const source=pl.outside.find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const program=printed?.effects?.onPlay||[];
   const retired=program.some(e=>e.op==='retireOppFrontAtMostBp'&&e.bp===5000);
   const granted=program.some(e=>e.op==='grantHandCharacterBpMay'&&e.amount===1000);
   const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===owner&&
    e.uid===job.sourceUid&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule');
   if(!source||printed.type!=='event'||!retired||!granted||!moved||job.amount!==1000)
    throw Error('Unproven hand character BP option');
   pl.handCharacterBpMay={turn:s.turn,amount:1000,sourceUid:source.uid};
  }else if(job.op==='retireOppFrontUnderBp'){
   const limit=retireOppFrontLimit(pack,s,owner,job);
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=limit).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,sourceUid:job.sourceUid,choices,limit};
  }else if(job.op==='retireOppFrontTiered'){
   const limit=tierRetireLimit(pack,s,owner,job);
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=limit&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,sourceUid:job.sourceUid,choices,limit};
  }else if(job.op==='discountNextNamedHandEnergy'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const ability=source&&card(pack,source).mainAbility;
   const step=ability?.then?.[0];
   if(!source||!Number.isInteger(source.fieldEntryStamp)||
    !restedByOwnEffectThisTurn(s,owner,source)||
    !s.mainAbilityUsedUids.includes(source.uid)||
    ability?.op!=='frontOnceProgram'||ability.requireOwnEffectRest!==true||
    step?.op!=='discountNextNamedHandEnergy'||step.name!==job.name||
    step.color!==job.color||step.amount!==job.amount)
    throw Error('Unproven next named hand energy');
   pl.nextNamedHandEnergy.push({name:job.name,color:job.color,amount:job.amount,
    turn:s.turn,sourceUid:source.uid,sourceStamp:source.fieldEntryStamp});
  }else if(job.op==='buffNamedImpactDraw'){
   const printed=namedImpactPrint(pack,s,owner,job);
   if(!printed)throw Error('Unproven named impact draw');
   const choices=namedImpactChoices(pack,s,owner,job.name);
   if(!choices.length)throw Error('Named impact draw lost its mandatory target');
   s.pending={kind:'effect-named-impact',player:owner,sourceUid:job.sourceUid,
    choices,name:job.name,bp:job.bp,impactPlus:job.impactPlus,draw:job.draw};
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
  }else if(job.op==='moveOtherAcrossOrRemove'){
   const loc=location(s,owner,job.sourceUid);
   const effect=loc&&(card(pack,loc.c).effects.onPlay||[]).find(e=>e.op==='moveOtherAcrossOrRemove');
   if(!effect||effect.excludeName!==job.excludeName)throw Error('Unproven line move');
   const choices=!originalEffectsDisabled(s,loc.c)?field(pl).filter(c=>c.uid!==job.sourceUid&&
    card(pack,c).type==='character'&&
    !cardHasName(card(pack,c),job.excludeName,originalEffectsDisabled(s,c))).map(c=>c.uid):[];
   if(choices.length)s.pending={kind:'effect-line-move',player:owner,sourceUid:job.sourceUid,
    choices,optional:true,excludeName:job.excludeName};
  }else if(job.op==='raidBaseEnergyThen'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const effect=printed?.effects.onPlay?.find(e=>e.op==='raidBaseEnergyThen'&&e.minEnergy===job.minEnergy);
   const base=source?.stack?.[0];
   if(effect&&source&&!originalEffectsDisabled(s,source)&&base&&
    (card(pack,base).energy||0)>=job.minEnergy)
    s.effectQueue.unshift(...job.then.map(e=>({...e,owner,sourceUid:job.sourceUid,sourceName:job.sourceName})));
  }else if(job.op==='grantSelfAttackDamageThisTurn'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const earned=printed?.effects.onPlay?.some(e=>e.op==='raidBaseEnergyThen'&&
    e.then.some(x=>x.op==='grantSelfAttackDamageThisTurn'&&x.amount===job.amount))||
    printed?.mainAbility?.op==='oncePayProgram'&&
    printed.mainAbility.then.some(e=>e.op==='grantSelfAttackDamageThisTurn'&&e.amount===job.amount);
   if(!source||!earned||!Number.isInteger(source.fieldEntryStamp))
    throw Error('Unproven this-turn attack damage');
   source.attackDamageGranted={turn:s.turn,stamp:source.fieldEntryStamp,amount:2};
  }else if(job.op==='restOppFrontLockActive'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const effect=printed?.effects.onPlay?.find(e=>e.op==='restOppFrontLockActive');
   if(!effect||JSON.stringify(effect.upgrade)!==JSON.stringify(job.upgrade))
    throw Error('Unproven front rest lock');
   const foe=1-owner;
   const choices=s.players[foe].front.filter(c=>c&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length&&source&&!originalEffectsDisabled(s,source))
    s.pending={kind:'effect-rest-lock',player:owner,sourceUid:job.sourceUid,
     choices,optional:true,upgrade:{...job.upgrade}};
  }else if(job.op==='restOppFrontOne'){
   if(job.entry==='ownCharacter'&&!enteredByOwnCharacter(pack,s,owner,job.sourceUid))continue;
   if(job.entry!==undefined&&job.entry!=='ownCharacter')throw Error('Invalid REST entry gate');
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
    matchesBuffTarget(pack,s,c,job)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-buff-own',player:owner,
    sourceUid:job.sourceUid,choices,filter:job.filter,
    ...(job.color?{color:job.color}:{}),
    bp:job.bp,optional:job.optional,excludeSelf:job.excludeSelf};
  }else if(job.op==='buffEitherOther'){
   // 自分か相手の場の他のキャラ. Both lines count. This card is not 他.
   // A field is not a character. Only the opponent side pays selection tax.
   const ownChoices=field(pl).filter(c=>c.uid!==job.sourceUid&&
    card(pack,c).type==='character').map(c=>c.uid);
   const oppChoices=field(s.players[1-owner]).filter(c=>
    card(pack,c).type==='character'&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   const choices=[...ownChoices,...oppChoices];
   if(choices.length)s.pending={kind:'effect-buff-either',player:owner,
    sourceUid:job.sourceUid,choices,bp:job.bp,optional:true};
  }else if(job.op==='returnPrintedActiveBuff'){
   // 1枚手札に戻してもよい. No legal printed character means no pending
   // and no follow-up. The ACTIVE and BP happen only after a real return.
   const choices=printedFieldTargets(pack,s,owner,job).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-return-printed',player:owner,
    sourceUid:job.sourceUid,choices,name:job.name,color:job.color,
    energy:job.energy,bp:job.bp,optional:true};
  }else if(job.op==='removeNamedOutsideActive'){
   // 1枚リムーブエリアに置いてもよい. No matching outside card means no
   // pending and no ACTIVE. The follow-up happens only after the move.
   const choices=pl.outside.filter(c=>cardHasName(card(pack,c),job.name,
    originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-remove-named',player:owner,
    sourceUid:job.sourceUid,choices,name:job.name,optional:true};
  }else if(job.op==='payHandOrRestForNamed'){
   // 手札を1枚場外に置くか、フロントのアクティブをレストにしてもよい.
   // The named outside card is mandatory after that payment, so neither
   // the payment nor the recovery opens when one side is missing.
   const named=pl.outside.some(c=>cardHasName(card(pack,c),job.name,
    originalEffectsDisabled(s,c)));
   const payable=pl.hand.length>0||pl.front.some(c=>c&&c.ready&&
    card(pack,c).type==='character');
   if(named&&payable)s.pending={kind:'effect-pay-named',player:owner,
    sourceUid:job.sourceUid,name:job.name,optional:true};
  }else if(job.op==='optionalDiscardActiveSelf'){
   // 手札を1枚場外に置いてもよい. Declining leaves this field REST.
   const source=pl.energy.find(c=>c?.uid===job.sourceUid);
   if(source&&card(pack,source).type==='field'&&pl.hand.length)
    s.pending={kind:'effect-discard-active',player:owner,
     sourceUid:job.sourceUid,optional:true};
  }else if(job.op==='optionalHandOutsideActiveIf'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const effect=printed?.effects?.onPlay?.find(e=>e.op==='optionalHandOutsideActiveIf'&&
    e.name===job.name&&e.minEvents===job.minEvents);
   if(effect&&source&&!originalEffectsDisabled(s,source)&&
    Number.isInteger(source.fieldEntryStamp)&&pl.hand.length&&
    ownFieldNamedCharacter(pack,s,owner,job.name)&&
    outsideEventCount(pack,s,owner)>=job.minEvents)
    s.pending={kind:'effect-hand-outside-active',player:owner,sourceUid:job.sourceUid,
     sourceStamp:source.fieldEntryStamp,name:job.name,minEvents:job.minEvents};
  }else if(job.op==='buffNamedImpactDuration'){
   const source=pl.outside.find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const effect=printed?.effects?.onPlay?.find(e=>e.op==='buffNamedImpactDuration'&&
    e.name===job.name&&e.bp===job.bp&&e.impact===1&&e.optional===true&&
    e.otherOutsideEvents===job.otherOutsideEvents);
   if(!effect||printed.type!=='event')throw Error('Unproven named impact duration');
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))&&
    Number.isInteger(c.fieldEntryStamp)&&c.fieldEntryStamp>=1).map(c=>c.uid);
   if(choices.length){
    const longer=outsideEventCount(pack,s,owner,job.sourceUid)>=job.otherOutsideEvents;
    s.pending={kind:'effect-named-duration',player:owner,sourceUid:job.sourceUid,
     choices,name:job.name,bp:job.bp,impact:1,optional:true,longer,
     otherOutsideEvents:job.otherOutsideEvents};
   }
  }else if(job.op==='takeTopHandRestOutside'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
    e.op==='takeTopHandRestOutside'&&e.count===job.count);
   if(!effect||card(pack,source).type!=='character')throw Error('Unproven top take');
   const window=pl.deck.slice(0,job.count);
   if(!window.length)continue;
   if(window.length===1){
    moveOwnedLinear(pack,s,{owner,from:'deck',to:'hand',index:0,
     reason:'own-effect',sourceUid:job.sourceUid});
    continue;
   }
   s.pending={kind:'effect-top-take-one',player:owner,sourceUid:job.sourceUid,
    uids:window.map(c=>c.uid)};
  }else if(job.op==='buffEitherField'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const step=printed?.mainAbility?.then?.[0];
   if(!source||printed.mainAbility?.op!=='frontOnceProgram'||
    printed.mainAbility.frontOnly!==true||printed.mainAbility.oncePerTurn!==true||
    step?.op!=='buffEitherField'||step.bp!==job.bp||step.optional!==true||
    !s.mainAbilityUsedUids.includes(job.sourceUid)||
    !pl.front.some(c=>c?.uid===job.sourceUid))
    throw Error('Unproven either-field buff');
   const ownChoices=field(pl).filter(c=>card(pack,c).type==='character').map(c=>c.uid);
   const oppChoices=field(s.players[1-owner]).filter(c=>
    card(pack,c).type==='character'&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   s.pending={kind:'effect-buff-either',player:owner,sourceUid:job.sourceUid,
    choices:[...ownChoices,...oppChoices],bp:job.bp,optional:true,includeSelf:true};
  }else if(job.op==='revealHandBottomOutsideCharacter'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   const printed=source&&card(pack,source);
   const effect=printed?.effects?.onPlay?.find(e=>e.op==='revealHandBottomOutsideCharacter'&&
    e.optional===true&&e.excludeName===job.excludeName&&e.color===job.color&&e.ap===job.ap);
   if(effect&&source&&Number.isInteger(source.fieldEntryStamp)&&pl.hand.length)
    s.pending={kind:'effect-reveal-optional',player:owner,sourceUid:job.sourceUid,
     sourceStamp:source.fieldEntryStamp,choices:pl.hand.map(c=>c.uid),
     excludeName:job.excludeName,color:job.color,ap:job.ap};
  }else if(job.op==='drawHandTop'){
   draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   if(source&&Number.isInteger(source.fieldEntryStamp)&&pl.hand.length)
    s.pending={kind:'effect-hand-top',player:owner,sourceUid:job.sourceUid,
     sourceStamp:source.fieldEntryStamp,choices:pl.hand.map(c=>c.uid)};
  }else if(job.op==='optionalRestFrontRecoverAp'){
   // フロントのアクティブをレストにしてもよい. Energy characters are not
   // front. Skipping does not open the following AP recovery.
   const choices=pl.front.filter(c=>c&&c.ready&&card(pack,c).type==='character').map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-front-ap',player:owner,
    sourceUid:job.sourceUid,choices,optional:true};
  }else if(job.op==='handTopBuffSelf'){
   // 手札を1枚山札の上に置く. Empty hand cannot place, so the follow-up
   // BP does not start. Deck top is index 0; this does not reveal the card.
   const source=pl.front.find(c=>c?.uid===job.sourceUid);
   if(source&&Number.isInteger(source.fieldEntryStamp)&&pl.hand.length)
    s.pending={kind:'effect-hand-top',player:owner,sourceUid:job.sourceUid,
     sourceStamp:source.fieldEntryStamp,choices:pl.hand.map(c=>c.uid),bp:job.bp};
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
    retire(pack,s,job.targetPlayer,'front',slot,
     {by:job.owner===job.targetPlayer?undefined:'opponent'});
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
  }else if(job.op==='resolveUnblockedRest'){
   const src=pl.front.find(c=>c?.uid===job.sourceUid);
   if(src&&src.fieldEntryStamp===job.sourceStamp&&!originalEffectsDisabled(s,src)&&
    card(pack,src).unblockedRestFront===true){
    const choices=s.players[1-owner].front.filter(c=>c&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-unblocked-rest',player:owner,
     sourceUid:src.uid,sourceStamp:src.fieldEntryStamp,choices,optional:true};
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
    !hasCurrentBattleGrant(s,attacker,'sniperGranted')||
    (attacker.sniperGranted.maxBp!==undefined&&
     bp(pack,s,defender)>=attacker.sniperGranted.maxBp))
    throw Error('Unproven physical SNIPER battle');
   if(bp(pack,s,attacker)>=bp(pack,s,defender)){
    grantBattleWinToOtherOwn(pack,s,owner,attacker,'attacker');
    const hasDraw=hasCurrentBattleGrant(s,attacker,'attackWinDrawGranted');
    const defenderSlot=s.players[1-owner].front.findIndex(c=>c?.uid===job.targetUid);
    const hits=impactOnBattleWin(pack,s,attacker);
    const impact=hits>0&&!card(pack,defender).impactNull?impactFlag(hits):false;
    const replacement=retire(pack,s,1-owner,'front',defenderSlot,{postImpact:impact,by:'battle'});
    // An earned draw belongs to the real attacking victor, never direct
    // LIFE. Preserve the existing onRetire-before-followup effect ordering.
    if(hasDraw)s.effectQueue.splice(retirementJobsInserted,0,
     {op:'draw',owner,count:1,sourceUid:attacker.uid});
    queueAttackWinRecovery(pack,s,owner,attacker);
    if(impact&&!replacement)queueImpactAfterRetirement(pack,s,1-owner,impact);
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
  }else if(job.op==='noteEntryTurn'){
   const pos=location(s,owner,job.sourceUid);
   if(pos)pos.c.entryTurn=s.turn;
  }else if(job.op==='grantSelfEnergyMoveOnAttackStart'||job.op==='grantSelfTriggerUnchosen'){
   const pos=location(s,owner,job.sourceUid);
   if(pos&&Number.isInteger(pos.c.fieldEntryStamp)){
    const key=job.op==='grantSelfEnergyMoveOnAttackStart'
     ?'energyMoveOnAttackGranted':'triggerUnchosenGranted';
    pos.c[key]={turn:s.turn,stamp:pos.c.fieldEntryStamp};
   }
  }else if(job.op==='grantCauseBlockAtMost'){
   const cause=location(s,owner,job.causeUid);
   if(cause&&card(pack,cause.c).type==='character'&&cause.c.ready!==undefined){
    if(job.optional!==true)cause.c.blockFloorGranted={turn:s.turn,
     stamp:cause.c.fieldEntryStamp,bp:job.bp,sourceUid:job.sourceUid};
    else s.pending={kind:'effect-grant-cause',player:owner,causeUid:job.causeUid,
     stamp:cause.c.fieldEntryStamp,bp:job.bp,sourceUid:job.sourceUid};
   }
  }else if(job.op==='handBottomGrantDoubleAttack'){
   const cause=location(s,owner,job.causeUid);
   if(cause&&card(pack,cause.c).type==='character'&&pl.hand.length)
    s.pending={kind:'effect-hand-bottom',player:owner,causeUid:job.causeUid,
     stamp:cause.c.fieldEntryStamp,sourceUid:job.sourceUid};
  }else if(job.op==='payApDeployMovedActive'){
   const onceKey='moved-entry:'+job.sourceName;
   const moved=pl.outside.find(c=>c.uid===job.sourceUid);
   const blue=universalEnergyByColor(pack,s,owner).blue||0;
   const traitsOk=field(pl).every(c=>(card(pack,c).traits||[]).every(t=>t===job.exclusiveTrait));
   const room=['front','energy'].some(line=>legalDestinations(pl,line).length);
   if(!s.onceEffectUses[owner].includes(onceKey)&&moved&&blue>=job.minEnergy&&
    traitsOk&&room&&pl.apCards.some(c=>c.ready))
    s.pending={kind:'effect-pay-deploy-self',player:owner,sourceUid:job.sourceUid,
     sourceName:job.sourceName,onceKey,ap:job.ap,exclusiveTrait:job.exclusiveTrait,
     minEnergy:job.minEnergy,energyColor:job.energyColor};
  }else if(job.op==='outsideColorEnergyHandOrRest'){
   const choices=pl.outside.filter(c=>{
    const d=card(pack,c);
    return d.type==='character'&&d.color===job.color&&d.energy<=job.energy&&
     !d.frontForbidden;
   }).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-outside-hand-or-rest',player:owner,
    sourceUid:job.sourceUid,choices,color:job.color,energy:job.energy,optional:true};
  }else if(job.op==='openEnergyMoveGrants'){
   const movers=pl.energy.filter(c=>c&&c.energyMoveOnAttackGranted?.turn===s.turn&&
    c.energyMoveOnAttackGranted.stamp===c.fieldEntryStamp);
   const slots=pl.front.map((c,i)=>c?null:i).filter(i=>i!==null);
   if(movers.length&&slots.length){
    if(movers.length===1&&slots.length===1){
     const unit=movers[0],from=pl.energy.findIndex(c=>c?.uid===unit.uid);
     pl.energy[from]=null;pl.front[slots[0]]=unit;
     recordCompletedMove(pack,s,{physical:unit,owner,from:'energy',to:'front',
      reason:'own-effect',sourceUid:unit.uid});
    }else s.pending={kind:'effect-energy-front',player:owner,
     movers:movers.map(c=>c.uid),slots};
   }
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
  }else if(job.op==='impactIfEveryOwnTraitless'){
   const loc=location(s,owner,job.sourceUid);
   const characters=field(pl).filter(c=>card(pack,c).type==='character');
   const traitless=characters.length>0&&characters.every(c=>{
    const d=card(pack,c);
    return (d.traits||[]).length===0&&!(d.traitComponents||[]).length;
   });
   if(loc&&traitless&&Number.isInteger(loc.c.fieldEntryStamp))
    loc.c.impactGranted={turn:s.turn,stamp:loc.c.fieldEntryStamp,amount:1};
  }else if(job.op==='deployOutsidePrintedActive'){
   const choices=pl.outside.filter(c=>{
    const d=card(pack,c);
    return d.type==='character'&&d.color===job.color&&d.energy===job.energy&&
     cardHasName(d,job.name,originalEffectsDisabled(s,c));
   }).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-outside-printed-active',player:owner,
    sourceUid:job.sourceUid,choices,name:job.name,color:job.color,
    energy:job.energy,optional:true};
  }else if(job.op==='bounceThenAffordableSubaru'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character').map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-bounce-include-self',player:owner,
    sourceUid:job.sourceUid,choices,name:job.name,color:job.color,ap:job.ap,optional:true};
  }else if(job.op==='grantBounceInstead'){
   const source=location(s,owner,job.sourceUid);
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(source&&Number.isInteger(source.c.fieldEntryStamp)&&choices.length&&
    !originalEffectsDisabled(s,source.c))
    s.pending={kind:'effect-grant-bounce-instead',player:owner,sourceUid:job.sourceUid,
     sourceStamp:source.c.fieldEntryStamp,choices,name:job.name,optional:true};
  }else if(job.op==='handOutsideReenterFaceDown'){
   const source=pl.outside.find(c=>c.uid===job.sourceUid);
   const named=field(pl).some(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c)));
   if(source&&job.hadFacedown!==true&&named&&pl.hand.length)
    s.pending={kind:'effect-hand-reenter-under',player:owner,sourceUid:job.sourceUid,
     choices:pl.hand.map(c=>c.uid),name:job.name,optional:true};
  }else throw Error('Unimplemented effect op');
 }
}
function programJobs(pack,s,physical,timing,owner,raidUid,entryCause){
 // Q2220: printed leave triggers are lost before true retirement.
 return (originalEffectsDisabled(s,physical)?[]:card(pack,physical).effects[timing]||[])
  .map(e=>{
   const job={...e,owner,sourceUid:physical.uid,
    sourceName:card(pack,physical).name,...(raidUid?{raidUid}:{}),
    ...(timing==='onPlay'&&entryCause?{entryCause}:{})};
   // Snapshot the face-up raid base before retirement sends it outside.
   if(e.op==='deployOwnRaidBaseRest'&&strippableRaidTop(pack,physical))
    job.raidBaseUid=physical.stack[0].uid;
   // Vacate clears under. The absence has to be known before that reset.
   if(e.op==='handOutsideReenterFaceDown')job.hadFacedown=hasFacedownUnder(physical);
   return job;
  });
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
function printedFieldTargets(pack,s,owner,spec){
 // 必要エナジー and 青 are printed. 場 is the owner's front and energy lines.
 // Hand, deck, outside, the opponent, and a Raid under-card are not 場.
 return field(s.players[owner]).filter(c=>{
  const d=card(pack,c);
  return d.type==='character'&&d.color===spec.color&&d.energy===spec.energy&&
   cardHasName(d,spec.name,originalEffectsDisabled(s,c));
 });
}
function location(s,p,uid){
 for(const line of ['front','energy']){
  const slot=s.players[p][line].findIndex(c=>c?.uid===uid);
  if(slot!==-1)return {line,slot,c:s.players[p][line][slot]};
 }
 return null;
}
function bounceToHand(pack,s,p,uid,sourceUid=uid,{reason='own-effect',controller=p,by,skipReplacement=false}={}){
 const found=location(s,p,uid);if(!found)throw Error('Bounce source not on own field');
 const caused=by==='opponent'||by==='battle'||reason==='opponent-effect';
 if(!skipReplacement&&caused&&raidLeaveOffer(pack,s,p,found.c)){
  s.pending={kind:'effect-raid-leave',player:p,uid,line:found.line,slot:found.slot,
   mode:'bounce',reason,controller,sourceUid,by:by||'opponent',postImpact:false};
  return true;
 }
 const top=found.c,pl=s.players[p];pl[found.line][found.slot]=null;
 // Official Japanese Q62: only the top Raid card returns to hand.
 // All bases and facedown undercards move to OWN outside (not hand/remove).
 const below=c=>[...(c.stack||[]).flatMap(x=>[x,...below(x)]),
  ...(c.under||[]).flatMap(x=>[x,...below(x)])];
 const reset=c=>{
  const next={...c,stack:[],under:[],buffs:[],ready:false,faceDown:false,fieldEntryStamp:null};
  delete next.ownEffectFront;delete next.attackDamageGranted;delete next.impactPlus;return next;
 };
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
 const reset=c=>{
  const next={...c,stack:[],under:[],buffs:[],ready:false,faceDown:false,fieldEntryStamp:null};
  delete next.ownEffectFront;delete next.attackDamageGranted;delete next.impactPlus;return next;
 };
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
function substituteOffers(pack,s,owner,retiring){
 return s.players[owner].front.filter(c=>c&&c.uid!==retiring.uid&&
  !originalEffectsDisabled(s,c)&&card(pack,c).type==='character'&&
  typeof card(pack,c).substituteOppRetire?.name==='string'&&
  cardHasName(card(pack,retiring),card(pack,c).substituteOppRetire.name,
   originalEffectsDisabled(s,retiring)));
}
function liveBounceInstead(s,c){
 const g=c?.bounceInsteadGranted;
 if(!g||originalEffectsDisabled(s,c)||g.stamp!==c.fieldEntryStamp)return false;
 const owner=Number(String(c.uid).split('-')[0]);
 return Number.isInteger(g.untilOwnTurnStart)&&
  g.untilOwnTurnStart>s.players[owner].ownTurns&&typeof g.sourceUid==='string'&&
  Object.keys(g).length===3;
}
function affordablePrintedOutside(pack,s,owner,spec){
 const produced=universalEnergyByColor(pack,s,owner);
 return s.players[owner].outside.filter(c=>{
  const d=card(pack,c);
  return d.type==='character'&&d.color===spec.color&&d.ap===spec.ap&&
   d.energy<=(produced[d.color]||0)&&
   cardHasName(d,spec.name,originalEffectsDisabled(s,c));
 });
}
function programContainsOp(printed,timing,op){
 return (printed?.effects?.[timing]||[]).some(e=>e.op===op||
  (e.op==='chooseOne'&&(e.options||[]).some(o=>(o.then||[]).some(x=>x.op===op)))||
  ((e.then||[]).some(x=>x.op===op)));
}
function raidLeaveOffer(pack,s,p,c){
 if(!c||originalEffectsDisabled(s,c))return false;
 const rule=card(pack,c).raidHandLeaveReplace;
 if(!rule||!strippableRaidTop(pack,c))return false;
 if((card(pack,c.stack[0]).energy||0)<rule.minBaseEnergy)return false;
 return s.players[p].hand.length>0;
}
function retire(pack,s,p,line,slot,{postImpact=false,by,skipReplacement=false}={}){
 const c=s.players[p][line][slot];
 if(!c)throw Error('Cannot retire empty field');
 retirementJobsInserted=0;
 if(!skipReplacement&&protectedLeave(pack,s,c)){
  s.pending={kind:'leave-replacement',player:p,uid:c.uid,line,slot,
   postImpact,destination:'outside'};
  return true;
 }
 // Optional front substitute for a named character leaving by an opponent
 // effect on the opponent's turn. Decline falls through to the other
 // leave offers. Accepting retires the substitute, not this card.
 if(!skipReplacement&&by==='opponent'&&s.active!==p){
  const offers=substituteOffers(pack,s,p,c);
  if(offers.length){
   s.pending={kind:'effect-substitute-retire',player:p,uid:c.uid,line,slot,
    postImpact:impactFlag(postImpact),by,choices:offers.map(x=>x.uid),
    optional:true,name:card(pack,offers[0]).substituteOppRetire.name};
   return true;
  }
 }
 // A granted 「手札に戻す」 replacement is on the leaving card. It is not
 // an opponent bounce, a battle, or a move between front and energy.
 if(!skipReplacement&&by==='opponent'&&liveBounceInstead(s,c)){
  bounceToHand(pack,s,p,c.uid,c.uid,{reason:'opponent-effect',controller:p,
   by:'opponent',skipReplacement:true});
  return false;
 }
 if(!skipReplacement&&(by==='opponent'||by==='battle')&&raidLeaveOffer(pack,s,p,c)){
  s.pending={kind:'effect-raid-leave',player:p,uid:c.uid,line,slot,
   mode:'retire',postImpact:impactFlag(postImpact),by};
  return true;
 }
 queueRetirement(pack,s,p,c,line);
 vacate(pack,s,p,line,slot,'outside');
 recordCompletedMove(pack,s,{physical:c,owner:p,from:line,to:'outside',reason:'retirement'});
 recordTrueRetirement(pack,s,p,c,line);
 return false;
}
// false stays false and 1 stays true so existing leave snapshots compare
// equal. Two or more hits stay a number; collapsing them with !! would
// make a second impact check disappear on a raid-leave delay.
function impactFlag(value){
 if(value===true||value===1)return true;
 if(Number.isInteger(value)&&value>=2)return value;
 return false;
}
function impactHitCount(value){
 // A saved one-hit job has no amount. Only an explicit count above 1
 // adds further life checks; false and zero stay no damage.
 if(value===undefined||value===true||value===1)return 1;
 if(Number.isInteger(value)&&value>1)return value;
 return 0;
}
function applyImpactHits(pack,s,defender,hits){
 const n=impactHitCount(hits);
 if(n<1)return;
 if(n>1)s.effectQueue.unshift({op:'additionalBattleDamage',owner:defender,
  defender,remaining:n-1});
 damage(pack,s,defender);
}
function queueImpactAfterRetirement(pack,s,defender,hits=1){
 // Q74: printed 退場時 finishes before Impact's life check.
 const n=impactHitCount(hits);
 if(n<1)return;
 const job=n>1?{op:'battleImpactDamage',owner:defender,defender,amount:n}:
  {op:'battleImpactDamage',owner:defender,defender};
 if(retirementJobsInserted>0)s.effectQueue.splice(retirementJobsInserted,0,job);
 else applyImpactHits(pack,s,defender,n>1?n:true);
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
function effectMoveTo(pack,s,p,moverUid,destLine,slot,replaceUid,sourceUid){
 const from=location(s,p,moverUid);
 if(!from||from.line===destLine)throw Error('Line move source left its original line');
 if(replaceUid)commitDestination(pack,s,p,destLine,slot,replaceUid);
 else if(s.players[p][destLine][slot])throw Error('Destination occupied');
 const moving=from.c;
 s.players[p][from.line][from.slot]=null;
 s.players[p][destLine][slot]=moving;
 if(destLine==='front'&&card(pack,moving).frontForbidden)moving.ownEffectFront=true;
 else delete moving.ownEffectFront;
 recordCompletedMove(pack,s,{physical:moving,owner:p,from:from.line,to:destLine,
  reason:'own-effect',sourceUid});
}
function stripRaidTopInPlace(pack,s,owner,line,slot,sourceUid){
 const top=s.players[owner][line][slot],base=top?.stack?.[0];
 if(!strippableRaidTop(pack,top))throw Error('RAID top no longer eligible');
 top.stack=[];base.ready=top.ready;base.buffs=[];
 delete base.attackDamageGranted;delete base.ownEffectFront;delete base.impactPlus;
 base.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner][line][slot]=base;
 const departed={...top,ready:false,stack:[],under:[],buffs:[],faceDown:false,fieldEntryStamp:null};
 delete departed.attackDamageGranted;delete departed.ownEffectFront;
 s.players[owner].outside.push(departed);
 recordCompletedMove(pack,s,{physical:top,owner,controller:owner,from:line,to:'outside',
  reason:'raid-strip',sourceUid});
 recordCompletedMove(pack,s,{physical:base,owner,controller:owner,from:'raid-under',to:line,
  reason:'raid-strip',sourceUid});
}
function restAndLockActive(pack,s,owner,sourceUid,targetOwner,target){
 target.ready=false;
 grantContinuousState(s,{kind:'cannotActive',controller:owner,sourceUid,
  targetUid:target.uid,sourceLinked:false,releaseBeforeRefresh:true,
  until:{player:targetOwner,phase:'attack',edge:'end'}});
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
  // A printed 「結束前」 lock must expire before this refresh. Other
  // attack-end prohibitions still cover the refresh itself.
  expireContinuousStates(s,{player:owner,phase:'attack',edge:'end',onlyReleaseBeforeRefresh:true});
  refreshFieldActive(s,owner);
  expireContinuousStates(s,{player:owner,phase:'attack',edge:'end'});
  s.endRefreshed=true;
 }
 if(pl.hand.length>8){s.pending={kind:'end-hand-limit',player:owner};return;}
 s.active=1-owner;
 startTurn(pack,s);
}
function namedFieldImpactChoices(pack,s,owner,sourceUid,names){
 return field(s.players[owner]).filter(c=>c.uid!==sourceUid&&card(pack,c).type==='character'&&
  names.some(n=>cardHasName(card(pack,c),n,originalEffectsDisabled(s,c)))).map(c=>c.uid);
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
   noteOwnEffectRest(s,q.player,watcher.c);
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
 if(q.kind==='effect-grant-cause'){
  if(a.mode==='grant'){
   const cause=location(s,q.player,q.causeUid);
   if(!cause||cause.c.fieldEntryStamp!==q.stamp)
    throw Error('Block floor source left its field entry');
   cause.c.blockFloorGranted={turn:s.turn,stamp:q.stamp,bp:q.bp,sourceUid:q.sourceUid};
  }else if(a.mode!=='skip')throw Error('Invalid block floor choice');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-reveal-bottom'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  const source=field(p).find(c=>c.uid===q.sourceUid);
  if(index<0||!q.choices.includes(a.uid)||!source||source.fieldEntryStamp!==q.sourceStamp)
   throw Error('Reveal-to-bottom lost its hand card or source');
  const physical=p.hand[index];
  const printed=card(pack,physical);
  s.publicReveals.push({kind:'hand-to-bottom',owner:q.player,
   title:titleOf(pack,q.player),cardId:physical.cardId,uid:physical.uid,
   trigger:printed.trigger||null,turn:s.turn});
  if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'deck',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  const shown=handRevealIdentity(printed);
  const bonus=shown.type==='character'&&Number.isInteger(shown.bp)?
   handCharacterBpMayAmount(pack,s,q.player):0;
  const baseMeets=shown.type==='character'&&Number.isInteger(shown.bp)&&shown.bp>=q.minPrintedBp;
  const boostedMeets=bonus>0&&shown.bp+bonus>=q.minPrintedBp;
  if(bonus&&baseMeets!==boostedMeets){
   s.pending={kind:'effect-hand-bp-may',player:q.player,sourceUid:q.sourceUid,
    sourceStamp:q.sourceStamp,revealedUid:physical.uid,minPrintedBp:q.minPrintedBp,
    baseBp:shown.bp,amount:bonus,...(q.impact===1?{impact:1}:{bp:q.bp})};
   return;
  }
  if(baseMeets){
   if(q.impact===1)source.impactGranted={turn:s.turn,stamp:source.fieldEntryStamp,amount:1};
   else{source.buffs??=[];source.buffs.push({bp:q.bp,untilTurn:s.turn});}
  }
  s.pending=null;
  return;
 }
 if(q.kind==='effect-hand-bp-may'){
  if(a.mode!=='accept'&&a.mode!=='decline')throw Error('Invalid hand BP option');
  const source=field(p).find(c=>c.uid===q.sourceUid);
  const revealed=p.deck.find(c=>c.uid===q.revealedUid);
  const shown=revealed&&handRevealIdentity(card(pack,revealed));
  if(!source||source.fieldEntryStamp!==q.sourceStamp||!shown||
   shown.type!=='character'||shown.bp!==q.baseBp)
   throw Error('Hand BP option lost its source or revealed card');
  const used=a.mode==='accept'?q.baseBp+q.amount:q.baseBp;
  if(used>=q.minPrintedBp){
   if(q.impact===1)source.impactGranted={turn:s.turn,stamp:source.fieldEntryStamp,amount:1};
   else{source.buffs??=[];source.buffs.push({bp:q.bp,untilTurn:s.turn});}
  }
  s.pending=null;
  return;
 }
 if(q.kind==='effect-hand-deploy-may'){
  if(a.mode!=='accept'&&a.mode!=='decline')throw Error('Invalid hand deployment option');
  const source=p.hand.find(c=>c.uid===q.sourceUid);
  const shown=source&&handRevealIdentity(card(pack,source));
  if(!source||shown?.type!=='character'||shown.bp!==q.baseBp)
   throw Error('Hand deployment option lost its card');
  if(a.mode==='accept')s.pending={kind:'effect-hand-rest-entry',player:q.player,
   sourceUid:q.sourceUid,minBp:q.minBp};
  else s.pending=null;
  return;
 }
 if(q.kind==='effect-hand-rest-entry'){
  const index=p.hand.findIndex(c=>c.uid===q.sourceUid);
  if(index<0||a.uid!==q.sourceUid||!['front','energy'].includes(a.line))
   throw Error('Hand REST entry lost its card');
  const physical=p.hand[index];
  if(card(pack,physical).type!=='character'||
   (a.line==='front'&&card(pack,physical).frontForbidden))
   throw Error('Hand REST entry is not a legal character');
  commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
  p.hand.splice(index,1);
  physical.ready=false;
  physical.fieldEntryStamp=s.nextFieldEntryStamp++;
  p[a.line][a.slot]=physical;
  recordCompletedMove(pack,s,{physical,owner:q.player,from:'hand',to:a.line,
   reason:'own-effect',sourceUid:physical.uid});
  const others=field(p).filter(c=>c.uid!==physical.uid&&card(pack,c).type==='character')
   .map(c=>c.uid);
  s.pending=others.length?{kind:'effect-active-other',player:q.player,
   sourceUid:physical.uid,sourceStamp:physical.fieldEntryStamp,
   choices:others,optional:true}:null;
  return;
 }
 if(q.kind==='effect-rest-or-retire'){
  const foe=1-q.player;
  const slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
  const target=slot>=0?s.players[foe].front[slot]:null;
  if(!target||!q.choices.includes(a.uid)||bp(pack,s,target)>q.ceiling||
   (q.mode==='retire')!==ownFieldHasPrintedName(pack,s,q.player,q.name))
   throw Error('Illegal rest-or-retire front target');
  s.pending=null;
  if(q.mode==='retire'){
   const paused=retire(pack,s,foe,'front',slot,{by:'opponent'});
   if(!paused)continueEffectQueue(pack,s);
  }else{
   target.ready=false;
   continueEffectQueue(pack,s);
  }
  return;
 }
 if(q.kind==='effect-raid-base-rest'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const index=p.outside.findIndex(c=>c.uid===q.baseUid);
  const physical=index>=0?p.outside[index]:null;
  const definition=physical&&card(pack,physical);
  if(!physical||a.uid!==q.baseUid||definition.type!=='character'||definition.raidName||
   !['front','energy'].includes(a.line)||(a.line==='front'&&definition.frontForbidden))
   throw Error('Illegal raid-base REST entry');
  commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
  p.outside.splice(index,1);
  physical.ready=false;
  physical.fieldEntryStamp=s.nextFieldEntryStamp++;
  p[a.line][a.slot]=physical;
  recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;
  s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect'));
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-rest-own-front-draw'){
  const source=field(p).find(c=>c.uid===q.sourceUid);
  const target=p.front.find(c=>c?.uid===a.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||!target||!target.ready||
   !q.choices.includes(a.uid)||card(pack,target).type!=='character')
   throw Error('Illegal own active front rest');
  noteOwnEffectRest(s,q.player,target);
  target.ready=false;
  draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-active-other'){
  if(a.uid===null&&q.optional===true){s.pending=null;return;}
  const source=field(p).find(c=>c.uid===q.sourceUid);
  const target=field(p).find(c=>c.uid===a.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||!target||target.uid===source.uid||
   !q.choices.includes(a.uid)||card(pack,target).type!=='character')
   throw Error('Illegal other-character ACTIVE');
  s.pending=null;
  attemptFieldActive(s,q.player,target);
  return;
 }
 if(q.kind==='effect-discard-active'){
  const source=p.energy.find(c=>c?.uid===q.sourceUid);
  if(!source||card(pack,source).type!=='field'||
   card(pack,source).effects?.onPlay?.[0]?.op!=='optionalDiscardActiveSelf')
   throw Error('Optional discard active lost its field');
  if(a.uid!==null){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('Optional discard active needs an owned hand card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   attemptFieldActive(s,q.player,source);
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-rest-front-ap'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=p.front.find(c=>c?.uid===a.uid);
  if(!target||!target.ready||!q.choices.includes(a.uid)||
   card(pack,target).type!=='character')
   throw Error('Illegal optional front rest');
  noteOwnEffectRest(s,q.player,target);
  target.ready=false;
  if(p.apCards.some(c=>c.inPlay&&!c.ready))
   s.pending={kind:'effect-recover-ap',player:q.player,sourceUid:q.sourceUid,remaining:1};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-hand-top'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  const loc=location(s,q.player,q.sourceUid);
  const buffing=Number.isInteger(q.bp);
  if(index<0||!q.choices.includes(a.uid)||!loc||loc.c.fieldEntryStamp!==q.sourceStamp||
   (buffing?loc.line!=='front':loc.line!=='energy'))
   throw Error('Hand-to-top lost its hand card or source');
  const physical=p.hand.splice(index,1)[0];
  p.deck.unshift(physical);
  recordCompletedMove(pack,s,{physical,owner:q.player,from:'hand',to:'deck',
   reason:'own-effect',sourceUid:q.sourceUid});
  if(buffing){
   loc.c.buffs??=[];
   loc.c.buffs.push({bp:q.bp,untilTurn:s.turn});
  }
  s.pending=null;continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-hand-bottom'){
  if(a.uid!==null){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   const cause=location(s,q.player,q.causeUid);
   if(index<0||!cause||cause.c.fieldEntryStamp!==q.stamp)
    throw Error('Hand-bottom grant lost its source or card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'deck',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   cause.c.readyOnAttackGranted={turn:s.turn,stamp:q.stamp};
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-pay-deploy-self'){
  if(a.mode==='pay'){
   const blue=universalEnergyByColor(pack,s,q.player).blue||0;
   const traitsOk=field(p).every(c=>(card(pack,c).traits||[]).every(t=>t===q.exclusiveTrait));
   const moved=p.outside.some(c=>c.uid===q.sourceUid);
   if(s.onceEffectUses[q.player].includes(q.onceKey)||blue<q.minEnergy||!traitsOk||
    !moved||!p.apCards.some(c=>c.ready))
    throw Error('Moved active entry can no longer be paid');
   spendAp(p,q.ap);
   noteEffectApPaid(pack,s,q.player,q.sourceUid);
   s.onceEffectUses[q.player].push(q.onceKey);
   s.pending={kind:'effect-deploy-self-active',player:q.player,sourceUid:q.sourceUid};
  }else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-deploy-self-active'){
  const index=p.outside.findIndex(c=>c.uid===q.sourceUid);
  if(index<0||a.uid!==q.sourceUid||!['front','energy'].includes(a.line))
   throw Error('Moved card is no longer available to enter');
  const physical=p.outside[index];
  if(card(pack,physical).type!=='character'||(a.line==='front'&&card(pack,physical).frontForbidden))
   throw Error('Moved active entry is not a legal character');
  commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
  p.outside.splice(index,1);
  physical.ready=true;physical.fieldEntryStamp=s.nextFieldEntryStamp++;
  physical.entryTurn=s.turn;
  p[a.line][a.slot]=physical;
  recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
   reason:'own-effect',sourceUid:physical.uid});
  s.pending=null;
  applyEffects(pack,s,physical,'onPlay',q.player,'outsideEffect');
  return;
 }
 if(q.kind==='effect-outside-hand-or-rest'){
  if(a.mode==='skip'){s.pending=null;continueEffectQueue(pack,s);return;}
  const index=p.outside.findIndex(c=>c.uid===a.uid);
  if(index<0||!q.choices.includes(a.uid))throw Error('Outside entry card is not a printed choice');
  const physical=p.outside[index],d=card(pack,physical);
  if(d.type!=='character'||d.color!==q.color||d.energy>q.energy)
   throw Error('Outside entry no longer matches the printed filter');
  if(a.mode==='hand'){
   p.outside.splice(index,1);p.hand.push(physical);
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:'hand',
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(a.mode!=='rest'||!['front','energy'].includes(a.line)||
   (a.line==='front'&&d.frontForbidden))
   throw Error('Outside rest entry needs a legal line');
  commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
  p.outside.splice(index,1);
  physical.ready=false;physical.fieldEntryStamp=s.nextFieldEntryStamp++;
  physical.entryTurn=s.turn;
  p[a.line][a.slot]=physical;
  recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;
  applyEffects(pack,s,physical,'onPlay',q.player,'outsideEffect');
  return;
 }
 if(q.kind==='effect-recover-under'){
  if(a.uid!==null){
   const index=p.outside.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid))throw Error('Under card is no longer outside');
   const physical=p.outside.splice(index,1)[0];
   physical.faceDown=false;
   p.hand.push(physical);
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:'hand',
    reason:'own-effect',sourceUid:q.sourceUid});
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-energy-front'){
  const from=p.energy.findIndex(c=>c?.uid===a.uid);
  if(from<0||!q.movers.includes(a.uid)||!q.slots.includes(a.slot)||p.front[a.slot])
   throw Error('Energy-line move grant has no empty front slot');
  const unit=p.energy[from];
  if(unit.energyMoveOnAttackGranted?.turn!==s.turn||
   unit.energyMoveOnAttackGranted.stamp!==unit.fieldEntryStamp)
   throw Error('Energy-line move grant expired');
  p.energy[from]=null;p.front[a.slot]=unit;
  recordCompletedMove(pack,s,{physical:unit,owner:q.player,from:'energy',to:'front',
   reason:'own-effect',sourceUid:unit.uid});
  s.pending=null;
  s.effectQueue.unshift({op:'openEnergyMoveGrants',owner:q.player});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-entry-protect'){
  const selected=field(p).find(c=>c.uid===a.uid);
  if(!selected||!q.choices.includes(a.uid)||card(pack,selected).type!=='character')
   throw Error('Entry-turn protection needs an own character');
  grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',controller:q.player,
   sourceUid:q.sourceUid,targetUid:selected.uid,sourceLinked:false,
   selectionScope:'any',until:{player:q.player,phase:'start',edge:'start'}});
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
    if(card(pack,attacker).unblockedRestFront===true&&!originalEffectsDisabled(s,attacker))
     s.effectQueue.push({op:'resolveUnblockedRest',owner:s.active,
      sourceUid:attacker.uid,sourceStamp:attacker.fieldEntryStamp});
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
   const hits=impactOnBattleWin(pack,s,attacker);
   const impact=hits>0&&!card(pack,blocker).impactNull?impactFlag(hits):false;
   const earnedSelfDraw=hasCurrentBattleGrant(s,attacker,'attackWinDrawGranted');
   const replacement=retire(pack,s,q.player,'front',slot,{postImpact:impact,by:'battle'});
   if(earnedSelfDraw)s.effectQueue.splice(retirementJobsInserted,0,
    {op:'draw',owner:s.active,count:1,sourceUid:attacker.uid});
   queueAttackWinRecovery(pack,s,s.active,attacker);
   if(impact&&!replacement)queueImpactAfterRetirement(pack,s,q.player,impact);
  }else{
   // Only strict defender BP > attacker BP earns the defender's victory.
   // The attacker is the character that loses, so it retires now. No life
   // damage is dealt. onRetire, if any, runs before the attack continues.
   grantBattleWinToOtherOwn(pack,s,q.player,blocker,'blocker');
   const attackerSlot=s.players[s.active].front.findIndex(c=>c?.uid===attacker.uid);
   if(attackerSlot<0)throw Error('Attacker left before the lost battle');
   retire(pack,s,s.active,'front',attackerSlot,{by:'battle'});
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
  if(q.postImpact)queueImpactAfterRetirement(pack,s,q.player,q.postImpact);
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
 if(q.kind==='effect-top-trait-event'){
  const window=p.deck.slice(0,q.uids.length);
  if(window.length!==q.uids.length||window.some((c,i)=>c.uid!==q.uids[i]))
   throw Error('Trait or event window changed during private selection');
  let recover=false;
  if(a.uid!==null){
   const chosen=window.find(c=>c.uid===a.uid);
   const printed=chosen&&card(pack,chosen);
   if(!chosen||!q.choices.includes(a.uid)||
    !(cardHasTrait(printed,q.trait)||cardCountsAsEvent(printed)))
    throw Error('Trait or event search needs a legal inspected physical card');
   const i=p.deck.findIndex(c=>c.uid===a.uid);
   if(i<0||i>=q.uids.length)throw Error('Selected physical UID outside top window');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index:i,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.publicReveals.push({kind:'searched-to-hand',owner:q.player,
    title:titleOf(pack,q.player),cardId:chosen.cardId,uid:chosen.uid,
    trigger:null,turn:s.turn});
   if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
   recover=cardHasTrait(printed,q.trait);
  }
  const remaining=q.uids.filter(uid=>uid!==a.uid);
  const restedAp=p.apCards.some(c=>c.inPlay&&!c.ready);
  if(remaining.length)s.pending={kind:'effect-top-order',player:q.player,
   sourceUid:q.sourceUid,uids:remaining,order:[],rest:'bottom',
   ...(recover?{recoverApAfter:true}:{})};
  else if(recover&&restedAp)s.pending={kind:'effect-recover-ap',player:q.player,
   sourceUid:q.sourceUid,remaining:1};
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
  const high=Number.isInteger(q.drawIfOutsideEnergyAtLeast)&&
   moved.some(c=>card(pack,c).energy>=q.drawIfOutsideEnergyAtLeast);
  if(remaining.length){
   p.deck.unshift(...remaining);
   s.pending={kind:'effect-top-order',player:q.player,
    sourceUid:q.sourceUid,uids:remaining.map(c=>c.uid),order:[],rest:q.rest,
    ...(high?{thenDraw:true}:{})};
  }else{
   s.pending=null;
   if(high)draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
   continueEffectQueue(pack,s);
  }
  return;
 }
 if(q.kind==='effect-top-trait-outside'){
  const window=p.deck.slice(0,q.uids.length);
  if(window.length!==q.uids.length||window.some((c,i)=>c.uid!==q.uids[i]))
   throw Error('Trait top window changed during private selection');
  if(a.uid!==null){
   const chosen=window.find(c=>c.uid===a.uid);
   const printed=card(pack,chosen);
   const named=Array.isArray(q.names)&&printed.type==='character'&&
    printed.color===q.color&&q.names.some(n=>cardHasName(printed,n));
   if(!chosen||!q.choices.includes(a.uid)||!(named||cardHasTrait(printed,q.trait)||
     (q.orName&&cardHasName(printed,q.orName))))
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
  noteEffectApPaid(pack,s,q.player,q.sourceUid);
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
   // Draw from under the inspected window, then put the ordered cards back.
   if(q.thenDraw)draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
   if(q.rest==='top')p.deck.unshift(...ordered);
   else p.deck.push(...ordered);
   if(q.discardAfter){
    if(!p.hand.length)throw Error('Mandatory contingent discard has no hand card');
    s.pending={kind:'effect-discard',player:q.player,sourceUid:q.sourceUid};
   }else if(q.recoverApAfter){
    if(p.apCards.some(c=>c.inPlay&&!c.ready))
     s.pending={kind:'effect-recover-ap',player:q.player,sourceUid:q.sourceUid,remaining:1};
    else{s.pending=null;continueEffectQueue(pack,s);}
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
  if(q.kind==='effect-hand-named-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.hand.findIndex(c=>c.uid===a.uid);
   const physical=i>=0?p.hand[i]:null,d=physical&&card(pack,physical);
   if(!physical||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line)||
    d.type!=='character'||d.color!==q.color||d.energy>q.maxEnergy||d.ap!==q.ap||
    !q.names.some(n=>cardHasName(d,n,originalEffectsDisabled(s,physical)))||
    (a.line==='front'&&d.frontForbidden))
    throw Error('Illegal named hand REST');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.hand.splice(i,1);physical.ready=false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'hand',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   applyEffects(pack,s,physical,'onPlay',q.player,'handEffect');
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
  if(q.kind==='effect-optional-pay-ap'){
   if(a.mode==='skip'){s.pending=null;continueEffectQueue(pack,s);return;}
   if(a.mode!=='pay'||q.ap!==1)throw Error('Invalid optional AP payment');
   spendAp(p,1);
   noteEffectApPaid(pack,s,q.player,q.sourceUid);
   s.effectQueue.unshift(...q.then.map(e=>({...e,owner:q.player,
    sourceUid:q.sourceUid,sourceName:q.sourceName})));
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-deck-named-play'){
   const top=p.deck[0],d=top&&card(pack,top);
   if(!top||top.uid!==q.uid||a.uid!==top.uid||
    !revealedDeckPlayable(pack,s,q.player,top,q.names))
    throw Error('Revealed deck card left the top');
   if(a.mode==='hand'){
    moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index:0,
     reason:'own-effect',sourceUid:q.sourceUid});
    s.pending=null;continueEffectQueue(pack,s);return;
   }
   if(a.mode==='raid'){
    const base=location(s,q.player,a.baseUid);
    if(!base||!d.raidName||!validRaidBase(pack,s,q.player,base.c,d)||
     !['front','energy'].includes(a.line))
     throw Error('Invalid base for deck-effect Raid');
    p.deck.shift();
    // Effect raids enter rested, matching the existing hand and outside
    // effect raids. No card-specific FAQ was found that makes レイドさせる active.
    s.pending=null;
    performRaid(pack,s,q.player,top,a.baseUid,a.line,a.slot,a.replaceUid,
     {entryReady:false,entryCause:'deckEffectRaid',entryFrom:'deck',effectSourceUid:q.sourceUid});
    return;
   }
   if(a.mode!=='enter'||!['front','energy'].includes(a.line)||
    (a.line==='front'&&(d.type!=='character'||d.frontForbidden)))
    throw Error('Invalid deck-effect REST line');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.deck.shift();top.ready=false;
   top.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=top;
   recordCompletedMove(pack,s,{physical:top,owner:q.player,from:'deck',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   applyEffects(pack,s,top,'onPlay',q.player,'deckEffect');
   return;
  }
  if(q.kind==='effect-place-hand'){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0||(a.mode!=='deck'&&a.mode!=='outside'))
    throw Error('Hand placement needs an owned hand card');
   const physical=p.hand.splice(index,1)[0];
   if(a.mode==='deck')p.deck.unshift(physical);
   else p.outside.push(physical);
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'hand',
    to:a.mode==='deck'?'deck':'outside',reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-hand-rest-or-raid'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.hand.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid))throw Error('Hand REST/Raid needs an owned hand UID');
   const physical=p.hand[i],d=card(pack,physical);
   if(!matchesHandRestOrRaid(pack,s,physical,q))
    throw Error('Hand REST/Raid printed condition changed');
   if(a.mode==='raid'){
    const base=location(s,q.player,a.baseUid);
    if(!base||!d.raidName||!validRaidBase(pack,s,q.player,base.c,d)||
     !['front','energy'].includes(a.line))throw Error('Invalid base for hand-effect Raid');
    p.hand.splice(i,1);
    if(q.max>1)s.effectQueue.unshift(handRestOrRaidContinuation(q));
    s.pending=null;
    performRaid(pack,s,q.player,physical,a.baseUid,a.line,a.slot,a.replaceUid,
     {entryReady:false,entryCause:'handEffectRaid',entryFrom:'hand',effectSourceUid:q.sourceUid});
    return;
   }
   if(a.mode!=='enter'||!['front','energy'].includes(a.line)||
    (a.line==='front'&&(d.type!=='character'||d.frontForbidden)))
    throw Error('Invalid hand-effect REST line');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.hand.splice(i,1);physical.ready=false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'hand',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   if(q.max>1)s.effectQueue.unshift(handRestOrRaidContinuation(q));
   applyEffects(pack,s,physical,'onPlay',q.player,'handEffect');
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
  if(q.kind==='effect-outside-printed-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.outside.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Outside printed REST needs eligible own UID and line');
   const physical=p.outside[i],d=card(pack,physical);
   if(d.type!=='character'||d.color!==q.color||d.energy!==q.energy||
    !cardHasName(d,q.name,originalEffectsDisabled(s,physical)))
    throw Error('Outside printed REST filters changed');
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
 if(q.kind==='effect-remove-outside'){
  const live=()=>p.outside.filter(c=>q.choices.includes(c.uid)&&
   (q.cardType==='any'||card(pack,c).type===q.cardType));
  const moveOutside=(uids)=>{
   if(new Set(uids).size!==uids.length)throw Error('Outside removal repeated a physical UID');
   for(const uid of uids){
    const index=p.outside.findIndex(c=>c.uid===uid);
    if(index<0)throw Error('Outside removal card left before payment');
    moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'removed',index,
     reason:'payment',sourceUid:q.sourceUid});
   }
  };
  if(a.mode==='skip'){
   if(q.selected.length||!q.optional)throw Error('Outside removal cannot be declined now');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.any&&a.mode==='done'){
   if(!q.selected.length)throw Error('Scaled outside removal needs at least one card');
   const removed=q.selected.length;
   moveOutside(q.selected);
   s.effectQueue.unshift({op:'enemyBpDown',owner:q.player,sourceUid:q.sourceUid,
    sourceName:q.sourceName,bp:q.scalePer*removed,optional:true});
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.any&&a.mode==='pick'){
   if(!q.choices.includes(a.uid)||q.selected.includes(a.uid)||!live().some(c=>c.uid===a.uid))
    throw Error('Illegal outside removal card');
   s.pending={...q,selected:[...q.selected,a.uid]};return;
  }
  if(a.mode==='all'){
   const cards=live();
   if(!q.short||q.selected.length||cards.length!==q.choices.length||cards.length>=q.count)
    throw Error('Short outside removal no longer matches the printed shortage');
   moveOutside(cards.map(c=>c.uid));
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(a.mode!=='pick'||q.short||!q.choices.includes(a.uid)||q.selected.includes(a.uid)||
   !live().some(c=>c.uid===a.uid))
   throw Error('Illegal outside removal card');
  const next=[...q.selected,a.uid];
  if(next.length<q.count){s.pending={...q,selected:next};return;}
  moveOutside(next);
  s.effectQueue.unshift(...q.then.map(e=>({...e,owner:q.player,
   sourceUid:q.sourceUid,sourceName:q.sourceName})));
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
 if(q.kind==='effect-active-own-named'){
  if(a.uid===null){
   if(!q.optional)throw Error('Mandatory named ACTIVE cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||card(pack,target).type!=='character'||
   !cardHasName(card(pack,target),q.name,originalEffectsDisabled(s,target)))
   throw Error('Illegal own named ACTIVE target');
  attemptFieldActive(s,q.player,target);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-grant-block-at-least'){
  if(a.uid===null){
   if(!q.optional)throw Error('Named blocker ceiling cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||!Number.isInteger(target.fieldEntryStamp)||
   !cardHasName(card(pack,target),q.name,originalEffectsDisabled(s,target)))
   throw Error('Illegal blocker-ceiling target');
  target.blockAtLeastGranted={turn:s.turn,stamp:target.fieldEntryStamp,bp:q.bp};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-grant-printed-block'){
  if(a.uid===null){
   if(!q.optional)throw Error('Printed blocker ceiling cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const target=field(p).find(c=>c.uid===a.uid);
  const d=target&&card(pack,target);
  if(!target||!q.choices.includes(a.uid)||!Number.isInteger(target.fieldEntryStamp)||
   d.type!=='character'||d.color!==q.color||d.energy!==q.energy||
   !cardHasName(d,q.name,originalEffectsDisabled(s,target)))
   throw Error('Illegal printed blocker-ceiling target');
  target.blockAtLeastGranted={turn:s.turn,stamp:target.fieldEntryStamp,bp:q.bp};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-move-opp-front'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const foeIndex=1-q.player,foe=s.players[foeIndex];
  const from=foe.front.findIndex(c=>c?.uid===a.uid);
  const dest=legalDestinations(foe,'energy').find(d=>d.slot===a.slot&&
   (d.replaceUid??null)===(a.replaceUid??null));
  if(from<0||!q.choices.includes(a.uid)||!dest||
   !cardEffectTargetPayable(pack,s,q.player,a.uid,0,q.sourceUid))
   throw Error('Opponent front move needs a legal energy destination');
  effectMoveTo(pack,s,foeIndex,a.uid,'energy',a.slot,a.replaceUid,q.sourceUid);
  const moved=foe.energy[a.slot];
  s.pending=null;
  if(q.lock)grantContinuousState(s,{kind:'cannotMove',controller:q.player,
   sourceUid:q.sourceUid,targetUid:moved.uid,sourceLinked:false,
   until:{player:q.player,phase:'start',edge:'start'}});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-unblocked-rest'){
  if(a.uid===null){
   if(!q.optional)throw Error('Unblocked front rest cannot be declined');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const target=s.players[1-q.player].front.find(c=>c?.uid===a.uid);
  if(!target||!q.choices.includes(a.uid))throw Error('Illegal unblocked front rest');
  target.ready=false;
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-energy-swap'){
  const src=location(s,q.player,q.sourceUid),dest=location(s,q.player,a.uid);
  if(!src||src.line!=='energy'||src.c.fieldEntryStamp!==q.sourceStamp||
   !dest||dest.line!=='front'||!q.choices.includes(a.uid)||
   card(pack,dest.c).type!=='character')
   throw Error('Illegal energy-line swap');
  p.energy[src.slot]=dest.c;p.front[dest.slot]=src.c;
  recordCompletedMove(pack,s,{physical:src.c,owner:q.player,from:'energy',to:'front',
   reason:'own-effect',sourceUid:src.c.uid});
  recordCompletedMove(pack,s,{physical:dest.c,owner:q.player,from:'front',to:'energy',
   reason:'own-effect',sourceUid:src.c.uid});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-may-draw-discard'){
  if(a.mode==='draw'){
   if(!p.deck.length)throw Error('Optional draw has no deck card');
   draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
   if(p.hand.length){
    s.pending={kind:'effect-discard',player:q.player,sourceUid:q.sourceUid,
     remaining:Math.min(q.discardCount,p.hand.length)};
    return;
   }
  }else if(a.mode!=='skip')throw Error('Invalid optional draw');
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
   (q.color&&card(pack,target).color!==q.color)||
   card(pack,target).type!=='character'||!matchesFilter(pack,s,target,q.filter))
   throw Error('Illegal own field BP target');
  target.buffs??=[];target.buffs.push({bp:q.bp,untilTurn:s.turn});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-named-impact'){
  const printed=namedImpactPrint(pack,s,q.player,q);
  const target=field(p).find(c=>c.uid===a.uid);
  if(!printed||!target||!q.choices.includes(a.uid)||
   card(pack,target).type!=='character'||
   !cardHasName(card(pack,target),q.name,originalEffectsDisabled(s,target))||
   !Number.isInteger(target.fieldEntryStamp)||target.fieldEntryStamp<1)
   throw Error('Illegal named impact target');
  target.buffs??=[];
  target.buffs.push({bp:q.bp,untilTurn:s.turn});
  target.impactPlus={turn:s.turn,stamp:target.fieldEntryStamp,amount:q.impactPlus};
  draw(pack,s,q.player,q.draw,{reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-buff-either'){
  if(a.uid===null){
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const own=field(p).find(c=>c.uid===a.uid);
  const opp=field(s.players[1-q.player]).find(c=>c.uid===a.uid);
  const target=own||opp;
  if(!target||(q.includeSelf!==true&&target.uid===q.sourceUid)||!q.choices.includes(a.uid)||
   card(pack,target).type!=='character'||
   (opp&&!cardEffectTargetPayable(pack,s,q.player,a.uid,0,q.sourceUid)))
   throw Error('Illegal either-field BP target');
  target.buffs??=[];
  target.buffs.push({bp:q.bp,untilTurn:s.turn});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-return-printed'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=printedFieldTargets(pack,s,q.player,q).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid))throw Error('Illegal printed return target');
  // A hand return is not retirement, so leave replacement and onRetire stay closed.
  bounceToHand(pack,s,q.player,a.uid,q.sourceUid);
  const source=location(s,q.player,q.sourceUid);
  if(source&&source.c.uid!==a.uid){
   attemptFieldActive(s,q.player,source.c);
   source.c.buffs??=[];
   source.c.buffs.push({bp:q.bp,untilTurn:s.turn});
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-remove-named'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const index=p.outside.findIndex(c=>c.uid===a.uid);
  const physical=p.outside[index];
  if(index<0||!q.choices.includes(a.uid)||
   !cardHasName(card(pack,physical),q.name,originalEffectsDisabled(s,physical)))
   throw Error('Illegal named outside removal');
  moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'removed',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  const source=location(s,q.player,q.sourceUid);
  if(source)attemptFieldActive(s,q.player,source.c);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-pay-named'){
  if(a.mode==='skip'){s.pending=null;continueEffectQueue(pack,s);return;}
  if(a.mode==='hand'){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('Illegal hand payment');
   moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   markOwnEffectZoneMove(s,q.player,'hand','outside');
  }else if(a.mode==='rest'){
   const target=p.front.find(c=>c?.uid===a.uid);
   if(!target||target.ready!==true||card(pack,target).type!=='character')
    throw Error('Illegal front rest payment');
   noteOwnEffectRest(s,q.player,target);
   target.ready=false;
  }else throw Error('Illegal named recovery payment');
  const matches=p.outside.filter(c=>cardHasName(card(pack,c),q.name,
   originalEffectsDisabled(s,c)));
  if(!matches.length)throw Error('Named outside card left before the follow-up');
  if(matches.length===1){
   const index=p.outside.findIndex(c=>c.uid===matches[0].uid);
   moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   markOwnEffectZoneMove(s,q.player,'outside','hand');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  s.pending={kind:'effect-add-named',player:q.player,sourceUid:q.sourceUid,
   name:q.name,choices:matches.map(c=>c.uid)};
  return;
 }
 if(q.kind==='effect-add-named'){
  const index=p.outside.findIndex(c=>c.uid===a.uid);
  const physical=p.outside[index];
  if(index<0||!q.choices.includes(a.uid)||
   !cardHasName(card(pack,physical),q.name,originalEffectsDisabled(s,physical)))
   throw Error('Illegal named outside recovery');
  moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'hand',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  markOwnEffectZoneMove(s,q.player,'outside','hand');
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
  noteOwnEffectRest(s,q.player,target);
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
   delete base.impactPlus;
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
  if(retireNow)retire(pack,s,foe,'front',slot,{by:'opponent'});
  else bounceToHand(pack,s,foe,a.uid,q.sourceUid,{
   controller:q.player,reason:'opponent-effect'});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-retire-at-least'){
  if(a.uid===null&&q.optional===true){s.pending=null;continueEffectQueue(pack,s);return;}
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid)||bp(pack,s,s.players[opponent].front[slot])<q.floor)
   throw Error('Illegal minimum-BP retirement target');
  s.pending=null;
  retire(pack,s,opponent,'front',slot,{by:'opponent'});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-retire-at-most'){
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid)||bp(pack,s,s.players[opponent].front[slot])>q.ceiling)
   throw Error('Illegal maximum-BP retirement target');
  s.pending=null;
  retire(pack,s,opponent,'front',slot,{by:'opponent'});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-retire-scaled'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const source=field(p).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='retireOppFrontScaledBp'&&e.optional===true);
  const ceiling=effect&&scaledFrontCeiling(pack,s,q.player,effect);
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  if(!effect||ceiling!==q.ceiling||slot<0||!q.choices.includes(a.uid)||
   bp(pack,s,s.players[opponent].front[slot])>q.ceiling)
   throw Error('Illegal scaled front retirement target');
  s.pending=null;
  if(!retire(pack,s,opponent,'front',slot,{by:'opponent'}))continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-grant-named-impact'){
  const source=p.front.find(c=>c?.uid===q.sourceUid&&c.fieldEntryStamp===q.sourceStamp);
  const ability=source&&card(pack,source).mainAbility;
  if(!source||ability?.op!=='frontOnceGrantImpactNamed'||
   !s.mainAbilityUsedUids.includes(source.uid))
   throw Error('Illegal named impact grant');
  if(a.uid!==null){
   const target=field(p).find(c=>c.uid===a.uid);
   if(!target||target.uid===source.uid||!q.choices.includes(a.uid)||
    !q.names.some(n=>cardHasName(card(pack,target),n,originalEffectsDisabled(s,target))))
    throw Error('Illegal named impact target');
   target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:1};
  }
  s.pending=null;
  continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-rested-retire-impact'){
  const source=p.front.find(c=>c?.uid===q.sourceUid&&c.fieldEntryStamp===q.sourceStamp);
  const ability=source&&card(pack,source).mainAbility;
  if(!source||source.ready!==false||ability?.op!=='restedFrontRetireReadyImpact'||
   ability.bp!==1500||!s.mainAbilityUsedUids.includes(source.uid))
   throw Error('Illegal rested front retirement');
  let slot=-1;
  if(a.uid!==null){
   const foe=1-q.player;
   slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
   if(slot<0||!q.choices.includes(a.uid)||bp(pack,s,s.players[foe].front[slot])>q.ceiling)
    throw Error('Illegal rested front retirement target');
  }
  s.pending=null;
  source.ready=true;
  source.impactGranted={turn:s.turn,stamp:source.fieldEntryStamp,amount:1};
  if(a.uid!==null&&!retire(pack,s,1-q.player,'front',slot,{by:'opponent'}))
   continueEffectQueue(pack,s);
  else if(a.uid===null)continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-rest-outside-events'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const source=field(p).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='restOppFrontByOutsideEvents'&&e.min===4&&e.skipMin===8&&e.optional===true);
  const events=p.outside.filter(c=>cardCountsAsEvent(card(pack,c))).length;
  const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
  if(!effect||slot<0||!q.choices.includes(a.uid))
   throw Error('Illegal outside-event front rest');
  s.pending=null;
  if(events>=effect.min){
   s.players[foe].front[slot].ready=false;
   if(events>=effect.skipMin)grantContinuousState(s,{kind:'skipNextActive',
    controller:q.player,sourceUid:q.sourceUid,targetUid:a.uid});
  }
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-retire-bp'){
  if(a.uid===null&&q.optional){s.pending=null;continueEffectQueue(pack,s);return;}
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid)||bp(pack,s,s.players[opponent].front[slot])>q.limit)
   throw Error('Illegal BP-threshold retirement target');
  s.pending=null;
  retire(pack,s,opponent,'front',slot,{by:'opponent'});
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
  if(bp(pack,s,target)<=0)retire(pack,s,foe,found.line,found.slot,{by:'opponent'});
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
   retire(pack,s,foe,'front',slot,{by:'opponent'});
  }
  else if(a.mode==='colorRetire'&&q.trigger==='color'){
   const slot=s.players[1-q.player].front.findIndex(c=>c?.uid===a.uid);
   const profile=card(pack,p[sourceZone][i]).triggerEffect;
   if(profile.op!=='retireOppFrontUnderBp'||slot<0||
    bp(pack,s,s.players[1-q.player].front[slot])>profile.bp)
    throw Error('Illegal COLOR retirement target');
   retire(pack,s,1-q.player,'front',slot,{by:'opponent'});
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
 if(q.kind==='effect-line-move'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const from=location(s,q.player,a.uid);
  const source=location(s,q.player,q.sourceUid);
  if(!from||!source||!q.choices.includes(a.uid)||from.c.uid===q.sourceUid||
   card(pack,from.c).type!=='character'||
   cardHasName(card(pack,from.c),q.excludeName,originalEffectsDisabled(s,from.c)))
   throw Error('Illegal line-move character');
  const line=from.line==='front'?'energy':'front';
  s.pending={kind:'effect-line-slot',player:q.player,sourceUid:q.sourceUid,
   moverUid:a.uid,line};
  return;
 }
 if(q.kind==='effect-line-slot'){
  const plLine=p[q.line],full=plLine.every(Boolean);
  const occupant=plLine[a.slot];
  if(!Number.isInteger(a.slot)||a.slot<0||a.slot>3||
   (full?occupant?.uid!==a.replaceUid:!!occupant||a.replaceUid!==undefined))
   throw Error('Illegal line-move destination');
  effectMoveTo(pack,s,q.player,q.moverUid,q.line,a.slot,a.replaceUid,q.sourceUid);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-rest-two'){
  const target=p.front.find(c=>c?.uid===a.uid);
  if(!target||!target.ready||!q.choices.includes(a.uid)||q.selected.includes(a.uid)||
   card(pack,target).type!=='character')
   throw Error('Illegal ready front character');
  q.selected.push(a.uid);
  if(q.selected.length<2)return;
  for(const uid of q.selected){
   const rested=p.front.find(c=>c?.uid===uid);
   noteOwnEffectRest(s,q.player,rested);
   rested.ready=false;
  }
  s.pending={kind:'effect-self-front',player:q.player,sourceUid:q.sourceUid};
  return;
 }
 if(q.kind==='effect-self-front'){
  const source=location(s,q.player,q.sourceUid);
  if(!source||source.line!=='energy'||p.front[a.slot]||
   card(pack,source.c).mainAbility?.op!=='restTwoActiveFrontMoveSelf')
   throw Error('Energy-line source cannot enter that front slot');
  effectMoveTo(pack,s,q.player,q.sourceUid,'front',a.slot,undefined,q.sourceUid);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-raid-leave'){
  const loc=location(s,q.player,q.uid);
  if(!loc||loc.line!==q.line||loc.slot!==q.slot||!raidLeaveOffer(pack,s,q.player,loc.c))
   throw Error('Raid leave replacement is no longer available');
  if(a.mode==='decline'){
   s.pending=null;
   if(q.mode==='retire')retire(pack,s,q.player,q.line,q.slot,{postImpact:q.postImpact,by:q.by,skipReplacement:true});
   else bounceToHand(pack,s,q.player,q.uid,q.sourceUid,{reason:q.reason,controller:q.controller,by:q.by,skipReplacement:true});
  }else if(a.mode==='pay'){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('Raid leave payment is not in hand');
   moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,reason:'payment',sourceUid:q.uid});
   stripRaidTopInPlace(pack,s,q.player,q.line,q.slot,q.uid);
   s.pending=null;
  }else throw Error('Invalid raid leave choice');
  if(q.postImpact)queueImpactAfterRetirement(pack,s,q.player,q.postImpact);
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-rest-lock'){
  const source=location(s,q.player,q.sourceUid);
  const printed=source&&card(pack,source.c).effects.onPlay?.find(e=>e.op==='restOppFrontLockActive');
  if(!printed||JSON.stringify(printed.upgrade)!==JSON.stringify(q.upgrade))
   throw Error('Unproven front rest lock choice');
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid)||originalEffectsDisabled(s,source.c))
   throw Error('Illegal front rest lock target');
  restAndLockActive(pack,s,q.player,q.sourceUid,foe,s.players[foe].front[slot]);
  if(matchesV2LiveCondition(s,q.player,q.sourceUid,{
   kind:'ownCardTraitCount',turn:'any',min:q.upgrade.minOthers,zone:'field',
   excludeSelf:true,trait:q.upgrade.trait
  },c=>card(pack,c),()=>0,c=>bp(pack,s,c))){
   for(const energyCard of s.players[foe].energy.filter(c=>c&&card(pack,c).type==='character'&&
    cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)))
    restAndLockActive(pack,s,q.player,q.sourceUid,foe,energyCard);
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-hand-outside-active'){
  const source=field(p).find(c=>c.uid===q.sourceUid);
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||index<0||
   !ownFieldNamedCharacter(pack,s,q.player,q.name)||
   outsideEventCount(pack,s,q.player)<q.minEvents)
   throw Error('Hand outside active lost its condition');
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  attemptFieldActive(s,q.player,source);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-named-duration'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||card(pack,target).type!=='character'||
   !cardHasName(card(pack,target),q.name,originalEffectsDisabled(s,target))||
   !Number.isInteger(target.fieldEntryStamp))
   throw Error('Illegal named duration target');
  target.buffs??=[];
  if(q.longer)target.buffs.push({bp:q.bp,untilOwnTurnStart:p.ownTurns+1,sourceUid:q.sourceUid});
  else target.buffs.push({bp:q.bp,untilTurn:s.turn});
  target.impactGranted=q.longer?
   {stamp:target.fieldEntryStamp,amount:1,untilOwnTurnStart:p.ownTurns+1,sourceUid:q.sourceUid}:
   {turn:s.turn,stamp:target.fieldEntryStamp,amount:1};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-top-take-one'){
  const top=p.deck.slice(0,q.uids.length).map(c=>c.uid);
  const index=p.deck.findIndex(c=>c.uid===a.uid);
  if(!same(top,q.uids)||index<0||index>=q.uids.length)
   throw Error('Top take lost its window');
  moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  for(let n=0;n<q.uids.length-1;n++)
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
    reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-reveal-optional'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  const source=field(p).find(c=>c.uid===q.sourceUid);
  if(index<0||!q.choices.includes(a.uid)||!source||source.fieldEntryStamp!==q.sourceStamp)
   throw Error('Optional reveal lost its hand card or source');
  const physical=p.hand[index];
  const shown=handRevealIdentity(card(pack,physical));
  publishHandToBottom(pack,s,q.player,physical);
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'deck',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  if(shown.type!=='character'||!Number.isInteger(shown.bp)){
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const spec={excludeName:q.excludeName,color:q.color,ap:q.ap};
  const bonus=handCharacterBpMayAmount(pack,s,q.player);
  const base=outsideReferencedMatches(pack,s,q.player,spec,shown.bp);
  const boosted=bonus>0?outsideReferencedMatches(pack,s,q.player,spec,shown.bp+bonus):base;
  if(bonus>0&&idSetsDiffer(base,boosted)){
   s.pending={kind:'effect-referenced-bp',player:q.player,sourceUid:q.sourceUid,
    sourceStamp:q.sourceStamp,revealedUid:physical.uid,baseBp:shown.bp,amount:bonus,
    next:'outside',excludeName:q.excludeName,color:q.color,ap:q.ap};
   return;
  }
  if(!base.length){s.pending=null;continueEffectQueue(pack,s);return;}
  s.pending={kind:'effect-outside-referenced',player:q.player,sourceUid:q.sourceUid,
   sourceStamp:q.sourceStamp,choices:base,excludeName:q.excludeName,color:q.color,
   ap:q.ap,ceiling:shown.bp};
  return;
 }
 if(q.kind==='effect-referenced-bp'){
  if(a.mode!=='accept'&&a.mode!=='decline')throw Error('Invalid referenced BP option');
  const ceiling=a.mode==='accept'?q.baseBp+q.amount:q.baseBp;
  const revealed=p.deck.find(c=>c.uid===q.revealedUid);
  const shown=revealed&&handRevealIdentity(card(pack,revealed));
  if(!shown||shown.type!=='character'||shown.bp!==q.baseBp)
   throw Error('Referenced BP lost its revealed card');
  if(q.next==='outside'){
   const source=field(p).find(c=>c.uid===q.sourceUid);
   const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
    e.op==='revealHandBottomOutsideCharacter'&&e.excludeName===q.excludeName&&
    e.color===q.color&&e.ap===q.ap);
   if(!source||source.fieldEntryStamp!==q.sourceStamp||!effect)
    throw Error('Referenced BP lost its source');
   const matches=outsideReferencedMatches(pack,s,q.player,{
    excludeName:q.excludeName,color:q.color,ap:q.ap},ceiling);
   if(!matches.length){s.pending=null;continueEffectQueue(pack,s);return;}
   s.pending={kind:'effect-outside-referenced',player:q.player,sourceUid:q.sourceUid,
    sourceStamp:q.sourceStamp,choices:matches,excludeName:q.excludeName,
    color:q.color,ap:q.ap,ceiling};
   return;
  }
  if(q.next!=='retire')throw Error('Invalid referenced BP follow-up');
  const source=p.outside.find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  if(!source||ability?.op!=='restLeaveRevealRetire'||card(pack,source).name!==q.name)
   throw Error('Referenced BP lost its retired field');
  const choices=frontReferencedRetire(pack,s,q.player,ceiling,q.sourceUid);
  if(!choices.length){s.pending=null;continueEffectQueue(pack,s);return;}
  s.pending={kind:'effect-retire-referenced',player:q.player,sourceUid:q.sourceUid,
   choices,ceiling,optional:true,name:q.name};
  return;
 }
 if(q.kind==='effect-outside-referenced'){
  const index=p.outside.findIndex(c=>c.uid===a.uid);
  const source=field(p).find(c=>c.uid===q.sourceUid);
  if(index<0||!q.choices.includes(a.uid)||!source||source.fieldEntryStamp!==q.sourceStamp)
   throw Error('Outside referenced search lost its card');
  const physical=p.outside[index],d=card(pack,physical);
  if(d.type!=='character'||d.color!==q.color||d.ap!==q.ap||
   cardHasName(d,q.excludeName,originalEffectsDisabled(s,physical))||
   !Number.isInteger(d.bp)||d.bp>q.ceiling)
   throw Error('Outside referenced filters changed');
  if(a.mode==='hand'){
   moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(a.mode!=='rest'||!['front','energy'].includes(a.line)||
   (a.line==='front'&&d.frontForbidden))
   throw Error('Invalid referenced REST line');
  commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
  p.outside.splice(index,1);
  physical.ready=false;
  physical.fieldEntryStamp=s.nextFieldEntryStamp++;
  p[a.line][a.slot]=physical;
  recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;
  s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect'));
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-reveal-retire'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  const source=p.outside.find(c=>c.uid===q.sourceUid);
  if(index<0||!q.choices.includes(a.uid)||!source||card(pack,source).name!==q.name)
   throw Error('Reveal after leave lost its hand card');
  const physical=p.hand[index];
  const shown=handRevealIdentity(card(pack,physical));
  publishHandToBottom(pack,s,q.player,physical);
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'deck',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  if(shown.type!=='character'||!Number.isInteger(shown.bp)){
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const bonus=handCharacterBpMayAmount(pack,s,q.player);
  const base=frontReferencedRetire(pack,s,q.player,shown.bp,q.sourceUid);
  const boosted=bonus>0?frontReferencedRetire(pack,s,q.player,shown.bp+bonus,q.sourceUid):base;
  if(bonus>0&&idSetsDiffer(base,boosted)){
   s.pending={kind:'effect-referenced-bp',player:q.player,sourceUid:q.sourceUid,
    revealedUid:physical.uid,baseBp:shown.bp,amount:bonus,next:'retire',name:q.name};
   return;
  }
  if(!base.length){s.pending=null;continueEffectQueue(pack,s);return;}
  s.pending={kind:'effect-retire-referenced',player:q.player,sourceUid:q.sourceUid,
   choices:base,ceiling:shown.bp,optional:true,name:q.name};
  return;
 }
 if(q.kind==='effect-retire-referenced'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const foe=1-q.player;
  const slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
  const target=slot>=0?s.players[foe].front[slot]:null;
  if(!target||!q.choices.includes(a.uid)||bp(pack,s,target)>q.ceiling)
   throw Error('Illegal referenced front retirement');
  s.pending=null;
  const paused=retire(pack,s,foe,'front',slot,{by:'opponent'});
  if(!paused)continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-hand-block'){
  const source=field(p).find(c=>c.uid===q.sourceUid);
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||index<0||!q.choices.includes(a.uid))
   throw Error('Hand block grant lost its card');
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  if(field(p).some(c=>c.uid===source.uid&&c.fieldEntryStamp===q.sourceStamp))
   source.blockAtLeastGranted={turn:s.turn,stamp:source.fieldEntryStamp,bp:q.bp};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-substitute-retire'){
  const loc=location(s,q.player,q.uid);
  if(!loc||loc.line!==q.line||loc.slot!==q.slot||
   (a.uid!==null&&!q.choices.includes(a.uid)))
   throw Error('Substitute retirement lost its card');
  if(a.uid===null){
   s.pending=null;
   if(liveBounceInstead(s,loc.c)){
    bounceToHand(pack,s,q.player,loc.c.uid,loc.c.uid,{reason:'opponent-effect',
     controller:q.player,by:'opponent',skipReplacement:true});
    if(q.postImpact)queueImpactAfterRetirement(pack,s,q.player,q.postImpact);
    continueEffectQueue(pack,s);return;
   }
   if(raidLeaveOffer(pack,s,q.player,loc.c)){
    s.pending={kind:'effect-raid-leave',player:q.player,uid:loc.c.uid,line:loc.line,
     slot:loc.slot,mode:'retire',postImpact:q.postImpact,by:q.by};
    return;
   }
   retire(pack,s,q.player,loc.line,loc.slot,{postImpact:q.postImpact,by:q.by,
    skipReplacement:true});
   if(q.postImpact)queueImpactAfterRetirement(pack,s,q.player,q.postImpact);
   continueEffectQueue(pack,s);return;
  }
  const ram=location(s,q.player,a.uid);
  if(!ram||ram.line!=='front'||originalEffectsDisabled(s,ram.c)||
   card(pack,ram.c).substituteOppRetire?.name!==q.name)
   throw Error('Illegal substitute character');
  s.pending=null;
  retire(pack,s,q.player,ram.line,ram.slot,{skipReplacement:true});
  if(q.postImpact)queueImpactAfterRetirement(pack,s,q.player,q.postImpact);
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-outside-printed-active'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const i=p.outside.findIndex(c=>c.uid===a.uid);
  if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
   throw Error('Outside printed ACTIVE needs eligible own UID and line');
  const physical=p.outside[i],d=card(pack,physical);
  if(d.type!=='character'||d.color!==q.color||d.energy!==q.energy||
   !cardHasName(d,q.name,originalEffectsDisabled(s,physical))||
   (a.line==='front'&&d.frontForbidden))
   throw Error('Outside printed ACTIVE filters changed');
  commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
  p.outside.splice(i,1);physical.ready=true;
  physical.fieldEntryStamp=s.nextFieldEntryStamp++;
  p[a.line][a.slot]=physical;
  recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;
  s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect'));
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-bounce-include-self'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const found=location(s,q.player,a.uid);
  if(!found||!q.choices.includes(a.uid)||card(pack,found.c).type!=='character')
   throw Error('Illegal bounce including self');
  bounceToHand(pack,s,q.player,a.uid,q.sourceUid);
  const source=location(s,q.player,q.sourceUid);
  if(source)attemptFieldActive(s,q.player,source.c);
  const matches=affordablePrintedOutside(pack,s,q.player,{name:q.name,color:q.color,ap:q.ap});
  if(matches.length)s.pending={kind:'effect-outside-rest-or-raid',player:q.player,
   sourceUid:q.sourceUid,choices:matches.map(c=>c.uid),name:q.name,color:q.color,
   ap:q.ap,optional:true};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-outside-rest-or-raid'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const i=p.outside.findIndex(c=>c.uid===a.uid);
  const physical=i>=0?p.outside[i]:null,d=physical&&card(pack,physical);
  const produced=universalEnergyByColor(pack,s,q.player);
  if(!physical||!q.choices.includes(a.uid)||d.type!=='character'||d.color!==q.color||
   d.ap!==q.ap||d.energy>(produced[d.color]||0)||
   !cardHasName(d,q.name,originalEffectsDisabled(s,physical)))
   throw Error('Affordable Subaru filters changed');
  if(a.mode==='raid'){
   const base=location(s,q.player,a.baseUid);
   if(!base||!d.raidName||!validRaidBase(pack,s,q.player,base.c,d)||
    !['front','energy'].includes(a.line))
    throw Error('Invalid base for outside Subaru Raid');
   p.outside.splice(i,1);
   s.pending=null;
   performRaid(pack,s,q.player,physical,a.baseUid,a.line,a.slot,a.replaceUid,
    {entryReady:false,entryCause:'outsideEffectRaid',entryFrom:'outside',effectSourceUid:q.sourceUid});
   continueEffectQueue(pack,s);return;
  }
  if(a.mode!=='enter'||!['front','energy'].includes(a.line)||
   (a.line==='front'&&d.frontForbidden))
   throw Error('Invalid outside Subaru REST line');
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
 if(q.kind==='effect-grant-bounce-instead'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const source=location(s,q.player,q.sourceUid);
  const target=location(s,q.player,a.uid);
  if(!source||source.c.fieldEntryStamp!==q.sourceStamp||originalEffectsDisabled(s,source.c)||
   !target||!q.choices.includes(a.uid)||card(pack,target.c).type!=='character'||
   !Number.isInteger(target.c.fieldEntryStamp)||
   !cardHasName(card(pack,target.c),q.name,originalEffectsDisabled(s,target.c)))
   throw Error('Illegal bounce-instead target');
  target.c.bounceInsteadGranted={untilOwnTurnStart:s.players[q.player].ownTurns+1,
   stamp:target.c.fieldEntryStamp,sourceUid:q.sourceUid};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-hand-reenter-under'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const named=c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c));
  const emilias=field(p).filter(named);
  if(!emilias.length||a.line!=='front'||
   (a.replaceUid&&emilias.length===1&&emilias[0].uid===a.replaceUid))
   throw Error('Emilia left before the facedown reenter');
  const handIndex=p.hand.findIndex(c=>c.uid===a.uid);
  if(handIndex<0||!q.choices.includes(a.uid)||!p.outside.some(c=>c.uid===q.sourceUid))
   throw Error('Illegal facedown reenter');
  commitDestination(pack,s,q.player,'front',a.slot,a.replaceUid);
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index:handIndex,
   reason:'own-effect',sourceUid:q.sourceUid});
  const sourceIndex=p.outside.findIndex(c=>c.uid===q.sourceUid);
  const tuckedIndex=p.outside.findIndex(c=>c.uid===a.uid);
  if(sourceIndex<0||tuckedIndex<0||sourceIndex===tuckedIndex)
   throw Error('Facedown reenter lost a physical card');
  const subaru=p.outside[sourceIndex];
  const tucked=p.outside[tuckedIndex];
  p.outside.splice(Math.max(sourceIndex,tuckedIndex),1);
  p.outside.splice(Math.min(sourceIndex,tuckedIndex),1);
  subaru.ready=false;subaru.stack=[];subaru.buffs=[];
  subaru.fieldEntryStamp=s.nextFieldEntryStamp++;
  tucked.faceDown=true;tucked.ready=false;tucked.fieldEntryStamp=null;
  tucked.stack=[];tucked.under=[];tucked.buffs=[];
  subaru.under=[tucked];
  p.front[a.slot]=subaru;
  recordCompletedMove(pack,s,{physical:subaru,owner:q.player,from:'outside',to:'front',
   reason:'own-effect',sourceUid:q.sourceUid});
  recordCompletedMove(pack,s,{physical:tucked,owner:q.player,from:'outside',to:'raid-under',
   reason:'own-effect',sourceUid:subaru.uid});
  s.pending=null;continueEffectQueue(pack,s);return;
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
   {handToOutside:false,outsideToHand:false}],ownEffectRests:[[],[]],
  turnRetireEvents:[],zoneMoveEvents:[],nextZoneMoveOrder:1,
  initialCounts:decks.map(d=>Object.fromEntries(Object.entries(d).filter(([,n])=>n>0)))
 };
 for(let p=0;p<2;p++){
  const ids=Object.entries(decks[p]).flatMap(([id,count])=>Array(count).fill(id));
  const pile=shuffle(s,ids.map((id,i)=>({uid:p+'-'+i,cardId:id,ready:false,stack:[],under:[],buffs:[]})));
  s.players.push({
   deck:pile,hand:pile.splice(0,7),life:pile.splice(0,7),lifeRevealed:[],
   front:[null,null,null,null],energy:[null,null,null,null],
   outside:[],resolvingEvents:[],removed:[],apCards:[0,1,2].map(i=>({uid:'AP'+p+'-'+i,ready:false,inPlay:false})),ownTurns:0,
   nextNamedHandEnergy:[],handCharacterBpMay:null
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
 if(q.kind==='effect-grant-cause')return [
  {type:'chooseGrantCause',mode:'grant'},{type:'chooseGrantCause',mode:'skip'}];
 if(q.kind==='effect-hand-bottom')return [
  ...p.hand.map(c=>({type:'chooseHandBottom',uid:c.uid})),
  {type:'chooseHandBottom',uid:null}];
 if(q.kind==='effect-reveal-bottom')return q.choices
  .filter(uid=>p.hand.some(c=>c.uid===uid))
  .map(uid=>({type:'chooseRevealBottom',uid}));
 if(q.kind==='effect-discard-active')return [
  {type:'chooseDiscardActive',uid:null},
  ...p.hand.map(c=>({type:'chooseDiscardActive',uid:c.uid}))
 ];
 if(q.kind==='effect-rest-front-ap')return [
  {type:'chooseRestFrontAp',uid:null},
  ...q.choices.filter(uid=>p.front.some(c=>c?.uid===uid&&c.ready&&
   card(pack,c).type==='character')).map(uid=>({type:'chooseRestFrontAp',uid}))
 ];
 if(q.kind==='effect-hand-top')return q.choices
  .filter(uid=>p.hand.some(c=>c.uid===uid))
  .map(uid=>({type:'chooseHandTop',uid}));
 if(q.kind==='effect-pay-deploy-self')return [
  {type:'choosePayDeploy',mode:'pay'},{type:'choosePayDeploy',mode:'skip'}];
 if(q.kind==='effect-deploy-self-active')return ['front','energy'].flatMap(line=>
  legalDestinations(p,line).map(dest=>({type:'chooseDeploySelfActive',uid:q.sourceUid,line,...dest})));
 if(q.kind==='effect-outside-hand-or-rest')return [
  ...q.choices.flatMap(uid=>[
   {type:'chooseOutsideUse',mode:'hand',uid},
   ...['front','energy'].flatMap(line=>legalDestinations(p,line).map(dest=>
    ({type:'chooseOutsideUse',mode:'rest',uid,line,...dest})))
  ]),
  {type:'chooseOutsideUse',mode:'skip'}];
 if(q.kind==='effect-recover-under')return [
  ...q.choices.filter(uid=>p.outside.some(c=>c.uid===uid)).map(uid=>({type:'chooseRecoverUnder',uid})),
  {type:'chooseRecoverUnder',uid:null}];
 if(q.kind==='effect-energy-front'){
  const live=q.movers.filter(uid=>p.energy.some(c=>c?.uid===uid));
  const open=q.slots.filter(slot=>!p.front[slot]);
  return live.flatMap(uid=>open.map(slot=>({type:'chooseEnergyFront',uid,slot})));
 }
 if(q.kind==='effect-entry-protect')return q.choices.map(uid=>({type:'chooseEntryProtect',uid}));
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
  const granted=attacker.blockFloorGranted;
  const grantLive=!!granted&&granted.turn===s.turn&&granted.stamp===attacker.fieldEntryStamp;
  const ceiling=attacker.blockAtLeastGranted;
  const ceilingLive=!!ceiling&&ceiling.turn===s.turn&&ceiling.stamp===attacker.fieldEntryStamp;
  const floors=[];
  if(applies&&rule)floors.push(rule);
  if(grantLive)floors.push({relation:'atMost',bp:granted.bp});
  if(ceilingLive)floors.push({relation:'atLeast',bp:ceiling.bp});
  const canBlock=c=>floors.every(floor=>!(floor.relation==='atLeast'
   ?bp(pack,s,c)>=floor.bp:bp(pack,s,c)<=floor.bp));
  const candidates=p.front.filter(c=>c?.ready&&canBlock(c));
  // Official mandatory BLOCK: only after a valid own-effect-entry grant,
  // and only if an otherwise legal ACTIVE blocker exists. SNIPER bypasses
  // this entire pending BLOCK window, as required by Q65-Q70.
  const forced=hasCurrentBattleGrant(s,attacker,'mustBlockGranted');
  // Printed 「可能ならブロックしなければならない」. Q2339: if more than one
  // such character can block, the controller chooses among those only.
  const printedMust=candidates.filter(c=>card(pack,c).mustBlock&&
   !originalEffectsDisabled(s,c));
  const pool=printedMust.length?printedMust:candidates;
  const must=forced||printedMust.length>0;
  return [
   ...(!must||!pool.length?[{type:'chooseBlock',uid:null}]:[]),
   ...pool.map(c=>({type:'chooseBlock',uid:c.uid}))
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
 if(q.kind==='effect-top-trait-event')return [
  {type:'chooseTopTraitEvent',uid:null},
  ...q.choices.map(uid=>({type:'chooseTopTraitEvent',uid}))
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
  if(q.kind==='effect-hand-named-rest')return [
   {type:'chooseHandNamedRest',uid:null},
   ...p.hand.filter(c=>q.choices.includes(c.uid)).flatMap(c=>{
    const d=card(pack,c);
    return ['front','energy'].filter(line=>line!=='front'||!d.frontForbidden)
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseHandNamedRest',uid:c.uid,line,...dest})));
   })
  ];
  if(q.kind==='effect-grant-named-impact')return [
   {type:'chooseGrantNamedImpact',uid:null},
   ...q.choices.map(uid=>({type:'chooseGrantNamedImpact',uid}))
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
  if(q.kind==='effect-optional-pay-ap')return [
   {type:'chooseOptionalPayAp',mode:'pay'},
   {type:'chooseOptionalPayAp',mode:'skip'}
  ];
  if(q.kind==='effect-deck-named-play'){
   const top=p.deck[0];
   if(!top||top.uid!==q.uid||!revealedDeckPlayable(pack,s,q.player,top,q.names))
    throw Error('Revealed deck card left the top');
   const d=card(pack,top);
   const out=[{type:'chooseDeckNamedPlay',mode:'hand',uid:top.uid}];
   for(const line of ['front','energy']){
    if(line==='front'&&(d.type!=='character'||d.frontForbidden))continue;
    for(const dest of legalDestinations(p,line))
     out.push({type:'chooseDeckNamedPlay',mode:'enter',uid:top.uid,line,...dest});
   }
   if(d.raidName&&d.type==='character'&&!d.frontForbidden)
    for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
     const base=p[line][slot];
     if(!base||!validRaidBase(pack,s,q.player,base,d)||
      card(pack,base).frontForbidden)continue;
     const dests=line==='front'?[{slot}]:legalDestinations(p,'front');
     for(const dest of dests)out.push({type:'chooseDeckNamedPlay',mode:'raid',
      uid:top.uid,baseUid:base.uid,line:'front',...dest});
     if(line==='energy')out.push({type:'chooseDeckNamedPlay',mode:'raid',
      uid:top.uid,baseUid:base.uid,line:'energy',slot});
    }
   return out;
  }
  if(q.kind==='effect-place-hand'){
   if(!p.hand.length)throw Error('Hand placement lost its hand');
   return p.hand.flatMap(c=>['deck','outside'].map(mode=>({
    type:'choosePlaceHand',mode,uid:c.uid})));
  }
  if(q.kind==='effect-hand-rest-or-raid'){
   const out=[{type:'chooseHandRestOrRaid',uid:null}];
   for(const c of p.hand.filter(c=>q.choices.includes(c.uid)&&
    matchesHandRestOrRaid(pack,s,c,q))){
    const d=card(pack,c);
    for(const line of ['front','energy']){
     if(line==='front'&&(d.type!=='character'||d.frontForbidden))continue;
     for(const dest of legalDestinations(p,line))
      out.push({type:'chooseHandRestOrRaid',mode:'enter',uid:c.uid,line,...dest});
    }
    if(d.raidName&&d.type==='character'&&!d.frontForbidden)
     for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
      const base=p[line][slot];
      if(!base||!validRaidBase(pack,s,q.player,base,d)||
       card(pack,base).frontForbidden)continue;
      const dests=line==='front'?[{slot}]:legalDestinations(p,'front');
      for(const dest of dests)out.push({type:'chooseHandRestOrRaid',mode:'raid',
       uid:c.uid,baseUid:base.uid,line:'front',...dest});
      if(line==='energy')out.push({type:'chooseHandRestOrRaid',mode:'raid',
       uid:c.uid,baseUid:base.uid,line:'energy',slot});
     }
   }
   return out;
  }
  if(q.kind==='effect-outside-rest')return [
   {type:'chooseOutsideRest',uid:null},
   ...p.outside.filter(c=>q.choices.includes(c.uid)).flatMap(c=>
    ['front','energy'].flatMap(line=>legalDestinations(p,line)
     .map(dest=>({type:'chooseOutsideRest',uid:c.uid,line,...dest}))))
  ];
  if(q.kind==='effect-outside-printed-rest')return [
   {type:'chooseOutsidePrintedRest',uid:null},
   ...p.outside.filter(c=>q.choices.includes(c.uid)).flatMap(c=>{
    const d=card(pack,c);
    return ['front','energy'].filter(line=>line!=='front'||!d.frontForbidden)
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseOutsidePrintedRest',uid:c.uid,line,...dest})));
   })
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
 if(q.kind==='effect-remove-outside'){
  const live=p.outside.filter(c=>q.choices.includes(c.uid)&&!q.selected.includes(c.uid)&&
   (q.cardType==='any'||card(pack,c).type===q.cardType));
  if(q.any)return [
   ...(q.optional&&!q.selected.length?[{type:'chooseRemoveOutside',mode:'skip'}]:[]),
   ...(q.selected.length?[{type:'chooseRemoveOutside',mode:'done'}]:[]),
   ...live.map(c=>({type:'chooseRemoveOutside',mode:'pick',uid:c.uid}))
  ];
  if(q.short)return [
   ...(q.optional?[{type:'chooseRemoveOutside',mode:'skip'}]:[]),
   {type:'chooseRemoveOutside',mode:'all'}
  ];
  return [
   ...(q.optional&&!q.selected.length?[{type:'chooseRemoveOutside',mode:'skip'}]:[]),
   ...live.map(c=>({type:'chooseRemoveOutside',mode:'pick',uid:c.uid}))
  ];
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
 if(q.kind==='effect-active-own-named'){
  const choices=field(p).filter(c=>q.choices.includes(c.uid)&&
   card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  return [{type:'chooseActiveOwnNamed',uid:null},
   ...choices.map(uid=>({type:'chooseActiveOwnNamed',uid}))];
 }
 if(q.kind==='effect-grant-block-at-least'){
  const choices=field(p).filter(c=>q.choices.includes(c.uid)&&
   card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  return [...(q.optional?[{type:'chooseGrantBlockAtLeast',uid:null}]:[]),
   ...choices.map(uid=>({type:'chooseGrantBlockAtLeast',uid}))];
 }
 if(q.kind==='effect-grant-printed-block'){
  const choices=field(p).filter(c=>{
   if(!q.choices.includes(c.uid))return false;
   const d=card(pack,c);
   return d.type==='character'&&d.color===q.color&&d.energy===q.energy&&
    cardHasName(d,q.name,originalEffectsDisabled(s,c));
  }).map(c=>c.uid);
  return [{type:'chooseGrantPrintedBlock',uid:null},
   ...choices.map(uid=>({type:'chooseGrantPrintedBlock',uid}))];
 }
 if(q.kind==='effect-unblocked-rest')return [
  {type:'chooseUnblockedRest',uid:null},
  ...s.players[1-q.player].front.filter(c=>c&&q.choices.includes(c.uid)&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid))
   .map(c=>({type:'chooseUnblockedRest',uid:c.uid}))
 ];
 if(q.kind==='effect-energy-swap')return p.front.filter(c=>c&&q.choices.includes(c.uid)&&
  card(pack,c).type==='character').map(c=>({type:'chooseEnergySwap',uid:c.uid}));
 if(q.kind==='effect-move-opp-front'){
  const foe=s.players[1-q.player];
  return [
   {type:'chooseMoveOppFront',uid:null},
   ...foe.front.filter(c=>c&&q.choices.includes(c.uid)&&
    cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).flatMap(c=>
    legalDestinations(foe,'energy').map(dest=>({
     type:'chooseMoveOppFront',uid:c.uid,...dest})))
  ];
 }
 if(q.kind==='effect-may-draw-discard')return [
  {type:'chooseMayDrawDiscard',mode:'skip'},
  ...(p.deck.length?[{type:'chooseMayDrawDiscard',mode:'draw'}]:[])
 ];
 if(q.kind==='effect-buff-own')return [
  ...(q.optional?[{type:'chooseOwnBuff',uid:null}]:[]),
  ...q.choices.map(uid=>({type:'chooseOwnBuff',uid}))
 ];
 if(q.kind==='effect-named-impact'){
  const choices=namedImpactChoices(pack,s,q.player,q.name)
   .filter(uid=>q.choices.includes(uid));
  return choices.map(uid=>({type:'chooseNamedImpact',uid}));
 }
 if(q.kind==='effect-buff-either')return [
  {type:'chooseEitherBuff',uid:null},
  ...q.choices.map(uid=>({type:'chooseEitherBuff',uid}))
 ];
 if(q.kind==='effect-return-printed')return [
  {type:'chooseReturnPrinted',uid:null},
  ...q.choices.map(uid=>({type:'chooseReturnPrinted',uid}))
 ];
 if(q.kind==='effect-remove-named')return [
  {type:'chooseRemoveNamed',uid:null},
  ...q.choices.map(uid=>({type:'chooseRemoveNamed',uid}))
 ];
 if(q.kind==='effect-pay-named')return [
  {type:'choosePayNamed',mode:'skip'},
  ...p.hand.map(c=>({type:'choosePayNamed',mode:'hand',uid:c.uid})),
  ...p.front.filter(c=>c&&c.ready&&card(pack,c).type==='character')
   .map(c=>({type:'choosePayNamed',mode:'rest',uid:c.uid}))
 ];
 if(q.kind==='effect-add-named')return q.choices
  .filter(uid=>p.outside.some(c=>c.uid===uid&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))))
  .map(uid=>({type:'chooseAddNamed',uid}));
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
  if(q.kind==='effect-retire-at-least')return [
   ...q.choices.map(uid=>({type:'chooseRetireAtLeast',uid})),
   ...(q.optional===true?[{type:'chooseRetireAtLeast',uid:null}]:[])];
  if(q.kind==='effect-retire-at-most')return q.choices.map(uid=>({type:'chooseRetireAtMost',uid}));
  if(q.kind==='effect-retire-scaled')return [
   {type:'chooseRetireScaled',uid:null},
   ...q.choices.map(uid=>({type:'chooseRetireScaled',uid}))
  ];
  if(q.kind==='effect-rest-outside-events')return [
   {type:'chooseRestOutsideEvents',uid:null},
   ...q.choices.map(uid=>({type:'chooseRestOutsideEvents',uid}))
  ];
  if(q.kind==='effect-rested-retire-impact')return [
   {type:'chooseRestedRetire',uid:null},
   ...q.choices.map(uid=>({type:'chooseRestedRetire',uid}))
  ];
  if(q.kind==='effect-hand-bp-may')return [
   {type:'chooseHandBpMay',mode:'accept'},{type:'chooseHandBpMay',mode:'decline'}];
  if(q.kind==='effect-hand-deploy-may')return [
   {type:'chooseHandDeployMay',mode:'accept'},{type:'chooseHandDeployMay',mode:'decline'}];
  if(q.kind==='effect-hand-rest-entry')return ['front','energy'].flatMap(line=>
   legalDestinations(p,line).map(dest=>({type:'chooseHandRestEntry',uid:q.sourceUid,line,...dest})));
  if(q.kind==='effect-active-other')return [
   {type:'chooseActiveOther',uid:null},
   ...q.choices.filter(uid=>field(p).some(c=>c.uid===uid&&c.uid!==q.sourceUid&&
    card(pack,c).type==='character')).map(uid=>({type:'chooseActiveOther',uid}))];
  if(q.kind==='effect-rest-own-front-draw')return q.choices.filter(uid=>
   p.front.some(c=>c?.uid===uid&&c.ready&&card(pack,c).type==='character'))
   .map(uid=>({type:'chooseRestOwnFrontDraw',uid}));
  if(q.kind==='effect-rest-or-retire')return q.choices.filter(uid=>
   s.players[1-q.player].front.some(c=>c?.uid===uid&&bp(pack,s,c)<=q.ceiling))
   .map(uid=>({type:'chooseRestOrRetire',uid}));
  if(q.kind==='effect-raid-base-rest'){
   const base=p.outside.find(c=>c.uid===q.baseUid);
   const definition=base&&card(pack,base);
   const open=base&&definition.type==='character'&&!definition.raidName;
   return [
    {type:'chooseRaidBaseRest',uid:null},
    ...(open?['front','energy'].filter(line=>!(line==='front'&&definition.frontForbidden))
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseRaidBaseRest',uid:base.uid,line,...dest}))):[])
   ];
  }
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
  if(q.trigger==='active')out.push(...field(p).filter(c=>card(pack,c).type==='character'&&
   !effectChoiceProtected(s,q.player,c.uid,'trigger'))
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
 if(q.kind==='effect-line-move')return [
  ...q.choices.map(uid=>({type:'chooseLineMove',uid})),
  {type:'chooseLineMove',uid:null}
 ];
 if(q.kind==='effect-line-slot'){
  const full=p[q.line].every(Boolean);
  if(full)return p[q.line].map((c,slot)=>({type:'chooseLineSlot',slot,replaceUid:c.uid}));
  return p[q.line].flatMap((c,slot)=>c?[]:[{type:'chooseLineSlot',slot}]);
 }
 if(q.kind==='effect-rest-two')return q.choices
  .filter(uid=>!q.selected.includes(uid)&&p.front.some(c=>c?.uid===uid&&c.ready))
  .map(uid=>({type:'chooseRestTwo',uid}));
 if(q.kind==='effect-self-front')return p.front.flatMap((c,slot)=>
  c?[]:[{type:'chooseSelfFront',slot}]);
 if(q.kind==='effect-raid-leave')return [
  ...p.hand.map(c=>({type:'chooseRaidLeave',mode:'pay',uid:c.uid})),
  {type:'chooseRaidLeave',mode:'decline'}
 ];
 if(q.kind==='effect-rest-lock')return [
  ...q.choices.map(uid=>({type:'chooseRestLock',uid})),
  {type:'chooseRestLock',uid:null}
 ];
 if(q.kind==='effect-hand-outside-active')return [
  {type:'chooseHandOutsideActive',uid:null},
  ...p.hand.map(c=>({type:'chooseHandOutsideActive',uid:c.uid}))
 ];
 if(q.kind==='effect-named-duration')return [
  {type:'chooseNamedDuration',uid:null},
  ...q.choices.filter(uid=>field(p).some(c=>c.uid===uid&&card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))))
   .map(uid=>({type:'chooseNamedDuration',uid}))
 ];
 if(q.kind==='effect-top-take-one')return q.uids
  .filter((uid,i)=>p.deck[i]?.uid===uid)
  .map(uid=>({type:'chooseTopTakeOne',uid}));
 if(q.kind==='effect-reveal-optional')return [
  {type:'chooseRevealOptional',uid:null},
  ...q.choices.filter(uid=>p.hand.some(c=>c.uid===uid))
   .map(uid=>({type:'chooseRevealOptional',uid}))
 ];
 if(q.kind==='effect-referenced-bp')return [
  {type:'chooseReferencedBp',mode:'accept'},
  {type:'chooseReferencedBp',mode:'decline'}
 ];
 if(q.kind==='effect-outside-referenced'){
  const live=q.choices.filter(uid=>{
   const c=p.outside.find(x=>x.uid===uid);
   const d=c&&card(pack,c);
   return d&&d.type==='character'&&d.color===q.color&&d.ap===q.ap&&
    !cardHasName(d,q.excludeName,originalEffectsDisabled(s,c))&&
    Number.isInteger(d.bp)&&d.bp<=q.ceiling;
  });
  return live.flatMap(uid=>{
   const d=card(pack,p.outside.find(c=>c.uid===uid));
   const lines=['front','energy'].filter(line=>!(line==='front'&&d.frontForbidden));
   return [
    {type:'chooseOutsideReferenced',mode:'hand',uid},
    ...lines.flatMap(line=>legalDestinations(p,line).map(dest=>({
     type:'chooseOutsideReferenced',mode:'rest',uid,line,...dest})))
   ];
  });
 }
 if(q.kind==='effect-reveal-retire')return q.choices
  .filter(uid=>p.hand.some(c=>c.uid===uid))
  .map(uid=>({type:'chooseRevealRetire',uid}));
 if(q.kind==='effect-retire-referenced')return [
  {type:'chooseRetireReferenced',uid:null},
  ...q.choices.filter(uid=>s.players[1-q.player].front.some(c=>c?.uid===uid&&
   bp(pack,s,c)<=q.ceiling)).map(uid=>({type:'chooseRetireReferenced',uid}))
 ];
 if(q.kind==='effect-hand-block')return q.choices
  .filter(uid=>p.hand.some(c=>c.uid===uid))
  .map(uid=>({type:'chooseHandBlock',uid}));
 if(q.kind==='effect-substitute-retire'){
  const live=q.choices.filter(uid=>{
   const c=p.front.find(x=>x?.uid===uid);
   return c&&!originalEffectsDisabled(s,c)&&card(pack,c).substituteOppRetire?.name===q.name;
  });
  return [{type:'chooseSubstituteRetire',uid:null},
   ...live.map(uid=>({type:'chooseSubstituteRetire',uid}))];
 }
 if(q.kind==='effect-outside-printed-active')return [
  {type:'chooseOutsidePrintedActive',uid:null},
  ...p.outside.filter(c=>q.choices.includes(c.uid)).flatMap(c=>{
   const d=card(pack,c);
   return ['front','energy'].filter(line=>line!=='front'||!d.frontForbidden)
    .flatMap(line=>legalDestinations(p,line).map(dest=>({
     type:'chooseOutsidePrintedActive',uid:c.uid,line,...dest})));
  })
 ];
 if(q.kind==='effect-bounce-include-self')return [
  {type:'chooseBounceIncludeSelf',uid:null},
  ...q.choices.filter(uid=>field(p).some(c=>c.uid===uid&&card(pack,c).type==='character'))
   .map(uid=>({type:'chooseBounceIncludeSelf',uid}))
 ];
 if(q.kind==='effect-outside-rest-or-raid'){
  const out=[{type:'chooseOutsideRestOrRaid',uid:null}];
  for(const c of p.outside.filter(c=>q.choices.includes(c.uid))){
   const d=card(pack,c);
   const produced=universalEnergyByColor(pack,s,q.player);
   if(d.type!=='character'||d.color!==q.color||d.ap!==q.ap||
    d.energy>(produced[d.color]||0)||
    !cardHasName(d,q.name,originalEffectsDisabled(s,c)))continue;
   for(const line of ['front','energy']){
    if(line==='front'&&d.frontForbidden)continue;
    for(const dest of legalDestinations(p,line))
     out.push({type:'chooseOutsideRestOrRaid',mode:'enter',uid:c.uid,line,...dest});
   }
   if(d.raidName&&!d.frontForbidden)
    for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
     const base=p[line][slot];
     if(!base||!validRaidBase(pack,s,q.player,base,d)||card(pack,base).frontForbidden)continue;
     const dests=line==='front'?[{slot}]:legalDestinations(p,'front');
     for(const dest of dests)out.push({type:'chooseOutsideRestOrRaid',mode:'raid',
      uid:c.uid,baseUid:base.uid,line:'front',...dest});
     if(line==='energy')out.push({type:'chooseOutsideRestOrRaid',mode:'raid',
      uid:c.uid,baseUid:base.uid,line:'energy',slot});
    }
  }
  return out;
 }
 if(q.kind==='effect-grant-bounce-instead')return [
  {type:'chooseGrantBounceInstead',uid:null},
  ...q.choices.filter(uid=>field(p).some(c=>c.uid===uid&&card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))))
   .map(uid=>({type:'chooseGrantBounceInstead',uid}))
 ];
 if(q.kind==='effect-hand-reenter-under'){
  const emilia=field(p).some(c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c)));
  const source=p.outside.some(c=>c.uid===q.sourceUid);
  const out=[{type:'chooseHandReenterUnder',uid:null}];
  if(emilia&&source)for(const uid of q.choices.filter(id=>p.hand.some(c=>c.uid===id)))
   for(const dest of legalDestinations(p,'front'))
    out.push({type:'chooseHandReenterUnder',uid,line:'front',...dest});
  return out;
 }
 throw Error('No handler for pending decision '+q.kind);
}
// UNION ARENA official Q1119 (2024-09-06): an event requiring "choose
// one" cannot be played at all unless ALL mandatory choices exist.
// This check is performed BEFORE spending AP or moving the event outside.
// Optional "up to one" choices remain playable with zero targets.
function namedImpactPrint(pack,s,owner,job){
 const source=s.players[owner].outside.find(c=>c.uid===job.sourceUid);
 const effect=source&&card(pack,source).effects?.onPlay?.find(e=>e.op==='buffNamedImpactDraw');
 if(!effect||card(pack,source).type!=='event'||effect.name!==job.name||
  effect.bp!==job.bp||effect.impactPlus!==job.impactPlus||effect.draw!==job.draw)
  return null;
 return effect;
}
function namedImpactChoices(pack,s,owner,name){
 return field(s.players[owner]).filter(c=>card(pack,c).type==='character'&&
  cardHasName(card(pack,c),name,originalEffectsDisabled(s,c))&&
  Number.isInteger(c.fieldEntryStamp)&&c.fieldEntryStamp>=1).map(c=>c.uid);
}
function tierRetireLimit(pack,s,owner,job){
 let limit=job.bp;
 const pl=s.players[owner];
 for(const tier of job.tiers){
  const present=tier.names.every(name=>field(pl).some(c=>
   cardHasName(card(pack,c),name,originalEffectsDisabled(s,c))));
  if(present)limit=Math.max(limit,tier.bp);
 }
 return limit;
}
function retireOppFrontLimit(pack,s,owner,job){
 if(!job.bonusName)return job.bp;
 const pl=s.players[owner];
 const same=name=>String(name).replace(/\s+/g,'');
 const matchesName=(physical,name,silenced)=>{
  const d=card(pack,physical);
  return [d.name,...(silenced?[]:d.nameAliases||[])].some(n=>same(n)===same(name));
 };
 const hasField=field(pl).some(c=>matchesName(c,job.bonusName,originalEffectsDisabled(s,c)));
 const hasOutside=!!job.bonusOutsideName&&pl.outside.some(c=>matchesName(c,job.bonusOutsideName,false));
 return hasField||hasOutside?job.bonusBp:job.bp;
}
function enemyDownAvailable(pack,s,owner,step,sourceUid){
 const foe=s.players[1-owner];
 const zones=step.zone==='field'?[...foe.front,...foe.energy]:foe.front;
 return zones.some(x=>x&&
  (step.zone!=='field'||card(pack,x).type==='character')&&
  (step.minBp===undefined||bp(pack,s,x)>=step.minBp)&&
  (step.maxBp===undefined||bp(pack,s,x)<=step.maxBp)&&
  cardEffectTargetPayable(pack,s,owner,x.uid,0,sourceUid));
}
function eventMandatoryTargetsAvailable(pack,s,owner,d,reservedAp=d.ap,reservedHandUid=null){
 const enemy=s.players[1-owner];
 return (d.effects?.onPlay||[]).every(job=>{
  if(job.op==='retireOppFrontTiered'){
   const limit=tierRetireLimit(pack,s,owner,job);
   return enemy.front.some(c=>c&&bp(pack,s,c)<=limit&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  }
  if(job.op==='buffNamedImpactDraw')
   return namedImpactChoices(pack,s,owner,job.name).length>0;
  if(job.op==='retireOppFrontAtLeastBp')
   return enemy.front.some(c=>c&&bp(pack,s,c)>=job.bp&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  if(job.op==='retireOppFrontAtMostBp'||job.op==='restOrRetireFrontAtMost')
   return enemy.front.some(c=>c&&bp(pack,s,c)<=job.bp&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
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
  if(job.op==='buffOwnField')
   return field(s.players[owner]).some(c=>c&&card(pack,c).type==='character'&&
    (!job.excludeSelf||c.uid!==job.sourceUid)&&matchesBuffTarget(pack,s,c,job));
  return true;
 });
}
// Q2062 is a cost of SELECTING a protected character by a CARD EFFECT,
// not a cost of playing a card, attacking or blocking.
// The existing pending action is the exact resolution boundary; no new queue.
function enteredByOwnEffect(s,owner,uid){
 return s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===owner&&e.uid===uid&&
  (e.to==='front'||e.to==='energy')&&e.reason==='own-effect');
}
function oppFrontMoveChoices(pack,s,owner,sourceUid){
 const foe=s.players[1-owner];
 if(!legalDestinations(foe,'energy').length)return [];
 return foe.front.filter(c=>c&&card(pack,c).type==='character'&&
  cardEffectTargetPayable(pack,s,owner,c.uid,0,sourceUid)).map(c=>c.uid);
}
function cannotMoveLocked(s,owner,c){
 return s.continuousStates.some(e=>e.kind==='cannotMove'&&!e.consumed&&
  e.targetOwner===owner&&e.targetUid===c.uid&&e.targetStamp===c.fieldEntryStamp);
}
const TARGETING_CARD_EFFECT_CHOICES=new Set([
 'chooseRetireBp','chooseRetireAtLeast','chooseRetireAtMost','chooseRetireScaled','chooseRestOrRetire','chooseRestBp','chooseRestOutsideEvents','chooseRestedRetire','chooseTarget','chooseTargetMany','chooseNamedOutsideBounceRetire',
 'chooseRaidTopStrip','chooseAttackBan','chooseRestLock','chooseEitherBuff','chooseMoveOppFront','chooseUnblockedRest','chooseRetireReferenced'
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
  card(pack,c).type==='character'&&!card(pack,c).frontForbidden&&!cannotMoveLocked(s,p,c)))
   for(const choice of legalDestinations(pl,'front'))out.push({type:'move',uid:c.uid,...choice});
  for(const c of pl.front.filter(c=>c&&!s.movedUids.includes(c.uid)&&card(pack,c).step&&
   !originalEffectsDisabled(s,c)&&!cannotMoveLocked(s,p,c)))
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
   if(ability?.op==='revealHandBottomBuff'&&pl.hand.length>0&&
    !s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'revealBottomBuff'});
   if(ability?.op==='revealHandBottomImpact'&&pl.hand.length>0&&
    !s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'revealBottomImpact'});
   if(ability?.op==='restLeaveRevealRetire'&&d.type==='field'&&c.ready&&
    pl.hand.length&&!s.mainReadyOnceByName[p].includes(d.name))
    out.push({type:'activate',uid:c.uid,mode:'restLeaveReveal'});
   if(ability?.op==='handOutsideBlockAtLeast'&&d.type==='character'&&
    pl.hand.length&&!s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'handBlock'});
   if(ability?.op==='sniperThenRaidBaseOutside'&&d.type==='character'&&
    !s.mainAbilityUsedUids.includes(c.uid)&&Number.isInteger(c.fieldEntryStamp)&&
    c.fieldEntryStamp>=1)
    out.push({type:'activate',uid:c.uid,mode:'sniperRaidBase'});
   if(ability?.op==='oncePayProgram'&&!s.mainAbilityUsedUids.includes(c.uid)){
    const onFront=pl.front.some(x=>x?.uid===c.uid);
    const placed=onFront||pl.energy.some(x=>x?.uid===c.uid);
    const lineOk=ability.frontOnly?onFront:placed;
    const raidOk=!ability.raidOnly||(c.stack||[]).length>0;
    const apOk=!ability.payAp||pl.apCards.some(x=>x.ready);
    const nameOk=!ability.requiresOwnName||ownFieldHasPrintedName(pack,s,p,ability.requiresOwnName);
    const payOk=ability.then[0]?.op!=='discardGate'||pl.hand.length>0;
    const downOk=ability.then[0]?.op!=='enemyBpDown'||
     enemyDownAvailable(pack,s,p,ability.then[0],c.uid);
    if(lineOk&&raidOk&&apOk&&nameOk&&payOk&&downOk)
     out.push({type:'activate',uid:c.uid,mode:'oncePay'});
   }
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
   if(ability?.op==='restRetireRecoverUnder'&&c.ready)
    out.push({type:'activate',uid:c.uid,mode:'restRetireUnder'});
   if(ability?.op==='entryTurnProtect'&&c.entryTurn===s.turn&&
    !s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'entryProtect'});
   if(ability?.op==='restTwoActiveFrontMoveSelf'&&ability.line==='energy'&&
    pl.front.filter(x=>x?.ready&&card(pack,x).type==='character').length>=2&&
    pl.front.some(x=>!x))
    out.push({type:'activate',uid:c.uid,mode:'restTwoMove'});
   if(ability?.op==='energySwapOwnFront'&&ability.line==='energy'&&
    !s.mainAbilityUsedUids.includes(c.uid)&&
    pl.front.some(x=>x&&card(pack,x).type==='character'))
    out.push({type:'activate',uid:c.uid,mode:'energySwap'});
   if(ability?.op==='restSelfThen'&&ability.frontOnly===false&&c.ready&&
    !(ability.oncePerTurn&&s.mainAbilityUsedUids.includes(c.uid)))
    out.push({type:'activate',uid:c.uid,mode:'selfRestThen'});
   if(ability?.op==='frontOnceProgram'&&ability.frontOnly===false&&
    !s.mainAbilityUsedUids.includes(c.uid)){
    const step=ability.then[0];
    if(step.op==='discardGate'&&!payableHand(pack,s,p,step.payment).length)continue;
    if(step.op==='restOppFrontUnderBp'&&!s.players[1-p].front.some(x=>x&&
     bp(pack,s,x)<=step.bp&&cardEffectTargetPayable(pack,s,p,x.uid,0,c.uid)))continue;
    out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
   }
  }
  for(const c of pl.front.filter(Boolean)){
   const d=card(pack,c),ability=originalEffectsDisabled(s,c)?null:d.mainAbility;
   if(!ability)continue;
   if(ability.op==='restRetireRecoverUnder'){
    if(c.ready)out.push({type:'activate',uid:c.uid,mode:'restRetireUnder'});
    continue;
   }
   if(ability.op==='entryTurnProtect'){
    if(c.entryTurn===s.turn&&!s.mainAbilityUsedUids.includes(c.uid))
     out.push({type:'activate',uid:c.uid,mode:'entryProtect'});
    continue;
   }
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
    // A READY source pays its REST cost first. oncePerTurn is the printed
    // ターン1. frontOnly false may also be paid from the energy line.
    if(c.ready&&!(ability.oncePerTurn&&s.mainAbilityUsedUids.includes(c.uid)))
     out.push({type:'activate',uid:c.uid,mode:'selfRestThen'});
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
   if(ability.op==='restedFrontRetireReadyImpact'){
    if(!c.ready&&!s.mainAbilityUsedUids.includes(c.uid))
     out.push({type:'activate',uid:c.uid,mode:'restedRetireImpact'});
    continue;
   }
   if(ability.op==='frontOnceGrantImpactNamed'){
    if(!s.mainAbilityUsedUids.includes(c.uid)&&
     namedFieldImpactChoices(pack,s,p,c.uid,ability.names).length)
     out.push({type:'activate',uid:c.uid,mode:'grantNamedImpact'});
    continue;
   }
   if(ability.op==='frontOnceProgram'){
    if(s.mainAbilityUsedUids.includes(c.uid))continue;
    // 〈A〉と〈B〉がある場合のみ. Both names are own field characters.
    if(Array.isArray(ability.requireAllNames)){
     if(matchesV2LiveCondition(s,p,c.uid,{kind:'ownFieldHasAllNames',turn:'any',
      zone:'field',excludeSelf:false,names:ability.requireAllNames},x=>card(pack,x)))
      out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    // 自分の効果でアクティブからレストになったことがある場合のみ.
    if(ability.requireOwnEffectRest===true){
     if(restedByOwnEffectThisTurn(s,p,c))
      out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    // Non-attack FRONT ability never requires an opponent target to activate.
    if(ability.then.length===2&&ability.then[0].op==='drawDiscard'&&
     ability.then[1].op==='grantFrontEnergyOwnOtherFrontTrait'){
     out.push({type:'activate',uid:c.uid,mode:'frontOnce'});continue;
    }
    const step=ability.then[0];
    if(step.op==='activeSelf'){
     out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    if(step.op==='handTopBuffSelf'){
     if(pl.hand.length)out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    if(step.op==='restOwnActiveFrontDraw'){
     if(pl.front.some(x=>x?.ready&&card(pack,x).type==='character'))
      out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    if(step.op==='buffEitherField'){
     out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    if(step.op==='discardGate'&&!payableHand(pack,s,p,step.payment).length)continue;
    if(step.op==='restOppFrontUnderBp'){
     const ok=s.players[1-p].front.some(x=>x&&bp(pack,s,x)<=step.bp&&
      cardEffectTargetPayable(pack,s,p,x.uid,0,c.uid));
     if(ok)out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
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
   const raidPayment=d.raidName?handPlayApPlan(s,p,d,{raid:true,uid:c.uid}):null;
   const requiredEnergy=effectiveHandRequiredEnergy(pack,s,p,d);
   const energyOk=requiredEnergy<=(produced[d.color]||0);
   if(energyOk&&payment.cost<=ap){
   if(d.type==='event'){
    if((!d.playRequiresOwnName||ownFieldHasPrintedName(pack,s,p,d.playRequiresOwnName))&&
     eventMandatoryTargetsAvailable(pack,s,p,d,payment.cost,c.uid))
     out.push({type:'event',uid:c.uid});
   }
   else for(const line of ['energy','front']){
    if(line==='front'&&(d.type!=='character'||d.frontForbidden))continue;
    for(const choice of legalDestinations(pl,line))
     out.push({type:'play',uid:c.uid,line,...choice});
   }
   }
   if(energyOk&&raidPayment&&raidPayment.cost<=ap&&d.raidName){
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
 if(s.phase==='main')for(const c of pl.hand){
  const d=card(pack,c),ability=d.mainAbility;
  if(ability?.op!=='handPayRevealDeploy'||ability.payAp!==1)continue;
  if(!pl.apCards.some(x=>x.ready))continue;
  if((universalEnergyByColor(pack,s,p)[d.color]||0)<d.energy)continue;
  const shown=handRevealIdentity(d);
  const bonus=shown.type==='character'?handCharacterBpMayAmount(pack,s,p):0;
  const could=shown.type==='character'&&Number.isInteger(shown.bp)&&
   (shown.bp>=ability.minReferencedBp||bonus>0&&shown.bp+bonus>=ability.minReferencedBp);
  const room=['front','energy'].some(line=>legalDestinations(pl,line).length);
  if(could&&!room)continue;
  out.push({type:'handActivate',uid:c.uid,mode:'handPayReveal'});
 }
 if(s.phase==='attack')for(const c of pl.front.filter(c=>c?.ready&&
  card(pack,c).type==='character'&&
  !fieldRestrictions(s,p,c).some(r=>r.kind==='cannotAttack'))){
  out.push({type:'attack',uid:c.uid});
  if(hasCurrentBattleGrant(s,c,'sniperGranted'))for(const target of
   s.players[1-p].front.filter(t=>t&&card(pack,t).type==='character'&&
    Number.isInteger(t.fieldEntryStamp)&&t.fieldEntryStamp>0&&
    (c.sniperGranted.maxBp===undefined||bp(pack,s,t)<c.sniperGranted.maxBp)))
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
  (matchingOpponent?profile.amount:0)-
  (d.printedHandEnergyDiscount||0)-
  nextNamedHandEnergyCut(s,p,d));
}
function nextNamedHandEnergyCut(s,p,d){
 const list=s.players[p]?.nextNamedHandEnergy;
 if(!Array.isArray(list)||!d)return 0;
 return list.reduce((n,e)=>n+(e&&e.turn===s.turn&&e.color===d.color&&
  cardHasName(d,e.name)?e.amount:0),0);
}
function consumeNextNamedHandEnergy(s,owner,d){
 const pl=s.players[owner];
 if(!Array.isArray(pl.nextNamedHandEnergy)||
  !pl.nextNamedHandEnergy.some(e=>cardHasName(d,e.name)))return;
 pl.nextNamedHandEnergy=pl.nextNamedHandEnergy.filter(e=>!cardHasName(d,e.name));
}
function spendAp(pl,n){
 let remaining=n;for(const c of pl.apCards)if(c.ready&&remaining){c.ready=false;remaining--;}
 if(remaining)throw Error('Insufficient AP');
}
function noteEffectApPaid(pack,s,owner,sourceUid){
 const pl=s.players[owner];
 const physical=[...field(pl),...pl.outside,...(pl.resolvingEvents||[]),...pl.hand,...pl.removed]
  .find(c=>c.uid===sourceUid);
 if(!physical)return;
 const color=card(pack,physical).color;
 const list=s.effectApPaidColors[owner];
 if(list&&!list.includes(color))list.push(color);
}
function ownFieldHasPrintedName(pack,s,owner,name){
 return field(s.players[owner]).some(c=>cardHasName(card(pack,c),name,originalEffectsDisabled(s,c)));
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
     s.effectQueue.push({op:'openEnergyMoveGrants',owner:p});
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
   if(ability.op==='restRetireRecoverUnder'){
    if(action.mode!=='restRetireUnder'||!selected.ready)
     throw Error('Under recovery requires an ACTIVE source');
    const pos=location(s,p,selected.uid);
    const buried=(selected.under||[]).filter(x=>x.faceDown===true).map(x=>x.uid);
    noteOwnEffectRest(s,p,selected);
    selected.ready=false;
    const paused=retire(pack,s,p,pos.line,pos.slot);
    const outside=buried.filter(uid=>pl.outside.some(c=>c.uid===uid));
    if(!paused&&outside.length)s.pending={kind:'effect-recover-under',player:p,
     sourceUid:selected.uid,choices:outside};
    else if(!paused)continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='entryTurnProtect'){
    if(action.mode!=='entryProtect'||selected.entryTurn!==s.turn||
     s.mainAbilityUsedUids.includes(selected.uid))
     throw Error('Entry-turn protection is not legal');
    const choices=field(pl).filter(c=>card(pack,c).type==='character').map(c=>c.uid);
    if(!choices.length)throw Error('Entry-turn protection has no character');
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'effect-entry-protect',player:p,sourceUid:selected.uid,choices};
    break;
   }
   if(ability.op==='fieldRestRetireThen'){
    if(action.mode!=='fieldRestTrueRetireDeploy'||!selected.ready||
     !pl.energy.some(c=>c?.uid===selected.uid)||d.type!=='field')
     throw Error('FIELD REST+true-retire MAIN requires ACTIVE own ENERGY FIELD');
    noteOwnEffectRest(s,p,selected);
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
     noteOwnEffectRest(s,p,selected);
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
    noteOwnEffectRest(s,p,selected);
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
   if(ability.op==='revealHandBottomBuff'){
    if(action.mode!=='revealBottomBuff'||!pl.hand.length||
     s.mainAbilityUsedUids.includes(selected.uid)||
     !Number.isInteger(selected.fieldEntryStamp)||selected.fieldEntryStamp<1)
     throw Error('Reveal-to-bottom MAIN requires an unused source and one hand card');
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'effect-reveal-bottom',player:p,sourceUid:selected.uid,
     sourceStamp:selected.fieldEntryStamp,choices:pl.hand.map(c=>c.uid),
     minPrintedBp:ability.minPrintedBp,bp:ability.bp};
    break;
   }
   if(ability.op==='revealHandBottomImpact'){
    if(action.mode!=='revealBottomImpact'||!pl.hand.length||
     s.mainAbilityUsedUids.includes(selected.uid)||
     !Number.isInteger(selected.fieldEntryStamp)||selected.fieldEntryStamp<1)
     throw Error('Reveal-to-bottom MAIN requires an unused source and one hand card');
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'effect-reveal-bottom',player:p,sourceUid:selected.uid,
     sourceStamp:selected.fieldEntryStamp,choices:pl.hand.map(c=>c.uid),
     minPrintedBp:ability.minPrintedBp,impact:ability.impact};
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
    noteOwnEffectRest(s,p,selected);
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
    noteOwnEffectRest(s,p,selected);
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
    noteEffectApPaid(pack,s,p,selected.uid);
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
    noteOwnEffectRest(s,p,selected);
    selected.ready=false;
    s.pending={kind:'effect-buff-own',player:p,sourceUid:selected.uid,choices,
     filter:{field:'type',value:'character'},bp:ability.bp,optional:false,excludeSelf:true};
    break;
   }
   if(ability.op==='restSelfThen'){
    const onFront=pl.front.some(c=>c?.uid===selected.uid);
    const placed=onFront||pl.energy.some(c=>c?.uid===selected.uid);
    if(action.mode!=='selfRestThen'||!selected.ready||
     !(ability.frontOnly===false?placed:onFront)||
     (ability.oncePerTurn&&s.mainAbilityUsedUids.includes(selected.uid)))
     throw Error('REST main action requires a READY source');
    noteOwnEffectRest(s,p,selected);
    selected.ready=false;
    if(ability.oncePerTurn)s.mainAbilityUsedUids.push(selected.uid);
    // Use only the existing common queue; title adapters never execute effects.
    s.effectQueue.push(...ability.then.map(e=>({...e,owner:p,
     sourceUid:selected.uid,sourceName:d.name})),
     ...sourceMoveBoundary(pack,s,p,selected.uid));
    continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='oncePayProgram'){
    const onFront=pl.front.some(c=>c?.uid===selected.uid);
    const placed=onFront||pl.energy.some(c=>c?.uid===selected.uid);
    if(action.mode!=='oncePay'||s.mainAbilityUsedUids.includes(selected.uid)||
     !(ability.frontOnly?onFront:placed)||
     (ability.raidOnly&&!(selected.stack||[]).length)||
     (ability.payAp&&!pl.apCards.some(c=>c.ready))||
     (ability.requiresOwnName&&!ownFieldHasPrintedName(pack,s,p,ability.requiresOwnName))||
     (ability.then[0]?.op==='discardGate'&&!pl.hand.length)||
     (ability.then[0]?.op==='enemyBpDown'&&!enemyDownAvailable(pack,s,p,ability.then[0],selected.uid)))
     throw Error('Once-pay program is not legal');
    if(ability.payAp){
     spendAp(pl,ability.payAp);
     noteEffectApPaid(pack,s,p,selected.uid);
    }
    s.mainAbilityUsedUids.push(selected.uid);
    s.effectQueue.push(...ability.then.map(e=>({...e,owner:p,
     sourceUid:selected.uid,sourceName:d.name})),
     ...sourceMoveBoundary(pack,s,p,selected.uid));
    continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='frontOnceGrantImpactNamed'){
    const onFront=pl.front.some(c=>c?.uid===selected.uid);
    const choices=namedFieldImpactChoices(pack,s,p,selected.uid,ability.names);
    if(action.mode!=='grantNamedImpact'||!onFront||
     s.mainAbilityUsedUids.includes(selected.uid)||!choices.length||
     ability.excludeSelf!==true)
     throw Error('Named impact grant is not legal');
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'effect-grant-named-impact',player:p,sourceUid:selected.uid,
     sourceStamp:selected.fieldEntryStamp,choices,names:[...ability.names],optional:true};
    break;
   }
   if(ability.op==='restedFrontRetireReadyImpact'){
    const onFront=pl.front.some(c=>c?.uid===selected.uid);
    if(action.mode!=='restedRetireImpact'||!onFront||selected.ready!==false||
     s.mainAbilityUsedUids.includes(selected.uid)||ability.frontOnly!==true||
     ability.oncePerTurn!==true||ability.bp!==1500)
     throw Error('Rested front retirement is not legal');
    s.mainAbilityUsedUids.push(selected.uid);
    const choices=s.players[1-p].front.filter(c=>c&&bp(pack,s,c)<=ability.bp&&
     cardEffectTargetPayable(pack,s,p,c.uid,0,selected.uid)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-rested-retire-impact',player:p,
     sourceUid:selected.uid,sourceStamp:selected.fieldEntryStamp,choices,
     ceiling:ability.bp,optional:true};
    else{
     selected.ready=true;
     selected.impactGranted={turn:s.turn,stamp:selected.fieldEntryStamp,amount:1};
    }
    break;
   }
   if(ability.op==='frontOnceProgram'){
    const onFront=pl.front.some(c=>c?.uid===selected.uid);
    const onEnergy=pl.energy.some(c=>c?.uid===selected.uid);
    if(action.mode!=='frontOnce'||s.mainAbilityUsedUids.includes(selected.uid)||
     !(ability.frontOnly===false?onFront||onEnergy:onFront))
     throw Error('Front once-per-turn program is not legal');
    if(Array.isArray(ability.requireAllNames)&&!matchesV2LiveCondition(s,p,selected.uid,{
     kind:'ownFieldHasAllNames',turn:'any',zone:'field',excludeSelf:false,
     names:ability.requireAllNames},x=>card(pack,x)))
     throw Error('Front once-per-turn program requires every printed name');
    const step=ability.then[0];
    if(step.op==='discardGate'&&!payableHand(pack,s,p,step.payment).length)
     throw Error('Front once-per-turn program requires a matching hand payment');
    if(step.op==='handTopBuffSelf'&&!pl.hand.length)
     throw Error('Front once-per-turn program requires one hand card');
    if(step.op==='restOwnActiveFrontDraw'&&
     !pl.front.some(x=>x?.ready&&card(pack,x).type==='character'))
     throw Error('Front once-per-turn program requires an active front character');
    if(ability.requireOwnEffectRest===true&&!restedByOwnEffectThisTurn(s,p,selected))
     throw Error('Front once-per-turn program requires an own-effect rest');
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
    noteOwnEffectRest(s,p,selected);
    selected.ready=false;
    s.pending={kind:'effect-rest-bp',player:p,sourceUid:selected.uid,
     choices:targets,limit:null,optional:false};
    break;
   }
   if(ability.op==='restLeaveRevealRetire'){
    if(action.mode!=='restLeaveReveal'||d.type!=='field'||!selected.ready||
     !pl.hand.length||s.mainReadyOnceByName[p].includes(d.name)||
     !field(pl).some(c=>c.uid===selected.uid))
     throw Error('Rest leave reveal is not legal');
    noteOwnEffectRest(s,p,selected);
    selected.ready=false;
    s.mainReadyOnceByName[p].push(d.name);
    const choices=pl.hand.map(c=>c.uid);
    const pos=location(s,p,selected.uid);
    const paused=retire(pack,s,p,pos.line,pos.slot);
    if(!paused)s.pending={kind:'effect-reveal-retire',player:p,sourceUid:selected.uid,
     choices,name:d.name};
    break;
   }
   if(ability.op==='sniperThenRaidBaseOutside'){
    if(action.mode!=='sniperRaidBase'||d.type!=='character'||
     s.mainAbilityUsedUids.includes(selected.uid)||
     !Number.isInteger(selected.fieldEntryStamp)||selected.fieldEntryStamp<1)
     throw Error('Sniper raid-base exile is not legal');
    s.mainAbilityUsedUids.push(selected.uid);
    selected.sniperGranted={turn:s.turn,stamp:selected.fieldEntryStamp,maxBp:ability.maxBp};
    if(strippableRaidTop(pack,selected)){
     const base=selected.stack[0];
     selected.stack=[];
     const physical={...base,stack:[],under:[],buffs:[],ready:false,faceDown:false,fieldEntryStamp:null};
     delete physical.ownEffectFront;delete physical.attackDamageGranted;delete physical.impactPlus;
     pl.outside.push(physical);
     recordCompletedMove(pack,s,{physical,owner:p,from:'raid-under',to:'outside',
      reason:'own-effect',sourceUid:selected.uid});
    }
    break;
   }
   if(ability.op==='handOutsideBlockAtLeast'){
    if(action.mode!=='handBlock'||d.type!=='character'||!pl.hand.length||
     s.mainAbilityUsedUids.includes(selected.uid)||
     !Number.isInteger(selected.fieldEntryStamp)||selected.fieldEntryStamp<1)
     throw Error('Hand block grant is not legal');
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'effect-hand-block',player:p,sourceUid:selected.uid,
     sourceStamp:selected.fieldEntryStamp,bp:ability.bp,choices:pl.hand.map(c=>c.uid)};
    break;
   }
   if(ability.op==='energySwapOwnFront'){
    const choices=pl.front.filter(x=>x&&card(pack,x).type==='character').map(x=>x.uid);
    if(action.mode!=='energySwap'||!pl.energy.some(x=>x?.uid===selected.uid)||
     s.mainAbilityUsedUids.includes(selected.uid)||!choices.length)
     throw Error('Energy-line swap is not legal');
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'effect-energy-swap',player:p,sourceUid:selected.uid,
     sourceStamp:selected.fieldEntryStamp,choices};
    break;
   }
   if(ability.op==='restTwoActiveFrontMoveSelf'){
    const ready=pl.front.filter(x=>x?.ready&&card(pack,x).type==='character');
    if(action.mode!=='restTwoMove'||!pl.energy.some(x=>x?.uid===selected.uid)||
     ready.length<2||!pl.front.some(x=>!x))
     throw Error('Two ready front characters and an empty front slot are required');
    s.pending={kind:'effect-rest-two',player:p,sourceUid:selected.uid,
     choices:ready.map(x=>x.uid),selected:[]};
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
  case 'handActivate':{
   if(action.mode!=='handPayReveal')throw Error('Unsupported hand activation');
   const index=pl.hand.findIndex(c=>c.uid===action.uid);
   const selected=index>=0?pl.hand[index]:null;
   const ability=selected&&card(pack,selected).mainAbility;
   const shown=selected&&handRevealIdentity(card(pack,selected));
   const bonus=shown?.type==='character'?handCharacterBpMayAmount(pack,s,p):0;
   const could=shown?.type==='character'&&Number.isInteger(shown.bp)&&
    (shown.bp>=ability?.minReferencedBp||bonus>0&&shown.bp+bonus>=ability.minReferencedBp);
   const room=['front','energy'].some(line=>legalDestinations(pl,line).length);
   if(!selected||ability?.op!=='handPayRevealDeploy'||ability.payAp!==1||
    !pl.apCards.some(c=>c.ready)||
    (universalEnergyByColor(pack,s,p)[card(pack,selected).color]||0)<card(pack,selected).energy||
    (could&&!room))
    throw Error('Hand reveal deployment is not legal');
   spendAp(pl,1);
   noteEffectApPaid(pack,s,p,selected.uid);
   const printed=card(pack,selected);
   s.publicReveals.push({kind:'hand-activate',owner:p,title:titleOf(pack,p),
    cardId:selected.cardId,uid:selected.uid,trigger:printed.trigger||null,turn:s.turn});
   if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
   const meets=shown.type==='character'&&Number.isInteger(shown.bp)&&
    shown.bp>=ability.minReferencedBp;
   const boosted=bonus>0&&shown.bp+bonus>=ability.minReferencedBp;
   if(bonus&&meets!==boosted)s.pending={kind:'effect-hand-deploy-may',player:p,
    sourceUid:selected.uid,baseBp:shown.bp,amount:bonus,minBp:ability.minReferencedBp};
   else if(meets)s.pending={kind:'effect-hand-rest-entry',player:p,
    sourceUid:selected.uid,minBp:ability.minReferencedBp};
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
   const payment=handPlayApPlan(s,p,d,{raid:action.type==='raid',uid:current.uid});
   if(action.type==='event'&&d.playRequiresOwnName&&
    !ownFieldHasPrintedName(pack,s,p,d.playRequiresOwnName))
    throw Error('Event requires the printed own character');
   spendAp(pl,payment.cost);
   consumeNextNamedHandEnergy(s,p,d);
   s.continuousStates=s.continuousStates.filter(e=>!payment.ids.includes(e.id));
   if((action.type==='play'||action.type==='raid')&&payment.cost===0)
    s.handZeroApUses.push({turn:s.turn,owner:p,uid:current.uid,name:d.name});
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
   const attackGrant=attacker.readyOnAttackGranted;
   const grantedReady=!!attackGrant&&attackGrant.turn===s.turn&&
    attackGrant.stamp===attacker.fieldEntryStamp&&declared===1;
   if((keyword&&declared===keyword&&!originalEffectsDisabled(s,attacker))||grantedReady)
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
 if(s.pending&&(!playerIndex(s.pending.player)||!['phase-order','retirement-order','effect-move-order','effect-rest-tuck','effect-tuck-moved','effect-grant-cause','effect-hand-bottom','effect-pay-deploy-self','effect-deploy-self-active','effect-outside-hand-or-rest','effect-recover-under','effect-energy-front','effect-entry-protect','block','life-batch-order','life-trigger','effect-target','effect-target-many','effect-grant-attack','granted-attack-draw','effect-discard','end-hand-limit','effect-recover-ap','private-top-choice','private-top-place','effect-retire-bp','effect-retire-at-least','effect-retire-at-most','effect-retire-scaled','effect-hand-bp-may','effect-hand-deploy-may','effect-hand-outside-active','effect-named-duration','effect-top-take-one','effect-reveal-optional','effect-referenced-bp','effect-outside-referenced','effect-reveal-retire','effect-retire-referenced','effect-hand-block','effect-hand-rest-entry','effect-active-other','effect-rest-own-front-draw','effect-raid-base-rest','effect-rest-or-retire','effect-named-outside-bounce-retire','effect-optional-draw','effect-strip-raid-top','effect-retire-own-field','effect-retire-own-character','main-field-trait-retire','effect-rest-bp','effect-rest-outside-events','effect-rested-retire-impact','effect-hand-named-rest','effect-grant-named-impact','effect-attack-ban','effect-own-front-protect','effect-grant-ap-tax','effect-grant-front-energy','raid-effect-order','effect-buff-trait','effect-buff-own','effect-named-impact','effect-top-trait-event','effect-buff-either','effect-return-printed','effect-remove-named','effect-pay-named','effect-add-named','effect-reveal-bottom','effect-hand-top','effect-rest-front-ap','effect-discard-active','effect-active-own-named','effect-once-choice','main-two-buff','main-discard-buff','main-discard-self-retire','main-rest-front-energy','leave-replacement','effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-order','effect-recover-outside','effect-outside-rest','effect-outside-name-rest','effect-outside-traitless-rest','effect-named-zone-entry','effect-hand-rest','effect-hand-rest-or-raid','effect-optional-pay-ap','effect-bounce-own','effect-discard-cost','effect-discard-gate','effect-remove-outside','effect-selection-hand-payment','attack-end-swap','effect-choice-mode','recovered-self-entry','effect-optional-mill','effect-pay-ap-deploy','effect-top-trait-outside','effect-line-move','effect-line-slot','effect-rest-two','effect-self-front','effect-raid-leave','effect-rest-lock','effect-grant-block-at-least','effect-outside-printed-rest','effect-grant-printed-block','effect-move-opp-front','effect-unblocked-rest','effect-energy-swap','effect-may-draw-discard','effect-deck-named-play','effect-place-hand','effect-substitute-retire','effect-outside-printed-active','effect-bounce-include-self','effect-outside-rest-or-raid','effect-grant-bounce-instead','effect-hand-reenter-under'].includes(s.pending.kind)))
  throw Error('Invalid pending controller');
 if(!Array.isArray(s.raidedThisTurn)||s.raidedThisTurn.length!==2||
   s.raidedThisTurn.some(x=>typeof x!=='boolean')||
   !Array.isArray(s.mainAbilityUsedUids)||
   new Set(s.mainAbilityUsedUids).size!==s.mainAbilityUsedUids.length||
   !Array.isArray(s.mainReadyOnceByName)||s.mainReadyOnceByName.length!==2||
   s.mainReadyOnceByName.some(x=>!Array.isArray(x)||new Set(x).size!==x.length))
  throw Error('Invalid once-per-turn ability accounting');
 if(!Array.isArray(s.effectApPaidColors)||s.effectApPaidColors.length!==2||
  s.effectApPaidColors.some(x=>!Array.isArray(x)||new Set(x).size!==x.length||
   x.some(c=>!['blue','yellow','green','purple','red'].includes(c)))||
  !Array.isArray(s.handZeroApUses)||s.handZeroApUses.some(e=>!e||e.turn!==s.turn||
   ![0,1].includes(e.owner)||typeof e.uid!=='string'||typeof e.name!=='string'))
  throw Error('Invalid effect-AP or zero-AP hand-use ledger');
 if(!Array.isArray(s.turnEffectZoneMoves)||s.turnEffectZoneMoves.length!==2||
  s.turnEffectZoneMoves.some(x=>!x||typeof x!=='object'||
   Object.keys(x).length!==2||typeof x.handToOutside!=='boolean'||
   typeof x.outsideToHand!=='boolean'))
  throw Error('Invalid own-effect movement ledger');
 if(!Array.isArray(s.ownEffectRests)||s.ownEffectRests.length!==2||
  s.ownEffectRests.some((side,owner)=>!Array.isArray(side)||side.some(n=>
   !n||typeof n!=='object'||Array.isArray(n)||typeof n.uid!=='string'||
   !n.uid.startsWith(owner+'-')||!Number.isInteger(n.stamp)||n.stamp<1||
   n.turn!==s.turn||Object.keys(n).length!==3||
   Object.keys(n).some(k=>!['uid','stamp','turn'].includes(k)))))
  throw Error('Invalid own-effect rest ledger');
 for(let owner=0;owner<2;owner++){
  const list=s.players[owner].nextNamedHandEnergy;
  if(!Array.isArray(list)||list.length>4)throw Error('Invalid next named hand energy');
  for(const e of list){
   const owned=[...field(s.players[owner]),...s.players[owner].hand,
    ...s.players[owner].outside,...s.players[owner].removed];
   const source=owned.find(c=>c.uid===e?.sourceUid);
   const ability=source&&card(pack,source).mainAbility;
   const step=ability?.then?.[0];
   if(!e||e.name!=='エミリア'||e.color!=='purple'||e.amount!==1||e.turn!==s.turn||
    typeof e.sourceUid!=='string'||!e.sourceUid.startsWith(owner+'-')||
    !Number.isInteger(e.sourceStamp)||e.sourceStamp<1||
    Object.keys(e).length!==6||
    Object.keys(e).some(k=>!['name','color','amount','turn','sourceUid','sourceStamp'].includes(k))||
    !s.mainAbilityUsedUids.includes(e.sourceUid)||
    !s.ownEffectRests[owner].some(n=>n.uid===e.sourceUid&&n.stamp===e.sourceStamp&&n.turn===s.turn)||
    ability?.op!=='frontOnceProgram'||ability.requireOwnEffectRest!==true||
    ability.frontOnly!==true||ability.oncePerTurn!==true||
    step?.op!=='discountNextNamedHandEnergy'||step.name!==e.name||
    step.color!==e.color||step.amount!==e.amount)
    throw Error('Forged next named hand energy');
  }
  const flag=s.players[owner].handCharacterBpMay;
  if(flag!==null){
   const source=s.players[owner].outside.find(c=>c.uid===flag?.sourceUid);
   const program=source&&card(pack,source).effects?.onPlay||[];
   const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===owner&&
    e.uid===flag?.sourceUid&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule');
   if(!source||card(pack,source).type!=='event'||flag.turn!==s.turn||flag.amount!==1000||
    typeof flag.sourceUid!=='string'||!flag.sourceUid.startsWith(owner+'-')||
    Object.keys(flag).length!==3||
    Object.keys(flag).some(k=>!['turn','amount','sourceUid'].includes(k))||
    !program.some(e=>e.op==='retireOppFrontAtMostBp'&&e.bp===5000)||
    !program.some(e=>e.op==='grantHandCharacterBpMay'&&e.amount===1000)||!moved)
    throw Error('Forged hand character BP option');
  }
 }
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
   const keys=g&&typeof g==='object'&&!Array.isArray(g)?Object.keys(g):[];
   const turnOk=!!g&&Number.isInteger(g.turn)&&g.turn>=0&&g.turn<=s.turn&&
    Number.isInteger(g.stamp)&&g.stamp>=1&&g.stamp<s.nextFieldEntryStamp;
   if(key==='sniperGranted'){
    const printed=card(pack,physical);
    const plain=keys.length===2&&keys.every(k=>k==='turn'||k==='stamp')&&
     printed.effects.onPlay?.some(x=>x.op===op);
    const capped=keys.length===3&&g.maxBp===4000&&
     keys.every(k=>k==='turn'||k==='stamp'||k==='maxBp')&&
     printed.mainAbility?.op==='sniperThenRaidBaseOutside'&&
     printed.mainAbility.maxBp===4000;
    if(!turnOk||!(plain||capped))throw Error('Forged temporary physical battle grant');
    continue;
   }
   if(!turnOk||keys.length!==2||keys.some(k=>k!=='turn'&&k!=='stamp')||
    !card(pack,physical).effects.onPlay?.some(x=>x.op===op))
    throw Error('Forged temporary physical battle grant');
  }
 for(let owner=0;owner<2;owner++)for(const physical of field(s.players[owner])){
  const g=physical.bounceInsteadGranted;
  if(g===undefined)continue;
  const pl=s.players[owner];
  const source=[...field(pl),...pl.hand,...pl.outside,...pl.deck,...pl.life,
   ...(pl.removed||[])].find(c=>c.uid===g?.sourceUid);
  const proved=!!source&&programContainsOp(card(pack,source),'onPlay','grantBounceInstead')&&
   cardHasName(card(pack,physical),'ナツキ・スバル',originalEffectsDisabled(s,physical));
  if(!g||typeof g!=='object'||Array.isArray(g)||Object.keys(g).length!==3||
   !Number.isInteger(g.untilOwnTurnStart)||g.untilOwnTurnStart!==pl.ownTurns+1||
   g.stamp!==physical.fieldEntryStamp||typeof g.sourceUid!=='string'||!proved||
   Object.keys(g).some(k=>!['untilOwnTurnStart','stamp','sourceUid'].includes(k)))
   throw Error('Forged bounce-instead grant');
 }
 for(let owner=0;owner<2;owner++)for(const physical of field(s.players[owner])){
  const floor=physical.blockFloorGranted;
  if(floor!==undefined){
   const proved=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.sourceUid===physical.uid&&
    e.from==='hand'&&e.to==='outside'&&(card(pack,{uid:e.uid,cardId:e.cardId}).moveTriggers||[])
     .some(t=>t.then.some(op=>op.op==='grantCauseBlockAtMost'&&op.bp===floor.bp)));
   if(!floor||floor.turn!==s.turn||floor.stamp!==physical.fieldEntryStamp||
    !Number.isInteger(floor.bp)||typeof floor.sourceUid!=='string'||!proved)
    throw Error('Forged caused blocker floor');
  }
  const readyGrant=physical.readyOnAttackGranted;
  if(readyGrant!==undefined){
   const caused=(s.zoneMoveEvents||[]).filter(e=>e.turn===s.turn&&e.sourceUid===physical.uid&&
    e.from==='hand'&&e.to==='outside'&&(card(pack,{uid:e.uid,cardId:e.cardId}).moveTriggers||[])
     .some(t=>t.then.some(op=>op.op==='handBottomGrantDoubleAttack')));
   const bottomed=caused.some(e=>(s.zoneMoveEvents||[]).some(n=>n.order>e.order&&
    n.from==='hand'&&n.to==='deck'&&n.sourceUid===e.uid&&n.reason==='own-effect'));
   if(!readyGrant||readyGrant.turn!==s.turn||readyGrant.stamp!==physical.fieldEntryStamp||!bottomed)
    throw Error('Forged double-attack grant');
  }
  for(const key of ['energyMoveOnAttackGranted','triggerUnchosenGranted']){
   const g=physical[key];
   if(g===undefined)continue;
   const op=key==='energyMoveOnAttackGranted'?'grantSelfEnergyMoveOnAttackStart':'grantSelfTriggerUnchosen';
   const printed=(card(pack,physical).mainAbility?.then||[]).some(step=>
    step.op===op||(step.then||[]).some(child=>child.op===op));
   if(!g||g.turn!==s.turn||g.stamp!==physical.fieldEntryStamp||!printed)
    throw Error('Forged this-turn self grant');
  }
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
  for(const buff of physical.buffs||[])if(buff.untilOwnTurnStart!==undefined){
   const printed=card(pack,physical);
   const selfGrant=Object.keys(buff).length===2&&
    Object.keys(buff).every(k=>['bp','untilOwnTurnStart'].includes(k));
   const fromOnPlay=selfGrant&&printed.effects.onPlay?.some(e=>e.op==='chooseOne'&&e.entry==='ownEffect'&&
    e.options.some(o=>o.then.some(t=>t.op==='buffSelfUntilNextOwnStart'&&t.bp===buff.bp)));
   // EX15BT/BLC-4-028 pays Rest once per turn and grants the same timed buff
   // from mainAbility. It is not an on-play chooseOne.
   const fromRestMain=selfGrant&&printed.mainAbility?.op==='restSelfThen'&&
    printed.mainAbility.oncePerTurn===true&&
    printed.mainAbility.then?.some(t=>t.op==='buffSelfUntilNextOwnStart'&&t.bp===buff.bp);
   // REZ-1-088 prints the same timed buff. The rest ledger is cleared when the
   // opponent's turn starts, while this buff stays until the owner's next start.
   const fromOwnEffectRest=selfGrant&&printed.mainAbility?.op==='frontOnceProgram'&&
    printed.mainAbility.requireOwnEffectRest===true&&
    printed.mainAbility.oncePerTurn===true&&printed.mainAbility.frontOnly===true&&
    printed.mainAbility.then?.some(t=>t.op==='buffSelfUntilNextOwnStart'&&t.bp===buff.bp);
   const namedGrant=Object.keys(buff).length===3&&typeof buff.sourceUid==='string'&&
    Object.keys(buff).every(k=>['bp','untilOwnTurnStart','sourceUid'].includes(k));
   const fromNamedEvent=namedGrant&&s.players[owner].outside.some(ev=>ev.uid===buff.sourceUid&&
    card(pack,ev).type==='event'&&card(pack,ev).effects?.onPlay?.some(e=>
     e.op==='buffNamedImpactDuration'&&e.bp===buff.bp&&e.impact===1&&
     cardHasName(printed,e.name,originalEffectsDisabled(s,physical))));
   if(!Number.isInteger(buff.untilOwnTurnStart)||
    buff.untilOwnTurnStart!==s.players[owner].ownTurns+1||
    !Number.isInteger(buff.bp)||buff.bp<1||buff.bp>5000||
    !(fromOnPlay||fromRestMain||fromOwnEffectRest||fromNamedEvent))
    throw Error('Forged next-own-start physical BP modifier');
  }
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
 // Hand REST-or-Raid and its optional AP gate must be earned by the printed
 // source program. A saved pending cannot name a card the print does not
 // allow, and cannot spend AP for a program the source does not print.
 if(s.pending?.kind==='effect-optional-pay-ap'||s.pending?.kind==='effect-hand-rest-or-raid'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.hand,...pl.outside,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...(pl.removed||[]),...(pl.resolvingEvents||[])];
  const src=owned.find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const walk=x=>{
   if(!x||typeof x!=='object')return false;
   if(Array.isArray(x))return x.some(walk);
   if(q.kind==='effect-optional-pay-ap'&&x.op==='optionalPayApThen'&&
    x.ap===q.ap&&x.optional===true&&same(x.then,q.then))return true;
   if(q.kind==='effect-hand-rest-or-raid'&&x.op==='deployOwnHandRestOrRaid'&&
    x.type===q.type&&x.color===q.color&&x.ap===q.ap&&x.maxEnergy===q.maxEnergy&&
    x.optional===true&&same(x.names,q.names)&&
    (x.requireAffordableEnergy===true)===(q.requireAffordableEnergy===true)&&
    Number.isInteger(q.max)&&q.max>=1&&q.max<=x.max)return true;
   return Object.values(x).some(walk);
  };
  const expected=q.kind==='effect-hand-rest-or-raid'?pl.hand.filter(c=>
   matchesHandRestOrRaid(pack,s,c,q)).map(c=>c.uid):null;
  const payKeys=['kind','player','sourceUid','sourceName','ap','then'];
  const handKeys=['kind','player','sourceUid','sourceName','choices','type','color',
   'ap','maxEnergy','names','max','optional','requireAffordableEnergy'];
  if(!printed||q.sourceName!==printed.name||!walk(printed.effects)||
   (expected&&(!Array.isArray(q.choices)||!same(q.choices,expected)))||
   Object.keys(q).length!==(q.kind==='effect-optional-pay-ap'?6:12+Number(q.requireAffordableEnergy===true))||
   Object.keys(q).some(k=>!(q.kind==='effect-optional-pay-ap'?payKeys:handKeys).includes(k)))
   throw Error('Invalid hand REST/Raid pending provenance');
 }
 if(s.pending?.kind==='effect-deck-named-play'||s.pending?.kind==='effect-place-hand'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.hand,...pl.outside,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...(pl.removed||[]),...(pl.resolvingEvents||[])];
  const src=owned.find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const walk=x=>{
   if(!x||typeof x!=='object')return false;
   if(Array.isArray(x))return x.some(walk);
   if(q.kind==='effect-deck-named-play'&&x.op==='revealTopHandOrAffordableNamed'&&
    same(x.names,q.names))return true;
   if(q.kind==='effect-place-hand'&&x.op==='drawThenPlaceHand')return true;
   return Object.values(x).some(walk);
  };
  const top=pl.deck[0];
  const playable=q.kind==='effect-deck-named-play'&&top&&top.uid===q.uid&&
   revealedDeckPlayable(pack,s,q.player,top,q.names);
  const keys=q.kind==='effect-deck-named-play'
   ?['kind','player','sourceUid','sourceName','uid','names']
   :['kind','player','sourceUid','sourceName'];
  if(!printed||q.sourceName!==printed.name||!walk(printed.effects)||
   (q.kind==='effect-deck-named-play'&&!playable)||
   (q.kind==='effect-place-hand'&&!pl.hand.length)||
   Object.keys(q).length!==keys.length||
   Object.keys(q).some(k=>!keys.includes(k)))
   throw Error(q.kind==='effect-deck-named-play'?
    'Invalid revealed deck play pending':'Invalid hand placement pending');
 }
 if(s.pending?.kind==='effect-active-own-named'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.hand,...pl.outside,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...(pl.removed||[])];
  const src=owned.find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const walk=x=>{
   if(!x||typeof x!=='object')return false;
   if(Array.isArray(x))return x.some(walk);
   if(x.op==='activeOwnNamed'&&x.name===q.name&&x.optional===true&&x.max===q.max)return true;
   return Object.values(x).some(walk);
  };
  const expected=field(pl).filter(c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  if(!printed||q.sourceName!==printed.name||!walk(printed.effects)||
   !q.sourceUid.startsWith(q.player+'-')||!Array.isArray(q.choices)||
   !same(q.choices,expected)||q.optional!==true||q.max!==1||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','choices','optional','max'].includes(k)))
   throw Error('Invalid named own ACTIVE pending provenance');
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
 if(s.pending?.kind==='effect-named-impact'){
  const q=s.pending;
  const printed=namedImpactPrint(pack,s,q.player,q);
  const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.uid===q.sourceUid&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule');
  const choices=namedImpactChoices(pack,s,q.player,q.name);
  if(!printed||!moved||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','bp','impactPlus','draw'].includes(k)))
   throw Error('Invalid named impact draw pending');
 }
 if(s.pending?.kind==='effect-retire-at-least'){
  const q=s.pending;
  const choices=s.players[1-q.player].front.filter(c=>c&&bp(pack,s,c)>=4500&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  if(q.optional===true){
   const source=field(s.players[q.player]).find(c=>c.uid===q.sourceUid);
   const pay=source&&card(pack,source).effects?.onPlay?.find(e=>
    e.op==='optionalPayApThen'&&e.ap===1&&e.optional===true&&e.ownTurn===true&&
    e.then?.some(x=>x.op==='retireOppFrontAtLeastBp'&&x.bp===4500&&x.optional===true));
   const paid=(s.effectApPaidColors?.[q.player]||[]).includes(source&&card(pack,source).color);
   if(!pay||card(pack,source).type!=='character'||q.floor!==4500||!paid||
    !choices.length||!same(q.choices,choices)||
    Object.keys(q).length!==6||
    Object.keys(q).some(k=>!['kind','player','sourceUid','choices','floor','optional'].includes(k)))
    throw Error('Invalid minimum-BP retirement pending');
  }else{
   const source=s.players[q.player].outside.find(c=>c.uid===q.sourceUid);
   const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
    e.op==='retireOppFrontAtLeastBp'&&e.bp===4500&&e.optional===undefined);
   const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
    e.uid===q.sourceUid&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule');
   if(!effect||card(pack,source).type!=='event'||q.floor!==4500||!moved||
    !choices.length||!same(q.choices,choices)||
    Object.keys(q).length!==5||
    Object.keys(q).some(k=>!['kind','player','sourceUid','choices','floor'].includes(k)))
    throw Error('Invalid minimum-BP retirement pending');
  }
 }
 if(s.pending?.kind==='effect-retire-at-most'){
  const q=s.pending;
  const source=s.players[q.player].outside.find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='retireOppFrontAtMostBp'&&e.bp===5000);
  const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.uid===q.sourceUid&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule');
  const choices=s.players[1-q.player].front.filter(c=>c&&bp(pack,s,c)<=5000&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  if(!effect||card(pack,source).type!=='event'||q.ceiling!==5000||!moved||
   !choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','ceiling'].includes(k)))
   throw Error('Invalid maximum-BP retirement pending');
 }
 if(s.pending?.kind==='effect-retire-scaled'){
  const q=s.pending;
  const source=field(s.players[q.player]).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='retireOppFrontScaledBp'&&e.base===1000&&e.step===1000&&
   e.name==='ナツキ・スバル'&&e.color==='blue'&&e.energy===0&&e.optional===true);
  const ceiling=effect&&scaledFrontCeiling(pack,s,q.player,effect);
  const choices=s.players[1-q.player].front.filter(c=>c&&bp(pack,s,c)<=ceiling&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  if(!effect||card(pack,source).type!=='character'||q.ceiling!==ceiling||
   q.optional!==true||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','ceiling','optional'].includes(k)))
   throw Error('Invalid scaled front retirement pending');
 }
 if(s.pending?.kind==='effect-hand-named-rest'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='deployOwnHandNamedRest'&&e.color==='yellow'&&e.maxEnergy===3&&e.ap===1&&
   e.max===1&&e.optional===true&&e.names?.[0]==='ラム'&&e.names?.[1]==='レム');
  const choices=pl.hand.filter(c=>{
   const d=card(pack,c);
   return d.type==='character'&&d.color==='yellow'&&d.energy<=3&&d.ap===1&&
    ['ラム','レム'].some(n=>cardHasName(d,n,originalEffectsDisabled(s,c)));
  }).map(c=>c.uid);
  if(!effect||q.optional!==true||q.color!=='yellow'||q.maxEnergy!==3||q.ap!==1||
   q.names?.[0]!=='ラム'||q.names?.[1]!=='レム'||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','color','maxEnergy','ap','names','optional'].includes(k)))
   throw Error('Invalid named hand REST pending');
 }
 if(s.pending?.kind==='effect-outside-printed-rest'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='deployOutsidePrintedRest'&&e.name===q.name&&e.color===q.color&&
   e.energy===q.energy&&e.optional===true);
  const choices=pl.outside.filter(c=>{
   const d=card(pack,c);
   return d.type==='character'&&d.color===q.color&&d.energy===q.energy&&
    cardHasName(d,q.name,originalEffectsDisabled(s,c));
  }).map(c=>c.uid);
  if(!effect||q.optional!==true||q.name!=='ナツキ・スバル'||q.color!=='blue'||q.energy!==0||
   !choices.length||!same(q.choices,choices)||Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','color','energy','optional'].includes(k)))
   throw Error('Invalid exact outside REST pending');
 }
 if(s.pending?.kind==='effect-grant-printed-block'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onAttack?.find(e=>
   e.op==='grantPrintedBlockAtLeast'&&e.name===q.name&&e.color===q.color&&
   e.energy===q.energy&&e.bp===q.bp&&e.optional===true);
  const choices=field(pl).filter(c=>{
   const d=card(pack,c);
   return d.type==='character'&&d.color===q.color&&d.energy===q.energy&&
    cardHasName(d,q.name,originalEffectsDisabled(s,c));
  }).map(c=>c.uid);
  if(!effect||q.optional!==true||q.name!=='ナツキ・スバル'||q.color!=='blue'||
   q.energy!==0||q.bp!==4000||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','color','energy','bp','optional'].includes(k)))
   throw Error('Invalid printed blocker ceiling pending');
 }
 if(s.pending?.kind==='effect-move-opp-front'){
  const q=s.pending;
  const source=field(s.players[q.player]).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='moveOppFrontToEnergy'&&e.optional===true&&e.lockIfEntry==='ownEffect');
  const choices=oppFrontMoveChoices(pack,s,q.player,q.sourceUid);
  if(!effect||q.optional!==true||q.lock!==enteredByOwnEffect(s,q.player,q.sourceUid)||
   !choices.length||!same(q.choices,choices)||Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','optional','lock'].includes(k)))
   throw Error('Invalid opponent front move pending');
 }
 if(s.pending?.kind==='effect-unblocked-rest'){
  const q=s.pending;
  const source=s.players[q.player].front.find(c=>c?.uid===q.sourceUid);
  const choices=s.players[1-q.player].front.filter(c=>c&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||s.phase!=='attack'||
   q.player!==s.active||originalEffectsDisabled(s,source)||
   card(pack,source).unblockedRestFront!==true||!(s.attacksByUid[source.uid]>=1)||
   q.optional!==true||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices','optional'].includes(k)))
   throw Error('Invalid unblocked front rest pending');
 }
 if(s.pending?.kind==='effect-energy-swap'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.energy.find(c=>c?.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const choices=pl.front.filter(c=>c&&card(pack,c).type==='character').map(c=>c.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||
   ability?.op!=='energySwapOwnFront'||ability.line!=='energy'||ability.oncePerTurn!==true||
   !s.mainAbilityUsedUids.includes(source.uid)||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices'].includes(k)))
   throw Error('Invalid energy-line swap pending');
 }
 if(s.pending?.kind==='effect-grant-named-impact'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.front.find(c=>c?.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const choices=namedFieldImpactChoices(pack,s,q.player,q.sourceUid,['ラム','レム']);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||
   ability?.op!=='frontOnceGrantImpactNamed'||ability.excludeSelf!==true||
   !s.mainAbilityUsedUids.includes(source.uid)||q.optional!==true||
   q.names?.[0]!=='ラム'||q.names?.[1]!=='レム'||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices','names','optional'].includes(k)))
   throw Error('Invalid named impact grant pending');
 }
 if(s.pending?.kind==='effect-rested-retire-impact'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.front.find(c=>c?.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const choices=s.players[1-q.player].front.filter(c=>c&&bp(pack,s,c)<=1500&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  if(!source||source.ready!==false||source.fieldEntryStamp!==q.sourceStamp||
   ability?.op!=='restedFrontRetireReadyImpact'||ability.frontOnly!==true||
   ability.oncePerTurn!==true||ability.bp!==1500||
   !s.mainAbilityUsedUids.includes(source.uid)||q.optional!==true||q.ceiling!==1500||
   !choices.length||!same(q.choices,choices)||Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices','ceiling','optional'].includes(k)))
   throw Error('Invalid rested front retirement pending');
 }
 if(s.pending?.kind==='effect-rest-outside-events'){
  const q=s.pending;
  const source=field(s.players[q.player]).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='restOppFrontByOutsideEvents'&&e.min===4&&e.skipMin===8&&e.optional===true);
  const events=s.players[q.player].outside.filter(c=>cardCountsAsEvent(card(pack,c))).length;
  const live=s.players[1-q.player].front.filter(c=>c&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  const present=Array.isArray(q.choices)&&q.choices.every(uid=>
   s.players[1-q.player].front.some(c=>c?.uid===uid));
  if(!effect||card(pack,source).type!=='character'||q.optional!==true||
   q.min!==4||q.skipMin!==8||!q.choices?.length||!present||
   (events>=q.min&&!same(q.choices,live))||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','min','skipMin','optional'].includes(k)))
   throw Error('Invalid outside-event front rest pending');
 }
 if(s.pending?.kind==='effect-hand-bp-may'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const revealed=pl.deck.find(c=>c.uid===q.revealedUid);
  const shown=revealed&&handRevealIdentity(card(pack,revealed));
  const flag=pl.handCharacterBpMay;
  const live=handCharacterBpMayAmount(pack,s,q.player);
  const fronts=pl.front.filter(c=>c&&!originalEffectsDisabled(s,c)&&
   card(pack,c).handBpMayWhileFront===1000).length;
  const flagValid=!!flag&&flag.turn===s.turn&&flag.amount===1000&&
   typeof flag.sourceUid==='string'&&Object.keys(flag).length===3;
  const sources=(flagValid?1:0)+fronts;
  const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.uid===q.revealedUid&&e.from==='hand'&&e.to==='deck'&&e.reason==='own-effect');
  const impact=q.impact===1&&q.bp===undefined;
  const rewardOk=impact?ability?.op==='revealHandBottomImpact'&&ability.impact===1:
   q.impact===undefined&&ability?.op==='revealHandBottomBuff'&&ability.bp===q.bp;
  const rewardKey=impact?'impact':'bp';
  if(!source||source.fieldEntryStamp!==q.sourceStamp||!rewardOk||
   ability.minPrintedBp!==q.minPrintedBp||!s.mainAbilityUsedUids.includes(q.sourceUid)||
   !shown||shown.type!=='character'||shown.bp!==q.baseBp||q.amount!==live||
   live!==sources*1000||live<1000||live%1000!==0||(flag&&!flagValid)||
   !(q.baseBp<q.minPrintedBp&&q.baseBp+q.amount>=q.minPrintedBp)||
   !moved||
   Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','revealedUid',
    'minPrintedBp',rewardKey,'baseBp','amount'].includes(k)))
   throw Error('Invalid hand character BP option pending');
 }
 if(s.pending?.kind==='effect-hand-deploy-may'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.hand.find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const shown=source&&handRevealIdentity(card(pack,source));
  const flag=pl.handCharacterBpMay;
  const live=shown?.type==='character'?handCharacterBpMayAmount(pack,s,q.player):0;
  const fronts=pl.front.filter(c=>c&&!originalEffectsDisabled(s,c)&&
   card(pack,c).handBpMayWhileFront===1000).length;
  const flagValid=!!flag&&flag.turn===s.turn&&flag.amount===1000&&
   typeof flag.sourceUid==='string'&&Object.keys(flag).length===3;
  const sources=(flagValid?1:0)+fronts;
  const revealed=s.publicReveals.some(r=>r.kind==='hand-activate'&&r.owner===q.player&&
   r.uid===q.sourceUid&&r.turn===s.turn&&r.cardId===source?.cardId);
  const paid=(s.effectApPaidColors?.[q.player]||[]).includes(source&&card(pack,source).color);
  if(!source||ability?.op!=='handPayRevealDeploy'||ability.payAp!==1||
   ability.minReferencedBp!==4000||shown?.type!=='character'||shown.bp!==q.baseBp||
   q.amount!==live||live!==sources*1000||live<1000||live%1000!==0||(flag&&!flagValid)||
   q.minBp!==4000||!(q.baseBp<q.minBp&&q.baseBp+q.amount>=q.minBp)||
   !revealed||!paid||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','baseBp','amount','minBp'].includes(k)))
   throw Error('Invalid hand deployment option pending');
 }
 if(s.pending?.kind==='effect-hand-rest-entry'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.hand.find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const shown=source&&handRevealIdentity(card(pack,source));
  const bonus=shown?.type==='character'?handCharacterBpMayAmount(pack,s,q.player):0;
  const meets=shown?.type==='character'&&Number.isInteger(shown.bp)&&
   (shown.bp>=q.minBp||bonus>0&&shown.bp+bonus>=q.minBp);
  const revealed=s.publicReveals.some(r=>r.kind==='hand-activate'&&r.owner===q.player&&
   r.uid===q.sourceUid&&r.turn===s.turn&&r.cardId===source?.cardId);
  const paid=(s.effectApPaidColors?.[q.player]||[]).includes(source&&card(pack,source).color);
  if(!source||ability?.op!=='handPayRevealDeploy'||ability.payAp!==1||
   ability.minReferencedBp!==4000||q.minBp!==4000||!meets||!revealed||!paid||
   Object.keys(q).length!==4||
   Object.keys(q).some(k=>!['kind','player','sourceUid','minBp'].includes(k)))
   throw Error('Invalid hand REST entry pending');
 }
 if(s.pending?.kind==='effect-active-other'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.uid===q.sourceUid&&e.from==='hand'&&(e.to==='front'||e.to==='energy')&&
   e.reason==='own-effect');
  const choices=field(pl).filter(c=>c.uid!==q.sourceUid&&card(pack,c).type==='character')
   .map(c=>c.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||source.ready!==false||
   ability?.op!=='handPayRevealDeploy'||ability.payAp!==1||ability.minReferencedBp!==4000||
   !moved||q.optional!==true||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices','optional'].includes(k)))
   throw Error('Invalid other-character ACTIVE pending');
 }
 if(s.pending?.kind==='effect-rest-own-front-draw'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const choices=pl.front.filter(c=>c?.ready&&card(pack,c).type==='character').map(c=>c.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||
   ability?.op!=='frontOnceProgram'||ability.frontOnly!==true||ability.oncePerTurn!==true||
   ability.then?.[0]?.op!=='restOwnActiveFrontDraw'||
   !s.mainAbilityUsedUids.includes(q.sourceUid)||
   !choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices'].includes(k)))
   throw Error('Invalid own active front rest pending');
 }
 if(s.pending?.kind==='effect-raid-base-rest'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const effect=printed?.effects?.onRetire;
  const base=pl.outside.find(c=>c.uid===q.baseUid);
  const retired=(s.turnRetireEvents||[]).some(e=>e.turn===s.turn&&e.controller===q.player&&
   e.uid===q.sourceUid&&e.cardType==='character');
  const buried=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.uid===q.baseUid&&e.from==='raid-under'&&e.to==='outside'&&e.reason==='rule'&&
   e.attachedToUid===q.sourceUid);
  if(!source||printed.type!=='character'||!printed.raidName||
   effect?.length!==1||effect[0]?.op!=='deployOwnRaidBaseRest'||effect[0]?.optional!==true||
   !retired||!buried||!base||card(pack,base).type!=='character'||card(pack,base).raidName||
   Object.keys(q).length!==4||
   Object.keys(q).some(k=>!['kind','player','sourceUid','baseUid'].includes(k)))
   throw Error('Invalid raid-base REST pending');
 }
 if(s.pending?.kind==='effect-rest-or-retire'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='restOrRetireFrontAtMost'&&e.bp===5000&&e.retireIfName==='エミリア');
  const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.uid===q.sourceUid&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule');
  const mode=ownFieldHasPrintedName(pack,s,q.player,'エミリア')?'retire':'rest';
  const choices=s.players[1-q.player].front.filter(c=>c&&bp(pack,s,c)<=5000&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  if(!source||card(pack,source).type!=='event'||!effect||!moved||q.ceiling!==5000||
   q.mode!==mode||q.name!=='エミリア'||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','ceiling','mode','name'].includes(k)))
   throw Error('Invalid rest-or-retire pending');
 }
 if(s.pending?.kind==='effect-top-trait-event'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='searchTopTraitOrEventAp'&&e.count===5&&e.trait===q.trait);
  const window=pl.deck.slice(0,q.uids?.length||0);
  const choices=window.filter(c=>{
   const d=card(pack,c);
   return cardHasTrait(d,q.trait)||cardCountsAsEvent(d);
  }).map(c=>c.uid);
  const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.uid===q.sourceUid&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule');
  if(!effect||card(pack,source).type!=='event'||q.trait!=='王選候補者'||!moved||
   !Array.isArray(q.uids)||!q.uids.length||q.uids.length>5||
   window.length!==q.uids.length||window.some((c,i)=>c.uid!==q.uids[i])||
   !choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','uids','choices','trait'].includes(k)))
   throw Error('Invalid trait or event search pending');
 }
 if(s.pending?.kind==='effect-top-order'&&s.pending.recoverApAfter===true){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='searchTopTraitOrEventAp'&&e.trait==='王選候補者');
  const took=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.sourceUid===q.sourceUid&&e.from==='deck'&&e.to==='hand'&&e.reason==='own-effect'&&
   cardHasTrait(card(pack,{uid:e.uid,cardId:e.cardId}),'王選候補者'));
  if(!effect||!took||q.rest!=='bottom'||q.discardAfter||!Array.isArray(q.uids)||
   !q.uids.length||!Array.isArray(q.order))
   throw Error('Invalid trait-search AP recovery arrangement');
 }
 if(s.pending?.kind==='effect-remove-named'){
  const q=s.pending,src=field(s.players[q.player]).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='removeNamedOutsideActive'&&
   e.name===q.name);
  const choices=s.players[q.player].outside.filter(c=>cardHasName(card(pack,c),q.name,
   originalEffectsDisabled(s,c))).map(c=>c.uid);
  if(!earned||q.optional!==true||!choices.length||!Array.isArray(q.choices)||
   !same(q.choices,choices)||Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','optional'].includes(k)))
   throw Error('Invalid named outside removal pending');
 }
 if(s.pending?.kind==='effect-pay-named'){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='payHandOrRestForNamed'&&
   e.name===q.name);
  const named=pl.outside.some(c=>cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c)));
  const payable=pl.hand.length>0||pl.front.some(c=>c&&c.ready&&card(pack,c).type==='character');
  if(!earned||q.optional!==true||!named||!payable||Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','name','optional'].includes(k)))
   throw Error('Invalid hand-or-rest named recovery pending');
 }
 if(s.pending?.kind==='effect-add-named'){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='payHandOrRestForNamed'&&
   e.name===q.name);
  const choices=pl.outside.filter(c=>cardHasName(card(pack,c),q.name,
   originalEffectsDisabled(s,c))).map(c=>c.uid);
  if(!earned||!Array.isArray(q.choices)||q.choices.length<2||!same(q.choices,choices)||
   Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','name','choices'].includes(k)))
   throw Error('Invalid named outside recovery pending');
 }
 if(s.pending?.kind==='effect-return-printed'){
  const q=s.pending,src=field(s.players[q.player]).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='returnPrintedActiveBuff'&&
   e.name===q.name&&e.color===q.color&&e.energy===q.energy&&e.bp===q.bp);
  const choices=printedFieldTargets(pack,s,q.player,q).map(c=>c.uid);
  if(!earned||q.optional!==true||!choices.length||!Array.isArray(q.choices)||
   !same(q.choices,choices)||Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','color','energy','bp','optional'].includes(k)))
   throw Error('Invalid printed return pending');
 }
 if(s.pending?.kind==='effect-reveal-bottom'){
  const q=s.pending,src=field(s.players[q.player]).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src),ab=printed?.mainAbility;
  const impact=ab?.op==='revealHandBottomImpact'&&q.impact===1&&q.bp===undefined&&ab.impact===1;
  const buff=ab?.op==='revealHandBottomBuff'&&q.impact===undefined&&ab.bp===q.bp;
  const rewardKey=impact?'impact':'bp';
  if(!src||src.fieldEntryStamp!==q.sourceStamp||!(impact||buff)||
   ab.minPrintedBp!==q.minPrintedBp||
   !s.mainAbilityUsedUids.includes(q.sourceUid)||
   !Array.isArray(q.choices)||!same(q.choices,s.players[q.player].hand.map(c=>c.uid))||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices','minPrintedBp',rewardKey].includes(k)))
   throw Error('Invalid reveal-to-bottom pending');
 }
 if(s.pending?.kind==='effect-rest-front-ap'){
  const q=s.pending,pl=s.players[q.player];
  const src=pl.outside.find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='optionalRestFrontRecoverAp'&&
   Object.keys(e).length===1);
  const choices=pl.front.filter(c=>c&&c.ready&&card(pack,c).type==='character').map(c=>c.uid);
  if(!earned||q.optional!==true||!choices.length||!Array.isArray(q.choices)||
   !same(q.choices,choices)||Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','optional'].includes(k)))
   throw Error('Invalid optional front rest pending');
 }
 if(s.pending?.kind==='effect-discard-active'){
  const q=s.pending,pl=s.players[q.player];
  const src=pl.energy.find(c=>c?.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='optionalDiscardActiveSelf'&&
   Object.keys(e).length===1);
  if(!earned||printed.type!=='field'||q.optional!==true||!pl.hand.length||
   Object.keys(q).length!==4||
   Object.keys(q).some(k=>!['kind','player','sourceUid','optional'].includes(k)))
   throw Error('Invalid optional discard active pending');
 }
 if(s.pending?.kind==='effect-buff-either'&&s.pending.includeSelf===true){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.front.find(c=>c?.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const step=ability?.then?.[0];
  const own=field(pl).filter(c=>card(pack,c).type==='character').map(c=>c.uid);
  const opp=field(s.players[1-q.player]).filter(c=>card(pack,c).type==='character'&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  const choices=[...own,...opp];
  if(!source||ability?.op!=='frontOnceProgram'||ability.frontOnly!==true||
   ability.oncePerTurn!==true||step?.op!=='buffEitherField'||step.bp!==q.bp||
   step.optional!==true||!s.mainAbilityUsedUids.includes(q.sourceUid)||
   q.optional!==true||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','bp','optional','includeSelf'].includes(k)))
   throw Error('Invalid either-field self-inclusive buff pending');
 }
 if(s.pending?.kind==='effect-hand-outside-active'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='optionalHandOutsideActiveIf'&&e.name===q.name&&e.minEvents===q.minEvents);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||!effect||
   card(pack,source).type!=='character'||originalEffectsDisabled(s,source)||
   !pl.hand.length||!ownFieldNamedCharacter(pack,s,q.player,q.name)||
   outsideEventCount(pack,s,q.player)<q.minEvents||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','name','minEvents'].includes(k)))
   throw Error('Invalid hand outside active pending');
 }
 if(s.pending?.kind==='effect-named-duration'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='buffNamedImpactDuration'&&e.name===q.name&&e.bp===q.bp&&e.impact===1&&
   e.optional===true&&e.otherOutsideEvents===q.otherOutsideEvents);
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))&&
   Number.isInteger(c.fieldEntryStamp)&&c.fieldEntryStamp>=1).map(c=>c.uid);
  const longer=outsideEventCount(pack,s,q.player,q.sourceUid)>=q.otherOutsideEvents;
  if(!effect||card(pack,source).type!=='event'||q.optional!==true||q.impact!==1||
   q.longer!==longer||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==10||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','bp','impact',
    'optional','longer','otherOutsideEvents'].includes(k)))
   throw Error('Invalid named duration pending');
 }
 if(s.pending?.kind==='effect-top-take-one'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='takeTopHandRestOutside'&&e.count===2);
  const top=pl.deck.slice(0,q.uids?.length||0).map(c=>c.uid);
  if(!effect||card(pack,source).type!=='character'||!Array.isArray(q.uids)||
   q.uids.length<2||!same(top,q.uids)||Object.keys(q).length!==4||
   Object.keys(q).some(k=>!['kind','player','sourceUid','uids'].includes(k)))
   throw Error('Invalid top take pending');
 }
 if(s.pending?.kind==='effect-reveal-optional'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='revealHandBottomOutsideCharacter'&&e.optional===true&&
   e.excludeName===q.excludeName&&e.color===q.color&&e.ap===q.ap);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||!effect||!pl.hand.length||
   !Array.isArray(q.choices)||!same(q.choices,pl.hand.map(c=>c.uid))||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices',
    'excludeName','color','ap'].includes(k)))
   throw Error('Invalid optional reveal pending');
 }
 if(s.pending?.kind==='effect-referenced-bp'){
  const q=s.pending,pl=s.players[q.player];
  const revealed=pl.deck.find(c=>c.uid===q.revealedUid);
  const shown=revealed&&handRevealIdentity(card(pack,revealed));
  const live=handCharacterBpMayAmount(pack,s,q.player);
  const moved=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.uid===q.revealedUid&&e.from==='hand'&&e.to==='deck'&&e.reason==='own-effect'&&
   e.sourceUid===q.sourceUid);
  const spec={excludeName:q.excludeName,color:q.color,ap:q.ap};
  if(q.next==='outside'){
   const source=field(pl).find(c=>c.uid===q.sourceUid);
   const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
    e.op==='revealHandBottomOutsideCharacter'&&e.excludeName===q.excludeName&&
    e.color===q.color&&e.ap===q.ap);
   const base=outsideReferencedMatches(pack,s,q.player,spec,q.baseBp);
   const boosted=outsideReferencedMatches(pack,s,q.player,spec,q.baseBp+q.amount);
   if(!source||source.fieldEntryStamp!==q.sourceStamp||!effect||!shown||
    shown.type!=='character'||shown.bp!==q.baseBp||q.amount!==live||live<1000||
    !moved||!idSetsDiffer(base,boosted)||Object.keys(q).length!==11||
    Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','revealedUid',
     'baseBp','amount','next','excludeName','color','ap'].includes(k)))
    throw Error('Invalid referenced outside BP pending');
  }else if(q.next==='retire'){
   const source=pl.outside.find(c=>c.uid===q.sourceUid);
   const ability=source&&card(pack,source).mainAbility;
   const base=frontReferencedRetire(pack,s,q.player,q.baseBp,q.sourceUid);
   const boosted=frontReferencedRetire(pack,s,q.player,q.baseBp+q.amount,q.sourceUid);
   if(!source||ability?.op!=='restLeaveRevealRetire'||card(pack,source).name!==q.name||
    !s.mainReadyOnceByName[q.player].includes(q.name)||!shown||
    shown.type!=='character'||shown.bp!==q.baseBp||q.amount!==live||live<1000||
    !moved||!idSetsDiffer(base,boosted)||Object.keys(q).length!==8||
    Object.keys(q).some(k=>!['kind','player','sourceUid','revealedUid','baseBp',
     'amount','next','name'].includes(k)))
    throw Error('Invalid referenced retire BP pending');
  }else throw Error('Invalid referenced BP pending');
 }
 if(s.pending?.kind==='effect-outside-referenced'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const effect=source&&card(pack,source).effects?.onPlay?.find(e=>
   e.op==='revealHandBottomOutsideCharacter'&&e.excludeName===q.excludeName&&
   e.color===q.color&&e.ap===q.ap);
  const choices=outsideReferencedMatches(pack,s,q.player,{
   excludeName:q.excludeName,color:q.color,ap:q.ap},q.ceiling);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||!effect||!choices.length||
   !same(q.choices,choices)||Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices',
    'excludeName','color','ap','ceiling'].includes(k)))
   throw Error('Invalid outside referenced pending');
 }
 if(s.pending?.kind==='effect-reveal-retire'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  if(!source||ability?.op!=='restLeaveRevealRetire'||card(pack,source).name!==q.name||
   !s.mainReadyOnceByName[q.player].includes(q.name)||!pl.hand.length||
   !Array.isArray(q.choices)||!same(q.choices,pl.hand.map(c=>c.uid))||
   Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name'].includes(k)))
   throw Error('Invalid reveal after leave pending');
 }
 if(s.pending?.kind==='effect-retire-referenced'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  const choices=frontReferencedRetire(pack,s,q.player,q.ceiling,q.sourceUid);
  const revealed=s.zoneMoveEvents.some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.from==='hand'&&e.to==='deck'&&e.reason==='own-effect'&&e.sourceUid===q.sourceUid);
  if(!source||ability?.op!=='restLeaveRevealRetire'||card(pack,source).name!==q.name||
   !s.mainReadyOnceByName[q.player].includes(q.name)||q.optional!==true||
   !choices.length||!same(q.choices,choices)||!revealed||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','ceiling','optional','name'].includes(k)))
   throw Error('Invalid referenced front retirement pending');
 }
 if(s.pending?.kind==='effect-substitute-retire'){
  const q=s.pending;
  const loc=location(s,q.player,q.uid);
  const offers=loc?substituteOffers(pack,s,q.player,loc.c):[];
  if(!loc||loc.line!==q.line||loc.slot!==q.slot||q.by!=='opponent'||s.active===q.player||
   q.optional!==true||typeof q.name!=='string'||!offers.length||
   !same(q.choices,offers.map(c=>c.uid))||
   card(pack,offers[0]).substituteOppRetire.name!==q.name||
   !(q.postImpact===false||q.postImpact===true||Number.isInteger(q.postImpact)&&q.postImpact>=2)||
   Object.keys(q).length!==10||
   Object.keys(q).some(k=>!['kind','player','uid','line','slot','postImpact','by','choices','optional','name'].includes(k)))
   throw Error('Invalid substitute retirement pending');
 }
 if(s.pending?.kind==='effect-outside-printed-active'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const choices=pl.outside.filter(c=>{
   const d=card(pack,c);
   return d.type==='character'&&d.color===q.color&&d.energy===q.energy&&
    cardHasName(d,q.name,originalEffectsDisabled(s,c));
  }).map(c=>c.uid);
  if(!source||!programContainsOp(card(pack,source),'onPlay','deployOutsidePrintedActive')||
   q.optional!==true||q.name!=='ナツキ・スバル'||q.color!=='blue'||q.energy!==0||
   !choices.length||!same(q.choices,choices)||Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','color','energy','optional'].includes(k)))
   throw Error('Invalid exact outside ACTIVE pending');
 }
 if(s.pending?.kind==='effect-bounce-include-self'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const choices=field(pl).filter(c=>card(pack,c).type==='character').map(c=>c.uid);
  if(!source||!programContainsOp(card(pack,source),'onPlay','bounceThenAffordableSubaru')||
   q.optional!==true||q.name!=='ナツキ・スバル'||q.color!=='blue'||q.ap!==1||
   !choices.length||!same(q.choices,choices)||Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','color','ap','optional'].includes(k)))
   throw Error('Invalid bounce-including-self pending');
 }
 if(s.pending?.kind==='effect-outside-rest-or-raid'){
  const q=s.pending,pl=s.players[q.player];
  const source=[...field(pl),...pl.hand,...pl.outside].find(c=>c.uid===q.sourceUid);
  const choices=affordablePrintedOutside(pack,s,q.player,{name:q.name,color:q.color,ap:q.ap}).map(c=>c.uid);
  if(!source||!programContainsOp(card(pack,source),'onPlay','bounceThenAffordableSubaru')||
   q.optional!==true||q.name!=='ナツキ・スバル'||q.color!=='blue'||q.ap!==1||
   !choices.length||!same(q.choices,choices)||Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','color','ap','optional'].includes(k)))
   throw Error('Invalid outside rest-or-raid pending');
 }
 if(s.pending?.kind==='effect-grant-bounce-instead'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  if(!source||source.fieldEntryStamp!==q.sourceStamp||originalEffectsDisabled(s,source)||
   !programContainsOp(card(pack,source),'onPlay','grantBounceInstead')||
   q.optional!==true||q.name!=='ナツキ・スバル'||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices','name','optional'].includes(k)))
   throw Error('Invalid bounce-instead choice');
 }
 if(s.pending?.kind==='effect-hand-reenter-under'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const named=field(pl).some(c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c)));
  if(!source||!named||!programContainsOp(card(pack,source),'onRetire','handOutsideReenterFaceDown')||
   q.optional!==true||q.name!=='エミリア'||!pl.hand.length||
   !Array.isArray(q.choices)||!same(q.choices,pl.hand.map(c=>c.uid))||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','name','optional'].includes(k)))
   throw Error('Invalid facedown reenter pending');
 }
 if(s.pending?.kind==='effect-hand-block'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const ability=source&&card(pack,source).mainAbility;
  if(!source||source.fieldEntryStamp!==q.sourceStamp||
   ability?.op!=='handOutsideBlockAtLeast'||ability.oncePerTurn!==true||ability.bp!==4000||
   q.bp!==4000||!s.mainAbilityUsedUids.includes(q.sourceUid)||!pl.hand.length||
   !Array.isArray(q.choices)||!same(q.choices,pl.hand.map(c=>c.uid))||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','bp','choices'].includes(k)))
   throw Error('Invalid hand block grant pending');
 }
 if(s.pending?.kind==='effect-hand-top'){
  const q=s.pending,loc=location(s,q.player,q.sourceUid);
  const printed=loc&&card(pack,loc.c),step=printed?.mainAbility?.then?.[0];
  const shared=!loc||loc.c.fieldEntryStamp!==q.sourceStamp||
   !s.mainAbilityUsedUids.includes(q.sourceUid)||
   !Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,s.players[q.player].hand.map(c=>c.uid));
  const buff=q.bp!==undefined&&(loc?.line!=='front'||
   printed?.mainAbility?.op!=='frontOnceProgram'||printed.mainAbility.frontOnly!==true||
   step?.op!=='handTopBuffSelf'||step.bp!==q.bp||Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices','bp'].includes(k)));
  const plain=q.bp===undefined&&(loc?.line!=='energy'||printed?.type!=='field'||
   loc?.c.ready!==false||printed?.mainAbility?.op!=='restSelfThen'||
   step?.op!=='drawHandTop'||Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices'].includes(k)));
  if(shared||(q.bp===undefined?plain:buff))
   throw Error('Invalid hand-to-top pending');
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
    // Do not assume all earned hand-move triggers are DRAW. The printed
    // BLEACH chain can grant an optional block floor, two attacks, or a
    // paid character deployment while another observer RESTs/tucks the
    // moved card. Validate each queued job against BOTH its physical
    // completed move and its exact registered print, including all args.
    const earned=s.zoneMoveEvents.filter(ev=>
     ev.order>after&&ev.owner===win.owner&&ev.controller===win.owner&&
     ev.sourceUid===moved[1])
     .flatMap(ev=>{
      const printed=card(pack,{uid:ev.uid,cardId:ev.cardId});
      return (printed.moveTriggers||[])
       .filter(profile=>matchesCompletedMove(ev,profile.when))
       .flatMap(profile=>profile.then.map(op=>({...op,owner:ev.owner,
        sourceUid:ev.uid,sourceName:printed.name,
        ...(['grantCauseBlockAtMost','handBottomGrantDoubleAttack',
         'payApDeployMovedActive'].includes(op.op)?{causeUid:ev.sourceUid}:{})})));
     });
    const signature=x=>JSON.stringify(Object.entries(x||{}).sort(([a],[b])=>a.localeCompare(b)));
    const unused=earned.map(signature);
    for(const j of entry.jobs){
     const ix=unused.indexOf(signature(j));
     if(ix<0)throw Error('Forged moved-card earned effect');
     unused.splice(ix,1); // one physical trigger cannot be spent twice
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
   !['grantedAttackDraw','grantOnAttack','grantSelfSniperThisTurn','grantSelfAttackWinDrawThisTurn','grantSelfMustBlockThisTurn','buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn','resolveAttackWinRecovery','draw','drawIfOwnName','drawIfOwnEventUsed','drawIfOwnOutsideNamedCountAtLeast','drawIfOwnFieldExists','drawIfOwnEnergyAtLeast','drawIfOppRestCharacter','drawIfOppCharacterBpAtLeast','drawIfOppFrontBelowPrinted','drawIfOwnNameAndHandFewer','activeOwnNamed','millTop','buffSelf','buffSelfPerOwnOutsideGroups','enemyBpDown','drawDiscard','drawDiscardIfEveryOwnCharacterNamed','recoverAp','peekTopOne','peekTopOrBottom','retireOppFrontUnderBp','retireOppFrontTiered','retireOppFrontOneUnderBp','conditionalBounceOrRetireByOwnOutsideNames','completeResolvingEvent','stripOppRaidTop','restOppFrontUnderBp','restOppFrontOne','restOppFrontByOutsideEvents','forbidAttackOppFrontOne','retireOppFrontIfFacedown','buffOwnTrait','drawIfRaidUnderFacedown','searchDeckOne','searchDeckMany','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside','searchTopOneBottomDiscard','searchTopTraitOrEventAp','discountNextNamedHandEnergy','retireOppFrontAtLeastBp','retireOppFrontAtMostBp','retireOppFrontScaledBp','grantHandCharacterBpMay','searchTopUpToTwoBottom','deployOwnHandRest','deployOwnHandSpecial','deployOwnHandRestOrRaid','deployOwnHandNamedRest','optionalPayApThen','optionalRetireThenProgram','recoverOutsideOne','recoverOutsidePrintedBp','discardToDraw',
    'discardGate','removeOutsideThen','enemyFrontAllBpDown','retireOppFrontAllUnderBp',
    'nextEligibleHandPlayApDiscount','grantFrontEnergyOwnOtherFrontTrait','buffOwnTraitAllTurn','buffSelfIfFirstAttack','bounceOwnOtherUnderEnergy',
    'recoverOutsideColorUnderEnergy','deployOutsideRest','deployOutsideNameRest','deployNamedFromZones','payApDeployNamedRest','inspectTopTraitOutside','deployOutsideTraitlessRestOrRaid','buffOwnField','buffEitherOther','returnPrintedActiveBuff','removeNamedOutsideActive','payHandOrRestForNamed','handTopBuffSelf','optionalRestFrontRecoverAp','drawHandTop','optionalDiscardActiveSelf','oncePerTurnGate','retireBatchOne','retireAtMainEnd','retireSourceOnPhaseEnd','moveAtMainEnd','retireOwnFieldOne','retireOwnCharacterOne','openBlock','resolveSniperBattle','skipNextActiveOppRest','restOrRetireOppFrontByLife','restSilenceOppFrontIfOwnOutsideField','resolveAttackEndSwap','resolveUnblockedRest','phaseOrder','effectMoveOrder','restSelfTuckMovedFaceDown','sourceResolutionBoundary','lifeBatchStep','lifeRelease','advanceAfterAttack','additionalBattleDamage','openRetirementBatch','closeRetirementBatch','retirementOrder','battleImpactDamage','discardOppHand','activeSelfIf','openEnergyMoveGrants','moveOtherAcrossOrRemove','raidBaseEnergyThen','grantSelfAttackDamageThisTurn','restOppFrontLockActive','removeAnyOutsideScale','inspectTopColoredNamesOutside','drawDiscardIfEffectApPaid','activeSelf','restOwnActiveFrontDraw','deployOwnRaidBaseRest','restOrRetireFrontAtMost','peekTopOneIfFieldNames','grantSelfImpactThisTurn','buffNamedImpactDraw','grantOwnNameBlockAtLeast','deployOutsidePrintedRest','grantPrintedBlockAtLeast','moveOppFrontToEnergy','optionalHandOutsideActiveIf','buffNamedImpactDuration','takeTopHandRestOutside','buffEitherField','revealHandBottomOutsideCharacter','revealTopHandOrAffordableNamed','drawThenPlaceHand','impactIfEveryOwnTraitless','deployOutsidePrintedActive','bounceThenAffordableSubaru','grantBounceInstead','handOutsideReenterFaceDown'].includes(e.op)))
  throw Error('Invalid queued effects');
 const energyMoves=s.effectQueue.filter(e=>e.op==='openEnergyMoveGrants');
 if(energyMoves.length>1||energyMoves.some(j=>j.owner!==s.active||s.phase!=='attack'||
  Object.keys(j).length!==2||Object.keys(j).some(k=>!['op','owner'].includes(k))))
  throw Error('Forged energy-line move grant window');
 for(const j of s.effectQueue.filter(e=>e.op==='resolveSniperBattle')){
  const source=s.players[j.owner]?.front.find(c=>c?.uid===j.sourceUid);
  const target=s.players[1-j.owner]?.front.find(c=>c?.uid===j.targetUid);
  if(j.owner!==s.active||s.phase!=='attack'||!source||!target||
   !hasCurrentBattleGrant(s,source,'sniperGranted')||
   (source.sniperGranted.maxBp!==undefined&&bp(pack,s,target)>=source.sniperGranted.maxBp)||
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
 for(const j of s.effectQueue.filter(e=>e.op==='resolveUnblockedRest')){
  const owner=s.players[j.owner];
  const src=owner?.front?.find(c=>c?.uid===j.sourceUid)||
   [...field(owner||{front:[],energy:[]}),...(owner?.outside||[])].find(c=>c?.uid===j.sourceUid);
  if(j.owner!==s.active||s.phase!=='attack'||!src||
   card(pack,src).unblockedRestFront!==true||!Number.isInteger(j.sourceStamp)||
   j.sourceStamp<1||!(s.attacksByUid[j.sourceUid]>=1)||Object.keys(j).length!==4||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp'].includes(k)))
   throw Error('Invalid unblocked front rest continuation');
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
  for(const c of items){
   if(c.attackDamageGranted!==undefined){
    const g=c.attackDamageGranted,live=field(pl).find(x=>x===c);
    if(!live||g?.amount!==2||g.turn!==s.turn||g.stamp!==c.fieldEntryStamp||
     Object.keys(g).length!==3)
     throw Error('Invalid earned attack damage');
   }
   if(c.impactPlus!==undefined&&field(pl).includes(c)){
    const g=c.impactPlus;
    const proved=pl.outside.some(ev=>{
     const effect=card(pack,ev).effects?.onPlay?.find(e=>e.op==='buffNamedImpactDraw');
     return effect&&effect.impactPlus===1&&
      cardHasName(card(pack,c),effect.name,originalEffectsDisabled(s,c))&&
      s.zoneMoveEvents.some(m=>m.turn===s.turn&&m.owner===p&&m.uid===ev.uid&&
       m.from==='hand'&&m.to==='outside'&&m.reason==='rule');
    });
    if(!g||g.turn!==s.turn||g.amount!==1||g.stamp!==c.fieldEntryStamp||
     !Number.isInteger(g.stamp)||g.stamp<1||g.stamp>=s.nextFieldEntryStamp||
     Object.keys(g).length!==3||
     Object.keys(g).some(k=>!['turn','stamp','amount'].includes(k))||!proved)
     throw Error('Forged this-turn impact plus');
   }
   if(c.impactGranted?.untilOwnTurnStart!==undefined&&field(pl).includes(c)){
    const g=c.impactGranted;
    const proved=pl.outside.some(ev=>ev.uid===g.sourceUid&&card(pack,ev).type==='event'&&
     card(pack,ev).effects?.onPlay?.some(e=>e.op==='buffNamedImpactDuration'&&e.impact===1&&
      cardHasName(card(pack,c),e.name,originalEffectsDisabled(s,c))));
    if(g.amount!==1||g.stamp!==c.fieldEntryStamp||g.turn!==undefined||
     g.untilOwnTurnStart!==pl.ownTurns+1||typeof g.sourceUid!=='string'||
     Object.keys(g).length!==4||!proved)
     throw Error('Forged lasting impact grant');
   }
   if(c.ownEffectFront!==undefined&&(c.ownEffectFront!==true||!pl.front.includes(c)||
    card(pack,c).frontForbidden!==true||
    card(pack,c).mainAbility?.op!=='restTwoActiveFrontMoveSelf'))
    throw Error('Invalid own-effect front permission');
  }
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
  if(pl.front.some(c=>c&&(card(pack,c).type!=='character'||
   (card(pack,c).frontForbidden&&c.ownEffectFront!==true))))
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
  !['effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-trait-event','effect-top-order','effect-top-trait-outside','effect-recover-outside','effect-outside-rest','effect-outside-name-rest','effect-outside-traitless-rest','effect-named-zone-entry','effect-hand-rest','effect-hand-named-rest','effect-hand-rest-or-raid','effect-active-own-named','effect-grant-block-at-least','effect-outside-printed-rest','effect-grant-printed-block','effect-bounce-own','effect-discard-cost','effect-discard-gate','effect-selection-hand-payment','effect-hand-bottom','effect-hand-top','effect-discard-active','effect-outside-hand-or-rest','effect-recover-under','effect-deck-named-play','effect-place-hand','effect-top-take-one','effect-outside-referenced','effect-reveal-optional','effect-reveal-retire','effect-hand-outside-active','effect-hand-block','effect-outside-printed-active','effect-bounce-include-self','effect-outside-rest-or-raid','effect-grant-bounce-instead','effect-hand-reenter-under'].includes(q.kind))
  return null;
 const zone=['effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-trait-event','effect-top-order','effect-top-trait-outside','effect-deck-named-play','effect-top-take-one'].includes(q.kind)?'deck':
  q.kind==='effect-recover-outside'||q.kind==='effect-outside-rest'||q.kind==='effect-outside-printed-rest'||q.kind==='effect-outside-printed-active'||q.kind==='effect-outside-name-rest'||q.kind==='effect-outside-traitless-rest'||q.kind==='effect-outside-hand-or-rest'||q.kind==='effect-recover-under'||q.kind==='effect-outside-referenced'||q.kind==='effect-outside-rest-or-raid'?'outside':
  q.kind==='effect-bounce-own'||q.kind==='effect-bounce-include-self'||q.kind==='effect-active-own-named'||q.kind==='effect-grant-block-at-least'||q.kind==='effect-grant-printed-block'||q.kind==='effect-grant-bounce-instead'?'field':'hand';
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
