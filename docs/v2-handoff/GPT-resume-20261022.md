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


## 第 29 輪（2026-10-23）：跨玩家雙 SPECIAL、物理 047、多來源已取得能力

延續第 28 輪完整綠燈 HEAD `66dea296d3e74c9ab0f0569f3f3e58275cb84872`，PR #78，合併目標不變，沒有改寫 Cursor PR #77、main 或正式站。完整逐批證據、官方 FAQ 邊界和下一輪工作見 [V2-R29-earned-events-and-cross-owner-acceptance.md](./V2-R29-earned-events-and-cross-owner-acceptance.md)。

- A `4ac116ad`：BLC-2-019 多物理來源各自棄不同 BLC-2-047、來源 MAIN 完整後各抽額外一張；完整 50-card prototype。第二 019 使用明確 stamped 在場測試 fixture，不代表已合法第二次 Raid。Actions [39864577235](https://github.com/will00t-debug/Ua/actions/runs/39864577235) **SUCCESS 1802/1802**, 60/60。
- B `3c7c5ed7`：兩份獨立 grantOnAttack、授予者離場、受授者原印刷效果事後封印、錯誤序列化拒絕和回場新的 fieldEntryStamp 不沿用舊能力。Actions [39864773510](https://github.com/will00t-debug/Ua/actions/runs/39864773510) **SUCCESS 1805/1805**, 60/60。
- C `f23310da`：DAMAGE2 同時兩張物理 SPECIAL LIFE，兩個各自攻擊方 onRetire 的合法選擇和玩家優先權交還；兩種選擇順序、Normal/Hard、錯誤 actor、UID、存讀檔。Actions [39865047656](https://github.com/will00t-debug/Ua/actions/runs/39865047656) **SUCCESS 1807/1807**, 60/60。
- D `86f12d2e`：Q2315 物理 event→outside 完成後封印原 019 與 Riruka-like watcher，已取得之 REST/tuck 和 047 額外抽牌在兩種排序都不消失，保存 Q2316 裏向牌隱私。Actions [39865310494](https://github.com/will00t-debug/Ua/actions/runs/39865310494) **SUCCESS 1811/1811**, 60/60。
- E `158cbb52`：官方規則/四批回歸證據集中整理及未驗收差異表；此文件與交接提交需各自核對 CI 的 SHA。

R29 無新增正式卡牌，沒有新增 DSL 原語。五作品仍 **312/700**，未移植 **388**，全卡所有 FAQ 認證 **0**。019/047 與 BLC-4-034 均未加入正式 registry。跨玩家任意多重來源和巢狀第二次 LIFE 不認證；巢狀 LIFE 繼續維持原子 fail-closed。所有測試數皆為 **GitHub Actions 遠端 Node22**，沒有宣稱本地執行。


## GPT 第三十輪｜R30 COLOR 返回手牌、034 真卡缺口與 019／047／034 50 張整合（2026-10-23）

延續第 29 輪成功提交 `fc0ab18ba02ea9e9a4d60fe2a8ddee336399b8e7`，原 GPT 分支 `gpt/v2-resume-20261022`、PR #78 合併目標 Cursor 原分支不變。完整官方原文、驗收限制與四批 Commit 對照見 [V2-R30-034-full-print-and-cross-player.md](./V2-R30-034-full-print-and-cross-player.md)。

- **A** generic COLOR `bounceOppFrontUnderBp`，三筆提交 `9da7c8a3`（嚴格 pack schema）、`14bdd4ef`（共用 effect dispatch / 所有權及 Q62 頂層返回）、`3c04c8d1`（真正 BLC-4-034 COLOR / BP3500 邊界 / Raid-under / Human-AI / UID）。GitHub Actions [39867007395](https://github.com/will00t-debug/Ua/actions/runs/39867007395) **success Node22 1817/1817, 60/60**。
- **B** `ffc04344`：兩張 LIFE 同時公開 COLOR 與 FINAL，Q12／Q38 的兩種排序，COLOR 將對方非攻擊源角色送回其手牌、FINAL 回復 LIFE。Actions [39867247586](https://github.com/will00t-debug/Ua/actions/runs/39867247586) **success 1819/1819, 60/60**，非普遍雙方同時優先權認證。
- **C** generic `activeSelfIf` 的嚴格 FRONT/ENERGY 位置限制：`de325714`、`906994f1`、`e2eda2c3`。034 以真實 AP／UID 登場 ENERGY 才自動 ACTIVE，FRONT 不會。Actions [39867555312](https://github.com/will00t-debug/Ua/actions/runs/39867555312) **success 1824/1824, 60/60**。
- **D** `33e5f8fb`：真實印刷卡號 BLC-2-019／047／4-034 的同一 50 張有效牌組原型，實際付費 Raid／雙 BP／指定手牌費／Q1033 延後抽牌／Q2315 場上觀察者 REST 裏向卡／Q2316 私有情報／019 真攻擊授予抽牌，順序正反例與存讀檔。Actions [39867840517](https://github.com/will00t-debug/Ua/actions/runs/39867840517) **success 1828/1828, 60/60**。**034 場上開始為已備妥 ENERGY watcher fixture**，不是同回合另外付費登場。034 的真印刷 **MAIN REST＋自身退場＋回收底下裏向卡** 尚未實作，明確 fail closed。
- **E** 官方規則與集中交接文件 `ecc23eb4`；更新本檔及 `GPT-resume.md`。需核對最終交接提交的 exact SHA Actions，不能只引用 D 的綠燈。

本輪沒有新的正式登錄卡。分別為 BLEACH97、TTG35、SLG41、SAO91、MST48＝**312/700**，未移植388，逐卡全面 FAQ 證據認證仍 **0**。BLC-2-019、047、4-034 都不在正式 registry；目前只有嚴格支援的**部分完整原語**和具體真卡試作驗收，不可當作三張卡已可在正式跨作品環境無條件使用。額外第二批 LIFE 傷害仍保守原子拒絕，不建第二套佇列。沒有合併 main、正式部署、改寫 Cursor PR77 或 force push；這些測試皆為遠端 Actions，沒有本地 Node22 結果。



## GPT 第三十一輪 R31｜REST/退場/裏向附屬卡官方差異、SAO 名稱搜尋正式登錄（2026-10-23）

從確認遠端 baseline `2fae2b6d5ac5628280bf1793241ee0cf5738b2c7` 開始，延續同一 GPT PR #78 `gpt/v2-resume-20261022`（base `cursor/v2-multi-retire-life-6ff5`）。官方審核/未釐清順序見 [V2-R31-official-under-recovery-audit.md](./V2-R31-official-under-recovery-audit.md)，原 R30 BLC 三張合法 50 卡證據與完整正反例原封不動保留。

- **Batch A, official audit** `d9165bedacabda33c035aa789457e680026025b3`: 核對 BLC-4-034 實印 MAIN 的 REST／自身真正退場兩項強制支付，後續最多一張裏向附屬卡回手、Q60–Q62 Raid/base 去向、Q81 最多可選零張、Q2315 已取得觸發可保留、Q2316 只有控制者可看自己的裏向卡。對比 `retire`／`vacate` 立即拆出所有下層到場外，官方未給明確 last-known/select 和 interruption 優先權；**BLC-4-034 MAIN 暫未實作**，舊 fail-closed 斷言保留。[39869518022](https://github.com/will00t-debug/Ua/actions/runs/39869518022) 成功。
- **Batch D1, true-card isolated preflight** `c2304609ca8831e1cf6e022ab97d92cc56aa6f59`: 單張尚未登錄 SAO-1-005 使用正式日文原文及 50 張真卡牌組，重用已存在 `searchTopOneBottomDiscardWhere` / `searchTopOneBottomDiscard` 多名稱 `logic:'any'` + `cardHasName` alias；印刷需求黃能源2／AP1、TOP4／〈キリト〉或〈アリス〉／最多1張／BOTTOM自選排序／成功取得才棄1。測試正反例、Wrong UID、AI、JSON 恢復、對手不得查看私有檢視。[39869697116](https://github.com/will00t-debug/Ua/actions/runs/39869697116) 成功，當時未計入 registry。
- **Batch E1, shared public-reveal defect** `1d54bdb8e093f9867eaee3edc997129d912c8d50`: 既有 `effect-top-filter-choice` 在合法 TOP-N 選擇牌入手後，通過既有有界 `publicReveals` **只公開被選中的物理 UID**；不新建事件佇列、不公開其他 inspected 卡，不改 `zoneMoveEvents`；無牌取得時不公開。[39870054641](https://github.com/will00t-debug/Ua/actions/runs/39870054641) 成功。
- **Batch D2, formal complete printed registration** `79ddbc73c1996dedecbbcb51dbbd319adf3f58ad`: SAO-1-005 加入 `sao-pack.mjs` 嚴格 source-pinned metadata / 已有 ANY-NAME 模板及 `tests/fixtures/v2-integrated-id-manifest.mjs`，將 isolated 測試替換為正式 registry 測試。第一次 [39870434867](https://github.com/will00t-debug/Ua/actions/runs/39870434867) **FAILED**：新增證據檔引用不存在局部變數 `id` 觸發大量 import 錯誤；未刪測試或放寬 validation。緊接 `f796ed985791380bff1f7f38c18bedac37012ecc` 改成 `def.id`，[39870620372](https://github.com/will00t-debug/Ua/actions/runs/39870620372) 成功 **1832/1832**, 60/60。
- **Batch E2, positive/negative options** `6a885ca40251f4f914c2b8aa5a2f91ccd76b62e6`: 正式 SAO-1-005 TOP4 同時有真實 Kirito 與 Alice 時仍可選 0 張（不公開、不棄牌、底部完整順序），及選 Kirito 的另一實體 UID（只公開該 UID，排序後棄已取得卡合法）；序列化和卡牌守恆。[39870856615](https://github.com/will00t-debug/Ua/actions/runs/39870856615) 成功 **1834/1834 Node22, 60/60 five-title**, independent manifest / `v2-unported-report` success。

**登錄權威結果：** BLEACH **97**, TTG **35**, SLG **41**, SAO **92（本輪+1）**, MST **48**，合計 **313/700**，未移植 **387**；全面逐卡每條官方 FAQ 獨立認證 **0**（現有逐卡/逐原語覆蓋不可誤稱 0→313）。BLC-2-019／BLC-2-047／BLC-4-034 **三張仍未移植**，沒有把未完成原印刷能力計入數量。BLC-019/047 的已支援原語及來源繫結獨立案例依 R30，未擴張成完整全卡 FAQ 認證。BLC-4-034 MAIN 仍 blocked，**未新增**臆造的 undercard recovery DSL，保留 Q60/Q61 Raid 確切 OUTSIDE 去向及真正 onRetire、Q2315 earned-event 已取得觸發，對手不得見自己的裏向卡以外資訊。

**R32 第一優先：** 取得 BLC-4-034 MAIN「支付自我退場後最多 1 底牌回手」的直接官方結算裁定（選取快照時點、真正退場/退休觸發與替代中斷、多人層 Raid 和剩餘下層的去向）；有明確 oracle 才可最小改動既有 queue/zone move UID/stamp 作共享 recovery。官方資料不足則先挑 `TTG-1-028` 的跨作品『至下個己方回合開始前禁止攻擊』通用 *turn-bounded legal action restriction*，先確定官方結束時點、重進場的 stamped expiration，不和 BP Buff、onAttack 授予或產能混用。SLG-1-070 AP 額外目標費及 MST-1-059 FRONT 暫時產能保留為不同的獨立原語候選。巢狀第二批 LIFE 繼續原子 fail-closed；不以未知官方次序強行整合。

**執行邊界：** 全部 PASS 統計來自 GitHub Actions **remote Node.js 22**，本環境 GitHub clone DNS 失敗，未跑本地 Node22，沒有私自並行修改別人的 local working tree、main merge、正式 Vercel 部署、覆寫 Cursor PR #77、force push。已驗證最新已完成程式提交 `6a885ca40251f4f914c2b8aa5a2f91ccd76b62e6`；本交接文件提交本身要另核對精確 SHA Actions，不能只拿舊 green 抵充。



## 第三十二輪｜通用禁止攻擊、正式 TTG-1-028 及跨作品真卡測試（2026-10-23）

從 R31 [39871185997](https://github.com/will00t-debug/Ua/actions/runs/39871185997) 成功 HEAD `2aa041e5f7b31090966be09af551b2cd930e94ef` 延續 GPT PR #78，保留 Cursor base/main/production。官方印刷來源與逐批差異詳見 [V2-R32-cross-title-next-own-start-attack-ban.md](./V2-R32-cross-title-next-own-start-attack-ban.md)。

1. **A** `02893557` + syntax fix `52aa9b4b`: existing `continuousStates` 新增 physical/stamped `cannotAttack`，僅濾除合法 `attack` action，`sourceLinked:false`，嚴格於能力授予者 **下個自己回合 START** 到期；不影響阻擋／REST／BP／能源。第一次 [39872555141](https://github.com/will00t-debug/Ua/actions/runs/39872555141) 因一處括號語法錯誤失敗，修正後 [39872730722](https://github.com/will00t-debug/Ua/actions/runs/39872730722) full green。
2. **B** `64a17b76e091771aed54bbbbc81bf4f9ae4e5a33`: 嚴格通用 onPlay DSL `forbidAttackOppFrontOne` + 現有 `effectQueue` 上的 `effect-attack-ban` pending，選 0/1 敵方 FRONT，原子核對所有者／UID／`fieldEntryStamp`、AI 合法選項；真正 TTG-028 合法 50 卡 cross-title 隔離測試。 [39873136036](https://github.com/will00t-debug/Ua/actions/runs/39873136036) **1838/1838，60/60**。
3. **C** `2f1f7c0ec71453026053d22693378a4ec44d8e62` 正式註冊綠4/AP1/BP4000、Simon 或 Viral 雙 Raid 底板、onPlay 抽1、僅己方回合對手 FRONT 攻擊禁止、LIFE RAID 的 `TTG-1-028`。同步 TTG 審核資料、獨立 manifest、真卡測試。初 CI [39873375638](https://github.com/will00t-debug/Ua/actions/runs/39873375638) 兩個歷史清單失配，`f5f1323d` 更新來源 CSV 和 TTG 明確名單，`7481cde1` 更新獨立 workstream 範疇，[39873771779](https://github.com/will00t-debug/Ua/actions/runs/39873771779) **1839/1839，60/60**。
4. **D** `c5b08f0d4d32402a6eaf22d368be388bcc15d750`: 兩種 Raid 底板、沒有敵方 FRONT 時仍抽牌、選 0、過期實體 stamp、off-turn 無效、Human UI 選項的真卡正反例與公開提示。[39874056639](https://github.com/will00t-debug/Ua/actions/runs/39874056639) **1843/1843 Node22, 60/60 matrix, independent manifest and unported report success**。

**目前最新程式數據：** BLEACH97 TTG**36** SLG41 SAO92 MST48 → **314/700**，未移植 **386**，全面逐卡 FAQ 完整認證仍 **0**。TTG-1-028 本輪正式移植，非隔離 prototype；新增通用不能攻擊的 *legal action restriction*，**不是** `grantOnAttack`、`cannotActive` 或增加能源。BLC-4-034 MAIN 的 REST／真正退場費用與下層裏向卡回收優先權欠官方明確依據，**仍不實作**，BLC-2-019/047 也未登錄；巢狀二次 LIFE 繼續 fail closed。下一輪可先等 BLC-034 官方裁定，或研究 SLG-1-070 Q2062 的共用 AP 選擇加價，而非猜時序。既有前30輪能力未刪，未改 main/PR77/正式站、未 force push；Node22 僅 GitHub Actions 遠端實測。本交接 docs SHA 另需 CI。



## R33 — 2026-10-23: Q2062 card-effect targeting AP tax, SLG-1-070 officially registered

See [V2-R33-Q2062-AP-selection-tax-audit.md](./V2-R33-Q2062-AP-selection-tax-audit.md) for official source, Q2062/Q1119 semantics, exact commits, CI failure repairs and tests.
Started from R32 green b7b02699e664bbc979dbfafb6001093aeceefe41. Five batches:
- A bc1c3614: target physical UID+stamp; own-next-opponent-turn scoped selection surcharge; GitHub CI [39876085032](https://github.com/will00t-debug/Ua/actions/runs/39876085032) 1845/1845 Node22, 60/60.
- B c95b0295: choose target only with enough extra ready AP, charge at exact target decision, no attack/block tax; [39876436885](https://github.com/will00t-debug/Ua/actions/runs/39876436885) 1849/1849, 60/60.
- C c141febe, corrected f8405cb1: generic other-own-DFN onPlay optional-grant, valid UID/stamp target snapshots, Normal/Hard AI, source-pinned 50-card isolated tests; [39876971666](https://github.com/will00t-debug/Ua/actions/runs/39876971666) 1851/1851, 60/60.
- D d7a1d4ff: register official SLG-1-070 / シーマ (green 0/AP1/BP1000/gen1, ACTIVE LIFE, official one-token DFN／第四次架南島レイド with audited individual traits). Independent manifest, historical evidence CSV, actual true-card tests; [39877281648](https://github.com/will00t-debug/Ua/actions/runs/39877281648) 1852/1852, 60/60.
- E 0d8db897 through final code 745d378be6105921a272d1e825818ea7ac9dc09d: Q2062 plus Q1119 mandatory event legal-target preflight RESERVING own event AP; protected target surcharge after event-cost, free alternate target still legal. Initial test fixture accidentally put UNPROTECTED grantor into FRONT and assumed protected character sole FRONT target; the free alternate made prior red CI correctly reject test assertions. Fix moved grantor to ENERGY and [39878428295](https://github.com/will00t-debug/Ua/actions/runs/39878428295) **1854/1854 PASS, 60/60 PASS, independent manifest and unported report PASS**.

Validated source-code totals: BLEACH 97, TTG 36, SLG 42, SAO 92, MST 48 = **315/700** registered; **385** unported. Full independent all-card/all-FAQ official certification still **0**, not a denial of focused card tests. BLC-2-019/047/4-034 still NOT registered; BLC034 facing-down recovery after own REST + true retirement requires direct ruling, do not invent chronology. Nested LIFE atomic fail-closed. Next: MST-1-059 front temporary energy permission with source-pinned conditions, or official BLC034 chronological oracle. All tests remote GitHub Actions Node22, not local clone. No main merge, no Cursor PR #77 write, no production Vercel, no force-push. R33 documentation commit must have its own CI checked.


## 第三十四輪 R34｜MST059 正式兩模式、獨立暫時 FRONT 產能與 BLC 阻塞（2026-10-23）

GPT PR #78 原分支 `gpt/v2-resume-20261022`（對 `cursor/v2-multi-retire-life-6ff5`）。官方印刷／FAQ 差異、提交與失敗修正詳見 [V2-R34-MST059-front-energy-audit.md](./V2-R34-MST059-front-energy-audit.md)。

- **A** `06b2ebe7`: MST-1-059 green2/AP1/BP3000/gen1/ラノア魔法大学/onPlay 二選一、無 LIFE；官方 REST 也可產能；授予效果和原本印刷封印分開。官方時序沒有依據的部分保守處理。[CI 39882470095](https://github.com/will00t-debug/Ua/actions/runs/39882470095) SUCCESS。
- **B** `c5e300f7` + `7d970b71`，追加 `525e0192`: 通用 `frontEnergyPermission` 綁物理 UID/fieldEntryStamp/控制者/本回合結束；復用現有 `continuousStates` 和唯一 `universalEnergyByColor`，不當成能源+1、不重複印刷基礎、不沿用離場再登場、不依賴授予者持續留場。正反、JSON、非己方回合到期測試。[CI 39882857433](https://github.com/will00t-debug/Ua/actions/runs/39882857433) 及 [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935) SUCCESS。
- **C** `79b2f989` + `79677647`: 正式登錄 MST-1-059，`chooseOne`→真實抽1棄1 或同回合其他己方 Ranoa FRONT 最多1張暫時產能；完整印刷 pin、獨立 manifest、50張真牌、Human/Normal/Hard 選項、來源 UID ledger、零選取與非法、到期。先前 `760ba258`、`fa2d53f6` 紅燈是測試錯用 phase 與 `physicalUid` 欄位，按實際資料模型更正，沒有刪測試。[CI 39883529361](https://github.com/will00t-debug/Ua/actions/runs/39883529361) SUCCESS。
- **D** `b6a232cd`，校正確實有實體測試目標的 50 張 TTG/MST/SLG 牌組 `e2cf9c68`、`712dfad4`: 真實 TTG REST 能源、MST 印刷永久/暫時 FRONT/定時增加、SAO 各自能源／登場合法性、SLG Q2062 AP 指定加價、不得攻擊、暫時授予攻擊能力等獨立共存。[CI 39883944857](https://github.com/will00t-debug/Ua/actions/runs/39883944857) SUCCESS。
- **E** `c7119b35`: 官方再查 EX15BT Q2315/2316、類比 Q576/577，尚無直接證明 BLC-4-034 的 self REST→true-retire→裏向底卡選取時點；保留 BLC-2-019/047/4-034 **未正式登錄**，加測完整 BLEACH vs MST 50 卡負面回歸，Q61、Q2315/2316、巢狀 LIFE fail-closed 不改。

**最後完成程式 SHA `525e01925ee62270e75646a3823e18ec60f2cffa`，GitHub Actions [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935) Node 22 `npm test` **1869/1869 PASS**、五作品對戰 **60/60 PASS**、獨立 manifest／未移植報告成功。登錄 BLEACH97、TTG36、SLG42、SAO92、MST49，共 **316/700**，未移植 **384**；逐卡全部官方 FAQ 完整認證仍 **0**。測試在 GitHub 遠端，不宣稱本地 Node22；此文件提交自己的 CI 待另驗。未合併 main、未部署、未改 Cursor PR77、未 force-push。

**R35 首要缺口**：在取得官方的 BLC-4-034 退場費用與下層回收優先權依據以前，延續共用來源完成邊界、fieldEntryStamp、背面可視資訊及跨作品逐卡 FAQ 驗收，不為卡數加入作品專屬判定。

## R35｜真卡獨立驗收、跨作品實際複合狀態、DSL 原子缺口（2026-10-23）

本輪基準為 R34 文件 HEAD `63544e34445339c570230b37082037079c351f3a`。詳細可重現證據與官方印刷連結：[`V2-R35-real-card-certification-and-atom-gaps.md`](./V2-R35-real-card-certification-and-atom-gaps.md)。

- **A（獨立逐卡認證框架）**：`ea8239042a53a45442d0c5123f570fd2ffb6423c`、`0c3b0edc7a886d78eee7d2331446784a3c417e4c`。新增 `scripts/v2-card-certification-report.mjs` 與 `tests/v2-r35-card-certification.test.mjs`，明確區分源目錄700張、正式登錄、僅有部分效果測試與全面 FAQ 認證。四張近期卡 SAO-1-005、TTG-1-028、SLG-1-070、MST-1-059 均維持部分案例驗證；不以已通過的原子／合成測試冒充「完整官方驗收」。
- **B（真實來源複合）**：`f8718bf0eeb069f4c75ba7b7119c25d8fa31d294`。新增 `tests/v2-r35-real-cross-title-composite.test.mjs`：在一局合法50張 SLG vs MST，先真正登場 SLG-070 並授予額外 AP 指定費，再由 MST-059 真正登場二選一給另一己方 FRONT 暫時產能；重疊期間檢查行動集合、JSON、來源、UID/stamp、非法動作原子拒絕、Normal/Hard AI、獨立到期與隱藏資訊。
- **C（共用原子缺口盤點）**：`b44198fd838931472fac5c66b481ed2143fdf06f`、`993a88351ab86fc87d5c661b205acc6a20af5540`。新增可重跑 `scripts/v2-r35-unported-atom-audit.mjs` 與測試：精確分開當前未移植卡號，對10張印刷來源具體比對成5組共用原子候選；尚餘374張保留待逐卡原文驗證，**不可誤稱已完成384張完整語意盤點**。
- **D（保守閘門）**：沒有為湊實作數增加 DSL 或完整卡牌；最高價值候選為「下一張符合印刷條件的手牌使用減1 AP」（SAO-2-074／MST-1-062，官方 Q1210/Q2161），但須先建立原子費用預檢、一次性授予期限、Human/AI 同源 validator 與兩作品印刷正反例，才能安全進主引擎。
- **E（官方未解決）**：`703cc4c97e1cbe9c6881f925f76c8b844131b52c` 新增完整 R35 文件。BLC-2-019/047/4-034 仍未登錄；BLC034 MAIN REST+真退場後底牌恢復的實際選牌時序未有可直接套用官方依據；第二批巢狀 LIFE 繼續原子 fail-closed，不新增 last-known undercard 假快照。
- **CI 紀律**：之前 `525e01925ee62270e75646a3823e18ec60f2cffa` 的遠端 Node22 [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935) 1869/1869 與60/60 僅屬 R34 程式碼。**R35 新提交的完整 Actions 尚未取得可驗證 job/log；不能宣稱通過，也未在本環境執行本地 Node22。** 此連線的 commit-workflow-run 讀取只涵蓋 PR 事件，對本分支 push workflow 返回空列表不代表測試綠燈。待查每個最新 SHA 的實際 CI 並修復錯誤後才可進行正式整體驗收。
- **計數不變（依最後可核對來源 roster）**：BLEACH97、TTG36、SLG42、SAO92、MST49，**316/700** 登錄、**384** 未移植、逐卡全面 FAQ 認證 **0**。沒有改 main、Cursor #77、正式 Vercel，沒有 force push。


## R36（2026-10-23）｜共用能力驅動的全庫候選檢索、一次性手牌 AP 減費與雙作品登錄

**最新已驗證程式 SHA** `6823a1205c1615b0f91342f018a96c08ae15038c`；遠端 [Actions 39891258143](https://github.com/will00t-debug/Ua/actions/runs/39891258143) Node 22 **1896/1896 PASS**、五作品 **60/60 PASS**，獨立認證報告、全庫共用原子盤點、獨立 manifest、未移植報告皆 PASS。R35 `07c01009` 的 [Actions 39886593190](https://github.com/will00t-debug/Ua/actions/runs/39886593190) 曾為 **failure**，不可沿用 R34 舊綠燈；後續程式已單獨驗收。沒有本地 clone/Node22，僅依 GitHub Actions logs。

- **A** `15334bd887c1c16b21b34e28b5220e78851a74db`：在原本 `scripts/v2-r35-unported-atom-audit.mjs` 增加 `capabilityIndex()`，以現有 source catalogue、V2 registry、未移植 roster 自動更新 700 張唯一 ID、來源 fingerprint、已使用共用 op、未登錄候選、缺口與官方語意審核狀態。這是**既有清單的衍生檢視**，非第二份資料庫；關鍵字命中不可當官方效果一致性或 READY。
- **B** `182f7e372fdf2886505ab9cc7a4c8999edae5772`：`nextEligibleHandPlayApDiscount` 重用單一合法使用／`spendAp`，以印刷 BP／產能／特徵／卡類別選擇下一張符合條件的手牌卡，成功使用才消耗，本回合失效；Q1209、Q1210、Q2161、Q670 來源核對。非合法行動與偽造 UID 不消耗；不混同 Q2062 選擇目標 AP 加價。
- **C/D** `5088cf49285f38ac30df9732a32e51ab10ae4904`：五作品尚未移植 **382 張**皆重新掃描；另 7 張減費候選（BLC-1-070、BLC-2-030、BLC-4-055、BLC-4-069、TTG-1-080、SAO-2-031、MST-1-031）逐卡區分其他缺口；不能因減費相同就宣稱全卡可用。正式登錄 **SAO-2-074** 及 **MST-1-062**，全印刷 body、LIFE、合法 50 張真卡、Human/Normal/Hard、UID／存檔／跨作品真卡測試與獨立 manifest 同步。
- **D 強化** `6823a1205c1615b0f91342f018a96c08ae15038c`：AP 出牌減費／必選目標 AP 加價分離、同 UID 再登場新 stamp、未付能源原子拒絕、CI 自動加入兩個 audit 指令，遠端 Actions 39891258143 完整綠燈。
- **E** `33e16451b27f4c30116dba4402c22040595b0b36`：永久 R36 詳細交接文件 [V2-R36-capability-to-real-cards-and-ap-discount.md](./V2-R36-capability-to-real-cards-and-ap-discount.md) 明確區分 READY/NEAR READY/PARTIAL/RULE BLOCKED/SOURCE PENDING/REVIEW PENDING、15 張已有來源候選審核的未移植卡與 374 張 R35 原分群未逐卡分解清單、七張其他缺口、下一輪 5 個原語優先序與精確官方未解問題。

**當前已驗證 registry：BLEACH 97、TTG 36、SLG 42、SAO 93、MST 50 = 318/700，未移植382。** 獨立完整官方 FAQ 認證 **0**；另外有 **6 張局部驗收**（不是全卡所有 FAQ 狀態）。BLC-2-019/047/4-034 仍未登錄；4-034 self-REST→真正退場→裏向 under 回收順序和二次巢狀 LIFE 繼續 fail closed。

**下輪優先**：`topNChooseUpToTwoThenOrderBottom`（SAO-1-031/066）、重用 `frontEnergyPermission`（MST-1-080/060）、`printedEnergyAtMostFilter`（BLC-1-070/MST-1-031），有官方可靠時序再評估 `attackEndDistinctOutsideNamesSwap`（BLC-4-069），最後另作 `cannotBeChosenByOppEffect`（SAO-2-058/MST-1-067）。任何新原語都要重新搜尋 **五作品當時全部未移植卡**，未能表達完整印刷效果不得登錄。

本段新增文件 commit 後，該文件及後續 HEAD 的 GitHub Actions 必須另行核對**精確 SHA**，不可將 `6823a12` 綠燈誤當文件新提交的驗收結果。沿用 Draft PR #78、原 Cursor base，未合併 main、未部署、未覆寫 PR #77、未 force push。


## GPT R37：共用 TOP-N 雙選、380 張全庫篩查及兩張 MST FRONT 重用（2026-10-23）

- **必看最終詳細交接**：[V2-R37-top-n-two-full-roster-cross-title.md](./V2-R37-top-n-two-full-roster-cross-title.md)。工作分支仍是 `gpt/v2-resume-20261022`、GPT Draft PR #78 指向 Cursor 工作 base，不碰 main / PR #77 / production。
- 共用嚴格 `searchTopUpToTwoBottom`：TOP 5/4、可選 0/1/2 不同 UID、只公開選中、合法人類與兩級 AI、餘卡 bottom-order、嚴格存檔/序列化來源。SAO-1-031（黃3 AP1 三名稱）與 SAO-1-066（藍2 AP1 ALO）正式源卡登錄。
- 重用既有 `frontEnergyPermission`：MST-1-080（EVENT 抽2，可選前線授產能 DRAW）和 MST-1-060（STEP FRONT-only Turn1 MAIN 抽1棄1後可授予其他前線產能 GET）正式登錄；後者維持共用 effectQueue 並額外驗證暫停中的 grant 絕非偽造來源。
- 依真實 source catalogue + `capabilityIndex()` 掃描當時 380 張未登錄，64 TOP-N 候選（BLEACH29/TTG7/SLG11/SAO12/MST5），其中 SAO-2-056/MST-1-049/SLG-1-059 已查官方完整卡文與各自其他缺口（PARTIAL）；剩餘 61 REVIEW PENDING，無其他安全 READY。
- **最後已核對遠端成功程式 SHA `95a30319c24ee4f8b0653c277d30cad4c68c91fd`，Actions [39895776980](https://github.com/will00t-debug/Ua/actions/runs/39895776980)：Node22 1922/1922；五作品矩陣60/60；manifest、獨立 card ledger、兩層 audit、unported 報告 success。** 新文件/LIFE tests 的最終提交需要各自新 CI，不可沿用這個 SHA 的成功。
- **正式 322/700，未移植 378：BLEACH97/179、TTG36/45、SLG42/38、SAO95/88、MST52/28**。獨立全面 FAQ 認證 **0**，局部來源/情境評審 **10 張**。所有源卡印刷/功能驗收不得宣稱全面官方 FAQ 認證。
- 下輪優先 printedEnergyAtMostFilter、cannotBeChosenByOppEffect（官方 Q1206/Q2162）、topNOptionalSingleNoDiscard、optionalRetireThenProgram、attackEndDistinctOutsideNamesSwap（官方 Q2337/Q2338）；每新增一個原語都要回查五作品當時全部未移植真卡，完整整卡驗收後才能登錄。
- **禁止**合併 main、部署、force push、寫回 PR #77、重建 effectQueue／AP／能源；BLC-4-034 與未裁定巢狀 LIFE 照舊 fail closed。


## GPT R38：共用必要能源篩選、TOP-N 真卡重用、375 張全庫缺口（2026-10-23）

- **最完整 R38 官方印刷／能力／批次／驗收與後續優先交接**：[V2-R38-printed-required-energy-top-n-full-roster.md](./V2-R38-printed-required-energy-top-n-full-roster.md)。沿用 GPT #78／`gpt/v2-resume-20261022`，合併目標為 Cursor 原工作 base，未合 main／未修改 PR #77／未部署／未 force push。
- 新原語 `printedRequiredEnergyAtMost` 使用卡面必要能源 `energy`，**不使用**印刷產能 `gen`／暫時產能／即時能源。既有 TOP-N 共用多 UID 安全執行器加入最多單張無棄牌的模板 `searchTopUpToOneBottom`（不是第二套 queue）。`ownEventUsedThisTurn` 判定重用 `zoneMoveEvents` 真實事件，禁止非法 EVENT 觸發 conditional Impact。
- 三張已完整移植／獨立情境驗收：**BLC-1-070、SLG-1-046、MST-1-031**，各自官方全卡文與來源、Raid／LIFE／AP／TOP-N／UID／真人和兩種 AI 行動、正式 50 張場景都由新增測試及集中 CI 把關；不宣稱全面 FAQ 認證。
- **最新已驗證程式 SHA `010482e1a40e1984f79129e694e535d22ddcad2d`**：[GitHub Actions 39899603904](https://github.com/will00t-debug/Ua/actions/runs/39899603904) SUCCESS，遠端 Node.js 22 **1941/1941**、五作品矩陣 60/60、manifest、來源與候選盤點、未移植報告成功。登錄 **BLEACH98、TTG36、SLG43、SAO95、MST53＝325/700**；待移植 375；全面獨立 FAQ **0**、局部審核 13。這些是**遠端**驗收數字。
- 目前全庫重新掃 **375 張**；TOP-N 62 個文字候選，其中 SAO-1-056 官方全文新審核為 **NEAR READY**（TOP2 可用，但二選一之「免費 REST 登場指定藍色必要能源≤2角色」仍缺完整來源／AP／UID 共用原語），R37 原 3 張仍 PARTIAL，其餘 58 REVIEW PENDING，不誤認字詞相似＝全部效果相同。
- **下一輪共用能力首選** `chooseOneFreeRestHandCharacterWithPrintedColorEnergyAp` → `optionalRetireThenProgram` (SAO-2-056/MST-1-049) → `cannotBeChosenByOppEffect` (SAO-2-058/MST-1-067，Q1206/Q2162，不等於 AP 選取加費)。BLC-4-069 攻擊結束交換須先 Q2337/Q2338，全局戰鬥高風險稍後；BLC-4-034 強制 REST/真退場/裏向底卡及巢狀 LIFE 一律維持安全阻塞。
- 更新任何程式／交接後，重看當下 **精確 HEAD** 的 CI，舊綠燈不能證明新 commit。每新增共用能力必須使用既有 `capabilityIndex()`、R35/R37 腳本回查當時五作品所有未移植卡。


## GPT R39：免費手牌 REST 登場、可選真退場後 TOP-N、雙次五作品全庫回查（2026-10-23）

- **完整官方卡文／真卡／共用原語／驗收／候選統計與下一輪排序**：[V2-R39-free-hand-rest-optional-retire-roster.md](./V2-R39-free-hand-rest-optional-retire-roster.md)。工作分支仍為 `gpt/v2-resume-20261022`、GPT Draft PR #78 → Cursor base，不動 main／Cursor PR #77／正式部署，不 force push。
- 新增通用 `deployOwnHandRest`（印刷顏色／必要能源／AP／卡種限制；免費效果登場不二次扣 AP、不消耗正常手牌 AP 減費；實體 UID、fieldEntryStamp、onPlay、法定滿場替換，UI/AI 共用合法選擇），及 `optionalRetireThenProgram`（先可選真正 CHARACTER／FIELD 退場，後續 TOP-N／自身 ACTIVE 僅在確實退場完成後執行，沿用現有 onRetire 與 queue）。TOP-N 增 `traitlessCharacterOrField` 精確過濾。沒有第二套登場／退場流程。
- 完整印刷來源移植三張：**SAO-1-056、SAO-2-056、MST-1-049**，含同源真卡對戰、二選一／可選0、TOP2／TOP5／TOP4、底排序、印刷限定、UID／AP／Human+AI 負例。正式 registry + independent manifest + 獨立局部審核共 **328/700**，尚未 **372**（BLEACH98、TTG36、SLG43、SAO97、MST54）；局部 16、完整獨立 FAQ 認證 **0**。
- 每個新共用原語後以原來的 `capabilityIndex()` 掃描所有當下尚未移植卡，先 **374 張**、再 **372 張**；最新手牌特殊登場文字候選 **32**、真退場+TOP-N 文字候選 **8**、TOP-N **59**。未完成全印刷個別審核的候選只標待審，**沒有**宣稱額外 READY 或衝卡數登錄。
- **截至文件編寫前最後可驗證程式 SHA `97acfeb159eee068eba0ebf08039651baa7cdd58`**：遠端 Actions [39926750588](https://github.com/will00t-debug/Ua/actions/runs/39926750588) SUCCESS，Node22 **1962/1962**、五作品 **60/60**、獨立 manifest、R35/R37 全庫腳本、認證與 unported 報告成功。**追加文件與證據檔案產生新的 HEAD，務必對新 SHA 另行查驗 Actions，不能借舊成功。**
- 後續建議 `cannotBeChosenByOppEffect`（Q1206/Q2162；絕不可誤用選擇 AP surcharge）→ 完整來源審核上述文字候選 → 高風險攻擊結束交換 Q2337/Q2338。BLC-4-034 裏向底卡時序和巢狀 LIFE 繼續 fail-closed。


## GPT R40：來源分級不可選、SAO 完整事件移植及五作品全庫回查（2026-10-23）

- **R40 官方來源、完整真卡／候選、程式與安全阻塞**：[V2-R40-official-choice-protection.md](./V2-R40-official-choice-protection.md)、[V2-R40-choice-protection-full-roster.md](./V2-R40-choice-protection-full-roster.md)。沿用 GPT Draft PR #78 / `gpt/v2-resume-20261022` → Cursor base；未合 main、未修改 PR #77、未部署、未 force push。
- **通用原語** `cannotBeChosenByOppEffect` 與 `grantOwnFrontChoiceProtection`：由現有 continuousStates、fieldEntryStamp、合法行動清單／原子 dispatch、sourceResolutionBoundary 和 effectQueue 重用，來源分 `any/character/trigger`，人類與 Easy/Normal/Hard AI 走同一驗證；場外 EVENT、Trigger 物理來源、Q1119 EVENT 必選前置檢查、加費並存、到期、來源與目標 UID／序列化皆有正反例；不影響無個別選擇之全體效果／戰鬥宣告。
- **完整印刷正式新增 SAO-2-058**，官方 EX08BT Q1206：紫2/AP1 EVENT、必選己方 FRONT、對手所有效果選擇保護至下次己方回合開始、若〈アスナ〉則自選最多1張己方 AP ACTIVE、完整 ACTIVE LIFE。新 shared DSL 不含卡號特判，正式 SAO registry + source pin + independent manifest + 50 張真卡／AI／UID 測試。
- **保留阻塞**：SAO-2-060 Q1207 僅防對手「角色」效果；整張仍缺場外回收、從手牌免費 ACTIVE 登場、來源授予及 SPECIAL LIFE 完整驗收，維持 PARTIAL。MST-1-067 最新卡文為「對手效果」、Q2162 卻引「對手角色效果」且 Raid 底卡真退場處理未完整驗收，維持 RULE BLOCKED；沒有猜測勘誤或部分登錄。BLEACH Q2311/Q2313 源範圍對照已列文。
- **每個新共用原語後回查全部當期未移植卡**：R40 初次 372/372，移植 SAO-2-058 後 371/371；保護關鍵字候選從 6（SAO5/MST1）→ 5（SAO4/MST1）。同時重查 R39 特殊手牌登場 32、真退場 TOP-N 8、TOP-N 59 文字候選，**可重疊不得相加，也不可視關鍵字命中＝READY**。正式覆蓋 **329/700**：BLEACH98、TTG36、SLG43、SAO98、MST54；未移植 371。官方整卡審核 3，部分來源驗收不等於獨立完成逐卡 FAQ 認證，後者仍 **0**。
- **已證實程序提交 `a81fae38e42ee6e0f6edcea3947e0ec79ded7866`**：[GitHub Actions 39932466201](https://github.com/will00t-debug/Ua/actions/runs/39932466201) SUCCESS，遠端 Node22 **1973/1973 PASS**、矩陣 **60/60 PASS**、ledger、R35／R37、manifest、未移植報告皆綠。之後另外將 SAO 測試改成直接使用正式 registry，並追加交接文件；**必須重新檢查最終 HEAD Actions**，不能以前一筆成功冒充新提交成功。
- 下一輪首選 `outsideOneRecoverThenFreeActiveHandDeploy` 並完整驗證 SAO-2-060；回審保護文字候選其他3張，必要時再處理 BLC-4-069 `attackEndDistinctOutsideNamesSwap` Q2337/Q2338。MST-1-067 等官方範圍與多層 Raid 退場裁定；BLC-4-034 和未驗證巢狀 LIFE 維持安全阻塞。


## R41 補充交接（2026-10-23；新節點優先於上方 R40 歷史快照）

- **保持原 GPT PR #78**（`gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`），不合併／不部署／不改 Cursor PR #77／不 force push；每次 push 先比對最新 PR HEAD。
- A 官方 `SAO-2-060` Q1207 全文驗證，`f11e234`。B 通用 `deployOwnHandSpecial` 共用效果，`1988226`；負例 `5eb0bd1`，嚴格佇列白名單修正 `09cf3e4`，[39937109260](https://github.com/will00t-debug/Ua/actions/runs/39937109260) SUCCESS。
- C 完整 `SAO-2-060` registry／manifest／八個真卡案例 `bff66c8`，R40 歷史盤點與實際 pending fixture 更正 `708468e`， [39937890797](https://github.com/will00t-debug/Ua/actions/runs/39937890797) SUCCESS，1985 Node22 測試／60局。
- D `c40dd06` 同一 `capabilityIndex` 重新搜索所有 **370 張**未移植真卡、五作品文字候選 **72** 張（手牌31／場外回手32／保護4，重疊不可相加），[39938053007](https://github.com/will00t-debug/Ua/actions/runs/39938053007) SUCCESS，1987/1987、60/60。
- E `9cd3f87` 官方全文／FAQ 分類尚未移植候選 **9 張：PARTIAL8、RULE BLOCKED1、REVIEW PENDING63、READY0**（63 為其他文字候選，非完整人工審核），[39938875140](https://github.com/will00t-debug/Ua/actions/runs/39938875140) SUCCESS，1988/1988、60/60。`cf944bd` 另外加固 save pending 的來源、免費 ACTIVE 與角色保護作用域 anti-forgery；該 SHA 和後續文件 SHA 都要查自己的 CI。
- 最新通過的已登錄 **330/700**（BLEACH98、TTG36、SLG43、SAO99、MST54），未移植 **370**；完整獨立逐張 FAQ 認證 **0**。**SAO-2-060 現在已完整登錄，舊 R40「仍 PARTIAL」記錄僅供歷史，不再是最新狀態**。
- 核對與優先序：詳 [R41 SAO-2-060 DSL 規格](./V2-R41-sao060-official-dsl-spec.md) 和 [R41 全庫官方保護／重用審查](./V2-R41-official-protection-roster-and-next.md)。SAO-2-069、SAO-2-068、SLG-1-028、BLC-4-042、SAO-1-087、SAO-2-064 等需要其他共用能力才能完整移植。MST-1-067 Q2162、BLC-4-034 真退場與裏向底卡、未核准第二批巢狀 LIFE 維持安全封鎖。


## R42 補充交接（2026-10-23；以最新 SHA Actions 為準）

- **原 GPT Draft PR #78、原分支 `gpt/v2-resume-20261022`**，不得合併 main、部署、force push、改 Cursor PR #77，所有 commit 前均確認 PR HEAD。
- **Batch A** `b14fd9e4`：基於 `inspectTopTraitOutside` 的 `orName`／`requiresOtherOwnTrait` 最小擴充；TOP2 選0或1→OUTSIDE、剩餘依序TOP，最初遠端 Actions [39945024669](https://github.com/will00t-debug/Ua/actions/runs/39945024669) 成功。
- **Batch B** `d0a1c4d` ＋ `23277fa`／`68b9589`／`ea2b38e`：SLG-1-030 影の兵士 官方完整印刷 12 張牌組例外、其他己方影の軍団存在、TOP2 特徵或水篠旬卡名選擇；完整 registry／獨立 manifest／來源 CSV。中間紅燈是 source deckLimit 未傳遞、一般上限4特殊12、TOP2 fixture；修正後 [39946175840](https://github.com/will00t-debug/Ua/actions/runs/39946175840) SUCCESS，未刪測試。
- **Batch C** `d00a2340` 新共用 `deployNamedFromZones`：從 OWN HAND 或 OWN OUTSIDE 選印刷卡名、指定 ACTIVE/REST 與合法目的地，來源 UID 事件、entryStamp、onPlay、Human/AI 同一合法操作，不新增第二套 AP/效果隊列；[39946348220](https://github.com/will00t-debug/Ua/actions/runs/39946348220) SUCCESS。
- **Batch D** `c6baf7bc`＋`3680ff59`：SLG-1-028 イグリット 官方紫4/AP2/BP4000/GET，`enterAlwaysActive`，onPlay 手牌**或**場外影の兵士 0–1 免費 REST 登場，會真正觸發 SLG-1-030 TOP2；修正 AP2 fixture + R41 歷史名單，不改規則，[39947064630](https://github.com/will00t-debug/Ua/actions/runs/39947064630) SUCCESS：Node22 **2003/2003**、矩陣 **60/60**、manifest **332**。
- **Batch E** `cfbe11c2`：saved pending 防偽，防改成未印刷的 READY／改卡名／換所有權／免費區域；[39947235806](https://github.com/will00t-debug/Ua/actions/runs/39947235806) SUCCESS。 `84839279`：以現有 R35/R41 能力索引重掃所有 **368** 未移植、全700來源，候選去重約71（需最新 Actions 確認），新 R42 CI 工作流程與自動分類；最新 HEAD 不得借前一個成功記錄。
- **目前基準：332/700**：BLEACH98、TTG36、SLG45、SAO99、MST54；未移植 **368**。原 R41 的9張官方未移植候選，現在 SLG-1-028 已移植，其餘官方整卡審核 **8張：7 PARTIAL + 1 RULE BLOCKED**、其他 REVIEW PENDING63；獨立完整 FAQ **0**。
- 完整官方來源、測試、剩餘缺口、優先序：[R42 handoff](./V2-R42-named-free-zone-slg-pair.md)。SAO-2-068／069、BLC-4-042、SAO-1-087／2-064 複合印刷效果未完整支援，MST-1-067 Q2162、BLC-4-034 和巢狀 LIFE 仍維持封鎖。正式站 Vercel 未部署。


## R43 接續完成／下一輪基準（2026-10-23）

- GPT PR #78、原工作分支 `gpt/v2-resume-20261022`；不合 main、不能覆寫 Cursor PR #77、不部署、不 force push。開工 HEAD `ac04417d`（39947812815 SUCCESS）。
- **Batch A** `30968fae`：擴充既有 `deployNamedFromZones` 印刷 AP／能源／顏色篩選與當回合物理 UID BP 增益；[39950145957](https://github.com/will00t-debug/Ua/actions/runs/39950145957) SUCCESS。
- **Batch B** `d8d64e40`：資料驅動 `restDiscardRetireThen` 真實 MAIN 成本，REST→合法己方 hand discard→真正己方退場→可選後續；原有 retirement queue、source UID、來源完成時序，安全否決偽造 saved pending；[39950677505](https://github.com/will00t-debug/Ua/actions/runs/39950677505) SUCCESS。
- **Batch C** `2b7eaacb`：SAO-2-068 官方 EX08BT card 本文 pin，完整 MAIN＋ACTIVE LIFE、免費綠〈アスナ〉ACTIVE 印刷能源≤3 AP1、BP+1000 當回合；與 registry／獨立 manifest／真牌測試一致；[39951145269](https://github.com/will00t-debug/Ua/actions/runs/39951145269) SUCCESS。
- **Batch D** `42b13411`：補 LIFE 真行動，R43 同既有全庫原始 catalog 重新搜尋，明列 SAO-2-069 Raid/phase/onPlay/onRetire/LIFE 完整阻塞、MST Q2162 仍 RULE BLOCKED；新增集中 CI 掃描。**D 的 CI 不可沿用 C 成功**。
- **Batch E** 新增 [R43 handoff](./V2-R43-paid-main-true-retire-sao068.md)，完整官方來源、負例、共同 DSL、全庫候選及 R44 排序；此文件的**最後 HEAD Actions 必須另查**。
- 基準：**333/700 正式登錄／367 未移植**，BLEACH98／TTG36／SLG45／SAO100／MST54。R41 已核對候選仍未移植7張：PARTIAL6、MST-1-067 Q2162 RULE BLOCKED1。獨立完整逐卡 FAQ Certified **0**。SAO-2-069 不因部分原語重用而登錄。
- 必跑 `node scripts/v2-card-certification-report.mjs`、R35/R37/R40/R41/R42/R43 audit、`npm test`、`node scripts/v2-integrated-match-matrix.mjs`、`node scripts/v2-assert-independent-manifest.mjs`、`node scripts/v2-unported-report.mjs`，核對最新 SHA Actions URL。沒有本地 clone 與手機 UI QA；不部署正式站。


## R44 完整成果與下一輪基準（2026-10-23）

- 原 GPT Draft PR #78，分支 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`，不合 main、不部署、不修改 Cursor #77、不 force push。
- **Batch A `bdce53914df7`**：重用印刷條件免費 hand/outside REST，避免強制 BP grant。
- **Batch B `b2f5d6dd56b0`**：雙方 attack-phase end 真退場、UID／fieldEntryStamp、來源排程安全。
- **Batch C `d9fe92b59ac3`**（修正 `50015c6f3330`、`11a460aa5aa7`）：SAO-2-069 Raid／onPlay BP4000 真退場／onRetire 〈アスナ〉印刷條件免費 REST／雙方 attack-end／Raid LIFE 全文驗收及 registry＋獨立 manifest。
- **Batch D `c76b840d6955`**（修正 `620758cd8bba`）：真實 Raid LIFE、對手回合及五作品 R44 全庫搜尋與 CI。
- **Batch E `a9fd51acd4fc`**：兩來源 phase-end 真退場優先順序、序列化偽造 pending 防禦；[39957725253](https://github.com/will00t-debug/Ua/actions/runs/39957725253) SUCCESS：Node22 **2034／2034**、矩陣 **60／60**、獨立 manifest **334**；本輪文件更新後以**最後 HEAD CI** 再確認。
- 最新已核實：**334／700** 正式登錄，**366** 未移植；BLEACH98、TTG36、SLG45、SAO101、MST54。R44 廣泛字詞候選238（不可視為 READY）；366張目前 **360 REVIEW PENDING、5 PARTIAL、1 RULE BLOCKED**；已核對完整官方卡文的未移植6張。**完整獨立 FAQ 認證0**。SAO-2-069 本輪已正式移植。
- 交接詳見 [V2-R44](./V2-R44-sao069-phase-end-true-retire.md)。R45 優先 BLC-4-069 Q2337/Q2338、SAO-1-087 Q978、SAO-2-064 Q1208、BLC-4-042 Q2323；MST-1-067 Q2162、BLC-4-034、未核對巢狀 LIFE 持續阻塞。既有共用原語／測試不可重寫，下一輪仍先官方全文再任何 READY 登錄。


## R45 source hand-discard eligibility / Q2337 counter / Q2323 three-mode grammar (2026-10-23)

- Exact source, code and safety handoff: [V2-R45-source-taxes-attack-end-three-mode.md](./V2-R45-source-taxes-attack-end-three-mode.md); official four printed cards and Q763/Q978/Q1208/Q2323/Q2337/Q2338: [V2-R45-official-rulings.md](./V2-R45-official-rulings.md).
- Same existing GPT Draft PR #78 (`gpt/v2-resume-20261022` → Cursor `cursor/v2-multi-retire-life-6ff5`), main/production/PR#77 untouched.
- Five bounded evidence/primitive batches: A `9b1b64f` official four full prints; B `ffa1f3f`+`cdc9d9b` Q978/Q1208 source-scoped **pure eligibility planner only**, not live hand payment; C `c253c3e`+`c72eacb` existing R35 `capabilityIndex` **366/366** unported audit in GitHub Node22 CI; D `0a6ab51`+`4b1349c` Q2337 distinct original green EVENT+FIELD outside-name counter with UID negative tests, not attack end swap; E `a182cae`+`66ee215` validated generic `chooseOne` accepts 2–3 modes with AP-paid synthetic deck scenarios, not all BLC-4-042 modes.
- Last **code** SHA `66ee215b7d34eeaaae6e6a931a97e1debde80ba4`: [Actions 39978309934](https://github.com/will00t-debug/Ua/actions/runs/39978309934) **SUCCESS**: Node22 **2050/2050 PASS**, 60-match **60/60 PASS**, full existing manifest and catalog gates green. Recheck final documentation HEAD CI independently.
- Registry unchanged **334/700**, unported **366** (BLEACH98, TTG36, SLG45, SAO101, MST54); full independent per-card FAQ certification **0**. R45 current remaining unported: **360 REVIEW PENDING / 5 PARTIAL / 1 RULE BLOCKED**; 47 unique broad text candidate IDs are **not** full-print READY. This round full-print-reviewed **four** target card records, safe full-print READY **zero**. SAO-1-087, SAO-2-064, BLC-4-069, BLC-4-042 remain **NOT registered**.
- Next high-value actual implementation: existing `legalUniversalActions`/pending Q978/Q1208 **atomic own-hand discard payment and mandatory EVENT preflight** (no separate chooser); full SAO-2-064 passive/aura, then SAO-1-087 other-own battle-won/temporary DAMAGE2/MAIN and Raid; Q2337 battle-or-LIFE attack-end source-safe FRONT/ENERGY **swap**, reuse Q2338 next-eligible hand AP discount; BLC-4-042 three fully supported modes. Do not assume multi-target tax stacking or source type semantics. MST-1-067 Q2162, BLC-4-034 multilayer Raid, second nested LIFE stay fail-closed.


### R46 2026-10-23 update
Batch A generic live selection hand payment, Q1119 mandatory EVENT preflight, actual physical UID payment and serialized pending. Verified green Node22 2055/2055 + 60/60 at SHA 2e756a7 (Actions 39984451710). Batch B adds official SAO-2-064 Q1208 profile, actual 50-card SAO selection via SAO-2-069 and DRAW LIFE tests, independent manifest and partial FAQ record, subject to NEW SHA CI. Details docs/v2-handoff/V2-R46-live-selection-payment.md. No exhaustive FAQ certification, no main merge/deploy/Cursor PR change.


### R46 2026-10-23 battle-win engine handoff
- Generic actual blocked-victory DAMAGE2 profile now integrated in engine; attacker >= blocker and blocker > attacker are distinct Q763 branches. No direct LIFE trigger, no self trigger, current-turn-only and same physical stamp. Negative saved UID and alternate AI tests. Verified 09e6684: Actions 39987041690 SUCCESS; exact latest doc/scanner commit still needs new CI.
- R46 conservative full unported scan reuses R35 capabilityIndex. Source word hits do not grant READY; SAO-1-087 remains PARTIAL until MAIN Turn1, Raid/RAID LIFE, IMPACT, Q978 EVENT selection payment full acceptance.
- SAO-2-064 is 102nd registered SAO card; all 335/700, 365 unported, independent FAQ certified 0. BLC-4-069 attack-end physical swap and BLC-4-042 three-mode actual resolution remain unported; Q2162 MST-1-067 remains RULE BLOCKED.


### R47 verified handoff, full official real card accepted as V2 Pilot
Commit 7765edfb: GitHub Actions https://github.com/will00t-debug/Ua/actions/runs/39993910596 SUCCESS (Node22 2085/2085, five-title match 60/60, independent manifest). SAO-1-087 green necessary E7/AP1/BP5000/GGO Raid Kirito, printed Impact 1, other own battle winner temporary DAMAGE2 (Q763 attacker >= blocker, defender > attacker), opponent EVENT-only Q978 physical hand payment, own field MAIN Turn1 +1000 OTHER character, RAID LIFE: complete authored print, real legal 50-card SAO, legal 50-card cross-title BLEACH EVENT opponent targeting, hidden information and saved UID tests. Official pin, separate manifest and partial FAQ evidence ledger updated. Registration 336/700, 364 unported, SAO 103, independent exhaustive FAQ 0.
Generic attack-end physical swap earned after attack BLOCK or all direct LIFE Trigger checks and distinct four printed green EVENT/FIELD names already integrated and CI passed c56f736. Generic field-wide MAIN once buff passed f2f18cc. R47 all-five report scans all 364 unported, 51 textual candidates, 2 PARTIAL BLC-4-069 / BLC-4-042, 49 REVIEW PENDING, zero READY. BLEACH green eligible EVENT/FIELD **already registered** four distinct names: 卍解、天地灰尽、尸魂界、隊首羽織. Do not misreport their availability; BLC-4-069 still requires all printed effects plus official full real match before porting.
Permanent fail-closed rules, no rewrite/merge/deploy/force-push/retired hidden-layer guessing; see docs/v2-handoff/V2-R47-full-title-coverage-audit.md and V2-R47-attack-end-swap.md.


## R48 實際接續紀錄（2026-10-24；以最新 GitHub Actions 為驗收準繩）

- **不合 main、不部署、不修改 Cursor、不 force push**。沿用 GPT Draft PR #78、`gpt/v2-resume-20261022`，原 base `cursor/v2-multi-retire-life-6ff5`。R47 文檔 HEAD `7edbdf30` 的 Actions `39994396912` 本身已成功；不能把此成功套到 R48。
- R48 官方全文與共用能力逐卡阻塞：`docs/v2-handoff/V2-R48-official-full-print-audit.md`。BLEACH BLC-4-069 Q2337/2338 與 BLC-4-042 Q2323 見該檔；無完整驗收故均**未註冊**。BLC-4-042 藍色發生能源**2**（原 legacy 記 3），其 Q2323 名稱〈涅骸部隊〉唯一已找到的合法來源 `BLC-2-044` 是藍色 **FIELD** 而非 CHARACTER。
- Batch A：`tests/v2-r48-four-official-green-sources.test.mjs`，來源 pin 綠 EVENT/FIELD `BLC-1-094`／`097`／`099`／`100`。普通覆蓋 FIELD 進 REMOVED，不能偽稱 OUTSIDE；另提供透過新的 `BLC-1-095` 達成**四種綠 EVENT 印刷卡名**的正式出牌測試。
- Batch D 真卡移植 `BLC-1-095`（UA08BT 綠 EVENT「護廷十三隊」，必要能源2／AP1／產0／無 LIFE，TOP4 選最多2張護廷十三隊特徵卡加入手牌，剩餘依合法順序回 BOTTOM），**重用** R37 共用 `searchTopUpToTwoBottom`，新增 official fingerprint 來源 profile、`title-packs/bleach.mjs`、獨立 manifest、`tests/v2-r48-BLC-1-095-complete.test.mjs`；未新增同功能第二套原語。
- Batch D 全庫動態搜尋 `scripts/v2-r48-official-readiness-report.mjs`：使用現有 `capabilityIndex()`、R46、R47 與 registry，每次重計五作品 700 張補集，文本候選不等同 READY。手工完整核對 8 張未移植卡：BLC-4-069、BLC-4-042、BLC-2-044、TTG-1-067、SLG-1-021、SAO-1-018、SAO-1-070、MST-1-009，均為 PARTIAL（印刷效果尚未完整實作），其他仍 REVIEW PENDING。另完整審核新移植 BLC-1-095：本輪共 9 張新增官方全文核對（局部原本有舊審查，非全面 FAQ 認證）。
- 此輪預期 registry **337/700**（BLEACH 99／TTG 36／SLG 45／SAO 103／MST 54），unported **363**。此為實作提交之預期值，必須以 Node.js22 / `v2-unported-report` / 最新 SHA CI 再驗證，任何失敗不宣稱通過。
- 能力優先順序：①單次來源限定**雙 UID 手費**原子完成再回收，②真退場後指定印刷卡名 **FIELD** 從 HAND 零 AP ACTIVE 進 ENERGY，③本回合暫時授予 attack-end 換位（MST-1-009）；④花天狂骨真卡 BLC-4-076／077／081 可全印刷移植者，實測 BLC-4-069 Q2338；⑤TTG 勝戰抽卡、SLG 依場外張數動態 BP 與回收門檻。
- 不改舊保留疑義：MST-1-067 Q2162、BLC-4-034 裏向底卡、未釐清巢狀 LIFE、多目標 AP＋棄手費用。**全面獨立逐卡 FAQ 認證仍為 0**；R48 新真卡個別整卡測試不等於全 337 張逐卡 FAQ 認證。
- 集中 CI 指令：`node scripts/v2-card-certification-report.mjs`、`node scripts/v2-r35-unported-atom-audit.mjs`、`node scripts/v2-r46-battle-win-candidate-report.mjs`、`node scripts/v2-r47-attack-end-swap-candidate-report.mjs`、`node scripts/v2-r48-official-readiness-report.mjs`、`npm test`、`node scripts/v2-integrated-match-matrix.mjs`、`node scripts/v2-assert-independent-manifest.mjs`、`node scripts/v2-unported-report.mjs`，核實最新 HEAD Actions SUCCESS 才報成功。


## R49 下一輪接續（2026-10-24）

- 基準：R48 HEAD `126ae120`、Actions `40002474994` SUCCESS（2,092/2,092 + 60/60），從最新 GPT Draft PR #78 `gpt/v2-resume-20261022` 接續；PR base `cursor/v2-multi-retire-life-6ff5`，未修改 Cursor #77、不合 main、不部署、不 force push。
- 詳細官方印刷、源 UID、整卡阻塞及分批內容：`docs/v2-handoff/V2-R49-atomic-payment-field-three-mode.md`。
- Batch A 原子雙手費：在已存在 `discardGate` 增加 `count:2`，單一次合法 action 指定兩個不同 OWN HAND 實體 UID，先驗兩張再一起進 OUTSIDE；直到完整支付才可執行後續；可選 0 張完全不支付、不接續；待決來源與私有資訊嚴格驗證。保留 count1。測試 `tests/v2-r49-atomic-two-hand-cost.test.mjs`。
- Batch B 精確印刷名稱：`recoverOutsideOne` 新 `filter.field='printedNameAny'`，支付完成後從**現在** OWN OUTSIDE 判定精確 `['涅 マユリ','涅 ネム']`，不是同特徵或舊 aliases；反例、Hand/Outside UID、Human/AI 測試。
- Batch C 通用 FIELD 免費登場：既有 `deployNamedFromZones` 嚴格 `cardType:'field'`＋手牌＋ENERGY＋ACTIVE＋顏色、印刷名及其他合法參數；真實 UID 搬移、新入場 stamp、onPlay，0 額外 AP；`tests/v2-r49-named-active-field-entry.test.mjs`。
- Batch D `retireOwnCharacterOne(excludeSelf:true)` 真正己方其他角色退場後才接續 FIELD；原本 draw 接續和 AP/排隊系統不重寫；加入 `chooseOne` 分支合法的 `inspectTopAnyOutside`／`retireOwnCharacterOne`。三模式合成 50 張牌組完整操作 `tests/v2-r49-three-mode-live-integration.test.mjs`。截至 R49 核心程式 HEAD `42983156`，Node 22 **2101/2101 PASS**、60/60 PASS、Actions `40006288492` SUCCESS；後續提交必須另外確認自己的 CI。
- Batch E：`scripts/v2-r49-unported-reuse-report.mjs` 直接重用 R35、R48 registry/官方 source index，動態搜尋五作品**目前所有未移植卡牌**；`tests/v2-r49-unported-rescan.test.mjs` 守住母體700、UID保存及不憑文字自動 READY；來源證據 `tests/v2-r49-blc042-044-official-source-pins.test.mjs` 分別確認 `BLC-4-042` Legacy gen3 **不能**直接沿用為官方發生藍能源2，和 `BLC-2-044` 是精確印刷名藍色 FIELD。
- **正式登錄尚未增加：337／700，未移植 363**（應再執行報告查最新）。`BLC-4-042` **PARTIAL**：雖三種模式可於共用引擎真實 UI ACTION 結算，但 BLC-2-044 本身兩種不同 MAIN 特殊能力、042 的印刷能源正規化與真正合法 50 張 BLEACH 卡牌、DRAW LIFE 尚未完成官方整卡認證；不得把合成能力通過誤作完成。BLC-4-069 同樣 PARTIAL，還需花天狂骨合法來源與真實整卡驗收。完整人工官方核對 R48 8 張仍 PARTIAL，其他文字候選 REVIEW PENDING。
- 下一輪：優先 `BLC-2-044` 同一卡兩項獨立 once MAIN 能力、退場後的 FIELD REST 全體 buff；其次真正 BLC-4-042 印刷正規化與全卡三模式；再 BLC-4-076／077／081 真卡使 BLC-4-069 完成 Q2337/2338。每新原語完成都重跑五作品全庫，READY 才批次移植。
- 保留 MST-1-067 Q2162、BLC-4-034 face-down bottom／退場、未裁決二批巢狀 LIFE、合併 AP＋棄手費。全面獨立 FAQ 認證仍 **0**。集中 CI：`node scripts/v2-card-certification-report.mjs`、`node scripts/v2-r35-unported-atom-audit.mjs`、`node scripts/v2-r46-battle-win-candidate-report.mjs`、`node scripts/v2-r47-attack-end-swap-candidate-report.mjs`、`node scripts/v2-r48-official-readiness-report.mjs`、`node scripts/v2-r49-unported-reuse-report.mjs`、`npm test`、`node scripts/v2-integrated-match-matrix.mjs`、`node scripts/v2-assert-independent-manifest.mjs`、`node scripts/v2-unported-report.mjs`；只承認最後程式 HEAD 自己的 SUCCESS。


## R50 follow-up — independent physical FIELD MAIN usage (2026-10-24)

R50 common `fieldDualMain` previously shared once-per-turn mode keys by printed FIELD **name**, incorrectly preventing a second physical copy from activating its own MAIN ability. Minimal common-engine correction `8025909f` keys both independent printed modes by source physical UID in legal actions, dispatch and saved pending validation. Strict two-copy 50-card model regression `1339609c` verifies independent trait-retire, REST/BP buff, source UID and serialization. Handoff: [V2-R50-physical-field-usage.md](./V2-R50-physical-field-usage.md). This is not a new full official card certification; **exact current HEAD CI is not yet confirmed**. No main/production/Cursor PR77 changes.


## R51 實際共用能力接續（2026-10-24）

- 基準：R50 既有 HEAD `7c0817e0`，BLC-2-044／4-042／4-069／4-076 已在 R50 正式登錄，不得重做；Q770 兩張相同 FIELD 的獨立 Turn1 UID 修正與測試已存在。R50 最終 HEAD CI 尚需獨立查核。
- 新增通用 `ownOutsideNamedCountAtLeast`：從 OWN OUTSIDE 即時計算符合指定印刷卡名或官方核對 alias 的**物理卡張數**，同一實體符合多名仍只算一張；不與 R45 Q2337「不同卡名種類數」混用。已接入共用 `passiveBonuses` BP/IMPACT 條件並加嚴 schema；50 張模型牌組、負例、真實 `universalBp`／`universalImpact` 測試與五作品 R35 動態補集搜尋腳本。
- 官方 UA15BT/SAO-1-070 アスナ 完整卡文已核對，4 張〈ユウキ〉＋〈マザーズ・ロザリオ〉合計給己回 BP+500、6 張給 IMPACT1；但仍 **PARTIAL**，需要真實合法 SAO 牌組與兩個印刷名稱的完整已登錄來源、6 張場外可達性、真戰鬥及來源 pin 後才可正式移植。不得將模型測試視為完整真卡驗收。
- 最新獨立 manifest 快照 **341/700**（BLEACH103／TTG36／SLG45／SAO103／MST54），未移植359；**不是** R51 最後 HEAD 已驗收綠燈。遠端 GitHub connector 僅回傳 PR 觸發 Actions，push-run 可能查不到；尚未能在本地執行 Node22，必須核對新 SHA Actions SUCCESS 才宣稱測試通過。
- 詳細：`docs/v2-handoff/V2-R51-named-outside-threshold.md`。下輪先查最新 CI／修回歸，再查完整五作品 R35～R51 候選與 SAO-1-070 真卡來源；維持 main／正式站／Cursor PR #77 不動。

## R52 SAO Q767 shared EVENT resolution and genuine 4/6-OUTSIDE integration (2026-10-24)

- Still on GPT Draft PR #78 and gpt/v2-resume-20261022; target cursor/v2-multi-retire-life-6ff5; no main merge, production deployment, Cursor #77 edit or forced push.
- Official UA15BT/SAO-1-100 Q767: paid EVENT resolves completely before own OUTSIDE insertion; 2 prior named cards bounce, 3 retire. SPECIAL LIFE independently retires. Official UA15BT/SAO-1-070: 4 named physical OUTSIDE yield +500 BP on OWN turn; 6 independently grant IMPACT1.
- Reuse R51 ownOutsideNamedCountAtLeast and existing true bounce/retire, selection legality, AP and LIFE. R52 adds strictly validated conditionalBounceOrRetireByOwnOutsideNames and generic in-flight resolvingEvents/completeResolvingEvent Q767 boundary plus fail-closed saved UID/provenance.
- Independently pinned real registry and manifest include SAO-1-100 and SAO-1-070. Official scenario tests use 50 legal SAO printed cards; three actual paid SAO100 EVENT actions and three SAO-2-068 MAIN discard/self-retire actions are used for genuine OUTSIDE threshold generation, battle/IMPACT and LIFE; keep fully separate from synthetic shared DSL coverage.
- Dynamic R35-sourced five-title scan at current registry: 343/700 registered, 357 unported (BLEACH103 TTG36 SLG45 SAO105 MST54), R52 text candidates 34, zero automatically READY. R51 broader text candidates 93. Exhaustive independently verified FAQ certificates remain 0.
- Shared engine + strict queue validation commit 9b3ba352 had GitHub Actions SUCCESS run https://github.com/will00t-debug/Ua/actions/runs/40043667572. Full official-card latest-SHA CI is a separate required gate; do not inherit earlier success. Old R48 assumption that SAO070 was unported and R52 test fixture repeating the same hand UID were corrected without deleting negative tests.
- New current source and CI handoff: docs/v2-handoff/V2-R52-conditional-outside-official-cards.md and docs/v2-handoff/V2-R52-SAO-Q767-source-audit.md. Next review official TTG-1-067, SLG-1-021, MST-1-009 and other text candidates; retain rule blocks on MST-1-067, BLC-4-034, unaudited LIFE nesting and multi-target AP+hand costs.

### R52 full code-head Actions SUCCESS (2026-10-24)

- **Executed code SHA**: 36f67514a6de7e2f33edcf61ff3519022e36aa52.
- **GitHub Actions run**: https://github.com/will00t-debug/Ua/actions/runs/40044354789 ; event push, conclusion **SUCCESS**, Node.js 22 tests **2136/2136 PASS**, five-title matrix **60/60** (zero failures), independent literal manifest PASS and 700-source R35/R51/R52 dynamic censuses PASS.
- 5-title current registration: BLEACH 103, TTG 36, SLG 45, SAO 105, MST 54 = **343/700**; remaining **357**. R52 named-OUTSIDE text hits 34 require individual full print / FAQ reviews; no other card inferred READY.
- This SHA is the final R52 gameplay/test implementation before handoff-only documentation commits. After documentation pushes, confirm the exact *latest* PR HEAD GitHub Actions SUCCESS independently; older source green evidence cannot be substituted.

## R53 — 五方向一起納入，真卡來源與跨作品原語（2026-10-24）

- 延續 Draft PR #78／`gpt/v2-resume-20261022`，未合 main／未部署正式站／未修改 Cursor PR #77／未 force push。R52 起始 HEAD `2f8cd915` 的完整 Actions [40044586095](https://github.com/will00t-debug/Ua/actions/runs/40044586095) SUCCESS。
- **Batch A 官方來源與 FAQ 審核：** TTG-1-067 ヨーコ Q2295（ACTIVE 入場、高 BP 不可阻擋、登場給本回合狙擊和自身攻擊戰勝抽牌、ACTIVE LIFE）；SLG-1-021 水篠旬 Q2028（場外每5張攻擊 BP+500、戰勝後按張數回收、強制阻擋、RAID 和條件 IMPACT）；MST-1-009 エリス Q2147（自身效果登場二選一：跨回合 BP 或本回合攻擊結束交換、RAID/IMPACT）。三張都未全卡 READY，保持 PARTIAL。
- **Batch B 共用能力：** `countOwnOutsidePhysicalGroups`（只計自己 OUTSIDE 真實實體，floor(n/N)，不包含 opponent/under）與嚴格 `blockBpRestriction`（atLeast/atMost 當前 BP，或套 R51 官方來源指定名稱條件），目前是跨作品共用能力，**不等於** TTG/SLG/MST 完整移植。
- **Batch C 已完成真卡：** 官方 EX08BT/SAO-2-063 アスナ：綠3/AP1/BP3000/真實產能**3**/ALO/無 LIFE、STEP、OUTSIDE 〈ユウキ〉＋〈マザーズ・ロザリオ〉合計 2 張才於真正登場結算抽1。新增 `drawIfOwnOutsideNamedCountAtLeast` 原語、完整卡文 pin、registry、獨立 manifest、合法50張真卡 EVENT 付費來源正反測試與 AI／UID／STEP；沿用 R51 計數而非建立第二套。
- **Batch D 五作品全庫與 12 張 SAO 回查：** `scripts/v2-r53-five-direction-candidate-report.mjs` 從 R35 `capabilityIndex()` 使用當下 registry 完整查 700 張；官方 SAO-1-071 4／6／8 場外多門檻仍 PARTIAL；SAO-1-083、2-001、2-002、2-009、2-020、2-031、2-032、2-036、2-049、2-062 逐卡官方全文已比對，詳見 [R53 官方全文與阻塞表](./V2-R53-five-direction-official-audit.md)。保留 SOURCE/FAQ／多效果阻塞，不從關鍵字自動 READY。
- **Batch E 回歸與交接：** `db9920fc50d1108dac4572604f5abc601d55916b` 的 [GitHub Actions 40045611773](https://github.com/will00t-debug/Ua/actions/runs/40045611773) **Node22 2146/2146 PASS**、五作品 60/60、獨立 manifest PASS；正式登錄 **344／700**，未移植 **356**（BLEACH 103／TTG 36／SLG 45／SAO **106**／MST 54）。R52 檢索本輪新 33 筆文字候選，不直接視為 READY；逐張獨立 FAQ 全面認證仍 0。已新增 R53 稽核到既有 `.github/workflows/v2-resume.yml`，**最新提交仍須各自確認 Actions SUCCESS**。
- 下輪可安全延伸的核心原語：① TTG 暫時戰勝抽牌 + 狙擊合法選擇；② SLG 場外每五張的攻擊 BP/戰勝回收動態兩個消費者 + Q2028 強制 block；③ MST 來源限定二選一／Q2147 暫時攻擊結束交換；④ SAO-1-071 4／6／8 門檻複合效果；⑤ 官方核對後其他跨作品 READY 真卡整批移植。
- 繼續嚴格保留 MST-1-067 Q2162、BLC-4-034 裏向 Raid 底層、未認證巢狀 LIFE、混合多目標 AP/棄手支付阻塞。



## R54 | Five-title shared atom development, 2026-10-24

Same branch `gpt/v2-resume-20261022`, Draft PR #78 against Cursor integration branch only. Four initial independent source candidates: TTG-1-067/Q2295, SLG-1-021/Q2028, MST-1-009/Q2147, SAO-1-071. Full source review and limitations are in [V2-R54-five-direction-official-audit.md](./V2-R54-five-direction-official-audit.md).

R54 introduced source-stamped `onAttack` 0-or-1 named-OUTSIDE optional draw (`92af0774`, Actions [40047961290](https://github.com/will00t-debug/Ua/actions/runs/40047961290) SUCCESS); source pinned the four/six/eight cumulative SAO-1-071 Raid card (`d0468fa3`); and re-used R53 physical-group counter to grant attack-time `buffSelfPerOwnOutsideGroups` (`7c631931`). Registry includes SAO-1-071 only after strict printed pin and independent expected-ID manifest; TTG/SLG/MST above remain PARTIAL, no partial-card registrations.

Historic R54 intermediate CI failures were caused by a stale 106 SAO independent roster, the 1-AP fixture on first turn, an immutable reducer test that inspected stale actor rather than resulting physical state, and an opponent end-of-turn 8-hand pending choice. Fixes preserve all real payment and negative tests. Latest status MUST be checked against newest Actions SHA. R54 has repeatable `node scripts/v2-r54-five-title-candidate-report.mjs` census integrated into workflow. A text hit never sets READY.

Assuming the R54 SAO registration remains intact: inventory 345/700, 355 unported, BLEACH 103, TTG 36, SLG 45, SAO 107, MST 54. These are registration counts, not independent FAQ certification: 0/700. Remain on GPT Draft PR #78, do not merge/deploy, do not modify Cursor PR #77.


## GPT R55｜2026-10-24 SNIPER & 戰勝抽牌擴展

依前輪 R54 的永久約束：共用能力 → 五作品全部未移植卡來源搜尋 → 官方完整卡文 FAQ 查對 → READY/PARTIAL/REVIEW PENDING → 僅登錄整卡正式驗收者 → Node22 + 60 矩陣及獨立清單。

沿用 `gpt/v2-resume-20261022` 與 Draft PR #78，來源 [V2-R55-sniper-battle-official-audit.md](./V2-R55-sniper-battle-official-audit.md)。`2112b79a` 新增物理 UID/stamp 限期的狙擊合法指定角色攻擊與戰鬥判定，官方 Q65～Q70，無阻擋／不計 BLOCK；`11752289` 補上普通 BLOCK 戰勝抽牌；`ed62a591` 正式來源綁定 TTG-1-067、獨立 manifest、合法 50 張紅牌組及 AP2／ACTIVE LIFE 測試。新增 `scripts/v2-r55-sniper-battle-candidate-report.mjs` 與整庫驗收 workflow step。

R55 TTG-1-067 的最新 CI 必須對應實際最終 HEAD，不可挪用先前成功；若 CI 未成功應標為未驗收。登錄基準在無其他提交時為 BLEACH 103、TTG 37、SLG 45、SAO 107、MST 54，合計 346／700，尚未 354；全體獨立 FAQ 仍 0。BLC-4-044／SLG-1-022／SAO-1-097 屬文字候選，不因共用能力完成而算 READY。SLG-1-021、MST-1-009 仍 PARTIAL。

不合併 main、不部署正式站、不動 Cursor #77、不 force push。
