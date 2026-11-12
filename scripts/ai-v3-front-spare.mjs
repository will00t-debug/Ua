// Exposed-set table for the default-off frontSpare beam slot.
// 8401–8402 and 8500–8502, both seats, both orders, three decks.
// The search seed stays 1. This does not change the live AI.
import {readFileSync, writeFileSync, readdirSync, unlinkSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {dispatchUniversalAction, legalUniversalActions, universalBp, universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction, resetHardAiReport} from '../dist/universal-v2/hard-ai.mjs';

const DECKS = ['white-sword', 'sword-art-online-raid', 'steins-gate-raid'];
const SEEDS = (process.env.AI_V3_SEEDS || '8401,8402,8500,8501,8502').split(',').map(Number);
const MODES = (process.env.AI_V3_MODES || 'v3,spare').split(',');
const SEARCH = {
 nodes: 48,
 ms: Number(process.env.AI_V3_MS || 1e9),
 seed: 1,
 plan: 'tree',
 ...(process.env.AI_V3_MS ? {} : {now: () => 0})
};
const STEPS = 400;
const shard = process.env.AI_V3_SHARD == null ? null : Number(process.env.AI_V3_SHARD);
const shards = Number(process.env.AI_V3_SHARDS || 1);

function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function label(action) {
 if (!action) return 'none';
 if (action.type === 'play') return `play:${action.line || ''}:${action.uid || ''}`;
 if (action.type === 'raid') return `raid:${action.line || ''}:${action.uid || ''}`;
 return `${action.type}:${action.uid || action.mode || ''}`;
}
function category(action) {
 if (action?.type === 'play' && action.line === 'front') return 'front';
 if (action?.type === 'play' && action.line === 'energy') return 'energy';
 if (action?.type === 'raid') return 'raid';
 return 'other';
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
 return {count: front.length, bp: front.reduce((sum, card) => sum + (Number(universalBp(pack, state, card)) || 0), 0)};
}
function colorsOf(pack, state, player) {
 const colors = universalEnergyByColor(pack, state, player) || {};
 return Object.fromEntries(Object.entries(colors).filter(([, value]) => value));
}
function percentile(values, index) {
 const sorted = [...values].sort((a, b) => a - b);
 if (!sorted.length) return null;
 return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}
function provenKill(trace, legal) {
 const rows = trace?.candidates?.length ? trace.candidates : (trace?.compared || []);
 return rows.find(row => row?.executed !== false && row.boundary === 'terminal' && row.search >= 90000
  && legal.some(action => same(action, row.action))) || null;
}

function chooseDecision(packs, state, mode, seat) {
 const actor = state.pending?.player ?? state.active;
 const legal = legalUniversalActions(packs, state);
 const started = Date.now();
 let raw = null;
 let trace = null;
 let source = 'hard';
 if (actor === seat) {
  source = 'v3';
  resetAiV3Report();
  raw = chooseAiV3Action(packs, state, {
   actor, ...MATCH_LIMITS, ...SEARCH,
   ...(mode === 'spare' ? {factors: {frontSpare: true}} : {})
  });
  trace = lastAiV3Trace();
 } else {
  resetHardAiReport();
  raw = chooseStrengthenedHardAction(packs, state, {nodes: SEARCH.nodes, ms: SEARCH.ms, seed: SEARCH.seed});
 }
 const elapsed = Date.now() - started;
 const action = legal.find(item => same(item, raw)) || null;
 const kill = source === 'v3' ? provenKill(trace, legal) : null;
 return {
  actor, source, action, legal: !!action, elapsed,
  reason: trace?.reason || null,
  fallbackKind: trace?.fallbackKind || null,
  nodesUsed: Number.isFinite(trace?.nodesUsed) ? trace.nodesUsed : null,
  kill: kill ? label(kill.action) : null,
  abandonedKill: !!(kill && !same(action, kill.action))
 };
}

function play(packs, state, seat, mode) {
 let cursor = state;
 const script = [];
 const turns = [];
 let open = null;
 let illegal = 0;
 let fallbacks = 0;
 let abandoned = 0;
 let decisions = 0;
 let nodes = 0;
 const times = [];
 const choices = {front: 0, energy: 0, raid: 0, other: 0};
 let steps = 0;
 while (cursor.status === 'playing' && steps < STEPS) {
  const before = cursor.pending?.player ?? cursor.active;
  if (before === seat && cursor.phase === 'start' && !cursor.pending && !open) {
   const front = frontView(packs[seat], cursor, seat);
   open = {
    turn: cursor.turn, apReady: readyAp(cursor.players[seat]), apLeft: null,
    energy: colorsOf(packs[seat], cursor, seat), front: front.count, frontBp: front.bp,
    attacks: 0, raids: 0, hand: cursor.players[seat].hand.length,
    payable: payableCount(packs[seat], cursor, seat),
    life: cursor.players.map(player => player.life.length)
   };
  }
  const picked = chooseDecision(packs, cursor, mode, seat);
  if (!picked.action) illegal++;
  if (picked.source === 'v3') {
   decisions++;
   if (picked.nodesUsed != null) nodes += picked.nodesUsed;
   times.push(picked.elapsed);
   if (picked.fallbackKind) fallbacks++;
   if (picked.abandonedKill) abandoned++;
   choices[category(picked.action)]++;
   if (open && picked.action?.type === 'attack') open.attacks++;
   if (open && picked.action?.type === 'raid') open.raids++;
  }
  script.push({step: steps, actor: picked.actor, action: picked.action, label: label(picked.action), kill: picked.kill});
  if (picked.action) {
   try { cursor = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor}); }
   catch { illegal++; }
  }
  steps++;
  const ended = before === seat && ((cursor.pending?.player ?? cursor.active) !== seat || cursor.status !== 'playing');
  if (open && ended) {
   const front = frontView(packs[seat], cursor, seat);
   open.apLeft = readyAp(cursor.players[seat]);
   open.energy = colorsOf(packs[seat], cursor, seat);
   open.front = front.count;
   open.frontBp = front.bp;
   open.hand = cursor.players[seat].hand.length;
   open.payable = payableCount(packs[seat], cursor, seat);
   open.life = cursor.players.map(player => player.life.length);
   turns.push(open);
   open = null;
  }
 }
 return {
  winner: cursor.winner, life: cursor.players.map(player => player.life.length),
  unfinished: cursor.status === 'playing', illegal, fallbacks, abandoned, decisions, nodes,
  decisionMs: {count: times.length, sum: times.reduce((sum, value) => sum + value, 0), p50: percentile(times, Math.floor((times.length - 1) / 2)), p95: percentile(times, Math.floor((times.length - 1) * 0.95))},
  choices, turns, script
 };
}

