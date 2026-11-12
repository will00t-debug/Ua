// Load the real browser modules and Worker, then compare them with Node
// on the same lethal shift. The page has no process global.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {buildAiV3Request,handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {openLethalShift} from './ai-v3-lethal-shift.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};

function fixed(packs,state,actor,extra={}){
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  actor,seed:1,...MATCH_LIMITS,nodes:48,ms:extra.ms??1e9,now:extra.now||(()=>0),
  hardNodes:0,meter,diagnose:true,...(extra.variant?{variant:extra.variant}:{})
 });
 const trace=lastAiV3Trace();
 return {
  action,reason:trace.reason,fallbackKind:trace.fallbackKind??null,fallbackFrom:trace.fallbackFrom??null,
  nodesUsed:trace.nodesUsed,score:trace.score??null,settled:trace.settled===true,
  dispatches:meter.dispatches,sequence:trace.sequence||[]
 };
}
function play(packs,state,sequence){
 let cursor=state;
 for(const step of sequence||[]){
  if(cursor.status!=='playing')break;
  const who=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(step))||
   legal.find(item=>item.type===step.type&&(item.uid||null)===(step.uid??null)&&(item.mode||null)===(step.mode??null)&&(item.slot??null)===(step.slot??null));
  if(!action)break;
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:who});
  if(assertUniversalMatch(packs,cursor)!==true)throw Error('replay broke the match');
 }
 for(let guard=0;guard<12&&cursor.status==='playing';guard++){
  const who=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>item.type==='chooseBlock'&&!item.uid)||
   legal.find(item=>item.type==='attack')||legal.find(item=>item.type==='next')||legal[0];
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:who});
 }
 return {status:cursor.status,winner:cursor.winner,endReason:cursor.endReason};
}
function summarize(row){
 return {
  type:row.action?.type||null,uid:row.action?.uid??null,reason:row.reason,
  fallbackKind:row.fallbackKind,fallbackFrom:row.fallbackFrom,nodesUsed:row.nodesUsed,
  score:row.score,settled:row.settled,dispatches:row.dispatches
 };
}

const seats=[];
for(const actor of [0,1]){
 const opened=openLethalShift(actor,{ban:true});
 const state=JSON.parse(JSON.stringify(opened.state));
 const packs=[opened.packs[0],opened.packs[0]];
 const nodeFixed=fixed(opened.packs,opened.state,actor);
 const cloneFixed=fixed(packs,state,actor);
 if(JSON.stringify(summarize(nodeFixed))!==JSON.stringify(summarize(cloneFixed)))
  throw Error('JSON state changed the Node search for seat '+actor);
 const request=buildAiV3Request(packs,state,actor,{requestId:1,stateVersion:1,seed:1,nodes:48,ms:1e9});
 const worker=handleAiV3Request(request);
 seats.push({
  actor,aizen:opened.aizen.uid,state,
  node:{
   fixed:summarize(nodeFixed),
   played:play(opened.packs,opened.state,nodeFixed.sequence),
   worker:{
    error:worker.error,action:worker.action,search:worker.search
   }
  }
 });
}

