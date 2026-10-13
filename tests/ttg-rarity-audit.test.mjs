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
test('all previously missing numeric fields are now recorded from card fronts',()=>{
 const verified=new Set(['TTG-1-002','TTG-1-006','TTG-1-049','TTG-1-059','TTG-1-063','TTG-1-065','TTG-1-071']);
 assert.equal(TTG_PENDING_CARDS.length,0);
 for(const id of verified){
  const c=UA56BT_VERIFIED.find(card=>card.id===id);
  assert.ok(c,id);
  for(const field of ['ap','energy','bp','gen'])assert.ok(Number.isInteger(c[field])&&c[field]>=0,id+' '+field);
  assert.equal(c.verifiedFrom,'user-uploaded-card-front-pdf-2026-10-13',id);
  assert.equal(c.auto,false,id);
 }
});
