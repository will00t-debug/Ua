# BLEACH 全卡效果稽核 — 第一階段基準報告

**分支**：`audit/card-effects`（獨立於 `feature/raid-flow`；不合併、不部署）。

## 嚴格的證據標準

本報告區分「已建檔」、「實際跑過測試」、「按官方資料逐條核對」。
`auto=true`、規則 profile 存在、先前回歸測試成功，**都不能算某張卡的所有效果已通過官方稽核**。

這個提交建立由程式直接產生的全卡稽核表，包含各卡本地印刷欄位、官方卡片連結、效果段落與成功／失敗候選案例。**候選案例尚未執行，也尚未逐卡核對官方原文**。JSON 的 `executed=false`、`officialVerified=false` 保留作後續審核證據；CSV 方便篩選。

## 目前狀態

| 指標 | 狀態 |
|---|---|
| 本地預期卡片種類 | 276（由新測試檢查，實際結果以 CI 為準） |
| 逐卡實測且官方核對通過 | 0 張（本階段尚未證實） |
| 由本次稽核發現並修正 | 0 張 |
| 仍有漏洞 | 目前未逐張確認，不能當成 0 漏洞 |
| 官方資料不足或尚未確認 | 全部 276 張（待逐卡查驗） |
| npm test | 本工作環境無法 clone GitHub；請以 PR CI 結果為準 |
| 其他並行工作 | 已見 `feature/raid-flow` 分支；本 PR 不改 Raid 引擎 |

## 稽核依據與後續驗收

- 日本官方卡表：https://www.unionarena-tcg.com/jp/cardlist/
- BLEACH 個別 FAQ：https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AB%E3%83%BC%E3%83%89%E5%80%8B%E5%88%A5&sub_category=BLEACH+%E5%8D%83%E5%B9%B4%E8%A1%80%E6%88%A6%E7%AF%87
- 官方勘誤：https://www.unionarena-tcg.com/tc/news/035.php
- 專案已知 FAQ 測試：`tests/official-faq.test.mjs` 及其他回歸測試。這些測試只涵蓋其明示情境。

每張卡至少需對每個效果段落建立可重現的合法情境；每個「若／可以／最多／僅限」等條件另測不成立、拒絕選擇、無合法目標。需驗證觸發隊列、效果時點、AP／能源支付、每回合次數、跨回合旗標、Target 合法性、牌區與唯一 UID 守恆，以及 UI 選擇權。先提交紅燈測試，再最小化修正引擎並測綠燈，方可轉成「發現問題並已修正」。必須逐條對照官方原文／FAQ 才能轉成「已實際測試通過」。

**注意**：本次沒有聲稱完成 276 張官方稽核；禁止將 CI 的庫存測試通過替代效果驗證。等待 Raid 分支整合後須重跑 Raid／REST／ACTIVE／移動及卡片守恆測試。

## 重製稽核表

```sh
node scripts/generate-card-audit.mjs
npm test
```

輸出：`audit/bleach-card-audit.json`、`audit/bleach-card-audit.csv`。先生成，再依已驗證證據逐卡補記實測結果；重新生成會覆蓋審核紀錄，正式逐卡審核應另設持久化結果來源。
