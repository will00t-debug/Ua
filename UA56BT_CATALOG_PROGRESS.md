# UA56BT 天元突破卡池核對進度

官方產品資料（https://www.unionarena-tcg.com/jp/products/boosters/ttg-1.php）列出：
- SR 12 種、R 12 種、U 28 種、C 28 種，合計 **81 種一般構築卡片**。
- AP（Action Point）**12 種**，與構築用卡牌分開計算，不加入 50 張牌組。
- 平行異圖版本另計，不是新的構築卡號。

## 本分支狀態
- 已逐項記錄 73/81 種可構築卡片，另有 **8 種**已確認卡號／卡名但欠缺完整數值與效果（不可構築）。
- 已建立獨立天元突破牌組編輯器，另以 `dist/ttg-pending.mjs` 唯讀顯示 9 張部分資料；不能用於 50 張牌組。所有條目標示 auto:false。
- `dist/ttg-rules.mjs` 有 Raid 頂卡裏向轉移、能源與妮亞選擇的純規則函式；`dist/ttg-actions.mjs` 已新增妮亞／卡米那互斥、Giga Drill 勘誤退場、AP 卡狀態轉移及同名每回合限制的 reducer。這些均有單元測試，但 **沒有接入完整遊戲 dispatch/AI/UI 效果選擇流程**。
- 官方卡片展示頁網址格式：`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-NNN`，但不得只憑推算網址就當成資料已驗證。
- 不把未確認的能源、AP、BP、印刷效果填為推測值。
- AP 圖卡由 `ttg-builder.mjs` 過濾，不放入構築牌池。

## 待辦
1. 逐張核對剩餘 8 種未完成資料的官方日文原文、類型、能源、AP、BP、產能、Trigger、Raid／特徵：TTG-1-002、006、049、057、059、063、064、065、071；不可把只有名字／稀有度的條目算為資料完整。
2. 經授權取得／連結官方卡圖，補上卡圖 fallback；不得自動以錯誤卡號猜圖。
3. 已新增 `ttg-event-resolver.mjs` 與 `ttg-triggers.mjs`：TTG-1-036/037/038/078/079 事件及 FINAL trigger、TTG-1-081 修正正常效果及其 SPECIAL trigger，包含能源/AP/合法目標驗證。它們仍只是獨立執行 API，未接入 UI/AI。\n4. 將獨立效果 reducer 接入天元突破專屬 match dispatcher，補齊另外所有效果的合法性、成本與結算順序，再做 81 種卡逐張回歸及完整 AI 對局測試。
5. 確認官方 Q2301 TTG-1-081 勘誤，只能指定敵方前線角色；不可被對方效果選擇的角色也不能成為其合法目標。

剩餘八種待核對資料位於 `dist/ttg-pending.mjs`，在牌組編輯器可查看但不可加進構築／AI；`TTG-1-064` 已依官方 UAPR 同卡號再版核實數值與 Trigger 並轉入完整欄位卡池。

此文件不是「81/81 已完成」聲明。
