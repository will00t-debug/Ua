# [V2-A] 共用核心與五作品整合交接（2026-10-15，台灣）

此檔為主控在 **PR #70 / `feature/universal-rules-v2-foundation-20261014`** 的**目前完成成果**，不是早期 06:30 快照。核對開發規範：AGENTS.md；不碰 main、不部署正式網站。每次驗證請釘住新的 HEAD，禁止混加不同時間的卡數或借用舊版 CI。

## 当前主控 HEAD
`92874513dde0231a6a9e317296013b8a7e48bf9a`

### GitHub 受控整合記錄
- [V2-E] 舊一輪 audit-only 工具曾以 pinned-source tree 保留於主控（舊文內 35 Pilot 為**歷史快照**，不可用作現值）。
- [V2-B] PR #73／來源 `166ec22edc393ed7fd47e6928eb27ec77907d8b9` → 主控受控整合 `6354ff965056ebc5c9f2b86e981b43a366b08ed1`；只採 BLEACH 工人檔與專測。
- [V2-C] PR #72／來源 `a8ed77eb795f3578fbd79af44d9652cabfa62326` → `a0bbba2b5a025d130582d7280726b536859b25f9`；只採 TTG、SLG 專屬檔及各自 QA。
- [V2-D] PR #74／來源 `a22aae190df206c5bd4f0d39ade190e1d8a71b42` → `ebfdadc8a22c4943795a09c5b47953c3e8f23018`；只採 SAO/MST 專屬檔、MST 完整官方原文複製、全真卡牌組及 QA。
- 各來源 PR 仍保留 Draft；**不是將 PR #71～#74 合併 main**，也沒有 force push。主控之後的新核心補丁沒有回寫各工人的獨立分支。

## 單一 V2 registry 最新卡數（不含異圖/AP）

| 作品 | 官方一般卡 | 舊 Pilot | 本次新貢獻 | 正式 V2 registry | 未移植 | 全效果 FAQ 終驗 |
|---|---:|---:|---:|---:|---:|---:|
| BLEACH | 276 | 15 | 56 | **71** | 205 | 0 |
| TTG | 81 | 20 | 3 | **23** | 58 | 0 |
| SLG | 80 | 0 | 18 | **18** | 62 | 0 |
| SAO | 183 | 0 | 39 | **39** | 144 | 0 |
| MST | 80 | 0 | 23 | **23** | 57 | 0 |
| **總計** | **700** | **35** | **139** | **174** | **526** | **0** |

- 除了原兩組 Pilot 全真卡牌組，新私人預覽現在可選擇 **BLEACH 紫／綠、TTG 紅、SLG、SAO、MST** 共六組 50 張真卡 V2 牌組，雙方可自由搭配。同一 reducer，不轉呼叫舊作品引擎。
- 完整剩餘 **526 張真實卡號**：[`docs/V2_UNPORTED_IDS_526.md`](../V2_UNPORTED_IDS_526.md)，亦可在當前 commit 執行 `node scripts/v2-unported-report.mjs` 重新比對。
- MST 完整 80 張官方日文印刷元資料改由 `dist/universal-v2/sources/mst-inventory.mjs` 讀取；**不修改**舊主線含 12 個占位的 `dist/mushoku-tensei.mjs`。
- 各來源記錄 `sourceRecord/definition/evidence` 經 `contract.mjs` 比較數值、印刷卡號、文本錨點、測試路徑、DSL/vanilla proof；`tests/fixtures/v2-integrated-id-manifest.mjs` 維持**明確的 139 個新增卡號清冊**，不是動態計數讓缺卡蒙混過關。

## 修復後的核心驗證（主控 V2 HEAD）

