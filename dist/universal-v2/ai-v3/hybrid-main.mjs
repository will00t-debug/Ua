// Playable main-phase hybrid. Idle main is frozen hard-search-2. Every other
// lane, including a pending choice that happens to occur during main, stays
// on AI v3. The benchmark calls this router; it does not keep a second copy.
import {chooseAiV3Action,resetAiV3Report,MATCH_LIMITS} from './search.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport} from '../hard-ai.mjs';

export const HYBRID_MAIN_POLICY='hybrid-main-v1';

export function hybridLane(state){
 if(state?.pending)return 'pending';
 if(state?.phase==='start')return 'start';
 if(state?.phase==='move')return 'move';
 if(state?.phase==='main')return 'main';
 if(state?.phase==='attack')return 'battle';
 return 'other';
}

export function hybridSource(lane){
 return lane==='main'?'hard':'v3';
}

let lastRoute=null;
export function lastHybridRoute(){
 return lastRoute?{...lastRoute}:null;
}

export function chooseHybridMainAction(pack,state,options={}){
 const actor=options.actor??(state?.pending?.player??state?.active);
 const lane=hybridLane(state);
 const source=hybridSource(lane);
 const nodes=Number.isInteger(options.nodes)?options.nodes:MATCH_LIMITS.nodes;
 const ms=Number.isFinite(options.ms)?options.ms:MATCH_LIMITS.ms;
 const seed=Number.isInteger(options.seed)?options.seed:1;
 lastRoute={policy:HYBRID_MAIN_POLICY,lane,source,actor,nodes,ms};
 if(source==='hard'){
  resetHardAiReport();
  return chooseStrengthenedHardAction(pack,state,{nodes,ms,seed});
 }
 resetAiV3Report();
 return chooseAiV3Action(pack,state,{...options,actor,nodes,ms,seed,worlds:options.worlds??1});
}
