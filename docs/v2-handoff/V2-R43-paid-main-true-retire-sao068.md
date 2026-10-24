# UNION ARENA V2｜R43 — 真成本 MAIN → 真退場 → 指定手牌免費 ACTIVE、SAO-2-068 全文認證與全庫重新盤點

日期：2026-10-23｜[GPT Draft PR #78](https://github.com/will00t-debug/Ua/pull/78)｜分支 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`（不合 main、不覆蓋 Cursor #77、不部署、不 force push）。

## 官方原文（來源與完整效果）
- [EX08BT/SAO-2-068 ユウキ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-068)：**緑2／AP1／BP2000／発生緑1／ALO CHARACTER／ACTIVE LIFE**。
  - 主階段【レストにする】【手札を1枚場外に置く】【このカードを退場させる】三項**真成本依序完成**，才可從**自己目前手牌**選最多一張印刷必要能源≤3、印刷AP1、綠色、卡名〈アスナ〉免費 ACTIVE 登場己方場上；**成功入場者當回合 BP+1000**，未選或非法不授予。對原先手牌內是否已存在〈アスナ〉不追加效果前提。
  - ACTIVE LIFE 是獨立入口：選己方場上一張角色 ACTIVE，當回合 BP+3000，不支付上述 MAIN 成本。
- [EX08BT/SAO-2-069 ユウキ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-069)：**綠4／AP1／BP4000／ALO／Raid〈ユウキ〉**，進攻階段結束**己方與對手**皆要真退場；入場可選對手 FRONT BP4000以下退場最多一張；退場時從手牌綠色、必要能源≤3、AP1〈アスナ〉最多一張免費 REST 登場；Raid LIFE 有回手與符合能源的 Raid 二選一。**當前仍 PARTIAL，不可登錄**。不拿 068 既有 MAIN 成本替代 069 的 Raid／onRetire／phase-end 規則。

## 完整五批驗收／提交
| Batch | Commit | 可獨立驗收成果 |
|---|---|---|
| A | `30968faee2a2bf940c4a358fc83aceb09b21bc9c` | 在 R42 同一 `deployNamedFromZones` 加上印刷顏色／AP／能源篩選與成功 UID 當回合 BP；原本 SLG-028 不帶篩選保持不變；對 forged pending fail closed。 |
| B | `d8d64e40f3ad1315922261ec986d489ff82aad8c` | 共用 `restDiscardRetireThen`；嚴格從手牌合法 UID 支付，REST→hand→outside 真支付→field→outside 真退場→原佇列 continuation；onRetire 優先於繼續效果；不多扣 AP。 |
| C | `2b7eaacb87df525b31bb8c6ebdb7902161fc6cf9` | 官方原文 pin SAO-2-068、註冊完整 main+ACTIVE LIFE、獨立 manifest、正常和無合法 Asuna 負面測試、真實 UID、多人 AI、JSON。更新歷史 R41/R42 未移植名單的預期。 |
| D | `42b1341189f7a542d3766d5ad9147f12656b2fd6` | 既有 `capabilityIndex` 全庫來源回掃、獨立官方 SAO-2-069 未滿足原子分類、MST Q2162 繼續 RULE BLOCKED、另補 SAO-2-068 ACTIVE LIFE 真行動測試；增加 CI 專用 R43 掃描。 |
| E | 本交接提交 | 將本輪源證據／執行與後續優先序寫入三份交接，必須依**最終 HEAD 本身** GitHub Actions 驗收。 |

**已知 CI：** Batch A [39950145957](https://github.com/will00t-debug/Ua/actions/runs/39950145957) SUCCESS，Batch B [39950677505](https://github.com/will00t-debug/Ua/actions/runs/39950677505) SUCCESS，Batch C [39951145269](https://github.com/will00t-debug/Ua/actions/runs/39951145269) SUCCESS。Batch D 與 Batch E 不得繼承舊綠燈，需核對新程式 SHA。僅遠端 Node.js22 CI，**未跑本地 clone／實機 UI／正式站**。

## 全庫盤點（R43，依最新完整 Actions 輸出值為準）
- 五作品官方來源總 **700張**，SAO-2-068 已完整正式登錄：本輪起始 **332/700→333/700**；當前 **367 張**未移植；BLEACH98、TTG36、SLG45、SAO100、MST54。全面獨立逐卡 FAQ Certified 仍 **0**。
- 用已存在 `capabilityIndex`、`v2AllTitleInventory` 和 R42 文字候選重新搜尋五作品所有**當時未移植**卡；不建立平行卡資料庫，也不將字串命中直接視作 READY。R43 自動掃描與已審核卡分類，實際候選數以 `scripts/v2-r43-main-cost-unported-report.mjs` 在最後一個 HEAD 的 Actions 報告為準。
- 以前 R41 完整核對的 9 張候選，SLG-1-028 在 R42 移植、SAO-2-068 在 R43 移植；**當前尚未移植的該組官方已審卡 7 張**（SAO-2-069、SAO-1-028、SAO-1-087、SAO-2-064、BLC-4-042、BLC-4-036 是 PARTIAL；MST-1-067 Q2162 是 RULE BLOCKED）。其餘字串候選繼續 REVIEW PENDING，不聲稱全部逐卡審核。

## R44 最高價值下一批工作
1. **SAO-2-069 真退場 phase-end＋來源 onRetire**：先核對官方印刷 Raid／攻擊階段己方+對手真退場、BP4000以下選擇、Raid LIFE，按原有 `queuePhaseBoundary`、`queueRetirement`、`retire` 以及本輪印刷候選組合，不重做第二效果隊列。
2. **複合成本原語回用**：全庫候選中只有已完成印刷全部效果的卡才可驗收並批次註冊；SAO-2-069 不能只因 hand REST 免費登場已能表達便直接註冊。
3. **BLC-4-042 三選一**：印刷名稱〈涅骸部隊〉不是特徵，Q2323，不合成只有 TOP2 子效果的完整卡。
4. **來源限定棄手一張的合法選擇成本**：SAO-1-087 Q978 與 SAO-2-064 Q1208 不疊加／來源 CHARACTER/EVENT 差異；不轉成 AP 加價或免疫。
5. **BLC-4-069 攻擊結束來源場外交換**：Q2337/Q2338 及 LIFE／Trigger 先逐字核對。MST-1-067 官方印刷與 Q2162 來源矛盾，以及 BLC-4-034 多層 Raid 與第二批未核實巢狀 LIFE，繼續 RULE BLOCKED。

維持既有安全原則：獨立 manifest、真實卡文、合法 50 張牌組、Human/Normal/Hard 同一合法來源、雙人隱藏資訊、完整來源 UID+fieldEntryStamp、Node22/npm test＋五作品 60 局矩陣、嚴格非法動作原子性、CI 僅認最新程式 SHA；不可為衝卡數登錄部分印刷。
