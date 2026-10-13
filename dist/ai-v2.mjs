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

function moveBias(s, a) {
  if (a.type !== 'move' && a.type !== 'step') return 0;
  const loc = locate(s, a.uid);
  if (!loc) return 0;
  if (a.type === 'step') return -0.5;
  const c = loc.card;
  const available = energy(s, controller(s)) - generated(s, c);
  const ownHand = s.players[controller(s)].hand;
  const affordable = ownHand.some(h => cardOf(h).energy <= available && cardOf(h).energy > 0);
  return bp(s, c) >= 3000 && (available >= 2 || !affordable) ? 1.7 : -2;
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
    return (a.line === 'front' ? 2.8 + number(d.bp) / 2000 : 2.1 + number(d.gen))
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
