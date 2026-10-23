# UNION ARENA V2｜R38 印刷必要能源上限、共用 TOP-N 與五作品全庫重用

日期：2026-10-23。只在 `gpt/v2-resume-20261022`、GPT Draft PR #78；目標 `cursor/v2-multi-retire-life-6ff5`。未修改 #77、未合 main、未部署正式站、未 force push。本文件為程式／來源驗收，不聲稱任何卡已完成所有官方 FAQ 獨立認證。

## 基準與五批開發證據

- 開始時確認 HEAD `0af57fc643ba46c34b75599e7afc50edbc067786` 的成功 Actions [39896263208](https://github.com/will00t-debug/Ua/actions/runs/39896263208)，不是沿用舊版綠燈。
- **A：印刷必要能源上限** `6dbc75678135ea90657927c3c300d6b3b68081d1`；fixture 修正 `c764dbef42fcd622ff408802b5e596b526321c34`，[39897627514](https://github.com/will00t-debug/Ua/actions/runs/39897627514) 成功。共用 `printedRequiredEnergyAtMost` 只比較 `d.energy`，不把 `d.gen`、當前場上產能、BP、暫時 buff 混入必要能源。既有 `handPlayApPlan`、`matchesPrintedPlayFilter` 與 TOP-N `matchesFilter` 重用此條件；嚴格 validator 支援 type、trait、name OR、必要能源上限。
- **B：TOP-N 最多一張無棄牌** `ae06d3a5658dadf3f50b9a1770cf54fadc4e603e`、測試修正 `9684c0f1cd65e1a2ce97415e3a0014879d0a5a5f`，[39898210670](https://github.com/will00t-debug/Ua/actions/runs/39898210670) 成功。新的 `searchTopUpToOneBottom` 是模板層的單張特化，runtime 重用 R37 `searchTopUpToTwoBottom` 物理 UID／選擇序列／牌庫底排序流程；沒有第三套效果佇列。**BLC-1-070** `a82bbcf52457f171b053177d2a684b31ad0c91ca` + 真卡測試 `3ddc126ef5036f9f010fc1d123795536ca112a5c`：綠6/AP1/BP4000、護廷十三隊、Raid〈卯ノ花 烈〉、TOP4 0–1 張護廷十三隊＋角色＋必要能源≤4公開入手、餘卡底排序、下個合格手牌角色必要能源≤4 AP−1、LIFE RAID。測試 50 張合法牌、0/1 選取、非法 UID、只公開取得卡、存讀檔、Normal/Hard、跨作品；不符合條件的使用不消耗 discount。
- **C：MST-1-031** `ab8103f309a163179e1d54f4e797c03e0969a59c` + 真卡測試 `1f518ad0ecea38529b591305801df5bfaa08f675`、測試修正 `0479be86f77df1d6638fb15653c46fdc26f31fd8`。藍4/AP1/BP4000、Raid〈ロキシー〉、Impact 無效、己方本回合已成功使用 EVENT 時 Impact 1、下個從手牌使用必要能源≤3 EVENT AP−1、LIFE RAID。新的共用 live predicate `ownEventUsedThisTurn` **讀取既有 `zoneMoveEvents`** 實際手牌 EVENT 使用 HAND→OUTSIDE reason=rule，核對 controller／turn／原始卡面 type，無新 ledger；`universalImpact` 已有來源封印保護。官方 [MST-1-031](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-031) 與 Q2152：非合格卡不消耗 AP 減費。測試實際合法事件、取消／假 UID、當回合、合格 AP、Impact 差異與 AI。
- **D：SLG-1-046** `7c72507de0a7c69a32d6eb32fd984b3fe263b830`：直接重用 `searchTopOneBottomDiscardWhere`，無專用 op。綠1/AP1/BP2000、TOP4 〈水篠 旬〉或〈デイリークエスト〉0–1 張公開取得，未選牌底排序，成功取得時手牌強制棄一；沒有印刷 LIFE。獨立逐卡官方資訊與 CSV `ecba8aff279f34a998345dcdcdb24d132a8f4a24`、合法 50 張選 0/1 與隱藏 UID 測試 `3b0cdddcc3d3e0357725d730937bf47c0cd7480d`；補正 FINAL 比例、測試重複搬走同一 physical UID `ea0b6a4`、`2147426`、`010482e1a40e1984f79129e694e535d22ddcad2d`。官方 [SLG-1-046](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-046)。
- **E：共享五作品全庫盤點與缺口更新** `ce2bf4846a1576905844ee67d3d3cf2924750ef6`：重用 `capabilityIndex()`、R35 atom、R37 TOP-N 搜尋，不建第三套候選資料庫；把 BLC-070/MST-031 既有的歷史 missing atoms 標為已解鎖，逐卡官方核對 [SAO-1-056 ユイ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-056)。

## 目前正式真卡與能力重用

| 作品 | 登錄 | 尚未移植 | 總張 |
|---|---:|---:|---:|
| BLEACH | 98 | 178 | 276 |
| 天元突破 TTG | 36 | 45 | 81 |
| 我獨自升級 SLG | 43 | 37 | 80 |
| 刀劍神域 SAO | 95 | 88 | 183 |
| 無職轉生 MST | 53 | 27 | 80 |
| **總計** | **325** | **375** | **700** |

本輪正式新登錄 **BLC-1-070、SLG-1-046、MST-1-031，三張**。獨立完整官方 FAQ 認證仍是 **0**；局部來源／情境審核 **13**（歷史 10 + 本輪 3），不可稱為完整逐 FAQ 認證。R38 此次對 4 張未登錄／已登錄候選核對了**官方完整印刷卡文**：前三張已整卡入 registry，第四張 SAO-1-056 嚴格保留未移植；這個 4 張的「來源全文人工檢視」不是 ledger 的 13 張數，也不是完整官方 FAQ 認證。

## E 全庫候選回查

使用最新版 inventory 與 `capabilityIndex()` **逐一走訪 375 張尚未移植 ID**，R37 維持同一真卡檢索分類及五作品全部來源文字：TOP-N 文字候選原 64，移植 BLC-1-070、SLG-1-046 後是 **62**：BLEACH28、TTG7、SLG10、SAO12、MST5。不能把字串命中誤判為 DSL 可完整移植。

- **SAO-1-056**：**NEAR READY**。官方藍3/AP1/BP2000/ALO，DRAW LIFE，登場時二選一：A. TOP2 挑 0–1 角色 OR FIELD 公開入手、餘牌底排序；B. 從己方手牌免費讓 0–1 張藍色、必要能源≤2、AP1 的角色以 **REST** 狀態登場。模式 A 能重用現有 `searchTopUpToOneBottom` + `chooseOne`；模式 B 尚需可安全在選擇模式內使用的 `chooseOneFreeRestHandCharacterWithPrintedColorEnergyAp`（從己方手牌真正移區、實體 UID／印刷條件、可選 0、來源與下一個動畫時點、禁止多收 AP）。不登錄半張卡。
- **SAO-2-056、MST-1-049、SLG-1-059**：仍 **PARTIAL**，沿用 R37 已核對全文的精確 blockers；依賴真正可選退場後的效果接續、TOP-N 其他原語、攻擊後跳過下次 ACTIVE 等，不能只因 TOP-N 已有就登錄。
- 其餘 **58** TOP-N 文字候選仍 **REVIEW PENDING**，不是 READY。分類 `ONE_HAND_REVEAL`、`TWO_HAND_REVEAL`、`TOP_TO_OUTSIDE`、`TOP_REARRANGE`、`TOP_OTHER` 需逐卡核對官方所有印刷能力。TOP-N 全部 62 張已掃來源，但正式逐卡來源全文審核不能寫成 62 張。全庫剩下非 TOP-N 313 張同樣未預設已審核。
- R35 其餘印刷減費/共用缺口維持既有 source pins，尚無驗證為新的安全 READY 群，不硬登錄。

### 下一輪優先序（按可重用性、風險而非只看候選數量）

1. **低風險** `chooseOneFreeRestHandCharacterWithPrintedColorEnergyAp`：先完成 SAO-1-056 的模式 B 並全庫回查所有免費／REST／印刷能源受限手牌登場的其他作品，確保生命周期、AP 原子、來源 UID。
2. `optionalRetireThenProgram`：先真實退場與 pending 來源，再串接 SAO-2-056／MST-1-049 的不同型別及後續分支。
3. `cannotBeChosenByOppEffect`：SAO-2-058（Q1206）／MST-1-067（Q2162），**「不可被選」≠「選擇目標需多付 AP」**；禁止用已存在的 AP tax 冒充目標免疫。
4. **高風險稍後** `attackEndDistinctOutsideNamesSwap`：BLC-4-069，先官方 Q2337/Q2338 釐清攻擊結束、LIFE/Trigger 時點、場外不同名字、實體區域交換，不率先修改戰鬥核心。
5. BLC-4-034 REST→真退場→裏向 under 收回以及尚未裁定巢狀第二次 LIFE 繼續 fail closed，不得因一般測試綠燈移除阻塞。

## 回歸與交接注意

- **最後完整程式成功 CI（在撰寫 E 文件前）**：`010482e1a40e1984f79129e694e535d22ddcad2d`，[Actions 39899603904](https://github.com/will00t-debug/Ua/actions/runs/39899603904)：Node.js 22 **1941/1941 PASS**；五作品真正合法牌組矩陣 **60/60**；獨立 registry manifest **325**，source ledger、R35 原子缺口、R37 TOP-N 報告、unported 報表均成功。所有數字均來自 **遠端** GitHub Actions，沒有在此工作環境執行本地 npm 測試。
- `ce2bf484...` 與本文件／交接文的 **後續提交** CI 必須再次以其最終 SHA 查詢，不能沿用 `010482e1` 的綠燈當作新 HEAD 的結果。
- 不覆寫他人分支／未提交變更。新 Agent 必須先重新查 PR #78 的 HEAD、工作區、Actions，避免兩個 Agent 同寫。
