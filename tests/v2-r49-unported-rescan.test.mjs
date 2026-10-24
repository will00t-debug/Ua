import test from 'node:test';
import assert from 'node:assert/strict';
import {r49NewAtomFiveTitleRescan} from '../scripts/v2-r49-unported-reuse-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R49 every new shared primitive rechecks all then-current unported official identities',()=>{
 const {report,hits,manual}=r49NewAtomFiveTitleRescan();
 const inv=v2AllTitleInventory(),ids=new Set(inv.series.flatMap(s=>s.unportedIds));
 assert.equal(report.catalogue,700);assert.equal(report.registered,inv.totals.pilotImplemented);
 assert.equal(report.unportedSearched,ids.size);
 assert.equal(report.registered+report.unportedSearched,700);
 assert.equal(report.readyVerified,0,'a text match NEVER awards full-card READY');
 for(const group of Object.values(hits))assert.ok(group.every(id=>ids.has(id)));
 for(const id of ['BLC-4-042','BLC-2-044'])
  assert.ok(report.focus.some(c=>c.id===id&&c.status==='REGISTERED'));
 assert.ok(report.focus.some(c=>c.id==='BLC-4-069'&&c.status==='REGISTERED'));
 assert.ok(manual.every(c=>ids.has(c.id)&&c.missing?.length>0));
 assert.equal(Object.values(report.byTitle).reduce((x,y)=>x+y.unported,0),ids.size);
});
