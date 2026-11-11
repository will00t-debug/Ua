// Paired hybrid-main-v1 versus hybrid-start-hard-v1. The seed lock is the schedule.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {
 chooseHybridMainAction, chooseHybridStartHardAction, hybridLane, hybridSource, hybridStartHardSource,
 lastHybridRoute, HYBRID_MAIN_POLICY, HYBRID_START_HARD_POLICY
} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {chooseStrengthenedHardAction, lastHardAiTrace, HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';
import {dispatchUniversalAction, legalUniversalActions, universalBp} from '../dist/universal-v2/engine.mjs';
import {decisionFlags} from './ai-v3-decision-log.mjs';

const PROGRAM_BASE = '3a406676ee2cb461cc79ab3936bb132ed14068f4';
const LOCK_URL = new URL('../audit/ai-v3-start-hard-8970-seed-lock.json', import.meta.url);
const REPORT_URL = new URL('../audit/ai-v3-start-hard-8970.json', import.meta.url);
const OUT = process.env.AI_V3_OUT || '/tmp/ai-v3-start-hard-8970';
const STEPS = 1200;
const BUDGET = {nodes: 48, ms: 40, seed: 1};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const FROZEN = [
 'dist/universal-v2/engine.mjs',
 'dist/universal-v2/hard-ai.mjs',
 'dist/universal-v2/ai-v3/search.mjs',
 'dist/universal-v2/ai-v3/eval.mjs'
];

export function loadStartHardLock() {
 return JSON.parse(readFileSync(LOCK_URL, 'utf8'));
}

export function startHardJobs(lock = loadStartHardLock()) {
 const jobs = [];
 for (const deck of lock.decks) {
  if (deck.seeds.length * lock.cells.length !== deck.games) throw new Error(`${deck.id} does not make ${deck.games} games`);
  for (const seed of deck.seeds) {
   for (const cell of lock.cells) jobs.push({deck: deck.id, seed, ...cell});
  }
 }
 if (jobs.length !== lock.gamesPerArm) throw new Error(`Expected ${lock.gamesPerArm} games`);
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

export function pairedInterval(deltas, seed = 8970) {
 const rng = mulberry32(seed);
 const clean = deltas.filter(value => Number.isFinite(value));
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

function assertSchedule(lock) {
 if (lock.programBase !== PROGRAM_BASE || lock.namedBeforeResults !== true) throw new Error('Lock base moved');
 if (lock.nodes !== 48 || lock.ms !== 40 || lock.clock !== 'real' || lock.searchSeed !== 1) throw new Error('Lock budget moved');
 if (lock.policies.A !== HYBRID_MAIN_POLICY || lock.policies.B !== HYBRID_START_HARD_POLICY) throw new Error('Lock policies moved');
 if (lock.policies.opponent !== HARD_AI_POLICY) throw new Error('Lock opponent moved');
 const diff = execFileSync('git', ['diff', '--name-only', PROGRAM_BASE, '--', ...FROZEN], {encoding: 'utf8'}).trim();
 if (diff) throw new Error('Frozen files moved: ' + diff);
}

function readyAp(player) {
 return (player?.apCards || []).filter(card => card && card.ready).length;
}
function frontCount(pack, state, actor) {
 return (state.players?.[actor]?.front || []).filter(card => {
  if (!card) return false;
  try { return (universalBp(pack, state, card) || 0) > 0; }
  catch { return true; }
 }).length;
}

function chooseFor(packs, state, hybridSeat, arm) {
 const actor = state.pending?.player ?? state.active;
 const lane = hybridLane(state);
 const legal = legalUniversalActions(packs, state);
 const started = performance.now();
 const problems = [];
 let raw = null;
 let trace = null;
 let source = null;
 let policy = null;
 if (actor === hybridSeat) {
  const options = {actor, ...BUDGET};
  raw = arm === 'B' ? chooseHybridStartHardAction(packs, state, options) : chooseHybridMainAction(packs, state, options);
  const route = lastHybridRoute();
  source = route?.source || null;
  policy = route?.policy || null;
  trace = source === 'hard' ? lastHardAiTrace() : lastAiV3Trace();
  const expectedPolicy = arm === 'B' ? HYBRID_START_HARD_POLICY : HYBRID_MAIN_POLICY;
  const expectedSource = arm === 'B' ? hybridStartHardSource(lane) : hybridSource(lane);
  if (!route || policy !== expectedPolicy || route.lane !== lane || source !== expectedSource
   || route.nodes !== 48 || route.ms !== 40 || route.actor !== actor) problems.push('hybrid-route');
  if (Object.values(trace?.factors || {}).some(value => value === true)) problems.push('experiment');
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

function blankTurn() {
 return {drew: false, passed: false, deployed: false};
}

export function playArm(packs, opened, deck, job, arm) {
 let cursor = cloneMatch(opened);
 const tally = {
  extraDraw: 0, next: 0, otherStart: 0,
  drawTurns: 0, deployAfterDraw: 0, nextTurns: 0, deployAfterNext: 0,
  apLeft: 0, ownTurns: 0, budget: 0, over40: 0, over80: 0,
  overNodes: 0, maxNodes: 0, decisions: 0,
  phaseErrors: 0, abandonedKills: 0, lethalPasses: 0,
  firstFront: null, firstRaid: null, firstAttack: null, firstConnect: null
 };
 let illegal = 0;
 let steps = 0;
 let ownTurn = 0;
 let open = false;
 let turn = blankTurn();
 let armed = null;
 const exceptions = [];
 while (cursor.status === 'playing' && steps < STEPS) {
  const actor = cursor.pending?.player ?? cursor.active;
  if (actor === job.hybridSeat && cursor.phase === 'start' && !cursor.pending && !open) {
   ownTurn++;
   open = true;
   turn = blankTurn();
   if (tally.firstFront == null && frontCount(packs, cursor, actor) > 0) tally.firstFront = ownTurn;
  }
  let picked;
  try { picked = chooseFor(packs, cursor, job.hybridSeat, arm); }
  catch (error) {
   exceptions.push(String(error?.message || error).slice(0, 180));
   illegal++;
   break;
  }
  tally.phaseErrors += picked.problems.length;
  const nodes = Number.isFinite(picked.trace?.nodesUsed) ? picked.trace.nodesUsed : null;
  if (actor === job.hybridSeat) {
   tally.decisions++;
   if (nodes != null) {
    tally.maxNodes = Math.max(tally.maxNodes, nodes);
    if (nodes > 48) tally.overNodes++;
   }
   if (picked.wallMs > 40) tally.over40++;
   if (picked.wallMs > 80) tally.over80++;
   const reason = picked.trace?.reason || '';
   if (reason === 'budget' || reason === 'budget-fallback') tally.budget++;
   const flags = decisionFlags(packs, cursor, actor, picked.legal, picked.action, picked.trace, {source: picked.source, ownTurn});
   if (flags.includes('abandoned-kill')) tally.abandonedKills++;
   if (flags.includes('defender-lethal')) tally.lethalPasses++;
   if (picked.lane === 'start' && !cursor.pending) {
    if (picked.action?.type === 'extraDraw') { tally.extraDraw++; turn.drew = true; }
    else if (picked.action?.type === 'next') { tally.next++; turn.passed = true; }
    else tally.otherStart++;
   }
   if (open && (picked.action?.type === 'raid' || (picked.action?.type === 'play' && picked.action.line === 'front'))) turn.deployed = true;
   if (picked.action?.type === 'attack' && tally.firstAttack == null) tally.firstAttack = ownTurn;
   if (picked.action?.type === 'raid' && tally.firstRaid == null) tally.firstRaid = ownTurn;
   if (picked.action?.type === 'attack') armed = cursor.players[1 - job.hybridSeat].life.length;
  } else if (nodes != null && nodes > 48) tally.overNodes++;
  if (!picked.action) {
   illegal++;
   exceptions.push('chosen action is not legal');
   break;
  }
  try { cursor = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor}); }
  catch (error) {
   exceptions.push(String(error?.message || error).slice(0, 180));
   illegal++;
   break;
  }
  if (open && actor === job.hybridSeat && tally.firstFront == null && frontCount(packs, cursor, job.hybridSeat) > 0) tally.firstFront = ownTurn;
  if (armed != null && cursor.players[1 - job.hybridSeat].life.length < armed && tally.firstConnect == null) {
   tally.firstConnect = ownTurn;
   armed = null;
  }
  const after = cursor.status === 'playing' ? (cursor.pending?.player ?? cursor.active) : null;
  if (open && actor === job.hybridSeat && (after !== actor || cursor.status !== 'playing')) {
   tally.apLeft += readyAp(cursor.players[actor]);
   tally.ownTurns++;
   if (turn.drew) {
    tally.drawTurns++;
    if (turn.deployed) tally.deployAfterDraw++;
   } else if (turn.passed) {
    tally.nextTurns++;
    if (turn.deployed) tally.deployAfterNext++;
   }
   open = false;
   armed = null;
  }
  steps++;
 }
 const finished = cursor.status === 'finished' && illegal === 0 && !exceptions.length;
 const winner = finished ? cursor.winner : null;
 return {
  arm, deck: deck.id, seed: job.seed, first: job.first, hybridSeat: job.hybridSeat, hybridIsFirst: job.hybridIsFirst,
  finished, winner, hybridWon: finished && winner === job.hybridSeat,
  endReason: cursor.endReason || null,
  life: cursor.players.map(player => player.life.length),
  steps, illegal, hitStepCap: steps >= STEPS && cursor.status === 'playing',
  exceptions, ...tally
 };
}

export function playPair(deck, job) {
 const packs = [deck.pack, deck.pack];
 const opened = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], job.seed, job.first)).state;
 return {A: playArm(packs, opened, deck, job, 'A'), B: playArm(packs, opened, deck, job, 'B')};
}

