#!/usr/bin/env node
// Diagnose the round-11 trainer and sample order. One shared snapshot, two orders.
// The plan file is written before the finite-difference check and before either update.
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {deserialize,serialize} from 'node:v8';
import {MEMORY_WORKER_RSS,V2_FILE_HASH,WEIGHT_DECAY,WORKER_CAP} from '../training/white-sword-nn/constants.mjs';
import {INPUT_DIM,STATE_DIM} from '../training/white-sword-nn/encode.mjs';
import {imitationLoss,imitationPass,inspectLoss} from '../training/white-sword-nn/learn.mjs';
import {
 cloneNet,createOptimizer,forwardTrain,greedyIndex,loadNet,netDistance,saveNet,scoreActions
} from '../training/white-sword-nn/net.mjs';
import {loadOfficialV2,playMatch,trainable} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {
 ROUND11_A_HASH,ROUND11_B_HASH,ROUND11_PLAN_FILE,ROUND11_SPLIT_FILE,
 assertTrainPool,blockCoverage,corpusRoles,decisionKind,distribution,isolateSamples,
 scheduleCorpus,splitFeatures
} from '../training/white-sword-nn/round11.mjs';
import {
 FIT_PASSES,RECORDED_TAIL,RECORDED_TRAIN_COUNTS,ROUND12_A_FILE,ROUND12_B_FILE,
 ROUND12_EPOCHS,ROUND12_LR,ROUND12_ORDER_FILE,ROUND12_PLAN_FILE,ROUND12_R11_ENDPOINT_FILE,
 ROUND12_REPORT_FILE,ROUND12_RESULT_FILE,ROUND12_SHUFFLE_FILE,ROUND12_SHUFFLE_SEED,
 ROUND12_SMOOTH,ROUND12_STRATIFIED_FILE,ROUND12_STRATIFIED_SEED,ROUND12_V2_FILE,
 ROUND12_VERSION_SHUFFLE,ROUND12_VERSION_STRATIFIED,TYPE_ORDER,
 addAttack,assertWritable,attackGap,classifyAttack,compareLedger,conflictingGroups,
 courseStats,distinguishable,emptyAttackCounts,finiteDifference,fitPassed,hashSamples,
 judgeRound12,labelAudit,makeRng,permutationOnce,probeIndexes,renderRound12,
 sameCounts,sameMembers,selectFitSamples,shuffledEpoch,stratifiedKinds,stratifiedOrder,
 tailDeltas,truncationOf
} from '../training/white-sword-nn/round12.mjs';

const CACHE='/tmp/nn-round12-corpus.bin';

