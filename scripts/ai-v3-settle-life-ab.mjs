import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseHybridMainAction, hybridLane, hybridSource, lastHybridRoute, HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {
 dispatchUniversalAction, legalUniversalActions,
 universalAttackDamage, universalBp, universalImpact
} from '../dist/universal-v2/engine.mjs';

const sameAction = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const LOCK_URL = new URL('../audit/ai-v3-settle-life-8850-seed-lock.json', import.meta.url);
const STEPS = 600;
const BUDGET = {nodes: 48, ms: 40, seed: 1, worlds: 1};
const NONSAVING = new Set(['draw', 'get', 'active']);

export function loadSettleLock() {
 return JSON.parse(readFileSync(LOCK_URL, 'utf8'));
}

export function settleJobs(lock = loadSettleLock()) {
 const jobs = [];
 for (const deck of lock.decks) {
  if (deck.seeds.length * lock.cells.length !== deck.games) {
   throw new Error(`${deck.id} does not make ${deck.games} games`);
  }
  for (const seed of deck.seeds) {
   for (const cell of lock.cells) {
    jobs.push({
     deck: deck.id, seed, first: cell.first,
     hybridSeat: cell.hybridSeat, hybridIsFirst: cell.hybridIsFirst
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

export function pairedInterval(deltas, seed = 8850) {
 const rng = mulberry32(seed);
 const clean = deltas.filter(value => Number.isFinite(value));
 if (!clean.length) return {n: 0, mean: null, low: null, high: null, containsZero: null};
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
 return {n: clean.length, mean: point, low, high, containsZero: low <= 0 && high >= 0, aboveDrop: low > -0.05};
}

function percentile(values, index) {
 const sorted = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
 if (!sorted.length) return null;
 return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}

function chooseFor(packs, state, hybridSeat, settleLife) {
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
  const options = {actor, ...BUDGET};
  if (settleLife) options.factors = {settleLife: true};
  raw = chooseHybridMainAction(packs, state, options);
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
  raw = chooseAiV3Action(packs, state, {actor, ...BUDGET});
  trace = lastAiV3Trace();
  policy = trace?.policy || null;
  source = 'v3';
  if (policy !== AI_V3_POLICY) problems.push('v3-policy');
 }
 const elapsed = performance.now() - started;
 const action = legal.find(item => sameAction(item, raw)) || null;
 return {actor, lane, source, policy, action, elapsed, trace, problems, legal};
}

function noteBlock(packs, state, job, picked, tally) {
 if (picked.actor !== job.hybridSeat || state.pending?.kind !== 'block') return;
 const attacker = state.players.flatMap(player => player.front).find(card => card?.uid === state.pending.attackerUid);
 if (!attacker) return;
 const damage = universalAttackDamage(packs, state, attacker);
 const life = state.players[job.hybridSeat].life.length;
 if (!(damage >= life)) return;
 const rows = picked.trace?.candidates || [];
 const passRow = rows.find(row => row.action?.type === 'chooseBlock' && row.action.uid == null);
 const lived = rows.filter(row => row.action?.uid && row.boundary === 'terminal' && row.search <= -100000 && (row.opponentTurns || 0) > 0);
 const trigger = passRow?.leafTrigger;
 const unsettled = passRow && passRow.boundary === 'terminal' && passRow.search <= -90000 && passRow.search > -100000
  && (passRow.stopPending || passRow.pending) === 'life-trigger' && NONSAVING.has(trigger) && lived.length > 0;
 if (unsettled && !picked.action?.uid) tally.lethalPass++;
 if (!picked.action?.uid || !lived.some(row => sameAction(row.action, picked.action))) return;
 const before = state.players[job.hybridSeat].front.length;
 const after = dispatchUniversalAction(packs, structuredClone(state), picked.action, {actor: picked.actor});
 const kept = after.status === 'playing' && after.players[job.hybridSeat].life.length >= life;
 if (kept) tally.lifeSaved++;
 else tally.blockStillLostLife++;
 const blocker = state.players[job.hybridSeat].front.find(card => card?.uid === picked.action.uid);
 const lostBody = before > after.players[job.hybridSeat].front.filter(Boolean).length
  || universalBp(packs, state, attacker) >= universalBp(packs, state, blocker)
  || universalImpact(packs, state, attacker) > 0;
 if (kept && lostBody) tally.badTrade++;
}

function playArm(packs, opened, deck, job, settleLife) {
 let cursor = cloneMatch(opened);
 const tally = {
  lethalPass: 0, lifeSaved: 0, badTrade: 0, blockStillLostLife: 0,
  fallbacks: 0, hardBudget: 0, phaseErrors: 0, abandonedKills: 0,
  overNodes: 0, maxNodes: 0, times: [], pendingV3: 0, pendingOther: 0
 };
 let illegal = 0;
 let steps = 0;
 const exceptions = [];
 while (cursor.status === 'playing' && steps < STEPS) {
  let picked;
  try {
   picked = chooseFor(packs, cursor, job.hybridSeat, settleLife);
  } catch (error) {
   exceptions.push(error?.message || String(error));
   illegal++;
   break;
  }
  tally.times.push(picked.elapsed);
  if (picked.problems.length) tally.phaseErrors += picked.problems.length;
  const nodes = Number.isFinite(picked.trace?.nodesUsed) ? picked.trace.nodesUsed : null;
  if (nodes != null) {
   tally.maxNodes = Math.max(tally.maxNodes, nodes);
   if (nodes > 48) tally.overNodes++;
  }
  if (picked.trace?.reason === 'budget-fallback' || picked.trace?.fallback) tally.fallbacks++;
  if (picked.source === 'hard' && picked.trace?.reason === 'budget') tally.hardBudget++;
  if (picked.lane === 'pending') {
   if (picked.source === 'v3') tally.pendingV3++;
   else tally.pendingOther++;
  }
  const wins = (picked.trace?.candidates || []).filter(row => {
   if (picked.source === 'v3') {
    return row?.executed !== false && row.boundary === 'terminal' && row.search >= 90000
     && picked.legal.some(action => sameAction(action, row.action));
   }
   return row?.score >= 50000 && picked.legal.some(action => sameAction(action, row.action));
  });
  if (wins.length > 0 && !(picked.action && wins.some(row => sameAction(row.action, picked.action)))) tally.abandonedKills++;
  if (!picked.action) {
   illegal++;
   exceptions.push('chosen action is not legal');
   break;
  }
  try {
   noteBlock(packs, cursor, job, picked, tally);
   cursor = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor});
  } catch (error) {
   exceptions.push(error?.message || String(error));
   illegal++;
   break;
  }
  steps++;
 }
 const finished = cursor.status === 'finished' && illegal === 0 && !exceptions.length;
 const winner = finished ? cursor.winner : null;
 const times = tally.times;
 return {
  deck: deck.id, seed: job.seed, first: job.first,
  hybridSeat: job.hybridSeat, hybridIsFirst: job.hybridIsFirst,
  settleLife, finished, winner,
  hybridWon: finished && winner === job.hybridSeat,
  endReason: cursor.endReason || null,
  life: cursor.players.map(player => player.life.length),
  steps, illegal, exceptions, hitStepCap: steps >= STEPS && cursor.status === 'playing',
  lethalPass: tally.lethalPass, lifeSaved: tally.lifeSaved, badTrade: tally.badTrade,
  blockStillLostLife: tally.blockStillLostLife,
  fallbacks: tally.fallbacks, hardBudget: tally.hardBudget, phaseErrors: tally.phaseErrors,
  abandonedKills: tally.abandonedKills, overNodes: tally.overNodes, maxNodes: tally.maxNodes,
  pendingV3: tally.pendingV3, pendingOther: tally.pendingOther,
  decisionP50: percentile(times, Math.floor((times.length - 1) / 2)),
  decisionP95: percentile(times, Math.floor((times.length - 1) * 0.95))
 };
}

export function playPair(deck, job) {
 const packs = [deck.pack, deck.pack];
 const opened = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], job.seed, job.first)).state;
 return {
  A: playArm(packs, opened, deck, job, false),
  B: playArm(packs, opened, deck, job, true)
 };
}

