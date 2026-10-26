import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {
  FEATURE_COUNT, emptyWeights, emptyStore, featuresFromSnapshot, featureDelta,
  fingerprintCounts, fingerprintZones, updateWeights, settleMatch, beginTrace,
  observeDelta, judgeFixedDeals, adoptCandidate, effectiveWeights, candidateWeights,
  deckScale, hasResidual, normalizeStore, shouldExplore, LEARN_ALPHA, TURN_CAP,
  WEIGHT_LIMIT, FIXED_DEAL_COUNT, STORE_VERSION
} from '../dist/ai-learn.mjs';
import {
  chooseUniversalLearnAction, universalLearnFeatures, universalActionDelta,
  exploratoryLearnAction, LEARN_MARGIN
} from '../dist/universal-v2/ai-learn.mjs';

function vanillaPack() {
  const cards = Array.from({length: 13}, (_, i) => ({
    id: 'L' + String(i).padStart(2, '0'), name: 'Learn ' + i,
    type: 'character', color: 'blue', energy: i < 4 ? 0 : 1, ap: 1, bp: 2000 + i * 500,
    gen: 1, implementation: 'vanilla', traits: []
  }));
  return createUniversalPack({id: 'learn-fixture', version: '1', cards});
}

function countsOf(pack) {
  const ids = Object.keys(pack.cards);
  const counts = Object.fromEntries(ids.slice(0, 12).map(id => [id, 4]));
  counts[ids[12]] = 2;
  return counts;
}

function play(packs, state, action) {
  return dispatchUniversalAction(packs, state, action, {actor: state.pending?.player ?? state.active});
}

function drive(packs, state, limit = 80) {
  let steps = 0;
  while (state.status === 'playing' && steps < limit) {
    const action = chooseUniversalAiAction(packs, state, {difficulty: 'hard'});
    state = play(packs, state, action);
    steps++;
  }
  return state;
}

function opening() {
  const pack = vanillaPack();
  const packs = [pack, pack];
  const counts = countsOf(pack);
  let state = newUniversalMatch(packs, {decks: [counts, counts], first: 0, seed: 7});
  return {packs, state};
}

test('residual features ignore life, field, energy, and hidden order', () => {
  const base = {
    readyOwn: 2, readyOpp: 1, knownHand: 6, oppHand: 5, raidOwn: 1, pressure: 1,
    lifeOwn: 7, lifeOpp: 2, fieldOwn: 9, fieldOpp: 0, energyOwn: 1, energyTarget: 6
  };
  const features = featuresFromSnapshot(base);
  assert.equal(features.length, FEATURE_COUNT);
  assert.deepEqual(features, featuresFromSnapshot({...base, lifeOwn: 1, fieldOwn: 0, energyOwn: 6}));
  assert.equal(features[0], 0.25);
  assert.ok(features.every(n => n >= -1 && n <= 1));
  const {packs, state} = opening();
  const changed = structuredClone(state);
  changed.players[0].hand.reverse();
  changed.players[0].deck.reverse();
  changed.players[0].life.reverse();
  assert.deepEqual(universalLearnFeatures(packs, state, 1), universalLearnFeatures(packs, changed, 1));
  assert.equal(fingerprintZones(state.players[0]), fingerprintZones(changed.players[0]));
  assert.equal(fingerprintZones(state.players[0]), fingerprintCounts(state.initialCounts[0]));
});

test('a win moves weights along the action difference and a loss moves them back', () => {
  const delta = featureDelta(
    {readyOwn: 3, readyOpp: 0, knownHand: 4, oppHand: 6, raidOwn: 2, pressure: 1},
    {readyOwn: 1, readyOpp: 0, knownHand: 5, oppHand: 6, raidOwn: 0, pressure: 0}
  );
  assert.ok(delta[0] > 0 && delta[2] > 0 && delta[3] > 0);
  const won = updateWeights(emptyWeights(), [delta, delta], 1);
  const lost = updateWeights(emptyWeights(), [delta, delta], -1);
  assert.ok(won[0] > 0 && won[2] > 0 && won[3] > 0);
  assert.ok(lost[0] < 0 && lost[2] < 0 && lost[3] < 0);
  assert.ok(won.every(n => n <= WEIGHT_LIMIT && n >= -WEIGHT_LIMIT));
  assert.ok(Math.abs(won[0] - LEARN_ALPHA * delta[0]) < 1e-12);
  const trace = beginTrace('deck-a');
  observeDelta(trace, delta, {turn: 3, energy: 2});
  const settled = settleMatch(emptyStore(), trace, {winner: 1, aiSeat: 1, turn: 4, status: 'finished'});
  assert.equal(settled.applied, true);
  assert.equal(settled.outcome, 1);
  assert.ok(settled.store.candidateShared.some(n => n !== 0));
  assert.ok(settled.store.adoptedShared.every(n => n === 0));
  assert.equal(settled.store.decks['deck-a'].games, 1);
  assert.equal(trace.turn3Energy, 2);
  const same = beginTrace('deck-a');
  observeDelta(same, [0, 0, 0, 0], {turn: 4, energy: 3});
  assert.equal(same.deltas.length, 0);
  const skipped = settleMatch(emptyStore(), same, {winner: 1, aiSeat: 1, turn: 4, status: 'finished'});
  assert.equal(skipped.applied, false);
  const long = beginTrace('deck-a');
  observeDelta(long, delta, {turn: 3, energy: 1});
  const capped = settleMatch(emptyStore(), long, {winner: 1, aiSeat: 1, turn: TURN_CAP + 1, status: 'finished'});
  assert.equal(capped.applied, false);
});

