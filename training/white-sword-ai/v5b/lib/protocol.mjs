// v5-B learns one named action column on top of frozen v2.
// The column, the bonus grid, the validation direction and the match gate
// are fixed here before any new pair is drawn.
import {HARD_NODES,HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshPlan,assertFreshSeed} from '../../v4b/lib/protocol.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {CONFIRM_PAIRS} from '../../v4b4/lib/confirm.mjs';
import {signatureOf} from '../../v4b9/lib/hash.mjs';
import {
 CONSTRAINTS,OFFICIAL_V2,uniqueNamedFeatures,assertOfficialLimits
} from '../../v5a/lib/protocol.mjs';

export const CODE_VERSION='v5b-1';
export const FEATURE='play|BLC-4-070||energy';
export const VALIDATE_CAP=8;
export const BRANCH_BUDGET=VALIDATE_CAP*CONFIRM_PAIRS*2;
export const VALIDATE_SALT=960000;
export const MATCH_PAIRS=48;
export const MATCH_GAMES=MATCH_PAIRS*2;
export const PREFERENCE_IDS=Object.freeze(CONSTRAINTS.filter(item=>item.role==='preference').map(item=>item.id));
export const PRESERVE_IDS=Object.freeze(CONSTRAINTS.filter(item=>item.role==='preserve').map(item=>item.id));
export const HARM_ID='0d035ea8a0b2be16';
export const RAID_ID='1fbdc61d55fa7f09';
export const EE6C_ID='ee6cdd154ceeb4ce';
export const POINT_GRID=Object.freeze([9,18,27]);

export const VALIDATE_RULE=Object.freeze({
 id:'v5b-validate-1',
 text:'A 是 v2 的原選擇，B 是殘差選擇。單尾精確符號檢定問 A 是否更好，Holm 只作用在這一批驗證局面。通過且平均差為正，才是已確認的退步。不顯著不表示已證明安全，也不表示兩個動作等價。ee6c 維持 v2 的選擇只表示尚未學會，不是學會結束行動。'
});
export const MATCH_RULE=Object.freeze({
 id:'v5b-match-1',
 text:'只有驗證沒有已確認退步，而且每個新種子局面的樣本都偏向殘差時，才打 48 組、96 場開發診斷。這不是冠軍挑戰。診斷種子不拿來訓練、不拿來選權重、也不拿來做分支驗證。晉級門檻維持原狀。'
});

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(175800,2),
 'reject-blue':range(175820,2),
 renruki:range(175840,2)
});
export const MATCH_SEEDS=range(176200,16);
export const MATCH_OPPONENTS=Object.freeze(['white-sword','reject-blue','renruki']);
const ALREADY_MINED=Object.freeze([
 [173100,173149],[174200,174247],[175300,175349],[175500,175549],[175700,175741]
]);

if(BRANCH_BUDGET!==1056)throw Error('分支上限不是 1056');
if(MATCH_GAMES!==96)throw Error('診斷對局不是 96');
if(CONFIRM_PAIRS!==66)throw Error('驗證組數不是 66');

export function installColumn(preferences=CONSTRAINTS){
 assertOfficialLimits();
 const features=uniqueNamedFeatures(preferences);
 const text=features.map(feature=>signatureOf(feature.type,feature.card,'',feature.line));
 if(features.length!==1||text[0]!==FEATURE){
  return {ok:false,feature:null,features:text,reason:'本輪只安裝一個由三筆能量線偏好導出的欄位'};
 }
 return {ok:true,feature:features[0],text:text[0],features:text,reason:null};
}
export function stepSizes(weight){
 if(!(weight>=0)||weight>WEIGHT_CLIP+1e-9)throw Error('累積權重超出夾限');
 const parts=[];
 let left=weight;
 while(left>1e-8){
  const step=Math.min(STEP_CAP,left);
  parts.push(step);
  left-=step;
 }
 if(parts.some(step=>step-STEP_CAP>1e-9))throw Error('單步超過 1.5');
 return parts;
}
export function pointsOf(weight){
 return SCALE*weight;
}
export function assertMineSeed(seed,label){
 assertFreshSeed(seed,label);
 for(const [lo,hi] of ALREADY_MINED){
  if(seed>=lo&&seed<=hi)throw Error(label+' seed '+seed+' 屬於已經挖掘過的範圍');
 }
}
export function assertSeparated(mine,validate,matches){
 assertFreshPlan(mine,'v5b-mine');
 assertFreshPlan(validate,'v5b-validate');
 assertFreshPlan(matches,'v5b-match');
 const mined=new Set(mine);
 for(const seed of validate)if(mined.has(seed))throw Error('分支種子撞上挖掘種子');
 const used=new Set([...mine,...validate]);
 for(const seed of matches)if(used.has(seed))throw Error('診斷種子撞上挖掘或分支');
 for(const seed of mine)assertMineSeed(seed,'v5b-mine');
}
export function fullMatchGate(rows){
 const list=rows||[];
 const harms=list.filter(row=>row.confirmed);
 const fresh=list.filter(row=>row.role==='fresh');
 const positive=fresh.length>0&&fresh.every(row=>row.mean<0);
 return {harms:harms.length,fresh:fresh.length,positive,open:harms.length===0&&positive};
}
export function budgetFor(count){
 if(count<0||count>VALIDATE_CAP)throw Error('驗證局面數超過 8');
 const games=count*CONFIRM_PAIRS*2;
 if(games>BRANCH_BUDGET)throw Error('分支場數超過 1056');
 return games;
}
export {CONSTRAINTS,OFFICIAL_V2,HARD_CAP,HARD_NODES,HARD_OPTIONS,SCALE,STEP_CAP,WEIGHT_CLIP};
