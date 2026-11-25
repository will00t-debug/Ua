// v4-B.7 mines new positions and keeps the verified two-stage test.
// The branch budget counts rollout games, not the fresh mining matches.
import {HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshPlan,assertFreshSeed} from '../../v4b/lib/protocol.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {CONFIRM_PAIRS,SCREEN_FLOOR} from '../../v4b4/lib/confirm.mjs';
import {SCREEN_PAIRS} from '../../v4b4/lib/sampling.mjs';

export const CODE_VERSION='v4b7-1';
export const BRANCH_BUDGET=1200;
export const SCREEN_CAP=42;
export const LEARNABLE_SLOTS=3;
export const RESERVED_SLOTS=1;
export const CONFIRM_CAP=LEARNABLE_SLOTS+RESERVED_SLOTS;
export const MINE_PER_OPPONENT=10;
export const PER_CELL=2;
export const SCREEN_SALT=610000;
export const CONFIRM_SALT=720000;
export const TARGET_PREFERENCE='d12a2d6f5ced1d88';
export const RAID_POSITION='1fbdc61d55fa7f09';

if(HARD_OPTIONS.nodes!==48)throw Error('Hard Search 2 的節點數不是 48');
if(HARD_CAP!==7||STEP_CAP!==1.5||WEIGHT_CLIP!==6||SCALE!==6)throw Error('v4-B.7 改到了正式評分限制');
if(SCREEN_PAIRS!==8||CONFIRM_PAIRS!==66||SCREEN_FLOOR!==-0.25)throw Error('v4-B.7 改到了兩階段確認的組數或門檻');

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(175300,MINE_PER_OPPONENT),
 'reject-blue':range(175320,MINE_PER_OPPONENT),
 renruki:range(175340,MINE_PER_OPPONENT)
});
const ALREADY_MINED=Object.freeze([
 [173100,173109],[173120,173129],[173140,173149],
 [174200,174207],[174220,174227],[174240,174247]
]);
export function assertMineSeed(seed,label){
 assertFreshSeed(seed,label);
 for(const [lo,hi] of ALREADY_MINED){
  if(seed>=lo&&seed<=hi){
   const error=Error(label+' seed '+seed+' 屬於已經挖掘過的範圍');
   error.code='V4B7_SEED';
   throw error;
  }
 }
}
export function assertMineSeeds(){
 const seen=new Set();
 for(const seed of Object.values(MINE_SEEDS).flat()){
  assertMineSeed(seed,'v4b7-mine');
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
export function assertBranchSeeds(screen,confirm){
 assertFreshPlan(screen,'v4b7-screen');
 assertFreshPlan(confirm,'v4b7-confirm');
 const screenSet=new Set(screen);
 if(screenSet.size!==screen.length)throw Error('篩選種子在這一批局面裡重複');
 const confirmSet=new Set(confirm);
 if(confirmSet.size!==confirm.length)throw Error('確認種子在這一批局面裡重複');
 for(const seed of confirm)if(screenSet.has(seed))throw Error('確認種子撞上篩選');
 const mined=new Set(Object.values(MINE_SEEDS).flat());
 for(const seed of [...screen,...confirm])if(mined.has(seed))throw Error('分支種子撞上挖掘種子');
}
