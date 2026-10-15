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


---
## [V2-E] 2026-10-15 第二輪獨立驗收（重新固定 SHA；此段為現行檢查結果）

不得沿用 06:30 舊快照判定。此回合 Node v22.23.3 的 GitHub Actions： https://github.com/will00t-debug/Ua/actions/runs/38672351840 。執行指令：node scripts/v2-e-round2.mjs （在四份 exact-SHA detach worktrees 執行；核心原版單獨執行 npm test；所有 runner output/replay 在 CI artifact audit/v2-e-round2/）。

| PR / 範圍 | 固定 SHA |
|---|---|
| #70 主控 A | 25eeac5084917534193fd9feaeae31672f902e78 |
| #73 BLEACH B | dfdf1996706b61ef5f8c307bd786f7b8260abd8c |
| #72 TTG/SLG C | bfb79970effd6095862dd837333da9cb58a8e977 |
| #74 SAO/MST D | 3a119bf73bbfb103e850d779923212c9dcdcf162 |
| #71 驗收測試 | 20656f90139868495991a27bd6b791d28d1c6312（該次已通過的第二輪測試原始 SHA） |

### 原核心限次失敗：測試準備器錯誤，不應修改 engine 來掩蓋

- 固定 A 的 npm test：**1013/1015 pass**，原 test/universal-v2-once-per-turn-gate.test.mjs **2/4 pass**。這兩項 failure 仍阻塞 CI 綠燈；不可只修改斷言。
- 另以相同 A engine、獨立測試 audit-tests/v2-e-once-fixture-independent.test.mjs + audit-tests/v2-e-contract-regression.test.mjs：**6/6 pass**；驗證預留不同 UID 的實體卡才從現有手牌支付登場、初始化牌庫張數、選擇 skip 不記同名限次、activate 恰好抽一、第三張同名不再抽，且不同 UID 各觸發、非法模式不改源狀態、assertUniversalMatch 守恆。
- 原測試 ready() 內 take() 搜尋 hand→deck→life→outside，緊接 hand.push；這個 preload 可能反覆取回同一手牌 UID。後續 play() 又 take()，有時需要從 deck 補入卡以致 deck.length 改變，但該次不是效果抽牌。新測試反例已證明：不計入 deck 假移除，放棄效果不抽牌。修正準備器需在手牌實際保留不同 UID，play 必須用已預留在手牌的同張實體。

### A Registry 與 B/C/D 候選（同一 SHA 內統計，不能混加成整合）

| 系列 | 已建檔 | A Registry 已移植 | B/C/D 建構的候選 Pack 獨特 ID（含 Pilot） | 嚴格逐能力 FAQ/Trigger 全部驗收 |
|---|---:|---:|---:|---:|
| BLEACH | 276 | 15 | 71 | 0 |
| 天元 TTG | 81 | 20 | 23 | 0 |
| 獨自升級 SLG | 80 | 0 | 18 | 0 |
| 刀劍 SAO | 183 | 0 | 33 | 0 |
| 無職 MST | 80 | 0 | 22 | 0 |
| **合計** | **700** | **35** | **167** | **0** |

候選 167 按作品+卡號去重無重複，其中 A 已有 BLEACH 15 + TTG 20；實際**新增而尚未進 A Registry 為 132**。A 的五個 title-packs/{bleach,ttg,slg,sao,mst}.mjs contribution.entries 在固定 SHA 全空。不得宣稱 167 張已進 PR70 或五作品 UI。

D 的 dist/universal-v2/sources/mst-official-print.mjs、mst-catalog.mjs 按 D 固定 SHA 執行證實 **80/80 官方日文印刷來源完整，資料 incomplete=[]**；A 的舊 dist/mushoku-tensei.mjs 尚有 12 張 placeholder 是**來源未整合造成版本差異**，不能再宣稱 D 現行 MST 缺 12 張。D V2 Pack 真正移植 22 張，官方資料 80 不等於 V2 效果全能用。

### 專屬測試與 5×5 雙向對局

