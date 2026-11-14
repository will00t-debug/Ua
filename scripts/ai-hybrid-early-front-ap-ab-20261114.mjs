// Reproducible first-four-turn AP/4000 diagnostic: same matched opening;
// A=current hybrid-start-hard-v1; B=same policy + offline START AP guard.
// Every AI uses a fixed node count and disabled soft wall clock. This is a
// causal test, not a measurement of the live 40ms time-limited settings.
import {writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {newComparedMatch,applySharedOpening} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {HYBRID_START_HARD_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalBp} from '../dist/universal-v2/engine.mjs';
import {guardEarlyApForFront} from '../dist/universal-v2/ai-v3/early-front-ap-guard.mjs';

const shard=Number(process.env.SHARD||0);
const SEED_BEGIN=9400,SEED_COUNT=20,MAX_STEPS=1200;
const SETTINGS={nodes:48,ms:1e9,seed:1};
const deck=battleDecks().find(x=>x.id==='white-sword');
if(!deck)throw Error('white-sword missing');
const packs=[deck.pack,deck.pack];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const actorOf=s=>s.pending?.player??s.active;
const bp=(s,c)=>{try{return universalBp(packs,s,c)||0;}catch{return 0;}};
function choice(s,step,actor,hybridSeat,phaseCount){
 const legal=legalUniversalActions(packs,s);
 const next=legal.find(a=>a.type==='next');
 let action=null,problem=null;
 if(phaseCount>=72&&next){
  action=next;problem='phase-budget';
 }else if(actor===hybridSeat){
  const requestId=step+1,stateVersion=step+1;
  const message=buildAiV3Request(packs,s,actor,{...SETTINGS,
    requestId,stateVersion,policy:HYBRID_START_HARD_POLICY});
  const result=message?handleAiV3Request(message):null;
  const accepted=acceptAiV3Result({requestId,stateVersion,actor,legal},result);
  if(accepted.ok)action=accepted.action;
  else problem=accepted.reason;
 }else{
  action=chooseStrengthenedHardAction(packs,s,SETTINGS);
 }
 const match=legal.find(a=>same(a,action));
 if(!match)throw Error('AI invalid: '+(problem||'unknown')+' phase='+s.phase+' step='+step);
 return {action:match,legal,problem};
}
function game(initial,seed,first,hybridSeat,arm){
 let s=structuredClone(initial),step=0,ownTurn=0,startId=null;
 let lastOwnTurn=0,first4000=null,first4000After=0,turn4=null;
 const phaseKeys=['',''],phaseCounts=[0,0],events=[];
 const counts={extraDraw:0,playsFront:0,raids:0,playsEnergy:0,guardInterventions:0};
 while(s.status==='playing'&&step<MAX_STEPS){
  const actor=actorOf(s),key=s.turn+'|'+s.active+'|'+s.phase;
  if(phaseKeys[actor]!==key){phaseKeys[actor]=key;phaseCounts[actor]=0;}
  if(actor===hybridSeat&&s.phase==='start'&&!s.pending){
   const currentStart=s.turn+'|'+s.active;
   if(currentStart!==startId){
    startId=currentStart;ownTurn++;lastOwnTurn=ownTurn;
   }
  }
  const picked=choice(s,step,actor,hybridSeat,phaseCounts[actor]);
  let action=picked.action;
  if(actor===hybridSeat){
   if(arm==='B'){
    const suggested=guardEarlyApForFront(packs,s,actor,action,picked.legal,ownTurn);
    if(suggested.changed){
     if(!picked.legal.some(a=>same(a,suggested.action)))
      throw Error('Guard returned illegal action');
     counts.guardInterventions++;
     if(events.length<8)events.push({turn:ownTurn,step,reason:suggested.reason,
      maxBp:suggested.maxBp,playable:suggested.playable,life:s.players[actor].life.length,
      readyAp:s.players[actor].apCards.filter(c=>c?.ready).length});
     action=suggested.action;
    }
   }
   if(action.type==='extraDraw')counts.extraDraw++;
   if(action.type==='play'&&action.line==='front')counts.playsFront++;
   if(action.type==='raid')counts.raids++;
   if(action.type==='play'&&action.line==='energy')counts.playsEnergy++;
  }
  const prevActive=s.active,prevTurn=s.turn;
  s=dispatchUniversalAction(packs,s,action,{actor});
  step++;phaseCounts[actor]++;
  const front=s.players[hybridSeat].front.filter(Boolean);
  if(front.some(c=>bp(s,c)>=4000)){
   if(first4000===null)first4000=ownTurn;
   first4000After++;
  }
  if(ownTurn===4&&turn4===null&&
    (s.status!=='playing'||s.active!==prevActive||s.turn!==prevTurn)){
   turn4={
    ownLife:s.players[hybridSeat].life.length,oppLife:s.players[1-hybridSeat].life.length,
    ownFront:front.length,own4000:front.filter(c=>bp(s,c)>=4000).length,
    opp4000:s.players[1-hybridSeat].front.filter(Boolean).filter(c=>bp(s,c)>=4000).length
   };
  }
 }
 const finished=s.status==='finished';
 return {seed,first,hybridSeat,arm,finished,steps:step,winner:finished?s.winner:null,
  hybridWon:finished&&s.winner===hybridSeat,first4000,turn4,counts,events,
  endReason:s.endReason||null};
}
const pairs=[],failed=[];
for(let i=0;i<SEED_COUNT;i++){
 if(i%4!==shard)continue;
 const seed=SEED_BEGIN+i;
 for(const first of [0,1])for(const hybridSeat of [0,1]){
  try{
   const initial=applySharedOpening(packs,newComparedMatch(packs,
    [deck.counts,deck.counts],seed,first)).state;
   const A=game(initial,seed,first,hybridSeat,'A');
   const B=game(initial,seed,first,hybridSeat,'B');
   const changed=B.counts.guardInterventions>0;
   const inconsistent=!changed&&(A.hybridWon!==B.hybridWon||A.steps!==B.steps||
     A.first4000!==B.first4000);
   const pair={seed,first,hybridSeat,A,B,changed,inconsistent};
   pairs.push(pair);
   console.log('EARLY_PAIR '+JSON.stringify({seed,first,hybridSeat,
    aWon:A.hybridWon,bWon:B.hybridWon,changed,override:B.counts.guardInterventions,
    first4000A:A.first4000,first4000B:B.first4000,inconsistent}));
  }catch(e){
   failed.push({seed,first,hybridSeat,error:e?.stack||String(e)});
   console.log('EARLY_ERROR '+JSON.stringify(failed.at(-1)));
  }
 }
}
const summarize=items=>({
 games:items.length,wins:items.filter(x=>x.hybridWon).length,
 losses:items.filter(x=>!x.hybridWon&&x.finished).length,
 unfinished:items.filter(x=>!x.finished).length,
 earliest4000Avg:items.filter(x=>x.first4000!==null).length?
  items.filter(x=>x.first4000!==null).reduce((n,x)=>n+x.first4000,0)/
   items.filter(x=>x.first4000!==null).length:null,
 guards:items.reduce((n,x)=>n+x.counts.guardInterventions,0),
 turns4No4000:items.filter(x=>x.turn4&&x.turn4.own4000===0).length
});
const A=pairs.map(x=>x.A),B=pairs.map(x=>x.B),changed=pairs.filter(x=>x.changed);
const result={shard,head:process.env.GITHUB_SHA,
 comparison:'A=current hybrid vs fixed-node hard; B=early last-AP 4000 intervention',
 note:'All A/B searches use 48 nodes and no soft wallclock for causal repeatability; this is NOT live 40ms',
 A:summarize(A),B:summarize(B),affected:{
 pairs:changed.length,aWins:changed.filter(x=>x.A.hybridWon).length,
 bWins:changed.filter(x=>x.B.hybridWon).length,
 improved:changed.filter(x=>!x.A.hybridWon&&x.B.hybridWon).length,
 regressed:changed.filter(x=>x.A.hybridWon&&!x.B.hybridWon).length},
 inconsistentUnchanged:pairs.filter(x=>x.inconsistent).length,
 pairs,failed
};
writeFileSync('early-front-ab-shard-'+shard+'.json',JSON.stringify(result,null,2));
console.log('EARLY_SUMMARY '+JSON.stringify({shard,A:result.A,B:result.B,
 affected:result.affected,inconsistentUnchanged:result.inconsistentUnchanged,
 failures:failed.length}));
if(failed.length||result.inconsistentUnchanged||result.A.unfinished||result.B.unfinished)
 process.exitCode=1;
