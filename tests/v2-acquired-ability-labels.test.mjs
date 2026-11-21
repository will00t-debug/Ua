import test from 'node:test';
import assert from 'node:assert/strict';
import {DGM_CARDS} from '../dist/dgm-cards.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {renderCardEffectText} from '../dist/card-effect-display.mjs';
import {auditCardTranslations,auditOrphanedAcquisitionText} from '../scripts/audit-card-translations.mjs';

test('DGM six impact immunity cards keep the full keyword in both translated fields',()=>{
 const ids=['DGM-1-007','DGM-1-011','DGM-1-014','DGM-1-046','DGM-1-052','DGM-1-058'];
 for(const id of ids){
  const card=DGM_CARDS.find(c=>c.id===id);
  assert.ok(card,id+' exists');
  assert.match(card.effectJa,/【インパクト無効】/,id+' original JP text');
  for(const key of ['effect','effectHk']){
   assert.match(card[key],/【貫通無效】（與此角色戰鬥的角色，在本次戰鬥中失去衝擊）/,id+' '+key);
  }
  const html=renderCardEffectText(card.effect);
  assert.match(html,/ua-effect-impact" role="img" aria-label="貫通無效"/,id+' keyword badge');
  assert.match(html,/%23ffe500/,id+' yellow art');
 }
});
test('DGM-1-050 retains awarded snipe keyword and its original condition',()=>{
 const card=DGM_CARDS.find(c=>c.id==='DGM-1-050');
 assert.ok(card);
 assert.match(card.effectJa,/【狙い撃ち】/);
 for(const key of ['effect','effectHk']){
  assert.match(card[key],/自己場上擁有〈艾倫．獲加〉的情況下，此角色在本回合中，獲得【狙擊】（可指定對手前線的角色進行攻擊，該情況下不能被阻擋）/);
 }
 assert.match(renderCardEffectText(card.effect),/獲得【狙擊】/,'wording is not removed by renderer');
});
test('all registered titles are checked for orphaned acquired ability clauses',()=>{
 const summary=auditCardTranslations();
 assert.ok(summary.statistics.length>=19,'every registered title is included');
 const total=summary.statistics.reduce((n,t)=>n+t.total,0);
 assert.ok(total>1000,'large catalog scan');
 const orphaned=auditOrphanedAcquisitionText();
 const fixed=['DGM-1-007','DGM-1-011','DGM-1-014','DGM-1-046','DGM-1-050','DGM-1-052','DGM-1-058'];
 assert.ok(fixed.every(id=>!orphaned.some(row=>row.id===id)),'confirmed source gaps resolved');
 assert.ok(summary.issues.every(row=>['high','review'].includes(row.priority)));
 console.log('ACQUISITION_AUDIT '+JSON.stringify({
  titles:summary.statistics.length,
  totalCards:total,
  translatedPairs:summary.statistics.reduce((n,t)=>n+t.compared,0),
  orphanedHigh:orphaned.filter(x=>x.priority==='high').map(x=>({title:x.title,id:x.id,excerpt:x.excerpt})),
  orphanedReview:orphaned.filter(x=>x.priority==='review').slice(0,60).map(x=>({title:x.title,id:x.id})),
  keywordReview:summary.issues.slice(0,50).map(x=>({title:x.title,id:x.id,ability:x.ability,priority:x.priority}))
 }));
});
