# 第 12 輪 A 組共用操作契約

基準是 PR #436 的 `cursor/v2-round11-integrate-65f8`，尖端 `6c5424824c3c9716723938bb1d39668e70890b8d`。這一輪的分支是 `cursor/v2-round12-integrate-65f8`。HEAD 以這個 PR 的尖端為準。

#437 的父提交就是 #436。只納入 MHA-1-051 與 MHA-1-054。#435 的基準是第 10 輪的 `a4b3a51f`，沒有整支合併，也沒有覆蓋 IMC、AI 或 051／054 的程式。留下的是預組與補充包 9 張重印卡的身分核對，以及生命觸發依印刷選擇、並可突襲到綠谷出久的測試。

整合後以程式清點：IMC 113／113 ready，MHA 59／109 ready，pending 50。`playable` 維持 false。IMC 官方預組 `counts` 維持 null。`UA10ST_PRODUCT.recipe` 維持 null。沒有合併 `main`，也沒有部署。

## 已完成、可以當範例

051 與 054 已進對戰包。不要重寫，也不要因為下面的新形狀存在就把其他卡標成 ready。整句測試通過之前，卡維持 pending。

## 已解鎖、這一輪不要標 ready

B、C、D 可以照下面的形狀寫卡。不要用卡號分岔。既有的休息登場、活動不突襲、以及 `battleLoseToHand:true` 都維持原樣。

### 1. 蓋牌在角色下面，攻擊時放到場外

蓋牌放在角色的 `under`，不是突襲疊。區域記錄是 `raid-under`。只處理這張角色自己正下方的蓋牌，不挖突襲層。

登場時：

```js
{op:'tuckFacedownUnder', from:'hand', host:'self', count:1, optional:true,
 then:[{op:'draw', count:1}]}
{op:'tuckFacedownUnder', from:'hand', host:{names:['ファットガム','天喰 環']},
 count:1, optional:true, then:[{op:'draw', count:1}]}
{op:'tuckFacedownUnder', from:'deckTop', host:'self', count:2, optional:false}
{op:'tuckFacedownUnder', from:'hand', host:'self', count:'any', optional:true}
```

`from` 是 `hand` 或 `deckTop`。`host` 是 `self`，或 1 到 4 個卡名。`count` 是 1 到 4，或 `any`。`any` 只能來自手牌，而且 `optional` 必須是 true。`deckTop` 的宿主只能是自己，立刻放，不開手牌選擇。`then` 只能在 `optional:true` 時出現，而且只能是抽 1。抽牌只在實際蓋下至少 1 張之後發生。跳過不抽。

手牌蓋牌先選宿主。只有 1 個合格宿主時直接選手牌。宿主在選擇前離開場上時，只剩跳過，不蓋、不抽。牌組頂是空的，或宿主已經不在，蓋 0 張。

主階段每回合一次，把牌組頂 1 張蓋到自己下面：

```js
mainAbility:{op:'onceTuckFacedown', oncePerTurn:true, from:'deckTop', host:'self', count:1}
```

牌組是空的不提供。同一回合第二次不提供。前排與能量列都可以起動。

攻擊時，可選把自己正下方 1 張蓋牌放到場外，正面朝上。放到場外之後才接後段。跳過不接後段。那張蓋牌已經不在時，不能再選它。

```js
{op:'stripFacedownToOutside', optional:true, max:1, host:'self', to:'outside',
 then:[{op:'buffSelf', bp:2000}]}
{op:'stripFacedownToOutside', optional:true, max:1, host:'self', to:'outside',
 then:[{op:'retireOppFrontUnderBp', bp:2500, optional:true}]}
```

`then` 可以省略。有的話只能是上面兩種之一。`buffSelf` 的 `bp` 是 500 到 5000，而且是 500 的倍數。退場的 `bp` 是 500 的倍數，最多 50000，並且必須 `optional:true`。

非法：登場時剝離、攻擊時蓋牌、`count:'any'` 配牌組頂、後段不是抽 1 或上面兩種、`pay` 不是這個操作的鍵。

還沒有的句子，不要用這個操作代替：038 的 2 張雙重阻擋與 4 張雙重攻擊、085 的每張蓋牌 BP+1000、090 的攻擊時看蓋牌並最多 1 張入手再活動其他非ホークス。090 的入手不是放到場外。

### 2. 手牌張數到達上限才抽，或抽到指定張數

