# 第 11 輪 A 組共用操作契約

基準是 PR #431 的 `cursor/v2-round10-integrate-65f8`，尖端 `a4b3a51fa2bafdf520ce0dc011e23a26e5a75423`。

#433、#430、#429 的基準是 #428。#431 已經包含 #428 的引擎，也已經包含 012、019、027、053。這一輪只摘尚未整合的修改，沒有把那 4 張再引入一次，也沒有覆蓋 IMC 或 AI 修正。

整合後的對戰包以程式清點：IMC 113／113 ready，MHA 57／109 ready，pending 52。063 只定義在預組程式。`playable` 維持 false。IMC 官方預組 `counts` 維持 null。`UA10ST_PRODUCT.recipe` 維持 null。沒有合併 `main`，也沒有部署。

## 已解鎖、仍不要標 ready

B、C、D 可以照下面的形狀寫卡。整句測試通過之前，不要把 001、013、014、018、051、054 標成 ready。不要用卡號分岔。既有的可選未被阻擋抽牌、單篩選不棄牌、以及突襲底板休息登場都維持原樣。

### 1. 退場時抽 1 再棄 1

沿用 `drawDiscard`。退場時機只接受 `{op:'drawDiscard', count:1}`，並可與卡上的 `impactNull:true` 同時成立。抽 1 張後，把 1 張手牌放到場外。

非法：`count` 不是 1，或另帶 `discardCount`。只寫衝擊無效、或退場只抽 1 張，都不是這句。

MHA-1-001 由 C 組寫程式。

### 2. 生命入手後才活動或退場

沿用 `optionalOwnLifeToHandThenDraw`。`then` 除了既有的抽 1 或 2，還可以是下面兩個現有操作之一：

```js
{op:'activeOwnOther', optional:true, line:'front'}
{op:'retireOppFrontUnderBp', bp:3500, optional:true}
```

`line:'front'` 只選其他自己前排角色。能量列不算。沒有寫 `line` 的 `activeOwnOther` 仍是場上任一其他角色，而且不能直接接在這句後面。拒絕入手時，後段不發生。生命因此變 0，要等後段結束才敗北。Q429 與 Q430 的順序相同。

`bp` 必須是 500 的倍數。014 的突襲〈荼毘〉用 `raidName`，不能代替後段。

非法：後段抽 3 張、活動沒有 `line:'front'`、退場缺少 `optional:true`。

013、014 由 C 組寫程式。

### 3. 不棄手牌的非角色頂牌檢索

沿用 `searchTopOneBottomDiscard`。`discard:false` 除了既有的單一篩選與卡名 `any`，還可以是 `logic:'all'` 的 2 到 3 個篩選。篩選只許 `type` 為 `field` 或 `event`、`color`，以及 `printedRequiredEnergyAtMost`。至少要有一個場域或事件類型。`count` 1 到 7。

看牌視窗維持私密。不合格的牌留在視窗，不能選。取到的那張才公開入手。其餘依選擇放回底部。不棄手牌。

054 的形狀：

```js
{op:'searchTopOneBottomDiscard', count:7, discard:false, logic:'all', filters:[
 {field:'type', value:'field'},
 {field:'color', value:'green'},
 {field:'printedRequiredEnergyAtMost', value:2}
]}
```

非法：角色複合窗使用 `discard:false`，或同時寫 `noHandDiscard`。

054 由 D 組寫程式。

### 4. 每回合一次的未被阻擋抽牌，以及突襲最下段活動登場

`blockBpRestriction:{relation:'atMost', bp:3000, condition:null}` 已經是「BP 在該值以下不能阻擋」。050 已使用。不要重做，也不要因為這欄存在就把 051 標 ready。

`unblockedAttack` 新增每回合一次的強制形。既有 `optional:true`、每次未被阻擋都可抽的形維持不變，IMC-1-061 仍走那條。

```js
unblockedAttack:{oncePerTurn:true, optional:false, then:[{op:'draw', count:1}]}
```

時機仍是指定阻擋角色之後。同一張第二次未被阻擋不抽。被阻擋不抽，也不消耗這一回。非法：`oncePerTurn` 配 `optional:true`，或後段不是抽 1。

退場用新操作 `deployRaidBottomActive`。它不是 `deployOwnRaidBaseRest`：休息登場仍是唯一的退場效果，而且底板不能帶突襲名、進入休息狀態。這一條是可選的活動前排登場，可以和其他退場效果並存，底板可以帶突襲名。

```js
{op:'deployRaidBottomActive', optional:true, when:{
 kind:'ownOtherRequiredEnergyAtLeast', turn:'any', zone:'field',
 excludeSelf:true, minEnergy:4, min:3
}}
```

條件數的是自己場上其他正面朝上的角色，前排與能量列都算，使用現有的必要能源讀值。這張自己、蓋牌與場域不算。條件不成立、沒有突襲疊、或玩家拒絕時，最下段留在正常退場的場外。接受時只放到前排，而且是活動狀態，並結算該卡的登場時。

非法：寫在登場時、缺少 `when`、`min` 為 0、或把最下段放進手牌或休息登場。

051 由 D 組寫程式。三句要一起寫。

### 5. 主階段賦予戰鬥勝利抽牌

沿用 `grantSelfAttackWinDrawThisTurn`。它現在可以作為 `frontOnceProgram` 的唯一後段。`frontOnly` 必須是 false，所以前排與能量列都能起動。`oncePerTurn` 必須是 true。

```js
mainAbility:{
 op:'frontOnceProgram', frontOnly:false, oncePerTurn:true,
 then:[{op:'grantSelfAttackWinDrawThisTurn'}]
}
```

賦予只持續本回合，而且只有這張攻擊並打贏時抽 1。同一回合不能再起動。沒有起動就打贏，不抽。打輸不抽。登場時直接寫這個授予的舊路徑維持可用。

非法：`frontOnly:true`、後段多一個鍵、或改成 `grantSelfMustBlockThisTurn`。

018 由 C 組寫程式。

## 下一輪缺口

下面只算仍然不能整句寫出的 pending 卡。已解鎖的 6 張不計。同一張若有兩句，歸在還缺的那一句。

1. 蓋牌在角色下面：038、056、085、090。4 張。
2. 手牌張數上限，或抽到指定張數：072、087、089、099。4 張。
3. 離場改為留下，或改付生命：048、074、093。3 張。
4. 自己回合的戰鬥敗北改去手牌或退場區：007、009、010。3 張。
5. 計數帶【起動メイン】的角色：003、004。2 張。
6. 可選磨牌後回收特徵或指名卡：002、026。2 張。

各 1 張、但下一個共用操作最短的是 055：`ownOtherRequiredEnergyAtLeast` 已經能當條件，`ifLiveThen` 的後段仍不能接 `retireOppFrontUnderBp`。接著是 076 的無特徵能量列移到前排、017 的登場時活動放出突襲最下段、011 的主階段強制阻擋，以及 066 剩下的無特徵綠角色休息登場與歐爾麥特改活動。066 的看頂 3 張角色已經可用 `lookTopScript`。

006、025、005、020、023、029、030、031、033、035、042、045、059、060、062、070、071、081、084、091、095、096、100 仍是各自的整句，沒有現成操作可以只改參數就完成。不要只做其中半句就標 ready。

## 第 12 輪已接上

上面是第 11 輪結束時的缺口，保留當時的清點。051 與 054 已在第 12 輪寫進程式。六項共用形狀的用法在 `docs/v2-handoff/V2-R12A-shared-ops.md`。這一輪沒有把那些卡標成 ready。
