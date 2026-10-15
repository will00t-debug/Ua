#!/usr/bin/env node
// Desktop Chromium with MOBILE-VIEWPORT + touch EMULATION, NOT PHYSICAL PHONE.
// Run only with a pinned PR70 checkout. No NPM dependencies and no Production.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
const root=process.cwd(),out=process.env.V2_E_BROWSER_OUTPUT||path.resolve('audit/v2-e-browser');
fs.mkdirSync(out,{recursive:true});
const candidates=['google-chrome','chromium','chromium-browser'];
let executable=null;
for(const b of candidates)if(spawnSync('which',[b],{encoding:'utf8'}).status===0){executable=b;break;}
const report={test:'mobile_viewport_chromium_CDP',physicalPhone:false,
 chromeExecutable:executable,status:'not_run',node:process.version,
 cases:[],warnings:[],actions:[]};
let server,chrome,ws,profile;
const persist=()=>fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try{
 if(!executable){report.warnings.push('Chrome/Chromium not installed');persist();process.exit(0);}
 const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
 server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost/');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/,'')||'universal-v2-preview.html';
  const file=path.resolve(root,'dist',rel);
  if(!file.startsWith(path.resolve(root,'dist')+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{
   if(err){res.writeHead(404).end('Not found');return;}
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
   res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 profile=fs.mkdtempSync(path.join(os.tmpdir(),'v2-e-cdp-'));
 chrome=spawn(executable,['--headless=new','--no-sandbox','--disable-gpu',
  '--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],
 {stdio:'ignore'});
 const activePort=path.join(profile,'DevToolsActivePort');
 for(let n=0;n<70&&!fs.existsSync(activePort);n++)await delay(100);
 if(!fs.existsSync(activePort))throw Error('Chrome CDP did not start');
 const debugPort=Number(fs.readFileSync(activePort,'utf8').split('\n')[0]);
 const targets=await (await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();
 const target=targets.find(t=>t.type==='page');if(!target)throw Error('CDP page target missing');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let nextId=1;const pending=new Map(),events=[];
 ws.onmessage=e=>{
  let x;try{x=JSON.parse(e.data)}catch{return;}
  if(x.id&&pending.has(x.id)){const p=pending.get(x.id);pending.delete(x.id);
   x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result);}
  else if(x.method==='Runtime.exceptionThrown')events.push(JSON.stringify(x.params).slice(0,1000));
 };
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=nextId++;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error(method+' timed out'))}},15000);
 });
 const evalJs=async expr=>{
  const o=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  if(o.exceptionDetails)throw Error('Page JS '+JSON.stringify(o.exceptionDetails).slice(0,900));
  return o.result?.value;
 };
 await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/universal-v2-preview.html'});
 for(let n=0;n<100;n++){
  const loaded=await evalJs("document.readyState==='complete'&&!!document.querySelector('#start-game')");
  if(loaded)break;await delay(80);
 }
 await delay(650);
 let snap=await evalJs("({viewport:window.innerWidth,documentWidth:document.documentElement.scrollWidth,selects:[...document.querySelectorAll('#my-title option')].map(x=>x.value),error:document.querySelector('.alerts')?.textContent||''})");
 report.cases.push({name:'mobile viewport and static selection',result:snap});
 if(snap.selects.length!==2)throw Error('PR70 preview unexpectedly has '+snap.selects.length+' titles');
 if(snap.documentWidth>snap.viewport+3)report.warnings.push('document horizontally overflows viewport');
 await evalJs("(()=>{document.querySelector('#my-title').value='gurren-lagann';document.querySelector('#ai-title').value='bleach';document.querySelector('#match-seed').value='20261015';document.querySelector('#start-game').click();return true})()");
 await delay(500);
 snap=await evalJs("({started:!!document.querySelector('.board'),title:document.querySelector('.topbar h1')?.textContent,gameText:document.querySelector('#match-view')?.textContent.slice(0,250),error:document.querySelector('.alerts')?.textContent||''})");
 report.cases.push({name:'select titles, start 50-card match',result:snap});
 if(!snap.started||snap.error)throw Error('Preview failed to start a real browser match '+snap.error);
 for(let n=0;n<150;n++){
  const action=await evalJs("(()=>{const text=document.querySelector('#match-view')?.textContent||'';const done=/你獲勝了|電腦獲勝了/.test(text);if(done)return {done:true};const buttons=[...document.querySelectorAll('#match-view button')].filter(x=>!x.disabled);const next=buttons.find(x=>x.textContent.includes('前進下一階段'));if(next){next.click();return {done:false,action:'next'}};const skip=buttons.find(x=>/不使用|略過|跳過|放棄/.test(x.textContent));if(skip){skip.click();return {done:false,action:'skip'}};const first=buttons.find(x=>x.textContent.includes('查看全部合法操作'));if(first){first.click();return {done:false,action:'expand'}};return {done:false,action:'waiting',label:buttons.slice(0,6).map(x=>x.textContent.slice(0,50))}})()");
  report.actions.push(action);
  if(action.done){report.cases.push({name:'terminal result displayed via browser',pass:true,steps:n});break;}
  await delay(action.action==='waiting'?150:35);
 }
 const final=await evalJs("({finished:!!document.querySelector('.panel.win,.panel.lose'),error:document.querySelector('.alerts')?.textContent||'',bodyWidth:document.documentElement.scrollWidth})");
 report.cases.push({name:'browser interaction and finish state',result:final});
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 fs.writeFileSync(path.join(out,'chromium-mobile-390.png'),Buffer.from(shot.data,'base64'));
 report.jsExceptions=events.slice(0,12);
 report.status='pass_browser_smoke';
 if(final.error)report.status='fail_browser_error';
 if(!final.finished)report.warnings.push('Browser UI did not demonstrate a finished match in 150 assisted clicks; NOT full end-to-end acceptance');
}catch(e){report.status='fail';report.error=String(e?.stack||e);}
finally{
 persist();if(ws)ws.close();if(chrome)chrome.kill('SIGKILL');
 if(server)server.close();if(profile)fs.rmSync(profile,{recursive:true,force:true});
 console.log(JSON.stringify({status:report.status,cases:report.cases,warnings:report.warnings,error:report.error||null},null,2));
 if(report.status==='fail'||report.status==='fail_browser_error')process.exitCode=1;
}
