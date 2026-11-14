# IMC 三組並行契約

基準是 `cursor/audit-round11-integrate-65f8` 的 `1ed2388b8370818a219a01fe153aa76e765978b0`。PR #359 尚未合併，`main` 不含這個提交，所以 IMC 從這個 SHA 另開 `cursor/imc-v2-integration`。不要改 PR #359，不要把未完成的卡標成可對戰或已驗證，也不要把 IMC 加進 `scripts/build-effect-audit-ledger.mjs`。

官方頁面：

- 補充包 https://www.unionarena-tcg.com/jp/products/boosters/imc-1.php
- 預組 https://www.unionarena-tcg.com/jp/products/decks/imc-1.php
- 卡表 https://www.unionarena-tcg.com/jp/cardlist/

2026-11-12 核對結果：UA55BT 一般卡是 IMC-1-001 到 IMC-1-100，沒有缺號。稀有度是 SR 13、R 18、U 34、C 35。AP 是 IMC-1-AP01 到 IMC-1-AP13，共 13 種，沒有規則文本，不能放進 50 張牌組。卡表另有 56 筆平行卡，只作為同一身份的異圖印刷。UA55ST 的 50 張構築牌組在卡表上是 18 種：IMC-1-088、089、090、091、092、095、096、097、100 是 UA55BT 的異圖，日文名稱、效果、BP、能量與 AP 與補充包相同；IMC-1-101 到 109 是預組專用。商品頁寫「一部カードは UA55BT 的イラスト違い」。推廣 R 是商品圖上的 IMC-1-110 到 113，各 1 張，稀有度 R。110 與 111 是黃，112 與 113 是藍。18 種構築卡都是紅。這與商品頁「50 枚的デッキとは異なる属性 2 色、テキスト種類は全 4 種、全種 1 枚ずつ」一致。預組附 3 張 AP，卡表上的那一種是 UA55ST/IMC-1-AP01。商品頁沒有公布 18 種各自的張數，所以 `loadImcOfficialStarter()` 回傳 `ready:false`、`counts:null`。不要自編 50 張。

## 檔案

B 組（IMC-1-001～050）只改這些檔案：

- `dist/imc/cards-001-050.mjs`
- `dist/universal-v2/imc/programs-001-050.mjs`
- `dist/universal-v2/imc/runtime-001-050.mjs`
- `dist/universal-v2/imc/requests-001-050.mjs`
- `tests/v2-imc-001-050.test.mjs`

C 組（IMC-1-051～100）只改這些檔案：

- `dist/imc/cards-051-100.mjs`
- `dist/universal-v2/imc/programs-051-100.mjs`
- `dist/universal-v2/imc/runtime-051-100.mjs`
- `dist/universal-v2/imc/requests-051-100.mjs`
- `tests/v2-imc-051-100.test.mjs`

088、089、090、091、092、095、096、097、100 的卡身在 C 組。D 組只在 `dist/imc/starter-printings.mjs` 補 UA55ST 印刷，不改這些卡的效果物件。

D 組（UA55ST 專用卡、推廣 R、AP、50 張預組）只改這些檔案：

- `dist/imc/cards-starter.mjs`（IMC-1-101～113）
- `dist/imc/starter-printings.mjs`
- `dist/imc/starter-deck.mjs`（只有在引用官方張數來源時才填 `counts`）
- `dist/imc/cards-ap.mjs`
- `dist/universal-v2/imc/programs-starter.mjs`
- `dist/universal-v2/imc/runtime-starter.mjs`
- `dist/universal-v2/imc/requests-starter.mjs`
- `tests/v2-imc-starter.test.mjs`

A 組維護作品註冊、目錄合併、對戰包、分流、抓取腳本與這份契約。三組不要同時改：

- `dist/imc/product.mjs`
- `dist/imc/catalog.mjs`
- `dist/universal-v2/imc-pack.mjs`
- `dist/universal-v2/imc-runtime.mjs`
- `dist/title-registry.mjs`
- `dist/title-logos.mjs`
- `dist/v2-editor-compat.mjs`
- `dist/v2-deck-editor.mjs`
- `dist/universal-v2/official-entry.mjs`
- `dist/universal-v2-preview.mjs`
- `dist/universal-v2/engine.mjs`
- `dist/universal-v2/pack.mjs`
- `scripts/fetch-imc-ua55.mjs`
- `scripts/build-effect-audit-ledger.mjs`
- `docs/audit/`
- `tests/v2-imc-architecture.test.mjs`
- `docs/imc/parallel-contract.md`

`scripts/fetch-imc-ua55.mjs` 會覆寫四份卡牌模組與 `starter-printings.mjs`。印刷修正寫進各組卡牌檔之後，不要再直接跑這個腳本蓋掉。

## 程式介面

卡表列保持 `battleReady:false`、`auto:false`。不要加 `engineKind`，也不要把 `playable` 設成 true。目錄會拒絕這三件事。

對戰程式寫在各組的 `IMC_PROGRAMS_*`。一張卡要進對戰包時：

```js
'IMC-1-001':{
 ready:true,
 implementation:'dsl',
 effects:{onPlay:[{op:'draw',count:1}]}
}
```

`implementation` 只能是 `dsl` 或 `vanilla`。有印刷效果的卡不能標 `vanilla`。`ready:true` 的卡會交給 `createUniversalPack`，所以效果必須是既有 op 能接受的形狀。允許的程式欄位是 `ready`、`implementation`、`effects`、`mainAbility`、`triggerEffect`、`raidName`、`impactNull`、`printedImpact`、`nameAliases`、`step`、`run`、`notes`，以及 `activeExtraEnergy`、`ownTurnBp`、`opponentTurnBp`、`emptyOwnFieldHandEnergyDiscount`、`enterAlwaysActive`、`readyOnBlockCount`、`unblockedAttack`、`frontForbidden`、`blockBpRestriction`、`passiveBonuses`。其他欄位會在 `imcProgramFor` 被拒絕。

`runImcJob(pack, state, job)` 依卡號分流。`job` 是 `{op:'imc', id, slot}`。001～050 進 `runImc001`，051～100 進 `runImc051`，101～113 進 `runImcStarter`。這輪的引擎還沒有 `op:'imc'`。句子能寫成既有 op 時，放在 `effects` 即可，不必等引擎改動。需要閉環處理時，先寫進該組的 requests，等 A 把 `op:'imc'` 加進效果表與 `engine.mjs` 之後，`run` 才會被呼叫。

共用缺口在該組 requests 檔追加一個物件，A 用 `imcSharedRequests()` 讀取：

```js
{
 cardId:'IMC-1-098',
 sentence:'自己の場と場外に特徴のカード名が合計6種類以上',
 existingOps:['draw','nextEligibleHandPlayApDiscount'],
 whyNotEnough:'ownDistinctTraitNames 只計算場上，不計算場外',
 proposal:'留在 C 組 runtime，先不要加共用 helper'
}
```

`existingOps` 至少寫一個已經看過的共用 op。卡號必須落在 001～113。不要為了單張卡改 `pack.mjs` 或 `engine.mjs`。

測試檔沿用上面的檔名。`tests/v2-imc-architecture.test.mjs` 是 A 的載入與閘門，三組不要放單卡案例。

## 098 與 102

UA55BT/IMC-1-098 是紅色事件，能量 4、AP 1、特殊觸發。日文效果是抽 1 張，然後這個回合下一張從手牌使用的［特徴：お願い！シンデレラ］消耗 AP -1；自己場上與場外該特徵的卡名合計 6 種以上時，這個回合下一張該特徵的登場改為活動；9 種以上時改為該特徵全部活動登場。

已可沿用：

- `draw`，`count:1`
- `nextEligibleHandPlayApDiscount`，`filter:{trait:'お願い！シンデレラ'}`。Q1210 只扣下一張符合的手牌使用，每次 -1
- 特殊觸發退場一張對手前線：`trigger:'special'` 加上 `triggerEffect:{op:'retireOppFront'}`

`ownDistinctTraitNames` 的 `zone:'fieldOutside'` 計算場上加場外的不同印刷卡名。`zone:'field'` 仍然不含場外。`countOwnOutsideDistinctPrintedNames` 只算場外，而且依顏色與種類，不依特徵。`enterAlwaysActive` 仍是卡本身的印刷登場方式。`ifLiveThen` 現在可以把 `grantTraitActiveEntryThisTurn` 接在 `then`，也可以用長度 1 的 `else` 接另一個 `ifLiveThen`。098 用 9 種走 `scope:'all'`，否則 6 種走 `scope:'next'`，兩段不會同時成立。不符合特徵的登場不消耗 `next`。授權在下一個回合開始時清除。098 已標 `ready:true`。

