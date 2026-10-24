import test from 'node:test';
import assert from 'node:assert/strict';
import {r56TtgSlgMstRescan,R56_SEARCH_TERMS}
 from '../scripts/v2-r56-ttg-slg-mst-five-title-rescan.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';

test('R56 700-card live all-title rescan partitions dynamic remaining 700 minus registered, no false READY',()=>{
 const inv=v2AllTitleInventory(),r=r56TtgSlgMstRescan();
 const complement=new Set(inv.series.flatMap(s=>s.unportedIds));
 assert.equal(r.report.catalogue,700);
 assert.equal(r.report.registered,inv.totals.pilotImplemented);
 assert.equal(r.report.unported,complement.size);
 assert.equal(r.report.registered+r.report.unported,700);
 assert.equal(r.report.independentFaqCertified,0);
 assert.equal(r.report.readyAutoPromoted,0);
 assert.equal(Object.keys(r.hits).length,Object.keys(R56_SEARCH_TERMS).length);
 for(const hits of Object.values(r.hits)){
  assert.equal(hits.length,new Set(hits.map(x=>x.id)).size);
  assert.ok(hits.every(x=>complement.has(x.id)&&x.status==='REVIEW PENDING'));
 }
 assert.ok(r.reviewed.some(x=>x.id==='SLG-1-021'&&x.status==='REGISTERED'));
 assert.ok(r.reviewed.some(x=>x.id==='TTG-1-020'&&x.status==='REGISTERED'));
 assert.ok(r.reviewed.some(x=>x.id==='MST-1-009'&&x.status==='REGISTERED'));
 for(const group of Object.values(r.cursorReuse))
  assert.ok(group.every(c=>complement.has(c.id)&&
   ['bleach','sword-art-online'].includes(c.title)));
 for(const c of r.cursor){
  assert.equal(c.owner,'Cursor');
  assert.ok(complement.has(c.id));
  assert.notEqual(c.status,'REGISTERED');
 }
 assert.ok(r.reviewed.every(x=>typeof x.fingerprint==='string'&&x.fingerprint.length>0));
});
