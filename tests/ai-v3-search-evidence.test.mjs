import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report,MATCH_LIMITS,comparedLines} from '../dist/universal-v2/ai-v3/search.mjs';
import {generatorEvidenceChoice,normalizeFactors} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {openLethalShift} from '../scripts/ai-v3-lethal-shift.mjs';
import {walkTo} from '../scripts/ai-v3-search-bottleneck.mjs';

const report=JSON.parse(readFileSync(new URL('../audit/ai-v3-hold-info-8401-baseline.json',import.meta.url),'utf8'));
const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
const SPOTS=[
 {deck:'white-sword',seed:8402,first:1,seat:1,step:33,id:'white-sword|8402|1|1'},
 {deck:'white-sword',seed:8402,first:1,seat:0,step:8,id:'white-sword|8402|1|0'},
 {deck:'steins-gate-raid',seed:8401,first:0,seat:1,step:20,id:'steins-gate-raid|8401|0|1'}
];

function label(action){
 return [action?.type||'',action?.line||'',action?.uid??'',action?.mode||''].join(':');
}
function spot(spec){
 const game=report.titles[spec.deck].byMode.tree.games.find(item=>item.seed===spec.seed&&item.first===spec.first&&item.challengerSeat===spec.seat);
 return walkTo(decks.get(spec.deck),game,spec.step);
}
function ask(packs,state,factors){
 const actor=state.pending?.player??state.active;
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  actor,...MATCH_LIMITS,seed:1,plan:'tree',nodes:48,ms:1e9,now:()=>0,hardNodes:0,diagnose:true,meter,
  ...(factors?{factors}:{})
 });
 const trace=lastAiV3Trace();
 const legal=legalUniversalActions(packs,state);
 assert.equal(legal.some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=48);
 return {action,trace,meter,actor};
}

test('the two switches stay off unless a caller asks',()=>{
 assert.equal(normalizeFactors(null),null);
 const named=normalizeFactors({coverage:'root',raidBase:true,gate:'main-front'});
 assert.equal(named.alignRoots,undefined);
 assert.equal(named.evidenceGenerator,undefined);
 assert.deepEqual(normalizeFactors({alignRoots:true}),{
  coverage:null,raidBase:false,gate:null,alignRoots:true
 });
 assert.equal(normalizeFactors({evidenceGenerator:true}).alignRoots,undefined);
 assert.equal(normalizeFactors({alignRoots:true}).evidenceGenerator,undefined);
});

test('an energy rewrite needs a searched line at the same boundary',()=>{
 const front={type:'play',line:'front',uid:'a'};
 const energy={type:'play',line:'energy',uid:'a'};
 const other={type:'play',line:'energy',uid:'b'};
 const rows=[
  {action:front,search:10,boundary:'yielded',executed:true},
  {action:other,search:12,boundary:'yielded',executed:true}
 ];
 assert.equal(generatorEvidenceChoice(front,energy,rows),front);
 assert.equal(generatorEvidenceChoice(front,other,rows).uid,'b');
 assert.equal(generatorEvidenceChoice(front,other,[
  {action:front,search:20,boundary:'yielded',executed:true},
  {action:other,search:12,boundary:'yielded',executed:true}
 ]).uid,'a');
 assert.equal(generatorEvidenceChoice(front,other,[
  {action:front,search:10,boundary:'yielded',executed:true},
  {action:other,search:30,boundary:'pending',executed:true}
 ]).uid,'a');
 assert.equal(generatorEvidenceChoice(front,other,[
  {action:front,search:100000,boundary:'terminal',executed:true},
  {action:other,search:40,boundary:'terminal',executed:true}
 ]).uid,'a');
 assert.equal(generatorEvidenceChoice(front,other,[
  {action:front,search:10,boundary:'yielded',executed:true},
  {action:other,search:100000,boundary:'terminal',executed:true}
 ]).uid,'b');
 assert.equal(generatorEvidenceChoice(front,other,[
  {action:front,search:-100000,boundary:'terminal',executed:true}
 ]).uid,'a');
 assert.equal(generatorEvidenceChoice(front,other,[
  {action:front,search:-100000,boundary:'terminal',executed:true},
  {action:other,search:-10,boundary:'terminal',executed:true}
 ]).uid,'b');
 assert.equal(generatorEvidenceChoice({type:'next'},energy,rows).line,'energy');
});

