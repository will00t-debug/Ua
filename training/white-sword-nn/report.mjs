import {LEARNING_RULE,METHOD,PROMOTION_RULE} from './protocol.mjs';

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
