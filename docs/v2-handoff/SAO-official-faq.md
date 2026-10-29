# 刀劍神域官方 FAQ｜共通 V2 對照

官方清單查核日：2026-10-29（台北）。來源是三份系列清單：

- [UA15BT](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA15BT)（Q749–Q767、Q978）
- [UA15ST](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA15ST)（Q768）
- [EX08BT](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX08BT)（Q1195–Q1210、Q1214）

`UAPR` 的清單沒有刀劍神域條目。本表只記錄共通引擎 `dist/universal-v2/` 上可重現的裁定。`fullyAccepted` 維持 0。登記 183/183、或測試通過，都不是全卡 FAQ 認證。

狀態：`PASS` 是該條裁定已有可重現的 V2 測試。`NOT TESTED` 是該條還沒有直接重現。`RULE UNCLEAR` 是官方來源彼此不一致。舊的標題專用引擎測試不算 V2 證據。

## 本輪對齊的手順

Q757。從能源線突襲到前線，算這張新的上層角色在移動階段以外移動。突襲元埋下去，不把移動記在底板上。前線底板的突襲沒有換線，不取得攻擊抽牌。

Q761。`SAO-1-049` 印著不能到前線。移動效果的選擇不再包含能源線上的這張卡，對手的交換也不會把她換上前線。

## 裁定矩陣

