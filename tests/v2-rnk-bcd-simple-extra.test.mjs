import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_SIMPLE_NEXT} from '../dist/rnk/jp-evidence-simple-next.mjs';
import {RNK_PROGRAMS_SIMPLE_NEXT} from '../dist/universal-v2/rnk/programs-simple-next.mjs';
import {RNK_BATCH_STAGING_IDS,createRnkBcdBatchStagingPack} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
const base=Object.fromEntries(RNK_TC_CATALOG.map(c=>[c.id,c]));

test('Japanese 046 and 064 source numbers, printed effects and triggers are pinned',()=>{
 for(const id of ['RNK-1-046','RNK-1-064']){
  const e=RNK_JP_EVIDENCE_SIMPLE_NEXT[id], c=base[id];
  assert.ok(e&&c);
  assert.equal(e.print,c.number);
  assert.equal(c.set,'UA41BT');
  assert.ok(e.effectJa&&e.triggerJa&&e.sourceJa.includes('torekaoh.shop-pro.jp'));
  assert.equal(c.battleReady,false);
  assert.equal(c.cardDataVerified,false);
 }
 assert.match(RNK_JP_EVIDENCE_SIMPLE_NEXT['RNK-1-046'].effectJa,/場外に置く/);
 assert.match(RNK_JP_EVIDENCE_SIMPLE_NEXT['RNK-1-064'].effectJa,/BP5000以下/);
});
test('046 main hand discard is exactly a shared V2 once-per-turn self BP buff',()=>{
 const pack=createRnkBcdBatchStagingPack();
 assert.equal(Object.keys(pack.cards).length,RNK_BATCH_STAGING_IDS.length);
 assert.deepEqual(Object.keys(pack.cards).sort(),RNK_BATCH_STAGING_IDS);
 const c=pack.cards['RNK-1-046'];
 assert.equal(c.name,'緋村 剣心');
 assert.equal(c.color,'purple');
 assert.equal(c.bp,3000);
 assert.equal(c.energy,3);
 assert.equal(c.gen,2);
 assert.equal(c.trigger,'active');
 assert.deepEqual(c.mainAbility,{
  op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1000
 });
 assert.deepEqual(c.effects,{});
});
test('064 target cap is 3000, or 5000 if own Saito present; printed SPECIAL stays generic',()=>{
 const c=createRnkBcdBatchStagingPack().cards['RNK-1-064'];
 assert.equal(c.type,'event');
 assert.equal(c.name,'牙突');
 assert.equal(c.color,'purple');
 assert.equal(c.energy,4);
 assert.equal(c.ap,1);
 assert.equal(c.trigger,'special');
 assert.deepEqual(c.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(c.effects.onPlay,[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:'斎藤 一',bonusBp:5000
 }]);
 assert.equal(RNK_PROGRAMS_SIMPLE_NEXT['RNK-1-064'].implementation,'dsl');
});
test('both staged programs are excluded from production until actual match verification',()=>{
 const pack=createRnkBcdBatchStagingPack();
 for(const id of ['RNK-1-046','RNK-1-064'])assert.ok(pack.cards[id]);
 assert.equal(Object.keys(officialV2Pack('rnk').cards).length,114);
});
