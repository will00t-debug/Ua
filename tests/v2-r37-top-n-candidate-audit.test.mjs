import test from 'node:test';
import assert from 'node:assert/strict';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {classifyTopNPrint,r37TopNCandidateReport}
 from '../scripts/v2-r37-top-n-candidate-report.mjs';
test('R37 TOP-N scans every unported physical card ID across five independently counted works',()=>{
 const report=r37TopNCandidateReport(),live=v2AllTitleInventory();
 assert.equal(report.stats.totalSource,700);
 assert.equal(report.stats.unported,live.totals.blocked);
 assert.equal(report.stats.sourceTextScanned,live.totals.blocked);
 assert.equal(report.candidates.length+report.unportedNoTopCandidate.length,live.totals.blocked);
 assert.equal(new Set([...report.candidates.map(x=>x.id),...report.unportedNoTopCandidate]).size,
  live.totals.blocked);
 assert.deepEqual(report.sourceVerifiedNowRegistered.map(x=>[x.id,x.registered]),[
  ['SAO-1-031',true],['SAO-1-066',true],['MST-1-080',true],['MST-1-060',true],['SAO-1-056',true],['SLG-1-059',true],['SAO-2-056',true],['MST-1-049',true]]);
 assert.equal(report.stats.readyUnported,0);
});
test('R37 no keyword is mistaken for complete official legality; retirement prerequisites remain missing',()=>{
 const rows=r37TopNCandidateReport().candidates;
 assert.equal(rows.some(c=>c.id==='SAO-1-056'),false);
 assert.ok(r37TopNCandidateReport().sourceVerifiedNowRegistered.some(c=>c.id==='SAO-1-056'&&c.registered));
 assert.equal(rows.some(c=>c.id==='SLG-1-059'),false);
 assert.ok(r37TopNCandidateReport().sourceVerifiedNowRegistered.some(c=>c.id==='SLG-1-059'&&c.registered));
 assert.ok(rows.every(x=>x.status!=='READY'||x.reviewEvidence!==null));
});
test('R37 actual Japanese text distinguishes double hand search, single and outside effects',()=>{
 assert.equal(classifyTopNPrint('自分の山札の上から5枚見る。［特徴：ALO］を2枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。').category,'TWO_HAND_REVEAL');
 assert.equal(classifyTopNPrint('山札の上から4枚見て1枚まで公開し手札に加える。').category,'ONE_HAND_REVEAL');
 assert.equal(classifyTopNPrint('山札の上から2枚見て、1枚まで場外に置く。').category,'TOP_TO_OUTSIDE');
 assert.equal(classifyTopNPrint('次に手札から使用するAPを-1する。'),null);
});
