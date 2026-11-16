import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_PASSIVE_BCD} from '../dist/rnk/jp-evidence-passive-bcd.mjs';
import {RNK_PROGRAMS_PASSIVE_BCD} from '../dist/universal-v2/rnk/programs-passive-bcd.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const PRINT=Object.fromEntries(RNK_TC_CATALOG.map(c=>[c.id,c]));
const IDS=['RNK-1-051','RNK-1-061','RNK-1-079','RNK-1-107'];
test('four Japanese print-backed passives remain compiled in the growing shared V2 staging pack',()=>{
 const pack=createRnkBcdBatchStagingPack();
 assert.equal(Object.keys(pack.cards).length,RNK_BATCH_STAGING_IDS.length);
 assert.deepEqual(Object.keys(RNK_PROGRAMS_PASSIVE_BCD).sort(),IDS);
 assert.deepEqual(Object.keys(RNK_JP_EVIDENCE_PASSIVE_BCD).sort(),IDS);
 for(const id of IDS){
  const original=PRINT[id],ja=RNK_JP_EVIDENCE_PASSIVE_BCD[id],v2=pack.cards[id];
  assert.ok(original);assert.ok(v2);
  assert.equal(original.battleReady,false);
  assert.equal(v2.name,ja.nameJa);
  assert.equal(ja.print,original.number);
  assert.ok(ja.sourceJa.startsWith('https://'));
  assert.equal(v2.implementation,'dsl');
  assert.deepEqual(v2.effects,{});
 }
});
test('conditional discounts are the existing exact V2 colors+amount profile',()=>{
 const pack=createRnkBcdBatchStagingPack();
 for(const [id,color,colors] of [
  ['RNK-1-051','purple',['blue','red']],
  ['RNK-1-079','red',['blue','purple']]
 ]){
  const card=pack.cards[id];
  assert.equal(card.color,color);
  assert.equal(card.energy,3);
  assert.equal(card.ap,1);
  assert.equal(card.bp,3000);
  assert.equal(card.gen,2);
  assert.deepEqual(card.opponentFieldColorsHandEnergyDiscount,{colors,amount:1});
 }
});
test('C061 / starter D107 keep exact IMPACT null keyword and their distinct triggers',()=>{
 const pack=createRnkBcdBatchStagingPack();
 for(const [id,color,bp,energy,trigger] of [
  ['RNK-1-061','purple',4000,4,'active'],
  ['RNK-1-107','red',2000,0,null]
 ]){
  const card=pack.cards[id];
  assert.equal(card.color,color);
  assert.equal(card.energy,energy);
  assert.equal(card.bp,bp);
  assert.equal(card.trigger,trigger);
  assert.equal(card.impactNull,true);
 }
 assert.equal(PRINT['RNK-1-107'].set,'UA41ST');
});
test('passive batch does not silently add production legal cards',()=>{
 assert.equal(Object.keys(officialV2Pack('rnk').cards).length,114);
 for(const id of IDS)assert.equal(PRINT[id].battleReady,false);
});
