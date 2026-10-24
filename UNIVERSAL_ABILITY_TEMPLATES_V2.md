# UNION ARENA V2 — 可重複使用的能力模板（第一至第六批）

**狀態：實驗版 / PR #70 / 不取代正式站。** 模板將每張卡片明確宣告的印刷效果轉譯為已存在的 V2 DSL 指令，**不**根據日文文字自動猜測能力，也**不**把尚未驗收的卡片標為可用。

## 檔案與資料流

- `dist/universal-v2/ability-templates.mjs`：受控的 25 種命名模板、嚴格參數契約，以及 `expandAbilityTemplates`。
- `dist/universal-v2/pack.mjs`：在 `createUniversalPack` 中編譯 `templateEffects`，沿用 `verifyProgram` 及現有時點限制；輸出仍是舊格式 `effects`，引擎 / AI 不需要知道卡片是否由模板寫成。
- `dist/universal-v2/engine.mjs`：繼續執行低階 DSL 的結算、合法選擇、AP、Raid、生命 Trigger 與卡片守恆，不因套模板跳過裁定。
- `dist/universal-v2/real-card-pilots.mjs`：目前有 **22 個真卡效果設定** 改用模板；Pilot 白名單已擴充為 **BLEACH 15／天元突破 20 = 35 張**（不等於每張都完成官方 FAQ 驗收）。
- `tests/universal-v2-ability-templates.test.mjs`：所有模板輸出、非法參數、規則時點、19 個現有 Pilot 模板的低階 DSL 一致性，以及跨作品實際結算。

## 第一批可重用模板

| template | 意義 | 必填參數 | 所產生的 op |
|---|---|---|---|
| `draw` | 抽牌 | `count`（1–10） | `draw` |
| `millTop` | 牌頂送場外 | `count`（1–10） | `millTop` |
| `drawDiscardOne` | 抽 1 再棄 1（需要選手牌） | 無 | `drawDiscard` |
| `peekTopOne` | 私下看牌庫頂一張，可留頂／送場外 | 無 | `peekTopOne` |
| `recoverAp` | 最多恢復指定 AP 張數 | `count`（1–3） | `recoverAp` |
| `buffSelf` | 本回合自身加 BP | `bp`（1–5000） | `buffSelf` |
| `enemyBpDown` | 選敵方前線降 BP | `bp`、`optional`（須明確 true/false） | `enemyBpDown` |
| `retireEnemyUnderBp` | 敵方 BP 門檻退場；己方有特定角色提高門檻 | `bp`、`bonusName`、`bonusBp` | `retireOppFrontUnderBp` |
| `restEnemyUnderBp` | 可選敵方 BP 門檻 REST | `bp`、`optional:true` | `restOppFrontUnderBp` |
| `retireEnemyIfFacedown` | 自身 Raid 底下有裏向卡時，可選敵方退場 | `bp`、`optional:true` | `retireOppFrontIfFacedown` |
| `buffOwnTrait` | 被 Raid 的底板可選己方特徵角色加 BP | `trait`、`bp`、`optional:true` | `buffOwnTrait` |
| `drawIfRaidUnderFacedown` | 被 Raid 的角色底下存在裏向卡才抽 1 | 無 | `drawIfRaidUnderFacedown` |
| `searchDeckOne` | 搜尋自己牌庫中符合條件的至多 1 張卡加入手牌，結束後必洗牌 | `filter:{field,value}`、`optional`、`shuffle:true` | `searchDeckOne` |
| `recoverOutsideOne` | 從自己的場外選至多 1 張符合條件的卡加入手牌 | `filter:{field,value}`、`optional` | `recoverOutsideOne` |
| `discardToDraw` | 從自己的手牌支付棄 1 張的成本，成功才抽指定張數 | `count`（1–10）、`optional` | `discardToDraw` |
| `searchDeckMany` | 從自己的牌庫連續選最多指定張數符合條件的卡，結束時洗牌一次 | `filter`、`count`（1–5）、`optional`、`shuffle:true` | `searchDeckMany` |
| `searchDeckWhere` | 用 2–3 條件組合搜尋己方整副牌庫，取至多 5 張、完成才洗牌 | `filters`、`logic:'all'|'any'`、`count`、`optional`、`shuffle:true` | `searchDeckWhere` |
| `inspectTopArrange` | 私下查看牌頂 2–4 張，可選至多一張送場外，逐張指定其餘卡片放回牌頂或牌底的順序 | `count`、`toOutside`、`rest:'top'|'bottom'` | `inspectTopArrange` |
| `payDiscardThen` | 先支付棄牌成本，成功後才按順序執行隸屬於這次支付的多段效果 | `optional`、`then`（1–6 個允許的子模板） | `discardGate` |
| `enemyFrontAllBpDown` | 對敵方當前前線全體同時套用本回合 -BP；之後逐一處理 BP ≤ 0 退場 | `bp`（1–5000） | `enemyFrontAllBpDown` |
| `retireEnemyFrontAllUnderBp` | 對敵方前線所有 BP ≤ 門檻的角色同時判定退場，依序處理保護／替代效果 | `bp`（1–50000） | `retireOppFrontAllUnderBp` |
| `buffOwnTraitAllTurn` | 給自己場上**目前**有指定特徵的全部角色本回合 +BP | `trait`、`bp`（1–5000） | `buffOwnTraitAllTurn` |
| `buffSelfIfFirstAttack` | 如果是本回合己方角色的首次攻擊，自身本回合 +BP | `bp`（1–5000） | `buffSelfIfFirstAttack` |
| `bounceOwnOtherUnderEnergy` | 登場時返回己方其他低能源角色至手牌；若沒有合法其他目標則返回自身 | `energy`（0–30） | `bounceOwnOtherUnderEnergy` |
| `recoverOutsideColorUnderEnergy` | 依卡片顏色與印刷需求能源上限，從自己的公開場外回收至多 1 張 | `color`、`energy`、`optional` | `recoverOutsideColorUnderEnergy` |

