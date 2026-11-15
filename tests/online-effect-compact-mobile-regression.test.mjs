import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');

test('a pending effect cannot fill the phone with the source card illustration',()=>{
 const ui=read('universal-v2/online-battle-ui.mjs');
 const css=read('online-battle.css');
 assert.match(ui,/class:'dialog pending panel online-compact-effect-dialog'/);
 assert.match(ui,/class:'online-effect-scroll'},actions,effectSource,lookedAt/);
 assert.match(ui,/decisionButtons.length>0&&decisionButtons.length<=2/,'only simple legal choices move to the footer');
 assert.match(ui,/max-width:76px;max-height:104px;object-fit:contain/);
 assert.match(ui,/grid-template-columns:76px minmax\(0,1fr\)/);
 assert.match(css,/height:min\(56dvh,500px\)/,'mobile portrait panel uses a compact fixed-height sheet');
 assert.match(css,/\.online-effect-scroll\{[\s\S]*?overflow-y:auto/);
 assert.match(css,/\.online-effect-bottom\{/);
 assert.match(ui,/class:'online-effect-close'[\s\S]*?onClick:onPause/,'close icon enters board inspection without dropping the legal choice');
 assert.match(css,/\.online-pending-card-art img\{/);
 assert.doesNotMatch(css,/#match-view \.online-effect-overlay/,'overlay is mounted outside #match-view');
});

test('all online card choice galleries cap illustrations and allow inner scrolling',()=>{
 const online=read('online.mjs');
 assert.equal((online.match(/grid-template-columns:repeat\(auto-fill,minmax\(86px,100px\)\)/g)||[]).length,4);
 assert.equal((online.match(/max-height:138px;aspect-ratio:63\/88/g)||[]).length,5);
 assert.match(online,/online-battle-ui\.mjs\?v=20261116triggerthumb2/);
});

test('online.html directly preloads the scoped battle sheet and updates the version',()=>{
 const html=read('online.html');
 const ui=read('universal-v2/online-battle-ui.mjs');
 assert.match(html,/ua-ui-version" content="20261116triggerthumb2"/);
 assert.match(html,/data-online-battle-style="online-battle\.css"/);
 assert.match(html,/online-battle\.css\?v=20261116triggerthumb2" media="not all"/);
 assert.match(ui,/link\[data-online-battle-style=/);
});

test('public LIFE trigger images use dedicated, bounded thumbnail rows inside the compact dialog',()=>{
 const online=read('online.mjs');
 const css=read('online-battle.css');
 const start=online.indexOf("const triggers=el('div',{class:'trigger-public'});");
 const end=online.indexOf("if(view.battle)",start);
 assert.ok(start>=0&&end>start,'public trigger rendering found');
 const triggerSource=online.slice(start,end);
 assert.doesNotMatch(triggerSource,/cardBox\(card\)/,
  'field-size card art must not be reused in the mobile effect overlay');
 assert.match(triggerSource,/class:'online-trigger-thumbnail'/);
 assert.match(triggerSource,/class:'online-trigger-preview-copy'/);
 assert.match(triggerSource,/cardSrc\(card\)/,'only the published trigger card is shown');
 assert.match(css,/\.online-trigger-preview-art\{[\s\S]*?width:56px/);
 assert.match(css,/\.online-trigger-preview-art>img\.online-trigger-thumbnail\{[\s\S]*?max-width:100%;max-height:100%;object-fit:contain/);
});
