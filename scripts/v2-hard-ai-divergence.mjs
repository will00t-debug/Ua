#!/usr/bin/env node
// First-divergence check for recorded hard-search-3 losses.
// Seat 0 plays the candidate and seat 1 plays frozen hard-search-2. Whenever
// seat 0's action differs, both actions are applied to copies of that state
// and both copies finish under frozen hard-search-2. The pair shares the
// pre-fork state and the same continuation policy. Search-2 does not draw a
// second hidden sample, so the pair is the matched comparison.
//
// The 98001 matrix is read, not rewritten.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {chooseFrozenHardSearch2} from '../dist/universal-v2/hard-ai-search-2.mjs';
import {chooseStrengthenedHardAction as chooseHardSearch3}
 from '../dist/universal-v2/hard-ai-search-3.mjs';

const STEP_CAP=Number(process.env.HARD_AI_STEPS||8000);
const FORK_CAP=Number(process.env.HARD_AI_FORKS||4);
const WIN_REASONS=new Set(['life-zero','unblocked-attack','required-draw-empty']);
const same= (a,b)=>JSON.stringify(a)===JSON.stringify(b);

function roster(){
 const pack=createBleachV2Pack();
 return Object.fromEntries(summarizeDesignatedDecks(id=>!!pack.cards[id]).map(row=>[
  row.key,{name:row.name,counts:designatedPlayableCounts(row)}
 ]));
}
function classify(action){
 if(!action)return 'other';
 if(action.type==='openingMulligan')return 'opening';
 if(action.type==='extraDraw')return 'search';
 if(action.type==='attack'||action.type==='raid'||action.type==='chooseBlock')return 'attack';
 if(action.type==='play'||action.type==='move')return 'resource';
 if(action.type==='activate'||/pay|discard/i.test(action.type||'')||action.mode==='pay')return 'payment';
 return action.type||'other';
}
function brief(action){
 if(!action)return null;
 const out={type:action.type||null,mode:action.mode||null,line:action.line||null};
 if(action.uid)out.uid=action.uid;
 if(action.baseUid)out.baseUid=action.baseUid;
 return out;
}
function viewOf(state){
 const actor=state.pending?.player??state.active;
 return {
  turn:state.turn,phase:state.phase,active:state.active,actor,
  pending:state.pending?.kind||null,
  life:state.players.map(p=>p.life.length),
  energy:state.players.map(p=>p.energy.filter(Boolean).map(c=>c.cardId)),
  front:state.players.map(p=>p.front.filter(Boolean).map(c=>c.cardId)),
  hand:state.players[actor].hand.map(c=>c.cardId),
  deck:state.players.map(p=>p.deck.length)
 };
}
function outcomeOf(state,steps,error){
 if(error)return {outcome:'interrupt',endReason:null,winner:null,steps,error};
 if(state.status!=='finished')return {outcome:'interrupt',endReason:state.endReason||null,winner:null,steps};
 const winner=Number.isInteger(state.winner)?state.winner:null;
 const endReason=state.endReason||null;
 const outcome=winner===0&&WIN_REASONS.has(endReason)?'win':
  winner===1&&WIN_REASONS.has(endReason)?'loss':'interrupt';
 return {outcome,endReason,winner,steps};
}
function ask(packs,state,phaseCount,choose){
 const actor=state.pending?.player??state.active;
 return chooseProgressSafeAiAction(packs,state,{
  difficulty:'hard',actionsInPhase:phaseCount[actor],choose
 });
}
function finishFrozen(packs,state,phaseCount,left){
 let s=state,steps=0,error=null;
 try{
  while(steps<left&&s.status==='playing'){
   const actor=s.pending?.player??s.active;
   const key=s.turn+'|'+s.active+'|'+s.phase;
   if(phaseCount.key[actor]!==key){phaseCount.key[actor]=key;phaseCount.n[actor]=0;}
   const picked=ask(packs,s,phaseCount.n,chooseFrozenHardSearch2);
   if(!picked.action)throw Error('no legal action');
   s=dispatchUniversalAction(packs,s,picked.action,{actor});
   phaseCount.n[actor]++;
   steps++;
  }
  assertUniversalMatch(packs,s);
 }catch(e){error=String(e?.message||e);}
 return {...outcomeOf(s,steps,error),stateSteps:steps};
}
function play(job){
 const pack=createBleachV2Pack();
 const packs=[pack,pack];
 const phaseKey=[null,null],phaseCount=[0,0];
 const classes={};
 let s=newUniversalMatch(packs,{decks:[job.newCounts,job.oldCounts],seed:job.seed,first:job.first});
 const forks=[];
 let divergences=0,steps=0,error=null;
 try{
  for(;steps<STEP_CAP&&s.status==='playing';steps++){
   const actor=s.pending?.player??s.active;
   const key=s.turn+'|'+s.active+'|'+s.phase;
   if(phaseKey[actor]!==key){phaseKey[actor]=key;phaseCount[actor]=0;}
   let picked;
   if(actor===0){
    const neu=ask(packs,s,phaseCount,chooseHardSearch3);
    const old=ask(packs,s,phaseCount,chooseFrozenHardSearch2);
    if(!same(neu.action,old.action)){
     divergences++;
     const kind=classify(neu.action)+'/'+classify(old.action);
     classes[kind]=(classes[kind]||0)+1;
     if(forks.length<FORK_CAP){
      const base=structuredClone(s);
      const branch=(action)=>{
       const start=structuredClone(base);
       const actorNow=start.pending?.player??start.active;
       const after=dispatchUniversalAction(packs,start,action,{actor:actorNow});
       const key=[...phaseKey],n=[...phaseCount];
       const afterActor=after.pending?.player??after.active;
       const afterKey=after.turn+'|'+after.active+'|'+after.phase;
       if(key[afterActor]===afterKey)n[afterActor]=phaseCount[afterActor]+1;
       else {key[afterActor]=afterKey;n[afterActor]=0;}
       const cont=finishFrozen(packs,after,{key,n},STEP_CAP-steps-1);
       return {action:brief(action),class:classify(action),...cont};
      };
      const candidate=branch(neu.action);
      const frozen=branch(old.action);
      forks.push({
       step:steps,kind,view:viewOf(s),
       candidate,frozen,
       decisive:candidate.outcome!==frozen.outcome
      });
     }
    }
    picked=neu;
   }else picked=ask(packs,s,phaseCount,chooseFrozenHardSearch2);
   if(!picked.action)throw Error('no legal action');
   s=dispatchUniversalAction(packs,s,picked.action,{actor});
   phaseCount[actor]++;
  }
  assertUniversalMatch(packs,s);
 }catch(e){error=String(e?.message||e);}
 const decisive=forks.find(row=>row.decisive)||null;
 return {
  newDeck:job.newKey,oldDeck:job.oldKey,first:job.first,seed:job.seed,
  played:outcomeOf(s,steps,error),
  divergences,classes,forks,
  decisiveStep:decisive?.step??null,
  decisiveKind:decisive?.kind??null
 };
}

