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


## 2026-10-14：TTG-1-021～023 官方逐卡續驗、023 手機選牌補強（草稿）

在獨立分支 `audit/ttg021-023-official-ui-20261014` 新增 `tests/ttg-official-acceptance-021-023.test.mjs`（7 個實體核心／UI 情境），沿用既有 81/81 Beta 核心，不翻 `auto:false` 或部署正式網站。

| 卡號 | 印刷條件與本輪驗證 | 仍待完成 |
|---|---|---|
| [TTG-1-021](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-021) | 官方 Q2269 前線滿 4 格時，先自行選一張前線角色移至 **REMOVED** 才從能源線移動；不能任意放場外。Q2270 兩張庸子共用同名每回合一次效果；Q2271 只有自己看得見己方底下裏向卡，且須有底下裏向卡的紅蓮螺巖角色才可在攻擊階段開始時移動並本回合 BP＋1000。補上使用真實核心 `next` 進入攻擊階段的情境。 | 完整異圖/更複雜 RAID 下方的時序；真人裝置的視覺驗證 |
| [TTG-1-022](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-022) | 陽子老師仍具〈庸子〉名稱，主階段 REST 使產能+綠1，重複啟動拒絕；主階段結束回**手牌**而非場外，與 018 的退場處理分離，同 UID 守恆；生命 DRAW 為既有可選 Trigger 路徑。 | 作其他〈庸子〉檢查時的跨卡別名條件；DRAW 及複合結算／極端回手重新登場情境 |
| [TTG-1-023](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-023) | 從牌庫頂最多查看 5 張，只能公開選取 `ガンメン`，可放棄；拿取時必棄一張自己手牌（可選剛拿的實體卡）；未拿牌不棄；剩餘任意 UID 順序送牌庫底。本輪新增**手機真人操作介面**：私下選牌、手牌棄置、上/下排序、確認送出；既有核心驗證非法 UID。只在真正拿卡時以 `ttgPublicSearchReveal` 紀錄**選中**卡的公開卡號，保護未選牌和私下查看順序。 | 實體手機瀏覽器 vs AI 驗證、多人模式私密資訊展示的最終檢查 |

本批不合併 `main`、不發佈正式網站。GitHub Actions Node 22 測試通過後才可考慮合併；禁止將 Beta AI 整局通過視為所有 81 張卡的官方逐卡 100% 完整驗收。下一批為 **024～026**。


## 2026-10-14 天元突破 024–026 官方驗收：連續批次（草稿）

在 `audit/ttg024-026-official-20261014` 上承接上一個驗收草稿 #42 的內容，不直接寫入 main。新增 `tests/ttg-official-acceptance-024-026.test.mjs`；本批實際驗證的是以下規則分支，不代表三張卡所有複雜 Raid/Trigger 與手機真機操作 100% 完成。

- **024 レイテ／蕾蒂** [官方卡文](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-024)：原獨立場域登場程序對 033/034 忽略蕾蒂的減費。本批修正，每個己方蕾蒂在前線或能源線均對**手牌中**綠色場域卡需求 -1（最低 0），在 034 的「己方有場域 8／沒有場域 5」條件後計算，仍需要支付 1 AP。場上存在顏面時，蕾蒂的額外產能也依實際場面即時重新計算。待測 033 與多重發生產能倍增／Raid 互動。
- **025 ロージェノム／螺旋王** [官方 Q2272](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-025)：己方能源 5/6 可攻擊及阻擋分界、自己前線 ACTIVE 支付 REST 並退場、需先能選擇**己方西蒙**才允許發動；使目標+綠3並由玩家選擇恢復一張實體 AP；非法敵方目標拒絕且不支付成本。待補多張物理 Raid 同名、目標移動時序及與過去產能 buff 退場結算。
- **026 ロシウ／羅修** [官方卡文](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-026)：修正「二選一」原先無法在不查看牌庫下選擇場外回收 0 張的問題，加入獨立 `arkOutside` 結算，從場外可回收或不回收且**從未查看牌庫**；另一搜尋分支才私人查看頂最多 7 張並選最多一張〈アークグレン〉公開拿回，其餘手動排列牌庫底。手機 DOM 模擬測試須先明確按下「查看牌庫」才呈現 7 張可見牌，其他卡不進公開 log。生命 DRAW 繼續使用既有可放棄的 Q99 通用處理。待測真實多人手機與全域可見性。

