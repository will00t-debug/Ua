import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('portrait match keeps both boards, phase controls and swipeable hand in one viewport',()=>{
 const css=read('dist/universal-v2-compact.css');
 const html=read('dist/universal-v2-battle.html');
 assert.match(html,/universal-v2-compact\.css\?v=20261029portrait1/);
 assert.match(css,/@media \(max-width:760px\) and \(orientation:portrait\)/);
 assert.match(css,/body\.v2-battle-page\.v2-playing/);
 assert.match(css,/height:100dvh;min-height:0;overflow:hidden/);
 assert.match(css,/grid-template-rows:minmax\(0,1fr\) 34px minmax\(0,1fr\) minmax\(102px,23dvh\)/);
 assert.match(css,/\.arena>\.playerArea/);
 assert.match(css,/\.handArea\{/);
 assert.match(css,/overflow-x:auto;overflow-y:hidden/);
 assert.match(css,/scroll-snap-type:x proximity/);
 assert.match(css,/\.matchHeader\.tools-open \.matchControls\{display:flex\}/);
 assert.match(css,/\.v2-middle-next button/);
 assert.match(css,/\.v2-compact-actions/);
 assert.match(css,/max-height:650px/);
 assert.match(css,/\.v2-battle-page\.v2-playing \.battle-foot\{display:none\}/);
});

test('viewport locking applies only during active play, not the opening mulligan',()=>{
 const js=read('dist/universal-v2-preview.mjs');
 const render=js.split('function render(){')[1]?.split('function applyAction(')[0];
 assert.ok(render);
 assert.match(render,/document\.body\.classList\.toggle\('v2-playing'/);
 assert.match(render,/opening-mulligan/);
 assert.match(render,/const oldHandScroll=target\.querySelector\('\.hand'\)\?\.scrollLeft\|\|0/);
 assert.match(render,/handAfterRender\.scrollLeft=oldHandScroll/);
 assert.match(render,/class:'v2-mobile-menu-toggle'/);
 assert.match(render,/aria-expanded/);
 assert.match(render,/legacyPlayer\(v,1,legal\),middle,legacyPlayer\(v,0,legal\)/);
 assert.match(render,/arena\.append\(handArea\)/);
 assert.match(render,/legacyCommands\(legal\)/);
 assert.match(js,/if\(!yours\)\{if\(c\)showFieldSheet\(side,line,c,d\);return;\}/);
 assert.match(js,/dispatchUniversalAction\(app\.packs,app\.state,a,\{actor:0\}\)/);
});

test('mobile compact view is isolated from desktop and opening-hand UI',()=>{
 const css=read('dist/universal-v2-compact.css');
 assert.doesNotMatch(css,/\.v2-setup-v3|\.v2-mulligan|\.v2-empty/);
 assert.match(css,/html:has\(body\.v2-battle-page\.v2-playing\)/);
 assert.match(css,/\.v2-mobile-menu-toggle\{display:none\}/);
});
