import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {dispatchAccount,dispatchRoom,roomsToDrop} from '../server/domain.mjs';
import {createRepositories} from '../server/repos.mjs';
import {openDatabase} from '../server/sqlite.mjs';
import {createHandler} from '../server/http.mjs';
import {durableCancel,durableCreate,durableJoin,durableList,durableView} from '../worker/orchestrate.mjs';

const password='correct-horse-1';

test('empty hosted rooms close before a live match is resigned',()=>{
 const rooms=[
  {code:'AAAAAAA1',status:'waiting',role:'host',updatedAt:1,createdAt:1},
  {code:'AAAAAAA2',status:'opening',role:'host',updatedAt:2,createdAt:2},
  {code:'AAAAAAA3',status:'playing',role:'host',updatedAt:3,createdAt:3},
  {code:'AAAAAAA4',status:'playing',role:'guest',updatedAt:4,createdAt:4},
  {code:'AAAAAAA5',status:'playing',role:'host',updatedAt:5,createdAt:5}
 ];
 assert.deepEqual(roomsToDrop(rooms,false).map(room=>room.code),['AAAAAAA1','AAAAAAA2']);
 assert.deepEqual(roomsToDrop(rooms,true).map(room=>[room.code,room.how]),[
  ['AAAAAAA1','abandoned'],['AAAAAAA2','abandoned'],['AAAAAAA3','left']
 ]);
 const underCap=[
  {code:'BBBBBBB1',status:'waiting',role:'host',updatedAt:1,createdAt:1},
  {code:'BBBBBBB2',status:'playing',role:'host',updatedAt:2,createdAt:2},
  {code:'BBBBBBB3',status:'playing',role:'guest',updatedAt:3,createdAt:3}
 ];
 assert.deepEqual(roomsToDrop(underCap,true).map(room=>room.code),['BBBBBBB1']);
});

function bind(file,kind){
 const sql=openDatabase(file);
 const repos=createRepositories(sql);
 const now=()=>Date.now();
 return {
  call(message){
   return sql.transaction(()=>kind==='account'?dispatchAccount(repos,message,now()):dispatchRoom(repos,message,now()));
  },
  close(){sql.close();}
 };
}

