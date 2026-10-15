# [V2-C] 天元突破 TTG-1 ＋ 我獨自升級 SLG-1 交接

## CURSOR 接手專用最終交接 — 2026-10-15 19:21（台灣時間；本節優先於下方歷史內容）

> **STOP / HANDOFF ONLY / WIP**：使用者已要求 ChatGPT 停止新增開發。本節只保存交接，沒有新增卡牌、改動任何引擎或共享測試、合併 main、部署正式站或改寫 PR #70。未完成卡牌一律 `not_ported` / **WIP**，嚴禁以空效果、auto flag 或舊 reducer 冒充 V2。
>
> **Cursor 真正工作起點**：`git fetch origin` 後切到 `feature/v2-ttg-slg-port-20261015`、執行 `git rev-parse HEAD`，以 **PR #72 當前 HEAD** 作最後交接提交 SHA；**本次交接前最後一次程式碼／核心整合 SHA** 為 `29ddd3ffdc5379584923539a8323ee7ec09d6add`。本節的文件提交會得到更新的 SHA，因此切勿把 `29ddd3ffdc5379584923539a8323ee7ec09d6add` 誤認為最後的「文件交接」commit。可於 [PR #72](https://github.com/will00t-debug/Ua/pull/72) 與本輪最終 GitHub PR 留言核對完整新 SHA。

### Git 範圍、分支及可靠基線

