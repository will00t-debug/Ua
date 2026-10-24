# UNION ARENA V2｜R45 — 官方來源棄手選擇費用、攻擊結束卡名條件、三模式共用選擇

日期：2026-10-23。GPT Draft [PR #78](https://github.com/will00t-debug/Ua/pull/78)，分支 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`。不合 main／不部署／不覆寫 Cursor #77／不 force-push。

## 重要：本輪實作邊界，不得宣稱已完成整張卡

本輪完成**四張完整官方印刷審核 + 共用「計算／文法」層與正反例**；因真正的原子選擇付款、攻擊結束交換，以及涅マユリ三條分支仍有跨隊列／存檔語意待實作，**本輪 0 張新卡正式登錄**。

已登錄 **334/700**，未移植 **366**，全面獨立逐卡 FAQ 認證仍 **0**。BLEACH98 / TTG36 / SLG45 / SAO101 / MST54；歷史 R44 所有正式移植維持不變。不能把本輪純 eligibility / grammar test 當作 SAO-1-087、SAO-2-064、BLC-4-069、BLC-4-042 完整驗收。

## 官方卡頁、FAQ 及 source-scope 區分

詳見 [V2-R45-official-rulings.md](./V2-R45-official-rulings.md) 的完整原文核對、FAQ Q763/Q978/Q1208/Q2323/Q2337/Q2338 與語意差異矩陣。

- [UA15BT/SAO-1-087 キリト](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-087)：對手回合、**EVENT** 明示選自身 UID 時，選擇者自付棄手1張；另需己方*其他*角色攻守兩種戰鬥獲勝（Q763）→本回合 DAMAGE2、Raid、Impact1、MAIN Turn1 其他己方角色 BP+1000、RAID LIFE。
- [EX08BT/SAO-2-064 キリト](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-064)：來源位於 FRONT 時使己方所有〈アスナ〉受對手 **CHARACTER／EVENT** 效果明示選取需棄手1張；Q1208 同組多來源不疊加。DRAW LIFE。Trigger 不因牌面種類是 EVENT 就視為 EVENT 來源。
- [EX15BT/BLC-4-069 京楽 春水](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-069)：Q2337 攻擊結束（有戰鬥者在戰鬥結束／直擊則 LIFE Trigger check 完成後）；己方場外綠色 EVENT+FIELD **不同印刷卡名**合計至少4→可與己方 ENERGY 最多一角色交換位置；入場本回合下一張手牌［特徵：花天狂骨］使用 AP−1；Raid／RAID LIFE。Q2338 只保證不合格手牌使用不消耗折扣，不是換位時序裁定。
- [EX15BT/BLC-4-042 涅 マユリ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-042)：onPlay 必選三模式：TOP2 任意順序留牌頂／餘送場外、棄兩張手→回收精確〈涅 マユリ〉或〈涅 ネム〉、其他己方角色真退場→手牌精確印刷卡名藍色〈涅骸部隊〉 ACTIVE 登場 ENERGY；Q2323 卡名不是特徵，DRAW LIFE。

## 五批程式、測試與來源證據

| Batch | GitHub 提交 | **真正完成**／刻意不宣稱的部分 |
|---|---|---|
| A 官方語意 | `9b1b64f` | 四卡完整印刷／FAQ／選擇費與 AP 加價、選擇免疫區分；未修改實際戰鬥。 |
| B 附加棄手資格計算 | `ffa1f3f`、`cdc9d9b` | 新 `selection-hand-tax.mjs` 純函式 profile validation、Q978/Q1208來源／期間／FRONT／名字／非疊加／UID／手牌是否足夠／保守未知拒絕，9 synthetic tests。**未整合 reducer pending 實際棄手、存檔與 EVENT 強制預檢。** |
| C 五作品掃描 | `c253c3e`、`c72eacb` | 既有 `capabilityIndex()` + R44 official source inventory 全部366未移植回查；4 張本輪官方全印刷人工核對、47 張跨分類字詞候選；CI 納入 R45 scanner。字詞命中不是 READY。 |
| D 攻擊結束之場外判定原語 | `0a6ab51`、`4b1349c` | 共用 `countOwnOutsideDistinctPrintedNames` 真實來源方／顏色／卡種／印刷名字去重、5測試；**未**改攻擊結束／LIFE／換位事件，不登錄069。 |
| E 共用三選一語法 | `a182cae`、`66ee215` | 既有 `chooseOne` 嚴格由2擴至2–3個模式；維持每選項合法子原語驗證、實際50張合成牌組已付 AP／合法選項／抽牌／存檔與非法模式測試；**未**將042三個印刷效果完整組合、故不登錄。 |

以上是5個**開發與證據批次**，並非5張或5組卡牌皆已完整移植。

## CI （代碼批次最新確認）

提交 `66ee215b7d34eeaaae6e6a931a97e1debde80ba4` 的 [GitHub Actions 39978309934](https://github.com/will00t-debug/Ua/actions/runs/39978309934) **SUCCESS**：Node.js 22 `npm test` **2050/2050 PASS**；五作品矩陣 **60/60**；嚴格 manifest／R35–R45 掃描／未移植報告全部通過。完成本文件及其後續文件提交後，**必須重新核對新最終 HEAD 自身 Actions，不能直接借用此程式 SHA 成功。**

無本地 clone / Node22 測試或真實手機 UI 測試。本輪正式卡數未變，因此獨立 manifest 未改；不作假的卡牌驗收或虛增已登錄。

### 同一原語完成後全庫回查（來源索引，不是逐張人工全文驗收）

- 先前 R44：366 尚未移植；本輪 B 費用候選分析、C R45掃描、D 場外卡名原語、E 三模式原語之後仍為 **366**。
- 現有全目錄文句候選 **47 個不同卡號**（旗標分類可重疊）：selectionDiscardTax 2 / opponentEvent 2 / opponentCharacter 1 / opponentTurn 2 / namedSelectionGrant 7 / nonstack 1 / attackEnd 5 / distinctOutside 4 / topOrder 33 / conditionalRetire 1。
- 未移植全庫狀態：**360 REVIEW PENDING、5 PARTIAL、1 RULE BLOCKED**。本輪完全核對官方印刷 **4 張**（全是 PARTIAL）；**READY 0，安全整卡新增 0**。此 47 為語句比對，其他364多數仍未逐卡完整官方核對。

## R46 依安全與高重用價值排序

1. **選擇時額外棄手原子整合**：在既有 `legalUniversalActions` 中加入來源 UID 種類與可付款過濾；`effect-target` / `effect-target-many` / LIFE 既有 pending 原子付款、手牌物理UID確認且原因 payment 的 hand→outside 日誌、save resume 持續、AI共享合法候選。Q1119 強制 EVENT 必選目標在扣印刷AP前預檢；不建第二套 selector。若缺多目標／多種附加費官方裁定就 strict block。
2. **SAO-2-064 全印刷移植先行**：FRONT來源本身隨時授予自家 Asuna 的非疊加保護、嚴格官方名字比對、對手 CHARACTER/EVENT、DRAW LIFE、完整真牌與 source manifest；之後全庫366重新搜尋有多少 READY。
3. **SAO-1-087**：共用 other-own battle-won（攻擊≥／防守>）、當回合 DAMAGE2，搭配既有 Raid／Impact1／MAIN Turn1／RAID LIFE，整卡真規則驗收方可登錄。
4. **BLC-4-069**：先落實攻擊結束（與 attack-phase-end 有別！） after LIFE／block／Q2337、原場前排 SOURCE UID/stamp、FRONT↔ENERGY實體交換、避免偽造退場／入場、花天狂骨 next eligible hand AP−1 重用，安全再登錄。
5. **BLC-4-042**：補 TOP2 任意張排序牌頂／另一批真棄2回收／真退場後精確名字藍色 ACTIVE 登場 ENERGY；重用已完成三選一語法，完成整卡 THEN registry／manifest。
6. 持續 **MST-1-067 Q2162、BLC-4-034 Raid底層及第二批 nested LIFE** RULE BLOCKED；不可猜測、更不可減少測試掩飾問題。

**安全保證：** 仍在 Draft PR #78，沒有 merge main／部署 production／修改 Cursor PR #77／force push。每批的綠色 CI 只證實那些**已實作**的原語、正反例及既有回歸，絕不代表四張候選完成。

