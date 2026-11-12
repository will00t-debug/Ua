#!/usr/bin/env node
// Four continuations from each 8440–8442 reserveAp result flip.
// The first action is fixed. Every later action is chosen again from the
// legal list. Deck order and unrevealed LIFE are not read.
//
//   node scripts/ai-v3-reserve-ap-fork.mjs
//   FORK_ONLY=0 node scripts/ai-v3-reserve-ap-fork.mjs
//   FORK_PART=0/4 FORK_OUT=audit/ai-v3-reserve-ap-fork-part-0.json node scripts/ai-v3-reserve-ap-fork.mjs
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {legalUniversalActions, dispatchUniversalAction, universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action, lastAiV3Trace, MATCH_LIMITS, resetAiV3Report} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction, hardAiReport, HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {reserveApPlan} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {packOf} from '../dist/universal-v2/ai-v3/observation.mjs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {matchRules, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';

export const BASELINE_PATH = 'audit/ai-v3-reserve-ap-bounce-8440-baseline.json';
export const CANDIDATE_PATH = 'audit/ai-v3-reserve-ap-bounce-8440.json';
export const STEP_LIMIT = 400;
const CLOCK = 1000000000;
const BUDGET = {...MATCH_LIMITS, ms: CLOCK, nodes: 48, seed: 1};

