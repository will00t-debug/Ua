// Residual learning for the existing battle AI.
// The rules engine stays the authority for legal actions. This module only
// stores public features, updates candidate weights, and decides whether a
// candidate may replace the adopted weights. Easy, normal, and hard do not
// read this store. A zero weight vector leaves the current Hard policy unchanged.

export const FEATURE_COUNT = 10;
export const LEARN_ALPHA = 0.05;
export const WEIGHT_LIMIT = 1.5;
export const DECK_PRIOR = 40;
export const TURN_CAP = 30;
export const CLASSIC_STORE_KEY = 'ua-ai-learn-v1';
export const UNIVERSAL_STORE_KEY = 'ua-ai-learn-v2';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const lifeScore = n => n <= 0 ? -90 : n === 1 ? -20 : n === 2 ? -7 : n * 3;

export function emptyWeights() {
  return Array(FEATURE_COUNT).fill(0);
}

export function hasResidual(weights) {
  return Array.isArray(weights) && weights.length === FEATURE_COUNT && weights.some(w => w !== 0);
}

export function dot(features, weights) {
  let total = 0;
  for (let i = 0; i < FEATURE_COUNT; i++) total += (features[i] || 0) * (weights[i] || 0);
  return total;
}

export function clipWeights(weights) {
  const source = Array.isArray(weights) ? weights : [];
  return Array.from({length: FEATURE_COUNT}, (_, i) => {
    const n = Number(source[i]);
    return clamp(Number.isFinite(n) ? n : 0, -WEIGHT_LIMIT, WEIGHT_LIMIT);
  });
}

// Ten public numbers, each about -1..1. Card names, opponent hand identities,
// and deck order are not inputs. The last entry is a bias.
export function featuresFromSnapshot(snap) {
  const apScale = snap.apActive ? 1 : 0.25;
  return [
    clamp((lifeScore(snap.lifeOwn) - lifeScore(snap.lifeOpp)) / 90, -1, 1),
    clamp((snap.fieldOwn - snap.fieldOpp) / 40, -1, 1),
    clamp((snap.energyOwn - snap.energyTarget) / 6, -1, 1),
    clamp((snap.readyOwn - snap.readyOpp) / 4, -1, 1),
    clamp((snap.knownHand - snap.oppHand) / 7, -1, 1),
    clamp((snap.ap / 3) * apScale, -1, 1),
    clamp(snap.raidOwn / 4, 0, 1),
    snap.pressure ? 1 : 0,
    snap.first ? 1 : 0,
    1
  ];
}

export function fingerprintCounts(counts) {
  if (!counts || typeof counts !== 'object') return '';
  return Object.entries(counts)
    .filter(([, n]) => Number(n) > 0)
    .map(([id, n]) => [String(id), Number(n)])
    .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
    .map(([id, n]) => id + '*' + n)
    .join('|');
}

function addCard(card, bag) {
  if (!card || card.cardId == null) return;
  bag[card.cardId] = (bag[card.cardId] || 0) + 1;
  for (const child of card.stack || []) addCard(child, bag);
  for (const child of card.under || []) addCard(child, bag);
}

// Full list identity. Zone order does not matter; a one-card edit does.
export function fingerprintZones(player) {
  const bag = {};
  if (!player) return '';
  for (const key of ['deck', 'hand', 'life', 'outside', 'removed']) {
    for (const card of player[key] || []) addCard(card, bag);
  }
  for (const key of ['front', 'energy']) {
    for (const card of player[key] || []) addCard(card, bag);
  }
  return fingerprintCounts(bag);
}

export function matchFingerprint(state, seat) {
  const initial = state?.initialCounts?.[seat];
  if (initial) return fingerprintCounts(initial);
  return fingerprintZones(state?.players?.[seat]);
}

// One finished match is one nudge. Averaging the trace keeps a long chain of
// legal checks from pinning every weight at the clip in a single game.
export function updateWeights(weights, featuresList, outcome) {
  const next = clipWeights(weights);
  const rows = (featuresList || []).filter(phi => Array.isArray(phi) && phi.length === FEATURE_COUNT);
  if (!rows.length) return next;
  const mean = Array(FEATURE_COUNT).fill(0);
  for (const phi of rows) for (let i = 0; i < FEATURE_COUNT; i++) mean[i] += phi[i];
  for (let i = 0; i < FEATURE_COUNT; i++) mean[i] /= rows.length;
  const target = outcome === 1 || outcome === -1 ? outcome : 0;
  const error = target - dot(mean, next);
  for (let i = 0; i < FEATURE_COUNT; i++) {
    next[i] = clamp(next[i] + LEARN_ALPHA * error * mean[i], -WEIGHT_LIMIT, WEIGHT_LIMIT);
  }
  return next;
}

export function emptyStore() {
  return {
    version: 1,
    recordedGames: 0,
    adoptedShared: emptyWeights(),
    candidateShared: emptyWeights(),
    decks: {},
    lastGate: null
  };
}

function deckEntry(raw) {
  return {
    adopted: clipWeights(raw?.adopted),
    candidate: clipWeights(raw?.candidate),
    games: Math.max(0, Number(raw?.games) || 0)
  };
}

