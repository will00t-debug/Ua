import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_001_007} from '../dist/rnk/cards-001-007.mjs';
import {RNK_BOOSTER_IDS} from '../dist/rnk/manifest.mjs';

test('first seven RNK cards use unique numbered official TC identities', () => {
  assert.equal(RNK_CARDS_001_007.length, 7);
  assert.deepEqual(RNK_CARDS_001_007.map(card => card.id), RNK_BOOSTER_IDS.slice(0, 7));
  for (const card of RNK_CARDS_001_007) {
    assert.equal(card.color, 'blue');
    assert.equal(card.title, 'rnk');
    assert.equal(card.set, 'UA41BT');
    assert.equal(card.type, 'character');
    assert.equal(card.confirmedTc, true);
    assert.equal(card.battleReady, false);
    assert.equal(card.cardDataVerified, false);
    assert.equal(card.auto, false);
    assert.equal(card.effectJa, null);
    assert.equal(card.deckLegal, true);
    assert.ok(card.nameZhTw && card.effectZhTw);
    assert.ok(card.sourceTc.includes('UA41BT%2F' + card.id));
    assert.ok(card.image.endsWith('UA41BT_' + card.id + '.png'));
  }
});

test('RNK 001-007 retains official blue energy, stats and trigger types', () => {
  assert.deepEqual(RNK_CARDS_001_007.map(card => [
    card.energy,card.ap,card.bp,card.gen,card.trigger
  ]), [
    [2,1,2000,1,'draw'],
    [0,1,2000,1,'active'],
    [0,1,1000,1,null],
    [1,1,1500,2,null],
    [3,2,1000,2,'draw'],
    [0,1,1500,1,'draw'],
    [4,1,4000,1,'active']
  ]);
  assert.match(RNK_CARDS_001_007[0].effectZhTw, /逆刃刀・真打/);
  assert.match(RNK_CARDS_001_007[1].effectZhTw, /緋村劍心/);
  assert.match(RNK_CARDS_001_007[2].effectZhTw, /主要階段結束時/);
  assert.match(RNK_CARDS_001_007[4].effectZhTw, /御庭番眾/);
  assert.match(RNK_CARDS_001_007[6].effectZhTw, /九頭龍閃/);
});
