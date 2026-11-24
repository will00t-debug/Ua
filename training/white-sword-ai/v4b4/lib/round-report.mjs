function num(value,digits=3){
 if(value==null||Number.isNaN(Number(value)))return '—';
 return Number(value).toFixed(digits);
}
export function renderRound(study){
 const lines=[];
 const frozen=study.frozen;
 lines.push('# 白劍 AI v4-B.4 兩階段確認','');
 lines.push('這一輪用已經定死的規則抽分支。篩選 8 組只排名，確認固定 '+frozen.each+' 組，判定是單尾精確符號檢定加 Holm。沒有改 v2，也沒有改 Hard Search 2、Hard cap 7、權重範圍、單步 1.5 或部署。');
 lines.push('篩選鹽 '+frozen.screenSalt+'，確認鹽 '+frozen.confirmSalt+'。兩邊的種子不相交，也不和先前 v4-B 的分支鹽 88000、120000 相交。確認開始前就把候選和組數寫進 screen.json，之後不再用確認結果改門檻或排序。');
 lines.push('這 '+frozen.rows.length+' 個局面裡，單步方盒學得會的有 '+frozen.rows.filter(row=>row.learnable).length+' 個。學不會的即使篩選達標也不占確認名額。');
 lines.push('');
 lines.push('## 結果');
 lines.push('篩選 '+study.screenGames+' 場，完成配對 '+study.screenFinished+' 組，未完成 '+study.screenUnfinished+' 組。確認 '+study.confirmGames+' 場，完成配對 '+study.confirmFinished+' 組，未完成 '+study.confirmUnfinished+' 組。合計 '+study.games+' 場。');
 lines.push('達標 '+study.qualified+' 個，方盒學不會而跳過 '+study.unlearnable+' 個，名額不夠 '+study.capped+' 個，進入確認 '+frozen.candidates.length+' 個。Holm 留下 '+study.confirmed.length+' 個。權重沒有寫入。');
 lines.push('');
 if(!study.rows.length)lines.push('沒有局面進入確認。');
 for(const row of study.rows){
  const label=(row.cardB||row.id.slice(0,8))+' 對 '+(row.cardA||'v2 目前的動作');
  lines.push('- '+label+'（'+row.bucket+' / '+row.opponent+'）：篩選平均差 '+num(row.screenMean,2)+'。確認 '+row.n+' 組，B 勝 '+row.minus+'、A 勝 '+row.plus+'、平手 '+row.tie+'。單尾 p='+num(row.pOne)+'，雙尾 p='+num(row.pTwo)+'。條件平均差區間 '+num(row.low,2)+' 到 '+num(row.high,2)+'。'+(row.confirmed?'Holm 留下。':'沒有留下。'));
 }
 lines.push('');
 if(study.skipped.length){
  lines.push('## 達標但沒有進入確認');
  for(const row of study.skipped){
   const why=row.learnable?'名額已經滿了':'單步方盒學不會';
   lines.push('- '+(row.cardB||row.id.slice(0,8))+'，篩選平均差 '+num(row.mean,2)+'，'+why+'。');
  }
  lines.push('');
 }
 lines.push('常態區間只附在紀錄裡，不用來判定。未完成的配對不補抽。');
 lines.push('');
 return lines.join('\n');
}
