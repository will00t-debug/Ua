#!/usr/bin/env node
// Replay the eight sword-art-online coverage-mirror games from
// audit/v2-hard-ai-cross-title-96001.json. Seat 0 is the frozen
// hard-search-2 policy that produced those required-draw-empty losses.
// The same seeds are also played with hard-search-3 so the record can
// separate a deck that cannot attack from a policy that will not.
// This does not overwrite the original audit file.
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {requireRegisteredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch,
 universalEnergy} from '../dist/universal-v2/engine.mjs';
import {chooseLegacyHardAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {chooseFrozenHardSearch2} from '../dist/universal-v2/hard-ai-search-2.mjs';
import {chooseStrengthenedHardAction as chooseHardSearch3,resetHardAiReport,hardAiReport}
 from '../dist/universal-v2/hard-ai-search-3.mjs';
import {buildCoverageDeck} from './v2-hard-ai-cross-title.mjs';

const STEP_CAP=Number(process.env.HARD_AI_STEPS||8000);
const TITLE='sword-art-online';

function snapshot(pack,s){
 const row=p=>{
  const pl=s.players[p];
  const front=pl.front.filter(Boolean);
  return {
   life:pl.life.length,deck:pl.deck.length,hand:pl.hand.length,
   energy:universalEnergy([pack,pack],s,p),
   front:front.length,ready:front.filter(c=>c.ready).length
  };
 };
 return {turn:s.turn,phase:s.phase,p0:row(0),p1:row(1)};
}
function play(job){
 resetHardAiReport();
 const pack=requireRegisteredV2TitlePack(TITLE);
 const packs=[pack,pack];
 const choose0=job.policy==='hard-search-2'?chooseFrozenHardSearch2:chooseHardSearch3;
 const started=performance.now();
 const actions={p0:{},p1:{}};
 const marks=[];
 const entry={
  policy:job.policy,seed:job.seed,first:job.first,steps:0,outcome:'interrupt',
  endReason:null,winner:null
 };
 try{
  let s=newUniversalMatch(packs,{decks:[job.counts,job.counts],seed:job.seed,first:job.first});
  assertUniversalMatch(packs,s);
  const phaseKey=[null,null],phaseCount=[0,0];
  for(let step=0;step<STEP_CAP&&s.status==='playing';step++){
   const actor=s.pending?.player??s.active;
   const key=s.turn+'|'+s.active+'|'+s.phase;
   if(phaseKey[actor]!==key){phaseKey[actor]=key;phaseCount[actor]=0;}
   const picked=actor===0
    ? chooseProgressSafeAiAction(packs,s,{
     difficulty:'hard',actionsInPhase:phaseCount[actor],choose:choose0||undefined
    })
    : chooseProgressSafeAiAction(packs,s,{
     difficulty:'hard',actionsInPhase:phaseCount[actor],choose:chooseLegacyHardAiAction
    });
   if(!picked.action)throw Error('no legal action');
   const bucket=actor===0?actions.p0:actions.p1;
   const kind=picked.action.type+(picked.action.line?':'+picked.action.line:'');
   bucket[kind]=(bucket[kind]||0)+1;
   s=dispatchUniversalAction(packs,s,picked.action,{actor});
   phaseCount[actor]++;
   entry.steps++;
   if(entry.steps%80===0){
    assertUniversalMatch(packs,s);
    marks.push(snapshot(pack,s));
   }
  }
  assertUniversalMatch(packs,s);
  entry.finished=s.status==='finished';
  entry.endReason=s.endReason||null;
  entry.winner=Number.isInteger(s.winner)?s.winner:null;
  entry.final=snapshot(pack,s);
  entry.marks=marks;
  entry.actions=actions;
  entry.outcome=entry.finished?'finished':'interrupt';
  entry.ai=job.policy==='hard-search-3'?hardAiReport():null;
 }catch(e){
  entry.outcome='interrupt';
  entry.error=String(e?.message||e);
 }
 entry.ms=Math.round(performance.now()-started);
 return entry;
}

if(!isMainThread){
 parentPort.postMessage(play(workerData));
}else{
 const pack=requireRegisteredV2TitlePack(TITLE);
 const deck=buildCoverageDeck(pack);
 const jobs=[];
 for(const policy of ['hard-search-2','hard-search-3']){
  for(const first of [0,1])for(let i=0;i<4;i++){
   jobs.push({policy,first,seed:96001+i,counts:deck.counts});
  }
 }
 const workers=Math.max(1,Number(process.env.HARD_AI_WORKERS||4));
 const results=new Array(jobs.length);
 let cursor=0,finished=0;
 const started=Date.now();
 await new Promise((done,reject)=>{
  const launch=()=>{
   if(cursor>=jobs.length)return;
   const index=cursor++;
   const worker=new Worker(fileURLToPath(import.meta.url),{workerData:jobs[index]});
   worker.on('message',result=>{
    results[index]=result;
    finished++;
    const elapsed=((Date.now()-started)/1000).toFixed(0);
    process.stdout.write(finished+'/'+jobs.length+' '+result.policy+' first='+result.first+
     ' seed='+result.seed+' '+result.endReason+' winner='+result.winner+
     ' steps='+result.steps+' ('+elapsed+'s)\n');
    if(finished===jobs.length)done();
    else launch();
   });
   worker.on('error',reject);
  };
  for(let n=0;n<Math.min(workers,jobs.length);n++)launch();
 });
 const group=policy=>results.filter(r=>r.policy===policy);
 const summarize=list=>{
  const deckOut=list.filter(r=>r.endReason==='required-draw-empty').length;
  const attacks=list.reduce((n,r)=>n+(r.actions?.p0?.attack||0),0);
  const energy=list.reduce((n,r)=>n+(r.actions?.p0?.['play:energy']||0),0);
  return {games:list.length,deckOut,attacks,energyPlays:energy,
   winners:list.map(r=>r.winner),steps:list.map(r=>r.steps)};
 };
 const frozen=group('hard-search-2');
 const next=group('hard-search-3');
 const bothDeckOut=frozen.every(r=>r.endReason==='required-draw-empty')&&
  next.every(r=>r.endReason==='required-draw-empty');
 const onlyFrozen=frozen.every(r=>r.endReason==='required-draw-empty')&&
  next.some(r=>r.endReason!=='required-draw-empty');
 const frozenDraws=frozen.reduce((n,r)=>n+(r.actions?.p0?.extraDraw||0),0);
 const nextDraws=next.reduce((n,r)=>n+(r.actions?.p0?.extraDraw||0),0);
 const out=resolve(dirname(fileURLToPath(import.meta.url)),'../audit/v2-hard-ai-sao-96001-replay.json');
 const summary={
  source:'audit/v2-hard-ai-cross-title-96001.json',
  title:TITLE,deckCards:50,deckIds:Object.keys(deck.counts).length,
  covered:deck.covered,missing:deck.missing,
  frozen:summarize(frozen),search3:summarize(next),
  extraDraws:{frozen:frozenDraws,search3:nextDraws},
  cause:bothDeckOut?'deck-and-policy':onlyFrozen?'policy':'mixed',
  note:'The coverage list has no 0-cost character, so the opening main never has a legal play. hard-search-2 then spends AP on extra draws and empties its own deck. hard-search-3 does not take those draws; with no board, the later deck-out follows whose turn must draw.'
 };
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify({summary,results},null,2)+'\n');
 process.stdout.write(JSON.stringify(summary,null,2)+'\n'+out+'\n');
}
