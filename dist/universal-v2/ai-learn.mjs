// V2 learning wrapper. Zero adopted weights reproduce Hard exactly.
// Blocks, other pending choices, and the start phase stay on Hard.
// Main, move, and attack may switch only when a one-step public score, plus
// the four-feature residual, beats Hard by a clear margin and the step does
// not reveal deck order or a life card.
import {chooseUniversalAiAction} from './ai.mjs';
import {
  legalUniversalActions, dispatchUniversalAction, universalBp, universalEnergy
} from './engine.mjs';
import {
  FEATURE_COUNT, featuresFromSnapshot, dot, hasResidual, matchFingerprint
} from '../ai-learn.mjs';

export const LEARN_MARGIN = 0.15;

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
  if (!attackers.length) return 0;
  const blockers = state.players[1 - seat].front.filter(card => card?.ready);
  if (!blockers.length) return 1;
  const bestBlock = blockers.reduce((best, card) => Math.max(best, universalBp(pack, state, card)), 0);
  const gap = attackers.reduce((best, card) => Math.max(best,
    (universalBp(pack, state, card) - bestBlock) / 4000), -1);
  return Math.max(-1, Math.min(1, gap));
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
    if (a.life.some((card, i) => card.uid !== b.life[i]?.uid)) return true;
  }
  return false;
}

function publicBase(snap) {
  return (lifeScore(snap.lifeOwn) - lifeScore(snap.lifeOpp)) / 90
    + (snap.fieldOwn - snap.fieldOpp) / 40
    + (snap.energyOwn - snap.energyTarget) / 6;
}

function publicDelta(pack, before, after, seat, weights) {
  const from = universalLearnSnapshot(pack, before, seat);
  const to = universalLearnSnapshot(pack, after, seat);
  return publicBase(to) - publicBase(from)
    + dot(featuresFromSnapshot(to), weights) - dot(featuresFromSnapshot(from), weights);
}

export function learnPhaseOpen(state) {
  return !state.pending && (state.phase === 'main' || state.phase === 'move' || state.phase === 'attack');
}

export function universalLearnPool(pack, state, hardAction) {
  const legal = legalUniversalActions(pack, state);
  const pool = [];
  const push = action => {
    if (!action || pool.length >= 8) return;
    if (!pool.some(kept => exact(kept, action))) pool.push(action);
  };
  push(hardAction);
  for (const action of legal) {
    if (state.phase === 'attack') {
      if (action.type !== 'attack' && action.type !== 'next') continue;
    } else if (action.type === 'next') continue;
    push(action);
  }
  return pool;
}

function scoreAction(pack, state, action, weights) {
  try {
    const after = dispatchUniversalAction(pack, state, action, {actor: state.active});
    if (hiddenChange(state, after)) return null;
    return publicDelta(pack, state, after, state.active, weights);
  } catch {
    return null;
  }
}

export function chooseUniversalLearnAction(pack, state, {weights = null} = {}) {
  const hard = chooseUniversalAiAction(pack, state, {difficulty: 'hard'});
  if (!hasResidual(weights) || !learnPhaseOpen(state)) return hard;
  const legal = legalUniversalActions(pack, state);
  if (!legal.some(action => exact(action, hard))) return hard;
  let best = hard, bestScore = null;
  for (const action of universalLearnPool(pack, state, hard)) {
    const score = scoreAction(pack, state, action, weights);
    if (exact(action, hard)) bestScore = score;
    else if (score != null && bestScore != null && score > bestScore + LEARN_MARGIN) {
      best = action;
      bestScore = score;
    }
  }
  return legal.some(action => exact(action, best)) ? best : hard;
}

// Used only while training, and only when the candidate still ties Hard.
// The salt rotates through the same public pool the scorer uses.
export function exploratoryLearnAction(pack, state, hardAction, salt = 0) {
  if (!learnPhaseOpen(state)) return hardAction;
  const others = universalLearnPool(pack, state, hardAction).filter(action => !exact(action, hardAction));
  if (!others.length) return hardAction;
  const index = Math.abs(Number(salt) || 0) % others.length;
  return others[index];
}

// Feature difference of two legal actions. Null when they match, when either
// step reveals hidden order, or when the four residual numbers do not change.
export function universalActionDelta(pack, state, chosen, hardAction, seat = state.active) {
  if (!chosen || !hardAction || exact(chosen, hardAction) || !learnPhaseOpen(state)) return null;
  try {
    const afterChosen = dispatchUniversalAction(pack, state, chosen, {actor: state.active});
    const afterHard = dispatchUniversalAction(pack, state, hardAction, {actor: state.active});
    if (hiddenChange(state, afterChosen) || hiddenChange(state, afterHard)) return null;
    const delta = universalLearnFeatures(pack, afterChosen, seat)
      .map((n, i) => n - universalLearnFeatures(pack, afterHard, seat)[i]);
    return delta.some(n => n !== 0) ? delta : null;
  } catch {
    return null;
  }
}

export {matchFingerprint};
