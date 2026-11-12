import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {
 chooseHybridMainAction, chooseHybridStartHardAction, hybridSource, hybridStartHardSource,
 lastHybridRoute, HYBRID_MAIN_POLICY, HYBRID_START_HARD_POLICY
} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {acceptAiV3Result, buildAiV3Request, handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {advanceFrom, loadStartHardLock, startHardJobs} from '../scripts/ai-v3-start-hard-ab.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('8970-9009 is locked before any start-hard game', () => {
 const lock = loadStartHardLock();
 assert.equal(lock.namedBeforeResults, true);
 assert.equal(lock.programBase, '3a406676ee2cb461cc79ab3936bb132ed14068f4');
 assert.equal(lock.gamesPerArm, 160);
 assert.equal(lock.policies.A, 'hybrid-main-v1');
 assert.equal(lock.policies.B, 'hybrid-start-hard-v1');
 assert.equal(lock.policies.opponent, 'hard-search-2');
 assert.equal(lock.routes.A.start, 'v3');
 assert.equal(lock.routes.B.start, 'hard');
 assert.equal(lock.routes.B.move, 'v3');
 assert.equal(lock.routes.B.pending, 'v3');
 assert.deepEqual(lock.notReused, [8890, 8929, 9010, 9099]);
 assert.equal(lock.reservedFrom, 9100);
 assert.equal(lock.seeds[0], 8970);
 assert.equal(lock.seeds.at(-1), 9009);
 assert.equal(lock.decks[0].games, 56);
 assert.equal(lock.decks[1].games, 52);
 assert.equal(lock.decks[2].games, 52);
 assert.equal(startHardJobs(lock).length, 160);
 assert.match(lock.advance, /0\.05/);
 assert.match(lock.advance, /8890-8929/);
 assert.match(lock.priorUse, /not a prior AI strategy measurement/);
 assert.equal(lock.doesNotReplace, 'audit/ai-v3-hybrid-vs-hard-9050-summary.json');
});

test('start-hard changes only the start lane and the worker accepts the name', () => {
 assert.equal(hybridSource('start'), 'v3');
 assert.equal(hybridSource('main'), 'hard');
 assert.equal(hybridStartHardSource('start'), 'hard');
 assert.equal(hybridStartHardSource('main'), 'hard');
 assert.equal(hybridStartHardSource('move'), 'v3');
 assert.equal(hybridStartHardSource('battle'), 'v3');
 assert.equal(hybridStartHardSource('pending'), 'v3');
 const deck = battleDecks().find(item => item.id === 'white-sword');
 const packs = [deck.pack, deck.pack];
 const state = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], 8970, 0)).state;
 const actor = state.active;
 const legal = legalUniversalActions(packs, state);
 const clock = {actor, nodes: 48, ms: 40, seed: 1};
 const main = chooseHybridMainAction(packs, state, clock);
 const mainRoute = lastHybridRoute();
 assert.equal(mainRoute.policy, HYBRID_MAIN_POLICY);
 assert.equal(mainRoute.source, 'v3');
 assert.equal(mainRoute.lane, 'start');
 assert.ok(legal.some(action => same(action, main)));
 const next = chooseHybridStartHardAction(packs, state, clock);
 const nextRoute = lastHybridRoute();
 assert.equal(nextRoute.policy, HYBRID_START_HARD_POLICY);
 assert.equal(nextRoute.source, 'hard');
 assert.equal(nextRoute.lane, 'start');
 assert.equal(nextRoute.nodes, 48);
 assert.equal(nextRoute.ms, 40);
 assert.ok(legal.some(action => same(action, next)));
 const request = buildAiV3Request(packs, state, actor, {requestId: 1, stateVersion: 1, seed: 1, nodes: 48, ms: 40, policy: HYBRID_START_HARD_POLICY});
 assert.equal(request.policy, HYBRID_START_HARD_POLICY);
 const handled = handleAiV3Request(request);
 assert.equal(handled.policy, HYBRID_START_HARD_POLICY);
 assert.equal(handled.search.route.source, 'hard');
 assert.equal(handled.search.route.lane, 'start');
 assert.equal(same(handled.action, next), true);
 assert.equal(acceptAiV3Result({requestId: 1, stateVersion: 1, actor, legal}, handled).ok, true);
 const lobby = readFileSync('dist/universal-v2-preview.html', 'utf8');
 assert.match(lobby, /id="use-hybrid-start-hard"/);
 assert.doesNotMatch(lobby, /id="hybrid-start-hard-v1"[^>]*checked/);
});

test('the start-hard gate needs the win gap, the interval, white sword, and safety', () => {
 const arm = (winRate, extra = {}) => ({
  overall: {winRate}, white: {winRate: 0.5},
  illegal: 0, unfinished: 0, phaseErrors: 0, overNodes: 0, maxNodes: 48, abandonedKills: 0,
  ...extra
 });
 const paired = {low: 0.01, high: 0.2};
 const pass = advanceFrom({A: arm(0.5), B: arm(0.55), paired});
 assert.equal(pass.advance, true);
 assert.equal(advanceFrom({A: arm(0.5), B: arm(0.54), paired}).advance, false);
 assert.equal(advanceFrom({A: arm(0.5), B: arm(0.55), paired: {low: 0, high: 0.2}}).advance, false);
 assert.equal(advanceFrom({
  A: arm(0.5, {white: {winRate: 0.5}}),
  B: arm(0.55, {white: {winRate: 0.44}}),
  paired
 }).advance, false);
 assert.equal(advanceFrom({A: arm(0.5), B: arm(0.55, {abandonedKills: 1}), paired}).safety, false);
 assert.equal(advanceFrom({A: arm(0.5), B: arm(0.55, {phaseErrors: 1}), paired}).advance, false);
});
