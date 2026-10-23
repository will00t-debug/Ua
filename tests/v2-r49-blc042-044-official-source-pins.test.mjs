import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
// Source/normalization pins remain independent after the full R50 registration.
test('BLC-4-042 printed base BLUE 2 normalized independently of legacy gen 3',()=>{
 const x=CARDS.find(c=>c.identity==='BLC-4-042');
 assert.ok(x);assert.equal(x.number,'EX15BT/BLC-4-042');
 assert.equal(x.nameJa,'涅 マユリ');
 assert.equal(x.type,'character');assert.equal(x.color,'blue');
 assert.deepEqual([x.energy,x.ap,x.bp],[3,1,2000]);
 assert.equal(x.gen,3,'legacy imported source encodes 3, NOT official printed base 2');
 const officialPrintedBase=2;
 assert.notEqual(x.gen,officialPrintedBase,
  'legacy source differs from officially printed BLUE 2; use audited V2 normalization');
 assert.equal(x.trigger,'draw');
 assert.equal(registeredV2TitlePack('bleach').cards[x.identity].gen,2);
 assert.ok(EXPECTED_V2_IDS.bleach.includes(x.identity));
});
test('BLC-2-044 printed exact name is BLUE FIELD not CHARACTER, now fully authored',()=>{
 const x=CARDS.find(c=>c.identity==='BLC-2-044');
 assert.ok(x);assert.equal(x.number,'EX07BT/BLC-2-044');
 assert.equal(x.nameJa,'涅骸部隊');
 assert.equal(x.type,'field');assert.equal(x.color,'blue');
 assert.equal(registeredV2TitlePack('bleach').cards[x.identity].type,'field');
 assert.ok(EXPECTED_V2_IDS.bleach.includes(x.identity));
 const inv=v2AllTitleInventory();
 assert.ok(!inv.series.find(s=>s.title==='bleach').unportedIds.includes('BLC-4-042'));
 assert.ok(!inv.series.find(s=>s.title==='bleach').unportedIds.includes('BLC-2-044'));
});
