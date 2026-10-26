import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, dispatch, legalActions, controller} from '../dist/engine.mjs';
import {chooseAiAction, evaluatePosition, classicLearnFeatures, AI_LEVELS} from '../dist/ai-v2.mjs';
import {PRESETS} from '../dist/cards.mjs';
import {
  FEATURE_COUNT, emptyWeights, emptyStore, featuresFromSnapshot, fingerprintCounts,
  fingerprintZones, updateWeights, settleMatch, beginTrace, observeTrace, judgeGate,
  adoptShared, adoptDeck, effectiveWeights, deckScale, hasResidual, normalizeStore,
  TURN_CAP, WEIGHT_LIMIT, loadBrowserStore, saveBrowserStore, CLASSIC_STORE_KEY
} from '../dist/ai-learn.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {
  chooseUniversalLearnAction, universalLearnFeatures
} from '../dist/universal-v2/ai-learn.mjs';

function opening(seed = 101) {
  let state = newGame({seed, mode: 'solo', decks: [PRESETS[0].counts, PRESETS[1].counts]});
  state = dispatch(state, {type: 'keep'});
  state = dispatch(state, {type: 'keep'});
  return state;
}

test('zero residual leaves Hard scores and choices unchanged', () => {
  assert.deepEqual(AI_LEVELS, ['easy', 'normal', 'hard']);
  const state = opening(21);
  const zeros = emptyWeights();
  assert.equal(hasResidual(zeros), false);
  assert.equal(evaluatePosition(state, 0), evaluatePosition(state, 0, undefined, zeros));
  assert.equal(evaluatePosition(state, 0), evaluatePosition(state, 0, undefined, null));
  assert.deepEqual(chooseAiAction(state, {difficulty: 'learn', weights: zeros}),
    chooseAiAction(state, {difficulty: 'hard'}));
  assert.deepEqual(chooseAiAction(state, {difficulty: 'hard', weights: zeros.map(() => WEIGHT_LIMIT)}),
    chooseAiAction(state, {difficulty: 'hard'}));
});

test('learn features ignore hidden order and contain no card names', () => {
  const state = opening(49);
  const changed = structuredClone(state);
  changed.players[1].hand.reverse();
  changed.players[1].life.reverse();
  changed.players[1].deck.reverse();
  const features = classicLearnFeatures(state, 0);
  assert.equal(features.length, FEATURE_COUNT);
  assert.equal(features[9], 1);
  assert.deepEqual(features, classicLearnFeatures(changed, 0));
  assert.ok(features.every(n => typeof n === 'number' && n >= -1 && n <= 1));
  const reordered = structuredClone(state);
  reordered.players[0].deck.reverse();
  assert.equal(fingerprintZones(state.players[0]), fingerprintZones(reordered.players[0]));
  assert.equal(fingerprintZones(state.players[0]), fingerprintCounts(PRESETS[0].counts));
  assert.notEqual(fingerprintZones(state.players[0]), fingerprintZones(state.players[1]));
});

test('a nonzero residual can change the score without leaving the legal list', () => {
  let state = opening(13);
  state = dispatch(state, {type: 'next'});
  state = dispatch(state, {type: 'next'});
  const weights = emptyWeights().map(() => WEIGHT_LIMIT);
  assert.notEqual(evaluatePosition(state, controller(state), undefined, weights),
    evaluatePosition(state, controller(state)));
  const before = JSON.stringify(state);
  const action = chooseAiAction(state, {difficulty: 'learn', weights});
  assert.ok(legalActions(state).some(item => JSON.stringify(item) === JSON.stringify(action)));
  assert.equal(JSON.stringify(state), before);
});

test('candidate updates stay clipped, deterministic, and unadopted', () => {
  const phi = featuresFromSnapshot({
    lifeOwn: 7, lifeOpp: 7, fieldOwn: 0, fieldOpp: 0, energyOwn: 0, energyTarget: 3,
    readyOwn: 0, readyOpp: 0, knownHand: 7, oppHand: 7, ap: 1, apActive: 1,
    raidOwn: 0, pressure: 0, first: 1
  });
  const once = updateWeights(emptyWeights(), [phi, phi], 1);
  const twice = updateWeights(emptyWeights(), [phi, phi], 1);
  assert.deepEqual(once, twice);
  assert.ok(once.every(n => n <= WEIGHT_LIMIT && n >= -WEIGHT_LIMIT));
  assert.ok(once.some(n => n !== 0));
  const trace = beginTrace('deck-a');
  observeTrace(trace, phi, {turn: 3, energy: 2});
  const settled = settleMatch(emptyStore(), trace, {winner: 1, aiSeat: 1, turn: 4, status: 'finished'});
  assert.equal(settled.applied, true);
  assert.equal(settled.outcome, 1);
  assert.ok(settled.store.candidateShared.some(n => n !== 0));
  assert.ok(settled.store.adoptedShared.every(n => n === 0));
  assert.equal(settled.store.decks['deck-a'].games, 1);
  assert.equal(trace.turn3Energy, 2);
  const capped = settleMatch(emptyStore(), beginTrace('deck-a'), {
    winner: 1, aiSeat: 1, turn: TURN_CAP + 1, status: 'finished'
  });
  assert.equal(capped.applied, false);
  const unfinished = settleMatch(emptyStore(), trace, {winner: null, aiSeat: 1, turn: 4, status: 'playing'});
  assert.equal(unfinished.applied, false);
});