以上模板名稱是為了維護程式方便，並非任何實體卡都具有相同文字或適用條件；參數必須由官方卡文逐卡驗證。某些能力只能出現在特定時點，`pack.mjs` 會拒絕不合法組合。

### 第二批搜尋、回收與支付模板使用限制

- `filter` 必須完整列明 **`{field:'name'|'trait'|'color'|'type',value:'...' }`**；以來源卡自己的作品資料判斷，不能把對方同卡號當成己方卡。卡種類型限 `character`、`event`、`field`。這一版**尚不支援**同時指定能源上限、複數特徵或進場代替回手等複雜搜尋。
- `searchDeckOne` 只搜尋**自己的整副牌庫**，可強制選一張或允許放棄；無符合目標時自動跳過。無論選、放棄或沒有目標都會洗牌。若官方文字要求展示、看牌頂幾張或依序放回牌庫底，**不可以硬套這個模板**。
- `recoverOutsideOne` 只從**自己的場外（outside）**拿卡回手，不能拿除外區（removed）、生命、對方場外或牌庫。
- `discardToDraw` 是一個**原子操作**：先從手牌棄一張作成本，成功才抽 `count`；選擇不支付時，這個操作不抽牌。它**不代表**已支援任意跨能力的成本支付閘門；若一張實卡要求支付成本後才執行多段其他能力，還需要專用的條件效果佇列，不能把 `discardToDraw` 與其他模板隨意接起來當成同一支付條件。
- 私密選擇透過 `universalPrivateChoices(pack,state,viewer)` 交給**正在做決定的玩家**，包含可選卡名／卡號和原始 action；對手只收到 `universalPublicView` 的 pending 類型，不能看見選到的牌庫卡 UID。若未來做遠端多人房間，仍必須在**伺服器端**驗證 viewer 身分與 action 權限；此函式不是網路授權系統。
- 搜尋／回收／付費完成後，效果佇列才往下處理。Node 測試會驗證非法 UID、拒絕跳過強制效果、空牌庫、跨作品重號、卡片張數守恆和 AI 選擇。

