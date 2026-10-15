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
| Node 執行實際結果 | **已於 GitHub Actions Node v22.23.3 執行**；詳下節固定 SHA 與 CI URL |
| 真機操作結果 | **not_run** |
| main merge / production deployment | **未執行，且禁止此工作線進行** |

## 驗收時點

- **02:00 前**：初版全卡覆蓋（腳本生成，固定輸入版本）與欠缺清單。
- **05:30 起**：重新鎖定主控整合 SHA，在該 SHA 上集中測，不延用本初版快照數字。
- **06:40 前**：提交可重現的 blockers 和 go/no-go，附每項測試 commit、Node 版和命令。

> 此文件只存證；不要求主控覆蓋任何資料修改。

## 02:00 初步固定驗收結果（執行證據，不混入後續 branch HEAD）

V2 固定來源仍為 `ad04bef572303e8af1084ae1fb5cb431af9e7a11`，本驗收器實際執行 SHA：
`3d10c19ce9262ecef005579341c4efd645f41195`；
Node `v22.23.3`；GitHub Actions：
https://github.com/will00t-debug/Ua/actions/runs/38610288617

| 驗收命令 | 實際結果 |
|---|---|
| `node --test tests/v2-independent-audit.test.mjs` | 4 / 4 pass |
| `node scripts/v2-audit-catalog.mjs` | 產生 5 系列逐卡 CSV 與 JSON；基底共 700 種一般卡 |
| `node scripts/v2-audit-match.mjs` | 4 / 4 all-real full games finished, all `endReason=life-zero`, `assertUniversalMatch` 通過 |
| `npm test` | 997 / 997 pass（全專案回歸，不是卡片完成率） |

種子及步數：747 → 122 步（TTG vs BLEACH、winner 1），
20261015 → 225 步（TTG vs BLEACH、winner 0），
20261016 → 228 步（BLEACH vs TTG、winner 1），
20261017 → 185 步（BLEACH vs TTG、winner 1）。
每場完整動作、牌組計數、牌數不變式、終局與命令儲存在 CI artifact。

**初版資料欄位注意**：最初的資料完整性守門對沒有印刷 BP 的 SLG 事件／場地卡 12 張誤標為缺 BP。此為驗收器的欄位分類問題，非卡片資訊缺漏。已在驗收器 commit `fb2909cc050850b9d494175ebb9944eacd414563` 針對非角色的 BP=null 改標 N/A；正式表採其後重產結果。其餘被標出的基底資料缺口為：BLEACH `BLC-4-082`, `BLC-4-083` 缺正式來源欄位；MST 12 張（010、011、013、015、019、023、044、045、061、064、078、079）仍有原來源卡片數值／驗證缺口。D 線新增的官方抄錄另算分支來源，未整合前不回填此固定基底統計。

### 分支候選版驗收：固定 SHA 各自測試，不可當成 PR #70 已整合

腳本：`node scripts/v2-audit-port-snapshots.mjs`。
Node v22.23.3，run：
https://github.com/will00t-debug/Ua/actions/runs/38610928612

| 系列工作線 | 固定檢查 commit | 可建立 V2 Pack | 專屬測試 |
|---|---|---|---|
| [V2-B] BLEACH | `6f873f1997a71bfeb0eb96c0e2bada2f7be6daac` | PASS，36 張（含原 Pilot 15） | 5 / 6 pass |
| [V2-C] TTG/SLG | `d80443365806dae0df89fc2fb03110604e706024` | PASS，TTG 23 張、SLG 16 張 | 此快照未新增專屬測試檔，not_run |
| [V2-D] SAO/MST | `1b74ba59bff89ae5ddcb4021103fe55a6789ee03` | PASS，SAO 22 張、MST 22 張 | 8 / 11 pass |

任何分支結果都僅為候選；各個 HEAD 會變動，未擅自視為整合成功。

#### 重現問題交付

