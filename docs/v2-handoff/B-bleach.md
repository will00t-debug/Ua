# [V2-B] BLEACH 通用引擎 V2 全卡移植交接

> 分支：`feature/v2-bleach-port-20261015`；整合目標：`feature/universal-rules-v2-foundation-20261014`（PR #70）。不合併 main、不部署 Production；**已移植不是全部官方 FAQ 驗收通過**。本文件與 PR 描述必須隨工作更新。

## 本次獨立盤點（依最新 V2 分支，不用舊版 auto 旗標）

從 `dist/expansion-cards.mjs`、`dist/cards.mjs` 和 `dist/advanced-cards.mjs` 按 `identity` 合併去重，排除異圖／AP，**共 276 種 BLEACH 一般卡**：BLC-1 109 種、BLC-2 73 種、BLC-3 11 種、BLC-4 83 種。獨立逐卡能力欄位盤點詳見 [B-bleach-inventory.csv](./B-bleach-inventory.csv)（276 行：角色能力、主動、被動、Raid、生命 Trigger、卡文、卡號與逐項狀態）。沒有做過官方核對的卡明確標示未驗收，不能把資料庫自動支援旗標當成認證。

- **基線 V2 已有 BLEACH Pilot：15 張**（僅 Pilot，未全面通過個別官方 FAQ）。
- **本 BLEACH 分支新增：21 張**，全部在獨立 `dist/universal-v2/bleach-pack.mjs`，從現有 `verifiedPilotCards('bleach')` 安全疊加；不改原 Pilot／共用核心。
- **目前可載入 V2 BLEACH 測試卡包：36 張（15 + 21）**，**未移植 240 張**。
- 此卡包沒有自動註冊到正式站或共用預覽 UI；由個別測試 import，不得將「本分支包含」混同「Production 可玩」。

## 新增能力類型

| 能力 | 新增數 | 身份卡號／處理 |
|---|---:|---|
| 無固有角色效果 | 14 | BLC-1-002、BLC-1-012、BLC-1-018、BLC-1-021、BLC-1-071、BLC-1-083、BLC-1-086、BLC-2-023、BLC-2-025、BLC-2-031、BLC-2-036、BLC-2-056、BLC-2-059、BLC-2-066；嚴格 vanilla，**仍保留印刷的 DRAW／GET／ACTIVE 生命 Trigger** |
| 純 STEP | 3 | BLC-1-001、BLC-1-089、BLC-4-062；原生 STEP 前線移能源線與合法槽位／時序 |
| 登場強制回手 | 4 | BLC-1-017、BLC-1-035、BLC-1-068、BLC-2-020；模板 `bounceOwnOtherUnderEnergy(1)`：選其他己方角色（能源需求≤1），若無合法其他目標才回手本體，AP 不退 |

卡包每張卡均以當前 `CARDS` 的 `identity`、官方詳頁、原始卡文、印刷能源／AP／BP／產能／觸發等做嚴格一致性檢查；印刷資料改動就報錯。沒有套用 `auto:true`、空效果跳過實際能力、或改呼叫舊判定引擎。

官方卡文範例：[BLC-1-002（無角色能力／ACTIVE）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-002)、[BLC-2-023（無角色能力／DRAW）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-023)、[BLC-4-062（STEP／ACTIVE）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-062)、[BLC-1-035（登場回手）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-035)。

## 共用 V2 核心待辦（僅提需求，不在 BLEACH 分支修改）