UA55ST/IMC-1-102 是紅色角色，能量 5、AP 1、BP 4000、產生能量紅 1、突襲觸發。特徵印刷是 `new generations／お願い！シンデレラ`。突襲框只有〈渋谷 凛〉的標準突襲句。登場時這張角色這個回合獲得衝擊 1，並可選最多 1 張對手前線角色，其目前 BP 在「自己場上其他、特徵 new generations、原本 BP 恰好 4000」的張數 ×1000 以下時退場。

已可沿用：

- 突襲觸發與 `raidName:'渋谷 凛'`
- `grantSelfImpactThisTurn`，`amount:1`
- 原本 BP 是 `definition.bp`。`printedBp` 篩選與 `ownRestPrintedBpCount` 都讀印刷值，不讀目前 BP
- 「1 枚まで」對應既有退場 op 的 `optional:true`

上限是 `retireOppFrontUnderBp` 的 `printedBpTraitCount`：其他自己角色、指定特徵、印刷 BP 恰好為 N 的張數 ×1000，再和對手前線的目前 BP 比較。`traitPerBp` 與 `traitNamePerBp` 維持原來的公式。102、101、103、106 已各自用自己的公式標 `ready:true`。不能把 102 的上限套到公式不同的卡上。

## 已經可重用、這輪不要重做

抽牌、棄牌、目前 BP、AP 支付、突襲登場、普通登場、生命傷害、生命觸發、合法選牌、選擇最多 N 張與必選 N 張、每回合一次、牌庫公開、查看與排序、多特徵的 `traitComponents`、同名與不同名計數，都沿用現行 V2。`cardHasTrait` 同時看 `traits` 與 `traitComponents`。斜線特徵把印刷字串放在 `traits[0]`，拆開的部分放在 `traitComponents`，兩者用 `／` 接回必須相同。

場上與場外要合併計數時，先確認現有條件的區域。`ownDistinctTraitNames` 的 `zone:'field'` 是前線與能源線，不含場外。`zone:'fieldOutside'` 才把場外算進不同印刷卡名，同名仍只算一種。`ownNameAbsent` 也可以點名場外。不要假設一個場上計數會自動加上場外。

## 第一輪整合已可重用

這些是共用引擎的新增或轉送，不是第二套戰鬥引擎。卡片仍要由負責的組寫進自己的 programs，並用該組測試打過整個印刷句，才能 `ready:true`。A 組沒有替未測完的卡改 ready。

- `ownPrintedTraitCount`：場上角色、指定特徵、印刷 BP 或印刷必要能源恰好為 N。比較的是卡面數字，不是目前 BP。
- `retireOppFrontUnderBp` 的 `printedBpTraitCount`：排除來源後，上述張數乘 1000，再和對手前線的目前 BP 比較。`optional:true` 可以不選。
- `ifLiveThen` 可以接 `drawDiscard` 一張、`activeOwnTrait` 最多一張，或 `grantTraitActiveEntryThisTurn`。可選的 `else` 長度是 1，內容是另一個 `ifLiveThen` 或同樣的後續。條件成立只跑 `then`，不成立只跑 `else`。
- `buffOwnCharactersAll` 加 `zone:'front'` 時只加前線。IMC-1-108 已用。
- `grantTraitActiveEntryThisTurn`：`scope:'next'` 使下一張符合特徵的新入場角色活動，用過即止；`scope:'all'` 維持到下一個回合開始。不符合特徵的登場不消耗 `next`。
- `nextEligibleHandPlayApDiscount` 加 `fromUsedEvent:true` 時，來源可以是已經放到場外的事件，仍然只減下一張符合的手牌使用。
- `deployOwnHandRest` 在 `ap:null` 時不要求印刷消費 AP，可加 `line`、顏色、必要能源上限與特徵。`sourceLine:'front'` 或 `'energy'` 檢查的是效果來源所在列，省略時不檢查。`line` 才是被召喚角色的目的地，省略時前線與能源線都可以。IMC-1-023 已用 `sourceLine:'front'`。042 與 079 沒有 `sourceLine`，行為不變。
- `peekTopOne` 是私下看自己牌頂 1 張，放回頂部或放到場外。只有控制者看得到那張卡，公開畫面不含卡 uid。IMC-1-017 已用。這不是公開。
- `revealTopTraitOptionalHand` 公開自己牌頂 1 張。印刷特徵相符時可以加入手牌，也可以放回頂或底；不相符時只有頂或底，不能進場外。雙方都看得到公開窗。它可以放在 `ifLiveThen` 的 `then`。IMC-1-006 已用這句並標成 ready。016 的看牌用 `peekTopOne`，抽棄後回收與 BP 切換還沒有，016 仍不標 ready。
- `activeExtraEnergy`、`ownTurnBp`、`opponentTurnBp`、`emptyOwnFieldHandEnergyDiscount`、`enterAlwaysActive`、`readyOnBlockCount`、`unblockedAttack`、`frontForbidden`、`blockBpRestriction`、`passiveBonuses` 已能從 IMC program 送進對戰卡。`passiveBonuses` 沿用既有條件，所以印刷張數、場外卡名與印刷必要能源可以決定 BP 或發生能源。發生能源沿用這張卡自己的顏色。沒有 `ready:true` 的卡不會進對戰包。
- `searchTopOneBottomDiscard` 既有 `noHandDiscard:true`。IMC-1-106 已用這個旗標看 3 張且不棄手牌；105 的窗口才會在入手後棄一張手牌。

## 第三階段共用機制

第三輪整合後，B 組 006、008、015、046、049，C 組 055、060、069、083、084，D 組 104、110 已寫進各組 programs，整句測試通過，並標成 ready。069 沿用 C 組已含的 #383，沒有再套一次。對戰包是這 12 張加上原先 61 張，共 73 張。016 的看牌、抽棄後回收與 BP 切換仍不完整，維持不在對戰包。作品 playable 仍是 false。

- `selfCurrentBpAtLeast` 讀這張角色的目前 BP。`otherOwnCharacterBpAtLeast` 讀另一張自己角色的目前 BP，`excludeSelf` 必須是 true。兩者都看目前 BP，不看印刷 BP。`oppCharacterBpAtLeast` 本來就是目前 BP。
- `onceBuffSelfWhen` 保留原本的兩段 `logic:'any'`。另一個形狀是 `oncePerTurn:true`，BP 為 500 的倍數，`when` 是上面的對手或自己其他角色門檻。成立才出現啟動，同一回合再用一次不會出現，下一回合清除使用紀錄後恢復。
- `restSelfBuffOther` 可以只帶 `bp` 與 `trait`。來源要休息，目標必須是另一張該特徵角色，沒有每回合一次。原本的無名形狀與具名突襲形狀不變。
- `ifLiveThen` 的後續可以是 `revealTopTraitOptionalHand`。公開句仍只能出現在角色的登場或攻擊效果，包含包在條件裡的時候。
- `bounceOppFrontOneUnderBp` 可以加 `orAtLeast`。目標的目前 BP 在 `bp` 以下或 `orAtLeast` 以上才合法，中間的角色不能選。沒有 `orAtLeast` 的舊句仍只看上限。顏色觸發的回手不受這個區間影響。
- `ownPrintedTraitCount` 的 `turn` 可以是 `any` 或 `own`。`own` 只在自己回合成立，比較的仍是印刷 BP 或印刷必要能源。081、082 維持 `any`，對手回合也成立。
- `grantOwnTraitBlockAtLeast` 是角色登場時的可選效果。最多指定 1 張自己場上、具有該特徵的角色。這個回合，目前 BP 達到門檻的角色不能阻擋它。未達門檻的阻擋者仍可選。這不是攻擊限制，也不改貫通、衝擊或狙擊的既有路徑。
- `handApDiscountWhileAllNames` 是角色欄位。兩個指定卡名同時在自己場上時，這張手牌的消費 AP 減 1，支付不會低於 0。場面改變後重新計算。既有的單名事件減費不變。
- `frontOnceProgram` 可以加 `minSelfBp`，後續是既有的二選一。只有前線、目前 BP 達門檻的角色能啟動，每回合一次，下一回合恢復。選一個分支就只跑那個分支，沿用啟動、選擇、再選目標的既有畫面。

