// One match. Every applied action is taken from the engine's legal list.
// A throw, a leak, or a v2 fallback ends the game and drops its samples.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {parentPort} from 'node:worker_threads';
import {dispatchUniversalAction,legalUniversalActions} from '../../dist/universal-v2/engine.mjs';
import {matchRules,newComparedMatch} from '../../dist/universal-v2/ai-v3/opening.mjs';
import {BLEND_HARD_CAP,BLEND_SCALE} from '../../dist/universal-v2/white-sword-ai/constants.mjs';
import {getDeck} from '../../dist/universal-v2/white-sword-ai/deck.mjs';
import {POLICY_DIM} from '../../dist/universal-v2/white-sword-ai/features.mjs';
import {observeActor} from '../../dist/universal-v2/white-sword-ai/observe.mjs';
import {chooseWhiteSwordAction} from '../../dist/universal-v2/white-sword-ai/choose.mjs';
import {GAMMA,HISTORY,LOOP_LIMIT,MAX_STEPS,V2_DECISION_MS,V2_FILE_HASH} from './constants.mjs';
import {encodeDecision,joinFeatures,publicHistoryStep,sameVector,visibleIndex} from './encode.mjs';
import {assignReturns} from './learn.mjs';
import {greedyIndex,scoreActions} from './net.mjs';

const RULES=matchRules('official');
const V2_PATH=fileURLToPath(new URL('../white-sword-ai/weights/v2-capped.json',import.meta.url));
let officialV2;

