// Playable ai-v3 entry. The live state is read only to list legal actions
// and to build a belief world. Search dispatches that world, then the
// chosen action is matched back onto the live legal list.
import {legalUniversalActions} from '../engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,hardAiReport,HARD_AI_POLICY} from '../hard-ai.mjs';
import {actorObservation} from './observation.mjs';
import {beliefWorlds} from './belief.mjs';
import {selectCandidates,scoreLine,same,rankLegal,isSafeAction} from './beam.mjs';
import {keepScore} from './eval.mjs';
import {blendRoot,learnBonus,SEARCH_PRIOR_GAP} from './prior.mjs';
import {chooseIsmctsAction} from './ismcts.mjs';

export const AI_V3_POLICY='ai-v3-beam-1';
export const AI_V3_BASELINE=HARD_AI_POLICY;
export {SEARCH_PRIOR_GAP};
// Strategy tests, full matches and the browser preview share this budget.
export const MATCH_LIMITS=Object.freeze({nodes:48,ms:40,beam:4,actorDecisions:2,opponentDecisions:2,worlds:1});
// Longer clocks keep the same 1.2 nodes per millisecond as the 48/40 match budget.
export const THINK_BUDGETS=Object.freeze([
 Object.freeze({ms:40,nodes:48}),
 Object.freeze({ms:100,nodes:120}),
 Object.freeze({ms:300,nodes:360}),
 Object.freeze({ms:800,nodes:960})
]);
const ORDER_KINDS=new Set(['phase-order','retirement-order','effect-move-order',
 'effect-top-order','effect-raid-witness-order','effect-raid-witness-move',
 'life-batch-order']);

