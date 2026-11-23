// Traditional Chinese write-up. Figures come from studySaved().
function num(value){
 return Number.isFinite(value)?value.toFixed(2):'沒有';
}
function walkLine(walk,label){
 if(walk.steps===0&&walk.flipped)return '- '+label+'：更新前已經選中，權重沒有動。';
 const end=walk.flipped?'改選了':'沒有改選';
 return '- '+label+'：'+walk.steps+' 步後'+end
  +'。分差剩 '+num(walk.gap)
  +'。選中局面連帶 '+walk.collateralSelected+'，未選入連帶 '+walk.collateralPool
  +'，其中相似 '+walk.similar+'、不相關 '+walk.unrelated
  +'。相對原權重的最大位移 '+num(walk.maxAbs)+'，L2 '+num(walk.l2)
  +'，碰到邊界 '+walk.clip+' 個，雜湊最大位移 '+num(walk.largestHash)+'。';
}
export function renderCalibration(study){
 const lines=[];
 const first=study.rows[0];
 const second=study.rows[1];
 lines.push('# 白劍 AI v4-B.1 評分尺度與多次小更新','');
 lines.push('這一輪沒有新的對局。Hard cap、權重範圍和單步 1.5 都沒有放寬。下面的多次更新只在記憶體裡試算，沒有寫進模型。');
 lines.push('');
 lines.push('## 超過 100 分的來源');
 lines.push('40 個選中局面裡，v2 領先分差的中位數是 '+num(study.census.median)+'。至少 100 分的有 '+study.census.atLeast100+' 個，至少 20 分的有 '+study.census.atLeast20+' 個。大分差會出現，但不是典型局面。');
 lines.push('');
 lines.push('兩筆不啟動 BLC-4-060 的分差，幾乎全部來自策略項，不來自 Hard Search。');
 for(const row of [first,second]){
  const groups=row.margin.groups;
  lines.push('- '+row.id+'：總分差 '+num(row.margin.total)+'。硬分 '+num(row.margin.hard)+'，經濟與卡片數值 '+num(groups.economy)+'，動作類型 '+num(groups.type)+'，雜湊 '+num(groups.hash)+'，藍染 '+num(groups.aizen)+'，卡牌編號 '+num(groups.card)+'。');
 }
 const shared=first.margin.top.filter(item=>['pass_despite_attack','affordable','spends_ap'].includes(item.name)).reduce((sum,item)=>sum+item.contribution,0);
 lines.push('最大的單項是 pass_despite_attack。pass_despite_attack、affordable、spends_ap 三項合計 '+num(shared)+' 分。card_BLC-4-060 的貢獻小於 1 分。藍染特徵的方向是縮小啟動的優勢。');
 lines.push('所以這不是這張卡的特例權重，也不是數值爆炸。v2 本來就把「可以行動時還通過」壓得很低，尺度 6 讓一個權重就能貢獻約 30 分，大於 Hard cap 7。Hard cap 只決定哪些動作進得了候選。');
 lines.push('');
 lines.push('## 不改共享權重就跨不過');
 lines.push('把雜湊、動作類型，以及 affordable、spends_ap、pass_despite_attack 和卡片數值凍結，其餘權重就算推到 [-6, 6] 邊界：');
 lines.push('- 第一筆上限 '+num(first.ceilings.noShared.box)+'，分差 '+num(first.ceilings.noShared.gap)+'。');
 lines.push('- 第二筆上限 '+num(second.ceilings.noShared.box)+'，分差 '+num(second.ceilings.noShared.gap)+'。');
 lines.push('只動 card_BLC-4-060，邊界上限是 '+num(first.ceilings.cardOnly.box)+'。只動卡牌編號和藍染特徵、連續推滿單步，第一筆停在分差 '+num(first.walks[3].gap)+'，5 個權重碰到邊界，仍然沒有改選。');
 lines.push('要改選，就必須動「通過很差」或「花錢很好」這類共享權重，或者動雜湊。這些權重也會改到其他局面。');
 lines.push('');
 lines.push('## 多次 1.5 的試算');
 lines.push('每次位移仍不超過 1.5，權重仍在 [-6, 6]。');
 lines.push(walkLine(first.walks[1],'第一筆，凍結雜湊的 logistic'));
 lines.push(walkLine(second.walks[1],'第二筆，凍結雜湊的 logistic'));
 lines.push(walkLine(first.walks[2],'第一筆，凍結雜湊並每步把具名特徵推滿 1.5'));
 lines.push('連帶上限設成選中局面 1 個、未選入 0 個時，安全搜尋把第一筆分差降到 '+num(first.safe.gap)+'、第二筆降到 '+num(second.safe.gap)+' 後停住，都沒有改選。它動的是 type_activate、type_next、affordable、spends_ap。');
 lines.push('因此多次小更新跨得過分差，也會在改選時帶來多個不相關局面的變化。累積位移已經大於單次 1.5。這不能當成維持單步信任域的訓練法。');
 lines.push('');
 const move=study.rows[2];
 lines.push('移動 BLC-2-069 的那筆相反。安全搜尋只動 '+move.safe.moved[0]+' 一步就改選，選中與未選入的連帶都是 0。整組 logistic 雖然也改選，但會多帶 1 個不相關的移動局面。');
 lines.push('');
 lines.push('## 凍結雜湊的範圍');
 const dep=study.dependence;
 lines.push('40 個局面裡的 '+dep.pairs+' 對候選中，'+dep.identical+' 對的全部特徵都相同，有沒有雜湊都分不開。只有雜湊不同的有 '+dep.hashOnly+' 對，是前期能量裡的兩次 chooseTopCard，分差約 9 分。');
 lines.push('另外 '+dep.oneStepNeedsHash+' 對在單步內要靠雜湊才跨得過分差。其中 '+dep.boxWithoutHash+' 對只要具名特徵走到邊界就仍然分得開，凍結雜湊只是讓它們不能在一步內完成。剩下的 1 對就是上面的 chooseTopCard，具名特徵沒有差別。這一輪真正改得了選牌的移動偏好，不靠雜湊。');
 lines.push('');
 lines.push('## 還沒有證據的部分');
 lines.push('兩筆 BLC-4-060 的方向相同，都是不要啟動。目前沒有「這個局面要啟動、另一個局面不要」的已確認偏好，所以還不能說線性模型學不會相反選擇。');
 lines.push('新的交互特徵或小型非線性模型，要等這種相反偏好出現，而且具名特徵的受控更新會讓其中一筆變差，才值得加。現在加一張卡的特例，解決不了共享的通過罰分。');
 lines.push('');
 lines.push('正式 v2、Hard Search 2、Hard cap 7、單步 1.5、權重範圍和部署都沒有改。沒有合併 main。');
 return lines.join('\n')+'\n';
}
