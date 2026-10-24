import test from 'node:test';
import assert from 'node:assert/strict';
import {r54FiveTitleSourceRescan} from '../scripts/v2-r54-five-title-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';

test('R54 every common atom rescans the live unported complement without keyword READY',()=>{
 const inv=v2AllTitleInventory(),{report,focused,searches}=r54FiveTitleSourceRescan();
 const unported=new Set(inv.series.flatMap(s=>s.unportedIds));
 assert.equal(report.catalogue,700);
 assert.equal(report.unportedSearched,unported.size);
 assert.equal(report.registered+report.unportedSearched,700);
 assert.equal(report.officialReviewedRegistered,4);
 assert.equal(report.officialReviewedPartial,0);
 assert.equal(report.readyAutoPromoted,0);
 assert.equal(report.independentFaqCertified,0);
 assert.ok(focused.some(f=>f.id==='SAO-1-071'&&f.status==='REGISTERED'));
 assert.ok(focused.some(f=>f.id==='TTG-1-067'&&f.status==='REGISTERED'));
 assert.ok(focused.some(f=>f.id==='SLG-1-021'&&f.status==='REGISTERED'&&f.missing.length===0));
 assert.ok(focused.some(f=>f.id==='MST-1-009'&&f.status==='REGISTERED'&&f.missing.length===0));
 for(const hits of Object.values(searches)){
  assert.equal(new Set(hits.map(x=>x.id)).size,hits.length);
  assert.ok(hits.every(x=>unported.has(x.id)&&
   ['REVIEW PENDING','SOURCE PENDING'].includes(x.status)));
 }
});
