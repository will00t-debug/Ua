// V2 learning wrapper. Zero adopted weights reproduce Hard exactly.
// Pending choices, the start phase, and the attack phase stay on the Hard
// policy. Main and move may switch only when a one-step public score, plus
// the residual, beats Hard by a clear margin and the step reveals nothing hidden.
import {chooseUniversalAiAction} from './ai.mjs';
import {
  legalUniversalActions, dispatchUniversalAction, universalBp, universalEnergy
} from './engine.mjs';
import {
  FEATURE_COUNT, featuresFromSnapshot, dot, hasResidual, matchFingerprint
} from '../ai-learn.mjs';

const exact = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lifeScore = n => n <= 0 ? -90 : n === 1 ? -20 : n === 2 ? -7 : n * 3;

function energyTarget(pack, state, seat) {
  const catalog = Array.isArray(pack) ? pack[seat] : pack;
  const counts = state.initialCounts?.[seat] || {};
  let peak = 0;
  for (const [id, count] of Object.entries(counts)) {
    if (count > 0) peak = Math.max(peak, catalog?.cards?.[id]?.energy || 0);
  }
  return Math.max(2, Math.min(6, peak || 2));
}

function fieldSignal(pack, state, seat) {
  const player = state.players[seat];
  let value = 0;
  for (const card of player.front) {
    if (!card) continue;
    value += universalBp(pack, state, card) / 5000 + (card.ready ? 0.15 : 0)
      + Math.min(2, card.stack?.length || 0) * 0.1;
  }
  value += Math.min(6, universalEnergy(pack, state, seat)) / 6;
  return value;
}

function pressure(pack, state, seat) {
  const attackers = state.players[seat].front.filter(card => card?.ready);
  const blockers = state.players[1 - seat].front.filter(card => card?.ready);
  return attackers.some(attacker => blockers.every(blocker =>
    universalBp(pack, state, blocker) < universalBp(pack, state, attacker))) ? 1 : 0;
}

export function universalLearnSnapshot(pack, state, seat) {
  const own = state.players[seat], opp = state.players[1 - seat];
  return {
    lifeOwn: own.life.length,
    lifeOpp: opp.life.length,
    fieldOwn: fieldSignal(pack, state, seat),
    fieldOpp: fieldSignal(pack, state, 1 - seat),
    energyOwn: universalEnergy(pack, state, seat),
    energyTarget: energyTarget(pack, state, seat),
    readyOwn: own.front.filter(card => card?.ready).length,
    readyOpp: opp.front.filter(card => card?.ready).length,
    knownHand: own.hand.length,
    oppHand: opp.hand.length,
    ap: own.apCards.filter(card => card.ready).length,
    apActive: state.active === seat && state.phase === 'main' ? 1 : 0,
    raidOwn: [...own.front, ...own.energy].reduce((n, card) => n + (card?.stack?.length || 0), 0),
    pressure: pressure(pack, state, seat),
    first: state.first === seat ? 1 : 0
  };
}

export function universalLearnFeatures(pack, state, seat) {
  const features = featuresFromSnapshot(universalLearnSnapshot(pack, state, seat));
  if (features.length !== FEATURE_COUNT) throw Error('V2 learn feature width drifted');
  return features;
}

function hiddenChange(before, after) {
  for (let p = 0; p < 2; p++) {
    const a = before.players[p], b = after.players[p];
    if (a.life.length !== b.life.length || a.deck.length !== b.deck.length) return true;
    if (a.deck.some((card, i) => card.uid !== b.deck[i]?.uid)) return true;
  }
  return false;
}

function publicDelta(pack, before, after, seat, weights) {
  const from = universalLearnSnapshot(pack, before, seat);
  const to = universalLearnSnapshot(pack, after, seat);
  const score = snap => (lifeScore(snap.lifeOwn) - lifeScore(snap.lifeOpp)) / 90
    + (snap.fieldOwn - snap.fieldOpp) / 40
    + (snap.energyOwn - snap.energyTarget) / 6;
  return score(to) - score(from)
    + dot(featuresFromSnapshot(to), weights) - dot(featuresFromSnapshot(from), weights);
}

export function chooseUniversalLearnAction(pack, state, {weights = null} = {}) {
  const hard = chooseUniversalAiAction(pack, state, {difficulty: 'hard'});
  if (!hasResidual(weights)) return hard;
  if (state.pending || (state.phase !== 'main' && state.phase !== 'move')) return hard;
  const legal = legalUniversalActions(pack, state);
  if (!legal.some(action => exact(action, hard))) return hard;
  const pool = [hard];
  for (const action of legal) {
    if (pool.length >= 8) break;
    if (action.type === 'next' || action.type === 'attack') continue;
    if (!pool.some(kept => exact(kept, action))) pool.push(action);
  }
  let best = hard, bestScore = null;
  for (const action of pool) {
    let score = null;
    try {
      const after = dispatchUniversalAction(pack, state, action, {actor: state.active});
      if (!hiddenChange(state, after))
        score = publicDelta(pack, state, after, state.active, weights);
    } catch { score = null; }
    if (exact(action, hard)) bestScore = score;
    else if (score != null && bestScore != null && score > bestScore + 0.15) {
      best = action;
      bestScore = score;
    }
  }
  return legal.some(action => exact(action, best)) ? best : hard;
}

export {matchFingerprint};