const pageBody=`<!doctype html><meta charset="utf-8"><script type="application/json" id="fixture">${JSON.stringify({seats}).replaceAll('<','\\u003c')}</script>
<script type="module">
import {officialV2Pack} from '/dist/universal-v2/official-entry.mjs';
import {legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '/dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '/dist/universal-v2/ai-v3/search.mjs';
import {buildAiV3Request,handleAiV3Request} from '/dist/universal-v2/ai-v3/worker-entry.mjs';
const fixture=JSON.parse(document.getElementById('fixture').textContent);
const pack=officialV2Pack('bleach');
function packs(){return [pack,pack];}
function view(action,trace,meter){
 return {type:action?.type||null,uid:action?.uid??null,reason:trace.reason||null,
  fallbackKind:trace.fallbackKind??null,fallbackFrom:trace.fallbackFrom??null,
  nodesUsed:trace.nodesUsed,score:trace.score??null,settled:trace.settled===true,
  dispatches:meter.dispatches};
}
function main(state,actor,extra){
 resetAiV3Report();
 const meter={dispatches:0};
 const action=chooseAiV3Action(packs(),state,{
  actor,seed:1,...MATCH_LIMITS,nodes:48,hardNodes:0,meter,diagnose:true,...extra
 });
 const trace=lastAiV3Trace();
 return {view:view(action,trace,meter),sequence:trace.sequence||[],legal:legalUniversalActions(packs(),state).some(item=>JSON.stringify(item)===JSON.stringify(action))};
}
function play(state,sequence){
 let cursor=state;
 const book=packs();
 for(const step of sequence||[]){
  if(cursor.status!=='playing')break;
  const who=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(book,cursor);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(step))||
   legal.find(item=>item.type===step.type&&(item.uid||null)===(step.uid??null)&&(item.mode||null)===(step.mode??null)&&(item.slot??null)===(step.slot??null));
  if(!action)break;
  cursor=dispatchUniversalAction(book,cursor,action,{actor:who});
  if(assertUniversalMatch(book,cursor)!==true)throw Error('browser replay broke the match');
 }
 for(let guard=0;guard<12&&cursor.status==='playing';guard++){
  const who=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(book,cursor);
  const action=legal.find(item=>item.type==='chooseBlock'&&!item.uid)||
   legal.find(item=>item.type==='attack')||legal.find(item=>item.type==='next')||legal[0];
  cursor=dispatchUniversalAction(book,cursor,action,{actor:who});
 }
 return {status:cursor.status,winner:cursor.winner??null,endReason:cursor.endReason||null};
}
function workerCall(state,actor,extra){
 const request=buildAiV3Request(packs(),state,actor,{requestId:1,stateVersion:1,seed:1,nodes:48,ms:extra.ms??MATCH_LIMITS.ms});
 if(extra.variant)request.variant=extra.variant;
 const worker=new Worker(new URL('/dist/universal-v2/ai-v3/browser-worker.mjs',import.meta.url),{type:'module'});
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{worker.terminate();reject(Error('worker timeout'));},20000);
  worker.onmessage=event=>{clearTimeout(timer);worker.terminate();resolve(event.data);};
  worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(Error(event.message||'worker error'));};
  worker.postMessage(request);
 });
}
const out=[];
for(const seat of fixture.seats){
 const fixed=main(seat.state,seat.actor,{ms:1e9,now:()=>0});
 const explicit=main(seat.state,seat.actor,{ms:1e9,now:()=>0,variant:'ab-front'});
 const timed=main(seat.state,seat.actor,{ms:40});
 const far=await workerCall(seat.state,seat.actor,{ms:1e9});
 const live=await workerCall(seat.state,seat.actor,{ms:40});
 const named=await workerCall(seat.state,seat.actor,{ms:1e9,variant:'ab-front'});
 out.push({
  actor:seat.actor,
  process:typeof process,
  fixed:fixed.view,
  played:play(seat.state,fixed.sequence),
  explicit:explicit.view,
  explicitPlayed:play(seat.state,explicit.sequence),
  timed:timed.view,
  timedLegal:timed.legal,
  worker:{error:far.error,action:far.action,search:far.search},
  workerLive:{error:live.error,action:live.action,search:live.search},
  workerNamed:{error:named.error,action:named.action,search:named.search}
 });
}
window.__entry=out;
</script>`;

