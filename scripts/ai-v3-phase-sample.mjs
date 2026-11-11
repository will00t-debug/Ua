#!/usr/bin/env node
// Phase counts for hybrid-main-v1 versus hard-search-2 on the 9010 lock.
// Recording runs after the timed chooser returns. A snapshot never replaces
// the action that was just chosen. Full states stay in the local directory.
//
//   node scripts/ai-v3-phase-sample.mjs
//   AI_V3_SHARD=0 AI_V3_SHARDS=4 node scripts/ai-v3-phase-sample.mjs
//   AI_V3_MERGE=1 node scripts/ai-v3-phase-sample.mjs
//   AI_V3_SHADOW=1 node scripts/ai-v3-phase-sample.mjs
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report} from '../dist/universal-v2/ai-v3/search.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseHybridMainAction, hybridLane, hybridSource, lastHybridRoute, HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {dispatchUniversalAction, legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction, lastHardAiTrace, resetHardAiReport, HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {blockInterval} from './ai-v3-hybrid-vs-hard.mjs';
import {
 decisionFlags, decisionStateId, publicActionBrief, publicRecordLeaks, replayActions, verifyLocalSnapshot, writeLocalSnapshot
} from './ai-v3-decision-log.mjs';

export const PROGRAM_BASE = '98b7ffd9b58e4fb7244579a28a25dc5e1493dab7';
const LOCK_URL = new URL('../audit/ai-v3-phase-sample-9010-seed-lock.json', import.meta.url);
const REPORT_URL = new URL('../audit/ai-v3-phase-sample-9010.json', import.meta.url);
const OUT = process.env.AI_V3_OUT || '/tmp/ai-v3-phase-sample-9010';
const SNAPSHOTS = process.env.AI_V3_DIAG_DIR || `${OUT}/snapshots`;
const BUDGET = {nodes: 48, ms: 40, seed: 1};
const SAME = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const LANES = ['start', 'move', 'main', 'battle', 'pending', 'other'];

export function loadSampleLock() {
 return JSON.parse(readFileSync(LOCK_URL, 'utf8'));
}

export function jobsFromSampleLock(lock = loadSampleLock()) {
 const jobs = [];
 for (const deck of lock.decks) {
  if (deck.seeds.length * lock.cells.length !== deck.games) throw new Error(`${deck.id} does not make ${deck.games} games`);
  for (const seed of deck.seeds) {
   for (const cell of lock.cells) jobs.push({deck: deck.id, seed, ...cell});
  }
 }
 return jobs;
}

export function sampleLaneIndex(index, indexes = [0, 3, 7]) {
 return indexes.includes(index);
}

export function blankBag() {
 return {};
}

function laneRow(bag, lane) {
 if (!bag[lane]) bag[lane] = {n: 0, legal: 0, nodeN: 0, nodes: 0, overNodes: 0, wall: 0, over40: 0, budget: 0, forced: 0, deferred: 0, types: {}, pending: {}};
 return bag[lane];
}

export function addDecision(bag, row) {
 const lane = LANES.includes(row.lane) ? row.lane : 'other';
 const item = laneRow(bag, lane);
 item.n++;
 item.legal += row.legalCount || 0;
 if (Number.isFinite(row.nodes)) {
  item.nodeN++;
  item.nodes += row.nodes;
  if (row.nodes > 48) item.overNodes++;
 }
 if (Number.isFinite(row.wall)) {
  item.wall += row.wall;
  if (row.wall > 40) item.over40++;
 }
 if (row.reason === 'budget' || row.reason === 'budget-fallback') item.budget++;
 if (row.reason === 'forced') item.forced++;
 if (row.reason === 'deferred' || row.reason === 'deferred-baseline') item.deferred++;
 const type = `${row.type || 'none'}${row.line ? ':' + row.line : ''}`;
 item.types[type] = (item.types[type] || 0) + 1;
 if (row.pending) item.pending[row.pending] = (item.pending[row.pending] || 0) + 1;
 return bag;
}

