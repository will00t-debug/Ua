import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('both online player zones expose selectors required by shared desktop battlefield',()=>{
 const online=read('dist/universal-v2/online-battle-ui.mjs');
 const desktop=read('dist/universal-v2/desktop-battle-ui.mjs');
 assert.match(online,/for\(const \[zone,label\]of \[\['outside','場外'\],\['removed','移除區'\]\]\)/);
 assert.match(online,/class:'pile v2-zone-pile',\s*'data-v2-zone':zone,/);
 assert.match(online,/onClick:\(\)=>showZone\(side,zone\)/);
 assert.match(desktop,/area\.querySelector\('\[data-v2-zone="outside"\]'\)/);
 assert.match(desktop,/area\.querySelector\('\[data-v2-zone="removed"\]'\)/);
 assert.match(desktop,/rightGroup\.append\(outside\)/);
 assert.match(desktop,/lifeGroup\.append\(el\('div',\{class:'v2-removed-zone'\},removed\)\)/);
 assert.match(online,/if\(desktop\)mountDesktopBattlefield/);
});

test('online released client loads updated shared battlefield module',()=>{
 const source=read('dist/online.mjs');
 assert.match(source,/online-battle-ui\.mjs\?v=[A-Za-z0-9_-]+/);
 const html=read('dist/online.html');
 assert.match(html,/online-bootstrap\.mjs/);
});