test('deck blend stays on the shared vector until that list has games, and gates adopt separately', () => {
  assert.equal(deckScale(0), 0);
  assert.equal(deckScale(40), 0.5);
  const store = emptyStore();
  store.adoptedShared = emptyWeights().map(() => 1);
  store.decks['same'] = {adopted: emptyWeights().map(() => 1), candidate: emptyWeights(), games: 0};
  assert.ok(effectiveWeights(store, 'same').every(n => n === 1));
  store.decks['same'].games = 40;
  store.decks['same'].adopted = emptyWeights().map((_, i) => i === 0 ? -1 : 1);
  const blended = effectiveWeights(store, 'same');
  assert.equal(blended[0], 0);
  assert.ok(effectiveWeights(store, 'other').every(n => n === 1));
  const losing = judgeGate({decided: 4, learnerWins: 2, learnerEnergy: 1, frozenEnergy: 3});
  assert.equal(losing.passed, false);
  assert.equal(losing.energyOk, false);
  const winning = judgeGate({decided: 4, learnerWins: 3, learnerEnergy: 2.6, frozenEnergy: 3});
  assert.equal(winning.passed, true);
  const candidate = normalizeStore({
    ...emptyStore(),
    candidateShared: emptyWeights().map(() => 0.4),
    decks: {list: {candidate: emptyWeights().map(() => 0.8), adopted: emptyWeights(), games: 4}}
  });
  const sharedOnly = adoptShared(candidate, losing);
  assert.ok(sharedOnly.adoptedShared.every(n => n === 0));
  const sharedYes = adoptShared(candidate, winning);
  assert.ok(sharedYes.adoptedShared.every(n => n === 0.4));
  assert.ok(sharedYes.decks.list.adopted.every(n => n === 0));
  const deckYes = adoptDeck(sharedYes, 'list', winning);
  assert.ok(deckYes.decks.list.adopted.every(n => n === 0.8));
  const memory = new Map();
  const storage = {getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value)};
  assert.equal(saveBrowserStore(CLASSIC_STORE_KEY, deckYes, storage), true);
  assert.equal(loadBrowserStore(CLASSIC_STORE_KEY, storage).recordedGames, 0);
  assert.equal(loadBrowserStore(CLASSIC_STORE_KEY, storage).decks.list.games, 4);
});

function universalOpening() {
  const cards = Array.from({length: 13}, (_, i) => ({
    id: 'L' + String(i).padStart(2, '0'), name: 'Learn ' + i,
    type: 'character', color: 'blue', energy: i < 4 ? 0 : 1, ap: 1, bp: 2000 + i * 100,
    gen: 1, implementation: 'vanilla', traits: []
  }));
  const pack = createUniversalPack({id: 'learn-fixture', version: '1', cards});
  const counts = Object.fromEntries(cards.slice(0, 12).map(card => [card.id, 4]));
  counts.L12 = 2;
  const packs = [pack, pack];
  let state = newUniversalMatch(packs, {decks: [counts, counts], first: 0, seed: 7});
  for (let step = 0; step < 6 && state.phase !== 'main'; step++) {
    const next = legalUniversalActions(packs, state).find(action => action.type === 'next');
    if (!next) break;
    state = dispatchUniversalAction(packs, state, next, {actor: state.active});
  }
  return {packs, state};
}

test('V2 learn with zero weights matches Hard and hides the opponent hand', () => {
  const {packs, state} = universalOpening();
  const changed = structuredClone(state);
  changed.players[0].hand.reverse();
  changed.players[0].deck.reverse();
  changed.players[0].life.reverse();
  assert.deepEqual(universalLearnFeatures(packs, state, 1), universalLearnFeatures(packs, changed, 1));
  assert.deepEqual(
    chooseUniversalLearnAction(packs, state, {weights: emptyWeights()}),
    chooseUniversalAiAction(packs, state, {difficulty: 'hard'})
  );
  const action = chooseUniversalLearnAction(packs, state, {weights: emptyWeights().map(() => WEIGHT_LIMIT)});
  assert.ok(legalUniversalActions(packs, state).some(item => JSON.stringify(item) === JSON.stringify(action)));
});
