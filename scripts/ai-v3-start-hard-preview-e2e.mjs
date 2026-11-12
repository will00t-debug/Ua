// Battle-page acceptance for the opt-in hybrid-start-hard-v1 policy.
// A finished game here is a functional check, not a new strength result.
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
const gameMs = Number(process.env.AI_V3_E2E_MS || 150000);
const POLICY = 'hybrid-start-hard-v1';

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
   if (message.method === 'Page.javascriptDialogOpening') {
    events.push(message);
    const text = message.params?.message || '';
    if (text.includes('確認擠位')) report.squeezeConfirms++;
    const id = ++seq;
    ws.send(JSON.stringify({id, method: 'Page.handleJavaScriptDialog', params: {accept: true}, sessionId: message.sessionId}));
    pending.set(id, {ok() {}, fail() {}});
    return;
   }
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
 const root = document.documentElement;
 const body = document.body;
 if (!root || !body) return {href: location.href, ready: false, policy: '', policyText: '', buttons: [], routes: [], history: [], stored: {}, finished: false, error: '', busy: false, hiddenDump: false, script: '', status: '', phase: '', lane: '', source: '', timeouts: 0, rejected: 0, nextPhase: false, mobileMenu: false, width: window.innerWidth || 0, hybridChecked: null, startChecked: null, previewChecked: null};
 const buttons = [...document.querySelectorAll('button')].filter(node => !node.disabled && node.getClientRects().length);
 const history = [...document.querySelectorAll('.history li')].map(node => node.textContent);
 let routes = [];
 try { routes = JSON.parse(root.dataset.aiRouteLog || '[]'); } catch { routes = []; }
 const stored = {hybrid: null, start: null, preview: null};
 try {
  stored.hybrid = localStorage.getItem('ua-hybrid-main-v1');
  stored.start = localStorage.getItem('ua-hybrid-start-hard-v1');
  stored.preview = localStorage.getItem('ua-ai-v3-preview');
 } catch {}
 return {
  href: location.href,
  ready: root.dataset.hybridMainReady === '1',
  policy: document.body?.dataset.aiPolicy || '',
  policyText: document.getElementById('ai-policy-live')?.textContent || document.getElementById('battle-matchup')?.textContent || '',
  hybridChecked: document.getElementById('hybrid-main-v1')?.checked ?? null,
  startChecked: document.getElementById('hybrid-start-hard-v1')?.checked ?? null,
  previewChecked: document.getElementById('ai-v3-preview')?.checked ?? null,
  stored,
  script: document.querySelector('script[src*="universal-v2-preview.mjs"]')?.src || '',
  endNote: document.querySelector('.coach-review-header .note')?.textContent || document.querySelector('.resultBanner')?.textContent || '',
  finished: /你獲勝了|電腦獲勝/.test((document.querySelector('.resultBanner h2')?.textContent || '') + (document.querySelector('.coach-review-header .note')?.textContent || '')),
  winner: (document.querySelector('.resultBanner h2')?.textContent || document.querySelector('.coach-review-header .note')?.textContent || ''),
  error: document.querySelector('.v2-error')?.textContent || '',
  busy: /AI 自動操作中|AI 正在思考|電腦正在決定起手牌/.test(document.body?.innerText || ''),
  status: document.querySelector('.v2-ai-status b')?.textContent || '',
  phase: document.querySelector('.phaseBar .current')?.textContent || '',
  phaseText: document.querySelector('.phaseAction p')?.textContent || '',
  blockPrompt: !!document.querySelector('.v2-block-prompt'),
  blockSkip: !!document.querySelector('.v2-block-skip'),
  canBlock: !!document.querySelector('button.slot.v2-can-block'),
  buttons: buttons.map(node => node.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40)),
  lane: root.dataset.aiLane || '',
  source: root.dataset.aiSource || '',
  timeouts: Number(root.dataset.aiTimeouts || '0'),
  rejected: Number(root.dataset.aiRejected || '0'),
  routes,
  history: history.slice(0, 80),
  hiddenDump: /opponentHand|deckOrder|lifeOrder/.test(document.body?.innerHTML || ''),
  nextPhase: buttons.some(node => /下一階段|結束回合/.test(node.textContent)),
  mobileMenu: buttons.some(node => node.textContent.includes('對局選單')),
  width: window.innerWidth,
  lifeCards: Math.max(
   document.querySelectorAll('.v2-life-group:not(.opponent) .lifeCard').length,
   document.querySelectorAll('.playerArea:not(.opponent) .lifeRow .lifeCard').length
  ),
  apFace: document.querySelectorAll('.apCard, .apDots, .apRow').length,
  neon: !!document.querySelector('link[href*="universal-v2-neon-board.css"]'),
  gestures: (() => { try { return JSON.parse(root.dataset.gestureLog || '{}'); } catch { return {}; } })(),
  placement: [...document.querySelectorAll('button.slot')].map(node => node.dataset.placement || '').filter(Boolean),
  pendingButtons: [...document.querySelectorAll('.v2-pending-overlay button, .dialog.pending button')].slice(0, 8).map(node => (node.getAttribute('aria-label') || node.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 48))
 };
})()`;

function summarize(game) {
 const history = game.history || [];
 const count = word => history.filter(line => line.includes(word)).length;
 const routes = game.routes || [];
 const own = routes.filter(row => row.policy === POLICY);
 const bad = own.filter(row => {
  if (row.pending || row.lane === 'pending') return row.source !== 'v3';
  if (row.lane === 'start' || row.lane === 'main') return row.source !== 'hard';
  if (row.lane === 'move' || row.lane === 'battle') return row.source !== 'v3';
  return row.source === 'hard';
 });
 const lanes = {};
 for (const row of own) {
  const key = row.lane + '/' + row.source;
  lanes[key] = (lanes[key] || 0) + 1;
 }
 return {
  energy: count('能源線'), front: count('前線'), raid: count('突襲'), attack: count('攻擊'),
  block: count('阻擋') + count('不阻擋'), trigger: count('觸發'),
  fallback: count('合法備援'),
  routes: own.length,
  badRoutes: bad.slice(0, 8),
  lanes,
  startHard: own.filter(row => row.lane === 'start' && row.source === 'hard').length,
  startV3: own.filter(row => row.lane === 'start' && row.source !== 'hard').length,
  pendingHard: own.filter(row => (row.pending || row.lane === 'pending') && row.source === 'hard').length
 };
}

const server = await listen();
const port = server.address().port;
const origin = 'http://127.0.0.1:' + port;
const chrome = spawn('/usr/bin/google-chrome', [
 '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
 '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
 '--remote-debugging-port=9346', '--user-data-dir=/tmp/ai-v3-start-hard-e2e-profile', 'about:blank'
], {stdio: 'ignore'});
const report = {ok: false, kind: 'functional-acceptance', strengthEvidence: false, origin, games: [], mobile: [], problems: [], squeezeConfirms: 0};
let browser;
try {
 let version = null;
 for (let attempt = 0; attempt < 50 && !version; attempt++) {
  try {
   const response = await fetch('http://127.0.0.1:9346/json/version');
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
    browser.takeEvents();
    const result = await browser.send('Runtime.evaluate', {expression, returnByValue: true}, session);
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
   } catch (error) {
    lastError = error;
    if (!/navigated or closed|Execution context was destroyed|Session with given id|reading 'dataset'|documentElement/.test(error?.message || '')) throw error;
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
 report.defaults = {policy: defaults.policy, hybridChecked: defaults.hybridChecked, startChecked: defaults.startChecked, previewChecked: defaults.previewChecked, stored: defaults.stored};
 if (defaults.hybridChecked !== false || defaults.previewChecked !== false || defaults.startChecked !== false) report.problems.push('default-not-off');
 if (defaults.policy === POLICY || defaults.policy === 'hybrid-main-v1' || defaults.policy === 'ai-v3-beam-1') report.problems.push('default-policy');
 if (!defaults.script.includes('20261112policysync1')) report.problems.push('cache');
 await evalPage(`(() => { localStorage.setItem('ua-hybrid-main-v1','1'); localStorage.removeItem('ua-hybrid-start-hard-v1'); location.reload(); })()`);
 const kept = await waitFor(page => page.ready && page.policy === 'hybrid-main-v1' && page.startChecked === false, 'old hybrid stays', 40);
 if (kept.policy !== 'hybrid-main-v1' || kept.startChecked !== false) report.problems.push('migrated-old-hybrid');
 await evalPage(`document.getElementById('use-hybrid-start-hard').click()`);
 const selected = await snap();
 if (selected.policy !== POLICY || selected.startChecked !== true || selected.hybridChecked !== false || selected.previewChecked !== false) report.problems.push('switch-start');
 await evalPage(`location.reload()`);
 const restored = await waitFor(page => page.ready && page.policy === POLICY, 'reload policy', 40);
 if (restored.policy !== POLICY || restored.startChecked !== true) report.problems.push('reload-policy');
 await evalPage(`document.getElementById('use-ai-v3').click()`);
 const v3 = await waitFor(page => page.policy === 'ai-v3-beam-1' && page.startChecked === false, 'switch v3', 40).catch(() => snap());
 if (v3.policy !== 'ai-v3-beam-1' || v3.startChecked !== false) report.problems.push('switch-v3');
 await evalPage(`document.getElementById('use-difficulty-ai').click()`);
 const back = await waitFor(page => page.policy !== POLICY && page.policy !== 'hybrid-main-v1' && page.policy !== 'ai-v3-beam-1' && page.startChecked === false, 'switch difficulty', 40).catch(() => snap());
 if (back.policy === POLICY || back.policy === 'hybrid-main-v1' || back.policy === 'ai-v3-beam-1' || back.startChecked !== false) report.problems.push('switch-back');
 await evalPage(`document.getElementById('use-hybrid-main').click()`);
 const hybrid = await waitFor(page => page.policy === 'hybrid-main-v1' && page.startChecked === false, 'switch hybrid', 40).catch(() => snap());
 if (hybrid.policy !== 'hybrid-main-v1' || hybrid.startChecked !== false) report.problems.push('switch-hybrid');

 async function play(deck, {mobile = false, budget = gameMs} = {}) {
  await browser.send('Emulation.setDeviceMetricsOverride', {
   width: mobile ? 412 : 1366, height: mobile ? 915 : 900, deviceScaleFactor: mobile ? 2 : 1, mobile
  }, session);
  if (mobile) {
   await browser.send('Emulation.setUserAgentOverride', {userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'}, session);
  }
  await openLobby();
  const launched = await evalPage(`(() => {
   const mine = document.getElementById('my-title');
   const foe = document.getElementById('ai-title');
   const has = select => [...select.options].some(option => option.value === ${JSON.stringify(deck.id)} && !option.disabled);
   if (!has(mine) || !has(foe)) return false;
   mine.value = ${JSON.stringify(deck.id)};
   foe.value = ${JSON.stringify(deck.id)};
   mine.dispatchEvent(new Event('change', {bubbles: true}));
   foe.dispatchEvent(new Event('change', {bubbles: true}));
   document.getElementById('first-player').value = 'ai';
   document.getElementById('use-hybrid-start-hard').click();
   document.getElementById('start-game').click();
   return true;
  })()`);
  if (!launched) return {deck: deck.id, name: deck.name, mobile, problem: 'deck-unavailable'};
  const started = await waitFor(page => page.href.includes('universal-v2-battle.html') && (page.policy === POLICY || page.error), 'battle ' + deck.id, 120);
  const begun = Date.now();
  let last = '';
  let stuck = 0;
  let clicks = 0;
  let sawNext = false;
  let switched = false;
  let reloaded = false;
  let page = started;
  let bestHistory = [];
  let routeParts = [];
  let heldRoutes = [];
  let routeSeen = 0;
  const clicksSeen = new Set();
  const gestureMax = {};
  const placements = new Set();
  let lifeSeen = 0;
  let apSeen = false;
  let neonSeen = false;
  const absorb = value => {
   for (const [key, count] of Object.entries(value.gestures || {}))
    gestureMax[key] = Math.max(gestureMax[key] || 0, Number(count) || 0);
   for (const place of value.placement || []) placements.add(place);
   if ((value.lifeCards || 0) > lifeSeen) lifeSeen = value.lifeCards;
   if (value.apFace) apSeen = true;
   if (value.neon) neonSeen = true;
  };
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
   absorb(page);
   if (page.nextPhase) sawNext = true;
   if (page.finished) break;
   const signature = page.policy + '|' + page.busy + '|' + page.phase + '|' + page.buttons.join(',') + '|' + (page.history[0] || '');
   if (!page.busy) {
    const clicked = await evalPage(`(() => {
     const root = document.documentElement;
     const log = (() => { try { return JSON.parse(root.dataset.gestureLog || '{}'); } catch { return {}; } })();
     const turnKey = ${JSON.stringify((page.phase || '') + ':' + (page.history || []).length)};
     if (log.turnKey !== turnKey) { log.turnKey = turnKey; log.inspected = []; log.scanned = []; }
     const mark = key => { log[key] = (log[key] || 0) + 1; root.dataset.gestureLog = JSON.stringify(log); };
     const visible = node => node && !node.disabled && node.getClientRects().length;
     const buttons = [...document.querySelectorAll('button')].filter(visible);
     const label = node => node.textContent.trim().replace(/\s+/g, ' ');
     const want = ['保留這 7 張手牌', '不阻擋', '重新繼續電腦調度', '重新繼續'];
     for (const text of want) {
      const hit = buttons.find(node => label(node).includes(text));
      if (hit) { hit.click(); return text; }
     }
     const skip = document.querySelector('.v2-block-skip');
     if (skip && !skip.disabled) { skip.click(); return 'skip-block'; }
     const blocker = document.querySelector('button.slot.v2-can-block');
     if (blocker && !blocker.disabled && !document.querySelector('.v2-block-skip')) { blocker.click(); return 'block-card'; }
     const overlay = document.querySelector('.v2-pending-overlay, .dialog.pending');
     if (overlay) {
      const pendingChoice = [...overlay.querySelectorAll('button')]
       .find(node => {
        const text = label(node) || node.getAttribute('aria-label') || '';
        return !node.disabled && !/^(取消|返回|重新選擇|查看)/.test(text) && !text.includes('查看場面');
       });
      if (pendingChoice) {
       if (/替換|擠位/.test(label(pendingChoice))) mark('squeeze');
       pendingChoice.click();
       return 'pending';
      }
     }
     const modes = buttons.filter(node => label(node) === '普通進場' || label(node) === '突襲進場');
     if (modes.length === 2) mark('twoStageOffered');
     const ability = [...document.querySelectorAll('.v2-activation-option')].find(visible);
     if (ability) { ability.click(); mark('activateChoice'); return 'activate-choice'; }
     const activate = buttons.find(node => label(node) === '啟動' && (log.activate || 0) < 3);
     if (activate) { activate.click(); mark('activate'); return 'activate'; }
     const raidBase = [...document.querySelectorAll('button.slot.raid-base')].find(node => visible(node) && (node.dataset.placement || '').includes('選為'));
     if (raidBase) { raidBase.click(); mark('raidBase'); return 'raid-base'; }
     const raidDest = [...document.querySelectorAll('button.slot.destination')].find(node => visible(node) && /突襲/.test(node.dataset.placement || ''));
     if (raidDest) { raidDest.click(); mark('raidCommit'); return 'raid-dest'; }
     const hands = [...document.querySelectorAll('button.handCard.playable')].filter(visible);
     const handIds = new Set(hands.map(node => node.dataset.v2CardUid));
     log.inspected = (log.inspected || []).filter(id => handIds.has(id));
     const selected = hands.find(node => node.classList.contains('selected'));
     const pendingHand = hands.find(node => !(log.inspected || []).includes(node.dataset.v2CardUid) && node !== selected);
     if (!log.raidCommit && selected && pendingHand) {
      log.inspected = [...log.inspected, selected.dataset.v2CardUid];
      pendingHand.click();
      mark('hand');
      root.dataset.gestureLog = JSON.stringify(log);
      return 'hand';
     }
     if (!log.raidCommit && !selected && pendingHand) {
      pendingHand.click();
      mark('hand');
      return 'hand';
     }
     const cells = [...document.querySelectorAll('button.slot.destination')].filter(visible);
     const squeeze = cells.find(node => node.dataset.placement === '替換並移入移除區');
     if (log.raidCommit && !log.squeeze && squeeze) { squeeze.click(); mark('squeeze'); return 'squeeze'; }
     const energyLine = [...document.querySelectorAll('.playerArea:not(.opponent) .lineGroup')]
      .find(node => node.querySelector('.lineLabel.energy'));
     const energy = [...(energyLine?.querySelectorAll('button.slot.destination') || [])]
      .find(node => visible(node) && node.dataset.placement === '普通進場');
     if (energy) { energy.click(); mark('energy'); return 'energy'; }
     const cell = cells.find(node => node.dataset.placement === '普通進場');
     if (log.raidCommit && cell) { cell.click(); mark('entryCell'); return 'cell'; }
     if (modes.length) {
      const raid = modes.find(node => label(node) === '突襲進場');
      const normal = modes.find(node => label(node) === '普通進場');
      const pick = raid && !log.raidChosen ? raid : (normal || raid);
      if (label(pick) === '突襲進場') mark('raidChosen');
      if (modes.length === 2) mark('twoStageChoice');
      pick.click();
      return label(pick);
     }
     const back = buttons.find(node => label(node) === '改為普通進場');
     if (back && !document.querySelector('button.slot[data-placement="選為突襲底座"]')) { back.click(); mark('switchNormal'); return 'switch-normal'; }
     const ownSlots = [...document.querySelectorAll('.playerArea:not(.opponent) .lineGroup button.slot.occupied')].filter(visible);
     const scanned = new Set(log.scanned || []);
     const ownTurn = buttons.some(node => label(node).includes('下一階段') || label(node).includes('結束回合'));
     const freshSlot = ownSlots.find(node => !node.classList.contains('selected') && !scanned.has(node.dataset.v2CardUid));
     if (ownTurn && freshSlot) {
      scanned.add(freshSlot.dataset.v2CardUid);
      log.scanned = [...scanned];
      freshSlot.click();
      mark('fieldSelect');
      root.dataset.gestureLog = JSON.stringify(log);
      return 'field';
     }
     for (const text of ['下一階段', '結束回合']) {
      const hit = buttons.find(node => label(node).includes(text));
      if (hit) { hit.click(); return text; }
     }
     const resetCard = buttons.find(node => label(node) === '重新選擇角色');
     if (resetCard) { resetCard.click(); return 'reset-card'; }
     const next = document.querySelector('.v2-middle-next button');
     if (next && !next.disabled) { next.click(); return 'next-hidden'; }
     const dialog = [...document.querySelectorAll('.overlay button')].find(node => !node.disabled && !/取消|返回|查看|重新選擇/.test(label(node)));
     if (dialog) { dialog.click(); return 'dialog'; }
     return '';
    })()`);
    if (clicked) { clicks++; clicksSeen.add(clicked); }
    if (signature === last && !clicked) stuck++;
    else stuck = 0;
   } else if (signature === last) stuck++;
   else stuck = 0;
   last = signature;
   if (!mobile && deck.exercise && !reloaded && (page.routes || []).some(row => row.lane === 'start' && row.source === 'hard')) {
    reloaded = true;
    await browser.send('Page.reload', {}, session);
    page = await waitFor(value => value.href.includes('universal-v2-battle.html') && value.policy, 'reload ' + deck.id, 80);
    if (page.policy !== POLICY) report.problems.push(deck.id + '-reload-policy');
   }
   if (!mobile && deck.exercise && !switched && reloaded && (page.routes || []).some(row => row.lane === 'start' && row.source === 'hard')) {
    switched = true;
    await evalPage(`(() => {
     const off = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === '關閉新混合 AI');
     if (off) off.click();
    })()`);
    const left = await waitFor(value => value.buttons.some(text => text === '新混合 AI') && value.policy !== POLICY, 'leave start-hard ' + deck.id, 40).catch(() => snap());
    await evalPage(`(() => {
     const on = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === '新混合 AI');
     if (on) on.click();
    })()`);
    page = await waitFor(value => value.policy === POLICY, 'return start-hard ' + deck.id, 40).catch(() => snap());
    if (left.policy === POLICY || page.policy !== POLICY) report.problems.push(deck.id + '-live-switch');
   }
   if (stuck >= (page.busy ? 80 : 25)) break;
   await new Promise(resolve => setTimeout(resolve, 200));
  }
  page = await snap();
  keep(page);
  absorb(page);
  if (page.nextPhase) sawNext = true;
  page = {...page, history: bestHistory.length ? bestHistory : page.history, routes: routeParts.concat(heldRoutes)};
  const stats = summarize(page);
  return {
   deck: deck.id, name: deck.name, mobile, width: page.width, finished: page.finished, winner: page.winner,
   endNote: page.endNote, error: page.error, policy: page.policy, timeouts: page.timeouts, rejected: page.rejected,
   clicks, clickKinds: [...clicksSeen], sawNext, stuck: !page.finished && stuck >= (page.busy ? 80 : 25),
   elapsedMs: Date.now() - begun, hiddenDump: page.hiddenDump, mobileMenu: page.mobileMenu,
   lifeCards: lifeSeen, apFace: apSeen, neon: neonSeen, gestures: gestureMax, placements: [...placements],
   script: page.script, status: page.status, phase: page.phase, switched, reloaded,
   hint: page.phaseText, blockPrompt: page.blockPrompt, blockSkip: page.blockSkip, canBlock: page.canBlock, buttons: page.buttons, pendingButtons: page.pendingButtons, ...stats, sample: (page.history || []).slice(0, 12)
  };
 }

 const only = process.env.AI_V3_E2E_ONLY || '';
 const wanted = decks.filter(deck => !only || deck.id === only);
 for (const deck of wanted) {
  const game = await play(deck);
  report.games.push(game);
  log(JSON.stringify({deck: game.deck, mobile: false, finished: game.finished, winner: game.winner, lanes: game.lanes, startHard: game.startHard, elapsedMs: game.elapsedMs, error: game.error, stuck: game.stuck}));
  if (game.problem) report.problems.push(game.deck + '-' + game.problem);
  if (game.hiddenDump) report.problems.push(game.deck + '-hidden');
  if (game.badRoutes?.length) report.problems.push(game.deck + '-route');
  if (game.startV3) report.problems.push(game.deck + '-start-v3');
  if (!game.startHard) report.problems.push(game.deck + '-start-not-hard');
  if (game.pendingHard) report.problems.push(game.deck + '-pending-hard');
  if (game.rejected) report.problems.push(game.deck + '-rejected');
  if (game.timeouts) report.problems.push(game.deck + '-timeout');
  if (!game.script.includes('20261112policysync1')) report.problems.push(game.deck + '-cache');
  if (game.policy !== POLICY) report.problems.push(game.deck + '-policy');
 }
 if (!only) {
  for (const deck of wanted) {
   const game = await play(deck, {mobile: true});
   report.mobile.push(game);
   log(JSON.stringify({deck: game.deck, mobile: true, finished: game.finished, winner: game.winner, lanes: game.lanes, startHard: game.startHard, width: game.width, elapsedMs: game.elapsedMs, error: game.error, stuck: game.stuck}));
   if (game.problem) report.problems.push('mobile-' + game.deck + '-' + game.problem);
   if (game.hiddenDump) report.problems.push('mobile-' + game.deck + '-hidden');
   if (game.badRoutes?.length) report.problems.push('mobile-' + game.deck + '-route');
   if (game.startV3) report.problems.push('mobile-' + game.deck + '-start-v3');
   if (!game.startHard) report.problems.push('mobile-' + game.deck + '-start-not-hard');
   if (game.pendingHard) report.problems.push('mobile-' + game.deck + '-pending-hard');
   if (!game.mobileMenu && !game.finished) report.problems.push('mobile-' + game.deck + '-menu');
   if (game.policy !== POLICY && !game.finished) report.problems.push('mobile-' + game.deck + '-policy');
  }
 }
 report.extra = [];
 if (!only) {
  const hunt = async (deckId, ready) => {
   const deck = decks.find(item => item.id === deckId);
   for (let attempt = 0; attempt < 3 && !ready(); attempt++) {
    const game = await play(deck);
    report.extra.push(game);
    log(JSON.stringify({hunt: deckId, finished: game.finished, elapsedMs: game.elapsedMs, gestures: game.gestures}));
   }
  };
  const seen = key => report.games.concat(report.mobile, report.extra).some(game => Number(game.gestures?.[key] || 0) > 0);
  if (!seen('raidCommit')) await hunt('white-sword', () => seen('raidCommit'));
  if (!report.squeezeConfirms) await hunt('white-sword', () => report.squeezeConfirms > 0);
  if (!seen('activateChoice')) await hunt('steins-gate-blue', () => seen('activateChoice'));
  const mobileActivated = () => report.mobile.concat(report.extra).some(game => game.mobile && Number(game.gestures?.activateChoice || 0) > 0);
  if (!mobileActivated()) {
   const deck = decks.find(item => item.id === 'white-sword');
   for (let attempt = 0; attempt < 2 && !mobileActivated(); attempt++) {
    const game = await play(deck, {mobile: true});
    report.extra.push(game);
    log(JSON.stringify({hunt: 'white-sword-mobile', finished: game.finished, elapsedMs: game.elapsedMs, gestures: game.gestures}));
   }
  }
 }
 const played = report.games.concat(report.mobile);
 const gestureCount = key => played.concat(report.extra).reduce((sum, game) => sum + Number(game.gestures?.[key] || 0), 0);
 report.gestures = {
  twoStageOffered: gestureCount('twoStageOffered'),
  twoStageChoice: gestureCount('twoStageChoice'),
  raidBase: gestureCount('raidBase'),
  raidCommit: gestureCount('raidCommit'),
  squeeze: gestureCount('squeeze'),
  squeezeConfirms: report.squeezeConfirms,
  entryCell: gestureCount('entryCell'),
  hand: gestureCount('hand')
 };
 report.gestures.activate = gestureCount('activate');
 report.gestures.activateChoice = gestureCount('activateChoice');
 report.gestures.fieldSelect = gestureCount('fieldSelect');
 if (!report.gestures.activate || !report.gestures.activateChoice) report.problems.push('activation-not-played');
 if (!report.gestures.raidBase || !report.gestures.raidCommit) report.problems.push('raid-base-not-played');
 if (!report.squeezeConfirms) report.problems.push('squeeze-not-played');
 if (played.some(game => game.lifeCards !== 7)) report.problems.push('life-count');
 if (played.some(game => !game.apFace)) report.problems.push('ap-missing');
 if (played.some(game => game.neon !== true)) report.problems.push('neon-missing');
 report.ok = report.problems.length === 0 && played.length === (only ? wanted.length : wanted.length * 2) && played.every(game => game.finished && !game.error && !game.stuck && game.startHard > 0 && game.startV3 === 0 && game.pendingHard === 0);
} catch (error) {
 report.problems.push(error?.message || String(error));
} finally {
 const outName = process.env.AI_V3_E2E_OUT || 'ai-v3-start-hard-preview-e2e.json';
 writeFileSync(new URL('../audit/' + outName, import.meta.url), JSON.stringify(report, null, 2));
 log(JSON.stringify({ok: report.ok, problems: report.problems, games: [...report.games, ...report.mobile].map(game => ({deck: game.deck, mobile: game.mobile, finished: game.finished, winner: game.winner, lanes: game.lanes, startHard: game.startHard, elapsedMs: game.elapsedMs}))}, null, 2));
 browser?.close();
 chrome.kill();
 server.close();
}
if (!report.ok) process.exitCode = 1;
