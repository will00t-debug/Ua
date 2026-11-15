import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_BCD_NEXT4} from '../dist/rnk/jp-evidence-bcd-next4.mjs';
import {RNK_PROGRAMS_BCD_NEXT4} from '../dist/universal-v2/rnk/programs-bcd-next4.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const catalog=Object.fromEntries(RNK_TC_CATALOG.map(x=>[x.id,x]));
const ids=['RNK-1-049','RNK-1-057','RNK-1-083','RNK-1-108'];
const pack=createRnkBcdBatchStagingPack();

test('audited cards compile as one shared V2 pack, and four newly audited Japanese prints match numbers',()=>{
 assert.equal(Object.keys(pack.cards).length,RNK_BATCH_STAGING_IDS.length);
 assert.deepEqual(Object.keys(pack.cards).sort(),RNK_BATCH_STAGING_IDS);
 assert.deepEqual(Object.keys(RNK_JP_EVIDENCE_BCD_NEXT4).sort(),ids);
 assert.deepEqual(Object.keys(RNK_PROGRAMS_BCD_NEXT4).sort(),ids);
 for(const id of ids){
  const printed=catalog[id],j=RNK_JP_EVIDENCE_BCD_NEXT4[id];
  assert.ok(printed);assert.ok(pack.cards[id]);
  assert.equal(printed.number,j.print);
  assert.equal(printed.nameZhTw,printed.name,'Chinese name display should not be overwritten');
  assert.ok(j.nameJa&&j.effectJa&&j.triggerJa&&j.sourceJa.startsWith('https://www.merucarduniari.jp/product/'));
  assert.equal(pack.cards[id].name,j.nameJa);
  assert.equal(printed.battleReady,false);
  assert.equal(printed.cardDataVerified,false);
  assert.equal(RNK_IDENTITY_INVENTORY.find(x=>x.id===id).effectImplemented,false);
 }
});

test('049 and 083 use the exact shared any-line REST gain-energy-and-retire-end-main job',()=>{
 const main={op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1};
 for(const [id,color] of [['RNK-1-049','purple'],['RNK-1-083','red']]){
  const c=pack.cards[id];
  assert.equal(c.name,id==='RNK-1-049'?'三島 栄次':'塚山 由太郎');
  assert.equal(c.color,color);
  assert.equal(c.type,'character');
  assert.equal(c.energy,0);
  assert.equal(c.ap,1);
  assert.equal(c.bp,1000);
  assert.equal(c.gen,1);
  assert.equal(c.trigger,null);
  assert.deepEqual(c.mainAbility,main);
  assert.deepEqual(c.effects,{});
  assert.match(RNK_JP_EVIDENCE_BCD_NEXT4[id].effectJa,/メインフェイズ終了時に退場/);
 }
});

test('057 uses the generic name-or-trait top-three search, with conditional hand discard',()=>{
 const c=pack.cards['RNK-1-057'];
 assert.equal(c.name,'瀬田 宗次郎');
 assert.equal(c.color,'purple');
 assert.equal(c.energy,3);
 assert.equal(c.gen,2);
 assert.equal(c.bp,2500);
 assert.equal(c.trigger,'active');
 assert.deepEqual(c.traits,['十本刀']);
 assert.deepEqual(c.effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'name',value:'志々雄 真実'},
   {field:'name',value:'駒形 由美'},
   {field:'trait',value:'十本刀'}
  ]
 }]);
 assert.match(RNK_JP_EVIDENCE_BCD_NEXT4['RNK-1-057'].effectJa,/加えた場合/);
});

test('starter-only 108 uses existing shared FIELD REST / DRAW / DISCARD main job',()=>{
 const c=pack.cards['RNK-1-108'];
 assert.equal(c.name,'神谷道場');
 assert.equal(c.type,'field');
 assert.equal(c.energy,2);
 assert.equal(c.ap,1);
 assert.equal(c.gen,1);
 assert.equal(c.color,'red');
 assert.equal(c.trigger,'get');
 assert.deepEqual(c.mainAbility,{op:'fieldRestDiscardDraw'});
 assert.deepEqual(c.effects,{});
 assert.equal(catalog['RNK-1-108'].set,'UA41ST');
 assert.match(RNK_JP_EVIDENCE_BCD_NEXT4['RNK-1-108'].effectJa,/カードを1枚引き/);
});

test('batch stays staging-only and cannot make partially mapped card programs battle ready',()=>{
 for(const id of ids)assert.equal(RNK_PROGRAMS_BCD_NEXT4[id].ready,true);
 assert.equal(pack.cards['RNK-1-075'],undefined,'unblocked-draw timing is not silently treated as ready');
 assert.equal(pack.cards['RNK-1-113'],undefined,'skip-next-active remains blocked pending full gameplay support');
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
});
