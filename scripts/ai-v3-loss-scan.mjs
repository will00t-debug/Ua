#!/usr/bin/env node
// Replay the recorded 8401/8402 baseline and classify multi-choice decisions.
// Search settings match that table: seed 1, 48 nodes, no clock. This does not
// change the default policy. Hard-search-2 is not consulted here.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {newComparedMatch,applySharedOpening,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';

const RULES=matchRules('official');
const SOURCE='audit/ai-v3-main-front-8401-baseline.json';
const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
const report=JSON.parse(readFileSync(SOURCE,'utf8'));

function stateHash(state){
 return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}
function fresh(deck,seed,first){
 const packs=[deck.pack,deck.pack];
 return {packs,state:newComparedMatch(packs,[deck.counts,deck.counts],seed,first,RULES)};
}
function openingOf(deck,seed,first){
 const {packs,state}=fresh(deck,seed,first);
 if(!RULES.openingMulligan)return {packs,state};
 return {packs,...applySharedOpening(packs,state)};
}
function brief(action){
 if(!action)return null;
 return {type:action.type||null,line:action.line||null,uid:action.uid??null,mode:action.mode||null};
}
function keyOf(action){return JSON.stringify(action);}
function same(a,b){return keyOf(a)===keyOf(b);}
function label(action){
 if(!action)return 'none';
 if(action.type==='play')return 'play:'+(action.line||'');
 if(action.type==='chooseBlock')return action.uid==null?'block-pass':'block';
 return action.type||'none';
}

function covers(note,action){
 return !!note&&!!action&&note.type===action.type&&(note.line||null)===(action.line||null)&&
  (note.uid??null)===(action.uid??null)&&(note.mode||null)===(action.mode||null);
}
function classify(trace,legal){
 const stages=trace?.stages||[];
 const search=stages.find(row=>row.stage==='search')||null;
 const returned=stages.find(row=>row.stage==='returned')||null;
 let rewrite=null;
 if(search){
  for(const stage of stages){
   if(stage.stage==='search')continue;
   if(stage.type!==search.type||stage.line!==search.line||stage.uid!==search.uid||stage.mode!==search.mode){
    rewrite={stage:stage.stage,from:label(search),to:label(stage)};
    break;
   }
  }
 }
 const scoredRows=trace?.candidates?.length?trace.candidates:(trace?.compared||[]);
 const executed=scoredRows.filter(row=>row.executed!==false&&Number.isFinite(row.search));
 const searchRow=search?executed.find(row=>covers(search,row.action)):null;
 const boundary=searchRow?.boundary||null;
 const peers=boundary?executed.filter(row=>row.boundary===boundary):[];
 let better=null;
 if(searchRow&&peers.length>1){
  for(const row of peers){
   if(covers(search,row.action)||!(row.search>searchRow.search))continue;
   if(!better||row.search>better.search)better={label:label(row.action),boundary:row.boundary,search:Math.round(row.search*10)/10,chosen:Math.round(searchRow.search*10)/10};
  }
 }
 const beam=trace?.rootPlan||[];
 const unexecuted=(trace?.unexecuted||[]).map(row=>label(row.action)).filter(name=>name!=='none');
 const beamLabels=new Set(beam.map(label));
 const legalLabels=new Set(legal.map(label));
 const missing=[...legalLabels].filter(name=>!beamLabels.has(name));
 const scored=trace?.candidates?.length?trace.candidates:(trace?.compared||[]);
 const lines=scored.filter(row=>row?.executed!==false&&Number.isFinite(row.search)).map(row=>({
  label:label(row.action),uid:row.action?.uid??null,boundary:row.boundary||null,
  search:Math.round(row.search*10)/10,
  battle:Number.isFinite(row.battleScore)?Math.round(row.battleScore*10)/10:null,
  damage:!!row.damageOpen,settled:!!row.settled,cut:row.cut||null,
  stop:row.stopReason||null,nodes:row.nodes||0,
  place:[row.leafTurn??'',row.leafPendingPlayer??'',row.leafActive??'',row.phase??'',row.pending??'',
   row.leafSource??'',row.leafProgress??'',row.leafOwnTurns??''].join('|')
 }));
 const missed=[];
 for(const action of legal){
  if(beam.some(note=>covers(note,action)))continue;
  if(missed.length>=8)break;
  missed.push({label:label(action),uid:action.uid??null,mode:action.mode||null});
 }
 const truncated=unexecuted.length>0;
 return {search:search?label(search):null,returned:returned?label(returned):(trace?.action||null),
  rewrite,better,unexecuted,missing,missed,truncated,beam:[...beamLabels],lines,
  reason:trace?.reason||null,fallbackKind:trace?.fallbackKind??null,
  nodesUsed:Number.isFinite(trace?.nodesUsed)?trace.nodesUsed:null,
  settled:trace?.settled===true,boundary,
  score:Number.isFinite(searchRow?.search)?Math.round(searchRow.search*10)/10:null};
}
function count(list){
 const bag=new Map();
 for(const item of list)bag.set(item,(bag.get(item)||0)+1);
 return Object.fromEntries(bag);
}

