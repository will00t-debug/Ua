# 〈物語〉系列 Vol.2 / EX18BT 目錄

日期：2026-11-21（台北時間）。這是目錄與第一批共通引擎登錄，不是官方 FAQ 認證。通過這裡的測試也不等於全卡已經可以對戰。

## 範圍

- 官方日文卡表 series `570218`，產品 `EX18BT`，上市日 2026-11-27。
- 身份是 `MGS-2-001` 到 `MGS-2-073`，共 73 張。產品頁的 SR12+R12+U26+C25=75 不是身份數。
- 11 張 AP 不是構築卡，沒有放進目錄。
- `EX18BT/MGS-1-028_p1` 與 `EX18BT/MGS-1-064_p2` 是第一彈同一身份的平行卡，記在 `MGS-1-028` 與 `MGS-1-064` 的 printings，不是新卡。官方圖檔仍是 coming soon。
- 繁中系列 `590218` 尚未公開。`name` 與 `effect` 重複官方日文印刷，`effectJa` 是去掉空白後的日文，引擎只比對這段。Rugia HK 只用來切 `span.raidBorder`，不當作官方繁中。

目錄在 `dist/mgs-vol2.mjs`。抓取腳本是 `scripts/fetch-mgs-ex18.mjs`。分類器是 `dist/universal-v2/mgs2-classify.mjs`。共通包 `createMgsV2Pack` 同時收第一彈已登錄卡與本彈 `engineKind` 非空的卡。沒有 `"op":"mgs"`，`mgs` 不在 `V2_TITLE_IDS`，`title.playable` 維持 false。

## 已登錄 50 張

整段日文對上既有共通程式的 10 張：`MGS-2-009`、`025`、`028`、`039`、`045`、`050`、`058`、`061`、`063`、`073`。

這次新接上既有狀態轉移的 8 張：

| 卡 | 印刷 | 狀態轉移 |
| --- | --- | --- |
| MGS-2-002 | 場上有〈千石撫子〉才抽 1 | `drawIfOwnName` |
| MGS-2-014 | 衝擊無效，場上有〈キスショット・アセロラオリオン・ハートアンダーブレード〉才抽 1 | `impactNull` + `drawIfOwnName` |
| MGS-2-030 / 044 | 自己場上沒有卡時，手牌這張減【綠×2】 | `emptyOwnFieldHandEnergyDiscount` |
| MGS-2-038 | 衝擊無效，退場抽 1 再放 1 張手牌到場外 | `impactNull` + `drawDiscard` |
| MGS-2-040 | 退場時自己場上 1 張角色本回合 BP+1000 | `buffOwnField` |
| MGS-2-051 | 登場時手牌 1 張綠、AP 1、必要能量 2 以下的角色休息登場 | `deployOwnHandRest` |
| MGS-2-052 | 看牌組上 3 張，必要能量 3 以下的角色最多 1 張入手，其餘放牌組下 | `searchTopOneBottomDiscard` |

`MGS-2-052` 的視窗保留全部看過的卡。不能選的卡留在畫面上，對手看不到這扇視窗。`MGS-2-002` 的發生能量是 alt 文字「黃黃」的 2 點，圖檔檔名裡的 3 是圖示編號。

第二批再登錄 25 張。整段日文對上一個共通狀態轉移，沒有只翻自動支援旗標：

