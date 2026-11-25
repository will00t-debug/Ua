// v5-C accumulates named residuals. v2 and the frozen 070 weight stay fixed.
// The screen, the confirmation and the branch budget are fixed before new pairs.
import {HARD_NODES,HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshPlan,assertFreshSeed} from '../../v4b/lib/protocol.mjs';
import {SCREEN_FLOOR} from '../../v4b4/lib/confirm.mjs';
import {SCREEN_PAIRS} from '../../v4b4/lib/sampling.mjs';
import {CONFIRM_PAIRS} from '../../v4b4/lib/confirm.mjs';
import {BUCKETS,OPPONENTS,HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {FROZEN_WEIGHT} from '../../v5b1/lib/protocol.mjs';
import {EE6C_ID,HARM_ID,PREFERENCE_IDS,PRESERVE_IDS,RAID_ID} from '../../v5b/lib/protocol.mjs';

export const CODE_VERSION='v5c-1';
export const BRANCH_BUDGET=1200;
export const SCREEN_CAP=42;
export const CONFIRM_CAP=4;
export const PER_CELL=2;
export const MINE_PER_OPPONENT=10;
export const SCREEN_SALT=980000;
export const CONFIRM_SALT=990000;
export const HISTORICAL_060=EE6C_ID;
export const MATCH_GAMES=192;

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(178200,MINE_PER_OPPONENT),
 'reject-blue':range(178220,MINE_PER_OPPONENT),
 renruki:range(178240,MINE_PER_OPPONENT)
});
export const MATCH_SEEDS=range(178400,16);

export const EXPLORE_RULE=Object.freeze({
 id:'v5c-explore-1',
 text:'A 是 v2 的原選擇，B 是對照動作。篩選平均差不大於 -0.25 才進入確認。確認用單尾精確符號檢定問 B 是否更好，Holm 只作用在這一批確認局面，而且平均差必須為負。不顯著不表示兩個動作等價。070 能量線最多佔一個確認名額。歷史上的單筆 ee6c 不直接安裝。挖掘場數不計入 1200 場分支。'
});

if(HARD_OPTIONS.nodes!==48||HARD_NODES!==48)throw Error('Hard Search 節點數必須是 48');
if(HARD_CAP!==7||SCALE!==6||STEP_CAP!==1.5||WEIGHT_CLIP!==6)throw Error('v5-C 改到了正式評分限制');
if(SCREEN_PAIRS!==8||CONFIRM_PAIRS!==66||SCREEN_FLOOR!==-0.25)throw Error('v5-C 改到了兩階段確認');
if(SCREEN_CAP*SCREEN_PAIRS*2+CONFIRM_CAP*CONFIRM_PAIRS*2!==BRANCH_BUDGET)throw Error('分支預算不是 1200');
if(FROZEN_WEIGHT!==3.25954286097052)throw Error('070 對照權重被改過');

export function branchGames(screenCount,confirmCount){
 return screenCount*SCREEN_PAIRS*2+confirmCount*CONFIRM_PAIRS*2;
}
export function assertBudget(screenCount,confirmCount){
 if(screenCount<0||screenCount>SCREEN_CAP||confirmCount<0||confirmCount>CONFIRM_CAP)throw Error('篩選或確認名額超出事先登記');
 const games=branchGames(screenCount,confirmCount);
 if(games>BRANCH_BUDGET)throw Error('分支場數 '+games+' 超過 1200');
 return games;
}
export function signedSteps(weight){
 if(!(Math.abs(weight)<=WEIGHT_CLIP+1e-9))throw Error('殘差權重超出 [-6, 6]');
 const sign=weight<0?-1:1;
 const parts=[];
 let left=Math.abs(weight);
 while(left>1e-8){
  const step=Math.min(STEP_CAP,left);
  parts.push(sign*step);
  left-=step;
 }
 if(parts.some(step=>Math.abs(step)-STEP_CAP>1e-9))throw Error('單步超過 1.5');
 return parts;
}
export function assertFreshList(seeds,label){
 assertFreshPlan(seeds,label);
}
export function assertMineSeed(seed,label){
 assertFreshSeed(seed,label);
}
export {
 BUCKETS,CONFIRM_PAIRS,FROZEN_WEIGHT,HARD_CAP,HARM_ID,MATCH_GAMES as FAIR_GAMES,OPPONENTS,
 PREFERENCE_IDS,PRESERVE_IDS,RAID_ID,SCALE,SCREEN_FLOOR,SCREEN_PAIRS,STEP_CAP,WEIGHT_CLIP
};
