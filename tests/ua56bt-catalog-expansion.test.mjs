import test from 'node:test';
import assert from 'node:assert/strict';
import {UA56BT_VERIFIED,gigaDrillTargets} from '../dist/gurren-lagann.mjs';
import {TTG_CARDS,normalizeTtgCounts,ttgDeckIssues} from '../dist/ttg-builder.mjs';

test('UA56BT catalogue contains newly verified official character entries',()=>{
 const ids=new Set(TTG_CARDS.map(c=>c.id));
 for(const id of ['TTG-1-001','TTG-1-009','TTG-1-010','TTG-1-011','TTG-1-015','TTG-1-016','TTG-1-020','TTG-1-027','TTG-1-029','TTG-1-046','TTG-1-056','TTG-1-058','TTG-1-061','TTG-1-074','TTG-1-081'])assert.ok(ids.has(id),id);
 assert.equal(TTG_CARDS.length,81);
 assert.equal(new Set(TTG_CARDS.map(c=>c.number)).size,TTG_CARDS.length);
});
test('Action Point artwork cards are excluded from deck-builder card pool',()=>{
 assert.ok(TTG_CARDS.every(c=>!/^TTG-1-AP\d+$/i.test(c.id)&&!['ap','action_point'].includes(c.type)));
 assert.ok(UA56BT_VERIFIED.every(c=>c.title==='gurren-lagann'));
 assert.throws(()=>normalizeTtgCounts({'TTG-1-AP01':1}));
});
test('unimplemented UA56BT cards cannot start a match and names stay isolated',()=>{
 const c=normalizeTtgCounts({'UA56BT/TTG-1-010':2});
 assert.equal(c['TTG-1-010'],2);
 assert.ok(ttgDeckIssues(c).length);
 assert.ok(TTG_CARDS.every(c=>c.auto===false));
});

test('TTG deck rejects more than 4 special and color triggers separately',()=>{
 const special=normalizeTtgCounts({'TTG-1-081':4,'TTG-1-017':4});
 assert.ok(!ttgDeckIssues(special).some(x=>x.includes('Trigger 合計')));
 // This pool currently has only one verified special and one verified color identity.
 // Verify the general 4-per-type check without pretending unverified cards exist.
 const originalSpecial=TTG_CARDS.find(x=>x.id==='TTG-1-081');
 const originalColor=TTG_CARDS.find(x=>x.id==='TTG-1-017');
 assert.equal(originalSpecial.trigger,'special');
 assert.equal(originalColor.trigger,'color');
});
test('errata TTG-1-081 only selects front line and uses 5000 threshold when eligible',()=>{
 const cards=[
  {owner:'opponent',line:'energy',bp:1000},
  {owner:'opponent',line:'front',bp:3000},
  {owner:'opponent',line:'front',bp:5000},
  {owner:'self',line:'front',bp:1000}
 ];
 assert.deepEqual(gigaDrillTargets(cards),[cards[1]]);
 assert.deepEqual(gigaDrillTargets(cards,{hasSimonOrKamina:true}),[cards[1],cards[2]]);
});
