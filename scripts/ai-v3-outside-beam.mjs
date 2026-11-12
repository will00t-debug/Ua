#!/usr/bin/env node
// The 45 main-phase budget fallbacks whose action was outside the beam.
// Search seed 1, clockless 48. This does not change the default policy.
// A continuation clones the live replay, so the recorded hidden order stays.
// The belief world inside each later search still uses seed 1.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {cloneMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {rankLegal,selectionTrace} from '../dist/universal-v2/ai-v3/beam.mjs';
import {situationalBackup} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {walkTo} from './ai-v3-search-bottleneck.mjs';

const SOURCE='audit/ai-v3-hold-info-8401-baseline.json';
const SCAN='audit/ai-v3-unscored-budget.json';
const OUT='audit/ai-v3-outside-beam.json';
const SUMMARY='audit/ai-v3-outside-beam-summary.json';
const SEARCH_SEED=1;
const PLAY=process.env.AI_V3_PLAYOUT!=='0';

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function idOf(action){
 return {type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null};
}
function sameId(a,b){return same(idOf(a),idOf(b));}
function label(action){
 const item=idOf(action);
 return [item.type,item.line||'',item.uid||'',item.mode||''].join(':');
}
function kindOf(action){
 if(!action)return 'none';
 if(action.type==='play'||action.type==='raid')return action.type+':'+(action.line||'');
 return action.type;
}
function bag(rows,keyOf){
 const counts=new Map();
 for(const row of rows){
  const key=keyOf(row);
  counts.set(key,(counts.get(key)||0)+1);
 }
 return Object.fromEntries([...counts.entries()].sort((a,b)=>b[1]-a[1]));
}
function hashOf(state){return createHash('sha256').update(JSON.stringify(state)).digest('hex');}
function findGame(report,row){
 return report.titles[row.deck].byMode.tree.games.find(item=>item.seed===row.gameSeed&&item.first===row.first&&item.challengerSeat===row.seat);
}
function cardText(pack,player,uid){
 if(!uid)return null;
 const card=[...(player.hand||[]),...(player.front||[]),...(player.energy||[])].find(item=>item?.uid===uid);
 const printed=card&&pack.cards[card.cardId];
 if(!printed)return uid;
 return `${printed.id||card.cardId} ${printed.name||''} ${printed.energy}/${printed.bp}`;
}
function colors(pack,state,actor){
 try{return universalEnergyByColor(pack,state,actor)||{};}
 catch{return {};}
}
function payable(pack,state,actor){
 const have=colors(pack,state,actor);
 let count=0;
 for(const card of state.players[actor].hand||[]){
  const printed=pack.cards[card.cardId];
  if(printed?.type!=='character')continue;
  if((printed.energy||0)<=(have[printed.color]||0))count++;
 }
 return count;
}
function readyAp(player){return (player.apCards||[]).filter(card=>card?.ready).length;}
function board(packs,state,actor){
 return {
  turn:state.turn,phase:state.phase,pending:state.pending?.kind||null,active:state.active,
  life:state.players.map(player=>player.life.length),
  ap:readyAp(state.players[actor]),
  energy:colors(packs[actor],state,actor),
  payable:payable(packs[actor],state,actor),
  front:(state.players[actor].front||[]).filter(Boolean).length
 };
}
function matchLegal(legal,action){
 return legal.find(item=>same(item,action))||legal.find(item=>sameId(item,action))||null;
}
function ask(packs,state,actor,extra){
 resetAiV3Report();
 const meter={dispatches:0};
 const action=chooseAiV3Action(packs,state,{
  actor,nodes:48,ms:1e9,beam:4,actorDecisions:2,opponentDecisions:2,worlds:1,
  seed:SEARCH_SEED,plan:'tree',diagnose:true,meter,...extra
 });
 return {action,trace:lastAiV3Trace(),dispatches:meter.dispatches};
}
function hardAsk(packs,state){
 resetHardAiReport();
 return chooseStrengthenedHardAction(packs,state,{nodes:48,ms:1e9,seed:SEARCH_SEED});
}
function lineOf(row){
 return {
  type:row.type??row.action?.type??null,
  line:row.line??row.action?.line??null,
  uid:row.uid??row.action?.uid??null,
  boundary:row.boundary||null,
  search:Number.isFinite(row.search)?Math.round(row.search*10)/10:null,
  nodes:row.nodes||0,cut:row.cut||null,
  phase:row.phase||null,pending:row.pending||null,stopPending:row.stopPending||null,
  responses:row.responses||0,opponentTurns:row.opponentTurns||0,
  develops:row.develops===true
 };
}
function v3(packs,state,actor){
 resetAiV3Report();
 return chooseAiV3Action(packs,state,{
  actor,nodes:48,ms:1e9,beam:4,actorDecisions:2,opponentDecisions:2,worlds:1,
  seed:SEARCH_SEED,plan:'tree'
 });
}
function hard(packs,state){
 resetHardAiReport();
 return chooseStrengthenedHardAction(packs,state,{nodes:48,ms:1e9,seed:SEARCH_SEED});
}
function playout(packs,start,challenger,step){
 let cursor=start,steps=step,illegal=0,attacks=0,attacksThisTurn=0;
 const startTurn=cursor.turn;
 const startLife=cursor.players.map(player=>player.life.length);
 let turnEnd=null;
 while(cursor.status==='playing'&&steps<400){
  const actor=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const picked=actor===challenger?v3(packs,cursor,actor):hard(packs,cursor);
  const action=legal.find(item=>same(item,picked));
  if(!action){illegal++;break;}
  if(actor===challenger&&action.type==='attack'){
   attacks++;
   if(cursor.turn===startTurn)attacksThisTurn++;
  }
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
  steps++;
  if(!turnEnd&&cursor.turn!==startTurn)turnEnd=board(packs,cursor,challenger);
 }
 return {
  status:cursor.status,winner:cursor.winner,life:cursor.players.map(player=>player.life.length),
  startLife,steps,illegal,attacks,attacksThisTurn,
  turnEnd,end:cursor.status==='playing'?null:board(packs,cursor,challenger)
 };
}

