#!/usr/bin/env node
// White Sword v3 experiment ONLY. This script cannot promote or deploy to the
// production browser. It trains from completed, legal, capped-blend self-play
// games, and compares v2 and v3 on identical initial conditions.
import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {cloneModel,loadModel,modelL2,saveModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {learn} from '../dist/universal-v2/white-sword-ai/train.mjs';
import {addAnomalies,rateBy,wilson} from '../dist/universal-v2/white-sword-ai/stats.mjs';
import {
 V3_CONFIG,V3_TRAIN_SEEDS,V3_VALIDATION_SEEDS,V3_FINAL_SEEDS,
 V3_DECKS,trainingFixtures,evaluationFixtures,assertV3Seed
} from '../dist/universal-v2/white-sword-ai/v3-protocol.mjs';

const COMMAND=process.argv[2]||'smoke';
if(!['smoke','train','final'].includes(COMMAND))throw Error('Usage: node scripts/white-sword-v3-train.mjs smoke|train|final');
const SMOKE=COMMAND==='smoke';
const WORKERS=Math.max(1,Math.min(3,Number(process.env.WS_WORKERS||availableParallelism()-1||1)));
const INCUMBENT='training/white-sword-ai/weights/v2-capped.json';
const TRAINED='training/white-sword-ai/weights/v3-experiment.json';
const FINAL_CANDIDATE='training/white-sword-ai/weights/v3-validation-selected.json';
const PREFIX='docs/white-sword-ai/v3';
const POLICY={mode:'blend',scale:V3_CONFIG.blendScale,hardCap:V3_CONFIG.hardCap,explore:0};
const baseline=loadModel(INCUMBENT);
if(baseline.version!=='white-sword-specialist-v2-capped'||baseline.hardCap!==7)
 throw Error('Unexpected incumbent: v2 capped weights required');

function rowSpec(row,model,{training=false,opponentModel=null,opponentPolicy='hard-search-2',opponentDeck=null}={}){
 const specialist={deckId:'white-sword',policy:'white-sword',model,
  ...POLICY,explore:training?V3_CONFIG.explore:0};
 const other={deckId:opponentDeck||row.opponentDeck,policy:opponentPolicy,
  model:opponentModel,...POLICY};
 const seats=[];
 seats[row.specialistSeat]=specialist;
 seats[1-row.specialistSeat]=other;
 return {seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,
  opponentDeck:other.deckId,label:row.label,keepSamples:training,
  recordSeat:training?row.specialistSeat:null,recordBlendOutcome:training,
  keepActions:false,seats};
}
function trainSpec(row,model,previous){
 const opponent=row.opponent;
 const isSpecialist=opponent.policy==='white-sword';
 const opponentModel=isSpecialist
  ?(opponent.snapshot==='v2'?baseline:previous):null;
 return rowSpec(row,model,{training:true,opponentPolicy:opponent.policy,
  opponentModel,opponentDeck:opponent.deckId});
}
function runJobs(specs){
 if(!specs.length)return Promise.resolve([]);
 return new Promise((resolve,reject)=>{
  const results=Array(specs.length),workers=[];
  let next=0,done=0,closed=false;
  function fail(err){
   if(closed)return;
   closed=true;
   for(const w of workers)void w.terminate();
   reject(err instanceof Error?err:Error(String(err)));
  }
  function assign(worker,index){
   function receive(message){
    worker.off('message',receive);
    if(!message?.ok)return fail(Error(message?.error||'worker-error'));
    results[index]=message.game;
    done++;
    if(done%12===0||done===specs.length)console.log('games '+done+'/'+specs.length);
    if(next<specs.length)assign(worker,next++);
    else if(done===specs.length&&!closed){
     closed=true;
     for(const w of workers)void w.terminate();
     resolve(results);
    }
   }
   worker.on('message',receive);
   worker.postMessage(specs[index]);
  }
  for(let i=0;i<Math.min(WORKERS,specs.length);i++){
   const w=new Worker(new URL('./white-sword-worker.mjs',import.meta.url));
   w.on('error',fail);
   workers.push(w);
   assign(w,next++);
  }
 });
}
function healthy(game){
 return game.status==='finished'&&(game.winner===0||game.winner===1)
  &&Object.values(game.anomalies||{}).every(v=>v===0);
}
function assertHealthy(games,name){
 const bad=games.filter(g=>!healthy(g));
 if(bad.length)throw Error(name+' has '+bad.length+' unhealthy matches: '+
  JSON.stringify(bad.slice(0,3).map(g=>({
   seed:g.seed,status:g.status,error:g.error,anomalies:g.anomalies,
   opponent:g.opponentDeck,first:g.first,seat:g.specialistSeat
  }))));
}
function clampAround(candidate,anchor,limit){
 for(const key of ['policy','value'])for(let i=0;i<candidate[key].length;i++){
  const min=anchor[key][i]-limit,max=anchor[key][i]+limit;
  candidate[key][i]=Math.max(min,Math.min(max,candidate[key][i]));
 }
}
function pairedSummary(a,b,rows){
 let better=0,worse=0,sameWin=0,sameLoss=0,v2wins=0,v3wins=0;
 for(let i=0;i<rows.length;i++){
  const seat=rows[i].specialistSeat;
  const x=a[i].winner===seat,y=b[i].winner===seat;
  v2wins+=Number(x);v3wins+=Number(y);
  if(!x&&y)better++;
  else if(x&&!y)worse++;
  else if(x&&y)sameWin++;
  else sameLoss++;
 }
 const n=rows.length;
 return {pairs:n,v2:{...wilson(v2wins,n)},v3:{...wilson(v3wins,n)},
  rescue:better,regression:worse,bothWin:sameWin,bothLose:sameLoss,
  delta:(v3wins-v2wins)/n};
}
async function evaluate(model,{smoke=false,final=false}={}){
 const rows=evaluationFixtures({smoke,final});
 const v2=await runJobs(rows.map(row=>rowSpec(row,baseline)));
 const v3=await runJobs(rows.map(row=>rowSpec(row,model)));
 assertHealthy(v2,'v2 evaluation');
 assertHealthy(v3,'v3 evaluation');
 const perDeck={};
 for(const deckId of V3_DECKS){
  const indices=rows.map((row,i)=>row.opponentDeck===deckId?i:-1).filter(i=>i>=0);
  perDeck[deckId]=pairedSummary(indices.map(i=>v2[i]),indices.map(i=>v3[i]),indices.map(i=>rows[i]));
 }
 const directRows=rows.filter(row=>row.opponentDeck==='white-sword');
 const direct=await runJobs(directRows.map(row=>rowSpec(row,model,{
  opponentPolicy:'white-sword',opponentModel:baseline,opponentDeck:'white-sword'
 })));
 assertHealthy(direct,'v3 vs incumbent head-to-head');
 const overall=pairedSummary(v2,v3,rows);
 const directRate=rateBy(direct,()=>true);
 const nonMirror=Object.entries(perDeck)
  .filter(([deck])=>deck!=='white-sword');
 return {nPairs:rows.length,overall,perDeck,
  headToHeadV2:directRate,
  first:pairedSummary(v2.filter((g,i)=>rows[i].first===rows[i].specialistSeat),
   v3.filter((g,i)=>rows[i].first===rows[i].specialistSeat),
   rows.filter(row=>row.first===row.specialistSeat)),
  second:pairedSummary(v2.filter((g,i)=>rows[i].first!==rows[i].specialistSeat),
   v3.filter((g,i)=>rows[i].first!==rows[i].specialistSeat),
   rows.filter(row=>row.first!==row.specialistSeat)),
  nonMirror,anomalies:{v2:addAnomalies(v2),v3:addAnomalies(v3),direct:addAnomalies(direct)},
  rows:rows.map((row,i)=>({
   seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,
   opponentDeck:row.opponentDeck,v2Winner:v2[i].winner,v3Winner:v3[i].winner
  }))};
}
function gates(evalResult){
 const reasons=[];
 const small=evalResult.nPairs<60;
 if(small)reasons.push('驗證樣本小於 60 組，暫不允許自動晉升');
 if(evalResult.overall.delta<=0)reasons.push('未優於 v2 的同種子配對勝率');
 if(evalResult.headToHeadV2.p<0.55)reasons.push('對 v2 鏡像未達 55%');
 for(const [name,r] of Object.entries(evalResult.perDeck))
  if(r.delta< -0.10)reasons.push(name+' 退步超過 10 個百分點');
 return {eligible:reasons.length===0,reasons};
}
function fmt(n){return (100*n).toFixed(1)+'%';}
function markdown(report){
 const lines=['# 白劍 AI v3 學習實驗','',
  '獨立實驗；不修改已部署 v2、任何卡牌規則或正式對戰預設。',
  '',
  '- 來源基準：v2-capped；Hard Search 2、policy blend scale 6、hard cap 7 不變。',
  '- 訓練 seed：'+V3_TRAIN_SEEDS.join(', ')+'；驗證：'+V3_VALIDATION_SEEDS.join(', ')+
   '；隔離最終集：'+V3_FINAL_SEEDS[0]+'–'+V3_FINAL_SEEDS.at(-1)+'.',
  '- 試驗場次：'+report.trainingGames+'；拒收：'+report.rejected+
   '；可學習 outcome rows：'+report.outcomeRows+'.',
  '',
  '## 驗證結果','',
  '- v2：'+fmt(report.evaluation.overall.v2.p)+'；v3：'+fmt(report.evaluation.overall.v3.p),
  '- 配對差：'+fmt(report.evaluation.overall.delta),
  '- v2 輸 v3 贏：'+report.evaluation.overall.rescue+
   '；v2 贏 v3 輸：'+report.evaluation.overall.regression,
  '- v3 對 v2 直接鏡像：'+fmt(report.evaluation.headToHeadV2.p)+
   ' ('+report.evaluation.headToHeadV2.wins+'/'+report.evaluation.headToHeadV2.n+')','',
  '| 對手 | 組數 | v2 | v3 | 差距 |','|---|---:|---:|---:|---:|'];
 for(const [deck,r] of Object.entries(report.evaluation.perDeck))
  lines.push('| '+deck+' | '+r.pairs+' | '+fmt(r.v2.p)+' | '+fmt(r.v3.p)+' | '+fmt(r.delta)+' |');
 lines.push('','## 晉升判斷','',
  report.gates.eligible?'驗證門檻通過，但仍不可部署；必須先完成獨立最終集。'
   :'本次沒有達成自動晉升標準。',
  ...report.gates.reasons.map(r=>'- '+r),
  '','訓練和驗證只用可重播的初始種子；中途對戰分歧後不假定抽牌順序完全一致。',
  '沒有將最終集或正式玩家隱私資料拿來訓練。','');
 return lines.join('\n');
}
async function main(){
 const start=performance.now();
 mkdirSync(PREFIX,{recursive:true});
 const checkpoints=[];
 if(COMMAND==='final'){
  const selected=loadModel(FINAL_CANDIDATE);
  // This command is separate so final holdout never influences training or hyperparameters.
  for(const seed of V3_FINAL_SEEDS)assertV3Seed(seed,'final');
  const evaluation=await evaluate(selected,{final:true});
  const report={command:'final',date:new Date().toISOString(),
   modelVersion:selected.version,evaluation,
   explanation:'For reporting only; never tune on these seeds'};
  writeFileSync(PREFIX+'/FINAL.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({report:PREFIX+'/FINAL.json',overall:evaluation.overall,
   headToHead:evaluation.headToHeadV2},null,2));
  return;
 }
 let model=cloneModel(baseline);
 model.version='white-sword-v3-provisional';
 model.promoted=false;
 model.promotion=null;
 let outcomeRows=0,trainingGames=0,rejected=0;
 const epochs=SMOKE?1:V3_CONFIG.epochs;
 for(let epoch=0;epoch<epochs;epoch++){
  const previous=cloneModel(model);
  const fixtures=trainingFixtures(epoch,{smoke:SMOKE});
  const games=await runJobs(fixtures.map(row=>trainSpec(row,model,previous)));
  // Never use a corrupted game as a training loss. Incomplete / fallback is discarded.
  const corrupt=games.filter(g=>g.anomalies?.illegal||g.anomalies?.leak||g.anomalies?.engineError);
  if(corrupt.length)throw Error('Train match corrupted: '+JSON.stringify(corrupt.slice(0,3)));
  const updated=learn(model,games,{lr:V3_CONFIG.lr,valueLr:V3_CONFIG.valueLr,
   epochs:1,decayRate:1e-5});
  if(updated.outcome<1)throw Error('No actual capped-blend outcome gradient was collected');
  clampAround(model,baseline,V3_CONFIG.trustDelta);
  outcomeRows+=updated.outcome;
  trainingGames+=games.length;
  rejected+=updated.rejected.length;
  const evaluation=await evaluate(model,{smoke:SMOKE});
  const gate=gates(evaluation);
  const point={epoch:epoch+1,trainingGames:games.length,trainingKept:updated.kept,
   rejected:updated.rejected.length,outcomeRows:updated.outcome,
   delta:evaluation.overall.delta,headToHead:evaluation.headToHeadV2.p,
   policyNorm:modelL2(model).policy,gate,evalPairs:evaluation.nPairs,
   model:cloneModel(model),evaluation};
  checkpoints.push(point);
  console.log('epoch '+(epoch+1)+' '+JSON.stringify({
   outcome:point.outcomeRows,rejected:point.rejected,
   pairedDifference:point.delta,headToHead:point.headToHead,gate:gate.eligible
  }));
 }
 // Select only on validation seeds (never on final). Keep v2 if not better.
 const selected=checkpoints.reduce((best,item)=>!best||item.delta>best.delta?item:best,null);
 const modelOut=selected.model;
 modelOut.version='white-sword-v3-provisional-epoch-'+selected.epoch;
 modelOut.promoted=false;
 saveModel(modelOut,TRAINED);
 const gatesResult=gates(selected.evaluation);
 const report={command:COMMAND,date:new Date().toISOString(),
  config:V3_CONFIG,trainingGames,outcomeRows,rejected,
  selectedEpoch:selected.epoch,
  evaluation:selected.evaluation,gates:gatesResult,
  checkpoints:checkpoints.map(p=>({
   epoch:p.epoch,trainingGames:p.trainingGames,trainingKept:p.trainingKept,
   rejected:p.rejected,outcomeRows:p.outcomeRows,delta:p.delta,
   headToHead:p.headToHead,policyNorm:p.policyNorm,gate:p.gate
  })),elapsedMs:performance.now()-start};
 const prefix=SMOKE?'SMOKE':'TRAIN';
 writeFileSync(PREFIX+'/'+prefix+'.json',JSON.stringify(report,null,2)+'\n');
 writeFileSync(PREFIX+'/'+prefix+'.md',markdown(report));
 if(!SMOKE&&gatesResult.eligible){
  saveModel(modelOut,FINAL_CANDIDATE);
  console.log('Candidate validation-eligible; holdout still untouched.');
 }else console.log('Keep incumbent v2. No promotion, no production changes.');
 console.log(JSON.stringify({report:PREFIX+'/'+prefix+'.md',pairs:selected.evaluation.nPairs,
  delta:selected.delta,headToHead:selected.headToHead,outcomeRows,rejected,
  selectedEligible:gatesResult.eligible},null,2));
}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
