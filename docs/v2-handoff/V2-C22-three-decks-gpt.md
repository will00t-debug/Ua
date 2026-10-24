# V2 C22｜三副指定 BLEACH 牌組交接

時間：2026-10-24 15:18（台北，UTC+8）

基準：`cd23cad1deb6d0b67abf8dd9a4ccb38516b42fc4` 的 Actions [40071544974](https://github.com/will00t-debug/Ua/actions/runs/40071544974) SUCCESS。本輪從該提交另開分支，沒有改 `dist/universal-v2/ai.mjs`，沒有合併 main，沒有部署。

本輪 HEAD 與它自己的 Actions 結果寫在文末。三副牌都還沒有完整可玩，不能拿其他 50 張牌組代替。

## 三副張數

資料：`dist/universal-v2/bleach-designated-decks.mjs`。版本 `user-2026-10-24`。每列保留來源編碼與 V2 cardId。`UA01DC/BLC-1-053`、`UA01DC/BLC-1-041` 在目錄裡沒有這個來源編碼；同號現有印刷是 UA08BT／UAPR，不能當成這兩張 DC 卡。

| 牌組 | 張數 | 卡號 | 已登錄卡號 | 已登錄張數 | 可完整對局 |
| --- | --- | --- | --- | --- | --- |
| 我拒絕（藍） | 50 | 13 | 4 | 16 | 否 |
| 白劍（綠） | 50 | 13 | 10 | 38 | 否 |
| 戀露（紫） | 50 | 14 | 4 | 12 | 否 |

已登錄的藍：`EX07BT/BLC-2-016`、`EX15BT/BLC-4-026`、`EX07BT/BLC-2-049`、`UA04NC/BLC-3-001`。

已登錄的綠：原本 6 種，加上 `UA04NC/BLC-3-008`、`EX07BT/BLC-2-069`、`EX15BT/BLC-4-070`、`EX07BT/BLC-2-073`。

已登錄的紫：`UA08BT/BLC-1-045`、`EX07BT/BLC-2-052`、`UA08BT/BLC-1-051`、`EX15BT/BLC-4-059`。

## 本輪登錄的整卡

官方頁以圖片 alt 還原圖示。中文目錄若和官方日文不一致，以官方日文為準。

- `UA04NC/BLC-3-008`：手牌需求能源減綠 1；不受 BP 減少；自己的回合、對方前線有 BP3500 以上時 BP+1000。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA04NC%2FBLC-3-008)
- `EX15BT/BLC-4-070`：Impact 無效，而且能阻擋時必須阻擋。多張都能擋時只在這些卡裡選。Q2339。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-070)
- `EX07BT/BLC-2-073`：退場對方前線 BP3000 以下；自己場上有更木劍八，或場外有草鹿八千流，上限改 5000。SPECIAL 觸發仍是沒有 BP 上限的退場。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-073)
- `EX07BT/BLC-2-069`：登場時，其他護廷十三隊至少 6 張才可棄 1 張手牌；棄了才可從場外回收最多 1 張日番谷冬獅郎。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-069)
- `UA04NC/BLC-3-001`：本回合第一次阻擋後轉為 Active；自己的回合，而且本回合自己把牌從手牌放到場外時 BP+1000。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA04NC%2FBLC-3-001)

## 共用原語

沒有用卡號硬編碼。

- `printedHandEnergyDiscount`：手牌上的需求能源減少，不改印刷能源。
- `bpDownImmune`：計算 BP 時略過減少；沉默後減少會回來。
- `mustBlock`：印刷的強制阻擋。Q2339 只在能擋的強制阻擋角色中選擇，不能改擋其他角色，也不能放棄。角色不能擋時，恢復一般阻擋。
- `retireOppFrontUnderBp.bonusOutsideName`：場上名稱或場外名稱，任一成立就用較高 BP 上限。
- `discardGate.when`：現場條件不成立時，不棄牌，也不跑後面的效果。
- `ownHandToOutsideThisTurn` 可以是 `turn:'own'`。`turn:'any'` 的舊卡不變。

