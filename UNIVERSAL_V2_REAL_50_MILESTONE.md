# UNION ARENA V2 — 真實卡首副 50 張對戰里程碑

**環境：只在 Draft PR #70 的獨立 V2 分支，不在正式網站。**

## 本輪實際成果

- BLEACH 既有 8 張 V2 Pilot + **7 張**（BLC-1-036、037、040、045、048、052、057）＝**15 張**。
- 天元突破既有 15 張 V2 Pilot + **2 張**（TTG-1-043、066）＝**17 張**。
- 合計 **32 張官方卡號的 V2 Pilot**，不是完整逐卡 FAQ 正式認證，其他卡片不得自動加入。
- 新增 `dist/universal-v2/verified-real-decks.mjs`：**一副 50 張全部來自官方白名單的 BLEACH 紫色牌組**。12 個普通卡號各 4 張 + `BLC-1-066` FINAL 2 張，滿足 50 張、同一作品、每卡號至多 4 張以及 FINAL 至多 4 張限制，**完全沒有 TEST-ONLY 假卡**。
- `tests/universal-v2-bleach-real-deck.test.mjs`：新卡效果、Q556、COLOR 生命從場外登場、攻擊抽棄時序、對手私密資訊、全真卡 AI 鏡像對戰，完成前持續檢查每位玩家 50 個實體 UID 與原始卡號張數守恆。
- `tests/universal-v2-real-passive-pilots.test.mjs`：實際 BLEACH 浦原喜助及 TTG 庸子共用 ACTIVE 額外能源、REST 失效；天元卡米那 `IMPACT 無效` 對戰 TTG-1-073 裏向底卡 IMPACT（1）真實互動。**天元目前仍需要兩張明確標記 TEST-ONLY 的牌才能湊 50 張做這項特定 QA 測試**，不能冒充完整的官方天元牌組。

### 本批已核對的日版卡號／新效果

| 作品 | 卡號 | 本次建立的判定及印刷文字核對 |
|---|---|---|
| BLEACH | UA08BT/BLC-1-036 | 登場強制牌庫頂 2 張送場外；**官方 Q556** 表示剩 1 張也要送那 1 張 |
| BLEACH | UA08BT/BLC-1-037 | ACTIVE 時額外提供 1 紫能源，REST 立即失效 |
| BLEACH | UA08BT/BLC-1-040 | 登場私下看牌庫頂一張；COLOR 生命從**自己場外**選紫色、能源需求 ≤2、AP1 角色到**前線 ACTIVE**（不是從手牌） |
| BLEACH | UA08BT/BLC-1-045 | 沒有額外角色效果，ACTIVE 生命 Trigger |
| BLEACH | UA08BT/BLC-1-048 | 沒有額外角色效果，GET 生命 Trigger |
| BLEACH | UA08BT/BLC-1-052 | 攻擊時抽一張，再選手牌一張送場外；選完才進阻擋 |
| BLEACH | UA08BT/BLC-1-057 | 沒有額外角色效果，ACTIVE 生命 Trigger |
| TTG | UA56BT/TTG-1-043 | 角色本身 `IMPACT 無效`；與其交戰的角色本次交戰失去 IMPACT，生命 DRAW |
| TTG | UA56BT/TTG-1-066 | ACTIVE 時產生紅色能源 +1，REST 立即失效 |

來源：每張卡的 `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-XXX` 或 `UA56BT%2FTTG-1-XXX` 官方卡文；Q556 詳見 BLEACH BLC-1-036 的官方 Q&A。

## 尚未完成／不能宣稱的內容

- 這**不是**全 BLEACH 276 張、全 TTG 81 張，更非約 700 張全卡官方自動判定。
- 天元突破**還沒有**一副全部 50 張均已 V2 移植的正式卡牌組，因此**目前還不能做真正 BLEACH 50 張全真卡 vs 天元 50 張全真卡的對打**。
- BLEACH 的全真卡鏡像測試是**對局流程可完成的軟體里程碑**，不代表 15 張卡片已經通過所有官方特殊時序／其他作品裁定。
- 剩餘優先：天元紅色構築補足可用真卡、雙作品全真卡 AI 整局對打、持續效果與成本／搜尋能力的逐卡官方核對、網站 UI 接入和完整 FAQ 驗收。
