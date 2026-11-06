import test from 'node:test';
import assert from 'node:assert/strict';
import notes from '../docs/audit/effect-audit-notes.json' with {type:'json'};
import ledger from '../docs/audit/effect-audit-ledger.json' with {type:'json'};
import {aggregateCardStatus,buildLedger,nextUnchecked,splitPrintedClauses}
 from '../scripts/build-effect-audit-ledger.mjs';

test('a keyword inside a sentence does not become its own clause',()=>{
 const continuous=splitPrintedClauses(
  '同じラインに〈レゼ〉がある場合、このキャラはBP+1000と【インパクト無効】を得る。');
 assert.deepEqual(continuous,[
  '同じラインに〈レゼ〉がある場合、このキャラはBP+1000と【インパクト無効】を得る。']);
 const denji=splitPrintedClauses(
  '【インパクト無効】（説明）【起動メイン】【レストにする】このキャラをアクティブにする。');
 assert.equal(denji.length,2);
 assert.match(denji[0],/^【インパクト無効】/);
 assert.match(denji[1],/^【起動メイン】/);
 assert.equal(aggregateCardStatus([
  {status:'已驗證'},{status:'未檢查'}
 ]),'部分核對');
 assert.equal(aggregateCardStatus([{status:'已驗證'},{status:'待修正'}]),'待修正');
 assert.equal(aggregateCardStatus([],{ap:true}),'行動值卡');
 assert.equal(aggregateCardStatus([],{noEffect:true}),'無效果');
});

test('clause reviews on one card survive a rebuild and an open clause blocks a pass',()=>{
 const series=[{id:'csm',name:'鏈鋸人',product:'UA53BT',priority:1,runtime:'csm',cards:[
  {id:'CSM-1-001',number:'UA53BT/CSM-1-001',name:'小紅',type:'character',
   source:'https://example.invalid/001',
   effectJa:'【インパクト無効】（説明）【起動メイン】アクティブにする。',
   triggerTextJa:'【ドロー】カードを1枚引く。'},
  {id:'CSM-1-002',number:'UA53BT/CSM-1-002',name:'颱風',type:'character',
   source:'https://example.invalid/002',
   effectJa:'同じラインに〈レゼ〉がある場合、BP+1000と【インパクト無効】を得る。',
   triggerTextJa:''},
  {id:'KMR-AP-001',number:'AP',name:'行動值',type:'action-point',effectJa:'',triggerTextJa:''}
 ]}];
 const shared={official:'https://example.invalid/001',implementation:'engine',
  discrepancy:'',evidence:'tests/sample.mjs',unresolved:''};
 const notes={updated:'2026-11-05',reviews:[
  {cardId:'CSM-1-001',clauses:[
   {match:'インパクト無効',status:'已驗證',...shared},
   {match:'起動メイン',status:'待修正',...shared,implementation:'missing',
    discrepancy:'未實作',unresolved:'還沒改'}
  ]},
  {cardId:'CSM-1-001',clauses:[
   {match:'ドロー',status:'已驗證',...shared}
  ]}
 ]};
 const built=buildLedger({series,notes});
 const again=buildLedger({series,notes});
 const card=built.cards.find(item=>item.id==='CSM-1-001');
 assert.equal(card.clauses.length,3);
 assert.equal(card.clauses.filter(clause=>clause.status==='已驗證').length,2);
 assert.equal(card.clauses.find(clause=>clause.text.includes('起動メイン')).status,'待修正');
 assert.equal(card.status,'待修正');
 assert.equal(again.cards[0].clauses[2].evidence,'tests/sample.mjs');
 assert.equal(built.summary.playable.已驗證,0);
 assert.equal(nextUnchecked(built.cards).id,'CSM-1-002');
 assert.equal(built.next.id,'CSM-1-002');
 const done=notes.reviews[0].clauses.map(item=>({...item,status:'已驗證',unresolved:''}));
 const passed=buildLedger({series,notes:{updated:'2026-11-05',reviews:[
  {cardId:'CSM-1-001',clauses:[...done,{match:'ドロー',status:'已驗證',...shared}]}
 ]}});
 const passedCard=passed.cards.find(item=>item.id==='CSM-1-001');
 assert.equal(passedCard.status,'已驗證');
 assert.equal(passed.summary.playable.已驗證,1);
 assert.equal(passed.next.id,'CSM-1-002');
 assert.equal(passed.cards.find(item=>item.id==='KMR-AP-001').status,'行動值卡');
});

test('the stored ledger keeps unchecked cards unchecked and recounts its own cursor',()=>{
 const playable=ledger.cards.filter(card=>card.kind==='playable');
 const recount={};
 for(const card of playable)recount[card.status]=(recount[card.status]||0)+1;
 for(const status of ['未檢查','待修正','已修正待驗證','已驗證','缺資料待確認','部分核對'])
  assert.equal(ledger.summary.playable[status]||0,recount[status]||0,status);
 for(const card of ledger.cards){
  if(card.status==='已驗證'){
   assert.equal(card.clauses.every(clause=>clause.status==='已驗證'),true,card.id);
   for(const clause of card.clauses){
    assert.ok(clause.evidence.trim(),card.id);
    assert.ok(clause.official.trim(),card.id);
    assert.ok(clause.implementation.trim(),card.id);
    assert.equal(clause.unresolved.trim(),'',card.id);
   }
  }else assert.equal(card.status==='已驗證',false);
 }
 const iys=ledger.cards.find(card=>card.id==='IYS-1-035');
 assert.equal(iys.clauses.find(clause=>clause.text.includes('BP-1000'))?.status,'已驗證');
 assert.equal(iys.clauses.find(clause=>clause.text.includes('スペシャル'))?.status,'已驗證');
 assert.equal(iys.status,'已驗證');
 const activeEntry=ledger.cards.find(card=>card.id==='IYS-1-044');
 assert.equal(activeEntry.status,'缺資料待確認');
 const facedownRaid=ledger.cards.find(card=>card.id==='KMR-1-085');
 assert.equal(facedownRaid.status,'缺資料待確認');
 assert.equal(ledger.cards.find(card=>card.id==='AOT-1-001').status,'已驗證');
 assert.equal(ledger.cards.find(card=>card.id==='AOT-1-026').status,'未檢查');
 assert.equal(ledger.cards.find(card=>card.id==='AOT-2-008').status,'缺資料待確認');
 const cursor=playable.find(card=>card.status==='未檢查');
 assert.equal(ledger.next?.id,cursor?.id);
 for(const review of notes.reviews){
  const card=ledger.cards.find(item=>item.id===review.cardId);
  assert.ok(card,review.cardId);
  assert.ok(card.audits.length>0,review.cardId);
 }
 assert.equal(ledger.summary.ap.total>0,true);
 assert.equal(playable.some(card=>card.kind==='ap'),false);
});