const decks=roster();
const audit=JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),
 '../audit/v2-hard-ai-round3-98001.json'),'utf8'));
const wanted=[
 ['white-sword','white-sword'],
 ['reject-blue','renruki']
];
const jobs=[];
for(const [neu,old] of wanted){
 const row=audit.results.find(r=>r.outcome==='loss'&&r.newDeck===neu&&r.oldDeck===old&&r.first===0);
 if(!row)throw Error('No recorded loss for '+neu+'/'+old);
 jobs.push({
  newKey:neu,oldKey:old,first:row.first,seed:row.seed,
  newCounts:decks[neu].counts,oldCounts:decks[old].counts
 });
}
const results=jobs.map(job=>{
 const started=Date.now();
 const row=play(job);
 process.stdout.write(row.newDeck+'/'+row.oldDeck+' seed='+row.seed+
  ' played='+row.played.outcome+' forks='+row.forks.length+
  ' decisive='+(row.decisiveKind||'none')+' '+((Date.now()-started)/1000).toFixed(0)+'s\n');
 return row;
});
const summary={
 source:'audit/v2-hard-ai-round3-98001.json',
 continuation:'hard-search-2',
 pairing:'same pre-fork state, both branches then use frozen hard-search-2',
 games:results.map(row=>({
  decks:row.newDeck+'/'+row.oldDeck,seed:row.seed,first:row.first,
  played:row.played.outcome,divergences:row.divergences,
  decisiveKind:row.decisiveKind,decisiveStep:row.decisiveStep
 }))
};
const out=resolve(dirname(fileURLToPath(import.meta.url)),'../audit/v2-hard-ai-divergence-98001.json');
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({summary,results},null,2)+'\n');
process.stdout.write(out+'\n');
