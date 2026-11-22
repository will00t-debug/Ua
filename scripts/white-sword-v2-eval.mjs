#!/usr/bin/env node
// Score v1 weights with the v2 search cap. Does not train, does not overwrite
// v0, v1, or candidate.json, and does not use the v1 final seeds.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {Worker} from 'node:worker_threads';
import {BLEND_HARD_CAP} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {cloneModel,loadModel,saveModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {finalV2Specs,validationV2Specs} from '../dist/universal-v2/white-sword-ai/protocol.mjs';
import {addAnomalies,judgeChampion,rateBy} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||availableParallelism()-1||1),3));

function materialize(row,model){
 const specialist={
  deckId:'white-sword',policy:'white-sword',model,
  mode:'blend',scale:model.blendScale??6,hardCap:BLEND_HARD_CAP,explore:0
 };
 const opponent={deckId:row.opponent.deckId,policy:'hard-search-2',model:null,mode:'policy',explore:0,scale:0};
 const seats=[null,null];
 seats[row.cell.specialistSeat]=specialist;
 seats[1-row.cell.specialistSeat]=opponent;
 return {
  seed:row.seed,first:row.cell.first,specialistSeat:row.cell.specialistSeat,
  opponentDeck:row.opponentDeck,label:row.label,seats
 };
}
function runPool(specs){
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
    if(finished%12===0||finished===specs.length)console.log('games',finished+'/'+specs.length);
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
function section(games){
 return {
  overall:rateBy(games,()=>true),
  first:rateBy(games,game=>game.specialistIsFirst),
  second:rateBy(games,game=>!game.specialistIsFirst),
  byDeck:Object.fromEntries([...new Set(games.map(game=>game.opponentDeck))].map(deck=>[deck,rateBy(games,game=>game.opponentDeck===deck)])),
  nonMirror:rateBy(games,game=>game.opponentDeck!=='white-sword'),
  anomalies:addAnomalies(games),
  opponentDecks:[...new Set(games.map(game=>game.opponentDeck))]
 };
}
function pct(rate){
 if(rate?.p==null)return 'n/a';
 return (rate.p*100).toFixed(1)+'% ('+rate.wins+'/'+rate.n+', CI '+(rate.low*100).toFixed(1)+'–'+(rate.high*100).toFixed(1)+')';
}
async function play(name,rows,model){
 console.log(name,rows.length);
 const started=performance.now();
 const games=await runPool(rows.map(row=>materialize(row,model)));
 const corrupt=games.filter(game=>game.anomalies?.illegal||game.anomalies?.leak||game.anomalies?.engineError);
 if(corrupt.length){
  console.error(corrupt.slice(0,2));
  throw Error(name+' has '+corrupt.length+' corrupted games');
 }
 return {name,games:games.length,wallMs:performance.now()-started,...section(games)};
}
function markdown(report){
 const lines=[
  '# 白劍專屬 AI v2 評分上限',
  '',
  '權重與 v1 candidate 相同。差異只有 blend：策略分不能把搜尋分數拉低超過 7，這是 Hard Search 2 自己的根節點餘裕，不是看過新測試後調出來的門檻。',
  '',
  '- v1 對 hard-search-2：'+pct(report.v1.overall),
  '- v1 白劍鏡像：'+pct(report.v1.byDeck['white-sword']),
  '- v2 新驗證集：'+pct(report.validation.overall)+'，牆鐘 '+(report.validation.wallMs/1000).toFixed(1)+' 秒',
  '- v2 新最終測試：'+pct(report.finalTest.overall)+'，牆鐘 '+(report.finalTest.wallMs/1000).toFixed(1)+' 秒',
  '- 先手：'+pct(report.finalTest.first),
  '- 後手：'+pct(report.finalTest.second),
  '- 白劍鏡像：'+pct(report.finalTest.byDeck['white-sword']),
  '- 我拒絕：'+pct(report.finalTest.byDeck['reject-blue']),
  '- 戀露：'+pct(report.finalTest.byDeck.renruki),
  '- 非鏡像：'+pct(report.finalTest.nonMirror),
  '- 晉升條件：'+(report.promotion.promoted?'書面門檻達到':'未達到，保留 hard-search-2'),
  '- 正式預設：仍是 hard-search-2。這份權重沒有部署。',
  '- 異常：'+JSON.stringify(report.finalTest.anomalies)
 ];
 lines.push('- 先手勝率低於 60%。書面門檻只要求先手、後手都有對局，沒有要求先手單獨達到 60%。');
 lines.push('- 新種子上的白劍鏡像信賴區間含有 50%。戀露的勝場數與 v1 相同，而且是另一組種子，不能當成該牌組變強。');
 lines.push('- 驗證集 48 場高於最終測試。引用棋力時用最終測試。');
 lines.push('- 敗局分類與 20 個局面在 docs/white-sword-ai/DIAGNOSIS.md。');
 if(report.promotion.reasons.length){
  lines.push('','未晉升原因：');
  for(const reason of report.promotion.reasons)lines.push('- '+reason);
 }
 lines.push('','v1 的最終種子 50000–50016 沒有參與這次評分，也沒有拿去調這個上限。');
 return lines.join('\n')+'\n';
}
async function main(){
 const started=performance.now();
 const v1=loadModel('training/white-sword-ai/weights/candidate.json');
 const model=cloneModel(v1);
 model.version='white-sword-specialist-v2-capped';
 model.hardCap=BLEND_HARD_CAP;
 model.parentVersion=v1.version;
 model.promoted=false;
 model.retrained=false;
 model.deployed=false;
 model.liveDefault='hard-search-2';
 model.note='Same weights as the v1 candidate. Blend cannot accept a search loss larger than hard root margin 7. The copied config records the v1 split; this file was not trained, and the acceptance games are seeds 80000-80016. promoted means the written acceptance bar, not a live-default change.';
 saveModel(model,'training/white-sword-ai/weights/v2-capped.json');
 const previous=JSON.parse(readFileSync('docs/white-sword-ai/report.json','utf8'));
 const validation=await play('validation-v2',validationV2Specs(),model);
 const finalTest=await play('final-v2',finalV2Specs(),model);
 const promotion=judgeChampion({...finalTest,selectedMode:'blend',anomalies:finalTest.anomalies});
 model.promoted=promotion.promoted;
 model.promotion=promotion;
 model.retrained=false;
 model.deployed=false;
 model.liveDefault='hard-search-2';
 saveModel(model,'training/white-sword-ai/weights/v2-capped.json');
 const report={
  createdAt:new Date().toISOString(),
  weights:'training/white-sword-ai/weights/v2-capped.json',
  hardCap:BLEND_HARD_CAP,
  elapsedMs:performance.now()-started,
  v1:{overall:previous.finalTest.overall,byDeck:previous.finalTest.byDeck,nonMirror:previous.finalTest.nonMirror},
  validation,finalTest,promotion
 };
 mkdirSync('docs/white-sword-ai',{recursive:true});
 writeFileSync('docs/white-sword-ai/report-v2.json',JSON.stringify(report,null,2));
 writeFileSync('docs/white-sword-ai/REPORT-V2.md',markdown(report));
 console.log('promoted',promotion.promoted,promotion.reasons);
 console.log('final',finalTest.overall);
}
main().catch(error=>{console.error(error);process.exit(1);});
