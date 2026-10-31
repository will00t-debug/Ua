#!/usr/bin/env node
// Cross-title acceptance for hard-search-2. Builds one legal 50-card deck
// per registered title so the match actually contains raid, compound
// choices, bring-out, recovery, payment, standing, attack-end swap and
// block restrictions when that title's registered cards have them.
// Existing preview presets are smoked separately. This is not the BLEACH
// 60% holdout (94001). Seeds 96001+ were not used to tune scores.
// Interrupts stay in the denominator. Mulligan and order windows stay on
// the legacy policy; see ORDER_KINDS in hard-ai.mjs.
//
//   HARD_AI_CROSS_DRY=1 node scripts/v2-hard-ai-cross-title.mjs
//   HARD_AI_WORKERS=4 node scripts/v2-hard-ai-cross-title.mjs
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {listRegisteredV2Titles,requireRegisteredV2TitlePack}
 from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseLegacyHardAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {resetHardAiReport,hardAiReport,lastHardAiTrace,HARD_AI_POLICY}
 from '../dist/universal-v2/hard-ai.mjs';

const STEP_CAP=Number(process.env.HARD_AI_STEPS||8000);
const WIN_REASONS=new Set(['life-zero','unblocked-attack','required-draw-empty']);
const NEED=['raid','compound','bring','recover','pay','stand','swap','block'];

function opsOf(card){
 const ops=new Set();
 const seen=new Set();
 const walk=value=>{
  if(!value||typeof value!=='object'||seen.has(value))return;
  seen.add(value);
  if(typeof value.op==='string')ops.add(value.op);
  if(Array.isArray(value))for(const item of value)walk(item);
  else for(const item of Object.values(value))walk(item);
 };
 walk(card);
 return ops;
}
function tagsOf(card){
 const ops=opsOf(card),tags=[];
 if(card.raidName)tags.push('raid');
 if([...ops].some(op=>op==='chooseOne'||op==='chooseTwoAfterOwnRaid'||
  op==='gunmenModeSubset'||op.startsWith('chooseEnergy')))tags.push('compound');
 if([...ops].some(op=>op.startsWith('deploy')))tags.push('bring');
 if([...ops].some(op=>op.toLowerCase().includes('recover')))tags.push('recover');
 if([...ops].some(op=>/^(discardGate|discardHand|optionalPayApThen|payAp|oncePayProgram)/.test(op)))
  tags.push('pay');
 if([...ops].some(op=>/^(activeSelf|activeOwn|activeOne|activeTraitless|ready|nameOnceActive|cardOnceActive|discardHandThenActive)/.test(op)))
  tags.push('stand');
 // Attack-end and energy-line swaps. A main-phase swap-or-buff is not this.
 if(card.attackEndSwap||card.energyLineAttackEndSwap||card.energyAttackSwap||
  [...ops].some(op=>/AttackEndSwap|swapEnergy|onceMandatorySwap|maySwapOwnFront|restGenEnergySwap/.test(op)))
  tags.push('swap');
 if((card.blockEnergyMin>0)||card.blockBpRestriction||card.mustBlock||card.forceHigherBpBlock||
  [...ops].some(op=>/Block/.test(op)&&!/Unblocked/.test(op)))tags.push('block');
 return tags;
}
function buildCoverageDeck(pack){
 const cards=Object.values(pack.cards);
 const counts={};
 const trig={final:0,color:0,special:0};
 let total=0;
 const covered=new Set();
 const examples={};
 const canAdd=(card,n)=>{
  const have=counts[card.id]||0;
  const limit=Number.isInteger(card.maxCopies)?card.maxCopies:4;
  if(n<1||have+n>limit||total+n>50)return false;
  if(Object.prototype.hasOwnProperty.call(trig,card.trigger)&&trig[card.trigger]+n>4)return false;
  return true;
 };
 const add=(card,n)=>{
  if(!canAdd(card,n))return false;
  counts[card.id]=(counts[card.id]||0)+n;
  total+=n;
  if(Object.prototype.hasOwnProperty.call(trig,card.trigger))trig[card.trigger]+=n;
  for(const tag of tagsOf(card)){
   if(!examples[tag])examples[tag]=card.id;
   covered.add(tag);
  }
  return true;
 };
 const take=card=>add(card,2)||add(card,1);
 for(const tag of NEED){
  if(covered.has(tag))continue;
  const options=cards.filter(card=>tagsOf(card).includes(tag)).sort((a,b)=>{
   const extra=card=>tagsOf(card).filter(item=>!covered.has(item)).length;
   return extra(b)-extra(a)||(a.trigger?1:0)-(b.trigger?1:0)||(a.energy||0)-(b.energy||0);
  });
  for(const card of options)if(take(card))break;
 }
 const gens=cards.filter(card=>card.type==='character'&&card.gen>0&&!card.trigger&&(card.energy||0)<=2)
  .sort((a,b)=>(b.gen||0)-(a.gen||0)||(a.energy||0)-(b.energy||0));
 for(const card of gens){
  if(total>=24)break;
  add(card,Math.min(4-(counts[card.id]||0),50-total));
 }
 const fillers=[...cards].sort((a,b)=>{
  const rank=card=>(card.trigger?2:0)+(card.type==='character'?0:1)+(card.energy||9);
  return rank(a)-rank(b)||String(a.id).localeCompare(String(b.id));
 });
 let guard=0;
 while(total<50&&guard++<400){
  let progressed=false;
  for(const card of fillers){
   if(add(card,1)){progressed=true;if(total>=50)break;}
  }
  if(!progressed)break;
 }
 const problems=validateUniversalDeck(pack,counts);
 if(problems.length||total!==50)throw Error(pack.id+' coverage deck: '+problems.join('; '));
 return {counts,covered:[...covered].sort(),missing:NEED.filter(tag=>!covered.has(tag)),examples};
}

