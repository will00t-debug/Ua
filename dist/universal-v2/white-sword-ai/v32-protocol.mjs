// v3.2 preregistration. All new seeds are distinct from v3.1's 47000–47029,
// historical heldout 94000+, and v3.2 training. Never tune with evaluation data.
import {CELLS,assertTrainableSeed} from './constants.mjs';
import {V31_DECKS} from './v31-protocol.mjs';
export const V32_TRAIN_SEEDS=Object.freeze(Array.from({length:24},(_,i)=>21200+i));
export const V32_PILOT_SEEDS=Object.freeze([48100,48101,48102,48103]);
export const V32_EVAL_SEEDS=Object.freeze(Array.from({length:30},(_,i)=>48200+i));
export const V32_DECKS=V31_DECKS;
export const V32_CONFIG=Object.freeze({
 qMinGap:1.5,qMaxGap:7,qPairsPerDecision:2,
 lr:0.08,epochs:4,trustDelta:0.55,margin:0.15,prior:0.025,
 scale:6,hardCap:7,scope:'voluntary'
});
export function assertV32Disjoint(){
 const all=[...V32_TRAIN_SEEDS,...V32_PILOT_SEEDS,...V32_EVAL_SEEDS];
 if(new Set(all).size!==all.length)throw Error('v3.2 seed overlap');
 for(const seed of V32_TRAIN_SEEDS)assertTrainableSeed(seed);
 if(V32_EVAL_SEEDS.length!==30)throw Error('Must reserve 30 unseen v3.2 seeds');
 return true;
}
export function v32TrainCases({smoke=false}={}){
 const seeds=smoke?V32_TRAIN_SEEDS.slice(0,1):V32_TRAIN_SEEDS;
 return seeds.flatMap(seed=>CELLS.map(cell=>({
  seed,...cell,opponentDeck:V32_DECKS[(seed+cell.first+cell.specialistSeat)%3]
 })));
}
export function v32EvaluationCases(seeds=V32_EVAL_SEEDS){
 const allowed=new Set([...V32_PILOT_SEEDS,...V32_EVAL_SEEDS]);
 if(seeds.some(seed=>!allowed.has(seed)))throw Error('Unregistered v3.2 evaluation seed');
 return seeds.flatMap(seed=>CELLS.flatMap(cell=>V32_DECKS.map(opponentDeck=>({
  seed,...cell,opponentDeck
 }))));
}
export function v32MirrorCases(seeds=V32_EVAL_SEEDS){
 const allowed=new Set([...V32_PILOT_SEEDS,...V32_EVAL_SEEDS]);
 if(seeds.some(seed=>!allowed.has(seed)))throw Error('Unregistered v3.2 mirror seed');
 return seeds.flatMap(seed=>CELLS.map(cell=>({
  seed,...cell,opponentDeck:'white-sword'
 })));
}
assertV32Disjoint();