1. Once-per-turn 測試原來從 **hand** 重複抽到同一張 UID，未真的預載第二／第三實體卡。現在測試準備依卡號和 UID 確保 3 張 K01／2 張 K02 不重複；真實牌庫張數與 `initialCounts` 守恆，拒絕不消耗名義限次，真正使用會消耗，回合末若手牌超過 8 張**必須依法處理** `chooseHandLimit` 才會輪替。引擎限次行為未用修改斷言掩蓋。
2. AI 阻擋 BP 相等時會被擊敗，正常／困難 AI 現在用嚴格 BP 大於判斷存活；新增同值、較高值、瀕死三個回歸。
3. 通用 `buffOwnField` 指定自己場上合法角色、可排除自身並作本回合 BP 修正；實際成本可由 `payDiscardThen` 閘門暫停接續，目標合法性、對手 UID 隱私與原子支付均有 QA。
4. `oncePerTurnThen` 以實體 UID 或同名共享記帳，真正付出發動決定才消耗限次；禁止巢狀無審核 gate。
5. `restEnemyUnderBp` 已可指定 `optional:false` 強制選擇／`optional:true` 可放棄，待選期間不得先抽後續卡；有目標時禁止 null 選項，無合法目標不產生虛構對象。

### 真正執行的 Node 22 GitHub Actions 證據
- 五作共用 Node `npm test`：**1112／1112 passed, 0 failed**，commit `89216b4506d82083728809343afaf6e900fdd818`，<https://github.com/will00t-debug/Ua/actions/runs/38676003862>。
- 五作品實際整合跨作品真卡全局矩陣：**60／60 完整對局**（10 作品兩兩配對 × 2 種先手 × 3 種固定 seed），每步驗證合法 AI 操作、週期 UID 守恆與真實勝負；CI `#38676228357`，<https://github.com/will00t-debug/Ua/actions/runs/38676228357>，commit `92874513dde0231a6a9e317296013b8a7e48bf9a`。結果已於 GitHub Actions Artifact `v2-integrated-five-title-matrix` 保留 JSON。**60 局不等於逐卡 700 張全效果/FAQ 驗收。**
- 上述成功是**各自固定 SHA** 的結果；本交接文件更新後會再由 CI 驗證最新 SHA。不把工人 branch 的歷史失敗或歷史測試數當成當前結果。

## 尚未解鎖的 P0（按可受益卡數優先）

1. **精確一般成本與指定支付**：可指定 AP 卡／可選擇多張手牌及場外→移除真實成本、連鎖支付後效應／事件合法空目標條件。
2. **Raid 與連鎖離場**：多層 Raid、底板重建及已存在牌序／NAME 適配、合法移動/替換與後續佇列（TTG 027/031/032/061/062/073/074 等）。
3. **常駐來源綁定效果**：按印刷狀態動態 BP/能源與免疫，不等同一回合拍照 Buff；技能歸屬與同名限制（BLC-4-065/068）。
4. **觸發與延遲效果**：場外加入手牌引發的來源判定與免費 REST 能源線登場（SLG-1-014／Q2025）、攻擊結束後與回合結束後退場、真生命 Trigger 各種替代時序。
5. **牌頂處理、複合目標與序列**：多張依任意排列置頂/底、可送多張場外（BLC-4-013）、任意敵方前線強制 REST（BLC-1-030，日官沒有 BP 門檻，不能把 BP 3000 模板硬套）、各作品特徵含複合別名的篩選。

## 下輪 B/C/D/E 交接建議
- B/C/D 先 `git fetch` 主控分支並核對本檔與最新 registry／ABI 後，在**自己的分支**移植更多真卡；只改自己原本主權的 title-pack/獨立 pack 和專測，勿越權修改核心、總清冊或共用 HTML。
- 遇到尚無精確通用能力的印刷卡，在 PR #70 留 `[V2-CORE-REQ]` + 官方網址、FAQ、合法動作與反例，不要用近似 DSL 假裝。
- E 應從**此整合 HEAD**重新跑同一 SHA 的全部測試及 60 局矩陣，更新可玩預覽的真實瀏覽器步驟；E 原 `docs/v2-handoff/E-acceptance.md` 對 35 卡／未整合等敘述是**歷史**，不能當成現在 NO-GO 的定論。
- 手機瀏覽器真機、遠端 Vercel 私人 preview 通用互動與 700 張每張完整效果仍**未全面驗收**；現階段只稱「五作品少部分實卡可玩版」，不以通過率推導全部卡進度。
