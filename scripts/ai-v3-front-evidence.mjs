#!/usr/bin/env node
// Rebuild the three white-sword positions used to separate "the front never
// entered the beam" from "search chose it and a preference replaced it".
// Larger node budgets are diagnostic only. The match budget stays 48.
import {readFileSync,writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {selectionTrace} from '../dist/universal-v2/ai-v3/beam.mjs';
import {bindVariant,frontCoverageScore} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {newComparedMatch,applySharedOpening} from '../dist/universal-v2/ai-v3/opening.mjs';

const source='audit/ai-v3-official-8300-nodes48-white-filter.json';
const audit=JSON.parse(readFileSync(source,'utf8'));
const deck=battleDecks().find(item=>item.id==='white-sword');
const games=audit.titles['white-sword'].byMode.tree.games;
const targets=[
 {id:'last-ap',seed:8300,first:1,seat:0,step:22,role:'energy development, one action point left, empty front'},
 {id:'two-ap',seed:8301,first:0,seat:0,step:31,role:'front building, two action points, empty front'},
 {id:'three-ap',seed:8301,first:0,seat:1,step:41,role:'attack tempo, three action points, empty front'}
];
const variants=[null,'a','b','ab'];
const budgets=[48,192,768];

function reach(target){
 const game=games.find(item=>item.seed===target.seed&&item.first===target.first&&item.challengerSeat===target.seat);
 const packs=[deck.pack,deck.pack];
 let state=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],target.seed,target.first)).state;
 const prefix=[];
 for(const step of game.actions){
  if(step.step===target.step)return {packs,state,game,prefix};
  const actor=state.pending?.player??state.active;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(step.action));
  if(!action)throw Error('replay diverged at '+step.step);
  prefix.push(step.action);
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 throw Error('missing '+target.id);
}
function printed(pack,card){
 if(!card)return null;
 const body=pack.cards[card.cardId]||{};
 return {uid:card.uid,id:body.id,energy:body.energy??null,bp:body.bp??null,gen:body.gen||0,
  ap:body.ap??null,trigger:body.trigger||null,raid:body.raidName||null,
  onPlay:(body.effects?.onPlay||[]).map(effect=>effect?.op).filter(Boolean)};
}
function describe(pack,hand,action){
 const card=action?.uid?hand.find(item=>item.uid===action.uid):null;
 const body=card&&pack.cards[card.cardId];
 return {type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null,
  card:body?body.id+':'+body.energy+'/'+(body.bp||0):null};
}
function ask(packs,state,actor,nodes,variant){
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes,ms:1e9,now:()=>0,diagnose:true,
  ...(variant?{variant}:{}),meter
 });
 const trace=lastAiV3Trace();
 const rows=(trace.compared||[]).filter(row=>row.executed!==false).map(row=>({
  action:describe(packs[actor],state.players[actor].hand,row.action),
  search:row.search,boundary:row.boundary
 }));
 return {
  variant:variant||'baseline',nodes,
  returned:describe(packs[actor],state.players[actor].hand,action),
  reason:trace.reason,score:trace.score??null,
  searched:describe(packs[actor],state.players[actor].hand,trace.replacedMove)||null,
  nodesUsed:trace.nodesUsed,dispatches:meter.dispatches,
  over:trace.nodesUsed>nodes||meter.dispatches!==trace.nodesUsed,
  rows
 };
}
const positions=[];
for(const target of targets){
 const {packs,state,game,prefix}=reach(target);
 const seat=target.seat;
 const legal=legalUniversalActions(packs,state);
 const pack=packs[seat];
 const hand=state.players[seat].hand;
 const plain=selectionTrace(packs,state,seat,legal,4,null);
 const covered=bindVariant('a',()=>selectionTrace(packs,state,seat,legal,4,null));
 const noteOf=(trace,action)=>trace.notes.find(note=>JSON.stringify(note.action)===JSON.stringify(action));
 const candidates=legal.map(action=>{
  const base=noteOf(plain,action);
  const next=noteOf(covered,action);
  const card=action.uid?hand.find(item=>item.uid===action.uid):null;
  return {
   action:describe(pack,hand,action),
   coverage:action.type==='play'&&action.line==='front'?frontCoverageScore(packs,state,seat,action):null,
   baseline:base?.reason||'absent',
   variantA:next?.reason||'absent',
   inBaselineBeam:plain.picked.some(item=>JSON.stringify(item)===JSON.stringify(action)),
   inVariantABeam:covered.picked.some(item=>JSON.stringify(item)===JSON.stringify(action))
  };
 });
 const recorded=game.actions[target.step];
 const searches=[];
 for(const variant of variants)for(const nodes of budgets)searches.push(ask(packs,state,seat,nodes,variant));
 const mine=state.players[seat],foe=state.players[1-seat];
 positions.push({
  id:target.id,role:target.role,
  reproduce:{source,seed:target.seed,first:target.first,challengerSeat:target.seat,step:target.step,
   opening:game.opening||[],actionsBefore:prefix},
  recorded:{action:describe(pack,hand,recorded.action),reason:recorded.reason,nodesUsed:recorded.nodesUsed??null},
  board:{
   phase:state.phase,turn:state.turn,life:state.players.map(player=>player.life.length),
   ap:mine.apCards.filter(card=>card.ready).length,
   energy:universalEnergyByColor(packs,state,seat),
   hand:hand.map(card=>printed(pack,card)),
   front:mine.front.map(card=>printed(pack,card)),
   readyFront:mine.front.filter(card=>card?.ready).map(card=>printed(pack,card)),
   foeReady:foe.front.filter(card=>card?.ready).map(card=>printed(packs[1-seat],card))
  },
  state,
  candidates,
  baselineBeam:plain.picked.map(action=>describe(pack,hand,action)),
  variantABeam:covered.picked.map(action=>describe(pack,hand,action)),
  searches
 });
}
const out={
 baseline:'528ab2045e435c30db88294d01d49430d770c012',
 note:'Variant flags default off. A ranks the one front slot by attack, effect, cost and energy use. B keeps a searched action when the preference lacks a same-boundary row that scores at least as high. Depth alone is not treated as better. Confirmed wins and immediate losses stay protected.',
 clockGroup:{seed:8410,decks:['white-sword','sword-art-online-raid','steins-gate-raid'],first:[0,1],seats:[0,1],ms:40,nodes:48,
  note:'Preselected before the 8401/8402 table. Run only after a candidate is frozen.'},
 revertedExperiment:{
  what:'The earlier default-on change put the highest BP body that met the standing attacker into the front slot, then restored that front whenever a preference left it for a shallower or lower-scoring line.',
  whiteSword12:{before:'1-11',after:'1-11',pairedMean:-0.4166666666666667,changedGames:10,
   winLife:'the only win fell from 3 life to 1',source:'audit was not kept; measured on 8300-8302 and then reverted'}
 },
 positions
};
writeFileSync('audit/ai-v3-front-evidence-positions.json',JSON.stringify(out));
for(const position of positions){
 console.log('\n##',position.id,position.recorded.action.card,position.recorded.reason);
 console.log('baseline beam',position.baselineBeam.map(item=>item.card||item.type).join(' | '));
 console.log('A beam',position.variantABeam.map(item=>item.card||item.type).join(' | '));
 for(const row of position.searches){
  if(row.nodes!==48&&row.nodes!==192&&row.nodes!==768)continue;
  console.log(row.variant,row.nodes,row.returned.card||row.returned.type,row.reason,'searched',row.searched?.card||row.searched?.type||'-','nodes',row.nodesUsed,'dispatch',row.dispatches,row.over?'OVER':'ok');
 }
}
