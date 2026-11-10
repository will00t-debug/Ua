#!/usr/bin/env node
// Direct hybrid-main-v1 versus ai-v3-beam-1. Neither seat is hard-search-2.
// The seed lock is the only schedule. Legal actions are read again before
// every dispatch. This file does not change search, scores, cards, or rules.
//
//   node scripts/ai-v3-hybrid-vs-v3.mjs
//   AI_V3_SHARD=0 AI_V3_SHARDS=4 node scripts/ai-v3-hybrid-vs-v3.mjs
//   AI_V3_MERGE=1 node scripts/ai-v3-hybrid-vs-v3.mjs
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {legalUniversalActions, dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {chooseHybridMainAction, hybridLane, hybridSource, lastHybridRoute, HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';

export const PROGRAM_SHA = '494f6a9e1dbfdbe226ffae07381e8ceba997e65c';
const LOCK_URL = new URL('../audit/ai-v3-hybrid-vs-v3-8800-seed-lock.json', import.meta.url);
const SUMMARY_URL = new URL('../audit/ai-v3-hybrid-vs-v3-8800-summary.json', import.meta.url);
const OUT = process.env.AI_V3_OUT || '/tmp/ai-v3-hybrid-vs-v3-8800';
const STEPS = Number(process.env.AI_V3_STEPS || 400);
const BUDGET = {nodes: 48, ms: 40, seed: 1};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function loadLock() {
 return JSON.parse(readFileSync(LOCK_URL, 'utf8'));
}

export function jobsFromLock(lock = loadLock()) {
 const jobs = [];
 for (const deck of lock.decks) {
  if (deck.seeds.length * lock.cells.length !== deck.games) {
   throw new Error(`${deck.id} does not make ${deck.games} games`);
  }
  for (const seed of deck.seeds) {
   for (const cell of lock.cells) {
    jobs.push({
     deck: deck.id,
     seed,
     first: cell.first,
     hybridSeat: cell.hybridSeat,
     hybridIsFirst: cell.hybridIsFirst
    });
   }
  }
 }
 return jobs;
}

export function mulberry32(seed) {
 let a = seed >>> 0;
 return () => {
  a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
 };
}

export function winRateInterval(rates, rng = mulberry32(8800)) {
 const clean = rates.filter(value => Number.isFinite(value));
 if (!clean.length) return {n: 0, mean: null, low: null, high: null, containsHalf: null};
 const point = clean.reduce((sum, value) => sum + value, 0) / clean.length;
 const boots = [];
 for (let i = 0; i < 1000; i++) {
  let sum = 0;
  for (let j = 0; j < clean.length; j++) sum += clean[Math.floor(rng() * clean.length)];
  boots.push(sum / clean.length);
 }
 boots.sort((a, b) => a - b);
 const low = boots[25];
 const high = boots[974];
 return {
  n: clean.length,
  mean: point,
  low,
  high,
  containsHalf: low <= 0.5 && high >= 0.5
 };
}

function percentile(values, index) {
 const sorted = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
 if (!sorted.length) return null;
 return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}

function mean(values) {
 const finite = values.filter(value => Number.isFinite(value));
 return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function readyAp(player) {
 return (player?.apCards || []).filter(card => card && card.inPlay && card.ready).length;
}

function label(action) {
 if (!action) return 'none';
 return `${action.type}:${action.line || ''}:${action.uid || action.mode || ''}`;
}

function killLines(source, trace, legal) {
 if (source === 'v3') {
  const rows = trace?.candidates?.length ? trace.candidates : (trace?.compared || []);
  return rows.filter(row => row?.executed !== false && row.boundary === 'terminal' && row.search >= 90000
   && legal.some(action => same(action, row.action)));
 }
 return (trace?.candidates || []).filter(row => row?.score >= 50000
  && legal.some(action => same(action, row.action)));
}

function blankSide() {
 return {
  attacks: 0, connecting: 0, raids: 0, frontPlays: 0, energyPlays: 0,
  apReady: 0, apLeft: 0, apUsed: 0, turns: 0,
  fallbacks: 0, hardBudget: 0, deferred: 0,
  v3Decisions: 0, hardDecisions: 0,
  laneSources: {}, times: [], maxNodes: 0, overNodes: 0,
  abandonedKills: 0, equivalentWins: 0, killNotes: [], phaseErrors: 0
 };
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
   || route.nodes !== 48 || route.ms !== 40 || route.actor !== actor) {
   problems.push('hybrid-route');
  }
 } else {
  resetAiV3Report();
  raw = chooseAiV3Action(packs, state, {actor, nodes: 48, ms: 40, seed: 1, worlds: 1});
  trace = lastAiV3Trace();
  policy = trace?.policy || null;
  source = 'v3';
  if (policy !== AI_V3_POLICY) problems.push('v3-policy');
 }
 const elapsed = performance.now() - started;
 const action = legal.find(item => same(item, raw)) || null;
 return {actor, lane, source, policy, action, legalCount: legal.length, elapsed, trace, problems, legal};
}

function playGame(deck, job) {
 const packs = [deck.pack, deck.pack];
 const opened = applySharedOpening(packs, newComparedMatch(
  packs, [deck.counts, deck.counts], job.seed, job.first));
 let cursor = cloneMatch(opened.state);
 const hybrid = blankSide();
 const v3 = blankSide();
 const sides = [null, null];
 sides[job.hybridSeat] = hybrid;
 sides[1 - job.hybridSeat] = v3;
 const open = [null, null];
 const watch = [null, null];
 const exceptions = [];
 let illegal = 0;
 let steps = 0;
 while (cursor.status === 'playing' && steps < STEPS) {
  const actor = cursor.pending?.player ?? cursor.active;
  const side = sides[actor];
  if (cursor.phase === 'start' && !cursor.pending && !open[actor]) {
   open[actor] = {apReady: readyAp(cursor.players[actor])};
  }
  let picked;
  try {
   picked = chooseFor(packs, cursor, job.hybridSeat);
  } catch (error) {
   exceptions.push({step: steps, message: error?.message || String(error)});
   illegal++;
   break;
  }
  side.times.push(picked.elapsed);
  if (picked.source === 'hard') side.hardDecisions++;
  else side.v3Decisions++;
  const bag = side.laneSources[picked.lane] || {v3: 0, hard: 0};
  bag[picked.source] = (bag[picked.source] || 0) + 1;
  side.laneSources[picked.lane] = bag;
  if (picked.problems.length) side.phaseErrors += picked.problems.length;
  const nodes = Number.isFinite(picked.trace?.nodesUsed) ? picked.trace.nodesUsed : null;
  if (nodes != null) {
   side.maxNodes = Math.max(side.maxNodes, nodes);
   if (nodes > 48) side.overNodes++;
  }
  if (picked.trace?.reason === 'budget-fallback' || picked.trace?.fallback) side.fallbacks++;
  if (picked.source === 'hard' && picked.trace?.reason === 'budget') side.hardBudget++;
  if (picked.trace?.reason === 'deferred-baseline' || picked.trace?.reason === 'deferred') side.deferred++;
  const wins = killLines(picked.source, picked.trace, picked.legal);
  const taken = !!(picked.action && wins.some(row => same(row.action, picked.action)));
  if (wins.length > 1 && taken) side.equivalentWins++;
  if (wins.length > 0 && !taken) {
   side.abandonedKills++;
   if (side.killNotes.length < 6) {
    side.killNotes.push({step: steps, lane: picked.lane, source: picked.source, wins: wins.length, chosen: label(picked.action)});
   }
  }
  if (!picked.action) {
   illegal++;
   exceptions.push({step: steps, message: 'chosen action is not in the fresh legal list', legal: picked.legalCount});
   break;
  }
  if (picked.action.type === 'play' && picked.action.line === 'front') side.frontPlays++;
  if (picked.action.type === 'play' && picked.action.line === 'energy') side.energyPlays++;
  if (picked.action.type === 'raid') {
   side.raids++;
   if (open[actor]) open[actor].raids = (open[actor].raids || 0) + 1;
  }
  const opp = 1 - actor;
  if (picked.action.type === 'attack') {
   side.attacks++;
   watch[actor] = cursor.players[opp].life.length;
   if (open[actor]) open[actor].attacks = (open[actor].attacks || 0) + 1;
  }
  try {
   cursor = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor});
  } catch (error) {
   exceptions.push({step: steps, message: error?.message || String(error)});
   illegal++;
   break;
  }
  if (watch[actor] != null && cursor.players[opp].life.length < watch[actor]) {
   side.connecting++;
   watch[actor] = null;
  }
  const after = cursor.status === 'playing' ? (cursor.pending?.player ?? cursor.active) : null;
  if (open[actor] && (after !== actor || cursor.status !== 'playing')) {
   const left = readyAp(cursor.players[actor]);
   side.apReady += open[actor].apReady;
   side.apLeft += left;
   side.apUsed += Math.max(0, open[actor].apReady - left);
   side.turns++;
   open[actor] = null;
   watch[actor] = null;
  }
  steps++;
 }
 for (const seat of [0, 1]) {
  if (!open[seat]) continue;
  const left = readyAp(cursor.players[seat]);
  sides[seat].apReady += open[seat].apReady;
  sides[seat].apLeft += left;
  sides[seat].apUsed += Math.max(0, open[seat].apReady - left);
  sides[seat].turns++;
 }
 const finished = cursor.status === 'finished' && illegal === 0 && !exceptions.length;
 const winner = finished ? cursor.winner : null;
 const draw = finished && winner !== 0 && winner !== 1;
 return {
  deck: job.deck, seed: job.seed, first: job.first,
  hybridSeat: job.hybridSeat, hybridIsFirst: job.hybridIsFirst,
  opening: opened.choices,
  finished, winner, draw,
  hybridWon: finished && winner === job.hybridSeat,
  v3Won: finished && winner === 1 - job.hybridSeat,
  endReason: cursor.endReason || null,
  life: cursor.players.map(player => player.life.length),
  steps, illegal, exceptions, hitStepCap: steps >= STEPS && cursor.status === 'playing',
  hybrid: packSide(hybrid),
  v3: packSide(v3)
 };
}

