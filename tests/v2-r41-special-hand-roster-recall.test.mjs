import test from 'node:test';
import assert from 'node:assert/strict';
import {r41SpecialHandCandidateReport,R41_OFFICIAL_REVIEWS} from '../scripts/v2-r41-special-hand-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from '../scripts/v2-r35-unported-atom-audit.mjs';

test('R41 scan indexes all 700 cards and each unique currently unported UID after new primitive',()=>{
 const inv=v2AllTitleInventory(),r=r41SpecialHandCandidateReport(),idx=capabilityIndex(inv);
 assert.equal(r.stats.catalogueSize,700);
 assert.equal(r.stats.registered,inv.totals.pilotImplemented);
 assert.equal(r.stats.unportedSearched,inv.totals.blocked);
 assert.equal(r.stats.sourceTextScanned,inv.totals.blocked);
 assert.equal(r.stats.handDeployMentions,idx.handRestPotential.length);
 assert.equal(r.stats.readyFromKeywordOnly,0);
 assert.equal(r.candidates.length+r.remainingWithoutKeywords.length,inv.totals.blocked);
 assert.equal(new Set([...r.candidates.map(c=>c.id),...r.remainingWithoutKeywords]).size,inv.totals.blocked);
 assert.deepEqual(new Set([...r.candidates.map(c=>c.id),...r.remainingWithoutKeywords]),
  new Set(inv.series.flatMap(x=>x.unportedIds)));
 console.log('R41_FIVE_TITLE_SCAN '+JSON.stringify(r.stats));
});
test('R41 official multi-effect SAO-2-069 PARTIAL and Q2162 MST-1-067 RULE BLOCKED',()=>{
 const r=r41SpecialHandCandidateReport();
 const sao=r.candidates.find(c=>c.id==='SAO-2-069');
 assert.ok(sao);assert.equal(sao.status,'PARTIAL');assert.ok(sao.missing.length>=4);
 const mst=r.candidates.find(c=>c.id==='MST-1-067');
 assert.ok(mst);assert.equal(mst.status,'RULE BLOCKED');
 assert.ok(mst.missing.some(x=>x.includes('Q2162')));
 for(const c of r.candidates.filter(c=>!R41_OFFICIAL_REVIEWS[c.id])){
  assert.ok(['SOURCE PENDING','REVIEW PENDING','NEAR READY','PARTIAL','RULE BLOCKED'].includes(c.status));
  assert.notEqual(c.status,'READY');
 }
});