export function mergeBags(bags) {
 const out = blankBag();
 for (const bag of bags) {
  for (const [lane, row] of Object.entries(bag || {})) {
   const item = laneRow(out, lane);
   item.n += row.n;
   item.legal += row.legal;
   item.nodeN += row.nodeN;
   item.nodes += row.nodes;
   item.overNodes += row.overNodes;
   item.wall += row.wall;
   item.over40 += row.over40;
   item.budget += row.budget;
   item.forced += row.forced;
   item.deferred += row.deferred;
   for (const [key, count] of Object.entries(row.types || {})) item.types[key] = (item.types[key] || 0) + count;
   for (const [key, count] of Object.entries(row.pending || {})) item.pending[key] = (item.pending[key] || 0) + count;
  }
 }
 return out;
}

function frozenDistDiff() {
 return execSync(
  `git diff --name-only ${PROGRAM_BASE} -- dist/universal-v2/ai-v3 dist/universal-v2/hard-ai.mjs dist/universal-v2/engine.mjs dist/universal-v2/ai.mjs`,
  {encoding: 'utf8'}
 ).trim();
}

function assertSchedule(lock) {
 if (lock.programBase !== PROGRAM_BASE) throw new Error('Lock base moved');
 if (lock.namedBeforeResults !== true) throw new Error('Lock was not named before results');
 if (lock.policies.hybrid !== HYBRID_MAIN_POLICY || lock.policies.opponent !== HARD_AI_POLICY) throw new Error('Lock policies moved');
 if (lock.nodes !== 48 || lock.ms !== 40 || lock.searchSeed !== 1 || lock.steps !== 1200) throw new Error('Lock budget moved');
 if (lock.experiments !== 'off' || lock.switches?.settleLife !== false || lock.switches?.paidFront !== false) throw new Error('Lock switches are not off');
 if (!Array.isArray(lock.sample?.laneIndexes) || lock.sample.laneIndexes.some(index => ![0, 3, 7].includes(index))) throw new Error('Sample indexes moved');
 const jobs = jobsFromSampleLock(lock);
 if (jobs.length !== 160) throw new Error(`Expected 160 games, got ${jobs.length}`);
 if (jobs.some(job => job.seed < 9010 || job.seed > 9049)) throw new Error('Seed is outside 9010-9049');
 const changed = frozenDistDiff();
 if (changed) throw new Error('AI code differs from the locked base: ' + changed);
 return jobs;
}

function chooseFor(packs, state, hybridSeat) {
 const actor = state.pending?.player ?? state.active;
 const lane = hybridLane(state);
 const legal = legalUniversalActions(packs, state);
 const started = performance.now();
 let raw = null;
 let trace = null;
 let source = null;
 let policy = null;
 const problems = [];
 if (actor === hybridSeat) {
  raw = chooseHybridMainAction(packs, state, {actor, ...BUDGET});
  const route = lastHybridRoute();
  source = route?.source || null;
  policy = route?.policy || null;
  trace = source === 'hard' ? lastHardAiTrace() : lastAiV3Trace();
  if (!route || policy !== HYBRID_MAIN_POLICY || route.lane !== lane || source !== hybridSource(lane)
   || route.nodes !== 48 || route.ms !== 40 || route.actor !== actor) problems.push('hybrid-route');
  if (source === 'v3' && Object.values(trace?.factors || {}).some(value => value === true)) problems.push('experiment');
 } else {
  raw = chooseStrengthenedHardAction(packs, state, BUDGET);
  trace = lastHardAiTrace();
  policy = trace?.policy || null;
  source = 'hard';
  if (policy !== HARD_AI_POLICY) problems.push('hard-policy');
 }
 const wallMs = performance.now() - started;
 const action = legal.find(item => SAME(item, raw)) || null;
 return {actor, lane, source, policy, action, legal, trace, wallMs, problems};
}

