import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_REGULAR_CARDS,mstCanonicalId,mstNormalizeDeck,mstValidateDeck} from '../dist/mst-deck-rules.mjs';
test('the full 80-card registry excludes action-point and parallel-art identities',()=>{
 assert.equal(MST_REGULAR_CARDS.length,80);
 assert.deepEqual(MST_REGULAR_CARDS.filter(c=>c.number.includes('_p')||c.number.includes('AP')),[]);
 assert.equal(mstCanonicalId('UA54BT/MST-1-051_p2'),'MST-1-051');
});
test('2026-10-01 official restricted Roxy 051 can be included only once',()=>{
 const deck=mstNormalizeDeck({'MST-1-051':1});
 assert.equal(deck['MST-1-051'],1);
 assert.throws(()=>mstNormalizeDeck({'MST-1-051':2}),/最多 1 張/);
 assert.throws(()=>mstNormalizeDeck({'MST-1-051':1,'UA54BT\/MST-1-051_p2':1}),/最多 1 張/);
});
test('different series, AP designs and unknown cards cannot enter an MST deck',()=>{
 for(const id of ['UA08BT/BLC-1-034','TTG-1-001','MST-1-AP01','MST-1-081','UA54BT/MST-1-039_pX']){
  assert.throws(()=>mstNormalizeDeck({[id]:1}),/非無職轉生一般卡號/);
 }
});
test('a 50-card deck cannot launch AI while its selected effects are not automatic',()=>{
 const deck={};for(const c of MST_REGULAR_CARDS.slice(0,12))deck[c.id]=4;
 deck[MST_REGULAR_CARDS[12].id]=2;
 const check=mstValidateDeck(deck);
 assert.ok(check.some(e=>e.includes('未完成端到端判定')));
 const editChecks=mstValidateDeck(deck,{requirePlayable:false});
 assert.ok(!editChecks.some(e=>e.includes('未完成端到端判定')));
});
