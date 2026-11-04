// Headless browser acceptance for the decision log.
// Starts the account server, plays a real solo mulligan and an online room,
// then checks the local queue against the cards that were on screen.
import {spawn} from 'node:child_process';
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {requireRegisteredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createHandler} from '../server/http.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)), '..');
const pack=requireRegisteredV2TitlePack('bleach');
const outDir=process.env.DECISION_BROWSER_OUT||'/tmp/decision-browser';
const password='correct-horse-1';

function assert(condition, message){
 if(!condition)throw Error(message);
}
async function listen(handler){
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0, '127.0.0.1', resolve));
 return {server, port:server.address().port, origin:'http://127.0.0.1:'+server.address().port};
}
async function api(origin, path, {method='GET', token, body}={}){
 const response=await fetch(origin+path, {
  method,
  headers:{
   ...(body!==undefined?{'content-type':'application/json'}:{}),
   ...(token?{authorization:'Bearer '+token}:{})
  },
  body:body!==undefined?JSON.stringify(body):undefined
 });
 const text=await response.text();
 let data=null;
 try{data=text?JSON.parse(text):null;}catch{data={raw:text};}
 return {status:response.status, data, text};
}
function launchChrome(port, profile){
 const chrome=spawn('/usr/local/bin/google-chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  '--remote-debugging-port='+port, '--user-data-dir='+profile, 'about:blank'
 ], {stdio:'ignore'});
 return chrome;
}
async function debuggerUrl(port){
 for(let attempt=0;attempt<50;attempt++){
  try{
   const response=await fetch('http://127.0.0.1:'+port+'/json/version');
   if(response.ok)return (await response.json()).webSocketDebuggerUrl;
  }catch{/* Chrome is still starting. */}
  await new Promise(resolve=>setTimeout(resolve, 100));
 }
 throw Error('Chrome 沒有開好除錯連接埠。');
}
function cdp(url){
 const ws=new WebSocket(url);
 let seq=0;
 const pending=new Map();
 const listeners=new Set();
 ws.addEventListener('message', event=>{
  const message=JSON.parse(event.data);
  if(message.id&&pending.has(message.id)){
   const job=pending.get(message.id);
   pending.delete(message.id);
   if(message.error)job.reject(Error(message.error.message));
   else job.resolve(message.result||{});
   return;
  }
  for(const listener of listeners)listener(message);
 });
 return new Promise((resolve, reject)=>{
  ws.addEventListener('open', ()=>resolve({
   ws,
   on(listener){listeners.add(listener);},
   send(method, params={}, sessionId){
    const id=++seq;
    return new Promise((ok, fail)=>{
     pending.set(id, {resolve:ok, reject:fail});
     ws.send(JSON.stringify({id, method, params, sessionId}));
    });
   },
   close(){ws.close();}
  }));
  ws.addEventListener('error', reject);
 });
}
async function openPage(browser, origin, token){
 const created=await browser.send('Target.createTarget', {url:'about:blank'});
 const attached=await browser.send('Target.attachToTarget', {targetId:created.targetId, flatten:true});
 const session=attached.sessionId;
 await browser.send('Page.enable', {}, session);
 await browser.send('Runtime.enable', {}, session);
 await browser.send('Network.enable', {}, session);
 await browser.send('Network.setCookie', {
  name:'ua_session', value:token, url:origin, httpOnly:true, sameSite:'Lax'
 }, session);
 return {session, targetId:created.targetId};
}
async function evaluate(browser, session, expression){
 const result=await browser.send('Runtime.evaluate', {
  expression, awaitPromise:true, returnByValue:true
 }, session);
 if(result.exceptionDetails){
  const detail=result.exceptionDetails.exception?.description||result.exceptionDetails.text||'頁面執行失敗';
  throw Error(detail);
 }
 return result.result?.value;
}
async function goto(browser, session, url){
 await browser.send('Page.navigate', {url}, session);
 for(let attempt=0;attempt<80;attempt++){
  const ready=await evaluate(browser, session, 'document.readyState');
  if(ready==='complete')return;
  await new Promise(resolve=>setTimeout(resolve, 100));
 }
 throw Error('頁面沒有載入完成：'+url);
}
const readQueue=`(()=>{
 const prefix='ua-v2-coach-queue-v1/item/';
 const migrated=localStorage.getItem('ua-v2-coach-queue-v1/migrated')==='1';
 const items=[];
 const seen=new Set();
 const push=item=>{
  if(!item||!item.body)return;
  const id=(item.body.accountId||'')+'\\n'+item.clientKey;
  if(seen.has(id))return;
  seen.add(id);
  items.push(item);
 };
 const order=JSON.parse(localStorage.getItem('ua-v2-coach-queue-v1/order')||'[]');
 const keyed=new Map();
 for(let index=0;index<localStorage.length;index++){
  const key=localStorage.key(index);
  if(!key||!key.startsWith(prefix))continue;
  try{keyed.set(key.slice(prefix.length), JSON.parse(localStorage.getItem(key)));}catch{}
 }
 if(Array.isArray(order))for(const id of order)push(keyed.get(id));
 for(const item of keyed.values())push(item);
 if(!migrated){
  try{for(const item of JSON.parse(localStorage.getItem('ua-v2-coach-queue-v1')||'[]'))push(item);}catch{}
 }
 return JSON.stringify(items);
})()`;
async function waitFor(browser, session, expression, label){
 for(let attempt=0;attempt<80;attempt++){
  const value=await evaluate(browser, session, expression);
  if(value)return value;
  await new Promise(resolve=>setTimeout(resolve, 250));
 }
 const text=await evaluate(browser, session, 'document.body?.innerText?.slice(0,500)||location.href').catch(error=>String(error));
 throw Error('等不到：'+label+'。頁面：'+text);
}
async function shot(browser, session, file){
 const image=await browser.send('Page.captureScreenshot', {format:'png'}, session);
 await writeFile(file, Buffer.from(image.data, 'base64'));
}
function namesOf(cardIds){
 return cardIds.map(id=>pack.cards[id]?.name||id);
}

