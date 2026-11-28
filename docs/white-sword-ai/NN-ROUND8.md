# 白劍神經網路第八輪

產生時間：2026年11月26日 清晨7:42（台北時間）。

接受第七輪：線 2 相對 A 的改善已在獨立資料重現。這一輪只看正式 v2 和三種 Hard Search 2 對手，不重訓、不換模型、不調參。正式 v2、Hard Search 2、規則和網站都沒有改。對 A 的勝率不拿來代替對 v2 的勝率。

## 四個問題

① 直接對戰的評估未完成。未完成的對局沒有被當成勝負。
② 共同對手的評估未完成。
③ 執行無效。既有晉級門檻沒有用未完成或異常的對局宣布通過。
④ 下一步先讓鎖定的對局完整結束，並排除非法、回退、逾時和程式變動。不從殘餘勝率決定改哪一種出牌，也不追加場次。

## 固定規則

接受第七輪：線 2 相對凍結 A 的改善已在獨立資料重現。那次結果不是對正式 v2 的勝利，也不能用來湊這輪的場數。A 不是正式 v2。
候選仍是 training/white-sword-nn/weights/round6/line-2/actor-after-96.json，版本 nn-ppo-actor-r6-l2，更新 27546。正式 v2 只讀 training/white-sword-ai/weights/v2-capped.json，選牌是既有 blend，scale 6、Hard cap 7。不載入其他實驗權重。候選維持無探索貪心，可選全部合法動作，不套用 Hard cap 7。
兩種比較分開。直接對戰是候選白劍對正式 v2 白劍，每個種子四種座位與先後手。共同對手是候選和正式 v2 各自對上白劍、我拒絕、戀露，對手都是既有 Hard Search 2，nodes 48，不另加時鐘。兩種比較不合併成一個對 v2 勝率。
我拒絕和戀露不走 v2 分支。v2 分支只呼叫白劍專屬模型。對手接在實驗 runner 的 hard 座位，呼叫既有 chooseStrengthenedHardAction 與 HARD_OPTIONS。不改搜尋演算法、難度或 node 預算。
草案是 32 個新種子，每個種子 4 場直接對戰加 24 場共同對手，共 896 場。測速種子 193400 先跑完全部 28 種條件，不計入正式結果，之後也不得重用。正式種子是 193500–193531。不用既有訓練、開發、測試、確認或保留種子。
測速後用 1.4 的安全係數檢查 20 分鐘牆鐘。放不下就鎖定順序前綴。開打前保存種子、逐場排程、模型與程式雜湊、搜尋與逾時、並行、樣本數和判準。開打後不因勝率增減場次，不換種子，不挑有利前綴。
直接對戰先把每個種子的四場平均，再對原始種子估計。臨界值沿用 tCritical：樣本數大於 30 回傳 1.96，否則用既有表。標準誤用 n-1。判斷區間不截斷。只有勝率區間下限高於 50%，才稱為有優於正式 v2 的直接對戰證據。
共同對手在同種子、同牌型、同座位與先後手下計算候選得分減正式 v2 得分。三種牌型事前等權，再對原始種子估計平均差。下限高於 0 才稱為共同對手上優於正式 v2。上限低於 0 是弱於正式 v2。區間包含 0 是證據不足。不把 28 場或三種牌型當成互相獨立的樣本。同一種子在策略分歧後的抽牌與血區不視為完全相同。
各牌型、先後手和座位只作描述，不取代主要結果。區間過寬就回答證據不足，不事後追加場次。
共同對手裡候選對 Hard Search 2 的對局另交既有 judgeChampion。門檻不放寬：至少 200 場完成、總勝率至少 60%、Wilson 下限高於 50%、至少三種牌型、先後手都有、非鏡像下限高於 50%、以及既有異常限制。另外附上原始種子層級區間，不拿它取代 Wilson 判斷。通過這個門檻也不等於直接打贏正式 v2。
執行前後核對候選、v2、Hard Search 2、選牌、規則與實驗 runner 的雜湊，並保存工作區狀態字串。預期新增的只有這輪的計畫和報告。權重或受保護程式變動使評估失效。
鎖定場數沒有全部正常結束，或出現非法、洩漏、引擎錯誤、死循環、模型回退、逾時或對手回退，整輪記為執行無效。不刪除不利或異常結果，也不用其餘場次宣布過關。
執行完整時，既有晉級門檻的點估計未達 60%，或總勝率、非鏡像的 Wilson 上限低於 50%，記為棋力不足。直接對戰區間上限低於 50%，或共同對手配對差上限低於 0，各自記為該比較弱於正式 v2。只有場數、覆蓋或區間寬度擋下門檻，而且點估計沒有整段落在門檻外時，記為證據不足。下一步不得是把這次確認加長到顯著。

