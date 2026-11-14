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

## 手牌付 AP 放到場外

`handPayApOutsideThen` 是角色的 `mainAbility`。`payAp` 只能是 1。主要階段、手牌、有活動 AP，而且手牌區的必要能量已經夠，才可以發動。登場禁止不擋這句。確認能量、付 1 AP、把這張卡從手牌放到場外，然後才跑 `then`。Q1001、Q1002、Q1003。放到場外之後的效果仍是角色效果。Q2007。

`then` 只有三種：抽 1 再放 1 張手牌到場外，然後最多活動 1 張 AP；看牌頂 4 張，公開最多 2 張指定名字以外的卡，其餘放牌底；最多退場 1 張對手前排。受益是 MHA-2-021、023、025。

看牌用 `searchTopExceptNameBottom`。視窗裡的每一張都留在畫面上，被排除的名字不能選。退場上限用 `retireOppFrontUnderBp` 的 `traitExceptName`：自己場上該特徵、名字不是例外的正面角色達到 `min` 張，上限改成 `bonusBp`。綠谷自己不算進這 3 張。

## 第二彈這輪可直接抄的句子

新操作都不看卡號。整句對得上才標 ready。下面是封閉形狀。

`restTraitHandOutsideDraw` 是角色的 `mainAbility`。`trait` 是一個特徵，`draw` 只能是 1。主要階段、這張卡活動，而且手牌裡有該特徵，才可以發動。休息後必須選 1 張該特徵手牌放到場外，然後才抽 1。沒有合格手牌就不能發動。不能選的手牌不出現在選項裡。

搭配既有被動 `extraEnergy`，條件 `ownDistinctTraitNames`、`min:3`、`turn:'any'`、`zone:'fieldOutside'`、`excludeSelf:false`。受益是 MHA-2-003。

```js
mainAbility:{op:'restTraitHandOutsideDraw', trait:'ワン・フォー・オール', draw:1}
passiveBonuses:[{extraEnergy:1, condition:{
  kind:'ownDistinctTraitNames', turn:'any', zone:'fieldOutside',
  excludeSelf:false, trait:'ワン・フォー・オール', min:3
}}]
```

`deployTraitFromZones` 只放在登場時。`trait`、`zones`（`hand` 與／或 `outside`）、`line`（`front`、`energy` 或 `any`）、`ready`、`optional:true`、`max:1`。最多選 1 張該特徵的角色，從指定區域休息或活動放到指定線。可以不放。不能放上那條線的角色不進選項。登場後照常發那張卡自己的登場時。受益是 MHA-2-026。026 另外用既有的 `playBanOtherTrait`、`distinctNameHandEnergy`、`printedImpact:1`。

```js
effects:{onPlay:[{
  op:'deployTraitFromZones', trait:'ワン・フォー・オール',
  zones:['hand','outside'], line:'energy', ready:false, optional:true, max:1
}]}
```

`searchTopOneBottomDiscard` 可以是一個名字加一個特徵、`logic:'any'`、`discard:false`。看牌頂，公開最多 1 張符合名字或特徵的卡，其餘放牌底，不棄手牌。視窗裡的每一張都留在畫面上。後面接既有 `{op:'recoverAp', count:1}` 時，不管有沒有拿到，都最多活動 1 張 AP。受益是 MHA-2-037。

```js
effects:{onPlay:[
  {op:'searchTopOneBottomDiscard', count:4, logic:'any', discard:false,
   filters:[{field:'name', value:'緑谷 出久'}, {field:'trait', value:'ワン・フォー・オール'}]},
  {op:'recoverAp', count:1}
]}
```

兩個名字、`logic:'any'`、不寫 `discard`，仍是既有的「有拿才棄 1 張手牌」。受益是 MHA-2-043 的登場時。

`restRetireThen` 是角色的 `mainAbility`。`then` 目前只有 `{op:'drawDiscard', count:1}`。主要階段、這張卡活動，而且牌庫或手牌至少有 1 張，才可以發動。先休息，退場自己，然後抽 1，再把 1 張手牌放到場外。受益是 MHA-2-043。

```js
mainAbility:{op:'restRetireThen', then:[{op:'drawDiscard', count:1}]}
```

`payApDraw` 是角色的 `mainAbility`。`oncePerTurn:true`、`draw:1`。主要階段、這張卡這個回合還沒用過、有 1 張活動 AP，才可以發動。付 1 AP 後只抽 1。不休息，也不加發生能源。前排與能量列都能發動。受益是 MHA-2-044。

```js
mainAbility:{op:'payApDraw', oncePerTurn:true, draw:1}
```

`ownOutsideTraitCountAtLeast` 是被動條件。`turn` 是 `own`、`opponent` 或 `any`，`trait`，`min`。只數自己場外有該特徵的卡，不分角色或場域。蓋在卡下的牌、手牌、移除區與對手場外不算。搭配既有 `attackDamage:2`。受益是 MHA-2-048。

```js
passiveBonuses:[{attackDamage:2, condition:{
  kind:'ownOutsideTraitCountAtLeast', turn:'any', trait:'死穢八斎會', min:6
}}]
```

這輪沒有把剩下的句子標成 ready。那些整句仍然對不上現有操作。

## 前排保護、退場移線、三種名字後退場

`whileFrontNameUnchosen` 是角色卡。`name` 是印刷名字。這張卡在前線且效果沒有失效時，對手寫有「選び」的效果不能選自己場上那個名字的角色。離開前線就結束。攻擊與阻擋不受影響。受益是 MHA-2-011。

```js
whileFrontNameUnchosen:{name:'緑谷 出久'}
```

