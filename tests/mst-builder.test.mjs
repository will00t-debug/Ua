import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLES} from '../dist/title-registry.mjs';
import {UA54BT_AP} from '../dist/mushoku-tensei.mjs';
import {MST_CARDS,emptyMstDeck,normalizeMstCounts,mstDeckIssues,readMstSaved} from '../dist/mst-builder.mjs';
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
test('Mushoku Tensei is a distinct third title with a verified UA54BT card',()=>{
 assert.equal(TITLES.length,3);
 const mst=TITLES.find(t=>t.id==='mushoku-tensei');
 assert.equal(mst.playable,false);assert.equal(mst.cards,MST_CARDS);
 assert.equal(MST_CARDS.length,80);assert.equal(UA54BT_AP.length,12);
 assert.equal(MST_CARDS.find(c=>c.id==='MST-1-040').verified,true);assert.equal(MST_CARDS.find(c=>c.id==='MST-1-040').auto,false);
 assert.equal(MST_CARDS.filter(c=>c.verified).length,8);
});
test('Mushoku Tensei draft rejects BLEACH and TTG cards, and preserves four-copy max',()=>{
 const id=MST_CARDS[0].id;
 assert.deepEqual(normalizeMstCounts({[id]:1})[id],1);
 assert.throws(()=>normalizeMstCounts({'UA08ST/BLC-1-104':1}),/卡號不存在/);
 assert.throws(()=>normalizeMstCounts({'TTG-1-081':1}),/卡號不存在/);
 assert.throws(()=>normalizeMstCounts({[id]:5}),/超過每種 4 張/);
 assert.ok(mstDeckIssues({[id]:4}).some(x=>x.includes('自動判定')));
 assert.equal(readMstSaved([{id:'a',name:'測試',counts:emptyMstDeck()}]).length,1);
});
test('Mushoku Tensei editor offers title picker, counts and isolated saving',()=>{
 for(const pattern of [/function mstLibrary\(\)/,/data-mst-count/,/MST_DRAFT_KEY/,/MST_SAVED_KEY/,/case 'mstSave'/,/ui.title==='mushoku-tensei'/])assert.match(app,pattern);
});
