# V2 C22｜三副指定 BLEACH 牌組交接

時間：2026-10-24 18:36（台北，UTC+8）

分支仍是 `cursor/v2-blc-three-decks-6ff5`。沒有改 `dist/universal-v2/ai.mjs`，沒有合併 main，沒有部署。

已驗證的藍卡提交是 `068b8ce1c3e00ad44a365606ea3a26bf54f82e25`，Actions [40079041661](https://github.com/will00t-debug/Ua/actions/runs/40079041661) SUCCESS。已驗證的綠卡提交是 `ba2cf8fae9978ac833e4ccf4fd505d9f340017b7`，Actions [40083017238](https://github.com/will00t-debug/Ua/actions/runs/40083017238) SUCCESS（2026-10-24 17:42 台北）。本輪紫卡提交自己的 Actions 成功之前，不要把新的 SHA 寫成已驗證。

藍「我拒絕」、綠「白劍」、紫「戀露」都是 13 種、50 張，可以從指定牌組面板開局。三副都還沒有彼此對打。不要做六組真實牌組對打，也不要用其他 50 張牌組代替。

## 三副張數

資料：`dist/universal-v2/bleach-designated-decks.mjs`。版本 `user-2026-10-24`。每列保留來源編碼與 V2 cardId。戀露第一張是 `UA08BT/BLC-1-039`，不是 `UA01DC/BLC-1-039`。

| 牌組 | 張數 | 卡號 | 已登錄卡號 | 已登錄張數 | 可完整對局 |
| --- | --- | --- | --- | --- | --- |
| 我拒絕（藍） | 50 | 13 | 13 | 50 | 是 |
| 白劍（綠） | 50 | 13 | 13 | 50 | 是 |
| 戀露（紫） | 50 | 13 | 13 | 50 | 是 |

三副都不在既有七組預覽牌組裡。`createAllV2PreviewRealDecks` 仍是那七組，沒有 `renruki`、`reject-blue`、`white-sword`。開局走 `designatedReady`。

## 上一輪已登錄的整卡

官方頁以圖片 alt 還原圖示。中文目錄若和官方日文不一致，以官方日文為準。

- `UA04NC/BLC-3-008`：手牌需求能源減綠 1；不受 BP 減少；自己的回合、對方前線有 BP3500 以上時 BP+1000。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA04NC%2FBLC-3-008)
- `EX15BT/BLC-4-070`：Impact 無效，而且能阻擋時必須阻擋。多張都能擋時只在這些卡裡選。Q2339。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-070)
- `EX07BT/BLC-2-073`：退場對方前線 BP3000 以下；自己場上有更木劍八，或場外有草鹿八千流，上限改 5000。SPECIAL 觸發仍是沒有 BP 上限的退場。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-073)
- `EX07BT/BLC-2-069`：登場時，其他護廷十三隊至少 6 張才可棄 1 張手牌；棄了才可從場外回收最多 1 張日番谷冬獅郎。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-069)
- `UA04NC/BLC-3-001`：本回合第一次阻擋後轉為 Active；自己的回合，而且本回合自己把牌從手牌放到場外時 BP+1000。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA04NC%2FBLC-3-001)

## 藍「我拒絕」九張

行為在共用原語，沒有用卡號分支。測試在 `tests/v2-c23-blue-shared.test.mjs`。