**這 3 個新模板只有合成測試卡案例，目前沒有新增任何真實卡的完整官方驗收白名單。**

### 第三批：一次搜尋多張與支付後才執行多段效果

`searchDeckMany` 將每次選卡保留為獨立的 **private pending**：選取一張後由引擎更新可選的實體 UID，防止重複選同一張；直到達到 `count`、沒有合法候選或（`optional:true`）玩家主動放棄才**洗牌一次**，然後繼續下個效果。可選條件仍只有 `name/trait/color/type` 的單一條件，新增第四批的 `searchDeckWhere` 可做有限的 ALL/ANY 複合條件，`inspectTopArrange` 可查看牌頂至多 4 張並決定去向／順序；更複雜的條件或展示功能仍須另行驗收。

`payDiscardThen` 範例（**非真卡卡文**）：

```js
templateEffects:{
  onPlay:[
    {template:'payDiscardThen',optional:true,then:[
      {template:'draw',count:1},
      {template:'searchDeckOne',
       filter:{field:'trait',value:'Scout'},optional:true,shuffle:true},
      {template:'enemyBpDown',bp:2500,optional:true}
    ]}
  ]
}
```

棄掉自己**一張手牌**後，才會按順序抽 1、搜尋選牌、指定敵前線 BP 降低。中途的搜尋／目標 pending 結束後才執行下一個已支付效果；拒絕棄牌則**整個 then 都不執行**。支付後的效果在同時點的其他效果前執行，避免被外部 `draw` 等操作插隊。若沒有手牌能支付，整組 then 不會被啟動。

目前 `then` 最多 6 個子模板且禁止巢狀支付；可用子模板僅為 `draw`、`millTop`、`peekTopOne`、`searchDeckOne`、`searchDeckMany`、`searchDeckWhere`、`inspectTopArrange`、`recoverOutsideOne`、`enemyBpDown`、`restEnemyUnderBp`。不能隨意套用到 Raid 底板 `onRaided`，不能用於任意種類成本（例如 REST 本體／AP 支出／送角色退場）或推論官方特殊支付規則。低階 DSL、子項驗證和卡種／觸發時點依舊保留嚴格限制。

對應新增 `tests/universal-v2-paid-chain-multi-search.test.mjs`：包括搜尋三張、提早放棄、無符合目標、未支付與已支付、串接私人選擇與跨作品目標、攻擊前成本選擇與阻擋次序，以及非法巢狀能力／隱藏資料／實體 UID 守恆。**所有第三批新能力只使用合成測試卡，當批真實卡白名單仍為 23 張；後續真卡移植已增至 32 張。**

### 第四批：多條件搜尋與牌庫頂部排序

`searchDeckWhere` 允許 **2–3 個明確條件**，`logic:'all'` 要求全部符合、`logic:'any'` 則任一符合。每個條件只能是 `name`、`trait`、`color` 或 `type`，不得重複相同條件或混入未審核屬性。可選 1–5 張符合條件的己方實體卡加入手牌，無論選完、提早結束或沒有合法候選都**在結束時洗一次牌**。對方同卡號不會錯讀成己方卡名或特徵。

`inspectTopArrange` 只查看**己方牌庫頂前 2–4 張**（若不足則實際有幾張看幾張），結算**不洗牌**。由控制者決定是否將其中一張送場外（`toOutside:true`）；若 `toOutside:false`，則不可選擇送場外。接著按玩家點選的順序，將其餘原先看到的卡片放回**牌頂**或**牌底**；排列中間所有卡片保留原順序。未完成排列前，其他抽牌與攻擊處理都會等待。透過 `universalPrivateChoices` 僅向效果控制者回報卡名與合法選擇；對手只知道某玩家正在做選擇，無法看到尚未公開的 UID。

