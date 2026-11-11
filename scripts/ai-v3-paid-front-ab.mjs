import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseHybridMainAction, hybridDecisionLog, hybridLane, hybridSource, lastHybridRoute, resetHybridDecisionLog, HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {
 dispatchUniversalAction, legalUniversalActions, universalBp, universalEnergyByColor
} from '../dist/universal-v2/engine.mjs';

const LOCK_URL = new URL('../audit/ai-v3-paid-front-8930-seed-lock.json', import.meta.url);
const STEPS = 600;
const BUDGET = {nodes: 48, ms: 40, seed: 1, worlds: 1};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function loadPaidFrontLock() {
 return JSON.parse(readFileSync(LOCK_URL, 'utf8'));
}

export function paidFrontJobs(lock = loadPaidFrontLock()) {
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

export function pairedInterval(deltas, seed = 8930) {
 const rng = mulberry32(seed);
 const clean = deltas.filter(value => Number.isFinite(value));
 if (!clean.length) return {n: 0, mean: null, low: null, high: null, containsZero: null, aboveDrop: null};
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
function printed(pack, card) {
 if (!card?.uid || !card.cardId) return null;
 const owner = Number(String(card.uid).split('-')[0]);
 const packs = Array.isArray(pack) ? pack : [pack, pack];
 return packs[owner]?.cards?.[card.cardId] || null;
}
function liveBp(pack, state, card) {
 try {
  const value = universalBp(pack, state, card);
  return Number.isFinite(value) ? value : 0;
 } catch { return 0; }
}

function chooseFor(packs, state, hybridSeat, paidFront) {
 const actor = state.pending?.player ?? state.active;
 const lane = hybridLane(state);
 const legal = legalUniversalActions(packs, state);
 let raw = null;
 let trace = null;
 let source = null;
 let policy = null;
 const problems = [];
 if (actor === hybridSeat) {
  const options = {actor, ...BUDGET};
  if (paidFront) options.factors = {paidFront: true};
  raw = chooseHybridMainAction(packs, state, options);
  const route = lastHybridRoute();
  source = route?.source || null;
  policy = route?.policy || null;
  trace = source === 'hard' ? lastHardAiTrace() : lastAiV3Trace();
  if (!route || policy !== HYBRID_MAIN_POLICY || route.lane !== lane || source !== hybridSource(lane)
   || route.nodes !== 48 || route.ms !== 40 || route.actor !== actor) problems.push('hybrid-route');
 } else {
  resetAiV3Report();
  raw = chooseAiV3Action(packs, state, {actor, ...BUDGET});
  trace = lastAiV3Trace();
  policy = trace?.policy || null;
  source = 'v3';
  if (policy !== AI_V3_POLICY) problems.push('v3-policy');
 }
 const action = legal.find(item => same(item, raw)) || null;
 return {actor, lane, source, policy, action, trace, problems, legal};
}

function playArm(packs, opened, deck, job, paidFront) {
 let cursor = cloneMatch(opened);
 resetHybridDecisionLog();
 const tally = {
  thinHighEnergy: 0, energyShort: 0, phaseErrors: 0, abandonedKills: 0,
  overNodes: 0, maxNodes: 0, pendingOther: 0, apLeft: 0, turns: 0,
  turn4MaxBp: null, turn4Count4000: null, firstAttack: null, firstRaid: null, firstConnect: null
 };
 function noteFront() {
  if (ownTurn !== 4) return;
  const bodies = cursor.players[job.hybridSeat].front.filter(Boolean).map(card => liveBp(packs, cursor, card));
  const max = bodies.length ? Math.max(...bodies) : 0;
  const count = bodies.filter(bp => bp >= 4000).length;
  tally.turn4MaxBp = Math.max(tally.turn4MaxBp ?? 0, max);
  tally.turn4Count4000 = Math.max(tally.turn4Count4000 ?? 0, count);
 }
 let illegal = 0;
 let steps = 0;
 let ownTurn = 0;
 let open = false;
 let armed = null;
 const exceptions = [];
 while (cursor.status === 'playing' && steps < STEPS) {
  const actor = cursor.pending?.player ?? cursor.active;
  if (actor === job.hybridSeat && cursor.phase === 'start' && !cursor.pending && !open) {
   ownTurn++;
   open = true;
   noteFront();
  }
  let picked;
  try { picked = chooseFor(packs, cursor, job.hybridSeat, paidFront); }
  catch (error) {
   exceptions.push(error?.message || String(error));
   illegal++;
   break;
  }
  if (picked.problems.length) tally.phaseErrors += picked.problems.length;
  const nodes = Number.isFinite(picked.trace?.nodesUsed) ? picked.trace.nodesUsed : null;
  if (nodes != null) {
   tally.maxNodes = Math.max(tally.maxNodes, nodes);
   if (nodes > 48) tally.overNodes++;
  }
  if (picked.lane === 'pending') {
   if (picked.source !== 'v3') tally.pendingOther++;
  }
  const wins = (picked.trace?.candidates || []).filter(row => {
   if (picked.source === 'v3') {
    return row?.executed !== false && row.boundary === 'terminal' && row.search >= 90000
     && picked.legal.some(action => same(action, row.action));
   }
   return row?.score >= 50000 && picked.legal.some(action => same(action, row.action));
  });
  if (wins.length > 0 && !(picked.action && wins.some(row => same(row.action, picked.action)))) tally.abandonedKills++;
  if (!picked.action) {
   illegal++;
   exceptions.push('chosen action is not legal');
   break;
  }
  if (actor === job.hybridSeat && !cursor.pending && cursor.phase === 'main') {
   const colors = universalEnergyByColor(packs, cursor, actor) || {};
   const hand = cursor.players[actor].hand || [];
   if (hand.some(card => {
    const data = printed(packs, card);
    return data?.type === 'character' && liveBp(packs, cursor, card) >= 3000 && (Number(data.energy) || 0) > (colors[data.color] || 0);
   })) tally.energyShort++;
   const fronts = cursor.players[actor].front.filter(Boolean).map(card => liveBp(packs, cursor, card));
   const thin = !fronts.some(bp => bp >= 3000);
   const chosenCard = hand.find(card => card.uid === picked.action.uid);
   const chosenBp = chosenCard ? liveBp(packs, cursor, chosenCard) : 0;
   const deploy = picked.legal.some(action => {
    if (action.type !== 'raid' && !(action.type === 'play' && action.line === 'front')) return false;
    const body = hand.find(card => card.uid === action.uid);
    return body && liveBp(packs, cursor, body) >= 3000;
   });
   if (picked.action.type === 'play' && picked.action.line === 'energy' && chosenBp >= 3000 && thin && deploy) tally.thinHighEnergy++;
  }
  if (actor === job.hybridSeat && picked.action.type === 'attack' && tally.firstAttack == null) tally.firstAttack = ownTurn;
  if (actor === job.hybridSeat && picked.action.type === 'raid' && tally.firstRaid == null) tally.firstRaid = ownTurn;
  if (actor === job.hybridSeat && picked.action.type === 'attack') armed = cursor.players[1 - actor].life.length;
  try { cursor = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor}); }
  catch (error) {
   exceptions.push(error?.message || String(error));
   illegal++;
   break;
  }
  noteFront();
  if (armed != null && cursor.players[1 - job.hybridSeat].life.length < armed && tally.firstConnect == null) {
   tally.firstConnect = ownTurn;
   armed = null;
  }
  const after = cursor.status === 'playing' ? (cursor.pending?.player ?? cursor.active) : null;
  if (open && actor === job.hybridSeat && (after !== actor || cursor.status !== 'playing')) {
   tally.apLeft += (cursor.players[actor].apCards || []).filter(card => card && card.ready).length;
   tally.turns++;
   open = false;
   armed = null;
  }
  steps++;
 }
 const mains = hybridDecisionLog().filter(row => row.lane === 'main');
 tally.mainDecisions = mains.length;
 tally.mainCuts = mains.filter(row => row.rootCut).length;
 tally.mains = mains;
 const finished = cursor.status === 'finished' && illegal === 0 && !exceptions.length;
 const winner = finished ? cursor.winner : null;
 return {
  deck: deck.id, seed: job.seed, first: job.first, hybridSeat: job.hybridSeat, hybridIsFirst: job.hybridIsFirst,
  paidFront, finished, winner, hybridWon: finished && winner === job.hybridSeat,
  endReason: cursor.endReason || null,
  life: cursor.players.map(player => player.life.length),
  steps, illegal, exceptions, hitStepCap: steps >= STEPS && cursor.status === 'playing',
  ...tally, maxNodes: tally.maxNodes
 };
}

