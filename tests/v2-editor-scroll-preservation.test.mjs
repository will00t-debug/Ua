import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('deck editor preserves the independent card-list scroll on quantity rerenders',()=>{
 const source=read('dist/v2-deck-editor.mjs');
 const render=source.split('function render(){')[1]?.split('async function mirrorCloudDeck(')[0];
 assert.ok(render);
 assert.match(render,/const oldPool=\$\('\.arena-editor \.vdb-pool-grid'\)/);
 assert.match(render,/const oldDeck=\$\('\.arena-deck-board'\)/);
 assert.match(render,/const oldPoolTop=oldPool\?\.scrollTop\?\?null/);
 assert.match(render,/const oldDeckTop=oldDeck\?\.scrollTop\?\?null/);
 assert.match(render,/const previousPageY=window\.scrollY,previousPageX=window\.scrollX/);
 assert.ok(render.indexOf('const oldPool=')<render.indexOf("$('#app').innerHTML="));
 assert.ok(render.indexOf("$('#app').innerHTML=")<render.indexOf('newPool.scrollTop=oldPoolTop'));
 assert.match(render,/if\(oldPoolTop!==null&&newPool\)/);
 assert.match(render,/newPool\.scrollTop=oldPoolTop;newPool\.scrollLeft=oldPoolLeft/);
 assert.match(render,/if\(oldDeckTop!==null&&newDeck\)newDeck\.scrollTop=oldDeckTop/);
 assert.match(render,/window\.scrollTo\(previousPageX,previousPageY\)/);
 const quantity=source.split('if(data.builderCount){')[1]?.split("if(data.action==='dismiss')")[0];
 assert.ok(quantity);
 assert.match(quantity,/persist\(\);render\(\);return/);
});

test('battle rerenders preserve the desktop viewport while selecting moves',()=>{
 const source=read('dist/universal-v2-preview.mjs');
 const render=source.split('function render(){')[1]?.split('function applyAction(a)')[0];
 assert.match(render,/const oldScroll=window\.scrollY/);
 assert.match(render,/const preserveScroll=target\.childElementCount>0/);
 assert.match(render,/target\.replaceChildren\(\)/);
 assert.match(render,/if\(IS_BATTLE_PAGE&&preserveScroll\)window\.scrollTo\(window\.scrollX,oldScroll\)/);
});
