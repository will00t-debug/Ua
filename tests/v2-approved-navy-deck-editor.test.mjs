import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeVisualDeckModel,renderVisualDeckBuilder} from '../dist/visual-deck-builder.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const cards=[
 {id:'gen0',number:'G-001',name:'角色一',type:'character',color:'red',energy:0,gen:0,image:'a.png'},
 {id:'gen1',number:'G-002',name:'角色二',type:'character',color:'blue',energy:2,gen:1,image:'b.png'},
 {id:'gen2',number:'G-003',name:'場地三',type:'field',color:'yellow',energy:3,gen:2,image:'c.png'},
 {id:'gen3',number:'G-004',name:'角色四',type:'character',color:'green',energy:4,gen:3,image:'d.png'},
 {id:'gen4',number:'G-005',name:'角色五',type:'character',color:'purple',energy:5,gen:4,image:'e.png'},
 {id:'gen5',number:'G-006',name:'角色六',type:'character',color:'red',energy:6,gen:5,image:'f.png'},
 {id:'gen6',number:'G-007',name:'事件七',type:'event',color:'red',energy:8,gen:6,image:'g.png'},
];
const titles=[{id:'bleach',label:'BLEACH',cards}];
const config={
 titles,titleId:'bleach',ready:true,tab:'pick',counts:{gen0:2,gen3:4,gen5:3},
 name:'藍色系組牌',nameId:'v2DeckName',savedId:'v2SavedSelect',
 savedOptions:[],saveAction:'saveDeck',newAction:'newDeck',
 issues:[],allowSave:true,recordView:'all'
};

test('approved mockup shows real deck hero, hero card strip, compact filters and card list',()=>{
 const html=renderVisualDeckBuilder(config);
 for(const tag of ['arena-builder-hero','arena-hero-cover','arena-hero-description',
  'arena-preview-toggle','arena-hero-save','arena-count-tabs','arena-hero-gallery',
  'arena-search-line','arena-filter-more','arena-list-tools','vdb-pool-grid','arena-info']){
  assert.ok(html.includes(tag),tag);
 }
 const hero=html.indexOf('class="arena-builder-hero"'),pool=html.indexOf('class="vdb-finder arena-pool"'),
  deck=html.indexOf('class="arena-deck"'),summary=html.indexOf('class="arena-info"');
 assert.ok(hero>=0&&hero<pool&&pool<deck&&deck<summary);
 assert.match(html,/藍色系組牌/);
 assert.match(html,/data-action="saveDeck"/);
 assert.equal((html.match(/data-action="saveDeck"/g)||[]).length,1);
 assert.match(html,/data-builder-tab="overview"/);
 assert.match(html,/role="switch" aria-checked="false"/);
 assert.match(html,/class="arena-hero-thumb" data-inspect="gen3"/);
 assert.match(html,/class="arena-hero-thumb" data-inspect="gen5"/);
 assert.match(html,/class="arena-hero-thumb" data-inspect="gen0"/);
 assert.match(html,/角色卡 <b>9<\/b>/);
 assert.match(html,/場地卡 <b>0<\/b>/);
 assert.match(html,/事件卡 <b>0<\/b>/);
 assert.match(html,/data-builder-search="1"/);
 assert.match(html,/data-builder-clear="1"/);
 assert.match(html,/data-builder-sort="energy-asc"/);
 assert.match(html,/data-builder-count="gen4" data-delta="1"/);
 assert.match(html,/data-builder-count="gen4" data-delta="-1"/);
 assert.match(html,/class="arena-info"[\s\S]*?卡片詳細資訊/);
});

test('generation filter contains 3+ rather than 4 and 5 and includes all 3-or-higher cards',()=>{
 const html=renderVisualDeckBuilder(config);
 const genRow=html.split('class="vdb-filter-line arena-filter arena-energy-row"><b>產能</b>')[1]
  ?.split('</div>')[0];
 assert.ok(genRow);
 assert.match(genRow,/data-builder-generate="3\+"/);
 assert.match(genRow,/data-builder-generate="3"/);
 assert.doesNotMatch(genRow,/data-builder-generate="4"|data-builder-generate="5"/);
 assert.deepEqual(makeVisualDeckModel({cards,counts:{},generate:'3+'}).results.map(c=>c.id),
  ['gen3','gen4','gen5','gen6']);
 assert.deepEqual(makeVisualDeckModel({cards,counts:{},generate:'3'}).results.map(c=>c.id),
  ['gen3']);
 assert.deepEqual(makeVisualDeckModel({cards,counts:{},generate:'2'}).results.map(c=>c.id),
  ['gen2']);
 const mod=makeVisualDeckModel({cards,counts:{gen4:2,gen5:1,gen6:1}});
 assert.equal(mod.generateCurve['4'],2);
 assert.equal(mod.generateCurve['5'],1);
 assert.equal(mod.generateCurve['6+'],1);
});

test('blue-on-navy simulator styling is active only for editor and keeps responsive controls',()=>{
 const css=read('dist/arena-deck-mockup.css');
 const page=read('dist/index.html');
 assert.match(css,/body\.arena-site \.arena-editor \.arena-builder-hero/);
 assert.match(css,/#091426/);
 assert.match(css,/#238aff/);
 assert.match(css,/\.arena-hero-gallery/);
 assert.match(css,/\.vdb-quantity button/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(page,/arena-deck-mockup\.css\?v=20261028cover1/);
 assert.match(page,/v2-deck-editor\.mjs\?v=20261028cover1/);
 const editor=read('dist/v2-deck-editor.mjs');
 assert.match(editor,/visual-deck-builder\.mjs\?v=20261028cover1/);
 assert.match(editor,/if\(data\.builderSearch!==undefined\)/);
 assert.match(editor,/if\(data\.builderTab\)/);
});