export function playPair(deck, job) {
 const packs = [deck.pack, deck.pack];
 const opened = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], job.seed, job.first)).state;
 return {A: playArm(packs, opened, deck, job, false), B: playArm(packs, opened, deck, job, true)};
}

function sum(rows, key) { return rows.reduce((total, row) => total + (row[key] || 0), 0); }
function mean(rows, key) {
 const values = rows.map(row => row[key]).filter(value => Number.isFinite(value));
 return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}
function meanOf(rows, pick) {
 const values = rows.map(pick).filter(value => Number.isFinite(value));
 return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}
function rate(rows) {
 const finished = rows.filter(row => row.finished);
 const wins = finished.filter(row => row.hybridWon).length;
 return {games: rows.length, finished: finished.length, wins, losses: finished.length - wins, winRate: finished.length ? wins / finished.length : null};
}

export function summarizeArms(pairs) {
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
  report[name] = {
   overall: rate(rows),
   white: rate(rows.filter(row => row.deck === 'white-sword')),
   sao: rate(rows.filter(row => row.deck === 'sword-art-online-raid')),
   steins: rate(rows.filter(row => row.deck === 'steins-gate-raid')),
   first: rate(rows.filter(row => row.hybridIsFirst)),
   second: rate(rows.filter(row => !row.hybridIsFirst)),
   whiteSecond: rate(rows.filter(row => row.deck === 'white-sword' && !row.hybridIsFirst)),
   whiteFirst: rate(rows.filter(row => row.deck === 'white-sword' && row.hybridIsFirst)),
   thinHighEnergy: sum(rows, 'thinHighEnergy'),
   energyShort: sum(rows, 'energyShort'),
   turn4MaxBp: mean(rows, 'turn4MaxBp'),
   turn4Count4000: mean(rows, 'turn4Count4000'),
   firstAttack: mean(rows, 'firstAttack'),
   firstRaid: mean(rows, 'firstRaid'),
   firstConnect: mean(rows, 'firstConnect'),
   apLeft: meanOf(rows, row => row.turns ? row.apLeft / row.turns : null),
   ownLife: meanOf(rows, row => row.finished ? row.life[row.hybridSeat] : null),
   oppLife: meanOf(rows, row => row.finished ? row.life[1 - row.hybridSeat] : null),
   phaseErrors: sum(rows, 'phaseErrors'),
   abandonedKills: sum(rows, 'abandonedKills'),
   overNodes: sum(rows, 'overNodes'),
   illegal: sum(rows, 'illegal'),
   unfinished: rows.filter(row => !row.finished).length,
   maxNodes: Math.max(0, ...rows.map(row => row.maxNodes || 0)),
   pendingOther: sum(rows, 'pendingOther')
  };
 }
 const safety = name => {
  const arm = report[name];
  return arm.illegal === 0 && arm.unfinished === 0 && arm.phaseErrors === 0
   && arm.abandonedKills === 0 && arm.overNodes === 0 && arm.maxNodes <= 48 && arm.pendingOther === 0;
 };
 const interval = pairedInterval([...bySeed.values()].map(bag => (bag.B - bag.A) / bag.n), 8930);
 report.paired = interval;
 report.safetyA = safety('A');
 report.safetyB = safety('B');
 report.advanceTo8970 = report.safetyA && report.safetyB && report.B.thinHighEnergy < report.A.thinHighEnergy && interval.low > -0.05;
 return report;
}

