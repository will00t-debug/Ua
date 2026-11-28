#!/usr/bin/env node
// Round 5 measures one frozen actor against A. It does not train or edit weights.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {round4Opponent} from '../training/white-sword-nn/budget.mjs';
import {pairedDelta,seedSummary} from '../training/white-sword-nn/cluster.mjs';
import {
 MEMORY_WORKER_RSS,PPO_BATCH_GAMES,ROUND5_CANDIDATE_GAMES,WORKER_CAP
} from '../training/white-sword-nn/constants.mjs';
import {loadNet,packNet,unpackNet} from '../training/white-sword-nn/net.mjs';
import {compactGame,playMatch} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {fixedBatchKl,splitOutcomes} from '../training/white-sword-nn/ppo.mjs';
import {
 EVAL_CELLS,ROUND4_SELF_SEEDS,ROUND5_DEV_SEEDS,assertExperimentSeed
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerKlFix,answerRound5Confirm,answerRound5Strength,judgeRound5,renderRound5
} from '../training/white-sword-nn/report.mjs';
import {addAnomalies} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const FROZEN_FILE='training/white-sword-nn/weights/round2/a-frozen.json';
const CANDIDATE_FILE='training/white-sword-nn/weights/round4/actor-after-'+ROUND5_CANDIDATE_GAMES+'.json';
const ROUND4_JSON='docs/white-sword-ai/nn-round4.json';
const WEIGHT_DIR='training/white-sword-nn/weights/round4';
const REPORT_JSON='docs/white-sword-ai/nn-round5.json';
const REPORT_MD='docs/white-sword-ai/NN-ROUND5.md';

function git(args){
 return execFileSync('git',args,{encoding:'utf8'}).trim();
}
function identity(file){
 const raw=readFileSync(file);
 const net=JSON.parse(raw.toString('utf8'));
 return {
  file,bytes:raw.length,
  sha256:createHash('sha256').update(raw).digest('hex'),
  version:net.version,updates:net.updates,seed:net.seed,format:net.format,
  commit:git(['log','-1','--format=%H','--',file])
 };
}
function nnSeat(policy){
 return {deckId:'white-sword',kind:'nn',explore:0,policy};
}
function job(spec,nets,critics){
 return {
  spec,
  seatNets:(nets||[null,null]).map(net=>net?packNet(net):null),
  seatCritics:(critics||[null,null]).map(net=>net?packNet(net):null)
 };
}
function playJob(item){
 const nets=(item.seatNets||[]).map(packed=>packed?unpackNet(packed):null);
 const critics=(item.seatCritics||[]).map(packed=>packed?unpackNet(packed):null);
 return playMatch({...item.spec,nets,critics,progress:false});
}
async function playMany(items,workers){
 if(items.length<=1||workers<=1)return items.map(playJob);
 try{
  return await runPool(items,workers);
 }catch(error){
  console.log('parallel games failed, continuing in this process:',error.message);
  return items.map(playJob);
 }
}
function learnerWins(game){
 return game.learnerSeat;
}
function workersNow(){
 const rss=memoryUsage().rss;
 return rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
}
function batchFiles(batchIndex){
 return {
  behavior:WEIGHT_DIR+'/actor-after-'+(batchIndex*PPO_BATCH_GAMES)+'.json',
  critic:WEIGHT_DIR+'/critic-after-'+(batchIndex*PPO_BATCH_GAMES)+'.json',
  updated:WEIGHT_DIR+'/actor-after-'+((batchIndex+1)*PPO_BATCH_GAMES)+'.json',
  lagged:WEIGHT_DIR+'/actor-after-'+((batchIndex-1)*PPO_BATCH_GAMES)+'.json'
 };
}
function layout(kind,learnerSeat,behavior,lagged){
 if(kind==='self'){
  return {seats:[nnSeat('softmax'),nnSeat('softmax')],nets:[behavior,behavior],learnerSeat:null,recordSeats:[0,1]};
 }
 const seats=[nnSeat('greedy'),nnSeat('greedy')];
 const nets=[null,null];
 seats[learnerSeat]=nnSeat('softmax');
 nets[learnerSeat]=behavior;
 if(kind==='v2')seats[1-learnerSeat]={deckId:'white-sword',kind:'v2',explore:0};
 else nets[1-learnerSeat]=lagged;
 return {seats,nets,learnerSeat,recordSeats:[learnerSeat]};
}

