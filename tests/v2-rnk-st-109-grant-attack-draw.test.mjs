import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_ST_109} from '../dist/rnk/jp-evidence-st-109.mjs';
import {RNK_PROGRAMS_ST_109} from '../dist/universal-v2/rnk/programs-st-109.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {V2_EFFECT_OPS,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
const id='RNK-1-109';
const source=RNK_TC_CATALOG.find(c=>c.id===id);
const pack=createRnkBcdBatchStagingPack();

test('starter 109 Japanese evidence, official English agreement, and original Traditional Chinese remain distinct',()=>{
 const jp=RNK_JP_EVIDENCE_ST_109[id];
 assert.equal(jp.print,'UA41ST/RNK-1-109');
 assert.equal(jp.print,source.number);
 assert.equal(jp.nameJa,'逆刃刀');
 assert.match(jp.effectJa,/カードを1枚引く/);
 assert.match(jp.effectJa,/1枚まで選び/);
 assert.match(jp.effectJa,/アタック時/);
 assert.match(jp.triggerJa,/ドロー/);
 assert.equal(jp.sourceJa,'https://www.merucarduniari.jp/product/13001');
 assert.ok(jp.officialEnglish.includes('/en/cardlist/'));
 assert.equal(jp.clauses.length,4);
 assert.equal(source.set,'UA41ST');
 assert.equal(source.nameZhTw,'逆刃刀');
 assert.equal(source.battleReady,false);
 assert.equal(source.cardDataVerified,false);
 assert.equal(RNK_IDENTITY_INVENTORY.find(c=>c.id===id).effectImplemented,false);
});

test('50-card staging pack compiles 109 through existing Universal V2 grantOnAttack',()=>{
 assert.equal(pack.kind,'ua-v2-pack');
 assert.equal(Object.keys(pack.cards).length,RNK_BATCH_STAGING_IDS.length);
 assert.deepEqual(Object.keys(pack.cards).sort(),RNK_BATCH_STAGING_IDS);
 const c=pack.cards[id],program=RNK_PROGRAMS_ST_109[id];
 assert.equal(c.name,'逆刃刀');
 assert.equal(c.type,'event');
 assert.equal(c.color,'red');
 assert.equal(c.energy,2);
 assert.equal(c.ap,1);
 assert.equal(c.bp,0);
 assert.equal(c.gen,0);
 assert.equal(c.trigger,'draw');
 assert.equal(c.implementation,'dsl');
 assert.equal(program.ready,true);
 assert.deepEqual(c.effects.onPlay,[
  {op:'draw',count:1},
  {op:'grantOnAttack',target:'ownCharacter',name:'緋村 剣心',
   optional:true,until:'endOfTurn',then:[{op:'draw',count:1}]}
 ]);
 for(const op of c.effects.onPlay)assert.ok(V2_EFFECT_OPS.includes(op.op));
});

test('109 does not allow missing optional Kenshin to prevent its mandatory first draw',()=>{
 const c=pack.cards[id];
 assert.equal(c.effects.onPlay[0].op,'draw');
 assert.equal(c.effects.onPlay[1].optional,true);
 assert.equal(c.effects.onPlay[1].target,'ownCharacter');
 assert.equal(c.effects.onPlay[1].name,'緋村 剣心');
 assert.notEqual(c.effects.onPlay[1].name,'緋村劍心');
 assert.ok(validateUniversalDeck(pack,{[id]:4}).some(s=>s.includes('50')));
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
});
