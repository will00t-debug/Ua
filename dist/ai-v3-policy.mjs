import {legalActions,controller} from './engine.mjs';
import {chooseAiAction} from './ai-v2.mjs';
import {encodeAction} from './ai-v3-features.mjs';
import {scoreFeatures,validateModel} from './ai-v3-network.mjs';
import {CHAMPION_MODEL} from './ai-v3-weights.mjs';

export function chooseNeuralAction(s,{model=CHAMPION_MODEL,minMargin=0.24}={}){
 const fallback=chooseAiAction(s,{difficulty:'hard'});
 if(!model||!fallback||s.status==='finished')return fallback;
 validateModel(model);
 // Keep hard-coded rules for the opening decision, and search around the
 // strong baseline action elsewhere. The legality oracle is never the network.
 if(s.status==='mulligan')return fallback;
 const p=controller(s),legal=legalActions(s);
 let chosen=fallback,baselineScore=-Infinity,bestScore=-Infinity,best=null;
 for(const a of legal){
  const sc=scoreFeatures(model,encodeAction(s,a,p));
  if(JSON.stringify(a)===JSON.stringify(fallback))baselineScore=sc;
  if(sc>bestScore){bestScore=sc;best=a;}
 }
 // Conservative roll-out: learned policy can overrule v2 only when its own
 // relative preference clears the calibrated gate; never invent a move.
 if(best&&bestScore-baselineScore>minMargin)return best;
 return chosen;
}
export function hasTrainedChampion(){return !!CHAMPION_MODEL;}
