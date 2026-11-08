#!/usr/bin/env node
// Two records. The energy table reruns the four move snapshots at search
// seeds 1 and 8300 without changing anything else inside a comparison.
// The candidate table uses one fixed search seed per comparison. The
// candidate is root coverage, raid-base retention, and a gate that runs
// after energy, confirmed choices, and survival protection, and only for an
// executed main-phase character front.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {selectionTrace} from '../dist/universal-v2/ai-v3/beam.mjs';
import {bindVariant,factorsForVariant} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {newComparedMatch,applySharedOpening,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';
import {sequencedFilter,lineSwitchBody,recoversActionPoints,keepScore} from '../dist/universal-v2/ai-v3/eval.mjs';

const CANDIDATE={coverage:'root',raidBase:true,gate:'main-front'};
const cells=[
 {id:'baseline',factors:null,variant:null},
 {id:'named-ab',factors:null,variant:'ab'},
 {id:'named-ab-front',factors:null,variant:'ab-front'},
 {id:'root-base-energy',factors:{coverage:'root',raidBase:true,gate:'energy'}},
 {id:'root-base-final',factors:{coverage:'root',raidBase:true,gate:'final'}},
 {id:'root-open-energy',factors:{coverage:'root',raidBase:false,gate:'energy'}},
 {id:'root-open-final',factors:{coverage:'root',raidBase:false,gate:'final'}},
 {id:'tree-base-energy',factors:{coverage:'tree',raidBase:true,gate:'energy'}},
 {id:'tree-base-final',factors:{coverage:'tree',raidBase:true,gate:'final'}},
 {id:'tree-open-energy',factors:{coverage:'tree',raidBase:false,gate:'energy'}},
 {id:'tree-open-final',factors:{coverage:'tree',raidBase:false,gate:'final'}},
 {id:'main-front',factors:CANDIDATE}
];
function stateHash(state){
 return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}
function readyAp(state,player){
 return (state?.players?.[player]?.apCards||[]).filter(item=>item?.ready).length;
}
function printedCard(pack,hand,action){
 const card=action?.uid?hand.find(item=>item?.uid===action.uid):null;
 const body=card&&pack.cards[card.cardId];
 if(!body)return null;
 return {uid:card.uid,id:body.id,name:body.name||null,type:body.type||null,energy:body.energy??null,bp:body.bp??null};
}
function actionOf(pack,hand,action){
 return {type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null,
  card:printedCard(pack,hand,action)};
}
function sameAction(a,b){
 return !!a&&!!b&&a.type===b.type&&(a.line||null)===(b.line||null)&&(a.uid??null)===(b.uid??null)&&(a.mode||null)===(b.mode||null);
}
function expectedFactors(spec){
 if(spec.factors)return spec.factors;
 if(spec.variant)return factorsForVariant(spec.variant);
 return {coverage:null,raidBase:false,gate:null};
}
function ask(packs,state,spec,searchSeed){
 const actor=state.pending?.player??state.active;
 const meter={dispatches:0};
 resetAiV3Report();
 const options={
  ...MATCH_LIMITS,actor,seed:searchSeed,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true,meter
 };
 if(spec.factors)options.factors=spec.factors;
 else if(spec.variant)options.variant=spec.variant;
 const legalCount=legalUniversalActions(packs,state).length;
 const action=chooseAiV3Action(packs,state,options);
 const trace=lastAiV3Trace()||{};
 const expected=expectedFactors(spec);
 const bound=JSON.stringify(trace.factors)===JSON.stringify(expected);
 // One legal action, a mulligan, and an order window return before the
 // factor binding because no experiment search runs. Every other decision
 // must show the factors this comparison asked for.
 const searched=legalCount>1&&trace.reason!=='deferred-baseline';
 if(searched&&!bound)
  throw Error('factors were not bound for '+spec.id+' '+trace.reason+' legal '+legalCount+' '+JSON.stringify(trace.factors));
 const hand=state.players[actor].hand||[];
 const pack=packs[actor];
 const stages=(trace.stages||[]).map(stage=>({
  stage:stage.stage,...actionOf(pack,hand,{type:stage.type,line:stage.line,uid:stage.uid,mode:stage.mode}),
  boundary:stage.boundary,search:stage.search,executed:stage.executed===true
 }));
 const rewrites=[];
 for(let index=1;index<stages.length;index++){
  const before=stages[index-1],after=stages[index];
  if(sameAction(before,after))continue;
  rewrites.push({
   at:after.stage,
   from:{type:before.type,line:before.line,uid:before.uid,card:before.card?.id||null},
   to:{type:after.type,line:after.line,uid:after.uid,card:after.card?.id||null},
   sameUid:before.uid!=null&&before.uid===after.uid,
   differentCard:before.uid!==after.uid,
   beforeExecuted:before.executed,afterExecuted:after.executed,
   beforeBoundary:before.boundary,afterBoundary:after.boundary,
   beforeSearch:before.search,afterSearch:after.search
  });
 }
 return {
  id:spec.id,factors:trace.factors,factorsBound:bound,searched,legalCount,searchSeed,
  raw:action,returned:actionOf(pack,hand,action),
  reason:trace.reason||null,score:Number.isFinite(trace.score)?trace.score:null,
  nodesUsed:trace.nodesUsed??null,dispatches:meter.dispatches,
  accounted:meter.dispatches===trace.nodesUsed&&trace.nodesUsed<=48,
  phase:state.phase,pending:state.pending?.kind||null,
  stages,rewrites
 };
}
function beamOf(packs,state,actor,factors){
 const legal=legalUniversalActions(packs,state);
 const bound=factors||{coverage:null,raidBase:false,gate:null};
 const trace=bindVariant(null,()=>selectionTrace(packs,state,actor,legal,4,null),bound);
 const pack=packs[actor];
 const hand=state.players[actor].hand||[];
 const describe=action=>actionOf(pack,hand,action);
 return {
  picked:trace.picked.map(describe),
  evicted:trace.notes.filter(note=>note.reason==='replaced-by-front').map(note=>describe(note.action)),
  slot:trace.notes.filter(note=>note.reason==='front-slot').map(note=>describe(note.action))
 };
}
function reachEnergy(target){
 const audit=JSON.parse(readFileSync(target.source,'utf8'));
 const deck=battleDecks().find(item=>item.id===target.deck);
 const game=audit.titles[target.deck].byMode.tree.games
  .find(item=>item.seed===8300&&item.first===0&&item.challengerSeat===0);
 const packs=[deck.pack,deck.pack];
 let state=newComparedMatch(packs,[deck.counts,deck.counts],game.seed,game.first);
 for(const choice of game.opening||[]){
  const action=legalUniversalActions(packs,state).find(entry=>entry.type==='openingMulligan'&&entry.mode===choice.mode);
  state=dispatchUniversalAction(packs,state,action,{actor:choice.actor});
 }
 for(const row of game.actions){
  if(row.step===target.step)return {packs,state,game,replay:'reached'};
  state=dispatchUniversalAction(packs,state,row.action,{actor:state.pending?.player??state.active});
 }
 throw Error('missing '+target.deck+' '+target.step);
}
function reachFront(target){
 const audit=JSON.parse(readFileSync(target.source,'utf8'));
 const deck=battleDecks().find(item=>item.id==='white-sword');
 const game=audit.titles['white-sword'].byMode.tree.games
  .find(item=>item.seed===target.seed&&item.first===target.first&&item.challengerSeat===target.seat);
 const packs=[deck.pack,deck.pack];
 let state=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],target.seed,target.first)).state;
 for(const recorded of game.actions){
  if(recorded.step===target.step)return {packs,state,game,replay:'reached'};
  const actor=state.pending?.player??state.active;
  const action=legalUniversalActions(packs,state).find(item=>JSON.stringify(item)===JSON.stringify(recorded.action));
  if(!action)throw Error('front replay diverged '+target.id);
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 throw Error('missing front '+target.id);
}
function reachFilter(){
 const audit=JSON.parse(readFileSync('audit/ai-v3-official-8300-nodes48-white-reuse.json','utf8'));
 const deck=battleDecks().find(item=>item.id==='white-sword');
 const game=audit.titles['white-sword'].byMode.tree.games
  .find(item=>item.seed===8301&&item.first===0&&item.challengerSeat===1);
 const packs=[deck.pack,deck.pack];
 let state=newComparedMatch(packs,[deck.counts,deck.counts],game.seed,game.first,matchRules('official'));
 for(const choice of game.opening||[]){
  const action=legalUniversalActions(packs,state).find(entry=>entry.type==='openingMulligan'&&entry.mode===choice.mode);
  state=dispatchUniversalAction(packs,state,action,{actor:choice.actor});
 }
 for(const recorded of game.actions){
  if(recorded.step===29)return {packs,state,game,replay:'reached'};
  const actor=state.pending?.player??state.active;
  const action=legalUniversalActions(packs,state).find(item=>JSON.stringify(item)===JSON.stringify(recorded.action));
  if(!action)throw Error('filter replay diverged');
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 throw Error('missing filter');
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
 deck.unshift(raid(),raid(),quiet(),refund?take(card=>recoversActionPoints(catalog[card.cardId])):quiet(),quiet());
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
function chainWalk(packs,state,actor,refund,spec,searchSeed){
 const catalog=packs[actor].cards;
 let cursor=state;
 const fuel=new Set(cursor.players[actor].hand.filter(card=>{
  const printed=catalog[card.cardId];
  return printed.type==='character'&&printed.energy===1&&!sequencedFilter(printed);
 }).map(card=>card.uid));
 const standing=cursor.players[actor].front.find(Boolean);
 const spent=[],keys=[],main=[];
 let filtersPlayed=0;
 const record=choice=>{
  const key=choice.returned.type+':'+(choice.returned.line||choice.returned.mode||'');
  keys.push(key);
  const gate=choice.rewrites.find(row=>row.at==='final-gate');
  const step={phase:choice.phase,pending:choice.pending,key,returned:choice.returned,
   search:(choice.stages||[]).find(row=>row.stage==='search')||null,
   rewrites:choice.rewrites,nodesUsed:choice.nodesUsed,dispatches:choice.dispatches,
   gateChanged:!!gate,factors:choice.factors};
  if(choice.phase==='main'&&!choice.pending)main.push(step);
  return step;
 };
 for(let guard=0;guard<16&&cursor.status==='playing'&&cursor.active===actor;guard++){
  if(!cursor.pending&&cursor.phase==='attack')break;
  const choice=ask(packs,cursor,spec,searchSeed);
  const card=cursor.players[actor].hand.find(item=>item?.uid===choice.returned.uid);
  const printed=card&&catalog[card.cardId];
  record(choice);
  if(choice.returned.type==='chooseDiscardGate'&&choice.returned.uid){
   if(!fuel.has(choice.returned.uid))return {ok:false,break:'discard-not-fuel',spent,keys,main};
   spent.push(choice.returned.uid);
  }
  if(choice.returned.type==='play'&&choice.returned.line==='energy'&&printed&&sequencedFilter(printed))filtersPlayed++;
  if(choice.returned.type==='play'&&choice.returned.line==='energy'&&printed&&lineSwitchBody(printed)){
   if(filtersPlayed!==2||spent.length!==2||readyAp(cursor,actor)!==1)
    return {ok:false,break:'line-switch-preface',filtersPlayed,spent,ap:readyAp(cursor,actor),keys,main};
   cursor=dispatchUniversalAction(packs,cursor,choice.raw,{actor});
   const entered=cursor.players[actor].energy.find(item=>item?.uid===choice.returned.uid);
   const blocker=(cursor.players[actor].energy.filter(item=>item?.ready)[0])||null;
   const moved=ask(packs,cursor,spec,searchSeed);
   record(moved);
   if(moved.returned.type!=='chooseLineMove'||!blocker||moved.returned.uid!==blocker.uid)
    return {ok:false,break:'line-move',expected:blocker?.uid||null,keys,spent,main};
   cursor=dispatchUniversalAction(packs,cursor,moved.raw,{actor});
   if(cursor.pending?.kind==='effect-line-slot'){
    const slot=ask(packs,cursor,spec,searchSeed);
    record(slot);
    if(slot.returned.type!=='chooseLineSlot')return {ok:false,break:'line-slot',keys,spent,main};
    cursor=dispatchUniversalAction(packs,cursor,slot.raw,{actor});
   }
   const shifted=cursor.players[actor].front.find(item=>item?.uid===blocker.uid);
   const body=[...cursor.players[actor].energy,...cursor.players[actor].front].find(item=>item?.uid===entered?.uid);
   const keptStanding=cursor.players[actor].front.some(item=>item?.uid===standing?.uid&&item.ready);
   const passed=ask(packs,cursor,spec,searchSeed);
   record(passed);
   const intact=assertUniversalMatch(packs,cursor)===true&&shifted?.ready===true&&body?.ready===false&&
    keptStanding&&passed.returned.type==='next'&&cursor.players[actor].energy.some(item=>item?.uid===entered?.uid);
   return {ok:intact,break:intact?null:'line-switch-result',spent,keys,main,refundPlayed:false,
    standingReady:!!shifted?.ready,entrantRested:body?.ready===false,blockerOnFront:!!shifted};
  }
  if(choice.returned.type==='event'&&printed&&recoversActionPoints(printed)){
   if(!refund||filtersPlayed!==2||spent.length!==2||readyAp(cursor,actor)!==1)
    return {ok:false,break:'refund-preface',filtersPlayed,spent,ap:readyAp(cursor,actor),keys,main};
   const paid=readyAp(cursor,actor);
   cursor=dispatchUniversalAction(packs,cursor,choice.raw,{actor});
   if(readyAp(cursor,actor)!==paid-1)return {ok:false,break:'refund-cost',keys,spent,main};
   let recovered=0;
   while(cursor.pending?.kind==='effect-recover-ap'&&recovered<2){
    const step=ask(packs,cursor,spec,searchSeed);
    record(step);
    if(step.returned.type!=='chooseApRecovery')return {ok:false,break:'recover-step',keys,spent,main};
    const readyBefore=readyAp(cursor,actor);
    cursor=dispatchUniversalAction(packs,cursor,step.raw,{actor});
    if(readyAp(cursor,actor)!==readyBefore+1)return {ok:false,break:'recover-count',keys,spent,main};
    recovered++;
   }
   const intact=recovered===2&&assertUniversalMatch(packs,cursor)===true;
   return {ok:intact,break:intact?null:'refund-result',spent,keys,main,refundPlayed:intact,recovered};
  }
  if(choice.returned.type==='extraDraw')return {ok:false,break:'extra-draw',ap:readyAp(cursor,actor),keys,spent,main};
  cursor=dispatchUniversalAction(packs,cursor,choice.raw,{actor:cursor.pending?.player??cursor.active});
  if(assertUniversalMatch(packs,cursor)!==true)return {ok:false,break:'illegal',keys,spent,main};
 }
 return {ok:false,break:'unresolved',keys,spent,main};
}
function publicRun(run){
 const {raw,...rest}=run;
 return rest;
}

function describeZone(pack,cards){
 return (cards||[]).filter(Boolean).map(card=>{
  const printed=pack.cards[card.cardId]||{};
  return {uid:card.uid,id:printed.id||null,name:printed.name||null,type:printed.type||null,
   energy:printed.energy??null,bp:printed.bp??null,ready:card.ready===true};
 });
}
function dumpConflict(){
 const opened=reachFilter();
 const actor=opened.state.pending.player;
 const catalog=opened.packs[actor].cards;
 const spec=cells.find(item=>item.id==='main-front');
 const discard=ask(opened.packs,opened.state,spec,1);
 let cursor=dispatchUniversalAction(opened.packs,opened.state,discard.raw,{actor});
 orderDeck(cursor,actor,catalog,false);
 cursor=scriptToOwnStart(opened.packs,cursor,actor);
 const kept=ask(opened.packs,cursor,spec,1);
 cursor=dispatchUniversalAction(opened.packs,cursor,kept.raw,{actor});
 const steps=[];
 for(let guard=0;guard<16&&cursor.status==='playing';guard++){
  const choice=ask(opened.packs,cursor,spec,1);
  const handCard=(cursor.players[actor].hand||[]).find(item=>item?.uid===choice.returned.uid);
  const body=handCard&&opened.packs[actor].cards[handCard.cardId];
  const lineSwitch=choice.returned.type==='play'&&choice.returned.line==='energy'&&lineSwitchBody(body);
  if(lineSwitch||(choice.returned.type==='play'&&choice.returned.line==='front')){
   const baseline=ask(opened.packs,cursor,cells[0],1);
   const pack=opened.packs[actor];
   const player=cursor.players[actor];
   const board={
    source:'white-sword gameSeed 8301 first 0 seat 1, replayed to own start from step 29, then the plain deck order with no refund card',
    searchSeed:1,gameSeed:8301,stateHash:stateHash(cursor),
    phase:cursor.phase,pending:cursor.pending?.kind||null,active:cursor.active,actor,
    readyAp:readyAp(cursor,actor),life:cursor.players.map(item=>item.life.length),
    energy:universalEnergyByColor(opened.packs,cursor,actor),
    hand:describeZone(pack,player.hand),
    front:describeZone(pack,player.front),
    energyLine:describeZone(pack,player.energy),
    candidate:publicRun(choice),
    baselineOnSameState:publicRun(baseline),
    sameAction:sameAction(choice.returned,actionOf(opened.packs[actor],cursor.players[actor].hand,baseline.raw))
   };
   writeFileSync('audit/ai-v3-main-front-conflict.json',JSON.stringify({steps,board},null,2));
   console.log(JSON.stringify(board,null,2));
   return;
  }
  steps.push({phase:choice.phase,pending:choice.pending,returned:choice.returned,reason:choice.reason,
   nodesUsed:choice.nodesUsed,dispatches:choice.dispatches,factorsBound:choice.factorsBound,searched:choice.searched});
  cursor=dispatchUniversalAction(opened.packs,cursor,choice.raw,{actor:cursor.pending?.player??cursor.active});
 }
 throw Error('line switch was not reached');
}
if(process.argv.includes('--board'))dumpConflict();
else{

const energyTargets=[
 {id:'reject-blue',source:'audit/ai-v3-official-8300-life-36.json',deck:'reject-blue',step:13},
 {id:'white-sword',source:'audit/ai-v3-official-8300-life-36.json',deck:'white-sword',step:12},
 {id:'renruki',source:'audit/ai-v3-official-8300-life-36.json',deck:'renruki',step:15},
 {id:'white-sword-partial',source:'audit/ai-v3-official-8300-nodes48-white-reach.json',deck:'white-sword',step:55}
];
const energy=[];
for(const target of energyTargets){
 console.log('energy',target.id,target.step);
 const reached=reachEnergy(target);
 const actor=reached.state.pending?.player??reached.state.active;
 const position={
  id:target.id,step:target.step,source:target.source,replay:reached.replay,
  gameSeed:reached.game.seed,first:0,seat:0,stateHash:stateHash(reached.state),
  phase:reached.state.phase,actor,
  reach:'same replay as scripts/ai-v3-ab-front-energy.mjs: recorded action dispatched, no extra rules object'
 };
 position.bySearchSeed={};
 for(const searchSeed of [1,8300]){
  position.bySearchSeed[searchSeed]=cells.map(spec=>publicRun(ask(reached.packs,reached.state,spec,searchSeed)));
  console.log(' ',searchSeed,position.bySearchSeed[searchSeed].map(run=>run.id+':'+run.returned.type+':'+(run.returned.uid||'')).join(' '));
 }
 energy.push(position);
}

const frontTargets=[
 {id:'last-ap',source:'audit/ai-v3-official-8300-nodes48-white-filter.json',seed:8300,first:1,seat:0,step:22},
 {id:'two-ap',source:'audit/ai-v3-official-8300-nodes48-white-filter.json',seed:8301,first:0,seat:0,step:31},
 {id:'three-ap',source:'audit/ai-v3-official-8300-nodes48-white-filter.json',seed:8301,first:0,seat:1,step:41}
];
const frontSpecs=cells.filter(spec=>['baseline','named-ab','named-ab-front','main-front'].includes(spec.id));
const fronts=[];
for(const target of frontTargets){
 console.log('front',target.id);
 const reached=reachFront(target);
 const actor=reached.state.pending?.player??reached.state.active;
 const row={
  ...target,replay:reached.replay,gameSeed:target.seed,stateHash:stateHash(reached.state),
  phase:reached.state.phase,actor,searchSeed:1,
  beam:{
   baseline:beamOf(reached.packs,reached.state,actor,null),
   mainFront:beamOf(reached.packs,reached.state,actor,CANDIDATE)
  },
  runs:frontSpecs.map(spec=>publicRun(ask(reached.packs,reached.state,spec,1)))
 };
 fronts.push(row);
 console.log(' ',row.runs.map(run=>run.id+':'+run.returned.type+':'+(run.returned.line||'')+':'+(run.returned.uid||'')).join(' '));
}

console.log('filter');
const opened=reachFilter();
const filterActor=opened.state.pending.player;
const catalog=opened.packs[filterActor].cards;
const filterSpecs=cells.filter(spec=>['baseline','named-ab','named-ab-front','main-front'].includes(spec.id));
const filterRows=[];
for(const spec of filterSpecs){
 const discard=ask(opened.packs,opened.state,spec,1);
 const plainCard=opened.state.players[filterActor].hand.find(card=>card.uid===discard.returned.uid);
 const printed=plainCard&&catalog[plainCard.cardId];
 const discardOk=discard.returned.type==='chooseHandLimit'&&printed?.energy===0&&printed.gen>0&&
  (printed.effects?.onPlay||[]).length===0&&printed.name==='日番谷 冬獅郎'&&
  keepScore(opened.packs,opened.state,filterActor,plainCard)===Math.min(...opened.state.players[filterActor].hand.map(card=>keepScore(opened.packs,opened.state,filterActor,card)));
 const base=dispatchUniversalAction(opened.packs,opened.state,discard.raw,{actor:filterActor});
 const hidden=structuredClone(base);
 orderDeck(base,filterActor,catalog,false);
 orderDeck(hidden,filterActor,catalog,true);
 const start=scriptToOwnStart(opened.packs,base,filterActor);
 const other=scriptToOwnStart(opened.packs,hidden,filterActor);
 const kept=ask(opened.packs,start,spec,1);
 const keptOther=ask(opened.packs,other,spec,1);
 const startOk=kept.returned.type==='next'&&sameAction(kept.returned,keptOther.returned)&&readyAp(start,filterActor)===3;
 let plain=null,final=null;
 if(startOk){
  plain=chainWalk(opened.packs,dispatchUniversalAction(opened.packs,start,kept.raw,{actor:filterActor}),filterActor,false,spec,1);
  final=chainWalk(opened.packs,dispatchUniversalAction(opened.packs,other,keptOther.raw,{actor:filterActor}),filterActor,true,spec,1);
 }
 const mainGate=(plain?.main||[]).filter(step=>step.gateChanged).concat((final?.main||[]).filter(step=>step.gateChanged));
 const confirmed=discardOk&&startOk&&plain?.ok&&final?.ok&&final.refundPlayed===true&&plain.refundPlayed===false&&
  plain.keys.slice(0,6).join('|')===final.keys.slice(0,6).join('|')&&
  plain.keys[6]==='chooseTopCard:bottom'&&final.keys[6]==='chooseTopCard:top'&&
  new Set(plain.spent).size===2&&JSON.stringify(final.spent)===JSON.stringify(plain.spent)&&
  plain.standingReady===true&&plain.entrantRested===true;
 filterRows.push({
  id:spec.id,searchSeed:1,gameSeed:8301,stateHash:stateHash(opened.state),replay:opened.replay,
  factors:discard.factors,discardOk,discardUid:discard.returned.uid,discardCard:discard.returned.card,
  startOk,start:publicRun(kept),
  plain:plain&&{ok:plain.ok,break:plain.break,keys:plain.keys,spent:plain.spent,refundPlayed:plain.refundPlayed,
   standingReady:plain.standingReady??null,entrantRested:plain.entrantRested??null,main:plain.main},
  final:final&&{ok:final.ok,break:final.break,keys:final.keys,spent:final.spent,refundPlayed:final.refundPlayed,
   recovered:final.recovered??null,main:final.main},
  mainGate,confirmed
 });
 console.log(' ',spec.id,confirmed?'kept':filterRows.at(-1).plain?.break||filterRows.at(-1).start?.returned?.type, 'main-gates', mainGate.length);
}

const out={
 note:'Search seed 1 and game seed 8300 are different settings. The search seed shuffles the hidden zones of the one belief world. Historical factor-split.json used search seed 1. Historical ai-v3-ab-front-energy.json used game.seed, which is 8300. A difference between those files is not a program change. The main-front candidate is not one of the eight cells.',
 settings:'plan tree, hardNodes 0, nodes 48, ms 1e9, now 0. Within one bySearchSeed table only the factors change.',
 candidate:CANDIDATE,
 energy,fronts,
 filter:{source:'white-sword 8301 first 0 seat 1 step 29',rows:filterRows}
};
writeFileSync('audit/ai-v3-main-front.json',JSON.stringify(out,null,2));
console.log('wrote audit/ai-v3-main-front.json');
}
