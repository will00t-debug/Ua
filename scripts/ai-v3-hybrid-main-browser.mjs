// Real browser Worker check for hybrid-main-v1. Node and the page share one
// sealed request. The page has no process global.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {readFile as readFilePromise} from 'node:fs/promises';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {buildAiV3Request, handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {legalUniversalActions, dispatchUniversalAction, assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {newComparedMatch, applySharedOpening} from '../dist/universal-v2/ai-v3/opening.mjs';
import {HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = {'.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp'};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function positions() {
 const deck = battleDecks().find(item => item.id === 'white-sword');
 const packs = [deck.pack, deck.pack];
 const baseline = JSON.parse(readFileSync(new URL('../audit/ai-v3-hold-info-8401-baseline.json', import.meta.url), 'utf8'));
 const game = baseline.titles['white-sword'].byMode.tree.games.find(item => item.seed === 8401 && item.first === 0 && item.challengerSeat === 0);
 let state = applySharedOpening(packs, newComparedMatch(packs, [deck.counts, deck.counts], game.seed, game.first)).state;
 let main = null;
 let pending = null;
 for (const played of game.actions) {
  if (state.status !== 'playing') break;
  if (!main && state.phase === 'main' && !state.pending && legalUniversalActions(packs, state).length > 1) main = structuredClone(state);
  if (!pending && state.pending) pending = structuredClone(state);
  if (main && pending) break;
  const actor = state.pending?.player ?? state.active;
  const legal = legalUniversalActions(packs, state);
  const action = legal.find(item => same(item, played.action));
  if (!action) throw Error('replay ' + played.step);
  state = dispatchUniversalAction(packs, state, action, {actor});
 }
 return {main, pending};
}

const found = positions();
const deck = battleDecks().find(item => item.id === 'white-sword');
const packs = [deck.pack, deck.pack];
function nodeAsk(state, policy, ms) {
 const actor = state.pending?.player ?? state.active;
 const request = buildAiV3Request(packs, state, actor, {
  requestId: 11, stateVersion: 4, seed: 1, nodes: 48, ms, ...(policy ? {policy} : {})
 });
 const result = handleAiV3Request(request);
 return {
  actor,
  error: result.error,
  policy: result.policy,
  type: result.action?.type || null,
  uid: result.action?.uid ?? null,
  line: result.action?.line || null,
  lane: result.search?.route?.lane || null,
  source: result.search?.route?.source || null,
  nodesUsed: result.search?.nodesUsed ?? null
 };
}
const node = {
 mainHybrid: nodeAsk(found.main, HYBRID_MAIN_POLICY, 1e9),
 mainV3: nodeAsk(found.main, null, 1e9),
 pendingHybrid: nodeAsk(found.pending, HYBRID_MAIN_POLICY, 1e9),
 timed: nodeAsk(found.main, HYBRID_MAIN_POLICY, 40)
};
let cursor = structuredClone(found.main);
const nodePlay = [];
for (let step = 0; step < 8 && cursor.status === 'playing'; step++) {
 const actor = cursor.pending?.player ?? cursor.active;
 const request = buildAiV3Request(packs, cursor, actor, {
  requestId: step + 1, stateVersion: step + 1, seed: 1, nodes: 48, ms: 1e9, policy: HYBRID_MAIN_POLICY
 });
 const result = handleAiV3Request(request);
 const legal = legalUniversalActions(packs, cursor);
 const action = legal.find(item => same(item, result.action));
 if (!action || result.error) throw Error('node play ' + step + ' ' + result.error);
 cursor = dispatchUniversalAction(packs, cursor, action, {actor});
 if (assertUniversalMatch(packs, cursor) !== true) throw Error('node match');
 nodePlay.push({type: action.type, uid: action.uid ?? null, lane: result.search?.route?.lane || null, source: result.search?.route?.source || null});
}

const fixture = {main: found.main, pending: found.pending, node, nodePlay};
const pageBody = `<!doctype html><meta charset="utf-8"><script type="application/json" id="fixture">${JSON.stringify(fixture).replaceAll('<', '\\u003c')}</script>
<script type="module">
import {officialV2Pack} from '/dist/universal-v2/official-entry.mjs';
import {legalUniversalActions, dispatchUniversalAction, assertUniversalMatch} from '/dist/universal-v2/engine.mjs';
import {buildAiV3Request, handleAiV3Request} from '/dist/universal-v2/ai-v3/worker-entry.mjs';
import {HYBRID_MAIN_POLICY} from '/dist/universal-v2/ai-v3/hybrid-main.mjs';
const fixture = JSON.parse(document.getElementById('fixture').textContent);
const pack = officialV2Pack('bleach');
const packs = () => [pack, pack];
function brief(result) {
 return {
  error: result.error, policy: result.policy,
  type: result.action?.type || null, uid: result.action?.uid ?? null, line: result.action?.line || null,
  lane: result.search?.route?.lane || null, source: result.search?.route?.source || null,
  nodesUsed: result.search?.nodesUsed ?? null
 };
}
function workerCall(state, actor, policy, ms, ids) {
 const request = buildAiV3Request(packs(), state, actor, {
  requestId: ids.requestId, stateVersion: ids.stateVersion, seed: 1, nodes: 48, ms, ...(policy ? {policy} : {})
 });
 const worker = new Worker(new URL('/dist/universal-v2/ai-v3/browser-worker.mjs', import.meta.url), {type: 'module'});
 return new Promise((resolve, reject) => {
  const timer = setTimeout(() => { worker.terminate(); reject(Error('worker timeout')); }, 20000);
  worker.onmessage = event => { clearTimeout(timer); worker.terminate(); resolve(event.data); };
  worker.onerror = event => { clearTimeout(timer); worker.terminate(); reject(Error(event.message || 'worker error')); };
  worker.postMessage(request);
 });
}
const mainActor = fixture.main.pending?.player ?? fixture.main.active;
const pendingActor = fixture.pending.pending?.player ?? fixture.pending.active;
const mainHybrid = brief(await workerCall(fixture.main, mainActor, HYBRID_MAIN_POLICY, 1e9, {requestId: 11, stateVersion: 4}));
const mainV3 = brief(await workerCall(fixture.main, mainActor, null, 1e9, {requestId: 11, stateVersion: 4}));
const pendingHybrid = brief(await workerCall(fixture.pending, pendingActor, HYBRID_MAIN_POLICY, 1e9, {requestId: 11, stateVersion: 4}));
const timed = brief(await workerCall(fixture.main, mainActor, HYBRID_MAIN_POLICY, 40, {requestId: 11, stateVersion: 4}));
const hidden = handleAiV3Request({sealed: true, requestId: 1, stateVersion: 1, actor: 0, policy: HYBRID_MAIN_POLICY, opponentHand: ['secret'], deckOrder: ['secret'], lifeOrder: ['secret'], pack, state: fixture.main});
let cursor = structuredClone(fixture.main);
const play = [];
for (let step = 0; step < 8 && cursor.status === 'playing'; step++) {
 const actor = cursor.pending?.player ?? cursor.active;
 const data = await workerCall(cursor, actor, HYBRID_MAIN_POLICY, 1e9, {requestId: step + 1, stateVersion: step + 1});
 const legal = legalUniversalActions(packs(), cursor);
 const action = legal.find(item => JSON.stringify(item) === JSON.stringify(data.action));
 if (!action || data.error) throw Error('browser play ' + step + ' ' + data.error);
 cursor = dispatchUniversalAction(packs(), cursor, action, {actor});
 if (assertUniversalMatch(packs(), cursor) !== true) throw Error('browser match');
 play.push({type: action.type, uid: action.uid ?? null, lane: data.search?.route?.lane || null, source: data.search?.route?.source || null});
}
window.__hybrid = {process: typeof process, mainHybrid, mainV3, pendingHybrid, timed, hidden: hidden.error, play};
</script>`;

function listen() {
 const server = createServer(async (request, response) => {
  try {
   const url = new URL(request.url, 'http://127.0.0.1');
   if (url.pathname === '/') {
    response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
    response.end(pageBody);
    return;
   }
   const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
   if (!relative || relative.includes('..')) throw Error('path');
   const file = join(root, relative);
   if (!file.startsWith(root)) throw Error('path');
   const body = await readFilePromise(file);
   response.writeHead(200, {'content-type': types[extname(file)] || 'application/octet-stream'});
   response.end(body);
  } catch {
   response.writeHead(404);
   response.end('missing');
  }
 });
 return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}
function cdp(url) {
 const ws = new WebSocket(url);
 let seq = 0;
 const pending = new Map();
 return new Promise((resolve, reject) => {
  ws.addEventListener('open', () => resolve({
   send(method, params = {}, sessionId) {
    const id = ++seq;
    return new Promise((ok, fail) => {
     pending.set(id, {ok, fail});
     ws.send(JSON.stringify({id, method, params, sessionId}));
    });
   },
   close() { ws.close(); }
  }));
  ws.addEventListener('message', event => {
   const message = JSON.parse(event.data);
   if (message.id && pending.has(message.id)) {
    const job = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) job.fail(Error(message.error.message));
    else job.ok(message.result || {});
   }
  });
  ws.addEventListener('error', reject);
 });
}

