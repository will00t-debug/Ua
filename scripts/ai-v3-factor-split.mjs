#!/usr/bin/env node
// Separate the three factors that shipped together as ab-front.
// Coverage is root-only or the whole tree. Raid-base retention is on or off.
// The evidence gate sits on the energy rewrite or on the final rewrite.
// Every cell is an existing snapshot at 48 nodes and a fixed clock.
// This script reads the environment only to stay a Node entry. The search
// receives the factors object and does not read process.
import {readFileSync,writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {selectionTrace} from '../dist/universal-v2/ai-v3/beam.mjs';
import {bindVariant,factorsForVariant} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {newComparedMatch,applySharedOpening,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';
import {sequencedFilter,lineSwitchBody,recoversActionPoints,keepScore} from '../dist/universal-v2/ai-v3/eval.mjs';

const cells=[
 {id:'root-base-energy',factors:{coverage:'root',raidBase:true,gate:'energy'},named:'ab-front'},
 {id:'root-base-final',factors:{coverage:'root',raidBase:true,gate:'final'}},
 {id:'root-open-energy',factors:{coverage:'root',raidBase:false,gate:'energy'}},
 {id:'root-open-final',factors:{coverage:'root',raidBase:false,gate:'final'}},
 {id:'tree-base-energy',factors:{coverage:'tree',raidBase:true,gate:'energy'}},
 {id:'tree-base-final',factors:{coverage:'tree',raidBase:true,gate:'final'}},
 {id:'tree-open-energy',factors:{coverage:'tree',raidBase:false,gate:'energy'}},
 {id:'tree-open-final',factors:{coverage:'tree',raidBase:false,gate:'final'},named:'ab'}
];
const controls=[
 {id:'baseline',factors:null,variant:null},
 {id:'named-ab',factors:null,variant:'ab'},
 {id:'named-ab-front',factors:null,variant:'ab-front'}
];

function readyAp(state,player){
 return (state?.players?.[player]?.apCards||[]).filter(item=>item?.ready).length;
}
function handOf(state,actor){
 return state.players?.[actor]?.hand||[];
}
function printedCard(pack,hand,action){
 const card=action?.uid?hand.find(item=>item?.uid===action.uid):null;
 const body=card&&pack.cards[card.cardId];
 if(!body)return null;
 return {uid:card.uid,id:body.id,name:body.name||null,energy:body.energy??null,bp:body.bp??null,
  raid:body.raidName||null,gen:body.gen||0,onPlay:(body.effects?.onPlay||[]).map(effect=>effect?.op).filter(Boolean)};
}
function actionOf(pack,hand,action){
 return {type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null,
  card:printedCard(pack,hand,action)};
}
function sameAction(a,b){
 return !!a&&!!b&&a.type===b.type&&(a.line||null)===(b.line||null)&&(a.uid??null)===(b.uid??null)&&(a.mode||null)===(b.mode||null);
}
function ask(packs,state,spec){
 const actor=state.pending?.player??state.active;
 const meter={dispatches:0};
 resetAiV3Report();
 const options={
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true,meter
 };
 if(spec.factors)options.factors=spec.factors;
 else if(spec.variant)options.variant=spec.variant;
 const action=chooseAiV3Action(packs,state,options);
 const trace=lastAiV3Trace()||{};
 const hand=handOf(state,actor);
 const pack=packs[actor];
 const stages=(trace.stages||[]).map(stage=>{
  const described=actionOf(pack,hand,{type:stage.type,line:stage.line,uid:stage.uid,mode:stage.mode});
  return {...described,stage:stage.stage,boundary:stage.boundary,search:stage.search,executed:stage.executed===true};
 });
 const rewrites=[];
 for(let index=1;index<stages.length;index++){
  const before=stages[index-1];
  const after=stages[index];
  if(sameAction(before,after))continue;
  rewrites.push({
   at:after.stage,
   from:{type:before.type,line:before.line,uid:before.uid,mode:before.mode,card:before.card?.id||null},
   to:{type:after.type,line:after.line,uid:after.uid,mode:after.mode,card:after.card?.id||null},
   sameUid:before.uid!=null&&before.uid===after.uid,
   differentCard:before.uid!==after.uid,
   beforeExecuted:before.executed,afterExecuted:after.executed,
   beforeBoundary:before.boundary,afterBoundary:after.boundary,
   beforeSearch:before.search,afterSearch:after.search
  });
 }
 return {
  id:spec.id,
  factors:spec.factors||(spec.variant?factorsForVariant(spec.variant):{coverage:null,raidBase:false,gate:null}),
  raw:action,
  returned:actionOf(pack,hand,action),
  reason:trace.reason||null,
  score:Number.isFinite(trace.score)?trace.score:null,
  nodesUsed:trace.nodesUsed??null,
  dispatches:meter.dispatches,
  accounted:meter.dispatches===trace.nodesUsed&&Number.isFinite(trace.nodesUsed)&&trace.nodesUsed<=48,
  fallbackKind:trace.fallbackKind??null,
  stages,rewrites,
  rows:(trace.compared||[]).filter(row=>row.executed!==false).map(row=>({
   ...actionOf(pack,hand,row.action),search:row.search,boundary:row.boundary
  }))
 };
}
function rootBeam(packs,state,actor,factors){
 const legal=legalUniversalActions(packs,state);
 const bound=factors||{coverage:null,raidBase:false,gate:null};
 const trace=bindVariant(null,()=>selectionTrace(packs,state,actor,legal,4,null),bound);
 const pack=packs[actor];
 const hand=handOf(state,actor);
 const describe=action=>actionOf(pack,hand,action);
 const evicted=trace.notes.filter(note=>note.reason==='replaced-by-front').map(note=>describe(note.action));
 const slot=trace.notes.filter(note=>note.reason==='front-slot').map(note=>describe(note.action));
 return {
  ranked:trace.ranked.map(describe),
  picked:trace.picked.map(describe),
  evicted,slot
 };
}
function reachRecorded(source,deckId,seed,first,seat,step,opening){
 const audit=JSON.parse(readFileSync(source,'utf8'));
 const deck=battleDecks().find(item=>item.id===deckId);
 const game=audit.titles[deckId].byMode.tree.games
  .find(item=>item.seed===seed&&item.first===first&&item.challengerSeat===seat);
 const packs=[deck.pack,deck.pack];
 let state=opening==='shared'
  ?applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],seed,first)).state
  :newComparedMatch(packs,[deck.counts,deck.counts],game.seed,game.first,opening==='official'?matchRules('official'):undefined);
 if(opening!=='shared'){
  for(const choice of game.opening||[]){
   const action=legalUniversalActions(packs,state).find(entry=>entry.type==='openingMulligan'&&entry.mode===choice.mode);
   state=dispatchUniversalAction(packs,state,action,{actor:choice.actor});
  }
 }
 for(const recorded of game.actions){
  if(recorded.step===step)return {packs,state,game};
  const actor=state.pending?.player??state.active;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(recorded.action));
  if(!action)throw Error('replay diverged '+deckId+' '+step+' at '+recorded.step);
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 throw Error('missing '+deckId+' '+step);
}
function positionRecord(label,reached){
 const {packs,state}=reached;
 const actor=state.pending?.player??state.active;
 const specs=[...controls,...cells];
 const runs=specs.map(spec=>{
  const result=ask(packs,state,spec);
  delete result.raw;
  return {beam:rootBeam(packs,state,actor,spec.factors||(spec.variant?factorsForVariant(spec.variant):null)),...result};
 });
 const signature=run=>{const copy=structuredClone(run);delete copy.id;return JSON.stringify(copy);};
 const named=Object.fromEntries(runs.map(run=>[run.id,signature(run)]));
 const reproduce={
  ab:named['tree-open-final']===named['named-ab'],
  abFront:named['root-base-energy']===named['named-ab-front']
 };
 return {
  label,actor,phase:state.phase,pending:state.pending?.kind||null,
  energy:universalEnergyByColor(packs,state,actor),
  reproduce,runs
 };
}