function packSide(side) {
 const times = side.times;
 return {
  attacks: side.attacks, connecting: side.connecting, raids: side.raids,
  frontPlays: side.frontPlays, energyPlays: side.energyPlays,
  apReady: side.apReady, apLeft: side.apLeft, apUsed: side.apUsed, turns: side.turns,
  fallbacks: side.fallbacks, hardBudget: side.hardBudget, deferred: side.deferred,
  v3Decisions: side.v3Decisions, hardDecisions: side.hardDecisions,
  laneSources: side.laneSources,
  maxNodes: side.maxNodes, overNodes: side.overNodes,
  abandonedKills: side.abandonedKills, equivalentWins: side.equivalentWins,
  killNotes: side.killNotes, phaseErrors: side.phaseErrors,
  decisionMs: {
   count: times.length,
   p50: percentile(times, Math.floor((times.length - 1) / 2)),
   p95: percentile(times, Math.floor((times.length - 1) * 0.95)),
   samples: times.map(value => Math.round(value * 10) / 10)
  }
 };
}

function assertSchedule(lock) {
 if (lock.programSha !== PROGRAM_SHA) throw new Error('Lock program SHA moved');
 if (lock.namedBeforeResults !== true) throw new Error('Lock was not named before results');
 if (lock.policies.hybrid !== HYBRID_MAIN_POLICY || lock.policies.opponent !== AI_V3_POLICY) {
  throw new Error('Lock policies are not hybrid versus v3');
 }
 if (lock.nodes !== 48 || lock.ms !== 40 || lock.searchSeed !== 1) throw new Error('Lock budget moved');
 const jobs = jobsFromLock(lock);
 if (jobs.length !== 200) throw new Error(`Expected 200 games, got ${jobs.length}`);
 const seeds = new Set(jobs.map(job => job.seed));
 if (seeds.size !== 50 || Math.min(...seeds) !== 8800 || Math.max(...seeds) !== 8849) {
  throw new Error('Seed set is not 8800–8849');
 }
 const banned = new Set([8600, 8601, 8602, 8700, 8701, 8702]);
 if ([...seeds].some(seed => banned.has(seed) || seed >= 9100)) throw new Error('A reserved seed was scheduled');
 const count = (pred) => jobs.filter(pred).length;
 if (count(job => job.hybridIsFirst) !== 100 || count(job => !job.hybridIsFirst) !== 100) {
  throw new Error('First player is not 100 and 100');
 }
 if (count(job => job.hybridSeat === 0) !== 100 || count(job => job.hybridSeat === 1) !== 100) {
  throw new Error('Seats are not 100 and 100');
 }
 const byDeck = {};
 for (const job of jobs) byDeck[job.deck] = (byDeck[job.deck] || 0) + 1;
 if (byDeck['white-sword'] !== 68 || byDeck['sword-art-online-raid'] !== 68 || byDeck['steins-gate-raid'] !== 64) {
  throw new Error('Deck counts are not 68, 68 and 64');
 }
 const changed = execSync(
  `git diff --name-only ${PROGRAM_SHA} -- dist/universal-v2/ai-v3 dist/universal-v2/hard-ai.mjs dist/universal-v2/engine.mjs dist/universal-v2/ai.mjs`,
  {encoding: 'utf8'}
 ).trim();
 if (changed) throw new Error('AI code differs from the locked SHA: ' + changed);
 const decks = battleDecks();
 for (const id of Object.keys(byDeck)) {
  const found = decks.find(deck => deck.id === id);
  const cards = found ? Object.values(found.counts).reduce((sum, n) => sum + n, 0) : 0;
  if (!found || cards !== 50) throw new Error('Missing 50-card deck ' + id);
 }
 return jobs;
}