function emptyTally(){
 return {decisions:0,pass:0,budget:0,legacyMiss:0,noLegal:0,exception:0,
  invalid:0,empty:0,phaseBudget:0,deferred:0,forced:0};
}
function isPass(action){
 return !!action&&(action.type==='next'||action.mode==='skip'||action.mode==='decline');
}
function tally(bucket,picked,trace,before,after){
 bucket.decisions++;
 if(picked.reason==='phase-budget')bucket.phaseBudget++;
 else if(picked.reason==='ai-exception')bucket.exception++;
 else if(picked.reason==='invalid-ai-choice')bucket.invalid++;
 else if(picked.reason==='empty-ai-choice')bucket.empty++;
 else if(isPass(picked.action))bucket.pass++;
 if(trace?.reason==='budget')bucket.budget++;
 if(trace?.reason==='deferred')bucket.deferred++;
 if(trace?.reason==='forced')bucket.forced++;
 if(trace?.reason==='no-legal')bucket.noLegal++;
 if(trace?.reason==='exception')bucket.exception++;
 if(after&&before&&after.legacyMiss>before.legacyMiss)bucket.legacyMiss++;
}
function play(job){
 resetHardAiReport();
 const packs=job.packs;
 const driver={neu:emptyTally(),old:emptyTally()};
 const kinds={};
 const started=performance.now();
 const entry={
  label:job.label,preset:job.preset||null,titles:job.titles,first:job.first,seed:job.seed,
  steps:0,turn:0,finished:false,winner:null,endReason:null,outcome:'interrupt'
 };
 try{
  let s=newUniversalMatch(packs,{decks:job.decks,seed:job.seed,first:job.first});
  assertUniversalMatch(packs,s);
  const phaseKey=[null,null],phaseCount=[0,0];
  for(let step=0;step<STEP_CAP&&s.status==='playing';step++){
   const actor=s.pending?.player??s.active;
   if(s.pending?.kind)kinds[s.pending.kind]=(kinds[s.pending.kind]||0)+1;
   const key=s.turn+'|'+s.active+'|'+s.phase;
   if(phaseKey[actor]!==key){phaseKey[actor]=key;phaseCount[actor]=0;}
   const before=actor===0?hardAiReport():null;
   const picked=actor===0
    ? chooseProgressSafeAiAction(packs,s,{difficulty:'hard',actionsInPhase:phaseCount[actor]})
    : chooseProgressSafeAiAction(packs,s,{
     difficulty:'hard',actionsInPhase:phaseCount[actor],choose:chooseLegacyHardAiAction
    });
   const trace=actor===0?lastHardAiTrace():null;
   tally(actor===0?driver.neu:driver.old,picked,trace,before,actor===0?hardAiReport():null);
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
 entry.kinds=kinds;
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
function bucket(list){
 const w=list.filter(r=>r.outcome==='win').length;
 return {games:list.length,wins:w,losses:list.filter(r=>r.outcome==='loss').length,
  interrupts:list.filter(r=>r.outcome==='interrupt').length,
  winRate:list.length?w/list.length:0,wilson95:wilson(w,list.length)};
}

function jobsFor(){
 const titles=listRegisteredV2Titles().map(row=>row.title);
 const built={};
 for(const title of titles){
  const pack=requireRegisteredV2TitlePack(title);
  built[title]={pack,deck:buildCoverageDeck(pack)};
 }
 const presets=createAllV2PreviewRealDecks();
 const jobs=[];
 const mirrorSeeds=4,crossSeeds=2;
 for(const title of titles){
  for(const first of [0,1])for(let i=0;i<mirrorSeeds;i++){
   jobs.push({
    label:'coverage-mirror',titles:[title,title],first,seed:96001+i,
    decks:[built[title].deck.counts,built[title].deck.counts],
    packTitles:[title,title]
   });
  }
 }
 for(let i=0;i<titles.length;i++){
  const a=titles[i],b=titles[(i+1)%titles.length];
  for(const first of [0,1])for(let n=0;n<crossSeeds;n++){
   jobs.push({
    label:'coverage-cross',titles:[a,b],first,seed:96001+n,
    decks:[built[a].deck.counts,built[b].deck.counts],
    packTitles:[a,b]
   });
  }
 }
 for(const key of Object.keys(presets)){
  const preset=presets[key];
  for(const first of [0,1]){
   jobs.push({
    label:'preset-smoke',titles:[preset.pack.id,preset.pack.id],preset:key,
    first,seed:96011,
    decks:[preset.counts,preset.counts],
    packTitles:[preset.pack.id,preset.pack.id]
   });
  }
 }
 return {built,jobs};
}

if(!isMainThread){
 const packs=workerData.packTitles.map(title=>requireRegisteredV2TitlePack(title));
 parentPort.postMessage(play({...workerData,packs}));
}else{
 const {built,jobs}=jobsFor();
 const coverage=Object.fromEntries(Object.entries(built).map(([title,row])=>[title,{
  cards:Object.values(row.deck.counts).reduce((n,v)=>n+v,0),
  ids:Object.keys(row.deck.counts).length,
  covered:row.deck.covered,missing:row.deck.missing,examples:row.deck.examples
 }]));
 if(process.env.HARD_AI_CROSS_DRY==='1'){
  process.stdout.write(JSON.stringify({policy:HARD_AI_POLICY,coverage,jobs:jobs.length},null,2)+'\n');
 }else{
  const workers=Math.max(1,Number(process.env.HARD_AI_WORKERS||3));
  const out=process.env.HARD_AI_OUTPUT||
   resolve(dirname(fileURLToPath(import.meta.url)),'../audit/v2-hard-ai-cross-title-96001.json');
  const results=new Array(jobs.length);
  let cursor=0,finished=0;
  const started=Date.now();
  await new Promise((resolvePromise,reject)=>{
   const launch=()=>{
    if(cursor>=jobs.length)return;
    const index=cursor++;
    const worker=new Worker(fileURLToPath(import.meta.url),{workerData:jobs[index]});
    worker.on('message',result=>{
     results[index]=result;
     finished++;
     const elapsed=((Date.now()-started)/1000).toFixed(0);
     process.stdout.write(finished+'/'+jobs.length+' '+result.label+' '+
      result.titles.join('/')+' first='+result.first+' seed='+result.seed+' '+
      result.outcome+' T'+result.turn+' '+result.steps+' ('+elapsed+'s)\n');
     if(finished===jobs.length)resolvePromise();
     else launch();
    });
    worker.on('error',reject);
   };
   for(let n=0;n<Math.min(workers,jobs.length);n++)launch();
  });
  const addTally=(into,row)=>{
   for(const key of Object.keys(emptyTally()))into[key]=(into[key]||0)+(row?.[key]||0);
  };
  const decisions={neu:emptyTally(),old:emptyTally()};
  const kinds={};
  const samples=[];
  const ai={decisions:0,ms:0,maxMs:0,rootCandidates:0,rootCompared:0,budgetExhausted:0,
   passed:0,deferred:0,legacyMiss:0,exceptions:0,unsupported:0};
  for(const row of results){
   addTally(decisions.neu,row.driver?.neu);
   addTally(decisions.old,row.driver?.old);
   for(const [kind,n] of Object.entries(row.kinds||{}))kinds[kind]=(kinds[kind]||0)+n;
   if(row.ai?.samples)samples.push(...row.ai.samples);
   if(row.ai)delete row.ai.samples;
   for(const key of Object.keys(ai))if(key!=='maxMs')ai[key]+=row.ai?.[key]||0;
   ai.maxMs=Math.max(ai.maxMs,row.ai?.maxMs||0);
  }
  samples.sort((a,b)=>a-b);
  const percentile=p=>samples.length?samples[Math.min(samples.length-1,Math.floor(p*(samples.length-1)))]:0;
  ai.meanMs=ai.decisions?ai.ms/ai.decisions:0;
  ai.p95Ms=percentile(0.95);
  ai.sampleCount=samples.length;
  const groups={};
  for(const label of ['coverage-mirror','coverage-cross','preset-smoke']){
   groups[label]=bucket(results.filter(row=>row.label===label));
  }
  const byTitle={};
  for(const title of Object.keys(coverage)){
   const rows=results.filter(row=>row.label==='coverage-mirror'&&row.titles[0]===title);
   byTitle[title]=bucket(rows);
  }
  const interrupts=results.filter(row=>row.outcome==='interrupt');
  const summary={
   policy:HARD_AI_POLICY,
   baseline:'chooseLegacyHardAiAction',
   note:'Acceptance across registered titles. Not the BLEACH 94001 holdout and not a claim that three BLEACH decks represent every title. Opening mulligan and order windows still use the legacy policy.',
   gaps:['opening-mulligan','phase-order','retirement-order','effect-move-order','effect-top-order','effect-raid-witness-order','effect-raid-witness-move','life-batch-order'],
   coverage,groups,byTitle,
   games:results.length,
   wins:results.filter(row=>row.outcome==='win').length,
   losses:results.filter(row=>row.outcome==='loss').length,
   interrupts:interrupts.length,
   decisions,kinds,ai,
   interruptSamples:interrupts.slice(0,12).map(row=>({
    label:row.label,titles:row.titles,first:row.first,seed:row.seed,
    steps:row.steps,endReason:row.endReason,error:row.error||null
   }))
  };
  mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify({summary,results},null,2)+'\n');
  process.stdout.write(JSON.stringify({coverage,groups,byTitle,decisions,ai,interrupts:interrupts.length,out},null,2)+'\n');
 }
}