此批應檢查 Node 22 GitHub Actions 完整回歸測試與卡片守恆；不變更 `auto:false`、不直接修改 Vercel 正式網站。下一批為 **027–029**，會先看這三張的 Raid 與高階階段時序交互。


## 2026-10-14：天元突破 TTG-1-027～029 正式卡文續驗（PR 草稿）

來源：[027 官方 Q2273、Q2393](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-027)、[028 官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-028)、[029 官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-029)。承接前批草稿，沒有修改 main、沒有發佈。測試檔 `tests/ttg-official-acceptance-027-029.test.mjs`，六個真實50張牌組引擎案例。

- **027 方舟紅蓮螺巖**：官方 Q2393 的連續 Raid 確保把 029 的原頂卡裏向疊到底板下（不能額外複製／遺失實體）；一張原有裏向＋新頂共二張時，只能選 5000BP 以下敵方角色退場、不能回復 AP；原有二張＋新頂共三張時可以同時選合法敵方前線和回復指定 AP，順序與法定選擇保持一致。測試正常 Raid 及 027 自 LIFE 翻出時可依 Q99 放棄／直接加入手牌，不能繞過 AP 費用支付。
- **028 紅蓮螺巖**：真人 Raid 需 4 綠與 AP1，登場必須抽一張實體卡，即使敵方限制攻擊目標選擇放棄也要抽；若選敵方前線，直到己方下一回合開始其不得攻擊；不能選敵方能源線。仍留有與 004 同時登場觸發的 Q2260 順序例外未完。
- **029 紅蓮螺巖**：正常 Raid 後僅前線觸發；場外符合需求能源≤3、AP1、綠色大紅蓮團可回手；若 Raid 結算後己方能源仍≥6，可改為自己選空前線/能源格 REST 登場。這次連動回收 026 羅修，**該次 REST 登場會觸發自己的登場二選一待決狀態**，並串接上一批 026 的場外 Ark 回手分支，確認對局不卡住。生命 Raid Trigger、混合其他相同時點能力及手機真機尚需更大測試。

維持 Beta `auto:false`，以上僅個別能力與少量跨卡測試，不是整張卡最終 100% 官方驗收。下一批 030～032 還需更複雜多 Raid 與效果保護時序。


## 2026-10-14：TTG-1-030～032 官方高階 Raid 續驗（草稿）

資料來源：[030 Space King Kittan](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-030)、[031 Super Galaxy Gurren Lagann / Q2274–Q2277 / Q2394](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-031)、[032 Tengen Toppa Gurren Lagann / Q2278–Q2279 / Q2395](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-032)。

新增 `tests/ttg-official-acceptance-030-032.test.mjs` 五項真實 50 卡核心驗收情境：

- **030**：Raid 在基坦上支付實體 AP、進場 ACTIVE；正確退場時頂卡與底板不消失也不重複，自己選擇從場外回收底板到空場；結算時己方能源 4 時 REST、6 時 ACTIVE；能拒絕回收。仍需確認與 034 同時被退場的自由排序與真實戰鬥 IMPACT 無效判定。
- **031**：在 20+ 能源的真實 Raid 入場時指定恢復 AP、BP+5000、對手效果無法選取直到下次己方回合開始（Q2274–2276），50+ 能源時另外必抽 2 實體卡。仍需測兩個同名 031 同一回合入場、受其他效果離場及再次進場的跨卡多次判定。
- **032**：官方 Q2395 僅可 Raid 本回合**未** Raid 過的超銀河紅蓮螺巖，且能源滿 100、AP 1；玩家可選擇其他己方前線任意枚數裏向置於自身下，不公開裏向卡身份；自己回合獲 Impact4 和 Damage7，仍須於後續對手回合確認這些加成取消且永久效果保護保留。仍需多重 Damage 生命觸發排隊、投射對象保護及真實手機選擇介面。

測試應由 Node 22 Actions 完整跑完並回報數字；目前 Beta 正式旗標不更動。不合併主分支也不部署。下一批優先為 TTG-1-033～035 場域與特殊退場／隱私。


