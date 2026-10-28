import test from 'node:test';
import assert from 'node:assert/strict';
import {BLEACH_GREEN_V2_COUNTS} from '../dist/universal-v2/preview-real-decks.mjs';

test('signed-in user can open a cloud deck in library, inspect cards, edit and PUT the original deck',async()=>{
 const app={innerHTML:'',onclick:null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const local=new Map(),session=new Map();
 const original={fetch:globalThis.fetch,setTimeout:globalThis.setTimeout};
 const deckId='d0123456789abcdef',first=Object.keys(BLEACH_GREEN_V2_COUNTS)[0];
 const record={id:deckId,name:'雲端白劍',title:'bleach',counts:BLEACH_GREEN_V2_COUNTS,
  updatedAt:'2026-10-28T00:00:00Z',localId:'original-green',playable:true};
 const calls=[];
 globalThis.document={querySelector:sel=>({'#app':app,'#toast':toast})[sel]||null,addEventListener(){}};
 globalThis.localStorage={getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,value)};
 globalThis.sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,value),removeItem:key=>session.delete(key)};
 globalThis.window={location:{origin:'https://ua-arena.will00t.workers.dev',search:'',assign(){}},scrollTo(){}};
 globalThis.setTimeout=()=>0;
 globalThis.fetch=async(path,init={})=>{
  calls.push({path,init});
  if(path==='/api/me')return {ok:true,status:200,json:async()=>({username:'accountA'})};
  if(path==='/api/decks'&&(!init.method||init.method==='GET'))
   return {ok:true,status:200,json:async()=>({decks:[record]})};
  if(path==='/api/decks/'+deckId&&init.method==='PUT')
   return {ok:true,status:200,json:async()=>({deck:{...record,counts:JSON.parse(init.body).counts}})};
  throw Error('Unexpected API: '+path);
 };
 try{
  await import('../dist/v2-deck-editor.mjs?library-account-flow');
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.innerHTML,/我的牌組/);
  assert.match(app.innerHTML,/雲端白劍/);
  assert.match(app.innerHTML,/data-deck-open="cloud:d0123456789abcdef"/);
  const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
  click({deckOpen:'cloud:'+deckId});
  assert.match(app.innerHTML,/牌組詳情/);
  assert.match(app.innerHTML,/data-inspect=/);
  assert.match(app.innerHTML,/編輯牌組/);
  assert.doesNotMatch(app.innerHTML,/data-builder-count=/);
  click({action:'editDeck'});
  assert.match(app.innerHTML,/data-builder-count=/);
  assert.match(app.innerHTML,/正在圖片編輯帳號牌組/);
  click({builderCount:first,delta:'-1'});
  click({action:'saveDeck'});
  await new Promise(resolve=>setImmediate(resolve));
  const write=calls.filter(x=>x.path==='/api/decks/'+deckId&&x.init.method==='PUT');
  assert.equal(write.length,1,'must update the existing cloud record rather than create a new one');
  assert.equal(JSON.parse(write[0].init.body).counts[first],BLEACH_GREEN_V2_COUNTS[first]-1);
  assert.equal(JSON.parse(write[0].init.body).name,'雲端白劍');
  click({action:'backLibrary'});
  assert.match(app.innerHTML,/我的牌組/);
  assert.match(app.innerHTML,/雲端白劍/);
 }finally{
  globalThis.fetch=original.fetch;globalThis.setTimeout=original.setTimeout;
  for(const key of ['document','localStorage','sessionStorage','window'])delete globalThis[key];
 }
});
