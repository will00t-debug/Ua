// White Sword v4-B.2. Fresh seeds, balanced across three opponents.
// One named-feature step, then a trust check. No champion challenge.
// Hard Search 2, the hard cap, the weight clip and the step cap stay as they are.
import {BLEND_HARD_CAP,BLEND_SCALE,HARD_NODES,HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshSeed} from '../../v4b/lib/protocol.mjs';

export const CODE_VERSION='v4b2-1';
export const BUDGET_CAP=5000;
export const STEP_CAP=1.5;
export const WEIGHT_CLIP=6;
export const SCALE=BLEND_SCALE;
export const HARD_CAP=BLEND_HARD_CAP;
export const OFFICIAL_NODES=HARD_NODES;
export const SEEDS_PER_OPPONENT=10;
export const PER_CELL_MINE=4;
export const PER_CELL_SELECT=2;
export const MAX_STEPS=200;

export const BUCKETS=Object.freeze([
 'early-energy','ap','line-move','mid-entry','raid','attack-defense','late-pressure'
]);
export const OPPONENTS=Object.freeze(['white-sword','reject-blue','renruki']);
export const DECK_LABEL=Object.freeze({
 'white-sword':'白劍','reject-blue':'我拒絕',renruki:'戀露'
});
export const BUCKET_LABEL=Object.freeze({
 'early-energy':'前期能量',ap:'AP','line-move':'移動','mid-entry':'中盤進場',
 raid:'Raid','attack-defense':'攻防','late-pressure':'殘局'
});

if(HARD_OPTIONS.nodes!==48)throw Error('Hard Search 2 的節點數不是 48');
if(HARD_CAP!==7||STEP_CAP!==1.5||WEIGHT_CLIP!==6||SCALE!==6)throw Error('v4-B.2 改到了正式評分限制');

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(173100,SEEDS_PER_OPPONENT),
 'reject-blue':range(173120,SEEDS_PER_OPPONENT),
 renruki:range(173140,SEEDS_PER_OPPONENT)
});

const RESERVED=Object.freeze([
 [170000,170009],[170100,170127],[171000,171003],[172000,172229]
]);
export function assertRoundSeed(seed,label){
 assertFreshSeed(seed,label);
 for(const [lo,hi] of RESERVED){
  if(seed>=lo&&seed<=hi){
   const error=Error(label+' seed '+seed+' 屬於 v4-B 已使用或保留的範圍');
   error.code='V4B2_SEED';
   throw error;
  }
 }
}
export function assertRoundPlan(seeds,label){
 const seen=new Set();
 for(const seed of seeds){
  assertRoundSeed(seed,label);
  if(seen.has(seed))throw Error(label+' seed '+seed+' 重複');
  seen.add(seed);
 }
}
