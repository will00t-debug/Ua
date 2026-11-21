import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCardTranslations} from '../scripts/audit-card-translations.mjs';

test('all registered titles are inspected for translated ability parity',()=>{
 const audit=auditCardTranslations();
 const summary=audit.statistics.reduce((out,row)=>{
  for(const key of ['total','compared','japaneseOnly','noJapanese','emptyTranslated','marked'])out[key]=(out[key]||0)+row[key];
  return out;
 },{});
 assert.ok(audit.statistics.length>=19,'scan each registered title');
 assert.ok(summary.total>1000,'scan card inventory, not a small sample');
 assert.ok(summary.compared>600,'audit actual Japanese/translated pairs');
 for(const id of ['DGM-1-020','DGM-1-040','DGM-1-047','DGM-1-067','DGM-1-068']){
  assert.ok(!audit.issues.some(issue=>issue.id===id),'repaired keyword is not missing: '+id);
 }
 assert.ok(audit.issues.every(x=>x.priority==='high'||x.priority==='review'),'uncertain matches require review');
 // Deliberately report unreviewed suspects rather than auto-rewrite their effects.
 console.log('CARD_TRANSLATION_AUDIT '+JSON.stringify({
  titles:audit.statistics,
  totals:summary,
  highPriority:audit.issues.filter(x=>x.priority==='high').map(x=>({title:x.title,id:x.id,ability:x.ability})),
  reviewCount:audit.issues.filter(x=>x.priority==='review').length,
  reviewSamples:audit.issues.filter(x=>x.priority==='review').slice(0,60).map(x=>({title:x.title,id:x.id,ability:x.ability}))
 }));
});
