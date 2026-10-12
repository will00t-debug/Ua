import test from 'node:test';
import assert from 'node:assert/strict';
import {TITLES,titleOfCard,validateTitleMembership} from '../dist/title-registry.mjs';
import {SAO_CARDS,SAO_BY_ID,saoDeckIssues} from '../dist/sao-cards.mjs';
test('SAO registry is isolated from BLEACH and TTG',()=>{
 const sao=TITLES.find(x=>x.id==='sword-art-online');
 assert.ok(sao);assert.equal(sao.playable,false);
 assert.equal(sao.cards.length,SAO_CARDS.length);
 assert.ok(SAO_CARDS.every(c=>titleOfCard(c)==='sword-art-online'&&!c.auto));
 assert.ok(validateTitleMembership({'SAO-1-004':2,'039':2},{...SAO_BY_ID,'039':{title:'bleach'}}).length>0);
});
test('SAO verified cards have distinct numbers and source URLs',()=>{
 const ids=new Set(SAO_CARDS.map(c=>c.id));
 assert.equal(ids.size,SAO_CARDS.length);
 for(const c of SAO_CARDS){
  assert.match(c.number,/^UA15BT\/SAO-1-\d{3}$/);
  assert.match(c.source,/unionarena-tcg\.com\/jp\/cardlist/);
  assert.equal(c.title,'sword-art-online');
  assert.ok(c.effect.length>10);
 }
});
test('SAO deck draft enforces 4 copies and does not permit simulation',()=>{
 assert.ok(saoDeckIssues({'SAO-1-004':5}).length);
 assert.ok(saoDeckIssues({'SAO-1-004':4}).some(s=>s.includes('50')));
 assert.ok(saoDeckIssues({'SAO-1-004':4}).some(s=>s.includes('不能對戰')));
});
test('SAO UI exposes its title and separate draft editing',async()=>{
 const nodes={app:{innerHTML:'',onclick:null},toast:{textContent:'',classList:{add(){},remove(){}}}};
 const store=new Map();
 globalThis.document={querySelector:s=>s==='#app'?nodes.app:s==='#toast'?nodes.toast:null,onkeydown:null};
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 globalThis.window={scrollTo(){},open(){}};
 const old=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 try{
  await import('../dist/app.mjs?sao-regression');
  const click=dataset=>nodes.app.onclick({target:{closest:()=>({dataset,disabled:false})}});
  click({view:'builder'});
  click({title:'sword-art-online'});
  assert.match(nodes.app.innerHTML,/刀劍神域 · 牌組編輯/);
  assert.match(nodes.app.innerHTML,/UA15BT\/SAO-1-004/);
  assert.match(nodes.app.innerHTML,/尚未開放對戰/);
  click({saoCount:'SAO-1-004',delta:'1'});
  assert.equal(JSON.parse(store.get('ua-sao-draft-v1'))['SAO-1-004'],1);
  click({title:'bleach'});
  assert.match(nodes.app.innerHTML,/BLEACH 卡片圖鑑|編輯牌組/);
 }finally{globalThis.setTimeout=old;}
});
