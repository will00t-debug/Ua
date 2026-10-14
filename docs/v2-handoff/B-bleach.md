# [V2-B] BLEACH 通用引擎 V2 全卡移植交接

> 分支：`feature/v2-bleach-port-20261015`；整合目標：`feature/universal-rules-v2-foundation-20261014`（PR #70）。不合併 main、不部署 Production；**已移植不是全部官方 FAQ 驗收通過**。本文件與 PR 描述必須隨工作更新。

## 本次獨立盤點（依最新 V2 分支，不用舊版 auto 旗標）

從 `dist/expansion-cards.mjs`、`dist/cards.mjs` 和 `dist/advanced-cards.mjs` 按 `identity` 合併去重，排除異圖／AP，**共 276 種 BLEACH 一般卡**：BLC-1 109 種、BLC-2 73 種、BLC-3 11 種、BLC-4 83 種。獨立逐卡能力欄位盤點詳見 [B-bleach-inventory.csv](./B-bleach-inventory.csv)（276 行：角色能力、主動、被動、Raid、生命 Trigger、卡文、卡號與逐項狀態）。沒有做過官方核對的卡明確標示未驗收，不能把資料庫自動支援旗標當成認證。

- **基線 V2 已有 BLEACH Pilot：15 張**（僅 Pilot，未全面通過個別官方 FAQ）。
- **本 BLEACH 分支新增：56 張**，全部在獨立 `dist/universal-v2/bleach-pack.mjs`，從現有 `verifiedPilotCards('bleach')` 安全疊加；不改原 Pilot／共用核心。
- **目前可載入 V2 BLEACH 測試卡包：71 張（15 + 56）**，**未移植 205 張**。
- 此卡包沒有自動註冊到正式站或共用預覽 UI；由個別測試 import，不得將「本分支包含」混同「Production 可玩」。

## 新增能力類型

| 能力 | 新增數 | 身份卡號／處理 |
|---|---:|---|
| 無固有角色效果 | 14 | BLC-1-002、BLC-1-012、BLC-1-018、BLC-1-021、BLC-1-071、BLC-1-083、BLC-1-086、BLC-2-023、BLC-2-025、BLC-2-031、BLC-2-036、BLC-2-056、BLC-2-059、BLC-2-066；嚴格 vanilla，**仍保留印刷的 DRAW／GET／ACTIVE 生命 Trigger** |
| 純 STEP | 3 | BLC-1-001、BLC-1-089、BLC-4-062；原生 STEP 前線移能源線與合法槽位／時序 |
| 登場強制回手 | 4 | BLC-1-017、BLC-1-035、BLC-1-068、BLC-2-020；模板 `bounceOwnOtherUnderEnergy(1)`：選其他己方角色（能源需求≤1），若無合法其他目標才回手本體，AP 不退 |

卡包每張卡均以當前 `CARDS` 的 `identity`、官方詳頁、原始卡文、印刷能源／AP／BP／產能／觸發等做嚴格一致性檢查；印刷資料改動就報錯。沒有套用 `auto:true`、空效果跳過實際能力、或改呼叫舊判定引擎。

官方卡文範例：[BLC-1-002（無角色能力／ACTIVE）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-002)、[BLC-2-023（無角色能力／DRAW）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-023)、[BLC-4-062（STEP／ACTIVE）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-062)、[BLC-1-035（登場回手）](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-035)。

## 後續 35 張已使用 V2 正式運作路徑的簡單效果