- `EX07BT/BLC-2-015` 浦原喜助：看頂 3，可公開最多 1 張無特徵角色入手，其餘任意順序置底；有入手才再棄 1。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-015)
- `EX07BT/BLC-2-019` 黒崎一護：Raid〈黒崎一護〉。登場可使最多 2 個敵方前線 BP2000 以上本回合 −1500。主要、每回合 1 次，且只在前線：棄 1 張卡名含「斬月」或「月牙」的手牌，然後抽 1、本回合 BP+1000，並獲得「攻擊時可抽最多 1」。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019)
- `EX07BT/BLC-2-021` 斬月：被己方場上藍色〈黒崎一護〉的效果從手牌送出場外時，可使那個一護本回合不能被 BP3000 以下阻擋。可以不給。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-021)
- `EX15BT/BLC-4-022` 井上織姬：Active 登場。可棄 1 張手牌；棄了才可從場外將需求能源 1 以下的藍色角色入手，或以 Rest 登場，包含剛棄的那張。只在登場回合、每回合 1 次，可指定自己場上 1 個角色，到自己下回合開始前不會被對方效果選擇。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-022)
- `EX15BT/BLC-4-027` 黒崎一護：Impact 無效。啟動・主要、每回合 1 次，前線或能源線都能發動：棄卡名含「斬月」或「月牙」的手牌，然後抽 1、本回合 BP+1500，並獲得能源線在自己攻擊階段開始時移到空前線，以及不會被 Trigger 效果選擇。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-027)
- `EX15BT/BLC-4-034` 毒峰莉露卡：因自己〈黒崎一護〉的效果將手牌送出場外時，下方沒有裏向卡才可 Rest，並把該張卡裏向放在下方。登場在能源線時轉為 Active。啟動可 Rest 並退場，把下方最多 1 張裏向卡加入手牌。自己看得到下方，對方只看得到裏向。被放在下方的〈其名為斬月〉仍完成已經觸發的抽牌。Q2315、Q2316。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-034)
- `EX15BT/BLC-4-036` 葛力姆喬：被自己〈黒崎一護〉或〈浦原喜助〉的效果從手牌送出場外時，藍色生成能源至少 4，且自己場上每張卡都沒有「破面」以外的特徵，才可支付 1 AP，以 Active 登場。同名此效果每回合合計 1 次。拒絕支付不消耗次數。沒有特徵的卡不妨礙條件。Q2317、Q2318。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-036)
- `EX07BT/BLC-2-046` 月牙十字衝：使 1 個敵方前線 BP3500 以下退場。被己方場上藍色〈黒崎一護〉的效果從手牌送出場外時，可把 1 張手牌放到底；成功才讓那個一護本回合獲得 2 次攻擊，首次攻擊前轉為 Active。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-046)
- `EX07BT/BLC-2-047` 其名為斬月：抽 2。被己方場上藍色〈黒崎一護〉的效果從手牌送出場外時再抽 1。沒有能源條件。Q1033：額外的 1 張要等來源效果全部結束。Q1046：浦原造成的離場不抽這 1 張。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-047)

## 本輪整卡登錄的綠

行為在共用原語，沒有用卡號分支。測試在 `tests/v2-c24-green-shared.test.mjs`。

- `EX15BT/BLC-4-060` 藍染惣右介：不能自行放上前線，規則移動也不能。登場時最多選自己場上 1 個《藍染惣右介》以外的角色移到另一條線；目的線已滿時，先把該線 1 張卡除外。啟動・主要〔能量線〕：Rest 自己前線 2 個 Active 角色，然後把這張卡移到空的前線。沒有每回合一次。攻擊時抽 1。GET 是生命觸發圖示，不在中文效果字串裡。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-060)
- `EX07BT/BLC-2-067` 更木劍八：Raid〈更木劍八〉，登場 Active，可移到前線。不受 BP 減少。Impact 1。只有 Raid 基底的印刷需求能源至少 4，才有離場替代和登場 BP+1000、Damage 2。基底看印刷能源，不看生成能源，也不看當前 BP。一般登場，或疊在能源 1 的 `BLC-4-070` 上，沒有這兩項。Damage 2 是未被阻擋的攻擊打 2 點生命，不是 Impact，登場當下不打生命。阻擋勝利只結算 Impact 1。本回合結束後 BP 與 Damage 回到印刷值。Q1054–1057：因對方效果或戰鬥將離場時，可改為棄 1 張手牌到場外，成功則只把 Raid 最上層送到場外，基底留下。拒絕就照原本的離場。手牌是空的、基底能源不足、一般登場，或效果被沉默，都沒有這個視窗。已結算的 +1000 與 Damage 2 在之後失去原文時仍在；BP 減少免疫會被沉默關掉。連鎖 Raid 的幾何沒有這次的替代。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-067)
- `UA08BT/BLC-1-085` 日番谷冬獅郎：Raid〈日番谷冬獅郎〉。登場可選最多 1 個敵方前線角色，將其 Rest，並且到那個玩家的下一個攻擊階段結束前不能轉 Active。這個限制在刷新之前解除，所以該攻擊階段結束時會回到 Active。己方場上另外至少 6 張「護廷十三隊」時，改為連所選角色和所有敵方能源線角色一起 Rest 並套用相同限制。埋在 Raid 底下的基底不算那 6 張。沒有敵方前線目標時，即使有 6 張也不做事。可以不選。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-085)

