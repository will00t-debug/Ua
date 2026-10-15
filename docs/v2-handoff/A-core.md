# [V2-A / Cursor] 核心主控最終交接 — 停止新增開發（2026-10-15 台灣時間 19:21 後）

> **請優先讀本段**；下面各節保留歷次研發紀錄，包含已過期的 175／525、初次提交與正在開發的描述。這一輪明確轉交 Cursor，**不再繼續新增功能，不合併 main、不部署正式站、不覆寫其他人的分支**。
>
> **本輪本身僅提交此交接文件，沒有變更任何程式、測試、卡片資料、預覽入口或正式網站。** 自身交接文件的最後 Commit SHA 在 GitHub 完成 push 後，請以 PR #70 最新 HEAD／此檔案 commit 歷史為準（Commit 不能在自身內容中可靠地自我引用）。

## A. 分支與可重現固定版本

- Repository：[will00t-debug/Ua](https://github.com/will00t-debug/Ua)，Draft [PR #70](https://github.com/will00t-debug/Ua/pull/70)。
- **本線唯一工作分支**：`feature/universal-rules-v2-foundation-20261014`；目標 base 為 `main`；PR #70 保持 **OPEN / Draft**。
- **最後可驗證雙 CI 綠燈程式 HEAD（本次僅文件前）**：`75468867b7ec4f5cdd78661e5b98f400494fb94d`（短碼 `75468867`）；上一核心合入 B 六卡 `a39a72ee955c952eaa22ce647cafec475f682952`，修過時的固定拒絕測試及矩陣觸發 `75468867b7ec4f5cdd78661e5b98f400494fb94d`。未完成的系列線不能冒充已合進此 Commit。
- 先前 BLC-1-030 穩定雙 CI 基準：`3f6348578b7e3e32a6cd12c66475e8228db0b690`，之後已累積正式 BLEACH 六卡整合與新牌頂效果，不得拿 3f634857 當本輪最新程式。
- 本工具環境 `pwd=/`，`git rev-parse --is-inside-work-tree` 回傳 `fatal: not a git repository (or any of the parent directories): .git`；`/mnt/data` 無本地 Git checkout。因此**沒有本地工作樹可執行 `git status` 或發現／保存本地 uncommitted 檔**；已核實本線成果存在 GitHub Commit 上。本次交接是 GitHub API 對上述分支直接建立文件 commit 並 push，並非聲稱執行了本地 git add/commit/push。
- 同步／重新下載：`git fetch origin feature/universal-rules-v2-foundation-20261014`；`git switch -c cursor/v2-handoff origin/feature/universal-rules-v2-foundation-20261014`。後續 Cursor 請自行新建工作分支；不要 force push 或覆寫其他線的 PR。

## B. 主控程式已完成並已保存

- 真正共用的 `dist/universal-v2/{engine.mjs,pack.mjs,ability-templates.mjs,ai.mjs}`；合法動作、AP／能源成本、Raid、生命 Trigger、佇列、私密選牌、跨作品 50 張 UID／印刷卡號守恆，**仍有邊界裁定待個別 FAQ 驗收**。
- 五作品用獨立 `dist/universal-v2/title-packs/{bleach,ttg,slg,sao,mst}.mjs` 交付，再由 `registry.mjs` 註冊；每張需完整日版來源／數值／能力程式及測試。沒有落地的卡不能翻 flag、不能借舊引擎冒充。參考 `V2_WORKSTREAM_HANDOFF.md`。
- BLEACH 的 BLC-1-030 強制不限 BP REST、無合法敵前線不可使用事件（官方 Q1119）、已 REST 可再指定（Q91）均已修，**不是待修 bug**。新牌頂 `peekTopOrBottom` 和 `inspectTopAnyOutside` 已實作；BLC-2-055、BLC-4-013 已正式整合，見下方原始測試紀錄。
- 私人 V2 預覽、BLEACH／TTG 真卡試牌、五作品矩陣／審計和回放除錯均保留。**最近程式 HEAD 未再次部署 Preview，也未做真實 Android/iOS 瀏覽器完整點擊驗收**；不要把 Node.js AI 完局稱為手機真機完成。正式站不動。

## C. 精確卡數：已整合 != 完全終驗

| 作品 | 去異圖/AP 普通卡 | 主線 V2 已註冊 | 未移植／阻塞 | 全部日本官方 FAQ 完整終驗 |
|---|---:|---:|---:|---:|
| BLEACH | 276 | **78** | **198** | **0（未提出逐卡完整終驗證據）** |
| 天元突破 TTG | 81 | **23** | **58** | 0 |
| 我獨自升級 SLG | 80 | **18** | **62** | 0 |
| 刀劍神域 SAO | 183 | **39** | **144** | 0 |
| 無職轉生 MST | 80 | **23** | **57** | 0 |
| **總計** | **700** | **181** | **519** | **0（嚴格口徑）** |

- 前 35 張屬原 Pilot，其餘新貢獻 BLEACH **63**、TTG **3**、SLG **18**、SAO **39**、MST **23**，合併 181，不重複計數。
- 固定來源與清冊：`tests/fixtures/v2-integrated-id-manifest.mjs`、`docs/v2-handoff/B-bleach-inventory.csv`、`scripts/v2-unported-report.mjs`。舊 `docs/V2_UNPORTED_IDS_525.md` 是 **175 張時期的歷史快照**，不能當 181 張版的剩餘清冊。需要在 Cursor 固定 HEAD 重新產生完整 519 個號碼，不要從不同 HEAD 混數。
- 已有全真 50 張多作品測試 deck 可完局，不代表 181 張都在同一預覽介面可任意選牌，也不代表全部官方條文逐卡完成。

## D. 確實已跑過的測試：同一來源碼 SHA

**所有下列雙 CI 均在程式 HEAD `75468867b7ec4f5cdd78661e5b98f400494fb94d`，不是本次純文件 commit 的測試：**

1. `npm test`（Node 22；GitHub Actions [38694133956](https://github.com/will00t-debug/Ua/actions/runs/38694133956)）：**1143/1143 PASS、0 FAIL**；Browser syntax／static entry 也執行成功。
2. `five-title-legal-matches`（[38694131961](https://github.com/will00t-debug/Ua/actions/runs/38694131961)）：**60/60 全局完整對戰 finished，0 failures**，有 [同次產物](https://github.com/will00t-debug/Ua/actions/runs/38694131961/artifacts/11953377211)。五作品不同配對與先手／固定 seed，統一共用 V2 reducer。
3. 倒數第二個整合 commit `a39a72ee...`：矩陣 [38693943245](https://github.com/will00t-debug/Ua/actions/runs/38693943245) PASS，但全套 [38693948117](https://github.com/will00t-debug/Ua/actions/runs/38693948117) FAIL（已整合新 B 卡後過時的固定拒絕測試）；最終程式 commit `75468867` **已消除此回歸**。不可把中間紅燈當最新現況。
4. 本次交接**沒有本地 Node 環境 checkout，也沒有重新啟動手動測試或部署**；上述為已實際完成 GitHub Actions 原始日誌，非推測。

## E. 各子工作線最新 HEAD：未整合 WIP 逐卡列出

以下均為本次交接時相對於 `75468867b7ec4f5cdd78661e5b98f400494fb94d` 的 **PR 分支候選差異，不包含在主線 181 張**，不得在交接階段擅自 merge/cherry-pick，不可稱已完成終驗：

- **[V2-B] PR #73**，`feature/v2-bleach-port-20261015` @ `2a502f01ec1e29a98c44e45e12f4aaa5a9753222`：較主線多 `BLC-4-023` **1 張（WIP／待來源與 QA 複核）**；B 分支與主線分岔（compare `diverged`），原有 78 張主線 BLEACH 已保留；不能直接覆蓋主線 `bleach-pack.mjs`。
- **[V2-C] PR #72**，`feature/v2-ttg-slg-port-20261015` @ `29ddd3ffdc5379584923539a8323ee7ec09d6add`：較主線多 `TTG-1-077` **1 張（WIP／待 QA）**；原本 23 TTG、18 SLG 主線均保留。
- **[V2-D] PR #74**，`feature/v2-sao-mst-port-20261015` @ `b2b10f2f0ecd4ce41c04d863b2476da1ae302667`：較主線新增 **SAO 14 張** `SAO-1-107`、`SAO-2-072`、`SAO-2-017`、`SAO-2-030`、`SAO-1-032`、`SAO-1-063`、`SAO-1-098`、`SAO-2-057`、`SAO-1-075`、`SAO-1-089`、`SAO-1-003`、`SAO-1-052`、`SAO-1-073`、`SAO-2-048`；另新增 `MST-1-010` **1 張**。合計 **15 張 WIP／待來源與完整測試再驗**；尚未整合到主線 39 SAO／23 MST。
- **[V2-E] PR #71**，`audit/v2-full-catalog-20261015` @ `0b8581f771151e68c89da1560459d921409764bf`：獨立驗收文件／測試更新仍在 E 分支；compare `diverged`，不能不經核對直接用其舊統計覆蓋 181 張主線。
- 總計另有 **17 張已看到獨立候選身份**（BLEACH 1、TTG 1、SAO 14、MST 1），**未列入 181**；仍有 **519 張主線未移植**（包含上述候選）。這只是差分辨識，**未執行這些最新分支各自 HEAD 的完整回歸、也未對每張完整 FAQ 作獨立終驗**。如要整合，請先比較來源 Pack 中完整印刷 pin、固定 manifest、系列專測，再以新整合 Commit 跑全套與 60 局；不要以本段候選卡數直接加上主線數稱作已成功。

## F. Cursor 下一個明確安全操作（本輪不替 Cursor 執行）

1. 從 GitHub 抓 PR #70 **最新 HEAD**（比照本輪文件 commit／程式 SHA），以此開 Cursor **自己的新分支**，確認 `git status` 與分支現況。
2. 先重跑 `npm test`、`node scripts/v2-unported-report.mjs` 和 `node scripts/v2-integrated-match-matrix.mjs`，留存 **同一 SHA** 日誌／矩陣產物。不要再重做已完成 030、055、013 的核心能力。
3. 分別檢查 #73/#72/#74 的 **17 張候選** 及 E 線獨立驗收材料，受控移植到 Cursor 自己的分支；任何 source/fingerprint、合法成本或 QA 不能通過者仍標 `WIP`，不要拉高正式 V2 已移植數。
4. 首要剩餘核心缺口：印刷專屬啟動成本／self-REST 成本、限制卡的特殊組牌數（例如 `MST-1-051` 的一張限制）、條件持續效果、跨層 Raid／特殊 Attack、生命 Trigger 特殊時序和延遲效果。例子 `BLC-1-005` 需付自身 REST 並阻止空目標支付；不能轉呼叫舊引擎或忽略效果。
5. **不合併 `main`、不部署正式站**；私人 Preview 保留但本輪未發佈新版本。任何未驗證之效果保持未完成。

## G. 本輪工具／資料安全聲明

- 讀取工具：GitHub `get_pr_info`／`fetch_file`／`fetch_workflow_run_jobs`／`fetch_workflow_job_logs`／`compare_commits`，已核對 HEAD、原始 CI 結果與外線差分。
- 本地 `git rev-parse` 的原始錯誤：`fatal: not a git repository (or any of the parent directories): .git`，故本輪不是在可寫本地 repo `git commit`；**實際保存方式是 GitHub 直接提交文件並由連接器推送 branch**，會在下一則結果核對 commit SHA。
- 兩次批量讀取腳本曾報 `SyntaxError: Invalid regular expression flags` 與 `Code Mode exceeded the maximum number of tool calls.`，已縮小批次繼續取得相同來源資料；**沒有因此回退、寫入或 force push 任何程式**。
- 本文僅交接，所有正在提議的新增程式均標 WIP，無開發／部署中的背景程序。

---

# [V2-A] 共用核心與五作品整合交接 — BLC-1-030 回歸修復穩定版

**台灣時間 2026-10-15；整合主線 PR #70（Draft）**  
**給 V2-B 同步的最後雙 CI 綠燈程式基準：`3f6348578b7e3e32a6cd12c66475e8228db0b690`**（`3f634857`）。  
**最新文件快照另有純文件提交** `bb14e5d74000c7a9284944315afdf52ee4be5b4e`（525 張清冊及 B 逐卡 CSV）；後續本文件再追加一筆純文件提交。請以每次 GitHub 最新 HEAD／工作樹及實際 CI SHA 為準，不可把文書 SHA 的 CI 宣稱成已執行。

## 最新阻塞診斷與修復（停止擴卡；未重做五作品）

**問題根源經實際 GitHub Actions log 定位，不是推測：**

1. `a44159c1e41cf147f9ae43668001620b9e7b9364` 將 BLC-1-030 加入 `bleach-pack.mjs`，BLEACH 獨立 addon 56 → 57；`title-packs/bleach.mjs` 仍強制 `entries.length===56`。因此 `Error: BLEACH V2 contribution cardinality or ID drift` 在 registry 載入階段拋出，使完整 `test` 和矩陣多數測試未進入真對局。當時 `test` **1023/1040、17 失敗**；矩陣未執行 60 局。
2. 來源 fingerprint `checkedBleachAddonDefinition()` 要求官方卡庫身份、商品編號、名稱、顏色、能量、AP、BP、產能、事件類別、效果全文完全相符。新加入的 BLC-1-030 通過此條件；**不是卡面資料錯誤**。但舊的獨立拒絕測試仍斷言「BLC-1-030 未移植」，以及其他清冊僅允許 56／總 71／已移植 174；這些已不符合**明確來源鎖定的新增卡號**，不是應將斷言改為任意動態數字。
3. `9a782b5b06bd1769c30c0b4e84ac643b3f7989c5` 修復真實核心漏網：依官方 **Q1119**，強制「選 1 張」的事件在敵方前線**沒有合法目標時不能使用**，不得付 AP 或送事件至場外；自動合法操作產生器應預先拒絕。沒有任意 BP 上限，仍須透過 pending 選擇合法對手 UID。該版已保留 57 addon／72 BLEACH，完整 test **1112/1117、5 失敗**，矩陣則因固定 174 舊數字拒跑。
4. 最終程式修復 `3f6348578b7e3e32a6cd12c66475e8228db0b690`：修正多檔**來源鎖定清冊測試**與矩陣精確數字為 175，重新驗證 57 新卡／15 舊 Pilot／72 BLEACH；`tests/universal-v2-unbounded-rest.test.mjs` 新增實際 Q1119 無敵方目標不得用事件、可選事件無目標可使用、官方 **Q91** 已 REST 的角色仍可被選並 REST。保留原來 BP 9000 仍合法必選、不允許 null、支付 AP、UID 守恆與延後佇列驗證。
5. 隨後文件專用提交 `bb14e5d...`：更新 `docs/v2-handoff/B-bleach-inventory.csv` 單張 030 的 29 欄驗收狀態；新快照 `docs/V2_UNPORTED_IDS_525.md` 排除已入 V2 的 030；舊 `526` 快照留存且標示歷史。**沒有變更實際效果或增加另一張卡。**

## 嚴格分層卡表基準（去除異圖/AP）

| 作品 | 官方普通卡 | 舊 Pilot | V2 新貢獻 | V2 已登入 | V2 未移植 | 全部官方效果/FAQ 終驗 |
|---|---:|---:|---:|---:|---:|---:|
| BLEACH | 276 | 15 | 57 | **72** | **204** | **0（不冒稱終驗）** |
| 天元突破 TTG | 81 | 20 | 3 | **23** | **58** | 0 |
| 我獨自升級 SLG | 80 | 0 | 18 | **18** | **62** | 0 |
| 刀劍神域 SAO | 183 | 0 | 39 | **39** | **144** | 0 |
| 無職轉生 MST | 80 | 0 | 23 | **23** | **57** | 0 |
| **總計** | **700** | **35** | **140** | **175** | **525** | **0** |

卡號鎖定來源：`tests/fixtures/v2-integrated-id-manifest.mjs` 的 BLEACH 精確 57 新卡號 + 15 Pilot；`dist/universal-v2/title-packs/bleach.mjs` 契約拒絕來源／數值／重複錯誤，**不能用動態計數迴避漏卡測試**。其餘 TTG/SLG/SAO/MST 不變。已註冊 Pilot 數不是 700 張完整可玩進度，也不是每張官方 FAQ 逐例通過。

## 同一程式 SHA 的實際測試結果（Node 22）

- **全套回歸 `test`：1119/1119 PASS、0 FAIL**，`3f634857`，GitHub Actions [38678776548](https://github.com/will00t-debug/Ua/actions/runs/38678776548)。
- **五作品完整 50 張真卡 AI 矩陣：60/60 finished、0 失敗**，**同一 `3f634857`**，GitHub Actions [38678772958](https://github.com/will00t-debug/Ua/actions/runs/38678772958)；[保存的 JSON Artifact](https://github.com/will00t-debug/Ua/actions/runs/38678772958/artifacts/11947446978)。
- 矩陣為 10 組不同作品配對 × 2 個先手 × 3 固定牌序 seed；每步走同一 V2 reducer 的合法 action，檢查不同實體卡片 UID 與已註冊 50 張真卡。**60 局成功不等於 175 張完整 FAQ 通關，也不等於其餘 525 張有能力**。
- 前一版最後雙 CI 不一致：`a44159c` [test 38677164665](https://github.com/will00t-debug/Ua/actions/runs/38677164665) 17 fail、[matrix 38677160136](https://github.com/will00t-debug/Ua/actions/runs/38677160136) 在載入期中止。修復版測試反例已分開證明是 registry 阻塞、舊清冊和真正事件合法性差異。

## 030 日本官方來源及使用合法性

- 官方 [UA08BT/BLC-1-030 The Jail](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-030)：黃 2、AP 1、事件，印刷效果「相手のフロントLのキャラを1枚選び、レストにする。」；無 BP 上限、強制選**一**張、不可 `uid:null`。
- [日本官方 Q1119](https://www.unionarena-tcg.com/jp/faq/list.php?number=1119)：事件若必須「選 1 張」而**無合法目標，不可以使用**（無須也不可先消耗 AP）；「最多 1 張」可選 0 張則不適用相同限制。
- [日本官方 Q91](https://www.unionarena-tcg.com/jp/faq/list.php?number=91)：已 REST 的角色仍可被指定 REST；不用為使其狀態再變化而剔除。生命 ACTIVE trigger 依共同 V2 引擎為指定己方角色 ACTIVE 並本回合 BP+3000，和事件一般效果分流。
- Test 覆蓋 `tests/universal-v2-unbounded-rest.test.mjs`、`tests/universal-v2-bleach-enemy-control.test.mjs`、`tests/universal-v2-bleach-registry.test.mjs`；後續 B 應按實際官文擴增逐例，尚不能宣稱 BLC-1-030 所有 FAQ 終驗。

## B／C／D／E 如何安全同步

1. 在自己的分支 `git fetch origin feature/universal-rules-v2-foundation-20261014`，核對 GitHub 上 `docs/v2-handoff/A-core.md` 及最新 PR #70 HEAD；若需逐個核心修正，來源碼為已證實雙 CI 綠燈的 `3f634857`。
2. B：**不要再把 BLC-1-030 列在「尚未移植」阻塞卡**；B 原有 56 張貢獻不重複，A 在同一 `bleach-pack.mjs` 新增第 57 張；來源表增至 BLEACH 72／204。B 若更新自己的 PR #73，需受控 merge／cherry-pick，保留既有獨立改動，不覆蓋其他作品主權檔，且重新在同步後的 HEAD 跑 CI。
3. C、D：沒有修改 TTG/SLG/SAO/MST 定義及對應資料；不可把 A 的重新計數當作新增了你們的卡。E：從**同一固定 HEAD**重跑清冊、完整 V2 回歸及 60 局，官方全效果驗收仍保留 0 直到有逐卡正反例。
4. **限制不變**：V2 Draft，不合併 `main`、不部署正式站；私人預覽仍用已指定的真卡 50 張 deck，030 不是目前預設 deck 的成員。預覽可用與 registry 已載是不同指標。

## 下階段 P0（本輪凍結擴卡）

本輪專注修最新回歸，不啟動下一批新卡。之後才處理通用非 AP 支付、持續效果、Raid 多層與時序、生命 Trigger、延遲觸發；遇到核心缺口請在 PR #70 提交精確卡號、日文印刷和反例，而不是沿用不同作品舊引擎或把 unsupported 卡標成通過。


## 2026-10-15 新批次：解除擴卡凍結（單張私密牌頂移牌處置）

**解除上一輪停止擴卡的暫行凍結。** 保留原 175 張已註冊／525 張待移植的精確卡號鎖定；上一輪 BLC-1-030 及 Q1119 修復不重做。依 B/C/D 未移植卡文，能在單一能力修正後完整移植的保守候選：**牌頂去向 2 張**（BLC-2-055 頂／底、BLC-4-013 頂部2張任意數量送場外）、**抽 N 棄 M 至少 1 張**（SAO-1-107）；IMPACT/DAMAGE、成本與同名限次混有其他條件，不能將字串命中當已解鎖卡數。

本批共用核心 `peekTopOrBottom`：提供 **私密看牌庫頂 1 張後置頂或底**，與舊 `peekTopOne` 的「頂或場外」嚴格區分；牌庫空時不建立 pending。代表卡 EX07BT/BLC-2-055 麒麟寺天示郎已用來源對照的 V2 測試卡包驗證正反例。B 線唯一主責 `bleach-pack.mjs`／`title-packs/bleach.mjs`，請以 `templateEffects:{onPlay:[{template:'peekTopOrBottom'}]}` 移植該真卡，更新來源指紋及**固定**清冊與反例後提交 PR #73；A 不越權修改系列定義，故此提交本身**沒有新增正式註冊卡號**。下一項 BLC-4-013 須新增任意多張送場外再排列牌頂，不能假用既有最多一張的模板。下一筆待填入同 SHA CI 結果／B 可同步 commit。


### 2026-10-15 牌頂處置第二項：完整共用核心交付（B 專屬註冊仍待交付）

- 本輪已**解除擴卡凍結**，在 A 核心實作並測試兩項不同能力：
  1. `peekTopOrBottom`：EX07BT/BLC-2-055 麒麟寺天示郎所需之「私密看牌頂一張後置頂或底」。已新增 `tests/v2-core-top-bottom-source.test.mjs`：選頂／底、拒絕 outside、空牌庫、對手隱藏、實體 UID 守恆。共用接口 `{template:'peekTopOrBottom'}`。
  2. `inspectTopAnyOutside`：EX15BT/BLC-4-013 友哈巴赫所需之「看牌庫頂兩張，任意 0～2 張送場外，其餘可依指定順序置頂」。`tests/v2-core-top-any-outside-source.test.mjs` 覆蓋送出 0、1、2 張、完整倒序、私密資訊、無法重複選同 UID、短牌庫、非法數值及 UID 守恆；可一般化 count 2～4 與 rest top/bottom。共用接口 `{template:'inspectTopAnyOutside',count:2,rest:'top'}`。
- **現有固定 175 張已註冊身份及 525 張未移植清冊不變**：這兩份是真實印刷卡號作為核心來源錨點的獨立能力測試包，不代表 B 已提交完整來源指紋及正式 V2 作品註冊。A 不改 B 的 `bleach-pack.mjs`、`title-packs/bleach.mjs`、系列專測／清冊。
- 請 **V2-B（PR #73）** 於自己的分支登錄 **BLC-2-055、BLC-4-013**，在 `checkedBleachAddonDefinition()` 加入日文印刷指紋、對應 `templateEffects`、真卡正反例、Life Trigger 與全卡正式 registry；**固定 B 清冊**需從 57 → 59 個新貢獻、BLEACH 72 → 74、未移植 204 → 202、整體 175 → 177、未移植 525 → 523（且僅當 B 的兩張都經完整驗證後）。未收到 PR #73 對這兩卡的提交前，不得提前更新任何註冊數。
- 下一候選 **SAO-1-107**「抽 3 棄 1」必須保留逐次私密棄牌和牌庫不足／隊列合法性；其後 Impact/Damage 及特殊成本仍需排除多能力混用，**不是目前已完成**。
- 既有 `peekTopOne`「頂／場外」與 `inspectTopArrange`「最多一張送場外」完全保留；不能把三種不同原文視為相同效果。**穩定 commit／全套及 60 局測試結果**以最後一次雙 CI 同 SHA 綠燈補錄，未全綠前請 B 勿直接同步。


### 本批共用組合契約補充（與本次 CI SHA 同檢驗）
`payDiscardThen` 現可在實際支付一張手牌後排入 `peekTopOrBottom` 及 `inspectTopAnyOutside`；不支付時兩項都不能偷偷執行。這不是宣稱新增任何另一張正式印刷卡。源卡 BLC-2-055 與 BLC-4-013 正式接入仍由 B 線和固定 ID 清冊核對；A 提交與 PR #73 交接留言已送出。


## 新批次正式整合 B 的六張原卡號（此段狀態優於上文舊快照）

由 PR #73 固定來源 `a0e0373cee1ed5ca9b126d110036737f602c0ca2` 帶入六張身份：**BLC-1-059、BLC-1-077、BLC-2-055、BLC-3-006、BLC-3-009、BLC-4-013**。BLEACH 本線 addon 從 57 → 63（既有 57 張完全保留）；加上 15 原 Pilot，共 **78／276 已註冊，198 未移植**；TTG23／SLG18／SAO39／MST23 保持不變，五作品共 **181／700，519 未移植**。獨立 `tests/fixtures/v2-integrated-id-manifest.mjs` 按六張固定卡號擴充，沒有以動態來源統計取代檢查；共同核心新增的 `peekTopOrBottom` 和 `inspectTopAnyOutside` 由 B 的印刷卡片 BLC-2-055 和 BLC-4-013 正式落地。所有工作只在 Draft PR #70，不碰 main/Production。不宣稱 181 張已完成每張 FAQ 終驗（嚴格仍 0）；交付穩定 SHA 以本輪雙 CI 同一 HEAD 結果核對。


### B 正式整合後的舊拒絕測試修正（不可假裝卡片仍未移植）

BLC-4-013 原本在 A 核心正反例測試中要求 **尚未註冊**（B 工作線未交付前的保護）。在 B 的 63 卡來源白名單由 PR #73 正式整合後，此拒絕條件不再正確；現已改為**明確要求 BLC-4-013 出現在正式 registry、完整 DSL 嚴格等於 `inspectTopAnyOutside(count:2,rest:top)`、官方紫/黃色及能源資料與核心測試一致**。BLC-2-055 同樣由測試固定核對 `peekTopOrBottom`，不是刪掉防錯或動態放行未知卡。另將兩張來源正反例與固定 ID manifest 加入五作品 60 局矩陣的 CI 路徑觸發，確保後續卡包登錄數變動時同一 SHA 同時跑全套與矩陣。最新可同步版本以本輪兩個 GitHub Actions 實際綠燈的 HEAD 為準，早期 `45ea2e3`／`3f634857` 已是歷史。
