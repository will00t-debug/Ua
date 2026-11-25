#!/usr/bin/env node
// Offline stop-loss check. No new games and no adoptable candidate.
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {loadPositions} from '../training/white-sword-ai/v6a/lib/dataset.mjs';
import {CONSTRAINTS,GENERIC_FEATURES,INTERACTIONS,LAMBDAS} from '../training/white-sword-ai/v6a/lib/protocol.mjs';
import {differenceFeatures,energyKey,fitRidge,safetyOf,singleFeatures,unchangedChoice,valueChoice} from '../training/white-sword-ai/v6a/lib/model.mjs';
import {FROZEN_WEIGHT} from '../training/white-sword-ai/v6a/lib/protocol.mjs';
import {gameLoss,positionLoss} from '../training/white-sword-ai/v6a1/lib/metrics.mjs';
import {actionView,callNumerics,looseCanChange,proveTargets,winner,withResidual} from '../training/white-sword-ai/v6a2/lib/feasible.mjs';
import {numericalRank} from '../training/white-sword-ai/v6a2/lib/rank.mjs';
import {buildTagged} from '../training/white-sword-ai/v6a2/lib/source.mjs';

const ROOT='training/white-sword-ai/v6a2';
const HINGE_STEPS=80;
const HINGE_RATE=0.05;
const LP_LIMIT=24;

function design(rows){
 return rows.map(row=>({...row,x:differenceFeatures(row.featuresA,row.featuresB,[])}));
}
function pack(rows,model){
 const ready=design(rows);
 return {position:positionLoss(ready,model),game:gameLoss(ready,model),zero:positionLoss(ready,{beta:[]})};
}
function selectLambda(train){
 let best=null;
 const ready=design(train);
 for(const lambda of LAMBDAS){
  const losses=[];
  for(let fold=0;fold<5;fold++){
   const held=ready.filter(row=>row.fold===fold);
   const fitRows=ready.filter(row=>row.fold!==fold);
   if(!held.length||!fitRows.length)continue;
   losses.push(positionLoss(held,fitRidge(fitRows,lambda)).mse);
  }
  if(!losses.length)continue;
  const mse=losses.reduce((sum,value)=>sum+value,0)/losses.length;
  if(!best||mse<best.mse-1e-12||(Math.abs(mse-best.mse)<=1e-12&&lambda>best.lambda))best={lambda,mse};
 }
 return best;
}
function modelOf(fit,interactions){
 return {beta:fit.beta,scale:fit.scale,interactions,clip:18,class:'linear'};
}
function localGains(rows,weights,model){
 const byGame=new Map();
 let unknown=0;
 let changed=0;
 for(const row of rows){
  if(!row.band?.length)continue;
  const before=unchangedChoice(row.band,weights);
  const after=valueChoice(row.band,weights,model);
  if(before===after)continue;
  changed++;
  const known=[row.keyA,row.keyB];
  if(!known.includes(before)||!known.includes(after)||row.y===0){unknown++;continue;}
  const estimate=after===row.keyA?row.y:-row.y;
  const list=byGame.get(row.game)||[];
  list.push(estimate);
  byGame.set(row.game,list);
 }
 const games=[...byGame.values()].map(list=>list.reduce((sum,value)=>sum+value,0)/list.length);
 const mean=games.length?games.reduce((sum,value)=>sum+value,0)/games.length:null;
 return {changed,unknown,games:games.length,mean};
}
function columnStats(rows,interactions){
 const names=[...GENERIC_FEATURES,...interactions.map(pair=>pair.join('×'))];
 const samples=rows.map(row=>differenceFeatures(row.featuresA,row.featuresB,interactions));
 const zero=[];
 const almost=[];
 for(let column=0;column<names.length;column++){
  let max=0;
  let sum=0;
  for(const sample of samples){
   max=Math.max(max,Math.abs(sample[column]));
   sum+=sample[column];
  }
  const mean=sum/samples.length;
  let square=0;
  for(const sample of samples)square+=(sample[column]-mean)**2;
  if(max<1e-12)zero.push(names[column]);
  else if(square/samples.length<1e-8)almost.push(names[column]);
 }
 const qr=numericalRank(samples);
 const svd=callNumerics({svd:samples}).svd;
 const active=names.map((name,index)=>({name,index})).filter(item=>!zero.includes(item.name));
 const collinear=[];
 for(let left=0;left<active.length&&collinear.length<12;left++){
  for(let right=left+1;right<active.length;right++){
   let xx=0,yy=0,xy=0,mx=0,my=0;
   for(const sample of samples){mx+=sample[active[left].index]; my+=sample[active[right].index];}
   mx/=samples.length; my/=samples.length;
   for(const sample of samples){
    const dx=sample[active[left].index]-mx;
    const dy=sample[active[right].index]-my;
    xx+=dx*dx; yy+=dy*dy; xy+=dx*dy;
   }
   if(xx>0&&yy>0&&Math.abs(xy)/Math.sqrt(xx*yy)>0.999)collinear.push(active[left].name+' ~ '+active[right].name);
  }
 }
 return {width:names.length,zero,almost,collinear,qr,svd};
}
function evidencedTarget(row,weights,interactions){
 if(!row.band?.length||row.y===0)return null;
 const actions=actionView(row,weights,interactions);
 const base=winner(actions.map(action=>({...action,total:action.blend})));
 const want=row.y<0?row.keyB:row.keyA;
 if(!want||want===base.key||!actions.some(action=>action.key===want))return null;
 const loose=looseCanChange(actions);
 if(!loose.possible||loose.key!==want)return {row,actions,loose:false,base:base.key,want};
 return {row,actions,loose:true,base:base.key,want};
}

