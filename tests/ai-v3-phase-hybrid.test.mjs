import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {legalUniversalActions, dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {newComparedMatch, applySharedOpening} from '../dist/universal-v2/ai-v3/opening.mjs';
import {laneOf, sourceFor, chooseDecision, coversRoot} from '../scripts/ai-v3-phase-hybrid.mjs';

const baseline = JSON.parse(readFileSync('audit/ai-v3-hold-info-8401-baseline.json', 'utf8'));

test('a phase lane is the idle phase, and every pending choice is its own lane', () => {
 assert.equal(laneOf({phase: 'start', pending: null}), 'start');
 assert.equal(laneOf({phase: 'move', pending: null}), 'move');
 assert.equal(laneOf({phase: 'main', pending: null}), 'main');
 assert.equal(laneOf({phase: 'attack', pending: null}), 'battle');
 assert.equal(laneOf({phase: 'attack', pending: {kind: 'block'}}), 'pending');
 assert.equal(laneOf({phase: 'main', pending: {kind: 'effect-discard'}}), 'pending');
 assert.equal(laneOf({phase: 'attack', pending: {kind: 'attack-life-target'}}), 'pending');
 assert.equal(sourceFor('v3', 'start'), 'v3');
 assert.equal(sourceFor('hard', 'main'), 'hard');
 assert.equal(sourceFor('start', 'start'), 'hard');
 assert.equal(sourceFor('start', 'main'), 'v3');
 assert.equal(sourceFor('pending', 'pending'), 'hard');
 assert.equal(sourceFor('battle', 'attack'), 'v3');
 assert.equal(sourceFor('hybrid-main-v1', 'main'), 'hard');
 assert.equal(sourceFor('hybrid-main-v1', 'pending'), 'v3');
 assert.equal(sourceFor('hybrid-main-v1', 'start'), 'v3');
 assert.equal(sourceFor('hybrid-main-v1', 'battle'), 'v3');
 assert.equal(coversRoot(
  {type: 'play', uid: '0-20', line: 'energy', mode: null},
  {type: 'play', uid: '0-20', line: 'energy', slot: 1}), true);
 assert.equal(coversRoot(
  {type: 'play', uid: '0-16', line: 'energy', mode: null},
  {type: 'play', uid: '0-20', line: 'energy', slot: 1}), false);
 assert.equal(MATCH_LIMITS.nodes, 48);
 assert.equal(MATCH_LIMITS.ms, 40);
 assert.equal(HARD_AI_POLICY, 'hard-search-2');
});

test('the start swap follows hard and the main swap follows v3 on the same state', () => {
 const deck = battleDecks().find(item => item.id === 'white-sword');
 const game = baseline.titles['white-sword'].byMode.tree.games.find(item => item.seed === 8401 && item.first === 0 && item.challengerSeat === 0);
 const packs = [deck.pack, deck.pack];
 let state = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], game.seed, game.first)).state;
 let found = null;
 for (const played of game.actions) {
  if (state.status !== 'playing') break;
  const actor = state.pending?.player ?? state.active;
  const legal = legalUniversalActions(packs, state);
  if (actor === 0 && laneOf(state) === 'start' && legal.length > 1) { found = state; break; }
  const action = legal.find(item => JSON.stringify(item) === JSON.stringify(played.action));
  assert.ok(action, 'replay ' + played.step);
  state = dispatchUniversalAction(packs, state, action, {actor});
 }
 assert.ok(found);
 const v3 = chooseDecision(packs, found, 'v3');
 const hard = chooseDecision(packs, found, 'hard');
 const start = chooseDecision(packs, found, 'start');
 const main = chooseDecision(packs, found, 'main');
 assert.equal(v3.legal, true);
 assert.equal(hard.legal, true);
 assert.equal(start.source, 'hard');
 assert.equal(main.source, 'v3');
 assert.equal(start.lane, 'start');
 assert.deepEqual(start.action, hard.action);
 assert.deepEqual(main.action, v3.action);
});
