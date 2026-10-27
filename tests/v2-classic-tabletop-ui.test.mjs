import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('classic tabletop skin targets actual V2 match DOM without replacing the reducer',()=>{
 const css=read('dist/universal-v2-legacy.css');
 const js=read('dist/universal-v2-preview.mjs');
 assert.match(css,/Classic tabletop R1/);
 for(const selector of ['#match-view .arena','#match-view .playerArea','#match-view .slots',
  '#match-view .slot.selected','#match-view .slot.destination','#match-view .handCard.selected',
  '#match-view .v2-legal-buttons button','#match-view .overlay']){
  assert.ok(css.includes(selector),'missing classic tabletop selector: '+selector);
 }
 for(const name of ['legacySlot','legacyLine','legacyPlayer','legacyHand','legacyCommands']){
  assert.ok(js.includes('function '+name+'('),'missing V2 classic DOM adapter: '+name);
 }
 assert.match(js,/legalUniversalActions\(app\.packs,s\)/);
 assert.match(js,/dispatchUniversalAction/);
 assert.doesNotMatch(js,/from ['"][^'"]*\/app\.mjs['"]/);
});

test('tabletop skin retains responsive slots and accessible motion settings',()=>{
 const css=read('dist/universal-v2-legacy.css');
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/#match-view \.handCard:focus-visible/);
});
