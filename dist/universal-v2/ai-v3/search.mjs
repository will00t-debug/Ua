// Playable ai-v3 entry. The live state is read only to list legal actions
// and to build a belief world. Search dispatches that world, then the
// chosen action is matched back onto the live legal list.
import {legalUniversalActions} from '../engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,hardAiReport,HARD_AI_POLICY} from '../hard-ai.mjs';
import {actorObservation} from './observation.mjs';
import {beliefWorlds} from './belief.mjs';
import {selectCandidates,scoreLine,same,rankLegal,isSafeAction} from './beam.mjs';
import {moveDevelopment,bindProbeBudget,bindMeter,bindVariant,cachedMoveDevelopment,situationalBackup,preferEnergyGenerator,preferConfirmedChoices,confirmedChoiceTrace,evidencedChoice,frontEvidenceChoice,mainFrontEvidenceChoice,generatorEvidenceChoice,laterEnergyCandidates,searchFactors,setFrontCoverage,normalizeFactors,factorsForVariant} from './strategy.mjs';
import {keepScore,battleWindowAction,scaledOutsideAction} from './eval.mjs';
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
  rootPlanned:0,rootExecuted:0,followBranches:0,maxDepth:0,responses:0};
}
let report=emptyReport();
let lastTrace=null;
export function resetAiV3Report(){report=emptyReport();lastTrace=null;}
export function aiV3Report(){return {...report,samples:report.samples.slice()};}
export function lastAiV3Trace(){return lastTrace?{...lastTrace,candidates:lastTrace.candidates?.map(row=>({...row}))}:null;}
function gatePreference(pack,state,actor,previous,preferred,rows){
 const gate=searchFactors().gate;
 if(gate==='final')return evidencedChoice(previous,preferred,rows);
 if(gate==='main-front')return mainFrontEvidenceChoice(pack,state,actor,previous,preferred,rows);
 return preferred;
}
function gateFrontEnergy(state,actor,previous,placed,rows){
 if(searchFactors().gate!=='energy')return placed;
 return frontEvidenceChoice(state,actor,previous,placed,rows);
}
function stageOf(rows,action){
 const row=tracedRow(rows,action);
 return {
  type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null,
  boundary:row?.boundary??null,search:Number.isFinite(row?.search)?row.search:null,
  executed:!!row
 };
}
function preferenceStages(rows,steps){
 return steps.map(([stage,action])=>({stage,...stageOf(rows,action)}));
}

