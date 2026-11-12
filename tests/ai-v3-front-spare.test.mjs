import test from 'node:test';
import assert from 'node:assert/strict';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {dispatchUniversalAction, legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {selectionTrace} from '../dist/universal-v2/ai-v3/beam.mjs';
import {bindVariant, normalizeFactors} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {applySharedOpening, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseStrengthenedHardAction, resetHardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {openLethalShift} from '../scripts/ai-v3-lethal-shift.mjs';

const SEARCH = {nodes: 48, ms: 1e9, seed: 1, plan: 'tree', now: () => 0};
function label(action) {
 return [action?.type || '', action?.line || '', action?.uid ?? '', action?.mode || ''].join(':');
}
function same(a, b) {
 return !!a && !!b && label(a) === label(b);
}
function reachSao() {
 const deck = battleDecks().find(item => item.id === 'sword-art-online-raid');
 const packs = [deck.pack, deck.pack];
 let state = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], 8402, 0)).state;
 for (let step = 0; step < 2; step++) {
  const actor = state.pending?.player ?? state.active;
  const legal = legalUniversalActions(packs, state);
  let raw;
  if (actor === 0) {
   resetAiV3Report();
   raw = chooseAiV3Action(packs, state, {actor, ...MATCH_LIMITS, ...SEARCH});
  } else {
   resetHardAiReport();
   raw = chooseStrengthenedHardAction(packs, state, {nodes: 48, ms: 1e9, seed: 1});
  }
  const action = legal.find(item => same(item, raw));
  assert.ok(action, 'replay action');
  state = dispatchUniversalAction(packs, state, action, {actor});
 }
 return {packs, state};
}
function ask(packs, state, factors) {
 const actor = state.pending?.player ?? state.active;
 const meter = {dispatches: 0};
 resetAiV3Report();
 const action = chooseAiV3Action(packs, state, {
  actor, ...MATCH_LIMITS, ...SEARCH, diagnose: true, meter, hardNodes: 0,
  ...(factors ? {factors} : {})
 });
 const trace = lastAiV3Trace();
 const legal = legalUniversalActions(packs, state);
 assert.equal(legal.some(item => same(item, action)), true);
 assert.equal(meter.dispatches, trace.nodesUsed);
 assert.ok(trace.nodesUsed <= 48);
 return {action, trace};
}

test('frontSpare stays off unless this call asks for it', () => {
 assert.equal(normalizeFactors(null), null);
 assert.equal(normalizeFactors({frontSpare: true}).frontSpare, true);
 assert.equal(normalizeFactors({frontSpare: true}).laterEnergy, undefined);
 assert.equal(normalizeFactors({frontSpare: true}).alignRoots, undefined);
 assert.equal(normalizeFactors({frontSpare: true}).evidenceGenerator, undefined);
 assert.equal(normalizeFactors({laterEnergy: true}).frontSpare, undefined);
 assert.equal(normalizeFactors({alignRoots: true}).frontSpare, undefined);
 assert.equal(MATCH_LIMITS.nodes, 48);
 assert.equal(MATCH_LIMITS.ms, 40);
 assert.equal(MATCH_LIMITS.beam, 4);
});

test('an idle main keeps the top energy when the front slot is taken from the bottom', () => {
 const {packs, state} = reachSao();
 assert.equal(state.phase, 'main');
 assert.equal(state.pending, null);
 const actor = state.active;
 const legal = legalUniversalActions(packs, state);
 const plain = selectionTrace(packs, state, actor, legal, 4, null);
 const spared = bindVariant(null, () => selectionTrace(packs, state, actor, legal, 4, null), {frontSpare: true});
 const top = plain.notes.find(note => note.action?.uid === '0-10' && note.action.line === 'energy');
 assert.equal(top.reason, 'replaced-by-front');
 assert.equal(plain.picked.some(action => action.uid === '0-10' && action.line === 'energy'), false);
 assert.equal(plain.picked.some(action => action.type === 'play' && action.line === 'front'), true);
 assert.equal(spared.picked.some(action => action.uid === '0-10' && action.line === 'energy'), true);
 assert.equal(spared.picked.some(action => action.type === 'play' && action.line === 'front'), true);
 assert.equal(spared.picked.length, plain.picked.length);
 const dropped = spared.notes.find(note => note.reason === 'replaced-by-front');
 assert.ok(dropped);
 assert.notEqual(dropped.action.uid + ':' + dropped.action.line, '0-10:energy');
 const base = ask(packs, state);
 const gated = ask(packs, state, {frontSpare: true});
 assert.equal(label(base.action), 'play:energy:0-19:');
 assert.equal(base.trace.factors.frontSpare, undefined);
 assert.equal(gated.trace.factors.frontSpare, true);
 assert.equal(gated.trace.factors.laterEnergy, undefined);
 const roots = gated.trace.rootPlan || [];
 assert.equal(roots.some(note => note.uid === '0-10' && note.line === 'energy'), true);
});

test('a proven kill stays when the front slot comes from the bottom', () => {
 const opened = openLethalShift(0, {ban: true});
 const hit = ask(opened.packs, opened.state, {frontSpare: true});
 assert.equal(hit.action.type, 'activate');
 assert.equal(hit.trace.score, 100000);
 assert.equal(hit.trace.settled, true);
});

test('the worker accepts the switch and still returns a legal action', () => {
 const opened = openLethalShift(0, {ban: true});
 const legal = legalUniversalActions(opened.packs, opened.state);
 const result = handleAiV3Request({
  sealed: true, requestId: 5, stateVersion: 1, actor: 0, seed: 1,
  nodes: 48, ms: 1e9, pack: opened.packs, state: opened.state,
  factors: {frontSpare: true}
 });
 assert.equal(result.error, null);
 assert.equal(legal.some(action => same(action, result.action)), true);
 assert.ok(result.search.nodesUsed <= 48);
 assert.equal(result.action.type, 'activate');
});
