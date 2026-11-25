function num(value){
 return Number.isFinite(value)?value.toFixed(3):'—';
}
function count(value){
 return Number.isFinite(value)?String(value):'—';
}
function block(title,loss){
 if(!loss)return title+'：沒有資料。';
 return title+'：局面誤差 '+num(loss.position?.mse)+'，局面相關 '+num(loss.position?.correlation)
  +'；對局誤差 '+num(loss.game?.mse)+'，先平均再平方的誤差 '+num(loss.game?.cancelledMse)
  +'，對局相關 '+num(loss.game?.correlation)+'。零預測的局面誤差 '+num(loss.zero?.mse)+'。';
}
export function renderReport(study){
 const data=study.data||{};
 const scale=study.scale||{};
 const features=study.features||{};
 const needed=study.needed||{};
 const answers=[
  '① 資料與評估管線：'+(study.trust||'見下面的核對數量。'),
  '② 修正後相對零預測、且能改變決策的學習證據：'+(study.learned||'沒有。'),
  '③ 是否值得繼續批次學習：'+(study.next||'證據不足。')
 ];
 return [
  '# 白劍 AI v6-A.1：訓練資料與學習有效性稽核',
  '這輪沒有新的完整對局，也沒有新的分支續算。#602 的 18 個局面和它們的原始對局改列為開發覆核，不再當成獨立測試。下面的數字都是開發證據。正式 v2、070 凍結權重、Hard cap 7 和殘差夾限都沒有改。沒有建立可採用候選，沒有打 192 場。',
  '## 資料核對',
  '局面編號 '+count(data.ids)+' 個。A/B 動作鍵、特徵和行動者都一致的有 '+count(data.consistent)+' 個。動作鍵衝突 '+count(data.keyConflict)+'，A/B 對調 '+count(data.swapped)+'，特徵衝突 '+count(data.featureConflict)+'，行動者衝突 '+count(data.actorConflict)+'。',
  '沒有成對特徵而隔離 '+count(data.noFeatures)+' 個。沒有種子而隔離 '+count(data.noSeed)+' 個。同一檔案裡重複且結果矛盾的嘗試 '+count(data.conflict)+' 個，已整筆排除。缺一邊的嘗試 '+count(data.incomplete)+' 個。',
  '保留進稽核的比較 '+count(data.kept)+' 個。其中 '+count(data.multiSource)+' 個在多個來源都有配對；那些嘗試編號不是同一次抽樣，所以分開保留，沒有把勝者平均成一筆。比 #602 只留最長來源多出來的配對是 '+count(data.extraPairs)+' 組。',
  '分支種子沒有寫進紀錄，不能從檔案還原成數字。配對身份用來源檔、局面編號和嘗試編號辨認。A/B 的產生程式是同一份隱藏樣本複製兩份，但紀錄本身沒有把那個種子存下來。',
  '## 尺度',
  '配對勝率差的預測中位數絕對值 '+num(scale.prediction?.median)+'，最大 '+num(scale.prediction?.max)+'。兩個動作的混合分差中位數 '+num(scale.blendGap?.median)+'，第九十分位 '+num(scale.blendGap?.p90)+'。殘差差的中位數 '+num(scale.residual?.median)+'，最大 '+num(scale.residual?.max)+'。殘差差大於混合分差的局面 '+count(scale.residualBeatsGap)+' 個。混合分差超過殘差夾限 36 的局面 '+count(scale.gapAbove36)+' 個，這些局面在現有夾限下不可能被殘差改選。',
  '訓練對局交叉驗證選到的尺度倍數是 '+count(study.multiplier)+'。這一步只看訓練誤差，沒有用開發結果回頭再調。',
  '## 特徵',
  '線性差有 '+count(features.linear?.width)+' 欄，動作相減後恆為 0 的有 '+count(features.linear?.zero?.length)+' 欄，有效秩 '+count(features.linear?.rank)+'。被消掉的是同一局面裡兩邊相同的量，包括生命、能量、AP、手牌張數、前線張數、階段和回合。',
  '既有 8 個交互差有 '+count(features.interaction?.width)+' 欄，有效秩 '+count(features.interaction?.rank)+'。交互讓「動作種類乘上能量或手牌」這類場面差異留下來；線性差做不到。本輪沒有新增交互或卡牌特例。',
  '## 共同保留子集',
  block('修正前，原目標',study.before),
  block('只換修正後的目標，係數不變',study.sameModel),
  block('修正資料後用原懲罰重擬合',study.refit),
  block('重擬合後再乘訓練交叉驗證的尺度',study.scaled),
  '改選：保留 '+count(study.decisions?.kept)+'，改變 '+count(study.decisions?.changed)+'，方向與平均差符號相同 '+count(study.decisions?.toward)+'，相反 '+count(study.decisions?.against)+'，選到沒有分支結果的第三動作 '+count(study.decisions?.unknown)+'。乘上尺度後改選 '+count(study.scaledChanged)+' 個。保護局面被改到 '+count(study.decisions?.protectedChanged)+' 個；保護局面維持原選擇不算學會。',
  '## 粗估樣本數',
  '先前把粗估公式的結果寫成還需追加的對局數，但公式沒有減掉已有對局。這次分開寫：粗估總樣本數 '+count(needed.total)+'，粗估額外樣本數 '+count(needed.extra)+'。這不是正式檢定力分析，補到這個數量也不保證通過。',
  '## 三個問題',
  ...answers,
  '不採用，不部署，沒有合併，沒有新對局，也沒有啟動 5,000 場。修好管線不表示 AI 變強。'
 ].join('\n\n')+'\n';
}
