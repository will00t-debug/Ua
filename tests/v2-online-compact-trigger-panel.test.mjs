import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('online desktop loads same table styles as AI and busts old stylesheet cache',()=>{
 const source=read('dist/universal-v2/online-battle-ui.mjs');
 const html=read('dist/online.html');
 assert.match(source,/universal-v2-table-layout-v3\.css','universal-v2-neon-board\.css/);
 assert.match(source,/desktop-battle-ui\.mjs/);
 assert.match(html,/ua-ui-version" content="\d{8}[A-Za-z0-9_-]+"/);
});
test('online effect choices use compact centered AI-size panel without shrinking private inspection',()=>{
 const css=read('dist/online-battle.css');
 assert.match(css,/\.online-effect-overlay \.dialog\.pending \{/);
 assert.match(css,/width:min\(540px,100%\)/);
 assert.match(css,/max-height:calc\(100dvh - 30px\)/);
 assert.match(css,/:has\(\.online-private-inspection\)/);
 assert.match(css,/width:min\(920px,100%\)/);
});
