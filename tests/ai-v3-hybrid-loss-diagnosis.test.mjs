import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyNotes, lethalPassKind, selectJobs} from '../scripts/ai-v3-hybrid-loss-diagnosis.mjs';
import {jobsFromLock} from '../scripts/ai-v3-hybrid-vs-v3.mjs';

test('loss diagnosis keeps every official loss cell and does not rewrite the 200-game record', () => {
 const summary = JSON.parse(readFileSync(new URL('../audit/ai-v3-hybrid-vs-v3-8800-summary.json', import.meta.url), 'utf8'));
 assert.equal(summary.record.wins, 150);
 assert.equal(summary.record.losses, 50);
 const selected = selectJobs(jobsFromLock(), summary.gameRows);
 const losses = summary.gameRows.filter(row => row.hybridWon === false);
 assert.equal(losses.length, 50);
 for (const row of losses) {
  assert.equal(selected.some(job => job.deck === row.deck && job.seed === row.seed
   && job.first === row.first && job.hybridSeat === row.hybridSeat), true);
 }
 assert.equal(selected.filter(job => job.deck === 'white-sword').length, 68);
 assert.equal(selected.some(job => job.deck === 'sword-art-online-raid' && job.seed === 8818), false);
 const source = readFileSync(new URL('../scripts/ai-v3-hybrid-loss-diagnosis.mjs', import.meta.url), 'utf8');
 assert.equal(source.includes('writeFileSync(SUMMARY_URL'), false);
 assert.match(source, /nodes: 48, ms: 40, seed: 1/);
});

test('a loss with no flagged decision is not called a single-step mistake', () => {
 const plain = classifyNotes({finished: true, illegal: 0, flags: []});
 assert.equal(plain.primary, 8);
 assert.equal(plain.evidence, false);
 const unfinished = classifyNotes({finished: false, illegal: 0, flags: [{id: 2, kind: 'beater-energy', ownTurn: 1, step: 3}]});
 assert.equal(unfinished.primary, null);
 const flagged = classifyNotes({finished: true, illegal: 0, flags: [
  {id: 5, kind: 'ap-draw', ownTurn: 1, step: 1},
  {id: 4, kind: 'skipped-raid', ownTurn: 2, step: 8}
 ]});
 assert.equal(flagged.primary, 5);
 assert.equal(flagged.evidence, true);
 const sameTurn = classifyNotes({finished: true, illegal: 0, flags: [
  {id: 5, kind: 'ap-draw', ownTurn: 2, step: 4},
  {id: 6, kind: 'block-lethal', ownTurn: 2, step: 9}
 ]});
 assert.equal(sameTurn.primary, 6);
 const higher = lethalPassKind({
  kind: 'block-lethal', attackerBp: 1500,
  front: [{bp: 4000, ready: true}],
  trace: {top: [
   {type: 'chooseBlock', bp: 4000, score: -100000},
   {type: 'chooseBlock', bp: null, score: -90000}
  ]}
 });
 assert.equal(higher, 'higher-bp');
 const tied = lethalPassKind({
  kind: 'block-lethal', attackerBp: 4000,
  front: [{bp: 4000, ready: true}],
  trace: {top: [
   {type: 'chooseBlock', bp: 4000, score: -100000},
   {type: 'chooseBlock', bp: null, score: -100000}
  ]}
 });
 assert.equal(tied, 'unscored');
});
