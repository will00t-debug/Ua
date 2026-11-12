import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {legalUniversalActions, dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action, lastAiV3Trace, MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {moveDevelopment} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {packOf} from '../dist/universal-v2/ai-v3/observation.mjs';
import {loadAudits, listFlips, deckById, replayPrefix} from '../scripts/ai-v3-reserve-ap-fork.mjs';
import {observeWindow, frontWitness} from '../scripts/ai-v3-reserve-ap-next-main.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const flip = listFlips(...Object.values(loadAudits())).find(item => item.key === 'steins-gate-raid|8442|0|0');
const deck = deckById().get(flip.title);

function replayed(game) {
  const base = replayPrefix(deck, game, flip.diff);
  assert.equal(base.ok, true);
  const actions = game.actions.slice(flip.diff);
  let index = 0;
  const window = observeWindow(base.packs, structuredClone(base.state), flip.seat, flip.diff, base.state.turn, state => {
    const step = actions[index];
    if (!step) return {done: true};
    const actor = state.pending?.player ?? state.active;
    const legal = legalUniversalActions(base.packs, state);
    const action = legal.find(item => same(item, step.action));
    if (!action || actor !== step.actor) return {error: 'replay'};
    index += 1;
    return {action, actor};
  }, null);
  return {base, window};
}

function nextMove(game) {
  const base = replayPrefix(deck, game, flip.diff);
  let state = structuredClone(base.state);
  for (const step of game.actions.slice(flip.diff)) {
    if (!state.pending && state.active === flip.seat && state.phase === 'move' && state.turn > base.state.turn) {
      return {packs: base.packs, state};
    }
    const actor = state.pending?.player ?? state.active;
    const legal = legalUniversalActions(base.packs, state);
    const action = legal.find(item => same(item, step.action));
    assert.ok(action, 'recorded action stays legal');
    state = dispatchUniversalAction(base.packs, state, action, {actor});
  }
  assert.fail('move phase missing');
}

test('the recorded energy-4 line attacks with the moved body and does not play the 4-cost', () => {
  const pass = replayed(flip.candidate);
  const draw = replayed(flip.baseline);
  assert.equal(pass.window.ok, true);
  assert.equal(pass.window.attackClosed, true);
  assert.deepEqual(pass.window.nextStart.energyByColor, {blue: 4});
  assert.equal(pass.window.nextStart.apReady, 3);
  const faris = pass.window.entries.find(entry => entry.id === 'STG-1-023');
  assert.equal(faris.moved, true);
  assert.equal(faris.ready, true);
  assert.equal(faris.attacked, true);
  assert.equal(pass.window.entries.some(entry => entry.id === 'STG-1-017'), false);
  assert.deepEqual(draw.window.nextStart.energyByColor, {blue: 2});
  assert.equal(draw.window.entries.some(entry => entry.id === 'STG-1-023' && entry.attacked), false);
});

test('passing the move makes the 4-cost legal, and she enters rested', () => {
  const {packs, state} = nextMove(flip.candidate);
  const catalog = packOf(packs, flip.seat).cards;
  const legal = legalUniversalActions(packs, state);
  const moved = legal.find(action => action.type === 'move' && catalog[(state.players[flip.seat].energy || []).find(card => card?.uid === action.uid)?.cardId]?.id === 'STG-1-023');
  const view = moveDevelopment(packs, state, flip.seat, moved);
  assert.equal(view.benefit, 'block');
  assert.equal(view.strip, false);
  assert.equal(view.before, 4);
  assert.equal(view.after, 2);
  let held = dispatchUniversalAction(packs, structuredClone(state), legal.find(action => action.type === 'next'), {actor: flip.seat});
  while (held.status === 'playing' && !(held.phase === 'main' && !held.pending && held.active === flip.seat)) {
    const actor = held.pending?.player ?? held.active;
    assert.equal(actor, flip.seat);
    const choices = legalUniversalActions(packs, held);
    held = dispatchUniversalAction(packs, held, choices.find(action => action.type === 'next') || choices[0], {actor});
  }
  const mayuri = (held.players[flip.seat].hand || []).find(card => catalog[card.cardId]?.id === 'STG-1-017');
  const found = frontWitness(packs, held, flip.seat, mayuri.uid);
  assert.equal(found.ok, true);
  assert.equal(found.path[0].type, 'play');
  assert.equal(found.path[0].line, 'front');
  let cursor = structuredClone(held);
  for (const step of found.path) {
    const actor = cursor.pending?.player ?? cursor.active;
    const choices = legalUniversalActions(packs, cursor);
    const action = choices.find(item => item.type === step.type && item.uid === step.uid && (item.line || null) === (step.line || null));
    cursor = dispatchUniversalAction(packs, cursor, action, {actor});
  }
  const landed = (cursor.players[flip.seat].front || []).find(card => card?.uid === mayuri.uid);
  assert.ok(landed);
  assert.equal(landed.ready, false);
  const chosen = chooseAiV3Action(packs, structuredClone(state), {
    actor: flip.seat, ...MATCH_LIMITS, ms: 1000000000, nodes: 48, seed: 1, plan: 'tree'
  });
  const trace = lastAiV3Trace();
  assert.equal(chosen.type, 'move');
  assert.equal(trace.reason, 'budget-fallback');
  const rows = trace.compared || trace.candidates || [];
  const phases = new Set(rows.map(row => row.phase));
  assert.equal(phases.has('main'), true);
  assert.equal(phases.has('move'), true);
});

test('the saved windows match the replay and stay inside the attack phase', () => {
  const path = 'audit/ai-v3-reserve-ap-next-main.json';
  assert.equal(existsSync(path), true);
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(saved.rows.length, 12);
  let searched = 0;
  for (const row of saved.rows) {
    for (const branch of Object.values(row.branches)) {
      assert.equal(branch.ok, true, row.key);
      assert.equal(branch.search.mismatch, 0, row.key);
      assert.equal(branch.attackClosed || branch.ended, true, row.key);
      if (branch.source === 'search') searched += 1;
    }
  }
  assert.equal(searched, 12);
  const row = saved.rows.find(item => item.key === flip.key);
  assert.deepEqual(row.branches['pass-on'].nextStart.energyByColor, {blue: 4});
  assert.equal(row.branches['pass-on'].entries.some(entry => entry.id === 'STG-1-023' && entry.attacked), true);
  assert.deepEqual(row.branches['draw-off'].nextStart.energyByColor, {blue: 2});
});