const dir=await mkdtemp(join(tmpdir(), 'ua-browser-decision-'));
await mkdir(outDir, {recursive:true});
const handler=await createHandler({dataFile:join(dir, 'store.sqlite'), staticRoot:join(root, 'dist')});
const site=await listen(handler);
const origin=site.origin;
let chrome=null;
let online=null;
try{
 const registered=await api(origin, '/api/register', {method:'POST', body:{username:'瀏覽甲', password}});
 assert(registered.status===201, registered.text);
 const token=registered.data.token;
 const profile=join(dir, 'chrome');
 chrome=launchChrome(9333, profile);
 const browser=await cdp(await debuggerUrl(9333));
 const page=await openPage(browser, origin, token);
 await goto(browser, page.session, origin+'/universal-v2-preview.html');
 const consentDefault=await evaluate(browser, page.session, `(()=>{
  const box=document.querySelector('#coach-consent');
  return {checked:!!box?.checked, stored:localStorage.getItem('ua-v2-coach-consent')};
 })()`);
 assert(consentDefault.checked===false, '同意開關預設應該關閉');
 assert(consentDefault.stored!=='1', '尚未同意時不該寫入開啟');
 await shot(browser, page.session, join(outDir, 'solo-consent-off.png'));
 await evaluate(browser, page.session, `document.querySelector('#start-game').click()`);
 await waitFor(browser, page.session, `location.pathname==='/universal-v2-battle.html'`, '對戰桌面');
 await waitFor(browser, page.session, `[...document.querySelectorAll('button')].some(node=>node.textContent.includes('保留這 7 張手牌'))`, '起手牌按鈕');
 const offClick=await evaluate(browser, page.session, `(()=>{
  const button=[...document.querySelectorAll('button')].find(node=>node.textContent.includes('保留這 7 張手牌'));
  const names=[...document.querySelectorAll('.v2-mulligan-card span')].map(node=>node.textContent);
  const start=performance.now();
  button.click();
  return {ms:performance.now()-start, names, queue:${readQueue}};
 })()`);
 assert(JSON.parse(offClick.queue).length===0, '關閉收集時不該留下決策');
 await evaluate(browser, page.session, `(()=>{
  Storage.prototype.setItem=function(){};
  sessionStorage.removeItem('ua-v2-solo-battle-progress-v1');
  location.reload();
  return true;
 })()`);
 await waitFor(browser, page.session, `[...document.querySelectorAll('button')].some(node=>node.textContent.includes('保留這 7 張手牌'))`, '重開後的起手牌');
 const onClick=await evaluate(browser, page.session, `(()=>{
  const box=document.querySelector('.coach-consent input');
  box.checked=true;
  box.dispatchEvent(new Event('change', {bubbles:true}));
  const button=[...document.querySelectorAll('button')].find(node=>node.textContent.includes('保留這 7 張手牌'));
  const names=[...document.querySelectorAll('.v2-mulligan-card span')].map(node=>node.textContent);
  const card=document.querySelector('.v2-mulligan-card');
  card.click();
  const afterCard=${readQueue};
  const start=performance.now();
  button.click();
  return {ms:performance.now()-start, names, afterCard};
 })()`);
 assert(JSON.parse(onClick.afterCard).length===0, '點卡片不該變成決策');
 const queuedRaw=await waitFor(browser, page.session, `(()=>{
  const raw=${readQueue};
  return raw.includes('openingMulligan')?raw:'';
 })()`, '單人決策佇列');
 onClick.queue=queuedRaw;
 const queued=JSON.parse(queuedRaw);
 assert(queued.length===1, '同意後應該只留下玩家這一步');
 const row=queued[0].body;
 assert(row.source==='human' && row.actor==='human', '真人決策被標成別的來源');
 assert(row.decisionClass==='mulligan' && row.choice.mode==='keep', '紀錄的選擇不是畫面上的保留');
 assert(row.legal.length===2 && row.forced===false, '合法選項沒有保留與重抽');
 assert(row.observation.visible.players[1].hand===null, '對手手牌進入了訓練紀錄');
 assert(!JSON.stringify(row).includes('"seed"'), '訓練紀錄含有牌序種子');
 const recordedNames=namesOf(row.observation.visible.players[0].hand.map(card=>card.cardId));
 assert(recordedNames.join('\n')===onClick.names.join('\n'), '紀錄手牌和畫面手牌不同：'+recordedNames.join('、')+' / '+onClick.names.join('、'));
 await shot(browser, page.session, join(outDir, 'solo-after-keep.png'));
 await evaluate(browser, page.session, `(()=>{
  const box=document.querySelector('.coach-consent input');
  box.checked=false;
  box.dispatchEvent(new Event('change', {bubbles:true}));
  return true;
 })()`);
 const cleared=await waitFor(browser, page.session, `(()=>{
  const raw=${readQueue};
  return raw==='[]'?raw:'';
 })()`, '關閉同意後清空佇列');
 assert(JSON.parse(cleared).length===0, '關閉同意後尚未上傳的佇列應該被清掉');
 await new Promise(resolve=>setTimeout(resolve, 1500));
 await goto(browser, page.session, origin+'/coach.html');
 await waitFor(browser, page.session, `document.body.textContent.includes('匯出 JSONL')`, '教 AI 頁面');
 await shot(browser, page.session, join(outDir, 'coach-library.png'));
 browser.close();
 chrome.kill();
 chrome=null;

 const guest=await api(origin, '/api/register', {method:'POST', body:{username:'瀏覽乙', password}});
 const hostDeck=await api(origin, '/api/decks', {method:'POST', token, body:{
  name:'瀏覽房主', title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}, localId:'browser-host'}});
 const guestDeck=await api(origin, '/api/decks', {method:'POST', token:guest.data.token, body:{
  name:'瀏覽訪客', title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}, localId:'browser-guest'}});
 assert(hostDeck.data.deck.playable===true, JSON.stringify(hostDeck.data.deck.issues));
 const room=await api(origin, '/api/rooms', {method:'POST', token, body:{deckId:hostDeck.data.deck.id, first:'me'}});
 const joined=await api(origin, '/api/rooms/'+room.data.code+'/join', {method:'POST', token:guest.data.token, body:{deckId:guestDeck.data.deck.id}});
 assert(joined.status===200, joined.text);
 online=[
  launchChrome(9334, join(dir, 'host')),
  launchChrome(9335, join(dir, 'guest'))
 ];
 const hostBrowser=await cdp(await debuggerUrl(9334));
 const guestBrowser=await cdp(await debuggerUrl(9335));
 const hostPage=await openPage(hostBrowser, origin, token);
 const guestPage=await openPage(guestBrowser, origin, guest.data.token);
 await goto(hostBrowser, hostPage.session, origin+'/online.html#'+room.data.code);
 await goto(guestBrowser, guestPage.session, origin+'/online.html#'+room.data.code);
 await waitFor(hostBrowser, hostPage.session, `[...document.querySelectorAll('button')].some(node=>node.textContent.includes('保留這 7 張手牌'))`, '線上房主起手牌');
 const guestWaiting=await evaluate(guestBrowser, guestPage.session, `[...document.querySelectorAll('button')].some(node=>node.textContent.includes('保留這 7 張手牌'))`);
 assert(guestWaiting===false, '還沒輪到訪客時不該出現訪客的決策按鈕');
 await shot(hostBrowser, hostPage.session, join(outDir, 'online-host-mulligan.png'));
 const hostStarted=Date.now();
 await evaluate(hostBrowser, hostPage.session, `(()=>{
  const box=document.querySelector('.coach-consent input');
  box.checked=true;
  box.dispatchEvent(new Event('change', {bubbles:true}));
  const button=[...document.querySelectorAll('button')].find(node=>node.textContent.includes('保留這 7 張手牌'));
  button.click();
  return true;
 })()`);
 const hostQueueText=await waitFor(hostBrowser, hostPage.session, `(()=>{
  const raw=${readQueue};
  return raw.includes('openingMulligan')?raw:'';
 })()`, '線上房主決策佇列');
 const hostMove={ms:Date.now()-hostStarted, queue:hostQueueText};
 const hostRows=JSON.parse(hostMove.queue);
 assert(hostRows.length===1, '線上同意玩家應該記下自己的起手牌');
 assert(hostRows[0].body.channel==='online' && hostRows[0].body.seat===0, '線上紀錄座位不對');
 assert(hostRows[0].body.observation.visible.players[1].hand===null, '線上紀錄含有對手手牌');
 await waitFor(guestBrowser, guestPage.session, `[...document.querySelectorAll('button')].some(node=>node.textContent.includes('保留這 7 張手牌'))`, '輪到未同意的訪客');
 await evaluate(guestBrowser, guestPage.session, `(()=>{
  const button=[...document.querySelectorAll('button')].find(node=>node.textContent.includes('保留這 7 張手牌'));
  button.click();
  return true;
 })()`);
 await waitFor(guestBrowser, guestPage.session, `[...document.querySelectorAll('button')].every(node=>!node.textContent.includes('保留這 7 張手牌'))`, '訪客操作已被接受');
 const guestMove=await evaluate(guestBrowser, guestPage.session, readQueue);
 assert(JSON.parse(guestMove).length===0, '未同意的訪客決策不該被收集');
 const hostAfter=await evaluate(hostBrowser, hostPage.session, readQueue);
 const hostBodies=JSON.parse(hostAfter).map(item=>item.body).filter(body=>body.seat===1);
 assert(hostBodies.length===0, '房主不該收集到訪客的決策');
 await shot(guestBrowser, guestPage.session, join(outDir, 'online-guest-no-consent.png'));
 await new Promise(resolve=>setTimeout(resolve, 2000));
 const hostExport=await api(origin, '/api/coach/export.jsonl', {token});
 const guestExport=await api(origin, '/api/coach/export.jsonl', {token:guest.data.token});
 assert(hostExport.text.includes('"record":"decision"'), '房主的決策沒有上傳');
 assert(hostExport.text.includes('"seat":0'), '上傳的線上決策不是房主自己的座位');
 assert(!guestExport.text.includes('"record":"decision"'), '未同意的訪客帳號不該有決策');
 const report={
  soloConsentOffClickMs:Number(offClick.ms.toFixed(2)),
  soloConsentOnClickMs:Number(onClick.ms.toFixed(2)),
  soloQueuedBytes:onClick.queue.length,
  onlineHostClickMs:Number(hostMove.ms.toFixed(2)),
  onlineQueuedBytes:hostMove.queue.length,
  shownHand:onClick.names,
  recordedHand:namesOf(row.observation.visible.players[0].hand.map(card=>card.cardId))
 };
 console.log(JSON.stringify(report, null, 2));
 hostBrowser.close();
 guestBrowser.close();
}catch(error){
 console.error(error?.stack||error);
 process.exitCode=1;
}finally{
 chrome?.kill('SIGKILL');
 for(const child of online||[])child.kill('SIGKILL');
 await new Promise(resolve=>setTimeout(resolve, 300));
 await new Promise(resolve=>site.server.close(resolve));
 handler.close();
 await rm(dir, {recursive:true, force:true}).catch(()=>{});
}