| 類別 | 張數 | 卡號 | 實際能力 |
|---|---:|---|---|
| ACTIVE 額外產能 | 4 | BLC-1-010、BLC-1-075、BLC-2-029、BLC-4-014 | `activeExtraEnergy:1`，REST 僅保留印刷基礎產能 |
| IMPACT 無效 | 4 | BLC-1-008、BLC-1-043、BLC-1-067、BLC-4-035 | `impactNull:true` 僅戰鬥當下判定，保留 DRAW Trigger |
| 登場抽 1 | 2 | BLC-1-072、BLC-1-094 | `draw` 模板；包含真正場域卡 |
| 登場抽 1 棄 1 | 6 | BLC-2-008、BLC-2-016、BLC-2-052、BLC-2-071、BLC-4-026、BLC-4-040 | 強制抽棄並等待玩家選合法 UID |
| 攻擊抽 1 棄 1 | 1 | BLC-1-082 | 攻擊時效果先完成再允許阻擋選擇 |
| 攻擊 BP+1000 | 1 | BLC-1-090 | 自身本回合加成而非永久修改印刷 BP |
| 恢復最多兩張 AP | 8 | BLC-1-029、BLC-1-100、BLC-2-049、BLC-4-019、BLC-4-020、BLC-4-045、BLC-4-059、BLC-4-080 | FINAL 事件：正常使用恢復 AP；生命 FINAL 只有生命為零時適用 |
| 登場敵前線降 BP1000 | 1 | BLC-2-053 | 可不選，非法目標拒絕，BP 暫時下降 |
| 無額外角色效果 | 1 | BLC-4-061 | 官方效果欄為「-」，仍保留 DRAW 生命 Trigger |
| 全體特徵 BP 強化並抽牌 | 1 | BLC-1-097 | 本回合己方護廷十三隊角色全體 BP+1000，再抽1張；ACTIVE Trigger 獨立 |
| 登場選目標 REST（BP上限） | 1 | BLC-1-013 | 可選敵前線 BP≤3500，合法放棄／非法 BP 目標不通過 |
| 條件提高上限之 SPECIAL 事件 | 2 | BLC-1-099、BLC-2-048 | 原則 BP≤3000；有指定己方山本／露琪亞時≤5000，生命 SPECIAL 不受普通事件成本限制 |
| 登場 BP−500 且 COLOR 生命 Trigger | 1 | BLC-1-049 | [日本官方原文](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT/BLC-1-049)：登場可選對方前線 1 個 BP−500；COLOR 可從己方場外選需求能源≤2、AP1 的紫角色，ACTIVE 登場前線；皆以 V2 真實合法選擇實作 |
| 私密看牌頂、最多送場外1張、其餘牌頂排序 | 2 | BLC-4-009、BLC-4-067 | [BLC-4-009 官方印刷](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-009)（2 張）、[BLC-4-067 官方印刷](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-067)（3 張）：嚴格使用 `inspectTopArrange`，選放棄送場外／指定實際 UID、逐張排序，後段結算前不得跳過 pending |

以上每張同樣在獨立 `bleach-pack.mjs` 的 printed profile allowlist，來源保留官卡詳頁，卡文／數值異動會停止編譯。官方頁面代表例：[BLC-2-029 ACTIVE 追加能源](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-029)、[BLC-1-094 場域登場抽牌](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-094)、[BLC-2-008 登場抽棄](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-008)、[BLC-1-029 FINAL](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-029)。跨卡時序與 FAQ 仍待更完整驗證。

## 2026-10-15 07:04 (台灣) 後的修錯驗收／官方卡文校正

