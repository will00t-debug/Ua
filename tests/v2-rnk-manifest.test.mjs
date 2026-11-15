import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RNK_TITLE, RNK_PRODUCT, RNK_BOOSTER_IDS, RNK_STARTER_SHARED_IDS,
  RNK_STARTER_ONLY, RNK_STARTER_IDS, RNK_DECK_IDS, RNK_AP_PRINTS,
  RNK_IDENTITY_INVENTORY, rnkPrintsFor
} from '../dist/rnk/manifest.mjs';

test('UA41 has exactly 100 booster card ids and 13 starter-only ids', () => {
  assert.equal(RNK_TITLE, 'rnk');
  assert.equal(RNK_PRODUCT.booster, 'UA41BT');
  assert.equal(RNK_PRODUCT.starter, 'UA41ST');
  assert.equal(RNK_BOOSTER_IDS.length, 100);
  assert.equal(RNK_BOOSTER_IDS[0], 'RNK-1-001');
  assert.equal(RNK_BOOSTER_IDS.at(-1), 'RNK-1-100');
  assert.equal(RNK_STARTER_SHARED_IDS.length, 9);
  assert.equal(RNK_STARTER_ONLY.length, 13);
  assert.equal(RNK_STARTER_ONLY[0].id, 'RNK-1-101');
  assert.equal(RNK_STARTER_ONLY.at(-1).id, 'RNK-1-113');
  assert.equal(RNK_STARTER_IDS.length, 22);
  assert.equal(RNK_DECK_IDS.length, 113);
  assert.equal(new Set(RNK_DECK_IDS).size, 113);
});

test('all nine UA41ST reprints map to one engine id per printed number', () => {
  assert.deepEqual(RNK_STARTER_SHARED_IDS, [
    'RNK-1-068', 'RNK-1-070', 'RNK-1-074', 'RNK-1-078',
    'RNK-1-080', 'RNK-1-081', 'RNK-1-085',
    'RNK-1-096', 'RNK-1-100'
  ]);
  for (const id of RNK_STARTER_SHARED_IDS) {
    assert.deepEqual(rnkPrintsFor(id), ['UA41BT/' + id, 'UA41ST/' + id]);
  }
  assert.deepEqual(rnkPrintsFor('RNK-1-101'), ['UA41ST/RNK-1-101']);
  assert.deepEqual(rnkPrintsFor('RNK-1-001'), ['UA41BT/RNK-1-001']);
  assert.deepEqual(rnkPrintsFor('RNK-1-114'), []);
});

test('AP prints cannot enter a 50-card deck inventory', () => {
  assert.equal(RNK_AP_PRINTS.length, 7);
  assert.equal(new Set(RNK_AP_PRINTS).size, 7);
  assert.equal(RNK_AP_PRINTS.at(-1), 'UA41ST/RNK-1-AP01');
  for (const number of RNK_AP_PRINTS) {
    assert.equal(RNK_DECK_IDS.includes(number.split('/')[1]), false);
    assert.deepEqual(rnkPrintsFor(number.split('/')[1]), []);
  }
});

test('identity placeholders cannot be mistaken for verified playable cards', () => {
  assert.equal(RNK_IDENTITY_INVENTORY.length, 113);
  for (const card of RNK_IDENTITY_INVENTORY) {
    assert.equal(card.title, 'rnk');
    assert.equal(card.cardDataVerified, false);
    assert.equal(card.effectImplemented, false);
    assert.equal(card.battleReady, false);
    assert.equal(card.effectJa, null);
    assert.equal(card.effectZhTw, null);
    assert.equal(card.image, null);
    assert.deepEqual(card.prints, rnkPrintsFor(card.id));
  }
  assert.equal(RNK_IDENTITY_INVENTORY.find(card => card.id === 'RNK-1-113').nameJa, '斎藤 一');
});
