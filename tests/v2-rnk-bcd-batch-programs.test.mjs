import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_SOURCE_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_COMMON_BCD} from '../dist/rnk/jp-evidence-common-bcd.mjs';
import {RNK_PROGRAMS_COMMON_BCD} from '../dist/universal-v2/rnk/programs-common-bcd.mjs';
import {RNK_BATCH_STAGING_IDS,createRnkBcdBatchStagingPack} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const AP=['RNK-1-031','RNK-1-063','RNK-1-065','RNK-1-096','RNK-1-097'];
const VANILLA=['RNK-1-035','RNK-1-055','RNK-1-073'];

test('batch has fifty independent Japanese-checked cards spanning B,C,D, one shared schema',()=>{
 const pack=createRnkBcdBatchStagingPack();
 assert.equal(pack.kind,'ua-v2-pack');
 assert.equal(pack.id,'rnk');
 assert.equal(Object.keys(pack.cards).length,50);
 assert.deepEqual(Object.keys(pack.cards).sort(),RNK_BATCH_STAGING_IDS);
 assert.ok(pack.cards['RNK-1-036']);
 for(const id of [...AP,...VANILLA]){
   const card=pack.cards[id];
   assert.ok(card,id+' not compiled');
   assert.equal(card.title,'rnk');
   assert.ok(RNK_SOURCE_CATALOG.some(row=>row.id===id));
   assert.equal(RNK_IDENTITY_INVENTORY.find(row=>row.id===id).battleReady,false);
 }
});

test('all five AP 2-ready effects compile with precisely the same V2 opcode',()=>{
 const pack=createRnkBcdBatchStagingPack();
 for(const id of AP){
   const card=pack.cards[id];
   assert.equal(card.type,'event');
   assert.equal(card.trigger,'final');
   assert.equal(card.ap,1);
   assert.equal(card.energy,3);
   assert.deepEqual(card.effects.onPlay,[{op:'recoverAp',count:2}]);
 }
});

test('all three genuine vanillas are effectless; trigger persists',()=>{
 const pack=createRnkBcdBatchStagingPack();
 for(const id of VANILLA){
   const card=pack.cards[id];
   assert.equal(card.type,'character');
   assert.equal(card.trigger,'get');
   assert.equal(card.implementation,'vanilla');
   assert.deepEqual(card.effects,{});
 }
});

test('new B,C,D records have trustworthy Japanese evidence not inferred from Chinese text',()=>{
 assert.equal(Object.keys(RNK_JP_EVIDENCE_COMMON_BCD).length,7);
 for(const [id,ja] of Object.entries(RNK_JP_EVIDENCE_COMMON_BCD)){
   assert.equal(ja.print,'UA41BT/'+id);
   assert.ok(ja.nameJa&&ja.effectJa&&ja.triggerJa);
   assert.ok(ja.sourceJa.startsWith('https://www.torekaoh.shop-pro.jp/')||ja.sourceJa.startsWith('https://www.merucarduniari.jp/'));
   assert.ok(RNK_PROGRAMS_COMMON_BCD[id].ready);
 }
 assert.deepEqual(Object.keys(RNK_PROGRAMS_COMMON_BCD).sort(),
  Object.keys(RNK_JP_EVIDENCE_COMMON_BCD).sort());
});

test('batch cannot create a complete 50-card deck or enter official production pack yet',()=>{
 const pack=createRnkBcdBatchStagingPack();
 assert.ok(validateUniversalDeck(pack,{'RNK-1-063':4}).some(e=>e.includes('50')));
 assert.ok(validateUniversalDeck(pack,{'RNK-1-062':1}).some(e=>e.includes('Unregistered')));
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
 assert.equal(RNK_IDENTITY_INVENTORY.filter(row=>row.battleReady).length,0);
 assert.equal(RNK_IDENTITY_INVENTORY.filter(row=>row.effectImplemented).length,0);
});

test('B053 draws and then discards exactly one through common V2',()=>{
 const pack=createRnkBcdBatchStagingPack();
 const card=pack.cards['RNK-1-053'];
 assert.ok(card);
 assert.equal(card.name,'沢下条 張');
 assert.equal(card.type,'character');
 assert.equal(card.trigger,'draw');
 assert.equal(card.energy,0);
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1}]);
});
