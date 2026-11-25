# 白劍 AI v4-B.7 擴大可靠偏好探索

Holm 確認了一筆現有單步方盒學不會的偏好。它只留下表示能力不足的證據，沒有搜尋權重，也沒有為它新增特徵。
這一輪挖掘全新局面，不再為 BLC-4-070 設計特徵或搜尋權重。正式 v2、Hard Search 2、Hard cap 7、單步 1.5、權重範圍、雜湊凍結、規則、冠軍標準和部署都沒有改。

## 挖掘
對手仍是白劍、我拒絕、戀露。決策類型仍是七個桶。挖掘 30 場，種子和先前的挖掘範圍分開。選進篩選的新局面 41 個，每個桶和對手最多 2 個，沒有用舊局面回填。
- early-energy：white-sword 2、reject-blue 2、renruki 2
- ap：white-sword 1、reject-blue 2、renruki 2
- line-move：white-sword 2、reject-blue 2、renruki 2
- mid-entry：white-sword 2、reject-blue 2、renruki 2
- raid：white-sword 2、reject-blue 2、renruki 2
- attack-defense：white-sword 2、reject-blue 2、renruki 2
- late-pressure：white-sword 2、reject-blue 2、renruki 2

## 確認
每個局面固定篩選 8 組，門檻 −0.25。確認固定 66 組，單尾精確符號檢定，Holm 校正。篩選鹽 610000，確認鹽 720000，兩組種子分開。可學名額最多 3 個，方盒無解的保留名額最多 1 個。沒有符合條件的候選就不使用名額。
過篩 5 個。進入確認 3 個，其中可學 2、保留 1。確認留下 1 個。分支場數 1052，上限 1200。
可學候選：85e95278a339ca79（early-energy／white-sword，棄掉 BLC-4-070 → 棄掉 BLC-2-073，篩選 -0.50，確認 -0.09，單尾 p 0.1189）；7ea78f79be88d584（attack-defense／white-sword，移除 BLC-3-008 → 移除 BLC-4-060，篩選 -0.50，確認 -0.03，單尾 p 0.3872）
保留的方盒無解候選：b122fb89d72eec7e（mid-entry／white-sword，把 BLC-4-070 打出到前線 → 把 BLC-4-070 打出到能量線，篩選 -0.50，確認 -0.24，單尾 p 0.0019）
過篩但沒有拿到名額：bcf3acab9b717182（line-move／renruki，移動 BLC-1-083 → 移動 BLC-4-066，篩選 -0.25）
Holm 確認：b122fb89d72eec7e（mid-entry／white-sword，把 BLC-4-070 打出到前線 → 把 BLC-4-070 打出到能量線，篩選 -0.50，確認 -0.24，單尾 p 0.0019）

## 分類
- 現有模型可以安全學會：0 個。
- 可以學會，但有必須驗證的連帶改動：0 個。
- 經獨立確認，但現有單步方盒無解：1 個。b122fb89d72eec7e（mid-entry／white-sword，把 BLC-4-070 打出到前線 → 把 BLC-4-070 打出到能量線，篩選 -0.50，確認 -0.24，單尾 p 0.0019）
- 同類決策在不同局面出現相反方向：2 個。a8ea32166942bc90（ap／renruki，起動 BLC-4-060 → 結束行動，篩選 -0.25）；5f868c674f2e1fee（ap／renruki，起動 BLC-4-060 → 結束行動，篩選 0.25）
- 尚未重現或證據不足：38 個。其中進過篩選或確認、但沒有形成可靠偏好的是 bcf3acab9b717182（line-move／renruki，移動 BLC-1-083 → 移動 BLC-4-066，篩選 -0.25）；85e95278a339ca79（early-energy／white-sword，棄掉 BLC-4-070 → 棄掉 BLC-2-073，篩選 -0.50，確認 -0.09，單尾 p 0.1189）；7ea78f79be88d584（attack-defense／white-sword，移除 BLC-3-008 → 移除 BLC-4-060，篩選 -0.50，確認 -0.03，單尾 p 0.3872）。
方向相反的決策不拿來做這一輪的權重更新。之後要用多筆獨立偏好一起評估新特徵，不為單一局面設計例外。

## 已保留的舊資料
- d12a2d6f5ced1d88：可以學會，但有必須驗證的連帶改動。已確認的能量線偏好。v4-B.5 的單步更新會放開 067 突襲。這一輪不重估、不學習。
- 1fbdc61d55fa7f09：既有保護約束，不是已確認標籤。067 突襲只保留為保護約束。不刪除，也不強迫學習。
手牌能源缺口差值 2.25 高於其他保護局面的最大值 1.63，未通過事先設定的分離門檻。這不是該特徵在數學上無法改善策略的證明。

## 權重
沒有新的、方向一致且可學的確認偏好，所以沒有建立實驗權重。