## 仍未移植

精確原因在 `DESIGNATED_GAP_NOTES`。

藍還缺 9：`BLC-4-034`、`BLC-2-021`、`BLC-2-015`、`BLC-4-027`、`BLC-2-019`、`BLC-4-022`、`BLC-4-036`、`BLC-2-047`、`BLC-2-046`。

綠還缺 3：`BLC-4-060`、`BLC-2-067`、`BLC-1-085`。

紫還缺 10：`BLC-1-047`、`BLC-4-048`、`BLC-4-049`、`BLC-4-050`、`UA01DC/BLC-1-053`、`BLC-4-054`、`UA01DC/BLC-4-083`、`UA01DC/BLC-4-082`、`UA01DC/BLC-1-041`、`BLC-4-058`。

`BLC-2-047` 不能只做成抽 2。Q1033 要等來源的一護效果全部結束，才抽那張額外的 1。

## 預覽

`dist/universal-v2-preview.html` 列出三副的名稱、來源編碼、張數和已登錄或未移植。未完成的選項是停用的，文字是「不可完整對局」。現有可開局的牌組不是這三副。

## AI 要看的支付和連鎖

- `BLC-3-008` 的減費只在手牌。上場後印刷需求仍是 4。BP+1000 只在自己的回合，而且看的是對方前線的當前 BP。
- `BLC-4-070` 能擋時，合法選擇裡沒有「不阻擋」，也沒有其他非強制阻擋角色。Impact 無效只拿掉這次戰鬥對手的 Impact。
- `BLC-2-073` 的上限是「場上更木劍八」或「場外草鹿八千流」。兩個都沒有時，4000 BP 不能退。SPECIAL 觸發不受這個上限影響。
- `BLC-2-069` 少於 6 張其他護廷十三隊時，不能棄牌，也不能回收。棄牌可以拒絕；拒絕後不會回收。
- `BLC-3-001` 只有第一次阻擋會轉回 Active。手牌離場的 BP 只在自己的回合，而且要是自己把牌從手牌送到場外。

### effect-outside-name-rest

這組案例給 GPT 更新登場決策，不是本輪新原語。測試在 `tests/v2-c19-name-pay-outside-rest.test.mjs`。

可以登場：有準備好的 AP，場外有印刷名稱符合的角色，而且這個名稱本回合還沒用過。支付 1 AP 後，那張卡以 REST 登場。`BLC-2-043` 的案例是支付一次並把場外的同名卡放到場上。

應該拒絕：沒有準備好的 AP，或場外沒有符合名稱的卡，就不登場。玩家拒絕啟動時，名稱使用次數不消耗。玩家先啟動、再拒絕支付時，名稱使用次數已經消耗，之後同一名稱不能再登場。

## 測試入口

`tests/v2-c22-designated-decks.test.mjs` 用固定種子檢查三副清單、五張新卡的正反例，以及 UID。三副對打矩陣還沒有，因為三副都還有未登錄卡，引擎不會用無效果卡代替。

## 下一輪

優先做「這張卡因指定角色的效果從手牌送到場外」的共用觀察。藍牌的 `BLC-2-021`、`BLC-2-047`、`BLC-2-046`、`BLC-4-036`、`BLC-4-034` 都靠它。綠牌雖然只剩 3 種，但藍染移線、劍八的 Raid 替代、冬獅郎的升級 REST 彼此不共用一個小原語。

## 不可宣稱

- 三副都還不能完整對局。
- 沒有做三副彼此對打。
- 沒有把 UA08BT 的 `BLC-1-053`、`BLC-1-041` 當成 UA01DC。
- 新卡有官方原文和正反例，不是每張卡的全部 FAQ 認證。
- 登錄數增加不代表 276 張 BLEACH 都完成。

## 本輪提交

Manifest：BLEACH 138／276，五作品 390／700。

實作提交：`cc77210b6bc6e07e37b934b5cc219858e4b47afd`。Actions 必須跑推送後的分支 HEAD，不能沿用 40071544974。該次連結記在 PR。