async function replayBatches(record,workers){
 const batches=[];
 let steps=0,decisions=0,games=0,finished=0;
 for(let batchIndex=0;batchIndex<record.batches.length;batchIndex++){
  const saved=record.batches[batchIndex];
  const kind=round4Opponent(batchIndex,{v2Finished:record.v2Finished,snapshots:Array.from({length:batchIndex})});
  if(kind!==saved.kind)throw Error('replay opponent left the recorded schedule');
  const files=batchFiles(batchIndex);
  const behavior=loadNet(files.behavior);
  behavior.version='ppo-b'+batchIndex+'@'+behavior.updates;
  const behaviorCritic=loadNet(files.critic);
  const lagged=kind==='snapshot'?loadNet(files.lagged):null;
  const items=[];
  for(let gameIndex=0;gameIndex<PPO_BATCH_GAMES;gameIndex++){
   const global=batchIndex*PPO_BATCH_GAMES+gameIndex;
   const seed=assertExperimentSeed(ROUND4_SELF_SEEDS[global],'round4-train');
   const learnerSeat=Math.floor(gameIndex/2)%2;
   const placed=layout(kind,learnerSeat,behavior,lagged);
   const critics=[null,null];
   if(kind==='self')critics[0]=critics[1]=behaviorCritic;
   else critics[learnerSeat]=behaviorCritic;
   items.push(job({
    seed,first:gameIndex%2,mode:'train',learnerSeat:placed.learnerSeat,
    recordSeats:placed.recordSeats,teacherSeats:[],progress:false,
    behaviorVersion:behavior.version,behaviorUpdates:behavior.updates,
    exploreSeed:(seed*17+global)>>>0,seats:placed.seats
   },placed.nets,critics));
  }
  console.log('replay batch',batchIndex,kind);
  const played=await playMany(items,workers);
  const split=splitOutcomes(played);
  for(const game of played){
   steps+=game.steps||0;
   decisions+=game.decisions||0;
  }
  games+=played.length;
  finished+=split.done.length;
  const samples=split.done.flatMap(game=>game.ppo||[]);
  for(const game of played)game.ppo=[];
  const updated=loadNet(files.updated);
  const fixed=samples.length?fixedBatchKl(updated,samples):null;
  batches.push({
   batch:batchIndex,gamesPlayed:(batchIndex+1)*PPO_BATCH_GAMES,kind,
   samples:samples.length,recordedSamples:saved.samples,recordedKind:saved.kind,
   finished:split.done.length,recordedKl:saved.kl,recordedEpochs:saved.epochs,
   recordedStopped:saved.klStopped,fixed
  });
 }
 const accepted=steps===record.steps&&decisions===record.decisions&&games===record.games&&
  finished===record.finished&&batches.every(batch=>
   batch.samples===batch.recordedSamples&&batch.kind===batch.recordedKind&&batch.finished===PPO_BATCH_GAMES
  );
 if(!accepted)for(const batch of batches)batch.fixed=null;
 return {accepted,steps,decisions,games,finished,recordedSteps:record.steps,recordedDecisions:record.decisions,batches};
}

function recordedBatches(round4){
 return {
  steps:round4.train.steps,decisions:round4.train.decisions,
  games:round4.train.games,finished:round4.train.finished,
  v2Finished:round4.plan.v2Finished===true,
  batches:round4.train.batches.map(batch=>({
   kind:batch.kind,samples:batch.samples,kl:batch.kl,epochs:batch.epochs,klStopped:batch.klStopped
  }))
 };
}

async function evaluate(candidate,frozen,workers){
 const items=[];
 for(const seed of ROUND5_DEV_SEEDS){
  for(const cell of EVAL_CELLS){
   const seats=[nnSeat('greedy'),nnSeat('greedy')];
   const nets=[frozen,frozen];
   nets[cell.learnerSeat]=candidate;
   items.push(job({
    seed:assertExperimentSeed(seed,'round5-dev'),first:cell.first,mode:'eval',
    learnerSeat:cell.learnerSeat,keepActions:false,recordSeats:[],teacherSeats:[],
    progress:false,seats
   },nets,[null,null]));
  }
 }
 console.log('eval',items.length,'games');
 const played=await playMany(items,workers);
 const split=splitOutcomes(played);
 const compacts=played.map(compactGame);
 const summary=seedSummary(split.done,learnerWins);
 const versusHalf=pairedDelta(summary.rows.map(row=>({seed:row.seed,p:0.5})),summary.rows);
 const done=new Set(split.done);
 const byKey=new Map(played.map(game=>[game.seed+':'+game.learnerSeat+':'+game.first,game]));
 const perSeed=ROUND5_DEV_SEEDS.map(seed=>{
  const cells=EVAL_CELLS.map(cell=>{
   const game=byKey.get(seed+':'+cell.learnerSeat+':'+cell.first)||null;
   const ok=game&&done.has(game);
   return {
    learnerSeat:cell.learnerSeat,first:cell.first,
    mark:ok?(game.winner===game.learnerSeat?'勝':'敗'):'未完成',
    status:game?.status||'missing',winner:game?.winner??null,endReason:game?.endReason||null
   };
  });
  const row=summary.rows.find(item=>item.seed===seed)||null;
  return {seed,p:row?.p??null,n:row?.n??0,unfinished:row?.unfinished??cells.filter(cell=>cell.mark==='未完成').length,cells};
 });
 const games=played.map(game=>({
  seed:game.seed,first:game.first,learnerSeat:game.learnerSeat,status:game.status,
  winner:game.winner,endReason:game.endReason,steps:game.steps,decisions:game.decisions,
  anomalies:{...game.anomalies}
 }));
 const anomalies=addAnomalies(compacts);
 anomalies.unfinished=split.unfinished.length;
 return {
  summary,versusHalf,perSeed,games,anomalies,unfinished:split.unfinished,
  finishedGames:split.done.length,
  first:seedSummary(split.done.filter(game=>(game.learnerSeat===game.first)===true),learnerWins),
  second:seedSummary(split.done.filter(game=>(game.learnerSeat===game.first)===false),learnerWins),
  seat0:seedSummary(split.done.filter(game=>game.learnerSeat===0),learnerWins),
  seat1:seedSummary(split.done.filter(game=>game.learnerSeat===1),learnerWins),
  completeSeeds:summary.rows.filter(row=>row.n===EVAL_CELLS.length&&row.unfinished===0).length
 };
}

