# UNION ARENA V2 — 私人手機測試與可重播除錯指南

**狀態：僅 Draft PR #70 的 V2 feature 分支，沒有部署至 main / 正式網站。**

## 使用方式

1. 開啟「獨立 Vercel Preview Deployment」網址尾端的 `/universal-v2-preview.html`。若 Vercel 顯示登入保護頁，請以擁有該專案存取權限的帳號登入；不要為了測試而關閉 Deployment Protection。
2. 選擇玩家和 AI 使用的作品（BLEACH 紫色或天元突破紅色），選好 AI 難度（簡單／普通／困難）、先手與 1～999999999 的固定牌序種子，點 **開始新對局**。
3. 點選自己手牌或前／能源線的角色，右側／下方會列出**由 V2 引擎實時計算的合法操作**。不能直接從畫面猜測或建立非法動作；效果選擇時會強制開啟選擇視窗。
4. 若某卡不能突襲、生命觸發未顯示、角色錯誤離場、能源異常或 AI 隨意把低費牌推上前線，記下「種子」、雙方作品、先手、難度以及操作紀錄，方便重現。
5. **下載對局記錄（文字）**：公開導向的逐步操作日誌。AI 從未公開的手牌／牌庫選牌時，不會顯示隱藏卡號或實體 UID。畫面只顯示最近 28 步，下載文字檔則保留全部紀錄。
6. **下載除錯重播 JSON**：供可信任的開發者在 Node.js V2 引擎上依相同 seed、雙方 50 張牌組和逐步選擇重跑。它**包含牌序及雙方私密卡的選擇**，下載前必須明確同意警告；不要把 JSON 公開貼到網站、社群或 GitHub 公開 Issue。
7. 可以在非 AI 執行中使用 **復原操作**，回到上一步人類操作前的局面；紀錄和重播操作亦會一起復原。

## 目前包含

- **實際可用**：BLEACH 紫色 50 張、天元突破紅色 50 張全真卡測試牌組；人類 vs AI、本地階段推進、AP、ENERGY／FRONT、Raid、攻擊／阻擋、生命觸發、合法效果選牌、簡單／普通／困難 AI。
- **僅已移植 V2 Pilot**：BLEACH 15 個印刷卡號、天元突破 20 個印刷卡號；可複用能力模板 25 種。
- **未完成**：另外約 665 個印刷卡號及其完整官方 FAQ、所有卡種的完整手機逐卡驗收、網路真人連線、牌組任意匯入、全部作品 AI 策略驗收。
- **限制**：目前官方真卡 50 對 50 的 Node.js 自動測試已通過，但瀏覽器實機完整手動操作仍須針對不同手機與瀏覽器逐步確認。

## 自動驗收範圍

- `tests/universal-v2-preview-ui.test.mjs` 驗證私密視圖、獨立頁入口與合法動作選擇。
- `tests/universal-v2-preview-replay.test.mjs` 驗證同作品／跨作品 seed 決定性重播、版本與動作合法驗證、手牌／牌庫的 AI 私密選擇被遮蔽、公開卡在進入場上才可顯示名字。
- `tests/universal-v2-ai-deck-energy-planning.test.mjs` 驗證困難 AI 根據自己原立牌組 50 張的最高費用規劃能源、REST／MOVE 時正確扣除 ACTIVE 產能，而不是只看起手手牌。
- `tests/universal-v2-ttg-vs-bleach-real-decks.test.mjs` 驗證全真跨作品多種 seed 和先手 AI 完整對戰。
- GitHub Actions `tests.yml` 加入所有 V2 preview ES module 的 `node --check`、獨立 HTML/CSS/JS 檔案存在性檢查；不更改正式 `dist/index.html`。

**安全與維運：** Preview 不會把除錯 JSON 自動上傳伺服器；使用者需自行決定是否下載及分享。保留原本 Vercel Authentication 保護、原 main/Production 網址及 legacy 遊戲入點。
