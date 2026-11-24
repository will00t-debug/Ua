function num(value,digits=2){
 if(value==null||Number.isNaN(Number(value)))return '—';
 return Number(value).toFixed(digits);
}
function pct(value){
 if(value==null||Number.isNaN(Number(value)))return '—';
 return (Number(value)*100).toFixed(0)+'%';
}
function labelKind(kind){return kind==='fixed'?'平手固定':'傾斜';}
function labelMode(mode){return mode==='fixed'?'固定 66':'事先分配';}
function labelSide(side){return side==='one'?'單尾':'雙尾';}
function find(study,name,mode='fixed',side='one'){
 return study.rows.find(row=>row.name===name&&row.mode===mode&&row.side===side);
}
export function renderConfirm(study){
 const lines=[];
 const null80=find(study,'null-tie80');
 const one=find(study,'one375-tie80');
 const alloc=find(study,'one375-tie80','allocate');
 const two=find(study,'one375-tie80','fixed','two');
 const blocked=find(study,'learn-plus-blocked');
 const six=find(study,'six375-tie80');
 const weak=find(study,'one250-tie80');
 const strong=find(study,'one500-tie80');
 const stay80=find(study,'fixed80-m016');
 const stay90=find(study,'fixed90-m008');
 const tilt90=find(study,'one375-tie90');
 lines.push('# 白劍 AI v4-B.4 確認檢定與完整模擬','');
 lines.push('這一輪先把確認規則定死，再用完整流程重估誤確認和真確認。模擬本身沒有新的分支對戰，沒有改 v2，也沒有改 Hard Search 2、Hard cap 7、權重範圍或單步 1.5。');
 lines.push('上一份報告的 86% 使用常態區間、確認組數隨候選數改變，而且沒有放入單步方盒。那個數字不再當作操作依據。');
 lines.push('');
 lines.push('## 3 勝 5 平');
 const fragile=study.fragile;
 lines.push('8 組成對裡 B 勝 3、平手 5。常態平均差區間是 '+num(fragile.normal.low)+' 到 '+num(fragile.normal.high)+'，雙尾 p='+num(fragile.normal.p,3)+'，會判成顯著。');
 lines.push('精確配對符號檢定把平手拿開，只剩 3 次分出勝負且全部是 B。單尾 p='+num(fragile.exact.pOne,3)+'，雙尾 p='+num(fragile.exact.pTwo,3)+'。條件在這 3 次勝負上的平均差信賴區間是 '+num(fragile.interval.low)+' 到 '+num(fragile.interval.high)+'，含有 0。');
 lines.push('確認階段的判定用單尾精確符號檢定。篩選已經指定方向是 B 優於 v2，確認資料不再改方向，也不再改篩選門檻或候選排序。平均差的區間是同一批勝負的雙尾 Clopper-Pearson 區間，平手數固定成觀察值。單尾 5% 和這個雙尾區間不是同一個門檻，所以區間用來報告大小，不另外要求它排除 0。');
 lines.push('');
 lines.push('## Holm 與 Benjamini-Hochberg');
 lines.push('Holm 控制至少一次誤判的機率。Benjamini-Hochberg 控制的是被留下的結果裡，錯誤發現所占的期望比例。確認名額最多 4 個，一個錯誤偏好就會進到後面的權重搜尋，所以判定用 Holm。');
 lines.push('四個 p 值 0.01、0.02、0.04、0.20 時，Holm 只留下 0.01；Benjamini-Hochberg 留下 0.01 和 0.02。');
 lines.push('沒有差距、平手起點 0.80、固定 66 組時，Holm 的至少一次誤判是 '+pct(null80.falseRoundRate)+'，每輪誤確認 '+num(null80.falsePerRound,3)+' 個。同一列 Benjamini-Hochberg 的每輪誤確認是 '+num(null80.bhFalsePerRound,3)+' 個。一個會把平手拉低的差距 -0.375，Holm 真確認率 '+pct(one.trueRate)+'，Benjamini-Hochberg 真確認率 '+pct(one.bhTrueRate)+'。兩者在這個差距上幾乎留住同一批真偏好，Holm 少留的是沒有差距的局面。');
 lines.push('');
 lines.push('## 樣本數');
 lines.push('採用固定 66 組。候選變少也不加長，確認開始後不看結果加抽。另一個對照是把 264 組在篩選結束時平分給實際候選；那個分配也在開抽前定死。');
 lines.push('平手起點 0.80、差距 -0.375 時，固定 66 的真確認率是 '+pct(one.trueRate)+'，事先分配剩餘組數是 '+pct(alloc.trueRate)+'。確認檢定沒過的比例分別是 '+pct(one.missedTest)+' 和 '+pct(alloc.missedTest)+'。加長確認補不到沒過篩選的局面，所以組數不跟著候選數變。沒有差距時，兩種的至少一次誤判分別是 '+pct(null80.falseRoundRate)+' 和 '+pct(find(study,'null-tie80','allocate').falseRoundRate)+'。');
 lines.push('同一批固定 66 組若改用雙尾符號檢定，真確認率是 '+pct(two.trueRate)+'，至少一次誤判是 '+pct(two.falseRoundRate)+'。方向已經由篩選指定，判定維持單尾。');
 lines.push('');
 lines.push('## 和常態區間的差別');
 lines.push('沒有差距、平手起點 0.80、固定 66 組時，確認樣本的常態區間每輪有 '+num(null80.normalFalsePerRound,3)+' 個沒有差距的局面排除 0。精確檢定加 Holm 的每輪誤確認是 '+num(null80.falsePerRound,3)+' 個。8 組的 3 勝 5 平已經看出常態近似會把少量勝負判成顯著；66 組時它仍然比精確檢定加 Holm 更常排除 0。');
 lines.push('');
 lines.push('## 完整流程');
 lines.push('每一輪 42 個局面。篩選固定 8 組，門檻是平均差小於或等於 -0.25。這個門檻在確認開始前定死，確認資料不能把它放寬，也不能重排候選。篩選亂數和確認亂數分成兩條。單步方盒學不會的局面在排序後剔除，名額順給下一個達標且學得會的局面，最多 4 個。真確認率的分母只含學得會的真實差距。確認不足拆成沒過篩選、名額不夠、進了確認但 Holm 沒留下。各 '+study.rounds+' 輪。');
 lines.push('表裡的起點平手是沒有差距時的平手比例。訊號平手是有差距的那個局面在傾斜或固定之後的平手比例。傾斜會把平手拉低：起點 0.80、平均差 -0.375 的訊號平手是 '+num(one.signalTie,2)+'；起點 0.90 的訊號平手是 '+num(tilt90.signalTie,2)+'。固定列則讓平手維持在起點，平均差不能超過 1 減平手。');
 lines.push('');
 lines.push('| 情境 | 生成 | 起點平手 | 訊號平手 | 樣本 | 尾 | 場數 | 誤確認 | 至少一次誤判 | 真確認 | 確認不足 | 沒過篩選 | 名額不夠 | 檢定沒過 | BH 真確認 | 常態誤排除 |');
 lines.push('| --- | --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
 for(const row of study.rows){
  lines.push('| '+row.name+' | '+labelKind(row.kind)+' | '+num(row.tie,2)+' | '+num(row.signalTie,2)+' | '+labelMode(row.mode)+' | '+labelSide(row.side)+' | '+num(row.games,0)+' | '+num(row.falsePerRound,3)+' | '+pct(row.falseRoundRate)+' | '+pct(row.trueRate)+' | '+pct(row.insufficient)+' | '+pct(row.missedScreen)+' | '+pct(row.missedCap)+' | '+pct(row.missedTest)+' | '+pct(row.bhTrueRate)+' | '+num(row.normalFalsePerRound,3)+' |');
 }
 lines.push('');
 lines.push('誤確認是每輪 Holm 留下、而且該局面沒有真實差距的個數。至少一次誤判是出現這種留下的輪次比例。常態誤排除是確認樣本裡，常態區間對沒有差距的局面排除 0 的次數，不作為判定。');
 lines.push('');
 lines.push('## 方盒、差距和維持平手');
 lines.push('一個學得會的 -0.375 旁邊放一個學不會、而且更大的 -0.50，固定 66 的真確認率是 '+pct(blocked.trueRate)+'，和只有那個學得會的局面時的 '+pct(one.trueRate)+' 同一量級。學不會的不占名額。六個學得會的 -0.375 一起出現時，真確認率降到 '+pct(six.trueRate)+'，其中名額不夠占 '+pct(six.missedCap)+'。上限 4 個是事先定的。');
 lines.push('差距 -0.25、平手會被拉低時，真確認率是 '+pct(weak.trueRate)+'，沒過篩選占 '+pct(weak.missedScreen)+'。差距 -0.50 時真確認率是 '+pct(strong.trueRate)+'。');
 lines.push('平手維持 0.80、母體平均差 -0.16 時，真確認率是 '+pct(stay80.trueRate)+'，沒過篩選占 '+pct(stay80.missedScreen)+'。平手維持 0.90、母體平均差 -0.08 時，真確認率是 '+pct(stay90.trueRate)+'，沒過篩選占 '+pct(stay90.missedScreen)+'。-0.25 的篩選比這兩個母體平均差更嚴，所以平手不下降時，多數真實差距進不了確認。這不是事後把門檻放寬可以補的：門檻在開抽前已經定死。');
 lines.push('');
 const supports=null80.falseRoundRate<=0.08&&one.trueRate>=0.7;
 lines.push('## 是否開跑');
 if(supports){
  lines.push('修正後的模擬仍支持兩階段。沒有差距、平手起點 0.80 時，至少一次誤判是 '+pct(null80.falseRoundRate)+'。差距 -0.375 且平手會被拉低時，真確認率是 '+pct(one.trueRate)+'，確認不足主要是沒過篩選，不是確認檢定沒過。平手若維持在八成或九成，這一輪可能確認不到人；那仍是這個規則的結果，不另追加抽樣。');
  lines.push('因此可以開始這一輪約 1,200 場的分支：沿用已平衡的 42 個局面，篩選 8 組和確認 66 組使用分開的新種子，方盒學不會的跳過，最多 4 個候選，判定用單尾精確檢定和 Holm。不改 v2，也不改 Hard Search 2、Hard cap 7、權重範圍、單步 1.5 或部署。');
 }else{
  lines.push('修正後的模擬不支持現在開跑。沒有差距時至少一次誤判是 '+pct(null80.falseRoundRate)+'，差距 -0.375 的真確認率是 '+pct(one.trueRate)+'。');
 }
 lines.push('');
 return lines.join('\n');
}
