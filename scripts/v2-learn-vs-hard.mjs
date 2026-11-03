#!/usr/bin/env node
// Reproducible learned-vs-hard comparison.
// Training rows come from a visible-information teacher playing the engine.
// They are not human decisions and are not committed.
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
const EXPLORATORY_GAMES=8;

const bleach=verifiedBleachPurplePilotDeck();
const ttg=verifiedTtgRedPilotDeck();
const layouts=[
 {name:'bleach-mirror',packs:[bleach.pack,bleach.pack],decks:[bleach.counts,bleach.counts]},
 {name:'bleach-vs-ttg',packs:[bleach.pack,ttg.pack],decks:[bleach.counts,ttg.counts]},
 {name:'ttg-vs-bleach',packs:[ttg.pack,bleach.pack],decks:[ttg.counts,bleach.counts]}
];

function cardIdOf(view,uid){
 if(typeof uid!=='string')return null;
 for(const player of view.players){
  for(const line of ['front','energy','hand']){
   const found=(player[line]||[]).find(card=>card?.uid===uid);
   if(found?.cardId)return found.cardId;
  }
 }
 return null;
}
function briefAction(view,action){
 return {type:action?.type||null,mode:action?.mode||null,place:action?.place||null,
  line:action?.line||null,slot:Number.isInteger(action?.slot)?action.slot:null,
  cardId:cardIdOf(view,action?.uid)};
}
function firstChangeOf(layout,state,seat,picked){
 const view=universalPublicView(layout.packs,state,seat);
 const diagnosis=picked.diagnosis||{};
 return {
  turn:state.turn,phase:state.phase,pending:state.pending?.kind||null,seat,
  board:view.players.map(player=>({
   life:player.lifeCount,
   hand:player.handCount,
   front:(player.front||[]).filter(Boolean).map(card=>card.cardId),
   energy:(player.energy||[]).filter(Boolean).map(card=>card.cardId)
  })),
  hard:briefAction(view,diagnosis.hardAction),
  learned:briefAction(view,diagnosis.finalAction),
  hardScore:diagnosis.hardScore,
  preferenceScore:diagnosis.preferenceScore,
  bonus:diagnosis.bonus??0,
  reason:diagnosis.reason||null
 };
}
function deckAt(layout,seat){
 if(layout.name==='bleach-mirror')return 'bleach';
 if(layout.name==='bleach-vs-ttg')return seat===0?'bleach':'ttg';
 return seat===0?'ttg':'bleach';
}
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
function fresh(layout,seed,first){
 return newUniversalMatch(layout.packs,{decks:layout.decks,seed,first,openingMulligan:true});
}
function blank(layout,seed,first,extra){
 return {kind:extra.kind,layout:layout.name,seed,first,learnedSeat:extra.learnedSeat??null,
  learnedDeck:extra.learnedSeat==null?null:deckAt(layout,extra.learnedSeat),
  steps:0,status:'incomplete',endReason:null,error:null,winner:null,
  learnedDecisions:0,hardDecisions:0,changed:0,fallbacks:0,phaseBudget:0,reasons:{},
  learnedMs:0,hardMs:0,firstChange:null};
}

const rows=[];
const training=[];
for(const layout of layouts)for(const seed of TRAIN_SEEDS)for(const first of [0,1]){
 const matchId='train-'+layout.name+'-'+seed+'-'+first;
 console.error('train',layout.name,seed,first);
 const entry=blank(layout,seed,first,{kind:'train'});
 try{
  let state=fresh(layout,seed,first);
  const budget=phaseCounter();
  while(state.status==='playing'&&entry.steps<STEP_CAP){
   const seat=state.pending?.player??state.active;
   const legal=legalUniversalActions(layout.packs,state);
   let choice;
   if(seat===0)choice=teacher(layout.packs,state);
   else{
    const picked=driven(layout.packs,state,{difficulty:'hard',...CLOCK},budget);
    choice=picked.action;
    if(picked.reason==='phase-budget')entry.phaseBudget++;
   }
   if(!legal.some(action=>JSON.stringify(action)===JSON.stringify(choice)))
    throw Error('teacher or hard action was illegal');
   if(seat===0&&legal.length>=2)
    rows.push({source:'human',actor:'human',seat:0,matchId,forced:false,
     observation:coachObservation(layout.packs,state,0),legal,choice});
   state=act(layout.packs,state,choice);
   entry.steps++;
  }
  entry.status=state.status==='finished'&&DECIDED.has(state.endReason)?'finished':'incomplete';
  entry.endReason=state.endReason||null;
  entry.winner=entry.status==='finished'?state.winner:null;
 }catch(error){
  entry.status='error';
  entry.error=String(error?.message||error);
 }
 training.push(entry);
}