## 2026-10-14：TTG-1-033～035 官方卡文、場域／生命特殊效果續驗（草稿）

來源：[033 官方 Q2280／Q2281](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-033)、[034 官方 Q2282](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-034)、[035 官方印刷效果](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-035)。

新增 `tests/ttg-official-acceptance-033-035.test.mjs`：四個 50 張實體卡核心場景，包含 033 同名每回合使用一次且成為 027 Raid 下方裏向卡並抽 2 張、己方可查看／對手不能查看底下身份；034 自己角色退場時捕獲場外卡裏向放場域下、產能+1 與同回合不得第二次；035 正常事件根據己方西蒙門檻 BP3000/5000 選對手前線，將完整 Raid 疊卡移到 **REMOVED** 而非 OUTSIDE，生命 SPECIAL Trigger 則依 Q99 可以放棄、或將對方 Raid 疊卡送到 **OUTSIDE** 而不是 REMOVED。

後續仍待完成：033 同一回合多重高階 Raid 選擇順序、034 031 Raid 轉移所有裏向卡、035 對手特殊離場替代效果與手機真機操作、完整生命 Trigger 複合時序。此批只驗收列明分支，**不翻全卡 auto 旗標、不直接修改 main、不部署正式網站**。本批需由 Node 22 GitHub Actions 全回歸確認，之後從 **TTG-1-036～038** 接續。


## 2026-10-14：TTG-1-036～038 三張 AP 回復事件／FINAL Trigger 續驗

日本官方個別卡表：[036](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-036)、[037](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-037)、[038](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-038)。三張都是綠3、AP1 事件、自己的 AP 卡最多2張轉 ACTIVE、生命 FINAL。

新增 `tests/ttg-official-acceptance-036-038.test.mjs`：在完整50張且 FINAL ≤4 的合法牌組，分別測三張從手牌支付**玩家指定的實體 AP**，之後最多 ACTIVE 自選2張（可包含剛支付的AP，也可包含其餘REST AP，不可擅自操作對手AP）；不選回復仍須確實支付該AP；非法 AP、重複指定、不屬於自己的 AP 均拒絕且原狀態不修改。另對三張各測**最後1點生命**的真正 FINAL 待選，可發動拿牌庫頂一張恢復1 LIFE、或依通用官方 Q99 放棄導致生命歸零落敗，公開生命 Trigger 結果、守住50張 UID。

這仍是列出的效果分支與時序驗證，不是全81張正式效力認證。待 Node22 GitHub Actions 及手機UI實機確認，勿修改 main / Vercel，後續依序 **039～041**。


## 2026-10-14：TTG-1-039～041 日本官方事件與裁定續驗（獨立草稿）

來源：[039 ラガンインパクト](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-039)、[040 Q2283](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-040)、[041 Q2284](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-041)。新增 `tests/ttg-official-acceptance-039-041.test.mjs` 六項50卡核心回歸情境：

- **039**：綠6／AP1事件必須選自己場上具有「ラガン」片語的角色或〈シモン〉，不能指定敵方或其他不符角色；本回合追加自己的場上角色當下最大 BP 數值和 IMPACT 1，結束後歸零。生命 ACTIVE 可以選己方角色恢復 ACTIVE、BP+3000 或依 Q99 放棄。
- **040**：綠8／AP1，手牌同名每回合只能使用一次，抽2張、自己前線也產生能源；本張事件放置 REMOVED 並可在自己主階段且8+能源時發動同回合一次倍增。**官方 Q2283**：已得到一份 ×2 能源狀態時追加倍增為 **×4** 而不是 ×3；其後新加的能源也乘四，並應於當回合解除本張新增的倍數。額外「非使用卡片送 REMOVED 時改送場外」仍待觸發完整驗證。
- **041**：綠5／AP1，只能選己方大紅蓮團角色、相同印刷名稱不得同時選兩張；3張不同角色則**每張均 BP+3000**（官方 Q2284），並測 ACTIVE 生命觸發合法選取與放棄。