| 受影響卡號示例 | 必要能力／預期裁定 | 最小專屬測試 |
|---|---|---|
| BLC-1-016、042、069、BLC-2-022 | 主要啟動 REST 自體、暫時額外產能、主階段結束退場；同名/次數和成本需先校驗 | 已 REST 不能再啟動；第二次使用非法；主階段結束同一 UID 恰好進場外一次 |
| BLC-1-051、053、BLC-2-040、042 | onLeave 觸發、抽多棄多、支付／選擇待決；目前 V2 時點不完整 | 攻擊／退場後效果排程，牌庫不足、非法棄 UID、不能跳過強制抽棄 |
| BLC-1-041、047、053、070、093；BLC-2-034 | 額外 Raid、指定底板／合法進場、登場時複合效果與底板守恆 | 場滿／AP 不足拒絕突襲；只有一張牌可 mill 時不錯誤獲得後續條件性能力；UID 恆等 |
| BLC-1-038、041、047；BLC-2-061 | 場外→除外固定／任意張數成本，支付成功後條件效果及前後區域 | 場外 0/1/3/4 張對比，成本不足不白拿後段效果；放棄原始狀態保持 |
| BLC-1-009、074、088、101；BLC-2-063 | IMPACT/DAMAGE 2／IMPACT 無效／第一次阻擋 ACTIVE／第二次攻擊 | 直接攻擊 vs. 戰鬥傷害、合法第二次阻擋／攻擊、阻擋後生命 Trigger 順序 |
| BLC-2-002、BLC-4-024、060、BLC-3 系列 | 跨線交換／位移、滿格替換、免疫／保護，選擇順序與同時觸發 | 滿格前能源線、非法目標、放棄選擇與 AP 成本不得變動；實體 UID 全保留 |
| BLC-1-028、063、BLC-2-011、032、BLC-4-082 | 牌頂 N 張私密檢視／多條件選取與餘牌放置，特殊條件抽牌 | 抽取不足 N 張、非法卡名、排序、隱藏資訊與跨作品 cardId、後續條件實現 |

相關官方問題集：[日本官方 UNION ARENA BLEACH 個別卡 FAQ](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AB%E3%83%BC%E3%83%89%E5%80%8B%E5%88%A5&sub_category=BLEACH+%E5%8D%83%E5%B9%B4%E8%A1%80%E6%88%A6%E7%AF%87)。已知 Q556：BLC-1-036 即使牌庫只剩 1 張，也要盡可能將實際有的牌送場外；不得假裝抽滿 2 張或直接跳過。Q557–Q562 涉及場外／除外成本與「若如此做」成立條件，須逐卡根據官方原文與 FAQ 再驗證，不得直接用舊引擎作答案。

## 專屬測試與整合限制

- `tests/universal-v2-bleach-port.test.mjs`：新增卡清單、真卡 50 張 deck 驗證、STEP 合法／非法、成本／合法回手／無合法目標時自回、放棄與 UID 違規拒絕、生命 Trigger 宣告與資料保密、UID 守恆。
- 原有 `tests/universal-v2-bleach-real-deck.test.mjs` 仍用原 Pilot，不修改其結果；驗收兩者分開。
- **執行狀態：尚未取得本分支 Node 22 CI 結果，不能把 PR #70 的測試次數當成本分支結果**。測試確認後更新此行與 PR 描述。
- **嚴格未更動** `engine.mjs`、`pack.mjs`、`ability-templates.mjs`、共用入口、AI、`real-card-pilots.mjs`。
- 02:00 前產出實際 276 卡盤點；04:30 前首批可整合 commit；05:30 後以修錯與交接為主。保留 Draft。

## 剩餘 240 張完整身份卡號

**BLC-1 (82)**：BLC-1-003、BLC-1-004、BLC-1-005、BLC-1-006、BLC-1-007、BLC-1-008、BLC-1-009、BLC-1-010、BLC-1-011、BLC-1-013、BLC-1-014、BLC-1-015、BLC-1-016、BLC-1-019、BLC-1-020、BLC-1-022、BLC-1-023、BLC-1-024、BLC-1-025、BLC-1-026、BLC-1-027、BLC-1-028、BLC-1-029、BLC-1-030、BLC-1-031、BLC-1-032、BLC-1-033、BLC-1-038、BLC-1-041、BLC-1-042、BLC-1-043、BLC-1-044、BLC-1-046、BLC-1-047、BLC-1-049、BLC-1-050、BLC-1-051、BLC-1-053、BLC-1-054、BLC-1-055、BLC-1-056、BLC-1-058、BLC-1-059、BLC-1-060、BLC-1-061、BLC-1-062、BLC-1-063、BLC-1-065、BLC-1-067、BLC-1-069、BLC-1-070、BLC-1-072、BLC-1-073、BLC-1-074、BLC-1-075、BLC-1-076、BLC-1-077、BLC-1-078、BLC-1-079、BLC-1-080、BLC-1-081、BLC-1-082、BLC-1-084、BLC-1-085、BLC-1-087、BLC-1-088、BLC-1-090、BLC-1-091、BLC-1-092、BLC-1-093、BLC-1-094、BLC-1-095、BLC-1-096、BLC-1-097、BLC-1-098、BLC-1-099、BLC-1-100、BLC-1-101、BLC-1-104、BLC-1-106、BLC-1-108、BLC-1-109

