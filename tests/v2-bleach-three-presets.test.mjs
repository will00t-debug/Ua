import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLES} from '../dist/title-registry.mjs';
import {BUILTIN_BLEACH_V2_DECKS,builtinBleachDeck,renderBuiltinBleachPanel} from '../dist/v2-bleach-builtins.mjs';
import {DESIGNATED_BLEACH_DECKS} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {editorV2Status,toV2Counts} from '../dist/v2-editor-compat.mjs';

test('user blue, green, purple lists are imported with exact original print identities and quantities',()=>{
 assert.deepEqual(BUILTIN_BLEACH_V2_DECKS.map(d=>d.id),['reject-blue','white-sword','renruki']);
 assert.deepEqual(BUILTIN_BLEACH_V2_DECKS.map(d=>d.displayName),['藍色「我拒絕」','綠色「白劍」','紫色「戀露」']);
 const catalogue=new Map(TITLES.find(t=>t.id==='bleach').cards.map(c=>[c.identity||c.id,c]));
 for(const [index,d] of BUILTIN_BLEACH_V2_DECKS.entries()){
  const original=DESIGNATED_BLEACH_DECKS[index];
  assert.equal(d.name,original.name);
  assert.equal(d.total,50);
  assert.equal(d.kinds,13);
  assert.equal(Object.values(d.counts).reduce((n,c)=>n+c,0),50);
  assert.deepEqual(d.sources,original.entries.map(e=>({id:e.cardId,source:e.source,copies:e.copies})));
  assert.ok(d.sources.every(e=>{const c=catalogue.get(e.id);return c&&e.source.endsWith('/'+e.id)&&d.counts[c.id]===e.copies;}));
  assert.deepEqual(toV2Counts('bleach',d.counts),Object.fromEntries(original.entries.map(e=>[e.cardId,e.copies])));
  assert.equal(d.ready,editorV2Status('bleach',d.counts).ready);
  assert.equal(d.missingIds.length,d.kinds-d.registeredKinds);
  assert.equal(builtinBleachDeck(d.id),d);
 }
 assert.equal(builtinBleachDeck('does-not-exist'),null);
});
test('visible built-in deck panel displays all 3 options and honest V2 readiness, not legacy auto',()=>{
 const panel=renderBuiltinBleachPanel(v=>String(v).replace(/</g,'&lt;'));
 for(const d of BUILTIN_BLEACH_V2_DECKS){
  assert.ok(panel.includes('data-designated-preset="'+d.id+'"'));
  assert.ok(panel.includes(d.name));
  assert.ok(panel.includes(d.ready?'可以在 V2 正式對戰':'尚缺 '+d.missingIds.length+' 種效果'));
 }
 assert.doesNotMatch(panel,/可自動結算/);
});
test('official V2 lobby links all 3 decks to the same V2 editor without a legacy engine',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 const builder=readFileSync(new URL('../dist/v2-deck-editor.mjs',import.meta.url),'utf8');
 const index=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.match(preview,/bleachPreset='\+encodeURIComponent\(row.key\)/);
 assert.match(builder,/renderBuiltinBleachPanel/);
 assert.match(builder,/useDesignatedBleachPreset/);
 assert.match(index,/src="v2-deck-editor.mjs/);
 assert.doesNotMatch(index,/src="app.mjs/);
});
test('all 3 original lists load from preset buttons; existing saved user data remains untouched',async()=>{
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const originalSaved=JSON.stringify([{id:'keep-me',name:'我的自訂牌組',counts:{'034':4}}]);
 const originalDraft=JSON.stringify({'034':4});
 const storage=new Map([['bleach-arena-saved-decks-v1',originalSaved],['bleach-arena-deck-v1',originalDraft]]);
 const oldTimer=globalThis.setTimeout;
 globalThis.document={querySelector:sel=>({'#app':app,'#toast':toast})[sel]||null,addEventListener(){}};
 globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v)};
 globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v),removeItem:key=>storage.delete(key)};
 globalThis.window={location:{search:'',assign(){}},scrollTo(){}};
 globalThis.setTimeout=()=>0;
 try{
  await import('../dist/v2-deck-editor.mjs?test-three-bleach-decks');
  const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
  click({title:'bleach'});
  assert.match(app.innerHTML,/你之前提供的三副牌組/);
  for(const preset of BUILTIN_BLEACH_V2_DECKS){
   click({designatedPreset:preset.id});
   assert.deepEqual(Object.fromEntries(Object.entries(JSON.parse(storage.get('bleach-arena-deck-v1'))).filter(([,n])=>n)),preset.counts);
   assert.match(app.innerHTML,/牌組總覽/);
   assert.ok(app.innerHTML.includes('vdb-count-badge'));
   assert.ok(app.innerHTML.includes(preset.name));
   click({action:'visualExport'});
   for(const source of preset.sources)assert.ok(app.innerHTML.includes(source.copies+'x'+source.source),'Original printed card code missing: '+source.source);
   click({action:'dismiss'});
   assert.equal(storage.get('bleach-arena-saved-decks-v1'),originalSaved);
  }
  globalThis.window.location.search='?bleachPreset=white-sword';
  await import('../dist/v2-deck-editor.mjs?test-direct-white-sword-link');
  assert.deepEqual(Object.fromEntries(Object.entries(JSON.parse(storage.get('bleach-arena-deck-v1'))).filter(([,n])=>n)),builtinBleachDeck('white-sword').counts);
  assert.equal(storage.get('bleach-arena-saved-decks-v1'),originalSaved);
 }finally{
  globalThis.setTimeout=oldTimer;
  delete globalThis.document;delete globalThis.localStorage;delete globalThis.sessionStorage;delete globalThis.window;
 }
});
