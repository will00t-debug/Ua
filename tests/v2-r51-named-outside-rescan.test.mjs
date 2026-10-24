import test from 'node:test';
import assert from 'node:assert/strict';
import {r51NamedOutsideFiveTitleRescan}
 from '../scripts/v2-r51-named-outside-candidate-report.mjs';
import {v2AllTitleInventory}
 from '../dist/universal-v2/title-packs/inventory.mjs';

test('R51 named-OUTSIDE audit scans every currently unported official ID exactly once',()=>{
 const {report,candidates}=r51NamedOutsideFiveTitleRescan();
 const inv=v2AllTitleInventory();
 const expected=new Set(inv.series.flatMap(s=>s.unportedIds));
 assert.equal(report.catalogue,700);
 assert.equal(report.series,5);
 assert.equal(report.registered+report.unportedSearched,700);
 assert.equal(report.unportedSearched,expected.size);
 assert.equal(Object.values(report.byTitle).reduce((n,x)=>n+x.unported,0),expected.size);
 assert.equal(report.textCandidates,candidates.length);
 assert.equal(new Set(candidates.map(c=>c.id)).size,candidates.length);
 assert.ok(candidates.every(c=>expected.has(c.id)&&c.status==='REVIEW PENDING'));
 assert.equal(report.readyVerified,0);
});
test('R51 official SAO-1-070 is only PARTIAL until true full-card registration',()=>{
 const {report}=r51NamedOutsideFiveTitleRescan();
 const inv=v2AllTitleInventory();
 const registered=!inv.series.find(s=>s.title==='sword-art-online')
  .unportedIds.includes('SAO-1-070');
 if(registered){
  assert.equal(report.focus,null,'registered full card is no longer an unported candidate');
 }else{
  assert.equal(report.focus?.id,'SAO-1-070');
  assert.equal(report.focus.status,'PARTIAL');
  assert.ok(report.focus.missing.length>=1);
 }
});