B 專測 15/15、C 21/21、D 15/15 pass；各在自己 SHA 下 Node 22 跑。scratch worktree 使用 A 共用引擎配合 B/C/D 固定檔案**暫存**組合，完成不同作品兩兩 10 組 × 2 種先手 × seed 747/20261015/20261016，共 **60/60 個 finished 終局**。每場只使用 50 張同作品真實卡、每卡號 <=4、各種限制 Trigger <=4，記錄每個合法 action、seed、endReason、UID 守恆及 public hand 遮蔽；未終局不能算成功，完整 60 份 JSON 在 CI artifact 的 scratch-matches。依日本官方 FAQ Q8 混色同作品牌組合法，但不代表這些是競技牌組。**暫存結果不得替代 PR #70 真正整合全局。**

### 契約稽核和 UI 限制

新增 contracts 負面測試：缺卡號、duplicate、source domain 異常、印刷成本/Trigger 漂移、未實作 DSL 均拒絕；惟錯誤的官方樣式 URL（指向另一卡）和根本不存在的 tests/ 路徑，目前僅看字串格式就能通過，vanilla 的已驗證宣稱可自述。這是 P1：應在契約驗收附不可變 ID manifest 與真實來源/測試檔及完整效果比對，禁止單靠動態總數／verifiedNoExtraEffects 當作證據。

PR #70 私人預覽 HTML 當前只有 BLEACH 與 TTG 的兩個固定 50 張選項，沒有五作品選牌及自由組牌入口；existing preview-ui tests 只屬 Node DOM/靜態規則級測試。真正 Android/iOS 裝置操作仍 not_run，Chromium 手機尺寸模擬須分開標示。

### P0 / P1 與交付判定

- **P0 A once 原測試仍紅**：屬可重現 fixture 測試布置問題；主控要修 distinct UID fixture，不應改 engine 或抹去原斷言。
- **P0 五作品尚未整合**：132 新增候選尚未進 PR70 固定 Registry，預覽仍兩作品；未取得 A 新交付整合 commit。
- **P0 所有能力驗收缺證**：全部 700 卡的主動/被動、Raid、生命 Trigger、可選、時序與 FAQ 不能從局數推出完成。
- **P1 契約**：自稱的官方網址與 QA 測試檔沒有實際 verify。
- **P1 介面**：未實測真手機；完整五作品選牌→組牌→效果操作→終局的網站端到端未測。

**NO-GO：不可交付五作品私人測試網站。** 可展示 A 既有兩系列部分 Pilot 網頁與 60 場 scratch 診斷，但不可冒稱完整整合。此驗收僅修改 E 自己的 audit-tests、scripts、E-acceptance.md 與 CI；不改任何共用核心、系列卡包，不合併 main、不部署正式站。

### 第二輪最終補充：Node 22、完整候選指紋與真正 Chromium 手機版面終局

- **固定驗收器 commit**：`dbc335164dca60b35179e412394973206c41bd96`；此 commit 實際 Node `v22.23.3` CI：https://github.com/will00t-debug/Ua/actions/runs/38673107165 ，工作流程 `V2-E Round 2 Pinned Verification`。該 workflow 自己成功，**不表示被驗收的 A 原始 npm test 全綠**；原始 A 仍 **1013/1015**，相同 A 核心的新 E 獨立測試 **6/6**。
- **防動態計數掩飾錯誤**：167 張候選的固定「title/id」排序集合 SHA-256 = `6f186ebea0b0369b898b0aa27df30dfc99c6fa97ced1338c52961dca76eaeb66`。腳本有明文不變的 expected hash，同一組 B/C/D SHA 重算 actual 完全相符；若將來缺卡、取代卡、重複 title/ID 或偷加新卡，即使 167 總數不變，digest 也會阻止當作本快照通過。精確 manifest 在 `audit/v2-e-round2/candidates.csv`。
- **真實桌面 Chrome 手機視窗尺寸模擬：已測並完成一場**。同一 A 固定 SHA 用 CI runner 的 `google-chrome` CDP 啟動 390×844 / DPR3 viewport、touch emulation，檢查無 document 水平超界（bodyWidth=390）、BLEACH vs TTG 選擇及 seed 20261015 開局、24 次 next、16 次真 UI pending 選擇、終局畫面顯示，共計 **41 個控制器循環**，`finished=true`、`error=''`、JavaScript exceptions 為空，保留實際瀏覽器 screenshot 與 `browser-report.json`。**它是桌面 Chrome 手機尺寸/觸控模擬，非實體 Android/iPhone 真機**。也只測 PR70 現有兩作品／固定牌組，非五作品、非自由組牌 UI 完成。
- **scratch 五作品**仍是 10 配對×2 先手×3 seeds（747/20261015/20261016）= **60/60 finished**，全部實際 action＋終局 JSON 在 artifact `scratch-matches/`；未將候選寫進 PR #70。

