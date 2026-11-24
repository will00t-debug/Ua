// Traditional Chinese record of the focused round. A miss stays inconclusive.
function num(value,digits=2){
 if(value==null||!Number.isFinite(Number(value)))return '—';
 return Number(value).toFixed(digits);
}
function pText(value){
 if(value==null||!Number.isFinite(Number(value)))return '—';
 const number=Number(value);
 if(number>0&&number<0.0001)return number.toExponential(2);
 return number.toFixed(4);
}
function statusText(row){
 if(row.confirmed)return '通過事先登記的方向';
 if(row.aligned===false&&row.mean)return '證據不足；樣本平均偏向另一邊，但那不是事先登記的檢定';
 return '證據不足';
}
function stepText(status){
 if(status==='safe')return '軟保護的選擇都還在';
 if(status==='collateral')return '有軟保護被放開';
 if(status==='hard-only')return '只保住硬約束';
 return status||'—';
}
function fitText(row){
 if(!row)return '沒有執行。';
 if(row.status==='target-infeasible')return '三筆能量線偏好在這個單步方盒裡無解。';
 if(row.status==='front-infeasible')return '加上已確認的前線保護後無解。';
 if(row.status==='anchor-infeasible')return '錨點和三筆目標不能同時成立。';
 if(!row.ok)return '無解（'+row.status+'）。';
 const weights=(row.weights||[]).map(item=>item.name+' '+num(item.delta,4)).join('、')||'沒有列出權重';
 return '有一組合法步，'+stepText(row.status)+'，L1 '+num(row.objective,4)+'。動到的權重：'+weights+'。';
}
function raidText(row,frontConfirmed){
 if(!row?.targetsOk)return '目標本身無解，所以不能把突襲放開說成原因。';
 if(!row.frontOk)return '前線保護和目標不能同時成立。突襲還沒有成為這個無解的原因。';
 if(row.raidOk)return '把 067 突襲也設成硬約束後，單步方盒裡仍有可行解。搜尋器若放開突襲，那只是一個頂點，不是每個解都必須放開。';
 if(row.raidRequired){
  const kept=frontConfirmed?'三筆能量線偏好、錨點和已確認的前線保護':'三筆能量線偏好和錨點';
  return kept+'有可行解，但再要求保住 067 突襲就沒有。因此每個同時保住這些選擇的合法解都必須放開突襲。範圍只限這個單步方盒和凍結雜湊，不是方盒以外的全域無解證明。';
 }
 return '突襲檢查沒有完成。';
}
export function renderReport(study){
 const confirm=study.confirm||[];
 const lines=[];
 lines.push('# 白劍 AI v4-B.9 共同策略學習與集中驗證');
 lines.push('');
 lines.push(study.verdict||'這一輪沒有產生結論。');
 lines.push('正式 v2、Hard Search 2、Hard cap 7、單步 1.5、權重範圍、雜湊凍結、遊戲規則、兩階段確認和冠軍晉級都沒有改。沒有部署，沒有啟動 5,000 場。BLC-4-060 的資料繼續保存，沒有拿去擬合。');
 lines.push('');
 lines.push('## 事先登記');
 lines.push('三筆方向先確認，再做共同權重。d8a4e2b6f8d32818 只有在這 66 組通過 Holm、而且平均符號和事先登記一致時，才變成硬保護。篩選的 +0.25 本身不是保護。三筆已經 Holm 確認的能量線偏好不再重打。');
 lines.push('確認的 Holm 家族就是這三個事先登記方向。沒有通過的結果寫成證據不足，不表示兩個動作等價。060 的兩筆即使各自通過，也只是紀錄，不進入權重。');
 lines.push('共同權重只比較既有 115 維、五個已登記的局面交互，以及 v4-B.8 已經凍結的實驗權重。本輪不新增特徵，也不為卡號另開例外。');
 lines.push('067 突襲是否必須放開，是把突襲設成硬約束後看單步方盒還有沒有解。搜尋器放出的一個解不算證明。這個檢查只涵蓋單步方盒與凍結雜湊，不是全域無解證明。');
 lines.push('有能保住三筆能量線、錨點和已確認前線的實驗步，才做集中驗證。優先用同時保住突襲的解。驗證最多六個局面，角色是突襲 1、其他卡改到能量線 2、新種子改選 2、被帶離前線 1。空的角色不拿別的角色補。三筆能量線目標不拿來做退步檢驗。本輪已經用同一對動作打過 66 組的局面，也不再重複打。驗證問的是 v2 的原選擇是否更好，單尾精確符號檢定，只在這一批驗證裡做 Holm。不顯著只表示證據不足，不表示兩個動作等價，也不表示候選安全。');
 lines.push('新種子挖掘最多 6 場，用來找相關決策。這 6 場不計入 1,188 的分支上限。分支上限只算確認和驗證的對局。');
 lines.push('');
 lines.push('## 三筆方向');
 lines.push('各固定 66 組，鹽 940000。方向在抽樣前就固定。確認 '+((study.confirm||[]).length*132)+' 場，全部分支 '+num(study.games,0)+' 場。');
 lines.push('');
 lines.push('| 局面 | 事先方向 | 平均 | 勝／負／平 | 單尾 p | Holm | 結論 |');
 lines.push('| --- | --- | --- | --- | --- | --- | --- |');
 for(const row of confirm){
  lines.push('| '+row.id+' '+row.text+' | '+(row.direction==='positive'?row.labelA:row.labelB)+' | '+num(row.mean,4)+' | '+row.plus+'／'+row.minus+'／'+row.tie+' | '+pText(row.p)+' | '+(row.holm?'通過':'沒有')+' | '+statusText(row)+' |');
 }
 lines.push('');
 lines.push('正的平均代表目前的第一個動作較好，負的平均代表第二個動作較好。樣本平均偏向沒有事先登記的那一邊時，不另開一個檢定，也不把它叫成新的可靠偏好。');
 const ends=confirm.filter(row=>row.id!=='d8a4e2b6f8d32818');
 if(ends.length===2&&ends.every(row=>row.confirmed))lines.push('兩筆 060 都在各自事先登記的方向上通過。這只是衍生標籤，沒有拿去擬合。');
 else lines.push('兩筆 060 沒有同時成為可靠的相反偏好。資料繼續保存。');
 lines.push('');
 lines.push('## 共同權重');
 lines.push('d8a4 的前線保護：'+(study.frontConfirmed?'這輪確認成立，已列入硬約束。':'這輪沒有確認，沒有把它當成硬保護。'));
 const reps=study.representations||{};
 lines.push('既有 115 維：'+fitText(reps.existing)+raidText(reps.existing,study.frontConfirmed));
 lines.push('五個局面交互：'+fitText(reps.position)+raidText(reps.position,study.frontConfirmed));
 const previous=study.previous||{};
 const previousKept=(previous.rows||[]).filter(row=>row.kept).map(row=>row.id);
 const previousMissed=(previous.rows||[]).filter(row=>!row.kept).map(row=>row.label+' '+row.id);
 lines.push('v4-B.8 的凍結實驗權重沒有重配。保住的檢查：'+(previousKept.join('、')||'沒有')+'。沒保住的檢查：'+(previousMissed.join('、')||'沒有')+'。');
 const candidate=study.candidate;
 if(!candidate)lines.push('沒有能同時保住必要選擇的實驗候選，所以沒有做集中驗證。');
 else{
  lines.push('拿去驗證的是 '+candidate.kind+'，'+stepText(candidate.status)+'，L1 '+num(candidate.objective,4)+'。'+(candidate.keepsRaid?'這個解保住 067 突襲。':'這個解沒有保住 067 突襲。')+(candidate.raidRequired?'硬約束檢查顯示，每個同時保住必要選擇的合法解都必須放開突襲。':'')+'沒有採用，也沒有寫入 v2。');
  const changed=(candidate.changed||[]);
  if(changed.length)lines.push('搜尋器記下的軟保護改選有 '+changed.length+' 個。');
  else if(candidate.raidRequired)lines.push('這個頂點沒有改保存集合裡的軟保護。067 突襲沒有放進那份軟保護，因為硬約束已經證明它守不住。');
  else lines.push('搜尋器沒有記下軟保護的改選。');
 }
 lines.push('');
 lines.push('## 集中驗證');
 const validation=study.validation||{};
 if(!validation.ran)lines.push('沒有進行集中驗證。沒有做的場數不解釋成那些動作已經安全。');
 else{
  lines.push('驗證 '+validation.rows.length+' 個局面，各 66 組，鹽 950000，分支 '+validation.games+' 場。方向是原選擇更好。');
  lines.push('');
  lines.push('| 局面 | 角色 | 原選擇 | 候選 | 平均 | 勝／負／平 | 單尾 p | 結論 |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for(const row of validation.rows){
   const conclusion=row.confirmed?'原選擇顯著較好':row.mean<0?'證據不足；樣本偏向候選，不是已確認的進步':'證據不足';
   lines.push('| '+row.id+' | '+row.role+' | '+row.beforeLabel+' | '+row.afterLabel+' | '+num(row.mean,4)+' | '+row.plus+'／'+row.minus+'／'+row.tie+' | '+pText(row.p)+' | '+conclusion+' |');
  }
  lines.push('');
  const regressions=(validation.rows||[]).filter(row=>row.confirmed);
 if(regressions.length)lines.push('顯著退步的是 '+regressions.map(row=>row.id+'（'+row.beforeLabel+' → '+row.afterLabel+'）').join('、')+'。這一格已經足夠拒絕採用。');
 lines.push('這裡的顯著只表示原選擇在這一組裡較好。不顯著不表示候選安全，也不表示兩個動作等價。');
 }
 if(study.mined)lines.push('新種子挖掘 '+study.mined.games+' 場，看到 '+study.mined.found+' 個決策。這 6 場不在 1,188 的分支上限裡。');
 const effects=study.effects;
 if(effects)lines.push('實測覆蓋 '+effects.covered+' 個舊局面，候選改了 '+effects.known+' 個。新挖掘裡改了 '+effects.fresh+' 個。角色計數：'+Object.entries(effects.roles||{}).map(([role,count])=>role+' '+count).join('、')+'。');
 lines.push('');
 lines.push('## 凍結雜湊');
 const hash=study.hash||{};
 const line=hash.line||{};
 const gap=Number(line.frontPoints)-Number(line.energyPoints);
 lines.push('BLC-4-070 的前線簽名字串是 `'+line.front+'`，落在 h'+line.frontBin+'，權重 '+num(line.frontWeight,4)+'，乘上 6 是 '+num(line.frontPoints,4)+'。能量線是 `'+line.energy+'`，落在 h'+line.energyBin+'，權重 '+num(line.energyWeight,4)+'，乘上 6 是 '+num(line.energyPoints,4)+'。前線減能量線的雜湊分是 '+num(gap,4)+'。');
 lines.push('這兩個格子的權重是全域的。同一個格子裡的其他動作共用這一個數，所以這 '+num(gap,4)+' 分不是 070 專用的路線分。本輪仍凍結雜湊，不改這些權重。');
 const bins=hash.bins||[];
 const show=(index,title)=>{
  const bin=bins[index];
  if(!bin)return;
  lines.push(title+' h'+index+' 的列舉簽名字串（不是合法動作清單）：'+(bin.signatures||[]).join('、')+'。');
  const seen=(bin.examples||[]).map(item=>typeof item==='string'?item:item.text+' ×'+item.count);
  if(seen.length)lines.push('在檢查過的局面裡，這個格子實際出現：'+seen.join('、')+'。');
  const pending=(bin.unresolved||[]).map(item=>item.text+' ×'+item.count);
  if(pending.length)lines.push('同一個格子裡還有向量沒有卡號的動作：'+pending.join('、')+'。它們共用這個權重。');
 };
 show(line.frontBin,'前線格子');
 show(line.energyBin,'能量線格子');
 lines.push('對過 '+hash.checked+' 個動作向量。打出、突襲、起動、攻擊、移動和結束行動都能用向量裡的卡號還原，這一部分不一致的有 '+hash.structural+' 個。另外 '+((hash.mismatched||0)-(hash.structural||0))+' 個是選擇目標的動作，向量沒有卡號，不能還原成簽名字串。');
 lines.push('');
 lines.push('## 權重');
 lines.push('沒有採用新權重。v2 的雜湊仍是 `'+study.official+'`。棋力沒有因此提升。');
 lines.push('');
 return lines.join('\n');
}
