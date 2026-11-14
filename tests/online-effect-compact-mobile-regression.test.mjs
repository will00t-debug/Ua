import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');

test('a pending effect cannot fill the phone with the source card illustration',()=>{
 const ui=read('universal-v2/online-battle-ui.mjs');
 const css=read('online-battle.css');
 assert.match(ui,/class:'online-compact-effect-dialog'/);
 assert.match(ui,/max-height:76dvh;overflow-y:auto/);
 assert.match(ui,/actions,effectSource,lookedAt/,'legal choices precede optional card preview');
 assert.match(ui,/max-width:76px;max-height:104px;object-fit:contain/);
 assert.match(ui,/grid-template-columns:76px minmax\(0,1fr\)/);
 assert.match(css,/\.online-compact-effect-dialog\{[\s\S]*?max-height:76dvh/);
 assert.match(css,/\.online-pending-card-art img\{/);
});

test('all online card choice galleries cap illustrations and allow inner scrolling',()=>{
 const online=read('online.mjs');
 assert.equal((online.match(/grid-template-columns:repeat\(auto-fill,minmax\(86px,100px\)\)/g)||[]).length,4);
 assert.equal((online.match(/max-height:138px;aspect-ratio:63\/88/g)||[]).length,5);
 assert.match(online,/online-battle-ui\.mjs\?v=20261114compactmodal2/);
});

test('online.html directly preloads the scoped battle sheet and updates the version',()=>{
 const html=read('online.html');
 const ui=read('universal-v2/online-battle-ui.mjs');
 assert.match(html,/ua-ui-version" content="20261114compactmodal2"/);
 assert.match(html,/data-online-battle-style="online-battle\.css"/);
 assert.match(html,/online-battle\.css\?v=20261114compactmodal2" media="not all"/);
 assert.match(ui,/link\[data-online-battle-style=/);
});
