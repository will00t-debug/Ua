# V2 C21：公開局面條件、MST-1-007 二選一、護廷十三隊計數

官方頁面於 2026-10-24 重讀。中文目錄若多寫「己方回合」，程式跟日文印刷。

## 共用能力

沿用 `optionalPayApThen`、`deployOwnHandRestOrRaid`、`oncePerTurnGate`、`removeOutsideThen`，沒有重做。

新增或擴充：

- `oppRestCharacterCount`：對手指定區域的 REST 角色數。`bpEach` 在阻擋者已經 REST 之後重算，所以 Q535 不需要改戰鬥程式。
- `oppCharacterCurrentBpCount`：對手場上角色的目前 BP，不是印刷 BP。
- `ownPrintedApAtLeast`：角色的印刷消費 AP。Q2319。能源線與場域不算。
- `ownHandToOutsideThisTurn`：本回合己方手牌以 `rule`、`payment` 或 `own-effect` 進場外。對手棄牌的 controller 不同，不算。
- `ownCardTraitCount`：己方場上帶該特徵的每一張卡，包含場域。`ownTraitCount` 仍只數角色。
- `chooseOne` 的選項可標 `entry:'ownEffect'`。已消耗的 `oncePerTurnGate` 會讓整個選項消失，玩家不能選到空效果。Q2145。

## 完整登錄

- MST-1-007：抽 1 再棄 1，或只在自己的效果登場時，把手牌中藍、能源 3 以下、AP 1、名為ルーデウス／エリス／ルイジェルド的角色 REST 或 Raid。後者每回合每個印刷名只能選一次。抽牌選項可重複。
- BLC-1-003：對手前線每個 REST 角色 BP+1000。Q535。COLOR 是 REST 並跳過下次 ACTIVE。
- BLC-1-019：對手場上至少 2 個目前 BP 4000 以上的角色時 BP+500。標準 ACTIVE。
- BLC-2-062：其他護廷十三隊卡滿 3 張時額外 1 能源。場域算入。無 Trigger。
- BLC-4-038：己方前線有印刷 AP 2 以上的角色時 BP+1500。日文沒有己方回合限制。標準 DRAW。合法藍牌組沒有 AP 2 角色，正例用同條件的實驗卡。
- BLC-2-054：本回合己方手牌進過場外時 BP+500。日文沒有己方回合限制。標準 ACTIVE。
- BLC-1-084：其他護廷十三隊卡滿 6 張時 BP+500。COLOR 從手牌登場 1 張綠、能源 2 以下、AP 1 的角色。頁面沒有 FAQ。產生能源的數字沿用目錄。
- BLC-2-068：同一條件 BP+1500。標準 DRAW。頁面沒有 FAQ。

## 仍缺的句子

- MST-1-021：登場的具名手牌 REST／Raid 已有共用操作。啟動主要仍缺「場上同時有ルーデウス與エリス才可發動，每回合一次，將自己 ACTIVE」。
- MST-1-033：登場 TOP3 具名取牌、其餘置底、取到才棄手牌；啟動主要要把這張場域 REST 並退場，之後才讓藍、能源 3 以下、AP 1 的手牌角色 REST 或 Raid。
- BLC-2-027：己方回合、前線、每個印刷 AP 2 以上的角色各 +500。現有印刷 AP 條件是「至少一張」的固定加成，不是逐張。
- BLC-1-041、047、050、104：場外移除之外還有其他句子，或張數超過 3。不放寬張數上限。

一般阻擋的回歸：攻擊者 BP 較低時攻擊者退場並結算 onRetire；相等或較高時只退阻擋者。三種都不扣生命。狙擊路徑沒有改寫。

嚴格全面 FAQ 認證仍是 0。登錄數不是全庫認證。