**本輪結論維持五作品私人測試版 NO-GO**。但 BLEACH/TTG 舊預覽在這一個 desktop-Chromium 390px 路徑已能從作品選擇→開局→多次 pending 選擇→終局；真手機 still not_run。後續 A 提交五作品整合 SHA 才能依新 SHA 重跑五作品 Registry、同版 60 場及五作品瀏覽器 E2E，不可沿用本次任何跨 SHA 數據。全程沒有更動共用引擎、系列 Pack、main 或 production。

---
## 第三輪最新實測：固定 PR #70 `75468867`／五作品已整合 181（2026-10-15 台灣）

> **本節取代上方「僅 35/167」「整合 175」「核心 once 限次回歸紅燈」「五作品不可選」等歷史敘述作為目前判定。** 以上舊報告保留追溯，切勿再引用為現況。本節以固定完整 SHA 實測，不將候選分支計入主線。

### 來源釘選、執行版與獨立證據

| 範圍 | 精確提交 |
|---|---|
| A 主控 PR #70：整合可測基準 | `75468867b7ec4f5cdd78661e5b98f400494fb94d` |
| B PR #73：隔離候選快照 | `2a502f01ec1e29a98c44e45e12f4aaa5a9753222` |
| C PR #72：隔離候選快照 | `979eed8530721fae53c63201e033a5297464c853` |
| D PR #74：隔離候選快照 | `efa367fc99c4afdd4dd9edfeddae1a736afb5333` |