function orderDeck(state,actor,catalog,refund){
 const deck=state.players[actor].deck;
 const take=pred=>{
  const index=deck.findIndex(pred);
  if(index<0)throw Error('ordered card missing');
  return deck.splice(index,1)[0];
 };
 const raid=()=>take(card=>catalog[card.cardId].energy>=6&&catalog[card.cardId].type==='character');
 const quiet=()=>take(card=>{
  const printed=catalog[card.cardId];
  return printed.energy>=4&&printed.type==='character'&&!recoversActionPoints(printed);
 });
 const top=[raid(),raid(),quiet(),refund?take(card=>recoversActionPoints(catalog[card.cardId])):quiet(),quiet()];
 deck.unshift(...top);
}
function scriptToOwnStart(packs,state,actor){
 let cursor=state;
 for(let guard=0;guard<160&&cursor.status==='playing';guard++){
  if(cursor.active===actor&&!cursor.pending&&cursor.phase==='start')return cursor;
  const seat=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const action=seat===actor
   ?legal.find(item=>item.type==='next')
   :(legal.find(item=>item.type==='next')||legal.find(item=>item.type==='chooseHandLimit')||legal[0]);
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:seat});
  if(assertUniversalMatch(packs,cursor)!==true)throw Error('script illegal');
 }
 throw Error('start not reached');
}
function chainWalk(packs,state,actor,refund,spec){
 const catalog=packs[actor].cards;
 let cursor=state;
 const fuel=new Set(cursor.players[actor].hand.filter(card=>{
  const printed=catalog[card.cardId];
  return printed.type==='character'&&printed.energy===1&&!sequencedFilter(printed);
 }).map(card=>card.uid));
 const standing=cursor.players[actor].front.find(Boolean);
 const spent=[];
 const keys=[];
 const decisions=[];
 let filtersPlayed=0;
 const record=choice=>{
  decisions.push({
   key:choice.returned.type+':'+(choice.returned.line||choice.returned.mode||''),
   returned:choice.returned,reason:choice.reason,score:choice.score,
   nodesUsed:choice.nodesUsed,dispatches:choice.dispatches,accounted:choice.accounted,
   stages:choice.stages,rewrites:choice.rewrites,beam:choice.beam
  });
  keys.push(choice.returned.type+':'+(choice.returned.line||choice.returned.mode||''));
 };
 for(let guard=0;guard<16&&cursor.status==='playing'&&cursor.active===actor;guard++){
  if(!cursor.pending&&cursor.phase==='attack')break;
  const choice={...ask(packs,cursor,spec),beam:rootBeam(packs,cursor,actor,spec.factors||(spec.variant?factorsForVariant(spec.variant):null))};
  const card=cursor.players[actor].hand.find(item=>item?.uid===choice.returned.uid);
  const printed=card&&catalog[card.cardId];
  record(choice);
  if(choice.returned.type==='chooseDiscardGate'&&choice.returned.uid){
   if(!fuel.has(choice.returned.uid))return {ok:false,break:'discard-not-fuel',spent,keys,decisions,refundPlayed:false};
   spent.push(choice.returned.uid);
  }
  if(choice.returned.type==='play'&&choice.returned.line==='energy'&&printed&&sequencedFilter(printed))filtersPlayed++;
  if(choice.returned.type==='play'&&choice.returned.line==='energy'&&printed&&lineSwitchBody(printed)){
   if(filtersPlayed!==2||spent.length!==2||readyAp(cursor,actor)!==1)
    return {ok:false,break:'line-switch-preface',filtersPlayed,spent,ap:readyAp(cursor,actor),keys,decisions,refundPlayed:false};
   cursor=dispatchUniversalAction(packs,cursor,choice.raw,{actor});
   const entered=cursor.players[actor].energy.find(item=>item?.uid===choice.returned.uid);
   const standingEnergy=cursor.players[actor].energy.filter(item=>item?.ready);
   const blocker=standingEnergy.length===1?standingEnergy[0]:null;
   const moved={...ask(packs,cursor,spec),beam:rootBeam(packs,cursor,actor,spec.factors||(spec.variant?factorsForVariant(spec.variant):null))};
   record(moved);
   if(moved.returned.type!=='chooseLineMove'||!blocker||moved.returned.uid!==blocker.uid)
    return {ok:false,break:'line-move',expected:blocker?.uid||null,keys,spent,decisions,refundPlayed:false};
   cursor=dispatchUniversalAction(packs,cursor,moved.raw,{actor});
   if(cursor.pending?.kind==='effect-line-slot'){
    const slot={...ask(packs,cursor,spec),beam:rootBeam(packs,cursor,actor,spec.factors||(spec.variant?factorsForVariant(spec.variant):null))};
    record(slot);
    if(slot.returned.type!=='chooseLineSlot')return {ok:false,break:'line-slot',keys,spent,decisions,refundPlayed:false};
    cursor=dispatchUniversalAction(packs,cursor,slot.raw,{actor});
   }
   const shifted=cursor.players[actor].front.find(item=>item?.uid===blocker.uid);
   const body=[...cursor.players[actor].energy,...cursor.players[actor].front].find(item=>item?.uid===entered?.uid);
   const keptStanding=cursor.players[actor].front.some(item=>item?.uid===standing?.uid&&item.ready);
   const passed={...ask(packs,cursor,spec),beam:rootBeam(packs,cursor,actor,spec.factors||(spec.variant?factorsForVariant(spec.variant):null))};
   record(passed);
   const intact=assertUniversalMatch(packs,cursor)===true&&shifted?.ready===true&&body?.ready===false&&keptStanding&&passed.returned.type==='next';
   return {ok:intact,break:intact?null:'line-switch-result',spent,keys,decisions,refundPlayed:false,
    standingReady:keptStanding,entrantRested:body?.ready===false,blockerReady:shifted?.ready===true};
  }
  if(choice.returned.type==='event'&&printed&&recoversActionPoints(printed)){
   if(!refund||filtersPlayed!==2||spent.length!==2||readyAp(cursor,actor)!==1)
    return {ok:false,break:'refund-preface',filtersPlayed,spent,ap:readyAp(cursor,actor),keys,decisions,refundPlayed:false};
   const paid=readyAp(cursor,actor);
   cursor=dispatchUniversalAction(packs,cursor,choice.raw,{actor});
   if(readyAp(cursor,actor)!==paid-1)return {ok:false,break:'refund-cost',keys,spent,decisions,refundPlayed:false};
   let recovered=0;
   while(cursor.pending?.kind==='effect-recover-ap'&&recovered<2){
    const step={...ask(packs,cursor,spec),beam:rootBeam(packs,cursor,actor,spec.factors||(spec.variant?factorsForVariant(spec.variant):null))};
    record(step);
    if(step.returned.type!=='chooseApRecovery')return {ok:false,break:'recover-step',keys,spent,decisions,refundPlayed:false};
    const readyBefore=readyAp(cursor,actor);
    cursor=dispatchUniversalAction(packs,cursor,step.raw,{actor});
    if(readyAp(cursor,actor)!==readyBefore+1)return {ok:false,break:'recover-count',keys,spent,decisions,refundPlayed:false};
    recovered++;
   }
   const intact=recovered===2&&assertUniversalMatch(packs,cursor)===true;
   return {ok:intact,break:intact?null:'refund-result',spent,keys,decisions,refundPlayed:intact};
  }
  if(choice.returned.type==='extraDraw')
   return {ok:false,break:'extra-draw',ap:readyAp(cursor,actor),keys,spent,decisions,refundPlayed:false};
  cursor=dispatchUniversalAction(packs,cursor,choice.raw,{actor:cursor.pending?.player??cursor.active});
  if(assertUniversalMatch(packs,cursor)!==true)return {ok:false,break:'illegal',keys,spent,decisions,refundPlayed:false};
 }
 return {ok:false,break:'unresolved',keys,spent,decisions,refundPlayed:false};
}
function filterRecord(){
 const opened=reachRecorded('audit/ai-v3-official-8300-nodes48-white-reuse.json','white-sword',8301,0,1,29,'official');
 const {packs,state}=opened;
 const actor=state.pending.player;
 const catalog=packs[actor].cards;
 const specs=[...controls,...cells];
 const rows=[];
 for(const spec of specs){
  const discardAsk=ask(packs,state,spec);
  const discardBeam=rootBeam(packs,state,actor,spec.factors||(spec.variant?factorsForVariant(spec.variant):null));
  const plain=handOf(state,actor).find(card=>card.uid===discardAsk.returned.uid);
  const printed=plain&&catalog[plain.cardId];
  const discardOk=discardAsk.returned.type==='chooseHandLimit'&&printed?.energy===0&&printed.gen>0&&
   (printed.effects?.onPlay||[]).length===0&&
   keepScore(packs,state,actor,plain)===Math.min(...handOf(state,actor).map(card=>keepScore(packs,state,actor,card)));
  const base=dispatchUniversalAction(packs,state,discardAsk.raw,{actor});
  const hidden=structuredClone(base);
  let start=null,other=null,plainChain=null,finalChain=null,startError=null;
  try{
   orderDeck(base,actor,catalog,false);
   orderDeck(hidden,actor,catalog,true);
   start=scriptToOwnStart(packs,base,actor);
   other=scriptToOwnStart(packs,hidden,actor);
   const kept=ask(packs,start,spec);
   const keptBeam=rootBeam(packs,start,actor,spec.factors||(spec.variant?factorsForVariant(spec.variant):null));
   const keptOther=ask(packs,other,spec);
   const startOk=kept.returned.type==='next'&&sameAction(kept.returned,keptOther.returned)&&readyAp(start,actor)===3&&
    universalEnergyByColor(packs,start,actor).green===1&&kept.score!=null;
   if(startOk){
    plainChain=chainWalk(packs,dispatchUniversalAction(packs,start,kept.raw,{actor}),actor,false,spec);
    finalChain=chainWalk(packs,dispatchUniversalAction(packs,other,keptOther.raw,{actor}),actor,true,spec);
   }
   rows.push({
    id:spec.id,
    discard:{ok:discardOk,uid:discardAsk.returned.uid,card:discardAsk.returned.card,accounted:discardAsk.accounted,
     beam:discardBeam,stages:discardAsk.stages,rewrites:discardAsk.rewrites,nodesUsed:discardAsk.nodesUsed,dispatches:discardAsk.dispatches},
    start:{ok:startOk,ap:readyAp(start,actor),green:universalEnergyByColor(packs,start,actor).green,
     returned:kept.returned,other:keptOther.returned,same:sameAction(kept.returned,keptOther.returned),
     score:kept.score,nodesUsed:kept.nodesUsed,dispatches:kept.dispatches,accounted:kept.accounted&&keptOther.accounted,
     beam:keptBeam,stages:kept.stages,rewrites:kept.rewrites},
    plain:plainChain&&{ok:plainChain.ok,break:plainChain.break,keys:plainChain.keys,spent:plainChain.spent,refundPlayed:plainChain.refundPlayed},
    final:finalChain&&{ok:finalChain.ok,break:finalChain.break,keys:finalChain.keys,spent:finalChain.spent,refundPlayed:finalChain.refundPlayed,
     standingReady:finalChain.standingReady??null,entrantRested:finalChain.entrantRested??null},
    confirmed:discardOk&&startOk&&plainChain?.ok&&finalChain?.ok&&finalChain.refundPlayed===true&&plainChain.refundPlayed===false&&
     plainChain.keys.slice(0,6).join('|')===finalChain.keys.slice(0,6).join('|')&&
     plainChain.keys[6]==='chooseTopCard:bottom'&&finalChain.keys[6]==='chooseTopCard:top'&&
     new Set(plainChain.spent).size===2&&JSON.stringify(finalChain.spent)===JSON.stringify(plainChain.spent)
   });
  }catch(error){
   startError=error.message;
   rows.push({id:spec.id,discard:{ok:discardOk,uid:discardAsk.returned.uid},error:startError});
  }
  console.log('chain',spec.id,rows[rows.length-1].confirmed===true?'kept':rows[rows.length-1].error||rows[rows.length-1].start?.returned?.type||rows[rows.length-1].plain?.break||rows[rows.length-1].final?.break);
 }
 const byId=Object.fromEntries(rows.map(row=>[row.id,row]));
 const signature=row=>{const copy=structuredClone(row);delete copy.id;return JSON.stringify(copy);};
 return {
  source:'white-sword 8301 first 0 seat 1 step 29',
  reproduce:{
   ab:signature(byId['tree-open-final'])===signature(byId['named-ab']),
   abFront:signature(byId['root-base-energy'])===signature(byId['named-ab-front'])
  },
  rows
 };
}