- **BLC-4-014 友哈巴赫**：日本官方印刷發生能源圖示為「黃+」，文字為「此角色處於 ACTIVE 時，額外產生 1 黃能源」。舊庫 `gen:2` 表示 ACTIVE 合計量，但在 V2 `activeExtraEnergy:1` 若同時設 `gen:2` 就會算成 3。本 BLEACH Pack 只在產生 V2 卡時明確將其 `gen:1,activeExtraEnergy:1`（ACTIVE = 2、REST = 1），仍使用舊版 `gen:2` 作來源變更指紋以防默默漂移。已補專測。官方頁面：[EX15BT/BLC-4-014](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-014)。**沒有修改共用卡庫／引擎**。
- **本分支單獨 CI 綠燈**：[Actions 38613289558](https://github.com/will00t-debug/Ua/actions/runs/38613289558) `9d913333`，專屬 12/12、`npm test` **1011/1011**、語法通過。包含一副 50 張綠色官方實體卡完整 AI 鏡像戰局與 UID 守恆。
- **與最新 PR #70 暫存合併：BLEACH 專測 18/18 過，但全庫仍有共用核心阻塞**（[整合 run 38613289558](https://github.com/will00t-debug/Ua/actions/runs/38613289558)）：2 個 `tests/universal-v2-once-per-turn-gate.test.mjs` 範例「放棄不應耗掉同名限次」「每張實體 UID 限次應分開計數」失敗。已確認它們**在 PR #70 本身的 [Actions 38612690292](https://github.com/will00t-debug/Ua/actions/runs/38612690292) 也失敗**，不是此 BLEACH PR 新增；本分支**不可改共用 engine.mjs**。第三個 audit 失敗是最初暫存合併使用 `--no-commit` 造成工作目錄髒污，不是業務邏輯；已改在**無 push 的 Runner** 裡 commit 暫存合併後再測，需再看最新 CI 才能確定第三個消除。
- 新版官方補充：2026-09-11 官方公告對 [EX15BT/BLC-4-056](https://www.unionarena-tcg.com/jp/news/171.php) 印刷效果勘誤；2026-10-09 官方 [Q2399](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-050) 說明露琪亞效果召喚戀次的 AP 支付時點。這兩張**仍在 208 張未移植清單中**，未官文重新校正前不得據舊資料移植。
- 原截止時間 **2026-10-15 07:00（台灣）已到**；此後只做本線測試修正、交接更新與對最新共用核心的隔離整合檢查，不承諾剩餘 208 張已完成。

### 獨立判定補充：BLC-4-014 能源印刷差異

[EX15BT/BLC-4-014 官方卡頁](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-014) 顯示能源欄為黃色「＋」，處於 ACTIVE 時追加黃色產能。原始專案資料把 `gen=2` 作為有效總產能；本獨立 Pack 經明確審核以 `gen=1`、`activeExtraEnergy=1` 解讀，避免 ACTIVE 時雙重計數成 3。額外測試驗證 ACTIVE 產 2、REST 產 1，並保留倉庫原值的差異檢查。

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
- **新增第三組 50 張可合法構築的 BLEACH 混色定向測試牌**：`tests/universal-v2-bleach-enemy-control.test.mjs`，覆蓋 BP3500 合法 REST／拒絕 BP4000、放棄選擇、露琪亞條件 BP5000 退場／一般情況 BP3000。
- **新增私密看牌／排序專屬測試**：`tests/universal-v2-bleach-top-inspect.test.mjs`：官方 2/3 張、最多送場外 1 張、可不送、牌頂排序、不可選未看 UID、私密資訊不洩漏以及 50 張實體卡守恆。
- **新增第二副合法 50 張全真 BLEACH 綠色測試牌**：`tests/universal-v2-bleach-green-match.test.mjs`，12 種普通綠卡各四張+兩張綠色 FINAL（含 field、STEP、IMPACT 無效、抽棄、護廷十三隊群體強化），執行全綠 AI 完整鏡像對局。
- **CI 已實測：GitHub Actions run [38611833944](https://github.com/will00t-debug/Ua/actions/runs/38611833944)（commit `b7683946`）：BLEACH 專屬 11／11 全過，全庫 `npm test` 1007／1007 全過，獨立模組 Node 22 syntax 通過。該 run 包含新綠色 50 張實體卡 AI 完局測試 3 項；其後文件提交需再確認 HEAD CI。**
- **整合測試已實際執行**：CI 在獨立 runner 中對最新 PR #70 主線做暫存 merge commit，未推送任何分支；新 BLEACH 專屬測試在整合核心上通過。完整回歸目前仍有 **2 個 PR #70 上游已存在的測試失敗**：`universal-v2-once-per-turn-gate.test.mjs` 的「選擇不發動不應消耗限次」及「同卡號不同實體各自限次」，見 [PR #70 本身失敗 run](https://github.com/will00t-debug/Ua/actions/runs/38612690292)（1013／1015）、[BLEACH 暫存整合 run](https://github.com/will00t-debug/Ua/actions/runs/38652031396)（1031／1033）。這屬上游 core 的阻塞，**沒有在本分支修共用核心或謊報整合全綠**。待上游修正後應重新跑合併回歸。
- **嚴格未更動** `engine.mjs`、`pack.mjs`、`ability-templates.mjs`、共用入口、AI、`real-card-pilots.mjs`。
- 02:00 前產出實際 276 卡盤點；04:30 前首批可整合 commit；05:30 後以修錯與交接為主。保留 Draft。

## 剩餘 205 張完整身份卡號

**BLC-1 (67)**：BLC-1-003、BLC-1-004、BLC-1-005、BLC-1-006、BLC-1-007、BLC-1-009、BLC-1-011、BLC-1-014、BLC-1-015、BLC-1-016、BLC-1-019、BLC-1-020、BLC-1-022、BLC-1-023、BLC-1-024、BLC-1-025、BLC-1-026、BLC-1-027、BLC-1-028、BLC-1-030、BLC-1-031、BLC-1-032、BLC-1-033、BLC-1-038、BLC-1-041、BLC-1-042、BLC-1-044、BLC-1-046、BLC-1-047、BLC-1-050、BLC-1-051、BLC-1-053、BLC-1-054、BLC-1-055、BLC-1-056、BLC-1-058、BLC-1-059、BLC-1-060、BLC-1-061、BLC-1-062、BLC-1-063、BLC-1-065、BLC-1-069、BLC-1-070、BLC-1-073、BLC-1-074、BLC-1-076、BLC-1-077、BLC-1-078、BLC-1-079、BLC-1-080、BLC-1-081、BLC-1-084、BLC-1-085、BLC-1-087、BLC-1-088、BLC-1-091、BLC-1-092、BLC-1-093、BLC-1-095、BLC-1-096、BLC-1-098、BLC-1-101、BLC-1-104、BLC-1-106、BLC-1-108、BLC-1-109

**BLC-2 (57)**：BLC-2-001、BLC-2-002、BLC-2-003、BLC-2-004、BLC-2-005、BLC-2-006、BLC-2-007、BLC-2-009、BLC-2-010、BLC-2-011、BLC-2-012、BLC-2-013、BLC-2-014、BLC-2-015、BLC-2-017、BLC-2-018、BLC-2-019、BLC-2-021、BLC-2-022、BLC-2-024、BLC-2-026、BLC-2-027、BLC-2-028、BLC-2-030、BLC-2-032、BLC-2-033、BLC-2-034、BLC-2-035、BLC-2-037、BLC-2-038、BLC-2-039、BLC-2-040、BLC-2-041、BLC-2-042、BLC-2-043、BLC-2-044、BLC-2-045、BLC-2-046、BLC-2-047、BLC-2-050、BLC-2-051、BLC-2-054、BLC-2-055、BLC-2-057、BLC-2-058、BLC-2-060、BLC-2-061、BLC-2-062、BLC-2-063、BLC-2-064、BLC-2-065、BLC-2-067、BLC-2-068、BLC-2-069、BLC-2-070、BLC-2-072、BLC-2-073

**BLC-3 (11)**：BLC-3-001、BLC-3-002、BLC-3-003、BLC-3-004、BLC-3-005、BLC-3-006、BLC-3-007、BLC-3-008、BLC-3-009、BLC-3-010、BLC-3-011

**BLC-4 (70)**：BLC-4-001、BLC-4-002、BLC-4-003、BLC-4-004、BLC-4-005、BLC-4-006、BLC-4-007、BLC-4-008、BLC-4-010、BLC-4-011、BLC-4-012、BLC-4-013、BLC-4-015、BLC-4-016、BLC-4-017、BLC-4-018、BLC-4-021、BLC-4-022、BLC-4-023、BLC-4-024、BLC-4-025、BLC-4-027、BLC-4-028、BLC-4-029、BLC-4-030、BLC-4-031、BLC-4-032、BLC-4-033、BLC-4-034、BLC-4-036、BLC-4-037、BLC-4-038、BLC-4-039、BLC-4-041、BLC-4-042、BLC-4-043、BLC-4-044、BLC-4-046、BLC-4-047、BLC-4-048、BLC-4-049、BLC-4-050、BLC-4-051、BLC-4-052、BLC-4-053、BLC-4-054、BLC-4-055、BLC-4-056、BLC-4-057、BLC-4-058、BLC-4-060、BLC-4-063、BLC-4-064、BLC-4-065、BLC-4-066、BLC-4-068、BLC-4-069、BLC-4-070、BLC-4-071、BLC-4-072、BLC-4-073、BLC-4-074、BLC-4-075、BLC-4-076、BLC-4-077、BLC-4-078、BLC-4-079、BLC-4-081、BLC-4-082、BLC-4-083

**未移植者不在 `createBleachV2Pack()` 白名單內，V2 拒絕其組牌／對戰要求；不會用未實作能力冒充完成。**
