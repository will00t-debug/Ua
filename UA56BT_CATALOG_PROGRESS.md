# UA56BT 天元突破卡池核對進度

官方產品資料（https://www.unionarena-tcg.com/jp/products/boosters/ttg-1.php）列出：
- SR 12 種、R 12 種、U 28 種、C 29 種，合計 **81 種一般構築卡片**。
- AP（Action Point）**12 種**，與構築用卡牌分開計算，不加入 50 張牌組。
- 平行異圖版本另計，不是新的構築卡號。

## 本分支狀態
- 已逐項記錄 27/81 種可構築卡片，尚缺 **54 種**。
- 已建立獨立天元突破牌組編輯器；對戰引擎與遊戲效果尚未接通，所有條目標示 auto:false。
- 官方卡片展示頁網址格式：`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-NNN`，但不得只憑推算網址就當成資料已驗證。
- 不把未確認的能源、AP、BP、印刷效果填為推測值。
- AP 圖卡由 `ttg-builder.mjs` 過濾，不放入構築牌池。

## 待辦
1. 逐張核對剩餘 54 種的官方日文原文、類型、能源、AP、BP、產能、Trigger、Raid／特徵。
2. 經授權取得／連結官方卡圖，補上卡圖 fallback；不得自動以錯誤卡號猜圖。
3. 加入完整卡片自動判定與特殊規則測試，再開放實際對戰。

此文件不是「81/81 已完成」聲明。
