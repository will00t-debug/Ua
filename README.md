# BLEACH Arena v9.1.1 — GitHub / Vercel 專案

## AI v3：神經網路自我對戰實驗（獨立分支）

新的 `feature/ai-v3-learning` 分支以 Work 的 `fix/ai-tactics-private-20261013` 為基礎，不會覆蓋 BLEACH 卡片修補或《我獨自升級》Beta。這次新增**可訓練的微型神經網路**（72 維觀測／24 個 ReLU 隱藏單元／1 個動作分數），使用純 JavaScript 實作，無需 API Key；遊戲規則和合法動作仍由既有引擎控制。

- `dist/ai-v3-features.mjs`：輸入只使用行動者自己的手牌、雙方公開場上資訊和隱藏區域張數；不查看敵方手牌或雙方未翻開的牌庫／生命內容。
- `dist/ai-v3-network.mjs`：可透過成對動作偏好更新權重的真正神經網路，不只是更改固定權重。
- `scripts/train-ai-v3.mjs`：自我對戰產生示範與勝負訊號、訓練候選模型、用不同隨機種子對抗 AI v2 困難對手，合格才可以加上 `--promote` 產生網站使用的模型。
- `dist/ai-v3-policy.mjs`：神經網路選合法動作，採保守覆寫；**若 `dist/ai-v3-weights.mjs` 尚無通過評測的模型，一律沿用困難 AI**。
- 網站電腦練習新增「神經網路（實驗）」選項；模型推論於背景 Worker 執行。這不是線上玩一局就改權重：訓練需要在外部運算環境執行，且必須先通過保留測試集。

範例（Node 22）：

```sh
npm test
npm run train:ai -- --games 200 --eval 72 --epochs 5 --seed 25000
# 查看 audit/ai-v3-evaluation.json，評估結果通過後才可升級
npm run train:ai -- --games 200 --eval 72 --epochs 5 --seed 25000 --promote
```

訓練資料採用你提供的三副 BLEACH 牌組，卡表中的完整編號會映射成引擎使用的卡片 ID（例如 `BLC-1-039` → `039`）。驗收門檻為保留測試的完成場次、無規則錯誤、至少 55% 對 AI v2 困難勝率；此門檻是工程實驗而非真正實力排名保證。測試結果不應在未確認前宣稱神經網路變強。正式網站不會因為這個分支更新。


## AI v2 預覽（feature/ai-v2）

對戰大廳的電腦練習新增三種難度：簡單（原版策略）、普通（通用局面評分）、困難（限制節點的多步搜尋）。不需要 API Key 或模型訓練，維持瀏覽器本機運算。AI v2 位於 `dist/ai-v2.mjs`，只透過 `legalActions` 和 `dispatch` 使用既有遊戲規則，不更動卡片結算。

AI 依公開盤面、生命數量、己方手牌與能源/AP 評估行動；模擬遇到未知牌堆抽取、牌庫重排或生命揭示時會停止搜尋，避免偷看隱藏資訊。新系列若能使用相同引擎、且有完整自動判定，原則上不需重訓模型；尚未接上對戰引擎的系列，**不會**因為新增 AI 而自動可對戰。

目前是通用策略的第一版，不保證對所有複合效果作出最佳選擇，也沒有宣稱通過特定勝率基準。透過 `npm test` 驗證回歸測試；使用 `npm run benchmark:ai -- --games 12 --difficulty hard` 讓新版和原版以相同 BLEACH 預設牌組交換座位對戰，記錄勝率、未完賽局與動作數。這是可重現的基準測試，不代表跨牌組、跨系列實力或官方裁定驗證。


**部署新網站請先閱讀 [MIGRATION_GITHUB_VERCEL.md](MIGRATION_GITHUB_VERCEL.md)**。這份來源包含 v9.1.1 規則修補，`dist/` 是靜態網站根目錄；`npm test` 執行 110 項回歸測試。

以下保留上一版本的開發說明：

# BLEACH Arena v9 — 高級預組 UA01DC 與全卡自動判定

BLEACH 主題 UNION ARENA 單機／同裝置雙人練習模擬器（繁體中文）。

## v9 更新

- **卡片總數 276 種；276 種均登錄自動判定規則；待補標記 0 種**。包括過去 v8 尚待處理的 47 種，以及全新高級預組的 2 張 SR。
- UA01DC/BLC-4-082 黑崎一護：紫 3、AP 1、BP 2500、產能 2、GET Trigger；查看牌庫頂 2 張並按去向排列，送場外有需求能源 ≥3 卡時抽 1 張。
- UA01DC/BLC-4-083 朽木露琪亞：紫 2、AP 1、BP 2500、產能 1、無 Trigger；己方空場能源需求 −2、成為 Raid 基底時二選一、登場查看牌庫頂並選擇放回或送場外。
- 補齊選擇模式、牌庫頂查看與排序、延遲退場、跨回合保護、從手牌發動、複合成本、退場重生、場外／除外區召回、兩段選擇、手牌棄置觸發、夜一狙擊及各類 ENERGY／BP／AP 條件判斷。
- 修正舊版條件／回合旗標、進場時點、雙能力卡牌的獨立使用次數、葛力姆喬觸發，以及傑拉德復活選位置時的卡片守恆問題。
- 原本的 24 種 Raid、牌組編輯、REST 橫置、手牌／牌庫／場外自動移動、生命 Trigger、電腦練習與雙人模式皆保留。

