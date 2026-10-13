# UNION ARENA 自動裁定正式驗收紀錄

> 記錄日期：2026-10-14（台灣）。這是逐卡驗收的起點，不是「全卡驗收完成」證書。Beta 可對局與官方規則全情境驗收是不同的里程碑。

## 檢查結果

| 類別 | 已建檔 | 已接上獨立試玩引擎 | 完成全部官方效果驗收 |
|---|---:|---:|---:|
| 《我獨自升級》UA51BT/SLG-1 | 80/80 | 80/80 | **0/80** |
| 《天元突破》UA56BT/TTG-1 | 81/81 | 81/81（獨立限制核心） | **未完成** |

官方正式驗收需要逐卡原文核對、**每個能力和 Trigger 的正常/非法/可選/空牌庫等分支測試**、Raid/底板/連續觸發/時點/隱藏資訊/不同卡互動，以及手機實際操作和完整牌組 AI 對局。單一 AI 對局完成或原始碼包含卡號，不代表該卡完全符合官方裁定。

## 已新增的官方卡文複核與可執行案例（第一批）

| 卡號 | 已複核的印刷能力與分支 | 測試檔 | 完整正式驗收 |
|---|---|---|---|
| [SLG-1-001](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-001) | 自己回合、場外 4/5 張門檻、500BP、對手回合失效 | `tests/solo-official-acceptance-first-four.test.mjs` | 尚需整局及交互驗證 |
| [SLG-1-002](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-002) | 登場選一；抽 1 棄 1；選其他己方角色+1000BP，禁止選自身 | 同上 | 尚需 Trigger 與複合互動驗證 |
| [SLG-1-005](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-005) | 普通角色數值、無內文能力、DRAW Trigger 資料 | 同上 | 尚需實際生命 Trigger 對局驗證 |
| [SLG-1-006](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-006) | ACTIVE 額外紫能源、REST 無額外能源 | 同上 | 尚需移動與非目前回合結算驗證 |

本次五個新子測試已加入 `npm test`。若未來修正引擎造成回歸，CI 將阻止誤合併。下一步應逐卡擴充到 80 張；其他 76 張不可以因先前 Beta 訓練對局成功而自動宣告通過。

## 卡圖與裁定分離

目前 SLG 80 張使用佔位圖，專案並未取得將官方卡圖直接轉載到此網站的權限。網站在每張 SLG 和 TTG 卡片旁提供「官方卡圖及日文效果 ↗」，可前往官方卡表查看真實圖面與原文。請勿以「直接搬運官方卡圖」取代圖片授權流程。

完整早期逐張追蹤：`audit/solo-leveling-card-status.csv`；FAQ 情境：`audit/solo-leveling-official-faq.csv`；天元的限制核心交接：`TTG_REMAINING_22_HANDOFF.md`。

## 第二批：2026-10-14 自動裁定擴大驗收（PR #24）

這輪針對另一批 **5 張獨立卡號、7 個實際結算／非法選擇測試**，新增 `tests/solo-official-acceptance-batch2.test.mjs` 與 `tests/ttg-official-acceptance-batch2.test.mjs`。所有測試均需在 Node 22 的主專案 CI 上綠燈。

| 卡號 | 官方印刷能力／裁定與已實跑測試 | 仍待驗證 |
|---|---|---|
| [SLG-1-003](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-003) | 場外 9／10 張能源門檻；REST 不影響額外能源；攻擊看牌頂並合法選擇留頂／送場外、不多產生實體卡 | 從場外回收+1000BP與其他觸發組合的完整整局驗收（已有先前獨立測試） |
| [SLG-1-004](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-004) | 真實 AP/能源支付、登場抽1棄1、自己回合本次棄牌後 BP+500，對手回合失效 | 實際生命 DRAW 觸發、其他己方回收與失敗情境 |
| [SLG-1-007](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-007) | 真實 SPECIAL 事件令其退場，持有人僅抽 1 張，不重複抽 | 生命 DRAW、Raid 疊卡退場、空牌庫造成輸局 |
| [TTG-1-001](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-001) | 正常登場扣 1 AP，查看頂牌時可保留或送場外；兩分支保持 50 張實體及 UID 守恆 | 空牌庫時選項、跨卡連動、真人手機 UI 訪視 |
| [TTG-1-003](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-003) | 官方 **Q2392**：7→8 立即升能源並賦予前線產能；官方 **Q2259**：同名兩張不得各自啟動20能源 ACTIVE 效果 | 6 以下界線、20能源多重互動／其他臨時能源增減 |

**目前累計至少 9 張卡號有本系列逐卡驗收測試紀錄（SLG 001、002、003、004、005、006、007；TTG 001、003），但完整正式驗收依然未達標。** 這些只是每張卡的選定能力與分支，尚不能將其標成「正式全效果驗收完成」。

驗收推進時，應優先補完未覆蓋的能力分支、錯誤成本、生命 Trigger、被封鎖的操作、Raid 連動，以及手機 UI 操作，再依可追溯證據逐卡轉正；不可因累計測試數量或已有 Beta 80／81 卡而無條件翻轉 `auto`／`playable` 欄位。
