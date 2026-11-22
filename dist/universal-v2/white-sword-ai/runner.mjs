// Headless match runner. Every dispatched action comes from the engine's
// legal list. A crashed or illegal model game is not a training loss.
import {performance} from 'node:perf_hooks';
import {legalUniversalActions,dispatchUniversalAction} from '../engine.mjs';
import {chooseUniversalAiAction} from '../ai.mjs';
import {chooseStrengthenedHardAction,HARD_AI_POLICY} from '../hard-ai.mjs';
import {chooseHybridMainAction,HYBRID_MAIN_POLICY} from '../ai-v3/hybrid-main.mjs';
import {newComparedMatch,matchRules} from '../ai-v3/opening.mjs';
import {HARD_OPTIONS,HYBRID_OPTIONS,LOOP_LIMIT,MAX_STEPS,NEGATIVES,WHITE_SWORD_DECK} from './constants.mjs';
import {chooseWhiteSwordAction} from './choose.mjs';
import {stageGuardModel} from './stage-guard.mjs';
import {catalogsOf,getDeck} from './deck.mjs';
import {policyVector,valueVector} from './features.mjs';
import {observeActor} from './observe.mjs';
import {timingOf} from './stats.mjs';

const RULES=matchRules('official');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function emptyAnomalies(){
 return {illegal:0,timeout:0,fallback:0,deadLoop:0,engineError:0,leak:0,opponentFallback:0};
}
export function emptyCounts(){
 return {play:0,raid:0,attack:0,block:0,blockPass:0,event:0,activate:0,next:0,extraDraw:0,apSpent:0,byCard:{}};
}
export function trainingLabel(game){
 const anomalies=game?.anomalies||{};
 if(anomalies.illegal)return {usable:false,reason:'illegal'};
 if(anomalies.leak)return {usable:false,reason:'leak'};
 if(anomalies.deadLoop)return {usable:false,reason:'dead-loop'};
 if(anomalies.engineError)return {usable:false,reason:'engine'};
 if(anomalies.fallback||anomalies.timeout)return {usable:false,reason:'fallback'};
 if(anomalies.opponentFallback)return {usable:false,reason:'opponent-fallback'};
 if(game?.status!=='finished'||(game.winner!==0&&game.winner!==1))return {usable:false,reason:'unfinished'};
 return {usable:true,reason:null};
}
export function actionKey(actor,action){
 return {
  actor,type:action?.type||null,mode:action?.mode??null,line:action?.line??null,
  uid:action?.uid??null,baseUid:action?.baseUid??null,targetUid:action?.targetUid??null,
  slot:Number.isInteger(action?.slot)?action.slot:null
 };
}
function markList(value){
 if(!Array.isArray(value))return '';
 return value.map(item=>{
  if(item==null)return '-';
  if(typeof item==='string'||typeof item==='number')return String(item);
  if(item.uid)return item.uid;
  if(item.op)return item.op;
  return '';
 }).join(',');
}
export function positionKey(state){
 const pending=state.pending;
 const queue=state.effectQueue||[];
 const parts=[state.turn,state.phase,pending?.kind||'',state.active,queue.length,queue[0]?.op||'',queue[0]?.sourceUid||''];
 // A pending selection can stage cards without moving them across zones;
 // the complete pending payload captures progress and prevents a false loop.
 if(pending)parts.push(JSON.stringify(pending));
 for(const player of state.players){
  parts.push(player.life.length,player.hand.length,player.deck.length,player.outside.length,
   (player.removed||[]).length,(player.lifeRevealed||[]).length,
   player.apCards.filter(card=>card?.ready).length);
  for(const line of ['front','energy'])
   parts.push(player[line].map(card=>card?card.uid+(card.ready?'r':'t')+':'+(card.bp??''):'-').join(','));
 }
 return parts.join('|');
}
function matchLegal(legal,action){
 if(!action||typeof action!=='object')return null;
 return legal.find(item=>item===action||same(item,action))||null;
}
function substituteAction(pack,state,legal,seed){
 try{
  const hard=chooseStrengthenedHardAction(pack,state,{...HARD_OPTIONS,seed});
  const exact=matchLegal(legal,hard);
  if(exact)return exact;
 }catch{/* the engine list itself is still legal */}
 return legal.find(item=>item.type==='next')||legal[0];
}
function chooseFor(pack,state,actor,seat,spec,step){
 if(seat.policy==='hard-search-2'){
  const action=chooseStrengthenedHardAction(pack,state,{...HARD_OPTIONS,seed:spec.seed});
  return {action,source:'hard-search-2',version:HARD_AI_POLICY};
 }
 if(seat.policy==='hybrid-main'){
  const action=chooseHybridMainAction(pack,state,{actor,...HYBRID_OPTIONS,seed:spec.seed});
  return {action,source:'hybrid-main',version:HYBRID_MAIN_POLICY};
 }
 if(seat.policy==='universal-hard'){
  const action=chooseUniversalAiAction(pack,state,{difficulty:'hard'});
  return {action,source:'universal-hard',version:'universal-hard'};
 }
 if(seat.policy==='white-sword'){
  return chooseWhiteSwordAction(pack,state,{
   actor,model:stageGuardModel(seat,state),mode:seat.mode||'policy',explore:seat.explore||0,
   step,seed:spec.seed,timeoutMs:seat.timeoutMs,scale:seat.scale,
   diagnose:spec.diagnose===true,
   captureDecisions:spec.captureDecisions===true,
   collectQ:spec.keepSamples===true&&spec.recordQPreferences===true&&actor===spec.recordSeat,
   qScope:spec.recordQScope||null,
   qStrategy:spec.recordQStrategy||null,
   diagnosticCandidatePolicy:spec.diagnose===true?spec.diagnosticCandidatePolicy:null,
   hardCap:Number.isFinite(seat.hardCap)?seat.hardCap:null
  });
 }
 throw Error('Unknown policy '+(seat.policy||''));
}
function ownCardId(state,actor,action){
 if(!action?.uid)return null;
 const player=state.players[actor];
 for(const zone of ['hand','front','energy','outside','removed']){
  const card=(player[zone]||[]).find(item=>item?.uid===action.uid);
  if(card?.cardId)return card.cardId;
 }
 return null;
}
export function playGame(spec){
 try{return playGameInner(spec);}
 catch(error){return failedGame(spec,error);}
}
function failedGame(spec,error){
 const seat=Number.isInteger(spec?.specialistSeat)?spec.specialistSeat:null;
 return baseGame(spec,{
  status:'error',winner:null,endReason:'exception',error:String(error?.message||error),
  anomalies:{...emptyAnomalies(),engineError:1},steps:0,turn:null,ms:0,
  specialistSeat:seat,specialistIsFirst:seat==null?null:seat===spec.first
 });
}
function baseGame(spec,extra){
 return {
  matchId:matchId(spec),seed:spec.seed,first:spec.first,label:spec.label||null,
  opponentDeck:spec.opponentDeck||spec.seats?.find((_,index)=>index!==spec.specialistSeat)?.deckId||null,
  seats:(spec.seats||[]).map(seat=>({deckId:seat.deckId,policy:seat.policy,version:seat.model?.version||seat.policy})),
  counts:emptyCounts(),samples:[],actions:[],decisionMs:[],anomalies:emptyAnomalies(),
  modelDecisions:0,referenceDecisions:0,...extra
 };
}
function matchId(spec){
 const seats=(spec.seats||[]).map(seat=>seat.deckId+':'+seat.policy).join('|');
 return ['ws',spec.seed,spec.first,spec.specialistSeat,seats].join('/');
}
function playGameInner(spec){
 if(!spec||!Array.isArray(spec.seats)||spec.seats.length!==2)throw Error('A match needs two seats');
 if(!Number.isInteger(spec.seed)||!Number.isInteger(spec.first)||!Number.isInteger(spec.specialistSeat))
  throw Error('Match seed, first player, and specialist seat are required');
 for(const seat of spec.seats){
  if(seat.policy==='white-sword'&&seat.deckId!==WHITE_SWORD_DECK)throw Error('White Sword specialist deck is fixed');
 }
 const decks=spec.seats.map(seat=>getDeck(seat.deckId));
 const packs=[decks[0].pack,decks[1].pack];
 const counts=[decks[0].counts,decks[1].counts];
 let state=newComparedMatch(packs,counts,spec.seed,spec.first,RULES);
 const game=baseGame(spec,{
  status:state.status,winner:state.winner,endReason:state.endReason,error:null,
  steps:0,turn:state.turn,ms:0,
  specialistSeat:spec.specialistSeat,specialistIsFirst:spec.specialistSeat===spec.first
 });
 if(spec.diagnose===true)game.diagnostics={
  blendDecisions:0,singleEligible:0,multiEligible:0,hardOverrides:0,
  eligibleSum:0,candidatesSum:0,positiveScoreGaps:0,scoreGapSum:0,
  maxScoreGap:0,hardGapSum:0,policyGains:{},probeExamples:[]
 };
 if(spec.trackLife===true)game.lifeStats={
  lifeReveals:[0,0],triggerBearing:[0,0],types:{}
 };
 const started=performance.now();
 let lastKey='';
 let repeats=0;
 const recent=[];
 while(state.status==='playing'&&game.steps<MAX_STEPS){
  const actor=state.pending?.player??state.active;
  let legal;
  try{legal=legalUniversalActions(packs,state);}
  catch(error){
   game.anomalies.engineError++;
   game.error=error.message;
   break;
  }
  if(!legal.length){game.anomalies.illegal++;game.error='no legal action';break;}
  const beforeAp=state.players[actor].apCards.filter(card=>card?.ready).length;
  const key=positionKey(state);
  repeats=key===lastKey?repeats+1:0;
  lastKey=key;
  if(repeats>=LOOP_LIMIT){game.anomalies.deadLoop++;game.error='repeated position';game.recentActions=recent.slice();break;}
  const seat=spec.seats[actor];
  const t0=performance.now();
  let picked;
  try{picked=chooseFor(packs,state,actor,seat,spec,game.steps);}
  catch(error){
   try{picked={action:legal.find(item=>item.type==='next')||legal[0],source:'fallback',reason:error.message};}
   catch(inner){game.anomalies.engineError++;game.error=inner.message;break;}
  }
  const ms=performance.now()-t0;
  game.decisionMs.push(ms);
  if(picked?.reason==='timeout'||picked?.source==='fallback'&&picked?.reason==='timeout')game.anomalies.timeout++;
  if(String(picked?.reason||'').includes('leaked'))game.anomalies.leak++;
  let action=matchLegal(legal,picked?.action);
  if(!action){
   if(actor===spec.specialistSeat){
    game.anomalies.illegal++;
    game.anomalies.fallback++;
    game.error=picked?.reason||'illegal action';
    game.recentActions=recent.slice();
    game.rejectedAction={actor,source:picked?.source||null,reason:picked?.reason||null,action:picked?.action||null};
    break;
   }
   action=substituteAction(packs,state,legal,spec.seed);
   game.anomalies.opponentFallback++;
   picked={action,source:'opponent-fallback',reason:picked?.reason||'opponent returned no legal action'};
  }
  if(game.diagnostics&&actor===spec.specialistSeat&&picked.diagnostic){
   const row=picked.diagnostic,d=game.diagnostics;
   d.blendDecisions++;
   d.eligibleSum+=row.eligible;
   d.candidatesSum+=row.total;
   if(row.eligible<=1)d.singleEligible++;
   else d.multiEligible++;
   if(row.overriddenHard)d.hardOverrides++;
   if(Number.isFinite(row.topGap)){
    d.positiveScoreGaps++;
    d.scoreGapSum+=row.topGap;
    d.maxScoreGap=Math.max(d.maxScoreGap,row.topGap);
   }
   d.hardGapSum+=row.hardGap;
   for(const [gain,probe] of Object.entries(row.counterfactual?.gains||{})){
    const agg=d.policyGains[gain]||(d.policyGains[gain]={
     evaluated:0,switched:0,totalHardAnchorLoss:0,maxHardAnchorLoss:0
    });
    agg.evaluated++;
    if(probe.switched){
     agg.switched++;
     const hardLoss=Number(probe.hardAnchorLoss)||0;
     agg.totalHardAnchorLoss+=hardLoss;
     agg.maxHardAnchorLoss=Math.max(agg.maxHardAnchorLoss,hardLoss);
     if(d.probeExamples.length<18)d.probeExamples.push({
      step:game.steps,turn:state.turn,phase:state.phase,gain,
      hardLoss,baseline:row.counterfactual.reference,chosen:probe.action
     });
    }
   }
  }
  if(picked.source==='fallback')game.anomalies.fallback++;
  else if(picked.source==='reference')game.referenceDecisions++;
  else if(actor===spec.specialistSeat&&(picked.source==='model'||picked.source==='blend'))game.modelDecisions++;
  const keyAction=actionKey(actor,action);
  if(spec.keepActions)game.actions.push(spec.captureDecisions===true?
   {...keyAction,fullAction:action,
    context:{
     step:game.steps,turn:state.turn,phase:state.phase,pending:state.pending?.kind||null,
     cardId:ownCardId(state,actor,action),
     self:{
      life:state.players[actor].life.length,hand:state.players[actor].hand.length,
      ap:state.players[actor].apCards.filter(item=>item?.ready).length,
      front:state.players[actor].front.map(item=>item?{
       cardId:item.cardId,bp:item.bp,ready:item.ready
      }:null),energy:state.players[actor].energy.filter(Boolean).length,
      outside:state.players[actor].outside.length
     },
     opponent:{
      life:state.players[1-actor].life.length,
      ap:state.players[1-actor].apCards.filter(item=>item?.ready).length,
      hand:state.players[1-actor].hand.length,
      front:state.players[1-actor].front.map(item=>item?{
       cardId:item.cardId,bp:item.bp,ready:item.ready
      }:null)
     }
    },
    ...(picked.diagnostic?{choiceDiagnostic:picked.diagnostic}:{})
   }:(spec.diagnose===true?{...keyAction,fullAction:action}:keyAction));
  recent.push(keyAction);
  if(recent.length>16)recent.shift();
  if(actor===spec.specialistSeat)noteSpecialist(game,state,actor,action);
  if(spec.keepSamples&&spec.recordQPreferences===true&&actor===spec.recordSeat&&
   picked.source==='blend'&&Array.isArray(picked.qPairs))
   game.samples.push(...picked.qPairs);
  if(spec.keepSamples&&actor===spec.recordSeat&&legal.length>1&&picked.chosen&&picked.negatives?.length){
   if(spec.recordTeacher&&picked.source==='hard-search-2'){
    game.samples.push({kind:'teacher',chosen:picked.chosen,negatives:picked.negatives,value:picked.value,reward:null});
   }else if(picked.source==='model'||(picked.source==='blend'&&spec.recordBlendOutcome===true)){
    // Opt-in v3 only: a capped search/blend decision produces an outcome
    // gradient against its *eligible* alternatives, never illegal actions.
    game.samples.push({kind:'outcome',seat:actor,chosen:picked.chosen,negatives:picked.negatives,value:picked.value});
   }
  }
  // Teacher games play hard-search-2, which does not return feature rows.
  // The feature row is built by a shadow score only when recording a teacher.
  if(spec.keepSamples&&spec.recordTeacher&&actor===spec.recordSeat&&legal.length>1&&picked.source==='hard-search-2'){
   const shadow=teacherSample(packs,state,actor,action,legal);
   if(shadow)game.samples.push(shadow);
  }
  let next;
  try{next=dispatchUniversalAction(packs,state,action,{actor});}
  catch(error){
   game.anomalies.engineError++;
   game.error=error.message;
   break;
  }
  if(game.lifeStats){
   // Post-action public/provenance events only. These revealed identities are
   // never passed to the decision policy or its training features.
   const earlier=state.zoneMoveEvents||[];
   const fresh=next.turn===state.turn?
    (next.zoneMoveEvents||[]).slice(earlier.length):(next.zoneMoveEvents||[]);
   for(const event of fresh){
    if(event.from!=='life'||event.reason!=='rule'||(event.owner!==0&&event.owner!==1))continue;
    const side=event.owner;
    game.lifeStats.lifeReveals[side]++;
    const printed=(Array.isArray(packs)?packs[side]:packs)?.cards?.[event.cardId]||
     (Array.isArray(packs)?packs[side]:packs)?.[event.cardId];
    const trigger=printed?.trigger;
    if(trigger){
     game.lifeStats.triggerBearing[side]++;
     game.lifeStats.types[trigger]=(game.lifeStats.types[trigger]||0)+1;
    }
   }
  }
  const afterAp=next.players[actor].apCards.filter(card=>card?.ready).length;
  if(actor===spec.specialistSeat&&afterAp<beforeAp)game.counts.apSpent+=beforeAp-afterAp;
  state=next;
  game.steps++;
 }
 game.status=state.status;
 game.winner=state.winner;
 game.endReason=state.endReason;
 game.turn=state.turn;
 game.ms=performance.now()-started;
 if(game.steps>=MAX_STEPS&&state.status==='playing'){
  game.endReason=game.endReason||'step-cap';
  game.anomalies.deadLoop++;
 }
 const label=trainingLabel(game);
 game.training=label;
 if(!label.usable)game.samples=[];
 else for(const sample of game.samples){
  if(sample.kind==='outcome')sample.reward=game.winner===sample.seat?'win':'loss';
 }
 return game;
}
function noteSpecialist(game,state,actor,action){
 const bucket={
  play:'play',raid:'raid',attack:'attack',event:'event',activate:'activate',next:'next',extraDraw:'extraDraw'
 }[action.type];
 if(action.type==='chooseBlock')game.counts[action.uid==null?'blockPass':'block']++;
 else if(bucket)game.counts[bucket]++;
 const cardId=ownCardId(state,actor,action);
 if(cardId&&['play','raid','event','activate'].includes(action.type))
  game.counts.byCard[cardId]=(game.counts.byCard[cardId]||0)+1;
}
function teacherSample(pack,state,actor,action,legal){
 try{
  const observation=observeActor(pack,state,actor);
  const catalogs=catalogsOf(pack);
  const chosen=policyVector({observation,seat:actor,action,legal,catalogs});
  const negatives=legal.filter(item=>item!==action).slice(0,NEGATIVES).map(item=>policyVector({
   observation,seat:actor,action:item,legal,catalogs
  }));
  if(!negatives.length)return null;
  return {kind:'teacher',chosen,negatives,value:valueVector({observation,seat:actor,catalogs}),reward:null};
 }catch{return null;}
}
export function summarizeGame(game){
 const decisionMs=game.decisionMs||[];
 return {
  matchId:game.matchId,seed:game.seed,first:game.first,label:game.label,
  opponentDeck:game.opponentDeck,specialistSeat:game.specialistSeat,
  specialistIsFirst:game.specialistIsFirst,status:game.status,winner:game.winner,
  endReason:game.endReason,error:game.error,steps:game.steps,turn:game.turn,ms:game.ms,
  anomalies:{...game.anomalies},training:game.training,counts:game.counts,
  modelDecisions:game.modelDecisions,referenceDecisions:game.referenceDecisions,
  seats:game.seats,timing:timingOf(decisionMs),
  samples:game.samples?.length||0,
  recentActions:game.recentActions||null,
  ...(game.diagnostics?{diagnostics:game.diagnostics}:{}),
  ...(game.lifeStats?{lifeStats:game.lifeStats}:{}),
  ...(game.actions?.length?{actions:game.actions}:{} )
 };
}
export function replayMatches(spec){
 const first=playGame({...spec,keepActions:true,keepSamples:false});
 const second=playGame({...spec,keepActions:true,keepSamples:false});
 return {
  same:JSON.stringify(first.actions)===JSON.stringify(second.actions),
  finished:first.status==='finished'&&second.status==='finished',
  first:first.actions,second:second.actions,anomalies:first.anomalies
 };
}