function listen(){
 const server=createServer(async(request,response)=>{
  try{
   const url=new URL(request.url,'http://127.0.0.1');
   if(url.pathname==='/'){
    response.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    response.end(pageBody);
    return;
   }
   const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
   if(!relative||relative.includes('..'))throw Error('path');
   const file=join(root,relative);
   if(!file.startsWith(root))throw Error('path');
   const body=await readFile(file);
   response.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});
   response.end(body);
  }catch{
   response.writeHead(404);response.end('missing');
  }
 });
 return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server)));
}
function cdp(url){
 const ws=new WebSocket(url);
 let seq=0;
 const pending=new Map();
 return new Promise((resolve,reject)=>{
  ws.addEventListener('open',()=>resolve({
   send(method,params={},sessionId){
    const id=++seq;
    return new Promise((ok,fail)=>{
     pending.set(id,{ok,fail});
     ws.send(JSON.stringify({id,method,params,sessionId}));
    });
   },
   close(){ws.close();}
  }));
  ws.addEventListener('message',event=>{
   const message=JSON.parse(event.data);
   if(message.id&&pending.has(message.id)){
    const job=pending.get(message.id);
    pending.delete(message.id);
    if(message.error)job.fail(Error(message.error.message));
    else job.ok(message.result||{});
   }
  });
  ws.addEventListener('error',reject);
 });
}
const server=await listen();
const port=server.address().port;
const profile='/tmp/ai-v3-browser-entry-profile';
const chrome=spawn('/usr/bin/google-chrome',[
 '--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage',
 '--remote-debugging-port=9331','--user-data-dir='+profile,'about:blank'
],{stdio:'ignore'});
let browser;
try{
 let version=null;
 for(let attempt=0;attempt<50&&!version;attempt++){
  try{
   const response=await fetch('http://127.0.0.1:9331/json/version');
   if(response.ok)version=await response.json();
  }catch{await new Promise(resolve=>setTimeout(resolve,100));}
 }
 if(!version)throw Error('Chrome did not open a debugging port');
 browser=await cdp(version.webSocketDebuggerUrl);
 const created=await browser.send('Target.createTarget',{url:'about:blank'});
 const attached=await browser.send('Target.attachToTarget',{targetId:created.targetId,flatten:true});
 const session=attached.sessionId;
 await browser.send('Page.enable',{},session);
 await browser.send('Runtime.enable',{},session);
 await browser.send('Page.navigate',{url:'http://127.0.0.1:'+port+'/'},session);
 let page=null;
 for(let attempt=0;attempt<80&&!page;attempt++){
  const result=await browser.send('Runtime.evaluate',{
   expression:'window.__entry||null',awaitPromise:true,returnByValue:true
  },session);
  if(result.exceptionDetails){
   const detail=result.exceptionDetails.exception?.description||result.exceptionDetails.text;
   throw Error(detail);
  }
  page=result.result?.value;
  if(!page)await new Promise(resolve=>setTimeout(resolve,250));
 }
 if(!page)throw Error('the browser entry did not finish');
 const report={seats:page.map(row=>{
  const node=seats.find(seat=>seat.actor===row.actor);
  const sameFixed=JSON.stringify(row.fixed)===JSON.stringify(node.node.fixed);
  const sameWorker=JSON.stringify({
   type:row.worker.action?.type||null,uid:row.worker.action?.uid??null,
   reason:row.worker.search?.reason||null,nodesUsed:row.worker.search?.nodesUsed??null,
   score:row.worker.search?.score??null,settled:row.worker.search?.settled===true,
   fallbackKind:row.worker.search?.fallbackKind??null
  })===JSON.stringify({
   type:node.node.worker.action?.type||null,uid:node.node.worker.action?.uid??null,
   reason:node.node.worker.search?.reason||null,nodesUsed:node.node.worker.search?.nodesUsed??null,
   score:node.node.worker.search?.score??null,settled:node.node.worker.search?.settled===true,
   fallbackKind:node.node.worker.search?.fallbackKind??null
  });
  return {
   actor:row.actor,process:row.process,sameFixed,sameWorker,
   fixed:row.fixed,node:node.node.fixed,played:row.played,nodePlayed:node.node.played,
   explicit:row.explicit,explicitPlayed:row.explicitPlayed,
   timed:row.timed,timedLegal:row.timedLegal,
   worker:row.worker,workerLive:row.workerLive,workerNamed:row.workerNamed
  };
 })};
 const problems=[];
 for(const row of report.seats){
  if(row.process!=='undefined')problems.push('process '+row.actor);
  if(!row.sameFixed)problems.push('main '+row.actor);
  if(!row.sameWorker)problems.push('worker '+row.actor);
  if(row.played.winner!==row.actor||row.played.endReason!=='life-zero')problems.push('win '+row.actor);
  if(row.explicit.type!=='activate'||row.explicit.reason!=='search'||row.explicit.score!==100000)problems.push('variant '+row.actor);
  if(row.explicitPlayed.winner!==row.actor)problems.push('variant win '+row.actor);
  if(row.timed.fallbackKind==='exception'||row.timed.fallbackFrom==='process is not defined'||row.timed.dispatches!==row.timed.nodesUsed||row.timed.nodesUsed>48||!row.timedLegal)problems.push('40ms '+row.actor);
  if(row.workerLive.error||row.workerLive.search?.fallbackKind==='exception'||row.workerLive.search?.nodesUsed>48)problems.push('worker 40ms '+row.actor);
  if(row.workerNamed.error||row.workerNamed.search?.reason!=='search'||row.workerNamed.action?.type!=='activate')problems.push('worker variant '+row.actor);
 }
 console.log(JSON.stringify({ok:problems.length===0,problems,report},null,2));
 if(problems.length)process.exitCode=1;
}finally{
 browser?.close();
 chrome.kill();
 server.close();
}
