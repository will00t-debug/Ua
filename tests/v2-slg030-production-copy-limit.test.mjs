import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeEditorCounts,editorV2Status,registeredPackForEditor} from '../dist/v2-editor-compat.mjs';
import {SOLO_DRAFT_PRESET} from '../dist/solo-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {collectSavedV2LobbyDecks} from '../dist/universal-v2/lobby-saved-decks.mjs';
import {createHandler} from '../server/http.mjs';

// Official UA51BT/SLG-1-030: このカードはデッキに12枚まで入れられる。
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-030
const title='solo-leveling',soldier='SLG-1-030';
const alias='UAPR/SLG-1-030',number='UA51BT/SLG-1-030';
const counts={...SOLO_DRAFT_PRESET};
const overLimit={...counts,[soldier]:13,'SLG-1-001':3}; // Still exactly 50.

test('production normalization accepts 12 shadow soldiers, combining print aliases under one cap',()=>{
 assert.equal(normalizeEditorCounts(title,{[soldier]:12})[soldier],12);
 assert.deepEqual(normalizeEditorCounts(title,{[soldier]:4,[alias]:4,[number]:4}),{[soldier]:12});
 assert.throws(()=>normalizeEditorCounts(title,{[soldier]:13}),/無效/);
 assert.throws(()=>normalizeEditorCounts(title,{[soldier]:7,[alias]:6}),/超過 12 張/);
 assert.throws(()=>normalizeEditorCounts(title,{'SLG-1-001':5}),/無效/);
 for(const invalid of [-1,1.5,true,'12'])
  assert.throws(()=>normalizeEditorCounts(title,{[soldier]:invalid}),/無效/);
});

test('production battle validation accepts a 50-card deck with 12 soldiers and rejects 13 or an ordinary fifth copy',()=>{
 const pack=registeredPackForEditor(title),report=editorV2Status(title,counts,pack);
 assert.equal(report.ready,true,report.issues.join(';'));
 assert.deepEqual(report.counts,counts);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(editorV2Status(title,overLimit,pack).ready,false);
 assert.match(validateUniversalDeck(pack,overLimit).join(';'),/SLG-1-030 exceeds 0–12 copies/);
 assert.match(validateUniversalDeck(pack,{...counts,'SLG-1-001':5}).join(';'),/SLG-1-001 exceeds 0–4 copies/);
 assert.equal(editorV2Status(title,{...counts,[soldier]:11},pack).ready,false,'49 cards remain incomplete');
 assert.match(validateUniversalDeck(pack,{...counts,'SLG-1-040':4,'SLG-1-076':1}).join(';'),/SPECIAL Trigger limit exceeded/);
 const state=newUniversalMatch([pack,pack],{decks:[counts,counts],seed:30012,first:0});
 assert.equal(assertUniversalMatch([pack,pack],state),true);
 for(const player of state.players){
  const cards=['deck','hand','life','outside'].flatMap(zone=>player[zone]);
  assert.equal(cards.length,50);
  assert.equal(cards.filter(card=>card.cardId===soldier).length,12);
  assert.equal(new Set(cards.map(card=>card.uid)).size,50);
 }
});

test('saved 12-soldier decks remain visible and playable in the AI lobby',()=>{
 const stored=JSON.stringify([{id:'slg12',name:'十二張影之士兵',counts}]);
 const storage={getItem:key=>key==='ua-slg-saved-v1'?stored:null};
 const entries=collectSavedV2LobbyDecks(storage);
 assert.equal(entries.length,1);
 assert.equal(entries[0].ready,true,entries[0].issues.join(';'));
 assert.equal(entries[0].counts[soldier],12);
 assert.equal(storage.getItem('ua-slg-saved-v1'),stored);
});

