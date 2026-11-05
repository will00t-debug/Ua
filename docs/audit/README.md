# 卡牌效果稽核台帳

這份清單由 `scripts/build-effect-audit-ledger.mjs` 從卡庫重算。進度只寫在 `docs/audit/effect-audit-notes.json`。沒有寫進去的卡維持未檢查，不能當成通過。

下一個未檢查的可出牌：CSM-1-011 UA53BT/CSM-1-011

## 各系列

| 系列 | 商品 | 總數 | 已驗證 | 部分核對 | 待修正 | 未檢查 | 行動值／無效果 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 鏈鋸人 | UA53BT | 80 | 10 | 0 | 0 | 70 | 0 |
| 假面騎士第一彈 | UA29BT／UA29ST | 113 | 0 | 0 | 0 | 112 | 1 |
| 假面騎士第二彈 | EX12BT | 100 | 0 | 1 | 0 | 99 | 0 |
| 假面騎士 PR | UAPR | 3 | 0 | 0 | 0 | 3 | 0 |
| 假面騎士行動值卡 | AP | 16 | 0 | 0 | 0 | 0 | 16 |
| 進擊的巨人第一彈 | UA23BT／UA23ST | 113 | 0 | 0 | 0 | 112 | 1 |
| 進擊的巨人第二彈 | EX10BT | 73 | 0 | 0 | 0 | 73 | 0 |
| 犬夜叉 | UA50BT | 80 | 0 | 1 | 0 | 79 | 0 |
| 我想成為影之強者！ | UA52BT | 80 | 0 | 0 | 0 | 80 | 0 |
| 魔法少女小圓第一彈 | UA31BT／UA31ST | 113 | 0 | 0 | 0 | 112 | 1 |
| 魔法少女小圓第二彈 | EX16BT | 73 | 0 | 0 | 0 | 73 | 0 |
| Re:Zero | UA28BT 等 | 113 | 0 | 0 | 0 | 113 | 0 |

可出牌 938 張。整張已驗證 10 張。部分核對 2 張。待修正 0 張。未檢查 926 張。行動值卡 16 張、無效果卡 3 張另行統計，不擋住下一張可出牌。

整張卡已驗證表示每一段都有官方來源、實作位置、驗證案例，而且沒有未解決項目。只完成其中一段時，卡片是部分核對。

## 本批共用修正

### BP 0 以下依規則退場

Q94（https://www.unionarena-tcg.com/jp/faq/list.php?number=94）：卡牌效果使場上角色 BP 變成 0 以下時退場。Q187：阻擋時效果先處理完，BP 0 的角色才退場，之後不進行戰鬥。Q1139（2024-10-18）：這次退場不是「キャラの効果による退場」，所以 KMR-1-025 的代替退場與 KMR-1-051 的對手效果支付都不能用。Q1898／Q1899（2026-01-09，https://www.unionarena-tcg.com/jp/faq/list.php?freeword=BP%E3%81%8C0）：效果處理途中 BP 一度變成 0，只要該效果結束時 BP 已不是 0，就不退場。

dist/universal-v2/engine.mjs openBpZeroRetirements、continueEffectQueue、retireBatchOne、effect-target。dist/universal-v2/csm-runtime.mjs debuffFront 只記 BP，不在句子中途退場。

前線與能源線的角色。效果還有待處理選擇時不退；選擇結束且 BP 仍為 0 以下才由規則退場。同時到 0 的角色各退一次。IYS-1-028 的離場代替仍會問。場地卡不退。kmrAnchored 仍留在場上。鍊鋸人 debuffFront 的呼叫者（CSM-1-008 蕾潔後續、CSM-1-017 的 BP-5000／BP-1000）都改為等效果結束。一個效果若拆成多個佇列工作、後段又把 BP 加回來，目前仍會在下一個工作前檢查；這批沒有這種卡，不另改檢查點。

tests/v2-bp-zero-retire.test.mjs；tests/v2-csm-001-010.test.mjs 的 Q1898；tests/v2-csm-faq.test.mjs 的 CSM-1-017 BP 0

### 看牌頂的單一選擇顯示卡圖與效果

KMR-2-054 印刷文本：被阻擋時查看自己牌組頂 1 張，放到上面或下面。這張牌只給操作者看。官方卡頁沒有另立 FAQ。

dist/universal-v2/preview-actions.mjs pendingFocusCard。dist/universal-v2/kmr2-runtime.mjs offerWBlockedTopPlace 把那張牌放進 data.window。

同一個待處理步驟裡，所有按鈕都指向同一張牌的看牌頂／上下排列。兩張不同的牌仍各自成按鈕，不會合成一張。

tests/v2-kmr-set2.test.mjs

### 同じライン是這張卡所在的那一條線

Q1806（2025-12-12，https://www.unionarena-tcg.com/jp/faq/list.php?freeword=%E5%90%8C%E3%81%98%E3%83%A9%E3%82%A4%E3%83%B3）：「同じライン」就是「このカードと同じライン」。Q18（2023-03-17）只說明同一條線上的卡可以改順序，不是對面那格。

dist/universal-v2/field-conditions.mjs sameLineName。dist/universal-v2/csm-continuous.mjs sameLineNamed。

