import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {mulberry32} from '../training/white-sword-ai/v4a/lib/evolve.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {judgeSamples} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {benjaminiHochberg} from '../training/white-sword-ai/v4b3/lib/labels.mjs';
import {
 CONFIRM_PAIRS,fixedProbs,pairsForCandidates,runPipeline,scenarioPositions,selectCandidates
} from '../training/white-sword-ai/v4b4/lib/confirm.mjs';
import {
 binomialUpper,clopperPearson,conditionalMeanInterval,holm,signTest
} from '../training/white-sword-ai/v4b4/lib/exact.mjs';
import {
 assertPlanSeeds,decideConfirmation,freezeCandidates,jobSalt,learnable
} from '../training/white-sword-ai/v4b4/lib/round.mjs';

const FRAGILE=[-1,-1,-1,0,0,0,0,0];

test('three runner-up wins and five ties fail the exact sign test',()=>{
 const normal=judgeSamples(FRAGILE);
 const exact=signTest(FRAGILE);
 const interval=conditionalMeanInterval(FRAGILE);
 assert.equal(normal.usable,true);
 assert.ok(normal.high<0);
 assert.ok(Math.abs(exact.pOne-0.125)<1e-9);
 assert.ok(exact.pTwo>0.2);
 assert.ok(interval.low<0&&interval.high>0);
 assert.equal(binomialUpper(3,3,0.5),exact.pOne);
});

test('Clopper-Pearson bounds the zero-out-of-three rate',()=>{
 const upper=clopperPearson(0,3);
 assert.ok(Math.abs(upper.high-0.7076)<0.01);
 assert.equal(upper.low,0);
 const lower=clopperPearson(3,3);
 assert.ok(Math.abs(lower.low-0.2924)<0.01);
 assert.equal(lower.high,1);
});

test('Holm stops at the first failure and Benjamini-Hochberg can keep more',()=>{
 const values=[0.01,0.02,0.04,0.2];
 assert.deepEqual([...holm(values)],[0]);
 assert.deepEqual([...benjaminiHochberg(values)],[0,1]);
});

test('confirmation length is fixed before the confirmation draw',()=>{
 assert.equal(pairsForCandidates(1,'fixed'),CONFIRM_PAIRS);
 assert.equal(pairsForCandidates(4,'fixed'),CONFIRM_PAIRS);
 assert.equal(pairsForCandidates(1,'allocate'),264);
 assert.equal(pairsForCandidates(4,'allocate'),66);
 assert.equal(pairsForCandidates(0,'fixed'),0);
});

test('candidate order depends only on the screen and the box flag',()=>{
 const summaries=[{mean:-0.5},{mean:-0.1},{mean:-0.4},{mean:-0.8}];
 const learnable=[true,true,false,true];
 const chosen=selectCandidates(summaries,learnable,{floor:-0.25,cap:2});
 assert.deepEqual(chosen.map(row=>row.index),[3,0]);
 const positions=scenarioPositions(0.8,[{mu:-0.5,learnable:true}]);
 const first=runPipeline(mulberry32(5),mulberry32(8),positions);
 const second=runPipeline(mulberry32(5),mulberry32(80),positions);
 assert.deepEqual(first.chosen.map(row=>row.index),second.chosen.map(row=>row.index));
 assert.equal(first.each,pairsForCandidates(first.chosen.length,'fixed'));
});

function position(id){
 return {
  id,bucket:'raid',opponent:'white-sword',
  actionA:{features:[]},actionB:{features:[]}
 };
}
function paired(id,diffs,actor=0){
 const records=[];
 diffs.forEach((diff,attempt)=>{
  const winnerA=diff>0?actor:diff<0?1-actor:actor;
  const winnerB=diff<0?actor:diff>0?1-actor:actor;
  records.push({positionId:id,attempt,side:'A',finished:true,winner:winnerA});
  records.push({positionId:id,attempt,side:'B',finished:true,winner:winnerB});
 });
 return records;
}

test('a fixed tie cannot invent a mean past one minus the tie rate',()=>{
 const row=fixedProbs(-0.16,0.8);
 assert.ok(Math.abs(row.tie-0.8)<1e-12);
 assert.ok(Math.abs((row.plus-row.minus)+0.16)<1e-12);
 assert.throws(()=>fixedProbs(-0.25,0.8));
});

test('the frozen list skips an unlearnable screen hit and stays at 66',()=>{
 const positions=[position('skip'),position('second'),position('first'),position('weak')];
 const frozen=freezeCandidates(positions,[
  [-1,-1,-1,-1],[-1,-1,0,0],[-1,-1,-1,0],[0,0,0,0]
 ],[false,true,true,true]);
 assert.deepEqual(frozen.candidates.map(row=>row.id),['first','second']);
 assert.equal(frozen.each,66);
 assert.equal(frozen.mode,'fixed');
 const again=freezeCandidates(positions,[
  [-1,-1,-1,-1],[-1,-1,0,0],[-1,-1,-1,0],[0,0,0,0]
 ],[false,true,true,true]);
 assert.deepEqual(again.candidates,frozen.candidates);
});

test('three runner-up wins do not confirm, and a fresh 66-pair sweep does',()=>{
 const records=[
  ...paired('sure',Array(66).fill(-1)),
  ...paired('fragile',[-1,-1,-1,0,0,0,0,0])
 ];
 const rows=decideConfirmation([
  {id:'sure',index:0,screenMean:-1},
  {id:'fragile',index:1,screenMean:-0.375}
 ],records,()=>0);
 assert.equal(rows[0].confirmed,true);
 assert.equal(rows[1].confirmed,false);
 assert.ok(Math.abs(rows[1].pOne-0.125)<1e-9);
 assert.equal(rows[0].attempts,66);
 assert.equal(rows[1].attempts,8);
});

test('screen and confirmation seeds do not reuse earlier rollouts',()=>{
 const selected=JSON.parse(readFileSync('training/white-sword-ai/v4b2/selected.json','utf8'));
 const earlier=JSON.parse(readFileSync('training/white-sword-ai/v4b/selected.json','utf8'));
 const plan=assertPlanSeeds(selected.positions,earlier.positions);
 assert.equal(plan.screen,selected.positions.length*8);
 assert.equal(plan.confirm,selected.positions.length*66);
 const shared=selected.positions.filter(row=>row.seed===selected.positions[0].seed);
 assert.ok(shared.length>=1);
 const left=jobSalt(shared[0],210000,3);
 assert.equal((left.salt+3*997)>>>0,left.desired);
 if(shared.length>1)assert.notEqual(jobSalt(shared[0],210000,0).desired,jobSalt(shared[1],210000,0).desired);
 const parent=loadModel('training/white-sword-ai/weights/v2-capped.json').policy;
 const byId=new Map(selected.positions.map(row=>[row.id,row]));
 assert.equal(learnable(parent,byId.get('4b6338ce9e141a68')),true);
 assert.equal(learnable(parent,byId.get('0406f018a8676e5c')),false);
});
