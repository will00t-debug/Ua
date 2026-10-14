// Generic local decision engine for UNION ARENA.
// The rules engine remains the sole authority for legality and effect resolution.
// This module does not use a card-ID whitelist or an external LLM.
import {
  botAction as legacyBotAction, legalActions, dispatch, controller,
  cardOf, bp, energy, generated, locate
} from './engine.mjs';

export const AI_LEVELS = Object.freeze(['easy', 'normal', 'hard']);
const isCharacter = c => c && cardOf(c)?.type === 'character';
const number = n => Number.isFinite(n) ? n : 0;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function cardWorth(s, c) {
  if (!c) return 0;
  const d = cardOf(c);
  if (!d) return 0;
  return d.type === 'character'
    ? 1.4 + number(d.bp) / 1550 + number(d.gen) * 0.85 + (d.raid ? 1.2 : 0)
    : d.type === 'event' ? 2.5 : 1.8 + number(d.gen);
}

function fieldWorth(s, p) {
  const pl = s.players[p];
  let value = 0;
  for (const c of pl.front) {
    if (!isCharacter(c)) continue;
    const d = cardOf(c);
    value += 3.1 + bp(s, c) / 1100 + (c.ready ? 0.8 : 0)
      + ((c.stack?.length || 0) ? 1.1 : 0)
      + (d.impact || c.impactTurn === s.turn ? 1.3 : 0);
  }
  for (const c of pl.energy) {
    if (!c) continue;
    value += 0.6 + Math.min(3, generated(s, c)) * 0.35;
  }
  const e = energy(s, p);
  // Access to successive energy thresholds is more useful than excess energy.
  value += [1, 2, 3, 4, 5, 6].reduce((v, threshold) =>
    v + (e >= threshold ? [2.4, 2.2, 1.8, 1.65, 0.8, 0.4][threshold - 1] : 0), 0);
  return value;
}

// Viewpoint score uses own known hand and *only counts* for enemy hidden zones.
// knownUids is frozen at the start of a decision; newly drawn unknown cards
// cannot receive extra credit because the simulated engine saw their identity.
export function evaluatePosition(s, p, knownUids = new Set(s.players[p].hand.map(c => c.uid))) {
  if (s.status === 'finished') return s.winner === p ? 10000 : -10000;
  const own = s.players[p], opp = s.players[1 - p];
  const ownLife = own.life.length, oppLife = opp.life.length;
  const life = n => n <= 0 ? -90 : n === 1 ? -20 : n === 2 ? -7 : n * 3;
  const knownHand = own.hand.filter(c => knownUids.has(c.uid));
  const handValue = knownHand.reduce((sum, c) => sum + Math.min(5, cardWorth(s, c)), 0) * 0.24;
  const newHandCount = own.hand.length - knownHand.length;
  return life(ownLife) - life(oppLife)
    + fieldWorth(s, p) - fieldWorth(s, 1 - p) * 1.03
    + handValue + Math.max(0, newHandCount) * 0.65
    - opp.hand.length * 0.5
    + (own.ap || 0) * (s.active === p && s.phase === 'main' ? 0.36 : 0.08);
}

function targetValue(s, id) {
  const l = locate(s, id);
  return l ? cardWorth(s, l.card) + (l.line === 'front' ? 2 : 0) : 0;
}

