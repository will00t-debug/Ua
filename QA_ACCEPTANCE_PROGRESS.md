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

## 同輪加測：《我獨自升級》008／009／010

新增 `tests/solo-official-acceptance-batch3.test.mjs`，對照三張日本官方卡的個別頁面：

- [SLG-1-008](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-008)：實際登場、查看牌庫頂四張、僅能選合法的〈水篠旬〉、餘牌放牌庫底、拿牌時必須棄一；測試確保卡片實體不重複。
- [SLG-1-009](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-009)：主階段支付一張實際手牌、BP＋1500；同名該實體一次每回合不得重複啟動（後續仍要驗證其他生命觸發互動）。
- [SLG-1-010](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-010)：場外 9／10 張門檻，限自己的回合 BP＋1000；不冒稱 DRAW 觸發的所有交互已完整驗證。

**目前累計 12 種有此專案新增的官方逐卡測試情境（Solo 十張 001～010；TTG 001、003），另有既有 FAQ 回歸測試。正式「每卡所有效果完整驗收」仍不能因這些個別情境測過就直接算 12／161。**

## 接手批次：2026-10-14（基底 e20a6d9）

分支：`audit/official-acceptance-next-20261014`。以下是新增可執行情境，**不是整張卡轉正**。

### SLG 第四批：011／012／013

測試：`tests/solo-official-acceptance-batch4.test.mjs`（7 個測試，包含 DOM 模擬點擊）。逐張重新讀取官方個別卡頁；官方 UA51BT FAQ 列表本次未列出這三張的專屬問答，不能虛構 FAQ 編號。

| 卡號 | 本次實際驗證 | 修正／剩餘缺口 |
|---|---|---|
| SLG-1-011 | 真實生命傷害觸發：從場外選紫色、需求≤2、AP1角色，只放前線 ACTIVE，不付 AP／能源；非法手牌來源拒絕；回收可放棄、能源重檢、REST 登場、登場送頂牌可做／不做；UI 顯示正確場外卡名並點擊結算 | **修正原先從手牌選卡且允許能源線的 COLOR 錯誤**。仍待旬來源 ACTIVE 回收完整戰鬥、滿線移除替換、COLOR 放棄選項、手機真實瀏覽器整局 |
| SLG-1-012 | 真實 AP 支付後，己方前線／能源線有旬才抽；手牌／敵方旬／無旬皆不抽 | 空牌庫、Raid 與複合觸發、手機實戰尚待驗證 |
| SLG-1-013 | REST 成本、再次 ACTIVE 仍限一次、能源+1、進攻擊階段前退場；026 回手再登場的跨卡測試 | **修正回手再登場殘留舊能源增益與延遲退場**。其他移動區域、觸發連鎖及手機實戰尚待驗證 |

`position()` 僅清除本輪已重現的 `boostTurn`、`usedTurn`、`retireAtMainEnd`；其他歷史暫時旗標仍需另批盤點。COLOR 來源與位置分流保留綠色從手牌登場的回歸測試。

### TTG 第三批：002／004／005

測試：`tests/ttg-official-acceptance-batch3.test.mjs`（3 個多情境測試）。官方來源皆為 `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT/TTG-1-卡號`；002 個別頁由直接 HTTPS 取得，004 頁同時核對 Q2260／Q2261／Q2262。

| 卡號 | 本次實際驗證 | 修正／剩餘缺口 |
|---|---|---|
| TTG-1-002 | 自身 REST 與另一己方 ACTIVE 前線角色、非法敵方目標不修改原狀態、額外能源到回合末消失；真實生命 ACTIVE 可發動／放棄 | **修正再度 ACTIVE 後同回合可重複發動的漏洞**；需補跨區域重登場、第二實體使用次數 |
| TTG-1-004 | Q2260：前線004作Raid底板可觸發，能源線004移至前線Raid不能觸發；手牌附卡抽1與場外附卡不抽；Q2262裏向卡僅己方看；GET可拿／放棄 | Q2261有既有模組測試，仍需同名雙實體在核心完整連鎖；IMPACT無效、全部結算順序及手機實戰仍待補 |
| TTG-1-005 | 真實傷害後 DRAW 抽走同一張實體牌頂；既有 `ttg-green-impact-match.test.mjs` 測過作阻擋者取消IMPACT | **發現 DRAW 目前自動結算，沒有放棄選項，未修完；不可轉正**。空牌庫及完整交互待補 |

