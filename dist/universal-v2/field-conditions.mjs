// Shared V2 live-state predicates. No per-title reducer and no cached bonuses.
// Pure condition evaluation shared by energy today and conditional BP later.
// Source traits must already be independently verified by its own pack adapter.
// DO NOT infer Japanese aliases from prose, translate strings, or split slash
// composites. A printed name alias is an explicit card field, never a guess.
import {originalEffectsDisabled} from './continuous-states.mjs';
// Q1946: the name printed at the top stays the original name. An alias is
// additional. Q87 applies that extra name in hand, deck, outside, field,
// removed, and the other zones. Q50/Q55: a card buried under a Raid is not
// the field card, so callers must not ask this helper for a buried layer.
// Silence removes the printed alias and leaves the original name.
export function cardHasName(definition,name,silenced=false){
 if(definition?.name===name)return true;
 return silenced!==true&&(definition?.nameAliases||[]).includes(name);
}
export const V2_TRAIT_ZONES=Object.freeze(['field','front','energy']);
export const V2_TRAIT_SUBJECTS=Object.freeze(['character','card']);
export function ownFieldTraitKinds(s,owner,sourceUid,profile,printed){
 const pl=s.players[owner];
 const zones=profile.zone==='front'?[pl.front]:
  profile.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
 const distinct=new Set();
 for(const cards of zones)for(const physical of cards){
  if(!physical||profile.excludeSelf&&physical.uid===sourceUid)continue;
  const definition=printed(physical);
  if(profile.subject==='character'&&definition.type!=='character')continue;
  // [] means traitless; a source-verified multi-trait card has separate tokens.
  // An unverified composite string remains ONE exact token, not guessed parts.
  for(const trait of definition.traits||[]){
   if(typeof trait==='string'&&trait.trim())distinct.add(trait);
  }
 }
 return distinct;
}
export function matchesOwnDistinctTraits(s,owner,sourceUid,profile,printed){
 return ownFieldTraitKinds(s,owner,sourceUid,profile,printed).size>=profile.minimumDistinctTraits;
}

// Small immutable predicate family for PRINTED persistent bonuses.
// Each condition is evaluated from the current match on every BP/energy read,
// not when a card is played. This is distinct from once-resolved turn buffs.
// Strictly use the physical controller's fields: never hand/outside/underlayers.
export function matchesV2LiveCondition(s,owner,sourceUid,condition,printed,energy){
 if(condition.turn==='own'&&s.active!==owner)return false;
 if(condition.turn==='opponent'&&s.active===owner)return false;
 if(condition.kind==='ownEffectHandOutsideOrRecovery'){
  // Same-turn factual records, never inferred from deck/hand counts or
  // the printed contents of any card. Own turn check is enforced above.
  const moves=s.turnEffectZoneMoves?.[owner];
  return moves?.handToOutside===true||moves?.outsideToHand===true;
 }
 if(condition.kind==='ownRetiredThisTurn')
  return retiredThisTurn(s,owner,condition.cardType);
 if(condition.kind==='retireCountThisTurn')
  return countRetirementsThisTurn(s,condition.controller==='own'?owner:
   condition.controller==='opponent'?1-owner:'any',condition.cardType)>=condition.min;
 if(condition.kind==='ownLifeAtMost')
  return s.players[owner].life.length<=condition.max;
 if(condition.kind==='ownHandCountAtLeast')
  return s.players[owner].hand.length>=condition.min;
 if(condition.kind==='outsideCount')
  return s.players[owner].outside.length>=condition.min;
 if(condition.kind==='ownEnergyAtLeast')
  return energy()>=condition.min;
 const pl=s.players[owner];
 const zones=condition.zone==='front'?[pl.front]:
  condition.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
 // A compound printed-name requirement is conjunctive across distinct names.
 // Count only own physical field characters; never opponent cards or hidden zones.
 const remaining=condition.kind==='ownFieldHasAllNames'?new Set(condition.names):null;
 let found=0;
 for(const zone of zones)for(const c of zone){
  if(!c||(condition.excludeSelf&&c.uid===sourceUid))continue;
  const d=printed(c);
  if(d.type!=='character')continue;
  const silenced=originalEffectsDisabled(s,c);
  if(condition.kind==='ownNameExists'&&cardHasName(d,condition.name,silenced))return true;
  // 〈名前〉がない is the same character-name check, inverted. Hand, deck,
  // outside, and Raid under-cards are not the field. Silence drops an alias
  // and keeps the printed name, matching ownNameExists.
  if(condition.kind==='ownNameAbsent'&&cardHasName(d,condition.name,silenced))return false;
  if(remaining){
   remaining.delete(d.name);
   if(!silenced)for(const alias of d.nameAliases||[])remaining.delete(alias);
  }
  if(condition.kind==='ownTraitCount'&&d.traits.includes(condition.trait))found++;
 }
 if(remaining)return remaining.size===0;
 if(condition.kind==='ownNameAbsent')return true;
 return condition.kind==='ownTraitCount'&&found>=condition.min;
}

// A history of real field-to-OUTSIDE retirements, not current outside count.
// This is private internal state; public snapshots do not expose the UIDs.
export function countRetirementsThisTurn(s,controller='any',cardType='any'){
 if(![0,1,'any'].includes(controller)||!['any','field','character'].includes(cardType))
  throw Error('Invalid true-retirement count predicate');
 // Count completed departure EVENTS, not unique UIDs or the cards currently
 // in outside. A returned/replayed physical card can retire again.
 return (s.turnRetireEvents||[]).filter(e=>e.turn===s.turn&&
  (controller==='any'||e.controller===controller)&&
  (cardType==='any'||e.cardType===cardType)).length;
}
export function retiredThisTurn(s,controller,cardType='any'){
 if(![0,1].includes(controller))throw Error('Invalid true-retirement predicate');
 return countRetirementsThisTurn(s,controller,cardType)>0;
}
