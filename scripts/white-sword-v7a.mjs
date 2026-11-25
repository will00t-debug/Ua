#!/usr/bin/env node
// Offline comparison architecture. v2 stays the default. No candidate and no new games.
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {CONSTRAINTS} from '../training/white-sword-ai/v5a/lib/protocol.mjs';
import {EE6C_ID} from '../training/white-sword-ai/v5b/lib/protocol.mjs';
import {FROZEN_WEIGHT} from '../training/white-sword-ai/v5b1/lib/protocol.mjs';
import {loadPositions} from '../training/white-sword-ai/v6a/lib/dataset.mjs';
import {energyKey,unchangedChoice} from '../training/white-sword-ai/v6a/lib/model.mjs';
import {LAMBDAS} from '../training/white-sword-ai/v6a/lib/protocol.mjs';
import {positionLoss} from '../training/white-sword-ai/v6a1/lib/metrics.mjs';
import {buildTagged} from '../training/white-sword-ai/v6a2/lib/source.mjs';
import {chooseThreshold,decide,exampleFrom,fitExamples,foldUtility,judge,summarize} from '../training/white-sword-ai/v7a/lib/compare.mjs';
import {ALWAYS,THRESHOLDS,positiveSignal} from '../training/white-sword-ai/v7a/lib/protocol.mjs';

const ROOT='training/white-sword-ai/v7a';

