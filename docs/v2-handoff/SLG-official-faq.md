# 我獨自升級官方 FAQ｜共通 V2 對照

官方清單查核日：2026-10-26（台北）。來源是 [UA51BT FAQ](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT)。本表只記錄共通引擎 `dist/universal-v2/` 上可重現的裁定。`fullyAccepted` 維持 0。登記 80/80、或測試通過，都不是全卡 FAQ 認證。

狀態：`PASS` 是該條裁定已有可重現的 V2 測試。`NOT TESTED` 是該條還沒有直接重現。`RULE UNCLEAR` 是官方來源彼此不一致。舊的 `dist/solo-match.mjs` 測試不算 V2 證據。

## 本輪對齊的印刷

SLG-1-057 的官方效果是：場上有 5 張以上「第四次架南島レイド」時，將此角色 ACTIVE，並在本回合獲得「此角色下一次不會 ACTIVE」。同名登場每回合一次。繁中目錄把這句寫成攻擊時才取得該狀態；引擎已改為登場當下授與 `skipNextActive`。Q2055 後段寫「此卡的攻擊時使其 ACTIVE」，但 2026-10-26 抓到的 057 卡頁沒有印攻擊能力。該段手順改由印有攻擊時 ACTIVE 的 SLG-1-058 重現。

## 裁定矩陣

| 編號 | 裁定要點 | V2 證據 | 狀態 |
| --- | --- | --- | --- |
| Q2025 | 能源線的水篠聰子不能被移動或換位到前線 | `tests/v2-slg-014-recover-entry.test.mjs` | PASS |
| Q2026 | 場外兩張水篠旬 019，同名啟動每回合只能一次 | `tests/v2-slg-next-eight-shared.test.mjs` | PASS |
| Q2027 | 020 登場成本剛放到場外的非旬、原本 BP 3000 以下角色可以立刻回收 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2028 | 021 使對手在能阻擋時必須阻擋 | `tests/v2-r56-mandatory-block-shared.test.mjs`、`tests/v2-r56-slg021-full-print.test.mjs` | PASS |
| Q2029 | 022 的攻擊結束交換在戰鬥與生命 Trigger 之後 | `tests/v2-slg-final-shared.test.mjs` | PASS |
| Q2030 | 027 的原本 BP 是印刷值 | `tests/v2-rest-printed-bp-round17.test.mjs` | PASS |
| Q2031 | 029 依印刷 BP 協助，暫時 BP 不改變資格 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2032 | 029 授予的「不會被對方效果選取」擋下寫有「選」的效果；阻擋仍然合法 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2033 | 029 同名每個選項每回合共用一次 | `tests/v2-slg-third-eight-shared.test.mjs` | PASS |
| Q2034 | 031 依印刷 BP 協助 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2035 | 031 同名每個選項每回合共用一次 | `tests/v2-slg-third-eight-shared.test.mjs` | PASS |
| Q2036 | 033 計算原本 BP，暫時提高的印刷 1500 仍算、暫時降低的印刷 4000 不算 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2037 | 033 同名攻擊能力每回合只能一次 | `tests/v2-slg-third-eight-shared.test.mjs` | PASS |
| Q2038 | 034 在支付手牌之前場外必須已有 20 張 | `tests/v2-slg-final-shared.test.mjs` | PASS |
| Q2039 | 037 的原本 BP 是印刷值 | `tests/v2-slg-037-original-bp.test.mjs` | PASS |
| Q2040 | 044 放到水篠旬下的裏向卡只有自己看得到 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2041 | 047 攻擊時壓下的裏向卡只有自己看得到 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2042 | 047 在攻擊階段結束才連鎖 Raid，新 Raid 不能再攻擊 | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2043 | 047 只移走最上層時，下面的卡留場 | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2044 | 047 上層 REST 時底板維持 REST，之後新 Raid 為 ACTIVE | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2045 | 047 移走上層後，舊的暫時 BP 不留在底板 | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2046 | 047 移走上層不是退場也不是底板重新登場；新 Raid 的登場會發動 | `tests/v2-slg-chain-raid-shared.test.mjs` 使用沒有登場能力的 SLG-1-045 當底板 | NOT TESTED：印有登場能力的底板尚未重現 |
| Q2047 | 048 底下的裏向卡只有自己看得到 | 共通視圖有測 044、047、075，048 這張沒有獨立案例 | NOT TESTED |
| Q2048 | 048 的連鎖 Raid 發生在攻擊階段結束，不能再攻擊 | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2049 | 048 只移走最上層時底板留場 | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2050 | 048 上層 REST 時底板維持 REST，新 Raid 為 ACTIVE | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2051 | 048 移走上層後舊效果不留在底板 | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2052 | 048 移走上層不是退場或底板重新登場 | 同 Q2046，底板是沒有登場能力的 045 | NOT TESTED：印有登場能力的底板尚未重現 |
| Q2053 | 049 底下的裏向卡只有自己看得到 | 049 沒有獨立裏向視圖案例 | NOT TESTED |
| Q2054 | 051 棄掉的能源 4 綠色水篠旬可以立刻從場外 Raid | `tests/v2-slg-chain-raid-shared.test.mjs` | PASS |
| Q2055 | 「下一次不 ACTIVE」在開始、結束或受到 ACTIVE 效果時只抵銷一次；抵銷後維持 REST，之後的刷新會 ACTIVE | `tests/v2-slg-official-faq.test.mjs`。057 卡頁沒有攻擊時能力，攻擊時 ACTIVE 的手順用 058 | PASS |
| Q2056 | 057 同名第二張同一回合不再發動登場 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2057 | 058 的「下一次不 ACTIVE」只抵銷一次 | `tests/v2-slg-final-shared.test.mjs`、`tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2058 | 059 取得手牌後跳過下次 ACTIVE，再下一次刷新會 ACTIVE | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2059 | 060 只和仍處於該狀態的前線角色交換；狀態用掉後不再提供交換，角色在之後的刷新 ACTIVE | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2060 | 064 只有選了攻擊模式才取得該狀態，並且只抵銷一次 | `tests/v2-slg-official-faq.test.mjs` | PASS |
| Q2061 | 067 同名登場每回合一次；條件未達成不消耗次數 | `tests/v2-slg-next-eight-shared.test.mjs` | PASS |
| Q2062 | 070 被選取時付不出額外 AP 就不能選 | `tests/v2-r33-q2062-mandatory-event.test.mjs`、`tests/v2-r33-selection-ap-action-pay.test.mjs` | PASS |
| Q2063 | 073 同名登場每回合一次 | `tests/v2-slg-final-shared.test.mjs` | PASS |
| Q2064 | 075 的裏向卡只有自己看得到 | `tests/v2-slg-final-shared.test.mjs` | PASS |
| Q2070 | 027 不把沒有 BP 的「君主の領域」算進 REST 數 | `tests/v2-rest-printed-bp-round17.test.mjs` | PASS |
| Q2071 | 033 同樣不計算該場域 | `tests/v2-slg-official-faq.test.mjs` | PASS |

47 條裡，43 條 PASS，4 條 NOT TESTED。沒有本輪 FAIL。瀏覽器對戰畫面沒有點過；以上是引擎狀態與測試。
