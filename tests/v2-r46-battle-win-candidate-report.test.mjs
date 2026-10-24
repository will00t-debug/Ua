import test from 'node:test';
import assert from 'node:assert/strict';
import {r46BattleWonCandidateScan} from '../scripts/v2-r46-battle-win-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R46 Q763 all 365-current-unported card identities scanned across five real titles',()=>{
 const r=r46BattleWonCandidateScan(),inv=v2AllTitleInventory();
 assert.equal(r.summary.catalogueSize,700);
 assert.equal(r.summary.series,5);
 assert.equal(r.summary.registered,inv.totals.pilotImplemented);
 assert.equal(r.summary.unportedSearched,inv.totals.blocked);
 assert.equal(r.candidateCards.length+r.unflaggedIds.length,inv.totals.blocked);
 assert.equal(new Set([...r.candidateCards.map(x=>x.id),...r.unflaggedIds]).size,
  inv.totals.blocked);
 assert.deepEqual(new Set([...r.candidateCards.map(x=>x.id),...r.unflaggedIds]),
  new Set(inv.series.flatMap(s=>s.unportedIds)));
 assert.equal(r.summary.readyVerified,0);
 assert.ok(!r.candidateCards.some(c=>c.id==='SAO-1-087'),
  'source complete migrated SAO-1-087 must not remain unported');
 assert.ok(r.candidateCards.every(c=>c.status==='PARTIAL'||c.status==='REVIEW PENDING'));
 console.log('R46_Q763_ALL_TITLE_SCAN '+JSON.stringify(r.summary));
 console.log('R46_Q763_CANDIDATES '+JSON.stringify(r.candidateCards));
});