export function loadAudits() {
  return {
    baseline: JSON.parse(readFileSync(BASELINE_PATH, 'utf8')),
    candidate: JSON.parse(readFileSync(CANDIDATE_PATH, 'utf8'))
  };
}
function gameMap(doc) {
  const map = new Map();
  for (const [title, bucket] of Object.entries(doc.titles || {})) {
    const games = bucket.byMode?.tree?.games || [];
    for (const game of games) map.set(`${title}|${game.seed}|${game.first}|${game.challengerSeat}`, game);
  }
  return map;
}
function firstDiff(left, right) {
  const n = Math.min(left.length, right.length);
  for (let i = 0; i < n; i++) {
    if (left[i].actor !== right[i].actor || JSON.stringify(left[i].action) !== JSON.stringify(right[i].action)) return i;
  }
  return left.length === right.length ? -1 : n;
}
export function listFlips(baseline, candidate) {
  const left = gameMap(baseline);
  const right = gameMap(candidate);
  const flips = [];
  for (const [key, base] of left) {
    const cand = right.get(key);
    if (!cand || base.challengerWon === cand.challengerWon) continue;
    const diff = firstDiff(base.actions, cand.actions);
    const [title, seed, first, seat] = key.split('|');
    flips.push({
      key, title, seed: Number(seed), first: Number(first), seat: Number(seat), diff,
      result: cand.challengerWon && !base.challengerWon ? 'gained' : 'lost',
      baseline: base, candidate: cand
    });
  }
  flips.sort((a, b) => a.key.localeCompare(b.key));
  return flips;
}
export function deckById() {
  return new Map(battleDecks().map(deck => [deck.id, deck]));
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
export function replayPrefix(deck, game, count) {
  const packs = [deck.pack, deck.pack];
  let state = newComparedMatch(packs, [deck.counts, deck.counts], game.seed, game.first, matchRules('official'));
  for (const choice of game.opening || []) {
    if (state.pending?.kind !== 'opening-mulligan' || state.pending.player !== choice.actor) {
      return {ok: false, error: 'opening-actor'};
    }
    const legal = legalUniversalActions(packs, state);
    const action = legal.find(item => item.type === 'openingMulligan' && item.mode === choice.mode);
    if (!action) return {ok: false, error: 'opening-action'};
    state = dispatchUniversalAction(packs, state, action, {actor: choice.actor});
  }
  for (const step of (game.actions || []).slice(0, count)) {
    if (state.status !== 'playing') return {ok: false, error: 'finished-early', step: step.step};
    const actor = state.pending?.player ?? state.active;
    if (actor !== step.actor) return {ok: false, error: 'actor', step: step.step};
    const legal = legalUniversalActions(packs, state);
    const action = legal.find(item => same(item, step.action));
    if (!action) return {ok: false, error: 'action', step: step.step, action: step.action};
    state = dispatchUniversalAction(packs, state, action, {actor});
  }
  const hash = createHash('sha256').update(JSON.stringify(state)).digest('hex');
  return {ok: true, packs, state, hash};
}
function brief(catalog, cardId) {
  const card = catalog?.[cardId];
  if (!card) return {id: cardId};
  const list = card.effects?.onPlay;
  const onPlay = Array.isArray(list) ? list.map(item => item?.op).filter(Boolean) : [];
  return {
    id: card.id || cardId, name: card.name || null, type: card.type || null,
    color: card.color || null, energy: Number(card.energy) || 0, gen: Number(card.gen) || 0,
    ap: Number(card.ap) || 0, bp: Number(card.bp) || 0, onPlay
  };
}
function fieldCard(catalog, card) {
  if (!card) return null;
  return {...brief(catalog, card.cardId), uid: card.uid, ready: card.ready !== false, produces: card.produces ?? card.baseProduces ?? 0, bpLive: card.bp ?? null};
}
export function visibleSnapshot(packs, state, actor) {
  const view = universalPublicView(packs, state, actor);
  const mine = view.players[actor];
  const opp = view.players[1 - actor];
  const catalog = packOf(packs, actor).cards;
  const oppCatalog = packOf(packs, 1 - actor).cards;
  const hand = (mine.hand || []).map(card => ({...brief(catalog, card.cardId), uid: card.uid}));
  const colors = {...(mine.energyByColor || {})};
  return {
    phase: view.phase, turn: view.turn, pending: view.pending?.kind || null,
    life: [mine.lifeCount, opp.lifeCount],
    revealedLife: (mine.faceUpLife || []).length + (mine.publicLife || []).length,
    apReady: mine.apReady, apTotal: mine.apTotal,
    energyByColor: colors, energyTotal: mine.energyTotal,
    deckCount: mine.deckCount, oppDeckCount: opp.deckCount,
    handCount: mine.handCount, oppHandCount: opp.handCount,
    hand,
    front: (mine.front || []).map(card => fieldCard(catalog, card)),
    oppFront: (opp.front || []).map(card => fieldCard(oppCatalog, card)),
    energy: (mine.energy || []).map(card => fieldCard(catalog, card)),
    oppEnergy: (opp.energy || []).map(card => fieldCard(oppCatalog, card))
  };
}
function payableNow(card, colors, apReady) {
  return card.type === 'character' && card.energy <= (colors[card.color] || 0) && card.ap <= apReady;
}
function strandedCards(snapshot) {
  return snapshot.hand.filter(card => card.type === 'character' && card.energy > (snapshot.energyByColor[card.color] || 0));
}
function policyAction(packs, state, actor, factors) {
  const probe = structuredClone(state);
  resetAiV3Report();
  const meter = {dispatches: 0};
  const action = chooseAiV3Action(packs, probe, {
    actor, ...BUDGET, plan: 'tree', meter, ...(factors ? {factors} : {})
  });
  const trace = lastAiV3Trace();
  return {
    type: action?.type || null,
    reason: trace?.reason || null,
    nodesUsed: Number.isFinite(trace?.nodesUsed) ? trace.nodesUsed : null,
    dispatches: meter.dispatches,
    settled: trace?.settled === true
  };
}
function findLegal(legal, wanted) {
  return legal.find(item => same(item, wanted)) || legal.find(item => item.type === wanted?.type) || null;
}
function compactAction(action) {
  if (!action) return null;
  const out = {type: action.type};
  for (const key of ['line', 'uid', 'mode', 'slot', 'replaceUid']) {
    if (action[key] != null) out[key] = action[key];
  }
  return out;
}
function developmentOf(log, played, attackUids) {
  const attacks = new Set(attackUids || []);
  return {
    energyPlays: log.filter(item => item.type === 'play' && item.line === 'energy').map(item => item.cardId),
    frontPlays: log.filter(item => item.type === 'play' && item.line === 'front').map(item => item.cardId),
    bounces: log.filter(item => item.type === 'chooseOwnBounce').map(item => item.cardId || item.uid),
    played: played.map(item => ({...item, canAttack: attacks.has(item.uid)})),
    attackUids: [...attacks]
  };
}
function replayAgainst(got, flip, recorded, state) {
  const want = (recorded.actions || []).slice(flip.diff);
  let matched = got.length === want.length && state.status === (recorded.finished ? 'finished' : 'playing') && state.winner === recorded.winner;
  let firstMismatch = null;
  const n = Math.min(got.length, want.length);
  for (let i = 0; i < n; i++) {
    if (got[i].actor !== want[i].actor || !same(got[i].action, want[i].action)) {
      matched = false;
      firstMismatch = {index: flip.diff + i, got: compactAction(got[i].action), want: compactAction(want[i].action)};
      break;
    }
  }
  if (!firstMismatch && got.length !== want.length) {
    matched = false;
    firstMismatch = {index: flip.diff + n, got: got.length, want: want.length};
  }
  return {matched, firstMismatch};
}
function runBranch(packs, origin, flip, actionType, factors) {
  let state = structuredClone(origin);
  const seat = flip.seat;
  const startTurn = state.turn;
  const legal0 = legalUniversalActions(packs, state);
  const forced = findLegal(legal0, {type: actionType});
  if (!forced) return {ok: false, error: 'forced-illegal', actionType};
  const beforeHand = new Set((state.players[seat].hand || []).map(card => card.uid));
  state = dispatchUniversalAction(packs, state, forced, {actor: seat});
  const drawn = actionType === 'extraDraw'
    ? (state.players[seat].hand || []).filter(card => !beforeHand.has(card.uid)).map(card => card.uid)
    : [];
  const drawnBrief = drawn.map(uid => {
    const card = (universalPublicView(packs, state, seat).players[seat].hand || []).find(item => item.uid === uid);
    return card ? {...brief(packOf(packs, seat).cards, card.cardId), uid} : {uid, hidden: true};
  });
  let steps = flip.diff + 1;
  let seenMain = false;
  let mainEnd = null;
  let attack = null;
  let nextStart = null;
  let nextPlan = null;
  let lastIdle = null;
  const log = [];
  const search = {decisions: 0, multi: 0, dispatches: 0, maxNodes: 0, mismatch: 0, forced: 1};
  const hard = {decisions: 0, nodes: 0};
  let laterDraws = 0;
  let laterPasses = 0;
  let illegal = 0;
  let engineError = null;
  const got = [{actor: seat, action: forced}];
  const started = performance.now();
  while (state.status === 'playing' && steps < STEP_LIMIT) {
    const idle = !state.pending;
    if (idle && state.turn === startTurn && (state.phase === 'main' || state.phase === 'attack')) {
      seenMain = seenMain || state.phase === 'main' || log.some(item => item.phase === 'main');
      lastIdle = visibleSnapshot(packs, state, seat);
    }
    if (seenMain && !mainEnd && idle && state.turn === startTurn && state.phase === 'attack') {
      mainEnd = visibleSnapshot(packs, state, seat);
      const legal = legalUniversalActions(packs, state);
      attack = legal.filter(item => item.type === 'attack').map(item => item.uid);
    }
    if (seenMain && !mainEnd && (state.turn !== startTurn || state.status !== 'playing')) mainEnd = lastIdle;
    if (state.turn > startTurn && state.active === seat && state.phase === 'start') {
      if (!nextStart) nextStart = visibleSnapshot(packs, state, seat);
      if (!nextPlan && !state.pending) nextPlan = reserveApPlan(packs, state, seat);
    }
    const actor = state.pending?.player ?? state.active;
    const legal = legalUniversalActions(packs, state);
    let action = null;
    let nodesUsed = null;
    let dispatches = null;
    if (actor === seat) {
      const meter = {dispatches: 0};
      action = chooseAiV3Action(packs, state, {
        actor, ...BUDGET, plan: 'tree', meter, ...(factors ? {factors} : {})
      });
      const trace = lastAiV3Trace();
      nodesUsed = Number.isFinite(trace?.nodesUsed) ? trace.nodesUsed : null;
      dispatches = meter.dispatches;
      search.decisions++;
      if (legal.length > 1) {
        search.multi++;
        search.dispatches += dispatches;
        if (nodesUsed != null) search.maxNodes = Math.max(search.maxNodes, nodesUsed);
        if (nodesUsed != null && dispatches !== nodesUsed) search.mismatch++;
      }
      if (idle && state.phase === 'start') {
        if (action?.type === 'extraDraw') laterDraws++;
        if (action?.type === 'next') laterPasses++;
      }
    } else {
      const before = hardAiReport().nodes || 0;
      action = chooseStrengthenedHardAction(packs, state, {nodes: BUDGET.nodes, ms: BUDGET.ms, seed: BUDGET.seed});
      hard.decisions++;
      hard.nodes += Math.max(0, (hardAiReport().nodes || 0) - before);
    }
    const exact = legal.find(item => same(item, action));
    if (!exact) {
      illegal++;
      break;
    }
    if (!mainEnd) {
      const view = universalPublicView(packs, state, seat);
      const owners = [packOf(packs, 0).cards, packOf(packs, 1).cards];
      let cardId = null;
      for (const player of view.players) {
        for (const zone of ['hand', 'front', 'energy', 'outside', 'removed']) {
          const found = (player[zone] || []).find(card => card?.uid === exact.uid);
          if (found?.cardId) cardId = found.cardId;
        }
      }
      if (!cardId && exact.uid && actor === seat) {
        const own = (state.players[seat].hand || []).find(card => card.uid === exact.uid);
        if (own) cardId = own.cardId;
      }
      log.push({
        step: steps, actor, phase: state.phase, pending: state.pending?.kind || null,
        ...compactAction(exact),
        ...(cardId ? {cardId: owners[actor]?.[cardId]?.id || cardId} : {})
      });
    }
    got.push({actor, action: exact});
    try {
      state = dispatchUniversalAction(packs, state, exact, {actor});
    } catch (error) {
      illegal++;
      engineError = error.message;
      break;
    }
    steps++;
  }
  if (seenMain && !mainEnd) mainEnd = lastIdle;
  const replay = {
    baseline: replayAgainst(got, flip, flip.baseline, state),
    candidate: replayAgainst(got, flip, flip.candidate, state)
  };
  const end = state.status === 'finished' ? visibleSnapshot(packs, state, seat) : null;
  const playedIds = new Set(log.filter(item => item.type === 'play').map(item => item.uid));
  const played = [];
  if (mainEnd) {
    for (const card of [...(mainEnd.front || []), ...(mainEnd.energy || [])]) {
      if (card?.uid && playedIds.has(card.uid)) {
        played.push({uid: card.uid, id: card.id, ready: card.ready, zone: mainEnd.front.some(item => item?.uid === card.uid) ? 'front' : 'energy'});
      }
    }
  }
  const drawnOutcome = drawnBrief.map(card => {
    const play = log.find(item => item.uid === card.uid && item.type === 'play');
    const blocked = log.some(item => item.uid === card.uid && item.type === 'chooseBlock');
    const atEnd = mainEnd && [...(mainEnd.front || []), ...(mainEnd.energy || []), ...(mainEnd.hand || [])].find(item => item?.uid === card.uid);
    return {
      ...card,
      playedLine: play?.line || null,
      blocked,
      zoneAtMainEnd: atEnd ? (mainEnd.front.some(item => item?.uid === card.uid) ? 'front' : mainEnd.energy.some(item => item?.uid === card.uid) ? 'energy' : 'hand') : 'left'
    };
  });
  return {
    ok: illegal === 0 && !engineError,
    actionType,
    reserveAp: factors?.reserveAp === true,
    illegal, engineError,
    steps, finished: state.status === 'finished', winner: state.winner,
    challengerWon: state.status === 'finished' ? state.winner === seat : null,
    endReason: state.endReason || null,
    life: end ? end.life : (state.players || []).map(player => player.life.length),
    search, hard, laterDraws, laterPasses,
    drawn: drawnOutcome,
    mainEnd: mainEnd ? {
      life: mainEnd.life, apReady: mainEnd.apReady, energyByColor: mainEnd.energyByColor, energyTotal: mainEnd.energyTotal,
      front: mainEnd.front.map(card => card && ({id: card.id, uid: card.uid, ready: card.ready, bpLive: card.bpLive})),
      energy: mainEnd.energy.map(card => card && ({id: card.id, uid: card.uid, produces: card.produces}))
    } : null,
    development: developmentOf(log, played, attack || []),
    log,
    nextStart: nextStart ? {
      life: nextStart.life, apReady: nextStart.apReady, pending: nextStart.pending,
      energyByColor: nextStart.energyByColor, energyTotal: nextStart.energyTotal,
      front: nextStart.front.map(card => card && ({id: card.id, uid: card.uid, ready: card.ready, bpLive: card.bpLive})),
      hand: nextStart.hand.map(card => ({id: card.id, uid: card.uid, energy: card.energy, gen: card.gen, bp: card.bp})),
      plan: nextPlan ? {keep: nextPlan.keep === true, full: nextPlan.full, short: nextPlan.short, starters: nextPlan.starters} : null
    } : null,
    wallMs: Math.round(performance.now() - started),
    replay
  };
}
export function diagnoseFlip(deck, flip) {
  const baseReplay = replayPrefix(deck, flip.baseline, flip.diff);
  const candReplay = replayPrefix(deck, flip.candidate, flip.diff);
  if (!baseReplay.ok || !candReplay.ok) {
    return {key: flip.key, ok: false, baseReplay, candReplay};
  }
  const sameState = baseReplay.hash === candReplay.hash;
  const packs = baseReplay.packs;
  const state = baseReplay.state;
  const actor = state.pending?.player ?? state.active;
  const legal = state.status === 'playing' ? legalUniversalActions(packs, state) : [];
  const legalTypes = legal.map(action => action.type);
  const snapshot = visibleSnapshot(packs, state, flip.seat);
  const plan = reserveApPlan(packs, state, flip.seat);
  const stranded = strandedCards(snapshot).map(card => card.id);
  const payable = snapshot.hand.filter(card => payableNow(card, snapshot.energyByColor, snapshot.apReady)).map(card => card.id);
  const factorsOn = {reserveAp: true};
  const probeOff = policyAction(packs, state, flip.seat, null);
  const probeOn = policyAction(packs, state, flip.seat, factorsOn);
  const branches = {};
  for (const actionType of ['extraDraw', 'next']) {
    for (const on of [false, true]) {
      const name = `${actionType === 'extraDraw' ? 'draw' : 'pass'}-${on ? 'on' : 'off'}`;
      const branch = runBranch(packs, state, flip, actionType, on ? factorsOn : null);
      branches[name] = branch;
      console.error('branch', flip.key, name, branch.challengerWon, branch.steps, branch.wallMs);
    }
  }
  const corners = {
    drawOffMatchesBaseline: branches['draw-off']?.replay?.baseline?.matched === true,
    passOnMatchesCandidate: branches['pass-on']?.replay?.candidate?.matched === true
  };
  return {
    ok: sameState && actor === flip.seat && !state.pending && state.phase === 'start',
    key: flip.key, title: flip.title, seed: flip.seed, first: flip.first, seat: flip.seat,
    result: flip.result, diff: flip.diff,
    baselineWon: flip.baseline.challengerWon === true,
    candidateWon: flip.candidate.challengerWon === true,
    recordedSteps: {baseline: flip.baseline.steps, candidate: flip.candidate.steps},
    sameState, stateHash: baseReplay.hash,
    actor, phase: state.phase, pending: state.pending?.kind || null,
    legalTypes,
    bothChoicesLegal: legalTypes.includes('extraDraw') && legalTypes.includes('next'),
    recordedActions: {
      baseline: flip.baseline.actions[flip.diff]?.action?.type || null,
      candidate: flip.candidate.actions[flip.diff]?.action?.type || null,
      baselineReason: flip.baseline.actions[flip.diff]?.reason || null,
      candidateReason: flip.candidate.actions[flip.diff]?.reason || null
    },
    probe: {off: probeOff, on: probeOn},
    plan: {
      keep: plan.keep === true, starters: plan.starters, refund: plan.refund === true,
      full: plan.full, short: plan.short, ready: plan.ready ?? null
    },
    position: {...snapshot, stranded, payable},
    branches, corners
  };
}
function selectFlips(flips) {
  const only = process.env.FORK_ONLY;
  if (only != null && only !== '') return [flips[Number(only)]].filter(Boolean);
  const part = process.env.FORK_PART;
  if (part) {
    const [index, count] = part.split('/').map(Number);
    return flips.filter((_, item) => item % count === index);
  }
  return flips;
}
export function main() {
  const {baseline, candidate} = loadAudits();
  const flips = selectFlips(listFlips(baseline, candidate));
  const decks = deckById();
  const rows = [];
  for (const flip of flips) {
    console.error('flip', flip.key, flip.result, 'step', flip.diff);
    const deck = decks.get(flip.title);
    if (!deck) throw new Error('missing deck ' + flip.title);
    rows.push(diagnoseFlip(deck, flip));
  }
  const report = {
    base: 'c03c2763',
    sources: [BASELINE_PATH, CANDIDATE_PATH],
    settings: {
      opponent: HARD_AI_POLICY,
      plan: 'tree',
      searchSeed: BUDGET.seed,
      nodes: BUDGET.nodes,
      ms: BUDGET.ms,
      beam: BUDGET.beam,
      actorDecisions: BUDGET.actorDecisions,
      opponentDecisions: BUDGET.opponentDecisions,
      worlds: BUDGET.worlds,
      stepLimit: STEP_LIMIT,
      factorsOff: null,
      factorsOn: {reserveAp: true},
      branches: ['draw-off', 'pass-off', 'draw-on', 'pass-on'],
      note: 'The first action is forced. Later actions are fresh legal choices. reserveAp stays off in the shipped policy.'
    },
    rows
  };
  const out = process.env.FORK_OUT;
  if (out) writeFileSync(out, JSON.stringify(report, null, 2));
  else process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  const bad = rows.filter(row => !row.ok || !row.bothChoicesLegal || !row.corners?.drawOffMatchesBaseline || !row.corners?.passOnMatchesCandidate);
  if (bad.length) {
    console.error('fork mismatches', bad.map(row => ({
      key: row.key,
      ok: row.ok,
      legal: row.bothChoicesLegal,
      corners: row.corners,
      draw: row.branches?.['draw-off']?.replay?.baseline?.firstMismatch || null,
      pass: row.branches?.['pass-on']?.replay?.candidate?.firstMismatch || null
    })));
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
