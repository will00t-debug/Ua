import test from 'node:test';
import assert from 'node:assert/strict';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {r58FiveTitleReview,R58_OFFICIAL_REVIEW} from '../scripts/v2-r58-five-title-handoff.mjs';
const SIX=['BLC-1-007','BLC-1-044','BLC-1-073','SAO-1-015','SAO-1-050','SAO-1-092','MST-1-006','MST-1-007','BLC-1-015','BLC-1-027','BLC-1-076','BLC-2-004','BLC-2-039','BLC-2-043','BLC-1-098','BLC-1-106','BLC-1-003','BLC-1-019','BLC-2-062','BLC-4-038','BLC-2-054','BLC-1-084','BLC-2-068'];
test('R58 all five titles classify the dynamically unported entire 700-card catalogue',()=>{
 const live=v2AllTitleInventory(),{report,records}=r58FiveTitleReview();
 assert.equal(report.catalogue,700);
 assert.equal(report.unported,live.totals.blocked);
 assert.equal(report.registered,live.totals.pilotImplemented);
 assert.equal(records.length,new Set(records.map(r=>r.id)).size);
 assert.equal(Object.values(report.statuses).reduce((a,b)=>a+b,0),report.unported);
 for(const title of live.series){
  assert.equal(report.byTitle[title.title].registered,title.pilotImplemented);
  assert.equal(report.byTitle[title.title].unported,title.unportedIds.length);
  assert.deepEqual(records.filter(r=>r.title===title.title).map(r=>r.id).sort(),
   [...title.unportedIds].sort());
 }
});
test('R58 six hand reduction cards are Cursor production registrations and absent from the unported ledger',()=>{
 const live=v2AllTitleInventory(),{records}=r58FiveTitleReview();
 const registered=new Set(live.series.flatMap(s=>s.pilotIds));
 for(const id of SIX){
  assert.ok(registered.has(id),id);
  assert.equal(records.find(c=>c.id===id),undefined);
  assert.equal(R58_OFFICIAL_REVIEW[id].owner,'Cursor');
  assert.equal(R58_OFFICIAL_REVIEW[id].status,'READY');
  assert.ok(R58_OFFICIAL_REVIEW[id].source.includes(id));
 }
});
test('R58 strict blockers remain unported, especially corrected TTG Q2301',()=>{
 const live=v2AllTitleInventory(),{records}=r58FiveTitleReview();
 const registered=new Set(live.series.flatMap(s=>s.pilotIds));
 for(const id of ['TTG-1-057','TTG-1-069','TTG-1-081','SLG-1-022']){
  assert.ok(registered.has(id),id);
  assert.equal(records.find(c=>c.id===id),undefined);
  assert.equal(R58_OFFICIAL_REVIEW[id].owner,'GPT');
  assert.equal(R58_OFFICIAL_REVIEW[id].status,'READY');
 }
 for(const id of ['MST-1-021','MST-1-033']){
  const c=records.find(c=>c.id===id);
  assert.ok(c,id+' incorrectly auto-ported from a keyword');
  assert.equal(c.owner,'GPT');
  assert.ok(['RULE BLOCKED','ENGINE BLOCKED'].includes(c.status));
 }
 assert.match(R58_OFFICIAL_REVIEW['TTG-1-081'].missing,/FRONT/);
});
