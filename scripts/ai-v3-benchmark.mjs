#!/usr/bin/env node
// Same-budget comparison against frozen hard-search-2.
// Development seeds start at AI_V3_DEV_SEED (default 8100).
// Final seeds start at AI_V3_FINAL_SEED (default 5000) and are not used to change search constants.
// Each seed plays both first-player seats and both challenger seats.
//
// Official solo rules are the default: opening mulligan and attacker-chosen LIFE.
// Records through 88ee9db6 used neither. Set AI_V3_RULES=legacy to replay that setting.
// The main table shares one legal hard mulligan, then clones that position and swaps seats.
// Each policy's own mulligan is recorded separately and is not the swapped-seat table.
//
//   node scripts/ai-v3-benchmark.mjs
//   AI_V3_GAMES=1 AI_V3_STEPS=30 node scripts/ai-v3-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {mainDecks,battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action,resetAiV3Report,aiV3Report,lastAiV3Trace,AI_V3_POLICY,MATCH_LIMITS,THINK_BUDGETS} from '../dist/universal-v2/ai-v3/search.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,hardAiReport,HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {matchGrid,pairedChallenger} from '../dist/universal-v2/ai-v3/compare.mjs';
import {matchRules,newComparedMatch,applySharedOpening,cloneMatch,nextBuckets} from '../dist/universal-v2/ai-v3/opening.mjs';

const GAMES=Number(process.env.AI_V3_GAMES||1);
const STEPS=Number(process.env.AI_V3_STEPS||24);
const FINAL=process.env.AI_V3_SPLIT==='final';
const SEED0=FINAL?Number(process.env.AI_V3_FINAL_SEED||5000):Number(process.env.AI_V3_DEV_SEED||8100);
const MODES=(process.env.AI_V3_MODES||'baseline,prior,beam,belief').split(',');
const POOL=process.env.AI_V3_POOL==='battle'?'battle':'practice';
const OPPONENT=process.env.AI_V3_OPPONENT==='default'?'default':'matched';
const ANCHOR=process.env.AI_V3_ANCHOR||(OPPONENT==='default'?'live':'baseline');
const RULES=matchRules(process.env.AI_V3_RULES==='legacy'?'legacy':'official');
const V3=new Set(['beam','prior','belief','ismcts','rollout','tree','tree-replies']);
const askedMs=process.env.AI_V3_MS?Number(process.env.AI_V3_MS):MATCH_LIMITS.ms;
const askedNodes=process.env.AI_V3_NODES?Number(process.env.AI_V3_NODES):(THINK_BUDGETS.find(row=>row.ms===askedMs)?.nodes||MATCH_LIMITS.nodes);
const BUDGET={...MATCH_LIMITS,ms:askedMs,nodes:askedNodes,seed:1};
const STRATEGY=process.env.AI_V3_STRATEGY==='score'||process.env.AI_V3_STRATEGY==='order'||process.env.AI_V3_STRATEGY==='reply'
 ?process.env.AI_V3_STRATEGY:null;
 const HARD_NODES=process.env.AI_V3_HARD_NODES!=null&&process.env.AI_V3_HARD_NODES!==''?Number(process.env.AI_V3_HARD_NODES):null;
const RECORD=process.env.AI_V3_ACTIONS==='1';

