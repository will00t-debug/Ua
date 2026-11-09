#!/usr/bin/env node
// Benchmark-only hybrid. The default AI v3 policy is not consulted through a
// new switch: a named phase is answered by frozen hard-search-2, and every
// other decision stays on AI v3. Legal actions are read again at each step.
//
//   node scripts/ai-v3-phase-hybrid.mjs
//   AI_V3_SHARD=0 AI_V3_SHARDS=4 node scripts/ai-v3-phase-hybrid.mjs
//   AI_V3_MERGE=1 node scripts/ai-v3-phase-hybrid.mjs
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {matchGrid} from '../dist/universal-v2/ai-v3/compare.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {legalUniversalActions, dispatchUniversalAction, universalBp, universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction, resetHardAiReport, HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';

export const PHASE_MODES = ['v3', 'hard', 'start', 'move', 'main', 'battle', 'pending'];
export const PHASE_TITLES = ['white-sword', 'sword-art-online-raid', 'steins-gate-raid'];
export const PHASE_SEEDS = [8401, 8402];
const SEARCH = {nodes: 48, ms: 1e9, seed: 1, plan: 'tree'};
const STEPS = 400;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Legal lists omit empty fields. The search root copies the same action with
// explicit nulls. Identity ignores that shape difference.
export function actionKey(action) {
 if (!action || typeof action !== 'object') return '';
 return ['type', 'line', 'mode', 'uid', 'baseUid', 'slot', 'to', 'index', 'choice', 'target', 'zone']
  .map(key => action[key] ?? '').join('|');
}

export function laneOf(state) {
 if (state?.pending) return 'pending';
 if (state?.phase === 'start') return 'start';
 if (state?.phase === 'move') return 'move';
 if (state?.phase === 'main') return 'main';
 if (state?.phase === 'attack') return 'battle';
 return 'other';
}

// 'hard' and 'v3' are the two reference policies. A phase name uses hard only
// while the live decision is in that phase. Pending choices, including blocks,
// triggers, discards and life targets, are the pending lane. Attack selection
// is the idle attack phase.
export function sourceFor(mode, lane) {
 if (mode === 'hard') return 'hard';
 if (mode === 'v3') return 'v3';
 return mode === lane ? 'hard' : 'v3';
}

function label(action) {
 if (!action) return 'none';
 if (action.type === 'play') return `play:${action.line || ''}:${action.uid || ''}`;
 if (action.type === 'raid') return `raid:${action.line || ''}:${action.uid || ''}`;
 if (action.type === 'attack') return `attack:${action.uid || ''}`;
 if (action.type === 'move') return `move:${action.uid || ''}:${action.to || ''}`;
 if (action.type === 'extraDraw') return 'extraDraw';
 if (action.type === 'next') return 'next';
 if (action.type === 'activate') return `activate:${action.uid || ''}`;
 if (action.type === 'event') return `event:${action.uid || ''}`;
 if (action.type === 'chooseBlock') return action.uid == null ? 'block-pass' : `block:${action.uid}`;
 return `${action.type}:${action.uid || action.mode || ''}`;
}

function readyAp(player) {
 return (player?.apCards || []).filter(card => card && card.inPlay && card.ready).length;
}

function payableCount(pack, state, player) {
 const colors = universalEnergyByColor(pack, state, player) || {};
 const cards = pack.cards || {};
 let count = 0;
 for (const card of state.players[player].hand || []) {
  const printed = cards[card?.cardId];
  if (!printed) continue;
  if ((Number(printed.energy) || 0) <= (colors[printed.color] || 0)) count++;
 }
 return count;
}

function frontView(pack, state, player) {
 const front = (state.players[player].front || []).filter(Boolean);
 const bp = front.reduce((sum, card) => sum + (Number(universalBp(pack, state, card)) || 0), 0);
 return {count: front.length, bp};
}

function colorsOf(pack, state, player) {
 const colors = universalEnergyByColor(pack, state, player) || {};
 return Object.fromEntries(Object.entries(colors).filter(([, value]) => value));
}

