#!/usr/bin/env node
// Diagnose why the current default search loses the recorded 8401/8402 games.
// This does not change the policy, the weights, reserveAp, or holdInfo.
// Search seed 1 is separate from the game seed. Hidden zones are shuffled
// inside the belief world; the live deck order is not the search input.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {newComparedMatch,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';
import {actionGroup} from '../dist/universal-v2/ai-v3/archetype.mjs';
import {selectionTrace} from '../dist/universal-v2/ai-v3/beam.mjs';
import {packOf} from '../dist/universal-v2/ai-v3/observation.mjs';

const RULES=matchRules('official');
const SOURCE='audit/ai-v3-hold-info-8401-baseline.json';
const OUT='audit/ai-v3-search-bottleneck.json';
const SUMMARY='audit/ai-v3-search-bottleneck-summary.json';
const SEARCH_SEED=1;
const CONSTRUCTIVE=new Set(['play','raid','extraDraw','attack','move']);
const FINISHED=new Set(['returned','terminal']);
const CATEGORIES=[
 ['front',action=>action?.type==='play'&&action.line==='front'],
 ['energy',action=>action?.type==='play'&&action.line==='energy'],
 ['raid',action=>action?.type==='raid'],
 ['draw',action=>action?.type==='extraDraw'],
 ['attack',action=>action?.type==='attack'],
 ['move',action=>action?.type==='move']
];
function category(action){
 for(const [name,test] of CATEGORIES)if(test(action))return name;
 return null;
}
const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));

export function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function idOf(action){
 return {type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null};
}
function sameId(a,b){return same(idOf(a),idOf(b));}
function round(value){return Number.isFinite(value)?Math.round(value*10)/10:null;}
function stateHash(state){return createHash('sha256').update(JSON.stringify(state)).digest('hex');}
export function brief(action){
 if(!action)return null;
 return {type:action.type||null,line:action.line||null,uid:action.uid??null,mode:action.mode||null,slot:Number.isInteger(action.slot)?action.slot:null};
}
function label(action){
 const item=brief(action);
 if(!item)return 'none';
 return [item.type,item.line||'',item.uid||'',item.mode||''].join(':');
}
function cardPrint(pack,card){
 if(!card)return null;
 const printed=pack.cards[card.cardId];
 return {uid:card.uid,id:printed?.id||card.cardId,cost:printed?.energy??null,bp:printed?.bp??null,ready:card.ready!==false};
}
function zone(pack,cards){return (cards||[]).map(card=>card?cardPrint(pack,card):null);}
export function publicView(packs,state,actor){
 const mine=state.players[actor];
 const opp=state.players[1-actor];
 const pack=packOf(packs,actor);
 const other=packOf(packs,1-actor);
 const view={
  turn:state.turn,phase:state.phase,pending:state.pending?.kind||null,actor,
  life:state.players.map(player=>player.life.length),
  ap:(mine.apCards||[]).filter(card=>card?.ready).length,
  energy:universalEnergyByColor(packs,state,actor),
  oppEnergy:universalEnergyByColor(packs,state,1-actor),
  hand:zone(pack,mine.hand),front:zone(pack,mine.front),energyLine:zone(pack,mine.energy),
  oppFront:zone(other,opp.front),oppEnergyLine:zone(other,opp.energy)
 };
 return {view,hash:createHash('sha256').update(JSON.stringify(view)).digest('hex')};
}
function fresh(deck,seed,first){
 const packs=[deck.pack,deck.pack];
 return {packs,state:newComparedMatch(packs,[deck.counts,deck.counts],seed,first,RULES)};
}
function openingMatches(game,choice,cursor){
 return cursor.pending?.kind==='opening-mulligan'&&cursor.pending.player===choice.actor;
}

export function walkTo(deck,game,step){
 const {packs,state}=fresh(deck,game.seed,game.first);
 let cursor=state;
 for(const choice of game.opening||[]){
  if(!openingMatches(game,choice,cursor))throw Error('opening '+game.seed);
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
  if(!action)throw Error('opening action');
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:choice.actor});
 }
 for(const played of game.actions){
  if(played.step===step)break;
  if(cursor.status!=='playing')throw Error('finished before '+step);
  const actor=cursor.pending?.player??cursor.active;
  if(actor!==played.actor)throw Error('actor '+played.step);
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>same(item,played.action));
  if(!action)throw Error('replay '+played.step+' '+label(played.action));
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
 }
 return {packs,state:cursor};
}

