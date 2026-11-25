import {pairedDelta} from './cluster.mjs';
import {AGREEMENT_DROP,SURPASS_SEEDS} from './constants.mjs';
import {
 ARM_RULE,COPY_RULE,EARLY_RULE,FOLLOWUP_RULE,INIT_RULE,LEARNING_RULE,METHOD,PPO_RULE,PROMOTION_RULE,
 READ_RULE,ROUND4_READ_RULE,ROUND4_SELECT_RULE,SCALE_RULE,SELECTION_RULE,TREND_RULE
} from './protocol.mjs';

function pct(rate){
 if(!rate||rate.p==null)return '沒有已完成對局';
 return (rate.p*100).toFixed(1)+'%（'+rate.wins+'/'+rate.n+'，95% 區間 '+
  (rate.low*100).toFixed(1)+'–'+(rate.high*100).toFixed(1)+'）';
}
function ms(value){
 return value==null?'n/a':(value/1000).toFixed(1)+' 秒';
}
function linesOf(title,rows){
 return ['## '+title,'',...rows,''];
}
export function judgeLearning(rate){
 if(!rate||rate.finished<16)return {established:false,reason:'完成對局少於事先登記的 16 場'};
 if(!(rate.low>0.5))return {established:false,reason:'95% 信賴區間下限沒有高於 50%'};
 return {established:true,reason:null};
}
export function judgePrototype(summary){
 const reasons=[];
 if(!summary.bench?.forward)reasons.push('沒有決策吞吐測速');
 if(!summary.bench?.train)reasons.push('沒有訓練吞吐測速');
 if(!summary.bench?.nnGame)reasons.push('沒有神經網路對局測速');
 if(!summary.frozen)reasons.push('沒有凍結初始化模型');
 if(!summary.played)reasons.push('沒有跑實驗對局');
 const anomalies=summary.anomalies||{};
 if(anomalies.illegal)reasons.push('出現非法行動');
 if(anomalies.leak)reasons.push('出現隱藏資訊洩漏');
 return {running:reasons.length===0,reasons};
}
export function renderReport(summary){
 const bench=summary.bench||{};
 const learning=summary.learning||{established:false,reason:'沒有開發對局'};
 const promotion=summary.promotion||{promoted:false,reasons:['沒有挑戰對局']};
 const rows=[
  '# 白劍神經網路原型',
  '',
  '這份結果把「原型有沒有跑起來」和「自主學習有沒有變強」分開。正式 v2、Hard Search 2、遊戲規則和網站都沒有改。',
  '',
  '## 方法',
  '',
  METHOD,
  '',
  '折扣係數 '+summary.gamma+'。模仿學習率 '+summary.imitateLr+'，自我對戰學習率 '+summary.monteLr+'，標籤平滑 '+summary.smooth+'，探索率 '+summary.explore+'。這些數字在看勝率之前就寫在程式裡。',
  '',
  '## 事先登記的判斷',
  '',
  '- 學習：'+LEARNING_RULE,
  '- 晉級：'+PROMOTION_RULE,
  '',
  ...linesOf('測速',[
   '- 神經網路對局：'+ms(bench.nnGame?.ms)+'，'+((bench.nnGame?.steps)??'n/a')+' 步，結果 '+(bench.nnGame?.status||'n/a')+'。',
   '- 正式 v2 鏡像：'+ms(bench.v2Game?.ms)+'，'+((bench.v2Game?.steps)??'n/a')+' 步，結果 '+(bench.v2Game?.status||'n/a')+'。'+(bench.v2Finished?' 有打完。':' 沒有在測速期限內打完。'),
   '- 動作評分：'+((bench.forward?.perSecond)??'n/a')+' 次/秒。',
   '- 訓練更新：'+((bench.train?.perSecond)??'n/a')+' 次/秒。',
   '- 參數：'+(summary.parameters??'n/a')+'。RSS '+((bench.rssMb)??'n/a')+' MB。',
   '- 平行進程：'+(summary.plan?.workers??'n/a')+'。'
  ]),
  ...linesOf('預算',[
   '- 試訓牆鐘 '+ms(summary.plan?.wallMs)+'，估計 '+ms(summary.plan?.estimatedMs)+'，實際 '+ms(summary.elapsedMs)+'。',
   '- 計畫：模仿 '+(summary.plan?.imitate??0)+'、自我對戰 '+(summary.plan?.self??0)+'、開發 '+(summary.plan?.dev??0)+'、測試 '+(summary.plan?.test??0)+'。',
   '- 實際：模仿 '+(summary.actual?.imitate??0)+'、自我對戰 '+(summary.actual?.self??0)+'、開發 '+(summary.actual?.dev??0)+'、測試 '+(summary.actual?.test??0)+'。',
   '- 初始化：'+(summary.initialization||'n/a')+'。',
   '- v2 示範決策：'+(summary.imitationSamples??0)+'。自我對戰樣本：'+(summary.monteSamples??0)+'。',
   '- 模仿損失：'+JSON.stringify(summary.imitationCurve||[])+'。',
   '- 自我對戰均方誤差：'+JSON.stringify(summary.monteCurve||[])+'。',
   '- 權重距離：隨機初始到 A '+(summary.distance?.initToA??'n/a')+'，A 到 B '+(summary.distance?.aToB??'n/a')+'。',
   summary.resourceGap?('- 資源缺口：'+summary.resourceGap):'- 這次預算裡沒有另外標出的資源缺口。'
  ]),
  ...linesOf('開發集：B 對凍結的 A',[
   '- 勝率：'+pct(summary.dev?.overall),
   '- 先手：'+pct(summary.dev?.first),
   '- 後手：'+pct(summary.dev?.second),
   '- 已完成 '+(summary.dev?.overall?.finished??0)+'，未完成 '+(summary.dev?.overall?.unfinished??0)+'。',
   '- 學習是否成立：'+(learning.established?'成立':'不成立')+(learning.reason?'。'+learning.reason:'')+'。'
  ]),
  ...linesOf('測試集：對正式 v2',[
   '- B 對 v2：'+pct(summary.testB?.overall)+'。先手 '+pct(summary.testB?.first)+'。後手 '+pct(summary.testB?.second)+'。',
   '- A 對 v2：'+pct(summary.testA?.overall)+'。',
   '- 晉級：'+(promotion.promoted?'達到既有門檻':'沒有達到既有門檻')+'。',
   ...(promotion.reasons||[]).map(reason=>'- '+reason)
  ]),
  ...linesOf('異常與耗時',[
   '- 實驗對局異常：'+JSON.stringify(summary.anomalies||{}),
   '- 特徵撞車次數：'+(summary.collisions??0)+'。同一張印刷卡、同一組動作欄位只差實體 uid 時會計成撞車。模型不看 uid，平手時用動作原文排序。探索步：'+(summary.explored??0)+'。',
   '- 決策耗時：'+JSON.stringify(summary.decisionTiming||null)
  ]),
  '## 結論',
  '',
  summary.prototype.running
   ?'原型有跑起來：網路只在合法動作裡選、初始化權重已凍結、測速和這次預算內的試訓都有留下數字。'
   :'原型沒有完整跑起來：'+summary.prototype.reasons.join('、')+'。',
  '',
  learning.established
   ?'自主學習有通過事先寫好的開發集標準。這仍不是正式晉級。'
   :'自主學習沒有被證明：'+learning.reason+'。損失或權重距離不能拿來補這個結論。預算不夠時，也不把方法本身判成不可行。',
  '',
  '正式預設仍是 hard-search-2。這次權重沒有部署。',
  ''
 ];
 return rows.join('\n');
}
function taipei(iso){
 if(!iso)return 'n/a';
 return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',dateStyle:'medium',timeStyle:'short'}).format(new Date(iso))+'（台北時間）';
}
function seedPct(summary){
 if(!summary||summary.mean==null)return '沒有完成的種子';
 const band=summary.low==null?'種子少於 2，沒有區間':'95% 種子區間 '+(summary.low*100).toFixed(1)+'–'+(summary.high*100).toFixed(1);
 return (summary.mean*100).toFixed(1)+'%（'+summary.seeds+' 個種子，'+summary.finished+' 場完成，'+band+'）';
}
function ratePct(rate){
 if(rate==null)return 'n/a';
 return (rate*100).toFixed(1)+'%';
}
export function judgeTrend(delta){
 if(!delta||!(delta.seeds>=2)||delta.low==null)return {positive:false,reason:'檢查點不足，不能估計配對差'};
 if(delta.low>0)return {positive:true,reason:'最後一個檢查點相對第一個檢查點的配對差，區間下限高於 0'};
 if(delta.high<0)return {positive:false,reason:'配對差的區間整段落在 0 以下'};
 return {positive:false,reason:'配對差的區間包含 0，看不出穩定的正向趨勢'};
}
export function judgeFollowUp(input){
 const reasons=[];
 if(!(input?.devSeeds>=8))reasons.push('開發種子少於 8 個');
 if(!(input?.pairedSeeds>=8))reasons.push('配對的種子少於 8 個');
 if(!(input?.deltaLow>0))reasons.push('配對差的區間下限沒有高於 0');
 if(!(input?.selectedMean>0.5))reasons.push('被選中的檢查點對 A 的種子平均沒有高於 50%');
 if(!(input?.finalLow>0.5))reasons.push('凍結後新種子測試的區間下限沒有高於 50%');
 return {recommend:reasons.length===0,reasons};
}
export function answerInit(summary){
 const init=summary.initialization||{};
 if(!init.holdoutGames)return '沒有整場保留示範，所以沒有測量初始化品質。';
 const agreement=init.agreement||{};
 return '保留 '+init.holdoutGames+' 場、'+((agreement.used)??0)+' 個決策。訓練損失 '+
  (init.trainLoss==null?'n/a':init.trainLoss.toFixed(3))+'，保留損失 '+
  (init.holdoutLoss==null?'n/a':init.holdoutLoss.toFixed(3))+'。完全一致 '+ratePct(agreement.exactRate)+
  '，只差已證明 uid 的複本 '+ratePct(agreement.uidRate)+'，不一致 '+ratePct(agreement.disagreeRate)+
  '。其中特徵撞車但沒有證明等價的有 '+((agreement.unprovenCollision)??0)+' 個。';
}
export function answerTrend(summary){
 const trend=summary.trend||{positive:false,reason:'沒有開發曲線'};
 const delta=summary.delta;
 const band=delta?.low==null?'沒有區間':(delta.low*100).toFixed(1)+' 到 '+(delta.high*100).toFixed(1)+' 個百分點';
 return (trend.positive?'開發曲線有事先登記的正向趨勢。':'開發曲線沒有事先登記的正向趨勢。')+
  (trend.reason||'')+'。配對差 '+(delta?.mean==null?'n/a':(delta.mean*100).toFixed(1)+' 個百分點')+
  '（'+band+'，'+((delta?.seeds)??0)+' 個種子）。損失下降和權重距離不算在這句話裡。';
}
export function answerFollowUp(summary){
 const follow=summary.followUp||{recommend:false,reasons:['沒有足夠資料']};
 const ending=follow.recommend
  ?'依事先登記的規則，可以安排更完整的獨立驗證。這仍然不是正式晉級。'
  :'依事先登記的規則，現在還不夠安排更完整的獨立驗證：'+(follow.reasons||[]).join('、')+'。';
 return ending+' 跑完這次預算不等於檢定力已經夠。沒有通過也不表示這個方法不可行。';
}
export function renderRound2(summary){
 const bench=summary.bench||{};
 const init=summary.initialization||{};
 const rows=[
  '# 白劍神經網路第二輪',
  '',
  '上一輪的結論維持：原型有跑起來，學習沒有被證明。這一輪修正公開歷史，重新凍結 A，並用種子分組看訓練趨勢。正式 v2、Hard Search 2、規則和網站都沒有改。',
  '',
  '紀錄時間：'+taipei(summary.createdAt)+'。',
  '',
  '## 三個問題',
  '',
  '修正後 A 的初始化品質：'+answerInit(summary),
  '',
  'B 相對 A 是否隨訓練出現正向趨勢：'+answerTrend(summary),
  '',
  '是否足以安排更完整的獨立驗證：'+answerFollowUp(summary),
  '',
  '## 事先登記的規則',
  '',
  '- 初始化：'+INIT_RULE,
  '- 趨勢：'+TREND_RULE,
  '- 選模型：'+SELECTION_RULE,
  '- 後續驗證：'+FOLLOWUP_RULE,
  '- 晉級：'+PROMOTION_RULE,
  '',
  '## 方法',
  '',
  METHOD,
  '',
  '折扣係數 '+summary.gamma+'。模仿學習率 '+summary.imitateLr+'，自我對戰學習率 '+summary.monteLr+'，標籤平滑 '+summary.smooth+'，探索率 '+summary.explore+'。這些超參數沿用上一輪，沒有因勝率改動。',
  '',
  ...linesOf('測速與預算',[
   '- 神經網路對局：'+ms(bench.nnGame?.ms)+'，'+((bench.nnGame?.steps)??'n/a')+' 步，結果 '+(bench.nnGame?.status||'n/a')+'。',
   '- 正式 v2 鏡像：'+ms(bench.v2Game?.ms)+'，'+((bench.v2Game?.steps)??'n/a')+' 步，結果 '+(bench.v2Game?.status||'n/a')+'。'+(bench.v2Finished?' 有打完。':' 沒有在測速期限內打完。'),
   '- 動作評分：'+((bench.forward?.perSecond)??'n/a')+' 次/秒。訓練更新：'+((bench.train?.perSecond)??'n/a')+' 次/秒。',
   '- 參數 '+(summary.parameters??'n/a')+'。RSS '+((bench.rssMb)??'n/a')+' MB。平行進程 '+(summary.plan?.workers??'n/a')+'。',
   '- 牆鐘 '+ms(summary.plan?.wallMs)+'，估計 '+ms(summary.plan?.estimatedMs)+'，實際 '+ms(summary.elapsedMs)+'。',
   '- 計畫：模仿 '+(summary.plan?.imitate??0)+'、自我對戰 '+(summary.plan?.self??0)+'、開發種子 '+(summary.plan?.devSeeds??0)+'、測試種子 '+(summary.plan?.testSeeds??0)+'、檢查點 '+(summary.plan?.checkpoints??0)+'。',
   '- 實際：模仿 '+(summary.actual?.imitate??0)+'、自我對戰 '+(summary.actual?.self??0)+'、開發種子 '+(summary.actual?.devSeeds??0)+'、測試種子 '+(summary.actual?.testSeeds??0)+'、檢查點 '+(summary.actual?.checkpoints??0)+'。',
   summary.resourceGap?('- 資源缺口：'+summary.resourceGap):'- 執行時沒有另外截斷計畫場數。'
  ]),
  ...linesOf('模仿與凍結的 A',[
   '- 訓練場 '+((init.trainGames)??0)+'，保留場 '+((init.holdoutGames)??0)+'。訓練決策 '+((init.trainDecisions)??0)+'，保留決策 '+((init.agreement?.used)??0)+'。',
   '- 訓練損失：'+JSON.stringify(init.trainCurve||[])+'。',
   '- 保留損失：'+(init.holdoutLoss==null?'n/a':init.holdoutLoss)+'。',
   '- 完全一致 '+(init.agreement?.exact??0)+'，已證明的 uid 複本 '+(init.agreement?.uidEquivalent??0)+'，不一致 '+(init.agreement?.disagree??0)+'，未證明的特徵撞車 '+(init.agreement?.unprovenCollision??0)+'。',
   '- 權重距離：隨機初始到 A '+(summary.distance?.initToA??'n/a')+'，A 到被選中的 B '+(summary.distance?.aToSelected??'n/a')+'。',
   '- 上一輪的 A、B 沒有拿來當這次的對照。'
  ]),
  ...linesOf('開發曲線',[
   '| 自我對戰 | 樣本 | 更新 | 種子平均對 A |',
   '|---|---|---|---|',
   ...(summary.curve||[]).map(point=>'| '+(point.gamesPlayed)+' | '+(point.samples)+' | '+(point.monteUpdates)+' | '+seedPct(point.summary)+' |'),
   '- 被選中的檢查點：'+((summary.selected?.gamesPlayed)??'n/a')+' 場自我對戰。',
   '- 先手：'+seedPct(summary.selected?.first)+'。後手：'+seedPct(summary.selected?.second)+'。',
   '- 四種座位組合的完成場數：'+JSON.stringify(summary.selected?.cells||{})+'。'
  ]),
  ...linesOf('凍結後的新種子測試',[
   '- B 對 A：'+seedPct(summary.finalTest)+'。',
   '- 先手：'+seedPct(summary.finalTestFirst)+'。後手：'+seedPct(summary.finalTestSecond)+'。',
   '- 這組種子沒有參與訓練，也沒有參與檢查點選擇。上一輪看過的 188400–188403 在開發集，不在這裡。',
   '- 正式晉級沒有提交。冠軍門檻維持至少 200 場、三種對手牌型，以及原有的勝率與異常條件。'
  ]),
  ...linesOf('異常與耗時',[
   '- 實驗對局異常：'+JSON.stringify(summary.anomalies||{}),
   '- 探索步：'+((summary.explored)??0)+'。',
   '- 決策耗時：'+JSON.stringify(summary.decisionTiming||null)
  ]),
  '## 結論',
  '',
  summary.prototype?.running
   ?'這一輪的訓練迴圈有跑完測速、凍結 A，以及預算內實際打到的對局。'
   :'這一輪的訓練迴圈不完整：'+((summary.prototype?.reasons||[]).join('、')||'沒有留下摘要')+'。',
  '',
  answerInit(summary),
  '',
  answerTrend(summary),
  '',
  answerFollowUp(summary),
  '',
  '正式預設仍是 hard-search-2。這次權重沒有部署。',
  ''
 ];
 return rows.join('\n');
}
export function judgeScaleGap(profile){
 const gap=profile?.absGap?.p50;
 const target=profile?.target;
 if(gap==null||target?.min==null||target?.max==null)return {error:false,reason:'沒有固定診斷樣本'};
 if(gap>1&&target.max<=1&&target.min>=-1){
  return {error:true,reason:'網路輸出和 [-1,1] 的終局回報不在同一尺度，絕對差中位數大於 1'};
 }
 return {error:false,reason:'輸出和回報的絕對差中位數沒有大於 1'};
}
export function judgeEarlyRegression({agreementDrop,deltaHigh}={}){
 const reasons=[];
 if(Number.isFinite(agreementDrop)&&agreementDrop>=AGREEMENT_DROP)reasons.push('保留示範的完全一致率下降至少 '+(AGREEMENT_DROP*100)+' 個百分點');
 if(deltaHigh!=null&&deltaHigh<0)reasons.push('對 A 的配對差區間整段低於 0');
 return {regressed:reasons.length>0,reasons};
}
export function judgeSurpass(endpoint,zeroRows){
 const delta=pairedDelta(zeroRows||[],endpoint?.summary?.rows||[]);
 const mean=endpoint?.summary?.mean;
 const seeds=endpoint?.summary?.seeds||0;
 const ok=seeds>=SURPASS_SEEDS&&mean>0.5&&delta.low>0;
 return {
  ok,mean,seeds,delta,
  reason:ok?null:'終點沒有同時具備至少 '+SURPASS_SEEDS+' 個種子、種子平均高於 50%，以及相對 0 次更新的配對差下限高於 0'
 };
}
export function judgeMitigation(original,retain){
 const delta=pairedDelta(original?.rows||[],retain?.rows||[]);
 const mean=retain?.mean;
 if(mean==null||delta.low==null)return {mitigated:false,inconclusive:true,worse:false,mean,delta};
 if(mean>0.5)return {mitigated:false,inconclusive:false,worse:false,mean,delta};
 const mitigated=delta.low>0;
 const worse=delta.high!=null&&delta.high<0;
 return {mitigated,inconclusive:!mitigated&&!worse,worse,mean,delta};
}
export function answerConnection(summary){
 const scale=summary?.scale;
 if(!scale?.before?.output)return '沒有固定診斷樣本，所以不能判斷退步是不是來自更新接法。';
 const early=summary.early||{regressed:false,reasons:[]};
 const earlyText=early.checked
  ?(early.regressed
   ?'最早的更新就出現事先登記的退步：'+(early.reasons||[]).join('、')+'。'
   :'在已跑到的第 1 場和第 4 場檢查點，事先登記的退步條件沒有成立。這只覆蓋這兩個點，不代表更後面的場次沒有退步。')
  :'第 1 場和第 4 場的線上檢查點沒有齊，最早退步還不能下結論。';
 const fix=scale.separated
  ?'尺度修正只在固定診斷樣本上另外記錄，沒有放進 B-original 或 B-retain。'
  :'尺度修正這次沒有分開跑完。';
 return (scale.judgment?.reason||'沒有尺度判斷')+'。'+earlyText+fix+'均方誤差下降沒有拿來判定更新有效。';
}
export function answerStability(summary){
 const retain=summary?.arms?.retain;
 const original=summary?.arms?.original;
 if(!retain?.endpoint||!original?.endpoint)return '兩個版本沒有同時跑到事先登記的終點，所以還不能判斷穩定措施有沒有保留能力。';
 const originalNote=original.surpass?.ok?' B-original 的終點也達到超越 A 的開發標準。':'';
 if(retain.endpoint?.summary?.mean>0.5&&!retain.surpass?.ok){
  return 'B-retain 的終點種子平均高於 50%，但還沒有同時滿足種子數和相對 0 次更新的配對差下限。這還不算超越凍結 A，也不安排確認。'+originalNote;
 }
 if(retain.surpass?.ok){
  const confirm=summary.confirm?.retain;
  if(!confirm||confirm.low==null)return 'B-retain 在開發終點有超越凍結 A 的證據，但確認對局沒有跑完，所以還不能建議更完整的獨立驗證。'+originalNote;
  if(confirm.low>0.5)return 'B-retain 在開發終點超越凍結 A，確認種子的區間下限也高於 50%。依這次的規則可以安排更完整的獨立驗證。這仍然不是正式晉級。'+originalNote;
  return 'B-retain 在開發終點超越凍結 A，但確認種子的區間下限沒有高於 50%。現在還不夠安排更完整的獨立驗證。'+originalNote;
 }
 if(retain.mitigation?.mitigated)return 'B-retain 相對 B-original 減輕了退步，開發終點對 A 的種子平均沒有高於 50%。這不能稱為自主變強，也不安排新種子確認。'+originalNote;
 if(retain.mitigation?.inconclusive)return 'B-retain 和 B-original 的終點差距不穩定，不能說穩定措施保留了能力，也不能說它產生了額外改善。'+originalNote;
 return 'B-retain 沒有減輕退步，也沒有超越凍結 A。穩定措施沒有被證明保留既有能力。'+originalNote;
}
function deltaLine(delta){
 if(delta?.mean==null)return 'n/a';
 const band=delta.low==null?'沒有區間':(delta.low*100).toFixed(1)+' 到 '+(delta.high*100).toFixed(1);
 return (delta.mean*100).toFixed(1)+' 個百分點（'+band+'，'+delta.seeds+' 個種子）';
}
function distributionLine(label,profile){
 if(!profile)return '- '+label+'：沒有樣本。';
 const side=item=>item?.p50==null?'n/a':item.p50.toFixed(3)+'（'+item.min.toFixed(3)+' 到 '+item.max.toFixed(3)+'）';
 return '- '+label+'：輸出中位數 '+side(profile.q)+'，回報中位數 '+side(profile.target)+'，絕對差中位數 '+side(profile.absGap)+'。';
}
function rankLine(label,ranking){
 if(!ranking?.agreement)return '- '+label+'：沒有保留示範。';
 const agreement=ranking.agreement;
 return '- '+label+'：完全一致 '+ratePct(agreement.exactRate)+'，已證明 uid 複本 '+ratePct(agreement.uidRate)+
  '，不一致 '+ratePct(agreement.disagreeRate)+'，教師動作排名中位數 '+(ranking.rank?.p50??'n/a')+
  '，對其他動作的分數差中位數 '+(ranking.margin?.p50==null?'n/a':ranking.margin.p50.toFixed(3))+'。';
}
export function renderRound3(summary){
 const bench=summary.bench||{};
 const scale=summary.scale||{};
 const arms=summary.arms||{};
 const rows=[
  '# 白劍神經網路第三輪',
  '',
  '接受第二輪的結果：所選 B 在新測試種子上弱於凍結 A。20 場到 80 場的回升是相對第一個檢查點，不是超越未訓練的起點。這一輪保留同一個網路和 Deep Monte-Carlo，只檢查更新接法，並對照固定比例的模仿回放。正式 v2、Hard Search 2、規則和網站都沒有改。',
  '',
  '紀錄時間：'+taipei(summary.createdAt)+'。',
  '',
  '## 兩個問題',
  '',
  '退步是否來自更新接法：'+answerConnection(summary),
  '',
  '穩定措施能否保留既有能力並產生額外改善：'+answerStability(summary),
  '',
  '## 事先登記的規則',
  '',
  '- 複本：'+COPY_RULE,
  '- 尺度：'+SCALE_RULE,
  '- 最早更新：'+EARLY_RULE,
  '- 兩個版本：'+ARM_RULE,
  '- 解讀：'+READ_RULE,
  '- 晉級：'+PROMOTION_RULE,
  '',
  '折扣係數 '+summary.gamma+'。自我對戰學習率 '+summary.monteLr+'。回放比例 '+summary.replayFraction+'。探索率 '+summary.explore+'。標籤平滑 '+summary.smooth+'。這些數字在看這一輪的勝率之前就寫在程式裡。B-retain 的回放步使用同一個自我對戰優化器，沒有另設學習率。',
  '',
  ...linesOf('測速與預算',[
   '- 神經網路對局：'+ms(bench.nnGame?.ms)+'，'+((bench.nnGame?.steps)??'n/a')+' 步，結果 '+(bench.nnGame?.status||'n/a')+'。',
   '- 正式 v2 鏡像：'+ms(bench.v2Game?.ms)+'，'+((bench.v2Game?.steps)??'n/a')+' 步，結果 '+(bench.v2Game?.status||'n/a')+'。'+(bench.v2Finished?' 有打完。':' 沒有在測速期限內打完。'),
   '- 牆鐘 '+ms(summary.plan?.wallMs)+'，估計 '+ms(summary.plan?.estimatedMs)+'，實際 '+ms(summary.elapsedMs)+'。',
   '- 計畫：模仿 '+(summary.plan?.imitate??0)+'、每個版本自我對戰 '+(summary.plan?.self??0)+'、開發種子 '+(summary.plan?.devSeeds??0)+'、診斷場 '+(summary.plan?.diagGames??0)+'、確認種子 '+(summary.plan?.confirmSeeds??0)+'。',
   '- 檢查點：'+JSON.stringify(summary.plan?.checks||[])+'。',
   '- 比較是否排得進牆鐘：'+(summary.plan?.fits?'是':'否')+'。',
   summary.resourceGap?('- 資源缺口：'+summary.resourceGap):'- 執行時沒有因勝率補場或改超參數。'
  ]),
  ...linesOf('複本與對稱',[
   '- 權重、分數和動作與凍結 A 一致：'+(summary.copy?.match?'是':'否')+'。',
   '- 四種組合的對稱：'+(summary.symmetry?.ok?'成立':'不成立')+'。配對 '+((summary.symmetry?.pairs)??0)+'，勝者相同 '+((summary.symmetry?.winnerMatch)??0)+'，行動相同 '+((summary.symmetry?.actionMatch)??0)+'/'+((summary.symmetry?.actionCompared)??0)+'，互補勝場 '+((summary.symmetry?.learnerHalf)??0)+'/'+((summary.symmetry?.decisive)??0)+'。',
   '- 0 次更新對 A：'+seedPct(summary.zero)+'。'
  ]),
  ...linesOf('尺度診斷（與兩個訓練版本分開）',[
   distributionLine('更新前',scale.before?.output),
   rankLine('更新前的保留示範',scale.before?.ranking),
   ...(scale.original?.marks||[]).flatMap(mark=>[
    distributionLine('原始更新 '+mark.games+' 場後',mark.output),
    rankLine('原始更新 '+mark.games+' 場後的保留示範',mark.ranking)
   ]),
   ...(scale.bounded?.marks||[]).flatMap(mark=>[
    distributionLine('尺度修正 '+mark.games+' 場後',mark.output),
    rankLine('尺度修正 '+mark.games+' 場後的保留示範',mark.ranking)
   ]),
   '- 尺度修正對 A，只用診斷用的少數開發種子：'+seedPct(scale.boundedEval)+'。這不是版本選擇，也不是確認測試。',
   '- 尺度判斷：'+(scale.judgment?.reason||'n/a')+'。'
  ]),
  ...linesOf('B-original',[
   '| 自我對戰 | 樣本 | 更新 | 保留示範完全一致 | 種子平均對 A |',
   '|---|---|---|---|---|',
   ...(arms.original?.curve||[]).map(point=>'| '+point.gamesPlayed+' | '+point.samples+' | '+point.monteUpdates+' | '+ratePct(point.ranking?.agreement?.exactRate)+' | '+seedPct(point.summary)+' |'),
   '- 終點判斷：'+(arms.original?.surpass?.reason||(arms.original?.surpass?.ok?'達到超越 A 的開發標準':'沒有終點'))+'。',
   '- 相對 0 次更新的配對差：'+deltaLine(arms.original?.surpass?.delta)+'。',
   '- 終點先手：'+seedPct(arms.original?.first)+'。後手：'+seedPct(arms.original?.second)+'。'
  ]),
  ...linesOf('B-retain',[
   '| 自我對戰 | 樣本 | 更新 | 回放步 | 保留示範完全一致 | 種子平均對 A |',
   '|---|---|---|---|---|---|',
   ...(arms.retain?.curve||[]).map(point=>'| '+point.gamesPlayed+' | '+point.samples+' | '+point.monteUpdates+' | '+(point.replaySteps??0)+' | '+ratePct(point.ranking?.agreement?.exactRate)+' | '+seedPct(point.summary)+' |'),
   '- 終點判斷：'+(arms.retain?.surpass?.reason||(arms.retain?.surpass?.ok?'達到超越 A 的開發標準':'沒有終點'))+'。',
   '- 相對 B-original 的終點配對差：'+deltaLine(arms.retain?.mitigation?.delta)+'。',
   '- 相對 0 次更新的配對差：'+deltaLine(arms.retain?.surpass?.delta)+'。',
   '- 終點先手：'+seedPct(arms.retain?.first)+'。後手：'+seedPct(arms.retain?.second)+'。'
  ]),
  ...linesOf('確認種子',[
   summary.confirm?.ran
    ?'- 有跑確認。B-retain：'+seedPct(summary.confirm.retain)+'。B-original：'+seedPct(summary.confirm.original)+'。'
    :'- 沒有跑確認。'+(summary.confirm?.reason||'開發終點沒有超越凍結 A。'),
   '- 189400–189411 只出現在開發評估，沒有當作這一輪的確認種子。'
  ]),
  ...linesOf('異常與耗時',[
   '- 實驗對局異常：'+JSON.stringify(summary.anomalies||{}),
   '- 探索步：'+((summary.explored)??0)+'。',
   '- 決策耗時：'+JSON.stringify(summary.decisionTiming||null)
  ]),
  '## 結論',
  '',
  answerConnection(summary),
  '',
  answerStability(summary),
  '',
  '跑完預算不等於檢定力已經夠。沒有通過也不表示這個方法不可行。正式預設仍是 hard-search-2。這次權重沒有部署，晉級門檻沒有放寬。',
  ''
 ];
 return rows.join('\n');
}
export function judgePpoRegression(endpoint,zeroRows){
 const delta=pairedDelta(zeroRows||[],endpoint?.summary?.rows||[]);
 const mean=endpoint?.summary?.mean;
 const seeds=endpoint?.summary?.seeds||0;
 if(mean==null||delta.high==null)return {kind:'incomplete',mean,seeds,delta,reason:'終點沒有足夠的完成對局，不能判斷退步。'};
 if(delta.high<0)return {kind:'regressed',mean,seeds,delta,reason:'終點相對 0 次更新的配對差區間整段低於 0。'};
 if(seeds>=SURPASS_SEEDS&&mean>0.5&&delta.low>0){
  return {kind:'improved',mean,seeds,delta,reason:'終點種子平均高於 50%，而且相對 0 次更新的配對差下限高於 0。'};
 }
 return {
  kind:'no-obvious-regression',mean,seeds,delta,
  reason:'終點相對 0 次更新的配對差區間沒有整段低於 0，也沒有站上超越凍結 A 的門檻。'
 };
}
export function answerSeparation(checks){
 if(!checks)return '沒有完成策略與價值的分離檢查。';
 const ready=checks.copy&&checks.criticIsolated&&checks.valueNotInScores&&checks.symmetry?.ok;
 if(!ready)return '分離檢查沒有全部成立，所以這一輪不能把後續對局解讀成 PPO 已經正確更新。';
 return '策略和價值是兩組參數。0 次更新的 Actor 與凍結 A 的分數和貪心動作一致，只更新 Critic 時 Actor 不變，Critic 的預測也沒有加進選牌分數。初始複本在座位與先後手交換下保持對稱。';
}
export function answerRegression(summary){
 const judged=summary?.regression;
 if(!judged||judged.kind==='incomplete')return 'PPO 更新沒有跑到可比較的終點，所以還不能判斷它有沒有造成相對 A 的退步。';
 if(judged.kind==='regressed')return '有。計畫終點相對 0 次更新的配對差區間整段低於 0，PPO 更新仍然造成退步。損失或 KL 沒有拿來推翻這個對局結果。';
 if(judged.kind==='improved')return '沒有。計畫終點相對 0 次更新沒有退步，而且種子平均高於 50%。這還要經過事先登記的確認規則，不能只用損失或 KL 當作變強。';
 return '沒有觀察到事先登記的退步。終點相對 0 次更新的配對差區間沒有整段低於 0。這只能稱為未觀察到明顯退步，不能稱為自主變強。';
}
export function answerConfirmation(summary){
 const selected=summary?.selected;
 if(!summary?.plan?.fits)return '預算沒有留下可訓練的批次，所以沒有安排確認種子。';
 if(!selected?.surpass)return '沒有。沒有可選的開發檢查點，不值得用全新種子確認。';
 if(!selected.surpass.ok){
  const mean=selected.surpass.mean;
  const seeds=selected.surpass.seeds||0;
  const low=selected.surpass.delta?.low;
  if(seeds>=SURPASS_SEEDS&&mean>0.5&&!(low>0)){
   return '沒有。被選中的檢查點種子平均高於 50%，但相對 0 次更新的配對差下限沒有高於 0。這不夠格用全新種子確認，也不能稱為自主變強。';
  }
  return '沒有。被選中的檢查點沒有同時達到至少 '+SURPASS_SEEDS+' 個種子、種子平均高於 50%，以及相對 0 次更新的配對差下限高於 0。不值得用全新種子確認。';
 }
 if(!summary.confirm?.ran)return '開發檢查點達到確認門檻，但確認對局沒有跑完，所以還不能建議更完整的獨立驗證。';
 if(summary.confirm.summary?.low>0.5)return '有。被選中的檢查點在開發資料上超越凍結 A，確認種子的區間下限也高於 50%。依這次的規則可以安排更完整的獨立驗證。這仍然不是正式晉級。';
 return '開發檢查點達到確認門檻，但確認種子的區間下限沒有高於 50%。現在還不夠安排更完整的獨立驗證，也不能稱為已經自主變強。';
}
export function renderRound4(summary){
 const curve=summary.curve||[];
 const curveLines=curve.map(point=>{
  const kl=point.kl==null?'n/a':point.kl.toFixed(4);
  const stop=point.klStopped?'，該批有一輪 KL 超過 0.02，所以停掉後面的更新':'';
  return '- '+point.gamesPlayed+' 場：對 A '+seedPct(point.summary)+
   '。Actor 目標 '+(point.actorObjective==null?'n/a':point.actorObjective.toFixed(4))+
   '，Critic 均方 '+(point.criticMse==null?'n/a':point.criticMse.toFixed(4))+
   '，各輪平均 KL '+kl+stop+
   '，熵 '+(point.entropy==null?'n/a':point.entropy.toFixed(4))+'。';
 });
 const rows=[
  '# 白劍神經網路第四輪',
  '',
  '產生時間：'+taipei(summary.createdAt)+'。',
  '',
  '接受第三輪：原始 Monte-Carlo 更新造成退步，固定比例的模仿回放沒有證明能減輕退步或超越凍結 A。這一輪不重跑那個更新，改做一個小型 Actor–Critic／PPO-Clip 原型。PPO 不被當成已經有效的解法。正式 v2、Hard Search 2、規則和網站都沒有改。',
  '',
  ...linesOf('三個問題',[
   '① '+answerSeparation(summary.checks),
   '② '+answerRegression(summary),
   '③ '+answerConfirmation(summary)
  ]),
  ...linesOf('固定規則',[
   PPO_RULE,
   '',
   ROUND4_SELECT_RULE,
   '',
   ROUND4_READ_RULE,
   '',
   '計算牆鐘 20 分鐘。測速之後才固定批次、檢查點和模型選擇，之後不因勝率加場或改超參數。未完成對局不計入正常勝負。'
  ]),
  ...linesOf('分離檢查',[
   '- 權重複本：'+(summary.checks?.copy?'一致':'不一致')+'。',
   '- 只更新 Critic：'+(summary.checks?.criticIsolated?'Actor 不變':'Actor 被改動')+'。',
   '- 分數不含 value：'+(summary.checks?.valueNotInScores?'成立':'不成立')+'。',
   '- 更新前機率比：'+(summary.checks?.ratioAtOne?'為 1':'沒有成立')+'。',
   '- 0 次更新的對稱：'+((summary.checks?.symmetry?.ok)?'成立':'不成立')+'。配對 '+((summary.checks?.symmetry?.pairs)??0)+'。'
  ]),
  ...linesOf('預算',[
   '- 測速後的計畫：'+JSON.stringify(summary.plan||null),
   '- 實際耗時：'+ms(summary.elapsedMs)+'。',
   '- 環境步數：'+((summary.train?.steps)??0)+'。決策數：'+((summary.train?.decisions)??0)+'。',
   '- 獨立對局：'+((summary.train?.games)??0)+'。完成：'+((summary.train?.finished)??0)+'。未完成：'+((summary.train?.unfinished?.length)??0)+'。',
   '- Actor 更新次數：'+((summary.train?.actorUpdates)??0)+'。Critic 更新次數：'+((summary.train?.criticUpdates)??0)+'。',
   summary.resourceGap?'- 資源落差：'+summary.resourceGap:'- 計畫內的批次有跑完。'
  ]),
  ...linesOf('學習曲線',curveLines.length?curveLines:['- 沒有檢查點。']),
  ...linesOf('候選與確認',[
   '- 選中的檢查點：'+((summary.selected?.gamesPlayed)??'n/a')+' 場。對 A '+seedPct(summary.selected?.summary)+'。',
   '- 相對 0 次更新：'+deltaLine(summary.selected?.surpass?.delta)+'。',
   '- 計畫終點：'+((summary.endpoint?.gamesPlayed)??'n/a')+' 場。對 A '+seedPct(summary.endpoint?.summary)+'。',
   '- 終點先手：'+seedPct(summary.endpointFirst)+'。後手：'+seedPct(summary.endpointSecond)+'。',
   '- 終點相對 0 次更新：'+deltaLine(summary.regression?.delta)+'。',
   summary.confirm?.ran
    ?'- 確認種子：'+seedPct(summary.confirm.summary)+'。'
    :'- '+answerConfirmation(summary),
   '- 189400–189411 只出現在開發評估。確認種子是 191400–191411，沒有拿來挑檢查點。'
  ]),
  ...linesOf('未完成對局',[
   summary.train?.unfinished?.length
    ?summary.train.unfinished.map(game=>'- 種子 '+(game.seed??'n/a')+'，'+game.status+'，'+(game.endReason||'無原因')+'，'+game.steps+' 步。').join('\n')
    :'- 訓練沒有未完成對局。',
   summary.evalUnfinished?.length
    ?'- 評估另有 '+summary.evalUnfinished.length+' 場未完成，沒有計入勝率。'
    :'- 評估沒有未完成對局。'
  ]),
  ...linesOf('異常',[
   '- 實驗對局異常：'+JSON.stringify(summary.anomalies||{})
  ]),
  '## 結論',
  '',
  answerSeparation(summary.checks),
  '',
  answerRegression(summary),
  '',
  answerConfirmation(summary),
  '',
  '種子平均即使高於 50%，只要相對 0 次更新的配對差區間沒有整段高於 0，就只能稱為未觀察到明顯退步，不能稱為自主變強。損失下降、Critic 更準、KL 較小或權重有更新，都不能代替對局。這次權重沒有部署，也沒有合併到 main。晉級門檻沒有放寬。',
  ''
 ];
 return rows.join('\n');
}
