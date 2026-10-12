# BLEACH Arena: GitHub + Vercel 遷移與長期維護

## 這一份包含什麼

這是從先前保存的 **v9.1 完整原始碼** 加上 **v9.1.1 FAQ 修補** 產生的 GitHub 用版本；不是即時從原 Sites 重新取回，因此上線前如原 Sites 有更新，請先比對。

- 以 `dist/` 作為網站根目錄。`vercel.json` 已指定 `outputDirectory`。
- `.github/workflows/tests.yml`：對 `main` push、PR 執行 `npm test`。
- `AGENTS.md`：讓 Cursor、Claude Code、Codex 等 AI 知道程式架構與修改原則。
- 不包含舊 Sites 專案綁定檔 `.openai/hosting.json`，避免和新網站混淆。
- 移除不相關的舊版 `dist/launch-v8.html`。

## 首次發布（需有 GitHub 與 Vercel 帳號）

1. 到 https://github.com/new 建立 repository，例如 `bleach-arena`，建議先選 **Private**、且不預先產生 README。
2. 透過具有 GitHub 操作權限的 Work / Codex / Cursor，或本機 Git，把**本 ZIP 解壓後的專案根目錄全部檔案**提交到這個 repository。注意：GitHub 不是直接上傳 ZIP 作為網站原始碼；ZIP 必須先展開後提交。
3. 使用 https://vercel.com/new ，以 GitHub 登入或連接 GitHub，選取剛建立的 repository。
4. Framework Preset 選 **Other**；Root Directory 使用 `./`；Output Directory 由 `vercel.json` 指定為 `dist`；**不需要 build command**。按 Deploy。
5. 打開 Vercel 顯示的正式網址，測試首頁、牌組編輯、卡圖、Raid、REST、AI 與卡片效果。
6. 在 GitHub 的新功能 PR 先確認 Actions 測試成功，再合併進 `main`；Vercel 連接 Git 後可自動部署 `main`。建議對 `main` 設定 branch protection，要求測試成功才可合併。

### 若你使用本機 Git（在解壓後專案根目錄）

```bash
git init
git branch -M main
git add .
git commit -m "Import BLEACH Arena v9.1.1"
git remote add origin https://github.com/你的帳號/bleach-arena.git
git push -u origin main
```

推送 GitHub 時使用你自己帳號的官方授權登入方式，不要把 token 貼在聊天或程式碼裡。

## 日後給其他 AI 的標準指令

> 請連接我 GitHub 的 bleach-arena repository，先閱讀 AGENTS.md，從 `main` 建立分支。依官方 UNION ARENA FAQ 修改我指出的卡片效果，補回歸測試，執行 `npm test`，建立 PR。測試與預覽確認後再合併。不要改舊 ChatGPT Sites 網站或覆蓋最新改動。

## 注意

- 這個儲存庫含遊戲相關卡圖，對外開放原始碼前應確認你有權公開散布檔案。可以先使用 Private repository；部署的網站本身仍會公開展示相關素材。
- 不同網域的 localStorage 彼此不共用，因此舊網址的本機牌組／對戰資料不會自動轉移。可使用遊戲內牌組匯出／匯入功能；對局進度未必能移轉。
- 遷移不等於修完全部官方 FAQ；仍需繼續實戰測試特殊效果。
- 本包沒有自動部署，也沒有連線到你的 GitHub 或 Vercel；第一次授權與建站需你在相應平台完成。
