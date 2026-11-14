// R08: compare actual root search scores and complete-match outcomes.
// Research-only, never imported by the live battle UI.
// All decisions: same seed=1, same sealed worker boundary, 48 fixed nodes,
// no soft wall clock. Baseline and one alternative start from the same
// canonical full-state SHA-256 and use identical hidden deck/LIFE orders.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {chooseStrengthenedHardAction,lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {HYBRID_START_HARD_POLICY,lastHybridRoute} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalBp,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';

const manifest=JSON.parse(readFileSync(new URL('../audit/ai-v3-raid-energy-counterfactual-manifest-20261114.json',import.meta.url),'utf8'));
const c=manifest.cases.find(row=>row.caseId==='R08');
if(!c)throw Error('R08 not found');
const deck=battleDecks().find(row=>row.id===c.deck);
if(!deck)throw Error('Test deck missing');
const packs=[deck.pack,deck.pack],hardNodes=48,maxSteps=1200;
const expectedHash=process.env.EXPECTED_ROOT_SHA256||'dad1fa7ea88cffca34095701288993a64eec017cceaa2d7d88c916cef43c9b05';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sha=state=>createHash('sha256').update(JSON.stringify(state)).digest('hex');
const actorOf=s=>s.pending?.player??s.active;
const bp=(s,card)=>{try{return card?universalBp(packs,s,card)||0:0;}catch{return 0;}};
const colors=(s,actor)=>{try{return universalEnergyByColor(packs,s,actor)||{};}catch{return {};}};
const ownCard=(s,actor,uid)=>s.players[actor].hand.find(x=>x?.uid===uid);
const ownDef=(s,actor,uid)=>deck.pack.cards[ownCard(s,actor,uid)?.cardId]||null;
const ownCardId=(s,actor,uid)=>ownDef(s,actor,uid)?.id||null;
const clone=value=>structuredClone(value);
const defaultPhase=()=>({keys:['',''],counts:[0,0]});
function resetPhase(phase,state,actor){
 const key=state.turn+'|'+state.active+'|'+state.phase;
 if(phase.keys[actor]!==key){phase.keys[actor]=key;phase.counts[actor]=0;}
}
function workerDecision(state,actor,step,nodes){
 const legal=legalUniversalActions(packs,state),requestId=step+1,stateVersion=step+1;
 const req=buildAiV3Request(packs,state,actor,{
  requestId,stateVersion,nodes,ms:1e9,seed:1,policy:HYBRID_START_HARD_POLICY});
 const response=req?handleAiV3Request(req):null;
 const accepted=acceptAiV3Result({requestId,stateVersion,actor,legal},response);
 if(!accepted.ok)throw Error('Worker failed: '+accepted.reason+' at '+step);
 return {action:accepted.action,legal,trace:clone(lastHardAiTrace()||{}),
  route:lastHybridRoute(),workerSearch:response?.search||null};
}
function decision(state,phase,step,hybridSeat){
 const actor=actorOf(state);
 resetPhase(phase,state,actor);
 const legal=legalUniversalActions(packs,state);
 const pass=!state.pending?legal.find(a=>a.type==='next'):null;
 let picked=null,worker=null;
 if(phase.counts[actor]>=72&&pass)picked=pass;
 else if(actor===hybridSeat){
  worker=workerDecision(state,actor,step,hardNodes);
  picked=worker.action;
 }else picked=chooseStrengthenedHardAction(packs,state,{nodes:hardNodes,ms:1e9,seed:1});
 const exact=legal.find(a=>same(a,picked));
 if(!exact)throw Error('Illegal decision at '+step+' '+String(picked?.type));
 phase.counts[actor]++;
 return {action:exact,actor,legal,worker};
}
function publicSummary(s,actor){
 const me=s.players[actor],op=s.players[1-actor];
 return {status:s.status,phase:s.phase,turn:s.turn,active:s.active,
  lifeOwn:me.life.length,lifeOpp:op.life.length,
  ownFront:me.front.filter(Boolean).length,
  own4000:me.front.filter(x=>x&&bp(s,x)>=4000).length,
  opp4000:op.front.filter(x=>x&&bp(s,x)>=4000).length,
  ownHandCount:me.hand.length,ownEnergy:colors(s,actor),
  ownReadyAP:me.apCards.filter(x=>x?.ready).length};
}
const s0=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],c.seed,c.first)).state;
let state=s0,step=0,ownTurn=0,startTag=null;
const phase=defaultPhase();
let root=null;
while(state.status==='playing'&&step<=c.step){
 const actor=actorOf(state);
 if(actor===c.hybridSeat&&state.phase==='start'&&!state.pending){
  const tag=state.turn+'|'+state.active;
  if(startTag!==tag){startTag=tag;ownTurn++;}
 }
 const selected=decision(state,phase,step,c.hybridSeat);
 if(step===c.step){
  const got=ownCardId(state,actor,selected.action.uid);
  if(actor!==c.hybridSeat||ownTurn!==c.ownTurn||
     selected.action.type!=='play'||selected.action.line!=='energy'||got!==c.selectedCard)
   throw Error('Root mismatch: '+JSON.stringify({actor,ownTurn,step,action:selected.action,got}));
  root={state:clone(state),phase:clone(phase),choice:clone(selected.action),
   legal:clone(selected.legal),worker:selected.worker};
  break;
 }
 state=dispatchUniversalAction(packs,state,selected.action,{actor});
 step++;
}
if(!root)throw Error('Could not reconstruct R08');
const fullHash=sha(root.state);
if(fullHash!==expectedHash)throw Error('R08 root state SHA mismatch: '+fullHash);
if(root.worker?.route?.source!=='hard'||root.worker.route.lane!=='main')
 throw Error('R08 not on hard-main lane');
