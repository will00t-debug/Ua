import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseHybridMainAction, chooseHybridStartHardAction, lastHybridRoute} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {preferCurveFront} from '../dist/universal-v2/ai-v3/curve-front.mjs';
import {applySharedOpening, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseStrengthenedHardAction, lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {dispatchUniversalAction, legalUniversalActions, universalBp, universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {captureDecision, measureChoice, publicRecordLeaks, replayActions, verifyLocalSnapshot} from '../scripts/ai-v3-decision-log.mjs';
import {curveFrontJobs, loadCurveFrontLock} from '../scripts/ai-v3-curve-front-ab.mjs';
import {pairedInterval} from '../scripts/ai-v3-paid-front-ab.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const deck = battleDecks().find(item => item.id === 'white-sword');
const packs = [deck.pack, deck.pack];

function load(name) {
 const fixture = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
 return fixture.state;
}
function printed(card) {
 if (!card?.uid) return null;
 return packs[Number(String(card.uid).split('-')[0])].cards[card.cardId];
}
function live(state, card) {
 return universalBp(packs, state, card);
}
function choose(state, factors, limits = {}) {
 return chooseHybridMainAction(packs, state, {actor: 0, nodes: 48, ms: 1e9, seed: 1, ...limits, ...(factors ? {factors} : {})});
}
function findEnergy(state, pred) {
 const legal = legalUniversalActions(packs, state);
 return legal.find(action => {
  if (action.type !== 'play' || action.line !== 'energy') return false;
  const card = state.players[0].hand.find(item => item.uid === action.uid);
  return card && pred(printed(card), live(state, card));
 });
}
function findFrontDeploy(state) {
 const legal = legalUniversalActions(packs, state);
 return legal.find(action => {
  if (action.type === 'raid' && action.line === 'energy') return false;
  if (action.type !== 'raid' && !(action.type === 'play' && action.line === 'front')) return false;
  const card = state.players[0].hand.find(item => item.uid === action.uid);
  return card && live(state, card) >= 4000;
 });
}
function scoreOf(trace, action) {
 const row = (trace?.candidates || []).find(item => same(item.action, action));
 return row ? row.score : null;
}

test('depth 3 keeps the 8801 generator and depth 2 shows the raid was searched', () => {
 const state = load('ai-v3-curve-front-8801');
 assert.equal(universalEnergyByColor(packs, state, 0).green, 4);
 const ready = state.players[0].front.filter(Boolean).map(card => live(state, card));
 assert.deepEqual(ready, [2000]);
 const deep = chooseStrengthenedHardAction(packs, state, {actor: 0, nodes: 48, ms: 1e9, depth: 3, seed: 1});
 const deepTrace = lastHardAiTrace();
 assert.equal(deepTrace.rootCut, false);
 assert.equal(deepTrace.rootCompared, deepTrace.rootCandidates);
 assert.equal(deep.type, 'play');
 assert.equal(deep.line, 'energy');
 const deepCard = printed(state.players[0].hand.find(card => card.uid === deep.uid));
 assert.equal(deepCard.gen, 2);
 assert.equal(deepCard.energy, 4);
 const legal = legalUniversalActions(packs, state);
 const raid = legal.find(action => action.type === 'raid' && action.line !== 'energy'
  && live(state, state.players[0].hand.find(card => card.uid === action.uid)) >= 4000);
 assert.ok(raid);
 assert.ok(scoreOf(deepTrace, raid) < 0);
 assert.ok(scoreOf(deepTrace, deep) > 40);
 assert.equal(same(preferCurveFront(packs, state, 0, deep, legal, deepTrace), deep), true);

 const shallow = chooseStrengthenedHardAction(packs, state, {actor: 0, nodes: 48, ms: 1e9, depth: 2, seed: 1});
 const shallowTrace = lastHardAiTrace();
 const gen2 = findEnergy(state, (data, bp) => data.gen === 2 && data.energy === 4 && bp >= 4000);
 const gen1 = findEnergy(state, (data, bp) => data.gen === 1 && data.energy === 1 && bp >= 4000);
 assert.ok(scoreOf(shallowTrace, raid) > scoreOf(shallowTrace, gen2));
 assert.equal(shallow.type, 'play');
 assert.equal(shallow.line, 'energy');
 const swapped = preferCurveFront(packs, state, 0, gen1, legal, {
  candidates: [{action: gen1, score: 52.5}, {action: raid, score: 18.7}]
 });
 assert.equal(same(swapped, raid), true);
 const kept = preferCurveFront(packs, state, 0, gen2, legal, {
  candidates: [{action: gen2, score: 53.5}, {action: raid, score: 18.7}]
 });
 assert.equal(same(kept, gen2), true);

 const wide = chooseStrengthenedHardAction(packs, state, {actor: 0, nodes: 200, ms: 1e9, depth: 3, seed: 1});
 const wideTrace = lastHardAiTrace();
 assert.equal(wide.type, 'play');
 assert.equal(wide.line, 'energy');
 assert.ok(scoreOf(wideTrace, wide) > scoreOf(wideTrace, raid));
});

test('low energy, an unfinished curve, and a short generator stay on energy', () => {
 const low = load('ai-v3-curve-front-keep-low');
 assert.equal(universalEnergyByColor(packs, low, 0).green, 1);
 assert.equal(low.players[0].front.some(Boolean), false);
 const lowEnergy = findEnergy(low, (data, bp) => bp >= 4000);
 const lowFront = findFrontDeploy(low);
 assert.ok(lowEnergy && lowFront);
 const lowLegal = legalUniversalActions(packs, low);
 assert.equal(same(preferCurveFront(packs, low, 0, lowEnergy, lowLegal, {
  candidates: [{action: lowEnergy, score: 38.6}, {action: lowFront, score: 34.7}]
 }), lowEnergy), true);

 const unlock = load('ai-v3-curve-front-keep-unlock');
 assert.equal(universalEnergyByColor(packs, unlock, 0).green, 2);
 const unlockEnergy = findEnergy(unlock, (data, bp) => data.gen >= 1 && bp >= 4000);
 const unlockFront = findFrontDeploy(unlock);
 assert.ok(unlockEnergy && unlockFront);
 const unlockLegal = legalUniversalActions(packs, unlock);
 assert.equal(same(preferCurveFront(packs, unlock, 0, unlockEnergy, unlockLegal, {
  candidates: [{action: unlockEnergy, score: 87.8}, {action: unlockFront, score: 82.4}]
 }), unlockEnergy), true);

 const short = load('ai-v3-curve-front-keep-short');
 assert.equal(universalEnergyByColor(packs, short, 0).green, 3);
 const shortEnergy = findEnergy(short, (data, bp) => data.gen === 2 && bp >= 4000);
 assert.ok(shortEnergy);
 const shortLegal = legalUniversalActions(packs, short);
 const smallFront = shortLegal.find(action => action.type === 'play' && action.line === 'front'
  && live(short, short.players[0].hand.find(card => card.uid === action.uid)) < 3000);
 assert.ok(smallFront);
 assert.equal(same(preferCurveFront(packs, short, 0, shortEnergy, shortLegal, {
  candidates: [{action: shortEnergy, score: 68.3}, {action: smallFront, score: 17.2}]
 }), shortEnergy), true);
});

test('curveFront stays off unless the main-phase factor is on', () => {
 const state = load('ai-v3-curve-front-8801');
 const plain = choose(state);
 const off = choose(state, {curveFront: false});
 const on = choose(state, {curveFront: true});
 assert.equal(same(plain, off), true);
 assert.equal(same(plain, on), true);
 assert.equal(lastHybridRoute().curveSwap, undefined);
 assert.equal(lastHybridRoute().nodes, 48);
 const start = chooseHybridStartHardAction(packs, state, {actor: 0, nodes: 48, ms: 1e9, seed: 1});
 const startOn = chooseHybridStartHardAction(packs, state, {actor: 0, nodes: 48, ms: 1e9, seed: 1, factors: {curveFront: true}});
 assert.equal(same(start, startOn), true);
 const source = readFileSync(new URL('../dist/universal-v2/ai-v3/hybrid-main.mjs', import.meta.url), 'utf8');
 const startSource = source.slice(source.indexOf('export function chooseHybridStartHardAction'));
 assert.equal(startSource.includes('curveFront'), false);
 assert.equal(startSource.includes('preferCurveFront'), false);
});

test('the worker ignores curveFront', () => {
 const state = load('ai-v3-curve-front-8801');
 const worker = handleAiV3Request({
  sealed: true, requestId: 4, stateVersion: 1, actor: 0, seed: 1,
  nodes: 48, ms: 1e9, pack: packs, state, policy: 'hybrid-main-v1',
  factors: {curveFront: true, paidFront: true}
 });
 assert.equal(worker.error, null);
 assert.equal(same(worker.action, choose(state)), true);
 const workerSource = readFileSync(new URL('../dist/universal-v2/ai-v3/worker-entry.mjs', import.meta.url), 'utf8');
 assert.equal(workerSource.includes('delete rawFactors.curveFront'), true);
});

test('a decision tape rebuilds the dispatched game without reading hidden zones', () => {
 const opened = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], 8801, 1)).state;
 let cursor = opened;
 const actions = [];
 for (let step = 0; cursor.status === 'playing' && step < 24; step++) {
  const actor = cursor.pending?.player ?? cursor.active;
  const before = cursor;
  const measured = measureChoice(() => chooseHybridMainAction(packs, cursor, {actor, nodes: 48, ms: 1e9, seed: 1}));
  const legal = legalUniversalActions(packs, before);
  const action = legal.find(item => same(item, measured.picked));
  assert.ok(action);
  const recorded = captureDecision({
   packs, before, actor, legal, chosen: action, trace: lastHardAiTrace(),
   source: 'hard', step, keepState: false, withId: false, nodesBudget: 48, msBudget: 40
  });
  assert.equal(publicRecordLeaks(recorded.public), null);
  assert.equal(recorded.local, null);
  actions.push(action);
  cursor = dispatchUniversalAction(packs, cursor, action, {actor});
 }
 const replay = replayActions(packs, opened, actions);
 assert.equal(replay.ok, true);
 assert.equal(replay.state.turn, cursor.turn);
 assert.deepEqual(replay.state.players.map(player => player.life.length), cursor.players.map(player => player.life.length));
 const state = load('ai-v3-curve-front-8801');
 const first = measureChoice(() => choose(state));
 const firstTrace = lastHardAiTrace();
 const snap = captureDecision({
  packs, before: state, actor: 0, legal: legalUniversalActions(packs, state),
  chosen: first.picked, trace: firstTrace, source: 'hard', keepState: true, withId: true,
  nodesBudget: 48, msBudget: null
 });
 assert.equal(publicRecordLeaks(snap.public), null);
 assert.equal(verifyLocalSnapshot(packs, snap.local).ok, true);
 assert.equal(JSON.stringify(snap.public).includes(state.players[1].hand[0].cardId), false);
 const second = measureChoice(() => choose(state));
 assert.equal(same(first.picked, second.picked), true);
 assert.equal(firstTrace.nodesUsed, lastHardAiTrace().nodesUsed);
});