function rowOf(trace,action){
 // A finished comparison stores the rows on candidates. A budget fallback
 // stores the same finite scores on compared and leaves candidates empty.
 // An unexecuted stub must not hide the row that actually scored.
 const rows=[...(trace?.candidates||[]),...(trace?.compared||[]),...(trace?.unexecuted||[])];
 const hits=rows.filter(row=>sameId(row.action,action));
 return hits.find(row=>row.executed!==false&&Number.isFinite(row.search))||hits[0]||null;
}
export function rootsOf(trace){
 const planned=trace?.rootPlan||[];
 return planned.map(note=>{
  const action=note.action||note;
  const row=rowOf(trace,action);
  return {
   action:brief(action),label:label(action),
   executed:row?row.executed!==false:false,
   boundary:row?.boundary||null,
   search:round(row?.search),
   nodes:row?.nodes||0,
   settled:!!row?.settled,
   cut:row?.cut||null,
   stop:row?.stopReason||null,
   develops:row?.develops===true
  };
 });
}
export function ask(packs,state,actor,extra){
 const meter={dispatches:0};
 resetAiV3Report();
 const started=performance.now();
 const action=chooseAiV3Action(packs,state,{
  actor,...MATCH_LIMITS,seed:SEARCH_SEED,plan:'tree',diagnose:true,meter,...extra
 });
 const trace=lastAiV3Trace();
 const legal=legalUniversalActions(packs,state);
 const exact=legal.find(item=>same(item,action))||null;
 const stages=trace?.stages||[];
 const search=stages.find(stage=>stage.stage==='search')||null;
 const returned=stages.at(-1)||null;
 let rewrite=null;
 if(search){
  for(const stage of stages){
   if(stage.stage==='search')continue;
   if(stage.type!==search.type||stage.line!==search.line||(stage.uid??null)!==(search.uid??null)||(stage.mode||null)!==(search.mode||null)){
    rewrite={stage:stage.stage,from:brief(search),to:brief(stage)};
    break;
   }
  }
 }
 const roots=rootsOf(trace);
 const executed=roots.filter(row=>row.executed&&row.search!=null);
 const chosen=executed.find(row=>sameId(row.action,exact))||null;
 const boundary=chosen?.boundary||null;
 let finishedBetter=null,unfinishedHigher=null;
 if(chosen&&boundary){
  for(const row of executed){
   if(row.boundary!==boundary||sameId(row.action,chosen.action)||!(row.search>chosen.search))continue;
   const slot={label:row.label,boundary,search:row.search,chosen:chosen.search};
   if(FINISHED.has(boundary)){
    if(!finishedBetter||row.search>finishedBetter.search)finishedBetter=slot;
   }else if(!unfinishedHigher||row.search>unfinishedHigher.search)unfinishedHigher=slot;
  }
 }
 const beamGroups=new Set((trace?.rootPlan||[]).map(note=>actionGroup(state,actor,note.action||note)));
 const missingGroups=[];
 const seen=new Set();
 for(const item of legal){
  const group=actionGroup(state,actor,item);
  if(beamGroups.has(group)||seen.has(group))continue;
  seen.add(group);
  if(CONSTRUCTIVE.has(item.type))missingGroups.push({group,action:brief(item),label:label(item)});
 }
 const legalCategories=new Set(legal.map(category).filter(Boolean));
 const rootCategories=new Set(roots.map(row=>category(row.action)).filter(Boolean));
 const absent=[...legalCategories].filter(name=>!rootCategories.has(name));
 const boundaries=[...new Set(executed.map(row=>row.boundary).filter(Boolean))];
 const factors=trace?.factors||{};
 const nodesUsed=Number.isFinite(trace?.nodesUsed)?trace.nodesUsed:null;
 const cutShort=roots.filter(row=>row.executed&&row.cut&&!FINISHED.has(row.boundary));
 return {
  action:brief(exact),raw:exact,legal:!!exact,label:label(exact),
  reason:trace?.reason||null,fallbackKind:trace?.fallbackKind??null,
  nodesUsed,dispatches:meter.dispatches,
  settled:trace?.settled===true,
  search:search?brief(search):null,
  returned:returned?brief(returned):null,
  rewrite,finishedBetter,unfinishedHigher,roots,missingGroups,absent,boundaries,
  unequalBoundaries:boundaries.length>1,
  developingUnexecuted:roots.filter(row=>!row.executed&&row.develops).length,
  // Scores on compared count. This is a pool that never wrote a finite root
  // score, not a fallback whose scores were stored beside candidates.
  spentWithoutScore:roots.length>0&&executed.length===0&&nodesUsed>0,
  cutShort:cutShort.length,
  factors:{holdInfo:factors.holdInfo===true,reserveAp:factors.reserveAp===true},
  elapsedMs:Math.round(performance.now()-started),
  softMs:trace?.softMs??null,overSoft:trace?.overSoft===true
 };
}

