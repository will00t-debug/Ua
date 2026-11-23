import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {HARD_OPTIONS,ORDER_KINDS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {POLICY_DIM} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {policyVector} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {catalogsOf} from '../dist/universal-v2/white-sword-ai/browser-catalogs.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {v2Hash} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {minePositions} from '../training/white-sword-ai/v4a2/lib/mine.mjs';
import {
 STAGE_A_GATE,TEACHER_NODES,assertFreshSeed
} from '../training/white-sword-ai/v4a2/lib/protocol.mjs';
import {
 analyticPartial,blendScore,chooseKey,finiteDifference,flipStep,proposeSensitive,stageADecision
} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {stageBDecision} from '../training/white-sword-ai/v4a2/lib/stage.mjs';
import {assessTeacher,combineSamples,consultTeacher,teacherOptions} from '../training/white-sword-ai/v4a2/lib/teacher.mjs';

const RULES=matchRules('official');

function zeros(){
 return Array(POLICY_DIM).fill(0);
}
function bandRow(key,hard,index,value){
 const features=zeros();
 features[index]=value;
 return {key,sort:key,hard,features};
}
function coverage(counts){
 const rows=[];
 for(const [bucket,count] of Object.entries(counts)){
  for(let index=0;index<count;index++)rows.push({bucket,holdout:false,band:[{key:'a'},{key:'b'}]});
 }
 return rows;
}

test('fresh seeds reject the old rounds and the permanent holdouts',()=>{
 assert.throws(()=>assertFreshSeed(100423,'train'),/R1/);
 assert.throws(()=>assertFreshSeed(94000,'train'),/holdout/);
 assert.throws(()=>assertFreshSeed(130016,'train'),/holdout/);
 assert.doesNotThrow(()=>assertFreshSeed(160000,'train'));
});

test('a bounded analytical step changes one legal action and refuses an impossible gap',()=>{
 const parent=zeros();
 const best=bandRow('stay',10,3,0);
 const alt=bandRow('switch',4,3,1);
 const found=flipStep(parent,best,alt);
 assert.ok(found);
 const moved=parent.map((weight,index)=>weight+found.step[index]);
 assert.equal(chooseKey([best,alt],parent),'stay');
 assert.equal(chooseKey([best,alt],moved),'switch');
 assert.equal(flipStep(parent,best,bandRow('far',-100,3,1)),null);
 const partial=finiteDifference(moved,alt.features,3);
 assert.ok(Math.abs(partial-analyticPartial(alt.features,3))<1e-6);
 assert.ok(Math.abs((blendScore(0,moved,alt.features)-blendScore(0,parent,alt.features))-6*found.step[3])<1e-8);
});

test('candidate generation refuses holdout rows and stays reproducible',()=>{
 const parent=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const before=v2Hash();
 const train=[{
  id:'t',holdout:false,bucket:'early-energy',
  band:[bandRow('stay',10,3,0),bandRow('switch',4,3,1)]
 }];
 const holdout=[{
  id:'h',holdout:true,bucket:'ap',
  band:[bandRow('stay',2,4,0),bandRow('switch',1,4,1)]
 }];
 assert.throws(()=>proposeSensitive({parent,positions:[...train,...holdout]}),/保留局面/);
 const first=proposeSensitive({parent,positions:train,elites:[],salt:160000});
 const second=proposeSensitive({parent,positions:train,elites:[],salt:160000});
 assert.deepEqual(first.candidates.map(row=>row.id),second.candidates.map(row=>row.id));
 assert.equal(first.candidates.length,8);
 const sensitive=first.candidates.filter(row=>row.family==='sensitive');
 assert.equal(sensitive.length,4);
 assert.ok(sensitive.some(row=>chooseKey(train[0].band,row.model.policy)==='switch'));
 for(const candidate of sensitive)assert.equal(candidate.model.policy[4],parent.policy[4]);
 assert.equal(v2Hash(),before);
});

test('the pre-registered stage A rule fails a weak mutation and passes a wide one',()=>{
 const rows=coverage({'early-energy':8,ap:8,'line-move':8,'mid-entry':20,raid:8,'attack-defense':16,'late-pressure':16});
 const family=(rate,buckets,pairwise)=>({
  positions:rows.length,bandRate:rate,pairwise,bucketsWithDisagreement:buckets,illegal:0
 });
 const measure=(sensitive,gaussian)=>{
  const train=rows.map(row=>({...row}));
  train.illegal=0;
  train.byFamily={sensitive,gaussian,cross:sensitive};
  return train;
 };
 const holdout={
  positions:24,illegal:0,
  byFamily:{
   sensitive:family(0.12,3,0.04),
   gaussian:family(0.04,1,0.01),
   cross:family(0.04,1,0.01)
  }
 };
 const wide=measure(family(0.16,4,0.05),family(0.05,2,0.01));
 const passed=stageADecision(wide,holdout);
 const wrapped={rows:wide,illegal:0,positions:wide.length,byFamily:wide.byFamily};
 assert.equal(stageADecision(wrapped,holdout).passed,true);
 const failed=stageADecision(measure(family(0.05,1,0),family(0.05,1,0)),holdout);
 assert.equal(passed.passed,true);
 assert.equal(failed.passed,false);
 assert.equal(STAGE_A_GATE.minLift,1.5);
});

test('stage B stops when the new method loses more than eight points',()=>{
 const candidates=[
  {id:'s',family:'sensitive'},
  {id:'g',family:'gaussian'}
 ];
 const game=(id,win,first)=> ({
  candidateId:id,status:'finished',winner:win?0:1,specialistSeat:0,specialistIsFirst:first,
  anomalies:{}
 });
 const close=[
  game('s',true,true),game('s',true,false),game('s',false,true),game('s',false,false),
  game('g',true,true),game('g',true,false),game('g',false,true),game('g',false,false)
 ];
 assert.equal(stageBDecision(close,candidates).passed,true);
 const worse=[
  game('s',false,true),game('s',false,false),game('s',false,true),game('s',true,false),
  game('g',true,true),game('g',true,false),game('g',true,true),game('g',true,false)
 ];
 const stopped=stageBDecision(worse,candidates);
 assert.equal(stopped.passed,false);
 assert.match(stopped.reasons.join(' '),/8/);
});

test('an incomplete teacher search is not a label',()=>{
 const hardAction={type:'attack'};
 const hardTrace={candidates:[{action:hardAction,score:20},{action:{type:'next'},score:10}]};
 const yielded={action:{type:'next'},trace:{reason:'budget',rootCut:true,candidates:[]},error:null};
 const assessed=assessTeacher({sample:yielded,hardAction,hardTrace});
 assert.equal(assessed.complete,false);
 const deep={action:{type:'next'},trace:{reason:'search',rootCut:false,nodesBudget:192},error:null};
 const other={action:hardAction,trace:{reason:'search',rootCut:false,nodesBudget:192},error:null};
 const unstable=combineSamples([deep,other],hardAction,hardTrace);
 assert.equal(unstable.usable,false);
 assert.equal(unstable.confidence,'unstable');
 const excluded=assessTeacher({
  sample:{action:{type:'next'},trace:{reason:'search',rootCut:false},error:null},
  hardAction,hardTrace
 });
 assert.equal(excluded.relation,'excluded-by-cap');
 const options=teacherOptions(7);
 assert.equal(options.nodes,TEACHER_NODES);
 assert.equal(Object.hasOwn(options,'ms'),false);
 assert.equal(HARD_OPTIONS.nodes,48);
 assert.equal(HARD_OPTIONS.ms,undefined);
});

test('the miner records a visible position and the teacher ignores hidden cards',()=>{
 const parent=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const mined=minePositions({
  seeds:[160000],parent,maxSteps:40,maxBand:4,perBucket:4,teacherLimit:1,teacherNodes:16,minSeeds:1
 });
 assert.ok(mined.decisions>0);
 assert.equal(mined.mismatches,0);
 if(mined.positions.length){
  const row=mined.positions[0];
  for(const field of ['id','seed','step','turn','phase','legalCount','hardCandidates','bandCount']){
   assert.ok(row[field]!==undefined,field);
  }
  const text=JSON.stringify(row);
  assert.equal(text.includes('opponentHand'),false);
  assert.ok(row.band.every(item=>item.features.every(value=>typeof value==='number')));
 }
 const deck=getDeck('white-sword');
 const packs=[deck.pack,deck.pack];
 let state=newComparedMatch(packs,[deck.counts,deck.counts],160000,0,RULES);
 let found=null;
 for(let step=0;step<40&&state.status==='playing'&&!found;step++){
  const actor=state.pending?.player??state.active;
  const legal=legalUniversalActions(packs,state);
  if(actor===0&&legal.length>1&&!ORDER_KINDS.has(state.pending?.kind))found={state,legal,actor};
  else{
   const action=legal[0];
   state=dispatchUniversalAction(packs,state,action,{actor});
  }
 }
 assert.ok(found,'no visible decision');
 const observation=observeActor(packs,found.state,found.actor);
 const catalogs=catalogsOf(packs);
 const before=policyVector({observation,seat:found.actor,action:found.legal[0],legal:found.legal,catalogs});
 const teacher=consultTeacher(packs,found.state,160000,16);
 const hidden=found.state.players[1];
 const swap=list=>{
  if(!Array.isArray(list)||list.length<2)return false;
  const first=list[0];
  list[0]=list[1];
  list[1]=first;
  return true;
 };
 assert.ok(swap(hidden.hand)||swap(hidden.deck)||swap(hidden.life));
 const afterObservation=observeActor(packs,found.state,found.actor);
 const after=policyVector({observation:afterObservation,seat:found.actor,action:found.legal[0],legal:found.legal,catalogs});
 assert.deepEqual(after,before);
 assert.equal(afterObservation.visible.players[1].hand,null);
 const again=consultTeacher(packs,found.state,160000,16);
 assert.equal(JSON.stringify(again.action),JSON.stringify(teacher.action));
});

test('the v4-A.2 workflow stays manual',()=>{
 const source=readFileSync(new URL('../.github/workflows/white-sword-v4a2.yml',import.meta.url),'utf8');
 assert.equal(source.includes('\nschedule:'),false);
 assert.equal(source.includes('workflow_dispatch:'),true);
 const root=mkdtempSync(join(tmpdir(),'v4a2-'));
 assert.equal(root.length>0,true);
});
