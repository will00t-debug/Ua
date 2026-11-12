import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions, universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action, lastAiV3Trace, MATCH_LIMITS, resetAiV3Report} from '../dist/universal-v2/ai-v3/search.mjs';
import {rankLegal} from '../dist/universal-v2/ai-v3/beam.mjs';
import {bindProbeBudget, bindVariant, moveDevelopment} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {packOf} from '../dist/universal-v2/ai-v3/observation.mjs';
import {loadAudits, listFlips, deckById, replayPrefix} from '../scripts/ai-v3-reserve-ap-fork.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const flip = listFlips(...Object.values(loadAudits())).find(item => item.key === 'steins-gate-raid|8442|0|0');
const deck = deckById().get(flip.title);

function atMove() {
  const base = replayPrefix(deck, flip.candidate, flip.diff);
  assert.equal(base.ok, true);
  let state = structuredClone(base.state);
  let index = flip.diff;
  for (const step of flip.candidate.actions.slice(flip.diff)) {
    if (!state.pending && state.active === flip.seat && state.phase === 'move' && state.turn > base.state.turn) break;
    const actor = state.pending?.player ?? state.active;
    const legal = legalUniversalActions(base.packs, state);
    const action = legal.find(item => same(item, step.action));
    assert.ok(action);
    state = dispatchUniversalAction(base.packs, state, action, {actor});
    index += 1;
  }
  assert.equal(index, 28);
  assert.equal(assertUniversalMatch(base.packs, state), true);
  return {packs: base.packs, state, seat: flip.seat};
}

function catalogOf(packs, seat) {
  return packOf(packs, seat).cards;
}

function farisMove(packs, state, seat) {
  const catalog = catalogOf(packs, seat);
  return legalUniversalActions(packs, state).find(action => action.type === 'move' &&
    catalog[state.players[seat].energy.find(card => card?.uid === action.uid)?.cardId]?.id === 'STG-1-023');
}

function view(packs, state, seat, factors) {
  const moved = farisMove(packs, state, seat);
  assert.ok(moved);
  return factors ? bindVariant(null, () => moveDevelopment(packs, state, seat, moved), factors) : moveDevelopment(packs, state, seat, moved);
}

function ask(packs, state, seat, extra) {
  const meter = {dispatches: 0};
  resetAiV3Report();
  const action = chooseAiV3Action(packs, state, {
    actor: seat, ...MATCH_LIMITS, nodes: 48, ms: 1e9, seed: 1, plan: 'tree', diagnose: true, meter, ...extra
  });
  const trace = lastAiV3Trace();
  assert.equal(legalUniversalActions(packs, state).some(item => same(item, action)), true);
  if (trace.reason !== 'forced') {
    assert.ok(trace.nodesUsed <= 48);
    assert.equal(meter.dispatches, trace.nodesUsed);
  }
  return {action, trace, meter};
}

function onlyEnergy(state, seat, id, catalog) {
  const mine = state.players[seat];
  mine.energy.forEach((card, index) => {
    if (card && catalog[card.cardId].id !== id) {
      mine.deck.push(card);
      mine.energy[index] = null;
    }
  });
}

function onlyHand(state, seat, id, catalog) {
  const mine = state.players[seat];
  const keep = mine.hand.find(card => catalog[card.cardId].id === id);
  assert.ok(keep);
  for (const card of mine.hand) if (card !== keep) mine.deck.push(card);
  mine.hand = [keep];
  return keep;
}

function liveDraw(packs, state, seat) {
  const catalog = catalogOf(packs, seat);
  const next = structuredClone(state);
  onlyEnergy(next, seat, 'STG-1-023', catalog);
  const card = onlyHand(next, seat, 'STG-1-008', catalog);
  assert.equal(assertUniversalMatch(packs, next), true);
  assert.equal(universalEnergyByColor(packs, next, seat).blue, 2);
  return {state: next, card};
}

test('raid-frame entry text does not count, so the confirmed Mayuri position still moves', () => {
  const {packs, state, seat} = atMove();
  const plain = view(packs, state, seat);
  const held = view(packs, state, seat, {holdInfo: true});
  assert.equal(plain.benefit, 'block');
  assert.equal(plain.strip, false);
  assert.equal(held.benefit, 'block');
  assert.equal(held.strip, false);
  assert.equal(held.reason, 'block');
  assert.equal(held.before, 4);
  assert.equal(held.after, 2);
  const choice = ask(packs, state, seat, {factors: {holdInfo: true}});
  assert.equal(choice.action.type, 'move');
  assert.equal(choice.trace.factors.holdInfo, true);
  assert.equal(choice.trace.factors.reserveAp, undefined);
});

