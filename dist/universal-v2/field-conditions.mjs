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
// Printed slash-composite remains one immutable card-face token. Only an
// explicitly audited pack-level declaration supplies separately recognized
// components; no title prose/translated alias is inferred here.
export function cardHasTrait(definition,trait){
 return (definition?.traits||[]).includes(trait)||
  (definition?.traitComponents||[]).includes(trait);
}
// 「全ての場所でイベントカードとしても扱う」adds an event identity.
// The printed type stays character, so play, front, and energy rules do not
// change. Effects that count or search for an event card include it.
export function cardCountsAsEvent(definition){
 return definition?.type==='event'||definition?.alsoEvent===true;
}
// EX16BT Q2345: while 〈巴 マミ〉 MMM-2-007 is on the field and not silenced,
// an own effect that reads the outside event count treats it as one higher.
// Copies do not stack. No FAQ says otherwise.
export function mamiOutsideEventBonus(s,owner,printed){
 const zones=[s.players[owner]?.front,s.players[owner]?.energy];
 for(const zone of zones)for(const c of zone||[]){
  if(!c)continue;
  if(printed(c)?.id==='MMM-2-007'&&!originalEffectsDisabled(s,c))return 1;
 }
 return 0;
}
// Distinct printed names of a trait that entered the field this turn.
// Aliases do not create a second kind. The card currently entering is
// already on the zone-move ledger when its onPlay runs.
export function distinctTraitEntryNames(s,owner,trait,printed){
 const names=new Set();
 for(const e of s.zoneMoveEvents||[]){
  if(e.turn!==s.turn||e.owner!==owner||e.controller!==owner)continue;
  if(!['front','energy'].includes(e.to)||['front','energy'].includes(e.from))continue;
  const d=printed({uid:e.uid,cardId:e.cardId});
  if(!d||d.type!=='character'||!cardHasTrait(d,trait))continue;
  if(typeof d.name==='string'&&d.name.trim())names.add(d.name);
 }
 return names;
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
  for(const trait of definition.traitComponents||definition.traits||[]){
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
// Field predicates use this controller's front and energy. Hand, deck,
// removed, and Raid under-cards stay out unless a clause names 場外.
export function matchesV2LiveCondition(s,owner,sourceUid,condition,printed,energy,cardBp,requiredEnergyOf){
 // A printed 「かつ」 is one bonus with every clause true. The outer turn
 // is the printed turn icon. Each clause keeps its own closed predicate.
 if(condition?.logic==='all'||condition?.logic==='any'){
  if(condition.turn==='own'&&s.active!==owner)return false;
  if(condition.turn==='opponent'&&s.active===owner)return false;
  const hit=q=>matchesV2LiveCondition(s,owner,sourceUid,q,printed,energy,cardBp,requiredEnergyOf);
  return condition.logic==='any'?condition.checks.some(hit):condition.checks.every(hit);
 }
 if(condition.turn==='own'&&s.active!==owner)return false;
 if(condition.turn==='opponent'&&s.active===owner)return false;
 // 「自分のターン中」かつ「このキャラの下に裏向きのカード」. The physical
 // field card is the one being measured. A buried layer is not itself.
 if(condition.kind==='ownTurnFacedownUnder'){
  const areas=[s.players[owner].front,s.players[owner].energy];
  const physical=areas.flat().find(c=>c?.uid===sourceUid);
  const facedown=c=>!!c&&((c.under||[]).some(v=>v.faceDown===true||facedown(v))||
   (c.stack||[]).some(v=>v.faceDown===true||facedown(v)));
  return facedown(physical);
 }
 // Direct facedown cards under this physical card. A Raid stack layer and
 // a nested under-card do not satisfy 「このキャラの下」.
 if(condition.kind==='selfFacedownUnder'){
  const areas=[s.players[owner].front,s.players[owner].energy];
  const physical=areas.flat().find(c=>c?.uid===sourceUid);
  return !!(physical&&(physical.under||[]).some(v=>v.faceDown===true));
 }
 // Any own character that entered front or energy from outside this turn.
 // The reason is not limited to an own effect.
 if(condition.kind==='ownCharacterFromOutsideThisTurn')
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&
   e.from==='outside'&&(e.to==='front'||e.to==='energy')&&
   printed({uid:e.uid,cardId:e.cardId})?.type==='character');
 if(condition.kind==='ownNamedAttackedThisTurn')
  return (s.attackedNames||[]).some(e=>e.owner===owner&&
   (e.name===condition.name||(e.aliases||[]).includes(condition.name)));
 // Printed 「このターン中」 with no 自分のターン icon. The ledger is effect
 // AP only; paying AP to play a card does not qualify.
 if(condition.kind==='ownEffectApPaidColor')
  return (s.effectApPaidColors?.[owner]||[]).includes(condition.color);
 // Successful EVENT usage is already recorded as an atomic physical HAND ->
 // OUTSIDE rule move. Reuse this ledger; never infer usage from event count,
 // deck inspections, cancelled plays, opponent actions or transient zones.
 // 「自分のターン中」 with no other board fact. The turn check above
 // already rejected the opponent's turn when turn is own.
 if(condition.kind==='controllerTurn')return true;
 if(condition.kind==='ownEventUsedThisTurn')
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&
   e.owner===owner&&e.controller===owner&&e.from==='hand'&&
   e.to==='outside'&&e.reason==='rule'&&
   (d=>d?.type==='event'||d?.alsoEvent===true)(printed({uid:e.uid,cardId:e.cardId})));
 // 「使用している」 is a successful play from hand, not a payment discard.
 // Characters enter the field and events leave to outside. Both are rule moves.
 if(condition.kind==='ownTraitUsedThisTurn')
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&
   e.owner===owner&&e.controller===owner&&e.from==='hand'&&e.reason==='rule'&&
   cardHasTrait(printed({uid:e.uid,cardId:e.cardId}),condition.trait));
 // 「このターン中に移動している」. A hand-to-field play is an entry, not a move.
 // Front and energy swaps from a rule move or an effect both count.
 if(condition.kind==='selfMovedThisTurn')
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&
   e.uid===sourceUid&&((e.from==='front'&&e.to==='energy')||
    (e.from==='energy'&&e.to==='front')));
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
   condition.controller==='opponent'?1-owner:'any',condition.cardType,
   condition.excludeSelf===true?sourceUid:null)>=condition.min;
 if(condition.kind==='oppFrontLiveBpBelowPrinted'){
  // 元々のBPよりBPが低い is live BP against the printed number.
  // Only the opponent's front characters count. Energy-line cards do not.
  if(typeof cardBp!=='function')throw Error('Live BP comparison needs a BP reader');
  return s.players[1-owner].front.some(c=>c&&printed(c).type==='character'&&
   cardBp(c)<printed(c).bp);
 }
 if(condition.kind==='oppFrontBelowPrintedCount'){
  // 3枚以上. Same live-versus-printed comparison, counted. A field has no
  // BP. An energy-line character is not on the front line.
  if(typeof cardBp!=='function')throw Error('Live BP comparison needs a BP reader');
  let found=0;
  for(const c of s.players[1-owner].front)
   if(c&&printed(c).type==='character'&&cardBp(c)<printed(c).bp)found++;
  return found>=condition.min;
 }
 if(condition.kind==='ownFrontNoOtherCharacter'){
  // 自分のフロントLに他のキャラがない. Energy-line cards and fields are
  // not front characters. This physical card does not count as another.
  return !s.players[owner].front.some(c=>c&&c.uid!==sourceUid&&
   printed(c).type==='character');
 }
 if(condition.kind==='selfRequiredEnergyAtLeast'){
  // このキャラの必要エナジー. Printed required energy plus a live increase.
  // A hand discount is not this number. The character has to be on the field.
  if(typeof requiredEnergyOf!=='function')
   throw Error('Required-energy condition needs a reader');
  const pl=s.players[owner];
  const physical=[...pl.front,...pl.energy].find(c=>c?.uid===sourceUid);
  if(!physical||printed(physical).type!=='character')return false;
  return requiredEnergyOf(physical)>=condition.min;
 }
 if(condition.kind==='ownFieldNoOtherTrait'){
  // Every own field card has no trait other than the named one. Q2306:
  // a traitless card satisfies it. A buried Raid layer is not on the field.
  const pl=s.players[owner];
  for(const zone of [pl.front,pl.energy])for(const c of zone){
   if(!c)continue;
   const d=printed(c);
   const traits=d.traitComponents||d.traits||[];
   if(traits.some(t=>t!==condition.trait))return false;
  }
  return true;
 }
 if(condition.kind==='ownLifeAtMost')
  return s.players[owner].life.length<=condition.max;
 if(condition.kind==='ownHandCountAtLeast')
  return s.players[owner].hand.length>=condition.min;
 if(condition.kind==='ownNameAndDeckAtMost'){
  // Printed deck size is the current OWN deck, not hand, life, or outside.
  // The name is an own field character, including this card when excludeSelf
  // is false. Raid under-cards are not the field.
  if(s.players[owner].deck.length>condition.max)return false;
  const areas=condition.zone==='front'?[s.players[owner].front]:
   condition.zone==='energy'?[s.players[owner].energy]:
   [s.players[owner].front,s.players[owner].energy];
  for(const area of areas)for(const c of area){
   if(!c||(condition.excludeSelf&&c.uid===sourceUid))continue;
   const d=printed(c);
   if(d.type==='character'&&cardHasName(d,condition.name,originalEffectsDisabled(s,c)))
    return true;
  }
  return false;
 }
 if(condition.kind==='outsideCount')
  return s.players[owner].outside.length>=condition.min;
 if(condition.kind==='ownOutsideEventCountAtLeast')
  return s.players[owner].outside.filter(c=>cardCountsAsEvent(printed(c))).length+
   mamiOutsideEventBonus(s,owner,printed)>=condition.min;
 // 〈エミリア〉があり、場外にイベントが N 枚以上. Both are required.
 // The named card is an own field character. Outside events include a
 // character that is also treated as an event. Hand and deck do not count.
 if(condition.kind==='ownNameAndOutsideEvents'){
  const events=s.players[owner].outside.filter(c=>cardCountsAsEvent(printed(c))).length+
   mamiOutsideEventBonus(s,owner,printed);
  if(events<condition.min)return false;
  const areas=[s.players[owner].front,s.players[owner].energy];
  for(const area of areas)for(const c of area){
   if(!c||printed(c).type!=='character')continue;
   if(cardHasName(printed(c),condition.name,originalEffectsDisabled(s,c)))return true;
  }
  return false;
 }
 // 「山札からキャラカードを登場させるかレイド」. The ledger is cleared at
 // the next turn start. A paid hand play, a life trigger, and an opponent
 // effect do not qualify. The moved card must be a character.
 if(condition.kind==='ownDeckCharacterEntryThisTurn')
  return (s.zoneMoveEvents||[]).some(e=>e.owner===owner&&e.controller===owner&&
   e.from==='deck'&&(e.to==='front'||e.to==='energy')&&e.reason==='own-effect'&&
   printed({uid:e.uid,cardId:e.cardId})?.type==='character');
 // 「自分の効果でキャラカードを登場させるかレイド」. A paid play or a paid
 // Raid is a rule move. An effect entry or effect Raid records own-effect
 // onto front or energy. The buried Raid base is not the entering character.
 if(condition.kind==='ownEffectCharacterEntryOrRaidThisTurn')
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&
   e.controller===owner&&e.reason==='own-effect'&&
   (e.to==='front'||e.to==='energy')&&
   printed({uid:e.uid,cardId:e.cardId})?.type==='character');
 // 「同じライン」is the paired front and energy slot, not another column
 // and not a card buried under a Raid.
 if(condition.kind==='sameLineName'){
  const pl=s.players[owner];
  for(const line of ['front','energy']){
   const slot=pl[line].findIndex(c=>c?.uid===sourceUid);
   if(slot<0)continue;
   const mate=pl[line==='front'?'energy':'front'][slot];
   return !!mate&&cardHasName(printed(mate),condition.name,
    originalEffectsDisabled(s,mate));
  }
  return false;
 }
 // 「このキャラはBP+…」while the physical card is a visible own field card.
 // Hand, outside, and a buried Raid layer do not receive the bonus.
 if(condition.kind==='selfOnField'){
  const area=s.players[owner];
  return area.front.some(c=>c?.uid===sourceUid)||area.energy.some(c=>c?.uid===sourceUid);
 }
 if(condition.kind==='ownRestPrintedBpCount')
  return ownRestPrintedBpCount(s,owner,sourceUid,condition,printed)>=condition.min;
 if(condition.kind==='ownOutsideNamedCountAtLeast'){
  // Printed names are a union, not distinct-name kinds: each physical card
  // in OWN OUTSIDE counts ONCE, even when it has multiple audited aliases.
  // Do not count raid underlayers, opponent outside, hand or removed cards.
  return s.players[owner].outside.filter(c=>{
   const d=printed(c);
   return condition.names.some(name=>cardHasName(d,name));
  }).length>=condition.min;
 }
 if(condition.kind==='ownNameOrRaidBase'){
  // 〈名前〉 on an own field character, or that character's レイド元.
  // The buried layer keeps its original printed name only (Q50).
  const pl=s.players[owner];
  const zones=condition.zone==='front'?[pl.front]:
   condition.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
  for(const zone of zones)for(const c of zone){
   if(!c)continue;
   const d=printed(c);
   if(d.type!=='character')continue;
   const silenced=originalEffectsDisabled(s,c);
   if(!(condition.excludeSelf&&c.uid===sourceUid)&&
    cardHasName(d,condition.name,silenced))return true;
   const base=c.stack?.[0];
   if(base&&printed(base).name===condition.name)return true;
  }
  return false;
 }
 if(condition.kind==='ownEnergyAtLeast')
  return energy()>=condition.min;
 if(condition.kind==='oppFrontCurrentBpBelowPrinted'){
  // 元々のBPよりBPが低い: that front character's current BP is below its
  // own printed BP. Energy, hand, and the measuring card's own front do
  // not qualify. A mutual lookup stops at the card already being measured.
  if(typeof cardBp!=='function')throw Error('Printed-BP gap needs a live BP reader');
  for(const c of s.players[1-owner].front){
   if(!c||printed(c).type!=='character')continue;
   const base=printed(c).bp;
   if(Number.isInteger(base)&&cardBp(c)<base)return true;
  }
  return false;
 }
 if(condition.kind==='oppCharacterBpAtLeast'){
  // Q749: an effect that raises current BP counts. Printed BP alone is not
  // the check. Mutual current-BP lookups stop at the card already being
  // measured so two such sentences cannot recurse.
  if(typeof cardBp!=='function')throw Error('Opponent BP condition needs a live BP reader');
  const foe=s.players[1-owner];
  const areas=condition.zone==='front'?[foe.front]:
   condition.zone==='energy'?[foe.energy]:[foe.front,foe.energy];
  for(const area of areas)for(const c of area){
   if(!c||printed(c).type!=='character')continue;
   if(cardBp(c)>=condition.minBp)return true;
  }
  return false;
 }
 if(condition.kind==='ownRemovedCountAtLeast')
  return (s.players[owner].removed||[]).length>=condition.min;
 if(condition.kind==='ownRemovedDistinctTrait'){
  // 異なるカード名 is the printed name. Removed cards are not silenced.
  const names=new Set();
  for(const c of s.players[owner].removed||[]){
   const d=printed(c);
   if(cardHasTrait(d,condition.trait))names.add(d.name);
  }
  return names.size>=condition.min;
 }
 if(condition.kind==='ownHandFewerThanOpponent')
  return s.players[owner].hand.length<s.players[1-owner].hand.length;
 if(condition.kind==='oppRestCharacter'){
  // 場 is the opponent's front and energy. A REST character is type
  // character with the live ready flag false. Printed BP, hand, deck,
  // outside, and a rested field are not this check.
  return countOppRestCharacters(s,owner,condition,printed)>0;
 }
 if(condition.kind==='oppCharacterCurrentBpCount'){
  // 相手の場の BP is the live total, read when the bonus is calculated.
  // A field has no BP. The count is characters, not every card.
  if(typeof cardBp!=='function')throw Error('Opponent BP count needs a live BP reader');
  const foe=s.players[1-owner];
  const areas=condition.zone==='front'?[foe.front]:
   condition.zone==='energy'?[foe.energy]:[foe.front,foe.energy];
  let found=0;
  for(const area of areas)for(const c of area){
   if(!c||printed(c).type!=='character')continue;
   if(cardBp(c)>=condition.minBp)found++;
  }
  return found>=condition.min;
 }
 if(condition.kind==='ownPrintedApAtLeast'){
  // 元々の消費AP is the printed AP. Q2319. Energy-line cards are a
  // different zone, and a field is not a character.
  const pl=s.players[owner];
  const zones=condition.zone==='front'?[pl.front]:
   condition.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
  for(const zone of zones)for(const c of zone){
   if(!c||(condition.excludeSelf&&c.uid===sourceUid))continue;
   const d=printed(c);
   if(d.type==='character'&&d.ap>=condition.minAp)return true;
  }
  return false;
 }
 if(condition.kind==='ownFrontNoOtherCharacter'){
  // 他のキャラ is another character on this player's front line. Energy-line
  // cards and fields are a different zone. This card does not count itself.
  return !s.players[owner].front.some(c=>c&&c.uid!==sourceUid&&
   printed(c).type==='character');
 }
 if(condition.kind==='oppFrontCurrentBpBelowPrinted'){
  // 元々のBP is the number printed at the lower left (Q2325). The live total
  // is read now. Energy-line cards and fields are not the opponent's front.
  // A card sitting exactly at its printed BP does not qualify.
  if(typeof cardBp!=='function')throw Error('Printed BP comparison needs a live BP reader');
  return s.players[1-owner].front.some(c=>c&&printed(c).type==='character'&&
   cardBp(c)<printed(c).bp);
 }
 if(condition.kind==='otherOwnCharacterRetiredThisTurn'){
  // このターン中、自分の場の他のキャラ. Front and energy are both 場.
  // A field is not a character. This physical card does not count itself.
  return (s.turnRetireEvents||[]).some(e=>e.turn===s.turn&&
   e.controller===owner&&e.cardType==='character'&&e.uid!==sourceUid);
 }
 if(condition.kind==='ownHandToOutsideThisTurn'){
  // 自分の手札を場外に置いている: the owner placed that hand card.
  // An event play is a rule move. A payment or own effect also counts.
  // An opponent's discard uses a different controller and does not.
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&
   e.controller===owner&&e.from==='hand'&&e.to==='outside'&&
   ['rule','payment','own-effect'].includes(e.reason));
 }
 if(condition.kind==='ownLifeToHandThisTurn'){
  // ライフエリアにあるカードを手札に加えている. A direct life-to-hand effect
  // counts. A GET trigger passes through lifeRevealed first and still counts.
  // An opponent moving that card does not.
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&
   e.controller===owner&&e.to==='hand'&&
   (e.from==='life'||(e.from==='lifeRevealed'&&e.reason==='life-trigger')));
 }
 if(condition.kind==='ownCardTraitCount'||condition.kind==='ownDistinctTraitNames'){
  // 枚 counts every own field card with the printed trait, including a
  // field. It is not the character-only ownTraitCount predicate.
  // カード名がN種類 counts distinct printed names among those cards.
  const pl=s.players[owner];
  const zones=condition.zone==='front'?[pl.front]:
   condition.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
  const names=new Set();
  let found=0;
  for(const zone of zones)for(const c of zone){
   if(!c||(condition.excludeSelf&&c.uid===sourceUid))continue;
   const d=printed(c);
   if(!cardHasTrait(d,condition.trait))continue;
   found++;
   if(typeof d.name==='string'&&d.name.trim())names.add(d.name);
  }
  return condition.kind==='ownDistinctTraitNames'?names.size>=condition.min:
   found>=condition.min;
 }
 if(condition.kind==='ownDistinctTraitEntriesThisTurn')
  return distinctTraitEntryNames(s,owner,condition.trait,printed).size>=condition.min;
 if(condition.kind==='ownNameOrDistinctPrintedColorNames'){
  // 〈名前〉 is the usual name check, including an audited alias. The
  // distinct-kind half counts original printed names only. Q2416/Q2417:
  // REZ-2-041 is also 〈シルフィ〉 and still one kind; two copies stay one.
  // Hand, deck, outside, opponent cards, fields and Raid layers are out.
  const board=s.players[owner];
  const areas=condition.zone==='front'?[board.front]:
   condition.zone==='energy'?[board.energy]:[board.front,board.energy];
  const kinds=new Set();
  for(const area of areas)for(const c of area){
   if(!c)continue;
   const d=printed(c);
   if(d.type!=='character')continue;
   if(cardHasName(d,condition.name,originalEffectsDisabled(s,c)))return true;
   if(d.color===condition.color)kinds.add(d.name);
  }
  return kinds.size>=condition.min;
 }
 if(condition.kind==='ownPrintedCharacter'){
  // 必要エナジー and 青 are the printed cost and printed color. Current
  // energy, a generated pip, and a color change are not this sentence.
  // Hand, deck, outside, the opponent, and a Raid under-card are not 場.
  const pl=s.players[owner];
  const zones=condition.zone==='front'?[pl.front]:
   condition.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
  for(const zone of zones)for(const c of zone){
   if(!c||(condition.excludeSelf&&c.uid===sourceUid))continue;
   const d=printed(c);
   if(d.type!=='character'||d.color!==condition.color||d.energy!==condition.energy)continue;
   if(cardHasName(d,condition.name,originalEffectsDisabled(s,c)))return true;
  }
  return false;
 }
 if(condition.kind==='ownDistinctPrintedColorNames'){
  // Distinct kinds are original printed names of that color. An alias does
  // not add a kind, and two copies stay one. Q2416/Q2417. The measuring
  // character counts. Hand, deck, outside, opponent cards, fields and Raid
  // layers do not.
  const board=s.players[owner];
  const areas=condition.zone==='front'?[board.front]:
   condition.zone==='energy'?[board.energy]:[board.front,board.energy];
  const kinds=new Set();
  for(const area of areas)for(const c of area){
   if(!c)continue;
   const d=printed(c);
   if(d.type==='character'&&d.color===condition.color)kinds.add(d.name);
  }
  return kinds.size>=condition.min;
 }
 if(condition.kind==='ownNameOrDistinctPrintedColorNames'){
  // 〈名前〉 is the usual name check, including an audited alias. The
  // distinct-kind half counts original printed names only. Q2416/Q2417:
  // REZ-2-041 is also 〈シルフィ〉 and still one kind; two copies stay one.
  // Hand, deck, outside, opponent cards, fields and Raid layers are out.
  const board=s.players[owner];
  const areas=condition.zone==='front'?[board.front]:
   condition.zone==='energy'?[board.energy]:[board.front,board.energy];
  const kinds=new Set();
  for(const area of areas)for(const c of area){
   if(!c)continue;
   const d=printed(c);
   if(d.type!=='character')continue;
   if(cardHasName(d,condition.name,originalEffectsDisabled(s,c)))return true;
   if(d.color===condition.color)kinds.add(d.name);
  }
  return kinds.size>=condition.min;
 }
 if(condition.kind==='ownNameOrDistinctPrintedColorNames'){
  // 〈名前〉 is the usual name check, including an audited alias. The
  // distinct-kind half counts original printed names only. Q2416/Q2417:
  // REZ-2-041 is also 〈シルフィ〉 and still one kind; two copies stay one.
  // Hand, deck, outside, opponent cards, fields and Raid layers are out.
  const board=s.players[owner];
  const areas=condition.zone==='front'?[board.front]:
   condition.zone==='energy'?[board.energy]:[board.front,board.energy];
  const kinds=new Set();
  for(const area of areas)for(const c of area){
   if(!c)continue;
   const d=printed(c);
   if(d.type!=='character')continue;
   if(cardHasName(d,condition.name,originalEffectsDisabled(s,c)))return true;
   if(d.color===condition.color)kinds.add(d.name);
  }
  return kinds.size>=condition.min;
 }
 if(condition.kind==='ownNameAbsent'&&condition.zone==='outside'){
  // 自分の場外に〈名前〉がない. Hand, deck, removed, the field, and the
  // opponent's outside are not this zone. Raid under-cards are not outside.
  // An outside card is not silenced, so an audited alias still matches.
  return !s.players[owner].outside.some(c=>
   !(condition.excludeSelf&&c.uid===sourceUid)&&
   cardHasName(printed(c),condition.name,false));
 }
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
  if(condition.kind==='ownAnyNameExists'&&
   condition.names.some(n=>cardHasName(d,n,silenced)))return true;
  // 〈名前〉がない is the same character-name check, inverted. Hand, deck,
  // outside, and Raid under-cards are not the field. Silence drops an alias
  // and keeps the printed name, matching ownNameExists.
  if(condition.kind==='ownNameAbsent'&&cardHasName(d,condition.name,silenced))return false;
  if(remaining){
   remaining.delete(d.name);
   if(!silenced)for(const alias of d.nameAliases||[])remaining.delete(alias);
  }
  if(condition.kind==='ownTraitCount'&&cardHasTrait(d,condition.trait))found++;
 }
 if(remaining)return remaining.size===0;
 if(condition.kind==='ownNameAbsent')return true;
 return condition.kind==='ownTraitCount'&&found>=condition.min;
}

