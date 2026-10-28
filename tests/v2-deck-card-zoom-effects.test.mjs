import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('tap a card photo or name to open the large image and printed rules',async()=>{
 const saved={
  document:globalThis.document,window:globalThis.window,
  localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage,
  setTimeout:globalThis.setTimeout,fetch:globalThis.fetch
 };
 const local=new Map(),session=new Map();
 const app={innerHTML:'',onclick:null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const events=new Map();
 let pool={scrollTop:0,scrollLeft:0};
 globalThis.document={
  querySelector:sel=>sel==='#app'?app:sel==='#toast'?toast:
   sel==='.arena-editor .vdb-pool-grid'?pool:null,
  addEventListener:(name,fn)=>events.set(name,fn)
 };
 globalThis.window={location:{search:'',hash:'#cards'},scrollX:0,scrollY:410,scrollTo(){}};
 globalThis.localStorage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)};
 globalThis.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 globalThis.setTimeout=()=>0;
 globalThis.fetch=async()=>({ok:false,status:401});
 try{
  await import('../dist/v2-deck-editor.mjs?deck-card-modal-20261028');
  const match=app.innerHTML.match(/class="vdb-card-photo" data-inspect="([^"]+)"/);
  assert.ok(match,'editor renders photo inspection buttons');
  const id=match[1];
  assert.match(app.innerHTML,/class="vdb-card-name" data-inspect=/);
  assert.match(app.innerHTML,/class="arena-hero-cover" data-builder-cover-open="1"/);
  assert.doesNotMatch(app.innerHTML,/aria-label="卡片效果"/);
  pool.scrollTop=245;
  const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
  click({inspect:id});
  assert.match(app.innerHTML,/aria-label="卡片效果"/);
  assert.match(app.innerHTML,/class="arena-card-detail-art"><img src=/);
  assert.match(app.innerHTML,/class="arena-card-detail-effect" aria-label="卡片效果"/);
  assert.match(app.innerHTML,/官方日文原文|無額外印刷能力|<h3>卡片效果<\/h3>/);
  assert.equal(pool.scrollTop,245,'opening enlarged art must not move the card-list scrollbar');
  click({action:'dismiss'});
  assert.doesNotMatch(app.innerHTML,/class="arena-card-detail-modal"/);
  assert.match(app.innerHTML,/class="vdb-card-photo" data-inspect=/);
  click({inspect:id});
  events.get('keydown')?.({key:'Escape'});
  assert.doesNotMatch(app.innerHTML,/class="arena-card-detail-modal"/);
  click({inspect:id});
  app.onclick({target:{closest:()=>null,classList:{contains:n=>n==='arena-card-detail-backdrop'}}});
  assert.doesNotMatch(app.innerHTML,/class="arena-card-detail-modal"/);
 }finally{
  for(const [name,value] of Object.entries(saved))globalThis[name]=value;
 }
});

test('zoom is read-only, separate from cover changes and +/- quantity buttons',()=>{
 const ui=read('dist/visual-deck-builder.mjs');
 const editor=read('dist/v2-deck-editor.mjs');
 const css=read('dist/arena-deck-mockup.css');
 assert.match(ui,/class="arena-hero-cover" data-builder-cover-open="1"/);
 assert.match(ui,/class="vdb-card-name" data-inspect=/);
 assert.match(ui,/class="vdb-card-photo" data-inspect=/);
 assert.match(ui,/class="arena-hero-thumb" data-inspect=/);
 assert.match(ui,/data-builder-count="\$\{vdbEsc\(card.id\)\}" data-delta="1"/);
 assert.match(editor,/if\(data\.inspect\)\{[\s\S]*?state\.zoom=true;render\(\);/);
 assert.match(editor,/if\(data\.builderCoverOpen!==undefined\)/);
 assert.match(editor,/function showDetail\(id\)/);
 assert.match(editor,/aria-modal="true" aria-labelledby="arena-card-detail-title"/);
 assert.match(editor,/\$\{escapeHtml\(effect\|\|effectJa\|\|'無額外印刷能力'\)\}/);
 assert.match(css,/\.arena-card-detail-modal\{/);
 assert.match(css,/\.arena-card-detail-art img\{/);
 assert.match(css,/\.arena-card-detail-effect p\{/);
 assert.match(css,/@media\(max-width:680px\)/);
 const page=read('dist/index.html');
 assert.match(page,/arena-deck-mockup\.css\?v=20261028cardzoom1/);
 assert.match(page,/v2-deck-editor\.mjs\?v=20261028cardzoom1/);
});
