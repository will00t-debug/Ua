# hybrid-start-hard-v1 精簡審查

這份文件只核對可以合併審查的範圍。完整研究對局、逐手搜尋快照與里程碑長文留在 PR #370 `4cac28f8fb7ea0ad6d046fa1de64a54d501a7791` 與 PR #320 `781cef62f940d5fc6464d3522cdeaead8f7c5a41`。檔案路徑、git blob 與 SHA256 在 `docs/v2-handoff/AI-V3-AUDIT-PROVENANCE.json`。

來源 CI：PR #370、`BLEACH Arena Tests` run [43152246682](https://github.com/will00t-debug/Ua/actions/runs/43152246682) 成功。HEAD 與本審查所取的程式相同。

## 棋力契約

`dist/universal-v2/ai-v3/` 與 PR #370 的該目錄位元組相同。本分支沒有改權重、搜尋或路由函式。

| 項目 | 值 |
| --- | --- |
| 原版 AI v3 | `ai-v3-beam-1` |
| 主階段混合 | `hybrid-main-v1`：空閒主階段 `hard-search-2`，其餘 AI v3 |
| 新混合 AI | `hybrid-start-hard-v1`：開始與空閒主階段 `hard-search-2`，移動、攻擊與全部 pending 仍是 AI v3 |
| 預算 | 48 節點、40ms、搜尋種子 1 |
| 正式預設 | 三個選項都未勾選。困難仍是 `hard-search-2` |
| 記住的位置 | `localStorage`：`ua-ai-v3-preview`、`ua-hybrid-main-v1`、`ua-hybrid-start-hard-v1` |
| Worker | 只接受上面兩個具名混合政策。`settleLife` 與 `paidFront` 在密封請求裡會被拿掉 |

獨立驗證的種子鎖仍是完整原文：`audit/ai-v3-start-hard-8890-seed-lock.json`（8890–8929，每臂 160 場，賽前命名）、`audit/ai-v3-start-hard-8970-seed-lock.json`、`audit/ai-v3-hybrid-vs-v3-8800-seed-lock.json`、`audit/ai-v3-paid-front-8930-seed-lock.json`。200 場 hybrid 對 v3 的勝負列是 150 勝 50 敗；逐手軌跡不在這個分支。

## 與 PR #370 的唯一行為差異

正式公開對戰頁不再因 `?audit=` 或任何其他查詢參數進入稽核局面。`auditFixtureName` 只在 `localhost`、`127.0.0.1`、`::1` 回傳名稱，自動化測試與本機 Chrome 驗收仍走原來的合法 V2 局面。一般對局的引擎操作沒有改。

## 沒有帶進這個分支的資料

134 個純研究 audit 沒有複製。13 個回歸會讀到的大型檔改成等價子集：只留測試實際重放的對局，或測試斷言會讀到的欄位，數值來自來源檔，沒有改寫勝敗。12 個小型鎖、基準針與霓虹驗收紀錄保持原文。`docs/v2-handoff/AI-V3-MILESTONE.md` 與 18 支只用於研究重跑的腳本也留在來源分支。

## 本分支驗證

`npm test`（Node.js 22.23.4，乾淨工作樹）4676 pass、0 fail。比 main 多出的是這次帶入的 AI 與稽核入口測試。

Chrome 驗收用的是腳本原預算，沒有縮短 150000ms。

- `scripts/ai-v3-neon-mobile-acceptance.mjs`：412×915，`ok: true`。STG-1-006 先選角色再啟動；BLC-2-067 普通進場、突襲進場、擠位取消與確認都走完。
- `scripts/ai-v3-start-hard-preview-e2e.mjs`：三個選項預設未勾，policy 是 `normal`。桌面 1366 與手機 412 各打完白劍、刀劍神域、命運石之門。開始階段來源都是 hard，pending 沒有落到 hard。七張生命、AP、霓虹樣式都在。`raidCommit` 4、`squeezeConfirms` 15、`activateChoice` 3。`ok: true`。

手機驗收重跑後，`audit/ai-v3-neon-mobile-acceptance.json` 與 PR #370 的 SHA256 `26488b7798c64339c60bf96d07f60b688d0bdded88ed0899eb2a5843b7220d3d` 相同，所以照原文放進來。桌面加手機的對局驗收是這次新跑的，寫在 `audit/ai-v3-release-chrome-start-hard-e2e.json`。來源清單裡的 `audit/ai-v3-start-hard-preview-e2e.json` 仍是舊研究檔，沒有被這次的結果蓋掉。

`git diff 4cac28f8fb7ea0ad6d046fa1de64a54d501a7791 -- dist/universal-v2/ai-v3` 是空的。大廳 HTML、稽核局面與進場動作與該提交相同。`dist/universal-v2-preview.mjs` 只多了公開頁忽略 `?audit=` 的那一層。