// Generic fallback retains the existing rule-specific choice handling.
// Defensive blocking and discarding use contextual evaluation instead of ID checks.
function choosePending(s) {
  const q = s.pending, p = controller(s), pl = s.players[p];
  const e = q?.effect || {};
  if (!q?.choices?.length) return {type: 'choose', ids: []};
  // Optional line-swaps must be evaluated through BOTH target and destination.
  // The old fallback always chose the first character and first slot, frequently
  // moving an important frontliner backwards or banishing an occupied slot.
  if (['moveAcrossPick', 'moveAcrossSlot', 'aizenFrontSlot'].includes(e.kind))
    return chooseRelocation(s);
  if (e.kind === 'aizenRestTwo') {
    // Rest the least valuable attackers/blockers when bringing Aizen forward.
    const ordered = [...q.choices].sort((a, b) => {
      const cost = choice => {
        const c = locate(s, choice.id)?.card;
        if (!c) return Infinity;
        const d = cardOf(c);
        return bp(s, c) / 1000 + (d?.raid ? 2 : 0)
          + (d?.impact || c.impactTurn === s.turn ? 2 : 0)
          + (c.damageTurn === s.turn ? 2 : 0);
      };
      return cost(a) - cost(b);
    });
    return {type: 'choose', ids: ordered.slice(0, q.max).map(c => c.id)};
  }
  if (e.kind === 'block') {
    const attacking = locate(s, e.uid);
    if (!attacking) return {type: 'choose', ids: ['pass']};
    const attackPower = bp(s, attacking.card);
    const candidates = q.choices.filter(c => c.id !== 'pass').map(c => {
      const blocker = locate(s, c.id);
      if (!blocker) return null;
      const defence = bp(s, blocker.card);
      // Ties are won by the attacker; blocking can still save a crucial life.
      const survives = defence > attackPower;
      return {id: c.id, value: (survives ? 5 : -cardWorth(s, blocker.card) * 0.7)
        - (survives ? defence / 4500 : 0)
        + (pl.life.length <= 2 ? 10 : pl.life.length <= 4 ? 2.5 : 0)};
    }).filter(Boolean).sort((a, b) => b.value - a.value);
    if (!candidates.length || candidates[0].value < 0) return {type: 'choose', ids: ['pass']};
    return {type: 'choose', ids: [candidates[0].id]};
  }
  if (e.kind === 'discard') {
    const ordered = q.choices.map(c => {
      const card = pl.hand.find(x => x.uid === c.id);
      const d = card && cardOf(card);
      const earlyEnergy = d?.energy === 0 && energy(s, p) < 3 ? 4 : 0;
      return {id: c.id, score: cardWorth(s, card) + earlyEnergy};
    }).sort((a, b) => a.score - b.score);
    return {type: 'choose', ids: ordered.slice(0, q.max).map(x => x.id)};
  }
  if (['destroy', 'buff', 'activeBuff', 'bounce'].includes(e.kind)) {
    const descending = e.kind !== 'bounce';
    const ordered = [...q.choices].sort((a, b) =>
      (targetValue(s, b.id) - targetValue(s, a.id)) * (descending ? 1 : -1));
    return {type: 'choose', ids: ordered.slice(0, q.max).map(x => x.id)};
  }
  return legacyBotAction(s);
}

// Simulate the public board transition of a placement, never reading hidden
// opponent cards or giving credit for identities revealed during simulation.
function relocationGain(before, after, p, movedUid) {
  const known = new Set(before.players[p].hand.map(c => c.uid));
  let gain = evaluatePosition(after, p, known) - evaluatePosition(before, p, known);
  const oldEnergy = energy(before, p), newEnergy = energy(after, p);
  if (newEnergy < oldEnergy) {
    const goal = plannedEnergy(before, p).target;
    // Do not strand future turns just to get an extra attacker this turn.
    gain -= Math.max(0, Math.min(oldEnergy, goal) - newEnergy) * 6;
    const lostPlays = before.players[p].hand.filter(c => {
      const d = cardOf(c);
      return d?.type === 'character' && d.energy <= oldEnergy && d.energy > newEnergy;
    }).length;
    gain -= lostPlays * 7;
  }
  // Occupied destinations remove a real card from the game; this is never a
  // free swap. Treat it as a major loss, especially on a Raid stack.
  const banished = after.players[p].removed.length - before.players[p].removed.length;
  if (banished > 0) gain -= banished * 22;
  const from = locate(before, movedUid), to = locate(after, movedUid);
  if (from?.line === 'front' && to?.line === 'energy') {
    gain -= 2 + (from.card.ready ? 1 : 0)
      + (cardOf(from.card)?.raid ? 2 : 0);
  }
  return gain;
}

