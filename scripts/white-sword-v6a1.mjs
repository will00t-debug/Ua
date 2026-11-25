#!/usr/bin/env node
// Audit saved pairs and rescore the frozen residual. No new games.
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {buildHistorical} from '../training/white-sword-ai/v6a/lib/dataset.mjs';
import {differenceFeatures,fitRidge,pairPredict} from '../training/white-sword-ai/v6a/lib/model.mjs';
import {FROZEN_WEIGHT} from '../training/white-sword-ai/v6a/lib/protocol.mjs';
import {buildAudited} from '../training/white-sword-ai/v6a1/lib/audit.mjs';
import {decisionReport,featureReport,gameLoss,gamesNeeded,positionLoss,scaleReport} from '../training/white-sword-ai/v6a1/lib/metrics.mjs';
import {renderReport} from '../training/white-sword-ai/v6a1/lib/report.mjs';

const ROOT='training/white-sword-ai/v6a1';
const SCALES=[0.25,0.5,1,2,4,8];

function designed(rows){
 return rows.map(row=>({...row,x:differenceFeatures(row.featuresA,row.featuresB,[])}));
}
function pack(rows,model){
 const ready=designed(rows);
 return {position:positionLoss(ready,model),game:gameLoss(ready,model),zero:positionLoss(ready,{beta:[]})};
}
function chooseScale(train,model){
 let best=null;
 for(const factor of SCALES){
  const scaled={...model,beta:model.beta.map(value=>value*factor)};
  const losses=[];
  for(let fold=0;fold<5;fold++){
   const held=train.filter(row=>row.fold===fold);
   if(!held.length)continue;
   losses.push(positionLoss(designed(held),scaled).mse);
  }
  const mse=losses.reduce((sum,value)=>sum+value,0)/losses.length;
  if(!best||mse<best.mse-1e-12||(Math.abs(mse-best.mse)<=1e-12&&Math.abs(factor-1)<Math.abs(best.factor-1)))best={factor,mse};
 }
 return best;
}

