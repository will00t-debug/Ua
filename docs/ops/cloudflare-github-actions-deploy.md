# Cloudflare Workers 正式部署（GPT 直接部署版）

給 GPT / Codex：用 **GitHub 合併 + Actions** 完成正式 Cloudflare 部署與驗收。  
密鑰只在 GitHub Secrets；**不要**把 Token 貼進對話、程式碼或日誌。

## GPT 直接部署路徑（預設開啟）

1. 開 PR → 等測試綠燈 → **合併進 `main`**。
2. 若變更觸及 `dist/`、`worker/`、`server/`、`wrangler.jsonc` 等部署路徑，Actions 會自動：
   - preflight（鎖死既有 Worker / Durable Objects）
   - `npm test`
   - `worker:build`
   - `wrangler deploy` 到既有 **`ua-arena`**
3. 等 workflow **Deploy unified UA V2 to existing Cloudflare Worker** 成功。
4. 公開 URL 驗收（無需密鑰）：
   - `https://ua-arena.will00t.workers.dev/`
   - `/online.html` 登入 UI
   - 對戰／牌組／帳號同一 host

也可在合併後手動補跑：

```bash
gh workflow run cloudflare-unified-deploy.yml \
  --ref main \
  -f worker_name=ua-arena \
  -f durable_objects_policy=preserve
```

| 項目 | 狀態 |
| --- | --- |
| 正式 Worker | 既有 `ua-arena` |
| Durable Objects | `ACCOUNTS`→`AccountBook`、`ROOMS`→`MatchRoom`；**禁止刪除／改名** |
| 自動正式部署 | **開啟**：符合 path 的 `main` push 即部署 |
| 手動部署 | `workflow_dispatch`（必須輸入 `ua-arena` + `preserve`） |
| 密鑰 | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`（僅 Actions；Agent 不可讀值） |

## 為什麼這是「GPT 直接部署」但仍安全

- GPT **不需要** Cloudflare 登入，也不持有明文 Token。
- GPT 只操作 GitHub：合併／觸發 workflow／讀 run 結論／打公開 URL。
- Token 只注入 Actions runner；比把 Cloudflare 憑證交給 ChatGPT 對話安全。
- Preflight 拒絕改 Worker 名、改 DO binding、或 `deleted_classes`／危險 migrations。

**不要**採用「把 API Token 貼給 GPT／ChatGPT Cloudflare 外掛直接 deploy」當正式路徑。

## 維護者密鑰（人類瀏覽器；勿貼到聊天）

最小權限 API Token（單一 Account）：

- Workers Scripts: Edit
- Account Settings: Read

放入 GitHub Actions Secrets（可掛 Environment **`Production`**，並加 Required reviewers）。  
Workflow 已使用 `environment: Production`。

## GPT 回報格式

只回報：合併的 PR、Actions run URL／結論、公開 URL 驗收結果。  
禁止轉貼任何疑似 Token／Authorization 字串。  
禁止修改或刪除既有 Durable Objects 資料。

## 本機

除錯可用 `npm run worker:deploy`（需 `wrangler login`）。正式對外以 Actions 為準。