// Aizen and similar on-play effects are optional. Explore every legal
// source/destination pair before choosing; skip if all moves are harmful.
// This also prevents choosing slot 1 by default and banishing a key ally.
function chooseRelocation(s) {
  const q = s.pending, p = controller(s), kind = q.effect.kind;
  if (kind === 'moveAcrossPick') {
    let best = null;
    for (const choice of q.choices) {
      try {
        const selected = dispatch(s, {type: 'choose', ids: [choice.id]});
        if (selected.pending?.effect.kind !== 'moveAcrossSlot') continue;
        for (const slot of selected.pending.choices) {
          const after = dispatch(selected, {type: 'choose', ids: [slot.id]});
          const gain = relocationGain(s, after, p, choice.id);
          if (!best || gain > best.gain)
            best = {id: choice.id, gain};
        }
      } catch { /* Ignore an invalid simulated outcome, not the real game. */ }
    }
    if (!best || (q.min === 0 && best.gain <= 0.8))
      return {type: 'choose', ids: q.min === 0 ? [] : [best?.id || q.choices[0].id]};
    return {type: 'choose', ids: [best.id]};
  }
  let best = null;
  for (const slot of q.choices) {
    try {
      const after = dispatch(s, {type: 'choose', ids: [slot.id]});
      const gain = relocationGain(s, after, p, q.effect.uid);
      if (!best || gain > best.gain) best = {id: slot.id, gain};
    } catch { /* Keep the actual choice legal. */ }
  }
  return {type: 'choose', ids: [best?.id || q.choices[0].id]};
}

function scoreAttack(s, a) {
  const p = controller(s), opp = s.players[1 - p];
  const c = locate(s, a.uid)?.card;
  if (!c) return -Infinity;
  const power = bp(s, c);
  const defenders = opp.front.filter(x => x?.ready);
  const survivors = defenders.filter(x => bp(s, x) > power);
  const winNow = opp.life.length === 0;
  const highPressure = opp.life.length <= 2;
  const impact = c.impactTurn === s.turn || !!cardOf(c)?.impact;
  return (winNow ? 1000 : 7) + (highPressure ? 8 : 0)
    + power / 2800 + (impact ? 3 : 0)
    - (survivors.length ? 1.8 : 0) + (defenders.length === 0 ? 3 : 0);
}

function genericEffectBonus(s, action, after) {
  const p = controller(s);
  const c = action.uid && (s.players[p].hand.find(x => x.uid === action.uid)
    || locate(s, action.uid)?.card);
  const d = c && cardOf(c);
  const rules = d?.rules || {};
  const text = JSON.stringify(action.type === 'ability'
    ? (rules.abilities?.[action.abilityIndex] || rules.ability || {})
    : action.type === 'raid'
      ? (rules.raid || rules.onRaid || rules.raidEnter || {})
      : rules.enter || rules.onPlay || rules.play || {});
  let bonus = 0;
  if (/draw|search|lookTop|peek|recover/i.test(text)) bonus += 1.15;
  if (/destroy|retire|bounce|remove|damage/i.test(text)) bonus += 1.3;
  if (/buff|ready|active|energyBoost/i.test(text)) bonus += 0.8;
  if (after?.pending) bonus += Math.min(1.1, after.pending.choices?.length * 0.12 || 0.4);
  return bonus;
}

// Plan a short energy curve from the acting player's own visible hand.
// Future draws are unknown, so this is a target, not a prediction.
function plannedEnergy(s, p, excludingUid = null) {
  const pl = s.players[p], current = energy(s, p);
  // The AI knows its own deck construction, but never examines deck order
  // or uses individual future draws to select an action.
  const ownCards = [...pl.deck, ...pl.hand, ...pl.front, ...pl.energy,
    ...pl.outside, ...pl.removed].filter(Boolean);
  const deckCosts = ownCards.map(c => cardOf(c))
    .filter(d => d?.type === 'character')
    .map(d => number(d.energy)).filter(n => n > 0 && n <= 8)
    .sort((a, b) => a - b);
  const handCosts = pl.hand.filter(c => c.uid !== excludingUid)
    .map(c => number(cardOf(c)?.energy)).filter(n => n > 0 && n <= 8)
    .sort((a, b) => a - b);
  if (!deckCosts.length) return {target: current, urgency: 0};
  // Common upper-end characters define the practical curve; rare finishers
  // should not force an otherwise low-curve deck to hoard energy forever.
  const commonHigh = deckCosts[Math.floor((deckCosts.length - 1) * 0.85)];
  const deckMax = deckCosts[deckCosts.length - 1];
  const strategic = Math.min(8, commonHigh);
  const pending = handCosts.filter(n => n > current);
  const next = pending[0];
  const target = Math.max(strategic, next || 0);
  return {target, urgency: pending.length, deckMax, strategic};
}
function moveBias(s, a) {
  if (a.type !== 'move' && a.type !== 'step') return 0;
  const loc = locate(s, a.uid);
  if (!loc) return 0;
  if (a.type === 'step') return -0.5;
  const c = loc.card;
  const available = energy(s, controller(s)) - generated(s, c);
  const ownHand = s.players[controller(s)].hand;
  const futureCosts = ownHand.map(h => number(cardOf(h)?.energy)).filter(n => n > 0);
  const plan = plannedEnergy(s, controller(s));
  if (available < plan.target) return -22 - (plan.target - available) * 3;
  const stranded = futureCosts.filter(n => n > available && n <= energy(s, controller(s)));
  // Never move the generator that enables a playable high-cost card.
  // The attack value of a small character must not destroy the energy curve.
  if (stranded.length) return -20 - stranded.length * 3;
  if (available < 2 && futureCosts.some(n => n > available)) return -16;
  const affordable = futureCosts.some(n => n <= available);
  return bp(s, c) >= 3000 && (available >= 3 || !affordable && available >= 2) ? 1.7 : -5;
}

