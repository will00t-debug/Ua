import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_DRAFT_PRESET,normalizeSoloDeck,soloDeckIssues} from '../dist/solo-decks.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
const sum=counts=>Object.values(counts).reduce((n,v)=>n+v,0);
test('80 normal UA51BT identities, no aliases counted as another card',()=>{
 assert.equal(SOLO_LEVELING_CARDS.length,80);
 assert.equal(new Set(SOLO_LEVELING_CARDS.map(c=>c.id)).size,80);
 const counts=normalizeSoloDeck({'SLG-1-030':7,'UAPR/SLG-1-030':5});
 assert.equal(counts['SLG-1-030'],12);
 assert.throws(()=>normalizeSoloDeck({'SLG-1-030':9,'UAPR/SLG-1-030':4}),/copy limit/);
 assert.equal(normalizeSoloDeck({'UAPR/SLG-1-019':2})['SLG-1-019'],2);
 assert.throws(()=>normalizeSoloDeck({'SLG-1-001':5}),/copy limit/);
 assert.throws(()=>normalizeSoloDeck({'BLC-1-001':1}),/invalid/);
 assert.throws(()=>normalizeSoloDeck({'SLG-1-001':1.5}),/invalid/);
});
test('sample shadow-army draft contains exactly 50 canonical copies but cannot play until actual effects are integrated',()=>{
 const deck=normalizeSoloDeck(SOLO_DRAFT_PRESET);
 assert.equal(sum(deck),50);
 assert.equal(deck['SLG-1-030'],12);
 assert.ok(soloDeckIssues(deck).some(x=>x.includes('不能開始對戰')));
 assert.equal(soloDeckIssues({'SLG-1-001':4}).some(x=>x.includes('50')),true);
});
test('trigger limits are enforced separately, and partial draft does not claim playable',()=>{
 const deck={'SLG-1-040':4,'SLG-1-076':1};
 assert.ok(soloDeckIssues(deck).some(x=>x.includes('SPECIAL')));
 assert.ok(soloDeckIssues({}).some(x=>x.includes('50')));
});
