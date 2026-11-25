import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {planRound7} from '../training/white-sword-nn/budget.mjs';
import {projectedPrecision,seedDispersion,tCritical} from '../training/white-sword-nn/cluster.mjs';
import {
 PLAN_SAFETY,ROUND7_BASELINE_HASH,ROUND7_CANDIDATE_HASH,ROUND7_CANDIDATE_UPDATES,
 ROUND7_CANDIDATE_VERSION,ROUND7_CONFIRM_COUNT,ROUND7_FRESH_COUNT,ROUND7_FRESH_START
} from '../training/white-sword-nn/constants.mjs';
import {splitForSeed} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {
 ROUND4_CONFIRM_SEEDS,ROUND4_DEV_SEEDS,ROUND4_SELF_SEEDS,ROUND5_DEV_SEEDS,ROUND6_DEV_SEEDS,
 ROUND6_TRAIN_SEEDS,ROUND7_CONFIRM_SEEDS,ROUND7_FRESH_SEEDS,ROUND7_RULE,TEST_SEEDS,
 allExperimentSeeds,assertExperimentSeed,reservedHit
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerRound7Next,answerRound7Scope,answerRound7Strength,confirmationIntact,judgeRound7,renderRound7
} from '../training/white-sword-nn/report.mjs';

test('round-7 confirmation seeds are new and ordered',()=>{
 assert.equal(ROUND7_CONFIRM_SEEDS.length,ROUND7_CONFIRM_COUNT);
 assert.equal(ROUND7_FRESH_SEEDS.length,ROUND7_FRESH_COUNT);
 assert.deepEqual(ROUND7_CONFIRM_SEEDS.slice(0,12),[...ROUND4_CONFIRM_SEEDS]);
 assert.equal(ROUND7_CONFIRM_SEEDS[0],191400);
 assert.equal(ROUND7_CONFIRM_SEEDS[11],191411);
 assert.equal(ROUND7_CONFIRM_SEEDS[12],ROUND7_FRESH_START);
 assert.equal(ROUND7_CONFIRM_SEEDS.at(-1),ROUND7_FRESH_START+ROUND7_FRESH_COUNT-1);
 const used=new Set([
  ...ROUND4_DEV_SEEDS,...ROUND4_SELF_SEEDS,...ROUND5_DEV_SEEDS,...ROUND6_DEV_SEEDS,
  ...ROUND6_TRAIN_SEEDS.flat(),...TEST_SEEDS
 ]);
 const seen=new Set();
 for(const seed of ROUND7_FRESH_SEEDS){
  assert.equal(seen.has(seed),false);
  seen.add(seed);
  assert.equal(used.has(seed),false);
  assert.equal(splitForSeed(seed),'unassigned');
  assert.equal(reservedHit(seed),null);
  assertExperimentSeed(seed);
  assertExperimentSeed(seed,'round7-confirm');
  assert.throws(()=>assertExperimentSeed(seed,'round6-dev'));
  assert.throws(()=>assertExperimentSeed(seed,'round5-dev'));
  assert.throws(()=>assertExperimentSeed(seed,'round4-confirm'));
 }
 for(const seed of ROUND4_CONFIRM_SEEDS){
  assertExperimentSeed(seed,'round7-confirm');
  assertExperimentSeed(seed,'round4-confirm');
 }
 for(const seed of [...ROUND6_DEV_SEEDS,...ROUND5_DEV_SEEDS,...ROUND6_TRAIN_SEEDS[0],...ROUND4_SELF_SEEDS]){
  assert.throws(()=>assertExperimentSeed(seed,'round7-confirm'));
 }
 const listed=allExperimentSeeds();
 assert.equal(new Set(listed).size,listed.length);
 assert.equal(listed.filter(seed=>seed===191400).length,1);
 assert.match(ROUND7_RULE,/191400–191411/);
 assert.match(ROUND7_RULE,/192800–192863/);
 assert.match(ROUND7_RULE,/56\.3%/);
 assert.match(ROUND7_RULE,/1\.96/);
 assert.match(ROUND7_RULE,/這一輪新登記的/);
});

