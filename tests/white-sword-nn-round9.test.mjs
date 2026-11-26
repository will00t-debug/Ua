import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {LOOP_LIMIT} from '../training/white-sword-nn/constants.mjs';
import {legacyLoopKey,noteLegacy,noteProgress,openTracker,progressLoopKey} from '../training/white-sword-nn/loop.mjs';
import {
 ROUND9_BASELINE_HASH,ROUND9_CANDIDATE_HASH,ROUND9_CANDIDATE_UPDATES,ROUND9_CANDIDATE_VERSION,
 ROUND9_LOOPS,agreementClass,selectLosses
} from '../training/white-sword-nn/round9.mjs';

function player(){
 return {
  life:[],hand:[],deck:[],
  front:[null,null,null,null],
  energy:[null,null,null,null]
 };
}
function state(pending,extra={}){
 return {
  turn:12,phase:'attack',active:1,pending,effectQueue:[],
  players:[player(),player()],...extra
 };
}
function stops(note,states){
 const tracker=openTracker();
 return states.some(item=>note(tracker,item).stop);
}

test('a growing outside-removal selection is progress, and a repeated position still stops',()=>{
 const steps=[];
 for(let i=0;i<LOOP_LIMIT+1;i++){
  steps.push(state({
   kind:'effect-remove-outside',player:0,selected:Array.from({length:i},(_,index)=>'0-'+index),
   choices:['0-1','0-2'],count:20
  }));
 }
 assert.equal(stops(noteLegacy,steps),true);
 assert.equal(stops(noteProgress,steps),false);
 const frozen=state({kind:'effect-remove-outside',player:0,selected:['0-1'],choices:['0-1','0-2']});
 const same=Array.from({length:LOOP_LIMIT+1},()=>frozen);
 assert.equal(stops(noteProgress,same),true);
 const counted=Array.from({length:LOOP_LIMIT+1},(_,index)=>state({
  kind:'effect-remove-outside',player:0,selected:['0-1'],visits:index
 }));
 assert.equal(stops(noteProgress,counted),true);
 const stamped=Array.from({length:LOOP_LIMIT+1},(_,index)=>state(
  {kind:'effect-remove-outside',player:0,selected:['0-1']},
  {effectQueue:[{op:'sourceResolutionBoundary',sourceUid:'0-6',afterOrder:index,effectScope:index}]}
 ));
 assert.equal(stops(noteProgress,stamped),true);
 const advanced=Array.from({length:LOOP_LIMIT+1},(_,index)=>state(
  {kind:'effect-remove-outside',player:0,selected:['0-1']},
  {effectQueue:[{op:index?'continue':'sourceResolutionBoundary',sourceUid:'0-'+index}]}
 ));
 assert.equal(stops(noteProgress,advanced),false);
 assert.notEqual(legacyLoopKey(steps[0]),legacyLoopKey(state({kind:'other',player:0,selected:[]})));
 assert.notEqual(progressLoopKey(steps[0]),progressLoopKey(steps[1]));
});

test('agreement labels are not treated as errors by themselves',()=>{
 const same=(left,right)=>left===right;
 assert.equal(agreementClass('x','x','x',same),'all-same');
 assert.equal(agreementClass('x','x','v',same),'ab-same-v2-diff');
 assert.equal(agreementClass('v','b','v',same),'av2-same-b-diff');
 assert.equal(agreementClass('a','v','v',same),'bv2-same-a-diff');
 assert.equal(agreementClass('a','b','v',same),'all-diff');
});

test('the loss list is the earliest two stored losses in each seat cell',()=>{
 const round8=JSON.parse(readFileSync('docs/white-sword-ai/nn-round8.json','utf8'));
 const plan=JSON.parse(readFileSync('docs/white-sword-ai/nn-round8-plan.json','utf8'));
 const selected=selectLosses(plan.schedule,round8.games);
 assert.deepEqual(selected.map(cell=>cell.losses.map(row=>row.seed)),[
  [193501,193502],[193501,193502],[193500,193502],[193500,193501]
 ]);
 assert.equal(selected.flatMap(cell=>cell.losses).length,8);
 assert.deepEqual(ROUND9_LOOPS.map(row=>[row.seed,row.learnerSeat,row.first,row.steps]),[
  [193502,1,0,195],[193504,1,1,168]
 ]);
 const loops=JSON.parse(readFileSync('docs/white-sword-ai/nn-round9-loops.json','utf8'));
 assert.equal(loops.reports.length,2);
 for(const report of loops.reports){
  assert.equal(report.matched,true);
  assert.equal(report.verdict,'false-stop');
  assert.equal(report.diffs.every(row=>row.paths.length===1&&row.paths[0]==='$.pending.selected'),true);
 }
 const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
 assert.equal(hash('training/white-sword-nn/weights/round6/line-2/actor-after-96.json'),ROUND9_CANDIDATE_HASH);
 assert.equal(hash('training/white-sword-nn/weights/round2/a-frozen.json'),ROUND9_BASELINE_HASH);
 assert.equal(ROUND9_CANDIDATE_VERSION,'nn-ppo-actor-r6-l2');
 assert.equal(ROUND9_CANDIDATE_UPDATES,27546);
 const runner=readFileSync('dist/universal-v2/white-sword-ai/runner.mjs','utf8');
 assert.match(runner,/function positionKey/);
 assert.equal(runner.includes('pending.selected'),false);
});
