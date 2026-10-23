import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilityIndex,ATOM_REVIEW_STATUSES} from '../scripts/v2-r35-unported-atom-audit.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
test('R36 capability index is derived from all 700 source identities and live registry',()=>{
 const a=capabilityIndex(),v=v2AllTitleInventory();
 assert.equal(a.cards.length,700);assert.equal(new Set(a.cards.map(c=>c.id)).size,700);
 assert.equal(a.unportedSearched,v.totals.blocked);
 for(const c of a.cards){assert.ok(ATOM_REVIEW_STATUSES.includes(c.status));assert.match(c.sourceFingerprint,/^[a-f0-9]{64}$/);}
 for(const id of ['SAO-2-074','MST-1-062','MST-1-031','BLC-1-070','BLC-2-030','BLC-4-055','BLC-4-069','TTG-1-080','SAO-2-031'])assert.ok(a.cards.some(c=>c.id===id&&c.searchHits.includes('nextEligibleHandPlayApDiscount')));
 assert.ok(!a.apDiscountCandidates.includes('BLC-1-065'),'permanent hand discount is not a next-use candidate');
 assert.ok(!a.apDiscountCandidates.includes('SAO-2-049'),'BP minus and AP text are not enough');
 assert.ok(a.atoms.find(a=>a.atom==='grantFrontEnergyOwnOtherFrontTrait').registeredIds.includes('MST-1-059'));
 assert.ok(a.cards.filter(c=>c.searchHits.length&&!c.officialReview).every(c=>c.status!=='READY'),'keyword hits never certify readiness');
});