- **E-B-001（測試情境缺陷）**：B `tests/universal-v2-bleach-port.test.mjs:98` 的「沒有其他可彈回低費角色」情境，在能源線放入 `BLC-2-023`（印刷能源需求 1），其實符合 `BLC-2-020` 的退回條件。預期 `pending=null`，實際出現 `effect-bounce-own` 且列出一個合法 UID。固定 B commit 下 `node --test tests/universal-v2-bleach-port.test.mjs` → 5 pass、1 fail。優先修改測試布置，不應直接改共用引擎。
- **E-D-001（測試 API 錯用 × 2）**：D 的 `tests/universal-v2-sao-port.test.mjs:50` 與 `tests/universal-v2-mst-port.test.mjs:50` 呼叫 `assert.match(...,'Unregistered')`，第二參數不是 RegExp，Node 22 報 `ERR_INVALID_ARG_TYPE`。改用 `/Unregistered/` 並重跑。
- **E-D-002（測試預期需核對）**：D `tests/universal-v2-mst-port.test.mjs:127`，`MST-1-034` 一次回復 AP 後預期仍有第二個 `effect-recover-ap` pending，實際已結束。測試僅提供一張可 REST 的 AP，應先確認是否還有第二合法目標才視為核心缺陷。
- **E-C-001（證據缺漏）**：C 固定快照可以建立 TTG/SLG V2 Packs，但沒有新增單卡專屬測試；須補非法選擇、支付、生命及跨作品可終局證據。

所有上述項目都有精確 commit、測試檔／行數、Node 版與命令。沒有修改 B/C/D 的核心或卡包。

### 需與主控交接的整合條件

1. 各系列新 Pack 應由主控在 **同一固定整合 SHA** 註冊到共用選牌與預覽入口後，才重新計入「整合可玩」。
2. 任何候選 Pack 只建立成功，不代表完整印刷能力、Raid/Trigger 及 FAQ 皆通過。
3. 無真機瀏覽器執行環境，手機觸控與窄螢幕實測仍 **not_run**。
4. 在 05:30 鎖定新的整合 SHA 重做完整測試；06:30～06:40 針對該 SHA 交付 P0/P1 阻塞與 go/no-go，不延用此 02:00 快照宣稱新版本已通過。


## 02:05 第二輪 [V2-B/C/D] Draft PR 快照：第一輪失敗已排除

**此段為新的獨立 SHA 快照，不覆寫上方第一輪的失敗歷史。**
已核對 Draft PR #73（B）、#72（C）、#74（D）的實際程式及其
`docs/v2-handoff/B-bleach.md`、`C-ttg-slg.md`、`D-sao-mst.md`。
測試入口：
`node scripts/v2-audit-port-snapshots.mjs --round2`，
CI https://github.com/will00t-debug/Ua/actions/runs/38611893908 ，Node `v22.23.3`；
驗收器 SHA `6434b4fc7c4ef13f859ac1fb0ea4745eafad6f22`。

| Draft PR | 固定分支 SHA | 實際 Pack 卡數（含 Pilot） | 專屬 Node 22 測試 |
|---|---|---:|---:|
| [V2-B] #73 | `5431cbb6ac422b7356fd688cc7f3a4d4756c4b39` | BLEACH **65** | **11/11 pass** |
| [V2-C] #72 | `341cd595d0291af5b5363ef9d08d41184ee29b87` | TTG **23**、SLG **18** | **11/11 pass** |
| [V2-D] #74 | `9d88fad89f2942c7c3905bce68c1ca3f92cba140` | SAO **33**、MST **22** | **15/15 pass** |

總共 **161 張分支候選卡**，跨各分支不得與基準 35 張重複累加；
排除底版 35 張已存在 Pilot，純新增候選為 126 張。此數字不是整合可玩／逐卡驗收完成率。
所有 161 張在 `audit/v2-branch-proposals-r2.csv` 逐卡記錄固定 SHA 與是否整合（**false**）；
各分支 raw pack probe、專測指令／結果位於 `audit/v2-port-snapshots-r2.json`。

- 第一輪 **E-B-001、E-D-001、E-D-002** 在新 SHA 的專測均無重現；
  **狀態：歷史固定 SHA 可重現、第二輪固定 SHA 測試通過**。
  不可用第二輪綠燈塗銷原始重播，也不能反過來把舊錯誤當成目前阻塞。
