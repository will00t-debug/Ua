#!/usr/bin/env node
// Same-budget comparison against frozen hard-search-2.
// Development seeds are 1..N. Final seeds start at AI_V3_FINAL_SEED (default 5000)
// and are not used to change search constants.
//
//   node scripts/ai-v3-benchmark.mjs
//   AI_V3_GAMES=1 AI_V3_STEPS=30 node scripts/ai-v3-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {mainDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action,resetAiV3Report,aiV3Report,AI_V3_POLICY} from '../dist/universal-v2/ai-v3/search.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,hardAiReport,HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';

const GAMES=Number(process.env.AI_V3_GAMES||1);
const STEPS=Number(process.env.AI_V3_STEPS||24);
const FINAL=process.env.AI_V3_SPLIT==='final';
const SEED0=FINAL?Number(process.env.AI_V3_FINAL_SEED||5000):Number(process.env.AI_V3_DEV_SEED||8100);
const MODES=(process.env.AI_V3_MODES||'baseline,prior,beam,belief').split(',');

function pct(values,p){
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length)return null;
 const index=Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1));
 return sorted[index];
}
function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;}
function choose(mode,pack,state,actor){
 if(mode==='baseline'){
  const picked=chooseProgressSafeAiAction(pack,state,{difficulty:'hard'});
  return {action:picked.action,fallback:!!picked.reason};
 }
 const options={actor,seed:1,nodes:48,ms:40,beam:4,actorDecisions:2,opponentDecisions:2};
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
  state=dispatchUniversalAction(packs,state,action,{actor});
  steps++;
 }
 return {title:deck.title,seed,first,steps,illegal,fallback,ms:samples,
  finished:state.status==='finished',winner:state.winner,endReason:state.endReason,
  wall:performance.now()-started};
}
function paired(rows){
 const diffs=[];
 for(let i=0;i<rows.length;i+=2){
  const a=rows[i],b=rows[i+1];
  if(!a||!b)continue;
  const left=a.winner===0?1:a.winner===1?0:0.5;
  const right=b.winner===1?1:b.winner===0?0:0.5;
  if(a.finished&&b.finished)diffs.push((left+right)/2-0.5);
 }
 if(!diffs.length)return {n:0,mean:null,low:null,high:null};
 const point=mean(diffs);
 const boots=[];
 for(let i=0;i<1000;i++){
  let sum=0;
  for(let j=0;j<diffs.length;j++)sum+=diffs[Math.floor(Math.random()*diffs.length)];
  boots.push(sum/diffs.length);
 }
 boots.sort((a,b)=>a-b);
 return {n:diffs.length,mean:point,low:boots[25],high:boots[974]};
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
  for(let g=0;g<GAMES;g++){
   const seed=SEED0+g;
   for(const first of [0,1]){
    resetHardAiReport();resetAiV3Report();
    const challenger=mode==='baseline'?'baseline':mode;
    const seats=first===0?[challenger,'baseline']:['baseline',challenger];
    const row=play(deck,seed,first,seats[0],seats[1]);
    const learned=aiV3Report();
    row.challengerFallback=mode==='baseline'?row.fallback:(learned.fallback||0);
    row.challengerDecisions=mode==='baseline'?row.steps:(learned.decisions||0);
    rows.push(row);
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
   completion:rows.length?rows.filter(row=>row.finished||row.steps>=STEPS).length/rows.length:0,
   fallbackRate:decisions?fallback/decisions:0,
   p50:pct(samples,0.5),p95:pct(samples,0.95),
   paired:paired(rows)
  };
 }
 report.titles[deck.title]=bucket;
}
const flat=[];
for(const title of Object.values(report.titles))for(const mode of Object.values(title.byMode))flat.push(...[]);
console.log(JSON.stringify(report,null,2));
void hardAiReport();void aiV3Report();
