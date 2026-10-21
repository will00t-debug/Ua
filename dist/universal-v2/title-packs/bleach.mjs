// [V2-B] Official BLEACH contribution to the shared title-pack registry.
// The 15 pre-existing BLEACH Pilots are supplied by registry.mjs; NEVER repeat
// them here.  Standalone and registry compile the SAME checked addon definitions.
// Every exported record is anchored to a fingerprint-checked official profile.
import {CARDS} from '../../cards.mjs?v=9.1.0';
import {BLEACH_V2_ADDON_PROFILES,BLEACH_V2_NEW_IDS,
 checkedBleachAddonDefinition} from '../bleach-pack.mjs';

const testForKind=Object.freeze({
 bounce:'tests/universal-v2-bleach-port.test.mjs',
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
 drawPlayColorHand:'tests/universal-v2-bleach-nc-batch.test.mjs',
 buffOtherOwn1000:'tests/universal-v2-bleach-own-buff.test.mjs',
 peekTopOrBottom:'tests/universal-v2-bleach-new-top.test.mjs',
 inspectTopAnyOutside2:'tests/universal-v2-bleach-new-top.test.mjs'
});
function contributedEntry(profile){
 // Fails closed for missing/changed printed source, stats, text or unknown DSL.
 const definition=checkedBleachAddonDefinition(profile);
 const original=CARDS.find(x=>x.identity===profile.id);
 if(!original)throw Error('Missing BLEACH official source for '+profile.id);
 // The legacy gen=2 for EX15BT/BLC-4-014 describes the ACTIVE total, not
 // the printed REST base. SourceRecord is the normalized printed card record;
 // retain original.gen separately and require the profile fingerprint above.
 const normalized=profile.id==='BLC-4-014';
 const sourceRecord=Object.freeze(normalized?
  {...original,gen:definition.gen,legacyImportedGen:original.gen}: {...original});
 const vanilla=['plain','plainAlt','step'].includes(profile.kind);
 return Object.freeze({
  id:profile.id,sourceRecord,
  definition:Object.freeze(definition),
  evidence:Object.freeze({
   printedTextFragments:Object.freeze([profile.effect]),
   reviewNote:normalized?
    'EX15BT/BLC-4-014 official yellow+ base is REST 1; ACTIVE adds +1. Imported legacy gen=2 describes ACTIVE total; sourceRecord.gen=1, legacyImportedGen=2. Tested ACTIVE=2/REST=1. FAQ acceptance still pending.':
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
if(entries.length!==65||BLEACH_V2_NEW_IDS.length!==entries.length||
 new Set(entries.map(x=>x.id)).size!==entries.length)
 throw Error('BLEACH V2 contribution cardinality or ID drift');
export default Object.freeze({
 title:'bleach',version:'bleach-reviewed-profiles-20261015',
 entries
});