`op:'imc'` 仍沒有接進 `engine.mjs`。ready 卡走既有 op。作品維持 `playable:false`。即使牌組裡每一張都已 ready，`editorV2Status`、`v2DeckReport` 與 `prepareSoloBattle` 仍拒絕正式對戰。受控測試用 `newUniversalMatch(createImcV2Pack(), ...)`。

## 第四階段共用機制

第 4 輪只加共用能力。下面這些卡仍不進對戰包，也不標 ready。B、C、D 要用新 op 寫整句並通過該張卡的測試，才能標 ready。

- `chooseFrontOrOwnTrait` 是同一次選擇。目標是對手前線角色，或自己場上帶指定特徵的角色。`excludeName` 只排除自己場上的那個印刷卡名，不排除對手。`optional:false` 是必須選 1 張，沒有跳過；`optional:true` 是最多 1 張。沒有合法目標時不開空的選擇。必須選的事件在沒有目標時不能使用。這不是 `buffAnyCharacter`：後者仍可選雙方能量區。052 的登場是必須選。113 的登場是最多 1 張。054 的第二句是同一個聯集，但它的同名一回合一次、以及對手目前 BP≥4500 才能活動自身，這輪沒有做。113 的 LiPPS 張數產生藍能源也沒有做。
- `recoverOutsideFiltered` 從自己場外加入手牌。可以指定特徵、顏色、印刷必要能源恰好 N、印刷必要能源 N 以下、以及持有突襲關鍵字（印刷 `raidName`）。不能同時寫恰好與以下。不看目前能源，也不看消費 AP。`max` 是 1 或 2。`raiseMax` 在自己場上、指定特徵且印刷必要能源恰好為該數字的角色達到張數時，把上限提高；預設把效果來源算進去，`excludeSelf:true` 才排除。角色張數沿用 `countOwnPrintedTrait`（條件 `ownPrintedTraitCount`），場地不算。`optional:true` 可以少拿或跳過；`optional:false` 有牌就必須拿到上限或沒有牌為止。沒有合法牌時不開選擇；必須選的事件不能使用。它可以放進 `optionalPayApThen` 的後續。051 的回手、087 的恰好能源與張數上限、111 的付費後入手可以用這句。051 的休息並退場後再從場外休息登場、111 的攻擊抽棄，這輪沒有做。
- `retireOppFrontUnderBp` 的 `scaleTrait` 本來就會在特徵達標時改 BP 上限，而且預設把效果來源算進去。030 與 SLG-1-077 維持這個形狀。新增 `scaleExcludeSelf:true` 才不計算來源。這句仍是必須選 1 張，不能跳過。沒有合法目標時，角色效果不開選擇；事件不能使用。062 是 3000，3 張升到 5000，來源要算進去，所以不要加 `scaleExcludeSelf`。099 的退場上限同樣用這句；099 另外的恰好能源加攻這輪沒有做。既有的 `traitCountBonus` 仍是可選且排除自身。
- `selfOwnEffectRaid` 只回答 Q2230 的「自分の效果でレイド」。成立的登場原因是 `handEffectRaid`、`outsideEffectRaid`、`deckEffectRaid`、`removedEffectRaid` 與 `lifeRaid`。付費手牌突襲 `paidRaid`、手牌或場外的普通效果登場、以及 `OWN_EFFECT_ENTRY` 裡的非突襲登場，都不成立。`turn` 必須是 `any`，因為對方回合的突襲觸發也算。它讀這次登場效果帶來的 `entryCause`，不改突襲底板、位置或登場／突襲效果的結算順序。020、024、028 可以用 `ifLiveThen` 接上既有句子。跳過下一次活動、具名手牌突襲的起動、傷害（2）、以及 028 的兩個不同選項，這輪沒有改寫。

## 第四輪整合

基準是 PR #391。依序併入 B 組 #393、C 組 #394、D 組 #392。對戰包從 73 張變成 77 張。作品 `playable` 仍是 false。

已進對戰包：

- C 組 IMC-1-062、IMC-1-087、IMC-1-099。062 是必須退場，3000，場上 3 張「ガールズ・イン・ザ・フロンティア」含來源時改 5000。087 用恰好印刷能源 2 的 Starry-Go-Round 回手，3 張時上限改 2，攻擊時可選自己角色 BP+1000。099 的退場是 2000，3 張時改 5000；恰好印刷能源 2 的 Starry 達 4 張時可選自己角色 BP+1000。
- D 組 IMC-1-113。登場是可跳過的 `chooseFrontOrOwnTrait`。場上 LiPPS 達 4 張時，沿用 `ownCardTraitCount` 與 `extraEnergy`，產生這張藍卡自己的 1 點藍能源。場地算進張數。

沒有進對戰包：

- B 組 020、024、028 的測試與 requests 保留。`selfOwnEffectRaid` 已驗證，整句仍缺跳過活動、只突襲的手牌起動、條件傷害（2）與兩個選項。
- 051 只有場外回手寫進程式，`ready` 仍是 false。052、054 的跨陣營選擇接不進休息起動與前線每回合一次。111 的付費回收已寫進程式，攻擊抽棄仍在 request。

## 第五階段共用機制

第 5 輪先只加共用能力。下面是當時的形狀。第五輪整合已把 020、024、052、054、111 寫進各組程式並放進對戰包。028 仍不在包裡。

- `restSelfThen` 可以接一個 `chooseFrontOrOwnTrait`。`frontOnly:false` 是前線或能量區都能休息自己。`oncePerTurn:true` 是這張實體卡的每回合一次。先休息，然後才選目標。必須選而且沒有合法目標時，不能起動，也不留下空的 pending。052 用這句，而且是起動，不要放進 onPlay。
- `frontOnceProgram` 可以接一個 `chooseFrontOrOwnTrait`。054 的第二句是前線、每回合一次、這張卡一次。沒有合法目標時不能起動。IMC-1-110 的 `minSelfBp` 加 `chooseOne` 維持原樣。
- `nameActive` 是同一張卡的另一句起動。形狀與 `nameOnceActive` 相同。`when` 可以是 `oppCharacterBpAtLeast`、`zone:'field'`、`minBp` 為 500 的倍數。這看的是對手角色目前 BP，前線與能量區都算。Q2240 這句不鎖住同一張卡的其他起動。Q2241 同名卡共用這一句。054 的「BP4500 以上不能阻擋」沿用 `blockBpRestriction`：`relation:'atLeast'`、`bp:4500`、`condition:null`。
- `restOppFrontOne` 的 `skipWhen` 可以是 `selfOwnEffectRaid`。它讀這次登場的 `entryCause`。只有選中的那張角色跳過下一次活動。付費突襲與休息登場不會跳過。生命突襲會。既有的 `skipNextActive` 會在開始、結束與活動效果各消耗一次。
- `ifLiveThen` 的後續可以是 `grantSelfAttackDamageThisTurn`、`amount:2`，而且 `when` 必須是 `selfOwnEffectRaid`。付費突襲得不到傷害（2）。單獨把傷害（2）放在登場仍會被拒絕。
- `raidOwnHandNamed` 只從手牌突襲。名字最多兩個，必須滿足能源，而且最多 1 張、可以跳過。沒有合法突襲底板時不開選擇。它不提供休息登場。`deployOwnHandRestOrRaid` 仍會提供休息登場。020 的起動是 `restSelfThen` 接這句。
- `optionalPayApThen` 的 `firstOwnAttack:true` 只在 `attacksThisTurn===1` 時出現。那是本回合自己角色的第一次攻擊，不是這張卡自己的每一次攻擊。`oncePerAttackTurn` 維持原意，不能兩個同時寫。它只能放在 onAttack。024 的付費後接 `raidOwnHandNamed`。
- `drawDiscard` 可以加 `when`。沒有 `when` 的舊句子不檢查場上。`ownRaidColorTrait` 要同時符合顏色、特徵與突襲關鍵字，而且是自己場上的角色。條件不成立時不抽牌、不開棄牌。成立時先抽再棄。111 用這句。不要改寫沒有 `when` 的 `drawDiscard`。
- 028 的最多兩個不同選項仍沒有做。`chooseUpToDistinctOrdered` 還是鎖在活動、加攻、休息。Q2234 到 Q2236 要等之後的 pending，不在這輪改選擇架構。

## 第五輪整合

