import {legalActions,controller,cardOf,dispatch} from './engine.mjs';
import {chooseAiAction,evaluatePosition} from './ai-v2.mjs';
import {encodeAction} from './ai-v3-features.mjs';
import {scoreFeatures,validateModel} from './ai-v3-network.mjs';
import {CHAMPION_MODEL} from './ai-v3-weights.mjs';

function safeBoardScore(s,action,p,known){
 try{
  const next=dispatch(s,action);
  if(next.pending)return null;
  for(let i=0;i<2;i++){
   if(next.players[i].deck.length!==s.players[i].deck.length||
      next.players[i].life.length!==s.players[i].life.length||
      next.players[i].hand.length!==s.players[i].hand.length)return null;
  }
  return evaluatePosition(next,p,known);
 }catch{return null;}
}
export function chooseNeuralAction(s,{model=CHAMPION_MODEL,minMargin=0.24}={}){
 const fallback=chooseAiAction(s,{difficulty:'hard'});
 if(!model||!fallback||s.status==='finished')return fallback;
 validateModel(model);
 // Neural actions must not override combat, trigger, pending resolutions,
 // mulligans or special rule effects: v2 plans those explicitly. The network
 // is trained for comparable character deployments during the main phase.
 if(s.status!=='playing'||s.pending||s.phase!=='main'||fallback.type!=='play')return fallback;
 const p=controller(s),hand=s.players[p].hand;
 const baseCard=hand.find(c=>c.uid===fallback.uid);
 if(cardOf(baseCard||{})?.type!=='character')return fallback;
 const legal=legalActions(s).filter(a=>
  a.type==='play'&&a.line===fallback.line&&
  cardOf(hand.find(c=>c.uid===a.uid)||{})?.type==='character');
 if(legal.length<2)return fallback;
 const known=new Set(hand.map(c=>c.uid));
 const baselineBoard=safeBoardScore(s,fallback,p,known);
 const baselineScore=scoreFeatures(model,encodeAction(s,fallback,p));
 let best=null,bestScore=baselineScore;
 for(const action of legal){
  const board=baselineBoard===null?null:safeBoardScore(s,action,p,known);
  if(board!==null&&board<baselineBoard-1.5)continue;
  const score=scoreFeatures(model,encodeAction(s,action,p));
  if(score>bestScore){best=action;bestScore=score;}
 }
 // Relative margin is in the network's own score units; narrow choices
 // defer to tested AI v2. The legal oracle remains authoritative.
 if(best&&bestScore-baselineScore>Math.max(0.65,minMargin))return best;
 return fallback;
}
export function hasTrainedChampion(){return !!CHAMPION_MODEL;}