1. **A 固定相同 SHA 正式 Node v22.23.3 回歸 1143/1143 全過**：[run #38694133956](https://github.com/will00t-debug/Ua/actions/runs/38694133956)，執行 `npm test`。同 SHA 60/60 五系列合法各 50 張真卡跨作品完整 AI 終局：[run #38694131961](https://github.com/will00t-debug/Ua/actions/runs/38694131961)，`node scripts/v2-integrated-match-matrix.mjs`；兩者為 A 已完成證據，**E 此輪沒有無變更重跑同樣 60 局**。
2. **第三輪 E 新增獨立反例**：`node scripts/v2-e-round3.mjs`，在 A/B/C/D 各自 `git worktree add --detach <SHA>` 上執行；Node `v22.23.3`，從 E 的 `audit-tests/v2-e-round3-branches.test.mjs` 複製全新獨立測試至固定 A 執行 `node --test tests/v2-e-round3-branches.test.mjs`，**7/7 通過**；有 JSON、log、全部卡號清冊及 Chromium 截圖。完整 GitHub Actions run（相同 A / B / C / D SHAs）[第三輪 E CI #38703740095](https://github.com/will00t-debug/Ua/actions/runs/38703740095)，該批 E runner commit `f6467409bf0927da4048411c268988212a34e974`。
3. E runner **只新增針對性驗收，不重複舊 60 局**。早期幾次 E 紅燈屬自家測試布置：卡片未加入牌組／黃色產能不足、私密牌頂原子 pending 尚未結束就誤認已移至場外，以及 Chromium 臨時 profile 清理競態。已保留 log、精確修正 E fixture；在 #38703740095 皆為 7/7 綠、browser pass。沒有更動共用引擎。

### 嚴格分層：實際來源、Registry 與專屬候選

| 作品 | 已建檔一般卡 | **A 目前整合/移植** | 同期 B/C/D 獨立已移植（含 A 卡） | **未整合新增候選卡數** | 全印刷能力/FAQ/Trigger 正式完成認證 |
|---|---:|---:|---:|---:|---:|
| BLEACH | 276 | **78** | **79** | 1 | 0 |
| 天元 TTG | 81 | **23** | **24** | 1 | 0 |
| 我獨自升級 SLG | 80 | **18** | **18** | 0 | 0 |
| 刀劍 SAO | 183 | **39** | **47** | 8 | 0 |
| 無職 MST | 80 | **23** | **24** | 1 | 0 |
| **總計** | **700** | **181** | **192** | **11** | **0** |

A 的 181 組 identity 在固定 SHA 逐一由 `registeredV2TitlePack()` 與 `tests/fixtures/v2-integrated-id-manifest.mjs` 鎖定，source inventory **700**、未移植 **519**。當前已進 A 的 6 張 BLEACH：`BLC-1-059`、`BLC-1-077`、`BLC-2-055`、`BLC-3-006`、`BLC-3-009`、`BLC-4-013`，不能還當成 B-only；A 原 Pilot 35 已包含於 181。**移植與已整合不等於全部能力驗收**。私人預覽共 6 組官方 50 張可選預設牌組，但沒有經 E 證明的自由組牌編輯器。

正式 A 尚未整合的精確 **11 張（各獨立 SHA 實際 Pack ID 與 A Registry 差集）**：

- **責任線 B／PR #73（1）：** `BLC-4-023`。官方藍色0費普通角色，登場可選其他己方角色 BP+1000；Life DRAW，雙能力必須分別測。B 固定 SHA 的 `node --test tests/universal-v2-bleach-own-buff.test.mjs` **6/6 通過**，僅 B candidate，未經 A 新整合 commit QA。
- **責任線 C／PR #72（1）：** `TTG-1-077`。登場從 own outside 最多回收1個ガンメン特徵真 UID，可不選，實際 AP/紅能源與非法跨區目標；C 固定 SHA 的 `node --test tests/universal-v2-ttg-port.test.mjs` **13/13 通過**，包含其他 TTG 先前測例。尚未進 A。
- **責任線 D／PR #74 SAO（8）：** `SAO-1-032`、`SAO-1-063`、`SAO-1-098`、`SAO-1-107`、`SAO-2-017`、`SAO-2-030`、`SAO-2-057`、`SAO-2-072`。
- **責任線 D／PR #74 MST（1）：** `MST-1-010`。在 D 固定 SHA 跑 `node --test tests/v2-sao-mst-draw-top-batches.test.mjs` **5/5 通過**：SAO-1-107 抽3棄1 且 AP2、SAO-2-017/030 私密看頂兩張任意送場外、SAO-2-072 頂/底、MST-1-010 私密看頂三張任意排序，及四張 SAO FINAL 恢復 AP 的支付/可放棄/UID。該測試涵蓋所列九張的典型分支，但不代表九張全部 FAQ / Life 正反例全部終驗。

候選共 **192 個同作品-卡號唯一 identity**（A 已整合181 + B/C/D 新11）；每行精確候選與未整合差集，請查看第三輪 CI artifact 中 `a-manifest.log`、`b-candidate.log`、`c-candidate.log`、`d-candidate.log`、`report.json`。A 上游如新增一批，必須重新固定**整合 SHA**跑 E 第三輪反例及新增卡真實 Registry / Life 判定，不可將 B/C/D 隔離測試直接算主線成功。

### 新增 7 個真正不同的測試分支（不是固定 seed 鏡像）

| 實際官方卡或流程 | 透過獨立 oracle 檢查的輸入 / 預期與拒絕條件 | 結果 |
|---|---|---|
| BLEACH `BLC-2-055` | 印刷 TOP 保留原牌庫 UID 順序、BOTTOM 輪轉至最底；不能 OUTSIDE、不能由錯誤玩家選；兩種結果都不得揭露對手私密 UID | PASS |
| BLEACH `BLC-4-013` × MST | 私密頂2任意送外，**選完才原子結算**；不允許使用對手 UID / 非查看範圍 UID / 連續重複 UID；AP 不二次支付、完成後場外/UID 守恆 | PASS |
| SLG `SLG-1-040` × BLEACH | 生命 SPECIAL 可放棄、不得虛構 enemy target、指定真角色可直接退場且不扣玩家 AP；牌物理 UID 守恆 | PASS |
| BLEACH `BLC-1-030` × MST | 官方 Q1119 必選1，無敵前線合法目標時連支付事件/AP 都不准；依 Q91 已 REST 的敵方仍可合法指定，選 null 必拒 | PASS |
| 各系列 Registry | 700 來源、181 身份、固定 manifest 新六卡及其當前已整合狀態，不能動態靠總數掩蓋身份取代 | PASS |
| 公開視圖／Debug Replay | 只有己方能看私密牌頂；公開 AI 文字不得洩露 private UID；偽造 replay 行為 fail-closed | PASS |
| 未整合的身份 | A 固定 SHA 必須拒絕 `BLC-4-023` 和 `TTG-1-077`，不可從其他工作分支偷算到整合 | PASS |

本輪增量 E 真正執行的獨立測試 **7/7**；另外 B **6/6**、C **13/13**、D **5/5** 分支局部證據；測試總數並不等於卡號完整驗收數。未另完整驗完其餘 181 張的每個條件、Raid、生命 Trigger、付費、任意選擇及 FAQ，嚴格完整認證仍記0。

### 真正 Chromium UI 六牌組與同版新 seed 開局至終局（非真人手機）

- E 在 **同一 A 固定 SHA** 使用 Node22 CI runner 啟動 `google-chrome --headless=new` 及 DevTools CDP、**390×844 / DPR3 / touch emulation**，由真實 UI 的 `<select>` 操作六個官方 50 張預設（BLEACH 紫、綠，TTG 紅、SLG、SAO、MST）各自按「開始新對局」並確認顯示可操作手牌；另測一次 AI 先手。
- 使用**非前次矩陣的 seed `314159`** 由玩家 `solo-leveling` vs AI `sword-art-online`：經真 UI 执行操作 **84 controller cycles**（其中能源線普通登場 **11** 次、`pending` 選擇 **13** 次、階段 next **24** 次、查看全部合法操作 **35** 次）、最終 UI `finished=true`，沒有 JS exceptions／error，也沒有水平 overflow（viewport=bodyWidth=390）；`browser/browser-report.json`、`chromium-mobile-390.png` 與 log 在 CI artifact。
- 此為**桌面 Chrome 模擬手機尺寸**，**不是 Android/iOS 真人裝置實測**，也不是在 Vercel 私人網址登入後的真機實測。六副**預設牌組**可選不表示自訂建構完整50張 UI 可用；沒有部署正式站。

### 交付與下一輪 Gate

**目前對「指定 181 張 Registry + 六個現有預設牌組的受控 V2 私人測試」可有條件 GO：** A 的相同 SHA 1143/1143 與 60/60 完局證據都綠，E 的新增7/7、B/C/D 分支隔離試與 Chromium 五作品六預設新seed UI 終局也通過。但此條件僅指本地/私人測試來源具備可用的實作片段；**尚未驗證私人部署網址可供手機真人登入開啟**。

**對「全700普通卡統一引擎均有完全印刷能力 / FAQ 與跨作品實戰」明確 NO-GO**：519 種仍未移植、全181張完整印刷分支尚無逐卡結案、11 種新候選沒有被 A 接入；實機手機、真人互動、自由自訂牌組與所有特殊時序尚未驗收。P0（全卡目標）是缺口 519 與尚待 A 收11卡和真實新 SHA CI；P1 是完整 FAQ、私人部署端點與真機 UI、source-provenance 守門加強。**本次獨立反例沒有在被測 A 固定 SHA 發現可重現的 engine P0 錯誤；最初 E false-red 由 E fixture/Chrome 臨時目錄清理錯誤造成，均已修復，不交錯歸咎 A。**

依需求只提交 E 自己的測試、CI、紀錄，不改 `dist/universal-v2/engine.mjs`、B/C/D 定義／核心、main 或 Production；A 後續若新增任何 core/registry SHA，E 重新鎖定而不是沿用本批綠燈。