function sum(rows, key) { return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0); }
function mean(rows, key) {
 const values = rows.map(row => row[key]).filter(value => Number.isFinite(value));
 return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}
function rate(rows) {
 const wins = rows.filter(row => row.hybridWon).length;
 return {
  games: rows.length,
  finished: rows.filter(row => row.finished).length,
  wins,
  losses: rows.filter(row => row.finished && !row.hybridWon).length,
  draws: rows.filter(row => row.finished && row.winner == null).length,
  unfinished: rows.filter(row => !row.finished).length,
  winRate: rows.length ? wins / rows.length : null
 };
}

export function advanceFrom(report) {
 const gap = (report.B?.overall?.winRate ?? 0) - (report.A?.overall?.winRate ?? 0);
 const whiteDrop = (report.A?.white?.winRate ?? 0) - (report.B?.white?.winRate ?? 0);
 const zeros = arm => arm && arm.illegal === 0 && arm.unfinished === 0 && arm.phaseErrors === 0
  && arm.overNodes === 0 && arm.maxNodes <= 48;
 const safety = zeros(report.A) && zeros(report.B) && (report.B.abandonedKills || 0) <= (report.A.abandonedKills || 0);
 const rateOk = gap >= 0.05;
 const intervalOk = Number.isFinite(report.paired?.low) && report.paired.low > 0;
 const whiteOk = whiteDrop <= 0.05;
 const advance = safety && rateOk && intervalOk && whiteOk;
 return {advance, safety, rateOk, intervalOk, whiteOk, gap, whiteDrop};
}

