#!/usr/bin/env node
// Paired, same-engine SLG ablations. This is an observational controlled
// benchmark, NOT proof that any one heuristic causally causes wins.
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {createUniversalAiObservation as round1Observation} from '../tests/fixtures/ai-round1/ai-observation.mjs';
import {chooseStrategicUniversalAction as round1Policy} from '../tests/fixtures/ai-round1/ai-strategy.mjs';

const preset=createAllV2PreviewRealDecks()['solo-leveling'],pack=preset.pack,packs=[pack,pack];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const seeds=(process.env.AI_R3_SLG_SEEDS||'12031,22037,32063').split(',').map(Number);
const variants=[{name:'full',tactical:true,ablation:{}},
 {name:'no-bounce-cost',tactical:true,ablation:{ownBounce:false}},
 {name:'no-discard-cost',tactical:true,ablation:{discardCost:false}},
 {name:'no-free-entry-valuation',tactical:true,ablation:{conditionalFreeEntry:false}},
 {name:'no-energy-continuation',tactical:true,ablation:{energyContinuation:false}},
 {name:'no-native-tactics',tactical:false,ablation:{}}];
// Change one copy to another independently registered, legally playable card.
function secondLegalDeck(){
 const candidates=Object.keys(pack.cards).sort();
 for(const [donor,n] of Object.entries(preset.counts)){
  if(!n)continue;
  for(const recipient of candidates){
   if(recipient===donor||(preset.counts[recipient]||0)>=4||
    pack.cards[recipient]?.color!==pack.cards[donor]?.color)continue;
   const counts={...preset.counts,[donor]:n-1,
    [recipient]:(preset.counts[recipient]||0)+1};
   if(!counts[donor])delete counts[donor];
   if(!validateUniversalDeck(pack,counts).length)
    return {counts,swap:{donor,recipient}};
  }
 }
 return null;
}
const second=secondLegalDeck();
const decks=[{name:'registered-preset',counts:preset.counts,swap:null},
 ...(second?[{name:'registered-one-copy-variant',counts:second.counts,swap:second.swap}]:[])];
const results=[],times={};
function frozenRound1(s,legal){
 const o=round1Observation(packs,s,legal),a=round1Policy(packs,o);
 if(!legal.some(x=>same(x,a)))
  throw Error('Frozen R1 illegal raw action: '+JSON.stringify(a));
 return a;
}
for(const deck of decks)for(const variant of variants)
 for(const seed of seeds)for(const first of [0,1])for(const seat of [0,1]){
  let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed,first});
  const rec={deck:deck.name,variant:variant.name,seed,first,seat,
   actions:0,illegal:0,finished:false,win:false,
   playEnergy:0,plays:0,raids:0,attacks:0,
   observedPending:[],completedZonePayments:0,
   nativeExactSteps:0,heuristicFrontiers:0,searchNodes:0,
   tacticalFallbacks:{},hardDecisions:0,hardMs:[],
   tacticalEligible:0,tacticalUsed:0,tacticalChanged:0,
   rawIllegal:0,legalFallbacks:0,error:null};
  const kinds=new Set();
  try{
   for(;state.status==='playing'&&rec.actions<1800;rec.actions++){
    const actor=state.pending?.player??state.active;
    const legal=legalUniversalActions(packs,state);
    const data={},t=performance.now();
    const a=actor===seat?
     chooseUniversalAiAction(packs,state,{difficulty:'hard',tactical:variant.tactical,
      ablation:variant.ablation,telemetry:data}):frozenRound1(state,legal);
    if(actor===seat){
     rec.hardDecisions++;rec.hardMs.push(performance.now()-t);
     rec.searchNodes+=data.searchNodes||0;
     rec.nativeExactSteps+=data.nativeExactSteps||0;
     rec.heuristicFrontiers+=data.heuristicFrontiers||0;
     if(data.tacticalEligible)rec.tacticalEligible++;
     if(data.tacticalUsed)rec.tacticalUsed++;
     if(data.tacticalChanged)rec.tacticalChanged++;
     if(data.rawActionLegal===false)rec.rawIllegal++;
     if(data.legalFallback)rec.legalFallbacks++;
     if(data.tacticalFallback)rec.tacticalFallbacks[data.tacticalFallback]=
      (rec.tacticalFallbacks[data.tacticalFallback]||0)+1;
     if(a?.type==='play'){rec.plays++;if(a.line==='energy')rec.playEnergy++;}
     if(a?.type==='raid')rec.raids++;
     if(a?.type==='attack')rec.attacks++;
    }
    if(!a||!legal.some(x=>same(x,a))){rec.illegal++;throw Error('non-native action');}
    if(state.pending)kinds.add(state.pending.kind);
    const next=dispatchUniversalAction(packs,state,a,{actor});
    if(actor===seat){
     rec.completedZonePayments+=(next.zoneMoveEvents?.length||0)-
      (state.zoneMoveEvents?.length||0)>0?
      next.zoneMoveEvents.slice(state.zoneMoveEvents.length)
       .filter(e=>e.owner===seat&&e.reason==='payment').length:0;
    }
    state=next;
    if(rec.actions%100===0)assertUniversalMatch(packs,state);
   }
   assertUniversalMatch(packs,state);
   rec.finished=state.status==='finished';rec.win=rec.finished&&state.winner===seat;
  }catch(e){rec.error=String(e.stack||e);
   rec.failureSnapshot={status:state.status,phase:state.phase,active:state.active,
    pending:state.pending,turn:state.turn,players:state.players,
    legal:legalUniversalActions(packs,state)};
  }
  rec.observedPending=[...kinds].sort();
  results.push(rec);
  const k=variant.name;times[k]??=[];
  times[k].push(...rec.hardMs);delete rec.hardMs;
 }
