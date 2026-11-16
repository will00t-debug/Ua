import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_FAST_BCD} from '../dist/rnk/jp-evidence-fast-bcd.mjs';
import {RNK_PROGRAMS_FAST_BCD} from '../dist/universal-v2/rnk/programs-fast-bcd.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {V2_EFFECT_OPS} from '../dist/universal-v2/pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const SOURCE=Object.fromEntries(RNK_TC_CATALOG.map(x=>[x.id,x]));
const NAMES=Object.keys(RNK_JP_EVIDENCE_FAST_BCD).sort();
const EXPECTED=['RNK-1-041','RNK-1-047','RNK-1-068','RNK-1-069',
 'RNK-1-074','RNK-1-078','RNK-1-080','RNK-1-081','RNK-1-091'];
test('nine specific effects are individually source-grounded and compiled in the expanding shared V2 pack',()=>{
 assert.deepEqual(NAMES,EXPECTED);
 assert.deepEqual(Object.keys(RNK_PROGRAMS_FAST_BCD).sort(),EXPECTED);
 const pack=createRnkBcdBatchStagingPack();
 assert.equal(pack.kind,'ua-v2-pack');
 assert.equal(Object.keys(pack.cards).length,RNK_BATCH_STAGING_IDS.length);
 assert.deepEqual(Object.keys(pack.cards).sort(),RNK_BATCH_STAGING_IDS);
 for(const id of EXPECTED){
   const printed=SOURCE[id],ja=RNK_JP_EVIDENCE_FAST_BCD[id],program=RNK_PROGRAMS_FAST_BCD[id];
   assert.ok(printed,id+' missing source');
   assert.ok(pack.cards[id],id+' not in compiled pack');
   assert.equal(printed.battleReady,false);
   assert.equal(printed.cardDataVerified,false);
   assert.equal(ja.print,printed.number);
   assert.ok(ja.nameJa&&ja.effectJa&&ja.triggerJa&&ja.sourceJa.startsWith('https://'));
   assert.equal(pack.cards[id].name,ja.nameJa);
   assert.equal(program.ready,true);
   assert.equal(pack.cards[id].implementation,program.implementation);
 }
});
test('B041 and C078 both use mandatory low-energy own-other bounce, preserving printed energy',()=>{
 const pack=createRnkBcdBatchStagingPack();
 for(const id of ['RNK-1-041','RNK-1-078']){
  const card=pack.cards[id];
  assert.deepEqual(card.effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
  assert.equal(card.energy,1);assert.equal(card.ap,1);assert.equal(card.bp,1500);
  assert.equal(card.gen,2);
  assert.equal(card.type,'character');
  assert.equal(card.trigger,null);
 }
 assert.equal(pack.cards['RNK-1-041'].color,'purple');
 assert.equal(pack.cards['RNK-1-078'].color,'red');
});
test('B047 and C081 get a second color energy ONLY while active via shared passive',()=>{
 const pack=createRnkBcdBatchStagingPack();
 for(const id of ['RNK-1-047','RNK-1-081']){
   const card=pack.cards[id];
   assert.equal(card.activeExtraEnergy,1);
   assert.deepEqual(card.effects,{});
   assert.equal(card.energy,2);
   assert.equal(card.ap,1);
   assert.equal(card.gen,1);
   assert.equal(card.bp,2500);
   assert.equal(card.trigger,null);
 }
 assert.equal(pack.cards['RNK-1-047'].color,'purple');
 assert.equal(pack.cards['RNK-1-081'].color,'red');
});
test('C068 draw-discard, C069/C080 other-only BP buff reuse common operations',()=>{
 const pack=createRnkBcdBatchStagingPack();
 const draw=pack.cards['RNK-1-068'];
 assert.deepEqual(draw.effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.equal(draw.energy,0);assert.equal(draw.trigger,'draw');assert.equal(draw.bp,1500);
 for(const [id,bp,energy,trigger] of [
  ['RNK-1-069',1500,1,'active'],['RNK-1-080',500,0,'draw']
 ]){
  const card=pack.cards[id];
  assert.equal(card.bp,bp);assert.equal(card.energy,energy);assert.equal(card.trigger,trigger);
  assert.deepEqual(card.effects.onPlay,[{
    op:'buffOwnField',filter:{field:'type',value:'character'},
    bp:1000,optional:true,excludeSelf:true
  }]);
 }
});
test('C074 and D091 truly have no printed main effect, but do have ACTIVE trigger',()=>{
 const pack=createRnkBcdBatchStagingPack();
 for(const id of ['RNK-1-074','RNK-1-091']){
   const card=pack.cards[id];
   assert.equal(card.implementation,'vanilla');
   assert.equal(card.type,'character');
   assert.equal(card.trigger,'active');
   assert.deepEqual(card.effects,{});
   assert.equal(RNK_JP_EVIDENCE_FAST_BCD[id].effectJa,'-');
 }
});
test('no RNK-specific effect opcode, no premature production integration',()=>{
 for(const program of Object.values(RNK_PROGRAMS_FAST_BCD)){
  for(const effects of Object.values(program.effects||{})){
   for(const x of effects)assert.ok(V2_EFFECT_OPS.includes(x.op),'unexpected non-shared op '+x.op);
  }
 }
 assert.equal(Object.keys(officialV2Pack('rnk').cards).length,114);
});