### 本批驗證與後續入口

- 接手基線本機重跑：610／610；本批新增10個測試，最終本機 **620／620 通過**。另將既有錯誤容許002同回合重複啟動的測試，改為拒絕重複且下一回合可再次使用。
- 本機 Node 為 v24.19.0；專案規範指定 Node 22，必須另看 GitHub Actions 的 Node 22 結果，不能混稱。
- UI驗證為實際 app.mjs 的 DOM 模擬載入、選擇與儲存；**未做手機真實瀏覽器／Vercel 預覽驗收**。
- 本批沒有正式發布或改動 main，沒有提高任何 `auto`／正式完成旗標。
- 接續優先：修補已發現的 DRAW／COLOR 可放棄與滿線登場移除替換，再補 SLG011旬回收ACTIVE、TTG004同名限次核心對局；新卡文批次從 SLG014、TTG006 接續。001～010等舊卡的未完分支依舊保留。

## 接手續修：2026-10-14 官方通用 FAQ Q99 生命 Trigger 放棄選項（PR #26）

日本官方 [Q99](https://www.unionarena-tcg.com/jp/faq/list.php?type=0)（2025-10-24 更新）明示：生命觸發時，觸發能力可以選擇**不發動**；揭示卡直接放場外。獨立《天元突破》核心原本對 **DRAW／FINAL** 直接自動處理，玩家沒有選擇權，屬於裁定差異。現在改為進入 `pendingTtgLife`，由生命方選擇發動或放棄：

- DRAW：選擇「發動」才會真正從牌庫頂抽 1 張；放棄不得移動該實體。
- FINAL：在最後 1 點生命受傷後先暫停；發動且牌庫有牌時補 1 生命，放棄則因生命歸零輸局。
- 原有 GET／ACTIVE／COLOR 等觸發的選擇機制仍保留；UI 新增清楚的繁體中文「發動／不發動」選項。
- 更新 `tests/ttg-green-life.test.mjs`、`tests/ttg-red-first-three.test.mjs`、`tests/ttg-core-match.test.mjs` 及官方第三批測試，覆蓋分支。

**仍未驗收完成：** SOLO 獨立引擎中的 DRAW／FINAL／GET 在 `hurt()` 仍直接自動處理；需要分批調整並驗證原有 50 張守恆與 Damage2 時序。此 PR 僅修 TTG，不可因此宣稱 161 張全卡完成官方驗收。

## 接手續修：SLG 通用官方 Q99 的生命 Trigger 目標選擇可放棄（PR #27）

根據日本官方 [Q99](https://www.unionarena-tcg.com/jp/faq/list.php?type=0)，生命 Trigger 可以不發動。本站原先在可選目標存在時，SLG 的 COLOR、SPECIAL、ACTIVE 均強制玩家點一個效果選項，與「不發動」權利衝突。

本次在 **COLOR、SPECIAL、ACTIVE** 的選擇視窗加入 `uid:null` 的合法放棄行動，且在獨立判定引擎中不移動目標、不支付 AP、不產生 BP Buff；網站以繁體中文顯示「不發動 XXX 生命觸發」。

測試 `tests/solo-q99-optional-target-triggers.test.mjs` 實際傷害造成 SLG-1-011 COLOR、SLG-1-040 SPECIAL、SLG-1-003 ACTIVE 的待選效果，再分別發動與放棄，確認實體卡守恆及狀態。更新既有 011 測試，保留從場外登場、只在前線放置的官方效果。

**注意：** 其他 SLG 的 DRAW／GET／FINAL／Raid 目前仍需另批完成官方 Q99 的完整「發動或放棄」選擇、效果結算及多重 DAMAGE 時序；不能因此宣稱整個 SLG 卡組正式驗收完畢。

## 接手第五批：SLG-1-014／015／016 印刷效果（PR #28）

參考日本官方個別卡表及 Q2025（[SLG-1-014](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-014)、[015](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-015)、[016](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-016)）。

- 014：修正從場外經自己效果回手後，缺少「可免費以 REST 登場能源線」的選項；不檢查牌面能源及 AP、不允許前線；正常登場及免費登場都觸發牌庫頂一張送場外；可以選擇不登場。Q2025 禁止移動到前線。新增實體牌組守恆測試。
- 015：再次核對 0 能源、AP1、BP1500、紫1產能、無角色內文能力與 GET Trigger 資料；GET 可放棄的 Q99 路徑仍**未完成驗收**。
- 016：核對紫3、AP1、BP3000、紫2產能、IMPACT 無效與登場時送牌庫頂兩張場外；本批實測兩張移動與卡片守恆，IMPACT 無效仍需有阻擋勝負交互情境。

測試 `tests/solo-official-acceptance-batch5.test.mjs` 包含 4 個獨立情境。即使通過，仍不將這三張卡標成完整官方 100% 驗收。

## 接續第六批（PR #29）：SLG 017～019／TTG 006～008

這輪在實際判定引擎上新增九項子測試，但每張卡的全部跨卡／時序仍未達正式完整驗收。驗收檔案：tests/solo-official-acceptance-batch6.test.mjs（5 項）、tests/ttg-official-acceptance-batch4.test.mjs（4 項）。

- **SLG-1-017**：[官方卡文](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-017)。實際修正空場時紫2減2至0的合法登場判定，仍需 AP1；能源線有牌且只有紫1則不合法。登場查看頂1，保留或送場外兩路徑已測。未完全測試 ACTIVE 複合連鎖。
- **SLG-1-018**：[官方卡文](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-018)。測定登場看3、可拿1張「水篠旬」或影之軍團、剩餘放底、拿牌需棄1的狀態守恆；刻意使用 001 為非合格目標，而 015 官方也是水篠旬。待測拿牌向對手公開之手機實際 UI。
- **SLG-1-019**：[官方卡文、Q2026](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-019)。兩張實體同時在場外，也僅一回合共用一次啟動權；支出實際影之軍團手牌並回收，登場可棄1抽1或放棄。更複雜觸發時序尚待驗證。
- **TTG-1-006**：依既有卡面 PDF 記錄，自己回合能源5／6界線與＋1000 BP、對手回合不增加；日本官方個別頁目前擷取不穩，應保留原始資料再次複核。
- **TTG-1-007**：[英文官方卡文](https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-007)。自己場上達莉的＋1000BP（對手達莉不算）；從手牌登場可選擇額外支付 AP1，把場外達莉以 REST 登場，或拒絕，不重複複製實體卡。生命 ACTIVE 更多互動待測。
- **TTG-1-008**：[日文官方卡文與 Q2263](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-008)。在 50 張實際對局狀態下，先選擇不阻擋，再發生達莉底板的未阻擋抽1，最後輪到防守方的 DRAW 生命觸發選擇。既有 Raid、IMPACT、生命檢查測試一併保留。

本次只增加逐卡證據，不會把原本未完成完整驗收的 auto:false 標記改成 true；需全量 Node22 CI 合格後才能合併。 

## 2026-10-14：天元突破 009～011 官方逐卡驗收案例（PR #37）

本批針對**日本官方個別卡文**建立可執行的情境測試，不等同完整 81 張效果認證。證據：`tests/ttg-official-acceptance-009-011.test.mjs`（4 個子測試）。

| 卡號 | 已驗證的真實結算／選擇 | 尚待完整驗收 |
|---|---|---|
| [TTG-1-009](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-009) | 登場抽1再棄手牌1，含「棄掉剛抽到的同一張實體」分支；非法棄牌必須拒絕；卡片守恆；DRAW Trigger 印刷資料 | 真正生命區 DRAW 與同時其他能力的交互時序 |
| [TTG-1-010](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-010) | 登場看頂3，只可拿最多1張「大グレン団」特徵；可放棄，拿牌後需棄1；剩餘牌依指定順序放牌庫底；禁止不符特徵卡 | 只有不足3張牌時及跨卡查看牌庫隱私、連續選擇手機操作 |
| [TTG-1-011](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-011) | 自己回合且總能源8時 BP2500→4000；主階段同一實體每回合一次，二選一為發生綠能源+1或前線也產能源；持續到下一次自己回合開始而非當前回合結束 | 兩張同名卡同場、Raid疊底與跨卡能源暫時倍率的完整官方情境 |

此批測試曾因人工測試局面忘記更新能源快取及使用複製前的角色參照而失敗；已修正**測試前置條件**並保留實體卡片檢查，不是降低引擎驗證強度。仍維持正式全卡 `auto:false` 標記。
