import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_RULE_HOLDOUTS} from '../dist/rnk/jp-rule-holdouts.mjs';
import {createRnkBcdBatchStagingPack} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';

test('Japanese FAQ Q1607 locks RNK-1-062 until all printed clauses work together',()=>{
 const id='RNK-1-062',row=RNK_TC_CATALOG.find(c=>c.id===id);
 const hold=RNK_JP_RULE_HOLDOUTS[id];
 assert.ok(row);
 assert.equal(hold.print,row.number);
 assert.equal(hold.nameJa,'大型甲鉄艦 煉獄');
 assert.equal(hold.status,'JAPANESE_PRINT_CONFLICT');
 assert.equal(hold.sourceSummaryMismatch,true);
 assert.equal(hold.officialFaq,'Q1607');
 assert.match(hold.officialFaqTiming,/After block\/no-block/);
 assert.equal(hold.clauses.length,4);
 assert.equal(hold.needsUniversalSupport.length,3);
 assert.equal(hold.battleReady,false);
 assert.ok(hold.officialFaqUrl.includes('/jp/faq/'));
 assert.equal(createRnkBcdBatchStagingPack().cards[id],undefined);
 // Keep the user's existing Traditional Chinese display in this milestone.
 assert.equal(row.nameZhTw,'大型甲鐵艦煉獄');
 assert.equal(row.battleReady,false);
});