`mayShiftOwnCharacter` 可以掛在角色的 `effects.onRetire`。退場後最多把 1 張自己的角色移到另一條線，可以不做。目的地滿格時先把 1 張放進移除區。受益是 MHA-2-016。

```js
effects:{onRetire:[{op:'mayShiftOwnCharacter'}]}
```

`gatedRestRetireThen` 是場域的 `mainAbility`。能量列、這張卡活動、`when` 成立、後續的名字在場上，才可以發動。`when` 目前是 `ownDistinctTraitNames`。先休息，沒有 `payHand` 就退場自己；`payHand:1` 時必須先把手牌 1 張放到場外，然後才退場。`then` 的第一句是下面四個其中一個，第二句只能是 `{op:'draw',count:1}`。

```js
mainAbility:{
 op:'gatedRestRetireThen',
 when:{kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',excludeSelf:false,trait:'ワン・フォー・オール',min:3},
 then:[
  {op:'grantNamedCharacterSniperShield',name:'緑谷 出久'},
  {op:'draw',count:1}
 ]
}
```

`grantNamedCharacterSniperShield` 選 1 張該名字。直到自己下個回合開始，不被對手的角色效果選取，也不能被狙擊指定。對手事件的「選び」仍可選。受益是 MHA-2-029。

`activeOwnNamed` 的 `optional:false` 是必須選，不能跳過。受益是 MHA-2-031。

```js
then:[{op:'activeOwnNamed',name:'緑谷 出久',max:1,optional:false}]
```

`grantNamedSniperThisTurn` 給選到的角色本回合狙擊。搭配 `payHand:1`。受益是 MHA-2-032。

`buffNamedThisTurn` 的 `bp` 是 500 的倍數，最高 5000。受益是 MHA-2-033 的 2000。

```js
then:[{op:'buffNamedThisTurn',name:'緑谷 出久',bp:2000},{op:'draw',count:1}]
```

這輪標成 ready 的是 MHA-2-011、016、029、031、032、033。其餘 21 張整句仍對不上，沒有標 ready。

## 指名加成、特徵退場抽牌、觸發改退場、印刷三選、手牌起動、BP 規則

`frontOnceNamedKit` 是角色的 `mainAbility`。前排、休息、每回合一次。場上要有指定名字才能發動。先休息，再必須選那張角色，本回合 BP 增加並且衝擊 1。做到之後，最多把這張卡或 1 張休息中的 AP 活動，可以不做。沒有依卡號分支。受益是 MHA-2-020。

```js
mainAbility:{
 op:'frontOnceNamedKit',frontOnly:true,oncePerTurn:true,
 name:'緑谷 出久',bp:1000,impact:1,thenActive:'selfOrAp'
}
```

`grantTraitLeaveDraw` 掛在角色的 `effects.onPlay`。這個回合，自己場上其他持有該特徵的卡退場時，最多抽 1，每回合一次。拒絕抽牌不消耗次數。受益是 MHA-2-024。

```js
effects:{onPlay:[{op:'grantTraitLeaveDraw',trait:'ワン・フォー・オール',oncePerTurn:true,count:1,optional:true}]}
```

`triggerLeaveRest` 是場域自己的規則，不是 `effects`。自己回合、對手的觸發會讓指定名字離場，而且 `when` 成立時，可以改退這張場域，並把那張角色休息。可以不改。角色效果、事件、對手的回合、BP 0 的規則退場都不算。受益是 MHA-2-030。

```js
triggerLeaveRest:{
 turn:'own',cause:'trigger',name:'緑谷 出久',rest:true,
 when:{kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',excludeSelf:false,trait:'ワン・フォー・オール',min:3}
}
```

`choosePrintedOptions` 多了一組三句的封閉形狀，沒有改動原來的兩句。最多選 2 個不同句子，依印刷順序結算，同一句再點一次會取消。可以一個都不選。三句依序是休息最多 1 張對手前排、從手牌把必要能量已滿足且消費 AP 為 1 的角色活動登場或突襲、自己場上全部角色本回合 BP+1000。受益是 MHA-2-036。Q1005、Q1006 只記在測試，不是整包 FAQ 驗收。

`playRequiresOtherTrait` 是事件的使用條件。自己場上要有指定數量、持有該特徵、而且不是排除名字的角色。受益是 MHA-2-036 的 3 張〈緑谷 出久〉以外的 A組。

`optionalRemoveHandGrantMains` 掛在角色的 `effects.onPlay`。可把 1 張有起動主要、沒有突襲、顏色相符、而且不是排除名字的手牌角色放進移除區。做到才抽 1，並把那張卡的起動主要交給自己場上最多 1 張角色，直到這個回合結束。可以不放。受益是 MHA-2-038。

`frontOnceGrantBpRules` 是角色的 `mainAbility`。前排、每回合一次，不休息。必須選 1 張對手前排。這個回合，那張卡第一次受到 BP 減少時再減 500，而且因 BP 0 以下的規則退場時改放進移除區。其他原因的退場仍到場外。受益是 MHA-2-040。

```js
mainAbility:{op:'frontOnceGrantBpRules',frontOnly:true,oncePerTurn:true,echoBp:500,zeroToRemoved:true}
```

`frontOnceOppDownSelfUp` 是角色的 `mainAbility`。前排、每回合一次，不休息。必須選 1 張對手前排，同一結算裡那張卡 BP 減少，這張卡 BP 增加。受益是 MHA-2-042。

```js
mainAbility:{op:'frontOnceOppDownSelfUp',frontOnly:true,oncePerTurn:true,bp:1000,selfBp:1000}
```

這輪標成 ready 的是 MHA-2-020、024、030、036、038、040、042。第二彈目前 59 張 ready。仍未 ready 的是 MHA-2-046、050、051、053、054、056、057、062、066、067、068、069、070、072。