- **E-B-002 文件精度待同步**：在 B 固定 SHA，實際 `createBleachV2Pack()`
  有 **65** 種，但 `docs/v2-handoff/B-bleach.md` 當時仍寫 **63**；
  新增卡 `BLC-4-061`、`BLC-1-097` 未在那份 63 張總結同步反映。
  以實際 Pack 與精確 SHA 結果為準，請 B 工作線更新交接與逐卡表。
- **E-INTEGRATION-001（交付阻塞）**：PR #70 指定的初步 V2 基準只註冊
  35 張 Pilot，未包含三條分支獨立模組與共用預覽入口選牌；
  所有分支 Pack 在被主控合併到**同一個固定整合 SHA**、再次測試成功前，
  不得填為整合可玩。
- **E-QA-001（證據限制）**：37/37 專屬子測試只代表各分支當前聚焦情境，
  不等於 161 種卡逐張全部時機／FAQ／生命 Trigger 完整驗收。

### 四階段基底正式數字（非分支候選）

執行 `node scripts/v2-audit-catalog.mjs`，
CI https://github.com/will00t-debug/Ua/actions/runs/38611225934 ，
SHA `fb2909cc050850b9d494175ebb9944eacd414563`，Node `v22.23.3`：

| 系列 | 建檔 | 必要資料欄位齊全 | 此基底 V2 註冊 | 完整能力驗收 | 已證實整合全卡可玩 |
|---|---:|---:|---:|---:|---:|
| BLEACH | 276 | 274 | 15 | 0 | 0 |
| TTG | 81 | 81 | 20 | 0 | 0 |
| SLG | 80 | 80 | 0 | 0 | 0 |
| MST | 80 | 68 | 0 | 0 | 0 |
| SAO | 183 | 183 | 0 | 0 | 0 |
| **總計** | **700** | **686** | **35** | **0** | **0** |

`已證實整合全卡可玩` 是逐卡嚴格判準，不等於「現有 TTG/BLEACH 真卡牌組四場可完局」；
後者確有驗收紀錄，但原有 35 張的所有官方效果尚未逐張驗全。

### 不變式／時序測試交叉對照

以下均屬 `npm test`（同一 Node22 固定基底 CI 997/997 pass）的**已執行測例**，
覆蓋核心類型，不等於對 700 卡逐張完驗：

| 驗收主題 | 程式證據與示範案例 |
|---|---|
| 非法動作不得改狀態 | `tests/v2-independent-audit.test.mjs`（非法 UID rollback）；`tests/universal-v2-core.test.mjs`（嚴格合法性） |
| AP／能源支付與順序 | `tests/universal-v2-core.test.mjs`（AP/energy/placement）；`tests/universal-v2-paid-chain-multi-search.test.mjs`（discard gate / target→search→draw） |
| 可選放棄、Q99 | `tests/universal-v2-core.test.mjs`（GET / DRAW 可選與 FINAL）；`tests/universal-v2-search-recovery-cost.test.mjs`（optional shuffle/recovery） |
| 滿場替換 / AP 不先扣 | `tests/universal-v2-special-color-raid.test.mjs`（full front / protected full energy replacement） |
| Raid / Raid life / chain | `tests/universal-v2-special-color-raid.test.mjs`（Q2396/Q2286）；`tests/universal-v2-raid-protection-attack-queue.test.mjs` |
| Life Trigger 與 nested 決策 | `tests/universal-v2-special-color-raid.test.mjs`（SPECIAL/COLOR/RAID nested）；`tests/universal-v2-bleach-real-deck.test.mjs` |
| 回合交接、手牌上限、STEP | `tests/universal-v2-core.test.mjs`；`tests/universal-v2-cross-title.test.mjs` |
| 實體卡守恆 | `tests/universal-v2-cross-title.test.mjs`；全真卡多 seed 完局腳本各步 `assertUniversalMatch` |
| 隱藏資訊 | `tests/universal-v2-preview-ui.test.mjs`（僅 DOM/呈現層單測）；`tests/v2-independent-audit.test.mjs`；多 seed public view 檢查 |

**尚未實測**：真人實體 Android/iOS 觸控、手機縮放、私人預覽真實瀏覽器操作；
DOM 模擬已跑不取代實機。截止交付不得標 pass。

