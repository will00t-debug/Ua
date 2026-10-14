import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, dispatch, assertState, energy, locate} from '../dist/engine.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';

function game() {
  let s = newGame({seed: 61014, first: 1, mode: 'solo'});
  s = dispatch(s, {type: 'keep'});
  s = dispatch(s, {type: 'keep'});
  return s;
}

// Use existing cards with unique UIDs; move, rather than duplicate, them.
function put(s, id, line, slot, ready = true) {
  const pl = s.players[1];
  const c = pl.deck.pop();
  c.cardId = id;
  c.ready = ready;
  pl[line][slot] = c;
  return c;
}

function aizenChoice(s, aizen) {
  const pl = s.players[1];
  const choices = [...pl.front, ...pl.energy].filter(c => c && c.uid !== aizen.uid)
    .map(c => ({id: c.uid, cardId: c.cardId, label: c.cardId}));
  s.pending = {
    player: 1, title: 'Aizen on-play relocation', choices,
    effect: {kind: 'moveAcrossPick', p: 1, uid: aizen.uid,
      rule: {op: 'moveAcross', optional: true, other: true}},
    min: 0, max: 1, allowedCounts: null
  };
}

test('hard AI declines Aizen optional move instead of moving a valuable frontliner backward', () => {
  const s = game();
  const aizen = put(s, 'BLC-4-060', 'energy', 0);
  put(s, '034', 'energy', 1);
  const first = put(s, '104', 'front', 0);
  const second = put(s, '103', 'front', 1);
  aizenChoice(s, aizen);
  const snapshot = JSON.stringify(s);
  const selected = chooseAiAction(s, {difficulty: 'hard'});
  assert.deepEqual(selected, {type: 'choose', ids: []});
  assert.equal(JSON.stringify(s), snapshot, 'AI must not mutate the live game');
  const after = dispatch(s, selected);
  assert.equal(locate(after, first.uid)?.line, 'front');
  assert.equal(locate(after, second.uid)?.line, 'front');
  assertState(after);
});

test('hard AI moves surplus-energy attacker into an empty front slot and never overwrites allies', () => {
  const s = game();
  const aizen = put(s, 'BLC-4-060', 'energy', 0);
  put(s, '102', 'energy', 1);
  put(s, '102', 'energy', 2);
  const attacker = put(s, '104', 'energy', 3);
  const defender = put(s, '034', 'front', 0);
  put(s, '039', 'front', 1);
  aizenChoice(s, aizen);

  const choice = chooseAiAction(s, {difficulty: 'hard'});
  assert.deepEqual(choice, {type: 'choose', ids: [attacker.uid]});
  const destination = dispatch(s, choice);
  assert.equal(destination.pending.effect.kind, 'moveAcrossSlot');
  const slot = chooseAiAction(destination, {difficulty: 'hard'});
  assert.ok(['2', '3'].includes(slot.ids[0]), 'choose a free front slot');
  const after = dispatch(destination, slot);
  assert.equal(locate(after, attacker.uid)?.line, 'front');
  assert.equal(locate(after, defender.uid)?.line, 'front');
  assert.equal(after.players[1].removed.length, 0, 'no allied card should be banished');
  assert.ok(energy(after, 1) >= 5, 'preserve a playable energy curve');
  assertState(after);
});

test('hard AI declines Aizen optional move when all destinations would banish a unit', () => {
  const s = game();
  const aizen = put(s, 'BLC-4-060', 'energy', 0);
  put(s, '102', 'energy', 1);
  put(s, '102', 'energy', 2);
  put(s, '104', 'energy', 3);
  put(s, '034', 'front', 0);
  put(s, '039', 'front', 1);
  put(s, '103', 'front', 2);
  put(s, '101', 'front', 3);
  aizenChoice(s, aizen);
  const selected = chooseAiAction(s, {difficulty: 'hard'});
  assert.deepEqual(selected, {type: 'choose', ids: []});
  const after = dispatch(s, selected);
  assert.equal(after.players[1].removed.length, 0);
  assertState(after);
});

test('Aizen forced front-placement picks an empty slot instead of banishing slot 1', () => {
  const s = game();
  const aizen = put(s, 'BLC-4-060', 'energy', 0);
  const defender = put(s, '104', 'front', 0);
  put(s, '103', 'front', 1);
  s.pending = {
    player: 1, title: 'Aizen enters front', min: 1, max: 1,
    choices: Array.from({length: 4}, (_, i) => ({id: String(i), label: String(i)})),
    effect: {kind: 'aizenFrontSlot', p: 1, uid: aizen.uid}
  };
  const picked = chooseAiAction(s, {difficulty: 'hard'});
  assert.ok(['2', '3'].includes(picked.ids[0]));
  const after = dispatch(s, picked);
  assert.equal(locate(after, defender.uid)?.line, 'front');
  assert.equal(after.players[1].removed.length, 0);
  assertState(after);
});

test('Aizen rests weaker front units rather than high-BP raid attackers', () => {
  const s = game();
  const aizen = put(s, 'BLC-4-060', 'energy', 0);
  const attacker = put(s, '104', 'front', 0);
  const weak1 = put(s, '034', 'front', 1);
  const weak2 = put(s, '039', 'front', 2);
  s.pending = {
    player: 1, title: 'Rest two', min: 2, max: 2,
    choices: [attacker, weak1, weak2].map(c => ({id: c.uid, label: c.cardId})),
    effect: {kind: 'aizenRestTwo', p: 1, uid: aizen.uid}
  };
  const choice = chooseAiAction(s, {difficulty: 'hard'});
  assert.deepEqual(new Set(choice.ids), new Set([weak1.uid, weak2.uid]));
  const after = dispatch(s, choice);
  assert.equal(locate(after, attacker.uid)?.card.ready, true);
  assertState(after);
});