async function api(base,path,{method='GET',token,body}={}){
 const response=await fetch(base+path,{
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
 return {status:response.status,data};
}

test('creating a room closes abandoned lobbies and can leave the oldest live match',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-room-cap-'));
 const accounts=bind(join(dir,'accounts.sqlite'),'account');
 const rooms=bind(join(dir,'rooms.sqlite'),'room');
 const dataFile=join(dir,'node.sqlite');
 let server;
 try{
  const callAccount=message=>accounts.call(message);
  const callRoom=(code,message)=>{
   assert.equal(message.code,code);
   return rooms.call(message);
  };
  const host=callAccount({op:'register',username:'cap_host',password,ip:'10.1.0.1'});
  const guest=callAccount({op:'register',username:'cap_guest',password,ip:'10.1.0.2'});
  const other=callAccount({op:'register',username:'cap_other',password,ip:'10.1.0.3'});
  const save=(token,localId)=>callAccount({op:'saveDeck',token,input:{
   name:localId,title:'bleach',counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS},localId
  }}).deck;
  const hostDeck=save(host.token,'host');
  const guestDeck=save(guest.token,'guest');
  const otherDeck=save(other.token,'other');
  const hostUser=callAccount({op:'session',token:host.token});
  function seedWaiting(token,deckId){
   const prepared=callAccount({op:'prepareSeat',token,deckId});
   const reserved=callAccount({op:'reserve',userId:prepared.user.id});
   const created=callRoom(reserved.code,{op:'create',code:reserved.code,first:'me',...prepared});
   callAccount({op:'mark',code:reserved.code,status:created.status,updatedAt:created.updatedAt});
   return created.public.code;
  }
  const reserved=[];
  for(let i=0;i<3;i++)reserved.push(callAccount({op:'reserve',userId:hostUser.id}).code);
  assert.equal((await durableList(callAccount,{token:host.token})).rooms.length,3);
  const opened=await durableCreate(callAccount,callRoom,{token:host.token,deckId:hostDeck.id,first:'me'});
  assert.equal(opened.status,'waiting');
  assert.deepEqual(opened.released.map(item=>item.how),['abandoned','abandoned','abandoned']);
  const afterOpen=await durableList(callAccount,{token:host.token});
  assert.deepEqual(afterOpen.rooms.map(room=>room.code),[opened.code]);
  for(const code of reserved)assert.equal(afterOpen.rooms.some(room=>room.code===code),false);
  await durableCancel(callAccount,callRoom,{token:host.token,code:opened.code});

  const kept=seedWaiting(other.token,otherDeck.id);
  const waiting=[];
  for(let i=0;i<3;i++)waiting.push(seedWaiting(host.token,hostDeck.id));
  const fourth=await durableCreate(callAccount,callRoom,{token:host.token,deckId:hostDeck.id,first:'random'});
  assert.equal(fourth.status,'waiting');
  assert.deepEqual(fourth.released.map(item=>item.code),waiting);
  const hostList=await durableList(callAccount,{token:host.token});
  assert.deepEqual(hostList.rooms.map(room=>room.code),[fourth.code]);
  assert.equal(JSON.stringify(hostList).includes(kept),false);
  assert.equal(JSON.stringify(hostList).includes('battleCounts'),false);
  for(const code of waiting){
   await assert.rejects(()=>durableView(callAccount,callRoom,{token:host.token,code}),error=>error.status===404);
  }
  assert.equal((await durableView(callAccount,callRoom,{token:other.token,code:kept})).status,'waiting');
  await durableCancel(callAccount,callRoom,{token:host.token,code:fourth.code});

  const playing=[];
  for(let i=0;i<3;i++)playing.push(seedWaiting(host.token,hostDeck.id));
  for(const code of playing)await durableJoin(callAccount,callRoom,{token:guest.token,code,deckId:guestDeck.id});
  await assert.rejects(
   ()=>durableCreate(callAccount,callRoom,{token:host.token,deckId:hostDeck.id,first:'me'}),
   error=>error.status===429&&/3 個未結束/.test(error.message));
  const replaced=await durableCreate(callAccount,callRoom,{
   token:host.token,deckId:hostDeck.id,first:'me',replaceOldest:true});
  assert.equal(replaced.status,'waiting');
  assert.deepEqual(replaced.released,[{code:playing[0],how:'left'}]);
  const ended=await durableView(callAccount,callRoom,{token:guest.token,code:playing[0]});
  assert.equal(ended.status,'finished');
  assert.equal(ended.winner.username,'cap_guest');
  assert.equal((await durableView(callAccount,callRoom,{token:host.token,code:playing[1]})).status,'playing');
  assert.equal((await durableView(callAccount,callRoom,{token:other.token,code:kept})).status,'waiting');

  const handler=await createHandler({dataFile});
  server=createServer(handler);
  server.handler=handler;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const nodeHost=await api(base,'/api/register',{method:'POST',body:{username:'node_host',password}});
  const nodeGuest=await api(base,'/api/register',{method:'POST',body:{username:'node_guest',password}});
  const nodeOther=await api(base,'/api/register',{method:'POST',body:{username:'node_other',password}});
  async function deck(token,name){
   const saved=await api(base,'/api/decks',{method:'POST',token,body:{
    name,title:'bleach',counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS},localId:name}});
   assert.equal(saved.status,200,JSON.stringify(saved.data));
   return saved.data.deck.id;
  }
  const nodeHostDeck=await deck(nodeHost.data.token,'node-host');
  const nodeGuestDeck=await deck(nodeGuest.data.token,'node-guest');
  const nodeOtherDeck=await deck(nodeOther.data.token,'node-other');
  assert.equal((await api(base,'/api/rooms')).status,401);
  const otherRoom=await api(base,'/api/rooms',{method:'POST',token:nodeOther.data.token,body:{deckId:nodeOtherDeck,first:'me'}});
  assert.equal(otherRoom.status,201,JSON.stringify(otherRoom.data));
  const first=await api(base,'/api/rooms',{method:'POST',token:nodeHost.data.token,body:{deckId:nodeHostDeck,first:'me'}});
  assert.equal(first.status,201,JSON.stringify(first.data));
  const second=await api(base,'/api/rooms',{method:'POST',token:nodeHost.data.token,body:{deckId:nodeHostDeck,first:'opponent'}});
  assert.equal(second.status,201,JSON.stringify(second.data));
  assert.deepEqual(second.data.released,[{code:first.data.code,how:'abandoned'}]);
  assert.equal((await api(base,'/api/rooms/'+first.data.code,{token:nodeHost.data.token})).status,404);
  const listed=await api(base,'/api/rooms',{token:nodeHost.data.token});
  assert.deepEqual(listed.data.rooms.map(room=>room.code),[second.data.code]);
  assert.equal(JSON.stringify(listed.data).includes(otherRoom.data.code),false);
  assert.equal((await api(base,'/api/rooms/'+otherRoom.data.code,{token:nodeOther.data.token})).status,200);
  const live=[second.data.code];
  assert.equal((await api(base,'/api/rooms/'+second.data.code+'/join',{method:'POST',token:nodeGuest.data.token,body:{deckId:nodeGuestDeck}})).status,200);
  for(let i=0;i<2;i++){
   const created=await api(base,'/api/rooms',{method:'POST',token:nodeHost.data.token,body:{deckId:nodeHostDeck,first:'me'}});
   assert.equal(created.status,201,JSON.stringify(created.data));
   live.push(created.data.code);
   assert.equal((await api(base,'/api/rooms/'+created.data.code+'/join',{method:'POST',token:nodeGuest.data.token,body:{deckId:nodeGuestDeck}})).status,200);
  }
  const blocked=await api(base,'/api/rooms',{method:'POST',token:nodeHost.data.token,body:{deckId:nodeHostDeck,first:'me'}});
  assert.equal(blocked.status,429);
  assert.match(blocked.data.error,/3 個未結束/);
  const swapped=await api(base,'/api/rooms',{method:'POST',token:nodeHost.data.token,body:{deckId:nodeHostDeck,first:'me',replaceOldest:true}});
  assert.equal(swapped.status,201,JSON.stringify(swapped.data));
  assert.deepEqual(swapped.data.released,[{code:live[0],how:'left'}]);
  const finished=await api(base,'/api/rooms/'+live[0],{token:nodeGuest.data.token});
  assert.equal(finished.data.status,'finished');
  assert.equal(finished.data.winner.username,'node_guest');
  assert.equal((await api(base,'/api/rooms/'+live[1],{token:nodeHost.data.token})).data.status,'playing');
  assert.equal((await api(base,'/api/rooms/'+otherRoom.data.code,{token:nodeOther.data.token})).data.status,'waiting');
 }finally{
  accounts.close();
  rooms.close();
  try{server?.handler?.close();}catch{/* The HTTP database may already be closed. */}
  if(server?.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  await rm(dir,{recursive:true,force:true});
 }
});
