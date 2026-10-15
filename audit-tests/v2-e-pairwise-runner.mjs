// [V2-E] Scratch-only cross-title ALL-REAL 5-title tournament.
// Copy into tests/ in a detached PR70 snapshot with pinned B/C/D modules.
import fs from 'node:fs';
import path from 'node:path';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {saoV2Pack} from '../dist/universal-v2/sao-pack.mjs';
import {mstV2Pack} from '../dist/universal-v2/mst-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const packs=[createBleachV2Pack(),createTtgV2Pack(),createSlgV2Pack(),saoV2Pack(),mstV2Pack()];
const out=process.env.V2_E_OUTPUT||path.resolve('audit/v2-e-round2-scratch-matches');
fs.mkdirSync(out,{recursive:true});
const reported=[];
function validDeck(pack){
 const cards=Object.values(pack.cards);
 if(cards.some(c=>/TEST|FAKE/i.test(c.id)))throw Error('Synthetic card in contributed pack');
 const sorted=cards.slice().sort((a,b)=>{
  const restricted=c=>['final','color','special'].includes(c.trigger)?10:0;
  const score=c=>restricted(c)+(c.type==='character'?0:5)
    +(c.energy===0?-10:c.energy===1?-6:c.energy===2?-3:c.energy*1.5)
    -Math.min(2,c.gen||0);
  return score(a)-score(b)||a.id.localeCompare(b.id);
 });
 const counts={},caps={final:0,color:0,special:0};let n=0;
 for(const c of sorted){
  const restricted=Object.prototype.hasOwnProperty.call(caps,c.trigger);
  const allowed=restricted?Math.min(4,4-caps[c.trigger]):4;
  const amount=Math.min(allowed,50-n);
  if(amount<=0)continue;
  counts[c.id]=amount;n+=amount;
  if(restricted)caps[c.trigger]+=amount;
  if(n===50)break;
 }
 const errs=validateUniversalDeck(pack,counts);
 if(n!==50||errs.length)throw Error('Cannot build valid source card deck '+pack.id+': '+errs.join(';')+' n='+n);
 if(Object.keys(counts).length<13)throw Error('Fewer than 13 real identities '+pack.id);
 return counts;
}
const decks=packs.map(validDeck);
const rounds=[747,20261015,20261016];const MAX=1600;
for(let a=0;a<packs.length;a++)for(let b=a+1;b<packs.length;b++)
 for(const first of [0,1])for(const seed of rounds){
 const job={pair:[packs[a].id,packs[b].id],ids:[a,b],first,seed,
  executed_on:'scratch_contribution_aggregate_NOT_PR70_REGISTRY',
  packs:[packs[a].version,packs[b].version],decks:[decks[a],decks[b]],
  step_limit:MAX,steps:[],status:'not_run'};
 const tag=[a,b,'f'+first,'s'+seed].join('-');
 try{
  const pair=[packs[a],packs[b]];
  let s=newUniversalMatch(pair,{decks:job.decks,seed,first});
  for(let step=0;step<MAX&&s.status==='playing';step++){
   const choices=legalUniversalActions(pair,s);
   if(!choices.length)throw Error('No legal actions at step '+step);
   const action=chooseUniversalAiAction(pair,s,{difficulty:'normal'});
   if(!action||!choices.some(c=>JSON.stringify(c)===JSON.stringify(action)))
    throw Error('AI illegal/missing action at step '+step+': '+JSON.stringify(action));
   job.steps.push({step,turn:s.turn,active:s.active,phase:s.phase,
    pending:s.pending?.kind||null,action});
   s=dispatchUniversalAction(pair,s,action);
   if(step%15===0||s.status!=='playing'){
    assertUniversalMatch(pair,s);
    for(let p=0;p<2;p++){
     const view=universalPublicView(pair,s,p);
     if(view.players[1-p].hand!==null)throw Error('Private hand leaked at step '+step);
    }
   }
  }
  job.endReason=s.endReason;job.winner=s.winner;
  job.status=s.status==='finished'?'pass':'fail';
  if(job.status!=='pass')job.error='Nonterminal after '+MAX+' actions';
 }catch(err){job.status='fail';job.error=String(err?.stack||err);}
 fs.writeFileSync(path.join(out,tag+'.json'),JSON.stringify(job,null,2)+'\n');
 reported.push({id:tag,pair:job.pair,first,seed,actions:job.steps.length,
  status:job.status,endReason:job.endReason||null,error:job.error||null});
 console.log(tag+' '+job.status+' '+job.steps.length+(job.error?' '+job.error.split('\n')[0]:''));
}
const summary={kind:'SCRATCH_NOT_INTEGRATED',node:process.version,
 source:process.env.V2_E_SOURCE||'PR70+fixed-B/C/D-scratch',
 sourcePacks:packs.map((p,i)=>({title:p.id,cards:Object.keys(p.cards).length,
  deck:decks[i]})),
 total:reported.length,finished:reported.filter(r=>r.status==='pass').length,
 failed:reported.filter(r=>r.status!=='pass').length,results:reported};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log('SCRATCH MATRIX: '+summary.finished+'/'+summary.total+' finished; failures '+summary.failed);
if(summary.failed)process.exitCode=1;