export function summarizePairs(pairs) {
 const arms = {A: pairs.map(pair => pair.A), B: pairs.map(pair => pair.B)};
 const bySeed = new Map();
 for (const pair of pairs) {
  const key = `${pair.A.deck}|${pair.A.seed}`;
  const bag = bySeed.get(key) || {A: 0, B: 0, n: 0};
  bag.n++;
  if (pair.A.hybridWon) bag.A++;
  if (pair.B.hybridWon) bag.B++;
  bySeed.set(key, bag);
 }
 const report = {};
 for (const name of ['A', 'B']) {
  const rows = arms[name];
  const draw = sum(rows, 'extraDraw');
  const next = sum(rows, 'next');
  const drawTurns = sum(rows, 'drawTurns');
  const nextTurns = sum(rows, 'nextTurns');
  report[name] = {
   overall: rate(rows),
   white: rate(rows.filter(row => row.deck === 'white-sword')),
   sao: rate(rows.filter(row => row.deck === 'sword-art-online-raid')),
   steins: rate(rows.filter(row => row.deck === 'steins-gate-raid')),
   first: rate(rows.filter(row => row.hybridIsFirst)),
   second: rate(rows.filter(row => !row.hybridIsFirst)),
   whiteFirst: rate(rows.filter(row => row.deck === 'white-sword' && row.hybridIsFirst)),
   whiteSecond: rate(rows.filter(row => row.deck === 'white-sword' && !row.hybridIsFirst)),
   extraDraw: draw,
   next,
   otherStart: sum(rows, 'otherStart'),
   extraDrawRate: (draw + next) ? draw / (draw + next) : null,
   drawTurns,
   deployAfterDraw: sum(rows, 'deployAfterDraw'),
   deployAfterDrawRate: drawTurns ? sum(rows, 'deployAfterDraw') / drawTurns : null,
   nextTurns,
   deployAfterNext: sum(rows, 'deployAfterNext'),
   deployAfterNextRate: nextTurns ? sum(rows, 'deployAfterNext') / nextTurns : null,
   apLeft: mean(rows, 'ownTurns') ? rows.reduce((total, row) => total + row.apLeft, 0) / rows.reduce((total, row) => total + row.ownTurns, 0) : null,
   firstFront: mean(rows, 'firstFront'),
   neverFront: rows.filter(row => row.firstFront == null).length,
   firstRaid: mean(rows, 'firstRaid'),
   neverRaid: rows.filter(row => row.firstRaid == null).length,
   firstAttack: mean(rows, 'firstAttack'),
   firstConnect: mean(rows, 'firstConnect'),
   neverConnect: rows.filter(row => row.firstConnect == null).length,
   budget: sum(rows, 'budget'),
   decisions: sum(rows, 'decisions'),
   over40: sum(rows, 'over40'),
   over80: sum(rows, 'over80'),
   overNodes: sum(rows, 'overNodes'),
   maxNodes: Math.max(0, ...rows.map(row => row.maxNodes || 0)),
   phaseErrors: sum(rows, 'phaseErrors'),
   abandonedKills: sum(rows, 'abandonedKills'),
   lethalPasses: sum(rows, 'lethalPasses'),
   illegal: sum(rows, 'illegal'),
   unfinished: rows.filter(row => !row.finished).length,
   hitStepCap: rows.filter(row => row.hitStepCap).length
  };
 }
 report.paired = pairedInterval([...bySeed.values()].map(bag => (bag.B - bag.A) / bag.n), 8970);
 Object.assign(report, advanceFrom(report));
 return report;
}

