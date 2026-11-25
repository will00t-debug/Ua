#!/usr/bin/env node
// Compare learning architectures from saved games. Does not fit or edit v2.
import {v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {buildAnalysis} from '../training/white-sword-ai/v5a/lib/analyze.mjs';
import {OFFICIAL_V2} from '../training/white-sword-ai/v5a/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5a/lib/report.mjs';

const before=v2Hash();
if(before!==OFFICIAL_V2)throw Error('正式 v2 在分析前就已經不同');
const analysis=buildAnalysis();
const report=renderReport(analysis);
writeJson('training/white-sword-ai/v5a/analysis.json',analysis);
writeText('training/white-sword-ai/v5a/report.md',report);
writeText('docs/white-sword-ai/v5a/report.md',report);
if(v2Hash()!==before)throw Error('分析寫入了正式 v2');
console.log(JSON.stringify({
 positions:analysis.positions,
 flips:analysis.pressure.hashFlips,
 lineShare:analysis.pressure.lineHashShare,
 need:analysis.accumulation.need,
 collateral:analysis.accumulation.flips,
 feature:analysis.feature
}));