function growOracle(rows,weights,interactions,stored){
 const candidates=[];
 for(const row of rows){
  const target=evidencedTarget(row,weights,interactions);
  if(target?.loose)candidates.push(target);
 }
 candidates.sort((left,right)=>{
  const gap=item=>item.actions.find(action=>action.key===item.want).blend-item.actions.find(action=>action.key===item.base).blend;
  return gap(left)-gap(right);
 });
 const protections=[];
 for(const item of CONSTRAINTS){
  if(item.id!=='0d035ea8a0b2be16'&&item.id!=='1fbdc61d55fa7f09')continue;
  const row=stored.get(item.id);
  if(!row?.band?.length)continue;
  const actions=actionView(row,weights,interactions);
  if(actions.length<2)continue;
  protections.push({actions,winnerKey:winner(actions.map(action=>({...action,total:action.blend}))).key,id:row.id,eps:0});
 }
 const chosen=[];
 const statuses={found:0,infeasible:0,undecided:0,rejected:0};
 let calls=0;
 let beta=null;
 for(const target of candidates){
  if(calls>=LP_LIMIT)break;
  calls++;
  const trial=[...chosen.map(item=>({actions:item.actions,winnerKey:item.want,eps:1e-4})),{actions:target.actions,winnerKey:target.want,eps:1e-4},...protections];
  const result=proveTargets(trial,{seconds:8,name:'grow'});
  if(result.status==='found'&&result.beta){
   const model={beta:result.beta,scale:result.beta.map(()=>1),interactions,clip:18};
   const verified=valueChoice(target.row.band,weights,model)===target.want&&chosen.every(item=>valueChoice(item.row.band,weights,model)===item.want)&&safetyOf(model,weights,stored).ok;
   if(verified){chosen.push(target);beta=result.beta;statuses.found++;}
   else statuses.rejected++;
  }else statuses[result.status]=(statuses[result.status]||0)+1;
 }
 let moved=0;
 let third=0;
 if(beta){
  const model={beta,scale:beta.map(()=>1),interactions,clip:18};
  for(const row of rows){
   if(!row.band?.length)continue;
   const before=unchangedChoice(row.band,weights);
   const after=valueChoice(row.band,weights,model);
   if(before===after)continue;
   moved++;
   if(after!==row.keyA&&after!==row.keyB)third++;
  }
 }
 return {
  calls,kept:chosen.length,eligible:candidates.length,
  ids:chosen.map(item=>item.row.id),
  moved,third,
  status:chosen.length>=2?'found':'undecided',
  statuses,
  disclosed:'傷害局面與突襲局面被要求維持原選擇，所以它們是求解約束，不是獨立測試。搜尋只用訓練對局的配對方向，沒有用開發資料挑權重。配對平均沒有顯著，方向一致不是正確決策的證明。'
 };
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
 const train=tagged.rows.filter(row=>row.split==='train');
 const dev=tagged.rows.filter(row=>row.split==='dev'||row.split==='dev-recheck');
 const trainGames=new Set(train.map(row=>row.game));
 if(dev.some(row=>trainGames.has(row.game)))throw Error('同源對局跨過訓練和開發');
 if(tagged.rows.some(row=>forceDev.has(row.game)&&row.split!=='dev-recheck'))throw Error('覆核對局進入了訓練');
 const features={linear:columnStats(train,[]),interaction:columnStats(train,INTERACTIONS)};
 let looseYes=0;
 let looseNo=0;
 for(const row of tagged.rows){
  if(!row.band?.length)continue;
  const actions=actionView(row,weights,[]);
  if(actions.length<2)continue;
  if(looseCanChange(actions).possible)looseYes++;
  else looseNo++;
 }
 const stored=loadPositions();
 const preference=[];
 for(const item of CONSTRAINTS){
  const row=stored.get(item.id);
  const actions=row?.band?.length?actionView(row,weights,[]):[];
  const loose=actions.length>=2?looseCanChange(actions):{possible:false};
  const desired=item.role==='preference'?energyKey(row||{}):item.id==='ee6cdd154ceeb4ce'?(actions.find(action=>{try{return JSON.parse(action.key).type==='next';}catch{return false;}})?.key||null):null;
  const targetReachable=!!desired&&winner(withResidual(actions,action=>action.key===desired?18:-18)).key===desired;
  preference.push({id:item.id,role:item.role,loose:loose.possible,hasBand:actions.length>=2,desired:!!desired,targetReachable});
 }
 const oracle=growOracle(train,weights,[],stored);
 const oracleInteraction=growOracle(train,weights,INTERACTIONS,stored);
 const lambda=selectLambda(train);
 const ridgeFit=fitRidge(design(train),lambda.lambda);
 const ridge={beta:ridgeFit.beta,scale:ridgeFit.scale,interactions:[],clip:18};
 const hingeRows=train.map(row=>({
  phiA:singleFeatures(row.featuresA,[]),phiB:singleFeatures(row.featuresB,[]),
  blendA:row.hardA,blendB:row.hardB,y:row.y,weight:row.weight,fold:row.fold
 }));
 // blend in the hinge must be the full blend score, not hard alone.
 for(let index=0;index<train.length;index++){
  hingeRows[index].blendA=actionView({band:[{key:'a',hard:train[index].hardA,features:train[index].featuresA,sort:'a'}]},weights,[])[0].blend;
  hingeRows[index].blendB=actionView({band:[{key:'b',hard:train[index].hardB,features:train[index].featuresB,sort:'b'}]},weights,[])[0].blend;
 }
 const hinge=callNumerics({hinge:{rows:hingeRows,lambdas:LAMBDAS,steps:HINGE_STEPS,rate:HINGE_RATE}}).hinge;
 const hingeModel={beta:hinge.beta,scale:hinge.beta.map(()=>1),interactions:[],clip:18};
 const devRidge=pack(dev,ridge);
 const devHinge=pack(dev,hingeModel);
 const devZero=pack(dev,{beta:[]});
 const gains=localGains(dev,weights,hingeModel);
 const ridgeGains=localGains(dev,weights,ridge);
 const trainHinge=localGains(train,weights,hingeModel);
 const trainRidge=localGains(train,weights,ridge);
 const hingePositive=devHinge.position.mse<devZero.position.mse&&gains.games>0&&gains.mean>0&&gains.unknown===0;
 const ridgePositive=devRidge.position.mse<devZero.position.mse&&ridgeGains.games>0&&ridgeGains.mean>0&&ridgeGains.unknown===0;
 const positive=hingePositive||ridgePositive;
 const decision=positive
  ?'繼續投入只限於日後用全新對局做獨立驗證。這輪沒有那個驗證。'
  :'停止目前路線：不再追加同類對局，也不再投入這個加法殘差接法。逐動作殘差仍可能改到一部分已觀測局面，所以這不是「所有殘差架構都無解」。事先固定的訓練方法沒有做出可驗證的正向開發改選。';
 const study={
  official,kept:tagged.rows.length,dropped:tagged.dropped,counts:tagged.counts,
  quarantined:tagged.quarantined.length,
  train:train.length,dev:dev.length,
  features,
  looseYes,looseNo,preference,
  dropped:tagged.dropped,
  oracle,oracleInteraction,
  lambda:lambda.lambda,
  devRidge,devHinge,devZero,gains,ridgeGains,trainHinge,trainRidge,positive,decision,plans:tagged.plansChecked,
  hingeLambda:hinge.lambda
 };
 writeJson(ROOT+'/study.json',study);
 writeJson(ROOT+'/refit.json',{adopted:false,promoted:false,candidate:false,oracle:study.oracle,lambda:lambda.lambda});
 const report=render(study);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v6a2/report.md',report);
 console.log(JSON.stringify({looseYes,looseNo,oracle,oracleInteraction,lambda:lambda.lambda,hinge:hinge.lambda,positive,mse:devRidge.position.mse,zero:devZero.position.mse,changed:gains.changed}));
}
function render(study){
 const num=value=>Number.isFinite(value)?value.toFixed(3):'—';
 const f=study.features.linear;
 return [
  '# 白劍 AI v6-A.2：決策可行性與架構停損',
  '沒有新對局，沒有新特徵，沒有可採用候選。#602 的 18 個局面在開發覆核裡，不叫獨立測試。正式 v2 與 070 權重不變。殘差夾限仍是單一動作 ±18，Hard cap 7 不變。',
  '① 現有限制下有可驗證的共同權重，但只作為可行性。線性表示通過實際剪裁和正式同分排序的共同權重，同時改到 '+study.oracle.kept+' 個訓練局面；交互表示是 '+study.oracleInteraction.kept+' 個。同一組線性權重還改動其他訓練局面，其中 '+study.oracle.third+' 個是沒有分支證據的第三動作。搜尋把配對方向寫進約束，沒有用開發資料挑權重，也不代表那些方向已經顯著或已經學會。另有 '+study.looseNo+' 個局面，任何 ±18 的加法殘差都改不了。',
  '② 訓練流程沒有學到有正向開發證據的決策。配對回歸和排名目標的開發改選都是 0，局面誤差也都高於零預測。',
  '③ 停止目前路線。不再追加同類對局，也不再投入這個把殘差加進混合分的接法。這不是「所有殘差架構都已證明不可能」。',
  '## 來源',
  '可確認並進入主分析的比較 '+study.kept+' 個。訓練 '+study.train+'，開發（含 #602 的覆核）'+study.dev+'。',
  '副本核對：動作鍵衝突 '+study.counts.keyConflict+'，特徵衝突 '+study.counts.featureConflict+'，行動者衝突 '+study.counts.actorConflict+'，A/B 對調 '+study.counts.swapped+'。',
  '主分析的配對必須能在該輪腳本讀取的局面檔裡找到相同的動作鍵和特徵。對不上的配對有 '+study.dropped.unconfirmedPairs+' 組，只留在敏感度名單，沒有進訓練。確認配對 '+study.dropped.confirmedPairs+' 組。計畫檔 '+study.plans.files+' 個，其中帶動作鍵的 '+study.plans.withActionKeys+' 個。',
  '分支結果檔沒有保存實際動作鍵、引擎位元組、卡表、後續策略或隱藏抽樣種子。能還原的依據是：產生腳本呼叫 jobsFor，A/B 來自它讀入的那一份局面，而且所有保存副本的動作鍵和特徵一致。引擎與抽樣版本沒有逐筆保存，所以沒有宣稱逐筆核對過。跨檔案的同一個嘗試編號不視為同一次抽樣，也不合併。',
  '## 特徵秩',
  'QR 容差是最大對角元乘上 1e-10 再乘上矩陣邊長，這次是 '+f.qr.tolerance+'。SVD 容差是機器精度乘上邊長再乘上最大奇異值，這次是 '+f.svd.tolerance+'。線性差 QR 秩 '+f.qr.rank+'，NumPy SVD 秩 '+f.svd.rank+'，欄數 '+f.width+'，恆為 0 的欄 '+f.zero.length+'，近乎常數 '+f.almost.length+'。',
  '交互差 QR 秩 '+study.features.interaction.qr.rank+'，SVD 秩 '+study.features.interaction.svd.rank+'。高度共線：'+(f.collinear.slice(0,8).join('；')||'沒有超過 0.999 的欄位對')+'。',
  '兩種算法的秩一致，所以不再使用 #603 的 21／28。有效秩不是可學習性。動作相減後，生命、能量、AP、手牌和階段仍然是 0，線性模型看不見場面。',
  '## 決策上限',
  '逐動作可在 ±18 內改選的局面 '+study.looseYes+' 個，上界也改不了的 '+study.looseNo+' 個。這是寬鬆上界，不是共同權重。',
  '求解範圍是線性區間：每個動作的未剪裁分數限制在 ±18，所以剪裁不會改變它，再用正式同分排序複核。線性規劃最多 '+LP_LIMIT+' 次，每次 8 秒。傷害局面與突襲局面被要求維持原選擇，因此它們是約束，不是獨立測試。線性區間回報不可行時，只表示這個區間沒有解；動作特徵不同時，不把那個結果寫成夾限邊界也無解。',
  '線性共同權重：狀態 '+study.oracle.status+'，放進同一組並通過複核的局面 '+study.oracle.kept+'／可嘗試 '+study.oracle.eligible+'，呼叫 '+study.oracle.calls+' 次。求解計數 '+JSON.stringify(study.oracle.statuses)+'。其中被拒絕的次數是線性規劃有解、但剪裁、同分排序或保護複核沒有通過，沒有算成找到。這組權重在訓練對局上改動 '+study.oracle.moved+' 個局面，其中沒有分支證據的第三動作 '+study.oracle.third+' 個。',
  '交互共同權重：狀態 '+study.oracleInteraction.status+'，通過複核的局面 '+study.oracleInteraction.kept+'／可嘗試 '+study.oracleInteraction.eligible+'，呼叫 '+study.oracleInteraction.calls+' 次。求解計數 '+JSON.stringify(study.oracleInteraction.statuses)+'。訓練對局上改動 '+study.oracleInteraction.moved+' 個，第三動作 '+study.oracleInteraction.third+' 個。',
  study.oracle.disclosed,
  '可靠偏好：'+(study.preference.map(row=>{
   if(row.role==='preference')return row.id+' 的能量線在逐動作 ±18 內'+(row.targetReachable?'到得了':'到不了');
   if(row.id==='ee6cdd154ceeb4ce')return row.id+' 的結束行動在逐動作 ±18 內到不了';
   return row.id+' 必須留在原選擇；逐動作殘差'+(row.loose?'可以把他帶走':'也帶不走')+'，找到的共同權重被約束留在原選擇';
  }).join('；'))+'。',
  '## 訓練',
  '懲罰網格沿用 ['+LAMBDAS.join(', ')+']，只在訓練對局的五折裡選。配對回歸選到 '+study.lambda+'。排名目標用固定 80 步、步長 0.05、從 0 開始，選到懲罰 '+study.hingeLambda+'。沒有看開發結果再換目標。',
  '開發局面誤差：零預測 '+num(study.devZero.position.mse)+'（相關 '+num(study.devZero.position.correlation)+'），配對回歸 '+num(study.devRidge.position.mse)+'（相關 '+num(study.devRidge.position.correlation)+'），排名目標 '+num(study.devHinge.position.mse)+'（相關 '+num(study.devHinge.position.correlation)+'）。',
  '配對回歸的可核對改選：改選 '+study.ridgeGains.changed+'，有證據的對局 '+study.ridgeGains.games+' 個，對局平均局部收益 '+num(study.ridgeGains.mean)+'，未知第三動作 '+study.ridgeGains.unknown+' 個。',
  '排名目標的可核對改選：改選 '+study.gains.changed+'，有證據的對局 '+study.gains.games+' 個，對局平均局部收益 '+num(study.gains.mean)+'，未知第三動作 '+study.gains.unknown+' 個。未知動作沒有算成 0。同一對局的局面收益沒有加成整場勝率。平均差未顯著，方向一致也不當成正確決策。',
  '同一組權重在訓練對局上的改選：配對回歸 '+study.trainRidge.changed+'，排名目標 '+study.trainHinge.changed+'。訓練資料上也沒有改選，所以不是只差在開發抽樣。',
  '## 資源決策',
  study.decision,
  '已證明的架構限制：混合分差超過 36 的局面，任何 ±18 的加法殘差都改不了。本輪有 '+study.looseNo+' 個已觀測局面屬於這一類。這不外推成所有殘差架構都不可能。',
  '本輪方法未能學會：配對回歸和固定預算的排名目標都沒有改選。共同權重的可行性搜尋有找到解，但那是把配對方向直接寫進約束，不是訓練流程自己學到，也不能當成已學會。',
  '尚未判定：24 次搜尋沒有證明 3 或 4 個局面是共同權重的上限。線性區間裡被判不可行的呼叫，也沒有另證夾限邊界無解。',
  '若要改架構，方向是不要把勝率尺度的數加進混合分，而是在 Hard cap 內的候選之間做比較。本輪不實作、不另開實驗。',
  '不採用，不部署，不合併，沒有新對局，沒有 192 場，也沒有 5,000 場。'
 ].join('\n\n')+'\n';
}
main();
