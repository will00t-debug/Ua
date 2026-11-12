import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtempSync, readFileSync as read, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {performance} from 'node:perf_hooks';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseHybridMainAction} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {legalUniversalActions, universalBp} from '../dist/universal-v2/engine.mjs';
import {
 captureDecision, decisionFlags, diagnoseEnabled, measureChoice, publicRecordLeaks,
 replayActions, retainOriginalChoice, verifyLocalSnapshot, writeLocalSnapshot
} from '../scripts/ai-v3-decision-log.mjs';
import {jobsFromLock, loadHardLock} from '../scripts/ai-v3-hybrid-vs-hard.mjs';

const deck = battleDecks().find(item => item.id === 'white-sword');
const packs = [deck.pack, deck.pack];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function load(step) {
 return JSON.parse(readFileSync(new URL(`./fixtures/ai-v3-paid-front-8801-${step}.json`, import.meta.url), 'utf8')).state;
}
function live(state, uid) {
 const card = state.players.flatMap(player => [...(player.hand || []), ...(player.front || [])]).find(item => item?.uid === uid);
 return card ? universalBp(packs, state, card) : 0;
}
function spin(ms) {
 const start = performance.now();
 while (performance.now() - start < ms) {}
}

test('diagnosis is off unless the benchmark asks for it', () => {
 const bench = readFileSync(new URL('../scripts/ai-v3-benchmark.mjs', import.meta.url), 'utf8');
 assert.equal(diagnoseEnabled({}), false);
 assert.equal(diagnoseEnabled({AI_V3_DIAGNOSE: '1'}), true);
 assert.match(bench, /AI_V3_DIAGNOSE/);
 const timed = bench.indexOf('const ms=performance.now()-before');
 const recorded = bench.indexOf('captureDecision(');
 assert.ok(timed > 0 && recorded > timed);
 const log = readFileSync(new URL('../scripts/ai-v3-decision-log.mjs', import.meta.url), 'utf8');
 assert.doesNotMatch(log, /chooseStrengthened|chooseAiV3|chooseHybrid/);
});

test('a slow record stays outside the measured choice', () => {
 const measured = measureChoice(() => 'kept', () => {
  spin(30);
  return 'logged';
 });
 assert.equal(measured.picked, 'kept');
 assert.equal(measured.recorded, 'logged');
 assert.ok(measured.searchMs < 15);
});

test('the saved position reproduces the legal list and keeps the original choice', () => {
 const state = load(39);
 const actor = state.active;
 const legal = legalUniversalActions(packs, state);
 const heavy = legal.find(action => action.type === 'play' && action.line === 'energy' && live(state, action.uid) >= 3000);
 const deploy = legal.find(action => action.type === 'play' && action.line === 'front' && live(state, action.uid) >= 3000);
 assert.ok(heavy && deploy);
 const captured = captureDecision({
  packs, before: state, after: state, actor, first: state.first, legal, chosen: heavy,
  policy: 'hybrid-main-v1', source: 'hard', lane: 'main',
  trace: {reason: 'search', nodesUsed: 48, ms: 12, candidates: [{action: heavy, score: 53.5}, {action: deploy, score: 18.7}]},
  wallMs: 12, nodesBudget: 48, msBudget: 40, step: 39, ownTurn: 3, keepState: true, withId: true
 });
 assert.equal(publicRecordLeaks(captured.public), null);
 assert.ok(captured.flags.includes('thin-front-high-bp-energy'));
 assert.equal(captured.public.choiceSource, 'live-dispatch');
 assert.equal(captured.public.chosenIndex >= 0, true);
 assert.equal(verifyLocalSnapshot(packs, captured.local).ok, true);
 const replayed = {type: 'next'};
 assert.deepEqual(retainOriginalChoice(captured.local, replayed), captured.local.chosen);
 assert.equal(same(captured.local.chosen, heavy), true);
 assert.notEqual(same(captured.local.chosen, replayed), true);
 const played = replayActions(packs, state, [captured.local.chosen]);
 assert.equal(played.ok, true);
 const dir = mkdtempSync(join(tmpdir(), 'ua-decision-'));
 try {
  const file = writeLocalSnapshot(dir, captured.local);
  const loaded = JSON.parse(read(file, 'utf8'));
  assert.equal(verifyLocalSnapshot(packs, loaded).ok, true);
  assert.equal(publicRecordLeaks(captured.public), null);
  assert.match(read(file, 'utf8'), /"deck"/);
 } finally {
  rmSync(dir, {recursive: true, force: true});
 }
});

test('a small energy play on an empty front is not marked as a high-BP miss', () => {
 const state = load(8);
 const actor = state.active;
 const legal = legalUniversalActions(packs, state);
 const energy = legal.find(action => action.type === 'play' && action.line === 'energy');
 const flags = decisionFlags(packs, state, actor, legal, energy, null, {source: 'hard', ownTurn: 1});
 assert.equal(flags.includes('thin-front-high-bp-energy'), false);
 assert.ok(live(state, energy.uid) < 3000);
});

