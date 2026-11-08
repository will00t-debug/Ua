#!/usr/bin/env node
// Replay the move-phase positions where full A+B spends a color the default keeps.
// ab-front does not apply its gate in the move phase, so these actions stay.
import {readFileSync,writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';

const variants=[null,'ab','ab-front'];
const decks=battleDecks();
const life=JSON.parse(readFileSync('audit/ai-v3-official-8300-life-36.json','utf8'));
const reach=JSON.parse(readFileSync('audit/ai-v3-official-8300-nodes48-white-reach.json','utf8'));
const targets=[
 {source:'audit/ai-v3-official-8300-life-36.json',report:life,id:'reject-blue',step:13},
 {source:'audit/ai-v3-official-8300-life-36.json',report:life,id:'white-sword',step:12},
 {source:'audit/ai-v3-official-8300-life-36.json',report:life,id:'renruki',step:15},
 {source:'audit/ai-v3-official-8300-nodes48-white-reach.json',report:reach,id:'white-sword',step:55,label:'partial-block'}
];

function reachTarget(target){
 const deck=decks.find(row=>row.id===target.id);
 const game=target.report.titles[target.id].byMode.tree.games.find(row=>row.seed===8300&&row.first===0&&row.challengerSeat===0);
 const packs=[deck.pack,deck.pack];
 let state=newComparedMatch(packs,[deck.counts,deck.counts],game.seed,game.first);
 for(const choice of game.opening||[]){
  const action=legalUniversalActions(packs,state).find(entry=>entry.type==='openingMulligan'&&entry.mode===choice.mode);
  state=dispatchUniversalAction(packs,state,action,{actor:choice.actor});
 }
 for(const row of game.actions){
  if(row.step===target.step)return {packs,state,game};
  state=dispatchUniversalAction(packs,state,row.action,{actor:state.pending?.player??state.active});
 }
 throw Error('missing '+target.id+' '+target.step);
}
function describe(action){
 return {type:action?.type||null,line:action?.line||null,uid:action?.uid??null,mode:action?.mode||null};
}
function ask(packs,state,variant,seed){
 const actor=state.pending?.player??state.active;
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  ...MATCH_LIMITS,actor,seed,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true,meter,
  ...(variant?{variant}:{})
 });
 const trace=lastAiV3Trace();
 return {
  variant:variant||'baseline',
  action:describe(action),
  reason:trace.reason,
  replacedMove:describe(trace.replacedMove),
  nodesUsed:trace.nodesUsed,
  dispatches:meter.dispatches,
  settled:trace.settled??null,
  phase:state.phase,
  pending:state.pending?.kind||null,
  energy:universalEnergyByColor(packs,state,actor)
 };
}
const positions=targets.map(target=>{
 const {packs,state,game}=reachTarget(target);
 const actor=state.pending?.player??state.active;
 const legal=legalUniversalActions(packs,state).filter(action=>action.type==='move'||action.type==='next');
 return {
  label:target.label||'move-color',
  source:target.source,
  deck:target.id,
  seed:8300,first:0,challengerSeat:0,step:target.step,
  settings:'official opening replay, plan tree, hardNodes 0, nodes 48, ms 1e9, now 0',
  phase:state.phase,pending:state.pending?.kind||null,actor,
  energy:universalEnergyByColor(packs,state,actor),
  legal:legal.map(describe),
  opening:game.opening||[],
  runs:variants.map(variant=>ask(packs,state,variant,game.seed))
 };
});
const out={
 note:'Four move-phase positions from the 8300 life and reach records, measured again at 48 nodes with no clock. Only white-sword seed 8300 first 0 seat 0 step 12 still changes: baseline and ab-front pass, and full A+B moves uid 0-32. reject-blue step 13, renruki step 15, and white-sword step 55 stay next under baseline, A+B, and ab-front. ab-front does not gate the move phase. This file is the reproduction, not a new parameter.',
 positions
};
writeFileSync('audit/ai-v3-ab-front-energy-regression.json',JSON.stringify(out,null,2));
for(const position of positions){
 console.log(position.deck,position.step,position.runs.map(run=>run.variant+':'+run.action.type+(run.action.uid?'/'+run.action.uid:'')).join(' '));
}
