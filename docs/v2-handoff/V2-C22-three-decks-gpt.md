# V2 C22｜三副指定 BLEACH 牌組交接

時間：2026-10-24 17:30（台北，UTC+8）

已驗證提交是 `068b8ce1c3e00ad44a365606ea3a26bf54f82e25`，Actions [40079041661](https://github.com/will00t-debug/Ua/actions/runs/40079041661) SUCCESS。那一輪登錄藍「我拒絕」的九張整卡。本輪仍在 `cursor/v2-blc-three-decks-6ff5`，沒有改 `dist/universal-v2/ai.mjs`，沒有合併 main，沒有部署。本輪綠卡提交的 Actions 還沒跑，不能把這個新 SHA 當成已驗證，也不能沿用 40079041661。

藍「我拒絕」與綠「白劍」都是 13 種、50 張，可以從指定牌組面板開局。紫「戀露」仍有缺口。不能拿其他 50 張牌組代替這三副。三副都完成之前，不要做六組真實牌組對打。

## 三副張數

資料：`dist/universal-v2/bleach-designated-decks.mjs`。版本 `user-2026-10-24`。每列保留來源編碼與 V2 cardId。`UA01DC/BLC-1-053`、`UA01DC/BLC-1-041` 在目錄裡沒有這個來源編碼；同號現有印刷是 UA08BT／UAPR，不能當成這兩張 DC 卡。

| 牌組 | 張數 | 卡號 | 已登錄卡號 | 已登錄張數 | 可完整對局 |
| --- | --- | --- | --- | --- | --- |
| 我拒絕（藍） | 50 | 13 | 13 | 50 | 是 |
| 白劍（綠） | 50 | 13 | 13 | 50 | 是 |
| 戀露（紫） | 50 | 14 | 4 | 12 | 否 |

藍和綠都不在既有七組預覽牌組裡。`createAllV2PreviewRealDecks` 仍是那七組。開局走 `designatedReady`。

已登錄的紫：`UA08BT/BLC-1-045`、`EX07BT/BLC-2-052`、`UA08BT/BLC-1-051`、`EX15BT/BLC-4-059`。

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

## 仍未移植

精確原因在 `DESIGNATED_GAP_NOTES`。已登錄的列不會再出現在缺口報告。

紫還缺 10：`BLC-1-047`、`BLC-4-048`、`BLC-4-049`、`BLC-4-050`、`UA01DC/BLC-1-053`、`BLC-4-054`、`UA01DC/BLC-4-083`、`UA01DC/BLC-4-082`、`UA01DC/BLC-1-041`、`BLC-4-058`。

不要用別的印刷版補 `UA01DC/BLC-1-053` 或 `UA01DC/BLC-1-041`。不要把未完成的紫放進七組預覽牌組，也不要為了湊對戰而拿別的 50 張牌組代替白劍或戀露。

## 預覽

`dist/universal-v2-preview.html` 列出三副的名稱、來源編碼、張數和已登錄或未移植。藍的選項是「我拒絕（藍）｜50 張｜完整可玩」。綠的選項是「白劍（綠）｜50 張｜完整可玩」。紫仍是停用的「缺口 10 種｜不可完整對局」。開局走 `designatedReady`。沒有把藍寫進 `decks['reject-blue']`，也沒有把綠寫進 `decks['white-sword']`。

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

### effect-outside-name-rest

這組案例給 GPT 更新登場決策，不是本輪新原語。測試在 `tests/v2-c19-name-pay-outside-rest.test.mjs`。

可以登場：有準備好的 AP，場外有印刷名稱符合的角色，而且這個名稱本回合還沒用過。支付 1 AP 後，那張卡以 REST 登場。`BLC-2-043` 的案例是支付一次並把場外的同名卡放到場上。

應該拒絕：沒有準備好的 AP，或場外沒有符合名稱的卡，就不登場。玩家拒絕啟動時，名稱使用次數不消耗。玩家先啟動、再拒絕支付時，名稱使用次數已經消耗，之後同一名稱不能再登場。

## 測試入口

`tests/v2-c22-designated-decks.test.mjs` 固定三副清單。藍和綠可以通過牌組合法檢查，而且兩個 key 都不在七組預覽牌組。`tests/v2-c23-blue-shared.test.mjs` 覆蓋九張藍卡。`tests/v2-c24-green-shared.test.mjs` 覆蓋三張綠卡的正例與反例。三副彼此對打還沒有。紫還有未登錄卡，引擎不會用無效果卡代替。

## 下一輪

紫的 10 張。三副都完成之後才做六組真實牌組對打。不要用其他牌組代打，也不要換印刷版。

## 不可宣稱

- 紫還不能完整對局。三副計畫還沒有完成。
- 沒有做三副彼此對打。
- 沒有把 UA08BT 的 `BLC-1-053`、`BLC-1-041` 當成 UA01DC。
- 新卡有官方原文和正反例，不是每張卡的全部 FAQ 認證。
- 登錄數增加不代表 276 張 BLEACH 都完成。
- 本輪綠卡提交自己的 Actions 成功之前，已驗證的 SHA 仍是 `068b8ce1c3e00ad44a365606ea3a26bf54f82e25`。

## 本輪提交

Manifest：BLEACH 150／276，五作品 402／700。`reviewPending` 190，`bleachSaoUnported` 198，`bleachUnported` 126。

已驗證提交：`068b8ce1c3e00ad44a365606ea3a26bf54f82e25`。Actions [40079041661](https://github.com/will00t-debug/Ua/actions/runs/40079041661) SUCCESS。

本輪三張綠卡與這份交接在同一個新提交。那個提交自己的 Actions 成功之前，不要把它寫成已驗證。
