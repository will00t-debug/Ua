#!/usr/bin/env node
// Same-budget comparison against frozen hard-search-2.
// Development seeds start at AI_V3_DEV_SEED (default 8100).
// Final seeds start at AI_V3_FINAL_SEED (default 5000) and are not used to change search constants.
// Each seed plays both first-player seats and both challenger seats.
//
//   node scripts/ai-v3-benchmark.mjs
//   AI_V3_GAMES=1 AI_V3_STEPS=30 node scripts/ai-v3-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {mainDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action,resetAiV3Report,aiV3Report,AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,hardAiReport,HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {matchGrid,pairedChallenger} from '../dist/universal-v2/ai-v3/compare.mjs';

const GAMES=Number(process.env.AI_V3_GAMES||1);
const STEPS=Number(process.env.AI_V3_STEPS||24);
const FINAL=process.env.AI_V3_SPLIT==='final';
const SEED0=FINAL?Number(process.env.AI_V3_FINAL_SEED||5000):Number(process.env.AI_V3_DEV_SEED||8100);
const MODES=(process.env.AI_V3_MODES||'baseline,prior,beam,belief').split(',');
const BUDGET={nodes:48,ms:40,beam:4,actorDecisions:2,opponentDecisions:2,seed:1};

function pct(values,p){
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length)return null;
 const index=Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1));
 return sorted[index];
}
function choose(mode,pack,state,actor){
 if(mode==='baseline'){
  const action=chooseStrengthenedHardAction(pack,state,{nodes:BUDGET.nodes,ms:BUDGET.ms,seed:BUDGET.seed});
  return {action,fallback:false};
 }
 const options={actor,...BUDGET};
 if(mode==='prior')options.mode='prior';
 if(mode==='belief'){options.mode='belief';options.worlds=2;}
 if(mode==='ismcts')options.mode='ismcts';
 const action=chooseAiV3Action(pack,state,options);
 return {action,fallback:false};
}
function play(deck,seed,first,leftMode,rightMode){
 const packs=[deck.pack,deck.pack];
 let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed,first});
 const samples={};
 const acts={};
 let steps=0,fallback=0,illegal=0;
 const started=performance.now();
 while(state.status==='playing'&&steps<STEPS){
  const actor=state.pending?.player??state.active;
  const mode=actor===0?leftMode:rightMode;
  const legal=legalUniversalActions(packs,state);
  const before=performance.now();
  let picked;
  try{picked=choose(mode,packs,state,actor);}catch{picked={action:null,fallback:true};}
  const ms=performance.now()-before;
  if(legal.length>1)(samples[mode]||=[]).push(ms);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(picked.action));
  if(!action){illegal++;break;}
  if(picked.fallback)fallback++;
  const label=action.type==='play'?'play-'+action.line:
   action.type==='chooseBlock'?(action.uid==null?'block-pass':'block'):
   action.type==='raid'?'raid':action.type==='attack'?'attack':action.type==='next'?'next':action.type;
  acts[mode]??={};
  acts[mode][label]=(acts[mode][label]||0)+1;
  state=dispatchUniversalAction(packs,state,action,{actor});
  steps++;
 }
 return {title:deck.title,seed,first,steps,illegal,fallback,ms:samples,acts,
  finished:state.status==='finished',winner:state.winner,endReason:state.endReason,
  life:state.players.map(player=>player.life.length),
  wall:performance.now()-started};
}
function gameView(row){
 return {seed:row.seed,first:row.first,challengerSeat:row.challengerSeat,
  challengerIsFirst:row.challengerSeat===row.first,steps:row.steps,illegal:row.illegal,
  finished:row.finished,winner:row.winner,endReason:row.endReason,life:row.life,
  challengerWon:row.finished&&(row.winner===0||row.winner===1)?row.winner===row.challengerSeat:null};
}
const wanted=new Set((process.env.AI_V3_TITLES||'').split(',').filter(Boolean));
const decks=mainDecks().filter(deck=>!wanted.size||wanted.has(deck.title)||wanted.has(deck.id));
const report={policy:AI_V3_POLICY,baseline:HARD_AI_POLICY,split:FINAL?'final':'dev',seed0:SEED0,steps:STEPS,games:GAMES,modes:MODES,titles:{}};
for(const deck of decks){
 const bucket={byMode:{},completion:0,played:0};
 for(const mode of MODES){
  const rows=[];
  const samples=[];
  let fallback=0,decisions=0,illegal=0,finished=0;
  const games=[];
  for(let g=0;g<GAMES;g++){
   const seed=SEED0+g;
   for(const plan of matchGrid(seed)){
    resetHardAiReport();resetAiV3Report();
    const challenger=mode==='baseline'?'baseline':mode;
    const seats=['baseline','baseline'];
    seats[plan.challengerSeat]=challenger;
    const row=play(deck,seed,plan.first,seats[0],seats[1]);
    const learned=aiV3Report();
    row.challengerSeat=plan.challengerSeat;
    row.challengerFallback=mode==='baseline'?row.fallback:(learned.fallback||0);
    row.challengerDecisions=mode==='baseline'?row.steps:(learned.decisions||0);
    row.nodes=mode==='baseline'?hardAiReport().nodes:(learned.nodes||0);
    rows.push(row);
    const view=gameView(row);
    view.acts=row.acts[challenger]||{};
    games.push(view);
    samples.push(...(row.ms[challenger]||[]));
    fallback+=row.challengerFallback;
    decisions+=row.challengerDecisions;
    illegal+=row.illegal;
    if(row.finished)finished++;
    bucket.played++;
    if(row.steps>=STEPS||row.finished)bucket.completion++;
   }
  }
  bucket.byMode[mode]={
   decisions,illegal,finished,games:rows.length,
   finishedRate:rows.length?finished/rows.length:0,
   completion:rows.length?rows.filter(row=>row.finished||row.steps>=STEPS&&!row.illegal).length/rows.length:0,
   fallbackRate:decisions?fallback/decisions:0,
   p50:pct(samples,0.5),p95:pct(samples,0.95),
   paired:mode==='baseline'?{n:0,mean:null,low:null,high:null}:pairedChallenger(rows),
   games
  };
 }
 report.titles[deck.title]=bucket;
}
console.log(JSON.stringify(report,null,2));
void hardAiReport();void aiV3Report();