條件在結算當下檢查。同一段效果裡先抽過的牌算進手牌。

```js
{op:'ifLiveThen', when:{kind:'ownHandCountAtMost', turn:'any', max:3},
 then:[{op:'draw', count:1}]}
```

`turn` 是 `any` 或 `own`。`max` 是 0 到 10。手牌少於或等於 `max` 才執行後段。後段沿用 `ifLiveThen` 已經允許的操作。089 的抽 1 用 `{op:'draw', count:1}`。

抽到指定張數：

```js
{op:'drawUntilHand', count:2}
```

`count` 是 1 到 7。手牌已經達到或超過時抽 0。差幾張就抽幾張。牌組先空就停，不補牌。角色的登場時或退場時都可以。退場時可以和其他允許的退場效果並存。

非法：`max` 是 11、`count` 是 0 或 8、寫在攻擊時。

072 要先把任意張手牌放到場外，再抽到手牌 3 張，攻擊時還依放置張數退場。`drawUntilHand` 沒有先棄牌，也不能代替那個攻擊句。099 是其他手牌在 3 張以下時，退場門檻從 3000 改成 5000，不是這個條件。

### 3. 自己回合的戰鬥敗北改去手牌或退場區

沿用勝利者身上的替換。一般阻擋戰裡，阻擋方 BP 較高時雙方都不離場（Q34）。替換只發生在原本會退場的那次敗北。自己回合攻擊打贏時，失敗的對手改去向。對方回合用狙擊等方式打過來、而這張作為防守方打贏並使對方原本會退場時，`ownTurn` 不改去向。

```js
battleLoseToHand:'ownTurn'
printedImpact:1
```

`true` 仍是任一回合，死神的既有卡維持 `true`。`ownTurn` 只在勝利者的擁有者就是目前回合玩家時，把戰敗的對手角色改回手牌。這是規則處理，不是「相手の効果」。Q424：不發動那張的退場時。衝擊仍在回手之後結算。勝利者的原有效果失効時，對方照常退到場外，退場時照常發動。

改放退場區沿用既有欄位，沒有重做：

```js
battleRemoveInstead:true
```

只在勝利者自己的回合，把戰敗的對手角色放到退場區。對方回合仍退到場外。同樣不發動退場時。

非法：`battleLoseToHand` 寫成 `'both'` 或其他字串。

009 的支付手牌後獲得衝擊 +1，以及 010 的前線每回合一次把 BP 2000 以下放到退場區，都還沒有操作。010 的突襲名用既有 `raidName`。不要只寫去向就標 ready。

### 4. 對手效果造成離場時留下，或改付 1 張生命

戰鬥敗北與 BP 0 規則不是這個句子。`by` 必須是對手效果。來源卡不在時，類型視為未知。

留下是強制的，發生時就消耗這一回，角色不離場，也不結算退場時：

```js
oppEffectLeave:{turn:'opponent', oncePerTurn:true, instead:'stay',
 cause:'characterOrEvent', subject:'self', line:'any'}
oppEffectLeave:{turn:'own', oncePerTurn:true, instead:'stay',
 cause:'effect', subject:'self', line:'any'}
```

`cause:'effect'` 接受角色、事件與未知來源。`character` 只接受角色。`characterOrEvent` 接受角色或事件。`turn:'own'` 只在自己回合，`opponent` 只在對手回合，`any` 兩邊都算。留下不能寫 `excludeNames`，`line` 只能是 `any`，`subject` 只能是 `self`。

改付生命是可選的。沒有生命就不開選擇，離場照常發生。拒絕不消耗這一回，離場照常發生並且結算退場時。接受時把自己生命區最上面 1 張放到場外，理由是自己的效果，不發動生命觸發；被保護的角色留下，不結算退場時，並消耗這一回。

```js
oppEffectLeave:{turn:'any', oncePerTurn:true, instead:'life', cause:'character',
 subject:'other', line:'front', excludeNames:['緑谷 出久']}
```

付生命的 `subject` 必須是 `other`，`line` 必須是 `front`。`line:'front'` 指持有這個能力的角色要在前排。被保護的是自己場上另一張角色，前排與能量列都算，不能是這張自己。`excludeNames` 是 1 到 4 個卡名。目標在選擇前已經離開時，只剩關閉這次選擇，不第二次離場，也不消耗這一回。

非法：留下卻寫排除名、付生命卻保護自己、`oncePerTurn` 不是 true。