async function main(){
 if((process.argv[2]||'trial')!=='trial')throw Error('Use trial');
 const dirty=git(['status','--porcelain','--',FROZEN_FILE,CANDIDATE_FILE]);
 if(dirty)throw Error('frozen weight files are dirty');
 const started=performance.now();
 const baseline=identity(FROZEN_FILE);
 const candidateInfo=identity(CANDIDATE_FILE);
 if(baseline.version!=='nn-a-r2'||baseline.updates!==9030)throw Error('baseline is not frozen A');
 if(candidateInfo.version!=='nn-ppo-actor-r4'||candidateInfo.updates!==25494)throw Error('candidate is not the 80-game actor');
 const codeCommit=git(['rev-parse','HEAD']);
 const round4=JSON.parse(readFileSync(ROUND4_JSON,'utf8'));
 const workers=workersNow();
 console.log('workers',workers,'code',codeCommit);
 let diagnosis;
 try{
  diagnosis=await replayBatches(recordedBatches(round4),workers);
 }catch(error){
  diagnosis={accepted:false,error:String(error?.message||error),batches:[]};
  console.error('replay stopped:',diagnosis.error);
 }
 const frozen=loadNet(FROZEN_FILE);
 const candidate=loadNet(CANDIDATE_FILE);
 const evalResult=await evaluate(candidate,frozen,workers);
 const baselineAfter=identity(FROZEN_FILE);
 const candidateAfter=identity(CANDIDATE_FILE);
 const intact=baselineAfter.sha256===baseline.sha256&&candidateAfter.sha256===candidateInfo.sha256;
 let judgment=judgeRound5({
  plannedGames:ROUND5_DEV_SEEDS.length*EVAL_CELLS.length,
  finishedGames:evalResult.finishedGames,
  unfinished:evalResult.unfinished.length,
  seeds:evalResult.summary.seeds,
  completeSeeds:evalResult.completeSeeds,
  delta:evalResult.versusHalf
 });
 if(!intact){
  judgment={kind:'incomplete',delta:evalResult.versusHalf,reason:'權重檔在執行期間變了。'};
 }
 const summary={
  createdAt:new Date().toISOString(),round:5,codeCommit,
  baseline,candidate:candidateInfo,baselineAfter,candidateAfter,intact,
  diagnosis,judgment,
  plannedGames:ROUND5_DEV_SEEDS.length*EVAL_CELLS.length,
  finishedGames:evalResult.finishedGames,
  summary:evalResult.summary,versusHalf:evalResult.versusHalf,
  first:evalResult.first,second:evalResult.second,seat0:evalResult.seat0,seat1:evalResult.seat1,
  perSeed:evalResult.perSeed,games:evalResult.games,unfinished:evalResult.unfinished,
  anomalies:evalResult.anomalies,
  klAnswer:answerKlFix(diagnosis),
  strengthAnswer:answerRound5Strength(judgment),
  confirmAnswer:answerRound5Confirm(judgment),
  elapsedMs:performance.now()-started
 };
 if(!REPORT_JSON.endsWith('nn-round5.json')||!REPORT_MD.endsWith('NN-ROUND5.md'))throw Error('refusing to write outside round 5');
 mkdirSync('docs/white-sword-ai',{recursive:true});
 writeFileSync(REPORT_JSON,JSON.stringify(summary,null,2));
 writeFileSync(REPORT_MD,renderRound5(summary));
 console.log(renderRound5(summary));
 console.log('wrote',REPORT_MD);
 console.log('total',Math.round(summary.elapsedMs),'ms');
 if(!intact)process.exitCode=1;
}

main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