function finish(action,reason,extra,started){
 const ms=performance.now()-started;
 report.ms+=ms;
 report.maxMs=Math.max(report.maxMs,ms);
 if(report.samples.length<4000)report.samples.push(Math.round(ms*10)/10);
 lastTrace={policy:AI_V3_POLICY,baseline:AI_V3_BASELINE,reason,ms,action:action?.type||null,...extra,factors:searchFactors()};
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
 if(kind.startsWith('effect-discard')||kind==='end-hand-limit'){
  const discards=legal.filter(action=>action.uid&&(action.type==='chooseDiscard'||action.type==='chooseDiscardGate'||action.type==='chooseHandLimit'));
  if(discards.length)return ranked(discards)[0];
 }
 if(kind==='effect-recover-ap')return legal.find(action=>action.uid)||hardExact||legal[0];
 if(kind==='effect-recover-outside'||kind==='effect-buff-own'){
  const picks=legal.filter(action=>action.uid);
  if(picks.length)return ranked(picks)[picks.length-1];
 }
 if(kind==='effect-optional-mill')return legal.find(action=>action.mode==='mill')||hardExact||legal[0];
 const picked=hardExact||ordered[0]||legal[0];
 if(hardExact)return hardExact;
 return situationalBackup(pack,state,actor,legal,picked)||picked;
}
const BOUNDARY_RANK={terminal:5,returned:4,yielded:3,pending:2,open:1};
// A finished game outranks a returned turn. When nothing got home, lines
// that stopped on the same boundary still compete. A pass that got further
// than a cut play does not win that comparison by itself.
function battleHorizon(scored){
 const marked=scored.filter(row=>row&&Number.isFinite(row.battleScore));
 if(marked.length!==scored.length||marked.length<2)return null;
 if(scored.some(row=>row.boundary==='terminal'&&Math.abs(row.search)>=90000))return null;
 return {rows:marked.map(row=>({...row,search:row.battleScore,horizon:'battle'})),
  shared:true,contested:false,unresolved:scored.filter(row=>row.damageOpen).length,horizon:'battle'};
}
export function comparedLines(scored){
 // A block choice carries the public result of that one attack. Lines that
 // got home and lines still on the life window compare that result. The
 // stored boundary stays what the search actually reached. A row with no
 // battle score is unchanged: an unchosen life is still not a finished line.
 const battle=battleHorizon(scored);
 if(battle)return battle;
 // A line still waiting to choose LIFE has not scored the attack. Its static
 // number stays out of the comparison, but it still blocks a finished loss.
 const unresolved=scored.filter(row=>row&&row.damageOpen).length;
 const closed=scored.filter(row=>row&&!row.damageOpen);
 const terminals=closed.filter(item=>item.boundary==='terminal');
 const wins=terminals.filter(item=>item.search>0);
 if(wins.length)return {rows:wins,shared:false,contested:false,unresolved};
 const returned=closed.filter(item=>item.boundary==='returned');
 if(returned.length)return {rows:returned,shared:false,contested:false,unresolved};
 const losses=terminals.filter(item=>item.search<=-90000);
 // A finished loss is known. It does not erase an alternative that has not
 // been resolved, and that alternative's unfinished score is not a choice.
 if(losses.length&&(closed.some(item=>item.boundary!=='terminal')||unresolved))return {rows:[],shared:false,contested:true,unresolved};
 if(terminals.length)return {rows:terminals,shared:false,contested:false,unresolved};
 if(!closed.length)return {rows:[],shared:false,contested:false,unresolved};
 let best=0;
 for(const row of closed)best=Math.max(best,BOUNDARY_RANK[row.boundary]||0);
 if(!best)return {rows:[],shared:false,contested:false,unresolved};
 const rows=closed.filter(row=>(BOUNDARY_RANK[row.boundary]||0)===best);
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
   const idle=list=>list.every(rowIdle);
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
 if(!chosen.length)return {rows:[],shared:false,contested:false,unresolved};
 const idleOnly=chosen.every(rowIdle);
 const behind=closed.some(row=>!rowIdle(row)&&!chosen.includes(row));
 if(idleOnly&&behind)return {rows:[],shared:false,contested:false,unresolved};
 return {rows:chosen,shared:true,contested:false,unresolved};
}
function rowIdle(row){
 if(row?.develops===false)return true;
 if(row?.develops===true)return false;
 return isSafeAction(row?.action||{});
}
// Passing is not the only non-development action. Moving the last energy a
// high-cost hand still needs does not count as a line the backup should chase.
function actionDevelops(pack,state,actor,action){
 if(!action||isSafeAction(action))return false;
 if(action.type==='move'&&moveDevelopment(pack,state,actor,action)?.strip)return false;
 return true;
}
function keptEnergy(pack,state,actor,legal,choice,row,strategy){
 if(choice?.type!=='move')return choice;
 if(row?.boundary==='terminal'&&row.search>=90000)return choice;
 if(!moveDevelopment(pack,state,actor,choice)?.strip)return choice;
 const rest=legal.filter(action=>action.type!=='move'||!moveDevelopment(pack,state,actor,action)?.strip);
 if(!rest.length)return choice;
 let ordered=rest;
 try{ordered=rankLegal(pack,state,actor,rest,strategy);}catch{ordered=rest;}
 const replacement=reliableChoice(pack,state,actor,rest,null,ordered);
 return legal.find(item=>same(item,replacement))||choice;
}
function tracedRow(scored,action){
 if(!action)return null;
 return (scored||[]).find(item=>item?.executed!==false&&same(item.action,action))||null;
}
function finishedSurvival(row){
 if(!row||row.executed===false||!Number.isFinite(row.search))return false;
 if(row.boundary==='terminal'&&row.search<=-90000)return false;
 return row.boundary==='returned'||row.boundary==='terminal';
}
function immediateLoss(row){
 return !!row&&row.executed!==false&&row.boundary==='terminal'&&Number.isFinite(row.search)&&row.search<=-90000;
}
function finishedLine(row){
 return !!row&&row.executed!==false&&(row.boundary==='returned'||row.boundary==='terminal');
}
// Mandatory discards only. An optional gate still has a legal skip, and a
// finished skip is not rewritten into a discard.
function mandatoryDiscardKind(kind){
 return kind==='effect-discard'||kind==='end-hand-limit';
}
// The search already walked this line home, or finished a game that is not
// an immediate loss. A later preference can still break a tie. It cannot
// trade that line for an action the same comparison already finished as a
// loss. A yielded number is not finished, and a root that never ran is not
// a loss. The check only reads rows the search already paid for.
function holdSurvival(choice,replacement,rows){
 if(!choice||!replacement||same(choice,replacement))return replacement;
 const mine=tracedRow(rows,choice);
 const alt=tracedRow(rows,replacement);
 if(finishedSurvival(mine)&&immediateLoss(alt))return choice;
 return replacement;
}
// Draw, get and active resolve without putting a card back into LIFE.
// FINAL can, and SPECIAL or a COLOR/RAID onPlay is an effect this comparison
// has not finished, so those triggers stay on the original ranking.
const NONSAVING_LIFE_TRIGGER=new Set(['draw','get','active']);
function unsettledLifeZero(row){
 if(!row||row.executed===false||row.boundary!=='terminal')return false;
 if(!(row.search<=-90000&&row.search>-100000))return false;
 return (row.stopPending||row.pending)==='life-trigger';
}
// Opt-in. A block search that already reached the opponent's turn survived
// this attack and then lost later. That later loss is not a win. It only
// replaces an unsettled life-zero whose trigger cannot restore LIFE. A block
// that also stops on this attack, including Impact that still takes the last
// life, is not in the set. Proven wins are applied after this returns.
export function preferLivedBlock(state,choice,rows){
 if(searchFactors().settleLife!==true||state?.pending?.kind!=='block'||!choice)return choice;
 const mine=tracedRow(rows,choice);
 if(!mine||!unsettledLifeZero(mine)||!NONSAVING_LIFE_TRIGGER.has(mine.leafTrigger))return choice;
 const lived=(rows||[]).filter(row=>row?.executed!==false&&row.action?.type==='chooseBlock'&&row.action.uid
  &&row.boundary==='terminal'&&row.search<=-100000&&(row.opponentTurns||0)>0);
 if(!lived.length)return choice;
 lived.sort((a,b)=>{
  const delta=(b.battleScore??-Infinity)-(a.battleScore??-Infinity);
  if(delta)return delta;
  return JSON.stringify(a.action)<JSON.stringify(b.action)?-1:1;
 });
 return lived[0].action;
}
// One gate for every preference and backup. A confirmed win is a line this
// search executed, that is still legal, and that ended as a win. Pending,
// yielded, and a high score that did not finish are not in the set. When
// the set is not empty, the action that leaves this function is one of it.
function constrainConfirmedWin(kept,winRows,legal){
 if(!winRows?.length)return kept;
 if(winRows.some(row=>same(row.action,kept)))return kept;
 const winner=winRows.reduce((best,row)=>row.search>best.search?row:best);
 return legal.find(action=>same(action,winner.action))||kept;
}
// Equal discard scores have not chosen a card. The backup is the same
// keep-order used when the search does not finish, and it does not dispatch.
function discardTie(pack,state,actor,rows,blended){
 const kind=state.pending?.kind||'';
 if(!blended||!(kind.startsWith('effect-discard')||kind==='end-hand-limit')||!Number.isFinite(blended.search))return blended;
 const best=Math.max(...rows.map(row=>Number.isFinite(row?.search)?row.search:-Infinity));
 if(!(Math.abs(blended.search-best)<=1e-6))return blended;
 const tied=rows.filter(row=>{
  const action=row?.action;
  if(!action?.uid||!Number.isFinite(row.search)||Math.abs(row.search-best)>1e-6)return false;
  return action.type==='chooseDiscard'||action.type==='chooseDiscardGate'||action.type==='chooseHandLimit';
 });
 if(tied.length<2)return blended;
 tied.sort((a,b)=>{
  const delta=keepScore(pack,state,actor,cardOf(state,actor,a.action.uid))-
   keepScore(pack,state,actor,cardOf(state,actor,b.action.uid));
  if(delta)return delta;
  return JSON.stringify(a.action)<JSON.stringify(b.action)?-1:1;
 });
 return tied[0].bonus==null?{...tied[0],bonus:blended.bonus||0}:tied[0];
}
// A follow-up attack that finishes level with passing is the rest of a wave
// that already started. A tied pass is the lone-swing hold, and it does not
// apply once this turn has attacked. A worse finished attack stays behind.
function continueStartedWave(state,rows,blended){
 if((state?.attacksThisTurn||0)<=0||!blended||blended.action?.type==='attack')return blended;
 const swings=(rows||[]).filter(row=>row?.action?.type==='attack'&&row.executed!==false&&
  Number.isFinite(row.search)&&(row.boundary==='returned'||row.boundary==='terminal'));
 if(!swings.length)return blended;
 const best=swings.reduce((left,right)=>right.search>left.search?right:left);
 if(best.search+1e-9<blended.search)return blended;
 return best;
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
 let kept;
 if(deep.refuted&&ourPlan(basic)===ourPlan(deep)&&deep.search<basic.search)kept=deep;
 else if(doneLine(basic)&&!doneLine(deep))kept=basic;
 else if(doneLine(deep)&&!doneLine(basic))kept=deep;
 else if(deep.search!==basic.search)kept=deep.search>basic.search?deep:basic;
 // The same score from a deeper pass is the line that actually compared
 // the later choice. A tie otherwise keeps the script.
 else kept=(deep.maxDepth||1)>(basic.maxDepth||1)?deep:basic;
 if(kept&&!(kept.followSeen||[]).length&&(basic.followSeen||[]).length){
  kept={...kept,followSeen:basic.followSeen};
 }
 return kept;
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
 if(want.baseUid!=null&&want.baseUid!==action.baseUid)return false;
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
// Nodes reserved for a later root are useless if this root uses the whole
// clock. This root may spend the same fraction of the time still left as
// its node slice is of the nodes still reserved. A root that finishes
// early leaves the remainder. One clock sample is used for both the
// remainder and the child deadline, and the child is never later than the
// total deadline. A second sample can already be past the total, and adding
// the earlier remainder to that later sample would extend the search.
function shareDeadline(now,deadline,mine,laterNodes){
 if(!(laterNodes>0)||!(mine>0)||typeof now!=='function'||!Number.isFinite(deadline))return deadline;
 const current=now();
 if(!Number.isFinite(current)||!(current<deadline))return deadline;
 const share=current+(deadline-current)*(mine/(mine+laterNodes));
 return share<deadline?share:deadline;
}
// A block root is searched before passing. A clock that dies after that
// root has not compared the attack. The public ledger is the same BP,
// Impact and Impact-null result the finished window already uses. It
// applies only while a legal block action is still unscored. A window
// whose every action was scored keeps that comparison. The sealed worker
// leaves this switch off, so an attack clock is not sent through it.
function publicBlockChoice(pack,state,actor,legal,scored){
 if(searchFactors().publicBlock!==true||state?.pending?.kind!=='block')return null;
 const covered=action=>scored.some(row=>row&&row.executed!==false&&same(row.action,action));
 if(!legal.some(action=>action?.type==='chooseBlock'&&!covered(action)))return null;
 let ledger=null;
 try{ledger=battleWindowAction(pack,state,actor);}catch{return null;}
 return legal.find(item=>same(item,ledger))||null;
}
function fallback(pack,state,legal,started,reason,account=null){
 report.fallback++;
 const actor=state?.pending?.player??state?.active??0;
 let ordered=legal;
 try{ordered=rankLegal(pack,state,actor,legal,null);}catch{ordered=legal;}
 const choice=reliableChoice(pack,state,actor,legal,null,ordered);
 const exact=legal.find(item=>same(item,choice))||legal[0]||null;
 const kind=reason==='no-world'||reason==='unmatched'||reason==='ismcts-empty'?reason:'exception';
 const nodesUsed=account?account():0;
 return finish(exact,'budget-fallback',{fallback:true,fallbackKind:kind,fallbackFrom:reason,nodesUsed,executed:false,settled:false},started);
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
  if(options.factors?.scaleOutside===true){
   const scaled=bindVariant(null,()=>scaledOutsideAction(pack,state,actor),options.factors);
   if(scaled){
    const exact=legal.find(item=>same(item,scaled));
    if(exact)return bindVariant(null,()=>finish(exact,'scale-outside',{
     actor,fallback:false,nodesUsed:0,scaleOutside:true
    },started),options.factors);
   }
  }
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
  const deadline=Number.isFinite(ms)&&ms<=0?clockStart-1:clockStart+ms;
  const pool={n:total};
  const nodesBefore=report.nodes;
  const budget={pool,deadline,now,legalCache:new WeakMap()};
  const settle=()=>{report.nodes=nodesBefore+(total-pool.n);};
  const spent=()=>report.nodes-nodesBefore;
  const diagnose=options.diagnose!==false;
  // A, B, A+B and ab-front stay opt-in. This file is loaded by the browser,
  // which has no process global, so the entry reads only options.variant
  // and an explicit options.factors object. A missing or unknown value is
  // the default search. Tests and the benchmark read their environment and
  // pass the value in. Explicit factors separate coverage scope, raid-base
  // retention and the evidence-gate position. They replace a named variant
  // for that call. ab-front keeps A's front slot at the root only, retains
  // a raid base, and gates only the energy-generator rewrite of a searched
  // main-phase front.
  const asked=options.variant;
  const explicit=normalizeFactors(options.factors);
  const variant=explicit?null:(asked==='a'||asked==='b'||asked==='ab'||asked==='ab-front'?asked:null);
  const factors=explicit||factorsForVariant(variant);
  return bindMeter(options.meter,()=>bindProbeBudget(budget,()=>bindVariant(variant,()=>{
  try{
  const rankStarted=performance.now();
  const ordered=rankLegal(pack,probe,actor,legal,strategy);
  timing.rankMs=performance.now()-rankStarted;
  if(options.mode==='prior'){
   report.prior++;
   const exact=legal.find(item=>same(item,ordered[0]))||legal[0];
   settle();
   return finish(exact,'prior',{actor,seed,worlds:worlds.length,nodesUsed:spent(),
    candidates:ordered.slice(0,beam).map(action=>({action}))},started);
  }
  const ranked=selectCandidates(pack,probe,actor,legal,beam,strategy);
  if(factors.coverage==='root')setFrontCoverage(false);
  if(options.mode==='ismcts'){
   report.ismcts++;
   const picked=chooseIsmctsAction(pack,worlds,actor,legal,{
    nodes:pool.n,pool,beam:1,seed,
    actorDecisions:options.actorDecisions??3,
    opponentDecisions:options.opponent===false?0:(options.opponentDecisions??3),
    deadline
   });
   const exact=legal.find(item=>same(item,picked?.action));
   if(!exact)return fallback(pack,state,legal,started,'ismcts-empty',()=>{settle();return spent();});
   settle();
   return finish(exact,'ismcts',{actor,seed,worlds:worlds.length,visits:picked.visits,
    nodesUsed:spent(),fallback:false},started);
  }
  const opponentDecisions=options.opponent===false?0:(options.opponentDecisions??MATCH_LIMITS.opponentDecisions);
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
  const hardExact=legal.find(item=>same(item,hardRaw))||null;
  const jobs=[];
  const push=action=>{if(action&&!jobs.some(item=>same(item,action)))jobs.push(action);};
  push(hardExact);
  // A settled pass used to run before any play. On a 40ms clock that pass
  // spends the deadline, and the energy play that would have returned inside
  // the same node slice never starts. Search the developing roots first.
  // The pass still runs when any clock remains, and a cut play does not beat
  // a pass that actually got home.
  const safe=ranked.find(isSafeAction);
  for(const action of ranked)if(!isSafeAction(action))push(action);
  push(safe);
  const rootPlan=orderRoots(jobs,options.rootFirst,legal);
  jobs.length=0;
  jobs.push(...rootPlan);
  const actorDecisions=options.actorDecisions??MATCH_LIMITS.actorDecisions;
  // alignRoots is a separate opt-in. The first look gives every root the
  // same share of this pool, so a later boundary is not an accident of who
  // was searched longer. Block and discard choices keep the normal slices.
  const alignKind=state.pending?.kind||'';
  const alignOn=searchFactors().alignRoots===true&&jobs.length>=2
   &&state.phase!=='attack'&&alignKind!=='block'&&alignKind!=='effect-block-floor'
   &&!mandatoryDiscardKind(alignKind);
  const equalCap=alignOn?coverShare(total,jobs.length):0;
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
  const scoreJob=(action,pass,cap,lineDeadline)=>{
   let totalScore=0,n=0,turns=0,responses=0,decisions=0,nodes=0,hits=0,settled=0;
   let pending=null,phase=null,boundary=null,cut=null,sequence=null,sample=null,failReason=null;
   let followBranches=0,maxDepth=1,lastLine=null,lastSlice=0;
   for(let w=0;w<worlds.length;w++){
    if(pool.n<=0){report.budget++;failReason=failReason||'nodes';break;}
    // The share above used an earlier sample. Re-read before this world, and
    // do not start it when the total deadline is already past.
    if(now()>deadline){report.budget++;failReason=failReason||'time';break;}
    const slice=Math.min(pool.n,pass==='basic'?Math.max(1,cap||basicCap):lineFloor);
    const requested=Number.isFinite(lineDeadline)?lineDeadline:deadline;
    const line=scoreLine(pack,worlds[w].state,actor,action,{
     nodes:slice,pool,beam,deadline:requested<deadline?requested:deadline,
     parentDeadline:deadline,now,actorDecisions,opponentDecisions,plan,strategy,pass,
     legalCache:budget.legalCache,profile:options.profile||null
    });
    lastLine=line||lastLine;
    lastSlice=slice;
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
   if(!n){
    // A caller that asks for a profile can see why a root spent its slice
    // and still produced no finite score. The decision itself is unchanged.
    if(Array.isArray(options.profile?.dropped)){
     const kinds={};
     for(const step of lastLine?.sequence||[])kinds[step.kind||'none']=(kinds[step.kind||'none']||0)+1;
     options.profile.dropped.push({
      type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null,
      slice:lastSlice,executed:lastLine?.executed===true,search:Number.isFinite(lastLine?.search)?lastLine.search:null,
      nodes:lastLine?.nodes||0,boundary:lastLine?.boundary||null,cut:lastLine?.cut||null,limit:lastLine?.limit||null,
      stopReason:lastLine?.stopReason||null,stopPending:lastLine?.stopPending||null,stopPlayer:lastLine?.stopPlayer??null,
      pending:lastLine?.pending||null,phase:lastLine?.phase||null,
      responses:lastLine?.responses||0,actorDecisions:lastLine?.actorDecisions||0,
      opponentTurns:lastLine?.opponentTurns||0,orderSteps:lastLine?.orderSteps||0,
      followBranches:lastLine?.followBranches||0,maxDepth:lastLine?.maxDepth||1,
      kinds,reason:failReason||stopReason()
     });
    }
    return {failed:true,reason:failReason||stopReason(),action};
   }
   report.transpositionHits=(report.transpositionHits||0)+hits;
   return {action,search:totalScore/n,opponentTurns:turns,responses,actorDecisions:decisions,
    nodes,settled:settled===n,pending,phase,boundary,cut,followBranches,maxDepth,sequence,
    executed:true,refuted:!!sample.refuted,leafTurn:sample.leafTurn??null,
    leafActive:sample.leafActive??null,leafPendingPlayer:sample.leafPendingPlayer??null,
    leafSource:sample.leafSource??null,leafProgress:sample.leafProgress??'',
    leafOwnTurns:sample.leafOwnTurns??null,
   damageOpen:!!sample.damageOpen,stopPending:sample.stopPending??null,
   stopPlayer:sample.stopPlayer??null,stopReason:sample.stopReason??null,
   leafTrigger:sample.leafTrigger||null,
   battleScore:Number.isFinite(sample.battleScore)?sample.battleScore:null,
   swing:sample.swing||0,stranded:sample.stranded||0,
   followSeen:sample.followSeen||[],unexplored:sample.unexplored||[]};
  };
  // The late front gate only compares lines that stopped together. Spend the
  // nodes still in this same pool to bring the shorter line up to the longer
  // one's boundary. A line that runs past that boundary, or a pool that is
  // already empty, leaves the rows as they are.
  function alignMainFront(previous,choice,rows){
   if(searchFactors().gate!=='main-front'||!(pool.n>0)||now()>deadline)return rows;
   const key=action=>JSON.stringify(action);
   const found=action=>(rows||[]).find(row=>row?.executed!==false&&key(row.action)===key(action));
   const before=found(previous),after=found(choice);
   if(!before||!after||before.boundary===after.boundary)return rows;
   if(!Number.isFinite(before.search)||!Number.isFinite(after.search))return rows;
   if((before.boundary==='terminal'&&before.search>=90000)||(after.boundary==='terminal'&&after.search>=90000))return rows;
   const beforeRank=BOUNDARY_RANK[before.boundary]||0;
   const afterRank=BOUNDARY_RANK[after.boundary]||0;
   if(!beforeRank||!afterRank||beforeRank===afterRank)return rows;
   const low=beforeRank<afterRank?previous:choice;
   const target=Math.max(beforeRank,afterRank);
   const extended=scoreJob(low,'deep');
   if(!extended||extended.failed||(BOUNDARY_RANK[extended.boundary]||0)!==target)return rows;
   return rows.map(row=>key(row.action)===key(low)?{...extended,action:row.action,executed:true}:row);
  }
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
   const room=rootSlice(pool.n,jobs.length-index,total,jobs.length);
   const cap=equalCap?Math.min(room,equalCap):room;
   const laterNodes=Math.max(0,jobs.length-index-1)*coverShare(total,jobs.length);
   const sliceDeadline=shareDeadline(now,deadline,cap,laterNodes);
   if(options.profile)options.profile.roots.push({
    index,type:jobs[index].type,line:jobs[index].line||null,uid:jobs[index].uid??null,
    startMs:now()-clockStart,sliceMs:Number.isFinite(sliceDeadline)?sliceDeadline-clockStart:null,
    totalMs:deadline-clockStart,cap,laterNodes,nodesBefore:total-pool.n
   });
   const row=scoreJob(jobs[index],'basic',cap,sliceDeadline);
   if(options.profile){
    const root=options.profile.roots[options.profile.roots.length-1];
    root.endMs=now()-clockStart;root.nodesAfter=total-pool.n;root.executed=!!row&&!row.failed;
   }
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
  report.rootPlanned+=jobs.length;
  report.rootExecuted+=held.length;
  const rowRank=row=>BOUNDARY_RANK[row.boundary]||0;
  const cutDevelopment=row=>row&&row.executed!==false&&row.cut==='nodes'&&actionDevelops(pack,state,actor,row.action);
  const provenRow=row=>row?.boundary==='terminal'&&row.search>=90000;
  // A developing root that stopped early is searched again, once, with a
  // wider slice of the nodes still in this pool. The new walk replaces the
  // short one only when it catches the boundary the others already reached,
  // or it is a proven win. Jumping past that boundary is not a comparison.
  function extendBehind(){
   if(!alignOn)return;
   const stuck=new Set();
   let guard=held.length*2;
   while(pool.n>=8&&now()<=deadline&&guard-->0){
    const best=held.reduce((rank,row)=>Math.max(rank,rowRank(row)),0);
    const behind=held.filter(row=>cutDevelopment(row)&&rowRank(row)<best&&!stuck.has(row));
    if(!behind.length)break;
    behind.sort((a,b)=>rowRank(a)-rowRank(b));
    const row=behind[0];
    const index=held.indexOf(row);
    const before=pool.n;
    const previous=rowRank(row);
    const extended=scoreJob(row.action,'basic',Math.min(pool.n,24));
    deepSpent+=extended?.nodes||0;
    report.deepNodes+=extended?.nodes||0;
    if(!extended||extended.failed||pool.n>=before){stuck.add(row);continue;}
    const next=rowRank(extended);
    const win=provenRow(extended);
    if(win||(next>previous&&next<=best)){
     extended.action=row.action;
     extended.basicNodes=row.basicNodes||0;
     extended.deepNodes=(row.deepNodes||0)+(extended.nodes||0);
     extended.nodes=(extended.basicNodes||0)+(extended.deepNodes||0);
     extended.executed=true;
     held[index]=extended;
    }
    if(rowRank(held[index])<=previous)stuck.add(held[index]);
   }
  }
  function generatorStep(previous,rows){
   const raw=preferEnergyGenerator(pack,state,actor,previous,rows);
   const gated=searchFactors().evidenceGenerator===true?generatorEvidenceChoice(previous,raw,rows):raw;
   return {raw,gated};
  }
  function generatorStages(step){
   const stages=[['generator',step.raw]];
   if(searchFactors().evidenceGenerator===true)stages.push(['generator-evidence',step.gated]);
   return stages;
  }
  extendBehind();
  const deferDeep=action=>isSafeAction(action)||!!moveDevelopment(pack,state,actor,action)?.strip;
  const deepen=[...held.keys()].sort((a,b)=>Number(deferDeep(held[a].action))-Number(deferDeep(held[b].action)));
  for(let cursor=0;cursor<deepen.length;cursor++){
   const index=deepen[cursor];
   if(pool.n<8||now()>deadline){
    unexplored.push(...deepen.slice(cursor).map(slot=>({...note(held[slot].action),deepen:false,reason:stopReason()})));
    break;
   }
   const deep=scoreJob(held[index].action,'deep');
   if(deep&&!deep.failed){
    // A longer walk that leaves the shared boundary is not a better score.
    // A proven win is kept. The nodes are already spent either way.
    if(alignOn){
     const win=provenRow(deep);
     const same=deep.boundary===held[index].boundary&&deep.search>held[index].search;
     deepSpent+=deep.nodes||0;
     report.deepNodes+=deep.nodes||0;
     if(!win&&!same)continue;
    }
    const merged=mergeRows(held[index],deep);
    merged.basicNodes=held[index].basicNodes||0;
    merged.deepNodes=(held[index].deepNodes||0)+(deep.nodes||0);
    merged.nodes=(merged.basicNodes||0)+(merged.deepNodes||0);
    if(!alignOn){
     deepSpent+=deep.nodes||0;
     report.deepNodes+=deep.nodes||0;
    }
    held[index]=merged;
   }
  }
  // One root got home and a developing root is still cut. Their scores are
  // not a ranking. The legal backup stays; the short line is not a loss.
  const alignRefused=alignOn&&!held.some(provenRow)&&held.some(row=>row.boundary==='returned'||row.boundary==='terminal')
   &&held.some(row=>cutDevelopment(row)&&rowRank(row)<Math.max(...held.filter(item=>item.boundary==='returned'||item.boundary==='terminal').map(rowRank)));
  const alignNote=alignOn?{equalCap,refused:!!alignRefused}:null;
  timing.searchMs=performance.now()-searchStarted;
  const reasons={time:0,nodes:0,unscored:0};
  for(const row of unexecuted)reasons[row.reason]=(reasons[row.reason]||0)+1;
  const coverage={roots:jobs.length,executed:held.length,unexecuted:unexecuted.length,reasons,basicCap};
  const diagnosis={
   coverage,rootPlan:jobs.map(note),timing:{...timing,totalMs:performance.now()-started},
   softMs:ms,overSoft:now()>deadline,basicNodes:basicSpent,deepNodes:deepSpent
  };
  for(const row of held)row.develops=actionDevelops(pack,state,actor,row.action);
  for(const row of unexecuted)row.develops=actionDevelops(pack,state,actor,row.action);
  const scored=held;
  const viewed=scored.map(item=>({action:item.action,search:item.search,opponentTurns:item.opponentTurns,
   settled:item.settled,boundary:item.boundary,cut:item.cut,pending:item.pending,phase:item.phase,nodes:item.nodes,
   basicNodes:item.basicNodes||0,deepNodes:item.deepNodes||0,
   executed:item.executed!==false,refuted:!!item.refuted,leafTurn:item.leafTurn??null,
   leafActive:item.leafActive??null,leafPendingPlayer:item.leafPendingPlayer??null,
   leafSource:item.leafSource??null,leafProgress:item.leafProgress??'',
   leafOwnTurns:item.leafOwnTurns??null,
   damageOpen:!!item.damageOpen,stopPending:item.stopPending??null,
   stopPlayer:item.stopPlayer??null,stopReason:item.stopReason??null,
   leafTrigger:item.leafTrigger||null,
   battleScore:Number.isFinite(item.battleScore)?item.battleScore:null,
   swing:item.swing||0,stranded:item.stranded||0,
   followSeen:item.followSeen||[],unexplored:item.unexplored||[],
   followBranches:item.followBranches,maxDepth:item.maxDepth,sequence:item.sequence}));
  const followBranches=scored.reduce((sum,item)=>sum+(item.followBranches||0),0);
  const maxDepth=scored.reduce((sum,item)=>Math.max(sum,item.maxDepth||1),1);
  const backup=reliableChoice(pack,state,actor,legal,hardExact,ordered);
  const {rows:comparable,shared,contested}=comparedLines(scored);
  const missed=jobs.length>scored.length||scored.some(item=>!item.settled);
  const pendingKind=state.pending?.kind||'';
  const discardWindow=pendingKind.startsWith('effect-discard');
  const discardIncomplete=discardWindow&&legal.some(action=>action.type==='chooseDiscard'&&action.uid&&
   !comparable.some(item=>same(item.action,action)));
  const mandatoryRows=scored.filter(row=>row.executed!==false&&row.action?.uid&&(
   (pendingKind==='end-hand-limit'&&row.action.type==='chooseHandLimit')||
   (pendingKind==='effect-discard'&&row.action.type==='chooseDiscard')));
  // A large pending or yielded number is not a win. Only a line this search
  // already ran, that is still legal, and that finished as a win counts.
  const winRows=scored.filter(row=>row.executed!==false&&row.boundary==='terminal'&&row.search>=90000&&
   legal.some(action=>same(action,row.action)));
  const provenWin=winRows.length>0;
  // Yielded against pending is how far the script walked, not which card is
  // worse to keep. Until every searched mandatory discard is home together,
  // and none of them has already won, the keep-order is the choice. A
  // finished set of lines still compares, so a higher keep card can win on
  // evidence.
  const discardOpen=mandatoryDiscardKind(pendingKind)&&!provenWin&&
   mandatoryRows.some(row=>!finishedLine(row));
  // An idle line that got home does not beat a play whose combo was cut.
  // Spending the last needed energy is not that combo. Lines that stopped
  // together still compete, including a raid ahead of next.
  const develops=item=>item?.develops!=null?!!item.develops:actionDevelops(pack,state,actor,item?.action||item);
  const idleOnly=comparable.length>0&&comparable.every(item=>!develops(item));
  const constructiveCut=scored.some(item=>develops(item)&&item.boundary!=='returned'&&item.boundary!=='terminal');
  const missedDevelopment=unexecuted.some(item=>develops(item));
  // A finished next is not a comparison of the plays that never ran.
  const choice=contested?(()=>{
   const doomed=scored.filter(row=>row.boundary==='terminal'&&row.search<=-90000);
   const safer=legal.filter(action=>!doomed.some(row=>same(row.action,action)));
   if(!safer.length)return backup;
   let orderedSafer=safer;
   try{orderedSafer=rankLegal(pack,state,actor,safer,strategy);}catch{orderedSafer=safer;}
   return reliableChoice(pack,state,actor,safer,null,orderedSafer);
  })():backup;
  const energySample=legal.find(action=>action.type==='move');
  const energyView=diagnose&&energySample?cachedMoveDevelopment(pack,state,actor,energySample):null;
  if(options.profile){
   options.profile.gate={
    scored:scored.length,comparable:comparable.length,contested:!!contested,
    discardIncomplete:!!discardIncomplete,discardOpen:!!discardOpen,idleOnly:!!idleOnly,
    constructiveCut:!!constructiveCut,missedDevelopment:!!missedDevelopment,
    provenWin:!!provenWin,alignRefused:!!alignRefused
   };
   options.profile.lines=scored.map(row=>({
    type:row.action?.type||null,line:row.action?.line||null,uid:row.action?.uid??null,
    boundary:row.boundary||null,search:Number.isFinite(row.search)?Math.round(row.search*10)/10:null,
    nodes:row.nodes||0,cut:row.cut||null,phase:row.phase||null,pending:row.pending||null,
    stopPending:row.stopPending||null,stopPlayer:row.stopPlayer??null,
    leafTurn:row.leafTurn??null,leafActive:row.leafActive??null,leafPendingPlayer:row.leafPendingPlayer??null,
    responses:row.responses||0,opponentTurns:row.opponentTurns||0,actorDecisions:row.actorDecisions||0,
    followBranches:row.followBranches||0,maxDepth:row.maxDepth||1,develops:row.develops===true,settled:!!row.settled
   }));
  }
  // Missing coverage, a spent clock, or an unfinished discard does not
  // throw away a win this pool already paid for. The backup stays for
  // every line that has not won.
  if(!provenWin&&(alignRefused||!comparable.length||discardIncomplete||discardOpen||(idleOnly&&(constructiveCut||missedDevelopment)))&&choice){
   const retained=keptEnergy(pack,state,actor,legal,choice,null,strategy);
   const generatedStep=generatorStep(retained,scored);
   const generated=generatedStep.gated;
   const placed=gateFrontEnergy(state,actor,choice,generated,scored);
   const confirmedTrace=confirmedChoiceTrace(pack,state,actor,placed,scored);
   const confirmed=confirmedTrace.choice;
   const preferred=holdSurvival(choice,confirmed,scored);
   const gated=gatePreference(pack,state,actor,choice,preferred,alignMainFront(choice,preferred,scored));
   const kept=constrainConfirmedWin(gated,winRows,legal);
   const ledger=publicBlockChoice(pack,state,actor,legal,scored);
   const sealed=ledger||kept;
   report.budgetFallback++;
   report.budget++;
   settle();
   return finish(sealed,'budget-fallback',{
    actor,seed,worlds:worlds.length,nodesUsed:report.nodes-nodesBefore,fallback:false,fallbackKind:'budget',
    incomplete:true,settled:false,executed:scored.length>0,
    hard:hardExact,hardNodes:hardSlice,strategy,compared:scored.length?viewed:[],unscored:Math.max(0,jobs.length-scored.length),missed,
    plan,roots:jobs.length,followBranches,maxDepth,unexecuted,unexplored,...diagnosis,
    energyKeep:energyView?.strip?energyView:null,
    stages:diagnose?preferenceStages(scored,[['search',choice],['energy-keep',retained],...generatorStages(generatedStep),['energy-gate',placed],...confirmedTrace.steps,['held',preferred],['final-gate',gated],['returned',kept]]):null,
    replacedMove:same(kept,choice)?null:choice,
    ...(alignNote?{align:alignNote}:{}),
    responses:scored.reduce((sum,item)=>sum+(item.responses||0),0),
    score:tracedRow(scored,sealed)?.search??null,
    sequence:tracedRow(scored,sealed)?.sequence||[],
    ...(ledger?{blockLedger:true}:{})
   },started);
  }
  if(!scored.length){
   const backupOnly=preferConfirmedChoices(pack,state,actor,keptEnergy(pack,state,actor,legal,reliableChoice(pack,state,actor,legal,hardExact,ordered),null,strategy),[]);
   const ledger=publicBlockChoice(pack,state,actor,legal,scored);
   const sealed=ledger||backupOnly;
   report.budgetFallback++;
   report.budget++;
   settle();
   return finish(sealed,'budget-fallback',{
    actor,seed,worlds:worlds.length,nodesUsed:report.nodes-nodesBefore,fallback:false,fallbackKind:'budget',
    incomplete:true,executed:false,settled:false,
    hard:hardExact,hardNodes:hardSlice,strategy,compared:[],unexecuted,unexplored,
    plan,roots:jobs.length,...diagnosis,energyKeep:energyView?.strip?energyView:null,
    ...(ledger?{blockLedger:true}:{})
   },started);
  }
  const observation=actorObservation(pack,state,actor);
  // laterEnergy is opt-in. Unfinished scores from different phases are not
  // ranked. An executed energy line that reached a later phase replaces an
  // earlier front of another card as the set being ranked. A proven win
  // still comes from winRows. Raids and same-card energy stay put.
  const later=searchFactors().laterEnergy===true?laterEnergyCandidates(state,actor,scored,comparable):null;
  const laterLines=later?.length?comparedLines(later):null;
  const phaseGuarded=laterLines?.rows?.length&&!laterLines.contested?laterLines.rows:comparable;
  const poolRows=provenWin?winRows:phaseGuarded;
  const anchor=poolRows.reduce((best,row)=>row.search>best.search?row:best).action;
  const blended=continueStartedWave(state,poolRows,discardTie(pack,state,actor,poolRows,blendRoot(poolRows,action=>{
   const mine=learnBonus(options.prior,observation,action,actor);
   const base=learnBonus(options.prior,observation,anchor,actor);
   return mine-base;
  })));
  const exact=legal.find(item=>same(item,blended?.action));
  if(!exact)return fallback(pack,state,legal,started,'unmatched',()=>{settle();return spent();});
  report.search++;
  const row=scored.find(item=>same(item.action,exact));
  const retained=keptEnergy(pack,state,actor,legal,exact,row,strategy);
  const generatedStep=generatorStep(retained,scored);
  const generated=generatedStep.gated;
  const placed=gateFrontEnergy(state,actor,exact,generated,scored);
  const confirmedTrace=confirmedChoiceTrace(pack,state,actor,placed,scored);
  const confirmed=confirmedTrace.choice;
  const heldChoice=holdSurvival(exact,confirmed,scored);
  const gated=gatePreference(pack,state,actor,exact,heldChoice,alignMainFront(exact,heldChoice,scored));
  let kept=gated;
  let keptRow=tracedRow(scored,kept);
  // A deadline leaves discard lines at unequal depths. Tied or unfinished
  // scores are not a reason to throw away the card the keep-order retains.
  // Spending the node pool is the same cutoff: the clock is not the only
  // way a mandatory discard stops short. A line that already won is left
  // alone. A finished line is also left alone, so this does not replace a
  // completed comparison. Optional gates are not in this node cutoff.
  const nodesSpent=pool.n<=0;
  const keptWin=keptRow?.boundary==='terminal'&&keptRow.search>=90000;
  const clockCut=discardWindow&&now()>deadline&&!keptWin;
  const nodeCut=mandatoryDiscardKind(pendingKind)&&nodesSpent&&!finishedLine(keptRow)&&!keptWin;
  // The same win stays through a later cutoff. Keep-order only runs when
  // no executed line has finished as a win.
  if(!provenWin&&(clockCut||nodeCut)){
   const rankedDiscard=reliableChoice(pack,state,actor,legal,null,ordered);
   const backed=legal.find(item=>same(item,rankedDiscard));
   const backedRow=tracedRow(scored,backed);
   const backedLoss=backedRow?.boundary==='terminal'&&backedRow.search<=-90000;
   const keptLoss=keptRow?.boundary==='terminal'&&keptRow.search<=-90000;
   if(backed&&!(backedLoss&&!keptLoss)){kept=backed;keptRow=backedRow;}
  }
  const livedBlock=preferLivedBlock(state,kept,scored);
  if(livedBlock&&!same(livedBlock,kept)){
   const swapped=legal.find(item=>same(item,livedBlock));
   if(swapped){kept=swapped;keptRow=tracedRow(scored,kept);}
  }
  // Preferences and the discard backup have all run. A confirmed win is
  // still the action that goes back, whichever of them tried to leave it.
  kept=constrainConfirmedWin(kept,winRows,legal);
  const ledger=publicBlockChoice(pack,state,actor,legal,scored);
  if(ledger)kept=ledger;
  keptRow=tracedRow(scored,kept);
  if(keptRow?.settled)report.settledChoices++;
  settle();
  return finish(kept,now()>deadline?'budget':'search',{
   actor,seed,worlds:worlds.length,score:keptRow?.search??null,bonus:blended.bonus,
   opponentTurns:keptRow?.opponentTurns||0,responses:keptRow?.responses||0,
   actorDecisions:keptRow?.actorDecisions||0,nodesUsed:report.nodes-nodesBefore,fallback:false,fallbackKind:null,
   incomplete:!keptRow?.settled,settled:!!keptRow?.settled,hard:hardExact,hardNodes:hardSlice,strategy,compared:viewed,
   unscored:jobs.length-scored.length,
   unexecuted,unexplored,candidates:viewed,plan,roots:jobs.length,followBranches,maxDepth,sequence:keptRow?.sequence||[],
   energyKeep:energyView?.strip?energyView:null,
   ...(ledger?{blockLedger:true}:{}),
   stages:diagnose?preferenceStages(scored,[['search',exact],['energy-keep',retained],...generatorStages(generatedStep),['energy-gate',placed],...confirmedTrace.steps,['held',heldChoice],['final-gate',gated],['returned',kept]]):null,
   ...(alignNote?{align:alignNote}:{}),
   replacedMove:same(kept,exact)?null:exact,
   ...diagnosis
  },started);
 }catch(error){
  try{
   const legal=legalUniversalActions(pack,state);
   return fallback(pack,state,legal,started,error?.message||'exception',()=>{settle();return spent();});
  }catch{settle();return finish(null,'exception',{fallback:true,nodesUsed:spent()},started);}
  }finally{if(factors.coverage==='root')setFrontCoverage(true);}
  },explicit||undefined)));
 }catch(error){
  try{
   const legal=legalUniversalActions(pack,state);
   return fallback(pack,state,legal,started,error?.message||'exception',0);
  }catch{return finish(null,'exception',{fallback:true},started);}
 }
}
