# [V2-C] 天元突破 TTG-1 ＋ 我獨自升級 SLG-1 交接

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
