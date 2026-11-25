function num(value){
 return Number.isFinite(value)?value.toFixed(3):'—';
}
function prob(value){
 if(!Number.isFinite(value))return '—';
 if(value>0&&value<0.001)return value.toExponential(2);
 return value.toFixed(3);
}
function count(value){
 return Number.isFinite(value)?String(value):'—';
}
export function renderReport(study){
 const fit=study.fit||{};
 const dev=fit.dev||{};
 const zero=fit.zero||{};
 const independent=study.independent||{};
 const lines=(study.positions||[]).map(row=>'- '+row.id+'（'+row.opponent+'，'+(row.bucket||'—')+'，對局 '+row.seed+'）：32 組平均差 '+num(row.mean32)+'，16 組 '+num(row.mean16)+'，8 組 '+num(row.mean8)+'。');
 const depths=(study.depths||[]).map(row=>'歷史訓練只用前 '+row.pairs+' 組時，開發相關 '+num(row.correlation)+'，開發誤差 '+num(row.mse)+'。').join('\n');
 return [
  '# 白劍 AI v6-A：批次動作價值學習',
  '正式 v2 的 115 個權重維持凍結，雜湊 '+study.official+'。070 權重維持 '+study.frozenWeight+'，沒有單獨再調。新的模型是額外的動作價值殘差，初始為 0，只在 Hard cap 7 裡面改排序。單一動作的殘差夾在 ±18，所以兩個動作的殘差差最多 36，和以前一個殘差欄位的上限一樣。',
  '訓練目標是配對平均差，權重是配對數量。未顯著的局面仍可參與訓練，但不當成確定答案。特徵只用行動者可見的通用局面和動作量，不用局面編號、uid、對局種子、雜湊桶或個別卡號。線性模型和 8 個通用交互先在歷史資料上比較，懲罰用訓練對局的五折交叉驗證選擇，再用開發對局決定模型。這個選擇在新對局開始前凍結。',
  '歷史可用局面 '+count(study.historical?.positions)+' 個、原始對局 '+count(study.historical?.games)+' 個、配對 '+count(study.historical?.pairs)+' 組。訓練對局 '+count(study.historical?.trainGames)+'，開發對局 '+count(study.historical?.devGames)+'。中位數每個局面 '+count(study.historical?.medianPairs)+' 組。至少 32 組的局面 '+count(study.historical?.deep)+' 個。非線性模型沒有擬合：獨立對局只有一百多場，參數會比對局多。要支撐小型非線性模型，大致需要上千個不同原始對局，而且每個局面的平均差要比現在穩定。這個缺口這輪沒有補上。',
  '## 開發結果',
  '凍結的模型是 '+(fit.class||'—')+'，懲罰 '+count(fit.lambda)+'。開發對局的加權誤差 '+num(dev.mse)+'，零殘差是 '+num(zero.mse)+'，相關 '+num(dev.correlation)+'。開發通過：'+(fit.devPass?'是':'否')+'。另一個模型：'+((fit.alternatives||[]).map(row=>row.id+' 誤差 '+num(row.mse)+'、相關 '+num(row.correlation)).join('；')||'—')+'。開發資料曾經用來設計既有特徵，不能當成泛化成功。',
  depths||'沒有足夠的深配對可以比較 8、16、32 組。',
  study.breadth?'同樣的訓練配對預算下，深抽樣的開發相關是 '+num(study.breadth.deep)+'，廣抽樣是 '+num(study.breadth.broad)+'。這仍是開發比較，沒有拿來改凍結模型。':'',
  '## 新的獨立對局',
  '挖掘 '+count(study.mined?.games)+' 場，列入 '+count(study.mined?.selected)+' 個不同原始對局，每局 32 組，分支 '+count(study.games)+' 場。',
  lines.length?lines.join('\n'):'沒有新的獨立局面。',
  '8 組和 32 組符號一致的有 '+count(study.stability?.agree8)+' / '+count(study.stability?.compared8)+'，16 組有 '+count(study.stability?.agree16)+' / '+count(study.stability?.compared16)+'。32 組平均區間寬度 '+num(study.stability?.width32)+'，8 組是 '+num(study.stability?.width8)+'。',
  '獨立對局的加權誤差 '+num(independent.mse)+'，零殘差 '+num(independent.zero)+'，相關 '+num(independent.correlation)+'，排列檢定 p '+prob(independent.p)+'。獨立測試通過：'+(study.independentPass?'是':'否')+'。',
  study.gap?'若相關維持在 '+num(independent.correlation)+' 附近，以目前 '+count(independent.games)+' 個獨立對局，還需要大約 '+count(study.gap.gamesNeeded)+' 個獨立對局，排列檢定才比較有機會穩定分開。這是缺口的量級，不是追加抽樣。':'',
  '## 安全檢查',
  (study.safety||[]).map(row=>'- '+row.id+'：'+(row.ok?'維持允許的選擇':'改到不允許的選擇')+'。').join('\n')||'沒有檢查保護局面。',
  study.candidate?'候選模型通過開發、獨立對局和安全檢查。':'沒有產生候選模型。'+(fit.devPass?'開發有一點改進，但獨立對局或安全檢查沒有通過。':'開發誤差沒有比零殘差好過事先登記的 2%，資料還不夠支持批次學習。'),
  study.matches?'已打 192 場診斷。':'沒有打 192 場。',
  '不採用，不部署，沒有寫入正式 v2，也沒有啟動 5,000 場。不顯著只表示證據不足。'
 ].filter(Boolean).join('\n\n')+'\n';
}