export function chooseDecision(packs, state, mode, seat = null) {
 const actor = state.pending?.player ?? state.active;
 const lane = laneOf(state);
 // The swapped phase applies only to the measured seat. The other seat is
 // always frozen hard-search-2, including in the pure v3 reference.
 const source = seat == null || actor === seat ? sourceFor(mode, lane) : 'hard';
 const legal = legalUniversalActions(packs, state);
 let raw = null;
 let trace = null;
 if (source === 'hard') {
  resetHardAiReport();
  raw = chooseStrengthenedHardAction(packs, state, {nodes: SEARCH.nodes, ms: SEARCH.ms, seed: SEARCH.seed});
 } else {
  resetAiV3Report();
  raw = chooseAiV3Action(packs, state, {actor, ...MATCH_LIMITS, ...SEARCH});
  trace = lastAiV3Trace();
 }
 const action = legal.find(item => same(item, raw)) || null;
 return {
  actor, lane, source, action, legal: !!action, legalCount: legal.length,
  reason: trace?.reason || null,
  fallbackKind: trace?.fallbackKind || null,
  nodesUsed: Number.isFinite(trace?.nodesUsed) ? trace.nodesUsed : null,
  trace
 };
}

export function coversRoot(root, action) {
 const planned = root?.action || root;
 if (!planned || !action) return false;
 if (actionKey(planned) === actionKey(action)) return true;
 // The root copy of a play omits the destination slot. The card and line match.
 if (planned.slot == null && action.type === 'play' && planned.type === 'play'
  && (planned.line || '') === (action.line || '') && (planned.uid ?? '') === (action.uid ?? '')) return true;
 return false;
}

function inRoots(trace, action) {
 const planned = trace?.rootPlan || [];
 return planned.some(note => coversRoot(note, action));
}

function blankTurn(turn, state, seat, pack) {
 const mine = state.players[seat];
 const front = frontView(pack, state, seat);
 return {
  turn, apReady: readyAp(mine), apLeft: null,
  energy: colorsOf(pack, state, seat),
  front: front.count, frontBp: front.bp,
  attacks: 0, connecting: 0, raids: 0,
  hand: mine.hand.length, payable: payableCount(pack, state, seat),
  life: state.players.map(player => player.life.length)
 };
}

function closeTurn(turn, state, seat, pack) {
 const mine = state.players[seat];
 const front = frontView(pack, state, seat);
 turn.apLeft = readyAp(mine);
 turn.energy = colorsOf(pack, state, seat);
 turn.front = front.count;
 turn.frontBp = front.bp;
 turn.hand = mine.hand.length;
 turn.payable = payableCount(pack, state, seat);
 turn.life = state.players.map(player => player.life.length);
}

