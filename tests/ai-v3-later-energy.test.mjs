import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {laterEnergyCandidates, normalizeFactors} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {openLethalShift} from '../scripts/ai-v3-lethal-shift.mjs';
import {walkTo} from '../scripts/ai-v3-search-bottleneck.mjs';

const report = JSON.parse(readFileSync(new URL('../audit/ai-v3-hold-info-8401-baseline.json', import.meta.url), 'utf8'));
const decks = new Map(battleDecks().map(deck => [deck.id, deck]));

function label(action) {
 return [action?.type || '', action?.line || '', action?.uid ?? '', action?.mode || ''].join(':');
}
function spot(spec) {
 const game = report.titles[spec.deck].byMode.tree.games.find(item =>
  item.seed === spec.seed && item.first === spec.first && item.challengerSeat === spec.seat);
 return walkTo(decks.get(spec.deck), game, spec.step);
}
function ask(packs, state, factors) {
 const actor = state.pending?.player ?? state.active;
 const meter = {dispatches: 0};
 resetAiV3Report();
 const action = chooseAiV3Action(packs, state, {
  actor, ...MATCH_LIMITS, seed: 1, plan: 'tree', nodes: 48, ms: 1e9, now: () => 0, hardNodes: 0,
  diagnose: true, meter, ...(factors ? {factors} : {})
 });
 const trace = lastAiV3Trace();
 const legal = legalUniversalActions(packs, state);
 assert.equal(legal.some(item => JSON.stringify(item) === JSON.stringify(action)), true);
 assert.equal(meter.dispatches, trace.nodesUsed);
 assert.ok(trace.nodesUsed <= 48);
 return {action, trace, actor};
}
function row(action, boundary, phase, search) {
 return {action, boundary, phase, search, executed: true, pending: null};
}

test('laterEnergy stays off unless this call asks for it', () => {
 assert.equal(normalizeFactors(null), null);
 assert.equal(normalizeFactors({laterEnergy: true}).laterEnergy, true);
 assert.equal(normalizeFactors({laterEnergy: true}).alignRoots, undefined);
 assert.equal(normalizeFactors({laterEnergy: true}).evidenceGenerator, undefined);
 assert.equal(normalizeFactors({alignRoots: true}).laterEnergy, undefined);
 assert.equal(MATCH_LIMITS.nodes, 48);
 assert.equal(MATCH_LIMITS.ms, 40);
});

test('an earlier front does not outrank a later energy of another card', () => {
 const state = {phase: 'main', pending: null, active: 0};
 const front = row({type: 'play', line: 'front', uid: '0-16'}, 'yielded', 'move', 22.35);
 const sameEnergy = row({type: 'play', line: 'energy', uid: '0-16'}, 'pending', 'attack', -115.7);
 const later = row({type: 'play', line: 'energy', uid: '0-20'}, 'yielded', 'attack', -34.7);
 const pass = row({type: 'next'}, 'yielded', 'move', -24.9);
 const picked = laterEnergyCandidates(state, 0, [later, sameEnergy, front, pass], [front, pass]);
 assert.deepEqual(picked.map(item => item.action.uid), ['0-20']);
 assert.equal(laterEnergyCandidates({phase: 'main', pending: null, active: 0}, 0, [front], [front]), null);
 const raid = row({type: 'raid', uid: '0-7'}, 'yielded', 'move', 10);
 assert.equal(laterEnergyCandidates(state, 0, [later, front, raid], [raid]), null);
});

test('white-sword 8401 step 27 keeps the later energy when the switch is on', () => {
 const {packs, state} = spot({deck: 'white-sword', seed: 8401, first: 0, seat: 0, step: 27});
 const base = ask(packs, state);
 const gated = ask(packs, state, {laterEnergy: true});
 assert.equal(label(base.action), 'play:energy:0-16:');
 assert.equal(base.trace.factors.laterEnergy, undefined);
 const searched = base.trace.stages.find(stage => stage.stage === 'search');
 const generated = base.trace.stages.find(stage => stage.stage === 'generator');
 assert.equal(label(searched), 'play:front:0-16:');
 assert.equal(generated.line, 'energy');
 assert.equal(generated.uid, '0-16');
 const rows = base.trace.candidates?.length ? base.trace.candidates : base.trace.compared;
 const other = rows.find(item => item.action?.uid === '0-20' && item.action.line === 'energy');
 assert.equal(other.boundary, 'yielded');
 assert.equal(other.phase, 'attack');
 assert.equal(gated.trace.factors.laterEnergy, true);
 assert.equal(gated.trace.factors.alignRoots, undefined);
 assert.equal(label(gated.trace.stages.find(stage => stage.stage === 'search')), 'play:energy:0-20:');
 assert.equal(label(gated.action), 'play:energy:0-20:');
 assert.equal(gated.trace.reason, 'search');
 assert.equal(legalUniversalActions(packs, state).some(action => JSON.stringify(action) === JSON.stringify(gated.action)), true);
});

test('a proven kill and a searched raid stay when the switch is on', () => {
 const opened = openLethalShift(0, {ban: true});
 const hit = ask(opened.packs, opened.state, {laterEnergy: true});
 assert.equal(hit.action.type, 'activate');
 assert.equal(hit.trace.score, 100000);
 assert.equal(hit.trace.settled, true);
 const raidSpot = spot({deck: 'white-sword', seed: 8402, first: 1, seat: 1, step: 33});
 const plain = ask(raidSpot.packs, raidSpot.state);
 const guarded = ask(raidSpot.packs, raidSpot.state, {laterEnergy: true});
 assert.equal(label(plain.action), 'play:front:1-37:');
 assert.equal(label(guarded.action), label(plain.action));
 assert.equal(legalUniversalActions(raidSpot.packs, raidSpot.state).some(action => action.type === 'raid' && action.uid === '1-37'), true);
});

test('the worker accepts the switch and still returns a legal action', () => {
 const opened = openLethalShift(0, {ban: true});
 const legal = legalUniversalActions(opened.packs, opened.state);
 const result = handleAiV3Request({
  sealed: true, requestId: 4, stateVersion: 1, actor: 0, seed: 1,
  nodes: 48, ms: 1e9, pack: opened.packs, state: opened.state,
  factors: {laterEnergy: true}
 });
 assert.equal(result.error, null);
 assert.equal(legal.some(action => JSON.stringify(action) === JSON.stringify(result.action)), true);
 assert.ok(result.search.nodesUsed <= 48);
 assert.equal(result.action.type, 'activate');
});