function emptyReport(){
 return {decisions:0,forced:0,deferred:0,search:0,settledChoices:0,prior:0,ismcts:0,fallback:0,
  budgetFallback:0,budget:0,unsupported:0,ms:0,maxMs:0,nodes:0,basicNodes:0,deepNodes:0,samples:[],
  followBranches:0,maxDepth:0,responses:0};
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
 report.followBranches+=extra.followBranches||0;
 report.maxDepth=Math.max(report.maxDepth||0,extra.maxDepth||0);
 report.responses+=extra.responses||0;
 return action;
}
function cardOf(state,actor,uid){
 const player=state.players[actor];
 for(const zone of ['hand','outside','front','energy']){
  const card=(player[zone]||[]).find(item=>item?.uid===uid);
  if(card)return card;
 }
 return null;
}
// A cut-off search is not allowed to invent a winner. Discard the card we
// least want to keep, recover the one we most want, and otherwise keep the
// hard suggestion — including a legal skip.
function reliableChoice(pack,state,actor,legal,hardExact,ordered){
 const kind=state.pending?.kind||'';
 const ranked=list=>{
  return [...list].sort((a,b)=>{
   const delta=keepScore(pack,state,actor,cardOf(state,actor,a.uid))-keepScore(pack,state,actor,cardOf(state,actor,b.uid));
   if(delta)return delta;
   return JSON.stringify(a)<JSON.stringify(b)?-1:1;
  });
 };
 if(kind.startsWith('effect-discard')){
  const discards=legal.filter(action=>action.uid&&action.type==='chooseDiscard');
  if(discards.length)return ranked(discards)[0];
 }
 if(kind==='effect-recover-ap')return legal.find(action=>action.uid)||hardExact||legal[0];
 if(kind==='effect-recover-outside'||kind==='effect-buff-own'){
  const picks=legal.filter(action=>action.uid);
  if(picks.length)return ranked(picks)[picks.length-1];
 }
 if(kind==='effect-optional-mill')return legal.find(action=>action.mode==='mill')||hardExact||legal[0];
 return hardExact||ordered[0]||legal[0];
}
const BOUNDARY_RANK={terminal:5,returned:4,yielded:3,pending:2,open:1};
// A finished game outranks a returned turn. When nothing got home, lines
// that stopped on the same boundary still compete. A pass that got further
// than a cut play does not win that comparison by itself.
export function comparedLines(scored){
 const terminals=scored.filter(item=>item.boundary==='terminal');
 const wins=terminals.filter(item=>item.search>0);
 if(wins.length)return {rows:wins,shared:false,contested:false};
 const returned=scored.filter(item=>item.boundary==='returned');
 if(returned.length)return {rows:returned,shared:false,contested:false};
 const losses=terminals.filter(item=>item.search<=-90000);
 // A finished loss is known. It does not erase an alternative that has not
 // been resolved, and that alternative's unfinished score is not a choice.
 if(losses.length&&scored.some(item=>item.boundary!=='terminal'))return {rows:[],shared:false,contested:true};
 if(terminals.length)return {rows:terminals,shared:false,contested:false};
 let best=0;
 for(const row of scored)best=Math.max(best,BOUNDARY_RANK[row.boundary]||0);
 if(!best)return {rows:[],shared:false,contested:false};
 const rows=scored.filter(row=>(BOUNDARY_RANK[row.boundary]||0)===best);
 // yielded and pending are labels, not positions. Incomplete lines share a
 // comparison only when the turn, the player to move, the phase, and the
 // pending effect are the same.
 let chosen=rows;
 if(best<BOUNDARY_RANK.returned){
  const groups=new Map();
  for(const row of rows){
   const key=placeKey(row);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(row);
  }
  if(groups.size>1){
   const lists=[...groups.values()];
   const players=new Set(lists.map(list=>list[0].leafPendingPlayer??''));
   if(players.size>1)chosen=[];
   const idle=list=>list.every(item=>isSafeAction(item.action));
   lists.sort((a,b)=>{
    if(idle(a)!==idle(b))return idle(a)?1:-1;
    return b.length-a.length;
   });
   const top=lists[0],second=lists[1];
   if(players.size<=1){
    if(top.length===second.length&&idle(top)===idle(second))chosen=[];
    else chosen=top;
   }
  }
 }
 if(!chosen.length)return {rows:[],shared:false,contested:false};
 const idleOnly=chosen.every(item=>isSafeAction(item.action));
 const behind=scored.some(row=>!isSafeAction(row.action)&&!chosen.includes(row));
 if(idleOnly&&behind)return {rows:[],shared:false,contested:false};
 return {rows:chosen,shared:true,contested:false};
}
function doneLine(row){
 return !!(row&&(row.settled||row.boundary==='returned'||row.boundary==='terminal'));
}
function ourPlan(row){
 return (row?.sequence||[]).filter(step=>step.kind==='root'||step.kind==='choice')
  .map(step=>[step.type,step.uid??'',step.line||'',step.mode||''].join(':')).join('|');
}
// A lower deep score replaces the basic line only when it is the same
// friendly plan and an opponent reply refuted it. A deep line that chose
// different friendly actions is a different plan and keeps the better score.
export function mergeRows(basic,deep){
 if(!deep||!Number.isFinite(deep.search))return basic;
 if(!basic||!Number.isFinite(basic.search))return deep;
 if(deep.refuted&&ourPlan(basic)===ourPlan(deep)&&deep.search<basic.search)return deep;
 if(doneLine(basic)&&!doneLine(deep))return basic;
 if(doneLine(deep)&&!doneLine(basic))return deep;
 return deep.search>basic.search?deep:basic;
}
function placeKey(row){
 return [row.leafTurn??'',row.leafPendingPlayer??'',row.leafActive??'',row.phase??'',row.pending??'',
  row.leafSource??'',row.leafProgress??'',row.leafOwnTurns??''].join('|');
}
function actionNote(action){
 return {type:action?.type||null,uid:action?.uid??null,line:action?.line||null,mode:action?.mode||null};
}
function wantsRoot(action,want){
 if(!want||want.type!==action?.type)return false;
 if(want.uid!=null&&want.uid!==action.uid)return false;
 if(want.line!=null&&want.line!==action.line)return false;
 if(want.mode!=null&&want.mode!==action.mode)return false;
 return true;
}
// Tests permute which root runs first. Production leaves the list as built.
function orderRoots(jobs,first,legal){
 const list=jobs.slice();
 if(!Array.isArray(first)||!first.length)return list;
 for(const want of [...first].reverse()){
  const found=list.find(action=>wantsRoot(action,want))||(legal||[]).find(action=>wantsRoot(action,want));
  if(!found)continue;
  const rest=list.filter(action=>!same(action,found));
  list.length=0;
  list.push(found,...rest);
 }
 return list;
}
// Every later root keeps a small share. Earlier roots may use up to 16,
// and the last root still starts. A flat 16 would skip the fourth root.
function coverShare(total,roots){
 return Math.max(4,Math.min(8,Math.floor(Math.max(0,total)/Math.max(1,roots))||4));
}
function rootSlice(poolLeft,jobsLeft,total,roots){
 const cover=coverShare(total,roots);
 const reserved=Math.max(0,jobsLeft-1)*cover;
 const room=Math.max(cover,poolLeft-reserved);
 return Math.max(1,Math.min(16,room,Math.max(0,poolLeft)));
}
function fallback(pack,state,legal,started,reason){
 report.fallback++;
 const actor=state?.pending?.player??state?.active??0;
 let ordered=legal;
 try{ordered=rankLegal(pack,state,actor,legal,null);}catch{ordered=legal;}
 const choice=reliableChoice(pack,state,actor,legal,null,ordered);
 const exact=legal.find(item=>same(item,choice))||legal[0]||null;
 const kind=reason==='no-world'||reason==='unmatched'||reason==='ismcts-empty'?reason:'exception';
 return finish(exact,'budget-fallback',{fallback:true,fallbackKind:kind,fallbackFrom:reason,nodesUsed:0,executed:false,settled:false},started);
}
export function chooseAiV3Action(pack,state,options={}){
 const started=performance.now();
 const now=typeof options.now==='function'?options.now:()=>performance.now();
 const clockStart=now();
 const timing={worldMs:0,rankMs:0,searchMs:0};
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
  const worldStarted=performance.now();
  const worlds=beliefWorlds(pack,state,actor,seed,worldsWanted);
  timing.worldMs=performance.now()-worldStarted;
  if(!worlds.length)return fallback(pack,state,legal,started,'no-world');
  const probe=worlds[0].state;
  const beam=options.beam??MATCH_LIMITS.beam;
  const combat=state.phase==='attack'||state.pending?.kind==='block'||state.pending?.kind==='effect-block-floor';
  const pinned=Number.isInteger(options.nodes);
  const total=pinned?options.nodes:(combat?64:48);
  const ms=Number.isFinite(options.ms)?options.ms:(pinned?1e9:(combat?64:48));
  const strategy=options.strategy==='score'||options.strategy==='order'||options.strategy==='reply'?options.strategy:null;
  const rankStarted=performance.now();
  const ordered=rankLegal(pack,probe,actor,legal,strategy);
  timing.rankMs=performance.now()-rankStarted;
  if(options.mode==='prior'){
   report.prior++;
   const exact=legal.find(item=>same(item,ordered[0]))||legal[0];
   return finish(exact,'prior',{actor,seed,worlds:worlds.length,nodesUsed:0,
    candidates:ordered.slice(0,beam).map(action=>({action}))},started);
  }
  const ranked=selectCandidates(pack,probe,actor,legal,beam,strategy);
  const deadline=Number.isFinite(ms)&&ms<=0?clockStart-1:clockStart+ms;
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
  // The old 16-node slice passed moves and front plays that the 48-node
  // baseline took, then the fallback copied that pass. Those nodes stay in
  // the tree. Passing hardNodes measures another split. A hard candidate is
  // not the 48-node baseline.
  const hardBudget=Number.isInteger(options.hardNodes)?Math.max(0,options.hardNodes):0;
  const hardSlice=Math.min(hardBudget,pool.n);
  const hardRemain=deadline-now();
  const hardMs=hardSlice>0?Math.max(0,Math.min(hardSlice,hardRemain)):0;
  const hardRaw=hardSlice>0&&hardMs>0?chooseStrengthenedHardAction(pack,state,{nodes:hardSlice,ms:hardMs,seed}):null;
  const hardSpent=Math.min(pool.n,hardAiReport().nodes||0);
  pool.n-=hardSpent;
  report.nodes+=hardSpent;
  const hardExact=legal.find(item=>same(item,hardRaw))||null;
  const jobs=[];
  const push=action=>{if(action&&!jobs.some(item=>same(item,action)))jobs.push(action);};
  push(hardExact);
  const safe=ranked.find(isSafeAction);
  push(safe);
  for(const action of ranked)push(action);
  const rootPlan=orderRoots(jobs,options.rootFirst,legal);
  jobs.length=0;
  jobs.push(...rootPlan);
  const actorDecisions=options.actorDecisions??MATCH_LIMITS.actorDecisions;
  // Each root first keeps a scripted continuation inside its share of the
  // budget. Nodes left after every root has had that share deepen the lines.
  const seats=Math.max(2,Math.min(jobs.length||2,4));
  const lineFloor=total<=48?16:Math.max(16,Math.min(160,Math.floor(total/seats)));
  const basicCap=coverShare(total,jobs.length);
  const plan=options.plan||'tree';
  const unexecuted=[];
  const unexplored=[];
  const held=[];
  const note=actionNote;
  const stopReason=()=>pool.n<=0?'nodes':now()>deadline?'time':'unscored';
  const scoreJob=(action,pass,cap)=>{
   let totalScore=0,n=0,turns=0,responses=0,decisions=0,nodes=0,hits=0,settled=0;
   let pending=null,phase=null,boundary=null,cut=null,sequence=null,sample=null,failReason=null;
   let followBranches=0,maxDepth=1;
   for(let w=0;w<worlds.length;w++){
    if(pool.n<=0){report.budget++;failReason=failReason||'nodes';break;}
    if(now()>deadline&&n){report.budget++;failReason=failReason||'time';break;}
    const slice=Math.min(pool.n,pass==='basic'?Math.max(1,cap||basicCap):lineFloor);
    const line=scoreLine(pack,worlds[w].state,actor,action,{
     nodes:slice,pool,beam,deadline,now,actorDecisions,opponentDecisions,plan,strategy,pass
    });
    if(line?.unexplored?.length)unexplored.push(...line.unexplored);
    if(!line||line.executed===false||!Number.isFinite(line.search)){
     const kind=line?.limit==='time'||line?.cut==='time'?'time':line?.limit==='nodes'||line?.cut==='nodes'?'nodes':stopReason();
     failReason=failReason||kind;
     continue;
    }
    totalScore+=line.search;
    n++;
    sample=line;
    turns+=line.opponentTurns||0;
    responses+=line.responses||0;
    decisions+=line.actorDecisions||0;
    nodes+=line.nodes||0;
    if(line.settled)settled++;
    pending=line.pending;
    phase=line.phase;
    boundary=line.boundary;
    cut=line.cut;
    followBranches+=line.followBranches||0;
    maxDepth=Math.max(maxDepth,line.maxDepth||1);
    sequence=line.sequence||sequence;
    hits+=line.transpositionHits||0;
    report.unsupported+=line.unsupported||0;
   }
   if(!n)return {failed:true,reason:failReason||stopReason(),action};
   report.nodes+=nodes;
   report.transpositionHits=(report.transpositionHits||0)+hits;
   return {action,search:totalScore/n,opponentTurns:turns,responses,actorDecisions:decisions,
    nodes,settled:settled===n,pending,phase,boundary,cut,followBranches,maxDepth,sequence,
    executed:true,refuted:!!sample.refuted,leafTurn:sample.leafTurn??null,
    leafActive:sample.leafActive??null,leafPendingPlayer:sample.leafPendingPlayer??null,
    leafSource:sample.leafSource??null,leafProgress:sample.leafProgress??'',
    leafOwnTurns:sample.leafOwnTurns??null};
  };
  const searchStarted=performance.now();
  let basicSpent=0,deepSpent=0;
  for(let index=0;index<jobs.length;index++){
   if((now()>deadline||pool.n<=0)&&held.length){
    const reason=stopReason();
    unexecuted.push(...jobs.slice(index).map(action=>({...note(action),action,executed:false,nodes:0,reason})));
    break;
   }
   if(pool.n<=0||now()>deadline){
    unexecuted.push({...note(jobs[index]),action:jobs[index],executed:false,nodes:0,reason:stopReason()});
    continue;
   }
   const row=scoreJob(jobs[index],'basic',rootSlice(pool.n,jobs.length-index,total,jobs.length));
   if(!row||row.failed)unexecuted.push({...note(jobs[index]),action:jobs[index],executed:false,nodes:0,reason:row?.reason||stopReason()});
   else{
    row.basicNodes=row.nodes;
    row.deepNodes=0;
    basicSpent+=row.nodes;
    report.basicNodes+=row.nodes;
    held.push(row);
   }
   if(typeof options.onRootDone==='function')options.onRootDone({index,action:jobs[index],executed:!!row&&!row.failed});
  }
  const deepen=[...held.keys()].sort((a,b)=>Number(isSafeAction(held[a].action))-Number(isSafeAction(held[b].action)));
  for(let cursor=0;cursor<deepen.length;cursor++){
   const index=deepen[cursor];
   if(pool.n<8||now()>deadline){
    unexplored.push(...deepen.slice(cursor).map(slot=>({...note(held[slot].action),deepen:false,reason:stopReason()})));
    break;
   }
   const deep=scoreJob(held[index].action,'deep');
   if(deep&&!deep.failed){
    const merged=mergeRows(held[index],deep);
    merged.basicNodes=held[index].basicNodes||0;
    merged.deepNodes=deep.nodes||0;
    merged.nodes=(merged.basicNodes||0)+(merged.deepNodes||0);
    deepSpent+=deep.nodes||0;
    report.deepNodes+=deep.nodes||0;
    held[index]=merged;
   }
  }
  timing.searchMs=performance.now()-searchStarted;
  const reasons={time:0,nodes:0,unscored:0};
  for(const row of unexecuted)reasons[row.reason]=(reasons[row.reason]||0)+1;
  const coverage={roots:jobs.length,executed:held.length,unexecuted:unexecuted.length,reasons,basicCap};
  const diagnosis={
   coverage,rootPlan:jobs.map(note),timing:{...timing,totalMs:performance.now()-started},
   softMs:ms,overSoft:now()>deadline,basicNodes:basicSpent,deepNodes:deepSpent
  };
  const scored=held;
  const viewed=scored.map(item=>({action:item.action,search:item.search,opponentTurns:item.opponentTurns,
   settled:item.settled,boundary:item.boundary,cut:item.cut,pending:item.pending,phase:item.phase,nodes:item.nodes,
   basicNodes:item.basicNodes||0,deepNodes:item.deepNodes||0,
   executed:item.executed!==false,refuted:!!item.refuted,leafTurn:item.leafTurn??null,
   leafActive:item.leafActive??null,leafPendingPlayer:item.leafPendingPlayer??null,
   leafSource:item.leafSource??null,leafProgress:item.leafProgress??'',
   leafOwnTurns:item.leafOwnTurns??null,
   followBranches:item.followBranches,maxDepth:item.maxDepth,sequence:item.sequence}));
  const followBranches=scored.reduce((sum,item)=>sum+(item.followBranches||0),0);
  const maxDepth=scored.reduce((sum,item)=>Math.max(sum,item.maxDepth||1),1);
  const backup=reliableChoice(pack,state,actor,legal,hardExact,ordered);
  const {rows:comparable,shared,contested}=comparedLines(scored);
  const missed=jobs.length>scored.length||scored.some(item=>!item.settled);
  const discardWindow=(state.pending?.kind||'').startsWith('effect-discard');
  const discardIncomplete=discardWindow&&legal.some(action=>action.type==='chooseDiscard'&&action.uid&&
   !comparable.some(item=>same(item.action,action)));
  // An idle line that got home does not beat a play whose combo was cut.
  // Lines that stopped together still compete, including a raid ahead of next.
  const idleOnly=comparable.length>0&&comparable.every(item=>isSafeAction(item.action));
  const constructiveCut=scored.some(item=>!isSafeAction(item.action)&&item.boundary!=='returned'&&item.boundary!=='terminal');
  const missedDevelopment=unexecuted.some(item=>{
   const action=item.action||item;
   return !!(action&&action.type&&!isSafeAction(action));
  });
  // A finished next is not a comparison of the plays that never ran.
  const choice=contested?(()=>{
   const doomed=scored.filter(row=>row.boundary==='terminal'&&row.search<=-90000);
   const safer=legal.filter(action=>!doomed.some(row=>same(row.action,action)));
   if(!safer.length)return backup;
   let orderedSafer=safer;
   try{orderedSafer=rankLegal(pack,state,actor,safer,strategy);}catch{orderedSafer=safer;}
   return reliableChoice(pack,state,actor,safer,null,orderedSafer);
  })():backup;
  if((!comparable.length||discardIncomplete||(idleOnly&&(constructiveCut||missedDevelopment)))&&choice){
   report.budgetFallback++;
   report.budget++;
   return finish(choice,'budget-fallback',{
    actor,seed,worlds:worlds.length,nodesUsed:report.nodes-nodesBefore,fallback:false,fallbackKind:'budget',
    incomplete:true,settled:false,
    hard:hardExact,hardNodes:hardSlice,strategy,compared:viewed,unscored:Math.max(0,jobs.length-scored.length),missed,
    plan,roots:jobs.length,followBranches,maxDepth,unexecuted,unexplored,...diagnosis,
    responses:scored.reduce((sum,item)=>sum+(item.responses||0),0),
    sequence:(scored.find(item=>item.sequence?.length)||{}).sequence||[]
   },started);
  }
  if(!scored.length){
   const backupOnly=reliableChoice(pack,state,actor,legal,hardExact,ordered);
   report.budgetFallback++;
   report.budget++;
   return finish(backupOnly,'budget-fallback',{
    actor,seed,worlds:worlds.length,nodesUsed:report.nodes-nodesBefore,fallback:false,fallbackKind:'budget',
    incomplete:true,executed:false,settled:false,
    hard:hardExact,hardNodes:hardSlice,strategy,compared:[],unexecuted,unexplored,
    plan,roots:jobs.length,...diagnosis
   },started);
  }
  const observation=actorObservation(pack,state,actor);
  const poolRows=comparable;
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
  if(row?.settled)report.settledChoices++;
  return finish(exact,now()>deadline?'budget':'search',{
   actor,seed,worlds:worlds.length,score:row?.search??null,bonus:blended.bonus,
   opponentTurns:row?.opponentTurns||0,responses:row?.responses||0,
   actorDecisions:row?.actorDecisions||0,nodesUsed:report.nodes-nodesBefore,fallback:false,fallbackKind:null,
   incomplete:!row?.settled,settled:!!row?.settled,hard:hardExact,hardNodes:hardSlice,strategy,compared:viewed,
   unscored:jobs.length-scored.length,
   unexecuted,unexplored,candidates:viewed,plan,roots:jobs.length,followBranches,maxDepth,sequence:row?.sequence||[],
   ...diagnosis
  },started);
 }catch(error){
  try{
   const legal=legalUniversalActions(pack,state);
   return fallback(pack,state,legal,started,error?.message||'exception');
  }catch{return finish(null,'exception',{fallback:true},started);}
 }
}
