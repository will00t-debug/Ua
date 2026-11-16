// Batch V2 staging for Japanese-confirmed RNK effects; all common V2 DSL.
// Unchecked records are excluded. This is not an official/production battle pack.
import {RNK_TC_CATALOG} from '../rnk/manifest.mjs';
import {RNK_PROMO_CARD} from '../rnk/promo-card.mjs';
import {RNK_JP_EVIDENCE_029_035} from '../rnk/jp-evidence-029-035.mjs';
import {RNK_JP_EVIDENCE_036_042} from '../rnk/jp-evidence-036-042.mjs';
import {RNK_JP_EVIDENCE_COMMON_BCD} from '../rnk/jp-evidence-common-bcd.mjs';
import {RNK_JP_EVIDENCE_FAST_BCD} from '../rnk/jp-evidence-fast-bcd.mjs';
import {RNK_JP_EVIDENCE_PASSIVE_BCD} from '../rnk/jp-evidence-passive-bcd.mjs';
import {RNK_JP_EVIDENCE_SIMPLE_NEXT} from '../rnk/jp-evidence-simple-next.mjs';
import {RNK_JP_EVIDENCE_BCD_NEXT4} from '../rnk/jp-evidence-bcd-next4.mjs';
import {RNK_JP_EVIDENCE_BLUE_EVENTS} from '../rnk/jp-evidence-blue-events.mjs';
import {RNK_JP_EVIDENCE_048} from '../rnk/jp-evidence-048.mjs';
import {RNK_JP_EVIDENCE_BLUE_COMMON} from '../rnk/jp-evidence-blue-common.mjs';
import {RNK_JP_EVIDENCE_ST_109} from '../rnk/jp-evidence-st-109.mjs';
import {RNK_JP_EVIDENCE_SHARED_NEXT} from '../rnk/jp-evidence-shared-next.mjs';
import {RNK_JP_EVIDENCE_SHARED_TWENTY} from '../rnk/jp-evidence-shared-twenty.mjs';
import {RNK_JP_EVIDENCE_SHARED_THIRD} from '../rnk/jp-evidence-shared-third.mjs';
import {RNK_JP_EVIDENCE_SHARED_REST} from '../rnk/jp-evidence-shared-rest.mjs';
import {RNK_PROGRAMS_029_035} from './rnk/programs-029-035.mjs';
import {RNK_PROGRAMS_036_042} from './rnk/programs-036-042.mjs';
import {RNK_PROGRAMS_COMMON_BCD} from './rnk/programs-common-bcd.mjs';
import {RNK_PROGRAMS_FAST_BCD} from './rnk/programs-fast-bcd.mjs';
import {RNK_PROGRAMS_PASSIVE_BCD} from './rnk/programs-passive-bcd.mjs';
import {RNK_PROGRAMS_SIMPLE_NEXT} from './rnk/programs-simple-next.mjs';
import {RNK_PROGRAMS_BCD_NEXT4} from './rnk/programs-bcd-next4.mjs';
import {RNK_PROGRAMS_BLUE_EVENTS} from './rnk/programs-blue-events.mjs';
import {RNK_PROGRAMS_048} from './rnk/programs-048.mjs';
import {RNK_PROGRAMS_BLUE_COMMON} from './rnk/programs-blue-common.mjs';
import {RNK_PROGRAMS_ST_109} from './rnk/programs-st-109.mjs';
import {RNK_PROGRAMS_SHARED_NEXT} from './rnk/programs-shared-next.mjs';
import {RNK_PROGRAMS_SHARED_TWENTY} from './rnk/programs-shared-twenty.mjs';
import {RNK_PROGRAMS_SHARED_THIRD} from './rnk/programs-shared-third.mjs';
import {RNK_PROGRAMS_SHARED_REST} from './rnk/programs-shared-rest.mjs';
import {createRnkSharedStagingPack} from './rnk-shared-adapter.mjs';

const evidence=Object.freeze({
 ...RNK_JP_EVIDENCE_029_035,
 ...RNK_JP_EVIDENCE_036_042,
 ...RNK_JP_EVIDENCE_COMMON_BCD,
 ...RNK_JP_EVIDENCE_FAST_BCD,
 ...RNK_JP_EVIDENCE_PASSIVE_BCD,
 ...RNK_JP_EVIDENCE_SIMPLE_NEXT,
 ...RNK_JP_EVIDENCE_BCD_NEXT4,
 ...RNK_JP_EVIDENCE_BLUE_EVENTS,
 ...RNK_JP_EVIDENCE_048,
 ...RNK_JP_EVIDENCE_BLUE_COMMON,
 ...RNK_JP_EVIDENCE_ST_109,
 ...RNK_JP_EVIDENCE_SHARED_NEXT,
 ...RNK_JP_EVIDENCE_SHARED_TWENTY,
 ...RNK_JP_EVIDENCE_SHARED_THIRD,
 ...RNK_JP_EVIDENCE_SHARED_REST
});
const programs=Object.freeze({
 ...RNK_PROGRAMS_029_035,
 ...RNK_PROGRAMS_036_042,
 ...RNK_PROGRAMS_COMMON_BCD,
 ...RNK_PROGRAMS_FAST_BCD,
 ...RNK_PROGRAMS_PASSIVE_BCD,
 ...RNK_PROGRAMS_SIMPLE_NEXT,
 ...RNK_PROGRAMS_BCD_NEXT4,
 ...RNK_PROGRAMS_BLUE_EVENTS,
 ...RNK_PROGRAMS_048,
 ...RNK_PROGRAMS_BLUE_COMMON,
 ...RNK_PROGRAMS_ST_109,
 ...RNK_PROGRAMS_SHARED_NEXT,
 ...RNK_PROGRAMS_SHARED_TWENTY,
 ...RNK_PROGRAMS_SHARED_THIRD,
 ...RNK_PROGRAMS_SHARED_REST
});
export const RNK_BATCH_STAGING_IDS=Object.freeze(Object.entries(programs)
 .filter(([,p])=>p?.ready===true).map(([id])=>id).sort());

export function createRnkBcdBatchStagingPack(){
 const pack=createRnkSharedStagingPack({
   cards:[...RNK_TC_CATALOG,RNK_PROMO_CARD],programs,evidence,
   version:'rnk-bcd-jp-batch-staging-'+RNK_BATCH_STAGING_IDS.length
 });
 const ids=Object.keys(pack.cards).sort();
 if(JSON.stringify(ids)!==JSON.stringify(RNK_BATCH_STAGING_IDS))
   throw Error('RNK batch included a non-confirmed card or lost a shared program');
 return pack;
}
