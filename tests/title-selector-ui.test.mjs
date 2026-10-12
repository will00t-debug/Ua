import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLES} from '../dist/title-registry.mjs';
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
test('deck editor and catalogue provide per-series title selection',()=>{
 assert.equal(TITLES.length,2);
 assert.match(app,/data-title=/);
 assert.match(app,/getTitle\(ui.title\)\.cards\.filter/);
 assert.match(app,/ui\.title==='bleach'\?SETS/);
});
test('unfinished TTG cards cannot be added by the BLEACH deck editor',()=>{
 assert.match(app,/edit=ui\.view==='builder'&&title\.playable/);
 assert.match(app,/edit&&title\.playable/);
 assert.match(app,/天元突破資料核對中/);
});
test('TTG card details refer to source rather than BLEACH inspect data',()=>{
 assert.match(app,/titleCardsForInspect/);
 assert.match(app,/window\.open\(card\.source/);
});