function cells() {
 const rows = [];
 for (const seed of SEEDS) for (const first of [0, 1]) for (const seat of [0, 1]) {
  for (const deck of DECKS) rows.push({deck, seed, first, seat});
 }
 return rows.filter((_, index) => shard == null || index % shards === shard);
}

function run() {
 const decks = new Map(battleDecks().filter(deck => DECKS.includes(deck.id)).map(deck => [deck.id, deck]));
 const games = [];
 for (const cell of cells()) {
  const deck = decks.get(cell.deck);
  const packs = [deck.pack, deck.pack];
  const shared = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], cell.seed, cell.first));
  const byMode = {};
  for (const mode of MODES) {
   const started = Date.now();
   byMode[mode] = play(packs, cloneMatch(shared.state), cell.seat, mode);
   byMode[mode].seconds = Math.round((Date.now() - started) / 100) / 10;
  }
  let firstDiff = null;
  if (byMode.v3 && byMode.spare) {
   const length = Math.max(byMode.v3.script.length, byMode.spare.script.length);
   for (let index = 0; index < length; index++) {
    const left = byMode.v3.script[index];
    const right = byMode.spare.script[index];
    if (left?.label === right?.label && left?.actor === right?.actor) continue;
    if ((left?.actor ?? right?.actor) !== cell.seat) continue;
    firstDiff = {
     step: left?.step ?? right?.step, v3: left?.label || 'none', spare: right?.label || 'none',
     v3Kill: left?.kill || null, spareKill: right?.kill || null,
     abandoned: !!(left?.kill && right?.label !== left.kill)
    };
    break;
   }
  }
  for (const mode of MODES) delete byMode[mode].script;
  games.push({...cell, byMode, firstDiff});
  const base = byMode.v3;
  const next = byMode.spare;
  const mark = base && next ? `${base.winner === cell.seat ? 'W' : 'L'}/${next.winner === cell.seat ? 'W' : 'L'}` : 'done';
  console.error(`${cell.deck} ${cell.seed} first ${cell.first} seat ${cell.seat} ${mark} ${firstDiff ? firstDiff.v3 + ' -> ' + firstDiff.spare : 'same'}`);
 }
 return games;
}

