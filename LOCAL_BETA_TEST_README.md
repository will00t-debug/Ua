# 2026-10-13 我獨自升級 + BLEACH 修正 ZIP 測試版
本版本從 main ae7a911a 分離製作，僅供測試；未修改正式主站。

## 新增與整合
- 我獨自升級 80 張限定試玩 Beta、獨立 solo-match.mjs 對戰與 AI，42 則官方 FAQ 情境稽核；不等同已完成官方逐卡驗收。
- BLEACH：BLC-4-048 看牌頂私密顯示、劍八特殊底板突襲後 DAMAGE 2、普通登場不發動 Raid 框內能力。
- 保留原版五作品圖鑑、BLEACH Raid 四步驟流程與 BLC-4-083 卡圖判定。

## 本機啟動（Python 3）
解壓縮後進入專案根目錄：
python3 -m http.server 8000 --directory dist
再開啟 http://localhost:8000 ，到 牌組構築 → 我獨自升級 → 限定試玩。
請勿直接雙擊 dist/index.html，file:// 可能被瀏覽器擋住 ES modules。
執行 Node.js 22 測試： npm test

## 限制
- Beta 不保證所有跨卡及極端時序符合官方裁定。
- 無職轉生、天元突破、刀劍神域仍是卡表及草稿階段。
- 這是測試 ZIP，不代表正式網站已上線。
