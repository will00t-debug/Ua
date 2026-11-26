#!/usr/bin/env node
// Score the committed round-12 shuffle endpoint. No training and no new games.
// The plan file is written after the snapshot is identified and before any score is used.
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {deserialize,serialize} from 'node:v8';
import {cloneMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {BLEND_HARD_CAP,BLEND_SCALE,BLEND_TIMEOUT_MS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {MEMORY_WORKER_RSS,V2_FILE_HASH,WORKER_CAP} from '../training/white-sword-nn/constants.mjs';
import {INPUT_DIM,STATE_DIM,encodeDecision,joinFeatures} from '../training/white-sword-nn/encode.mjs';
import {sameAction} from '../training/white-sword-nn/loop.mjs';
import {forwardTrain,greedyIndex,loadNet,sameWeights,scoreActions} from '../training/white-sword-nn/net.mjs';
import {loadOfficialV2,playMatch,publicDecisionContext,trainable} from '../training/white-sword-nn/play.mjs';
import {protectClass,publicLethalKept} from '../training/white-sword-nn/round10.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {
 ROUND11_A_FILE,ROUND11_A_HASH,ROUND11_B_FILE,ROUND11_B_HASH,ROUND11_PLAN_FILE,
 ROUND11_PROTECTION,ROUND11_RESULT_FILE,ROUND11_SPLIT_FILE,ROUND11_V2_FILE,ROUND11_ZERO_FILE,
 blockBehavior,blockCoverage,choiceClass,corpusRoles,decisionKind,distribution,gainCounts,
 improvedSeeds,isolateSamples,newObviousErrors,perSeedRate,scheduleCorpus,splitFeatures
} from '../training/white-sword-nn/round11.mjs';
import {
 addAttack,attackGap,classifyAttack,compareLedger,emptyAttackCounts,hashSamples,sameCounts,sameMembers
} from '../training/white-sword-nn/round12.mjs';
import {
 ROUND13_CRITERIA,ROUND13_FROZEN_FILES,ROUND13_HOLDOUT_SAMPLES,ROUND13_HOLDOUT_SEEDS,
 ROUND13_PLAN_FILE,ROUND13_RECORDED_EXACT,ROUND13_RECORDED_STOP,ROUND13_REPORT_FILE,
 ROUND13_RESERVE_SAMPLES,ROUND13_RESULT_FILE,ROUND13_SHUFFLE_FILE,ROUND13_SHUFFLE_HASH,
 ROUND13_SHUFFLE_UPDATES,ROUND13_SHUFFLE_VERSION,ROUND13_STATS,ROUND13_TRAIN_SAMPLES,
 actionText,annotateSeeds,assertRole,blockersFrom,exactRate,explainRound13,judgeRound13,
 pairedError,parameterHash,regressionsOf,renderRound13,seedDirections,seedPaired,
 stopCase,transitionTable
} from '../training/white-sword-nn/round13.mjs';

const CACHE='/tmp/nn-round12-corpus.bin';
const ROUND12_HASHES={
 train:'186e5f1279f52b8fa6709f837bab879fdda1631e8a5ef95c1d864191c6715a89',
 holdout:'87ff9e58547dfd37a00c4744ba52b2314efae55de57a8ab464361205eeeb3f4d',
 reserve:'e7e61b723099e1cf0529fcf08246f2eff0eb9bad52a1a6bfbef298cc8e8b1e05'
};

function sha256(file){
 return createHash('sha256').update(readFileSync(file)).digest('hex');
}
function taipei(date){
 return new Intl.DateTimeFormat('zh-TW',{
  timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).format(date)+'（台北時間）';
}
function fileHashes(){
 const out={};
 for(const file of ROUND13_FROZEN_FILES)out[file]=sha256(file);
 return out;
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
function materialize(game,scheduled){
 return (game.imitate||[]).map(sample=>{
  const row={...sample,role:scheduled.role,kind:decisionKind(sample.actions?.[sample.chosen])};
  row.id=[row.source,row.seed,row.learnerSeat,row.first,row.step].join(':');
  return row;
 });
}
async function rebuild(plan,scheduled){
 if(existsSync(CACHE)){
  console.log('loading round-12 corpus snapshot');
  return {corpus:deserialize(readFileSync(CACHE)),source:'round12-snapshot'};
 }
 const rss=memoryUsage().rss;
 const workers=rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
 console.log('snapshot missing, replaying',scheduled.length,'games with',workers,'workers');
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
 const corpus={buckets,isolated,failed,ledger};
 try{writeFileSync(CACHE,serialize(corpus));}
 catch(error){console.log('cache skipped',error.message);}
 return {corpus,source:'round11-schedule-replay'};
}
function blockSame(found,recorded){
 if(!recorded)return false;
 return found.n===recorded.n&&found.teacherPass===recorded.teacherPass&&
  found.teacherBlock===recorded.teacherBlock&&found.multi===recorded.multi&&
  sameMembers(found.lives,recorded.lives)&&sameMembers(found.damages,recorded.damages)&&
  sameMembers(found.impacts,recorded.impacts)&&sameMembers(found.bps,recorded.bps)&&
  sameMembers(found.teacherUids,recorded.teacherUids)&&sameMembers(found.seeds,recorded.seeds);
}
function scoreIndexes(net,samples){
 const picked=new Map();
 let diverged=0;
 for(const sample of samples){
  const inference=scoreActions(net,sample.parts.state,sample.parts.actions);
  const trained=Float64Array.from(sample.rows,row=>forwardTrain(net,row).q);
  const index=greedyIndex(inference,sample.actions);
  if(index!==greedyIndex(trained,sample.actions))diverged++;
  picked.set(sample.id,index);
 }
 return {picked,diverged};
}
function forwardExact(net,samples){
 let exact=0;
 const attacks=emptyAttackCounts();
 for(const sample of samples){
  const scores=sample.rows.map(row=>forwardTrain(net,row).q);
  const picked=greedyIndex(scores,sample.actions);
  if(picked===sample.chosen)exact++;
  if(sample.kind==='attack')addAttack(attacks,classifyAttack(sample,scores,picked),attackGap(sample,scores));
 }
 return {exact:samples.length?exact/samples.length:null,attacks};
}
function tally(samples,indexes){
 const totals={used:0,exact:0,proven:0,sameIdUnproven:0,unprovenCollision:0,disagree:0,illegal:0};
 for(const sample of samples){
  const kind=choiceClass(sample,indexes.get(sample.id));
  totals.used++;
  const key=kind==='exact'?'exact':kind==='proven'?'proven':kind==='same-id-unproven'?'sameIdUnproven':kind==='unproven-collision'?'unprovenCollision':kind==='illegal'?'illegal':'disagree';
  totals[key]++;
 }
 const rate=key=>totals.used?totals[key]/totals.used:null;
 return {...totals,exactRate:rate('exact'),provenRate:rate('proven'),sameIdRate:rate('sameIdUnproven')};
}
function percent(rate){
 return Number.isFinite(rate)?(rate*100).toFixed(1)+'%':'沒有樣本';
}
function packs(){
 const deck=getDeck('white-sword');
 return [deck.pack,deck.pack];
}
function replayProtection(spec,modelB,modelA,modelEndpoint,modelV2){
 if(modelEndpoint===modelB||modelEndpoint===modelA)throw Error('The evaluated weight would take over the protection game');
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
   row.parts={state:encoded.state,actions:encoded.actions};
   row.aIndex=greedyIndex(scoreActions(modelA,encoded.state,encoded.actions),actions);
   row.bIndex=greedyIndex(scoreActions(modelB,encoded.state,encoded.actions),actions);
   row.endpointIndex=greedyIndex(scoreActions(modelEndpoint,encoded.state,encoded.actions),actions);
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
   row.blockers=blockersFrom(row);
   if(row.rows[0].length!==INPUT_DIM)throw Error('Protection features drifted');
   open=row;
  }
 });
 const matched=trainable(game)&&game.winner===spec.winner&&game.steps===spec.steps;
 if(!matched)return {seed:spec.seed,learnerSeat:spec.learnerSeat,first:spec.first,matched:false,rows:[],status:game.status,steps:game.steps,winner:game.winner,endReason:game.endReason};
 return {seed:spec.seed,learnerSeat:spec.learnerSeat,first:spec.first,matched:true,rows,steps:game.steps,winner:game.winner};
}
function modelLine(net){
 return {version:net.version,updates:net.updates,parameters:parameterHash(net)};
}
function splitLine(name,samples,maps){
 return {
  name,used:samples.length,
  A:exactRate(samples,maps.a),zero:exactRate(samples,maps.zero),
  endpoint:exactRate(samples,maps.end),B:exactRate(samples,maps.b)
 };
}
async function main(){
 const started=performance.now();
 const beforeFiles=fileHashes();
 if(beforeFiles[ROUND11_A_FILE]!==ROUND11_A_HASH)throw Error('Frozen A hash drifted');
 if(beforeFiles[ROUND11_B_FILE]!==ROUND11_B_HASH)throw Error('Frozen B hash drifted');
 if(beforeFiles[ROUND11_V2_FILE]!==V2_FILE_HASH)throw Error('Official v2 hash drifted');
 if(beforeFiles[ROUND13_SHUFFLE_FILE]!==ROUND13_SHUFFLE_HASH)throw Error('Shuffle endpoint is not the committed round-12 file');
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
 loadOfficialV2();
 const loaded=await rebuild(plan,scheduled);
 const corpus=loaded.corpus;
 const roles=corpusRoles(plan);
 const ledger=compareLedger(corpus.ledger,savedSplit.games);
 const distMatched=sameCounts(distribution(corpus.buckets.train),savedSplit.trainDist)&&
  sameCounts(distribution(corpus.buckets.holdout),savedSplit.holdoutDist)&&
  sameCounts(distribution(corpus.buckets.reserve),savedSplit.reserveDist);
 const blockMatched=blockSame(blockCoverage(corpus.buckets.train),savedSplit.trainBlock)&&
  blockSame(blockCoverage(corpus.buckets.holdout),savedSplit.holdoutBlock);
 const dataHashes={
  train:hashSamples(corpus.buckets.train),
  holdout:hashSamples(corpus.buckets.holdout),
  reserve:hashSamples(corpus.buckets.reserve)
 };
 const hashMatched=dataHashes.train===ROUND12_HASHES.train&&dataHashes.holdout===ROUND12_HASHES.holdout&&dataHashes.reserve===ROUND12_HASHES.reserve;
 if(!hashMatched||!ledger.matched||!distMatched||!blockMatched){
  throw Error('Round 12 snapshot was not reproduced: '+JSON.stringify({
   hashMatched,ledger:ledger.matched,distMatched,blockMatched,dataHashes,mismatches:ledger.mismatches.slice(0,8)
  }));
 }
 const train=corpus.buckets.train;
 const holdout=corpus.buckets.holdout;
 const reserve=corpus.buckets.reserve;
 assertRole(train,'train');
 assertRole(holdout,'holdout');
 assertRole(reserve,'round-reserve');
 if(train.length!==ROUND13_TRAIN_SAMPLES||holdout.length!==ROUND13_HOLDOUT_SAMPLES||reserve.length!==ROUND13_RESERVE_SAMPLES)
  throw Error('Sample counts drifted');
 if(new Set(holdout.map(sample=>sample.seed)).size!==ROUND13_HOLDOUT_SEEDS)throw Error('Holdout seed count drifted');
 for(const sample of train.concat(holdout,reserve)){
  if(!sample.parts)sample.parts=splitFeatures(sample.rows,STATE_DIM);
 }
 const modelA=loadNet(ROUND11_A_FILE);
 const zero=loadNet(ROUND11_ZERO_FILE);
 const modelB=loadNet(ROUND11_B_FILE);
 const endpoint=loadNet(ROUND13_SHUFFLE_FILE);
 if(endpoint.version!==ROUND13_SHUFFLE_VERSION||endpoint.updates!==ROUND13_SHUFFLE_UPDATES)
  throw Error('Shuffle version or update count is not the committed endpoint');
 if(!sameWeights(modelA,zero))throw Error('Zero-update copy does not match A');
 const models={a:modelLine(modelA),zero:modelLine(zero),b:modelLine(modelB),endpoint:modelLine(endpoint)};
 const planFile={
  createdAt:new Date().toISOString(),createdAtText:taipei(new Date()),
  writtenBeforeScores:true,source:loaded.source,hashMatched,ledgerMatched:ledger.matched,
  distMatched,blockMatched,isolated:corpus.isolated.length,failed:corpus.failed.length,
  dataHashes,counts:{train:train.length,holdout:holdout.length,reserve:reserve.length,holdoutSeeds:ROUND13_HOLDOUT_SEEDS},
  endpoint:{
   file:ROUND13_SHUFFLE_FILE,version:endpoint.version,updates:endpoint.updates,
   fileHash:beforeFiles[ROUND13_SHUFFLE_FILE],parameterHash:models.endpoint.parameters
  },
  models,stats:ROUND13_STATS,criteria:[...ROUND13_CRITERIA],
  recordedWeighted:{A:ROUND13_RECORDED_EXACT.A,shuffle:ROUND13_RECORDED_EXACT.shuffle,stop:ROUND13_RECORDED_STOP},
  note:'計分、保護重播和判定都在這個檔案之後。看完分數後不改這四條條件。'
 };
 writeFileSync(ROUND13_PLAN_FILE,JSON.stringify(planFile,null,2));
 console.log('plan locked',loaded.source,holdout.length);
 const all=train.concat(holdout,reserve);
 const scoredA=scoreIndexes(modelA,all);
 const scoredZero=scoreIndexes(zero,all);
 const scoredB=scoreIndexes(modelB,all);
 const scoredEnd=scoreIndexes(endpoint,all);
 let zeroActionsMatchA=true;
 for(const sample of all){
  if(scoredA.picked.get(sample.id)!==scoredZero.picked.get(sample.id))zeroActionsMatchA=false;
 }
 if(!zeroActionsMatchA)throw Error('Zero-update actions diverged from A');
 const forwardA=forwardExact(modelA,holdout);
 const forwardEnd=forwardExact(endpoint,holdout);
 if(Math.abs(forwardA.exact-ROUND13_RECORDED_EXACT.A)>1e-12||Math.abs(forwardEnd.exact-ROUND13_RECORDED_EXACT.shuffle)>1e-12)
  throw Error('Training-forward holdout rates did not reproduce round 12: '+forwardA.exact+' '+forwardEnd.exact);
 if(forwardEnd.attacks.stop!==ROUND13_RECORDED_STOP)
  throw Error('Training-forward stop count is '+forwardEnd.attacks.stop);
 const maps={a:scoredA.picked,zero:scoredZero.picked,b:scoredB.picked,end:scoredEnd.picked};
 const divergence=scoredA.diverged+scoredZero.diverged+scoredB.diverged+scoredEnd.diverged;
 const scoresAgree=divergence===0;
 const holdRatesA=perSeedRate(holdout,maps.a);
 const holdRatesEnd=perSeedRate(holdout,maps.end);
 const paired=seedPaired(holdRatesA,holdRatesEnd);
 const error=pairedError(paired);
 const seedRows=annotateSeeds(holdRatesA,holdRatesEnd,paired);
 const directions=seedDirections(seedRows);
 const kinds=transitionTable(holdout,maps.a,maps.end);
 const dropped=regressionsOf(kinds);
 const holdBlocks=holdout.filter(sample=>sample.kind==='block');
 const blockImproved=improvedSeeds(perSeedRate(holdBlocks,maps.a),perSeedRate(holdBlocks,maps.end));
 const gains=gainCounts(holdBlocks,maps.a,maps.end);
 const behavior=blockBehavior(holdout,maps.a,maps.end);
 const weighted={before:exactRate(holdout,maps.a),after:exactRate(holdout,maps.end),decisions:holdout.length};
 const comparison=[
  ['holdout',holdout],['train',train],['round-reserve',reserve]
 ].map(([name,samples])=>({...splitLine(name,samples,maps),provenA:tally(samples,maps.a).proven,provenEndpoint:tally(samples,maps.end).proven}));
 const attacks=holdout.filter(sample=>sample.kind==='attack');
 const stops=[];
 const attackCounts={A:emptyAttackCounts(),endpoint:emptyAttackCounts(),B:emptyAttackCounts()};
 for(const sample of attacks){
  const scoreSets={
   a:scoreActions(modelA,sample.parts.state,sample.parts.actions),
   b:scoreActions(modelB,sample.parts.state,sample.parts.actions),
   endpoint:scoreActions(endpoint,sample.parts.state,sample.parts.actions)
  };
  const picks={a:maps.a.get(sample.id),b:maps.b.get(sample.id),endpoint:maps.end.get(sample.id)};
  addAttack(attackCounts.A,classifyAttack(sample,scoreSets.a,picks.a),attackGap(sample,scoreSets.a));
  addAttack(attackCounts.B,classifyAttack(sample,scoreSets.b,picks.b),attackGap(sample,scoreSets.b));
  const bucket=classifyAttack(sample,scoreSets.endpoint,picks.endpoint);
  addAttack(attackCounts.endpoint,bucket,attackGap(sample,scoreSets.endpoint));
  if(bucket==='stop')stops.push(stopCase(sample,picks,scoreSets));
 }
 if(scoresAgree&&stops.length!==ROUND13_RECORDED_STOP)
  throw Error('Inference stop count drifted from the recorded 11');
 console.log('stops',stops.length,'paired',paired.mean,paired.low,paired.high);
 console.log('replaying protection');
 const recordedProtection=JSON.parse(readFileSync(ROUND11_RESULT_FILE,'utf8')).protection;
 const protection=[];
 let protectionRows=[];
 for(const spec of ROUND11_PROTECTION){
  const played=replayProtection(spec,modelB,modelA,endpoint,loadOfficialV2());
  const expected=recordedProtection.find(row=>row.seed===spec.seed&&row.learnerSeat===spec.learnerSeat&&row.first===spec.first);
  const sameTrajectory=Boolean(expected)&&played.matched&&played.steps===expected.steps&&played.winner===expected.winner&&played.rows.length===expected.rows;
  protection.push({
   seed:played.seed,learnerSeat:played.learnerSeat,first:played.first,matched:played.matched,
   sameTrajectory,steps:played.steps,winner:played.winner,rows:played.rows.length,
   endReason:played.endReason||null
  });
  if(played.matched)protectionRows=protectionRows.concat(played.rows);
  console.log('protection',spec.seed,spec.learnerSeat,spec.first,played.matched,sameTrajectory,played.rows.length);
 }
 const protectionComplete=protection.length===ROUND11_PROTECTION.length&&protection.every(row=>row.sameTrajectory);
 const protectIndexes={
  a:new Map(protectionRows.map(row=>[row.id,row.aIndex])),
  b:new Map(protectionRows.map(row=>[row.id,row.bIndex])),
  end:new Map(protectionRows.map(row=>[row.id,row.endpointIndex]))
 };
 const errorRows=[
  ...holdout.map(sample=>checkedFrom(sample,maps.a.get(sample.id),maps.b.get(sample.id),maps.end.get(sample.id))),
  ...protectionRows.map(row=>checkedFrom(row,row.aIndex,row.bIndex,row.endpointIndex))
 ];
 const obvious=newObviousErrors(errorRows);
 const changed=protectionRows.filter(row=>row.aIndex!==row.endpointIndex).map(row=>({
  id:row.id,seed:row.seed,step:row.step,kind:row.kind,life:row.life,oppLife:row.oppLife,
  damage:row.damage,impact:row.impact,attackerBp:row.attackerBp,
  beforeIndex:row.aIndex,afterIndex:row.endpointIndex,bIndex:row.bIndex,teacherIndex:row.chosen,
  before:actionText(row.actions[row.aIndex]),after:actionText(row.actions[row.endpointIndex]),
  teacher:actionText(row.actions[row.chosen]),b:actionText(row.actions[row.bIndex])
 }));
 const summary={
  paired,pairedError:error,weighted,holdoutSeeds:ROUND13_HOLDOUT_SEEDS,
  blockSeeds:new Set(holdBlocks.map(sample=>sample.seed)).size,
  blockImprovedSeeds:blockImproved,blockGainDecisions:gains.decisions,step118Gains:gains.step118,
  newObviousErrors:obvious,protectionComplete,regressionsDisclosed:true,
  block:behavior,regressions:dropped
 };
 const judged=judgeRound13(summary);
 const answers=explainRound13(summary);
 const trainKinds=transitionTable(train,maps.a,maps.end);
 const reserveKinds=transitionTable(reserve,maps.a,maps.end);
 const blockChanges=holdBlocks.filter(sample=>maps.a.get(sample.id)!==maps.end.get(sample.id)).map(sample=>({
  seed:sample.seed,step:sample.step,life:sample.life,damage:sample.damage,impact:sample.impact,attackerBp:sample.attackerBp,
  before:actionText(sample.actions[maps.a.get(sample.id)]),
  after:actionText(sample.actions[maps.end.get(sample.id)]),
  teacher:actionText(sample.actions[sample.chosen]),
  gained:maps.end.get(sample.id)===sample.chosen
 }));
 const afterFiles=fileHashes();
 for(const file of ROUND13_FROZEN_FILES){
  if(afterFiles[file]!==beforeFiles[file])throw Error('Frozen file changed: '+file);
 }
 const afterParams={
  a:parameterHash(modelA),zero:parameterHash(zero),b:parameterHash(modelB),endpoint:parameterHash(endpoint)
 };
 if(afterParams.endpoint!==models.endpoint.parameters||afterParams.a!==models.a.parameters||afterParams.b!==models.b.parameters||afterParams.zero!==models.zero.parameters)
  throw Error('Parameters changed during scoring');
 const result={
  createdAt:new Date().toISOString(),createdAtText:taipei(new Date()),
  verdict:answers.verdict,passed:judged.passed,recommend:judged.recommend,answers,
  endpoint:{version:endpoint.version,updates:endpoint.updates},
  models,zeroMatchesA:true,zeroActionsMatchA,scoresAgree,divergence,
  forwardText:percent(forwardA.exact)+' 到 '+percent(forwardEnd.exact),
  hashes:{
   before:{
    a:beforeFiles[ROUND11_A_FILE],b:beforeFiles[ROUND11_B_FILE],v2:beforeFiles[ROUND11_V2_FILE],
    zero:beforeFiles[ROUND11_ZERO_FILE],shuffle:beforeFiles[ROUND13_SHUFFLE_FILE],
    aParameters:models.a.parameters,shuffleParameters:models.endpoint.parameters
   },
   after:{
    a:afterFiles[ROUND11_A_FILE],b:afterFiles[ROUND11_B_FILE],v2:afterFiles[ROUND11_V2_FILE],
    zero:afterFiles[ROUND11_ZERO_FILE],shuffle:afterFiles[ROUND13_SHUFFLE_FILE],
    aParameters:afterParams.a,shuffleParameters:afterParams.endpoint
   }
  },
  data:{source:loaded.source,hashes:dataHashes,hashMatched,ledgerMatched:ledger.matched,distMatched,blockMatched},
  dataText:[
   '來源：'+(loaded.source==='round12-snapshot'?'第十二輪已保存的快照':'依第十一輪排程重播')+'。資料雜湊與第十二輪相符：是。逐場紀錄相符：是。分布相符：是。阻擋教師統計相符：是。',
   '訓練雜湊 '+dataHashes.train+'，'+train.length+' 筆，只供描述。',
   '保留雜湊 '+dataHashes.holdout+'，'+holdout.length+' 筆、'+ROUND13_HOLDOUT_SEEDS+' 個未參與更新的種子。這是主要評估。',
   'A 曾訓練過的資料雜湊 '+dataHashes.reserve+'，'+reserve.length+' 筆，只檢查行為保持。',
   '三份沒有合併。隔離 '+corpus.isolated.length+' 筆。未完成場次 '+corpus.failed.length+'。'
  ].join('\n'),
  comparison,paired,pairedError:error,directions,seedRows,kinds,block:behavior,
  blockImprovedSeeds:blockImproved,blockGainDecisions:gains.decisions,step118Gains:gains.step118,
  blockChanges,attackCounts,stops,obvious,protection,protectionChanges:changed,
  trainKinds,reserveKinds,weighted,judged,
  blockText:[
   '保留阻擋 '+holdBlocks.length+' 筆，'+summary.blockSeeds+' 個種子。教師不擋 '+behavior.teacherPass+'，A 保持 '+behavior.beforePass+'，終點保持 '+behavior.afterPass+'。',
   '教師有擋 '+behavior.teacherBlock+'。任意阻擋 A '+behavior.beforeAny+'、終點 '+behavior.afterAny+'。指定阻擋者的精確一致 A '+behavior.beforeExact+'、終點 '+behavior.afterExact+'。',
   '已證明等效的阻擋選擇不計入上面的精確一致。至少兩個合法阻擋者 '+behavior.multi+'。',
   '精確一致上升的原始種子：'+(blockImproved.join('、')||'無')+'。新對上教師 '+gains.decisions+' 筆，其中第 118 步 '+gains.step118+' 筆。',
   '動作有變的阻擋決策 '+blockChanges.length+' 筆，完整列在結果檔。'
  ].join('\n'),
  regressionText:dropped.length?dropped.map(row=>row.kind+' '+row.used+' 筆，'+percent(row.before)+' 到 '+percent(row.after)).join('\n'):'保留組沒有類型的精確一致率下降。',
  otherText:[
   '訓練 '+train.length+' 筆只作描述。A '+percent(exactRate(train,maps.a))+'，終點 '+percent(exactRate(train,maps.end))+'，B '+percent(exactRate(train,maps.b))+'。',
   '訓練各類 A 到終點：'+trainKinds.map(row=>row.kind+' '+percent(row.before)+' 到 '+percent(row.after)).join('、')+'。',
   'A 曾看過的 '+reserve.length+' 筆只檢查行為保持。A '+percent(exactRate(reserve,maps.a))+'，終點 '+percent(exactRate(reserve,maps.end))+'，B '+percent(exactRate(reserve,maps.b))+'。',
   '這組各類 A 到終點：'+reserveKinds.map(row=>row.kind+' '+percent(row.before)+' 到 '+percent(row.after)).join('、')+'。',
   '保留組上 B 的教師精確一致是 '+percent(exactRate(holdout,maps.b))+'。這是模仿參考。終點高於或低於這個數字，都不能說棋力高於 B。',
   '決策加權的保留比例是 '+percent(weighted.before)+' 到 '+percent(weighted.after)+'。種子等權配對差另行計算，不把這兩個比例相減當成配對結果。'
  ].join('\n'),
  stopText:[
   '保留組裡，終點嚴格選停止攻擊的有 '+stops.length+' 筆。第十二輪訓練前向紀錄是 '+ROUND13_RECORDED_STOP+' 筆。同分另計，不放進這份清單。',
   stopHeader(stops),
   'A 的攻擊分類：精確 '+attackCounts.A.exact+'，停止 '+attackCounts.A.stop+'，其他角色 '+attackCounts.A.otherCharacter+'，同分 '+attackCounts.A.tie+'。',
   '終點的攻擊分類：精確 '+attackCounts.endpoint.exact+'，停止 '+attackCounts.endpoint.stop+'，其他角色 '+attackCounts.endpoint.otherCharacter+'，同分 '+attackCounts.endpoint.tie+'。',
   'B 的攻擊分類只作參考：精確 '+attackCounts.B.exact+'，停止 '+attackCounts.B.stop+'，其他角色 '+attackCounts.B.otherCharacter+'，同分 '+attackCounts.B.tie+'。',
   ...stops.map(stopText)
  ].join('\n\n'),
  protectionText:[
   '八場既有敗局由原 B 對正式 v2 重播。洗牌終點只做影子評分，沒有接管任何一步。',
   '軌跡與第十一輪紀錄相符 '+(protection.filter(row=>row.sameTrajectory).length)+' 場。',
   '新增已核對錯誤 '+obvious.length+' 筆。這個 0 或非 0 只回答既有判準，不代替上面的整體評估。',
   '保護決策被終點改掉 '+changed.length+' 筆。',
   ...changed.map(row=>row.id+'：A['+row.beforeIndex+'] '+row.before+'，終點['+row.afterIndex+'] '+row.after+'，B['+row.bIndex+'] '+row.b+'，教師['+row.teacherIndex+'] '+row.teacher)
  ].join('\n')
 };
 writeFileSync(ROUND13_RESULT_FILE,JSON.stringify(result,null,2));
 writeFileSync(ROUND13_REPORT_FILE,renderRound13(result));
 console.log(answers.verdict);
 console.log('1',answers.q1);
 console.log('2',answers.q2);
 console.log('3',answers.q3);
 console.log('4',answers.q4);
 console.log('5',answers.q5);
 console.log('elapsed',Math.round((performance.now()-started)/1000)+'s');
}
function checkedFrom(sample,aIndex,bIndex,endpointIndex){
 const row={
  ...sample,teacherIndex:sample.chosen,blockers:sample.blockers||blockersFrom(sample),
  aIndex,bIndex,endpointIndex
 };
 row.protect=protectClass(row);
 row.publicLethalKept=publicLethalKept(row);
 return row;
}
function stopHeader(stops){
 const agreed=(stops||[]).filter(row=>row.choices.a===row.choices.teacher&&row.choices.b===row.choices.teacher).length;
 const models=(stops||[]).filter(row=>row.choices.a===row.choices.b&&row.choices.a!==row.choices.teacher).length;
 return '其中 A、B 與教師選擇相同、只有終點改停的有 '+agreed+' 筆。A 與 B 相同但和教師不同、終點也改停的有 '+models+' 筆。這些都沒有進入既有已核對錯誤判準，也不因總一致率上升而略過。';
}
function stopText(row){
 const pub=row.public||{};
 const front=(pub.front||[]).map(card=>card.uid+' '+card.cardId+' BP '+card.bp+(card.ready?' 可動':' 橫置')).join('；')||'場上無角色';
 return [
  row.id+'，種子 '+row.seed+'，步 '+row.step+'，分類 '+row.bucket+'。',
  '教師 '+row.choices.teacher+'。A '+row.choices.a+'。B '+row.choices.b+'。終點 '+row.choices.endpoint+'。',
  '教師攻擊減停止：A '+(row.gaps.a?.toFixed(4)??'無')+'，B '+(row.gaps.b?.toFixed(4)??'無')+'，終點 '+(row.gaps.endpoint?.toFixed(4)??'無')+'。終點所選減教師 '+(row.margins.endpoint?.toFixed(4)??'無')+'。',
  '回合 '+pub.turn+'，階段 '+pub.phase+'，待處理 '+(pub.pending||'無')+'，行動方 '+pub.active+'，我方生命 '+pub.life+'，對手生命 '+pub.oppLife+'，手牌 '+pub.hand+'／'+pub.oppHand+'，傷害 '+(pub.damage??'無')+'，impact '+(pub.impact??'無')+'，攻擊者 '+(pub.attackerId||'尚未指定')+' BP '+(pub.attackerBp??'無')+'。場上：'+front+'。'+(pub.damage==null?' 這一步是在選攻擊者，戰鬥傷害還沒有結算。':''),
  row.error?'已核對錯誤 '+row.error+'。':'沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。'
 ].join('\n');
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
