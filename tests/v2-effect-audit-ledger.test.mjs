import test from 'node:test';
import assert from 'node:assert/strict';
import ledger from '../docs/audit/effect-audit-ledger.json' with {type:'json'};

test('the effect ledger does not treat an unchecked card as passed',()=>{
 assert.equal(ledger.summary.已驗證,0);
 assert.equal(ledger.summary.未檢查,ledger.summary.total);
 const csm=ledger.cards.find(card=>card.id==='CSM-1-001');
 assert.equal(csm?.status,'未檢查');
 assert.equal(csm.clauses.every(clause=>clause.status==='未檢查'),true);
 const iys=ledger.cards.find(card=>card.id==='IYS-1-035');
 assert.equal(iys?.status,'未檢查');
 assert.equal(iys.clauses.find(clause=>clause.text.includes('BP-1000'))?.status,'已驗證');
 assert.equal(iys.clauses.find(clause=>clause.text.includes('スペシャル'))?.status,'未檢查');
 for(const card of ledger.cards){
  if(card.status!=='已驗證')continue;
  assert.equal(card.clauses.every(clause=>clause.status==='已驗證'),true,card.id);
 }
 assert.match(ledger.next,/CSM-1-001/);
});
