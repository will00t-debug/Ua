#!/usr/bin/env node
import {writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseUniversalAiAction as legacy} from '../tests/fixtures/ai-r58/ai.mjs';
import {assertIndependentV2Inventory} from '../tests/fixtures/v2-integrated-id-manifest.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
const presets=createAllV2PreviewRealDecks();
const roster=['bleach-green','gurren-lagann-red','solo-leveling','sword-art-online','mushoku-tensei'];
const seeds=(process.env.AI_SEEDS||'747,20261015,20261016').split(',').map(Number);
const opponents=(process.env.AI_OPPONENTS||'normal,legacy-hard').split(',');
const records=[],times={hard:[],normal:[],'legacy-hard':[]};
const pendingKinds=new Set(),actionTypes=new Set();
assertIndependentV2Inventory(v2AllTitleInventory());
for(const id of roster){const {pack,counts}=presets[id];if(validateUniversalDeck(pack,counts).length||Object.values(counts).reduce((a,b)=>a+b,0)!==50)throw Error('Illegal deck '+id);}
for(const opponent of opponents)for(let i=0;i<roster.length;i++)for(let j=i+1;j<roster.length;j++)for(const hardSeat of [0,1])for(const first of [0,1])for(const seed of seeds){
 const pair=[presets[roster[i]],presets[roster[j]]],packs=pair.map(x=>x.pack);
 const r={opponent,titles:[roster[i],roster[j]],hardSeat,first,seed,steps:0,illegal:0,legacyFallbacks:0,finished:false};
 let s=newUniversalMatch(packs,{decks:pair.map(x=>x.counts),first,seed});
 try{
  for(;r.steps<1800&&s.status==='playing';r.steps++){
   const actor=s.pending?.player??s.active,policy=actor===hardSeat?'hard':opponent;
   const legal=legalUniversalActions(packs,s),t=performance.now();
   let a=policy==='legacy-hard'?legacy(packs,s,{difficulty:'hard'}):chooseUniversalAiAction(packs,s,{difficulty:policy});
   times[policy].push(performance.now()-t);
   if(!a&&policy==='legacy-hard'){r.legacyFallbacks++;a=legal[0];}
   if(!a||!legal.some(x=>JSON.stringify(x)===JSON.stringify(a))){r.illegal++;throw Error('illegal '+policy+' '+s.pending?.kind);}
   if(s.pending)pendingKinds.add(s.pending.kind);actionTypes.add(a.type);
   s=dispatchUniversalAction(packs,s,a,{actor});
   if(r.steps%100===0)assertUniversalMatch(packs,s);
  }
  assertUniversalMatch(packs,s);r.finished=s.status==='finished';r.winner=s.winner;r.endReason=s.endReason;
  r.hardWin=r.finished&&s.winner===hardSeat;
  r.finalLife=s.players.map(p=>p.life.length);r.finalFront=s.players.map(p=>p.front.filter(Boolean).length);
 }catch(e){r.error=e.stack;}
 records.push(r);
 if(records.length%40===0)process.stderr.write('AI benchmark '+records.length+' games\n');
}
function stats(rs){return {games:rs.length,hardWins:rs.filter(r=>r.hardWin).length,winRate:rs.length?rs.filter(r=>r.hardWin).length/rs.length:0,illegal:rs.reduce((n,r)=>n+r.illegal,0),unfinished:rs.filter(r=>!r.finished).length,meanActions:rs.reduce((n,r)=>n+r.steps,0)/(rs.length||1)};}
const timing=Object.fromEntries(Object.entries(times).map(([k,v])=>{v.sort((a,b)=>a-b);return [k,{steps:v.length,meanMs:v.reduce((a,b)=>a+b,0)/(v.length||1),p95Ms:v[Math.floor(v.length*.95)]||0,maxMs:v.at(-1)||0}];}));
const report={sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,seeds,baseline:'R58 b03e8a6674ab09323b140a80385bef0f3e34f1db; exact ai.mjs snapshot with relocated import; undefined fallback counted',summary:stats(records),byOpponent:Object.fromEntries(opponents.map(x=>[x,stats(records.filter(r=>r.opponent===x))])),byInitiative:{first:stats(records.filter(r=>r.hardSeat===r.first)),second:stats(records.filter(r=>r.hardSeat!==r.first))},byTitle:Object.fromEntries(roster.map(x=>[x,stats(records.filter(r=>r.titles[r.hardSeat]===x))])),timing,pendingKinds:[...pendingKinds].sort(),actionTypes:[...actionTypes].sort(),records};
mkdirSync('audit',{recursive:true});
const out=process.env.AI_OUTPUT||'audit/v2-ai-benchmark.json';writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,records:undefined},null,2));
if(report.summary.illegal||report.summary.unfinished)process.exitCode=1;
