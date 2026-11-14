# 第 15 輪 A 組共用操作

基準是第 14 輪 `8195a7a2c680a62ddb0516db83a9287772a3bcc9`。沒有整支合併 #447、#448 或 #445。#445 的基準是第 12 輪，只移植卡號別名、對戰預覽的卡圖與效果，以及預組驗收測試。

IMC 對戰包維持 113／113，`getTitle('imc').playable` 維持 true。MHA 以程式清點是 77 張 ready、32 張 pending、目錄 109 張，`getTitle('mha').playable` 維持 false。新進包的是 006、007、009、010、017、048、056、059、071、074、087、089、093。下面的新操作沒有把任何卡標成 ready。`UA10ST_PRODUCT.recipe` 與 IMC 官方預組張數維持 null。

## 前線已滿時先移出

`{op:'moveEnergyTraitToFront', trait:null, max:1, whenSelf:'front', optional:true}`

有空位時仍是 9 個鍵的 `effect-energy-trait-front`。前線已滿、能量列還有可移動的角色、而且這張仍在前線時，先開 `effect-front-vacate`。鍵是 `kind`、`player`、`sourceUid`、`choices`、`optional`，共 5 個。行動型別是 `chooseFrontVacate`。

可以跳過。跳過不移出，也不移動。選到的卡用 `removeOwnedField` 放進移除區，不是退場，也不觸發退場效果。然後才開能量列移動。移出的是別人時，移動 pending 仍是 9 個鍵。移出的是能力來源自己時，多一個 `vacated:true`，共 10 個鍵，來源已經不在前線也能完成移動。Q456、Q457。

沒有手牌或 AP 支付。能量列沒有可移動的角色時只剩跳過。選擇前已經出現空位時只剩跳過，跳過之後才開移動。被保護的前線卡不進選項。對手的卡、能量列的卡、已經離開的卡，以及第二次移出，都不合法。

有特徵的舊形狀仍是 7 個鍵。076 的程式沒有寫，維持 pending。

## 可選磨牌後回收

`{op:'millUpToThenRecover', count:3, optional:true, recover:{zone:'outside', max:1, optional:true, anyOf:[...]}}`

`anyOf` 是 1 到 3 個 `{field:'trait'|'name', value}`。可以另加 `excludeName`。牌庫是空的不開 pending。跳過代表 0 張，不回收。至少磨 1 張之後，才可從場外回收 1 張符合任一條件的角色。中途停止也一樣。目標離開場外就不能再選。

主階段先橫置再退場的後段可以是 `{op:'recoverOutsideAny', zone:'outside', max:1, optional:true, anyOf:[...]}`。

002 維持 pending。

## 起動張數與手牌能量

`{kind:'ownActivateMainAtLeast', turn:'any', zone:'field', min:3}`

數自己場上帶【起動メイン】的角色。只有寫在突襲框、而且這張目前不是正面突襲的，不算。沉默與蓋放的卡不算。被動 `{bp:1000, condition}` 會在條件成立時加 BP。

`handEnergyWhileActivateMain:{min:3, amount:3}` 只減手牌區的必要能量。004 的印刷衝擊仍用既有欄位。複製同列其他角色的【起動メイン】還沒有共用操作，004 維持 pending。003 的被動句已經能寫，這輪不寫程式，也維持 pending。

## 攻擊、阻擋與傷害

`battleRequiresAnyName` 是 1 到 3 個卡名。場上沒有任一張時，這張不能攻擊，也不能阻擋。

`{op:'frontOnceProgram', frontOnly:false, oncePerTurn:true, then:[{op:'grantSelfAttackDamageThisTurn', amount:2}]}` 讓這張本回合傷害成為 2。`amount` 不是 2 會被拒絕。

`blockSkipsNextActive:true` 在阻擋成立、這張被橫置之前，先給阻擋者 `skipNextActive`。下一次要活動時維持橫置，並用掉這一次。

