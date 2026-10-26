import test, {after,before,describe} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {createHandler} from '../server/http.mjs';

const root=fileURLToPath(new URL('..', import.meta.url));
const password='correct-horse-1';
let ctx;

function storedUsers(file){
 const db=new DatabaseSync(file,{readOnly:true});
 try{return db.prepare('SELECT password_hash,password_salt,password_n FROM users').all();}
 finally{db.close();}
}

function rawGet(port,path){
 return new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port,path,method:'GET'},res=>{
   const chunks=[];
   res.on('data',chunk=>chunks.push(chunk));
   res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString('utf8')}));
  });
  req.on('error',reject);req.end();
 });
}
async function api(path,{method='GET',token,body,cookie}={}){
 const response=await fetch(ctx.base+path,{
  method,
  headers:{
   ...(body!==undefined?{'content-type':'application/json'}:{}),
   ...(token?{authorization:'Bearer '+token}:{}),
   ...(cookie?{cookie}:{})
  },
  body:body!==undefined?JSON.stringify(body):undefined
 });
 const text=await response.text();
 let data=null;
 try{data=text?JSON.parse(text):null;}catch{data={raw:text};}
 return {status:response.status,data,headers:response.headers,text};
}

test('account and online entry points are linked without loading a battle engine into the editor',()=>{
 const editor=readFileSync(new URL('../dist/v2-deck-editor.mjs',import.meta.url),'utf8');
 assert.match(editor,/href="\/online\.html"/);
 assert.match(editor,/\/api\/decks/);
 assert.doesNotMatch(editor,/from '\.\/engine\.mjs'/);
 assert.match(readFileSync(new URL('../dist/universal-v2-preview.html',import.meta.url),'utf8'),/href="\/online\.html"/);
 assert.match(readFileSync(new URL('../dist/online.html',import.meta.url),'utf8'),/src="online\.mjs"/);
 assert.match(readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8'),/對手手牌是隱藏的/);
});

describe('account server',{concurrency:1,timeout:180000},()=>{
 before(async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ua-acct-'));
  const dataFile=join(dir,'store.sqlite');
  const staticRoot=join(root,'dist');
  async function listen(handler){
   const server=createServer(handler);
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   ctx.server=server;
   ctx.handler=handler;
   ctx.port=server.address().port;
   ctx.base='http://127.0.0.1:'+ctx.port;
  }
  ctx={dataFile,async reopen(){
   await new Promise((resolve,reject)=>ctx.server.close(error=>error?reject(error):resolve()));
   ctx.handler.close();
   await listen(await createHandler({dataFile,staticRoot}));
  }};
  await listen(await createHandler({dataFile,staticRoot}));
  ctx.close=async()=>{
   if(ctx.server.listening)await new Promise((resolve,reject)=>ctx.server.close(error=>error?reject(error):resolve()));
   try{ctx.handler.close();}catch{/* The restart test may already have closed it. */}
   await rm(dir,{recursive:true,force:true});
  };
 });
 after(async()=>{if(ctx)await ctx.close();});

 test('health, account page and path traversal stay inside the site root',async()=>{
  const health=await api('/api/health');
  assert.equal(health.status,200);
  assert.equal(health.data.ok,true);
  const page=await api('/online.html');
  assert.equal(page.status,200);
  assert.match(page.text,/帳號與線上對戰/);
  const escaped=await rawGet(ctx.port,'/%2e%2e/%2e%2e/package.json');
  assert.equal(escaped.status,404);
  assert.equal(escaped.body.includes('"bleach-union-arena"'),false);
  const rootFile=await rawGet(ctx.port,'/package.json');
  assert.equal(rootFile.status,404);
 });

 test('registration keeps only a password hash and a session cookie',async()=>{
  const created=await api('/api/register',{method:'POST',body:{username:'玩家甲',password}});
  assert.equal(created.status,201);
  assert.equal(created.data.username,'玩家甲');
  const cookie=created.headers.get('set-cookie')||'';
  assert.match(cookie,/ua_session=[a-f0-9]{64}/);
  assert.match(cookie,/HttpOnly/);
  assert.match(cookie,/SameSite=Lax/);
  const stored=await readFile(ctx.dataFile);
  assert.equal(stored.includes(password),false);
  assert.equal(stored.includes(created.data.token),false);
  const users=storedUsers(ctx.dataFile);
  assert.equal(users.length>=1,true);
  assert.match(users[0].password_hash,/^[a-f0-9]{64}$/);
  assert.match(users[0].password_salt,/^[a-f0-9]{32}$/);
  assert.equal(users[0].password_n,16384);
  const me=await api('/api/me',{cookie:cookie.split(';')[0]});
  assert.equal(me.status,200);
  assert.equal(me.data.username,'玩家甲');
  const duplicate=await api('/api/register',{method:'POST',body:{username:'玩家甲',password}});
  assert.equal(duplicate.status,409);
  const folded=await api('/api/register',{method:'POST',body:{username:'HOST_RED',password}});
  assert.equal(folded.status,201,JSON.stringify(folded.data));
  const again=await api('/api/register',{method:'POST',body:{username:'host_red',password}});
  assert.equal(again.status,409);
  assert.equal((await api('/api/register',{method:'POST',body:{username:'短',password:'short'}})).status,400);
  const wrong=await api('/api/login',{method:'POST',body:{username:'玩家甲',password:'wrong-password'}});
  assert.equal(wrong.status,401);
  assert.equal((await readFile(ctx.dataFile,'utf8')).includes('wrong-password'),false);
  const loggedOut=await api('/api/logout',{method:'POST',token:created.data.token});
  assert.equal(loggedOut.status,200);
  assert.equal((await api('/api/me',{token:created.data.token})).status,401);
 });

 test('each account only sees and deletes its own decks',async()=>{
  const host=await api('/api/login',{method:'POST',body:{username:'host_red',password}});
  const guest=await api('/api/register',{method:'POST',body:{username:'guest_red',password}});
  assert.equal(host.status,200);
  const saved=await api('/api/decks',{method:'POST',token:host.data.token,body:{name:'只有房主',title:'bleach',counts:{'034':1}}});
  assert.equal(saved.status,200,JSON.stringify(saved.data));
  assert.equal(saved.data.deck.playable,false);
  const guestList=await api('/api/decks',{token:guest.data.token});
  assert.equal(guestList.status,200);
  assert.equal(JSON.stringify(guestList.data).includes('只有房主'),false);
  const removed=await api('/api/decks/'+saved.data.deck.id,{method:'DELETE',token:guest.data.token});
  assert.equal(removed.status,404);
  assert.equal((await api('/api/decks/'+saved.data.deck.id,{method:'DELETE',token:host.data.token})).status,200);
  assert.equal((await api('/api/decks',{token:host.data.token})).data.decks.some(deck=>deck.name==='只有房主'),false);
  assert.equal((await api('/api/rooms',{method:'POST',token:host.data.token,body:{deckId:'missing',first:'me'}})).status,404);
 });

 test('online match hides the opponent hand, deck order and life cards',async()=>{
  const host=await api('/api/login',{method:'POST',body:{username:'host_red',password}});
  const guest=await api('/api/login',{method:'POST',body:{username:'guest_red',password}});
  const outsider=await api('/api/register',{method:'POST',body:{username:'outsider',password}});
  const hostDeck=await api('/api/decks',{method:'POST',token:host.data.token,body:{
   name:'房主紫組',title:'bleach',counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS},localId:'host-purple'}});
  const guestDeck=await api('/api/decks',{method:'POST',token:guest.data.token,body:{
   name:'訪客紫組',title:'bleach',counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS},localId:'guest-purple'}});
  assert.equal(hostDeck.status,200,JSON.stringify(hostDeck.data));
  assert.equal(hostDeck.data.deck.playable,true,JSON.stringify(hostDeck.data.deck.issues));
  assert.equal(guestDeck.data.deck.playable,true,JSON.stringify(guestDeck.data.deck.issues));
  const thin=await api('/api/decks',{method:'POST',token:host.data.token,body:{name:'未完成',title:'bleach',counts:{'034':1}}});
  assert.equal((await api('/api/rooms',{method:'POST',token:host.data.token,body:{deckId:thin.data.deck.id,first:'me'}})).status,400);
  const created=await api('/api/rooms',{method:'POST',token:host.data.token,body:{deckId:hostDeck.data.deck.id,first:'me'}});
  assert.equal(created.status,201,JSON.stringify(created.data));
  assert.match(created.data.code,/^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(created.data.status,'waiting');
  assert.equal(JSON.stringify(created.data).includes('BLC-1-034'),false);
  assert.equal((await api('/api/rooms/'+created.data.code,{token:outsider.data.token})).status,404);
  assert.equal((await api('/api/rooms/'+created.data.code+'/join',{method:'POST',token:host.data.token,body:{deckId:hostDeck.data.deck.id}})).status,409);
  const joined=await api('/api/rooms/'+created.data.code+'/join',{method:'POST',token:guest.data.token,body:{deckId:guestDeck.data.deck.id}});
  assert.equal(joined.status,200,JSON.stringify(joined.data));
  assert.equal(joined.data.seat,1);
  assert.equal(joined.data.yourTurn,false);
  const hostView=await api('/api/rooms/'+created.data.code,{token:host.data.token});
  const guestView=joined;
  assert.equal(hostView.data.yourTurn,true);
  assert.equal(hostView.data.view.players[0].hand.length,7);
  assert.equal(hostView.data.view.players[1].hand,null);
  assert.equal(guestView.data.view.players[1].hand.length,7);
  assert.equal(guestView.data.view.players[0].hand,null);
  assert.match(JSON.stringify(hostView.data),/"uid":"0-/);
  assert.doesNotMatch(JSON.stringify(hostView.data),/"uid":"1-/);
  assert.match(JSON.stringify(guestView.data),/"uid":"1-/);
  assert.doesNotMatch(JSON.stringify(guestView.data),/"uid":"0-/);
  for(const secret of ['initialCounts','"rng"','"seed"','battleCounts','"password"']){
   assert.equal(JSON.stringify(hostView.data).includes(secret),false,secret);
   assert.equal(JSON.stringify(guestView.data).includes(secret),false,secret);
  }
  assert.ok(hostView.data.choices.length>0);
  assert.equal(guestView.data.choices.length,0);
  const early=await api('/api/rooms/'+created.data.code+'/actions',{method:'POST',token:guest.data.token,body:{index:0}});
  assert.equal(early.status,409);
  const acted=await api('/api/rooms/'+created.data.code+'/actions',{method:'POST',token:host.data.token,body:{index:0}});
  assert.equal(acted.status,200,JSON.stringify(acted.data));
  assert.ok(acted.data.revision>hostView.data.revision);
  assert.doesNotMatch(JSON.stringify(acted.data),/"uid":"1-/);
  const guestAfter=await api('/api/rooms/'+created.data.code,{token:guest.data.token});
  assert.doesNotMatch(JSON.stringify(guestAfter.data),/"uid":"0-/);
  assert.equal((await api('/api/rooms/'+created.data.code+'/actions',{method:'POST',token:host.data.token,body:{index:99}})).status,400);
  const resigned=await api('/api/rooms/'+created.data.code+'/resign',{method:'POST',token:host.data.token});
  assert.equal(resigned.status,200);
  assert.equal(resigned.data.status,'finished');
  assert.equal(resigned.data.winner.username,'guest_red');
  assert.equal(resigned.data.yourTurn,false);
  const second=await api('/api/rooms',{method:'POST',token:host.data.token,body:{deckId:hostDeck.data.deck.id,first:'random'}});
  assert.equal(second.status,201,JSON.stringify(second.data));
  assert.equal((await api('/api/rooms/'+second.data.code+'/cancel',{method:'POST',token:guest.data.token})).status,404);
  assert.equal((await api('/api/rooms/'+second.data.code+'/cancel',{method:'POST',token:host.data.token})).status,200);
  assert.equal((await api('/api/rooms/'+second.data.code,{token:host.data.token})).status,404);
 });

 test('accounts and an unfinished match survive a server restart',async()=>{
  const host=await api('/api/login',{method:'POST',body:{username:'host_red',password}});
  const guest=await api('/api/login',{method:'POST',body:{username:'guest_red',password}});
  const hostDeck=(await api('/api/decks',{token:host.data.token})).data.decks.find(deck=>deck.localId==='host-purple');
  const guestDeck=(await api('/api/decks',{token:guest.data.token})).data.decks.find(deck=>deck.localId==='guest-purple');
  const created=await api('/api/rooms',{method:'POST',token:host.data.token,body:{deckId:hostDeck.id,first:'me'}});
  assert.equal(created.status,201,JSON.stringify(created.data));
  await ctx.reopen();
  const waiting=await api('/api/rooms/'+created.data.code,{token:host.data.token});
  assert.equal(waiting.status,200,JSON.stringify(waiting.data));
  assert.equal(waiting.data.status,'waiting');
  assert.equal(JSON.stringify(waiting.data).includes('BLC-1-034'),false);
  const joined=await api('/api/rooms/'+created.data.code+'/join',{method:'POST',token:guest.data.token,body:{deckId:guestDeck.id}});
  assert.equal(joined.status,200,JSON.stringify(joined.data));
  assert.equal(joined.data.view.players[0].hand,null);
  assert.equal(joined.data.view.players[1].hand.length,7);
  await ctx.reopen();
  const again=await api('/api/rooms/'+created.data.code,{token:guest.data.token});
  assert.equal(again.status,200,JSON.stringify(again.data));
  assert.equal(again.data.status,'playing');
  assert.equal(again.data.view.players[1].hand.length,7);
  assert.equal(again.data.view.players[0].hand,null);
  assert.equal(JSON.stringify(again.data).includes('"uid":"0-"'),false);
  assert.equal(JSON.stringify(again.data).includes('initialCounts'),false);
  const me=await api('/api/me',{token:host.data.token});
  assert.equal(me.status,200);
  assert.equal(me.data.username,'HOST_RED');
 });
});
