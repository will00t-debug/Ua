import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('desktop live battle fits opponent, player, phase bar and hand in the viewport',()=>{
 const css=read('dist/universal-v2-desktop.css');
 const html=read('dist/universal-v2-battle.html');
 assert.match(html,/universal-v2-desktop\.css\?v=20261029laptop2/);
 assert.match(css,/@media \(min-width:761px\) and \(min-height:460px\)/);
 assert.match(css,/html:has\(body\.v2-battle-page\.v2-playing\)/);
 assert.match(css,/height:100dvh;min-height:0;overflow:hidden/);
 assert.match(css,/grid-template-rows:minmax\(0,1fr\) 38px minmax\(0,1fr\) minmax\(120px,21dvh\)/);
 assert.match(css,/\.arena>\.playerArea/);
 assert.match(css,/\.lineGroup\{/);
 assert.match(css,/\.slots\{/);
 assert.match(css,/\.lifeRow\{/);
 assert.match(css,/\.handArea\{/);
 assert.match(css,/overflow-x:auto;overflow-y:hidden/);
 assert.match(css,/\.matchHeader\.tools-open \.matchControls\{display:flex\}/);
 assert.match(css,/\.v2-middle-next button/);
 assert.match(css,/\.v2-compact-actions/);
 assert.doesNotMatch(css,/\.v2-pending-overlay/);
 assert.match(css,/\.arena>\.resultBanner/);
});

test('desktop card choices preserve existing V2 interactions and mouse-wheel browsing',()=>{
 const js=read('dist/universal-v2-preview.mjs');
 const render=js.split('function render(){')[1]?.split('function applyAction(')[0];
 const hand=js.split('function legacyHand(view,legal){')[1]?.split('function legacyCommands(')[0];
 assert.ok(render&&hand);
 assert.match(render,/legacyPlayer\(v,1,legal\),middle,legacyPlayer\(v,0,legal\)/);
 assert.match(render,/arena\.append\(handArea\)/);
 assert.match(render,/oldHandScroll/);
 assert.match(render,/handAfterRender\.scrollLeft=oldHandScroll/);
 assert.match(render,/'v2-mobile-menu-toggle'/);
 assert.match(hand,/hand\.addEventListener\('wheel'/);
 assert.match(hand,/Math\.abs\(event\.deltaY\)<=Math\.abs\(event\.deltaX\)/);
 assert.match(hand,/event\.preventDefault\(\)/);
 assert.match(js,/dispatchUniversalAction\(app\.packs,app\.state,a,\{actor:0\}\)/);
 assert.match(js,/legalUniversalActions\(app\.packs,s\)/);
});

test('desktop layout leaves short windows and setup/mulligan scrollable',()=>{
 const css=read('dist/universal-v2-desktop.css');
 assert.doesNotMatch(css,/\.v2-setup-v3|\.v2-mulligan|\.v2-empty/);
 assert.match(css,/min-height:460px/);
 assert.match(css,/@media \\(min-width:761px\\) and \\(min-height:460px\\) and \\(max-height:679px\\)/);
 assert.match(css,/@media \\(min-width:761px\\) and \\(min-height:460px\\) and \\(max-height:519px\\)/);
 assert.match(css,/grid-template-rows:minmax\\(0,1fr\\) 30px minmax\\(0,1fr\\) minmax\\(88px,17dvh\\)/);
 assert.match(css,/--desktop-card-width:min\\(6\\.7dvh,6vw,58px\\)/);
 assert.match(css,/--desktop-card-width:min\\(8dvh,6vw,70px\\)/);
 assert.match(css,/\.v2-battle-page\.v2-playing/);
 assert.match(css,/\.v2-log/);
});