`{op:'frontOnceProgram', frontOnly:false, oncePerTurn:true, then:[{op:'grantSelfMustBlockThisTurn'}]}` 讓這張本回合的攻擊在對手有合法阻擋者時不能放棄阻擋。

005 與 011 維持 pending。

## 支付手牌後活動

`{op:'payHandThenActive', optional:true, maxEnergy:3, excludeName}`

放在 `oncePerTurnGate` 的後段。手牌是空的就不提供這次起動，也不消耗一回合一次。跳過不支付、不活動。支付的手牌放到場外，理由是支付。然後活動最多 1 張其他角色：不是被排除的名字，必要能量不大於 `maxEnergy`。沒有這樣的角色時，支付不退回。目標在選擇前離開就不在選項裡。

060 維持 pending。

## 具名活動登場與全體 BP

`enterActiveIfName` 是一個卡名。打出或效果登場時，場上已經有這個名字，這張才活動登場。沒有就維持橫置。

`fieldRestRetireThen` 的後段可以是 `{op:'buffOwnField', filter:{field:'type', value:'character'}, bp:500, optional:false, excludeSelf:false, all:true}`。先橫置並退場，再給當時場上每一張符合的角色本回合 BP，不另開選擇。

062 維持 pending。

## 無上限的休息登場

`{op:'deployOwnHandRest', type:'character', color:'green', trait:null, max:1, optional:true, thenActiveIf:{name, oppFrontAtLeast:3}}`

不寫 `energy` 與 `ap`。`energy:null` 仍不合法。登場後先橫置。名字符合，而且對手前線角色至少有指定張數時，改為活動。手牌裡的那張在選擇前離開就不能再選。

066 的看頂 3 張仍用既有的 `lookTopScript`。這句是看完之後的另一句。066 維持 pending。

## 任意棄牌

`{op:'discardUntilHand', until:3, optional:true}`

`{op:'discardThenRetireScaled', per:1000, optional:true}`

跳過整句時，已選張數必須是 0，不抽牌、不退場。停止時以當時選過的張數結算，包含 0 張。補到手牌的那句，手牌少於 3 就抽到 3，牌庫不夠就停。退場那句的上限是張數乘 1000；0 張不開退場。選到已經不在手牌的卡不合法。

072 維持 pending。

## 生命二選一

`chooseOne` 的選項可以帶 `when:{kind:'oppLifeAtLeast', turn:'any', min:5}`。後段 `{op:'damagePlayer', amount:1}` 取對手最上面 1 張生命。生命是 0 時，這步以生命歸零結束。另一個後段是 `{op:'restOppFrontOne', optional:true, skipNextActive:true}`。

條件在提供選項時檢查，結算時再查一次。生命不夠時傷害選項不提供；選項開著的時候條件消失，再選它會被拒絕。`amount` 不是 1，或休息句少了 `skipNextActive`，都會被拒絕。

081 維持 pending。

## 下一次 BP 範圍

`{op:'frontOnceProgram', frontOnly:true, oncePerTurn:true, then:[{op:'grantNextBpWindow', amount:1000}]}`

只加在控制者下一次實際開出選項的 BP 上限：`retireOppFrontUnderBp`、`removeOppFrontUnderBp`、`restOppFrontUnderBp`。開出選項時這個加值歸零。不是永久 BP。`amount` 不是 1000 會被拒絕。`bpWindowPlus` 若存在，必須是兩位玩家各一個 0 到 5000、且為 500 倍數的整數。

084 維持 pending。

## 仍缺的引擎能力

004 複製同列其他角色的【起動メイン】，其他オール・フォー・ワン除外，仍然沒有。手牌能量減免與印刷衝擊不能單獨標 ready。

038 的蓋牌張數雙重阻擋與雙重攻擊、085 依蓋牌張數的 BP、090 攻擊時看蓋牌入手再活動、099 依手牌張數改退場上限，以及其他仍列在請求檔的整句，這輪都沒有解鎖。

下一輪共用操作契約在 `docs/v2-handoff/V2-MHA-shared-next.md`。上面這段是第 15 輪結束時的狀態。
