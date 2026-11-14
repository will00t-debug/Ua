# UAPR/MHA-P 共用操作

三張點數兌換卡的卡圖、數值與卡文已在目錄。這一輪只補句子，沒有新的卡號分支。

## 交給 A 組的共用操作

- `handPlayBannedWhileOtherTrait`：角色、dsl。`trait` 與 `excludeName`。只擋手牌的普通登場。自己場上有該特徵、名字不是 `excludeName` 的正面角色時，不能從手牌普通登場。場外、手牌、蓋牌、被突襲蓋住的卡不算。移除區登場與效果登場不走這條。沒有印刷突襲的卡本來就不能突襲。
- `distinctNameBp`：角色、dsl。`trait`、`zones`（`field` 與／或 `outside`）、`per`（500 的倍數）、`turn`（`own`、`opponent`、`any`）。自己場上與指定區域裡，該特徵每個不同印刷卡名加一次 BP。同名只算一次。蓋牌與突襲下層不算。沉默後不加。
- `onRaided` 可以是 `{op:'replayOnPlay'}`。本體被蓋住後仍重放它自己的登場時。登場時裡不能再放 `replayOnPlay`。與突襲者登場時的先後，沿用既有 `raid-effect-order`。只有 TTG-1-045 的既有回合限制，這三張沒有。
- `optionalHandOutsideThen`：角色登場時。手牌至少 1 張才詢問。不支付就沒有後續。支付 1 張到場外後，才執行 `then`。這次的 `then` 是既有 `enemyBpDown`（`minBp`、`zone:'front'`、沒有 `optional`，所以有合格前線就必須選）。
- `tuckFacedownUnder` 的 `then` 可以是 `{op:'takeTopHandRestOutside',count:2,upTo:1,whenHost:'self'}`。只有蓋到來源自己下面才看牌。視窗裡的每一張都顯示，可以選 1 張進手牌，或一張都不拿。沒拿的放場外。原本只有 `op` 與 `count:2` 的句子仍是必須拿 1 張。

## 沿用、沒有改行為

- `impactNull`
- `emptyOwnFieldHandEnergyDiscount`（P-002 的［紫×2］是印刷能量 2 的數字，手牌且自己場上沒有卡時才減）
- `raid-effect-order`
- `enemyBpDown` 的 `minBp`

## 沒有做的卡

UA05NC/MHA-3 還沒有完整官方個人卡號。沒有登錄對戰卡，也沒有發明卡號。AP 仍是未登錄。

## 第二彈同一句解鎖的登場支付

`optionalExceptHandOutsideRest` 只放在角色登場時。`excludeName` 的手牌不能拿來付。付成才開既有場外休息登場，並允許有突襲名的對象。付不出就不問。沒有合格場外對象時，支付已經發生，選擇結束。

只有三種形狀：`hand:1`；`hand:1` 且 `payAp:1`（兩樣都要付）；`hand:2` 且 `orAp:1`（自己回合、AP 還能付時才可以改付 1 AP）。受益是 MHA-2-009、012、018。

MHA-2-022 沒有新操作。登場禁止用 `playBanOtherTrait`，移步用 `step`，三種以上不同卡名的 BP 用既有被動（`ownDistinctTraitNames`、`min:3`、`turn:'any'`、場上與場外）。
