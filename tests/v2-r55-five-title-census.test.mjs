import test from 'node:test';
import assert from 'node:assert/strict';
import {r55SniperBattleFiveTitleAudit}
 from '../scripts/v2-r55-sniper-battle-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';

test('R55 same authoritative registry scans ALL five unported title identities, no keyword READY',()=>{
 const {report,focus,searchGroups}=r55SniperBattleFiveTitleAudit();
 const inv=v2AllTitleInventory(),rest=new Set(inv.series.flatMap(x=>x.unportedIds));
 assert.equal(report.catalogue,700);
 assert.equal(report.unportedSearched,rest.size);
 assert.equal(report.registered+report.unportedSearched,700);
 assert.equal(report.readyInferredFromKeywords,0);
 assert.equal(report.independentFaqCertified,0);
 assert.ok(focus.some(x=>x.id==='TTG-1-067'&&x.status==='REGISTERED'&&x.faq.includes('Q2295')));
 assert.ok(focus.some(x=>x.id==='SAO-1-071'&&x.status==='REGISTERED'));
 for(const id of ['BLC-4-044','SAO-1-097'])
  assert.ok(focus.some(x=>x.id===id&&x.status==='REVIEW PENDING'));
 assert.ok(focus.some(x=>x.id==='SLG-1-022'&&x.status==='REGISTERED'));
 assert.ok(focus.some(f=>f.id==='SLG-1-021'&&f.status==='REGISTERED'));
 assert.ok(focus.some(x=>x.id==='MST-1-009'&&x.status==='REGISTERED'));
 for(const candidates of Object.values(searchGroups)){
  assert.equal(candidates.length,new Set(candidates.map(x=>x.id)).size);
  assert.ok(candidates.every(x=>rest.has(x.id)&&x.status==='REVIEW PENDING'));
 }
});
