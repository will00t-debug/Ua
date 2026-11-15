import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_029_035} from '../dist/rnk/cards-029-035.mjs';
import {RNK_CARDS_036_042} from '../dist/rnk/cards-036-042.mjs';
import {RNK_CARDS_043_049} from '../dist/rnk/cards-043-049.mjs';
import {RNK_CARDS_050_056} from '../dist/rnk/cards-050-056.mjs';
import {RNK_TC_CATALOG,RNK_BOOSTER_IDS,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
const groups=[RNK_CARDS_029_035,RNK_CARDS_036_042,RNK_CARDS_043_049,RNK_CARDS_050_056];
const cards=groups.flat();
test('B group has 28 unique card IDs 029-056 in official numeric order',()=>{
  assert.ok(groups.every(g=>g.length===7));
  assert.deepEqual(cards.map(c=>c.id),RNK_BOOSTER_IDS.slice(28,56));
  assert.equal(new Set(cards.map(c=>c.id)).size,28);
  assert.deepEqual(cards.map(c=>c.color),[
    ...Array(5).fill('blue'),...Array(23).fill('purple')
  ]);
});
test('B group preserves source, card categories, stats and false-ready gate',()=>{
  for(const c of cards){
    assert.equal(c.set,'UA41BT');
    assert.equal(c.title,'rnk');
    assert.equal(c.deckLegal,true);
    assert.equal(c.confirmedTc,true);
    assert.equal(c.cardDataVerified,false);
    assert.equal(c.effectImplemented,false);
    assert.equal(c.battleReady,false);
    assert.equal(c.effectJa,null);
    assert.ok(c.name&&c.effectZhTw);
    assert.ok(c.energy>=0&&c.energy<=8);
    assert.ok(c.ap>=1&&c.ap<=2);
    assert.ok(['character','event','field'].includes(c.type));
    assert.ok(c.sourceTc.endsWith('UA41BT%2F'+c.id));
    assert.ok(c.image.endsWith('UA41BT_'+c.id+'.png'));
    if(c.type==='event')assert.equal(c.bp,0);
  }
});
test('B group preserves key multi-step effects and printed types',()=>{
  const card=n=>cards.find(c=>c.id==='RNK-1-'+n);
  for(const n of ['029','030','031','032','033'])assert.equal(card(n).type,'event');
  assert.equal(card('035').effectZhTw,'-');
  assert.equal(card('055').effectZhTw,'-');
  assert.equal(card('044').ap,2);
  assert.equal(card('048').ap,2);
  assert.equal(card('039').trigger,'raid');
  assert.equal(card('040').trigger,'raid');
  assert.equal(card('050').bp,4000);
  assert.ok(card('050').traits.includes('十本刀'));
  assert.match(card('056').effectZhTw,/休息狀態/);
});
test('B complete and A+B inventory is 56 TC cards, zero battle-ready',()=>{
  assert.equal(RNK_TC_CATALOG.length,56);
  assert.deepEqual(RNK_TC_CATALOG.map(c=>c.id),RNK_BOOSTER_IDS.slice(0,56));
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.confirmedTc).length,56);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.battleReady).length,0);
});
