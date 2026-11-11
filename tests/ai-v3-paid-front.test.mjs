import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseHybridMainAction, hybridDecisionLog, lastHybridRoute, resetHybridDecisionLog} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {preferPaidFront} from '../dist/universal-v2/ai-v3/paid-front.mjs';
import {lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {loadPaidFrontLock, paidFrontJobs, pairedInterval} from '../scripts/ai-v3-paid-front-ab.mjs';
import {legalUniversalActions, universalBp, universalEnergyByColor} from '../dist/universal-v2/engine.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const deck = battleDecks().find(item => item.id === 'white-sword');
const packs = [deck.pack, deck.pack];

function load(step){
 const fixture = JSON.parse(readFileSync(new URL(`./fixtures/ai-v3-paid-front-8801-${step}.json`, import.meta.url), 'utf8'));
 return fixture.state;
}
function printed(card){
 if(!card?.uid)return null;
 return packs[Number(String(card.uid).split('-')[0])].cards[card.cardId];
}
function live(state, card){
 return universalBp(packs, state, card);
}
function energyPlay(state, minBp){
 const legal = legalUniversalActions(packs, state);
 return legal.find(action => action.type === 'play' && action.line === 'energy'
  && live(state, state.players[0].hand.find(card => card.uid === action.uid)) >= minBp);
}
function choose(state, factors){
 return chooseHybridMainAction(packs, state, {actor: 0, nodes: 48, ms: 1e9, seed: 1, ...(factors ? {factors} : {})});
}

test('zero energy keeps a small character on energy', () => {
 const state = load(8);
 const plain = choose(state);
 const switched = choose(state, {paidFront: true});
 assert.equal(same(plain, switched), true);
 assert.equal(plain.type, 'play');
 assert.equal(plain.line, 'energy');
 const colors = universalEnergyByColor(packs, state, 0);
 assert.equal(Object.values(colors).reduce((sum, value) => sum + value, 0), 0);
 assert.ok(live(state, state.players[0].hand.find(card => card.uid === plain.uid)) < 3000);
});

test('a small generator stays on energy while a 4000 front play is legal', () => {
 const state = load(39);
 const plain = choose(state);
 const switched = choose(state, {paidFront: true});
 assert.equal(same(plain, switched), true);
 assert.equal(plain.type, 'play');
 assert.equal(plain.line, 'energy');
 const card = state.players[0].hand.find(item => item.uid === plain.uid);
 assert.ok(live(state, card) < 3000);
 assert.equal(lastHybridRoute().lane, 'main');
 assert.equal(lastHybridRoute().source, 'hard');
 assert.equal(lastHybridRoute().nodes, 48);
});

test('green 3 keeps the small generator and will deploy a 4000 if that was the energy play', () => {
 const state = load(62);
 const plain = choose(state);
 const switched = choose(state, {paidFront: true});
 assert.equal(same(plain, switched), true);
 assert.ok(live(state, state.players[0].hand.find(card => card.uid === plain.uid)) < 3000);
 const heavy = energyPlay(state, 3000);
 assert.ok(heavy);
 const legal = legalUniversalActions(packs, state);
 const trace = lastHardAiTrace();
 const replaced = preferPaidFront(packs, state, 0, heavy, legal, trace);
 assert.notEqual(same(replaced, heavy), true);
 assert.ok(replaced.type === 'raid' || (replaced.type === 'play' && replaced.line === 'front'));
 const body = state.players[0].hand.find(card => card.uid === replaced.uid);
 assert.ok(live(state, body) >= 3000);
 assert.equal(legal.some(action => same(action, replaced)), true);
});

test('a front that already has 4000 keeps the energy play', () => {
 const state = load(82);
 const heavy = energyPlay(state, 3000);
 assert.ok(heavy);
 const legal = legalUniversalActions(packs, state);
 const replaced = preferPaidFront(packs, state, 0, heavy, legal, {candidates: []});
 assert.equal(same(replaced, heavy), true);
 assert.ok(state.players[0].front.some(card => card && live(state, card) >= 3000));
});

test('no payable 3000 deploy and a negative deploy both stay on energy', () => {
 const state = load(62);
 const heavy = energyPlay(state, 3000);
 const legal = legalUniversalActions(packs, state);
 const onlyEnergy = legal.filter(action => action.type === 'next' || (action.type === 'play' && action.line === 'energy'));
 assert.equal(same(preferPaidFront(packs, state, 0, heavy, onlyEnergy, null), heavy), true);
 const deploys = legal.filter(action => {
  const card = state.players[0].hand.find(item => item.uid === action.uid);
  return card && (action.type === 'raid' || (action.type === 'play' && action.line === 'front')) && live(state, card) >= 3000;
 });
 assert.ok(deploys.length);
 const negative = {candidates: [...deploys.map(action => ({action, score: -40})), {action: heavy, score: 50}]};
 assert.equal(same(preferPaidFront(packs, state, 0, heavy, legal, negative), heavy), true);
});

test('the decision log records own costs and does not carry hidden zones', () => {
 resetHybridDecisionLog();
 const state = load(39);
 const first = choose(state);
 const firstTrace = lastHardAiTrace();
 resetHybridDecisionLog();
 const second = choose(state);
 const secondTrace = lastHardAiTrace();
 assert.equal(same(first, second), true);
 assert.equal(firstTrace.nodesUsed, secondTrace.nodesUsed);
 const log = hybridDecisionLog();
 assert.equal(log.length, 1);
 const row = log[0];
 assert.equal(row.lane, 'main');
 assert.equal(row.ownHand.some(card => card.cost >= 4 && card.bp >= 3000), true);
 assert.equal(Object.hasOwn(row, 'deck'), false);
 assert.equal(Object.hasOwn(row, 'oppHand'), false);
 assert.equal(JSON.stringify(row).includes('"uid"'), false);
 assert.equal(row.life.length, 2);
 assert.ok(row.nodesUsed <= 48);
 const oppIds = new Set((state.players[1].hand || []).map(card => printed(card)?.id).filter(Boolean));
 assert.equal(oppIds.size > 0, true);
});

test('the 8930 lock is fixed before any comparison game', () => {
 const lock = loadPaidFrontLock();
 const jobs = paidFrontJobs(lock);
 assert.equal(jobs.length, 160);
 assert.equal(lock.clock, 'real');
 assert.equal(lock.nodes, 48);
 assert.equal(lock.ms, 40);
 assert.equal(lock.reservedFrom, 9100);
 assert.deepEqual(lock.secondSetReserved, [8970, 9009]);
 assert.equal(lock.advanceTo8970.includes('low percentile is greater than -0.05'), true);
 assert.equal(lock.decks.reduce((sum, deck) => sum + deck.games, 0), 160);
 const interval = pairedInterval([0.25, -0.25, 0, 0.5], 8930);
 assert.equal(interval.n, 4);
 assert.equal(Number.isFinite(interval.low) && Number.isFinite(interval.high), true);
});

test('the worker ignores paidFront', () => {
 const state = load(62);
 const worker = handleAiV3Request({
  sealed: true, requestId: 3, stateVersion: 1, actor: 0, seed: 1,
  nodes: 48, ms: 1e9, pack: packs, state, policy: 'hybrid-main-v1',
  factors: {paidFront: true}
 });
 assert.equal(worker.error, null);
 const plain = choose(state);
 assert.equal(same(worker.action, plain), true);
 assert.ok((worker.search?.nodesUsed ?? 0) <= 48);
});
