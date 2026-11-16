import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_048} from '../dist/rnk/jp-evidence-048.mjs';
import {RNK_PROGRAMS_048} from '../dist/universal-v2/rnk/programs-048.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {validatePrintedPlayFilter,matchesPrintedPlayFilter} from '../dist/universal-v2/ap-discounts.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const id='RNK-1-048';
test('048 Japanese printed card and Q1599 next eligible rule ground shared-V2 program',()=>{
 const printed=RNK_TC_CATALOG.find(c=>c.id===id);
 const jp=RNK_JP_EVIDENCE_048[id];
 const pack=createRnkBcdBatchStagingPack();
 assert.equal(Object.keys(pack.cards).length,RNK_BATCH_STAGING_IDS.length);
 assert.equal(Object.keys(pack.cards).length,RNK_BATCH_STAGING_IDS.length);
 assert.ok(printed);
 assert.equal(printed.number,'UA41BT/RNK-1-048');
 assert.equal(jp.print,printed.number);
 assert.equal(jp.nameJa,'緋村 剣心');
 assert.match(jp.effectJa,/アクティブで場に登場/);
 assert.match(jp.effectJa,/必要エナジーが3以下の〈斎藤 一〉/);
 assert.equal(jp.officialFaq,'Q1599');
 assert.equal(printed.nameZhTw,'緋村劍心');
 assert.equal(printed.battleReady,false);
 assert.equal(printed.cardDataVerified,false);
 assert.equal(RNK_PROGRAMS_048[id].ready,true);
 assert.equal(pack.cards[id].name,jp.nameJa);
});
test('048 enters ACTIVE and discounts only next eligible printed Saito hand character',()=>{
 const card=createRnkBcdBatchStagingPack().cards[id];
 assert.equal(card.type,'character');
 assert.equal(card.color,'purple');
 assert.equal(card.energy,4);
 assert.equal(card.ap,2);
 assert.equal(card.bp,4000);
 assert.equal(card.trigger,'get');
 assert.equal(card.enterAlwaysActive,true);
 const op=card.effects.onPlay[0];
 assert.equal(op.op,'nextEligibleHandPlayApDiscount');
 const filter={cardType:'character',name:'斎藤 一',printedRequiredEnergyAtMost:3};
 assert.deepEqual(op.filter,filter);
 assert.equal(validatePrintedPlayFilter(filter),true);
 assert.equal(matchesPrintedPlayFilter({
  type:'character',name:'斎藤 一',energy:3
 },filter),true);
 assert.equal(matchesPrintedPlayFilter({
  type:'character',name:'斎藤 一',energy:4
 },filter),false);
 assert.equal(matchesPrintedPlayFilter({
  type:'character',name:'緋村 剣心',energy:2
 },filter),false);
 assert.equal(matchesPrintedPlayFilter({
  type:'event',name:'斎藤 一',energy:2
 },filter),false);
});
test('048 remains staging only; no production registry nor Chinese display changes',()=>{
 const card=createRnkBcdBatchStagingPack().cards[id];
 assert.equal(card.implementation,'dsl');
 assert.equal(card.effects.onPlay.length,1);
 assert.equal(Object.keys(officialV2Pack('rnk').cards).length,114);
});