test('white-sword 8402 step 8 compares the two energy plays at one stop',()=>{
 const spec=SPOTS[1];
 const {packs,state}=spot(spec);
 const base=ask(packs,state);
 assert.equal(label(base.action),'play:energy:0-33:');
 assert.equal(base.trace.factors.alignRoots,undefined);
 const aligned=ask(packs,state,{alignRoots:true});
 assert.equal(label(aligned.action),'play:energy:0-10:');
 assert.equal(aligned.trace.factors.alignRoots,true);
 assert.equal(aligned.trace.factors.evidenceGenerator,undefined);
 assert.equal(aligned.trace.align.refused,false);
 const rows=aligned.trace.candidates;
 assert.equal(new Set(rows.map(row=>row.boundary+':'+row.phase+':'+(row.pending||''))).size,1);
 const compared=comparedLines(rows);
 const best=Math.max(...compared.rows.map(row=>row.search));
 assert.equal(compared.rows.find(row=>row.action.uid==='0-10'&&row.action.line==='energy').search,best);
 assert.ok(compared.rows.some(row=>row.action.uid==='0-33'));
});

test('white-sword 8402 step 33 does not rank the raid from another phase',()=>{
 const spec=SPOTS[0];
 const {packs,state}=spot(spec);
 const base=ask(packs,state);
 const aligned=ask(packs,state,{alignRoots:true});
 assert.equal(label(base.action),'play:front:1-37:');
 assert.equal(label(aligned.action),'play:front:1-37:');
 const raid=aligned.trace.candidates.find(row=>row.action.type==='raid'&&row.action.uid==='1-37');
 const front=aligned.trace.candidates.find(row=>row.action.type==='play'&&row.action.line==='front'&&row.action.uid==='1-37');
 assert.equal(raid.executed!==false,true);
 assert.notEqual(raid.phase,front.phase);
 assert.equal(aligned.trace.align.refused,false);
 assert.equal(legalUniversalActions(packs,state).some(action=>action.type==='raid'&&action.uid==='1-37'),true);
});

test('steins-gate 8401 step 20 keeps the searched front when the energy line was not run',()=>{
 const spec=SPOTS[2];
 const {packs,state}=spot(spec);
 const base=ask(packs,state);
 const gated=ask(packs,state,{evidenceGenerator:true});
 assert.equal(label(base.action),'play:energy:1-20:');
 assert.equal(base.trace.stages.find(stage=>stage.stage==='search').line,'front');
 assert.equal(gated.trace.factors.evidenceGenerator,true);
 assert.equal(gated.trace.factors.alignRoots,undefined);
 assert.equal(label(gated.action),'play:front:1-20:');
 const search=gated.trace.stages.find(stage=>stage.stage==='search');
 const raw=gated.trace.stages.find(stage=>stage.stage==='generator');
 const checked=gated.trace.stages.find(stage=>stage.stage==='generator-evidence');
 assert.equal(search.line,'front');
 assert.equal(search.uid,'1-20');
 assert.equal(raw.line,'energy');
 assert.equal(raw.uid,'1-20');
 assert.equal(checked.line,'front');
 assert.equal(gated.trace.candidates.some(row=>row.action?.line==='energy'&&row.action.uid==='1-20'),false);
 const both=ask(packs,state,{alignRoots:true,evidenceGenerator:true});
 assert.equal(both.trace.factors.alignRoots,true);
 assert.equal(both.trace.factors.evidenceGenerator,true);
 assert.equal(both.action.type,'play');
 assert.equal(legalUniversalActions(packs,state).some(action=>JSON.stringify(action)===JSON.stringify(both.action)),true);
});

test('a proven kill still resolves when either switch is on',()=>{
 const opened=openLethalShift(0,{ban:true});
 for(const factors of [null,{alignRoots:true},{evidenceGenerator:true},{alignRoots:true,evidenceGenerator:true}]){
  const hit=ask(opened.packs,opened.state,factors);
  assert.equal(hit.action.type,'activate',JSON.stringify(factors));
  assert.equal(hit.trace.reason,'search');
  assert.equal(hit.trace.score,100000);
  assert.equal(hit.trace.settled,true);
 }
});

test('the worker accepts the switches and still returns a legal action',()=>{
 const opened=openLethalShift(0,{ban:true});
 const legal=legalUniversalActions(opened.packs,opened.state);
 const result=handleAiV3Request({
  sealed:true,requestId:3,stateVersion:1,actor:0,seed:1,
  nodes:48,ms:1e9,pack:opened.packs,state:opened.state,
  factors:{alignRoots:true,evidenceGenerator:true}
 });
 assert.equal(result.error,null);
 assert.equal(legal.some(action=>JSON.stringify(action)===JSON.stringify(result.action)),true);
 assert.ok(result.search.nodesUsed<=48);
});