const server = await listen();
const port = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
 '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
 '--remote-debugging-port=9333', '--user-data-dir=/tmp/ai-v3-hybrid-browser-profile', 'about:blank'
], {stdio: 'ignore'});
let browser;
try {
 let version = null;
 for (let attempt = 0; attempt < 50 && !version; attempt++) {
  try {
   const response = await fetch('http://127.0.0.1:9333/json/version');
   if (response.ok) version = await response.json();
  } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
 }
 if (!version) throw Error('Chrome did not open a debugging port');
 browser = await cdp(version.webSocketDebuggerUrl);
 const created = await browser.send('Target.createTarget', {url: 'about:blank'});
 const attached = await browser.send('Target.attachToTarget', {targetId: created.targetId, flatten: true});
 const session = attached.sessionId;
 await browser.send('Page.enable', {}, session);
 await browser.send('Runtime.enable', {}, session);
 await browser.send('Page.navigate', {url: 'http://127.0.0.1:' + port + '/'}, session);
 let page = null;
 for (let attempt = 0; attempt < 80 && !page; attempt++) {
  const result = await browser.send('Runtime.evaluate', {
   expression: 'window.__hybrid||null', awaitPromise: true, returnByValue: true
  }, session);
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  page = result.result?.value;
  if (!page) await new Promise(resolve => setTimeout(resolve, 250));
 }
 if (!page) throw Error('the browser hybrid check did not finish');
 await browser.send('Page.navigate', {url: 'http://127.0.0.1:' + port + '/dist/universal-v2-preview.html'}, session);
 let lobby = null;
 for (let attempt = 0; attempt < 40 && !lobby; attempt++) {
  const result = await browser.send('Runtime.evaluate', {
   expression: `document.documentElement.dataset.hybridMainReady==='1' && document.getElementById('hybrid-main-v1') ? ({checked: document.getElementById('hybrid-main-v1').checked, preview: document.getElementById('ai-v3-preview').checked, note: document.body.innerText.includes('hybrid-main-v1')}) : null`,
   returnByValue: true
  }, session);
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  lobby = result.result?.value;
  if (!lobby) await new Promise(resolve => setTimeout(resolve, 250));
 }
 if (!lobby) throw Error('the preview page did not show the hybrid control');
 const toggled = await browser.send('Runtime.evaluate', {
  expression: `(() => {
   const box = document.getElementById('hybrid-main-v1');
   box.click();
   const on = box.checked === true && localStorage.getItem('ua-hybrid-main-v1') === '1';
   box.click();
   const off = box.checked === false && localStorage.getItem('ua-hybrid-main-v1') === '0';
   const preview = document.getElementById('ai-v3-preview').checked === false;
   return {on, off, preview};
  })()`,
  returnByValue: true
 }, session);
 if (toggled.exceptionDetails) throw Error(toggled.exceptionDetails.exception?.description || toggled.exceptionDetails.text);
 const problems = [];
 const decision = row => JSON.stringify({
  error: row.error, policy: row.policy, type: row.type, uid: row.uid, line: row.line, lane: row.lane, source: row.source
 });
 const match = (left, right, label) => {
  if (decision(left) !== decision(right)) problems.push(label);
 };
 if (page.process !== 'undefined') problems.push('process');
 match(page.mainHybrid, node.mainHybrid, 'main-hybrid');
 match(page.mainV3, node.mainV3, 'main-v3');
 match(page.pendingHybrid, node.pendingHybrid, 'pending-hybrid');
 if (page.mainHybrid.policy !== 'hybrid-main-v1' || page.mainHybrid.lane !== 'main' || page.mainHybrid.source !== 'hard') problems.push('main-route');
 if (page.mainV3.policy !== 'ai-v3-beam-1' || page.mainV3.lane !== null) problems.push('v3-route');
 if (page.pendingHybrid.lane !== 'pending' || page.pendingHybrid.source !== 'v3') problems.push('pending-route');
 if (page.timed.error || (page.timed.nodesUsed != null && page.timed.nodesUsed > 48) || decision(page.timed) !== decision(node.timed)) problems.push('40ms');
 if (page.hidden !== 'hidden-field') problems.push('hidden');
 if (JSON.stringify(page.play) !== JSON.stringify(nodePlay)) problems.push('play');
 if (page.play.some(item => item.lane === 'pending' && item.source !== 'v3')) problems.push('play-pending');
 if (page.play.some(item => item.lane === 'main' && item.source !== 'hard')) problems.push('play-main');
 if (lobby.checked !== false || lobby.preview !== false || lobby.note !== true) problems.push('lobby');
 if (!toggled.result?.value?.on || !toggled.result?.value?.off || !toggled.result?.value?.preview) problems.push('toggle');
 const report = {
  ok: problems.length === 0, problems, page, node, lobby, toggle: toggled.result?.value || null,
  clock: {nodeNodes: node.timed.nodesUsed, browserNodes: page.timed.nodesUsed, sameAction: decision(page.timed) === decision(node.timed)}
 };
 console.log(JSON.stringify(report, null, 2));
 if (problems.length) process.exitCode = 1;
} finally {
 browser?.close();
 chrome.kill();
 server.close();
}
