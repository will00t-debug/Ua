function num(value,digits=2){
 if(value==null||Number.isNaN(Number(value)))return '—';
 return Number(value).toFixed(digits);
}
function weightText(row){
 return row.name+' '+num(row.before)+' → '+num(row.after)+'（'+num(row.delta)+'）';
}
export function renderReport(study){
 const update=study.update;
 const lines=[];
 lines.push('# 白劍 AI v4-B.5 已確認偏好的一步','');
 lines.push('這一輪把 v4-B.4 留下的一個偏好放進單步方盒。雜湊維持凍結，Hard cap 7、單步 1.5、權重範圍 [-6, 6]、Hard Search 2 都沒有改。沒有寫入 v2，也沒有做 5,000 場完整對戰。');
 lines.push('已確認的偏好是中盤、白劍鏡像：把 BLC-4-070 打到能量線，而不是前線。兩張動作是同一張卡，有名字的差別只有前線和能量線。雜湊位元不同，但這一步不使用雜湊。');
 lines.push('');
 lines.push('## 權重');
 if(!update.ok){
  lines.push('方盒沒有找到合法更新。狀態是 '+update.status+'。');
 }else{
  lines.push('目標動作在更新後成為這個局面的首選。L1 長度 '+num(update.objective)+'。動到的特徵：'+update.weights.map(weightText).join('；')+'。');
  lines.push('這一步只動前線和能量線，所以任何「打到前線」對「打到能量線」都會往能量線偏約 17 分，包含別張卡。');
  lines.push('這不是「070 永遠打能量線」。步幅只夠跨過這個局面約 17 分的差距。已保存的另一個 070，前期對我拒絕時前線領先約 20 分，更新後仍留在前線。中盤對我拒絕的那個 070 差距更大，單步本來就學不會，這一步也沒有把它改掉。');
 }
 lines.push('');
 lines.push('## 連帶改動');
 if(!(update.changes||[]).length)lines.push('已保存的其他局面沒有改選。');
 for(const row of update.changes||[]){
  lines.push('- '+(row.necessary?'必須放開':'有條件放開')+'：'+row.beforeLabel+' 改成 '+row.afterLabel+'（'+row.bucket+' / '+row.opponent+'）。');
 }
 lines.push('必須放開表示：在雜湊凍結的單步裡，沒辦法同時保住那個局面的原選擇。');
 lines.push('');
 const mine=study.mine||{};
 lines.push('## 新局面');
 lines.push('新挖掘使用 '+((mine.seeds||[]).length)+' 個新種子，和後來的分支種子分開。挖到 '+num(mine.positions,0)+' 個帶內局面，其中同一張卡可以打前線或能量線的有 '+num(mine.linePairs,0)+' 個。更新後改選 '+num(mine.changed,0)+' 個。同一張卡從前線改到能量線的有 '+num(mine.flippedLine,0)+' 個，原本打前線而且沒有被改掉的有 '+num(mine.keptFront,0)+' 個。');
 if((mine.groups||[]).length){
  lines.push('改選的內容：');
  for(const group of mine.groups)lines.push('- '+group.count+' 個：'+group.label);
 }
 lines.push('');
 lines.push('## 固定 16 組');
 lines.push('訓練確認仍是 66 組、單尾精確符號檢定和 Holm。這裡只對被這一步碰到的局面另抽固定 16 組，用來看看連帶改動和新局面的方向。抽完不再加抽，也不回頭改權重。');
 if(!(study.checks||[]).length)lines.push('沒有需要另抽的局面。');
 for(const row of study.checks||[]){
  const left=row.kind==='front-kept'?'能量線':'新選擇';
  const right=row.kind==='front-kept'?'前線':'原選擇';
  lines.push('- '+row.question+'（'+row.bucket+' / '+row.opponent+'）：'+(row.labelB||row.afterLabel)+' 對 '+(row.labelA||row.beforeLabel)+'。'+row.n+' 組，'+left+' '+row.minus+'、'+right+' '+row.plus+'、平手 '+row.tie+'。'+left+'單尾 p='+num(row.pNew,3)+'，'+right+'單尾 p='+num(row.pOld,3)+'。條件區間 '+num(row.low)+' 到 '+num(row.high)+'。'+(row.oldSideHolm?'原選擇在這批校正後較好。':row.newSideHolm?'這一側在這批校正後較好。':'這 16 組沒有把方向定下來。'));
 }
 lines.push('');
 const freshSame=(study.checks||[]).find(row=>row.kind==='flipped'&&String(row.labelA).includes('BLC-4-070')&&String(row.labelB).includes('BLC-4-070'));
 if(freshSame){
  lines.push('新種子裡，同一張 BLC-4-070 從前線改成能量線的那一局，16 組是能量線 '+freshSame.minus+'、前線 '+freshSame.plus+'、平手 '+freshSame.tie+'。已確認的方向沒有在這局重現成顯著偏好。');
  lines.push('');
 }
 lines.push('## 候選');
 lines.push(study.candidateText||'沒有保存候選。');
 lines.push('adopted 是 false。正式 v2 的雜湊仍是更新前的雜湊。');
 lines.push('');
 return lines.join('\n');
}
