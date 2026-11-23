// Pair two continuations that start from one hidden-information sample.
import {cloneMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {judgeSamples,shouldExtend} from './protocol.mjs';
import {sampleHidden} from './hidden.mjs';

export function foldPair(left,right,actor){
 if(!left?.finished||!right?.finished)return null;
 const leftWin=left.winner===actor;
 const rightWin=right.winner===actor;
 if(leftWin&&!rightWin)return 1;
 if(rightWin&&!leftWin)return -1;
 return 0;
}
export function jobsFor(position,state,attempt,salt){
 const hidden=sampleHidden(state,position.actor,(salt+attempt*997)>>>0);
 const base={
  decks:position.decks,actor:position.actor,seed:(salt+attempt*997)>>>0,positionId:position.id,attempt
 };
 return [
  {...base,id:position.id+':'+attempt+':A',side:'A',state:cloneMatch(hidden),action:position.actionA.action},
  {...base,id:position.id+':'+attempt+':B',side:'B',state:cloneMatch(hidden),action:position.actionB.action}
 ];
}
export function summarizePosition(position,pairs){
 const diffs=pairs.map(pair=>pair.diff).filter(value=>value!==null&&value!==undefined);
 const attempts=pairs.length;
 const judgment=judgeSamples(diffs);
 return {
  id:position.id,bucket:position.bucket,opponent:position.opponent,seed:position.seed,step:position.step,
  attempts,finished:diffs.length,invalid:attempts-diffs.length,
  ...judgment,
  extend:shouldExtend(judgment,attempts),
  actionA:{key:position.actionA.key,hard:position.actionA.hard,features:position.actionA.features},
  actionB:{key:position.actionB.key,hard:position.actionB.hard,features:position.actionB.features}
 };
}
