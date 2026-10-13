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

## 後續三張

- 048：原本已在限制核心實作第一擊 BP +500、IMPACT 無效與二次阻擋；需核對實際持續期限。
- 049：原本有獨立強制回手判定，尚未接一般登場核心。
- 050：登場時基坦條件抽牌，以及三種各別回合一次的主階段起動，尚未實作完整網站判定。

## 自動判定完成定義

除非全系列均完成實體卡片 UID 守恆、AP／能源付款、時點與跨卡連鎖、玩家 UI 目標選擇、回合清除、隱藏資訊、AI 實戰測試，不可將 `auto` 改成 `true` 或宣布全作完成。正式站及 main 均不更新。
