#!/usr/bin/env node
// Controlled registered 50-card title mirrors; first-round Hard is an immutable
// PR #83 strategy + observation snapshot, NOT the R58 legacy Hard policy.
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {createUniversalAiObservation as round1Observation} from '../tests/fixtures/ai-round1/ai-observation.mjs';
import {chooseStrategicUniversalAction as round1Policy} from '../tests/fixtures/ai-round1/ai-strategy.mjs';
const roster=['bleach-green','gurren-lagann-red','solo-leveling','sword-art-online','mushoku-tensei'];
const presets=createAllV2PreviewRealDecks();
const seeds=(process.env.AI_MIRROR_SEEDS||'948,20261025').split(',').map(Number);
const opponents=['normal','round1-hard'];
const records=[],timings={hard:[],'round1-hard':[],normal:[]},pendingKinds=new Set();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function round1(pack,s,legal){
 const obs=round1Observation(pack,s,legal),candidate=round1Policy(pack,obs);
 return legal.find(a=>same(a,candidate))||legal[0];
}
for(const title of roster){
 const preset=presets[title];if(!preset)throw Error('Missing real deck: '+title);
 if(validateUniversalDeck(preset.pack,preset.counts).length||
 Object.values(preset.counts).reduce((a,b)=>a+b,0)!==50)throw Error('Illegal real 50 deck: '+title);
 const packs=[preset.pack,preset.pack],decks=[preset.counts,preset.counts];
 for(const opponent of opponents)for(const hardSeat of [0,1])for(const first of [0,1])for(const seed of seeds){
  const r={title,opponent,hardSeat,first,seed,steps:0,illegal:0,finished:false},clock=[];
  let s=newUniversalMatch(packs,{decks,first,seed});
  try{
   for(;s.status==='playing'&&r.steps<1800;r.steps++){
    const actor=s.pending?.player??s.active,policy=actor===hardSeat?'hard':opponent;
    const legal=legalUniversalActions(packs,s),t=performance.now();
    const a=policy==='round1-hard'?round1(packs,s,legal):
     chooseUniversalAiAction(packs,s,{difficulty:policy});
    const ms=performance.now()-t;timings[policy].push(ms);
    if(!a||!legal.some(x=>same(x,a))){r.illegal++;throw Error('illegal '+policy);}
    if(s.pending)pendingKinds.add(s.pending.kind);
    s=dispatchUniversalAction(packs,s,a,{actor});
    if(r.steps%100===0)assertUniversalMatch(packs,s);
   }
   assertUniversalMatch(packs,s);
   r.finished=s.status==='finished';r.winner=s.winner;
   r.hardWin=r.finished&&s.winner===hardSeat;
   r.finalLife=s.players.map(p=>p.life.length);
  }catch(e){r.error=String(e.stack||e);}
  records.push(r);
 }
}
const stats=rs=>({games:rs.length,wins:rs.filter(x=>x.hardWin).length,
 winRate:rs.filter(x=>x.hardWin).length/(rs.length||1),
 illegal:rs.reduce((n,x)=>n+x.illegal,0),
 unfinished:rs.filter(x=>!x.finished).length,
 meanActions:rs.reduce((n,x)=>n+x.steps,0)/(rs.length||1)});
const sortedTiming=Object.fromEntries(Object.entries(timings).map(([key,arr])=>{
 arr.sort((a,b)=>a-b);const pct=x=>arr[Math.min(arr.length-1,Math.floor(arr.length*x))]||0;
 return [key,{decisions:arr.length,meanMs:arr.reduce((a,b)=>a+b,0)/(arr.length||1),
  p95Ms:pct(.95),p99Ms:pct(.99),maxMs:arr.at(-1)||0}];
}));
const summary={baseline:'frozen PR #83 first-round Hard, exact policy and observation snapshot',
 seeds,summary:stats(records),byOpponent:Object.fromEntries(opponents.map(x=>[x,stats(records.filter(r=>r.opponent===x))])),
 byTitle:Object.fromEntries(roster.map(x=>[x,Object.fromEntries(opponents.map(op=>[op,stats(records.filter(r=>r.title===x&&r.opponent===op))]))])),
 byInitiative:{first:stats(records.filter(r=>r.hardSeat===r.first)),second:stats(records.filter(r=>r.hardSeat!==r.first))},
 bySeed:Object.fromEntries(seeds.map(x=>[x,stats(records.filter(r=>r.seed===x))])),
 timings:sortedTiming,actualPendingKinds:[...pendingKinds].sort(),records};
mkdirSync('audit',{recursive:true});
writeFileSync(process.env.AI_MIRROR_OUTPUT||'audit/v2-ai-round2-mirror.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,records:undefined},null,2));
if(summary.summary.illegal||summary.summary.unfinished)process.exitCode=1;
