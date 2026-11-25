// v5-D learns a pairwise choice inside the hard cap. v2's 115 weights stay frozen.
// The mine cap, the split, the confirmation length and the match gate are fixed
// here. Later results do not add games.
import {HARD_NODES,HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshPlan} from '../../v4b/lib/protocol.mjs';
import {BUCKETS,HARD_CAP,OPPONENTS,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {CONFIRM_PAIRS,SCREEN_FLOOR} from '../../v4b4/lib/confirm.mjs';
import {SCREEN_PAIRS} from '../../v4b4/lib/sampling.mjs';
import {MINE_SEEDS as V4B7_MINE} from '../../v4b7/lib/protocol.mjs';
import {MATCH_SEEDS as V5B_MATCH,MINE_SEEDS as V5B_MINE} from '../../v5b/lib/protocol.mjs';
import {AUDIT_SEEDS,FAIR_SEEDS,FROZEN_WEIGHT} from '../../v5b1/lib/protocol.mjs';
import {MATCH_SEEDS as V5C_MATCH,MINE_SEEDS as V5C_MINE} from '../../v5c/lib/protocol.mjs';
import {EE6C_ID,HARM_ID,PREFERENCE_IDS,PRESERVE_IDS,RAID_ID} from '../../v5b/lib/protocol.mjs';

export const CODE_VERSION='v5d-1';
export const FAMILY_CAP=8;
export const FAMILY_MIN=4;
export const MINE_BATCH=10;
export const MINE_BATCHES=4;
export const SCREEN_SALT=1010000;
export const CONFIRM_SALT=1020000;
export const BRANCH_BUDGET=FAMILY_CAP*SCREEN_PAIRS*2+FAMILY_CAP*CONFIRM_PAIRS*2;
export const MATCH_GAMES=192;

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(180200,MINE_BATCH*MINE_BATCHES),
 'reject-blue':range(180300,MINE_BATCH*MINE_BATCHES),
 renruki:range(180400,MINE_BATCH*MINE_BATCHES)
});
export const MATCH_SEEDS=range(180600,16);

export const SAMPLE_RULE=Object.freeze({
 id:'v5d-sample-1',
 text:'挖掘最多每個對手 40 場，每 10 場看一次。新的「起動 BLC-4-060 對結束行動」局面達到 8 個就停，不滿 4 個就不做分支抽樣。這個停止只看動作種類和卡號，不看勝率。篩選 8 組、門檻 -0.25，確認 66 組。單尾精確符號檢定問 B 是否更好，Holm 作用在整批確認局面。局面編號排序後，偶數索引訓練、奇數索引驗證。兩個方向都要能被記錄。沒有驗證局面獨立確認同一方向，或驗證確認了相反方向，就不安裝。不因結果追加場次。'
});
export const MATCH_RULE=Object.freeze({
 id:'v5d-match-1',
 text:'只有規則通過訓練、獨立驗證和保護局面檢查，才打 192 場。對照是正式 v2，不是 070 殘差。種子不拿來訓練或選規則。這不是冠軍挑戰，也不啟動 5,000 場。'
});

if(HARD_OPTIONS.nodes!==48||HARD_NODES!==48)throw Error('Hard Search 節點數必須是 48');
if(HARD_CAP!==7||SCALE!==6||STEP_CAP!==1.5||WEIGHT_CLIP!==6)throw Error('v5-D 改到了正式評分限制');
if(SCREEN_PAIRS!==8||CONFIRM_PAIRS!==66||SCREEN_FLOOR!==-0.25)throw Error('v5-D 改到了兩階段確認');
if(BRANCH_BUDGET!==1184)throw Error('分支預算不是 1184');
if(FROZEN_WEIGHT!==3.25954286097052)throw Error('070 對照權重被改過');
if(MINE_SEEDS['white-sword'].length!==40)throw Error('挖掘場數和事先登記不一致');

export function earlierSeeds(){
 return [
  ...FAIR_SEEDS,...Object.values(AUDIT_SEEDS),...V5B_MATCH,...Object.values(V5B_MINE).flat(),
  ...Object.values(V4B7_MINE).flat(),...V5C_MATCH,...Object.values(V5C_MINE).flat()
 ];
}
const earlier=new Set(earlierSeeds());
for(const seed of [...Object.values(MINE_SEEDS).flat(),...MATCH_SEEDS]){
 if(earlier.has(seed))throw Error('種子 '+seed+' 已經用過');
}
assertFreshPlan(Object.values(MINE_SEEDS).flat(),'v5d-mine');
assertFreshPlan(MATCH_SEEDS,'v5d-match');

export function batchPlan(batch){
 if(!Number.isInteger(batch)||batch<0||batch>=MINE_BATCHES)throw Error('挖掘批次超出事先登記');
 const plan={};
 for(const opponent of OPPONENTS)plan[opponent]=MINE_SEEDS[opponent].slice(batch*MINE_BATCH,(batch+1)*MINE_BATCH);
 return plan;
}
export function branchGames(screenCount,confirmCount){
 return screenCount*SCREEN_PAIRS*2+confirmCount*CONFIRM_PAIRS*2;
}
export function assertBudget(screenCount,confirmCount){
 if(screenCount<0||screenCount>FAMILY_CAP||confirmCount<0||confirmCount>FAMILY_CAP)throw Error('篩選或確認名額超出事先登記');
 const games=branchGames(screenCount,confirmCount);
 if(games>BRANCH_BUDGET)throw Error('分支場數 '+games+' 超過事先登記');
 return games;
}
export {
 BUCKETS,CONFIRM_PAIRS,EE6C_ID,FROZEN_WEIGHT,HARM_ID,HARD_CAP,OPPONENTS,PREFERENCE_IDS,PRESERVE_IDS,
 RAID_ID,SCALE,SCREEN_FLOOR,SCREEN_PAIRS,WEIGHT_CLIP
};