function sum(rows, key) {
 return rows.reduce((total, row) => total + (row[key] || 0), 0);
}

function rate(rows) {
 const finished = rows.filter(row => row.finished);
 const wins = finished.filter(row => row.hybridWon).length;
 return {games: rows.length, finished: finished.length, wins, losses: finished.length - wins, winRate: finished.length ? wins / finished.length : null};
}

function sliceRate(rows, pred) {
 return rate(rows.filter(pred));
}

export function summarizeArms(pairs) {
 const arms = {A: pairs.map(pair => pair.A), B: pairs.map(pair => pair.B)};
 const bySeed = new Map();
 for (const pair of pairs) {
  const key = `${pair.A.deck}|${pair.A.seed}`;
  const bag = bySeed.get(key) || {A: 0, B: 0, n: 0, deck: pair.A.deck};
  bag.n++;
  if (pair.A.hybridWon) bag.A++;
  if (pair.B.hybridWon) bag.B++;
  bySeed.set(key, bag);
 }
 const deltas = [...bySeed.values()].map(bag => (bag.B - bag.A) / bag.n);
 const report = {};
 for (const name of ['A', 'B']) {
  const rows = arms[name];
  report[name] = {
   overall: rate(rows),
   white: sliceRate(rows, row => row.deck === 'white-sword'),
   sao: sliceRate(rows, row => row.deck === 'sword-art-online-raid'),
   steins: sliceRate(rows, row => row.deck === 'steins-gate-raid'),
   first: sliceRate(rows, row => row.hybridIsFirst),
   second: sliceRate(rows, row => !row.hybridIsFirst),
   whiteSecond: sliceRate(rows, row => row.deck === 'white-sword' && !row.hybridIsFirst),
   whiteFirst: sliceRate(rows, row => row.deck === 'white-sword' && row.hybridIsFirst),
   lethalPass: sum(rows, 'lethalPass'),
   lifeSaved: sum(rows, 'lifeSaved'),
   badTrade: sum(rows, 'badTrade'),
   blockStillLostLife: sum(rows, 'blockStillLostLife'),
   fallbacks: sum(rows, 'fallbacks'),
   hardBudget: sum(rows, 'hardBudget'),
   phaseErrors: sum(rows, 'phaseErrors'),
   abandonedKills: sum(rows, 'abandonedKills'),
   overNodes: sum(rows, 'overNodes'),
   illegal: sum(rows, 'illegal'),
   unfinished: rows.filter(row => !row.finished).length,
   maxNodes: Math.max(0, ...rows.map(row => row.maxNodes || 0)),
   pendingOther: sum(rows, 'pendingOther'),
   decisionP50: percentile(rows.map(row => row.decisionP50), Math.floor((rows.length - 1) / 2)),
   decisionP95: percentile(rows.map(row => row.decisionP95), Math.floor((rows.length - 1) * 0.95))
  };
 }
 const safety = name => {
  const arm = report[name];
  return arm.illegal === 0 && arm.unfinished === 0 && arm.phaseErrors === 0
   && arm.abandonedKills === 0 && arm.overNodes === 0 && arm.maxNodes <= 48 && arm.pendingOther === 0;
 };
 const interval = pairedInterval(deltas, 8850);
 report.paired = interval;
 report.safetyA = safety('A');
 report.safetyB = safety('B');
 report.advanceTo8890 = report.safetyA && report.safetyB
  && report.B.lethalPass < report.A.lethalPass
  && interval.low > -0.05;
 return report;
}