function publicPair(pair) {
 const slim = row => {
  const copy = {...row};
  delete copy.exceptions;
  return copy;
 };
 return {A: slim(pair.A), B: slim(pair.B)};
}

function runShard() {
 const lock = loadStartHardLock();
 assertSchedule(lock);
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const jobs = startHardJobs(lock);
 const shard = Number(process.env.AI_V3_SHARD ?? 0);
 const shards = Number(process.env.AI_V3_SHARDS ?? 1);
 const selected = jobs.filter((_, index) => index % shards === shard);
 const pairs = [];
 for (const job of selected) {
  const pair = playPair(decks.get(job.deck), job);
  pairs.push(publicPair(pair));
  console.error(JSON.stringify({
   shard, seed: job.seed, deck: job.deck, first: job.first, seat: job.hybridSeat,
   A: pair.A.hybridWon, B: pair.B.hybridWon,
   draw: [pair.A.extraDraw, pair.B.extraDraw]
  }));
 }
 const body = {
  shard, games: pairs.length, pairs,
  lockSha256: createHash('sha256').update(readFileSync(LOCK_URL)).digest('hex')
 };
 mkdirSync(OUT, {recursive: true});
 writeFileSync(`${OUT}/shard-${shard}.json`, JSON.stringify(body));
 console.error('shard', shard, 'games', pairs.length);
}

function mergeShards() {
 const files = readdirSync(OUT).filter(name => /^shard-\d+\.json$/.test(name)).sort();
 const pairs = [];
 let lockSha256 = null;
 for (const name of files) {
  const body = JSON.parse(readFileSync(`${OUT}/${name}`, 'utf8'));
  lockSha256 = body.lockSha256;
  pairs.push(...body.pairs);
 }
 if (pairs.length !== 160) throw new Error(`Expected 160 pairs, got ${pairs.length}`);
 const summary = summarizePairs(pairs);
 const head = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
 const report = {
  kind: 'start-hard-8970',
  programBase: PROGRAM_BASE,
  headSha: head,
  lockSha256,
  gamesPerArm: 160,
  A: summary.A,
  B: summary.B,
  paired: summary.paired,
  advance: summary.advance,
  safety: summary.safety,
  gap: summary.gap,
  whiteDrop: summary.whiteDrop,
  doesNotReplace: 'audit/ai-v3-hybrid-vs-hard-9050-summary.json',
  secondSetPlayed: false,
  policyDefault: 'off',
  menuAdded: false
 };
 writeFileSync(`${OUT}/merged.json`, JSON.stringify({pairs, summary}));
 if (process.env.AI_V3_REPORT === '1') {
  writeFileSync(REPORT_URL, JSON.stringify(report, null, 2) + '\n');
  console.error('report', REPORT_URL.pathname);
 }
 console.log(JSON.stringify({
  A: summary.A.overall, B: summary.B.overall, paired: summary.paired,
  white: [summary.A.white, summary.B.white],
  extra: [summary.A.extraDrawRate, summary.B.extraDrawRate],
  advance: summary.advance, safety: summary.safety
 }));
}

function invokedDirectly() {
 const entry = process.argv[1] || '';
 return entry.endsWith('ai-v3-start-hard-ab.mjs');
}

if (invokedDirectly()) {
 if (process.env.AI_V3_MERGE === '1') mergeShards();
 else runShard();
}
