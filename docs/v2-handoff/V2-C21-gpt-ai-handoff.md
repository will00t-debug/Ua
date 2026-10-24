# V2 C21 給 GPT 的 AI 交接

Cursor 沒有修改 `dist/universal-v2/ai.mjs`。以下是目前合法行動的順序，以及現有 AI 落到 `legal[0]` 時會做的選擇。整合只能在隔離 checkpoint 進行，不要覆蓋任一邊的獨立成果。

GPT 目前的 AI 分支基準是 368 張。請改對到這次 manifest：

| 時點 | BLEACH | MST | TTG | SLG | SAO | 合計 | 未移植 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GPT 舊基準 |  |  |  |  |  | 368 |  |
| C19 已驗收 `facb96c` | 124 | 56 | 38 | 46 | 111 | 375 | 325 |
| 本輪 `040efd8` | 133 | 57 | 38 | 46 | 111 | 385 | 315 |

嚴格全面 FAQ 認證仍是 0。

## 既有 pending

- `effect-optional-pay-ap`：`legal[0]` 是 `mode:'pay'`，其後才是 `skip`。現有 AI 會支付。支付成功後，C19 的 `effect-outside-name-rest` 仍可能被跳過。
- `effect-hand-rest-or-raid`：`legal[0]` 是 `uid:null` 的跳過。現有 AI 不登場。
- `effect-active-own-named`：`legal[0]` 是 `uid:null` 的跳過。
- `effect-outside-name-rest`：`legal[0]` 是 `uid:null` 的跳過。C19 已看到 AI 付完 1 AP 後跳過這次可選登場。
- `effect-once-choice`：`legal[0]` 是 `mode:'skip'`。

## 本輪新增

- `effect-remove-outside`：尚未選定且可跳過時，`legal[0]` 是 `mode:'skip'`。現有 AI 不支付。`mode:'all'` 只在可選張數少於印刷張數時出現，會移走全部可選卡，而且不抽牌。這是 Q575：場外 2 張、印刷要 3 張時可以移走 2 張，但不能抽 2 張，也不能把整段判成非法。`mode:'pick'` 要重複到印刷張數，最後一次才移動並抽牌。同一 UID 不能付兩次。
- `effect-choice-mode`：MST-1-007 的選項不是可跳過。`legal[0]` 是程式裡的第一個選項 `draw`。現有 AI 會抽 1 再棄 1。`deploy` 只在這張卡由自己的效果登場，且本回合還沒選過同名「エリス」的該效果時出現。付費登場看不到 `deploy`。選了 `deploy` 之後，同名的下一張即使也是自己的效果登場，也只剩 `draw`。希望 AI 在手牌有合法具名角色時改選 `deploy` 的話，請在 GPT 的 AI 分支處理，不要在這裡改。

## 戰鬥

一般阻擋仍是先 REST 阻擋者再比目前 BP。攻擊者較低時攻擊者退場，onRetire 在攻擊方回合結算，不扣生命。相等或較高時只退阻擋者。狙擊路徑沒有改。
