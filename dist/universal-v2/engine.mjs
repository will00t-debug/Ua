// UNIVERSAL RULES V2 EXPERIMENT. No production title uses this reducer yet.
// Pure physical-card reducer: common UA zones/AP/phases/limited effects/Raid
// and official Q99 optional GET/DRAW/FINAL. Unsupported keywords FAIL CLOSED.
import {validateUniversalDeck} from './pack.mjs';
import {matchesOwnDistinctTraits,matchesV2LiveCondition,retiredThisTurn} from './field-conditions.mjs';
import {refreshFieldActive,expireContinuousStates,pruneContinuousStates,
 fieldRestrictions,validateContinuousStates,grantContinuousState,
 attemptFieldActive,originalEffectsDisabled} from './continuous-states.mjs';
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
 return card(pack,physical).enterActiveIfOpponentRest===true&&
  field(s.players[1-owner]).some(c=>card(pack,c).type==='character'&&!c.ready);
}
const random=s=>{let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;};
function shuffle(s,list){
 for(let i=list.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[list[i],list[j]]=[list[j],list[i]];}
 return list;
}
const clone=source=>structuredClone(source);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function actor(s){return s.pending?.player??s.active;}
export const universalActor=actor;
function draw(s,p,count=1){
 for(let i=0;i<count&&s.players[p].deck.length;i++)s.players[p].hand.push(s.players[p].deck.shift());
}
// Each card requires its OWN printed energy color. A mixed-color deck may be
// legal, but three green icons do not pay a purple energy-3 requirement.
function hasFacedownUnder(c){
 const inspect=x=>(x.under||[]).some(v=>v.faceDown===true||inspect(v))||
  (x.stack||[]).some(v=>v.faceDown===true||inspect(v));
 return !!c&&inspect(c);
}
function raidNamePresent(pack,s,owner,name){
 const inspect=c=>card(pack,c).name===name||(c.stack||[]).some(inspect);
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
 if(!inEnergy&&(!d.frontGeneratesEnergy||suppressed))return 0;
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
  ...s.players[p].front.filter(c=>c&&card(pack,c).frontGeneratesEnergy&&!originalEffectsDisabled(s,c))];
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
function bp(pack,s,c){
 const printed=card(pack,c),suppressed=originalEffectsDisabled(s,c);
 const owner=Number(String(c.uid).split('-')[0]);
 return (printed?.bp||0)+(suppressed?0:s.active===owner?(printed.ownTurnBp||0):(printed.opponentTurnBp||0))+
  (suppressed?[]:printed.passiveBonuses).reduce((n,p)=>n+(p.bp&&
   matchesV2LiveCondition(s,owner,c.uid,p.condition,x=>card(pack,x),
    ()=>calcEnergy(pack,s,owner))?p.bp:0),0)+
  (!suppressed&&hasFacedownUnder(c)?(printed.conditionalUnderFaceDown?.bp||0):0)+
  (c.buffs||[]).filter(b=>b.untilTurn===s.turn).reduce((n,b)=>n+b.bp,0);
}
export const universalBp=bp;
function impactOnBattleWin(pack,s,c){
 const d=card(pack,c);
 return !originalEffectsDisabled(s,c)&&hasFacedownUnder(c)?(d.conditionalUnderFaceDown?.impact||0):0;
}
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
function matchesFilter(pack,physical,filter){
 const printed=card(pack,physical);
 if(filter.field==='trait')return printed.traits.some(v=>v.split(/[／/]/).map(x=>x.trim()).includes(filter.value));
 return printed[filter.field]===filter.value;
}
function filteredChoices(pack,cards,filter){
 return cards.filter(c=>matchesFilter(pack,c,filter)).map(c=>c.uid);
}
function matchesSearch(pack,physical,query){
 if(!query.filters)return matchesFilter(pack,physical,query.filter);
 const result=query.filters.map(f=>matchesFilter(pack,physical,f));
 return query.logic==='all'?result.every(Boolean):result.some(Boolean);
}
function searchChoices(pack,cards,query){
 return cards.filter(c=>matchesSearch(pack,c,query)).map(c=>c.uid);
}
function matchesOutsideRecovery(pack,c,q){
 if(q.filter)return matchesFilter(pack,c,q.filter);
 const d=card(pack,c);
 if(q.printedBpLimit!==undefined)
  return d.type==='character'&&d.bp<=q.printedBpLimit;
 if(q.traitlessEnergyLimit!==undefined)
  return d.type==='character'&&d.traits.length===0&&d.energy<=q.traitlessEnergyLimit;
 return d.color===q.color&&d.energy<=q.energy;
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
    jobs:q.then.map(op=>({...op,owner,sourceUid:c.uid,sourceName:card(pack,c).name}))});
  }
  if(entries.length)s.effectQueue.push({op:'phaseOrder',owner,entries});
 }
}
function startTurn(pack,s){
 const p=s.active,pl=s.players[p];
 pl.ownTurns++;s.turn++;s.phase='start';s.extraDrawn=false;s.moved=false;s.movedUids=[];s.pending=null;s.attacksThisTurn=0;
 s.endRefreshed=false;
 expireContinuousStates(s,{player:p,phase:'start',edge:'start'});
 s.raidedThisTurn=[false,false];s.mainAbilityUsedUids=[];s.mainReadyOnceByName=[[],[]];
 s.onceEffectUses=[[],[]];
 // A NEW turn resets both players' previous turn-scoped movement history.
 s.turnEffectZoneMoves=[{handToOutside:false,outsideToHand:false},
  {handToOutside:false,outsideToHand:false}];
 s.turnRetireEvents=[]; // Turn boundary clears history for both controllers.
 const max=pl.ownTurns>=3?3:(pl.ownTurns===1&&p===s.first?1:2);
 for(let i=0;i<pl.apCards.length;i++){pl.apCards[i].inPlay=i<max;pl.apCards[i].ready=i<max;}
 refreshFieldActive(s,p);
 for(const c of field(pl))c.buffs=(c.buffs||[]).filter(b=>b.untilTurn>=s.turn);
 if(!(pl.ownTurns===1&&p===s.first)){
  if(!pl.deck.length){s.status='finished';s.winner=1-p;s.endReason='required-draw-empty';return;}
  draw(s,p);
 }
 queuePhaseBoundary(pack,s,'start','start',p);
 continueEffectQueue(pack,s);
}
// Queue printed effects so each pending cross-title target is chosen before
// remaining steps resolve. Native card packs remain responsible for their own text.
function continueEffectQueue(pack,s){
 while(!s.pending&&s.status==='playing'&&s.effectQueue.length){
  const job=s.effectQueue.shift(),owner=job.owner,pl=s.players[owner];
  if(job.op==='phaseOrder'){
   if(job.entries.length===1)s.effectQueue.unshift(...job.entries[0].jobs);
   else if(job.entries.length>1)s.pending={kind:'phase-order',player:owner,entries:job.entries};
  }else if(job.op==='advanceAfterAttack')advanceAfterEnd(pack,s,owner);
  else if(job.op==='chooseOne'){
   // Select before executing any branch; zero-target optional modes remain selectable.
   const available=job.options.filter(o=>(
    o.turn==='any'||o.turn==='own'&&s.active===owner||
    o.turn==='opponent'&&s.active!==owner
   )&&o.then.every(child=>{
    if(child.op==='buffOwnField'&&!child.optional)
     return field(pl).some(c=>card(pack,c).type==='character'&&
      (!child.excludeSelf||c.uid!==job.sourceUid)&&matchesFilter(pack,c,child.filter));
    if(child.op==='recoverOutsideOne'&&!child.optional)
     return pl.outside.some(c=>matchesFilter(pack,c,child.filter));
    if(child.op==='recoverOutsideTraitlessUnderEnergy'&&!child.optional)
     return pl.outside.some(c=>matchesOutsideRecovery(pack,c,
      {traitlessEnergyLimit:child.energy}));
    return true;
   }));
   if(available.length||job.optional)
    s.pending={kind:'effect-choice-mode',player:owner,sourceUid:job.sourceUid,
     sourceName:job.sourceName,options:available,optional:job.optional};
   else throw Error('No legally selectable mandatory printed mode');
  }
  else if(job.op==='draw')draw(s,owner,job.count);
  else if(job.op==='drawIfOwnEnergyAtLeast'){
   // Printed generated-energy threshold is checked at resolution, after the
   // source actually enters the field, including own explicit FRONT producers.
   if(calcEnergy(pack,s,owner)>=job.energy)draw(s,owner,job.count);
  }
  else if(job.op==='drawIfOwnFieldExists'){
   // FIELD condition is evaluated at resolution of a genuinely queued onRetire.
   // Do not count outside/removal/hand or Raid undercards.
   if(field(pl).some(c=>card(pack,c).type==='field'))draw(s,owner,job.count);
  }
  else if(job.op==='drawIfOwnName'){
   // Evaluate after the character actually entered OWN front/energy field.
   // Never count hand, deck, opponent field, or hidden Raid under-cards.
   if(field(pl).some(c=>card(pack,c).name===job.name))
    draw(s,owner,job.count);
  }
  else if(job.op==='millTop'){
   for(let i=0;i<job.count&&pl.deck.length;i++)pl.outside.push(pl.deck.shift());
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
   const matches=filteredChoices(pack,pl.deck,job.filter);
   if(matches.length)s.pending={kind:'effect-search-deck',player:owner,
    sourceUid:job.sourceUid,filter:job.filter,choices:matches,optional:job.optional};
   else shuffle(s,pl.deck); // mandatory shuffle even when nothing matches
  }else if(job.op==='searchDeckMany'){
   const choices=filteredChoices(pack,pl.deck,job.filter);
   if(choices.length)s.pending={kind:'effect-search-deck-multi',player:owner,
    sourceUid:job.sourceUid,filter:job.filter,choices,
    remaining:job.count,optional:job.optional};
   else shuffle(s,pl.deck);
  }else if(job.op==='searchDeckWhere'){
   const choices=searchChoices(pack,pl.deck,job);
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
     const choices=searchChoices(pack,inspected,job);
     const predicate=job.filters?{filters:job.filters.map(f=>({...f})),logic:job.logic}:
      {filter:{...job.filter}};
     // With no valid match, ALL inspected cards must still be ordered below.
     s.pending=choices.length?{kind:'effect-top-filter-choice',player:owner,
      sourceUid:job.sourceUid,uids,choices,...predicate}:
      {kind:'effect-top-order',player:owner,sourceUid:job.sourceUid,
       uids,order:[],rest:'bottom'};
    }
   }else if(job.op==='recoverOutsideOne'){
   const matches=filteredChoices(pack,pl.outside,job.filter);
   if(matches.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,filter:job.filter,choices:matches,optional:job.optional};
  }else if(job.op==='recoverOutsidePrintedBp'){
   const choices=pl.outside.filter(c=>matchesOutsideRecovery(pack,c,
    {printedBpLimit:job.bp})).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-recover-outside',player:owner,
    sourceUid:job.sourceUid,printedBpLimit:job.bp,
    choices,optional:job.optional};
  }else if(job.op==='recoverOutsideTraitlessUnderEnergy'){
   const choices=pl.outside.filter(c=>matchesOutsideRecovery(pack,c,
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
   if(pl.hand.length)s.pending={kind:'effect-discard-gate',player:owner,
    sourceUid:job.sourceUid,optional:job.optional,then:job.then};
  }else if(job.op==='recoverOutsideColorUnderEnergy'){
   const choices=pl.outside.filter(c=>matchesOutsideRecovery(pack,c,job)).map(c=>c.uid);
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
    card(pack,c).type==='character'&&card(pack,c).energy<=job.energy).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-bounce-own',player:owner,
    sourceUid:job.sourceUid,choices,energy:job.energy};
   else bounceToHand(s,owner,job.sourceUid);
  }else if(job.op==='drawDiscard'){
   draw(s,owner,job.count);
   if(pl.hand.length)s.pending={kind:'effect-discard',player:owner,sourceUid:job.sourceUid,
     ...(job.discardCount>1?{remaining:Math.min(job.discardCount,pl.hand.length)}:{})};
  }else if(job.op==='retireOppFrontUnderBp'){
   const ownName=job.bonusName.replace(/\s+/g,'');
   const hasBonus=field(pl).some(c=>card(pack,c).name.replace(/\s+/g,'')===ownName);
   const limit=hasBonus?job.bonusBp:job.bp;
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=limit).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,sourceUid:job.sourceUid,choices,limit};
  }else if(job.op==='retireOppFrontIfFacedown'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   if(source&&hasFacedownUnder(source)){
    const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,
     sourceUid:job.sourceUid,choices,limit:job.bp,optional:true};
   }
  }else if(job.op==='restOrRetireOppFrontByLife'){
   // One target set and one choice. The controller's LIFE determines the
   // branch when the effect is actually resolved, not from the original hand.
   const targets=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp);
   if(targets.length){
    const retireNow=pl.life.length<=job.lifeAtMost;
    s.pending={kind:retireNow?'effect-retire-bp':'effect-rest-bp',
     player:owner,sourceUid:job.sourceUid,limit:job.bp,
     choices:targets.map(c=>c.uid),optional:job.optional,
     ...(!retireNow?{skipNextActive:true}:{})};
   }
  }else if(job.op==='restSilenceOppFrontIfOwnOutsideField'){
   if(pl.outside.some(c=>card(pack,c).type==='field')){
    const choices=s.players[1-owner].front.filter(Boolean).map(c=>c.uid);
    if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
     sourceUid:job.sourceUid,choices,limit:null,optional:true,
     silenceUntil:{player:1-owner,phase:'attack',edge:'end'}};
   }
  }else if(job.op==='skipNextActiveOppRest'){
   const choices=field(s.players[1-owner]).filter(c=>!c.ready).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:null,optional:job.optional,
    skipNextActive:true,onlyRest:true,anyLine:true,restTarget:false};
  }else if(job.op==='restOppFrontOne'){
   const choices=s.players[1-owner].front.filter(Boolean).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:null,optional:job.optional,
    skipNextActive:job.skipNextActive===true};
  }else if(job.op==='restOppFrontUnderBp'){
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=job.bp).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-rest-bp',player:owner,
    sourceUid:job.sourceUid,choices,limit:job.bp,optional:job.optional,
    skipNextActive:job.skipNextActive===true};
  }else if(job.op==='buffOwnField'){
   const choices=field(pl).filter(c=>card(pack,c).type==='character'&&
    (!job.excludeSelf||c.uid!==job.sourceUid)&&
    matchesFilter(pack,c,job.filter)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-buff-own',player:owner,
    sourceUid:job.sourceUid,choices,filter:job.filter,
    bp:job.bp,optional:job.optional,excludeSelf:job.excludeSelf};
  }else if(job.op==='buffOwnTrait'){
   const choices=field(pl).filter(c=>card(pack,c).traits.includes(job.trait)).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-buff-trait',player:owner,sourceUid:job.sourceUid,
    choices,trait:job.trait,bp:job.bp};
  }else if(job.op==='enemyFrontAllBpDown'){
   const foe=1-owner,targets=s.players[foe].front.filter(Boolean);
   // All modifiers land in the SAME effect step, before any of the
   // simultaneous state-based 0-BP retirements or replacement choices.
   for(const c of targets){
    c.buffs??=[];c.buffs.push({bp:-job.bp,untilTurn:s.turn});
   }
   const lethal=targets.filter(c=>bp(pack,s,c)<=0);
   // Internal jobs retain the original snapshot of physical UIDs; they do
   // NOT pick a fresh target between protected leave decisions.
   s.effectQueue.unshift(...lethal.map(c=>({
    op:'retireBatchOne',owner,targetPlayer:foe,uid:c.uid
   })));
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
   s.effectQueue.unshift(...targets.map(c=>({
    op:'retireBatchOne',owner,targetPlayer:foe,uid:c.uid,mode:'threshold'
   })));
  }else if(job.op==='retireAtMainEnd'){
    // Only this physical field incarnation may satisfy a delayed retirement.
    const pos=location(s,owner,job.sourceUid);
    if(pos&&pos.c.fieldEntryStamp===job.fieldEntryStamp)
     retire(pack,s,owner,pos.line,pos.slot);
   }else if(job.op==='retireBatchOne'){
   // Internal state-based consequence, never a user-authored card DSL op.
   const slot=s.players[job.targetPlayer].front.findIndex(c=>c?.uid===job.uid);
   if(slot>=0&&(job.mode==='threshold'||
    bp(pack,s,s.players[job.targetPlayer].front[slot])<=0))
    retire(pack,s,job.targetPlayer,'front',slot);
  }else if(job.op==='buffOwnTraitAllTurn'){
   // A snapshot of current qualifying field units. Later entrants do not
   // inherit this temporary, printed action effect.
   for(const c of field(pl))if(card(pack,c).traits.includes(job.trait)){
    c.buffs??=[];c.buffs.push({bp:job.bp,untilTurn:s.turn});
   }
  }else if(job.op==='drawIfRaidUnderFacedown'){
   const raid=field(pl).find(c=>c.uid===job.raidUid);
   if(!raid)throw Error('Raid-base follow-up missing the Raid target');
   const under=c=>(c.under||[]).some(x=>x.faceDown===true||under(x))||
    (c.stack||[]).some(x=>x.faceDown===true||under(x));
   if(under(raid))draw(s,owner,1);
  }else if(job.op==='openBlock'){
   // Internal attack-window continuation, never a user-authored card DSL op.
   // Blocking begins only AFTER all attack-time choices and queued effects.
   const attacking=pl.front.find(c=>c?.uid===job.sourceUid);
   if(!attacking)throw Error('Attack source left the front line before blocking');
   s.pending={kind:'block',player:1-owner,attackerUid:job.sourceUid};
  }else if(job.op==='enemyBpDown'){
   const targetUids=s.players[1-owner].front.filter(Boolean).map(c=>c.uid);
   if(targetUids.length)s.pending={kind:'effect-target',player:owner,sourceUid:job.sourceUid,
    bp:job.bp,optional:job.optional===true,choices:targetUids};
  }else throw Error('Unimplemented effect op');
 }
}
function programJobs(pack,s,physical,timing,owner,raidUid){
 // Q2220: printed leave triggers are lost before true retirement.
 return (originalEffectsDisabled(s,physical)?[]:card(pack,physical).effects[timing]||[])
  .map(e=>({...e,owner,sourceUid:physical.uid,
   sourceName:card(pack,physical).name,...(raidUid?{raidUid}:{})}));
}
function applyEffects(pack,s,cardOnField,timing,owner){
 s.effectQueue.push(...programJobs(pack,s,cardOnField,timing,owner));
 continueEffectQueue(pack,s);
}
function validRaidBase(pack,s,owner,base,top){
 if(!base||!top.raidName||
  !top.raidRequiresNames.every(n=>raidNamePresent(pack,s,owner,n)))return false;
 const b=card(pack,base),names=top.raidBaseNames;
 if(base.stack?.length){
  const bottom=base.stack[0];
  return top.raidFromRaid.includes(b.name)&&names.includes(card(pack,bottom).name)&&
   !card(pack,bottom).raidName;
 }
 return names.includes(b.name)&&!b.raidName;
}
function performRaid(pack,s,p,cardOnTop,baseUid,line,slot,replaceUid){
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
 commitDestination(s,p,line,slot,replaceUid,base);
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
 cardOnTop.stack=[effectiveBase];cardOnTop.ready=true;
 cardOnTop.fieldEntryStamp=s.nextFieldEntryStamp++;
 pl[line][slot]=cardOnTop;
 s.raidedThisTurn[p]=true;
 const baseJobs=s.active===p&&!baseOriginalSilenced?programJobs(pack,s,effectiveBase,'onRaided',p,cardOnTop.uid):[];
 const entryJobs=programJobs(pack,s,cardOnTop,'onPlay',p);
 const raidJobs=programJobs(pack,s,cardOnTop,'onRaid',p);
 if(baseJobs.length&&entryJobs.length)
  s.pending={kind:'raid-effect-order',player:p,baseUid:effectiveBase.uid,
   raidUid:cardOnTop.uid,baseJobs,entryJobs,raidJobs};
 else{
  s.effectQueue.unshift(...baseJobs,...entryJobs,...raidJobs);
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
function bounceToHand(s,p,uid){
 const found=location(s,p,uid);if(!found)throw Error('Bounce source not on own field');
 const top=found.c,pl=s.players[p];pl[found.line][found.slot]=null;
 // Official Japanese Q62: only the top Raid card returns to hand.
 // All bases and facedown undercards move to OWN outside (not hand/remove).
 const below=c=>[...(c.stack||[]).flatMap(x=>[x,...below(x)]),
  ...(c.under||[]).flatMap(x=>[x,...below(x)])];
 const reset=c=>({...c,stack:[],under:[],buffs:[],ready:false,faceDown:false,fieldEntryStamp:null});
 pl.outside.push(...below(top).map(reset));pl.hand.push(reset(top));
}
function vacate(s,p,line,slot,destination='outside'){
 const top=s.players[p][line][slot];if(!top)throw Error('Empty field slot');
 if(!['outside','removed'].includes(destination))throw Error('Invalid destination');
 s.players[p][line][slot]=null;
 const expand=c=>[c,...(c.stack||[]).flatMap(expand),...(c.under||[]).flatMap(expand)];
 s.players[p][destination].push(...expand(top).map(c=>({...c,stack:[],under:[],buffs:[],ready:false,faceDown:false,fieldEntryStamp:null})));
}
function recordTrueRetirement(pack,s,controller,physical,line){
 // One completed field object, not the hidden layers of a Raid stack.
 const cardType=card(pack,physical).type;
 if(cardType!=='character'&&cardType!=='field')throw Error('Only field objects retire');
 s.turnRetireEvents.push({turn:s.turn,controller,cardType,uid:physical.uid,
  line,fieldEntryStamp:physical.fieldEntryStamp??null});
}
function queueRetirement(pack,s,p,c,line){
 // Capture the source before moving to outside. Only GENUINE retirement
 // queues onRetire; bounce, removed area and stripping a Raid top do not.
 const jobs=programJobs(pack,s,c,'onRetire',p).map(job=>({
  ...job,retiredSource:{uid:c.uid,cardId:c.cardId,line,ready:c.ready,
   bp:bp(pack,s,c),fieldEntryStamp:c.fieldEntryStamp??null}
 }));
 // With simultaneous retirement: finish physical moves before queued triggers.
 s.effectQueue.push(...jobs);
}
function retire(pack,s,p,line,slot,{postImpact=false}={}){
 const c=s.players[p][line][slot];
 if(!c)throw Error('Cannot retire empty field');
 if(protectedLeave(pack,s,c)){
  s.pending={kind:'leave-replacement',player:p,uid:c.uid,line,slot,
   postImpact,destination:'outside'};
  return true;
 }
 queueRetirement(pack,s,p,c,line);
 vacate(s,p,line,slot,'outside');
 recordTrueRetirement(pack,s,p,c,line);
 return false;
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
function commitDestination(s,p,line,slot,replaceUid,source=null){
 const occupant=s.players[p][line][slot];
 if(source&&source.line===line&&source.slot===slot)return;
 if(!occupant){
  if(replaceUid!==undefined)throw Error('No card needs replacement');
  return;
 }
 if(replaceUid!==occupant.uid||!s.players[p][line].every(Boolean))
  throw Error('Full line replacement must designate exact existing card');
 vacate(s,p,line,slot,'removed');
}
function damage(pack,s,defender){
 const pl=s.players[defender];
 if(!pl.life.length){s.status='finished';s.winner=1-defender;s.endReason='unblocked-attack';return;}
 const c=pl.life.shift();pl.outside.push(c);
 const trig=card(pack,c).trigger;
 s.publicReveals.push({owner:defender,title:titleOf(pack,defender),cardId:c.cardId,uid:c.uid,trigger:trig||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.shift();
 if(['get','draw','active','special','color','raid'].includes(trig)||(trig==='final'&&!pl.life.length)){
  s.pending={kind:'life-trigger',player:defender,uid:c.uid,trigger:trig};
 }else if(!pl.life.length){
  s.status='finished';s.winner=1-defender;s.endReason='life-zero';
 }
}
function finishPending(s){
 if(s.status==='playing'&&!s.pending&&s.players.some(p=>p.life.length===0)){
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
 if(q.kind==='phase-order'){
  const selected=q.entries.find(x=>x.key===a.key);
  if(!selected)throw Error('Invalid phase-trigger-order choice');
  const rest=q.entries.filter(x=>x.key!==a.key);
  s.pending=null;s.effectQueue.unshift(...selected.jobs,
   ...(rest.length?[{op:'phaseOrder',owner:q.player,entries:rest}]:[]));
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='block'){
  const attacker=s.players[s.active].front.find(c=>c?.uid===q.attackerUid);
  if(!attacker)throw Error('Attacker no longer exists');
  s.pending=null;
  if(a.uid===null){damage(pack,s,q.player);return;}
  const slot=p.front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!p.front[slot].ready)throw Error('Illegal blocker');
  const blocker=p.front[slot];blocker.ready=false;
  if(bp(pack,s,attacker)>=bp(pack,s,blocker)){
   const impact=impactOnBattleWin(pack,s,attacker)>0&&
    !card(pack,blocker).impactNull;
   const replacement=retire(pack,s,q.player,'front',slot,{postImpact:impact});
   if(impact&&!replacement)damage(pack,s,q.player);
  }
  if(!s.pending)continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='leave-replacement'){
  const loc=location(s,q.player,q.uid);
  if(!loc||loc.line!==q.line||loc.slot!==q.slot)throw Error('Leaving character moved');
  if(a.mode==='protect'){
   const choices=facedownChoices(loc.c);
   if(!choices.length||!protectedLeave(pack,s,loc.c))throw Error('No eligible facedown replacement');
   const selection=choices.length===1?choices[0]:a.uid;
   if(!choices.includes(selection))throw Error('Must select an owned facedown replacement');
   const consumed=detachFacedown(loc.c,selection);
   if(!consumed)throw Error('Facedown card no longer available');
   const expand=c=>[c,...(c.stack||[]).flatMap(expand),...(c.under||[]).flatMap(expand)];
   p.outside.push(...expand(consumed).map(c=>({...c,faceDown:false,ready:false,stack:[],under:[],buffs:[]})));
  }else if(a.mode==='leave'){
    if(q.destination==='outside')queueRetirement(pack,s,q.player,loc.c,q.line);
    vacate(s,q.player,q.line,q.slot,q.destination);
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
  if(q.postImpact)damage(pack,s,q.player);
  continueEffectQueue(pack,s);finishPending(s);return;
 }
 if(q.kind==='private-top-choice'){
  if(a.mode==='outside'&&p.deck.length)p.outside.push(p.deck.shift());
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
  p.removed.push(p.hand.splice(i,1)[0]);
  s.pending=null;
  advanceAfterEnd(pack,s,q.player);
  return;
 }
 if(q.kind==='effect-search-deck'){
  if(a.uid!==null){
   const index=p.deck.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid)||!matchesFilter(pack,p.deck[index],q.filter))
    throw Error('Deck search needs an eligible owned physical card');
   p.hand.push(p.deck.splice(index,1)[0]);
  }else if(!q.optional)throw Error('Mandatory deck search cannot be declined');
  shuffle(s,p.deck);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-search-deck-multi'){
  if(a.uid!==null){
   const index=p.deck.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid)||!matchesSearch(pack,p.deck[index],q))
    throw Error('Multi search needs a matching owned physical card');
   p.hand.push(p.deck.splice(index,1)[0]);
   q.remaining--;
  }else if(!q.optional)throw Error('Mandatory multi-search cannot be declined');
  const choices=searchChoices(pack,p.deck,q);
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
   if(!chosen||!q.choices.includes(a.uid)||!matchesSearch(pack,chosen,q))
    throw Error('Filtered top search needs a legal inspected physical card');
   const i=p.deck.findIndex(c=>c.uid===a.uid);
   if(i<0||i>=q.uids.length)throw Error('Selected physical UID outside top window');
   p.hand.push(p.deck.splice(i,1)[0]);
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
  p.outside.push(...window.filter(c=>chosen.has(c.uid)));
  p.deck.unshift(...remaining);
  if(remaining.length)s.pending={kind:'effect-top-order',player:q.player,
   sourceUid:q.sourceUid,uids:remaining.map(c=>c.uid),order:[],rest:q.rest};
  else{s.pending=null;continueEffectQueue(pack,s);}
  return;
 }
 if(q.kind==='effect-top-inspect'){
  if(a.uid!==null){
   if(!q.uids.includes(a.uid))throw Error('Cannot send uninspected card outside');
   const index=p.deck.findIndex(c=>c.uid===a.uid);
   if(index<0||index>=q.uids.length)throw Error('Inspected card left deck window');
   p.outside.push(p.deck.splice(index,1)[0]);
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
  if(!q.choices.includes(a.uid))throw Error('Illegal own bounce target');
  const found=location(s,q.player,a.uid);
  if(!found||found.c.uid===q.sourceUid||
   card(pack,found.c).type!=='character'||card(pack,found.c).energy>q.energy)
   throw Error('Invalid own bounce target');
  bounceToHand(s,q.player,a.uid);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-recover-outside'){
  if(a.uid!==null){
   const index=p.outside.findIndex(c=>c.uid===a.uid);
   if(index<0||!q.choices.includes(a.uid)||!matchesOutsideRecovery(pack,p.outside[index],q))
    throw Error('Outside recovery needs an eligible owned physical card');
   const recovered=p.outside.splice(index,1)[0];
   p.hand.push(recovered);
   markOwnEffectZoneMove(s,q.player,'outside','hand');
   // Recovered card's OWN mandatory print resolves before the recovering
   // source's remaining jobs. UID ownership and the source zone were
   // checked above. No trigger on GET Life, searchDeck, draw or bounce.
   const onRecover=programJobs(pack,s,recovered,'onOutsideRecover',q.player);
   if(onRecover.length)s.effectQueue.unshift(...onRecover);
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
  commitDestination(s,q.player,'energy',a.slot,a.replaceUid);
  const entrant=p.hand.splice(index,1)[0];
  entrant.ready=false;entrant.fieldEntryStamp=s.nextFieldEntryStamp++;
  p.energy[a.slot]=entrant;
  s.pending=null;
  // This is entry via an effect, so onPlay executes with no additional AP.
  s.effectQueue.unshift(...programJobs(pack,s,entrant,'onPlay',q.player));
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-discard-cost'){
  if(a.uid!==null){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('Discard payment needs an owned hand card');
   p.outside.push(p.hand.splice(index,1)[0]);
  markOwnEffectZoneMove(s,q.player,'hand','outside');
   draw(s,q.player,q.count);
  }else if(!q.optional)throw Error('Mandatory cost cannot be declined');
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-discard-gate'){
  if(a.uid!==null){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('Gate payment must discard owned hand card');
   p.outside.push(p.hand.splice(index,1)[0]);
  markOwnEffectZoneMove(s,q.player,'hand','outside');
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
  p.outside.push(p.hand.splice(index,1)[0]);
  markOwnEffectZoneMove(s,q.player,'hand','outside');
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
 if(q.kind==='main-discard-buff'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  const source=field(p).find(c=>c.uid===q.sourceUid);
  if(index<0||!source||card(pack,source).mainAbility?.op!=='discardHandBuffSelf'||
   s.mainAbilityUsedUids.includes(source.uid)||!q.choices.includes(a.uid))
   throw Error('Main discard BP must pay one OWN hand card for a current OWN source');
  // Payment precedes the temporary BP. No AP, REST or once-use consumed
  // until an exact physical own-hand discard has actually been submitted.
  p.outside.push(p.hand.splice(index,1)[0]);
  markOwnEffectZoneMove(s,q.player,'hand','outside');
  source.buffs??=[];source.buffs.push({bp:q.bp,untilTurn:s.turn});
  s.mainAbilityUsedUids.push(source.uid);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='main-two-buff'){
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!card(pack,target).traits.includes(q.trait))
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
   card(pack,target).type!=='character'||!matchesFilter(pack,target,q.filter))
   throw Error('Illegal own field BP target');
  target.buffs??=[];target.buffs.push({bp:q.bp,untilTurn:s.turn});
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-buff-trait'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const target=field(p).find(c=>c.uid===a.uid);
  if(!target||!q.choices.includes(a.uid)||!card(pack,target).traits.includes(q.trait))
   throw Error('Illegal own-trait buff target');
  target.buffs.push({bp:q.bp,untilTurn:s.turn});
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
  if(q.kind==='effect-retire-bp'){
  if(a.uid===null&&q.optional){s.pending=null;continueEffectQueue(pack,s);return;}
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid)||bp(pack,s,s.players[opponent].front[slot])>q.limit)
   throw Error('Illegal BP-threshold retirement target');
  s.pending=null;
  retire(pack,s,opponent,'front',slot);
  continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-target'){
  if(a.uid===null&&q.optional===true){
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid))throw Error('Illegal cross-title effect target');
  const target=s.players[foe].front[slot];
  target.buffs??=[];
  target.buffs.push({bp:-q.bp,untilTurn:s.turn});
  // Official state-based rule: characters at 0 BP or below are sidelined.
  s.pending=null;
  if(bp(pack,s,target)<=0)retire(pack,s,foe,'front',slot);
  continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='life-trigger'){
  // Clear only the original life choice. A COLOR/RAID onPlay can create a NEW
  // pending decision; never wipe that nested decision after resolving it.
  s.pending=null;
  const i=p.outside.findIndex(c=>c.uid===q.uid);
  if(i<0)throw Error('Revealed life card not found');
  if(a.mode==='get'&&q.trigger==='get')p.hand.push(p.outside.splice(i,1)[0]);
  else if(a.mode==='draw'&&q.trigger==='draw')draw(s,q.player);
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
   const profile=card(pack,p.outside[i]).triggerEffect;
   if(profile.op!=='retireOppFrontUnderBp'||slot<0||
    bp(pack,s,s.players[1-q.player].front[slot])>profile.bp)
    throw Error('Illegal COLOR retirement target');
   retire(pack,s,1-q.player,'front',slot);
  }
  else if(a.mode==='colorOutside'&&q.trigger==='color'){
   const profile=card(pack,p.outside[i]).triggerEffect;
   if(profile.op!=='deployOutsideCharacter'||a.line!=='front'||profile.frontOnly!==true)
    throw Error('COLOR source must explicitly allow outside-to-front play');
   const index=p.outside.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('COLOR outside target is not in own outside');
   const chosen=p.outside[index],d=card(pack,chosen);
   if(d.type!=='character'||d.frontForbidden||d.color!==profile.color||
     d.energy>profile.maxEnergy||d.ap!==profile.ap)
    throw Error('Outside COLOR target does not meet printed requirements');
   commitDestination(s,q.player,'front',a.slot,a.replaceUid);
   p.outside.splice(index,1);chosen.ready=true;
   chosen.fieldEntryStamp=s.nextFieldEntryStamp++;p.front[a.slot]=chosen;
   // COLOR life deployment spends no AP but does trigger onPlay.
   applyEffects(pack,s,chosen,'onPlay',q.player);
  }
  else if(a.mode==='color'&&q.trigger==='color'){
   const profile=card(pack,p.outside[i]).triggerEffect;
   const handIndex=p.hand.findIndex(c=>c.uid===a.uid);
   if(handIndex<0)throw Error('COLOR requires a hand character');
   const picked=p.hand[handIndex],d=card(pack,picked);
   if(d.type!=='character'||(a.line==='front'&&d.frontForbidden)||
    d.color!==profile.color||d.energy>profile.maxEnergy||d.ap!==profile.ap||
    !['front','energy'].includes(a.line))throw Error('Illegal COLOR deployment');
   commitDestination(s,q.player,a.line,a.slot,a.replaceUid);
   p.hand.splice(handIndex,1);picked.ready=true;
   picked.fieldEntryStamp=s.nextFieldEntryStamp++;p[a.line][a.slot]=picked;
   // This is ordinary playing through a trigger, NOT a Raid: no AP is spent.
   applyEffects(pack,s,picked,'onPlay',q.player);
  }
  else if(a.mode==='raid'&&q.trigger==='raid'){
   const revealed=p.outside.splice(i,1)[0];
   performRaid(pack,s,q.player,revealed,a.baseUid,a.line,a.slot,a.replaceUid);
  }
  else if(a.mode==='get'&&q.trigger==='raid')p.hand.push(p.outside.splice(i,1)[0]);
  else if(a.mode==='final'&&q.trigger==='final'&&!p.life.length&&p.deck.length)p.life.unshift(p.deck.shift());
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
  winner:null,endReason:null,pending:null,extraDrawn:false,moved:false,movedUids:[],attacksThisTurn:0,
  publicReveals:[],effectQueue:[],delayedEffects:[],nextFieldEntryStamp:1,
  continuousStates:[],nextContinuousStateId:1,endRefreshed:false,players:[],
  raidedThisTurn:[false,false],mainAbilityUsedUids:[],mainReadyOnceByName:[[],[]],
  onceEffectUses:[[],[]],
  turnEffectZoneMoves:[{handToOutside:false,outsideToHand:false},
   {handToOutside:false,outsideToHand:false}],turnRetireEvents:[],
  initialCounts:decks.map(d=>Object.fromEntries(Object.entries(d).filter(([,n])=>n>0)))
 };
 for(let p=0;p<2;p++){
  const ids=Object.entries(decks[p]).flatMap(([id,count])=>Array(count).fill(id));
  const pile=shuffle(s,ids.map((id,i)=>({uid:p+'-'+i,cardId:id,ready:false,stack:[],under:[],buffs:[]})));
  s.players.push({
   deck:pile,hand:pile.splice(0,7),life:pile.splice(0,7),
   front:[null,null,null,null],energy:[null,null,null,null],
   outside:[],removed:[],apCards:[0,1,2].map(i=>({uid:'AP'+p+'-'+i,ready:false,inPlay:false})),ownTurns:0
  });
 }
 startTurn(pack,s);
 assertUniversalMatch(pack,s);
 return s;
}
function legalPending(pack,s){
 const q=s.pending,p=s.players[q.player];
 if(q.kind==='phase-order')return q.entries.map(x=>({type:'choosePhaseOrder',key:x.key}));
 if(q.kind==='block')return [
  {type:'chooseBlock',uid:null},
  ...p.front.filter(c=>c?.ready).map(c=>({type:'chooseBlock',uid:c.uid}))
 ];
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
  ...p.deck.filter(c=>q.choices.includes(c.uid)&&matchesFilter(pack,c,q.filter))
   .map(c=>({type:'chooseDeckSearch',uid:c.uid}))
 ];
 if(q.kind==='effect-search-deck-multi')return [
  ...(q.optional?[{type:'chooseDeckSearchMulti',uid:null}]:[]),
  ...p.deck.filter(c=>q.choices.includes(c.uid)&&matchesSearch(pack,c,q))
   .map(c=>({type:'chooseDeckSearchMulti',uid:c.uid}))
 ];
 if(q.kind==='effect-top-filter-choice')return [
  {type:'chooseTopFiltered',uid:null},
  ...q.choices.map(uid=>({type:'chooseTopFiltered',uid}))
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
 if(q.kind==='effect-top-order')return q.uids
  .filter(uid=>!q.order.includes(uid)).map(uid=>({type:'chooseTopOrder',uid}));
 if(q.kind==='effect-bounce-own')return q.choices.map(uid=>({type:'chooseOwnBounce',uid}));
 if(q.kind==='recovered-self-entry')return [
  {type:'chooseRecoveredEntry',mode:'skip'},
  ...legalDestinations(p,'energy').map(c=>({
   type:'chooseRecoveredEntry',mode:'enter',line:'energy',...c
  }))
 ];
 if(q.kind==='effect-recover-outside')return [
  ...(q.optional?[{type:'chooseOutsideRecovery',uid:null}]:[]),
  ...p.outside.filter(c=>q.choices.includes(c.uid)&&matchesOutsideRecovery(pack,c,q))
   .map(c=>({type:'chooseOutsideRecovery',uid:c.uid}))
 ];
 if(q.kind==='effect-discard-cost')return [
  ...(q.optional?[{type:'chooseDiscardCost',uid:null}]:[]),
  ...p.hand.map(c=>({type:'chooseDiscardCost',uid:c.uid}))
 ];
 if(q.kind==='effect-discard-gate')return [
  ...(q.optional?[{type:'chooseDiscardGate',uid:null}]:[]),
  ...p.hand.map(c=>({type:'chooseDiscardGate',uid:c.uid}))
 ];
 if(q.kind==='raid-effect-order')return [
   {type:'chooseRaidOrder',mode:'baseFirst'},{type:'chooseRaidOrder',mode:'entryFirst'}
  ];
 if(q.kind==='main-discard-buff')
  return p.hand.filter(c=>q.choices.includes(c.uid)).map(c=>({
   type:'chooseMainDiscard',uid:c.uid
  }));
 if(q.kind==='main-two-buff')
  return field(p).filter(c=>card(pack,c).traits.includes(q.trait))
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
 if(q.kind==='effect-rest-bp')return [
   ...(q.optional?[{type:'chooseRestBp',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseRestBp',uid}))
  ];
 if(q.kind==='effect-retire-own-field')return [
    ...(q.optional?[{type:'chooseOwnFieldRetire',uid:null}]:[]),
    ...q.choices.map(uid=>({type:'chooseOwnFieldRetire',uid}))
   ];
  if(q.kind==='effect-retire-bp')return [
   ...(q.optional?[{type:'chooseRetireBp',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseRetireBp',uid}))
  ];
 if(q.kind==='effect-target')return [
   ...(q.optional?[{type:'chooseTarget',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseTarget',uid}))
  ];
 if(q.kind==='life-trigger'){
  const out=[{type:'chooseTrigger',mode:'skip'}];
  if(q.trigger==='active')out.push(...field(p).filter(c=>card(pack,c).type==='character')
   .map(c=>({type:'chooseTrigger',mode:'active',uid:c.uid})));
  if(q.trigger==='special')
   out.push(...s.players[1-q.player].front.filter(Boolean)
    .map(c=>({type:'chooseTrigger',mode:'special',uid:c.uid})));
  if(q.trigger==='color'){
   const profile=card(pack,p.outside.find(c=>c.uid===q.uid)).triggerEffect;
   if(profile.op==='retireOppFrontUnderBp')
    out.push(...s.players[1-q.player].front.filter(c=>c&&bp(pack,s,c)<=profile.bp)
     .map(c=>({type:'chooseTrigger',mode:'colorRetire',uid:c.uid})));
   else if(profile.op==='deployOutsideCharacter'){
    for(const c of p.outside){
     const d=card(pack,c);
     if(d.type!=='character'||d.frontForbidden||d.color!==profile.color||d.energy>profile.maxEnergy||d.ap!==profile.ap)continue;
     for(const choice of legalDestinations(p,'front'))
      out.push({type:'chooseTrigger',mode:'colorOutside',uid:c.uid,line:'front',...choice});
    }
   }else for(const c of p.hand){
    const d=card(pack,c);
    if(d.type!=='character'||d.color!==profile.color||d.energy>profile.maxEnergy||d.ap!==profile.ap)continue;
    for(const line of ['front','energy']){
     if(line==='front'&&d.frontForbidden)continue;
     for(const choice of legalDestinations(p,line))
      out.push({type:'chooseTrigger',mode:'color',uid:c.uid,line,...choice});
    }
   }
  }
  if(q.trigger==='raid'){
   const revealed=p.outside.find(c=>c.uid===q.uid),d=card(pack,revealed);
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
function eventMandatoryTargetsAvailable(pack,s,owner,d){
 const enemy=s.players[1-owner];
 return (d.effects?.onPlay||[]).every(job=>{
  if(job.optional!==false)return true;
  if(job.op==='restOppFrontOne')
   return enemy.front.some(Boolean);
  if(job.op==='restOppFrontUnderBp'||job.op==='restOrRetireOppFrontByLife')
   return enemy.front.some(c=>c&&bp(pack,s,c)<=job.bp);
  return true;
 });
}
export function legalUniversalActions(pack,s){
 assertUniversalMatch(pack,s);
 if(s.status!=='playing')return [];
 if(s.pending)return legalPending(pack,s);
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
  // A discard-cost MAIN ability can be activated from either field line,
  // regardless of source REST state; it does NOT require spending AP.
  for(const c of field(pl)){
   const d=card(pack,c),ability=originalEffectsDisabled(s,c)?null:d.mainAbility;
   if(ability?.op==='readySelfIfOwnRetiredThisTurn'&&
    retiredThisTurn(s,p,ability.cardType)&&
    !s.mainReadyOnceByName[p].includes(d.name+'|readySelfIfOwnRetiredThisTurn'))
    out.push({type:'activate',uid:c.uid,mode:'retireReady'});
   if(ability?.op==='discardHandBuffSelf'&&pl.hand.length>0&&
    !s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'discardSelfBuff'});
  }
  for(const c of pl.energy.filter(Boolean)){
   const ability=originalEffectsDisabled(s,c)?null:card(pack,c).mainAbility;
   if(ability?.op==='restSelfGainEnergyRetireEndMain'&&
    c.ready&&!s.mainAbilityUsedUids.includes(c.uid))
    out.push({type:'activate',uid:c.uid,mode:'selfRestEnergyRetire'});
  }
  for(const c of pl.front.filter(Boolean)){
   const d=card(pack,c),ability=originalEffectsDisabled(s,c)?null:d.mainAbility;
   if(!ability)continue;
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
   if(ability.op==='restSelfThenRestOppFrontOne'){
    // This ability has a self-REST cost, NOT AP or per-turn flag. A READY
    // front-line character and at least one opponent front character are
    // required before the controller can pay the activation cost.
    if(c.ready&&s.players[1-p].front.some(Boolean))
     out.push({type:'activate',uid:c.uid,mode:'selfRestEnemy'});
    continue;
   }
   if(ability.op!=='chooseTwoAfterOwnRaid'||
    !s.raidedThisTurn[p]||s.mainAbilityUsedUids.includes(c.uid))continue;
   const readyAvailable=!s.mainReadyOnceByName[p].includes(d.name);
   const buffAvailable=field(pl).some(x=>card(pack,x).traits.includes(ability.trait));
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
   if(d.energy>(produced[d.color]||0)||d.ap>ap)continue;
   if(d.type==='event'){
    if(eventMandatoryTargetsAvailable(pack,s,p,d))
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
 if(s.phase==='attack')for(const c of pl.front.filter(c=>c?.ready&&card(pack,c).type==='character'))
  out.push({type:'attack',uid:c.uid});
 return out;
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
  resolveChoice(s,action,pack);
 }else switch(action.type){
  case 'extraDraw':
   spendAp(pl,1);draw(s,p);s.extraDrawn=true;break;
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
     s.effectQueue.push(...due.map(x=>({
      op:'retireAtMainEnd',owner:x.owner,sourceUid:x.sourceUid,
      fieldEntryStamp:x.fieldEntryStamp
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
   if(ability.op==='retireOwnFieldThen'){
    if(action.mode!=='retireFieldThen'||!pl.front.some(c=>c?.uid===selected.uid)||
     s.mainAbilityUsedUids.includes(selected.uid)||
     !pl.energy.some(c=>c&&card(pack,c).type==='field'))
     throw Error('No legal own FIELD retirement cost');
    s.mainAbilityUsedUids.push(selected.uid);
    s.effectQueue.push({op:'retireOwnFieldOne',owner:p,sourceUid:selected.uid,
     sourceName:d.name,optional:false,after:ability.after});
    continueEffectQueue(pack,s);break;
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
    s.pending={kind:'main-discard-buff',player:p,sourceUid:selected.uid,
     bp:ability.bp,choices:pl.hand.map(c=>c.uid)};
    break;
   }
   if(ability.op==='restSelfGainEnergyRetireEndMain'){
    if(action.mode!=='selfRestEnergyRetire'||
     !pl.energy.some(c=>c?.uid===selected.uid)||!selected.ready||
     s.mainAbilityUsedUids.includes(selected.uid))
     throw Error('Delayed energy requires READY own energy-line source, once per turn');
    if(!Number.isInteger(selected.fieldEntryStamp)||selected.fieldEntryStamp<1)
     selected.fieldEntryStamp=s.nextFieldEntryStamp++;
    selected.ready=false;
    s.mainAbilityUsedUids.push(selected.uid);
    selected.buffs??=[];
    selected.buffs.push({energy:ability.extraEnergy,untilTurn:s.turn});
    s.delayedEffects.push({op:'retireAtMainEnd',owner:p,sourceUid:selected.uid,
     fieldEntryStamp:selected.fieldEntryStamp,turn:s.turn});
    break;
   }
   if(ability.op==='restSelfThen'){
    if(action.mode!=='selfRestThen'||!selected.ready)
     throw Error('REST main action requires READY front character');
    selected.ready=false;
    // Use only the existing common queue; title adapters never execute effects.
    s.effectQueue.push(...ability.then.map(e=>({...e,owner:p,
     sourceUid:selected.uid,sourceName:d.name})));
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
   commitDestination(s,p,'front',action.slot,action.replaceUid);
   pl.energy[l.slot]=null;pl.front[action.slot]=l.c;s.moved=true;s.movedUids.push(l.c.uid);break;
  }
  case 'step':{
   const l=location(s,p,action.uid);
   if(!l||l.line!=='front')throw Error('Invalid STEP');
   commitDestination(s,p,'energy',action.slot,action.replaceUid);
   pl.front[l.slot]=null;pl.energy[action.slot]=l.c;s.moved=true;s.movedUids.push(l.c.uid);break;
  }
  case 'play':case 'event':case 'raid':{
   const index=pl.hand.findIndex(c=>c.uid===action.uid);
   if(index<0)throw Error('Card not in hand');
   const current=pl.hand[index],d=card(pack,current);
   spendAp(pl,d.ap);pl.hand.splice(index,1);
   if(action.type==='event'){pl.outside.push(current);applyEffects(pack,s,current,'onPlay',p);}
   else if(action.type==='raid'){
    performRaid(pack,s,p,current,action.baseUid,'front',action.slot,action.replaceUid);
   }else{
    commitDestination(s,p,action.line,action.slot,action.replaceUid);
    current.ready=defaultEntryReady(pack,s,p,current);
    current.fieldEntryStamp=s.nextFieldEntryStamp++;
    pl[action.line][action.slot]=current;
    applyEffects(pack,s,current,'onPlay',p);
   }
   break;
  }
  case 'attack':{
   const attacker=pl.front.find(c=>c?.uid===action.uid);
   if(!attacker)throw Error('Attacker missing');
   attacker.ready=false;s.attacksThisTurn++;
   // Queue the blocker decision after the attack triggers. A targeted
   // onAttack effect may suspend resolution for its controller's choice;
   // assigning block here would overwrite that pending choice.
   s.effectQueue.push(...programJobs(pack,s,attacker,'onAttack',p),
    {op:'openBlock',owner:p,sourceUid:attacker.uid});
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
 if(s.pending&&(!playerIndex(s.pending.player)||!['phase-order','block','life-trigger','effect-target','effect-discard','end-hand-limit','effect-recover-ap','private-top-choice','private-top-place','effect-retire-bp','effect-retire-own-field','effect-rest-bp','raid-effect-order','effect-buff-trait','effect-buff-own','effect-once-choice','main-two-buff','main-discard-buff','leave-replacement','effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-order','effect-recover-outside','effect-bounce-own','effect-discard-cost','effect-discard-gate','effect-choice-mode','recovered-self-entry'].includes(s.pending.kind)))
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
 validateContinuousStates(s);
 if(typeof s.endRefreshed!=='boolean')throw Error('Invalid end refresh flag');
 if(!Number.isInteger(s.nextFieldEntryStamp)||s.nextFieldEntryStamp<1||
   !Array.isArray(s.delayedEffects)||s.delayedEffects.some(x=>
    x?.op!=='retireAtMainEnd'||!playerIndex(x.owner)||
    typeof x.sourceUid!=='string'||!Number.isInteger(x.turn)||
    !Number.isInteger(x.fieldEntryStamp)||x.fieldEntryStamp<1))
  throw Error('Invalid delayed effect instances');
 if(!Array.isArray(s.effectQueue)||s.effectQueue.some(e=>!playerIndex(e.owner)||
   !['draw','drawIfOwnName','drawIfOwnFieldExists','drawIfOwnEnergyAtLeast','millTop','buffSelf','enemyBpDown','drawDiscard','recoverAp','peekTopOne','peekTopOrBottom','retireOppFrontUnderBp','restOppFrontUnderBp','restOppFrontOne','retireOppFrontIfFacedown','buffOwnTrait','drawIfRaidUnderFacedown','searchDeckOne','searchDeckMany','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside','searchTopOneBottomDiscard','recoverOutsideOne','recoverOutsidePrintedBp','discardToDraw',
    'discardGate','enemyFrontAllBpDown','retireOppFrontAllUnderBp',
    'buffOwnTraitAllTurn','buffSelfIfFirstAttack','bounceOwnOtherUnderEnergy',
    'recoverOutsideColorUnderEnergy','buffOwnField','oncePerTurnGate','retireBatchOne','retireAtMainEnd','retireOwnFieldOne','openBlock','skipNextActiveOppRest','restOrRetireOppFrontByLife','restSilenceOppFrontIfOwnOutsideField','phaseOrder','advanceAfterAttack'].includes(e.op)))
  throw Error('Invalid queued effects');
 for(let p=0;p<2;p++){
  const pl=s.players[p],uids=new Set(),items=[];
  if(pl.front?.length!==4||pl.energy?.length!==4||pl.apCards?.length!==3||
    pl.apCards.some(c=>typeof c.ready!=='boolean'||typeof c.inPlay!=='boolean'||(c.ready&&!c.inPlay)))throw Error('Invalid zones or AP cards');
  function visit(c){
   if(!c)return;
   if(typeof c.uid!=='string'||uids.has(c.uid)||!c.uid.startsWith(p+'-')||
     !packs[p].cards[c.cardId])throw Error('Card conservation / wrong title / duplicated UID');
   uids.add(c.uid);items.push(c);
   for(const q of c.stack||[])visit(q);
   for(const q of c.under||[])visit(q);
  }
  for(const zone of ['deck','hand','life','outside','removed'])for(const c of pl[zone]||[])visit(c);
  for(const c of field(pl))visit(c);
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
 if(!q||q.player!==viewer||
  !['effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-order','effect-recover-outside','effect-bounce-own','effect-discard-cost','effect-discard-gate'].includes(q.kind))
  return null;
 const zone=['effect-search-deck','effect-search-deck-multi','effect-top-inspect','effect-top-inspect-many','effect-top-filter-choice','effect-top-order'].includes(q.kind)?'deck':
  q.kind==='effect-recover-outside'?'outside':
  q.kind==='effect-bounce-own'?'field':'hand';
 return {kind:q.kind,player:viewer,options:legalPending(pack,s).map(action=>{
  const physical=action.uid===null?null:
   (zone==='field'?field(s.players[viewer]):s.players[viewer][zone])
    .find(c=>c.uid===action.uid);
  return {action:{...action},card:physical?
   {cardId:physical.cardId,name:card(pack,physical).name,color:card(pack,physical).color}:null};
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
    restrictions:fieldRestrictions(s,p,c),raidDepth:c.stack?.length||0,raidLayers:(c.stack||[]).map(layer=>layerView(layer,p,viewer))}:null),
   energy:pl.energy.map(c=>c?{uid:c.uid,cardId:c.cardId,ready:c.ready,
    baseProduces:card(pack,c).gen,produces:universalCardEnergy(pack,s,p,c),
    restrictions:fieldRestrictions(s,p,c),raidLayers:(c.stack||[]).map(layer=>layerView(layer,p,viewer))}:null),
   apReady:pl.apCards.filter(c=>c.ready).length,apTotal:pl.apCards.filter(c=>c.inPlay).length,energyTotal:calcEnergy(pack,s,p),energyByColor:{...universalEnergyByColor(pack,s,p)},
   outside:pl.outside.map(c=>({uid:c.uid,cardId:c.cardId}))
  }))
 };
}