function beamReport(packs,state,actor,legal,roots){
 const trace=selectionTrace(packOf(packs,actor),state,actor,legal,MATCH_LIMITS.beam,null);
 const key=action=>JSON.stringify(idOf(action));
 const searched=new Set(roots.map(row=>key(row.action)));
 const picked=new Set(trace.picked.map(key));
 let matches=searched.size===picked.size;
 for(const item of searched)if(!picked.has(item))matches=false;
 const excluded=[];
 const seen=new Set();
 for(const note of trace.notes){
  if(trace.picked.some(action=>same(action,note.action)))continue;
  const id=key(note.action);
  if(seen.has(id))continue;
  seen.add(id);
  excluded.push({action:brief(note.action),reason:note.reason,category:category(note.action)});
 }
 return {
  source:'selectionTrace on the live board. The search ranks the belief probe; rootPlan is the list that was actually searched.',
  matchesSearchedRoots:matches,
  entered:trace.picked.map(brief),
  excluded
 };
}
function overrideOf(probe){
 if(!probe?.rewrite)return null;
 return {stage:probe.rewrite.stage,from:probe.rewrite.from,to:probe.rewrite.to,reason:probe.reason,nodesUsed:probe.nodesUsed};
}
function hardAsk(packs,state){
 resetHardAiReport();
 const action=chooseStrengthenedHardAction(packs,state,{nodes:48,ms:1e9,seed:SEARCH_SEED});
 const legal=legalUniversalActions(packs,state);
 const exact=legal.find(item=>same(item,action))||null;
 return {action:brief(exact),legal:!!exact,label:label(exact),nodes:null};
}

function attribute(base,other){
 if(!other?.action||sameId(base.action,other.action))return 'unchanged';
 if(base.search&&sameId(base.search,other.action)&&!sameId(base.search,base.action))return 'rewrite';
 const root=base.roots.find(row=>sameId(row.action,other.action));
 if(!root)return 'coverage';
 if(!root.executed||root.cut)return 'depth';
 if(root.boundary&&base.roots.some(row=>sameId(row.action,base.action)&&row.boundary===root.boundary&&row.search!=null&&root.search>row.search))return 'score';
 if(root.boundary&&base.roots.some(row=>sameId(row.action,base.action)&&row.boundary&&row.boundary!==root.boundary))return 'depth';
 return 'depth';
}

function internalCause(row){
 if(row.rewrite)return 'rewrite';
 if(row.finishedBetter)return 'score';
 if(row.absent?.length)return 'coverage';
 if(row.spentWithoutScore||row.developingUnexecuted>0||row.unequalBoundaries||row.cutShort>0)return 'depth';
 return 'none';
}

