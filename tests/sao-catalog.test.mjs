import test from 'node:test';
import assert from 'node:assert/strict';
import {TITLES,titleOfCard,validateTitleMembership} from '../dist/title-registry.mjs';
import {SAO_CARDS,SAO_BY_ID,SAO_PRODUCTS,SAO_COVERAGE,saoDeckIssues} from '../dist/sao-cards.mjs';
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
  assert.match(c.number,/^(UA15BT\/SAO-1|EX08BT\/SAO-2|UA15ST\/SAO-1|UAPR\/SAO-1)-\d{3}$/);
  assert.match(c.source,/unionarena-tcg\.com\/jp\/cardlist/);
  assert.equal(c.title,'sword-art-online');
  assert.ok(typeof c.effect==='string'&&typeof c.effectJa==='string');
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

test('official product coverage is explicit and incomplete records are not marked playable',()=>{
 assert.deepEqual(SAO_PRODUCTS.map(x=>x.id),['UA15ST','UA15BT','EX08BT']);
 assert.deepEqual(SAO_PRODUCTS.map(x=>x.regularCount),[18,100,74]);
 assert.ok(SAO_CARDS.every(c=>c.auto===false));
 assert.equal(new Set(SAO_CARDS.map(c=>c.identity)).size,SAO_CARDS.length);
});

test('exclusive official game bonus is separately registered without AP art',()=>{
 const card=SAO_BY_ID['SAO-1-101'];
 assert.ok(card);
 assert.ok(card.printings.some(p=>p.number==='UAPR/SAO-1-101'));
 assert.ok(card.printings.some(p=>p.number==='UA15ST/SAO-1-101'));
 assert.equal(card.ap,1);
 assert.equal(card.auto,false);
 assert.match(card.effect,/IMPACT/);
 assert.equal(SAO_CARDS.filter(c=>c.identity==='SAO-1-101').length,1);
 assert.ok(SAO_CARDS.every(c=>!/-AP\\d+/i.test(c.number)));
});

test('official import has exact base product counts and detects unchanged reprints',()=>{
 assert.equal(SAO_COVERAGE.printings,202);
 assert.equal(SAO_COVERAGE.uniqueCards,183);
 assert.deepEqual([SAO_COVERAGE.products.UA15BT,SAO_COVERAGE.products.EX08BT,SAO_COVERAGE.products.UA15ST],[100,74,18]);
 const seen=new Set();
 for(const card of SAO_CARDS){
  assert.ok(!seen.has(card.id));seen.add(card.id);
  assert.ok(card.printings.some(p=>p.number===card.number));
  assert.ok(card.image.startsWith('https://www.unionarena-tcg.com/jp/images/cardlist/card/'));
  assert.equal(card.auto,false);
 }
 assert.equal(SAO_BY_ID['SAO-1-036'].printings.length,3);
 assert.equal(SAO_BY_ID['SAO-1-101'].printings.length,2);
});

test('UAPR festival, ONE BATTLE CUP and special prints reuse their canonical playable codes',()=>{
 const printings=SAO_CARDS.flatMap(c=>c.printings);
 assert.equal(printings.filter(p=>p.set==='UAPR').length,10);
 assert.ok(SAO_BY_ID['SAO-1-091'].printings.some(p=>p.number==='UAPR/SAO-1-091'));
 assert.ok(SAO_BY_ID['SAO-2-042'].printings.some(p=>p.number==='UAPR/SAO-2-042'));
 assert.ok(SAO_BY_ID['SAO-2-052'].printings.some(p=>p.number==='UAPR/SAO-2-052'));
});
