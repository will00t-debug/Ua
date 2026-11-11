// Train and score the V2 residual against frozen Hard.
// Three designated 50-card decks take turns as the learner.
// Training plays the adopted weights on most decisions and the candidate on
// EXPLORE_RATE of them. A finished game updates the candidate from the public
// feature difference of the decisions that left Hard. Adoption happens only
// when --adopt-if sees more wins on the same fixed deals.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks, designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {newUniversalMatch, dispatchUniversalAction, assertUniversalMatch, universalEnergy}
 from '../dist/universal-v2/engine.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {
 chooseUniversalLearnAction, universalActionDelta, exploratoryLearnAction, matchFingerprint
} from '../dist/universal-v2/ai-learn.mjs';
import {uiActor} from '../dist/universal-v2/preview-actions.mjs';
import {
 emptyStore, normalizeStore, beginTrace, observeDelta, settleMatch,
 judgeFixedDeals, adoptCandidate, effectiveWeights, candidateWeights,
 hasResidual, shouldExplore, TURN_CAP, EXPLORE_RATE
} from '../dist/ai-learn.mjs';

const args = process.argv.slice(2);
const get = (name, fallback) => {
 const i = args.indexOf('--' + name);
 return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const games = Math.max(1, Number(get('games', '120')) || 120);
const offset = Math.max(0, Number(get('offset', '0')) || 0);
const turnCap = Math.max(8, Number(get('turn-cap', '45')) || 45);
const maxActions = Math.max(80, Number(get('max-actions', '4000')) || 4000);
const seedBase = Math.max(0, Number(get('seed-base', '81000')) || 81000);
const storePath = get('store', '/tmp/v2-learn-delta-store.json');
const weightMode = get('weights', 'adopted');
const previousWins = Number(get('previous-wins', 'NaN'));
const evalOnly = args.includes('--eval-only');
const adoptIf = args.includes('--adopt-if');

const pack = createBleachV2Pack();
const packs = [pack, pack];
const report = summarizeDesignatedDecks(id => !!pack.cards[id]);
const byKey = Object.fromEntries(report.map(row => [row.key, row]));
for (const key of ['white-sword', 'renruki', 'reject-blue']) {
 if (!byKey[key]?.playable) throw Error(key + ' is not playable');
}
const counts = Object.fromEntries(report.map(row => [row.key, designatedPlayableCounts(row)]));
const names = {'white-sword': '白劍', renruki: '戀露', 'reject-blue': '我拒絕'};
const pairs = [
 ['white-sword', 'renruki'],
 ['white-sword', 'reject-blue'],
 ['renruki', 'reject-blue']
];

function schedule(i) {
 const pairIndex = i % 3;
 const k = Math.floor(i / 3);
 const pair = pairs[pairIndex];
 const learnerIsPair0 = k % 2 === 0;
 const firstIsLearner = Math.floor(k / 2) % 2 === 0;
 const seatSwap = Math.floor(k / 4) % 2 === 1;
 const learnerKey = learnerIsPair0 ? pair[0] : pair[1];
 const opponentKey = learnerIsPair0 ? pair[1] : pair[0];
 const seats = seatSwap ? [opponentKey, learnerKey] : [learnerKey, opponentKey];
 const learnerSeat = seats.indexOf(learnerKey);
 const first = firstIsLearner ? learnerSeat : 1 - learnerSeat;
 return {seats, first, learnerSeat, learnerKey, opponentKey, pair};
}

function loadStore() {
 try {
  return normalizeStore(JSON.parse(readFileSync(storePath, 'utf8')).store);
 } catch {
  return emptyStore();
 }
}

function saveStore(store, extra = {}) {
 const payload = {savedAt: new Date().toISOString(), store: normalizeStore(store), ...extra};
 writeFileSync(storePath, JSON.stringify(payload) + '\n');
 try {
  mkdirSync('/cursor/stores/self', {recursive: true});
  writeFileSync('/cursor/stores/self/v2-ai-learn-delta.json', JSON.stringify(payload) + '\n');
 } catch { /* the run file remains the source */ }
}

function weightsFor(store, fingerprint, mode) {
 if (mode === 'zero') return null;
 if (mode === 'candidate') return candidateWeights(store, fingerprint);
 return effectiveWeights(store, fingerprint);
}

function hardAction(state, phaseCount) {
 return chooseProgressSafeAiAction(packs, state, {
  difficulty: 'hard', actionsInPhase: phaseCount
 });
}

function weightedAction(state, phaseCount, weights) {
 return chooseProgressSafeAiAction(packs, state, {
  difficulty: 'hard',
  actionsInPhase: phaseCount,
  choose: (gamePack, gameState) => chooseUniversalLearnAction(gamePack, gameState, {weights})
 });
}

function playGame(i, {store, seedBase: base, train = false, mode = 'adopted'} = {}) {
 const plan = schedule(i);
 const seed = base + i;
 let state = newUniversalMatch(packs, {
  decks: [counts[plan.seats[0]], counts[plan.seats[1]]],
  seed, first: plan.first
 });
 const fingerprint = matchFingerprint(state, plan.learnerSeat);
 const trace = beginTrace(fingerprint);
 let actions = 0, phaseKey = '', phaseCount = 0, fallbacks = 0, decisions = 0;
 let learnerEnergy = null, frozenEnergy = null, differed = 0;
 const started = Date.now();
 while (state.status === 'playing' && actions < maxActions && state.turn <= turnCap) {
  const actor = uiActor(state);
  const key = state.turn + '|' + state.active + '|' + state.phase + '|' + (state.pending?.kind || '');
  if (key !== phaseKey) {phaseKey = key; phaseCount = 0;}
  if (state.turn >= 3 && !state.pending) {
   if (actor === plan.learnerSeat && learnerEnergy == null)
    learnerEnergy = universalEnergy(packs, state, actor);
   if (actor !== plan.learnerSeat && frozenEnergy == null)
    frozenEnergy = universalEnergy(packs, state, actor);
  }
  const frozen = hardAction(state, phaseCount);
  let picked = frozen;
  const learning = actor === plan.learnerSeat && !state.pending
   && (state.phase === 'main' || state.phase === 'move' || state.phase === 'attack');
  if (learning) {
   const explore = train && shouldExplore(i, decisions, EXPLORE_RATE);
   const weights = train
    ? (explore ? candidateWeights(store, fingerprint) : effectiveWeights(store, fingerprint))
    : weightsFor(store, fingerprint, mode);
   picked = weightedAction(state, phaseCount, weights);
   if (train && explore && JSON.stringify(picked.action) === JSON.stringify(frozen.action)) {
    const trial = exploratoryLearnAction(packs, state, frozen.action, i + decisions);
    if (JSON.stringify(trial) !== JSON.stringify(frozen.action))
     picked = {action: trial, reason: picked.reason};
   }
   if (train) {
    const delta = universalActionDelta(packs, state, picked.action, frozen.action, plan.learnerSeat);
    observeDelta(trace, delta, {
     turn: state.turn, energy: universalEnergy(packs, state, plan.learnerSeat)
    });
    if (delta) differed++;
   }
   decisions++;
  } else if (actor !== plan.learnerSeat) {
   picked = frozen;
  } else {
   picked = hardAction(state, phaseCount);
  }
  if (picked.reason) fallbacks++;
  state = dispatchUniversalAction(packs, state, picked.action, {actor});
  phaseCount++;
  actions++;
  if (actions % 40 === 0) assertUniversalMatch(packs, state);
 }
 if (state.status === 'finished') assertUniversalMatch(packs, state);
 let applied = false;
 if (train) {
  const settled = settleMatch(store, trace, {
   winner: state.winner, aiSeat: plan.learnerSeat, turn: state.turn, status: state.status
  });
  store = settled.store;
  applied = settled.applied;
 }
 const winnerKey = state.status === 'finished' && (state.winner === 0 || state.winner === 1)
  ? plan.seats[state.winner] : null;
 return {
  store, applied, fingerprint,
  row: {
   game: i + 1, fingerprint,
   learner: names[plan.learnerKey], opponent: names[plan.opponentKey],
   learnerKey: plan.learnerKey,
   first: names[plan.seats[plan.first]],
   learnerFirst: plan.seats[plan.first] === plan.learnerKey,
   seed, status: state.status,
   winner: winnerKey ? names[winnerKey] : null,
   winnerKey, endReason: state.endReason, turn: state.turn,
   actions, fallbacks, differed, ms: Date.now() - started,
   life: [state.players[0].life.length, state.players[1].life.length],
   unfinished: state.status !== 'finished',
   learnerWon: winnerKey === plan.learnerKey,
   learned: applied, pastTurnCap: state.turn > TURN_CAP,
   learnerEnergy, frozenEnergy
  }
 };
}

function summarize(rows) {
 const decided = rows.filter(row => !row.unfinished && !row.crashed);
 const mean = (list, key) => {
  const nums = list.map(row => row[key]).filter(n => Number.isFinite(n));
  return nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : 0;
 };
 const byDeck = {};
 for (const row of decided) {
  const item = byDeck[row.learner] ??= {games: 0, wins: 0};
  item.games++;
  if (row.learnerWon) item.wins++;
 }
 return {
  games: rows.length,
  decided: decided.length,
  learnerWins: decided.filter(row => row.learnerWon).length,
  learnerEnergy: +mean(decided, 'learnerEnergy').toFixed(3),
  frozenEnergy: +mean(decided, 'frozenEnergy').toFixed(3),
  differed: rows.reduce((sum, row) => sum + (row.differed || 0), 0),
  learned: rows.filter(row => row.learned).length,
  byDeck, crashed: rows.filter(row => row.crashed).length
 };
}

let store = evalOnly && weightMode === 'zero' ? emptyStore() : loadStore();
const rows = [];
const t0 = Date.now();
for (let n = 0; n < games; n++) {
 try {
  const played = playGame(offset + n, {
   store, seedBase, train: !evalOnly, mode: weightMode
  });
  store = played.store;
  rows.push(played.row);
  console.log(JSON.stringify(played.row));
 } catch (error) {
  const row = {game: offset + n + 1, crashed: true, unfinished: true, message: error.message};
  rows.push(row);
  console.log(JSON.stringify(row));
 }
 if (!evalOnly && (n + 1) % 10 === 0) saveStore(store, {phase: 'training', done: offset + n + 1});
}
const summary = summarize(rows);
let gate = null;
if (adoptIf) {
 if (!Number.isFinite(previousWins)) throw Error('--adopt-if needs --previous-wins');
 const judgement = judgeFixedDeals({
  previousWins, nextWins: summary.learnerWins, deals: summary.decided
 });
 store = adoptCandidate(store, judgement);
 gate = judgement;
}
if (!evalOnly || adoptIf) saveStore(store, {phase: evalOnly ? 'gated' : 'training-complete', summary, gate});
console.log((evalOnly ? 'EVAL ' : 'BATCH ') + JSON.stringify({
 ...summary, gate,
 adopted: hasResidual(store.adoptedShared),
 candidateShared: store.candidateShared.map(n => +n.toFixed(4)),
 recordedGames: store.recordedGames,
 durationMs: Date.now() - t0
}));
