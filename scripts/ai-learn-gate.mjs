// Compare a learn candidate with the frozen Hard policy.
// Usage: node scripts/ai-learn-gate.mjs --games 4
// Add --adopt to copy a passing candidate into the checkpoint file.
import {readFileSync, writeFileSync} from 'node:fs';
import {PRESETS} from '../dist/cards.mjs';
import {newGame, dispatch, controller, energy, assertState} from '../dist/engine.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';
import {
  emptyStore, normalizeStore, judgeGate, adoptShared, adoptDeck,
  effectiveWeights, fingerprintCounts, CLASSIC_STORE_KEY
} from '../dist/ai-learn.mjs';

const args = process.argv.slice(2);
const get = (name, fallback) => {
  const index = args.indexOf('--' + name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const games = Math.min(40, Math.max(1, Number(get('games', '4')) || 4));
const maxActions = Math.min(800, Math.max(80, Number(get('max-actions', '400')) || 400));
const adopt = args.includes('--adopt');
const out = get('out', 'dist/ai-learn-checkpoint.json');
const source = get('store', '');

let store = emptyStore();
if (source) store = normalizeStore(JSON.parse(readFileSync(source, 'utf8')));
const counts = PRESETS[0].counts;
const fingerprint = fingerprintCounts(counts);
const weights = effectiveWeights(store, fingerprint);

let learnerWins = 0, frozenWins = 0, unfinished = 0;
const learnerEnergy = [], frozenEnergy = [];
for (let game = 0; game < games; game++) {
  const learnerSeat = game % 2;
  const first = Math.floor(game / 2) % 2;
  let state = newGame({
    seed: 42000 + game,
    decks: [counts, counts],
    first, mode: 'solo', names: ['Seat 0', 'Seat 1']
  });
  let actions = 0, seenLearner = false, seenFrozen = false;
  while (state.status !== 'finished' && actions < maxActions && state.turn <= 30) {
    const actor = controller(state);
    if (state.turn >= 3) {
      if (actor === learnerSeat && !seenLearner) {
        learnerEnergy.push(energy(state, learnerSeat));
        seenLearner = true;
      }
      if (actor !== learnerSeat && !seenFrozen) {
        frozenEnergy.push(energy(state, actor));
        seenFrozen = true;
      }
    }
    const action = actor === learnerSeat
      ? chooseAiAction(state, {difficulty: 'learn', weights})
      : chooseAiAction(state, {difficulty: 'hard'});
    if (!action) throw new Error('No legal action');
    state = dispatch(state, action, actor);
    assertState(state);
    actions++;
  }
  if (state.status !== 'finished') unfinished++;
  else if (state.winner === learnerSeat) learnerWins++;
  else frozenWins++;
}

const mean = list => list.length ? list.reduce((sum, n) => sum + n, 0) / list.length : 0;
const judgement = judgeGate({
  decided: learnerWins + frozenWins,
  learnerWins,
  learnerEnergy: mean(learnerEnergy),
  frozenEnergy: mean(frozenEnergy),
  minGames: 4
});
if (adopt && judgement.passed) {
  store = adoptDeck(adoptShared(store, judgement), fingerprint, judgement);
  writeFileSync(out, JSON.stringify({key: CLASSIC_STORE_KEY, store}, null, 2) + '\n');
}
const report = {
  games, learnerWins, frozenWins, unfinished,
  learnerEnergy: +mean(learnerEnergy).toFixed(3),
  frozenEnergy: +mean(frozenEnergy).toFixed(3),
  judgement, adopted: adopt && judgement.passed, fingerprint
};
console.log(JSON.stringify(report, null, 2));
if (!judgement.passed) process.exitCode = 0;
