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
 ownRestPrintedBpCount,countOppRestCharacters,countOwnPrintedApAtLeast,retiredThisTurn,countOwnOutsideDistinctPrintedNames,
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
const OWN_EFFECT_ENTRY=new Set(['outsideEffect','outsideEffectRaid','recoveredEffect','handEffect','handEffectRaid']);
function matchesHandRestOrRaid(pack,s,physical,spec){
 const d=card(pack,physical);
 if(!(d.type===spec.type&&d.color===spec.color&&d.ap===spec.ap&&
  d.energy<=spec.maxEnergy&&
  (spec.names===null||spec.names.some(n=>
   cardHasName(d,n,originalEffectsDisabled(s,physical))))))return false;
 if(spec.requireAffordableEnergy===true){
  const owner=Number(String(physical.uid).split('-')[0]);
  const need=effectiveHandRequiredEnergy(pack,s,owner,d,physical);
  if(need>(universalEnergyByColor(pack,s,owner)[d.color]||0))return false;
 }
 return true;
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
 // A resolved extra-energy grant lasts until the printed turn boundary.
 // untilTurn covers this turn. untilOwnTurnStart covers the next own START,
 // the same window bp() already uses. A later silence does not remove it.
 const timedBonus=(c.buffs||[]).filter(b=>b.untilTurn===s.turn||
  (Number.isInteger(b.untilOwnTurnStart)&&
   s.players[p].ownTurns<b.untilOwnTurnStart))
  .reduce((n,b)=>n+(b.energy&&(!b.color||b.color===d.color)?b.energy:0),0);
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
    p.condition.kind==='ownPrintedApAtLeast'?
    countOwnPrintedApAtLeast(s,owner,c.uid,p.condition,x=>card(pack,x)):
    ownRestPrintedBpCount(s,owner,c.uid,p.condition,x=>card(pack,x))):
    (p.bp&&matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
     ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x))?p.bp:0);
    return immune&&delta<0?n:n+delta;
   },0));
 }finally{bpVisit.delete(c.uid);}
}
export const universalBp=bp;
function attackDamagePlus(s,c){
 const g=c?.attackDamagePlus;
 return g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp&&g.amount===1?1:0;
}
function earnedAttackDamage(s,c){
 const g=c?.attackDamageGranted;
 return g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp&&g.amount===2?2:1;
}
export function universalAttackDamage(pack,s,c){
 const d=card(pack,c),owner=Number(String(c.uid).split('-')[0]);
 if(d.type!=='character')return 1;
 // An already-resolved this-turn grant survives later loss of original text.
 const earned=earnedAttackDamage(s,c);
 const plus=attackDamagePlus(s,c);
 if(originalEffectsDisabled(s,c))return earned+plus;
 // A resolved BLOCK battle win by ANOTHER own physical character is a
 // temporary replacement keyword. It does not invent Impact or extra LIFE.
 const gained=c.otherOwnBattleWinDamage2;
 // 【ダメージ（2）】 replaces the 1 direct-attack damage. It is not Impact.
 const passiveKeyword=d.passiveBonuses.reduce((n,p)=>Math.max(n,
  p.attackDamage&&matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
   ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x))?p.attackDamage:0),0);
 const base=Math.max(d.printedAttackDamage||1,earned,
  gained&&gained.turn===s.turn&&
   gained.stamp===c.fieldEntryStamp?2:1,passiveKeyword);
 return base+plus+d.passiveBonuses.reduce((n,p)=>n+(p.extraDamage&&
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
// 〔エナジーLにある場合〕〔ターン1〕. The source is on the energy line and
// swaps with one own front character that has not attacked this turn.
// Q2314 (2026-09-04): after the battle, and after a life trigger check.
function energyLineAttackEndFrontChoices(pack,s,owner){
 return s.players[owner].front.filter(c=>c&&card(pack,c).type==='character'&&
  !card(pack,c).energyForbidden&&!(s.attacksByUid[c.uid]>=1))
  .map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
}
function energyLineAttackEndReady(pack,s,c){
 return !!c&&card(pack,c).energyLineAttackEndSwap===true&&
  !card(pack,c).frontForbidden&&!originalEffectsDisabled(s,c)&&
  c.energyLineAttackEndSwapUsedTurn!==s.turn;
}
function queueEnergyLineAttackEndSwaps(pack,s,owner,attackerUid){
 if(!energyLineAttackEndFrontChoices(pack,s,owner).length)return;
 const sources=s.players[owner].energy.filter(c=>energyLineAttackEndReady(pack,s,c));
 if(!sources.length)return;
 if(s.active!==owner||s.phase!=='attack'||!(s.attacksByUid[attackerUid]>=1))
  throw Error('Unproven energy-line attack-end window');
 const jobs=sources.map(src=>({op:'resolveEnergyLineAttackEndSwap',owner,
  sourceUid:src.uid,sourceStamp:src.fieldEntryStamp,attackerUid}));
 if(jobs.length===1)s.effectQueue.push(jobs[0]);
 else s.effectQueue.push({op:'phaseOrder',owner,entries:jobs.map(job=>({
  key:job.sourceUid,jobs:[job]}))});
}
function hasCurrentBattleGrant(s,c,property){
 const g=c?.[property];
 return !!g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp&&
  !originalEffectsDisabled(s,c);
}
function liveFirstAttackKit(s,c){
 const g=c?.firstAttackKit;
 return g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp&&g.consumed!==true?g:null;
}
function consumeFirstAttackKit(s,attacker){
 const g=attacker?.firstAttackKit;
 if(g&&g.armed===true&&g.consumed!==true&&g.turn===s.turn&&
  s.attacksByUid[attacker.uid]===1)g.consumed=true;
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
 const g=c.impactGranted;
 const earned=g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp?g.amount:0;
 const plus=earned&&g.plus===true;
 const kit=c.firstAttackKit;
 const kitImpact=kit&&kit.armed===true&&kit.consumed===false&&kit.turn===s.turn&&
  kit.stamp===c.fieldEntryStamp&&s.attacksByUid[c.uid]===1?1:0;
 if(originalEffectsDisabled(s,c))return Math.max(earned,kitImpact);
 // Printed impact and the facedown-under profile stay separate from each
 // other and from a live passive impact. Pack validation refuses stacking.
 // インパクト（+1）adds to that base. A plain grant stays the larger value.
 const under=hasFacedownUnder(c)?(d.conditionalUnderFaceDown?.impact||0):0;
 const owner=Number(String(c.uid).split('-')[0]);
 const passive=d.passiveBonuses.reduce((n,p)=>n+(p.impact&&
  matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
   ()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x))?p.impact:0),0);
 const base=d.printedImpact||(d.conditionalImpactBpAtLeast!==null&&
  bp(pack,s,c)>=d.conditionalImpactBpAtLeast?1:0)||under||passive;
 const result=plus?base+earned:
  d.printedImpact?Math.max(d.printedImpact,earned):
  d.conditionalImpactBpAtLeast!==null&&bp(pack,s,c)>=d.conditionalImpactBpAtLeast?Math.max(1,earned):
  under?Math.max(under,earned):Math.max(earned,passive);
 return Math.max(result,kitImpact);
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
 if(filter.field==='printedApAtLeast')return filter.value===2&&printed.ap>=2;
 if(filter.field==='printedEnergy')return printed.type==='character'&&
  Number.isInteger(filter.value)&&printed.energy===filter.value;
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
 // Printed レイドを持たない. Absent excludeRaid still accepts a Raid character.
 if(query.excludeRaid===true&&card(pack,physical).raidName)return false;
 // Groups are AND inside and OR across. Absent groups keeps flat filters.
 if(Array.isArray(query.groups))
  return query.groups.some(g=>matchesSearch(pack,s,physical,{filters:g.filters,logic:g.logic}));
 if(!query.filters)return matchesFilter(pack,s,physical,query.filter);
 const result=query.filters.map(f=>matchesFilter(pack,s,physical,f));
 return query.logic==='all'?result.every(Boolean):result.some(Boolean);
}
function searchChoices(pack,s,cards,query){
 return cards.filter(c=>matchesSearch(pack,s,c,query)).map(c=>c.uid);
}
function matchesExactEnergyRest(pack,s,c,q){
 // 必要エナジーがNの〈名前〉. Equality, not a maximum. AP is not a filter.
 // A printed Raid name does not remove the card; this entry is still REST.
 const d=card(pack,c);
 return d.type==='character'&&d.color===q.color&&d.energy===q.energy&&
  cardHasName(d,q.name,originalEffectsDisabled(s,c));
}
function matchesColorApNameOrTrait(pack,s,c,q){
 // 消費APがNの色の〔〈名前〉か特徴〕. AP and color are equality.
 // Required energy is not part of the sentence. A Raid name still
 // enters as an ordinary REST character. A field is not a character.
 const d=card(pack,c);
 if(d.type!=='character'||d.color!==q.color||d.ap!==q.ap)return false;
 const silenced=originalEffectsDisabled(s,c);
 return cardHasName(d,q.name,silenced)||cardHasTrait(d,q.trait);
}
function matchesTraitApAffordableRest(pack,s,owner,c,q){
 // 必要エナジーを満たしている消費AP Nの［特徴］. AP is equality.
 // A printed Raid name still enters as an ordinary REST character.
 const d=card(pack,c);
 if(d.type!=='character'||d.ap!==q.ap||!cardHasTrait(d,q.trait))return false;
 const produced=universalEnergyByColor(pack,s,owner);
 return effectiveHandRequiredEnergy(pack,s,owner,d,c)<=(produced[d.color]||0);
}
function matchesActiveNameOrTrait(pack,s,owner,c,q){
 // 必要エナジーを満たし消費AP Nの色の〔〈名前〉か特徴〕. AP and color
 // are equality. A field is not a character. Silence exists only on
 // the field, so an outside alias still counts as the printed name.
 const d=card(pack,c);
 if(d.type!=='character'||d.color!==q.color||d.ap!==q.ap)return false;
 const silenced=originalEffectsDisabled(s,c);
 if(!cardHasName(d,q.name,silenced)&&!cardHasTrait(d,q.trait))return false;
 const produced=universalEnergyByColor(pack,s,owner);
 return effectiveHandRequiredEnergy(pack,s,owner,d,c)<=(produced[d.color]||0);
}
function matchesOutsideRecovery(pack,s,c,q){
 if(q.filters)return matchesSearch(pack,s,c,{filters:q.filters,logic:q.logic});
 if(q.filter)return matchesFilter(pack,s,c,q.filter);
 const d=card(pack,c);
 if(q.excludeName&&cardHasName(d,q.excludeName))return false;
 if(q.printedBpLimit!==undefined)
  return d.type==='character'&&d.bp<=q.printedBpLimit;
 if(q.traitlessEnergyLimit!==undefined)
  return d.type==='character'&&d.traits.length===0&&d.energy<=q.traitlessEnergyLimit;
 if(Number.isInteger(q.printedEnergyMax))return d.energy<=q.printedEnergyMax;
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
 if(card(pack,physical).type==='character'&&['front','energy'].includes(to)&&
  !['front','energy'].includes(from))
  s.fieldEntryNames[owner].push(card(pack,physical).name);
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
function expireRequiredEnergyBuffs(s){
 const walk=c=>{
  if(!c)return;
  if(Array.isArray(c.buffs))c.buffs=c.buffs.filter(b=>
   b.requiredEnergy===undefined||b.untilTurn>=s.turn);
  for(const layer of [...(c.stack||[]),...(c.under||[])])walk(layer);
 };
 for(const side of s.players){
  for(const zone of ['hand','deck','life','outside','removed'])
   for(const c of side[zone]||[])walk(c);
  for(const line of ['front','energy'])for(const c of side[line])walk(c);
 }
}
function startTurn(pack,s){
 const p=s.active,pl=s.players[p];
 pl.ownTurns++;s.turn++;expireRequiredEnergyBuffs(s);s.phase='start';s.extraDrawn=false;s.moved=false;s.movedUids=[];s.pending=null;s.attacksThisTurn=0;
 s.attacksByUid={};s.blocksByUid={};
 s.endRefreshed=false;
 expireContinuousStates(s,{player:p,phase:'start',edge:'start'});
 s.raidedThisTurn=[false,false];s.triggerActivated=[false,false];
 s.fieldEntryNames=[[],[]];
 s.mainAbilityUsedUids=[];s.mainReadyOnceByName=[[],[]];
 s.onceEffectUses=[[],[]];
 s.effectApPaidColors=[[],[]];s.handZeroApUses=[];
 // A NEW turn resets both players' previous turn-scoped movement history.
 s.turnEffectZoneMoves=[{handToOutside:false,outsideToHand:false},
  {handToOutside:false,outsideToHand:false}];
 s.turnRetireEvents=[]; // Turn boundary clears history for both controllers.
 s.zoneMoveEvents=[]; // Per-turn internal provenance; ordinal monotonic across turns.
 for(const side of s.players)for(const unit of field(side)){
  delete unit.blockFloorGranted;delete unit.blockAtLeastGranted;delete unit.readyOnAttackGranted;
  delete unit.impactGranted;
  delete unit.energyMoveOnAttackGranted;delete unit.triggerUnchosenGranted;
  delete unit.attackEndRetireGranted;
  if(unit.attackDamageGranted&&unit.attackDamageGranted.turn!==s.turn)
   delete unit.attackDamageGranted;
  if(unit.attackDamagePlus&&unit.attackDamagePlus.turn!==s.turn)
   delete unit.attackDamagePlus;
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
 if(s.status==='playing'){
  // A mark chosen on the previous turn resolves after this turn's refresh
  // and draw. The activator was set ACTIVE at her own attack end, so the
  // printed REST happens here and stays.
  const waiting=s.delayedEffects.filter(x=>x.op==='oppStartRetireRestMove'&&
   x.dueTurn===s.turn&&x.duePlayer===p);
  if(waiting.length){
   s.delayedEffects=s.delayedEffects.filter(x=>!(x.op==='oppStartRetireRestMove'&&
    x.dueTurn===s.turn&&x.duePlayer===p));
   s.effectQueue.push(...waiting.map(x=>({
    op:'oppStartRetireRestMove',owner:x.owner,sourceUid:x.sourceUid,
    sourceStamp:x.sourceStamp,targetUid:x.targetUid
   })));
  }
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
   if(job.ownTurnOnly===true&&s.active!==owner)continue;
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
  else if(job.op==='buffNamedImpact'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-named-impact',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,name:job.name,bp:job.bp,
    impact:job.impact,choices};
  }
  else if(job.op==='buffNameOrTraitImpact'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    (cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))||
     cardHasTrait(card(pack,c),job.trait))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-name-or-trait-impact',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,name:job.name,
    trait:job.trait,bp:job.bp,impact:job.impact,choices,optional:true};
  }
  else if(job.op==='restActiveNamedReadyAp'){
   const choices=field(pl).filter(c=>c.ready===true&&card(pack,c).type==='character'&&
    job.names.some(name=>cardHasName(card(pack,c),name,originalEffectsDisabled(s,c)))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-named-rest-ready',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,names:[...job.names],
    recoverAp:job.recoverAp,choices};
  }
  else if(job.op==='readyNameOrTrait'||job.op==='protectNameOrTrait'){
   const matches=c=>card(pack,c).type==='character'&&c.uid!==job.sourceUid&&
    (cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))||
     cardHasTrait(card(pack,c),job.trait));
   const choices=field(pl).filter(matches).map(c=>c.uid);
   if(choices.length)s.pending={kind:job.op==='readyNameOrTrait'?
    'effect-name-or-trait-ready':'effect-name-or-trait-protect',
    player:owner,sourceUid:job.sourceUid,sourceName:job.sourceName,
    name:job.name,trait:job.trait,choices,optional:true};
  }
  else if(job.op==='sacrificeNamedChain'){
   const gate=!job.when||matchesV2LiveCondition(s,owner,job.sourceUid,job.when,
    c=>card(pack,c),()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c));
   if(!gate)continue;
   const choices=field(pl).filter(c=>c.uid!==job.sourceUid&&
    card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-sacrifice-named',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,name:job.name,
    choices,optional:true,per:job.per,impactMinEnergy:job.impactMinEnergy};
  }
  else if(job.op==='retireOppFrontBySacrificedEnergy'){
   const cap=job.sacrificedEnergy*job.per;
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=cap&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,choices,limit:cap,
    optional:true,sacrificedEnergy:job.sacrificedEnergy,
    sacrificedUid:job.sacrificedUid,per:job.per};
  }
  else if(job.op==='openNamedKeywordGrant'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-named-keyword',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,name:job.name,
    choices,optional:true};
  }
  else if(job.op==='draw'){
   // 「自分の効果で登場」uses the stamped entry cause. 「自分のキャラの効果で
   // 登場」uses the deploying card's printed type. Paid play, paid Raid, life
   // triggers, events, and fields do not draw. An absent gate stays unconditional.
   const gated=job.entry==='ownEffect';
   const byCharacter=job.entry==='ownCharacter';
   if(job.entry!==undefined&&!gated&&!byCharacter)throw Error('Invalid draw entry gate');
   const allowed=job.entry===undefined||
    (gated&&OWN_EFFECT_ENTRY.has(job.entryCause))||
    (byCharacter&&job.entrySourceType==='character');
   if(allowed)draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='optionalDrawOne'){
   s.pending={kind:'effect-may-draw',player:owner,sourceUid:job.sourceUid};
  }
  else if(job.op==='drawIfOwnEnergyAtLeast'){
   // Printed generated-energy threshold is checked at resolution, after the
   // source actually enters the field, including own explicit FRONT producers.
   if(calcEnergy(pack,s,owner)>=job.energy)draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfOppFrontBelowPrinted'){
   // 元々のBPよりBPが低い is live BP against the printed number. A miss
   // resolves with no draw and no pending choice.
   if(matchesV2LiveCondition(s,owner,job.sourceUid,
    {kind:'oppFrontLiveBpBelowPrinted',turn:'any'},
    c=>card(pack,c),()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c)))
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='drawIfSelfBpAtLeast'){
   const source=location(s,owner,job.sourceUid);
   if(source&&bp(pack,s,source.c)>=job.bp)
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  }
  else if(job.op==='returnRetiredToHand'){
   const index=pl.outside.findIndex(c=>c.uid===job.sourceUid);
   if(index<0)throw Error('Retired card is not in its owner outside');
   // 「手札に加える」moves the retired card. 「加えてもよい」still asks.
   if(job.optional===false){
    const physical=pl.outside.splice(index,1)[0];
    pl.hand.push(physical);
    recordCompletedMove(pack,s,{physical,owner,from:'outside',to:'hand',
     reason:'own-effect',sourceUid:job.sourceUid});
   }else s.pending={kind:'effect-return-retired',player:owner,sourceUid:job.sourceUid};
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
  else if(job.op==='activeEnergyNamed'){
   // Energy line only. A character or a field qualifies. Front copies of
   // the same printed name do not. Silence removes aliases only.
   const named=c=>job.names.some(n=>cardHasName(card(pack,c),n,originalEffectsDisabled(s,c)));
   const choices=pl.energy.filter(c=>c&&['character','field'].includes(card(pack,c).type)&&named(c)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-active-energy-named',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,names:[...job.names],
    choices,optional:true};
  }
  else if(job.op==='millTop'){
   // Optional is one or two blind choices. The top card stays hidden until
   // the controller accepts, and a skip stops the rest. Mandatory mills
   // keep the previous loop.
   if(job.optional===true){
    if(job.then){
     if(job.count!==3)throw Error('Optional mill follow-up is three cards');
     if(pl.deck.length)s.pending={kind:'effect-optional-mill',player:owner,
      sourceUid:job.sourceUid,sourceName:job.sourceName,batch:job.count,
      then:job.then.map(e=>({...e,filters:e.filters.map(f=>({...f}))}))};
    }else{
     if(![1,2].includes(job.count))throw Error('Optional mill is one or two cards');
     if(pl.deck.length)s.pending={kind:'effect-optional-mill',player:owner,
      sourceUid:job.sourceUid,remaining:job.count};
    }
   }else{
    const before=pl.deck.length;
    for(let i=0;i<job.count&&pl.deck.length;i++)moveOwnedLinear(pack,s,{
     owner,from:'deck',to:'outside',index:0,reason:'own-effect',sourceUid:job.sourceUid});
    if(Array.isArray(job.then)&&before!==pl.deck.length)
     s.effectQueue.unshift(...job.then.map(e=>({...e,owner,
      sourceUid:job.sourceUid,sourceName:job.sourceName})));
   }
  }else if(job.op==='grantFirstAttackKit'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(!choices.length)throw Error('First-attack kit has no named character');
   s.pending={kind:'effect-first-attack-kit',player:owner,sourceUid:job.sourceUid,
    sourceName:job.sourceName,name:job.name,bp:job.bp,choices};
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
  }else if(job.op==='swapOrBuff'){
   const src=location(s,owner,job.sourceUid);
   const printed=src&&card(pack,src.c);
   const gate=printed?.mainAbility?.op==='oncePayProgram'&&
    printed.mainAbility.then?.find(x=>x.op==='discardGate'&&x.optional===false);
   const step=gate&&gate.then?.find(x=>x.op==='swapOrBuff'&&
    x.bp===job.bp&&x.allName===job.allName);
   if(!src||!step)throw Error('Swap or buff lost its source');
   const fronts=pl.front.filter(c=>c&&card(pack,c).type==='character'&&
    !card(pack,c).energyForbidden).map(c=>c.uid);
   const energies=pl.energy.filter(c=>c&&card(pack,c).type==='character'&&
    !card(pack,c).frontForbidden).map(c=>c.uid);
   const swap=fronts.length>0&&energies.length>0;
   const both=swap&&field(pl).some(c=>cardHasName(card(pack,c),job.allName,
    originalEffectsDisabled(s,c)));
   s.pending={kind:'effect-swap-or-buff',player:owner,sourceUid:job.sourceUid,
    sourceName:printed.name,bp:job.bp,allName:job.allName,
    options:[...(swap?['swap']:[]),'bp',...(both?['both']:[])]};
  }else if(job.op==='peekTopOne'){
   // Only the effect controller can inspect this private top card. Do not
   // include its UID/cardId in pending UI or public snapshots.
   if(pl.deck.length)s.pending={kind:'private-top-choice',player:owner,sourceUid:job.sourceUid};
  }else if(job.op==='peekTopOrBottom'){
    if(pl.deck.length)s.pending={kind:'private-top-place',player:owner,sourceUid:job.sourceUid};
   }else if(job.op==='revealOppTopPlace'){
    // The opponent reveals their own top card. The effect controller places
    // that same physical card on top or into the opponent's outside.
    const foe=1-owner,top=s.players[foe].deck[0];
    if(top){
     s.publicReveals.push({kind:'revealed-top',owner:foe,title:titleOf(pack,foe),
      cardId:top.cardId,uid:top.uid,trigger:null,turn:s.turn});
     if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
     s.pending={kind:'effect-reveal-opp-top',player:owner,sourceUid:job.sourceUid,
      sourceName:job.sourceName,target:foe,uid:top.uid};
    }
   }else if(job.op==='optionalRemoveHandThen'){
    const choices=pl.hand.filter(c=>matchesFilter(pack,s,c,job.filter)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-remove-hand',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,zone:'removed',
     filter:{field:job.filter.field,value:job.filter.value},
     then:job.then.map(e=>({...e}))};
   }else if(job.op==='removeHandTraitScaleRetire'){
    const choices=pl.hand.filter(c=>cardHasTrait(card(pack,c),job.trait)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-remove-hand-scale',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,trait:job.trait,
     baseBp:job.baseBp,per:job.per,choices,selected:[]};
    else s.effectQueue.unshift({op:'retireOppFrontUnderBp',bp:job.baseBp,optional:true,
     owner,sourceUid:job.sourceUid,sourceName:job.sourceName});
   }else if(job.op==='nameEnergyRevealHandRemove'){
    // 指定する happens before 公開. An empty deck has nothing to reveal.
    if(pl.deck.length)s.pending={kind:'effect-name-energy-reveal',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,min:0,max:30};
   }else if(job.op==='removeHandTraitCapScale'){
    const choices=pl.hand.filter(c=>cardHasTrait(card(pack,c),job.trait)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-remove-hand-cap',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,trait:job.trait,
     max:job.max,baseBp:job.baseBp,per:job.per,draw:true,choices,selected:[]};
    else s.effectQueue.unshift({op:'retireOppFrontUnderBp',bp:job.baseBp,
     owner,sourceUid:job.sourceUid,sourceName:job.sourceName});
   }else if(job.op==='recoverAp'){
   if(pl.apCards.some(c=>c.inPlay&&!c.ready))
    s.pending={kind:'effect-recover-ap',player:owner,sourceUid:job.sourceUid,remaining:job.count,
     ...(job.mandatory===true?{optional:false,sourceName:job.sourceName}:{})};
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
   if(uids.length)s.pending=job.split===true?
    {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,uids,split:true,order:[]}:
    {kind:job.toOutside?'effect-top-inspect':'effect-top-order',
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
     const predicate=job.groups?{groups:job.groups.map(g=>({logic:g.logic,
      filters:g.filters.map(f=>({...f}))}))}:
      job.filters?{filters:job.filters.map(f=>({...f})),logic:job.logic}:
      {filter:{...job.filter}};
     const raid=job.excludeRaid===true?{excludeRaid:true}:{};
     if(job.rest==='outside'){
      // 公開する covers every inspected card, not only the one added to hand.
      for(const physical of inspected)s.publicReveals.push({kind:'revealed-window',
       owner,title:titleOf(pack,owner),cardId:physical.cardId,uid:physical.uid,
       trigger:null,turn:s.turn});
      if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
      if(choices.length)s.pending={kind:'effect-top-filter-choice',player:owner,
       sourceUid:job.sourceUid,uids,choices,...predicate,rest:'outside',...raid};
      else for(let n=0;n<uids.length;n++)moveOwnedLinear(pack,s,{owner,from:'deck',
       to:'outside',index:0,reason:'own-effect',sourceUid:job.sourceUid});
     }else{
      // With no valid match, ALL inspected cards must still be ordered below.
      s.pending=choices.length?{kind:'effect-top-filter-choice',player:owner,
       sourceUid:job.sourceUid,uids,choices,...predicate,...raid,
       ...(job.noHandDiscard===true?{noHandDiscard:true}:{})}:
       {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,
        uids,order:[],rest:'bottom'};
     }
    }
   }else if(job.op==='lookTopHandOutsideBottom'){
    // 見る is private. One inspected card is added to hand, then one of the
    // remainder goes outside. Both steps are mandatory while a card remains.
    // The rest is ordered onto the bottom by the existing top-order window.
    const uids=pl.deck.slice(0,job.count).map(c=>c.uid);
    if(uids.length)s.pending={kind:'effect-top-hand-outside',player:owner,
     sourceUid:job.sourceUid,uids,step:'hand'};
   }else if(job.op==='chooseEnergyRevealOutside'){
    // The number is chosen before the cards are revealed. An empty deck
    // has nothing to publish and does not open the number choice.
    if(pl.deck.length)s.pending={kind:'effect-choose-printed-energy',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,count:job.count,min:0,max:30};
   }else if(job.op==='deployOwnHandRest'||job.op==='deployOwnHandSpecial'){
    // Current hand is recomputed AFTER earlier optional outside recovery.
    // when is the printed 自分の場に〈名前〉がある場合 gate. A miss does not
    // open the optional REST entry. Absent when keeps every older profile.
    const special=job.op==='deployOwnHandSpecial';
    const gate=special||!job.when||matchesV2LiveCondition(s,owner,job.sourceUid,job.when,
     c=>card(pack,c),()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c));
    const choices=!gate?[]:pl.hand.filter(c=>{
     const d=card(pack,c);
     return d.type===job.type&&(job.color===null||d.color===job.color)&&d.ap===job.ap&&
      (special?(job.maxEnergy===null||d.energy<=job.maxEnergy)&&
       (job.trait===null||cardHasTrait(d,job.trait)):
       d.energy<=job.energy&&(job.traitless!==true||(d.traits||[]).length===0));
    }).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-hand-rest',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,
     type:job.type,color:job.color,ap:job.ap,max:job.max,
     ...(special?{special:true,trait:job.trait,maxEnergy:job.maxEnergy,
      ready:job.ready,protectionScope:job.protectionScope}:
      {energy:job.energy,...(job.traitless===true?{traitless:true}:{})})};
   }else if(job.op==='deployOwnHandRestOrRaid'){
    const choices=pl.hand.filter(c=>matchesHandRestOrRaid(pack,s,c,job)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-hand-rest-or-raid',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,
     type:job.type,color:job.color,ap:job.ap,maxEnergy:job.maxEnergy,
     names:job.names===null?null:[...job.names],max:job.max,optional:true,
     ...(job.requireAffordableEnergy===true?{requireAffordableEnergy:true}:{})};
   }else if(job.op==='optionalPayApThen'){
    // No ready AP means the printed payment cannot be made. Do not open a
    // choice and do not run the gated program. A printed field condition
    // that misses does not offer the payment.
    const gate=!job.when||matchesV2LiveCondition(s,owner,job.sourceUid,job.when,
     c=>card(pack,c),()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c));
    if(gate&&pl.apCards.some(c=>c.ready))s.pending={kind:'effect-optional-pay-ap',
     player:owner,sourceUid:job.sourceUid,sourceName:job.sourceName,
     ap:job.ap,then:job.then.map(e=>({...e}))};
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
   const query=job.filters?{filters:job.filters.map(f=>({...f})),logic:job.logic}:
    {filter:{...job.filter}};
   const matches=pl.outside.filter(c=>matchesOutsideRecovery(pack,s,c,query)).map(c=>c.uid);
   if(matches.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,...query,choices:matches,optional:job.optional};
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
   }else if(job.op==='deployOutsideExactRest'){
    const choices=pl.outside.filter(c=>matchesExactEnergyRest(pack,s,c,job)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-outside-exact-rest',player:owner,
     sourceUid:job.sourceUid,choices,name:job.name,color:job.color,
     energy:job.energy,optional:true};
   }else if(job.op==='deployOutsideTraitApRest'){
    const choices=pl.outside.filter(c=>matchesTraitApAffordableRest(pack,s,owner,c,job)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-outside-trait-ap-rest',player:owner,
     sourceUid:job.sourceUid,choices,trait:job.trait,ap:job.ap,
     requireAffordableEnergy:true,optional:true};
   }else if(job.op==='deployOutsideColorApNameOrTraitRest'){
    const choices=pl.outside.filter(c=>matchesColorApNameOrTrait(pack,s,c,job)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-outside-color-ap-rest',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,color:job.color,
     ap:job.ap,name:job.name,trait:job.trait,optional:false};
    else if(job.optional!==true)throw Error('Mandatory color AP name-or-trait REST has no target');
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
     const choices=window.filter(c=>{
      const printed=card(pack,c);
      const traitOk=cardHasTrait(printed,job.trait)&&
       (job.color===undefined||printed.color===job.color);
      const nameOk=job.orName&&job.color===undefined&&cardHasName(printed,job.orName);
      return traitOk||nameOk;
     }).map(c=>c.uid);
     s.pending=choices.length?{kind:'effect-top-trait-outside',player:owner,
      sourceUid:job.sourceUid,uids,choices,trait:job.trait,
      ...(job.orName?{orName:job.orName}:{}),
      ...(job.color?{color:job.color}:{})}:
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
    count:job.count,short:choices.length<job.count,optional:job.optional,
    cardType:job.cardType,then:job.then.map(e=>({...e}))};
  }else if(job.op==='removeAnyOutsideScale'){
   const choices=pl.outside.map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-remove-outside',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,choices,selected:[],
    count:choices.length,short:false,optional:true,cardType:'any',any:true,
    scalePer:job.per,then:[]};
   }else if(job.op==='inspectTopColorAnyOutside'){
   const uids=pl.deck.slice(0,job.count).map(c=>c.uid);
   if(uids.length){
    const window=pl.deck.slice(0,uids.length);
    const choices=window.filter(c=>{
     const d=card(pack,c);
     return d.color===job.color&&
      (job.names.some(n=>cardHasName(d,n))||cardHasTrait(d,job.trait));
    }).map(c=>c.uid);
    s.pending=choices.length?{kind:'effect-top-trait-outside',player:owner,
     sourceUid:job.sourceUid,uids,choices,names:[...job.names],trait:job.trait,
     color:job.color,match:'colorAndAny'}:
     {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,
      uids,order:[],rest:'top'};
   }
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
  }else if(job.op==='grantSelfImpactThisTurn'){
   const loc=location(s,owner,job.sourceUid);
   if(loc&&Number.isInteger(loc.c.fieldEntryStamp))
    loc.c.impactGranted={turn:s.turn,stamp:loc.c.fieldEntryStamp,amount:job.amount};
  }else if(job.op==='returnSourceToHand'){
   const loc=location(s,owner,job.sourceUid);
   if(loc)bounceToHand(pack,s,owner,job.sourceUid,job.sourceUid);
  }else if(job.op==='optionalOwnLifeToHandThenDraw'){
   // Any own life card, not only the top. Identities stay hidden until the
   // chosen card enters hand. No life card means the optional take cannot start.
   if(pl.life.length)s.pending={kind:'effect-life-to-hand',player:owner,
    sourceUid:job.sourceUid,choices:pl.life.map(c=>c.uid),optional:true};
  }else if(job.op==='grantOtherImpactThisTurn'){
   const matches=c=>{
    const d=card(pack,c);
    if(d.type!=='character'||!Number.isInteger(c.fieldEntryStamp))return false;
    return job.minPrintedAp!==undefined?d.ap>=job.minPrintedAp:cardHasTrait(d,job.trait);
   };
   const choices=field(pl).filter(c=>(job.includeSelf===true||c.uid!==job.sourceUid)&&matches(c)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-grant-impact',player:owner,
    sourceUid:job.sourceUid,choices,
    ...(job.trait!==undefined?{trait:job.trait}:{}),
    ...(job.minPrintedAp!==undefined?{minPrintedAp:job.minPrintedAp}:{}),
    amount:job.amount,optional:true,plus:job.plus===true,includeSelf:job.includeSelf===true};
  }else if(job.op==='grantOwnNameBlockAtLeast'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-grant-block-at-least',player:owner,
    sourceUid:job.sourceUid,choices,name:job.name,bp:job.bp,optional:true};
  }else if(job.op==='grantSelfBlockAtLeast'){
   // The discard already left the hand. Grant only while this character is
   // still a field character and the payment is this source's own effect.
   const loc=location(s,owner,job.sourceUid);
   const live=loc&&card(pack,loc.c).type==='character'?loc.c:null;
   const printed=live&&card(pack,live);
   const earned=printed?.mainAbility?.op==='oncePayProgram'&&
    (printed.mainAbility.then||[]).some(step=>step.op==='discardGate'&&
     (step.then||[]).some(x=>x.op==='grantSelfBlockAtLeast'&&x.bp===job.bp));
   const paid=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&
    e.sourceUid===job.sourceUid&&e.from==='hand'&&e.to==='outside'&&
    e.reason==='payment'&&e.owner===owner);
   if(live&&earned&&paid&&Number.isInteger(live.fieldEntryStamp)&&
    !originalEffectsDisabled(s,live))
    live.blockAtLeastGranted={turn:s.turn,stamp:live.fieldEntryStamp,bp:job.bp};
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
  }else if(job.op==='recoverOutsideUnderEnergy'){
   const choices=pl.outside.filter(c=>card(pack,c).energy<=job.energy).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,printedEnergyMax:job.energy,choices,optional:true};
  }else if(job.op==='bounceOwnOtherUnderEnergy'){
   if(Array.isArray(job.then)){
    const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
     card(pack,c).energy<=job.energy).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-bounce-own',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,optional:true,
     energy:job.energy,then:job.then.map(e=>({...e}))};
   }else{
   const choices=field(pl).filter(c=>c.uid!==job.sourceUid&&
    card(pack,c).type==='character'&&(job.optional===true?
     !cardHasName(card(pack,c),job.excludeName):card(pack,c).energy<=job.energy)).map(c=>c.uid);
   if(choices.length||job.optional===true)s.pending={kind:'effect-bounce-own',player:owner,
    sourceUid:job.sourceUid,choices,...(job.optional===true?
     {optional:true,excludeName:job.excludeName,after:job.after}:{energy:job.energy})};
   else bounceToHand(pack,s,owner,job.sourceUid,job.sourceUid);
   }
  }else if(job.op==='discardOppHand'){
   // The opponent chooses one of their own hand cards. Empty hand does nothing.
   const foe=1-owner;
   if(s.players[foe].hand.length)
    s.pending={kind:'effect-discard',player:foe,sourceUid:job.sourceUid};
  }else if(job.op==='discardOppHandIfFewer'){
   // Compare after this card has already left the hand. Equal counts do nothing.
   const foe=1-owner;
   if(pl.hand.length<s.players[foe].hand.length&&s.players[foe].hand.length)
    s.pending={kind:'effect-discard',player:foe,sourceUid:job.sourceUid};
  }else if(job.op==='drawDiscard'){
   const live=c=>card(pack,c);
   const replace=job.instead&&matchesV2LiveCondition(s,owner,job.sourceUid,job.instead.when,
    live,()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c));
   if(replace)s.pending={kind:'effect-draw-instead',player:owner,sourceUid:job.sourceUid,
    sourceName:job.sourceName,count:job.count,discardCount:job.discardCount,
    when:{...job.instead.when}};
   else{
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
    if(pl.hand.length)s.pending={kind:'effect-discard',player:owner,sourceUid:job.sourceUid,
      ...(job.discardCount>1?{remaining:Math.min(job.discardCount,pl.hand.length)}:{})};
   }
  }else if(job.op==='frontOppTriggerDrawDiscard'){
   // Queued from either line. Only a front copy resolves, and only after the
   // opponent actually activated a trigger. Declining a reveal does not count.
   const pos=location(s,owner,job.sourceUid);
   if(pos&&pos.line==='front'&&!originalEffectsDisabled(s,pos.c)&&
    s.triggerActivated[1-owner]===true){
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
    if(pl.hand.length)s.pending={kind:'effect-discard',player:owner,
     sourceUid:job.sourceUid};
   }
  }else if(job.op==='retireOppFrontUnderBp'){
   const limit=retireOppFrontLimit(pack,s,owner,job);
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=limit).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,sourceUid:job.sourceUid,choices,limit,
    ...(job.optional===true?{optional:true}:{})};
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
  }else if(job.op==='retireOppFrontRest'){
   if(!(job.ownTurnOnly===true&&s.active!==owner)){
    const choices=s.players[1-owner].front.filter(c=>c&&c.ready===false&&
     card(pack,c).type==='character'&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,
     optional:true,onlyRest:true};
   }
  }else if(job.op==='bounceOppFrontOneUnderBp'){
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-bounce-bp',player:owner,
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
  }else if(job.op==='grantNamedFieldProtection'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    Number.isInteger(c.fieldEntryStamp)&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c)))
    .map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
   if(choices.length)s.pending={kind:'effect-named-field-protect',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,name:job.name,
    scope:job.scope,optional:true,choices};
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
  }else if(job.op==='activeApIfNameEntered'){
   const loc=location(s,owner,job.sourceUid);
   const printed=loc&&card(pack,loc.c);
   const has=v=>!!v&&typeof v==='object'&&(v.op==='activeApIfNameEntered'&&v.name===job.name||
    Object.values(v).some(has));
   if(loc&&printed&&!originalEffectsDisabled(s,loc.c)&&has(printed)&&
    (s.fieldEntryNames[owner]||[]).includes(job.name)&&
    pl.apCards.some(c=>c.inPlay&&!c.ready))
    s.pending={kind:'effect-recover-ap',player:owner,sourceUid:job.sourceUid,remaining:1};
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
  }else if(job.op==='grantPrintedLock'){
   const choices=s.players[1-owner].front.filter(c=>c&&
    card(pack,c).type==='character').map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
   if(choices.length)s.pending={kind:'effect-printed-lock',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,choices,optional:true};
  }else if(job.op==='drawRemoveIfName'){
   const named=c=>cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c));
   const present=field(pl).some(named)||(pl.removed||[]).some(named);
   if(present){
    draw(pack,s,owner,job.draw,{reason:'own-effect',sourceUid:job.sourceUid});
    if(s.status==='playing'&&pl.hand.length)s.pending={kind:'effect-name-hand-remove',
     player:owner,sourceUid:job.sourceUid,sourceName:job.sourceName,name:job.name,
     draw:job.draw,choices:pl.hand.map(c=>c.uid)};
   }
  }else if(job.op==='moveOtherAcrossOrRemove'){
   const loc=location(s,owner,job.sourceUid);
   const effect=loc&&(card(pack,loc.c).effects.onPlay||[]).find(e=>e.op==='moveOtherAcrossOrRemove');
   const includeSelf=job.includeSelf===true;
   const traitless=job.traitless===true;
   if(!effect||effect.excludeName!==job.excludeName||(effect.includeSelf===true)!==includeSelf||
    (effect.traitless===true)!==traitless)
    throw Error('Unproven line move');
   const choices=!originalEffectsDisabled(s,loc.c)?field(pl).filter(c=>{
    const printed=card(pack,c);
    return (includeSelf||c.uid!==job.sourceUid)&&
     printed.type==='character'&&
     !(printed.energyForbidden&&pl.front.includes(c))&&
     !(traitless&&printed.traits.length!==0)&&
     !(job.excludeName&&cardHasName(printed,job.excludeName,originalEffectsDisabled(s,c)));
   }).map(c=>c.uid):[];
   if(choices.length)s.pending={kind:'effect-line-move',player:owner,sourceUid:job.sourceUid,
    choices,optional:true,excludeName:job.excludeName??null,includeSelf,traitless};
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
    printed.mainAbility.then.some(e=>e.op==='grantSelfAttackDamageThisTurn'&&e.amount===job.amount)||
    printed?.mainAbility?.op==='repeatDiscardBattleKit'&&job.amount===2;
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
  }else if(job.op==='restOppFrontApLock'){
   // Q1040: a Raid on-play is checked after the optional front move.
   // Q1039: 元々の消費AP is the printed AP, including this character.
   const loc=location(s,owner,job.sourceUid);
   const printed=loc&&card(pack,loc.c);
   const effect=printed?.effects.onPlay?.find(e=>e.op==='restOppFrontApLock'&&
    e.optional===true&&e.line==='front'&&e.minPrintedAp===job.minPrintedAp&&
    e.lockWhile==='sourceOnFront');
   if(!effect)throw Error('Unproven front AP rest lock');
   if(!loc||loc.line!=='front'||originalEffectsDisabled(s,loc.c))continue;
   const choices=s.players[1-owner].front.filter(c=>c&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-ap-lock',player:owner,
    sourceUid:job.sourceUid,sourceStamp:loc.c.fieldEntryStamp,choices,
    optional:true,minPrintedAp:job.minPrintedAp,lockWhile:'sourceOnFront'};
  }else if(job.op==='restOppFrontOne'){
   // 自分のキャラの効果で登場していた場合. Events, fields, life triggers
   // and paid plays do not open this choice. Absent entry keeps older prints.
   if(job.entry==='ownCharacter'&&job.entrySourceType!=='character')continue;
   const choices=s.players[1-owner].front.filter(c=>c&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:null,optional:job.optional,
    skipNextActive:job.skipNextActive===true};
  }else if(job.op==='oppFrontRestBranch'){
   const named=field(pl).some(c=>cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c)));
   const mode=named?job.instead:job.base;
   const limit=job.bp??null;
   const choices=s.players[1-owner].front.filter(c=>c&&
    (limit===null||bp(pack,s,c)<=limit)&&
    cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length&&mode==='retire')s.pending={kind:'effect-retire-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit};
   else if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit,optional:job.optional,
    skipNextActive:mode==='restSkip'||mode==='restSkipDraw',
    ...(mode==='restSkipDraw'?{thenDraw:1}:{})};
  }else if(job.op==='restOppFrontUnderBp'){
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:job.bp,optional:job.optional,
    skipNextActive:job.skipNextActive===true};
  }else if(job.op==='buffOwnField'){
   const pool=job.zone==='front'?pl.front.filter(Boolean):field(pl);
   const choices=pool.filter(c=>card(pack,c).type==='character'&&
    (!job.excludeSelf||c.uid!==job.sourceUid)&&
    matchesFilter(pack,s,c,job.filter)&&
    (!job.also||matchesFilter(pack,s,c,job.also))).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-buff-own',player:owner,
    sourceUid:job.sourceUid,choices,filter:job.filter,
    ...(job.also?{also:job.also}:{}),
    bp:job.bp,optional:job.optional,excludeSelf:job.excludeSelf,
    ...(job.bonusNames?{bonusNames:job.bonusNames,bonusBp:job.bonusBp}:{}),
    ...(job.attackEndRetire===true?{attackEndRetire:true}:{})};
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
  }else if(job.op==='retireOwnTraitFollow'){
    const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
     cardHasTrait(card(pack,c),job.trait)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-retire-own-trait',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,trait:job.trait,
     choices,optional:job.optional===true,follow:job.follow};
    else if(job.optional!==true)throw Error('Mandatory trait retirement has no target');
  }else if(job.op==='resolveTraitRetireFollow'){
    if(job.follow?.kind==='underBpDraw'&&job.follow.draw===1){
     const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.limit).map(c=>c.uid);
     if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,
      sourceUid:job.sourceUid,choices,limit:job.limit,optional:true,thenDraw:1};
     else draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
    }else if(job.follow?.kind==='drawActivePair'&&job.follow.draw===1&&job.follow.max===2){
     draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
     s.effectQueue.unshift({op:'openActivePair',owner,sourceUid:job.sourceUid,
      sourceName:job.sourceName,remaining:job.follow.max,color:job.follow.color,
      ap:job.follow.ap,name:job.follow.name,trait:job.follow.trait,draw:1});
    }else if(job.follow?.kind==='searchTop'){
     s.effectQueue.unshift({op:'searchTopUpToTwoBottom',count:job.follow.count,
      max:job.follow.max,rest:job.follow.rest,logic:job.follow.logic,
      filters:job.follow.filters.map(f=>({...f})),owner,sourceUid:job.sourceUid,
      sourceName:job.sourceName});
    }else throw Error('Unsupported trait retirement follow-up');
  }else if(job.op==='openFieldActiveBuff'){
    const choices=field(pl).map(c=>c.uid);
    const characters=field(pl).filter(c=>card(pack,c).type==='character').map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-active-any',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,optional:true,bp:job.bp};
    else if(characters.length)s.pending={kind:'effect-buff-own',player:owner,
     sourceUid:job.sourceUid,choices:characters,
     filter:{field:'type',value:'character'},bp:job.bp,optional:true};
  }else if(job.op==='openActivePair'){
    const choices=pl.outside.filter(c=>matchesActiveNameOrTrait(pack,s,owner,c,job)).map(c=>c.uid);
    if(choices.length&&(job.remaining===1||job.remaining===2))s.pending={kind:'effect-outside-active-pair',player:owner,
     sourceUid:job.sourceUid,sourceName:job.sourceName,choices,optional:true,
     remaining:job.remaining,color:job.color,ap:job.ap,name:job.name,
     trait:job.trait,draw:job.draw};
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
   // inherit this temporary, printed action effect. excludeSelf is the
   // printed 他の: this physical card is not one of the recipients.
   for(const c of field(pl))if(cardHasTrait(card(pack,c),job.trait)&&
    !(job.excludeSelf===true&&c.uid===job.sourceUid)){
    c.buffs??=[];c.buffs.push({bp:job.bp,untilTurn:s.turn});
   }
  }else if(job.op==='moveEnergyTraitToFront'){
   // 望む枚数 includes zero. Only characters can enter the front line, and
   // only while an empty front slot exists. A field stays where it is.
   const source=location(s,owner,job.sourceUid);
   const open=pl.front.some(c=>!c);
   const choices=!source||originalEffectsDisabled(s,source.c)||!open?[]:
    pl.energy.filter(c=>c&&card(pack,c).type==='character'&&
     !card(pack,c).frontForbidden&&
     cardHasTrait(card(pack,c),job.trait)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-energy-trait-front',player:owner,
    sourceUid:job.sourceUid,trait:job.trait,choices,selected:[],optional:true};
  }else if(job.op==='drawIfRaidUnderFacedown'){
   const raid=field(pl).find(c=>c.uid===job.raidUid);
   if(!raid)throw Error('Raid-base follow-up missing the Raid target');
   const under=c=>(c.under||[]).some(x=>x.faceDown===true||under(x))||
    (c.stack||[]).some(x=>x.faceDown===true||under(x));
   if(under(raid))draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  }else if(job.op==='retireAttackEndGranted'){
   // アタック終了時. Direct attacks and attacker wins still retire after
   // the battle's life continuation. A lost attacker has already left.
   const pos=location(s,owner,job.sourceUid);
   const live=pos?.line==='front'?pos.c:null;
   const grant=live?.attackEndRetireGranted;
   if(live&&live.fieldEntryStamp===job.sourceStamp&&grant&&
    grant.turn===s.turn&&grant.stamp===live.fieldEntryStamp&&
    grant.sourceUid===job.grantSourceUid){
    delete live.attackEndRetireGranted;
    retire(pack,s,owner,'front',pos.slot);
   }
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
  }else if(job.op==='resolveEnergyLineAttackEndSwap'){
   const src=pl.energy.find(c=>c?.uid===job.sourceUid);
   const choices=energyLineAttackEndFrontChoices(pack,s,owner);
   if(src&&src.fieldEntryStamp===job.sourceStamp&&energyLineAttackEndReady(pack,s,src)&&
    choices.length&&s.attacksByUid[job.attackerUid]>=1){
    src.energyLineAttackEndSwapUsedTurn=s.turn;
    s.pending={kind:'energy-line-attack-end-swap',player:owner,
     sourceUid:src.uid,sourceStamp:src.fieldEntryStamp,
     attackerUid:job.attackerUid,choices};
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
   queueEnergyLineAttackEndSwaps(pack,s,owner,attacker.uid);
   if(bp(pack,s,attacker)>=bp(pack,s,defender)){
    grantBattleWinToOtherOwn(pack,s,owner,attacker,'attacker');
    const hasDraw=hasCurrentBattleGrant(s,attacker,'attackWinDrawGranted');
    const defenderSlot=s.players[1-owner].front.findIndex(c=>c?.uid===job.targetUid);
    const impact=impactOnBattleWin(pack,s,attacker)>0&&
     !card(pack,defender).impactNull;
    const replacement=battleRemovesLoser(pack,s,attacker,1-owner)?
     removeBattleLoser(pack,s,1-owner,'front',defenderSlot):
     retire(pack,s,1-owner,'front',defenderSlot,{postImpact:impact,by:'battle'});
    // An earned draw belongs to the real attacking victor, never direct
    // LIFE. Preserve the existing onRetire-before-followup effect ordering.
    if(hasDraw)s.effectQueue.splice(retirementJobsInserted,0,
     {op:'draw',owner,count:1,sourceUid:attacker.uid});
    queueAttackWinRecovery(pack,s,owner,attacker);
    if(impact&&!replacement)queueImpactAfterRetirement(pack,s,1-owner);
   }else grantBattleWinToOtherOwn(pack,s,1-owner,defender,'blocker');
   // The target remains ACTIVE/REST if it survives. No fake block action.
  }else if(job.op==='resolveFirstAttackKit'){
   const attacker=pl.front.find(c=>c?.uid===job.sourceUid);
   const defender=s.players[1-owner].front.find(c=>c?.uid===job.targetUid);
   const kit=liveFirstAttackKit(s,attacker);
   if(s.active!==owner||s.phase!=='attack'||!attacker||!defender||!kit||
    kit.armed!==true||attacker.fieldEntryStamp!==job.sourceStamp||
    defender.fieldEntryStamp!==job.targetStamp||s.attacksByUid[job.sourceUid]!==1)
    throw Error('Unproven first-attack kit battle');
   queueEnergyLineAttackEndSwaps(pack,s,owner,attacker.uid);
   if(bp(pack,s,attacker)>=bp(pack,s,defender)){
    grantBattleWinToOtherOwn(pack,s,owner,attacker,'attacker');
    const defenderSlot=s.players[1-owner].front.findIndex(c=>c?.uid===job.targetUid);
    const impact=impactOnBattleWin(pack,s,attacker)>0&&
     !card(pack,defender).impactNull;
    const replacement=battleRemovesLoser(pack,s,attacker,1-owner)?
     removeBattleLoser(pack,s,1-owner,'front',defenderSlot):
     retire(pack,s,1-owner,'front',defenderSlot,{postImpact:impact,by:'battle'});
    queueAttackWinRecovery(pack,s,owner,attacker);
    if(impact&&!replacement)queueImpactAfterRetirement(pack,s,1-owner);
   }else grantBattleWinToOtherOwn(pack,s,1-owner,defender,'blocker');
   consumeFirstAttackKit(s,attacker);
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
  }else if(job.op==='activeChosen'){
   // Runtime follow-up of a printed discard. Not a card-authored DSL op.
   // Silence on the chosen character does not cancel an effect that already
   // selected it; this is the source card setting that character ACTIVE.
   const pos=location(s,owner,job.targetUid);
   if(pos&&card(pack,pos.c).type==='character')
    attemptFieldActive(s,owner,pos.c);
  }else if(job.op==='replayOnPlay'){
   const pos=location(s,owner,job.sourceUid);
   const live=pos&&(pos.line==='front'||pos.line==='energy')?pos.c:null;
   const printed=live&&card(pack,live);
   if(live&&printed.mainAbility?.op==='fieldRestSacrificeReplay'&&
    printed.name===job.sourceName){
    const jobs=programJobs(pack,s,live,'onPlay',owner);
    if(jobs.length)s.effectQueue.unshift(...jobs,
     ...sourceMoveBoundary(pack,s,owner,live.uid));
   }
  }else if(job.op==='openNamedDoubleAttack'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    cardHasTrait(card(pack,c),job.trait)).map(c=>c.uid);
   if(!choices.length)throw Error('Named double attack has no trait character');
   s.pending={kind:'effect-named-double',player:owner,sourceUid:job.sourceUid,
    sourceName:job.sourceName,trait:job.trait,choices};
  }else if(job.op==='resolveEntrySacrifice'){
   const src=location(s,owner,job.sourceUid);
   const ability=src&&card(pack,src.c).mainAbility;
   const printed=src&&card(pack,src.c);
   if(!src||src.c.entryTurn!==s.turn||ability?.op!=='entryTurnSacrificeChoice'||
    printed.name!==job.sourceName||printed.color!==job.color||
    ability.energy!==job.energy||ability.color!==job.color||
    ability.minBp!==job.minBp||ability.down!==job.down)
    throw Error('Entry sacrifice reward lost its source');
   src.c.buffs??=[];
   src.c.buffs.push({energy:job.energy,color:job.color,
    untilOwnTurnStart:pl.ownTurns+1});
   s.pending={kind:'effect-choice-mode',player:owner,sourceUid:job.sourceUid,
    sourceName:job.sourceName,optional:false,options:[
     {id:'draw',label:'抽1張',turn:'any',then:[{op:'draw',count:1}]},
     {id:'cut',label:'前線BP−1000',turn:'any',then:[{op:'enemyBpDown',bp:job.down,
      optional:true,minBp:job.minBp,zone:'front'}]}
    ]};
  }else if(job.op==='noteEntryTurn'){
   const pos=location(s,owner,job.sourceUid);
   if(pos)pos.c.entryTurn=s.turn;
  }else if(job.op==='grantOtherRequiredEnergyThisTurn'){
   const choices=field(pl).filter(c=>c.uid!==job.sourceUid&&
    card(pack,c).type==='character').map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-required-energy',player:owner,
    sourceUid:job.sourceUid,choices,amount:2};
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
  }else if(job.op==='buffOwnNameIfPrintedEnergy'){
   // The gate is printed required energy, not generated energy. Silence does
   // not remove the printed name or that number. The buff may land on any
   // own character of the name, including one below the gate.
   const named=c=>cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c));
   const gate=field(pl).some(c=>card(pack,c).energy>=job.minEnergy&&named(c));
   if(gate){
    const choices=field(pl).filter(c=>card(pack,c).type==='character'&&named(c)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-buff-own',player:owner,
     sourceUid:job.sourceUid,choices,filter:{field:'name',value:job.name},
     bp:job.bp,optional:true,excludeSelf:false};
   }
  }else if(job.op==='enemyBpDown'){
   // 自分のターン中の場合. An opponent-turn retirement does not open the choice.
   if(job.ownTurnOnly===true&&s.active!==owner)continue;
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
  }else if(job.op==='markOppFrontRetireNextStart'){
   const pos=location(s,owner,job.sourceUid);
   if(pos&&pos.line==='front'&&!originalEffectsDisabled(s,pos.c)){
    const foe=1-owner;
    const choices=s.players[foe].front.filter(c=>c&&card(pack,c).type==='character'&&
     bp(pack,s,c)<=job.maxBp&&
     cardEffectTargetPayable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-mark-opp-start',player:owner,
     sourceUid:job.sourceUid,sourceStamp:pos.c.fieldEntryStamp,choices,
     maxBp:job.maxBp,optional:true};
   }
  }else if(job.op==='oppStartRetireRestMove'){
   // Only the visible card with this exact UID retires. A Raid top that
   // covered the chosen character is a different UID and stays.
   const foe=1-owner,target=location(s,foe,job.targetUid);
   if(target)retire(pack,s,foe,target.line,target.slot,{by:'opponent'});
   s.effectQueue.unshift({op:'restMoveSourceToEnergy',owner,
    sourceUid:job.sourceUid,sourceStamp:job.sourceStamp});
  }else if(job.op==='restMoveSourceToEnergy'){
   const pos=location(s,owner,job.sourceUid);
   if(pos&&pos.c.fieldEntryStamp===job.sourceStamp){
    pos.c.ready=false;
    if(pos.line==='front'&&!card(pack,pos.c).energyForbidden)
     s.pending={kind:'effect-line-slot',player:owner,sourceUid:job.sourceUid,
      moverUid:job.sourceUid,line:'energy'};
   }
  }else if(job.op==='drawDiscardIfFieldAny'){
   // 合計 counts each other field card once, even when it matches more than
   // one printed category. The source itself is 他の and does not count.
   const matched=field(pl).filter(c=>{
    if(c.uid===job.sourceUid)return false;
    const d=card(pack,c);
    return job.traits.some(t=>cardHasTrait(d,t))||
     job.names.some(n=>cardHasName(d,n,originalEffectsDisabled(s,c)));
   }).length;
   if(matched>=job.min){
    draw(pack,s,owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
    if(pl.hand.length)s.pending={kind:'effect-discard',player:owner,sourceUid:job.sourceUid,
     ...(job.discardCount>1?{remaining:Math.min(job.discardCount,pl.hand.length)}:{})};
   }
  }else if(job.op==='retireOwnMissingTraitThen'){
   const choices=[...pl.front,...pl.energy].filter(c=>c&&
    card(pack,c).type==='character'&&
    !cardHasTrait(card(pack,c),job.trait)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-missing-trait',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,trait:job.trait,choices,
    then:job.then.map(x=>({...x,owner,sourceUid:job.sourceUid,
     sourceName:job.sourceName}))};
  }else if(job.op==='deployOutsideColorTraitActive'){
   const choices=pl.outside.filter(c=>{
    const d=card(pack,c);
    return d.type==='character'&&d.color===job.color&&cardHasTrait(d,job.trait);
   }).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-outside-color-trait-active',player:owner,
    sourceUid:job.sourceUid,sourceName:job.sourceName,color:job.color,
    trait:job.trait,choices,optional:true};
  }else throw Error('Unimplemented effect op');
 }
}
function printedOwnerType(pack,s,owner,uid){
 // Snapshot the deploying card's printed type while that physical card still
 // exists. Life triggers and paid plays do not pass a source, so they stay
 // outside 自分のキャラの効果.
 if(!playerIndex(owner)||typeof uid!=='string'||!uid.startsWith(owner+'-'))return undefined;
 const pl=s.players[owner];
 const walk=c=>{
  if(!c)return null;
  if(c.uid===uid)return c;
  for(const layer of [...(c.stack||[]),...(c.under||[])]){
   const hit=walk(layer);if(hit)return hit;
  }
  return null;
 };
 const piles=[...pl.front,...pl.energy,...(pl.hand||[]),...(pl.deck||[]),
  ...(pl.life||[]),...(pl.lifeRevealed||[]),...(pl.outside||[]),
  ...(pl.removed||[]),...(pl.resolvingEvents||[])];
 for(const c of piles){
  const hit=walk(c);
  if(!hit)continue;
  const type=card(pack,hit).type;
  return type==='character'||type==='event'||type==='field'?type:undefined;
 }
 return undefined;
}
function programJobs(pack,s,physical,timing,owner,raidUid,entryCause,entrySourceType){
 // Q2220: printed leave triggers are lost before true retirement.
 return (originalEffectsDisabled(s,physical)?[]:card(pack,physical).effects[timing]||[])
  .map(e=>({...e,owner,sourceUid:physical.uid,
   sourceName:card(pack,physical).name,...(raidUid?{raidUid}:{}),
   ...(timing==='onPlay'&&entryCause?{entryCause}:{}),
   ...(timing==='onPlay'&&e.entry==='ownCharacter'&&
    (entrySourceType==='character'||entrySourceType==='event'||entrySourceType==='field')
    ?{entrySourceType}:{})}));
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
function applyEffects(pack,s,cardOnField,timing,owner,entryCause,entrySourceUid){
 // Entry/trigger effects interrupt the suspended continuation (e.g. DAMAGE2).
 const entrySourceType=timing==='onPlay'?printedOwnerType(pack,s,owner,entrySourceUid):undefined;
 const jobs=programJobs(pack,s,cardOnField,timing,owner,undefined,entryCause,entrySourceType);
 const complete=jobs.length?[...jobs,...sourceMoveBoundary(pack,s,owner,cardOnField.uid)]:[];
 if(!(timing==='onPlay'&&deferLifeEntry(s,owner,cardOnField.uid,complete)))
  s.effectQueue.unshift(...complete);
 continueEffectQueue(pack,s);
}
function validRaidBase(pack,s,owner,base,top){
 if(!base||!top.raidName)return false;
 const b=card(pack,base);
 // Q553 (2023-09-25): a printed Raid host waives the named base and every
 // condition written to the right of 【レイド】. The buried layer is not the
 // visible card, and silence removes the permission.
 if(b.raidHostAny&&!originalEffectsDisabled(s,base)&&!b.raidName&&!(base.stack?.length))
  return true;
 if(!top.raidRequiresNames.every(n=>raidNamePresent(pack,s,owner,n)))return false;
 const names=top.raidBaseNames;
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
 const entrySourceType=entryCause==='paidRaid'||entryCause==='lifeRaid'?undefined:
  printedOwnerType(pack,s,p,effectSourceUid);
 const entryJobs=programJobs(pack,s,cardOnTop,'onPlay',p,undefined,entryCause,entrySourceType);
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
  delete next.ownEffectFront;delete next.attackDamageGranted;delete next.attackDamagePlus;return next;
 };
 for(const layer of below(top)){
  const physical=reset(layer);pl.outside.push(physical);
  recordCompletedMove(pack,s,{physical,owner:p,from:'raid-under',to:'outside',
   reason:'rule',sourceUid});
 }
 const bounced=reset(top);
 bounced.buffs=(top.buffs||[]).filter(b=>b.requiredEnergy===2&&b.untilTurn===s.turn&&
  Object.keys(b).length===2&&Object.keys(b).every(k=>k==='requiredEnergy'||k==='untilTurn'));
 pl.hand.push(bounced);
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
  delete next.ownEffectFront;delete next.attackDamageGranted;delete next.attackDamagePlus;return next;
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
function raidFrontRetireDrawEntry(pack,s,owner,retired){
 if(card(pack,retired).type!=='character')return null;
 const watcher=s.players[owner].front.find(c=>{
  if(!c||c.uid===retired.uid||originalEffectsDisabled(s,c))return false;
  const d=card(pack,c);
  if(d.raidFrontOtherRetireDraw!==1||!faceUpRaid(pack,c))return false;
  return !s.mainReadyOnceByName[owner].includes(d.name+'|raidFrontOtherRetireDraw');
 });
 if(!watcher)return null;
 const d=card(pack,watcher);
 s.mainReadyOnceByName[owner].push(d.name+'|raidFrontOtherRetireDraw');
 return {key:watcher.uid+':raidFrontOtherRetireDraw:'+s.turn,owner,
  sourceUid:watcher.uid,jobs:[{op:'optionalDrawOne',owner,
   sourceUid:watcher.uid,sourceName:d.name}]};
}
function queueRetirement(pack,s,p,c,line){
 // Capture the source before moving to outside. Only GENUINE retirement
 // queues onRetire; bounce, removed area and stripping a Raid top do not.
 const jobs=programJobs(pack,s,c,'onRetire',p).map(job=>({
  ...job,retiredSource:{uid:c.uid,cardId:c.cardId,line,ready:c.ready,
   bp:bp(pack,s,c),fieldEntryStamp:c.fieldEntryStamp??null}
 }));
 const entries=[];
 if(jobs.length)entries.push({key:c.uid+':onRetire:'+(c.fieldEntryStamp??'0'),owner:p,
  sourceUid:c.uid,jobs});
 const watcher=raidFrontRetireDrawEntry(pack,s,p,c);
 if(watcher)entries.push(watcher);
 if(!entries.length){retirementJobsInserted=0;return 0;}
 if(Array.isArray(s.retirementBatch)){
  for(const entry of entries){
   if(s.retirementBatch.some(x=>x.key===entry.key))
    throw Error('Retirement trigger already queued for this physical card');
   s.retirementBatch.push(entry);
  }
  retirementJobsInserted=0;
  return 0;
 }
 // A lone retirement interrupts the suspended continuation (next LIFE,
 // Impact damage, or the causing effect's follow-up). Q74: 退場時 before Impact.
 retirementJobsInserted=unshiftRetirementEntries(s,entries);
 return retirementJobsInserted;
}
function raidLeaveOffer(pack,s,p,c){
 if(!c||originalEffectsDisabled(s,c))return false;
 const rule=card(pack,c).raidHandLeaveReplace;
 if(!rule||!strippableRaidTop(pack,c))return false;
 if((card(pack,c.stack[0]).energy||0)<rule.minBaseEnergy)return false;
 return s.players[p].hand.length>0;
}
function battleRemovesLoser(pack,s,winner,loserOwner){
 // Q572 (2023-09-25): 退場する代わりにリムーブ. Only the winner's own turn,
 // and only the opposing character that lost the battle. Silence removes it.
 if(!winner||originalEffectsDisabled(s,winner)||!card(pack,winner).battleRemoveInstead)
  return false;
 const winnerOwner=Number(String(winner.uid).split('-')[0]);
 return s.active===winnerOwner&&loserOwner!==winnerOwner;
}
function removeBattleLoser(pack,s,p,line,slot){
 const c=s.players[p][line][slot];
 if(!c)throw Error('Cannot remove empty field');
 vacate(pack,s,p,line,slot,'removed');
 recordCompletedMove(pack,s,{physical:c,owner:p,from:line,to:'removed',reason:'rule'});
 return false;
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
 if(!skipReplacement&&(by==='opponent'||by==='battle')&&raidLeaveOffer(pack,s,p,c)){
  s.pending={kind:'effect-raid-leave',player:p,uid:c.uid,line,slot,
   mode:'retire',postImpact:!!postImpact,by};
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
function effectMoveTo(pack,s,p,moverUid,destLine,slot,replaceUid,sourceUid){
 const from=location(s,p,moverUid);
 if(!from||from.line===destLine)throw Error('Line move source left its original line');
 if(replaceUid)commitDestination(pack,s,p,destLine,slot,replaceUid);
 else if(s.players[p][destLine][slot])throw Error('Destination occupied');
 const moving=from.c;
 if(destLine==='energy'&&card(pack,moving).energyForbidden)
  throw Error('This character cannot move to the energy line');
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
 delete base.attackDamageGranted;delete base.attackDamagePlus;delete base.ownEffectFront;
 base.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner][line][slot]=base;
 const departed={...top,ready:false,stack:[],under:[],buffs:[],faceDown:false,fieldEntryStamp:null};
 delete departed.attackDamageGranted;delete departed.attackDamagePlus;delete departed.ownEffectFront;
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
 if(q.kind==='effect-grant-cause'){
  if(a.mode==='grant'){
   const cause=location(s,q.player,q.causeUid);
   if(!cause||cause.c.fieldEntryStamp!==q.stamp)
    throw Error('Block floor source left its field entry');
   cause.c.blockFloorGranted={turn:s.turn,stamp:q.stamp,bp:q.bp,sourceUid:q.sourceUid};
  }else if(a.mode!=='skip')throw Error('Invalid block floor choice');
  s.pending=null;continueEffectQueue(pack,s);return;
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
  applyEffects(pack,s,physical,'onPlay',q.player,'outsideEffect',physical.uid);
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
  applyEffects(pack,s,physical,'onPlay',q.player,'outsideEffect',q.sourceUid);
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
 if(q.kind==='effect-energy-trait-front'){
  if(a.uid!==null){
   const from=p.energy.findIndex(c=>c?.uid===a.uid);
   const printed=from>=0?card(pack,p.energy[from]):null;
   if(from<0||!q.choices.includes(a.uid)||q.selected.includes(a.uid)||
    !printed||printed.type!=='character'||printed.frontForbidden||
    !cardHasTrait(printed,q.trait)||p.front[a.slot])
    throw Error('Illegal energy-line trait move');
   const unit=p.energy[from];
   p.energy[from]=null;p.front[a.slot]=unit;
   recordCompletedMove(pack,s,{physical:unit,owner:q.player,from:'energy',to:'front',
    reason:'own-effect',sourceUid:q.sourceUid});
   q.selected.push(a.uid);
  }else if(a.type!=='chooseEnergyTraitFront')throw Error('Illegal energy-line trait move');
  const open=p.front.some(c=>!c);
  const left=q.choices.some(uid=>!q.selected.includes(uid)&&p.energy.some(c=>c?.uid===uid));
  if(a.uid===null||!open||!left){s.pending=null;continueEffectQueue(pack,s);}
  return;
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
 if(q.kind==='energy-line-attack-end-swap'){
  if(a.uid!==null){
   const src=location(s,q.player,q.sourceUid),dest=location(s,q.player,a.uid);
   if(!src||src.line!=='energy'||src.c.fieldEntryStamp!==q.sourceStamp||
    !dest||dest.line!=='front'||card(pack,dest.c).energyForbidden||
    !q.choices.some(c=>c.uid===a.uid&&c.stamp===dest.c.fieldEntryStamp))
    throw Error('Invalid energy-line attack-end swap');
   p.energy[src.slot]=dest.c;p.front[dest.slot]=src.c;
   recordCompletedMove(pack,s,{physical:src.c,owner:q.player,
    from:'energy',to:'front',reason:'own-effect',sourceUid:src.c.uid});
   recordCompletedMove(pack,s,{physical:dest.c,owner:q.player,
    from:'front',to:'energy',reason:'own-effect',sourceUid:src.c.uid});
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
  queueEnergyLineAttackEndSwaps(pack,s,s.active,attacker.uid);
  const endRetire=attacker.attackEndRetireGranted;
  if(endRetire&&endRetire.turn===s.turn&&endRetire.stamp===attacker.fieldEntryStamp)
   s.effectQueue.push({op:'retireAttackEndGranted',owner:s.active,
    sourceUid:attacker.uid,sourceStamp:attacker.fieldEntryStamp,
    grantSourceUid:endRetire.sourceUid});
  if(a.uid===null){
    const count=universalAttackDamage(pack,s,attacker);
    if(count>1)revealLifeBatch(pack,s,q.player,count);
    else damage(pack,s,q.player);
    consumeFirstAttackKit(s,attacker);
    if(!s.pending)continueEffectQueue(pack,s);
    return;
   }
  const slot=p.front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!p.front[slot].ready||
   fieldRestrictions(s,q.player,p.front[slot]).some(r=>r.kind==='cannotBlock'))
   throw Error('Illegal blocker');
  const blocker=p.front[slot];blocker.ready=false;
  // Official Q79/Q80 (2023-03-17): 【2回ブロック】 designates the blocker,
  // rests it, then sets it ACTIVE before battle. A loss therefore leaves
  // while ACTIVE. This count is per physical UID and is not the attack count.
  const blocked=(s.blocksByUid[blocker.uid]||0)+1;
  s.blocksByUid[blocker.uid]=blocked;
  const blockKeyword=card(pack,blocker).readyOnBlockCount;
  if(blockKeyword&&blocked===blockKeyword&&!originalEffectsDisabled(s,blocker))
   attemptFieldActive(s,q.player,blocker);
  // Q552 (2023-09-25): レイド状態 is a 【レイド】 card with a face-up card
  // underneath. The printed replacement is applied before this battle's BP
  // comparison, and each block applies it again.
  const blockShift=card(pack,blocker).blockRaidBp;
  if(blockShift&&!originalEffectsDisabled(s,blocker)){
   const raidState=!!card(pack,attacker).raidName&&
    (attacker.stack||[]).some(x=>x.faceDown!==true);
   blocker.buffs.push({bp:raidState?blockShift.raid:blockShift.plain,untilTurn:s.turn});
  }
  if(bp(pack,s,attacker)>=bp(pack,s,blocker)){
   grantBattleWinToOtherOwn(pack,s,s.active,attacker,'attacker');
   const impact=impactOnBattleWin(pack,s,attacker)>0&&
    !card(pack,blocker).impactNull;
   const earnedSelfDraw=hasCurrentBattleGrant(s,attacker,'attackWinDrawGranted');
   const replacement=battleRemovesLoser(pack,s,attacker,q.player)?
    removeBattleLoser(pack,s,q.player,'front',slot):
    retire(pack,s,q.player,'front',slot,{postImpact:impact,by:'battle'});
   if(earnedSelfDraw)s.effectQueue.splice(retirementJobsInserted,0,
    {op:'draw',owner:s.active,count:1,sourceUid:attacker.uid});
   queueAttackWinRecovery(pack,s,s.active,attacker);
   if(impact&&!replacement)queueImpactAfterRetirement(pack,s,q.player);
   consumeFirstAttackKit(s,attacker);
  }else{
   // Only strict defender BP > attacker BP earns the defender's victory.
   // The attacker is the character that loses, so it retires now. No life
   // damage is dealt. onRetire, if any, runs before the attack continues.
   grantBattleWinToOtherOwn(pack,s,q.player,blocker,'blocker');
   const attackerSlot=s.players[s.active].front.findIndex(c=>c?.uid===attacker.uid);
   if(attackerSlot<0)throw Error('Attacker left before the lost battle');
   if(battleRemovesLoser(pack,s,blocker,s.active))
    removeBattleLoser(pack,s,s.active,'front',attackerSlot);
   else retire(pack,s,s.active,'front',attackerSlot,{by:'battle'});
   consumeFirstAttackKit(s,attacker);
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
 if(q.kind==='effect-top-trait-hand'){
  const top=p.deck[0];
  if(!top||top.uid!==q.uid||!['hand','top','outside'].includes(a.mode))
   throw Error('Illegal trait top placement');
  if(a.mode==='hand'){
   if(!q.mayHand||!cardHasTrait(card(pack,top),q.trait))
    throw Error('Only the printed trait may be revealed to hand');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index:0,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.publicReveals.push({kind:'searched-to-hand',owner:q.player,
    title:titleOf(pack,q.player),cardId:top.cardId,uid:top.uid,
    trigger:null,turn:s.turn});
   if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
  }else if(a.mode==='outside')moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='private-top-place'){
  if(a.mode==='bottom'&&p.deck.length)p.deck.push(p.deck.shift());
  else if(a.mode!=='top'&&a.mode!=='bottom')throw Error('Illegal deck destination');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-reveal-opp-top'){
  if(a.type!=='chooseRevealedTop'||!['top','outside'].includes(a.place))
   throw Error('Illegal revealed top placement');
  const foe=s.players[q.target],top=foe.deck[0];
  if(!top||top.uid!==q.uid)throw Error('Revealed top card changed');
  if(a.place==='outside')moveOwnedLinear(pack,s,{owner:q.target,controller:q.player,
   from:'deck',to:'outside',index:0,reason:'opponent-effect',sourceUid:q.sourceUid});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-name-energy-reveal'){
  if(a.type!=='chooseNamedRequiredEnergy'||!Number.isInteger(a.value)||
   a.value<q.min||a.value>q.max)
   throw Error('Named required energy is not legal');
  const top=p.deck[0];
  if(!top)throw Error('Named energy reveal has no top card');
  s.publicReveals.push({kind:'revealed-window',owner:q.player,
   title:titleOf(pack,q.player),cardId:top.cardId,uid:top.uid,
   trigger:null,turn:s.turn});
  if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
  if(card(pack,top).energy===a.value)s.pending={kind:'effect-revealed-energy-hand',
   player:q.player,sourceUid:q.sourceUid,sourceName:q.sourceName,
   uid:top.uid,energy:a.value};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-revealed-energy-hand'){
  if(a.type!=='chooseRevealedEnergyHand'||!['hand','top'].includes(a.mode))
   throw Error('Illegal revealed energy placement');
  const top=p.deck[0];
  if(!top||top.uid!==q.uid||card(pack,top).energy!==q.energy)
   throw Error('Revealed top card changed');
  if(a.mode==='hand'){
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index:0,
    reason:'own-effect',sourceUid:q.sourceUid});
   const choices=p.hand.map(c=>c.uid);
   if(!choices.length)throw Error('Mandatory hand removal has no hand card');
   s.pending={kind:'effect-mandatory-hand-remove',player:q.player,
    sourceUid:q.sourceUid,sourceName:q.sourceName,choices,addedUid:top.uid};
  }else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-mandatory-hand-remove'){
  if(a.type!=='chooseMandatoryHandRemove')throw Error('Illegal mandatory hand removal');
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  if(index<0||!q.choices.includes(a.uid))throw Error('Hand removal needs an owned hand card');
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'removed',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-choose-printed-energy'){
  if(a.type!=='choosePrintedEnergy'||!Number.isInteger(a.value)||a.value<q.min||a.value>q.max)
   throw Error('Printed energy choice is not legal');
  const inspected=p.deck.slice(0,q.count);
  for(const physical of inspected)s.publicReveals.push({kind:'revealed-window',
   owner:q.player,title:titleOf(pack,q.player),cardId:physical.cardId,uid:physical.uid,
   trigger:null,turn:s.turn});
  if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
  const filter={field:'printedEnergy',value:a.value};
  const choices=inspected.filter(c=>matchesFilter(pack,s,c,filter)).map(c=>c.uid);
  const uids=inspected.map(c=>c.uid);
  if(choices.length)s.pending={kind:'effect-top-filter-choice',player:q.player,
   sourceUid:q.sourceUid,uids,choices,filter,rest:'outside',discard:false};
  else{
   for(let n=0;n<uids.length;n++)moveOwnedLinear(pack,s,{owner:q.player,from:'deck',
    to:'outside',index:0,reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;continueEffectQueue(pack,s);
  }
  return;
 }
 if(q.kind==='effect-recover-ap'){
  if(a.uid===null){
   if(q.optional===false)throw Error('Mandatory AP recovery cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
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
   // Printed 「公開し手札に加える」: this entry is only the selected card.
   // A rest:'outside' window is already public as revealed-window. Absent
   // rest keeps every other inspected card private.
   s.publicReveals.push({kind:'searched-to-hand',owner:q.player,
    title:titleOf(pack,q.player),cardId:chosen.cardId,uid:chosen.uid,
    trigger:null,turn:s.turn});
   if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
  }
  if(q.rest==='outside'){
   const remaining=q.uids.filter(uid=>uid!==a.uid);
   const prefix=p.deck.slice(0,remaining.length);
   if(prefix.length!==remaining.length||prefix.some((c,i)=>c.uid!==remaining[i]))
    throw Error('Revealed remainder left the top window');
   for(let n=0;n<remaining.length;n++)moveOwnedLinear(pack,s,{owner:q.player,
    from:'deck',to:'outside',index:0,reason:'own-effect',sourceUid:q.sourceUid});
   if(a.uid!==null&&p.hand.length&&q.discard!==false)s.pending={kind:'effect-discard',player:q.player,
    sourceUid:q.sourceUid};
   else{s.pending=null;continueEffectQueue(pack,s);}
   return;
  }
  const remaining=q.uids.filter(uid=>uid!==a.uid);
  const keepHand=q.noHandDiscard===true;
  if(remaining.length)s.pending={kind:'effect-top-order',player:q.player,
   sourceUid:q.sourceUid,uids:remaining,order:[],rest:'bottom',
   ...(a.uid!==null&&!keepHand?{discardAfter:true}:{})};
  else if(a.uid!==null&&!keepHand)s.pending={kind:'effect-discard',player:q.player,
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
   const traitOk=typeof q.trait==='string'&&cardHasTrait(printed,q.trait)&&
    (q.color===undefined||printed.color===q.color);
   const nameOr=q.orName&&q.color===undefined&&cardHasName(printed,q.orName);
   const colorAny=q.match==='colorAndAny'&&printed.color===q.color&&
    ((Array.isArray(q.names)&&q.names.some(n=>cardHasName(printed,n)))||
     (typeof q.trait==='string'&&cardHasTrait(printed,q.trait)));
   if(!chosen||!q.choices.includes(a.uid)||!(named||traitOk||nameOr||colorAny))
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
 if(q.kind==='effect-return-retired'){
  if(a.mode==='return'){
   const index=p.outside.findIndex(c=>c.uid===q.sourceUid);
   if(index<0)throw Error('Retired card left outside');
   const physical=p.outside.splice(index,1)[0];
   p.hand.push(physical);
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:'hand',
    reason:'own-effect',sourceUid:q.sourceUid});
  }else if(a.mode!=='skip')throw Error('Invalid retired-card return');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-life-to-hand'){
  if(a.uid!==null){
   const index=p.life.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid))
    throw Error('Life card is not an available own life card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'life',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   // Q750: the contingent draw finishes before a life-zero loss is declared.
   draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-optional-draw'||q.kind==='effect-may-draw'){
  if(a.mode==='draw'){
   if(!p.deck.length)throw Error('Optional draw has no deck card');
   draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  }else if(a.mode!=='skip')throw Error('Invalid optional draw');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-optional-mill'){
  if(Number.isInteger(q.batch)){
   if(a.mode==='mill'){
    if(!p.deck.length)throw Error('Optional mill has no deck card');
    const moved=Math.min(q.batch,p.deck.length);
    for(let n=0;n<moved;n++)moveOwnedLinear(pack,s,{owner:q.player,from:'deck',
     to:'outside',index:0,reason:'own-effect',sourceUid:q.sourceUid});
    if(moved>0&&Array.isArray(q.then))s.effectQueue.unshift(...q.then.map(e=>({...e,
     owner:q.player,sourceUid:q.sourceUid,sourceName:q.sourceName})));
   }else if(a.mode!=='skip')throw Error('Invalid optional mill');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(a.mode==='mill'){
   if(!p.deck.length)throw Error('Optional mill has no deck card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
    reason:'own-effect',sourceUid:q.sourceUid});
   const left=(q.remaining??1)-1;
   if(left>0&&p.deck.length){
    s.pending={kind:'effect-optional-mill',player:q.player,
     sourceUid:q.sourceUid,remaining:left};
    return;
   }
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
 if(q.kind==='effect-top-hand-outside'){
  const window=p.deck.slice(0,q.uids.length);
  if(window.length!==q.uids.length||window.some((c,i)=>c.uid!==q.uids[i]))
   throw Error('Looked top window changed during private selection');
  if(a.type!=='chooseTopHandOutside'||a.step!==q.step||!q.uids.includes(a.uid))
   throw Error('Looked top choice needs one remaining inspected card');
  const index=p.deck.findIndex(c=>c.uid===a.uid);
  if(index<0||index>=q.uids.length)throw Error('Selected card left the looked window');
  const destination=q.step==='hand'?'hand':q.step==='outside'?'outside':null;
  if(!destination)throw Error('Invalid looked top step');
  moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:destination,index,
   reason:'own-effect',sourceUid:q.sourceUid});
  const remaining=q.uids.filter(uid=>uid!==a.uid);
  if(q.step==='hand'&&remaining.length)s.pending={kind:'effect-top-hand-outside',
   player:q.player,sourceUid:q.sourceUid,uids:remaining,step:'outside'};
  else if(remaining.length)s.pending={kind:'effect-top-order',player:q.player,
   sourceUid:q.sourceUid,uids:remaining,order:[],rest:'bottom'};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-top-order'&&q.split===true){
  if(!q.uids.includes(a.uid)||q.order.some(x=>x.uid===a.uid)||
   (a.place!=='top'&&a.place!=='bottom'))
   throw Error('Split arrangement must place one remaining card on top or bottom');
  q.order.push({uid:a.uid,place:a.place});
  if(q.order.length===q.uids.length){
   const window=p.deck.splice(0,q.uids.length);
   if(new Set(window.map(c=>c.uid)).size!==q.uids.length||
    window.some(c=>!q.uids.includes(c.uid)))
    throw Error('Inspected deck window was changed');
   const byUid=new Map(window.map(c=>[c.uid,c]));
   const placed=side=>q.order.filter(x=>x.place===side).map(x=>byUid.get(x.uid));
   // First card chosen for a side is the outer card on top, and the inner
   // card on the bottom, matching the single-side order already used.
   p.deck.unshift(...placed('top'));
   p.deck.push(...placed('bottom'));
   s.pending=null;continueEffectQueue(pack,s);
  }
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
   }else{s.pending=null;continueEffectQueue(pack,s);}
  }
  return;
 }
 if(q.kind==='effect-bounce-own'){
  if(Number.isInteger(q.energy)&&Array.isArray(q.then)){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   if(!q.choices.includes(a.uid))throw Error('Illegal own bounce target');
   const found=location(s,q.player,a.uid);
   if(!found||!['front','energy'].includes(found.line)||
    card(pack,found.c).type!=='character'||card(pack,found.c).energy>q.energy)
    throw Error('Invalid own energy bounce target');
   bounceToHand(pack,s,q.player,a.uid,q.sourceUid);
   if(p.hand.some(c=>c.uid===a.uid))
    s.effectQueue.unshift(...q.then.map(e=>({...e,owner:q.player,
     sourceUid:q.sourceUid,sourceName:q.sourceName})));
   s.pending=null;continueEffectQueue(pack,s);return;
  }
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
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect',
    printedOwnerType(pack,s,q.player,q.sourceUid)));
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
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect',
    printedOwnerType(pack,s,q.player,q.sourceUid)));
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-outside-exact-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.outside.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Exact REST deployment needs an eligible own UID and line');
   const physical=p.outside[i],d=card(pack,physical);
   if(!matchesExactEnergyRest(pack,s,physical,q)||(a.line==='front'&&d.frontForbidden))
    throw Error('Exact REST printed filters changed');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.outside.splice(i,1);physical.ready=false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect',
    printedOwnerType(pack,s,q.player,q.sourceUid)));
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-outside-color-ap-rest'){
   if(a.uid===null)throw Error('Mandatory color AP REST cannot be skipped');
   const i=p.outside.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Color AP REST deployment needs an eligible own UID and line');
   const physical=p.outside[i],d=card(pack,physical);
   if(!matchesColorApNameOrTrait(pack,s,physical,q)||(a.line==='front'&&d.frontForbidden))
    throw Error('Color AP REST printed filters changed');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.outside.splice(i,1);physical.ready=false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect',
    printedOwnerType(pack,s,q.player,q.sourceUid)));
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-outside-trait-ap-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.outside.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Trait AP REST deployment needs an eligible own UID and line');
   const physical=p.outside[i],d=card(pack,physical);
   if(!matchesTraitApAffordableRest(pack,s,q.player,physical,q)||
    (a.line==='front'&&d.frontForbidden))
    throw Error('Trait AP REST printed filters changed');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.outside.splice(i,1);physical.ready=false;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect',
    printedOwnerType(pack,s,q.player,q.sourceUid)));
   continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-outside-active-pair'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.outside.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Active pair deployment needs an eligible own UID and line');
   const physical=p.outside[i],d=card(pack,physical);
   if(!matchesActiveNameOrTrait(pack,s,q.player,physical,q)||
    (a.line==='front'&&d.frontForbidden))
    throw Error('Active pair printed filters changed');
   commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
   p.outside.splice(i,1);physical.ready=true;
   physical.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=physical;
   recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
   s.pending=null;
   if(q.remaining>1)s.effectQueue.unshift({op:'openActivePair',owner:q.player,
    sourceUid:q.sourceUid,sourceName:q.sourceName,remaining:q.remaining-1,
    color:q.color,ap:q.ap,name:q.name,trait:q.trait,draw:q.draw});
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect',
    printedOwnerType(pack,s,q.player,q.sourceUid)));
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
   applyEffects(pack,s,physical,'onPlay',q.player,a.zone==='outside'?'outsideEffect':'ownEffect',q.sourceUid);
   return;
  }
  if(q.kind==='effect-hand-rest'){
   if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
   const i=p.hand.findIndex(c=>c.uid===a.uid);
   if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
    throw Error('Hand effect entry requires eligible own UID');
   const physical=p.hand[i],d=card(pack,physical);
   if(d.type!==q.type||(q.color!==null&&d.color!==q.color)||d.ap!==q.ap||
    (q.special?(q.maxEnergy!==null&&d.energy>q.maxEnergy)||
      (q.trait!==null&&!cardHasTrait(d,q.trait)):
      d.energy>q.energy||(q.traitless===true&&(d.traits||[]).length!==0))||
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
    ...(q.when?{when:q.when}:{}),
    ...(q.special?{trait:q.trait,maxEnergy:q.maxEnergy,ready:q.ready,
     protectionScope:q.protectionScope}:{energy:q.energy,
     ...(q.traitless===true?{traitless:true}:{})})});
   applyEffects(pack,s,physical,'onPlay',q.player,'ownEffect',q.sourceUid);
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
   applyEffects(pack,s,physical,'onPlay',q.player,'handEffect',q.sourceUid);
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
   s.effectQueue.unshift(...programJobs(pack,s,physical,'onPlay',q.player,undefined,'outsideEffect',
    printedOwnerType(pack,s,q.player,q.sourceUid)));
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
  s.effectQueue.unshift(...programJobs(pack,s,entrant,'onPlay',q.player,undefined,'recoveredEffect',
   printedOwnerType(pack,s,q.player,entrant.uid)));
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
 if(q.kind==='effect-remove-hand'){
  if(a.type!=='chooseRemoveHand')throw Error('Illegal hand removal');
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  if(index<0||!q.choices.includes(a.uid)||!matchesFilter(pack,s,p.hand[index],q.filter))
   throw Error('Hand removal needs a matching owned card');
  moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'removed',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.effectQueue.unshift(...q.then.map(e=>({...e,owner:q.player,
   sourceUid:q.sourceUid,sourceName:q.sourceName})));
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-remove-hand-cap'){
  const finish=()=>{
   const chosen=[...q.selected];
   if(new Set(chosen).size!==chosen.length||chosen.length>q.max)
    throw Error('Capped hand removal repeated a card');
   for(const uid of chosen){
    const index=p.hand.findIndex(c=>c.uid===uid);
    if(index<0||!cardHasTrait(card(pack,p.hand[index]),q.trait))
     throw Error('Capped hand removal card left the hand');
    moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'removed',index,
     reason:'own-effect',sourceUid:q.sourceUid});
   }
   const follow=[{op:'retireOppFrontUnderBp',bp:q.baseBp+q.per*chosen.length,
    owner:q.player,sourceUid:q.sourceUid,sourceName:q.sourceName}];
   if(chosen.length)follow.push({op:'draw',count:chosen.length,owner:q.player,
    sourceUid:q.sourceUid,sourceName:q.sourceName});
   s.pending=null;s.effectQueue.unshift(...follow);continueEffectQueue(pack,s);
  };
  if(a.mode==='pick'){
   const held=p.hand.find(c=>c.uid===a.uid);
   if(!held||!q.choices.includes(a.uid)||q.selected.includes(a.uid)||
    q.selected.length>=q.max||!cardHasTrait(card(pack,held),q.trait))
    throw Error('Illegal capped hand removal');
   const selected=[...q.selected,a.uid];
   if(selected.length===q.max){q.selected=selected;finish();return;}
   s.pending={...q,selected};return;
  }
  if(a.mode!=='done')throw Error('Capped hand removal needs pick or done');
  finish();return;
 }
 if(q.kind==='effect-remove-hand-scale'){
  if(a.mode==='pick'){
   const held=p.hand.find(c=>c.uid===a.uid);
   if(!held||!q.choices.includes(a.uid)||q.selected.includes(a.uid)||
    !cardHasTrait(card(pack,held),q.trait))
    throw Error('Illegal scaled hand removal');
   s.pending={...q,selected:[...q.selected,a.uid]};return;
  }
  if(a.mode!=='done')throw Error('Scaled hand removal needs pick or done');
  const chosen=[...q.selected];
  if(new Set(chosen).size!==chosen.length)throw Error('Scaled hand removal repeated a card');
  for(const uid of chosen){
   const index=p.hand.findIndex(c=>c.uid===uid);
   if(index<0||!cardHasTrait(card(pack,p.hand[index]),q.trait))
    throw Error('Scaled hand removal card left the hand');
   moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'removed',index,
    reason:'own-effect',sourceUid:q.sourceUid});
  }
  s.pending=null;
  s.effectQueue.unshift({op:'retireOppFrontUnderBp',bp:q.baseBp+q.per*chosen.length,
   optional:true,owner:q.player,sourceUid:q.sourceUid,sourceName:q.sourceName});
  continueEffectQueue(pack,s);return;
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
  const gain=card(pack,source).mainAbility;
  source.buffs??=[];
  if(Number.isInteger(gain.energy)){
   if(q.energy!==gain.energy||q.bp!==undefined)
    throw Error('Main discard energy does not match the printed gain');
   source.buffs.push({energy:gain.energy,untilTurn:s.turn});
  }else{
   if(q.bp!==gain.bp||q.energy!==undefined)
    throw Error('Main discard BP does not match the printed gain');
   source.buffs.push({bp:gain.bp,untilTurn:s.turn});
  }
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
 if(q.kind==='effect-name-or-trait-ready'||q.kind==='effect-name-or-trait-protect'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=field(p).find(c=>c.uid===a.uid);
  const printed=target&&card(pack,target);
  const named=printed&&(cardHasName(printed,q.name,originalEffectsDisabled(s,target))||
   cardHasTrait(printed,q.trait));
  if(!target||!q.choices.includes(a.uid)||target.uid===q.sourceUid||!named)
   throw Error('Illegal name-or-trait target');
  if(q.kind==='effect-name-or-trait-ready')attemptFieldActive(s,q.player,target);
  else grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',controller:q.player,
   sourceUid:q.sourceUid,targetUid:target.uid,sourceLinked:false,
   selectionScope:'any',until:{player:q.player,phase:'start',edge:'start'}});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-sacrifice-named'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const loc=location(s,q.player,a.uid);
  const printed=loc&&card(pack,loc.c);
  if(!loc||!q.choices.includes(a.uid)||loc.c.uid===q.sourceUid||
   printed.type!=='character'||
   !cardHasName(printed,q.name,originalEffectsDisabled(s,loc.c)))
   throw Error('Illegal named sacrifice');
  const sacrificedEnergy=printed.energy,sacrificedUid=loc.c.uid;
  const follow=[
   {op:'retireOppFrontBySacrificedEnergy',owner:q.player,sourceUid:q.sourceUid,
    sourceName:q.sourceName,per:q.per,sacrificedEnergy,sacrificedUid,optional:true},
   {op:'activeSelf',owner:q.player,sourceUid:q.sourceUid,sourceName:q.sourceName}
  ];
  if(sacrificedEnergy>=q.impactMinEnergy)
   follow.push({op:'grantSelfImpactThisTurn',owner:q.player,sourceUid:q.sourceUid,
    sourceName:q.sourceName,amount:1});
  s.pending=null;
  const tail=s.effectQueue.splice(0);
  const paused=retire(pack,s,q.player,loc.line,loc.slot);
  if(paused){s.pending.retirementAfter=follow;s.pending.retirementTail=tail;}
  else s.effectQueue.push(...follow,...tail);
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-named-keyword'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||card(pack,target).type!=='character'||
   !cardHasName(card(pack,target),q.name,originalEffectsDisabled(s,target)))
   throw Error('Illegal named keyword target');
  s.pending={kind:'effect-keyword-mode',player:q.player,sourceUid:q.sourceUid,
   sourceName:q.sourceName,name:q.name,target:target.uid};
  return;
 }
 if(q.kind==='effect-keyword-mode'){
  const target=field(p).find(c=>c.uid===q.target);
  if(!target||card(pack,target).type!=='character'||
   !cardHasName(card(pack,target),q.name,originalEffectsDisabled(s,target))||
   !Number.isInteger(target.fieldEntryStamp))
   throw Error('Named keyword target left the field');
  if(a.mode==='impact')
   target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:1,plus:true};
  else if(a.mode==='damage')
   target.attackDamagePlus={turn:s.turn,stamp:target.fieldEntryStamp,amount:1,
    sourceUid:q.sourceUid};
  else throw Error('Unknown named keyword');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-first-attack-kit'){
  const loc=location(s,q.player,a.uid);
  if(!loc||!q.choices.includes(a.uid)||card(pack,loc.c).type!=='character'||
   !cardHasName(card(pack,loc.c),q.name,originalEffectsDisabled(s,loc.c))||
   !Number.isInteger(loc.c.fieldEntryStamp)||loc.c.fieldEntryStamp<1)
   throw Error('First-attack kit needs the named character');
  loc.c.buffs??=[];
  loc.c.buffs.push({bp:q.bp,untilTurn:s.turn});
  loc.c.firstAttackKit={turn:s.turn,stamp:loc.c.fieldEntryStamp,
   sourceUid:q.sourceUid,name:q.name,armed:false,consumed:false};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-name-or-trait-impact'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=field(p).find(c=>c.uid===a.uid);
  const printed=target&&card(pack,target);
  const silenced=target&&originalEffectsDisabled(s,target);
  if(!target||!q.choices.includes(a.uid)||printed.type!=='character'||
   (!cardHasName(printed,q.name,silenced)&&!cardHasTrait(printed,q.trait))||
   !Number.isInteger(target.fieldEntryStamp)||target.fieldEntryStamp<1)
   throw Error('Illegal name-or-trait impact target');
  target.buffs??=[];
  target.buffs.push({bp:q.bp,untilTurn:s.turn});
  target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:q.impact};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-named-impact'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||card(pack,target).type!=='character'||
   !cardHasName(card(pack,target),q.name,originalEffectsDisabled(s,target)))
   throw Error('Illegal named impact target');
  target.buffs??=[];
  target.buffs.push({bp:q.bp,untilTurn:s.turn});
  target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:q.impact};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-named-rest-ready'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||target.ready!==true||
   card(pack,target).type!=='character'||
   !q.names.some(name=>cardHasName(card(pack,target),name,originalEffectsDisabled(s,target))))
   throw Error('Illegal named ACTIVE rest target');
  target.ready=false;
  s.effectQueue.unshift({op:'recoverAp',owner:q.player,sourceUid:q.sourceUid,
   sourceName:q.sourceName,count:q.recoverAp,mandatory:true});
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
 if(q.kind==='effect-active-energy-named'){
  if(a.uid===null){
   if(!q.optional)throw Error('Mandatory energy ACTIVE cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const target=p.energy.find(c=>c?.uid===a.uid);
  const type=target?card(pack,target).type:null;
  const named=!!target&&q.names.some(n=>cardHasName(card(pack,target),n,originalEffectsDisabled(s,target)));
  if(!target||!q.choices.includes(a.uid)||!['character','field'].includes(type)||!named)
   throw Error('Illegal energy-line named ACTIVE target');
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
 if(q.kind==='effect-draw-instead'){
  if(a.type!=='chooseDrawInstead'||!['draw','discard'].includes(a.mode))
   throw Error('Illegal draw replacement');
  const still=matchesV2LiveCondition(s,q.player,q.sourceUid,q.when,c=>card(pack,c),
   ()=>calcEnergy(pack,s,q.player),c=>bp(pack,s,c));
  if(a.mode==='draw'&&!still)throw Error('Draw replacement is not legal');
  draw(pack,s,q.player,q.count,{reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;
  if(a.mode==='discard'&&p.hand.length)
   s.pending={kind:'effect-discard',player:q.player,sourceUid:q.sourceUid,
    ...(q.discardCount>1?{remaining:Math.min(q.discardCount,p.hand.length)}:{})};
  else continueEffectQueue(pack,s);
  return;
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
 if(q.kind==='effect-active-any'){
  if(a.uid!==null){
   const target=field(p).find(c=>c.uid===a.uid);
   if(!target||!q.choices.includes(a.uid))throw Error('Illegal ACTIVE target');
   attemptFieldActive(s,q.player,target);
  }else if(!q.optional)throw Error('Mandatory ACTIVE cannot be skipped');
  const characters=field(p).filter(c=>card(pack,c).type==='character').map(c=>c.uid);
  s.pending=characters.length?{kind:'effect-buff-own',player:q.player,
   sourceUid:q.sourceUid,choices:characters,
   filter:{field:'type',value:'character'},bp:q.bp,optional:true}:null;
  if(!s.pending)continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-buff-own'){
  if(a.uid===null){
   if(!q.optional)throw Error('Mandatory buff cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||
   (target.uid===q.sourceUid&&q.excludeSelf)||
   card(pack,target).type!=='character'||!matchesFilter(pack,s,target,q.filter)||
   (q.also&&!matchesFilter(pack,s,target,q.also)))
   throw Error('Illegal own field BP target');
  const named=Array.isArray(q.bonusNames)&&q.bonusNames.some(n=>
   cardHasName(card(pack,target),n,originalEffectsDisabled(s,target)));
  if(named){
   const source=location(s,q.player,q.sourceUid);
   const effect=(source?card(pack,source.c).effects.onPlay||[]:[]).find(e=>
    e.op==='buffOwnField'&&e.bp===q.bp&&e.bonusBp===q.bonusBp&&
    JSON.stringify(e.bonusNames)===JSON.stringify(q.bonusNames));
   if(!effect)throw Error('Unproven named BP bonus');
  }
  target.buffs??=[];target.buffs.push({bp:named?q.bonusBp:q.bp,untilTurn:s.turn});
  if(q.attackEndRetire===true&&Number.isInteger(target.fieldEntryStamp))
   target.attackEndRetireGranted={turn:s.turn,stamp:target.fieldEntryStamp,sourceUid:q.sourceUid};
  if(Number.isInteger(q.thenApActive)&&card(pack,target).ap>=q.thenApActive&&p.hand.length){
   s.pending={kind:'effect-discard-gate',player:q.player,sourceUid:q.sourceUid,
    optional:true,then:[{op:'activeChosen',targetUid:target.uid}]};
   return;
  }
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-required-energy'){
  if(a.uid===null)throw Error('Mandatory required energy cannot be skipped');
  const marked=field(p).find(c=>c.uid===a.uid);
  if(!marked||!q.choices.includes(a.uid)||marked.uid===q.sourceUid||
   card(pack,marked).type!=='character')
   throw Error('Illegal other-character required energy');
  marked.buffs??=[];marked.buffs.push({requiredEnergy:2,untilTurn:s.turn});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-grant-impact'){
  if(a.uid===null){
   if(!q.optional)throw Error('Mandatory impact grant cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const target=field(p).find(c=>c.uid===a.uid);
  const impactPrinted=target&&card(pack,target);
  if(!target||!q.choices.includes(a.uid)||
   (target.uid===q.sourceUid&&q.includeSelf!==true)||
   !Number.isInteger(target.fieldEntryStamp)||
   (q.minPrintedAp!==undefined?impactPrinted.ap<q.minPrintedAp:!cardHasTrait(impactPrinted,q.trait)))
   throw Error('Illegal other-character impact target');
  target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:q.amount,
   ...(q.plus===true?{plus:true}:{})};
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
 if(q.kind==='effect-named-field-protect'){
  if(a.uid!==null){
   const choice=q.choices.find(c=>c.uid===a.uid);
   const selected=field(p).find(c=>c.uid===a.uid);
   if(!choice||!selected||selected.fieldEntryStamp!==choice.stamp||
    card(pack,selected).type!=='character'||
    !cardHasName(card(pack,selected),q.name,originalEffectsDisabled(s,selected)))
    throw Error('Illegal named field protection target');
   grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',controller:q.player,
    sourceUid:q.sourceUid,targetUid:selected.uid,sourceLinked:false,
    selectionScope:q.scope,until:{player:q.player,phase:'start',edge:'start'}});
  }else if(!q.optional)throw Error('Named field protection cannot be declined');
  s.pending=null;continueEffectQueue(pack,s);return;
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
  if(q.kind==='effect-printed-lock'){
   if(a.uid!==null){
    const choice=q.choices.find(c=>c.uid===a.uid);
    const target=s.players[1-q.player].front.find(c=>c?.uid===a.uid);
    if(!choice||!target||target.fieldEntryStamp!==choice.stamp||
     card(pack,target).type!=='character')
     throw Error('Stale or illegal printed lock target');
    const until={player:q.player,phase:'start',edge:'start'};
    for(const kind of ['originalEffectsDisabled','cannotAttack','cannotBlock'])
     grantContinuousState(s,{kind,controller:q.player,sourceUid:q.sourceUid,
      targetUid:target.uid,sourceLinked:false,until});
   }
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  if(q.kind==='effect-name-hand-remove'){
   if(a.type!=='chooseNameHandRemove')throw Error('Illegal named hand removal');
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid))throw Error('Named hand removal needs an owned hand card');
   moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'removed',index,
    reason:'own-effect',sourceUid:q.sourceUid});
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
  if(q.thenDraw===1)draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
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
  if(retireNow)retire(pack,s,foe,'front',slot,{by:'opponent'});
  else bounceToHand(pack,s,foe,a.uid,q.sourceUid,{
   controller:q.player,reason:'opponent-effect'});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-retire-bp'){
  const thenDraw=q.thenDraw;
  if(a.uid===null&&q.optional){
   s.pending=null;
   if(thenDraw)s.effectQueue.unshift({op:'draw',count:thenDraw,owner:q.player,sourceUid:q.sourceUid});
   continueEffectQueue(pack,s);return;
  }
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  const retired=slot>=0?s.players[opponent].front[slot]:null;
  if(q.onlyRest){
   if(!retired||!q.choices.includes(a.uid)||retired.ready!==false)
    throw Error('Illegal rested front retirement');
  }else if(slot<0||!q.choices.includes(a.uid)||bp(pack,s,retired)>q.limit)
   throw Error('Illegal BP-threshold retirement target');
  s.pending=null;
  retire(pack,s,opponent,'front',slot,{by:'opponent'});
  if(thenDraw)s.effectQueue.push({op:'draw',count:thenDraw,owner:q.player,sourceUid:q.sourceUid});
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-bounce-bp'){
  if(a.uid===null&&q.optional){s.pending=null;continueEffectQueue(pack,s);return;}
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  const target=slot>=0?s.players[opponent].front[slot]:null;
  if(!target||!q.choices.includes(a.uid)||bp(pack,s,target)>q.limit)
   throw Error('Illegal BP-threshold return target');
  s.pending=null;
  // Q62: the visible top returns to hand. This is not retirement.
  bounceToHand(pack,s,opponent,a.uid,q.sourceUid,{reason:'opponent-effect',controller:q.player});
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
 if(q.kind==='effect-mark-opp-start'){
  if(a.type!=='chooseMarkOppStart'||(a.uid!==null&&!q.choices.includes(a.uid)))
   throw Error('Illegal next-start front mark');
  if(a.uid!==null)s.delayedEffects.push({
   op:'oppStartRetireRestMove',owner:q.player,sourceUid:q.sourceUid,
   sourceStamp:q.sourceStamp,targetUid:a.uid,dueTurn:s.turn+1,duePlayer:1-q.player
  });
  s.pending=null;continueEffectQueue(pack,s);return;
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
  // Q538: a revealed trigger that is declined was not activated.
  if(a.mode!=='skip')s.triggerActivated[q.player]=true;
  continueEffectQueue(pack,s);
  finishPending(s);
  return;
 }
 if(q.kind==='effect-line-move'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const from=location(s,q.player,a.uid);
  const source=location(s,q.player,q.sourceUid);
  if(!from||!source||!q.choices.includes(a.uid)||
   (!q.includeSelf&&from.c.uid===q.sourceUid)||
   card(pack,from.c).type!=='character'||
   (q.traitless&&card(pack,from.c).traits.length!==0)||
   (q.excludeName&&cardHasName(card(pack,from.c),q.excludeName,originalEffectsDisabled(s,from.c))))
   throw Error('Illegal line-move character');
  const line=from.line==='front'?'energy':'front';
  if(line==='energy'&&card(pack,from.c).energyForbidden)
   throw Error('This character cannot move to the energy line');
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
  for(const uid of q.selected)p.front.find(c=>c?.uid===uid).ready=false;
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
  if(q.postImpact)queueImpactAfterRetirement(pack,s,q.player);
  if(q.retirementAfter||q.retirementTail){
   const retired=a.mode==='decline'&&q.mode==='retire';
   s.effectQueue.push(...(retired?q.retirementAfter||[]:[]),...(q.retirementTail||[]));
  }
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
 if(q.kind==='effect-rest-ap-lock'){
  const source=location(s,q.player,q.sourceUid);
  const printed=source&&card(pack,source.c).effects.onPlay?.find(e=>
   e.op==='restOppFrontApLock'&&e.minPrintedAp===q.minPrintedAp&&
   e.lockWhile==='sourceOnFront');
  if(!source||source.line!=='front'||source.c.fieldEntryStamp!==q.sourceStamp||
   !printed||originalEffectsDisabled(s,source.c))
   throw Error('Unproven front AP rest lock choice');
  if(a.uid===null){
   if(!q.optional)throw Error('Mandatory opponent REST cannot be declined');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid))
   throw Error('Illegal front AP rest lock target');
  const target=s.players[foe].front[slot];
  target.ready=false;
  if(s.active===q.player&&s.players[q.player].front.some(c=>c&&
   card(pack,c).ap>=q.minPrintedAp))
   grantContinuousState(s,{kind:'cannotActive',controller:q.player,
    sourceUid:q.sourceUid,targetUid:target.uid,sourceLinked:true,
    whileSourceFront:true,until:null});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-retire-missing-trait'){
  if(a.uid===null)throw Error('Mandatory missing-trait retirement cannot be skipped');
  const loc=location(s,q.player,a.uid);
  if(!loc||!q.choices.includes(a.uid)||card(pack,loc.c).type!=='character'||
   cardHasTrait(card(pack,loc.c),q.trait))
   throw Error('Illegal own missing-trait retirement');
  const follow=q.then.map(x=>({...x}));
  s.pending=null;
  const tail=s.effectQueue.splice(0);
  const paused=retire(pack,s,q.player,loc.line,loc.slot);
  if(paused){
   s.pending.retirementAfter=follow;
   s.pending.retirementTail=tail;
  }else{
   s.effectQueue.push(...follow,...tail);
   continueEffectQueue(pack,s);
  }
  return;
 }
 if(q.kind==='effect-outside-color-trait-active'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const i=p.outside.findIndex(c=>c.uid===a.uid);
  if(i<0||!q.choices.includes(a.uid)||!['front','energy'].includes(a.line))
   throw Error('Color trait ACTIVE deployment needs an eligible own UID and line');
  const physical=p.outside[i],d=card(pack,physical);
  if(d.type!=='character'||d.color!==q.color||!cardHasTrait(d,q.trait)||
   (a.line==='front'&&d.frontForbidden))
   throw Error('Color trait ACTIVE printed filters changed');
  commitDestination(pack,s,q.player,a.line,a.slot,a.replaceUid);
  p.outside.splice(i,1);physical.ready=true;
  physical.fieldEntryStamp=s.nextFieldEntryStamp++;
  p[a.line][a.slot]=physical;
  recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:a.line,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;
  applyEffects(pack,s,physical,'onPlay',q.player,'outsideEffect',q.sourceUid);
  return;
 }
 if(q.kind==='effect-retire-own-trait'){
  if(a.uid===null){
   if(!q.optional)throw Error('Mandatory trait retirement cannot be skipped');
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const loc=location(s,q.player,a.uid);
  if(!loc||!q.choices.includes(a.uid)||card(pack,loc.c).type!=='character'||
   !cardHasTrait(card(pack,loc.c),q.trait))
   throw Error('Illegal own trait retirement');
  const limit=bp(pack,s,loc.c);
  const followJob={op:'resolveTraitRetireFollow',owner:q.player,sourceUid:q.sourceUid,
   sourceName:q.sourceName,trait:q.trait,follow:q.follow,limit};
  s.pending=null;
  const tail=s.effectQueue.splice(0);
  const protectedDeparture=retire(pack,s,q.player,loc.line,loc.slot);
  if(protectedDeparture){
   s.pending.retirementAfter=[followJob];
   s.pending.retirementTail=tail;
  }else s.effectQueue.push(followJob,...tail);
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-swap-or-buff'||q.kind==='effect-swap-pair'){
  const src=location(s,q.player,q.sourceUid);
  const printed=src&&card(pack,src.c);
  const gate=printed?.mainAbility?.op==='oncePayProgram'&&
   printed.mainAbility.then?.find(x=>x.op==='discardGate'&&x.optional===false);
  const step=gate&&gate.then?.find(x=>x.op==='swapOrBuff'&&
   x.bp===q.bp&&x.allName===q.allName);
  const pl=s.players[q.player];
  const fronts=()=>pl.front.filter(c=>c&&card(pack,c).type==='character'&&
   !card(pack,c).energyForbidden).map(c=>c.uid);
  const energies=()=>pl.energy.filter(c=>c&&card(pack,c).type==='character'&&
   !card(pack,c).frontForbidden).map(c=>c.uid);
  const paid=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.from==='hand'&&e.to==='outside'&&e.reason==='payment'&&e.sourceUid===q.sourceUid);
  if(!src||!step||printed.name!==q.sourceName||!paid)
   throw Error('Illegal swap or buff choice');
  const giveBp=()=>{src.c.buffs??=[];src.c.buffs.push({bp:q.bp,untilTurn:s.turn});};
  if(q.kind==='effect-swap-or-buff'){
   if(!q.options.includes(a.mode))throw Error('Illegal swap or buff mode');
   if(a.mode==='bp'){giveBp();s.pending=null;continueEffectQueue(pack,s);return;}
   const frontChoices=fronts(),energyChoices=energies();
   if(!frontChoices.length||!energyChoices.length)throw Error('Swap needs both lines');
   s.pending={kind:'effect-swap-pair',player:q.player,sourceUid:q.sourceUid,
    sourceName:q.sourceName,bp:q.bp,allName:q.allName,step:'front',
    both:a.mode==='both',choices:frontChoices};
   return;
  }
  if(q.step==='front'){
   if(!q.choices.includes(a.uid)||!fronts().includes(a.uid))
    throw Error('Illegal swap front');
   const energyChoices=energies();
   if(!energyChoices.length)throw Error('Swap needs an energy character');
   s.pending={...q,step:'energy',frontUid:a.uid,choices:energyChoices};
   return;
  }
  if(q.step!=='energy'||!q.choices.includes(a.uid)||!energies().includes(a.uid)||
   !pl.front.some(c=>c?.uid===q.frontUid))
   throw Error('Illegal swap energy');
  const fi=pl.front.findIndex(c=>c?.uid===q.frontUid);
  const ei=pl.energy.findIndex(c=>c?.uid===a.uid);
  const frontCard=pl.front[fi],energyCard=pl.energy[ei];
  pl.front[fi]=energyCard;pl.energy[ei]=frontCard;
  recordCompletedMove(pack,s,{physical:frontCard,owner:q.player,from:'front',to:'energy',
   reason:'own-effect',sourceUid:q.sourceUid});
  recordCompletedMove(pack,s,{physical:energyCard,owner:q.player,from:'energy',to:'front',
   reason:'own-effect',sourceUid:q.sourceUid});
  if(q.both)giveBp();
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-field-sacrifice-replay'){
  const src=location(s,q.player,q.sourceUid);
  const loc=location(s,q.player,a.uid);
  const printed=src&&card(pack,src.c);
  if(!src||src.line!=='energy'||src.c.ready!==false||printed?.type!=='field'||
   printed.mainAbility?.op!=='fieldRestSacrificeReplay'||printed.name!==q.sourceName||
   !loc||loc.c.uid===q.sourceUid||!q.choices.includes(a.uid)||
   card(pack,loc.c).type!=='character')
   throw Error('Illegal field sacrifice replay');
  const follow={op:'replayOnPlay',owner:q.player,sourceUid:q.sourceUid,
   sourceName:q.sourceName};
  s.pending=null;
  const tail=s.effectQueue.splice(0);
  const paused=retire(pack,s,q.player,loc.line,loc.slot);
  if(paused){
   s.pending.retirementAfter=[follow];
   s.pending.retirementTail=tail;
  }else{
   s.effectQueue.push(follow,...tail);
   continueEffectQueue(pack,s);
  }
  return;
 }
 if(q.kind==='effect-named-double'){
  const loc=location(s,q.player,a.uid);
  if(!loc||!q.choices.includes(a.uid)||card(pack,loc.c).type!=='character'||
   !cardHasTrait(card(pack,loc.c),q.trait)||
   !Number.isInteger(loc.c.fieldEntryStamp)||loc.c.fieldEntryStamp<1)
   throw Error('Illegal double-attack target');
  loc.c.readyOnAttackGranted={turn:s.turn,stamp:loc.c.fieldEntryStamp,
   sourceUid:q.sourceUid};
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-entry-sacrifice'){
  const src=location(s,q.player,q.sourceUid);
  const loc=location(s,q.player,a.uid);
  const ability=src&&card(pack,src.c).mainAbility;
  if(!src||src.c.entryTurn!==s.turn||ability?.op!=='entryTurnSacrificeChoice'||
   card(pack,src.c).name!==q.sourceName||ability.energy!==q.energy||
   ability.color!==q.color||ability.minBp!==q.minBp||ability.down!==q.down||
   !loc||loc.c.uid===src.c.uid||!q.choices.includes(a.uid)||
   card(pack,loc.c).type!=='character')
   throw Error('Entry-turn sacrifice lost its source or target');
  const follow={op:'resolveEntrySacrifice',owner:q.player,sourceUid:q.sourceUid,
   sourceName:q.sourceName,energy:q.energy,color:q.color,minBp:q.minBp,down:q.down};
  s.pending=null;
  const tail=s.effectQueue.splice(0);
  const paused=retire(pack,s,q.player,loc.line,loc.slot);
  if(paused){
   s.pending.retirementAfter=[follow];
   s.pending.retirementTail=tail;
  }else{
   s.effectQueue.push(follow,...tail);
   continueEffectQueue(pack,s);
  }
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
  raidedThisTurn:[false,false],triggerActivated:[false,false],fieldEntryNames:[[],[]],mainAbilityUsedUids:[],mainReadyOnceByName:[[],[]],
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
 if(q.kind==='effect-grant-cause')return [
  {type:'chooseGrantCause',mode:'grant'},{type:'chooseGrantCause',mode:'skip'}];
 if(q.kind==='effect-hand-bottom')return [
  ...p.hand.map(c=>({type:'chooseHandBottom',uid:c.uid})),
  {type:'chooseHandBottom',uid:null}];
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
 if(q.kind==='effect-energy-trait-front'){
  const open=[];
  for(let slot=0;slot<4;slot++)if(!p.front[slot])open.push(slot);
  const live=q.choices.filter(uid=>!q.selected.includes(uid)&&
   p.energy.some(c=>c?.uid===uid));
  return [{type:'chooseEnergyTraitFront',uid:null},
   ...live.flatMap(uid=>open.map(slot=>({type:'chooseEnergyTraitFront',uid,slot})))];
 }
 if(q.kind==='effect-energy-front'){
  const live=q.movers.filter(uid=>p.energy.some(c=>c?.uid===uid));
  const open=q.slots.filter(slot=>!p.front[slot]);
  return live.flatMap(uid=>open.map(slot=>({type:'chooseEnergyFront',uid,slot})));
 }
 if(q.kind==='effect-entry-protect')return q.choices.map(uid=>({type:'chooseEntryProtect',uid}));
 if(q.kind==='effect-named-double')return q.choices.map(uid=>
  ({type:'chooseNamedDouble',uid}));
 if(q.kind==='effect-field-sacrifice-replay')return q.choices.map(uid=>
  ({type:'chooseFieldSacrifice',uid}));
 if(q.kind==='effect-swap-or-buff')return q.options.map(mode=>
  ({type:'chooseSwapMode',mode}));
 if(q.kind==='effect-swap-pair')return q.choices.map(uid=>
  ({type:'chooseSwapPair',uid}));
 if(q.kind==='effect-entry-sacrifice')return q.choices.map(uid=>
  ({type:'chooseEntrySacrifice',uid}));
 if(q.kind==='attack-end-swap')return [
  {type:'chooseAttackEndSwap',uid:null},
  ...q.choices.map(c=>({type:'chooseAttackEndSwap',uid:c.uid}))
 ];
 if(q.kind==='energy-line-attack-end-swap')return [
  {type:'chooseEnergyLineAttackEndSwap',uid:null},
  ...q.choices.map(c=>({type:'chooseEnergyLineAttackEndSwap',uid:c.uid}))
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
  const candidates=p.front.filter(c=>c?.ready&&canBlock(c)&&
   !fieldRestrictions(s,q.player,c).some(r=>r.kind==='cannotBlock'));
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
 if(q.kind==='effect-top-trait-hand')return [
  ...(q.mayHand?[{type:'chooseTopTraitHand',mode:'hand'}]:[]),
  {type:'chooseTopTraitHand',mode:'top'},
  {type:'chooseTopTraitHand',mode:'outside'}
 ];
 if(q.kind==='private-top-place')return [
  {type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'bottom'}
 ];
 if(q.kind==='effect-reveal-opp-top')return [
  {type:'chooseRevealedTop',place:'top'},
  {type:'chooseRevealedTop',place:'outside'}
 ];
 if(q.kind==='effect-name-energy-reveal')return Array.from({length:q.max-q.min+1},
  (_,i)=>({type:'chooseNamedRequiredEnergy',value:q.min+i}));
 if(q.kind==='effect-revealed-energy-hand')return [
  {type:'chooseRevealedEnergyHand',mode:'top'},
  {type:'chooseRevealedEnergyHand',mode:'hand'}
 ];
 if(q.kind==='effect-mandatory-hand-remove')return p.hand
  .filter(c=>q.choices.includes(c.uid)).map(c=>({type:'chooseMandatoryHandRemove',uid:c.uid}));
 if(q.kind==='effect-choose-printed-energy')return Array.from({length:q.max-q.min+1},
  (_,i)=>({type:'choosePrintedEnergy',value:q.min+i}));
 if(q.kind==='effect-recover-ap')return [
   ...(q.optional===false?[]:[{type:'chooseApRecovery',uid:null}]),
   ...p.apCards.filter(c=>c.inPlay&&!c.ready).map(c=>({type:'chooseApRecovery',uid:c.uid}))
  ];
 if(q.kind==='end-hand-limit')return p.hand.map(c=>({type:'chooseHandLimit',uid:c.uid}));
 if(q.kind==='effect-discard')return p.hand.map(c=>({type:'chooseDiscard',uid:c.uid}));
 if(q.kind==='effect-remove-hand')return [
  {type:'chooseRemoveHand',uid:null},
  ...p.hand.filter(c=>q.choices.includes(c.uid)&&matchesFilter(pack,s,c,q.filter))
   .map(c=>({type:'chooseRemoveHand',uid:c.uid}))
 ];
 if(q.kind==='effect-remove-hand-scale')return [
  {type:'chooseRemoveHandScale',mode:'done'},
  ...p.hand.filter(c=>q.choices.includes(c.uid)&&!q.selected.includes(c.uid)&&
   cardHasTrait(card(pack,c),q.trait)).map(c=>({type:'chooseRemoveHandScale',mode:'pick',uid:c.uid}))
 ];
 if(q.kind==='effect-remove-hand-cap')return [
  {type:'chooseRemoveHandCap',mode:'done'},
  ...p.hand.filter(c=>q.choices.includes(c.uid)&&!q.selected.includes(c.uid)&&
   q.selected.length<q.max&&cardHasTrait(card(pack,c),q.trait))
   .map(c=>({type:'chooseRemoveHandCap',mode:'pick',uid:c.uid}))
 ];
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
 if(q.kind==='effect-return-retired')return [
  {type:'chooseReturnRetired',mode:'skip'},
  {type:'chooseReturnRetired',mode:'return'}
 ];
 if(q.kind==='effect-life-to-hand')return [
  {type:'chooseLifeToHand',uid:null},
  ...p.life.filter(c=>q.choices.includes(c.uid)).map(c=>({type:'chooseLifeToHand',uid:c.uid}))
 ];
 if(q.kind==='effect-optional-draw')return [
  {type:'chooseOptionalDraw',mode:'skip'},
  ...(p.deck.length?[{type:'chooseOptionalDraw',mode:'draw'}]:[])
 ];
 if(q.kind==='effect-may-draw')return [
  {type:'chooseMayDraw',mode:'skip'},
  ...(p.deck.length?[{type:'chooseMayDraw',mode:'draw'}]:[])
 ];
 if(q.kind==='effect-optional-mill')return [
  {type:'chooseOptionalMill',mode:'skip'},
  {type:'chooseOptionalMill',mode:'mill'}
 ];
 if(q.kind==='effect-pay-ap-deploy')return [
  {type:'choosePayApDeploy',mode:'skip'},
  {type:'choosePayApDeploy',mode:'pay'}
 ];
 if(q.kind==='effect-top-hand-outside')return q.uids.map(uid=>({
  type:'chooseTopHandOutside',uid,step:q.step}));
 if(q.kind==='effect-top-order'&&q.split===true){
  const placed=new Set(q.order.map(x=>x.uid));
  return q.uids.filter(uid=>!placed.has(uid)).flatMap(uid=>[
   {type:'chooseTopOrder',uid,place:'top'},
   {type:'chooseTopOrder',uid,place:'bottom'}
  ]);
 }
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
  if(q.kind==='effect-outside-exact-rest')return [
   {type:'chooseOutsideExactRest',uid:null},
   ...p.outside.filter(c=>q.choices.includes(c.uid)&&matchesExactEnergyRest(pack,s,c,q)).flatMap(c=>{
    const d=card(pack,c);
    return ['front','energy'].filter(line=>!(line==='front'&&d.frontForbidden))
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseOutsideExactRest',uid:c.uid,line,...dest
     })));
   })
  ];
  if(q.kind==='effect-outside-color-ap-rest')return p.outside.filter(c=>
   q.choices.includes(c.uid)&&matchesColorApNameOrTrait(pack,s,c,q)).flatMap(c=>{
   const d=card(pack,c);
   return ['front','energy'].filter(line=>!(line==='front'&&d.frontForbidden))
    .flatMap(line=>legalDestinations(p,line).map(dest=>({
     type:'chooseOutsideColorApRest',uid:c.uid,line,...dest
    })));
  });
  if(q.kind==='effect-outside-trait-ap-rest')return [
   {type:'chooseOutsideTraitApRest',uid:null},
   ...p.outside.filter(c=>q.choices.includes(c.uid)&&
    matchesTraitApAffordableRest(pack,s,q.player,c,q)).flatMap(c=>{
    const d=card(pack,c);
    return ['front','energy'].filter(line=>!(line==='front'&&d.frontForbidden))
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseOutsideTraitApRest',uid:c.uid,line,...dest
     })));
   })
  ];
  if(q.kind==='effect-outside-active-pair')return [
   {type:'chooseOutsideActivePair',uid:null},
   ...p.outside.filter(c=>q.choices.includes(c.uid)&&
    matchesActiveNameOrTrait(pack,s,q.player,c,q)).flatMap(c=>{
    const d=card(pack,c);
    return ['front','energy'].filter(line=>!(line==='front'&&d.frontForbidden))
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseOutsideActivePair',uid:c.uid,line,...dest
     })));
   })
  ];
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
  if(q.kind==='effect-optional-pay-ap')return [
   {type:'chooseOptionalPayAp',mode:'pay'},
   {type:'chooseOptionalPayAp',mode:'skip'}
  ];
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
 if(q.kind==='effect-sacrifice-named')return [
  {type:'chooseSacrificeNamed',uid:null},
  ...q.choices.map(uid=>({type:'chooseSacrificeNamed',uid}))
 ];
 if(q.kind==='effect-name-or-trait-ready'||q.kind==='effect-name-or-trait-protect')return [
  {type:q.kind==='effect-name-or-trait-ready'?'chooseNameOrTraitReady':'chooseNameOrTraitProtect',uid:null},
  ...q.choices.map(uid=>({type:q.kind==='effect-name-or-trait-ready'?'chooseNameOrTraitReady':'chooseNameOrTraitProtect',uid}))
 ];
 if(q.kind==='effect-named-keyword')return [
  {type:'chooseNamedKeyword',uid:null},
  ...q.choices.map(uid=>({type:'chooseNamedKeyword',uid}))
 ];
 if(q.kind==='effect-keyword-mode')return [
  {type:'chooseKeywordMode',mode:'impact'},
  {type:'chooseKeywordMode',mode:'damage'}
 ];
 if(q.kind==='effect-name-or-trait-impact')return [
  {type:'chooseNameOrTraitImpact',uid:null},
  ...q.choices.map(uid=>({type:'chooseNameOrTraitImpact',uid}))
 ];
 if(q.kind==='effect-named-impact')return [
  {type:'chooseNamedImpact',uid:null},
  ...q.choices.map(uid=>({type:'chooseNamedImpact',uid}))
 ];
 if(q.kind==='effect-first-attack-kit')return q.choices.map(uid=>
  ({type:'chooseFirstAttackKit',uid}));
 if(q.kind==='effect-named-rest-ready')return [
  {type:'chooseNamedRestReady',uid:null},
  ...q.choices.map(uid=>({type:'chooseNamedRestReady',uid}))
 ];
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
 if(q.kind==='effect-active-energy-named'){
  const named=c=>q.names.some(n=>cardHasName(card(pack,c),n,originalEffectsDisabled(s,c)));
  const choices=p.energy.filter(c=>c&&q.choices.includes(c.uid)&&
   ['character','field'].includes(card(pack,c).type)&&named(c)).map(c=>c.uid);
  return [...(q.optional?[{type:'chooseActiveEnergyNamed',uid:null}]:[]),
   ...choices.map(uid=>({type:'chooseActiveEnergyNamed',uid}))];
 }
 if(q.kind==='effect-grant-block-at-least'){
  const choices=field(p).filter(c=>q.choices.includes(c.uid)&&
   card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  return [...(q.optional?[{type:'chooseGrantBlockAtLeast',uid:null}]:[]),
   ...choices.map(uid=>({type:'chooseGrantBlockAtLeast',uid}))];
 }
 if(q.kind==='effect-draw-instead'){
  // The printed default stays legal after the gate closes. Only the
  // replacement draw is live, so a departed AP character cannot be chosen.
  const still=matchesV2LiveCondition(s,q.player,q.sourceUid,q.when,c=>card(pack,c),
   ()=>calcEnergy(pack,s,q.player),c=>bp(pack,s,c));
  return [
   {type:'chooseDrawInstead',mode:'discard'},
   ...(still?[{type:'chooseDrawInstead',mode:'draw'}]:[])
  ];
 }
 if(q.kind==='effect-may-draw-discard')return [
  {type:'chooseMayDrawDiscard',mode:'skip'},
  ...(p.deck.length?[{type:'chooseMayDrawDiscard',mode:'draw'}]:[])
 ];
 if(q.kind==='effect-active-any')return [
  ...(q.optional?[{type:'chooseActiveAny',uid:null}]:[]),
  ...q.choices.filter(uid=>field(p).some(c=>c.uid===uid)).map(uid=>({type:'chooseActiveAny',uid}))
 ];
 if(q.kind==='effect-buff-own')return [
  ...(q.optional?[{type:'chooseOwnBuff',uid:null}]:[]),
  ...q.choices.map(uid=>({type:'chooseOwnBuff',uid}))
 ];
 if(q.kind==='effect-required-energy')return q.choices.filter(uid=>
  field(p).some(c=>c.uid===uid&&c.uid!==q.sourceUid&&card(pack,c).type==='character'))
  .map(uid=>({type:'chooseRequiredEnergy',uid}));
 if(q.kind==='effect-grant-impact')return [
  {type:'chooseGrantImpact',uid:null},
  ...q.choices.filter(uid=>field(p).some(c=>c.uid===uid&&
   (q.includeSelf===true||c.uid!==q.sourceUid)&&
   (q.minPrintedAp!==undefined?card(pack,c).ap>=q.minPrintedAp:
    cardHasTrait(card(pack,c),q.trait)))).map(uid=>({type:'chooseGrantImpact',uid}))
 ];
 if(q.kind==='effect-buff-trait')return [
   {type:'chooseTraitBuff',uid:null},...q.choices.map(uid=>({type:'chooseTraitBuff',uid}))
  ];
 if(q.kind==='main-rest-front-energy')
  return q.choices.filter(uid=>p.front.some(c=>c?.uid===uid&&c.ready))
   .map(uid=>({type:'chooseRestFrontEnergy',uid}));
 if(q.kind==='effect-named-field-protect'){
  const live=q.choices.filter(c=>field(p).some(x=>x.uid===c.uid&&
   x.fieldEntryStamp===c.stamp&&card(pack,x).type==='character'&&
   cardHasName(card(pack,x),q.name,originalEffectsDisabled(s,x))));
  return [...(q.optional?[{type:'chooseNamedFieldProtect',uid:null}]:[]),
   ...live.map(c=>({type:'chooseNamedFieldProtect',uid:c.uid}))];
 }
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
  if(q.kind==='effect-printed-lock')return [
   {type:'choosePrintedLock',uid:null},
   ...q.choices.filter(c=>s.players[1-q.player].front.some(t=>t?.uid===c.uid&&
    t.fieldEntryStamp===c.stamp&&card(pack,t).type==='character'))
    .map(c=>({type:'choosePrintedLock',uid:c.uid}))
  ];
  if(q.kind==='effect-name-hand-remove')return q.choices
   .filter(uid=>p.hand.some(c=>c.uid===uid))
   .map(uid=>({type:'chooseNameHandRemove',uid}));
  if(q.kind==='effect-rest-bp')return [
   ...(q.optional?[{type:'chooseRestBp',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseRestBp',uid}))
  ];
 if(q.kind==='main-field-trait-retire')return q.choices.map(uid=>({type:'chooseFieldTraitRetire',uid}));
  if(q.kind==='effect-retire-own-character')return [
   {type:'chooseOwnCharacterRetire',uid:null},
   ...q.choices.map(uid=>({type:'chooseOwnCharacterRetire',uid}))
  ];
  if(q.kind==='effect-retire-missing-trait')return q.choices.map(uid=>({
   type:'chooseMissingTraitRetire',uid}));
  if(q.kind==='effect-outside-color-trait-active')return [
   {type:'chooseOutsideColorTraitActive',uid:null},
   ...p.outside.filter(c=>q.choices.includes(c.uid)).flatMap(c=>{
    const d=card(pack,c);
    return ['front','energy'].filter(line=>!(line==='front'&&d.frontForbidden))
     .flatMap(line=>legalDestinations(p,line).map(dest=>({
      type:'chooseOutsideColorTraitActive',uid:c.uid,line,...dest
     })));
   })
  ];
  if(q.kind==='effect-retire-own-trait')return [
   ...(q.optional?[{type:'chooseOwnTraitRetire',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseOwnTraitRetire',uid}))
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
  if(q.kind==='effect-bounce-bp')return [
   {type:'chooseBounceBp',uid:null},
   ...q.choices.map(uid=>({type:'chooseBounceBp',uid}))
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
 if(q.kind==='effect-mark-opp-start')return [
  ...(q.optional?[{type:'chooseMarkOppStart',uid:null}]:[]),
  ...q.choices.map(uid=>({type:'chooseMarkOppStart',uid}))
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
 if(q.kind==='effect-rest-ap-lock')return [
  ...q.choices.map(uid=>({type:'chooseRestApLock',uid})),
  {type:'chooseRestApLock',uid:null}
 ];
 throw Error('No handler for pending decision '+q.kind);
}
// UNION ARENA official Q1119 (2024-09-06): an event requiring "choose
// one" cannot be played at all unless ALL mandatory choices exist.
// This check is performed BEFORE spending AP or moving the event outside.
// Optional "up to one" choices remain playable with zero targets.
function retireOppFrontLimit(pack,s,owner,job){
 if(job.traitCountBonus){
  const bonus=job.traitCountBonus;
  const count=field(s.players[owner]).filter(c=>
   !(bonus.excludeSelf&&c.uid===job.sourceUid)&&
   cardHasTrait(card(pack,c),bonus.trait)).length;
  return count>=bonus.min?bonus.bonusBp:job.bp;
 }
 if(job.nameOrTraitPerBp){
  // One physical card with both the trait and the printed name counts once.
  // Silence removes neither the trait nor the printed name.
  const scale=job.nameOrTraitPerBp;
  const count=field(s.players[owner]).filter(c=>{
   const silenced=originalEffectsDisabled(s,c);
   const d=card(pack,c);
   return cardHasTrait(d,scale.trait)||cardHasName(d,scale.name,silenced);
  }).length;
  return count*scale.per;
 }
 if(job.traitPerBp){
  const count=field(s.players[owner]).filter(c=>cardHasTrait(card(pack,c),job.traitPerBp.trait)).length;
  return count*job.traitPerBp.per;
 }
 if(job.raidOrName){
  // Q552/Q555 (2023-09-25): raid state is 【レイド】 plus a face-up undercard.
  // The printed name still counts while that character is silenced.
  const raidState=c=>!!card(pack,c).raidName&&(c.stack||[]).some(x=>x.faceDown!==true);
  const oppRaid=field(s.players[1-owner]).some(raidState);
  const ownName=field(s.players[owner]).some(c=>cardHasName(card(pack,c),
   job.raidOrName.name,originalEffectsDisabled(s,c)));
  return oppRaid||ownName?job.bonusBp:job.bp;
 }
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
function eventMandatoryTargetsAvailable(pack,s,owner,d,reservedAp=d.ap,reservedHandUid=null){
 const enemy=s.players[1-owner];
 return (d.effects?.onPlay||[]).every(job=>{
  if(job.op==='grantFirstAttackKit')
   return field(s.players[owner]).some(c=>card(pack,c).type==='character'&&
    cardHasName(card(pack,c),job.name,originalEffectsDisabled(s,c)));
  if(job.op==='grantOwnFrontChoiceProtection')
   return s.players[owner].front.some(c=>c&&card(pack,c).type==='character');
  if(job.op==='conditionalBounceOrRetireByOwnOutsideNames')
   return enemy.front.some(c=>c&&card(pack,c).type==='character'&&
    bp(pack,s,c)<=job.bp&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  if(job.op==='retireOppFrontUnderBp'&&job.raidOrName){
   const limit=retireOppFrontLimit(pack,s,owner,job);
   return enemy.front.some(c=>c&&bp(pack,s,c)<=limit&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  }
  if(job.op==='retireOwnTraitFollow'&&job.optional===false)
   return field(s.players[owner]).some(c=>card(pack,c).type==='character'&&
    cardHasTrait(card(pack,c),job.trait));
  if(job.optional!==false)return true;
  if(job.op==='retireOppFrontUnderBp'){
   const limit=retireOppFrontLimit(pack,s,owner,job);
   return enemy.front.some(c=>c&&bp(pack,s,c)<=limit&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  }
  if(job.op==='oppFrontRestBranch'){
   if(job.optional===true)return true;
   return enemy.front.some(c=>c&&bp(pack,s,c)<=job.bp&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  }
  if(job.op==='restOppFrontOne')
   return enemy.front.some(c=>c&&!effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  if(job.op==='restOppFrontUnderBp'||job.op==='restOrRetireOppFrontByLife')
   return enemy.front.some(c=>c&&bp(pack,s,c)<=job.bp&&
    !effectChoiceProtected(s,owner,c.uid,'event')&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  if(job.op==='buffOwnField'){
   const mine=s.players[owner];
   const pool=job.zone==='front'?mine.front.filter(Boolean):field(mine);
   return pool.some(c=>card(pack,c).type==='character'&&
    (!job.excludeSelf||c.uid!==reservedHandUid)&&
    matchesFilter(pack,s,c,job.filter)&&
    (!job.also||matchesFilter(pack,s,c,job.also))&&
    cardEffectTargetPayable(pack,s,owner,c.uid,reservedAp,null,'event',reservedHandUid));
  }
  return true;
 });
}
// Q2062 is a cost of SELECTING a protected character by a CARD EFFECT,
// not a cost of playing a card, attacking or blocking.
// The existing pending action is the exact resolution boundary; no new queue.
const TARGETING_CARD_EFFECT_CHOICES=new Set([
 'chooseRetireBp','chooseBounceBp','chooseRestBp','chooseTarget','chooseTargetMany','chooseMarkOppStart','chooseNamedOutsideBounceRetire',
 'chooseRaidTopStrip','chooseAttackBan','chooseRestLock'
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
function oppFrontReducedOrRest(pack,s,owner,sourceUid,when){
 return when?.logic==='any'&&Array.isArray(when.checks)&&when.checks.some(q=>
  matchesV2LiveCondition(s,owner,sourceUid,q,c=>card(pack,c),
   ()=>calcEnergy(pack,s,owner),c=>bp(pack,s,c)));
}
function nameOnceActiveKey(definition,ability){
 // The printed name sentence covers this effect, not every ability of the name.
 const when=ability.when;
 const mark=when?.kind||(when?.logic==='all'?when.checks.map(c=>c.kind).join('+'):'plain');
 return definition.name+'|nameOnceActive|'+mark;
}
function requiredEnergyReader(pack,s){
 return physical=>effectiveRequiredEnergy(pack,s,physical);
}
function nameOnceActiveLegal(pack,s,owner,c,ability){
 if(ability?.op!=='nameOnceActive')return false;
 const name=nameOnceActiveKey(card(pack,c),ability);
 if(s.mainReadyOnceByName[owner].includes(name))return false;
 return !ability.when||matchesV2LiveCondition(s,owner,c.uid,ability.when,
  x=>card(pack,x),()=>calcEnergy(pack,s,owner),x=>bp(pack,s,x),
  requiredEnergyReader(pack,s));
}
function namedEventUsedThisTurn(pack,s,owner,eventName){
 return (s.zoneMoveEvents||[]).some(e=>{
  if(e.turn!==s.turn||e.owner!==owner||e.controller!==owner||
   e.from!=='hand'||e.to!=='outside'||e.reason!=='rule')return false;
  const d=card(pack,{uid:e.uid,cardId:e.cardId});
  return d.type==='event'&&d.name===eventName;
 });
}
function nameOnceEventActiveKey(definition,ability){
 return definition.name+'|nameOnceActiveIfEvent|'+ability.eventName;
}
function nameOnceEventActiveLegal(pack,s,owner,c,ability){
 if(ability?.op!=='nameOnceActiveIfEvent')return false;
 if(s.mainReadyOnceByName[owner].includes(nameOnceEventActiveKey(card(pack,c),ability)))
  return false;
 return namedEventUsedThisTurn(pack,s,owner,ability.eventName);
}
function handApPlan(pack,s,owner,d,opts={}){
 const rule=d.handApDiscountWhileName;
 const nameOnField=!!rule&&ownFieldHasPrintedName(pack,s,owner,rule.name);
 return handPlayApPlan(s,owner,d,{...opts,nameOnField});
}
function oncePayMandatoryReady(pack,s,owner,ability,sourceUid){
 const pl=s.players[owner];
 return (ability?.then||[]).every(step=>{
  if(step.op==='retireOwnTraitFollow'&&step.optional===false)
   return field(pl).some(c=>card(pack,c).type==='character'&&
    cardHasTrait(card(pack,c),step.trait));
  if(step.op==='deployOutsideColorApNameOrTraitRest'&&step.optional===false)
   return pl.outside.some(c=>matchesColorApNameOrTrait(pack,s,c,step));
  if(step.op==='grantOtherRequiredEnergyThisTurn')
   return field(pl).some(c=>c.uid!==sourceUid&&card(pack,c).type==='character');
  return true;
 });
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
  for(const c of pl.front.filter(c=>c&&!s.movedUids.includes(c.uid)&&card(pack,c).step&&!card(pack,c).energyForbidden&&!originalEffectsDisabled(s,c)))
   for(const choice of legalDestinations(pl,'energy'))out.push({type:'step',uid:c.uid,...choice});
 }
 if(s.phase==='main'){
   for(const c of pl.energy.filter(Boolean)){
    const d=originalEffectsDisabled(s,c)?null:card(pack,c),ab=d?.mainAbility;
    if(ab?.op==='fieldRestSacrificeReplay'&&d.type==='field'&&c.ready&&
     field(pl).some(x=>x.uid!==c.uid&&card(pack,x).type==='character'))
     out.push({type:'activate',uid:c.uid,mode:'fieldRestSacrificeReplay'});
    if(ab?.op==='fieldRestRetireThen'&&d.type==='field'&&c.ready)
     out.push({type:'activate',uid:c.uid,mode:'fieldRestTrueRetireDeploy'});
    if(ab?.op==='restSelfTopTraitHand'&&d.type==='field'&&c.ready)
     out.push({type:'activate',uid:c.uid,mode:'restTopTraitHand'});
    if(ab?.op==='fieldRestRetireActiveBuff'&&d.type==='field'&&c.ready)
     out.push({type:'activate',uid:c.uid,mode:'fieldRestRetireActiveBuff'});
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
   if(ability?.op==='entryTurnSacrificeChoice'&&c.entryTurn===s.turn&&
    !s.mainAbilityUsedUids.includes(c.uid)&&
    field(pl).some(x=>x.uid!==c.uid&&card(pack,x).type==='character'))
    out.push({type:'activate',uid:c.uid,mode:'entrySacrifice'});
   if(ability?.op==='nameOnceRestRetireDouble'&&c.ready&&
    !s.mainReadyOnceByName[p].includes(d.name+'|nameOnceRestRetireDouble')&&
    field(pl).some(x=>x.uid!==c.uid&&card(pack,x).type==='character'&&
     cardHasTrait(card(pack,x),ability.trait)))
    out.push({type:'activate',uid:c.uid,mode:'nameOnceRestRetire'});
   if(ability?.op==='restRetireExactOutside'&&c.ready)
    out.push({type:'activate',uid:c.uid,mode:'restRetireExact'});
   if(ability?.op==='restRetireNamedGrant'&&c.ready)
    out.push({type:'activate',uid:c.uid,mode:'restRetireNamed'});
   if(ability?.op==='restRetireRecoverOutside'&&c.ready){
    const query=ability.filters?{filters:ability.filters,logic:ability.logic}:
     {filter:ability.filter};
    // Retirement puts this card into outside before recovery. A source that
    // itself matches is already a legal mandatory target.
    if(ability.optional||pl.outside.some(x=>matchesOutsideRecovery(pack,s,x,query))||
     matchesOutsideRecovery(pack,s,c,query))
     out.push({type:'activate',uid:c.uid,mode:'restRetireRecover'});
   }
   if(ability?.op==='restOnceBuffReturnSelf'&&c.ready&&
    !s.mainAbilityUsedUids.includes(c.uid)&&
    field(pl).some(x=>x.uid!==c.uid&&card(pack,x).type==='character'))
    out.push({type:'activate',uid:c.uid,mode:'restOnceBuffReturn'});
   if(ability?.op==='discardHandBuffSelf'&&pl.hand.length>0&&
    !s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'discardSelfBuff'});
   if(nameOnceActiveLegal(pack,s,p,c,ability))
    out.push({type:'activate',uid:c.uid,mode:'nameOnceActive'});
   if(nameOnceEventActiveLegal(pack,s,p,c,ability))
    out.push({type:'activate',uid:c.uid,mode:'nameOnceEventActive'});
   if(ability?.op==='cardOnceActive'&&ability.scope==='card'&&
    !s.mainAbilityUsedUids.includes(c.uid)&&
    matchesV2LiveCondition(s,p,c.uid,ability.when,
     x=>card(pack,x),()=>calcEnergy(pack,s,p),x=>bp(pack,s,x)))
    out.push({type:'activate',uid:c.uid,mode:'cardOnceActive'});
   if(ability?.op==='restBuffThenApActive'&&c.ready&&
    field(pl).some(x=>x.uid!==c.uid&&card(pack,x).type==='character'))
    out.push({type:'activate',uid:c.uid,mode:'restBuffAp'});
   if(ability?.op==='restFrontNameOnce'&&!c.ready&&
    pl.front.some(x=>x?.uid===c.uid)&&
    !s.mainReadyOnceByName[p].includes(d.name+'|restFrontNameOnce')&&
    pl.apCards.some(x=>x.ready))
    out.push({type:'activate',uid:c.uid,mode:'restFrontNameOnce'});
   if(ability?.op==='repeatDiscardBattleKit'&&pl.hand.length)
    out.push({type:'activate',uid:c.uid,mode:'repeatDiscardBattle'});
   if(ability?.op==='oncePayProgram'&&!s.mainAbilityUsedUids.includes(c.uid)){
    const onFront=pl.front.some(x=>x?.uid===c.uid);
    const placed=onFront||pl.energy.some(x=>x?.uid===c.uid);
    const lineOk=ability.frontOnly?onFront:placed;
    const raidOk=!ability.raidOnly||(c.stack||[]).length>0;
    const apOk=!ability.payAp||pl.apCards.some(x=>x.ready);
    const nameOk=!ability.requiresOwnName||ownFieldHasPrintedName(pack,s,p,ability.requiresOwnName);
    const payOk=ability.then[0]?.op!=='discardGate'||pl.hand.length>0;
    const entryOk=ability.entryTurnOnly!==true||c.entryTurn===s.turn;
    const retireOk=oncePayMandatoryReady(pack,s,p,ability,c.uid);
    const retiredOk=ability.requiresOwnCharacterRetired!==true||retiredThisTurn(s,p,'character');
    if(lineOk&&raidOk&&apOk&&nameOk&&payOk&&entryOk&&retireOk&&retiredOk)
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
   if(ability?.op==='restOnceBuffSelfUntilNextOwnStart'&&c.ready&&
    !s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'restOnceSelfBuff'});
   if(ability?.op==='onceBuffSelfWhen'&&!s.mainAbilityUsedUids.includes(c.uid)&&
    oppFrontReducedOrRest(pack,s,p,c.uid,ability.when))
    out.push({type:'activate',uid:c.uid,mode:'onceBuffSelf'});
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
   if(ability?.op==='frontOnceProgram'&&ability.frontOnly===false&&
    !s.mainAbilityUsedUids.includes(c.uid)){
    const step=ability.then[0];
    if(!(step.op==='discardGate'&&!payableHand(pack,s,p,step.payment).length))
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
    // A READY own FRONT source pays its actual REST cost before any effect.
    if(c.ready)out.push({type:'activate',uid:c.uid,mode:'selfRestThen'});
    continue;
   }
   if(ability.op==='restOnceBuffSelfUntilNextOwnStart'){
    if(c.ready&&!s.mainAbilityUsedUids.includes(c.uid))
     out.push({type:'activate',uid:c.uid,mode:'restOnceSelfBuff'});
    continue;
   }
   if(ability.op==='onceBuffSelfWhen'){
    if(!s.mainAbilityUsedUids.includes(c.uid)&&
     oppFrontReducedOrRest(pack,s,p,c.uid,ability.when))
     out.push({type:'activate',uid:c.uid,mode:'onceBuffSelf'});
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
    if(step.op==='buffOwnField'&&step.filter?.field==='name'){
     if(field(pl).some(x=>card(pack,x).type==='character'&&matchesFilter(pack,s,x,step.filter)))
      out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    // Draw then discard does not choose an opposing character.
    if(step.op==='drawDiscard'){
     out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    // 1枚まで is optional. Zero opposing front characters still leaves
    // the ability legal; the shared REST resolver then sets no pending.
    if(step.op==='restOppFrontUnderBp'&&step.optional===true){
     out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
    // Milling the top card does not need another character first.
    // The BP choice is queued only after a card actually leaves the deck.
    if(step.op==='millTop'&&step.count===1&&Array.isArray(step.then)){
     out.push({type:'activate',uid:c.uid,mode:'frontOnce'});
     continue;
    }
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
   const payment=handApPlan(pack,s,p,d);
   const raidPayment=d.raidName?handApPlan(pack,s,p,d,{raid:true,uid:c.uid}):null;
   const requiredEnergy=effectiveHandRequiredEnergy(pack,s,p,d,c);
   const energyOk=requiredEnergy<=(produced[d.color]||0);
   if(energyOk&&payment.cost<=ap){
   if(d.type==='event'){
    if((!d.playRequiresOwnName||ownFieldHasPrintedName(pack,s,p,d.playRequiresOwnName))&&
     eventMandatoryTargetsAvailable(pack,s,p,d,payment.cost,c.uid))
     out.push({type:'event',uid:c.uid});
   }
   else for(const line of ['energy','front']){
    if(line==='front'&&(d.type!=='character'||d.frontForbidden))continue;
    if(line==='energy'&&d.energyForbidden)continue;
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
 if(s.phase==='attack')for(const c of pl.front.filter(c=>c?.ready&&
  card(pack,c).type==='character'&&
  !fieldRestrictions(s,p,c).some(r=>r.kind==='cannotAttack'))){
  out.push({type:'attack',uid:c.uid});
  if(hasCurrentBattleGrant(s,c,'sniperGranted')||
   (liveFirstAttackKit(s,c)&&(s.attacksByUid[c.uid]||0)===0))for(const target of
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
function requiredEnergyBonus(s,physical){
 return (physical?.buffs||[]).reduce((n,b)=>n+(b.requiredEnergy===2&&
  b.untilTurn===s.turn&&Object.keys(b).length===2?2:0),0);
}
// Printed required energy plus a this-turn earned increase. Hand discounts
// stay out of this number: a field or retirement check reads the card as it
// sits, not the cost of playing it from hand.
function faceUpRaid(pack,c){
 return !!c&&!!card(pack,c).raidName&&(c.stack||[]).some(x=>x.faceDown!==true);
}
function raidFrontRequiredEnergyAura(pack,s,physical){
 if(!physical?.uid)return 0;
 const owner=Number(String(physical.uid).split('-')[0]);
 if(!playerIndex(owner)||s.active!==owner)return 0;
 const pl=s.players[owner];
 const placed=[...pl.front,...pl.energy].some(c=>c?.uid===physical.uid);
 if(!placed||card(pack,physical).type!=='character')return 0;
 let bonus=0;
 for(const source of pl.front){
  if(!source||source.uid===physical.uid||originalEffectsDisabled(s,source))continue;
  const d=card(pack,source);
  if(d.raidFrontRequiredEnergy===2&&faceUpRaid(pack,source))bonus+=2;
 }
 return bonus;
}
export function effectiveRequiredEnergy(pack,s,physical){
 return card(pack,physical).energy+requiredEnergyBonus(s,physical)+
  raidFrontRequiredEnergyAura(pack,s,physical);
}
export function effectiveHandRequiredEnergy(pack,s,p,d,physical=null){
 const ownEmpty=!!d.emptyOwnFieldHandEnergyDiscount&&field(s.players[p]).length===0;
 const profile=d.opponentFieldColorsHandEnergyDiscount;
 const matchingOpponent=!!profile&&field(s.players[1-p]).some(c=>
  profile.colors.includes(card(pack,c).color));
 return Math.max(0,d.energy-
  (ownEmpty?d.emptyOwnFieldHandEnergyDiscount:0)-
  (matchingOpponent?profile.amount:0)-
  (d.printedHandEnergyDiscount||0))+requiredEnergyBonus(s,physical);
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
    selected.ready=false;
    const paused=retire(pack,s,p,pos.line,pos.slot);
    const outside=buried.filter(uid=>pl.outside.some(c=>c.uid===uid));
    if(!paused&&outside.length)s.pending={kind:'effect-recover-under',player:p,
     sourceUid:selected.uid,choices:outside};
    else if(!paused)continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='nameOnceRestRetireDouble'){
    const key=d.name+'|nameOnceRestRetireDouble';
    const choices=field(pl).filter(x=>x.uid!==selected.uid&&
     card(pack,x).type==='character'&&cardHasTrait(card(pack,x),ability.trait))
     .map(x=>x.uid);
    if(action.mode!=='nameOnceRestRetire'||!selected.ready||
     s.mainReadyOnceByName[p].includes(key)||!choices.length)
     throw Error('Named double-attack retirement needs a READY unused source and another trait character');
    selected.ready=false;
    s.mainReadyOnceByName[p].push(key);
    const follow={op:'openNamedDoubleAttack',owner:p,sourceUid:selected.uid,
     sourceName:d.name,trait:ability.trait};
    const pos=location(s,p,selected.uid);
    const tail=s.effectQueue.splice(0);
    const paused=retire(pack,s,p,pos.line,pos.slot);
    if(paused){
     s.pending.retirementAfter=[follow];
     s.pending.retirementTail=tail;
    }else{
     s.effectQueue.push(follow,...tail);
     continueEffectQueue(pack,s);
    }
    break;
   }
   if(ability.op==='entryTurnSacrificeChoice'){
    const choices=field(pl).filter(x=>x.uid!==selected.uid&&
     card(pack,x).type==='character').map(x=>x.uid);
    if(action.mode!=='entrySacrifice'||selected.entryTurn!==s.turn||
     s.mainAbilityUsedUids.includes(selected.uid)||!choices.length)
     throw Error('Entry-turn sacrifice needs this turn\'s entry and another character');
    s.mainAbilityUsedUids.push(selected.uid);
    s.pending={kind:'effect-entry-sacrifice',player:p,sourceUid:selected.uid,
     sourceName:d.name,choices,energy:ability.energy,color:ability.color,
     minBp:ability.minBp,down:ability.down};
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
   if(ability.op==='fieldRestRetireActiveBuff'){
    if(action.mode!=='fieldRestRetireActiveBuff'||!selected.ready||
     !pl.energy.some(c=>c?.uid===selected.uid)||d.type!=='field')
     throw Error('FIELD REST retirement requires an ACTIVE own ENERGY FIELD');
    selected.ready=false;
    const follow={op:'openFieldActiveBuff',owner:p,sourceUid:selected.uid,
     sourceName:d.name,bp:ability.bp};
    const pos=location(s,p,selected.uid);
    const tail=s.effectQueue.splice(0);
    const paused=retire(pack,s,p,pos.line,pos.slot);
    if(paused){
     s.pending.retirementAfter=[follow];
     s.pending.retirementTail=tail;
    }else{
     s.effectQueue.push(follow,...tail);
     continueEffectQueue(pack,s);
    }
    break;
   }
   if(ability.op==='restSelfTopTraitHand'){
    if(action.mode!=='restTopTraitHand'||!selected.ready||
     !pl.energy.some(c=>c?.uid===selected.uid)||d.type!=='field')
     throw Error('FIELD top look requires an ACTIVE own ENERGY FIELD');
    selected.ready=false;
    const top=pl.deck[0];
    if(top){
     const printed=card(pack,top);
     s.pending={kind:'effect-top-trait-hand',player:p,sourceUid:selected.uid,
      sourceName:d.name,trait:ability.trait,uid:top.uid,
      mayHand:cardHasTrait(printed,ability.trait)};
    }
    break;
   }
   if(ability.op==='fieldRestSacrificeReplay'){
    const choices=field(pl).filter(x=>x.uid!==selected.uid&&
     card(pack,x).type==='character').map(x=>x.uid);
    if(action.mode!=='fieldRestSacrificeReplay'||!selected.ready||
     !pl.energy.some(c=>c?.uid===selected.uid)||d.type!=='field'||!choices.length)
     throw Error('Field replay needs an ACTIVE energy field and another character');
    selected.ready=false;
    s.pending={kind:'effect-field-sacrifice-replay',player:p,sourceUid:selected.uid,
     sourceName:d.name,choices};
    break;
   }
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
     ...(Number.isInteger(ability.energy)?{energy:ability.energy}:{bp:ability.bp}),
     choices:pl.hand.map(c=>c.uid)};
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
    selected.ready=false;
    s.pending={kind:'effect-buff-own',player:p,sourceUid:selected.uid,choices,
     filter:{field:'type',value:'character'},bp:ability.bp,optional:false,excludeSelf:true};
    break;
   }
   if(ability.op==='restBuffThenApActive'){
    const choices=field(pl).filter(c=>c.uid!==selected.uid&&card(pack,c).type==='character')
     .map(c=>c.uid);
    if(action.mode!=='restBuffAp'||!selected.ready||!choices.length)
     throw Error('REST AP buff requires a READY source and another own character');
    selected.ready=false;
    s.pending={kind:'effect-buff-own',player:p,sourceUid:selected.uid,choices,
     filter:{field:'type',value:'character'},bp:ability.bp,optional:false,
     excludeSelf:true,thenApActive:ability.minAp};
    break;
   }
   if(ability.op==='restRetireNamedGrant'){
    if(action.mode!=='restRetireNamed'||!selected.ready)
     throw Error('REST retire named grant needs a READY source');
    selected.ready=false;
    s.effectQueue.unshift({op:'openNamedKeywordGrant',owner:p,
     sourceUid:selected.uid,sourceName:d.name,name:ability.name});
    const pos=location(s,p,selected.uid);
    const paused=retire(pack,s,p,pos.line,pos.slot);
    if(!paused)continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='restRetireExactOutside'){
    if(action.mode!=='restRetireExact'||!selected.ready)
     throw Error('REST retire exact deploy needs a READY source');
    selected.ready=false;
    // Retirement, including 退場時, finishes before the outside entry.
    s.effectQueue.unshift({op:'deployOutsideExactRest',owner:p,
     sourceUid:selected.uid,sourceName:d.name,name:ability.name,
     color:ability.color,energy:ability.energy,optional:true});
    const pos=location(s,p,selected.uid);
    const paused=retire(pack,s,p,pos.line,pos.slot);
    if(!paused)continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='restRetireRecoverOutside'){
    const query=ability.filters?{filters:ability.filters.map(f=>({...f})),logic:ability.logic}:
     {filter:{...ability.filter}};
    const readyTarget=pl.outside.some(c=>matchesOutsideRecovery(pack,s,c,query))||
     matchesOutsideRecovery(pack,s,selected,query);
    if(action.mode!=='restRetireRecover'||!selected.ready||
     (!ability.optional&&!readyTarget))
     throw Error('REST retire recovery needs a READY source and, when mandatory, an outside match');
    selected.ready=false;
    // Retirement finishes, including its 退場時, before the outside recovery.
    s.effectQueue.unshift({op:'recoverOutsideOne',owner:p,sourceUid:selected.uid,
     sourceName:d.name,...query,optional:ability.optional});
    const pos=location(s,p,selected.uid);
    const paused=retire(pack,s,p,pos.line,pos.slot);
    if(!paused)continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='restOnceBuffReturnSelf'){
    const choices=field(pl).filter(c=>c.uid!==selected.uid&&
     card(pack,c).type==='character').map(c=>c.uid);
    if(action.mode!=='restOnceBuffReturn'||!selected.ready||
     s.mainAbilityUsedUids.includes(selected.uid)||!choices.length)
     throw Error('Once REST buff return needs a READY unused source and another character');
    selected.ready=false;
    s.mainAbilityUsedUids.push(selected.uid);
    s.effectQueue.unshift({op:'returnSourceToHand',owner:p,
     sourceUid:selected.uid,sourceName:d.name});
    s.pending={kind:'effect-buff-own',player:p,sourceUid:selected.uid,choices,
     filter:{field:'type',value:'character'},bp:ability.bp,optional:false,excludeSelf:true};
    break;
   }
   if(ability.op==='onceBuffSelfWhen'){
    if(action.mode!=='onceBuffSelf'||s.mainAbilityUsedUids.includes(selected.uid)||
     !oppFrontReducedOrRest(pack,s,p,selected.uid,ability.when))
     throw Error('Once self buff needs the printed front condition');
    s.mainAbilityUsedUids.push(selected.uid);
    selected.buffs??=[];
    selected.buffs.push({bp:ability.bp,untilTurn:s.turn});
    break;
   }
   if(ability.op==='restOnceBuffSelfUntilNextOwnStart'){
    if(action.mode!=='restOnceSelfBuff'||!selected.ready||
     s.mainAbilityUsedUids.includes(selected.uid))
     throw Error('Once REST self buff needs a READY unused character');
    selected.ready=false;
    s.mainAbilityUsedUids.push(selected.uid);
    s.effectQueue.push({op:'buffSelfUntilNextOwnStart',bp:ability.bp,owner:p,
     sourceUid:selected.uid,sourceName:d.name},
     ...sourceMoveBoundary(pack,s,p,selected.uid));
    continueEffectQueue(pack,s);
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
   if(ability.op==='nameOnceActive'){
    const key=nameOnceActiveKey(d,ability);
    if(action.mode!=='nameOnceActive'||s.mainReadyOnceByName[p].includes(key)||
     (ability.when&&!matchesV2LiveCondition(s,p,selected.uid,ability.when,
      x=>card(pack,x),()=>calcEnergy(pack,s,p),x=>bp(pack,s,x),
      requiredEnergyReader(pack,s))))
     throw Error('Name-once ACTIVE is not legal');
    s.mainReadyOnceByName[p].push(key);
    attemptFieldActive(s,p,selected);
    break;
   }
   if(ability.op==='nameOnceActiveIfEvent'){
    const key=nameOnceEventActiveKey(d,ability);
    if(action.mode!=='nameOnceEventActive'||s.mainReadyOnceByName[p].includes(key)||
     !namedEventUsedThisTurn(pack,s,p,ability.eventName))
     throw Error('Named-event ACTIVE is not legal');
    s.mainReadyOnceByName[p].push(key);
    attemptFieldActive(s,p,selected);
    break;
   }
   if(ability.op==='cardOnceActive'){
    if(action.mode!=='cardOnceActive'||s.mainAbilityUsedUids.includes(selected.uid)||
     !matchesV2LiveCondition(s,p,selected.uid,ability.when,
      x=>card(pack,x),()=>calcEnergy(pack,s,p),x=>bp(pack,s,x)))
     throw Error('Card-once ACTIVE is not legal');
    s.mainAbilityUsedUids.push(selected.uid);
    attemptFieldActive(s,p,selected);
    break;
   }
   if(ability.op==='restFrontNameOnce'){
    const key=d.name+'|restFrontNameOnce';
    const onFront=pl.front.some(c=>c?.uid===selected.uid);
    if(action.mode!=='restFrontNameOnce'||!onFront||selected.ready!==false||
     s.mainReadyOnceByName[p].includes(key)||!pl.apCards.some(c=>c.ready))
     throw Error('REST-only front name activate is not legal');
    spendAp(pl,ability.payAp);
    noteEffectApPaid(pack,s,p,selected.uid);
    s.mainReadyOnceByName[p].push(key);
    attemptFieldActive(s,p,selected);
    s.effectQueue.push({op:'restOppFrontOne',optional:true,owner:p,
     sourceUid:selected.uid,sourceName:d.name});
    continueEffectQueue(pack,s);
    break;
   }
   if(ability.op==='repeatDiscardBattleKit'){
    const placed=pl.front.some(c=>c?.uid===selected.uid)||
     pl.energy.some(c=>c?.uid===selected.uid);
    if(action.mode!=='repeatDiscardBattle'||!placed||!pl.hand.length)
     throw Error('Repeatable discard battle kit needs a hand card');
    s.effectQueue.push({op:'discardGate',optional:false,owner:p,
     sourceUid:selected.uid,sourceName:d.name,then:[
      {op:'grantSelfAttackDamageThisTurn',amount:2},
      {op:'grantSelfAttackWinDrawThisTurn'}]});
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
     (ability.entryTurnOnly===true&&selected.entryTurn!==s.turn)||
     (ability.then[0]?.op==='discardGate'&&!pl.hand.length)||
     (ability.requiresOwnCharacterRetired===true&&!retiredThisTurn(s,p,'character'))||
     !oncePayMandatoryReady(pack,s,p,ability,selected.uid))
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
   if(ability.op==='frontOnceProgram'){
    const onFront=pl.front.some(c=>c?.uid===selected.uid);
    const onEnergy=pl.energy.some(c=>c?.uid===selected.uid);
    if(action.mode!=='frontOnce'||s.mainAbilityUsedUids.includes(selected.uid)||
     !(ability.frontOnly===false?onFront||onEnergy:onFront))
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
   if(!l||l.line!=='front'||card(pack,l.c).energyForbidden)throw Error('Invalid STEP');
   commitDestination(pack,s,p,'energy',action.slot,action.replaceUid);
   pl.front[l.slot]=null;pl.energy[action.slot]=l.c;
   recordCompletedMove(pack,s,{physical:l.c,owner:p,from:'front',to:'energy',reason:'rule'});
   s.moved=true;s.movedUids.push(l.c.uid);break;
  }
  case 'play':case 'event':case 'raid':{
   const index=pl.hand.findIndex(c=>c.uid===action.uid);
   if(index<0)throw Error('Card not in hand');
   const current=pl.hand[index],d=card(pack,current);
   const payment=handApPlan(pack,s,p,d,{raid:action.type==='raid',uid:current.uid});
   if(action.type==='event'&&d.playRequiresOwnName&&
    !ownFieldHasPrintedName(pack,s,p,d.playRequiresOwnName))
    throw Error('Event requires the printed own character');
   if(action.type==='play'&&action.line==='energy'&&d.energyForbidden)
    throw Error('This character cannot enter the energy line');
   spendAp(pl,payment.cost);
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
   const kit=liveFirstAttackKit(s,attacker);
   const kitAttack=!!kit&&declared===1;
   if(kitAttack)kit.armed=true;
   s.effectQueue.push(...attackJobs,...grantJobs,
    ...((attackJobs.length||grantJobs.length)?sourceMoveBoundary(pack,s,p,attacker.uid):[]),
    ...(targeted&&kitAttack?[{op:'resolveFirstAttackKit',owner:p,sourceUid:attacker.uid,
     sourceStamp:attacker.fieldEntryStamp,targetUid:action.targetUid,
     targetStamp:action.targetStamp}]:
     targeted?[{op:'resolveSniperBattle',owner:p,sourceUid:attacker.uid,
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
 if(s.pending&&(!playerIndex(s.pending.player)||!['phase-order','retirement-order','effect-move-order','effect-rest-tuck','effect-tuck-moved','effect-grant-cause','effect-hand-bottom','effect-pay-deploy-self','effect-deploy-self-active','effect-outside-hand-or-rest','effect-recover-under','effect-energy-front','effect-energy-trait-front','effect-entry-protect','effect-entry-sacrifice','effect-named-double','effect-field-sacrifice-replay','effect-swap-or-buff','effect-swap-pair','block','life-batch-order','life-trigger','effect-target','effect-mark-opp-start','effect-target-many','effect-grant-attack','granted-attack-draw','effect-discard','effect-remove-hand','effect-remove-hand-scale','effect-remove-hand-cap','effect-name-energy-reveal','effect-revealed-energy-hand','effect-mandatory-hand-remove','effect-draw-instead','effect-reveal-opp-top','effect-choose-printed-energy','end-hand-limit','effect-recover-ap','private-top-choice','private-top-place','effect-top-trait-hand','effect-retire-bp','effect-bounce-bp','effect-named-outside-bounce-retire','effect-optional-draw','effect-may-draw','effect-return-retired','effect-strip-raid-top','effect-retire-own-field','effect-retire-own-character','effect-retire-missing-trait','effect-outside-color-trait-active','effect-retire-own-trait','effect-active-any','main-field-trait-retire','effect-rest-bp','effect-attack-ban','effect-printed-lock','effect-name-hand-remove','effect-own-front-protect','effect-named-field-protect','effect-grant-ap-tax','effect-grant-front-energy','raid-effect-order','effect-buff-trait','effect-buff-own','effect-required-energy','effect-active-own-named','effect-active-energy-named','effect-once-choice','main-two-buff','main-discard-buff','main-discard-self-retire','main-rest-front-energy','leave-replacement','effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-order','effect-top-hand-outside','effect-recover-outside','effect-outside-rest','effect-outside-name-rest','effect-outside-exact-rest','effect-outside-trait-ap-rest','effect-outside-color-ap-rest','effect-outside-active-pair','effect-outside-color-trait-active','effect-outside-traitless-rest','effect-named-zone-entry','effect-hand-rest','effect-hand-rest-or-raid','effect-optional-pay-ap','effect-bounce-own','effect-discard-cost','effect-discard-gate','effect-remove-outside','effect-selection-hand-payment','attack-end-swap','energy-line-attack-end-swap','effect-choice-mode','effect-named-impact','effect-name-or-trait-impact','effect-first-attack-kit','effect-named-rest-ready','effect-named-keyword','effect-keyword-mode','effect-name-or-trait-ready','effect-name-or-trait-protect','effect-sacrifice-named','recovered-self-entry','effect-optional-mill','effect-pay-ap-deploy','effect-top-trait-outside','effect-line-move','effect-line-slot','effect-rest-two','effect-self-front','effect-raid-leave','effect-rest-lock','effect-rest-ap-lock','effect-grant-block-at-least','effect-may-draw-discard','effect-grant-impact','effect-life-to-hand'].includes(s.pending.kind)))
  throw Error('Invalid pending controller');
 if(!Array.isArray(s.triggerActivated)||s.triggerActivated.length!==2||
   s.triggerActivated.some(x=>typeof x!=='boolean'))
  throw Error('Invalid trigger activation ledger');
 if(!Array.isArray(s.raidedThisTurn)||s.raidedThisTurn.length!==2||
   s.raidedThisTurn.some(x=>typeof x!=='boolean')||
   !Array.isArray(s.fieldEntryNames)||s.fieldEntryNames.length!==2||
   s.fieldEntryNames.some((names,owner)=>!Array.isArray(names)||names.length>50||
    names.some(n=>typeof n!=='string')||
    !same(names,s.zoneMoveEvents.filter(e=>e.owner===owner&&e.turn===s.turn&&
     ['front','energy'].includes(e.to)&&!['front','energy'].includes(e.from)&&
     card(pack,{uid:e.uid,cardId:e.cardId}).type==='character').map(e=>
     card(pack,{uid:e.uid,cardId:e.cardId}).name)))||
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
 for(let owner=0;owner<2;owner++)for(const physical of field(s.players[owner])){
  for(const [key,op] of [['sniperGranted','grantSelfSniperThisTurn'],
   ['attackWinDrawGranted','grantSelfAttackWinDrawThisTurn'],
   ['mustBlockGranted','grantSelfMustBlockThisTurn']]){
   const g=physical[key];
   if(g===undefined)continue;
   const printedBattle=card(pack,physical).effects.onPlay?.some(x=>x.op===op);
   const paidWinDraw=op==='grantSelfAttackWinDrawThisTurn'&&
    card(pack,physical).mainAbility?.op==='repeatDiscardBattleKit'&&
    (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&
     e.from==='hand'&&e.to==='outside'&&e.reason==='payment'&&
     e.sourceUid===physical.uid);
   if(!g||typeof g!=='object'||Array.isArray(g)||
    !Number.isInteger(g.turn)||g.turn<0||g.turn>s.turn||
    !Number.isInteger(g.stamp)||g.stamp<1||g.stamp>=s.nextFieldEntryStamp||
    Object.keys(g).length!==2||Object.keys(g).some(k=>!['turn','stamp'].includes(k))||
    !(printedBattle||paidWinDraw))
    throw Error('Forged temporary physical battle grant');
  }
  const kit=physical.firstAttackKit;
  if(kit!==undefined){
   const event=(s.zoneMoveEvents||[]).find(e=>e.turn===s.turn&&e.uid===kit.sourceUid&&
    e.owner===owner&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule');
   const printed=event&&card(pack,{uid:event.uid,cardId:event.cardId});
   const earned=printed?.type==='event'&&printed.effects?.onPlay?.some(op=>
    op.op==='grantFirstAttackKit'&&op.name===kit.name);
   if(!kit||typeof kit!=='object'||Array.isArray(kit)||kit.turn!==s.turn||
    kit.stamp!==physical.fieldEntryStamp||typeof kit.sourceUid!=='string'||
    !kit.sourceUid.startsWith(owner+'-')||typeof kit.name!=='string'||
    kit.armed!==true&&kit.armed!==false||kit.consumed!==true&&kit.consumed!==false||
    Object.keys(kit).length!==6||
    Object.keys(kit).some(k=>!['turn','stamp','sourceUid','name','armed','consumed'].includes(k))||
    !cardHasName(card(pack,physical),kit.name,originalEffectsDisabled(s,physical))||
    !earned)
    throw Error('Forged first-attack kit');
  }
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
  const ceiling=physical.blockAtLeastGranted;
  if(ceiling!==undefined){
   const layers=c=>[c,...(c.stack||[]),...(c.under||[])];
   const named=field(s.players[owner]).some(c=>layers(c).some(layer=>{
    const printed=card(pack,layer);
    return (printed.effects?.onRaided||[]).some(e=>e.op==='chooseOne'&&
     e.options.some(o=>(o.then||[]).some(t=>t.op==='grantOwnNameBlockAtLeast'&&
      t.bp===ceiling.bp&&cardHasName(card(pack,physical),t.name,false))));
   }));
   const selfPrinted=card(pack,physical);
   const selfGate=selfPrinted.mainAbility?.op==='oncePayProgram'&&
    (selfPrinted.mainAbility.then||[]).find(step=>step.op==='discardGate');
   const self=!!selfGate&&(selfGate.then||[]).some(x=>
    x.op==='grantSelfBlockAtLeast'&&x.bp===ceiling.bp)&&
    (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.sourceUid===physical.uid&&
     e.from==='hand'&&e.to==='outside'&&e.reason==='payment'&&e.owner===owner);
   if(!ceiling||ceiling.turn!==s.turn||ceiling.stamp!==physical.fieldEntryStamp||
    !Number.isInteger(ceiling.bp)||Object.keys(ceiling).some(k=>
     !['turn','stamp','bp'].includes(k))||!(named||self))
    throw Error('Forged blocker ceiling');
  }
  const readyGrant=physical.readyOnAttackGranted;
  if(readyGrant!==undefined){
   const keys=Object.keys(readyGrant);
   const caused=(s.zoneMoveEvents||[]).filter(e=>e.turn===s.turn&&e.sourceUid===physical.uid&&
    e.from==='hand'&&e.to==='outside'&&(card(pack,{uid:e.uid,cardId:e.cardId}).moveTriggers||[])
     .some(t=>t.then.some(op=>op.op==='handBottomGrantDoubleAttack')));
   const bottomed=caused.some(e=>(s.zoneMoveEvents||[]).some(n=>n.order>e.order&&
    n.from==='hand'&&n.to==='deck'&&n.sourceUid===e.uid&&n.reason==='own-effect'));
   const classic=keys.length===2&&keys.every(k=>['turn','stamp'].includes(k))&&bottomed;
   const giver=[...s.players[owner].outside,...(s.players[owner].removed||[])]
    .find(c=>c.uid===readyGrant.sourceUid);
   const giverPrinted=giver&&card(pack,giver);
   const named=keys.length===3&&keys.every(k=>['turn','stamp','sourceUid'].includes(k))&&
    typeof readyGrant.sourceUid==='string'&&readyGrant.sourceUid.startsWith(owner+'-')&&
    readyGrant.sourceUid!==physical.uid&&
    giverPrinted?.mainAbility?.op==='nameOnceRestRetireDouble'&&
    cardHasTrait(card(pack,physical),giverPrinted.mainAbility.trait)&&
    s.mainReadyOnceByName[owner].includes(giverPrinted.name+'|nameOnceRestRetireDouble')&&
    (s.turnRetireEvents||[]).some(e=>e.turn===s.turn&&e.controller===owner&&
     e.uid===readyGrant.sourceUid&&e.cardType==='character');
   if(!readyGrant||readyGrant.turn!==s.turn||readyGrant.stamp!==physical.fieldEntryStamp||
    !(classic||named))
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
  const retireGrant=physical.attackEndRetireGranted;
  if(retireGrant!==undefined){
   const source=field(s.players[owner]).find(c=>c.uid===retireGrant.sourceUid);
   const earned=source&&card(pack,source).effects.onPlay?.some(e=>e.op==='chooseOne'&&
    e.options?.some(o=>o.then?.some(t=>t.op==='buffOwnField'&&t.attackEndRetire===true)));
   if(!retireGrant||typeof retireGrant!=='object'||Array.isArray(retireGrant)||
    retireGrant.turn!==s.turn||retireGrant.stamp!==physical.fieldEntryStamp||
    typeof retireGrant.sourceUid!=='string'||
    !retireGrant.sourceUid.startsWith(owner+'-')||!earned||
    Object.keys(retireGrant).length!==3||
    Object.keys(retireGrant).some(k=>!['turn','stamp','sourceUid'].includes(k)))
    throw Error('Forged attack-end retire grant');
  }
  for(const buff of physical.buffs||[])if(buff.untilOwnTurnStart!==undefined){
   const next=Number.isInteger(buff.untilOwnTurnStart)&&
    buff.untilOwnTurnStart===s.players[owner].ownTurns+1;
   const bpShape=Number.isInteger(buff.bp)&&buff.bp>=1&&buff.bp<=5000&&
    Object.keys(buff).length===2&&
    Object.keys(buff).every(k=>['bp','untilOwnTurnStart'].includes(k))&&
    !!(card(pack,physical).effects.onPlay?.some(e=>e.op==='chooseOne'&&e.entry==='ownEffect'&&
     e.options.some(o=>o.then.some(t=>t.op==='buffSelfUntilNextOwnStart'&&t.bp===buff.bp)))||
     (card(pack,physical).mainAbility?.op==='restOnceBuffSelfUntilNextOwnStart'&&
      card(pack,physical).mainAbility.bp===buff.bp));
   const ability=card(pack,physical).mainAbility;
   const energyShape=buff.energy===1&&buff.color==='yellow'&&
    card(pack,physical).color==='yellow'&&
    Object.keys(buff).length===3&&
    Object.keys(buff).every(k=>['energy','color','untilOwnTurnStart'].includes(k))&&
    ability?.op==='entryTurnSacrificeChoice'&&ability.energy===1&&
    ability.color==='yellow';
   if(!next||!(bpShape||energyShape))
    throw Error('Forged next-own-start physical BP modifier');
  }
  for(const buff of physical.buffs||[])if(buff.requiredEnergy!==undefined){
   if(buff.requiredEnergy!==2||buff.untilTurn!==s.turn||
    Object.keys(buff).length!==2||
    Object.keys(buff).some(k=>!['requiredEnergy','untilTurn'].includes(k)))
    throw Error('Forged required-energy modifier');
  }
 }
 if(s.pending?.kind==='effect-may-draw'){
  const q=s.pending,src=s.players[q.player].front.find(c=>c?.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  if(!src||printed.raidFrontOtherRetireDraw!==1||!faceUpRaid(pack,src)||
   !s.mainReadyOnceByName[q.player].includes(printed.name+'|raidFrontOtherRetireDraw')||
   Object.keys(q).length!==3||
   Object.keys(q).some(k=>!['kind','player','sourceUid'].includes(k)))
   throw Error('Invalid raid-front retire draw');
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
 if(s.pending?.kind==='energy-line-attack-end-swap'){
  const q=s.pending,pl=s.players[q.player];
  const src=pl.energy.find(c=>c?.uid===q.sourceUid);
  const choices=src?energyLineAttackEndFrontChoices(pack,s,q.player):[];
  if(q.player!==s.active||s.phase!=='attack'||!src||
   src.fieldEntryStamp!==q.sourceStamp||
   src.energyLineAttackEndSwapUsedTurn!==s.turn||
   !card(pack,src).energyLineAttackEndSwap||originalEffectsDisabled(s,src)||
   !(s.attacksByUid[q.attackerUid]>=1)||!Number.isInteger(q.sourceStamp)||
   q.sourceStamp<1||typeof q.attackerUid!=='string'||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','attackerUid','choices'].includes(k)))
   throw Error('Invalid energy-line attack-end swap');
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
 if(s.pending?.kind==='effect-reveal-opp-top'){
  const q=s.pending,pl=s.players[q.player],foe=s.players[1-q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const effect=printed?.effects.onPlay?.find(e=>e.op==='revealOppTopPlace'&&Object.keys(e).length===1);
  const top=foe?.deck[0];
  if(!effect||q.target!==1-q.player||!top||top.uid!==q.uid||
   q.sourceName!==printed.name||!q.sourceUid.startsWith(q.player+'-')||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','target','uid'].includes(k)))
   throw Error('Forged revealed opponent top');
 }
 if(s.pending?.kind==='effect-draw-instead'){
  const q=s.pending,pl=s.players[q.player];
  const source=[...field(pl),...(pl.resolvingEvents||[]),...pl.outside].find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const effect=printed&&[...(printed.effects.onPlay||[]),...(printed.effects.onAttack||[]),
   ...(printed.mainAbility?.then||[])].find(e=>e.op==='drawDiscard'&&e.instead&&
   e.count===q.count&&e.discardCount===q.discardCount&&same(e.instead.when,q.when));
  if(!effect||q.sourceName!==printed.name||!q.sourceUid.startsWith(q.player+'-')||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','count','discardCount','when'].includes(k)))
   throw Error('Forged draw replacement');
 }
 if(s.pending?.kind==='effect-remove-hand'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const effect=printed?.effects.onAttack?.find(e=>e.op==='optionalRemoveHandThen');
  const choices=pl.hand.filter(c=>matchesFilter(pack,s,c,q.filter)).map(c=>c.uid);
  if(!effect||q.zone!=='removed'||!same(effect.filter,q.filter)||!same(effect.then,q.then)||
   !same(q.choices,choices)||!q.choices.length||q.sourceName!==printed.name||
   !q.sourceUid.startsWith(q.player+'-')||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','zone','filter','then'].includes(k)))
   throw Error('Forged hand removal');
 }
 if(s.pending?.kind==='effect-remove-hand-scale'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=printed?.effects?.onPlay?.find(e=>e.op==='removeHandTraitScaleRetire'&&
   e.trait===q.trait&&e.baseBp===q.baseBp&&e.per===q.per);
  const choices=pl.hand.filter(c=>cardHasTrait(card(pack,c),q.trait)).map(c=>c.uid);
  const selectedOk=Array.isArray(q.selected)&&new Set(q.selected).size===q.selected.length&&
   q.selected.every(uid=>choices.includes(uid));
  if(!step||q.sourceName!==printed.name||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||!selectedOk||
   Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','trait','baseBp','per','choices','selected'].includes(k)))
   throw Error('Invalid scaled hand removal');
 }
 if(s.pending?.kind==='effect-remove-hand-cap'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.resolvingEvents||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=printed?.effects?.onPlay?.find(e=>e.op==='removeHandTraitCapScale'&&
   e.trait===q.trait&&e.max===q.max&&e.baseBp===q.baseBp&&e.per===q.per&&e.draw===true);
  const choices=pl.hand.filter(c=>cardHasTrait(card(pack,c),q.trait)).map(c=>c.uid);
  const selectedOk=Array.isArray(q.selected)&&q.selected.length<q.max&&
   new Set(q.selected).size===q.selected.length&&q.selected.every(uid=>choices.includes(uid));
  if(!step||printed.type!=='event'||q.sourceName!==printed.name||q.draw!==true||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||!selectedOk||
   Object.keys(q).length!==11||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','trait','max','baseBp','per','draw','choices','selected'].includes(k)))
   throw Error('Invalid capped hand removal');
 }
 if(s.pending?.kind==='effect-name-energy-reveal'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=printed?.effects?.onAttack?.find(e=>e.op==='nameEnergyRevealHandRemove'&&
   Object.keys(e).length===1);
  if(!step||q.sourceName!==printed.name||!q.sourceUid.startsWith(q.player+'-')||
   q.min!==0||q.max!==30||pl.deck.length<1||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','min','max'].includes(k)))
   throw Error('Invalid named energy reveal');
 }
 if(s.pending?.kind==='effect-revealed-energy-hand'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=printed?.effects?.onAttack?.find(e=>e.op==='nameEnergyRevealHandRemove'&&
   Object.keys(e).length===1);
  const top=pl.deck[0];
  if(!step||q.sourceName!==printed.name||!q.sourceUid.startsWith(q.player+'-')||
   !top||top.uid!==q.uid||card(pack,top).energy!==q.energy||
   !Number.isInteger(q.energy)||q.energy<0||q.energy>30||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','uid','energy'].includes(k)))
   throw Error('Invalid revealed energy hand choice');
 }
 if(s.pending?.kind==='effect-mandatory-hand-remove'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=printed?.effects?.onAttack?.find(e=>e.op==='nameEnergyRevealHandRemove'&&
   Object.keys(e).length===1);
  const choices=pl.hand.map(c=>c.uid);
  if(!step||q.sourceName!==printed.name||!q.sourceUid.startsWith(q.player+'-')||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   !choices.includes(q.addedUid)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','addedUid'].includes(k)))
   throw Error('Invalid mandatory hand removal');
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
  if(s.pending?.kind==='effect-retire-missing-trait'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.removed||[]),...(pl.resolvingEvents||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=printed?.mainAbility?.op==='oncePayProgram'?
   printed.mainAbility.then.find(e=>e.op==='retireOwnMissingTraitThen'&&e.trait===q.trait):null;
  const choices=[...pl.front,...pl.energy].filter(c=>c&&
   card(pack,c).type==='character'&&!cardHasTrait(card(pack,c),q.trait)).map(c=>c.uid);
  const then=q.then?.map(({owner,sourceUid,sourceName,...x})=>x);
  if(!step||q.sourceName!==printed.name||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||!same(step.then,then)||
   q.then.some(e=>e.owner!==q.player||e.sourceUid!==q.sourceUid||e.sourceName!==printed.name)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','trait','choices','then'].includes(k)))
   throw Error('Invalid missing-trait retirement');
 }
 if(s.pending?.kind==='effect-named-field-protect'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.removed||[]),...(pl.resolvingEvents||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=(printed?.moveTriggers||[]).flatMap(t=>t.then).find(e=>
   e.op==='grantNamedFieldProtection'&&e.name===q.name&&e.scope===q.scope&&
   e.optional===true&&e.until==='nextOwnStart');
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   Number.isInteger(c.fieldEntryStamp)&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c)))
   .map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
  const caused=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===q.sourceUid&&
   e.owner===q.player&&e.from==='hand'&&e.to==='outside'&&e.sourceOnField&&
   (printed?.moveTriggers||[]).some(t=>matchesCompletedMove(e,t.when)));
  if(!step||q.sourceName!==printed.name||q.optional!==true||!caused||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','scope','optional','choices'].includes(k)))
   throw Error('Invalid named field protection');
 }
 if(s.pending?.kind==='effect-outside-color-trait-active'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.removed||[]),...(pl.resolvingEvents||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=printed?.mainAbility?.op==='oncePayProgram'?
   printed.mainAbility.then.find(e=>e.op==='retireOwnMissingTraitThen'&&
    e.then?.some(x=>x.op==='deployOutsideColorTraitActive'&&x.color===q.color&&x.trait===q.trait)):null;
  const choices=pl.outside.filter(c=>{
   const d=card(pack,c);
   return d.type==='character'&&d.color===q.color&&cardHasTrait(d,q.trait);
  }).map(c=>c.uid);
  if(!step||q.sourceName!==printed.name||q.optional!==true||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','color','trait','choices','optional'].includes(k)))
   throw Error('Invalid color-trait ACTIVE deployment');
 }
 if(s.pending?.kind==='effect-outside-color-ap-rest'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.front.find(c=>c?.uid===q.sourceUid),printed=source&&card(pack,source);
  const step=printed?.mainAbility?.op==='oncePayProgram'&&
   printed.mainAbility.requiresOwnCharacterRetired===true?
   printed.mainAbility.then.find(e=>e.op==='deployOutsideColorApNameOrTraitRest'&&
    e.color===q.color&&e.ap===q.ap&&e.name===q.name&&e.trait===q.trait&&e.optional===false):null;
  const choices=pl.outside.filter(c=>matchesColorApNameOrTrait(pack,s,c,q)).map(c=>c.uid);
  if(!step||originalEffectsDisabled(s,source)||q.sourceName!==printed.name||
   q.optional!==false||!retiredThisTurn(s,q.player,'character')||
   !s.mainAbilityUsedUids.includes(q.sourceUid)||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==10||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','color','ap','name','trait','optional'].includes(k)))
   throw Error('Invalid color AP name-or-trait REST');
 }
 if(s.pending?.kind==='effect-retire-own-trait'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.hand,...pl.resolvingEvents,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const effect=[...(printed?.effects?.onPlay||[]),
   ...(printed?.mainAbility?.op==='oncePayProgram'?printed.mainAbility.then||[]:[])
  ].find(e=>e.op==='retireOwnTraitFollow'&&
   e.trait===q.trait&&e.optional===q.optional&&same(e.follow,q.follow));
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   cardHasTrait(card(pack,c),q.trait)).map(c=>c.uid);
  if(!effect||q.sourceName!==printed.name||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||typeof q.optional!=='boolean'||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','trait','choices','optional','follow'].includes(k)))
   throw Error('Invalid own trait retirement');
 }
 if(s.pending?.kind==='effect-outside-active-pair'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.hand,...pl.resolvingEvents,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const effect=[...(printed?.effects?.onPlay||[])].find(e=>e.op==='retireOwnTraitFollow'&&
   e.follow?.kind==='drawActivePair'&&e.follow.draw===q.draw&&e.follow.max>=q.remaining&&
   e.follow.ap===q.ap&&e.follow.color===q.color&&e.follow.name===q.name&&
   e.follow.trait===q.trait);
  const choices=pl.outside.filter(c=>matchesActiveNameOrTrait(pack,s,q.player,c,q)).map(c=>c.uid);
  if(!effect||q.sourceName!==printed.name||q.optional!==true||
   (q.remaining!==1&&q.remaining!==2)||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||q.draw!==1||
   Object.keys(q).length!==12||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','optional','remaining','color','ap','name','trait','draw'].includes(k)))
   throw Error('Invalid active pair deployment');
 }
 if(s.pending?.kind==='effect-top-trait-hand'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.energy.find(c=>c?.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const top=pl.deck[0];
  const mayHand=!!top&&cardHasTrait(card(pack,top),printed?.mainAbility?.trait);
  if(!source||printed?.type!=='field'||printed.mainAbility?.op!=='restSelfTopTraitHand'||
   printed.mainAbility.trait!==q.trait||q.sourceName!==printed.name||source.ready!==false||
   !top||top.uid!==q.uid||q.mayHand!==mayHand||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','trait','uid','mayHand'].includes(k)))
   throw Error('Invalid trait top look');
 }
 if(s.pending?.kind==='effect-named-impact'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.resolvingEvents,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const earned=printed?.effects?.onPlay?.some(e=>e.op==='chooseOne'&&
   e.options?.some(o=>o.then?.some(t=>t.op==='buffNamedImpact'&&t.name===q.name&&
    t.bp===q.bp&&t.impact===q.impact)));
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  if(!earned||q.sourceName!==printed.name||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','bp','impact','choices'].includes(k)))
   throw Error('Invalid named impact buff');
 }
 if(s.pending?.kind==='effect-name-or-trait-impact'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.resolvingEvents,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const earned=printed?.effects?.onPlay?.some(e=>e.op==='buffNameOrTraitImpact'&&
   e.name===q.name&&e.trait===q.trait&&e.bp===q.bp&&e.impact===q.impact&&e.optional===true);
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   (cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))||
    cardHasTrait(card(pack,c),q.trait))).map(c=>c.uid);
  if(!earned||q.sourceName!==printed.name||q.optional!==true||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==10||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','trait','bp','impact','choices','optional'].includes(k)))
   throw Error('Invalid name-or-trait impact buff');
 }
 if(s.pending?.kind==='effect-named-double'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...pl.outside,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   cardHasTrait(card(pack,c),q.trait)).map(c=>c.uid);
  const retired=(s.turnRetireEvents||[]).some(e=>e.turn===s.turn&&e.controller===q.player&&
   e.uid===q.sourceUid&&e.cardType==='character');
  if(!printed||printed.mainAbility?.op!=='nameOnceRestRetireDouble'||
   printed.mainAbility.trait!==q.trait||q.sourceName!==printed.name||!retired||
   !s.mainReadyOnceByName[q.player].includes(printed.name+'|nameOnceRestRetireDouble')||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','trait','choices'].includes(k)))
   throw Error('Invalid named double-attack choice');
 }
 if(s.pending?.kind==='effect-field-sacrifice-replay'){
  const q=s.pending,pl=s.players[q.player];
  const src=pl.energy.find(c=>c?.uid===q.sourceUid),printed=src&&card(pack,src);
  const choices=field(pl).filter(c=>c.uid!==q.sourceUid&&
   card(pack,c).type==='character').map(c=>c.uid);
  if(!src||src.ready!==false||printed?.type!=='field'||
   printed.mainAbility?.op!=='fieldRestSacrificeReplay'||
   q.sourceName!==printed.name||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices'].includes(k)))
   throw Error('Invalid field sacrifice replay');
 }
 if(s.pending?.kind==='effect-swap-or-buff'||s.pending?.kind==='effect-swap-pair'){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid),printed=src&&card(pack,src);
  const gate=printed?.mainAbility?.op==='oncePayProgram'&&
   printed.mainAbility.then?.find(x=>x.op==='discardGate'&&x.optional===false);
  const step=gate&&gate.then?.find(x=>x.op==='swapOrBuff'&&
   x.bp===q.bp&&x.allName===q.allName);
  const fronts=pl.front.filter(c=>c&&card(pack,c).type==='character'&&
   !card(pack,c).energyForbidden).map(c=>c.uid);
  const energies=pl.energy.filter(c=>c&&card(pack,c).type==='character'&&
   !card(pack,c).frontForbidden).map(c=>c.uid);
  const swap=fronts.length>0&&energies.length>0;
  const both=swap&&field(pl).some(c=>cardHasName(card(pack,c),q.allName,
   originalEffectsDisabled(s,c)));
  const expected=[...(swap?['swap']:[]),'bp',...(both?['both']:[])];
  const paid=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===q.player&&
   e.from==='hand'&&e.to==='outside'&&e.reason==='payment'&&e.sourceUid===q.sourceUid)&&
   s.mainAbilityUsedUids.includes(q.sourceUid);
  const pairFront=q.kind==='effect-swap-pair'&&q.step==='front';
  const pairEnergy=q.kind==='effect-swap-pair'&&q.step==='energy';
  const keys=Object.keys(q);
  const bothOk=q.both===false||q.both===true&&expected.includes('both');
  const modeOk=q.kind==='effect-swap-or-buff'&&same(q.options,expected)&&
   keys.length===7&&keys.every(k=>['kind','player','sourceUid','sourceName','bp','allName','options'].includes(k));
  const frontOk=pairFront&&bothOk&&same(q.choices,fronts)&&fronts.length>0&&energies.length>0&&
   keys.length===9&&keys.every(k=>['kind','player','sourceUid','sourceName','bp','allName','step','both','choices'].includes(k));
  const energyOk=pairEnergy&&bothOk&&typeof q.frontUid==='string'&&
   fronts.includes(q.frontUid)&&same(q.choices,energies)&&
   keys.length===10&&keys.every(k=>['kind','player','sourceUid','sourceName','bp','allName','step','both','choices','frontUid'].includes(k));
  if(!src||!step||printed.name!==q.sourceName||q.bp!==1000||!paid||!(modeOk||frontOk||energyOk))
   throw Error('Invalid swap or buff choice');
 }
 if(s.pending?.kind==='effect-entry-sacrifice'){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid),printed=src&&card(pack,src);
  const ability=printed?.mainAbility;
  const choices=field(pl).filter(c=>c.uid!==q.sourceUid&&
   card(pack,c).type==='character').map(c=>c.uid);
  if(!src||src.entryTurn!==s.turn||ability?.op!=='entryTurnSacrificeChoice'||
   q.sourceName!==printed.name||ability.energy!==q.energy||ability.color!==q.color||
   ability.minBp!==q.minBp||ability.down!==q.down||q.color!==printed.color||
   !s.mainAbilityUsedUids.includes(src.uid)||!Array.isArray(q.choices)||
   !q.choices.length||!same(q.choices,choices)||Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','energy','color','minBp','down'].includes(k)))
   throw Error('Invalid entry-turn sacrifice');
 }
 if(s.pending?.kind==='effect-choice-mode'){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid),printed=src&&card(pack,src);
  const ability=printed?.mainAbility;
  if(ability?.op==='entryTurnSacrificeChoice'){
   const earned=(src.buffs||[]).some(b=>b.energy===ability.energy&&b.color===ability.color&&
    b.untilOwnTurnStart===pl.ownTurns+1);
   const draw=q.options?.find(o=>o.id==='draw');
   const cut=q.options?.find(o=>o.id==='cut');
   if(!earned||q.optional!==false||q.sourceName!==printed.name||q.options.length!==2||
    !same(draw?.then,[{op:'draw',count:1}])||
    !same(cut?.then,[{op:'enemyBpDown',bp:ability.down,optional:true,
     minBp:ability.minBp,zone:'front'}])||
    Object.keys(q).length!==6||
    Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','options','optional'].includes(k)))
    throw Error('Invalid entry-turn sacrifice choice');
  }
 }
 if(s.pending?.kind==='effect-first-attack-kit'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.resolvingEvents,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const earned=printed?.type==='event'&&printed.effects?.onPlay?.some(e=>
   e.op==='grantFirstAttackKit'&&e.name===q.name&&e.bp===q.bp);
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  if(!earned||q.sourceName!==printed.name||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','bp','choices'].includes(k)))
   throw Error('Invalid first-attack kit choice');
 }
 if(s.pending?.kind==='effect-named-rest-ready'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.resolvingEvents,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='restActiveNamedReadyAp'&&
   e.recoverAp===q.recoverAp&&same(e.names,q.names));
  const choices=field(pl).filter(c=>c.ready===true&&card(pack,c).type==='character'&&
   q.names.some(name=>cardHasName(card(pack,c),name,originalEffectsDisabled(s,c)))).map(c=>c.uid);
  if(!earned||q.sourceName!==printed.name||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','names','recoverAp','choices'].includes(k)))
   throw Error('Invalid named ACTIVE rest');
 }
 if(s.pending?.kind==='effect-name-or-trait-ready'||s.pending?.kind==='effect-name-or-trait-protect'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const branch=printed?.effects?.onRetire?.find(e=>e.op==='chooseOne'&&e.ownTurnOnly===true);
  const earned=branch?.options?.some(o=>o.then?.some(t=>
   (q.kind==='effect-name-or-trait-ready'?t.op==='readyNameOrTrait':t.op==='protectNameOrTrait')&&
   t.name===q.name&&t.trait===q.trait));
  const choices=field(pl).filter(c=>c.uid!==q.sourceUid&&card(pack,c).type==='character'&&
   (cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))||
    cardHasTrait(card(pack,c),q.trait))).map(c=>c.uid);
  if(!earned||q.sourceName!==printed.name||q.optional!==true||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','trait','choices','optional'].includes(k)))
   throw Error('Invalid name-or-trait retirement choice');
 }
 if(s.pending?.kind==='effect-sacrifice-named'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const chain=printed?.effects?.onPlay?.find(e=>e.op==='sacrificeNamedChain'&&
   e.name===q.name&&e.per===q.per&&e.impactMinEnergy===q.impactMinEnergy);
  const gate=!!chain&&matchesV2LiveCondition(s,q.player,q.sourceUid,chain.when,
   c=>card(pack,c),()=>calcEnergy(pack,s,q.player),c=>bp(pack,s,c));
  const choices=field(pl).filter(c=>c.uid!==q.sourceUid&&card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  if(!gate||q.sourceName!==printed.name||q.optional!==true||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==9||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','choices','optional','per','impactMinEnergy'].includes(k)))
   throw Error('Invalid named sacrifice');
 }
 if(s.pending?.kind==='effect-retire-bp'&&s.pending.sacrificedUid){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const chain=printed?.effects?.onPlay?.find(e=>e.op==='sacrificeNamedChain'&&e.per===q.per);
  const gone=pl.outside.find(c=>c.uid===q.sacrificedUid)||
   (pl.removed||[]).find(c=>c.uid===q.sacrificedUid);
  const sacrificed=gone&&card(pack,gone);
  const cap=sacrificed?sacrificed.energy*q.per:null;
  const choices=s.players[1-q.player].front.filter(c=>c&&cap!==null&&bp(pack,s,c)<=cap&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
  if(!chain||!sacrificed||!cardHasName(sacrificed,chain.name,false)||
   sacrificed.energy!==q.sacrificedEnergy||q.limit!==cap||q.optional!==true||
   q.sourceName!==printed.name||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||
   Object.keys(q).length!==10||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','limit','optional','sacrificedEnergy','sacrificedUid','per'].includes(k)))
   throw Error('Invalid sacrificed-energy retirement');
 }
 if(s.pending?.kind==='effect-named-keyword'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c))).map(c=>c.uid);
  if(!printed||printed.mainAbility?.op!=='restRetireNamedGrant'||
   printed.mainAbility.name!==q.name||q.sourceName!==printed.name||
   q.optional!==true||!Array.isArray(q.choices)||!q.choices.length||
   !same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','choices','optional'].includes(k)))
   throw Error('Invalid named keyword grant');
 }
 if(s.pending?.kind==='effect-keyword-mode'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const target=field(pl).find(c=>c.uid===q.target);
  if(!printed||printed.mainAbility?.op!=='restRetireNamedGrant'||
   printed.mainAbility.name!==q.name||q.sourceName!==printed.name||
   !target||!cardHasName(card(pack,target),q.name,originalEffectsDisabled(s,target))||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','target'].includes(k)))
   throw Error('Invalid named keyword mode');
 }
 if(s.pending?.kind==='effect-recover-ap'&&s.pending.optional===false){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.resolvingEvents,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const earned=printed?.effects?.onPlay?.some(e=>e.op==='restActiveNamedReadyAp'&&
   e.recoverAp===q.remaining);
  if(!earned||q.sourceName!==printed.name||q.remaining!==1||
   !pl.apCards.some(c=>c.inPlay&&!c.ready)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','remaining','optional'].includes(k)))
   throw Error('Invalid mandatory AP recovery');
 }
 if(s.pending?.kind==='effect-active-any'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.removed||[]),...(pl.resolvingEvents||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const choices=field(pl).map(c=>c.uid);
  if(!printed||printed.mainAbility?.op!=='fieldRestRetireActiveBuff'||
   printed.mainAbility.bp!==q.bp||q.sourceName!==printed.name||q.optional!==true||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','optional','bp'].includes(k)))
   throw Error('Invalid field ACTIVE choice');
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
 if(s.pending?.kind==='effect-top-filter-choice'&&Array.isArray(s.pending.groups)){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.hand,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const restOutside=q.rest==='outside';
  const earned=printed?.effects?.onPlay?.some(e=>e.op==='searchTopOneBottomDiscard'&&
   e.count>=q.uids?.length&&same(e.groups,q.groups)&&
   (restOutside?e.rest==='outside':e.rest===undefined));
  const window=Array.isArray(q.uids)?pl.deck.slice(0,q.uids.length):[];
  const expected=window.filter(c=>matchesSearch(pack,s,c,q)).map(c=>c.uid);
  if(!earned||!q.sourceUid.startsWith(q.player+'-')||!Array.isArray(q.uids)||
   q.uids.length<1||q.uids.length>5||new Set(q.uids).size!==q.uids.length||
   !same(window.map(c=>c.uid),q.uids)||!Array.isArray(q.choices)||
   !same(q.choices,expected)||(q.rest!==undefined&&!restOutside)||
   Object.keys(q).length!==(restOutside?7:6)||
   Object.keys(q).some(k=>!['kind','player','sourceUid','uids','choices','groups',
    ...(restOutside?['rest']:[])].includes(k)))
   throw Error('Invalid grouped top-filter pending');
 }
 if(s.pending?.kind==='effect-optional-mill'&&Number.isInteger(s.pending.batch)){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='millTop'&&e.optional===true&&
   e.count===3&&e.count===q.batch&&Array.isArray(e.then)&&same(e.then,q.then));
  if(!earned||q.sourceName!==printed.name||!q.sourceUid.startsWith(q.player+'-')||
   q.batch!==3||pl.deck.length<1||!Array.isArray(q.then)||q.then.length!==1||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','batch','then'].includes(k)))
   throw Error('Forged optional three-card mill');
 }
 if(s.pending?.kind==='effect-choose-printed-energy'){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='chooseEnergyRevealOutside'&&
   e.count===q.count&&Object.keys(e).length===2);
  if(!earned||q.sourceName!==printed.name||!q.sourceUid.startsWith(q.player+'-')||
   q.min!==0||q.max!==30||!Number.isInteger(q.count)||q.count<1||q.count>4||
   pl.deck.length<1||Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','count','min','max'].includes(k)))
   throw Error('Forged printed energy choice');
 }
 if(s.pending?.kind==='effect-top-filter-choice'&&s.pending.discard===false){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='chooseEnergyRevealOutside'&&
   Object.keys(e).length===2&&e.count>=q.uids?.length);
  const window=Array.isArray(q.uids)?pl.deck.slice(0,q.uids.length):[];
  const expected=window.filter(c=>matchesFilter(pack,s,c,q.filter)).map(c=>c.uid);
  const energy=q.filter?.field==='printedEnergy'&&Number.isInteger(q.filter.value)&&
   q.filter.value>=0&&q.filter.value<=30&&Object.keys(q.filter).length===2;
  if(!earned||!q.sourceUid.startsWith(q.player+'-')||q.rest!=='outside'||!energy||
   !Array.isArray(q.uids)||q.uids.length<1||q.uids.length>4||
   new Set(q.uids).size!==q.uids.length||!same(window.map(c=>c.uid),q.uids)||
   !Array.isArray(q.choices)||!same(q.choices,expected)||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','uids','choices','filter','rest','discard'].includes(k)))
   throw Error('Forged printed energy window');
 }
 if(s.pending?.kind==='effect-top-filter-choice'&&s.pending.noHandDiscard===true){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...pl.hand,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid),printed=source&&card(pack,source);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='searchTopOneBottomDiscard'&&
   e.count===3&&e.noHandDiscard===true&&e.filter?.field==='trait'&&
   e.filter?.value===q.filter?.value);
  const window=Array.isArray(q.uids)?pl.deck.slice(0,q.uids.length):[];
  const expected=window.filter(c=>matchesSearch(pack,s,c,q)).map(c=>c.uid);
  if(!earned||!q.sourceUid.startsWith(q.player+'-')||q.rest!==undefined||
   q.filter?.field!=='trait'||typeof q.filter.value!=='string'||!q.filter.value||
   Object.keys(q.filter).length!==2||!Array.isArray(q.uids)||q.uids.length<1||
   q.uids.length>3||new Set(q.uids).size!==q.uids.length||
   !same(window.map(c=>c.uid),q.uids)||!Array.isArray(q.choices)||
   !same(q.choices,expected)||Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','uids','choices','filter','noHandDiscard'].includes(k)))
   throw Error('Forged trait top window without discard');
 }
 if(s.pending?.kind==='effect-energy-trait-front'){
  const q=s.pending,pl=s.players[q.player];
  const source=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const earned=printed?.effects?.onPlay?.some(e=>e.op==='moveEnergyTraitToFront'&&
   e.trait===q.trait);
  const live=pl.energy.filter(c=>c&&card(pack,c).type==='character'&&
   !card(pack,c).frontForbidden&&cardHasTrait(card(pack,c),q.trait)).map(c=>c.uid);
  const waiting=Array.isArray(q.choices)?q.choices.filter(uid=>!q.selected?.includes(uid)):[];
  const moved=Array.isArray(q.selected)?q.selected.every(uid=>pl.front.some(c=>c?.uid===uid)):[];
  if(!earned||!q.sourceUid?.startsWith(q.player+'-')||q.optional!==true||!moved||
   typeof q.trait!=='string'||!q.trait||!Array.isArray(q.choices)||!q.choices.length||
   q.choices.length>4||new Set(q.choices).size!==q.choices.length||
   !Array.isArray(q.selected)||q.selected.length>=q.choices.length||
   new Set(q.selected).size!==q.selected.length||
   q.selected.some(uid=>!q.choices.includes(uid))||
   !same(waiting,live)||pl.front.every(Boolean)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','trait','choices','selected','optional'].includes(k)))
   throw Error('Invalid energy-line trait move');
 }
 if(s.pending?.kind==='effect-top-hand-outside'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.outside,...(pl.resolvingEvents||[])];
  const source=owned.find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const earned=printed?.effects?.onPlay?.some(e=>e.op==='lookTopHandOutsideBottom'&&
   e.count>=q.uids?.length);
  const window=Array.isArray(q.uids)?pl.deck.slice(0,q.uids.length):[];
  if(!earned||!q.sourceUid?.startsWith(q.player+'-')||
   !['hand','outside'].includes(q.step)||
   !Array.isArray(q.uids)||q.uids.length<1||q.uids.length>5||
   new Set(q.uids).size!==q.uids.length||!same(window.map(c=>c.uid),q.uids)||
   Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','uids','step'].includes(k)))
   throw Error('Invalid looked hand and outside window');
 }
 if(s.pending?.kind==='effect-top-filter-many-choice'){
  const q=s.pending,pl=s.players[q.player];
  const rest=q.uids?.filter(uid=>!q.selected?.includes(uid));
  const source=[...pl.outside,...field(pl)].find(c=>c.uid===q.sourceUid);
  const definition=source&&card(pack,source);
  const fromPlay=(definition?.effects?.onPlay||[])
   .flatMap(e=>e.op==='chooseOne'?e.options.flatMap(o=>o.then):
    e.op==='optionalRetireThenProgram'?e.after:[e]);
  const fromPay=definition?.mainAbility?.op==='oncePayProgram'?
   (definition.mainAbility.then||[]).flatMap(e=>e.op==='retireOwnTraitFollow'&&
    e.follow?.kind==='searchTop'?[{op:'searchTopUpToTwoBottom',count:e.follow.count,
     max:e.follow.max,rest:e.follow.rest,filters:e.follow.filters,logic:e.follow.logic}]:[]):[];
  const printed=[...fromPlay,...fromPay].some(e=>e.op==='searchTopUpToTwoBottom'&&
   e.max===q.max&&e.rest==='bottom'&&e.count>=q.uids?.length&&
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
 if(s.pending?.kind==='effect-bounce-own'&&Number.isInteger(s.pending.energy)&&
  Array.isArray(s.pending.then)){
  const q=s.pending,pl=s.players[q.player];
  const src=field(pl).find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const earned=printed?.effects?.onPlay?.find(e=>e.op==='bounceOwnOtherUnderEnergy'&&
   e.optional===true&&e.energy===q.energy&&Array.isArray(e.then)&&same(e.then,q.then));
  const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
   card(pack,c).energy<=q.energy).map(c=>c.uid);
  if(!earned||q.sourceName!==printed.name||!q.sourceUid.startsWith(q.player+'-')||
   q.optional!==true||!q.choices.length||!same(choices,q.choices)||
   Object.keys(q).length!==8||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','optional','energy','then'].includes(k)))
   throw Error('Forged optional energy bounce');
 }
 if(s.pending?.kind==='effect-bounce-own'&&s.pending.optional===true&&
  s.pending.excludeName!==undefined){
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
 if(s.pending?.kind==='effect-active-energy-named'){
  const q=s.pending,pl=s.players[q.player];
  const owned=[...field(pl),...pl.hand,...pl.outside,...pl.deck,...pl.life,
   ...pl.lifeRevealed,...(pl.removed||[]),...(pl.resolvingEvents||[])];
  const src=owned.find(c=>c.uid===q.sourceUid);
  const printed=src&&card(pack,src);
  const namesOk=Array.isArray(q.names)&&q.names.length===2&&new Set(q.names).size===2&&
   q.names.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80);
  const walk=x=>{
   if(!x||typeof x!=='object')return false;
   if(Array.isArray(x))return x.some(walk);
   if(x.op==='activeEnergyNamed'&&x.optional===true&&same(x.names,q.names))return true;
   return Object.values(x).some(walk);
  };
  const named=c=>q.names.some(n=>cardHasName(card(pack,c),n,originalEffectsDisabled(s,c)));
  const expected=pl.energy.filter(c=>c&&['character','field'].includes(card(pack,c).type)&&named(c)).map(c=>c.uid);
  const keys=['kind','player','sourceUid','sourceName','names','choices','optional'];
  if(!printed||q.sourceName!==printed.name||!walk(printed.effects)||
   !q.sourceUid.startsWith(q.player+'-')||!namesOk||!Array.isArray(q.choices)||
   !same(q.choices,expected)||q.optional!==true||
   Object.keys(q).length!==keys.length||Object.keys(q).some(k=>!keys.includes(k)))
   throw Error('Invalid energy-line named ACTIVE pending provenance');
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
   return d.type===q.type&&(q.color===null||d.color===q.color)&&d.ap===q.ap&&
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
 if(s.pending?.kind==='effect-mark-opp-start'){
  const q=s.pending,pos=location(s,q.player,q.sourceUid),printed=pos&&card(pack,pos.c);
  const step=printed?.mainAbility?.then?.[0],foe=1-q.player;
  const choices=pos?s.players[foe].front.filter(c=>c&&card(pack,c).type==='character'&&
   bp(pack,s,c)<=q.maxBp&&
   cardEffectTargetPayable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid):[];
  if(!pos||pos.line!=='front'||pos.c.fieldEntryStamp!==q.sourceStamp||
   printed.mainAbility?.op!=='oncePayProgram'||step?.op!=='markOppFrontRetireNextStart'||
   q.maxBp!==step.maxBp||q.optional!==true||!s.mainAbilityUsedUids.includes(q.sourceUid)||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceStamp','choices','maxBp','optional'].includes(k)))
   throw Error('Invalid next-start front mark');
 }
 if(typeof s.endRefreshed!=='boolean')throw Error('Invalid end refresh flag');
 if(!Number.isInteger(s.nextFieldEntryStamp)||s.nextFieldEntryStamp<1||
   !Array.isArray(s.delayedEffects)||s.delayedEffects.some(x=>{
    const retire=x?.op==='retireAtMainEnd'&&x.destination===undefined;
    const hand=x?.op==='moveAtMainEnd'&&x.destination==='hand';
    const mark=x?.op==='oppStartRetireRestMove';
    const keys=x&&typeof x==='object'?Object.keys(x):[];
    if(mark)return !playerIndex(x.owner)||!playerIndex(x.duePlayer)||
     x.duePlayer!==1-x.owner||typeof x.sourceUid!=='string'||
     !x.sourceUid.startsWith(x.owner+'-')||typeof x.targetUid!=='string'||
     !x.targetUid.startsWith(x.duePlayer+'-')||
     !Number.isInteger(x.sourceStamp)||x.sourceStamp<1||
     !Number.isInteger(x.dueTurn)||x.dueTurn<1||keys.length!==7||
     keys.some(k=>!['op','owner','sourceUid','sourceStamp','targetUid','dueTurn','duePlayer'].includes(k));
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
 if(s.pending?.kind==='effect-printed-lock'){
  const q=s.pending,foe=1-q.player,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const step=printed?.effects?.onPlay?.find(e=>e.op==='grantPrintedLock'&&
   e.optional===true&&e.until==='nextOwnTurnStart'&&Object.keys(e).length===3);
  const live=s.players[foe].front.filter(c=>c&&card(pack,c).type==='character')
   .map(c=>({uid:c.uid,stamp:c.fieldEntryStamp}));
  if(!step||q.optional!==true||q.sourceName!==printed.name||
   !q.sourceUid.startsWith(q.player+'-')||
   !Array.isArray(q.choices)||!q.choices.length||q.choices.length>4||
   !same(q.choices,live)||
   Object.keys(q).length!==6||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','choices','optional'].includes(k)))
   throw Error('Invalid printed lock');
 }
 if(s.pending?.kind==='effect-name-hand-remove'){
  const q=s.pending,pl=s.players[q.player];
  const source=pl.outside.find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const step=printed?.effects?.onPlay?.find(e=>e.op==='drawRemoveIfName'&&
   e.name===q.name&&e.draw===2&&Array.isArray(e.zones)&&e.zones.length===2&&
   e.zones[0]==='field'&&e.zones[1]==='removed'&&Object.keys(e).length===4);
  const named=c=>cardHasName(card(pack,c),q.name,originalEffectsDisabled(s,c));
  const present=field(pl).some(named)||(pl.removed||[]).some(named);
  const choices=pl.hand.map(c=>c.uid);
  if(!step||!present||q.draw!==2||q.sourceName!==printed.name||
   !q.sourceUid.startsWith(q.player+'-')||!choices.length||!same(q.choices,choices)||
   Object.keys(q).length!==7||
   Object.keys(q).some(k=>!['kind','player','sourceUid','sourceName','name','draw','choices'].includes(k)))
   throw Error('Invalid named hand removal');
 }
 if(s.pending?.kind==='effect-required-energy'){
  const q=s.pending,pl=s.players[q.player];
  const live=field(pl).filter(c=>c.uid!==q.sourceUid&&card(pack,c).type==='character')
   .map(c=>c.uid);
  const owned=[...field(pl),...pl.hand,...pl.deck,...pl.life,...pl.outside,...(pl.removed||[])];
  const source=owned.find(c=>c.uid===q.sourceUid);
  const printed=source&&card(pack,source);
  const step=printed?.mainAbility?.op==='oncePayProgram'&&
   (printed.mainAbility.then||[]).some(e=>e.op==='grantOtherRequiredEnergyThisTurn'&&
    e.amount===2);
  if(!step||q.amount!==2||!q.sourceUid?.startsWith(q.player+'-')||
   !Array.isArray(q.choices)||!q.choices.length||!same(q.choices,live)||
   Object.keys(q).length!==5||
   Object.keys(q).some(k=>!['kind','player','sourceUid','choices','amount'].includes(k)))
   throw Error('Invalid required-energy pending');
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
   !['grantedAttackDraw','grantOnAttack','grantSelfSniperThisTurn','grantSelfAttackWinDrawThisTurn','grantSelfMustBlockThisTurn','buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn','resolveAttackWinRecovery','draw','optionalDrawOne','drawIfOwnName','drawIfOwnOutsideNamedCountAtLeast','drawIfOwnFieldExists','drawIfOwnEnergyAtLeast','drawIfOppFrontBelowPrinted','drawIfSelfBpAtLeast','returnRetiredToHand','drawIfOppRestCharacter','drawIfOppCharacterBpAtLeast','drawIfOwnNameAndHandFewer','activeOwnNamed','activeEnergyNamed','millTop','buffSelf','buffSelfPerOwnOutsideGroups','enemyBpDown','drawDiscard','frontOppTriggerDrawDiscard','recoverAp','peekTopOne','peekTopOrBottom','revealOppTopPlace','chooseEnergyRevealOutside','optionalRemoveHandThen','removeHandTraitScaleRetire','nameEnergyRevealHandRemove','removeHandTraitCapScale','retireOppFrontUnderBp','retireOppFrontOneUnderBp','retireOppFrontRest','bounceOppFrontOneUnderBp','conditionalBounceOrRetireByOwnOutsideNames','completeResolvingEvent','stripOppRaidTop','restOppFrontUnderBp','restOppFrontOne','oppFrontRestBranch','forbidAttackOppFrontOne','grantPrintedLock','grantOtherRequiredEnergyThisTurn','drawRemoveIfName','retireOppFrontIfFacedown','buffOwnTrait','drawIfRaidUnderFacedown','searchDeckOne','searchDeckMany','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside','searchTopOneBottomDiscard','lookTopHandOutsideBottom','grantNamedFieldProtection','activeApIfNameEntered','searchTopUpToTwoBottom','deployOwnHandRest','deployOwnHandSpecial','deployOwnHandRestOrRaid','optionalPayApThen','optionalRetireThenProgram','recoverOutsideOne','recoverOutsidePrintedBp','discardToDraw',
    'discardGate','removeOutsideThen','enemyFrontAllBpDown','retireOppFrontAllUnderBp',
    'nextEligibleHandPlayApDiscount','grantFrontEnergyOwnOtherFrontTrait','buffOwnTraitAllTurn','buffSelfIfFirstAttack','bounceOwnOtherUnderEnergy',
    'recoverOutsideUnderEnergy','recoverOutsideColorUnderEnergy','deployOutsideRest','deployOutsideNameRest','deployOutsideExactRest','deployOutsideTraitApRest','deployOutsideColorApNameOrTraitRest','deployNamedFromZones','payApDeployNamedRest','inspectTopTraitOutside','deployOutsideTraitlessRestOrRaid','buffOwnField','oncePerTurnGate','buffNamedImpact','buffNameOrTraitImpact','restActiveNamedReadyAp','openNamedKeywordGrant','readyNameOrTrait','protectNameOrTrait','sacrificeNamedChain','retireOppFrontBySacrificedEnergy','retireBatchOne','retireAtMainEnd','retireSourceOnPhaseEnd','moveAtMainEnd','markOppFrontRetireNextStart','oppStartRetireRestMove','restMoveSourceToEnergy','retireOwnFieldOne','retireOwnCharacterOne','retireOwnMissingTraitThen','deployOutsideColorTraitActive','retireOwnTraitFollow','resolveTraitRetireFollow','openActivePair','openFieldActiveBuff','openBlock','resolveSniperBattle','resolveFirstAttackKit','grantFirstAttackKit','resolveEntrySacrifice','openNamedDoubleAttack','replayOnPlay','swapOrBuff','skipNextActiveOppRest','restOrRetireOppFrontByLife','restSilenceOppFrontIfOwnOutsideField','resolveAttackEndSwap','resolveEnergyLineAttackEndSwap','retireAttackEndGranted','phaseOrder','effectMoveOrder','restSelfTuckMovedFaceDown','sourceResolutionBoundary','lifeBatchStep','lifeRelease','advanceAfterAttack','additionalBattleDamage','openRetirementBatch','closeRetirementBatch','retirementOrder','battleImpactDamage','discardOppHand','discardOppHandIfFewer','activeSelfIf','activeChosen','openEnergyMoveGrants','moveOtherAcrossOrRemove','moveEnergyTraitToFront','raidBaseEnergyThen','grantSelfAttackDamageThisTurn','restOppFrontLockActive','restOppFrontApLock','removeAnyOutsideScale','inspectTopColoredNamesOutside','drawDiscardIfEffectApPaid','activeSelf','grantSelfImpactThisTurn','grantOtherImpactThisTurn','returnSourceToHand','optionalOwnLifeToHandThenDraw','grantOwnNameBlockAtLeast','grantSelfBlockAtLeast','inspectTopColorAnyOutside','buffOwnNameIfPrintedEnergy'].includes(e.op)))
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
   source.fieldEntryStamp!==j.sourceStamp||target.fieldEntryStamp!==j.targetStamp||
   !(s.attacksByUid[j.sourceUid]>=1)||Object.keys(j).length!==6||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp','targetUid','targetStamp'].includes(k)))
   throw Error('Forged queued sniper battle');
 }
 for(const j of s.effectQueue.filter(e=>e.op==='openNamedDoubleAttack')){
  const pl=s.players[j.owner];
  const src=[...pl.outside,...(pl.removed||[]),...field(pl)].find(c=>c.uid===j.sourceUid);
  const printed=src&&card(pack,src);
  const retired=(s.turnRetireEvents||[]).some(e=>e.turn===s.turn&&e.controller===j.owner&&
   e.uid===j.sourceUid&&e.cardType==='character');
  if(j.owner!==s.active||s.phase!=='main'||!printed||
   printed.mainAbility?.op!=='nameOnceRestRetireDouble'||
   printed.mainAbility.trait!==j.trait||printed.name!==j.sourceName||!retired||
   Object.keys(j).length!==5||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceName','trait'].includes(k)))
   throw Error('Forged named double-attack window');
 }
 for(const j of s.effectQueue.filter(e=>e.op==='replayOnPlay')){
  const pl=s.players[j.owner];
  const src=field(pl).find(c=>c.uid===j.sourceUid);
  const printed=src&&card(pack,src);
  if(j.owner!==s.active||s.phase!=='main'||!src||src.ready!==false||
   printed?.mainAbility?.op!=='fieldRestSacrificeReplay'||printed.name!==j.sourceName||
   Object.keys(j).length!==4||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceName'].includes(k)))
   throw Error('Forged field on-play replay');
 }
 for(const j of s.effectQueue.filter(e=>e.op==='swapOrBuff')){
  const pl=s.players[j.owner];
  const src=field(pl).find(c=>c.uid===j.sourceUid);
  const printed=src&&card(pack,src);
  const gate=printed?.mainAbility?.op==='oncePayProgram'&&
   printed.mainAbility.then?.find(x=>x.op==='discardGate'&&x.optional===false);
  const step=gate&&gate.then?.find(x=>x.op==='swapOrBuff'&&
   x.bp===j.bp&&x.allName===j.allName);
  if(j.owner!==s.active||s.phase!=='main'||!src||!step||
   Object.keys(j).length!==5||
   Object.keys(j).some(k=>!['op','owner','sourceUid','bp','allName'].includes(k)))
   throw Error('Forged swap or buff');
 }
 for(const j of s.effectQueue.filter(e=>e.op==='resolveEntrySacrifice')){
  const pl=s.players[j.owner];
  const src=field(pl).find(c=>c.uid===j.sourceUid);
  const printed=src&&card(pack,src);
  const ability=printed?.mainAbility;
  if(j.owner!==s.active||s.phase!=='main'||!src||src.entryTurn!==s.turn||
   ability?.op!=='entryTurnSacrificeChoice'||printed.name!==j.sourceName||
   printed.color!==j.color||ability.energy!==j.energy||ability.color!==j.color||
   ability.minBp!==j.minBp||ability.down!==j.down||
   Object.keys(j).length!==8||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceName','energy','color','minBp','down'].includes(k)))
   throw Error('Forged entry-turn sacrifice reward');
 }
 for(const j of s.effectQueue.filter(e=>e.op==='resolveFirstAttackKit')){
  const source=s.players[j.owner]?.front.find(c=>c?.uid===j.sourceUid);
  const target=s.players[1-j.owner]?.front.find(c=>c?.uid===j.targetUid);
  const kit=source&&liveFirstAttackKit(s,source);
  if(j.owner!==s.active||s.phase!=='attack'||!source||!target||!kit||
   kit.armed!==true||source.fieldEntryStamp!==j.sourceStamp||
   target.fieldEntryStamp!==j.targetStamp||s.attacksByUid[j.sourceUid]!==1||
   Object.keys(j).length!==6||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp','targetUid','targetStamp'].includes(k)))
   throw Error('Forged queued first-attack kit battle');
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
 for(const j of s.effectQueue.filter(e=>e.op==='resolveEnergyLineAttackEndSwap')){
  const src=s.players[j.owner]?.energy.find(c=>c?.uid===j.sourceUid);
  if(j.owner!==s.active||s.phase!=='attack'||!src||
   src.fieldEntryStamp!==j.sourceStamp||
   !card(pack,src).energyLineAttackEndSwap||
   src.energyLineAttackEndSwapUsedTurn===s.turn||
   !(s.attacksByUid[j.attackerUid]>=1)||
   !Number.isInteger(j.sourceStamp)||j.sourceStamp<1||
   typeof j.attackerUid!=='string'||
   Object.keys(j).length!==5||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp','attackerUid'].includes(k)))
   throw Error('Forged energy-line attack-end swap');
 }
 for(const j of s.effectQueue.filter(e=>e.op==='retireAttackEndGranted')){
  const pl=s.players[j.owner];
  const src=pl?.front.find(c=>c?.uid===j.sourceUid);
  const grant=src?.attackEndRetireGranted;
  const giver=src&&field(pl).find(c=>c.uid===j.grantSourceUid);
  const earned=giver&&card(pack,giver).effects.onPlay?.some(e=>e.op==='chooseOne'&&
   e.options?.some(o=>o.then?.some(t=>t.op==='buffOwnField'&&t.attackEndRetire===true)));
  if(j.owner!==s.active||s.phase!=='attack'||!src||!grant||!earned||
   grant.turn!==s.turn||grant.stamp!==j.sourceStamp||grant.sourceUid!==j.grantSourceUid||
   src.fieldEntryStamp!==j.sourceStamp||!(s.attacksByUid[j.sourceUid]>=1)||
   Object.keys(j).length!==5||
   Object.keys(j).some(k=>!['op','owner','sourceUid','sourceStamp','grantSourceUid'].includes(k)))
   throw Error('Forged attack-end retire continuation');
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
   if(c.attackDamagePlus!==undefined){
    const g=c.attackDamagePlus,live=field(pl).find(x=>x===c);
    const giver=pl.outside.find(x=>x.uid===g?.sourceUid)||
     pl.removed.find(x=>x.uid===g?.sourceUid);
    if(!live||g?.amount!==1||g.turn!==s.turn||g.stamp!==c.fieldEntryStamp||
     !giver||card(pack,giver).mainAbility?.op!=='restRetireNamedGrant'||
     Object.keys(g).length!==4||
     Object.keys(g).some(k=>!['turn','stamp','amount','sourceUid'].includes(k)))
     throw Error('Invalid earned attack damage plus');
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
  if(pl.energy.some(c=>c&&card(pack,c).energyForbidden===true))
   throw Error('Energy line cannot contain an energy-forbidden character');
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
 if(q?.kind==='effect-life-to-hand'&&q.player===viewer)return {
  kind:q.kind,player:viewer,
  options:legalPending(pack,s).map(action=>({action:{...action},card:null}))
 };
 if((q?.kind==='private-top-place'||q?.kind==='private-top-choice'||q?.kind==='effect-top-trait-hand')&&q.player===viewer){
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
  !['effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-order','effect-top-hand-outside','effect-top-trait-outside','effect-recover-outside','effect-outside-rest','effect-outside-name-rest','effect-outside-exact-rest','effect-outside-trait-ap-rest','effect-outside-color-ap-rest','effect-outside-active-pair','effect-outside-color-trait-active','effect-outside-traitless-rest','effect-named-zone-entry','effect-hand-rest','effect-hand-rest-or-raid','effect-active-own-named','effect-active-energy-named','effect-grant-block-at-least','effect-bounce-own','effect-remove-hand','effect-remove-hand-scale','effect-remove-hand-cap','effect-mandatory-hand-remove','effect-name-hand-remove','effect-discard-cost','effect-discard-gate','effect-selection-hand-payment','effect-hand-bottom','effect-outside-hand-or-rest','effect-recover-under'].includes(q.kind))
  return null;
 const zone=['effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-filter-many-choice','effect-top-order','effect-top-hand-outside','effect-top-trait-outside'].includes(q.kind)?'deck':
  q.kind==='effect-recover-outside'||q.kind==='effect-outside-rest'||q.kind==='effect-outside-name-rest'||q.kind==='effect-outside-exact-rest'||q.kind==='effect-outside-trait-ap-rest'||q.kind==='effect-outside-color-ap-rest'||q.kind==='effect-outside-active-pair'||q.kind==='effect-outside-color-trait-active'||q.kind==='effect-outside-traitless-rest'||q.kind==='effect-outside-hand-or-rest'||q.kind==='effect-recover-under'?'outside':
  q.kind==='effect-bounce-own'||q.kind==='effect-active-own-named'||q.kind==='effect-active-energy-named'||q.kind==='effect-grant-block-at-least'?'field':'hand';
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
