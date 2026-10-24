import test from 'node:test';
import assert from 'node:assert/strict';
import {r48FullTitleReadinessScan,R48_QUERY_ATOMS} from '../scripts/v2-r48-official-readiness-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R48 scans all 700 source cards and precisely partitions every dynamically unported UID',()=>{
 const {summary,reviewed,textCandidates,unflagged}=r48FullTitleReadinessScan();
 const inv=v2AllTitleInventory(),expected=new Set(inv.series.flatMap(s=>s.unportedIds));
 assert.equal(summary.catalogue,700);assert.equal(summary.titles,5);
 assert.equal(summary.registered,inv.totals.pilotImplemented);
 assert.equal(summary.unportedSearched,inv.totals.blocked);
 assert.equal(summary.registered+summary.unportedSearched,700);
 assert.equal(summary.partial+summary.reviewPending+summary.ready,summary.unportedSearched);
 const merged=[...new Set([...textCandidates.map(c=>c.id),...unflagged])];
 assert.equal(merged.length,expected.size);
 assert.ok(merged.every(id=>expected.has(id)));
 assert.ok(reviewed.every(c=>expected.has(c.id)&&c.status==='PARTIAL'&&
  c.missing.length>0));
 assert.ok(!reviewed.some(c=>c.id==='BLC-4-042'),'full source now ported');
 assert.ok(!reviewed.some(c=>c.id==='BLC-4-069'),'registered full card is no longer unported');
 for(const id of ['SAO-1-018'])
  assert.ok(reviewed.some(c=>c.id===id),'independent official source review '+id);
 assert.ok(!reviewed.some(c=>c.id==='MST-1-009'));
 assert.ok(inv.series.find(c=>c.title==='mushoku-tensei').pilotIds.includes('MST-1-009'));
 assert.ok(!reviewed.some(c=>c.id==='SLG-1-021'));
 assert.ok(inv.series.find(c=>c.title==='solo-leveling').pilotIds.includes('SLG-1-021'));
 assert.ok(!reviewed.some(c=>c.id==='TTG-1-067'));
 assert.ok(inv.series.find(c=>c.title==='gurren-lagann').pilotIds.includes('TTG-1-067'),
  'R55 source-audited Q2295 TTG remains in registered manifest');
 // R52: a completely ported official SAO-1-070 no longer belongs to the
 // dynamic UNPORTED partition. Keep its independent source proof in the
 // official pinned registry + R52 whole-card scenario instead.
 if(expected.has('SAO-1-070'))
  assert.ok(reviewed.some(c=>c.id==='SAO-1-070'),'independent SAO source review');
 else{
  assert.ok(inv.series.find(c=>c.title==='sword-art-online')
   .pilotIds.includes('SAO-1-070'),'R52 official SAO-070 remains registered');
  assert.ok(!reviewed.some(c=>c.id==='SAO-1-070'),
   'registered true card cannot remain in unported review partition');
 }
 assert.ok(Object.keys(R48_QUERY_ATOMS).length>=9);
});
