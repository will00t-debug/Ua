import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilityIndex,r35UnportedAtomAudit} from '../scripts/v2-r35-unported-atom-audit.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R39 new hand REST primitive triggers all-five-title unported scan without invented READY',()=>{
 const baseline=v2AllTitleInventory(),a=r35UnportedAtomAudit(),idx=capabilityIndex(baseline);
 assert.equal(idx.cards.length,700);
 assert.equal(idx.unportedSearched,baseline.totals.blocked);
 assert.equal(a.handRestPotentialCount,idx.handRestPotential.length);
 assert.deepEqual(a.handRestPotential,idx.handRestPotential);
 const unported=new Set(idx.cards.filter(x=>!x.registered).map(x=>x.id));
 assert.equal(unported.has('SAO-1-056'),false);
 assert.ok(idx.cards.some(c=>c.id==='SAO-1-056'&&c.operations.includes('deployOwnHandRest')));
 assert.equal(new Set(idx.handRestPotential.map(c=>c.id)).size,idx.handRestPotential.length);
 for(const c of idx.handRestPotential){
  assert.ok(unported.has(c.id));
  assert.equal(c.status,'REVIEW PENDING');
  assert.equal(c.sourceFingerprint.length,64);
  assert.equal(typeof c.flags.explicitRest,'boolean');
 }
});
