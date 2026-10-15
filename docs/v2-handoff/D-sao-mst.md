# V2-D｜刀劍神域 SAO／無職轉生 MST 移植交接

## 第二輪最新交付（2026-10-15；本節優先於下方歷史清冊）

**共用基準：** 已把 PR #70 / `25eeac5084917534193fd9feaeae31672f902e78` 合入 D 分支，雙親同步 commit `383e1e2abf753a79ae7c4586b2b5396a44a26bec`，保留所有 D 來源與既有測試，**沒有直接改 A 的 engine/pack/templates/registry/preview**。當時 PR #70 樹內 **沒有 `docs/v2-handoff/A-core.md`**；使用實際 `V2_WORKSTREAM_HANDOFF.md` + `title-packs/contract.mjs` 作為明確契約。

| 作品 | 經核對的既有印刷身分 | 已移植 V2（definition） | 已正式接到 registry（contribution） | 逐卡完整官方 FAQ 驗收 | 預覽 UI 實際可選 |
|---|---:|---:|---:|---:|---|
| SAO（UA15BT／EX08BT／UA15ST／已查證 UAPR） | 183（202 筆商品印刷記錄去重） | **39** | **39** | **0（全面驗收未交付）** | **否**：主控 UI 入口仍只有 BLEACH／TTG 的預設 deck |
| MST（UA54BT/MST-1-001～080） | 80（80 日文原文與印刷參數已提供） | **23** | **23** | **0（全面驗收未交付）** | **否**：主控 UI 入口仍只有 BLEACH／TTG 的預設 deck |

**當前尚未移植**：SAO 144、MST 57。其餘不在精確白名單的來源資料不能藉著 `auto:true` 或 metadata-only 變成可玩。已註冊僅代表 pilot 效果 profile 經嚴格審核、可被共用 V2 engine 使用，**不是所有 FAQ 完整驗收**。`listRegisteredV2Titles().previewReady` 只表示 registry 有卡；**不表示 UI 已有可選牌組**。請 A 於共用 preview 入口接入以下兩份真卡 deck 後再讓使用者從網頁選取。

### 同一份定義的正式契約

- `dist/universal-v2/sao-pack.mjs` 與 `mst-pack.mjs` 各自輸出 `verified*V2Cards()` 與 `verified*V2Entries()`；`title-packs/sao.mjs`／`mst.mjs` **直接匯入同一份 sourceRecord／definition／evidence**，只維護一份已核對印刷白名單。正式 registry 與獨立 pack 的 **每個 canonical card 結構深度相同**，有可執行 regression 確認。
- `sourceRecord` 全部官方 JP cardlist URL；`evidence` 具官方原文、能力屬性與專測檔位置；vanilla 僅有真正「-」主效果或完全的 STEP 印刷效果，並額外提供 `verifiedNoExtraEffects`。缺卡、印刷數值不符、虛構效果、假來源、重複 ID 均於編譯階段拒絕。
- 後續新增 7 種由 A 已提供的 `buffOwnField` 模板**完整**表達的 optional 自家「其他角色」登場 BP 加成：**SAO-1-004／047／094、SAO-2-015／027／067（6）與 MST-1-061（1）**。測試包括實際支付綠／黃能源、選擇其他自家角色、放棄、對方卡與自身非法、BP 與 UID 守恆。

### MST 完整來源與舊主線差異

