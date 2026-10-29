import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mstOfficialCardArt,MST_OFFICIAL_ART_BASE} from '../dist/mst-art.mjs';
import {UA54BT_VERIFIED as editorCatalogue} from '../dist/mushoku-tensei.mjs';
import {MST_V2_OFFICIAL_CATALOGUE as battleCatalogue} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {MST_CARDS} from '../dist/mst-builder.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('all 80 numbered MST regular prints expose the same official images in editor and V2 battle',()=>{
 for(const [label,cards] of [['editor',editorCatalogue],['builder',MST_CARDS],['battle',battleCatalogue]]){
  assert.equal(cards.length,80,label);
  for(let n=1;n<=80;n++){
   const id='MST-1-'+String(n).padStart(3,'0');
   const card=cards[n-1];
   assert.equal(card.id,id,label+' '+n);
   assert.equal(card.image,MST_OFFICIAL_ART_BASE+'UA54BT_'+id+'.png?v9=',label+' '+id);
   assert.notEqual(card.image,'assets/mark.svg');
  }
 }
});
test('official card image resolver rejects arbitrary, AP and out-of-range card IDs',()=>{
 for(const id of ['MST-1-000','MST-1-081','MST-1-999','MST-1-01',
  'UA54BT/MST-1-018','MST-1-018_p','../MST-1-018','BLC-1-018',null])
  assert.equal(mstOfficialCardArt(id),null,String(id));
 for(const n of [1,18,36,48,58,68,80]){
  const id='MST-1-'+String(n).padStart(3,'0');
  assert.match(mstOfficialCardArt(id),/^https:\/\/www\.unionarena-tcg\.com\/jp\/images\/cardlist\/card\/UA54BT_MST-1-\d{3}\.png\?v9=$/);
 }
});
test('deck editor and match use official art through unchanged image-field consumers',()=>{
 const editor=read('dist/v2-deck-editor.mjs');
 const battle=read('dist/universal-v2-preview.mjs');
 assert.match(editor,/card\.onlineImage\|\|card\.image\|\|'assets\/mark\.svg'/);
 assert.match(battle,/MST_V2_OFFICIAL_CATALOGUE\.map\(c=>\[c\.id,c\.image\|\|null\]\)/);
});
