# [V2-B] BLEACH 通用引擎 V2 全卡移植交接

> **2026-10-15 13:27（台灣）續作狀態核對**：PR #73 HEAD `e3446cd33dc082d6fbcf73aba6be4f6626451c16` 已安全合入 PR #70 HEAD `45ea2e3bc0db8a0b1cb75be50d346469439fe1cb`，compare 為 ahead、behind=0；不需重複 merge。正式 registry 目前 **BLEACH 72/276＝原 Pilot 15＋獨立新增 57（含 BLC-1-030）**，尚未移植 204，完整官方 FAQ 終驗仍為 0。最新 B CI [38682459477](https://github.com/will00t-debug/Ua/actions/runs/38682459477) 結論 success；A-core 指定雙 CI 綠燈核心基準 `3f634857`：全套 1119/1119、真卡 60/60 局，見 [A-core.md](./A-core.md)。**下方歷史 71/205、56 addon 和「BLC-1-030 未移植」為舊快照，不是本次最新現況**。逐卡實際狀態以 29 欄 CSV、正式註冊清單及最新 A-core 為準；生產環境未部署。這次只更新交接，沒有新增卡片或修改共用核心。

## 2026-10-15 12:34 安全同步至主控已修復版（最新狀態優先）

- 本次以 PR #70 核心 `45ea2e3bc0db` 建構受控同步，保留 PR #73 原 Git 歷史和原本 BLC-1-049 真實生命 COLOR 與登場降 BP 正向測試；由主控程式 `3f634857` 的 [1119/1119 回歸](https://github.com/will00t-debug/Ua/actions/runs/38678776548)、[60/60 真卡矩陣](https://github.com/will00t-debug/Ua/actions/runs/38678772958) 提供已確認的共同基線，本次新 commit 請另外查其新 CI。
- **最新 BLEACH：72/276 張（原 Pilot 15 + B 貢獻 56 + A 補入 BLC-1-030 一張）、未移植 204 張。** 過往段落 71/205 或 030 未支援皆為舊狀態；本次同步新增卡號 0。
- `BLC-1-030` 官方 Q91/Q1119：強制 REST 不受 BP 上限，敵前線無任何合法目標時不得打出事件、不得支付 AP；見 [A-core.md](./A-core.md) 與 A 專測。CSV 採用 A 最新 276 行／29 欄版本（030 逐項已更新）；不是全部 FAQ 終驗。
- 共用 preview 現有六副合法真卡內建牌組；「72 張 registry 已載入」不等於「內建牌組每張都用到」。本次未改共用引擎／預覽入口、不改 main、不部署正式站。


> 分支：`feature/v2-bleach-port-20261015`；整合目標：`feature/universal-rules-v2-foundation-20261014`（PR #70）。不合併 main、不部署 Production；**已移植不是全部官方 FAQ 驗收通過**。本文件與 PR 描述必須隨工作更新。

## 本次獨立盤點（依最新 V2 分支，不用舊版 auto 旗標）

從 `dist/expansion-cards.mjs`、`dist/cards.mjs` 和 `dist/advanced-cards.mjs` 按 `identity` 合併去重，排除異圖／AP，**共 276 種 BLEACH 一般卡**：BLC-1 109 種、BLC-2 73 種、BLC-3 11 種、BLC-4 83 種。獨立逐卡能力欄位盤點詳見 [B-bleach-inventory.csv](./B-bleach-inventory.csv)（276 行：角色能力、主動、被動、Raid、生命 Trigger、卡文、卡號與逐項狀態）。沒有做過官方核對的卡明確標示未驗收，不能把資料庫自動支援旗標當成認證。

- **基線 V2 已有 BLEACH Pilot：15 張**（僅 Pilot，未全面通過個別官方 FAQ）。
- **本 BLEACH 分支新增：56 張**，定義唯一來源為 `dist/universal-v2/bleach-pack.mjs`，同時供獨立測試 pack 與正式 `title-packs/bleach.mjs` 貢獻使用；原 15 張 Pilot 仍由共同 registry 注入，未重複貢獻。
- **目前可載入 V2 BLEACH 測試卡包：71 張（15 + 56）**，**未移植 205 張**。
- **第二輪已接入 PR #73 分支的正式 V2 registry，但既有實驗預覽的實際對戰仍僅支援原 15 張 BLEACH Pilot。** 新增 56 張尚未合併至 PR #70 HEAD，也尚未接到共用預覽使用的真卡牌組，更不代表 Production 已可玩。

## 2026-10-15 V2-B 第二輪：共用介面接入與驗收（以此段狀態優先）

