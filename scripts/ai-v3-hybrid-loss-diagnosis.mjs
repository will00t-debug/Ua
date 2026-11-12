#!/usr/bin/env node
// Diagnostic replays of the locked 8800 hybrid-versus-v3 cells.
// The official 200-game summary is read and never rewritten. A replay uses
// the same policies and the 48-node / 40ms clock, so it is a new playout,
// not the original game. Hidden deck order, the opponent's hand and life
// cards are not recorded.
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action, lastAiV3Trace, resetAiV3Report, AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {applySharedOpening, cloneMatch, newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {legalUniversalActions, dispatchUniversalAction, universalBp, universalEnergyByColor, universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {chooseHybridMainAction, hybridLane, hybridSource, lastHybridRoute, HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {jobsFromLock, loadLock} from './ai-v3-hybrid-vs-v3.mjs';

const SUMMARY_URL = new URL('../audit/ai-v3-hybrid-vs-v3-8800-summary.json', import.meta.url);
const DIAGNOSIS_URL = new URL('../audit/ai-v3-hybrid-vs-v3-8800-loss-diagnosis.json', import.meta.url);
const OUT = process.env.AI_V3_OUT || '/tmp/ai-v3-hybrid-loss-dx';
const STEPS = Number(process.env.AI_V3_STEPS || 400);
const BUDGET = {nodes: 48, ms: 40, seed: 1};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function selectJobs(jobs, rows) {
 const lossSeeds = new Set();
 for (const row of rows) {
  if (row.hybridWon === false) lossSeeds.add(`${row.deck}|${row.seed}`);
 }
 return jobs.filter(job => job.deck === 'white-sword' || lossSeeds.has(`${job.deck}|${job.seed}`));
}

export function lethalPassKind(shot) {
 if (!shot || shot.kind !== 'block-lethal') return null;
 const attack = shot.attackerBp || 0;
 const fronts = shot.front || [];
 const top = shot.trace?.top || [];
 const pass = top.find(row => row.type === 'chooseBlock' && row.bp == null);
 const block = top.find(row => row.type === 'chooseBlock' && row.bp != null);
 if (!pass || !block || !(pass.score > block.score)) return 'unscored';
 if (fronts.some(card => card.ready && card.bp > attack)) return 'higher-bp';
 if (fronts.some(card => card.ready)) return 'not-higher';
 return 'no-ready';
}

export function classifyNotes(notes) {
 if (!notes || notes.finished !== true || notes.illegal) {
  return {primary: null, evidence: false, reason: 'unfinished', labels: []};
 }
 const flags = notes.flags || [];
 if (!flags.length) return {primary: 8, evidence: false, reason: 'no-single-step', labels: []};
 const rank = {7: 0, 6: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6};
 const severity = { 'block-lethal': 0, 'missed-kill': 0, 'energy-color': 1, 'beater-energy': 2, 'late-front': 3, 'skipped-raid': 4, 'ap-draw': 5, 'block-beater': 6 };
 const sorted = [...flags].sort((a, b) => a.ownTurn - b.ownTurn
  || (severity[a.kind] ?? 9) - (severity[b.kind] ?? 9)
  || (rank[a.id] ?? 9) - (rank[b.id] ?? 9)
  || a.step - b.step);
 return {primary: sorted[0].id, evidence: true, reason: 'decision-pattern', labels: [...new Set(flags.map(flag => flag.id))]};
}

function readyAp(player) {
 return (player?.apCards || []).filter(card => card && card.ready).length;
}

function bodyOf(state, uid) {
 if (!uid) return null;
 for (const player of state.players || []) {
  for (const zone of ['hand', 'front', 'energy', 'outside', 'removed']) {
   const card = (player[zone] || []).find(item => item && item.uid === uid);
   if (card) return card;
  }
 }
 return null;
}

function printedOf(packs, card) {
 if (!card?.uid || !card.cardId) return null;
 const owner = Number(String(card.uid).split('-')[0]);
 return packs[owner]?.cards?.[card.cardId] || null;
}

function bpOf(packs, state, card) {
 if (!card) return 0;
 try {
  const value = universalBp(packs, state, card);
  return Number.isFinite(value) ? value : 0;
 } catch {
  return Number(printedOf(packs, card)?.bp) || 0;
 }
}

function actionBrief(packs, state, action) {
 if (!action) return null;
 const card = action.uid ? bodyOf(state, action.uid) : null;
 const printed = printedOf(packs, card);
 return {
  type: action.type || null,
  line: action.line || null,
  mode: action.mode || null,
  bp: card ? bpOf(packs, state, card) : (Number(printed?.bp) || null),
  color: printed?.color || null,
  cost: printed ? Number(printed.energy) || 0 : null,
  gen: printed ? Number(printed.gen) || 0 : null,
  id: printed?.id || null,
  name: printed?.name || null
 };
}

function traceBrief(trace, packs, state) {
 if (!trace) return null;
 const rows = Array.isArray(trace.candidates) ? trace.candidates : [];
 return {
  reason: trace.reason || null,
  nodesUsed: Number.isFinite(trace.nodesUsed) ? trace.nodesUsed : null,
  rootCut: trace.rootCut === true,
  rootCompared: Number.isFinite(trace.rootCompared) ? trace.rootCompared : null,
  rootCandidates: Number.isFinite(trace.rootCandidates) ? trace.rootCandidates : null,
  top: rows.slice(0, 3).map(row => ({
   ...actionBrief(packs, state, row.action),
   score: Number.isFinite(row.score) ? Math.round(row.score * 10) / 10
    : (Number.isFinite(row.search) ? row.search : null)
  }))
 };
}

function frontBodies(packs, state, seat) {
 return (state.players[seat].front || []).filter(Boolean).map(card => ({
  bp: bpOf(packs, state, card),
  ready: card.ready === true
 }));
}

function colorsOf(packs, state, seat) {
 try { return universalEnergyByColor(packs, state, seat) || {}; }
 catch { return {}; }
}

function emptySlot(slots) {
 return (slots || []).some(slot => !slot);
}

function chooseFor(packs, state, hybridSeat) {
 const actor = state.pending?.player ?? state.active;
 const lane = hybridLane(state);
 const legal = legalUniversalActions(packs, state);
 let raw = null;
 let trace = null;
 let source = null;
 const problems = [];
 if (actor === hybridSeat) {
  raw = chooseHybridMainAction(packs, state, {actor, ...BUDGET});
  const route = lastHybridRoute();
  source = route?.source || null;
  trace = source === 'hard' ? lastHardAiTrace() : lastAiV3Trace();
  if (!route || route.policy !== HYBRID_MAIN_POLICY || route.lane !== lane || source !== hybridSource(lane)
   || route.nodes !== 48 || route.ms !== 40 || route.actor !== actor) problems.push('hybrid-route');
 } else {
  resetAiV3Report();
  raw = chooseAiV3Action(packs, state, {actor, nodes: 48, ms: 40, seed: 1, worlds: 1});
  trace = lastAiV3Trace();
  source = 'v3';
  if ((trace?.policy || null) !== AI_V3_POLICY) problems.push('v3-policy');
 }
 const action = legal.find(item => same(item, raw)) || null;
 return {actor, lane, source, action, legal, trace, problems};
}

function diagnoseGame(deck, job, original) {
 const packs = [deck.pack, deck.pack];
 const opened = applySharedOpening(packs, newComparedMatch(
  packs, [deck.counts, deck.counts], job.seed, job.first));
 let cursor = cloneMatch(opened.state);
 const flags = [];
 const snapshots = [];
 const turns = [];
 const handoffs = [];
 const exceptions = [];
 let illegal = 0;
 let steps = 0;
 let abandoned = 0;
 let phaseErrors = 0;
 let current = null;
 let sawFrontOption = false;
 let lastHard = null;
 const seat = job.hybridSeat;

 function seen(kind) {
  return flags.some(flag => flag.kind === kind);
 }
 function addFlag(id, kind, snapshot) {
  if (seen(kind)) return;
  flags.push({id, kind, ownTurn: current?.ownTurn || 0, step: steps});
  if (snapshot && snapshots.length < 3) snapshots.push({kind, step: steps, ownTurn: current?.ownTurn || 0, ...snapshot});
 }

 while (cursor.status === 'playing' && steps < STEPS) {
  const actor = cursor.pending?.player ?? cursor.active;
  if (cursor.phase === 'start' && !cursor.pending && actor === seat && !current) {
   current = {
    ownTurn: turns.length + 1,
    turn: cursor.turn,
    apReady: readyAp(cursor.players[seat]),
    lifeStart: cursor.players[seat].life.length,
    oppStart: cursor.players[1 - seat].life.length,
    energyColorsOffered: new Set(),
    playedEnergyColors: [],
    plays: 0, raids: 0, energyPlays: 0, frontPlays: 0, attacks: 0,
    extraDraw: false, skippedRaid: 0
   };
  }
  let picked;
  try {
   picked = chooseFor(packs, cursor, seat);
  } catch (error) {
   exceptions.push({step: steps, message: error?.message || String(error)});
   illegal++;
   break;
  }
  if (picked.problems.length) phaseErrors += picked.problems.length;
  if (!picked.action) {
   illegal++;
   exceptions.push({step: steps, message: 'chosen action is not in the fresh legal list'});
   break;
  }
  if (actor === seat) {
   const brief = actionBrief(packs, cursor, picked.action);
   const fronts = frontBodies(packs, cursor, seat);
   const colors = colorsOf(packs, cursor, seat);
   if (!cursor.pending && cursor.phase === 'main') {
    const raidHigh = picked.legal.some(action => action.type === 'raid' && action.line === 'front'
     && (printedOf(packs, bodyOf(cursor, action.uid))?.bp || 0) >= 4000);
    const frontOption = picked.legal.some(action => (action.type === 'play' && action.line === 'front')
     || (action.type === 'raid' && action.line === 'front'));
    if (frontOption) sawFrontOption = true;
    for (const action of picked.legal) {
     if (action.type === 'play' && action.line === 'energy') {
      const color = printedOf(packs, bodyOf(cursor, action.uid))?.color;
      if (color && current) current.energyColorsOffered.add(color);
     }
    }
    if (picked.action.type === 'play' && picked.action.line === 'energy' && current) {
     current.energyPlays++;
     if (brief?.color) current.playedEnergyColors.push(brief.color);
     const sameFront = picked.legal.some(action => action.type === 'play' && action.line === 'front' && action.uid === picked.action.uid);
     const weak = !fronts.some(card => card.bp >= 3000);
     if (sameFront && (brief?.bp || 0) >= 4000 && weak) {
      addFlag(2, 'beater-energy', boardShot(packs, cursor, seat, brief, picked, colors, fronts));
     }
    }
    if (picked.action.type === 'play' && picked.action.line === 'front' && current) current.frontPlays++;
    if (picked.action.type === 'raid' && current) current.raids++;
    const skipping = picked.action.type === 'next' || (picked.action.type === 'play' && picked.action.line === 'energy');
    const frontWeak = !fronts.some(card => card.bp >= 4000);
    if (current && current.ownTurn <= 4 && skipping && raidHigh && frontWeak) {
     current.skippedRaid++;
     addFlag(4, 'skipped-raid', boardShot(packs, cursor, seat, brief, picked, colors, fronts));
    }
   }
   if (!cursor.pending && cursor.phase === 'start' && picked.action.type === 'extraDraw' && current) {
    current.extraDraw = true;
    if (current.apReady === 1) {
     const payable = (cursor.players[seat].hand || []).some(card => {
      const printed = printedOf(packs, card);
      if (!printed || printed.type !== 'character') return false;
      return (Number(printed.ap) || 0) >= 1 && (Number(printed.energy) || 0) <= (colors[printed.color] || 0);
     });
     const room = emptySlot(cursor.players[seat].front) || emptySlot(cursor.players[seat].energy);
     if (payable && room) addFlag(5, 'ap-draw', boardShot(packs, cursor, seat, brief, picked, colors, fronts));
    }
   }
   if (cursor.pending?.kind === 'block') {
    const attacker = bodyOf(cursor, cursor.pending.attackerUid);
    const attackerBp = bpOf(packs, cursor, attacker);
    let damage = 1;
    try {
     const value = universalAttackDamage(packs, cursor, attacker);
     if (Number.isFinite(value) && value > 0) damage = value;
    } catch { /* printed damage stays 1 */ }
    const life = cursor.players[seat].life.length;
    const blockers = picked.legal.filter(action => action.type === 'chooseBlock' && action.uid);
    const winning = blockers.some(action => bpOf(packs, cursor, bodyOf(cursor, action.uid)) > attackerBp);
    const passing = picked.action.uid == null;
    if (passing && blockers.length && life - damage <= 0) {
     addFlag(6, 'block-lethal', boardShot(packs, cursor, seat, brief, picked, colors, fronts, {attackerBp, damage, life}));
    } else if (!passing && (brief?.bp || 0) >= 4000 && (brief?.bp || 0) <= attackerBp && life >= 4
     && picked.legal.some(action => action.type === 'chooseBlock' && action.uid == null)) {
     addFlag(6, 'block-beater', boardShot(packs, cursor, seat, brief, picked, colors, fronts, {attackerBp, damage, life}));
    } else if (passing && winning && life <= 2) {
     addFlag(6, 'block-lethal', boardShot(packs, cursor, seat, brief, picked, colors, fronts, {attackerBp, damage, life, winning: true}));
    }
   }
   if (picked.source === 'v3' && cursor.pending && lastHard && steps - lastHard.step <= 5 && handoffs.length < 8) {
    handoffs.push({
     pending: cursor.pending.kind || null,
     after: lastHard.type,
     action: brief?.type || null,
     line: brief?.line || null,
     mode: brief?.mode || null
    });
   }
   if (picked.source === 'hard' && (picked.action.type === 'play' || picked.action.type === 'raid')) {
    lastHard = {step: steps, type: picked.action.type};
   }
   if (picked.action.type === 'attack' && current) current.attacks++;
   const wins = killLines(picked.source, picked.trace, picked.legal);
   if (wins.length > 0 && !wins.some(row => same(row.action, picked.action))) {
    abandoned++;
    addFlag(7, 'missed-kill', boardShot(packs, cursor, seat, brief, picked, colors, fronts, {wins: wins.length}));
   }
  }
  try {
   cursor = dispatchUniversalAction(packs, cursor, picked.action, {actor: picked.actor});
  } catch (error) {
   exceptions.push({step: steps, message: error?.message || String(error)});
   illegal++;
   break;
  }
  const after = cursor.status === 'playing' ? (cursor.pending?.player ?? cursor.active) : null;
  if (current && (after !== seat || cursor.status !== 'playing')) closeTurn();
  steps++;
 }
 if (current) closeTurn();

 function closeTurn() {
  const fronts = frontBodies(packs, cursor, seat);
  const colors = colorsOf(packs, cursor, seat);
  const energyTotal = Object.values(colors).reduce((sum, value) => sum + value, 0);
  if (current.ownTurn <= 3) {
   const stranded = (cursor.players[seat].hand || []).find(card => {
    const printed = printedOf(packs, card);
    if (!printed || printed.type !== 'character') return false;
    const cost = Number(printed.energy) || 0;
    const have = colors[printed.color] || 0;
    return cost > have && cost <= have + 1 && current.energyColorsOffered.has(printed.color)
     && current.playedEnergyColors.some(color => color !== printed.color);
   });
   if (stranded) {
    addFlag(1, 'energy-color', {
     turn: cursor.turn,
     life: cursor.players.map(player => player.life.length),
     stranded: stranded.cardId,
     played: [...current.playedEnergyColors],
     colors
    });
   }
  }
  if (current.ownTurn === 2 && fronts.length === 0 && sawFrontOption) {
   addFlag(3, 'late-front', {
    turn: cursor.turn,
    life: cursor.players.map(player => player.life.length),
    energyTotal,
    colors
   });
  }
  turns.push({
   ownTurn: current.ownTurn,
   turn: current.turn,
   apReady: current.apReady,
   apLeft: readyAp(cursor.players[seat]),
   lifeStart: current.lifeStart,
   lifeEnd: cursor.players[seat].life.length,
   oppStart: current.oppStart,
   oppEnd: cursor.players[1 - seat].life.length,
   frontCount: fronts.length,
   front4000: fronts.filter(card => card.bp >= 4000).length,
   frontMax: fronts.reduce((max, card) => Math.max(max, card.bp), 0),
   energyTotal,
   distinctColors: Object.values(colors).filter(value => value > 0).length,
   energyPlays: current.energyPlays,
   frontPlays: current.frontPlays,
   raids: current.raids,
   attacks: current.attacks,
   extraDraw: current.extraDraw,
   skippedRaid: current.skippedRaid
  });
  current = null;
 }

 function boardShot(packs, state, seat, chosen, picked, colors, fronts, extra) {
  return {
   turn: state.turn,
   phase: state.pending?.kind || state.phase,
   source: picked.source,
   life: state.players.map(player => player.life.length),
   apReady: readyAp(state.players[seat]),
   colors,
   front: fronts,
   chosen,
   trace: traceBrief(picked.trace, packs, state),
   ...extra
  };
 }

 const finished = cursor.status === 'finished' && illegal === 0 && !exceptions.length;
 const winner = finished ? cursor.winner : null;
 const at = n => turns.find(turn => turn.ownTurn === n) || null;
 const first = pred => turns.find(pred)?.ownTurn ?? null;
 const t2 = at(2);
 const t4 = at(4);
 const notes = {
  finished, illegal, abandoned, phaseErrors,
  flags, snapshots, handoffs, turns,
  early: {
   frontCount: [at(1)?.frontCount ?? null, t2?.frontCount ?? null],
   front4000: [at(1)?.front4000 ?? null, t2?.front4000 ?? null],
   frontMax: [at(1)?.frontMax ?? null, t2?.frontMax ?? null],
   energyTotal: [at(1)?.energyTotal ?? null, t2?.energyTotal ?? null],
   distinctColors: [at(1)?.distinctColors ?? null, t2?.distinctColors ?? null],
   apLeft: turns.slice(0, 4).map(turn => turn.apLeft),
   firstAttack: first(turn => turn.attacks > 0),
   firstConnect: first(turn => turn.oppEnd < turn.oppStart),
   firstRaid: first(turn => turn.raids > 0),
   firstFront: first(turn => turn.frontCount > 0),
   energy2: first(turn => turn.energyTotal >= 2),
   energy3: first(turn => turn.energyTotal >= 3),
   lifeSelfAfter2: t2?.lifeEnd ?? null,
   lifeSelfAfter4: t4?.lifeEnd ?? null,
   lifeOppAfter2: t2?.oppEnd ?? null,
   lifeOppAfter4: t4?.oppEnd ?? null,
   raidsBy2: turns.slice(0, 2).reduce((sum, turn) => sum + turn.raids, 0),
   energyPlaysBy2: turns.slice(0, 2).reduce((sum, turn) => sum + turn.energyPlays, 0),
   frontPlaysBy2: turns.slice(0, 2).reduce((sum, turn) => sum + turn.frontPlays, 0),
   extraDrawBy3: turns.slice(0, 3).filter(turn => turn.extraDraw).length,
   skippedRaidBy4: turns.slice(0, 4).reduce((sum, turn) => sum + turn.skippedRaid, 0)
  }
 };
 return {
  deck: job.deck, seed: job.seed, first: job.first,
  hybridSeat: job.hybridSeat, hybridIsFirst: job.hybridIsFirst,
  opening: opened.choices,
  openingMatches: same(opened.choices, original.opening),
  originalHybridWon: original.hybridWon,
  originalLife: original.life,
  originalEnd: original.endReason,
  replayFinished: finished,
  replayWinner: winner,
  replayHybridWon: finished && winner === seat,
  replayDiverged: !(finished && (winner === seat) === original.hybridWon),
  endReason: cursor.endReason || null,
  life: cursor.players.map(player => player.life.length),
  steps, illegal, exceptions, hitStepCap: steps >= STEPS && cursor.status === 'playing',
  class: classifyNotes(notes),
  ...notes
 };
}

function killLines(source, trace, legal) {
 if (source === 'v3') {
  const rows = trace?.candidates?.length ? trace.candidates : (trace?.compared || []);
  return rows.filter(row => row?.executed !== false && row.boundary === 'terminal' && row.search >= 90000
   && legal.some(action => same(action, row.action)));
 }
 return (trace?.candidates || []).filter(row => row?.score >= 50000
  && legal.some(action => same(action, row.action)));
}

function mean(values) {
 const finite = values.filter(value => Number.isFinite(value));
 return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function round(value) {
 return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function groupKey(game) {
 return `${game.deck}|${game.hybridIsFirst ? 'first' : 'second'}|${game.originalHybridWon ? 'W' : 'L'}`;
}

function earlyMeans(games) {
 const field = (name, index) => mean(games.map(game => {
  const value = game.early[name];
  return Array.isArray(value) ? value[index] : value;
 }));
 return {
  n: games.length,
  front1: round(field('frontCount', 0)),
  front2: round(field('frontCount', 1)),
  front4000Turn2: round(field('front4000', 1)),
  frontMax2: round(field('frontMax', 1)),
  energy1: round(field('energyTotal', 0)),
  energy2: round(field('energyTotal', 1)),
  colors2: round(field('distinctColors', 1)),
  apLeft1: round(field('apLeft', 0)),
  apLeft2: round(field('apLeft', 1)),
  firstAttack: round(field('firstAttack')),
  firstConnect: round(field('firstConnect')),
  firstRaid: round(field('firstRaid')),
  firstFront: round(field('firstFront')),
  energyReach2: round(field('energy2')),
  energyReach3: round(field('energy3')),
  lifeSelf2: round(field('lifeSelfAfter2')),
  lifeOpp2: round(field('lifeOppAfter2')),
  lifeSelf4: round(field('lifeSelfAfter4')),
  raidsBy2: round(field('raidsBy2')),
  energyPlaysBy2: round(field('energyPlaysBy2')),
  frontPlaysBy2: round(field('frontPlaysBy2')),
  extraDrawBy3: round(field('extraDrawBy3')),
  skippedRaidBy4: round(field('skippedRaidBy4'))
 };
}

function originalComparison(rows) {
 const buckets = new Map();
 for (const row of rows) {
  const key = `${row.deck}|${row.hybridIsFirst ? 'first' : 'second'}|${row.hybridWon ? 'W' : 'L'}`;
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(row);
 }
 const out = {};
 for (const [key, list] of buckets) {
  const avg = field => mean(list.map(row => row.hybrid[field]));
  out[key] = {
   n: list.length,
   attacks: round(avg('attacks')),
   connecting: round(avg('connecting')),
   raids: round(avg('raids')),
   frontPlays: round(avg('frontPlays')),
   energyPlays: round(avg('energyPlays')),
   apLeft: round(avg('apLeft')),
   apUsed: round(avg('apUsed')),
   turns: round(avg('turns')),
   ownLife: round(mean(list.map(row => row.life[row.hybridSeat]))),
   oppLife: round(mean(list.map(row => row.life[1 - row.hybridSeat])))
  };
 }
 return out;
}

function tally(games, pred) {
 const flags = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0};
 const primary = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0};
 let evidence = 0;
 let diverged = 0;
 let unfinished = 0;
 let alsoLost = 0;
 for (const game of games.filter(pred)) {
  if (!game.replayFinished || game.illegal) { unfinished++; continue; }
  if (game.replayDiverged) { diverged++; continue; }
  alsoLost++;
  const ids = new Set(game.flags.map(flag => flag.id));
  if (!ids.size) primary[8]++;
  else {
   evidence++;
   primary[game.class.primary] = (primary[game.class.primary] || 0) + 1;
  }
  for (const id of ids) flags[id]++;
  if (!ids.size) flags[8]++;
 }
 return {n: games.filter(pred).length, alsoLost, diverged, unfinished, evidence, primary, anyFlag: flags};
}

export function buildDiagnosis(games, summary) {
 const losses = games.filter(game => game.originalHybridWon === false);
 const representatives = [];
 const wanted = ['beater-energy', 'skipped-raid', 'ap-draw', 'energy-color', 'late-front', 'block-lethal', 'block-beater', 'missed-kill'];
 for (const kind of wanted) {
  const found = losses.find(game => !game.replayDiverged && game.replayHybridWon === false
   && game.deck === 'white-sword' && game.hybridIsFirst === false
   && game.snapshots.some(shot => shot.kind === kind));
  const fallback = losses.find(game => !game.replayDiverged && game.replayHybridWon === false
   && game.snapshots.some(shot => shot.kind === kind));
  const game = found || fallback;
  if (!game) continue;
  representatives.push({
   deck: game.deck, seed: game.seed, first: game.first, hybridSeat: game.hybridSeat,
   hybridIsFirst: game.hybridIsFirst, originalLife: game.originalLife, replayLife: game.life,
   snapshot: game.snapshots.find(shot => shot.kind === kind)
  });
 }
 const noFlag = losses.find(game => !game.replayDiverged && game.deck === 'white-sword'
  && game.hybridIsFirst === false && !(game.flags || []).length);
 const reading = readLosses(games);
 return {
  reading,
  dataGap: 'The official summary stores per-game totals only. Step state was not kept, so none of these replays is the original game.',
  officialRecord: summary.record,
  officialNotRecomputed: true,
  replayGames: games.length,
  replayAlsoLost: losses.filter(game => game.replayFinished && game.replayHybridWon === false).length,
  replayDiverged: losses.filter(game => game.replayDiverged).length,
  openingMismatches: games.filter(game => game.openingMatches === false).length,
  illegal: games.reduce((sum, game) => sum + (game.illegal || 0), 0),
  unfinished: games.filter(game => !game.replayFinished).length,
  originalComparison: originalComparison(summary.gameRows),
  replayEarlyByOriginal: Object.fromEntries([...new Set(games.map(groupKey))].sort()
   .map(key => [key, earlyMeans(games.filter(game => groupKey(game) === key))])),
  classification: {
   allLosses: tally(games, game => game.originalHybridWon === false),
   whiteSecond: tally(games, game => game.originalHybridWon === false && game.deck === 'white-sword' && !game.hybridIsFirst),
   second: tally(games, game => game.originalHybridWon === false && !game.hybridIsFirst),
   first: tally(games, game => game.originalHybridWon === false && game.hybridIsFirst)
  },
  handoff: handoffCounts(games),
  representatives,
  noSingleStepExample: noFlag ? {
   deck: noFlag.deck, seed: noFlag.seed, first: noFlag.first, hybridSeat: noFlag.hybridSeat,
   early: noFlag.early, life: noFlag.life
  } : null,
  games: games.map(game => ({
   deck: game.deck, seed: game.seed, first: game.first, hybridSeat: game.hybridSeat,
   hybridIsFirst: game.hybridIsFirst, originalHybridWon: game.originalHybridWon,
   originalLife: game.originalLife, replayHybridWon: game.replayHybridWon,
   replayDiverged: game.replayDiverged, replayFinished: game.replayFinished,
   openingMatches: game.openingMatches, life: game.life, steps: game.steps,
   illegal: game.illegal, endReason: game.endReason, class: game.class,
   flags: game.flags, early: game.early, handoffs: game.handoffs,
   snapshots: game.snapshots
  }))
 };
}

function readLosses(games) {
 const losses = games.filter(game => game.originalHybridWon === false);
 const also = losses.filter(game => game.replayFinished && game.replayHybridWon === false);
 const diverged = losses.filter(game => game.replayHybridWon === true);
 const kindOf = game => {
  const kinds = (game.snapshots || []).map(lethalPassKind).filter(Boolean);
  if (kinds.includes('higher-bp')) return 'higher-bp';
  if (kinds.includes('not-higher')) return 'not-higher';
  return null;
 };
 const higher = also.filter(game => kindOf(game) === 'higher-bp');
 const notHigher = also.filter(game => kindOf(game) === 'not-higher');
 const beater = also.filter(game => (game.flags || []).some(flag => flag.kind === 'beater-energy'));
 const noStep = also.filter(game => !kindOf(game) && !(game.flags || []).some(flag => flag.kind === 'beater-energy'));
 const cell = game => ({
  deck: game.deck, seed: game.seed, first: game.first, hybridSeat: game.hybridSeat,
  hybridIsFirst: game.hybridIsFirst, originalLife: game.originalLife, replayLife: game.life,
  lifeMatches: JSON.stringify(game.life) === JSON.stringify(game.originalLife)
 });
 return {
  stepTrace: 'absent',
  officialLosses: losses.length,
  replayDiverged: diverged.length,
  replayAlsoLost: also.length,
  lifeMatchesAmongAlsoLost: also.filter(game => JSON.stringify(game.life) === JSON.stringify(game.originalLife)).length,
  higherBpLethalPass: higher.length,
  notHigherLethalPass: notHigher.length,
  beaterEnergy: beater.length,
  noSingleStep: noStep.length,
  lateFrontNotUsed: 'Empty front through own turn 2 is normal on wins as well, so it is not a loss class.',
  missedKills: games.reduce((sum, game) => sum + (game.abandoned || 0), 0),
  cells: {
   higherBp: higher.map(cell),
   notHigher: notHigher.map(cell),
   beater: beater.map(cell),
   noSingleStep: noStep.map(cell)
  }
 };
}

function handoffCounts(games) {
 const count = (list) => {
  const kinds = {};
  let gamesWith = 0;
  for (const game of list) {
   if (!game.handoffs?.length) continue;
   gamesWith++;
   for (const item of game.handoffs) kinds[item.pending] = (kinds[item.pending] || 0) + 1;
  }
  return {games: list.length, gamesWith, kinds};
 };
 return {
  originalLosses: count(games.filter(game => game.originalHybridWon === false)),
  originalWins: count(games.filter(game => game.originalHybridWon === true))
 };
}

function loadSummary() {
 return JSON.parse(readFileSync(SUMMARY_URL, 'utf8'));
}

function runShard() {
 const summary = loadSummary();
 if (summary.record?.wins !== 150 || summary.record?.losses !== 50) {
  throw new Error('Official record is not 150-50');
 }
 const lock = loadLock();
 const decks = new Map(battleDecks().map(deck => [deck.id, deck]));
 const rows = new Map(summary.gameRows.map(row => [`${row.deck}|${row.seed}|${row.first}|${row.hybridSeat}`, row]));
 const jobs = selectJobs(jobsFromLock(lock), summary.gameRows);
 const shard = Number(process.env.AI_V3_SHARD || 0);
 const shards = Number(process.env.AI_V3_SHARDS || 1);
 mkdirSync(OUT, {recursive: true});
 const mine = jobs.filter((_, index) => index % shards === shard);
 const games = [];
 for (const job of mine) {
  const original = rows.get(`${job.deck}|${job.seed}|${job.first}|${job.hybridSeat}`);
  if (!original) throw new Error('Missing official row');
  const started = performance.now();
  const game = diagnoseGame(decks.get(job.deck), job, original);
  game.seconds = Math.round((performance.now() - started) / 100) / 10;
  games.push(game);
  writeFileSync(`${OUT}/shard-${shard}.json`, JSON.stringify({shard, shards, games}));
  console.error('game', job.deck, job.seed, 'first', job.first, 'seat', job.hybridSeat,
   game.originalHybridWon ? 'origW' : 'origL', game.replayHybridWon ? 'replayW' : 'replayL',
   game.life.join('-'), game.class.primary, game.seconds + 's');
 }
 console.error('shard', shard, 'done', games.length);
}

function mergeShards() {
 const summary = loadSummary();
 const before = createHash('sha256').update(readFileSync(SUMMARY_URL)).digest('hex');
 const files = readdirSync(OUT).filter(name => /^shard-\d+\.json$/.test(name)).sort();
 const games = files.flatMap(name => JSON.parse(readFileSync(`${OUT}/${name}`, 'utf8')).games);
 const expected = selectJobs(jobsFromLock(loadLock()), summary.gameRows).length;
 if (games.length !== expected) throw new Error(`Expected ${expected} replays, got ${games.length}`);
 const changed = execSync(
  'git diff --name-only 494f6a9e1dbfdbe226ffae07381e8ceba997e65c -- dist/universal-v2/ai-v3 dist/universal-v2/hard-ai.mjs dist/universal-v2/engine.mjs dist/universal-v2/ai.mjs',
  {encoding: 'utf8'}
 ).trim();
 if (changed) throw new Error('AI code differs from 494f6a9e: ' + changed);
 const diagnosis = buildDiagnosis(games, summary);
 diagnosis.summarySha256 = before;
 diagnosis.aiSha = '494f6a9e1dbfdbe226ffae07381e8ceba997e65c';
 diagnosis.baseSha = execSync('git rev-parse HEAD', {encoding: 'utf8'}).trim();
 diagnosis.nodes = 48;
 diagnosis.ms = 40;
 diagnosis.searchSeed = 1;
 writeFileSync(DIAGNOSIS_URL, JSON.stringify(diagnosis, null, 2) + '\n');
 const after = createHash('sha256').update(readFileSync(SUMMARY_URL)).digest('hex');
 if (after !== before) throw new Error('Official summary changed');
 console.error('merged', games.length, 'alsoLost', diagnosis.replayAlsoLost, 'diverged', diagnosis.replayDiverged);
}

function invokedDirectly() {
 const entry = process.argv[1];
 if (!entry) return false;
 return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
}

if (invokedDirectly()) {
 if (process.env.AI_V3_MERGE === '1') mergeShards();
 else runShard();
}