```js
templateEffects: {
  onPlay: [
    {template:'searchDeckWhere',
     filters:[{field:'color',value:'green'},{field:'trait',value:'Scout'}],
     logic:'all',count:2,optional:true,shuffle:true},
    {template:'inspectTopArrange',count:3,toOutside:true,rest:'bottom'}
  ]
}
```

此處是虛構能力示例，**不代表官方卡片原文**。印刷效果如果要求從查看的牌中「加入手牌」、最多送兩張場外、分別放牌庫頂與底、指定展示、讓對手查看、搜尋後不洗牌，或加入其他成本／條件，仍需新增對應模板與 FAQ 測試，不可硬套。新能力可作為 `payDiscardThen` 的受限子效果，但目前仍只在合成測試牌組驗證。

測試：`tests/universal-v2-compound-top-inspection.test.mjs`。涵蓋 ALL/ANY、跨作品同編號但不同卡文、隱私與非法 UID、選單張送場外、重新排序至牌頂／牌底、後續抽牌時點、付費後接續兩種選擇以及巢狀參數不可更改。**此批當時 V2 Pilot 為 23 張；後續真卡移植已增至 32 張。**

### 第五批：同時多目標退場、替代退場與回合暫時 BP

`enemyFrontAllBpDown` **先對所有敵方前線角色一起套用 BP 減少**，再以當時符合 BP ≤ 0 的實體 UID 清單，依前線槽位順序執行必要的退場。若某張卡需要替代離場，會暫停批次、由其持有者選擇，再繼續處理其他已記錄目標；不會提前執行下一個抽牌／攻擊效果。這是**指定範圍的狀態式退場**，不是已支援所有「同時發動」和雙方互相觸發的官方一般裁定。

`retireEnemyFrontAllUnderBp` 對效果開始結算時 BP 在指定門檻內的敵方前線角色，**一次決定完整目標清單**，不會因為先處理某張的保護選擇而重新挑選其他角色。若目標具有受限的 Raid 裏向底卡替代離場效果，玩家能逐次選擇保護或讓其離場，全部處理結束後才繼續待決效果佇列。現在的 `retireBatchOne` 僅是**引擎內部工作**，不允許卡包直接填寫成卡片印刷效果。

`buffOwnTraitAllTurn` 給當下已在前線／能源區且符合指定特徵的己方角色一個**到本回合結束為止**的 BP 加成；未來新登場的角色不追溯取得加成，到對方回合自然失效。**它不是常駐能力光環**，也不會因為持有原效果的角色離場而重新判定。因此官卡若寫的是「只要此角色在場上，其他角色 +BP」或「本遊戲中永遠 +BP」，不可用此模板代替，須另實作來源綁定的持續能力與連鎖狀態檢查。

這三種均已在 `tests/universal-v2-mass-retire-turn-buff.test.mjs` 的**合成跨作品 50 張牌組**驗證：全體降 BP、兩張 Raid 保護依序選擇與普通角色退場、原目標快照、高 BP 角色不受影響、回合切換清除 BP、無合法目標、非法參數、資料守恆與原始狀態不可變。**第五批當時沒有增加真卡 Pilot；下一輪移植後已達 BLEACH 15／天元突破 17，共 32 張。官方逐卡 FAQ 驗收仍是獨立任務。**

### 寫入新作品的方式

```js
const card = {
  id: 'EXAMPLE-001',
  name: 'Example',
  type: 'character', color: 'green', energy: 3, ap: 1, bp: 3500, gen: 1,
  implementation: 'dsl',
  templateEffects: {
    onPlay: [
      {template: 'draw', count: 1},
      {template: 'restEnemyUnderBp', bp: 3000, optional: true}
    ]
  }
};
```

`createUniversalPack({id:'title', cards:[card]})` 會把其 `onPlay` 編譯成

```js
[
  {op: 'draw', count: 1},
  {op: 'restOppFrontUnderBp', bp: 3000, optional: true}
]
```

**先抽牌，再等待玩家決定是否 REST 合法敵方目標**，在事件佇列中不會被下一個效果覆蓋。只是示例卡，**不是官方卡片**。

