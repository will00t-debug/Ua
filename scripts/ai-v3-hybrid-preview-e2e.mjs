// Real preview-page acceptance for hybrid-main-v1. Drives the lobby and the
// battle page in Chrome. It does not call the benchmark chooser.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {writeFileSync, writeSync} from 'node:fs';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const web = join(root, 'dist');
const log = value => writeSync(1, value + '\n');
const types = {'.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2'};
const decks = [
 {id: 'white-sword', name: '白劍', exercise: true},
 {id: 'sword-art-online', name: '刀劍神域', exercise: false},
 {id: 'steins-gate-blue', name: '命運石之門', exercise: false}
];
const gameMs = Number(process.env.AI_V3_E2E_MS || 180000);

function listen() {
 const server = createServer(async (request, response) => {
  try {
   const url = new URL(request.url, 'http://127.0.0.1');
   const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'universal-v2-preview.html';
   if (relative.includes('..')) throw Error('path');
   const file = join(web, relative);
   if (!file.startsWith(web)) throw Error('path');
   const body = await readFile(file);
   response.writeHead(200, {'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
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
 const events = [];
 return new Promise((resolve, reject) => {
  ws.addEventListener('open', () => resolve({
   send(method, params = {}, sessionId) {
    const id = ++seq;
    return new Promise((ok, fail) => {
     pending.set(id, {ok, fail});
     ws.send(JSON.stringify({id, method, params, sessionId}));
    });
   },
   takeEvents() { return events.splice(0); },
   close() { ws.close(); }
  }));
  ws.addEventListener('message', event => {
   const message = JSON.parse(event.data);
   if (message.id && pending.has(message.id)) {
    const job = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) job.fail(Error(message.error.message));
    else job.ok(message.result || {});
    return;
   }
   if (message.method) events.push(message);
  });
  ws.addEventListener('error', reject);
 });
}

const SNAPSHOT = `(() => {
 const buttons = [...document.querySelectorAll('button')].filter(node => !node.disabled && node.getClientRects().length);
 const history = [...document.querySelectorAll('.history li')].map(node => node.textContent);
 const root = document.documentElement;
 let routes = [];
 try { routes = JSON.parse(root.dataset.aiRouteLog || '[]'); } catch { routes = []; }
 return {
  href: location.href,
  ready: root.dataset.hybridMainReady === '1',
  policy: document.body?.dataset.aiPolicy || '',
  policyText: document.getElementById('ai-policy-live')?.textContent || document.getElementById('battle-matchup')?.textContent || '',
  hybridChecked: document.getElementById('hybrid-main-v1')?.checked ?? null,
  previewChecked: document.getElementById('ai-v3-preview')?.checked ?? null,
  script: document.querySelector('script[src*="universal-v2-preview.mjs"]')?.src || '',
  endNote: document.querySelector('.coach-review-header .note')?.textContent || document.querySelector('.resultBanner')?.textContent || '',
  finished: /你獲勝了|電腦獲勝/.test((document.querySelector('.resultBanner h2')?.textContent || '') + (document.querySelector('.coach-review-header .note')?.textContent || '')),
  winner: (document.querySelector('.resultBanner h2')?.textContent || document.querySelector('.coach-review-header .note')?.textContent || ''),
  error: document.querySelector('.v2-error')?.textContent || '',
  busy: /AI 自動操作中|AI 正在思考|電腦正在決定起手牌/.test(document.body?.innerText || ''),
  aiStep: document.documentElement.dataset.aiStep || '',
  visibility: document.visibilityState,
  status: document.querySelector('.v2-ai-status b')?.textContent || '',
  phase: document.querySelector('.phaseBar .current')?.textContent || '',
  hint: document.querySelector('.phaseAction p')?.textContent || '',
  buttons: buttons.map(node => node.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40)),
  lane: root.dataset.aiLane || '',
  source: root.dataset.aiSource || '',
  timeouts: Number(root.dataset.aiTimeouts || '0'),
  rejected: Number(root.dataset.aiRejected || '0'),
  routes,
  history: history.slice(0, 80),
  hiddenDump: /opponentHand|deckOrder|lifeOrder/.test(document.body?.innerHTML || ''),
  mobileMenu: !!document.querySelector('button') && buttons.some(node => node.textContent.includes('對局選單'))
 };
})()`;

function summarize(game) {
 const history = game.history || [];
 const count = word => history.filter(line => line.includes(word)).length;
 const routes = game.routes || [];
 const bad = routes.filter(row => (row.lane === 'main' && row.pending == null && row.source !== 'hard') || (row.lane !== 'main' && row.source !== 'v3') || (row.pending && row.source !== 'v3'));
 return {
  energy: count('能源線'),
  front: count('前線'),
  raid: count('突襲'),
  attack: count('攻擊'),
  apDraw: count('額外抽牌'),
  privateChoice: count('私密'),
  fallback: count('合法備援'),
  routes: routes.length,
  badRoutes: bad.slice(0, 8),
  lanes: routes.reduce((map, row) => {
   const key = row.lane + '/' + row.source;
   map[key] = (map[key] || 0) + 1;
   return map;
  }, {})
 };
}

const server = await listen();
const port = server.address().port;
const origin = 'http://127.0.0.1:' + port;
const chrome = spawn('/usr/bin/google-chrome', [
 '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
 '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
 '--remote-debugging-port=9344', '--user-data-dir=/tmp/ai-v3-preview-e2e-profile', 'about:blank'
], {stdio: 'ignore'});
const report = {ok: false, origin, games: [], mobile: null, problems: []};
let browser;
try {
 let version = null;
 for (let attempt = 0; attempt < 50 && !version; attempt++) {
  try {
   const response = await fetch('http://127.0.0.1:9344/json/version');
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
 await browser.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 900, deviceScaleFactor: 1, mobile: false}, session);
 const evalPage = async expression => {
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt++) {
   try {
    for (const event of browser.takeEvents()) {
     if (event.method === 'Page.javascriptDialogOpening')
      await browser.send('Page.handleJavaScriptDialog', {accept: true}, event.sessionId || session);
    }
    const result = await browser.send('Runtime.evaluate', {expression, returnByValue: true}, session);
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
   } catch (error) {
    lastError = error;
    if (!/navigated or closed|Execution context was destroyed|Session with given id/.test(error?.message || '')) throw error;
    await new Promise(resolve => setTimeout(resolve, 250));
   }
  }
  throw lastError;
 };
 const snap = () => evalPage(SNAPSHOT);
 const waitFor = async (check, label, tries = 80) => {
  for (let attempt = 0; attempt < tries; attempt++) {
   const value = await snap();
   if (check(value)) return value;
   await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw Error(label);
 };
 const openLobby = async () => {
  await browser.send('Page.navigate', {url: origin + '/universal-v2-preview.html'}, session);
  await waitFor(page => page.ready && page.policyText.includes('目前 AI policy'), 'lobby');
 };
 await openLobby();
 const defaults = await snap();
 if (defaults.hybridChecked !== false || defaults.previewChecked !== false) report.problems.push('default-not-off');
 if (!defaults.policyText.includes('normal') && !defaults.policyText.includes('這場難度')) report.problems.push('default-policy');
 if (!defaults.script.includes('20261110aipolicy1')) report.problems.push('cache');
 await evalPage(`(() => {
  document.getElementById('use-ai-v3').click();
  return document.body.dataset.aiPolicy;
 })()`);
 const v3 = await snap();
 if (v3.policy !== 'ai-v3-beam-1' || v3.previewChecked !== true || v3.hybridChecked !== false) report.problems.push('switch-v3');
 await evalPage(`document.getElementById('use-difficulty-ai').click()`);
 const back = await snap();
 if (back.policy === 'hybrid-main-v1' || back.policy === 'ai-v3-beam-1') report.problems.push('switch-back');
 await evalPage(`document.getElementById('use-hybrid-main').click()`);
 const hybrid = await snap();
 if (hybrid.policy !== 'hybrid-main-v1' || hybrid.hybridChecked !== true) report.problems.push('switch-hybrid');

 async function play(deck, {mobile = false, budget = gameMs} = {}) {
  if (!mobile) await openLobby();
  else {
   await browser.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 2, mobile: true}, session);
   await browser.send('Emulation.setUserAgentOverride', {userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'}, session);
   await openLobby();
  }
  const selected = await evalPage(`(() => {
   const mine = document.getElementById('my-title');
   const foe = document.getElementById('ai-title');
   const has = select => [...select.options].some(option => option.value === ${JSON.stringify(deck.id)} && !option.disabled);
   if (!has(mine) || !has(foe)) return false;
   mine.value = ${JSON.stringify(deck.id)};
   foe.value = ${JSON.stringify(deck.id)};
   mine.dispatchEvent(new Event('change', {bubbles: true}));
   foe.dispatchEvent(new Event('change', {bubbles: true}));
   document.getElementById('first-player').value = 'ai';
   document.getElementById('use-hybrid-main').click();
   document.getElementById('start-game').click();
   return true;
  })()`);
  if (!selected) return {deck: deck.id, name: deck.name, mobile, problem: 'deck-unavailable'};
  const started = await waitFor(page => page.href.includes('universal-v2-battle.html') && (page.policy === 'hybrid-main-v1' || page.error), 'battle ' + deck.id, 120);
  const begun = Date.now();
  let last = '';
  let stuck = 0;
  let clicks = 0;
  let switched = false;
  let reloaded = false;
  let page = started;
  let bestHistory = [];
  let routeParts = [];
  let heldRoutes = [];
  let routeSeen = 0;
  const keep = value => {
   if ((value.history || []).length) bestHistory = value.history;
   const nextRoutes = value.routes || [];
   if (nextRoutes.length < routeSeen) routeParts = routeParts.concat(heldRoutes);
   heldRoutes = nextRoutes;
   routeSeen = nextRoutes.length;
  };
  while (Date.now() - begun < budget && !page.finished) {
   page = await snap();
   keep(page);
   if (page.finished) break;
   const signature = page.policy + '|' + page.busy + '|' + page.buttons.join(',') + '|' + (page.history[0] || '');
   if (!page.busy) {
    const clicked = await evalPage(`(() => {
     const visible = node => !node.disabled && node.getClientRects().length;
     const buttons = [...document.querySelectorAll('button')].filter(visible);
     const want = ['保留這 7 張手牌', '不阻擋', '下一階段', '結束回合', '重新繼續電腦調度', '重新繼續'];
     for (const text of want) {
      const hit = buttons.find(node => node.textContent.includes(text));
      if (hit) { hit.click(); return text; }
     }
     const compact = [...document.querySelectorAll('.v2-compact-actions button, .v2-pending-overlay button, .trigger-row button')].filter(visible);
     const pendingChoice = compact.find(node => !/取消|返回|重新選擇|改為|查看/.test(node.textContent));
     if (pendingChoice) { pendingChoice.click(); return 'pending'; }
     const choice = buttons.find(node => node.className.includes('choice') || node.closest('.v2-pending, .v2-choice, .pending-dialog, .v2-mulligan-decisions'));
     if (choice && !/重開|下載|復原|暫停|選單|搜尋|混合|認輸|標記|對戰紀錄/.test(choice.textContent)) { choice.click(); return 'choice'; }
     return '';
    })()`);
    if (clicked) clicks++;
    if (signature === last && !clicked) stuck++;
    else stuck = 0;
   } else if (signature === last) stuck++;
   else stuck = 0;
   last = signature;
   if (!mobile && deck.exercise && !reloaded && (page.routes || []).length >= 6) {
    reloaded = true;
    await browser.send('Page.reload', {}, session);
    page = await waitFor(value => value.href.includes('universal-v2-battle.html') && value.policy, 'reload ' + deck.id, 80);
    if (page.policy !== 'hybrid-main-v1') report.problems.push(deck.id + '-reload-policy');
   }
   if (!mobile && deck.exercise && !switched && reloaded && (page.routes || []).length >= 8) {
    switched = true;
    await evalPage(`(() => {
     const off = [...document.querySelectorAll('button')].find(node => node.textContent.includes('關閉主階段混合'));
     if (off) off.click();
    })()`);
    const mid = await waitFor(value => value.policy && value.policy !== 'hybrid-main-v1', 'leave hybrid ' + deck.id, 40).catch(() => snap());
    await evalPage(`(() => {
     const on = [...document.querySelectorAll('button')].find(node => node.textContent.includes('完整回合搜尋'));
     if (on) on.click();
    })()`);
    const v3Live = await waitFor(value => value.policy === 'ai-v3-beam-1', 'live v3 ' + deck.id, 40).catch(() => snap());
    await evalPage(`(() => {
     const on = [...document.querySelectorAll('button')].find(node => node.textContent.includes('主階段混合實驗'));
     if (on) on.click();
    })()`);
    page = await waitFor(value => value.policy === 'hybrid-main-v1', 'return hybrid ' + deck.id, 40).catch(() => snap());
    if (mid.policy === 'hybrid-main-v1' || v3Live.policy !== 'ai-v3-beam-1' || page.policy !== 'hybrid-main-v1')
     report.problems.push(deck.id + '-live-switch');
   }
   if (stuck >= (page.busy ? 80 : 25)) break;
   await new Promise(resolve => setTimeout(resolve, 200));
  }
  page = await snap();
  keep(page);
  page = {...page, history: bestHistory.length ? bestHistory : page.history, routes: routeParts.concat(heldRoutes)};
  const stats = summarize(page);
  return {
   deck: deck.id, name: deck.name, mobile, finished: page.finished, winner: page.winner,
   endNote: page.endNote,
   error: page.error, policy: page.policy, timeouts: page.timeouts, rejected: page.rejected,
   clicks, stuck: !page.finished && stuck >= (page.busy ? 80 : 25), elapsedMs: Date.now() - begun, hiddenDump: page.hiddenDump,
   mobileMenu: page.mobileMenu, script: page.script, status: page.status, phase: page.phase,
   visibility: page.visibility, aiStep: page.aiStep,
   hint: page.hint, buttons: page.buttons, ...stats,
   sample: (page.history || []).slice(0, 12)
  };
 }

 const only = process.env.AI_V3_E2E_ONLY || '';
 for (const deck of decks.filter(deck => !only || deck.id === only)) {
  const game = await play(deck);
  report.games.push(game);
  log(JSON.stringify({deck: game.deck, finished: game.finished, winner: game.winner, routes: game.routes, lanes: game.lanes, elapsedMs: game.elapsedMs, error: game.error, stuck: game.stuck}));
  if (game.problem) report.problems.push(game.deck + '-' + game.problem);
  if (game.hiddenDump) report.problems.push(game.deck + '-hidden');
  if (game.badRoutes?.length) report.problems.push(game.deck + '-route');
  if (!game.script.includes('20261110aipolicy1')) report.problems.push(game.deck + '-cache');
 }
 await browser.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 900, deviceScaleFactor: 1, mobile: false}, session);
 if (!only) {
  report.mobile = await play(decks[0], {mobile: true, budget: 90000});
  if (report.mobile.problem) report.problems.push('mobile-' + report.mobile.problem);
  if (!report.mobile.mobileMenu && !report.mobile.finished) report.problems.push('mobile-menu');
  if (report.mobile.policy !== 'hybrid-main-v1' && !report.mobile.finished) report.problems.push('mobile-policy');
  if (report.mobile.hiddenDump) report.problems.push('mobile-hidden');
 }
 report.ok = report.problems.length === 0 && report.games.every(game => game.finished && !game.error && !game.stuck);
} catch (error) {
 report.problems.push(error?.message || String(error));
} finally {
 writeFileSync(new URL('../audit/ai-v3-hybrid-preview-e2e.json', import.meta.url), JSON.stringify(report, null, 2));
 log(JSON.stringify({ok: report.ok, problems: report.problems, games: report.games.map(game => ({deck: game.deck, finished: game.finished, winner: game.winner, lanes: game.lanes, elapsedMs: game.elapsedMs}))}, null, 2));
 browser?.close();
 chrome.kill();
 server.close();
}
if (!report.ok) process.exitCode = 1;
