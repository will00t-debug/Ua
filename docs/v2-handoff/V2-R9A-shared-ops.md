# 第 9 輪 A 組共用操作契約

基準是 PR #424 的 `cursor/v2-round8-integrate-65f8`。這一輪的工作分支從該分支尖端 `499cce59` 開出；`499cce59` 已包含指名的 `b87a14fa`，多出來的只有 40 毫秒現場攻擊決策的重試。

這一輪只改共用引擎、效果驗證、即時條件與共用回歸測試。沒有編寫 IMC 或 MHA 的逐卡程式，沒有把任何一張標成 `ready`，也沒有把作品設成 `playable`。IMC 對戰包維持 106 張。MHA 維持封閉目錄。官方預組 `counts` 維持 null。

B、C、D 可以照下面的形狀寫卡。整句測試通過之前，不要標 `ready`。不要用卡號分岔解決這些句子。

## IMC 最後 7 張：句子已經在，程式不要從這裡移植

011、012、039、051、061、075、107 的共用操作在 #424 上已經存在。這一輪沒有重寫它們。卡片維持不在 `createImcV2Pack`。

| 卡 | 已有形狀 | 誰寫程式 |
| --- | --- | --- |
| IMC-1-011 | `bpGainFollow:{bp:1000}` | B |
| IMC-1-012 | `bpGainFollow:{bp:500}`；`onPlay` 為 `grantConditionalSniperThisTurn`，`minBp` 7000；`onAttack` 為 `drawIfSelfBpAtLeast`，`bp` 5000、`count` 1；`raidName` 為城ヶ崎 莉嘉 | B |
| IMC-1-039 | `ownEffectPresenceBp:1000`；起動 `discardExactFrontMove`，`line` energy、`dest` front、`attackEnd` energy、特徵ガールズ・イン・ザ・フロンティア、`count` 3 | B |
| IMC-1-051 | 保留現有 `onPlay` 的 `recoverOutsideFiltered`。`mainAbility` 用 `restRetireSequence`，`gate` 為 `oppCharacterBpAtLeast` 4500，`then` 為藍色 LiPPS、`maxEnergy` 2、`ready` false、`optional` true 的 `deployOutsideColorTraitRest` | C |
| IMC-1-061 | `unblockedAttack` 的 `then` 為 `draw` `count` 1。`onPlay` 先 `activeSelf`，再 `optionalReadyApThen`，`then` 恰好是 `grantAttackPhaseEndHand` | C |
| IMC-1-075 | 回手再休息登場仍是整句：`bounceOwnOtherUnderEnergy`，`optional`、`energy` 1、特徵お願い！シンデレラ，`then` 為 `deployOwnHandRest`，`ap` 寫 null。6 種卡名 BP 用下面既有被動，不要新欄位 | C |
| IMC-1-107 | `mainAbility` 用 `restRetireSequence`，`draw` 1，`then` 為 `deployOwnHandRest`：`character`、`red`、`energy` 3、`ap` 1、`max` 1 | D |

075 的被動沿用第七輪，種類數不滿 6 是印刷 BP，對方回合不加：

```js
passiveBonuses:[{bp:1000,condition:{
 kind:'ownDistinctTraitNames',turn:'own',zone:'fieldOutside',excludeSelf:false,
 trait:'お願い！シンデレラ',min:6}}]
```

回手句寫完之前，075 維持 `ready:false`。

### PR #410 不能當成 IMC-1-107 已完成

#410（`cursor/imc-d-round7-107-093-ed0c`，`3cb74d1dd7c5`，基準是更早的 `cursor/imc-round6-integrate-65f8`）只改三個檔：`programs-starter.mjs`、`requests-starter.mjs`、`tests/v2-imc-starter.test.mjs`。它沒有引擎改動。107 的句子是既有的 `restRetireSequence`，抽 1，再接紅色、能源 3、AP 1、最多 1 張的 `deployOwnHandRest`。同一提交把 107 標成 `ready:true`，測試也改了預組 ready 張數。

