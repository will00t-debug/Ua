import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, dispatch, legalActions, controller, botAction, assertState, cardOf} from '../dist/engine.mjs';
import {chooseAiAction, evaluatePosition, AI_LEVELS} from '../dist/ai-v2.mjs';

function opening(seed = 101) {
  let s = newGame({seed, mode: 'solo'});
  s = dispatch(s, {type: 'keep'});
  s = dispatch(s, {type: 'keep'});
  return s;
}

test('the three levels are explicit, and easy preserves the old opponent', () => {
  assert.deepEqual(AI_LEVELS, ['easy', 'normal', 'hard']);
  const s = opening(33);
  assert.deepEqual(chooseAiAction(s, {difficulty: 'easy'}), botAction(s));
});

test('normal and hard choose a legal move without mutating the live state', () => {
  for (const difficulty of ['normal', 'hard']) {
    const s = opening(21);
    const snapshot = JSON.stringify(s);
    const a = chooseAiAction(s, {difficulty});
    assert.ok(legalActions(s).some(x => JSON.stringify(x) === JSON.stringify(a)));
    assert.equal(JSON.stringify(s), snapshot);
    const next = dispatch(s, a);
    assertState(next);
  }
});

test('AI scores do not depend on unknown opponent hand, life or deck identities', () => {
  const a = opening(49);
  const b = structuredClone(a);
  b.players[1].hand.reverse();
  b.players[1].life.reverse();
  b.players[1].deck.reverse();
  assert.equal(evaluatePosition(a, 0), evaluatePosition(b, 0));
  assert.deepEqual(chooseAiAction(a, {difficulty: 'hard'}),
    chooseAiAction(b, {difficulty: 'hard'}));
});

test('hard AI completes varied legal turns without losing or duplicating cards', () => {
  for (const seed of [10, 85, 206]) {
    let s = opening(seed);
    for (let i = 0; i < 90 && s.status === 'playing'; i++) {
      const actor = controller(s);
      const a = chooseAiAction(s, {difficulty: actor ? 'hard' : 'normal'});
      assert.ok(a, 'AI always has an action before a finished match');
      const oldTurn = s.turn, oldPhase = s.phase;
      s = dispatch(s, a, actor);
      assertState(s);
      if (a.type === 'next' && oldPhase === 'attack') assert.ok(s.turn >= oldTurn);
    }
  }
});

test('generic planning uses game state, not card number conditions', () => {
  let s = opening(13);
  s = dispatch(s, {type: 'next'});
  s = dispatch(s, {type: 'next'});
  assert.equal(s.phase, 'main');
  for (const difficulty of ['normal', 'hard']) {
    const a = chooseAiAction(s, {difficulty});
    assert.ok(legalActions(s).some(x => JSON.stringify(x) === JSON.stringify(a)));
    if (a.uid) assert.ok(cardOf(s.players[controller(s)].hand.find(c => c.uid === a.uid)
      || [...s.players[controller(s)].front, ...s.players[controller(s)].energy].find(c => c?.uid === a.uid)));
  }
});

test('hard planning in Main is invariant to hidden deck ordering', () => {
  let s = opening(24);
  s = dispatch(s, {type: 'next'});
  s = dispatch(s, {type: 'next'});
  assert.equal(s.phase, 'main');
  const reordered = structuredClone(s);
  for (const pl of reordered.players) {
    pl.deck.reverse();
    pl.life.reverse();
  }
  assert.equal(evaluatePosition(s, controller(s)), evaluatePosition(reordered, controller(s)));
  assert.deepEqual(chooseAiAction(s, {difficulty: 'hard'}),
    chooseAiAction(reordered, {difficulty: 'hard'}));
});
