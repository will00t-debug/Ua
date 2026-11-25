// Traditional Chinese reading of the sampling comparison. No new games.
function num(value,digits=2){
 if(value==null||Number.isNaN(Number(value)))return '沒有';
 return Number(value).toFixed(digits);
}
function line(label,row){
 return '- '+label+'：平均用 '+num(row.pairs*2,0)+' 場。名義上 v2 沒選到的顯著結果每輪 '+num(row.nominalUpdate)+' 個，其中真的 '+num(row.trueConfirmed)+'、沒有差距卻顯著的 '+num(row.falseConfirmed)+'。校正後至少留下一個的輪次比例 '+num(row.adjustedUpdateRounds,2);
}
export function renderReport(study){
 const saved=study.saved;
 const lines=[];
 lines.push('# 白劍 AI v4-B.4 同樣預算下的偏好確認','');
 lines.push('權重搜尋已經能找到比射線更少連帶改動的解。160 場新種子沒有重現那三個原偏好。這一輪改看同一千兩百場左右的分支預算要怎麼抽，才比較會得到可重現、而且 v2 還沒選到的動作。沒有新的對局，沒有改權重，也沒有改 Hard Search 2。');
 lines.push('');
 lines.push('## 結論');
 lines.push('現在的停止規則把篩選和確認寫在同一批樣本上。配對裡大約八成勝負相同，所以 8 次裡只要跑出 3 次有方向的勝負、其餘平手，區間就會排除 0。在完全沒有差距的模擬裡，42 個局面一輪仍平均出現約 '+num(study.nullCurrent.nominalUpdate)+' 個「v2 沒選到」的這種結果。v4-B.2 實際多抽的 '+saved.extension+' 組配對，沒有再增加任何這類結果。');
 lines.push('同樣約 600 組配對改成兩段：42 個局面各抽 8 組，只決定誰有資格進確認；平均差達到 -0.25 以下、而且單步方盒學得會的，最多取 4 個，各自用新的配對做固定次數確認。確認樣本不再加抽，也不和篩選樣本合併。4 個確認一起做 Benjamini-Hochberg。沒有真實差距時，這種確認每輪大約 '+num(study.nullRep.falseConfirmed,2)+' 個；有一個真實平均差 -0.38 時，大約 '+num(study.moderate.trueConfirmed*100,0)+'% 的輪次能把它確認下來。');
 lines.push('');
 lines.push('## 已保存的 1,200 場');
 lines.push('- 完成配對 '+saved.pairs+' 組，對應 '+saved.pairs*2+' 場有紀錄的延續。平手 '+saved.ties+'，A 勝 '+saved.plus+'，B 勝 '+saved.minus+'。平手比例 '+num(saved.tieRate*100,1)+'%');
 lines.push('- A 是 v2 在帶內混合分數較高的動作，B 是第二名。平均差是 A 減 B，所以負值才代表 v2 還沒選到的動作較好');
 lines.push('- 8 次就平手而停止的局面 '+saved.flatAtScreen+' 個。8 次就支持 v2 的顯著結果 '+saved.supportAtScreen+' 個。8 次就指向 B 的顯著結果 '+saved.updateAtScreen+' 個：'+saved.screenUpdates.map(id=>id.slice(0,8)).join('、'));
 lines.push('- 超過 8 次的配對有 '+saved.extension+' 組。這些加抽沒有讓任何新的局面變成「B 顯著較好」');
 lines.push('- 8 次裡 3 次 B 勝、5 次平手，平均差 '+num(study.fragile.mean)+'，區間 '+num(study.fragile.low)+' 到 '+num(study.fragile.high)+'。三個篩選顯著結果都是這個形狀。v4-B.3 用新種子各再抽 16 組，沒有一個保住這個方向');
 lines.push('');
 lines.push('## 為什麼 8 次不夠');
 const size=study.sizes;
 lines.push('真實差距變大時，平手會變少。以平均差 -0.38 為例，單一個事先指定的比較要讓 95% 區間有一半機會排除 0，大約要 '+num(size.boundary,1)+' 組；要有八成機會，大約要 '+num(size.power,1)+' 組。8 組剛過前者，還沒到後者。確認段的 '+study.replication.each+' 組則高過八成那一欄。這兩個組數只說明單一比較；42 個局面一起看時，還要留位置給誤判。');
 lines.push('現在的延伸條件是絕對平均差至少 0.125 就繼續抽，最多 24 組。8 次裡只有 1 次分出勝負也達到 0.125。那個差距要看清楚，需要的組數遠超過 24，所以加抽大多停在上限，而不是停在一個穩的結論。');
 lines.push('');
 lines.push('## 同樣預算的模擬');
 lines.push('每一輪 42 個局面。沒有特別寫的局面使用和這 599 組相同的平手比例，兩邊勝負各半。有真實差距的局面把這個分布傾斜到該平均差。現行規則沿用 8、16、24 和區間排除 0。確認規則先花 42×8 組篩選，剩下的組數平均分給最多 4 個篩選平均差不大於 -0.25 的局面，而且只看新樣本。各跑 '+study.rounds+' 輪。');
 lines.push(line('沒有真實差距，現行規則',study.nullCurrent));
 lines.push('- 沒有真實差距，確認規則：平均用 '+num(study.nullRep.pairs*2,0)+' 場，誤確認每輪 '+num(study.nullRep.falseConfirmed,2)+' 個');
 lines.push(line('一個真實差距 -0.38，現行規則',study.moderateCurrent));
 lines.push('- 一個真實差距 -0.38，確認規則：真確認每輪 '+num(study.moderate.trueConfirmed,2)+' 個，誤確認 '+num(study.moderate.falseConfirmed,2)+' 個');
 lines.push('- 一個真實差距 -0.50，確認規則：真確認每輪 '+num(study.strong.trueConfirmed,2)+' 個，誤確認 '+num(study.strong.falseConfirmed,2)+' 個');
 lines.push('- 三個真實差距 -0.38，確認上限 4：真確認每輪 '+num(study.three.trueConfirmed,2)+' 個，誤確認 '+num(study.three.falseConfirmed,2)+' 個');
 lines.push('現行規則在有一個 -0.38 的差距時，每輪名義上約 '+num(study.moderateCurrent.nominalUpdate)+' 個顯著結果，其中真的約 '+num(study.moderateCurrent.trueConfirmed)+' 個，其餘約 '+num(study.moderateCurrent.falseConfirmed)+' 個沒有差距。校正後每輪留下的真結果約 '+num(study.moderateCurrent.bhTrue)+' 個。確認規則在同樣預算下每輪留下約 '+num(study.moderate.trueConfirmed)+' 個真結果，誤確認約 '+num(study.moderate.falseConfirmed,2)+' 個。');
 lines.push('');
 lines.push('## 下一輪怎麼抽');
 lines.push('總分支預算維持約 1,200 場，也就是 600 組配對。三種對手和七種類型仍各留篩選局面。');
 lines.push('1. 每個篩選局面固定 8 組。這 8 組不下結論，也不再因為看起來顯著或平均差超過 0.125 而加抽。');
 lines.push('2. 只有平均差小於或等於 -0.25 的局面可以進確認。正的平均差表示 v2 已經選到較好的一邊，記下來即可。');
 lines.push('3. 進確認之前先做單步方盒檢查。方盒無解的跳過，名額順給下一個篩選達標、而且方盒學得會的局面。最多 4 個。');
 lines.push('4. 每個確認局面用新種子抽固定約 '+study.replication.each+' 組。樣本數事先定死。區間、p 值和 Benjamini-Hochberg 只算這批新樣本。');
 lines.push('5. 新樣本的區間整個落在負的一邊，而且校正後留下，才是可以交給權重搜尋的偏好。');
 lines.push('');
 lines.push('## 沒有採用的做法');
 lines.push('沒有把總場數加大。沒有把勝負改成步數或血量差，因為存檔裡沒有這個結果，換估計目標要另外驗證。沒有把篩選和確認加在一起再算一次區間。沒有因為這次模擬去改 v2 的權重。');
 lines.push('');
 return lines.join('\n');
}
