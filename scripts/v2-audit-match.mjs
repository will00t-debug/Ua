#!/usr/bin/env node
// [V2-E] Multi-seed ALL-REAL V2 cross-title full-match acceptance.
// Unlike synthetic fixture tests, no TEST-ONLY cards are permitted here.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';

const root=path.resolve(import.meta.dirname,'..');
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const out=path.join(root,'audit','v2-e-match-replays');
fs.mkdirSync(out,{recursive:true});
const bleach=verifiedBleachPurplePilotDeck();
const ttg=verifiedTtgRedPilotDeck();
const jobs=[
 {id:'ttg-vs-bleach-747',seed:747,first:0,left:ttg,right:bleach},
 {id:'ttg-vs-bleach-20261015',seed:20261015,first:1,left:ttg,right:bleach},
 {id:'bleach-vs-ttg-20261016',seed:20261016,first:0,left:bleach,right:ttg},
 {id:'bleach-vs-ttg-20261017',seed:20261017,first:1,left:bleach,right:ttg}
];
const budget=4500,results=[];
for(const job of jobs){
 const packs=[job.left.pack,job.right.pack];
 const decks=[job.left.counts,job.right.counts];
 const log={audit_commit:commit,node:process.version,command:'node scripts/v2-audit-match.mjs',
  seed:job.seed,first:job.first,ids:packs.map(p=>p.id),
  decks,action_budget:budget,actions:[],state:'not_run'};
 try{
  for(let i=0;i<2;i++){
   const issues=validateUniversalDeck(packs[i],decks[i]);
   if(issues.length)throw Error('Player '+i+' invalid real deck: '+issues.join(';'));
   if(Object.keys(decks[i]).some(id=>!packs[i].cards[id]||id.includes('TEST')))
    throw Error('Artificial/unported card in real match');
  }
  let state=newUniversalMatch(packs,{decks,seed:job.seed,first:job.first});
  assertUniversalMatch(packs,state);
  for(let n=0;n<budget&&state.status==='playing';n++){
   const actions=legalUniversalActions(packs,state);
   if(!actions.length)throw Error('Stalled state: 0 legal actions at '+n);
   const action=chooseUniversalAiAction(packs,state,{difficulty:'normal'});
   if(!action||!actions.some(a=>JSON.stringify(a)===JSON.stringify(action)))
    throw Error('AI chose illegal action at '+n+': '+JSON.stringify(action));
   log.actions.push({step:n,turn:state.turn,phase:state.phase,active:state.active,
    pending:state.pending?.kind||null,action});
   const before=state;
   state=dispatchUniversalAction(packs,state,action);
   if(n%20===0||state.status==='finished'){
    assertUniversalMatch(packs,state);
    for(let p=0;p<2;p++){
     const view=universalPublicView(packs,state,p);
     if(view.players[1-p].hand!==null)throw Error('Opponent hand disclosed at '+n);
     // Public historical reveal logs can retain a previously revealed UID
     // even if that card later returns to hand. Only a CURRENT live-view
     // disclosure is a violation; never suppress front/energy/outside leaks.
     const hidden=state.players[1-p].hand.map(c=>c.uid);
     const currentView={...view,publicReveals:[]};
     if(hidden.some(uid=>JSON.stringify(currentView).includes(JSON.stringify(uid))))
      throw Error('Opponent CURRENT private UID disclosed at '+n);
    }
    if(state===before)throw Error('Reducer did not advance at '+n);
   }
  }
  log.steps=log.actions.length;
  log.endReason=state.endReason||null;log.winner=state.winner;
  log.state=state.status==='finished'?'pass':'fail';
  if(log.state!=='pass')throw Error('Nonterminal game after '+budget+' actions; not accepted');
  assertUniversalMatch(packs,state);
 }catch(e){
  log.state='fail';log.error=String(e?.stack||e);
  results.push({id:job.id,seed:job.seed,steps:log.actions.length,status:'fail',error:log.error});
  fs.writeFileSync(path.join(out,job.id+'.json'),JSON.stringify(log,null,2)+'\n');
  continue;
 }
 // All match transcripts are reproducible; retain seed/actions/outcome.
 results.push({id:job.id,seed:job.seed,steps:log.steps,
  status:log.state,winner:log.winner,endReason:log.endReason});
 fs.writeFileSync(path.join(out,job.id+'.json'),JSON.stringify(log,null,2)+'\n');
}
fs.writeFileSync(path.join(out,'summary.json'),
 JSON.stringify({audit_commit:commit,node:process.version,results},null,2)+'\n');
console.log(JSON.stringify({audit_commit:commit,node:process.version,results},null,2));
if(results.some(r=>r.status!=='pass'))process.exitCode=1;
