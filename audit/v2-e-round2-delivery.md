# V2-E 第二輪固定提交驗收摘要（現行；歷史快照另見 E-acceptance.md）

**判定：NO-GO（五作品整合私人測試版尚未達交付門檻）。**

## 同步來源與執行

- 核心 A / PR #70：`25eeac5084917534193fd9feaeae31672f902e78`
- 候選 B / PR #73：`dfdf1996706b61ef5f8c307bd786f7b8260abd8c`
- 候選 C / PR #72：`bfb79970effd6095862dd837333da9cb58a8e977`
- 候選 D / PR #74：`3a119bf73bbfb103e850d779923212c9dcdcf162`
- E 腳本的已驗證提交：`dbc335164dca60b35179e412394973206c41bd96`；GitHub Actions：https://github.com/will00t-debug/Ua/actions/runs/38673107165
- Node `v22.23.3`；`node scripts/v2-e-round2.mjs` 在 exact SHA git worktrees 執行。A 使用 `npm test`；B/C/D 各自專測；額外 scratch 組合與 Chromium 均另記。

## 完成度四層分類

| 作品 | 普通卡已建檔 | PR70 Registry 已移植 | B/C/D 候選（含 Pilot） | 整卡全部能力/FAQ驗收 | 所有卡證實整合可玩 |
|---|---:|---:|---:|---:|---:|
| BLEACH | 276 | 15 | 71 | 0 | 0 |
| TTG | 81 | 20 | 23 | 0 | 0 |
| SLG | 80 | 0 | 18 | 0 | 0 |
| SAO | 183 | 0 | 33 | 0 | 0 |
| MST | 80 | 0 | 22 | 0 | 0 |
| **總計** | **700** | **35** | **167** | **0** | **0** |

候選實際載入共 167 個唯一作品/卡號，包含現有 35 Pilot，因此新增 132 個尚未進 PR70。固定 identity manifest SHA256：`6f186ebea0b0369b898b0aa27df30dfc99c6fa97ced1338c52961dca76eaeb66`（非單憑動態數字）。

**MST**：D 分支的官方日文來源 `UA54BT_OFFICIAL_PRINT` / `UA54BT_VERIFIED` 80/80 欄位齊全、無 incomplete；A 舊檔的 12 張佔位卡不能誤報 D 現行缺漏。但 D 的 V2 真正實作仍僅 22 種。

## Node 22 實測

| 指令／測試 | 結果／範圍 |
|---|---|
| A `npm test` | **1013/1015**；原 once-per-turn 兩項仍失敗 |
| A `node --test tests/universal-v2-once-per-turn-gate.test.mjs` | **2/4**；測試準備器 hand-first take/重複預取 UID 問題 |
| E 獨立 UID/選放棄/抽牌/守恆 + contract negative cases | **6/6**；同一 A engine SHA 無改規則 |
| B 專測 | **15/15** |
| C 專測 | **21/21** |
| D 專測 | **15/15** |
| B/C/D 暫存組合真卡跨作品 | **60/60 完整終局**；10 組兩兩配對 × 先後手2 × seeds `747`,`20261015`,`20261016`，完整步驟在 CI artifact；**不是 PR70 已整合** |
| PR70 Chrome 390px mobile emulation（非真機） | **真實 Chromium 41 次 UI 控制回合內顯示終局**；24 next、16 pending-choice、無 JS exception，無超寬，保存 screenshot；僅兩作品兩副固定牌組 |

## P0 阻塞

1. A Registry 五份 series contributions 均仍空；只 35 Pilot，未整合 132 候選，也沒有五作品組牌/預覽 UI。
2. A 原 CI 測試 2 紅燈；已證實是測試準備器與 deck initial-count 誤差，A 必須使用不同物理 UID 的預載手牌修復，不能只改斷言或引擎。
3. 沒有五作品整合相同 commit 的 Node22 回歸和網站端到端；700 張仍沒有逐官方能力及生命 Trigger 全部驗收。

## P1 及限制

- 卡包契約會拒絕明顯來源/成本/重複/未實作 DSL，但偽裝成官方格式的錯誤卡號 URL、虛構 tests 路徑仍可被接納；需要真實來源與測試存在性鎖定，不接受純自我宣告。
- 真實 Android/iOS **未實測**；390px Chrome touch emulation 和真正手機必須分欄。
- 未合併 main、未部署正式站、未修改共享引擎或其他系列卡包。

詳細逐階段交接：`docs/v2-handoff/E-acceptance.md`。完整 CSV、JSON、60 場 seed/action replay 與 Chromium 截圖：https://github.com/will00t-debug/Ua/actions/runs/38673107165 。
