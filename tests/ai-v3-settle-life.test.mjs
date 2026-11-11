import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {loadSettleLock, settleJobs, pairedInterval} from '../scripts/ai-v3-settle-life-ab.mjs';
import {chooseAiV3Action, lastAiV3Trace, preferLivedBlock} from '../dist/universal-v2/ai-v3/search.mjs';
import {bindVariant, normalizeFactors} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {chooseHybridMainAction, lastHybridRoute} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {dispatchUniversalAction, legalUniversalActions, universalBp} from '../dist/universal-v2/engine.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pass = {type: 'chooseBlock', uid: null};
const block = {type: 'chooseBlock', uid: '0-1'};
const other = {type: 'chooseBlock', uid: '0-2'};
const blockState = {pending: {kind: 'block', player: 0}};

function row(action, extra) {
 return {action, executed: true, boundary: 'terminal', ...extra};
}
function ask(choice, rows, factors) {
 return bindVariant(null, () => preferLivedBlock(blockState, choice, rows), factors || null);
}

test('8850 lock is named before any game and keeps 9100 reserved', () => {
 const lock = loadSettleLock();
 const jobs = settleJobs(lock);
 assert.equal(lock.namedBeforeResults, true);
 assert.equal(lock.nodes, 48);
 assert.equal(lock.ms, 40);
 assert.equal(lock.clock, 'real');
 assert.equal(jobs.length, 160);
 assert.equal(new Set(jobs.map(job => job.seed)).size, 40);
 assert.equal(jobs.some(job => job.seed >= 9100 || job.seed < 8850 || job.seed > 8889), false);
 assert.equal(jobs.filter(job => job.deck === 'white-sword').length, 56);
 assert.equal(jobs.filter(job => job.deck === 'sword-art-online-raid').length, 52);
 assert.equal(jobs.filter(job => job.deck === 'steins-gate-raid').length, 52);
 const interval = pairedInterval([0.25, -0.25, 0, 0.5]);
 assert.equal(interval.n, 4);
 assert.equal(typeof interval.low, 'number');
});

test('settleLife stays off unless this call asks for it', () => {
 assert.equal(normalizeFactors(null), null);
 assert.equal(normalizeFactors({settleLife: true}).settleLife, true);
 assert.equal(normalizeFactors({settleLife: true}).frontSpare, undefined);
 assert.equal(normalizeFactors({settleLife: true}).laterEnergy, undefined);
 assert.equal(normalizeFactors({frontSpare: true}).settleLife, undefined);
 assert.equal(normalizeFactors({laterEnergy: true}).settleLife, undefined);
});

test('an unsettled draw trigger does not outrank a block that reached the opponent', () => {
 const rows = [
  row(pass, {search: -90000, pending: 'life-trigger', stopPending: 'life-trigger', leafTrigger: 'draw', opponentTurns: 0, battleScore: -89962}),
  row(block, {search: -100000, opponentTurns: 1, battleScore: -20}),
  row(other, {search: -100000, opponentTurns: 1, battleScore: -30})
 ];
 assert.equal(ask(pass, rows), pass);
 assert.deepEqual(ask(pass, rows, {settleLife: true}), block);
});

test('get and active are the same unfinished life-zero', () => {
 for (const trigger of ['get', 'active']) {
  const rows = [
   row(pass, {search: -90000, stopPending: 'life-trigger', leafTrigger: trigger, opponentTurns: 0}),
   row(block, {search: -100000, opponentTurns: 1, battleScore: -1})
  ];
  assert.deepEqual(ask(pass, rows, {settleLife: true}), block);
 }
});

test('FINAL, SPECIAL and an unknown trigger are not treated as a finished loss', () => {
 for (const trigger of ['final', 'special', null]) {
  const rows = [
   row(pass, {search: -90000, stopPending: 'life-trigger', leafTrigger: trigger, opponentTurns: 0}),
   row(block, {search: -100000, opponentTurns: 1, battleScore: -1})
  ];
  assert.equal(ask(pass, rows, {settleLife: true}), pass);
 }
});

