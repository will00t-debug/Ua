#!/usr/bin/env node
// Replay the 250 loss-game decisions that spent the 48-node pool and kept
// no finite root score. Search seed 1, clockless. This does not change the
// default policy. A profile records why each root was dropped.
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report} from '../dist/universal-v2/ai-v3/search.mjs';
import {scoreLine} from '../dist/universal-v2/ai-v3/beam.mjs';
import {beliefWorlds} from '../dist/universal-v2/ai-v3/belief.mjs';
import {newComparedMatch,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';

const SOURCE='audit/ai-v3-hold-info-8401-baseline.json';
const SCAN='audit/ai-v3-search-bottleneck.json';
const OUT='audit/ai-v3-unscored-budget.json';
const RULES=matchRules('official');
const SEARCH_SEED=1;
const SOLO=process.env.AI_V3_SOLO==='1';

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function idOf(action){
 return {type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null};
}
function label(action){
 const item=idOf(action);
 return [item.type,item.line||'',item.uid||'',item.mode||''].join(':');
}
function fresh(deck,seed,first){
 const packs=[deck.pack,deck.pack];
 return {packs,state:newComparedMatch(packs,[deck.counts,deck.counts],seed,first,RULES)};
}
function bag(rows,keyOf){
 const counts=new Map();
 for(const row of rows){
  const key=keyOf(row);
  counts.set(key,(counts.get(key)||0)+1);
 }
 return Object.fromEntries([...counts.entries()].sort((a,b)=>b[1]-a[1]));
}

function placeOf(line){
 return [line.leafTurn??'',line.leafPendingPlayer??'',line.leafActive??'',line.phase??'',line.pending??''].join('|');
}
function classify(row){
 const gate=row.gate||{};
 const lines=row.lines||[];
 const places=new Set(lines.map(placeOf));
 if(!gate.scored){
  const drops=row.dropped||[];
  if(!drops.length)return 'no-score-unstarted';
  const opponent=drops.filter(item=>(item.responses||0)>0||(item.opponentTurns||0)>0);
  const effect=drops.filter(item=>item.stopPending&&item.stopPending!=='block');
  if(opponent.length===drops.length)return 'no-score-opponent';
  if(effect.length===drops.length)return 'no-score-effect';
  if(drops.length>=2)return 'no-score-split';
  return 'no-score-other';
 }
 // Scores exist. The backup ran because those scores are not a comparison.
 if(gate.discardOpen||gate.discardIncomplete)return 'discard-unfinished';
 if(gate.contested)return 'contested-loss';
 if(gate.idleOnly&&(gate.constructiveCut||gate.missedDevelopment))return 'idle-versus-cut';
 if(!gate.comparable&&places.size>1)return 'different-boundary';
 if(!gate.comparable)return 'no-shared-boundary';
 return 'other';
}

function soloLine(pack,world,actor,action){
 const pool={n:48};
 const started=performance.now();
 const line=scoreLine(pack,world,actor,action,{
  nodes:48,pool,beam:4,deadline:Infinity,parentDeadline:Infinity,
  actorDecisions:2,opponentDecisions:2,plan:'tree',pass:'basic'
 });
 return {
  type:action?.type||null,line:action?.line||null,uid:action?.uid??null,
  finite:Number.isFinite(line?.search),search:Number.isFinite(line?.search)?Math.round(line.search*10)/10:null,
  executed:line?.executed===true,boundary:line?.boundary||null,cut:line?.cut||null,
  nodes:line?.nodes||0,stopPending:line?.stopPending||null,ms:Math.round(performance.now()-started)
 };
}

function main(){
 const report=JSON.parse(readFileSync(SOURCE,'utf8'));
 const scan=JSON.parse(readFileSync(SCAN,'utf8'));
 const wanted=new Map();
 for(const row of scan.scan){
  if(!row.spentWithoutScore)continue;
  const key=row.id+'@'+row.step;
  wanted.set(key,row);
 }
 const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
 const rows=[];
 for(const [title,block] of Object.entries(report.titles)){
  const deck=decks.get(title);
  for(const game of block.byMode.tree.games){
   if(game.challengerWon)continue;
   const id=`${deck.id}|${game.seed}|${game.first}|${game.challengerSeat}`;
   const {packs,state}=fresh(deck,game.seed,game.first);
   let cursor=state;
   for(const choice of game.opening||[]){
    const legal=legalUniversalActions(packs,cursor);
    const action=legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
    cursor=dispatchUniversalAction(packs,cursor,action,{actor:choice.actor});
   }
   for(const played of game.actions){
    if(cursor.status!=='playing')break;
    const actor=cursor.pending?.player??cursor.active;
    const key=id+'@'+played.step;
    const mark=wanted.get(key);
    if(mark){
     const profile={roots:[],follows:[],dropped:[]};
     resetAiV3Report();
     const meter={dispatches:0};
     const started=performance.now();
     const action=chooseAiV3Action(packs,cursor,{
      actor,nodes:48,ms:1e9,beam:4,actorDecisions:2,opponentDecisions:2,worlds:1,
      seed:SEARCH_SEED,plan:'tree',diagnose:true,meter,profile
     });
     const trace=lastAiV3Trace();
     const legal=legalUniversalActions(packs,cursor);
     const exact=legal.find(item=>same(item,action))||null;
     const planned=(trace?.rootPlan||[]).map(note=>note.action||note);
     const inBeam=planned.some(item=>same(idOf(item),idOf(exact)));
     const sameAction=(a,b)=>a&&b&&a.type===b.type&&(a.line||null)===(b.line||null)&&(a.uid??null)===(b.uid??null)&&(a.mode||null)===(b.mode||null);
     let solo=null;
     if(SOLO){
      const world=beliefWorlds(packs,cursor,actor,SEARCH_SEED,1)[0]?.state;
      solo=(planned||[]).map(item=>soloLine(packs,world,actor,item));
     }
     const lines=profile.lines||[];
     const row={
      id,deck:deck.id,gameSeed:game.seed,first:game.first,seat:game.challengerSeat,step:played.step,
      phase:cursor.phase,pending:cursor.pending?.kind||null,
      life:cursor.players.map(player=>player.life.length),
      legalCount:legal.length,
      action:idOf(exact),label:label(exact),
      recorded:mark.action,matchesRecorded:sameAction(exact,mark.action),
      inBeam,nodesUsed:trace?.nodesUsed??null,dispatches:meter.dispatches,
      roots:(trace?.rootPlan||[]).length,
      gate:profile.gate||null,
      lines,
      places:[...new Set(lines.map(placeOf))],
      dropped:profile.dropped,
      ms:Math.round(performance.now()-started),
      solo
     };
     row.bucket=classify(row);
     rows.push(row);
     console.error(row.bucket,row.id,row.step,row.phase,row.pending,row.label,'beam',row.inBeam,'drops',row.dropped.length,'ms',row.ms);
    }
    const legal=legalUniversalActions(packs,cursor);
    const recorded=legal.find(item=>same(item,played.action));
    if(!recorded)throw Error('replay '+key);
    cursor=dispatchUniversalAction(packs,cursor,recorded,{actor});
   }
  }
 }
 const summary={
  decisions:rows.length,
  matched:rows.filter(row=>row.matchesRecorded).length,
  inBeam:rows.filter(row=>row.inBeam).length,
  outsideBeam:rows.filter(row=>!row.inBeam).length,
  buckets:bag(rows,row=>row.bucket),
  byDeck:bag(rows,row=>row.deck+' '+row.bucket),
  phase:bag(rows,row=>row.phase),
  pending:bag(rows,row=>row.pending||'none'),
  boundaries:bag(rows.flatMap(row=>row.lines||[]),item=>item.boundary||'none'),
  cuts:bag(rows.flatMap(row=>row.lines||[]),item=>item.cut||'none'),
  stopPending:bag(rows.flatMap(row=>row.lines||[]),item=>item.stopPending||item.pending||'none'),
  outsideByBucket:bag(rows.filter(row=>!row.inBeam),row=>row.bucket),
  outsideByPhase:bag(rows.filter(row=>!row.inBeam),row=>row.phase+' '+(row.pending||'none')),
  outsideByAction:bag(rows.filter(row=>!row.inBeam),row=>row.action?.type||'none'),
  zeroScore:rows.filter(row=>!(row.gate&&row.gate.scored)).length,
  placeCounts:bag(rows,row=>(row.places||[]).length+' places')
 };
 summary.examples={};
 for(const row of rows){
  const list=summary.examples[row.bucket]||(summary.examples[row.bucket]=[]);
  if(list.length>=4)continue;
  list.push({id:row.id,step:row.step,phase:row.phase,pending:row.pending,legal:row.legalCount,action:row.label,inBeam:row.inBeam,places:row.places,lines:row.lines});
 }
 if(SOLO){
  summary.soloAnyFinite=rows.filter(row=>(row.solo||[]).some(item=>item.finite)).length;
  summary.soloAllFinite=rows.filter(row=>(row.solo||[]).length&&(row.solo||[]).every(item=>item.finite)).length;
  summary.soloSamePlace=rows.filter(row=>{
   const done=(row.solo||[]).filter(item=>item.finite);
   return done.length>=2&&new Set(done.map(item=>item.boundary+'|'+item.stopPending+'|'+item.phase)).size===1;
  }).length;
  summary.soloBoundary=bag(rows.flatMap(row=>row.solo||[]),item=>item.finite?(item.boundary||'none'):'none');
 }
 const detail={base:'950291d291cddbdb9d0597ac3bba76358a1336be',searchSeed:SEARCH_SEED,clock:'1e9',nodes:48,summary,rows};
 writeFileSync(OUT,JSON.stringify(detail));
 console.error(JSON.stringify(summary,null,2));
 console.error('wrote',OUT,'rows',rows.length);
}
main();
