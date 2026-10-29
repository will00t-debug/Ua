import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('large card shows translated rules inside the printed box and toggles back to original',async()=>{
 const saved={
  document:globalThis.document,window:globalThis.window,
  localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage,
  setTimeout:globalThis.setTimeout,fetch:globalThis.fetch
 };
 const local=new Map(),session=new Map();
 const app={innerHTML:'',onclick:null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const events=new Map();
 const pool={scrollTop:0,scrollLeft:0};
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
  await import('../dist/v2-deck-editor.mjs?deck-card-overlay-20261028');
  const {TITLES}=await import('../dist/title-registry.mjs');
  const card=TITLES.find(t=>t.id==='bleach').cards.find(c=>typeof c.effect==='string'&&c.effect.trim()&&c.effect.trim()!==(c.effectJa||'').trim());
  assert.ok(card,'catalogue has a card with a translated rule');
  assert.match(app.innerHTML,/class="vdb-card-name" data-inspect=/);
  assert.match(app.innerHTML,/class="arena-hero-cover" data-builder-cover-open="1"/);
  assert.doesNotMatch(app.innerHTML,/class="arena-card-detail-modal"/);
  pool.scrollTop=245;
  const click=(data,modal=false)=>app.onclick({target:{closest:selector=>
   selector==='button'?(data?{dataset:data,disabled:false}:null):
   selector==='.arena-card-detail-backdrop'&&modal?{}:null
  }});
  click({inspect:card.id});
  assert.match(app.innerHTML,/class="arena-card-detail-flip" data-action="toggleCardOriginal"/);
  assert.match(app.innerHTML,/class="arena-card-effect-overlay/);
  assert.match(app.innerHTML,/點卡圖顯示日文原文/);
  assert.doesNotMatch(app.innerHTML,/arena-card-detail-close|關閉 ×/);
  assert.doesNotMatch(app.innerHTML,/class="arena-card-detail-info"/);
  assert.equal(pool.scrollTop,245,'inspecting must retain editor scroll position');
  click({action:'toggleCardOriginal'},true);
  assert.match(app.innerHTML,/class="arena-card-detail-flip show-original"/);
  assert.match(app.innerHTML,/點卡圖顯示中文效果/);
  click({action:'toggleCardOriginal'},true);
  assert.match(app.innerHTML,/class="arena-card-detail-flip" data-action=/);
  assert.doesNotMatch(app.innerHTML,/class="arena-card-detail-flip show-original"/);
  // Clicking the caption, modal padding or backdrop all count as outside the card.
  click(null,true);
  assert.doesNotMatch(app.innerHTML,/class="arena-card-detail-modal"/);
  click({inspect:card.id});
  events.get('keydown')?.({key:'Escape'});
  assert.doesNotMatch(app.innerHTML,/class="arena-card-detail-modal"/);
  assert.match(app.innerHTML,/class="vdb-card-photo" data-inspect=/);
 }finally{
  for(const [name,value] of Object.entries(saved))globalThis[name]=value;
 }
});

test('overlay is isolated from quantity, deck cover and official card art',()=>{
 const ui=read('dist/visual-deck-builder.mjs');
 const editor=read('dist/v2-deck-editor.mjs');
 const css=read('dist/arena-deck-mockup.css');
 assert.match(ui,/class="arena-hero-cover" data-builder-cover-open="1"/);
 assert.match(ui,/class="vdb-card-name" data-inspect=/);
 assert.match(ui,/class="vdb-card-photo" data-inspect=/);
 assert.match(ui,/class="arena-hero-thumb" data-inspect=/);
 assert.match(ui,/data-builder-count="\$\{vdbEsc\(card.id\)\}" data-delta="1"/);
 assert.match(editor,/if\(data\.inspect\)\{[\s\S]*?state\.zoom=true;state\.showOriginal=false;render\(\);/);
 assert.match(editor,/if\(data\.builderCoverOpen!==undefined\)/);
 assert.match(editor,/function showDetail\(id\)/);
 assert.match(editor,/aria-modal="true" aria-label="\$\{escapeHtml\(name\)\} 放大卡圖"/);
 assert.match(editor,/const translation=effect&&effect!==effectJa\?effect:''/);
 assert.match(editor,/if\(el\?\.dataset\?\.action==='toggleCardOriginal'/);
 assert.match(css,/\.arena-card-detail-modal\{/);
 assert.match(css,/\.arena-card-detail-flip img\{/);
 assert.match(css,/\.arena-card-effect-overlay\{/);
 assert.match(css,/\.show-original \.arena-card-effect-overlay\{display:none\}/);
 assert.match(css,/top:58\.8%;bottom:10\.6%/);
 assert.match(css,/@media\(max-width:680px\)/);
 const page=read('dist/index.html');
 assert.match(page,/arena-deck-mockup\.css\?v=20261028cardoverlay1/);
 assert.match(page,/v2-deck-editor\.mjs\?v=20261029mstart1/);
});