基準是 PR #396。依序併入 B 組 #401、C 組 #400、D 組 #399。對戰包從 77 張變成 82 張。作品 `playable` 仍是 false。官方預組 `counts` 仍是 null。`origin/main` 的 `b4733c21`（PR #389 的 AI 難度顯示）已在這條分支裡。PR #398 沒有併入。

已進對戰包：

- B 組 IMC-1-020、IMC-1-024。020 的登場在 `selfOwnEffectRaid` 成立時，才讓選中的對方前線跳過下一次活動；起動只突襲手牌中的〈本田 未央〉或〈日野 茜〉。024 只在同一條件獲得本回合傷害（2）；攻擊先抽 1，只有本回合自己角色第一次攻擊才可付 1 AP，然後只突襲〈本田 未央〉或〈高森 藍子〉。
- C 組 IMC-1-052、IMC-1-054。052 是休息自己後的跨陣營選擇，前線與能量區都可以。054 的活動自身是 `nameActive`，對手場上目前 BP≥4500 才出現，同名共用一次；前線每回合一次的選擇是另一句 `frontOnceProgram`，兩句不互相鎖。不能被 BP≥4500 阻擋沿用 `blockBpRestriction`。`imc-pack.mjs` 的允許欄位與複製欄位都包含 `nameActive`，其他作品不走這個檔案。
- D 組 IMC-1-111。登場可付 1 AP，付了才回收場外黃色、ポジティブパッション、持有突襲的卡。攻擊時三個條件同時成立才抽 1，再把 1 張手牌放場外。沒有 `when` 的 `drawDiscard` 不套這個條件。

沒有進對戰包，共 31 張：

- B 組 003、004、009、011、012、016、028、029、032、033、036、037、039、043。028 仍是最多兩個不同選項。
- C 組 051、057、061、064、065、068、072、073、074、075、078、080、093、094、097。051 的回手已寫進程式，`ready` 仍是 false。
- D 組 107、112。

## 第六階段共用機制

基準是 PR #402 的 `7779f1892ab7adb2c4b625f6ad0ba05c7b4e60e4`。這輪只加共用能力。028、033、065、078、112 還不能標 ready，也不在 82 張對戰包裡。`chooseUpToDistinctOrdered` 仍鎖在活動、加攻、休息。

- `choosePrintedOptions` 最多選 2 個不同的印刷選項，可以只選 1 個或不選。同一項不能留在選擇裡兩次。結算走印刷順序，不走點擊順序。有 `when` 的選項會先收成 `resolvePrintedOption`，等前一項做完再重新判斷。`when` 讀得到這次登場的 `entryCause`。付費突襲與休息登場不會打開 `selfOwnEffectRaid`。自己效果的突襲、牌庫效果突襲與生命突襲會。沒有合法選項時不開 pending。
- 選項內的回手用 `bounceOwnOtherUnderEnergy` 的新形：`optional`、`energy`、`trait`，`then` 恰好是一個 `deployOwnHandRestOrRaid`。沒有 `trait` 的舊形仍只接同樣費用的場外回收。特徵不符或費用超過的角色不能回手。不回手就不會跑後面的手牌登場。回手成功後才看手牌。手牌那句沿用既有的休息登場或突襲，顏色、AP、名字與可支付能源都要符合。沒有合法手牌時不開第二個 pending。
- `lookTopScript` 私下查看牌庫頂 1 到 10 張。`takes` 是 1 或 2 個步驟，順序就是印刷順序。每步都是最多，可以不選。同一步不能選同一張實體卡兩次。一步做完才檢查下一步。牌庫不夠就只看剩下的；牌庫是空的不開 pending。最後 2 張以上沿用 `effect-top-order` 放到底，只剩 1 張就直接放到底，沒有剩餘就結束。
- 步驟形狀只有四種。`to:'hand'`、`eachName:true`、`publish:true` 是指定名字各最多 1 張，加入手牌的那些要公開。不能選的留在窗裡。`to:'restOrRaid'` 是指定顏色與特徵的角色，來源是查看窗，不是手牌；休息登場的 `entryCause` 是 `deckEffect`，突襲是 `deckEffectRaid`。沒有合法底板時不提供突襲，但仍可休息登場。`to:'rest'` 另加 `energyExact`，只有休息登場，即使那張卡有突襲也不提供。`to:'hand'`、`publish:false` 是窗裡任意 1 張入手，不公開，也不限特徵。
- 從查看窗把角色放到場上時，沿用共用的選角、普通進場、突襲進場。只印休息的句子不出現突襲。不要一格一顆執行鈕。
- `bottomOwnCharacterThen` 可把 1 張自己場上角色放到牌庫底。跳過，或場上沒有角色，就不會查看。只有真的放到底之後，才跑後面的 `lookTopScript`。突襲疊在下面的層沿用既有的置底：最上面那張進牌庫，底下的層到場外。
- 033 用名字入手。065 用藍色特徵的休息或突襲。078 用紅、Starry-Go-Round、印刷必要能源恰好 2、只休息。112 用置底後的兩步：藍色特徵休息登場，再加上任意 1 張入手。Q2258 入手不限特徵。這些句子現在表現得了，卡牌程式仍由 B、C、D 寫。
- IMC-1-011 與 IMC-1-012 這輪沒有做。兩張都是自己回合、自己的 BP 被增加時，每回合一次再加 BP，但 011 是 +1000，012 是 +500，而且 012 後面還有 BP 達標才取得的狙擊，以及攻擊時的抽牌。加 BP 的地方散在被動、暫時效果和各作品的結算裡。要先分得開印刷被動、暫時加值、效果自己造成的追加 BP，以及回合重置，不能讓 012 的追加 BP 再觸發自己。這會碰到很多作品的加值路徑，留到下一輪。`grantSelfSniperThisTurn` 是立刻取得，不能拿來寫 012 那個稍後才判斷的狙擊。

## 第六階段後續共用機制

基準是 PR #404 的 `ac47eb40589a5f78a8fcfc7f2a2012e6b8203b73`。這輪補三個共用缺口。011、012、039、051、061、075、107 的句子已經表現得了，程式仍由 B、C、D 寫。`ready` 維持 false，這七張不進 82 張對戰包。作品 `playable` 仍是 false。官方預組 `counts` 仍是 null。075 的場上加場外種類數 BP 還沒有對應欄位，所以 075 整張仍不能標 ready。

`fieldRestRetireThen` 的三個後續維持原樣：場外指定登場、抽 2 棄 1、強制的手牌休息或突襲。新的連續支付用 `restRetireSequence`。

### BP 增加觀察者

角色欄位 `bpGainFollow:{bp}`。`bp` 是 500 到 5000 的 500 倍數。只有這一個鍵。`implementation` 寫 `dsl`。011 是 `{bp:1000}`，012 是 `{bp:500}`。

觀察的是這張卡自己身上、尚未標成追加的正數暫時 BP。`untilTurn` 等於目前回合，或 `untilOwnTurnStart` 仍活著，都算。`ownTurnBp`、`opponentTurnBp`、`raidOwnTurnBp`、`passiveBonuses` 與 `ownEffectPresenceBp` 是印刷被動，不進這個觀察。追加 BP 會標上 `bpGainFollow:true`，下一次檢查不再把它算成新的增加。

卡片第一次被看到時只記下目前的暫時 BP，不追加。之後暫時 BP 變高，而且是這張卡控制者的回合、這張卡沒有被沉默、這個回合還沒追加過，才加上印刷的那個數字，持續到這個回合結束。對方回合的增加會更新記下來的數字，不消耗每回合一次。沉默期間的增加也只更新數字。追加發生後，同一個回合再被加值不會再追加。

### 動態狙擊

`grantConditionalSniperThisTurn` 只放角色的 `onPlay`，鍵只有 `op` 與 `minBp`。`minBp` 是 500 的倍數，500 到 50000。012 寫 `{op:'grantConditionalSniperThisTurn',minBp:7000}`。它記下本回合、這次登場的門檻。宣告攻擊時重讀目前 BP。達到門檻才有狙擊目標；之後掉下去就沒有。`grantSelfSniperThisTurn` 仍是立刻取得，012 的登場句用條件式這句。

012 的攻擊句沿用 `{op:'drawIfSelfBpAtLeast',bp:5000,count:1}`。突襲框沿用既有 `raidName:'城ヶ崎 莉嘉'`，那一行留在圖上，不寫進 `effects`。

012 的程式形狀：