1. **已同步核心，但無跨職責修改**：PR #73 分支已用真正的雙親 merge commit `a8812ed5f432886f1e604f295502d212e66893e1` 合入 PR #70 當時 HEAD `25eeac5084917534193fd9feaeae31672f902e78`。合併樹以 A 的最新核心為底，僅攜回 B 的九個專屬檔案，沒有改共享 engine/pack/templates/AI、共用入口或其他作品資料。指定 `docs/v2-handoff/A-core.md` 在兩分支都不存在（GitHub 404）；實際以 PR #70 HEAD、`title-packs/contract.mjs`、`registry.mjs` 與其 CI 代替核對，請 A 補該交接檔。
2. **正式 registry 已接線**：`dist/universal-v2/title-packs/bleach.mjs` 的 `entries` 恰好 **56** 筆；每筆都提供 `id`、`sourceRecord`、`definition`、`evidence`（官方卡文片段、reviewNote、測試檔、vanilla 額外證明），由共用 `compileV2TitleContribution` 嚴格編譯。來源校驗/效果定義只存在 `bleach-pack.mjs` 的 `checkedBleachAddonDefinition()`，獨立 pack、正式貢獻共用此函式，無第二套 allowlist；原 15 Pilot 僅由 `registry.mjs` 合入。**PR #73 registry 實際 71/276；PR #70 遠端 HEAD 仍只有原 15 張，待 A 審 PR #73。** 現有預覽在 `dist/universal-v2-preview.mjs` 內透過 `listRegisteredV2Titles()` 顯示 registry 數量，但真正初始化對戰時仍使用 `verifiedBleachPurplePilotDeck()` 的原 15 張 Pilot pack，因此頁面顯示 71 不代表玩家已能用新增 56 張。
3. **BLC-4-014 官方能源正規化**：[EX15BT/BLC-4-014 官方原文](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-014)「発生エナジー 黄+」，ACTIVE 才額外 +黄。舊來源 `CARDS.gen=2` 是 ACTIVE 合計，`checkedBleachAddonDefinition()` 嚴格要求此舊指紋不變，正式 `sourceRecord.gen=1`、另存 `legacyImportedGen=2`，`definition.gen=1,activeExtraEnergy=1`。正式 registry 真 UID 場域測試已證明 **ACTIVE 2、REST 1、再次 ACTIVE 2**；絕不讓 2+1 錯算為 3。別名印刷（例如 BLC-1-035 舊來源 UA08ST，而同身份官方 UA08BT 是別名）保留原 `sourceRecord.number` 及 `aliases`，不偽造來源。
4. **真卡與真效果驗收**：新增 `tests/universal-v2-bleach-registry.test.mjs` 八項專測：56 個貢獻身份與 15 Pilot 絕不重疊、精確 71 張白名單及 205 缺卡集合、逐卡獨立/registry 編譯物一致、契約拒絕錯來源/錯 BP/偽 vanilla/重複、BLC-4-014 ACTIVE/REST、**50 張全真綠 BLEACH 牌組從正式 registry AI 自動完整鏡像對局**、真實 **GET（BLC-1-071）／DRAW（BLC-4-061）／ACTIVE（BLC-1-086）** 生命 Trigger 與 UID/非法選擇。這是實際狀態變更測試，不是只測 `createPack`。
5. **實際通過證據**：[Actions run 38672351858](https://github.com/will00t-debug/Ua/actions/runs/38672351858)（commit `dc7c786964`）：正式 registry＋ BLEACH 共六套專測 **38/38 通過**、Node 22 兩個模組語法通過；runner 與最新 A 核心同步後 BLEACH 六套 **38/38**，共用相關引擎能力測試 **56/56**。此 run 後的 CSV／交接文檔 commit 以各自最新 Actions 判定為準，不冒用更早 run 充當 HEAD。
6. **全庫尚非綠燈，沒有改共用斷言掩蓋**：引入正式 56 張後，一次完整 `npm test`（[run 38672158649](https://github.com/will00t-debug/Ua/actions/runs/38672158649)，是在 registry 專測來源 alias 修正之前）觀測到 **1047/1053 通過、6 失敗**：1 項為 B 本身「別名印刷須等於主印刷號」的過嚴測試，已修正並於上述 38/38 驗證；其餘 **5 項**為主線兩項既有 `once-per-turn-gate` 失敗，以及三項共同舊計數斷言：`universal-v2-bleach-real-deck.test.mjs` 強制 BLEACH registry 15 張、`universal-v2-title-pack-contract.test.mjs` 強制新貢獻 0 和 inventory BLEACH 15/261。最新預期應為 baseline 15／新增 56／合計 71／未移植 205；應由 A **改固定預期為可追溯的精確新卡號集合，保留反缺卡／重複／來源錯的防錯能力**，不能改成單純動態計數或刪斷言。B 未修改共用測試。
7. **CI 不反覆重跑同一批已知紅燈**：BLEACH 專屬 GitHub Actions 預設驗六套卡包＋registry和六套相關共用機制，均作為必要 gate；`npm test` 全庫保留 `workflow_dispatch` 手動重驗，待 A 修復五個上游項目才執行。分支不合併 main、不部署。A 合併此 PR 後正式 registry 將載入 71 張；**但還需要 A 在共用預覽入口將對戰 pack／50 張真卡牌組改用正式 registry**，否則網頁仍只能用原 BLEACH 15 張 Pilot。若 A 不合併，Production／PR70 仍只用其已合併內容。

**A 必須另外處理的共用入口任務（B 不修改）**：`dist/universal-v2-preview.mjs` 第 4、17–20 行仍 import 並固定建立 `verifiedBleachPurplePilotDeck()`；第 319–327 行對戰初始化從固定 `decks[myTitle]` 取 `mine.pack`，而非 `registeredV2TitlePack('bleach')`。可使用本線已在 registry 驗證的 50 張綠色卡號集合（見 `tests/universal-v2-bleach-registry.test.mjs` `GREEN_COUNTS`）替換或增加官方牌組選項，先驗證 `validateUniversalDeck` 再開始對局。調整共用 UI／入口屬 A 責任；此 PR 不改。
8. **逐卡台帳更新**：`B-bleach-inventory.csv` 為 **276 行、29 欄**，末尾新增分支已移植、此分支正式 registry 收錄、PR70 既有整合、逐卡完整 FAQ、實驗 V2 預覽是否真能選用該卡、真效果／Trigger 正向測試。**15 既有 Pilot 可由原網頁預覽使用／56 本線 registry 已接但尚不能由原預覽選用／205 未移植** 分別標記；`fullyAccepted` 仍以嚴格逐卡官文/FAQ標準記 **0**，不得把專測通過當成 71 張完全驗收。

**本輪實際新增新的 BLEACH 身份卡：0 張；將先前獨立完成的 56 張實際接入共用 registry（+56 正式貢獻），總數維持 71 張。** A 本次 27 個模板未發現可不失真的下一批候選者，先補了三種生命 Trigger、來源規範與真牌組完整 AI 對局；剩餘核心缺口詳見下文 205 張清單。

## 新增能力類型

| 能力 | 新增數 | 身份卡號／處理 |
|---|---:|---|
| 無固有角色效果 | 14 | BLC-1-002、BLC-1-012、BLC-1-018、BLC-1-021、BLC-1-071、BLC-1-083、BLC-1-086、BLC-2-023、BLC-2-025、BLC-2-031、BLC-2-036、BLC-2-056、BLC-2-059、BLC-2-066；嚴格 vanilla，**仍保留印刷的 DRAW／GET／ACTIVE 生命 Trigger** |
| 純 STEP | 3 | BLC-1-001、BLC-1-089、BLC-4-062；原生 STEP 前線移能源線與合法槽位／時序 |
| 登場強制回手 | 4 | BLC-1-017、BLC-1-035、BLC-1-068、BLC-2-020；模板 `bounceOwnOtherUnderEnergy(1)`：選其他己方角色（能源需求≤1），若無合法其他目標才回手本體，AP 不退 |

卡包每張卡均以當前 `CARDS` 的 `identity`、官方詳頁、原始卡文、印刷能源／AP／BP／產能／觸發等做嚴格一致性檢查；印刷資料改動就報錯。沒有套用 `auto:true`、空效果跳過實際能力、或改呼叫舊判定引擎。

官方卡文範例：[BLC-1-002（無角色能力／ACTIVE）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-002)、[BLC-2-023（無角色能力／DRAW）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-023)、[BLC-4-062（STEP／ACTIVE）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-062)、[BLC-1-035（登場回手）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-035)。

## 後續 35 張已使用 V2 正式運作路徑的簡單效果

| 類別 | 張數 | 卡號 | 實際能力 |
|---|---:|---|---|
| ACTIVE 額外產能 | 4 | BLC-1-010、BLC-1-075、BLC-2-029、BLC-4-014 | `activeExtraEnergy:1`，REST 僅保留印刷基礎產能 |
| IMPACT 無效 | 4 | BLC-1-008、BLC-1-043、BLC-1-067、BLC-4-035 | `impactNull:true` 僅戰鬥當下判定，保留 DRAW Trigger |
| 登場抽 1 | 2 | BLC-1-072、BLC-1-094 | `draw` 模板；包含真正場域卡 |
| 登場抽 1 棄 1 | 6 | BLC-2-008、BLC-2-016、BLC-2-052、BLC-2-071、BLC-4-026、BLC-4-040 | 強制抽棄並等待玩家選合法 UID |
| 攻擊抽 1 棄 1 | 1 | BLC-1-082 | 攻擊時效果先完成再允許阻擋選擇 |
| 攻擊 BP+1000 | 1 | BLC-1-090 | 自身本回合加成而非永久修改印刷 BP |
| 恢復最多兩張 AP | 8 | BLC-1-029、BLC-1-100、BLC-2-049、BLC-4-019、BLC-4-020、BLC-4-045、BLC-4-059、BLC-4-080 | FINAL 事件：正常使用恢復 AP；生命 FINAL 只有生命為零時適用 |
| 登場敵前線降 BP1000 | 1 | BLC-2-053 | 可不選，非法目標拒絕，BP 暫時下降 |
| 無額外角色效果 | 1 | BLC-4-061 | 官方效果欄為「-」，仍保留 DRAW 生命 Trigger |
| 全體特徵 BP 強化並抽牌 | 1 | BLC-1-097 | 本回合己方護廷十三隊角色全體 BP+1000，再抽1張；ACTIVE Trigger 獨立 |
| 登場選目標 REST（BP上限） | 1 | BLC-1-013 | 可選敵前線 BP≤3500，合法放棄／非法 BP 目標不通過 |
| 條件提高上限之 SPECIAL 事件 | 2 | BLC-1-099、BLC-2-048 | 原則 BP≤3000；有指定己方山本／露琪亞時≤5000，生命 SPECIAL 不受普通事件成本限制 |
| 登場 BP−500 且 COLOR 生命 Trigger | 1 | BLC-1-049 | [日本官方原文](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT/BLC-1-049)：登場可選對方前線 1 個 BP−500；COLOR 可從己方場外選需求能源≤2、AP1 的紫角色，ACTIVE 登場前線；皆以 V2 真實合法選擇實作 |
| 私密看牌頂、最多送場外1張、其餘牌頂排序 | 2 | BLC-4-009、BLC-4-067 | [BLC-4-009 官方印刷](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-009)（2 張）、[BLC-4-067 官方印刷](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-067)（3 張）：嚴格使用 `inspectTopArrange`，選放棄送場外／指定實際 UID、逐張排序，後段結算前不得跳過 pending |

以上每張同樣在獨立 `bleach-pack.mjs` 的 printed profile allowlist，來源保留官卡詳頁，卡文／數值異動會停止編譯。官方頁面代表例：[BLC-2-029 ACTIVE 追加能源](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-029)、[BLC-1-094 場域登場抽牌](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-094)、[BLC-2-008 登場抽棄](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-008)、[BLC-1-029 FINAL](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-029)。跨卡時序與 FAQ 仍待更完整驗證。

## 2026-10-15 07:04 (台灣) 後的修錯驗收／官方卡文校正

- **BLC-4-014 友哈巴赫**：日本官方印刷發生能源圖示為「黃+」，文字為「此角色處於 ACTIVE 時，額外產生 1 黃能源」。舊庫 `gen:2` 表示 ACTIVE 合計量，但在 V2 `activeExtraEnergy:1` 若同時設 `gen:2` 就會算成 3。本 BLEACH Pack 只在產生 V2 卡時明確將其 `gen:1,activeExtraEnergy:1`（ACTIVE = 2、REST = 1），仍使用舊版 `gen:2` 作來源變更指紋以防默默漂移。已補專測。官方頁面：[EX15BT/BLC-4-014](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-014)。**沒有修改共用卡庫／引擎**。
- **本分支單獨 CI 綠燈**：[Actions 38613289558](https://github.com/will00t-debug/Ua/actions/runs/38613289558) `9d913333`，專屬 12/12、`npm test` **1011/1011**、語法通過。包含一副 50 張綠色官方實體卡完整 AI 鏡像戰局與 UID 守恆。
- **與最新 PR #70 暫存合併：BLEACH 專測 18/18 過，但全庫仍有共用核心阻塞**（[整合 run 38613289558](https://github.com/will00t-debug/Ua/actions/runs/38613289558)）：2 個 `tests/universal-v2-once-per-turn-gate.test.mjs` 範例「放棄不應耗掉同名限次」「每張實體 UID 限次應分開計數」失敗。已確認它們**在 PR #70 本身的 [Actions 38612690292](https://github.com/will00t-debug/Ua/actions/runs/38612690292) 也失敗**，不是此 BLEACH PR 新增；本分支**不可改共用 engine.mjs**。第三個 audit 失敗是最初暫存合併使用 `--no-commit` 造成工作目錄髒污，不是業務邏輯；已改在**無 push 的 Runner** 裡 commit 暫存合併後再測，需再看最新 CI 才能確定第三個消除。
- 新版官方補充：2026-09-11 官方公告對 [EX15BT/BLC-4-056](https://www.unionarena-tcg.com/jp/news/171.php) 印刷效果勘誤；2026-10-09 官方 [Q2399](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-050) 說明露琪亞效果召喚戀次的 AP 支付時點。這兩張**仍在 208 張未移植清單中**，未官文重新校正前不得據舊資料移植。
- 原截止時間 **2026-10-15 07:00（台灣）已到**；此後只做本線測試修正、交接更新與對最新共用核心的隔離整合檢查，不承諾剩餘 208 張已完成。

### 獨立判定補充：BLC-4-014 能源印刷差異

[EX15BT/BLC-4-014 官方卡頁](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-014) 顯示能源欄為黃色「＋」，處於 ACTIVE 時追加黃色產能。原始專案資料把 `gen=2` 作為有效總產能；本獨立 Pack 經明確審核以 `gen=1`、`activeExtraEnergy=1` 解讀，避免 ACTIVE 時雙重計數成 3。額外測試驗證 ACTIVE 產 2、REST 產 1，並保留倉庫原值的差異檢查。

## 2026-10-15 截止後補充：未可移植的相似模板／最新整合證據

1. **BLC-2-055（EX07BT）**：已收錄日文原卡源網址，但目前 V2 `peekTopOne` 的合法選擇僅是 `top / outside`；此卡印刷要求 `top / bottom`。**需要新增不公開牌頂資訊的 `bottom` 選擇與狀態搬移**，而非錯誤地把牌底換成場外。最小情境：牌頂 1 張、選擇牌底、原牌庫第二張成為新牌頂、原 UID 在牌庫尾端、可選 top 時位置完全不變；非法 `outside` 必拒絕；對手視圖不可看到牌名／UID。
2. **BLC-4-013（EX15BT）**：要求看牌頂 2 張、**任意張**依任意順序放牌頂，其餘送場外；目前 `inspectTopArrange` 的 `toOutside:true` 只能選 **最多一張**。最小情境：兩張全留牌頂、送一張、送兩張三種都要成立；兩張留牌頂時序可反轉；送兩張後不能殘留 pending，也不能憑空增減實體 UID。兩張卡目前維持未移植，專屬 `universal-v2-bleach-top-inspect.test.mjs` 已建立 fail-closed 阻擋測試。
3. **BLC-1-030（UA08BT）**：卡庫轉錄「選 1 個敵方前線角色，將其轉為 REST」，有合法對手時**必須選一張**，但現有 V2 `restEnemyUnderBp` 模板把決策固定成 `optional:true`，會錯誤給予放棄鍵，不能沿用。此卡仍未移植；新專屬測試確認 V2 pack 拒絕該身份。核心最小測試：敵前線有 ACTIVE 角色時必須選其 UID、不可選 `null` 或手牌 UID；前線無可選目標時遵循正式事件使用合法性；AP 不足拒絕、所有 UID 守恆。官文／FAQ 仍需最後核對。
4. **BLC-4-065、BLC-4-068**：日本官方 [Q2335、Q2336](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT) 明定即使有**兩張同卡在場**，同一回合也只能由其中一張使用指定主要啟動能力；並非每張 UID 各可發動一次。需要按印刷效果／同卡限制做合法判定，切勿拿共用「同名、不同實體各別限次」當固定裁定。最小情境：兩張同號卡在場，第一張使用後第二張不得再發動；首張拒絕可選能力後是否消耗使用次數依官方成本與時點處理。此兩張維持未移植。
5. **整合阻塞屬最新 PR #70 上游**：獨立分支 [CI #38652613976](https://github.com/will00t-debug/Ua/actions/runs/38652613976) 在獨立核心環境 **12/12 BLEACH 主測試、1017/1017 全庫回歸通過**；CI runner 中乾淨暫存 merge 最新 PR #70 時，**21/21 BLEACH 專測通過、1037/1039 整庫通過**。僅失敗 `universal-v2-once-per-turn-gate.test.mjs` 的兩種限次情境，PR #70 自身的 [上游 run](https://github.com/will00t-debug/Ua/actions/runs/38612690292) 亦失敗相同兩項。因此**目前不能聲稱最新整合版本全綠**；本工作線不修改共享核心、不跳過這兩項測試，應由主線修正後再重跑整合 CI。

## 共用 V2 核心待辦（僅提需求，不在 BLEACH 分支修改）

| 受影響卡號示例 | 必要能力／預期裁定 | 最小專屬測試 |
|---|---|---|
| BLC-1-016、042、069、BLC-2-022 | 主要啟動 REST 自體、暫時額外產能、主階段結束退場；同名/次數和成本需先校驗 | 已 REST 不能再啟動；第二次使用非法；主階段結束同一 UID 恰好進場外一次 |
| BLC-1-051、053、BLC-2-040、042 | onLeave 觸發、抽多棄多、支付／選擇待決；目前 V2 時點不完整 | 攻擊／退場後效果排程，牌庫不足、非法棄 UID、不能跳過強制抽棄 |
| BLC-1-041、047、053、070、093；BLC-2-034 | 額外 Raid、指定底板／合法進場、登場時複合效果與底板守恆 | 場滿／AP 不足拒絕突襲；只有一張牌可 mill 時不錯誤獲得後續條件性能力；UID 恆等 |
| BLC-1-038、041、047；BLC-2-061 | 場外→除外固定／任意張數成本，支付成功後條件效果及前後區域 | 場外 0/1/3/4 張對比，成本不足不白拿後段效果；放棄原始狀態保持 |
| BLC-1-009、074、088、101；BLC-2-063 | IMPACT/DAMAGE 2／IMPACT 無效／第一次阻擋 ACTIVE／第二次攻擊 | 直接攻擊 vs. 戰鬥傷害、合法第二次阻擋／攻擊、阻擋後生命 Trigger 順序 |
| BLC-2-002、BLC-4-024、060、BLC-3 系列 | 跨線交換／位移、滿格替換、免疫／保護，選擇順序與同時觸發 | 滿格前能源線、非法目標、放棄選擇與 AP 成本不得變動；實體 UID 全保留 |
| BLC-1-028、063、BLC-2-011、032、BLC-4-082 | 牌頂 N 張私密檢視／多條件選取與餘牌放置，特殊條件抽牌 | 抽取不足 N 張、非法卡名、排序、隱藏資訊與跨作品 cardId、後續條件實現 |

相關官方問題集：[日本官方 UNION ARENA BLEACH 個別卡 FAQ](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AB%E3%83%BC%E3%83%89%E5%80%8B%E5%88%A5&sub_category=BLEACH+%E5%8D%83%E5%B9%B4%E8%A1%80%E6%88%A6%E7%AF%87)。已知 Q556：BLC-1-036 即使牌庫只剩 1 張，也要盡可能將實際有的牌送場外；不得假裝抽滿 2 張或直接跳過。Q557–Q562 涉及場外／除外成本與「若如此做」成立條件，須逐卡根據官方原文與 FAQ 再驗證，不得直接用舊引擎作答案。

### 2026-10-15 07:00 後：五個容易誤套用的核心缺口（已加 fail-closed 測試）

本組來自日本官方印刷卡文，不以舊引擎推論；測試檔為 `tests/universal-v2-bleach-core-gaps.test.mjs`。**均未納入 71 張獨立卡包**，避免將近似模板誤當完整能力。

| 卡號及官方卡文 | 缺少的精確能力 | 最小可解鎖回歸測試 |
|---|---|---|
| [BLC-1-009](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT/BLC-1-009) IMPACT (1) | 一般角色戰鬥勝利後 IMPACT 傷害，目前核心 `impactOnBattleWin` 僅處理裏向底卡條件，不接受一般印刷 IMPACT | 攻擊 3000 BP、阻擋 2000 BP 造成額外 1 傷；遇 IMPACT 無效不造成額外傷 |
| [BLC-1-074](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT/BLC-1-074) DAMAGE (2) | 直接攻擊造成 2 點生命傷害，需逐張處理生命 Trigger；現有無一般 DAMAGE 2 | 直接攻擊兩張有 GET/DRAW 的生命，逐張結算、不重複/遺失 UID |
| [BLC-2-007](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT/BLC-2-007) BP≥1000 全體降 500 | 現有 `enemyFrontAllBpDown` 會影響所有前線，**缺計算當下 BP≥1000 的集合門檻** | 對方 BP 500/1000/1500，只有後兩者降 500；不因第一張變動重算 |
| [BLC-2-055](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT/BLC-2-055) 私密看頂 1 張放頂或底 | `peekTopOne` 目前可選 **TOP／OUTSIDE**，而官卡要 **TOP／BOTTOM**；不得送場外 | A 在頂、B 在第二；選底後 B 在頂 A 在底，場外不變且不洩漏 |
| [BLC-2-063](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT/BLC-2-063) 每回合 2 次攻擊 | 首次攻擊立刻 ACTIVE，**每張實體限兩次，不是無限重置**；需和攻擊時點/強制選擇相容 | 同 UID 可攻擊第 2 次、第 3 次被拒；另同號實體各自獨立 |

額外核對：[官方 UA08BT 個別 Q&A](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA08BT) 與 [EX15BT 個別 Q&A](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT)。若核心新增這五類能力，必須先補逐卡正式時序及負向測試，才能從未移植改標完成。

### 最新實際 CI 證據（不可把上游失敗算本線通過）

- 已實際驗證含五個官方核心缺口拒絕測試的 [Actions run 38656678995](https://github.com/will00t-debug/Ua/actions/runs/38656678995)（commit `e6412cf9`）：BLEACH 既有首批 **12／12** 全過；完整 `npm test` **1023／1023** 通過（新增 3 個 core-gap tests）；Node 22 syntax 通過。
- 同 run 的 CI runner 暫存合入 PR #70 最新基底後，BLEACH 既有專屬 **22／22** 通過，整合全庫 **1043／1045**；僅 2 個限次 gate 測試失敗。PR #70 自己 [Actions run 38612690292](https://github.com/will00t-debug/Ua/actions/runs/38612690292) 也有相同兩項失敗；**整合仍是阻塞**，不在本分支修改 core。
- 後續已將五套 BLEACH 測試明列在獨立 CI 工作步驟，並擴充逐卡盤點為 **29 欄／276 行**：核心缺口、測試證據、是否已接入 PR #70（15 張舊 Pilot 與 56 張獨立新增卡分開）。**最新 HEAD 的 CI 結論仍需對應最新 run 查核，不能把先前成功算作本次 HEAD 通過。**

最新逐卡欄位說明：`B-bleach-inventory.csv` 後三欄明確表示「核心能力需求／缺口」、「現有可追溯測試證據」、「是否接入 PR70 整合版」；`未移植` 行即使有防錯測試，也只表示確保拒絕非法移植，**不當成卡片能力驗收通過**。

## 專屬測試與整合限制

- `tests/universal-v2-bleach-port.test.mjs`：新增卡清單、真卡 50 張 deck 驗證、STEP 合法／非法、成本／合法回手／無合法目標時自回、放棄與 UID 違規拒絕、生命 Trigger 宣告與資料保密、UID 守恆。
- 原有 `tests/universal-v2-bleach-real-deck.test.mjs` 仍用原 Pilot，不修改其結果；驗收兩者分開。
- **新增第三組 50 張可合法構築的 BLEACH 混色定向測試牌**：`tests/universal-v2-bleach-enemy-control.test.mjs`，覆蓋 BP3500 合法 REST／拒絕 BP4000、放棄選擇、露琪亞條件 BP5000 退場／一般情況 BP3000。
- **新增私密看牌／排序專屬測試**：`tests/universal-v2-bleach-top-inspect.test.mjs`：官方 2/3 張、最多送場外 1 張、可不送、牌頂排序、不可選未看 UID、私密資訊不洩漏以及 50 張實體卡守恆。
- **新增第二副合法 50 張全真 BLEACH 綠色測試牌**：`tests/universal-v2-bleach-green-match.test.mjs`，12 種普通綠卡各四張+兩張綠色 FINAL（含 field、STEP、IMPACT 無效、抽棄、護廷十三隊群體強化），執行全綠 AI 完整鏡像對局。
- **CI 已實測：GitHub Actions run [38611833944](https://github.com/will00t-debug/Ua/actions/runs/38611833944)（commit `b7683946`）：BLEACH 專屬 11／11 全過，全庫 `npm test` 1007／1007 全過，獨立模組 Node 22 syntax 通過。該 run 包含新綠色 50 張實體卡 AI 完局測試 3 項；其後文件提交需再確認 HEAD CI。**
- **整合測試已實際執行**：CI 在獨立 runner 中對最新 PR #70 主線做暫存 merge commit，未推送任何分支；新 BLEACH 專屬測試在整合核心上通過。完整回歸目前仍有 **2 個 PR #70 上游已存在的測試失敗**：`universal-v2-once-per-turn-gate.test.mjs` 的「選擇不發動不應消耗限次」及「同卡號不同實體各自限次」，見 [PR #70 本身失敗 run](https://github.com/will00t-debug/Ua/actions/runs/38612690292)（1013／1015）、[BLEACH 暫存整合 run](https://github.com/will00t-debug/Ua/actions/runs/38652031396)（1031／1033）。這屬上游 core 的阻塞，**沒有在本分支修共用核心或謊報整合全綠**。待上游修正後應重新跑合併回歸。
- **嚴格未更動** `engine.mjs`、`pack.mjs`、`ability-templates.mjs`、共用入口、AI、`real-card-pilots.mjs`。
- 02:00 前產出實際 276 卡盤點；04:30 前首批可整合 commit；05:30 後以修錯與交接為主。保留 Draft。

## 剩餘 205 張完整身份卡號

**BLC-1 (67)**：BLC-1-003、BLC-1-004、BLC-1-005、BLC-1-006、BLC-1-007、BLC-1-009、BLC-1-011、BLC-1-014、BLC-1-015、BLC-1-016、BLC-1-019、BLC-1-020、BLC-1-022、BLC-1-023、BLC-1-024、BLC-1-025、BLC-1-026、BLC-1-027、BLC-1-028、BLC-1-030、BLC-1-031、BLC-1-032、BLC-1-033、BLC-1-038、BLC-1-041、BLC-1-042、BLC-1-044、BLC-1-046、BLC-1-047、BLC-1-050、BLC-1-051、BLC-1-053、BLC-1-054、BLC-1-055、BLC-1-056、BLC-1-058、BLC-1-059、BLC-1-060、BLC-1-061、BLC-1-062、BLC-1-063、BLC-1-065、BLC-1-069、BLC-1-070、BLC-1-073、BLC-1-074、BLC-1-076、BLC-1-077、BLC-1-078、BLC-1-079、BLC-1-080、BLC-1-081、BLC-1-084、BLC-1-085、BLC-1-087、BLC-1-088、BLC-1-091、BLC-1-092、BLC-1-093、BLC-1-095、BLC-1-096、BLC-1-098、BLC-1-101、BLC-1-104、BLC-1-106、BLC-1-108、BLC-1-109

**BLC-2 (57)**：BLC-2-001、BLC-2-002、BLC-2-003、BLC-2-004、BLC-2-005、BLC-2-006、BLC-2-007、BLC-2-009、BLC-2-010、BLC-2-011、BLC-2-012、BLC-2-013、BLC-2-014、BLC-2-015、BLC-2-017、BLC-2-018、BLC-2-019、BLC-2-021、BLC-2-022、BLC-2-024、BLC-2-026、BLC-2-027、BLC-2-028、BLC-2-030、BLC-2-032、BLC-2-033、BLC-2-034、BLC-2-035、BLC-2-037、BLC-2-038、BLC-2-039、BLC-2-040、BLC-2-041、BLC-2-042、BLC-2-043、BLC-2-044、BLC-2-045、BLC-2-046、BLC-2-047、BLC-2-050、BLC-2-051、BLC-2-054、BLC-2-055、BLC-2-057、BLC-2-058、BLC-2-060、BLC-2-061、BLC-2-062、BLC-2-063、BLC-2-064、BLC-2-065、BLC-2-067、BLC-2-068、BLC-2-069、BLC-2-070、BLC-2-072、BLC-2-073

**BLC-3 (11)**：BLC-3-001、BLC-3-002、BLC-3-003、BLC-3-004、BLC-3-005、BLC-3-006、BLC-3-007、BLC-3-008、BLC-3-009、BLC-3-010、BLC-3-011

**BLC-4 (70)**：BLC-4-001、BLC-4-002、BLC-4-003、BLC-4-004、BLC-4-005、BLC-4-006、BLC-4-007、BLC-4-008、BLC-4-010、BLC-4-011、BLC-4-012、BLC-4-013、BLC-4-015、BLC-4-016、BLC-4-017、BLC-4-018、BLC-4-021、BLC-4-022、BLC-4-023、BLC-4-024、BLC-4-025、BLC-4-027、BLC-4-028、BLC-4-029、BLC-4-030、BLC-4-031、BLC-4-032、BLC-4-033、BLC-4-034、BLC-4-036、BLC-4-037、BLC-4-038、BLC-4-039、BLC-4-041、BLC-4-042、BLC-4-043、BLC-4-044、BLC-4-046、BLC-4-047、BLC-4-048、BLC-4-049、BLC-4-050、BLC-4-051、BLC-4-052、BLC-4-053、BLC-4-054、BLC-4-055、BLC-4-056、BLC-4-057、BLC-4-058、BLC-4-060、BLC-4-063、BLC-4-064、BLC-4-065、BLC-4-066、BLC-4-068、BLC-4-069、BLC-4-070、BLC-4-071、BLC-4-072、BLC-4-073、BLC-4-074、BLC-4-075、BLC-4-076、BLC-4-077、BLC-4-078、BLC-4-079、BLC-4-081、BLC-4-082、BLC-4-083

**未移植者不在 `createBleachV2Pack()` 白名單內，V2 拒絕其組牌／對戰要求；不會用未實作能力冒充完成。**
