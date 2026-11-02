import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOnlineRelease,fetchOnlineRelease,watchOnlineRelease} from '../dist/online-updates.mjs';
import {FakeNode} from './helpers/online-client-dom.mjs';

const origin='https://example.test';
const health=version=>({ok:true,uiVersion:version,uiScript:'/online-client-'+version+'.mjs'});

test('release metadata must identify the same local script and version',()=>{
 assert.deepEqual(parseOnlineRelease(health('ABCDEFGH'),origin),{version:'ABCDEFGH',script:origin+'/online-client-ABCDEFGH.mjs'});
 assert.equal(parseOnlineRelease({ok:true,uiVersion:'source',uiScript:'/online.mjs?v=source'},origin).version,'source');
 for(const data of [
  {...health('ABCDEFGH'),ok:false},
  {...health('ABCDEFGH'),uiVersion:42},
  {...health('ABCDEFGH'),uiScript:'https://outside.test/online-client-ABCDEFGH.mjs'},
  {...health('ABCDEFGH'),uiScript:'/online-client-IJKLMNOP.mjs'},
  {...health('ABCDEFGH'),uiScript:'/engine.mjs'},
  {...health('ABCDEFGH'),uiScript:'/online.mjs?v=old'},
 ])assert.throws(()=>parseOnlineRelease(data,origin));
});

test('the version handshake never accepts a cached or failed health response',async()=>{
 let received;
 const result=await fetchOnlineRelease(async(path,options)=>{
  received={path,options};return new Response(JSON.stringify(health('ABCDEFGH')));
 },origin);
 assert.equal(result.version,'ABCDEFGH');assert.equal(received.path,'/api/health');
 assert.equal(received.options.cache,'no-store');assert.equal(received.options.credentials,'same-origin');
 await assert.rejects(()=>fetchOnlineRelease(async()=>new Response('',{status:503}),origin));
});

test('an open room offers an update, preserves its URL, and never reloads without a click',async()=>{
 const doc=Object.assign(new EventTarget(),{hidden:false,body:new FakeNode('body'),createElement:tag=>new FakeNode(tag)});
 let reloads=0,timerCleared=false,next='ABCDEFGH',calls=0;
 const href=origin+'/online.html#ABCD2345';
 const win=Object.assign(new EventTarget(),{location:{origin,href,reload(){reloads++;}},setInterval(){return 1;},clearInterval(){timerCleared=true;}});
 const stop=watchOnlineRelease({version:next},{doc,win,fetcher:async()=>{calls++;return new Response(JSON.stringify(health(next)));}});
 const focus=async()=>{win.dispatchEvent(new Event('focus'));await new Promise(resolve=>setImmediate(resolve));};
 await focus();assert.equal(doc.body.children.length,0);
 next='IJKLMNOP';await focus();assert.equal(doc.body.children.length,1);assert.equal(reloads,0);
 let buttons=doc.body.querySelectorAll('button');buttons.find(node=>node.textContent==='稍後').handlers.click();
 await focus();assert.equal(doc.body.children.length,0,'a dismissed version stays quiet');
 next='QRSTUVWX';await focus();buttons=doc.body.querySelectorAll('button');
 buttons.find(node=>node.textContent==='更新介面').handlers.click();
 assert.equal(reloads,1);assert.equal(win.location.href,href,'updating must keep the original room URL');
 stop();const count=calls;await focus();assert.equal(calls,count);assert.equal(timerCleared,true);
});
