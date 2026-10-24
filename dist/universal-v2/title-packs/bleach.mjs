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
 renjiEventRetire:'tests/v2-c25-purple-shared.test.mjs'
});
function contributedEntry(profile){
 // Fails closed for missing/changed printed source, stats, text or unknown DSL.
 const definition=checkedBleachAddonDefinition(profile);
 const original=CARDS.find(x=>x.identity===profile.id);
 if(!original)throw Error('Missing BLEACH official source for '+profile.id);
 // The legacy gen=2 for EX15BT/BLC-4-014 describes the ACTIVE total, not
 // the printed REST base. SourceRecord is the normalized printed card record;
 // retain original.gen separately and require the profile fingerprint above.
 const normalized=['BLC-4-014','BLC-4-042','BLC-4-074'].includes(profile.id);
 const sourceRecord=Object.freeze(normalized?
  {...original,gen:definition.gen,legacyImportedGen:original.gen}: {...original});
 const vanilla=['plain','plainAlt','step'].includes(profile.kind);
 return Object.freeze({
  id:profile.id,sourceRecord,
  definition:Object.freeze(definition),
  evidence:Object.freeze({
   printedTextFragments:Object.freeze([profile.effect]),
   reviewNote:profile.id==='BLC-4-082'||profile.id==='BLC-4-083'?
    'Catalogue source for '+profile.number+' is a shop page, not unionarena-tcg.com. Number, Japanese name, stats and stored effect matched that record. No official URL was invented. Tested in tests/v2-c25-purple-shared.test.mjs.':
   normalized?
    profile.id==='BLC-4-014'?
      'EX15BT/BLC-4-014 official yellow+ base is REST 1; ACTIVE adds +1. Imported legacy gen=2 describes ACTIVE total; sourceRecord.gen=1, legacyImportedGen=2. Tested ACTIVE=2/REST=1. FAQ acceptance still pending.':
    profile.id==='BLC-4-074'?
      'EX15BT/BLC-4-074 official 緑+ is REST 1. The plus is the field-line REST activate, not a second resting pip and not activeExtraEnergy. Imported legacy gen=2; sourceRecord.gen=1, legacyImportedGen=2. No card FAQ.':
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
