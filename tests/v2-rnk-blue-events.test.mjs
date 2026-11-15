import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_BLUE_EVENTS} from '../dist/rnk/jp-evidence-blue-events.mjs';
import {RNK_PROGRAMS_BLUE_EVENTS} from '../dist/universal-v2/rnk/programs-blue-events.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const source=Object.fromEntries(RNK_TC_CATALOG.map(card=>[card.id,card]));
const ids=['RNK-1-030','RNK-1-032'];
const pack=createRnkBcdBatchStagingPack();

test('B030/B032 are Japanese-print backed shared programs, not partial card text approximations',()=>{
 assert.equal(pack.kind,'ua-v2-pack');
 assert.equal(pack.id,'rnk');
 assert.equal(Object.keys(pack.cards).length,33);
 assert.deepEqual(Object.keys(pack.cards).sort(),RNK_BATCH_STAGING_IDS);
 assert.deepEqual(Object.keys(RNK_JP_EVIDENCE_BLUE_EVENTS).sort(),ids);
 assert.deepEqual(Object.keys(RNK_PROGRAMS_BLUE_EVENTS).sort(),ids);
 for(const id of ids){
   const card=pack.cards[id],printed=source[id],jp=RNK_JP_EVIDENCE_BLUE_EVENTS[id];
   assert.ok(card&&printed&&jp);
   assert.equal(card.name,jp.nameJa);
   assert.equal(card.type,'event');
   assert.equal(card.color,'blue');
   assert.equal(card.ap,1);
   assert.equal(card.gen,0);
   assert.equal(card.implementation,'dsl');
   assert.equal(printed.number,jp.print);
   assert.ok(jp.sourceJa.startsWith('https://www.merucarduniari.jp/'));
   assert.equal(printed.battleReady,false);
   assert.equal(printed.cardDataVerified,false);
   assert.equal(RNK_PROGRAMS_BLUE_EVENTS[id].ready,true);
 }
 assert.equal(source['RNK-1-030'].nameZhTw,'九頭龍閃');
 assert.equal(source['RNK-1-032'].nameZhTw,'逆刃刀・真打');
});

test('030: BP 3000 retire; when Hiko exists BP 5000 and optional Kenshin +1000, SPECIAL trigger',()=>{
 const c=pack.cards['RNK-1-030'];
 assert.equal(c.energy,5);
 assert.equal(c.trigger,'special');
 assert.deepEqual(c.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(c.effects.onPlay,[
  {op:'retireOppFrontUnderBp',bp:3000,bonusName:'比古 清十郎',bonusBp:5000},
  {op:'ifLiveThen',when:{
   kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'比古 清十郎'
  },then:[{
   op:'buffOwnField',filter:{field:'name',value:'緋村 剣心'},
   bp:1000,optional:true,excludeSelf:false
  }]}
 ]);
 assert.match(RNK_JP_EVIDENCE_BLUE_EVENTS['RNK-1-030'].effectJa,/BP3000以下/);
 assert.match(RNK_JP_EVIDENCE_BLUE_EVENTS['RNK-1-030'].effectJa,/BP5000以下/);
});

test('032: mandatory exactly-one Kenshin buff, optional up-to-one AP ready, DRAW trigger',()=>{
 const c=pack.cards['RNK-1-032'];
 assert.equal(c.energy,2);
 assert.equal(c.trigger,'draw');
 assert.deepEqual(c.effects.onPlay,[
  {op:'buffOwnField',filter:{field:'name',value:'緋村 剣心'},
   bp:2000,optional:false,excludeSelf:false},
  {op:'recoverAp',count:1}
 ]);
 const ja=RNK_JP_EVIDENCE_BLUE_EVENTS['RNK-1-032'].effectJa;
 assert.match(ja,/剣心〉を1枚選び/);
 assert.match(ja,/APカードを1枚まで選び/);
});

test('new source checks do not enable RNK official battle pool',()=>{
 assert.equal(source['RNK-1-030'].battleReady,false);
 assert.equal(source['RNK-1-032'].battleReady,false);
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
});
