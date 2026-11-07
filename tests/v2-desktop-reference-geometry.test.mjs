import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('desktop reference table geometry fixes LIFE collapse and accidental implicit columns',()=>{
 const css=read('dist/universal-v2-table-layout-v3.css');
 assert.match(css,/\.v2-life-group > \.lifeRow\s*\{/);
 assert.match(css,/flex:0 0 auto;/);
 assert.match(css,/max-height:none;/);
 assert.match(css,/\.v2-life-rail \.lifeCard\s*\{/);
 assert.match(css,/\.v2-life-rail \.lifeCard:last-of-type\s*\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\);/);
 assert.match(css,/grid-auto-columns:minmax\(0,1fr\);/);
 assert.match(css,/\.playerArea\.opponent \.lineGroup:has\(\.lineLabel\.front\) \{grid-row:3\}/);
 assert.match(css,/\.playerArea\.opponent \.v2-table-ap \{grid-row:1\}/);
 assert.match(css,/\.lineGroup > \.slots\s*\{/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\);/);
 assert.match(css,/\.handArea \.v2-compact-actions\s*\{/);
 assert.match(css,/position:relative;/);
 assert.match(css,/overflow-x:auto;/);
 assert.match(css,/max-height:570px/);
});

test('desktop geometry loads AFTER red card backs in solo and online matches',()=>{
 const html=read('dist/universal-v2-battle.html');
 const online=read('dist/universal-v2/online-battle-ui.mjs');
 const backs=html.indexOf('union-arena-card-backs.css');
 const fix=html.indexOf('universal-v2-table-layout-v3.css');
 assert.ok(backs>0&&fix>backs,'solo CSS order preserves intentional red backs');
 const start=online.indexOf('export const ONLINE_BATTLE_STYLES');
 const back=online.indexOf("'union-arena-card-backs.css'",start);
 const last=online.indexOf("'universal-v2-table-layout-v3.css'",start);
 assert.ok(start>0&&back>start&&last>back,'online CSS order also uses final layout override');
 assert.match(read('dist/online.mjs'),/online-battle-ui\.mjs\?v=20261107layout1/);
 assert.match(read('dist/online.html'),/ua-ui-version" content="20261107layout1"/);
});

test('all click behaviors and hidden card data remain in shared V2 action adapter',()=>{
 const js=read('dist/universal-v2/desktop-battle-ui.mjs');
 assert.match(js,/lifeTargetActions/);
 assert.match(js,/onLifeTargetAction/);
 assert.match(js,/v2-life-selected/);
 assert.match(js,/arena\.classList\.add\('v2-desktop-arena','v2-reference-table'\)/);
});