const frontTargets=[
 {id:'last-ap',source:'audit/ai-v3-official-8300-nodes48-white-filter.json',deck:'white-sword',seed:8300,first:1,seat:0,step:22,opening:'shared'},
 {id:'two-ap',source:'audit/ai-v3-official-8300-nodes48-white-filter.json',deck:'white-sword',seed:8301,first:0,seat:0,step:31,opening:'shared'},
 {id:'three-ap',source:'audit/ai-v3-official-8300-nodes48-white-filter.json',deck:'white-sword',seed:8301,first:0,seat:1,step:41,opening:'shared'}
];
const energyTargets=[
 {id:'reject-blue',source:'audit/ai-v3-official-8300-life-36.json',deck:'reject-blue',seed:8300,first:0,seat:0,step:13},
 {id:'white-sword',source:'audit/ai-v3-official-8300-life-36.json',deck:'white-sword',seed:8300,first:0,seat:0,step:12},
 {id:'renruki',source:'audit/ai-v3-official-8300-life-36.json',deck:'renruki',seed:8300,first:0,seat:0,step:15},
 {id:'white-sword-partial',source:'audit/ai-v3-official-8300-nodes48-white-reach.json',deck:'white-sword',seed:8300,first:0,seat:0,step:55}
];

const fronts=frontTargets.map(target=>{
 console.log('front',target.id);
 return {id:target.id,seed:target.seed,first:target.first,seat:target.seat,step:target.step,
  ...positionRecord(target.id,reachRecorded(target.source,target.deck,target.seed,target.first,target.seat,target.step,target.opening))};
});
const energy=energyTargets.map(target=>{
 console.log('energy',target.id,target.step);
 return {id:target.id,seed:target.seed,first:target.first,seat:target.seat,step:target.step,
  ...positionRecord(target.id,reachRecorded(target.source,target.deck,target.seed,target.first,target.seat,target.step))};
});
writeFileSync('audit/ai-v3-factor-split.json',JSON.stringify({
 note:'Partial. Front and energy cells are complete. The filter chain is still running.',
 settings:'plan tree, hardNodes 0, nodes 48, ms 1e9, now 0, diagnose true',
 fronts,energy
},null,2));
const filter=filterRecord();
const reproduce={
 fronts:Object.fromEntries(fronts.map(row=>[row.id,row.reproduce])),
 energy:Object.fromEntries(energy.map(row=>[row.id,row.reproduce])),
 filter:filter.reproduce
};
const out={
 note:'Eight factor cells at a fixed clock and 48 nodes, on the three front snapshots, the four recorded move snapshots, and the white-sword filter chain. tree-open-final is the named A+B bundle. root-base-energy is the named ab-front bundle. A rewrite whose executed flag is false was not searched. A later boundary is recorded and is not treated as a better line. Same card means the same uid.',
 settings:'plan tree, hardNodes 0, nodes 48, ms 1e9, now 0, diagnose true',
 reproduce,
 fronts,energy,filter
};
writeFileSync('audit/ai-v3-factor-split.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(reproduce,null,2));
const failed=Object.values(reproduce.fronts).some(row=>!row.ab||!row.abFront)||
 Object.values(reproduce.energy).some(row=>!row.ab||!row.abFront)||
 !reproduce.filter.ab||!reproduce.filter.abFront;
if(failed)process.exit(1);