## 共用原語

沒有用卡號硬編碼。

- `printedHandEnergyDiscount`：手牌上的需求能源減少，不改印刷能源。
- `bpDownImmune`：計算 BP 時略過減少；沉默後減少會回來。
- `mustBlock`：印刷的強制阻擋。Q2339 只在能擋的強制阻擋角色中選擇，不能改擋其他角色，也不能放棄。角色不能擋時，恢復一般阻擋。
- `retireOppFrontUnderBp.bonusOutsideName`：場上名稱或場外名稱，任一成立就用較高 BP 上限。
- `discardGate.when`：現場條件不成立時，不棄牌，也不跑後面的效果。
- `ownHandToOutsideThisTurn` 可以是 `turn:'own'`。`turn:'any'` 的舊卡不變。
- 手牌送到場外的觀察：`moveTriggers` 與 `moveObserver`。條件是來源在場上、來源名稱，以及可省略的來源顏色。離場理由包含支付與自己的效果。Q1033 用 `sourceResolutionBoundary`，被移動的卡要等來源程式結束。
- `grantCauseBlockAtMost`：可選，把「不能被 BP 以下阻擋」暫時給發動來源。
- `handBottomGrantDoubleAttack`：可選把手牌放到底；成功才授予 2 次攻擊與首次攻擊前轉 Active。拒絕不授予。
- `payApDeployMovedActive`：結算時才看能源、特徵與空位。支付成功才消耗「同名每回合一次」。
- `searchTopOneBottomDiscard` 的 `traitlessCharacter` 只取無特徵角色，不含場地。
- `frontOnceProgram.frontOnly`：`true` 只在前線。`false` 時能源線也能啟動。019 仍是前線。027 是 `false`，同一回合才走得到攻擊階段開始的移線。
- `openEnergyMoveGrants`：離開主要階段、攻擊階段開始時，掃描本回合獲得的能源線移線授予。一張卡、一個空位就直接移動。
- `triggerUnchosenGranted`：Trigger 效果不能選這張卡，包含自己的 Trigger。
- `enterAlwaysActive`、`outsideColorEnergyHandOrRest`、`entryTurnProtect`：Active 登場、場外顏色與能源上限的入手或 Rest 登場、登場回合的選擇保護。
- `restSelfTuckMovedFaceDown`、`activeSelfIf`、`restRetireRecoverUnder`：Rest 後把離場卡裏向放在下方、指定線登場轉 Active、Rest 退場後回收下方卡。自己的公開視圖看得到下方 uid；對方只看到裏向。
- `frontForbidden` 與 `ownEffectFront`：印刷禁止前線的卡，不能用登場或規則移動上去。只有自己的效果把它移到前線時才設 `ownEffectFront`。離開該位置後旗標清除。
- `moveOtherAcrossOrRemove`：登場時可選自己場上另一個、名稱不符的角色，移到另一條線。目的線滿了才指定一張除外。
- `restTwoActiveFrontMoveSelf`：能源線啟動。Rest 恰好 2 個自己的 Active 前線角色，然後把自己移到空的前線。沒有每回合一次。
- `raidBaseEnergyThen`：只在 Raid 基底的印刷需求能源達到門檻時，才接著做 `then`。一般登場或低能源基底會跳過。
- `grantSelfAttackDamageThisTurn`：本回合 Damage 2。未被阻擋才打 2 點生命。已經結算的授予在沉默後仍在，回合開始時清除。
- `raidHandLeaveReplace`：對方效果或戰鬥將使這張雙面向上的 Raid 頂卡離場時，可支付 1 張手牌到場外，只剝掉最上層。拒絕則原本的離場發生。手牌空、沉默、基底能源不足，都不開視窗。
- `restOppFrontLockActive`：可選 1 個敵方前線角色並 Rest。`cannotActive` 帶 `releaseBeforeRefresh`，在該玩家攻擊階段結束、刷新之前解除。`upgrade` 用現場其他特徵張數決定要不要連能源線角色一起鎖。來源離場不解除。
- `effectApPaidColors`：本回合因卡片效果支付 AP 的顏色。出牌支付、額外抽牌和選擇稅不算。`startTurn` 清空，所以加值不會留到對方回合。
- `handZeroApUses`：從手牌打出或突襲、而且那次 AP 消費是 0 的紀錄。效果讓角色登場不記。Q2399。
- `handPlayApPlan` 的 `raidHandApDiscount`：只有突襲，而且本回合已支付指定顏色的效果 AP，才減 AP。同名另一張手牌以 0 AP 使用過就作廢。
- `oncePayProgram`：每回合一次。可限制前線、突襲狀態、支付 0 或 1 AP、場上名稱。後面可以是本回合 Damage、二選一，或棄牌後的效果。支付 AP 會記入 `effectApPaidColors`。
- `ownEffectApPaidColor` 的 `turn:'any'`：049 官方沒有「自分のターン」圖示。帳本在回合開始清空，所以對方回合看不到這次加值。
- `removeOutsideThen` 的張數上限是 4。短於印刷張數仍可移走，後續效果不做。Q560、Q575。
- `removeAnyOutsideScale`：場外任意張數。移走至少 1 張後，敵方前線 BP 減少 500 乘以張數，可以不選。
- `inspectTopColoredNamesOutside`：看頂部，最多 1 張指定顏色且名稱符合二者之一的角色送場外，其餘按所選順序放回頂部。
- `inspectTopAnyOutside` 的 `drawIfOutsideEnergyAtLeast`：抽的是視窗下面那張，不是視窗裡剩下的牌。
- `drawDiscardIfEffectApPaid`：該顏色的效果 AP 已支付且牌庫還有牌時，可抽 1，抽了就必須棄 1。
- `grantSelfImpactThisTurn`：本回合 Impact。已經拿到的 Impact 在沉默後仍在。
- `grantOwnNameBlockAtLeast`：授予記在被點名的攻擊者身上。「不被 BP 4000 以上阻擋」是阻擋方 BP 達到門檻就不能擋。
- `deployOwnHandRestOrRaid` 的 `requireAffordableEnergy`：看有效需求能源，付不起的手牌不出現在選項裡。效果登場不再付一次印刷 AP，也不記入 `handZeroApUses`。
- `playRequiresOwnName`：只限制手牌使用，不限制生命觸發。

