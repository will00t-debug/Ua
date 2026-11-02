import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {aotPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {dispatchAccount,dispatchRoom} from '../server/domain.mjs';
import {createRepositories} from '../server/repos.mjs';
import {openDatabase} from '../server/sqlite.mjs';
import {durableAct,durableCreate,durableJoin,durableView} from '../worker/orchestrate.mjs';

const password='correct-horse-1';

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

test('Attack on Titan practice decks can be saved and played in an online room',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-aot-online-'));
 const accounts=bind(join(dir,'accounts.sqlite'),'account');
 const rooms=bind(join(dir,'rooms.sqlite'),'room');
 try{
  const callAccount=message=>accounts.call(message);
  const callRoom=(code,message)=>{
   assert.equal(message.code,code);
   return rooms.call(message);
  };
  const practice=aotPracticeDeck();
  const host=callAccount({op:'register',username:'aot_host',password,ip:'10.8.0.1'});
  const guest=callAccount({op:'register',username:'aot_guest',password,ip:'10.8.0.2'});
  const saved=token=>callAccount({op:'saveDeck',token,input:{
   name:'紅色練習組',title:'aot',counts:{...practice.counts},localId:'aot-red-'+token.slice(0,8)
  }}).deck;
  const hostDeck=saved(host.token);
  const guestDeck=saved(guest.token);
  assert.equal(hostDeck.title,'aot');
  assert.equal(hostDeck.titleLabel,'進擊的巨人');
  assert.equal(hostDeck.playable,true,hostDeck.issues.join('；'));
  assert.equal(guestDeck.playable,true,guestDeck.issues.join('；'));
  const thin=callAccount({op:'saveDeck',token:host.token,input:{
   name:'未完成',title:'aot',counts:{'AOT-1-001':1}
  }}).deck;
  assert.equal(thin.playable,false);
  await assert.rejects(
   ()=>durableCreate(callAccount,callRoom,{token:host.token,deckId:thin.id,first:'me'}),
   error=>error.status===400);
  const created=await durableCreate(callAccount,callRoom,{token:host.token,deckId:hostDeck.id,first:'me'});
  assert.equal(created.status,'waiting');
  assert.equal(created.you.title,'aot');
  assert.equal(created.you.titleLabel,'進擊的巨人');
  const joined=await durableJoin(callAccount,callRoom,{token:guest.token,code:created.code,deckId:guestDeck.id});
  assert.equal(joined.status,'playing');
  assert.equal(joined.seat,1);
  assert.equal(joined.you.titleLabel,'進擊的巨人');
  assert.equal(joined.opponent.titleLabel,'進擊的巨人');
  assert.equal(joined.view.phase,'setup');
  assert.equal(joined.view.players[1].hand.length,7);
  assert.equal(joined.view.players[0].hand,null);
  assert.equal(joined.choices.length,0);
  const hostView=await durableView(callAccount,callRoom,{token:host.token,code:created.code});
  assert.equal(hostView.yourTurn,true);
  assert.equal(hostView.view.players[0].hand.length,7);
  assert.equal(hostView.view.players[1].hand,null);
  assert.equal(hostView.choices[0].type,'openingMulligan');
  assert.equal(hostView.choices[0].mode,'keep');
  assert.match(JSON.stringify(hostView),/"uid":"0-/);
  assert.doesNotMatch(JSON.stringify(hostView),/"uid":"1-/);
  assert.match(JSON.stringify(joined),/"uid":"1-/);
  assert.doesNotMatch(JSON.stringify(joined),/"uid":"0-/);
  const hostKept=await durableAct(callAccount,callRoom,{token:host.token,code:created.code,index:0});
  assert.equal(hostKept.yourTurn,false);
  assert.doesNotMatch(JSON.stringify(hostKept),/"uid":"1-/);
  const guestKept=await durableAct(callAccount,callRoom,{token:guest.token,code:created.code,index:0});
  assert.equal(guestKept.view.phase,'start');
  assert.equal(guestKept.view.players[0].lifeCount,7);
  assert.equal(guestKept.view.players[1].lifeCount,7);
  assert.equal(guestKept.view.players[0].hand,null);
  assert.equal(guestKept.you.title,'aot');
 }finally{
  try{accounts.close();}catch{/* The test database is removed next. */}
  try{rooms.close();}catch{/* The test database is removed next. */}
  await rm(dir,{recursive:true,force:true});
 }
});
