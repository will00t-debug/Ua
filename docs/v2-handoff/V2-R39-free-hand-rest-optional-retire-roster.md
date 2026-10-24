# UNION ARENA V2｜R39 手中特殊 REST 登場、真退場後 TOP-N 與全庫重掃

日期：2026-10-23（Asia/Taipei）。工作分支 `gpt/v2-resume-20261022`，GPT Draft PR #78 → `cursor/v2-multi-retire-life-6ff5`。未合併 main、未修改 Cursor PR #77、未部署正式站，未 force push。以下均為遠端 GitHub Actions 實測，**不等同逐張完整官方 FAQ 認證**。

## 起始基準與完整批次

- 開工重新確認 R38 最終文件 HEAD `e65e105f43e2b05cf06994e9f937e37a140718ea` 有自己的 [GitHub Actions SUCCESS 39900335086](https://github.com/will00t-debug/Ua/actions/runs/39900335086)；不得以更早的 `010482e1` 綠燈冒用新 SHA。開始時計 325/700、375 未移植、局部獨立審核 13、完整 FAQ 認證 0。
- **Batch A（共用手牌免費 REST 登場）**：`5ea7f549` 新增經嚴格 profile 驗證的 `deployOwnHandRest`，用原本 `effectQueue`／`legalDestinations`／`commitDestination`／`recordCompletedMove`／`applyEffects(onPlay)`，對手不可看未公開選擇。選取依 **印刷** 顏色、必要能源、印刷 AP、卡種與最多 N 張；**效果登場不消耗 normal hand PLAY AP，亦不消耗下一張手牌使用 AP 折扣**。REST 進場後保留實體 UID、`fieldEntryStamp` 和真移動事件；無新登場系統。`c7327826` 增加負例／AI／隱私測試，`67622105` 更新已稽核模板白名單而不是刪除驗證。Actions [39904046707](https://github.com/will00t-debug/Ua/actions/runs/39904046707) SUCCESS。
- **Batch B（SAO-1-056 ユイ）**：`6abf8479` 移植全印刷藍3/AP1/BP2000/ALO、DRAW LIFE；登場時只能二選一：TOP2 查看 0–1 張角色或 FIELD 公開入手，剩餘牌依序放底；或者 0–1 張己方手牌 **藍色 CHARACTER／印刷必要能源≤2／印刷 AP1** 免費 REST 登場。`bfcd8540` 修正 R37 歷史審核不應繼續要求已移植卡留在 unported 名單，`f94008a7` 修正巢狀 `chooseOne` 的 TOP-N 嚴格來源驗證，並將獨立審核改為 14 張而非虛報 FAQ。完整成功 [39904796552](https://github.com/will00t-debug/Ua/actions/runs/39904796552)。
- **Batch C（五作品全庫回查）**：`52083a5d` 擴充**既有** R35 `capabilityIndex()`、保留 `scripts/v2-r35-unported-atom-audit.mjs` 及 R37 TOP-N 報告；對當時 374 未移植實卡全掃，找到 **32 個手牌登場文字候選**（字詞命中不是 READY）、TOP-N **61 個**；未經官方逐卡整文核對不新增 registry。Actions [39904959354](https://github.com/will00t-debug/Ua/actions/runs/39904959354) SUCCESS。
- **Batch D（真正退場後才接續）**：`2953667c` 新增 `optionalRetireThenProgram`：CHARACTER／FIELD 嚴格分型、可選 0、真 `retire()` 成功才接執行 `after`，保留既有 onRetire、來源邊界與保護替代；新增 `traitlessCharacterOrField` 搜尋篩選，不建立新 retire reducer。`871e4e4f` 修復巢狀 AFTER 的 TOP-N 來源驗證，成功 [39905626991](https://github.com/will00t-debug/Ua/actions/runs/39905626991)。`116fc8ed` 依官方全文新增 **SAO-2-056 茅場 晶彦**（紫色 FIELD／必要能源2／AP1／GET，己方 CHARACTER 可選真退場才 TOP5「プログレッシブ」最多2公開入手）及 **MST-1-049 ルーデウス**（綠4/AP1/BP4000／GET，己方 FIELD 可選真退場才自身 ACTIVE 並 TOP4 無特徵 CHARACTER 或 FIELD 最多1公開入手）。新增合法50張對戰、錯 UID、可選不退場、來源／排序／隱私／AI 測試；`4ff1b1ea`／`02876523` 修正洗牌 fixture 搬動來源實體 UID 的錯誤，`6196d2a5` 補測可合法選 1/2 的結束選擇，最終 [39926357548](https://github.com/will00t-debug/Ua/actions/runs/39926357548) SUCCESS。
- **Batch E（新原語完成後第二次全庫重掃）**：`97acfeb1` 以同一 `capabilityIndex()` 再掃 **372 張當前未移植真卡**，取得 **8 個真退場＋TOP-N 文字候選**（一律待全文核對，無自動 READY），同時重新輸出 **32 個手牌登場文字候選**與 **59 個 TOP-N 文字候選**。另一條可重現的 `tests/v2-r39-retire-roster-recall.test.mjs` 證明全700 ID 唯一／當前372 ID 全掃／已登錄三張不再算 unported／候選不假裝 READY。成功 [GitHub Actions 39926750588](https://github.com/will00t-debug/Ua/actions/runs/39926750588) 對應完整程式 SHA **`97acfeb159eee068eba0ebf08039651baa7cdd58`**：Node.js 22 **1962/1962 PASS**、矩陣 **60/60 PASS**、獨立 manifest、來源認證帳本、R35／R37 及 unported 報告皆成功。**本份文件／之後 HEAD 仍需另查對應 SHA 的新 CI**。

## 五作品即時正式登錄（R39 完成程式 CI）

| 作品 | 已登錄 | 尚未移植 | 總來源 |
| --- | ---: | ---: | ---: |
| BLEACH | 98 | 178 | 276 |
| TTG | 36 | 45 | 81 |
| SLG | 43 | 37 | 80 |
| SAO | 97 | 86 | 183 |
| MST | 54 | 26 | 80 |
| **總計** | **328** | **372** | **700** |

新增完整真卡 **SAO-1-056、SAO-2-056、MST-1-049（3 張）**。局部獨立官方來源／效果情境紀錄從 **13→16**；**全面逐張官方 FAQ 認證仍為 0**。掃描了 372 張、文字候選 32／8／59，絕不稱候選數為完成整卡人工審核或 READY 卡數。本輪新原語以現有 DSL、打包器／manifest 和既有 region move / AP / TOP-N / retirement event 為唯一真實來源，沒有新平行資料庫。

## 官方來源、下一輪優先及安全界線

完整卡文來源：[SAO-1-056](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-056)、[SAO-2-056](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-056)、[MST-1-049](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-049)。從手牌效果登場的印刷 AP／能源為候選條件，沒有再另付 AP，也不是一般正常手牌使用、不是自動 Raid；退場後必須有真正區域退休事實才能進行 AFTER。對每張卡完整印刷／FAQ 範圍仍須持續擴大負例，不能將本輪 16 個局部審核升為獨立 FAQ 認證。

建議接續順序：**1.** 逐張人工確認本輪 32／8／59 文字候選中可完整重用 DSL 的真正 READY；**2.** `cannotBeChosenByOppEffect` 對 SAO-2-058／MST-1-067 的「根本不可選擇」與既有 `selectionApTax` 嚴格區分，官方 Q1206／Q2162，需先合法 UID 負例；**3.** BLC-4-069 攻擊結束交換前先釐清官方 Q2337／Q2338 和 LIFE 時序。BLC-4-034 強制 REST→真退場→裏向底卡回收時點以及缺乏官方充分依據的巢狀第二批 LIFE，繼續維持既有 fail-closed，不得隨意打開。沿用 PR #78、不改 Cursor PR #77、不合 main、不部署、不 force push。