function main() {
 const lock = loadSettleLock();
 if (lock.namedBeforeResults !== true || lock.nodes !== 48 || lock.ms !== 40 || lock.clock !== 'real') {
  throw new Error('8850 lock moved');
 }
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const jobs = settleJobs(lock);
 if (jobs.length !== 160) throw new Error(`Expected 160 games, got ${jobs.length}`);
 const shard = Number(process.env.AI_V3_SHARD ?? 0);
 const shards = Number(process.env.AI_V3_SHARDS ?? 1);
 const selected = jobs.filter((_, index) => index % shards === shard);
 const out = process.env.AI_V3_OUT;
 const pairs = [];
 for (const job of selected) {
  const pair = playPair(decks.get(job.deck), job);
  pairs.push(pair);
  console.log(JSON.stringify({
   shard, seed: job.seed, deck: job.deck, first: job.first, seat: job.hybridSeat,
   A: pair.A.hybridWon, B: pair.B.hybridWon,
   pass: [pair.A.lethalPass, pair.B.lethalPass],
   saved: [pair.A.lifeSaved, pair.B.lifeSaved]
  }));
 }
 const body = {shard, games: pairs.length, pairs, summary: summarizeArms(pairs)};
 if (out) {
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, JSON.stringify(body));
 }
 console.log(JSON.stringify(body.summary));
}

if (process.argv[1] && process.argv[1].endsWith('ai-v3-settle-life-ab.mjs')) main();