function playGame(deck, job, lock) {
 const packs = [deck.pack, deck.pack];
 const opened = applySharedOpening(packs, newComparedMatch(
  packs, [deck.counts, deck.counts], job.seed, job.first));
 let cursor = cloneMatch(opened.state);
 const script = [];
 const bags = {hybrid: blankBag(), hard: blankBag()};
 const samples = [];
 const laneSeen = {};
 let anomalyKept = 0;
 let snapshotFailures = 0;
 const problems = [];
 let illegal = 0;
 let steps = 0;
 let engineError = null;

 while (cursor.status === 'playing' && steps < lock.steps) {
  const actor = cursor.pending?.player ?? cursor.active;
  let picked;
  try {
   picked = chooseFor(packs, cursor, job.hybridSeat);
  } catch (error) {
   illegal++;
   engineError = error?.message || String(error);
   break;
  }
  const side = actor === job.hybridSeat ? 'hybrid' : 'hard';
  if (picked.problems.length) problems.push({step: steps, side, problems: picked.problems});
  if (!picked.action) {
   illegal++;
   engineError = 'chosen action is not in the fresh legal list';
   break;
  }
  const brief = publicActionBrief(packs, cursor, actor, picked.action);
  addDecision(bags[side], {
   lane: picked.lane,
   pending: cursor.pending?.kind || null,
   type: brief?.type || picked.action.type,
   line: brief?.line || null,
   legalCount: picked.legal.length,
   nodes: Number.isFinite(picked.trace?.nodesUsed) ? picked.trace.nodesUsed : null,
   wall: picked.wallMs,
   reason: picked.trace?.reason || null
  });
  if (side === 'hybrid') {
   const index = laneSeen[picked.lane] || 0;
   laneSeen[picked.lane] = index + 1;
   const flags = decisionFlags(packs, cursor, actor, picked.legal, picked.action, picked.trace, {
    source: picked.source, ownTurn: null
   });
   const anomaly = flags.includes(lock.sample.anomalyExtra) && anomalyKept < lock.sample.anomalyCapPerGame;
   if (sampleLaneIndex(index, lock.sample.laneIndexes) || anomaly) {
    const stateId = decisionStateId(cursor);
    const local = {
     stateId,
     state: structuredClone(cursor),
     legal: picked.legal.map(action => structuredClone(action)),
     chosen: structuredClone(picked.action),
     actor,
     first: job.first,
     deck: job.deck,
     seed: job.seed,
     hybridSeat: job.hybridSeat,
     hybridIsFirst: job.hybridIsFirst,
     lane: picked.lane,
     pending: cursor.pending?.kind || null,
     step: steps,
     source: picked.source,
     anomaly: anomaly === true
    };
    const check = verifyLocalSnapshot(packs, local);
    if (!check.ok) snapshotFailures++;
    else {
     writeLocalSnapshot(SNAPSHOTS, local);
     const sample = {
      step: steps, lane: picked.lane, pending: local.pending, source: picked.source,
      legalCount: picked.legal.length, chosen: brief,
      nodesUsed: Number.isFinite(picked.trace?.nodesUsed) ? picked.trace.nodesUsed : null,
      searchMs: Number.isFinite(picked.trace?.ms) ? Math.round(picked.trace.ms * 10) / 10 : null,
      wallMs: Math.round(picked.wallMs * 10) / 10,
      reason: picked.trace?.reason || null,
      life: cursor.players.map(player => player.life.length),
      stateId, anomaly: anomaly === true, verified: true
     };
     const leak = publicRecordLeaks(sample);
     if (leak) throw new Error('Public sample leaked ' + leak);
     samples.push(sample);
     if (anomaly) anomalyKept++;
    }
   }
  }
  let next;
  try {
   next = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor});
  } catch (error) {
   illegal++;
   engineError = error?.message || String(error);
   break;
  }
  script.push(picked.action);
  cursor = next;
  steps++;
 }
 const replay = replayActions(packs, opened.state, script);
 const life = cursor.players.map(player => player.life.length);
 const replayLife = replay.ok ? replay.state.players.map(player => player.life.length) : null;
 const replayOk = replay.ok && replay.state.status === cursor.status && replay.state.winner === cursor.winner
  && !!replayLife && replayLife.every((value, index) => value === life[index]);
 if (!replayOk) throw new Error(`action replay diverged at ${job.deck} ${job.seed}: ${replay.error || 'result'}`);
 const finished = cursor.status === 'finished' && illegal === 0;
 const winner = finished ? cursor.winner : null;
 const draw = finished && winner !== 0 && winner !== 1;
 return {
  deck: job.deck, seed: job.seed, first: job.first,
  hybridSeat: job.hybridSeat, hybridIsFirst: job.hybridIsFirst,
  finished, winner, draw, hybridWon: finished && winner === job.hybridSeat,
  endReason: cursor.endReason || null,
  life, steps, illegal, engineError,
  hitStepCap: steps >= lock.steps && cursor.status === 'playing',
  routingErrors: problems.length,
  snapshotFailures,
  actionReplayOk: true,
  bags, samples
 };
}

