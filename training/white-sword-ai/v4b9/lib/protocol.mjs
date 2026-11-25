// Focused checks for three confirmed energy-line preferences.
// New columns are not added after seeing this round's results.
// A feasible step is an experiment. It is not written onto v2.
import {HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshPlan,assertFreshSeed} from '../../v4b/lib/protocol.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {CONFIRM_PAIRS} from '../../v4b4/lib/confirm.mjs';

export const CODE_VERSION='v4b9-1';
export const BRANCH_BUDGET=1188;
export const CONFIRM_COUNT=3;
export const VALIDATE_CAP=6;
export const MINE_PER_OPPONENT=2;
export const CONFIRM_SALT=940000;
export const VALIDATE_SALT=950000;
export const ENERGY_IDS=Object.freeze([
 'd12a2d6f5ced1d88','b122fb89d72eec7e','01c85e5ddb31e7fa'
]);
export const RAID_ID='1fbdc61d55fa7f09';
export const ANCHOR_ID='525ea92d';
export const CONFIRM_PLAN=Object.freeze([
 {id:'d8a4e2b6f8d32818',screenMean:0.25,direction:'positive',source:'v4b8',text:'070 前線偏好'},
 {id:'a8ea32166942bc90',screenMean:-0.25,direction:'negative',source:'v4b7',text:'060 結束行動偏好'},
 {id:'5f868c674f2e1fee',screenMean:0.25,direction:'positive',source:'v4b7',text:'060 起動偏好'}
]);
export const POSITION_INTERACTIONS=Object.freeze([
 'hand_short','pay_relief','board_pressure','open_energy','open_front'
]);

if(HARD_OPTIONS.nodes!==48)throw Error('Hard Search 2 的節點數不是 48');
if(HARD_CAP!==7||STEP_CAP!==1.5||WEIGHT_CLIP!==6||SCALE!==6)throw Error('v4-B.9 改到了正式評分限制');
if(CONFIRM_PAIRS!==66)throw Error('v4-B.9 改到了 66 組確認');
if(CONFIRM_COUNT*CONFIRM_PAIRS*2+VALIDATE_CAP*CONFIRM_PAIRS*2!==BRANCH_BUDGET){
 throw Error('分支上限不是 1188');
}

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(175700,MINE_PER_OPPONENT),
 'reject-blue':range(175720,MINE_PER_OPPONENT),
 renruki:range(175740,MINE_PER_OPPONENT)
});
const ALREADY_MINED=Object.freeze([
 [173100,173109],[173120,173129],[173140,173149],
 [174200,174207],[174220,174227],[174240,174247],
 [175300,175309],[175320,175329],[175340,175349],
 [175500,175509],[175520,175529],[175540,175549]
]);
export const JOINT_RULE=Object.freeze({
 id:'v4b9-joint-1',
 text:'三筆已確認的 070 能量線偏好必須在同一次單步、雜湊凍結、權重範圍不變的更新裡同時成立。先比較既有 115 維、五個已登記局面交互，以及 v4-B.8 的既有實驗權重。本輪不新增特徵。若 d8a4 的前線方向通過 Holm，該選擇是硬保護。060 的確認只留紀錄，不拿來擬合。067 突襲是否必須放開，用把突襲也設成硬約束的可行解檢查；搜尋器放出的一個解不算全域證明。這個檢查只涵蓋單步方盒。'
});
export const VALIDATE_RULE=Object.freeze({
 id:'v4b9-validate-1',
 text:'只有能保住三筆能量線偏好、錨點，以及已確認前線偏好的實驗步才做集中驗證。優先採用同時保住 067 突襲的解。驗證最多六個局面、各 66 組：突襲連帶、其他卡被改到能量線、新種子上的改選、以及被帶離前線的局面。三筆能量線目標和本輪已做 66 組確認的局面不再重複驗證。方向是 v2 的原選擇對候選選擇，單尾精確符號檢定問原選擇是否更好，Holm 校正。不顯著只表示證據不足，不表示兩個動作等價，也不表示候選安全。'
});
export function assertJointRule(){
 if(JOINT_RULE.id!=='v4b9-joint-1'||VALIDATE_RULE.id!=='v4b9-validate-1')throw Error('本輪條件沒有事先登記');
 if(!JOINT_RULE.text.includes('不新增特徵')||!VALIDATE_RULE.text.includes('不表示兩個動作等價')||!VALIDATE_RULE.text.includes('不再重複驗證'))throw Error('本輪條件不完整');
 return {joint:JOINT_RULE,validate:VALIDATE_RULE};
}
export function assertMineSeed(seed,label){
 assertFreshSeed(seed,label);
 for(const [lo,hi] of ALREADY_MINED){
  if(seed>=lo&&seed<=hi){
   const error=Error(label+' seed '+seed+' 屬於已經挖掘過的範圍');
   error.code='V4B9_SEED';
   throw error;
  }
 }
}
export function assertMineSeeds(){
 const seen=new Set();
 for(const seed of Object.values(MINE_SEEDS).flat()){
  assertMineSeed(seed,'v4b9-mine');
  if(seen.has(seed))throw Error('挖掘種子重複');
  seen.add(seed);
 }
}
export function branchGames(validateCount){
 if(validateCount<0||validateCount>VALIDATE_CAP)throw Error('驗證局面數超過 6');
 return CONFIRM_COUNT*CONFIRM_PAIRS*2+validateCount*CONFIRM_PAIRS*2;
}
export function assertBudget(validateCount){
 const games=branchGames(validateCount);
 if(games>BRANCH_BUDGET)throw Error('分支場數 '+games+' 超過 1188');
 return games;
}
export function assertBranchSeeds(confirm,validate){
 assertFreshPlan(confirm,'v4b9-confirm');
 assertFreshPlan(validate,'v4b9-validate');
 const confirmSet=new Set(confirm);
 if(confirmSet.size!==confirm.length)throw Error('確認種子重複');
 const validateSet=new Set(validate);
 if(validateSet.size!==validate.length)throw Error('驗證種子重複');
 for(const seed of validate)if(confirmSet.has(seed))throw Error('驗證種子撞上確認');
 const mined=new Set(Object.values(MINE_SEEDS).flat());
 for(const seed of [...confirm,...validate])if(mined.has(seed))throw Error('分支種子撞上挖掘種子');
}
