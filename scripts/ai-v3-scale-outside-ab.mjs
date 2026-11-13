// Paired hybrid-start-hard-v1. Arm B gives one seat the finished outside
// payment. The other seat, and all of arm A, stay on the live default.
// The live menu never sends scaleOutside. This sample is not the seed lock.
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseHybridStartHardAction} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';
import {dispatchUniversalAction, legalUniversalActions} from '../dist/universal-v2/engine.mjs';

const deck = battleDecks().find(item => item.id === 'renruki');
const STEPS = 500;
const seeds = [41, 42, 43, 44];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function play(opened, hybridSeat, scale) {
 const packs = [deck.pack, deck.pack];
 let state = cloneMatch(opened);
 let illegal = 0;
 let steps = 0;
 let scaleDecisions = 0;
 let pendingAtEnd = null;
 let error = null;
 while (state.status === 'playing' && steps < STEPS) {
  const actor = state.pending?.player ?? state.active;
  const factors = scale && actor === hybridSeat ? {scaleOutside: true} : null;
  let action;
  try {
   action = chooseHybridStartHardAction(packs, state, {
    actor, nodes: 48, ms: 40, seed: 1, ...(factors ? {factors} : {})
   });
  } catch (err) {
   illegal++;
   error = err?.message || String(err);
   pendingAtEnd = state.pending?.kind || state.phase;
   break;
  }
  const legal = legalUniversalActions(packs, state);
  if (!legal.some(item => same(item, action))) {
   illegal++;
   error = 'illegal';
   pendingAtEnd = state.pending?.kind || state.phase;
   break;
  }
  if (lastAiV3Trace()?.reason === 'scale-outside') scaleDecisions++;
  try {
   state = dispatchUniversalAction(packs, state, action, {actor});
  } catch (err) {
   illegal++;
   error = err?.message || String(err);
   pendingAtEnd = state.pending?.kind || state.phase;
   break;
  }
  steps++;
 }
 if (state.status === 'playing' && !error) pendingAtEnd = state.pending?.kind || 'step-cap';
 return {
  winner: state.status === 'finished' ? state.winner : null,
  won: state.status === 'finished' && state.winner === hybridSeat,
  finished: state.status === 'finished',
  steps, illegal, error, scaleDecisions, pendingAtEnd
 };
}

function rate(rows) {
 const finished = rows.filter(row => row.finished);
 return {
  games: rows.length,
  finished: finished.length,
  wins: finished.filter(row => row.won).length,
  illegal: rows.reduce((sum, row) => sum + row.illegal, 0),
  stuck: rows.filter(row => row.pendingAtEnd && row.pendingAtEnd !== 'step-cap').length,
  stepCap: rows.filter(row => row.pendingAtEnd === 'step-cap').length,
  scaleDecisions: rows.reduce((sum, row) => sum + row.scaleDecisions, 0)
 };
}

const pairs = [];
for (const seed of seeds) {
 for (const hybridSeat of [0, 1]) {
  const packs = [deck.pack, deck.pack];
  const opened = applySharedOpening(packs, newComparedMatch(
   packs, [deck.counts, deck.counts], seed, 0
  )).state;
  const started = performance.now();
  const A = play(opened, hybridSeat, false);
  const B = play(opened, hybridSeat, true);
  const row = {seed, hybridSeat, ms: Math.round(performance.now() - started), A, B};
  pairs.push(row);
  console.log(JSON.stringify(row));
 }
}
console.log(JSON.stringify({
 A: rate(pairs.map(pair => pair.A)),
 B: rate(pairs.map(pair => pair.B))
}, null, 2));
