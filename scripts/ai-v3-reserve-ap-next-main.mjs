#!/usr/bin/env node
// What the extra energy was worth on the next own turn.
// Recorded lines are replayed. A branch that matched neither record is
// searched only until that turn's attack phase ends.
//
//   node scripts/ai-v3-reserve-ap-next-main.mjs
//   OBS_PART=0/4 OBS_OUT=audit/ai-v3-reserve-ap-next-part-0.json node scripts/ai-v3-reserve-ap-next-main.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {legalUniversalActions, dispatchUniversalAction, universalPublicView, effectiveHandRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action, lastAiV3Trace, MATCH_LIMITS, resetAiV3Report} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction, hardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {packOf} from '../dist/universal-v2/ai-v3/observation.mjs';
import {
  loadAudits, listFlips, deckById, replayPrefix, visibleSnapshot, STEP_LIMIT
} from './ai-v3-reserve-ap-fork.mjs';

const FORK_PATH = 'audit/ai-v3-reserve-ap-fork.json';
const BUDGET = {...MATCH_LIMITS, ms: 1000000000, nodes: 48, seed: 1};
const FACTORS_ON = {reserveAp: true};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function apCost(printed) {
  return Number.isInteger(printed?.ap) ? printed.ap : 1;
}
function compact(action) {
  if (!action) return null;
  const out = {type: action.type};
  for (const key of ['line', 'uid', 'mode', 'slot', 'replaceUid', 'baseUid']) {
    if (action[key] != null) out[key] = action[key];
  }
  return out;
}
function cardBrief(catalog, card, packs, state, actor) {
  const printed = catalog?.[card?.cardId];
  if (!printed) return {uid: card?.uid || null, id: card?.cardId || null};
  const list = printed.effects?.onPlay;
  const onPlay = Array.isArray(list) ? list.map(item => item?.op).filter(Boolean) : [];
  let effective = Number(printed.energy) || 0;
  try {
    effective = effectiveHandRequiredEnergy(packs, state, actor, printed, card);
  } catch { /* printed cost stays */ }
  const markers = [];
  if ((Number(printed.bp) || 0) >= 4000) markers.push('bp4000');
  else if ((Number(printed.bp) || 0) >= 3000) markers.push('bp3000');
  if (onPlay.length) markers.push('effect');
  if (printed.raidName) markers.push('raid');
  return {
    uid: card.uid, id: printed.id || card.cardId, name: printed.name || null,
    type: printed.type || null, color: printed.color || null,
    energy: Number(printed.energy) || 0, effective, ap: apCost(printed),
    gen: Number(printed.gen) || 0, bp: Number(printed.bp) || 0,
    onPlay, raid: printed.raidName || null, markers
  };
}
function publicId(packs, state, seat, uid) {
  if (!uid) return null;
  const view = universalPublicView(packs, state, seat);
  for (const player of view.players) {
    for (const zone of ['hand', 'front', 'energy', 'outside', 'removed']) {
      const found = (player[zone] || []).find(card => card?.uid === uid);
      if (found?.cardId) return found.cardId;
    }
  }
  const own = (state.players[seat].hand || []).find(card => card?.uid === uid);
  return own?.cardId || null;
}
function idleSignature(state, seat) {
  const mine = state.players[seat];
  const ids = zone => (zone || []).map(card => card ? card.uid : '').join(',');
  return [
    state.phase, state.turn, state.pending?.kind || '',
    (mine.apCards || []).filter(card => card?.ready).length,
    ids(mine.hand), ids(mine.front), ids(mine.energy)
  ].join('|');
}
function onFront(state, seat, uid) {
  return (state.players[seat].front || []).some(card => card?.uid === uid);
}
// A legal main-phase line that puts this known card on the front.
// Energy plays and the entry's own pending choices are allowed. A draw is not.
export function frontWitness(packs, origin, seat, targetUid) {
  const queue = [{state: origin, path: []}];
  const seen = new Set();
  let nodes = 0;
  while (queue.length && nodes < 300) {
    const item = queue.shift();
    nodes++;
    if (onFront(item.state, seat, targetUid)) return {ok: true, path: item.path, nodes};
    if (item.path.length >= 8 || item.state.status !== 'playing') continue;
    const actor = item.state.pending?.player ?? item.state.active;
    if (actor !== seat) continue;
    let legal = [];
    try { legal = legalUniversalActions(packs, item.state); } catch { continue; }
    const pending = !!item.state.pending;
    const allowed = [];
    for (const action of legal) {
      if (pending) allowed.push(action);
      else if (item.state.phase === 'main' && action.uid === targetUid &&
        ((action.type === 'play' && action.line === 'front') || action.type === 'raid')) allowed.unshift(action);
      else if (item.state.phase === 'main' && action.type === 'play' && action.line === 'energy') allowed.push(action);
    }
    for (const action of allowed) {
      let next;
      try { next = dispatchUniversalAction(packs, structuredClone(item.state), action, {actor}); }
      catch { continue; }
      const sig = idleSignature(next, seat) + '|' + item.path.length;
      if (seen.has(sig)) continue;
      seen.add(sig);
      const step = {state: next, path: item.path.concat(compact(action))};
      if (action.uid === targetUid && !pending) queue.unshift(step);
      else queue.push(step);
    }
  }
  return {ok: false, path: [], nodes};
}
function stageMatches(stage, action) {
  if (!stage || !action) return false;
  return stage.type === action.type && (stage.uid ?? null) === (action.uid ?? null) && (stage.line ?? null) === (action.line ?? null);
}
function layerOf(trace, legal, wanted, chosen) {
  const candidates = trace?.candidates || [];
  const unexecuted = trace?.unexecuted || [];
  const stages = trace?.stages || [];
  const row = [...candidates, ...unexecuted].find(item => same(item.action, wanted));
  const chosenRow = candidates.find(item => same(item.action, chosen));
  const searchStage = stages.find(item => item.stage === 'search');
  const returned = stages.find(item => item.stage === 'returned') || stages[stages.length - 1];
  const place = item => item ? [item.boundary || '', item.phase || '', item.pending || '', item.leaf || '', item.damageOpen ? 'open' : ''].join('/') : '';
  let layer = 'other';
  if (!legal.some(action => same(action, wanted))) layer = 'illegal';
  else if (!row) layer = 'not-in-roots';
  else if (row.executed === false) layer = 'not-expanded';
  else if (stageMatches(searchStage, wanted) && returned && !stageMatches(returned, wanted)) layer = 'preference';
  else if (row && chosenRow && place(row) !== place(chosenRow)) layer = 'different-stop';
  else if (row && chosenRow && Number.isFinite(row.search) && Number.isFinite(chosenRow.search) && row.search < chosenRow.search) layer = 'scored-lower';
  else if (row && chosenRow && Number.isFinite(row.search) && Number.isFinite(chosenRow.search) && row.search > chosenRow.search) layer = 'higher-not-chosen';
  else if (same(chosen, wanted)) layer = 'selected';
  const brief = item => item ? {
    type: item.action?.type || item.type || null,
    line: item.action?.line ?? item.line ?? null,
    uid: item.action?.uid ?? item.uid ?? null,
    boundary: item.boundary ?? null,
    search: Number.isFinite(item.search) ? item.search : null,
    executed: item.executed !== false,
    pending: item.pending || item.stopPending || null,
    phase: item.phase || null,
    damageOpen: !!item.damageOpen,
    nodes: item.nodes ?? null,
    cut: item.cut || null,
    stop: item.stopReason || null,
    develops: item.develops ?? null,
    leaf: [item.leafTurn ?? '', item.leafPendingPlayer ?? '', item.leafActive ?? '', item.leafSource ?? '', item.leafProgress ?? '', item.leafOwnTurns ?? ''].join('|')
  } : null;
  return {
    layer,
    chosen: compact(chosen),
    reason: trace?.reason || null,
    pool: [...candidates, ...unexecuted].map(brief),
    wanted: brief(row),
    chosenRow: brief(chosenRow),
    stages: stages.map(item => ({
      stage: item.stage, type: item.type || null, line: item.line || null, uid: item.uid ?? null,
      boundary: item.boundary ?? null, search: Number.isFinite(item.search) ? item.search : null
    }))
  };
}
function diagnose(packs, state, seat, factors, wanted) {
  const legal = legalUniversalActions(packs, state);
  resetAiV3Report();
  const chosen = chooseAiV3Action(packs, structuredClone(state), {
    actor: seat, ...BUDGET, plan: 'tree', meter: {dispatches: 0}, ...(factors ? {factors} : {})
  });
  return layerOf(lastAiV3Trace(), legal, wanted, chosen);
}
function handView(packs, state, seat) {
  const catalog = packOf(packs, seat).cards;
  const snap = visibleSnapshot(packs, state, seat);
  const cards = (state.players[seat].hand || []).map(card => {
    const brief = cardBrief(catalog, card, packs, state, seat);
    const payable = brief.effective <= (snap.energyByColor[brief.color] || 0) && brief.ap <= snap.apReady;
    return {...brief, payable};
  });
  return {snap, cards};
}
function chooseRecorded(packs, state, recorded, index) {
  const step = recorded[index];
  if (!step) return {done: true};
  const actor = state.pending?.player ?? state.active;
  const legal = legalUniversalActions(packs, state);
  const action = legal.find(item => same(item, step.action));
  if (!action || actor !== step.actor) return {error: 'replay', step: step.step, actor, expected: step.actor};
  return {action, actor, index: index + 1};
}
function chooseSearch(packs, state, seat, factors) {
  const actor = state.pending?.player ?? state.active;
  const legal = legalUniversalActions(packs, state);
  if (actor === seat) {
    const meter = {dispatches: 0};
    const action = chooseAiV3Action(packs, state, {
      actor, ...BUDGET, plan: 'tree', meter, ...(factors ? {factors} : {})
    });
    const trace = lastAiV3Trace();
    const nodes = Number.isFinite(trace?.nodesUsed) ? trace.nodesUsed : null;
    return {
      action: legal.find(item => same(item, action)) || null,
      actor, search: {nodes, dispatches: meter.dispatches, mismatch: nodes != null && legal.length > 1 && meter.dispatches !== nodes}
    };
  }
  const before = hardAiReport().nodes || 0;
  const action = chooseStrengthenedHardAction(packs, state, {nodes: BUDGET.nodes, ms: BUDGET.ms, seed: BUDGET.seed});
  return {action: legal.find(item => same(item, action)) || null, actor, hardNodes: Math.max(0, (hardAiReport().nodes || 0) - before)};
}
export function observeWindow(packs, origin, seat, startStep, startTurn, pull, factors) {
  let state = origin;
  let steps = startStep;
  let nextStart = null;
  let nextTurn = null;
  let mainOpen = null;
  let mainEnd = null;
  let attackOpen = null;
  let attackEnd = null;
  let ended = null;
  const known = new Set();
  const log = [];
  const entries = [];
  const misses = [];
  const search = {decisions: 0, mismatch: 0, maxNodes: 0};
  let error = null;
  const started = performance.now();
  while (state.status === 'playing' && steps < STEP_LIMIT) {
    const idle = !state.pending;
    if (!nextStart && state.turn > startTurn && state.active === seat && state.phase === 'start') {
      nextStart = handView(packs, state, seat);
      nextTurn = state.turn;
      for (const card of nextStart.cards) known.add(card.uid);
    }
    if (nextStart && !mainOpen && state.turn === nextTurn && state.phase === 'main' && idle) mainOpen = handView(packs, state, seat);
    if (mainOpen && !mainEnd && idle && (state.phase === 'attack' || state.turn !== nextTurn)) mainEnd = visibleSnapshot(packs, state, seat);
    if (mainEnd && !attackOpen && state.turn === nextTurn && state.phase === 'attack' && idle && state.active === seat) {
      const legal = legalUniversalActions(packs, state);
      attackOpen = {attacks: legal.filter(action => action.type === 'attack').map(action => action.uid)};
    }
    if (attackOpen && !attackEnd && (state.phase !== 'attack' || state.turn !== nextTurn)) attackEnd = visibleSnapshot(packs, state, seat);
    if (attackEnd || (nextStart && state.status !== 'playing')) break;
    const actor = state.pending?.player ?? state.active;
    const legal = legalUniversalActions(packs, state);
    const inMain = nextStart && state.turn === nextTurn && state.phase === 'main';
    let witness = null;
    if (inMain && idle && actor === seat) {
      const catalog = packOf(packs, seat).cards;
      const openers = [];
      for (const card of state.players[seat].hand || []) {
        const brief = cardBrief(catalog, card, packs, state, seat);
        brief.knownAtNextStart = known.has(card.uid);
        if (!brief.markers?.length) continue;
        const fronts = legal.filter(action => action.uid === card.uid && ((action.type === 'play' && action.line === 'front') || action.type === 'raid'));
        if (fronts.length) {
          for (const front of fronts) openers.push({uid: card.uid, path: [compact(front)], nodes: 0, immediate: true, card: brief});
        }
      }
      witness = openers;
    }
    const picked = pull(state, steps);
    if (picked?.error) { error = picked.error; break; }
    if (picked?.done) break;
    const exact = picked.action;
    if (!exact) { error = 'illegal'; break; }
    if (picked.search) {
      search.decisions++;
      if (picked.search.nodes != null) search.maxNodes = Math.max(search.maxNodes, picked.search.nodes);
      if (picked.search.mismatch) search.mismatch++;
    }
    const playedMarker = Array.isArray(witness) && witness.some(item => item.immediate && item.uid === exact.uid && (exact.type === 'raid' || exact.line === 'front'));
    const immediate = Array.isArray(witness) ? witness.filter(item => item.immediate && !(playedMarker && item.uid === exact.uid)) : [];
    if (immediate.length && !playedMarker) {
      const primary = immediate.slice().sort((a, b) => (b.card.bp - a.card.bp) || (a.card.effective - b.card.effective) || ((b.path[0].type === 'raid' ? 1 : 0) - (a.path[0].type === 'raid' ? 1 : 0)))[0];
      const wanted = legal.find(action => same(compact(action), primary.path[0]));
      misses.push({
        step: steps, card: primary.card, immediate: true, knownAtNextStart: primary.card.knownAtNextStart,
        witness: primary.path, taken: compact(exact),
        alternatives: [...new Set(immediate.map(item => item.card.id + (item.path[0].type === 'raid' ? ':raid' : ':front')))],
        held: wanted ? structuredClone(state) : null,
        wantedAction: wanted || null,
        factors
      });
    }
    if (nextStart && !attackEnd && (state.turn === nextTurn || (attackOpen && !attackEnd))) {
      const id = publicId(packs, state, seat, exact.uid);
      const catalog = packOf(packs, actor).cards;
      log.push({
        step: steps, actor, phase: state.phase, pending: state.pending?.kind || null,
        ...compact(exact), ...(id ? {cardId: catalog?.[id]?.id || id} : {})
      });
    }
    const beforeFront = new Set((state.players[seat].front || []).filter(Boolean).map(card => card.uid));
    try { state = dispatchUniversalAction(packs, state, exact, {actor: picked.actor}); }
    catch (failure) { error = failure.message; break; }
    steps++;
    if (inMain && !state.pending) {
      for (const card of state.players[seat].front || []) {
        if (!card || beforeFront.has(card.uid) || entries.some(item => item.uid === card.uid)) continue;
        const printed = packOf(packs, seat).cards[card.cardId];
        entries.push({
          uid: card.uid, id: printed?.id || card.cardId, bp: Number(printed?.bp) || 0,
          ready: card.ready !== false, raid: log.some(item => item.type === 'raid' && item.uid === card.uid),
          knownAtNextStart: known.has(card.uid)
        });
      }
    }
  }
  if (state.status !== 'playing') {
    ended = {reason: state.endReason || state.status, winner: state.winner, life: state.players.map(player => player.life.length), steps};
  }
  const atEnd = new Map((mainEnd?.front || []).filter(Boolean).map(card => [card.uid, card]));
  const seenEntry = new Set(entries.map(item => item.uid));
  const energyRaids = [];
  for (const item of log) {
    if (item.actor !== seat) continue;
    const frontPlay = item.type === 'play' && item.line === 'front';
    const raid = item.type === 'raid';
    const moved = item.type === 'move';
    if (!frontPlay && !raid && !moved) continue;
    const live = atEnd.get(item.uid);
    if (!live) {
      if (raid && !energyRaids.some(row => row.uid === item.uid)) energyRaids.push({uid: item.uid, id: item.cardId || null, baseUid: item.baseUid || null});
      continue;
    }
    if (seenEntry.has(item.uid)) {
      const have = entries.find(row => row.uid === item.uid);
      if (have) have.moved = have.moved || moved;
      continue;
    }
    entries.push({
      uid: item.uid, id: live.id || item.cardId || null, bp: live.bp || 0, bpLive: live.bpLive ?? null,
      ready: live.ready !== false, raid, moved, knownAtNextStart: known.has(item.uid)
    });
    seenEntry.add(item.uid);
  }
  for (const entry of entries) {
    entry.canAttack = (attackOpen?.attacks || []).includes(entry.uid);
    entry.attacked = log.some(item => item.type === 'attack' && item.uid === entry.uid);
  }
  if (!error && !ended && !attackEnd) error = nextStart ? 'window-open' : 'no-next-turn';
  const best = misses.slice().sort((a, b) => (b.card.bp - a.card.bp) || (a.card.effective - b.card.effective) || ((b.witness[0]?.type === 'raid' ? 1 : 0) - (a.witness[0]?.type === 'raid' ? 1 : 0)) || (b.step - a.step))[0];
  if (best?.wantedAction) best.diagnosis = diagnose(packs, best.held, seat, best.factors, best.wantedAction);
  for (const miss of misses) {
    if (!miss.diagnosis) miss.diagnosis = {layer: 'not-diagnosed', chosen: miss.taken, reason: null, wanted: null, chosenRow: null, stages: []};
    delete miss.held;
    delete miss.wantedAction;
    delete miss.factors;
  }
  return {
    ok: !error, error, steps, wallMs: Math.round(performance.now() - started), search,
    ended, nextStart: nextStart ? {
      turn: nextTurn, life: nextStart.snap.life, apReady: nextStart.snap.apReady,
      energyByColor: nextStart.snap.energyByColor, energyTotal: nextStart.snap.energyTotal,
      front: nextStart.snap.front.map(card => card && ({id: card.id, uid: card.uid, ready: card.ready, bpLive: card.bpLive})),
      oppFront: nextStart.snap.oppFront.map(card => card && ({id: card.id, uid: card.uid, ready: card.ready, bpLive: card.bpLive})),
      hand: nextStart.cards
    } : null,
    mainOpen: mainOpen ? {apReady: mainOpen.snap.apReady, energyByColor: mainOpen.snap.energyByColor, hand: mainOpen.cards.map(card => card.id)} : null,
    entries, energyRaids, attackOpen, attackClosed: !!attackEnd, log, misses
  };
}
function factorsFor(name) {
  return name.endsWith('-on') ? FACTORS_ON : null;
}
function firstAction(name) {
  return name.startsWith('draw') ? 'extraDraw' : 'next';
}
export function observeFlip(deck, flip, forkRow) {
  const base = replayPrefix(deck, flip.baseline, flip.diff);
  if (!base.ok) return {key: flip.key, ok: false, error: base.error};
  const branches = {};
  for (const name of ['draw-off', 'draw-on', 'pass-off', 'pass-on']) {
    const recorded = forkRow.branches[name];
    const factors = factorsFor(name);
    const source = recorded.replay.baseline.matched ? flip.baseline : recorded.replay.candidate.matched ? flip.candidate : null;
    const begun = performance.now();
    let window;
    if (source) {
      const actions = source.actions.slice(flip.diff);
      let index = 0;
      window = observeWindow(base.packs, structuredClone(base.state), flip.seat, flip.diff, base.state.turn, state => {
        const picked = chooseRecorded(base.packs, state, actions, index);
        if (picked.index != null) index = picked.index;
        return picked;
      }, factors);
      window.source = recorded.replay.baseline.matched ? 'baseline-replay' : 'candidate-replay';
    } else {
      let forced = false;
      window = observeWindow(base.packs, structuredClone(base.state), flip.seat, flip.diff, base.state.turn, state => {
        if (!forced) {
          forced = true;
          const legal = legalUniversalActions(base.packs, state);
          const action = legal.find(item => item.type === firstAction(name));
          return action ? {action, actor: flip.seat} : {error: 'forced'};
        }
        return chooseSearch(base.packs, state, flip.seat, factors);
      }, factors);
      window.source = 'search';
    }
    window.cited = {
      challengerWon: recorded.challengerWon, steps: recorded.steps, endReason: recorded.endReason || null
    };
    window.wallMs = Math.round(performance.now() - begun);
    branches[name] = window;
    console.error('window', flip.key, name, window.source, window.attackClosed, window.ended?.reason || '', window.wallMs);
  }
  return {ok: true, key: flip.key, result: flip.result, diff: flip.diff, branches};
}
function select(flips) {
  const only = process.env.OBS_ONLY;
  if (only != null && only !== '') return [flips[Number(only)]].filter(Boolean);
  const part = process.env.OBS_PART;
  if (!part) return flips;
  const [index, count] = part.split('/').map(Number);
  return flips.filter((_, item) => item % count === index);
}
export function main() {
  const {baseline, candidate} = loadAudits();
  const flips = select(listFlips(baseline, candidate));
  const decks = deckById();
  const fork = JSON.parse(readFileSync(FORK_PATH, 'utf8'));
  const byKey = new Map(fork.rows.map(row => [row.key, row]));
  const rows = [];
  for (const flip of flips) {
    console.error('flip', flip.key);
    rows.push(observeFlip(decks.get(flip.title), flip, byKey.get(flip.key)));
  }
  const report = {
    base: 'f21c94fc',
    cited: FORK_PATH,
    note: 'Windows stop at the next own attack phase. Cited wins are the earlier full games, not a new sample.',
    settings: {opponent: 'hard-search-2', nodes: 48, searchSeed: 1, ms: 1000000000, actorDecisions: 2, stepLimit: STEP_LIMIT},
    rows
  };
  const out = process.env.OBS_OUT;
  if (out) writeFileSync(out, JSON.stringify(report, null, 2));
  else process.stdout.write(JSON.stringify(report) + '\n');
  const bad = rows.filter(row => !row.ok || Object.values(row.branches).some(branch => !branch.ok || branch.search.mismatch));
  if (bad.length) {
    console.error('window failures', bad.map(row => row.key));
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