**BLC-2 (65)**：BLC-2-001、BLC-2-002、BLC-2-003、BLC-2-004、BLC-2-005、BLC-2-006、BLC-2-007、BLC-2-008、BLC-2-009、BLC-2-010、BLC-2-011、BLC-2-012、BLC-2-013、BLC-2-014、BLC-2-015、BLC-2-016、BLC-2-017、BLC-2-018、BLC-2-019、BLC-2-021、BLC-2-022、BLC-2-024、BLC-2-026、BLC-2-027、BLC-2-028、BLC-2-029、BLC-2-030、BLC-2-032、BLC-2-033、BLC-2-034、BLC-2-035、BLC-2-037、BLC-2-038、BLC-2-039、BLC-2-040、BLC-2-041、BLC-2-042、BLC-2-043、BLC-2-044、BLC-2-045、BLC-2-046、BLC-2-047、BLC-2-048、BLC-2-049、BLC-2-050、BLC-2-051、BLC-2-052、BLC-2-053、BLC-2-054、BLC-2-055、BLC-2-057、BLC-2-058、BLC-2-060、BLC-2-061、BLC-2-062、BLC-2-063、BLC-2-064、BLC-2-065、BLC-2-067、BLC-2-068、BLC-2-069、BLC-2-070、BLC-2-071、BLC-2-072、BLC-2-073

**BLC-3 (11)**：BLC-3-001、BLC-3-002、BLC-3-003、BLC-3-004、BLC-3-005、BLC-3-006、BLC-3-007、BLC-3-008、BLC-3-009、BLC-3-010、BLC-3-011

**BLC-4 (82)**：BLC-4-001、BLC-4-002、BLC-4-003、BLC-4-004、BLC-4-005、BLC-4-006、BLC-4-007、BLC-4-008、BLC-4-009、BLC-4-010、BLC-4-011、BLC-4-012、BLC-4-013、BLC-4-014、BLC-4-015、BLC-4-016、BLC-4-017、BLC-4-018、BLC-4-019、BLC-4-020、BLC-4-021、BLC-4-022、BLC-4-023、BLC-4-024、BLC-4-025、BLC-4-026、BLC-4-027、BLC-4-028、BLC-4-029、BLC-4-030、BLC-4-031、BLC-4-032、BLC-4-033、BLC-4-034、BLC-4-035、BLC-4-036、BLC-4-037、BLC-4-038、BLC-4-039、BLC-4-040、BLC-4-041、BLC-4-042、BLC-4-043、BLC-4-044、BLC-4-045、BLC-4-046、BLC-4-047、BLC-4-048、BLC-4-049、BLC-4-050、BLC-4-051、BLC-4-052、BLC-4-053、BLC-4-054、BLC-4-055、BLC-4-056、BLC-4-057、BLC-4-058、BLC-4-059、BLC-4-060、BLC-4-061、BLC-4-063、BLC-4-064、BLC-4-065、BLC-4-066、BLC-4-067、BLC-4-068、BLC-4-069、BLC-4-070、BLC-4-071、BLC-4-072、BLC-4-073、BLC-4-074、BLC-4-075、BLC-4-076、BLC-4-077、BLC-4-078、BLC-4-079、BLC-4-080、BLC-4-081、BLC-4-082、BLC-4-083

**未移植者不在 `createBleachV2Pack()` 白名單內，V2 拒絕其組牌／對戰要求；不會用未實作能力冒充完成。**
