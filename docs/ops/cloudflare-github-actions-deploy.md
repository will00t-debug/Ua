# Cloudflare Workers 正式部署（GitHub Actions 安全整合）

給 GPT / Codex / Cursor 與維護者：如何在**不接觸明文密鑰**的前提下，完成 GitHub 合併、Cloudflare 正式部署與驗收。

## 現況結論（已檢查）

| 項目 | 狀態 |
| --- | --- |
| 正式 Worker | 既有 `ua-arena`（`https://ua-arena.will00t.workers.dev`） |
| Durable Objects | `ACCOUNTS` → `AccountBook`、`ROOMS` → `MatchRoom`（sqlite）；部署不得刪除／改名 |
| CI 部署流程 | `.github/workflows/cloudflare-unified-deploy.yml` |
| 密鑰存放 | GitHub Actions Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`（已能成功部署；Agent **不可**列出或印出值） |
| 自動正式部署 | **預設關閉**。僅當 repository variable `ENABLE_CLOUDFLARE_AUTO_DEPLOY=true` 時，`main` push 才會部署 |
| 建議 GPT 路徑 | PR 合併進 `main`（測試綠）→ `workflow_dispatch` 手動觸發部署 → HTTP 驗收 |

**不要**把 Cloudflare API Token 貼進 ChatGPT／Cursor 對話、程式碼、issue、PR 或日誌。  
**不要**讓 GPT 直接持有明文密鑰。  
**不要**修改或刪除既有 Durable Objects 資料（禁止 `deleted_classes`／危險 rename／transfer migrations）。

## 為什麼優先用 GitHub Actions（而不是 ChatGPT 直接接 Cloudflare）

1. **密鑰隔離**：Token 只存在 GitHub Secrets，僅注入 Actions runner；對話與模型上下文看不到明文。
2. **可重現 gate**：部署前固定跑 preflight + `npm test` + `worker:build`。
3. **最小權限**：可用「只夠更新既有 Worker」的 API Token；不必把整帳戶權限交給聊天代理。
4. **稽核**：每次部署都有 Actions run 紀錄與 `Production` environment 關聯。
5. ChatGPT／MCP 直接連 Cloudflare 若要寫入部署，通常仍需可部署憑證進入代理工作區，**風險高於 Actions**，本專案不採用為正式路徑。

GPT 若已連接 GitHub，只需要：合併 PR、觸發 workflow、讀取 run 結論與公開 URL 驗收——**不需要** Cloudflare 登入或 Token。

## 維護者一次性設定（人類在瀏覽器完成；勿貼值到聊天）

### 1. Cloudflare 最小權限 API Token

在 Cloudflare Dashboard → API Tokens → Create Token（Custom）：

- **Account resources**：只選這個專案所在的那一個 Account。
- **建議權限（部署既有 `ua-arena`，workers.dev）**：
  - Account → **Workers Scripts: Edit**（或官方 Edit Cloudflare Workers 範本再刪掉用不到的 KV／R2／Routes）
  - Account → **Account Settings: Read**（Wrangler 解析帳戶需要）
- **不要**加：全帳戶 Admin、DNS 全域寫入、Billing、User API Tokens Write、無關 Zone 的廣泛 Edit。
- 本專案目前走 `*.workers.dev`，一般**不需要** Zone Workers Routes／DNS Edit；若日後綁自訂網域再另開更窄的 Zone token。
- Durable Objects **沒有獨立 permission**；權限跟著實作該 DO 的 Worker。Editor 級 Workers 權限即可更新程式，但仍**禁止**在 `wrangler.jsonc` 寫入會刪 DO class 的 migrations。

建立後只把 Token 貼進 GitHub Secrets 輸入框，**不要**貼到聊天。

### 2. GitHub Secrets

Repository → Settings → Secrets and variables → Actions：

- `CLOUDFLARE_API_TOKEN` =（上一步 Token）
- `CLOUDFLARE_ACCOUNT_ID` =（該 Account ID；可從 Cloudflare Dashboard 複製，同樣不要貼到聊天）

可選：把這兩個 Secret 改掛在 Environment **`Production`**（workflow 已聲明 `environment: Production`），並為該 Environment 加上 **Required reviewers**，讓正式部署需人類核准。

### 3. 自動部署開關（預設維持關閉）

Repository variable（**不是** Secret）：

- 名稱：`ENABLE_CLOUDFLARE_AUTO_DEPLOY`
- 值：只有你確認 Secrets、Environment 保護與驗收流程都就緒後，才設為 `true`
- 未設定或不是 `true`：`main` push **不會**自動部署；仍可用手動 `workflow_dispatch`

**本文件／此變更不會擅自把自動正式部署設成開啟。**

## GPT／Agent 標準作業（合併 → 部署 → 驗收）

1. 在功能分支改碼、補測試；開 PR 進 `main`。
2. 等 `BLEACH Arena Tests`（與相關 V2 workflows）綠燈後再合併。**不要 force push main。**
3. 合併後觸發正式部署（二擇一）：
   - **建議**：Actions → `Deploy unified UA V2 to existing Cloudflare Worker` → Run workflow  
     - `worker_name` = `ua-arena`  
     - `durable_objects_policy` = `preserve`  
   - 或（人類已開啟 auto-deploy 時）等待 push job；GPT 仍應核對 run 成功，不可假設已上線。
4. CLI 等效（僅在已授權 `gh` 的環境；仍看不到 Secret 值）：

```bash
gh workflow run cloudflare-unified-deploy.yml \
  --ref main \
  -f worker_name=ua-arena \
  -f durable_objects_policy=preserve
```

5. 驗收（公開 URL，無需密鑰）：
   - `https://ua-arena.will00t.workers.dev/api/health`（若有）或首頁可載入
   - `/online.html` 登入／註冊 UI 可出現
   - 對戰／牌組／帳號仍在同一 host（見 `tests/unified-production-host.test.mjs`）
6. 回報時只寫：workflow run URL、結論、驗收結果。**禁止**轉貼 Actions 裡任何疑似 Token／Authorization 的字串。

## 部署腳本會拒絕的危險變更

`scripts/cloudflare-deploy-preflight.mjs` 在 `wrangler deploy` 前強制：

- Worker name 必須是 `ua-arena`
- assets：`run_worker_first=true`、`html_handling=none`
- DO bindings 必須恰好為 `ACCOUNTS/AccountBook` 與 `ROOMS/MatchRoom`
- exports 必須維持 sqlite Durable Object
- `migrations` 不得含 `deleted_classes`／`renamed_classes`／`transferred_classes`

本機若有 Cloudflare 登入，仍可用 `npm run worker:deploy`；正式對外流程以 Actions 為準。

## 與 Vercel 的關係

`vercel.json` 可把部分路徑反向代理到 `ua-arena.will00t.workers.dev`。靜態卡圖／Vercel 站與 Cloudflare 帳號／線上對戰是分開的；**帳號與對戰狀態在 Durable Objects**，不要為了「清快取」去刪 Worker 或 DO。
