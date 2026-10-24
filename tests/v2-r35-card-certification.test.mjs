import test from 'node:test';
import assert from 'node:assert/strict';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {R35_CHECKS,R35_STATUS,R35_INDEPENDENT_REVIEWS,
 assertR35Review,r35CardCertificationInventory}
 from '../scripts/v2-card-certification-report.mjs';

test('R35 A: exact independent 700-card status partition; no synthetic FAQ certification',()=>{
 const source=v2AllTitleInventory(),audit=r35CardCertificationInventory();
 assert.equal(audit.total,700);
 assert.equal(audit.registered,source.totals.pilotImplemented);
 assert.equal(audit.unported,source.totals.blocked);
 assert.equal(audit.registered+audit.unported,audit.total);
 assert.equal(audit.independentlyCertified,0);
 const independentlyReviewed=Object.keys(R35_INDEPENDENT_REVIEWS).length;
 assert.equal(audit.counts[R35_STATUS.partial],independentlyReviewed);
 assert.equal(audit.counts[R35_STATUS.registered],audit.registered-independentlyReviewed);
 assert.equal(audit.counts[R35_STATUS.unported],audit.unported);
 assert.equal(new Set(audit.entries.map(x=>x.id)).size,700);
 for(const id of ['MST-1-060','MST-1-080','SAO-1-031','SAO-1-066','SAO-1-005','TTG-1-028','SLG-1-070','MST-1-059','SAO-2-074','MST-1-062','BLC-1-070','SLG-1-046','MST-1-031','SAO-1-056','SAO-2-056','MST-1-049','SAO-2-064']){
  const row=audit.entries.find(x=>x.id===id);
  assert.equal(row.registered,true);assert.equal(row.status,R35_STATUS.partial);
  assert.equal(R35_INDEPENDENT_REVIEWS[id].officialUrl.includes(id),true);
  assert.equal(assertR35Review(R35_INDEPENDENT_REVIEWS[id]),true);
 }
});
test('R35 A: fail closed on claimed exhaustive certification without every FAQ and lifecycle proof',()=>{
 assert.equal(R35_CHECKS.length,13);
 const example=R35_INDEPENDENT_REVIEWS['SLG-1-070'];
 assert.deepEqual(example.knownApplicableFaq,['Q2062']);
 assert.equal(example.checks.applicableFaqAudit,'pending');
 assert.throws(()=>assertR35Review({...example,status:R35_STATUS.certified}),
  /Cannot assert exhaustive official certification/);
 assert.throws(()=>assertR35Review({...example,
  checks:{...example.checks,uidSerializationAndPrivacy:'fake-pass'}}),
  /Invalid R35 independent review descriptor/);
 assert.equal(R35_INDEPENDENT_REVIEWS['SAO-1-005'].knownApplicableFaq.length,0);
 assert.match(R35_INDEPENDENT_REVIEWS['SAO-1-005'].faqSearchOutcome,/pending/);
});