test('a block that also dies on this attack is not called safe', () => {
 const rows = [
  row(pass, {search: -90000, stopPending: 'life-trigger', leafTrigger: 'draw', opponentTurns: 0}),
  row(block, {search: -100000, opponentTurns: 0, battleScore: -90000}),
  row(other, {search: -90000, stopPending: 'life-trigger', leafTrigger: 'active', opponentTurns: 0})
 ];
 assert.equal(ask(pass, rows, {settleLife: true}), pass);
});

test('a non-lethal score and a proven win stay put', () => {
 const mild = [
  row(pass, {search: -12, pending: null, opponentTurns: 1}),
  row(block, {search: -20, opponentTurns: 1})
 ];
 assert.equal(ask(pass, mild, {settleLife: true}), pass);
 const win = {type: 'activate', uid: '0-9'};
 const wins = [row(win, {search: 100000, opponentTurns: 0})];
 assert.equal(ask(win, wins, {settleLife: true}), win);
 assert.equal(preferLivedBlock({pending: null}, pass, [
  row(pass, {search: -90000, stopPending: 'life-trigger', leafTrigger: 'draw', opponentTurns: 0}),
  row(block, {search: -100000, opponentTurns: 1})
 ]), pass);
});

test('frozen white-sword 8801 keeps the default pass and blocks once settleLife is asked', () => {
 const deck = battleDecks().find(item => item.id === 'white-sword');
 const packs = [deck.pack, deck.pack];
 const fixture = JSON.parse(readFileSync(new URL('./fixtures/ai-v3-settle-life-8801.json', import.meta.url), 'utf8'));
 const state = fixture.state;
 assert.equal(fixture.trigger, 'active');
 assert.equal(fixture.impact, 0);
 assert.equal(fixture.life, 1);
 assert.equal(fixture.damage, 1);
 assert.equal(fixture.atkBp, 4000);
 const budget = {nodes: 48, ms: 40, seed: 1, worlds: 1, now: () => 0, actor: 0};
 const legal = legalUniversalActions(packs, state);
 const again = chooseAiV3Action(packs, state, budget);
 const trace = lastAiV3Trace();
 const passRow = (trace?.candidates || []).find(item => item.action?.type === 'chooseBlock' && item.action.uid == null);
 const lived = (trace?.candidates || []).filter(item => item.action?.uid && item.boundary === 'terminal'
  && item.search <= -100000 && (item.opponentTurns || 0) > 0);
 assert.equal(again.uid ?? null, null);
 assert.equal(passRow?.search, -90000);
 assert.equal(passRow?.leafTrigger, 'active');
 assert.equal(passRow?.pending, 'life-trigger');
 assert.ok(lived.length >= 1);
 const switched = chooseHybridMainAction(packs, state, {...budget, factors: {settleLife: true}});
 const route = lastHybridRoute();
 assert.equal(route.lane, 'pending');
 assert.equal(route.source, 'v3');
 assert.equal(route.nodes, 48);
 assert.equal(route.ms, 40);
 assert.ok(switched.uid);
 assert.equal(legal.some(item => same(item, switched)), true);
 const blocker = state.players[0].front.find(card => card?.uid === switched.uid);
 assert.equal(universalBp(packs, state, blocker), 4000);
 const after = dispatchUniversalAction(packs, structuredClone(state), switched);
 assert.equal(after.status, 'playing');
 assert.equal(after.players[0].life.length, 1);
 assert.equal(after.pending?.kind === 'life-trigger', false);
 const worker = handleAiV3Request({
  sealed: true, requestId: 9, stateVersion: 1, actor: 0, seed: 1,
  nodes: 48, ms: 1e9, pack: packs, state, factors: {settleLife: true}
 });
 assert.equal(worker.error, null);
 assert.equal(worker.action?.uid ?? null, null);
 assert.ok((worker.search?.nodesUsed ?? 0) <= 48);
});