function mean(values){
 return values.reduce((sum,value)=>sum+value,0)/values.length;
}
function legal(item,before,after,band){
 if(after===before)return true;
 if(item.role==='preference')return energyKey({band:[band.find(row=>row.key===after)]})===after;
 if(item.id===EE6C_ID){
  try{return JSON.parse(after||'{}').type==='next';}catch{return false;}
 }
 return false;
}
function guardsHold(stored,weights,model,threshold){
 const results=[];
 for(const item of CONSTRAINTS){
  const position=stored.get(item.id);
  if(!position?.band?.length){
   results.push({id:item.id,ok:false,missing:true});
   continue;
  }
  const before=unchangedChoice(position.band,weights);
  const after=decide(position.band,weights,model,threshold);
  results.push({id:item.id,ok:legal(item,before,after,position.band),before,after,missing:false});
 }
 return {ok:results.every(row=>row.ok),results};
}
function selectLambda(train){
 let best=null;
 for(const lambda of LAMBDAS){
  const losses=[];
  for(let fold=0;fold<5;fold++){
   const held=train.filter(row=>row.fold===fold);
   const fitRows=train.filter(row=>row.fold!==fold);
   if(!held.length||!fitRows.length)continue;
   losses.push(positionLoss(held,fitExamples(fitRows,lambda)).mse);
  }
  if(!losses.length)continue;
  const mse=mean(losses);
  if(!best||mse<best.mse-1e-12||(Math.abs(mse-best.mse)<=1e-12&&lambda>best.lambda))best={lambda,mse};
 }
 return best;
}
function selectThreshold(train,lambda,weights,stored){
 const evaluations=[];
 for(const threshold of [...THRESHOLDS,ALWAYS]){
  const utilities=[];
  let eligible=true;
  let unknownFolds=0;
  let illegalFolds=0;
  for(let fold=0;fold<5;fold++){
   const held=train.filter(row=>row.fold===fold);
   const fitRows=train.filter(row=>row.fold!==fold);
   if(!held.length||!fitRows.length)continue;
   const model=fitExamples(fitRows,lambda);
   const result=foldUtility(held,weights,model,threshold);
   const guard=guardsHold(stored,weights,model,threshold);
   if(!result.eligible)unknownFolds++;
   if(!guard.ok)illegalFolds++;
   if(!result.eligible||!guard.ok)eligible=false;
   utilities.push(result.utility);
  }
  evaluations.push({threshold,eligible,utility:utilities.length?mean(utilities):0,unknownFolds,illegalFolds});
 }
 return {choice:chooseThreshold(evaluations),evaluations};
}
function main(){
 const official=v2Hash();
 const weights=loadModel(V2_FILE).policy;
 if(readJson('training/white-sword-ai/v5b/candidate.json').weight!==FROZEN_WEIGHT)throw Error('070 權重被改過');
 const plan=readJson('training/white-sword-ai/v6a/sample-plan.json');
 const mine=readJson('training/white-sword-ai/v6a/mine.json');
 const forceDev=new Set();
 for(const id of plan.ids||[]){
  const position=(mine.positions||[]).find(row=>row.id===id);
  if(position)forceDev.add((position.opponent||'unknown')+'|'+position.seed);
 }
 const tagged=buildTagged(forceDev);
 const trainRows=tagged.rows.filter(row=>row.split==='train');
 const devRows=tagged.rows.filter(row=>row.split==='dev'||row.split==='dev-recheck');
 const trainGames=new Set(trainRows.map(row=>row.game));
 if(devRows.some(row=>trainGames.has(row.game)))throw Error('同源對局跨過訓練和開發');
 let skipped=0;
 let outside=0;
 const train=[];
 const dev=[];
 for(const row of trainRows){
  const example=exampleFrom(row,weights);
  if(!example){skipped++;continue;}
  if(!example.candidateInCap)outside++;
  train.push(example);
 }
 for(const row of devRows){
  const example=exampleFrom(row,weights);
  if(!example){skipped++;continue;}
  if(!example.candidateInCap)outside++;
  dev.push(example);
 }
 const lambda=selectLambda(train);
 const threshold=selectThreshold(train,lambda.lambda,weights,loadPositions());
 const model=fitExamples(train,lambda.lambda);
 const chosen=threshold.choice?.threshold??ALWAYS;
 const stored=loadPositions();
 const safety=guardsHold(stored,weights,model,chosen);
 const devJudged=dev.map(row=>({...judge(row,weights,model,chosen),game:row.game}));
 const trainJudged=train.map(row=>({...judge(row,weights,model,chosen),game:row.game}));
 const devSummary=summarize(devJudged);
 const trainSummary=summarize(trainJudged);
 const devLoss=positionLoss(dev,model);
 const zeroLoss=positionLoss(dev,{beta:[]});
 const signal=positiveSignal({threshold:chosen,summary:devSummary,safetyOk:safety.ok});
 const decision=signal
  ?'離線結果達到事先登記的正向訊號。之後可以規劃全新種子的獨立測試。本輪不打那些對局，也不採用。'
  :'建議停止。既有來源可確認的資料沒有讓這個比較架構學到值得驗證的改選。不要再把同一批配對平均拿去擬合另一組相似的權重。';
 const study={
  official,candidate:false,adopted:false,promoted:false,
  confirmed:tagged.rows.length,trainPositions:train.length,devPositions:dev.length,
  skipped,outside,
  lambda:lambda.lambda,lambdaMse:lambda.mse,
  threshold:Number.isFinite(chosen)?chosen:null,
  thresholdSearch:threshold.evaluations.map(item=>({...item,threshold:Number.isFinite(item.threshold)?item.threshold:null})),
  devLoss,zeroLoss,
  devSummary,trainSummary,
  safety,signal,decision
 };
 writeJson(ROOT+'/study.json',study);
 writeJson(ROOT+'/model.json',{adopted:false,promoted:false,candidate:false,threshold:study.threshold,lambda:study.lambda});
 const report=render(study);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v7a/report.md',report);
 console.log(JSON.stringify({
  train:train.length,dev:dev.length,skipped,lambda:lambda.lambda,
  threshold:study.threshold,signal,mse:devLoss.mse,zero:zeroLoss.mse,
  verified:devSummary.verified,reverse:devSummary.reverse,unknown:devSummary.unknown,
  gain:devSummary.gain
 }));
}
function render(study){
 const num=value=>Number.isFinite(value)?value.toFixed(3):'—';
 const gate=study.threshold==null?'維持 v2':String(study.threshold);
 return [
  '# 白劍 AI v7-A：獨立動作價值比較',
  '正式結束把學習殘差加進 v2 混合分的路線。v2 仍是預設決策。這個模型預測的是候選動作相對 v2 首選的配對勝率差，預測值不加入混合分。優勢沒有超過訓練階段選好的門檻，就維持 v2。選擇只會落在 Hard cap 7 裡面。',
  '① 門檻是 '+gate+'。開發資料的可核對改選 '+study.devSummary.verified+' 個，反向 '+study.devSummary.reverse+' 個，沒有分支證據的第三動作 '+study.devSummary.unknown+' 個。局部收益的對局平均 '+num(study.devSummary.gain.mean)+'，95% 區間 ['+num(study.devSummary.gain.low)+', '+num(study.devSummary.gain.high)+']。沒有改選時每個對局收益都是 0，區間寬度也是 0；那只表示沒有改選，不是收益為正。',
  '② 預測誤差：零預測 '+num(study.zeroLoss.mse)+'，這個模型 '+num(study.devLoss.mse)+'，相關 '+num(study.devLoss.correlation)+'。',
  '③ '+study.decision,
  '## 和 v5-D、v6 的差別',
  'v5-D 在 Hard cap 裡依卡號、動作種類和線路安裝固定規則。局面能量、手牌或 AP 不會改變那條規則。驗證沒有獨立確認時就回到 v2。',
  'v6 用動作特徵差回歸配對勝率，再把那個很小的數加進混合分。局面特徵在相減時變成 0。勝率尺度約 0.02，混合分差常常是十到一百分，所以殘差沒有改選。',
  'v7 保留局面特徵，並用既有的八個交互項描述局面和候選動作的關係。決策比較的是預測勝率優勢和門檻，不是把勝率加進混合分。門檻只在訓練對局的分組交叉驗證裡選擇；和維持 v2 打平時，選擇較高的門檻，也就是不改選。',
  '## 資料與門檻',
  '使用 #605 來源可確認的比較。訓練 '+study.trainPositions+' 個，開發 '+study.devPositions+' 個。v2 的首選不在這組配對裡、因而沒有相對目標的比較有 '+study.skipped+' 個。有分支證據的另一個動作落在 Hard cap 之外的有 '+study.outside+' 個，模型不能選它。配對平均仍是有誤差的觀測，權重是配對數；方向沒有被當成確定答案。評估改選時，收益先乘上 n/(n+32)，把小樣本往 0 拉。',
  '懲罰網格沿用 ['+LAMBDAS.join(', ')+']，只依訓練折的預測誤差選擇，選到 '+study.lambda+'。門檻網格是 ['+THRESHOLDS.join(', ')+'] 加上維持 v2。選擇目標是訓練折裡、按原始對局平均後的收縮收益。出現沒有分支證據的第三動作，或保護允許範圍以外的改選，該門檻就失去資格。保護局面因此是約束，不是獨立測試。',
  '訓練折的門檻結果：'+study.thresholdSearch.map(item=>{
   const name=item.threshold==null?'維持 v2':String(item.threshold);
   return name+' 收益 '+num(item.utility)+'，資格 '+(item.eligible?'可選':'不可選')+'，含第三動作的折 '+item.unknownFolds+'，碰到保護約束的折 '+item.illegalFolds;
  }).join('。')+'。較低門檻即使在訓練折有很小的正收益，也沒有拿到開發資料上再試。',
  '開發局面沒有參與選懲罰或門檻。維持 v2 的局部收益是 0。同一對局裡多個局面先平均，再跨對局看區間；沒有加成整場勝率。第三動作沒有算成 0，也沒有算成有效改選。',
  '開發改選覆蓋率 '+num(study.devSummary.coverage)+'，其中兩邊都有分支證據的覆蓋率 '+num(study.devSummary.verifiedCoverage)+'。有效方向 '+study.devSummary.effective+'，反向 '+study.devSummary.reverse+'。訓練資料上的可核對改選 '+study.trainSummary.verified+'，反向 '+study.trainSummary.reverse+'，第三動作 '+study.trainSummary.unknown+'。',
  '正向訊號必須同時滿足：門檻不是維持 v2、開發沒有第三動作、有效改選多於反向、對局平均收益的區間下界大於 0、保護約束通過。這次'+(study.signal?'成立':'不成立')+'。',
  '不採用，不部署，不合併，沒有新對局，也沒有 5,000 場。正式 v2、070 凍結權重、Hard Search 2、Hard cap 7、規則與冠軍晉級標準都沒有改。'
 ].join('\n\n')+'\n';
}
main();
