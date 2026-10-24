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
 assert.equal(sao,undefined,'R44 source-complete 069 is no longer unported');
 assert.ok(R41_OFFICIAL_REVIEWS['SAO-2-069'].missing.length>=4,'historical blocker evidence retained');
 const mst=r.candidates.find(c=>c.id==='MST-1-067');
 assert.ok(mst);assert.equal(mst.status,'RULE BLOCKED');
 assert.ok(mst.missing.some(x=>x.includes('Q2162')));
 for(const c of r.candidates.filter(c=>!R41_OFFICIAL_REVIEWS[c.id])){
  assert.ok(['SOURCE PENDING','REVIEW PENDING','NEAR READY','PARTIAL','RULE BLOCKED'].includes(c.status));
  assert.notEqual(c.status,'READY');
 }
});

test('R41 historical reviews retain evidence as later source-pinned cards become registered',()=>{
 const r=r41SpecialHandCandidateReport();
 const ids=["SAO-1-028","SAO-1-087","SAO-2-064","SAO-2-068","BLC-4-042","BLC-4-036","SLG-1-028"];
 const registered=new Set(v2AllTitleInventory().series.flatMap(x=>x.pilotIds));
 assert.equal(r.stats.manuallyVerifiedUnportedR41,
  Object.keys(R41_OFFICIAL_REVIEWS).filter(id=>!registered.has(id)).length);
 for(const id of ids){
  if(id==='BLC-4-042'||id==='SLG-1-028'||id==='SAO-2-068'||id==='SAO-2-064'||id==='SAO-1-087'||id==='BLC-4-036'){
   assert.ok(!r.candidates.some(c=>c.id===id),'now registered whole printed card cannot remain unported');
   continue;
  }
  const c=r.candidates.find(c=>c.id===id);
  assert.ok(c,id+' not scanned');
  assert.equal(c.status,'PARTIAL');
  assert.ok(c.missing.length>=3);
  assert.ok(c.sourceUrl.startsWith('https://www.unionarena-tcg.com/jp/'));
 }
 assert.equal(r.stats.byStatus['READY'],0);
 assert.equal(r.stats.byStatus['RULE BLOCKED'],1);
});