function sha256(file){
 return createHash('sha256').update(readFileSync(file)).digest('hex');
}
function taipei(date){
 return new Intl.DateTimeFormat('zh-TW',{
  timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).format(date)+'（台北時間）';
}
function seat(kind){
 return {deckId:'white-sword',kind,explore:0};
}
function playJob(item){
 return playMatch({...item.spec,nets:[null,null],progress:false});
}
async function playMany(items,workers){
 if(items.length<=1||workers<=1)return items.map(playJob);
 try{return await runPool(items,workers);}
 catch(error){
  console.log('parallel games failed, continuing in this process:',error.message);
  return items.map(playJob);
 }
}
function byId(left,right){
 return left.id<right.id?-1:left.id>right.id?1:0;
}
function histogram(kinds){
 const counts={};
 for(const kind of kinds)counts[kind]=(counts[kind]||0)+1;
 return counts;
}
function materialize(game,scheduled){
 return (game.imitate||[]).map(sample=>{
  const row={...sample,role:scheduled.role,kind:decisionKind(sample.actions?.[sample.chosen])};
  row.id=[row.source,row.seed,row.learnerSeat,row.first,row.step].join(':');
  return row;
 });
}
function evaluate(net,samples){
 const kinds={};
 for(const kind of TYPE_ORDER)kinds[kind]={used:0,exact:0,loss:0,rate:null};
 const attacks=emptyAttackCounts();
 let loss=0,exact=0,used=0;
 for(const sample of samples){
  const scores=sample.rows.map(row=>forwardTrain(net,row).q);
  const parts=inspectLoss(scores,sample.chosen,ROUND12_SMOOTH);
  const picked=greedyIndex(scores,sample.actions);
  const bucket=kinds[sample.kind];
  if(!bucket)throw Error('Unexpected kind '+sample.kind);
  bucket.used++;
  bucket.loss+=parts.loss;
  if(picked===sample.chosen){
   bucket.exact++;
   exact++;
  }
  loss+=parts.loss;
  used++;
  if(sample.kind==='attack')addAttack(attacks,classifyAttack(sample,scores,picked),attackGap(sample,scores));
 }
 for(const kind of TYPE_ORDER){
  const bucket=kinds[kind];
  bucket.rate=bucket.used?bucket.exact/bucket.used:null;
  bucket.loss=bucket.used?bucket.loss/bucket.used:null;
 }
 return {loss:used?loss/used:null,exactRate:used?exact/used:null,kinds,attacks};
}
function scanTruncation(net,samples){
 let maxGap=0,minProb=1,over=0,under=0;
 for(const sample of samples){
  const row=truncationOf(sample.rows.map(item=>forwardTrain(net,item).q),sample.chosen);
  if(row.gap>maxGap)maxGap=row.gap;
  if(row.minProb<minProb)minProb=row.minProb;
  if(row.clamped)over++;
  if(row.floored)under++;
 }
 return {used:samples.length,maxGap,minProb,over,under,inactive:over===0&&under===0};
}
function divergence(net,samples){
 let greedy=0,maxAbs=0;
 for(const sample of samples){
  const inference=scoreActions(net,sample.parts.state,sample.parts.actions);
  const trained=Float64Array.from(sample.rows,row=>forwardTrain(net,row).q);
  if(greedyIndex(inference,sample.actions)!==greedyIndex(trained,sample.actions))greedy++;
  for(let index=0;index<inference.length;index++)
   maxAbs=Math.max(maxAbs,Math.abs(inference[index]-trained[index]));
 }
 return {used:samples.length,greedy,maxAbs};
}
function holdoutView(evaluated){
 const attacks=evaluated.attacks;
 return {
  exact:evaluated.exactRate,
  attack:attacks.n?attacks.exact/attacks.n:null,
  stop:attacks.stop,otherCharacter:attacks.otherCharacter,attacks
 };
}
function blockSame(found,recorded){
 if(!recorded)return false;
 return found.n===recorded.n&&found.teacherPass===recorded.teacherPass&&
  found.teacherBlock===recorded.teacherBlock&&found.multi===recorded.multi&&
  sameMembers(found.lives,recorded.lives)&&sameMembers(found.damages,recorded.damages)&&
  sameMembers(found.impacts,recorded.impacts)&&sameMembers(found.bps,recorded.bps)&&
  sameMembers(found.teacherUids,recorded.teacherUids)&&sameMembers(found.seeds,recorded.seeds);
}
function trainGroup(base,train,holdoutSeeds,reserveSeeds,tailLength,predicted,seed,orderFn,version){
 const net=cloneNet(base);
 net.version=version;
 const opt=createOptimizer(ROUND12_LR);
 const rng=makeRng(seed);
 const curve=[];
 const orders=[];
 const record=(point,epoch,recent)=>{
  const evaluated=evaluate(net,train);
  curve.push({
   point,epoch,updates:net.updates,recent,loss:evaluated.loss,
   kinds:evaluated.kinds,attacks:evaluated.attacks
  });
  console.log(version,point,epoch,evaluated.loss,evaluated.attacks.exact+'/'+evaluated.attacks.n,evaluated.attacks.stop);
 };
 record('init',-1,{});
 for(let epoch=0;epoch<ROUND12_EPOCHS;epoch++){
  assertTrainPool(train,holdoutSeeds,reserveSeeds);
  const ordered=orderFn(train,rng);
  if(!permutationOnce(train,ordered))throw Error(version+' epoch '+epoch+' is not a permutation');
  const kinds=ordered.map(sample=>sample.kind);
  const course=courseStats(kinds);
  if(orderFn===stratifiedOrder){
   if(kinds.some((kind,index)=>kind!==predicted.sequence[index]))
    throw Error('Stratified kind sequence drifted at epoch '+epoch);
  }
  orders.push({
   epoch,lastAttack:course.lastAttack,afterAttack:course.afterAttack,tail:course.tail,
   tailCounts:course.tailCounts,
   sequence:epoch===0?kinds:undefined,
   sequenceHash:createHash('sha256').update(kinds.join('\n')).digest('hex')
  });
  const cut=ordered.length-tailLength;
  if(cut<=0)throw Error('Tail is the whole epoch');
  imitationPass(net,opt,ordered.slice(0,cut),{smooth:ROUND12_SMOOTH});
  record('before-tail',epoch,histogram(kinds.slice(Math.max(0,cut-64),cut)));
  imitationPass(net,opt,ordered.slice(cut),{smooth:ROUND12_SMOOTH});
  record('epoch-end',epoch,histogram(kinds.slice(-64)));
 }
 const fullLoss=imitationLoss(net,train,{smooth:ROUND12_SMOOTH}).loss;
 const last=curve[curve.length-1].loss;
 if(Math.abs(fullLoss-last)>1e-9)throw Error(version+' endpoint loss does not match the full pass');
 return {net,curve,orders,fullLoss,trainAttackRate:curve[curve.length-1].attacks.n?
  curve[curve.length-1].attacks.exact/curve[curve.length-1].attacks.n:null};
}
async function rebuild(plan,scheduled){
 if(process.env.ROUND12_LOAD==='1'&&existsSync(CACHE)){
  console.log('loading cached corpus');
  return deserialize(readFileSync(CACHE));
 }
 const rss=memoryUsage().rss;
 const workers=rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
 console.log('replaying',scheduled.length,'games with',workers,'workers');
 const games=await playMany(scheduled.map(game=>({
  spec:{
   seed:game.seed,first:game.first,mode:'imitate',source:game.source,captureContext:true,
   teacherSeats:[0,1],progress:false,seats:[seat('v2'),seat('v2')]
  },
  seatNets:[null,null]
 })),workers);
 const bySeed=new Map(scheduled.map(game=>[game.seed,game]));
 const buckets={train:[],holdout:[],reserve:[]};
 const isolated=[];
 const failed=[];
 const ledger=[];
 const ids=new Set();
 for(const game of games){
  const meta=bySeed.get(game.seed);
  if(!meta)throw Error('Unexpected seed '+game.seed);
  let kept=[];
  if(!trainable(game)){
   failed.push({seed:game.seed,role:meta.role,status:game.status,endReason:game.endReason,steps:game.steps});
   isolated.push({seed:game.seed,failures:['game was not trainable']});
  }else{
   const rows=materialize(game,meta);
   for(const row of rows){
    if(row.rows[0].length!==INPUT_DIM)throw Error('Features drifted at '+row.id);
    row.parts=splitFeatures(row.rows,STATE_DIM);
    if(ids.has(row.id))throw Error('Duplicate decision '+row.id);
    ids.add(row.id);
   }
   const split=isolateSamples(rows);
   kept=split.kept;
   isolated.push(...split.isolated);
   buckets[meta.role==='round-reserve'?'reserve':meta.role].push(...kept);
  }
  ledger.push({
   seed:game.seed,role:meta.role,source:meta.source,first:game.first,
   status:game.status,winner:game.winner,steps:game.steps,samples:kept.length
  });
  game.imitate=null;
 }
 try{writeFileSync(CACHE,serialize({buckets,isolated,failed,ledger}));}
 catch(error){console.log('cache skipped',error.message);}
 return {buckets,isolated,failed,ledger};
}
async function main(){
 const started=performance.now();
 const before={a:sha256(ROUND12_A_FILE),b:sha256(ROUND12_B_FILE),v2:sha256(ROUND12_V2_FILE),r11:sha256(ROUND12_R11_ENDPOINT_FILE)};
 if(before.a!==ROUND11_A_HASH)throw Error('Frozen A hash drifted');
 if(before.b!==ROUND11_B_HASH)throw Error('Frozen B hash drifted');
 if(before.v2!==V2_FILE_HASH)throw Error('Official v2 hash drifted');
 const savedPlan=JSON.parse(readFileSync(ROUND11_PLAN_FILE,'utf8'));
 const savedSplit=JSON.parse(readFileSync(ROUND11_SPLIT_FILE,'utf8'));
 const plan={
  extraTrain:savedPlan.extraTrain,extraHoldout:savedPlan.extraHoldout,
  extraSeeds:savedPlan.extraSeeds,trainSource:savedPlan.trainSource
 };
 const scheduled=scheduleCorpus(plan);
 const savedSchedule=savedPlan.schedule.map(game=>[game.seed,game.first,game.source,game.role].join(':'));
 const builtSchedule=scheduled.map(game=>[game.seed,game.first,game.source,game.role].join(':'));
 if(savedSchedule.join('|')!==builtSchedule.join('|'))throw Error('Round 11 schedule was not reconstructed');
 if(savedPlan.epochs!==ROUND12_EPOCHS||savedPlan.lr!==ROUND12_LR||savedPlan.smooth!==ROUND12_SMOOTH)
  throw Error('Round 11 locked hyperparameters differ from this comparison');
 loadOfficialV2();
 const corpus=await rebuild(plan,scheduled);
 const roles=corpusRoles(plan);
 const ledger=compareLedger(corpus.ledger,savedSplit.games);
 const distMatched=sameCounts(distribution(corpus.buckets.train),savedSplit.trainDist)&&
  sameCounts(distribution(corpus.buckets.holdout),savedSplit.holdoutDist)&&
  sameCounts(distribution(corpus.buckets.reserve),savedSplit.reserveDist)&&
  sameCounts(distribution(corpus.buckets.train),RECORDED_TRAIN_COUNTS);
 const blockMatched=blockSame(blockCoverage(corpus.buckets.train),savedSplit.trainBlock)&&
  blockSame(blockCoverage(corpus.buckets.holdout),savedSplit.holdoutBlock);
 const hashes={
  train:hashSamples(corpus.buckets.train),
  holdout:hashSamples(corpus.buckets.holdout),
  reserve:hashSamples(corpus.buckets.reserve)
 };
 corpus.buckets.reserve=[];
 console.log('ledger',ledger.matched,'dist',distMatched,'block',blockMatched,'isolated',corpus.isolated.length,'failed',corpus.failed.length);
 if(ledger.mismatches.length)console.log(ledger.mismatches.slice(0,12).join('\n'));
 const train=corpus.buckets.train;
 const holdout=corpus.buckets.holdout;
 const predicted=stratifiedKinds(distribution(train));
 if(distMatched&&(predicted.tail!==RECORDED_TAIL.tail||predicted.afterAttack!==RECORDED_TAIL.afterAttack||predicted.lastAttack!==RECORDED_TAIL.lastAttack))
  throw Error('Tail arithmetic drifted from the recorded counts');
 const modelA=loadNet(ROUND12_A_FILE);
 const endpoint11=loadNet(ROUND12_R11_ENDPOINT_FILE);
 const labels={train:labelAudit(train),holdout:labelAudit(holdout),holdoutAttack:labelAudit(holdout.filter(sample=>sample.kind==='attack'))};
 const wrong=new Set();
 for(const sample of train){
  const scores=sample.rows.map(row=>forwardTrain(modelA,row).q);
  if(greedyIndex(scores,sample.actions)!==sample.chosen)wrong.add(sample.id);
 }
 const fitSamples=selectFitSamples(train,[...wrong]);
 const fdSamples=[
  train.filter(sample=>sample.kind==='attack').sort(byId)[0],
  train.filter(sample=>sample.kind==='play').sort(byId)[0]
 ];
 if(fdSamples.some(sample=>!sample))throw Error('Training data has no attack or play sample');
 const planFile={
  createdAt:new Date().toISOString(),createdAtText:taipei(new Date()),
  writtenBeforeUpdates:true,ledgerMatched:ledger.matched,distMatched,blockMatched,
  mismatches:ledger.mismatches.slice(0,30),isolated:corpus.isolated.length,failed:corpus.failed.length,
  hashes,counts:{
   train:train.length,holdout:holdout.length,reserve:corpus.buckets.reserve.length,
   trainDist:distribution(train)
  },
  tail:{tail:predicted.tail,afterAttack:predicted.afterAttack,lastAttack:predicted.lastAttack},
  groups:[
   {name:'stratified',seed:ROUND12_STRATIFIED_SEED,order:'stratifiedEpoch'},
   {name:'shuffle',seed:ROUND12_SHUFFLE_SEED,order:'global-shuffle'}
  ],
  lr:ROUND12_LR,smooth:ROUND12_SMOOTH,epochs:ROUND12_EPOCHS,decay:WEIGHT_DECAY,
  fit:{passes:FIT_PASSES,ids:fitSamples.map(sample=>sample.id)},
  finiteDifference:{ids:fdSamples.map(sample=>sample.id),eps:1e-5,indexes:'every 200th parameter and the whole last layer'},
  diagnostic:'all training samples',holdout:'endpoint comparison only',
  stopRule:'If finite differences fail, or frozen A already uses the exp or log guard, stop before either 12-epoch run.'
 };
 writeFileSync(ROUND12_PLAN_FILE,JSON.stringify(planFile,null,2));
 console.log('plan locked',predicted.tail,predicted.afterAttack,fitSamples.map(sample=>sample.id).join(','));
 const checked=train.concat(holdout);
 const truncation={
  init:scanTruncation(modelA,checked),
  endpoint:scanTruncation(endpoint11,checked)
 };
 console.log('truncation',truncation.init.inactive,truncation.init.maxGap,truncation.endpoint.inactive,truncation.endpoint.maxGap);
 if(!truncation.init.inactive)throw Error('Frozen A already uses the loss guard; fix the learner before the order trial');
 const indexes=probeIndexes(modelA);
 const finite=[];
 for(const sample of fdSamples){
  const clone=cloneNet(modelA);
  const result=finiteDifference(clone,sample,indexes);
  finite.push({id:sample.id,kind:sample.kind,...result});
  console.log('finite',sample.kind,result.pass,result.cosine,result.medianRel,result.fraction);
 }
 const finitePass=finite.every(row=>row.pass);
 if(!finitePass)throw Error('Finite difference failed: '+JSON.stringify(finite.map(row=>({id:row.id,cosine:row.cosine,medianRel:row.medianRel,fraction:row.fraction}))));
 const fitNet=cloneNet(modelA);
 const fitOpt=createOptimizer(ROUND12_LR);
 const fitBefore=evaluate(modelA,fitSamples);
 for(let pass=0;pass<FIT_PASSES;pass++)imitationPass(fitNet,fitOpt,fitSamples,{smooth:ROUND12_SMOOTH});
 const fitAfter=evaluate(fitNet,fitSamples);
 const fit={
  count:fitSamples.length,ids:fitSamples.map(sample=>sample.id),
  conflicts:conflictingGroups(train).length,
  internal:train.filter(sample=>!distinguishable(sample)).length,
  lossBefore:fitBefore.loss,lossAfter:fitAfter.loss,
  exactBefore:Math.round((fitBefore.exactRate||0)*fitSamples.length),
  exactAfter:Math.round((fitAfter.exactRate||0)*fitSamples.length)
 };
 fit.passed=fitPassed(fit.lossBefore,fit.lossAfter,fit.exactBefore,fit.exactAfter,fit.count);
 console.log('fit',fit.passed,fit.lossBefore,fit.lossAfter,fit.exactBefore,fit.exactAfter);
 const initEval=evaluate(modelA,train);
 const stratified=trainGroup(
  modelA,train,roles.holdout,roles.reserve,predicted.tail,predicted,
  ROUND12_STRATIFIED_SEED,stratifiedOrder,ROUND12_VERSION_STRATIFIED
 );
 const shuffled=trainGroup(
  modelA,train,roles.holdout,roles.reserve,predicted.tail,predicted,
  ROUND12_SHUFFLE_SEED,shuffledEpoch,ROUND12_VERSION_SHUFFLE
 );
 assertWritable(ROUND12_STRATIFIED_FILE);
 assertWritable(ROUND12_SHUFFLE_FILE);
 saveNet(stratified.net,ROUND12_STRATIFIED_FILE);
 saveNet(shuffled.net,ROUND12_SHUFFLE_FILE);
 const round11Hash=sha256(ROUND12_R11_ENDPOINT_FILE);
 const stratifiedHash=sha256(ROUND12_STRATIFIED_FILE);
 const attacks=holdout.filter(sample=>sample.kind==='attack');
 const round11AttackEval=evaluate(endpoint11,attacks);
 const holdoutScores={
  A:holdoutView(evaluate(modelA,holdout)),
  r11:holdoutView(evaluate(endpoint11,holdout)),
  stratified:holdoutView(evaluate(stratified.net,holdout)),
  shuffle:holdoutView(evaluate(shuffled.net,holdout))
 };
 const summary={
  ledgerMatched:ledger.matched,distMatched,blockMatched,labelsOk:labels.train.ok&&labels.holdout.ok,
  finiteDifference:{pass:finitePass,rows:finite.map(row=>({id:row.id,kind:row.kind,cosine:row.cosine,medianRel:row.medianRel,maxRel:row.maxRel,fraction:row.fraction,checked:row.checked}))},
  divergence:{
   init:divergence(modelA,attacks),
   endpoint:divergence(endpoint11,attacks),
   stratified:divergence(stratified.net,attacks),
   shuffle:divergence(shuffled.net,attacks)
  },
  truncation:{
   init:truncation.init,endpoint:truncation.endpoint,
   initInactive:truncation.init.inactive,endpointInactive:truncation.endpoint.inactive
  },
  fit,tailDelta:tailDeltas(stratified.curve),initLoss:initEval.loss,
  stratified:{fullLoss:stratified.fullLoss,trainAttackRate:stratified.trainAttackRate,curve:stratified.curve},
  shuffle:{fullLoss:shuffled.fullLoss,trainAttackRate:shuffled.trainAttackRate,curve:shuffled.curve}
 };
 const answers=judgeRound12(summary);
 const after={a:sha256(ROUND12_A_FILE),b:sha256(ROUND12_B_FILE),v2:sha256(ROUND12_V2_FILE),r11:sha256(ROUND12_R11_ENDPOINT_FILE)};
 if(after.a!==before.a||after.b!==before.b||after.v2!==before.v2||after.r11!==before.r11)
  throw Error('A frozen file changed');
 const result={
  createdAt:new Date().toISOString(),createdAtText:taipei(new Date()),
  verdict:answers.verdict,answers,ledgerMatched:ledger.matched,distMatched,blockMatched,
  hashes,distanceToRound11:netDistance(stratified.net,endpoint11),
  reproducedRound11:stratifiedHash===round11Hash,
  tail:planFile.tail,round11Attacks:round11AttackEval.attacks,labels,fit,
  truncation:summary.truncation,finiteDifference:summary.finiteDifference,
  divergence:summary.divergence,initLoss:initEval.loss,
  stratified:{fullLoss:stratified.fullLoss,trainAttackRate:stratified.trainAttackRate,curve:stratified.curve,updates:stratified.net.updates},
  shuffle:{fullLoss:shuffled.fullLoss,trainAttackRate:shuffled.trainAttackRate,curve:shuffled.curve,updates:shuffled.net.updates},
  holdout:holdoutScores,elapsedSec:Math.round((performance.now()-started)/1000)
 };
 writeFileSync(ROUND12_ORDER_FILE,JSON.stringify({
  createdAt:result.createdAt,tail:planFile.tail,predictedHash:createHash('sha256').update(predicted.sequence.join('\n')).digest('hex'),
  stratified:stratified.orders,shuffle:shuffled.orders
 },null,2));
 writeFileSync(ROUND12_RESULT_FILE,JSON.stringify(result,null,2));
 writeFileSync(ROUND12_REPORT_FILE,renderRound12(result));
 console.log(answers.verdict);
 console.log('1',answers.q1);
 console.log('2',answers.q2);
 console.log('3',answers.q3);
 console.log('4',answers.q4);
 console.log('5',answers.q5);
 console.log('elapsed',result.elapsedSec);
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