function pick(rows){
 const chosen=[];
 const used=new Set();
 const key=row=>row.id+'@'+row.step;
 const take=(row,why)=>{
  if(!row||used.has(key(row)))return false;
  if(chosen.filter(item=>item.id===row.id).length>=2)return false;
  used.add(key(row));
  chosen.push({...row,why});
  return true;
 };
 const wants=[
  ['rewrite-generator',row=>row.rewrite?.stage==='generator'],
  ['rewrite-early-draw',row=>row.rewrite?.stage==='early-draw'],
  ['rewrite-energy-keep',row=>row.rewrite?.stage==='energy-keep'],
  ['score-finished',row=>!!row.finishedBetter&&!row.rewrite],
  ['coverage-front',row=>(row.absent||[]).includes('front')],
  ['coverage-energy',row=>(row.absent||[]).includes('energy')],
  ['coverage-raid',row=>(row.absent||[]).includes('raid')],
  ['coverage-draw',row=>(row.absent||[]).includes('draw')],
  ['coverage-attack',row=>(row.absent||[]).includes('attack')],
  ['coverage-move',row=>(row.absent||[]).includes('move')],
  ['depth-raid',row=>{
   const raid=(row.roots||[]).find(item=>item.action?.type==='raid'&&item.cut&&!FINISHED.has(item.boundary));
   const front=(row.roots||[]).find(item=>item.action?.type==='play'&&item.action?.line==='front'&&(item.boundary==='yielded'||item.boundary==='returned'));
   return !!(raid&&front);
  }],
  ['depth-cut',row=>row.cutShort>0],
  ['unscored',row=>row.spentWithoutScore&&!row.rewrite],
  ['budget',row=>row.reason==='budget-fallback'||row.fallbackKind==='budget'],
  ['start-draw',row=>row.phase==='start'&&row.action?.type==='extraDraw'&&!row.rewrite],
  ['move',row=>row.phase==='move'&&!row.pending],
  ['attack',row=>row.action?.type==='attack'],
  ['block',row=>row.pending==='block']
 ];
 const decksWanted=['white-sword','sword-art-online-raid','steins-gate-raid'];
 for(const [why,pred] of wants){
  const hits=rows.filter(pred).sort((a,b)=>{
   const da=chosen.filter(item=>item.deck===a.deck).length;
   const db=chosen.filter(item=>item.deck===b.deck).length;
   return da-db||a.step-b.step;
  });
  for(const row of hits)if(take(row,why))break;
 }
 for(const deck of decksWanted){
  while(chosen.filter(item=>item.deck===deck).length<4&&chosen.length<16){
   const row=rows.find(item=>item.deck===deck&&!used.has(key(item))&&chosen.filter(saved=>saved.id===item.id).length<2);
   if(!take(row,'balance'))break;
  }
 }
 return chosen.slice(0,16);
}

function compact(hit){
 const {raw,...rest}=hit;
 return rest;
}

function scanGame(deck,game){
 const id=`${deck.id}|${game.seed}|${game.first}|${game.challengerSeat}`;
 const {packs,state}=fresh(deck,game.seed,game.first);
 let cursor=state;
 const rows=[];
 for(const choice of game.opening||[]){
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:choice.actor});
 }
 for(const played of game.actions){
  if(cursor.status!=='playing')break;
  const actor=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const recorded=legal.find(item=>same(item,played.action));
  if(!recorded)throw Error('diverged '+id+' '+played.step);
  const voluntary=actor===game.challengerSeat&&legal.length>1&&cursor.pending?.kind!=='opening-mulligan';
  if(voluntary){
   const hit=ask(packs,cursor,actor,{nodes:48,ms:1e9,actorDecisions:2});
   const life=cursor.players.map(player=>player.life.length);
   rows.push({
    id,deck:deck.id,gameSeed:game.seed,searchSeed:SEARCH_SEED,first:game.first,seat:game.challengerSeat,
    step:played.step,turn:cursor.turn,phase:cursor.phase,pending:cursor.pending?.kind||null,
    life,ap:(cursor.players[actor].apCards||[]).filter(card=>card?.ready).length,
    legalCount:legal.length,recorded:brief(recorded),
    matchesRecorded:sameId(hit.action,recorded),
    ...compact(hit),
    cause:internalCause(hit)
   });
  }
  cursor=dispatchUniversalAction(packs,cursor,recorded,{actor});
 }
 return rows;
}

