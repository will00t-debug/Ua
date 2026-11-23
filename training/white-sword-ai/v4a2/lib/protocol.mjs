// White Sword v4-A.2 exploration protocol.
// These gates were fixed before Stage A measured anything. Do not retune them
// from this round's seeds, and do not treat a higher disagreement rate as strength.
import {BLEND_HARD_CAP,BLEND_SCALE,HARD_NODES} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';

export const CODE_VERSION='v4a2-1';
export const CANDIDATE_COUNT=8;
export const STEP_CAP=1.5;
export const WEIGHT_CLIP=6;
export const SCALE=BLEND_SCALE;
export const HARD_CAP=BLEND_HARD_CAP;
export const OFFICIAL_NODES=HARD_NODES;
// Offline teacher only. The official Hard Search 2 call does not receive this.
export const TEACHER_NODES=192;
export const EXPLORE=0;

export const BUCKETS=Object.freeze([
 'early-energy','ap','line-move','mid-entry','raid','attack-defense','late-pressure'
]);
export const ENERGY_FEATURES=Object.freeze([
 'line_energy','my_energy','my_ap','opp_ap','card_energy','card_ap','affordable','spends_ap',
 'aizen_energy_play','aizen_energy_after','u070_ap_enable','bankai_ap','k067_base_energy'
]);
export const MOVE_FEATURES=Object.freeze([
 'type_move','type_raid','type_attack','line_front','attack_open','attack_edge',
 'pass_despite_attack','k067_raid','h085_raid','u070_raid','type_block','block_win','block_lose'
]);

// Stage A must clear every line below. Holdout positions are scored after
// generation and are not an input to the weight step.
export const STAGE_A_GATE=Object.freeze({
 minBandPositions:80,
 minHoldoutBand:20,
 minBuckets:5,
 minPerBucket:4,
 minBandRate:0.08,
 minLift:1.5,
 minHoldoutRate:0.08,
 minBucketsWithDisagreement:4,
 minPairwise:0.02,
 legalRate:1
});
// A sensitive set that wins the exploration comparison but loses more than
// this many win-rate points to the gaussian control stops. Do not add games.
export const STAGE_B_GATE=Object.freeze({maxWinDrop:0.08});

export const SCREEN=Object.freeze({
 seeds:Object.freeze([161000,161001]),
 cells:4,
 opponents:Object.freeze(['hard-white','hard-renruki'])
});
export const VALIDATION=Object.freeze({
 pairedSeeds:Object.freeze(range(162000,30)),
 mirrorSeeds:Object.freeze(range(162200,30)),
 decks:Object.freeze(['white-sword','reject-blue','renruki']),
 cells:4
});

function range(start,count){
 return Array.from({length:count},(_,index)=>start+index);
}
export const TRAIN_SEEDS=Object.freeze(range(160000,20));
export const HOLDOUT_SEEDS=Object.freeze(range(160800,10));
export const MINE=Object.freeze({
 maxSteps:180,
 perBucket:18,
 maxBand:126,
 maxHoldoutBand:48,
 teacherPositions:18,
 holdoutTeacherPositions:8,
 minSeedsBeforeStop:8
});

const BLOCKED=Object.freeze([
 [94000,94016],[130000,130016],[100000,104999]
]);
export function assertFreshSeed(seed,label){
 if(!Number.isInteger(seed))throw Error(label+' seed is not an integer');
 for(const [lo,hi] of BLOCKED){
  if(seed>=lo&&seed<=hi){
   const error=Error(label+' seed '+seed+' 屬於已用過的 R1–R5 或保留 holdout');
   error.code='V4A2_SEED';
   throw error;
  }
 }
}
export function assertFreshPlan(seeds,label){
 const seen=new Set();
 for(const seed of seeds){
  assertFreshSeed(seed,label);
  if(seen.has(seed))throw Error(label+' seed '+seed+' 重複');
  seen.add(seed);
 }
}