CSM-1-002 的蕾潔同線 BP 與衝擊無效，以及 MST-1-014 的魯德烏斯同線 BP。埋在突襲下面的卡不算在線上。全庫沒有第三個把同線做成對面格的實作。

tests/v2-csm-001-010.test.mjs；tests/v2-mst-shared-full-print.test.mjs

### 被阻擋時是攻擊角色的效果

KMR-2-054 印刷文本「このキャラがブロックされた時」指自己的攻擊被阻擋。記憶體切換登場時可以改成抽最多 1 張，包含 0 張。卡頁沒有另立 FAQ。

dist/universal-v2/engine.mjs 阻擋成立時把 kmr2 blocked 排給攻擊者，並在選擇後用 kmr2ResumeBattle 結算戰鬥。dist/universal-v2/kmr2-runtime.mjs blocked054、mayDraw。

共用 blocked 欄位的 KMR-2-033、KMR-2-039、KMR-2-048、KMR-2-054、KMR-2-079。本輪只把 KMR-2-054 的看牌與抽 0／1 張走完；其餘四張沒有逐段核對，不能標成已驗證。

tests/v2-kmr-set2.test.mjs 的實戰阻擋、抽 0／1 張，以及房間雙方提交

### 鍊鋸人退場原因與登場看牌順序

CSM-1-006 只有「自分の效果で退場」才可改看 4 張。Q1139：BP 0 規則退場不是角色效果。CSM-1-008 的印刷順序是看 3 張、排列其餘、再把手牌放場外，然後才處理真紀真或蕾潔。Q2074：加入的角色不限真紀真或蕾潔。

dist/universal-v2/engine.mjs queueRetirement 把退場原因寫進 csm 工作。dist/universal-v2/csm-runtime.mjs runRetire、finishLookTake、continue008、offer008Follow。

退場原因會寫進每一個鍊鋸人退場工作；目前只有 CSM-1-006 讀這個原因。008 的順序只影響這張卡。AI 會提交 csm 待處理選擇，影響所有鍊鋸人選擇。

tests/v2-csm-001-010.test.mjs

## 已寫進台帳的條款

- `CSM-1-001` UA53BT/CSM-1-001：已驗證。已驗證 【インパクト無効】（このキャラとバトルをしたキャ／已驗證 【ドロー】カードを1枚引く。
- `CSM-1-002` UA53BT/CSM-1-002：已驗證。已驗證 同じラインに〈レゼ〉がある場合、このキャラはBP／已驗證 【アクティブ】自分の場のキャラを1枚選び、アクテ
- `CSM-1-003` UA53BT/CSM-1-003：已驗證。已驗證 【起動メイン】【レストにする】【ターン1】このキ
- `CSM-1-004` UA53BT/CSM-1-004：已驗證。已驗證 自分の場にカードが1枚もない場合、手札にあるこの／已驗證 【登場時】カードを1枚引き、自分の手札を1枚場外／已驗證 【アクティブ】自分の場のキャラを1枚選び、アクテ
- `CSM-1-005` UA53BT/CSM-1-005：已驗證。已驗證 このキャラがアクティブの場合、このキャラの発生エ
- `CSM-1-006` UA53BT/CSM-1-006：已驗證。已驗證 【退場時】『カードを1枚引く』。このキャラが自分
- `CSM-1-007` UA53BT/CSM-1-007：已驗證。已驗證 【インパクト無効】（このキャラとバトルをしたキャ／已驗證 【起動メイン】このターン中に自分がイベントカード／已驗證 【カラー】自分の場外から必要エナジーが2以下で消
- `CSM-1-008` UA53BT/CSM-1-008：已驗證。已驗證 【登場時】自分の山札の上から3枚見て、キャラカー／已驗證 【ゲット】このカードを手札に加える。
- `CSM-1-009` UA53BT/CSM-1-009：已驗證。已驗證 【登場時】必要エナジーが1以下の自分の場の他のキ
- `CSM-1-010` UA53BT/CSM-1-010：已驗證。已驗證 【自分のターン中】自分の場に〈マキマ〉がある場合／已驗證 【ドロー】カードを1枚引く。
- `KMR-1-010` UA29BT/KMR-1-010：未檢查
- `KMR-1-025` UA29BT/KMR-1-025：未檢查
- `KMR-2-005` EX12BT/KMR-2-005：未檢查
- `KMR-2-012` EX12BT/KMR-2-012：未檢查
- `KMR-2-054` EX12BT/KMR-2-054：部分核對。已驗證 このキャラがブロックされた時、『自分の山札の上か
- `IYS-1-011` UA50BT/IYS-1-011：未檢查
- `IYS-1-025` UA50BT/IYS-1-025：未檢查
- `IYS-1-028` UA50BT/IYS-1-028：未檢查
- `IYS-1-032` UA50BT/IYS-1-032：未檢查
- `IYS-1-035` UA50BT/IYS-1-035：部分核對。已驗證 相手のフロントLのキャラを1枚選び、自分の場の［
- `MMM-1-036` UA31BT/MMM-1-036：未檢查
- `MMM-1-038` UA31BT/MMM-1-038：未檢查

BLEACH 本篇與擴充不在這份近期系列清單。刀劍神域、命運石之門、無職轉生也還沒有納入這次台帳。