function sideLevel(games, key) {
 const rows = games.map(game => game[key]);
 const samples = rows.flatMap(row => row.decisionMs?.samples || []);
 return {
  attacks: mean(rows.map(row => row.attacks)),
  connecting: mean(rows.map(row => row.connecting)),
  raids: mean(rows.map(row => row.raids)),
  frontPlays: mean(rows.map(row => row.frontPlays)),
  energyPlays: mean(rows.map(row => row.energyPlays)),
  ownLife: mean(games.map(game => game.life?.[key === 'hybrid' ? game.hybridSeat : 1 - game.hybridSeat])),
  oppLife: mean(games.map(game => game.life?.[key === 'hybrid' ? 1 - game.hybridSeat : game.hybridSeat])),
  apLeft: mean(rows.map(row => row.apLeft)),
  apUsed: mean(rows.map(row => row.apUsed)),
  apReady: mean(rows.map(row => row.apReady)),
  turns: mean(rows.map(row => row.turns)),
  attacksPerTurn: mean(rows.map(row => row.turns ? row.attacks / row.turns : 0)),
  raidsPerTurn: mean(rows.map(row => row.turns ? row.raids / row.turns : 0)),
  frontPerTurn: mean(rows.map(row => row.turns ? row.frontPlays / row.turns : 0)),
  energyPerTurn: mean(rows.map(row => row.turns ? row.energyPlays / row.turns : 0)),
  fallbacks: mean(rows.map(row => row.fallbacks)),
  hardBudget: rows.reduce((sum, row) => sum + row.hardBudget, 0),
  fallbackTotal: rows.reduce((sum, row) => sum + row.fallbacks, 0),
  deferred: rows.reduce((sum, row) => sum + row.deferred, 0),
  overNodes: rows.reduce((sum, row) => sum + row.overNodes, 0),
  abandonedKills: rows.reduce((sum, row) => sum + row.abandonedKills, 0),
  equivalentWins: rows.reduce((sum, row) => sum + row.equivalentWins, 0),
  phaseErrors: rows.reduce((sum, row) => sum + row.phaseErrors, 0),
  maxNodes: rows.reduce((max, row) => Math.max(max, row.maxNodes || 0), 0),
  decisionP50: mean(rows.map(row => row.decisionMs?.p50)),
  decisionP95: mean(rows.map(row => row.decisionMs?.p95)),
  decisionPooledP50: percentile(samples, Math.floor((samples.length - 1) / 2)),
  decisionPooledP95: percentile(samples, Math.floor((samples.length - 1) * 0.95)),
  decisions: rows.reduce((sum, row) => sum + (row.v3Decisions || 0) + (row.hardDecisions || 0), 0),
  laneSources: rows.reduce((out, row) => {
   for (const [lane, bag] of Object.entries(row.laneSources || {})) {
    const slot = out[lane] || {v3: 0, hard: 0};
    slot.v3 += bag.v3 || 0;
    slot.hard += bag.hard || 0;
    out[lane] = slot;
   }
   return out;
  }, {})
 };
}