// Live REST characters on the opponent's named line. The ready flag is read
// at the moment of the check, so a blocker who has just rested is included.
export function countOppRestCharacters(s,owner,condition,printed){
 if(condition.turn==='own'&&s.active!==owner)return 0;
 if(condition.turn==='opponent'&&s.active===owner)return 0;
 const foe=s.players[1-owner];
 const areas=condition.zone==='front'?[foe.front]:
  condition.zone==='energy'?[foe.energy]:[foe.front,foe.energy];
 let found=0;
 for(const area of areas)for(const c of area)
  if(c&&!c.ready&&printed(c).type==='character')found++;
 return found;
}
// A history of real field-to-OUTSIDE retirements, not current outside count.
// This is private internal state; public snapshots do not expose the UIDs.
export function countRetirementsThisTurn(s,controller='any',cardType='any',excludeUid=null){
 if(![0,1,'any'].includes(controller)||!['any','field','character'].includes(cardType))
  throw Error('Invalid true-retirement count predicate');
 // Count completed departure EVENTS, not unique UIDs or the cards currently
 // in outside. A returned/replayed physical card can retire again.
 // excludeUid is the printed 他の: this physical card's own departure
 // does not satisfy a sentence about another character.
 return (s.turnRetireEvents||[]).filter(e=>e.turn===s.turn&&
  (controller==='any'||e.controller===controller)&&
  (cardType==='any'||e.cardType===cardType)&&
  (excludeUid==null||e.uid!==excludeUid)).length;
}
// 元々の消費AP count. Front and energy stay separate zones. This card
// counts unless excludeSelf is set. The boolean predicate stays above.
export function countOwnPrintedApAtLeast(s,owner,sourceUid,condition,printed){
 if(condition.turn==='own'&&s.active!==owner)return 0;
 if(condition.turn==='opponent'&&s.active===owner)return 0;
 const pl=s.players[owner];
 const zones=condition.zone==='front'?[pl.front]:
  condition.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
 let found=0;
 for(const zone of zones)for(const c of zone){
  if(!c||(condition.excludeSelf&&c.uid===sourceUid))continue;
  const d=printed(c);
  if(d.type==='character'&&d.ap>=condition.minAp)found++;
 }
 return found;
}
// Q2030: 元々のBP is the number printed on the card, not the current total.
// Q2070: a field has no BP, so it is not counted by a 元々のBP filter even
// when the sentence does not say キャラ. REST is the physical ready flag.
// The trait token is exact. This card is included unless excludeSelf is set.
export function ownRestPrintedBpCount(s,owner,sourceUid,condition,printed){
 if(condition.turn==='own'&&s.active!==owner)return 0;
 if(condition.turn==='opponent'&&s.active===owner)return 0;
 const pl=s.players[owner];
 const zones=condition.zone==='front'?[pl.front]:
  condition.zone==='energy'?[pl.energy]:[pl.front,pl.energy];
 let found=0;
 for(const zone of zones)for(const c of zone){
  if(!c||c.ready||(condition.excludeSelf&&c.uid===sourceUid))continue;
  const d=printed(c);
  if(d.type!=='character'||!Number.isInteger(d.bp)||d.bp>condition.maxPrintedBp)continue;
  if(cardHasTrait(d,condition.trait))found++;
 }
 return found;
}
export function retiredThisTurn(s,controller,cardType='any'){
 if(![0,1].includes(controller))throw Error('Invalid true-retirement predicate');
 return countRetirementsThisTurn(s,controller,cardType)>0;
}


