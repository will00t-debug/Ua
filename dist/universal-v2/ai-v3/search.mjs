// Playable ai-v3 entry. The live state is read only to list legal actions
// and to build a belief world. Search dispatches that world, then the
// chosen action is matched back onto the live legal list.
import {legalUniversalActions} from '../engine.mjs';
import {chooseStrengthenedHardAction,HARD_AI_POLICY} from '../hard-ai.mjs';
import {actorObservation} from './observation.mjs';
import {beliefWorlds} from './belief.mjs';
import {selectCandidates,scoreLine,same} from './beam.mjs';
import {blendRoot,learnBonus,SEARCH_PRIOR_GAP} from './prior.mjs';
import {chooseIsmctsAction} from './ismcts.mjs';

export const AI_V3_POLICY='ai-v3-beam-1';
export const AI_V3_BASELINE=HARD_AI_POLICY;
export {SEARCH_PRIOR_GAP};
const ORDER_KINDS=new Set(['phase-order','retirement-order','effect-move-order',
 'effect-top-order','effect-raid-witness-order','effect-raid-witness-move',
 'life-batch-order']);

function emptyReport(){
 return {decisions:0,forced:0,deferred:0,search:0,prior:0,ismcts:0,fallback:0,
  budget:0,unsupported:0,ms:0,maxMs:0,nodes:0,samples:[]};
}
let report=emptyReport();
let lastTrace=null;
export function resetAiV3Report(){report=emptyReport();lastTrace=null;}
export function aiV3Report(){return {...report,samples:report.samples.slice()};}
export function lastAiV3Trace(){return lastTrace?{...lastTrace,candidates:lastTrace.candidates?.map(row=>({...row}))}:null;}

function finish(action,reason,extra,started){
 const ms=performance.now()-started;
 report.ms+=ms;
 report.maxMs=Math.max(report.maxMs,ms);
 if(report.samples.length<4000)report.samples.push(Math.round(ms*10)/10);
 lastTrace={policy:AI_V3_POLICY,baseline:AI_V3_BASELINE,reason,ms,action:action?.type||null,...extra};
 return action;
}
function fallback(pack,state,legal,started,reason){
 report.fallback++;
 let action=null;
 try{action=chooseStrengthenedHardAction(pack,state,{ms:10000,nodes:48,seed:1});}
 catch{action=null;}
 const exact=legal.find(item=>same(item,action))||legal[0]||null;
 return finish(exact,'fallback-hard',{fallback:true,fallbackFrom:reason},started);
}
export function chooseAiV3Action(pack,state,options={}){
 const started=performance.now();
 report.decisions++;
 try{
  if(!state||state.status!=='playing')return finish(null,'idle',{},started);
  const actor=options.actor??(state.pending?.player??state.active);
  const legal=legalUniversalActions(pack,state);
  if(!legal.length)return finish(null,'no-legal',{actor},started);
  if(legal.length===1){report.forced++;return finish(legal[0],'forced',{actor},started);}
  if(state.pending?.kind==='opening-mulligan'||ORDER_KINDS.has(state.pending?.kind)){
   report.deferred++;
   const deferred=chooseStrengthenedHardAction(pack,state,{ms:10000,nodes:8,seed:options.seed??1});
   const exact=legal.find(item=>same(item,deferred))||legal[0];
   return finish(exact,'deferred-baseline',{actor,fallback:false},started);
  }
  const seed=Number.isInteger(options.seed)?options.seed:1;
  const worldsWanted=options.mode==='belief'?Math.max(2,options.worlds||3):Math.max(1,options.worlds||1);
  const worlds=beliefWorlds(pack,state,actor,seed,worldsWanted);
  if(!worlds.length)return fallback(pack,state,legal,started,'no-world');
  const probe=worlds[0].state;
  const beam=options.beam??5;
  const ranked=selectCandidates(pack,probe,actor,legal,beam);
  if(options.mode==='prior'){
   report.prior++;
   const exact=legal.find(item=>same(item,ranked[0]))||legal[0];
   return finish(exact,'prior',{actor,seed,worlds:worlds.length,candidates:ranked.slice(0,beam).map(action=>({action}))},started);
  }
  if(options.mode==='ismcts'){
   report.ismcts++;
   const picked=chooseIsmctsAction(pack,worlds,actor,legal,{
    nodes:options.nodes??96,beam:1,seed,
    actorDecisions:options.actorDecisions??3,
    opponentDecisions:options.opponent===false?0:(options.opponentDecisions??3),
    deadline:started+(options.ms??80)
   });
   const exact=legal.find(item=>same(item,picked?.action));
   if(!exact)return fallback(pack,state,legal,started,'ismcts-empty');
   return finish(exact,'ismcts',{actor,seed,worlds:worlds.length,visits:picked.visits,fallback:false},started);
  }
  const total=Number.isInteger(options.nodes)?options.nodes:96;
  const share=Math.max(12,Math.floor(total/Math.max(1,ranked.length*worlds.length)));
  const deadline=started+(options.ms??80);
  const opponentDecisions=options.opponent===false?0:(options.opponentDecisions??4);
  const limits={
   nodes:share,beam,deadline,
   actorDecisions:options.actorDecisions??4,
   opponentDecisions
  };
  const scored=[];
  for(const action of ranked){
   if(performance.now()>deadline&&scored.length){report.budget++;break;}
   let totalScore=0,n=0,turns=0,responses=0,decisions=0,nodes=0,hits=0;
   for(const world of worlds){
    const line=scoreLine(pack,world.state,actor,action,limits);
    if(!line||!Number.isFinite(line.search))continue;
    totalScore+=line.search;
    n++;
    turns+=line.opponentTurns;
    responses+=line.responses;
    decisions+=line.actorDecisions;
    nodes+=line.nodes;
    hits+=line.transpositionHits;
    report.unsupported+=line.unsupported;
   }
   if(!n)continue;
   scored.push({action,search:totalScore/n,opponentTurns:turns,responses,actorDecisions:decisions,nodes});
   report.nodes+=nodes;
   report.transpositionHits=(report.transpositionHits||0)+hits;
  }
  if(!scored.length)return fallback(pack,state,legal,started,'empty-search');
  const observation=actorObservation(pack,state,actor);
  const anchor=scored.reduce((best,row)=>row.search>best.search?row:best).action;
  const blended=blendRoot(scored,action=>{
   const mine=learnBonus(options.prior,observation,action,actor);
   const base=learnBonus(options.prior,observation,anchor,actor);
   return mine-base;
  });
  const exact=legal.find(item=>same(item,blended?.action));
  if(!exact)return fallback(pack,state,legal,started,'unmatched');
  report.search++;
  const row=scored.find(item=>same(item.action,exact));
  return finish(exact,report.samples&&performance.now()>deadline?'budget':'search',{
   actor,seed,worlds:worlds.length,score:row?.search??null,bonus:blended.bonus,
   opponentTurns:row?.opponentTurns||0,responses:row?.responses||0,
   actorDecisions:row?.actorDecisions||0,fallback:false,
   candidates:scored.map(item=>({action:item.action,search:item.search,opponentTurns:item.opponentTurns}))
  },started);
 }catch(error){
  try{
   const legal=legalUniversalActions(pack,state);
   return fallback(pack,state,legal,started,error?.message||'exception');
  }catch{return finish(null,'exception',{fallback:true},started);}
 }
}