function main(){
 const official=v2Hash();
 const weights=loadModel(V2_FILE).policy;
 const control=readJson('training/white-sword-ai/v5b/candidate.json');
 if(control.weight!==FROZEN_WEIGHT)throw Error('070 對照權重被改過');
 const previous=readJson('training/white-sword-ai/v6a/model.json');
 const plan=readJson('training/white-sword-ai/v6a/sample-plan.json');
 const mine=readJson('training/white-sword-ai/v6a/mine.json');
 const forceDev=new Set();
 for(const id of plan?.ids||[]){
  const position=(mine?.positions||[]).find(row=>row.id===id);
  if(position)forceDev.add((position.opponent||'unknown')+'|'+position.seed);
 }
 const audited=buildAudited({forceDev});
 const oldRows=buildHistorical();
 const oldById=new Map(oldRows.map(row=>[row.id,row]));
 const train=audited.rows.filter(row=>row.split==='train');
 const dev=audited.rows.filter(row=>row.split==='dev');
 const common=audited.rows.filter(row=>{
  const prior=oldById.get(row.id);
  return prior&&prior.split===row.split&&row.split!=='dev-recheck';
 });
 const oldModel={beta:previous.beta,scale:previous.scale,interactions:previous.interactions||[],clip:previous.clip};
 const commonDev=common.filter(row=>row.split==='dev');
 const commonOld=commonDev.map(row=>{
  const prior=oldById.get(row.id);
  return {...row,y:prior.y,weight:prior.weight};
 });
 const refit=fitRidge(designed(train),previous.lambda);
 const model={...refit,interactions:[],clip:previous.clip};
 const scale=chooseScale(train,model);
 const scaled={...model,beta:model.beta.map(value=>value*scale.factor)};
 const features=featureReport(train);
 const decisions=decisionReport(audited.rows,weights,model);
 const scaledDecisions=decisionReport(audited.rows,weights,scaled);
 const atEight=decisionReport(audited.rows,weights,{...model,beta:model.beta.map(value=>value*8)});
 const recheck=audited.rows.filter(row=>row.split==='dev-recheck');
 const recheckLoss=pack(recheck,model);
 const needed=gamesNeeded(recheckLoss.position.correlation,recheck.length);
 const devRefit=pack(dev,model);
 const learned=devRefit.position.mse<devRefit.zero.mse&&decisions.changed>0&&decisions.protectedChanged===0
  ?'開發子集上的局面誤差低於零預測，而且有改選。這仍是開發證據，不是獨立測試。'
  :'沒有。修正後的開發局面誤差沒有同時打敗零預測並產生可驗證的改選。';
 const trust=audited.counts.keyConflict||audited.counts.featureConflict||audited.counts.actorConflict
  ?'動作鍵或特徵有衝突，衝突的局面已隔離。其餘配對可以重建。'
  :'已核對的副本裡，A/B 動作鍵、特徵和行動者沒有衝突。同一來源內的配對可以重建。跨檔案的嘗試編號不是同一次抽樣，不能當成重複樣本合併。評估若先把同一對局的局面平均，會把方向相反的誤差抵掉，所以局面誤差必須分開看。';
 const next=learned.startsWith('沒有')
  ?'值得做的下一個最小驗證，不是再堆同一種配對。這次擬合出的殘差遠小於混合分差，訓練交叉驗證把倍數留在 1。把同一組係數乘上 8 會改選 '+atEight.changed+' 個，其中方向與平均差相同 '+atEight.toward+' 個、相反 '+atEight.against+' 個，而且不在開發對局。要跨過中位數混合分差，倍數要大一個數量級，而且會先碰到 ±18 的夾限。那已經超出這輪允許的調整。下一個問題是：在訓練對局裡、不放寬夾限、不新增特徵，有沒有任何殘差能改變開發局面，而且方向和配對平均差一致、保護局面不動。若沒有，再收集同一種資料不會讓這個接法開始改選。'
  :'可以做一次事先凍結的小驗證，但這輪的結果還不是那個證據。';
 const study={
  official,data:{
   ...audited.counts,noSeed:audited.quarantined.filter(row=>row.reason.includes('種子')).length,
   conflict:audited.dropped.conflict,incomplete:audited.dropped.incomplete,duplicate:audited.dropped.duplicate,
   kept:audited.rows.length,
   multiSource:audited.rows.filter(row=>row.sources.length>1).length,
   extraPairs:audited.rows.reduce((sum,row)=>sum+(oldById.get(row.id)?Math.max(0,row.n-oldById.get(row.id).n):0),0)
  },
  scale:scaleReport(dev,weights,model),
  multiplier:scale.factor,
  features:{
   linear:{width:features.linear.width,rank:features.linear.rank,zero:features.linear.zero},
   interaction:{width:features.interaction.width,rank:features.interaction.rank}
  },
  before:pack(commonOld,oldModel),
  sameModel:pack(commonDev,oldModel),
  refit:pack(commonDev,model),
  scaled:pack(commonDev,scaled),
  decisions,scaledChanged:scaledDecisions.changed,
  needed,recheck:{positions:recheck.length,...recheckLoss},
  trust,learned,next
 };
 const prior=readJson('training/white-sword-ai/v5b/candidate.json');
 if(prior.weight!==FROZEN_WEIGHT)throw Error('070 權重被改過');
 if(v2Hash()!==official)throw Error('v2 被改過');
 writeJson(ROOT+'/study.json',{...study,features:study.features,quarantine:audited.quarantined.length});
 writeJson(ROOT+'/refit.json',{adopted:false,promoted:false,candidate:false,lambda:previous.lambda,scale:scale.factor,beta:model.beta});
 const report=renderReport(study);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v6a1/report.md',report);
 console.log(JSON.stringify({kept:study.data.kept,extra:study.data.extraPairs,multiplier:scale.factor,changed:decisions.changed,devMse:study.refit.position.mse,zero:study.refit.zero.mse}));
}
main();