| 卡 | 印刷 | 狀態轉移 |
| --- | --- | --- |
| MGS-2-003 | 衝擊無效；自己回合場上或場外有〈ご神体〉才 BP+1000 | `impactNull` + `ownNameInFieldOrOutside` |
| MGS-2-004 | 有【ステップ】；自己的〈蛇切縄〉本回合退場才 BP+1000 | `step` + `ownNameLeftThisTurn` |
| MGS-2-006 | 自己角色攻擊並戰鬥敗北的攻擊結束時，可休息自己，讓另一張火姊 BP+1000 | `battleLossRestBuff` |
| MGS-2-007 | 可把 1 張手牌放場外，之後看牌組上 1 張放到上或下，再抽 1 | `optionalHandOutsideThen` |
| MGS-2-008 | 攻擊時可讓另一張火姊 BP+1000；本回合另有角色戰鬥敗北則自己也 +1000 | `buffOwnField` + `ownOtherLostBattleThisTurn` |
| MGS-2-010 | 衝擊無效；自己攻擊階段結束時可移到前線，前線滿員先依規則移除 1 張 | `mayMoveSelfToFront` |
| MGS-2-013 | 退場抽 1 再放 1 張手牌到場外；自己回合才把能量 0 的紫〈阿良々木暦〉休息登場 | `drawDiscard` + `deployOwnHandRest` |
| MGS-2-016 | 登場在能量線時變為主動；休息後指定 BP 5000 以上的對手前線 BP-1000 | `activeSelfIf` + `restSelfThen` |
| MGS-2-018 | 場上有吻擊或〈忍野忍〉才變為主動；退場從場外回收〈妖刀心渡〉 | `activeSelfIf` + `recoverOutsideNamedEnergy` |
| MGS-2-019 | 本回合自己效果把〈羽川翼〉從牌組加入手牌時，改為只抽 1 | `ownEffectDeckToHandByName` |
| MGS-2-021 | 看牌組上，每 2 張場上〈羽川翼〉多看 1 張，最多 1 張留在上面 | `inspectTopArrange` |
| MGS-2-029 | 場上有未突擊的持有【レイド】角色時才 BP+500 並獲得【ステップ】 | `ownUnraidedRaidCharacter` |
| MGS-2-033 | 看牌組上 2 張，最多 1 張進移除區，其餘留在上面 | `inspectTopArrange` |
| MGS-2-041 | 前線同時有必要能量 2 與 3 的角色才 BP+1000 | `ownFrontPrintedEnergies` |
| MGS-2-042 | 上述條件成立時，BP 4000 以上的角色不能阻擋；攻擊時抽 1 再棄 1 | `blockBpRestriction` + `drawDiscard` |
| MGS-2-043 | 登場可讓最多 3 張必要能量 3 以下的角色 BP+500；前線有 1 與 3 才給 1 次衝擊 | `buffOwnField` + `grantChosenImpact` |
| MGS-2-047 | 自己回合前線有 1 與 3 才 BP+1000；自己效果登場才抽 1。顏色觸發是從手牌主動登場 | `selfEnteredByOwnEffect` + `deployHandCharacter` |
| MGS-2-049 | 只能登場到已有〈斧乃木余接〉的線，不能移動；登場休息出〈斧乃木余接〉，場上有另一張才主動並 BP+3000 | `playOnNamedLine` + `cannotMove` |
| MGS-2-057 | 退場上限 3000；場上有〈老倉育〉時上限改為 5000 | `retireOppFrontOneUnderBp` |
| MGS-2-059 | 基礎上限 2000，自己前線每張必要能量 1、2 或 3 的角色再 +1000 | `frontEnergyRaise` |
| MGS-2-065 | 場外 9 張以下時能量 -1、BP-1000；結算後能量仍至少 1 才衝擊無效 | `outsideAtMost` + `selfLiveEnergyAtLeast` |
| MGS-2-066 | 場外 9 張以下時能量 -3、BP-500；結算後能量仍至少 1 才回收〈阿良々木暦〉 | `outsideAtMost` + `selfLiveEnergyAtLeast` |
| MGS-2-069 | 自己場上沒有角色時手牌減【赤×2】；看牌組上 1 張，可放回上面或進移除區 | `emptyOwnFieldHandEnergyDiscount` + `peekTopOrRemoved` |
| MGS-2-070 | 被自己的效果移到移除區時，可從場外回收能量 2 以下的〈八九寺真宵〉 | `removedByOwnEffect` |
| MGS-2-072 | 看牌組上 5 張，能量 2 以下的〈神原駿河〉、〈沼地蠟花〉或事件最多 1 張入手，再休息登場能量 1 以下的紅〈神原駿河〉 | `searchTopOneBottomDiscard` + `deployOwnHandRest` |