function mean(rows, read) {
 const values = rows.map(read).filter(value => Number.isFinite(value));
 return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
function paired(games) {
 const pairs = new Map();
 for (const game of games) {
  const key = `${game.deck}|${game.seed}|${game.first}`;
  const list = pairs.get(key) || [];
  list.push(game);
  pairs.set(key, list);
 }
 const deltas = [];
 let skipped = 0;
 for (const list of pairs.values()) {
  if (list.length !== 2) { skipped++; continue; }
  const rows = list.flatMap(game => [game.byMode.v3, game.byMode.spare]);
  if (rows.some(row => row.unfinished || (row.winner !== 0 && row.winner !== 1))) { skipped++; continue; }
  const rate = mode => list.filter(game => game.byMode[mode].winner === game.seat).length / list.length;
  deltas.push(rate('spare') - rate('v3'));
 }
 if (!deltas.length) return {pairs: 0, skipped, delta: null, low: null, high: null, containsZero: null};
 const boots = [];
 for (let sample = 0; sample < 1000; sample++) {
  let total = 0;
  for (let index = 0; index < deltas.length; index++) total += deltas[Math.floor(Math.random() * deltas.length)];
  boots.push(total / deltas.length);
 }
 boots.sort((a, b) => a - b);
 return {pairs: deltas.length, skipped, delta: mean(deltas, value => value), low: boots[25], high: boots[974], containsZero: boots[25] <= 0 && boots[974] >= 0};
}
function record(games, mode) {
 return games.reduce((count, game) => count + (game.byMode[mode].winner === game.seat ? 1 : 0), 0);
}
function summarize(games) {
 const modes = [...new Set(games.flatMap(game => Object.keys(game.byMode)))];
 const byMode = {};
 for (const mode of modes) {
  byMode[mode] = {
   wins: record(games, mode), games: games.length,
   illegal: games.reduce((sum, game) => sum + game.byMode[mode].illegal, 0),
   unfinished: games.filter(game => game.byMode[mode].unfinished).length,
   abandonedKills: games.reduce((sum, game) => sum + game.byMode[mode].abandoned, 0),
   fallbacks: mean(games, game => game.byMode[mode].fallbacks),
   nodes: mean(games, game => game.byMode[mode].nodes),
   decisions: mean(games, game => game.byMode[mode].decisions),
   decisionP50: mean(games, game => game.byMode[mode].decisionMs.p50),
   decisionP95: mean(games, game => game.byMode[mode].decisionMs.p95),
   choices: {
    front: mean(games, game => game.byMode[mode].choices.front),
    energy: mean(games, game => game.byMode[mode].choices.energy),
    raid: mean(games, game => game.byMode[mode].choices.raid)
   },
   apLeft: mean(games, game => mean(game.byMode[mode].turns, turn => turn.apLeft)),
   attacks: mean(games, game => game.byMode[mode].turns.reduce((sum, turn) => sum + turn.attacks, 0)),
   raids: mean(games, game => game.byMode[mode].turns.reduce((sum, turn) => sum + turn.raids, 0)),
   ownLife: mean(games, game => game.byMode[mode].life[game.seat]),
   oppLife: mean(games, game => game.byMode[mode].life[1 - game.seat])
  };
 }
 const decks = {};
 for (const deck of DECKS) {
  const rows = games.filter(game => game.deck === deck);
  decks[deck] = Object.fromEntries(modes.map(mode => [mode, `${record(rows, mode)}-${rows.length - record(rows, mode)}`]));
 }
 const flips = games.filter(game => game.byMode.v3 && game.byMode.spare && (game.byMode.v3.winner === game.seat) !== (game.byMode.spare.winner === game.seat))
  .map(game => ({deck: game.deck, seed: game.seed, first: game.first, seat: game.seat, from: game.byMode.v3.winner === game.seat ? 'win' : 'loss', to: game.byMode.spare.winner === game.seat ? 'win' : 'loss', firstDiff: game.firstDiff}));
 return {games: games.length, seeds: SEEDS, ms: SEARCH.ms, byMode, decks, paired: games.some(game => game.byMode.spare) ? paired(games) : null, flips, changed: games.filter(game => game.firstDiff).length};
}

const merge = process.argv.includes('--merge');
if (merge) {
 const files = readdirSync('audit').filter(name => /^ai-v3-front-spare-shard-\d+\.json$/.test(name)).sort();
 const games = files.flatMap(name => JSON.parse(readFileSync(`audit/${name}`, 'utf8')));
 const summary = summarize(games);
 writeFileSync('audit/ai-v3-front-spare.json', JSON.stringify({generatedAt: new Date().toISOString(), summary, games}, null, 2));
 writeFileSync('audit/ai-v3-front-spare-summary.json', JSON.stringify(summary, null, 2));
 for (const name of files) unlinkSync(`audit/${name}`);
 console.log(JSON.stringify(summary, null, 2));
} else {
 const games = run();
 const file = shard == null ? 'audit/ai-v3-front-spare.json' : `audit/ai-v3-front-spare-shard-${shard}.json`;
 writeFileSync(file, JSON.stringify(shard == null ? {generatedAt: new Date().toISOString(), summary: summarize(games), games} : games, null, 2));
 if (shard == null) writeFileSync('audit/ai-v3-front-spare-summary.json', JSON.stringify(summarize(games), null, 2));
}
