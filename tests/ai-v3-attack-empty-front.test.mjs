import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {
 assertUniversalMatch, dispatchUniversalAction, legalUniversalActions, newUniversalMatch,
 universalAttackDamage, universalBp, universalImpact
} from '../dist/universal-v2/engine.mjs';
import {
 chooseHybridStartHardAction, HYBRID_START_HARD_POLICY, hybridStartHardSource, lastHybridRoute
} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {lastAiV3Trace, MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {blendRoot} from '../dist/universal-v2/ai-v3/prior.mjs';
import {HARD_AI_POLICY, chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {buildAiV3Request, handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const CLOCK = {actor: 1, nodes: MATCH_LIMITS.nodes, ms: MATCH_LIMITS.ms, seed: 1, worlds: 1};
const bleach = createBleachV2Pack();
const kmr = createKmrBattlePack();

function counts(pack, required, extras = {}) {
 const fillers = Object.values(pack.cards)
  .filter(card => !required.includes(card.id) && !['special', 'color', 'final'].includes(card.trigger))
  .map(card => card.id).sort();
 const caps = {special: 0, color: 0, final: 0};
 const out = {};
 for (const id of [...new Set(required)]) {
  const trigger = pack.cards[id].trigger;
  let copies = extras[id] || 1;
  if (Object.prototype.hasOwnProperty.call(caps, trigger)) {
   copies = Math.min(copies, 4 - caps[trigger]);
   caps[trigger] += copies;
  }
  out[id] = copies;
 }
 let total = Object.values(out).reduce((sum, copies) => sum + copies, 0);
 for (const id of fillers) {
  if (total >= 50) break;
  const trigger = pack.cards[id].trigger;
  let add = Math.min(pack.cards[id].maxCopies || 4, 50 - total);
  if (Object.prototype.hasOwnProperty.call(caps, trigger)) add = Math.min(add, 4 - (caps[trigger] || 0));
  if (add <= 0) continue;
  out[id] = (out[id] || 0) + add;
  total += add;
  if (Object.prototype.hasOwnProperty.call(caps, trigger)) caps[trigger] += add;
 }
 if (total !== 50) throw new Error('deck ' + total);
 const issues = validateUniversalDeck(pack, out);
 if (issues.length) throw new Error(issues.join('; '));
 return out;
}

const sword = counts(bleach, ['BLC-2-067', 'BLC-4-070'], {'BLC-2-067': 4, 'BLC-4-070': 4});
const rider = counts(kmr, ['KMR-1-004'], {'KMR-1-004': 2});
const mixed = [kmr, bleach];
const both = [bleach, bleach];
const mixedBase = newUniversalMatch(mixed, {decks: [rider, sword], seed: 11, first: 1});
const bleachBase = newUniversalMatch(both, {decks: [sword, sword], seed: 11, first: 1});

function take(pack, state, player, id) {
 for (const zone of ['hand', 'deck', 'outside', 'removed']) {
  const pile = state.players[player][zone];
  const index = pile.findIndex(card => card.cardId === id);
  if (index >= 0) return pile.splice(index, 1)[0];
 }
 throw new Error('missing ' + id + ' in ' + pack.cards[id]?.name);
}
function put(pack, state, player, id, slot, ready, entryTurn) {
 const card = take(pack, state, player, id);
 card.ready = ready;
 card.fieldEntryStamp = state.nextFieldEntryStamp++;
 card.entryTurn = entryTurn;
 state.players[player].front[slot] = card;
 return card;
}
function quietLife(pack, state, player) {
 const person = state.players[player];
 const quiet = [];
 for (const zone of ['deck', 'hand', 'life']) {
  const pile = person[zone];
  for (let index = pile.length - 1; index >= 0 && quiet.length < 7; index--) {
   if (!pack.cards[pile[index].cardId]?.trigger) quiet.push(pile.splice(index, 1)[0]);
  }
 }
 if (quiet.length < 7) throw new Error('not enough triggerless life cards');
 person.deck.push(...person.life);
 person.life = quiet;
}
function openAttack(base, packPair, bodies) {
 const state = structuredClone(base);
 state.pending = null;
 state.phase = 'attack';
 state.active = 1;
 state.attacksThisTurn = 0;
 state.attacksByUid = {};
 for (const line of ['front', 'energy']) {
  state.players[0][line] = [null, null, null, null];
  state.players[1][line] = [null, null, null, null];
 }
 const placed = bodies.map((body, index) => put(
  packPair[body.player], state, body.player, body.id, body.slot ?? index,
  body.ready !== false, body.sameTurn ? state.turn : state.turn - 1
 ));
 quietLife(packPair[0], state, 0);
 assert.equal(assertUniversalMatch(packPair, state), true);
 return {state, placed};
}
function decide(packPair, state) {
 const action = chooseHybridStartHardAction(packPair, state, CLOCK);
 return {action, trace: lastAiV3Trace(), route: lastHybridRoute()};
}
function rowsOf(trace) {
 return (trace?.candidates || []).map(row => ({
  type: row.action?.type || null,
  search: Number.isFinite(row.search) ? Math.round(row.search * 10) / 10 : null,
  boundary: row.boundary || null
 }));
}
function exact(legal, action) {
 return legal.find(item => JSON.stringify(item) === JSON.stringify(action)) || null;
}
function connect(packPair, state, attack) {
 let cursor = dispatchUniversalAction(packPair, state, attack, {actor: 1});
 assert.equal(cursor.pending?.kind, 'block');
 assert.equal(cursor.players[0].life.length, state.players[0].life.length);
 const skip = legalUniversalActions(packPair, cursor).find(action => action.type === 'chooseBlock' && action.uid == null);
 assert.ok(skip, 'empty front must be allowed to decline the block');
 cursor = dispatchUniversalAction(packPair, cursor, skip, {actor: 0});
 return cursor;
}

describe('hybrid attack into an empty front', {concurrency: false}, () => {
 test('a tied attack keeps the pass, and a higher attack score does not', () => {
  const attack = {action: {type: 'attack', uid: '1-1'}, search: 10};
  const pass = {action: {type: 'next'}, search: 10};
  assert.equal(blendRoot([attack, pass], () => 0).action.type, 'next');
  assert.equal(blendRoot([pass, attack], () => 0).action.type, 'next');
  assert.equal(blendRoot([{...attack, search: 20}, pass], () => 0).action.type, 'attack');
  assert.equal(blendRoot([pass, {...attack, search: 20}], () => 0).action.type, 'attack');
  assert.notEqual(HYBRID_START_HARD_POLICY, HARD_AI_POLICY);
  assert.equal(hybridStartHardSource('battle'), 'v3');
  assert.equal(hybridStartHardSource('main'), 'hard');
 });

 test('A. two ready 4000s attack an empty front and the hit removes one life', () => {
  const {state, placed} = openAttack(mixedBase, mixed, [
   {player: 1, id: 'BLC-4-070', ready: true},
   {player: 1, id: 'BLC-4-070', ready: true}
  ]);
  assert.equal(state.players[0].life.length, 7);
  assert.equal(state.players[0].front.every(card => !card), true);
  assert.deepEqual(placed.map(card => card.ready), [true, true]);
  assert.ok(placed.every(card => card.entryTurn < state.turn));
  assert.deepEqual(placed.map(card => universalBp(mixed, state, card)), [4000, 4000]);
  const legal = legalUniversalActions(mixed, state);
  const attacks = legal.filter(action => action.type === 'attack');
  assert.deepEqual(attacks.map(action => action.uid).sort(), placed.map(card => card.uid).sort());
  const {action, trace, route} = decide(mixed, state);
  assert.equal(route.policy, HYBRID_START_HARD_POLICY);
  assert.equal(route.lane, 'battle');
  assert.equal(route.source, 'v3');
  assert.equal(route.nodes, 48);
  assert.equal(route.ms, 40);
  assert.equal(action?.type, 'attack', JSON.stringify(rowsOf(trace)));
  assert.ok(exact(legal, action));
  const attackRow = (trace?.candidates || []).filter(row => row.action?.type === 'attack');
  const passRow = (trace?.candidates || []).find(row => row.action?.type === 'next');
  if (attackRow.length && passRow) {
   assert.ok(Math.max(...attackRow.map(row => row.search)) > passRow.search, JSON.stringify(rowsOf(trace)));
  }
  const request = buildAiV3Request(mixed, state, 1, {
   requestId: 1, stateVersion: 1, seed: 1, nodes: 48, ms: 40, policy: HYBRID_START_HARD_POLICY
  });
  const worker = handleAiV3Request(request);
  assert.equal(worker.error, null);
  assert.equal(worker.policy, HYBRID_START_HARD_POLICY);
  assert.equal(worker.action?.type, 'attack');
  assert.equal(worker.search.route.source, 'v3');
  const hard = chooseStrengthenedHardAction(mixed, state, {nodes: 48, ms: 40, seed: 1});
  assert.equal(hard?.type, 'attack');
  const after = connect(mixed, state, action);
  assert.equal(after.players[0].life.length, 6);
 });

 test('B. the second ready 4000 is still attacked after the first connects', () => {
  const {state, placed} = openAttack(mixedBase, mixed, [
   {player: 1, id: 'BLC-4-070', ready: true},
   {player: 1, id: 'BLC-4-070', ready: true}
  ]);
  const first = decide(mixed, state).action;
  assert.equal(first?.type, 'attack');
  let cursor = connect(mixed, state, first);
  const other = placed.find(card => card.uid !== first.uid);
  assert.equal(cursor.players[1].front.find(card => card?.uid === other.uid)?.ready, true);
  let guard = 0;
  while (cursor.status === 'playing' && (cursor.pending || cursor.phase !== 'attack' || cursor.active !== 1)) {
   if (++guard > 8) break;
   const who = cursor.pending?.player ?? cursor.active;
   const legal = legalUniversalActions(mixed, cursor);
   const step = legal.find(action => action.mode === 'skip' || action.uid == null || action.type === 'next') || legal[0];
   cursor = dispatchUniversalAction(mixed, cursor, step, {actor: who});
  }
  assert.equal(cursor.pending, null);
  assert.equal(cursor.phase, 'attack');
  assert.equal(cursor.players[0].front.every(card => !card), true);
  const legal = legalUniversalActions(mixed, cursor);
  assert.ok(legal.some(action => action.type === 'attack' && action.uid === other.uid));
  const second = decide(mixed, cursor);
  assert.equal(second.action?.type, 'attack', JSON.stringify(rowsOf(second.trace)));
  assert.equal(second.action.uid, other.uid);
  assert.ok(exact(legal, second.action));
 });

 test('C. rested, attack-banned, and fresh-ready entry stay inside the legal list', () => {
  const rested = openAttack(mixedBase, mixed, [
   {player: 1, id: 'BLC-4-070', ready: false},
   {player: 1, id: 'BLC-4-070', ready: false}
  ]);
  const restedLegal = legalUniversalActions(mixed, rested.state);
  assert.equal(restedLegal.some(action => action.type === 'attack'), false);
  const restedChoice = decide(mixed, rested.state);
  assert.equal(restedChoice.action?.type, 'next');
  assert.ok(exact(restedLegal, restedChoice.action));

  const banned = openAttack(mixedBase, mixed, [
   {player: 1, id: 'BLC-4-070', ready: true},
   {player: 1, id: 'BLC-4-070', ready: true}
  ]);
  const until = {player: 1, phase: 'start', edge: 'start'};
  for (const card of banned.placed) {
   grantContinuousState(banned.state, {
    kind: 'cannotAttack', controller: 1, sourceUid: banned.placed[0].uid,
    targetUid: card.uid, sourceLinked: false, until
   });
  }
  assert.equal(assertUniversalMatch(mixed, banned.state), true);
  const bannedLegal = legalUniversalActions(mixed, banned.state);
  assert.equal(bannedLegal.some(action => action.type === 'attack'), false);
  const bannedChoice = decide(mixed, banned.state);
  assert.equal(bannedChoice.action?.type, 'next');
  assert.ok(exact(bannedLegal, bannedChoice.action));

  const fresh = openAttack(mixedBase, mixed, [
   {player: 1, id: 'BLC-4-070', ready: true, sameTurn: true}
  ]);
  assert.equal(fresh.placed[0].entryTurn, fresh.state.turn);
  assert.equal(fresh.placed[0].ready, true);
  const freshLegal = legalUniversalActions(mixed, fresh.state);
  assert.ok(freshLegal.some(action => action.type === 'attack' && action.uid === fresh.placed[0].uid));
  const freshChoice = decide(mixed, fresh.state);
  assert.ok(exact(freshLegal, freshChoice.action));
  assert.equal(freshChoice.action?.type, 'attack');
 });

 test('D. a finished tie against a higher ready wall keeps the pass', () => {
  const {state, placed} = openAttack(mixedBase, mixed, [
   {player: 1, id: 'BLC-2-067', ready: true},
   {player: 0, id: 'KMR-1-004', slot: 0, ready: true}
  ]);
  const wall = placed[1];
  const attacker = placed[0];
  assert.ok(universalBp(mixed, state, wall) > universalBp(mixed, state, attacker));
  assert.equal(universalImpact(mixed, state, attacker), 0);
  const legal = legalUniversalActions(mixed, state);
  assert.ok(legal.some(action => action.type === 'attack' && action.uid === attacker.uid));
  const {action, trace} = decide(mixed, state);
  const compared = rowsOf(trace);
  assert.equal(action?.type, 'next', JSON.stringify(compared));
  assert.ok(exact(legal, action));
  const attackRow = (trace?.candidates || []).find(row => row.action?.type === 'attack');
  const passRow = (trace?.candidates || []).find(row => row.action?.type === 'next');
  assert.equal(attackRow?.boundary, 'returned');
  assert.equal(passRow?.boundary, 'returned');
  assert.ok(Math.abs(attackRow.search - passRow.search) <= 1e-9);
 });

 test('E. raid Impact stays live, and a must-block defender still has no skip', () => {
  const raid = openAttack(mixedBase, mixed, [
   {player: 1, id: 'BLC-2-067', ready: true}
  ]);
  const under = take(bleach, raid.state, 1, 'BLC-4-070');
  under.faceDown = false;
  raid.placed[0].stack = [under];
  assert.equal(assertUniversalMatch(mixed, raid.state), true);
  assert.equal(universalImpact(mixed, raid.state, raid.placed[0]), 1);
  assert.equal(universalAttackDamage(mixed, raid.state, raid.placed[0]), 1);
  const choice = decide(mixed, raid.state);
  assert.equal(choice.action?.type, 'attack', JSON.stringify(rowsOf(choice.trace)));
  assert.equal(choice.action.uid, raid.placed[0].uid);
  assert.equal(universalImpact(mixed, raid.state, raid.placed[0]), 1);
  const after = connect(mixed, raid.state, choice.action);
  assert.equal(after.players[0].life.length, 6);
  assert.equal(universalImpact(mixed, after, after.players[1].front.find(card => card?.uid === raid.placed[0].uid)), 1);

  const wall = openAttack(bleachBase, both, [
   {player: 1, id: 'BLC-2-067', ready: true},
   {player: 0, id: 'BLC-4-070', slot: 0, ready: true}
  ]);
  const swing = legalUniversalActions(both, wall.state).find(action => action.type === 'attack');
  const blocked = dispatchUniversalAction(both, wall.state, swing, {actor: 1});
  const blocks = legalUniversalActions(both, blocked);
  assert.equal(blocked.pending?.kind, 'block');
  assert.equal(blocks.some(action => action.type === 'chooseBlock' && action.uid == null), false);
  assert.ok(blocks.some(action => action.type === 'chooseBlock' && action.uid === wall.placed[1].uid));
  const asked = decide(both, wall.state);
  assert.ok(exact(legalUniversalActions(both, wall.state), asked.action));
 });
});