function playFrom(packs, state, seat, mode, reference) {
 let cursor = state;
 const script = [];
 const turns = [];
 let open = null;
 let watch = null;
 let illegal = 0;
 let fallbacks = 0;
 let v3Decisions = 0;
 let hardDecisions = 0;
 let firstDiff = null;
 const laneChoices = {};
 let steps = 0;
 while (cursor.status === 'playing' && steps < STEPS) {
  const beforeActor = cursor.pending?.player ?? cursor.active;
  if (beforeActor === seat && cursor.phase === 'start' && !cursor.pending && !open) {
   open = blankTurn(cursor.turn, cursor, seat, packs[seat]);
  }
  const picked = chooseDecision(packs, cursor, mode, seat);
  if (picked.actor === seat) {
   if (picked.source === 'hard') hardDecisions++;
   else v3Decisions++;
   if (picked.legalCount > 1) laneChoices[picked.lane] = (laneChoices[picked.lane] || 0) + 1;
   if (picked.reason === 'budget-fallback') fallbacks++;
  }
  const prior = reference?.[steps] || null;
  if (prior && !same(prior.action, picked.action) && !firstDiff) {
   let trace = picked.trace;
   let v3Reason = picked.reason;
   let v3Fallback = picked.fallbackKind;
   if (picked.source === 'hard') {
    const reviewed = chooseDecision(packs, cursor, 'v3');
    trace = reviewed.trace;
    v3Reason = reviewed.reason;
    v3Fallback = reviewed.fallbackKind;
   }
   firstDiff = {
    step: steps, actor: picked.actor, lane: picked.lane, source: picked.source,
    pending: cursor.pending?.kind || null, phase: cursor.phase,
    v3: label(prior.action), hybrid: label(picked.action),
    v3Reason, v3Fallback,
    hybridInV3Roots: inRoots(trace, picked.action),
    life: cursor.players.map(player => player.life.length),
    ap: readyAp(cursor.players[seat]),
    energy: colorsOf(packs[seat], cursor, seat)
   };
  }
  if (!picked.action) { illegal++; break; }
  const opp = 1 - seat;
  const lifeBefore = cursor.players[opp].life.length;
  if (picked.actor === seat && picked.action.type === 'attack') {
   if (open) open.attacks++;
   watch = lifeBefore;
  }
  if (picked.actor === seat && picked.action.type === 'raid' && open) open.raids++;
  try { cursor = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor}); }
  catch { illegal++; break; }
  if (watch != null && cursor.players[opp].life.length < watch) {
   if (open) open.connecting++;
   watch = null;
  }
  script.push({action: picked.action, lane: picked.lane});
  const afterActor = cursor.status === 'playing' ? (cursor.pending?.player ?? cursor.active) : null;
  if (open && (afterActor !== seat || cursor.status !== 'playing')) {
   closeTurn(open, cursor, seat, packs[seat]);
   turns.push(open);
   open = null;
   watch = null;
  }
  steps++;
 }
 if (open) {
  closeTurn(open, cursor, seat, packs[seat]);
  turns.push(open);
 }
 const life = cursor.players.map(player => player.life.length);
 const totals = turns.reduce((bag, turn) => {
  bag.apReady += turn.apReady;
  bag.apLeft += turn.apLeft || 0;
  bag.attacks += turn.attacks;
  bag.connecting += turn.connecting;
  bag.raids += turn.raids;
  bag.turns++;
  return bag;
 }, {apReady: 0, apLeft: 0, attacks: 0, connecting: 0, raids: 0, turns: 0});
 const last = turns.at(-1) || null;
 return {
  mode, steps, illegal, finished: cursor.status === 'finished', winner: cursor.winner,
  endReason: cursor.endReason || null, life,
  challengerWon: cursor.status === 'finished' && cursor.winner === seat,
  fallbacks, v3Decisions, hardDecisions, laneChoices, firstDiff, turns, totals,
  lastEnergy: last?.energy || {}, lastFront: last?.front ?? null, lastFrontBp: last?.frontBp ?? null,
  lastHand: last?.hand ?? null, lastPayable: last?.payable ?? null,
  script: mode === 'v3' ? script : undefined
 };
}

export function jobsOf(decks) {
 const rows = [];
 for (const deck of decks) {
  if (!PHASE_TITLES.includes(deck.id)) continue;
  for (const seed of PHASE_SEEDS) {
   for (const plan of matchGrid(seed)) {
    rows.push({deck, seed, first: plan.first, challengerSeat: plan.challengerSeat});
   }
  }
 }
 return rows;
}

function playJob(job, modes) {
 const packs = [job.deck.pack, job.deck.pack];
 const opened = applySharedOpening(packs, newComparedMatch(
  packs, [job.deck.counts, job.deck.counts], job.seed, job.first));
 const games = [];
 let reference = null;
 for (const mode of modes) {
  const started = performance.now();
  const game = playFrom(packs, cloneMatch(opened.state), job.challengerSeat, mode, reference);
  game.deck = job.deck.id;
  game.seed = job.seed;
  game.first = job.first;
  game.challengerSeat = job.challengerSeat;
  game.opening = opened.choices;
  game.seconds = Math.round((performance.now() - started) / 100) / 10;
  if (mode === 'v3') reference = game.script;
  delete game.script;
  games.push(game);
  console.error('game', job.deck.id, job.seed, job.first, job.challengerSeat, mode,
   game.challengerWon ? 'win' : 'loss', game.life.join('-'), game.steps, game.seconds + 's');
 }
 return games;
}

