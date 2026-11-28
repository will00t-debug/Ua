import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLoss,imitationGradient} from '../training/white-sword-nn/learn.mjs';
import {clipGrad,createNet,createOptimizer} from '../training/white-sword-nn/net.mjs';
import {imitationPass} from '../training/white-sword-nn/learn.mjs';
import {
 COLLAPSE_RATE,FD_EPS,FIT_PASSES,RECORDED_TAIL,RECORDED_TRAIN_COUNTS,ROUND12_EPOCHS,
 ROUND12_FROZEN_FILES,ROUND12_SHUFFLE_SEED,ROUND12_STRATIFIED_SEED,
 assertWritable,attackGap,classifyAttack,compareLedger,conflictingGroups,
 distinguishable,finiteDifference,fitPassed,hashSamples,judgeRound12,makeRng,
 permutationOnce,probeIndexes,selectFitSamples,shuffledEpoch,stratifiedKinds,
 stratifiedOrder,tailDeltas
} from '../training/white-sword-nn/round12.mjs';

function sample(id,kind,chosen,rows,actions){
 const fallback=rows.map((_,index)=>({
  type:index===chosen&&kind==='attack'?'attack':'next',uid:'0-'+index
 }));
 return {id,kind,chosen,rows,actions:actions||fallback,identities:[]};
}

test('the recorded round-11 counts end on 715 other updates and 2079 after the last attack',()=>{
 const course=stratifiedKinds(RECORDED_TRAIN_COUNTS);
 assert.equal(course.length,RECORDED_TAIL.samples);
 assert.equal(course.lastAttack,RECORDED_TAIL.lastAttack);
 assert.equal(course.afterAttack,RECORDED_TAIL.afterAttack);
 assert.equal(course.tail,RECORDED_TAIL.tail);
 assert.deepEqual(course.tailCounts,{other:715});
 assert.equal(course.sequence.slice(-715).every(kind=>kind==='other'),true);
 assert.equal(course.sequence[5082],'attack');
});

test('stratified and shuffled epochs are permutations with different seeds',()=>{
 const samples=['play','attack','block','trigger','effect','other'].flatMap(kind=>
  Array.from({length:kind==='other'?5:3},(_,index)=>({id:kind+index,kind,rows:[[index]],chosen:0,actions:[{type:'next'},{type:'play'}]})));
 const left=stratifiedOrder(samples,makeRng(ROUND12_STRATIFIED_SEED));
 const right=shuffledEpoch(samples,makeRng(ROUND12_SHUFFLE_SEED));
 assert.equal(permutationOnce(samples,left),true);
 assert.equal(permutationOnce(samples,right),true);
 assert.deepEqual(left.map(row=>row.kind),stratifiedKinds({play:3,attack:3,block:3,trigger:3,effect:3,other:5}).sequence);
 assert.notDeepEqual(left.map(row=>row.id),right.map(row=>row.id));
 const again=stratifiedOrder(samples,makeRng(ROUND12_STRATIFIED_SEED));
 assert.deepEqual(again.map(row=>row.id),left.map(row=>row.id));
});

test('label smoothing matches the explicit target and equal scores ignore it',()=>{
 const parts=inspectLoss([0,0],0,0.05);
 assert.equal(parts.clamped,false);
 assert.equal(parts.floored,false);
 assert.ok(Math.abs(parts.loss-Math.log(2))<1e-12);
 const width=2;
 const share=0.05/width;
 const target=[1-0.05+share,share];
 const max=Math.max(0,-1);
 const probs=[0,-1].map(score=>Math.exp(score-max));
 const sum=probs[0]+probs[1];
 probs[0]/=sum;
 probs[1]/=sum;
 const expected=-(target[0]*Math.log(probs[0])+target[1]*Math.log(probs[1]));
 const uneven=inspectLoss([0,-1],0,0.05);
 assert.ok(Math.abs(uneven.loss-expected)<1e-12);
 assert.ok(Math.abs(uneven.signals[0]-(probs[0]-target[0]))<1e-12);
});

