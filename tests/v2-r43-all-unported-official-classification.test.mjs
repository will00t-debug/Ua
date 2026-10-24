import test from 'node:test';
import assert from 'node:assert/strict';
import {r43MainCostFullRoster,R43_OFFICIAL_MULTI_EFFECT_AUDIT} from '../scripts/v2-r43-main-cost-unported-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R43 all current 700 source IDs re-scanned and every current unported unique',()=>{
 const report=r43MainCostFullRoster(),inv=v2AllTitleInventory();
 assert.equal(report.counts.catalogue,700);
 assert.equal(report.counts.registered,inv.totals.pilotImplemented);
 assert.equal(report.counts.unportedSearched,inv.totals.blocked);
 assert.equal(report.counts.scannedAcrossTitles,5);
 assert.equal(report.counts.registered+report.counts.unportedSearched,700);
 assert.equal(report.counts.verifiedFullReadyUnported,0);
 const left=[...report.candidates.map(c=>c.id),...report.otherUnportedIds];
 assert.equal(left.length,inv.totals.blocked);assert.equal(new Set(left).size,left.length);
 assert.deepEqual(new Set(left),new Set(inv.series.flatMap(s=>s.unportedIds)));
 console.log('R43_CERTIFIED_ROSTER '+JSON.stringify(report.counts));
});
test('R43 SAO-068 registered with actual main cost while 069 has Raid and phase-end blockers',()=>{
 const r=r43MainCostFullRoster();
 assert.ok(!r.candidates.some(c=>c.id==='SAO-2-068'));
 const c=r.candidates.find(c=>c.id==='SAO-2-069');
 assert.equal(c,undefined);
 assert.equal(r.reviewed.find(c=>c.id==='SAO-2-069').status,'REGISTERED');
 assert.equal(R43_OFFICIAL_MULTI_EFFECT_AUDIT['SAO-2-069'].missing.length,5);
 assert.equal(r.reviewed.find(x=>x.id==='MST-1-067').status,'RULE BLOCKED');
 assert.ok(r.counts.officialRemainingReviews>=2);
});