| 編號 | 裁定要點 | V2 證據 | 狀態 |
| --- | --- | --- | --- |
| Q749 | 對手角色被效果加成到 BP 4000 以上，仍讓這張角色取得衝擊 1 | `tests/v2-opp-bp-impact-round17.test.mjs` | PASS |
| Q750 | 登場把最後的生命拿進手牌後，效果處理完才敗北 | `tests/v2-c28-catalog-port.test.mjs` | PASS |
| Q751 | 被「不能移動」的角色突襲後，新的上層可以移動 | `tests/v2-sao-last-six-faq.test.mjs` | PASS |
| Q752 | 莉法把最後一張生命拿進手牌後，BP 與不能被選先加上，然後才敗北 | `tests/v2-sao-official-faq.test.mjs` | PASS |
| Q753 | 尤吉歐被效果加成到 BP 4000 以上時，巨杉仍能發動 | `tests/v2-sao-ten-batches.test.mjs` | PASS |
| Q754 | 「下一次不活動」在下一個開始階段維持休息並消耗一次，該回合結束重整後恢復活動 | `tests/v2-sao-official-faq.test.mjs` | PASS |
| Q755 | 對手的交換效果移動亞絲娜，算移動階段以外的移動 | `tests/v2-sao-official-faq.test.mjs` | PASS |
| Q756 | 對手的卡效果移動 `SAO-1-037`，滿足「移動階段以外」 | 自己的移動在 `tests/v2-sao-next-ten-batches.test.mjs`。這張還有「自己的回合中」，對手回合的交換不能拿來證明這句 | NOT TESTED |
| Q757 | 從能源線突襲到前線，滿足「移動階段以外移動」 | `tests/v2-sao-official-faq.test.mjs` | PASS |
| Q758 | 攻擊結束的交換在戰鬥之後；直接傷害時在生命觸發之後 | `tests/v2-sao-official-faq.test.mjs` | PASS |
| Q759 | 特殊觸發讓攻擊者退場後，不能再交換能源線的亞絲娜 | `tests/v2-sao-official-faq.test.mjs` | PASS |
| Q760 | 對手的卡效果移動自己場上的角色時，莉茲貝特可以抽牌 | 自己的移動在 `tests/v2-sao-next-ten-batches.test.mjs`。對手效果還沒有重現 | NOT TESTED |
| Q761 | 移動效果與交換效果都不能把這張卡從能源線送到前線 | `tests/v2-sao-official-faq.test.mjs`、`tests/v2-sao-sixteen-left-ten.test.mjs` | PASS |
| Q762 | 手牌 4 張加場上 ALO 3 張，空中戰的上限是 BP 4500 | `tests/v2-sao-ten-batches.test.mjs` | PASS |
| Q763 | 其他自己的角色攻擊且 BP 大於等於對方、或被攻擊且 BP 高於對方，算戰鬥勝利 | `tests/v2-r46-battle-won-damage2-live.test.mjs` | PASS |
| Q764 | 攻擊且自己的 BP 大於等於對方，算攻擊戰鬥勝利 | `tests/v2-sao-sixteen-left-ten.test.mjs`、`tests/v2-sao-official-faq.test.mjs` | PASS |
| Q765 | 狙擊沒有阻擋，仍然發生戰鬥，勝敗效果會發動 | `tests/v2-sao-sixteen-left-ten.test.mjs`、`tests/v2-sao-official-faq.test.mjs` | PASS |
| Q766 | 事件授予的「攻擊戰鬥勝利」同樣是攻擊方 BP 大於等於對方 | `tests/v2-sao-follow-ten-batches.test.mjs` | PASS |
| Q767 | 事件自己要等效果處理完才進場外，場外 2 張不能把這張算進 3 張 | `tests/v2-r52-sao100-real-event.test.mjs` | PASS |
| Q768 | 對手的卡效果移動起始牌組的亞絲娜，滿足「移動階段以外」 | `tests/v2-sao-official-faq.test.mjs` | PASS |
| Q978 | 對手用寫有「選」的事件選這張桐人時，必須再棄 1 張手牌；沒有手牌就不能選 | `tests/v2-r45-selection-hand-tax-plan.test.mjs`、`tests/v2-r47-sao087-official-candidate.test.mjs` | PASS |
| Q1195 | 前線一張「桐人＆尤吉歐」同時滿足場上與前線兩句 | `tests/v2-zero-engine-round14.test.mjs`、`tests/v2-sao-official-faq.test.mjs` | PASS |
| Q1196 | 兩張太陽神詩乃同一回合只能發動一次那個起動 | `tests/v2-sao-follow-ten-batches.test.mjs` | PASS |
| Q1197 | 表向生命是公開情報，對手看得到 | `tests/v2-sao-last-six-faq.test.mjs` | PASS |
| Q1198 | 最後一張生命突襲後把突襲元放回生命，未處理效果還在時不敗北 | `tests/v2-sao-last-six-faq.test.mjs` | PASS |
| Q1199 | 對手的卡效果移動 `SAO-2-014`，滿足「移動階段以外」 | 自己的移動在 `tests/v2-sao-eight-shared-batches.test.mjs`。這張還有「自己的回合中」 | NOT TESTED |
| Q1200 | 同一回合第二張結衣的登場不再發動 | `tests/v2-sao-follow-ten-batches.test.mjs` | PASS |
| Q1201 | 場上沒有莉茲貝特時，鑄錠不棄手牌 | `tests/v2-sao-eight-shared-batches.test.mjs` | PASS |
| Q1202 | 先使用不符合的手牌，歌的 AP−1 不會消失 | `tests/v2-sao-last-six-faq.test.mjs` | PASS |
| Q1203 | 只把 5 張場外卡放牌底，不能退場 BP 5000；還要這回合用過歌並支付 1 AP | `tests/v2-sao-last-six-faq.test.mjs` | PASS |
| Q1204 | 「原本的 BP」是卡面左下的印刷值 | `tests/v2-sao-follow-ten-batches.test.mjs` | PASS |
| Q1205 | 「原本的 BP」是卡面左下的印刷值 | `tests/v2-sao-next-ten-batches.test.mjs` | PASS |
| Q1206 | 「不能被選」擋下寫有「選」的效果 | `tests/v2-r40-effect-choice-immunity.test.mjs` | PASS |
| Q1207 | 「不能被對手角色的效果選」只擋角色效果的「選」 | `tests/v2-r41-sao060-full-print.test.mjs` | PASS |
| Q1208 | 兩張桐人也不把棄手牌加總；選亞絲娜時只要棄 1 張 | `tests/v2-r45-selection-hand-tax-plan.test.mjs`、`tests/v2-r46-sao064-full-print.test.mjs` | PASS |
| Q1209 | 「原本的 BP」是卡面左下的印刷值 | `tests/v2-r36-real-discount-cards.test.mjs` | PASS |
| Q1210 | 先使用不符合的手牌，下一次 AP−1 不會消失 | `tests/v2-r36-real-discount-cards.test.mjs` | PASS |
| Q1214 | 表向生命的觸發在觸發確認時可以發動 | `tests/v2-sao-last-six-faq.test.mjs` | PASS |

38 條裡，35 條 PASS，3 條 NOT TESTED。沒有本輪 RULE UNCLEAR。Q754 的結束階段與「受到活動效果」用的是同一個「下一次不活動」；這次重現的是放射光實際打到的開始階段，以及那一次用掉之後的結束重整。瀏覽器對戰畫面沒有點過；以上是引擎狀態與測試。