## 凍結檔案

- 候選：training/white-sword-nn/weights/round6/line-2/actor-after-96.json。版本 nn-ppo-actor-r6-l2，更新次數 27546，雜湊 a81631278ebd030fd4755369efe7da91add338459cfd0bd8b8e0c7b1e67da236。
- 正式 v2：training/white-sword-ai/weights/v2-capped.json。雜湊 a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa。
- 執行後雜湊：候選 未變，v2 未變。
- 受保護程式：{"training/white-sword-nn/weights/round6/line-2/actor-after-96.json":"a81631278ebd030fd4755369efe7da91add338459cfd0bd8b8e0c7b1e67da236","training/white-sword-ai/weights/v2-capped.json":"a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa","dist/universal-v2/hard-ai.mjs":"6479e5d424ff526949ca7656a461c64637763823d6e0508dc77645bee5595434","dist/universal-v2/white-sword-ai/choose.mjs":"1b28d09df0b979c946ac790d039b4d20d5f5284102e1295123c6f14e529f87d6","dist/universal-v2/white-sword-ai/constants.mjs":"8c0be3d7f480fedecd46f8cf78fe79a5f865b20b8305f686c21661a079c7148c","dist/universal-v2/engine.mjs":"1ddfa1ba892011dda264615e6b3fd563cb63b1ae6bc9799e636563ff2db2e4be","dist/universal-v2/ai-v3/opening.mjs":"95687363b787104cbd32c840be7800fae69d917cd4c23cc254ef16b4c0a9dc44","training/white-sword-nn/play.mjs":"bc425a151d3cc3c4ac4d460192cac1f324d480c523d238690ba7864510c82263"}
- 執行後程式：{"training/white-sword-nn/weights/round6/line-2/actor-after-96.json":"a81631278ebd030fd4755369efe7da91add338459cfd0bd8b8e0c7b1e67da236","training/white-sword-ai/weights/v2-capped.json":"a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa","dist/universal-v2/hard-ai.mjs":"6479e5d424ff526949ca7656a461c64637763823d6e0508dc77645bee5595434","dist/universal-v2/white-sword-ai/choose.mjs":"1b28d09df0b979c946ac790d039b4d20d5f5284102e1295123c6f14e529f87d6","dist/universal-v2/white-sword-ai/constants.mjs":"8c0be3d7f480fedecd46f8cf78fe79a5f865b20b8305f686c21661a079c7148c","dist/universal-v2/engine.mjs":"1ddfa1ba892011dda264615e6b3fd563cb63b1ae6bc9799e636563ff2db2e4be","dist/universal-v2/ai-v3/opening.mjs":"95687363b787104cbd32c840be7800fae69d917cd4c23cc254ef16b4c0a9dc44","training/white-sword-nn/play.mjs":"bc425a151d3cc3c4ac4d460192cac1f324d480c523d238690ba7864510c82263"}
- 開打前工作區狀態已保存在計畫檔。結束後的新增路徑：["docs/white-sword-ai/NN-ROUND8.md","docs/white-sword-ai/nn-round8-plan.json","docs/white-sword-ai/nn-round8.json"]
- 確認程式 commit：dbc4aac82f4fd5c1161ece22ab327b65ef497f4c。

## 開打前的計畫

- 測速後的計畫：{"seeds":9,"games":252,"gamesPerSeed":28,"workers":2,"wallMs":1119861.496939,"safety":1.4,"seedCap":32,"estimatedMs":1009363.9906098,"gameMs":5722.0180873571435,"fits":true}
- 搜尋與逾時：{"hard":{"policy":"hard-search-2","options":{"nodes":48},"clock":false},"v2":{"file":"training/white-sword-ai/weights/v2-capped.json","mode":"blend","scale":6,"hardCap":7,"timeoutMs":3000,"explore":0},"candidate":{"policy":"greedy","explore":0,"hardCap":null,"legal":"all"},"decks":[{"id":"white-sword","name":"白劍"},{"id":"reject-blue","name":"我拒絕"},{"id":"renruki","name":"戀露"}],"cells":[{"learnerSeat":0,"first":0},{"learnerSeat":0,"first":1},{"learnerSeat":1,"first":0},{"learnerSeat":1,"first":1}],"safety":1.4,"wallMs":1200000,"critical":"tCritical：樣本數大於 30 回傳 1.96，否則用既有表。標準誤用 n-1。區間不截斷。"}
- 資源落差：牆鐘只容納前 9 個種子，已在開打前鎖定。

