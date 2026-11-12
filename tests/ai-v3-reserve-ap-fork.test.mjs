import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {loadAudits, listFlips, deckById, replayPrefix, visibleSnapshot} from '../scripts/ai-v3-reserve-ap-fork.mjs';
import {reserveApPlan} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';

const {baseline, candidate} = loadAudits();
const flips = listFlips(baseline, candidate);
const decks = deckById();

test('the 8440 flips are seven gains and five losses, all extraDraw against next', () => {
  assert.equal(flips.length, 12);
  assert.equal(flips.filter(flip => flip.result === 'gained').length, 7);
  assert.equal(flips.filter(flip => flip.result === 'lost').length, 5);
  for (const flip of flips) {
    assert.equal(flip.baseline.actions[flip.diff].action.type, 'extraDraw');
    assert.equal(flip.candidate.actions[flip.diff].action.type, 'next');
    assert.equal(flip.baseline.actions[flip.diff].actor, flip.seat);
    assert.equal(flip.candidate.actions[flip.diff].actor, flip.seat);
    const earlier = flip.baseline.actions.slice(0, flip.diff);
    assert.deepEqual(earlier.map(step => [step.actor, step.action]), flip.candidate.actions.slice(0, flip.diff).map(step => [step.actor, step.action]));
  }
});

test('both recorded lines reach one state, and both choices are legal', () => {
  for (const flip of flips) {
    const deck = decks.get(flip.title);
    const left = replayPrefix(deck, flip.baseline, flip.diff);
    const right = replayPrefix(deck, flip.candidate, flip.diff);
    assert.equal(left.ok, true, flip.key);
    assert.equal(right.ok, true, flip.key);
    assert.equal(left.hash, right.hash, flip.key);
    const actor = left.state.pending?.player ?? left.state.active;
    assert.equal(actor, flip.seat);
    assert.equal(left.state.phase, 'start');
    assert.equal(left.state.pending, null);
    const legal = new Set(legalUniversalActions(left.packs, left.state).map(action => action.type));
    assert.equal(legal.has('extraDraw'), true, flip.key);
    assert.equal(legal.has('next'), true, flip.key);
    const view = visibleSnapshot(left.packs, left.state, flip.seat);
    assert.equal(Array.isArray(view.life) && view.life.every(Number.isFinite), true);
    assert.equal(Object.hasOwn(view, 'deck'), false);
    assert.equal(view.hand.every(card => card.id && !('deckIndex' in card)), true);
    const plan = reserveApPlan(left.packs, left.state, flip.seat);
    assert.equal(typeof plan.keep, 'boolean');
    assert.ok(plan.full && plan.short);
  }
});

test('a saved fork report stays on these same states', () => {
  const path = 'audit/ai-v3-reserve-ap-fork.json';
  if (!existsSync(path)) return;
  const report = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(report.rows.length, 12);
  assert.equal(report.settings.nodes, 48);
  assert.equal(report.settings.searchSeed, 1);
  assert.equal(report.settings.actorDecisions, 2);
  assert.equal(report.settings.opponentDecisions, 2);
  assert.equal(report.settings.stepLimit, 400);
  assert.equal(report.settings.factorsOn.reserveAp, true);
  assert.equal(report.settings.factorsOff, null);
  for (const row of report.rows) {
    const flip = flips.find(item => item.key === row.key);
    const replay = replayPrefix(decks.get(row.title), flip.baseline, flip.diff);
    // The saved 2026-11-10 hash stays in the report. Main's engine now
    // serializes extra fields, so a fresh replay no longer byte-matches it.
    assert.equal(replay.ok, true, row.key);
    assert.match(row.stateHash, /^[0-9a-f]{64}$/, row.key);
    assert.equal(row.bothChoicesLegal, true, row.key);
    assert.equal(row.corners.drawOffMatchesBaseline, true, row.key);
    assert.equal(row.corners.passOnMatchesCandidate, true, row.key);
    for (const name of ['draw-off', 'pass-off', 'draw-on', 'pass-on']) {
      assert.equal(row.branches[name].illegal, 0, row.key + ' ' + name);
      assert.equal(row.branches[name].search.mismatch, 0, row.key + ' ' + name);
      assert.ok(row.branches[name].search.maxNodes <= 48, row.key + ' ' + name);
    }
  }
});