function classifyOne(deck,game,mark){
 const {packs,state}=walkTo(deck,game,mark.step);
 const actor=state.pending?.player??state.active;
 const legal=legalUniversalActions(packs,state);
 const seen=ask(packs,state,actor);
 const exact=matchLegal(legal,seen.action);
 const trace=seen.trace;
 const planned=(trace?.rootPlan||[]).map(note=>note.action||note);
 const pack=packs[actor];
 const player=state.players[actor];
 const ordered=rankLegal(pack,state,actor,legal,null);
 const top=ordered[0]||null;
 const backup=situationalBackup(pack,state,actor,legal,top)||top;
 const live=selectionTrace(pack,state,actor,legal,4,null);
 const liveBeam=live.picked;
 const noteFor=action=>live.notes.find(note=>sameId(note.action,action))?.reason||null;
 const stages=(trace?.stages||[]).map(stage=>({stage:stage.stage,type:stage.type,line:stage.line||null,uid:stage.uid??null,mode:stage.mode||null}));
 let previous=null;
 const changedBy=[];
 for(const stage of stages){
  if(previous&&!sameId(previous,stage))changedBy.push(stage.stage);
  previous=stage;
 }
 const before=board(packs,state,actor);
 const afterOf=action=>{
  const found=matchLegal(legal,action);
  if(!found)return null;
  const next=dispatchUniversalAction(packs,cloneMatch(state),found,{actor});
  return board(packs,next,actor);
 };
 const lines=(mark.lines||[]).map(lineOf);
 const proven=lines.some(line=>line.boundary==='terminal'&&line.search>=90000);
 const roots=planned.map(action=>{
  const line=lines.find(item=>item.type===action.type&&(item.line||null)===(action.line||null)&&(item.uid??null)===(action.uid??null));
  return {
   action:idOf(action),label:label(action),
   card:cardText(pack,player,action.uid),
   base:action.baseUid?cardText(pack,player,action.baseUid):null,
   ...(line||{}),
   after:afterOf(action)
  };
 });
 const sameCard=roots.some(root=>root.action.uid&&root.action.uid===exact?.uid&&!sameId(root.action,exact));
 const topReason=noteFor(top);
 const keptReason=noteFor(exact);
 let why='live-rank';
 if(!sameId(exact,top)&&sameId(exact,backup))why='situational-backup';
 else if(!sameId(exact,backup))why=changedBy[0]?'preference:'+changedBy.join(','):'other';
 else if(topReason==='replaced-by-front')why='evicted-for-front';
 else if(topReason==='replaced-by-safe')why='evicted-for-safe';
 else if(!liveBeam.some(item=>sameId(item,exact)))why='outside-live-beam';
 else if(!planned.some(item=>sameId(item,exact)))why='belief-beam';
 return {
  id:mark.id,deck:mark.deck,gameSeed:mark.gameSeed,first:mark.first,seat:mark.seat,step:mark.step,
  hash:hashOf(state),phase:state.phase,pending:state.pending?.kind||null,
  life:before.life,ap:before.ap,energy:before.energy,payable:before.payable,legalCount:legal.length,
  action:idOf(exact),label:label(exact),kind:kindOf(exact),
  card:cardText(pack,player,exact?.uid),
  base:exact?.baseUid?cardText(pack,player,exact.baseUid):null,
  why,changedBy,stages,
  rankTop:idOf(top),rankTopLabel:label(top),rankTopInBeam:planned.some(item=>sameId(item,top)),
  beamReason:keptReason,rankTopBeamReason:topReason,
  backup:idOf(backup),backupInBeam:planned.some(item=>sameId(item,backup)),
  inLiveBeam:liveBeam.some(item=>sameId(item,exact)),
  inSearchedBeam:planned.some(item=>sameId(item,exact)),
  sameCardOtherMode:sameCard,
  provenKill:proven,
  after:afterOf(exact),
  roots,gate:mark.gate,places:mark.places,
  nodesUsed:trace?.nodesUsed??null,dispatches:seen.dispatches,
  recordedWinner:game.winner,recordedLife:game.life,recordedWon:game.challengerWon===true
 };
}

