import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHandler} from '../server/http.mjs';
import {openDatabase} from '../server/sqlite.mjs';
import {BLEACH_GREEN_V2_COUNTS} from '../dist/universal-v2/preview-real-decks.mjs';

const password='correct-horse-1';

test('an existing deck table gains the share column and keeps the old row private',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-share-migrate-'));
 const file=join(dir,'old.sqlite');
 const raw=new DatabaseSync(file);
 raw.exec(`CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  counts_json TEXT NOT NULL,
  local_id TEXT,
  cover_id TEXT,
  updated_at TEXT NOT NULL
 )`);
 raw.exec(`INSERT INTO decks (id,user_id,name,title,counts_json,local_id,cover_id,updated_at)
  VALUES ('d0123456789abcdef','uold','舊白哉','bleach','{"034":1}',NULL,NULL,'2026-10-01T00:00:00.000Z')`);
 raw.close();
 const sql=openDatabase(file);
 try{
  const row=sql.get('SELECT name, shared FROM decks WHERE id=?','d0123456789abcdef');
  assert.equal(row.name,'舊白哉');
  assert.equal(Number(row.shared),0);
  const indexed=sql.get("SELECT name FROM sqlite_master WHERE type='index' AND name='decks_shared_updated'");
  assert.equal(indexed?.name,'decks_shared_updated');
 }finally{
  sql.close();
  await rm(dir,{recursive:true,force:true});
 }
});

test('a shared account deck is visible to another logged-in player and hidden again when unpublished',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-share-http-'));
 const handler=await createHandler({dataFile:join(dir,'accounts.sqlite'),staticRoot:null});
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const api=async(path,{method='GET',token,body}={})=>{
  const response=await fetch(base+path,{method,headers:{
   ...(token?{authorization:'Bearer '+token}:{}),
   ...(body!==undefined?{'content-type':'application/json'}:{})
  },body:body!==undefined?JSON.stringify(body):undefined});
  const text=await response.text();
  let data=null;
  try{data=text?JSON.parse(text):null;}catch{data={raw:text};}
  return {status:response.status,data};
 };
 try{
  assert.match(readFileSync(new URL('../worker/index.mjs',import.meta.url),'utf8'),/op:'listSharedDecks'/);
  assert.match(readFileSync(new URL('../worker/index.mjs',import.meta.url),'utf8'),/op:'setDeckShare'/);
  const owner=await api('/api/register',{method:'POST',body:{username:'玩家甲',password}});
  const guest=await api('/api/register',{method:'POST',body:{username:'玩家乙',password}});
  assert.equal(owner.status,201,JSON.stringify(owner.data));
  assert.equal(guest.status,201,JSON.stringify(guest.data));
  const saved=await api('/api/decks',{method:'POST',token:owner.data.token,body:{
   name:'白哉',title:'bleach',counts:{'034':1},localId:'byakuya-local'
  }});
  assert.equal(saved.status,200,JSON.stringify(saved.data));
  assert.equal(saved.data.deck.shared,false);
  const id=saved.data.deck.id;
  const hidden=await api('/api/shared-decks',{token:guest.data.token});
  assert.equal(hidden.status,200);
  assert.equal(hidden.data.decks.some(deck=>deck.id===id),false);
  assert.equal((await api('/api/shared-decks')).status,401);
  assert.equal((await api('/api/decks/'+id+'/share',{method:'PUT',token:guest.data.token,body:{shared:true}})).status,404);
  assert.equal((await api('/api/decks/'+id+'/share',{method:'PUT',token:owner.data.token,body:{shared:'yes'}})).status,400);
  const published=await api('/api/decks/'+id+'/share',{method:'PUT',token:owner.data.token,body:{shared:true}});
  assert.equal(published.status,200,JSON.stringify(published.data));
  assert.equal(published.data.deck.shared,true);
  const seen=await api('/api/shared-decks',{token:guest.data.token});
  assert.equal(seen.status,200);
  const row=seen.data.decks.find(deck=>deck.id===id);
  assert.ok(row,'guest share list includes the published deck');
  assert.equal(row.name,'白哉');
  assert.equal(row.owner,'玩家甲');
  assert.equal(row.counts['034'],1);
  assert.equal(Object.hasOwn(row,'localId'),false);
  assert.equal((await api('/api/decks',{token:guest.data.token})).data.decks.some(deck=>deck.name==='白哉'),false);
  const revised=await api('/api/decks/'+id,{method:'PUT',token:owner.data.token,body:{
   name:'白哉改',title:'bleach',counts:{'034':2}
  }});
  assert.equal(revised.status,200,JSON.stringify(revised.data));
  assert.equal(revised.data.deck.shared,true,'editing the list must not clear the public flag');
  const again=await api('/api/decks',{method:'POST',token:owner.data.token,body:{
   name:'白哉改',title:'bleach',counts:{'034':2},localId:'byakuya-local'
  }});
  assert.equal(again.data.deck.id,id);
  assert.equal(again.data.deck.shared,true,'saving by local id must keep the public flag');
  assert.equal((await api('/api/shared-decks',{token:guest.data.token})).data.decks.some(deck=>deck.id===id&&deck.name==='白哉改'),true);
  const withdrawn=await api('/api/decks/'+id+'/share',{method:'PUT',token:owner.data.token,body:{shared:false}});
  assert.equal(withdrawn.status,200);
  assert.equal((await api('/api/shared-decks',{token:guest.data.token})).data.decks.some(deck=>deck.id===id),false);
  const other=await api('/api/decks',{method:'POST',token:owner.data.token,body:{name:'私人',title:'bleach',counts:{'034':1}}});
  await api('/api/decks/'+id+'/share',{method:'PUT',token:owner.data.token,body:{shared:true}});
  assert.equal((await api('/api/decks/'+id,{method:'DELETE',token:owner.data.token})).status,200);
  const afterDelete=await api('/api/shared-decks',{token:guest.data.token});
  assert.equal(afterDelete.data.decks.some(deck=>deck.id===id||deck.name==='私人'),false);
  assert.equal(other.data.deck.shared,false);
 }finally{
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  handler.close();
  await rm(dir,{recursive:true,force:true});
 }
});

