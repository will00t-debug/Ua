#!/usr/bin/env node
// 8930-8969 curveFront comparison. A is hybrid-main-v1. B adds the default-off
// curveFront factor. Both play frozen ai-v3-beam-1 at 48 nodes and a real 40ms
// clock. The decision tape is written after the timed choice returns. It stores
// the public score row and the action that was dispatched, and then replays
// those actions from the shared opening. It does not clone the match inside
// the search and it is not read by either chooser.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseHybridMainAction, hybridLane, hybridSource, lastHybridRoute, resetHybridDecisionLog, HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {dispatchUniversalAction, legalUniversalActions, universalBp, universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {publicActionBrief, publicRecordLeaks, replayActions} from './ai-v3-decision-log.mjs';
import {pairedInterval} from './ai-v3-paid-front-ab.mjs';

const LOCK_URL = new URL('../audit/ai-v3-curve-front-8930-seed-lock.json', import.meta.url);
const STEPS = 600;
const BUDGET = {nodes: 48, ms: 40, seed: 1, worlds: 1};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function loadCurveFrontLock() {
 return JSON.parse(readFileSync(LOCK_URL, 'utf8'));
}

export function curveFrontJobs(lock = loadCurveFrontLock()) {
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
function round1(value) {
 return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function chooseFor(packs, state, hybridSeat, curveFront) {
 const actor = state.pending?.player ?? state.active;
 const lane = hybridLane(state);
 const legal = legalUniversalActions(packs, state);
 let raw = null;
 let trace = null;
 let source = null;
 let policy = null;
 const problems = [];
 const started = performance.now();
 if (actor === hybridSeat) {
  const options = {actor, ...BUDGET};
  if (curveFront) options.factors = {curveFront: true};
  raw = chooseHybridMainAction(packs, state, options);
  const route = lastHybridRoute();
  source = route?.source || null;
  policy = route?.policy || null;
  trace = source === 'hard' ? lastHardAiTrace() : lastAiV3Trace();
  if (!route || policy !== HYBRID_MAIN_POLICY || route.lane !== lane || source !== hybridSource(lane)
   || route.nodes !== 48 || route.ms !== 40 || route.actor !== actor) problems.push('hybrid-route');
  if (route?.curveSwap && !curveFront) problems.push('curve-swap');
 } else {
  resetAiV3Report();
  raw = chooseAiV3Action(packs, state, {actor, ...BUDGET});
  trace = lastAiV3Trace();
  policy = trace?.policy || null;
  source = 'v3';
  if (policy !== AI_V3_POLICY) problems.push('v3-policy');
 }
 const wallMs = performance.now() - started;
 const action = legal.find(item => same(item, raw)) || null;
 const curveSwap = actor === hybridSeat && lastHybridRoute()?.curveSwap === true;
 return {actor, lane, source, policy, action, trace, problems, legal, wallMs, curveSwap};
}

function recordRow(packs, state, picked, step, ownTurn) {
 const candidates = (picked.trace?.candidates || []).slice(0, 6).map(row => ({
  ...publicActionBrief(packs, state, picked.actor, row.action),
  score: round1(row.score ?? row.search)
 }));
 const row = {
  step, ownTurn, actor: picked.actor, phase: state.phase || null,
  pending: state.pending?.kind || null, source: picked.source, lane: picked.lane,
  nodesUsed: Number.isFinite(picked.trace?.nodesUsed) ? picked.trace.nodesUsed : null,
  reason: picked.trace?.reason || null, rootCut: picked.trace?.rootCut === true,
  wallMs: round1(picked.wallMs),
  chosen: publicActionBrief(packs, state, picked.actor, picked.action),
  candidates, curveSwap: picked.curveSwap === true
 };
 const leak = publicRecordLeaks(row);
 if (leak) throw new Error('decision record leaked ' + leak);
 return row;
}

export function playArm(packs, opened, deck, job, curveFront) {
 let cursor = cloneMatch(opened);
 resetHybridDecisionLog();
 const tally = {
  curveSwaps: 0, energyShort: 0, phaseErrors: 0, abandonedKills: 0,
  overNodes: 0, maxNodes: 0, pendingOther: 0, apLeft: 0, turns: 0,
  turn4MaxBp: null, turn4Count4000: null, firstAttack: null, firstRaid: null, firstConnect: null,
  decisions: 0, leaks: 0
 };
 const actions = [];
 const swaps = [];
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
  try { picked = chooseFor(packs, cursor, job.hybridSeat, curveFront); }
  catch (error) {
   exceptions.push(error?.message || String(error));
   illegal++;
   break;
  }
  try { recordRow(packs, cursor, picked, steps, ownTurn); tally.decisions++; }
  catch (error) {
   tally.leaks++;
   exceptions.push(error?.message || String(error));
  }
  if (picked.problems.length) tally.phaseErrors += picked.problems.length;
  const nodes = Number.isFinite(picked.trace?.nodesUsed) ? picked.trace.nodesUsed : null;
  if (nodes != null) {
   tally.maxNodes = Math.max(tally.maxNodes, nodes);
   if (nodes > 48) tally.overNodes++;
  }
  if (picked.lane === 'pending' && picked.source !== 'v3') tally.pendingOther++;
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
  if (picked.curveSwap) {
   tally.curveSwaps++;
   if (swaps.length < 6) {
    swaps.push({step: steps, ownTurn, turn: cursor.turn, chosen: publicActionBrief(packs, cursor, picked.actor, picked.action)});
   }
  }
  if (actor === job.hybridSeat && !cursor.pending && cursor.phase === 'main') {
   const colors = universalEnergyByColor(packs, cursor, actor) || {};
   const hand = cursor.players[actor].hand || [];
   if (hand.some(card => {
    const data = printed(packs, card);
    return data?.type === 'character' && liveBp(packs, cursor, card) >= 3000 && (Number(data.energy) || 0) > (colors[data.color] || 0);
   })) tally.energyShort++;
  }
  if (actor === job.hybridSeat && picked.action.type === 'attack' && tally.firstAttack == null) tally.firstAttack = ownTurn;
  if (actor === job.hybridSeat && picked.action.type === 'raid' && tally.firstRaid == null) tally.firstRaid = ownTurn;
  if (actor === job.hybridSeat && picked.action.type === 'attack') armed = cursor.players[1 - actor].life.length;
  actions.push(picked.action);
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
 const replay = illegal === 0 ? replayActions(packs, opened, actions) : {ok: false, error: 'illegal'};
 const replayLife = replay.ok ? replay.state.players.map(player => player.life.length) : null;
 const life = cursor.players.map(player => player.life.length);
 const replayOk = replay.ok === true && JSON.stringify(replayLife) === JSON.stringify(life) && replay.state.status === cursor.status;
 const finished = cursor.status === 'finished' && illegal === 0 && !exceptions.length && replayOk && tally.leaks === 0;
 const winner = finished ? cursor.winner : null;
 return {
  deck: deck.id, seed: job.seed, first: job.first, hybridSeat: job.hybridSeat, hybridIsFirst: job.hybridIsFirst,
  curveFront, finished, winner, hybridWon: finished && winner === job.hybridSeat,
  endReason: cursor.endReason || null, life, steps, illegal, exceptions, replayOk, swaps,
  hitStepCap: steps >= STEPS && cursor.status === 'playing',
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
   curveSwaps: sum(rows, 'curveSwaps'),
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
   leaks: sum(rows, 'leaks'),
   replayFailed: rows.filter(row => row.replayOk !== true).length,
   unfinished: rows.filter(row => !row.finished).length,
   maxNodes: Math.max(0, ...rows.map(row => row.maxNodes || 0)),
   pendingOther: sum(rows, 'pendingOther'),
   decisions: sum(rows, 'decisions')
  };
 }
 const safety = name => {
  const arm = report[name];
  return arm.illegal === 0 && arm.unfinished === 0 && arm.phaseErrors === 0
   && arm.abandonedKills === 0 && arm.overNodes === 0 && arm.maxNodes <= 48 && arm.pendingOther === 0
   && arm.leaks === 0 && arm.replayFailed === 0;
 };
 const interval = pairedInterval([...bySeed.values()].map(bag => (bag.B - bag.A) / bag.n), 8930);
 report.paired = interval;
 report.safetyA = safety('A');
 report.safetyB = safety('B');
 const energyOk = report.B.energyShort <= report.A.energyShort + Math.max(10, report.A.energyShort * 0.05);
 report.advanceTo8970 = report.safetyA && report.safetyB && interval.low > -0.05
  && report.B.overall.wins > report.A.overall.wins
  && report.B.whiteSecond.wins >= report.A.whiteSecond.wins
  && energyOk;
 return report;
}

function main() {
 const lock = loadCurveFrontLock();
 if (lock.namedBeforeResults !== true || lock.nodes !== 48 || lock.ms !== 40 || lock.clock !== 'real') throw new Error('8930 curve lock moved');
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const jobs = curveFrontJobs(lock);
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
   A: pair.A.hybridWon, B: pair.B.hybridWon, swaps: pair.B.curveSwaps,
   replay: [pair.A.replayOk, pair.B.replayOk]
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

if (process.argv[1] && process.argv[1].endsWith('ai-v3-curve-front-ab.mjs')) main();
