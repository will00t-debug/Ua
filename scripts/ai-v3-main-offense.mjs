// Main-phase decision gap between default AI v3 and frozen hard-search-2.
// The game is played on the v3 line. At each idle main decision the same
// public position is also shown to hard-search-2. Neither chooser reads the
// hidden deck order: v3 searches a belief world and hard scores only visible
// cards. Exposed seeds only. This does not change the live policy.
//
//   node scripts/ai-v3-main-offense.mjs
//   AI_V3_SHARD=0 AI_V3_SHARDS=4 node scripts/ai-v3-main-offense.mjs
//   AI_V3_MERGE=1 node scripts/ai-v3-main-offense.mjs
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {dispatchUniversalAction, legalUniversalActions, universalBp, universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, comparedLines, MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {selectionTrace} from '../dist/universal-v2/ai-v3/beam.mjs';
import {actionGroup} from '../dist/universal-v2/ai-v3/archetype.mjs';
import {blendRoot} from '../dist/universal-v2/ai-v3/prior.mjs';
import {chooseStrengthenedHardAction, resetHardAiReport, lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';

const DECKS = ['white-sword', 'sword-art-online-raid', 'steins-gate-raid'];
const SEEDS = (process.env.AI_V3_SEEDS || '8401,8402,8500,8501,8502').split(',').map(Number);
const SEARCH = {nodes: 48, ms: 1e9, seed: 1, plan: 'tree', now: () => 0};
const HARD = {nodes: 48, ms: 1e9, seed: 1};
const STEPS = 400;
const OUT = 'audit/ai-v3-main-offense';
const shard = process.env.AI_V3_SHARD == null ? null : Number(process.env.AI_V3_SHARD);
const shards = Number(process.env.AI_V3_SHARDS || 1);
const BOUNDARY_RANK = {terminal: 5, returned: 4, yielded: 3, pending: 2, open: 1};

function round(value) {
 return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}
function strategicKey(state, actor, action) {
 if (!action || typeof action !== 'object') return '';
 const empty = ['play', 'raid', 'move', 'step'].includes(action.type) && Number.isInteger(action.slot)
  && !action.replaceUid && !state.players?.[actor]?.[action.line]?.[action.slot];
 const slot = empty ? '*' : (action.slot ?? '');
 return [action.type, action.line, action.mode, action.uid, action.baseUid, action.to, action.index,
  action.choice, action.target, action.zone, slot].map(part => part ?? '').join('|');
}
function label(action) {
 if (!action) return 'none';
 if (action.type === 'play') return `play:${action.line || ''}:${action.uid || ''}`;
 if (action.type === 'raid') return `raid:${action.uid || ''}:${action.baseUid || ''}`;
 if (action.type === 'attack') return `attack:${action.uid || ''}`;
 if (action.type === 'activate' || action.type === 'event' || action.type === 'handActivate')
  return `${action.type}:${action.uid || ''}`;
 return `${action.type}:${action.uid || action.mode || ''}`;
}
function category(action) {
 if (!action) return 'none';
 if (action.type === 'play' && action.line === 'front') return 'front';
 if (action.type === 'play' && action.line === 'energy') return 'energy';
 if (action.type === 'raid') return 'raid';
 if (action.type === 'next' || action.type === 'extraDraw') return action.type;
 return action.type;
}
function placeKey(row) {
 return [row?.leafTurn ?? '', row?.leafPendingPlayer ?? '', row?.leafActive ?? '', row?.phase ?? '',
  row?.pending ?? '', row?.leafSource ?? '', row?.leafProgress ?? '', row?.leafOwnTurns ?? ''].join('|');
}
function readyAp(player) {
 return (player?.apCards || []).filter(card => card && card.inPlay && card.ready).length;
}
function colorsOf(pack, state, player) {
 const colors = universalEnergyByColor(pack, state, player) || {};
 return Object.fromEntries(Object.entries(colors).filter(([, value]) => value));
}
function findCard(state, uid) {
 if (!uid) return null;
 for (const player of state.players || []) {
  for (const zone of ['hand', 'front', 'energy', 'outside']) {
   const card = (player[zone] || []).find(item => item?.uid === uid);
   if (card) return card;
  }
 }
 return null;
}
function printedOf(pack, card) {
 return card ? pack?.cards?.[card.cardId] || null : null;
}
function briefCard(pack, card) {
 const printed = printedOf(pack, card);
 if (!card || !printed) return null;
 return {
  id: card.cardId, name: printed.name || card.cardId, type: printed.type || null,
  cost: Number(printed.energy) || 0, bp: Number(printed.bp) || 0, gen: Number(printed.gen) || 0,
  ap: Number.isInteger(printed.ap) ? printed.ap : 1, color: printed.color || null,
  raid: printed.raidName || null, ready: card.ready === true
 };
}
function board(packs, state, actor) {
 const pack = packs[actor];
 const mine = state.players[actor];
 const front = (mine.front || []).filter(Boolean);
 const legal = state.pending || state.active !== actor || state.phase !== 'main' ? [] : legalUniversalActions(packs, state);
 return {
  ap: readyAp(mine),
  energy: colorsOf(pack, state, actor),
  front: front.map(card => briefCard(pack, card)).filter(Boolean),
  ready: front.filter(card => card.ready).length,
  bp: front.reduce((sum, card) => sum + (Number(universalBp(pack, state, card)) || 0), 0),
  hand: (mine.hand || []).map(card => briefCard(pack, card)).filter(Boolean),
  raids: legal.filter(action => action.type === 'raid').length,
  payable: legal.filter(action => action.type === 'play' || action.type === 'event' || action.type === 'raid').length
 };
}
function outlook(packs, state, actor, action) {
 const before = board(packs, state, actor);
 let next;
 try { next = dispatchUniversalAction(packs, state, action, {actor}); }
 catch { return {error: true, before}; }
 const after = board(packs, next, actor);
 const idle = !next.pending && next.phase === 'main' && next.active === actor && next.status === 'playing';
 return {
  pending: next.pending?.kind || null,
  phase: next.phase,
  idle,
  before: {ap: before.ap, ready: before.ready, front: before.front.length, bp: before.bp, raids: before.raids, energy: before.energy},
  after: {
   ap: after.ap, ready: after.ready, front: after.front.length, bp: after.bp,
   raids: idle ? after.raids : null, energy: after.energy,
   bodies: after.front.map(card => `${card.id}${card.ready ? '' : '*'}`).join(',')
  }
 };
}
function rowsOf(trace) {
 const rows = trace?.candidates?.length ? trace.candidates : (trace?.compared || []);
 return rows.filter(row => row?.action);
}
function scoreWinner(rows) {
 const executed = rows.filter(row => row.executed !== false && Number.isFinite(row.search));
 const wins = executed.filter(row => row.boundary === 'terminal' && row.search >= 90000);
 const comparison = comparedLines(executed);
 const pool = wins.length ? wins : (comparison.rows || []);
 const winner = pool.length ? blendRoot(pool, () => 0) : null;
 return {executed, wins, comparison, winner};
}
function stageKey(step) {
 return [step?.type, step?.line || '', step?.uid ?? '', step?.mode || ''].join('|');
}
function rewriteAt(stages, hard) {
 const wanted = [hard.type, hard.line || '', hard.uid ?? '', hard.mode || ''].join('|');
 let seen = false;
 for (const step of stages || []) {
  const key = stageKey(step);
  if (!seen) {
   if (key === wanted) seen = true;
   continue;
  }
  if (key !== wanted) return step.stage;
 }
 return null;
}
function classify(packs, state, actor, legal, v3, hard, trace) {
 const key = action => strategicKey(state, actor, action);
 const hardKey = key(hard);
 const v3Key = key(v3);
 const rows = rowsOf(trace);
 const hardRow = rows.find(row => row.executed !== false && key(row.action) === hardKey) || null;
 const unexecuted = (trace?.unexecuted || []).some(row => key(row.action || row) === hardKey);
 const inRoot = (trace?.rootPlan || []).some(row => key(row.action || row) === hardKey) || !!hardRow || unexecuted;
 const scored = scoreWinner(rows);
 const winnerKey = scored.winner ? key(scored.winner.action) : '';
 const fallback = trace?.reason === 'budget-fallback' || trace?.fallbackKind === 'budget';
 const stages = trace?.stages || [];
 const searchStage = stages.find(step => step.stage === 'search') || null;
 const scorePicked = winnerKey === hardKey;
 const backupPicked = searchStage ? stageKey(searchStage) === [hard.type, hard.line || '', hard.uid ?? '', hard.mode || ''].join('|') : false;
 let klass = 'A';
 let why = 'absent';
 if (scorePicked && v3Key !== hardKey && !fallback) {
  klass = 'C';
  why = 'rewritten:' + (rewriteAt(stages, hard) || 'unknown');
 } else if (fallback && backupPicked && v3Key !== hardKey) {
  klass = 'C';
  why = 'rewritten:' + (rewriteAt(stages, hard) || 'unknown');
 } else if (hardRow && scorePicked && fallback) {
  klass = 'B';
  why = 'fallback-discarded-score';
 } else if (hardRow) {
  klass = 'B';
  const inPool = (scored.comparison.rows || []).some(row => key(row.action) === hardKey)
   || scored.wins.some(row => key(row.action) === hardKey);
  if (scored.wins.length && !(hardRow.boundary === 'terminal' && hardRow.search >= 90000)) why = 'proven-win-other';
  else if (scored.comparison.contested) why = 'contested';
  else if (!inPool) why = 'different-stop';
  else if (scored.winner && hardRow.search + 1e-9 < scored.winner.search) why = 'lower-score';
  else why = fallback ? 'fallback-other' : 'tie-or-backup';
 } else if (unexecuted) {
  klass = 'A';
  why = 'planned-unscored';
 } else if (!inRoot) {
  const selected = selectionTrace(packs, state, actor, legal, MATCH_LIMITS.beam, null);
  const note = selected.notes.find(item => key(item.action) === hardKey);
  const rank = selected.ranked.findIndex(action => key(action) === hardKey);
  const group = actionGroup(state, actor, hard);
  const taken = selected.picked.find(action => actionGroup(state, actor, action) === group && key(action) !== hardKey);
  klass = 'A';
  why = 'beam:' + (note?.reason || 'absent');
  return {klass, why, scored, hardRow, beam: {
   reason: note?.reason || 'absent', rank, width: selected.ranked.length,
   picked: selected.picked.map(label),
   displaced: taken ? label(taken) : null
  }};
 }
 return {klass, why, scored, hardRow, beam: null};
}
function groupNote(state, actor, rows, hardRow, winner) {
 if (!hardRow || !winner) return null;
 const rank = BOUNDARY_RANK[hardRow.boundary] || 0;
 if (rank >= BOUNDARY_RANK.returned) return null;
 const sameBoundary = rows.filter(row => row.executed !== false && row.boundary === hardRow.boundary && !row.damageOpen);
 const size = place => sameBoundary.filter(row => placeKey(row) === place).length;
 return {
  hard: size(placeKey(hardRow)), winner: size(placeKey(winner)),
  hardPlace: placeKey(hardRow), winnerPlace: placeKey(winner)
 };
}
function chooseBoth(packs, state) {
 const actor = state.pending?.player ?? state.active;
 const legal = legalUniversalActions(packs, state);
 const started = Date.now();
 resetAiV3Report();
 const v3Raw = chooseAiV3Action(packs, state, {actor, ...MATCH_LIMITS, ...SEARCH});
 const v3Ms = Date.now() - started;
 const trace = lastAiV3Trace();
 const hardStarted = Date.now();
 resetHardAiReport();
 const hardRaw = chooseStrengthenedHardAction(packs, state, HARD);
 const hardMs = Date.now() - hardStarted;
 const hardTrace = lastHardAiTrace();
 const v3 = legal.find(action => strategicKey(state, actor, action) === strategicKey(state, actor, v3Raw)) || null;
 const hard = legal.find(action => strategicKey(state, actor, action) === strategicKey(state, actor, hardRaw)) || null;
 return {actor, legal, v3, hard, trace, hardTrace, v3Ms, hardMs, v3Raw, hardRaw};
}
function recordDiff(packs, state, picked, step, cell, firstMain) {
 const {actor, legal, v3, hard, trace, hardTrace} = picked;
 const pack = packs[actor];
 const judged = classify(packs, state, actor, legal, v3, hard, trace);
 const rows = rowsOf(trace);
 const winner = judged.scored.winner;
 const hardCandidates = hardTrace?.candidates || [];
 const v3InHard = hardCandidates.findIndex(row => strategicKey(state, actor, row.action) === strategicKey(state, actor, v3));
 const counts = {};
 for (const action of legal) counts[category(action)] = (counts[category(action)] || 0) + 1;
 const view = board(packs, state, actor);
 const stages = trace?.stages || [];
 return {
  deck: cell.deck, seed: cell.seed, first: cell.first, seat: cell.seat, step, turn: state.turn,
  firstMain, life: state.players.map(player => player.life.length),
  v3: label(v3), hard: label(hard),
  v3Cat: category(v3), hardCat: category(hard),
  v3Card: briefCard(pack, findCard(state, v3?.uid)),
  hardCard: briefCard(pack, findCard(state, hard?.uid)),
  hardBase: briefCard(pack, findCard(state, hard?.type === 'raid' ? hard.baseUid : null)),
  klass: judged.klass, why: judged.why, beam: judged.beam,
  reason: trace?.reason || null, fallback: trace?.fallbackKind || null,
  nodes: Number.isFinite(trace?.nodesUsed) ? trace.nodesUsed : null,
  roots: trace?.roots ?? trace?.rootPlan?.length ?? null,
  v3Ms: picked.v3Ms, hardMs: picked.hardMs,
  hardRoots: hardTrace?.rootCandidates ?? null,
  hardCompared: hardTrace?.rootCompared ?? null,
  hardCut: hardTrace?.rootCut === true,
  hardReason: hardTrace?.reason || null,
  v3InHard: v3InHard >= 0,
  v3HardRank: v3InHard >= 0 ? v3InHard : null,
  v3HardScore: v3InHard >= 0 ? round(hardCandidates[v3InHard].score) : null,
  hardScore: round(hardTrace?.score),
  scoreWinner: winner ? label(winner.action) : null,
  scoreCat: winner ? category(winner.action) : null,
  rewritten: !!(winner && strategicKey(state, actor, winner.action) !== strategicKey(state, actor, v3)),
  rewriteStage: winner && strategicKey(state, actor, winner.action) !== strategicKey(state, actor, v3)
   ? (rewriteAt(stages, winner.action) || 'unknown') : null,
  score: round(winner?.search),
  hardSearch: round(judged.hardRow?.search),
  hardBoundary: judged.hardRow?.boundary || null,
  hardPhase: judged.hardRow?.phase || null,
  hardPending: judged.hardRow?.pending || null,
  hardNodes: judged.hardRow?.nodes ?? null,
  winnerBoundary: winner?.boundary || null,
  winnerPhase: winner?.phase || null,
  winnerPending: winner?.pending || null,
  comparable: judged.scored.comparison?.rows?.length || 0,
  contested: judged.scored.comparison?.contested === true,
  provenWins: judged.scored.wins.length,
  groups: groupNote(state, actor, rows, judged.hardRow, winner),
  legal: counts,
  ap: view.ap, energy: view.energy,
  front: view.front.map(card => `${card.name}/${card.bp}${card.ready ? '' : '*'}`),
  hand: view.hand.map(card => `${card.name}/${card.cost}${card.raid ? '@' + card.raid : ''}`),
  raidLegal: view.raids,
  v3Outlook: outlook(packs, state, actor, v3),
  hardOutlook: outlook(packs, state, actor, hard),
  stages: stages.map(step => `${step.stage}:${step.type || ''}${step.line ? ':' + step.line : ''}:${step.uid ?? ''}`)
 };
}
function cells() {
 const rows = [];
 for (const seed of SEEDS) for (const first of [0, 1]) for (const seat of [0, 1]) {
  for (const deck of DECKS) rows.push({deck, seed, first, seat});
 }
 return rows.filter((_, index) => shard == null || index % shards === shard);
}
function play(packs, state, cell) {
 let cursor = state;
 const diffs = [];
 let main = 0;
 let agrees = 0;
 let firstMain = false;
 let illegal = 0;
 let steps = 0;
 while (cursor.status === 'playing' && steps < STEPS) {
  const actor = cursor.pending?.player ?? cursor.active;
  const mainChoice = actor === cell.seat && cursor.phase === 'main' && !cursor.pending;
  let action = null;
  if (mainChoice) {
   const picked = chooseBoth(packs, cursor);
   if (!picked.v3) illegal++;
   main++;
   const sameChoice = strategicKey(cursor, actor, picked.v3) === strategicKey(cursor, actor, picked.hard);
   if (sameChoice) agrees++;
   else {
    diffs.push(recordDiff(packs, cursor, picked, steps, cell, !firstMain));
    firstMain = true;
   }
   action = picked.v3;
  } else if (actor === cell.seat) {
   resetAiV3Report();
   const raw = chooseAiV3Action(packs, cursor, {actor, ...MATCH_LIMITS, ...SEARCH});
   const legal = legalUniversalActions(packs, cursor);
   action = legal.find(item => strategicKey(cursor, actor, item) === strategicKey(cursor, actor, raw)) || null;
   if (!action) illegal++;
  } else {
   resetHardAiReport();
   const raw = chooseStrengthenedHardAction(packs, cursor, HARD);
   const legal = legalUniversalActions(packs, cursor);
   action = legal.find(item => strategicKey(cursor, actor, item) === strategicKey(cursor, actor, raw)) || null;
   if (!action) illegal++;
  }
  if (!action) break;
  try { cursor = dispatchUniversalAction(packs, cursor, action, {actor}); }
  catch { illegal++; break; }
  steps++;
 }
 return {
  winner: cursor.winner, life: cursor.players.map(player => player.life.length),
  unfinished: cursor.status === 'playing', illegal, main, agrees, diffs
 };
}
function bump(bag, key) {
 bag[key] = (bag[key] || 0) + 1;
}
export function summarize(report) {
 const diffs = report.diffs || [];
 const klass = {}, why = {}, pair = {}, deck = {}, rewrite = {}, first = {klass: {}, why: {}, pair: {}, rewrite: {}};
 for (const row of diffs) {
  bump(klass, row.klass);
  bump(why, `${row.klass}:${row.why}`);
  bump(pair, `${row.v3Cat}->${row.hardCat}`);
  if (row.rewritten) bump(rewrite, row.rewriteStage || 'yes');
  if (!deck[row.deck]) deck[row.deck] = {diffs: 0, first: 0, klass: {}, pair: {}};
  deck[row.deck].diffs++;
  bump(deck[row.deck].klass, row.klass);
  bump(deck[row.deck].pair, `${row.v3Cat}->${row.hardCat}`);
  if (row.firstMain) {
   deck[row.deck].first++;
   bump(first.klass, row.klass);
   bump(first.why, `${row.klass}:${row.why}`);
   bump(first.pair, `${row.v3Cat}->${row.hardCat}`);
   if (row.rewritten) bump(first.rewrite, row.rewriteStage || 'yes');
  }
 }
 return {
  games: report.games, main: report.main, agrees: report.agrees, diffs: diffs.length,
  illegal: report.illegal, firstDiffs: diffs.filter(row => row.firstMain).length,
  klass, why, pair, rewrite, first, deck
 };
}
function run() {
 const decks = new Map(battleDecks().filter(deck => DECKS.includes(deck.id)).map(deck => [deck.id, deck]));
 const report = {games: 0, main: 0, agrees: 0, illegal: 0, diffs: []};
 for (const cell of cells()) {
  const deck = decks.get(cell.deck);
  const packs = [deck.pack, deck.pack];
  const shared = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], cell.seed, cell.first));
  const started = Date.now();
  let played;
  try { played = play(packs, cloneMatch(shared.state), cell); }
  catch (error) {
   console.error(JSON.stringify({deck: cell.deck, seed: cell.seed, first: cell.first, seat: cell.seat, error: String(error?.stack || error)}));
   continue;
  }
  report.games++;
  report.main += played.main;
  report.agrees += played.agrees;
  report.illegal += played.illegal;
  for (const row of played.diffs) {
   row.gameWinner = played.winner;
   row.gameLife = played.life;
   row.v3Won = played.winner === cell.seat;
  }
  report.diffs.push(...played.diffs);
  console.error(JSON.stringify({
   deck: cell.deck, seed: cell.seed, first: cell.first, seat: cell.seat,
   seconds: Math.round((Date.now() - started) / 100) / 10,
   main: played.main, agrees: played.agrees, diffs: played.diffs.length,
   firstWhy: played.diffs.find(row => row.firstMain)?.why || 'agree',
   pair: played.diffs.find(row => row.firstMain) ? `${played.diffs.find(row => row.firstMain).v3Cat}->${played.diffs.find(row => row.firstMain).hardCat}` : ''
  }));
 }
 report.summary = summarize(report);
 return report;
}
function merge() {
 const parts = [];
 for (let index = 0; index < shards; index++) {
  parts.push(JSON.parse(readFileSync(`${OUT}/shard-${index}.json`, 'utf8')));
 }
 const report = {
  base: '81843d3aa6edf9ebbefe92f0636006f6af7ac624',
  seeds: SEEDS, decks: DECKS, nodes: 48, clock: '1e9',
  games: 0, main: 0, agrees: 0, illegal: 0, diffs: []
 };
 for (const part of parts) {
  report.games += part.games;
  report.main += part.main;
  report.agrees += part.agrees;
  report.illegal += part.illegal;
  report.diffs.push(...part.diffs);
 }
 report.summary = summarize(report);
 writeFileSync(`${OUT}/summary.json`, JSON.stringify(report.summary, null, 2));
 writeFileSync(`${OUT}/diffs.json`, JSON.stringify(report.diffs));
 console.log(JSON.stringify(report.summary, null, 2));
}
const SPOTS = [
 {deck: 'white-sword', seed: 8401, first: 0, seat: 0, step: 27, kind: 'different-stop'},
 {deck: 'white-sword', seed: 8402, first: 0, seat: 0, step: 2, kind: 'lower-score'},
 {deck: 'sword-art-online-raid', seed: 8402, first: 0, seat: 0, step: 2, kind: 'beam-front'},
 {deck: 'sword-art-online-raid', seed: 8402, first: 1, seat: 1, step: 2, kind: 'same-card-front'},
 {deck: 'steins-gate-raid', seed: 8402, first: 0, seat: 0, step: 2, kind: 'beam-front'},
 {deck: 'steins-gate-raid', seed: 8401, first: 1, seat: 0, step: 8, kind: 'tie'}
];
function act(packs, state, seat) {
 const actor = state.pending?.player ?? state.active;
 const legal = legalUniversalActions(packs, state);
 let raw = null;
 if (actor === seat) {
  resetAiV3Report();
  raw = chooseAiV3Action(packs, state, {actor, ...MATCH_LIMITS, ...SEARCH});
 } else {
  resetHardAiReport();
  raw = chooseStrengthenedHardAction(packs, state, HARD);
 }
 return legal.find(action => strategicKey(state, actor, action) === strategicKey(state, actor, raw)) || null;
}
function reach(packs, state, cell) {
 let cursor = state;
 let steps = 0;
 while (cursor.status === 'playing' && steps < cell.step) {
  const actor = cursor.pending?.player ?? cursor.active;
  const action = act(packs, cursor, cell.seat);
  if (!action) return null;
  cursor = dispatchUniversalAction(packs, cursor, action, {actor});
  steps++;
 }
 return cursor;
}
function turnView(packs, state, seat) {
 const pack = packs[seat];
 const front = (state.players[seat].front || []).filter(Boolean);
 return {
  life: state.players.map(player => player.life.length),
  ap: readyAp(state.players[seat]),
  energy: colorsOf(pack, state, seat),
  front: front.length,
  ready: front.filter(card => card.ready).length,
  bp: front.reduce((sum, card) => sum + (Number(universalBp(pack, state, card)) || 0), 0)
 };
}
function playBranch(packs, state, seat, forced) {
 const actor = state.pending?.player ?? state.active;
 let cursor = dispatchUniversalAction(packs, state, forced, {actor});
 const origin = state.turn;
 const buckets = [];
 let bucket = {turn: origin, attacks: 0, raids: 0, damage: 0};
 let life = cursor.players[1 - seat].life.length;
 let steps = 0;
 let illegal = 0;
 while (cursor.status === 'playing' && steps < STEPS) {
  const who = cursor.pending?.player ?? cursor.active;
  const action = act(packs, cursor, seat);
  if (!action) { illegal++; break; }
  const beforeTurn = cursor.turn;
  const beforeLife = cursor.players[1 - seat].life.length;
  if (who === seat && action.type === 'attack') bucket.attacks++;
  if (who === seat && action.type === 'raid') bucket.raids++;
  try { cursor = dispatchUniversalAction(packs, cursor, action, {actor: who}); }
  catch { illegal++; break; }
  if (bucket.turn === beforeTurn && cursor.players[1 - seat].life.length < beforeLife)
   bucket.damage += beforeLife - cursor.players[1 - seat].life.length;
  life = cursor.players[1 - seat].life.length;
  const passed = cursor.turn !== beforeTurn || cursor.status !== 'playing';
  if (passed && beforeTurn === bucket.turn) {
   bucket.end = turnView(packs, cursor, seat);
   buckets.push(bucket);
   bucket = {turn: cursor.turn, attacks: 0, raids: 0, damage: 0};
  }
  steps++;
 }
 return {
  winner: cursor.winner, won: cursor.winner === seat, life: cursor.players.map(player => player.life.length),
  unfinished: cursor.status === 'playing', illegal,
  buckets: buckets.filter(item => item.turn === origin || item.turn === origin + 2 || item.turn === origin + 4)
 };
}
function counterfactual() {
 const decks = new Map(battleDecks().filter(deck => DECKS.includes(deck.id)).map(deck => [deck.id, deck]));
 const rows = [];
 for (const cell of SPOTS) {
  const deck = decks.get(cell.deck);
  const packs = [deck.pack, deck.pack];
  const shared = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], cell.seed, cell.first));
  const state = reach(packs, cloneMatch(shared.state), cell);
  if (!state) { rows.push({...cell, error: 'replay'}); continue; }
  const picked = chooseBoth(packs, state);
  const v3 = label(picked.v3);
  const hard = label(picked.hard);
  if (!picked.v3 || !picked.hard) { rows.push({...cell, error: 'choice', v3, hard}); continue; }
  const started = Date.now();
  const left = playBranch(packs, cloneMatch(state), cell.seat, picked.v3);
  const right = playBranch(packs, cloneMatch(state), cell.seat, picked.hard);
  rows.push({
   ...cell, v3, hard, seconds: Math.round((Date.now() - started) / 100) / 10,
   at: turnView(packs, state, cell.seat),
   v3Line: left, hardLine: right
  });
  console.error(JSON.stringify({deck: cell.deck, seed: cell.seed, step: cell.step, v3, hard, v3Won: left.won, hardWon: right.won, seconds: rows.at(-1).seconds}));
 }
 mkdirSync(OUT, {recursive: true});
 writeFileSync(`${OUT}/counterfactual.json`, JSON.stringify(rows, null, 2));
 console.log(JSON.stringify(rows, null, 2));
}
if (process.env.AI_V3_COUNTER === '1') counterfactual();
else if (process.env.AI_V3_MERGE === '1') merge();
else if (process.argv[1] && process.argv[1].endsWith('ai-v3-main-offense.mjs')) {
 const report = run();
 mkdirSync(OUT, {recursive: true});
 const name = shard == null ? `${OUT}/all.json` : `${OUT}/shard-${shard}.json`;
 writeFileSync(name, JSON.stringify(report));
 console.log(JSON.stringify(report.summary, null, 2));
}