`MGS-2-010` 在滿員前線移除的卡是規則移除，不會觸發 `MGS-2-070`。`MGS-2-069` 把牌組上的卡送進移除區是自己的效果，會觸發。`MGS-2-021`、`033`、`069`、`072` 的視窗都保留不能選的卡，對手看不到。`MGS-2-047` 的付費登場不是「自己的效果登場」，顏色觸發的手牌登場也不是。`MGS-2-049` 滿員時可以選擇把線上的〈斧乃木余接〉本身依規則移除。

第三批再登錄 7 張。新能力都是共通狀態轉移，沒有只翻自動支援旗標，也沒有登錄半段印刷：

| 卡 | 印刷 | 狀態轉移 |
| --- | --- | --- |
| MGS-2-020 | 在能量線休息，把自己放到牌組上，再從場外休息登場能量 0 的紫〈羽川翼〉 | `energyRestDeckDeploy` |
| MGS-2-034 | 看牌組上 1 張，放回上面或進移除區；休息後把場外 1 張最終觸發移到移除區，自己與對手各看自己牌組上 1 張並放到上或下 | `peekTopOrRemoved` + `restFinalPeek` |
| MGS-2-035 | 登場在能量線時變為主動；與 034 相同的最終觸發起動，而且是這張卡登場的回合才再抽 1。顏色觸發是既有的綠手牌登場 | `activeSelfIf` + `restFinalPeek` |
| MGS-2-046 | 【ステップ】與衝擊無效；能量線每回合 1 次，前線同時有必要能量 1 與 3 才移到前線並 BP+1000。前線滿員時必須依規則移除 1 張，不能跳過 | `energyPairMoveFront` |
| MGS-2-053 | 突擊框內：自己回合前線同時有必要能量 1 與 2 才 BP+500；登場時手牌 1 張綠、AP 1、必要能量 3 以下的角色休息登場。普通登場不發動 | `passive` + `deployOwnHandRest` |
| MGS-2-054 | 前線同時有 1 與 2 才變為主動，〈八九寺真宵〉的這個登場效果每回合只發動 1 次；攻擊時能量 3 以下最多 1 張 BP+500，符合上述條件可先放 1 張手牌到場外，改為最多 3 張 | `activeSelfIf` + `pairHandBuff` |
| MGS-2-055 | 休息並退場，從場外把能量正好 2 的綠〈斧乃木余接〉主動登場到能量線 | `fieldRestRetireDeploy` |

`MGS-2-034` 與 `035` 的兩次看牌都只有該玩家自己看得到。`MGS-2-046` 規則移除不會觸發 `MGS-2-070`。`MGS-2-054` 條件不成立時不消耗那一次登場。`MGS-2-053` 的 Rugia HK `span.raidBorder` 包住自己回合 BP 與登場手牌休息；突擊許可那一行沒有算進框內關鍵字。

其餘 23 張 `engineKind` 是 null：6 張突擊框，以及 17 張整段印刷還有尚未做成共通狀態轉移的能力。牌組編輯器看得到，對戰包沒有它們，含有它們的牌組不能開局。這 17 張沒有登錄半段效果。

## 這一批刻意沒有登錄的突擊框

Rugia HK 有突擊框的是 `MGS-2-005`、`011`、`023`、`026`、`032`、`037`、`053`。`053` 的框內關鍵字已列入 `dist/universal-v2/raid-box.mjs`。其餘 6 張的框內文字還沒拆完，未列入的框會在普通登場時發動，所以維持目錄卡，不進對戰包。

## 267 筆不要再犯

- 看牌、抽牌組上、磨牌的視窗包含不能選的卡，而且不是公開情報。
- 突擊框文字只在那張實體卡是正面突擊時才算，而且先列入 `raid-box.mjs`。
- 發生能量讀 alt 文字的點數。檔名數字不是點數。尾端 `+` 是記號。
- 必要能量的橫線是 0，第 1 回合仍可打出。
- 從手牌打出的角色記下 `entryTurn`，進場用共通格子。
- 沒有作品 opcode，不進舊對戰 runtime，不發明官方標誌。

官方 EX18BT Q&A 是 Q2465–Q2496，更新日 2026-11-20。這份文件沒有把它們當成認證。
