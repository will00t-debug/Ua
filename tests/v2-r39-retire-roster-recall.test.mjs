import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilityIndex,r35UnportedAtomAudit} from '../scripts/v2-r35-unported-atom-audit.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R39: optional-retire TOP-N primitive triggers strict full-roster candidate recall',()=>{
 const roster=v2AllTitleInventory(),idx=capabilityIndex(roster),audit=r35UnportedAtomAudit();
 assert.equal(idx.cards.length,700);assert.equal(idx.unportedSearched,roster.totals.blocked);
 assert.equal(audit.retireTopPotentialCount,idx.retireTopPotential.length);
 assert.deepEqual(audit.retireTopPotential,idx.retireTopPotential);
 const unported=new Set(idx.cards.filter(c=>!c.registered).map(c=>c.id));
 for(const id of ['SAO-1-056','SAO-2-056','MST-1-049'])assert.equal(unported.has(id),false);
 assert.equal(new Set(idx.retireTopPotential.map(c=>c.id)).size,idx.retireTopPotential.length);
 for(const c of idx.retireTopPotential){
  assert.ok(unported.has(c.id));
  assert.equal(c.sourceFingerprint.length,64);
  assert.ok(['REVIEW PENDING','SOURCE PENDING'].includes(c.status));
  assert.equal(typeof c.flags.field,'boolean');
 }
});
