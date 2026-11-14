// Point-exchange promos and the UA05NC/MHA-3 book.
// Official sentences that the existing engine cannot finish stay pending.
// These modules stay out of the UA10BT / UA10ST editor and battle pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UAPR_MHA_POINT_CARDS} from '../dist/mha/uapr-point-cards.mjs';
import {UA05NC_MHA3_PRODUCT, UA05NC_MHA3_AP, UA05NC_MHA3_UNOFFICIAL_PREVIEW} from '../dist/mha/ua05nc-product.mjs';
import {UAPR_MHA_REQUESTS} from '../dist/universal-v2/mha/programs-uapr.mjs';
import {mhaEditorCards, MHA_CATALOG, MHA_CATALOG_051_100} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack, MHA_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/mha-pack.mjs';
import {getTitle} from '../dist/title-registry.mjs';

const byId=id=>UAPR_MHA_POINT_CARDS.find(card=>card.id===id);

test('three point-exchange cards keep the official printing', ()=>{
 assert.deepEqual(UAPR_MHA_POINT_CARDS.map(card=>card.number), [
  'UAPR/MHA-P-001','UAPR/MHA-P-002','UAPR/MHA-P-003'
 ]);
 const deku=byId('MHA-P-001');
 assert.equal(deku.nameJa,'緑谷 出久');
 assert.equal(deku.ruby,'みどりや いずく');
 assert.equal(deku.color,'yellow');
 assert.equal(deku.energy,1);
 assert.equal(deku.ap,1);
 assert.equal(deku.bp,1500);
 assert.equal(deku.bpMark,'+');
 assert.equal(deku.gen,1);
 assert.deepEqual(deku.traits,['A組']);
 assert.equal(deku.trigger,'draw');
 assert.equal(deku.triggerTextJa,'【ドロー】カードを1枚引く。');
 assert.equal(deku.effectJa,
  '自分の場に〈緑谷 出久〉以外の［特徴：A組］がある場合、このカードは手札から登場できない。\n'+
  '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）\n'+
  '【自分のターン中】自分の場と場外にある異なるカード名の［特徴：ワン・フォー・オール］の種類1枚につき、このキャラはBP+500。');
 assert.equal(deku.image,'https://www.unionarena-tcg.com/jp/images/cardlist/card/UAPR_MHA-P-001.png?v9');
 assert.deepEqual(deku.faq,[]);

 const shigaraki=byId('MHA-P-002');
 assert.equal(shigaraki.nameJa,'死柄木 弔');
 assert.equal(shigaraki.ruby,'しがらき とむら');
 assert.equal(shigaraki.color,'purple');
 assert.equal(shigaraki.energy,2);
 assert.equal(shigaraki.bp,1000);
 assert.equal(shigaraki.bpMark,'');
 assert.deepEqual(shigaraki.traits,[]);
 assert.equal(shigaraki.trigger,'draw');
 assert.equal(shigaraki.effectJa,
  '自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを［紫×2］減らす。\n'+
  'このキャラがレイドされた時、このカードの【登場時】を発動する。（レイドしたキャラの【登場時】とこの効果は望む順で処理する）\n'+
  '【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、BP2500以上の相手のフロントLのキャラを1枚選び、このターン中、BP-2000。');
 assert.deepEqual(shigaraki.faq,[]);

 const hawks=byId('MHA-P-003');
 assert.equal(hawks.nameJa,'ホークス');
 assert.equal(hawks.ruby,'ほーくす');
 assert.equal(hawks.color,'red');
 assert.equal(hawks.energy,2);
 assert.equal(hawks.bp,3000);
 assert.equal(hawks.trigger,null);
 assert.equal(hawks.triggerTextJa,'-');
 assert.equal(hawks.effectJa,
  '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）\n'+
  '【登場時】自分の手札を1枚裏向きで自分の場の〈ホークス〉の下に置いてもよい。この効果でこのキャラの下に裏向きのカードを置いた場合、自分の山札の上から2枚見て、1枚まで手札に加える。残りを場外に置く。');
 assert.equal(hawks.faq.length,1);
 assert.equal(hawks.faq[0].id,'Q2069');
 assert.equal(hawks.faq[0].date,'2026.04.17 更新');
 assert.match(hawks.faq[0].q,/裏向きのカード/);
 assert.match(hawks.faq[0].a,/相手の場のカードの下に置かれた「裏向きのカード」は確認できません/);

 for(const card of UAPR_MHA_POINT_CARDS){
  assert.equal(card.set,'UAPR');
  assert.equal(card.type,'character');
  assert.equal(card.rarity,'PR');
  assert.equal(card.auto,false);
  assert.equal(card.battleReady,false);
  assert.equal(card.playable,false);
  assert.equal(card.deckLegal,true);
  assert.equal(card.id.startsWith('MHA-1-'),false);
  assert.equal(card.id.startsWith('MHA-2-'),false);
  assert.equal(card.number.startsWith('UA10BT/'),false);
  assert.equal(card.number.startsWith('EX06BT/'),false);
 }
});

