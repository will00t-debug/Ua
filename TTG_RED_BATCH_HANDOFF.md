# UA56BT／TTG-1 天元突破《紅蓮螺巖》紅色逐三張更新交接

## 整合資訊（2026-10-13）

- 作業分支：`feature/ttg-red-3card-batches-20261013`
- 上游基礎：`feature/ua56bt-catalog-expansion`（PR #7）
- **禁止直接合併到 main，也不要部署正式網站。** 保留現有卡組介面、BLEACH 等系列。
- 作品仍保留 `playable:false`，個別卡 `auto:false`；全 81 種卡資料完整不代表 81 種效果全部可玩。
- 回歸測試：`.github/workflows/ttg-red-feature-check.yml` 僅針對此功能分支跑 `npm test`，不包含部署。

## 第一組（042～044）

| 卡號 | 完成之獨立判定／限制核心 | 剩餘限制 |
| --- | --- | --- |
| 042 卡米那 | 普通角色、ACTIVE 生命 Trigger，正確指定己方角色 ACTIVE／BP +3000 | 網站可玩尚未解鎖 |
| 043 卡米那 | DRAW 生命 Trigger，對阻擋者 IMPACT 無效 | 網站可玩尚未解鎖 |
| 044 卡米那 | 自己回合西蒙（場上／Raid 底板）條件 BP +500 即時計算；未被阻擋後、生命判定前，自主選擇是否查看牌頂 7，最多一張〈グレン〉加入手牌，若加入則必須棄一，餘牌可重排至牌庫底；完整 UID 守恆和私有資訊 | 尚需與紅色 072／073 特殊 Raid、玩家選項 UI 完整連結 |

- 實作：`dist/ttg-red-first-three.mjs`、`dist/ttg-core-match.mjs`
- 測試：`tests/ttg-red-first-three.test.mjs`
- 官方：TTG-1-042／043／044 正式卡面及 Q2285

## 第二組（045～047）

| 卡號 | 完成之獨立判定／限制核心 | 剩餘限制 |
| --- | --- | --- |
| 045 卡米那 | Raid 底板（包含原頂卡已裏向改置的鏈式 Raid）判定，任選己方大紅蓮團 BP +1000；突襲角色已有裏向卡時仍必抽 1，照 Q2286 | 僅獨立 reducer，需 072／073 Raid 鏈及 UI 併入 |
| 046 卡米那 | 已突襲的自己回合起動、前線限制、一次啟動可選兩個不同效果；ACTIVE 選項同名共用每回合一次，順序 ACTIVE 然後 BP +1000；限制核心與共用 action dispatcher 已接入 | 手動玩家 UI，特殊情況 Raid 離場後的同回合歷史追蹤仍需完整接入 |
| 047 基坦 | 本回合自己第一個攻擊加 BP +1500 的限制核心既存判定，以及 DRAW 生命 Trigger 核查 | 網站可玩尚未解鎖 |

- 實作：`dist/ttg-red-second-three.mjs`、`dist/ttg-rule-adapter.mjs`
- 測試：`tests/ttg-red-second-three.test.mjs`
- 官方：TTG-1-045／046／047 卡面與 Q2286～Q2290

## 第三組（048～050）

- **048 基坦**：原有第一次攻擊 BP+500、DOUBLE BLOCK 的限制核心測試；補上 IMPACT 無效的持續與到期判斷。
- **049 吉米＆達莉**：強制回手一般登場時點、無合法其他對象時回自己，目標及 UID 驗證。**Raid 疊卡作為回手目標仍保留封鎖**。
- **050 琪優＆琪農＆琪雅露**：基坦／Raid 底板條件登場抽牌；3 種獨立每回合一次主階段動作、REST／棄手牌、BP／能源與到期清除。
- 實作：`dist/ttg-red-third-three.mjs`、`dist/ttg-core-match.mjs`、`dist/ttg-rule-adapter.mjs`
- 測試：`tests/ttg-red-third-three.test.mjs`

## 第四組（051～053）

- **051 西蒙**：登場強制抽1棄1；空牌庫不能抽時依強制抽空處理。
- **052 西蒙**：可棄1張手牌，再從場外回收至多1張紅色需求能源2以下；可回收剛棄的同一張。
- **053 西蒙**：REST 自己把頂牌1張送場外；如其他效果再次 ACTIVE 可再次使用。
- 實作：`dist/ttg-red-fourth-three.mjs`，已連至限制核心與 AI
- 測試：`tests/ttg-red-fourth-three.test.mjs`

## 第五組（054～056）

- **054 西蒙**：妮亞在自己場上、牌庫<=20雙重條件，自己回合 BP+1500、常駐 IMPACT 無效；可選擇從頂牌送至場外0或1張。
- **055 西蒙**：登場可送頂牌0～2張至場外；可棄1張手牌，才可從「這次送出的牌」回收至多1張。
- **056 西蒙**：妮亞與牌庫張數攻擊門檻，以及 Q2291/Q2292 的「戰鬥結束／傷害 Trigger 結束」時點與紅色同名 Raid 限制，已寫獨立候選判定；**073／074／076 Raid 詳細效果未串好，056 暫不列入限制核心可玩表**。
- 實作：`dist/ttg-red-fifth-three.mjs`
- 測試：`tests/ttg-red-fifth-three.test.mjs`

## 第六組（057～059）

- **057 達雅卡**：IMPACT 無效；登場可選其他己方角色至下一次自己回合開始前取得 IMPACT 無效，到期清除。
- **058 妮亞**：登場可選其他角色 BP+1000，西蒙或西蒙 Raid 底板角色改 BP+1500。
- **059 妮亞**：既有 REST 給西蒙 BP+1000 接入限制核心；修復受選角色物件缺少 BP 時出現 NaN 的問題。
- 共用：妮亞與卡米那登場互斥，包含卡米那作為 Raid 底板的檢查。
- 實作：`dist/ttg-red-sixth-three.mjs`、`dist/ttg-core-match.mjs`、`dist/ttg-pending-rules.mjs`
- 測試：`tests/ttg-red-sixth-three.test.mjs`

## 尚未完成

- 紅色 060～081 效果自動判定。
- 045、056、紅色高階 072～076 Raid 連動及跨效果排程、紅色 COLOR 觸發、網站真人 UI／牌組編輯器及跨系列 AI 整合。
- 題目的 **81/81 代表資料收錄，不是全自動判定已完成**；保留 `auto:false`、`playable:false`，不能向玩家宣稱全功能已上線。

## 自動判定完成定義

除非全系列均完成實體卡片 UID 守恆、AP／能源付款、時點與跨卡連鎖、玩家 UI 目標選擇、回合清除、隱藏資訊、AI 實戰測試，不可將 `auto` 改成 `true` 或宣布全作完成。正式站及 main 均不更新。