test('fixed deals adopt the measured candidate only when it wins more', () => {
  assert.equal(deckScale(0), 0);
  assert.equal(deckScale(40), 0.5);
  const short = judgeFixedDeals({previousWins: 10, nextWins: 12, deals: 24});
  assert.equal(short.passed, false);
  assert.equal(short.enough, false);
  const tied = judgeFixedDeals({previousWins: 55, nextWins: 55, deals: FIXED_DEAL_COUNT});
  assert.equal(tied.passed, false);
  const better = judgeFixedDeals({previousWins: 55, nextWins: 56, deals: FIXED_DEAL_COUNT});
  assert.equal(better.passed, true);
  const store = emptyStore();
  store.candidateShared = emptyWeights().map(() => 0.4);
  store.decks.list = {candidate: emptyWeights().map(() => 0.8), adopted: emptyWeights(), games: 40};
  const held = adoptCandidate(store, tied);
  assert.ok(held.adoptedShared.every(n => n === 0));
  assert.ok(held.decks.list.adopted.every(n => n === 0));
  assert.ok(effectiveWeights(held, 'list').every(n => n === 0));
  const adopted = adoptCandidate(store, better);
  assert.ok(adopted.adoptedShared.every(n => n === 0.4));
  assert.ok(adopted.decks.list.adopted.every(n => n === 0.8));
  assert.ok(Math.abs(effectiveWeights(adopted, 'list')[0] - 0.6) < 1e-9);
  assert.ok(candidateWeights(store, 'list').every(n => Math.abs(n - 0.6) < 1e-9));
  assert.equal(normalizeStore({version: 1, candidateShared: [1, 1, 1, 1]}).version, STORE_VERSION);
  assert.ok(normalizeStore({version: 1}).candidateShared.every(n => n === 0));
  assert.equal(hasResidual(emptyWeights()), false);
});

test('exploration is sparse, stable, and off at rate zero', () => {
  assert.equal(shouldExplore(3, 4, 0), false);
  assert.equal(shouldExplore(3, 4, 1), true);
  assert.equal(shouldExplore(8, 2), shouldExplore(8, 2));
  let hits = 0;
  for (let game = 0; game < 80; game++) {
    for (let decision = 0; decision < 25; decision++) if (shouldExplore(game, decision)) hits++;
  }
  assert.ok(hits > 140 && hits < 360, hits);
});

test('zero residual matches Hard, and a block prompt stays on Hard', () => {
  const {packs, state} = opening();
  assert.deepEqual(
    chooseUniversalLearnAction(packs, state, {weights: emptyWeights()}),
    chooseUniversalAiAction(packs, state, {difficulty: 'hard'})
  );
  let cursor = state, block = null;
  for (let step = 0; step < 400 && cursor.status === 'playing'; step++) {
    if (cursor.pending?.kind === 'block') {block = cursor; break;}
    cursor = play(packs, cursor, chooseUniversalAiAction(packs, cursor, {difficulty: 'hard'}));
  }
  assert.ok(block, 'fixture reached a block prompt');
  const heavy = emptyWeights().map(() => WEIGHT_LIMIT);
  assert.deepEqual(
    chooseUniversalLearnAction(packs, block, {weights: heavy}),
    chooseUniversalAiAction(packs, block, {difficulty: 'hard'})
  );
});

