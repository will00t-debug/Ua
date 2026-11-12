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

`implementation` 只能是 `dsl` 或 `vanilla`。有印刷效果的卡不能標 `vanilla`。`ready:true` 的卡會交給 `createUniversalPack`，所以效果必須是既有 op 能接受的形狀。允許的程式欄位是 `ready`、`implementation`、`effects`、`mainAbility`、`triggerEffect`、`raidName`、`impactNull`、`printedImpact`、`nameAliases`、`step`、`run`、`notes`。其他欄位會在 `imcProgramFor` 被拒絕。

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

還沒有的機制是後段。`ownDistinctTraitNames` 計算的是場上（前線與能源線）帶該特徵的不同印刷卡名，場外不計。`countOwnOutsideDistinctPrintedNames` 只算場外，而且依顏色與種類，不依特徵。`enterAlwaysActive` 是卡本身的印刷登場方式，不是「這個回合、下一張或全部符合特徵的卡，活動登場」的持續授予。這段先留在 C 組。這輪不加共用 helper。

UA55ST/IMC-1-102 是紅色角色，能量 5、AP 1、BP 4000、產生能量紅 1、突襲觸發。特徵印刷是 `new generations／お願い！シンデレラ`。突襲框只有〈渋谷 凛〉的標準突襲句。登場時這張角色這個回合獲得衝擊 1，並可選最多 1 張對手前線角色，其目前 BP 在「自己場上其他、特徵 new generations、原本 BP 恰好 4000」的張數 ×1000 以下時退場。

已可沿用：

- 突襲觸發與 `raidName:'渋谷 凛'`
- `grantSelfImpactThisTurn`，`amount:1`
- 原本 BP 是 `definition.bp`。`printedBp` 篩選與 `ownRestPrintedBpCount` 都讀印刷值，不讀目前 BP
- 「1 枚まで」對應既有退場 op 的 `optional:true`

還沒有的機制是那個上限。`retireOppFrontUnderBp` 的 `traitPerBp` 是特徵張數 ×1000，`traitNamePerBp` 是同一特徵的不同卡名 ×1000。兩者都沒有「原本 BP 恰好 4000，而且排除自己」的條件。把 `printedBpTraitCount` 放進這個 op 會被拒絕。101、102、103、106 的 FAQ 都碰到原本 BP，公式可能不同，所以這輪不抽成共用 helper。102 之後由 D 組用既有 op 組合能涵蓋的部分，其餘先寫進 `requests-starter.mjs`。

## 已經可重用、這輪不要重做

抽牌、棄牌、目前 BP、AP 支付、突襲登場、普通登場、生命傷害、生命觸發、合法選牌、選擇最多 N 張與必選 N 張、每回合一次、牌庫公開、查看與排序、多特徵的 `traitComponents`、同名與不同名計數，都沿用現行 V2。`cardHasTrait` 同時看 `traits` 與 `traitComponents`。斜線特徵把印刷字串放在 `traits[0]`，拆開的部分放在 `traitComponents`，兩者用 `／` 接回必須相同。

場上與場外要合併計數時，先確認現有條件的區域。`ownDistinctTraitNames` 的區域是前線、能源線或兩者，不含場外。`ownNameAbsent` 才可以點名場外。不要假設一個場上計數會自動加上場外。