test('raid, lethal block, extra draw, and equivalent wins are marked from the live choice', () => {
 const state = load(82);
 const actor = state.active;
 const legal = legalUniversalActions(packs, state);
 const energy = legal.find(action => action.type === 'play' && action.line === 'energy');
 const raidFlags = decisionFlags(packs, state, actor, legal, energy, null, {source: 'hard', ownTurn: 2});
 assert.ok(raidFlags.includes('legal-raid-other'));
 assert.equal(raidFlags.includes('early-raid-other'), false);
 const early = load(39);
 const earlyLegal = legalUniversalActions(packs, early);
 const earlyEnergy = earlyLegal.find(action => action.type === 'next') || earlyLegal[0];
 const earlyFlags = decisionFlags(packs, early, early.active, earlyLegal, earlyEnergy, null, {source: 'hard', ownTurn: 2});
 assert.equal(earlyFlags.includes('legal-raid-other'), false);

 const block = structuredClone(state);
 block.pending = {kind: 'block', player: 0, attackerUid: '1-28'};
 block.players[0].life = block.players[0].life.slice(0, 1);
 const pass = {type: 'chooseBlock', uid: null};
 const blocker = {type: 'chooseBlock', uid: '0-39'};
 const lethal = decisionFlags(packs, block, 0, [pass, blocker], pass, null, {source: 'hard'});
 assert.ok(lethal.includes('defender-lethal'));

 const draw = decisionFlags(packs, state, actor, legal, {type: 'extraDraw'}, null, {source: 'v3'});
 assert.ok(draw.includes('extra-draw'));
 const wins = decisionFlags(packs, state, actor, legal, energy, {
  candidates: [{action: energy, score: 50000}, {action: legal.find(action => action.type === 'raid'), score: 51000}]
 }, {source: 'hard'});
 assert.ok(wins.includes('proven-kill') && wins.includes('equivalent-wins'));
 const missed = decisionFlags(packs, state, actor, legal, energy, {
  candidates: [{action: legal.find(action => action.type === 'raid'), score: 50000}]
 }, {source: 'hard'});
 assert.ok(missed.includes('abandoned-kill'));
 assert.equal(missed.includes('proven-kill'), false);
});

test('the recorded hybrid choice stays put when a later clock would differ', () => {
 const state = load(8);
 const actor = state.active;
 const legal = legalUniversalActions(packs, state);
 const first = chooseHybridMainAction(packs, state, {actor, nodes: 48, ms: 1e9, seed: 1});
 const exact = legal.find(action => same(action, first));
 const captured = captureDecision({
  packs, before: state, after: state, actor, first: state.first, legal, chosen: exact,
  policy: 'hybrid-main-v1', source: 'hard', lane: 'main', trace: {reason: 'search', nodesUsed: 12, ms: 4},
  wallMs: 4, nodesBudget: 48, msBudget: 40, step: 8, keepState: true
 });
 const other = chooseHybridMainAction(packs, state, {actor, nodes: 48, ms: 1, seed: 1}) || {type: 'next'};
 assert.deepEqual(retainOriginalChoice(captured.local, other), exact);
 assert.equal(same(captured.local.chosen, exact), true);
});

test('9050-9099 is locked before any result and does not use 9100', () => {
 const lock = loadHardLock();
 assert.equal(lock.namedBeforeResults, true);
 assert.equal(lock.nodes, 48);
 assert.equal(lock.ms, 40);
 assert.equal(lock.steps, 1200);
 assert.equal(lock.experiments, 'off');
 assert.equal(lock.policies.opponent, 'hard-search-2');
 assert.equal(lock.policies.hybrid, 'hybrid-main-v1');
 const jobs = jobsFromLock(lock);
 assert.equal(jobs.length, 200);
 const seeds = [...new Set(jobs.map(job => job.seed))].sort((a, b) => a - b);
 assert.equal(seeds[0], 9050);
 assert.equal(seeds.at(-1), 9099);
 assert.equal(seeds.length, 50);
 assert.equal(jobs.some(job => job.seed >= 9100), false);
 assert.equal(jobs.filter(job => job.deck === 'white-sword').length, 68);
 assert.equal(jobs.filter(job => job.deck === 'sword-art-online-raid').length, 68);
 assert.equal(jobs.filter(job => job.deck === 'steins-gate-raid').length, 64);
 assert.equal(jobs.filter(job => job.hybridIsFirst).length, 100);
 assert.equal(jobs.filter(job => job.hybridSeat === 0).length, 100);
 assert.equal(lock.decks.map(row => row.seeds.length).join(','), '17,17,16');
});