test('attack and main choices stay legal, and a public difference can leave Hard', () => {
  const {packs, state} = opening();
  let cursor = state;
  let attack = null;
  for (let step = 0; step < 400 && cursor.status === 'playing'; step++) {
    if (cursor.phase === 'attack' && !cursor.pending) {
      const available = legalUniversalActions(packs, cursor).filter(action => action.type === 'attack');
      if (available.length >= 1) {attack = cursor; break;}
    }
    cursor = play(packs, cursor, chooseUniversalAiAction(packs, cursor, {difficulty: 'hard'}));
  }
  assert.ok(attack, 'fixture reached an attack with a legal attacker');
  const attacks = legalUniversalActions(packs, attack).filter(action => action.type === 'attack');
  assert.ok(attacks.length >= 1);
  const hard = chooseUniversalAiAction(packs, attack, {difficulty: 'hard'});
  const weights = emptyWeights().map(() => WEIGHT_LIMIT);
  const learned = chooseUniversalLearnAction(packs, attack, {weights});
  assert.ok(legalUniversalActions(packs, attack).some(action => JSON.stringify(action) === JSON.stringify(learned)));
  assert.deepEqual(chooseUniversalLearnAction(packs, attack, {weights: emptyWeights()}), hard);
  const alternative = exploratoryLearnAction(packs, attack, hard, 1);
  assert.ok(legalUniversalActions(packs, attack).some(action => JSON.stringify(action) === JSON.stringify(alternative)));
  const delta = universalActionDelta(packs, attack, alternative, hard, attack.active);
  if (delta) {
    assert.equal(delta.length, FEATURE_COUNT);
    assert.ok(delta.some(n => n !== 0));
  }
  assert.equal(universalActionDelta(packs, attack, hard, hard, attack.active), null);
  assert.equal(LEARN_MARGIN, 0.15);
  const driven = drive(packs, state, 12);
  assert.equal(driven.status, 'playing');
});

test('a pressure weight can choose a different legal attacker than Hard', () => {
  const cards = Array.from({length: 13}, (_, i) => ({
    id: 'L' + String(i).padStart(2, '0'), name: 'Learn ' + i,
    type: 'character', color: 'blue', energy: i < 3 ? 0 : 1, ap: 1,
    bp: i === 0 ? 5000 : i === 1 ? 2000 : i === 2 ? 3500 : 1000,
    gen: 1, implementation: 'vanilla', traits: []
  }));
  const pack = createUniversalPack({id: 'learn-attack', version: '1', cards});
  const packs = [pack, pack];
  const ids = Object.keys(pack.cards);
  const counts = Object.fromEntries(ids.slice(0, 12).map(id => [id, 4]));
  counts[ids[12]] = 2;
  const give = (player, cardId) => {
    if (player.hand.some(card => card.cardId === cardId)) return;
    const donor = [...player.deck, ...player.life].find(card => card.cardId === cardId);
    const host = player.hand.find(card => !['L00', 'L01', 'L02'].includes(card.cardId));
    const swap = host.cardId;
    host.cardId = donor.cardId;
    donor.cardId = swap;
  };
  let state = newUniversalMatch(packs, {decks: [counts, counts], first: 0, seed: 1});
  give(state.players[0], 'L00');
  give(state.players[0], 'L01');
  give(state.players[1], 'L02');
  const idOf = (cursor, uid) => {
    for (const player of cursor.players) {
      for (const zone of ['hand', 'front', 'energy']) {
        for (const card of player[zone] || []) if (card && card.uid === uid) return card.cardId;
      }
    }
    return null;
  };
  const go = (cursor, pred) => {
    const action = legalUniversalActions(packs, cursor).find(pred);
    assert.ok(action);
    return play(packs, cursor, action);
  };
  const pass = cursor => go(cursor, action => action.type === 'next');
  const toMain = cursor => {
    while (cursor.phase !== 'main') cursor = pass(cursor);
    return cursor;
  };
  state = toMain(state);
  state = go(state, action => action.type === 'play' && action.line === 'front' && idOf(state, action.uid) === 'L00');
  while (state.active === 0) state = pass(state);
  state = toMain(state);
  state = go(state, action => action.type === 'play' && action.line === 'front' && idOf(state, action.uid) === 'L02');
  while (state.active === 1) state = pass(state);
  state = toMain(state);
  state = go(state, action => action.type === 'play' && action.line === 'front' && idOf(state, action.uid) === 'L01');
  while (state.active === 0) state = pass(state);
  while (state.active === 1) state = pass(state);
  state = toMain(state);
  while (state.phase !== 'attack') state = pass(state);
  const hard = chooseUniversalAiAction(packs, state, {difficulty: 'hard'});
  assert.equal(idOf(state, hard.uid), 'L00');
  assert.deepEqual(chooseUniversalLearnAction(packs, state, {weights: emptyWeights()}), hard);
  const weights = emptyWeights();
  weights[3] = WEIGHT_LIMIT;
  const learned = chooseUniversalLearnAction(packs, state, {weights});
  assert.equal(idOf(state, learned.uid), 'L01');
  assert.ok(legalUniversalActions(packs, state).some(action => JSON.stringify(action) === JSON.stringify(learned)));
  const delta = universalActionDelta(packs, state, learned, hard, state.active);
  assert.ok(delta);
  assert.ok(delta[3] > 0);
  assert.equal(delta[0], 0);
});