const policy=trainPolicy(rows);
const games=[];
function play(layout,seed,first,role){
 console.error(role.kind,layout.name,'seat',role.learnedSeat??'-',seed,first);
 const entry=blank(layout,seed,first,role);
 try{
  let state=fresh(layout,seed,first);
  const budgets=[phaseCounter(),phaseCounter()];
  while(state.status==='playing'&&entry.steps<STEP_CAP){
   const seat=state.pending?.player??state.active;
   const legal=legalUniversalActions(layout.packs,state);
   const learned=role.kind==='learned'&&seat===role.learnedSeat;
   const started=performance.now();
   const picked=driven(layout.packs,state,
    learned?{difficulty:'learned',policy,...CLOCK}:{difficulty:'hard',...CLOCK},budgets[seat]);
   const elapsed=performance.now()-started;
   if(picked.reason==='phase-budget')entry.phaseBudget++;
   if(learned){
    entry.learnedMs+=elapsed;
    entry.learnedDecisions++;
    if(picked.diagnosis?.changed){
     entry.changed++;
     if(!entry.firstChange)entry.firstChange=firstChangeOf(layout,state,seat,picked);
    }
    const reason=picked.diagnosis?.reason||(picked.reason?'driver-'+picked.reason:'none');
    entry.reasons[reason]=(entry.reasons[reason]||0)+1;
    if(reason.startsWith('fallback')||reason.startsWith('protect'))entry.fallbacks++;
   }else{
    entry.hardMs+=elapsed;
    entry.hardDecisions++;
   }
   if(!legal.some(action=>JSON.stringify(action)===JSON.stringify(picked.action)))
    throw Error('chosen action was illegal');
   state=act(layout.packs,state,picked.action);
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

for(const layout of layouts)for(const seed of EVAL_SEEDS)for(const first of [0,1]){
 play(layout,seed,first,{kind:'baseline'});
 for(const learnedSeat of [0,1])play(layout,seed,first,{kind:'learned',learnedSeat});
}

function countStatus(list){
 const out={games:list.length,finished:0,incomplete:0,errors:0};
 for(const game of list){
  if(game.status==='error')out.errors++;
  else if(game.status==='finished')out.finished++;
  else out.incomplete++;
 }
 return out;
}
function seatResult(list,seat){
 const status=countStatus(list);
 const finished=list.filter(game=>game.status==='finished');
 const wins=finished.filter(game=>game.winner===seat).length;
 return {...status,seat,wins,losses:finished.length-wins,
  winRate:finished.length?wins/finished.length:null};
}
function sum(list,key){return list.reduce((total,game)=>total+(game[key]||0),0);}
function round(value){return value==null?null:Math.round(value*1000)/1000;}

const learnedGames=games.filter(game=>game.kind==='learned');
const baselineGames=games.filter(game=>game.kind==='baseline');
const cells=[];
for(const layout of layouts)for(const learnedSeat of [0,1]){
 const learned=learnedGames.filter(game=>game.layout===layout.name&&game.learnedSeat===learnedSeat);
 const baseline=baselineGames.filter(game=>game.layout===layout.name);
 const learnedSeatResult=seatResult(learned,learnedSeat);
 const baselineSeatResult=seatResult(baseline,learnedSeat);
 const decisions=sum(learned,'learnedDecisions');
 const changed=sum(learned,'changed');
 cells.push({
  layout:layout.name,learnedSeat,learnedDeck:deckAt(layout,learnedSeat),
  learned:learnedSeatResult,baseline:baselineSeatResult,
  delta:learnedSeatResult.winRate==null||baselineSeatResult.winRate==null?null:
   round(learnedSeatResult.winRate-baselineSeatResult.winRate),
  learnedDecisions:decisions,changed,influenceRate:decisions?round(changed/decisions):null,
  fallbacks:sum(learned,'fallbacks'),phaseBudget:sum(learned,'phaseBudget'),
  learnedMs:Math.round(sum(learned,'learnedMs')),
  hardMs:Math.round(sum(learned,'hardMs')),
  meanLearnedMs:decisions?Math.round(sum(learned,'learnedMs')/decisions*10)/10:null,
  exploratory:learnedSeatResult.finished<EXPLORATORY_GAMES||baselineSeatResult.finished<EXPLORATORY_GAMES
 });
}
const learnedDecisions=sum(learnedGames,'learnedDecisions');
function playHard(layout,state){
 const budgets=[phaseCounter(),phaseCounter()];
 let steps=0;
 while(state.status==='playing'&&steps<STEP_CAP){
  const legal=legalUniversalActions(layout.packs,state);
  const picked=driven(layout.packs,state,{difficulty:'hard',...CLOCK},budgets[state.pending?.player??state.active]);
  if(!legal.some(action=>JSON.stringify(action)===JSON.stringify(picked.action)))
   return {status:'error',winner:null,endReason:'illegal',steps};
  state=act(layout.packs,state,picked.action);
  steps++;
 }
 const finished=state.status==='finished'&&DECIDED.has(state.endReason);
 return {status:finished?'finished':state.status||'incomplete',winner:finished?state.winner:null,
  endReason:state.endReason||null,steps};
}
function forkFirstChange(layout,seed,first,learnedSeat){
 let state=fresh(layout,seed,first);
 const budgets=[phaseCounter(),phaseCounter()];
 let steps=0;
 while(state.status==='playing'&&steps<STEP_CAP){
  const seat=state.pending?.player??state.active;
  const learned=seat===learnedSeat;
  const picked=driven(layout.packs,state,
   learned?{difficulty:'learned',policy,...CLOCK}:{difficulty:'hard',...CLOCK},budgets[seat]);
  if(learned&&picked.diagnosis?.changed){
   return {
    hardContinuation:playHard(layout,act(layout.packs,structuredClone(state),picked.diagnosis.hardAction)),
    learnedContinuation:playHard(layout,act(layout.packs,structuredClone(state),picked.action))
   };
  }
  state=act(layout.packs,state,picked.action);
  steps++;
 }
 return null;
}
const lossFlips=learnedGames.filter(game=>{
 if(game.status!=='finished'||game.learnedSeat==null||game.winner===game.learnedSeat)return false;
 const baseline=baselineGames.find(item=>item.layout===game.layout&&item.seed===game.seed&&
  item.first===game.first&&item.status==='finished');
 return !!baseline&&baseline.winner===game.learnedSeat;
});
const forkTargets=[
 ...lossFlips.filter(game=>game.layout==='bleach-vs-ttg'&&game.learnedSeat===1),
 ...lossFlips.filter(game=>!(game.layout==='bleach-vs-ttg'&&game.learnedSeat===1))
].slice(0,6);
const regressions=forkTargets.map(game=>{
 const layout=layouts.find(item=>item.name===game.layout);
 console.error('fork',game.layout,'seat',game.learnedSeat,game.seed,game.first);
 const fork=forkFirstChange(layout,game.seed,game.first,game.learnedSeat);
 const caused=!!fork&&fork.hardContinuation?.winner===game.learnedSeat&&
  fork.learnedContinuation?.winner!==game.learnedSeat;
 return {layout:game.layout,seed:game.seed,first:game.first,learnedSeat:game.learnedSeat,
  learnedDeck:game.learnedDeck,baselineWinner:game.learnedSeat,learnedWinner:game.winner,
  firstChange:game.firstChange,fork,switchExplainsLoss:caused};
});
const report={
 source:'synthetic-engine-teacher',
 disclaimer:'訓練列來自固定的可見資訊規則，不是玩家紀錄，也沒有提交真人決策。模仿相同比例不是勝率。對局數不足，以下是探索性結果，不能當成已經證實強度提升。',
 exploratory:cells.some(cell=>cell.exploratory)||learnedGames.filter(game=>game.status==='finished').length<EXPLORATORY_GAMES,
 exploratoryReason:'每個座位與牌組組合的完賽對局少於 '+EXPLORATORY_GAMES+' 場。評估清單在開跑前就固定，沒有事後挑選種子。',
 seeds:{train:TRAIN_SEEDS,eval:EVAL_SEEDS,note:'訓練種子和評估種子分開，而且在看結果之前就已固定。'},
 training:{
  games:training.length,
  ...countStatus(training),
  rows:rows.length,
  phaseBudget:sum(training,'phaseBudget'),
  teacherSeat:0,
  layouts:layouts.map(layout=>layout.name)
 },
 validation:{
  accepted:policy.validation?.accepted===true,
  acceptReason:policy.validation?.acceptReason||null,
  splitValid:policy.validation?.splitValid===true,
  evaluationSufficient:policy.validation?.evaluationSufficient===true,
  agreement:policy.validation?.agreement??null,
  overallAgreement:policy.validation?.overallAgreement??null,
  intervenableSamples:policy.validation?.intervenableSamples??0,
  heldoutMatches:policy.validation?.heldoutMatches??0,
  heldoutSamples:policy.validation?.heldoutSamples??0,
  note:'這裡的 agreement 是留出對局的模仿相同比例，不是勝率。伺服器只有 accepted 為真才會啟用模型。'
 },
 trainedSamples:policy.trainedSamples,
 negativeMode:policy.negativeMode,
 cells,
 evaluation:{
  ...countStatus(learnedGames),
  learnedDecisions,changed:sum(learnedGames,'changed'),
  influenceRate:learnedDecisions?round(sum(learnedGames,'changed')/learnedDecisions):null,
  fallbacks:sum(learnedGames,'fallbacks'),
  phaseBudget:sum(learnedGames,'phaseBudget')+sum(baselineGames,'phaseBudget')+sum(training,'phaseBudget'),
  learnedMs:Math.round(sum(learnedGames,'learnedMs')),
  hardMs:Math.round(sum(learnedGames,'hardMs')+sum(baselineGames,'hardMs')),
  meanLearnedMs:learnedDecisions?Math.round(sum(learnedGames,'learnedMs')/learnedDecisions*10)/10:null
 },
 baseline:countStatus(baselineGames),
 lossFlips:lossFlips.length,
 regressions,
 games:[...training,...games]
};
console.log(JSON.stringify(report,null,2));