function pct(values,p){
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length)return null;
 const index=Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1));
 return sorted[index];
}
function choose(mode,pack,state,actor){
 if(mode==='live'){
  const picked=chooseProgressSafeAiAction(pack,state,{difficulty:'hard'});
  return {action:picked.action,fallback:!!picked.reason};
 }
 if(mode==='baseline'){
  const action=chooseStrengthenedHardAction(pack,state,{nodes:BUDGET.nodes,ms:BUDGET.ms,seed:BUDGET.seed});
  return {action,fallback:false};
 }
 if(mode==='rollout'||mode==='tree'||mode==='tree-replies'){
  const action=chooseAiV3Action(pack,state,{actor,...BUDGET,plan:mode,strategy:STRATEGY,
   ...(Number.isInteger(HARD_NODES)?{hardNodes:HARD_NODES}:{})});
  return {action,fallback:false};
 }
 const options={actor,...BUDGET,plan:'rollout',strategy:STRATEGY};
 if(mode==='prior')options.mode='prior';
 if(mode==='belief'){options.mode='belief';options.worlds=2;}
 if(mode==='ismcts')options.mode='ismcts';
 const action=chooseAiV3Action(pack,state,options);
 return {action,fallback:false};
}
function fresh(deck,seed,first){
 const packs=[deck.pack,deck.pack];
 return {packs,state:newComparedMatch(packs,[deck.counts,deck.counts],seed,first,RULES)};
}
function sharedOpening(deck,seed,first){
 const {packs,state}=fresh(deck,seed,first);
 if(!RULES.openingMulligan)return {packs,state,choices:[]};
 return {packs,...applySharedOpening(packs,state)};
}
function ownOpening(deck,seed,first,mode){
 const {packs,state}=fresh(deck,seed,first);
 const choices=[];
 let cursor=state;
 while(cursor.status==='playing'&&cursor.pending?.kind==='opening-mulligan'){
  const actor=cursor.pending.player;
  const legal=legalUniversalActions(packs,cursor);
  let picked;
  try{picked=choose(mode,packs,cursor,actor);}catch(error){return {illegal:true,error:error.message,choices};}
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(picked.action));
  if(!action)return {illegal:true,choices};
  choices.push({actor,mode:action.mode});
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
 }
 const actor=cursor.pending?.player??cursor.active;
 const legal=cursor.status==='playing'?legalUniversalActions(packs,cursor):[];
 return {choices,illegal:false,firstActor:actor,firstTypes:[...new Set(legal.map(action=>action.type))],
  firstCount:legal.length};
}
function play(deck,seed,first,leftMode,rightMode,challengerMode,opening){
 const packs=opening.packs;
 let state=cloneMatch(opening.state);
 const samples={};
 const acts={};
 const script=[];
 const actions=[];
 let steps=0,fallback=0,illegal=0,engineError=null;
 const learned={decisions:0,search:0,settledChoices:0,budgetFallback:0,fallback:0,forced:0,nodes:0,basicNodes:0,deepNodes:0,followBranches:0,maxDepth:0,responses:0};
 const passes={decisions:0,onlyNext:0,voluntaryNext:0,passedDevelopment:0,autonomous:0};
 let mark=aiV3Report();
 const started=performance.now();
 while(state.status==='playing'&&steps<STEPS){
  const actor=state.pending?.player??state.active;
  const mode=actor===0?leftMode:rightMode;
  const legal=legalUniversalActions(packs,state);
  const before=performance.now();
  let picked;
  try{picked=choose(mode,packs,state,actor);}catch{picked={action:null,fallback:true};}
  const ms=performance.now()-before;
  if(V3.has(mode)){
   const now=aiV3Report();
   const trace=lastAiV3Trace();
   if(mode===challengerMode){
    learned.decisions+=now.decisions-mark.decisions;
    learned.search+=now.search-mark.search;
    learned.settledChoices+=now.settledChoices-mark.settledChoices;
    learned.budgetFallback+=now.budgetFallback-mark.budgetFallback;
    learned.fallback+=now.fallback-mark.fallback;
    learned.basicNodes+=now.basicNodes-mark.basicNodes;
    learned.deepNodes+=now.deepNodes-mark.deepNodes;
    learned.forced+=now.forced-mark.forced;
    learned.nodes+=now.nodes-mark.nodes;
    learned.followBranches+=now.followBranches-mark.followBranches;
    learned.responses+=now.responses-mark.responses;
    learned.maxDepth=Math.max(learned.maxDepth,trace?.maxDepth||0);
   }
   mark=now;
  }
  if(legal.length>1)(samples[mode]||=[]).push(ms);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(picked.action));
  if(!action){illegal++;break;}
  if(picked.fallback)fallback++;
  const label=action.type==='play'?'play-'+action.line:
   action.type==='chooseBlock'?(action.uid==null?'block-pass':'block'):
   action.type==='raid'?'raid':action.type==='attack'?'attack':action.type==='next'?'next':action.type;
  acts[mode]??={};
  acts[mode][label]=(acts[mode][label]||0)+1;
  if(mode===challengerMode){
   const bucket=nextBuckets(legal,action);
   passes.decisions++;
   if(legal.length>1)passes.autonomous++;
   if(bucket.onlyNext)passes.onlyNext++;
   if(bucket.voluntaryNext)passes.voluntaryNext++;
   if(bucket.passedDevelopment)passes.passedDevelopment++;
   if(script.length<80)script.push(label);
  }
  if(RECORD)actions.push({step:steps,actor,action});
  try{state=dispatchUniversalAction(packs,state,action,{actor});}
  catch(error){
   illegal++;
   engineError=error.message;
   console.error('engine',deck.id,seed,first,challengerMode,action.type,error.message);
   break;
  }
  steps++;
 }
 return {title:deck.title,seed,first,steps,illegal,engineError,fallback,ms:samples,acts,script,learned,passes,
  finished:state.status==='finished',winner:state.winner,endReason:state.endReason,
  life:state.players.map(player=>player.life.length),
  wall:performance.now()-started,
  ...(RECORD?{actions}:{})
 };
}
function gameView(row){
 return {seed:row.seed,first:row.first,challengerSeat:row.challengerSeat,
  challengerIsFirst:row.challengerSeat===row.first,steps:row.steps,illegal:row.illegal,
  finished:row.finished,winner:row.winner,endReason:row.endReason,life:row.life,
  engineError:row.engineError||null,script:row.script||[],
  onlyNext:row.passes?.onlyNext||0,voluntaryNext:row.passes?.voluntaryNext||0,
  passedDevelopment:row.passes?.passedDevelopment||0,autonomous:row.passes?.autonomous||0,
  challengerWon:row.finished&&(row.winner===0||row.winner===1)?row.winner===row.challengerSeat:null,
  ...(row.actions?{actions:row.actions}:{})
 };
}
function replayGame(deck,game){
 const {packs,state}=fresh(deck,game.seed,game.first);
 let cursor=state;
 for(const choice of game.opening||[]){
  if(cursor.pending?.kind!=='opening-mulligan'||cursor.pending.player!==choice.actor)return {ok:false,error:'opening-actor'};
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
  if(!action)return {ok:false,error:'opening-action'};
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:choice.actor});
 }
 for(const step of game.actions||[]){
  if(cursor.status!=='playing')return {ok:false,error:'already-finished',step:step.step};
  const actor=cursor.pending?.player??cursor.active;
  if(actor!==step.actor)return {ok:false,error:'actor',step:step.step,actor,expected:step.actor};
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(step.action));
  if(!action)return {ok:false,error:'action',step:step.step,action:step.action};
  try{cursor=dispatchUniversalAction(packs,cursor,action,{actor});}
  catch(error){return {ok:false,error:error.message,step:step.step};}
 }
 const life=cursor.players.map(player=>player.life.length);
 const sameLife=life.length===game.life.length&&life.every((n,index)=>n===game.life[index]);
 const ok=cursor.status===(game.finished?'finished':'playing')&&cursor.winner===game.winner&&sameLife&&(game.actions||[]).length===game.steps;
 return {ok,status:cursor.status,winner:cursor.winner,life,steps:(game.actions||[]).length};
}
const wanted=new Set((process.env.AI_V3_TITLES||'').split(',').filter(Boolean));
const decks=(POOL==='battle'?battleDecks():mainDecks()).filter(deck=>!wanted.size||wanted.has(deck.title)||wanted.has(deck.id));
const report={policy:AI_V3_POLICY,baseline:ANCHOR,hard:HARD_AI_POLICY,
 split:FINAL?'final':'dev',seed0:SEED0,steps:STEPS,games:GAMES,modes:MODES,pool:POOL,opponent:OPPONENT,anchor:ANCHOR,
 strategy:STRATEGY,hardNodes:Number.isInteger(HARD_NODES)?HARD_NODES:0,
 rules:{
  name:RULES.openingMulligan?'official':'legacy',
  openingMulligan:RULES.openingMulligan,attackerChoosesLife:RULES.attackerChoosesLife,
  opening:'shared-hard-mulligan',
  legacyThrough:'88ee9db6',
  note:'Tables through 88ee9db6 dealt seven LIFE cards immediately and did not mulligan. Those win/loss rows are a different rules setting.'
 },
 budget:{ms:BUDGET.ms,nodes:BUDGET.nodes},titles:{}};