// R45 Q2337: count DIFFERENT original printed card names in the owner's
// OUTSIDE among a union of allowed types. Four physical copies bearing the
// same printed name are one kind. RAID undercards and hand/deck are not OUTSIDE.
// The caller supplies the existing owner-aware printed-card resolver.
export function countOwnOutsideDistinctPrintedNames(s,owner,printed,{color,types}){
 if(![0,1].includes(owner)||typeof printed!=='function'||
  typeof color!=='string'||!['green','yellow','blue','purple','red'].includes(color)||
  !Array.isArray(types)||!types.length||types.length>3||
  new Set(types).size!==types.length||
  types.some(x=>!['character','event','field'].includes(x))||
  !Array.isArray(s?.players?.[owner]?.outside))
  throw Error('Invalid outside printed-name count predicate');
 const names=new Set();
 for(const physical of s.players[owner].outside){
  if(!physical||typeof physical.uid!=='string'||
   !physical.uid.startsWith(owner+'-'))throw Error('Invalid outside physical owner');
  const d=printed(physical);
  if(!d||typeof d.name!=='string'||!d.name.trim()||
   !['character','event','field'].includes(d.type))
   throw Error('Invalid outside printed card face');
  if(d.color===color&&types.includes(d.type))names.add(d.name);
 }
 return names.size;
}