```js
{implementation:'dsl',raidName:'城ヶ崎 莉嘉',bpGainFollow:{bp:500},
 effects:{onPlay:[{op:'grantConditionalSniperThisTurn',minBp:7000}],
  onAttack:[{op:'drawIfSelfBpAtLeast',bp:5000,count:1}]}}
```

011 只有 `implementation:'dsl'` 與 `bpGainFollow:{bp:1000}`。

### 休息退場後的連續登場

`mainAbility` 用 `restRetireSequence`。角色與場域都可以。費用固定是先休息這張、再讓這張退場，兩步都做，不能只做一步。`then` 恰好一步，而且是 `deployOutsideColorTraitRest` 或 `deployOwnHandRest`。`gate` 可省略；寫了就只能是 `{kind:'oppCharacterBpAtLeast',bp}`，`bp` 為 500 的倍數。`draw` 可省略；寫了就只能是 `1`。抽牌在退場之後、後續選擇之前。後續登場是最多 1 張，可以不選。場外沒有合法卡時，費用仍然付完，不開 pending。跳過登場不會把休息或退場還原。

門檻不成立時，起動不出現。場域必須在能量區。角色在前線或能量區都可以。登場發生時，來源已經在場外，後續不要求來源還留在場上。

051 的登場回手維持現有 `recoverOutsideFiltered`。起動接在同一個程式：

```js
{op:'restRetireSequence',gate:{kind:'oppCharacterBpAtLeast',bp:4500},
 then:[{op:'deployOutsideColorTraitRest',color:'blue',trait:'LiPPS',
  maxEnergy:2,ready:false,optional:true}]}
```

107 是場域：

```js
{op:'restRetireSequence',draw:1,
 then:[{op:'deployOwnHandRest',type:'character',color:'red',energy:3,ap:1,max:1}]}
```

抽到的那張在手牌選擇裡。手牌登場沿用既有的選卡與休息進場，能量區與前線都能放。

### 自己效果的在場 BP 與連續移動

角色欄位 `ownEffectPresenceBp`，500 到 5000 的 500 倍數。039 寫 `1000`。自己的回合，而且這張卡本回合以自己的效果新進入前線或能量區，或被自己的效果在兩條線之間移動，BP 才加上這個數字。付費登場、移動階段的移動與步進是規則移動，不加。離開場上就清掉這兩個紀錄。這個加值是被動，不觸發 `bpGainFollow`。

039 的起動：

```js
{op:'discardExactFrontMove',line:'energy',dest:'front',attackEnd:'energy',
 trait:'ガールズ・イン・ザ・フロンティア',count:3}
```

六個鍵都要在。來源要在能量區，手牌至少 1 張，前線帶該特徵的角色恰好是 `count` 張。先選 1 張手牌放場外，付完才移動。空位只有一個就直接移過去。空位有兩個以上時開 `effect-move-self`，動作是 `chooseMoveSelf`，帶 `line`、`slot`，目標列滿了再帶 `replaceUid`。被換下的卡進移除區。Q2238 用這個既有的滿列置換。移動完成後，這張卡本回合得到「這張卡的攻擊結束時，移到能量區」。那是這張卡的攻擊結束，排在戰鬥與生命觸發確認之後。Q2239：對玩家造成傷害時，觸發確認結束才移動。能量區只剩一個空位就直接回去；要選位置時同樣用 `chooseMoveSelf`。`grantSelfAttackEndSwapThisTurn` 仍是交換，039 用上面這句。

### 攻擊階段結束回手

061 的未被阻擋抽牌沿用 `unblockedAttack:{optional:true,then:[{op:'draw',count:1}]}`。登場是兩步：

```js
{op:'activeSelf'}
{op:'optionalReadyApThen',then:[{op:'grantAttackPhaseEndHand'}]}
```

`optionalReadyApThen` 只放角色的 `onPlay`，`then` 恰好是只有 `op` 的 `grantAttackPhaseEndHand`。場上有休息的自己 AP 才開選擇，可以不活動。真正活動了 1 張 AP，才授予「這個攻擊階段結束時，這張卡回手」。跳過，或沒有休息的 AP，都不授予。回手發生在攻擊階段結束、下一階段開始之前。生命觸發還開著時，階段不能往下走。Q2243 仍是未被阻擋抽牌的時機，抽牌句子本身沒有改。

### 回手後的手牌休息登場

`bounceOwnOtherUnderEnergy` 的特徵形 `then` 現在也可以是 `deployOwnHandRest`。沒有 `trait` 的舊形仍只接同樣費用的場外回收。075 的登場：

```js
{op:'bounceOwnOtherUnderEnergy',optional:true,energy:1,trait:'お願い！シンデレラ',
 then:[{op:'deployOwnHandRest',type:'character',color:'red',energy:1,ap:null,
  max:1,trait:'お願い！シンデレラ'}]}
```

`ap:null` 表示印刷沒有另寫消費 AP。回手可以跳過；跳過就不看手牌。回手成功後，剛回到手牌的那張會出現在休息登場的選項裡。Q2248 用這個順序。沒有合法手牌時仍可跳過。075 印刷能源是 4，自己不符合「能源 1 以下」，場上符合的同伴可以回手。

075 另一句是自己回合、場上與場外的「お願い！シンデレラ」卡名合計 6 種以上才 BP+1000。這句用第七輪公布的 `passiveBonuses`，形狀與已進對戰包的 071 相同，BP 是 1000。075 整張還有回手與休息登場，先不標 ready。

## 第六輪整合

基準是 PR #408，分支含 PR #404 的共用引擎。這輪把 B 組 #407、C 組 #406、D 組 #405 的卡牌程式逐張接上，並修正突襲疊層置底的移動帳本。對戰包從 82 張變成 89 張。作品 `playable` 仍是 false。官方預組 `counts` 仍是 null。`origin/main` 已合併的 AI 與衝擊選生命留在這條分支。沒有併入其他尚未合併的研究 PR。

已進對戰包，七張：

- B 組 IMC-1-036。自己回合，而且本回合自己的效果讓角色登場或效果突襲時，這張卡 BP+1000。條件是 `ownEffectCharacterEntryOrRaidThisTurn`。付費登場、付費突襲與對方回合不加。印刷是「自分の効果」，事件或場地效果讓角色登場也算。這和 039 的 `ownEffectPresenceBp` 不同：036 看的是自己的任一角色，039 看的是這張卡自己。
- C 組 IMC-1-080。能源區登場，而且自己場上印刷必要能源恰好 2 的 Starry-Go-Round 至少 3 張（自己算）時，這張卡活動登場。前線登場不會活動。起動是 `restSelfBuffOther`，必須選 1 張其他自己角色，本回合 BP+1000。
- D 組 IMC-1-028、033、065、078、112。028 用 `choosePrintedOptions`，最多 2 個不同選項，依印刷順序。033、065、078 用 `lookTopScript`。112 用 `bottomOwnCharacterThen` 接 `lookTopScript`。Q2258：入手不限特徵。078 只休息登場，不提供突襲。

突襲疊層置底：看得見的那張從它所在的前線或能量區進牌庫底。底下每一層從 `raid-under` 到場外，每張實體卡只記一次。普通沒有疊層的角色仍只有場上列到牌庫底那一筆。

沒有進對戰包，共 24 張：

- B 組 003、004、009、011、012、016、029、032、037、039、043。011、012、039 的句子已經表現得了，程式還沒寫。
- C 組 051、057、061、064、068、072、073、074、075、093、094、097。051 的回手已在程式裡，`ready` 仍是 false。061 與 075 的登場句已經表現得了。075 的 6 種卡名 BP 用第七輪的 `passiveBonuses`。
- D 組 107。缺口維持 `fieldRestRetireThen` 與 `deployOwnHandSpecial`。程式用 `restRetireSequence`，抽 1 再接只休息的 `deployOwnHandRest`。還沒寫，不能標 ready。

## 第七輪 A 組共用能力

基準是 PR #409 的 `1b49925c6d48f13e94fddb6811e333979b84a060`。這一輪只加共用引擎、共用契約與共用測試。沒有編寫逐卡程式，沒有把任何一張標成 ready，對戰包仍是 89 張。作品 `playable` 仍是 false。官方預組 `counts` 仍是 null。B、C、D 可以開始寫下面已解鎖的句子。整句測試通過之前，不要標 ready。

