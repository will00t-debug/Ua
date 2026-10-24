import test from 'node:test';
import assert from 'node:assert/strict';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {c1BlcSaoReadiness,C1_OFFICIAL_REVIEWS} from '../scripts/v2-c1-blc-sao-readiness.mjs';

test('C1 scans every current unported BLEACH and SAO card without keyword READY',()=>{
 const inv=v2AllTitleInventory();
 const x=c1BlcSaoReadiness();
 const expected=inv.series.filter(s=>['bleach','sword-art-online'].includes(s.title))
  .flatMap(s=>s.unportedIds);
 assert.equal(x.report.bleachSaoUnported,expected.length);
 assert.equal(x.report.readyFromKeywords,0);
 assert.equal(x.reviewed.length+x.pending.length,expected.length);
 assert.deepEqual(x.ported.map(c=>c.id),['BLC-1-058','BLC-1-088','BLC-1-101','BLC-4-073']);
 for(const id of Object.keys(C1_OFFICIAL_REVIEWS)){
  assert.equal(expected.includes(id),true,id);
  assert.notEqual(C1_OFFICIAL_REVIEWS[id].status,'READY');
 }
 assert.equal(x.report.byTitle.bleach.registered,160);
 assert.equal(x.report.byTitle['sword-art-online'].registered,111);
});
