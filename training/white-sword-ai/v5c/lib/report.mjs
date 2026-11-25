const NAMES={'white-sword':'白劍鏡像','reject-blue':'我拒絕的 Hard Search',renruki:'戀露的 Hard Search'};
function num(value){
 return Number.isFinite(value)?value.toFixed(3):'—';
}
function prob(value){
 if(!Number.isFinite(value))return '—';
 if(value>0&&value<0.001)return value.toExponential(2);
 return value.toFixed(3);
}
function record(rate){
 if(!rate?.games)return '—';
 const pct=Number.isFinite(rate.rate)?(rate.rate*100).toFixed(2)+'%':'—';
 return rate.wins+'/'+rate.games+'（'+pct+'）';
}
function interval(row){
 if(!row||row.low==null)return '樣本不足';
 const flat=row.low===0&&row.high===0?' 每個種子的配對差都相同，區間沒有寬度，這只代表這一批種子沒有勝負差。':'';
 return '配對差 '+num(row.mean)+'，95% 區間 ['+num(row.low)+', '+num(row.high)+']，種子 '+row.n+'。'+flat;
}
function kinds(map){
 const entries=Object.entries(map||{});
 if(!entries.length)return '沒有記錄到改選。';
 return entries.map(([kind,count])=>kind+' '+count+' 次').join('，')+'。';
}
export function renderReport(study){
 const found=study.confirmed||[];
 const lines=found.map(row=>' - '+row.id+'：'+row.labelA+' → '+row.labelB+'，確認平均差 '+num(row.confirmMean)+'，p '+prob(row.pOne)+'。');
 const fitted=(study.accepted||[]).map(row=>' - '+row.signature+'：權重 '+num(row.weight)+'，連帶改選 '+row.collateral+'。');
 const rejected=(study.rejected||[]).map(row=>' - '+(row.signature||row.id)+'：'+(row.reason||'沒有採用')+'。');
 const match=study.matches;
 const decks=match?Object.entries(match.decks||{}).map(([id,deck])=>{
  return [
   '### '+NAMES[id],
   '候選先攻 '+record(deck.residualFirst)+'，候選後攻 '+record(deck.residualSecond)+'。',
   '基準先攻 '+record(deck.v2First)+'，基準後攻 '+record(deck.v2Second)+'。',
   deck.kind==='paired'?'候選全場 '+record(deck.residual)+'，基準全場 '+record(deck.v2)+'。':'候選全場 '+record(deck.residual)+'。',
   interval(deck.delta),
   '改選 '+deck.effects.changes+' 次，發生在 '+deck.effects.gamesWithChange+' 場。沒有改選而獲勝 '+deck.effects.unchangedWin+' 場，沒有改選而落敗 '+deck.effects.unchangedLoss+' 場，改選後獲勝 '+deck.effects.changedWin+' 場，改選後落敗 '+deck.effects.changedLoss+' 場。'
  ].join('\n');
 }).join('\n\n'):(found.length?'沒有打 192 場。確認到的偏好在 [-6, 6] 裡無法變成首選，所以不新增權重。':'沒有打 192 場。沒有可靠的新偏好，就不強迫新增權重。');
 return `# 白劍 AI v5-C：多殘差累積學習

070 殘差維持凍結權重 ${study.frozenWeight}，只當實驗對照，這一輪不調它。正式 v2 的 115 個權重繼續凍結。新欄位從 0 開始，單步最多 1.5，權重範圍是 [-6, 6]。Hard Search 2、Hard cap 7、遊戲規則、冠軍晉級和部署都沒有改。

分支預算 1200 場，不含挖掘，也不含後面的診斷對戰。篩選最多 42 個局面、各 8 組；確認最多 4 個、各 66 組。方向事先登記：B 比 v2 的 A 好，單尾精確符號檢定，Holm 只作用在確認名單。不顯著不表示兩個動作等價。

挖掘 ${study.mined?.games??0} 場，新局面 ${study.mined?.fresh??0} 個，進入篩選 ${study.screened??0} 個。七種決策類型有 ${study.buckets??0} 種出現在篩選名單。篩選平均差達到 -0.25 的有 ${study.passedScreen??0} 個。確認 ${study.confirmCount??0} 個，分支實際 ${study.games??0} 場。

${lines.length?lines.join('\n'):'這一輪沒有 Holm 確認的新偏好。'}

## 欄位

正向欄位提高被偏好的具體動作。偏好是結束行動、而被拋棄的是具體起動或打出時，欄位改為降低那個動作，不提高所有結束行動。${(study.accepted||[]).some(row=>row.signature==='-|activate|BLC-4-060|')?'這一輪有另一個新局面確認了降低起動 BLC-4-060。歷史上的 ee6c 沒有拿來安裝。':'歷史上的 ee6c 尚未學會。不因為那一筆舊證據安裝欄位。'}
不顯著只表示證據不足，不表示已證明安全，也不表示兩個動作相等。

${fitted.length?fitted.join('\n'):'沒有新的殘差權重。'}
${rejected.length?rejected.join('\n'):''}
${study.deferred?.length?'已由凍結 070 欄位代表、不再另擬合的確認：'+study.deferred.join('、')+'。':''}
組合檢查：${study.combination?.ok?'通過，個別效果沒有互相抵消。':'沒有把未通過的殘差累積進下一個基礎模型。'}
診斷模型：${study.diagnostic?.id||'沒有'}。基準是${study.baselineLabel||'沒有對戰'}。

## 公平對局

${decks}

改選動作：${kinds(study.kinds)}

不採用，不部署，也不啟動 5,000 場。正式 v2 雜湊 ${study.official||''}。這一輪沒有寫入權重，也沒有改 070 的凍結權重。
`;
}
