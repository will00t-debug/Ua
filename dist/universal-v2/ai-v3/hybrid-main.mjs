// Playable main-phase hybrid. Idle main is frozen hard-search-2. Every other
// lane, including a pending choice that happens to occur during main, stays
// on AI v3. The benchmark calls this router; it does not keep a second copy.
import {legalUniversalActions,universalBp,universalEnergyByColor} from '../engine.mjs';
import {chooseStrengthenedHardAction,lastHardAiTrace,resetHardAiReport} from '../hard-ai.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from './search.mjs';
import {preferPaidFront} from './paid-front.mjs';

export const HYBRID_MAIN_POLICY='hybrid-main-v1';
// Opt-in. The worker whitelist accepts this name. The battle menu leaves it unchecked.
export const HYBRID_START_HARD_POLICY='hybrid-start-hard-v1';

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

export function hybridStartHardSource(lane){
 return lane==='main'||lane==='start'?'hard':'v3';
}

let lastRoute=null;
export function lastHybridRoute(){
 return lastRoute?{...lastRoute}:null;
}

// Side log for the acting seat. It is not written onto the match, and the
// opponent chooser does not read it. Hidden opponent zones are omitted.
const LOG_LIMIT=4000;
let decisionLog=[];
export function resetHybridDecisionLog(){decisionLog=[];}
export function hybridDecisionLog(){return decisionLog.map(row=>({...row,ownHand:row.ownHand.map(card=>({...card})),ownFront:row.ownFront.map(card=>({...card})),oppFront:row.oppFront.map(card=>({...card})),top:row.top.map(card=>({...card}))}));}

function liveBp(pack,state,card){
 if(!card)return 0;
 try{
  const value=universalBp(pack,state,card);
  return Number.isFinite(value)?value:0;
 }catch{return 0;}
}
function printed(pack,card){
 if(!card?.uid||!card.cardId)return null;
 const owner=Number(String(card.uid).split('-')[0]);
 const packs=Array.isArray(pack)?pack:[pack,pack];
 return packs[owner]?.cards?.[card.cardId]||null;
}
function actionBrief(pack,state,actor,action,score){
 const card=action?.uid?(state?.players?.[actor]?.hand||[]).find(item=>item?.uid===action.uid):null;
 const data=printed(pack,card);
 return {
  type:action?.type||null,line:action?.line||null,
  bp:card?liveBp(pack,state,card):(Number(data?.bp)||null),
  cost:data?Number(data.energy)||0:null,
  gen:data?Number(data.gen)||0:null,
  score:Number.isFinite(score)?Math.round(score*10)/10:null
 };
}
function noteHybridDecision(pack,state,actor,action,trace,lane){
 const mine=state?.players?.[actor];
 const opp=state?.players?.[1-actor];
 const colors=(()=>{try{return universalEnergyByColor(pack,state,actor)||{};}catch{return {};}})();
 const row={
  actor,lane,turn:state?.turn??null,phase:state?.phase||null,
  pending:state?.pending?.kind||null,
  life:(state?.players||[]).map(player=>player?.life?.length??null),
  apReady:(mine?.apCards||[]).filter(card=>card&&card.ready).length,
  colors,ownFront:(mine?.front||[]).filter(Boolean).map(card=>({bp:liveBp(pack,state,card),ready:card.ready===true})),
  oppFront:(opp?.front||[]).filter(Boolean).map(card=>({bp:liveBp(pack,state,card),ready:card.ready===true})),
  ownHand:(mine?.hand||[]).map(card=>{
   const data=printed(pack,card);
   return {bp:liveBp(pack,state,card),cost:Number(data?.energy)||0,gen:Number(data?.gen)||0,color:data?.color||null,type:data?.type||null};
  }),
  chosen:actionBrief(pack,state,actor,action,null),
  top:(trace?.candidates||[]).slice(0,6).map(item=>actionBrief(pack,state,actor,item.action,item.score??item.search)),
  nodesUsed:Number.isFinite(trace?.nodesUsed)?trace.nodesUsed:null,
  reason:trace?.reason||null,
  rootCut:trace?.rootCut===true
 };
 if(decisionLog.length>=LOG_LIMIT)decisionLog.shift();
 decisionLog.push(row);
}

export function chooseHybridMainAction(pack,state,options={}){
 const actor=options.actor??(state?.pending?.player??state?.active);
 const lane=hybridLane(state);
 const source=hybridSource(lane);
 const nodes=Number.isInteger(options.nodes)?options.nodes:MATCH_LIMITS.nodes;
 const ms=Number.isFinite(options.ms)?options.ms:MATCH_LIMITS.ms;
 const seed=Number.isInteger(options.seed)?options.seed:1;
 lastRoute={policy:HYBRID_MAIN_POLICY,lane,source,actor,nodes,ms};
 let action;
 if(source==='hard'){
  resetHardAiReport();
  action=chooseStrengthenedHardAction(pack,state,{nodes,ms,seed});
  if(options.factors?.paidFront===true){
   const legal=legalUniversalActions(pack,state);
   const swapped=preferPaidFront(pack,state,actor,action,legal,lastHardAiTrace());
   const exact=legal.find(item=>JSON.stringify(item)===JSON.stringify(swapped));
   if(exact)action=exact;
  }
 }else{
  resetAiV3Report();
  action=chooseAiV3Action(pack,state,{...options,actor,nodes,ms,seed,worlds:options.worlds??1});
 }
 try{noteHybridDecision(pack,state,actor,action,source==='hard'?lastHardAiTrace():lastAiV3Trace(),lane);}
 catch{/* a diagnostic snapshot must not change the action */}
 return action;
}

// Idle start and idle main ask hard-search-2. Move, attack, and every pending
// stay on AI v3. Hard still chooses extraDraw or next; this router does not
// forbid a draw. paidFront and settleLife are not applied. publicBlock and
// scaleOutside are forwarded only when the caller sets them.
export function chooseHybridStartHardAction(pack,state,options={}){
 const actor=options.actor??(state?.pending?.player??state?.active);
 const lane=hybridLane(state);
 const source=hybridStartHardSource(lane);
 const nodes=Number.isInteger(options.nodes)?options.nodes:MATCH_LIMITS.nodes;
 const ms=Number.isFinite(options.ms)?options.ms:MATCH_LIMITS.ms;
 const seed=Number.isInteger(options.seed)?options.seed:1;
 lastRoute={policy:HYBRID_START_HARD_POLICY,lane,source,actor,nodes,ms};
 let action;
 if(source==='hard'){
  resetHardAiReport();
  action=chooseStrengthenedHardAction(pack,state,{nodes,ms,seed});
 }else{
  resetAiV3Report();
  const forwarded={...options,actor,nodes,ms,seed,worlds:options.worlds??1};
  // publicBlock and scaleOutside are explicit benchmark switches. The menu
  // never sends them. settleLife and paidFront stay off on this route.
  const kept={};
  if(options.factors?.publicBlock===true)kept.publicBlock=true;
  if(options.factors?.scaleOutside===true)kept.scaleOutside=true;
  delete forwarded.factors;
  if(Object.keys(kept).length)forwarded.factors=kept;
  action=chooseAiV3Action(pack,state,forwarded);
 }
 try{noteHybridDecision(pack,state,actor,action,source==='hard'?lastHardAiTrace():lastAiV3Trace(),lane);}
 catch{/* a diagnostic snapshot must not change the action */}
 return action;
}
