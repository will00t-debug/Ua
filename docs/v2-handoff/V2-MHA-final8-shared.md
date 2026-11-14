# MHA 最後八張共用契約

這份契約給 C、D 沿用。分支是 `cursor/v2-mha-final-integrate-65f8`。能力都寫在既有共用 DSL，沒有依卡號另開分支。030 與 042 的印刷是アクティブ，登場後是活動，不是橫置。

IMC 113／113，`playable:true`。MHA 109／109 ready，pending 0，`playable:false`，版本 `mha-ua10-ready-109`。`UA10ST_PRODUCT.recipe` 維持 null。`d67790a6414059679474e3488876886aee1040a9` 仍是祖先，#459 的衝擊選血與突襲底板留著。介面檔沒有改。沒有合併 `main`，也沒有部署。通過測試不是官方 FAQ 驗收。

## 指名區域重複活動登場

`deployNamedFromZones` 增加 `any:true`。`color:null` 可以和 `ap`、`maxEnergy` 同時存在，代表不限顏色，能量與 AP 仍要檢查。`ready:true` 是活動登場。`optional:true` 時可以選零張。

成功放上一張之後，同一句會排在那張卡的登場時效果之前，所以可以再選下一張。選跳過就不再排。手牌與場外裡符合條件的卡都會出現，能量或 AP 不符的留在畫面上但不能選。已經離開的目標不能選。

## 場外回收後橫置或突襲

`deployOwnHandRestOrRaid` 在設了 `trait` 且 `requireAffordableEnergy:true` 時，允許 `color:null` 與 `maxEnergy:null` 同時存在。先走既有的 `recoverOutsideAny`，再從手牌把付得起能量、AP 符合的該特徵角色休息登場或突襲。沒有顏色篩選。跳過回收之後，手牌裡符合的卡仍可登場。付不起或特徵不符的不進選項。

## 前線持續消除對手七種能力

角色欄位 `frontStripsOppAbilities` 是 `step`、`sniper`、`doubleAttack`、`doubleBlock`、`impact`、`damage`、`impactNull` 的子集。來源在對手的前線、且沒有被沉默時才生效。離開前線或被沉默後恢復。這是持續壓制，不是把關鍵字從卡上刪掉。

狙擊包含本回合授予的狙擊。衝擊同時壓 `インパクト1` 與 `インパクト+1`。傷害同時壓 `ダメージ2` 與 `ダメージ+1`。沒有傷害關鍵字的卡仍造成 1 點傷害。雙重攻擊與雙重阻擋在宣告當下不再把角色活動。登場時沿用 `restOppFrontOne`，可以跳過。

## 其他活動角色回手後才活動登場

`{op:'returnOtherActiveThenHandActive', excludeName, optional:true, color, maxEnergy, ap}`

只放在角色的登場時。選項是其他活動前線角色，名稱不是 `excludeName`，也不包含自己。休息的角色不進選項。成功回手之後，才從手牌把符合顏色、能量與 AP 的角色以活動狀態放到場上，不提供突襲。跳過，或回手失敗，都不登場。已經離開的目標不能選。

## 前線數量的能源與 AP 減免

`gatedHandDiscount:{ownFrontAtMost, oppFrontAtLeast, energy, ap}`

只數前線角色。能源削減用在手牌與生命，所以顏色觸發在條件成立時也能打出。AP 削減用在手牌登場與突襲。這不是放寬 `emptyOwnFieldHandEnergyDiscount` 的 5 點上限。`energyLineForbidden` 與 `printedImpact` 是既有欄位。

`oppAttackReadyBp` 是負的 500 倍數。對手角色宣告攻擊時，若這張仍在場上且為休息，才提供活動。`attemptFieldActive` 成功且之後確實是活動，才給當回合 BP。已經寫著不能活動時，不活動也不降 BP。已經是活動的不提供。跳過不消耗那次活動限制。

## 前線有空位才付手牌加 BP

`{op:'payHandOutsideIfFrontOpen', bp}`

只放在角色的 `onAttack` 或 `onBlock`。結算時前線要有空位，而且手牌還在。把 1 張手牌放到場外，理由是 `own-effect`。付成功才加當回合 BP。沒有空位、沒有手牌，或跳過，都不加。阻擋時這筆 BP 在戰鬥比較之前生效。來源已經離開則不加。

## 付手牌移動自己，移動過則雙重攻擊

`doubleAttackIfMovedThisTurn:true`。這個回合只要這張卡在前線與能量線之間完成移動，攻擊後會再活動。這筆記在卡上，不佔用移動階段的那一次移動。

起動是 `{op:'payHandMoveSelf', oncePerTurn:true, pay:1}`。付 1 張手牌到場外，理由是 `payment`，然後只移動自己到另一列。目的地滿了，先把 1 張佔位角色放進移除區，再移動。這不是 `payHandMoveOrSwap`。每回合一次。手牌付不出時不移動。

## 自己效果把手牌放場外後休息抽牌

場域的 `moveObserver` 可以是 `{op:'restActiveFieldDraw', once:'name', draw:1, when:{from:'hand', to:'outside', reasons:['payment','own-effect']}}`。

自己的回合、自己的效果或效果支付把手牌放到場外時，活動中的這張場域可以休息並抽 1。同名每回合一次。跳過不消耗這一次，後面的同名仍可休息。接受之後，另一張同名不再提供。規則移動，例如打出事件，不觸發。來源不必還在場上。

角色用的 `restSelfTuckMovedFaceDown` 維持原樣，仍要求來源在場上。場域監聽不會走進那個角色處理。
