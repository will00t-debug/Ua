import test from 'node:test';
import assert from 'node:assert/strict';
import {r47FiveTitleAttackSwapAndMainRescan}
 from '../scripts/v2-r47-attack-end-swap-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R47 ALL five title unported identities and explicit official-partial swap cards, never keyword READY',()=>{
 const r=r47FiveTitleAttackSwapAndMainRescan(),inv=v2AllTitleInventory();
 assert.equal(r.summary.catalogueSize,700);
 assert.equal(r.summary.series,5);
 assert.equal(r.summary.registered,inv.totals.pilotImplemented);
 assert.equal(r.summary.unportedSearched,inv.totals.blocked);
 const keys=[...r.candidates.map(x=>x.id),...r.unflagged];
 assert.equal(keys.length,inv.totals.blocked);
 assert.equal(new Set(keys).size,keys.length);
 assert.deepEqual(new Set(keys),new Set(inv.series.flatMap(x=>x.unportedIds)));
 assert.equal(r.summary.readyVerified,0);
 for(const id of []){
  const c=r.candidates.find(x=>x.id===id);
  assert.ok(c);
  assert.equal(c.status,'PARTIAL');
  assert.ok(c.missing.length>=3);
 }
 assert.ok(r.candidates.every(c=>c.status==='PARTIAL'||c.status==='REVIEW PENDING'));
 assert.ok(!r.candidates.some(c=>['BLC-4-042','BLC-4-069'].includes(c.id)),'full real cards now registered');
 assert.equal(r.summary.registered+inv.totals.blocked,700);
 console.log('R47_FIVE_TITLE_RESCAN '+JSON.stringify(r.summary));
});
test('Q2337 requires four different GREEN EVENT/FIELD printed names from actual currently registered BLEACH cards',()=>{
 const r=r47FiveTitleAttackSwapAndMainRescan();
 assert.equal(r.summary.registeredBleachGreenEventFieldDistinctNames,
  new Set(r.bleachedRegisteredPrintedNames).size);
 assert.equal(r.summary.requiredDistinctOutsideNamesForBLC4069,4);
 assert.equal(r.bleachGreenOutsideUnportedIds.length,
  new Set(r.bleachGreenOutsideUnportedIds).size);
 assert.ok(!r.bleachGreenOutsideUnportedIds.includes('BLC-4-069'));
 console.log('R47_GREEN_SOURCE_GAP '+JSON.stringify({
  registeredPrintedNames:r.bleachedRegisteredPrintedNames,
  candidateUnportedIds:r.bleachGreenOutsideUnportedIds}));
});
