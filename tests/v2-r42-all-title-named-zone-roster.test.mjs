import test from 'node:test';
import assert from 'node:assert/strict';
import {r42TwoZoneCandidateReport} from '../scripts/v2-r42-named-zone-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R42 full 700 IDs and 368 currently unported searched, with no partial card made READY',()=>{
 const report=r42TwoZoneCandidateReport(),inv=v2AllTitleInventory(),s=report.stats;
 assert.equal(s.catalogueSize,700);assert.equal(s.unportedSearched,inv.totals.blocked);
 assert.equal(s.sourceTextScanned,inv.totals.blocked);
 assert.deepEqual(report.newlyFullyRegistered,['SLG-1-030','SLG-1-028']);
 assert.equal(s.readyVerifiedUnported,0);
 assert.equal(s.officallyReviewedRemaining,undefined);
 // Historical reviews persist, but a newly source-pinned registered card
 // must no longer count as currently unported or currently PARTIAL.
 assert.equal(s.officiallyReviewedRemaining,2);
 assert.equal(s.partial,1);assert.equal(s.ruleBlocked,1);
 const remaining=[...report.candidates.map(c=>c.id),...report.remainingNoKeywords];
 assert.equal(remaining.length,inv.totals.blocked);
 assert.equal(new Set(remaining).size,inv.totals.blocked);
 assert.deepEqual(new Set(remaining),new Set(inv.series.flatMap(c=>c.unportedIds)));
 assert.equal(s.registered+inv.totals.blocked,700);
 console.log('R42_FIVE_TITLE_SCAN '+JSON.stringify(s));
});
test('R42 cannot count historical R41 blocked SLG-028 after real full card registration',()=>{
 const r=r42TwoZoneCandidateReport();
 assert.ok(r.historicalReviewedNowRegistered.includes('SLG-1-028'));
 assert.ok(!r.candidates.some(c=>['SLG-1-028','SLG-1-030'].includes(c.id)));
 const critical=new Map(r.priorities.map(row=>[row.id,row]));
 assert.equal(critical.get('MST-1-067').status,'RULE BLOCKED');
 for(const id of ['SAO-2-068','SAO-2-069','BLC-4-042','SAO-1-087','SAO-2-064'])
  if(!['SAO-2-068','SAO-2-069','BLC-4-042'].includes(id))assert.equal(critical.get(id).status,'PARTIAL');
});