## 本輪整卡登錄的紫

行為在共用原語，沒有用卡號分支。測試在 `tests/v2-c25-purple-shared.test.mjs`。`EX07BT/BLC-2-052` 與 `EX15BT/BLC-4-059` 本來就已登錄，這輪沒有改它們的程式。

- `UA08BT/BLC-1-039` 黒崎一護：無固有效果，GET。V2 沿用既有香草 `BLC-1-039`。目錄主編號是 `UA08ST/BLC-1-039`，別名含 `UA08BT/BLC-1-039`，所以 `sourcePinned` 為真。ST 那句「基礎角色，可作為一護的 Raid 基底。」不是這張 BT 的效果。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-039)
- `UA08BT/BLC-1-041` 黒崎一護：Raid〈黒崎一護〉。登場先把牌庫頂 2 張送出場外，再可從自己場外除外任意張；至少 1 張時，可使最多 1 個敵方前線本回合 BP −500×張數。可以不除外。牌庫只剩 1 張仍必須磨那張，而且仍可按張數減 BP。Q558、Q559。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-041)
- `UA08BT/BLC-1-047` 阿散井恋次：主要階段每回合 1 次，支付 1 AP，此角色本回合 Damage 2。打出時付的 AP 不算效果支付。Raid〈阿散井恋次〉。登場可把自己場外最多 4 張除外；恰好 4 張成功時，才可使最多 1 個敵方前線本回合 BP −3000。場外只有 3 張時可以全除外，減 BP 不做。Q560。Damage 2 在沉默後仍在。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-047)
- `EX15BT/BLC-4-048` 阿散井恋次：登場看頂 2。最多 1 張紫色《阿散井恋次》或《朽木露琪亞》可送場外，其餘依所選順序放回頂部。紫色一護不能送出。可以一張都不送。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-048)
- `EX15BT/BLC-4-049` 阿散井恋次：本回合曾因自己的紫色卡片效果支付 AP 時 BP+2000。官方沒有「自分の回合」圖示；帳本在回合開始清空，所以換到對方回合後加值不在。啟動・主要、前線、支付 1 AP、每回合 1 次，而且自己場上要有《朽木露琪亞》：抽 1，或將自己改為 Active 並可使最多 1 個對方前線本回合 BP−1000。沒有露琪亞不能啟動。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-049)
- `EX15BT/BLC-4-050` 阿散井恋次：本回合已支付紫色效果 AP 時，從手牌突襲這張的 AP−1。本回合已有其他《阿散井恋次》從手牌以 0 AP 使用過，減費作廢。效果讓恋次登場不算。Q2399。沒有疊在戀次上時，突襲限定的啟動不合法。啟動二選一：本回合 Impact 1，或指定 1 個對方前線 BP−1000。Impact 在沉默後仍在。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-050)
- `UA08BT/BLC-1-053` 朽木露琪亞：Raid〈朽木露琪亞〉。登場抽 3，再把 2 張手牌送出場外。主要階段每回合 1 次：送 1 張手牌出場外，可使最多 1 個己方角色本回合 BP+500。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-053)
- `EX15BT/BLC-4-054` 朽木露琪亞：登場時，自己場上有《阿散井恋次》才可支付 1 AP；付了才抽 1，並可從手牌把能量付得起、AP 1 的《阿散井恋次》或《朽木露琪亞》以 Rest 登場或突襲。付不起的高能源恋次不會出現。COLOR 觸發是把場外能量 2 以下、AP 1 的紫色角色以 Active 放到前線。目錄效果字串沒有這段觸發文字，指紋仍用目錄原文。能量 3 不能用這個觸發登場。目錄 gen 維持 3。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-054)
- `UA01DC/BLC-4-082` 黒崎一護：登場看頂 2，任意張送場外，其餘依順序放回頂部。送出去的牌裡有能量需求 3 以上才抽 1，抽的是視窗下面那張。只送出能量 0 的牌不抽。目錄來源是商店頁，不是 unionarena-tcg.com，沒有另造官方網址。
- `UA01DC/BLC-4-083` 朽木露琪亞：自己場上沒有卡時，這張手牌的需求能源減少。目錄只寫「減少」，沒有數字；本專案 README 與 v9 規則是 −2，引擎用 −2。場上已有卡時不減。登場可看頂 1 並送場外。被突襲時可先處理基底：看頂，或讓一名露琪亞本回合不被 BP 4000 以上阻擋。BP 1500 仍可擋，放棄阻擋也合法。目錄來源是商店頁。
- `EX15BT/BLC-4-058` 雙王蛇尾丸：自己場上有《阿散井恋次》才能從手牌使用。使 1 個對方前線 BP 5000 以下退場。本回合已支付紫色效果 AP 時，可抽 1，抽了就必須棄 1。沒有支付過就只退場。SPECIAL 生命觸發不受 5000 上限，BP 6000 也能退。[官方](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-058)

