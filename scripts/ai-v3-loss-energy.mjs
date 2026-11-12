#!/usr/bin/env node
// At each recorded generator rewrite, see whether an executed energy line
// outscores the line the preference kept. Hard-search-2 and a 192-node
// rerun are references, not the definition of the correct play.
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {newComparedMatch,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';

const RULES=matchRules('official');
const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
const report=JSON.parse(readFileSync('audit/ai-v3-main-front-8401-baseline.json','utf8'));
const scan=JSON.parse(readFileSync('audit/ai-v3-loss-scan.json','utf8'));
const steps=scan.rows.filter(row=>row.rewrite?.stage==='generator'&&!row.won);
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function label(action){return action?`${action.type}:${action.line||''}:${action.uid??''}`: 'none';}
function fresh(deck,seed,first){
 const packs=[deck.pack,deck.pack];
 return {packs,state:newComparedMatch(packs,[deck.counts,deck.counts],seed,first,RULES)};
}
const rows=[];
for(const mark of steps){
 const deck=decks.get(mark.deck);
 const game=report.titles[mark.deck].byMode.tree.games.find(item=>item.seed===mark.seed&&item.first===mark.first&&item.challengerSeat===mark.seat);
 const {packs,state}=fresh(deck,game.seed,game.first);
 let cursor=state;
 for(const choice of game.opening||[]){
  const legal=legalUniversalActions(packs,cursor);
  cursor=dispatchUniversalAction(packs,cursor,legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode),{actor:choice.actor});
 }
 for(const step of game.actions){
  if(step.step===mark.step)break;
  const actor=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  cursor=dispatchUniversalAction(packs,cursor,legal.find(item=>same(item,step.action)),{actor});
 }
 const actor=cursor.pending?.player??cursor.active;
 const legal=legalUniversalActions(packs,cursor);
 resetAiV3Report();
 const meter={dispatches:0};
 const kept=chooseAiV3Action(packs,cursor,{actor,...MATCH_LIMITS,ms:1e9,nodes:48,seed:1,plan:'tree',meter});
 const trace=lastAiV3Trace();
 const lines=(trace.candidates||trace.compared||[]).filter(row=>row?.executed!==false&&Number.isFinite(row.search));
 const mine=lines.find(row=>same(row.action,kept));
 const front=lines.find(row=>row.action?.type==='play'&&row.action.line==='front');
 const floor=mine?mine.search:(front?front.search:null);
 let best=null;
 for(const row of lines){
  if(row.action?.type!=='play'||row.action.line!=='energy')continue;
  if(floor==null||!(row.search>floor))continue;
  if(!best||row.search>best.search)best=row;
 }
 resetHardAiReport();
 const hard=legal.find(item=>same(item,chooseStrengthenedHardAction(packs,cursor,{nodes:48,ms:1e9,seed:1})));
 const proposed=best?legal.find(item=>same(item,best.action)):kept;
 rows.push({id:mark.id,step:mark.step,life:mark.life,kept:label(kept),floor:floor==null?null:Math.round(floor*10)/10,
  proposed:label(proposed),hard:label(hard),changed:!same(proposed,kept),
  matchesHard:same(proposed,hard),keptMatches:same(kept,hard),dispatches:meter.dispatches,nodes:trace.nodesUsed});
 console.error(mark.deck,'step',mark.step,label(kept),'->',label(proposed),'hard',label(hard));
}
const changed=rows.filter(row=>row.changed);
const games=list=>new Set(list.map(row=>row.id.split('|').slice(0,4).join('|'))).size;
console.log(JSON.stringify({
 n:rows.length,changed:changed.length,changedGames:games(changed),
 proposedMatchesHard:rows.filter(row=>row.matchesHard).length,
 keptMatchesHard:rows.filter(row=>row.keptMatches).length,
 changedAndCloser:changed.filter(row=>row.matchesHard&&!row.keptMatches).length,
 rows
},null,2));
