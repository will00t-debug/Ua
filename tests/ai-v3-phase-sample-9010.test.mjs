import assert from 'node:assert/strict';
import test from 'node:test';
import {publicRecordLeaks} from '../scripts/ai-v3-decision-log.mjs';
import {
 addDecision, jobsFromSampleLock, loadSampleLock, mergeBags, recommendFrom, sampleLaneIndex, summarizeSample
} from '../scripts/ai-v3-phase-sample.mjs';

test('9010-9049 is a 160-game lock and was not an AI measurement', () => {
 const lock = loadSampleLock();
 assert.equal(lock.namedBeforeResults, true);
 assert.equal(lock.games, 160);
 assert.equal(lock.experiments, 'off');
 assert.equal(lock.switches.settleLife, false);
 assert.equal(lock.switches.paidFront, false);
 assert.deepEqual(lock.sample.laneIndexes, [0, 3, 7]);
 const jobs = jobsFromSampleLock(lock);
 assert.equal(jobs.length, 160);
 assert.equal(new Set(jobs.map(job => job.seed)).size, 40);
 assert.ok(jobs.every(job => job.seed >= 9010 && job.seed <= 9049));
 const games = {};
 for (const job of jobs) games[job.deck] = (games[job.deck] || 0) + 1;
 assert.deepEqual(games, {'white-sword': 56, 'sword-art-online-raid': 52, 'steins-gate-raid': 52});
 assert.equal(sampleLaneIndex(0), true);
 assert.equal(sampleLaneIndex(3), true);
 assert.equal(sampleLaneIndex(7), true);
 assert.equal(sampleLaneIndex(1), false);
 assert.equal(sampleLaneIndex(8), false);
});

test('decision counts add after the fact and do not keep a hidden field', () => {
 const bag = addDecision({}, {lane: 'start', type: 'extraDraw', legalCount: 2, nodes: 48, wall: 41, reason: 'budget'});
 addDecision(bag, {lane: 'battle', pending: 'block', type: 'chooseBlock', legalCount: 3, nodes: 49, wall: 20, reason: 'search'});
 const merged = mergeBags([bag, bag]);
 assert.equal(merged.start.n, 2);
 assert.equal(merged.start.budget, 2);
 assert.equal(merged.battle.overNodes, 2);
 assert.equal(merged.battle.pending.block, 2);
 assert.equal(publicRecordLeaks(merged), null);
});

test('a recommendation needs two life gains and only one candidate', () => {
 const agree = {
  battle: {n: 40, agree: 20},
  pending: {n: 40, agree: 40},
  start: {n: 40, agree: 40},
  move: {n: 40, agree: 40}
 };
 const none = recommendFrom(agree, [{lane: 'battle', ownLifeDelta: 1}]);
 assert.equal(none.selected, null);
 const one = recommendFrom(agree, [
  {lane: 'battle', ownLifeDelta: 1},
  {lane: 'battle', ownLifeDelta: 1}
 ]);
 assert.equal(one.selected, 'A');
 const both = recommendFrom({
  ...agree,
  pending: {n: 40, agree: 10}
 }, [
  {lane: 'battle', ownLifeDelta: 1},
  {lane: 'battle', ownLifeDelta: 1},
  {lane: 'pending', ownLifeDelta: 1},
  {lane: 'pending', ownLifeDelta: 1}
 ]);
 assert.equal(both.selected, null);
});

test('a fake split does not overwrite the 9050 record fields', () => {
 const game = (won, deck, first) => ({
  deck, seed: 9010, hybridIsFirst: first, hybridWon: won,
  finished: true, draw: false, illegal: 0, routingErrors: 0, snapshotFailures: 0,
  hitStepCap: false, actionReplayOk: true, samples: [],
  bags: {hybrid: {}, hard: {}}
 });
 const summary = summarizeSample([
  game(true, 'white-sword', true),
  game(false, 'white-sword', false)
 ]);
 assert.equal(summary.record.games, 2);
 assert.equal(summary.whiteFirst.wins, 1);
 assert.equal(summary.whiteSecond.wins, 0);
 assert.equal(summary.doesNotReplace, 'audit/ai-v3-hybrid-vs-hard-9050-summary.json');
 assert.equal(summary.localSnapshotsCommitted, false);
});
