// Shared V2 live-state predicates. No per-title reducer and no cached bonuses.
// Pure condition evaluation shared by energy today and conditional BP later.
// Source traits must already be independently verified by its own pack adapter;
// DO NOT infer Japanese aliases, translate strings, or split slash composites.
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
 if(condition.kind==='outsideCount')
  return s.players[owner].outside.length>=condition.min;
 if(condition.kind==='ownEnergyAtLeast')
  return energy()>=condition.min;
 const pl=s.players[owner];
 const zones=condition.zone==='front'?[pl.front]:
  condition.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
 let found=0;
 for(const zone of zones)for(const c of zone){
  if(!c||(condition.excludeSelf&&c.uid===sourceUid))continue;
  const d=printed(c);
  if(d.type!=='character')continue;
  if(condition.kind==='ownNameExists'&&d.name===condition.name)return true;
  if(condition.kind==='ownTraitCount'&&d.traits.includes(condition.trait))found++;
 }
 return condition.kind==='ownTraitCount'&&found>=condition.min;
}
