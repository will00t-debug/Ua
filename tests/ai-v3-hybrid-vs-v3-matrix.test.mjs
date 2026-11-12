import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {jobsFromLock, loadLock, mulberry32, winRateInterval, PROGRAM_SHA} from '../scripts/ai-v3-hybrid-vs-v3.mjs';

test('8800 lock is the direct hybrid versus v3 schedule', () => {
 const lock = loadLock();
 assert.equal(lock.programSha, PROGRAM_SHA);
 assert.equal(lock.namedBeforeResults, true);
 assert.equal(lock.policies.hybrid, 'hybrid-main-v1');
 assert.equal(lock.policies.opponent, 'ai-v3-beam-1');
 assert.equal(lock.opponentIsNot, 'hard-search-2');
 assert.equal(lock.nodes, 48);
 assert.equal(lock.ms, 40);
 assert.equal(lock.experiments, 'off');
 const jobs = jobsFromLock(lock);
 assert.equal(jobs.length, 200);
 assert.equal(jobs.filter(job => job.deck === 'white-sword').length, 68);
 assert.equal(jobs.filter(job => job.deck === 'sword-art-online-raid').length, 68);
 assert.equal(jobs.filter(job => job.deck === 'steins-gate-raid').length, 64);
 assert.equal(jobs.filter(job => job.hybridIsFirst).length, 100);
 assert.equal(jobs.filter(job => !job.hybridIsFirst).length, 100);
 assert.equal(jobs.filter(job => job.hybridSeat === 0).length, 100);
 assert.equal(jobs.filter(job => job.hybridSeat === 1).length, 100);
 const seeds = [...new Set(jobs.map(job => job.seed))].sort((a, b) => a - b);
 assert.deepEqual(seeds, lock.seeds);
 assert.equal(seeds[0], 8800);
 assert.equal(seeds.at(-1), 8849);
 assert.equal(seeds.length, 50);
 for (const seed of [8600, 8601, 8602, 8700, 8701, 8702, 9100]) assert.equal(seeds.includes(seed), false);
 const block = jobs.filter(job => job.seed === 8800);
 assert.deepEqual(block.map(job => [job.hybridSeat, job.first, job.hybridIsFirst]), [
  [0, 0, true], [0, 1, false], [1, 1, true], [1, 0, false]
 ]);
 const text = readFileSync(new URL('../scripts/ai-v3-hybrid-vs-v3.mjs', import.meta.url), 'utf8');
 assert.match(text, /chooseHybridMainAction\(packs, state, \{actor, \.\.\.BUDGET\}\)/);
 assert.match(text, /chooseAiV3Action\(packs, state, \{actor, nodes: 48, ms: 40, seed: 1, worlds: 1\}\)/);
 assert.doesNotMatch(text, /chooseStrengthenedHardAction\(/);
 assert.doesNotMatch(text, /variant:/);
 assert.doesNotMatch(text, /factors:/);
});

test('the block interval reports whether 50 percent is inside', () => {
 const even = winRateInterval(Array(50).fill(0.5), mulberry32(8800));
 assert.equal(even.n, 50);
 assert.equal(even.mean, 0.5);
 assert.equal(even.containsHalf, true);
 const high = winRateInterval(Array(50).fill(1), mulberry32(8800));
 assert.equal(high.containsHalf, false);
 assert.equal(high.mean > 0.5, true);
});
