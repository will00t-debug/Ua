// [V2-B] Official BLEACH contribution to the shared title-pack registry.
// The 15 pre-existing BLEACH Pilots are supplied by registry.mjs; NEVER repeat
// them here.  Standalone and registry compile the SAME checked addon definitions.
// Every exported record is anchored to a fingerprint-checked official profile.
import {CARDS} from '../../cards.mjs?v=9.1.0';
import {BLEACH_V2_ADDON_PROFILES,BLEACH_V2_NEW_IDS,
 checkedBleachAddonDefinition} from '../bleach-pack.mjs';

const testForKind=Object.freeze({
 topOneEnergyDiscount:'tests/v2-r38-blc070-real.test.mjs',
  fieldDualMain:'tests/v2-r50-blc044-042-official.test.mjs',
  kyorakuAttackEnd:'tests/v2-r50-blc069-076-official.test.mjs',
  fieldRestRetireNamed:'tests/v2-r50-blc069-076-official.test.mjs',
  mayuriThreeMode:'tests/v2-r50-blc044-042-official.test.mjs',
 topTwoGoteiEvent:'tests/v2-r48-BLC-1-095-complete.test.mjs',
 raidStripOrRetire2000:'tests/v2-blc-023-official.test.mjs',
 bounce:'tests/universal-v2-bleach-port.test.mjs',
  raidStripOrRetireDamage2:'tests/v2-blc-024-official.test.mjs',
 restEnergyRetire:'tests/v2-blc-shared-rest-retire.test.mjs',
 onRetireDrawOne:'tests/v2-blc-shared-rest-retire.test.mjs',
 activeEnergy:'tests/universal-v2-bleach-port.test.mjs',
 impactNull:'tests/universal-v2-bleach-enemy-control.test.mjs',
 enemyBpDown1000:'tests/universal-v2-bleach-enemy-control.test.mjs',
 enemyBpDown500Color:'tests/universal-v2-bleach-enemy-control.test.mjs',
 restEnemy3500:'tests/universal-v2-bleach-enemy-control.test.mjs',
 retireBonusYamamoto:'tests/universal-v2-bleach-enemy-control.test.mjs',
 retireBonusRukia:'tests/universal-v2-bleach-enemy-control.test.mjs',
 traitBuffAllDraw:'tests/universal-v2-bleach-green-match.test.mjs',
 inspectTop2:'tests/universal-v2-bleach-top-inspect.test.mjs',
 inspectTop3:'tests/universal-v2-bleach-top-inspect.test.mjs',
 restEnemyFrontOne:'tests/universal-v2-bleach-enemy-control.test.mjs',
 restSelfEnemy:'tests/v2-blc-005-self-rest.test.mjs',
  enterActiveAttackRestSkip:'tests/v2-blc-006-official.test.mjs',
 drawPlayColorHand:'tests/universal-v2-bleach-nc-batch.test.mjs',
 buffOtherOwn1000:'tests/universal-v2-bleach-own-buff.test.mjs',
 peekTopOrBottom:'tests/universal-v2-bleach-new-top.test.mjs',
 inspectTopAnyOutside2:'tests/universal-v2-bleach-new-top.test.mjs',
 drawTwoDiscardOne:'tests/v2-blc-109-draw-discard-round13.test.mjs',
 frontBpDownMin1000:'tests/v2-bp-range-round13.test.mjs',
 readyOnFirstAttack:'tests/v2-ready-on-attack-round13.test.mjs',
 onRetireRestUnder2000:'tests/v2-onretire-rest-round14.test.mjs',
 restSelfBuffOther:'tests/v2-c1-blc-ready-reuse.test.mjs',
 readyOnFirstBlock:'tests/v2-c1-blc-ready-reuse.test.mjs',
 ownTurnNamedBp:'tests/v2-c1-blc-ready-reuse.test.mjs',
 opponentFieldHandEnergy:'tests/v2-c2-hand-energy-register.test.mjs',
 drawIfOwnEffectEntry:'tests/v2-c3-blc-mst-reuse.test.mjs',
 blockBpAtMost:'tests/v2-c3-blc-mst-reuse.test.mjs',
 frontDiscardDraw:'tests/v2-c4-blc-front-discard-draw.test.mjs',
 frontDiscardFieldBpDown:'tests/v2-c5-blc-front-discard-down.test.mjs',
 aliasPeekTopOutside:'tests/v2-c6-blc-alias-peek.test.mjs',
 optionalDiscardPeekDraw:'tests/v2-c8-blc-optional-peek-draw.test.mjs',
 aliasFieldRestEnergyRetire:'tests/v2-c10-blc-alias-field-energy.test.mjs',
 drawIfOppRestCharacter:'tests/v2-c16-conditional-board.test.mjs',
 drawIfOppCharacterBpAtLeast:'tests/v2-c16-conditional-board.test.mjs',
 activeOwnNamed:'tests/v2-c16-conditional-board.test.mjs',
 drawIfOwnNameAndHandFewer:'tests/v2-c17-name-hand-draw.test.mjs',
 onRetireOwnTurnNameRest:'tests/v2-c18-own-turn-name-rest.test.mjs',
 nameOncePayOutsideRest:'tests/v2-c19-name-pay-outside-rest.test.mjs',
 removeOutsideThen:'tests/v2-c20-outside-remove-draw.test.mjs',
 oppRestFrontBpEach:'tests/v2-c21-live-board-predicates.test.mjs',
 oppCurrentBpCountBonus:'tests/v2-c21-live-board-predicates.test.mjs',
 otherCardTraitEnergy:'tests/v2-c21-live-board-predicates.test.mjs',
 otherCardTraitBp:'tests/v2-c21-live-board-predicates.test.mjs',
 ownFrontPrintedApBp:'tests/v2-c21-live-board-predicates.test.mjs',
 handOutsideThisTurnBp:'tests/v2-c21-live-board-predicates.test.mjs',
 handEnergyBpImmune:'tests/v2-c22-designated-decks.test.mjs',
 impactNullMustBlock:'tests/v2-c22-designated-decks.test.mjs',
 retireFieldOrOutside:'tests/v2-c22-designated-decks.test.mjs',
 traitDiscardRecoverNamed:'tests/v2-c22-designated-decks.test.mjs',
 blockHandOutsideBp:'tests/v2-c22-designated-decks.test.mjs',
 traitlessTopDiscard:'tests/v2-c23-blue-shared.test.mjs',
 ichigoRaidSlash:'tests/v2-c23-blue-shared.test.mjs',
 zangetsuBlockFloor:'tests/v2-c23-blue-shared.test.mjs',
 orihimeEntry:'tests/v2-c23-blue-shared.test.mjs',
 ichigoImpactGrants:'tests/v2-c23-blue-shared.test.mjs',
 rirukaUnder:'tests/v2-c23-blue-shared.test.mjs',
 grimmjowOutsideEntry:'tests/v2-c23-blue-shared.test.mjs',
 getsugaRetire:'tests/v2-c23-blue-shared.test.mjs',
 zangetsuDraw:'tests/v2-c23-blue-shared.test.mjs',
 aizenEnergyFront:'tests/v2-c24-green-shared.test.mjs',
 raidBaseLeaveDamage:'tests/v2-c24-green-shared.test.mjs',
 restLockFrontUpgrade:'tests/v2-c24-green-shared.test.mjs',
 millRemoveScale:'tests/v2-c25-purple-shared.test.mjs',
 payDamageRemoveFour:'tests/v2-c25-purple-shared.test.mjs',
 purpleNamesTop:'tests/v2-c25-purple-shared.test.mjs',
 purpleApBpChoice:'tests/v2-c25-purple-shared.test.mjs',
 raidApDiscountChoice:'tests/v2-c25-purple-shared.test.mjs',
 raidDrawDiscardBuff:'tests/v2-c25-purple-shared.test.mjs',
 renjiPayDeploy:'tests/v2-c25-purple-shared.test.mjs',
 topSplitEnergyDraw:'tests/v2-c25-purple-shared.test.mjs',
 emptyRaidPeek:'tests/v2-c25-purple-shared.test.mjs',
 renjiEventRetire:'tests/v2-c25-purple-shared.test.mjs',
 ownTurnBpImmune:'tests/v2-c29-bleach-port.test.mjs',
 aliasFrontSoloBp:'tests/v2-c29-bleach-port.test.mjs',
 otherOwnRetireThisTurnBp:'tests/v2-c29-bleach-port.test.mjs',
 fieldBuffRecoverAp:'tests/v2-c29-bleach-port.test.mjs',
 chooseBuffOrFrontDown:'tests/v2-c29-bleach-port.test.mjs',
 stepAttackTraitBuff:'tests/v2-c29-bleach-port.test.mjs',
 impactPlusTrait:'tests/v2-c29-bleach-port.test.mjs',
 impactPlusPrintedAp:'tests/v2-c29-bleach-port.test.mjs',
 frontPrintedApBpEach:'tests/v2-c29-bleach-port.test.mjs',
 purpleIchigoBuff:'tests/v2-c29-bleach-port.test.mjs',
 restOnceSelfBp:'tests/v2-c29-bleach-port.test.mjs',
 oppFrontBelowPrintedBp:'tests/v2-c29-bleach-port.test.mjs',
 topFilterDiscard:'tests/v2-c29-bleach-port.test.mjs',
 namedHandRest:'tests/v2-c29-bleach-port.test.mjs',
 printedApTop:'tests/v2-c29-bleach-port.test.mjs',
 restFrontEnergy:'tests/v2-c29-bleach-port.test.mjs',
 discardGainEnergy:'tests/v2-c29-bleach-port.test.mjs',
 traitlessNoRaidTop:'tests/v2-c29-bleach-port.test.mjs',
 fieldRestRetireDraw:'tests/v2-c29-bleach-port.test.mjs',
 topSplitSides:'tests/v2-c29-bleach-port.test.mjs',
 bounceUnderFrontDraw:'tests/v2-c29-bleach-port.test.mjs',
 restRetirePurpleCharacter:'tests/v2-c29-bleach-port.test.mjs',
 traitlessLineMove:'tests/v2-c29-bleach-port.test.mjs',
 raidImpactFrontRest:'tests/v2-c29-bleach-port.test.mjs',
 frontMillBuffOther:'tests/v2-c29-bleach-port.test.mjs',
 namedBonusBuff:'tests/v2-c29-bleach-port.test.mjs',
 groupedTopDiscard:'tests/v2-c29-bleach-port.test.mjs',
 ownCharacterFrontRest:'tests/v2-c29-bleach-port.test.mjs',
 ownCharacterDrawImpact:'tests/v2-c29-bleach-port.test.mjs',
 peekAttackRemove:'tests/v2-c29-bleach-port.test.mjs',
 drawOrPrintedApDraw:'tests/v2-c29-bleach-port.test.mjs',
 revealOppTop:'tests/v2-c29-bleach-port.test.mjs',
 revealTraitOrNameOutside:'tests/v2-c29-bleach-port.test.mjs',
 chooseEnergyRevealOutside:'tests/v2-c29-bleach-port.test.mjs',
 optionalMillPurple:'tests/v2-c29-bleach-port.test.mjs',
 optionalEnergyBounce:'tests/v2-c29-bleach-port.test.mjs',
 stepOnceFrontOr:'tests/v2-c29-bleach-port.test.mjs',
 replayOnPlayDown:'tests/v2-c29-bleach-port.test.mjs',
 stepDrawNameActive:'tests/v2-c29-bleach-port.test.mjs',
 reducedFrontNameActive:'tests/v2-c29-bleach-port.test.mjs',
 outsideAbsentFieldNameBp:'tests/v2-c29-bleach-port.test.mjs',
 restRetireZeroIchigo:'tests/v2-c29-bleach-port.test.mjs',
 discardBlockAtLeast:'tests/v2-c29-bleach-port.test.mjs',
 emptyStepRetireDown:'tests/v2-c29-bleach-port.test.mjs',
 impactDiscardApActive:'tests/v2-c29-bleach-port.test.mjs',
 aliasColorTopOutside:'tests/v2-c29-bleach-port.test.mjs',
 entryTurnChooseDraw:'tests/v2-c29-bleach-port.test.mjs',
 restFrontNameOnce:'tests/v2-c29-bleach-port.test.mjs',
 frontDiscardFieldDown:'tests/v2-c29-bleach-port.test.mjs',
 handOutsideTraitlessRest:'tests/v2-c29-bleach-port.test.mjs',
 energyApRestBuff:'tests/v2-c29-bleach-port.test.mjs',
 chooseBuffOrAttackEndRetire:'tests/v2-c29-bleach-port.test.mjs',
 discardVisoredRest:'tests/v2-c29-bleach-port.test.mjs',
 raidHostAny:'tests/v2-c29-bleach-port.test.mjs',
 blockRaidBp:'tests/v2-c29-bleach-port.test.mjs',
 raidOrNameRetire:'tests/v2-c29-bleach-port.test.mjs',
 frontRestOrSkipDraw:'tests/v2-c29-bleach-port.test.mjs',
 frontRestSkipOrRetire:'tests/v2-c29-bleach-port.test.mjs',
 handApWhileByakuya:'tests/v2-c29-bleach-port.test.mjs',
 bazzBurnRetire:'tests/v2-c29-bleach-port.test.mjs',
 katenEnergyActive:'tests/v2-c29-bleach-port.test.mjs',
 bambiesPerBp:'tests/v2-c29-bleach-port.test.mjs',
 kenpachiEnergyFront:'tests/v2-c29-bleach-port.test.mjs',
 mayuriTraitRetire:'tests/v2-c29-bleach-port.test.mjs',
 nemSquadActivePair:'tests/v2-c29-bleach-port.test.mjs',
 soulPalaceTop:'tests/v2-c29-bleach-port.test.mjs',
 kyokotsuField:'tests/v2-c29-bleach-port.test.mjs',
 hakkokenChoose:'tests/v2-c29-bleach-port.test.mjs',
 yachiruNamedGrant:'tests/v2-c29-bleach-port.test.mjs',
 lilottoRetireChoice:'tests/v2-c29-bleach-port.test.mjs',
 bazzSacrificeChain:'tests/v2-c29-bleach-port.test.mjs',
 nanaoStepEventActive:'tests/v2-c29-bleach-port.test.mjs',
 removedKeywordIchigo:'tests/v2-c29-bleach-port.test.mjs',
 frontEnergyBattleRemove:'tests/v2-c29-bleach-port.test.mjs',
 yoruichiFirstAttack:'tests/v2-c29-bleach-port.test.mjs',
 lilleEntrySacrifice:'tests/v2-c29-bleach-port.test.mjs',
 giselleRestRetireDouble:'tests/v2-c29-bleach-port.test.mjs',
 sternritterCastleReplay:'tests/v2-c29-bleach-port.test.mjs',
 uryuSwapOrBuff:'tests/v2-c29-bleach-port.test.mjs',
 yoruichiEnergySwap:'tests/v2-c29-bleach-port.test.mjs',
 bazzDiscardBattleKit:'tests/v2-c29-bleach-port.test.mjs',
 ichigoRemoveFourImpact:'tests/v2-c29-bleach-port.test.mjs',
 bambiettaRestRetire:'tests/v2-c29-bleach-port.test.mjs',
 jugramTriggerEnd:'tests/v2-c29-bleach-port.test.mjs',
 byakuyaOutsideRemove:'tests/v2-c29-bleach-port.test.mjs',
 soiFonNextStartRetire:'tests/v2-c29-bleach-port.test.mjs',
 techLookHandOutside:'tests/v2-c29-bleach-port.test.mjs',
 yamamotoSquadShift:'tests/v2-c29-bleach-port.test.mjs',
 giselleFieldCountActive:'tests/v2-c29-bleach-port.test.mjs',
 orihimeIchigoProtect:'tests/v2-c29-bleach-port.test.mjs',
 byakuyaRukiaApChoice:'tests/v2-c29-bleach-port.test.mjs',
 rukiaFrontApRestLock:'tests/v2-c29-bleach-port.test.mjs',
 nemSquadLook:'tests/v2-c29-bleach-port.test.mjs',
 mayuriNemSquadRest:'tests/v2-c29-bleach-port.test.mjs',
 shutaraHandScale:'tests/v2-c29-bleach-port.test.mjs',
 ichibeEnergyReveal:'tests/v2-c29-bleach-port.test.mjs',
 shatatsuHandCap:'tests/v2-c29-bleach-port.test.mjs',
 shirafudeLock:'tests/v2-c29-bleach-port.test.mjs',
 jugramEntryEnergy:'tests/v2-c29-bleach-port.test.mjs',
 bazzRequiredEnergyActive:'tests/v2-c29-bleach-port.test.mjs',
 jugramRaidAura:'tests/v2-c29-bleach-port.test.mjs',
 uryuHandFront:'tests/v2-c29-bleach-port.test.mjs',
 gerardLifeOrHand:'tests/v2-c29-bleach-port.test.mjs',
 ichibeRemoveChoice:'tests/v2-c29-bleach-port.test.mjs',
 ichibeRetirePlay:'tests/v2-c29-bleach-port.test.mjs',
 nemuStartSacrifice:'tests/v2-c29-bleach-port.test.mjs'
});
function contributedEntry(profile){
 // Fails closed for missing/changed printed source, stats, text or unknown DSL.
 const definition=checkedBleachAddonDefinition(profile);
 const original=CARDS.find(x=>x.identity===profile.id);
 if(!original)throw Error('Missing BLEACH official source for '+profile.id);
 // The legacy gen=2 for EX15BT/BLC-4-014 describes the ACTIVE total, not
 // the printed REST base. SourceRecord is the normalized printed card record;
 // retain original.gen separately and require the profile fingerprint above.
 const normalized=['BLC-4-014','BLC-4-042','BLC-4-074','BLC-4-024','BLC-4-063','BLC-4-037','BLC-4-071','BLC-4-006','BLC-4-051','BLC-4-077','BLC-4-065','BLC-4-016','BLC-4-017','BLC-4-032','BLC-4-011','BLC-4-055'].includes(profile.id);
 const sourceRecord=Object.freeze(normalized?
  {...original,gen:definition.gen,legacyImportedGen:original.gen}: {...original});
 const vanilla=['plain','plainAlt','step'].includes(profile.kind);
 return Object.freeze({
  id:profile.id,sourceRecord,
  definition:Object.freeze(definition),
  evidence:Object.freeze({
   printedTextFragments:Object.freeze([profile.effect]),
   reviewNote:profile.id==='BLC-4-041'?
    'EX15BT/BLC-4-041 official page 2026-10-27. Required energy 青4. Generated energy is 青, so gen stays 1. BP is 5000. AP is 1. At the start of this character\'s own turn, after the turn-start draw, retire this character. That retirement uses the on-retire sentence. Silence before that start leaves the character on the field. On play, only while own front has 涅 マユリ, you may retire one other own character. Q2321 (2026-09-04): 涅 マユリ on the front is a legal choice. An energy-line 涅 マユリ does not open the choice. A field is not a character. This character is not its own target. An energy-line character is a legal target. Declining retires nothing and does not grant ACTIVE, mandatory block, or Impact. Zero other characters do not open the choice. On success, this character becomes ACTIVE and, this turn, the opponent must block its attack when a block is possible. Q2322 (2026-09-04): the opponent designates one character that can block. If none can block, the attack deals damage. The same success also grants Impact 1 this turn. Impact applies when this character wins a battle, not on a direct attack. On retire, this card moves from outside into the removed area. Silence before retirement leaves it outside. COLOR bounces one opposing front character of BP 3500 or less to hand. Trait 護廷十三隊.':
   profile.id==='BLC-4-056'?
    'EX15BT/BLC-4-056 official page 2026-10-27. Required energy 紫4. Generated energy is 紫, so gen stays 1. AP is 2. On play, draw 1. You may put one hand card with trait 零番隊 into the removed area. Doing so sets this character ACTIVE. Declining leaves it REST and does not remove a card. A hand card without that trait cannot be chosen. Zero matching hand cards do not open the choice. GET is the generic sentence. Q2343 (2026-09-11) asks このカードの訂正後の効果について教えてください。 The answer replaces 登場させるキャラ with 登場させるカード. On retire, this card is put into the removed area, then up to one purple AP-1 card may REST-enter from hand when it is 黒崎 一護, 霊王宮, or trait 零番隊. Printed required energy starts at 0 or less and increases by 1 for each distinct 零番隊 name already in the removed area, including this card after it moves. That number is a filter, not a payment. The entry does not pay required energy or AP, and it resolves on-play. A character may enter the front or the energy line REST. A field enters the energy line. Declining the entry is legal. Zero matching hand cards do not open it. A card of another color, AP, name, or trait cannot be chosen. Silence before retirement leaves this card outside and does not offer the entry. Putting this card into the removed area without retiring it does not use the sentence. Trait 零番隊.':
   profile.id==='BLC-4-055'?
    'EX15BT/BLC-4-055 official page 2026-10-27. Required energy 紫3. Catalogue gen=3 is the purple3 sprite; official generated energy is 紫紫, so definition.gen=2 and legacyImportedGen=3. On play, you may put one other own character into the removed area. That move is removal, not retirement, so the removed character does not use its on-retire text. A field is not a character. This character is not its own target. An energy-line character is a legal target. Declining is legal, and then neither mode happens. Zero other characters do not open the choice. After a successful removal, choose one. Mode one: this turn, the next hand use of a card with trait 零番隊 or the name 霊王宮 has AP-1. Q2328 (2026-09-04): using a card that does not match does not remove the discount. The discount ends at the end of this attack phase. A field named 霊王宮 matches. Mode two: up to two other own characters with trait 零番隊 gain BP+2000 this turn. Choosing fewer than two is legal. A character without that trait is not a choice. This character is not a choice. The removed character is already gone. No trigger. Trait 零番隊.':
   profile.id==='BLC-4-015'?
    'EX15BT/BLC-4-015 official page 2026-10-27. Required energy 黄5. Generated energy is 黄, so gen stays 1. When this card is put outside, it is placed outside and then put from outside onto the bottom of its owner deck. Q2432 (2026-10-23): that includes the field, hand, deck, life, removed area, a raid-under card, and a facedown card under a field card. Q2433 (2026-10-23): if this card had lost its original effects and was then put outside from the field, the replacement does not happen and the card stays outside. A life card whose trigger still offers a choice stays outside until that choice finishes. GET to hand does not also put it on the bottom. Skipping that trigger, or resolving a trigger that leaves the card outside, then puts it on the bottom. A life card with no trigger choice is put on the bottom immediately. [起動メイン][フロントLにある場合][ターン1]: retire one other own character. The retirement is mandatory. A field is not a character. This character is not its own target. The energy line cannot activate. Zero other characters do not offer the activate, so the once is not consumed. [ターン1] is this physical card and is spent when the activate resolves, before the retirement finishes. A second copy can still activate. Silence before the activate removes it. If the character actually leaves, set this character ACTIVE, look at the top 3 of the own deck, add one to hand, and put the rest on the bottom in any order. The look is private. One or zero remaining cards are placed without an order choice. An empty deck still ACTIVES and looks at nothing. If the retired character live required energy was 4 or more, this character gets BP+1000 until its next own turn start. That live number includes a this-turn increase. A printed energy below 4 does not grant the BP. Protecting the retirement does not ACTIVE, look, or grant the BP, and the once stays spent. GET is the generic sentence. Trait 星十字騎士団.':
   profile.id==='BLC-4-005'?
    'EX15BT/BLC-4-005 official page 2026-10-27. Required energy 黄4. Generated energy is 黄, so gen stays 1. On retire, choose up to one mode. Decline is legal. Mode one adds any one own life card to hand. Q2303 (2026-09-25): that card is not revealed and is not trigger-checked. Doing so REST-enters this card on the own field, front or energy. The entry does not pay required energy or AP, and it resolves on-play as an own character effect. Q2304 (2026-09-04): if life becomes 0, the loss is declared after this effect finishes, including the REST entry. Mode two puts exactly two own hand cards outside. Doing so adds this card to hand. Fewer than two hand cards cannot choose that mode. Zero life cards cannot choose the life mode. The opponent life and hand do not count. ACTIVE is the generic sentence. Trait 星十字騎士団.':
   profile.id==='BLC-4-004'?
    'EX15BT/BLC-4-004 official page 2026-10-27. Required energy 黄4. Generated energy is 黄, so gen stays 1. Impact null: the character that battles this one loses Impact for that battle. Silence before the battle removes that sentence. A direct attack is not a battle. [起動メイン][APを1支払う] only while this card is in the controller hand. Pay 1 AP, then put 4 or more own removed 黒崎 一護 outside. Doing so enters this card ACTIVE on the own front. The entry does not pay required energy or a second AP, and it resolves on-play as an own character effect. Fewer than 4 still move, and the entry does not happen. Zero matching cards pay the AP and enter nothing. A card with another name stays. The opponent removed area does not count. An audited alias of the printed name counts. Q2302 (2026-09-04): two copies in hand share this one activate. A field copy cannot activate it. The energy line is not a destination. ACTIVE is the generic sentence. Trait 星十字騎士団.':
   profile.id==='BLC-4-012'?
    'EX15BT/BLC-4-012 official page 2026-10-27. Required energy 黄4. Generated energy is 黄, so gen stays 1. Raid onto ユーグラム・ハッシュヴァルト, become ACTIVE, and may move to the front. While this character is in raid state on the front, when another own character retires, you may draw 1. Q2307 (2026-09-04): two raid-state copies share that one draw. A field retirement is not a character. This character retiring is not another character. Declining the draw still uses the once. The energy line is not the front. Silence before the retirement removes the trigger. While this character is in raid state, on the front, during its own turn, every other own character\'s required energy increases by 2. Two such copies add 2 each. The increase is live: it ends when this character leaves the front, leaves raid state, is silenced, or the turn passes to the opponent. It is not the one-turn grant from BLC-4-011, and the two add together. This character is not its own target. A field is not a character. On play, if every own field card has no trait other than 星十字騎士団, you may REST-play up to one yellow character from hand with printed required energy 2 or less and AP 1. Q2306 (2026-09-04): a traitless card still satisfies that gate. A card with any other trait blocks it. Printed required energy is the hand check. Declining the entry is legal. The on-play is not limited to raid state. RAID is the generic sentence. Trait 星十字騎士団.':
   profile.id==='BLC-4-007'?
    'EX15BT/BLC-4-007 official page 2026-10-27. Required energy 黄4. Generated energy is 黄, so gen stays 1. [起動メイン]: only while own outside has no ユーハバッハ and this character\'s live required energy is 5 or more, set this character ACTIVE. The energy line is legal. A field is not this character. Printed energy 4 cannot activate. A this-turn increase of 2, including the one from BLC-4-011, is part of that live number. A hand discount is not. Own outside ユーハバッハ blocks the activate, and that printed name still matches. A different outside name does not. An own-field ユーハバッハ does not. The opponent\'s outside does not. Q2305 (2026-09-04): two copies share this one activate. The sentence is this effect, not every ability of the name. Silence before activation removes it. Becoming ACTIVE remains after later silence. The activate does not ask for a decline. No trigger. Trait 星十字騎士団.':
   profile.id==='BLC-4-011'?
    'EX15BT/BLC-4-011 official page 2026-10-27. Required energy 黄3. Catalogue gen=3 is the yellow3 sprite; official generated energy is 黄黄, so definition.gen=2 and legacyImportedGen=3. On play, draw 1 and put one hand card outside. The discard is mandatory while the hand is not empty. [起動メイン][ターン1] only on the turn this physical card entered. Choose another own character; this turn its required energy increases by 2. An energy-line character is a legal target. A field is not a character. This character is not its own target. Declining is illegal. Zero other characters do not offer the activate, so the once is not consumed. [ターン1] is this physical card. Silence before activation removes the ability. The earned increase remains after later silence and after this character leaves. A different physical copy stays at its printed energy. The same physical card returned to hand this turn still carries the increase into a hand play. It ends when the turn ends. COLOR rests one opposing front character and skips its next ACTIVE. No card FAQ. Trait 星十字騎士団.':
   profile.id==='BLC-4-057'?
    'EX15BT/BLC-4-057 official iframe 2026-10-27. Up to one opposing front character, until the controller next own turn start, loses every printed effect and cannot attack or block. Q2329 (2026-09-04): 元々の効果 is the text printed on that card. Q2330 (2026-09-04): Raid state remains, and the text enclosed by the Raid is negated. Q2331 (2026-09-04): a double block gained from another card remains. Q2332 (2026-09-04): effects already gained remain, including a this-turn BP modifier; a printed continuous reference is lost. Q2333 (2026-09-04): a printed leave trigger does not fire. Declining the character is legal. An energy-line character is not a choice. A field is not a character. If own field or the removed area has 兵主部 一兵衛, draw 2 and put one hand card into the removed area. That removal is mandatory. Silence keeps the printed name. No such card skips the draw. SPECIAL retires one opposing front character. No generated energy.':
   profile.id==='BLC-2-061'?
    'EX07BT/BLC-2-061 official page 2026-10-27. Required energy 紫4. Generated energy is a dash, so gen stays 0. Put up to 3 own hand cards with trait 零番隊 into the removed area, including zero. Then retire one opposing front character. The choice is mandatory while a legal character exists. The BP cap starts at 3000 and increases by 1000 for each card this effect removed. Then draw 1 for each card this effect removed. Zero removed cards do not draw. A card without that trait cannot be removed. An energy-line card is not in hand. Choosing zero still opens the 3000 retirement. Declining that retirement is illegal. An energy-line character is not a front character. A field is not a character. No matching hand card skips the removal and opens the 3000 retirement. The fourth matching hand card cannot be removed. SPECIAL retires one opposing front character with no BP cap. No card FAQ. Trait 無.':
   profile.id==='BLC-2-060'?
    'EX07BT/BLC-2-060 official page 2026-10-27. Required energy 紫4, generated energy 紫. On play, look at the top 4 of the own deck and put them back on top in any order. The look is private. Fewer than 4 cards orders only the cards that exist. An empty deck looks at nothing. Playing onto the energy line still looks. On attack, name one required-energy number from 0 through 30, then reveal the own top card. The number is chosen before the reveal. If the printed required energy matches, the card may be added to hand. Adding it then puts one own hand card into the removed area, and that removal is mandatory. The added card is a legal removal. Declining the hand add puts the revealed card back on top. A mismatch also leaves the revealed card on top and does not remove a hand card. An energy-line card is not the top of the deck. An empty deck names nothing. Silence before the attack removes the attack text. COLOR ACTIVE-plays one own outside purple character of required energy 2 or less and AP 1 onto the own front. A field is not a character. Required energy 3 does not match. AP 2 does not match. The energy line is not a destination. The entered character resolves its on-play. COLOR is the generic sentence. No card FAQ. Trait 零番隊.':
   profile.id==='BLC-2-057'?
    'EX07BT/BLC-2-057 official page 2026-10-27. Required energy 紫4, generated energy 紫. Raid onto 修多羅 千手丸, become ACTIVE, and may move to the front. On play, put any number of own hand cards with trait 零番隊 into the removed area, including zero. Then retire up to one opposing front character. The BP cap starts at 2500 and increases by 1000 for each card this effect removed. A card without that trait cannot be removed. An energy-line card is not in hand. Choosing zero still opens the 2500 retirement. Declining the retirement leaves the removed cards removed. An energy-line character is not a front character. A field is not a character. No matching hand card skips the removal and opens the 2500 retirement. RAID is the generic sentence. No card FAQ. Trait 零番隊.':
   profile.id==='BLC-2-038'?
    'EX07BT/BLC-2-038 official page 2026-10-27. Required energy 青4, generated energy 青. Raid onto 涅 マユリ, become ACTIVE, and may move to the front. On play, up to one own field character that is 涅 ネム or has trait 涅骸部隊 gets BP+1000 and Impact 1 this turn. Declining grants nothing. This character is 護廷十三隊 named 涅 マユリ, so it is not its own target. A field is not a character. An energy-line character is a legal target. Zero targets open nothing. A card that matches both the name and the trait is still one card. [起動メイン][フロントLにある場合][ターン1] only after an own character retired this turn. Then REST-play one outside blue AP-1 character that is 涅 ネム or has 涅骸部隊. Required energy is not a filter. A printed Raid name still enters REST. Declining that entry is illegal. Zero outside targets do not offer the activate, so the once is not consumed. The energy line cannot activate. [ターン1] is this physical card and is spent when the activate resolves, before the entry finishes. A second copy can still activate. Silence before the activate removes it. The entered character resolves its on-play as an own character effect. RAID is the generic sentence. No card FAQ. Trait 護廷十三隊.':
   profile.id==='BLC-2-035'?
    'EX07BT/BLC-2-035 official page 2026-10-27. Required energy 青3, generated energy 青青. [起動メイン][ターン1]: retire one own character with trait 涅骸部隊. The retirement is mandatory. This character trait is 護廷十三隊, so it is not its own target. A field with that trait is not a character. An energy-line character is a legal target. The energy line may activate. Zero matching characters do not offer the activate, so the once is not consumed. On success, look at the top 4 of the own deck. Up to one of 涅 マユリ, 涅 ネム, or trait 涅骸部隊 may be revealed and added to hand. A card that matches more than one of those is still one card. Declining the hand add is legal. The rest go to the bottom in any order. A window with no match goes straight to that order. An empty deck looks at nothing. The look is private. The card added to hand is public. The unordered window stays private. [ターン1] is this physical card and is spent when the activate resolves, before the look finishes. A second copy can still activate. Silence before the activate removes it. No trigger. No card FAQ. Trait 護廷十三隊.':
   profile.id==='BLC-2-034'?
    'EX07BT/BLC-2-034 official page 2026-10-27. Required energy 青4, generated energy 青. Raid onto 朽木 ルキア, become ACTIVE, and may move to the front. On play, only while this character is on the front, choose up to one opposing front character and REST it. Q1040 (2024-07-19): a Raid on-play is checked after the Raid has become ACTIVE and, if chosen, moved to the front. Staying on the energy line does not open the REST. Playing onto the energy line does not open it. Q1039 (2024-07-19): 元々の消費AP is the printed AP. During this character controller turn, if the own front has a character whose printed AP is 2 or more, the chosen character also cannot become ACTIVE until this character leaves the front. This character printed AP is 1, so it does not satisfy that gate by itself. An energy-line character does not count. A printed AP of 1 does not count. Declining rests nothing. The lock remains after this character loses its original effects. Moving this character from the front to the energy line ends the lock. The opponent turn, including a life Raid, rests without the lock. RAID is the generic sentence. Trait 護廷十三隊.':
   profile.id==='BLC-2-030'?
    'EX07BT/BLC-2-030 official page 2026-10-27. Required energy 青4, generated energy 青. On play, choose one. Mode 1: if a 朽木 ルキア entered the controller field this turn, up to one own AP card may become ACTIVE. A Rukia placed without entering does not open it. Choosing the mode with no such entry readies nothing. Declining the AP card is legal. Mode 2: the next 朽木 ルキア played from hand this turn has AP-1. Playing a different card does not consume it. The discount ends at the end of this attack phase. On attack, draw 1. COLOR returns one opposing front character of BP 3500 or less to hand. No card FAQ. Trait 護廷十三隊.':
   profile.id==='BLC-2-013'?
    'EX07BT/BLC-2-013 official page 2026-10-27. Required energy 青2, generated energy 青. When a blue 黒崎 一護 on the controller field puts this card from hand to outside by that character effect, the controller may choose up to one own field 黒崎 一護. Until the next own turn start, opposing character effects and trigger effects that choose a target cannot select it. Q1030 (2024-07-19): an effect written with 選び cannot select the protected character. Q1031 (2024-07-19): the when-put-outside effect still starts when the required energy to play this card is not met, because the move is not a play. Declining the choice grants nothing. An energy-line 黒崎 一護 is a legal target. A character with another name is not. A blue character that is not 黒崎 一護 does not cause it. A yellow character that is not 黒崎 一護 does not cause it. The source may already be in outside when the grant resolves. An opposing event effect can still select the protected character. The protection ends at the controller next own start. DRAW is the generic sentence. Trait 無.':
   profile.id==='BLC-2-009'?
    'EX07BT/BLC-2-009 official page 2026-10-27. Required energy 黄4, generated energy 黄. On play, if other own field cards with trait バンビーズ, trait ゾンビ, or the name バンビエッタ・バスターバイン total at least 3, draw 2 and put 2 hand cards outside. Each other card counts once. This character does not count. A field card counts. Two other cards do not draw. [起動メイン][フロントLにある場合][ターン1]: retire one own character that does not have ゾンビ. The retirement is mandatory. This character is a legal target. A character with ゾンビ is not. A field is not. On success, up to one own outside yellow character with ゾンビ may enter ACTIVE. Declining that entry is legal. No such outside card opens nothing. [ターン1] is this physical card. The energy line cannot activate. The entered character resolves its on-play as an own character effect. GET is the generic sentence. No card FAQ. Trait 星十字騎士団／バンビーズ.':
   profile.id==='BLC-1-093'?
    'UA08BT/BLC-1-093 official page 2026-10-27. Required energy 緑7, generated energy 緑. Raid onto 山本 元柳斎 重國, become ACTIVE, and may move to the front. Impact 1. On play, move any number of own energy-line cards with trait 護廷十三隊 to the front. Zero is legal. A field cannot enter the front line. A full front line cannot receive them. Declining leaves every energy-line card where it is. A moved character keeps its ready state. On attack, every other own field card with trait 護廷十三隊 gets BP+2000 this turn. This character is not included. An energy-line character is included. Silence removes the printed Impact and the attack buff. RAID is the generic sentence. No card FAQ. Trait 護廷十三隊.':
   profile.id==='BLC-1-063'?
    'UA08BT/BLC-1-063 official page 2026-10-27. Required energy 紫2. Generated energy is a dash, so gen stays 0. Look at the top 5 of your deck. Add 1 to hand and put 1 outside. Put the rest on the bottom in any order. The look is private. The card added to hand is not revealed. Both selections are mandatory while a card remains. One inspected card goes to hand and does not go outside. Two inspected cards go one to hand and one outside, with nothing left to order. An empty deck does nothing. Cards under the window stay above the ordered remainder. DRAW is the generic sentence. No card FAQ. Trait 無.':
   profile.id==='BLC-1-055'?
    'UA08BT/BLC-1-055 official iframe 2026-10-26. Required energy 紫4, generated energy 紫. [起動メイン][フロントLにある場合][APを1支払う][ターン1]: choose up to one opposing front character of BP 3500 or less. At the next opponent turn start, retire that character, then REST this character and move it to the energy line. Q564 (2023-09-25): if the chosen character left during the turn it was chosen, this character still rests and moves. Q565 (2023-09-25): if another card raided onto the chosen character during that turn, the Raid top does not retire, and this character still rests and moves. Declining the choice pays the AP and schedules nothing. No legal target schedules nothing. [ターン1] is this physical card. The energy line cannot activate. A field is not a character. Later silence does not cancel a choice already made. DRAW is the generic sentence. Trait 護廷十三隊.':
   profile.id==='BLC-1-050'?
    'UA08BT/BLC-1-050 official iframe 2026-10-26. Required energy 紫5, generated energy 紫. Raid onto 朽木 白哉, become ACTIVE, and may move to the front. On play, you may remove 2 own outside cards. If you do, every opposing front character gets BP-1000 this turn. Q561 (2023-09-25): with only 1, that card can still be removed, and the BP cut does not happen. Declining removes nothing. An energy-line character is not cut. A character reduced to 0 BP or less leaves. [起動メイン][ターン1]: remove 3 own outside cards. That exact count grants Impact 1 this turn. Q562 (2023-09-25): activating with only 2 still removes those 2, and Impact does not happen. The main removal is not optional. [ターン1] is this physical card. The earned Impact remains after later silence. On attack, you may remove 1 own outside card. If you do, up to one opposing front character gets BP-1000 this turn. Declining the removal or the target is legal. Silence before the attack removes that clause. RAID is the generic sentence. Trait 護廷十三隊.':
   profile.id==='BLC-1-020'?
    'UA08BT/BLC-1-020 official iframe 2026-10-26. Required energy 黄5, generated energy 黄. Raid onto ユーグラム・ハッシュヴァルト, become ACTIVE, and may move to the front. Impact 1. While on the front, at the end of your attack phase, if the opponent activated a trigger effect this turn, draw 2 and put one hand card outside. Q538 (2023-09-25): declining a revealed trigger does not count. Q539 (2023-09-25): two front copies both resolve. Q540 (2023-09-25): a copy that left the front, including one retired by a SPECIAL trigger, does not resolve. An energy-line copy is queued and does nothing. Silence before the attack-end window removes it. On play, if your hand has fewer cards than the opponent, the opponent puts one hand card outside. Q541 (2023-09-25): equal hand counts do not discard. A larger hand does not discard. The comparison is after this card has left the hand. The opponent discard is mandatory. RAID is the generic sentence. No extra card FAQ.':
   profile.id==='BLC-1-014'?
    'UA08BT/BLC-1-014 official iframe 2026-10-26. Required energy 黄4, generated energy 黄. Raid onto バンビエッタ・バスターバイン, become ACTIVE, and may move to the front. On play, during your turn, retire up to one opposing front character that is REST. An ACTIVE front character, an energy-line character, and a field are not targets. Declining is legal. The clause does not start on the opponent turn, including a life Raid. Silence before the on-play is queued removes it. RAID is the generic sentence. No card FAQ.':
   profile.id==='BLC-1-104'?
    'UA08ST/BLC-1-104 official iframe 2026-10-26. Raid onto 黒崎 一護, become ACTIVE, and may move to the front. [起動メイン][ターン1]: place 4 own outside cards into the removed area. On that exact count, draw 1 and gain Impact 1 this turn. Q574 (2023-09-25): activating with only 3 still removes those 3, and the draw and Impact do not happen. The removal is not optional. [ターン1] is this physical card. Silence before activation removes the ability. The earned Impact remains after later silence. Generated energy is 紫. RAID is the generic sentence. No extra card FAQ.':
   profile.id==='BLC-1-011'?
    'UA08BT/BLC-1-011 official iframe 2026-10-26. [起動メイン][手札を1枚場外に置く]. No [ターン1]. The discard is mandatory and this physical card may pay it again the same turn. Success grants Damage 2 and a battle-win draw for this turn. Q537 (2023-09-25): a battle win is an attack against a character whose BP is less than or equal to the attacker. A direct attack deals the Damage 2 and does not draw. Declining the discard is illegal. An empty hand makes the activate illegal. The energy line is legal. Silence before activation removes the ability. Later silence removes the unfired battle-win draw. The resolved Damage 2 remains. DRAW is generic. Generated energy is 黄. No extra card FAQ.':
   profile.id==='BLC-4-032'?
    'EX15BT/BLC-4-032 official iframe 2026-10-26. On its own turn, BP+1000 while own field has 黒崎 一護 or 浦原 喜助. Silence removes that bonus and keeps both printed names. [エナジーLにある場合][ターン1]: when an own character\'s attack ends, this energy-line character may swap with one own front character that has not attacked this turn. Q2314 (2026-09-04): after the battle, and after a life-damage trigger check. Declining is legal and uses this physical card\'s once. The attacker is not a choice. A character that cannot enter the energy line is not a choice. A front-line copy does not offer the swap. Silence before the window removes it. [ターン1] is this physical card, so another copy can still swap. Catalogue gen=3 is the blue3 sprite; official generated energy is 青青, so definition.gen=2 and legacyImportedGen=3. COLOR returns one opposing front character of BP 3500 or less to hand. No card FAQ beyond Q2314.':
   profile.id==='BLC-2-002'?
    'EX07BT/BLC-2-002 official iframe 2026-10-26. [起動メイン][手札を1枚場外に置く][ターン1]. The discard is a mandatory cost. Then choose one: swap one own front character with one own energy character, or this character gets BP+1000 this turn. While own field has ユーハバッハ, both may be chosen, and choosing only one stays legal. [ターン1] is this physical card. This character may be one side of the swap. A character that cannot enter the destination line is not a choice. Fields are not characters. Silence before activation removes the ability. The earned BP remains after later silence. Silence keeps ユーハバッハ\'s printed name. DRAW is generic. Generated energy is 黄黄, so gen stays 2. No card FAQ.':
   profile.id==='BLC-1-028'?
    'UA08BT/BLC-1-028 official iframe 2026-10-26. On play, look at the top 3. Up to one card with trait 星十字騎士團 may be revealed and added to hand. The rest go to the bottom in any order. Taking a card does not discard. [起動メイン][レストにする]: this field stays and becomes REST. Retire one other own character. That retirement is mandatory, and with no other character the activate is illegal. On success, activate this field\'s 登場時 again. Silence before activation removes the ability. Silence before the replay removes the on-play. The field is not a legal sacrifice. GET is the generic add-to-hand sentence. Generated energy is 黄. No card FAQ.':
   profile.id==='BLC-4-017'?
    'EX15BT/BLC-4-017 official iframe 2026-10-26. On play, draw 1 then put one hand card outside. [起動メイン][レストにする][このカードを退場させる]: choose one other own character with trait 殭屍 and grant 2回アタック this turn. Q79 (2023-03-17): the first attack rests the character, then sets it ACTIVE. Q2308 (2026-09-04): two copies share that one activate. Catalogue gen=3 is the yellow3 sprite; official generated energy is 黄黄, so definition.gen=2 and legacyImportedGen=3. The printed composites 護廷十三隊／殭屍 and 星十字騎士團／殭屍 are audited trait components, so 殭屍 counts. Giselle herself is not 殭屍. The target must still be on the field after she leaves. Declining is illegal. Silence on Giselle removes the ability. The earned double attack remains after later silence on the chosen character. ACTIVE is generic. No extra card FAQ.':
   profile.id==='BLC-4-016'?
    'EX15BT/BLC-4-016 official iframe 2026-10-26. Official generated energy is 黄黄+. The plus is this ability\'s extra yellow, not a third resting pip. Catalogue gen=4; definition.gen=2 and legacyImportedGen=4. [起動メイン][ターン1] only on the turn this character entered. Retire one other own character. That retirement is mandatory. On success, this character generates one extra yellow until the next own turn start, then choose one: draw 1, or up to one opposing front character whose live BP is 1500 or more gets BP-1000 this turn. Choosing the BP mode and then declining the target is legal, and the energy still happens. [ターン1] is this physical card. Silence before activation removes the ability. The earned energy remains after later silence. The extra yellow is produced while this character is generating. ACTIVE is generic. Trait 星十字騎士團. No card FAQ.':
   profile.id==='BLC-4-044'?
    'EX15BT/BLC-4-044 official iframe 2026-10-26. Choose one own field 四楓院 夜一. This turn that character gets BP+2000. On its first attack this turn, until that attack ends, it gains Impact 1 and sniper. The choice is mandatory. Silence keeps the printed name. The kit is an earned grant and remains after later silence. SPECIAL retires one opposing front character. No generated energy. No card FAQ.':
   profile.id==='BLC-1-092'?
    'UA08BT/BLC-1-092 official iframe 2026-10-26. This character also generates energy from the front line. Q572 (2023-09-25): on its controller\'s turn, an opposing character that loses a battle to it is placed in the removed area instead of retiring, and its leave trigger does not fire. Silence removes both clauses. COLOR deploys one green hand character of required energy 2 or less and printed AP 1, ACTIVE. Generated energy is 緑.':
   profile.id==='BLC-2-051'?
    'EX07BT/BLC-2-051 official iframe 2026-10-26. Impact null. Damage 2 while own removed area has 10 or more cards, or at least 2 different printed names with trait 零番隊. Four or more such names also grant Impact 1. Neither clause has a turn icon. Silence removes them. GET is generic. Generated energy is 紫. No card FAQ.':
   profile.id==='BLC-4-065'?
    'EX15BT/BLC-4-065 official iframe 2026-10-26. Step. On its own turn, BP+1500 while own energy line has 京楽 春水. Main sets this character ACTIVE only after 神剣・八鏡剣 was used this turn. Q2335 (2026-09-04): two copies share that one activate. Catalogue gen=3 is the green3 sprite; official generated energy is 緑緑, so definition.gen=2 and legacyImportedGen=3. COLOR deploys one green hand character of required energy 2 or less and printed AP 1, ACTIVE.':
   profile.id==='BLC-4-008'?
    'EX15BT/BLC-4-008 official iframe 2026-10-26. On play, while own outside has no ユーハバッハ, you may retire one other own バズビー. An audited alias counts; silence drops the alias and keeps a printed name. Declining the sacrifice stops the rest, and this character stays as it entered. After a sacrifice, up to one opposing front character whose live BP is at most the sacrificed card printed required energy times 1000 may be retired. Declining that retirement still readies this character. If the sacrificed card printed energy is 5 or more, this character gains Impact 1 this turn. BLC-1-011 is a printed バズビー with required energy 5, so sacrificing it sets the retirement cap at 5000 and grants Impact 1. The earned Impact remains after later silence. GET is generic. Generated energy is 黄. No card FAQ.':
   profile.id==='BLC-4-018'?
    'EX15BT/BLC-4-018 official iframe 2026-10-26. On retire, only during your turn, choose one. Mode 1: up to one other own character named バンビエッタ・バスターバイン or with trait 邦比小隊 becomes ACTIVE. Mode 2: up to one such character cannot be chosen by opposing effects until your next own START, and every opposing front character whose live BP is 1000 or more gets BP-500 this turn. Skipping the protection target still applies the BP cut. Declining either up-to-one choice is legal. An opponent-turn retirement does not open the choice. Silence removes the ability. Trait 邦比小隊 stays under silence. Generated energy is 黄. No trigger. No card FAQ.':
   profile.id==='BLC-2-064'?
    'EX07BT/BLC-2-064 official iframe 2026-10-26. Main: REST this character and retire it. Then up to one own 更木 剣八 may gain Impact +1 or direct-attack Damage +1 this turn. A character with no Impact receives Impact 1; an existing Impact increases by 1. Damage +1 adds 1 to the direct attack, including a character that already has Damage 2. Declining the Kenpachi choice is legal, and the retirement still happens. A field is not a character. Silence on Yachiru removes the ability. Silence on Kenpachi keeps the printed name. DRAW is generic. Generated energy is 緑. No card FAQ.':
   profile.id==='BLC-4-079'?
    'EX15BT/BLC-4-079 official iframe 2026-10-26. Choose one: draw 1, or give up to one own 伊勢 七緒 BP+3000 and Impact 1 this turn. Declining the Nanao choice is legal, and a missing Nanao skips that choice. After the chosen effect, you may REST one own ACTIVE 京楽 春水 or 伊勢 七緒. Doing so readies one own REST AP card, and that recovery cannot be declined while a REST AP card exists. Skipping the REST readies nothing. A field is not a character. Silence keeps the printed name. No trigger. No generated energy. No card FAQ.':
   profile.id==='BLC-4-077'?
    'EX15BT/BLC-4-077 official iframe 2026-10-26. On play, up to one own outside 神剣・八鏡剣 may be added to hand. Main cost is REST and true retirement of this field; the field is gone before the choices. Then up to one remaining own field card, character or field, becomes ACTIVE, and up to one own character gains BP+1000 this turn. The same character may receive both. Declining either choice is legal. Catalogue gen=3 is the green3 sprite; official generated energy is 緑緑, so definition.gen=2 and legacyImportedGen=3. DRAW is generic. No card FAQ.':
   profile.id==='BLC-1-061'?
    'UA08BT/BLC-1-061 official iframe 2026-10-26. This field enters ACTIVE. Main: REST this field, look at the top card of your deck. If it has trait 零番隊, you may reveal it and add it to hand. Q566 (2023-09-25): はい、できます — even a Squad Zero card may be refused. A card that is not added returns to the top or goes outside, without a reveal. No Squad Zero trait cannot be added. The REST is the only use limit; becoming ACTIVE again allows another use. GET is generic. Generated energy is 紫.':
   profile.id==='BLC-2-045'?
    'EX07BT/BLC-2-045 official iframe 2026-10-26. Mandatory: retire one own field character with trait 涅骸部隊. Zero legal characters makes the event unplayable. On success, draw 1, then up to two own outside characters may enter ACTIVE on front or energy. Each must be blue, printed AP 1, have its required energy satisfied, and be named 涅 ネム or have trait 涅骸部隊. The just-retired character is outside and can be chosen. Declining a deployment stops the rest. A field is not a character. An audited alias of 涅 ネム counts while the card is outside. SPECIAL retires one opposing front character. Generated energy is none. No card FAQ.':
   profile.id==='BLC-2-037'?
    'EX07BT/BLC-2-037 official iframe 2026-10-26. On play, you may retire one own field character with trait 涅骸部隊. If that retirement happens, you may retire one opposing front character whose live BP is at most that character\'s live BP, then draw 1. Declining the own retirement stops the rest. Declining the opposing retirement still draws. A field with the trait is not a character. Silence does not remove the trait. The printed composites 破面／涅骸部隊 and 護廷十三隊／涅骸部隊 are audited trait components, so each token counts. Generated energy is 青. No trigger. No card FAQ.':
   profile.id==='BLC-1-081'?
    'UA08BT/BLC-1-081 official iframe 2026-10-26. This character cannot enter the energy line and cannot move there. Q568 (2023-09-25): いいえ、できません. Move effects and position swaps cannot move it from front to energy, and there is no own-effect exception. Impact 1. On play, up to one opposing front character of BP 2000 or less retires. Six or more other own field cards with trait 護廷十三隊 replace that cap with 4000. This character does not count toward the six. Silence does not remove the trait. Declining the retirement is legal. DRAW is generic. No generated energy.':
   profile.id==='BLC-2-012'?
    'EX07BT/BLC-2-012 official iframe 2026-10-26. Retire one opposing front character whose live BP is at most 1000 times the number of own field cards that have trait 邦比愛塔親衛隊 or the printed name バンビエッタ・バスターバイン. A card with both counts once. The catalogue token is the audited split of official バンビーズ; 邦比小隊 is a different token. Silence does not remove the trait or the printed name. The choice is mandatory. A count of zero leaves no legal character. SPECIAL retires one opposing front character. No generated energy. No card FAQ.':
   profile.id==='BLC-4-081'?
    'EX15BT/BLC-4-081 official iframe 2026-10-26. Playable only while own field has 京楽 春水. Silence removes an alias and keeps the printed name. Choose one opposing front character of live BP 5000 or less and retire it. The choice is mandatory. Then up to one own energy-line 花天 or 狂骨, character or field, becomes ACTIVE. A front copy is not a choice. An already ACTIVE card stays ACTIVE. A skip-next-ACTIVE lock consumes one attempt and the card stays REST. Declining the ACTIVE is legal. SPECIAL retires one opposing front character. No generated energy. No card FAQ. 狂骨 is not yet a ported print.':
   profile.id==='BLC-4-021'?
    'EX15BT/BLC-4-021 official iframe 2026-10-26. Playable only while own field has バズビー. An alias counts; silence removes the alias and keeps a printed name. Choose one opposing front character of live BP 5000 or less and retire it. The choice is mandatory. When own field has a バズビー whose printed required energy is 5 or more, up to one own バズビー, including one below that energy, gets BP+1000 this turn. The gate reads printed energy, not generated energy. Silence does not remove the printed name or that number. No ported Bazz-B has printed energy 5. SPECIAL retires one opposing front character. No generated energy. No card FAQ.':
   profile.id==='BLC-1-065'?
    'UA08BT/BLC-1-065 official iframe 2026-10-26. While own field has 朽木 白哉, this hand card costs 1 less AP. The reduction is once, not once per copy, and a silenced Byakuya still counts because the printed name remains. Then up to one opposing front character gets BP-3000 this turn, and up to one opposing front character gets BP-1000. Q567 (2023-09-25): the two choices may be the same character or two different characters. Declining either choice is legal. SPECIAL retires one opposing front character. No generated energy.':
   profile.id==='BLC-1-096'?
    'UA08BT/BLC-1-096 official iframe 2026-10-26. Choose one opposing front character of live BP 5000 or less, REST it, and skip its next ACTIVE. Q573 (2023-09-25) uses the same skip ruling as Q554. Own field 日番谷 冬獅郎 replaces that resolution with retirement of the same BP-capped character. The choice is mandatory when a legal target exists. SPECIAL retires one opposing front character. No generated energy. No draw.':
   profile.id==='BLC-1-031'?
    'UA08BT/BLC-1-031 official iframe 2026-10-26. Up to one opposing front character becomes REST. Q554 (2023-09-25): when own field has エス・ノト, that character is also skipped the next time it would become ACTIVE, and the player draws one card. Declining draws nothing. Silence does not remove the printed name. SPECIAL retires one opposing front character. No generated energy. No BP cap.':
   profile.id==='BLC-1-033'?
    'UA08BT/BLC-1-033 official iframe 2026-10-26. Choose one opposing front character of live BP 3000 or less and retire it. Q555 (2023-09-25) uses the Q552 raid-state definition. An opposing front or energy character in raid state, or an own field character named ユーハバッハ, raises that cap to 5000. The choice is mandatory when a legal target exists, and the event cannot be played otherwise. SPECIAL retires one opposing front character. No generated energy.':
   profile.id==='BLC-1-025'?
    'UA08BT/BLC-1-025 official iframe 2026-10-26. On block, this character gets BP-1000 this turn. Q552 (2023-09-25): if the attacking character has 【レイド】 and a face-up card underneath, the shift is BP+1000 instead. A Raid name with an empty stack, or only face-down undercards, stays the plain shift. The shift is applied before the battle BP comparison and stacks on each block. Silence skips it. Generated energy is 黄. No trigger.':
   profile.id==='BLC-1-026'?
    'UA08BT/BLC-1-026 official iframe 2026-10-26. Any own character with 【レイド】 may Raid onto this character. Q553 (2023-09-25): the conditions written to the right of 【レイド】 are waived, and so is the named base. A buried copy is not the visible host. Silence removes the permission and ordinary name matching applies. Generated energy is 黄. No trigger.':
   profile.id==='BLC-4-072'?
    'EX15BT/BLC-4-072 official iframe 2026-10-26. On play, may put one hand card outside. If that payment happens, may REST up to one own outside character whose printed AP is 1, whose trait is the catalogue token 假面軍勢 (official 仮面の軍勢), and whose required energy the controller currently meets. Q2341 (2026-09-04): the card just sent outside may be the one that enters. A Raid name still enters as an ordinary REST character. Generated energy is 緑. No trigger.':
   profile.id==='BLC-3-003'?
    'UA04NC/BLC-3-003 official iframe 2026-10-26. On play, choose one: up to one other own character gets BP+1000 this turn, or up to one other own character gets BP+3000 and retires at the end of its attack. The retirement follows a direct attack and an attacker win, after that attack\'s life continuation. A lost attacker has already left. Silence on the chosen character does not remove the grant. The grant ends when the next turn starts. ACTIVE is generic. No card FAQ.':
   profile.id==='BLC-4-039'?
    'EX15BT/BLC-4-039 official iframe 2026-10-26. On play from the energy line, become ACTIVE only when an own front character has printed AP 2 or more. Q2320 (2026-09-04): 元々の消費AP is the printed AP. [起動メイン][レストにする]: choose another own character on either line, BP+1000 this turn. If that character\'s printed AP is 2 or more, may put one hand card outside to set it ACTIVE. No ターン1. Generated energy is 青. DRAW is generic.':
   profile.id==='BLC-2-024'?
    'EX07BT/BLC-2-024 official iframe 2026-10-26. Printed BP stays 3500. 自分のターン中 adds BP+500, and silence removes that bonus. On play, if this player has already placed a hand card outside this turn by a rule, payment, or own effect, may REST one traitless blue character from hand whose printed energy is 1 or less and whose printed AP is 1. Generated energy is 青. ACTIVE is the generic sentence, so triggerEffect stays null. No card FAQ.':
   profile.id==='BLC-4-010'?
    'EX15BT/BLC-4-010 official iframe 2026-10-26. [起動メイン][フロントLにある場合][手札を1枚場外に置く][ターン1]: only while an own field character is named ユーハバッハ. Discard one hand card, then choose one opposing character on the front or energy line whose live BP is at least 1500 and give it BP-1000 this turn. The choice is mandatory when such a character exists. [ターン1] is this physical card. Generated energy is 黄. DRAW is generic. No card FAQ.':
   profile.id==='BLC-4-068'?
    'EX15BT/BLC-4-068 official iframe 2026-10-26. Impact null. Front only, pay 1 AP, and only while this character is REST: set it ACTIVE, then up to one opposing front character becomes REST. Q2336 (2026-09-04): two copies share one activate. Generated energy is 緑. ACTIVE is generic.':
   profile.id==='BLC-4-082'||profile.id==='BLC-4-083'?
    'Catalogue source for '+profile.number+' is a shop page, not unionarena-tcg.com. Number, Japanese name, stats and stored effect matched that record. No official URL was invented. Tested in tests/v2-c25-purple-shared.test.mjs.':
   normalized?
    profile.id==='BLC-4-014'?
      'EX15BT/BLC-4-014 official yellow+ base is REST 1; ACTIVE adds +1. Imported legacy gen=2 describes ACTIVE total; sourceRecord.gen=1, legacyImportedGen=2. Tested ACTIVE=2/REST=1. FAQ acceptance still pending.':
    profile.id==='BLC-4-074'?
      'EX15BT/BLC-4-074 official 緑+ is REST 1. The plus is the field-line REST activate, not a second resting pip and not activeExtraEnergy. Imported legacy gen=2; sourceRecord.gen=1, legacyImportedGen=2. No card FAQ.':
    profile.id==='BLC-4-024'?
      'EX15BT/BLC-4-024 official generated energy is 青青=2. Catalogue gen=3 is the sprite index. sourceRecord.gen=2, legacyImportedGen=3. Japanese on-play omits the full-line 除外 sentence; the Chinese catalogue and the shared line-move rule supply it.':
    profile.id==='BLC-4-063'?
      'EX15BT/BLC-4-063 official generated energy is 緑緑=2. Catalogue gen=3 is the sprite index. sourceRecord.gen=2, legacyImportedGen=3. On-play BP+1000 becomes BP+2000 for the four printed names.':
    profile.id==='BLC-4-037'?
      'EX15BT/BLC-4-037 official generated energy is 青青=2. Catalogue gen=3 is the sprite index. sourceRecord.gen=2, legacyImportedGen=3. On-play and the 1 AP [ターン1] replay both choose one opposing front character whose live BP is at least 1500.':
    profile.id==='BLC-4-071'?
      'EX15BT/BLC-4-071 official generated energy is 緑緑=2. Catalogue gen=3 is the sprite index. sourceRecord.gen=2, legacyImportedGen=3. Official Q2340: two copies share one activate per turn.':
    profile.id==='BLC-4-006'?
      'EX15BT/BLC-4-006 official generated energy is 黄黄=2. Catalogue gen=3 is the sprite index. sourceRecord.gen=2, legacyImportedGen=3. Impact null. On its own turn, BP+1000 only when own outside has no ユーハバッハ and own field has ユーグラム・ハッシュヴァルト. No card FAQ on the official page.':
    profile.id==='BLC-4-051'?
      'EX15BT/BLC-4-051 official iframe 2026-10-26. Generated energy is 紫紫=2. Catalogue gen=3 is the sprite index. sourceRecord.gen=2, legacyImportedGen=3. [起動メイン][ターン1] only on the turn this character entered. Choose one: draw 1 then put one hand card outside, or draw 1 only when an opposing front character has live BP below its printed BP. Q2324 (2026-09-04): 元々のBP is the printed lower-left BP. DRAW is generic.':
    profile.id==='BLC-2-017'?
      'EX07BT/BLC-2-017 official iframe 2026-10-26. [起動メイン][手札を1枚場外に置く][ターン1]: this physical card discards one hand card, then cannot be blocked by BP 4000 or higher this turn. Q1032 (2024-07-19): discarding 斬月 this way triggers 斬月. No generated-energy normalization.':
    profile.id==='BLC-4-003'?
      'EX15BT/BLC-4-003 official iframe 2026-10-26. Empty own field reduces this hand card by yellow×2, which equals its printed yellow 2. Step. On retire during its own turn, up to one opposing front character of live BP 1500 or more gets BP-1000. Generated energy is 黄. ACTIVE is generic. No card FAQ.':
    profile.id==='BLC-2-028'?
      'EX07BT/BLC-2-028 official iframe 2026-10-26. Impact null. On play may discard one hand card, then may set one own AP card ACTIVE. [ターン1] sets this physical card ACTIVE only while another own front character has printed AP 2 or more. Q1036 (2024-07-19): 元々の消費AP is the printed AP. Generated energy is 青. GET is generic.':
    profile.id==='BLC-4-043'?
      'EX15BT/BLC-4-043 official iframe 2026-10-26. This card is also 〈涅 ネム〉. On play, look at the top 2 and may put one blue 〈涅 マユリ〉, 〈涅 ネム〉, or 涅骸部隊 card outside; the rest return to the top in any order. Required energy 青-. Generated 青. DRAW is generic. No card FAQ.':
      'EX15BT/BLC-4-042 printed base BLUE BLUE=2 but legacy gen=3; audited sourceRecord.gen=2 retains legacyImportedGen=3; official Q2323 and full three-mode tests.':
    'Official printed '+profile.number+'; profile '+profile.kind+
     '; fingerprint matched source text and printed stats. V2 program/trigger tests exist; NOT per-card complete FAQ acceptance.',
   testFiles:Object.freeze([
    'tests/universal-v2-bleach-registry.test.mjs',
    ...(profile.id.startsWith('BLC-3-')?['tests/universal-v2-bleach-nc-batch.test.mjs']:[]),
    ...(['BLC-1-059','BLC-1-077','BLC-4-023'].includes(profile.id)?['tests/universal-v2-bleach-own-buff.test.mjs']:[]),
    ...(['BLC-2-055','BLC-4-013'].includes(profile.id)?['tests/universal-v2-bleach-new-top.test.mjs']:[]),
    testForKind[profile.kind]||'tests/universal-v2-bleach-port.test.mjs'
   ]),
   ...(vanilla?{verifiedNoExtraEffects:true}:{})
  })
 });
}
const entries=Object.freeze(BLEACH_V2_ADDON_PROFILES.map(contributedEntry));
if(BLEACH_V2_NEW_IDS.length!==entries.length||
 new Set(entries.map(x=>x.id)).size!==entries.length)
 throw Error('BLEACH V2 contribution cardinality or ID drift');
export default Object.freeze({
 title:'bleach',version:'bleach-reviewed-profiles-20261015',
 entries
});
