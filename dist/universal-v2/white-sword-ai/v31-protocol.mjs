// New v3.1 experiment. The 30 large-test seeds are frozen before training;
// they never overlap v2, v3, v3.1 training or earlier evaluated seed sets.
import {CELLS,assertTrainableSeed} from './constants.mjs';
import {V3_FINAL_SEEDS} from './v3-protocol.mjs';
export const V31_TRAIN_SEEDS=Object.freeze(Array.from({length:24},(_,i)=>21090+i));
export const V31_SMOKE_SEEDS=Object.freeze([46100,46101]);
export const V31_PILOT_SEEDS=Object.freeze([46102,46103,46104,46105]);
export const V31_EVAL_SEEDS=Object.freeze(Array.from({length:30},(_,i)=>47000+i));
export const V31_DECKS=Object.freeze(['white-sword','reject-blue','renruki']);
export const V31_CONFIG=Object.freeze({
 qMinGap:1.5,qMaxGap:7,qPairsPerDecision:2,
 lr:0.10,epochs:4,trustDelta:0.8,margin:0.15,prior:0.015,
 scale:6,hardCap:7
});
function distinct(arrays){
 const seen=new Set();
 for(const a of arrays)for(const seed of a){
  if(!Number.isSafeInteger(seed)||seen.has(seed))throw Error('Repeated/invalid v3.1 seed '+seed);
  seen.add(seed);
 }
 return true;
}
export function assertV31Splits(){
 distinct([V31_TRAIN_SEEDS,V31_SMOKE_SEEDS,V31_PILOT_SEEDS,V31_EVAL_SEEDS,V3_FINAL_SEEDS]);
 for(const seed of V31_TRAIN_SEEDS)assertTrainableSeed(seed);
 if(V31_EVAL_SEEDS.length!==30)throw Error('v3.1 30-seed evaluation is locked');
 return true;
}
export function evaluationCases(seeds=V31_EVAL_SEEDS){
 for(const seed of seeds)if(!V31_SMOKE_SEEDS.includes(seed)&&
  !V31_PILOT_SEEDS.includes(seed)&&!V31_EVAL_SEEDS.includes(seed))
  throw Error('Unregistered v3.1 evaluation seed');
 return seeds.flatMap(seed=>CELLS.flatMap(cell=>V31_DECKS.map(deckId=>({
  seed,specialistSeat:cell.specialistSeat,first:cell.first,opponentDeck:deckId
 }))));
}
export function mirrorCases(seeds=V31_EVAL_SEEDS){
 for(const seed of seeds)if(!V31_SMOKE_SEEDS.includes(seed)&&
  !V31_PILOT_SEEDS.includes(seed)&&!V31_EVAL_SEEDS.includes(seed))
  throw Error('Unregistered v3.1 mirror seed');
 return seeds.flatMap(seed=>CELLS.map(cell=>({seed,...cell,opponentDeck:'white-sword'})));
}
export function trainingCases({smoke=false}={}){
 const seeds=smoke?V31_TRAIN_SEEDS.slice(0,1):V31_TRAIN_SEEDS;
 return seeds.flatMap(seed=>CELLS.map(cell=>({
  seed,specialistSeat:cell.specialistSeat,first:cell.first,
  opponentDeck:V31_DECKS[(seed+cell.specialistSeat+cell.first)%3]
 })));
}
assertV31Splits();