不改正式網站、不合併 main、不翻 `auto:false`。待 Node22 全量 CI、手機真機與其他跨卡時間點驗證；下一批可接續 **TTG-1-042～044**，開始紅色卡牌逐卡驗收。


## 2026-10-14：TTG-1-042～044 官方紅色入門三張／未阻擋 Q2285 選牌（草稿）

來源：[042 日本官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-042)、[043 日本官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-043)、[044 官方英語印刷](https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-044)、[官方 Q2285](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AB%E3%83%BC%E3%83%89%E5%80%8B%E5%88%A5&sub_category=%E5%A4%A9%E5%85%83%E7%AA%81%E7%A0%B4%E3%82%B0%E3%83%AC%E3%83%B3%E3%83%A9%E3%82%AC%E3%83%B3)。

新增 `tests/ttg-official-acceptance-042-044.test.mjs`：50張真正對局核心場景＋DOM手機模擬按鈕。

- **042 卡米那**：0紅能源、AP1、BP2000、在能源線產生1紅；真正支付AP後登場，紅色產能即時更新；印刷生命 ACTIVE 依通用裁定處理。
- **043 卡米那**：紅2 AP1，BP3000，IMPACT 無效在與 027 進行的真實阻擋戰鬥中防止額外生命傷害。生命 DRAW 可以抽真實一張卡或選擇放棄，不能無提示自動抽。
- **044 卡米那**：紅3 AP1，己方有場上或己方 Raid 底板西蒙，自己的回合 BP+500；Q2285 **先完成阻擋者選擇，再於傷害前開啟是否發動**。可完全放棄而不查看／變更牌庫；若選看頂7張，可只公開最多一張印刷〈グレン〉加入手牌；若拿牌要選一張手牌（允許剛拿者）送場外，剩餘任意順序放牌庫底。改善 `dist/ttg-red-first-three.mjs`：公開 log 只記錄真正拿到的〈グレン〉，其餘卡與私人排序不外洩。加入 `dist/ttg-browser.mjs` 與 `dist/app.mjs` 手機專用操作：先選擇要不要發動，之後才能看到牌庫頂與調整上下順序，確認後才結算後續生命傷害。

保留後續缺口：043 IMPACT 無效與多重DAMAGE、044 多名同時未阻擋攻擊、牌頂不足7／空牌庫與其他防守 Trigger 鏈、真實手機與雙人熱座資訊驗證。**本次不是三張卡所有官方例外最終認證；不翻 auto 旗標、不寫入 main、不部署。** 後續從 **TTG-1-045～047** 接續。


## 2026-10-14：天元突破 TTG-1-045～047 官方逐卡驗收（等待 CI）

基於 `audit/ttg042-044-official-20261014` 獨立繼承，不修改正式 main 或 Vercel。官方逐卡來源：

- [045 カミナ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-045)：Q2286 即使已突襲的〈グレン〉頂牌成為裏向卡，底板 045 的能力仍觸發；Q2287 裏向身份僅己方可查看。新增 072 實際突襲 045 的主流程，允許先處理底板 045 或 072 登場效果，但 072 強制抽牌不能省略；同回合 073 再突襲 072，裏向頂牌實體保留，045 可另抽實際牌庫頂 1 張，公開 log 不含其他底牌。
- [046 カミナ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-046)：官方 Q2288–Q2290，己方本回合真正突襲過才可由前線主階段啟動；一張角色各可最多選 2 種不同效果，READY 優先於 BP 加成；所有〈カミナ〉同名共用 READY 每回合只能選 1 次限制。用真實兩張 046 驗證第一張 READY+BP，第二張只可 BP，不支付 AP 且非法第二次 READY 拒絕。
- [047 キタン](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-047)：本回合己方角色的第一場**實際攻擊**才 +1500 BP，第二次不同實體角色攻擊不得取得加成；生命 DRAW 可以發動或放棄，放棄不改動牌庫。

新增 `tests/ttg-official-acceptance-045-047.test.mjs` 六個真實完整 50 張合法牌組核心情境，需等 GitHub Actions Node22 全量回歸完成。仍待 045 與高階 073 Raid 替代離場、生命 COLOR 全互動以及 046 多名 Raid 競合與真人手機對局。**上述測試不代表 045～047 完整官方逐卡證書，更不代表 81 張全部認證完成**。下批從 **048～050** 繼續。


