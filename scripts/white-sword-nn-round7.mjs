#!/usr/bin/env node
// Round 7 confirms one frozen actor against A. It does not train or edit weights.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {planRound7} from '../training/white-sword-nn/budget.mjs';
import {pairedDelta,projectedPrecision,seedDispersion,seedSummary,tCritical} from '../training/white-sword-nn/cluster.mjs';
import {
 MEMORY_WORKER_RSS,PLAN_SAFETY,ROUND7_BASELINE_HASH,ROUND7_CANDIDATE_HASH,
 ROUND7_CANDIDATE_UPDATES,ROUND7_CANDIDATE_VERSION,ROUND7_CONFIRM_COUNT,ROUND7_WALL_MS,WORKER_CAP
} from '../training/white-sword-nn/constants.mjs';
import {loadNet,packNet,unpackNet} from '../training/white-sword-nn/net.mjs';
import {compactGame,playMatch} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {splitOutcomes} from '../training/white-sword-nn/ppo.mjs';
import {
 BENCH_NN_SEED,EVAL_CELLS,ROUND7_CONFIRM_SEEDS,ROUND7_RULE,assertExperimentSeed
} from '../training/white-sword-nn/protocol.mjs';
import {judgeRound7,renderRound7} from '../training/white-sword-nn/report.mjs';
import {addAnomalies} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const FROZEN_FILE='training/white-sword-nn/weights/round2/a-frozen.json';
const CANDIDATE_FILE='training/white-sword-nn/weights/round6/line-2/actor-after-96.json';
const ROUND6_JSON='docs/white-sword-ai/nn-round6.json';
const PLAN_JSON='docs/white-sword-ai/nn-round7-plan.json';
const REPORT_JSON='docs/white-sword-ai/nn-round7.json';
const REPORT_MD='docs/white-sword-ai/NN-ROUND7.md';
const CHUNK_SEEDS=64;
const PROTECTED=[
 FROZEN_FILE,CANDIDATE_FILE,
 'training/white-sword-nn/weights/round2','training/white-sword-nn/weights/round4',
 'training/white-sword-nn/weights/round6',
 'docs/white-sword-ai/nn-round4.json','docs/white-sword-ai/NN-ROUND4.md',
 'docs/white-sword-ai/nn-round5.json','docs/white-sword-ai/NN-ROUND5.md',
 'docs/white-sword-ai/nn-round6.json','docs/white-sword-ai/NN-ROUND6.md',
 'docs/white-sword-ai/nn-round6-plan.json'
];

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
function job(spec,nets){
 return {
  spec,
  seatNets:(nets||[null,null]).map(net=>net?packNet(net):null),
  seatCritics:[null,null]
 };
}
function playJob(item){
 const nets=(item.seatNets||[]).map(packed=>packed?unpackNet(packed):null);
 return playMatch({...item.spec,nets,critics:[null,null],progress:true});
}
async function playMany(items,workers,retries){
 if(items.length<=1||workers<=1)return items.map(playJob);
 try{
  return await runPool(items,workers);
 }catch(error){
  retries.fallbacks+=1;
  retries.fallbackErrors.push(String(error?.message||error));
  console.log('parallel games failed, continuing in this process:',error?.message||error);
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
function rateInterval(rows){
 const delta=pairedDelta(rows.map(row=>({seed:row.seed,p:0.5})),rows);
 if(delta.low==null)return {mean:delta.mean,low:null,high:null,seeds:delta.seeds};
 return {mean:delta.mean+0.5,low:delta.low+0.5,high:delta.high+0.5,seeds:delta.seeds};
}
function developmentPrecision(plannedSeeds){
 const data=JSON.parse(readFileSync(ROUND6_JSON,'utf8'));
 const line=(data.lines||[]).find(item=>item.line===2);
 const rates=(line?.perSeed||[]).filter(row=>row.n===4&&row.unfinished===0&&Number.isFinite(row.p)).map(row=>row.p);
 const dispersion=seedDispersion(rates);
 return {
  source:ROUND6_JSON,line:2,completeSeeds:rates.length,dispersion,
  draft:projectedPrecision(dispersion,ROUND7_CONFIRM_COUNT),
  projection:projectedPrecision(dispersion,plannedSeeds)
 };
}
async function main(){
 if((process.argv[2]||'trial')!=='trial')throw Error('Use trial');
 const protectedBefore=git(['status','--porcelain','--',...PROTECTED]);
 if(protectedBefore)throw Error('protected round files are dirty');
 const started=performance.now();
 const baseline=identity(FROZEN_FILE);
 const candidateInfo=identity(CANDIDATE_FILE);
 if(baseline.sha256!==ROUND7_BASELINE_HASH||baseline.version!=='nn-a-r2'||baseline.updates!==9030){
  throw Error('baseline is not frozen A');
 }
 if(candidateInfo.sha256!==ROUND7_CANDIDATE_HASH||candidateInfo.version!==ROUND7_CANDIDATE_VERSION||candidateInfo.updates!==ROUND7_CANDIDATE_UPDATES){
  throw Error('candidate is not the line-2 endpoint');
 }
 const codeCommit=git(['rev-parse','HEAD']);
 const frozen=loadNet(JSON.parse(readFileSync(FROZEN_FILE,'utf8')));
 const candidate=loadNet(JSON.parse(readFileSync(CANDIDATE_FILE,'utf8')));
 const workers=workersNow();
 const retries={fallbacks:0,fallbackErrors:[],workerChanges:[]};
 const benchStarted=performance.now();
 const benchPlayed=await playMany([job({
  seed:assertExperimentSeed(BENCH_NN_SEED,'bench'),first:0,mode:'eval',learnerSeat:0,
  keepActions:false,recordSeats:[],teacherSeats:[],progress:false,
  seats:[nnSeat('greedy'),nnSeat('greedy')]
 },[candidate,frozen])],1,retries);
 const benchMs=performance.now()-benchStarted;
 const bench=benchPlayed[0];
 const benchFinished=bench?.status==='finished'&&(bench.winner===0||bench.winner===1);
 const remaining=ROUND7_WALL_MS-(performance.now()-started);
 const plan=benchFinished
  ?planRound7({wallMs:remaining,evalMs:benchMs,workers,safety:PLAN_SAFETY,seedCap:ROUND7_CONFIRM_COUNT})
  :{seeds:0,games:0,cells:4,workers,wallMs:remaining,safety:PLAN_SAFETY,seedCap:ROUND7_CONFIRM_COUNT,estimatedMs:null,evalMs:benchMs,fits:false};
 const seeds=ROUND7_CONFIRM_SEEDS.slice(0,plan.seeds);
 const precision=developmentPrecision(plan.seeds);
 const resourceGap=!benchFinished
  ?'測速對局沒有正常終局，確認沒有開打。'
  :plan.fits?(plan.seeds===ROUND7_CONFIRM_COUNT?'':'牆鐘只容納前 '+plan.seeds+' 個種子，已在開打前鎖定。')
  :'一場都放不進剩餘牆鐘，確認沒有開打。';
 const planRecord={
  createdAt:new Date().toISOString(),codeCommit,
  baseline,candidate:candidateInfo,
  bench:{seed:BENCH_NN_SEED,finished:benchFinished,elapsedMs:benchMs,status:bench?.status||'missing'},
  timing:{evalMs:benchMs,workers,wallMs:remaining,safety:PLAN_SAFETY,critical:tCritical(Math.max(2,plan.seeds||ROUND7_CONFIRM_COUNT))},
  plan,seeds,registeredSeeds:[...ROUND7_CONFIRM_SEEDS],precision,
  analysis:{
   unit:'original-seed',cells:4,
   criticalRule:'樣本數大於 30 時 tCritical 回傳 1.96。標準誤使用 n-1 的樣本標準差。判斷區間不截斷。',
   decision:'相對 50% 的差，下限高於 0 是重現，上限低於 0 是弱於 A，包含 0 是不能確認。'
  },
  rule:ROUND7_RULE
 };
 writeFileSync(PLAN_JSON,JSON.stringify(planRecord,null,2)+'\n');
 console.log('plan locked',plan.seeds,'seeds',plan.games,'games',resourceGap||'full draft');
 const played=[];
 let runError=null;
 let active=workers;
 if(plan.fits){
  try{
   for(let offset=0;offset<seeds.length;offset+=CHUNK_SEEDS){
    const now=workersNow();
    if(now!==active){
     retries.workerChanges.push({games:played.length,from:active,to:now});
     active=now;
    }
    const slice=seeds.slice(offset,offset+CHUNK_SEEDS);
    const items=[];
    for(const seed of slice){
     assertExperimentSeed(seed,'round7-confirm');
     for(const cell of EVAL_CELLS){
      const seats=[nnSeat('greedy'),nnSeat('greedy')];
      const nets=[frozen,frozen];
      nets[cell.learnerSeat]=candidate;
      items.push(job({
       seed,first:cell.first,mode:'eval',learnerSeat:cell.learnerSeat,
       keepActions:false,recordSeats:[],teacherSeats:[],progress:false,seats
      },nets));
     }
    }
    console.log('chunk',Math.floor(offset/CHUNK_SEEDS)+1,'seeds',slice.length);
    played.push(...await playMany(items,active,retries));
   }
  }catch(error){
   runError=String(error?.message||error);
   console.log('confirmation stopped:',runError);
  }
 }
 const split=splitOutcomes(played);
 const compacts=played.map(compactGame);
 const summary=seedSummary(split.done,learnerWins);
 const versusHalf=pairedDelta(summary.rows.map(row=>({seed:row.seed,p:0.5})),summary.rows);
 const winInterval=rateInterval(summary.rows);
 const done=new Set(split.done);
 const byKey=new Map(played.map(game=>[game.seed+':'+game.learnerSeat+':'+game.first,game]));
 const perSeed=seeds.map(seed=>{
  const cells=EVAL_CELLS.map(cell=>{
   const game=byKey.get(seed+':'+cell.learnerSeat+':'+cell.first)||null;
   const ok=game&&done.has(game);
   return {
    learnerSeat:cell.learnerSeat,first:cell.first,
    mark:ok?(game.winner===game.learnerSeat?'勝':'敗'):'未完成',
    status:game?.status||'missing',winner:game?.winner??null,endReason:game?.endReason||null,
    steps:game?.steps??0,decisions:game?.decisions??0
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
 const anomalies=played.length?addAnomalies(compacts):{};
 anomalies.unfinished=split.unfinished.length;
 const completeSeeds=summary.rows.filter(row=>row.n===EVAL_CELLS.length&&row.unfinished===0).length;
 const baselineAfter=identity(FROZEN_FILE);
 const candidateAfter=identity(CANDIDATE_FILE);
 const protectedAfter=git(['status','--porcelain','--',...PROTECTED]);
 const modelAnomaly=baselineAfter.sha256!==baseline.sha256||candidateAfter.sha256!==candidate.sha256||protectedAfter!==protectedBefore;
 let judgment=judgeRound7({
  plannedSeeds:plan.seeds,plannedGames:plan.games,finishedGames:split.done.length,
  unfinished:split.unfinished.length,seeds:seeds.length,completeSeeds,delta:versusHalf
 });
 if(runError)judgment={kind:'incomplete',delta:versusHalf,reason:runError};
 if(modelAnomaly)judgment={kind:'incomplete',delta:versusHalf,reason:'權重或受保護紀錄在執行期間改變。'};
 const record={
  createdAt:new Date().toISOString(),elapsedMs:performance.now()-started,codeCommit,
  baseline,candidate:candidateInfo,baselineAfter,candidateAfter,
  bench:{seed:BENCH_NN_SEED,finished:benchFinished,elapsedMs:benchMs,status:bench?.status||'missing'},
  plan,seeds,precision,resourceGap,retries,judgment,
  summary,winInterval,versusHalf,
  first:seedSummary(split.done.filter(game=>game.learnerSeat===game.first),learnerWins),
  second:seedSummary(split.done.filter(game=>game.learnerSeat!==game.first),learnerWins),
  seat0:seedSummary(split.done.filter(game=>game.learnerSeat===0),learnerWins),
  seat1:seedSummary(split.done.filter(game=>game.learnerSeat===1),learnerWins),
  plannedGames:plan.games,finishedGames:split.done.length,completeSeeds,
  unfinished:split.unfinished,anomalies,perSeed,games
 };
 writeFileSync(REPORT_JSON,JSON.stringify(record,null,2)+'\n');
 writeFileSync(REPORT_MD,renderRound7(record));
 console.log(JSON.stringify({
  kind:judgment.kind,seeds:plan.seeds,finished:split.done.length,
  mean:winInterval.mean,low:winInterval.low,high:winInterval.high,
  elapsedMs:record.elapsedMs,fallbacks:retries.fallbacks,modelAnomaly
 }));
 if(modelAnomaly)process.exitCode=1;
}

main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
