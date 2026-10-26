
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeVisualDeckModel,renderVisualDeckBuilder} from '../dist/visual-deck-builder.mjs';

const cards=[
 {id:'A',number:'BLC-1-001',name:'角色甲',type:'character',color:'purple',energy:0,trigger:'get',image:'a.png'},
 {id:'B',number:'BLC-1-002',name:'場地乙',type:'field',color:'purple',energy:1,image:'b.png'},
 {id:'C',number:'BLC-1-003',name:'事件丙',type:'event',color:'green',energy:3,trigger:'special',image:'c.png'},
 {id:'AP',name:'AP 卡',type:'action_point',energy:0,image:'ap.png'}
];
const titles=[{id:'bleach',label:'BLEACH',cards},{id:'sword-art-online',label:'SAO',cards:[]}];
const props={titles,titleId:'bleach',ready:true,tab:'pick',search:'',type:'all',color:'all',energy:'all',counts:{A:4,B:2,C:1,AP:3},name:'我的牌組',nameId:'deckName',savedId:'deckSourceSelect',savedOptions:[],saveAction:'saveDeck',newAction:'newDeck',issues:[]};

test('title picker is first, with no card pool before a title is picked',()=>{
 const html=renderVisualDeckBuilder({...props,ready:false});
 assert.match(html,/先選擇卡牌作品/);
 assert.match(html,/data-title="bleach"/);
 assert.doesNotMatch(html,/class="vdb-pool-grid"/);
});
test('visual overview shows actual cards, card counts, type sections and triggers; AP excluded',()=>{
 const model=makeVisualDeckModel({cards,counts:props.counts});
 assert.equal(model.total,7);
 assert.equal(model.chosen.length,3);
 assert.equal(model.groups.find(x=>x.id==='character').total,4);
 assert.equal(model.triggerCounts.special,1);
 assert.equal(model.eligible.some(c=>c.id==='AP'),false);
 const html=renderVisualDeckBuilder({...props,tab:'overview'});
 assert.match(html,/角色<\s*span>4 張/);
 assert.match(html,/場地<\s*span>2 張/);
 assert.match(html,/事件<\s*span>1 張/);
 assert.match(html,/vdb-count-badge">×4/);
 assert.match(html,/SPECIAL/);
 assert.doesNotMatch(html,/AP 卡"/);
});
test('filters use real card data, and all dynamic card labels are HTML escaped',()=>{
 const model=makeVisualDeckModel({cards,counts:props.counts,search:'事件',type:'event',color:'green',energy:'3'});
 assert.deepEqual(model.results.map(c=>c.id),['C']);
 const html=renderVisualDeckBuilder({...props,name:'<script>alert(1)</script>',tab:'pick'});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/data-builder-count="A"/);
 assert.match(html,/data-builder-color="purple"/);
});
test('official builder page links new stylesheet and production deck tool retains V2 separate battle engine',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 assert.match(read('../dist/index.html'),/visual-deck-builder\.css/);
 assert.match(read('../dist/app.mjs'),/if\(ui\.view==='builder'&&PUBLIC_EDITOR_ONLY\)return visualDeckLibrary\(\)/);
 assert.match(read('../vercel.json'),/universal-v2-preview\.html/);
});
test('public editor lets player choose a title, add a card, and review after saving draft',async()=>{
 const app={innerHTML:'',onclick:null,addEventListener(){}};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const stored=new Map();
 const inputs={};
 globalThis.document={querySelector(sel){if(sel==='#app')return app;if(sel==='#toast')return toast;if(sel==='.shell')return null;if(sel.startsWith('#')&&app.innerHTML.includes('id="'+sel.slice(1)+'"'))return inputs[sel.slice(1)]||null;return null;},onkeydown:null};
 globalThis.localStorage={getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)};
 globalThis.window={location:{protocol:'https:',assign(){},replace(){}},scrollTo(){}};
 const previousTimer=globalThis.setTimeout;
 globalThis.setTimeout=()=>1;
 const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
 try{
  await import('../dist/app.mjs?visual-builder-integration');
  click({view:'builder'});
  assert.match(app.innerHTML,/先選擇卡牌作品/);
  click({title:'sword-art-online'});
  assert.match(app.innerHTML,/進入 V2 對戰/);
  assert.match(app.innerHTML,/data-builder-count="SAO-1-/);
  const {SAO_CARDS}=await import('../dist/sao-cards.mjs');
  click({builderCount:SAO_CARDS[0].id,delta:'1'});
  assert.equal(JSON.parse(stored.get('ua-sao-draft-v1'))[SAO_CARDS[0].id],1);
  click({builderTab:'overview'});
  assert.match(app.innerHTML,/牌組總覽/);
  assert.match(app.innerHTML,/vdb-count-badge">×1/);
  assert.match(app.innerHTML,/角色/);
 }finally{
  globalThis.setTimeout=previousTimer;
  delete globalThis.document;delete globalThis.localStorage;delete globalThis.window;
 }
});