test('no printed sentence is marked ready on the existing engine', ()=>{
 assert.equal(UAPR_MHA_REQUESTS.length,3);
 assert.deepEqual(UAPR_MHA_REQUESTS.map(row=>row.cardId), ['MHA-P-001','MHA-P-002','MHA-P-003']);
 for(const row of UAPR_MHA_REQUESTS){
  assert.equal(row.ready,false);
  assert.equal(row.whyNotEnough.length>0,true);
 }
 assert.equal(UAPR_MHA_REQUESTS.some(row=>row.ready),false);
});

test('MHA-1 and MHA-2 catalogs stay at the closed 109-card pack', ()=>{
 const editor=mhaEditorCards();
 assert.equal(editor.length,109);
 assert.equal(MHA_CATALOG.length,50);
 assert.equal(MHA_CATALOG_051_100.length,50);
 assert.equal(editor.some(card=>card.id==='MHA-1-001'),true);
 assert.equal(editor.some(card=>card.id==='MHA-1-100'),true);
 assert.equal(editor.some(card=>card.number.startsWith('UAPR/')||card.number.startsWith('UA05NC/')),false);
 assert.equal(editor.some(card=>card.playable!==false||card.battleReady!==false),false);

 const pack=createMhaV2Pack();
 assert.equal(pack.version,'mha-ua10-ready-109');
 assert.equal(Object.keys(pack.cards).length,109);
 assert.equal(pack.cards['MHA-P-001'],undefined);
 assert.equal(pack.cards['MHA-P-002'],undefined);
 assert.equal(pack.cards['MHA-P-003'],undefined);
 assert.equal(MHA_OFFICIAL_MATCH_CLOSED.length>0,true);

 const title=getTitle('mha');
 assert.equal(title.playable,false);
 assert.equal(title.cards.length,109);
 assert.equal(title.cards.some(card=>String(card.number).startsWith('UAPR/')||String(card.number).startsWith('UA05NC/')),false);

 const sources=[
  'dist/mha/catalog.mjs',
  'dist/universal-v2/mha-pack.mjs',
  'dist/title-registry.mjs',
  'dist/universal-v2/mha/programs.mjs',
  'dist/universal-v2/mha/programs-001-050.mjs',
  'dist/universal-v2/mha/programs-051-100.mjs'
 ];
 for(const path of sources){
  const text=readFileSync(new URL('../'+path, import.meta.url), 'utf8');
  assert.equal(text.includes('uapr-point-cards'),false, path);
  assert.equal(text.includes('ua05nc-product'),false, path);
  assert.equal(text.includes('programs-uapr'),false, path);
  assert.equal(text.includes('MHA-P-00'),false, path);
 }
});

test('the book set records the product and leaves unpublished cards out', ()=>{
 const book=UA05NC_MHA3_PRODUCT;
 assert.equal(book.id,'UA05NC');
 assert.equal(book.series,'MHA-3');
 assert.equal(book.kind,'new-card-selection');
 assert.equal(book.magazineAppendix,false);
 assert.equal(book.release,'2026-12-11');
 assert.equal(book.releaseJa,'2026年12月11日(金)');
 assert.equal(book.priceYen,2640);
 assert.equal(book.effectCards,11);
 assert.equal(book.actionPointCards,1);
 assert.equal(book.cards.length,0);
 assert.equal(book.ap,UA05NC_MHA3_AP);
 assert.equal(UA05NC_MHA3_AP.registered,false);
 assert.equal(UA05NC_MHA3_AP.type,'action-point');
 assert.equal(UA05NC_MHA3_AP.battleCard,false);
 assert.equal(UA05NC_MHA3_AP.deckLegal,false);
 assert.equal(UA05NC_MHA3_AP.number,null);
 assert.equal(UA05NC_MHA3_UNOFFICIAL_PREVIEW.length,4);
 for(const row of UA05NC_MHA3_UNOFFICIAL_PREVIEW){
  assert.equal(row.number,undefined);
  assert.equal(row.id,undefined);
  assert.match(row.note,/非官方預覽/);
 }
 assert.equal(book.cards.includes(UA05NC_MHA3_AP),false);
});
