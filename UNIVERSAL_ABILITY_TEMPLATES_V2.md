# UNION ARENA V2 — 可重複使用的能力模板（第一、二批）

**狀態：實驗版 / PR #70 / 不取代正式站。** 模板將每張卡片明確宣告的印刷效果轉譯為已存在的 V2 DSL 指令，**不**根據日文文字自動猜測能力，也**不**把尚未驗收的卡片標為可用。

## 檔案與資料流

- `dist/universal-v2/ability-templates.mjs`：受控的 15 種命名模板、嚴格參數契約，以及 `expandAbilityTemplates`。
- `dist/universal-v2/pack.mjs`：在 `createUniversalPack` 中編譯 `templateEffects`，沿用 `verifyProgram` 及現有時點限制；輸出仍是舊格式 `effects`，引擎 / AI 不需要知道卡片是否由模板寫成。
- `dist/universal-v2/engine.mjs`：繼續執行低階 DSL 的結算、合法選擇、AP、Raid、生命 Trigger 與卡片守恆，不因套模板跳過裁定。
- `dist/universal-v2/real-card-pilots.mjs`：目前有 **16 個已驗證卡片的效果設定** 改用模板；Pilot 白名單仍為 **BLEACH 8／天元突破 15 = 23 張**，沒有新增可用真卡。
- `tests/universal-v2-ability-templates.test.mjs`：所有模板輸出、非法參數、規則時點、16 個現有 Pilot 低階 DSL 完全一致，以及跨作品實際結算。

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

以上模板名稱是為了維護程式方便，並非任何實體卡都具有相同文字或適用條件；參數必須由官方卡文逐卡驗證。某些能力只能出現在特定時點，`pack.mjs` 會拒絕不合法組合。

### 第二批搜尋、回收與支付模板使用限制

- `filter` 必須完整列明 **`{field:'name'|'trait'|'color'|'type',value:'...' }`**；以來源卡自己的作品資料判斷，不能把對方同卡號當成己方卡。卡種類型限 `character`、`event`、`field`。這一版**尚不支援**同時指定能源上限、複數特徵或進場代替回手等複雜搜尋。
- `searchDeckOne` 只搜尋**自己的整副牌庫**，可強制選一張或允許放棄；無符合目標時自動跳過。無論選、放棄或沒有目標都會洗牌。若官方文字要求展示、看牌頂幾張或依序放回牌庫底，**不可以硬套這個模板**。
- `recoverOutsideOne` 只從**自己的場外（outside）**拿卡回手，不能拿除外區（removed）、生命、對方場外或牌庫。
- `discardToDraw` 是一個**原子操作**：先從手牌棄一張作成本，成功才抽 `count`；選擇不支付時，這個操作不抽牌。它**不代表**已支援任意跨能力的成本支付閘門；若一張實卡要求支付成本後才執行多段其他能力，還需要專用的條件效果佇列，不能把 `discardToDraw` 與其他模板隨意接起來當成同一支付條件。
- 私密選擇透過 `universalPrivateChoices(pack,state,viewer)` 交給**正在做決定的玩家**，包含可選卡名／卡號和原始 action；對手只收到 `universalPublicView` 的 pending 類型，不能看見選到的牌庫卡 UID。若未來做遠端多人房間，仍必須在**伺服器端**驗證 viewer 身分與 action 權限；此函式不是網路授權系統。
- 搜尋／回收／付費完成後，效果佇列才往下處理。Node 測試會驗證非法 UID、拒絕跳過強制效果、空牌庫、跨作品重號、卡片張數守恆和 AI 選擇。

**這 3 個新模板只有合成測試卡案例，目前沒有新增任何真實卡的完整官方驗收白名單。**

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

## 每張卡新增或移植前必須逐項核對

1. 官方印刷卡號、版本、卡名與英文／日文文字；異名與再版按官方來源處理。
2. 觸發時點（`onPlay`、`onRaid`、`onAttack`、`onRaided`）、條件是必須還是可以／最多；同名限制與 Raid 額外時點。
3. 實際發生的抽牌、公開／隱藏、指定目標、支付成本、反應式退場、效力持續期間；模板做不到就新增 DSL op 與專用測試，**不得硬套**。
4. 分別測試正常／無目標／拒絕非法目標／可跳過／能源不足／滿場／生命 Trigger ／跨作品／AI，持續檢查 50 張實體卡 UID 守恆。
5. 每作品達到一副 **官方真卡、合法 50 張、無虛構補卡** 且完全可結算的牌組後，再整局測試與逐張擴充。UI 與正式站切換仍需獨立驗收。

## 尚未納入模板的能力（不得宣告完成）

`mainAbility`（例如 TTG-1-046 的兩種選擇與同名限次）、Raid 底板合法名稱、特殊 `conditionalUnderFaceDown`、COLOR/SPECIAL/RAID 生命 Trigger 印刷差異目前仍使用嚴格明列的能力設定，不會被上面的 15 種模板自動判定。其他多目標、同時退場、交換、持續免疫、攻防時點、其他系列專屬例外仍待開發。

**本批是可重複能力的編譯基礎，不是「700 張都能玩」或「23 張都已完成全部官方裁定」。**