test('a live draw that the move leaves unpaid passes, then the new hand is chosen again', () => {
  const opened = atMove();
  const {packs, seat} = opened;
  const catalog = catalogOf(packs, seat);
  const first = liveDraw(packs, opened.state, seat);
  const second = liveDraw(packs, opened.state, seat);
  const deep = second.state.players[seat].deck.findIndex((card, index) => index > 2 && catalog[card.cardId].id !== catalog[second.state.players[seat].deck[0].cardId].id);
  assert.ok(deep > 0);
  [second.state.players[seat].deck[0], second.state.players[seat].deck[deep]] = [second.state.players[seat].deck[deep], second.state.players[seat].deck[0]];
  const plain = view(packs, first.state, seat);
  assert.equal(plain.benefit, 'block');
  assert.equal(plain.strip, false);
  const cached = view(packs, first.state, seat, {holdInfo: true});
  assert.equal(cached.reason, 'info-front');
  assert.equal(cached.strip, true);
  assert.equal(cached.benefit, null);
  assert.equal(cached.before, 2);
  assert.equal(cached.after, 0);
  const ranked = bindVariant(null, () => rankLegal(packs, first.state, seat, legalUniversalActions(packs, first.state), null), {holdInfo: true});
  assert.equal(ranked[0].type, 'next');
  assert.equal(ranked.some(action => action.type === 'move'), true);
  const closed = ask(packs, first.state, seat);
  assert.equal(closed.action.type, 'move');
  assert.equal(closed.trace.factors.holdInfo, undefined);

  function line(state) {
    const steps = [];
    let cursor = state;
    for (let guard = 0; guard < 6 && cursor.status === 'playing'; guard++) {
      const actor = cursor.pending?.player ?? cursor.active;
      assert.equal(actor, seat);
      const hand = cursor.players[seat].hand.map(card => catalog[card.cardId].id + ':' + card.uid);
      const choice = ask(packs, cursor, seat, {factors: {holdInfo: true}});
      steps.push({
        phase: cursor.phase, pending: cursor.pending?.kind || null, hand,
        action: choice.action, reason: choice.trace.reason, nodes: choice.trace.nodesUsed
      });
      cursor = dispatchUniversalAction(packs, cursor, choice.action, {actor});
      assert.equal(assertUniversalMatch(packs, cursor), true);
      if (steps.length >= 2 && !cursor.pending && choice.action.type === 'chooseDiscard') break;
    }
    return steps;
  }
  const live = line(first.state);
  const swapped = line(second.state);
  assert.equal(live[0].action.type, 'next');
  assert.equal(live[0].pending, null);
  assert.equal(live[1].action.type, 'play');
  assert.equal(live[1].action.line, 'front');
  assert.equal(live[1].action.uid, first.card.uid);
  assert.equal(live[1].hand.includes('STG-1-008:' + first.card.uid), true);
  assert.equal(live[2].pending, 'effect-discard');
  assert.equal(swapped[0].action.type, 'next');
  assert.deepEqual(swapped[1].action, live[1].action);
  const liveNew = live[2].hand.filter(card => !live[1].hand.includes(card));
  const swappedNew = swapped[2].hand.filter(card => !swapped[1].hand.includes(card));
  assert.equal(liveNew.length, 1);
  assert.equal(swappedNew.length, 1);
  assert.notEqual(liveNew[0], swappedNew[0]);
  assert.equal(live[2].hand.includes(liveNew[0]), true);
  assert.equal(swapped[2].hand.includes(swappedNew[0]), true);
  assert.equal(legalUniversalActions(packs, first.state).some(action => action.type === 'chooseDiscard'), false);
});

test('a life save and a payable raid stay available, and a real clock still returns a legal pass', () => {
  const opened = atMove();
  const {packs, seat} = opened;
  const catalog = catalogOf(packs, seat);
  const {state} = liveDraw(packs, opened.state, seat);
  const saved = structuredClone(state);
  while (saved.players[seat].life.length > 1) saved.players[seat].deck.push(saved.players[seat].life.pop());
  const save = view(packs, saved, seat, {holdInfo: true});
  assert.equal(save.benefit, 'block');
  assert.equal(save.strip, false);
  assert.equal(save.reason, 'block');
  const raided = structuredClone(state);
  const baseName = catalog[raided.players[seat].energy.find(card => card && catalog[card.cardId].id === 'STG-1-023').cardId].name;
  const rider = raided.players[seat].deck.find(card => catalog[card.cardId].id === 'STG-1-001');
  assert.ok(rider);
  raided.players[seat].deck.splice(raided.players[seat].deck.indexOf(rider), 1);
  raided.players[seat].hand.push(rider);
  const altered = packs.map(pack => ({
    ...pack,
    cards: {...pack.cards, 'STG-1-001': {...pack.cards['STG-1-001'], energy: 0, color: 'blue', raidName: baseName}}
  }));
  const raid = view(altered, raided, seat, {holdInfo: true});
  assert.equal(raid.benefit, 'raid');
  assert.equal(raid.strip, false);
  const lethalState = structuredClone(state);
  const foe = 1 - seat;
  while (lethalState.players[foe].life.length > 1) lethalState.players[foe].deck.push(lethalState.players[foe].life.pop());
  lethalState.players[foe].front.forEach((card, index) => {
    if (!card) return;
    lethalState.players[foe].deck.push(card);
    lethalState.players[foe].front[index] = null;
  });
  const lethal = bindProbeBudget({pool: {n: 40}, deadline: 1e15, now: () => 0}, () => view(packs, lethalState, seat, {holdInfo: true}));
  assert.equal(lethal.benefit, 'lethal');
  assert.equal(lethal.strip, false);
  const meter = {dispatches: 0};
  resetAiV3Report();
  const started = performance.now();
  const action = chooseAiV3Action(packs, state, {
    actor: seat, ...MATCH_LIMITS, seed: 1, plan: 'tree', factors: {holdInfo: true}, meter
  });
  const elapsed = performance.now() - started;
  const trace = lastAiV3Trace();
  assert.equal(legalUniversalActions(packs, state).some(item => same(item, action)), true);
  assert.equal(action.type, 'next');
  assert.ok(trace.nodesUsed <= 48);
  assert.equal(meter.dispatches, trace.nodesUsed);
  assert.equal(trace.softMs, 40);
  assert.ok(elapsed < 500);
  assert.equal(trace.reason === 'budget' || trace.reason === 'budget-fallback' || trace.reason === 'search', true);
});