function mean(values) {
 return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function pairedRelative(base, other) {
 const groups = new Map();
 const key = row => `${row.deck}|${row.seed}|${row.first}`;
 for (const row of [...base, ...other]) {
  const list = groups.get(key(row)) || [];
  list.push(row);
  groups.set(key(row), list);
 }
 const diffs = [];
 for (const list of groups.values()) {
  const left = list.filter(row => base.includes(row));
  const right = list.filter(row => other.includes(row));
  if (left.length !== 2 || right.length !== 2) continue;
  if ([...left, ...right].some(row => !row.finished || row.winner !== 0 && row.winner !== 1)) continue;
  const win = rows => rows.filter(row => row.challengerWon).length / rows.length;
  diffs.push(win(right) - win(left));
 }
 if (!diffs.length) return {n: 0, mean: null, low: null, high: null, containsZero: null};
 const boots = [];
 for (let i = 0; i < 1000; i++) {
  let sum = 0;
  for (let j = 0; j < diffs.length; j++) sum += diffs[Math.floor(Math.random() * diffs.length)];
  boots.push(sum / diffs.length);
 }
 boots.sort((a, b) => a - b);
 const point = mean(diffs);
 return {n: diffs.length, mean: point, low: boots[25], high: boots[974], containsZero: boots[25] <= 0 && boots[974] >= 0};
}

function recordOf(rows) {
 const wins = rows.filter(row => row.challengerWon).length;
 const done = rows.filter(row => row.finished).length;
 return {wins, losses: done - wins, unfinished: rows.length - done, illegal: rows.reduce((sum, row) => sum + row.illegal, 0)};
}

function num(row, key) {
 const value = row.totals?.[key];
 return Number.isFinite(value) ? value : 0;
}

function resourceDelta(base, other) {
 const byKey = new Map(base.map(row => [`${row.deck}|${row.seed}|${row.first}|${row.challengerSeat}`, row]));
 const keys = ['attacks', 'connecting', 'raids', 'apLeft', 'apReady', 'fallbacks'];
 const bags = Object.fromEntries(keys.map(key => [key, []]));
 const life = [];
 const oppLife = [];
 for (const row of other) {
  const prior = byKey.get(`${row.deck}|${row.seed}|${row.first}|${row.challengerSeat}`);
  if (!prior) continue;
  for (const key of keys) {
   const left = key === 'fallbacks' ? prior.fallbacks : num(prior, key);
   const right = key === 'fallbacks' ? row.fallbacks : num(row, key);
   bags[key].push(right - left);
  }
  life.push((row.life?.[row.challengerSeat] || 0) - (prior.life?.[prior.challengerSeat] || 0));
  oppLife.push((row.life?.[1 - row.challengerSeat] || 0) - (prior.life?.[1 - prior.challengerSeat] || 0));
 }
 const out = {};
 for (const key of keys) out[key] = {n: bags[key].length, mean: mean(bags[key])};
 out.ownLife = {n: life.length, mean: mean(life)};
 out.oppLife = {n: oppLife.length, mean: mean(oppLife)};
 return out;
}

function flipsOf(base, other) {
 const byKey = new Map(base.map(row => [`${row.deck}|${row.seed}|${row.first}|${row.challengerSeat}`, row]));
 const gained = [];
 const lost = [];
 for (const row of other) {
  const prior = byKey.get(`${row.deck}|${row.seed}|${row.first}|${row.challengerSeat}`);
  if (!prior || !prior.finished || !row.finished) continue;
  if (!prior.challengerWon && row.challengerWon) gained.push(briefGame(row, prior));
  if (prior.challengerWon && !row.challengerWon) lost.push(briefGame(row, prior));
 }
 return {gained, lost};
}

function briefGame(row, prior) {
 return {
  deck: row.deck, seed: row.seed, first: row.first, seat: row.challengerSeat,
  v3Life: prior.life, hybridLife: row.life,
  firstDiff: row.firstDiff
 };
}

export function summarizeGames(games, baseline) {
 const modes = [...new Set(games.map(row => row.mode))];
 const v3 = games.filter(row => row.mode === 'v3');
 const byMode = {};
 for (const mode of modes) {
  const rows = games.filter(row => row.mode === mode);
  const byDeck = {};
  for (const title of PHASE_TITLES) {
   const slice = rows.filter(row => row.deck === title);
   byDeck[title] = recordOf(slice);
  }
  const first = {};
  let outsideRoots = 0;
  let insideRoots = 0;
  let compared = 0;
  for (const row of rows) {
   if (!row.firstDiff) continue;
   compared++;
   const key = `${row.firstDiff.lane}|${row.firstDiff.v3}->${row.firstDiff.hybrid}`;
   first[key] = (first[key] || 0) + 1;
   if (row.firstDiff.hybridInV3Roots === true) insideRoots++;
   else if (row.firstDiff.hybridInV3Roots === false) outsideRoots++;
  }
  byMode[mode] = {
   ...recordOf(rows), byDeck,
   fallbacks: rows.reduce((sum, row) => sum + row.fallbacks, 0),
   relativeToV3: mode === 'v3' ? null : pairedRelative(v3, rows),
   resourcesVersusV3: mode === 'v3' ? null : resourceDelta(v3, rows),
   flips: mode === 'v3' ? null : flipsOf(v3, rows),
   firstDiffGames: compared,
   firstDiffInSwappedLane: rows.filter(row => row.firstDiff && row.firstDiff.lane === mode).length,
   hybridActionInsideV3Roots: insideRoots,
   hybridActionOutsideV3Roots: outsideRoots,
   firstDiffPairs: first
  };
 }
 let reproduced = null;
 if (baseline) {
  let matched = 0;
  let missed = 0;
  const misses = [];
  for (const row of v3) {
   const saved = baseline.titles?.[row.deck]?.byMode?.tree?.games?.find(item =>
    item.seed === row.seed && item.first === row.first && item.challengerSeat === row.challengerSeat);
   if (!saved) { missed++; continue; }
   const sameLife = saved.life?.[0] === row.life?.[0] && saved.life?.[1] === row.life?.[1];
   const ok = saved.winner === row.winner && sameLife && saved.challengerWon === row.challengerWon;
   if (ok) matched++;
   else { missed++; misses.push({deck: row.deck, seed: row.seed, first: row.first, seat: row.challengerSeat, saved: saved.life, live: row.life, savedWinner: saved.winner, liveWinner: row.winner}); }
  }
  reproduced = {matched, missed, misses};
 }
 return {
  base: '340f781e3ea8314bf011622730a77a9ca948872b',
  rules: 'official', opponent: HARD_AI_POLICY, searchSeed: SEARCH.seed,
  nodes: SEARCH.nodes, clock: '1e9', liveBudget: MATCH_LIMITS,
  hardPolicy: HARD_AI_POLICY, defaultAi: 'unchanged',
  seeds: PHASE_SEEDS, titles: PHASE_TITLES,
  note: 'A phase swap changes the later state. The win gap is the whole continuation, not the effect of one decision. Hidden deck order is not a strategy input; belief worlds keep search seed 1.',
  lanes: {
   start: 'idle start: extraDraw or next',
   move: 'idle move: front and energy moves',
   main: 'idle main: play, raid, event, activate',
   battle: 'idle attack: attack choice and passing',
   pending: 'any pending, including block, trigger, discard and life target'
  },
  reproduced, byMode
 };
}

function shardPath(shard) {
 return new URL(`../audit/ai-v3-phase-hybrid-shard-${shard}.json`, import.meta.url);
}

function cardIdOf(pack, state, uid) {
 if (!uid) return null;
 for (const player of state.players) {
  for (const zone of ['hand', 'front', 'energy', 'outside', 'removed', 'life']) {
   const card = (player[zone] || []).find(item => item?.uid === uid);
   if (card) return card.cardId || null;
  }
 }
 return null;
}

export function annotateRoots(games, decks) {
 const byId = new Map(decks.map(deck => [deck.id, deck]));
 const baseline = JSON.parse(readFileSync(new URL('../audit/ai-v3-hold-info-8401-baseline.json', import.meta.url), 'utf8'));
 for (const game of games) {
  if (!game.firstDiff || game.mode === 'v3') continue;
  const deck = byId.get(game.deck);
  const saved = baseline.titles[game.deck].byMode.tree.games.find(item =>
   item.seed === game.seed && item.first === game.first && item.challengerSeat === game.challengerSeat);
  const packs = [deck.pack, deck.pack];
  let state = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], game.seed, game.first)).state;
  for (const played of saved.actions) {
   if (played.step === game.firstDiff.step) break;
   const actor = state.pending?.player ?? state.active;
   const legal = legalUniversalActions(packs, state);
   const action = legal.find(item => same(item, played.action));
   if (!action) throw Error('replay ' + game.deck + ' ' + played.step);
   state = dispatchUniversalAction(packs, state, action, {actor});
  }
  const reviewed = chooseDecision(packs, state, 'v3', game.challengerSeat);
  const plan = reviewed.trace?.rootPlan || [];
  const roots = plan.map(note => actionKey(note.action || note));
  const legal = legalUniversalActions(packs, state);
  const hits = legal.filter(item => label(item) === game.firstDiff.hybrid);
  const matched = hits.length === 1 ? hits[0] : null;
  game.firstDiff.hybridInV3Roots = matched ? roots.includes(actionKey(matched)) : null;
  game.firstDiff.v3InRoots = roots.includes(actionKey(reviewed.action));
  game.firstDiff.rootLabels = plan.map(note => label(note.action || note));
  game.firstDiff.hybridCard = matched ? cardIdOf(deck.pack, state, matched.uid) : null;
  game.firstDiff.v3Card = cardIdOf(deck.pack, state, reviewed.action?.uid);
  game.firstDiff.sameCard = !!(game.firstDiff.hybridCard && game.firstDiff.hybridCard === game.firstDiff.v3Card);
  console.error('root', game.mode, game.deck, game.seed, game.first, game.challengerSeat,
   game.firstDiff.hybridInV3Roots ? 'in' : 'out', game.firstDiff.v3, '->', game.firstDiff.hybrid);
 }
 return games;
}

