function num(value,digits=2){
 if(value==null||Number.isNaN(Number(value)))return '—';
 return Number(value).toFixed(digits);
}
function band(stats){
 if(!stats?.n)return '沒有樣本';
 return stats.n+' 個，中位數 '+num(stats.median)+'，四分位 '+num(stats.p25)+' 到 '+num(stats.p75)+'，範圍 '+num(stats.min)+' 到 '+num(stats.max);
}
export function renderReport(study){
 const lines=[];
 lines.push('# 白劍 AI v4-B.6 局面與動作的特徵分離','');
 lines.push(study.verdictText||'');
 lines.push('這一輪沒有新對局，沒有採用權重，也沒有寫入 v2。Hard Search 2、Hard cap 7、單步 1.5、權重範圍 [-6, 6]、雜湊凍結、兩階段確認和冠軍標準都沒有改。留在前線的 070，以及原本的 067 突襲，只當作現有策略要保護的選擇，不是新的訓練標籤。');
 lines.push('');
 lines.push('## 現有特徵');
 lines.push('同一張卡可以打前線或能量線的配對有 '+study.audit.pairs+' 個，其中 '+study.audit.onlyLines+' 個除了雜湊以外只差 line_front 和 line_energy。');
 if(study.audit.names?.length){
  lines.push('會隨這兩種打出改變的既有名字：'+study.audit.names.map(row=>row.name+' '+row.count).join('、')+'。');
 }
 lines.push('已確認的那一局，兩張動作不同的非雜湊特徵是：'+(study.audit.targetChanges.join('、')||'沒有')+'。');
 lines.push('能源、AP、手牌張數、前線張數、對方最大 BP，以及這張卡自己的費用、BP 和生成，在這兩張動作上的數值相同。這些局面資訊已經在向量裡。線性權重要改變兩張動作的排名，只能使用會隨動作改變的欄位，所以這些常數進不了這個選擇。');
 const shown=(study.audit.targetConstant||[]).filter(row=>['my_energy','my_ap','my_hand','my_front','opp_front','opp_bp_max','card_energy','card_bp','card_gen','spends_ap'].includes(row.name));
 if(shown.length)lines.push('該局這些相同的值：'+shown.map(row=>row.name+' '+num(row.value)).join('、')+'。');
 lines.push('程式裡另有路線交互，但是特定卡的例外，例如藍染的 aizen_energy_play。這 48 個配對沒有出現那些例外。這一輪不為 070 再加一條卡號例外。');
 lines.push('');
 lines.push('## 可見局面');
 lines.push('重播了已保存對局來讀取行動玩家看得到的能源、手牌費用、AP、雙方前線 BP 和空格。'+study.matched+' / '+study.total+' 個局面的動作鍵和重播一致。');
 if(study.slots)lines.push('前線槽位是 '+study.slots.front+'，能量線槽位是 '+study.slots.energy+'。前線空格可以由 my_front 換算。能量線空格沒有現成特徵。');
 for(const row of study.scalars||[]){
  lines.push('- '+row.label+'：全部 '+band(row.all)+'。已保存 '+band(row.saved)+'。新局面 '+band(row.fresh)+'。已確認局面是 '+num(row.target)+'，約在第 '+num(100*(row.percentile||0),0)+' 百分位。');
 }
 lines.push('');
 lines.push('## 交互特徵');
 lines.push('事先登記的交互是：手牌能量缺口乘上打能量線、這張卡的生成能補上的缺口乘上打能量線、前線 BP 差距乘上打前線、空格乘上對應路線。手牌缺口是其他每張牌各自還差的色能源加總，再除以 8，所以可以大於 1；它量的是有多少張牌更接近付得出。卡牌自己的生成或 BP 乘上路線只作為對照。特徵裡沒有局面編號、uid 或特定卡號。');
 lines.push('分離門檻在重播前就定好：目標的能量線減前線要大於 0.05，而且至少是留在前線配對 75 分位的兩倍，這些差值也不能幾乎是常數。卡牌自身數值乘上路線不能過關。');
 for(const row of study.features||[]){
  lines.push('- '+row.name+'（'+row.kind+'）：目標能量線減前線 '+num(row.targetDiff,3)+'。留在前線的配對中位數 '+num(row.median,3)+'、75 分位 '+num(row.p75,3)+'。'+row.reason+'。'+(row.pass?'通過分離門檻。':'不進入實驗模型。'));
  lines.push('  已保存配對的差值 '+band(row.saved)+'。新局面 '+band(row.fresh)+'。其中現有策略把 070 留在前線的差值 '+band(row.protect070)+'。');
 }
 if(study.raid?.length){
  lines.push('067 突襲對上當時會被能量線打出取代的那張動作，交互差值（能量線減突襲）是：'+study.raid.map(row=>row.name+' '+num(row.diff,3)).join('、')+'。這是保護約束會受到的拉動，不是該突襲的正確標籤。');
 }
 const hand=(study.features||[]).find(row=>row.name==='hand_short');
 const board=(study.features||[]).find(row=>row.name==='board_pressure');
 const front=(study.features||[]).find(row=>row.name==='open_front');
 if(hand&&board&&front){
  lines.push('');
  lines.push('已確認局面的手牌缺口差值是 '+num(hand.targetDiff)+'，現有策略把 070 留在前線的那些差值中位數是 '+num(hand.protect070?.median)+'、最大 '+num(hand.protect070?.max)+'。目標比較缺能量，但落在同一段範圍，一個權重無法只推動目標。該局雙方前線 BP 差是 '+num(board.targetDiff)+'，不是因為落後才要能量線。前線完全空著，open_front 的差值是 '+num(front.targetDiff)+'，那個方向支持打前線，也就是 v2 現在的選擇。');
 }
 lines.push('');
 lines.push('## 方盒');
 if(!study.box){
  lines.push('沒有交互通過分離門檻，所以沒有擬合權重。單步方盒維持在 v4-B.5 已經看過的那兩個共用路線權重，這一輪不再搜它們。');
 }else if(!study.box.ok){
  lines.push('交互有分離，但方盒沒有找到合法更新。狀態是 '+study.box.status+'。權重沒有採用。');
 }else{
  lines.push('未訓練時新欄位的權重是 0，選牌和 v2 一致的局面有 '+study.box.checked+' 個。方盒之後 L1 '+num(study.box.objective)+'。動到的權重：'+(study.box.weights||[]).map(row=>row.name+' '+num(row.delta)).join('、')+'。');
  lines.push('目標'+(study.box.keptTarget?'已改選能量線':'沒有改選')+'。必須放開 '+((study.box.necessary||[]).length)+' 個已保存局面，實際改選 '+study.box.changed+' 個。這個結果只說明表示能力，不採用。');
 }
 lines.push('');
 lines.push('## 之後的挖掘');
 lines.push('現有線性模型學不會、但可能有策略價值的決策，不應該因為學不會就從樣本裡消失。下一次挖掘可以另留一小段預算，專門保留同一張卡的前線和能量線、以及單步方盒學不會的局面。這一輪沒有開新對局。');
 lines.push('');
 return lines.join('\n');
}
