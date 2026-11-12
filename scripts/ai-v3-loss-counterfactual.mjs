#!/usr/bin/env node
// From each recorded loss, branch once at the first generator rewrite.
// The replacement is the action the search had already chosen. Both seats
// then continue with the same policies. This is a diagnosis, not a new
// validation set.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {newComparedMatch,matchRules,cloneMatch} from '../dist/universal-v2/ai-v3/opening.mjs';

const RULES=matchRules('official');
const LIMITS={...MATCH_LIMITS,ms:1e9,nodes:48,seed:1};
const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
const report=JSON.parse(readFileSync('audit/ai-v3-main-front-8401-baseline.json','utf8'));
const scan=JSON.parse(readFileSync('audit/ai-v3-loss-scan.json','utf8'));
const first=new Map();
for(const row of scan.rows){
 if(row.won||row.rewrite?.stage!=='generator')continue;
 if(!first.has(row.id)||row.step<first.get(row.id))first.set(row.id,row.step);
}
function stateHash(state){return createHash('sha256').update(JSON.stringify(state)).digest('hex');}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function fresh(deck,seed,firstPlayer){
 const packs=[deck.pack,deck.pack];
 return {packs,state:newComparedMatch(packs,[deck.counts,deck.counts],seed,firstPlayer,RULES)};
}
function cardLine(pack,player,uid){
 const card=[...(player.hand||[]),...(player.front||[]),...(player.energy||[])].find(item=>item?.uid===uid);
 const printed=card&&pack.cards[card.cardId];
 if(!printed)return uid;
 return `${uid} ${printed.id||card.cardId} ${printed.name||''} ${printed.energy}/${printed.bp} gen ${printed.gen||0}`;
}
function brief(action){
 if(!action)return null;
 return {type:action.type,line:action.line||null,uid:action.uid??null,mode:action.mode||null};
}
function v3(packs,state,actor){
 resetAiV3Report();
 const meter={dispatches:0};
 const action=chooseAiV3Action(packs,state,{actor,...LIMITS,plan:'tree',meter});
 return {action,trace:lastAiV3Trace(),dispatches:meter.dispatches};
}
function hard(packs,state){
 resetHardAiReport();
 return chooseStrengthenedHardAction(packs,state,{nodes:48,ms:1e9,seed:1});
}
function playout(packs,state,challenger,step){
 let cursor=state,steps=step,illegal=0;
 while(cursor.status==='playing'&&steps<400){
  const actor=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const picked=actor===challenger?v3(packs,cursor,actor).action:hard(packs,cursor);
  const action=legal.find(item=>same(item,picked));
  if(!action){illegal++;break;}
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
  steps++;
 }
 return {status:cursor.status,winner:cursor.winner,life:cursor.players.map(player=>player.life.length),steps,illegal};
}
const results=[];
for(const [title,block] of Object.entries(report.titles)){
 const deck=decks.get(title);
 for(const game of block.byMode.tree.games){
  const id=`${title}|${game.seed}|first${game.first}|seat${game.challengerSeat}`;
  const at=first.get(id);
  if(at==null)continue;
  const {packs,state}=fresh(deck,game.seed,game.first);
  let cursor=state;
  for(const choice of game.opening||[]){
   const legal=legalUniversalActions(packs,cursor);
   const action=legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
   cursor=dispatchUniversalAction(packs,cursor,action,{actor:choice.actor});
  }
  for(const step of game.actions){
   if(step.step===at)break;
   const actor=cursor.pending?.player??cursor.active;
   const legal=legalUniversalActions(packs,cursor);
   const action=legal.find(item=>same(item,step.action));
   cursor=dispatchUniversalAction(packs,cursor,action,{actor});
  }
  const actor=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const seen=v3(packs,cursor,actor);
  const stages=seen.trace?.stages||[];
  const search=stages.find(row=>row.stage==='search');
  const searchAction=legal.find(item=>item.type===search?.type&&(item.line||null)===(search?.line||null)&&(item.uid??null)===(search?.uid??null)&&(item.mode||null)===(search?.mode||null));
  const kept=legal.find(item=>same(item,seen.action));
  const hardAction=legal.find(item=>same(item,hard(packs,cursor)));
  const pack=packs[actor];
  const player=cursor.players[actor];
  const snap={
   id,step:at,seat:game.challengerSeat,hash:stateHash(cursor),
   phase:cursor.phase,pending:cursor.pending?.kind||null,turn:cursor.turn,
   life:cursor.players.map(item=>item.life.length),
   readyAp:(player.apCards||[]).filter(item=>item.ready).length,
   legal:legal.length,
   search:searchAction?{...brief(searchAction),card:cardLine(pack,player,searchAction.uid)}:null,
   kept:kept?{...brief(kept),card:cardLine(pack,player,kept.uid)}:null,
   hard:hardAction?{...brief(hardAction),card:cardLine(pack,player,hardAction.uid)}:null,
   nodes:seen.trace?.nodesUsed??null,dispatches:seen.dispatches,
   lines:(seen.trace?.candidates||seen.trace?.compared||[]).filter(row=>row.executed!==false).map(row=>({
    ...brief(row.action),boundary:row.boundary,search:Math.round(row.search*10)/10,nodes:row.nodes,cut:row.cut||null
   }))
  };
  const control=playout(packs,cloneMatch(cursor),game.challengerSeat,at);
  const branch=searchAction&&!same(searchAction,kept)?playout(packs,dispatchUniversalAction(packs,cloneMatch(cursor),searchAction,{actor}),game.challengerSeat,at+1):null;
  const row={snap,recordedWinner:game.winner,recordedLife:game.life,
   control,branch,
   controlWon:control.winner===game.challengerSeat,
   branchWon:branch?branch.winner===game.challengerSeat:null};
  results.push(row);
  console.error(id,'step',at,'kept',snap.kept?.type,snap.kept?.line,'search',snap.search?.type,snap.search?.line,
   'hard',snap.hard?.type,snap.hard?.line,'control',control.life,control.winner,'branch',branch&&branch.life,branch&&branch.winner);
 }
}
const flips=results.filter(row=>row.branch&&row.branchWon!==row.controlWon);
console.log(JSON.stringify({
 games:results.length,
 hardAgreesKept:results.filter(row=>JSON.stringify(row.snap.hard)===JSON.stringify(row.snap.kept)).length,
 hardAgreesSearch:results.filter(row=>row.snap.hard&&row.snap.search&&row.snap.hard.type===row.snap.search.type&&row.snap.hard.uid===row.snap.search.uid&&row.snap.hard.line===row.snap.search.line).length,
 controlWon:results.filter(row=>row.controlWon).length,
 branchWon:results.filter(row=>row.branchWon).length,
 flips:flips.map(row=>({id:row.id,step:row.snap.step,control:row.control,branch:row.branch})),
 results
},null,2));
