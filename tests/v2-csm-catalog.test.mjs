import test from 'node:test';
import assert from 'node:assert/strict';
import {CSM_CARDS,CSM_FETCHED,CSM_SETS} from '../dist/csm-cards.mjs';
import {csmEngineKind,CSM_EFFECT_KINDS} from '../dist/universal-v2/csm-kinds.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';

test('CSM set 1 catalogue has 80 playable identities',()=>{
 assert.equal(CSM_SETS.length,1);
 assert.equal(CSM_SETS[0],'UA53BT');
 assert.ok(CSM_FETCHED);
 assert.equal(CSM_CARDS.length,80);
 assert.equal(CSM_CARDS[0].id,'CSM-1-001');
 assert.equal(CSM_CARDS[79].id,'CSM-1-080');
 assert.ok(!V2_TITLE_IDS.includes('csm'));
});

test('CSM engine kinds cover every printed Japanese sentence',()=>{
 const unique=new Set(CSM_CARDS.map(c=>c.effectJa));
 assert.equal(CSM_EFFECT_KINDS.size,unique.size);
 for(const card of CSM_CARDS){
  assert.equal(csmEngineKind(card.effectJa),card.engineKind,card.id);
  assert.equal(card.title,'csm');
  assert.equal(card.set,'UA53BT');
  assert.ok(card.source.includes('UA53BT%2F'+card.id));
  assert.ok(card.sourceTc.includes('UA53BT%2F'+card.id));
  assert.ok(card.nameJa);
  assert.ok(card.name);
  assert.ok(['purple','red'].includes(card.color),card.id);
  assert.ok(['character','event','field'].includes(card.type),card.id);
  assert.equal(Array.isArray(card.traits)?card.traits.length:0,0,card.id);
  assert.ok(Number.isInteger(card.gen)&&card.gen>=0,card.id);
  assert.ok(card.genMark===''||card.genMark==='+',card.id);
 }
});

test('CSM generated energy uses alt pip counts, not sprite ids',()=>{
 // Official pages: one color character in alt => gen 1. Trailing + is genMark.
 const plus=Object.fromEntries(
  CSM_CARDS.filter(c=>c.genMark==='+').map(c=>[c.id,c.gen]));
 assert.deepEqual(plus,{
  'CSM-1-003':1,
  'CSM-1-005':1,
  'CSM-1-049':1,
  'CSM-1-059':1,
  'CSM-1-069':1
 });
 // CSM-1-008 printed two purple pips (alt 紫紫), filename may still say *2.
 assert.equal(CSM_CARDS.find(c=>c.id==='CSM-1-008').gen,2);
 assert.equal(CSM_CARDS.find(c=>c.id==='CSM-1-024').gen,1);
 assert.equal(CSM_CARDS.find(c=>c.id==='CSM-1-024').energy,5);
});

test('CSM colour split and FAQ pins',()=>{
 const purple=CSM_CARDS.filter(c=>c.color==='purple');
 const red=CSM_CARDS.filter(c=>c.color==='red');
 assert.equal(purple.length,40);
 assert.equal(red.length,40);
 assert.equal(CSM_CARDS.filter(c=>c.type==='character').length,63);
 assert.equal(CSM_CARDS.filter(c=>c.type==='event').length,14);
 assert.equal(CSM_CARDS.filter(c=>c.type==='field').length,3);
 const faqIds=new Set(CSM_CARDS.flatMap(c=>c.faq.map(f=>f.id)));
 for(let n=2073;n<=2103;n++)assert.ok(faqIds.has('Q'+n),'Q'+n);
 assert.ok(CSM_CARDS.find(c=>c.id==='CSM-1-022').faq.some(f=>f.id==='Q2079'));
});
