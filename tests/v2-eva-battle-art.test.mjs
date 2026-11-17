import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaEditorCards} from '../dist/eva/catalog.mjs';

const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');

test('EVA V2 deck cards have official image URLs',()=>{
 const cards=evaEditorCards();
 assert.equal(cards.length,113);
 for(const card of cards){
  assert.ok(card.image?.startsWith('https://www.unionarena-tcg.com/jp/images/cardlist/card/'),card.id);
  assert.match(card.image,/\/UA44(?:BT|ST)_EVA-1-\d{3}\.png$/,card.id);
 }
});

test('EVA battle uses its printed catalogue in hand, field and inspect art lookup',()=>{
 assert.match(preview,/import \{evaEditorCards\} from '\.\/eva\/catalog\.mjs';/);
 assert.match(preview,/eva:new Map\(evaEditorCards\(\)\.map\(c=>\[c\.identity\|\|c\.id,c\.image\|\|null\]\)\)/);
 assert.match(preview,/eva:printedCatalogueMap\(evaEditorCards\(\)\)/);
});

test('both V2 battle pages load the artwork-fixed module version',()=>{
 for(const name of ['universal-v2-battle.html','universal-v2-preview.html']){
  const html=readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
  assert.match(html,/universal-v2-preview\.mjs\?v=20261117evaart1/);
 }
});