function rateOf(games) {
 const wins = games.filter(game => game.hybridWon).length;
 const losses = games.filter(game => game.finished && !game.hybridWon && !game.draw).length;
 const draws = games.filter(game => game.draw).length;
 const unfinished = games.filter(game => !game.finished).length;
 return {games: games.length, wins, losses, draws, unfinished, winRate: games.length ? wins / games.length : null};
}

function bagOf(games, side) {
 return mergeBags(games.map(game => game.bags?.[side]));
}

export function summarizeSample(games, extra = {}) {
 const bySeed = new Map();
 for (const game of games) {
  const key = `${game.deck}|${game.seed}`;
  const list = bySeed.get(key) || [];
  list.push(game);
  bySeed.set(key, list);
 }
 const rates = [];
 const incomplete = [];
 for (const [key, list] of bySeed) {
  if (list.length !== 4) incomplete.push(key);
  rates.push(list.filter(game => game.hybridWon).length / 4);
 }
 const wins = games.filter(game => game.hybridWon);
 const losses = games.filter(game => game.finished && !game.hybridWon && !game.draw);
 const white = games.filter(game => game.deck === 'white-sword');
 return {
  ...extra,
  games: games.length,
  record: rateOf(games),
  byDeck: {
   'white-sword': rateOf(games.filter(game => game.deck === 'white-sword')),
   'sword-art-online-raid': rateOf(games.filter(game => game.deck === 'sword-art-online-raid')),
   'steins-gate-raid': rateOf(games.filter(game => game.deck === 'steins-gate-raid'))
  },
  hybridFirst: rateOf(games.filter(game => game.hybridIsFirst)),
  hybridSecond: rateOf(games.filter(game => !game.hybridIsFirst)),
  whiteFirst: rateOf(white.filter(game => game.hybridIsFirst)),
  whiteSecond: rateOf(white.filter(game => !game.hybridIsFirst)),
  interval: blockInterval(rates, 9010),
  incompleteBlocks: incomplete,
  illegal: games.reduce((sum, game) => sum + (game.illegal || 0), 0),
  routingErrors: games.reduce((sum, game) => sum + (game.routingErrors || 0), 0),
  snapshotFailures: games.reduce((sum, game) => sum + (game.snapshotFailures || 0), 0),
  unfinished: games.filter(game => !game.finished).length,
  hitStepCap: games.filter(game => game.hitStepCap).length,
  actionReplayFailures: games.filter(game => game.actionReplayOk !== true).length,
  overNodes: ['hybrid', 'hard'].reduce((sum, side) => sum + Object.values(bagOf(games, side)).reduce((inner, row) => inner + (row.overNodes || 0), 0), 0),
  counts: {
   hybrid: bagOf(games, 'hybrid'),
   hard: bagOf(games, 'hard'),
   hybridWin: bagOf(wins, 'hybrid'),
   hybridLoss: bagOf(losses, 'hybrid'),
   whiteFirst: bagOf(white.filter(game => game.hybridIsFirst), 'hybrid'),
   whiteSecond: bagOf(white.filter(game => !game.hybridIsFirst), 'hybrid')
  },
  sampleCount: games.reduce((sum, game) => sum + (game.samples?.length || 0), 0),
  localSnapshots: SNAPSHOTS,
  localSnapshotsCommitted: false,
  doesNotReplace: 'audit/ai-v3-hybrid-vs-hard-9050-summary.json'
 };
}