## 啟動／部署

網站原始碼位於 `dist/`，無須 npm 套件或前端編譯。部署時將 **`dist/` 內全部檔案** 放在靜態網站根目錄（`index.html` 必須在根目錄）。

本機開啟：

```sh
python3 -m http.server 8000 --directory dist
```

接著打開 `http://localhost:8000`。由於使用 ES Modules，建議 HTTP 伺服器，不要直接用 `file://` 開啟未打包的模組版本。

測試（需 Node.js 18 以上）：

```sh
npm test
```

目前已執行 **92 項測試、92 通過、0 失敗**，包含主要新卡特殊結算、種子整局 AI 模擬與 50 張卡片守恆。測試通過不代表官方已審查或能涵蓋所有極端連鎖裁定；建議持續進行手動實戰回報。

## 卡圖與來源

- 原有卡圖保存在 `dist/assets/cards/`。
- 新高級預組兩張附有本機 SVG **資訊佔位圖**；連網時網站會優先嘗試由卡片資料所記錄的公開商品圖片網址載入真實卡面，失敗時回退佔位圖。離線部署包不包含這兩張的原始商品照片。
- 單機儲存的牌組與對局資料在該瀏覽器本地，換網站網址或裝置不會自動同步。
- 這是非官方練習專案；卡片與角色版權歸權利人所有，特別裁定仍以 UNION ARENA 官方說明為準。

詳細改動請參閱 `自動判定進度_v9.md`；舊版進度檔留存作為歷史紀錄。

### Private AI tactics trial (2026-10-13)

This integration preserves the Solo Leveling Beta and all three BLEACH fixes from
`solo-beta-blc-fixes-20261013`, alongside `feature/ai-v2`.
BLEACH normal/hard now prioritize early energy, resolve visible effect targets before
scoring, and allocate equal bounded extensions to shortlisted root actions. A
public-board, three-attack approximation considers the opponent's blocking choices,
DAMAGE, IMPACT, forced blocking and double blocking. It is not a complete simulation
of every attack/block chain or unknown life trigger. Complex hidden transitions still
use heuristic estimates; no claim of perfect hidden-information strategy is made.

Opponent search uses a browser module Worker; on error or after two seconds it falls
back to legacy AI. Stale results after navigation/state changes are discarded.
No Android device test has been performed. **SLG retains its separate Beta AI**;
the BLEACH difficulty selector does not upgrade SLG or other series.

Validation: Node 22.23.3, 349 tests passed. Held-out benchmark (seeds 10000–10003,
both built-in BLEACH decks, all four deck pairings, both seats/first players):
45 wins / 19 losses against legacy, no unfinished games. This is a limited preset
benchmark, not a general skill rating. Container decision latency p95 37.7ms,
maximum 158.1ms, not measured Android latency. Reproduce with:

```sh
npm run benchmark:ai -- --games 64 --matrix --seed 10000 --difficulty hard
```

Raw summary: `audit/ai-tactics-benchmark-20261013.json`.


### PDF deck sparring fixtures (2026-10-13)

Three user-submitted 50-card BLEACH decks are stored in `dist/training-decks.mjs`:
- Green Kenpachi/Unohana/Hitsugaya, AP Card 查 code `eb05301f80` (13 card identities).
- Purple Renji/Rukia/Ichigo, code `eb052afef7` (13 identities).
- Blue Ichigo/Zangetsu/Grimmjow, code `eb052c890b` (14 identities).

Alternate art/printings count under the canonical BLC identity. The game lobby now lists all three under **實戰 AI 對練牌組** as player or opponent decks; these entries do not change the existing default presets or other series. Every card must pass `validateDeck` and `pendingCards`, and automated tests include all nine ordered matchups.

To reproduce AI sparring on Node.js 22:
```sh
npm test
npm run spar:ai -- --games 36 --difficulty hard --opponent legacy --seed 12000
npm run spar:ai -- --games 36 --difficulty hard --opponent hard --seed 12000
```
The 36-game run covers each ordered matchup four times while rotating first player and AI seat. Use `--games 9 --max-actions 350` for a quick nine-matchup smoke test. Results measure only these decks/seeds and are **not** neural network training. This addition preserves the Work/PR #17 AI branch and does not deploy the production site.

