#!/usr/bin/env node
// Fixed-position comparison. Replay is the frozen 48-node policy with no clock,
// so the same seed, deck and step reproduce the same decision.
//
//   node scripts/ai-v3-positions.mjs
//   AI_V3_TITLES=white-sword AI_V3_DEV_SEED=8300 AI_V3_FIRST=1 node scripts/ai-v3-positions.mjs
import {performance} from 'node:perf_hooks';
import {designatedBattleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,lastHardAiTrace,hardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {applySharedOpening,newComparedMatch,nextBuckets,OFFICIAL_OPENING} from '../dist/universal-v2/ai-v3/opening.mjs';
import {strategyParts} from '../dist/universal-v2/ai-v3/strategy.mjs';

const SEED=Number(process.env.AI_V3_DEV_SEED||8300);
const STEPS=Number(process.env.AI_V3_STEPS||48);
const FIRSTS=(process.env.AI_V3_FIRST!=null&&process.env.AI_V3_FIRST!==''?[Number(process.env.AI_V3_FIRST)]:[0,1]);
const wanted=new Set((process.env.AI_V3_TITLES||'reject-blue,white-sword,renruki').split(',').filter(Boolean));
const decks=designatedBattleDecks().filter(deck=>wanted.has(deck.id)||wanted.has(deck.name));

function tag(action){
 if(!action)return null;
 return [action.type,action.line||'',action.mode||'',action.uid||''].filter(Boolean).join(':');
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function developing(action){
 return !!action&&['play','raid','attack','move','activate','event','handActivate'].includes(action.type);
}
function round(value){return Number.isFinite(value)?Math.round(value*10)/10:null;}
function askHard(packs,state,nodes){
 resetHardAiReport();
 const started=performance.now();
 const action=chooseStrengthenedHardAction(packs,state,{nodes,ms:1e9,seed:1});
 const trace=lastHardAiTrace();
 return {action,ms:performance.now()-started,view:{
  action:tag(action),type:action?.type||null,line:action?.line||null,
  reason:trace?.reason||null,score:round(trace?.score),nodes:trace?.nodesUsed??hardAiReport().nodes,
  rootCut:!!trace?.rootCut,
  top:(trace?.candidates||[]).slice(0,5).map(row=>({action:tag(row.action),score:round(row.score)}))
 }};
}
function lineOf(trace,action){
 return (trace?.compared||[]).find(row=>same(row.action,action))||null;
}
function askTree(packs,state,actor,extra){
 resetAiV3Report();
 const started=performance.now();
 const action=chooseAiV3Action(packs,state,{
  actor,nodes:48,ms:extra.ms,seed:1,plan:'tree',beam:4,worlds:1,
  strategy:extra.strategy||null,
  ...(Number.isInteger(extra.hardNodes)?{hardNodes:extra.hardNodes}:{})
 });
 const trace=lastAiV3Trace();
 const row=lineOf(trace,action);
 return {action,ms:performance.now()-started,view:{
  action:tag(action),type:action?.type||null,line:action?.line||null,
  reason:trace?.reason||null,score:round(trace?.score??row?.search),
  boundary:row?.boundary||null,cut:row?.cut||null,settled:row?.settled??null,
  hard:tag(trace?.hard),hardNodes:trace?.hardNodes??null,strategy:extra.strategy||null,
  sequence:(trace?.sequence||[]).slice(0,16).map(step=>step.kind+':'+step.type+(step.mode?':'+step.mode:'')),
  compared:(trace?.compared||[]).map(item=>({
   action:tag(item.action),search:round(item.search),boundary:item.boundary,cut:item.cut,settled:!!item.settled
  }))
 }};
}
function legalSummary(legal){
 const counts={};
 for(const action of legal)counts[action.type]=(counts[action.type]||0)+1;
 return {count:legal.length,types:counts};
}
const saved=[];
const games=[];
for(const deck of decks){
 for(const first of FIRSTS){
  const packs=[deck.pack,deck.pack];
  const dealt=newComparedMatch(packs,[deck.counts,deck.counts],SEED,first,OFFICIAL_OPENING);
  const opening=applySharedOpening(packs,dealt);
  let state=opening.state;
  const rows=[];
  let steps=0;
  console.error('walk',deck.id,'seed',SEED,'first',first,opening.choices.map(choice=>choice.actor+':'+choice.mode).join(','));
  while(state.status==='playing'&&steps<STEPS){
   const actor=state.pending?.player??state.active;
   const legal=legalUniversalActions(packs,state);
   const buckets=nextBuckets(legal,{type:'next'});
   let record=null;
   if(legal.length>1&&state.pending?.kind!=='opening-mulligan'){
    const hard48=askHard(packs,state,48);
    const hard16=askHard(packs,state,16);
    const tree=askTree(packs,state,actor,{ms:1e9});
    const clock=askTree(packs,state,actor,{ms:40});
    const giveUp=developing(hard48.action)&&tree.action?.type==='next';
    record={
     step:steps,actor,phase:state.phase,pending:state.pending?.kind||null,
     legal:legalSummary(legal),onlyNext:buckets.onlyNext,
     parts:strategyParts(packs,state,actor),
     hard48:hard48.view,hard16:hard16.view,tree:tree.view,clock:clock.view,
     hardAgrees:tag(hard48.action)===tag(hard16.action),
     treeAgrees:tag(tree.action)===tag(hard48.action),
     giveUp,ms:{hard48:round(hard48.ms),hard16:round(hard16.ms),tree:round(tree.ms),clock:round(clock.ms)}
    };
    rows.push(record);
    console.error(' ',steps,state.phase,record.pending||'-','H',record.hard48.action,'16',record.hard16.action,'T',record.tree.action,'C',record.clock.action,record.clock.reason);
    if((giveUp&&saved.filter(item=>item.giveUp).length<12)||(!giveUp&&developing(hard48.action)&&saved.filter(item=>!item.giveUp).length<4)){
     saved.push({deck:deck.id,seed:SEED,first,step:steps,giveUp,state:structuredClone(state),packs,actor});
    }
    const chosen=legal.find(action=>JSON.stringify(action)===JSON.stringify(hard48.action))||legal[0];
    state=dispatchUniversalAction(packs,state,chosen,{actor});
   }else{
    const chosen=legal.find(action=>action.type==='next')||legal[0];
    if(!chosen)break;
    state=dispatchUniversalAction(packs,state,chosen,{actor});
   }
   steps++;
  }
  const give=rows.filter(row=>row.giveUp).length;
  const split=rows.filter(row=>!row.hardAgrees).length;
  console.error('  decisions',rows.length,'give-up',give,'hard16-differs',split);
  games.push({deck:deck.id,seed:SEED,first,opening:opening.choices,steps,decisions:rows.length,
   giveUp:give,hard16Differs:split,rows});
 }
}
const variants=['score','order','reply'];
const splits=[0,8,32];
const checks=[];
for(const item of saved){
 const base=askTree(item.packs,item.state,item.actor,{ms:1e9});
 const row={deck:item.deck,seed:item.seed,first:item.first,step:item.step,giveUp:item.giveUp,tree:base.view.action};
 for(const strategy of variants){
  const picked=askTree(item.packs,item.state,item.actor,{ms:1e9,strategy});
  row[strategy]={action:picked.view.action,reason:picked.view.reason,boundary:picked.view.boundary,
   score:picked.view.score,sequence:picked.view.sequence,compared:picked.view.compared};
 }
 for(const hardNodes of splits){
  const picked=askTree(item.packs,item.state,item.actor,{ms:1e9,hardNodes});
  row['hard'+hardNodes]={action:picked.view.action,reason:picked.view.reason,hard:picked.view.hard,
   boundary:picked.view.boundary,score:picked.view.score};
 }
 checks.push(row);
 console.error('check',item.deck,item.first,item.step,item.giveUp?'give-up':'control',
  variants.map(name=>name+':'+row[name].action).join(' '),
  splits.map(nodes=>'h'+nodes+':'+row['hard'+nodes].action).join(' '));
}
const summary={
 rules:OFFICIAL_OPENING,opening:'shared-hard-mulligan',seed:SEED,steps:STEPS,
 reproduce:'AI_V3_TITLES=<deck> AI_V3_DEV_SEED='+SEED+' AI_V3_FIRST=<0|1> node scripts/ai-v3-positions.mjs',
 games:games.map(game=>({...game,rows:game.rows.filter(row=>row.giveUp||!row.treeAgrees||!row.hardAgrees)})),
 checks
};
console.log(JSON.stringify(summary,null,2));
