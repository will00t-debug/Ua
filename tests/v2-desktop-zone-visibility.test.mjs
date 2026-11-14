import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('dist/universal-v2-neon-board.css');
const desktop=read('dist/universal-v2/desktop-battle-ui.mjs');
const preview=read('dist/universal-v2-preview.mjs');
const html=read('dist/universal-v2-battle.html');

test('desktop outside and removed zones are moved, not replaced, preserving zone click handlers',()=>{
 assert.match(preview,/data-v2-zone':zone/);
 assert.match(preview,/onClick:\(\)=>showZoneSheet\(side,zone\)/);
 assert.match(desktop,/const removed=area\.querySelector\('\[data-v2-zone="removed"\]'\)/);
 assert.match(desktop,/lifeGroup\.append\(el\('div',\{class:'v2-removed-zone'\},removed\)\)/);
 assert.match(desktop,/const outside=area\.querySelector\('\[data-v2-zone="outside"\]'\)/);
 assert.match(desktop,/rightGroup\.append\(outside\)/);
});

test('desktop player zones use reserved rows and stay available at short laptop heights',()=>{
 assert.match(css,/Desktop zone visibility: keep both players/);
 assert.match(css,/\.v2-life-group > \.lifeRow \{/);
 assert.match(css,/grid-auto-rows:minmax\(0,1fr\)/);
 assert.match(css,/\.v2-life-group > \.v2-removed-zone > \.v2-zone-pile \{/);
 assert.match(css,/\.v2-pile-group \{\s*display:grid;\s*grid-template-columns:minmax\(0,1fr\);\s*grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/max-height:570px/);
 assert.match(html,/universal-v2-neon-board\.css\?v=20261114zones1/);
});