function runShard() {
 const lock = loadSampleLock();
 const jobs = assertSchedule(lock);
 const shard = Number(process.env.AI_V3_SHARD || 0);
 const shards = Number(process.env.AI_V3_SHARDS || 1);
 const mine = jobs.filter((_, index) => index % shards === shard);
 mkdirSync(OUT, {recursive: true});
 mkdirSync(SNAPSHOTS, {recursive: true});
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const games = [];
 const outFile = `${OUT}/shard-${shard}.json`;
 for (const job of mine) {
  const started = performance.now();
  const game = playGame(decks.get(job.deck), job, lock);
  game.seconds = Math.round((performance.now() - started) / 100) / 10;
  games.push(game);
  writeFileSync(outFile, JSON.stringify({shard, shards, games}));
  const mark = game.hybridWon ? 'hybrid' : game.draw ? 'draw' : game.finished ? 'hard' : 'unfinished';
  console.error('game', job.deck, job.seed, 'first', job.first, 'seat', job.hybridSeat, mark, game.life.join('-'), game.steps, game.seconds + 's');
 }
 console.error('shard', shard, 'done', games.length);
}

function readGames() {
 const files = readdirSync(OUT).filter(name => /^shard-\d+\.json$/.test(name)).sort();
 const games = files.flatMap(name => JSON.parse(readFileSync(`${OUT}/${name}`, 'utf8')).games);
 games.sort((a, b) => a.seed - b.seed || a.hybridSeat - b.hybridSeat || a.first - b.first);
 return games;
}

function mergeShards() {
 const lockText = readFileSync(LOCK_URL, 'utf8');
 const lock = JSON.parse(lockText);
 assertSchedule(lock);
 const games = readGames();
 if (games.length !== 160) throw new Error(`Refusing to summarize ${games.length} games`);
 const head = execSync('git rev-parse HEAD', {encoding: 'utf8'}).trim();
 const summary = summarizeSample(games, {
  programBase: PROGRAM_BASE,
  headSha: head,
  lockSha256: createHash('sha256').update(lockText).digest('hex'),
  policies: {hybrid: HYBRID_MAIN_POLICY, opponent: HARD_AI_POLICY},
  nodes: 48, ms: 40, steps: 1200, searchSeed: 1, experiments: 'off',
  generatedAt: new Date().toISOString()
 });
 summary.gameRows = games;
 writeFileSync(`${OUT}/merged.json`, JSON.stringify(summary));
 console.error('merged', games.length, 'wins', summary.record.wins);
}

function ask(packs, state, actor, which) {
 const started = performance.now();
 resetAiV3Report();
 resetHardAiReport();
 let action = null;
 let trace = null;
 if (which === 'v3') {
  action = chooseAiV3Action(packs, state, {actor, ...BUDGET, beam: 4, worlds: 1});
  trace = lastAiV3Trace();
 } else {
  action = chooseStrengthenedHardAction(packs, state, BUDGET);
  trace = lastHardAiTrace();
 }
 const rows = Array.isArray(trace?.candidates) ? trace.candidates : [];
 const own = rows.find(row => SAME(row.action, action));
 const score = Number.isFinite(own?.score) ? own.score : (Number.isFinite(own?.search) ? own.search : null);
 return {
  action,
  brief: publicActionBrief(packs, state, actor, action),
  score: Number.isFinite(score) ? Math.round(score * 10) / 10 : null,
  nodesUsed: Number.isFinite(trace?.nodesUsed) ? trace.nodesUsed : null,
  wallMs: Math.round((performance.now() - started) * 10) / 10,
  reason: trace?.reason || null
 };
}

