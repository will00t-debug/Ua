# V2 C20：己方場外移入移除區，滿額才結算後續

官方頁面（2026-10-24）：

- UA08BT/BLC-1-098 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-098
- UA08ST/BLC-1-106 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08ST%2FBLC-1-106
- Q575（2023-09-25）：場外只有 2 張時，可以把這 2 張放進移除區，但沒有達到印刷的 3 張，所以「そうした場合」的抽 2 張不發生。

## 共用原語 `removeOutsideThen`

只處理己方場外。必填欄位是 `count`（1–3）、`optional:true`、`cardType`（`character` 或 `any`）、`zone:'outside'`、`controller:'own'`，以及 1–3 個後續 `draw`、`millTop` 或 `buffSelf`。

- 可選卡為 0：不開選擇，不執行後續。
- 可選卡達到印刷張數：可跳過；選定的實體 UID 在最後一張時一次移入移除區，然後才執行後續。同一 UID 不能選兩次。選到一半不能改跳過。
- 可選卡少於印刷張數：只能跳過，或把目前全部可選卡移入移除區。後者不執行後續，也不能改選其中一部分。
- 移動使用 `moveOwnedLinear`，理由 `payment`。這不是角色退場，不產生 `onRetire`，也不記入退場歷史。

## 本批完整登錄

- BLC-1-098：己方場外 1 張角色，成功後抽 2。事件本身在結算時已在場外，角色篩選不會拿它支付。標準 DRAW。
- BLC-1-106：己方場外 3 張任意卡，成功後抽 2。Q575 的 2 張會移走且不抽牌。標準 GET。

五作品重掃後，沒有其他整張印刷都已支援的 BLEACH／MST 卡。BLC-1-041、047、050、104 仍有檢索、Raid、複數句子、BP 削減或 4 張支付，不登錄。

## GPT

新 pending `effect-remove-outside`。可選且尚未選定時，`legal[0]` 是 `mode:'skip'`。目前 AI 會落到第一個合法行動，因此不會支付。`mode:'all'` 是不足張數的全部移動，後面沒有抽牌。`mode:'pick'` 重複到印刷張數才抽牌。Cursor 不修改 `ai.mjs`。

嚴格全面 FAQ 認證仍是 0。
