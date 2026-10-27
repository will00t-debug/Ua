import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {dispatchAccount,dispatchRoom} from '../server/domain.mjs';
import {createRepositories} from '../server/repos.mjs';
import {openDatabase} from '../server/sqlite.mjs';
import {durableCreate,durableJoin,durableView} from '../worker/orchestrate.mjs';

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

test('split account book and match rooms keep hidden cards after both stores reopen',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-durable-'));
 const accounts=bind(join(dir,'accounts.sqlite'),'account');
 const rooms=bind(join(dir,'rooms.sqlite'),'room');
 try{
  const callAccount=message=>accounts.call(message);
  const callRoom=(code,message)=>{
   assert.equal(message.code,code);
   return rooms.call(message);
  };
  const host=callAccount({op:'register',username:'房主',password,ip:'10.0.0.1'});
  const guest=callAccount({op:'register',username:'訪客',password,ip:'10.0.0.2'});
  const hostDeck=callAccount({op:'saveDeck',token:host.token,input:{
   name:'房主紫組',title:'bleach',counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS},localId:'host'}}).deck;
  const guestDeck=callAccount({op:'saveDeck',token:guest.token,input:{
   name:'訪客紫組',title:'bleach',counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS},localId:'guest'}}).deck;
  const created=await durableCreate(callAccount,callRoom,{token:host.token,deckId:hostDeck.id,first:'opponent'});
  assert.equal(created.status,'waiting');
  assert.equal(JSON.stringify(created).includes('battleCounts'),false);
  const joined=await durableJoin(callAccount,callRoom,{token:guest.token,code:created.code,deckId:guestDeck.id});
  assert.equal(joined.seat,1);
  assert.equal(joined.youAreFirst,true);
  assert.equal(joined.view.players[1].hand.length,7);
  assert.equal(joined.view.players[0].hand,null);
  assert.match(JSON.stringify(joined),/"uid":"1-/);
  assert.doesNotMatch(JSON.stringify(joined),/"uid":"0-/);
  accounts.close();
  rooms.close();
  const accountsAgain=bind(join(dir,'accounts.sqlite'),'account');
  const roomsAgain=bind(join(dir,'rooms.sqlite'),'room');
  try{
   const viewed=await durableView(
    message=>accountsAgain.call(message),
    (code,message)=>roomsAgain.call(message),
    {token:host.token,code:created.code});
   assert.equal(viewed.status,'playing');
   assert.equal(viewed.seat,0);
   assert.equal(viewed.view.players[0].hand.length,7);
   assert.equal(viewed.view.players[1].hand,null);
   assert.match(JSON.stringify(viewed),/"uid":"0-/);
   assert.doesNotMatch(JSON.stringify(viewed),/"uid":"1-/);
   assert.equal(JSON.stringify(viewed).includes('initialCounts'),false);
   assert.equal(JSON.stringify(viewed).includes('"seed"'),false);
  }finally{
   accountsAgain.close();
   roomsAgain.close();
  }
 }finally{
  try{accounts.close();}catch{/* Closed before the reopen. */}
  try{rooms.close();}catch{/* Closed before the reopen. */}
  await rm(dir,{recursive:true,force:true});
 }
});