function runShadow() {
 const lock = loadSampleLock();
 assertSchedule(lock);
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const files = readdirSync(SNAPSHOTS).filter(name => name.endsWith('.json'));
 const rows = [];
 for (const name of files) {
  const snap = JSON.parse(readFileSync(`${SNAPSHOTS}/${name}`, 'utf8'));
  const deck = decks.get(snap.deck);
  if (!deck) continue;
  const packs = [deck.pack, deck.pack];
  const check = verifyLocalSnapshot(packs, snap);
  if (!check.ok) continue;
  const v3 = ask(packs, snap.state, snap.actor, 'v3');
  const hard = ask(packs, snap.state, snap.actor, 'hard');
  const row = {
   shadow: true,
   notOriginal: true,
   stateId: snap.stateId,
   title: snap.deck, seed: snap.seed, first: snap.first,
   hybridSeat: snap.hybridSeat, hybridIsFirst: snap.hybridIsFirst,
   lane: snap.lane, pending: snap.pending, step: snap.step, anomaly: snap.anomaly === true,
   original: publicActionBrief(packs, snap.state, snap.actor, snap.chosen),
   originalSource: snap.source,
   v3: {...v3.brief, score: v3.score, nodesUsed: v3.nodesUsed, wallMs: v3.wallMs, reason: v3.reason},
   hard: {...hard.brief, score: hard.score, nodesUsed: hard.nodesUsed, wallMs: hard.wallMs, reason: hard.reason},
   v3Same: SAME(v3.action, snap.chosen),
   hardSame: SAME(hard.action, snap.chosen),
   agree: SAME(v3.action, hard.action)
  };
  const leak = publicRecordLeaks(row);
  if (leak) throw new Error('Shadow row leaked ' + leak);
  rows.push(row);
  if (rows.length % 25 === 0) console.error('shadow', rows.length, '/', files.length);
 }
 writeFileSync(`${OUT}/shadow.json`, JSON.stringify(rows));
 console.error('shadow rows', rows.length);
}

function continueLine(decks, snap, forced) {
 const deck = decks.get(snap.deck);
 const packs = [deck.pack, deck.pack];
 const startLife = snap.state.players.map(player => player.life.length);
 let cursor = dispatchUniversalAction(packs, structuredClone(snap.state), structuredClone(forced), {actor: snap.actor});
 for (let step = 0; step < 16 && cursor.status === 'playing'; step++) {
  const actor = cursor.pending?.player ?? cursor.active;
  const picked = chooseFor(packs, cursor, snap.hybridSeat);
  if (!picked.action) break;
  cursor = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor});
 }
 return {
  startLife,
  life: cursor.players.map(player => player.life.length),
  status: cursor.status,
  pending: cursor.pending?.kind || null,
  endReason: cursor.endReason || null
 };
}

function runCounterfactual() {
 const rows = JSON.parse(readFileSync(`${OUT}/shadow.json`, 'utf8'));
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const snaps = new Map(readdirSync(SNAPSHOTS).filter(name => name.endsWith('.json')).map(name => {
  const snap = JSON.parse(readFileSync(`${SNAPSHOTS}/${name}`, 'utf8'));
  return [snap.stateId, snap];
 }));
 const picked = [];
 for (const lane of ['battle', 'pending', 'start', 'move', 'main']) {
  const diffs = rows.filter(row => row.lane === lane && row.agree === false && row.hardSame === false);
  diffs.sort((a, b) => Math.abs((b.v3.score || 0) - (b.hard.score || 0)) - Math.abs((a.v3.score || 0) - (a.hard.score || 0)));
  picked.push(...diffs.slice(0, 2));
 }
 const out = [];
 for (const row of picked) {
  const snap = snaps.get(row.stateId);
  if (!snap) continue;
  const packs = [decks.get(snap.deck).pack, decks.get(snap.deck).pack];
  const legal = legalUniversalActions(packs, snap.state);
  const wanted = {type: row.hard.type, line: row.hard.line ?? null, mode: row.hard.mode ?? null, hidden: row.hard.hidden === true};
  const matches = legal.filter(action => {
   const brief = publicActionBrief(packs, snap.state, snap.actor, action);
   return brief?.type === wanted.type && (brief.line ?? null) === wanted.line
    && (brief.mode ?? null) === wanted.mode && brief.hidden === wanted.hidden
    && (brief.bp ?? null) === (row.hard.bp ?? null);
  });
  const forced = matches.length === 1 ? matches[0] : null;
  if (!forced || SAME(forced, snap.chosen)) {
   out.push({lane: row.lane, stateId: row.stateId, skipped: 'forced action not rematched'});
   continue;
  }
  let original;
  let alternate;
  try {
   original = continueLine(decks, snap, snap.chosen);
   alternate = continueLine(decks, snap, forced);
  } catch (error) {
   out.push({lane: row.lane, stateId: row.stateId, skipped: String(error?.message || error).slice(0, 120)});
   continue;
  }
  const own = snap.hybridSeat;
  out.push({
   label: 'counterfactual',
   notARecordedResult: true,
   lane: row.lane, title: row.title, seed: row.seed, step: row.step, stateId: row.stateId,
   forced: 'hard',
   originalLife: original.life, alternateLife: alternate.life,
   ownLifeDelta: alternate.life[own] - original.life[own],
   originalStatus: original.status, alternateStatus: alternate.status,
   window: 16
  });
 }
 writeFileSync(`${OUT}/counterfactual.json`, JSON.stringify(out));
 console.error('counterfactual', out.length);
}

