import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_CARDS,TTG_BY_ID,normalizeTtgCounts} from '../dist/ttg-builder.mjs';
import {UA56BT_VERIFIED} from '../dist/gurren-lagann.mjs';
import {TTG_PENDING_CARDS} from '../dist/ttg-pending.mjs';

// Source: all eight original card fronts in a single PDF supplied by the user
// on 2026-10-13. Keep one row per ordinary card number; no AP art or parallels.
const newlyVerified=[
 ['002','ヴィラル','維拉爾','green',1,1,1500,1,'U','active',['大グレン団']],
 ['006','キタン','基坦','green',2,1,3000,1,'U',null,['大グレン団']],
 ['049','ギミー＆ダリー','吉米＆達莉','red',1,1,1500,2,'C',null,['大グレン団']],
 ['057','ダヤッカ','達雅卡','red',3,1,3000,2,'U',null,['大グレン団']],
 ['059','ニア','妮亞','red',1,1,1000,1,'C',null,['大グレン団']],
 ['063','ブータ','布塔','red',0,1,1000,1,'C',null,['大グレン団']],
 ['065','ヨーコ','庸子','red',1,1,2500,1,'C',null,['大グレン団']],
 ['071','キングキタンDX','國王基坦 DX','red',4,1,4000,1,'U','raid',['大グレン団','ガンメン']]
];
test('last eight original printed cards have exact source-inspected fields',()=>{
 for(const [no,name,nameZh,color,energy,ap,bp,gen,rarity,trigger,traits] of newlyVerified){
  const id='TTG-1-'+no,c=TTG_BY_ID[id];
  assert.ok(c,id+' must be in construction pool');
  assert.deepEqual(
   [c.number,c.nameJa,c.nameZh,c.color,c.energy,c.ap,c.bp,c.gen,c.rarity,c.trigger,c.traits],
   ['UA56BT/'+id,name,nameZh,color,energy,ap,bp,gen,rarity,trigger,traits],id);
  assert.equal(c.type,'character',id);
  assert.equal(c.verifiedFrom,'user-uploaded-card-front-pdf-2026-10-13');
  assert.equal(c.image,`https://rugiacreation.com/ua/cardlist/small/UA56BT_${id}.jpg?v=20261013`,'external ordinary-card art (no copies in repo)');
  assert.ok(c.effect?.length>15,id+' must contain full printed ability summary');
  assert.equal(c.auto,false,'printed card data alone must not unlock automated play');
 }
});
test('all 81 card IDs are unique, official rarity distribution is preserved',()=>{
 assert.equal(UA56BT_VERIFIED.length,81);
 assert.equal(TTG_CARDS.length,81);
 assert.equal(TTG_PENDING_CARDS.length,0);
 assert.equal(new Set(TTG_CARDS.map(c=>c.id)).size,81);
 for(let n=1;n<=81;n++)assert.ok(TTG_BY_ID['TTG-1-'+String(n).padStart(3,'0')],n);
 for(const [rarity,count] of Object.entries({SR:12,R:12,U:28,C:29}))
  assert.equal(TTG_CARDS.filter(c=>c.rarity===rarity).length,count,rarity);
});
test('last eight are deck-editable but still block engine matches',()=>{
 for(const [no] of newlyVerified){
  const id='TTG-1-'+no;
  const c=normalizeTtgCounts({[id]:4});
  assert.equal(c[id],4);
  assert.throws(()=>normalizeTtgCounts({[id]:5}));
 }
});