test('finite differences match backprop away from the clamp, and the clamp signal does not',()=>{
 const net=createNet(1,{sizes:[3,4,2,1],stateDim:2,version:'toy'});
 net.theta.fill(0.02);
 const row={
  rows:[Float64Array.from([1,1,0]),Float64Array.from([1,0,1])],
  actions:[{type:'attack',uid:'0-1'},{type:'next'}],chosen:0
 };
 const checked=finiteDifference(net,row,probeIndexes(net),{eps:FD_EPS,smooth:0.05});
 assert.equal(checked.pass,true,JSON.stringify({cosine:checked.cosine,median:checked.medianRel,fraction:checked.fraction}));
 const peaked=createNet(2,{sizes:[2,1],stateDim:1,version:'toy'});
 peaked.theta.fill(0);
 peaked.theta[1]=-30;
 const wide={
  rows:[Float64Array.from([0,0]),Float64Array.from([0,1])],
  actions:[{type:'attack',uid:'0-1'},{type:'next'}],chosen:0
 };
 const analytical=imitationGradient(peaked,wide,{smooth:0.05});
 const saved=peaked.theta[1];
 const eps=1e-5;
 peaked.theta[1]=saved+eps;
 const up=inspectLoss(wide.rows.map(item=>item[1]*peaked.theta[1]),0,0.05);
 peaked.theta[1]=saved-eps;
 const down=inspectLoss(wide.rows.map(item=>item[1]*peaked.theta[1]),0,0.05);
 peaked.theta[1]=saved;
 const numerical=(up.loss-down.loss)/(2*eps);
 assert.equal(analytical.scores[0]-analytical.scores[1]>20,true);
 assert.ok(Math.abs(analytical.grad[1]-numerical)>1e-3);
 peaked.theta[1]=-1;
 const mild=imitationGradient(peaked,wide,{smooth:0.05});
 peaked.theta[1]=-1+eps;
 const upMild=inspectLoss([0,peaked.theta[1]],0,0.05);
 peaked.theta[1]=-1-eps;
 const downMild=inspectLoss([0,peaked.theta[1]],0,0.05);
 peaked.theta[1]=-1;
 assert.ok(Math.abs(mild.grad[1]-(upMild.loss-downMild.loss)/(2*eps))<1e-6);
});

test('clipping scales the global norm to the limit and leaves a small gradient',()=>{
 const big=Float64Array.from([3,4]);
 assert.ok(Math.abs(clipGrad(big,1)-5)<1e-12);
 assert.ok(Math.abs(Math.hypot(big[0],big[1])-1)<1e-12);
 const small=Float64Array.from([0.3,0.4]);
 clipGrad(small,1);
 assert.equal(small[0],0.3);
 const net=createNet(5,{sizes:[2,1],stateDim:1,version:'toy'});
 net.theta.fill(0);
 net.theta[1]=3;
 const sample={
  rows:[Float64Array.from([0,0]),Float64Array.from([0,4])],
  actions:[{type:'next'},{type:'attack',uid:'0-1'}],chosen:0
 };
 const before=imitationGradient(net,sample,{smooth:0.05}).grad;
 const norm=Math.hypot(...before);
 assert.ok(norm>1);
 const opt=createOptimizer(0.001,0);
 imitationPass(net,opt,[sample],{smooth:0.05});
 assert.equal(net.updates,1);
});

test('attack classes keep a strict stop apart from a tie and another character',()=>{
 const actions=[{type:'attack',uid:'0-1'},{type:'attack',uid:'0-2'},{type:'next'}];
 const rows=[[1],[2],[3]];
 const base={kind:'attack',chosen:0,actions,rows,identities:[]};
 assert.equal(classifyAttack(base,[2,0,0],0),'exact');
 assert.equal(classifyAttack(base,[1,1,0],1),'tie');
 assert.equal(classifyAttack(base,[0,0,1],2),'stop');
 assert.equal(classifyAttack(base,[0,2,0],1),'other-character');
 assert.equal(classifyAttack({...base,actions:[{type:'attack',uid:'0-1',targetUid:'1-1'},{type:'attack',uid:'0-1',targetUid:'1-2'},{type:'next'}]},[0,2,0],1),'other-target');
 assert.equal(classifyAttack(base,[0,0,0],2),'tie');
 assert.equal(attackGap(base,[1.5,0,0.25]),1.25);
});

