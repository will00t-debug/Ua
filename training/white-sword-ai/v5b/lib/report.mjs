// v5-B report. Numbers come from the frozen sweep and the validation that followed it.
function deckText(matches){
 const names={'white-sword':'對 v2 鏡像','reject-blue':'對我拒絕的 Hard Search',renruki:'對戀露的 Hard Search'};
 return Object.entries(matches.decks||{}).map(([id,deck])=>`${names[id]||id} ${deck.wins}/${deck.games}。`).join('');
}
function num(value){
 if(value==null||Number.isNaN(Number(value)))return '沒有';
 return Number(value).toFixed(2);
}
function rowLine(row){
 const kept=row.preserves.every(item=>item.same);
 const learned=row.targets.filter(item=>item.ok).length;
 return `- ${row.id}：權重 ${num(row.weight)}，加成 ${num(row.points)} 分，步驟 ${row.steps.map(step=>num(step)).join('、')||'0'}。三筆偏好有 ${learned} 筆變成首選。已保存局面改選 ${row.changes} 個，其中連帶改選 ${row.collateral} 個，驗證前都還沒有新對局。退步局面${row.harm?.same?'維持原選擇':'被改掉'}，067 突襲${row.raid?.same?'維持原選擇':'被改掉'}，ee6c ${row.ee6c?.same?'維持 v2 的原選擇，尚未學會結束行動':'被改掉'}。${kept&&row.eligible?'這組同時滿足三筆偏好和保留條件。':'這組沒有同時滿足。'}`;
}
export function renderReport(study){
 const picked=study.rows.find(row=>row.id===study.picked);
 const lines=(study.rows||[]).map(rowLine).join('\n');
 const targets=(picked?.targets||[]).map(row=>`- ${row.id}：能量線動作和 cap 內最高硬分相差 ${num(row.hardGap)}，殘差${row.ok?'把它改成能量線':'沒有把它改成能量線'}。`).join('\n');
 const validation=study.validation?.rows||[];
 const harms=validation.filter(row=>row.status==='confirmed');
 const gate=study.gate;
 let verdict='沒有凍結到能同時滿足三筆偏好的權重，所以沒有新對局。';
 if(picked&&!study.validation?.ran)verdict='權重已凍結。連帶改選不足以組成驗證，或驗證還沒有抽完。';
 if(study.validation?.ran){
  verdict=harms.length
   ?'驗證裡有已確認的退步，所以沒有進入 96 場診斷。'
   :'驗證沒有已確認的退步。這不表示已證明安全。';
  if(gate&&!gate.open)verdict+='新種子沒有形成事先登記的正向樣本，96 場診斷不開。';
  if(study.matches)verdict+='96 場是開發診斷，不是冠軍挑戰，也不採用。';
 }
 const mirror=study.matches?.decks?.['white-sword'];
 const mirrorText=mirror&&mirror.winRate<0.5
  ?'對 v2 的鏡像低於一半，所以把三個對手加在一起的勝率不能當成殘差比 v2 更強。'
  :'分對手的結果要分開看，加總不能單獨當成比 v2 更強。';
 const matchText=study.matches
  ?`診斷完成 ${study.matches.finished} 場，白劍座位勝 ${study.matches.wins} 場。${deckText(study.matches)}${mirrorText}這只供開發觀察。晉級仍要 +5 個百分點而且區間下限大於 0，這一輪不套用、不晉級。`
  :'沒有打 96 場診斷。';
 const checks=(validation||[]).map(row=>`- ${row.id}（${row.role}）：平均差 ${num(row.mean)}，p ${row.p==null?'沒有':Number(row.p).toFixed(4)}，${row.status==='confirmed'?'已確認退步':'證據不足'}。`).join('\n');
 return `# 白劍 AI v5-B：首次殘差學習實驗

正式 v2 的 115 個權重全程凍結。新欄位是 ${study.feature}，由三筆已確認的能量線偏好導出，初始權重是 0。權重為 0 時，${study.checked} 個已保存局面的選擇和 v2 一致。欄位只用動作的卡號和能量線，這兩項都是公開資訊；不使用局面 ID、uid 或隱藏資訊。

殘差加在 Hard cap 已經留下的候選的政策分數上。Hard Search 的分數和 Hard cap 的篩選都不吃這個加成。三筆能量線動作原本就在 cap 內。

${targets}

## 加成比較

單步最多 1.5，累積最多 6。第三步沒有先假設加滿。比較 9 分、18 分、能讓三筆偏好同時變成首選的最小權重，以及 27 分。

${lines}

凍結的是 ${picked?picked.id+'，權重 '+num(picked.weight)+'，加成 '+num(picked.points)+' 分':'沒有'}。滿足目標的候選裡，它的連帶改選最少；權重相同時取較小的那個。這個選擇在新對局之前寫入候選檔。

ee6c 仍是尚未學會的可靠偏好。維持 v2 的原選擇只表示這一個欄位沒有碰到它。

## 驗證

規則事先登記：A 是 v2 的原選擇，B 是殘差選擇，單尾精確符號檢定問 A 是否更好，Holm 校正。通過且平均差為正才算已確認退步。不顯著不表示已證明安全，也不表示兩個動作等價。

從連帶改選裡按對手、前中後期、能源、前線人數和是否把 070 帶離前線來選，最多 8 個，各 66 組。新種子挖掘 ${study.mined?.games||0} 場，不計入 1,056 場分支上限。實際驗證 ${study.validation?.positions||0} 個局面、${study.validation?.games||0} 場。

${checks||'沒有驗證對局。'}

新種子挖到 ${study.mined?.flips??0} 個連帶改選。樣本偏向殘差只是診斷門檻，不是已確認的進步。

${verdict}

## 診斷

${matchText}

診斷種子和挖掘、分支驗證分開。正式 v2、Hard Search 2、Hard cap 7、單步 1.5、權重夾限 6、遊戲規則和部署都沒有改。不採用，不部署，也不啟動 5,000 場冠軍挑戰。

以後要新增別的動作欄位，把新的 Holm 偏好交給同一個導出函數即可。本輪的安裝器只接受這一個欄位，其他卡的權重沒有提前加進去。

正式 v2 雜湊 ${study.official}。這一輪沒有寫入權重。
`;
}