function deepen(deck,game,row){
 const {packs,state}=walkTo(deck,game,row.step);
 const actor=state.pending?.player??state.active;
 if(actor!==row.seat)throw Error('seat '+row.id+' '+row.step);
 const legal=legalUniversalActions(packs,state);
 const recorded=legal.find(item=>same(item,game.actions.find(item=>item.step===row.step).action));
 const visible=publicView(packs,state,actor);
 const base=ask(packs,state,actor,{nodes:48,ms:1e9,actorDecisions:2});
 const wide=ask(packs,state,actor,{nodes:192,ms:1e9,actorDecisions:2});
 const deep=ask(packs,state,actor,{nodes:192,ms:1e9,actorDecisions:4});
 const clock=ask(packs,state,actor,{nodes:48,ms:40,actorDecisions:2});
 let wideNodes=null;
 if(!sameId(base.action,wide.action)||!sameId(base.action,deep.action)){
  const actorDecisions=sameId(base.action,wide.action)?4:2;
  wideNodes=ask(packs,state,actor,{nodes:768,ms:1e9,actorDecisions});
  wideNodes.actorDecisions=actorDecisions;
 }
 const hard=hardAsk(packs,state);
 const beam=beamReport(packs,state,actor,legal,base.roots);
 const probes={n48:compact(base),n192:compact(wide),n192d4:compact(deep),ms40:compact(clock),...(wideNodes?{n768:compact(wideNodes)}:{})};
 for(const probe of Object.values(probes)){
  if(!probe.legal)throw Error('illegal '+row.id+' '+row.step);
  if(probe.reason!=='forced'&&probe.reason!=='deferred-baseline'&&probe.dispatches!==probe.nodesUsed){
   throw Error('dispatch '+row.id+' '+row.step+' '+probe.reason+' '+probe.dispatches+'/'+probe.nodesUsed);
  }
  if(probe.factors.holdInfo||probe.factors.reserveAp)throw Error('factor '+row.id);
 }
 if(!sameId(base.action,recorded))throw Error('replay action '+row.id+' '+row.step+' '+base.label+' '+label(recorded));
 return {
  id:row.id,deck:row.deck,gameSeed:row.gameSeed,searchSeed:SEARCH_SEED,first:row.first,seat:row.seat,
  step:row.step,why:row.why,turn:state.turn,phase:state.phase,pending:state.pending?.kind||null,
  hash:stateHash(state),publicHash:visible.hash,public:visible.view,
  legalCount:legal.length,
  recorded:brief(recorded),
  hard,
  beam,
  overrides:{
   n48:overrideOf(base),n192:overrideOf(wide),n192d4:overrideOf(deep),ms40:overrideOf(clock),
   ...(wideNodes?{n768:overrideOf(wideNodes)}:{})
  },
  probes,
  deeper:{
   n192:attribute(base,wide),
   n192d4:attribute(base,deep),
   ms40:attribute(base,clock),
   ...(wideNodes?{n768:attribute(base,wideNodes)}:{})
  },
  internal:internalCause(base),
  illegal:0
 };
}

function bag(rows,keyOf){
 const counts=new Map();
 for(const row of rows){
  const key=keyOf(row);
  counts.set(key,(counts.get(key)||0)+1);
 }
 return Object.fromEntries([...counts.entries()].sort((a,b)=>b[1]-a[1]));
}
function tally(rows){
 const counts={};
 for(const row of rows)counts[row.cause]=(counts[row.cause]||0)+1;
 return counts;
}

