// Matched A/B comparison: baseline hybrid-start-hard-v1 and guarded variant
// versus the unchanged live hard-search-2. 50 new seeds * 4 seats/first * 2 arms.
import {writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {HYBRID_START_HARD_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {lastLifeGuard} from '../dist/universal-v2/ai-v3/last-life-guard.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),shard=Number(process.env.SHARD||0);
const deck=battleDecks().find(d=>d.id==='white-sword');
const packs=[deck.pack,deck.pack],maxSteps=1200;
const current=s=>s.pending?.player??s.active;
function play(initial,seed,first,hybridSeat,arm){
 let s=structuredClone(initial),steps=0,illegal=0,fallbacks=0,overrides=0;
 const phaseKeys=['',''],phaseCounts=[0,0],examples=[];
 while(s.status==='playing'&&steps<maxSteps){
  const actor=current(s),legal=legalUniversalActions(packs,s);
  const key=s.turn+'|'+s.active+'|'+s.phase;
  if(phaseKeys[actor]!==key){phaseKeys[actor]=key;phaseCounts[actor]=0;}
  let picked=null;
  if(actor===hybridSeat){
   const requestId=steps+1,stateVersion=steps+1;
   const request=buildAiV3Request(packs,s,actor,{requestId,stateVersion,seed:1,
    nodes:MATCH_LIMITS.nodes,ms:MATCH_LIMITS.ms,policy:HYBRID_START_HARD_POLICY});
   const result=request?handleAiV3Request(request):null;
   const accepted=acceptAiV3Result({requestId,stateVersion,actor,legal},result);
   if(accepted.ok)picked=accepted.action;
   else fallbacks++;
   if(!picked)picked=chooseProgressSafeAiAction(packs,s,{
    difficulty:'hard',actionsInPhase:phaseCounts[actor]}).action;
   if(arm==='B'){
    const rescue=lastLifeGuard(packs,s,actor,picked,legal);
    if(rescue.overrode){
     overrides++;
     if(examples.length<6)examples.push({step:steps,life:s.players[actor].life.length,
      turn:s.turn,reason:rescue.reason,attackBp:rescue.attackerBp,
      impact:rescue.impact,blockerBp:rescue.blockerBp});
     picked=rescue.action;
    }
   }
  }else{
   picked=chooseProgressSafeAiAction(packs,s,{difficulty:'hard',
    actionsInPhase:phaseCounts[actor]}).action;
  }
  const action=legal.find(a=>same(a,picked));
  if(!action){illegal++;break;}
  try{s=dispatchUniversalAction(packs,s,action,{actor});}
  catch(e){console.error('ILLEGAL',e.message);illegal++;break;}
  phaseCounts[actor]++;
  steps++;
 }
 const finished=s.status==='finished'&&illegal===0;
 return {seed,first,hybridSeat,arm,finished,winner:finished?s.winner:null,
  hybridWon:finished&&s.winner===hybridSeat,hardWon:finished&&s.winner===1-hybridSeat,
  steps,illegal,fallbacks,overrides,examples};
}
const pairs=[];
for(let i=0;i<50;i++){
 if(i%4!==shard)continue;
 const seed=9300+i;
 for(const first of [0,1])for(const hybridSeat of [0,1]){
  const opened=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],seed,first)).state;
  const A=play(opened,seed,first,hybridSeat,'A');
  const B=play(opened,seed,first,hybridSeat,'B');
  pairs.push({seed,first,hybridSeat,A,B});
  console.log('PAIR '+JSON.stringify({seed,first,hybridSeat,aWon:A.hybridWon,bWon:B.hybridWon,
   aSteps:A.steps,bSteps:B.steps,override:B.overrides}));
 }
}
const A=pairs.map(x=>x.A),B=pairs.map(x=>x.B);
const rate=xs=>({n:xs.length,wins:xs.filter(x=>x.hybridWon).length,
 losses:xs.filter(x=>x.hardWon).length,
 unfinished:xs.filter(x=>!x.finished).length,
 illegal:xs.reduce((n,x)=>n+x.illegal,0),
 fallbacks:xs.reduce((n,x)=>n+x.fallbacks,0),
 overrides:xs.reduce((n,x)=>n+x.overrides,0)});
const report={head:process.env.GITHUB_SHA,shard,deck:deck.id,
 comparison:'A=live hybrid-start-hard-v1, B=offline last-life-guard candidate; same hard opponent',
 A:rate(A),B:rate(B),firstA:rate(A.filter(x=>x.first===x.hybridSeat)),
 firstB:rate(B.filter(x=>x.first===x.hybridSeat)),
 secondA:rate(A.filter(x=>x.first!==x.hybridSeat)),
 secondB:rate(B.filter(x=>x.first!==x.hybridSeat)),pairs};
writeFileSync('ai-last-life-ab-shard-'+shard+'.json',JSON.stringify(report,null,2));
console.log('AB_RESULT='+JSON.stringify({shard,A:report.A,B:report.B,firstA:report.firstA,
 firstB:report.firstB,secondA:report.secondA,secondB:report.secondB}));
if(A.some(x=>!x.finished||x.illegal)||B.some(x=>!x.finished||x.illegal))process.exitCode=1;