不能把那次提交摘進來。D 組以後寫 107 時，可以複製上面的 `mainAbility`，並用目前 #424 的引擎與測試重跑。複製之前不要標 ready。

## 這一輪新解鎖的共用形狀

沒有新增操作名稱。既有操作多了可選欄位，或把本來就合法、卻被缺口摘要寫成不能用的普通形補上測試。

### 前線角色張數

`oppFrontCountAtLeast` 與 `ownFrontCountAtLeast` 可以放進 `passiveBonuses` 與 `ifLiveThen` 的 `when`。鍵只有 `kind`、`turn`、`min`。`turn` 是 `any`、`own` 或 `opponent`。`min` 是 1 到 4。0 與 5 非法。

只數該玩家前線上、正面朝上的角色。能量線、場域、空位、蓋牌不算。對方的前線是另一個數字。

MHA-1-106：

```js
passiveBonuses:[{bp:1000,condition:{
 kind:'oppFrontCountAtLeast',turn:'any',min:3}}]
```

少於 3 張沒有這 1000。能量線上的角色、蓋牌與自己的前線都不計入對手張數。

MHA-1-108。額外點數跟這張場域的印刷顏色走，綠場域就是再 +1 綠。少於 2 張時只有印刷發生量：

```js
passiveBonuses:[{extraEnergy:1,condition:{
 kind:'ownFrontCountAtLeast',turn:'any',min:2}}]
```

`turn:'own'` 會在對方回合掉回印刷發生量。印刷句子若沒有寫自己回合，用 `any`。

MHA-1-107 的登場抽牌。突襲框與衝擊仍是卡欄 `raidName:'緑谷 出久'`、`printedImpact:1`，不是新操作：

```js
{op:'ifLiveThen',
 when:{kind:'oppFrontCountAtLeast',turn:'any',min:3},
 then:[{op:'draw',count:1}]}
```

對手前線 2 張不抽。3 張抽 1。`then` 仍只能是既有的單步；這次確認 `draw` `count` 1 可以接在這裡。

MHA-1-045、066 之後若要「對手前線至少 3 張」，用同一個條件。045 的手牌減免、衝擊與攻擊反應，066 的綠角色休息登場與歐爾麥特改活動，都還沒有操作。

### 登場於前線才維持到自己下回合開始的 BP

MHA-1-102 的傷害 2 與自己回合 BP+1000 維持 `printedAttackDamage`、`ownTurnBp`。新的只有登場句：

```js
{op:'buffSelfUntilNextOwnStart',bp:1000,line:'front'}
```

這是角色的直接 `onPlay`。結算時來源在前線才寫入；在能量線則不加，也不丟錯。加值記到自己的 `ownTurns+1`，對方回合仍在，自己下一個開始階段消失。

`line:'energy'`、`bp` 0、事件的 `onPlay`，以及沒有 `line` 的直接 `onPlay`，都仍非法。沒有 `line` 的舊形必須留在既有的 `chooseOne`（`entry:'ownEffect'`）或既有 `mainAbility` 裡，能量線登場仍會加上。不要為了 102 去改那些舊形。

### 選一張自己的角色：本回合 BP、戰鬥勝利抽牌，名字符合才給狙擊

MHA-1-063 的特殊觸發維持既有形，不要寫進 `onPlay`：

```js
trigger:'special'
triggerEffect:{op:'retireOppFront'}
```

登場句必須是事件的 `onPlay`。`bp` 固定 2500，`optional` 固定 false，不能跳過。`sniperName` 與 `sniperNames` 二擇一。SAO 的單一名稱 `sniperName` 沒有改。063 用陣列，1 到 4 個不同名稱：

```js
{op:'grantOwnFieldAttackKit',bp:2500,optional:false,
 sniperNames:['オールマイト','緑谷 出久']}
```

空場直接結束。不能選對方角色。選中的角色得到本回合 BP+2500，以及 `attackWinDrawGranted`：這次攻擊戰鬥勝利才抽 1，阻擋勝利也算。名稱比對用 `cardHasName`，印刷別名算，被沉默的別名不算。只有名稱命中才寫 `eventSniperGranted`。沒有命中的角色仍有 BP 與勝利抽牌，不能指定狙擊目標。

