#!/usr/bin/env node
// hybrid-main-v1 versus frozen hard-search-2. The seed lock is the schedule.
// Diagnosis is recorded after each timed choice. Full states stay in
// AI_V3_DIAG_DIR and are not written to the summary.
//
//   node scripts/ai-v3-hybrid-vs-hard.mjs
//   AI_V3_SHARD=0 AI_V3_SHARDS=4 node scripts/ai-v3-hybrid-vs-hard.mjs
//   AI_V3_MERGE=1 node scripts/ai-v3-hybrid-vs-hard.mjs
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseHybridMainAction, hybridLane, hybridSource, lastHybridRoute, HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {dispatchUniversalAction, legalUniversalActions, universalBp} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction, lastHardAiTrace, HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {captureDecision, decisionFlags, replayActions, verifyLocalSnapshot, writeLocalSnapshot} from './ai-v3-decision-log.mjs';

export const PROGRAM_BASE = 'c9253ccc27903601f13343d0e984d27f7c98029f';
const LOCK_URL = new URL('../audit/ai-v3-hybrid-vs-hard-9050-seed-lock.json', import.meta.url);
const SUMMARY_URL = new URL('../audit/ai-v3-hybrid-vs-hard-9050-summary.json', import.meta.url);
const OUT = process.env.AI_V3_OUT || '/tmp/ai-v3-hybrid-vs-hard-9050';
const SNAPSHOTS = process.env.AI_V3_DIAG_DIR || `${OUT}/snapshots`;
const STEPS = Number(process.env.AI_V3_STEPS || 1200);
const BUDGET = {nodes: 48, ms: 40, seed: 1};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SNAPSHOT_RANK = ['defender-lethal', 'abandoned-kill', 'thin-front-high-bp-energy', 'early-raid-other', 'extra-draw', 'equivalent-wins', 'proven-kill'];

export function loadHardLock() {
 return JSON.parse(readFileSync(LOCK_URL, 'utf8'));
}