// Preserve early energy development: low-cost generators are usually setup,
// not frontline attackers. This only ranks legal actions; engine rules stay authoritative.
function energyDevelopmentBias(s, a) {
  if (a.type !== 'play') return 0;
  const p = controller(s), pl = s.players[p];
  const c = pl.hand.find(x => x.uid === a.uid);
  const d = c && cardOf(c);
  if (!d || d.type !== 'character') return 0;
  const cost = number(d.energy), gen = number(d.gen);
  if (gen <= 0) return 0;
  const current = energy(s, p);
  const handCosts = pl.hand.filter(x => x.uid !== a.uid).map(x => number(cardOf(x)?.energy));
  const unlocks = handCosts.filter(x => x > current && x <= current + gen).length;
  const needed = handCosts.some(x => x > current);
  const early = current < 3;
  const plan = plannedEnergy(s, p, a.uid);
  if (a.line === 'energy') {
    return (early ? 5.5 : current < plan.target ? 4.5 : current < 5 ? 1 : 0) +
      (current < plan.target ? Math.min(gen, plan.target - current) * 2.5 : 0) +
      Math.min(3, unlocks) * 2.1 + (needed ? 1.4 : 0);
  }
  if (a.line === 'front' && cost === 0 && (early || current < plan.target)) {
    return -7.5 - (needed ? 2 : 0);
  }
  return 0;
}

function estimateAction(s, a) {
  if (a.type === 'attack' || a.type === 'snipe') return scoreAttack(s, a);
  const p = controller(s), pl = s.players[p];
  if (a.type === 'next') return -0.4;
  if (a.type === 'extraDraw') return pl.ap > 1 && pl.hand.length <= 3 ? 3 : -2;
  if (a.type === 'move' || a.type === 'step') {
    return moveBias(s, a) - (pl[a.type === 'move' ? 'front' : 'energy'][a.slot] ? 12 : 0);
  }
  if (a.type === 'ability' || a.type === 'handAbility') return 1;
  if (a.type === 'play' || a.type === 'raid') {
    const c = pl.hand.find(x => x.uid === a.uid);
    if (!c) return -10;
    const d = cardOf(c);
    if (a.type === 'raid') return 6 + (a.line === 'front' ? 2 : 0)
      - (pl[a.line][a.slot] && pl[a.line][a.slot].uid !== a.target ? 16 : 0);
    if (d.type === 'event') return 1.4;
    const occupied = pl[a.line]?.[a.slot];
    return energyDevelopmentBias(s, a) + (a.line === 'front' ? 2.8 + number(d.bp) / 2000 : 2.1 + number(d.gen))
      - (occupied ? 16 : 0) - (a.line === 'energy' && number(d.bp) >= 4000 ? 2 : 0);
  }
  return 0;
}

// No look-ahead through hidden draws, mills, rearrangements or life reveals.
// The underlying dispatch() knows deck order; using its future results would
// grant the computer information a human is not entitled to know.
function crossesHiddenBoundary(before, after) {
  if ((before.revealed?.length || 0) !== (after.revealed?.length || 0)) return true;
  if ((before.inspecting?.length || 0) !== (after.inspecting?.length || 0)) return true;
  for (let p = 0; p < 2; p++) {
    const a = before.players[p], b = after.players[p];
    if (a.life.length !== b.life.length || a.deck.length !== b.deck.length) return true;
    if (a.deck.some((x, i) => x.uid !== b.deck[i]?.uid)) return true;
  }
  return false;
}

