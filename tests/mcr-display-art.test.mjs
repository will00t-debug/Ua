import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mcrCatalog,mcrEditorCards} from '../dist/mcr/catalog.mjs';
import {renderVisualDeckBuilder} from '../dist/visual-deck-builder.mjs';

test('Macross deck list embeds Rugia faces and keeps the official image URL',()=>{
 const cards=mcrEditorCards();
 assert.equal(cards.length,190);
 for(const card of cards){
  const file=card.image.split('/').pop();
  assert.match(card.image,/^https:\/\/www\.unionarena-tcg\.com\/jp\/images\/cardlist\/card\//,card.id);
  assert.equal(card.onlineImage,'https://rugiacreation.com/ua/cardlist/small/'+file.replace(/\.png$/,'.jpg')+'?v=20261126',card.id);
 }
 assert.equal(mcrCatalog().deck.find(card=>card.id==='MCR-2-001').onlineImage,undefined);
 const html=renderVisualDeckBuilder({
  titles:[{id:'mcr',label:'超時空要塞',cards}],
  titleId:'mcr',ready:true,tab:'pick',counts:{},name:'超時空要塞自訂牌組'
 });
 assert.match(html,/src="https:\/\/rugiacreation.com\/ua\/cardlist\/small\/EX14BT_MCR-2-001\.jpg\?v=20261126"/);
 assert.match(html,/src="https:\/\/rugiacreation.com\/ua\/cardlist\/small\/EX14BT_MCR-2-005\.jpg\?v=20261126"/);
 assert.match(html,/src="https:\/\/rugiacreation.com\/ua\/cardlist\/small\/EX14BT_MCR-2-012\.jpg\?v=20261126"/);
 assert.match(html,/src="https:\/\/rugiacreation.com\/ua\/cardlist\/small\/UA36BT_MCR-1-001\.jpg\?v=20261126"/);
 assert.doesNotMatch(html,/src="https:\/\/www\.unionarena-tcg\.com/);
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/mcr:new Map\(mcrEditorCards\(\)\.map\(c=>\[c\.identity\|\|c\.id,c\.onlineImage\|\|c\.image\|\|null\]\)\)/);
 const editor=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.match(editor,/v2-deck-editor\.mjs\?v=[^"]*mcr12art1/);
});