function rateOf(games) {
 const wins = games.filter(game => game.hybridWon).length;
 const losses = games.filter(game => game.v3Won).length;
 const draws = games.filter(game => game.draw).length;
 const unfinished = games.filter(game => !game.finished).length;
 return {
  games: games.length, wins, losses, draws, unfinished,
  winRate: games.length ? wins / games.length : null
 };
}

export function summarize(games, extra = {}) {
 const bySeed = new Map();
 for (const game of games) {
  const key = `${game.deck}|${game.seed}`;
  const list = bySeed.get(key) || [];
  list.push(game);
  bySeed.set(key, list);
 }
 const blockRates = [];
 const incompleteBlocks = [];
 for (const [key, list] of bySeed) {
  if (list.length !== 4 || list.some(game => !game.finished || game.illegal || game.exceptions?.length)) {
   incompleteBlocks.push(key);
   continue;
  }
  blockRates.push(list.filter(game => game.hybridWon).length / 4);
 }
 const played = games.filter(game => game.finished);
 const interval = winRateInterval(blockRates);
 const deckRates = {};
 for (const id of ['white-sword', 'sword-art-online-raid', 'steins-gate-raid']) {
  deckRates[id] = rateOf(games.filter(game => game.deck === id));
 }
 return {
  ...extra,
  games: games.length,
  record: rateOf(games),
  byDeck: deckRates,
  hybridFirst: rateOf(games.filter(game => game.hybridIsFirst)),
  hybridSecond: rateOf(games.filter(game => !game.hybridIsFirst)),
  seat0: rateOf(games.filter(game => game.hybridSeat === 0)),
  seat1: rateOf(games.filter(game => game.hybridSeat === 1)),
  interval,
  incompleteBlocks,
  containsHalf: interval.containsHalf,
  strongerThanV3: interval.n === 50 && interval.containsHalf === false && interval.mean > 0.5,
  hybrid: sideLevel(played, 'hybrid'),
  v3: sideLevel(played, 'v3'),
  illegal: games.reduce((sum, game) => sum + (game.illegal || 0), 0),
  unfinished: games.filter(game => !game.finished).length,
  exceptions: games.flatMap(game => (game.exceptions || []).map(item => ({
   deck: game.deck, seed: game.seed, first: game.first, seat: game.hybridSeat, ...item
  }))),
  abandonedNotes: games.flatMap(game => (game.hybrid.killNotes || []).map(note => ({
   deck: game.deck, seed: game.seed, first: game.first, seat: game.hybridSeat, ...note
  }))).slice(0, 40)
 };
}

