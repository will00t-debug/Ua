import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_SIMPLE_NEXT} from '../dist/rnk/jp-evidence-simple-next.mjs';
import {RNK_PROGRAMS_SIMPLE_NEXT} from '../dist/universal-v2/rnk/programs-simple-next.mjs';
import {RNK_BATCH_STAGING_IDS,createRnkBcdBatchStagingPack} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {rnkSharedCard} from '../dist/universal-v2/rnk-shared-adapter.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const catalog=Object.fromEntries(RNK_TC_CATALOG.map(c=>[c.id,c]));
test('092 and 104 use actual Japanese-print abilities, not translated guesses',()=>{
 for(const [id,print] of [
  ['RNK-1-092','UA41BT/RNK-1-092'],
  ['RNK-1-104','UA41ST/RNK-1-104']
 ]){
   const e=RNK_JP_EVIDENCE_SIMPLE_NEXT[id];
   assert.equal(e.print,print);
   assert.equal(catalog[id].number,print);
   assert.ok(e.nameJa&&e.effectJa&&e.triggerJa&&e.sourceJa.startsWith('https://'));
   assert.equal(RNK_PROGRAMS_SIMPLE_NEXT[id].ready,true);
   assert.equal(catalog[id].battleReady,false);
   assert.equal(catalog[id].cardDataVerified,false);
 }
 assert.match(RNK_JP_EVIDENCE_SIMPLE_NEXT['RNK-1-092'].effectJa,/ステップ/);
 assert.match(RNK_JP_EVIDENCE_SIMPLE_NEXT['RNK-1-104'].effectJa,/上か下に置く/);
});
test('092 empty-own-field red energy discount + printed STEP compile in common V2',()=>{
 const p=createRnkBcdBatchStagingPack(),c=p.cards['RNK-1-092'];
 assert.equal(Object.keys(p.cards).length,27);
 assert.deepEqual(Object.keys(p.cards).sort(),RNK_BATCH_STAGING_IDS);
 assert.equal(c.name,'明神 弥彦');
 assert.equal(c.type,'character');
 assert.equal(c.energy,2);
 assert.equal(c.color,'red');
 assert.equal(c.bp,2500);
 assert.equal(c.ap,1);
 assert.equal(c.trigger,'active');
 assert.equal(c.step,true);
 assert.equal(c.emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(c.effects,{});
 assert.equal(catalog['RNK-1-092'].nameZhTw,'明神彌彥');
});
test('starter-only 104 shows top card and puts it on top or bottom using shared V2',()=>{
 const p=createRnkBcdBatchStagingPack(),c=p.cards['RNK-1-104'];
 assert.equal(c.name,'関原 妙＆三条 燕');
 assert.equal(c.type,'character');
 assert.equal(c.color,'red');
 assert.equal(c.energy,3);
 assert.equal(c.ap,1);
 assert.equal(c.bp,3000);
 assert.equal(c.gen,2);
 assert.equal(c.trigger,'active');
 assert.deepEqual(c.effects.onPlay,[{op:'peekTopOrBottom'}]);
 assert.equal(catalog['RNK-1-104'].set,'UA41ST');
 assert.equal(catalog['RNK-1-104'].nameZhTw,'關原妙＆三條燕');
});
test('common pack remains strict about known operations and production exclusion',()=>{
 const p=createRnkBcdBatchStagingPack();
 assert.equal(Object.keys(p.cards).length,27);
 const bad=rnkSharedCard(catalog['RNK-1-104'],{
  ...RNK_PROGRAMS_SIMPLE_NEXT['RNK-1-104'],
  effects:{onPlay:[{op:'rnkPrivateLook'}]}
 },RNK_JP_EVIDENCE_SIMPLE_NEXT['RNK-1-104']);
 assert.throws(()=>createUniversalPack({id:'rnk',cards:[bad]}),/effect op unsupported/);
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
});