不要改用 `grantNamedBuffAttackDraw` 或 `eventAttackDrawGranted`。前者把名稱鎖在授權之前，後者是宣告攻擊就抽。

### 攻擊時可放棄的目前 BP 上限退場

MHA-1-105 不用新操作。普通形本來就可以寫 `optional`。這一輪只補合法與非法測試，沒有放寬 `retireOppFrontAtMostBp` 的 5000 鎖：

```js
{op:'retireOppFrontUnderBp',bp:2500,optional:true}
```

上限讀的是目前 BP。2500 的前線角色可選，3000 與能量線不可選。可以跳過。`optional:false` 沒有跳過。沒有合法目標時，沿用既有的「強制效果沒有目標就繼續」路徑。BLC-4-021 的 `{op:'retireOppFrontUnderBp',bp:5000,optional:false}` 維持原樣。

### 查看牌頂，公開最多一張角色，指定名稱才再抽

MHA-1-109：

```js
{op:'lookTopScript',count:5,rest:'bottom',takes:[{
 to:'hand',max:1,publish:true,type:'character',
 thenDrawIfName:'緑谷 出久'
}]}
```

`count` 仍是 1 到 10。視窗公開給操作者看，事件、場域與不能選的角色都留在視窗裡，不能選的不能拿。對方的私人選擇是 null，公開待決區不放那些 uid。公開的只有實際入手的那一張。其餘先排進牌底，順序決定完成後，才依名稱抽 1。跳過不公開、不抽。名稱用 `cardHasName`，`thenDrawIfName` 是參數，不是寫死的卡號。省略 `thenDrawIfName` 就是只公開入手、不附帶抽牌。

MHA-1-066 的「看 3 張、最多公開 1 張角色入手、其餘放牌底」用同一個 `takes`，不要加 `thenDrawIfName`。後面的綠角色休息登場，以及對手前線 3 張以上且該角色是歐爾麥特才改活動，仍沒有操作。066 不要標 ready。

`type:'event'`、空的 `thenDrawIfName`、以及 `publish:true` 卻沒有 `type:'character'`，都非法。`publish:false` 的任意卡入手舊形沒有改。

### 活動生命觸發

MHA-1-101 已經是通用觸發，這一輪沒有改 +3000。卡欄是 `trigger:'active'`，`triggerEffect` 必須是 null。不要把句子寫進 `onPlay`。

結算時選自己場上 1 張角色（前線或能量線），使其活動，並給本回合 BP+3000。Q101：已經活動的角色可以選，維持活動並仍得 +3000。場域與對方角色非法。可以跳過。`suppressActive` 仍會禁止這個選項，AOT-1-025 的壓制要留著。

### 具名突襲可從能量線移到前線並活動

MHA-1-107 的「〈緑谷 出久〉にレイドしアクティブでフロントへ移動できる」是既有 `raidName`。能量線上的具名底板可以突襲到前線空位，上層活動，底板留在 `stack[0]`，原能量格清空；也可以留在同一個能量格。前線上的底板只能突襲到自己所在的那一格，不能換格。

前線目的地的合法行動不帶 `line`，引擎把省略的 `line` 當成前線。留在能量線的行動才寫 `line:'energy'`。不要在測試裡找 `line:'front'`。

## MHA 001–100 仍待共用能力

下面依這一輪的優先順序歸類。請求檔裡有些句子寫「還沒有」，但引擎已經有；那些不要再請 A 組重做。其餘整句仍不能標 ready。

### 1. 可共用的發動時機

- 018：主階段每回合一次，給予「本回合攻擊戰鬥勝利時抽 1」。`grantSelfAttackWinDrawThisTurn` 仍只接登場時。
- 096：自己的效果把手牌放到場外的當下，可休息這張活動中的場域並抽 1，一回合一次。
- 013、014：生命放入手牌之後才接回復或退場。
- 091：攻擊時與阻擋時都要，而且要先看到自己前線有空位。