| 類別 | 實際分支 / commit / 說明 |
|---|---|
| C 唯一寫入分支 | `feature/v2-ttg-slg-port-20261015` ([Draft PR #72](https://github.com/will00t-debug/Ua/pull/72)) |
| C 交接前最新 HEAD（程式碼與核心合流） | `29ddd3ffdc5379584923539a8323ee7ec09d6add`，雙親保留 C 前一輪 `979eed8530721fae53c63201e033a5297464c853` 與 A 修復核心 `75468867b7ec4f5cdd78661e5b98f400494fb94d` |
| A 主控／共同核心 | `feature/universal-rules-v2-foundation-20261014` ([Draft PR #70](https://github.com/will00t-debug/Ua/pull/70))，檢查時 HEAD `75468867b7ec4f5cdd78661e5b98f400494fb94d`；`docs/v2-handoff/A-core.md` 可讀，但早期歷史 SHA 非當前 HEAD |
| main／Production | **完全未修改／未合併／未部署**，請維持 Draft；不要從 C 修改 A 的核心檔 |

**保存狀態**：截至本次核對，所有可由 GitHub 確認的 C 修改已在 `29ddd3ffdc5379584923539a8323ee7ec09d6add` 所屬 PR #72 分支提交及推送；此次僅需推送本 handoff 文件。GitHub 只能檢查遠端受版本管理的內容，無法替 Cursor 保證使用者電腦上的本地未提交變更；Cursor 接手應先執行 `git status --short` 及 `git log --oneline -n 8`，不要直接覆寫本地修改。

### 已完成的成果（不是 WIP 卡）

- 已在 PR #72 真實 V2 registry 接入 **TTG 24/81**：原 Pilot 20 + 已納入 A 的 C 三張 `TTG-1-005`、`TTG-1-014`、`TTG-1-019` + **僅 PR #72** 的新增 `TTG-1-077`；剩 **57** 張未移植。
- 已在 PR #70／#72 接入 **SLG 18/80**：`SLG-1-005, SLG-1-006, SLG-1-015, SLG-1-016, SLG-1-026, SLG-1-032, SLG-1-038, SLG-1-040, SLG-1-041, SLG-1-043, SLG-1-045, SLG-1-052, SLG-1-055, SLG-1-066, SLG-1-068, SLG-1-076, SLG-1-078, SLG-1-079`；本輪 SLG 沒新增真卡，剩 **62** 張未移植。
- `TTG-1-077` 已提交共用 V2 DSL 的 `recoverOutsideOne`：官方 UA56BT 綠／紅（以卡表印刷欄位為準）的**紅色**、需求能源4、AP1 場域，onPlay 從**己方場外**選至多一張具有「ガンメン」特徵的卡回手（可選0），生命 Trigger 無；非己方場外、錯誤特徵、非法選擇必須拒絕。以該卡已驗證原始斜線複合特徵作 V2 局部正規化，sourceRecord 保留原始來源。來源 [UA56BT/TTG-1-077](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-077)。
- 現有 C 專屬測試覆蓋 registry card-ID 精確集合／20 Pilot 不重複、50 張合法雙系列牌組、共同 V2 引擎回合交接、生命 DRAW/GET/ACTIVE/SPECIAL、回手與回收合法 UID、場外選擇與 AP／實體守恆；**不等於全部官方 FAQ 終驗**。TTG/SLG 的 Body 與 Life 狀態分開記錄。
- C 現有提交內容及所有前輪歷史可從 PR #72 Git log 回溯；重要最近提交有 `29ddd3ffdc5379584923539a8323ee7ec09d6add`（安全與 A core 合流）、`979eed8530721fae53c63201e033a5297464c853`（TTG077、C 測試與卡號稽核保全）、`3738f56b7e14496e5232271157e2a6c42969e4fb`（早前共同核心雙親整合）。

### 實際執行過的測試、精確 SHA 與結果

| 分支／commit | 真正跑過的測試 | 結果與證據 |
|---|---|---|
| A：`75468867b7ec4f5cdd78661e5b98f400494fb94d` | Node22 `npm test` | **1143/1143 PASS、0 FAIL**；[Actions #38694133956](https://github.com/will00t-debug/Ua/actions/runs/38694133956) |
| A：相同 `75468867b7ec4f5cdd78661e5b98f400494fb94d` | 五作品真實50張牌組矩陣 | **60/60 finished、0 fail**；[Actions #38694131961](https://github.com/will00t-debug/Ua/actions/runs/38694131961) |
| C：`29ddd3ffdc5379584923539a8323ee7ec09d6add` | Node22 C-only 專測 | **32/32 PASS、0 FAIL**；[Actions #38703884418](https://github.com/will00t-debug/Ua/actions/runs/38703884418) |
| C：相同 `29ddd3ffdc5379584923539a8323ee7ec09d6add` | Node22 `npm test` | **1146/1148 PASS、2 FAIL**（僅 A 擁有的 `tests/universal-v2-title-pack-contract.test.mjs`：固定來源卡號清冊、inventory 卡數未含 TTG077）；同一 [Actions #38703884418](https://github.com/will00t-debug/Ua/actions/runs/38703884418) |

**不要把 A 的 1143/1143 與 60/60 誤認成 C 含 TTG077 已全綠，也不要把 2 項共用失敗當成 C 的新效果測試失敗。** 交接文件自身新 commit 如引發 CI，要檢查該 SHA 對應的 run，不能提前宣稱通過；本輪沒有額外手動反覆重跑已知共用失敗。

### 尚未被 A 合入的確切變更（WIP integration，不是遺失）

截至最後核對，從 A HEAD `75468867b7ec4f5cdd78661e5b98f400494fb94d` 比到 C HEAD `29ddd3ffdc5379584923539a8323ee7ec09d6add` 的**實際 blob 差異精確是七個 C 專屬檔案**：

1. `dist/universal-v2/ttg-pack.mjs`：**TTG-1-077** 四號 C addon 的完整 DSL 與特殊複合特徵來源指紋。
2. `dist/universal-v2/title-packs/ttg.mjs`：第四張 `TTG-1-077` 官方卡面證據、review note 與貢獻版本。
3. `tests/universal-v2-ttg-port.test.mjs`：TTG24、077 正反例、TTG010/023 WIP fail-closed。
4. `tests/universal-v2-slg-port.test.mjs`：精確 PR70/PR72 所有權及 SLG036/037 WIP fail-closed。
5. `audit/v2-c-ttg-status.csv`：原20 Pilot／已在 A 的3張／PR72 專有077／57 WIP 分類。
6. `audit/v2-c-slg-status.csv`：已在 A 的18張／62 WIP 與生命 Trigger 分類。
7. `docs/v2-handoff/C-ttg-slg.md`：所有近期整合與 Cursor 接手資訊。

其餘 C 擁有的 `dist/universal-v2/slg-pack.mjs`、`dist/universal-v2/title-packs/slg.mjs`、`.github/workflows/v2-c-ttg-slg-tests.yml` 在 A／C 的 blob 完全相同。**只有 TTG-1-077 是已在 C 實作但尚未由 A 固定卡號清冊整合的新卡**；另外四張僅為需求分析，沒有完成。

### 目前阻塞與明確 WIP（切勿假標 completed）

- **BLOCKED / 交 A**：`tests/universal-v2-title-pack-contract.test.mjs` 兩項固定斷言尚以 TTG23 為上限。應由 A 維護 `tests/fixtures/v2-integrated-id-manifest.mjs`、共用 contract／inventory，按**明確 TTG C 新四張 `005,014,019,077`**驗證 TTG **24/81**／缺57；若 A 其他作品無變動，五系列註冊 **182/700**／未註冊518。**不能放寬成只要數字吻合就通過，也不能由 C 直接修改共用測試。** 已交 A [PR70 留言 #6186220563](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6186220563)；C [PR72 保全留言 #6187589071](https://github.com/will00t-debug/Ua/pull/72#issuecomment-6187589071)。
- **WIP / TTG**：`TTG-1-010`／`TTG-1-023` 是牌庫**頂3／頂5**依印刷特徵選取、剩餘依序放底、成功取牌後才棄1，不能用全牌庫 search/shuffle 冒充；`TTG-1-081` 還有己場或 Raid 底板西蒙**或**卡米那的 BP 條件；其他多層 Raid／能源門檻／延遲／生命特例依下方既有交接。
- **WIP / SLG**：`SLG-1-036` 必須先抽3再強制棄2（Life ACTIVE）；`SLG-1-037` 必須從己方 outside 按**印刷 BP≤4000** 選至多1角色回手再抽1（Life DRAW，官方 Q2039）；`SLG-1-014` own outside 回手後僅可選 REST 免費登場**能源線**（Q2025），不得進前線。未完成同名共用限次／鏈式 Raid 等留原文交接查閱。
- **TTG 全部尚未移植 57 個卡號（統一前綴 `TTG-1-`）**：`002, 003, 004, 006, 007, 008, 010, 011, 012, 013, 015, 016, 017, 018, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 039, 040, 041, 044, 048, 050, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 067, 068, 069, 070, 071, 074, 075, 076, 080, 081`。
- **SLG 全部尚未移植 62 個卡號（統一前綴 `SLG-1-`）**：`001, 002, 003, 004, 007, 008, 009, 010, 011, 012, 013, 014, 017, 018, 019, 020, 021, 022, 023, 024, 025, 027, 028, 029, 030, 031, 033, 034, 035, 036, 037, 039, 042, 044, 046, 047, 048, 049, 050, 051, 053, 054, 056, 057, 058, 059, 060, 061, 062, 063, 064, 065, 067, 069, 070, 071, 072, 073, 074, 075, 077, 080`。
- 以上全部仍以兩份 C-owned CSV 的 `body_v2_port`、`life_trigger_v2_port`、`integration_scope_v2_c` 為逐卡真相，任何 Body 或 Life 局部 handler **不等於**這張卡完成全效果驗收。

### Cursor 接手指引（僅供後續人類／Cursor 使用；ChatGPT 本輪不再操作）

```bash
git clone https://github.com/will00t-debug/Ua.git
cd Ua
git fetch origin
git switch --track origin/feature/v2-ttg-slg-port-20261015
git status --short
git log --oneline --decorate -n 10
node --version  # 專案 CI 為 Node.js 22
node --test tests/universal-v2-ttg-port.test.mjs tests/universal-v2-slg-port.test.mjs
# 需要完整測試才執行 npm test；A 固定清冊尚未納入 TTG077 前，已知會有上述2項失敗。
```

**安全範圍**：C 只改本作品專屬 pack／title contribution／tests／CSV／handoff。任何共用 engine、registry、模板、source-pinned manifest 或共用契約測試請交 A；使用者已決定切換 Cursor，ChatGPT 本輪交接完成後停止，沒有後台持續開發或部署。

---


## 2026-10-15 16:04 後：V2-C 停工保全與 PR70 穩定核心同步（本段優先）

本輪**暫停新增卡、沒有新增任何卡號**；僅保存 C 已完成成果，接入 A 最新**已由同 SHA 雙 CI 驗證**的穩定核心，並更新交接。不得改動 PR #70 branch、main 或部署正式站。

- **同步來源**：PR #70 `75468867b7ec4f5cdd78661e5b98f400494fb94d`。A [全套 Node22 1143/1143 PASS](https://github.com/will00t-debug/Ua/actions/runs/38694133956) 和[五作品 60/60 finished](https://github.com/will00t-debug/Ua/actions/runs/38694131961) 均為此同一 SHA；A-core.md 早期舉例的 `3f634857` 已非最新。以此來源的共用 engine/pack/ability-templates/registry/共用測試作為本次合流基線，**沒有編輯共用檔案內容**。
- **C 原始保全 HEAD**：`979eed8530721fae53c63201e033a5297464c853`，最新 C Node22 [#38694472100](https://github.com/will00t-debug/Ua/actions/runs/38694472100) 為**系列專測 32/32 PASS**、**全套 1146/1148 PASS、2 FAIL**。兩項都是主控共用 `tests/universal-v2-title-pack-contract.test.mjs` 的固定 TTG23 卡號清冊斷言。A 在 PR #70 已有 C 的既有 TTG3、SLG18，**但尚未登錄 C 新驗收 TTG-1-077**；這不是 C 資料遺失或通用核心必然失效。
- **精確目前計數**：PR #70 TTG 20 Pilot + 3 新 = **23/81**（缺58），SLG **18/80**（缺62）；本 PR #72 保存第四張 `TTG-1-077`，故 C 為 **TTG24/81**（缺57）、**SLG18/80**。A 其餘四作品數據以 A 當前官方鎖定清冊為準，不能沿用過去 175 總數快照；同步 A 的 B 新增6後其 PR70 合計 181／700、C 預計 182／700（差異僅 +TTG-077）。
- **A 與 C 專有檔實際內容差異，共 7 個檔**：`dist/universal-v2/ttg-pack.mjs`（TTG-077 自己場外可選回收 + 斜線複合特徵僅該卡印刷來源驗證後局部轉換）、`dist/universal-v2/title-packs/ttg.mjs`（第4張來源／證據／版本）、`tests/universal-v2-ttg-port.test.mjs`（TTG24 正反例、非法來源／可跳過、另 TTG010/023 fail-closed）、`tests/universal-v2-slg-port.test.mjs`（正確 PR70/PR72 歸屬與 SLG036/037 fail-closed）、`audit/v2-c-ttg-status.csv`（TTG-077 v2_batch3 並且原三張改標已在 A）、`audit/v2-c-slg-status.csv`（18 張改標 `pr70_integrated_contribution`）、`docs/v2-handoff/C-ttg-slg.md`（獨立最新交接及證據）。C 另有3個獨立檔 `dist/universal-v2/slg-pack.mjs`、`dist/universal-v2/title-packs/slg.mjs`、`.github/workflows/v2-c-ttg-slg-tests.yml` 和 A 目前完全相同，保留而不重寫。
- **TTG-077 正反例及阻塞**：官方 `UA56BT/TTG-1-077` 赤4/AP1 場域，登場時由**自己的場外**選「ガンメン」特徵卡最多1張回手，0張可跳過；無生命 Trigger。C 只以來源精確校驗把 `大グレン団／ガンメン` 轉換為這張卡的 V2 特徵條件，不改官方 sourceRecord，也不把檢索牌庫、對手場外或強制回收視為合法。反例已在 C 專測覆蓋，C 仍須保留全部 UID 守恆。
- **A 下一步**：在自己主線按**精確卡號**更新註冊清冊 `TTG-1-005,014,019,077`、TTG24、缺57與整體可用卡總量；兩個 `title-pack-contract` 來源鎖定測試必須由 A 改，C 不能越權改它們。既有 [PR70 具體交接留言](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6186220563) 可直接接續，不要反覆跑已知必失敗的全整合。
- **仍未移植的另四候選** TTG-010/023（指定牌庫頂 N 張選取、剩牌任意排序置底、符合條件後棄牌）與 SLG-036/037（抽3棄2 的逐張成本與依原本 BP 限定的己方場外回收）維持 fail-closed，不能錯用一般全牌庫檢索等不等價模板。完整 Body／Life 分欄在兩份 CSV。
- 本次同步以 A 的已通過快照作底，僅 overlay C 擁有的卡包、兩份 CSV、兩份專測及 C handoff；保留 C 原 commit 於新整合提交的父系。此操作不在 A 分支提交、不動共用核心、不修改正式站。系列專測只需針對**新 C 整合 commit**驗一次；已知的兩個來源鎖定共用失敗由 A 處理，不反覆空跑。


## 最新結果優先（2026-10-15 台灣／本段覆蓋下方歷史快照）

- **PR #70 A HEAD** `75468867b7ec4f5cdd78661e5b98f400494fb94d` 在 Node22 [Actions #38694133956](https://github.com/will00t-debug/Ua/actions/runs/38694133956) 為 **1143/1143 PASS**；該版另有 60 局矩陣成功。**C 已同步此基線**，安全雙親 merge `3738f56b7e14496e5232271157e2a6c42969e4fb`，C 專有檔與 TTG077 真卡保留。
- **PR #72 工作線實際新卡數**：TTG **24/81**（20 舊 Pilot + 原 C3 已整合 PR70 + **新 TTG-1-077 僅在 PR72**；尚缺57）；SLG **18/80**（原18 已在 PR70；尚缺62）。A 新納 BLEACH 六張後，PR70 共 **181/700**；PR72 另加 TTG077，合計 **182/700**、未移植 **518**。這不是 182 張完整 FAQ 終驗。
- **此基準實測**：[C Actions #38694277210](https://github.com/will00t-debug/Ua/actions/runs/38694277210)，專測 **32/32 PASS**；全套 **1146/1148 PASS，2 FAIL**，皆 `tests/universal-v2-title-pack-contract.test.mjs` 未將 TTG-1-077 加進來源鎖定 manifest，屬 A 共用清冊歸屬。已在 [PR70 留言 #6186220563](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6186220563) 交出固定新增身份及正確總數，C 不越權修改。下方舊 23/81、175/700、5 fail 等僅歷史，不得當最新結論。
- 最新真卡 **TTG-1-077** 官方赤4／AP1／場域、登場 `own outside` 任意 0–1 張 `ガンメン` 特徵回手、Life none，源複合特徵嚴格驗證後僅單卡拆詞；正例 TTG072 和 TTG077、反例非法敵區／手牌／其他特徵／無目標、AP 與 UID 守恆已覆蓋。
- 下一張**尚未**移植：TTG010/023 的頂3／頂5 按特徵檢索、剩餘底部排序及成功後才棄1；SLG036 的**抽3後強制棄2**、SLG037 的**印刷 BP≤4000 自己場外回收後抽1（Q2039）**。缺等價共用處置，不用錯誤模板或空效果假填，已記錄來源和最小情境。TTG081/SLG014 的 Raid 底板／來源線條件亦未完成。


日期：2026-10-15（台灣）；整合 base：`feature/universal-rules-v2-foundation-20261014`（PR #70）。此工作只在 `feature/v2-ttg-slg-port-20261015`，不得合併 main、部署 Production 或覆寫共用核心。

## 真正基準與範圍

- TTG-1：001～081 **81 張**一般卡；SLG-1：001～080 **80 張**一般卡。獨立作品卡表已收錄完整號碼，排除異圖/AP；原有 Beta 測試不等於 V2 實作。
- 原 V2 TTG Pilot **20 張**，SLG Pilot **0 張**。本輪 TTG +3（005、014、019），合計 **23/81**；SLG +18（005、006、015、016、026、032、038、040、041、043、045、052、055、066、068、076、078、079），合計 **18/80**。
- 新封包：`dist/universal-v2/ttg-pack.mjs` 與 `dist/universal-v2/slg-pack.mjs`，都呼叫 **同一個** `createUniversalPack` 與共用引擎，不碰作品舊 reducer。印刷值與卡文錨點不相符即中止載入；無效/未移植能力不得冒充完成。
- 卡內文與 Life Trigger 分開列於 `audit/v2-c-ttg-status.csv`、`audit/v2-c-slg-status.csv`；單張即使 body 確認，生命觸發時點仍需個別測試。兩款卡包沒有假填充卡片，未移植剩 TTG **58**、SLG **62**。

## 已移植批次

| 系列 | 卡號 | 實際 V2 能力 |
|---|---|---|
| TTG | 005 | IMPACT 無效；生命 DRAW |
| TTG | 014 | 登場時回手其他合法的自家需求能源 ≤1 角色；否則回手自己 |
| TTG | 019 | ACTIVE 時同色綠能源 +1，REST 失效 |
| SLG | 005/015/045/055/066 | 無額外內文能力；分別保留 DRAW/GET |
| SLG | 006/041 | ACTIVE 時紫／綠能源 +1 |
| SLG | 016 | 強制將牌堆頂 2 張送場外；IMPACT 無效 |
| SLG | 026/068 | 自家其他能源需求≤1 角色必須返回手牌；無其他則自己返回 |
| SLG | 032/052 | IMPACT 無效，生命 ACTIVE |
| SLG | 043 | 登場抽 1 張、再將 1 張手牌送場外，生命 ACTIVE |
| SLG | 038/078/079 | 事件 AP 最多回復 2，生命 FINAL 分別由 V2 trigger handler 解決 |
| SLG | 040/076 | 事件 BP3000 以下敵前線退場，己場有〈水篠 旬〉則門檻 BP5000；與內文無關的 SPECIAL 生命可選退場 |

## 主控共用核心需求：能力／卡號／時序／最小重現

| 卡號及缺口 | 預期共用核心時序 | 最小重現 |
|---|---|---|
| TTG 027/031/032/073/074：裏向、連續 Raid | Raid 合法條件先於付 AP；上層 Raid 按卡文移動至原底板裏向、實體 UID 保留；底板能力/登場排隊；對手公開檢視僅見裏向標記。 | 西蒙、妮亞、已突襲拉甘，嘗試 074；欠妮亞拒絕、合法連 Raid 精確計入底板、對手不得看到 UID；Q2298/Q2299。 |
| TTG 061/062：回收、出牌、重複 onPlay | 依 Q2293/Q2294 不可重選同一項，先回收再允許從手牌 ACTIVE 登場；重發 onPlay 不能覆蓋現有 pending。 | 場外/手牌分別有合格低費紅色西蒙；牌堆 20 vs 21；驗選擇順序、成本及巢狀佇列。 |
| TTG 003/011/020/024：動態能源 | 6/8/20 能源門檻必須讀即時、含前線合法能源，且同名回合限次共用。 | 7→8 綠能量、前線 TTG003；兩張同名嘗試 20 能源 ACTIVE；Q2392/Q2259。 |
| TTG 056/068/080：攻擊結束 Raid / 特殊攻擊與下一張 AP 折扣 | 戰鬥結束在生命 Trigger 後；從能源線攻擊次數與合法阻擋；080 折扣僅用於下一張合法名字的 Raid，非法不得消耗，回合末消失。 | 056 直攻碰 Life RAID 後才連 Raid；080 回收後先嘗試非合格 Raid 再合法 Raid；Q2291/Q2292/Q2297/Q2300。 |
| SLG 011/014：從場外回收到手立即登場 | 先完成回收，再由玩家選合法線與 REST/ACTIVE，能量與滿線位檢查；014 永不許前線。 | 一般回收 vs 水篠旬回收 011；嘗試 014 前移和滿能源線，應禁止非法目標；Q2025。 |
| SLG 019/029/031/033：全場同名限次 | 每項模式全場每回合共享；依卡片印刷 BP 檢查合法性。 | 兩張 019 場外重複發動；兩張 029 相同／不同模式各試，Q2026/Q2031–2037。 |
| SLG 013/042：REST 能源且主階段結束退場 | REST 扣成本，重新 ACTIVE 不允許同回合重啟，主階段結束才退場；離場重進重設能力狀態。 | 013 REST 加能，透過別張卡 ACTIVE，退出主階段：只退一次、UID 仍在場外。 |
| SLG 020/021/022/047–049：付費回收 / 連 Raid | 020 棄掉的成本立即到場外並可本次回收；攻擊結束在戰鬥／生命 Trigger 後；連 Raid 換上層不讓露出底板重新登場。 | 020 回收剛棄的卡；047→048→049 連 Raid，核對 AP、UID、攻擊次數、裏向隱私；Q2027–2029/Q2041–2051。 |
| SLG 034/037：付款前條件/印刷 BP | 034 場外 20 張門檻必須支付之前成立；037 依印刷 BP 而非暫時 BP。 | 19 張場外＋棄1 不得使用 034；原始 BP4000、被加成 5000 的角色仍可 037 回收；Q2038/Q2039。 |

## 不能宣稱完成

剩餘 TTG 58、SLG 62 尚未移植，尤其 COLOR、RAID、EVENT、同名限制、延遲效果、裏向及有成本的多段連鎖。已移植卡仍需更多真人 UI、全部 Life Trigger、非法支付、目標可選放棄、隱藏資訊和跨作品回歸；不能透過舊作品引擎或簡化成空效果通過。官方卡文 https://www.unionarena-tcg.com/jp/cardlist/ ，FAQ https://www.unionarena-tcg.com/jp/faq/ 。

運行測試（Node22）：`npm test`，新增 `tests/universal-v2-ttg-port.test.mjs`、`tests/universal-v2-slg-port.test.mjs`；以 GitHub 當前工作分支 check 狀態為準，不宣稱未確認測試通過。

## 本輪可重現的 CI

GitHub Actions Node.js 22 [run #38610752632](https://github.com/will00t-debug/Ua/actions/runs/38610752632) 在 V2-C 初始 23/81 + 16/80 的 commit `075c6d6925db79cc98156f4580b81922f5ffa8ad`：**專項 9/9、全專案 1002/1002 通過，0 失敗**。後續加入 SLG 040/076 的提交必須以新 run 為準，不能沿用這個舊成果。官方卡文直接比對 [SLG-1-040](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-040) 與 [SLG-1-076](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-076)。

## 2026-10-15 最新主線動態契約整合（V2-C 必讀）

主控自 PR #70 新增正式系列專屬契約：
- `dist/universal-v2/title-packs/ttg.mjs`：TTG 額外 **3** 張，`sourceRecord / definition / evidence` 明確列印、來源、卡文片段、測試檔與回顧註記；由共用 registry 在原有 20 張 TTG Pilot 後追加，絕不重覆 Pilot。
- `dist/universal-v2/title-packs/slg.mjs`：SLG 新增 **18** 張，同樣經正式通用 contract 編譯，不呼叫舊 SLG 對局 reducer。事件「無印刷 BP」在原 source 為 `null`，在 V2 事件 profile 為 `0`，該作品側適配器有一行**僅限非角色**明確正規化，保留原始官方來源與 review note，並向主控提出正式契約修正需求。
- `dist/universal-v2/{ttg-pack,slg-pack}.mjs` 是各系列不依賴 registry 的測試與實作 helper，不取代共享 `engine.mjs`、`pack.mjs` 或 `registry.mjs`。
- 專屬測試現在亦檢查**正式 registry** 的 `baselinePilots/newlyContributed/totalV2Cards`、兩作品跨包真卡對戰、角色 UID 守恆、非法目標與 SPECIAL 生命 Trigger 可選，以及完整卡號索引。

**尚未由主控解除的共用阻塞**：`tests/universal-v2-title-pack-contract.test.mjs` 使用固定 0 張 SLG、20 張 TTG、總 35 Pilot 的舊斷言；一旦按主控契約實際登錄新卡即失敗，並非錯誤忽略卡牌能力。已在 PR #70 留下 [V2-CORE-REQ] 附重現與預期修法，V2-C 不會擅自修改該共用測試。部分 V2 主線進行中的一次/回合與模板測試短暫不一致亦須由主控解決；不會把**舊 commit 的綠燈**當作新的完整測試結果。

證據：2026-10-15 最新 SLG 040/076 各有日本官方卡文，事件結算皆為根據己方水篠旬存在與否選 BP3000 或 5000；生命 SPECIAL 別於事件，直接按共用 Trigger 可選退場。SLG-1-016 官方抽兩張以下確認為**強制送牌庫頂兩張到場外**且 IMPACT 無效。所有記錄均在兩個 QA ledger 中分開編碼。

**交接守則**：僅保留本分支 Draft PR，讓主控審查各 card 來源和測試；禁止將無註冊、空效果、虛構支援旗標或舊引擎轉發列作已移植。除本批之外 TTG 仍有 58、SLG 仍有 62 未移植，且沒有全部 FAQ 蓋章。

---

## V2-C 逾時補交與再次推送（台灣時間 2026-10-15 07:02 後）

這份補交**不是 07:00 截止前完成證明**。PR #72 的 base 仍指向 PR #70 的 `feature/universal-rules-v2-foundation-20261014`。先前已確認主控 HEAD `25eeac5084917534193fd9feaeae31672f902e78`，本輪重新成功取得寫入權限。本工作線只寫 `tests/universal-v2-ttg-port.test.mjs`、`tests/universal-v2-slg-port.test.mjs`、本 handoff；共用核心、模板、入口和共用測試沒有變更。沒有合併 main 或部署正式站。

### 已重新核對的逐卡結果

- TTG：正式一般卡 **81/81**，Body `existing_v2_pilot=20`、`v2_batch1=3`、`not_ported=58`，合計 **23/81 已在 V2 登錄，58 尚未移植**。生命 Trigger 欄位：`not_applicable=22`、`not_registered=42`、`existing_pilot_life_requires_card_qa=16`、`shared_v2_life_handler_requires_card_qa=1`。
- SLG：正式一般卡 **80/80**，Body `v2_batch1=16`、`v2_batch2=2`、`not_ported=62`，合計 **18/80 已在 V2 登錄，62 尚未移植**。生命 Trigger 欄位：`not_applicable=21`、`not_registered=46`、`shared_v2_life_handler_requires_card_qa=13`。
- 上述 Life 標記的「共用 handler」不等於該卡全效果／全生命情境的官方正式驗收。來源 CSV 仍各有 81 / 80 列；一張卡的 Body 與 Life 必須分開驗。

**TTG 尚未移植 58 個卡號（共用前綴 TTG-1-）：** 002, 003, 004, 006, 007, 008, 010, 011, 012, 013, 015, 016, 017, 018, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 039, 040, 041, 044, 048, 050, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 067, 068, 069, 070, 071, 074, 075, 076, 077, 080, 081

**SLG 尚未移植 62 個卡號（共用前綴 SLG-1-）：** 001, 002, 003, 004, 007, 008, 009, 010, 011, 012, 013, 014, 017, 018, 019, 020, 021, 022, 023, 024, 025, 027, 028, 029, 030, 031, 033, 034, 035, 036, 037, 039, 042, 044, 046, 047, 048, 049, 050, 051, 053, 054, 056, 057, 058, 059, 060, 061, 062, 063, 064, 065, 067, 069, 070, 071, 072, 073, 074, 075, 077, 080

### 本次提交的 V2-C 專屬測試

- `5377a4124e0c25b40a351ba1d8db8abf03ca057c`：SLG-068 有其他合法低費角色時必須回手其他己方角色；排除高費、敵方、能源線不合法目標及放棄；SLG-043 實際 ACTIVE 生命翻開後可放棄或 ACTIVE 己方角色 +3000 BP；SLG-015 GET 生命翻開後可放棄或將實際 UID 加入手牌。
- `c658fe9751bcd5c406b9a26353007be33a7ac414`：TTG-005 DRAW 生命翻開後可放棄或從己方真牌庫抽一張；檢查未重複取得生命卡、UID 守恆。
- 官方卡文交叉核對：TTG-005 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-005；SLG-068 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-068。
- 更新前最後已完成的 CI 為 https://github.com/will00t-debug/Ua/actions/runs/38612938372 ：**17/17 V2-C 專項通過，全套 1027/1032 通過、5 失敗**；新測試已觸發 GitHub Actions，**必須另查新 HEAD run，不能把本行當作最新結論**。

### 主控共用阻塞與最小重現

已在 PR #70 新增 `[V2-CORE-REQ]` 留言（issue comment id `6180417085`）：
1. `tests/universal-v2-title-pack-contract.test.mjs` 3 項固定舊值：真正已註冊的 15 / 23 / 18 / 0 / 0 不應被舊 15 / 20 / 0 / 0 / 0 擋下；預期由 registry 動態計數、驗證 baseline + contribution。最小重現：PR #72 HEAD `node --test tests/universal-v2-title-pack-contract.test.mjs`。
2. `tests/universal-v2-once-per-turn-gate.test.mjs` 2 項牌庫長度：預期 33 / 32，實際 32 / 31；須確認 fixture 取出的實體 UID 和 deck 初始張數，不能只改斷言讓無守恆 bug 過關。最小重現：PR #72 HEAD `node --test tests/universal-v2-once-per-turn-gate.test.mjs`。

更高階 TTG 多層 Raid/裏向底板/能源 8 與 20 門檻/080 延遲折扣，以及 SLG 場外回收後登場/同名全場次數/延遲退場，尚需主控通用引擎能力；未移植卡嚴格關閉，不得翻旗標冒充支援。本輪 C 工作只新增已能用同一引擎解決的真卡 QA，**沒有擴大 V2 卡號數或宣布完整官方驗收**。

### 本次已完成的 Node 22 CI 結論（更新前最近一次 HEAD）

[Actions run #38651981244](https://github.com/will00t-debug/Ua/actions/runs/38651981244)、commit `d747a08bb89e86291274dee3032f9c5f3cd740c6` 已實際結束：
- **V2-C 專項 21/21 通過、0 失敗**（原 17 項，加上 SLG-068、043、015 與 TTG-005 四項）。
- **全專案 1031/1036 通過、5 失敗**；剩餘 5 項依然是 `universal-v2-once-per-turn-gate.test.mjs` 兩項及 `universal-v2-title-pack-contract.test.mjs` 三項，皆已回報 PR #70。不是全套綠燈。
- 本次僅為 handoff 文字補上以上已驗證結果，寫入後將產生新的 GitHub Actions run；以**新的 HEAD** CI 為最後準據。沒有移植更多卡號、沒有覆蓋主控共用檔、沒有部署與 merge。

---

## V2-C 第二輪整合與共同介面驗收（台灣時間 2026-10-15 10:33 以後）

### 親自重新核對的 A-core/PR70 基線

- 讀取 `AGENTS.md`、`dist/universal-v2/{engine,pack,ability-templates}.mjs`、`title-packs/{contract,registry,ttg,slg}.mjs`、`tests/universal-v2-{title-pack-contract,once-per-turn-gate}.test.mjs`。
- PR #70 HEAD **`25eeac5084917534193fd9feaeae31672f902e78`**，PR #72 第二輪啟動 HEAD **`bfb79970effd6095862dd837333da9cb58a8e977`**；PR #70 沒有包含後續共用五項測試修復提交，**本次無新的 A-core 變更可安全 merge**。若 A 交付新 HEAD 必須重新讀取，不能以此快照冒充合流。
- PR #70 HEAD 的遞迴 Git tree 與 `docs/v2-handoff` 列表中**沒有 `A-core.md`**（查 `docs/v2-handoff/A-core.md` 為 404），已請 A 提供正確位置／交接。切勿杜撰文件。
- 只更動 C 擁有的測試、CSV、handoff；`title-packs/ttg.mjs`、`slg.mjs`、各自的 helper 原樣保留、逐卡官方證據不倒退。**沒有觸碰共用 engine、pack、ability-templates、registry、共用測試、入口、real-card-pilots.mjs。**

### 正式 Registry 與 PR70／PR72 分流

- PR #70 **基線 Pilot**：TTG-1-`001,009,036,037,038,042,043,045,046,047,049,051,052,064,065,066,072,073,078,079`（精確 20 張），SLG 零張。
- 只有 PR #72 工作分支已提供的正式 title contribution：**TTG-1-`005,014,019`（3 張，與上述 20 張交集為空）**；SLG-1-`005,006,015,016,026,032,038,040,041,043,045,052,055,066,068,076,078,079`（18 張）。
- 在 PR #72 此 HEAD 的 `registeredV2TitlePack` 可讀：BLEACH 15、TTG **23/81**、SLG **18/80**、SAO 0、MST 0；兩系列用同一 V2 reducer 開合法 50 張牌組，並測試兩回合交接、兩位玩家的實體 UID 絕不增減或跨所有權。
- 本輪新增 `tests/universal-v2-ttg-port.test.mjs` 明確驗證 `registry TTG = 20 Pilot ∪ 3 C，card IDs 不重複`，並經 registry 真卡 50 張 `validateUniversalDeck` 開 TTG vs SLG 進行兩個回合和 UID 守恆；不調用任何舊作品對戰引擎。
- 本輪新增 `tests/universal-v2-slg-port.test.mjs` 對兩套 CSV 的逐卡一一集合、Body/Life 分欄、確切集合差集與整合歸屬作嚴格比對。**若漏卡、重複卡、未移植卻被註冊，測試必須失敗**，不接受只看動態總數的假綠燈。
- `audit/v2-c-{ttg,slg}-status.csv` 新增 `integration_scope_v2_c`：`pr70_baseline_pilot`（原 20）、`pr72_only_pending_pr70_integration`（TTG3/SLG18）、`not_implemented_any_branch`（TTG58/SLG62）。另新增 `tested_scenario_scope_not_full_qa` 逐卡記錄實際測試範圍。前述只表示在 **PR #72 分支**的 registry 可用；**PR #70 尚未合入 C 新卡**，不可誤認已主線整合或已通過所有官方 FAQ。
- **卡數不變**：TTG **23/81 V2、58 未移植**；SLG **18/80 V2、62 未移植**。Body／Life 測試通過只是具體場景，不是全部官方效果驗收。

### 回手、回收、免費登場的來源／合法選擇：不可統一套規則

| 卡號 | 已確認實際規則與來源區 | C 端執行／阻塞 |
|---|---|---|
| TTG-1-014、SLG-1-026/068 | 登場必須回手**自己的場上**另一張需求能源 ≤1 角色（前線或能源線）；沒有其他合法角色則自回手；**不得跳過**，不得選對手或不符合印刷需求的角色 | 已實作並測試；本輪加測 SLG-068 可回手己方能源線的合法實體 UID |
| TTG-1-077 | 官方 **登場時從自己場外**選至多 1 張具有「ガンメン」特徵的卡加入手牌。不得從手牌／牌庫／敵方場外取卡，且可選 0 張 | **尚未移植**：共用 `matchesFilter` 用 `printed.traits.includes(filter.value)` 對原卡表的 `'大グレン団／ガンメン'` 複合特徵無法正確命中；不能拿過寬 type 篩選冒充。新測試確認不合法卡組不能進 V2，已回報 A |
| SLG-1-014（官方 Q2025） | **由自己的效果從自己的場外加到手牌**才可選擇以 REST **免費登場到能源線**；不得登場／移動至前線 | **尚未移植**：缺「場外回收觸發＋能源線限定＋REST」的合法連動；新測試確認未註冊時不可入牌組 |
| SLG-1-020（Q2027） | 棄牌付款後，**剛放進自己場外的卡**符合 BP／名字／類型時也能回收到手；非隨意從牌庫選卡 | 尚未移植：需原子化棄牌、來源 outside 計算和合規 filter |
| SLG-1-039 | 事件二選一：**由自己的場外**將指定影之軍團免費登場，模式 A 最多 1 張 ACTIVE、模式 B 最多 2 張需求能源 ≤3 REST；不應一律只限能源線 | 尚未移植：缺 mode 與進場線／選擇條件 |
| SLG-1-011（Q2025 同系列但不同效果） | 回收至手時若條件滿足可 REST 登場；**若由「水篠 旬」效果回收才可 ACTIVE 登場**，不能對所有回收來源一視同仁 | 尚未移植：缺來源追蹤與可選進場 |

官方來源：[TTG-1-077](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-077)、[SLG-1-014](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-014)、[SLG Q2025–Q2027](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT)。若底層能力不足，該卡嚴格 fail-closed，不得設空 effect 或僅打勾。

### 三項舊註冊斷言＋兩項 once-per-turn，共用阻塞交 A

已新留言 [PR #70 #issuecomment-6183129347](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6183129347)：
1. `title-pack-contract.test.mjs` ~37：舊 `[15,20,0,0,0]` 不接受本分支真實 `[15,23,18,0,0]`，正確 `newlyContributed=[0,3,18,0,0]`。
2. 同檔 ~63：測 synthetic TEST-ONLY 合約「不污染正式 registry」不能以 `registeredV2TitlePack('solo-leveling')===null` 作守恆證據，應比對正式 SLG 18 卡前後卡號和版本不變。
3. 同檔 ~103：固定 35 cards/665 blocked 不適用已註冊 56；目前全套總 700，**登錄 56、未移植 644**（blocked 261/58/62/183/80）。正式來源總卡數不應動態漂移，必須嚴格對全卡 ID 集合。
4. `once-per-turn-gate.test.mjs` ~73/~84：牌庫 `32!==33`、`31!==32`；fixture/UID 實體取牌前後須核對，不能只降低預期值掩蓋守恆問題。

**主控再修復後的整合驗收**：等 PR #70 真有新 HEAD，先檢查更動不覆蓋 C 的 registry 貢獻，再同步 commit，重新跑 `node --test tests/universal-v2-{ttg,slg}-port.test.mjs` 及 Node22 `npm test`；沒有新 HEAD 時不能稱「五失敗已消失」。

### 本輪新增驗收 commit 與 CI

- `a92d6a4d78880b007738cffaae029ced55b696c9` — 正式 registry 集合與雙作品同一 V2 引擎兩回合 UID 守恆。
- `a47d0812f3e1a60b1241e871a16a2d0b465c307f` + `3df097dc5c45e2de4088f3e46ca2362a77e86843` — TTG/SLG CSV 逐卡分 branch/base 歸屬、測試範圍。
- `70956313e529eac12dbd1a17c635f166ddc31370` — 不靠動態總數掩蓋漏卡／重複卡的逐卡 CSV 整合集合測試。
- `cb38b5c36e7ee4a9d901f941fa11b522ce212647` — SLG-068 能源線合法回手 UID。
- `3f9c3c7f3e5737800c253e9f32e1b92dd14b54b2` + `97403750196a6129615a8847f272865b4640606f` — 官方 TTG077、SLG014 來源線與核心阻塞，沒有假移植。
- `44c6bbee07daf16320b0b16d981c03893b835f8e` + `8449e7e08e7e13c3adfc6f014363f912cc7c5113` — fail-closed 官方未支援卡不能加入合法 V2 牌組。

Actions 已完成 [#38672053993](https://github.com/will00t-debug/Ua/actions/runs/38672053993)，在 `70956313e529eac12dbd1a17c635f166ddc31370` 上專測 **24/24 PASS**、全套 **1034/1039 PASS、5 FAIL**。後續上傳新測試及 handoff 會自動引發後續 CI；**以最後 HEAD Actions 為準，不要把本段當成最終 HEAD 綠燈**。

### 第二輪 27 項系列專測與整套 CI 完成結果

第二輪核驗 [GitHub Actions #38672334245](https://github.com/will00t-debug/Ua/actions/runs/38672334245) 對應 **`f87f277d83b036a7002ce0ae3667d2568a1def78`**，Node.js 22：

- **27/27 V2-C 專屬測試通過**，0 失敗。
- **1037/1042 全套測試通過**，5 失敗（`tests/universal-v2-once-per-turn-gate.test.mjs` 2 項；`tests/universal-v2-title-pack-contract.test.mjs` 3 項）。
- 無任何新增 TTG/SLG V2 卡號，仍 **23/81、18/80**。本段為純文件補錄；新文件 commit 會觸發另一個 Actions run，若有差異應以新 run 為準。
- PR #70 仍是 `25eeac5084917534193fd9feaeae31672f902e78`，未收到 A 修復的新 HEAD；目前不是「同步修好的共同核心」，而是同一 PR70 base 上 C 實際驗收。無主線合併或正式部署。

---

## V2-C 恢復批次移植：TTG-1-077（2026-10-15 台灣）

### 修復基線與分支安全合流

- 已重新讀取 PR #70 `docs/v2-handoff/A-core.md`、`AGENTS.md` 和兩系列獨立卡包，沒有重做 20 TTG Pilot／原 3 TTG C／18 SLG C。PR #70 已在 `3f6348578b7e3e32a6cd12c66475e8228db0b690` 實際 Node22 **1119/1119 PASS**、60/60 五作品矩陣成功，修掉以前五項共同回歸。該雙綠燈不是本次新增 TTG077 後的結果。
- 第一個安全雙親合流 `7c3b9b45b218b138021b9657245e641e51d1e6d6`：A `45ea2e3bc0db8a0b1cb75be50d346469439fe1cb` + C `a8ed77eb795f3578fbd79af44d9652cabfa62326`，保留 C TTG QA 修訂，不改任何共用檔。
- 第二個安全雙親合流 `2231fc0a552036f03dbfe0cd88b24b3e9f66505e`：A `26073201c84472be9893e66ff3f9ae15bc4f9cf8` + C `c0785f247a170aa5dfb2f09fcdbf7428095388f3`，保留 C title packs、兩 CSV 與獨立測試。A 後來又前進至 `1f7aa4222c82631512919208640fdf681cf53d82`，**尚未再合流**；若同步以最新 A SHA 為準，不宣稱舊版就是最新。
- 核心只沿用 A commits（共用 `engine.mjs`、`pack.mjs`、`ability-templates.mjs`、共用測試和入口未經 C 直接修改）；正式 V2 registry 仍共用一份，作品舊引擎沒有參與。禁止改 main 或部署。

### 第一批實際新增：TTG-1-077 ダイグレン

- 官方日本卡文：https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-077 。**必要赤4、消費AP1、Field、產紅2、無生命 Trigger**；`【登場時】自分の場外から［特徴：ガンメン］を1枚まで手札に加える。`
- Body：以 `recoverOutsideOne` 共用 DSL 實際選擇**自己 outside** 的 0 或 1 張印刷 `ガンメン` 特徵卡加入**自己 hand**。選 0 合法；不得選對手 outside、己方 deck、己方 hand 或沒有該特徵的卡。當沒有目標時不得無端多取得卡、不得跳過 AP 支付。Life：**none / not_applicable**。
- 原始官方資料 `TTG-1-077` 的 trait 為單一源字串 `大グレン団／ガンメン`；其他既有 TTG Pilot 特徵已分成 `大グレン団` / `ガンメン`。**僅本張新增 profile** 有嚴格來源字串 fingerprint，將已證實斜線複合特徵轉為兩個供共用 DSL 選擇的 trait token。原始 `sourceRecord` 保持不動、出現未審來源就中止註冊。這不等於修改共用比對演算法。
- 正反例：`tests/universal-v2-ttg-port.test.mjs` 在 TTG 50 張合法牌組中用兩張 TTG-049 提供紅4、真實 AP 支付，TTG077 出牌後可選 0 或 1 張自己 outside TTG077，同時拒絕敵方和非特徵 UID；另確認能正確回收**另一卡號**、原 Pilot `TTG-1-072`（印刷ガンメン），精確核對 hand/outside/AP/UID 守恆；`TTG-1-081` 未實作且仍無法放入合法牌組。
- 相關 commits：`022af72761cf8ee2faada721b73b3ebfe55d1d59` TTG source profile、`ab54e24cbcd8b7f89b36e2352b86a366d3d6ec26` title contribution、`aae05f6bd43a6034cd7cf4ea1a36dec1a14c81c0` 初始正反例，`cb53155eea450ed5c3459281a6855f10945aa708` 與 `1ad95c702e97671ef040f556dfe17e67e972f4d5` 特徵規範修正，`b56e58a239d0c6582ced6bf8ed23621faa8fd714` 過期拒絕斷言換真卡斷言，`c0785f247a170aa5dfb2f09fcdbf7428095388f3` 回收異卡號的反例。
- 逐卡表 `audit/v2-c-ttg-status.csv` 已把 077 改為 `v2_batch3`，生命 `none/not_applicable`，整合歸屬 `pr72_only_pending_pr70_integration`。原 TTG C 005/014/019 及 SLG 18 張已由 PR70 正式納入，CSV 改為 `pr70_integrated_contribution`。原 TTG Pilot20 為 `pr70_baseline_pilot`。不可將 PR72-only 077 假稱 PR70 已合入。
- **實際數目**：TTG **24/81 V2**（原20 Pilot + 原C3已A整合 + 新C1），未移植 **57**；SLG **18/80 V2**（全部18已A整合），未移植 **62**。跨五作品若其他系列無變動：已登錄 **176/700**、仍未移植 **524**。官方所有效果／FAQ 終驗仍不得冒稱完成。

### 新增卡後 Node22 實際回歸與 A 合作

- [Actions #38692724861](https://github.com/will00t-debug/Ua/actions/runs/38692724861) 在 TTG077 正反例完整提交：**C 專測29/29 PASS**，全套 **1119/1121 PASS**，僅共用 title-pack contract 的 2 項固定清冊失敗，因 A 來源鎖定 TTG 仍為23而本線已是24。
- [Actions #38692840488](https://github.com/will00t-debug/Ua/actions/runs/38692840488) A 新模板核心合流 `2231fc0a`：**C 專測29/29 PASS**，全套 **1121/1124 PASS、3 FAIL**；新增第 3 項是 A 新加入共用模板 `inspectTopAnyOutside` 後，共用模板 ID 清冊斷言尚未同步。未修改共享測試掩蓋。
- PR #70 主控留言 [#6185968345](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6185968345) 提供 TTG-077 實際卡號、正確固定卡數、逐卡源和三組可批次解鎖的能力；[#6186025296](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6186025296) 提供 A 模板清冊與 TTG 靜態清冊三項阻塞的實際 Node22 日誌。需由 A 調整清冊：TTG **24/81**、C addon 4、未移植57、全五作品176／未移植524，增加固定 **TTG-1-077** ID，不可單純改成動態數量吞缺卡。
- 本文提交後若再觸發新的 Actions，必須以**新 HEAD** 結果重核，不能沿用上面舊 commit 證據。

### 下一批已逐卡檢查，但仍需共用能力（保持 fail-closed，不記完成）

1. **SLG-1-036**：[官方印刷](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-036) 紫3/AP1 event，**先抽3，再從手牌選2張必須送 own outside**；Life ACTIVE。共用 `drawDiscardOne` 僅一抽一棄，不能串兩次冒充；請 A 提供抽 N→棄 M、在抽牌後才可見合法 discard UID、不可兩次選相同 UID 的共通 pending。
2. **TTG-1-010、TTG-1-023**：[官方 010](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-010)、[官方 023](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-023)：自己 deck **頂3／頂5** 只從特徵大グレン団／ガンメン最多選一張公開加入手牌，其餘按自己順序放 deck **底**，有加入時再棄一張。不是全牌庫 search + shuffle，也不是對任意 top card 送 outside；現有 `inspectTopAnyOutside` 不等價。
3. **SLG-1-037**：[官方印刷與 Q2039](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-037)：紫4/AP1 event，從己方 outside 選**印刷 BP≤4000** character 至多一張回手，然後抽一張；Life DRAW。必須檢查**印刷 BP** 而非暫時 buff；現有 outside filter 只有 name/trait/color/type，不能以任意角色替代。
4. **TTG-1-081**：SPECIAL 生命與事件體效果分開；印刷加成條件為己方場或 Raid 底板有西蒙**或**卡米那，不能只檢查場上單名而錯給 BP5000；仍未移植。
5. **SLG-1-014**：Q2025 由 own outside 效果回手後可選 REST 免費登場到**能源線且不得前線**；現有無完整帶來源資訊的能源線限定引擎，仍未移植。

以上只列已確認精確卡號／核心需求；**沒有因此新增 SLG 可玩卡**。後續 A 真正提供等價能力時，每張須新增 paid-cost、來源區、optional、Life 正反例和真實 Node22 CI 才能入 registry。

### 接續批次：可移植能力保守篩選與額外反例（2026-10-15）

- 已追加 TTG077 **沒有任何合法己方場外ガンメン目標時**的實戰測試：可合法支付赤4及1AP登場場域、**無強制選擇 pending**，不會把不合印刷特徵的 outside 卡加入手牌，UID 保持守恆。原有正例另可從 own outside 回收 TTG072 真 Gunmen Pilot。此輪專測總計 **32 項**。
- TTG-1-010（頂3檢索「大グレン団」）及 TTG-1-023（頂5檢索「ガンメン」）：已核日本官方印刷、費用、剩餘底牌順序與加入手牌後條件棄1；測試特別拒絕以「搜全 deck 並 shuffle」冒充。兩卡仍未註冊。
- SLG-1-036（紫3事件：抽3**後**強制棄2；Life ACTIVE）及 SLG-1-037（紫4事件：own outside 印刷 BP≤4000 至多1張回手，**然後**抽1；Life DRAW）：已核官方 Q2039 的印刷 BP，而不是目前加成 BP。測試維持不能以不等價共用 DSL 加入牌組。兩卡仍未註冊。
- C-owned tests：`tests/universal-v2-ttg-port.test.mjs`、`tests/universal-v2-slg-port.test.mjs`；CSV 四列的 `verification_notes` 已記載官方費用、Body/Life、來源區、條件與缺失模板。此批次新增**測試與逐卡證據，但無新增正式可玩卡**，不可將 TTG010/023 或 SLG036/037 算入已移植。
- 獨立 CI [Actions #38693449757](https://github.com/will00t-debug/Ua/actions/runs/38693449757) on `42954f77f5884bde0c81ba0675e7f51d4237c48b`：**V2-C 32/32 PASS**；**Node22 全套 1128/1131 PASS、3 FAIL**。其中共用 `tests/universal-v2-ability-templates.test.mjs` 的 nested after discard 1 項為 A 新模板回歸；`tests/universal-v2-title-pack-contract.test.mjs` 2 項仍固定 TTG23 而這線新卡 TTG24。C 不越權更改三項共用測試，已在 PR70 留重現。
- 共用 A-core 已多次安全合流：`7c3b9b45`、`2231fc0a`、`32256122`、`126f2ec3` 均為包含 A 最新已交付核心為另一 parent 的 merge commit，並以 A upstream 樹＋C 專屬檔案 overlay 保留他線成果。之後 A 新修改 `pack.mjs`，仍須從最新 HEAD 核對後再同步。每次只保留 C 擁有的 title contribution、獨立 pack、CSV、測試與本交接。
- **截至本批實際 TTG 24/81（剩57），SLG 18/80（剩62）**；尚無下一張可由當前共通能力完全實作的印刷效果。待 A 交付相符的 top-N trait/底部排序+條件棄牌、draw3-discard2 原子程序、original BP-filtered outside recovery 後，分別立即解鎖上述 TTG2/SLG2，不可預先標註完成。

### 最新核心 pack 整合與 32/32 實測（Node22）

- 最新已同步的 A 共用核心 SHA：`b02b1aa1c0f9ecd497c32b0df68bf4da1122bfa7`；C 雙親 merge `aa35cd4c1f37f8a2deee47f7d8acff0b030c0964`，整合後的 C 專屬檔案均保留。
- 此 **同一 C HEAD** 真實 [GitHub Actions #38693740496](https://github.com/will00t-debug/Ua/actions/runs/38693740496) 已完成：**C 專測 32/32 通過**；**Node22 全套 1129/1131 通過、2 項失敗**。A 新模板 nested after discard 共用測試已恢復通過，不再列阻塞。
- 唯一剩餘兩項失敗都出自 **`tests/universal-v2-title-pack-contract.test.mjs`** 的固定來源卡號／卡數測試：A 清冊仍為 TTG23，但 C 真實已註冊 TTG24，新增 `TTG-1-077` 已通過 source-evidence compiler 與實戰正反例。主控需要把清冊 TTG 新貢獻改**精確集合**四張 `005,014,019,077`、已登錄24／未移植57、全作品合計已登錄176／未移植524；**絕不改成放任任意數目的弱斷言**。
- 此文件是最後測試結果補錄，本段再提交後若 GitHub 自動觸發 CI，須以新提交對應 run 核對。V2-C 對 SLG-036/037、TTG-010/023 仍 fail-closed，不因 Life 類型已有 handler 便視作完整 Body 能力。無 main merge 或正式部署。
