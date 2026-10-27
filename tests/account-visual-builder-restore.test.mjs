import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createHandler} from '../server/http.mjs';
import {BLEACH_GREEN_V2_COUNTS} from '../dist/universal-v2/preview-real-decks.mjs';

const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('account portal prominently restores original picture editor and uses its exact existing files',()=>{
 const online=src('../dist/online.mjs');
 const html=src('../dist/index.html');
 const editor=src('../dist/v2-deck-editor.mjs');
 assert.match(online,/圖片式牌組構築/);
 assert.match(online,/開啟組卡畫面/);
 assert.match(online,/text:'圖片編輯'/);
 assert.match(online,/ua-account-visual-editor-v1/);
 assert.match(html,/visual-deck-builder\.css/);
 assert.match(html,/v2-deck-editor\.mjs/);
 assert.match(editor,/renderVisualDeckBuilder/);
 assert.match(editor,/importAccountDeckHandoff/);
 assert.doesNotMatch(html,/src="app\.mjs/);
 assert.match(editor,/state\.cloudOrigin/);
 assert.match(editor,/method=origin\?'PUT':'POST'/);
 assert.match(src('../worker/index.mjs'),/op:'updateDeck'/);
 assert.match(src('../server/http.mjs'),/service\.updateDeck/);
});

test('existing signed-in account deck opens original image builder; saving updates same remote ID without deleting other drafts',async()=>{
 const originalTimer=globalThis.setTimeout;
 const app={innerHTML:'',onclick:null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const otherId='keep-existing';
 const originalSaved=JSON.stringify([{id:otherId,name:'原本牌組',counts:{'034':4}}]);
 const originalDraft=JSON.stringify({'034':4});
 const local=new Map([['bleach-arena-saved-decks-v1',originalSaved],['bleach-arena-deck-v1',originalDraft]]);
 const remoteId='d0123456789abcdef';
 const staged=new Map([['ua-account-visual-editor-v1',JSON.stringify({title:'bleach',name:'帳號綠色牌組',counts:BLEACH_GREEN_V2_COUNTS,remoteId,localId:'original-green'})]]);
 const calls=[];
 globalThis.document={querySelector:sel=>({'#app':app,'#toast':toast})[sel]||null,addEventListener(){}};
 globalThis.localStorage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)};
 globalThis.sessionStorage={getItem:k=>staged.get(k)||null,setItem:(k,v)=>staged.set(k,v),removeItem:k=>staged.delete(k)};
 globalThis.window={location:{search:'',assign(){}},scrollTo(){}};
 globalThis.fetch=async(url,init)=>{calls.push({url,...init});return {ok:true,status:200};};
 globalThis.setTimeout=()=>0;
 try{
  await import('../dist/v2-deck-editor.mjs?account-restoration-verified');
  assert.match(app.innerHTML,/帳號綠色牌組/);
  assert.match(app.innerHTML,/牌組總覽/);
  assert.match(app.innerHTML,/正在圖片編輯帳號牌組/);
  assert.match(app.innerHTML,/vdb-review-cards/);
  assert.equal(staged.has('ua-account-visual-editor-v1'),false,'Transient account data must be consumed once');
  assert.equal(local.get('bleach-arena-deck-v1'),originalDraft,'Opening cloud deck must not wipe local draft');
  assert.equal(local.get('bleach-arena-saved-decks-v1'),originalSaved,'Opening cloud deck must not overwrite saved local decks');
  app.onclick({target:{closest:()=>({disabled:false,dataset:{action:'saveDeck'}})}});
  await Promise.resolve();await Promise.resolve();
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'/api/decks/'+remoteId);
  assert.equal(calls[0].method,'PUT');
  const body=JSON.parse(calls[0].body);
  assert.equal(body.title,'bleach');
  assert.equal(body.name,'帳號綠色牌組');
  assert.equal(Object.values(body.counts).reduce((n,v)=>n+v,0),50);
  const after=JSON.parse(local.get('bleach-arena-saved-decks-v1'));
  assert.ok(after.some(d=>d.id===otherId),'Other local saved decks must remain');
  assert.ok(after.some(d=>d.id==='original-green'),'Cloud source localId must remain stable');
 }finally{
  globalThis.setTimeout=originalTimer;
  for(const field of ['document','localStorage','sessionStorage','window','fetch'])delete globalThis[field];
 }
});

test('cloud deck PUT verifies account owner; preserves identity, local mapping, 50-card legality and database on unauthorized updates',async()=>{
 const root=new URL('../dist/',import.meta.url).pathname;
 const dir=await mkdtemp(join(tmpdir(),'ua-visual-edit-'));
 const file=join(dir,'accounts.sqlite');
 const handler=await createHandler({dataFile:file,staticRoot:root});
 const srv=createServer(handler);
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+srv.address().port;
 const api=async(path,{method='GET',token,body}={})=>{
  const res=await fetch(base+path,{method,headers:{
   ...(token?{authorization:'Bearer '+token}:{}),
   ...(body?{'content-type':'application/json'}:{})
  },body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json().catch(()=>({}))};
 };
 try{
  const a=await api('/api/register',{method:'POST',body:{username:'builder-owner',password:'safe-owner-password-123'}});
  const b=await api('/api/register',{method:'POST',body:{username:'builder-guest',password:'safe-guest-password-123'}});
  assert.equal(a.status,201,JSON.stringify(a.data));assert.equal(b.status,201,JSON.stringify(b.data));
  const saved=await api('/api/decks',{method:'POST',token:a.data.token,body:{
   title:'bleach',name:'原始綠牌',localId:'green-old',counts:BLEACH_GREEN_V2_COUNTS}});
  assert.equal(saved.status,200,JSON.stringify(saved.data));
  const id=saved.data.deck.id;
  assert.equal(saved.data.deck.playable,true);
  const change={title:'bleach',name:'圖片編輯後的新名稱',counts:BLEACH_GREEN_V2_COUNTS};
  const rejected=await api('/api/decks/'+id,{method:'PUT',token:b.data.token,body:change});
  assert.equal(rejected.status,404);
  const anonymous=await api('/api/decks/'+id,{method:'PUT',body:change});
  assert.equal(anonymous.status,401);
  const bad=await api('/api/decks/'+id,{method:'PUT',token:a.data.token,body:{...change,counts:{fake:4}}});
  assert.equal(bad.status,400);
  const edited=await api('/api/decks/'+id,{method:'PUT',token:a.data.token,body:change});
  assert.equal(edited.status,200,JSON.stringify(edited.data));
  assert.equal(edited.data.deck.id,id);
  assert.equal(edited.data.deck.name,change.name);
  assert.equal(edited.data.deck.localId,'green-old');
  assert.equal(edited.data.deck.playable,true);
  const list=await api('/api/decks',{token:a.data.token});
  assert.equal(list.data.decks.length,1,'Editing must not duplicate the existing deck');
  assert.equal(list.data.decks[0].id,id);
  const other=await api('/api/decks',{token:b.data.token});
  assert.equal(other.data.decks.length,0,'Never leak deck changes to another account');
  const index=await fetch(base+'/index.html');
  assert.equal(index.status,200);
  assert.match(await index.text(),/v2-deck-editor\.mjs/);
 }finally{
  await new Promise(resolve=>srv.close(resolve));
  handler.close();
  await rm(dir,{recursive:true,force:true});
 }
});