## 預覽

`dist/universal-v2-preview.html` 列出三副的名稱、來源編碼、張數和已登錄狀態。藍、綠、紫的選項都是「50 張｜完整可玩」。開局走 `designatedReady`。沒有把這三副寫進 `decks['reject-blue']`、`decks['white-sword']` 或 `decks['renruki']`。頁面上的「不可完整對局」仍是給未完成清單的說明，這三副不再走那條停用選項。

## AI 要看的支付和連鎖

- `BLC-3-008` 的減費只在手牌。上場後印刷需求仍是 4。BP+1000 只在自己的回合，而且看的是對方前線的當前 BP。
- `BLC-4-070` 能擋時，合法選擇裡沒有「不阻擋」，也沒有其他非強制阻擋角色。Impact 無效只拿掉這次戰鬥對手的 Impact。
- `BLC-2-073` 的上限是「場上更木劍八」或「場外草鹿八千流」。兩個都沒有時，4000 BP 不能退。SPECIAL 觸發不受這個上限影響。
- `BLC-2-069` 少於 6 張其他護廷十三隊時，不能棄牌，也不能回收。棄牌可以拒絕；拒絕後不會回收。
- `BLC-3-001` 只有第一次阻擋會轉回 Active。手牌離場的 BP 只在自己的回合，而且要是自己把牌從手牌送到場外。
- `BLC-2-047` 的額外抽 1 只在藍色一護的效果把這張卡送出場外，而且要等那個效果結束。浦原造成的離場不抽。
- `BLC-2-021` 的阻擋下限可以不給。給了之後，BP 3000 不能擋那個一護，BP 3500 可以。
- `BLC-2-046` 的退場在有目標時是強制的。牌底是可選的；拒絕後那個一護沒有 2 次攻擊。
- `BLC-4-027` 沒有符合的手牌時不能啟動。棄了斬月也會打開斬月自己的可選授予，要先處理。能源線上的授予只活到下一次自己的回合開始前；同一回合要能在能源線啟動。
- `BLC-4-022` 的保護只在登場的那個回合。對方的退場選擇會被這層保護擋下。剛棄掉的藍色、需求能源 1 以下角色可以入手或以 Rest 登場。
- `BLC-4-034` 把〈其名為斬月〉放到下方後，那張卡已經取得的抽牌仍要結算。對方看不到下方卡面。
- `BLC-4-036` 看的是藍色生成能源，不是藍色卡的張數。登場不另付印刷的 6。沒有特徵的卡可以留在場上。有「破面」以外特徵，或藍色生成能源少於 4，或沒有準備好的 AP，都不能登場。一護與浦原都能當來源；織姬不能。
- `BLC-4-060` 不能選前線登場，也不能在移動階段用規則移上去。登場移線可以不選。選了之後，空位就移過去；線滿了必須先除外一張。能源線啟動需要恰好還有 2 個 Active 前線和 1 個空前線。這個啟動沒有每回合一次。攻擊抽 1 發生在阻擋選擇之前。
- `BLC-2-067` 只有印刷需求能源 4 以上的 Raid 基底才給 BP+1000 和 Damage 2。`BLC-3-008` 的印刷能源是 4，`BLC-4-070` 是 1。Damage 2 打未被阻擋的生命；擋下而且攻方勝利只打 Impact 1。離場替代只在對方效果或戰鬥、手牌至少 1 張、而且是可剝的一層 Raid 時出現。支付成功留下基底；拒絕則整疊離場，手牌不付。沉默後沒有替代，BP 減少會生效，已經拿到的 Damage 2 還在。
- `BLC-1-085` 可以不選。選了 1 個敵方前線後才 Rest。其他護廷十三隊少於 6 張時，敵方能源線不動。滿 6 張時，敵方能源線角色也 Rest，並套用同一個不能 Active。埋在 Raid 底下的卡不算。沒有敵方前線時整段不做。鎖在對方攻擊階段結束、刷新之前解除。
- `BLC-1-047` 的 Damage 2 要另付 1 點效果 AP。打出這張時付的 AP 不會讓 `BLC-4-049` 得到 +2000。場外少於 4 張時可以全除外，但 −3000 不發生。
- `BLC-4-049` 的 +2000 看的是本回合效果 AP 帳本，不是「只在自己的回合」這個圖示。換人後帳本清空。沒有場上露琪亞不能啟動。
- `BLC-4-050` 的突襲減 1 只在紫色效果 AP 之後。另一張恋次從手牌以 0 AP 用過，下一張不再減。054 的效果登場不算那次 0 AP。沒有疊層時不能啟動突襲限定效果。
- `BLC-1-041` 先磨 2 再除外。牌庫不足 2 張仍要磨完剩下的。除外 0 張就不減 BP。
- `BLC-4-048` 只能把紫色恋次或露琪亞送出場外。一護即使是紫色也不行。
- `BLC-4-054` 沒有場上恋次時，登場不開支付窗。付不起能量的手牌不能被這個效果登場。COLOR 不接受能量 3。
- `BLC-4-082` 的抽牌來自視窗下方。視窗裡沒有能量需求 3 以上被送出時不抽。
- `BLC-4-083` 只在自己場上沒有卡時把需求能源減 2。BP 4000 不能擋被授予的露琪亞，BP 1500 可以，也可以不擋。
- `BLC-4-058` 沒有場上恋次就不能從手牌使用。事件本身不退 BP 6000。SPECIAL 觸發可以。沒有紫色效果 AP 時，退場後不抽。