function main() {
 const lock = loadPaidFrontLock();
 if (lock.namedBeforeResults !== true || lock.nodes !== 48 || lock.ms !== 40 || lock.clock !== 'real') throw new Error('8930 lock moved');
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const jobs = paidFrontJobs(lock);
 if (jobs.length !== 160) throw new Error(`Expected 160 games, got ${jobs.length}`);
 const shard = Number(process.env.AI_V3_SHARD ?? 0);
 const shards = Number(process.env.AI_V3_SHARDS ?? 1);
 const selected = jobs.filter((_, index) => index % shards === shard);
 const pairs = [];
 for (const job of selected) {
  const pair = playPair(decks.get(job.deck), job);
  pairs.push(pair);
  console.log(JSON.stringify({
   shard, seed: job.seed, deck: job.deck, first: job.first, seat: job.hybridSeat,
   A: pair.A.hybridWon, B: pair.B.hybridWon,
   thin: [pair.A.thinHighEnergy, pair.B.thinHighEnergy]
  }));
 }
 const body = {shard, games: pairs.length, pairs, summary: summarizeArms(pairs)};
 const out = process.env.AI_V3_OUT;
 if (out) {
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, JSON.stringify(body));
 }
 console.log(JSON.stringify(body.summary));
}

if (process.argv[1] && process.argv[1].endsWith('ai-v3-paid-front-ab.mjs')) main();
