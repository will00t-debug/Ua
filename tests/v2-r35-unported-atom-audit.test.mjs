import test from 'node:test';
import assert from 'node:assert/strict';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {R35_SHARED_ATOM_CANDIDATES,r35UnportedAtomAudit}
 from '../scripts/v2-r35-unported-atom-audit.mjs';

test('R35 C: every currently unported identity appears once in exact source partition',()=>{
 const inventory=v2AllTitleInventory(),audit=r35UnportedAtomAudit();
 assert.equal(audit.totalUnported,inventory.totals.blocked);
 assert.equal(audit.totalUnported,audit.manuallySourceMatched+audit.needsIndividualSemanticAudit);
 assert.equal(audit.groups.length,5);
 const actual=new Set(inventory.series.flatMap(s=>s.unportedIds));
 const grouped=audit.groups.flatMap(g=>g.ids).filter(id=>actual.has(id));
 assert.equal(new Set([...grouped,...audit.pendingIds]).size,actual.size);
 assert.deepEqual(new Set([...grouped,...audit.pendingIds]),actual);
 assert.equal(grouped.length,audit.manuallySourceMatched);
 assert.equal(audit.groups.flatMap(g=>g.ids).length,10);
 for(const group of audit.groups){
  assert.ok(group.missing);
  assert.ok(group.existing);
  assert.ok(group.faq);
  assert.ok(group.fullPortBlockedBy);
  assert.equal(group.sourceUrls.length,group.ids.length);
  for(const url of group.sourceUrls)assert.match(url,/^https:\/\/www\.unionarena-tcg\.com\/jp\/cardlist\/detail_iframe\.php/);
 }
});
test('R35 C: same printed word does not collapse distinct prerequisite/target/source meanings',()=>{
 const [next,top,protect,front,retire]=R35_SHARED_ATOM_CANDIDATES;
 assert.deepEqual(next.ids,['SAO-2-074','MST-1-062']);
 assert.match(next.faq,/Q1210.*Q2161/);
 assert.match(next.fullPortBlockedBy,/COLOR/);
 assert.deepEqual(top.ids,['SAO-1-031','SAO-1-066']);
 assert.match(top.missing,/0\.\.2/);
 assert.match(protect.fullPortBlockedBy,/Raid/);
 assert.match(front.existing,/frontEnergyPermission/);
 assert.match(retire.missing,/character/);
 assert.match(retire.missing,/field/);
});