## 2026-10-14：TTG-1-048～050 官方逐卡驗收續接（PR 等待 CI）

承接 `audit/ttg045-047-official-20261014` 測試分支，**不動 main、Vercel 或其他聊天室的修改**。日本官方卡文：
[048 基坦](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-048)，
[049 吉米＆達莉](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-049)，
[050 琪優＆琪儂＆琪雅露](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-050)。
049 的日文官方 iframe 在此輪查詢不可用，使用已在既有專案卡表／獨立單元測試記錄的卡文，不將網頁存取失敗視為外部再次核對完成。

新增 `tests/ttg-official-acceptance-048-050.test.mjs` 七項真實合法 50 張兩人遊戲與生命觸發測試：

- **048**：本回合自己的第一個攻擊才獲 BP＋500、IMPACT 無效與雙重阻擋，持續到下次自己的回合開始。透過真正跨回合、敵方連續兩次攻擊和同一張 048 第一次阻擋轉 ACTIVE、第二次阻擋 REST 驗證；第二個攻擊的 048 不得取得該能力；印刷 ACTIVE Trigger 可選或放棄。
- **049**：手牌登場支付 AP 後立刻強制啟動選擇，只能返回己方場上印刷需求能源 1 以下的**其他**角色；沒有時強制將 049 本身回手；無法略過待決選擇，不補回已付 AP，守住所有 50 實體卡 UID。
- **050**：手牌登場時自己場上／Raid 底板有〈キタン〉就強制抽一張，無條件發動不需要玩家誤點；各三項互不相同的主階段能力分別測：(1) 丟一張手牌將自己 ACTIVE；(2) REST 自己讓自身暫時額外產生紅1；(3) 丟一張手牌使自己 BP＋1000。每個實體限每回合使用一次，各自支付成本，回合末解除暫時能源與 BP。驗證底板基坦也符合條件。

剩餘：048 多重 IMPACT、DOUBLE BLOCK 與其他替代效果交互；049 在複雜 RAID 卡回手的同時時序；050 進場強制抽牌的空牌庫敗北、角色被移走後效果時序，以及手機真人雙方資訊驗收。**本批僅上述分支，不能宣稱全 81 張已完全自動判定。** 下一批將接續 051～053。


## 2026-10-14：TTG-1-051～053 日本官方紅色西蒙逐卡續驗（待 CI）

獨立分支 `audit/ttg051-053-official-20261014` 承接 `audit/ttg048-050-official-20261014`，原始正式站、main、其他系列保持不動。官方印刷：
[051](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-051)、
[052](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-052)、
[053](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-053)。
新增 `tests/ttg-official-acceptance-051-053.test.mjs` 六項完整50卡對局核心案例：

- 051：0紅能源 AP1 真實手牌登場，必須先從牌庫頂抽一張，再由玩家確實選擇從**整個當前手牌（包含剛抽的）**場外 1 張；不讓 `next` 跳過待決棄牌。若必須抽牌時牌庫沒有牌，應正常以 `requiredDrawEmpty` 結束而非跳過成本。
- 052：紅2 AP1，登場可選擇**不棄**直接結束；有棄牌才可最多回收一張自己場外印刷需求能源 ≤2 的紅卡，允許剛棄的卡、能不選回收，拒絕對手／錯色／印刷需求過高卡；不能無條件拿卡。
- 053：0紅能源 AP1，主階段 REST 自己，把牌庫頂 1 張實際移到場外；同回合外部效果使本角色再次 ACTIVE 可以重新發動，沒有 `ターン1` 印刷限制。生命 ACTIVE 由防守玩家選是否發動，對 AP 不造成恢復。

本批不代表所有進場套疊/別名/多重生命 Trigger 同時時序已最終官方認證。需等待 Node22 CI 結果、真人手機操作、052 他卡新進場連鎖、053 空牌庫與場外資訊顯示等複雜互動再補。之後自動續驗 054～056。


## 2026-10-14：天元突破 TTG-1-054～056 官方效果驗收（等待 CI）