for(const deck of decks){
 console.error('deck',deck.id,new Date().toISOString());
 const bucket={byMode:{},completion:0,played:0,opening:[]};
 for(const mode of MODES){
  const rows=[];
  const samples=[];
  const walls=[];
  let fallback=0,budgetFallback=0,search=0,settledChoices=0,forced=0,decisions=0,illegal=0,finished=0;
  let nodes=0,followBranches=0,maxDepth=0,responses=0;
  let onlyNext=0,voluntaryNext=0,passedDevelopment=0,autonomous=0;
  const games=[];
  for(let g=0;g<GAMES;g++){
   const seed=SEED0+g;
   const openings=new Map();
   for(const plan of matchGrid(seed)){
    const key=seed+'|'+plan.first;
    if(!openings.has(key))openings.set(key,sharedOpening(deck,seed,plan.first));
    resetHardAiReport();resetAiV3Report();
    const challenger=mode==='baseline'?'baseline':mode;
    const seats=Array(2).fill(ANCHOR);
    seats[plan.challengerSeat]=challenger;
    const row=play(deck,seed,plan.first,seats[0],seats[1],challenger,openings.get(key));
    const learned=row.learned||aiV3Report();
    row.challengerSeat=plan.challengerSeat;
    row.challengerFallback=mode==='baseline'?row.fallback:(learned.fallback||0);
    row.budgetFallback=mode==='baseline'?0:(learned.budgetFallback||0);
    row.challengerDecisions=mode==='baseline'?row.steps:(learned.decisions||0);
    row.nodes=mode==='baseline'?hardAiReport().nodes:(learned.nodes||0);
    rows.push(row);
    const view=gameView(row);
    view.acts=row.acts[challenger]||{};
    view.opening=openings.get(key).choices;
    if(RECORD){
     const replay=replayGame(deck,view);
     view.replay=replay.ok;
     if(!replay.ok)view.replayError=replay;
    }
    games.push(view);
    samples.push(...(row.ms[challenger]||[]));
    walls.push(row.wall);
    fallback+=row.challengerFallback;
    budgetFallback+=row.budgetFallback||0;
    search+=mode==='baseline'?0:(learned.search||0);
    settledChoices+=mode==='baseline'?0:(learned.settledChoices||0);
    forced+=mode==='baseline'?0:(learned.forced||0);
    nodes+=learned.nodes||0;
    followBranches+=learned.followBranches||0;
    responses+=learned.responses||0;
    maxDepth=Math.max(maxDepth,learned.maxDepth||0);
    view.budgetFallback=row.budgetFallback||0;
    decisions+=row.challengerDecisions;
    onlyNext+=row.passes?.onlyNext||0;
    voluntaryNext+=row.passes?.voluntaryNext||0;
    passedDevelopment+=row.passes?.passedDevelopment||0;
    autonomous+=row.passes?.autonomous||0;
    illegal+=row.illegal;
    if(row.finished)finished++;
    bucket.played++;
    if(row.steps>=STEPS||row.finished)bucket.completion++;
   }
  }
  if(RULES.openingMulligan){
   for(let g=0;g<GAMES;g++)for(const first of [0,1]){
    bucket.opening.push({seed:SEED0+g,first,mode,flow:ownOpening(deck,SEED0+g,first,mode==='baseline'?'baseline':mode)});
   }
  }
  bucket.byMode[mode]={
   decisions,illegal,finished,games:rows.length,
   finishedRate:rows.length?finished/rows.length:0,
   completion:rows.length?rows.filter(row=>row.finished||row.steps>=STEPS&&!row.illegal).length/rows.length:0,
   fallbackRate:decisions?fallback/decisions:0,
   search,forced,nodes,followBranches,maxDepth,responses,
   // choiceRate is a compared choice. It does not mean the selected line settled.
   choiceRate:decisions?search/decisions:0,
   completedSearchRate:decisions?search/decisions:0,
   settledLineRate:decisions?settledChoices/decisions:0,
   choiceSearchRate:(search+budgetFallback)?search/(search+budgetFallback):0,
   metricNote:'completedSearchRate aliases choiceRate and does not mean the line reached the next own turn. settledLineRate does.',
   budgetFallback,budgetFallbackRate:decisions?budgetFallback/decisions:0,
   onlyNext,voluntaryNext,passedDevelopment,autonomous,
   onlyNextRate:decisions?onlyNext/decisions:0,
   voluntaryNextRate:decisions?voluntaryNext/decisions:0,
   p50:pct(samples,0.5),p95:pct(samples,0.95),wallP50:pct(walls,0.5),
   paired:mode==='baseline'?{n:0,mean:null,low:null,high:null}:pairedChallenger(rows),
   games
  };
 }
 report.titles[deck.id]=bucket;
}
if(RECORD){
 let replayed=0,replayFailed=0;
 for(const bucket of Object.values(report.titles)){
  for(const mode of Object.values(bucket.byMode||{})){
   for(const game of mode.games||[]){
    if(!game.actions)continue;
    replayed++;
    if(game.replay!==true)replayFailed++;
   }
  }
 }
 report.replay={replayed,replayFailed};
}
console.log(JSON.stringify(report,null,2));
void hardAiReport();void aiV3Report();
if(RECORD&&report.replay.replayFailed)process.exitCode=1;
