# UNION ARENA V2｜R42 共用跨區指定名稱免費登場、SLG028／030 完整官方卡文移植

日期：2026-10-23（台北時區）｜沿用 GPT Draft [PR #78](https://github.com/will00t-debug/Ua/pull/78)｜工作分支 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`。

> 不合 main、不修改 Cursor PR #77、不部署、不 force push。這份文件記錄真卡的**印刷效果與合法操作驗收**；全面獨立逐卡 FAQ 認證仍 **0**。測試成功只證明對應 SHA 的遠端檢查；不宣稱本地 clone／正式 UI／全 FAQ 認證。

## 官方完整來源

- [SLG-1-030 影の兵士](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-030)：紫色 CHARACTER、印刷需求能源 0、AP 1、BP1500、發生紫1、特徵「影の軍団」、DRAW LIFE、**牌組最多12張**。登場時，**己方場上其他**影の軍団存在才看牌庫頂2張；可將**最多1張**影の軍団（精確特徵）**或**〈水篠 旬〉（卡名）送場外；其他牌**依任意順序置於牌庫頂**。
- [SLG-1-028 イグリット](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-028)：紫色 CHARACTER、能源4、AP2、BP4000、發生紫1、特徵影の軍団、GET LIFE。**無條件 ACTIVE 登場**；登場時從**自己手牌或自己場外**，選最多1張卡名〈影の兵士〉，免費以 **REST** 登場己方場上。這個能力沒有印刷 AP／能源限制，不得自行追加。030 登場後執行自身 onPlay，己方的 028 正是「其他影の軍団」之一。

原來源 `dist/solo-leveling.mjs` 沒有自動移植，僅由 `dist/universal-v2/slg-pack.mjs` 官方驗證的 allowlist 登錄；來源與執行契約 `dist/universal-v2/title-packs/slg.mjs`，`audit/v2-c-slg-status.csv` 與獨立 manifest 同步更新。

## 批次與已通過的已知程式 CI

| 批次 | 相關提交 | 完整內容 |
|---|---|---|
| A | `b14fd9e4` | **沿用** `inspectTopTraitOutside`，只資料驅動擴充 `orName` 和 `requiresOtherOwnTrait`；在現有 TOP-N pending 中使用正確 UID、合法挑選、剩餘牌排頂。 |
| B | `d0a1c4d`、`23277fa`、`68b9589`、`ea2b38e` | 官方全文核對且註冊 SLG-1-030，獨立 manifest、12 張來源契約和嚴格 schema、測試證據 CSV，保持一般卡 4 張上限，只有印刷例外 12 張。 |
| C | `d00a2340` | 最小通用 `deployNamedFromZones`：資料驅動特定卡名＋可用 zone（hand/outside）＋指定 front/energy/any＋ACTIVE/REST；使用既有 `effectQueue`、`legalDestinations`、`commitDestination`、`recordCompletedMove`、`applyEffects(onPlay)`；**不再付一次 AP**。 |
| D | `c6baf7bc`、`3680ff59` | 最小 `enterAlwaysActive` 角色入場屬性、SLG-1-028 整張 GET／onPlay＋實際 030 連動、跨手牌或場外可選0或1、AP2 正常付款一次、另一張免費、實體 UID／新 stamp／合法50張牌組。 |
| E | `cfbe11c2`、`84839279` | 保存狀態的來源與篩選防偽；新 R42 五作品全庫重掃報告，重新使用既有 R35/R41 `capabilityIndex()`，分類全部當前未移植卡，避免平行資料庫。 |

已知 CI：
- Batch A <https://github.com/will00t-debug/Ua/actions/runs/39945024669> SUCCESS；
- Batch B 修正後 <https://github.com/will00t-debug/Ua/actions/runs/39946175840> SUCCESS；
- Batch C <https://github.com/will00t-debug/Ua/actions/runs/39946348220> SUCCESS；
- Batch D 修正後 <https://github.com/will00t-debug/Ua/actions/runs/39947064630> SUCCESS：Node22 **2003/2003**、**60/60** matrix、registry／manifest **332/700**；
- E 保存 pending 安全 <https://github.com/will00t-debug/Ua/actions/runs/39947235806> SUCCESS；
- E 全庫與此文件**必須另查最終 HEAD CI**，不得沿用前一個綠燈。

## 最新完整五作品登錄與全庫重掃

- **332/700** 登錄：BLEACH 98、TTG 36、SLG **45**（R42 +2）、SAO 99、MST 54；**368 張尚未移植**。
- R42 用已有來源庫 + `capabilityIndex` 掃完整700 ID，其中368尚未移植，重新盤點相互重疊的 **71個去重文字候選**：手牌登場30、場外回手32、ACTIVE手牌4、REST手牌16、保護4。字串命中不能當完整 READY。
- 原 R41 官方九張未移植候選，SLG-1-028 已正式移植，所以剩餘 **8 張已核對整卡**（7 PARTIAL、1 RULE BLOCKED）及其他 **63張 REVIEW PENDING**；**尚未證實其他完整 READY**，不以字串候選數宣稱已完成逐張審核。
- R42 全文額外審核 SLG-1-030 並正式驗收，非僅新增一張替代或 placeholder。maxCopies=12 印刷例外保留，正常 4 張不放寬到任意5～11張。

## 尚未登錄卡牌及下一輪優先

1. `SAO-2-068` 官方印刷 MAIN 同步支付 REST+棄1手牌+自身真退場，才免費 ACTIVE 登場印刷綠色、AP1、必要能源≤3 的〈アスナ〉並授予 BP+1000。本輪共用的名字／入場只支援其中一段；不能視為 READY。
2. `SAO-2-069` 必須先保留**己方＋對手攻擊階段結束真退場**、Raid、onPlay BP4000以下可選退場、onRetire 手上〈アスナ〉免費 REST、Raid LIFE 的全印刷時序；仍 PARTIAL。
3. `BLC-4-042` Q2323 指定〈涅骸部隊〉必須是卡名，不是特徵；三選一、TOP2、棄手2回收、真退場接 ACTIVE 能源區均尚未整卡完成。仍 PARTIAL。
4. `SAO-1-087` Q978／`SAO-2-064` Q1208：選取目標**額外棄手1**、受作用來源限制，後者不疊加；不能偽裝為 AP 加費或 `cannotBeChosenByOppEffect`。仍 PARTIAL。
5. `BLC-4-069` Q2337／Q2338 `attackEndDistinctOutsideNamesSwap`，須先核對 LIFE／Trigger 與來源 UID／攻擊結束交換順序。尚未新移植。
6. `MST-1-067` Q2162 與印刷卡文作用域矛盾、Raid底卡真正退場；保留 RULE BLOCKED；`BLC-4-034` 真退場與裏向底卡、未確認第二批巢狀 LIFE 持續封鎖。

下一輪最高優先不是一張特定卡，而是「多階段真正支付 MAIN 成本 → 專用印刷篩選的免費 ACTIVE／REST 入場 → 成功入場實體增益」可跨作品重用的**最小能力組合**。無官方依據時仍維持 PARTIAL。