`imc-pack.mjs` 的程式欄位可以複製 `altMainAbility`、`moveTriggers`、`attackLoseActiveOnce`、`cannotAttack`、`attackWinDraw`、`phaseEffects`。`passiveBonuses` 原本就能複製。

### 兩段獨立起動

003 的第一段維持 `mainAbility` 的 `onceBuffSelfWhen`。第二段是角色欄位，不放進 `mainAbility`，也不使用 `printedMains`：

```js
altMainAbility:{op:'frontOnceActiveSelf',frontOnly:true,oncePerTurn:true,minSelfBp:5000}
```

四個鍵都要在。`minSelfBp` 是 500 到 50000 的 500 倍數，看的是現在 BP。只在前線提供，動作是 `{type:'activate',mode:'altFrontActive'}`。使用紀錄在 `altMainAbilityUsedUids`，與 `mainAbilityUsedUids` 分開。用了第一段，第二段還在；用了第二段，第一段還在。下一回合兩段都回來。能量區、BP 不足、已經用過、效果被失効，都不會提供第二段。突襲後看得見的那張仍在前線，可以起動。`frontOnceProgram` 加 `minSelfBp` 再接 `activeSelf` 仍是非法形，不要改用那句。

### 依來源特徵的手牌進場外

004 的觸發寫在被移動的那張卡的 `moveTriggers`。條件不要寫 `sourceName`，也不要寫 `sourceOnField`：

```js
moveTriggers:[{
 when:{from:'hand',to:'outside',sourceTrait:'BEYOND THE STARLIGHT',
  reasons:['payment','own-effect']},
 then:[{op:'buffOwnField',filter:{field:'trait',value:'BEYOND THE STARLIGHT'},
  bp:1000,optional:true,excludeSelf:false}]
}]
```

`reasons` 可以是 `payment`、`own-effect`，或兩者各一次。移動發生時，原因卡的印刷特徵會寫進該筆帳本的 `sourceTraits`。原因卡在前線、能量區、結算中、手牌、場外、牌庫、生命或移除區都會留下 `sourceUid` 與 `sourceCardId`。只有原因卡當時真的在前線或能量區，`sourceOnField` 才是 true。自己把自己從場上彈回手牌仍記成在場上，與舊帳本相同。沒有 `sourceTraits` 的舊事件不會新符合特徵條件。`sourceTrait` 與 `sourceOnField` 寫在同一條條件仍會被拒絕。具名的 `sourceName` 觸發沒有改。

### 同一次選擇之後的衝擊

032、093 都用一次 `buffOwnField`。不要拆成兩次選擇。`impactIfName` 與 `impactIf` 只能有一個，而且不能和 `bonusNames` 一起用。

032：

```js
{op:'buffOwnField',filter:{field:'trait',value:'BEYOND THE STARLIGHT'},
 bp:2000,optional:true,excludeSelf:true,impactIfName:'城ヶ崎 莉嘉'}
```

選到的那張印刷卡名相同，才在那張卡得到本回合衝擊 1。選到其他合法角色只加 BP。跳過兩者都沒有。

093 的衝擊看結算當下，不看選擇打開時：

```js
{op:'buffOwnField',filter:{field:'trait',value:'お願い！シンデレラ'},
 bp:1000,optional:true,excludeSelf:false,
 impactIf:{kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',
  excludeSelf:false,trait:'お願い！シンデレラ',min:9}}
```

條件不成立時，選到的卡仍得到 BP，不得到衝擊。條件成立時，衝擊只在被選的那張。`bonusNames` 與 `buffNameOrTraitImpact` 的舊行為沒有改。

### 支付 AP 成功之後

037 的攻擊句：

```js
{op:'optionalPayApThen',ap:1,optional:true,
 then:[{op:'grantSelfImpactThisTurn',amount:1}]}
```

`grantSelfImpactThisTurn` 現在可以放進這個 `then`。其他 `then` 沒有放寬。沒有休息的 AP 不會開選擇，也不會給衝擊。跳過不付 AP、不給衝擊。付成功才給這張角色本回合衝擊 1。`firstOwnAttack` 與 `oncePerAttackTurn` 的規則沒有改。

### 場上與場外的卡名種類 BP

075 的 BP 不用新欄位。與 070、071 相同：

```js
passiveBonuses:[{bp:1000,condition:{
 kind:'ownDistinctTraitNames',turn:'own',zone:'fieldOutside',excludeSelf:false,
 trait:'お願い！シンデレラ',min:6}}]
```

種類數不滿 6 是印刷 BP。場上或場外加進第 6 種不同卡名，下一次讀 BP 就加上 1000。少一種立刻回到印刷 BP。同名只算一次。自己要算進去。手牌、牌庫、移除區與突襲底下的層不算。對方回合不加。075 的回手與休息登場仍要 C 組寫完整句，這張先不標 ready。

### 這輪另外解鎖的共用句子

057 敗北後只活動、不加 BP。與 `attackLoseReadyTurn` 不能寫在同一張卡：

```js
attackLoseActiveOnce:{once:'card'}
```

自己這張卡在自己的攻擊裡敗北時活動，每回合一次。效果被失効不會活動。`attackLoseReadyTurn` 仍是活動並 BP+1000。

074 的 `buffOwnField` 在 `optional:true` 時可以加 `max:2`。同一次效果最多選兩張不同的合法角色。選了第一張，剩下的選擇裡不會再有它。可以跳過，跳過不加。沒有 `max` 的舊句仍只能選一張。

009 的手牌休息或突襲可以加特徵，並在成功之後依登場那張的印刷能源扣自己的 BP：

```js
{op:'deployOwnHandRestOrRaid',type:'character',color:'yellow',maxEnergy:3,ap:1,
 max:1,optional:true,names:null,trait:'BEYOND THE STARLIGHT',energyPenalty:1000}
```

`trait` 與 `energyPenalty` 都可以單獨省略。`energyPenalty` 只能是 1000，扣的是實際登場或突襲那張卡的印刷必要能源乘 1000，本回合減在效果來源上。跳過不扣。沒有 `trait` 的舊句仍不看特徵、不扣 BP。休息與突襲兩條路都扣。

073 的 `ifLiveThen` 現在可以接 `takeTopHandRestOutside`。`count` 仍只能是 2：

```js
{op:'ifLiveThen',when:{kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',
 excludeSelf:false,trait:'お願い！シンデレラ',min:9},
 then:[{op:'takeTopHandRestOutside',count:2}],
 else:[{op:'draw',count:1}]}
```

9 種成立才查看牌頂 2 張，選 1 張入手，另一張進場外。兩張都是合法選擇，出現在操作者的非公開 `options`，每張帶 `cardId`、卡名與顏色。這個 pending 沒有另附 `inspected`。對手的非公開選擇是 null，公開畫面不含這兩張牌庫 UID。不成立時走 `else` 的抽 1，不查看。

### 看牌頂之後依現在 BP 加攻

016 是角色 `mainAbility`，六個鍵都要在。不要用 `frontOnceProgram` 加 `peekTopOne`。

```js
mainAbility:{op:'frontPeekThenBuffOthers',frontOnly:true,oncePerTurn:true,
 minSelfBp:5000,highBp:7000,bp:1000}
```

`highBp` 必須大於 `minSelfBp`。三個 BP 都是 500 的倍數，`bp` 最大 5000。只在前線、現在 BP 達 `minSelfBp`、這回合還沒用過、效果沒有失効時，動作是 `{type:'activate',mode:'peekBuffOthers'}`。使用紀錄在 `mainAbilityUsedUids`。牌庫有牌時先開既有的 `private-top-choice`，`follow` 是 `buffOthers`。操作者看牌頂，對手的非公開選擇是 null，公開畫面不含那張 UID。放到場外之後才結算加攻。現在 BP 達 `highBp`，其他己方角色全部本回合加 `bp`，不再選擇。不足 `highBp` 時必須選 1 張其他己方角色，pending 是 `effect-peek-buff`，不能跳過。牌庫是空的仍依當時 BP 加攻，不開查看。能量區不提供。

### 場域依棄牌觸發改數值，休息則給衝擊

029 是場域 `mainAbility`，七個鍵都要在：

```js
mainAbility:{op:'fieldDiscardOrRestImpact',bp:1000,triggerBp:3000,
 trigger:'special',trait:'BEYOND THE STARLIGHT',minBp:7000,impact:1}
```