export function normalizeStore(raw) {
  if (!raw || raw.version !== 1) return emptyStore();
  const decks = {};
  for (const [key, value] of Object.entries(raw.decks || {})) {
    if (typeof key === 'string') decks[key] = deckEntry(value);
  }
  return {
    version: 1,
    recordedGames: Math.max(0, Number(raw.recordedGames) || 0),
    adoptedShared: clipWeights(raw.adoptedShared),
    candidateShared: clipWeights(raw.candidateShared),
    decks,
    lastGate: raw.lastGate && typeof raw.lastGate === 'object' ? {...raw.lastGate} : null
  };
}

export function deckScale(games) {
  const n = Math.max(0, Number(games) || 0);
  return n / (n + DECK_PRIOR);
}

// Shared weights until this list has enough finished games, then blend toward
// that list's own adopted vector. Scale is n/(n+40).
export function effectiveWeights(store, fingerprint) {
  const normalized = normalizeStore(store);
  const shared = normalized.adoptedShared;
  const deck = normalized.decks[fingerprint];
  const scale = deckScale(deck?.games || 0);
  const local = deck?.adopted || emptyWeights();
  return clipWeights(shared.map((weight, i) => (1 - scale) * weight + scale * local[i]));
}

export function beginTrace(fingerprint = '') {
  return {fingerprint, features: [], turn3Energy: null, settled: false};
}

export function observeTrace(trace, features, {turn = 0, energy = null} = {}) {
  if (!trace || trace.settled) return trace;
  if (Array.isArray(features) && features.length === FEATURE_COUNT)
    trace.features.push(features.slice());
  if (trace.turn3Energy == null && turn >= 3 && Number.isFinite(energy))
    trace.turn3Energy = energy;
  return trace;
}

export function settleMatch(store, trace, {winner = null, aiSeat = 1, turn = 0, status = ''} = {}) {
  const base = normalizeStore(store);
  const finished = status === 'finished' && (winner === 0 || winner === 1);
  if (!trace || trace.settled || !finished || !(turn <= TURN_CAP) || !trace.features?.length)
    return {store: base, applied: false};
  const outcome = winner === aiSeat ? 1 : -1;
  const next = normalizeStore(structuredClone(base));
  next.candidateShared = updateWeights(next.candidateShared, trace.features, outcome);
  const key = trace.fingerprint || '';
  const prev = next.decks[key] || deckEntry(null);
  next.decks[key] = {
    adopted: prev.adopted,
    candidate: updateWeights(prev.candidate, trace.features, outcome),
    games: prev.games + 1
  };
  next.recordedGames += 1;
  trace.settled = true;
  return {store: next, applied: true, outcome};
}

export function judgeGate({
  decided = 0, learnerWins = 0, learnerEnergy = 0, frozenEnergy = 0, minGames = 4
} = {}) {
  const games = Math.max(0, Number(decided) || 0);
  const wins = Math.max(0, Number(learnerWins) || 0);
  const winRate = games ? wins / games : 0;
  const winOk = games >= minGames && winRate > 0.5;
  const energyOk = Number(learnerEnergy) + 1e-9 >= Number(frozenEnergy) - 0.5;
  return {
    passed: winOk && energyOk,
    winRate, winOk, energyOk,
    decided: games, learnerWins: wins,
    learnerEnergy: Number(learnerEnergy) || 0,
    frozenEnergy: Number(frozenEnergy) || 0
  };
}

export function adoptShared(store, judgement) {
  const next = normalizeStore(store);
  next.lastGate = {...judgement, scope: 'shared', adopted: !!judgement?.passed};
  if (judgement?.passed) next.adoptedShared = clipWeights(next.candidateShared);
  return next;
}

export function adoptDeck(store, fingerprint, judgement) {
  const next = normalizeStore(store);
  const prev = next.decks[fingerprint] || deckEntry(null);
  next.lastGate = {
    ...judgement, scope: 'deck', fingerprint, adopted: !!judgement?.passed
  };
  next.decks[fingerprint] = judgement?.passed
    ? {...prev, adopted: clipWeights(prev.candidate)}
    : prev;
  return next;
}

export function learnSummary(store, fingerprint = '') {
  const normalized = normalizeStore(store);
  const deck = fingerprint ? normalized.decks[fingerprint] : null;
  const games = deck?.games || 0;
  return {
    recordedGames: normalized.recordedGames,
    deckGames: games,
    scale: deckScale(games),
    adopted: hasResidual(normalized.adoptedShared) || hasResidual(deck?.adopted),
    lastGate: normalized.lastGate
  };
}

export function loadBrowserStore(key, storage = globalThis.localStorage) {
  try {
    if (!storage) return emptyStore();
    return normalizeStore(JSON.parse(storage.getItem(key) || 'null'));
  } catch {
    return emptyStore();
  }
}

export function saveBrowserStore(key, store, storage = globalThis.localStorage) {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(normalizeStore(store)));
    return true;
  } catch {
    return false;
  }
}
