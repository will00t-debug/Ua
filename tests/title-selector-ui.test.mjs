import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLES} from '../dist/title-registry.mjs';
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
test('BLEACH and TTG selectors are present in deck editor',()=>{
 assert.equal(TITLES.length,2);
 assert.match(app,/data-title=/);
 assert.match(app,/ui\.title==='gurren-lagann'\)return ttgLibrary\(\)/);
});
test('TTG deck drafts are isolated from BLEACH drafts and playable Raid',()=>{
 assert.match(app,/ua-ttg-draft-v1/);
 assert.match(app,/ua-ttg-saved-v1/);
 assert.match(app,/天元突破尚未開放對戰/);
 assert.match(app,/raidFlow/);
});
test('TTG card inspection uses source link rather than BLEACH cards',()=>{
 assert.match(app,/TTG_CARDS\.find/);
 assert.match(app,/window\.open\(c\.source/);
});

test('eight partially identified TTG cards are read-only and never constructible',async()=>{
 const {TTG_PENDING_CARDS}=await import('../dist/ttg-pending.mjs');
 const {TTG_BY_ID,normalizeTtgCounts}=await import('../dist/ttg-builder.mjs');
 assert.equal(TTG_PENDING_CARDS.length,8);
 assert.match(app,/TTG_PENDING_CARDS\.filter/);
 assert.match(app,/資料待核對・不可放入牌組/);
 assert.match(app,/能源 —/);
 for(const c of TTG_PENDING_CARDS){
  assert.equal(TTG_BY_ID[c.id],undefined);
  assert.throws(()=>normalizeTtgCounts({[c.id]:1}));
  assert.equal(c.metadataComplete,false);
  for(const field of ['energy','ap','bp','gen'])assert.equal(c[field],null);
 }
});
