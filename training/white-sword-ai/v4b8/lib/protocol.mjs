// Two confirmed preferences, one shared step. New columns start at zero.
// A feasible step is an experiment, not a strength result and not v2.
import {HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshPlan,assertFreshSeed} from '../../v4b/lib/protocol.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {CONFIRM_PAIRS,SCREEN_FLOOR} from '../../v4b4/lib/confirm.mjs';
import {SCREEN_PAIRS} from '../../v4b4/lib/sampling.mjs';

export const CODE_VERSION='v4b8-1';
export const BRANCH_BUDGET=1200;
export const SCREEN_CAP=42;
export const LEARNABLE_SLOTS=3;
export const RESERVED_SLOTS=1;
export const CONFIRM_CAP=LEARNABLE_SLOTS+RESERVED_SLOTS;
export const MINE_PER_OPPONENT=10;
export const PER_CELL=2;
export const LINE_PER_DIRECTION=3;
export const SCREEN_SALT=810000;
export const CONFIRM_SALT=920000;
export const OPPOSITE_SALT=930000;
export const JOINT_IDS=Object.freeze(['d12a2d6f5ced1d88','b122fb89d72eec7e']);
export const POSITION_INTERACTIONS=Object.freeze([
 'hand_short','pay_relief','board_pressure','open_energy','open_front'
]);
export const CARD_LINE_INTERACTIONS=Object.freeze(['realize_gen','realize_bp']);
export const OPPOSITE_PENDING=Object.freeze([
 {id:'a8ea32166942bc90',screenMean:-0.25,label:'起動 BLC-4-060 → 結束行動'},
 {id:'5f868c674f2e1fee',screenMean:0.25,label:'結束行動 → 起動 BLC-4-060'}
]);
// Registered before the joint search runs. The old single-feature quartile
// filter is not the acceptance rule for this round.
export const JOINT_RULE=Object.freeze({
 id:'v4b8-joint-1',
 text:'兩筆已確認偏好必須在同一次單步、雜湊凍結、權重範圍不變的更新裡同時改成能量線。先只用既有 115 維。若這個方盒無解，才附加五個局面交互欄，初始權重 0。每個保護局面的每個動作都要有實測值，缺值就中止，不補 0。局面交互仍然無解時，才把兩張卡牌路線欄放進同一套保護條件。可行結果只寫實驗候選，不採用、不寫入 v2。不再使用單特徵兩倍四分位數作為通過條件。'
});
export function assertJointRule(){
 if(JOINT_RULE.id!=='v4b8-joint-1')throw Error('共同條件沒有事先登記');
 if(!JOINT_RULE.text.includes('不補 0')||!JOINT_RULE.text.includes('不採用'))throw Error('共同條件不完整');
 if(JOINT_RULE.text.includes('兩倍四分位數作為通過條件')&&JOINT_RULE.text.includes('不再使用'))return JOINT_RULE;
 throw Error('共同條件沒有聲明舊篩選已停用');
}

if(HARD_OPTIONS.nodes!==48)throw Error('Hard Search 2 的節點數不是 48');
if(HARD_CAP!==7||STEP_CAP!==1.5||WEIGHT_CLIP!==6||SCALE!==6)throw Error('v4-B.8 改到了正式評分限制');
if(SCREEN_PAIRS!==8||CONFIRM_PAIRS!==66||SCREEN_FLOOR!==-0.25)throw Error('v4-B.8 改到了兩階段確認');
if(LINE_PER_DIRECTION*2+21>SCREEN_CAP)throw Error('路線配額把篩選名額擠掉了');

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(175500,MINE_PER_OPPONENT),
 'reject-blue':range(175520,MINE_PER_OPPONENT),
 renruki:range(175540,MINE_PER_OPPONENT)
});
const ALREADY_MINED=Object.freeze([
 [173100,173109],[173120,173129],[173140,173149],
 [174200,174207],[174220,174227],[174240,174247],
 [175300,175309],[175320,175329],[175340,175349]
]);
export function assertMineSeed(seed,label){
 assertFreshSeed(seed,label);
 for(const [lo,hi] of ALREADY_MINED){
  if(seed>=lo&&seed<=hi){
   const error=Error(label+' seed '+seed+' 屬於已經挖掘過的範圍');
   error.code='V4B8_SEED';
   throw error;
  }
 }
}
export function assertMineSeeds(){
 const seen=new Set();
 for(const seed of Object.values(MINE_SEEDS).flat()){
  assertMineSeed(seed,'v4b8-mine');
  if(seen.has(seed))throw Error('挖掘種子重複');
  seen.add(seed);
 }
}
export function branchGames(screenCount,confirmCount){
 return screenCount*SCREEN_PAIRS*2+confirmCount*CONFIRM_PAIRS*2;
}
export function assertBudget(screenCount,confirmCount){
 const games=branchGames(screenCount,confirmCount);
 if(games>BRANCH_BUDGET)throw Error('分支場數 '+games+' 超過 1200');
 return games;
}
export function oppositeBudget(screenCount,confirmCount){
 const reserved=branchGames(screenCount,confirmCount);
 const leftover=BRANCH_BUDGET-reserved;
 const games=2*CONFIRM_PAIRS*2;
 return {reserved,leftover,games,confirm:leftover>=games};
}
export const OPPOSITE_RULE=Object.freeze({
 id:'v4b8-opposite-1',
 text:'BLC-4-060 的兩個方向只在新局面的篩選和確認名額結算後，剩餘分支場數仍夠兩筆各 66 組時才做獨立確認。方向沿用既有篩選的符號，單尾精確符號檢定，兩筆一起 Holm。兩筆都顯著才稱為已確認的相反偏好。否則仍只是篩選資料，不建立權重。'
});
export function assertBranchSeeds(screen,confirm){
 assertFreshPlan(screen,'v4b8-screen');
 assertFreshPlan(confirm,'v4b8-confirm');
 const screenSet=new Set(screen);
 if(screenSet.size!==screen.length)throw Error('篩選種子重複');
 const confirmSet=new Set(confirm);
 if(confirmSet.size!==confirm.length)throw Error('確認種子重複');
 for(const seed of confirm)if(screenSet.has(seed))throw Error('確認種子撞上篩選');
 const mined=new Set(Object.values(MINE_SEEDS).flat());
 for(const seed of [...screen,...confirm])if(mined.has(seed))throw Error('分支種子撞上挖掘種子');
}