## 直接對戰

- 種子平均：19.4%（3.4–35.5%）。
- 相對 50%：-30.6 個百分點（-46.6 到 -14.5，9 個種子）。
- 先手（描述）：11.1%（-5.8–28.1%）。後手（描述）：27.8%（7.5–48.0%）。
- 座位 0（描述）：11.1%（-14.5–36.7%）。座位 1（描述）：27.8%（-0.1–55.7%）。

## 共同對手

- 等權配對差：-34.5 個百分點（-53.6–-15.4 個百分點）。
- 白劍（描述）：-27.8 個百分點（-45.6–-9.9 個百分點）。
- 我拒絕（描述）：-27.8 個百分點（-50.2–-5.4 個百分點）。
- 戀露（描述）：-46.4 個百分點（-82.8–-10.0 個百分點）。
- 候選對 Hard Search 2 的種子層級勝率（補充，不取代晉級判斷）：33.3%（19.4–47.3%）。

## 既有晉級門檻

- 判定：invalid。promoted=false。
- 輸入完成場數：108。總勝率：33.3%（25.2–42.7%）。
- 非鏡像：33.3%（23.5–44.8%）。
- 未通過原因：["已完成的基準對局少於 200","總勝率未達 60%","95% 勝率信賴區間下限未高於 50%","非鏡像對局的 95% 信賴區間下限未高於 50%，不能只靠白劍鏡像"]
- Wilson 判斷維持原函式。上面的種子層級區間沒有改寫門檻。

## 執行

- 計畫場數 252。正常終局 250。未完成 2。
- 異常：{"illegal":0,"timeout":0,"fallback":0,"deadLoop":2,"engineError":0,"leak":0,"opponentFallback":0,"unfinished":2}
- 重試：0 次整批回退。沒有為了改結果而重打單一場。
- 實際耗時：681.2 秒。

## 逐種子結果

- 193500 直接：0/0 勝，0/1 勝，1/0 敗，1/1 敗。種子勝率 50.0%。配對差 -8.3 個百分點。
- 193501 直接：0/0 敗，0/1 敗，1/0 勝，1/1 敗。種子勝率 25.0%。配對差 -50.0 個百分點。
- 193502 直接：0/0 敗，0/1 敗，1/0 敗，1/1 敗。種子勝率 0.0%。配對差 n/a。
- 193503 直接：0/0 敗，0/1 敗，1/0 敗，1/1 敗。種子勝率 0.0%。配對差 -41.7 個百分點。
- 193504 直接：0/0 敗，0/1 敗，1/0 勝，1/1 勝。種子勝率 50.0%。配對差 n/a。
- 193505 直接：0/0 敗，0/1 敗，1/0 敗，1/1 敗。種子勝率 0.0%。配對差 -25.0 個百分點。
- 193506 直接：0/0 敗，0/1 敗，1/0 敗，1/1 敗。種子勝率 0.0%。配對差 -50.0 個百分點。
- 193507 直接：0/0 敗，0/1 敗，1/0 勝，1/1 敗。種子勝率 25.0%。配對差 -58.3 個百分點。
- 193508 直接：0/0 敗，0/1 敗，1/0 勝，1/1 敗。種子勝率 25.0%。配對差 -8.3 個百分點。

## 未完成對局

- shared v2 對 renruki，種子 193502，playing，dead-loop。
- shared v2 對 renruki，種子 193504，playing，dead-loop。

## 結論

直接對戰的評估未完成。未完成的對局沒有被當成勝負。

共同對手的評估未完成。

執行無效。既有晉級門檻沒有用未完成或異常的對局宣布通過。

下一步先讓鎖定的對局完整結束，並排除非法、回退、逾時和程式變動。不從殘餘勝率決定改哪一種出牌，也不追加場次。

對 A 的確認沒有併入這次的場數或顯著性。這次沒有部署，也沒有合併到 main。晉級門檻沒有放寬。