048 的登場時看全部自己的生命並重排，還沒有操作。不要只寫留下就標 ready。

### 5. 主階段支付 1 張手牌後移動或交換

```js
mainAbility:{op:'payHandMoveOrSwap', oncePerTurn:true, pay:1}
```

角色在前排或能量列都可以起動。手牌至少 1 張，而且這一回還沒有用過。先把手牌放到場外，理由是支付，然後才選：

- 兩邊都做得到時，先選移動或交換。
- 只能移動時，沿用既有的列移動。可以選自己。不能跳過。
- 只能交換時，沿用既有的前後列交換。
- 兩邊都不能做時，支付留下，效果結束。

選到的角色在支付後離開時，移動失敗，已支付的手牌留在場外。同一回合不能再起動。空的手牌不提供這個起動。

非法：`pay` 不是 1、缺少 `oncePerTurn`、多一個鍵。

### 6. 指定能源、顏色、特徵與目標的連續活動或突襲登場

這是登場時的句子。顏色觸發仍用原本的手牌登場操作，不能改成這一個。

```js
{op:'deployOwnHandActiveOrRaid', type:'character', color:'green', trait:null,
 maxEnergy:3, ap:1, max:1, optional:true, requireAffordableEnergy:true}
```

`color` 可以是五色之一或 `null`。`trait` 是特徵或 `null`。`maxEnergy` 是 0 到 30 或 `null`，比的是印刷必要能源。`ap` 是 1 到 3 或 `null`。`max` 是 1 到 4。`requireAffordableEnergy` 必須是 true：結算當下，該顏色已產生的能源要夠這張的必要能源。可加 `excludeNames`，1 到 4 個卡名。

每一張都重新檢查。模式只有活動或突襲。沒有休息登場。突襲沿用共用的選牌、選模式、再點格子。選活動時角色是活動狀態。入場的登場時先結算，才開下一張。跳過不再繼續。手牌裡的那張已離開，或能源已經不夠時，該張不再提供。

非法：`type` 不是角色、缺少 `requireAffordableEnergy:true`、用休息模式登場。

059 的顏色觸發是另一句，必要能源 2 以下、不突襲。兩句都要寫，不能互相代替。

## 寫程式時對得上的卡

下面這些卡的印刷句已經可以全部用現有參數表示。這一輪仍沒有寫進對戰包。所屬組寫完程式與整句測試之後，下一輪再計入 ready。

- 006：`payHandMoveOrSwap`。
- 007：`printedImpact:1` 與 `battleLoseToHand:'ownTurn'`。
- 056：指名宿主的可選蓋牌後抽 1，攻擊時剝離後 `buffSelf` 2000。
- 059：登場用上面的活動或突襲。顏色觸發另寫既有操作。
- 074：自己回合、`cause:'effect'`、留下自己。
- 087：退場 `drawUntilHand`，`count:2`。
- 089：登場時 `ownHandCountAtMost` 的 `max:3`，後段抽 1。顏色觸發另寫。
- 093：`turn:'any'`、付生命、`cause:'character'`、前排、`excludeNames` 寫印刷名 `緑谷 出久`。卡名比對是全名相等，不能寫成沒有空格的譯名。

只寫到一半、仍不能標 ready 的是 009、010、038、048、072、085、090、099。

## 下一輪仍缺的共用句

下面只算這個操作仍寫不出整句的 pending 卡。

1. 計數帶【起動メイン】的角色：003、004。2 張。
2. 可選磨牌後回收特徵或指名卡：002、026。2 張。

各 1 張、下一個最短的仍是 055：`ifLiveThen` 的後段不能接 `retireOppFrontUnderBp`。接著是 076 的無特徵能量列移到前排、017 的登場時活動放出突襲最下段、011 的主階段強制阻擋，以及 066 剩下的無特徵綠角色休息登場與歐爾麥特改活動。

005、020、023、025、029、030、031、033、035、042、045、060、062、070、071、081、084、091、095、096、100 仍是各自的整句。不要只做其中半句就標 ready。

第 14 輪在這個契約之後另開 `docs/v2-handoff/V2-R14A-shared-ops.md`。009 的支付衝擊、010 的前排移除、017 的登場時突襲最下段、048 的生命重排、071 的手牌放場外、076 的無特徵能量列移動，改以那份契約為準。上面這段是第 12 輪當時的記錄，不回改。