function candidates(s) {
  const all = legalActions(s);
  const seen = new Set();
  const result = [];
  for (const a of all) {
    if (a.type === 'attack' || a.type === 'snipe' || a.type === 'extraDraw') continue;
    // Equivalent empty placements can create dozens of redundant branches.
    const slotEmpty = a.line && a.slot != null && !s.players[controller(s)][a.line]?.[a.slot];
    const key = slotEmpty ? JSON.stringify([a.type, a.uid, a.target, a.line, 'empty'])
      : JSON.stringify(a);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(a);
  }
  return result.sort((a, b) => estimateAction(s, b) - estimateAction(s, a));
}

function searchGain(s, p, known, depth, beam, budget) {
  if (!depth || s.status !== 'playing' || controller(s) !== p ||
      s.pending || (s.phase !== 'main' && s.phase !== 'move')) return 0;
  const start = evaluatePosition(s, p, known);
  let best = 0; // Ending this decision chain remains an option.
  for (const a of candidates(s).slice(0, beam)) {
    if (budget.left-- <= 0) break;
    if (a.type === 'next') continue;
    try {
      const after = dispatch(s, a);
      const secret = crossesHiddenBoundary(s, after);
      const immediate = secret
        ? estimateAction(s, a) * 0.52 + genericEffectBonus(s, a, after)
        : evaluatePosition(after, p, known) - start + genericEffectBonus(s, a, after)
          + moveBias(s, a) * 0.35;
      const future = secret ? 0 : 0.8 * searchGain(after, p, known, depth - 1, beam, budget);
      best = Math.max(best, immediate + future);
    } catch { /* A complex resolution may require human choice; skip this branch. */ }
  }
  return best;
}

export function chooseAiAction(s, {difficulty = 'normal'} = {}) {
  if (!AI_LEVELS.includes(difficulty)) difficulty = 'normal';
  if (difficulty === 'easy') return legacyBotAction(s);
  if (s.status === 'finished') return null;
  if (s.pending) return choosePending(s);
  if (s.status === 'mulligan') {
    const pl = s.players[controller(s)];
    const zero = pl.hand.filter(c => cardOf(c).energy === 0).length;
    const cheap = pl.hand.filter(c => cardOf(c).energy <= 1).length;
    return zero === 0 && cheap < 2 && !pl.redrawn ? {type: 'redraw'} : {type: 'keep'};
  }
  const all = legalActions(s);
  if (!all.length) return null;
  if (s.phase === 'attack') return all.filter(a => a.type !== 'next')
    .sort((a, b) => scoreAttack(s, b) - scoreAttack(s, a))[0] || {type: 'next'};
  if (s.phase === 'start') {
    const extra = all.find(a => a.type === 'extraDraw');
    const pl = s.players[controller(s)];
    if (extra && pl.hand.length <= 2 && pl.ap > 1) return extra;
    return all.find(a => a.type === 'next') || all[0];
  }
  const p = controller(s), known = new Set(s.players[p].hand.map(c => c.uid));
  const current = evaluatePosition(s, p, known);
  const level = difficulty === 'hard' ? {depth: 3, beam: 6, nodes: 85} : {depth: 1, beam: 0, nodes: 24};
  const budget = {left: level.nodes};
  let bestAction = all.find(a => a.type === 'next') || all[0];
  let bestScore = -0.45;
  for (const a of candidates(s)) {
    if (budget.left-- <= 0) break;
    if (a.type === 'next') continue;
    let score;
    try {
      const after = dispatch(s, a);
      const secret = crossesHiddenBoundary(s, after);
      score = secret
        ? estimateAction(s, a) * 0.52 + genericEffectBonus(s, a, after)
        : evaluatePosition(after, p, known) - current + genericEffectBonus(s, a, after)
          + moveBias(s, a) * 0.35;
      if (!secret && level.depth > 1)
        score += 0.8 * searchGain(after, p, known, level.depth - 1, level.beam, budget);
      if (a.type === 'play') score += energyDevelopmentBias(s, a);
      if (a.type === 'move') score += moveBias(s, a) * 2.5;
      // Playing an affordable card and retaining AP has situational value, not
      // an absolute "always Raid" priority.
      if (a.type === 'raid') score += 0.35;
      if (a.type === 'play' && a.line === 'energy' && energy(s, p) >= 6) score -= 1;
    } catch {
      score = -Infinity;
    }
    if (score > bestScore) {bestScore = score; bestAction = a;}
  }
  return bestAction;
}
