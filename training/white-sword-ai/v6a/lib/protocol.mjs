// v6-A fits one shared action-value residual. Individual positions are not hard labels.
// The feature list, the penalty grid and the pass rule are fixed before new games.
import {createHash} from 'node:crypto';
import {HARD_NODES,HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {assertFreshPlan} from '../../v4b/lib/protocol.mjs';
import {HARD_CAP,OPPONENTS,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {MINE_SEEDS as V4B7_MINE} from '../../v4b7/lib/protocol.mjs';
import {MATCH_SEEDS as V5B_MATCH,MINE_SEEDS as V5B_MINE} from '../../v5b/lib/protocol.mjs';
import {AUDIT_SEEDS,FAIR_SEEDS,FROZEN_WEIGHT} from '../../v5b1/lib/protocol.mjs';
import {MATCH_SEEDS as V5C_MATCH,MINE_SEEDS as V5C_MINE} from '../../v5c/lib/protocol.mjs';
import {MATCH_SEEDS as V5D_MATCH,MINE_SEEDS as V5D_MINE} from '../../v5d/lib/protocol.mjs';
import {MATCH_SEEDS as V5D1_MATCH,MINE_SEEDS as V5D1_MINE} from '../../v5d1/lib/protocol.mjs';
import {CONSTRAINTS} from '../../v5a/lib/protocol.mjs';
import {EE6C_ID,HARM_ID,PREFERENCE_IDS,PRESERVE_IDS,RAID_ID} from '../../v5b/lib/protocol.mjs';

export const CODE_VERSION='v6a-1';
export const DEV_FRACTION=5;
export const FOLDS=5;
export const LAMBDAS=Object.freeze([0.1,1,10,100,1000,10000]);
export const DEV_GAIN=0.02;
export const PERMUTATIONS=2000;
export const RESIDUAL_CLIP=SCALE*WEIGHT_CLIP/2;
export const TARGET_POSITIONS=18;
export const PAIRS=32;
export const DEPTHS=Object.freeze([8,16,32]);
export const MINE_PER_OPPONENT=8;
export const CONFIRM_SALT=1060000;
export const BRANCH_BUDGET=TARGET_POSITIONS*PAIRS*2;
export const MATCH_GAMES=192;

const EXCLUDED=new Set(['h0','h1','h2','h3','h4','h5','h6','h7']);
function genericName(name){
 if(EXCLUDED.has(name))return false;
 if(name.startsWith('card_BLC'))return false;
 if(/^(k067_|h085_|u070_|aizen_|k070_|nos_|bankai_)/.test(name))return false;
 return true;
}
export const GENERIC_FEATURES=Object.freeze(POLICY_NAMES.filter(genericName));
export const INTERACTIONS=Object.freeze([
 ['type_play','my_energy'],
 ['type_play','line_energy'],
 ['type_play','line_front'],
 ['type_attack','attack_edge'],
 ['type_activate','my_ap'],
 ['type_next','my_hand'],
 ['affordable','card_bp'],
 ['line_energy','my_energy']
]);

export const SAMPLE_RULE=Object.freeze({
 id:'v6a-sample-1',
 text:'歷史配對用平均差當目標、配對數量當權重，不把未顯著的局面改成確定標籤。原始對局用固定雜湊分成訓練和開發，五分之一是開發。懲罰和線性或交互模型只在訓練與開發上決定，決定後凍結。新資料用全新種子，24 場挖掘，最多 18 個不同對局、每局 32 組，共 1152 場。8、16、32 組用同一批嘗試的前綴比較，不另加場。開發沒有比零殘差更好，就不產生候選，也不打 192 場。'
});

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(183200,MINE_PER_OPPONENT),
 'reject-blue':range(183300,MINE_PER_OPPONENT),
 renruki:range(183400,MINE_PER_OPPONENT)
});
export const MATCH_SEEDS=range(183600,16);

if(HARD_OPTIONS.nodes!==48||HARD_NODES!==48)throw Error('Hard Search 節點數必須是 48');
if(HARD_CAP!==7||SCALE!==6||STEP_CAP!==1.5||WEIGHT_CLIP!==6)throw Error('v6-A 改到了正式評分限制');
if(BRANCH_BUDGET!==1152||BRANCH_BUDGET>1200)throw Error('新分支預算不是 1152');
if(RESIDUAL_CLIP!==18)throw Error('殘差夾限不是 18');
if(FROZEN_WEIGHT!==3.25954286097052)throw Error('070 對照權重被改過');
 if(GENERIC_FEATURES.some(name=>name.startsWith('card_BLC')||EXCLUDED.has(name)))throw Error('通用特徵含有卡號或雜湊');
for(const [left,right] of INTERACTIONS){
 if(!GENERIC_FEATURES.includes(left)||!GENERIC_FEATURES.includes(right))throw Error('交互特徵不在通用清單裡');
}

export function earlierSeeds(){
 return [
  ...FAIR_SEEDS,...Object.values(AUDIT_SEEDS),...V5B_MATCH,...Object.values(V5B_MINE).flat(),
  ...Object.values(V4B7_MINE).flat(),...V5C_MATCH,...Object.values(V5C_MINE).flat(),
  ...V5D_MATCH,...Object.values(V5D_MINE).flat(),...V5D1_MATCH,...Object.values(V5D1_MINE).flat()
 ];
}
const earlier=new Set(earlierSeeds());
for(const seed of [...Object.values(MINE_SEEDS).flat(),...MATCH_SEEDS]){
 if(earlier.has(seed))throw Error('種子 '+seed+' 已經用過');
}
assertFreshPlan(Object.values(MINE_SEEDS).flat(),'v6a-mine');
assertFreshPlan(MATCH_SEEDS,'v6a-match');

function bucketOf(key,salt,count){
 const hex=createHash('sha256').update(salt+key).digest('hex');
 return parseInt(hex.slice(0,8),16)%count;
}
export function gameRole(game){
 return bucketOf(game,'v6a-split-1:',DEV_FRACTION)===0?'dev':'train';
}
export function gameFold(game){
 return bucketOf(game,'v6a-fold-1:',FOLDS);
}
export {
 CONSTRAINTS,EE6C_ID,FROZEN_WEIGHT,HARM_ID,HARD_CAP,OPPONENTS,PREFERENCE_IDS,PRESERVE_IDS,RAID_ID,SCALE
};