test('opening the deck page publishes a browser-only share flag and lets another deck be viewed',async()=>{
 const app={innerHTML:'',onclick:null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const ownId='d0123456789abcdef';
 const otherId='dabcdefabcdefabcd';
 const local=new Map([['ua-v2-deck-shared-ids-v1',JSON.stringify([ownId])]]);
 const calls=[];
 let shared=false;
 const ownDeck=()=>({
  id:ownId,name:'白哉',title:'bleach',counts:BLEACH_GREEN_V2_COUNTS,
  updatedAt:'2026-11-01T10:00:00.000Z',shared,playable:true,localId:'byakuya-local'
 });
 const otherDeck=()=>({
  id:otherId,name:'夜一的牌組',title:'bleach',counts:BLEACH_GREEN_V2_COUNTS,
  updatedAt:'2026-11-01T11:00:00.000Z',shared:true,playable:true,owner:'夜一'
 });
 const original={fetch:globalThis.fetch,setTimeout:globalThis.setTimeout};
 globalThis.document={querySelector:sel=>({'#app':app,'#toast':toast})[sel]||null,addEventListener(){}};
 globalThis.localStorage={getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,value)};
 globalThis.sessionStorage={getItem:()=>null,setItem(){},removeItem(){}};
 globalThis.window={location:{origin:'https://ua-arena.will00t.workers.dev',search:'',href:'https://ua-arena.will00t.workers.dev/index.html',assign(){}},scrollTo(){},history:{replaceState(){}}};
 globalThis.setTimeout=()=>0;
 globalThis.fetch=async(path,init={})=>{
  calls.push({path,init});
  if(path==='/api/me')return {ok:true,status:200,json:async()=>({username:'玩家甲'})};
  if(path==='/api/decks'&&(!init.method||init.method==='GET'))
   return {ok:true,status:200,json:async()=>({decks:[ownDeck()]})};
  if(path==='/api/shared-decks')
   return {ok:true,status:200,json:async()=>({decks:shared?[ownDeck(),otherDeck()]:[]})};
  if(path==='/api/decks/'+ownId+'/share'&&init.method==='PUT'){
   shared=JSON.parse(init.body).shared===true;
   return {ok:true,status:200,json:async()=>({deck:{...ownDeck(),owner:'玩家甲'}})};
  }
  return {ok:false,status:404,json:async()=>({error:'not found'})};
 };
 const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
 try{
  await import('../dist/v2-deck-editor.mjs?public-share-flow');
  for(let i=0;i<20&&!calls.some(call=>call.path==='/api/decks/'+ownId+'/share');i++)
   await new Promise(resolve=>setImmediate(resolve));
  const publish=calls.filter(call=>call.path==='/api/decks/'+ownId+'/share'&&call.init.method==='PUT');
  assert.equal(publish.length>=1,true,'a share stored only in this browser must be written to the account');
  assert.equal(JSON.parse(publish[0].init.body).shared,true);
  assert.equal(publish[0].init.credentials,'same-origin');
  for(let i=0;i<30&&!app.innerHTML.includes('夜一的牌組');i++){
   click({galleryTab:'shared'});
   await new Promise(resolve=>setImmediate(resolve));
  }
  assert.match(app.innerHTML,/大家的公開牌組/);
  assert.match(app.innerHTML,/白哉/);
  assert.match(app.innerHTML,/夜一的牌組/);
  assert.match(app.innerHTML,/夜一 公開/);
  assert.match(app.innerHTML,/data-deck-open="public:dabcdefabcdefabcd"/);
  click({deckOpen:'public:'+otherId});
  assert.match(app.innerHTML,/複製到我的牌組/);
  assert.match(app.innerHTML,/夜一 公開的牌組/);
  assert.match(app.innerHTML,/aria-label="已公開"/);
  assert.match(app.innerHTML,/disabled/);
  assert.doesNotMatch(app.innerHTML,/data-action="toggleShare"/);
  click({action:'editDeck'});
  assert.match(toast.textContent,/已複製到你的本機牌組/);
  const saved=JSON.parse(local.get('bleach-arena-saved-decks-v1'));
  assert.equal(saved.some(row=>row.name.includes('夜一的牌組')&&row.shared===false),true);
  assert.equal(calls.some(call=>String(call.path).includes(otherId)),false,'viewing never writes the other player deck');
  click({action:'backLibrary'});
  for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));
  click({galleryTab:'shared'});
  click({deckOpen:'cloud:'+ownId});
  const before=calls.length;
  click({action:'toggleShare'});
  for(let i=0;i<20&&calls.length===before;i++)await new Promise(resolve=>setImmediate(resolve));
  const unshare=calls.slice(before).find(call=>call.path==='/api/decks/'+ownId+'/share');
  assert.ok(unshare,'unshare must reach the account');
  assert.equal(JSON.parse(unshare.init.body).shared,false);
  for(let i=0;i<10&&!toast.textContent.includes('不會再看到');i++)await new Promise(resolve=>setImmediate(resolve));
  assert.match(toast.textContent,/其他玩家不會再看到/);
  for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));
 }finally{
  globalThis.fetch=original.fetch;
  globalThis.setTimeout=original.setTimeout;
  for(const key of ['document','localStorage','sessionStorage','window'])delete globalThis[key];
 }
});
