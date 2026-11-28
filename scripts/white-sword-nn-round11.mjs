#!/usr/bin/env node
// One locked imitation run from frozen A. The plan file is written before replay.
// The split file is written before any weight update. Holdout scores do not retune it.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {cloneMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {BLEND_HARD_CAP,BLEND_SCALE,BLEND_TIMEOUT_MS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {LABEL_SMOOTH,MEMORY_WORKER_RSS,V2_FILE_HASH,WORKER_CAP} from '../training/white-sword-nn/constants.mjs';
import {INPUT_DIM,STATE_DIM,encodeDecision,joinFeatures} from '../training/white-sword-nn/encode.mjs';
import {imitationLoss,imitationPass} from '../training/white-sword-nn/learn.mjs';
import {compactAction,sameAction} from '../training/white-sword-nn/loop.mjs';
import {
 cloneNet,createOptimizer,forwardTrain,greedyIndex,loadNet,netDistance,sameWeights,saveNet,scoreActions
} from '../training/white-sword-nn/net.mjs';
import {loadOfficialV2,playMatch,publicDecisionContext,trainable} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {protectClass,publicLethalKept} from '../training/white-sword-nn/round10.mjs';
import {
 A_SEEN_SEEDS,A_UNSEEN_SEEDS,ROUND11_A_FILE,ROUND11_A_HASH,ROUND11_B_FILE,ROUND11_B_HASH,
 ROUND11_BENCH_SEED,ROUND11_ENDPOINT_FILE,ROUND11_FROZEN_FILES,ROUND11_LR,ROUND11_PLAN_FILE,
 ROUND11_PROTECTION,ROUND11_R10_FILE,ROUND11_REPORT_FILE,ROUND11_RESULT_FILE,ROUND11_SPLIT_FILE,
 ROUND11_VERSION_ENDPOINT,ROUND11_VERSION_ZERO,ROUND11_V2_FILE,ROUND11_ZERO_FILE,
 assertTrainPool,assertWritable,blockBehavior,blockCoverage,choiceClass,corpusRoles,
 decisionKind,distribution,explainRound11,gainCounts,improvedSeeds,isolateSamples,
 judgeRound11,kindTable,lockPlan,newObviousErrors,perSeedRate,regressions,renderRound11,
 round11Rng,scheduleCorpus,seedPaired,splitFeatures,stratifiedEpoch
} from '../training/white-sword-nn/round11.mjs';

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
function hashes(){
 return {
  a:sha256(ROUND11_A_FILE),b:sha256(ROUND11_B_FILE),v2:sha256(ROUND11_V2_FILE),
  r10:sha256(ROUND11_R10_FILE)
 };
}
function assertFrozen(found){
 if(found.a!==ROUND11_A_HASH)throw Error('Frozen A hash drifted');
 if(found.b!==ROUND11_B_HASH)throw Error('Frozen B hash drifted');
 if(found.v2!==V2_FILE_HASH)throw Error('Official v2 hash drifted');
 for(const file of ROUND11_FROZEN_FILES)if(file.endsWith('.json'))void file;
}
function materialize(game,scheduled){
 return (game.imitate||[]).map(sample=>{
  const row={
   ...sample,role:scheduled.role,
   kind:decisionKind(sample.actions?.[sample.chosen])
  };
  row.id=[row.source,row.seed,row.learnerSeat,row.first,row.step].join(':');
  return row;
 });
}
function scoreNet(net,samples){
 const picked=new Map();
 let diverged=0;
 for(const sample of samples){
  const parts=sample.parts;
  const scores=scoreActions(net,parts.state,parts.actions);
  const trained=Float64Array.from(sample.rows,row=>forwardTrain(net,row).q);
  const index=greedyIndex(scores,sample.actions);
  if(index!==greedyIndex(trained,sample.actions))diverged++;
  picked.set(sample.id,{index,scores});
 }
 return {picked,diverged};
}
function indexMap(scored){
 return new Map([...scored.picked].map(([id,row])=>[id,row.index]));
}
function tally(samples,indexes){
 const totals={used:0,exact:0,proven:0,sameIdUnproven:0,unprovenCollision:0,disagree:0,illegal:0};
 for(const sample of samples){
  const kind=choiceClass(sample,indexes.get(sample.id));
  totals.used++;
  totals[kind==='exact'?'exact':kind==='proven'?'proven':kind==='same-id-unproven'?'sameIdUnproven':kind==='unproven-collision'?'unprovenCollision':kind==='illegal'?'illegal':'disagree']++;
 }
 const rate=key=>totals.used?totals[key]/totals.used:null;
 return {...totals,exactRate:rate('exact'),provenRate:rate('proven'),sameIdRate:rate('sameIdUnproven')};
}
function checkedRow(sample,indexes,endpoint){
 const row={
  ...sample,teacherIndex:sample.chosen,
  aIndex:indexes.a.get(sample.id),bIndex:indexes.b.get(sample.id),
  endpointIndex:endpoint.get(sample.id),blockers:sample.blockers
 };
 row.protect=protectClass(row);
 row.publicLethalKept=publicLethalKept(row);
 return row;
}
function packs(){
 const deck=getDeck('white-sword');
 return [deck.pack,deck.pack];
}
function replayProtection(spec,modelB,modelA,modelV2){
 const deckPacks=packs();
 const seats=[null,null];
 seats[spec.learnerSeat]={deckId:'white-sword',kind:'nn',explore:0,policy:'greedy'};
 seats[1-spec.learnerSeat]={deckId:'white-sword',kind:'v2',explore:0};
 const nets=[null,null];
 nets[spec.learnerSeat]=modelB;
 const rows=[];
 let open=null;
 const game=playMatch({
  seed:spec.seed,first:spec.first,mode:'eval',learnerSeat:spec.learnerSeat,
  comparison:'direct',model:'candidate',opponent:'v2',deck:'white-sword',
  keepActions:false,recordSeats:[],teacherSeats:[],progress:false,
  decisionMs:BLEND_TIMEOUT_MS,seats,nets,critics:[null,null],
  observe(event){
   if(event.when==='choice'){
    if(!open)return;
    if(!sameAction(event.action,open.actions[open.bIndex]))
     throw Error('Protection action diverged from B at step '+event.step);
    rows.push(open);
    open=null;
    return;
   }
   if(event.actor!==spec.learnerSeat||event.legal.length<2)return;
   const state=cloneMatch(event.state);
   const observation=observeActor(deckPacks,state,event.actor);
   const actions=event.legal.map(action=>JSON.parse(JSON.stringify(action)));
   const encoded=encodeDecision(observation,event.actor,actions,event.history.slice());
   const context=publicDecisionContext(observation,event.actor);
   const row={
    source:'protection',synthetic:false,labeledByUniversalRule:false,hiddenLifeUsed:false,
    lifeCards:null,seed:spec.seed,first:spec.first,step:event.step,role:'protection',
    actions,rows:encoded.actions.map(action=>joinFeatures(encoded.state,action)),
    identities:[...encoded.index].map(([uid,card])=>[uid,{cardId:card.cardId||'',faceDown:card.faceDown===true}]),
    ...context
   };
   row.kind=decisionKind(actions[0]);
   row.parts={state:encoded.state,actions:encoded.actions};
   row.aIndex=greedyIndex(scoreActions(modelA,encoded.state,encoded.actions),actions);
   row.bIndex=greedyIndex(scoreActions(modelB,encoded.state,encoded.actions),actions);
   const teacher=chooseWhiteSwordAction(deckPacks,cloneMatch(event.state),{
    actor:event.actor,model:modelV2,mode:'blend',hardCap:BLEND_HARD_CAP,scale:BLEND_SCALE,
    explore:0,seed:spec.seed,step:event.step,timeoutMs:BLEND_TIMEOUT_MS
   });
   if(teacher?.reason==='timeout'||teacher?.source==='fallback'||!teacher?.action)
    throw Error('Teacher missed protection step '+event.step+' of '+spec.seed);
   row.teacherIndex=actions.findIndex(action=>sameAction(action,teacher.action));
   row.chosen=row.teacherIndex;
   row.kind=decisionKind(actions[row.chosen]);
   row.id=['protection',spec.seed,spec.learnerSeat,spec.first,event.step].join(':');
   if(row.rows[0].length!==INPUT_DIM)throw Error('Protection features drifted');
   open=row;
  }
 });
 const matched=trainable(game)&&game.winner===spec.winner&&game.steps===spec.steps;
 if(!matched)return {seed:spec.seed,learnerSeat:spec.learnerSeat,first:spec.first,matched:false,rows:[],status:game.status,steps:game.steps,winner:game.winner,endReason:game.endReason};
 return {seed:spec.seed,learnerSeat:spec.learnerSeat,first:spec.first,matched:true,rows,steps:game.steps,winner:game.winner};
}
function actionText(action){
 if(!action)return '無';
 if(action.type==='chooseBlock'&&action.uid==null)return '不阻擋';
 if(action.type==='chooseBlock')return '阻擋 '+action.uid;
 const bits=[action.type||'動作'];
 if(action.mode)bits.push(action.mode);
 if(action.uid)bits.push(action.uid);
 return bits.join(' ');
}
function splitText(info){
 return [
  '乾淨示範 32 場，種子 188600–188631。曾進入 A 更新的是 188600–188623，本輪角色是'+info.seenRole+'。',
  '未進入 A 更新的原保留種子是 '+A_UNSEEN_SEEDS.join('、')+'，本輪仍全部留在保留組。',
  '額外重播既有自我對戰種子 '+info.extra+' 個。訓練 '+info.extraTrain+' 個，保留 '+info.extraHold+' 個。先手沿用該種子在原自我對戰名單的先手，兩座都改由凍結 v2 決策。',
  '本輪訓練 '+info.trainSamples+' 筆、'+info.trainSeeds+' 個種子。保留 '+info.holdoutSamples+' 筆、'+info.holdoutSeeds+' 個種子。本輪更新保留 '+info.reserveSamples+' 筆、'+info.reserveSeeds+' 個種子。',
  '隔離 '+info.isolated+' 筆。未完成場次 '+info.failedGames+'。',
  '訓練分布 '+JSON.stringify(info.trainDist)+'。保留分布 '+JSON.stringify(info.holdoutDist)+'。本輪更新保留分布 '+JSON.stringify(info.reserveDist)+'。',
  '訓練阻擋：教師擋 '+info.trainBlock.teacherBlock+'、不擋 '+info.trainBlock.teacherPass+'、至少兩個合法阻擋者 '+info.trainBlock.multi+'、生命 '+(info.trainBlock.lives.join('、')||'無')+'、傷害 '+(info.trainBlock.damages.join('、')||'無')+'、impact '+(info.trainBlock.impacts.join('、')||'無')+'、攻擊 BP '+(info.trainBlock.bps.join('、')||'無')+'、教師阻擋者 '+(info.trainBlock.teacherUids.join('、')||'無')+'。',
  '保留阻擋：教師擋 '+info.holdoutBlock.teacherBlock+'、不擋 '+info.holdoutBlock.teacherPass+'、至少兩個合法阻擋者 '+info.holdoutBlock.multi+'、種子 '+(info.holdoutBlock.seeds.join('、')||'無')+'。'
 ].join('\n');
}
async function main(){
 const before=hashes();
 assertFrozen(before);
 loadOfficialV2();
 console.log('measuring one v2 mirror');
 const benchStarted=performance.now();
 const benchGame=playMatch({
  seed:ROUND11_BENCH_SEED,first:0,mode:'imitate',source:'bench',captureContext:true,
  teacherSeats:[0,1],progress:true,seats:[seat('v2'),seat('v2')],nets:[null,null]
 });
 const v2Ms=benchGame.ms;
 console.log('bench',benchGame.status,benchGame.steps,benchGame.imitate.length,Math.round(v2Ms));
 if(!trainable(benchGame)||benchGame.imitate.length<2)throw Error('Bench game did not yield teacher decisions');
 if(benchGame.imitate[0].rows[0].length!==INPUT_DIM)throw Error('Bench features drifted from the encoder');
 const probe=cloneNet(loadNet(ROUND11_A_FILE));
 probe.version='nn-bench-discard';
 const optProbe=createOptimizer(ROUND11_LR);
 const trainStarted=performance.now();
 const probed=imitationPass(probe,optProbe,benchGame.imitate);
 const decisionMs=(performance.now()-trainStarted)/Math.max(1,probed.used);
 console.log('decision ms',decisionMs,probed.used);
 const rss=memoryUsage().rss;
 const workers=rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
 const plan=lockPlan({
  v2Ms,workers,decisionMs,decisionsPerGame:benchGame.imitate.length
 });
 const lockedEpochs=plan.epochs;
 const scheduled=scheduleCorpus(plan);
 const roles=corpusRoles(plan);
 const planFile={
  createdAt:new Date().toISOString(),createdAtText:taipei(new Date()),
  ...plan,protection:[...ROUND11_PROTECTION],
  schedule:scheduled.map(game=>({seed:game.seed,first:game.first,source:game.source,role:game.role})),
  bench:{seed:ROUND11_BENCH_SEED,ms:v2Ms,steps:benchGame.steps,decisions:benchGame.imitate.length,decisionMs,workers,rssMb:Math.round(rss/1024/1024)},
  hashes:before,smooth:LABEL_SMOOTH
 };
 writeFileSync(ROUND11_PLAN_FILE,JSON.stringify(planFile,null,2));
 console.log('plan locked',plan.trainSource,plan.epochs,plan.extra,Math.round(plan.estimate.total));
 benchGame.imitate=[];
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
 const gameRows=[];
 const ids=new Set();
 for(const game of games){
  const meta=bySeed.get(game.seed);
  if(!meta)throw Error('Unexpected seed '+game.seed);
  const clean=trainable(game);
  let kept=[];
  if(!clean){
   failed.push({seed:game.seed,role:meta.role,status:game.status,endReason:game.endReason,steps:game.steps});
   isolated.push({seed:game.seed,failures:['game was not trainable']});
  }else{
   const rows=materialize(game,meta);
   for(const row of rows){
    if(row.rows[0].length!==INPUT_DIM)throw Error('Features drifted at '+row.id);
    row.parts=splitFeatures(row.rows,STATE_DIM);
    row.blockers=row.kind==='block'?row.front.filter(card=>row.actions.some(action=>action.type==='chooseBlock'&&action.uid===card.uid)):[];
    if(ids.has(row.id))throw Error('Duplicate decision '+row.id);
    ids.add(row.id);
   }
   const split=isolateSamples(rows);
   kept=split.kept;
   isolated.push(...split.isolated);
   const role=meta.role==='round-reserve'?'reserve':meta.role;
   buckets[role].push(...kept);
  }
  gameRows.push({seed:game.seed,role:meta.role,source:meta.source,first:game.first,status:game.status,winner:game.winner,steps:game.steps,samples:kept.length});
  game.imitate=[];
 }
 if(plan.epochs!==lockedEpochs)throw Error('Epoch count changed after the plan');
 const info={
  seenRole:plan.trainSource==='unseen-prefix'?'本輪更新保留':'本輪訓練',
  extra:plan.extra,extraTrain:plan.extraTrain.length,extraHold:plan.extraHoldout.length,
  trainSamples:buckets.train.length,trainSeeds:new Set(buckets.train.map(row=>row.seed)).size,
  holdoutSamples:buckets.holdout.length,holdoutSeeds:roles.holdout.length,
  reserveSamples:buckets.reserve.length,reserveSeeds:roles.reserve.length,
  isolated:isolated.length,failedGames:failed.length,
  trainDist:distribution(buckets.train),holdoutDist:distribution(buckets.holdout),reserveDist:distribution(buckets.reserve),
  trainBlock:blockCoverage(buckets.train),holdoutBlock:blockCoverage(buckets.holdout)
 };
 const text=splitText(info);
 const splitFile={
  createdAt:new Date().toISOString(),createdAtText:taipei(new Date()),
  writtenBeforeUpdates:true,trainSource:plan.trainSource,epochs:plan.epochs,lr:plan.lr,
  aSeen:A_SEEN_SEEDS,aUnseen:A_UNSEEN_SEEDS,
  trainSeeds:roles.train,holdoutSeeds:roles.holdout,reserveSeeds:roles.reserve,
  ...info,failed,games:gameRows,isolated,splitText:text
 };
 writeFileSync(ROUND11_SPLIT_FILE,JSON.stringify(splitFile,null,2));
 console.log('split',info.trainSamples,info.holdoutSamples,info.reserveSamples,'isolated',isolated.length);
 assertTrainPool(buckets.train,roles.holdout,roles.reserve);
 const modelA=loadNet(ROUND11_A_FILE);
 const zero=cloneNet(modelA);
 zero.version=ROUND11_VERSION_ZERO;
 const all=[...buckets.train,...buckets.holdout,...buckets.reserve];
 const scoredA=scoreNet(modelA,all);
 const scoredZero=scoreNet(zero,all);
 let zeroMatchesA=sameWeights(modelA,zero);
 for(const sample of all){
  const left=scoredA.picked.get(sample.id);
  const right=scoredZero.picked.get(sample.id);
  if(left.index!==right.index||!left.scores.every((score,index)=>Object.is(score,right.scores[index])))zeroMatchesA=false;
 }
 if(!zeroMatchesA)throw Error('Zero-update copy does not match A');
 assertWritable(ROUND11_ZERO_FILE);
 saveNet(zero,ROUND11_ZERO_FILE);
 const beforeLoss=buckets.train.length?imitationLoss(modelA,buckets.train,{smooth:LABEL_SMOOTH}).loss:null;
 const working=cloneNet(modelA);
 working.version=ROUND11_VERSION_ENDPOINT;
 const opt=createOptimizer(plan.lr);
 const rng=round11Rng(plan.drawSeed);
 const curve=[];
 for(let epoch=0;epoch<plan.epochs;epoch++){
  assertTrainPool(buckets.train,roles.holdout,roles.reserve);
  const result=imitationPass(working,opt,stratifiedEpoch(buckets.train,rng,plan.weights));
  curve.push({epoch,...result});
  console.log('epoch',epoch,result.loss,result.used,working.updates);
 }
 if(curve.length!==lockedEpochs)throw Error('Epoch count drifted');
 assertWritable(ROUND11_ENDPOINT_FILE);
 saveNet(working,ROUND11_ENDPOINT_FILE);
 const after=hashes();
 assertFrozen(after);
 if(sha256(ROUND11_A_FILE)!==before.a)throw Error('A was written');
 const afterLoss=buckets.train.length?imitationLoss(working,buckets.train,{smooth:LABEL_SMOOTH}).loss:null;
 const scoredEnd=scoreNet(working,all);
 const modelB=loadNet(ROUND11_B_FILE);
 const scoredB=scoreNet(modelB,all);
 const maps={
  a:indexMap(scoredA),zero:indexMap(scoredZero),end:indexMap(scoredEnd),b:indexMap(scoredB)
 };
 const comparison=[];
 for(const [role,rows] of [['holdout',buckets.holdout],['round-reserve',buckets.reserve],['train',buckets.train]]){
  for(const [model,indexes] of [['A',maps.a],['zero',maps.zero],['endpoint',maps.end],['B',maps.b]]){
   const counts=tally(rows,indexes);
   comparison.push({model,role,...counts});
  }
 }
 const holdRatesA=perSeedRate(buckets.holdout,maps.a);
 const holdRatesEnd=perSeedRate(buckets.holdout,maps.end);
 const paired=seedPaired(holdRatesA,holdRatesEnd);
 const holdBlocks=buckets.holdout.filter(row=>row.kind==='block');
 const blockImprovedSeeds=improvedSeeds(perSeedRate(holdBlocks,maps.a),perSeedRate(holdBlocks,maps.end));
 const gains=gainCounts(holdBlocks,maps.a,maps.end);
 const behavior=blockBehavior(buckets.holdout,maps.a,maps.end);
 const beforeKinds=kindTable(buckets.holdout,maps.a);
 const afterKinds=kindTable(buckets.holdout,maps.end);
 const dropped=regressions(beforeKinds,afterKinds);
 const kinds=beforeKinds.map(row=>{
  const next=afterKinds.find(item=>item.kind===row.kind);
  return {kind:row.kind,used:row.used,before:row.rate,after:next.rate,beforeExact:row.exact,afterExact:next.exact};
 });
 console.log('replaying protection');
 const protection=[];
 let protectionRows=[];
 for(const spec of ROUND11_PROTECTION){
  try{
   const played=replayProtection(spec,modelB,modelA,loadOfficialV2());
   protection.push({seed:played.seed,learnerSeat:played.learnerSeat,first:played.first,matched:played.matched,steps:played.steps,winner:played.winner,rows:played.rows.length,endReason:played.endReason||null});
   if(played.matched)protectionRows=protectionRows.concat(played.rows);
   console.log('protection',spec.seed,spec.learnerSeat,spec.first,played.matched,played.rows.length);
  }catch(error){
   protection.push({seed:spec.seed,learnerSeat:spec.learnerSeat,first:spec.first,matched:false,error:String(error.message||error)});
   console.log('protection failed',spec.seed,error.message);
  }
 }
 const protectionComplete=protection.length===ROUND11_PROTECTION.length&&protection.every(row=>row.matched);
 for(const row of protectionRows){
  row.parts=splitFeatures(row.rows,STATE_DIM);
  row.blockers=row.kind==='block'?row.front.filter(card=>row.actions.some(action=>action.type==='chooseBlock'&&action.uid===card.uid)):[];
 }
 const scoredProtect=scoreNet(working,protectionRows);
 const protectIndexes={
  a:new Map(protectionRows.map(row=>[row.id,row.aIndex])),
  b:new Map(protectionRows.map(row=>[row.id,row.bIndex])),
  end:indexMap(scoredProtect)
 };
 const errorRows=[
  ...buckets.holdout.map(row=>checkedRow(row,maps,maps.end)),
  ...protectionRows.map(row=>checkedRow(row,protectIndexes,protectIndexes.end))
 ];
 const obvious=newObviousErrors(errorRows);
 const changed=protectionRows.filter(row=>row.aIndex!==protectIndexes.end.get(row.id)).map(row=>({
  id:row.id,step:row.step,kind:row.kind,life:row.life,damage:row.damage,impact:row.impact,
  before:actionText(row.actions[row.aIndex]),after:actionText(row.actions[protectIndexes.end.get(row.id)]),
  teacher:actionText(row.actions[row.chosen])
 }));
 const blockChanges=holdBlocks.filter(row=>maps.a.get(row.id)!==maps.end.get(row.id)).map(row=>({
  seed:row.seed,step:row.step,life:row.life,damage:row.damage,impact:row.impact,attackerBp:row.attackerBp,
  before:actionText(row.actions[maps.a.get(row.id)]),
  after:actionText(row.actions[maps.end.get(row.id)]),
  teacher:actionText(row.actions[row.chosen]),
  gained:maps.end.get(row.id)===row.chosen
 }));
 const summary={
  paired,holdoutSeeds:info.holdoutSeeds,blockSeeds:new Set(holdBlocks.map(row=>row.seed)).size,
  blockImprovedSeeds,blockGainDecisions:gains.decisions,step118Gains:gains.step118,
  newObviousErrors:obvious,protectionComplete,regressionsDisclosed:true,
  block:behavior,regressions:dropped
 };
 const judged=judgeRound11(summary);
 const answers=explainRound11(summary);
 const result={
  createdAt:new Date().toISOString(),createdAtText:taipei(new Date()),
  verdict:judged.verdict,passed:judged.passed,recommend:judged.recommend,answers,
  hashes:{beforeA:before.a,afterA:after.a,beforeB:before.b,afterB:after.b,beforeV2:before.v2,afterV2:after.v2,beforeR10:before.r10,afterR10:after.r10,zero:sha256(ROUND11_ZERO_FILE),endpoint:sha256(ROUND11_ENDPOINT_FILE)},
  updates:{zero:zero.updates,endpoint:working.updates},
  distance:netDistance(modelA,working),zeroMatchesA,scoreDivergences:scoredEnd.diverged,
  plan:{lr:plan.lr,smooth:plan.smooth,epochs:plan.epochs,weights:plan.weights,drawSeed:plan.drawSeed,benchSeed:plan.benchSeed,trainSource:plan.trainSource,stats:plan.stats,criteria:plan.criteria},
  splitText:text,comparison,paired,seedDeltas:paired.rows,kinds,block:behavior,blockCoverage:info.holdoutBlock,
  blockImprovedSeeds,blockChanges,regressions:dropped,protection,protectionChanges:changed,
  obvious,trainLoss:{before:beforeLoss,after:afterLoss},curve,
  reservePaired:seedPaired(perSeedRate(buckets.reserve,maps.a),perSeedRate(buckets.reserve,maps.end)),
  blockText:[
   '保留阻擋 '+holdBlocks.length+' 筆，'+summary.blockSeeds+' 個種子。教師不擋 '+behavior.teacherPass+'，A 保持 '+behavior.beforePass+'，終點保持 '+behavior.afterPass+'。',
   '教師有擋 '+behavior.teacherBlock+'，阻擋者精確一致 A '+behavior.beforeExact+'、終點 '+behavior.afterExact+'。任意阻擋 A '+behavior.beforeAny+'、終點 '+behavior.afterAny+'。',
   '至少兩個合法阻擋者 '+behavior.multi+'。教師阻擋者 '+(behavior.teacherUids.join('、')||'無')+'。',
   '精確一致上升的種子：'+(blockImprovedSeeds.join('、')||'無')+'。新對上教師 '+gains.decisions+' 筆，其中第 118 步 '+gains.step118+' 筆。',
   '生命、傷害、BP 與 impact 的分布見切分檔，沒有拿來產生標籤。'
  ].join('\n'),
  protectionText:[
   '八場既有敗局重播相符 '+(protection.filter(row=>row.matched).length)+' 場。',
   '新增已核對錯誤 '+obvious.length+' 筆。',
   '保護決策被終點改掉 '+changed.length+' 筆。',
   changed.slice(0,24).map(row=>row.id+'：A '+row.before+'，終點 '+row.after+'，教師 '+row.teacher).join('\n')
  ].join('\n')
 };
 writeFileSync(ROUND11_RESULT_FILE,JSON.stringify(result,null,2));
 writeFileSync(ROUND11_REPORT_FILE,renderRound11(result));
 console.log(judged.verdict,answers.q1);
 console.log('elapsed',Math.round((performance.now()-benchStarted)/1000)+'s');
}
main().catch(error=>{
 console.error(error);
 process.exit(1);
});
