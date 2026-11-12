// Optional decision record. It never calls an AI and never reads the opponent's
// chooser. Call it only after the timed search has returned. Full states stay
// in a local directory supplied by the caller; the public row has no deck
// order, hand identities, life identities, or card numbers.
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {dispatchUniversalAction, legalUniversalActions, universalAttackDamage, universalBp} from '../dist/universal-v2/engine.mjs';

const ZONES = ['hand', 'front', 'energy', 'outside', 'removed', 'deck', 'life'];
const HIDDEN = new Set(['hand', 'deck', 'life']);
const CARD_NUMBER = /[A-Z]{2,4}-\d+-\d+/;

export function diagnoseEnabled(env = process.env) {
 return env.AI_V3_DIAGNOSE === '1';
}

export function measureChoice(chooseFn, recordFn) {
 const before = performance.now();
 const picked = chooseFn();
 const searchMs = performance.now() - before;
 const recorded = recordFn ? recordFn(picked) : null;
 return {picked, searchMs, recorded};
}

export function decisionStateId(state) {
 return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

export function retainOriginalChoice(record, replayed) {
 void replayed;
 return record?.chosen ?? null;
}

function round1(value) {
 return Math.round(value * 10) / 10;
}

function locate(state, uid) {
 if (!uid) return null;
 for (let seat = 0; seat < (state.players || []).length; seat++) {
  const player = state.players[seat];
  for (const zone of ZONES) {
   const card = (player[zone] || []).find(item => item && item.uid === uid);
   if (card) return {card, zone, seat};
  }
 }
 return null;
}

function printed(packs, card) {
 if (!card?.uid || !card.cardId) return null;
 const owner = Number(String(card.uid).split('-')[0]);
 return packs[owner]?.cards?.[card.cardId] || null;
}

function liveBp(packs, state, card) {
 if (!card) return null;
 try {
  const value = universalBp(packs, state, card);
  return Number.isFinite(value) ? value : null;
 } catch {
  return null;
 }
}

function clean(value) {
 if (value == null || value === '') return null;
 const text = String(value);
 if (CARD_NUMBER.test(text)) return null;
 return text;
}

export function publicActionBrief(packs, state, actor, action) {
 if (!action) return null;
 const found = action.uid ? locate(state, action.uid) : null;
 const data = found ? printed(packs, found.card) : null;
 const opponentHidden = !!(found && found.seat !== actor && HIDDEN.has(found.zone));
 const brief = {
  type: clean(action.type),
  line: clean(action.line),
  mode: clean(action.mode),
  hidden: opponentHidden
 };
 if (!opponentHidden && data) {
  brief.bp = found ? liveBp(packs, state, found.card) : null;
  brief.cost = Number(data.energy) || 0;
  brief.gen = Number(data.gen) || 0;
  brief.color = clean(data.color);
  brief.cardType = clean(data.type);
 }
 return brief;
}

function scoreOf(row) {
 if (Number.isFinite(row?.score)) return round1(row.score);
 if (Number.isFinite(row?.search)) return row.search;
 return null;
}

function same(a, b) {
 return JSON.stringify(a) === JSON.stringify(b);
}

function frontMax(packs, state, actor) {
 return (state.players?.[actor]?.front || []).filter(Boolean)
  .reduce((max, card) => Math.max(max, liveBp(packs, state, card) || 0), 0);
}

function highDeploy(packs, state, action) {
 if (!action) return false;
 if (action.type === 'raid') return (liveBp(packs, state, locate(state, action.uid)?.card) || 0) >= 3000;
 if (action.type === 'play' && action.line === 'front') {
  return (liveBp(packs, state, locate(state, action.uid)?.card) || 0) >= 3000;
 }
 return false;
}

export function provenWinRows(source, trace, legal) {
 const rows = Array.isArray(trace?.candidates) ? trace.candidates
  : (Array.isArray(trace?.compared) ? trace.compared : []);
 if (source === 'v3') {
  return rows.filter(row => row?.executed !== false && row.boundary === 'terminal' && row.search >= 90000
   && legal.some(action => same(action, row.action)));
 }
 return rows.filter(row => row?.score >= 50000 && legal.some(action => same(action, row.action)));
}

export function decisionFlags(packs, state, actor, legal, chosen, trace, meta = {}) {
 const flags = [];
 if (!state || !chosen) return flags;
 const idleMain = !state.pending && state.phase === 'main';
 if (idleMain && chosen.type === 'play' && chosen.line === 'energy') {
  const bp = liveBp(packs, state, locate(state, chosen.uid)?.card) || 0;
  const thin = frontMax(packs, state, actor) < 3000;
  const alternative = legal.some(highDeploy.bind(null, packs, state));
  if (bp >= 3000 && thin && alternative) flags.push('thin-front-high-bp-energy');
 }
 if (idleMain && legal.some(action => action.type === 'raid') && chosen.type !== 'raid') {
  flags.push('legal-raid-other');
  const early = Number.isFinite(meta.ownTurn) && meta.ownTurn <= 4;
  const raidHigh = legal.some(action => action.type === 'raid' && highDeploy(packs, state, action));
  if (early && raidHigh && frontMax(packs, state, actor) < 4000) flags.push('early-raid-other');
 }
 if (state.pending?.kind === 'block' && chosen.type === 'chooseBlock' && chosen.uid == null) {
  const attacker = locate(state, state.pending.attackerUid)?.card;
  let damage = 1;
  try {
   const value = attacker ? universalAttackDamage(packs, state, attacker) : 1;
   if (Number.isFinite(value) && value > 0) damage = value;
  } catch { /* the printed 1 remains */ }
  const life = state.players?.[actor]?.life?.length || 0;
  const blocker = legal.some(action => action.type === 'chooseBlock' && action.uid);
  if (blocker && life - damage <= 0) flags.push('defender-lethal');
 }
 if (chosen.type === 'extraDraw') flags.push('extra-draw');
 const wins = provenWinRows(meta.source, trace, legal);
 const taken = wins.some(row => same(row.action, chosen));
 if (wins.length && taken) flags.push('proven-kill');
 if (wins.length > 1 && taken) flags.push('equivalent-wins');
 if (wins.length && !taken) flags.push('abandoned-kill');
 return flags;
}

function candidateBriefs(packs, state, actor, trace) {
 const rows = Array.isArray(trace?.candidates) ? trace.candidates : [];
 return rows.slice(0, 6).map(row => ({
  ...publicActionBrief(packs, state, actor, row.action),
  score: scoreOf(row)
 }));
}

export function publicRecordLeaks(value) {
 const text = JSON.stringify(value);
 if (/"uid"\s*:/.test(text)) return 'uid';
 if (/"cardId"\s*:/.test(text)) return 'cardId';
 if (/"deck"\s*:/.test(text)) return 'deck';
 if (/"hand"\s*:/.test(text)) return 'hand';
 if (CARD_NUMBER.test(text)) return 'card-number';
 return null;
}

export function captureDecision(input) {
 const flags = decisionFlags(
  input.packs, input.before, input.actor, input.legal, input.chosen, input.trace,
  {source: input.source, ownTurn: input.ownTurn}
 );
 const keep = input.keepState === true || (input.keepState === 'flagged' && flags.length > 0);
 const stateId = keep || input.withId ? decisionStateId(input.before) : null;
 const lifeBefore = (input.before?.players || []).map(player => player?.life?.length ?? null);
 const lifeAfter = input.after ? (input.after.players || []).map(player => player?.life?.length ?? null) : null;
 const apReady = (input.before?.players?.[input.actor]?.apCards || []).filter(card => card && card.ready).length;
 const chosenIndex = input.legal.findIndex(action => same(action, input.chosen));
 const pub = {
  step: input.step ?? null,
  stateId,
  phase: input.before?.phase || null,
  pending: input.before?.pending?.kind || null,
  turn: input.before?.turn ?? null,
  ownTurn: Number.isFinite(input.ownTurn) ? input.ownTurn : null,
  actor: input.actor,
  first: input.first ?? null,
  seatRole: input.actor === input.first ? 'first' : 'second',
  policy: input.policy || null,
  source: input.source || null,
  lane: input.lane || null,
  nodesUsed: Number.isFinite(input.trace?.nodesUsed) ? input.trace.nodesUsed : null,
  nodesBudget: input.nodesBudget ?? null,
  searchMs: Number.isFinite(input.trace?.ms) ? round1(input.trace.ms) : null,
  wallMs: Number.isFinite(input.wallMs) ? round1(input.wallMs) : null,
  msBudget: input.msBudget ?? null,
  reason: input.trace?.reason || null,
  apReady,
  lifeBefore,
  lifeAfter,
  legalCount: input.legal.length,
  legal: input.legal.map(action => publicActionBrief(input.packs, input.before, input.actor, action)),
  chosen: publicActionBrief(input.packs, input.before, input.actor, input.chosen),
  chosenIndex,
  candidates: candidateBriefs(input.packs, input.before, input.actor, input.trace),
  flags,
  choiceSource: 'live-dispatch'
 };
 const leak = publicRecordLeaks(pub);
 if (leak) throw new Error('Public decision leaked ' + leak);
 const local = keep ? {
  stateId,
  state: structuredClone(input.before),
  legal: input.legal.map(action => structuredClone(action)),
  chosen: structuredClone(input.chosen),
  actor: input.actor,
  first: input.first ?? null
 } : null;
 return {public: pub, local, flags};
}

export function verifyLocalSnapshot(packs, snapshot) {
 const legal = legalUniversalActions(packs, snapshot.state);
 const sameList = legal.length === snapshot.legal.length
  && legal.every((action, index) => same(action, snapshot.legal[index]));
 const chosen = legal.find(action => same(action, snapshot.chosen)) || null;
 const stateId = decisionStateId(snapshot.state);
 return {
  ok: sameList && !!chosen && stateId === snapshot.stateId,
  sameList,
  chosen: !!chosen,
  stateId,
  legalCount: legal.length
 };
}

export function writeLocalSnapshot(dir, snapshot) {
 mkdirSync(dir, {recursive: true});
 const file = `${dir}/${snapshot.stateId}.json`;
 writeFileSync(file, JSON.stringify(snapshot));
 return file;
}

export function replayActions(packs, state, actions) {
 let cursor = structuredClone(state);
 for (let step = 0; step < actions.length; step++) {
  if (cursor.status !== 'playing') return {ok: false, step, error: 'already-finished'};
  const actor = cursor.pending?.player ?? cursor.active;
  const legal = legalUniversalActions(packs, cursor);
  const action = legal.find(item => same(item, actions[step]));
  if (!action) return {ok: false, step, error: 'action'};
  try {
   cursor = dispatchUniversalAction(packs, cursor, action, {actor});
  } catch (error) {
   return {ok: false, step, error: error?.message || String(error)};
  }
 }
 return {ok: true, state: cursor};
}