const pct=(array,p)=>array.length?array[Math.min(array.length-1,Math.floor(array.length*p))]:0;
const stat=rs=>({
 games:rs.length,wins:rs.filter(r=>r.win).length,
 illegal:rs.reduce((n,r)=>n+r.illegal,0),
 unfinished:rs.filter(r=>!r.finished).length,
 winRate:rs.filter(r=>r.win).length/(rs.length||1),
 raids:rs.reduce((n,r)=>n+r.raids,0),
 paidZoneMoves:rs.reduce((n,r)=>n+r.completedZonePayments,0),
 exactStepExpansions:rs.reduce((n,r)=>n+r.nativeExactSteps,0),
 heuristicAttackFrontiers:rs.reduce((n,r)=>n+r.heuristicFrontiers,0),
 searchNodes:rs.reduce((n,r)=>n+r.searchNodes,0),
 tacticalEligible:rs.reduce((n,r)=>n+r.tacticalEligible,0),
 tacticalUsed:rs.reduce((n,r)=>n+r.tacticalUsed,0),
 tacticalChanged:rs.reduce((n,r)=>n+r.tacticalChanged,0),
 tacticalChangeRate:rs.reduce((n,r)=>n+r.tacticalChanged,0)/
  (rs.reduce((n,r)=>n+r.tacticalEligible,0)||1),
 rawIllegal:rs.reduce((n,r)=>n+r.rawIllegal,0),
 legalFallbacks:rs.reduce((n,r)=>n+r.legalFallbacks,0),
 fallbacks:rs.reduce((o,r)=>{for(const [key,n] of Object.entries(r.tacticalFallbacks))
  o[key]=(o[key]||0)+n;return o;},{}),
 observedPending:[...new Set(rs.flatMap(r=>r.observedPending))].sort()
});
const report={kind:'SLG matched 50-card native V2 ablations against frozen first-round Hard',
 disclaimer:'Not causal: baseline interactions, limited seeds and registry constrain inference. Unnecessary bounce, lost critical defense and unbuildable board need independently specified provenance metrics; they are not inferred from simple counts.',
 seeds,decks:decks.map(x=>({name:x.name,swap:x.swap,validation:validateUniversalDeck(pack,x.counts)})),
 byVariant:Object.fromEntries(variants.map(v=>[v.name,stat(results.filter(r=>r.variant===v.name))])),
 byDeck:Object.fromEntries(decks.map(d=>[d.name,Object.fromEntries(variants.map(v=>[v.name,stat(results.filter(r=>r.variant===v.name&&r.deck===d.name))]))])),
 byInitiative:Object.fromEntries(['first','second'].map(key=>[key,Object.fromEntries(variants.map(v=>[v.name,stat(results.filter(r=>r.variant===v.name&&(r.seat===r.first?'first':'second')===key))]))])),
 timing:Object.fromEntries(Object.entries(times).map(([key,x])=>{x.sort((a,b)=>a-b);return [key,{
  decisions:x.length,meanMs:x.reduce((a,b)=>a+b,0)/(x.length||1),p95Ms:pct(x,.95),p99Ms:pct(x,.99)
 }]})),records:results};
mkdirSync('audit',{recursive:true});
writeFileSync('audit/v2-ai-round3-slg-ablation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,records:undefined},null,2));
if(results.some(r=>r.illegal||r.rawIllegal||r.legalFallbacks||!r.finished||r.error))process.exitCode=1;
