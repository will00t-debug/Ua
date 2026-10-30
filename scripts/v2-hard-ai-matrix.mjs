#!/usr/bin/env node
// New Hard (seat 0, hard-search-1) vs frozen Hard (seat 1, chooseLegacyHardAiAction).
// Same universal V2 reducer, BLEACH pack and the three designated 50-card decks.
// 3 pairings each way x first/second x seeds. Acceptance seeds are 88001-88020.
// Tuning uses 77001+ and must not overlap the acceptance range. A later retune
// uses 89001+. Interrupts stay in the denominator and are not wins.
//
//   HARD_AI_SEED0=77001 HARD_AI_SEEDS=2 node scripts/v2-hard-ai-matrix.mjs
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseLegacyHardAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {resetHardAiReport,hardAiReport,HARD_AI_POLICY}
 from '../dist/universal-v2/hard-ai.mjs';

const STEP_CAP=Number(process.env.HARD_AI_STEPS||8000);
const WIN_REASONS=new Set(['life-zero','unblocked-attack','required-draw-empty']);

function decks(){
 const pack=createBleachV2Pack();
 return summarizeDesignatedDecks(id=>!!pack.cards[id]).map(row=>{
  const counts=designatedPlayableCounts(row);
  if(validateUniversalDeck(pack,counts).length)
   throw Error(row.key+' is not a legal deck');
  return {key:row.key,name:row.name,counts};
 });
}

function play(job){
 resetHardAiReport();
 const pack=createBleachV2Pack();
 const packs=[pack,pack];
 const driver={};
 const started=performance.now();
 const entry={
  newDeck:job.newKey,oldDeck:job.oldKey,first:job.first,seed:job.seed,
  steps:0,turn:0,finished:false,winner:null,endReason:null,outcome:'interrupt'
 };
 try{
  let s=newUniversalMatch(packs,{
   decks:[job.newCounts,job.oldCounts],seed:job.seed,first:job.first
  });
  assertUniversalMatch(packs,s);
  const phaseKey=[null,null],phaseCount=[0,0];
  for(let step=0;step<STEP_CAP&&s.status==='playing';step++){
   const actor=s.pending?.player??s.active;
   const key=s.turn+'|'+s.active+'|'+s.phase;
   if(phaseKey[actor]!==key){phaseKey[actor]=key;phaseCount[actor]=0;}
   const picked=actor===0
    ? chooseProgressSafeAiAction(packs,s,{difficulty:'hard',actionsInPhase:phaseCount[actor]})
    : chooseProgressSafeAiAction(packs,s,{
     difficulty:'hard',actionsInPhase:phaseCount[actor],choose:chooseLegacyHardAiAction
    });
   if(picked.reason)driver[picked.reason]=(driver[picked.reason]||0)+1;
   if(!picked.action)throw Error('no legal action');
   s=dispatchUniversalAction(packs,s,picked.action,{actor});
   phaseCount[actor]++;
   entry.steps++;
   entry.turn=s.turn;
   if(entry.steps%80===0)assertUniversalMatch(packs,s);
  }
  assertUniversalMatch(packs,s);
  entry.finished=s.status==='finished';
  entry.endReason=s.endReason||null;
  entry.winner=Number.isInteger(s.winner)?s.winner:null;
  if(entry.finished&&entry.winner===0&&WIN_REASONS.has(entry.endReason))entry.outcome='win';
  else if(entry.finished&&entry.winner===1&&WIN_REASONS.has(entry.endReason))entry.outcome='loss';
  else entry.outcome='interrupt';
 }catch(e){
  entry.outcome='interrupt';
  entry.error=String(e?.message||e);
 }
 entry.ms=Math.round(performance.now()-started);
 entry.driver=driver;
 entry.ai=hardAiReport();
 return entry;
}

function wilson(wins,n){
 if(!n)return {low:0,high:0};
 const z=1.96,p=wins/n,z2=z*z,den=1+z2/n;
 const center=(p+z2/(2*n))/den;
 const margin=z*Math.sqrt((p*(1-p)+z2/(4*n))/n)/den;
 return {low:Math.max(0,center-margin),high:Math.min(1,center+margin)};
}

function addAi(into,ai){
 if(!ai)return;
 for(const key of ['decisions','forced','deferred','overrides','kept','budgetExhausted',
  'exceptions','unsupported','legacyMiss','uncompared','ms','nodes'])
  into[key]=(into[key]||0)+(ai[key]||0);
 into.maxMs=Math.max(into.maxMs||0,ai.maxMs||0);
 into.games=(into.games||0)+1;
}