test('the 8930 curveFront lock is fixed before any comparison game', () => {
 const lock = loadCurveFrontLock();
 const jobs = curveFrontJobs(lock);
 assert.equal(lock.namedBeforeResults, true);
 assert.equal(jobs.length, 160);
 assert.equal(lock.clock, 'real');
 assert.equal(lock.nodes, 48);
 assert.equal(lock.ms, 40);
 assert.equal(lock.reservedFrom, 9100);
 assert.equal(lock.policies.A, 'hybrid-main-v1');
 assert.equal(lock.policies.B, 'hybrid-main-v1+curveFront');
 assert.equal(lock.policies.opponent, 'ai-v3-beam-1');
 assert.deepEqual(lock.secondSetReserved, [8970, 9009]);
 assert.equal(lock.advanceTo8970.includes('low percentile is greater than -0.05'), true);
 assert.equal(lock.advanceTo8970.includes('Do not retune'), true);
 assert.equal(lock.decks.reduce((sum, item) => sum + item.games, 0), 160);
 const interval = pairedInterval([0.25, -0.25, 0, 0.5], 8930);
 assert.equal(interval.n, 4);
 assert.equal(Number.isFinite(interval.low) && Number.isFinite(interval.high), true);
});

test('8930 is not confirmed on 8970, so curveFront stays off', () => {
 const summary = JSON.parse(readFileSync(new URL('../audit/ai-v3-curve-front-8930-summary.json', import.meta.url), 'utf8'));
 assert.equal(summary.programSha, '143e872bb3ec864144abde567fe468b6d7c5d74d');
 assert.equal(summary.defaultRemainsOff, true);
 assert.equal(summary.candidateUntunedBetweenSets, true);
 assert.equal(summary.switch, 'off');
 assert.equal(summary.firstSet.games.length, 160);
 assert.equal(summary.secondSet.games.length, 160);
 assert.equal(summary.firstSet.summary.A.overall.wins, 119);
 assert.equal(summary.firstSet.summary.B.overall.wins, 125);
 assert.equal(summary.firstSet.summary.A.whiteSecond.wins, 17);
 assert.equal(summary.firstSet.summary.B.whiteSecond.wins, 19);
 assert.equal(summary.firstSet.summary.safetyA, true);
 assert.equal(summary.firstSet.summary.safetyB, true);
 assert.equal(summary.firstSet.summary.advanceTo8970, true);
 assert.equal(summary.secondSet.summary.A.overall.wins, 128);
 assert.equal(summary.secondSet.summary.B.overall.wins, 127);
 assert.equal(summary.secondSet.summary.A.whiteSecond.wins, 18);
 assert.equal(summary.secondSet.summary.B.whiteSecond.wins, 18);
 assert.equal(summary.secondSet.summary.safetyA, true);
 assert.equal(summary.secondSet.summary.safetyB, true);
 assert.equal(summary.secondSet.summary.advanceTo8970, false);
 assert.equal(summary.secondSet.summary.paired.low < -0.05, true);
});