const original=root.choice;
const eligible=root.legal.filter(a=>a.type==='play'&&a.line==='energy'
 &&a.slot===original.slot&&ownCardId(root.state,c.hybridSeat,a.uid)==='BLC-3-008');
if(eligible.length!==1)throw Error('Ambiguous / missing BLC-3-008 alternative: '+eligible.length);
const alternative=eligible[0];

function rankedTrace(worker,source){
 const trace=worker?.trace||{};
 const ranks=(trace.candidates||[]).map((r,index)=>({
  rank:index+1,cardId:ownCardId(root.state,c.hybridSeat,r.action.uid),
  type:r.action.type,line:r.action.line||null,slot:r.action.slot??null,
  score:Number.isFinite(r.score)?Number(r.score.toFixed(3)):null,
  equalsOriginal:same(r.action,original),equalsAlternative:same(r.action,alternative)
 }));
 const cScore=action=>{
  const exact=ranks.find(row=>action==='original'?row.equalsOriginal:row.equalsAlternative);
  if(exact)return {rank:exact.rank,score:exact.score};
  const sameCard=ranks.find(row=>row.type==='play'&&row.line==='energy'&&
   row.cardId===(action==='original'?'BLC-2-069':'BLC-3-008'));
  return sameCard?{rank:sameCard.rank,score:sameCard.score,otherSlot:true}:null;
 };
 return {nodes:source,selectedCard:ownCardId(root.state,c.hybridSeat,worker.action.uid),
  selectedType:worker.action.type,selectedLine:worker.action.line,
  reason:trace.reason||null,score:trace.score??null,legacyScore:trace.legacyScore??null,
  nodesUsed:trace.nodesUsed??null,rootCompared:trace.rootCompared??null,
  rootCandidates:trace.rootCandidates??null,rootCut:trace.rootCut===true,
  original:cScore('original'),alternative:cScore('alternative'),
  energyCandidates:ranks.filter(row=>row.type==='play'&&row.line==='energy').slice(0,20),
  topCandidates:ranks.slice(0,12)};
}
const search=[
 rankedTrace(root.worker,48)
];
for(const budget of [96,192,384]){
 const extra=workerDecision(root.state,c.hybridSeat,c.step,budget);
 search.push(rankedTrace(extra,budget));
}

