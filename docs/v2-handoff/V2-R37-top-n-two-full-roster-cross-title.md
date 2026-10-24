# UNION ARENA V2 R37 — 共用 TOP-N 0..2、跨五作品官方真卡與下一輪原語

日期：2026-10-23。僅 GPT Draft PR #78，分支 `gpt/v2-resume-20261022`，base `cursor/v2-multi-retire-life-6ff5`。不合 main、不部署、不 force push、不改 Cursor #77。

## 核准基準與提交

- 開工前最新：`3ab678f6e727a574298cc5a5c46c99575c5b5f65`；該 SHA 的 Actions [39892462030](https://github.com/will00t-debug/Ua/actions/runs/39892462030) success。
- Batch A：`bf900df2341d906bf5ae243774ec8570123ccca1`，新增 `searchTopUpToTwoBottom`、私有選擇動作、原子 UID 與恢復驗證；`094a059e5dce2b1dc0bb12041a2098fd0bcdb693` 更新獨立嚴格 DSL 白名單。成功 [39894431870](https://github.com/will00t-debug/Ua/actions/runs/39894431870)。
- Batch B：`e3f04ec8c2bbf847c48e8f9bd9992004541917d8` 登錄 **SAO-1-031 / SAO-1-066**，`d918c1b2266e860d7800b3b94cc5eeefe41a1c8a` 逐卡更新原 fail-closed 基準。成功 [39894779965](https://github.com/will00t-debug/Ua/actions/runs/39894779965)。
- Batch C：`10354107b2c57bcf87d010c73f113cfcca1dd5bd`，`scripts/v2-r37-top-n-candidate-report.mjs` 五作品完整未移植集合分區比對、來源文字索引與分類，並列入 CI。成功 [39894944130](https://github.com/will00t-debug/Ua/actions/runs/39894944130)。
- Batch D-1：`2cb3d50a1b15d0735191d0032da92581aa9fead7` 重用 `frontEnergyPermission` 移植 **MST-1-080**，成功 [39895298761](https://github.com/will00t-debug/Ua/actions/runs/39895298761)。
- Batch D-2：`2475655410127869e6ca87d1250e0afbc43f5858` 移植 **MST-1-060** STEP / FRONT once MAIN / 抽棄 / FRONT grant。初始 CI 發現 MAIN 棄牌暫停時效果佇列缺少授予來源核對；`95a30319c24ee4f8b0653c277d30cad4c68c91fd` 增加只允許真實來源印刷能力的 queued grant 驗證。成功 [39895776980](https://github.com/will00t-debug/Ua/actions/runs/39895776980)：**Node 22 1922/1922、矩陣 60/60、manifest／ledger／unported／候選掃描 success**。
- Batch E：本文件與後續增強來源逐卡審核、LIFE／存檔負例，必須以其自身更新 HEAD 的 Actions 結果另行確認，不可沿用 D-2 的成功作憑據。

## 共用能力與四張新增真卡

- `searchTopUpToTwoBottom`：嚴格 count 1..5、max 2、rest bottom、名稱或特徵 filter、OR/AND、唯一實體 UID、0/1/2 手選、只揭露已選牌、剩餘按指定順序放底、牌庫短於 N 適用當前可看張數、保存/JSON/回放被竄改的候選或來源必拒絕。沿用 `searchTopOneBottomDiscard` 的既有檢視/排序/選擇基礎，不另建 queue。
- [SAO-1-031 官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-031)：黃 EVENT 能源3 AP1，TOP5：〈キリト〉 OR 〈アリス〉 OR 〈ユージオ〉最多 2，公開選中加入手牌，餘下指定排序放底，DRAW LIFE。
- [SAO-1-066 官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-066)：藍 EVENT 能源2 AP1，TOP4：［特徵 ALO］最多 2，公開選中加入手牌，餘下指定排序放底，DRAW LIFE。
- [MST-1-080 官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-080)：綠 EVENT 能源3 AP1，抽2，最多 1 個己方 FRONT［ラノア魔法大学］獲該回合 FRONT 發生能源，DRAW LIFE。
- [MST-1-060 官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-060)：綠角色能源3 AP1 BP2500 gen2，STEP，FRONT 起動 MAIN 每回合 1 次，抽1再送1手牌到場外，其後可讓其他己方 FRONT［ラノア魔法大学］獲當回合 FRONT 發生能源，GET LIFE。MAIN 不另收 AP，Turn1 以來源物理 UID 控制；跨玩家由同合法行動清單處理。
- 以上均入 source-pinned registry、獨立 manifest、局部獨立逐卡評審 ledger，並有真 50 張牌組與跨作品測試。**「完整印刷操作可運行／局部測試」≠「涵蓋全部適用官方 FAQ 的完整獨立認證」。**

## 全庫真實執行，不拿關鍵字當語意認證

- Batch C 於 320/700 時，來源 700 張、未移植 **380 張全部掃描**：關鍵字 TOP-N 候選 **64**（BLEACH29／TTG7／SLG11／SAO12／MST5），並用獨立來源/registry 集合防漏卡與重複。
- 64 候選完整分類清單：

  - `TWO_HAND_REVEAL` 2：SLG-1-059、SAO-2-056。
  - `ONE_HAND_REVEAL` 15：BLC-4-001、BLC-4-064、SLG-1-046、SLG-1-063、SAO-1-056、SAO-1-086、SAO-2-001、SAO-2-018、SAO-2-029、SAO-2-044、SAO-2-061、MST-1-028、MST-1-033、MST-1-049、MST-1-068。
  - `TOP_REARRANGE` 7：BLC-4-015、BLC-4-043、BLC-4-048、SLG-1-030、SLG-1-054、SAO-1-049、SAO-1-091。
  - `TOP_TO_OUTSIDE` 6：BLC-4-083、SLG-1-003、SLG-1-017、SAO-2-037、SAO-2-066、MST-1-014。
  - `TOP_OTHER` 34：BLC-1-022、BLC-1-028、BLC-1-038、BLC-1-041、BLC-1-046、BLC-1-060、BLC-1-061、BLC-1-063、BLC-1-070、BLC-1-095、BLC-2-011、BLC-2-015、BLC-2-032、BLC-2-035、BLC-2-050、BLC-2-058、BLC-2-060、BLC-3-010、BLC-4-002、BLC-4-030、BLC-4-042、BLC-4-066、BLC-4-082、TTG-1-012、TTG-1-044、TTG-1-055、TTG-1-076、TTG-1-017、TTG-1-026、TTG-1-054、SLG-1-011、SLG-1-034、SLG-1-044、SLG-1-075。

- **已按官方整卡核對但不能登錄**：
  1. [SAO-2-056](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-056)，PARTIAL：角色真退場可選、成功後才 TOP5 挑［プログレッシブ］最多兩張，缺 `optionalRetireOwnCharacterThenSearch` 與前置付款/來源時序；GET LIFE。
  2. [MST-1-049](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-049)，PARTIAL：退場己方 FIELD 後自身 ACTIVE，再 TOP4 無特徵角色或 FIELD 最多一張，缺條件式退場接續、無特徵複合篩選與不棄牌單張檢索；GET LIFE。
  3. [SLG-1-059](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-059)，PARTIAL：登場時可棄牌使自己 ACTIVE/BP+1000；攻擊時 TOP4［第四次架南島レイド］最多兩張，若入手下次不得 ACTIVE；GET LIFE／官方 Q2058。缺登場分支、攻擊觸發、取得牌數觸發單次 skip-next-ACTIVE。
- 其餘 61 張文字候選仍是 `REVIEW PENDING`，不聲稱官方完整逐卡審核。**本次 TOP-N 全庫搜尋沒有其他已完成全部印刷且逐卡核對合格的 READY 候選，正式批次增加的是 SAO2 張，另以既有 FRONT 原語增加 MST2 張。**

## 最新數字與認證區隔

| 系列 | 正式登錄 | 未移植 | 來源總張 |
|---|---:|---:|---:|
| BLEACH | 97 | 179 | 276 |
| TTG | 36 | 45 | 81 |
| SLG | 42 | 38 | 80 |
| SAO | 95 | 88 | 183 |
| MST | 52 | 28 | 80 |
| 合計 | **322** | **378** | **700** |

R35 獨立完整官方 FAQ 認證目前 **0**；有 **10 張局部獨立來源/效果審核**（原 6 + 本輪 4），皆須依後續 FAQ、混合功能、原子中斷與恢復完整覆蓋後才有可能改 `certified`。不能混淆「局部測試通過」與「全官方 FAQ 認證完成」。

## 下一輪共用原語優先建議（不是字頻排序）

1. `printedEnergyAtMostFilter`：BLC-1-070／MST-1-031 跨作品印刷產能條件；兩張仍缺其他語意，不能原語做好就登錄。
2. `cannotBeChosenByOppEffect`：SAO-2-058／MST-1-067，官方 [Q1206](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-058) / [Q2162](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-067)，需與「選目標 AP 加價」嚴格區分；MST-067 還有 RAID／退場時 RAID base 分支。
3. `topNOptionalSingleNoDiscard`：15 張單張手牌檢索候選需逐卡再核對是否有額外條件與不同餘牌去向，不推定可直接 READY。
4. `optionalRetireThenProgram`（嚴格區分 own CHARACTER / own FIELD、前置真正退場與 AFTER）：SAO-2-056／MST-1-049，必須保留支付、效果中斷與 UID 來源時序。
5. `attackEndDistinctOutsideNamesSwap`：BLC-4-069 [官方 Q2337／Q2338](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-069)。高風險：攻擊/戰鬥結束、非戰鬥傷害的 LIFE/Trigger 後時機、場外 green EVENT+FIELD 四種不同名字與 FRONT/ENERGY 實體位置交換，絕不對既有戰鬥核心做未驗證改寫。

下輪新增任何能力，必須重新跑最新 `capabilityIndex()` 與 `node scripts/v2-r37-top-n-candidate-report.mjs`，再次從五作品全庫查找完整卡文對應候選並做真正整卡批次驗收。測試：Node22 `npm test`、`node scripts/v2-integrated-match-matrix.mjs`、`node scripts/v2-card-certification-report.mjs`、`node scripts/v2-r35-unported-atom-audit.mjs`、`node scripts/v2-assert-independent-manifest.mjs`、`node scripts/v2-unported-report.mjs`。

**安全紅線不變**：BLC-4-034 退場費用/裏向卡回收次序、未裁定巢狀 LIFE 繼續 fail closed，不合 main、不部署正式 Vercel、不改 PR #77、不 force push、不覆蓋其他 Agent。