test('identical features with different teacher actions are conflicts, not the fit set',()=>{
 const rows=[Float64Array.from([1,0]),Float64Array.from([0,1])];
 const actions=[{type:'attack',uid:'0-1'},{type:'next'}];
 const left=sample('a','attack',0,rows,actions);
 const right=sample('b','attack',1,rows,actions);
 right.kind='attack';
 const conflicts=conflictingGroups([left,right]);
 assert.equal(conflicts.length,1);
 const unique=sample('c','play',0,[Float64Array.from([2,0]),Float64Array.from([0,2])],[{type:'play',uid:'0-3'},{type:'next'}]);
 assert.equal(distinguishable(unique),true);
 const fit=selectFitSamples([left,right,unique],['a','b','c']);
 assert.deepEqual(fit.map(row=>row.id),['c']);
 assert.equal(fitPassed(1,0.5,0,1,fit.length),true);
 assert.equal(fitPassed(1,1.1,0,1,fit.length),false);
 assert.equal(fitPassed(1,0.5,1,1,fit.length),false);
});

test('the ledger comparison is exact and frozen weights stay read-only',()=>{
 const recorded=[{seed:1,role:'train',source:'replay-existing',first:0,status:'finished',winner:1,steps:4,samples:2}];
 assert.equal(compareLedger(recorded,recorded).matched,true);
 assert.equal(compareLedger([{...recorded[0],samples:3}],recorded).matched,false);
 assert.throws(()=>assertWritable(ROUND12_FROZEN_FILES[0]),/frozen/);
 const samples=[sample('a','play',0,[Float64Array.from([1]),Float64Array.from([2])])];
 assert.equal(hashSamples(samples),hashSamples(samples.map(row=>({...row}))));
 assert.notEqual(hashSamples(samples),hashSamples([{...samples[0],chosen:1}]));
});

test('the judgement does not treat a shared failure as a sampling win',()=>{
 const curve=[];
 for(let epoch=0;epoch<ROUND12_EPOCHS;epoch++){
  curve.push({point:'before-tail',epoch,kinds:Object.fromEntries(['play','attack','block','trigger','effect','other'].map(kind=>[kind,{rate:0.5}]))});
  curve.push({point:'epoch-end',epoch,kinds:Object.fromEntries(['play','attack','block','trigger','effect','other'].map(kind=>[kind,{rate:kind==='play'?0.4:0.5}]))});
 }
 const summary={
  finiteDifference:{pass:true},labelsOk:true,divergence:{greedy:0},
  truncation:{initInactive:true,endpointInactive:true},
  fit:{count:4,passed:true,lossBefore:1,lossAfter:0.2,exactBefore:0,exactAfter:4},
  tailDelta:tailDeltas(curve),ledgerMatched:true,initLoss:1,
  stratified:{fullLoss:1.2,trainAttackRate:0},
  shuffle:{fullLoss:1.3,trainAttackRate:0}
 };
 const failed=judgeRound12(summary);
 assert.match(failed.q1,/一致/);
 assert.match(failed.q3,/play/);
 assert.match(failed.q4,/沒有/);
 assert.match(failed.q5,/停止追加/);
 assert.ok(summary.shuffle.trainAttackRate<COLLAPSE_RATE);
 const better=judgeRound12({
  ...summary,
  shuffle:{fullLoss:0.8,trainAttackRate:0.4},
  stratified:{fullLoss:1.2,trainAttackRate:0.02}
 });
 assert.match(better.q4,/可以改善/);
 assert.match(better.q5,/有對照支持/);
 assert.match(judgeRound12({...summary,ledgerMatched:false}).q5,/無法確認/);
});