function fullContinuation(initialAction){
 let s=dispatchUniversalAction(packs,clone(root.state),initialAction,{actor:c.hybridSeat});
 let phase=clone(root.phase),turnStart=root.state.turn,steps=1;
 let firstOwnNextStart=null,raidThisTurn=0,events=[],error=null,illegal=0;
 try{
  while(s.status==='playing'&&steps<maxSteps){
   if(!firstOwnNextStart&&s.active===c.hybridSeat&&s.phase==='start'
     &&!s.pending&&s.turn>turnStart){
    firstOwnNextStart=publicSummary(s,c.hybridSeat);
   }
   const picked=decision(s,phase,c.step+steps,c.hybridSeat);
   if(picked.actor===c.hybridSeat&&picked.action.type==='raid'&&s.turn===turnStart)
    raidThisTurn++;
   if(events.length<100&&picked.actor===c.hybridSeat){
    const action=picked.action;
    if(action.type==='play'||action.type==='raid'||action.type==='extraDraw'||
       action.type==='next'||action.type==='attack')
     events.push({fromTurn:s.turn,phase:s.phase,type:action.type,
      line:action.line||null,card:ownCardId(s,c.hybridSeat,action.uid),
      life:s.players.map(p=>p.life.length),colors:colors(s,c.hybridSeat)});
   }
   s=dispatchUniversalAction(packs,s,picked.action,{actor:picked.actor});
   steps++;
  }
 }catch(e){error=e?.stack||String(e);illegal++;}
 const finished=s.status==='finished'&&!error;
 return {finished,steps,illegal,error,winner:finished?s.winner:null,
  hybridWon:finished&&s.winner===c.hybridSeat,
  endReason:s.endReason||null,firstOwnNextStart,raidThisTurn,
  final:publicSummary(s,c.hybridSeat),finalHash:sha(s),events};
}
const A=fullContinuation(original),ARepeat=fullContinuation(original);
const B=fullContinuation(alternative),BRepeat=fullContinuation(alternative);
const reproducible=A.finalHash===ARepeat.finalHash&&B.finalHash===BRepeat.finalHash
 &&A.steps===ARepeat.steps&&B.steps===BRepeat.steps;
const rootPublic={seed:c.seed,hybridSeat:c.hybridSeat,first:c.first,step:c.step,
 ownTurn:c.ownTurn,fullHash,root:publicSummary(root.state,c.hybridSeat),
 ownHand:root.state.players[c.hybridSeat].hand.map(card=>({
  id:card.cardId,bp:deck.pack.cards[card.cardId]?.bp||0,
  cost:deck.pack.cards[card.cardId]?.energy||0,
  gen:deck.pack.cards[card.cardId]?.gen||0}))};
const result={
 script:'R08-full-match-v1',sourceSha:manifest.sourceSha,
 candidateOnly:true,livePolicyUnchanged:true,
 root:rootPublic,
 original:{cardId:'BLC-2-069',slot:original.slot,actionType:original.type},
 alternative:{cardId:'BLC-3-008',slot:alternative.slot,actionType:alternative.type},
 searchScores:search,
 games:{A,B},
 checks:{fullHashMatched:fullHash===expectedHash,baselineWinMatchesSource:A.hybridWon===false,
  reproducible,allFinished:A.finished&&B.finished,illegal:A.illegal+B.illegal,
  branchChangedWinner:A.winner!==B.winner,
  singleNextTurnDiff:A.firstOwnNextStart&&B.firstOwnNextStart?{
   ownLife:B.firstOwnNextStart.lifeOwn-A.firstOwnNextStart.lifeOwn,
   oppDamage:A.firstOwnNextStart.lifeOpp-B.firstOwnNextStart.lifeOpp,
   own4000:B.firstOwnNextStart.own4000-A.firstOwnNextStart.own4000,
   greenEnergy:(B.firstOwnNextStart.ownEnergy.green||0)-(A.firstOwnNextStart.ownEnergy.green||0)
  }:null}};
writeFileSync('raid-energy-r08-full-match.json',JSON.stringify(result,null,2));
console.log('R08_ROOT_SCORE '+JSON.stringify(search.map(x=>({
 nodes:x.nodes,selected:x.selectedCard,reason:x.reason,rootCut:x.rootCut,
 compared:x.rootCompared,original:x.original,alternative:x.alternative
}))));
console.log('R08_FULL_RESULT '+JSON.stringify({A:{win:A.hybridWon,winner:A.winner,steps:A.steps,
 life:A.final.lifeOwn,oppLife:A.final.lifeOpp,reason:A.endReason},
 B:{win:B.hybridWon,winner:B.winner,steps:B.steps,
 life:B.final.lifeOwn,oppLife:B.final.lifeOpp,reason:B.endReason},
 checks:result.checks}));
if(!result.checks.fullHashMatched||!result.checks.reproducible||
   !result.checks.baselineWinMatchesSource||!result.checks.allFinished||result.checks.illegal){
 console.error('R08_FAILED '+JSON.stringify(result.checks));
 process.exitCode=1;
}
