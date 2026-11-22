// v3.3 preregistration. All new seeds are distinct from v3.1's 47000–47029,
// historical heldout 94000+, and v3.3 training. Never tune with evaluation data.
import {CELLS,assertTrainableSeed} from './constants.mjs';
import {V31_DECKS} from './v31-protocol.mjs';
export const V33_TRAIN_SEEDS=Object.freeze(Array.from({length:24},(_,i)=>21400+i));
export const V33_PILOT_SEEDS=Object.freeze([48500,48501,48502,48503]);
export const V33_EVAL_SEEDS=Object.freeze(Array.from({length:30},(_,i)=>48600+i));
export const V33_DECKS=V31_DECKS;
export const V33_CONFIG=Object.freeze({
 qMinGap:1.5,qMaxGap:7,qPairsPerDecision:2,
 lr:0.08,epochs:4,trustDelta:0.55,margin:0.15,prior:0.025,
 scale:6,hardCap:7,scope:'voluntary',teacher:'hidden-safe-next-turn-forecast'
});
export function assertV33Disjoint(){
 const all=[...V33_TRAIN_SEEDS,...V33_PILOT_SEEDS,...V33_EVAL_SEEDS];
 if(new Set(all).size!==all.length)throw Error('v3.3 seed overlap');
 for(const seed of V33_TRAIN_SEEDS)assertTrainableSeed(seed);
 if(V33_EVAL_SEEDS.length!==30)throw Error('Must reserve 30 unseen v3.3 seeds');
 return true;
}
export function v33TrainCases({smoke=false}={}){
 const seeds=smoke?V33_TRAIN_SEEDS.slice(0,1):V33_TRAIN_SEEDS;
 return seeds.flatMap(seed=>CELLS.map(cell=>({
  seed,...cell,opponentDeck:V33_DECKS[(seed+cell.first+cell.specialistSeat)%3]
 })));
}
export function v33EvaluationCases(seeds=V33_EVAL_SEEDS){
 const allowed=new Set([...V33_PILOT_SEEDS,...V33_EVAL_SEEDS]);
 if(seeds.some(seed=>!allowed.has(seed)))throw Error('Unregistered v3.3 evaluation seed');
 return seeds.flatMap(seed=>CELLS.flatMap(cell=>V33_DECKS.map(opponentDeck=>({
  seed,...cell,opponentDeck
 }))));
}
export function v33MirrorCases(seeds=V33_EVAL_SEEDS){
 const allowed=new Set([...V33_PILOT_SEEDS,...V33_EVAL_SEEDS]);
 if(seeds.some(seed=>!allowed.has(seed)))throw Error('Unregistered v3.3 mirror seed');
 return seeds.flatMap(seed=>CELLS.map(cell=>({
  seed,...cell,opponentDeck:'white-sword'
 })));
}
assertV33Disjoint();