const rows=[];
let mismatches=0,scanned=0,games=0;
for(const [title,block] of Object.entries(report.titles)){
 const deck=decks.get(title);
 if(!deck)throw Error('missing deck '+title);
 for(const game of block.byMode.tree.games){
  games++;
  const started=performance.now();
  const {packs,state}=fresh(deck,game.seed,game.first);
  let cursor=state;
  for(const choice of game.opening||[]){
   if(cursor.pending?.kind!=='opening-mulligan'||cursor.pending.player!==choice.actor)throw Error('opening-actor '+title);
   const legal=legalUniversalActions(packs,cursor);
   const action=legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
   if(!action)throw Error('opening-action '+title+' '+choice.mode+' '+legal.map(item=>item.type+':'+item.mode).join(','));
   cursor=dispatchUniversalAction(packs,cursor,action,{actor:choice.actor});
  }
  const id=`${title}|${game.seed}|first${game.first}|seat${game.challengerSeat}`;
  let chain=0,chainTurn=-1;
  for(const step of game.actions||[]){
   if(cursor.status!=='playing')break;
   const actor=cursor.pending?.player??cursor.active;
   const legal=legalUniversalActions(packs,cursor);
   const recorded=legal.find(item=>same(item,step.action));
   if(!recorded)throw Error('replay diverged '+id+' step '+step.step);
   const voluntary=!cursor.pending;
   if(voluntary||cursor.turn!==chainTurn){chain++;chainTurn=cursor.turn;}
   if(actor===game.challengerSeat&&legal.length>1&&!['opening-mulligan'].includes(cursor.pending?.kind)){
    resetAiV3Report();
    const meter={dispatches:0};
    const action=chooseAiV3Action(packs,cursor,{actor,...MATCH_LIMITS,ms:1e9,nodes:48,seed:1,plan:'tree',meter});
    const trace=lastAiV3Trace();
    if(!same(action,recorded))mismatches++;
    const found=classify(trace,legal);
    scanned++;
    rows.push({id,deck:title,seed:game.seed,first:game.first,seat:game.challengerSeat,won:game.challengerWon===true,
     step:step.step,turn:cursor.turn,phase:cursor.phase,pending:cursor.pending?.kind||null,chain,
     finalLife:game.life,
     life:cursor.players.map(player=>player.life.length),legal:legal.length,
     hash:stateHash(cursor),matched:same(action,recorded),dispatches:meter.dispatches,...found});
   }
   cursor=dispatchUniversalAction(packs,cursor,recorded,{actor});
  }
  console.error(id, game.challengerWon?'win':'loss', 'rows', rows.length, 'ms', Math.round(performance.now()-started));
 }
}

function gamesOf(list){return new Set(list.map(row=>row.id)).size;}
function decksOf(list){return new Set(list.map(row=>row.deck)).size;}
function bag(list,field){
 const map=new Map();
 for(const row of list){
  const value=field(row);
  const values=Array.isArray(value)?value:[value];
  for(const item of values){
   if(!item)continue;
   if(!map.has(item))map.set(item,[]);
   map.get(item).push(row);
  }
 }
 return [...map.entries()].map(([name,items])=>({name,decisions:items.length,chains:new Set(items.map(row=>row.id+'#'+row.chain)).size,
  games:gamesOf(items),decks:decksOf(items),losses:items.filter(row=>!row.won).length,
  lossGames:gamesOf(items.filter(row=>!row.won)),winGames:gamesOf(items.filter(row=>row.won))}))
  .sort((a,b)=>b.lossGames-a.lossGames||b.chains-a.chains);
}
const byGame=new Map();
for(const row of rows){
 if(!byGame.has(row.id))byGame.set(row.id,[]);
 byGame.get(row.id).push(row);
}
for(const list of byGame.values()){
 list.sort((a,b)=>a.step-b.step);
 for(let index=0;index<list.length;index++){
  const row=list[index];
  const later=list.slice(index+1).find(item=>item.turn!==row.turn);
  const endLife=later?later.life:row.finalLife;
  const own=endLife[row.seat]-row.life[row.seat];
  const opp=endLife[1-row.seat]-row.life[1-row.seat];
  row.ownLife=own;
  row.oppLife=opp;
  row.fell=own<0&&own<opp;
 }
}
const losses=rows.filter(row=>!row.won&&row.reason!=='deferred-baseline'&&row.reason!=='forced');
const summary={
 source:SOURCE,search:{seed:1,nodes:48,clock:'none'},
 games,decisions:rows.length,lossDecisions:losses.length,mismatches,
 byReason:count(rows.map(row=>row.reason)),
 rewrite:bag(losses,row=>row.rewrite?`rewrite ${row.rewrite.stage} ${row.rewrite.from} -> ${row.rewrite.to}`:null),
 score:bag(losses,row=>row.better?`score ${row.boundary} ${row.search} < ${row.better.type}${row.better.line?':'+row.better.line:''}`:null),
 truncated:bag(losses,row=>row.truncated?`cut ${row.returned} left ${[...new Set(row.unexecuted)].sort().join('+')||'none'}`:null),
 missing:bag(losses,row=>row.missing.map(name=>'miss '+name)),
 fellGames:gamesOf(losses.filter(row=>row.fell)),
 fellRewrite:bag(losses.filter(row=>row.fell),row=>row.rewrite?`rewrite ${row.rewrite.stage} ${row.rewrite.from} -> ${row.rewrite.to}`:null).slice(0,12),
 fellScore:bag(losses.filter(row=>row.fell),row=>row.better?`score ${row.boundary} kept ${row.search} < ${row.better.label}`:null).slice(0,12),
 fellCut:bag(losses.filter(row=>row.fell&&row.truncated),row=>'cut '+row.returned+' left '+[...new Set(row.unexecuted)].sort().join('+')).slice(0,12),
 fellMiss:bag(losses.filter(row=>row.fell),row=>row.missing.map(name=>'miss '+name)).slice(0,12)
};
writeFileSync('audit/ai-v3-loss-scan.json',JSON.stringify({summary,rows},null,2));
console.log(JSON.stringify(summary,null,2));