export function loadOfficialV2(){
 if(officialV2)return officialV2;
 const bytes=readFileSync(V2_PATH);
 const hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!==V2_FILE_HASH)throw Error('Official v2 weight hash mismatch');
 const model=JSON.parse(String(bytes));
 if(!Array.isArray(model.policy)||model.policy.length!==POLICY_DIM)throw Error('Official v2 width mismatch');
 officialV2=model;
 return model;
}
function emptyAnomalies(){
 return {illegal:0,timeout:0,fallback:0,deadLoop:0,engineError:0,leak:0,opponentFallback:0,unfinished:0};
}
function mulberry32(seed){
 let state=seed>>>0;
 return ()=>{
  state=state+0x6D2B79F5|0;
  let t=Math.imul(state^state>>>15,1|state);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
function same(left,right){
 return left===right||JSON.stringify(left)===JSON.stringify(right);
}
function loopKey(state){
 const pending=state.pending;
 const board=state.players.map(player=>[
  player.life.length,player.hand.length,player.deck.length,
  player.front.map(card=>card?card.uid+(card.ready?'a':'r'):'-').join('.'),
  player.energy.map(card=>card?card.uid+(card.ready?'a':'r'):'-').join('.')
 ].join('/')).join('|');
 return [state.turn,state.phase,state.active,pending?.kind||'',pending?.player??'',board].join('#');
}
function collisions(actions){
 const seen=[];
 let count=0;
 for(const action of actions){
  if(seen.some(item=>sameVector(item,action)))count++;
  else seen.push(action);
 }
 return count;
}
function note(spec,text){
 if(!spec.progress)return;
 const line='nn '+text;
 if(parentPort)parentPort.postMessage({type:'progress',text:line});
 else console.log(line);
}
function revealedCardId(pack,state,viewer,action){
 const observation=observeActor(pack,state,viewer);
 const index=visibleIndex(observation,viewer);
 const card=index.get(action?.uid)||index.get(action?.baseUid)||null;
 return card?.faceDown&&!card.cardId?'':(card?.cardId||'');
}
function chooseNn(pack,state,actor,legal,net,history,explore,rng){
 const observation=observeActor(pack,state,actor);
 const encoded=encodeDecision(observation,actor,legal,history);
 const scores=scoreActions(net,encoded.state,encoded.actions);
 let index=greedyIndex(scores,legal);
 let explored=false;
 if(explore>0&&legal.length>1&&rng()<explore){
  index=Math.floor(rng()*legal.length);
  explored=true;
 }
 return {action:legal[index],index,encoded,explored,source:'nn'};
}
function chooseV2(pack,state,actor,legal,spec,step){
 const picked=chooseWhiteSwordAction(pack,state,{
  actor,model:loadOfficialV2(),mode:'blend',hardCap:BLEND_HARD_CAP,scale:BLEND_SCALE,
  explore:0,seed:spec.seed,step,timeoutMs:spec.decisionMs??V2_DECISION_MS
 });
 const action=legal.find(item=>same(item,picked?.action))||null;
 return {...picked,action};
}
export function trainable(game){
 const anomalies=game?.anomalies||{};
 if(game?.status!=='finished'||(game.winner!==0&&game.winner!==1))return false;
 return !(anomalies.illegal||anomalies.timeout||anomalies.fallback||anomalies.deadLoop||
  anomalies.engineError||anomalies.leak||anomalies.opponentFallback||anomalies.unfinished);
}
export function playMatch(spec){
 const started=performance.now();
 const game={
  seed:spec.seed,first:spec.first,mode:spec.mode||'eval',
  learnerSeat:Number.isInteger(spec.learnerSeat)?spec.learnerSeat:null,
  seats:spec.seats.map(seat=>({deckId:seat.deckId,kind:seat.kind})),
  status:'error',winner:null,endReason:null,error:null,steps:0,decisions:0,
  ms:0,anomalies:emptyAnomalies(),collisions:0,explored:0,scored:0,
  legalTotal:0,decisionMs:[],imitate:[],monte:[],actions:[],publicHistory:[]
 };
 try{
  if(!Array.isArray(spec.seats)||spec.seats.length!==2)throw Error('A match needs two seats');
  const decks=spec.seats.map(seat=>getDeck(seat.deckId));
  const packs=[decks[0].pack,decks[1].pack];
  const counts=[decks[0].counts,decks[1].counts];
  let state=newComparedMatch(packs,counts,spec.seed,spec.first,RULES);
  const history=game.publicHistory;
  const rng=mulberry32((spec.exploreSeed??spec.seed)>>>0);
  const record=new Set(spec.recordSeats||[]);
  const teachers=new Set(spec.teacherSeats||[]);
  let lastKey='';
  let repeats=0;
  const limit=spec.maxSteps||MAX_STEPS;
  while(state.status==='playing'&&game.steps<limit){
   if(spec.budgetMs&&performance.now()-started>spec.budgetMs){
    game.anomalies.unfinished++;
    game.endReason='budget-cut';
    break;
   }
   const actor=state.pending?.player??state.active;
   let legal;
   try{legal=legalUniversalActions(packs,state);}
   catch(error){
    game.anomalies.engineError++;
    game.error=error.message;
    game.endReason='engine';
    break;
   }
   if(!legal.length){
    game.anomalies.illegal++;
    game.error='no legal action';
    game.endReason='illegal';
    break;
   }
   const key=loopKey(state);
   repeats=key===lastKey?repeats+1:0;
   lastKey=key;
   if(repeats>=LOOP_LIMIT){
    game.anomalies.deadLoop++;
    game.error='repeated position';
    game.endReason='dead-loop';
    break;
   }
   const seat=spec.seats[actor];
   const t0=performance.now();
   let picked;
   try{
    if(seat.kind==='nn'){
     picked=chooseNn(packs,state,actor,legal,spec.nets[actor],history,seat.explore||0,rng);
    }else if(seat.kind==='v2'){
     picked=chooseV2(packs,state,actor,legal,spec,game.steps);
    }else throw Error('Unknown seat kind '+seat.kind);
   }catch(error){
    const message=String(error?.message||error);
    if(message.includes('leaked')||message.includes('leak'))game.anomalies.leak++;
    else game.anomalies.engineError++;
    game.error=message;
    game.endReason='choice-error';
    break;
   }
   game.decisionMs.push(performance.now()-t0);
   const ownFailure=seat.kind==='nn'||teachers.has(actor);
   if(picked.source==='fallback'||picked.reason==='timeout'){
    if(ownFailure)game.anomalies.fallback++;
    else game.anomalies.opponentFallback++;
    game.error=picked.reason||picked.source;
    game.endReason='fallback';
    break;
   }
   if(!picked.action||!legal.some(item=>same(item,picked.action))){
    if(ownFailure)game.anomalies.illegal++;
    else game.anomalies.opponentFallback++;
    game.error='action left the legal list';
    game.endReason='illegal';
    break;
   }
   if(seat.kind==='nn'&&picked.encoded){
    game.collisions+=collisions(picked.encoded.actions);
    game.legalTotal+=legal.length;
    game.scored++;
    if(picked.explored)game.explored++;
    if(record.has(actor)&&legal.length>1){
     game.monte.push({
      index:game.decisions,seat:actor,
      x:joinFeatures(picked.encoded.state,picked.encoded.actions[picked.index])
     });
    }
   }
   if(spec.mode==='imitate'&&seat.kind==='v2'&&picked.source==='blend'&&legal.length>1){
    const observation=observeActor(packs,state,actor);
    const encoded=encodeDecision(observation,actor,legal,history);
    const chosen=legal.findIndex(item=>same(item,picked.action));
    if(chosen<0){
     game.anomalies.illegal++;
     game.error='v2 choice was not indexed';
     game.endReason='illegal';
     break;
    }
    game.collisions+=collisions(encoded.actions);
    game.imitate.push({
     seed:spec.seed,
     rows:encoded.actions.map(action=>joinFeatures(encoded.state,action)),
     actions:legal.map(action=>JSON.parse(JSON.stringify(action))),
     identities:[...encoded.index].map(([uid,card])=>[uid,{cardId:card.cardId||'',faceDown:card.faceDown===true}]),
     chosen
    });
   }
   if(spec.keepActions)game.actions.push(JSON.stringify(picked.action));
   let next;
   try{next=dispatchUniversalAction(packs,state,picked.action,{actor});}
   catch(error){
    game.anomalies.engineError++;
    game.error=error.message;
    game.endReason='engine';
    break;
   }
   try{
    const cardId=revealedCardId(packs,next,actor===0?1:0,picked.action);
    history.push(publicHistoryStep(actor,picked.action,cardId));
    if(history.length>HISTORY)history.shift();
   }catch(error){
    const message=String(error?.message||error);
    if(message.includes('leaked')||message.includes('leak'))game.anomalies.leak++;
    else game.anomalies.engineError++;
    game.error=message;
    game.endReason='history';
    break;
   }
   state=next;
   game.steps++;
   game.decisions++;
   if(spec.progress&&game.steps%25===0)note(spec,'seed '+spec.seed+' step '+game.steps+' '+Math.round(performance.now()-started)+'ms');
  }
  game.status=state.status;
  game.winner=state.winner;
  game.endReason=game.endReason||state.endReason||null;
  if(state.status==='playing'&&!game.endReason){
   game.anomalies.unfinished++;
   game.endReason=game.steps>=limit?'step-cap':'stopped';
  }
 }catch(error){
  game.anomalies.engineError++;
  game.error=String(error?.message||error);
  game.endReason='exception';
 }
 game.ms=performance.now()-started;
 if(!trainable(game)){
  game.imitate=[];
  game.monte=[];
 }else if(game.monte.length){
  game.monte=assignReturns(game.monte,game.winner,game.decisions,GAMMA);
 }
 return game;
}
export function compactGame(game){
 const times=game.decisionMs||[];
 const sorted=times.slice().sort((a,b)=>a-b);
 const at=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1))]:null;
 return {
  seed:game.seed,first:game.first,mode:game.mode,learnerSeat:game.learnerSeat,
  seats:game.seats,status:game.status,winner:game.winner,endReason:game.endReason,
  error:game.error,steps:game.steps,decisions:game.decisions,ms:game.ms,
  anomalies:{...game.anomalies},collisions:game.collisions,explored:game.explored,
  imitate:game.imitate.length,monte:game.monte.length,
  legalMean:game.scored?game.legalTotal/game.scored:null,
  timing:{n:times.length,mean:times.length?times.reduce((sum,value)=>sum+value,0)/times.length:null,p50:at(0.5),p95:at(0.95),max:sorted.length?sorted[sorted.length-1]:null}
 };
}