test('the confirmation sample is locked from the wall clock',()=>{
 const open=planRound7({wallMs:1e15,evalMs:400,workers:2});
 assert.equal(open.fits,true);
 assert.equal(open.seeds,256);
 assert.equal(open.games,1024);
 assert.equal(open.safety,PLAN_SAFETY);
 const none=planRound7({wallMs:1000,evalMs:5000,workers:1});
 assert.equal(none.fits,false);
 assert.equal(none.seeds,0);
 const mid=planRound7({wallMs:50000,evalMs:400,workers:2});
 assert.equal(mid.seeds,44);
 assert.equal(mid.games,176);
 assert.equal(mid.fits,true);
 const source=readFileSync(new URL('../training/white-sword-nn/budget.mjs',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('export function planRound7'));
 assert.equal(body.includes('勝'),false);
});

test('planning precision uses the development standard deviation only',()=>{
 const rates=[0.25,0.75,0.25,0.75];
 const dispersion=seedDispersion(rates);
 assert.equal(dispersion.n,4);
 assert.equal(dispersion.mean,0.5);
 assert.ok(Math.abs(dispersion.sd-Math.sqrt(0.25/3))<1e-12);
 assert.equal(tCritical(256),1.96);
 const plan=projectedPrecision(dispersion,256);
 assert.equal(plan.t,1.96);
 assert.ok(Math.abs(plan.se-dispersion.sd/16)<1e-12);
 assert.equal(plan.pointClears,false);
 assert.equal(plan.lowerClears,false);
 assert.match(plan.assumption,/不保證/);
 const strong=projectedPrecision(seedDispersion(Array.from({length:64},()=>0.75)),256);
 assert.equal(strong.pointClears,true);
 assert.equal(strong.se,0);
});

test('the confirmation reading is fixed before the games',()=>{
 const ready={plannedSeeds:4,plannedGames:16,finishedGames:16,unfinished:0,seeds:4,completeSeeds:4};
 const better=judgeRound7({...ready,delta:{seeds:4,mean:0.25,low:0.02,high:0.4}});
 assert.equal(better.kind,'reproduced');
 assert.match(answerRound7Strength(better),/區間下限高於 50%/);
 assert.match(answerRound7Scope(better),/這個凍結候選相對模仿起點 A 的改善，在獨立確認資料上重現/);
 assert.match(answerRound7Scope(better),/尚不能支持 PPO 每次訓練都會變強/);
 assert.match(answerRound7Scope(better),/已超越正式 v2/);
 assert.match(answerRound7Next(better),/值得規劃對正式 v2 與多種對手牌型的下一階段驗證/);
 assert.match(answerRound7Next(better),/本輪沒有做那項驗證/);
 const worse=judgeRound7({...ready,delta:{seeds:4,mean:-0.2,low:-0.3,high:-0.01}});
 assert.equal(worse.kind,'supports-weaker');
 assert.match(answerRound7Strength(worse),/停止推進這個候選/);
 assert.match(answerRound7Next(worse),/^沒有/);
 const open=judgeRound7({...ready,delta:{seeds:4,mean:0.06,low:-0.02,high:0.14}});
 assert.equal(open.kind,'not-confirmed');
 assert.match(answerRound7Strength(open),/不能確認/);
 assert.match(answerRound7Strength(open),/56\.3%/);
 assert.match(answerRound7Next(open),/^沒有/);
 const partial=judgeRound7({...ready,finishedGames:12,unfinished:4,completeSeeds:3,delta:{seeds:3,mean:0.3,low:0.1,high:0.5}});
 assert.equal(partial.kind,'incomplete');
 assert.match(answerRound7Strength(partial),/評估未完成/);
 assert.match(answerRound7Next(partial),/^沒有/);
 const text=renderRound7({
  createdAt:'2026-11-25T16:00:00.000Z',judgment:open,plan:{seeds:4,games:16},
  baseline:{file:'a',version:'nn-a-r2',updates:9030,sha256:'aa',commit:'bb'},
  candidate:{file:'c',version:ROUND7_CANDIDATE_VERSION,updates:ROUND7_CANDIDATE_UPDATES,sha256:'dd',commit:'ee'},
  baselineAfter:{sha256:'aa'},candidateAfter:{sha256:'dd'},
  winInterval:{mean:0.56,low:0.48,high:0.64},summary:{mean:0.56,low:0.48,high:0.64,seeds:4,finished:16},
  versusHalf:{mean:0.06,low:-0.02,high:0.14,seeds:4},
  perSeed:[{seed:191400,p:0.5,cells:[{learnerSeat:0,first:0,mark:'勝'}]}],
  unfinished:[],anomalies:{},plannedGames:16,finishedGames:16,retries:{fallbacks:0},elapsedMs:1000
 });
 assert.match(text,/# 白劍神經網路第七輪/);
 assert.match(text,/不能確認/);
 assert.match(text,/191400/);
});

test('a matching file hash is the model check',()=>{
 const before={sha256:'aa',version:'nn-a-r2',updates:9030};
 const after={sha256:'aa',version:'nn-a-r2',updates:9030};
 const candidate={sha256:'bb',version:ROUND7_CANDIDATE_VERSION,updates:ROUND7_CANDIDATE_UPDATES};
 assert.equal(confirmationIntact(before,after,candidate,{...candidate}),true);
 assert.equal(confirmationIntact(before,{...after,sha256:'cc'},candidate,{...candidate}),false);
 assert.equal(confirmationIntact(before,after,candidate,{...candidate,updates:1}),false);
});

test('the stored confirmation keeps the pre-registered reading',()=>{
 const report=JSON.parse(readFileSync(new URL('../docs/white-sword-ai/nn-round7.json',import.meta.url),'utf8'));
 const plan=JSON.parse(readFileSync(new URL('../docs/white-sword-ai/nn-round7-plan.json',import.meta.url),'utf8'));
 assert.equal(plan.plan.seeds,256);
 assert.equal(plan.seeds.length,256);
 assert.equal(plan.plan.fits,true);
 assert.equal(report.plan.seeds,256);
 assert.deepEqual(report.seeds,plan.seeds);
 assert.equal(report.finishedGames,1024);
 assert.equal(report.completeSeeds,256);
 assert.equal(report.unfinished.length,0);
 assert.equal(report.retries.fallbacks,0);
 assert.equal(report.baseline.sha256,ROUND7_BASELINE_HASH);
 assert.equal(report.baselineAfter.sha256,ROUND7_BASELINE_HASH);
 assert.equal(report.candidate.sha256,ROUND7_CANDIDATE_HASH);
 assert.equal(report.candidateAfter.sha256,ROUND7_CANDIDATE_HASH);
 assert.equal(report.versusHalf.seeds,256);
 assert.ok(report.versusHalf.low>0);
 assert.equal(report.judgment.kind,'reproduced');
 assert.equal(report.perSeed.length,256);
 assert.equal(report.games.length,1024);
 assert.equal(planTextHasNoResult(plan),true);
});

function planTextHasNoResult(plan){
 return plan.bench.winner==null&&plan.precision.projection.plannedSeeds===256;
}

test('the frozen files match the registered hashes',()=>{
 const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
 assert.equal(hash('training/white-sword-nn/weights/round2/a-frozen.json'),ROUND7_BASELINE_HASH);
 assert.equal(hash('training/white-sword-nn/weights/round6/line-2/actor-after-96.json'),ROUND7_CANDIDATE_HASH);
 const source=readFileSync(new URL('../scripts/white-sword-nn-round7.mjs',import.meta.url),'utf8');
 assert.match(source,/line-2\/actor-after-96/);
 assert.match(source,/ROUND7_CANDIDATE_HASH/);
 assert.equal(source.includes('saveNet'),false);
 assert.equal(source.includes('selectCheckpoint'),false);
 assert.equal(source.includes('line-0'),false);
 assert.equal(source.includes('line-1'),false);
});
