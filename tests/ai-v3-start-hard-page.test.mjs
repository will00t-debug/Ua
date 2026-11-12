import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseHybridStartHardAction, HYBRID_MAIN_POLICY, HYBRID_START_HARD_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {acceptAiV3Result, buildAiV3Request, handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions} from '../dist/universal-v2/engine.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function opening() {
 const deck = battleDecks().find(item => item.id === 'white-sword');
 const packs = [deck.pack, deck.pack];
 const state = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], 1, 0)).state;
 return {packs, state};
}

test('the live worker whitelist keeps the verified start-hard routes', () => {
 const {packs, state} = opening();
 const actor = state.active;
 const legal = legalUniversalActions(packs, state);
 const clock = {actor, nodes: 48, ms: 1e9, seed: 1};
 const request = buildAiV3Request(packs, state, actor, {requestId: 7, stateVersion: 4, seed: 1, nodes: 48, ms: 1e9, policy: HYBRID_START_HARD_POLICY});
 const direct = chooseHybridStartHardAction(request.pack, request.state, clock);
 const handled = handleAiV3Request(request);
 assert.equal(handled.error, null);
 assert.equal(handled.policy, HYBRID_START_HARD_POLICY);
 assert.equal(handled.search.route.lane, 'start');
 assert.equal(handled.search.route.source, 'hard');
 assert.equal(same(handled.action, direct), true);
 assert.equal(acceptAiV3Result({requestId: 7, stateVersion: 4, actor, legal}, handled).ok, true);
 const dirty = handleAiV3Request({...request, requestId: 8, factors: {settleLife: true, paidFront: true}});
 assert.equal(dirty.search.route.source, 'hard');
 assert.equal(same(dirty.action, direct), true);
 assert.equal(handleAiV3Request({...request, opponentHand: ['secret']}).error, 'hidden-field');
 assert.equal(handleAiV3Request({...request, deckOrder: ['secret']}).error, 'hidden-field');
 assert.equal(handleAiV3Request({...request, lifeOrder: ['secret']}).error, 'hidden-field');
 assert.equal(acceptAiV3Result({requestId: 99, stateVersion: 4, actor, legal}, handled).reason, 'stale-request');
 assert.equal(acceptAiV3Result({requestId: 7, stateVersion: 99, actor, legal}, handled).reason, 'stale-version');
 const forged = handleAiV3Request({...request, requestId: 9, policy: 'hybrid-start-hard-v2'});
 assert.equal(forged.policy, AI_V3_POLICY);
 assert.equal(forged.search?.route, undefined);
 const unnamed = buildAiV3Request(packs, state, actor, {requestId: 10, stateVersion: 4, seed: 1, nodes: 48, ms: 40});
 assert.equal(Object.hasOwn(unnamed, 'policy'), false);
 assert.equal(handleAiV3Request(unnamed).policy, AI_V3_POLICY);
 const oldHybrid = buildAiV3Request(packs, state, actor, {requestId: 11, stateVersion: 4, seed: 1, nodes: 48, ms: 1e9, policy: HYBRID_MAIN_POLICY});
 const oldHandled = handleAiV3Request(oldHybrid);
 assert.equal(oldHandled.policy, HYBRID_MAIN_POLICY);
 assert.equal(oldHandled.search.route.lane, 'start');
 assert.equal(oldHandled.search.route.source, 'v3');
});

test('pending stays on AI v3 while start and idle main stay on hard', () => {
 const {packs, state: opened} = opening();
 let state = opened;
 const seen = new Set();
 for (let step = 0; step < 80 && state.status === 'playing' && !seen.has('pending/v3'); step++) {
  const actor = state.pending?.player ?? state.active;
  const legal = legalUniversalActions(packs, state);
  const request = buildAiV3Request(packs, state, actor, {
   requestId: step + 1, stateVersion: step + 1, seed: 1, nodes: 48, ms: 1e9, policy: HYBRID_START_HARD_POLICY
  });
  const result = handleAiV3Request(request);
  assert.equal(result.error, null, result.error);
  const accepted = acceptAiV3Result({requestId: step + 1, stateVersion: step + 1, actor, legal}, result);
  assert.equal(accepted.ok, true, accepted.reason);
  const lane = result.search.route.lane;
  const source = result.search.route.source;
  if (lane === 'start' || lane === 'main') assert.equal(source, 'hard');
  if (lane === 'move' || lane === 'battle' || lane === 'pending') assert.equal(source, 'v3');
  assert.equal(result.search.route.policy, HYBRID_START_HARD_POLICY);
  seen.add(lane + '/' + source);
  state = dispatchUniversalAction(packs, state, accepted.action, {actor});
  assert.equal(assertUniversalMatch(packs, state), true);
 }
 assert.equal(seen.has('start/hard'), true);
 assert.equal(seen.has('pending/v3'), true);
 assert.equal([...seen].some(item => item.endsWith('/hard') && item.startsWith('pending')), false);
});

test('the settings page offers the new policy without selecting it', () => {
 const lobby = readFileSync('dist/universal-v2-preview.html', 'utf8');
 const page = readFileSync('dist/universal-v2-preview.mjs', 'utf8');
 const battle = readFileSync('dist/universal-v2-battle.html', 'utf8');
 assert.match(lobby, /id="use-ai-v3"/);
 assert.match(lobby, /id="use-hybrid-main"/);
 assert.match(lobby, /id="use-hybrid-start-hard"/);
 assert.match(lobby, /id="use-difficulty-ai"/);
 assert.doesNotMatch(lobby, /id="hybrid-start-hard-v1"[^>]*checked/);
 assert.match(page, /const HYBRID_START_KEY='ua-hybrid-start-hard-v1'/);
 assert.match(page, /if\(hybridStartOn\(\)\)return HYBRID_START_HARD_POLICY/);
 assert.match(page, /seed:policy===HYBRID_START_HARD_POLICY\?1:stateVersion/);
 assert.match(page, /driveSearchPreview\(app\.sequence,HYBRID_START_HARD_POLICY\)/);
 assert.doesNotMatch(page, /setItem\(HYBRID_START_KEY,localStorage\.getItem\(HYBRID_MAIN_KEY\)/);
 assert.match(battle, /universal-v2-preview\.mjs\?v=20261112starthard1/);
 assert.match(lobby, /universal-v2-preview\.mjs\?v=20261112starthard1/);
});
