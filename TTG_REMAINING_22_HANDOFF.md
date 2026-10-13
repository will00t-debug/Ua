# 天元突破 UA56BT：剩餘 22 張（TTG-1-060～081）三張一批更新交接
更新日期：2026-10-13／作業分支：`feature/ttg-red-3card-batches-20261013`／草稿 PR #18。

> **嚴格定義：已建立 22/22 判定程式／規則檢查或有既有實作，並不代表 22/22 已能在網站正式自動對戰。**
> 除非所有 Life RAID、跨卡結算、玩家 UI 及 AI 雙人 50 張牌組完整對局均完成，`auto:false`／作品 `playable:false` 不得翻成 true；**不合 main、不部署正式站**。
> 一般卡僅有 81 種；不收異圖、活動限定 AP 圖卡。

## 八批狀態

| 批次 | 編號 | 本輪提供的執行判定 | 尚未完全解鎖的部分 |
|---|---|---|---|
| 1 | 060～062 | 060 西蒙在前線時動態紅能源+1；061 Q2293/2294 不重複選兩個登場效果、強制先回收後 ACTIVE 登場；062 西蒙登場再發動候選、REST/BP/棄手牌後 ACTIVE | 061 從手牌登場的西蒙，及 062 被重複發動登場效果，需重新接上所有不同西蒙印刷入場 resolver／後續選擇 UI；**061/062 未放完整對局白名單** |
| 2 | 063～065 | 063 REST 加能源且主階段結束退場，修正再度 ACTIVE 不得同回合重新發動；064 DRAW 普通角色；065 STEP 由前線轉能源線，REST 不自動轉 ACTIVE | 跨 Raid 特殊時點仍需驗證 |
| 3 | 066～068 | 066 ACTIVE 時動態能源+1；067 AP2，ACTIVE 登場、4000BP 以上不得阻擋、登場回合狙擊及戰鬥勝利抽牌；068 己方本回合 Raid 數量 BP、棄手牌後可從能源線攻擊，Q2297 同名每回合一次及最多四次攻擊 | 067/068 與其他特殊攻擊/阻擋互動需進一步真實 UI 測試 |
| 4 | 069～071 | 069 REST 並退場，從場外回收 Gunmen、UID 守恆；070 無 Kamina 時可作特定 Raid 底板的獨立裁定；071 既有實體 Kittan DX 突襲、第一次攻擊 +2000/Impact null 判定 | 070 替代 Raid 底板未接所有 072/073；071 生命 RAID Trigger 尚未加入完整對局 |
| 5 | 072～074 | 072 實體 AP1 Raid 卡米那、登場抽牌與 BP<=3000 敵人 REST；073 要同時西蒙/卡米那、上一 Raid 頂裏向保留、登場退場 BP<=5000、下方裏向卡替代離場（獨立 reducer）；074 有妮亞、舊 Raid 頂裏向、登場抽牌及牌庫<=20/<=5 加成；045 與 Raid 登場時序提供獨立佇列 | 高階鏈 Raid + 073 離場替代及生命 RAID Trigger 尚需正式核心、生命傷害多 Trigger/玩家 UI 串接；**072～074 不在完整對局白名單** |
| 6 | 075～077 | 075 Gunmen 數量限制不同選項、BP/Impact 無效/雙阻擋／到期；076 實體 Raid 西蒙、查頂二選一／REST 抽棄與 UID 守恆、支持 080 零 AP 折扣；077 能源線場域 AP1 登場回收 Gunmen | 076 生命 RAID Trigger 尚未接完整對局；075、077 已進限制核心 |
| 7 | 078～080 | 078/079 既有 AP 卡最多 2 張回復及 FINAL 生命 Trigger；080 Q2300 Kamina 條件與場外拉甘／紅蓮／紅蓮螺巖回收，下一張合格手牌 Raid AP-1，非合格卡不能消耗此折扣，到回合結束消失 | 080 折扣已可作用 072～074／076 獨立 Raider，但尚需全量生命與連鎖對局測試 |
| 8 | 081 | 現有 Q2301 勘誤前線限定正常事件退場，BP3000/5000 條件及 SPECIAL 生命 Trigger 獨立；修正卡片實體未存 BP 時改讀印刷 BP | 全系列實戰整合 |

## 代碼與測試

- 判定模組：`dist/ttg-red-seventh-three.mjs`～`dist/ttg-red-thirteenth-three.mjs`（060～080）；081 沿用 `dist/ttg-actions.mjs`、`dist/ttg-event-resolver.mjs`、`dist/ttg-triggers.mjs`。
- 接入限制核心：`dist/ttg-rule-adapter.mjs`、`dist/ttg-core-match.mjs`、`dist/ttg-energy-snapshot.mjs`、`dist/ttg-pending-rules.mjs`。
- 測試：`tests/ttg-red-seventh-three.test.mjs`、`ttg-red-eighth-three.test.mjs`、`ttg-red-ninth-three.test.mjs`、`ttg-red-tenth-eleventh.test.mjs`、`ttg-red-twelfth-three.test.mjs`、`ttg-red-final-events.test.mjs`、`ttg-red-completion-smoke.test.mjs`。
- 單元／限制子集 AI 測試均經 feature-only `.github/workflows/ttg-red-feature-check.yml` 跑 `npm test`。以 **最新該分支 CI** 為準；勿誤把先前其他提交的成功當作最新完成。
- 官方資料：`https://www.unionarena-tcg.com/jp/cardlist/` 與 061 Q2293/2294、067 Q2295、068 Q2296/Q2297、073 Q2298、074 Q2299、080 Q2300、081 Q2301。

## 真正仍待完成的整合作業

1. 補全 061／062 的任意合格西蒙登場效果重複觸發與前一選項恢復次序，維持全場 UID 與非公開區域隱私。
2. 把紅色 071～074、076 Raid 及其生命 RAID Trigger 連回完整傷害時點，073 離場代替交戰/事件的替代效果，070 替代 Raid 底板與 045 觸發排序，並補 056 戰鬥結束後 Raid。
3. 繼續跨卡牌組／與 BLEACH 等系列隔離回歸，以及正式人類選擇目標/宣告能力/排列牌庫底等操作 UI。
4. **在全部未驗證的角落裁定之前**，作品 `playable:false`、卡 `auto:false` 不解鎖。PR #18 維持 draft、不合 main、不部署。