if(!isMainThread){
 parentPort.postMessage(play(workerData));
}else{
 const roster=decks();
 const byKey=Object.fromEntries(roster.map(d=>[d.key,d]));
 const seed0=Number(process.env.HARD_AI_SEED0||88001);
 const seedCount=Number(process.env.HARD_AI_SEEDS||20);
 const workers=Math.max(1,Number(process.env.HARD_AI_WORKERS||3));
 const pairFilter=process.env.HARD_AI_PAIRS||'';
 const out=process.env.HARD_AI_OUTPUT||
  resolve(dirname(fileURLToPath(import.meta.url)),'../audit/v2-hard-ai-matrix.json');
 const jobs=[];
 for(const neu of roster)for(const old of roster){
  const label=neu.key+'/'+old.key;
  if(pairFilter&&!pairFilter.split(',').includes(label))continue;
  for(const first of [0,1])for(let i=0;i<seedCount;i++){
   jobs.push({
    newKey:neu.key,newName:neu.name,newCounts:neu.counts,
    oldKey:old.key,oldName:old.name,oldCounts:old.counts,
    first,seed:seed0+i
   });
  }
 }
 if(!jobs.length)throw Error('no matches');
 const results=new Array(jobs.length);
 let cursor=0,finished=0;
 const started=Date.now();
 await new Promise((resolve,reject)=>{
  const launch=()=>{
   if(cursor>=jobs.length)return;
   const index=cursor++;
   const worker=new Worker(fileURLToPath(import.meta.url),{workerData:jobs[index]});
   worker.on('message',result=>{
    results[index]=result;
    finished++;
    const elapsed=((Date.now()-started)/1000).toFixed(0);
    process.stdout.write(finished+'/'+jobs.length+' '+result.newDeck+' vs '+result.oldDeck+
     ' first='+result.first+' seed='+result.seed+' '+result.outcome+
     ' T'+result.turn+' '+result.steps+' steps '+result.ms+'ms ('+elapsed+'s)\n');
    if(finished===jobs.length)resolve();
    else launch();
   });
   worker.on('error',reject);
  };
  for(let n=0;n<Math.min(workers,jobs.length);n++)launch();
 });
 const wins=results.filter(r=>r.outcome==='win').length;
 const losses=results.filter(r=>r.outcome==='loss').length;
 const interrupts=results.filter(r=>r.outcome==='interrupt');
 const bucket=(list)=>{
  const w=list.filter(r=>r.outcome==='win').length;
  return {games:list.length,wins:w,losses:list.filter(r=>r.outcome==='loss').length,
   interrupts:list.filter(r=>r.outcome==='interrupt').length,
   winRate:list.length?w/list.length:0,wilson95:wilson(w,list.length)};
 };
 const pairings={};
 for(const neu of roster)for(const old of roster){
  const rows=results.filter(r=>r.newDeck===neu.key&&r.oldDeck===old.key);
  if(!rows.length)continue;
  pairings[neu.name+' vs '+old.name]={
   ...bucket(rows),
   whenFirst:bucket(rows.filter(r=>r.first===0)),
   whenSecond:bucket(rows.filter(r=>r.first===1))
  };
 }
 const ai={maxMs:0};
 for(const row of results)addAi(ai,row.ai);
 const driver={};
 for(const row of results)for(const [k,v] of Object.entries(row.driver||{}))
  driver[k]=(driver[k]||0)+v;
 const summary={
  policy:HARD_AI_POLICY,
  baseline:'chooseLegacyHardAiAction',
  decks:roster.map(d=>({key:d.key,name:d.name})),
  seed0,seedCount,games:results.length,
  wins,losses,interrupts:interrupts.length,
  winRate:wins/results.length,
  wilson95:wilson(wins,results.length),
  whenFirst:bucket(results.filter(r=>r.first===0)),
  whenSecond:bucket(results.filter(r=>r.first===1)),
  pairings,
  ai:{...ai,meanMs:ai.decisions?ai.ms/ai.decisions:0},
  driver,
  interruptSamples:interrupts.slice(0,12).map(r=>({
   decks:r.newDeck+'/'+r.oldDeck,first:r.first,seed:r.seed,
   steps:r.steps,endReason:r.endReason,error:r.error||null
  })),
  target:0.6,
  metTarget:wins/results.length>=0.6&&interrupts.length===0
 };
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify({summary,results},null,2)+'\n');
 const pct=n=>(100*n).toFixed(1)+'%';
 process.stdout.write('\n'+summary.policy+' vs legacy hard: '+wins+'/'+results.length+
  ' = '+pct(summary.winRate)+' Wilson95 ['+pct(summary.wilson95.low)+', '+
  pct(summary.wilson95.high)+']\n');
 process.stdout.write('first '+summary.whenFirst.wins+'/'+summary.whenFirst.games+
  ' second '+summary.whenSecond.wins+'/'+summary.whenSecond.games+
  ' interrupts '+interrupts.length+'\n');
 for(const [name,row] of Object.entries(pairings))
  process.stdout.write(name+' '+row.wins+'/'+row.games+' ('+pct(row.winRate)+')\n');
 process.stdout.write('decisions '+ai.decisions+' mean '+summary.ai.meanMs.toFixed(2)+
  'ms max '+ai.maxMs.toFixed(1)+'ms budget '+ai.budgetExhausted+
  ' unsupported '+ai.unsupported+' exceptions '+ai.exceptions+
  ' overrides '+ai.overrides+' kept '+ai.kept+' uncompared '+(ai.uncompared||0)+'\n');
 process.stdout.write('driver '+JSON.stringify(driver)+'\n');
 process.stdout.write((summary.metTarget?'MET':'BELOW')+' target 60%  '+out+'\n');
}