同一張卡可在不同時點混用 `effects`（舊式 DSL）和 `templateEffects`，但**同一時點不可同時宣告兩者**，避免效果順序不確定。未登錄模板、非法參數、偷偷漏寫 `optional`、不合法時點、或 `vanilla` 聲稱有模板效果，都會直接拒絕建 Pack。符合契約的模板仍必須通過原本的 DSL 驗證。

## 第七批：天元紅色 50 張與跨作品真卡對局

已移植 TTG-1-047、049、052，增加首次攻擊計數、按官方 Q62 的 Raid 頂卡回手（底板送場外）與支付棄牌成本後按顏色／需求能源從場外回收；現有 `payDiscardThen` 可直接包裝該回收能力，未付費不能白拿。新增 `verifiedTtgRedPilotDeck()`，由 13 種真實紅色卡號組成 50 張，不含 `TEST-ONLY`，並在 `tests/universal-v2-ttg-vs-bleach-real-decks.test.mjs` 測試 TTG 50 張對 BLEACH 紫色 50 張的完整跨作品 AI 對局。完整來源與限制見 [`UNIVERSAL_V2_REAL_50_MILESTONE.md`](./UNIVERSAL_V2_REAL_50_MILESTONE.md)。正式網站仍未切換；全卡 FAQ 逐卡驗收仍未完成。

## 第六批真卡移植：首副全真 BLEACH 50 張

另外完成 [`UNIVERSAL_V2_REAL_50_MILESTONE.md`](./UNIVERSAL_V2_REAL_50_MILESTONE.md)，以已建的 22 種共用模板與少數明確被動能力，把 BLEACH 的 036、037、040、045、048、052、057 及天元突破的 043、066 加入 V2。**BLEACH 紫色已可組成第一副沒有 TEST-ONLY 補卡的合法 50 張測試牌組**，並由 `tests/universal-v2-bleach-real-deck.test.mjs` 跑完全真卡 AI 鏡像對局。天元紅色仍未補到可用全真 50 張，故不能宣稱兩作品已可全真卡跨作品對戰。

這批新增 `activeExtraEnergy` 與 `impactNull` 都是顯式校對、能跨作品共用的印刷被動設定，**不會把「ACTIVE 產能 +1」誤當成常駐產能 +1，也不會在非戰鬥情境錯誤取消 IMPACT**。上述系統測試與真實卡號增量不等於全部官方 FAQ 驗收。

## 每張卡新增或移植前必須逐項核對

1. 官方印刷卡號、版本、卡名與英文／日文文字；異名與再版按官方來源處理。
2. 觸發時點（`onPlay`、`onRaid`、`onAttack`、`onRaided`）、條件是必須還是可以／最多；同名限制與 Raid 額外時點。
3. 實際發生的抽牌、公開／隱藏、指定目標、支付成本、反應式退場、效力持續期間；模板做不到就新增 DSL op 與專用測試，**不得硬套**。
4. 分別測試正常／無目標／拒絕非法目標／可跳過／能源不足／滿場／生命 Trigger ／跨作品／AI，持續檢查 50 張實體卡 UID 守恆。
5. 每作品達到一副 **官方真卡、合法 50 張、無虛構補卡** 且完全可結算的牌組後，再整局測試與逐張擴充。UI 與正式站切換仍需獨立驗收。

## 尚未納入模板的能力（不得宣告完成）

`mainAbility`（例如 TTG-1-046 的兩種選擇與同名限次）、Raid 底板合法名稱、特殊 `conditionalUnderFaceDown`、COLOR/SPECIAL/RAID 生命 Trigger 印刷差異目前仍使用嚴格明列的能力設定，不會被上面的 25 種模板自動判定。其他多目標、同時退場、交換、持續免疫、攻防時點、其他系列專屬例外仍待開發。

**本批是可重複能力的編譯基礎，不是「700 張都能玩」或「32 張都已完成全部官方裁定」。**
