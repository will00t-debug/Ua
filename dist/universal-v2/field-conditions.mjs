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
