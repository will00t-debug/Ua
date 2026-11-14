import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');

test('online pending source and looked-at cards use small thumbnails even without CSS',()=>{
 const ui=read('universal-v2/online-battle-ui.mjs');
 assert.match(ui,/function pendingCardSheet\(/);
 assert.match(ui,/thumbnail\.setAttribute\('width','72'\)/);
 assert.match(ui,/max-width:72px;max-height:101px/);
 assert.match(ui,/grid-template-columns:72px minmax\(0,1fr\)/);
 assert.match(ui,/text:'查看完整卡圖'/);
});

test('all online effect-choice galleries constrain art and target button width',()=>{
 const js=read('online.mjs');
 assert.match(js,/function compactEffectArtwork\(img\)/);
 assert.match(js,/max-width:94px;max-height:132px/);
 assert.equal((js.match(/compactEffectArtwork\(img\);/g)||[]).length,4);
 assert.equal((js.match(/grid-template-columns:repeat\(auto-fill,minmax\(96px,112px\)\)/g)||[]).length,4);
 assert.match(js,/if\(img\)\{\s*compactEffectArtwork\(img\);/);
 assert.match(js,/online-battle-ui\.mjs\?v=20261114compactcards2/);
});

test('phone effect overlay stays short and never enlarges a single card to poster size',()=>{
 const css=read('online-battle.css');
 assert.match(css,/\.online-effect-overlay \.dialog\.pending\{\s*width:min\(520px,calc\(100vw - 24px\)\)/);
 assert.match(css,/max-height:min\(76dvh,620px\)/);
 assert.match(css,/\.online-effect-overlay \.online-inspection-art img\{/);
 assert.match(css,/max-width:94px/);
 assert.match(read('online.html'),/ua-ui-version" content="20261114compactcards2"/);
});
