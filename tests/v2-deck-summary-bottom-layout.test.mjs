import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderVisualDeckBuilder} from '../dist/visual-deck-builder.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const titles=[{id:'bleach',label:'BLEACH',cards:[
 {id:'TEST-1',number:'TEST-1',name:'測試角色',type:'character',color:'purple',energy:0,gen:1,ap:1}
]}];

test('deck info, distributions, records and card details appear after all building controls',()=>{
 const html=renderVisualDeckBuilder({
  titles,titleId:'bleach',ready:true,tab:'pick',counts:{'TEST-1':2},name:'測試牌組',
  nameId:'v2DeckName',savedId:'v2SavedSelect',savedOptions:[],saveAction:'saveDeck',
  newAction:'newDeck',record:null
 });
 const at=key=>html.indexOf(key);
 assert.ok(at('class="arena-editor-grid"')>=0);
 assert.ok(at('class="vdb-finder arena-pool"')>at('class="arena-editor-grid"'));
 assert.ok(at('class="arena-deck"')>at('class="vdb-finder arena-pool"'));
 assert.ok(at('class="vdb-footnote"')>at('class="arena-deck"'));
 assert.ok(at('class="arena-info"')>at('class="vdb-footnote"'));
 for(const key of ['牌組資訊','能量曲線','產能分布','戰績','卡片詳細資訊'])
  assert.ok(at(key)>at('class="arena-info"'),key+' stays in the same bottom summary');
 assert.equal(html.match(/class="arena-info"/g)?.length,1);
 assert.match(html,/class="arena-editor-grid">[\s\S]*?class="arena-deck"[\s\S]*?<\/section><\/div><p class="vdb-footnote"/);
 assert.match(html,/class="arena-info"[\s\S]*?<\/aside><\/div>$/);
});

test('desktop and mobile both keep the summary beneath the builder',()=>{
 const css=read('dist/arena-ui.css'),index=read('dist/index.html');
 assert.match(css,/\.arena-editor-grid\{display:grid;grid-template-columns:minmax\(300px,380px\) minmax\(0,1fr\);/);
 assert.match(css,/\.arena-editor>\.arena-info\{[^}]*margin-top:16px/);
 assert.match(css,/@media\(max-width:1100px\)\{/);
 assert.match(css,/\.arena-editor-grid\{display:flex;flex-direction:column\}/);
 assert.doesNotMatch(css,/\.arena-info\{order:0\}/);
 assert.match(index,/arena-ui\.css\?v=20261028infobottom1/);
 assert.match(index,/v2-deck-editor\.mjs\?v=20261028cardzoom1/);
 const js=read('dist/v2-deck-editor.mjs');
 assert.match(js,/visual-deck-builder\.mjs\?v=20261028cardzoom1/);
});