### effect-outside-name-rest

這組案例給 GPT 更新登場決策，不是本輪新原語。測試在 `tests/v2-c19-name-pay-outside-rest.test.mjs`。

可以登場：有準備好的 AP，場外有印刷名稱符合的角色，而且這個名稱本回合還沒用過。支付 1 AP 後，那張卡以 REST 登場。`BLC-2-043` 的案例是支付一次並把場外的同名卡放到場上。

應該拒絕：沒有準備好的 AP，或場外沒有符合名稱的卡，就不登場。玩家拒絕啟動時，名稱使用次數不消耗。玩家先啟動、再拒絕支付時，名稱使用次數已經消耗，之後同一名稱不能再登場。

## 測試入口

`tests/v2-c22-designated-decks.test.mjs` 固定三副清單。三副都可以通過牌組合法檢查，而且 `renruki`、`reject-blue`、`white-sword` 都不在七組預覽牌組。`tests/v2-c23-blue-shared.test.mjs` 覆蓋九張藍卡。`tests/v2-c24-green-shared.test.mjs` 覆蓋三張綠卡。`tests/v2-c25-purple-shared.test.mjs` 覆蓋戀露新登錄卡的正例與反例。三副彼此對打還沒有。

## 下一輪

六組真實牌組對打還沒有做。不要用其他牌組代打。本輪紫卡提交的 Actions 成功之前，不要把那個 SHA 寫成已驗證。

