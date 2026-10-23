import test from 'node:test';
import assert from 'node:assert/strict';
import {r40ProtectionCandidateReport,R40_SOURCE_PINNED_REVIEWS}
 from '../scripts/v2-r40-protection-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from '../scripts/v2-r35-unported-atom-audit.mjs';
test('R40 full 700 catalogue, all currently unported, and three historical candidate pools reconcile',()=>{
 const roster=v2AllTitleInventory(),idx=capabilityIndex(roster);
 const report=r40ProtectionCandidateReport(),s=report.stats;
 assert.equal(s.catalogueSize,700);
 assert.equal(s.unportedSearched,roster.totals.blocked);
 assert.equal(s.registered,roster.totals.pilotImplemented);
 assert.equal(s.protectionKeywordCandidates,idx.protectionPotential.length);
 assert.equal(s.officialCompletePrintReviewedThisRound,3);
 assert.equal(s.newlyRegisteredByThisAudit,2);
 assert.equal(s.readyFromKeywordOnly,0);
 assert.equal(s.handDeployKeywordCandidates,idx.handRestPotential.length);
 assert.equal(s.optionalRetireTopKeywordCandidates,idx.retireTopPotential.length);
 const unique=new Set(idx.protectionPotential.map(c=>c.id));
 assert.equal(unique.size,s.protectionKeywordCandidates);
 for(const row of idx.protectionPotential){
  assert.equal(row.sourceFingerprint.length,64);
  assert.equal(row.status==='REVIEW PENDING'||row.status==='SOURCE PENDING',true);
  assert.equal(typeof row.flags.characterScope,'boolean');
  assert.equal(typeof row.flags.triggerScope,'boolean');
 }
 const sums=Object.values(s.byTitle).reduce((a,n)=>a+n,0);
 assert.equal(sums,s.protectionKeywordCandidates);
 for(const row of report.keywordOnlyProtectionCandidates)assert.equal(row.status,'REVIEW PENDING');
 console.log('R40_FULL_ROSTER_COUNTS '+JSON.stringify(s));
});
test('R40 source-qualified full print and Q2162 conflict are never promoted by keyword matching',()=>{
 const r=r40ProtectionCandidateReport();
 assert.deepEqual(Object.keys(R40_SOURCE_PINNED_REVIEWS).sort(),
  ['MST-1-067','SAO-2-058','SAO-2-060']);
 const sao=r.sourcePinnedReviews.find(c=>c.id==='SAO-2-058');
 const mst=r.sourcePinnedReviews.find(c=>c.id==='MST-1-067');
 const music=r.sourcePinnedReviews.find(c=>c.id==='SAO-2-060');
 assert.equal(sao.scope,'opponent-any');assert.equal(sao.status,'REGISTERED');
 assert.equal(sao.registered,true);assert.deepEqual(sao.missing,[]);
 assert.equal(music.scope,'opponent-character');assert.equal(music.status,'REGISTERED');
 assert.equal(music.registered,true);assert.deepEqual(music.missing,[]);
 assert.equal(mst.scope,'UNRESOLVED');assert.equal(mst.status,'RULE BLOCKED');
 for(const item of r.sourcePinnedReviews.filter(x=>!x.registered)){
  assert.ok(item.missing.length,'incomplete card must keep all printed blockers');
 }
 for(const [name,items] of Object.entries(r.overlap)){
  assert.equal(new Set(items).size,items.length,name+' repeated UID');
 }
});
