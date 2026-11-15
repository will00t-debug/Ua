import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_057_063} from '../dist/rnk/cards-057-063.mjs';
import {RNK_CARDS_064_070} from '../dist/rnk/cards-064-070.mjs';
import {RNK_CARDS_071_077} from '../dist/rnk/cards-071-077.mjs';
import {RNK_CARDS_078_084} from '../dist/rnk/cards-078-084.mjs';
import {RNK_BOOSTER_IDS,RNK_SOURCE_CATALOG} from '../dist/rnk/manifest.mjs';
const groups=[RNK_CARDS_057_063,RNK_CARDS_064_070,RNK_CARDS_071_077,RNK_CARDS_078_084],rows=groups.flat();
test('C group is a complete unique 28-card official numbered inventory',()=>{
  assert.deepEqual(groups.map(g=>g.length),[7,7,7,7]);
  assert.deepEqual(rows.map(c=>c.id),RNK_BOOSTER_IDS.slice(56,84));
  assert.equal(new Set(rows.map(c=>c.id)).size,28);
  assert.deepEqual(rows.map(c=>c.color),[...Array(11).fill('purple'),...Array(17).fill('red')]);
});
test('C group has linked identity, translated rules synopsis and never claims V2 readiness',()=>{
  for(const row of rows){
    assert.equal(row.title,'rnk');
    assert.equal(row.set,'UA41BT');
    assert.equal(row.confirmedTc,true);
    assert.equal(row.battleReady,false);
    assert.equal(row.cardDataVerified,false);
    assert.equal(row.effectImplemented,false);
    assert.equal(row.effectJa,null);
    assert.ok(row.nameZhTw&&row.effectZhTw&&row.image);
    assert.equal(row.deckLegal,true);
    assert.ok(row.sourceTc.endsWith('UA41BT%2F'+row.id));
  }
});
test('C key cards preserve crucial types, raids and traits',()=>{
  const get=n=>rows.find(c=>c.id==='RNK-1-'+n);
  assert.equal(get('059').trigger,'raid');
  assert.equal(get('061').type,'character');
  assert.equal(get('062').type,'field');
  for(const n of ['063','064','065','066','067'])assert.equal(get(n).type,'event');
  assert.equal(get('068').color,'red');
  assert.equal(get('077').trigger,'raid');
  assert.equal(get('076').gen,2);
  assert.equal(get('078').gen,2);
  assert.equal(get('080').bp,500);
  assert.deepEqual(get('057').traits,['十本刀']);
  assert.deepEqual(get('060').traits,['十本刀']);
  assert.equal(get('084').trigger,'draw');
  for(const row of rows)assert.ok(RNK_SOURCE_CATALOG.some(c=>c.id===row.id));
});