`trigger` 只能是 `special`。棄牌與休息是兩條獨立起動，沒有每回合一次，也不共用使用紀錄。效果失効時兩條都不提供。棄牌在手牌有牌時提供，動作是 `discardScale`，不休息場域。選一張手牌放到場外，理由是 `own-effect`。被棄的那張印刷 `trigger` 等於 `special` 時，加攻用 `triggerBp`，否則用 `bp`。場上沒有角色就結束。有角色才開 `effect-scale-buff`，可以跳過。休息要場域是活動狀態，而且每一張己方角色都有那個特徵，其中至少一張現在 BP 達 `minBp`。場域自己不算角色。動作是 `restImpact`，先休息場域，再選一張達標角色，給本回合衝擊 `impact`。結算時會再查特徵與 BP。

特殊觸發的測試卡本身要有合法的 `triggerEffect`。只寫 `trigger:'special'` 仍會被拒絕。

### 查看、休息登場、棄牌活動，以及突襲底板回手

043 的攻擊句必須是角色唯一的 `onAttack`。`afterEntered` 不能寫在最外層的 `lookTopScript`。

```js
{op:'bottomOwnCharacterThen',optional:true,max:1,type:'character',then:[{
 op:'lookTopScript',count:3,rest:'bottom',afterEntered:'discardActive',
 takes:[{to:'rest',type:'character',max:1,color:'blue',trait:'ガールズ・イン・ザ・フロンティア'}]
}]}
```

跳過放底就不會查看。查看裡這條 `to:'rest'` 不提供突襲。跳過登場會把查看窗放到牌底，不開棄牌。休息登場成功時，那張卡的 `onPlay` 先結算，剩下的牌才排順序放到底，之後才開 `effect-entered-discard`。登場或突襲當下、還沒有開新選擇之前，查看窗先從牌庫拿開，所以這段抽到的是查看窗下面的牌。若登場效果先開了選擇，查看窗會放回牌頂，卡片數量才對得上；那個選擇之後的抽牌仍看得到查看窗。棄牌可以跳過，登場的卡維持休息。棄了才活動剛登場的那張，移動理由是 `own-effect`。對手看不到查看窗。

突襲底板回手仍是唯一的角色 `onRetire`，而且卡上要有 `raidName`。無卡名條件的新形是三個鍵：

```js
{op:'returnOwnRaidBase',optional:true,max:1}
```

只有 `optional:true` 的兩個鍵仍是非法。舊的 `when:{kind:'ownNameExists',...}` 三鍵形沒有改。回手只看這一回合、這張退場卡的直接底板：帳本是 `raid-under` 到 `outside`、理由 `rule`、`attachedToUid` 是退場卡，而且退場卡在場外並帶著同一個 `raidBaseUid`。被阻擋而攻擊敗北時雙方都不退場，所以不會因此回手。

### 場上特徵夠多時，回手可以改成退場

064 是事件唯一的 `onPlay`：

```js
{op:'bounceOrRetireOppByFieldTrait',bp:5000,min:3,trait:'LiPPS'}
```

`bp` 是 500 的倍數。`min` 是 1 到 8。目標是現在 BP 不超過 `bp` 的對手前線角色。選擇時再決定 `bounce` 或 `retire`。`retire` 只在己方場上帶該特徵的卡片張數達 `min` 時合法。算的是張數，不是卡名種類，場域自己要算，結算時再算一次。張數不足時，退場動作不在合法清單裡。回手的移動是 `front` 到 `hand`，理由 `opponent-effect`。

`conditionalBounceOrRetireByOwnOutsideNames` 仍不能加 `trait`。

### 最多選一個複合印刷選項

068 是 `choosePrintedOptions` 的第二個精確形。`max` 是 1，`optional` 是 true，正好兩個選項。一個 `then` 是 `optionalRetireOwnOtherThen`，而且這個選項不能有 `when`。裡面正好兩步，例如抽 2，再接已有的 `deployOwnHandRest`。另一個 `then` 是 `retireOppFrontOneUnderBp`，而且必須有 `when`。

```js
{op:'choosePrintedOptions',max:1,optional:true,options:[
 {id:'retire',label:'退自己',then:[{op:'optionalRetireOwnOtherThen',then:[
  {op:'draw',count:2},
  {op:'deployOwnHandRest',type:'character',color:'red',energy:3,ap:1,max:2,trait:'お願い！シンデレラ'}
 ]}]},
 {id:'front',label:'退對手',when:{kind:'ownDistinctTraitNames',turn:'any',
  zone:'fieldOutside',excludeSelf:false,trait:'お願い！シンデレラ',min:9},
  then:[{op:'retireOppFrontOneUnderBp',bp:5000,optional:true}]}
]}
```

`optionalRetireOwnOtherThen` 不能當最外層效果。什麼都不選就結束。選了退自己再跳過，不會抽牌，也不會登場。`max:1` 選了一項就不能再選另一項。`when` 在開選項時不成立，那個選項不會出現。抽 2 再直接接沒有 `when` 的 `retireOppFrontOneUnderBp` 仍是 `invalid printed option set`。`max:2` 的活動、加攻、休息舊形沒有改。

### 付費活動，以及戰鬥勝利後的可選抽牌

072 的登場句必須是角色唯一的 `onPlay`：

```js
{op:'optionalHandTraitOutsideThenActive',trait:'お願い！シンデレラ'}
```

手牌沒有該特徵就不會開選擇，角色維持登場時的狀態。跳過不活動、手牌不動。支付把那張手牌放到場外，理由是 `payment`，然後只活動效果來源。來源已經不在場上就只完成支付。

戰鬥勝利抽牌是第三個 `attackWinDraw`。舊的具名抽牌與本回合移動抽牌仍是強制的，不能加 `optional`。

```js
attackWinDraw:{count:1,optional:true,condition:{
 kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',excludeSelf:false,
 trait:'お願い！シンデレラ',min:9}}
```

條件在攻擊勝利、仍是攻擊階段、這張卡的攻擊次數至少 1、牌庫還有牌時才開 `effect-attack-win-draw`。可以跳過。抽 1 的理由是 `own-effect`。沒有 `optional` 的 `ownDistinctTraitNames` 仍會被拒絕。

### 手牌進場外之後，突襲底板休息登場

094 必須是角色唯一的 `onAttack`。不要用 `deployOwnRaidBaseRest`，那個仍只能寫在 `onRetire`。

```js
{op:'optionalHandOutsideThenRaidBase'}
```

手牌是空的就不會開支付。跳過時，手牌與突襲疊層都不動。支付的理由是 `payment`。來源仍在，而且 `stack[0]` 是角色時，才選那張底板的休息登場位置。底板離開疊層，以休息狀態進前線或能量區，移動是 `raid-under` 到該列，`attachedToUid` 是攻擊者。攻擊者留下。若 `raidBaseUid` 就是這張底板，登場後會清掉。底板的 `onPlay` 用 `outsideEffect`。

### 攻擊階段開始支付 AP，失去本回合印刷效果

097 的角色要 `implementation:'dsl'`，並寫 `cannotAttack:true`。印刷的不能攻擊會擋攻擊清單。效果失効之後，這條印刷限制不再擋。別人給的 `cannotAttack` 連續狀態仍會擋，而且必須在給予方下一次自己的開始階段結束。

階段效果只能是自己的攻擊階段開始，而且 `then` 只有這一個支付：

```js
phaseEffects:[{phase:'attack',edge:'start',turn:'own',then:[{
 op:'optionalPayApThen',ap:1,optional:true,then:[{op:'silencePrintedSelf'}]
}]}]
```

`silencePrintedSelf` 只能出現在這條 `phaseEffects` 的 `then` 裡。沒有休息的 AP 不開選擇，也不失効。跳過不付、不失効。付成功才把 `originalEffectsDisabled` 給這張卡，持續到對手的開始階段。既有的 BP 修正、衝擊與別人給的連續狀態都留著。自己回合的 `ownTurnBp` 在失効期間不加成。失効結束後，對手回合的 `opponentTurnBp` 照常計算。自己下一個開始階段之後，印刷的不能攻擊恢復。Q2250 到 Q2252：失去印刷效果不會清掉修正或其他連續賦予。

### 這輪仍不要替各組寫程式

011、012、039、051、061、107 在第六輪已經表現得了。075 的回手與休息登場仍是 C 組的整句。上面新解鎖的舊近似形維持非法。`playable` 維持 false。官方預組 `counts` 維持 null。

## 最後 8 張

