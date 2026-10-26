import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_CARDS,emptyTtgDeck,normalizeTtgCounts,ttgCount,ttgDeckIssues,readTtgSaved} from '../dist/ttg-builder.mjs';
import {PRESETS,CARDS} from '../dist/cards.mjs';
test('TTG draft is an independent catalogue with no BLEACH card keys',()=>{
 const draft=emptyTtgDeck();
 assert.equal(Object.keys(draft).length,TTG_CARDS.length);
 assert.equal(CARDS.length,276);
 assert.equal(PRESETS.length,2);
 assert.ok(!Object.hasOwn(draft,'104'));
});
test('TTG cards and variants have one shared four-copy limit',()=>{
 const id=TTG_CARDS[0].id,full=TTG_CARDS[0].number;
 assert.equal(normalizeTtgCounts({[full]:3})[id],3);
 assert.throws(()=>normalizeTtgCounts({[id]:3,[full]:2}),/超過 4 張/);
 assert.throws(()=>normalizeTtgCounts({'UA08ST/BLC-1-104':1}),/卡號不存在/);
 assert.throws(()=>normalizeTtgCounts({[id]:5}),/超過每種 4 張/);
});
test('unfinished partial drafts are savable but cannot be played',()=>{
 const draft=normalizeTtgCounts({[TTG_CARDS[0].id]:2});
 assert.equal(ttgCount(draft),2);
 assert.ok(ttgDeckIssues(draft).some(x=>x.includes('50 張')));
 assert.equal(ttgDeckIssues(draft).some(x=>x.includes('自動判定')),false);
 const saved=readTtgSaved([{id:'draft',name:'測試草稿',counts:draft},{id:'invalid',name:'不合法',counts:{bleach:1}}]);
 assert.equal(saved.length,1);
 assert.deepEqual(saved[0].counts,draft);
});
