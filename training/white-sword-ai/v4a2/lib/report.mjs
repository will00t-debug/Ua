// Traditional Chinese report. Exploration and strength stay in separate sections.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {STAGE_A_GATE,STAGE_B_GATE} from './protocol.mjs';

function pct(value){
 if(!Number.isFinite(value))return '沒有資料';
 return (value*100).toFixed(1)+'%';
}
function num(value,digits=1){
 if(!Number.isFinite(value))return '沒有資料';
 return value.toFixed(digits);
}
function lines(title,rows){
 return ['## '+title,'',...rows,''].join('\n');
}
function environment(){
 try{
  return JSON.parse(readFileSync(join(process.cwd(),'training/white-sword-ai/v4a2/environment.json'),'utf8'));
 }catch{return null;}
}
function phaseRows(buckets){
 const names={
  'early-energy':'前期能源','ap':'AP','line-move':'前線移動','mid-entry':'角色登場',
  raid:'Raid','attack-defense':'攻擊與格擋','late-pressure':'中後期生命壓力'
 };
 return Object.entries(buckets||{}).map(([bucket,count])=>'| '+(names[bucket]||bucket)+' | '+count+' |');
}
export function renderReport(report){
 const stageA=report.stageA||{};
 const train=stageA.train||{};
 const holdout=stageA.holdout||{};
 const sensitive=stageA.trainMeasure?.byFamily?.sensitive||{};
 const gaussian=stageA.trainMeasure?.byFamily?.gaussian||{};
 const holdSensitive=stageA.holdoutMeasure?.byFamily?.sensitive||{};
 const holdGaussian=stageA.holdoutMeasure?.byFamily?.gaussian||{};
 const teacher=stageA.teacher||{};
 const env=environment();
 const decision=stageA.decision||{passed:false,reasons:[]};
 const stageB=report.stageB||{status:'skipped'};
 const stageC=report.stageC||{status:'skipped',promoted:false};
 const envRows=env?[
  '低負載（load '+env.load+'）下，`tests/ai-v3-attack-empty-front.test.mjs` 各跑 '+env.runs+' 次。',
  '',
  '| 版本 | 提交 | 通過 |',
  '| --- | --- | --- |',
  '| main | `'+env.main.sha+'` | '+env.main.passed+'/'+env.runs+' |',
  '| PR #572 修正前 | `'+env.pr572.sha+'` | '+env.pr572.passed+'/'+env.runs+' |',
  '| PR #573 | `'+env.pr573.sha+'` | '+env.pr573.passed+'/'+env.runs+' |',
  '',
  'GitHub Actions run '+env.ci.run+' 的失敗是 40 毫秒預算把搜尋停在 `boundary: yielded`。攻擊的部分分數是 '+env.ci.attack+'，過牌是 '+env.ci.pass+'。三個版本在空閒機器上都完成了同一棵 48 節點的樹，所以這不是規則回歸，也不是 #572 的格擋下限修正造成的。',
  '',
  '測試修正在 `'+env.fix.sha+'`。節點上限仍是 '+env.fix.nodes+'，對戰預算仍是 '+env.fix.ms+' 毫秒。搜尋被標記為 yielded 時，測試只確認它是未完成標籤；兩條線都回傳後才要求攻擊。這次沒有合併 #572，也沒有部署。'
 ]:[];
 const body=[
  '# 白劍 AI v4-A.2 局面敏感型探索報告',
  '',
  '這一輪要回答的是：AI 能不能自己找到會改變合法出牌的方向。分歧變多只代表探索變廣，不代表棋力變強。',
  '',
  lines('環境確認',envRows),
  lines('事先登記的通過標準',[
   'Stage A 在看結果之前就寫在程式裡。訓練帶內局面至少 '+STAGE_A_GATE.minBandPositions+' 個，至少 '+STAGE_A_GATE.minBuckets+' 類各有 '+STAGE_A_GATE.minPerBucket+' 個。敏感型對冠軍的帶內分歧率至少 '+pct(STAGE_A_GATE.minBandRate)+'，而且至少是高斯對照的 '+STAGE_A_GATE.minLift+' 倍。分歧要出現在至少 '+STAGE_A_GATE.minBucketsWithDisagreement+' 類，候選彼此的分歧率至少 '+pct(STAGE_A_GATE.minPairwise)+'。保留局面至少 '+STAGE_A_GATE.minHoldoutBand+' 個，敏感型分歧率至少 '+pct(STAGE_A_GATE.minHoldoutRate)+'，並且不低於保留局面上的高斯對照。非法選擇必須是 0。',
   '',
   'Stage B 只有 A 通過才打。敏感型平均勝率如果比高斯對照低超過 '+pct(STAGE_B_GATE.maxWinDrop)+'，就停止，不追加對局。Stage C 只有 B 通過才打，晉級門檻和 v4-A.1 相同。R1–R5 的種子，以及 94000–94016、130000–130016，都沒有拿來當新的驗證。'
  ]),
  lines('局面挖掘',[
   '| 項目 | 訓練池 | 保留池 |',
   '| --- | ---: | ---: |',
   '| 使用種子 | '+(train.walked??'沒有資料')+' | '+(holdout.walked??'沒有資料')+' |',
   '| 可見決策 | '+(train.decisions??'沒有資料')+' | '+(holdout.decisions??'沒有資料')+' |',
   '| 多個合法動作 | '+(train.multi??'沒有資料')+' | '+(holdout.multi??'沒有資料')+' |',
   '| 容許帶內至少兩個動作 | '+(train.bandSeen??'沒有資料')+' | '+(holdout.bandSeen??'沒有資料')+' |',
   '| 寫進局面池 | '+(train.stored??'沒有資料')+' | '+(holdout.stored??'沒有資料')+' |',
   '| 重複而略過 | '+(train.duplicates??'沒有資料')+' | '+(holdout.duplicates??'沒有資料')+' |',
   '| 帶內多動作佔多動作決策 | '+pct(train.bandRate)+' | '+pct(holdout.bandRate)+' |',
   '| 平均搜尋毫秒 | '+num(train.meanSearchMs)+' | '+num(holdout.meanSearchMs)+' |',
   '',
   '訓練池的類型數量：',
   '',
   '| 類型 | 局面 |',
   '| --- | ---: |',
   ...phaseRows(train.countsByBucket),
   '',
   '解析排名和實際 blend 不一致的次數：訓練 '+(train.mismatches??'沒有資料')+'，保留 '+(holdout.mismatches??'沒有資料')+'。'
  ]),
  lines('新舊探索方式',[
   '| 比較 | 敏感型 | 高斯對照 |',
   '| --- | ---: | ---: |',
   '| 訓練帶內局面 | '+(sensitive.positions??'沒有資料')+' | '+(gaussian.positions??'沒有資料')+' |',
   '| 和冠軍不同的局面 | '+(sensitive.disagreed??'沒有資料')+' | '+(gaussian.disagreed??'沒有資料')+' |',
   '| 對冠軍分歧率 | '+pct(sensitive.bandRate)+' | '+pct(gaussian.bandRate)+' |',
   '| 候選彼此分歧率 | '+pct(sensitive.pairwise)+' | '+pct(gaussian.pairwise)+' |',
   '| 有分歧的類型數 | '+(sensitive.bucketsWithDisagreement??'沒有資料')+' | '+(gaussian.bucketsWithDisagreement??'沒有資料')+' |',
   '| 保留局面分歧率 | '+pct(holdSensitive.bandRate)+' | '+pct(holdGaussian.bandRate)+' |',
   '',
   '敏感型各類型的分歧局面：',
   '',
   '| 類型 | 分歧局面 |',
   '| --- | ---: |',
   ...phaseRows(sensitive.buckets),
   '',
   '找到的可翻轉方向：'+(stageA.flips??'沒有資料')+'。單一局面的解析排名平均 '+num(stageA.rankMs,3)+' 毫秒。合法選擇失敗次數：'+(stageA.trainMeasure?.illegal??'沒有資料')+'。',
   '',
   'Stage A：'+(decision.passed?'通過':'沒有通過')+'。',
   ...(decision.reasons||[]).map(reason=>'- '+reason)
  ]),
  lines('深度教師',[
   '教師使用 192 個節點，沒有時鐘，只在離線流程執行。正式 Hard Search 2 仍是 48 個節點、沒有時鐘。未完成或不穩定的結果沒有當成標籤。',
   '',
   '| 項目 | 數值 |',
   '| --- | ---: |',
   '| 詢問次數 | '+(teacher.asked??'沒有資料')+' |',
   '| 兩次抽樣都完成 | '+(teacher.complete??'沒有資料')+' |',
   '| 完成率 | '+pct(teacher.completionRate)+' |',
   '| 穩定 | '+(teacher.stable??'沒有資料')+' |',
   '| 不穩定 | '+(teacher.unstable??'沒有資料')+' |',
   '| 未完成 | '+(teacher.incomplete??'沒有資料')+' |',
   '| 穩定結果和 Hard Search 2 一致 | '+pct(teacher.agreement)+' |',
   '| 穩定建議落在容許帶內 | '+pct(teacher.insideCap)+' |',
   '| 穩定建議被容許帶排除 | '+pct(teacher.excludedByCap)+' |',
   '| 48 節點沒有比較到 | '+pct(teacher.notCompared)+' |',
   '',
   '被容許帶排除的穩定建議，按類型：',
   '',
   '| 類型 | 穩定 | 帶內 | 被排除 | 沒比較到 |',
   '| --- | ---: | ---: | ---: | ---: |',
   ...Object.entries(teacher.byBucket||{}).map(([bucket,row])=>'| '+bucket+' | '+row.stable+' | '+row.inside+' | '+row.excluded+' | '+row.notCompared+' |')
  ]),
  lines('對戰與晉級',[
   'Stage B：'+(stageB.status==='skipped'?'沒有執行':(stageB.passed?'通過':'沒有通過'))+'。對局數 '+(stageB.games??0)+'。',
   ...(stageB.decision?.reasons||[]).map(reason=>'- '+reason),
   stageB.decision?'敏感型勝率 '+pct(stageB.decision.sensitive?.p)+'，高斯對照 '+pct(stageB.decision.gaussian?.p)+'，差距 '+pct(stageB.decision.drop)+'。':'',
   'Stage C：'+(stageC.status==='skipped'?'沒有執行':(stageC.promoted?'晉級':'沒有晉級'))+'。對局數 '+(stageC.games??0)+'。',
   stageC.paired?'配對勝率差 '+pct(stageC.paired.delta)+'，95% 區間 '+pct(stageC.paired.ci?.low)+' 到 '+pct(stageC.paired.ci?.high)+'。':'',
   stageC.mirror?'直接鏡像 '+((stageC.mirror.wins??0)+'/'+(stageC.mirror.n??0))+'，勝率 '+pct(stageC.mirror.p)+'，Wilson 下限 '+pct(stageC.mirror.low)+'。':'',
   ...(stageC.judgment?.reasons||[]).map(reason=>'- '+reason)
  ]),
  lines('探索和棋力',[
   '探索改善：'+(report.exploration?'敏感型方法達到事先登記的分歧標準。':'這次沒有證明探索比高斯對照更有效。'),
   '棋力改善：'+(report.strength?'獨立對局通過既有晉級門檻。':'沒有獨立對局證明新策略比 v2 更強。'),
   '實驗冠軍：'+(report.experimentalChampion||'沒有更換。正式 v2 權重沒有修改。'),
   '下一輪自動訓練：'+(report.continued?'這一輪已經產生新的實驗冠軍，仍不部署。':'不建議把同一套流程直接再跑一輪大規模對戰。')
  ])
 ];
 return body.filter(row=>row!==''||true).join('\n').replace(/\n{3,}/g,'\n\n');
}
