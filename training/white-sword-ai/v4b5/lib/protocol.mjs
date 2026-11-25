// v4-B.5 turns one confirmed preference into a candidate step.
// Hard Search 2, the hard cap, the clip and the step cap stay put.
import {HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertRoundPlan,HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';

export const CODE_VERSION='v4b5-1';
export const TARGET_ID='d12a2d6f5ced1d88';
export const CHECK_PAIRS=16;
export const CHECK_SALT=510000;
export const CHECK_CAP=6;
export const MINE_PER_OPPONENT=8;

if(HARD_OPTIONS.nodes!==48)throw Error('Hard Search 2 的節點數不是 48');
if(HARD_CAP!==7||STEP_CAP!==1.5||WEIGHT_CLIP!==6||SCALE!==6)throw Error('v4-B.5 改到了正式評分限制');

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(174200,MINE_PER_OPPONENT),
 'reject-blue':range(174220,MINE_PER_OPPONENT),
 renruki:range(174240,MINE_PER_OPPONENT)
});
export function mineSeedList(){
 return Object.values(MINE_SEEDS).flat();
}
export function assertMineSeeds(){
 assertRoundPlan(mineSeedList(),'v4b5-mine');
}
