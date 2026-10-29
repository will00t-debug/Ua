import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('public trigger notifications are centered and can be dismissed with one tap',()=>{
 const script=read('dist/universal-v2-preview.mjs');
 const css=read('dist/universal-v2-battle.css');
 const block=script.split('function triggerBoard(view){')[1]?.split('function pendingChoiceControl(')[0];
 assert.ok(block);
 assert.match(block,/if\(app\.state\?\.pending\)return null/);
 assert.match(block,/\.filter\(card=>!app\.dismissedTriggerKeys\.has\(card\.owner\+'\:'\+card\.uid\)\)/);
 assert.match(block,/class:'overlay v2-trigger-overlay'/);
 assert.match(block,/role:'dialog','aria-modal':'true'/);
 assert.match(block,/overlay\.addEventListener\('click',dismiss\)/);
 assert.match(block,/app\.dismissedTriggerKeys\.add\(card\.owner\+'\:'\+card\.uid\)/);
 assert.match(block,/overlay\.addEventListener\('keydown'/);
 assert.match(block,/clearTriggerOverlay\(\)/);
 assert.match(css,/\.v2-shell>\.v2-trigger-overlay\{/);
 assert.match(css,/position:fixed;inset:0;z-index:75;display:grid;place-items:center/);
 assert.match(css,/\.v2-trigger-overlay \.trigger-board\{/);
 assert.match(css,/width:min\(540px,100%\)/);
});

test('trigger notice is mounted outside the match table without disturbing game choices',()=>{
 const script=read('dist/universal-v2-preview.mjs');
 const render=script.split('function render(){')[1]?.split('function applyAction(')[0];
 const pending=script.split('function pendingDialog(')[1]?.split('function finishMessage(')[0];
 assert.ok(render&&pending);
 assert.match(render,/clearTriggerOverlay\(\)/);
 assert.match(render,/const revealed=triggerBoard\(v\);/);
 assert.match(render,/if\(revealed\)mountTriggerOverlay\(revealed\)/);
 assert.doesNotMatch(render,/target\.append\(revealed\)/);
 assert.match(script,/app\.dismissedTriggerKeys\.clear\(\)/);
 assert.match(pending,/const triggerChoice=s\.pending\.kind==='life-trigger'/);
 assert.match(pending,/pendingChoiceControl\(row\.action,row\.option,gallery\|\|blockGallery,view\)/);
 assert.match(script,/onClick:\(\)=>applyAction\(action\)/);
 assert.doesNotMatch(pending,/dismissedTriggerKeys/);
 const html=read('dist/universal-v2-battle.html');
 assert.match(html,/universal-v2-battle\.css\?v=20261028triggercenter1/);
 assert.match(html,/universal-v2-preview\.mjs\?v=20261030entry1/);
});