function agreement(rows) {
 const by = {};
 for (const row of rows) {
  const lane = row.lane || 'other';
  const item = by[lane] || (by[lane] = {n: 0, agree: 0, v3Same: 0, hardSame: 0});
  item.n++;
  if (row.agree) item.agree++;
  if (row.v3Same) item.v3Same++;
  if (row.hardSame) item.hardSame++;
 }
 return by;
}

function pattern(rows, lane, pred) {
 const list = rows.filter(row => row.lane === lane);
 return {n: list.length, hit: list.filter(pred).length};
}

function laneDisagreement(agree, lanes) {
 let n = 0;
 let differ = 0;
 for (const lane of lanes) {
  const row = agree[lane];
  if (!row) continue;
  n += row.n;
  differ += row.n - row.agree;
 }
 return {n, rate: n ? differ / n : 0};
}

export function recommendFrom(agree, counters) {
 const specs = [
  {id: 'A', lanes: ['battle']},
  {id: 'B', lanes: ['pending']},
  {id: 'C', lanes: ['start', 'move']}
 ];
 const evaluated = specs.map(spec => {
  const rates = laneDisagreement(agree, spec.lanes);
  const each = spec.lanes.every(lane => (agree[lane]?.n || 0) >= 40);
  const windows = (counters || []).filter(row => spec.lanes.includes(row.lane) && Number.isFinite(row.ownLifeDelta));
  const up = windows.filter(row => row.ownLifeDelta > 0).length;
  const down = windows.filter(row => row.ownLifeDelta < 0).length;
  return {id: spec.id, sample: rates.n, disagreement: rates.rate, eachLaneAtLeast40: each, benefitWindows: windows.length, lifeUp: up, lifeDown: down, benefit: windows.length >= 2 && up >= 2 && down === 0};
 });
 const qualified = evaluated.filter(row => row.eachLaneAtLeast40 && row.disagreement >= 0.15 && row.benefit);
 if (qualified.length !== 1) return {selected: null, evaluated, qualified};
 return {selected: qualified[0].id, evaluated, qualified};
}

