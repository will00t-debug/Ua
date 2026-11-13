import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions, newUniversalMatch, universalBp, universalImpact} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {chooseHybridStartHardAction, HYBRID_START_HARD_POLICY, lastHybridRoute} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {lastAiV3Trace, MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {buildAiV3Request, handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {formatAttackDiagnostic, publicAttackDiagnostic} from '../dist/universal-v2/ai-v3/attack-diagnostic.mjs';
import {publicPreviewActionLabel} from '../dist/universal-v2/preview-replay.mjs';
import {builtinBleachDeck} from '../dist/v2-bleach-builtins.mjs';

const CLOCK = {actor: 1, nodes: MATCH_LIMITS.nodes, ms: MATCH_LIMITS.ms, seed: 1, worlds: 1};
const pack = createBleachV2Pack();
const sword = builtinBleachDeck('white-sword');
if (!sword?.ready) throw new Error(JSON.stringify(sword?.issues));
const packs = [pack, pack];
const base = newUniversalMatch(packs, {decks: [sword.counts, sword.counts], seed: 11, first: 1});

function take(state, player, id) {
 for (const zone of ['hand', 'deck', 'outside', 'removed', 'life']) {
  const pile = state.players[player][zone];
  const index = pile.findIndex(card => card.cardId === id);
  if (index >= 0) return pile.splice(index, 1)[0];
 }
 throw new Error('missing ' + id);
}
function put(state, player, id, slot, ready) {
 const card = take(state, player, id);
 card.ready = ready;
 card.fieldEntryStamp = state.nextFieldEntryStamp++;
 card.entryTurn = state.turn - 1;
 card.stack = [];
 card.under = [];
 card.buffs = [];
 state.players[player].front[slot] = card;
 return card;
}
function bury(state, player, top, id) {
 const baseCard = take(state, player, id);
 baseCard.faceDown = false;
 baseCard.ready = false;
 baseCard.stack = [];
 baseCard.under = [];
 top.stack = [baseCard];
}
function life(state, player, count) {
 const person = state.players[player];
 const quiet = [];
 for (const zone of ['deck', 'hand', 'life', 'outside']) {
  const pile = person[zone];
  for (let index = pile.length - 1; index >= 0 && quiet.length < count; index--) {
   if (!pack.cards[pile[index].cardId]?.trigger) quiet.push(pile.splice(index, 1)[0]);
  }
 }
 person.deck.push(...person.life);
 person.life = quiet;
 assert.equal(person.life.length, count);
}
function open() {
 const state = structuredClone(base);
 state.pending = null;
 state.phase = 'attack';
 state.active = 1;
 state.turn = 8;
 state.attacksThisTurn = 0;
 state.attacksByUid = {};
 state.continuousStates = [];
 for (const line of ['front', 'energy']) {
  state.players[0][line] = [null, null, null, null];
  state.players[1][line] = [null, null, null, null];
 }
 return state;
}
function decide(state, limits = CLOCK) {
 const action = chooseHybridStartHardAction(packs, state, limits);
 return {action, trace: lastAiV3Trace(), route: lastHybridRoute()};
}
function rows(trace) {
 return (trace?.candidates || []).filter(row => row.action?.type === 'attack' || row.action?.type === 'next');
}
function exact(state, action) {
 return legalUniversalActions(packs, state).find(item => JSON.stringify(item) === JSON.stringify(action)) || null;
}
function blockWith(state, attacker, blocker) {
 const swing = legalUniversalActions(packs, state).find(action => action.type === 'attack' && action.uid === attacker.uid);
 assert.ok(swing, attacker.cardId + ' cannot attack');
 let cursor = dispatchUniversalAction(packs, state, swing, {actor: 1});
 const choice = legalUniversalActions(packs, cursor).find(action => action.type === 'chooseBlock' && action.uid === blocker.uid);
 assert.ok(choice, 'the named blocker cannot block');
 const after = dispatchUniversalAction(packs, structuredClone(cursor), choice, {actor: 0});
 const label = publicPreviewActionLabel(packs, cursor, after, choice, 0);
 cursor = dispatchUniversalAction(packs, cursor, choice, {actor: 0});
 return {cursor, label};
}

describe('blocked raid wave', {concurrency: false}, () => {
 test('a 4000 tie removes the blocker from the public log, and a lower attacker does not', () => {
  const state = open();
  const attacker = put(state, 1, 'BLC-1-085', 2, true);
  bury(state, 1, attacker, 'BLC-3-009');
  const ken = put(state, 0, 'BLC-2-067', 3, true);
  bury(state, 0, ken, 'BLC-4-070');
  life(state, 0, 6);
  life(state, 1, 3);
  assert.equal(assertUniversalMatch(packs, state), true);
  assert.equal(universalBp(packs, state, attacker), 4000);
  assert.equal(universalBp(packs, state, ken), 4000);
  assert.equal(universalImpact(packs, state, ken), 1);
  const won = blockWith(state, attacker, ken);
  assert.match(won.label, /送至場外 更木 剣八（BLC-2-067）/);
  assert.equal(won.cursor.players[0].front.some(card => card?.uid === ken.uid), false);
  assert.equal(won.cursor.players[0].life.length, 6);

  const lower = open();
  const small = put(lower, 1, 'BLC-2-069', 1, true);
  const wall = put(lower, 0, 'BLC-2-067', 3, true);
  bury(lower, 0, wall, 'BLC-4-070');
  life(lower, 0, 6);
  life(lower, 1, 3);
  assert.equal(assertUniversalMatch(packs, lower), true);
  const lost = blockWith(lower, small, wall);
  assert.equal(lost.label, '你：使用 更木 剣八 阻擋');
  assert.equal(lost.cursor.players[0].front.some(card => card?.uid === wall.uid), true);
  assert.equal(lost.cursor.players[0].life.length, 6);
  assert.equal(lost.cursor.attacksThisTurn, 1);
 });

 test('the diagnostic names both public fronts and no hidden card', () => {
  const state = open();
  const first = put(state, 1, 'BLC-1-085', 0, false);
  const second = put(state, 1, 'BLC-1-085', 2, true);
  const ken = put(state, 0, 'BLC-2-067', 3, true);
  bury(state, 0, ken, 'BLC-4-070');
  const buried = ken.stack[0].uid;
  life(state, 0, 6);
  life(state, 1, 3);
  assert.equal(assertUniversalMatch(packs, state), true);
  const hidden = [];
  for (const player of state.players) {
   for (const zone of ['hand', 'deck', 'life', 'outside', 'removed']) {
    for (const card of player[zone] || []) if (card?.uid) hidden.push(card.uid);
   }
  }
  const search = {
   reason: 'search', fallbackKind: null, nodesUsed: 12, ms: 9.4,
   lines: [{type: 'attack', uid: second.uid, search: 12.3, boundary: 'returned'}, {type: 'next', uid: null, search: 4, boundary: 'returned'}],
   route: {policy: HYBRID_START_HARD_POLICY, lane: 'battle', source: 'v3'}
  };
  const row = publicAttackDiagnostic(packs, state, 1, {action: {type: 'attack', uid: second.uid}, search});
  const listed = new Set();
  const visit = value => {
   if (!value || typeof value !== 'object') return;
   if (typeof value.uid === 'string') listed.add(value.uid);
   for (const item of Array.isArray(value) ? value : Object.values(value)) visit(item);
  };
  visit(row);
  for (const uid of hidden) assert.equal(listed.has(uid), false, uid);
  assert.equal(listed.has(buried), false);
  assert.equal(row.fronts[1].cards[0].uid, first.uid);
  assert.equal(row.fronts[1].cards[0].ready, false);
  assert.equal(row.fronts[1].cards[2].uid, second.uid);
  assert.equal(row.fronts[1].cards[2].ready, true);
  assert.notEqual(first.uid, second.uid);
  assert.deepEqual(row.attacks, [second.uid]);
  assert.equal(row.next, true);
  assert.equal(row.lines[0].search, 12.3);
  assert.equal(row.lines[1].search, 4);
  const line = formatAttackDiagnostic(row);
  assert.match(line, new RegExp(first.uid));
  assert.match(line, new RegExp(second.uid));
  assert.match(line, /ACTIVE/);
  assert.match(line, /REST/);
  assert.doesNotMatch(line, /手牌|牌庫|生命/);
 });

 test('A and B. after one raid Hitsugaya is blocked, the other is attacked at life 3', () => {
  const state = open();
  const first = put(state, 1, 'BLC-1-085', 0, true);
  bury(state, 1, first, 'BLC-1-083');
  const second = put(state, 1, 'BLC-1-085', 2, true);
  bury(state, 1, second, 'BLC-2-069');
  put(state, 1, 'BLC-4-070', 3, false);
  const yachiru = put(state, 0, 'BLC-1-070', 1, true);
  bury(state, 0, yachiru, 'BLC-4-066');
  const ken = put(state, 0, 'BLC-2-067', 3, true);
  bury(state, 0, ken, 'BLC-4-070');
  ken.buffs = [{bp: 1000, untilTurn: state.turn}];
  life(state, 0, 6);
  life(state, 1, 3);
  assert.equal(assertUniversalMatch(packs, state), true);
  assert.equal(state.players[1].life.length, 3);
  assert.equal(universalBp(packs, state, ken), 5000);
  assert.equal(universalBp(packs, state, yachiru), 4000);
  assert.equal(yachiru.ready, true);
  assert.equal(ken.ready, true);
  const blocked = blockWith(state, first, ken);
  assert.equal(blocked.label, '你：使用 更木 剣八 阻擋');
  assert.equal(blocked.cursor.players[0].front.find(card => card?.uid === ken.uid)?.ready, false);
  assert.equal(blocked.cursor.players[1].front.find(card => card?.uid === first.uid)?.ready, false);
  assert.equal(blocked.cursor.players[1].front.find(card => card?.uid === second.uid)?.ready, true);
  assert.equal(blocked.cursor.players[0].life.length, 6);
  const legal = legalUniversalActions(packs, blocked.cursor);
  assert.deepEqual(legal.filter(action => action.type === 'attack').map(action => action.uid), [second.uid]);
  const choice = decide(blocked.cursor);
  assert.equal(choice.route.policy, HYBRID_START_HARD_POLICY);
  assert.equal(choice.route.lane, 'battle');
  assert.equal(choice.route.source, 'v3');
  assert.equal(choice.route.ms, 40);
  assert.equal(choice.action?.type, 'attack', JSON.stringify(rows(choice.trace)));
  assert.equal(choice.action.uid, second.uid);
  assert.ok(exact(blocked.cursor, choice.action));
  const attack = rows(choice.trace).find(row => row.action.uid === second.uid);
  const pass = rows(choice.trace).find(row => row.action.type === 'next');
  if (attack && pass && Number.isFinite(attack.search) && Number.isFinite(pass.search)) {
   assert.ok(attack.search > pass.search, JSON.stringify(rows(choice.trace)));
  }
 });

 test('C. a better finished attack is not passed, including the 40ms worker result', () => {
  const state = open();
  const locked = put(state, 1, 'BLC-1-085', 0, false);
  bury(state, 1, locked, 'BLC-1-083');
  const small = put(state, 1, 'BLC-2-069', 1, true);
  const other = put(state, 1, 'BLC-1-085', 2, true);
  bury(state, 1, other, 'BLC-2-069');
  put(state, 1, 'BLC-4-070', 3, false);
  const yachiru = put(state, 0, 'BLC-1-070', 1, false);
  const hitsugaya = put(state, 0, 'BLC-1-085', 2, true);
  bury(state, 0, hitsugaya, 'BLC-3-009');
  const ken = put(state, 0, 'BLC-2-067', 3, true);
  bury(state, 0, ken, 'BLC-4-070');
  life(state, 0, 6);
  life(state, 1, 3);
  grantContinuousState(state, {
   kind: 'cannotActive', controller: 0, sourceUid: hitsugaya.uid, targetUid: locked.uid,
   sourceLinked: false, releaseBeforeRefresh: true,
   until: {player: 1, phase: 'attack', edge: 'end'}
  });
  locked.ready = false;
  assert.equal(assertUniversalMatch(packs, state), true);
  assert.equal(universalBp(packs, state, yachiru), 4000);
  assert.equal(universalBp(packs, state, hitsugaya), 4000);
  const blocked = blockWith(state, small, ken);
  assert.equal(blocked.cursor.attacksThisTurn, 1);
  assert.equal(blocked.cursor.players[1].front.find(card => card?.uid === locked.uid)?.ready, false);
  assert.equal(legalUniversalActions(packs, blocked.cursor).some(action => action.type === 'attack' && action.uid === locked.uid), false);
  const finished = decide(blocked.cursor, {...CLOCK, ms: 2000});
  const attack = rows(finished.trace).find(row => row.action.uid === other.uid);
  const pass = rows(finished.trace).find(row => row.action.type === 'next');
  assert.equal(attack?.boundary, 'returned');
  assert.ok(attack.search > pass.search, JSON.stringify(rows(finished.trace)));
  assert.equal(finished.action?.type, 'attack');
  assert.equal(finished.action.uid, other.uid);
  // The 40ms worker budget is a wall clock. One slow slice can return next
  // before the better attack is scored. The same request is repeated so a
  // single slice does not fail the production suite. A search that always
  // passes still fails.
  let request = null;
  let worker = null;
  const missed = [];
  for (let attempt = 0; attempt < 3; attempt++) {
   request = buildAiV3Request(packs, blocked.cursor, 1, {
    requestId: 7, stateVersion: 1, seed: 1, nodes: 48, ms: 40, policy: HYBRID_START_HARD_POLICY
   });
   const candidate = handleAiV3Request(request);
   const workerAttack = candidate.search?.lines?.find(line => line.uid === other.uid);
   const workerPass = candidate.search?.lines?.find(line => line.type === 'next');
   const ranked = workerAttack && workerPass && workerAttack.search > workerPass.search;
   if (candidate.error == null && candidate.action?.type === 'attack' && candidate.action.uid === other.uid
    && candidate.search?.route?.source === 'v3' && candidate.search.ms < 55 && ranked) {
    worker = candidate;
    break;
   }
   missed.push({
    attempt, error: candidate.error, type: candidate.action?.type ?? null,
    uid: candidate.action?.uid ?? null, ms: candidate.search?.ms ?? null,
    reason: candidate.search?.reason ?? null, lines: candidate.search?.lines ?? null
   });
  }
  assert.ok(worker, JSON.stringify(missed));
  assert.equal(request.ms, 40);
  const live = decide(blocked.cursor);
  assert.equal(live.action?.type, 'attack');
  assert.equal(live.action.uid, other.uid);
  assert.notEqual(live.trace?.reason, 'worker-timeout');
 });

 test('D. an equal finished score on the first swing keeps the pass', () => {
  const state = open();
  const small = put(state, 1, 'BLC-2-069', 0, true);
  const ken = put(state, 0, 'BLC-2-067', 0, true);
  bury(state, 0, ken, 'BLC-4-070');
  life(state, 0, 6);
  life(state, 1, 2);
  assert.equal(assertUniversalMatch(packs, state), true);
  assert.equal(universalBp(packs, state, ken), 4000);
  assert.equal(universalImpact(packs, state, ken), 1);
  assert.ok(universalBp(packs, state, ken) > universalBp(packs, state, small));
  const finished = decide(state, {...CLOCK, ms: 2000});
  const attack = rows(finished.trace).find(row => row.action.type === 'attack');
  const pass = rows(finished.trace).find(row => row.action.type === 'next');
  assert.equal(attack?.boundary, 'returned');
  assert.equal(pass?.boundary, 'returned');
  assert.ok(Math.abs(attack.search - pass.search) <= 1e-9);
  assert.equal(finished.action?.type, 'next');
  assert.ok(exact(state, finished.action));
  const live = decide(state);
  assert.ok(exact(state, live.action));
  const liveAttack = rows(live.trace).find(row => row.action.type === 'attack');
  const livePass = rows(live.trace).find(row => row.action.type === 'next');
  if (liveAttack?.boundary === 'returned' && livePass?.boundary === 'returned'
   && Math.abs(liveAttack.search - livePass.search) <= 1e-9) {
   assert.equal(live.action.type, 'next');
  }
 });

 test('E. rest, cannot-attack, and must-block stay closed', () => {
  const rested = open();
  put(rested, 1, 'BLC-1-085', 0, false);
  put(rested, 1, 'BLC-1-085', 2, false);
  life(rested, 0, 6);
  life(rested, 1, 3);
  assert.equal(assertUniversalMatch(packs, rested), true);
  assert.equal(legalUniversalActions(packs, rested).some(action => action.type === 'attack'), false);
  assert.equal(decide(rested).action?.type, 'next');

  const banned = open();
  const body = put(banned, 1, 'BLC-1-085', 0, true);
  life(banned, 0, 6);
  life(banned, 1, 3);
  grantContinuousState(banned, {
   kind: 'cannotAttack', controller: 1, sourceUid: body.uid, targetUid: body.uid,
   sourceLinked: false, until: {player: 1, phase: 'start', edge: 'start'}
  });
  assert.equal(assertUniversalMatch(packs, banned), true);
  assert.equal(legalUniversalActions(packs, banned).some(action => action.type === 'attack'), false);
  assert.equal(decide(banned).action?.type, 'next');

  const wall = open();
  const attacker = put(wall, 1, 'BLC-1-085', 0, true);
  const must = put(wall, 0, 'BLC-4-070', 0, true);
  life(wall, 0, 6);
  life(wall, 1, 3);
  assert.equal(assertUniversalMatch(packs, wall), true);
  const swing = legalUniversalActions(packs, wall).find(action => action.type === 'attack' && action.uid === attacker.uid);
  const pending = dispatchUniversalAction(packs, wall, swing, {actor: 1});
  const blocks = legalUniversalActions(packs, pending);
  assert.equal(pending.pending?.kind, 'block');
  assert.equal(blocks.some(action => action.type === 'chooseBlock' && action.uid == null), false);
  assert.ok(blocks.some(action => action.type === 'chooseBlock' && action.uid === must.uid));
 });
});