export function jobsFromLock(lock = loadHardLock()) {
 const jobs = [];
 for (const deck of lock.decks) {
  if (deck.seeds.length * lock.cells.length !== deck.games) throw new Error(`${deck.id} does not make ${deck.games} games`);
  for (const seed of deck.seeds) {
   for (const cell of lock.cells) {
    jobs.push({deck: deck.id, seed, first: cell.first, hybridSeat: cell.hybridSeat, hybridIsFirst: cell.hybridIsFirst});
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

export function blockInterval(rates, seed = 9050) {
 const rng = mulberry32(seed);
 const clean = rates.filter(value => Number.isFinite(value));
 if (!clean.length) return {n: 0, mean: null, low: null, high: null};
 const point = clean.reduce((sum, value) => sum + value, 0) / clean.length;
 const boots = [];
 for (let i = 0; i < 1000; i++) {
  let sum = 0;
  for (let j = 0; j < clean.length; j++) sum += clean[Math.floor(rng() * clean.length)];
  boots.push(sum / clean.length);
 }
 boots.sort((a, b) => a - b);
 return {n: clean.length, mean: point, low: boots[25], high: boots[974]};
}

export function frozenDistDiff() {
 return execSync(
  `git diff --name-only ${PROGRAM_BASE} -- dist/universal-v2/ai-v3 dist/universal-v2/hard-ai.mjs dist/universal-v2/engine.mjs dist/universal-v2/ai.mjs`,
  {encoding: 'utf8'}
 ).trim();
}

function percentile(values, p) {
 const sorted = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
 if (!sorted.length) return null;
 const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
 return Math.round(sorted[index] * 10) / 10;
}

function liveBp(packs, state, card) {
 try {
  const value = universalBp(packs, state, card);
  return Number.isFinite(value) ? value : 0;
 } catch {
  return 0;
 }
}

function frontStats(packs, state, seat) {
 const values = (state.players[seat].front || []).filter(Boolean).map(card => liveBp(packs, state, card));
 return {
  count: values.length,
  max: values.reduce((max, value) => Math.max(max, value), 0),
  n4000: values.filter(value => value >= 4000).length
 };
}

function readyAp(player) {
 return (player?.apCards || []).filter(card => card && card.ready).length;
}

function blankClock() {
 return {wall: [], nodes: 0, overNodes: 0, over40: 0, over80: 0, maxNodes: 0, deferred: 0, forced: 0};
}

function noteClock(clock, trace, wallMs) {
 clock.wall.push(wallMs);
 const nodes = Number.isFinite(trace?.nodesUsed) ? trace.nodesUsed : null;
 if (nodes != null) {
  clock.nodes++;
  clock.maxNodes = Math.max(clock.maxNodes, nodes);
  if (nodes > 48) clock.overNodes++;
 }
 if (wallMs > 40) clock.over40++;
 if (wallMs > 80) clock.over80++;
 if (trace?.reason === 'forced') clock.forced++;
 if (trace?.reason === 'deferred' || trace?.reason === 'deferred-baseline') clock.deferred++;
}

function packClock(clock) {
 return {
  decisions: clock.wall.length,
  nodeChecked: clock.nodes,
  overNodes: clock.overNodes,
  maxNodes: clock.maxNodes,
  over40: clock.over40,
  over80: clock.over80,
  deferred: clock.deferred,
  forced: clock.forced,
  p50: percentile(clock.wall, 0.5),
  p95: percentile(clock.wall, 0.95),
  maxMs: percentile(clock.wall, 1)
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
   || route.nodes !== 48 || route.ms !== 40 || route.actor !== actor) problems.push('hybrid-route');
  if (source === 'v3' && Object.values(trace?.factors || {}).some(value => value === true)) problems.push('experiment');
 } else {
  raw = chooseStrengthenedHardAction(packs, state, BUDGET);
  trace = lastHardAiTrace();
  policy = trace?.policy || null;
  source = 'hard';
  if (policy !== HARD_AI_POLICY) problems.push('hard-policy');
  if (Number.isFinite(trace?.nodesBudget) && trace.nodesBudget !== 48) problems.push('hard-budget');
 }
 const wallMs = performance.now() - started;
 const action = legal.find(item => same(item, raw)) || null;
 return {actor, lane, source, policy, action, legal, trace, wallMs, problems};
}

function snapshotRank(flags) {
 let best = SNAPSHOT_RANK.length;
 for (const flag of flags) {
  const rank = SNAPSHOT_RANK.indexOf(flag);
  if (rank >= 0 && rank < best) best = rank;
 }
 return best;
}

function playGame(deck, job) {
 const packs = [deck.pack, deck.pack];
 const opened = applySharedOpening(packs, newComparedMatch(
  packs, [deck.counts, deck.counts], job.seed, job.first));
 let cursor = cloneMatch(opened.state);
 const script = [];
 const clocks = {hybrid: blankClock(), hard: blankClock()};
 const flags = {};
 const turns = [];
 const kept = [];
 const problems = [];
 let illegal = 0;
 let steps = 0;
 let engineError = null;
 const ownTurns = [0, 0];
 const turnOpen = [null, null];
 let firstAttack = null;
 let firstRaid = null;
 let firstConnect = null;
 let turn4 = null;

 function bump(flag) {
  flags[flag] = (flags[flag] || 0) + 1;
 }
 function openTurn(actor) {
  if (turnOpen[actor] || cursor.pending || cursor.phase !== 'start') return;
  ownTurns[actor]++;
  turnOpen[actor] = {
   ownTurn: ownTurns[actor],
   apReady: readyAp(cursor.players[actor]),
   attacks: 0, raids: 0, energyPlays: 0, frontPlays: 0, extraDraw: false
  };
 }
 function closeTurn(actor, now) {
  const turn = turnOpen[actor];
  if (!turn || actor !== job.hybridSeat) {
   turnOpen[actor] = null;
   return;
  }
  const front = frontStats(packs, now, actor);
  const row = {
   ownTurn: turn.ownTurn,
   apReady: turn.apReady,
   apLeft: readyAp(now.players[actor]),
   frontMax: front.max,
   front4000: front.n4000,
   attacks: turn.attacks,
   raids: turn.raids,
   energyPlays: turn.energyPlays,
   frontPlays: turn.frontPlays,
   extraDraw: turn.extraDraw,
   life: now.players[actor].life.length,
   oppLife: now.players[1 - actor].life.length
  };
  turns.push(row);
  if (turn.ownTurn === 4) turn4 = {max: front.max, n4000: front.n4000};
  turnOpen[actor] = null;
 }

 while (cursor.status === 'playing' && steps < STEPS) {
  const actor = cursor.pending?.player ?? cursor.active;
  openTurn(actor);
  let picked;
  try {
   picked = chooseFor(packs, cursor, job.hybridSeat);
  } catch (error) {
   illegal++;
   engineError = error?.message || String(error);
   break;
  }
  const side = actor === job.hybridSeat ? 'hybrid' : 'hard';
  noteClock(clocks[side], picked.trace, picked.wallMs);
  if (picked.problems.length) problems.push({step: steps, side, problems: picked.problems});
  if (!picked.action) {
   illegal++;
   engineError = 'chosen action is not in the fresh legal list';
   break;
  }
  const beforeLife = cursor.players.map(player => player.life.length);
  const ownTurn = ownTurns[actor];
  let next;
  try {
   next = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor});
  } catch (error) {
   illegal++;
   engineError = error?.message || String(error);
   break;
  }
  if (actor === job.hybridSeat) {
   const flagsNow = decisionFlags(packs, cursor, actor, picked.legal, picked.action, picked.trace, {
    source: picked.source, ownTurn
   });
   for (const flag of flagsNow) bump(flag);
   const rank = snapshotRank(flagsNow);
   const room = kept.length < 8 || rank < kept[kept.length - 1].rank;
   if (rank < SNAPSHOT_RANK.length && room) {
    const full = captureDecision({
     packs, before: cursor, after: next, actor, first: job.first,
     legal: picked.legal, chosen: picked.action,
     policy: picked.policy, source: picked.source, lane: picked.lane, trace: picked.trace,
     wallMs: picked.wallMs, nodesBudget: 48, msBudget: 40, step: steps, ownTurn,
     keepState: true, withId: true
    });
    const check = verifyLocalSnapshot(packs, full.local);
    if (!check.ok) throw new Error(`snapshot diverged at ${job.deck} ${job.seed} step ${steps}`);
    full.public.verified = true;
    kept.push({rank, public: full.public, local: full.local});
    kept.sort((a, b) => a.rank - b.rank || a.public.step - b.public.step);
    if (kept.length > 8) kept.pop();
   }
   const turn = turnOpen[actor];
   if (turn) {
    if (picked.action.type === 'attack') {
     turn.attacks++;
     if (firstAttack == null) firstAttack = ownTurn;
    }
    if (picked.action.type === 'raid') {
     turn.raids++;
     if (firstRaid == null) firstRaid = ownTurn;
    }
    if (picked.action.type === 'play' && picked.action.line === 'energy') turn.energyPlays++;
    if (picked.action.type === 'play' && picked.action.line === 'front') turn.frontPlays++;
    if (picked.action.type === 'extraDraw') turn.extraDraw = true;
   }
   if (next.players[1 - actor].life.length < beforeLife[1 - actor] && firstConnect == null) firstConnect = ownTurn;
  }
  script.push(picked.action);
  const ended = next.status !== 'playing' || (next.pending?.player ?? next.active) !== actor;
  cursor = next;
  if (ended) closeTurn(actor, cursor);
  steps++;
 }
 for (const seat of [0, 1]) if (turnOpen[seat]) closeTurn(seat, cursor);
 const replay = replayActions(packs, opened.state, script);
 const life = cursor.players.map(player => player.life.length);
 const replayLife = replay.ok ? replay.state.players.map(player => player.life.length) : null;
 const replayOk = replay.ok && replay.state.status === cursor.status && replay.state.winner === cursor.winner
  && !!replayLife && replayLife.every((value, index) => value === life[index]);
 if (!replayOk) throw new Error(`action replay diverged at ${job.deck} ${job.seed}: ${replay.error || 'result'}`);
 const finished = cursor.status === 'finished' && illegal === 0;
 const winner = finished ? cursor.winner : null;
 const draw = finished && winner !== 0 && winner !== 1;
 const hybridWon = finished && winner === job.hybridSeat;
 const keepKeys = !hybridWon;
 if (keepKeys) {
  for (const row of kept) writeLocalSnapshot(SNAPSHOTS, row.local);
 }
 return {
  deck: job.deck, seed: job.seed, first: job.first,
  hybridSeat: job.hybridSeat, hybridIsFirst: job.hybridIsFirst,
  opening: opened.choices,
  finished, winner, draw, hybridWon,
  endReason: cursor.endReason || null,
  life, steps, illegal, engineError,
  hitStepCap: steps >= STEPS && cursor.status === 'playing',
  routingErrors: problems.length,
  routingNotes: problems.slice(0, 6),
  actionReplayOk: true,
  flags,
  turns,
  turn4,
  firstAttack, firstRaid, firstConnect,
  keyDecisions: keepKeys ? kept.map(row => row.public) : [],
  clock: {hybrid: packClock(clocks.hybrid), hard: packClock(clocks.hard)}
 };
}

function rateOf(games) {
 const wins = games.filter(game => game.hybridWon).length;
 const losses = games.filter(game => game.finished && !game.hybridWon && !game.draw).length;
 const draws = games.filter(game => game.draw).length;
 const unfinished = games.filter(game => !game.finished).length;
 return {games: games.length, wins, losses, draws, unfinished, winRate: games.length ? wins / games.length : null};
}

function sumFlags(games) {
 const out = {};
 for (const game of games) {
  for (const [flag, count] of Object.entries(game.flags || {})) out[flag] = (out[flag] || 0) + count;
 }
 return out;
}

function clockRollup(games, side) {
 const rows = games.map(game => game.clock?.[side]).filter(Boolean);
 const decisions = rows.reduce((sum, row) => sum + row.decisions, 0);
 return {
  decisions,
  overNodes: rows.reduce((sum, row) => sum + row.overNodes, 0),
  maxNodes: rows.reduce((max, row) => Math.max(max, row.maxNodes || 0), 0),
  over40: rows.reduce((sum, row) => sum + row.over40, 0),
  over80: rows.reduce((sum, row) => sum + row.over80, 0),
  deferred: rows.reduce((sum, row) => sum + row.deferred, 0),
  forced: rows.reduce((sum, row) => sum + row.forced, 0),
  p50: percentile(rows.map(row => row.p50), 0.5),
  p95: percentile(rows.map(row => row.p95), 0.5),
  note: 'p50 and p95 are medians of the per-game percentiles. over40 counts decisions whose wall time passed the soft 40 ms deadline. Node compliance is overNodes and maxNodes.'
 };
}

function mean(values) {
 const finite = values.filter(value => Number.isFinite(value));
 return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

export function pickExamples(games) {
 const losses = games.filter(game => game.finished && game.hybridWon === false);
 const examples = [];
 const used = new Set();
 for (const kind of SNAPSHOT_RANK) {
  for (const game of losses) {
   const decision = (game.keyDecisions || []).find(row => row.verified && row.flags.includes(kind));
   if (!decision) continue;
   const id = `${game.deck}|${game.seed}|${game.first}|${game.hybridSeat}|${decision.step}`;
   if (used.has(id)) continue;
   used.add(id);
   examples.push({
    kind, deck: game.deck, seed: game.seed, first: game.first,
    hybridSeat: game.hybridSeat, hybridIsFirst: game.hybridIsFirst,
    endReason: game.endReason, life: game.life, decision
   });
   break;
  }
  if (examples.length >= 3) break;
 }
 return examples.slice(0, 3);
}

export function summarize(games, extra = {}) {
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
 const losses = games.filter(game => game.finished && game.hybridWon === false);
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
  whiteSecond: rateOf(games.filter(game => game.deck === 'white-sword' && !game.hybridIsFirst)),
  whiteFirst: rateOf(games.filter(game => game.deck === 'white-sword' && game.hybridIsFirst)),
  seat0: rateOf(games.filter(game => game.hybridSeat === 0)),
  seat1: rateOf(games.filter(game => game.hybridSeat === 1)),
  interval: blockInterval(rates, 9050),
  incompleteBlocks: incomplete,
  illegal: games.reduce((sum, game) => sum + (game.illegal || 0), 0),
  routingErrors: games.reduce((sum, game) => sum + (game.routingErrors || 0), 0),
  unfinished: games.filter(game => !game.finished).length,
  hitStepCap: games.filter(game => game.hitStepCap).length,
  actionReplayFailures: games.filter(game => game.actionReplayOk !== true).length,
  flags: sumFlags(games),
  lossFlags: sumFlags(losses),
  lossGames: losses.length,
  turn4MaxBp: mean(games.map(game => game.turn4?.max)),
  turn4Count4000: mean(games.map(game => game.turn4?.n4000)),
  firstAttack: mean(games.map(game => game.firstAttack)),
  firstRaid: mean(games.map(game => game.firstRaid)),
  firstConnect: mean(games.map(game => game.firstConnect)),
  clock: {hybrid: clockRollup(games, 'hybrid'), hard: clockRollup(games, 'hard')},
  examples: pickExamples(games),
  localSnapshots: SNAPSHOTS,
  localSnapshotsCommitted: false
 };
}

function assertSchedule(lock) {
 if (lock.programBase !== PROGRAM_BASE) throw new Error('Lock base moved');
 if (lock.namedBeforeResults !== true) throw new Error('Lock was not named before results');
 if (lock.policies.hybrid !== HYBRID_MAIN_POLICY || lock.policies.opponent !== HARD_AI_POLICY) throw new Error('Lock policies moved');
 if (lock.nodes !== 48 || lock.ms !== 40 || lock.searchSeed !== 1 || lock.steps !== 1200) throw new Error('Lock budget moved');
 if (lock.experiments !== 'off') throw new Error('Lock experiments are not off');
 const jobs = jobsFromLock(lock);
 if (jobs.length !== 200) throw new Error(`Expected 200 games, got ${jobs.length}`);
 if (jobs.some(job => job.seed >= 9100 || job.seed < 9050)) throw new Error('Seed is outside 9050-9099');
 const changed = frozenDistDiff();
 if (changed) throw new Error('AI code differs from the locked base: ' + changed);
 return jobs;
}

function runShard() {
 const lock = loadHardLock();
 const jobs = assertSchedule(lock);
 const shard = Number(process.env.AI_V3_SHARD || 0);
 const shards = Number(process.env.AI_V3_SHARDS || 1);
 let mine = jobs.filter((_, index) => index % shards === shard);
 if (process.env.AI_V3_ONLY) {
  const [deck, seed, first, seat] = process.env.AI_V3_ONLY.split(':');
  mine = jobs.filter(job => job.deck === deck && job.seed === Number(seed)
   && job.first === Number(first) && job.hybridSeat === Number(seat));
 }
 mkdirSync(OUT, {recursive: true});
 mkdirSync(SNAPSHOTS, {recursive: true});
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const games = [];
 const outFile = process.env.AI_V3_ONLY ? `${OUT}/only.json` : `${OUT}/shard-${shard}.json`;
 for (const job of mine) {
  const started = performance.now();
  const game = playGame(decks.get(job.deck), job);
  game.seconds = Math.round((performance.now() - started) / 100) / 10;
  games.push(game);
  writeFileSync(outFile, JSON.stringify({shard, shards, games}));
  const mark = game.hybridWon ? 'hybrid' : game.draw ? 'draw' : game.finished ? 'hard' : 'unfinished';
  console.error('game', job.deck, job.seed, 'first', job.first, 'seat', job.hybridSeat,
   mark, game.life.join('-'), game.steps, game.seconds + 's', 'flags', JSON.stringify(game.flags));
 }
 console.error('shard', shard, 'done', games.length);
}

function mergeShards() {
 const lockText = readFileSync(LOCK_URL, 'utf8');
 const lock = JSON.parse(lockText);
 assertSchedule(lock);
 const files = readdirSync(OUT).filter(name => /^shard-\d+\.json$/.test(name)).sort();
 const games = files.flatMap(name => JSON.parse(readFileSync(`${OUT}/${name}`, 'utf8')).games);
 if (games.length !== 200) throw new Error(`Refusing to summarize ${games.length} games`);
 games.sort((a, b) => a.seed - b.seed || a.hybridSeat - b.hybridSeat || a.first - b.first);
 const head = execSync('git rev-parse HEAD', {encoding: 'utf8'}).trim();
 const summary = summarize(games, {
  programBase: PROGRAM_BASE,
  headSha: head,
  lockSha256: createHash('sha256').update(lockText).digest('hex'),
  policies: {hybrid: HYBRID_MAIN_POLICY, opponent: HARD_AI_POLICY},
  nodes: 48,
  ms: 40,
  steps: 1200,
  searchSeed: 1,
  experiments: 'off',
  generatedAt: new Date().toISOString()
 });
 summary.gameRows = games;
 writeFileSync(SUMMARY_URL, JSON.stringify(summary, null, 2) + '\n');
 console.error('merged', games.length, 'wins', summary.record.wins, 'interval', summary.interval.low, summary.interval.high);
}

function invokedDirectly() {
 const entry = process.argv[1];
 if (!entry) return false;
 try { return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url)); }
 catch { return false; }
}

if (invokedDirectly()) {
 if (process.env.AI_V3_MERGE === '1') mergeShards();
 else runShard();
}