function representatives(rows){
 const picked=[];
 const take=row=>{if(row&&!picked.some(item=>item.id===row.id&&item.step===row.step))picked.push(row);};
 take(rows.find(row=>row.id==='sword-art-online-raid|8401|0|1'&&row.step===67));
 const kinds=['play:energy','play:front','raid:energy','raid:'];
 for(const kind of kinds){
  const pool=rows.filter(row=>row.kind===kind&&!picked.some(item=>item.id===row.id&&item.step===row.step));
  pool.sort((a,b)=>b.legalCount-a.legalCount||a.step-b.step);
  take(pool[0]);
 }
 for(const deck of ['white-sword','sword-art-online-raid','steins-gate-raid']){
  if(picked.some(row=>row.deck===deck))continue;
  const pool=rows.filter(row=>row.deck===deck);
  pool.sort((a,b)=>b.legalCount-a.legalCount);
  take(pool[0]);
 }
 return picked;
}

function main(){
 const report=JSON.parse(readFileSync(SOURCE,'utf8'));
 const scan=JSON.parse(readFileSync(SCAN,'utf8'));
 const marks=scan.rows.filter(row=>!row.inBeam);
 const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
 const rows=[];
 for(const mark of marks){
  const game=findGame(report,mark);
  const row=classifyOne(decks.get(mark.deck),game,mark);
  rows.push(row);
  console.error('class',row.why,row.id,row.step,row.kind,row.label,'liveBeam',row.inLiveBeam,'sameCard',row.sameCardOtherMode,'legal',row.legalCount);
 }
 const reps=representatives(rows);
 console.error('reps',reps.map(row=>row.id+'@'+row.step+' '+row.kind).join(' | '));
 const played=[];
 if(PLAY){
  for(const row of reps){
   const game=findGame(report,row);
   const {packs,state}=walkTo(decks.get(row.deck),game,row.step);
   const actor=state.pending?.player??state.active;
   const legal=legalUniversalActions(packs,state);
   const deep=ask(packs,state,actor,{nodes:192});
   const deepExact=matchLegal(legal,deep.action);
   const deepTrace=deep.trace;
   const deepLines=(deepTrace?.compared||deepTrace?.candidates||[]).filter(item=>item.executed!==false).map(lineOf);
   const hardExact=matchLegal(legal,hardAsk(packs,state));
   const branches=[];
   const seen=new Set();
   const add=(name,action)=>{
    const found=matchLegal(legal,action);
    if(!found)return;
    const key=label(found);
    if(seen.has(key))return;
    seen.add(key);
    const started=performance.now();
    const next=dispatchUniversalAction(packs,cloneMatch(state),found,{actor});
    const result=playout(packs,next,row.seat,row.step+1);
    result.name=name;
    result.action=idOf(found);
    result.label=key;
    result.immediate=board(packs,next,actor);
    result.won=result.winner===row.seat;
    result.ms=Math.round(performance.now()-started);
    branches.push(result);
    console.error('play',row.id,row.step,name,key,'life',result.life,'winner',result.winner,'attacks',result.attacks,'ms',result.ms);
   };
   add('fallback',row.action);
   for(const root of row.roots)add('beam',root.action);
   add('hard',hardExact);
   played.push({
    id:row.id,step:row.step,kind:row.kind,why:row.why,legalCount:row.legalCount,
    fallback:row.label,recordedWinner:row.recordedWinner,recordedLife:row.recordedLife,
    deep:{
     action:idOf(deepExact),label:label(deepExact),reason:deepTrace?.reason||null,
     inBeam48:row.roots.some(root=>sameId(root.action,deepExact))||sameId(row.action,deepExact),
     nodes:deepTrace?.nodesUsed??null,lines:deepLines
    },
    hard:idOf(hardExact),hardLabel:label(hardExact),
    branches
   });
  }
 }
 const summary={
  base:'e9b864c4d802acda8378970c9a2e4c8ea6b2f48f',
  searchSeed:SEARCH_SEED,nodes:48,clock:'1e9',decisions:rows.length,
  kinds:bag(rows,row=>row.kind),
  why:bag(rows,row=>row.why),
  decks:bag(rows,row=>row.deck+' '+row.kind),
  inLiveBeam:rows.filter(row=>row.inLiveBeam).length,
  beliefBeam:rows.filter(row=>row.why==='live-rank-belief-beam').length,
  sameCardOtherMode:rows.filter(row=>row.sameCardOtherMode).length,
  beamReason:bag(rows,row=>row.beamReason||'none'),
  provenKill:rows.filter(row=>row.provenKill).length,
  rankTopInBeam:rows.filter(row=>row.rankTopInBeam).length,
  preference:rows.filter(row=>row.why.startsWith('preference')).length,
  situational:rows.filter(row=>row.why==='situational-backup').length,
  representatives:reps.map(row=>({id:row.id,step:row.step,kind:row.kind,legal:row.legalCount,why:row.why,action:row.label}))
 };
 if(PLAY){
  summary.playouts=played.map(row=>{
   const fallback=row.branches.find(item=>item.name==='fallback');
   const others=row.branches.filter(item=>item.name!=='fallback');
   return {
    id:row.id,step:row.step,kind:row.kind,fallback:row.fallback,
    recordedLife:row.recordedLife,recordedWinner:row.recordedWinner,
    controlLife:fallback?.life||null,controlWinner:fallback?.winner??null,
    controlMatchesRecord:fallback?fallback.winner===row.recordedWinner&&JSON.stringify(fallback.life)===JSON.stringify(row.recordedLife):false,
    deep:row.deep.label,deepInBeam48:row.deep.inBeam48,deepReason:row.deep.reason,
    hard:row.hardLabel,
    branches:row.branches.map(item=>({
     name:item.name,label:item.label,life:item.life,winner:item.winner,won:item.won,
     attacks:item.attacks,attacksThisTurn:item.attacksThisTurn,
     turnLife:item.turnEnd?.life||null,turnEnergy:item.turnEnd?.energy||null,turnAp:item.turnEnd?.ap??null,
     immediateEnergy:item.immediate?.energy||null,immediateAp:item.immediate?.ap??null,immediatePayable:item.immediate?.payable??null,
     illegal:item.illegal,steps:item.steps
    }))
   };
  });
  const flips=[];
  for(const row of summary.playouts){
   const control=row.branches.find(item=>item.name==='fallback');
   for(const branch of row.branches){
    if(branch.name==='fallback'||branch.name==='hard')continue;
    if(branch.won!==control?.won)flips.push({id:row.id,step:row.step,from:control?.label,to:branch.label,controlWon:control?.won,branchWon:branch.won,controlLife:control?.life,branchLife:branch.life});
   }
  }
  summary.flips=flips;
 }
 const detail={base:summary.base,searchSeed:SEARCH_SEED,summary,rows,playouts:played};
 writeFileSync(OUT,JSON.stringify(detail));
 writeFileSync(SUMMARY,JSON.stringify(summary,null,2));
 console.error(JSON.stringify(summary,null,2));
}
main();