export function run(){
 const report=JSON.parse(readFileSync(SOURCE,'utf8'));
 const scanned=[];
 let losses=0,wins=0;
 for(const [title,block] of Object.entries(report.titles)){
  const deck=decks.get(title);
  if(!deck)throw Error('deck '+title);
  for(const game of block.byMode.tree.games){
   if(game.challengerWon){wins++;continue;}
   losses++;
   const started=performance.now();
   const rows=scanGame(deck,game);
   scanned.push(...rows);
   console.error(title,game.seed,game.first,game.challengerSeat,'decisions',rows.length,'ms',Math.round(performance.now()-started));
  }
 }
 const selected=pick(scanned);
 console.error('selected',selected.length);
 const snapshots=[];
 for(const row of selected){
  const deck=decks.get(row.deck);
  const game=report.titles[row.deck].byMode.tree.games.find(item=>item.seed===row.gameSeed&&item.first===row.first&&item.challengerSeat===row.seat);
  const started=performance.now();
  const snapshot=deepen(deck,game,row);
  snapshots.push(snapshot);
  console.error('probe',row.why,row.id,row.step,snapshot.deeper.n192,snapshot.deeper.n192d4,'ms',Math.round(performance.now()-started));
 }
 const detail={
  base:'ef3377aa437147071f3212cceb4456e6b78ae2e7',
  source:SOURCE,
  policy:'default',
  factors:null,
  reserveAp:false,
  holdInfo:false,
  rules:'official',
  searchSeed:SEARCH_SEED,
  clock:'the 48, 192 and 768 probes use ms 1e9. ms40 is a real 40ms clock.',
  losses,wins,
  scanned:scanned.length,
  replayMismatches:scanned.filter(row=>!row.matchesRecorded).length,
  dispatchMismatches:scanned.filter(row=>row.reason!=='forced'&&row.reason!=='deferred-baseline'&&row.dispatches!==row.nodesUsed).length,
  illegal:scanned.filter(row=>!row.legal).length+snapshots.filter(row=>row.illegal).length,
  population:tally(scanned),
  populationFlags:{
   rewrite:scanned.filter(row=>row.rewrite).length,
   rewriteBy:bag(scanned.filter(row=>row.rewrite),row=>row.rewrite.stage+' '+(row.rewrite.from?.type||'')+'/'+(row.rewrite.from?.line||'')+' -> '+(row.rewrite.to?.type||'')+'/'+(row.rewrite.to?.line||'')),
   finishedSameBoundary:scanned.filter(row=>row.finishedBetter).length,
   finishedSameBoundaryWithoutRewrite:scanned.filter(row=>row.finishedBetter&&!row.rewrite).length,
   categoryAbsent:scanned.filter(row=>row.absent.length).length,
   absentBy:bag(scanned.flatMap(row=>row.absent),row=>row),
   cardGroupsLeftOut:scanned.filter(row=>row.missingGroups.length).length,
   budgetFallback:scanned.filter(row=>row.reason==='budget-fallback'||row.fallbackKind==='budget').length,
   unequalBoundaries:scanned.filter(row=>row.unequalBoundaries).length,
   cutShort:scanned.filter(row=>row.cutShort>0).length,
   spentWithoutScore:scanned.filter(row=>row.spentWithoutScore).length,
   developingUnexecuted:scanned.filter(row=>row.developingUnexecuted>0).length
  },
  snapshots,
  scan:scanned.map(row=>({
   id:row.id,deck:row.deck,gameSeed:row.gameSeed,searchSeed:row.searchSeed,first:row.first,seat:row.seat,
   step:row.step,turn:row.turn,phase:row.phase,pending:row.pending,life:row.life,ap:row.ap,
   legalCount:row.legalCount,action:row.action,reason:row.reason,fallbackKind:row.fallbackKind,
   nodesUsed:row.nodesUsed,dispatches:row.dispatches,cause:row.cause,
   rewrite:row.rewrite,finishedBetter:row.finishedBetter,unfinishedHigher:row.unfinishedHigher,
   absent:row.absent,leftOut:row.missingGroups.length,cutShort:row.cutShort,spentWithoutScore:row.spentWithoutScore,
   developingUnexecuted:row.developingUnexecuted,unequalBoundaries:row.unequalBoundaries,
   matchesRecorded:row.matchesRecorded,factors:row.factors
  }))
 };
 writeFileSync(OUT,JSON.stringify(detail,null,2));
 const changed=snapshots.filter(row=>row.deeper.n192!=='unchanged'||row.deeper.n192d4!=='unchanged');
 const summary={
  base:detail.base,
  source:SOURCE,
  losses,wins,scanned:scanned.length,snapshots:snapshots.length,
  illegal:detail.illegal,replayMismatches:detail.replayMismatches,dispatchMismatches:detail.dispatchMismatches,
  population:detail.population,populationFlags:detail.populationFlags,
  selected:snapshots.map(row=>({
   id:row.id,step:row.step,why:row.why,phase:row.phase,pending:row.pending,
   internal:row.internal,deeper:row.deeper,action:row.probes.n48.action,hard:row.hard.action
  })),
  changedAtHigherBudget:changed.map(row=>({id:row.id,step:row.step,deeper:row.deeper,from:row.probes.n48.action,n192:row.probes.n192.action,n192d4:row.probes.n192d4.action,n768:row.probes.n768?.action||null})),
  hashNote:'snapshot.hash is the full state, including hidden zones. snapshot.publicHash is the public view only.',
  scoreNote:'finishedSameBoundary compares only returned or terminal lines. A higher yielded or pending number is stored as unfinishedHigher and is not a score error. Card groups left outside the width-4 beam are not a missing category.',
  note:'Counts come from the current default on the recorded 22 losses in audit/ai-v3-hold-info-8401-baseline.json. The older loss summary read a different baseline. A different hard action is a reference only.'
 };
 writeFileSync(SUMMARY,JSON.stringify(summary,null,2));
 console.error('wrote',snapshots.length,'illegal',detail.illegal,'replay',detail.replayMismatches,'dispatch',detail.dispatchMismatches);
 return summary;
}

const isMain=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isMain)run();
