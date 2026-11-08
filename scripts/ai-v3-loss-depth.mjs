#!/usr/bin/env node
// Six snapshots. More nodes and a deeper actor limit are diagnostic only.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {newComparedMatch,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';

const RULES=matchRules('official');
const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
const report=JSON.parse(readFileSync('audit/ai-v3-main-front-8401-baseline.json','utf8'));
const targets=[
 ['white-sword',8401,0,0,10],
 ['sword-art-online-raid',8401,0,0,12],
 ['steins-gate-raid',8401,0,0,14],
 ['white-sword',8401,0,0,27],
 ['sword-art-online-raid',8401,0,0,56],
 ['steins-gate-raid',8401,0,1,20]
];
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function label(action){
 if(!action)return 'none';
 if(action.type==='play')return `play:${action.line}:${action.uid}`;
 if(action.type==='chooseBlock')return action.uid==null?'block-pass':'block:'+action.uid;
 return action.type+(action.uid?':'+action.uid:'');
}
function ask(packs,state,actor,extra){
 resetAiV3Report();
 const meter={dispatches:0};
 const action=chooseAiV3Action(packs,state,{actor,...MATCH_LIMITS,ms:1e9,seed:1,plan:'tree',meter,...extra});
 const trace=lastAiV3Trace();
 const lines=(trace?.candidates||trace?.compared||[]).filter(row=>row?.executed!==false&&Number.isFinite(row.search)).map(row=>({
  label:label(row.action),boundary:row.boundary,search:Math.round(row.search*10)/10,
  nodes:row.nodes,cut:row.cut||null,settled:!!row.settled
 }));
 return {action:label(action),reason:trace?.reason,nodes:trace?.nodesUsed,dispatches:meter.dispatches,lines};
}
const out=[];
for(const [title,seed,first,seat,at] of targets){
 const deck=decks.get(title);
 const game=report.titles[title].byMode.tree.games.find(item=>item.seed===seed&&item.first===first&&item.challengerSeat===seat);
 const packs=[deck.pack,deck.pack];
 let cursor=newComparedMatch(packs,[deck.counts,deck.counts],seed,first,RULES);
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
 resetHardAiReport();
 const hardAction=legal.find(item=>same(item,chooseStrengthenedHardAction(packs,cursor,{nodes:48,ms:1e9,seed:1})));
 const base=ask(packs,cursor,actor,{nodes:48});
 const wide=ask(packs,cursor,actor,{nodes:192});
 const deep=ask(packs,cursor,actor,{nodes:48,actorDecisions:4});
 const player=cursor.players[actor];
 out.push({
  title,seed,first,seat,step:at,actor,phase:cursor.phase,pending:cursor.pending?.kind||null,
  hash:createHash('sha256').update(JSON.stringify(cursor)).digest('hex'),
  life:cursor.players.map(item=>item.life.length),
  readyAp:(player.apCards||[]).filter(item=>item.ready).length,
  energy:universalEnergyByColor(packs,cursor,actor),
  legal:legal.length,legalLabels:[...new Set(legal.map(label))],
  hard:label(hardAction),base,wide,deep
 });
 console.error(title,'step',at,'base',base.action,'wide',wide.action,'deep',deep.action,'hard',label(hardAction));
}
console.log(JSON.stringify(out,null,2));
