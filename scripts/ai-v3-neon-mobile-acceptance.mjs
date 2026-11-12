// Chrome 412×915 acceptance for the two positions the integration games did not click.
// The pages load legal V2 audit states. This is not an AI strength run.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const web = join(root, 'dist');
const shots = '/opt/cursor/artifacts';
const types = {'.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2'};
const port = 9353;

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
 return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

function cdp(url, dialogs) {
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
   if (message.method === 'Page.javascriptDialogOpening') {
    const text = message.params?.message || '';
    const accept = dialogs.mode !== 'cancel';
    dialogs.messages.push({text, accept});
    if (dialogs.mode === 'cancel') dialogs.mode = 'accept';
    const id = ++seq;
    ws.send(JSON.stringify({id, method: 'Page.handleJavaScriptDialog', params: {accept}, sessionId: message.sessionId}));
    pending.set(id, {ok() {}, fail() {}});
    return;
   }
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

const READ = `(() => {
 const own = document.querySelector('.playerArea:not(.opponent)');
 const lines = own ? [...own.querySelectorAll(':scope > .lineGroup')] : [];
 const slots = line => [...(line?.querySelectorAll(':scope > .slots > button.slot') || [])].map(node => ({
  placement: node.dataset.placement || '',
  rested: node.classList.contains('rested'),
  selected: node.classList.contains('selected'),
  bp: node.querySelector('.slotBp b')?.textContent || '',
  stack: node.querySelector('.slotStack')?.textContent || '',
  label: node.getAttribute('aria-label') || '',
  visible: node.getClientRects().length > 0
 }));
 const texts = [...document.querySelectorAll('button')].map(node => node.textContent.trim().replace(/\\s+/g, ' '));
 return {
  width: window.innerWidth,
  height: window.innerHeight,
  audit: document.body?.dataset?.audit || '',
  phase: document.querySelector('.phaseBar .current')?.textContent || '',
  hint: document.querySelector('.phaseAction p')?.textContent || '',
  ap: own?.querySelector('.apCount')?.textContent || own?.querySelector('.apDots')?.getAttribute('aria-label') || '',
  apReady: own?.querySelector('.apCount') ? own.querySelectorAll('.apArt.ready').length : (own?.querySelectorAll('.apDots i.available') || []).length,
  energy: own?.querySelector('.energyCount')?.textContent || '',
  activate: document.querySelector('.v2-field-activate-button')?.textContent || '',
  menu: [...document.querySelectorAll('.v2-activation-option')].map(node => node.textContent.trim().replace(/\\s+/g, ' ')),
  pending: [...document.querySelectorAll('.v2-pending-overlay button, .dialog.pending button')].map(node => node.textContent.trim().replace(/\\s+/g, ' ').slice(0, 80)),
  controls: texts.filter(text => ['普通進場', '突襲進場', '改為普通進場', '改為突襲進場', '重新選擇底板', '啟動'].includes(text) || text.includes('下一階段') || text.includes('結束回合')),
  hand: [...document.querySelectorAll('button.handCard')].map(node => ({name: node.getAttribute('aria-label') || '', selected: node.classList.contains('selected')})),
  front: slots(lines[0]),
  energyLine: slots(lines[1]),
  history: [...document.querySelectorAll('.history li')].slice(0, 6).map(node => node.textContent),
  error: document.querySelector('.v2-error')?.textContent || ''
 };
})()`;

const server = await listen();
const chrome = spawn('/usr/bin/google-chrome', [
 '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
 '--remote-debugging-port=9352', '--user-data-dir=/tmp/ai-v3-neon-mobile-acceptance', 'about:blank'
], {stdio: 'ignore'});
const dialogs = {mode: 'accept', messages: []};
const report = {ok: false, viewport: {width: 412, height: 915}, problems: [], dialogs: dialogs.messages, shots: []};
let browser;
try {
 await mkdir(shots, {recursive: true});
 let version = null;
 for (let attempt = 0; attempt < 50 && !version; attempt++) {
  try {
   const response = await fetch('http://127.0.0.1:9352/json/version');
   if (response.ok) version = await response.json();
  } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
 }
 if (!version) throw Error('Chrome did not open a debugging port');
 browser = await cdp(version.webSocketDebuggerUrl, dialogs);
 const created = await browser.send('Target.createTarget', {url: 'about:blank'});
 const attached = await browser.send('Target.attachToTarget', {targetId: created.targetId, flatten: true});
 const session = attached.sessionId;
 await browser.send('Page.enable', {}, session);
 await browser.send('Runtime.enable', {}, session);
 await browser.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 2, mobile: true}, session);
 const evaluate = async expression => {
  const result = await browser.send('Runtime.evaluate', {expression, returnByValue: true}, session);
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
 };
 const read = () => evaluate(READ);
 const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
 const shot = async name => {
  const image = await browser.send('Page.captureScreenshot', {format: 'png'}, session);
  const file = join(shots, name + '.png');
  writeFileSync(file, Buffer.from(image.data, 'base64'));
  report.shots.push(file);
 };
 const openAudit = async name => {
  dialogs.mode = 'accept';
  await browser.send('Page.navigate', {url: 'http://127.0.0.1:' + port + '/universal-v2-battle.html?audit=' + name}, session);
  for (let attempt = 0; attempt < 40; attempt++) {
   const page = await read().catch(() => null);
   if (page?.audit === name && page.phase) return page;
   await pause(250);
  }
  throw Error('audit page did not load ' + name);
 };
 const click = async finder => {
  const clicked = await evaluate(`(() => {
   const node = (${finder})(document);
   if (!node) return '';
   node.scrollIntoView({block: 'center', inline: 'center'});
   node.click();
   return (node.getAttribute('aria-label') || node.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
  })()`);
  if (!clicked) throw Error('missing click ' + finder);
  await pause(300);
  return clicked;
 };
 const settle = async (check, label) => {
  for (let attempt = 0; attempt < 20; attempt++) {
   const page = await read();
   if (check(page)) return page;
   await pause(200);
  }
  throw Error(label + ' ' + JSON.stringify(await read()));
 };

 const apText = page => String(page.ap || '').replace(/\s*AP$/, '');
 const before = await openAudit('stg006');
 await shot('neon-activate-before');
 if (before.width !== 412 || before.height !== 915) report.problems.push('viewport ' + before.width + 'x' + before.height);
 if (before.activate) report.problems.push('activate visible before selection');
 if (apText(before) !== '3/3' || before.apReady !== 3) report.problems.push('starting AP ' + before.ap + ' ready ' + before.apReady);
 const selectedClick = await click(`document => document.querySelector('.playerArea:not(.opponent) .lineGroup .lineLabel.energy')?.parentElement?.querySelector('button.slot.occupied')`);
 const selected = await settle(page => page.activate === '啟動', 'activate button');
 await shot('neon-activate-selected');
 await click(`document => document.querySelector('.v2-field-activate-button')`);
 const menu = await settle(page => page.menu.length === 1, 'ability menu');
 await shot('neon-activate-menu');
 await click(`document => document.querySelector('.v2-activation-option')`);
 const chosen = await settle(page => page.pending.some(text => text.includes('BP＋1000')), 'buff choice');
 await shot('neon-activate-choice');
 if (apText(chosen) !== '3/3' || chosen.apReady !== 3) report.problems.push('AP changed on activate ' + chosen.ap);
 if (!chosen.energyLine[0]?.rested) report.problems.push('source did not rest');
 await click(`document => [...document.querySelectorAll('.v2-pending-overlay button, .dialog.pending button')].find(node => node.textContent.includes('BP＋1000'))`);
 const resolved = await settle(page => page.front[0]?.bp === '3000' && page.pending.length === 0, 'buff resolved');
 await shot('neon-activate-resolved');
 if (resolved.energyLine[0]?.rested !== true) report.problems.push('source stood back up');
 if (apText(resolved) !== '3/3') report.problems.push('AP changed after the buff ' + resolved.ap);
 const continuedClick = await click(`document => [...document.querySelectorAll('button')].find(node => node.textContent.includes('下一階段'))`);
 const continued = await settle(page => page.phase === '攻擊', 'next phase');
 await shot('neon-activate-continued');
 if (!continued.controls.some(text => text.includes('結束回合'))) report.problems.push('attack phase has no continue control');
 report.activate = {before, selectedClick, selected, menu, chosen, resolved, continuedClick, continued};

 dialogs.messages.length = 0;
 const dualBefore = await openAudit('blc067dual');
 await shot('neon-dual-initial');
 const handClick = await click(`document => document.querySelector('button.handCard.playable')`);
 const offered = await settle(page => page.controls.includes('改為突襲進場'), 'paid dual toggle');
 await shot('neon-dual-offered');
 const bothModes = offered.controls.includes('普通進場') && offered.controls.includes('突襲進場');
 const emptyFront = offered.front.filter(slot => slot.placement === '普通進場');
 const bases = offered.energyLine.filter(slot => slot.placement === '選為突襲底座');
 const illegal = offered.front[0];
 if (bothModes) report.problems.push('paid hand showed both mode buttons');
 if (emptyFront.length !== 3) report.problems.push('normal cells ' + emptyFront.length);
 if (bases.length !== 4) report.problems.push('raid bases ' + bases.length);
 if (illegal?.placement) report.problems.push('illegal cell offered ' + illegal.placement);
 if (!illegal?.visible) report.problems.push('illegal cell has no box');
 await click(`document => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === '改為突襲進場')`);
 const raidMode = await settle(page => page.controls.includes('改為普通進場') && page.front.filter(slot => slot.placement === '普通進場').length === 0, 'raid mode hides empty cells');
 if (raidMode.front[0]?.placement) report.problems.push('illegal cell became selectable in raid mode ' + raidMode.front[0].placement);
 if (raidMode.energyLine.filter(slot => slot.placement === '選為突襲底座').length !== 4) report.problems.push('raid bases disappeared');
 await shot('neon-dual-raid-mode');
 await click(`document => document.querySelector('button.slot[data-placement="選為突襲底座"]')`);
 const baseLocked = await settle(page => page.front.some(slot => slot.placement === '突襲進場') && page.energyLine.some(slot => slot.placement === '突襲留後線' || slot.placement === '已選突襲底座'), 'raid base locked');
 await shot('neon-dual-raid-base');
 if (baseLocked.front[0]?.placement) report.problems.push('illegal cell became a raid destination');
 await click(`document => [...document.querySelectorAll('button.slot')].find(node => node.dataset.placement === '突襲進場')`);
 const raided = await settle(page => page.front[1]?.stack.startsWith('RAID') && page.energyLine[0]?.label.includes('空位') && page.front[1]?.rested === false, 'raid resolved');
 if (raided.energy !== 'green 3' || apText(raided) !== '2/3') report.problems.push('raid result energy ' + raided.energy + ' AP ' + raided.ap);
 await shot('neon-dual-raid-after');
 report.dual = {handClick, offered, raidMode, baseLocked, raided};

 const fresh = await openAudit('blc067dual');
 await click(`document => document.querySelector('button.handCard.playable')`);
 await settle(page => page.front.some(slot => slot.placement === '普通進場'), 'normal cells');
 await click(`document => [...document.querySelectorAll('button.slot')].find(node => node.dataset.placement === '普通進場')`);
 const normal = await settle(page => page.front[1]?.bp === '4000' && page.front[1]?.rested === true && apText(page) === '2/3', 'normal entry');
 await shot('neon-dual-normal-after');
 if (normal.energy !== fresh.energy) report.problems.push('normal entry changed energy ' + fresh.energy + ' -> ' + normal.energy);
 if (normal.front[1]?.stack) report.problems.push('normal entry gained a raid stack');
 report.dual.normal = normal;
 report.dual.energyBefore = fresh.energy;

 const squeezeStart = await openAudit('blc067dual');
 await click(`document => document.querySelector('button.handCard.playable')`);
 await click(`document => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === '改為突襲進場')`);
 await click(`document => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === '改為普通進場')`);
 const squeezeReady = await settle(page => page.energyLine[0]?.placement === '替換並移入移除區' && page.front[0]?.placement === '', 'squeeze cell');
 await shot('neon-dual-squeeze-ready');
 dialogs.mode = 'cancel';
 await click(`document => document.querySelector('button.slot[data-placement="替換並移入移除區"]')`);
 await pause(200);
 const cancelled = await read();
 if (apText(cancelled) !== '3/3' || cancelled.energyLine[0]?.placement !== '替換並移入移除區') report.problems.push('cancel changed the board');
 if (!dialogs.messages.some(item => item.text.includes('確認擠位') && item.accept === false)) report.problems.push('squeeze cancel was not shown');
 await shot('neon-dual-squeeze-cancelled');
 await click(`document => document.querySelector('button.slot[data-placement="替換並移入移除區"]')`);
 const squeezed = await settle(page => apText(page) === '2/3' && page.energyLine[0]?.rested === true && page.energyLine[0]?.label.includes('更木'), 'squeeze resolved');
 await shot('neon-dual-squeeze-reveal');
 await evaluate(`document.querySelector('.v2-public-move-overlay')?.click()`);
 await pause(300);
 await shot('neon-dual-squeeze-after');
 if (!dialogs.messages.some(item => item.text.includes('確認擠位') && item.accept === true)) report.problems.push('squeeze confirm was not accepted');
 const removed = squeezed.history.some(line => line.includes('移除')) || squeezed.energyLine[0]?.label.includes('更木');
 report.dual.squeeze = {squeezeReady, cancelled, squeezed, removed, dialogs: dialogs.messages.slice()};
 report.ok = report.problems.length === 0;
} catch (error) {
 report.problems.push(error?.message || String(error));
} finally {
 writeFileSync(new URL('../audit/ai-v3-neon-mobile-acceptance.json', import.meta.url), JSON.stringify(report, null, 2));
 console.log(JSON.stringify({ok: report.ok, problems: report.problems, shots: report.shots.length, dialogs: dialogs.messages.length}));
 browser?.close();
 chrome.kill();
 server.close();
}
if (!report.ok) process.exitCode = 1;