### 2. BP 與能源條件

- 003、004：計數帶【起動メイン】的角色。現有被動看特徵、卡名或前線張數，不看這個關鍵字。
- 027：自己前線有〈オーバーホール〉才 BP+1000。這句已經是 `ownNameExists`，`zone:'front'`。能量線不算。請求檔的「還沒有」已過時，由持有該卡的組別寫被動即可，不要新條件。
- 055，以及 MHA-1-051 的退場句：其他角色的印刷必要能源達到門檻的張數。`ownFrontCountAtLeast` 只數張數，不讀必要能源。
- 089：手牌在抽牌前是 3 張以下才抽 1。現有的是 `ownHandCountAtLeast`，沒有「以下」。087 的「抽到手上正好 2 張」也還沒有。
- 099、100：依其他手牌張數或具名在場改退場上限，以及 100 的全體休息。`bonusName` 不能代替手牌張數。

### 3. 多步驟效果與支付

- 006：支付 1 張手牌後，二選一移動或交換。
- 002、026：可選磨牌後的二選一或例外回收。
- 025：看頂 4 張，特徵或指名卡公開入手，有拿才棄 1 張手牌。
- 031、042、059、060、062、070、071、072：支付、登場方式或張數上限與現有單步不同。072 的「抽到 3 張」與「張數×1000」仍是一組。
- 066：看角色的前半已解鎖；綠角色休息登場與條件改活動還沒有。

### 4. 卡片移動與代替處理

- 001、048、074、093：離場改為留下，或改付生命。保護對象、次數與支付各不相同，不能用現有的選擇保護近似。
- 076：登場時自己在前線，才可把最多 1 張能量線角色移到前線，沒有特徵。`moveEnergyTraitToFront` 仍必須有特徵。
- 007、009、010：自己回合的戰鬥敗北改區域。
- 017、020、029、030、033：突襲疊底登場、任意突襲基、下方卡、退場區。退場區不是場外。

### 5. 特殊攻擊、防禦與觸發

- 011：擋過這張的角色下一次不回復。必須阻擋仍是另一句，而且現有形是登場時。
- 035：前排時一次剝除步進、狙擊、雙重攻擊、雙重阻擋、衝擊、傷害與衝擊無效。
- 038、056、085、090：蓋牌張數、蓋到具名角色下、依蓋牌加 BP、攻擊時再處理蓋牌。
- 051：BP 3000 以下不能被阻擋，方向與現有 `blockBpRestriction` 相反；退場句還要必要能源張數。
- 053：攻擊時在本回合 BP+1000 與衝擊 1 裡正好選一個。
- 054：看頂 7 張，公開最多 1 張綠、必要能源 2 以下的場域。角色公開入手不能拿來代替場域。
- 081、084、095：生命條件傷害、下一次 BP 範圍 +1000、移動過才得到 2 回攻擊。

## 測試

`tests/v2-round9-a-shared.test.mjs` 用合成卡。它確認上述合法形會改變盤面，非法形在建包或出牌時被拒絕。第 10 輪整合之後，IMC 那 7 張已用這些操作寫進程式並在對戰包裡；MHA 預組 063、101、102、105、106、107、108、109 仍不在對戰包。

## 第 10 輪之後

012、019、027、053 已由持有卡片的組別寫成 ready。027 用的是前線 `ownNameOrRaidBase`，名字是オーバーホール。053 用現有 `chooseOne`，攻擊時在 BP+1000 與本回合衝擊 1 裡正好選一個。上面的缺口清單保留第 9 輪當時的判斷，不再代表這 4 張仍缺指令。

其餘 MHA pending 維持 60 張。手牌張數上限抽牌、其他角色必要能源張數、每回合一次的戰鬥勝利抽牌、沒有特徵的前線移動、離場置換，以及非角色的看牌篩選，仍是下一輪的共用缺口。066 的看角色前半已可寫，綠角色休息登場與歐爾麥特改活動還沒有。預組 8 張的共用形已經存在，程式與行為測試還沒寫，request 維持 pending，`recipe` 維持 null。
