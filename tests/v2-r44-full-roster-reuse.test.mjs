import test from 'node:test';
import assert from 'node:assert/strict';
import {r44AttackEndFreeRestFullRoster} from '../scripts/v2-r44-phase-retire-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R44 all unported identities searched across each of five official titles, no keyword-as-READY',()=>{
 const r=r44AttackEndFreeRestFullRoster(),inv=v2AllTitleInventory();
 assert.equal(r.summary.catalogueSize,700);
 assert.equal(r.summary.registered,inv.totals.pilotImplemented);
 assert.equal(r.summary.unportedSearched,inv.totals.blocked);
 assert.equal(r.summary.series,5);
 const ids=[...r.flagged.map(c=>c.id),...r.unflaggedIds];
 assert.equal(ids.length,inv.totals.blocked);
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(new Set(ids),new Set(inv.series.flatMap(s=>s.unportedIds)));
 assert.ok(!r.flagged.some(c=>c.id==='SAO-2-069'));
 assert.ok(r.flagged.every(c=>c.status!=='READY'));
 assert.equal(r.summary.statuses['RULE BLOCKED'],1);
 console.log('R44_SOURCE_ROSTER '+JSON.stringify(r.summary));
});
test('R44 official complete source and blocked candidate provenance retained',()=>{
 const r=r44AttackEndFreeRestFullRoster();
 assert.deepEqual(r.officiallyFullRegistered,['SAO-2-069']);
 assert.ok(r.source.endsWith('EX08BT%2FSAO-2-069'));
 assert.equal(r.blockers.find(x=>x.id==='MST-1-067').status,'RULE BLOCKED');
 for(const id of ['SAO-1-087','SAO-2-064','BLC-4-042','BLC-4-036'])
  assert.equal(r.blockers.find(x=>x.id===id).status,'PARTIAL');
});
