import {FOLLOWUP_RULE,INIT_RULE,LEARNING_RULE,METHOD,PROMOTION_RULE,SELECTION_RULE,TREND_RULE} from './protocol.mjs';

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