## 不可宣稱

- 沒有做三副彼此對打，也沒有做六組真實牌組對打。
- `BLC-1-039` 的 V2 身分與 ST 香草是同一張。BT 印刷沒有效果；ST 的 Raid 基底說明不是 BT 效果。
- `UA01DC/BLC-4-082`、`UA01DC/BLC-4-083` 的目錄來源是商店頁。沒有官方 cardlist 網址，也沒有另造一個。
- `BLC-4-083` 的減免數字不在目錄那句「減少」裡。引擎用的 −2 來自本專案 README 與 v9，不是這次從官方頁讀到的數字。
- `BLC-4-054` 的 COLOR 觸發是官方規則，但沒有寫進儲存的效果字串。
- `BLC-4-049` 不是「只在自己的回合」。加值跟著效果 AP 帳本，回合開始就清掉。
- 新卡有官方原文和正反例，不是每張卡的全部 FAQ 認證。
- 登錄數增加不代表 276 張 BLEACH 都完成。
- 本輪紫卡提交自己的 Actions 成功之前，已驗證的 SHA 仍是綠卡 `ba2cf8fae9978ac833e4ccf4fd505d9f340017b7` 與藍卡 `068b8ce1c3e00ad44a365606ea3a26bf54f82e25`。

## 本輪提交

Manifest：BLEACH 160／276，五作品 412／700。`reviewPending` 180，`bleachSaoUnported` 188，`bleachUnported` 116。

已驗證提交：藍 `068b8ce1c3e00ad44a365606ea3a26bf54f82e25`，Actions [40079041661](https://github.com/will00t-debug/Ua/actions/runs/40079041661) SUCCESS。綠 `ba2cf8fae9978ac833e4ccf4fd505d9f340017b7`，Actions [40083017238](https://github.com/will00t-debug/Ua/actions/runs/40083017238) SUCCESS。

本輪十張紫卡與這份交接在同一個新提交。那個提交自己的 Actions 成功之前，不要把它寫成已驗證。
