// Playable ai-v3 entry. The live state is read only to list legal actions
// and to build a belief world. Search dispatches that world, then the
// chosen action is matched back onto the live legal list.
import {legalUniversalActions} from '../engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,hardAiReport,HARD_AI_POLICY} from '../hard-ai.mjs';
import {actorObservation} from './observation.mjs';
import {beliefWorlds} from './belief.mjs';
import {selectCandidates,scoreLine,same,rankLegal,isSafeAction} from './beam.mjs';
import {blendRoot,learnBonus,SEARCH_PRIOR_GAP} from './prior.mjs';
import {chooseIsmctsAction} from './ismcts.mjs';

export const AI_V3_POLICY='ai-v3-beam-1';
export const AI_V3_BASELINE=HARD_AI_POLICY;
export {SEARCH_PRIOR_GAP};
// Strategy tests, full matches and the browser preview share this budget.
export const MATCH_LIMITS=Object.freeze({nodes:48,ms:40,beam:4,actorDecisions:2,opponentDecisions:2,worlds:1});
const ORDER_KINDS=new Set(['phase-order','retirement-order','effect-move-order',
 'effect-top-order','effect-raid-witness-order','effect-raid-witness-move',
 'life-batch-order']);

function emptyReport(){
 return {decisions:0,forced:0,deferred:0,search:0,prior:0,ismcts:0,fallback:0,
  budgetFallback:0,budget:0,unsupported:0,ms:0,maxMs:0,nodes:0,samples:[]};
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
  const beam=options.beam??MATCH_LIMITS.beam;
  const combat=state.phase==='attack'||state.pending?.kind==='block'||state.pending?.kind==='effect-block-floor';
  const pinned=Number.isInteger(options.nodes);
  const total=pinned?options.nodes:(combat?64:48);
  const ms=Number.isFinite(options.ms)?options.ms:(pinned?1e9:(combat?64:48));
  const ordered=rankLegal(pack,probe,actor,legal);
  if(options.mode==='prior'){
   report.prior++;
   const exact=legal.find(item=>same(item,ordered[0]))||legal[0];
   return finish(exact,'prior',{actor,seed,worlds:worlds.length,nodesUsed:0,
    candidates:ordered.slice(0,beam).map(action=>({action}))},started);
  }
  const ranked=selectCandidates(pack,probe,actor,legal,beam);
  const deadline=started+ms;
  if(options.mode==='ismcts'){
   report.ismcts++;
   const pool={n:total};
   const picked=chooseIsmctsAction(pack,worlds,actor,legal,{
    nodes:total,pool,beam:1,seed,
    actorDecisions:options.actorDecisions??3,
    opponentDecisions:options.opponent===false?0:(options.opponentDecisions??3),
    deadline
   });
   report.nodes+=total-pool.n;
   const exact=legal.find(item=>same(item,picked?.action));
   if(!exact)return fallback(pack,state,legal,started,'ismcts-empty');
   return finish(exact,'ismcts',{actor,seed,worlds:worlds.length,visits:picked.visits,
    nodesUsed:total-pool.n,fallback:false},started);
  }
  const opponentDecisions=options.opponent===false?0:(options.opponentDecisions??MATCH_LIMITS.opponentDecisions);
  const pool={n:total};
  const nodesBefore=report.nodes;
  resetHardAiReport();
  const hardSlice=Math.min(16,pool.n);
  const hardMs=Math.max(1,Math.min(16,deadline-performance.now()));
  const hardRaw=hardSlice>0?chooseStrengthenedHardAction(pack,state,{nodes:hardSlice,ms:hardMs,seed}):null;
  const hardSpent=Math.min(pool.n,hardAiReport().nodes||0);
  pool.n-=hardSpent;
  report.nodes+=hardSpent;
  const hardExact=legal.find(item=>same(item,hardRaw))||null;
  const constructive=hardExact&&!isSafeAction(hardExact)?hardExact:ordered.find(action=>!isSafeAction(action))||null;
  const jobs=[];
  const push=action=>{if(action&&!jobs.some(item=>same(item,action)))jobs.push(action);};
  push(constructive);
  const safe=ranked.find(isSafeAction);
  push(safe);
  for(const action of ranked)if(!isSafeAction(action))push(action);
  const scored=[];
  const actorDecisions=options.actorDecisions??MATCH_LIMITS.actorDecisions;
  // One settled turn is worth more than another shallow glance. Hold nodes
  // back so the last jobs, including the idle baseline, can finish too.
  const lineFloor=16;
  for(let index=0;index<jobs.length;index++){
   const reserve=index===0&&jobs.length>1?lineFloor:0;
   if(pool.n-reserve<8){report.budget++;break;}
   if(performance.now()>deadline&&scored.length){report.budget++;break;}
   const action=jobs[index];
   let totalScore=0,n=0,turns=0,responses=0,decisions=0,nodes=0,hits=0,settled=0,pending=null,phase=null;
   for(let w=0;w<worlds.length;w++){
    if(pool.n<=0){report.budget++;break;}
    const slice=Math.min(pool.n-reserve,lineFloor);
    const line=scoreLine(pack,worlds[w].state,actor,action,{
     nodes:slice,pool,beam,deadline,actorDecisions,opponentDecisions
    });
    if(!line||!Number.isFinite(line.search))continue;
    totalScore+=line.search;
    n++;
    turns+=line.opponentTurns;
    responses+=line.responses;
    decisions+=line.actorDecisions;
    nodes+=line.nodes;
    if(line.settled)settled++;
    pending=line.pending;
    phase=line.phase;
    hits+=line.transpositionHits;
    report.unsupported+=line.unsupported;
   }
   if(!n)continue;
   scored.push({action,search:totalScore/n,opponentTurns:turns,responses,actorDecisions:decisions,
    nodes,settled:settled===n,pending,phase});
   report.nodes+=nodes;
   report.transpositionHits=(report.transpositionHits||0)+hits;
  }
  const viewed=scored.map(item=>({action:item.action,search:item.search,opponentTurns:item.opponentTurns,
   settled:item.settled,pending:item.pending,phase:item.phase,nodes:item.nodes}));
  const backup=constructive;
  const finished=scored.filter(item=>item.settled);
  const finishedPlay=finished.filter(item=>!isSafeAction(item.action));
  const unfinishedPlay=scored.some(item=>!item.settled&&!isSafeAction(item.action));
  const missed=jobs.length>scored.length;
  if(!finishedPlay.length&&backup&&(unfinishedPlay||missed||!finished.length)){
   report.budgetFallback++;
   report.budget++;
   return finish(backup,'budget-fallback',{
    actor,seed,worlds:worlds.length,nodesUsed:report.nodes-nodesBefore,fallback:false,incomplete:true,
    hard:hardExact,compared:viewed,unscored:jobs.length-scored.length
   },started);
  }
  if(!scored.length)return fallback(pack,state,legal,started,'empty-search');
  const observation=actorObservation(pack,state,actor);
  const poolRows=finished.length?finished:scored;
  const anchor=poolRows.reduce((best,row)=>row.search>best.search?row:best).action;
  const blended=blendRoot(poolRows,action=>{
   const mine=learnBonus(options.prior,observation,action,actor);
   const base=learnBonus(options.prior,observation,anchor,actor);
   return mine-base;
  });
  const exact=legal.find(item=>same(item,blended?.action));
  if(!exact)return fallback(pack,state,legal,started,'unmatched');
  report.search++;
  const row=scored.find(item=>same(item.action,exact));
  return finish(exact,performance.now()>deadline?'budget':'search',{
   actor,seed,worlds:worlds.length,score:row?.search??null,bonus:blended.bonus,
   opponentTurns:row?.opponentTurns||0,responses:row?.responses||0,
   actorDecisions:row?.actorDecisions||0,nodesUsed:report.nodes-nodesBefore,fallback:false,
   incomplete:!row?.settled,hard:hardExact,compared:viewed,unscored:jobs.length-scored.length,
   candidates:viewed
  },started);
 }catch(error){
  try{
   const legal=legalUniversalActions(pack,state);
   return fallback(pack,state,legal,started,error?.message||'exception');
  }catch{return finish(null,'exception',{fallback:true},started);}
 }
}