本批接續 `audit/ttg051-053-official-20261014`，獨立草稿，不影響 main、Vercel 或其他聊天室分支。已核對日本官方個別卡文：
[054](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-054)、
[055](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-055)、
[056／Q2291／Q2292](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-056)。

在 `tests/ttg-official-acceptance-054-056.test.mjs` 新增六個全50卡核心／受控邊界案例：

- 054 西蒙：登場查看是否合法送牌庫頂 0 或 1 張到場外；自己場上有妮亞＋牌庫 ≤20 的**動態**條件，只有己方回合 BP+1500，對戰雙方都擁有 IMPACT 無效，21／20 張分界清楚。
- 055 西蒙：登場至多送2張牌庫頂到場外（可選 0），再可棄 1 手牌；只有支付棄牌後才能從**這次效果送場外**的實體卡最多拿1張，禁止從早已存在的場外卡或剛棄的成本卡偷回收；可放棄回收。
- 056 西蒙：僅在己方妮亞在場且己方牌庫剩 ≤20 才能攻擊。**Q2292 必須先經過阻擋/戰鬥或傷害生命 Trigger 檢查，才能開「攻擊結束時」選擇**。若選擇紅色螺巖／紅蓮螺巖 Raid 不收 AP，另加 BP1000 本回合，並觸發真實被選 Raid 的入場效果；**Q2291 同回合其他原因已 Raid 過相同印刷名字也不可再選**。本輪發現並修正 `dist/ttg-red-056-after-attack.mjs` 把選中 073 錯排成 074 專屬登場抽牌／BP 效果的 bug。本批另有一個受控 073 分支專測正確派發；該特殊場景含違反部分妮亞/卡米那登場限制的預設局面，不聲稱它是合法實戰。
- 全測試持續保留實體卡 UID 守恆，等待 Node22 CI 結果。

未完：056 受各種 LIFE Trigger 連鎖延遲、073 離場替代、不同卡名多 Raid、不足手牌與 055 部分場外可見性手機實機；不宣稱全 81 張最後官方認證。後續從 **057～059** 接續。


## 2026-10-14：TTG-1-057～059 紅色角色效力續驗（待 Node22 CI）

獨立分支 `audit/ttg057-059-official-20261014` 接續 054～056 草稿、保留所有其他分支且不覆寫正式 main 或 Vercel。本輪日本 [058 官方詳細卡文](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-058) 已核對。057 和 059 的官方 iframe 這輪網頁查詢不成功，僅根據既有專案中從使用者提供的官方卡面轉錄及原先模組測試驗證實作，**這兩張仍需後續外部官方卡文重新核對**。

新增 `tests/ttg-official-acceptance-057-059.test.mjs` 六組50張實體牌核心與受控 RAID 底板邊界情境：

- **057 達雅卡**：真實手牌登場後選擇**另一張**己方角色賦予 IMPACT 無效直到己方下一次開始回合；057 自己原生 IMPACT 無效獨立存在，離開時限後只取消被授予者，己方卡片守恆。
- **058 妮亞**：0紅能 AP1 真實手牌登場的選擇／放棄；己方西蒙或突襲底板有西蒙的角色 BP+1500，其他角色 BP+1000，自己不是「其他」不可被選；生命 ACTIVE 可選或放棄。**不得在己方有卡米那含 RAID 底板時登場。**
- **059 妮亞**：1紅能 AP1，MAIN REST 自己支付成本，選己方西蒙 BP+1000，本張未 ACTIVE 無合法能力，不能不付 REST 再次發動。其他妮亞與卡米那共場禁止登場的同時，修正 `dist/ttg-red-sixth-three.mjs` **卡米那登場也必須檢查己方 Raid 底板中是否有妮亞**，不是只有檢查最上面卡片；兩方向一視同仁，防止 Raid 底板繞過永續場面限制。
- 模擬預組 Raid 底板名稱的個別測試只是確保合法行動生成器不會允許對立角色進場，不代表該組合本身為可合法進場的 Raid 對象。

待續：058/059 的正式卡文原站核對；與 059 的 STEP/能源線或其他暫時 READY 同回合連鎖；雙人手機畫面、實際 Raid 套疊來源及觸發對象顯示。僅驗證列明分支，**不是 81 張完整官方驗收證明**。下一批 060～062。
