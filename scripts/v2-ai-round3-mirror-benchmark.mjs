#!/usr/bin/env node
// Exact same reducer, registered 50-card packs and paired seeds for Round
// 1/2 Hard and Normal. Frozen policies do not import current planner code.
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {createUniversalAiObservation} from '../dist/universal-v2/ai-observation.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {createUniversalAiObservation as observation1} from '../tests/fixtures/ai-round1/ai-observation.mjs';
import {chooseStrategicUniversalAction as policy1} from '../tests/fixtures/ai-round1/ai-strategy.mjs';
import {chooseStrategicUniversalAction as policy2} from '../tests/fixtures/ai-round2/ai-strategy.mjs';

const names=['bleach-green','gurren-lagann-red','solo-leveling','sword-art-online','mushoku-tensei'];
const presets=createAllV2PreviewRealDecks();
const seeds=(process.env.AI_R3_MIRROR_SEEDS||'12031,32063').split(',').map(Number);
const opponents=['round1-hard','round2-hard','normal'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const records=[],latencies=[],pendingKinds=new Set();
function policy(kind,packs,s,legal,telemetry){
 if(kind==='new')return chooseUniversalAiAction(packs,s,{difficulty:'hard',telemetry});
 if(kind==='round1-hard'){
  const a=policy1(packs,observation1(packs,s,legal));
  return legal.find(x=>same(x,a))||legal[0];
 }
 if(kind==='round2-hard'){
  const a=policy2(packs,createUniversalAiObservation(packs,s,legal));
  return legal.find(x=>same(x,a))||legal[0];
 }
 return chooseUniversalAiAction(packs,s,{difficulty:'normal'});
}
for(const title of names){
 const d=presets[title];
 if(validateUniversalDeck(d.pack,d.counts).length||
  Object.values(d.counts).reduce((n,v)=>n+v,0)!==50)throw Error('Not legal 50: '+title);
 const packs=[d.pack,d.pack];
 for(const opponent of opponents)for(const hardSeat of [0,1])
  for(const first of [0,1])for(const seed of seeds){
   let state=newUniversalMatch(packs,{decks:[d.counts,d.counts],first,seed});
   const rec={title,opponent,hardSeat,first,seed,steps:0,illegal:0,finished:false,
    hardWin:false,searchNodes:0,exactExpansions:0,fallbacks:0,error:null};
   try{
    for(;state.status==='playing'&&rec.steps<1800;rec.steps++){
     const actor=state.pending?.player??state.active,legal=legalUniversalActions(packs,state);
     const kind=actor===hardSeat?'new':opponent,t=performance.now(),telemetry={};
     const action=policy(kind,packs,state,legal,telemetry);
     if(actor===hardSeat){
      latencies.push(performance.now()-t);
      rec.searchNodes+=telemetry.searchNodes||0;
      rec.exactExpansions+=telemetry.nativeExactSteps||0;
      if(telemetry.tacticalFallback)rec.fallbacks++;
     }
     if(!action||!legal.some(x=>same(x,action))){rec.illegal++;throw Error('Non-native action '+kind);}
     if(state.pending)pendingKinds.add(state.pending.kind);
     state=dispatchUniversalAction(packs,state,action,{actor});
     if(rec.steps%100===0)assertUniversalMatch(packs,state);
    }
    assertUniversalMatch(packs,state);rec.finished=state.status==='finished';
    rec.hardWin=rec.finished&&state.winner===hardSeat;
   }catch(e){rec.error=String(e.stack||e);}
   records.push(rec);
  }
}
const stat=rs=>({
 games:rs.length,wins:rs.filter(x=>x.hardWin).length,
 winRate:rs.filter(x=>x.hardWin).length/(rs.length||1),
 illegal:rs.reduce((n,x)=>n+x.illegal,0),
 unfinished:rs.filter(x=>!x.finished).length,
 meanSearchNodes:rs.reduce((n,x)=>n+x.searchNodes,0)/(rs.length||1),
 exactExpansions:rs.reduce((n,x)=>n+x.exactExpansions,0),
 fallbackCount:rs.reduce((n,x)=>n+x.fallbacks,0)
});
latencies.sort((a,b)=>a-b);
const pct=p=>latencies[Math.min(latencies.length-1,Math.floor(latencies.length*p))]||0;
const summary={
 explanation:'Round 3 native reducer hard vs immutable Round 1 and Round 2 policies and Normal, on identical integrated V2 card/engine builds; two previously unused seeds.',
 seeds,opponents,
 overall:stat(records),
 byOpponent:Object.fromEntries(opponents.map(x=>[x,stat(records.filter(r=>r.opponent===x))])),
 byTitle:Object.fromEntries(names.map(x=>[x,Object.fromEntries(opponents.map(op=>[op,stat(records.filter(r=>r.title===x&&r.opponent===op))]))])),
 initiative:Object.fromEntries(['first','second'].map(x=>[x,stat(records.filter(r=>(r.hardSeat===r.first?'first':'second')===x))])),
 observedPending:[...pendingKinds].sort(),
 timing:{decisions:latencies.length,meanMs:latencies.reduce((n,x)=>n+x,0)/(latencies.length||1),
  p95Ms:pct(.95),p99Ms:pct(.99),maxMs:latencies.at(-1)||0},
 records
};
mkdirSync('audit',{recursive:true});
writeFileSync('audit/v2-ai-round3-mirror.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,records:undefined},null,2));
if(records.some(r=>r.illegal||!r.finished||r.error))process.exitCode=1;