function publicGame(game) {
 const copy = JSON.parse(JSON.stringify(game));
 delete copy.hybrid.decisionMs.samples;
 delete copy.v3.decisionMs.samples;
 return copy;
}

function runShard() {
 const lock = loadLock();
 const jobs = assertSchedule(lock);
 const shard = Number(process.env.AI_V3_SHARD || 0);
 const shards = Number(process.env.AI_V3_SHARDS || 1);
 let mine = jobs.filter((_, index) => index % shards === shard);
 if (process.env.AI_V3_ONLY) {
  const [deck, seed, first, seat] = process.env.AI_V3_ONLY.split(':');
  mine = mine.filter(job => job.deck === deck && job.seed === Number(seed)
   && job.first === Number(first) && job.hybridSeat === Number(seat));
 }
 const outFile = process.env.AI_V3_ONLY ? `${OUT}/replay.json` : `${OUT}/shard-${shard}.json`;
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 mkdirSync(OUT, {recursive: true});
 const games = [];
 for (const job of mine) {
  const started = performance.now();
  const game = playGame(decks.get(job.deck), job);
  game.seconds = Math.round((performance.now() - started) / 100) / 10;
  games.push(game);
  writeFileSync(outFile, JSON.stringify({shard, shards, games}));
  const mark = game.hybridWon ? 'hybrid' : game.v3Won ? 'v3' : game.draw ? 'draw' : 'unfinished';
  console.error('game', job.deck, job.seed, 'first', job.first, 'seat', job.hybridSeat,
   mark, game.life.join('-'), game.steps, game.seconds + 's');
 }
 console.error('shard', shard, 'done', games.length);
}

function mergeShards() {
 const lockText = readFileSync(LOCK_URL, 'utf8');
 const files = readdirSync(OUT).filter(name => /^shard-\d+\.json$/.test(name)).sort();
 const games = files.flatMap(name => JSON.parse(readFileSync(`${OUT}/${name}`, 'utf8')).games);
 games.sort((a, b) => a.seed - b.seed || a.hybridSeat - b.hybridSeat || a.first - b.first);
 const head = execSync('git rev-parse HEAD', {encoding: 'utf8'}).trim();
 const summary = summarize(games, {
  programSha: PROGRAM_SHA,
  headSha: head,
  lockSha256: createHash('sha256').update(lockText).digest('hex'),
  policies: {hybrid: HYBRID_MAIN_POLICY, opponent: AI_V3_POLICY},
  nodes: 48,
  ms: 40,
  searchSeed: 1,
  generatedAt: new Date().toISOString()
 });
 summary.gameRows = games.map(publicGame);
 writeFileSync(SUMMARY_URL, JSON.stringify(summary, null, 2) + '\n');
 console.error('merged', games.length, 'wins', summary.record.wins, 'interval',
  summary.interval.low, summary.interval.high, 'containsHalf', summary.containsHalf);
}

function invokedDirectly() {
 const entry = process.argv[1];
 if (!entry) return false;
 return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
}

if (invokedDirectly()) {
 if (process.env.AI_V3_MERGE === '1') mergeShards();
 else runShard();
}
