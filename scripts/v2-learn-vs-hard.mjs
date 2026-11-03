#!/usr/bin/env node
// Reproducible learned-vs-hard comparison.
// Training rows are produced by a documented visible-information teacher
// playing the engine. They are not human decisions. A win rate here does
// not show that the model learned from players.
// Seeds below were fixed before reading the result. Do not change them to
// improve the score.
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {coachObservation} from '../dist/universal-v2/coach-record.mjs';
import {trainPolicy} from '../dist/universal-v2/learn-policy.mjs';

const TRAIN_SEEDS=[11,12];
const EVAL_SEEDS=[21,22];
const STEP_CAP=500;
const CLOCK={ms:1e9};
const DECIDED=new Set(['life-zero','unblocked-attack','required-draw-empty','finished']);

const bleach=verifiedBleachPurplePilotDeck();
const ttg=verifiedTtgRedPilotDeck();
const matchups=[
 {name:'bleach-mirror',packs:[bleach.pack,bleach.pack],decks:[bleach.counts,bleach.counts]},
 {name:'bleach-vs-ttg',packs:[bleach.pack,ttg.pack],decks:[bleach.counts,ttg.counts]}
];

function bpOf(view,uid){
 for(const line of ['front','energy']){
  for(const card of view.players.flatMap(player=>player[line]||[]))
   if(card?.uid===uid&&typeof card.bp==='number')return card.bp;
 }
 return 0;
}
function teacher(packs,state){
 const legal=legalUniversalActions(packs,state);
 const seat=state.pending?.player??state.active;
 const view=universalPublicView(packs,state,seat);
 const me=view.players[seat],opp=view.players[seat===0?1:0];
 const keep=legal.find(action=>action.mode==='keep');
 if(keep)return keep;
 if((opp.lifeCount||9)<=3){
  const attacks=legal.filter(action=>action.type==='attack'&&!action.targetUid);
  attacks.sort((a,b)=>bpOf(view,b.uid)-bpOf(view,a.uid));
  if(attacks.length)return attacks[0];
 }
 const energy=legal.filter(action=>action.type==='play'&&action.line==='energy'&&!action.replaceUid);
 if((me.energyTotal||0)<3&&energy.length)return energy[0];
 const front=legal.filter(action=>action.type==='play'&&action.line==='front'&&!action.replaceUid);
 if(front.length)return front[0];
 const raid=legal.find(action=>action.type==='raid');
 if(raid&&(opp.lifeCount||9)<=4)return raid;
 return legal.find(action=>action.type==='next')||legal.find(action=>action.uid==null)||legal[0];
}
function act(packs,state,action){
 const actor=state.pending?.player??state.active;
 return dispatchUniversalAction(packs,state,action,{actor});
}
function phaseCounter(){return {key:'',count:0};}
function driven(packs,state,options,counter){
 const key=state.turn+'|'+state.active+'|'+state.phase;
 if(counter.key!==key){counter.key=key;counter.count=0;}
 const picked=chooseProgressSafeAiAction(packs,state,{...options,actionsInPhase:counter.count});
 counter.count++;
 return picked;
}
function fresh(matchup,seed,first){
 return newUniversalMatch(matchup.packs,{decks:matchup.decks,seed,first,openingMulligan:true});
}

const rows=[];
const training=[];
for(const matchup of matchups)for(const seed of TRAIN_SEEDS)for(const first of [0,1]){
 const matchId='train-'+matchup.name+'-'+seed+'-'+first;
 console.error('train',matchup.name,seed,first);
 const entry={matchup:matchup.name,seed,first,steps:0,status:'incomplete',endReason:null,error:null,phaseBudget:0};
 try{
  let state=fresh(matchup,seed,first);
  const budget=phaseCounter();
  while(state.status==='playing'&&entry.steps<STEP_CAP){
   const seat=state.pending?.player??state.active;
   const legal=legalUniversalActions(matchup.packs,state);
   let choice;
   if(seat===0)choice=teacher(matchup.packs,state);
   else{
    const picked=driven(matchup.packs,state,{difficulty:'hard',...CLOCK},budget);
    choice=picked.action;
    if(picked.reason==='phase-budget')entry.phaseBudget++;
   }
   if(!legal.some(action=>JSON.stringify(action)===JSON.stringify(choice)))
    throw Error('teacher or hard action was illegal');
   if(seat===0&&legal.length>=2)
    rows.push({source:'human',actor:'human',seat:0,matchId,forced:false,
     observation:coachObservation(matchup.packs,state,0),legal,choice});
   state=act(matchup.packs,state,choice);
   entry.steps++;
  }
  entry.status=state.status==='finished'?'finished':'incomplete';
  entry.endReason=state.endReason||null;
  entry.winner=state.status==='finished'?state.winner:null;
 }catch(error){
  entry.status='error';
  entry.error=String(error?.message||error);
 }
 training.push(entry);
}

