// v4-B.6 separates position context from the action that would use it.
// No new games, no adopted weights, and the production limits stay put.
import {HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';

export const CODE_VERSION='v4b6-1';
export const TARGET_ID='d12a2d6f5ced1d88';
export const RAID_ID='1fbdc61d55fa7f09';

if(HARD_OPTIONS.nodes!==48)throw Error('Hard Search 2 的節點數不是 48');
if(HARD_CAP!==7||STEP_CAP!==1.5||WEIGHT_CLIP!==6||SCALE!==6)throw Error('v4-B.6 改到了正式評分限制');

// Pre-registered before looking at the replay. Card-line features only show
// what the acted card itself contributes. Position-action features are the
// ones allowed to justify a representation change.
export const INTERACTION_NAMES=Object.freeze([
 'hand_short','pay_relief','board_pressure','open_energy','open_front','realize_gen','realize_bp'
]);
export const INTERACTION_KIND=Object.freeze({
 hand_short:'position-action',
 pay_relief:'position-action',
 board_pressure:'position-action',
 open_energy:'position-action',
 open_front:'position-action',
 realize_gen:'card-line',
 realize_bp:'card-line'
});

export const POSITION_NAMES=Object.freeze([
 'my_energy','opp_energy','my_ap','opp_ap','my_hand','opp_hand','my_front','opp_front',
 'opp_bp_max','my_life','opp_life','life_diff','turn','phase_main','pending'
]);
export const CARD_NAMES=Object.freeze([
 'card_energy','card_bp','card_gen','card_ap','affordable','spends_ap'
]);
