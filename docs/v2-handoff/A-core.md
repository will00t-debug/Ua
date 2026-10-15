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
