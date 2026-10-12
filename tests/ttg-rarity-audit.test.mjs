import test from 'node:test';
import assert from 'node:assert/strict';
import {UA56BT_VERIFIED} from '../dist/gurren-lagann.mjs';
import {TTG_PENDING_CARDS} from '../dist/ttg-pending.mjs';

test('UA56BT has exactly 81 unique effect card numbers and official rarity distribution',()=>{
 const all=[...UA56BT_VERIFIED,...TTG_PENDING_CARDS];
 assert.equal(all.length,81);
 const ids=new Set(all.map(c=>c.id));
 assert.equal(ids.size,81);
 for(let i=1;i<=81;i++)assert.ok(ids.has('TTG-1-'+String(i).padStart(3,'0')));
 for(const [rarity,expected] of Object.entries({SR:12,R:12,U:28,C:29}))
  assert.equal(all.filter(c=>c.rarity===rarity).length,expected,rarity);
 assert.ok(all.every(c=>!c.id.includes('-AP')&&c.auto===false));
});
test('partial catalogue keeps unavailable numeric data unknown even when effect text was independently checked',()=>{
 const verified=new Set(['TTG-1-006','TTG-1-049','TTG-1-059','TTG-1-063','TTG-1-065']);
 assert.equal(TTG_PENDING_CARDS.length,8);
 for(const c of TTG_PENDING_CARDS){
  for(const field of ['ap','energy','bp','gen'])assert.equal(c[field],null,c.id);
  if(verified.has(c.id)){
   assert.ok(c.effect?.length>12,c.id);
   assert.equal(c.effectVerification,'fan-transcription-not-official-full-metadata',c.id);
   assert.ok(c.effectTranscriptionSource.includes('rugiacreation.com'),c.id);
  }
 }
});
