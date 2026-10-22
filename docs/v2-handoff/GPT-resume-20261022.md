# UNION ARENA V2｜GPT 接手 Cursor 第十八輪（2026-10-22）

> 此為 GPT 新分支接手後的集中交接檔。完整歷史追加於 [GPT-resume.md](./GPT-resume.md)，以該文件最後的「GPT 接手 Cursor PR #77」為最新狀態。

## GPT 接手 Cursor PR #77（2026-10-22）

**目前最新工作分支** `gpt/v2-resume-20261022`；獨立 Draft PR [#78](https://github.com/will00t-debug/Ua/pull/78)，合併目標是 `cursor/v2-multi-retire-life-6ff5`，不是 main。由 Cursor 已驗收第十八輪 HEAD `e12b0ca225e5b099a2cbae70cdae39d9b25d3cd7` 建立，沒有複製新專案、改寫 Cursor 分支、合併 main、部署正式站或 force push。Cursor 原 Draft PR #77 仍留在原本分支。保留第十一至十八輪原有成果。

**第一批：官方複合特徵的可審核語意。** `5df01cd8f368478d264d615f872a13cb44265a1f` 新增 `traitComponents`（只接受已在來源適配層明確審核的卡面），保留官方原始 `traits:["DFN／第四次架南島レイド"]` 完整 token，不把其他未審核斜線字串猜成兩個特徵。SLG-1-069、SLG-1-065 有獨立來源證據。共用 `cardHasTrait`、`ownTraitCount` 與 distinct trait count 支援經審核複合特徵。首輪 CI [39762663751](https://github.com/will00t-debug/Ua/actions/runs/39762663751) 1675/1677，兩項失敗是自製 fixture 漏 `continuousStates`，及 SLG-1-062 舊測試錯誤排除帶有官方複合特徵的 069。修正 `dc8261cf634c18c4f32ea79180c0a9b74583871a` 的遠端 [39762978752](https://github.com/will00t-debug/Ua/actions/runs/39762978752) 成功。

**第二批：解除 SLG-1-072 阻塞。** `e2cc69c63247f9e449843bf8383ddfe771a1f163` 實作可跨作品重用的 `drawIfOwnTraitCount`，明確定義己方 front/energy 範圍、是否排除自己、特徵原文 token、最少卡數及抽牌數；在真實 `onPlay` 結算時判斷而非登場前快照。官方 UA51BT/SLG-1-072 ミズア，綠 3／AP 1／BP 2000／產生綠 2／無 LIFE，己方場上［DFN］含自身共至少 3 張時抽一張。登錄唯一實際新卡 `SLG-1-072`，加入獨立 manifest、正反測試及本標題官方證據，更新 `audit/v2-c-slg-status.csv` 確認來源與審核狀態。CI 初期因漏同步 strict template allowlist、title pack 證據與 CSV 造成報錯，經 `30d82ac1c6c7974820c60631dac6e9a73bba95ba`、`ed21e7deab13893a439b550ef2851e1f6a69a169` 修正後，[39763959023](https://github.com/will00t-debug/Ua/actions/runs/39763959023) 遠端成功。所有舊規則與卡牌保留。

**第三批：共用特徵目標一致性。** `b9fbcb95967fb1d93c20e3e05c5624f7af9127e9`：`buffOwnTrait`、`buffOwnTraitAllTurn`、`main-two-buff`、`effect-buff-trait` 以同一來源審核 `cardHasTrait` 選擇或再次核對實體 UID，不任意拆解未審核複合字串。新增合成跨區域、跨玩家、確切印刷與未審核負例測試，不視為新增實卡。遠端 [39764357733](https://github.com/will00t-debug/Ua/actions/runs/39764357733) **Node 22 成功**。

### 截至程式 SHA b9fbcb9 的獨立遠端驗收

- **GitHub Actions**：Node v22（`actions/setup-node@v4` version `22`），2026-10-22，run `39764357733`；`npm test` **1683/1683 pass, 0 fail**；`node scripts/v2-integrated-match-matrix.mjs` **60/60 finished、0 failures**；`node scripts/v2-assert-independent-manifest.mjs` **success、312 IDs**；`node scripts/v2-unported-report.mjs` **success**。
- 五作品正式登錄：BLEACH 97/276、TTG 35/81、SLG 41/80、SAO 91/183、MST 48/80；**312/700**；未移植 **388**（BLEACH 179、TTG 46、SLG 39、SAO 92、MST 32）。本輪只新增正式卡 `SLG-1-072` 一張。
- **沒有本地 clone / 本地 Node 測試**：此執行環境對 GitHub clone DNS 解析失敗，所有成功數字指向 GitHub Actions，不假稱本地通過。
- **官方 FAQ 全面逐卡認證：0**。正式登錄、Node22 自動測試、五作品矩陣與完整官方 FAQ 驗收是四件不同的事。本輪只對有限印刷內容及語意人工核對；沒有手機或正式站手動 QA。
- 原始 Cursor 第十八輪與此前數字保留在以上歷史段落；以此節的 GitHub Actions 數字為 GPT 接手驗收依據。**本次文件提交後新 SHA 需另看自己 CI**，不能套用上述結果。

### 下一批應處理

1. 繼續分離經官方證實的複合特徵與未審核 slash；某些舊 `matchesFilter` 仍有字串拆分歷史行為，**本輪沒有擅自統一或宣稱已完備**。
2. 通用區域移動事件／來源追蹤（原效果、付款、LIFE、手牌／場外／場上）；帶明確實體 UID、觸發時間與可見性。
3. DSL 費用＋合法目標＋時機＋條件組合；未審核 Raid 幾何與連鎖 Raid 繼續 fail-closed。
4. Q73、DAMAGE(2)、LIFE Trigger 結算相異；再登場 UID 攻擊／阻擋計數歸零尚無正式依據不得猜測。持續比對官方 FAQ 再實作。
5. 不為增加卡數而新增大量作品專用 `if`；下一批要有共用能力、反例、測試與明確紀錄。


## GPT 第十九輪｜統一特徵與私有移動來源（2026-10-22）

**最新程式 SHA `7ad676e42bc6b3fbc97edeee60f4110d899268d0`**；本輪沿用
`gpt/v2-resume-20261022` / Draft PR [#78](https://github.com/will00t-debug/Ua/pull/78)
→ `cursor/v2-multi-retire-life-6ff5`，原 PR #77、main、正式站均未修改、未部署、未 force-push。
第十一～十八輪 Cursor 成果和 GPT 前輪的 SLG-1-072、複合特徵能力均保留。

### 已執行的五個相關批次（含驗收修正）

1. **Batch A** `55123874f274b957d8e860540a15ea69489d810a`：
   `matchesFilter` 的不安全 slash 字串任意拆分改為已存在的
   `cardHasTrait`；主階段 trait mode 合法性與 Raid 後 BUFF 模式也共用
   同一來源審核語意。MST-1-065 的 `inspectTopTraitOutside` 仍依原印刷
   exact-token 規則嚴格比對，不擅自改語意。新增
   `tests/v2-r19-trait-selector.test.mjs` 和
   `docs/v2-handoff/V2-R19-trait-path-audit.md`。Actions
   [39765760482](https://github.com/will00t-debug/Ua/actions/runs/39765760482) 成功。

2. **Batch B1** `eccffd3dc3f0c6422933dc7edfa4032264a6292a`：
   新增單一共用來源輔助模組
   `dist/universal-v2/zone-move-events.mjs`，掛入既有 V2 reducer，
   每筆完成的私有事件有物理 UID、cardId、owner、controller、
   來源／目的區域、原因、來源 UID/印刷姓名與顏色、當下來源是否在場、
   回合及單調序號。接入已完成的手牌棄牌費用、效果棄牌、場外回手，
   保留 `turnEffectZoneMoves`；非法選擇／預覽／跳過不造假移動。
   Actions [39766215458](https://github.com/will00t-debug/Ua/actions/runs/39766215458) 成功。

3. **Batch B2** `f693a14950e2f1027f6db161ae375655b7c4a499`：
   在既有成功移動點記錄真退場、部分場外效果入場、
   LIFE 傷害移往場外、LIFE GET 回手、COLOR 從場外入場及 Raid 頂牌剝離；
   保留原本退場／Raid／LIFE 效果排序。Actions
   [39766727055](https://github.com/will00t-debug/Ua/actions/runs/39766727055) 成功。
   後續 `3bec0ce6723c59b4b51efe602d1dab7d0bbc4f0f`
   增加已完成的 deck→outside、部分 TOP-N 放場外、
   field→hand 自身回手與一般手牌登場來源紀錄，配合
   `7ad676e42bc6b3fbc97edeee60f4110d899268d0` 的舊測試相容修正後遠端驗收通過。
   這**不是**所有區域移動的完整覆蓋；draw deck→hand、特殊 Raid
   幾何與少數其他路徑仍需逐項補審。

4. **Batch C** `f29ed2056f9bdc7015a59fe10fd595eaa47566a4`：
   `validateCompletedMoveCondition`、`matchesCompletedMove`、
   `completedMovesMatching` 僅選擇真正完成、有來源證據的紀錄，
   嚴格限定條件鍵與 enum，允許指定來源、玩家、移動方向及
   payment／own-effect 等具區別的原因。基於 BLC-2-047
   官方 EX07BT 卡文與 **Q1033／Q1046／Q2315** 撰寫負例測試與來源文件。
   **不在移動瞬間盲目執行觸發，也尚未實作來源效果整段結算後入列**。
   BLC-2-047 與 BLC-2-019 的完整聯動未驗證，兩卡不得因本輪視為完成。
   Actions [39767072980](https://github.com/will00t-debug/Ua/actions/runs/39767072980) 成功。

5. **Batch D/E 驗收** `d202228be6ce481d6284ff32b08a693170c67c84`：
   既有 `chooseOne` → `discardGate` → `oncePerTurnGate`
   → `draw` 可以使用原共用 effectQueue、合法動作及 AI
   而不新增 op；加上可選成本、非法 UID、取消、負面 DSL 資料測試。
   另在 `V2-R19-dsl-and-faq-audit.md` 盤點未完成官方規則。
   Actions [39767402456](https://github.com/will00t-debug/Ua/actions/runs/39767402456) 成功。

### 回歸處理與相容性

- `eeab663b5adcf311723d12aef6556f23cd448c5f`
  首先正確區分對手強制棄牌為 `opponent-effect`（owner/控制者不同），
  但舊 `turnEffectZoneMoves` 有歷史較寬布林行為，
  GitHub Actions [39767604952](https://github.com/will00t-debug/Ua/actions/runs/39767604952)
  顯示兩個原有案例受影響；`7189d5ab61f882e87ff49f7977c67d0b612fb3dd`
  恢復舊布林行為，**新的細分移動來源仍正確**，避免既有卡牌回歸。
  [39767808268](https://github.com/will00t-debug/Ua/actions/runs/39767808268) 成功。
  對手效果來源必須用新 journal，**不可**靠舊布林辨認。
- Deck mill / paid-play journal 擴充版 `3bec0ce` 的遠端
  [39768100161](https://github.com/will00t-debug/Ua/actions/runs/39768100161)
  1693/1696 通過、3 fail；其中舊 fixture 直接 `s.turn++`
  和兩個新測試假設一般登場沒有事件。修正
  `7ad676e42bc6b3fbc97edeee60f4110d899268d0` 後完整通過。
  **不刪除任何失敗測試，也沒有撤銷實際登場來源紀錄。**

### 最後一個程式提交的實際驗收

**GitHub Actions [39768352364](https://github.com/will00t-debug/Ua/actions/runs/39768352364) —
`7ad676e4` — Node.js 22 — success**：

- `npm test`：**1696／1696 pass；0 fail**。
- `node scripts/v2-integrated-match-matrix.mjs`：**60／60**；0 失敗。
- `node scripts/v2-assert-independent-manifest.mjs`：通過，
  BLEACH 97、TTG 35、SLG 41、SAO 91、MST 48；合計 **312**。
- `node scripts/v2-unported-report.mjs`：通過，五作品共 **700**，
  V2 已登錄 **312**、未移植 **388**；全面官方 FAQ 認證 **0**。
- 本輪淨新增實卡 **0**；合成測試與資料驗證器絕不計入。
- **沒有本地 npm test / 本地矩陣**：本工作環境無法 DNS 解析
  `github.com` 下載專案，完整通過數僅來自遠端 GitHub Actions。
  沒有進行實機 UI、正式站或完整官方 FAQ 手動驗收。
- 本次交接文件另提交新 SHA；**文件 SHA 的 CI 要另查**，不可沿用
  程式 SHA 的成功作為文件提交已驗收的證據。

### 官方規則風險與下一輪

- Q73（2023-03-17，Damage2）原文要求同時翻出多張生命卡並可
  選擇多觸發順序；現有 `additionalBattleDamage` 按次序逐張處理，
  存在 **已知尚未完成的官方規則差異**。未在本輪冒然更動核心。
  須連同 Q71／Q72、FINAL、Impact 與資訊揭露重新設計和驗證。
- Q1033 明示 BLC-2-019 全部起動效果結算後才觸發 BLC-2-047；
  來源條件資料已可查詢，**跨效果完成邊界排隊尚未實裝**。
  Q1046 不需事件卡藍2能源；Q2315 即使後續埋入裏向底牌仍可觸發。
  先完整審核來源卡與 source effect queue boundary，再考慮正式移植。
- 其餘：多重退場／中斷恢復、MAIN 結束真退場與回手排序、
  未審核 Raid 多層幾何／連鎖 Raid、物理 UID 離場再入場後的
  攻擊阻擋次數、封印後的既成效果、尚未記錄的移動路徑，維持
  保守判定與回歸保護。
- 下一輪優先（1）補齊常見移動 journal 缺口與來源 snapshot
  （2）設計單一共用 after-source-resolution trigger drain
  （3）BLC-2-019／047 真卡測試（4）Q73 DAMAGE2 simultaneous
  life reveal 的獨立狀態與 hidden-information 驗收
  （5）跨標題 AI／人類一致性、UID 再入場 FAQ。


## GPT 第二十輪｜來源效果結算邊界與完整移動事件（2026-10-22）

**沿用分支** `gpt/v2-resume-20261022`、Draft PR #78 →
`cursor/v2-multi-retire-life-6ff5`；起始 HEAD
`fd469bb86ce1817a9d1b1e504590959d7c437211`，
最後已驗收**程式** SHA `7b9f1cc6e426b2901c8d56aceec1bf7faf222d2c`。
沒有建立新分支、改 main、改 Cursor PR #77、部署正式站或 force push。

### 五批實作與各自提交

1. **A：真實抽牌的 deck→hand 事件** —
   `e9bbda244530759cce6763439cd3827029d73d78`，
   改善 `draw` 共用呼叫並使用已存在的 completed move ledger，
   每一張抽到手中的物理 UID 留下順序／來源；
   一般規則抽牌與已完成的來源效果抽牌分開，
   opponent 不能從 `universalPublicView` 取得隱藏身分。
   Node22 遠端 [39770014603](https://github.com/will00t-debug/Ua/actions/runs/39770014603)
   **1698/1698、矩陣60/60**。

2. **B：指定牌庫搜尋與 LIFE 移動** —
   `a6bd8034c878f0bfc396409e5af46e1626c0225a`：
   單張/多張 deck search、top-filter 命中 deck→hand、LIFE
   RAID/GET 外→手、FINAL deck→life、COLOR hand→field，
   結束手牌超限 hand→removed 等移動成功後記錄來源。
   初次 [39770413261](https://github.com/will00t-debug/Ua/actions/runs/39770413261)
   因新合成測試忘記宣告既有 `shuffle:true` 造成一項檔案層級失敗；
   修復 fixture `d6f257851206e12f8c46674afd2a36dd075215e9`，
   未放寬正式 DSL 驗證器；[39770801984](https://github.com/will00t-debug/Ua/actions/runs/39770801984)
   **1700/1700、60/60**。

3. **C：來源效果整段結束後才處理移動觸發** —
   `343357a690f19f9f3b90f7daafd8b2532f9fe920`。
   可審核 `moveTriggers` 印刷來源 profile（來源名稱/顏色、
   hand→outside、支付/己方效果、真實 field residence），
   用既有 `sourceResolutionBoundary` **內部**效果隊列哨兵，
   把符合條件的移動卡片 `then:[{op:'draw',count:1}]`
   放在**造成它的來源程式及其合法選擇結束之後**。不是新的
   reducer/作品專屬分支。非本 profile 的效果、對手效果與非法來源
   fail-closed。純合成來源測試與錯誤 profile 測試；
   [39771274699](https://github.com/will00t-debug/Ua/actions/runs/39771274699)
   **1703/1703、60/60**。

4. **D：MAIN 起動費用邊界** —
   `2e38aa36216f34f3d462814c90d204f80e0b44ed`。
   `discardHandBuffSelf`、`restSelfThen`、
   `frontOnceProgram` 的整段完成點加入同一通用邊界；
   尤其先**確實棄牌／支付、完成 BP 與剩餘主能力**，再觸發
   被送場外的卡。測試 wrong sourceName、sourceColor、非法 UID，
   Normal/Hard AI 使用既有 legal actions。
   [39771651317](https://github.com/will00t-debug/Ua/actions/runs/39771651317)
   **1706/1706、60/60**。

5. **E：多實體與序列化驗收** —
   `7b9f1cc6e426b2901c8d56aceec1bf7faf222d2c`，
   在同一來源依序棄兩張相同印刷卡但不同**物理 UID**時，
   第一張不提前觸發，等第二張也確實移動、來源其餘效果完成，
   各自依序觸發一筆而不複製/遺漏。
   驗證內部 `sourceResolutionBoundary` 欄位，
   拒絕虛構 UID、越界／非整數順序與多餘欄位。
   [39772113594](https://github.com/will00t-debug/Ua/actions/runs/39772113594)
   **1708/1708、60/60**。

### 程式最後一版 Node.js 22 遠端集中驗收

- **程式 SHA** `7b9f1cc6e426b2901c8d56aceec1bf7faf222d2c`；
  GitHub Actions [39772113594](https://github.com/will00t-debug/Ua/actions/runs/39772113594)：
  `npm test` **1708 tests / 1708 pass / 0 fail**；
  `node scripts/v2-integrated-match-matrix.mjs` **60/60 finished、0 fail**；
  `node scripts/v2-assert-independent-manifest.mjs` **success**；
  `node scripts/v2-unported-report.mjs` **success**。
- 五作品維持 BLEACH **97**、TTG **35**、SLG **41**、
  SAO **91**、MST **48**，**312/700 V2、未移植388**，
  本輪正式新增 **0**、全面 FAQ 每卡認證 **0**。
  `moveTriggers` 測試只用合成 `K/U/J` 卡號，不列入卡冊。
- **沒有本地 Node22 / npm test**。歷史 clone 的 GitHub DNS
  解析失敗，所以唯一完整驗收來自 Actions，未進行正式站或手機
  UI 驗收；本份**文件提交**的 HEAD CI 要另行確認。

### 正式來源與尚未支持的部分

- 官方 [EX07BT/BLC-2-047](https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=EX07BT%2FBLC-2-047)
  **「その名は斬月」**：藍2／AP1 事件；一般使用抽2；
  **己方場上的藍色〈黒崎 一護〉效果把該物理事件從自己手牌送至場外**
  時，後續抽1；非任意 discard／pay 皆可觸發。
  [Q1046](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT)
  不要求額外能力觸發時支付印刷藍2能源。
- [EX07BT/BLC-2-019](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1)
  除 main 限定卡名含斬月／月牙的棄牌費用，還有 Raid、登場時雙目標
  BP-1500、自己 main 抽1、BP+1000 與授予攻擊時可抽牌。
  [Q1033](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT)
  指明先完整處理此 MAIN，再結算 047 抽1。
  [Q2315](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT)
  證實後續把 047 放到別的角色下面裏向，仍可發動抽1。
  **本輪沒有正式移植 BLC-2-019 或 BLC-2-047**；
  尚需嚴格名稱過濾費用、Raid/上場目標、
  主階段授予 attack draw 與 Trigger 完整正負例，不能只加
  `moveTriggers` 就宣布全卡支援。

### 下一輪精確缺口

1. source boundary 目前覆蓋 **onPlay** 與三種既有 MAIN 來源；
   onAttack／phaseOrder／Raid entry／onOutsideRecover 等
   來源程式還沒有完整一致的 boundary；
   中途 onRetire 插入與來源封印規則需獨立官方審核。
2. `moveTriggers` 當前是**限制嚴格的原語**（已核對 hand→outside
   + own named/color field source + draw），不是任意
   zone→zone/任意 nested ops 的通用驗證認證。
   費用中的指定印刷名字比對與後續重複移動，
   必須擴充證據及反例。
3. 既有私有 journal 仍未列舉完成所有 Raid-under、
   full-line replacement／removal、部分 LIFE/Raid
   實體層移動。不得假稱 event bus 全路徑覆蓋。
4. **Q73 / DAMAGE2** 多張 LIFE 同時翻開與觸發次序；
   Q71/Q72、Impact/FINAL 組合未完整驗收，沒有
   冒然改動既有戰鬥核心。
5. MAIN end 同時退場回手、層疊 Raid、
   同 UID 再入場後攻擊/阻擋次數、
   已取得效果與原效果封印時序仍需正式 FAQ。


## GPT 第二十一輪｜完整移動來源邊界與 Q73 LIFE 狀態模型（2026-10-22）

沿用 Draft PR #78 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`。起始 HEAD `e5b0c87e17df4845be2fd3e8ea6288eeac15f670`，對應遠端 Actions [39772556209](https://github.com/will00t-debug/Ua/actions/runs/39772556209) 成功。未修改 main、原 Cursor PR #77、正式 Vercel 站，未 force-push。此執行環境無法 clone（DNS 失敗），因此以下均為 **GitHub Actions 遠端 Node22**，不是本地執行。

### 本輪分批提交（保留既有 DSL 與單一 effectQueue）

1. **A：新增已完成物理移動**：程式 `198450e835852a12bd71b3f28fd0e9fbcf831964`、測試 `c31ce885b2932f8aca6d57e511701da5004f5397`。補記 MOVE energy→front、STEP front→energy、回收後自身 hand→energy；僅在真實變更後記錄 UID、所有者、來源與區域。負例驗證非法 action 不改狀態及公開視圖不洩露私有 journal。Actions [39775002964](https://github.com/will00t-debug/Ua/actions/runs/39775002964) success。
2. **B1：來源攻擊及階段結算**：程式 `2a58bc547a12f1e3112d4fd8849a0f300bfd2d2c`、測試 `e4a865270fc70ebf95ee22d172c420b91d1c5dde`。onAttack 在 openBlock 前加入原共用 sourceResolutionBoundary；phaseOrder 每個實際選定來源效果先完成選擇、棄牌及追加能力，再釋放該來源的已完成移動觸發。Human、Normal/Hard AI 共用 legal actions。Actions [39775321902](https://github.com/will00t-debug/Ua/actions/runs/39775321902) success。
3. **B2：Raid / 回收來源邊界**：程式 `7afba4c607514ff7aab7b696e36ea9235ed56e2b`；新測試 `01a613651768476e939d9b4abc78b7d5040d5a10` 首次 Actions [39775596552](https://github.com/will00t-debug/Ua/actions/runs/39775596552) **failure**，原因為合成 onRaided fixture 使用 pack 驗證器不允許的 draw op（非引擎回歸），修正測試 `3c4f16785bc3a2b0d0a7c0fad4b99d091fde6a87` 使用既有 drawIfRaidUnderFacedown；Actions [39775974235](https://github.com/will00t-debug/Ua/actions/runs/39775974235) **success**。保持 Raid baseFirst / entryFirst 合法選擇、base onRaided 及頂牌 onPlay/onRaid 分別來源、頂牌共享一次完成邊界；onOutsideRecover 接入同一 queue。沒有為通過測試放寬 validator。
4. **D：Q73 同時公開的純規劃模型**：程式 `fb1b90d7cb7932ff80f86f9362ac3d7cb7f701fa` 新增 `life-reveal-batch.mjs`，測試 `1729defcd6e9957a636ca7447b7f8d621159d649`。函式 `planSimultaneousLifeReveal` 僅在私有狀態上保留同批最上方 min(傷害,目前 LIFE) 的物理 UID，避免非法/重複 UID；不改既有 `damage()`、`effectQueue`、LIFE、公開牌、勝負或選擇流程。Actions [39776021769](https://github.com/will00t-debug/Ua/actions/runs/39776021769) **success**；這是獨立設計／測試，**不能稱 DAMAGE2 已修正**。
5. **E：覆蓋及官方差異盤點**：`docs/v2-handoff/V2-R21-move-coverage-and-Q73.md`（提交 `b1f4de60ba968c6fa1e28bd44414a8b1a551b3e1`）列出已覆蓋與缺漏的每項物理移動、來源無法辨識原因、特別 Raid 地層、Q71/72/73 與 Q35/36/38 差異、完整 BLC 印刷移植 gate。

### 正式移植及限制

- 本輪正式新增卡牌 **0**；最新已確認盤點仍為 BLEACH 97、TTG 35、SLG 41、SAO 91、MST 48，共 312/700、未移植388；須以每次實際 manifest / report 更新數字，不能當作永遠不變。
- **BLC-2-019／047 仍未登錄，完整官方能力仍欠：斬月/月牙特定名稱費用、兩敵方目標的 BP 變更、MAIN 完整抽牌/BUFF/授予 onAttack、合法 Raid 與 LIFE trigger 正反例。** 共用移動來源原語不等於完整兩卡驗收。Q1033、Q1046、Q2315 的來源與限制見 R20、R21 文件。
- **Q73 未整合核心**：原 `additionalBattleDamage` 仍逐張 LIFE 結算，未符合多張同時公開及玩家選擇多 Trigger 順序；Q35 的無 Trigger 時序、Q36 雙 FINAL、Q38 onPlay 插隊必須一併納入既有 effectQueue。避免只為 Q73 改壞 LIFE、IMPACT、SPECIAL、FINAL 的其他流程。
- **Raid under / full-line replacement / hidden face-down protection** 等實際移動仍有 journal 缺口；`raid-under` 不在 direct `players[p][zone]` 陣列，不能假造符合 helper 驗證的事件。原來源封印、退場中斷及同 UID 回場攻阻計數尚未官方全驗收。
- 本輪以合成精準測試和原有全標題回歸護欄驗收，**全面逐卡官方 FAQ 認證仍為 0**，未做正式站或手機手動 QA。
- 本段文件之提交 SHA 與最新遠端 CI 應另外核對；不能沿用更早成功 run 作為最新驗收。

**下一輪首要工作**：先用 Q35/Q36/Q38 官方語意把 Q73 原子 reveal 與動態觸發選擇接到 **原 effectQueue**；其次針對 Raid-under 真正巢狀 destination 擴充驗證／journal（含完整替換與隱藏資訊）；然後才考慮 BLC-2-019/047 full-card 移植。禁止半成品註冊、合併 main 或部署正式站。


## GPT 第二十二輪｜Q73 正式整合、Raid 底板與滿場替換（2026-10-22）

**此段覆蓋前述 R21「Q73 未整合」／Raid-under 缺口的舊狀態；不要再將 R21 快照當最新成果。** 詳見 `docs/v2-handoff/V2-R22-Q73-raid-replacement.md`。在程式 SHA `4545153f23639934d99359bb9485768e27e71681`，GitHub Actions [39780010025](https://github.com/will00t-debug/Ua/actions/runs/39780010025) **SUCCESS**：Node.js 22 **1725/1725**、跨五作品對戰 **60/60**、manifest 與未移植盤點步驟通過。

- Q72/Q73：原 `effectQueue` 接入 `life-reveal-batch.mjs`；DAMAGE2 一次公開正確數量的物理 LIFE UID 到暫時 `lifeRevealed`，防守方可決定兩張卡及無 Trigger 卡的處理順序；GET/DRAW/SPECIAL/COLOR/RAID/FINAL 由原引擎處理，Q35、雙 FINAL Q36 已有驗證。既有真實卡牌與跨作品測試改為核對「同時公開、依序結算」，不是刪除測試。單次傷害、Impact 保留原行為。
- Raid：`raid-under` destination 現在驗證場上巢狀實體 UID，`performRaid` 記錄底板 FRONT／ENERGY→raid-under 與 Raid 頂牌 HAND／OUTSIDE／LIFE 公開暫存區→場上；剝離頂牌時底板回 FRONT；滿場替換的每一張頂牌／下層卡分別記錄進 removed，非真正退場不觸發退休效果。具 UID、擁有者、負例和私人視圖測試。
- **未完成限制**：Q38「登場後新觸發與未結算 LIFE Trigger 的動態交錯」未完整官方逐例驗收；巢狀第二次傷害仍須明確官方時序；消耗 faceDown 保護卡與其他 hidden-layer 移動尚有 journal 缺口；BLC-2-019／047 未註冊、全卡 FAQ 正式逐卡審核仍未完成。本輪正式新增卡牌 0。
- 最新上游操作基準：PR #78，`gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`；維持 Draft／不改 PR #77，不合併 main，不部署正式站。下輪必須先重查當下最新 HEAD、CI 與衝突，再續增測試。


## GPT 第二十二輪｜Q73 同時 LIFE、Raid 埋底與滿場替換 UID（2026-10-22）

**最新程式驗收基準（2026-10-22）：** `4545153f23639934d99359bb9485768e27e71681`；[GitHub Actions #39780010025](https://github.com/will00t-debug/Ua/actions/runs/39780010025) **success**：遠端 Node 22 **1725/1725 tests**、跨五作品完整 **60/60 matches**，manifest 和 unported report 通過。這是**程式 HEAD**；後續交接文件更新為文件專屬 commit，須對應再查 CI。

- **A：Q73 / DAMAGE2** 已在原 `engine.mjs` / **唯一原始 `effectQueue`** 實作同時公開（原先 R21 僅純 planner），暫存在實體 `lifeRevealed`，使用內部 `lifeRevealBatch` 與玩家合法 `chooseLifeOrder`，保留隱藏 LIFE 私隱及精確 UID。包含 Q72 最後一張 LIFE、Q35 無 Trigger 與有 Trigger 選擇、Q36 雙 FINAL（同一合法印刷 ID 兩張不同 UID）。原 BLC／MST 真實 COLOR FIELD、SPECIAL retirement、印刷 DAMAGE2 及攻擊次數的舊測試已按官方同時翻開修正，未刪測試。
- **B：Raid 真正巢狀 destination** `zone-move-events.mjs` 在 `raid-under` 查實際現存的 `stack/under`，而不是不存在的頂層陣列；實體 `performRaid` 各記錄 base field→raid-under 和 top hand / outside / lifeRevealed→field；頂牌剝離另記 base raid-under→front。完整 UID、owner、source 驗證和偽造負例；仍未推廣稱所有巢狀路徑 100% 覆蓋。
- **C：滿場替換** `commitDestination(pack,...)` 保證被替換的 visible top 和每一張 nested UID 進 `removed` 都有獨立已完成事件，且不是 onRetire。新增精確負例／公私資訊護欄；全矩陣通過。
- 完整程式範圍、具體 commits、限制、下輪目標見 **[V2-R22-damage2-raid-movement.md](./V2-R22-damage2-raid-movement.md)**。對 R21 文件中「Q73 未整合」的敘述，應視為**當時歷史狀態**而非這輪最新現況。

**剩餘實質缺口：** Q38 同次 LIFE 已進場後 newly-generated onPlay 對其他未處理 Trigger 的**動態選擇交錯次序**尚未完整官方驗證；巢狀重入 LIFE batch 目前 fail-closed；真退場 `vacate` 埋底、裏向保護消耗，以及少數移除實體來源路徑仍未完全 journal；BLC-2-019/047 **尚未全卡移植**，不可擅自登錄。卡牌數未變，原清單 **312/700**、未登錄 388，今後須即時重算。此輪只動 PR #78 分支，不合併 main、不修改 #77、不部署正式站、不 force push。


## GPT 第二十三輪｜Q38 動態排序、LIFE 重入護欄、Raid／裏向移動（2026-10-22）

本段為最新狀態，覆蓋 R22 的「所有 Raid 底板跟頂牌一起除外」預期。
沿用 Draft PR #78，`gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`。
起始 HEAD `d4e7df1a75e57e96879b2d6a02c82f17ef2275ea` 的 Actions
39780840034 已核對成功。此輪成功本地 clone，沒有既有未提交修改；遠端
ref 每次更新帶 expected SHA 且 force=false。沒有變更 Cursor PR #77/main，沒有部署。

### 提交與驗收

| 批次 | GitHub commit | 實際完成 |
|---|---|---|
| A | `2ca2dd2e8cde6d556c61f06b6b60e150463e0b60` | Q38 COLOR／RAID 新登場完整程式加入原 lifeBatchStep.entries，可與剩餘 LIFE 自選；維持 Q73 原子公開。Actions 39783245996 success。 |
| B | `8be66387128b310327015927a8daded7df694489` | 連鎖 LIFE 未全面開放；補 single damage 不得繞過現有 batch 護欄、狀態不變反例與序列化來源檢查。Actions 39783462055 success。 |
| C | `7063c1656783dc19dd5d87fab0102077c32b74e7` | vacate 真正底層 UID 移動紀錄；Q60/Q61 底板進 outside，僅頂牌依指定目的區域移動／真正退場。首次 CI 39784297026 failure：舊測試仍期待底板 removed。 |
| D | `aa7bec926866379e43b25db367f1d7f09cd1ed13` | 裏向保護消耗與 rule cleanup 分開，記錄 attachedToUid、wasFaceDown、identityViewersBefore；實際 TTG073 vs BLEACH 驗收。首次 CI 39784693233 同樣因舊 Q61 預期 failure。 |
| C/D 回歸修正＋E 評估 | `266e7209879dc8201ef076b7a84b88e46fde9548` | 保留三個舊測試全部 AP／UID／pending 檢查，改正底板 outside 預期；官方 BLC 全能力缺口表。Actions 39784988524 success。 |
| A 人類選擇顯示 | `e70de995abb26cfdb7ece0ab8a8a5f5adb623f4a` | 顯示公開 LIFE 與新登場來源卡名。Actions 39785139959 regression 全部步驟 success。 |

**最後程式驗收 SHA：`e70de995abb26cfdb7ece0ab8a8a5f5adb623f4a`**。
[GitHub Actions 39785139959](https://github.com/will00t-debug/Ua/actions/runs/39785139959)：
Node 22 npm test、五作品矩陣、獨立 manifest、未移植報告全部 success。
本地 Node **22.23.4**：`npm test` **1734/1734 PASS**；矩陣 **60/60，0 failures**；
manifest/report 通過。最後顯示文字修正後另有 15/15 預覽測試及完整 1734/1734 通過。
本地測試版本樹與 GitHub 程式樹相同（`6f615de9869e6be577898979b260e8c1ddd9cc63`）；
shell git push 缺憑證，改用已授權 GitHub object/ref 工具逐批提交，並安全同步本地到遠端 HEAD。
無手動手機／瀏覽器視覺驗收。後續純文件 HEAD 的 CI 應分開確認，不能冒充程式 SHA 結果。

最新盤點：BLEACH **97/276**、TTG **35/81**、SLG **41/80**、SAO **91/183**、MST **48/80**；
共 **312/700**，未移植 **388**；本輪正式新增 **0**，全面逐卡 FAQ 認證 **0**。

### 官方結論與尚未完成

- Q35/Q36/Q38/Q71/Q72/Q73 已重新核對；Q38 確認新登場效果可與未處理 LIFE 自選，且仍在 trigger check。
  已實作同防守者 COLOR／RAID 完整 entry block 的排序、合法 action、Normal/Hard AI、暫停與恢復。
  **不是全面 Q38 認證**：跨玩家新效果、SPECIAL/onRetire 動態交錯、獨立 onRaid/onPlay 排序仍未完整驗證。
- **連鎖 LIFE 尚未安全全面支援**，不擴充第二套 queue 或 reducer。已補 single-damage 重入拒絕、狀態保存反例及後續模型要求。
- Q61 明確：Raid 頂牌除外時底板送場外。R22 舊報告與舊測試在此有誤，R23 修正。
  底板移動不算退場；裏向消耗不算退場；消耗後頂牌 BP 歸零是另一筆真正退場。
  日誌序號不是官方同時移動中的可選先後裁定。未新增未驗證多層 Raid 合法幾何。
- BLC-2-019／047 **仍未正式登錄**。重新核對 Q1033/Q1046/Q2315 與卡文，保留完整命名棄牌成本、
  雙 BP 目標、授予 onAttack、完整 Raid／Trigger 與場外再埋底資格的全卡驗收缺口。
- 下一輪優先：跨玩家 Q38/SPECIAL 時序與連鎖傷害官方依據；再做嚴格名稱支付與授予攻擊能力。

詳細規則時序、覆蓋與 BLC gate：`docs/v2-handoff/V2-R23-Q38-and-hidden-moves.md`。


## GPT R24 — Q38 cross-player, conservative LIFE reentry, named UID payment (2026-10-22)

**Use [V2-R24-event-priority-and-payments.md](./V2-R24-event-priority-and-payments.md) as the exact R24 handoff.**
Work branch `gpt/v2-resume-20261022`, PR #78 → `cursor/v2-multi-retire-life-6ff5` unchanged.
Starting `2711177ced2a15403863618cdba2a7d03cca6825` Actions 39785577234 success.
New code progression:
- A Q12 drain / cross-player SPECIAL→onRetire→FINAL and pending actor/AI: `88f93a44`, fixture corrections through `4d397ffd8d9b5aef16795e4ac5d3e7c264ffece3`;
- D named hand-payment DSL, strict UID and two-title Human/AI: `8842c7ddf5c5e1057c1527ed684285a2fd3b5d62`;
- B global other-player LIFE guard, cross-owner second-damage and FINAL replay: `336173a5ebe9a41c279a0fd4b97b1294faf4ca10`;
- C two same-print different-UID move trigger programs complete **after** source, both controllers: `68ddba44e5ff1e4ad3fa0a5e8048f7d6d231445c`;
- E official BLC gate, coverage matrix and handoff documentation: this later commit; recheck its actual CI.

**Latest pre-document verified CI:** [39790506182](https://github.com/will00t-debug/Ua/actions/runs/39790506182)
for `68ddba44`, Node22 **1746/1746 PASS**, five-title **60/60 PASS**, manifest/report success.
Failures at earlier intermediate test-fixture SHAs were corrected without loosening official validators.
No **local** full test this session (GitHub DNS from container failed); results are **remote Actions**.

Q38 cross-player SPECIAL/onRetire selected case works; unrestricted global Q38 not certified.
Nested second damage is still **fail closed**. Q12 zero LIFE waits for earned queue.
Source resolution covers known restricted timings; not every global cross-owner boundary.
Named `discardGate.payment` supports strict printed names incl substrings; granted
temporary onAttack and dual distinct BP targets **not** completed.
BLC-2-019 and 047 still **not registered**. Latest 312/700 (BLEACH97 TTG35 SLG41 SAO91 MST48),
unported388, net new0, full official per-card FAQ certifications 0.
No changes main, Cursor PR77 or production deployment; no force-push.
Next priority: granted attack-time DSL + two-target BP, then full Q1033/Q2315 BLC scenario
and simultaneous opponent trigger priority evidence, eventually nested LIFE official model.


## GPT R25 — target snapshot, temporary attack grant, completed MAIN composition

Complete detailed evidence: [V2-R25-general-grants-and-blc.md](./V2-R25-general-grants-and-blc.md). Original GPT PR #78/branch stays active and targets Cursor PR #77 branch; no merge/deploy/force-push.
R25 batches: A `30a60cbadfa50ec9353989dbd1484cbb92477134` (two distinct BP UIDs, previous CI SUCCESS [39793144785](https://github.com/will00t-debug/Ua/actions/runs/39793144785), Node22 1755/1755, matrix 60/60); B `06c1f66b11361ce66c96608870b2b1d20c6739ee` (grantOnAttack, stored per physical field stamp); C `faeb167dfb54e7c1264d7c0152a1fef4c596a4fe` (typed paid MAIN draw/buff/grant before move-trigger), D `1ac80609c2222c7899e85e3eb3a50a30c12417d3` (current-turn expiration and grantor departure), E `04495e2d1e689c799128c616a81a00f67c30d6c9` (real BLC official-print pilot, still unregistered); fixture fix `300ad3d87eb2025ea33e9b82400466ab80b19736`. **Latest Actions for full HEAD must be verified separately; intermediate B/C CI failed, later full runs were queued during handoff.** No local Node verification, only GH Actions. Registry baseline unchanged 312/700, 388 unported, full card FAQ certification zero. BLC-2-019/047 not registered until Q2315 and all full-card independent acceptance. Source timing, ownership, hidden faces and nested LIFE remain conservatively bounded.


## GPT R26 — Q2315/Q2316 physical earned trigger and source snapshot (2026-10-22)

See [V2-R26-Q2315-hidden-earned-moves.md](./V2-R26-Q2315-hidden-earned-moves.md) for exact official source links, code, test fixtures, remaining limitations and commits. R26 scoped five batches: A `1e9abec`, B `9c71791`–`0657e15` shared named move watcher/REST/under and both priority order tests, C `3e95acb` LIFE Raid + Q1046 energy-independent move trigger, D `72dab55` exact source/owner/multiple watchers, E `bd8a538` earned watcher physical UID/stamp captured at move time. Verified code Actions [39801612655](https://github.com/will00t-debug/Ua/actions/runs/39801612655) completed SUCCESS Node22 **1786/1786**, five-title **60/60**; manifest 312/700 unchanged (BLEACH97 TTG35 SLG41 SAO91 MST48), unported388 and full card certified0. Q2315 synthetic observer references **Riruka BLC-4-034** but full Riruka and BLC-2-019/047 are **not** registered. Source and hidden UID proof is bounded, no global cross-player Q38 or nested LIFE certification. No main/production/Cursor PR77 changes; no force push. This documentation-only follow-up HEAD must also be checked in Actions.


## GPT R27 — Q38 cross-owner and exact earned event provenance (2026-10-22)

Details and official rules in [V2-R27-Q38-physical-event-hardening.md](./V2-R27-Q38-physical-event-hardening.md). Existing PR #78, branch gpt/v2-resume-20261022 unchanged. Four code batches: A `4d834308` prevents stale REST/tuck legal actions after watched physical target leaves (remote Actions 39803940806 success); B `0272eec`→`e15bdc`→`39ef2a2` validates earned move-order save event UID/stamp/queue provenance (intermediate CI RED corrected, do not count); C `047da8e` two-title cross-owner Q38 COLOR onPlay and paid physical event trigger vs FINAL (Actions [39804712396](https://github.com/will00t-debug/Ua/actions/runs/39804712396) SUCCESS Node22 **1792/1792**, matrix **60/60**, unchanged registry 312/700); D `767331e` tests nested LIFE injection atomic rollback and pre-earning Q2220 original-effects silence, remote CI must be checked. E documentation-only consolidation in this commit. Nested LIFE remains fail-closed. No real card registration, main merge, PR77 edit, force push or production deploy. Full official certification 0, 388 unported. Reconfirm final SHA exact CI.


## GPT 第二十八輪｜Q12、授予能力、019/047 合成整合及跨作品真卡盤點（2026-10-22）

在同一 PR #78 / `gpt/v2-resume-20261022` 上接續已驗收第 27 輪 HEAD `ee5c1212`。確認程式 `767331eb` 遠端 Actions [39804977135](https://github.com/will00t-debug/Ua/actions/runs/39804977135) **success**，交接 `ee5c1212` [39805362290](https://github.com/will00t-debug/Ua/actions/runs/39805362290) success。寫入前檢查遠端 HEAD；沒有可用本地 checkout，所有 Node22 測試依實際 GitHub Actions 為證據，並不宣稱本地執行。

1. **A** `30813700`，修正 `1460cbf5`: [official Q12](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行) 在最後兩張 LIFE 以 DRAW→FINAL 和 FINAL→DRAW 結算時，先確保 zero LIFE 不立即勝負判定，並驗證非法 Trigger 選擇不改變序列化及公開狀態。初版 Actions [39808601108](https://github.com/will00t-debug/Ua/actions/runs/39808601108) RED，測試自身誤以為最後單一剩餘 LIFE 仍需 `chooseLifeOrder`；修正依既有排程器自動進入最後 Trigger，沒有削弱檢查。
2. **B** `578d3a16`: 在正式 50 張模擬資料的共享 grant 引擎驗證兩張獨立授予、來源離場、已獲能力於印刷文字遭封印後仍可抽，原本印刷 onAttack 抽牌停止，並對壞的程序 count、optional、到期、source linkage 序列化拒絕。這是特定原語的驗證，不稱所有授予語意都已完成。
3. **C** `06f3bd3b`: `tests/v2-r25-blc-official-print-pilot.test.mjs` 補一條原本獨立 50 卡合法 deck 的 BLC-2-019 Raid→兩敵方 -1500→MAIN 合法棄 BLC-2-047→整段來源抽1、+1000 BP、授予 onAttack→已取得 047 抽1→**真正 attack 時**另外選擇抽1；驗證合法 AI 選項、UID、存檔狀態。完整「019/047 及其他互動」的全卡 FAQ 認證仍尚缺，**019、047 不正式登錄**。
4. **D** `4d66b1d3`: [跨作品完整印刷卡文與缺口矩陣](./V2-R28-cross-title-print-audit.md)：TTG-1-028、SLG-1-070、SAO-1-005、MST-1-059 各自來源可查、皆尚未移植；拒絕只憑 DSL 部分吻合就登錄。
5. **E** `819dce2e`: [跨玩家優先權及連鎖 LIFE 官方規則差異表](./V2-R28-priority-and-nested-life-proof.md)：辨別 Q12、Q35–38、Q71–74 和 MST Q2220/Q2228 已覆蓋與未知的範圍，保留既有 **nested LIFE atomic fail-closed**。沒有建立第二套引擎、沒有增加任何 DSL operation，只有可驗證測試與研究檔。

驗收：修正 A+新增 B 的 [39808947609](https://github.com/will00t-debug/Ua/actions/runs/39808947609) Node22 **1800/1800**，五作品 60/60；加入 C 的 [39809160866](https://github.com/will00t-debug/Ua/actions/runs/39809160866) Node22 **1801/1801**，五作品 60/60、獨立 manifest 和 report 成功；加入 D 文件的 [39809645550](https://github.com/will00t-debug/Ua/actions/runs/39809645550) 同樣 **1801/1801**, 60/60。E 與本交接文件提交後，仍須核對其對應 SHA 的新 Actions，不可沿用更舊的結果。

登錄快照：BLEACH 97、TTG 35、SLG 41、SAO 91、MST 48，共 **312/700**，未移植 **388**，逐卡全面 FAQ 認證 **0**。最新獨立 source 中 SLG 仍有 12 個原始 metadata 缺欄。下一輪先處理 R28 尚未通過官方完整驗收的跨雙方同時待結算效果、SPECIAL/退場與 onRaid 合併優先權、來源不同時間封印後再移動、真卡 BLC-2-019/047 的全場景完整整合及連鎖第二批 LIFE 的必要官方依據。保留 Cursor PR #77、main、正式 Vercel 原狀。