- **真實完整來源**：`dist/universal-v2/sources/{mst-catalog,mst-official-print,mst-inventory}.mjs`；`MST_V2_OFFICIAL_CATALOGUE` 覆蓋 **80/80**，保留官方日文 `effectJa` 與供共享 inventory 的 `effect`、印刷能源／AP／BP／產能／Trigger、完整官方卡號與出處。用途是「資料盤點」，**80 張 metadataReady 不等於 80 張 V2**。
- **舊主線 `dist/mushoku-tensei.mjs` 未覆寫**，包含 68 個 `VERIFIED` 物件及 12 個部分 `PARTIAL` 物件，但不是與完整來源同步的 80/80 日本印刷資料。A 可在自己的 `title-packs/inventory.mjs` 把 MST source 改指向 `MST_V2_OFFICIAL_CATALOGUE`；已於 [PR #70 主控交接](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6183112033)，**D 沒有擅動 shared inventory**。
- **當前官方卡片限制：MST-1-051（ロキシー）2026-10-01 起每組上限 1 張**，已從 [日本官方最新制限卡公告](https://www.unionarena-tcg.com/jp/rules/limited.php) 及 [官方卡頁](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-051) 重新查核，不靠舊稱述；來源適配器明確攜帶 `deckLimit:1`，**051 主效果未移植，不在可玩 pack／測試 deck**。共享 validator 若未來要加入此卡需 A 正式支援 limit enforcement，不能只依現有每張上限 4 的全域驗證器。

### 真卡牌組與實際 registry → engine

- `dist/universal-v2/sao-mst-real-decks.mjs`：`verifiedSaoV2RealDeck()`／`verifiedMstV2RealDeck()` 分別從**正式** `requireRegisteredV2TitlePack` 取得 pack，經 `validateUniversalDeck` 核對**各 50 張**、相同系列、每卡 ≤4、特別 Trigger 限額、官方 MST 限卡、無異圖／AP／`TEST-ONLY` 補牌。官方共通 [Q5、Q7、Q8](https://www.unionarena-tcg.com/jp/faq/list.php?type=0)：同作品、特別 Trigger 各類 ≤4、**混色可合法組牌**；因早期 Pilot 不足以湊滿單色 50，這兩副是**實卡雙色的合法測試牌組**，非競賽推薦。
- `tests/v2-sao-mst-registry-real-decks.test.mjs`：核對 source→definition→正式 Pack 合約、80 張 MST 資料與舊佔位差異、兩組 50 張 deck、跨作品 SAO vs MST 真卡 AI **完整終局**（分牌／支付／合法選擇／實體守恆）。另保留 SAO／MST 各自專測與 trigger、STEP、放棄等既有真卡測試。
- **預覽界線**：`dist/universal-v2-preview.mjs` 共用入口目前只 `import verifiedBleachPurplePilotDeck, verifiedTtgRedPilotDeck`，所以「registry/engine 真卡對局已跑通」**不等於**「手機預覽已可選 SAO/MST」。已交 [A 的 PR #70](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6183174573)。

### 回歸與阻塞（以最新 Actions 為準）

- 首批同步後系列專測 **21/21 綠燈**、真卡 registry 對局已走完整一場；擴增 `buffOwnField` 到 39/23 後，請以本 PR 最新 Node22 `isolated-port-regression` Job 與檔案版本的數字作為本輪實際證據。
- A-core 原先 **模板清單先後順序**一項在同步核心後已不再出錯；**兩項 once-per-turn**（跳過同名限次、不同 UID 限次）仍 fail；且 shared `tests/universal-v2-title-pack-contract.test.mjs` 尚硬碼 0/0 contribution，現因 39/23 合法整合而另失敗兩項。**這四項是主控檔案與共用測試責任，D 保留失敗並已交 A，不修改 core／global test／preview**。
- **最新完成的 PR head `fade68f5` Actions [#38672776485](https://github.com/will00t-debug/Ua/actions/runs/38672776485)：D 專測 24/24、0 failed；全量共 1,039 項，1,035 pass、4 failed**。四個失敗為 once-per-turn 測試 887／888，以及共用 title-pack contract/inventory 測試 996／1000。模板順序失敗確認已消失。兩份各 50 張的正式 registry 真卡牌組與一次完整跨作品 AI 終局均包含在綠燈專測內。\n- **once-per-turn 二項新診斷**：共享測試 `ready()` 用 `p.hand.push(take(s,0,id))` 想預載同 ID 三張／兩張，但 `take()` 先從 hand 找牌，可能只重複搬動同一 UID，導致 `play()` 才移走 deck 實體牌、干擾抽牌差額斷言；不應直接稱為核心限次實作錯誤。已在 [A 主控留言附可重現原因及修法](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6183252997)，須由 A 正確準備真實多 UID 手牌後重跑。\n- 必須由 A 更正 shared count assertions、inventory 和 once-per-turn，再將最新 A 核心再次整合回 D 做全套回歸。不能僅改斷言掩蓋卡片缺漏，也不能拿系列局部測試代替全面 FAQ 驗收。

### 第一輪紀錄以下仍保留（歷史快照，不作最新結論）


> 責任分支：`feature/v2-sao-mst-port-20261015`；整合目標：[V2 PR #70](https://github.com/will00t-debug/Ua/pull/70) `feature/universal-rules-v2-foundation-20261014`。2026-10-15 02:00 前初步盤點及首兩批獨立實作。**本文件為即時可讀取的 GitHub 缺口清單，未代表全部卡片已驗收或站點可玩。** 不合併 main、不部署正式站。

## 來源、產品及實際卡號盤點

- SAO 來源：V2 分支 `dist/sao-official-import.mjs`（源自 [WIP PR #9](https://github.com/will00t-debug/Ua/pull/9) 官方日本逐卡擷取）；202 筆官方產品印刷紀錄，扣除同卡號再版後 **183 個獨立一般卡號**；正式身份為 `SAO-1-001～109` **109**、`SAO-2-001～074` **74**。各產品原始紀錄：`UA15BT` 100、`EX08BT` 74、`UA15ST` 18、當時查證的 `UAPR` 10。各產品有重複卡號，不應把 202 當成 202 種效果。未掃描到的獨立限定／推廣活動卡仍可能存在，**不得宣稱 SAO 過去至今所有促銷卡已完整**。
- MST 來源：從 [WIP PR #10](https://github.com/will00t-debug/Ua/pull/10) 保留原封不動的 `dist/universal-v2/sources/mst-catalog.mjs`、`dist/universal-v2/sources/mst-official-print.mjs`，是 **UA54BT／MST-1-001～080 共 80** 張官方日文卡文／印刷資料；來源核驗執行紀錄 [官方卡表探測 CI #38450040170](https://github.com/will00t-debug/Ua/actions/runs/38450040170)。V2 舊版 `dist/mushoku-tensei.mjs` 仍有過時佔位欄位，**沒有覆蓋該檔或其他對話正在修改的資料**。
- 所有產品的 AP 異圖卡與純異圖／簽名／平行圖均排除；一般卡本身**消耗的 AP 並未排除**。原始圖片僅沿用網址，沒有複製受版權保護的圖片檔。

## 狀態互斥統計（V2 專屬授權狀態；不等於完整官方 FAQ 驗收）

| 分類 | SAO | MST | 說明 |
|---|---:|---:|---|
| 範圍內缺少印刷卡號／官方來源紀錄 | 0（目前已掃描的 183） | 0（UA54BT 80） | SAO 其他尚未查獲的限定卡 **未知，不能視為 0** |
| 明確移植 V2 Pilot、待 CI 及逐張 FAQ 深驗 | **33** | **22** | 逐卡原文與印刷數值鎖定，失配即拒絕建立 Pack |
| 已收錄資料但**未**移植至 V2 | **150** | **58** | 不在白名單、不允許對戰；其中「缺核心能力」是本列的子集合 |
| 系列來源鎖定／專測執行 | 33 種具逐卡原文數值核對 | 22 種具逐卡原文數值核對 | [最新 CI](https://github.com/will00t-debug/Ua/actions/runs/38612236937) **系列與跨作品共 15/15 個可執行測試通過**；這不等於 55 種卡逐卡所有 FAQ 效果全面驗收 |
| 未完成全卡 V2 逐張 FAQ 驗收 | 183 | 80 | 尚不得聲稱每張效果全面驗收 |

### SAO V2 第一批：33 個明確卡號

- **vanilla (15)**：`SAO-1-019`、`SAO-1-023`、`SAO-1-035`、`SAO-1-039`、`SAO-1-054`、`SAO-1-058`、`SAO-1-068`、`SAO-1-069`、`SAO-1-084`、`SAO-1-088`、`SAO-1-102`、`SAO-1-106`、`SAO-2-028`、`SAO-2-035`、`SAO-2-047`
- **step (2)**：`SAO-1-001`、`SAO-1-082`
- **onPlayDraw (2)**：`SAO-1-061`、`SAO-2-041`
- **onPlayDrawDiscard (3)**：`SAO-1-016`、`SAO-1-055`、`SAO-1-078`
- **impactNull (5)**：`SAO-1-026`、`SAO-1-027`、`SAO-1-074`、`SAO-2-026`、`SAO-2-045`
- **onPlayBounce (4)**：`SAO-1-006`、`SAO-1-046`、`SAO-1-095`、`SAO-2-046`
- **onPlayPeekTop (1)**：`SAO-2-040`
- **onPlayRestEnemy3000 (1)**：`SAO-1-042`

### MST V2 第一批：22 個明確卡號

- **vanilla (6)**：`MST-1-001`、`MST-1-002`、`MST-1-020`、`MST-1-027`、`MST-1-050`、`MST-1-070`
- **onPlayDraw (1)**：`MST-1-017`
- **onPlayDrawDiscard (1)**：`MST-1-022`
- **onAttackDrawDiscard (2)**：`MST-1-012`、`MST-1-018`
- **impactNull (2)**：`MST-1-015`、`MST-1-071`
- **activeExtraEnergy (2)**：`MST-1-029`、`MST-1-072`
- **step (1)**：`MST-1-047`
- **peekTopOne (1)**：`MST-1-069`
- **bounceOtherEnergyOne (2)**：`MST-1-019`、`MST-1-044`
- **recoverApTwo (4)**：`MST-1-034`、`MST-1-037`、`MST-1-077`、`MST-1-079`

**驗收界線**：被標作 vanilla 的卡，官文主效果確實為「-」；STEP 也只含純 STEP。任何條件句、別名、被動、退場、特殊 Trigger 未被「省略」成無效果卡。印刷 GET／DRAW／ACTIVE／FINAL 由 V2 通用生命 Trigger 模型處理，COLOR／SPECIAL／RAID 需先核對完整個別裁定才授權。部分 Pilot 尚無可重現的逐卡 Trigger／效果交叉矩陣，不得宣稱已通過完整官方 QA。

## V2 未移植：精確卡號

以 **三位尾碼清單** 表示所有範圍內已有印刷資料但未進 V2 白名單的卡號；可供其他 Agent 直接選批次處理。卡號不等於產品商品序號。

### SAO（150；SAO-1 及 SAO-2）

- `SAO-1-`: 002, 003, 004, 005, 007, 008, 009, 010, 011, 012, 013, 014, 015, 017, 018, 020, 021, 022, 024, 025, 028, 029, 030, 031, 032, 033, 034, 036, 037, 038, 040, 041, 043, 044, 045, 047, 048, 049, 050, 051, 052, 053, 056, 057, 059, 060, 062, 063, 064, 065, 066, 067, 070, 071, 072, 073, 075, 076, 077, 079, 080, 081, 083, 085, 086, 087, 089, 090, 091, 092, 093, 094, 096, 097, 098, 099, 100, 101, 103, 104, 105, 107, 108, 109 (84)
- `SAO-2-`: 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025, 027, 029, 030, 031, 032, 033, 034, 036, 037, 038, 039, 042, 043, 044, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 064, 065, 066, 067, 068, 069, 070, 071, 072, 073, 074 (66)

### MST（58；MST-1）

- `MST-1-`: 003, 004, 005, 006, 007, 008, 009, 010, 011, 013, 014, 016, 021, 023, 024, 025, 026, 028, 030, 031, 032, 033, 035, 036, 038, 039, 040, 041, 042, 043, 045, 046, 048, 049, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 064, 065, 066, 067, 068, 073, 074, 075, 076, 078, 080 (58)

## 交給 V2 主控的核心能力缺口（不能獨立補另一套引擎）

| 需求／受影響實體卡號（示例，非完整分類） | 實際時序與待驗收情境 | 原因及交接 |
|---|---|---|
| **SAO-1-107** 抽 3 棄 1；其他「查看多張／挑一張／指定去向」如 **SAO-1-005**；MST-1-010／028／033／043／055／065／068 | 登場時按原文依序抽牌、玩家從私密候選合法挑選、加入手牌／送場外／放回頂底、可能支付棄牌；牌庫張數不足與放棄選項；不可洩露給對手 | V2 `drawDiscardOne` 僅是抽1棄1；`inspectTopArrange` 不能任意冒充「公開加入手牌」。加多步私有選牌及嚴格成本鏈 |
| **MST-1-006／007／021／033／039／040／062** | 登場或事件二選一；額外 AP 支付成功才繼續抽牌並讓手牌角色 REST 登場／Raid；可跳過，非法選項不能扣 AP，滿場、底板、複合能力次序 | V2 只有特定條件的 COLOR 免費登場模板；缺可組合的印刷費用、分支與多段部署工作流；FAQ **Q2145（MST-1-007）** |
| **SAO-1-018、MST-1-008／009／025／031／032／054／067／068** | Raid 別名、底板身分、頂卡離場底板留場、不同攻擊窗口、印刷常駐效果、禁止 ACTIVE；滿場換位與同名判定；生命 RAID nested onPlay | 現有 V2 Raid 不應自動證明此組的特殊效果；MST **Q2146／2147／2148～2151／2153／2159／2163** |
| **MST-1-013／052／064／067／074／075／076** | 退場時抽牌、退場頂層／底層回手、場外復活、可選成本與不重發 onPlay、因自己／敵人效果離場時的順序 | 缺通用 `onLeave`/退場事件鏈與關聯來源 UID；測試含同時退場與替代及區域總數守恆 |
| **MST-1-054／067／068、SAO-1-018** | 失去**原本印刷**能力、受保護角色不能被對手效果選、並不失去外部授予能力；已存在的 buff 和額外能力如何處置 | 缺來源綁定的持續效果、選擇免疫與 silence 特定語義；官方 **Q2158～2160、Q2162、Q2220、Q2228** |
| **MST-1-031／038／042／048／062／073** | 同名跨複本每回合限一次，AP 減免消耗時機，主動 REST、加 BP、再 ACTIVE、攻擊後重置；已 ACTIVE 可否再次發動 | 主動能力目前僅非常窄的兩選範例；需全域／同名限制和特定費用狀態；**Q2152／2154／2156／2157／2161／2164／2165／2205／2208** |
| **MST-1-051**（必要限制） | 牌組允許 **最多 1 張**（已記錄 2026-10-01 限制）；組 50 張時若 2 張必須拒絕 | `validateUniversalDeck` 只核對普通同卡 4 張，**絕不能**以宣稱 4 張合法移植；主控需增加逐卡限制來源及牌組驗證 |
| **MST-1-023／024／026／057／058／059／060／061／063／066／073／080** | 己方效果登場、產能≥7、同名或場域是否存在、自己回合狀態、前線產能光環、攻擊特殊時點、限定位置 | 缺持續條件及來源綁定、選擇友方 BP、在前線產能判定，不可用「抽一張」忽略附加條件 |
| **MST-1-078** 與 SAO 大量 SPECIAL／COLOR 觸發 | 複合印刷退場 BP3000（有同名改成 BP5000）與 SPECIAL 任意目標；可放棄、非法目標、生命來源、己方與敵方回合 | V2 需嚴格依 Trigger 印刷類型與來源差異處理；不能預設所有 COLOR 都是免費部署 |

官方 FAQ 來源請以 [日本官方卡表與問答](https://www.unionarena-tcg.com/jp/cardlist/) 實際逐題驗證；[MST 來源分支 FAQ 矩陣](https://github.com/will00t-debug/Ua/blob/feature/mushoku-tensei/docs/mst-faq-matrix.md) 是待核對議題，**其中 PENDING 均不是已經驗收。**

## 第一批程式與測試（獨立檔案）

- 專屬 V2 Pack：`dist/universal-v2/sao-pack.mjs`（33）與 `dist/universal-v2/mst-pack.mjs`（22）；只有白名單能建立 Pack，日文原始效果／能源／AP／BP／Trigger 不吻合時 fail-closed；**未**呼叫獨立作品戰鬥引擎。
- 專屬測試：`tests/universal-v2-sao-port.test.mjs`（合法 AP、手牌棄牌、STEP、UID）、`tests/universal-v2-mst-port.test.mjs`（onPlay/onAttack、AP 恢復／放棄、合法回手／非法選擇、私密牌頂、STEP、能源）、`tests/universal-v2-sao-mst-cross-title.test.mjs`（兩份各 50 張真卡身份、跨作品攻擊、生命 GET、UID 守恆與對手公開視圖）。
- 目前 SAO 33 種、MST 22 種 Pilot 各可構成 **測試用的一組 50 張卡號組合**（不是賽事強度驗證，也未宣稱可玩完整整局；不是 183 或 80 張全移植）；正式站入口、卡包共用註冊請由 V2 主控另行決定。
- 當前初始提交：MST 來源 `06506735`／`7cb8953e`，MST Pack `6ac6a5c4`，SAO 專屬測試 `578e2d7d`，MST 測試 `3d0fe675`（後修 `fcbfdb7b`），跨作品 `1b74ba59`；SAO Pack 的 GitHub 提交由當前分支檢視即可。提交 SHA 並非測試證據。
- **CI 狀態**：第一批 44 種 Pilot 的 [Node 22 CI 第三次執行](https://github.com/will00t-debug/Ua/actions/runs/38610933577) **11/11 專測、1018/1018 全量回歸通過**。SAO 第二批新增後的 [第六輪 CI](https://github.com/will00t-debug/Ua/actions/runs/38611519532) **15/15 系列專測通過，但共用全量在當次 CI 1021/1022 通過、1 失敗**：V2 base 新增 `oncePerTurnThen` 模板、共用 `tests/universal-v2-ability-templates.test.mjs:17` 的精確預期陣列未同步；不是本 PR 新增卡包的錯誤。已以 [主控 PR #70 留言](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6174942574) 交接，**絕不在 V2-D 分支修改共用引擎或共用測試掩蓋失敗**。原 `.github/workflows/tests.yml` 只對 `main` push／PR 執行，必須額外對 V2 base 設定測試；本分支 `.github/workflows/v2-d-sao-mst.yml` 分為兩個獨立顯示的 Job：系列專測 green 與共用回歸（若上游未修仍 red）；主控應按最新 merge SHA 重跑，不把上游紅燈稱成通過。
- 禁止修改／已保留：`dist/universal-v2/engine.mjs`、`pack.mjs`、`ability-templates.mjs`、`real-card-pilots.mjs`、共用入口及原有 SAO/MST 檔案。不得假借 flags、忽略任何剩餘印刷效果或部署 Production。


- **後續核心主線同步最新測試**：在 [run #38611979614](https://github.com/will00t-debug/Ua/actions/runs/38611979614)，獨立 SAO/MST **15/15 通過**，但與新版主控 V2 合併後，共用回歸 **1023/1026（3 失敗）**：模板 `oncePerTurnThen` 順序預期差異 1 項，以及 `universal-v2-once-per-turn-gate.test.mjs` **跳過可選同名限次**與**跨不同 UID 限次**各 1 項。已於 [PR #70 留言交主控](https://github.com/will00t-debug/Ua/pull/70#issuecomment-6174989623)；**本任務不能擅自修共用核心／共用測試**。

## 下一輪工作與分工

- **02:00 前**：本份初步卡號／能力缺口盤點與首批 55 個明確 V2 Pilot。
- **04:30 前**：對本 Draft PR 進行 Node 22 V2-D 系列專測／全量回歸，修復實際失敗案例；更新 commit／結果。
- **05:30 後**：僅處理 CI 回歸、跨作品互動、邊界時序與主控所需交接，**不新增無法驗收的卡片**。主控負責缺少的通用引擎能力；我們不建立作品獨立引擎。

所有計數均以該次 GitHub 檔案內容計算；若資料源或 V2 base 在其他聊天室新增提交，整合者須比較 SHA、重跑清冊，不可覆寫其更動。
