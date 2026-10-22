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