function main() {
 if (process.env.AI_V3_ROOTCHECK === '1') {
  const saved = JSON.parse(readFileSync(new URL('../audit/ai-v3-phase-hybrid.json', import.meta.url), 'utf8'));
  annotateRoots(saved.games, battleDecks());
  const baseline = JSON.parse(readFileSync(new URL('../audit/ai-v3-hold-info-8401-baseline.json', import.meta.url), 'utf8'));
  const summary = summarizeGames(saved.games, baseline);
  writeFileSync(new URL('../audit/ai-v3-phase-hybrid.json', import.meta.url), JSON.stringify(saved));
  writeFileSync(new URL('../audit/ai-v3-phase-hybrid-summary.json', import.meta.url), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary.byMode, null, 2));
  return;
 }
 if (process.env.AI_V3_MERGE === '1') {
  const shards = Number(process.env.AI_V3_SHARDS || 4);
  const games = [];
  for (let shard = 0; shard < shards; shard++) games.push(...JSON.parse(readFileSync(shardPath(shard), 'utf8')));
  const baseline = JSON.parse(readFileSync(new URL('../audit/ai-v3-hold-info-8401-baseline.json', import.meta.url), 'utf8'));
  const summary = summarizeGames(games, baseline);
  mkdirSync(new URL('../audit/', import.meta.url), {recursive: true});
  writeFileSync(new URL('../audit/ai-v3-phase-hybrid.json', import.meta.url), JSON.stringify({summary, games}));
  writeFileSync(new URL('../audit/ai-v3-phase-hybrid-summary.json', import.meta.url), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  return;
 }
 const shard = Number(process.env.AI_V3_SHARD || 0);
 const shards = Number(process.env.AI_V3_SHARDS || 1);
 const only = process.env.AI_V3_ONLY || '';
 const modes = (process.env.AI_V3_MODES || PHASE_MODES.join(',')).split(',').filter(Boolean);
 let jobs = jobsOf(battleDecks());
 if (only) {
  const [deck, seed, first, seat] = only.split('|');
  jobs = jobs.filter(job => job.deck.id === deck && String(job.seed) === seed && String(job.first) === first && String(job.challengerSeat) === seat);
 }
 jobs = jobs.filter((_, index) => index % shards === shard);
 const games = jobs.flatMap(job => playJob(job, modes));
 if (shards > 1) writeFileSync(shardPath(shard), JSON.stringify(games));
 else {
  const summary = summarizeGames(games, null);
  console.log(JSON.stringify({summary, games}, null, 2));
 }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
