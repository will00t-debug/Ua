// Residual learning for the V2 battle AI.
// The rules engine stays the authority for legal actions. Easy, normal, and
// hard do not read this store. A zero weight vector leaves Hard unchanged.
//
// The residual is four public numbers: ready difference, hand difference,
// raid count, and whether a ready attacker outpaces every ready blocker.
// Life, field worth, and energy stay in the one-ply score and are not weights.
// A finished match nudges the candidate once, using the average of
// (features after the played action) minus (features after Hard's action).
// Only decisions that actually differed are included. Adopted weights change
// only when the same fixed deals win more games than the previous policy.

export const FEATURE_COUNT = 4;
export const LEARN_ALPHA = 0.05;
export const WEIGHT_LIMIT = 1.5;
export const DECK_PRIOR = 40;
export const TURN_CAP = 30;
export const EXPLORE_RATE = 0.12;
export const FIXED_DEAL_COUNT = 120;
export const STORE_VERSION = 2;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

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

// Ready difference, hand difference, own raid layers, and public pressure.
// Pressure is the best ready character's BP gap against the best ready
// blocker, divided by 4000. An open board is 1. Card names, opponent hand
// identities, and deck order are not inputs.
export function featuresFromSnapshot(snap) {
  const pressure = Number(snap.pressure);
  return [
    clamp(((snap.readyOwn || 0) - (snap.readyOpp || 0)) / 4, -1, 1),
    clamp(((snap.knownHand || 0) - (snap.oppHand || 0)) / 7, -1, 1),
    clamp((snap.raidOwn || 0) / 4, 0, 1),
    clamp(Number.isFinite(pressure) ? pressure : 0, -1, 1)
  ];
}

export function featureDelta(after, before) {
  const next = featuresFromSnapshot(after);
  const prev = featuresFromSnapshot(before);
  return next.map((n, i) => n - prev[i]);
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

// One finished match is one nudge. The rows are action differences, not the
// average board of the whole game.
export function updateWeights(weights, deltas, outcome) {
  const next = clipWeights(weights);
  const rows = (deltas || []).filter(phi => Array.isArray(phi) && phi.length === FEATURE_COUNT);
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
    version: STORE_VERSION,
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
  if (!raw || raw.version !== STORE_VERSION) return emptyStore();
  const decks = {};
  for (const [key, value] of Object.entries(raw.decks || {})) {
    if (typeof key === 'string') decks[key] = deckEntry(value);
  }
  return {
    version: STORE_VERSION,
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

function blend(shared, local, games) {
  const scale = deckScale(games);
  return clipWeights(shared.map((weight, i) => (1 - scale) * weight + scale * (local[i] || 0)));
}

// Adopted deck weights participate only after that list has been copied in.
// A failed gate leaves the deck vector at zero and must not erase the shared one.
export function effectiveWeights(store, fingerprint) {
  const normalized = normalizeStore(store);
  const deck = normalized.decks[fingerprint];
  if (!deck || !hasResidual(deck.adopted)) return clipWeights(normalized.adoptedShared);
  return blend(normalized.adoptedShared, deck.adopted, deck.games);
}

export function candidateWeights(store, fingerprint) {
  const normalized = normalizeStore(store);
  const deck = normalized.decks[fingerprint];
  return blend(normalized.candidateShared, deck?.candidate || emptyWeights(), deck?.games || 0);
}

export function beginTrace(fingerprint = '') {
  return {fingerprint, deltas: [], turn3Energy: null, settled: false};
}

export function observeDelta(trace, delta, {turn = 0, energy = null} = {}) {
  if (!trace || trace.settled) return trace;
  if (Array.isArray(delta) && delta.length === FEATURE_COUNT && delta.some(n => n !== 0))
    trace.deltas.push(delta.slice());
  if (trace.turn3Energy == null && turn >= 3 && Number.isFinite(energy))
    trace.turn3Energy = energy;
  return trace;
}

export function settleMatch(store, trace, {winner = null, aiSeat = 1, turn = 0, status = ''} = {}) {
  const base = normalizeStore(store);
  const finished = status === 'finished' && (winner === 0 || winner === 1);
  const rows = trace?.deltas || [];
  if (!trace || trace.settled || !finished || !(turn <= TURN_CAP) || !rows.length)
    return {store: base, applied: false};
  const outcome = winner === aiSeat ? 1 : -1;
  const next = normalizeStore(structuredClone(base));
  next.candidateShared = updateWeights(next.candidateShared, rows, outcome);
  const key = trace.fingerprint || '';
  const prev = next.decks[key] || deckEntry(null);
  next.decks[key] = {
    adopted: prev.adopted,
    candidate: updateWeights(prev.candidate, rows, outcome),
    games: prev.games + 1
  };
  next.recordedGames += 1;
  trace.settled = true;
  return {store: next, applied: true, outcome};
}

// The same deal list must be longer than the noise of a short gate, and the
// candidate must win strictly more of those deals than the previous policy.
export function judgeFixedDeals({
  previousWins = 0, nextWins = 0, deals = 0, minDeals = FIXED_DEAL_COUNT
} = {}) {
  const n = Math.max(0, Number(deals) || 0);
  const previous = Math.max(0, Number(previousWins) || 0);
  const next = Math.max(0, Number(nextWins) || 0);
  const enough = n >= minDeals;
  return {
    passed: enough && next > previous,
    enough, deals: n, previousWins: previous, nextWins: next,
    gain: next - previous
  };
}

export function adoptCandidate(store, judgement) {
  const next = normalizeStore(store);
  next.lastGate = {...judgement, scope: 'fixed-deals', adopted: !!judgement?.passed};
  if (!judgement?.passed) return next;
  next.adoptedShared = clipWeights(next.candidateShared);
  for (const [key, deck] of Object.entries(next.decks)) {
    next.decks[key] = {...deck, adopted: clipWeights(deck.candidate)};
  }
  return next;
}

export function learnSummary(store, fingerprint = '') {
  const normalized = normalizeStore(store);
  const deck = fingerprint ? normalized.decks[fingerprint] : null;
  const games = deck?.games || 0;
  return {
    recordedGames: normalized.recordedGames,
    deckGames: games,
    scale: deck && hasResidual(deck.adopted) ? deckScale(games) : 0,
    adopted: hasResidual(normalized.adoptedShared) || hasResidual(deck?.adopted),
    lastGate: normalized.lastGate
  };
}

// Most training decisions play the adopted weights. This picks the sparse
// decisions that try the candidate. Rate 0 never explores; rate 1 always does.
export function shouldExplore(gameIndex, decisionIndex, rate = EXPLORE_RATE) {
  const fraction = Number(rate);
  if (!(fraction > 0)) return false;
  if (fraction >= 1) return true;
  let x = Math.imul((gameIndex >>> 0) + 1, 0x9e3779b1) ^ Math.imul((decisionIndex >>> 0) + 1, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x ^= x >>> 16;
  return ((x >>> 0) / 4294967296) < fraction;
}