// Printed trigger icons among own OUTSIDE events of one color whose printed
// energy is at most the given number. Two copies of the same icon are one
// kind. A card with no trigger icon adds nothing. Raid under, hand, deck,
// and the opponent are not this zone. excludeUid drops the resolving card
// when the print says 他の.
export function countOwnOutsideEventTriggerKinds(s,owner,printed,{color,maxEnergy,excludeUid=null}={}){
 if(![0,1].includes(owner)||typeof printed!=='function'||
  !['green','yellow','blue','purple','red'].includes(color)||
  !Number.isInteger(maxEnergy)||maxEnergy<0||maxEnergy>30||
  (excludeUid!==null&&typeof excludeUid!=='string')||
  !Array.isArray(s?.players?.[owner]?.outside))
  throw Error('Invalid outside event trigger-kind count');
 const kinds=new Set();
 for(const physical of s.players[owner].outside){
  if(!physical||typeof physical.uid!=='string'||
   !physical.uid.startsWith(owner+'-'))throw Error('Invalid outside physical owner');
  if(excludeUid!==null&&physical.uid===excludeUid)continue;
  const d=printed(physical);
  if(!d||!cardCountsAsEvent(d)||d.color!==color||
   !Number.isInteger(d.energy)||d.energy>maxEnergy)continue;
  if(typeof d.trigger==='string'&&d.trigger)kinds.add(d.trigger);
 }
 return kinds.size;
}


// R53: physical own-OUTSIDE groups. This is a pure reusable piece for cards
// printing "every N cards in OWN outside", not a global cached power source.
// A Raid's buried base/undercards, HAND and opponent outside are NOT in this
// linear zone. For SLG-1-021, unit 5 is printed but later recovery and onAttack
// both need independently audited consumers.
export function countOwnOutsidePhysicalGroups(s,owner,unit){
 if(![0,1].includes(owner)||!Number.isInteger(unit)||unit<1||unit>200||
  !Array.isArray(s?.players?.[owner]?.outside))
  throw Error('Invalid own OUTSIDE physical group query');
 const seen=new Set();
 for(const physical of s.players[owner].outside){
  if(!physical||typeof physical.uid!=='string'||
   !physical.uid.startsWith(owner+'-')||seen.has(physical.uid))
   throw Error('Invalid/duplicated outside physical UID');
  seen.add(physical.uid);
 }
 return Math.floor(seen.size/unit);
}
