// Compare generic AI v2 to legacy AI on mirrored seats / equal decks.
// Usage: npm run benchmark:ai -- --games 12 --difficulty hard
import {PRESETS} from '../dist/cards.mjs';
import {newGame, dispatch, controller, botAction, assertState} from '../dist/engine.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';

const args = process.argv.slice(2);
const get = (name, fallback) => {
  const index = args.indexOf('--' + name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const games = Math.min(100, Math.max(2, Number(get('games', '12')) || 12));
const difficulty = get('difficulty', 'hard');
const maxActions = Math.min(1000, Math.max(100, Number(get('max-actions', '550')) || 550));
if (!['normal', 'hard'].includes(difficulty)) throw new Error('difficulty must be normal or hard');

let wins = 0, losses = 0, unfinished = 0, totalActions = 0;
const start = Date.now();
for (let game = 0; game < games; game++) {
  const v2Seat = game % 2;
  // Alternate first player independently of who uses the new strategy.
  const first = Math.floor(game / 2) % 2;
  let s = newGame({
    seed: 9000 + Math.floor(game / 4),
    decks: [PRESETS[0].counts, PRESETS[0].counts],
    first, mode: 'solo', names: ['Seat 0', 'Seat 1']
  });
  let actions = 0;
  while (s.status !== 'finished' && actions < maxActions) {
    const actor = controller(s);
    const next = actor === v2Seat
      ? chooseAiAction(s, {difficulty})
      : botAction(s);
    if (!next) throw new Error('No AI action available');
    s = dispatch(s, next, actor);
    assertState(s);
    actions++;
  }
  totalActions += actions;
  if (s.status !== 'finished') unfinished++;
  else if (s.winner === v2Seat) wins++;
  else losses++;
  console.log('Game ' + (game + 1) + ': ' +
    (s.status === 'finished' ? s.winner === v2Seat ? 'v2' : 'legacy' : 'action limit') +
    ', first=' + first + ', v2Seat=' + v2Seat + ', actions=' + actions);
}
const decided = wins + losses;
console.log(JSON.stringify({
  difficulty, games, wins, losses, unfinished,
  winRateDecided: decided ? +(100 * wins / decided).toFixed(2) : null,
  totalActions, durationMs: Date.now() - start,
  note: 'Symmetric BLEACH preset mirror only; not a measured general skill rating.'
}, null, 2));