016、029、043、064、068、072、094、097 的印刷句已經寫進程式，`ready` 為 true，對戰包是 97 張。卡面文字來自 `dist/imc/cards-001-050.mjs` 與 `dist/imc/cards-051-100.mjs`，不是依缺口摘要改寫。

仍未進這條分支的 16 張是 003、004、009、011、012、032、037、039、051、057、061、073、074、075、093、107。B、C、D 的程式留在各自的 PR，這條分支沒有覆蓋。目前對戰包裡「お願い！シンデレラ」只有 8 種卡名；068 的第二句與 072 的勝利抽牌要 9 種，等 073、074 或 075 進包之後，正式牌組才湊得到。程式本身會在種類數達到 9 時提供那兩句。

`playable` 仍是 false。官方預組 `counts` 仍是 null。沒有合併 `main`，也沒有部署。

## 整合進 main 的基準

這一輪從 `origin/main` 的 AI、攻擊與衝擊修正接著做，沒有把舊的 round 基準整支合併進來。#422 的 8 張，加上 #415 的 003、004、009，#416 的 032、037、073、093，以及 #417 裡已經驗證的 057、074，對戰包是 106 張。#417 後面只記錄 068、072、094、097 缺口的提交沒有採用，那 4 張維持 #422 的完成程式。

仍未標 ready 的 7 張是 011、012、039、051、061、075、107。075 的回手與休息登場還沒寫完，不因為被動 BP 欄位已存在就標 ready。`playable` 維持 false。官方預組 `counts` 維持 null。這次整合沒有合併 `main`，也沒有部署。

## 第 9 輪 A 組

共用操作契約在 `docs/v2-handoff/V2-R9A-shared-ops.md`。011、012、039、051、061、075、107 的句子在這條整合基準上已經表現得了，這一輪沒有重寫，也沒有標 ready。

PR #410 只把 IMC-1-107 標成 ready，基準比 #424 舊，而且沒有引擎改動。不要把那個提交摘進來。D 組寫 107 時複製契約裡的 `restRetireSequence`，用目前引擎重跑之後才標 ready。

075 的 6 種卡名 BP 仍用第七輪的 `passiveBonuses`。回手句寫完之前維持 ready false。

## 第 10 輪整合

基準是 #424 的 `499cce592e`。依序摘入 #428、#427、#426、#425。四個提交的父提交都是這個基準，檔案沒有重疊，已完成的效果沒有被覆蓋。`origin/main` 的 AI、攻擊與衝擊修正仍是這條分支的祖先。

IMC 對戰包現在是 `IMC-1-001` 到 `IMC-1-113`，113 張都 `ready:true`。011 是 `bpGainFollow` 1000。012 是突襲城ヶ崎 莉嘉、`bpGainFollow` 500、登場 `grantConditionalSniperThisTurn` 7000、攻擊 `drawIfSelfBpAtLeast` 5000。039 是 `ownEffectPresenceBp` 1000，起動 `discardExactFrontMove`，特徵ガールズ・イン・ザ・フロンティア，正好 3 張。051 是觸發 `bounceOppFrontUnderBp` 3500、登場 `recoverOutsideFiltered`、起動 `restRetireSequence` 且門檻是對手角色 BP 4500。061 是可跳過的 `unblockedAttack` 後抽 1，登場先 `activeSelf` 再 `optionalReadyApThen`。075 是 6 種卡名的 `passiveBonuses`，登場 `bounceOwnOtherUnderEnergy` 後 `deployOwnHandRest`。107 是 `restRetireSequence` 抽 1，再休息登場紅、能源 3、AP 1。三份 request 都是空陣列。

MHA 去重後的目錄是 109 張。對戰包 49 張 ready，pending 60 張。新進包的是 012 `restSelfGainEnergyRetireEndMain`、019 `frontOnceProgram` 後 `enemyBpDown`、027 前線 `ownNameOrRaidBase` オーバーホール、053 攻擊時 `chooseOne` 的 BP+1000 或衝擊 1。063 同時留在補充包與預組的 request，算 1 張。預組 063、101、102、105、106、107、108、109 仍不在對戰包。

`getTitle('imc').playable` 與 `getTitle('mha').playable` 維持 false。IMC 官方預組 `counts` 維持 null。`UA10ST_PRODUCT.recipe` 維持 null。這次整合沒有合併 `main`，也沒有部署。

## 第 11 輪整合

基準是 #431 的 `a4b3a51fa2bafdf520ce0dc011e23a26e5a75423`。#433、#430、#429 的基準是 #428。#431 已經包含 #428，也已經包含 012、019、027、053。這一輪只摘尚未整合的修改：#433 的 8 張預組程式與行為測試、#430 的缺口測試、#429 的 051–100 請求文字。063 只定義在預組程式，不留在 051–100 的請求。IMC 與 AI 修正沒有被覆蓋。

IMC 對戰包維持 113／113。MHA 對戰包是 57 張 ready、52 張 pending、目錄 109 張。新進包的是 063、101、102、105、106、107、108、109。

001、013、014、018、051、054 的共用形狀已解鎖，契約在 `docs/v2-handoff/V2-R11A-shared-ops.md`。這 6 張仍未寫程式，維持 pending。`playable` 維持 false。IMC 官方預組 `counts` 與 `UA10ST_PRODUCT.recipe` 維持 null。沒有合併 `main`，也沒有部署。

## 第 12 輪整合

基準是 #436 的 `6c5424824c3c9716723938bb1d39668e70890b8d`。#437 的父提交就是這個基準，只納入 MHA-1-051 與 MHA-1-054 的程式、請求與行為測試。#435 的基準是第 10 輪，沒有整支合併；只保留尚未整合的預組重印身分核對，以及生命觸發依印刷選擇、並可突襲到綠谷出久的測試。

IMC 對戰包維持 113／113。MHA 對戰包以程式清點是 59 張 ready、50 張 pending、目錄 109 張。051 與 054 已進包。006、007、009、010、038、048、056、059、072、074、085、087、089、090、093 仍是 pending。

六項共用形狀已解鎖，契約在 `docs/v2-handoff/V2-R12A-shared-ops.md`。這一輪沒有寫那些卡的程式，也沒有標 ready。`getTitle('imc').playable` 與 `getTitle('mha').playable` 維持 false。IMC 官方預組 `counts` 與 `UA10ST_PRODUCT.recipe` 維持 null。沒有合併 `main`，也沒有部署。

## 第 14 輪整合

基準是已部署 IMC 的 `f3266f90c7c70fe3a66ac35bb896573722342b89`。沒有整支合併 #439、#440、#438，也沒有重放 #437。001、013、014、018、070 進包。跨作品測試保留，IMC 的 `playable` 維持 true，MHA 維持 false。

IMC 對戰包維持 113／113。MHA 對戰包以程式清點是 64 張 ready、45 張 pending、目錄 109 張。新的共用操作契約在 `docs/v2-handoff/V2-R14A-shared-ops.md`。009、010、017、048、056、059、071、074、076 與 006、007 仍是 pending。沒有合併 `main`，也沒有部署。

## 第 15 輪整合

基準是第 14 輪 `8195a7a2c680a62ddb0516db83a9287772a3bcc9`。沒有整支合併 #447、#448、#445。IMC 的 `playable` 維持 true，MHA 維持 false。

IMC 對戰包維持 113／113。MHA 對戰包以程式清點是 77 張 ready、32 張 pending、目錄 109 張。006、007、009、010、017、048、056、059、071、074、087、089、093 進包。076 與第 15 輪解鎖的其餘句子維持 pending。契約在 `docs/v2-handoff/V2-R15A-shared-ops.md`。沒有合併 `main`，也沒有部署。

## MHA 下一輪共用引擎

基準仍是第 15 輪 `a22d510eda60f3d4736bcebf4aaddc47aa860af8`。IMC 113／113、`playable:true`。MHA 77 ready、32 pending、`playable:false`。新的共用操作在 `docs/v2-handoff/V2-MHA-shared-next.md`。004、038、085、090、099、002、003、005、011、026 都還沒寫卡牌程式。沒有合併 `main`，也沒有部署。

## 89 張整合基準

#454、#457、#458、#460、#461 只移植尚未進入 `main` 的提交。IMC 113／113、`playable:true`。MHA 89 ready、20 pending、`playable:false`。基準說明在 `docs/v2-handoff/V2-MHA-89-baseline.md`。最新 `main` 的線上介面留在這條分支。沒有部署。

