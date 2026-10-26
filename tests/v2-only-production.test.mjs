import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLES} from '../dist/title-registry.mjs';
import {BLEACH_GREEN_V2_COUNTS} from '../dist/universal-v2/preview-real-decks.mjs';
import {LEGACY_DECK_KEYS,V2_EDITOR_TRANSFER_KEY,normalizeEditorCounts,toV2Counts,editorV2Status,registeredPackForEditor}
 from '../dist/v2-editor-compat.mjs';
import {practiceDeck,rezeroSet1PracticeDeck} from '../dist/universal-v2/official-entry.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('six-title production editor cannot load old battle engine or old app script',()=>{
 const html=read('../dist/index.html'),code=read('../dist/v2-deck-editor.mjs');
 assert.match(html,/src="v2-deck-editor\.mjs/);
 assert.doesNotMatch(html,/src="app\.mjs/);
 for(const dependency of ['engine.mjs','match-runtime.mjs','ttg-core-match.mjs','solo-match.mjs','ai-v2.mjs'])
  assert.doesNotMatch(code,new RegExp("from ['\"][^'\"]*"+dependency.replace('.','\\.')+"['\"]"));
 assert.match(read('../vercel.json'),/universal-v2-preview\.html/);
 assert.equal(TITLES.length,6);
});
test('old browser keys remain the backing stores, not deleted or migrated destructively',()=>{
 assert.deepEqual(LEGACY_DECK_KEYS.bleach,['bleach-arena-deck-v1','bleach-arena-saved-decks-v1']);
 assert.deepEqual(LEGACY_DECK_KEYS['gurren-lagann'],['ua-ttg-draft-v1','ua-ttg-saved-v1']);
 assert.deepEqual(LEGACY_DECK_KEYS.rezero,['ua-rez-draft-v1','ua-rez-saved-v1']);
 const cards=normalizeEditorCounts('bleach',{'034':4});
 assert.equal(cards['034'],4);
 assert.equal(toV2Counts('bleach',cards)['BLC-1-034'],4);
});
test('real supported V2 Bleach 50-card deck can be used, unlike a legacy auto-only card',()=>{
 const editor=normalizeEditorCounts('bleach',BLEACH_GREEN_V2_COUNTS);
 const status=editorV2Status('bleach',editor);
 assert.equal(status.total,50);
 assert.equal(status.ready,true,status.issues.join('；'));
 assert.equal(status.registered,160);
 const supported=registeredPackForEditor('bleach');
 assert.ok(supported?.cards['BLC-1-067']);
 const unsupported=TITLES.find(t=>t.id==='bleach').cards.find(c=>!status.supported.has(c.id));
 assert.ok(unsupported);
 const bad=editorV2Status('bleach',{[unsupported.id]:4});
 assert.equal(bad.ready,false);
 assert.ok(bad.issues.some(x=>x.includes('尚未完整移植 V2')));
});
test('Tengen Toppa 81 and Re:Zero set 1 can start production V2; unfinished Vol.2 cannot hide',()=>{
 assert.equal(TITLES.find(t=>t.id==='rezero').cards.length,186);
 const ttg=editorV2Status('gurren-lagann',practiceDeck(registeredPackForEditor('gurren-lagann'),{color:'red'}));
 assert.equal(ttg.registered,81);
 assert.equal(ttg.ready,true,ttg.issues.join('；'));
 const thin=editorV2Status('rezero',{'REZ-1-001':4});
 assert.equal(thin.ready,false);
 assert.equal(thin.registered,141);
 assert.ok(thin.issues.every(x=>!x.includes('尚未接入正式 V2')));
 const set1=rezeroSet1PracticeDeck();
 const ready=editorV2Status('rezero',set1.counts);
 assert.equal(ready.ready,true,ready.issues.join('；'));
 assert.ok(Object.keys(ready.counts).every(id=>id.startsWith('REZ-1-')));
 const blocked=editorV2Status('rezero',{'REZ-1-001':46,'REZ-2-001':4});
 assert.equal(blocked.ready,false);
 assert.ok(blocked.issues.some(x=>x.includes('REZ-2-001')));
});
test('V2 match reads precise custom deck handoff and revalidates before play',()=>{
 const source=read('../dist/universal-v2-preview.mjs');
 assert.ok(source.includes('V2_EDITOR_TRANSFER_KEY'));
 assert.ok(source.includes('validateUniversalDeck(pack,counts)'));
 assert.ok(source.includes('registeredV2TitlePack(raw.title)'));
 assert.ok(source.includes("const value='editor-v2-mine'"));
 assert.equal(V2_EDITOR_TRANSFER_KEY,'ua-v2-editor-deck-v1');
});
test('visual builder marks V2 status instead of legacy auto and guards play button',async()=>{
 const {renderVisualDeckBuilder}=await import('../dist/visual-deck-builder.mjs');
 const t=TITLES.find(t=>t.id==='bleach');
 const a=t.cards[0];
 const props={titles:TITLES,titleId:'bleach',ready:true,tab:'pick',search:'',type:'all',color:'all',energy:'all',counts:{[a.id]:1},name:'Test',nameId:'x',savedId:'y',savedOptions:[],saveAction:'saveDeck',newAction:'newDeck',issues:['only draft'],v2SupportedIds:new Set(),v2Ready:false};
 const html=renderVisualDeckBuilder(props);
 assert.match(html,/V2 尚未移植/);
 assert.match(html,/data-action="v2Play" disabled/);
 assert.doesNotMatch(html,/可自動結算/);
 const readyHtml=renderVisualDeckBuilder({...props,v2SupportedIds:new Set([a.id]),v2Ready:true,issues:[]});
 assert.match(readyHtml,/data-action="v2Play"/);
 assert.doesNotMatch(readyHtml,/data-action="v2Play" disabled/);
});

test('standalone browser editor boots without legacy runtime and preserves TTG drafts',async()=>{
 const memory=new Map([['bleach-arena-deck-v1',JSON.stringify({'034':4})]]);
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const bySel={'#app':app,'#toast':toast};
 const originalTimer=globalThis.setTimeout;
 globalThis.document={querySelector:s=>bySel[s]||null,addEventListener(){}};
 globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 globalThis.sessionStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 globalThis.window={location:{assign(){}},scrollTo(){}};
 globalThis.setTimeout=()=>0;
 try{
  await import('../dist/v2-deck-editor.mjs?run-browser-smoke');
  assert.match(app.innerHTML,/先選擇卡牌作品/);
  const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
  click({title:'gurren-lagann'});
  assert.match(app.innerHTML,/Universal V2/);
  assert.match(app.innerHTML,/data-builder-count="TTG-1-/);
  click({builderCount:'TTG-1-001',delta:'1'});
  assert.equal(JSON.parse(memory.get('ua-ttg-draft-v1'))['TTG-1-001'],1);
  click({builderTab:'overview'});
  assert.match(app.innerHTML,/vdb-count-badge">×1/);
  assert.equal(JSON.parse(memory.get('bleach-arena-deck-v1'))['034'],4);
 }finally{
  globalThis.setTimeout=originalTimer;
  delete globalThis.document;delete globalThis.localStorage;delete globalThis.sessionStorage;delete globalThis.window;
 }
});
