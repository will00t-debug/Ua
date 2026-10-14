# [V2-E] 獨立全卡驗收交接 — 固定快照 2026-10-15

> 工作線：`audit/v2-full-catalog-20261015`（不修改共用核心／卡包／正式站）
>
> 驗收來源基準：PR #70，`feature/universal-rules-v2-foundation-20261014` @ `ad04bef572303e8af1084ae1fb5cb431af9e7a11`。
> 後續同一張表的每個數值必須來自**相同** Git tree / commit。若比較 [V2-B/C/D] 分支，需各自 checkout 對應 SHA 生成獨立報告，不能直接將不同時間的數值相加。

## 01:39 初步發現（source review，未冒稱執行測試）

- 已讀 `AGENTS.md`：以 Node 22 執行 `npm test`，不能用 auto 支援旗標作為正式驗收。
- 已讀 `QA_ACCEPTANCE_PROGRESS.md`：既有 SLG/TTG 獨立引擎部分 FAQ 測例，**不表示 V2 通過**。逐卡所有效果驗收沒有正式完成證據。
- PR #70 的 `dist/universal-v2/real-card-pilots.mjs` 明確白名單共 **35** 張（BLEACH 15、TTG 20），不是 35 張正式官方完整驗收。
- V2 `verified-real-decks.mjs` 各提供 BLEACH 紫色與 TTG 紅色的真卡 50 張牌組；`universal-v2-preview.mjs` 只接入此二組。此預覽不等同正式網站、也不代表所有已移植的卡都有可選牌組。
- `tests/universal-v2-real-card-pilots.test.mjs` 的一部分案例使用 `TEST-ONLY` 合成填充卡，須另外標記；不可將這些測試當成合法全真卡對局。
- `dist/mushoku-tensei.mjs` 的 80 張號碼包含明確待核對的空欄位，不能把「有卡號」當成「資料完整」。`dist/sao-cards.mjs` 有獨立的較舊引擎 `engineImplemented` 欄位，不代表 V2 已移植。
- 本基準的 `docs/v2-handoff/` 無既存交接文件。GitHub 在初次查詢時尚未見 [V2-B/C/D] Draft PR（但已有 BLEACH 與 TTG/SLG 工作分支），之後須逐筆重查。
- 手機真機／真人 Chrome/Safari 私人預覽：**未執行**。DOM 模擬不可代替手機測試。

## 覆蓋四階段定義

1. **已建檔**：唯一的普通卡號在來源表可查（排除 AP 卡、同號異圖）；可同時標為資料欠缺。
2. **已移植**：該卡明確列於 V2 Pack 中且解析成功；舊引擎 auto、engineImplemented 不算。
3. **已驗收**：印刷全部能力（含時機、費用、選擇、被動、Raid、生命 Trigger）逐卡完成，兼具非法分支、跨卡及可執行證據。單一測試不算。
4. **可在整合版本遊玩**：同一固定 commit 的整合預覽收錄合法全真卡牌組，對戰實際完結並通過狀態與牌數不變式；未跑完不得計入。

## 重跑方式與輸出

- 產生報告：`node scripts/v2-audit-catalog.mjs` → `audit/v2-full-catalog.csv`、`audit/v2-full-catalog-summary.json`。源碼版本記錄為 git HEAD + V2 基底 SHA。不可在有未提交的核心變更時混合結果。
- 抽查覆蓋分類：`node --test tests/v2-independent-audit.test.mjs`
- 全量測試：`npm test`（要求 Node 22；總子測試數僅做回歸摘要，不當成逐卡完成率）。
- 獨立跨作品真卡全局重播：尚待本工作線執行，需記錄 seed、牌組、動作序列、終局類型、reducer 錯誤和 `assertUniversalMatch`。
- 若某一步因執行環境限制未能跑，狀態須為 `not_run`，不可填 `pass`。

## 優先阻塞／待驗證

| ID | 類別 | 觀察與交付條件 |
|---|---|---|
| E-001 | P0 覆蓋 | 現有 V2 顯式 Pilot 只限 BLEACH/TTG，SAO、MST、SLG 不能憑獨立引擎資料標為 V2 已移植；等 [V2-B/C/D] 導入後按固定 SHA 重跑 |
| E-002 | P0 全局 | 需要多 seed × 真實合法牌組 × 確實終局；卡住／步數上限未完局計失敗、存重播 |
| E-003 | P0 規則 | Q99 可放棄的生命 Trigger、滿場取代、連鎖私密選擇與敵方資訊遮蔽必須跨系列驗證 |
| E-004 | P1 UI | 私人預覽的真實手機觸控與窄螢幕尚無實機證據 |
| E-005 | P1 協作 | 尚無可驗證的 [V2-B/C/D] Draft PR 與交接檔快照；須待 PR 編號、HEAD 和 Diff 確認，不採信聲明 |

## 固定提交與環境紀錄

| 項目 | 值 |
|---|---|
| V2 基底 SHA | `ad04bef572303e8af1084ae1fb5cb431af9e7a11` |
| Node 規範 | 22.x，詳 `AGENTS.md` |
| 此 GitHub connector 靜態讀取 | 已完成，非測試執行 |
| Node 執行實際結果 | **not_run**（容器無法連線 GitHub clone；待 GitHub Actions 或可執行的 checkout） |
| 真機操作結果 | **not_run** |
| main merge / production deployment | **未執行，且禁止此工作線進行** |

## 驗收時點

- **02:00 前**：初版全卡覆蓋（腳本生成，固定輸入版本）與欠缺清單。
- **05:30 起**：重新鎖定主控整合 SHA，在該 SHA 上集中測，不延用本初版快照數字。
- **06:40 前**：提交可重現的 blockers 和 go/no-go，附每項測試 commit、Node 版和命令。

> 此文件只存證；不要求主控覆蓋任何資料修改。
