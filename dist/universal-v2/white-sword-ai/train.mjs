// Match results update weights. Unfinished, illegal, leaking, looping,
// and fallback games are rejected instead of being stored as losses.
import {assertTrainableSeed} from './constants.mjs';
import {trainingLabel} from './runner.mjs';
import {updateModel} from './model.mjs';

export function collectSamples(games){
 const samples=[];
 const rejected=[];
 for(const game of games){
  assertTrainableSeed(game.seed);
  const label=trainingLabel(game);
  if(!label.usable){
   rejected.push({matchId:game.matchId||null,seed:game.seed,reason:label.reason});
   continue;
  }
  for(const sample of game.samples||[]){
   if(sample.kind==='outcome'&&sample.reward!=='win'&&sample.reward!=='loss'&&sample.reward!=='draw')
    throw Error('A training outcome must be the match result');
   if(sample.kind==='teacher'&&sample.reward!=null)throw Error('Teacher rows cannot carry a match result');
   samples.push(sample);
  }
 }
 return {samples,rejected};
}
export function learn(model,games,options){
 const {samples,rejected}=collectSamples(games);
 const result=updateModel(model,samples,options);
 return {...result,rejected,kept:samples.length,teacher:samples.filter(sample=>sample.kind==='teacher').length,
  outcome:samples.filter(sample=>sample.kind==='outcome').length};
}