const policy=trainPolicy(rows);
const games=[];
for(const matchup of matchups)for(const seed of EVAL_SEEDS)for(const first of [0,1]){
 console.error('eval',matchup.name,seed,first);
 const entry={matchup:matchup.name,seed,first,steps:0,status:'incomplete',endReason:null,
  error:null,winner:null,learnedDecisions:0,changed:0,fallbacks:0,phaseBudget:0,reasons:{},
  learnedMs:0,hardMs:0};
 try{
  let state=fresh(matchup,seed,first);
  const budgets=[phaseCounter(),phaseCounter()];
  while(state.status==='playing'&&entry.steps<STEP_CAP){
   const seat=state.pending?.player??state.active;
   const legal=legalUniversalActions(matchup.packs,state);
   const started=performance.now();
   const picked=driven(matchup.packs,state,
    seat===0?{difficulty:'learned',policy,...CLOCK}:{difficulty:'hard',...CLOCK},budgets[seat]);
   const elapsed=performance.now()-started;
   if(picked.reason==='phase-budget')entry.phaseBudget++;
   if(seat===0){entry.learnedMs+=elapsed;entry.learnedDecisions++;}
   else entry.hardMs+=elapsed;
   if(!legal.some(action=>JSON.stringify(action)===JSON.stringify(picked.action)))
    throw Error('chosen action was illegal');
   if(seat===0){
    if(picked.diagnosis?.changed)entry.changed++;
    const reason=picked.diagnosis?.reason||(picked.reason?'driver-'+picked.reason:'none');
    entry.reasons[reason]=(entry.reasons[reason]||0)+1;
    if(reason.startsWith('fallback')||reason.startsWith('protect'))entry.fallbacks++;
   }
   state=act(matchup.packs,state,picked.action);
   entry.steps++;
  }
  if(state.status==='finished'&&DECIDED.has(state.endReason)){
   entry.status='finished';
   entry.endReason=state.endReason;
   entry.winner=state.winner;
  }else if(state.status==='finished'){
   entry.status='error';
   entry.endReason=state.endReason||'finished-unclassified';
  }else entry.status='incomplete';
 }catch(error){
  entry.status='error';
  entry.error=String(error?.message||error);
 }
 games.push(entry);
}

function tally(list){
 const out={games:list.length,learnedWins:0,hardWins:0,incomplete:0,errors:0,byFirst:{}};
 for(const game of list){
  const bucket=out.byFirst[game.first]||(out.byFirst[game.first]={learnedWins:0,hardWins:0,incomplete:0,errors:0,games:0});
  bucket.games++;
  if(game.status==='error'){out.errors++;bucket.errors++;}
  else if(game.status!=='finished'){out.incomplete++;bucket.incomplete++;}
  else if(game.winner===0){out.learnedWins++;bucket.learnedWins++;}
  else {out.hardWins++;bucket.hardWins++;}
 }
 const decided=out.learnedWins+out.hardWins;
 out.learnedWinRate=decided?out.learnedWins/decided:null;
 return out;
}
const learnedDecisions=games.reduce((sum,game)=>sum+game.learnedDecisions,0);
const changed=games.reduce((sum,game)=>sum+game.changed,0);
const report={
 source:'synthetic-engine-teacher',
 disclaimer:'訓練列來自固定的可見資訊規則，不是玩家紀錄。這個勝率不能當作已證實能向真人學習，也不能單獨當作強度提升。',
 seeds:{train:TRAIN_SEEDS,eval:EVAL_SEEDS,note:'種子在看結果之前就已固定。'},
 trainingGames:training,
 trainingRows:rows.length,
 validation:policy.validation,
 trainedSamples:policy.trainedSamples,
 negativeMode:policy.negativeMode,
 evaluation:{
  ...tally(games),
  byMatchup:Object.fromEntries(matchups.map(matchup=>[matchup.name,tally(games.filter(game=>game.matchup===matchup.name))])),
  learnedDecisions,changed,
  influenceRate:learnedDecisions?changed/learnedDecisions:null,
  fallbacks:games.reduce((sum,game)=>sum+game.fallbacks,0),
  phaseBudget:games.reduce((sum,game)=>sum+game.phaseBudget,0)+
   training.reduce((sum,game)=>sum+(game.phaseBudget||0),0),
  learnedMs:Math.round(games.reduce((sum,game)=>sum+game.learnedMs,0)),
  hardMs:Math.round(games.reduce((sum,game)=>sum+game.hardMs,0)),
  meanLearnedMs:learnedDecisions?Math.round(games.reduce((sum,game)=>sum+game.learnedMs,0)/learnedDecisions*10)/10:null
 },
 games
};
console.log(JSON.stringify(report,null,2));
