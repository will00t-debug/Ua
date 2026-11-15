import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_BLUE_COMMON} from '../dist/rnk/jp-evidence-blue-common.mjs';
import {RNK_PROGRAMS_BLUE_COMMON} from '../dist/universal-v2/rnk/programs-blue-common.mjs';
import {rnkJapaneseTraits} from '../dist/universal-v2/rnk-shared-adapter.mjs';
import {RNK_BATCH_STAGING_IDS,createRnkBcdBatchStagingPack} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {cardHasTrait} from '../dist/universal-v2/field-conditions.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const ids=['003','004','006','009','012','014','015','020','021','022','023','027'].map(n=>'RNK-1-'+n);
const source=Object.fromEntries(RNK_TC_CATALOG.map(c=>[c.id,c]));
const pack=createRnkBcdBatchStagingPack();
const card=n=>pack.cards['RNK-1-'+n];

test('twelve source-verified blue programs share the regular 46-card Universal V2 compiler',()=>{
 assert.equal(pack.kind,'ua-v2-pack');
 assert.equal(pack.id,'rnk');
 assert.equal(Object.keys(pack.cards).length,46);
 assert.deepEqual(Object.keys(pack.cards).sort(),RNK_BATCH_STAGING_IDS);
 assert.deepEqual(Object.keys(RNK_JP_EVIDENCE_BLUE_COMMON).sort(),ids);
 assert.deepEqual(Object.keys(RNK_PROGRAMS_BLUE_COMMON).sort(),ids);
 for(const id of ids){
   const jp=RNK_JP_EVIDENCE_BLUE_COMMON[id],tc=source[id],v2=pack.cards[id];
   assert.ok(jp&&tc&&v2,id+' missing');
   assert.equal(jp.print,tc.number,id);
   assert.equal(tc.color,'blue',id);
   assert.equal(tc.cardDataVerified,false,id);
   assert.equal(tc.battleReady,false,id);
   assert.equal(v2.implementation,'dsl',id);
   assert.equal(v2.name,jp.nameJa,id);
   assert.equal(v2.energy,tc.energy,id);
   assert.equal(v2.ap,tc.ap,id);
   assert.equal(v2.bp,tc.bp,id);
   assert.equal(v2.trigger,tc.trigger,id);
   assert.ok(jp.effectJa&&jp.triggerJa&&jp.sourceJa.startsWith('https://www.merucarduniari.jp/'),id);
 }
});

test('003,004 reuse exactly the existing shared V2 temporary energy and mandatory bounce',()=>{
 assert.equal(card('003').bp,1000,'official JP/EN/TW print overrides mistaken merchant BP 2000');
 assert.equal(card('003').energy,0);
 assert.equal(card('003').gen,1);
 assert.deepEqual(card('003').mainAbility,{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1
 });
 assert.deepEqual(card('004').effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
 assert.equal(card('004').energy,1);
 assert.equal(card('004').bp,1500);
 assert.equal(card('004').gen,2);
});

test('006,014 share optional Kenshin buff and mandatory draw then discard',()=>{
 assert.deepEqual(card('006').effects.onPlay,[{
   op:'buffOwnField',filter:{field:'name',value:'緋村 剣心'},
   bp:1000,optional:true,excludeSelf:false
 }]);
 assert.equal(card('006').trigger,'draw');
 assert.deepEqual(card('014').effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.equal(card('014').trigger,'active');
});

test('009 preserves impact null AND two-card reorder with arbitrary deck-top and outside split',()=>{
 const v=card('009');
 assert.equal(v.impactNull,true);
 assert.equal(v.bp,2000);
 assert.equal(v.trigger,null);
 assert.deepEqual(v.effects.onPlay,[{
  op:'inspectTopArrange',count:2,toOutside:true,rest:'top'
 }]);
});

test('012 hand cost discount and 015 own-turn-only +1000 BP use existing passives',()=>{
 assert.deepEqual(card('012').opponentFieldColorsHandEnergyDiscount,{
  colors:['purple','red'],amount:1
 });
 assert.equal(card('012').energy,3);
 assert.equal(card('012').bp,3000);
 assert.equal(card('015').ownTurnBp,1000);
 assert.equal(card('015').bp,2000);
 assert.deepEqual(card('015').effects,{});
});

test('020 retires and draws only if an own Aoshi remains on field',()=>{
 const v=card('020');
 assert.equal(v.type,'character');
 assert.equal(v.energy,0);
 assert.equal(v.trigger,null);
 assert.deepEqual(v.effects.onRetire,[{
  op:'drawIfOwnName',name:'四乃森 蒼紫',count:1
 }]);
});

test('021 name OR JP trait search uses Japanese canonical trait on every source character',()=>{
 const v=card('021');
 assert.deepEqual(v.effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',
  filters:[{field:'name',value:'高荷 恵'},{field:'trait',value:'御庭番衆'}]
 }]);
 assert.deepEqual(source['RNK-1-014'].traits,['御庭番眾']);
 assert.deepEqual(card('014').traits,['御庭番衆']);
 assert.deepEqual(v.traits,['御庭番衆']);
 assert.equal(cardHasTrait(card('014'),'御庭番衆'),true);
 assert.equal(cardHasTrait(card('014'),'御庭番眾'),false);
 assert.deepEqual(rnkJapaneseTraits(['御庭番眾','十本刀']),['御庭番衆','十本刀']);
 assert.equal(source['RNK-1-014'].nameZhTw,'四乃森蒼紫');
});

test('022,023,027 reuse plain impact null, active energy +1 and FINAL AP recovery',()=>{
 assert.equal(card('022').impactNull,true);
 assert.equal(card('022').trigger,'draw');
 assert.equal(card('023').activeExtraEnergy,1);
 assert.equal(card('023').trigger,null);
 assert.equal(card('027').type,'event');
 assert.equal(card('027').trigger,'final');
 assert.equal(card('027').energy,3);
 assert.deepEqual(card('027').traits,[],'official card has no trait; merchant metadata is wrong');
 assert.deepEqual(card('027').effects.onPlay,[{op:'recoverAp',count:2}]);
});

test('blue staging never changes TC display or enables production gameplay',()=>{
 for(const id of ids){
  assert.equal(source[id].battleReady,false);
  assert.ok(pack.cards[id]);
 }
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
});
