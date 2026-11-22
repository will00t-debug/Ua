#!/usr/bin/env node
// Train and measure the White Sword specialist. This does not deploy or
// change the live hard-search-2, AI v3, or Hybrid Main defaults.
import {execSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {Worker} from 'node:worker_threads';
import {POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {cloneModel,createModel,saveModel,topWeights} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {
 EPOCH_SEEDS,FINAL_DECKS,FINAL_SEEDS,LEARNED_MODES,SELECTION_DECKS,TRAIN,
 epochSpecs,finalSpecs,fullSpecs,historySpecs,selectionSpecs,selfPlaySpecs,smokeSpecs,teacherSpecs
} from '../dist/universal-v2/white-sword-ai/protocol.mjs';
import {verifyWhiteSword} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {addAnomalies,judgeChampion,rateBy} from '../dist/universal-v2/white-sword-ai/stats.mjs';
import {learn} from '../dist/universal-v2/white-sword-ai/train.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||availableParallelism()-1||1),3));
const WEIGHTS='training/white-sword-ai/weights';
const REPORT_JSON='docs/white-sword-ai/report.json';
const REPORT_MD='docs/white-sword-ai/REPORT.md';

function commit(){
 try{return execSync('git rev-parse HEAD',{encoding:'utf8'}).trim();}
 catch{return null;}
}
function materialize(row,{model=null,historical=null,mode='policy',scale=0,explore=0,keepSamples=false,recordTeacher=false,control=null}={}){
 const specialist={
  deckId:'white-sword',
  policy:recordTeacher||control==='hard'?'hard-search-2':'white-sword',
  model:recordTeacher||control==='hard'?null:model,
  mode,explore:recordTeacher||control==='hard'?0:explore,scale
 };
 const opponent={
  deckId:row.opponent.deckId,
  policy:row.opponent.policy,
  model:row.opponent.historical?historical:(row.opponent.policy==='white-sword'?model:null),
  mode:'policy',
  explore:row.opponent.policy==='white-sword'&&!row.opponent.historical?explore:0,
  scale:0
 };
 const seats=[null,null];
 seats[row.cell.specialistSeat]=specialist;
 seats[1-row.cell.specialistSeat]=opponent;
 return {
  seed:row.seed,first:row.cell.first,specialistSeat:row.cell.specialistSeat,
  opponentDeck:row.opponent.deckId,label:row.label,seats,
  keepSamples,keepActions:false,recordTeacher,recordSeat:row.cell.specialistSeat
 };
}
function runPool(specs){
 if(WORKERS<=1||specs.length<=1){
  return import('../dist/universal-v2/white-sword-ai/runner.mjs').then(({playGame,summarizeGame})=>{
   return specs.map((spec,index)=>{
    const game=playGame(spec);
    if((index+1)%10===0||index+1===specs.length)console.log(`games ${index+1}/${specs.length}`);
    return spec.keepSamples?game:summarizeGame(game);
   });
  });
 }
 return new Promise((resolve,reject)=>{
  const results=new Array(specs.length);
  let cursor=0,finished=0;
  const pool=[];
  const fail=error=>{
   for(const worker of pool)worker.terminate();
   reject(error instanceof Error?error:Error(String(error)));
  };
  const assign=(worker,index)=>{
   const onMessage=message=>{
    worker.off('message',onMessage);
    if(!message?.ok)return fail(message?.error||'worker failed');
    results[index]=message.game;
    finished++;
    if(finished%10===0||finished===specs.length)console.log(`games ${finished}/${specs.length}`);
    if(cursor<specs.length)assign(worker,cursor++);
    else if(finished===specs.length){
     for(const item of pool)item.terminate();
     resolve(results);
    }
   };
   worker.on('message',onMessage);
   worker.postMessage(specs[index]);
  };
  for(let i=0;i<Math.min(WORKERS,specs.length);i++){
   const worker=new Worker(new URL('./white-sword-worker.mjs',import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
function badGames(games,keys){
 return games.filter(game=>keys.some(key=>game.anomalies?.[key])||(keys.includes('unfinished')&&game.status!=='finished'));
}
function assertClean(games,label){
 const bad=badGames(games,['illegal','leak','engineError','deadLoop','fallback','timeout','unfinished']);
 if(!bad.length)return;
 console.error(label,bad.slice(0,3).map(game=>({
  matchId:game.matchId,status:game.status,endReason:game.endReason,error:game.error,
  anomalies:game.anomalies,recent:game.recentActions||null
 })));
 throw Error(label+' has '+bad.length+' unhealthy games');
}
function assertNoCorruption(games,label){
 const bad=badGames(games,['illegal','leak','engineError']);
 if(!bad.length)return;
 console.error(label,bad.slice(0,3).map(game=>({
  matchId:game.matchId,status:game.status,endReason:game.endReason,error:game.error,
  anomalies:game.anomalies,recent:game.recentActions||null
 })));
 throw Error(label+' has '+bad.length+' corrupted games');
}
function section(games){
 return {
  overall:rateBy(games,()=>true),
  first:rateBy(games,game=>game.specialistIsFirst),
  second:rateBy(games,game=>!game.specialistIsFirst),
  byDeck:Object.fromEntries([...new Set(games.map(game=>game.opponentDeck))].map(deck=>[deck,rateBy(games,game=>game.opponentDeck===deck)])),
  anomalies:addAnomalies(games),
  ms:games.reduce((sum,game)=>sum+(game.ms||0),0)
 };
}
function pct(rate){
 if(rate?.p==null)return 'n/a';
 return (rate.p*100).toFixed(1)+'% ('+rate.wins+'/'+rate.n+', CI '+(rate.low*100).toFixed(1)+'–'+(rate.high*100).toFixed(1)+')';
}
function collapse(model){
 const groups={
  raid:['type_raid','k067_raid','h085_raid','u070_raid'],
  draw:['type_extra_draw','aizen_draw'],
  life:['my_life','opp_life','life_diff']
 };
 const total=model.policy.reduce((sum,value)=>sum+Math.abs(value),0)||1;
 const mass={};
 for(const [name,keys] of Object.entries(groups))
  mass[name]=keys.reduce((sum,key)=>sum+Math.abs(model.policy[POLICY_INDEX[key]]||0),0)/total;
 return {mass,singleMetricRisk:Object.values(mass).some(value=>value>0.45)};
}
function markdown(report){
 const lines=[
  '# 白劍專屬 AI v1 報告',
  '',
  '這份數字來自這次執行。未達晉升門檻時，正式基準仍是 `hard-search-2`。',
  '',
  '- 來源 commit：`'+(report.sourceCommit||'unknown')+'`',
  '- 牌組：白劍 50 張、'+report.deck.kinds+' 種，引擎檢查 '+(report.deck.ok?'通過':'失敗'),
  '- 煙霧測試：'+report.smoke.games+' 場，'+report.smoke.ms.toFixed(0)+' ms',
  '- 完整合法性測試：'+report.full.games+' 場，'+report.full.ms.toFixed(0)+' ms',
  '- 教師對局：'+report.training.teacherGames+'，自我對戰：'+report.training.selfPlayGames,
  '- 訓練保留樣本：'+report.training.kept+'，拒收對局：'+report.training.rejected,
  '- 基準對局：'+report.finalTest.games+'，牆鐘 '+(report.finalTest.wallMs/1000).toFixed(1)+' 秒',
  '',
  '## 冠軍驗收',
  '',
  '- 晉升：'+(report.promotion.promoted?'達到門檻':'未達到，保留 hard-search-2'),
  '- 採用模式：`'+report.selected.mode+'`',
  '- 總勝率：'+pct(report.finalTest.overall),
  '- 先手：'+pct(report.finalTest.first),
  '- 後手：'+pct(report.finalTest.second),
  '- 非鏡像：'+pct(report.finalTest.nonMirror)
 ];
 for(const [deck,rate] of Object.entries(report.finalTest.byDeck))lines.push('- '+deck+'：'+pct(rate));
 lines.push('- 非法／洩漏／死循環／引擎／fallback／逾時：'+JSON.stringify(report.finalTest.anomalies));
 if(report.promotion.reasons.length){
  lines.push('','未晉升原因：');
  for(const reason of report.promotion.reasons)lines.push('- '+reason);
 }
 lines.push('','## 學習曲線','');
 for(const row of report.training.curve)
  lines.push('- epoch '+row.epoch+'：validation '+row.val.wins+'/'+row.val.finished+'，policy L2 '+row.policyL2.toFixed(3)+'，拒收 '+row.rejected);
 lines.push('','## 與舊權重','',
  '- v1 對 v0：'+pct(report.history),
  '','## 單一指標檢查','',
  '- '+JSON.stringify(report.collapse),
  '','驗證集模式比較寫在 `report.json` 的 `selection`。權重沒有接到正式對戰預設。');
 return lines.join('\n')+'\n';
}
async function main(){
 const command=process.argv[2]||'all';
 const started=performance.now();
 const sourceCommit=commit();
 const deck=verifyWhiteSword();
 console.log('white-sword',deck.ok,deck.copies,deck.kinds,deck.missing.length);
 if(!deck.ok)throw Error('White sword deck is not playable in the V2 engine');
 const report={
  sourceCommit,createdAt:new Date().toISOString(),deck,
  protocol:{
   hard:'hard-search-2',nodes:48,clock:'free when nodes are pinned',
   finalSeeds:[FINAL_SEEDS[0],FINAL_SEEDS.at(-1)],finalDecks:FINAL_DECKS,
   selectionDecks:[...SELECTION_DECKS],epochSeeds:[...EPOCH_SEEDS],train:TRAIN
  }
 };
 const zero=createModel();
 zero.sourceCommit=sourceCommit;
 if(command==='smoke'||command==='all'||command==='full'){
  if(command!=='full'){
   console.log('smoke');
   const t=performance.now();
   const games=await runPool(smokeSpecs().map(row=>materialize(row,{model:zero})));
   assertClean(games,'smoke');
   report.smoke={...section(games),games:games.length,wallMs:performance.now()-t};
   console.log('smoke ok',report.smoke.wallMs.toFixed(0)+'ms');
  }
  if(command==='full'||command==='all'){
   console.log('full');
   const t=performance.now();
   const games=await runPool(fullSpecs().map(row=>materialize(row,{model:zero})));
   assertClean(games,'full');
   report.full={...section(games),games:games.length,wallMs:performance.now()-t};
   console.log('full ok',report.full.wallMs.toFixed(0)+'ms');
  }
 }
 if(command==='train'||command==='all'||command==='eval'){
  const model=createModel();
  model.sourceCommit=sourceCommit;
  model.config={train:TRAIN,hardNodes:48,finalSeeds:[...FINAL_SEEDS],finalDecks:[...FINAL_DECKS]};
  console.log('teacher');
  const teacherGames=await runPool(teacherSpecs().map(row=>materialize(row,{recordTeacher:true,keepSamples:true})));
  assertClean(teacherGames,'teacher');
  const taught=learn(model,teacherGames,{lr:TRAIN.teacherLr,valueLr:TRAIN.valueLr,epochs:TRAIN.teacherEpochs});
  if(taught.teacher<8)throw Error('Teacher update did not receive samples');
  const v0=cloneModel(model);
  v0.version='white-sword-specialist-v0-teacher';
  mkdirSync(WEIGHTS,{recursive:true});
  saveModel(v0,WEIGHTS+'/v0-teacher.json');
  const curve=[];
  let best=cloneModel(model),bestWins=-1;
  const self=selfPlaySpecs();
  const epochSize=self.length/TRAIN.selfEpochs;
  let rejected=taught.rejected.length,kept=taught.kept;
  for(let epoch=0;epoch<TRAIN.selfEpochs;epoch++){
   console.log('self-play epoch',epoch+1);
   const rows=self.slice(epoch*epochSize,(epoch+1)*epochSize);
   const games=await runPool(rows.map(row=>materialize(row,{model,historical:v0,explore:TRAIN.explore,keepSamples:true})));
   assertNoCorruption(games,'self-play');
   const learned=learn(model,games,{lr:TRAIN.selfLr,valueLr:TRAIN.valueLr,epochs:1});
   rejected+=learned.rejected.length;
   kept+=learned.kept;
   const val=await runPool(epochSpecs().map(row=>materialize(row,{model,mode:'policy',explore:0})));
   assertNoCorruption(val,'epoch-validation');
   const point={epoch,games:games.length,kept:learned.kept,rejected:learned.rejected.length,
    policyL2:Math.sqrt(model.policy.reduce((sum,value)=>sum+value*value,0)),
    valueL2:Math.sqrt(model.value.reduce((sum,value)=>sum+value*value,0)),
    val:rateBy(val,()=>true)};
   curve.push(point);
   model.curve=curve;
   console.log('epoch',epoch+1,'val',point.val.wins+'/'+point.val.finished,'L2',point.policyL2.toFixed(3));
   if(point.val.wins>=bestWins){bestWins=point.val.wins;best=cloneModel(model);}
  }
  best.version='white-sword-specialist-v1';
  best.curve=curve;
  best.sourceCommit=sourceCommit;
  saveModel(best,WEIGHTS+'/v1-selfplay.json');
  report.training={
   teacherGames:teacherGames.length,selfPlayGames:self.length,kept,rejected,curve,
   teacherSamples:taught.teacher,weightDelta:taught.delta
  };
  if(command==='train'){
   saveModel(best,WEIGHTS+'/candidate.json');
  }
  if(command==='all'||command==='eval'){
   console.log('selection');
   const selection=[];
   for(const choice of LEARNED_MODES){
    const games=await runPool(selectionSpecs().map(row=>materialize(row,{model:best,mode:choice.mode,scale:choice.scale,explore:0})));
    assertNoCorruption(games,'selection-'+choice.mode);
    selection.push({...choice,wins:rateBy(games,()=>true).wins,...section(games)});
    console.log('mode',choice.mode,selection.at(-1).wins);
   }
   const hard=await runPool(selectionSpecs().map(row=>materialize(row,{control:'hard'})));
   assertClean(hard,'selection-hard');
   selection.push({mode:'hard',scale:0,wins:rateBy(hard,()=>true).wins,...section(hard)});
   const learned=selection.filter(row=>row.mode!=='hard').sort((a,b)=>b.wins-a.wins||(a.mode==='policy'?-1:1));
   const selected=learned[0];
   console.log('history');
   const historyGames=await runPool(historySpecs().map(row=>materialize(row,{model:best,historical:v0,mode:'policy',explore:0})));
   assertNoCorruption(historyGames,'history');
   console.log('final',selected.mode);
   const wall=performance.now();
   const finalGames=await runPool(finalSpecs().map(row=>materialize(row,{
    model:best,mode:selected.mode,scale:selected.scale,explore:0
   })));
   assertNoCorruption(finalGames,'final');
   const finalTest={
    ...section(finalGames),games:finalGames.length,wallMs:performance.now()-wall,
    nonMirror:rateBy(finalGames,game=>game.opponentDeck!=='white-sword'),
    opponentDecks:[...new Set(finalGames.map(game=>game.opponentDeck))]
   };
   const promotion=judgeChampion({...finalTest,selectedMode:selected.mode,anomalies:finalTest.anomalies});
   best.promoted=promotion.promoted;
   best.promotion=promotion;
   best.selectedMode=selected.mode;
   best.blendScale=selected.scale;
   saveModel(best,WEIGHTS+'/candidate.json');
   report.selection=selection.map(row=>({mode:row.mode,scale:row.scale,wins:row.wins,overall:row.overall}));
   report.history=rateBy(historyGames,()=>true);
   report.finalTest=finalTest;
   report.promotion=promotion;
   report.collapse=collapse(best);
   report.topWeights=topWeights(best,15);
   report.failures=finalGames.filter(game=>game.winner!==game.specialistSeat).slice(0,12).map(game=>({
    matchId:game.matchId,seed:game.seed,first:game.first,specialistSeat:game.specialistSeat,
    opponentDeck:game.opponentDeck,winner:game.winner,endReason:game.endReason,turn:game.turn,steps:game.steps
   }));
   report.elapsedMs=performance.now()-started;
   mkdirSync('docs/white-sword-ai',{recursive:true});
   writeFileSync(REPORT_JSON,JSON.stringify(report,null,2));
   writeFileSync(REPORT_MD,markdown(report));
   console.log('promoted',promotion.promoted,promotion.reasons);
   console.log('win',finalTest.overall);
  }
 }
 if(!report.smoke)report.smoke={games:0,ms:0};
 if(!report.full)report.full={games:0,ms:0};
 if(command==='smoke'){
  mkdirSync('docs/white-sword-ai',{recursive:true});
  writeFileSync(REPORT_JSON,JSON.stringify(report,null,2));
 }
 console.log('done',((performance.now()-started)/1000).toFixed(1)+'s');
}
main().catch(error=>{
 console.error(error);
 process.exit(1);
});
