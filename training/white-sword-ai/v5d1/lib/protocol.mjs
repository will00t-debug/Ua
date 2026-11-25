// v5-D.1 keeps the v5-D comparison layer and spends the sample on one action family.
// Eight games, 66 pairs each, no screen floor. The split is frozen before any pair.
import {HARD_NODES,HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshPlan} from '../../v4b/lib/protocol.mjs';
import {HARD_CAP,OPPONENTS,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {CONFIRM_PAIRS} from '../../v4b4/lib/confirm.mjs';
import {MINE_SEEDS as V4B7_MINE} from '../../v4b7/lib/protocol.mjs';
import {MATCH_SEEDS as V5B_MATCH,MINE_SEEDS as V5B_MINE} from '../../v5b/lib/protocol.mjs';
import {AUDIT_SEEDS,FAIR_SEEDS,FROZEN_WEIGHT} from '../../v5b1/lib/protocol.mjs';
import {MATCH_SEEDS as V5C_MATCH,MINE_SEEDS as V5C_MINE} from '../../v5c/lib/protocol.mjs';
import {MATCH_SEEDS as V5D_MATCH,MINE_SEEDS as V5D_MINE} from '../../v5d/lib/protocol.mjs';
import {EE6C_ID,HARM_ID,PREFERENCE_IDS,PRESERVE_IDS,RAID_ID} from '../../v5b/lib/protocol.mjs';

export const CODE_VERSION='v5d1-1';
export const FAMILY_GAMES=8;
export const MINE_BATCH=10;
export const MINE_BATCHES=8;
export const CONFIRM_SALT=1040000;
export const BRANCH_BUDGET=FAMILY_GAMES*CONFIRM_PAIRS*2;
export const MATCH_GAMES=192;

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(182200,MINE_BATCH*MINE_BATCHES),
 'reject-blue':range(182300,MINE_BATCH*MINE_BATCHES),
 renruki:range(182400,MINE_BATCH*MINE_BATCHES)
});
export const MATCH_SEEDS=range(182600,16);

export const SAMPLE_RULE=Object.freeze({
 id:'v5d1-sample-1',
 text:'挖掘每個對手最多 80 場，每 10 場看一次。停止只看「起動 BLC-4-060 對結束行動」出現在幾個不同的原始對局，不看勝率。至少 8 個不同對局，而且至少兩個對手各有 2 場，就停止。同一對局只留步數最早的一個局面。對手輪流取到 8 個。每個對手內部按種子排序，偶數訓練、奇數驗證。不滿 8 個不同對局就不做分支。沒有 8 組篩選，也沒有 -0.25 門檻。每個局面直接 66 組，共 1056 場。每個局面用雙尾精確符號檢定，Holm 分別作用在訓練組和驗證組。平均差的符號記錄方向：負值是 B 較好，正值是 A 較好。訓練組先產生規則並凍結，再看驗證組。每條規則都要有自己的驗證支持。不因結果追加場次。'
});
export const MATCH_RULE=Object.freeze({
 id:'v5d1-match-1',
 text:'只有凍結後的規則通過獨立驗證和保護局面檢查，才打 192 場。診斷種子不參與訓練。對照是正式 v2。這不是冠軍挑戰，也不啟動 5,000 場。'
});

if(HARD_OPTIONS.nodes!==48||HARD_NODES!==48)throw Error('Hard Search 節點數必須是 48');
if(HARD_CAP!==7||SCALE!==6||STEP_CAP!==1.5||WEIGHT_CLIP!==6)throw Error('v5-D.1 改到了正式評分限制');
if(CONFIRM_PAIRS!==66)throw Error('確認組數不是 66');
if(BRANCH_BUDGET!==1056)throw Error('分支預算不是 1056');
if(FROZEN_WEIGHT!==3.25954286097052)throw Error('070 對照權重被改過');
if(MINE_SEEDS['white-sword'].length!==80)throw Error('挖掘上限和事先登記不一致');

export function earlierSeeds(){
 return [
  ...FAIR_SEEDS,...Object.values(AUDIT_SEEDS),...V5B_MATCH,...Object.values(V5B_MINE).flat(),
  ...Object.values(V4B7_MINE).flat(),...V5C_MATCH,...Object.values(V5C_MINE).flat(),
  ...V5D_MATCH,...Object.values(V5D_MINE).flat()
 ];
}
const earlier=new Set(earlierSeeds());
for(const seed of [...Object.values(MINE_SEEDS).flat(),...MATCH_SEEDS]){
 if(earlier.has(seed))throw Error('種子 '+seed+' 已經用過');
}
assertFreshPlan(Object.values(MINE_SEEDS).flat(),'v5d1-mine');
assertFreshPlan(MATCH_SEEDS,'v5d1-match');

export function batchPlan(batch){
 if(!Number.isInteger(batch)||batch<0||batch>=MINE_BATCHES)throw Error('挖掘批次超出事先登記');
 const plan={};
 for(const opponent of OPPONENTS)plan[opponent]=MINE_SEEDS[opponent].slice(batch*MINE_BATCH,(batch+1)*MINE_BATCH);
 return plan;
}
export {
 CONFIRM_PAIRS,EE6C_ID,FROZEN_WEIGHT,HARM_ID,HARD_CAP,OPPONENTS,PREFERENCE_IDS,PRESERVE_IDS,
 RAID_ID,SCALE,WEIGHT_CLIP
};
