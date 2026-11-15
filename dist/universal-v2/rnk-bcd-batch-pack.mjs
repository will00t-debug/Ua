// Batch V2 staging for Japanese-confirmed RNK effects; all common V2 DSL.
// Unchecked records are excluded. This is not an official/production battle pack.
import {RNK_TC_CATALOG} from '../rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_029_035} from '../rnk/jp-evidence-029-035.mjs';
import {RNK_JP_EVIDENCE_036_042} from '../rnk/jp-evidence-036-042.mjs';
import {RNK_JP_EVIDENCE_COMMON_BCD} from '../rnk/jp-evidence-common-bcd.mjs';
import {RNK_JP_EVIDENCE_FAST_BCD} from '../rnk/jp-evidence-fast-bcd.mjs';
import {RNK_JP_EVIDENCE_PASSIVE_BCD} from '../rnk/jp-evidence-passive-bcd.mjs';
import {RNK_JP_EVIDENCE_SIMPLE_NEXT} from '../rnk/jp-evidence-simple-next.mjs';
import {RNK_PROGRAMS_029_035} from './rnk/programs-029-035.mjs';
import {RNK_PROGRAMS_036_042} from './rnk/programs-036-042.mjs';
import {RNK_PROGRAMS_COMMON_BCD} from './rnk/programs-common-bcd.mjs';
import {RNK_PROGRAMS_FAST_BCD} from './rnk/programs-fast-bcd.mjs';
import {RNK_PROGRAMS_PASSIVE_BCD} from './rnk/programs-passive-bcd.mjs';
import {RNK_PROGRAMS_SIMPLE_NEXT} from './rnk/programs-simple-next.mjs';
import {createRnkSharedStagingPack} from './rnk-shared-adapter.mjs';

const evidence=Object.freeze({
 ...RNK_JP_EVIDENCE_029_035,
 ...RNK_JP_EVIDENCE_036_042,
 ...RNK_JP_EVIDENCE_COMMON_BCD,
 ...RNK_JP_EVIDENCE_FAST_BCD,
 ...RNK_JP_EVIDENCE_PASSIVE_BCD,
 ...RNK_JP_EVIDENCE_SIMPLE_NEXT
});
const programs=Object.freeze({
 ...RNK_PROGRAMS_029_035,
 ...RNK_PROGRAMS_036_042,
 ...RNK_PROGRAMS_COMMON_BCD,
 ...RNK_PROGRAMS_FAST_BCD,
 ...RNK_PROGRAMS_PASSIVE_BCD,
 ...RNK_PROGRAMS_SIMPLE_NEXT
});
export const RNK_BATCH_STAGING_IDS=Object.freeze(Object.entries(programs)
 .filter(([,p])=>p?.ready===true).map(([id])=>id).sort());

export function createRnkBcdBatchStagingPack(){
 const pack=createRnkSharedStagingPack({
   cards:RNK_TC_CATALOG,programs,evidence,
   version:'rnk-bcd-jp-batch-staging-'+RNK_BATCH_STAGING_IDS.length
 });
 const ids=Object.keys(pack.cards).sort();
 if(JSON.stringify(ids)!==JSON.stringify(RNK_BATCH_STAGING_IDS))
   throw Error('RNK batch included a non-confirmed card or lost a shared program');
 return pack;
}
