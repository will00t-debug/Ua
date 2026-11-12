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
import {acceptIndependent, independentJobs, loadIndependentLock, routesOk} from '../scripts/ai-v3-start-hard-8890.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function lanesFor(table, count = 4) {
 const lanes = {};
 for (const [lane, source] of Object.entries(table)) {
  lanes[lane] = {v3: 0, hard: 0, other: 0, [source]: count};
 }
 lanes.other = {v3: 0, hard: 0, other: 0};
 return lanes;
}

test('8890-8929 is locked before any independent game', () => {
 const lock = loadIndependentLock();
 assert.equal(lock.namedBeforeResults, true);
 assert.equal(lock.kind, 'start-hard-8890-independent');
 assert.equal(lock.programBase, '2b93663f64be64d1923bbb73a3c6ead7560cb61f');
 assert.equal(lock.gamesPerArm, 160);
 assert.equal(lock.blocks, 40);
 assert.equal(lock.policies.A, 'hybrid-main-v1');
 assert.equal(lock.policies.B, 'hybrid-start-hard-v1');
 assert.equal(lock.policies.opponent, 'hard-search-2');
 assert.equal(lock.routes.A.start, 'v3');
 assert.equal(lock.routes.B.start, 'hard');
 assert.equal(lock.routes.A.main, 'hard');
 assert.equal(lock.routes.B.move, 'v3');
 assert.equal(lock.routes.B.battle, 'v3');
 assert.equal(lock.routes.B.pending, 'v3');
 assert.deepEqual(lock.notReused, [8970, 9009, 9010, 9099]);
 assert.equal(lock.reservedFrom, 9100);
 assert.equal(lock.seeds[0], 8890);
 assert.equal(lock.seeds.at(-1), 8929);
 assert.equal(lock.seeds.length, 40);
 assert.equal(lock.decks[0].games, 56);
 assert.equal(lock.decks[1].games, 52);
 assert.equal(lock.decks[2].games, 52);
 assert.equal(independentJobs(lock).length, 160);
 assert.match(lock.accept, /0\.05/);
 assert.match(lock.accept, /not rerun 8890-8929/);
 assert.match(lock.priorUse, /not played/);
 assert.equal(lock.explorationFile, 'audit/ai-v3-start-hard-8970.json');
 assert.ok(lock.doesNotReplace.includes('audit/ai-v3-start-hard-8970.json'));
 const used = new Set(lock.seeds);
 for (let seed = 8970; seed <= 9099; seed++) assert.equal(used.has(seed), false);
});

test('the frozen start route is unchanged and the worker accepts the named policy', () => {
 const lock = loadIndependentLock();
 for (const [lane, source] of Object.entries(lock.routes.A)) assert.equal(hybridSource(lane), source);
 for (const [lane, source] of Object.entries(lock.routes.B)) assert.equal(hybridStartHardSource(lane), source);
 const deck = battleDecks().find(item => item.id === 'white-sword');
 const packs = [deck.pack, deck.pack];
 const state = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], 8890, 0)).state;
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
 assert.equal(request.seed, 1);
 assert.equal(request.nodes, 48);
 assert.equal(request.ms, 40);
 const handled = handleAiV3Request(request);
 assert.equal(handled.policy, HYBRID_START_HARD_POLICY);
 assert.equal(handled.search.route.source, 'hard');
 assert.equal(handled.search.route.lane, 'start');
 assert.equal(acceptAiV3Result({requestId: 1, stateVersion: 1, actor, legal}, handled).ok, true);
 const plain = buildAiV3Request(packs, state, actor, {requestId: 2, stateVersion: 2, seed: 1, nodes: 48, ms: 40});
 assert.equal(Object.hasOwn(plain, 'policy'), false);
 assert.equal(handleAiV3Request(plain).policy, AI_V3_POLICY);
 const unknown = buildAiV3Request(packs, state, actor, {requestId: 3, stateVersion: 3, seed: 1, nodes: 48, ms: 40, policy: 'settle-life'});
 assert.equal(Object.hasOwn(unknown, 'policy'), false);
 assert.equal(handleAiV3Request({...unknown, policy: 'paid-front'}).policy, AI_V3_POLICY);
 const lobby = readFileSync('dist/universal-v2-preview.html', 'utf8');
 assert.match(lobby, /id="hybrid-start-hard-v1"/);
 assert.doesNotMatch(lobby, /id="hybrid-start-hard-v1"[^>]*checked/);
 assert.match(readFileSync('dist/universal-v2-preview.mjs', 'utf8'), /ua-hybrid-start-hard-v1/);
});

test('the independent gate needs every pre-registered item', () => {
 const lock = loadIndependentLock();
 const arm = (winRate, extra = {}) => ({
  overall: {winRate}, white: {winRate: 0.5},
  illegal: 0, unfinished: 0, phaseErrors: 0, overNodes: 0, maxNodes: 48, abandonedKills: 0,
  startMismatches: 0, otherMismatches: 0,
  lanes: lanesFor(lock.routes.A),
  ...extra
 });
 const paired = {mean: 0.06, low: 0.01, high: 0.2};
 const pass = acceptIndependent({
  A: arm(0.4),
  B: arm(0.46, {lanes: lanesFor(lock.routes.B)}),
  paired
 }, lock.routes);
 assert.equal(pass.advance, true);
 assert.equal(acceptIndependent({
  A: arm(0.4), B: arm(0.44, {lanes: lanesFor(lock.routes.B)}), paired: {mean: 0.04, low: 0.01, high: 0.1}
 }, lock.routes).advance, false);
 assert.equal(acceptIndependent({
  A: arm(0.4), B: arm(0.46, {lanes: lanesFor(lock.routes.B)}), paired: {mean: 0.06, low: 0, high: 0.2}
 }, lock.routes).advance, false);
 assert.equal(acceptIndependent({
  A: arm(0.4), B: arm(0.46, {lanes: lanesFor(lock.routes.B)}), paired: {mean: 0, low: 0.01, high: 0.2}
 }, lock.routes).pairedPositive, false);
 assert.equal(acceptIndependent({
  A: arm(0.4, {white: {winRate: 0.5}}),
  B: arm(0.46, {white: {winRate: 0.44}, lanes: lanesFor(lock.routes.B)}),
  paired
 }, lock.routes).advance, false);
 assert.equal(acceptIndependent({
  A: arm(0.4), B: arm(0.46, {abandonedKills: 1, lanes: lanesFor(lock.routes.B)}), paired
 }, lock.routes).killsOk, false);
 const wrongStart = lanesFor(lock.routes.B);
 wrongStart.start = {v3: 1, hard: 3, other: 0};
 assert.equal(routesOk({lanes: wrongStart, startMismatches: 0, otherMismatches: 0, phaseErrors: 0}, lock.routes.B), false);
 assert.equal(acceptIndependent({
  A: arm(0.4), B: arm(0.46, {lanes: wrongStart}), paired
 }, lock.routes).routePass, false);
});
