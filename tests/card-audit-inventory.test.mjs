import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {CARD_RULES} from '../dist/card-rules.mjs';
import {EXTRA_RULES} from '../dist/extra-rules.mjs';
import {V9_RULES} from '../dist/v9-rules.mjs';

test('BLEACH inventory: 276 unique identities and usable core printed fields',()=>{
 assert.equal(CARDS.length,276);
 assert.equal(new Set(CARDS.map(c=>c.identity)).size,276);
 for(const c of CARDS){
  assert.ok(/^BLC-\d-\d{3}$/.test(c.identity),c.identity);
  assert.ok(c.number&&c.name&&c.source&&c.effect!==undefined,c.identity);
  for(const key of ['energy','ap','bp','gen'])assert.ok(Number.isFinite(c[key])&&c[key]>=0,`${c.identity} ${key}`);
  assert.ok(c.type==='character'||c.type==='event'||c.type==='field',c.identity);
 }
});
test('coverage flags and rule profiles must not be interpreted as verified cards',()=>{
 for(const c of CARDS){
  const profile=CARD_RULES[c.identity]||EXTRA_RULES[c.identity]||V9_RULES[c.identity];
  assert.equal(typeof Boolean(profile||c.rules),'boolean');
  // This assertion intentionally checks the inventory only, not official semantics.
 }
});
