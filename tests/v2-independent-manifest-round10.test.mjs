import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {assertIndependentV2Inventory,EXPECTED_V2_COUNTS,EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
test('independent manifest rejects missing, duplicated and substituted IDs even with unchanged total',()=>{
 const actual=v2AllTitleInventory();assert.equal(assertIndependentV2Inventory(actual),true);
 for(const change of [r=>r.pilotIds.pop(),r=>r.pilotIds[0]=r.pilotIds[1],r=>r.pilotIds[0]='BLC-UNREVIEWED',r=>r.pilotImplemented++,r=>r.blocked++]){
  const altered=structuredClone(actual);change(altered.series[0]);assert.throws(()=>assertIndependentV2Inventory(altered),/drift/);
 }
 const missing=structuredClone(actual);missing.series.pop();assert.throws(()=>assertIndependentV2Inventory(missing),/title drift/);
 for(const [title,ids] of Object.entries(EXPECTED_V2_IDS))assert.equal(ids.length,EXPECTED_V2_COUNTS[title]);
});
test('independent expected identities have no production imports; report and matrix enforce exact manifest',()=>{
 const manifest=readFileSync(new URL('./fixtures/v2-integrated-id-manifest.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/^\s*import\s/m);
 for(const file of ['v2-unported-report.mjs','v2-integrated-match-matrix.mjs']){
  const source=readFileSync(new URL('../scripts/'+file,import.meta.url),'utf8');assert.match(source,/assertIndependentV2Inventory\(/);
 }
});
