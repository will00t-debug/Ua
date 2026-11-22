// v3.3 tactical scoring experiment. Preregistered seeds are not in any
// earlier White Sword training/validation/holdout set.
import {CELLS} from './constants.mjs';
import {V31_DECKS} from './v31-protocol.mjs';
export const V33_PILOT_SEEDS=Object.freeze([48660,48661,48662,48663]);
export const V33_EVAL_SEEDS=Object.freeze(Array.from({length:30},(_,i)=>48700+i));
export const V33_DECKS=V31_DECKS;
export const V33_CONFIG=Object.freeze({scale:6,hardCap:7});
export function assertV33Disjoint(){
 const all=[...V33_PILOT_SEEDS,...V33_EVAL_SEEDS];
 if(new Set(all).size!==34||V33_EVAL_SEEDS.length!==30)throw Error('v3.3 seeds overlapped');
 if(all.some(seed=>seed>=94000&&seed<=94016))throw Error('v3.3 final holdout leak');
 return true;
}
export function v33Cases(seeds=V33_EVAL_SEEDS){
 const allowed=new Set([...V33_PILOT_SEEDS,...V33_EVAL_SEEDS]);
 if(seeds.some(seed=>!allowed.has(seed)))throw Error('v3.3 unregistered test seed');
 return seeds.flatMap(seed=>CELLS.flatMap(cell=>V33_DECKS.map(deckId=>({
  seed,...cell,opponentDeck:deckId
 }))));
}
export function v33MirrorCases(seeds=V33_EVAL_SEEDS){
 const allowed=new Set([...V33_PILOT_SEEDS,...V33_EVAL_SEEDS]);
 if(seeds.some(seed=>!allowed.has(seed)))throw Error('v3.3 unregistered mirror seed');
 return seeds.flatMap(seed=>CELLS.map(cell=>({seed,...cell,opponentDeck:'white-sword'})));
}
assertV33Disjoint();