test('production editor can add the twelfth soldier, save, reload and hand off all 12 to AI battle',async()=>{
 const memory=new Map([['ua-slg-draft-v1',JSON.stringify({...counts,[soldier]:11})]]);
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const originalTimer=globalThis.setTimeout;
 let destination=null;
 globalThis.document={querySelector:s=>({'#app':app,'#toast':toast})[s]||null,addEventListener(){}};
 globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 globalThis.sessionStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 globalThis.window={location:{assign:path=>{destination=path;}},scrollTo(){}};
 globalThis.setTimeout=()=>0;
 const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
 try{
  await import('../dist/v2-deck-editor.mjs?slg12-before-reload');
  click({deckOpen:'draft:'+title});click({action:'editDeck'});
  click({builderCount:soldier,delta:'1'});
  assert.equal(JSON.parse(memory.get('ua-slg-draft-v1'))[soldier],12);
  click({action:'saveDeck'});
  assert.equal(JSON.parse(memory.get('ua-slg-saved-v1'))[0].counts[soldier],12);
  assert.match(toast.textContent,/已儲存/);
  await import('../dist/v2-deck-editor.mjs?slg12-after-reload');
  click({deckOpen:'draft:'+title});click({action:'editDeck'});
  assert.match(app.innerHTML,/vdb-count-badge">×12/);
  click({builderCount:soldier,delta:'1'});
  assert.equal(JSON.parse(memory.get('ua-slg-draft-v1'))[soldier],12);
  click({action:'v2Play'});
  assert.match(destination,/universal-v2-preview\.html/);
  const transfer=JSON.parse(memory.get('ua-v2-editor-deck-v1'));
  assert.equal(transfer.counts[soldier],12);
  assert.equal(Object.values(transfer.counts).reduce((a,b)=>a+b,0),50);
 }finally{
  globalThis.setTimeout=originalTimer;
  for(const key of ['document','localStorage','sessionStorage','window'])delete globalThis[key];
 }
});

test('HTTP accounts can POST, PUT, reload and start an online match with 12 soldiers; invalid copies stay rejected',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-slg12-'));
 const handler=await createHandler({dataFile:join(dir,'store.sqlite'),staticRoot:fileURLToPath(new URL('../dist',import.meta.url))});
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 async function api(path,method='GET',body,token){
  const response=await fetch(base+path,{method,headers:{
   ...(body===undefined?{}:{'content-type':'application/json'}),
   ...(token?{authorization:'Bearer '+token}:{})
  },body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
 }
 try{
  const host=await api('/api/register','POST',{username:'slg12_host',password:'test-slg12-password'});
  const guest=await api('/api/register','POST',{username:'slg12_guest',password:'test-slg12-password'});
  assert.equal(host.status,201);assert.equal(guest.status,201);
  const token=host.data.token;
  const input={name:'十二張影之士兵',title,counts:{...counts,[soldier]:7,[alias]:5},localId:'slg12'};
  const saved=await api('/api/decks','POST',input,token);
  assert.equal(saved.status,200,JSON.stringify(saved.data));
  assert.equal(saved.data.deck.counts[soldier],12);
  assert.equal(saved.data.deck.playable,true,JSON.stringify(saved.data.deck.issues));
  assert.equal(saved.data.deck.counts[alias],undefined);
  const id=saved.data.deck.id;
  const updated=await api('/api/decks/'+id,'PUT',{name:'十二張影之士兵改',title,counts},token);
  assert.equal(updated.status,200,JSON.stringify(updated.data));
  assert.equal(updated.data.deck.id,id);
  assert.equal(updated.data.deck.counts[soldier],12);
  for(const invalid of [overLimit,{[soldier]:7,[alias]:6},{'SLG-1-001':5},{[soldier]:1.5},{[soldier]:-1},{[soldier]:true},{...counts,'SLG-1-005':1}]){
   assert.equal((await api('/api/decks','POST',{name:'非法牌組',title,counts:invalid},token)).status,400);
   assert.equal((await api('/api/decks/'+id,'PUT',{name:'非法更新',title,counts:invalid},token)).status,400);
  }
  const list=await api('/api/decks','GET',undefined,token);
  assert.equal(list.data.decks.length,1);
  assert.equal(list.data.decks[0].counts[soldier],12);
  assert.equal(list.data.decks[0].name,'十二張影之士兵改');
  assert.equal(list.data.decks[0].playable,true);
  const opponent=await api('/api/decks','POST',{name:'對手十二張',title,counts},guest.data.token);
  assert.equal(opponent.status,200,JSON.stringify(opponent.data));
  const room=await api('/api/rooms','POST',{deckId:id,first:'me'},token);
  assert.equal(room.status,201,JSON.stringify(room.data));
  const joined=await api('/api/rooms/'+room.data.code+'/join','POST',{deckId:opponent.data.deck.id},guest.data.token);
  assert.equal(joined.status,200,JSON.stringify(joined.data));
  assert.equal(joined.data.view.players[0].hand,null,'opponent hand remains private');
  assert.equal(joined.data.view.players[1].hand.length,7);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  handler.close();await rm(dir,{recursive:true,force:true});
 }
});