function writeReport() {
 const summary = JSON.parse(readFileSync(`${OUT}/merged.json`, 'utf8'));
 const shadow = JSON.parse(readFileSync(`${OUT}/shadow.json`, 'utf8'));
 const counters = JSON.parse(readFileSync(`${OUT}/counterfactual.json`, 'utf8'));
 const leak = publicRecordLeaks({summary: summary.record, shadow: agreement(shadow), counters});
 if (leak) throw new Error('Report leaked ' + leak);
 const picks = [
  row => row.lane === 'start' && row.original?.type === 'extraDraw' && row.hard?.type === 'next',
  row => row.lane === 'move' && row.original?.type === 'next' && row.hard?.type === 'move',
  row => row.lane === 'battle' && row.original?.type === 'attack' && row.hard?.type === 'next',
  row => row.anomaly === true && row.v3?.score === -90000 && Number.isFinite(row.hard?.bp),
  row => row.lane === 'main' && row.agree === false
 ];
 const examples = [];
 const used = new Set();
 for (const pick of picks) {
  const row = shadow.find(item => pick(item) && !used.has(item.stateId));
  if (!row) continue;
  used.add(row.stateId);
  examples.push(row);
 }
 const pass = brief => brief?.type === 'chooseBlock' && brief.bp == null;
 const blocks = shadow.filter(row => row.pending === 'block');
 const lethal = shadow.filter(row => row.anomaly === true);
 const pendingKinds = {};
 for (const row of shadow.filter(item => item.lane === 'pending')) {
  const kind = row.pending || 'none';
  const item = pendingKinds[kind] || (pendingKinds[kind] = {n: 0, disagree: 0});
  item.n++;
  if (!row.agree) item.disagree++;
 }
 const report = {
  kind: 'phase-sample-9010',
  programBase: summary.programBase,
  headSha: summary.headSha,
  lockSha256: summary.lockSha256,
  games: summary.games,
  record: summary.record,
  byDeck: summary.byDeck,
  hybridFirst: summary.hybridFirst,
  hybridSecond: summary.hybridSecond,
  whiteFirst: summary.whiteFirst,
  whiteSecond: summary.whiteSecond,
  interval: summary.interval,
  illegal: summary.illegal,
  routingErrors: summary.routingErrors,
  overNodes: summary.overNodes,
  unfinished: summary.unfinished,
  hitStepCap: summary.hitStepCap,
  actionReplayFailures: summary.actionReplayFailures,
  snapshotFailures: summary.snapshotFailures,
  incompleteBlocks: summary.incompleteBlocks,
  counts: summary.counts,
  sampleCount: summary.sampleCount,
  shadowCount: shadow.length,
  shadowAgreement: agreement(shadow),
  attackSplit: pattern(shadow, 'battle', row => (row.v3.type === 'attack') !== (row.hard.type === 'attack')),
  startSplit: pattern(shadow, 'start', row => row.v3.type !== row.hard.type),
  moveSplit: pattern(shadow, 'move', row => row.v3.type !== row.hard.type || row.v3.line !== row.hard.line || row.v3.bp !== row.hard.bp),
  pendingSplit: pattern(shadow, 'pending', row => row.agree === false),
  pendingByKind: pendingKinds,
  blockSample: {
   n: blocks.length,
   agree: blocks.filter(row => row.agree).length,
   originalPass: blocks.filter(row => pass(row.original)).length,
   v3Pass: blocks.filter(row => pass(row.v3)).length,
   hardPass: blocks.filter(row => pass(row.hard)).length,
   hardBlocksAnOriginalPass: blocks.filter(row => pass(row.original) && !pass(row.hard)).length
  },
  lethalMarks: {
   n: lethal.length,
   v3ScoreMinus90000: lethal.filter(row => row.v3?.score === -90000).length,
   hardBlocks: lethal.filter(row => Number.isFinite(row.hard?.bp)).length,
   v3Blocks: lethal.filter(row => Number.isFinite(row.v3?.bp)).length,
   note: 'The -90000 score is AI v3 terminalValue for an unfinished own-life-0 line. hard-search-2 uses its own scores and does not emit -100000 on these passes. Both policies pass most of these marks, so the shared action is not fixed by routing pending to hard. The numeric gap itself is v3.'
  },
  examples: examples.slice(0, 5),
  counterfactual: counters,
  recommendation: recommendFrom(agreement(shadow), counters),
  doesNotReplace: summary.doesNotReplace,
  localSnapshotsCommitted: false
 };
 writeFileSync(REPORT_URL, JSON.stringify(report, null, 2) + '\n');
 console.error('report', REPORT_URL.pathname, 'bytes', JSON.stringify(report).length);
}

function invokedDirectly() {
 const entry = process.argv[1];
 if (!entry) return false;
 try { return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url)); }
 catch { return false; }
}

if (invokedDirectly()) {
 if (process.env.AI_V3_MERGE === '1') mergeShards();
 else if (process.env.AI_V3_SHADOW === '1') runShadow();
 else if (process.env.AI_V3_COUNTER === '1') runCounterfactual();
 else if (process.env.AI_V3_REPORT === '1') writeReport();
 else runShard();
}
